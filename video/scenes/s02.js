// s02 (7.50–13.20) "Resul-i Ekrem ﷺ'ın Kur'an'dan sonraki en büyük mu'cizesi ise, kendi zatıdır."
// (a) Medina at sunrise: the Green Dome (Kubbe-i Hadrâ) on its octagonal drum, gilded crescent finial, a slender minaret,
//     palm grove in the foreground. Majestic crane-up + push-in. Tag "Medine", text "Kur'ân'dan sonra / EN BÜYÜK MU'CİZE".
// (b) On "kendi" a true cross-dissolve (set A rendered to a render target) into a framed Hilye-i Şerif panel in warm
//     window light: ebru border, gilded frame, real Arabic (Amiri) — only the exact strings from the brief. "KENDİ ZÂTI".
import * as THREE from 'three';
import * as S2 from '../engine/lib/extra_S02.js';

let R = {};

// ---- per-set post looks (blended during the dissolve) ----
const PA = { exposure: .92, bloomS: .28, bloomT: .9, bloomR: .55, contrast: 1.12, saturation: 1.1, warmth: .02, lift: [.004, .008, .02], gain: [1.02, 1.0, .98], vignette: .34 };
const PB = { exposure: 1.0, bloomS: .3, bloomT: .86, bloomR: .5, contrast: 1.08, saturation: 1.0, warmth: .028, lift: [.02, .014, .02], gain: [1.03, 1.0, .96], vignette: .45 };

// Arabic strings — exactly as given in the brief.
const AR = {
  besmele: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  center: 'مُحَمَّدٌ رَسُولُ ٱللَّهِ',
  ayet: 'وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ',
  ebubekir: 'أَبُو بَكْرٍ', omer: 'عُمَرُ', osman: 'عُثْمَانُ', ali: 'عَلِيٌّ',
};

const D0 = 4.24, D1 = 4.66; // dissolve window (local s); "kendi" = 4.42

export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: .42, radius: .6, threshold: .8 },
    grade: { contrast: 1.05, saturation: 1.1, warmth: .04, lift: [.016, .012, .03], gain: [1.03, 1.0, .97] },
    vignette: .36, grain: .03,
    dof: { enabled: true, focus: 40, range: 30, amount: .6 },
  },

  async setup(ctx) {
    const { scene, U, W, H, renderer } = ctx;
    R = {};
    await Promise.all(['400 80px Amiri', '700 80px Amiri'].map(f => document.fonts.load(f, AR.besmele + AR.center)));
    const A = new THREE.Group(), B = new THREE.Group(); scene.add(A, B); R.A = A; R.B = B;
    R.envA = await ctx.loadHDR('kloofendal_48d_partly_cloudy_puresky'); R.envB = await ctx.loadHDR('kiara_interior');
    R.fogA = new THREE.FogExp2('#e6d6c8', .0013);
    buildMedina(ctx, A);
    buildHilye(ctx, B);

    // ---- cameras: one per set; the engine camera copies whichever is live ----
    R.camA = new THREE.PerspectiveCamera(38, W / H, 1, 2000);
    R.camB = new THREE.PerspectiveCamera(36, W / H, .05, 60);
    R.rigA = U.cameraRig(R.camA, {
      pos: [[6, 10, 95], [4.8, 12.5, 86], [1.8, 17, 70], [-0.8, 21, 61]],
      look: [[4.6, 24.8, -4], [3.6, 24.8, -4], [2.2, 24.2, -4], [1.8, 23.6, -4]],
      t0: -0.6, t1: 5.0, ease: t => .34 * t + .66 * (-(Math.cos(Math.PI * t) - 1) / 2), shake: { amp: .05, freq: .35 }, arc: true,
    });
    R.rigB = U.cameraRig(R.camB, {
      pos: [[0.36, 1.7, 2.3], [0.08, 1.62, 3.8], [-0.3, 1.57, 4.72], [-0.38, 1.56, 4.86]],
      look: [[0.0, 1.66, 0], [0.0, 1.56, 0], [0.01, 1.505, 0], [0.01, 1.5, 0]],
      t0: 4.1, t1: 6.6, ease: t => 1 - Math.pow(1 - t, 2.6), shake: { amp: .004, freq: .5 }, arc: true,
    });

    // ---- cross-dissolve: set A rendered to a linear HDR target, shown on a camera-locked quad over set B ----
    const sz = renderer.getSize(new THREE.Vector2());
    R.rt = new THREE.WebGLRenderTarget(sz.x, sz.y, { type: THREE.HalfFloatType });
    R.ovl = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: R.rt.texture, transparent: true, depthTest: false, depthWrite: false, fog: false, toneMapped: false }));
    R.ovl.renderOrder = 9999; R.ovl.frustumCulled = false; R.ovl.visible = false; R.ovl.userData.noDepth = true; scene.add(R.ovl);
    useSet(ctx, 'A');
  },

  update(t, ctx) {
    const { ui, U, post, camera, renderer, scene } = ctx;
    R.rigA.update(t); R.rigB.update(t);
    const p = U.smoothstep(D0, D1, t);
    const inB = t >= D0;
    R.ovl.visible = false;
    if (inB && p < 1) { // render the outgoing Medina shot into the target
      useSet(ctx, 'A');
      renderer.setRenderTarget(R.rt); renderer.clear(); renderer.render(scene, R.camA); renderer.setRenderTarget(null);
      R.ovl.visible = true; R.ovl.material.opacity = 1 - p;
    }
    useSet(ctx, inB ? 'B' : 'A');
    const cam = inB ? R.camB : R.camA;
    camera.position.copy(cam.position); camera.quaternion.copy(cam.quaternion);
    camera.fov = cam.fov; camera.near = cam.near; camera.far = cam.far; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    if (R.ovl.visible) {
      const d = .2, h = 2 * d * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      R.ovl.scale.set(h * camera.aspect, h, 1);
      R.ovl.position.copy(camera.position).add(new THREE.Vector3(0, 0, -d).applyQuaternion(camera.quaternion));
      R.ovl.quaternion.copy(camera.quaternion);
    }

    // ---- set A animation ----
    { // dawn: the low sun gains strength, warms to gold and climbs a little as the camera rises (peaks on "mu'cizesi")
      const d = U.smoothstep(-0.6, 3.9, t), el = U.lerp(.15, .23, d);
      const dir = new THREE.Vector3(SUN.x, 0, SUN.z).normalize().multiplyScalar(Math.sqrt(1 - el * el)).setY(el);
      R.sun.position.copy(dir).multiplyScalar(170).add(R.sun.target.position);
      R.sun.intensity = U.lerp(3.4, 4.9, d); R.sun.color.copy(R.sunC0).lerp(R.sunC1, d);
      R.sky.userData.uniforms.sunDir.value.copy(dir);
    }
    const tEn = ctx.wordTime('en'), tMu = ctx.wordTime("mu'cizesi");
    // sun glint travelling onto the gilded crescent as the camera rises into the light
    const g = U.smoothstep(tEn - .4, tMu, t) * (1 - .35 * U.smoothstep(tMu + .2, tMu + 1.2, t));
    R.glint.material.opacity = .42 * g; R.glint.scale.setScalar(1.0 + .5 * g);
    R.glint2.material.opacity = .38 * g; R.glint2.material.rotation = .3 + t * .12;

    // ---- set B animation ----
    if (R.cnd.userData.light) ctx.ENV.flicker(R.cnd.userData.light, t, 3, .12);

    // ---- post (blend the two looks across the dissolve) ----
    const m = (a, b) => U.lerp(a, b, p), ma = (a, b) => a.map((v, i) => U.lerp(v, b[i], p));
    post.exposure = m(PA.exposure, PB.exposure);
    post.bloom.strength = m(PA.bloomS, PB.bloomS); post.bloom.threshold = m(PA.bloomT, PB.bloomT); post.bloom.radius = m(PA.bloomR, PB.bloomR);
    post.grade.contrast = m(PA.contrast, PB.contrast); post.grade.saturation = m(PA.saturation, PB.saturation); post.grade.warmth = m(PA.warmth, PB.warmth);
    post.grade.lift = ma(PA.lift, PB.lift); post.grade.gain = ma(PA.gain, PB.gain); post.vignette = m(PA.vignette, PB.vignette);
    post.dof.enabled = inB; // set A is deep-focus (no depth pre-pass); the Hilye half uses shallow DOF
    if (!inB) {
      post.dof.focus = R.camA.position.distanceTo(new THREE.Vector3(0, 22, -4)); post.dof.range = 70;
      post.dof.amount = U.lerp(.3, .12, U.smoothstep(0, 4.0, t));
    } else {
      post.dof.focus = R.camB.position.distanceTo(new THREE.Vector3(0, 1.6, .05)); post.dof.range = 1.4;
      post.dof.amount = U.lerp(0, .5, p);
    }

    // ---- typography ----
    const tK = ctx.wordTime("kur'an"), tKe = ctx.wordTime('kendi'), tZ = ctx.wordTime('zat');
    const TX = 470; // typography centred on the dome's axis (the minaret rises at the right edge)
    locTag(ui, t, .2, tK - .1, 'Medine');
    // the Medina headline holds until the dissolve, then fades over 4.26–4.46 (before "KENDİ ZÂTI" pops) — alpha via colours
    const fo = 1 - U.smoothstep(D0 + .02, tKe + .04, t), ca = (rgb, a) => `rgba(${rgb},${(a * fo).toFixed(3)})`;
    if (fo > 0) {
      { const e = ui.env(t, tK - .15, Infinity, .5, 'fade'); if (e.o > 0) { const X = ui.ctx; X.save(); X.globalAlpha = e.o * .26 * fo; X.translate(TX, U.lerp(345, 430, U.smoothstep(tEn, tMu + .2, t))); X.scale(1, .44); const gr = X.createRadialGradient(0, 0, 0, 0, 0, 640); gr.addColorStop(0, 'rgba(40,28,44,.75)'); gr.addColorStop(.45, 'rgba(40,28,44,.4)'); gr.addColorStop(1, 'rgba(40,28,44,0)'); X.fillStyle = gr; X.fillRect(-640, -640, 1280, 1280); X.restore(); } }
      ui.text("Kur'ân'dan sonra", { t, t0: tK - .05, x: TX, y: 318, size: 56, weight: 800, color: ca('255,244,220', 1), anim: 'rise', shadowBlur: 22, shadowColor: ca('60,25,10', .6) });
      ui.text('EN BÜYÜK', { t, t0: tEn + .02, x: TX, y: 400, size: 74, weight: 900, color: ca('255,210,122', 1), anim: 'pop', letterSpacing: 2, shadowBlur: 26, shadowColor: ca('60,20,0', .6) });
      ui.text("MU'CİZE", { t, t0: tMu - .02, x: TX, y: 514, size: 98, weight: 900, color: ca('255,210,122', 1), anim: 'pop', letterSpacing: 3, shadowBlur: 30, shadowColor: ca('60,20,0', .65) });
    }
    { const e = ui.env(t, tKe - .05, Infinity, .6, 'fade'); if (e.o > 0) { const X = ui.ctx; X.save(); X.globalAlpha = e.o * .5; X.translate(540, 330); X.scale(1, .32); const gr = X.createRadialGradient(0, 0, 0, 0, 0, 560); gr.addColorStop(0, 'rgba(36,20,10,.85)'); gr.addColorStop(.6, 'rgba(36,20,10,.45)'); gr.addColorStop(1, 'rgba(36,20,10,0)'); X.fillStyle = gr; X.fillRect(-560, -560, 1120, 1120); X.restore(); } }
    ui.text('KENDİ ZÂTI', { t, t0: tKe + .04, x: 540, y: 282, size: 100, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 6, shadowBlur: 26, shadowColor: 'rgba(40,15,0,.65)' });
    ui.text('“Sen yüce bir ahlâk üzeresin.”', { t, t0: tZ + .05, x: 540, y: 368, size: 40, weight: 500, family: 'Lora', italic: true, color: '#fff4dc', anim: 'rise', shadowBlur: 16, shadowColor: 'rgba(30,12,0,.85)' });
    ui.text('Kalem, 4', { t, t0: tZ + .3, x: 540, y: 416, size: 30, weight: 800, color: '#ffd27a', anim: 'fade', letterSpacing: 2, shadowBlur: 14, shadowColor: 'rgba(30,12,0,.85)' });
  },
};

// ------------------------------------------------------------------------------------------------
function useSet(ctx, which) {
  const { scene } = ctx; const a = which === 'A';
  R.A.visible = a; R.B.visible = !a;
  scene.fog = a ? R.fogA : null;
  scene.environment = a ? R.envA : R.envB; scene.environmentIntensity = a ? .28 : .28;
}

// Location tag (Kurzgesagt chip with a map pin)
function locTag(ui, t, t0, t1, label) {
  const e = ui.env(t, t0, t1, .5, 'pop'); if (e.o <= .001) return;
  const X = ui.ctx; X.save(); X.globalAlpha = e.o;
  const x = 118, y = 300; X.translate(x, y); X.scale(e.s, e.s);
  X.font = ui.font(44, 800, 'Nunito'); const tw = X.measureText(label).width; const w = tw + 112, h = 76;
  X.fillStyle = 'rgba(22,26,46,.62)'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 20; X.shadowOffsetY = 6; ui.rrect(-6, -h / 2, w, h, h / 2); X.fill(); X.shadowColor = 'transparent';
  // pin
  X.fillStyle = '#ffd27a'; X.beginPath(); X.arc(34, -8, 15, Math.PI * .85, Math.PI * .15, false); X.lineTo(34, 22); X.closePath(); X.fill();
  X.fillStyle = 'rgba(22,26,46,1)'; X.beginPath(); X.arc(34, -8, 6, 0, Math.PI * 2); X.fill();
  X.fillStyle = '#fff4dc'; X.textBaseline = 'middle'; X.textAlign = 'left'; X.fillText(label, 66, 2);
  X.restore();
}

// ------------------------------------------------------------------------------------------------
// SET A: Medina at dawn — the Green Dome as in the reference photographs (see engine/lib/extra_S02.js)
const SUN = new THREE.Vector3(-.9, .2, .38).normalize();
const ROOF = 13, ZW = 8, DOME = new THREE.Vector3(0, ROOF, -4), MIN = [18.5, -40];
function buildMedina(ctx, G) {
  const { U, ENV, FX, TEX } = ctx; const MT = S2.materials();
  // ---- sky: clear blue → peach dawn, a few high wisps; haze ----
  const sky = ENV.skyDome({ top: '#1f4a8e', mid: '#6d99d4', horizon: '#f8d5b6', bottom: '#e2c6a8', sunDir: SUN.toArray(), sunColor: '#ffd8a6', sunSize: .7, sunGlow: 1.0, clouds: .15, cloudColor: '#ffe8d6', intensity: 1 });
  G.add(sky); R.sky = sky;
  // ---- light: warm low sun raking from the left-front, cool sky fill, warm back-rim ----
  const sun = ENV.sunLight({ color: '#ffbf80', intensity: 4.6, pos: SUN.clone().multiplyScalar(170).add(new THREE.Vector3(6, 24, -14)).toArray(), target: [6, 24, -14], size: 44, mapSize: 2048, bias: -.0002, normalBias: .05, radius: 2 });
  sun.shadow.camera.far = 340; sun.shadow.camera.updateProjectionMatrix(); G.add(sun, sun.target); R.sun = sun; R.sunC0 = new THREE.Color('#ffb276'); R.sunC1 = new THREE.Color('#ffc890');
  G.add(new THREE.HemisphereLight('#9dbcf0', '#cbb497', .32));
  const rim = new THREE.DirectionalLight('#ffd7b0', .55); rim.position.set(15, 30, -90); G.add(rim);
  const cool = new THREE.DirectionalLight('#a4bcff', .26); cool.position.set(70, 22, 50); G.add(cool);

  // ---- ground: polished marble plaza ----
  const marble = S2.surface(512, 512, (x, w, h, P, H) => { // 6 m tile of the Haram's white marble with grey-brown inlay bands
    x.fillStyle = P('#e4dbcd', .55); x.fillRect(0, 0, w, h);
    if (!H) { const r = S2.srand(5); for (let i = 0; i < 70; i++) { x.strokeStyle = `rgba(140,128,112,${.05 + r() * .07})`; x.lineWidth = .6 + r() * 1.4; x.beginPath(); let px = r() * w, py = r() * h; x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += (r() - .3) * 70; py += (r() - .5) * 40; x.lineTo(px, py); } x.stroke(); } }
    x.fillStyle = P('#a89a88', .4); x.fillRect(0, 0, w, 10); x.fillRect(0, 0, 10, h); x.fillRect(0, h / 2 - 3, w, 6); x.fillRect(w / 2 - 3, 0, 6, h);
    x.strokeStyle = P('#b7a994', .42); x.lineWidth = 5; for (const [cx, cy] of [[w / 4, h / 4], [3 * w / 4, h / 4], [w / 4, 3 * h / 4], [3 * w / 4, 3 * h / 4]]) { x.beginPath(); x.moveTo(cx, cy - 70); x.lineTo(cx + 70, cy); x.lineTo(cx, cy + 70); x.lineTo(cx - 70, cy); x.closePath(); x.stroke(); }
  }, { strength: 1.2, rep: [60, 60], wrapY: true });
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(360, 360).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: marble.map, normalMap: marble.normalMap, roughness: .5, envMapIntensity: .32 }));
  plaza.position.set(0, 0, 60); plaza.receiveShadow = true; G.add(plaza);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(3000, 3000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#dcc6a6', roughness: .95 })); ground.position.y = -.06; G.add(ground);

  // ---- the mosque wall (beige block masonry, grilled arched windows) + crenellated parapet ----
  const fac = S2.facadeSurface(14); fac.map.repeat.set(17, 1); fac.normalMap.repeat.set(17, 1);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(136, 14), new THREE.MeshStandardMaterial({ map: fac.map, normalMap: fac.normalMap, roughness: .85 }));
  front.position.set(0, 7, ZW); front.receiveShadow = true; G.add(front);
  const beige = new THREE.MeshStandardMaterial({ color: '#dcc8a6', roughness: .88 });
  const wall = new THREE.Mesh(new THREE.BoxGeometry(136, 14, 1.2), beige); wall.position.set(0, 7, ZW - .62); wall.receiveShadow = true; G.add(wall);
  const coping = new THREE.Mesh(new THREE.BoxGeometry(136.4, .26, 1.5), new THREE.MeshStandardMaterial({ color: '#e4d2b2', roughness: .8 })); coping.position.set(0, 14.13, ZW - .55); coping.castShadow = coping.receiveShadow = true; G.add(coping);
  const mg = S2.merlonGeo(); const mpos = []; for (let x = -67.8; x <= 67.8; x += .52) mpos.push(x);
  const merl = new THREE.InstancedMesh(mg, new THREE.MeshStandardMaterial({ color: '#e2cfae', roughness: .82 }), mpos.length); const m4 = new THREE.Matrix4();
  mpos.forEach((x, i) => { m4.makeTranslation(x, 14.26, ZW - .5); merl.setMatrixAt(i, m4); }); merl.castShadow = merl.receiveShadow = true; G.add(merl);
  // roof deck (stone pavers) behind the parapet
  const roofT = S2.surface(256, 256, (x, w, h, P, H) => { x.fillStyle = P('#e6d6b8', .55); x.fillRect(0, 0, w, h); if (!H) { const r = S2.srand(8); for (let i = 0; i < 16; i++) { x.fillStyle = `rgba(${r() < .5 ? '170,145,110' : '250,240,220'},${.05 + r() * .08})`; x.fillRect((i % 4) * 64, Math.floor(i / 4) * 64, 64, 64); } } x.fillStyle = P('rgba(150,125,95,.4)', .35); for (let i = 0; i < 4; i++) { x.fillRect(i * 64, 0, 2, h); x.fillRect(0, i * 64, w, 2); } }, { strength: 2, rep: [34, 26], wrapY: true });
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(136, 104).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: roofT.map, normalMap: roofT.normalMap, roughness: .9 }));
  roof.position.set(0, ROOF, ZW - 52); roof.receiveShadow = true; G.add(roof);

  // ---- THE GREEN DOME ----
  const gd = S2.greenDome({ R: 6.5, M: MT }); gd.position.copy(DOME); G.add(gd); R.gd = gd;
  gd.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  // small silver dome in front of the white base (as in the photograph)
  const sdm = S2.silverDome({ r: 2.1, M: MT }); sdm.position.set(7.07, ROOF, DOME.z + 7.07); G.add(sdm);
  // the Ottoman roofscape: rows of small lead domes (low-poly, instanced)
  { const spots = []; for (const z of [-2, -13, -24]) for (const x of [-40, -33, -26, -19, 21, 28, 35, 42]) spots.push([x, z]); for (const x of [-12, 12]) spots.push([x, -22]);
    const dg = new THREE.SphereGeometry(2.0, 28, 9, 0, Math.PI * 2, 0, Math.PI / 2); dg.scale(1, 1.05, 1);
    const drg = new THREE.CylinderGeometry(2.1, 2.15, .45, 28); drg.translate(0, .22, 0);
    const im1 = new THREE.InstancedMesh(dg, MT.silver, spots.length), im2 = new THREE.InstancedMesh(drg, MT.white, spots.length);
    spots.forEach(([x, z], i) => { m4.makeTranslation(x, ROOF + .4, z); im1.setMatrixAt(i, m4); m4.makeTranslation(x, ROOF, z); im2.setMatrixAt(i, m4); });
    im1.castShadow = im2.castShadow = im1.receiveShadow = im2.receiveShadow = true; G.add(im1, im2); }

  // ---- the minaret (Mamluk/Ottoman, cream stone: carved square shaft, muqarnas balconies, chevron band, fluted cap) ----
  const mn = S2.minaret({ P: 14, M: MT }); mn.position.set(MIN[0], 0, MIN[1]); mn.rotation.y = -.12; G.add(mn); R.mn = mn;
  // distant sister minarets of the Haram in the haze
  for (const [x, z, ry] of [[-26, -210, .3]]) { const c = mn.clone(); c.position.set(x, 0, z); c.rotation.y = ry; c.traverse(o => { if (o.isMesh) o.castShadow = false; }); G.add(c); }

  // ---- foreground: brass lantern posts on the plaza (with soft contact shadows) ----
  const postStone = new THREE.MeshStandardMaterial({ color: '#ece0c8', roughness: .75 });
  const shTex = TEX.drawTexture(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(60,40,25,.55)'); g.addColorStop(.5, 'rgba(60,40,25,.22)'); g.addColorStop(1, 'rgba(60,40,25,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false, opacity: 1 });
  R.posts = [];
  for (const [x, z] of [[3, 75], [10, 58], [-6, 50]]) {
    const lp = S2.lampPost(MT, postStone); lp.position.set(x, 0, z); lp.rotation.y = x * .1; G.add(lp); R.posts.push(lp);
    const cs = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2).rotateX(-Math.PI / 2), shMat); cs.position.set(x + .5, .015, z - .3); cs.renderOrder = 1; cs.userData.noDepth = true; G.add(cs);
  }

  // ---- distance: low city, Uhud ridge in haze ----
  const rnd = U.rng(77); const hs = [];
  for (let i = 0; i < 140; i++) { const a = rnd() * Math.PI * 2, r = 170 + rnd() * 260; const x = Math.cos(a) * r, z = Math.sin(a) * r - 40; if (z > -60 && Math.abs(x) < 90) continue; hs.push([x, z, 8 + rnd() * 16, 8 + rnd() * 16, 3 + rnd() * 9]); }
  const houses = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#ece2d2', roughness: .9 }), hs.length);
  const q = new THREE.Quaternion(); hs.forEach(([x, z, w, d, h], i) => { m4.compose(new THREE.Vector3(x, h / 2, z), q.setFromEuler(new THREE.Euler(0, rnd() * .4, 0)), new THREE.Vector3(w, h, d)); houses.setMatrixAt(i, m4); }); G.add(houses);
  { const seg = 220, pos = [], col = [], idx = []; const c1 = new THREE.Color('#b89c98'), c2 = new THREE.Color('#e6d0c0');
    for (let i = 0; i <= seg; i++) { const u = i / seg, x = -1100 + 2200 * u; const h = 10 + 22 * Math.max(0, U.fbm1(u * 9 + 2, 4, 4) + .35) + 34 * Math.exp(-Math.pow((u - .4) / .08, 2)); const z = -950 - 80 * Math.sin(u * 7);
      pos.push(x, -4, z, x, h, z); col.push(c2.r, c2.g, c2.b, c1.r, c1.g, c1.b); if (i < seg) { const b = i * 2; idx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    const ridge = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })); G.add(ridge); }

  // ---- sun glint on the gilded crescent (driven in update) ----
  const cy = ROOF + gd.userData.crescentY;
  R.glint = FX.glow({ size: 1.0, opacity: 0, color: '#fff0c8' }); R.glint.position.set(-.18, cy + .05, DOME.z + .35); G.add(R.glint);
  const starTex = TEX.drawTexture(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.12, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#fff'; x.beginPath(); for (let k = 0; k < 4; k++) { x.save(); x.translate(64, 64); x.rotate(k * Math.PI / 4); x.rect(-64, -2.2 + (k % 2), 128, 4.4 - 2 * (k % 2)); x.restore(); } x.fill(); });
  R.glint2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#fff2cf', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  R.glint2.scale.setScalar(2.0); R.glint2.position.copy(R.glint.position); R.glint2.userData.noDepth = true; R.glint2.renderOrder = 16; G.add(R.glint2);
  R.finTop = new THREE.Vector3(0, ROOF + gd.userData.topY, DOME.z);
}

function archPath(x, cx, by, w, h) { // pointed (ogival) arch, bottom y = by
  const top = by - h, spring = top + w * .62;
  x.beginPath(); x.moveTo(cx - w / 2, by); x.lineTo(cx - w / 2, spring); x.quadraticCurveTo(cx - w / 2, top + w * .12, cx, top);
  x.quadraticCurveTo(cx + w / 2, top + w * .12, cx + w / 2, spring); x.lineTo(cx + w / 2, by); x.closePath();
}

// ------------------------------------------------------------------------------------------------
// SET B: the Hilye-i Şerif panel on a plaster wall in warm window light
function buildHilye(ctx, G) {
  const { MODELS: M, FX, TEX } = ctx; const MAT = M.MAT;
  const wallMat = MAT.plaster({ a: '#dac6a8', b: '#b9a080', seed: 12, repeat: [4, 3] }); wallMat.normalScale.set(.25, .25);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 7), wallMat); wall.position.set(0, 1.6, 0); wall.receiveShadow = true; G.add(wall);

  const PW = .76, PH = 1.1875; // painted face size (m), canvas 1024×1600
  const ebruC = ebruCanvas(384, 600, 5);
  const colTex = TEX.drawTexture(1024, 1600, (x, w, h) => hilyeDraw(x, w, h, false, ebruC));
  const mskTex = TEX.drawTexture(1024, 1600, (x, w, h) => hilyeDraw(x, w, h, true, ebruC), { srgb: false });
  colTex.anisotropy = mskTex.anisotropy = 8;
  const faceMat = new THREE.MeshPhysicalMaterial({ map: colTex, roughnessMap: mskTex, metalnessMap: mskTex, bumpMap: mskTex, bumpScale: 1.2, roughness: 1, metalness: 1, envMapIntensity: 1.3 });
  const panel = new THREE.Group(); panel.position.set(0, 1.6, .07); panel.rotation.x = .04; G.add(panel); R.panel = panel;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), faceMat); face.position.z = .002; face.receiveShadow = true; panel.add(face);
  const back = new THREE.Mesh(M.rbox(PW + .2, PH + .2, .03, .01), MAT.darkWood({ rings: 12 })); back.position.z = -.016; back.castShadow = true; panel.add(back);
  // gilded frame: a carved molding profile swept around the opening with mitred corners
  const ctrl = [[0, 0], [0, .012], [.004, .021], [.011, .022], [.016, .016], [.022, .019], [.032, .031], [.046, .041], [.06, .041], [.072, .035], [.08, .026], [.086, .029], [.093, .025], [.098, .013], [.1, 0]];
  const prof = new THREE.SplineCurve(ctrl.map(([a, b]) => new THREE.Vector2(a, b))).getPoints(46).map(v => [v.x, v.y]);
  const gold = new THREE.MeshPhysicalMaterial({ color: '#f2c463', metalness: 1, roughness: .24, clearcoat: .3, clearcoatRoughness: .25, envMapIntensity: 1.7 });
  const frame = new THREE.Mesh(frameGeo(PW - .016, PH - .016, prof), gold); frame.castShadow = true; frame.receiveShadow = true; panel.add(frame);
  // carved wooden shelf below with a brass candlestick and a rosewater sprinkler (gülabdan)
  const wood = MAT.wood({ a: '#9a6236', b: '#5e3a1c', rings: 20 });
  const shelf = new THREE.Mesh(M.rbox(1.7, .045, .24, .012), wood); shelf.position.set(0, .7, .12); G.add(shelf);
  const brs = new THREE.Shape(); brs.moveTo(0, 0); brs.lineTo(.16, 0); brs.quadraticCurveTo(.15, -.06, .07, -.09); brs.quadraticCurveTo(.02, -.12, .03, -.2); brs.lineTo(0, -.2); brs.closePath();
  const brg = new THREE.ExtrudeGeometry(brs, { depth: .03, bevelEnabled: true, bevelThickness: .006, bevelSize: .006, bevelSegments: 2 });
  for (const sx of [-.62, .62]) { const b = new THREE.Mesh(brg, wood); b.rotation.y = -Math.PI / 2; b.position.set(sx - .015, .678, 0); G.add(b); }
  const brass = new THREE.MeshPhysicalMaterial({ color: '#d9a748', metalness: 1, roughness: .28, clearcoat: .3, envMapIntensity: 1.4 });
  const sm = M.lathe([[.06, 0], [.062, .01], [.04, .02], [.016, .03], [.014, .09], [.022, .1], [.013, .11], [.013, .15], [.03, .16], [.034, .172], [.02, .176], [.0001, .176]], brass, 32);
  sm.position.set(.6, .7225, .13); G.add(sm);
  const cnd = M.candle({ height: .14, radius: .016, light: true, lightIntensity: .55, lightDistance: 2.2, seed: 4, flameHeight: .03 }); cnd.position.set(.6, .896, .13); G.add(cnd); R.cnd = cnd;
  cnd.userData.flame.userData.uniforms.intensity.value = 2.4; cnd.userData.glow.material.opacity = .14; cnd.userData.glow.scale.setScalar(.13); cnd.userData.light.userData.baseIntensity = .55;
  const gul = M.lathe([[.045, 0], [.05, .01], [.03, .02], [.05, .05], [.062, .09], [.05, .13], [.02, .16], [.011, .2], [.009, .3], [.016, .31], [.006, .335], [.0001, .34]], brass, 32);
  gul.position.set(-.6, .7225, .13); G.add(gul);
  M.shadowAll(sm); M.shadowAll(gul); shelf.castShadow = shelf.receiveShadow = true;

  // key: low morning sun through an arched window (projected cookie), soft; warm bounce fill
  const cookie = TEX.drawTexture(512, 512, (x, w, h) => {
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h); x.filter = 'blur(9px)'; x.fillStyle = '#fff';
    archPath(x, 236, 470, 330, 450); x.fill();
    x.fillStyle = '#000'; x.fillRect(392, 20, 16, 470); x.fillRect(60, 104, 380, 12); x.fillRect(80, 20, 12, 100); x.fillRect(150, 20, 12, 100); x.fillRect(310, 20, 12, 100);
  });
  const key = new THREE.SpotLight('#ffd8ae', 120, 18, .36, .75, 2);
  key.position.set(-2.4, 3.6, 3.8); key.target.position.set(.05, 1.5, 0); key.map = cookie;
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -.0003; key.shadow.normalBias = .01;
  G.add(key, key.target); R.key = key;
  G.add(new THREE.HemisphereLight('#ffe2c0', '#5a3a24', .2));
  G.add(FX.particles({ count: 70, center: [-.5, 1.9, .9], box: [2.0, 2.2, 1.4], size: 2.2, color: '#ffe3b4', opacity: .4, drift: [.02, .03, 0], swirl: .05 }));
}

// Picture-frame geometry: a 2D molding profile [[outwardOffset, height], ...] swept around a w×h opening (mitred corners).
function frameGeo(w, h, prof) {
  const pos = [], uv = [], idx = []; const n = prof.length; let base = 0;
  const corners = o => [[-w / 2 - o, -h / 2 - o], [w / 2 + o, -h / 2 - o], [w / 2 + o, h / 2 + o], [-w / 2 - o, h / 2 + o]];
  for (let s = 0; s < 4; s++) {
    for (let i = 0; i < n; i++) { const [o, z] = prof[i]; const c = corners(o); const a = c[s], b = c[(s + 1) % 4]; pos.push(a[0], a[1], z, b[0], b[1], z); uv.push(0, i / (n - 1), 1, i / (n - 1)); }
    for (let i = 0; i < n - 1; i++) { const k = base + i * 2; idx.push(k, k + 3, k + 1, k, k + 2, k + 3); }
    base += n * 2;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

// ---- Ebru (paper marbling, battal style) via inverse ink-drop mapping --------------------------
function ebruCanvas(w, h, seed) {
  let s = seed >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pal = [[34, 60, 108], [58, 92, 140], [186, 146, 78], [222, 206, 172], [112, 128, 136], [28, 46, 86], [160, 112, 66], [204, 182, 140], [124, 64, 50]];
  const base = [226, 212, 182];
  const ops = []; for (let i = 0; i < 760; i++) ops.push([rnd() * w * 1.1 - w * .05, rnd() * h * 1.1 - h * .05, 6 + Math.pow(rnd(), 1.3) * 15, pal[Math.floor(rnd() * pal.length)]]);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const im = x.createImageData(w, h); const D = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let px = i + .5 - Math.sin(j * .05) * 9, py = j + .5 - Math.sin(px * .06) * 12; let col = base, vein = 0;
    for (let k = ops.length - 1; k >= 0; k--) {
      const o = ops[k]; const dx = px - o[0], dy = py - o[1]; const d2 = dx * dx + dy * dy, r2 = o[2] * o[2];
      if (d2 < r2) { col = o[3]; const qq = Math.sqrt(d2 / r2); vein = Math.max(0, (qq - .9) / .1); break; }
      const k2 = Math.sqrt(1 - r2 / d2); px = o[0] + dx * k2; py = o[1] + dy * k2;
    }
    const p = (j * w + i) * 4; const v = 1 - vein * .45;
    D[p] = col[0] * v; D[p + 1] = col[1] * v; D[p + 2] = col[2] * v; D[p + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}

// ---- Hilye-i Şerif panel layout (1024×1600). mask=true draws R=height, G=roughness, B=metalness ------
function hilyeDraw(x, W, H, mask, ebruC) {
  const C = mask ? {
    gold: 'rgb(255,118,215)', goldLine: 'rgb(200,125,215)', ink: 'rgb(36,120,0)', paper: 'rgb(0,228,0)', lapis: 'rgb(18,180,0)', red: 'rgb(18,170,0)', white: 'rgb(18,170,0)', green: 'rgb(18,180,0)', ebru: 'rgb(0,190,0)', shade: 'rgba(0,0,0,0)',
  } : { gold: '#e2b45a', goldLine: '#c99a3e', ink: '#1c130d', paper: '#f1e3c3', lapis: '#1f3f80', red: '#a8322a', white: '#f6efe0', green: '#3c7a52', ebru: null, shade: 'rgba(120,80,30,.10)' };
  const R2 = rngLocal(19);
  // ebru border
  if (mask) { x.fillStyle = C.ebru; x.fillRect(0, 0, W, H); } else x.drawImage(ebruC, 0, 0, W, H);
  // paper + rules
  x.fillStyle = C.goldLine; x.fillRect(84, 84, W - 168, H - 168);
  x.fillStyle = C.paper; x.fillRect(94, 94, W - 188, H - 188);
  if (!mask) { const g = x.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 900); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(150,100,40,.16)'); x.fillStyle = g; x.fillRect(94, 94, W - 188, H - 188); }
  x.strokeStyle = C.gold; x.lineWidth = 5; x.strokeRect(106, 106, W - 212, H - 212);
  x.strokeStyle = C.ink; x.lineWidth = 1.5; x.strokeRect(113, 113, W - 226, H - 226);

  // Arabic in Amiri (exact brief strings). This Amiri build places every haraka at a fixed ~0.82–1.24 em (HarfBuzz gives no
  // vertical mark offsets), which leaves short words such as the stacked «محمد» with marks floating ~½ em above the letters.
  // For those words the SAME shaped string is drawn twice: base letters clipped below 0.75 em, the mark layer clipped above
  // it and lowered by `drop` em (gaps verified against glyph extents: bases ≤ .69 em, marks ≥ .82 em).
  const ar = (str, cx, cy, maxW, size, color, weight = 700, drop = 0) => {
    x.save(); x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = drop ? 'alphabetic' : 'middle'; x.font = `${weight} ${size}px Amiri`;
    const mw = x.measureText(str).width; if (mw > maxW) { size = size * maxW / mw; x.font = `${weight} ${size}px Amiri`; }
    x.fillStyle = color;
    if (!drop) x.fillText(str, cx, cy);
    else {
      const by = cy + (.42 - drop * .5) * size, sp = by - .75 * size;
      x.save(); x.beginPath(); x.rect(cx - W, sp, 2 * W, H); x.clip(); x.fillText(str, cx, by); x.restore();
      x.save(); x.beginPath(); x.rect(cx - W, sp - H + drop * size, 2 * W, H); x.clip(); x.fillText(str, cx, by + drop * size); x.restore();
    }
    x.restore();
  };
  const flower = (cx, cy, r, petal, mid, n = 5, rot = 0) => { x.fillStyle = petal; for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .55, cy + Math.sin(a) * r * .55, r * .5, r * .3, a, 0, Math.PI * 2); x.fill(); } x.fillStyle = mid; x.beginPath(); x.arc(cx, cy, r * .28, 0, Math.PI * 2); x.fill(); };
  const rosette = (cx, cy, r) => { x.fillStyle = C.gold; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4; x.beginPath(); x.ellipse(cx + Math.cos(a) * r * .5, cy + Math.sin(a) * r * .5, r * .5, r * .2, a, 0, Math.PI * 2); x.fill(); } x.beginPath(); x.arc(cx, cy, r * .2, 0, Math.PI * 2); x.fill(); };
  const halkar = (rx, ry, rw, rh, holes, step = 58) => { // fine gold geometric lattice (kafes) with rosettes, skipping circular holes
    x.save(); x.beginPath(); x.rect(rx, ry, rw, rh); holes.forEach(([hx, hy, hr]) => { x.moveTo(hx + hr, hy); x.arc(hx, hy, hr, 0, Math.PI * 2, true); }); x.clip('evenodd');
    x.strokeStyle = C.gold; x.lineWidth = 1.3; x.globalAlpha = mask ? 1 : .75;
    for (let k = -rh; k < rw + rh; k += step) { x.beginPath(); x.moveTo(rx + k, ry); x.lineTo(rx + k + rh, ry + rh); x.stroke(); x.beginPath(); x.moveTo(rx + k, ry + rh); x.lineTo(rx + k + rh, ry); x.stroke(); }
    x.globalAlpha = 1;
    for (let j = 0, yy = ry; yy <= ry + rh + step; j++, yy += step / 2) for (let xx = rx + (j % 2) * step / 2; xx <= rx + rw + step; xx += step) rosette(xx, yy, step * .2);
    x.restore();
  };

  // --- başmakam (top band) with the Besmele ---
  const bx = 124, by = 124, bw = W - 248, bh = 146;
  x.fillStyle = C.lapis; x.fillRect(bx, by, bw, bh); x.strokeStyle = C.gold; x.lineWidth = 5; x.strokeRect(bx, by, bw, bh);
  for (const [fx, fy] of [[bx + 40, by + 40], [bx + 40, by + bh - 40], [bx + bw - 40, by + 40], [bx + bw - 40, by + bh - 40], [bx + 92, by + bh / 2], [bx + bw - 92, by + bh / 2]]) flower(fx, fy, 16, C.gold, C.red, 6, .3);
  const cart = (cx, cy, w2, h2) => { x.beginPath(); x.moveTo(cx - w2 / 2 + h2 / 2, cy - h2 / 2); x.lineTo(cx + w2 / 2 - h2 / 2, cy - h2 / 2); x.arc(cx + w2 / 2 - h2 / 2, cy, h2 / 2, -Math.PI / 2, Math.PI / 2); x.lineTo(cx - w2 / 2 + h2 / 2, cy + h2 / 2); x.arc(cx - w2 / 2 + h2 / 2, cy, h2 / 2, Math.PI / 2, Math.PI * 1.5); x.closePath(); };
  cart(W / 2, by + bh / 2, 600, 114); x.fillStyle = C.gold; x.fill(); cart(W / 2, by + bh / 2, 586, 100); x.fillStyle = C.paper; x.fill();
  ar(AR.besmele, W / 2, by + bh / 2 + 6, 520, 62, C.ink);

  // --- göbek region: crescent, medallion, four corner roundels ---
  const gy = 286, gh = 744, gcx = W / 2, gcy = 650;
  x.strokeStyle = C.gold; x.lineWidth = 4; x.strokeRect(bx, gy, bw, gh);
  const corners = [[200, 362, AR.omer], [824, 362, AR.ebubekir], [200, 954, AR.ali], [824, 954, AR.osman]];
  halkar(bx + 4, gy + 4, bw - 8, gh - 8, [[gcx, 688, 346], ...corners.map(([cx, cy]) => [cx, cy, 76])]);
  // crescent (hilâl) — gold, horns upward, cradling the medallion
  {
    const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const y = cc.getContext('2d');
    y.fillStyle = C.gold; y.beginPath(); y.arc(gcx, 688, 336, 0, Math.PI * 2); y.fill();
    if (!mask) { y.save(); y.clip(); y.strokeStyle = C.goldLine; y.lineWidth = 3; for (let a = 0; a < 64; a++) { y.beginPath(); y.arc(gcx + Math.cos(a / 64 * 6.283) * 322, 688 + Math.sin(a / 64 * 6.283) * 322, 7, 0, Math.PI * 2); y.stroke(); } y.restore(); }
    y.globalCompositeOperation = 'destination-out'; y.beginPath(); y.arc(gcx, gcy, 314, 0, Math.PI * 2); y.fill();
    x.drawImage(cc, 0, 0);
  }
  // medallion
  x.fillStyle = C.gold; x.beginPath(); x.arc(gcx, gcy, 296, 0, Math.PI * 2); x.fill();
  x.fillStyle = C.lapis; x.beginPath(); x.arc(gcx, gcy, 288, 0, Math.PI * 2); x.fill();
  x.fillStyle = C.gold; x.beginPath(); x.arc(gcx, gcy, 278, 0, Math.PI * 2); x.fill();
  x.fillStyle = C.paper; x.beginPath(); x.arc(gcx, gcy, 272, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; flower(gcx + Math.cos(a) * 283, gcy + Math.sin(a) * 283, 7, C.white, C.red, 5, a); }
  const words = AR.center.split(' '); // مُحَمَّدٌ | رَسُولُ ٱللَّهِ
  ar(words[0], gcx, gcy - 70, 420, 200, C.ink, 700, .22);
  ar(words.slice(1).join(' '), gcx, gcy + 112, 430, 124, C.ink);
  // corner roundels with the four names
  for (const [cx, cy, name] of corners) {
    x.fillStyle = C.gold; x.beginPath(); x.arc(cx, cy, 68, 0, Math.PI * 2); x.fill();
    x.fillStyle = C.lapis; x.beginPath(); x.arc(cx, cy, 62, 0, Math.PI * 2); x.fill();
    x.fillStyle = C.gold; x.beginPath(); x.arc(cx, cy, 55, 0, Math.PI * 2); x.fill();
    x.fillStyle = C.paper; x.beginPath(); x.arc(cx, cy, 51, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillStyle = C.gold; x.beginPath(); x.arc(cx + Math.cos(a) * 58.5, cy + Math.sin(a) * 58.5, 2.4, 0, Math.PI * 2); x.fill(); }
    ar(name, cx, cy + 4, 84, 48, C.ink, 700, name === AR.omer ? .14 : 0);
  }

  // --- âyet band with side koltuks ---
  const ay = 1044, ah = 118;
  for (const [kx, kw] of [[bx, 112], [W - bx - 112, 112]]) {
    x.fillStyle = C.gold; x.fillRect(kx, ay, kw, ah);
    if (!mask) { x.strokeStyle = C.goldLine; x.lineWidth = 2; x.strokeRect(kx + 6, ay + 6, kw - 12, ah - 12); }
    flower(kx + kw / 2, ay + ah / 2, 26, C.red, C.gold, 6, .2); flower(kx + kw / 2, ay + ah / 2, 12, C.white, C.lapis, 5, .5);
    for (const [ox, oy] of [[-34, -34], [34, -34], [-34, 34], [34, 34]]) flower(kx + kw / 2 + ox, ay + ah / 2 + oy, 9, C.lapis, C.white, 5, 0);
  }
  const ax = bx + 120, aw = bw - 240;
  x.fillStyle = C.lapis; x.fillRect(ax, ay, aw, ah); x.strokeStyle = C.gold; x.lineWidth = 5; x.strokeRect(ax, ay, aw, ah);
  ar(AR.ayet, W / 2, ay + ah / 2 + 5, aw - 60, 60, C.gold);

  // --- etek (lower part): illuminated şemse medallion + corner pieces, no lettering ---
  const ey = 1176, eh = H - 124 - ey;
  x.strokeStyle = C.gold; x.lineWidth = 4; x.strokeRect(bx, ey, bw, eh);
  halkar(bx + 4, ey + 4, bw - 8, eh - 8, [[W / 2, ey + eh / 2, 0]], 58);
  x.save(); x.translate(W / 2, ey + eh / 2);
  x.fillStyle = C.gold; x.beginPath(); x.ellipse(0, 0, 236, 112, 0, 0, Math.PI * 2); x.fill();
  x.fillStyle = C.lapis; x.beginPath(); x.ellipse(0, 0, 226, 102, 0, 0, Math.PI * 2); x.fill();
  for (const sx of [-1, 1]) { x.fillStyle = C.gold; x.beginPath(); x.moveTo(sx * 236, -22); x.quadraticCurveTo(sx * 286, 0, sx * 236, 22); x.fill(); x.beginPath(); x.arc(sx * 282, 0, 9, 0, Math.PI * 2); x.fill(); }
  for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; flower(Math.cos(a) * 158, Math.sin(a) * 68, 11, i % 2 ? C.white : C.red, C.gold, 5, a); }
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; x.fillStyle = C.gold; x.beginPath(); x.ellipse(Math.cos(a) * 52, Math.sin(a) * 30, 30, 9, a, 0, Math.PI * 2); x.fill(); }
  flower(0, 0, 34, C.gold, C.red, 8, 0); flower(0, 0, 14, C.white, C.gold, 6, .3);
  x.restore();
  for (const [cx, cy, a0] of [[bx, ey, 0], [bx + bw, ey, Math.PI / 2], [bx + bw, ey + eh, Math.PI], [bx, ey + eh, -Math.PI / 2]]) {
    x.save(); x.translate(cx, cy); x.rotate(a0); x.fillStyle = C.gold; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 92, 0, Math.PI / 2); x.closePath(); x.fill();
    x.fillStyle = C.lapis; x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, 82, 0, Math.PI / 2); x.closePath(); x.fill();
    flower(40, 40, 14, C.gold, C.red, 6, 0); x.restore();
  }
  if (!mask) { x.fillStyle = C.shade; x.fillRect(94, 94, W - 188, H - 188); }
}
function rngLocal(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
