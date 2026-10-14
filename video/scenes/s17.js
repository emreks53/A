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
    const el = 7.5 * Math.PI / 180, az = 4.5 * Math.PI / 180; const moonDir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)); R.moonDir = moonDir;
    const sky = ENV.skyDome({ top: '#040814', mid: '#0b1634', horizon: '#26365e', bottom: '#0b1222', sunDir: moonDir.toArray(), sunColor: '#a9bde8', sunSize: 0, sunGlow: .9, stars: 1.0, clouds: .12, cloudColor: '#3a4a74', intensity: 1 });
    scene.add(sky);
    const moon = G.moonSprite({ size: 17 }); moon.position.copy(moonDir).multiplyScalar(400).add(new THREE.Vector3(0, 1.4, 0)); scene.add(moon);
    const mg = FX.glow({ size: 110, opacity: .22, color: '#8ea6e0' }); mg.material.fog = false; mg.position.copy(moon.position); scene.add(mg);
    // Lake Geneva: dark water, sky-tinted toward the horizon, sparkling moon path (custom shader)
    const lu = { time: { value: 0 }, moonDir: { value: moonDir.clone() }, deep: { value: new THREE.Color('#050b18') }, skyC: { value: new THREE.Color('#1e2d52') }, glint: { value: new THREE.Color('#dfe8ff') }, fogC: { value: new THREE.Color('#1a2644') } };
    const lakeMat = new THREE.ShaderMaterial({ uniforms: lu,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float time; uniform vec3 moonDir, deep, skyC, glint, fogC; varying vec3 vW;
        float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x*p.y); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f); return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }
        void main(){
          vec3 V = normalize(vW - cameraPosition); float dep = max(-V.y, 0.);
          float dAz = acos(clamp(dot(normalize(V.xz), normalize(moonDir.xz)), -1., 1.));
          float w = .012 + dep*.42; float path = exp(-dAz*dAz/(w*w));
          vec2 q = vW.xz*vec2(.9, 3.2);
          float n = vn(q + vec2(time*.35, time*1.3)) * vn(q*1.9 - vec2(time*.9, -time*.4));
          float sp = smoothstep(.28, .62, n);
          float fres = pow(1. - dep, 7.);
          vec3 col = mix(deep, skyC, fres*.75);
          col += glint * path * (.12 + 2.4*sp) * (.5 + .5*smoothstep(.0, .05, dep));
          col += glint * exp(-dAz*dAz/.0009) * smoothstep(.06, .0, dep) * .6;   // bright streak near the far shore
          float d = length(vW - cameraPosition); col = mix(col, fogC, smoothstep(80., 260., d)*.5);
          gl_FragColor = vec4(col, 1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }` });
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(900, 400).rotateX(-Math.PI / 2), lakeMat); lake.position.set(0, -6, -170); lake.userData.uniforms = lu; scene.add(lake);
    // Savoy Alps across the lake (heightfield, snow by height)
    const mg2 = new THREE.PlaneGeometry(760, 140, 220, 40); mg2.rotateX(-Math.PI / 2); const mp = mg2.attributes.position; const colors = [];
    const sx = moonDir.x / -moonDir.z * 200; const P = x => 26 + 7 * Math.sin(x * .017 + .3) + 6 * U.fbm1(x * .05, 3) - 13 * Math.exp(-Math.pow((x - sx) / 24, 2)) + 7 * Math.pow(Math.max(0, Math.sin(x * .045 + 1.2)), 4);
    for (let i = 0; i < mp.count; i++) {
      const x = mp.getX(i), z = mp.getZ(i) - 240; const d = -z - 175;
      let h = d < 0 ? -12 : P(x) * (1 - Math.exp(-d / 16)) * (1 - U.smoothstep(70, 140, d) * .35) + 2.5 * U.fbm1(x * .21 + z * .13, 7) * U.smoothstep(0, 20, d);
      mp.setY(i, h - 6); const hn = (h - 6) / 50;
      const snow = U.smoothstep(.3, .52, hn + U.fbm1(x * .15, 11) * .08), forest = 1 - U.smoothstep(.04, .2, hn);
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
    const desk = M.desk({ w: 1.45, d: .8, leather: false, material: G.GMAT.mahogany({ a: '#7a3a1e', b: '#3c170a', rings: 10, clearcoat: .12 }) }); desk.position.set(0, 0, wz + .41); scene.add(desk);
    const csL = G.candlestick({ seed: 3, candleH: .15 }); csL.position.set(-.33, deskTop, .12); scene.add(csL);
    const csR = G.candlestick({ seed: 8, candleH: .12 }); csR.position.set(.47, deskTop, .1); scene.add(csR);
    R.fL = new THREE.Vector3(-.33, deskTop + csL.userData.flameY, .12); R.fR = new THREE.Vector3(.47, deskTop + csR.userData.flameY, .1);
    // finished manuscript with the quill laid down on it
    const ms = G.paperStack({ w: .22, d: .3, h: .055, sheets: 3, seed: 21, curl: .008, topTex: G.manuscriptTex({ seed: 22, lines: 28, stopAt: .45 }) }); ms.position.set(-.04, deskTop + .002, .2); ms.rotation.y = .18; scene.add(ms);
    const q = G.quill({ length: .3, bend: .025 }); q.rotation.set(-Math.PI / 2 + .04, 0, -2.2); q.position.set(.02, deskTop + .002 + ms.userData.topY + .004, .27); scene.add(q);
    const ink = M.inkwell({ quill: false }); ink.position.set(-.36, deskTop, -.2); scene.add(ink);
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
    const vols = new THREE.Group(); vols.position.set(.12, deskTop, -.2); vols.rotation.y = -.09; scene.add(vols); R.vols = vols;
    const vr2 = U.rng(5); const vd = .078, vw = .25, vh = .34; const bandMat = M.MAT.leather({ a: '#5a3218', b: '#2e170a', seed: 9 });
    for (let i = 0; i < 6; i++) {
      const b = G.tome({ w: vw, h: vh, d: vd, a: '#5c3418', b: '#2e170a', seed: 70 + i, spineDraw: spine(i), spineBg: '#4e2c14', raised: [.07, .45, .6, .75, .92].map(b => .5 - b), bandMat, spineFlat: .4 });
      b.rotation.y = Math.PI / 2; b.rotation.z = (vr2() - .5) * .015; b.position.set((i - 2.5) * (vd + .003), vh / 2, (vr2() - .5) * .01); vols.add(b);
    }
    vols.updateMatrixWorld(true); R.volAnchor = vols.localToWorld(new THREE.Vector3((2 - 2.5) * (vd + .003), vh + .002, vw / 2 - .01));

    // ---------------- lights ----------------
    const hemi = new THREE.HemisphereLight('#2a3760', '#1a120c', .3); scene.add(hemi);
    const moonL = new THREE.DirectionalLight('#8fa8ff', .38); moonL.position.copy(moonDir).multiplyScalar(-1).multiplyScalar(-6).add(new THREE.Vector3(0, 2, 0)); moonL.target.position.set(0, deskTop, 0); scene.add(moonL, moonL.target);
    const spot = new THREE.SpotLight('#ffbe78', .85, 5, .9, 1, 2); spot.position.copy(R.fL).add(new THREE.Vector3(.0, .02, .03)); spot.target.position.set(.12, deskTop + .15, -.1);
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -.0006; spot.shadow.normalBias = .01; spot.shadow.camera.near = .04; scene.add(spot, spot.target); R.spot = spot;
    const pL = ENV.pointLight({ color: '#ffa04a', intensity: .35, distance: 3, pos: R.fL.toArray() }); scene.add(pL);
    const pR = ENV.pointLight({ color: '#ffa04a', intensity: .45, distance: 3, pos: R.fR.toArray() }); scene.add(pR); R.pts = [pL, pR];
    for (const f of [R.fL, R.fR]) { const g = FX.glow({ size: .24, opacity: .32, color: '#ffb060' }); g.position.copy(f); scene.add(g); }
    

    // ---------------- camera: night view -> down to the desk -> the six volumes ----------------
    camera.fov = 40; camera.near = .03; camera.far = 900; camera.updateProjectionMatrix();
    R.cam = G.camPath(camera, {
      pos: [[.1, 1.45, .25], [.11, 1.42, .55], [.12, 1.37, .98], [.13, 1.33, 1.24], [.2, 1.31, 1.13]],
      look: [[.12, 1.56, -3], [.12, 1.45, -2], [.13, 1.2, -.9], [.13, 1.07, -.45], [.15, 1.055, -.4]],
      keys: [[-.6, 0], [.4, .22], [1.4, .58], [2.2, .8], [3.9, 1]], shake: { amp: .0022, freq: .4 },
    });
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const c = R.cam.update(t); camera.updateMatrixWorld();
    const dl = c.P.distanceTo(c.L);
    post.dof.focus = U.lerp(40, c.P.distanceTo(new THREE.Vector3(.12, 1.0, -.08)), U.prog(t, .2, 1.8)); post.dof.range = U.lerp(200, .6, U.prog(t, .2, 1.9, 'inCubic')); post.dof.amount = U.lerp(.3, .9, U.prog(t, .3, 1.8));
    const f = (s) => 1 + (Math.sin(t * 12.3 + s) * .5 + Math.sin(t * 7.7 + s * 2) * .3 + Math.sin(t * 19.1 + s * .5) * .2) * .13;
    R.pts[0].intensity = .35 * f(1); R.pts[1].intensity = .45 * f(4); R.spot.intensity = .85 * f(1);

    // ---------------- typography (same card design as s16) ----------------
    const tI = ctx.wordTime('ingiliz'), tE = ctx.wordTime('edward'), tG = ctx.wordTime('gibbon');
    G.locTag(ui, t, { t0: .12, text: 'LOZAN · 1787', accent: '#ffcf6b', y: 268 });
    const end = G.nameCard(ui, t, { y: 312, tCard: tI - .04, tName: tE - .04, tWork: tG - .3, name: 'EDWARD GIBBON', sub: 'İngiliz tarihçi · 1737–1794', work: 'Roma İmparatorluğu\'nun Çöküşü (1776–1789)', accent: '#ffcf6b', bg: 'rgba(16,16,32,.66)' });
    if (end) { const a = R.volAnchor; const [ax] = ui.project(a); G.pointer(ui, t, { t0: tG - .05, from: [ax, 312 + 292 + 4], anchor: a, color: '#ffcf6b', dur: .3 }); }
  },
};
