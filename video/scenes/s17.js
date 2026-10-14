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
    scene.environment = await ctx.loadHDR('satara_night_no_lamps'); scene.environmentIntensity = .35;

    // ---------------- outside: moon, Alps, Lake Geneva, garden ----------------
    const moonDir = new THREE.Vector3(.2, .25, -1).normalize(); R.moonDir = moonDir;
    const sky = ENV.skyDome({ top: '#040814', mid: '#0b1634', horizon: '#26365e', bottom: '#0b1222', sunDir: moonDir.toArray(), sunColor: '#a9bde8', sunSize: 0, sunGlow: .9, stars: 1.0, clouds: .12, cloudColor: '#3a4a74', intensity: 1 });
    scene.add(sky);
    const moon = G.moonSprite({ size: 22 }); moon.position.copy(moonDir).multiplyScalar(400).add(new THREE.Vector3(0, 1.4, 0)); scene.add(moon);
    const mg = FX.glow({ size: 120, opacity: .2, color: '#8ea6e0' }); mg.material.fog = false; mg.position.copy(moon.position); scene.add(mg);
    // lake (moon glitter path from the ocean shader's glint)
    const lake = FX.ocean({ size: 420, segments: 160, deep: '#081428', shallow: '#13254a', sky: '#24365f', sunDir: moonDir.toArray(), sunColor: '#e4ecff', amp: .05, choppy: .6, fogColor: '#1a2644', fogNear: 60, fogFar: 300 });
    lake.position.set(0, -6, -160); scene.add(lake);
    // Savoy Alps across the lake (heightfield, snow by height)
    const mg2 = new THREE.PlaneGeometry(760, 140, 220, 40); mg2.rotateX(-Math.PI / 2); const mp = mg2.attributes.position; const colors = [];
    const P = x => 22 + 13 * Math.sin(x * .012 + 1.3) + 12 * Math.pow(Math.max(0, Math.sin(x * .029 + 2.1)), 2) + 7 * U.fbm1(x * .05, 3) + 9 * Math.pow(Math.max(0, Math.sin(x * .07 + .5)), 6);
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), z = mp.getZ(i) - 240; const d = -z - 175;
      let h = d < 0 ? -12 : P(x) * (1 - Math.exp(-d / 16)) * (1 - U.smoothstep(70, 140, d) * .35) + 2.5 * U.fbm1(x * .21 + z * .13, 7) * U.smoothstep(0, 20, d);
      mp.setY(i, h - 6); const hn = (h - 6) / 50;
      const snow = U.smoothstep(.32, .55, hn + U.fbm1(x * .15, 11) * .08), forest = 1 - U.smoothstep(.05, .22, hn);
      const c = new THREE.Color('#2a3150').lerp(new THREE.Color('#17203a'), forest).lerp(new THREE.Color('#b8c6e6'), snow); colors.push(c.r, c.g, c.b);
    }
    mg2.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); mg2.computeVertexNormals();
    const mtn = new THREE.Mesh(mg2, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95 })); mtn.position.z = -240; scene.add(mtn);
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
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(leafW - st * 2, leafH - st * 2), glassMat); gl.position.set(lx, 0, 0); hinge.add(gl);
    }
    // muslin curtains breathing in the night air
    const cL = G.curtain({ w: .38, h: 2.0, a: '#e7dcc4', b: '#cbbd9e', sheen: '#fff1d8', sway: .035, seed: 1, pleats: 6 }); cL.position.set(ox0 - .14, 2.45, wz + .07); cL.material.transparent = true; cL.material.opacity = .9; scene.add(cL);
    const cR = G.curtain({ w: .38, h: 2.0, a: '#e7dcc4', b: '#cbbd9e', sheen: '#fff1d8', sway: .035, seed: 4, pleats: 6 }); cR.position.set(ox1 + .14, 2.45, wz + .07); cR.material.transparent = true; cR.material.opacity = .9; scene.add(cR);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), M.MAT.darkWood({ rings: 40, repeat: [3, 3] })); floor.receiveShadow = true; scene.add(floor);

    // ---------------- desk + Gibbon's things ----------------
    const desk = M.desk({ w: 1.45, d: .8, leather: false, material: G.GMAT.mahogany({ a: '#7a3a1e', b: '#3c170a', rings: 10 }) }); desk.position.set(0, 0, wz + .41); scene.add(desk);
    const csL = G.candlestick({ seed: 3, candleH: .15 }); csL.position.set(-.4, deskTop, -.27); scene.add(csL);
    const csR = G.candlestick({ seed: 8, candleH: .12 }); csR.position.set(.43, deskTop, -.3); scene.add(csR);
    R.fL = new THREE.Vector3(-.4, deskTop + csL.userData.flameY, -.27); R.fR = new THREE.Vector3(.43, deskTop + csR.userData.flameY, -.3);
    // finished manuscript with the quill laid down on it
    const ms = G.paperStack({ w: .22, d: .3, h: .055, sheets: 3, seed: 21, curl: .008, topTex: G.manuscriptTex({ seed: 22, lines: 28, stopAt: .45 }) }); ms.position.set(-.26, deskTop + .002, -.02); ms.rotation.y = .12; scene.add(ms);
    const q = G.quill({ length: .3, bend: .025 }); q.rotation.set(-Math.PI / 2 + .04, 0, -2.2); q.position.set(-.2, deskTop + .002 + ms.userData.topY + .004, .05); scene.add(q);
    const ink = M.inkwell({ quill: false }); ink.position.set(-.15, deskTop, -.27); scene.add(ink);
    // six quarto volumes: calf, raised bands, red & black morocco labels
    const gilt = '#efc96a';
    const spine = (n) => (x, W, H) => {
      const bands = [.07, .45, .6, .75, .92];
      x.fillStyle = gilt; bands.forEach(b => { x.fillRect(0, H * b - 9, W, 2); x.fillRect(0, H * b + 7, W, 2); });
      // red title label spanning the top compartment
      x.fillStyle = '#7d1a14'; x.fillRect(W * .16, H * .1, W * .68, H * .32); x.strokeStyle = gilt; x.lineWidth = 3; x.strokeRect(W * .19, H * .11, W * .62, H * .3);
      x.fillStyle = gilt; x.textAlign = 'center'; x.textBaseline = 'middle';
      const lines = [['THE', 22], ['DECLINE', 33], ['AND FALL', 30], ['OF THE', 22], ['ROMAN', 33], ['EMPIRE', 33]]; let y = H * .135;
      lines.forEach(([s, f]) => { x.font = `700 ${f}px "Playfair Display"`; y += f * .62; x.fillText(s, W / 2, y); y += f * .55; });
      // black volume label
      x.fillStyle = '#1b1612'; x.fillRect(W * .2, H * .485, W * .6, H * .085); x.fillStyle = gilt; x.font = '700 30px "Playfair Display"'; x.fillText('VOL. ' + ROMAN[n], W / 2, H * .528);
      // gilt rosettes in the lower compartments
      for (const cy of [.675, .835]) { x.save(); x.translate(W / 2, H * cy); for (let k = 0; k < 8; k++) { x.rotate(Math.PI / 4); x.beginPath(); x.ellipse(0, -11, 4, 9, 0, 0, 7); x.fill(); } x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.restore(); }
    };
    const vols = new THREE.Group(); vols.position.set(.12, deskTop, -.2); vols.rotation.y = -.04; scene.add(vols); R.vols = vols;
    const vr2 = U.rng(5); const vd = .062, vw = .22, vh = .28; const bandMat = M.MAT.leather({ a: '#5a3218', b: '#2e170a', seed: 9 });
    for (let i = 0; i < 6; i++) {
      const b = G.tome({ w: vw, h: vh, d: vd, a: '#7b4a26', b: '#3f220e', seed: 70 + i, spineDraw: spine(i), spineBg: '#6e4022', raised: [.07 - .5, .45 - .5, .6 - .5, .75 - .5, .92 - .5], bandMat, spineFlat: .4 });
      b.rotation.y = Math.PI / 2; b.rotation.z = (vr2() - .5) * .015; b.position.set((i - 2.5) * (vd + .003), vh / 2, (vr2() - .5) * .01); vols.add(b);
    }
    vols.updateMatrixWorld(true); R.volAnchor = vols.localToWorld(new THREE.Vector3((2 - 2.5) * (vd + .003), vh + .002, vw / 2 - .01));

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight('#2a3760', '#1a120c', .3); scene.add(hemi);
    const moonL = new THREE.DirectionalLight('#8fa8ff', .7); moonL.position.copy(moonDir).multiplyScalar(-1).multiplyScalar(-6).add(new THREE.Vector3(0, 2, 0)); moonL.target.position.set(0, deskTop, 0); scene.add(moonL, moonL.target);
    const spot = new THREE.SpotLight('#ffb466', 1.1, 5, 1.2, 1, 2); spot.position.copy(R.fL).add(new THREE.Vector3(.0, .02, .03)); spot.target.position.set(.15, deskTop, -.1);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0006; spot.shadow.normalBias = .01; spot.shadow.camera.near = .04; scene.add(spot, spot.target); R.spot = spot;
    const pL = ENV.pointLight({ color: '#ffa04a', intensity: .35, distance: 3, pos: R.fL.toArray() }); scene.add(pL);
    const pR = ENV.pointLight({ color: '#ffa04a', intensity: .45, distance: 3, pos: R.fR.toArray() }); scene.add(pR); R.pts = [pL, pR];
    for (const f of [R.fL, R.fR]) { const g = FX.glow({ size: .24, opacity: .32, color: '#ffb060' }); g.position.copy(f); scene.add(g); }
    const motes = FX.particles({ count: 50, center: [0, 1.15, -.15], box: [1.0, .6, .6], size: 3, color: '#ffd9a0', opacity: .25, drift: [.004, .01, 0], swirl: .03 }); scene.add(motes);

    // ---------------- camera: night view -> down to the desk -> the six volumes ----------------
    camera.fov = 40; camera.near = .03; camera.far = 900; camera.updateProjectionMatrix();
    R.cam = G.camPath(camera, {
      pos: [[-.04, 1.5, .78], [-.04, 1.44, .82], [.08, 1.32, .86], [.17, 1.26, .8], [.2, 1.24, .76]],
      look: [[.08, 1.62, -3], [.06, 1.3, -1.2], [.1, 1.02, -.35], [.12, .96, -.17], [.13, .95, -.16]],
      keys: [[-.6, 0], [.5, .24], [1.5, .58], [2.4, .86], [3.9, 1]], shake: { amp: .0022, freq: .4 },
    });
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const c = R.cam.update(t); camera.updateMatrixWorld();
    const dl = c.P.distanceTo(c.L);
    post.dof.focus = U.lerp(9, dl * .95, U.prog(t, .1, 1.5)); post.dof.range = U.lerp(14, .45, U.prog(t, .1, 1.8)); post.dof.amount = U.lerp(.5, 1, U.prog(t, .3, 1.8));
    const f = (s) => 1 + (Math.sin(t * 12.3 + s) * .5 + Math.sin(t * 7.7 + s * 2) * .3 + Math.sin(t * 19.1 + s * .5) * .2) * .13;
    R.pts[0].intensity = .35 * f(1); R.pts[1].intensity = .45 * f(4); R.spot.intensity = 1.1 * f(1);

    // ---------------- typography (same card design as s16) ----------------
    const tI = ctx.wordTime('ingiliz'), tE = ctx.wordTime('edward'), tG = ctx.wordTime('gibbon');
    G.locTag(ui, t, { t0: .12, text: 'LOZAN · 1787', accent: '#ffcf6b', y: 268 });
    const end = G.nameCard(ui, t, { y: 312, tCard: tI - .04, tName: tE - .04, tWork: tG - .3, name: 'EDWARD GIBBON', sub: 'İngiliz tarihçi · 1737–1794', work: 'Roma İmparatorluğu\'nun Çöküşü (1776–1789)', accent: '#ffcf6b', bg: 'rgba(16,16,32,.66)' });
    if (end) { const a = R.volAnchor; const [ax] = ui.project(a); G.pointer(ui, t, { t0: tG - .05, from: [ax, 312 + 292 + 4], anchor: a, color: '#ffcf6b', dur: .3 }); }
  },
};
