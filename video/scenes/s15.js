// s15 (87.50–92.45) "Dünya çapında büyük düşünürler de Peygamberimizin ahlakını kabul etmişler."
// Visual: an antique 1840s library globe (mahogany horizon ring, engraved brass meridian) on a desk in a dim,
// candle-lit study. The globe spins (real rotation direction); warm "thinker" map-dots blink on across the
// continents as they turn into view ("Dünya çapında"), Europe densest ("büyük düşünürler"). The globe slows to
// Europe/Arabia; camera pushes in; on "Peygamberimizin ahlakını" dotted arcs travel from the thinkers' cities to
// Medina, landing on "kabul etmişler" (Kurzgesagt map layer). No people anywhere.
import * as THREE from 'three';
import * as G from '../engine/lib/extra_G.js';

const DEG = Math.PI / 180;
let R = {};
// [lat, lon, weight(1 = Europe emphasis), special]
const DOTS = [ // [lat, lon, weight(1 = Europe emphasis), special, arc?]
  [51.5, -0.1, 1, 'london', 1], [46.52, 6.63, 1, 'lausanne', 1], [55.95, -3.2, 1, 0, 1], [48.85, 2.35, 1, 0, 1], [50.98, 11.33, 1, 0, 1], [48.2, 16.37, 1, 0, 1],
  [41.9, 12.5, 1, 0, 1], [40.4, -3.7, 1, 0, 1], [59.33, 18.07, 1, 0, 0], [59.94, 30.3, 1, 0, 1], [55.75, 37.6, 1, 0, 1], [52.52, 13.4, 1, 0, 0],
  [38.7, -9.1, 1, 0, 0], [37.98, 23.7, 1, 0, 0], [53.35, -6.26, 1, 0, 0],
  [41.0, 28.97, .6, 0, 0], [30.04, 31.24, .6, 0, 0], [35.7, 51.4, .6, 0, 0], [28.6, 77.2, .6, 0, 0], [22.57, 88.36, .6, 0, 0], [19.07, 72.88, .6, 0, 0], [36.8, 10.2, .6, 0, 0], [34.0, -5.0, .6, 0, 0],
  [42.36, -71.06, .6], [40.7, -74.0, .6], [38.9, -77.0, .6], [43.65, -79.4, .6], [19.4, -99.1, .6], [-34.6, -58.4, .6], [-22.9, -43.2, .6],
  [-12.05, -77.04, .6], [37.77, -122.4, .6], [23.1, -82.4, .6], [35.68, 139.7, .6], [39.9, 116.4, .6], [31.2, 121.5, .6], [37.5, 127.0, .6], [1.35, 103.8, .6],
  [-33.9, 18.4, .6], [6.5, 3.4, .6], [9.0, 38.7, .6], [-33.87, 151.2, .6], [-37.8, 144.96, .6], [-36.85, 174.76, .6], [13.08, 80.27, .6], [41.3, 69.3, .6],
];
const MEDINA = [24.47, 39.61];

export default {
  post: {
    exposure: 1.1,
    bloom: { enabled: true, strength: .38, radius: .55, threshold: .85 },
    grade: { contrast: 1.07, saturation: 1.05, warmth: .015, lift: [.016, .012, .02], gain: [1.02, 1.0, .96] },
    vignette: .5, grain: .035,
    dof: { enabled: true, focus: 1.8, range: .5, amount: 1 },
  },
  async setup(ctx) {
    const { scene, camera, MODELS: M, TEX, FX, ENV } = ctx;
    R = {};
    scene.background = new THREE.Color('#110c09');
    scene.fog = new THREE.FogExp2('#150f0c', .1);
    scene.environment = await ctx.loadHDR('fireplace'); scene.environmentIntensity = .26;

    const deskTop = .7825; const Rg = .2; const Gc = new THREE.Vector3(0, deskTop + .335, .02); R.Gc = Gc; R.Rg = Rg;

    // ---------------- room ----------------
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8).rotateX(-Math.PI / 2), M.MAT.darkWood({ rings: 40, repeat: [4, 4] })); floor.receiveShadow = true; scene.add(floor);
    const wallMat = M.MAT.plaster({ a: '#4b5149', b: '#2c302b', repeat: [3, 2] });
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(7, 4), wallMat); wall.position.set(0, 2, -1.02); wall.receiveShadow = true; scene.add(wall);
    const wains = new THREE.Mesh(M.rbox(7, .9, .04, .01), M.MAT.darkWood({ rings: 12 })); wains.position.set(0, .45, -1.0); wains.receiveShadow = true; scene.add(wains);
    // bookcase (left/back) with instanced books
    const bc = new THREE.Group(); bc.position.set(-.85, 0, -.96); scene.add(bc);
    const caseMat = M.MAT.darkWood({ rings: 18, seed: 5 }); const cw = 1.9, ch = 2.5, cd = .3;
    for (const sx of [-1, 1]) { const side = new THREE.Mesh(M.rbox(.04, ch, cd, .01), caseMat); side.position.set(sx * cw / 2, ch / 2, cd / 2); bc.add(side); }
    const shelfY = [.4, .82, 1.24, 1.66, 2.08, 2.48];
    shelfY.forEach(y => { const s = new THREE.Mesh(M.rbox(cw, .03, cd, .008), caseMat); s.position.set(0, y, cd / 2); s.receiveShadow = true; bc.add(s); });
    const spineTex = TEX.drawTexture(64, 256, (x, W, H) => { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffe9a8'; for (const y of [.08, .12, .85, .9]) x.fillRect(0, y * H, W, 5); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(W * .15, H * .25, W * .7, H * .16); x.fillStyle = '#ffe9a8'; x.fillRect(W * .2, H * .3, W * .6, 3); x.fillRect(W * .2, H * .35, W * .6, 3); });
    const cols = ['#6d2418', '#2f4a2c', '#3a2a4a', '#7a5a2a', '#4a1c0e', '#1f3a4a', '#8a6a3a', '#5a2a1a', '#2a3a2a'];
    const rb = U_rng(ctx, 21); const books = [];
    shelfY.slice(0, 5).forEach(y => { let x = -cw / 2 + .04; while (x < cw / 2 - .06) { const w = .025 + rb() * .03, h = .22 + rb() * .12, lean = rb() < .06 ? (rb() - .5) * .3 : 0; if (x + w > cw / 2 - .04) break; books.push({ x: x + w / 2, y: y + .015 + h / 2, w, h, d: .18 + rb() * .06, c: cols[Math.floor(rb() * cols.length)], lean }); x += w + .002 + (rb() < .05 ? .04 : 0); } });
    const bkGeo = M.rbox(1, 1, 1, .08); const bkMat = new THREE.MeshStandardMaterial({ map: spineTex, roughness: .6 });
    const bk = new THREE.InstancedMesh(bkGeo, bkMat, books.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    books.forEach((b, i) => { q.setFromEuler(new THREE.Euler(0, 0, b.lean)); m4.compose(new THREE.Vector3(b.x, b.y, cd - b.d / 2 - .01), q, new THREE.Vector3(b.w, b.h, b.d)); bk.setMatrixAt(i, m4); bk.setColorAt(i, new THREE.Color(b.c)); });
    bk.receiveShadow = true; bc.add(bk);
    // window (right/back): dusk sky, cream glazing bars, curtains
    const winTex = TEX.gradientTex([[0, '#16234a'], [.55, '#2d3f72'], [.85, '#5a5a86'], [1, '#7a6a88']]);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(.66, 1.2), new THREE.MeshBasicMaterial({ map: winTex, color: '#b8c4ff' })); win.position.set(.78, 1.62, -1.0); scene.add(win);
    const barMat = new THREE.MeshStandardMaterial({ color: '#c9bfa8', roughness: .7 });
    for (const x of [-.33, 0, .33]) { const b = new THREE.Mesh(M.rbox(.035, 1.24, .04, .006), barMat); b.position.set(.78 + x, 1.62, -.99); scene.add(b); }
    for (const y of [-.6, -.2, .2, .6]) { const b = new THREE.Mesh(M.rbox(.7, .03, .04, .006), barMat); b.position.set(.78, 1.62 + y, -.99); scene.add(b); }
    const cur = G.curtain({ w: .38, h: 1.7, a: '#5e2320', b: '#33100d', sway: .006, seed: 2 }); cur.position.set(1.22, 2.35, -.93); scene.add(cur);
    const cur2 = G.curtain({ w: .3, h: 1.7, a: '#5e2320', b: '#33100d', sway: .006, seed: 5 }); cur2.position.set(.3, 2.35, -.93); scene.add(cur2);

    // ---------------- desk + props ----------------
    const desk = M.desk({ w: 1.5, d: .8, leather: false, material: G.GMAT.mahogany({ a: '#6a2c16', b: '#33130a', rings: 10 }) }); desk.position.set(0, 0, -.02); scene.add(desk);
    const cs = G.candlestick({ seed: 4, candleH: .16 }); cs.position.set(-.3, deskTop, .44); scene.add(cs); R.cs = cs;
    const flamePos = new THREE.Vector3(-.3, deskTop + cs.userData.flameY, .44); R.flamePos = flamePos;
    // a stack of leather books (back right) + dividers (front right)
    const stack = new THREE.Group(); stack.position.set(.43, deskTop, -.2); stack.rotation.y = -.35; scene.add(stack);
    [[.2, .27, .05, '#5a1e14', '#2c0b06'], [.18, .25, .045, '#2e4a33', '#142217'], [.16, .22, .04, '#7a4a22', '#3c200c']].reduce((y, [w, h, d, a, b], i) => {
      const t = G.tome({ w, h, d, a, b, seed: 30 + i }); t.rotation.x = -Math.PI / 2; t.rotation.z = (i - 1) * .12; t.position.set(0, y + d / 2, 0); stack.add(t); return y + d; }, 0);
    const dv = G.dividers({ length: .15 }); dv.position.set(.2, deskTop, .3); dv.rotation.y = 2.3; scene.add(dv);

    // ---------------- the globe ----------------
    const globe = new THREE.Group(); globe.position.copy(Gc); scene.add(globe); R.globe = globe;
    const tilt = new THREE.Group(); tilt.rotation.z = -23.5 * DEG; globe.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin); R.spin = spin;
    const mapTex = TEX.drawTexture(2048, 1024, (x, W, H) => G.paintGlobeMap(x, W, H, { fbm: TEX.fbmField(5, 6, 4), seed: 3 })); mapTex.anisotropy = 8;
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(Rg, 128, 80), new THREE.MeshPhysicalMaterial({ map: mapTex, roughness: .55, clearcoat: .7, clearcoatRoughness: .38 }));
    sphere.castShadow = true; sphere.receiveShadow = true; spin.add(sphere); R.sphere = sphere;
    // brass meridian ring with engraved degree ticks
    // engraved brass meridian: brushed along the ring, black-wax-filled degree scale (1°/5°/10°) and latitude numbers
    // (90 at the poles, 0 at the equator) on the front face; texture rows follow the lathe profile (v .5–.75 = front face).
    const engrave = (x, W, H, ink) => {
      const tick = (y0, dir) => { for (let d = 0; d < 360; d++) { const px = d / 360 * W, L = d % 10 === 0 ? 24 : d % 5 === 0 ? 15 : 9; x.fillRect(px - 1.2, dir > 0 ? y0 : y0 - L, 2.4, L); } };
      x.fillStyle = ink; x.fillRect(0, 69, W, 2.2); x.fillRect(0, 121, W, 2.2); x.fillRect(0, 199, W, 2.2); x.fillRect(0, 249, W, 2.2);
      tick(121, -1); tick(201, 1);
      x.font = '700 26px "Playfair Display"'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let d = 10; d < 360; d += 10) { if (d % 180 === 0) continue; const lab = String(Math.abs(90 - (d % 180))); x.save(); x.translate(d / 360 * W, 84); x.rotate(Math.PI); x.fillText(lab, 0, 0); x.restore(); }
    };
    const ringTex = TEX.drawTexture(4096, 256, (x, W, H) => {
      const g = x.createLinearGradient(0, 0, W, 0); for (let i = 0; i <= 12; i++) g.addColorStop(i / 12, ['#d8ad55', '#c49640', '#e2bb66'][i % 3]); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const rr = U_rng(ctx, 33); for (let i = 0; i < 1400; i++) { x.fillStyle = rr() < .5 ? `rgba(255,236,170,${rr() * .14})` : `rgba(90,60,20,${rr() * .14})`; x.fillRect(rr() * W, rr() * H, 60 + rr() * 500, 1); }
      x.fillStyle = 'rgba(255,240,190,.35)'; x.fillRect(0, 71, W, 1.2); x.fillRect(0, 123, W, 1.2); // bevel catch-light under each engraved line
      engrave(x, W, H, 'rgba(38,24,8,.92)');
    });
    ringTex.anisotropy = 8; ringTex.wrapS = THREE.RepeatWrapping;
    const ringBump = TEX.drawTexture(4096, 256, (x, W, H) => { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); engrave(x, W, H, '#000'); }, { srgb: false });
    const ringProf = (r0, r1, th) => [[r0, -th], [r1, -th], [r1, th], [r0, th], [r0, -th]];
    const meridian = M.lathe(ringProf(Rg + .006, Rg + .026, .0045), new THREE.MeshPhysicalMaterial({ map: ringTex, bumpMap: ringBump, bumpScale: 1.2, metalness: 1, roughness: .3, clearcoat: .35, clearcoatRoughness: .25 }), 240);
    meridian.material.map.wrapS = THREE.RepeatWrapping; meridian.rotation.x = Math.PI / 2; tilt.add(meridian);
    const brass = M.MAT.brass({ a: '#dcb15a', b: '#8c6426' });
    for (const s of [-1, 1]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .03, 12), brass); pin.position.y = s * (Rg + .014); tilt.add(pin); }
    // hour circle: engraved brass dial (I–XII twice) instead of a paper disc
    const dialDraw = (x, W, H, base) => { const c = W / 2; const ink = base ? 'rgba(40,24,8,.9)' : '#000';
      if (base) { const g = x.createRadialGradient(c * .8, c * .7, 0, c, c, c); g.addColorStop(0, '#f0cd7c'); g.addColorStop(.6, '#cfa04a'); g.addColorStop(1, '#a87a30'); x.fillStyle = g; x.fillRect(0, 0, W, H);
        for (let r = 8; r < c; r += 2.2) { x.strokeStyle = `rgba(${(r * 37) % 2 ? '255,236,180' : '90,60,20'},${.05 + ((r * 13) % 7) / 70})`; x.lineWidth = 1; x.beginPath(); x.arc(c, c, r, 0, 7); x.stroke(); } }
      else { x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); }
      x.strokeStyle = ink; x.fillStyle = ink; x.lineWidth = 4; [.95, .9, .62].forEach(k => { x.beginPath(); x.arc(c, c, c * k, 0, 7); x.stroke(); });
      for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2, L = i % 4 ? .045 : .1; x.lineWidth = i % 4 ? 2 : 4; x.beginPath(); x.moveTo(c + Math.cos(a) * c * .9, c + Math.sin(a) * c * .9); x.lineTo(c + Math.cos(a) * c * (.9 - L), c + Math.sin(a) * c * (.9 - L)); x.stroke(); }
      const RN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']; x.font = `700 ${W * .055}px Cinzel`; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 - Math.PI / 2; x.save(); x.translate(c + Math.cos(a) * c * .71, c + Math.sin(a) * c * .71); x.rotate(a + Math.PI / 2); x.fillText(RN[i % 12], 0, 0); x.restore(); }
      x.beginPath(); x.arc(c, c, c * .08, 0, 7); x.fill(); };
    const hourTex = TEX.drawTexture(512, 512, (x, W, H) => dialDraw(x, W, H, true)); hourTex.anisotropy = 8;
    const hourBump = TEX.drawTexture(512, 512, (x, W, H) => dialDraw(x, W, H, false), { srgb: false });
    const hour = new THREE.Mesh(new THREE.CylinderGeometry(.036, .036, .003, 48), [brass, new THREE.MeshPhysicalMaterial({ map: hourTex, bumpMap: hourBump, bumpScale: 1, metalness: 1, roughness: .34, clearcoat: .35, clearcoatRoughness: .3 }), brass]); hour.position.y = Rg + .03; tilt.add(hour);
    const hand = new THREE.Mesh(M.rbox(.004, .003, .03, .001), brass); hand.position.set(0, Rg + .033, .012); tilt.add(hand);
    // mahogany horizon ring with printed paper top
    const hr = M.lathe(ringProf(Rg + .034, Rg + .088, .0095), G.GMAT.mahogany({ a: '#7a321a', b: '#3a1408' }), 128); globe.add(hr);
    const hzTex = TEX.drawTexture(1024, 1024, (x, W, H) => {
      const cx = W / 2, rO = W / 2, rI = rO * (Rg + .036) / (Rg + .086); x.fillStyle = '#ead8ad'; x.beginPath(); x.arc(cx, cx, rO, 0, 7); x.fill();
      x.strokeStyle = 'rgba(60,38,18,.85)'; [.99, .93, .86, .8].forEach(k => { x.lineWidth = 2; x.beginPath(); x.arc(cx, cx, rI + (rO - rI) * k, 0, 7); x.stroke(); });
      for (let d = 0; d < 360; d++) { const a = d * DEG, L = d % 30 === 0 ? (rO - rI) * .6 : d % 5 === 0 ? (rO - rI) * .14 : (rO - rI) * .07; x.lineWidth = d % 30 === 0 ? 2.5 : 1.2; x.beginPath(); x.moveTo(cx + Math.cos(a) * (rO * .99), cx + Math.sin(a) * (rO * .99)); x.lineTo(cx + Math.cos(a) * (rO * .99 - L), cx + Math.sin(a) * (rO * .99 - L)); x.stroke(); }
      x.fillStyle = 'rgba(140,60,40,.28)'; for (let k = 0; k < 12; k++) { if (k % 2) continue; x.beginPath(); x.arc(cx, cx, rI + (rO - rI) * .8, k * 30 * DEG, (k + 1) * 30 * DEG); x.arc(cx, cx, rI + (rO - rI) * .5, (k + 1) * 30 * DEG, k * 30 * DEG, true); x.fill(); }
    });
    const hzTop = new THREE.Mesh(new THREE.RingGeometry(Rg + .037, Rg + .085, 160, 1), new THREE.MeshPhysicalMaterial({ map: hzTex, roughness: .55, clearcoat: .5, clearcoatRoughness: .3 }));
    hzTop.rotation.x = -Math.PI / 2; hzTop.position.y = .0097; hzTop.receiveShadow = true; globe.add(hzTop);
    // turned legs, stretcher, central pillar
    const legH = .335 - .0095; const legMat = G.GMAT.mahogany({ a: '#7a321a', b: '#3a1408', rings: 30 });
    const legProf = [[0, 0], [.016, 0], [.02, .008], [.017, .02], [.009, .03], [.011, .04], [.02, .08], [.022, .1], [.012, .14], [.009, .16], [.015, .175], [.009, .19], [.011, legH - .03], [.016, legH - .02], [.016, legH], [0, legH]];
    const rl = Rg + .061;
    for (let k = 0; k < 4; k++) { const a = (45 + k * 90) * DEG; const leg = M.lathe(legProf, legMat, 20); leg.position.set(Math.cos(a) * rl, -.335, Math.sin(a) * rl); globe.add(leg); }
    for (const s of [-1, 1]) { const st = new THREE.Mesh(M.rbox(rl * 2 + .02, .014, .026, .005), legMat); st.position.y = -.335 + .05; st.rotation.y = s * 45 * DEG; st.castShadow = st.receiveShadow = true; globe.add(st); }
    const pH = .335 - .05 - .007 - (Rg + .026);
    const pil = M.lathe([[0, 0], [.024, 0], [.02, .01], [.011, .018], [.013, pH - .012], [.019, pH - .005], [.019, pH], [0, pH]], legMat, 24); pil.position.y = -.335 + .057; globe.add(pil);
    M.shadowAll(globe);
    sphere.castShadow = true;

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight('#46557e', '#2a1a10', .32); scene.add(hemi);
    // key: an off-screen oil lamp, front-left & above (broad, soft falloff), the only shadow caster
    const spot = new THREE.SpotLight('#ffe7cc', 2.8, 8, .55, .9, 2); spot.position.set(-.95, 1.9, 1.15); spot.target.position.copy(Gc);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0004; spot.shadow.normalBias = .01; spot.shadow.radius = 6; spot.shadow.camera.near = .3; scene.add(spot, spot.target); R.spot = spot;
    // practical candle (foreground left)
    const pl = ENV.pointLight({ color: '#ff9f4a', intensity: .22, distance: 3, pos: flamePos.toArray() }); scene.add(pl); R.pl = pl;
    const rim = new THREE.DirectionalLight('#86a2ff', 1.4); rim.position.set(1.4, 2.4, -2.2); rim.target.position.copy(Gc); scene.add(rim, rim.target);
    const glowC = FX.glow({ size: .3, opacity: .2, color: '#ffae5a' }); glowC.position.copy(flamePos); scene.add(glowC);
    const motes = FX.particles({ count: 90, center: [Gc.x - .15, Gc.y + .15, Gc.z - .25], box: [1.3, .9, .5], size: 4, color: '#ffd9a0', opacity: .38, drift: [.01, .02, 0], swirl: .05 }); scene.add(motes);

    // ---------------- spin & camera ----------------
    // Spin: steady ~110°/s, smooth (cubic) stop at t=3.2 with lon 22°E facing +Z.
    const v0 = 110, t1 = 1.6, T = 1.6; R.sEnd = (-90 - 28);
    R.dist = t => { if (t <= t1) return v0 * (t + .5); const tau = Math.min(1, (t - t1) / T); return v0 * (t1 + .5) + v0 * T * (1 - Math.pow(1 - tau, 3)) / 3; };
    R.Dtot = R.dist(99);
    R.spinAt = t => (R.sEnd - (R.Dtot - R.dist(t))) * DEG;
    spin.rotation.y = R.spinAt(10); globe.updateMatrixWorld(true);
    const dirW = (lat, lon) => { const d = G.latLonDir(lat, lon); return new THREE.Vector3(...d).multiplyScalar(Rg).applyMatrix4(sphere.matrixWorld); };
    const Pt = dirW(38, 25); const n = Pt.clone().sub(Gc).normalize();
    const nh = new THREE.Vector3(n.x, 0, n.z).normalize(); const el = 34 * DEG;
    const dirC = nh.clone().multiplyScalar(Math.cos(el)).add(new THREE.Vector3(0, Math.sin(el), 0));
    const C = Gc.clone().addScaledVector(dirC, 1.1);
    // final push-in toward Arabia/Medina (after the arcs land) so the Red Sea reads wide and Medina clearly inland
    const Pm = dirW(27.5, 38.5); const nm = Pm.clone().sub(Gc).normalize(); const nmh = new THREE.Vector3(nm.x, 0, nm.z).normalize(); const el2 = 31 * DEG;
    const C2 = Gc.clone().addScaledVector(nmh.clone().multiplyScalar(Math.cos(el2)).add(new THREE.Vector3(0, Math.sin(el2), 0)), .62);
    const g0 = Gc.clone();
    camera.fov = 36; camera.near = .03; camera.far = 60; camera.updateProjectionMatrix();
    R.cam = arcRig(THREE, ctx.U, camera, {
      pos: [g0.clone().add(new THREE.Vector3(-.5, .25, 1.82)).toArray(), g0.clone().add(new THREE.Vector3(-.22, .3, 1.5)).toArray(), C.toArray(), C2.toArray()],
      look: [g0.clone().add(new THREE.Vector3(0, .02, 0)).toArray(), g0.clone().add(new THREE.Vector3(0, .05, 0)).toArray(), Pt.toArray(), Pm.toArray()],
      keys: [[-.6, 0], [1.9, .33], [3.7, .72], [4.25, .79], [5.6, 1]], shake: { amp: .003, freq: .45 },
    });
    R.Pt = Pt;

    // ---------------- overlay data: dots, pop times (first time each faces the camera) ----------------
    R.dots = DOTS.map(([lat, lon, w, sp, arc], i) => ({ lat, lon, w, sp, arc, v: new THREE.Vector3(...G.latLonDir(lat, lon)).multiplyScalar(Rg), pop: 99, i }));
    R.medina = new THREE.Vector3(...G.latLonDir(...MEDINA)).multiplyScalar(Rg);
    const jit = U_rng(ctx, 7);
    for (let t = 0.02; t < 3.4; t += 1 / 30) {
      R.cam.update(t); camera.updateMatrixWorld(); spin.rotation.y = R.spinAt(t); globe.updateMatrixWorld(true);
      for (const d of R.dots) { if (d.pop < 99) continue; const wp = d.v.clone().applyMatrix4(sphere.matrixWorld); const nn = wp.clone().sub(Gc).normalize(); const vv = camera.position.clone().sub(wp).normalize(); if (nn.dot(vv) > .42) d.pop = t + jit() * .22 + (d.w < 1 ? 0 : .06); }
    }
    // arcs: thinkers visible at the end -> Medina
    spin.rotation.y = R.spinAt(10); globe.updateMatrixWorld(true); R.cam.update(4.6); camera.updateMatrixWorld();
    const mW = R.medina.clone().applyMatrix4(sphere.matrixWorld);
    R.arcs = R.dots.filter(d => { if (!d.arc) return false; const wp = d.v.clone().applyMatrix4(sphere.matrixWorld); const nn = wp.clone().sub(Gc).normalize(); const vv = camera.position.clone().sub(wp).normalize(); return nn.dot(vv) > .3 && wp.distanceTo(mW) > .02; })
      .map(d => ({ d, ang: d.v.angleTo(R.medina) })).sort((a, b) => b.ang - a.ang);
    R.arcs.forEach((a, i) => { a.t0 = 2.95 + (i / Math.max(1, R.arcs.length - 1)) * .55 + jit() * .08; a.dur = .62 + a.ang * .35; });
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const c = R.cam.update(t); camera.updateMatrixWorld();
    R.spin.rotation.y = R.spinAt(t); R.globe.updateMatrixWorld(true);
    // candle flicker
    const fl = 1 + (Math.sin(t * 13.1) * .5 + Math.sin(t * 7.3 + 1.3) * .3 + Math.sin(t * 23.7 + .4) * .2) * .08;
    R.pl.intensity = .22 * fl; R.spot.intensity = 2.8 * (1 + (fl - 1) * .25);
    // DOF on the globe surface facing the camera
    const dC = camera.position.distanceTo(R.Gc) - R.Rg * .92;
    post.dof.focus = dC; post.dof.range = U.lerp(.55, .3, U.prog(t, 2, 4.2)); post.dof.amount = 1;
    // the fast spin (~110°/s, coastlines move ~20 px/frame) strobes without blur: 3 sub-frames until it has slowed down
    { const tn = t + 1 / 30; post.motionBlur = { samples: tn < 2.3 ? 3 : 1, shutter: .5 }; }

    // ---------------- Kurzgesagt map layer ----------------
    const X = ui.ctx; const M = R.sphere.matrixWorld; const cam = camera.position;
    // hidden by the horizon ring? (segment point->camera crosses the ring plane within the ring annulus)
    const ringHide = wp => { const dy = cam.y - wp.y; if (Math.abs(dy) < 1e-4) return 1; const s = (R.Gc.y + .0095 - wp.y) / dy; if (s <= 0 || s >= 1) return 1; const px = wp.x + (cam.x - wp.x) * s - R.Gc.x, pz = wp.z + (cam.z - wp.z) * s - R.Gc.z; const r = Math.hypot(px, pz); return 1 - U.smoothstep(R.Rg + .01, R.Rg + .03, r) * (1 - U.smoothstep(R.Rg + .085, R.Rg + .095, r)); };
    const vis = wp => { const nn = wp.clone().sub(R.Gc).normalize(); const vv = cam.clone().sub(wp).normalize(); const below = cam.y > R.Gc.y ? U.smoothstep(R.Gc.y - .012, R.Gc.y + .004, wp.y) : 1; return U.smoothstep(.06, .32, nn.dot(vv)) * ringHide(wp) * below; };
    const persp = wp => U.clamp(1.75 / cam.distanceTo(wp), .85, 1.55);
    const tK = ctx.wordTime('kabul'), tP = ctx.wordTime('peygamberimizin');
    const pulseAll = U.smoothstep(tK - .05, tK + .15, t) * (1 - U.smoothstep(tK + .3, tK + .9, t));
    // dots
    for (const d of R.dots) {
      if (t < d.pop) continue; const wp = d.v.clone().applyMatrix4(M); const a = vis(wp); if (a <= .01) continue;
      const [sx, sy] = ui.project(wp); const k = U.ease.outBack(U.clamp((t - d.pop) / .35), 2.4); const s = persp(wp); const under = 1 - .65 * (1 - U.smoothstep(440, 520, sy));
      const r = (d.sp ? 8 : d.w >= 1 ? 6.8 : 5.4) * s * k * (1 + pulseAll * .35);
      X.save(); X.globalAlpha = a * under;
      const gr = X.createRadialGradient(sx, sy, 0, sx, sy, r * 3.4); gr.addColorStop(0, 'rgba(255,196,96,.55)'); gr.addColorStop(1, 'rgba(255,170,70,0)'); X.fillStyle = gr; X.beginPath(); X.arc(sx, sy, r * 3.4, 0, 7); X.fill();
      X.fillStyle = '#ffcf6b'; X.shadowColor = 'rgba(40,20,0,.6)'; X.shadowBlur = 6; X.beginPath(); X.arc(sx, sy, r, 0, 7); X.fill(); X.shadowColor = 'transparent';
      X.fillStyle = '#fff6dc'; X.beginPath(); X.arc(sx, sy, r * .45, 0, 7); X.fill();
      const pa = U.clamp((t - d.pop) / .7); if (pa < 1) { X.strokeStyle = `rgba(255,214,130,${(1 - pa) * .9})`; X.lineWidth = 2.5; X.beginPath(); X.arc(sx, sy, r * (1.2 + pa * 3.2), 0, 7); X.stroke(); }
      X.restore();
    }
    // arcs to Medina
    const mW = R.medina.clone().applyMatrix4(M); const [mx, my] = ui.project(mW); const mA = vis(mW);
    const occluded = P => { const d = P.clone().sub(cam); const f = cam.clone().sub(R.Gc); const a = d.dot(d), b = 2 * f.dot(d), cc = f.dot(f) - (R.Rg * .995) ** 2; const disc = b * b - 4 * a * cc; if (disc < 0) return false; const s1 = (-b - Math.sqrt(disc)) / (2 * a); return s1 > 0 && s1 < .999; };
    for (const A of R.arcs) {
      const p = U.ease.inOutSine(U.clamp((t - A.t0) / A.dur)); if (p <= 0) continue;
      const u0 = A.d.v.clone().normalize(), u1 = R.medina.clone().normalize(); const N = 36; const pts = [];
      for (let i = 0; i <= N; i++) { const s = (i / N) * p; const qv = new THREE.Vector3().copy(u0).lerp(u1, s).normalize(); // near-slerp (short arcs)
        const lift = 1 + (.025 + A.ang * .16) * Math.sin(Math.PI * s); const wp = qv.multiplyScalar(R.Rg * lift).applyMatrix4(M); pts.push({ s: ui.project(wp), o: occluded(wp) || ringHide(wp) < .5 ? 0 : 1 }); }
      X.save(); X.lineCap = 'round'; X.strokeStyle = '#ffd27a'; X.lineWidth = 2.8; X.setLineDash([8, 7]); X.lineDashOffset = -t * 40; X.shadowColor = 'rgba(30,15,0,.7)'; X.shadowBlur = 5;
      X.beginPath(); let pen = false; for (const q of pts) { if (!q.o || q.s[1] < 450) { pen = false; continue; } pen ? X.lineTo(q.s[0], q.s[1]) : X.moveTo(q.s[0], q.s[1]); pen = true; } X.globalAlpha = .95 - .4 * U.smoothstep(4.5, 5.1, t); X.stroke(); X.setLineDash([]);
      const hd = pts[pts.length - 1]; if (p < 1 && hd.o) { X.fillStyle = '#fff3d0'; X.beginPath(); X.arc(hd.s[0], hd.s[1], 4.5, 0, 7); X.fill(); }
      X.restore();
    }
    // Medina marker + tag
    const mk = U.ease.outBack(U.clamp((t - (tP + .05)) / .4), 2.2);
    if (mk > 0 && mA > .01) {
      const s = persp(mW); X.save(); X.globalAlpha = mA;
      const gr = X.createRadialGradient(mx, my, 0, mx, my, 12 * mk); gr.addColorStop(0, 'rgba(120,230,160,.35)'); gr.addColorStop(1, 'rgba(80,200,130,0)'); X.fillStyle = gr; X.beginPath(); X.arc(mx, my, 12 * mk, 0, 7); X.fill();
      X.fillStyle = '#3fb67a'; X.strokeStyle = '#ffd27a'; X.lineWidth = 2.2; X.beginPath(); X.arc(mx, my, 4.8 * mk, 0, 7); X.fill(); X.beginPath(); X.arc(mx, my, 7.6 * mk, 0, 7); X.stroke();
      for (const off of [0, .35]) { const pa = U.clamp((t - tK - off) / .9); if (pa > 0 && pa < 1) { X.strokeStyle = `rgba(255,214,130,${(1 - pa) * .9})`; X.lineWidth = 3; X.beginPath(); X.arc(mx, my, 9.5 + pa * 38, 0, 7); X.stroke(); } }
      X.restore();
      ui.callout('Medine', { t, t0: tP + .2, anchor: [mx, my], to: [U.clamp(mx + 185, 200, 880), U.clamp(my + 95, 300, 1300)], size: 40, dotColor: '#3fb67a' });
    }
    // typography
    const tD = ctx.wordTime('dünya'), tB = ctx.wordTime('büyük');
    { const e = ui.env(t, tD - .1, Infinity, .5, 'fade'); if (e.o > .001) { const X2 = ui.ctx, g2 = X2.createLinearGradient(0, 200, 0, 500); g2.addColorStop(0, 'rgba(12,7,4,0)'); g2.addColorStop(.3, 'rgba(12,7,4,.58)'); g2.addColorStop(.7, 'rgba(12,7,4,.5)'); g2.addColorStop(1, 'rgba(12,7,4,0)');
      X2.save(); X2.globalAlpha = e.o; X2.fillStyle = g2; X2.fillRect(0, 200, 1080, 300); X2.restore(); } }
    ui.text('Dünya çapında', { t, t0: tD - .04, x: 540, y: 300, size: 66, weight: 900, color: '#fff4dc', anim: 'pop', letterSpacing: 2 });
    ui.text('büyük düşünürler', { t, t0: tB - .04, x: 540, y: 392, size: 88, weight: 900, color: '#ffcf6b', anim: 'pop', letterSpacing: 1 });
  },
};

function U_rng(ctx, s) { return ctx.U.rng(s); }

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
