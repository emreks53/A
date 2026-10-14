// s02 (7.50–13.20) "Resul-i Ekrem ﷺ'ın Kur'an'dan sonraki en büyük mu'cizesi ise, kendi zatıdır."
// (a) Medina at sunrise: the Green Dome (Kubbe-i Hadrâ) on its octagonal drum, gilded crescent finial, a slender minaret,
//     palm grove in the foreground. Majestic crane-up + push-in. Tag "Medine", text "Kur'ân'dan sonra / EN BÜYÜK MU'CİZE".
// (b) On "kendi" a true cross-dissolve (set A rendered to a render target) into a framed Hilye-i Şerif panel in warm
//     window light: ebru border, gilded frame, real Arabic (Amiri) — only the exact strings from the brief. "KENDİ ZÂTI".
import * as THREE from 'three';

let R = {};

// ---- per-set post looks (blended during the dissolve) ----
const PA = { exposure: .94, bloomS: .4, bloomT: .82, bloomR: .6, contrast: 1.1, saturation: 1.16, warmth: .045, lift: [.012, .01, .03], gain: [1.04, 1.0, .96], vignette: .38 };
const PB = { exposure: 1.0, bloomS: .32, bloomT: .85, bloomR: .5, contrast: 1.08, saturation: 1.08, warmth: .04, lift: [.02, .014, .02], gain: [1.03, 1.0, .96], vignette: .45 };

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
    R.envA = await ctx.loadHDR('kiara_1_dawn'); R.envB = await ctx.loadHDR('kiara_interior');
    R.fogA = new THREE.FogExp2('#f2c69c', .0017);
    buildMedina(ctx, A);
    buildHilye(ctx, B);

    // ---- cameras: one per set; the engine camera copies whichever is live ----
    R.camA = new THREE.PerspectiveCamera(38, W / H, .5, 1500);
    R.camB = new THREE.PerspectiveCamera(36, W / H, .05, 60);
    R.rigA = U.cameraRig(R.camA, {
      pos: [[4.2, 2.6, 72], [2.4, 8.5, 58], [-0.4, 17.5, 42], [-2.2, 23.4, 31.5]],
      look: [[0, 16, -6], [0, 19.5, -6], [0, 23.5, -6], [0, 25.2, -6]],
      t0: -0.6, t1: 5.0, ease: t => .18 * t + .82 * (-(Math.cos(Math.PI * t) - 1) / 2), shake: { amp: .05, freq: .35 },
    });
    R.rigB = U.cameraRig(R.camB, {
      pos: [[0.36, 1.7, 2.3], [0.08, 1.62, 3.8], [-0.3, 1.57, 4.72], [-0.38, 1.56, 4.86]],
      look: [[0.0, 1.66, 0], [0.0, 1.54, 0], [0.01, 1.46, 0], [0.01, 1.45, 0]],
      t0: 4.1, t1: 6.6, ease: t => 1 - Math.pow(1 - t, 2.6), shake: { amp: .004, freq: .5 },
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
    R.palms.forEach((pl, i) => { pl.rotation.z = pl.userData.rz + Math.sin(t * .9 + i * 1.7) * .006; pl.rotation.x = Math.sin(t * .7 + i) * .004; });
    const tEn = ctx.wordTime('en'), tMu = ctx.wordTime("mu'cizesi");
    // sun glint travelling onto the gilded crescent as the camera rises into the light
    const g = U.smoothstep(tEn - .4, tMu, t) * (1 - .35 * U.smoothstep(tMu + .2, tMu + 1.2, t));
    R.glint.material.opacity = .75 * g; R.glint.scale.setScalar(1.8 + 1.0 * g);
    R.glint2.material.opacity = .5 * g; R.glint2.material.rotation = t * .15;

    // ---- set B animation ----
    if (R.cnd.userData.light) ctx.ENV.flicker(R.cnd.userData.light, t, 3, .12);

    // ---- post (blend the two looks across the dissolve) ----
    const m = (a, b) => U.lerp(a, b, p), ma = (a, b) => a.map((v, i) => U.lerp(v, b[i], p));
    post.exposure = m(PA.exposure, PB.exposure);
    post.bloom.strength = m(PA.bloomS, PB.bloomS); post.bloom.threshold = m(PA.bloomT, PB.bloomT); post.bloom.radius = m(PA.bloomR, PB.bloomR);
    post.grade.contrast = m(PA.contrast, PB.contrast); post.grade.saturation = m(PA.saturation, PB.saturation); post.grade.warmth = m(PA.warmth, PB.warmth);
    post.grade.lift = ma(PA.lift, PB.lift); post.grade.gain = ma(PA.gain, PB.gain); post.vignette = m(PA.vignette, PB.vignette);
    if (!inB) {
      post.dof.focus = R.camA.position.distanceTo(new THREE.Vector3(0, 22, -6)); post.dof.range = 26;
      post.dof.amount = U.lerp(.75, .12, U.smoothstep(1.0, 4.0, t));
    } else {
      post.dof.focus = R.camB.position.distanceTo(new THREE.Vector3(0, 1.6, .05)); post.dof.range = 1.4;
      post.dof.amount = U.lerp(0, .5, p);
    }

    // ---- typography ----
    const tK = ctx.wordTime("kur'an"), tKe = ctx.wordTime('kendi'), tZ = ctx.wordTime('zat');
    locTag(ui, t, .2, tK - .1, 'Medine');
    ui.text("Kur'ân'dan sonra", { t, t0: tK - .05, t1: D0 + .12, x: 540, y: 318, size: 56, weight: 800, color: '#fff4dc', anim: 'rise', shadowBlur: 22, shadowColor: 'rgba(60,25,10,.6)' });
    ui.text("EN BÜYÜK MU'CİZE", { t, t0: tEn + .02, t1: D0 + .12, x: 540, y: 408, size: 76, weight: 900, color: '#ffd27a', anim: 'pop', letterSpacing: 2, shadowBlur: 26, shadowColor: 'rgba(60,20,0,.6)' });
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
  scene.environment = a ? R.envA : R.envB; scene.environmentIntensity = a ? .3 : .28;
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
// SET A: Medina at sunrise
const SUN = new THREE.Vector3(-.9, .24, .12).normalize();
function buildMedina(ctx, G) {
  const { U, MODELS: M, ENV, FX, TEX } = ctx; const MAT = M.MAT;
  const sky = ENV.skyDome({ top: '#3f6fb6', mid: '#93b2d8', horizon: '#f7bf92', bottom: '#d8a67e', sunDir: SUN.toArray(), sunColor: '#ffcf98', sunSize: .9, sunGlow: 1.4, clouds: .55, cloudColor: '#ffd3b6', intensity: 1 });
  G.add(sky); R.sky = sky;
  const sun = ENV.sunLight({ color: '#ffc58c', intensity: 4.4, pos: SUN.clone().multiplyScalar(140).add(new THREE.Vector3(0, 14, -6)).toArray(), target: [0, 14, -6], size: 34, mapSize: 2048, bias: -.0004, normalBias: .05 });
  G.add(sun, sun.target);
  G.add(new THREE.HemisphereLight('#9fbde6', '#c99a76', .42));
  const fill = new THREE.DirectionalLight('#ffd2bd', .3); fill.position.set(10, 8, 40); G.add(fill); // warm sky bounce from the front

  // ground: sandy palm-garden soil + a marble plaza in front of the mosque
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), MAT.sand({ a: '#e2c49c', b: '#c09d74', repeat: [120, 120] }));
  sand.receiveShadow = true; G.add(sand);
  const tileTex = TEX.drawTexture(256, 256, (x, w, h) => { x.fillStyle = '#efe6d6'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(150,125,95,.45)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); x.fillStyle = 'rgba(190,160,120,.25)'; x.beginPath(); x.moveTo(w / 2, 40); x.lineTo(w - 40, h / 2); x.lineTo(w / 2, h - 40); x.lineTo(40, h / 2); x.closePath(); x.fill(); });
  tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(36, 9);
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(72, 18).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tileTex, roughness: .55 }));
  plaza.position.set(0, .02, 16); plaza.receiveShadow = true; G.add(plaza);

  // ---- mosque block ----
  const stoneMat = MAT.stone({ a: '#ead7b4', b: '#c8ae86', seed: 4, repeat: [4, 2] });
  const body = new THREE.Mesh(M.rbox(64, 12, 48, .3), stoneMat); body.position.set(0, 6, -16); G.add(body);
  const facTex = TEX.drawTexture(512, 768, (x, w, h) => facadeDraw(x, w, h, false)); facTex.wrapS = THREE.RepeatWrapping; facTex.repeat.set(8, 1);
  const facE = TEX.drawTexture(256, 384, (x, w, h) => facadeDraw(x, w, h, true)); facE.wrapS = THREE.RepeatWrapping; facE.repeat.set(8, 1);
  const facade = new THREE.Mesh(new THREE.PlaneGeometry(64, 12), new THREE.MeshStandardMaterial({ map: facTex, emissiveMap: facE, emissive: '#ffffff', emissiveIntensity: .9, roughness: .9 }));
  facade.position.set(0, 6, 8.03); G.add(facade);
  const cornice = new THREE.Mesh(M.rbox(64.6, .55, .9, .2), stoneMat); cornice.position.set(0, 11.85, 8.1); G.add(cornice);
  const roofTex = TEX.drawTexture(256, 256, (x, w, h) => { x.fillStyle = '#e6d6b8'; x.fillRect(0, 0, w, h); x.strokeStyle = 'rgba(140,115,85,.35)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(w, i * 64); x.stroke(); } });
  roofTex.wrapS = roofTex.wrapT = THREE.RepeatWrapping; roofTex.repeat.set(16, 12);
  const roof = new THREE.Mesh(new THREE.PlaneGeometry(63.4, 47.4).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: roofTex, roughness: .85 }));
  roof.position.set(0, 12.02, -16); roof.receiveShadow = true; G.add(roof);
  // crenellated parapet (pointed merlons), instanced
  const ms = new THREE.Shape(); ms.moveTo(-.34, 0); ms.lineTo(.34, 0); ms.lineTo(.34, .6); ms.quadraticCurveTo(.3, .95, 0, 1.15); ms.quadraticCurveTo(-.3, .95, -.34, .6); ms.closePath();
  const mg = new THREE.ExtrudeGeometry(ms, { depth: .28, bevelEnabled: true, bevelThickness: .05, bevelSize: .05, bevelSegments: 2, curveSegments: 8 }); mg.translate(0, 0, -.14);
  const mpos = []; for (let xx = -31.4; xx <= 31.4; xx += 1.12) mpos.push([xx, 7.85, 0]);
  for (let zz = -39.4; zz < 7.4; zz += 1.12) { mpos.push([-31.85, zz, Math.PI / 2]); mpos.push([31.85, zz, Math.PI / 2]); }
  const merl = new THREE.InstancedMesh(mg, stoneMat, mpos.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  mpos.forEach(([a, b, ry], i) => { const p = ry ? new THREE.Vector3(a, 12.1, b) : new THREE.Vector3(a, 12.1, b); q.setFromEuler(new THREE.Euler(0, ry, 0)); m4.compose(p, q, new THREE.Vector3(1, 1, 1)); merl.setMatrixAt(i, m4); });
  merl.castShadow = merl.receiveShadow = true; G.add(merl);

  // ---- small lead domes of the roof (instanced) ----
  const sd = []; for (const zz of [-2, -12, -22, -32]) for (const xx of [-26, -19, -12, 12, 19, 26]) sd.push([xx, zz]);
  for (const xx of [-5, 5]) sd.push([xx, -24], [xx, -33]);
  const leadMat = new THREE.MeshStandardMaterial({ color: '#8e9897', metalness: .35, roughness: .55 });
  const sdDrum = new THREE.InstancedMesh(new THREE.CylinderGeometry(2.1, 2.2, .8, 24), stoneMat, sd.length);
  const sdGeo = new THREE.SphereGeometry(2.0, 28, 10, 0, Math.PI * 2, 0, Math.PI / 2); sdGeo.scale(1, .72, 1);
  const sdDome = new THREE.InstancedMesh(sdGeo, leadMat, sd.length);
  sd.forEach(([xx, zz], i) => { m4.makeTranslation(xx, 12.42, zz); sdDrum.setMatrixAt(i, m4); m4.makeTranslation(xx, 12.8, zz); sdDome.setMatrixAt(i, m4); });
  sdDrum.castShadow = sdDome.castShadow = true; sdDrum.receiveShadow = sdDome.receiveShadow = true; G.add(sdDrum, sdDome);

  // ---- THE GREEN DOME ----
  const GD = new THREE.Group(); GD.position.set(0, 12, -6); G.add(GD); R.gd = GD;
  const baseMat = MAT.plaster({ a: '#efe1c4', b: '#d6c19c', seed: 14, repeat: [2, 1] }); baseMat.normalScale.set(.3, .3);
  const base = new THREE.Mesh(M.rbox(13, 3.2, 13, .25), baseMat); base.position.y = 1.6; GD.add(base);
  const baseC = new THREE.Mesh(M.rbox(13.8, .5, 13.8, .18), baseMat); baseC.position.y = 3.3; GD.add(baseC);
  const greenTex = TEX.plaster({ a: '#2f9a5c', b: '#23804a', seed: 21, repeat: [3, 2] });
  const drumTex = TEX.drawTexture(1024, 256, (x, w, h) => {
    x.fillStyle = '#1f8a4c'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) {
      const cx = (i + .5) * w / 8; // window per octagon face
      x.fillStyle = '#e9dcbc'; archPath(x, cx, h - 58, 48, 118); x.fill();
      x.fillStyle = '#1a2620'; archPath(x, cx, h - 66, 32, 98); x.fill();
      x.strokeStyle = 'rgba(233,220,188,.85)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, h - 66); x.lineTo(cx, h - 150); x.stroke();
      x.beginPath(); x.moveTo(cx - 16, h - 106); x.lineTo(cx + 16, h - 106); x.stroke();
      x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(i * w / 8, 0, 3, h);
    }
    x.fillStyle = '#efe3c6'; x.fillRect(0, h - 26, w, 26); x.fillRect(0, 0, w, 14);
  });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(5.45, 5.55, 4.4, 8, 1, true, Math.PI / 8), new THREE.MeshPhysicalMaterial({ map: drumTex, roughness: .5, clearcoat: .25, clearcoatRoughness: .5, side: THREE.DoubleSide }));
  drum.position.y = 3.55 + 2.2; GD.add(drum);
  const drumTop = new THREE.Mesh(new THREE.CylinderGeometry(5.95, 5.75, .5, 8, 1, false, Math.PI / 8), stoneMat); drumTop.position.y = 8.0; GD.add(drumTop);
  const domeMat = new THREE.MeshPhysicalMaterial({ color: '#1e8f4d', normalMap: greenTex.normalMap, normalScale: new THREE.Vector2(.25, .25), roughness: .36, clearcoat: .55, clearcoatRoughness: .28, sheen: .2, sheenColor: new THREE.Color('#a8ffd0') });
  const R0 = 5.3, Hd = 6.1, y0 = 8.25;
  const prof = [[R0 + .15, 0], [R0, .02], [R0, .3]];
  for (let i = 1; i <= 28; i++) { const a = i / 28 * Math.PI / 2; let r = R0 * Math.cos(a), y = .3 + Hd * Math.sin(a); r = r * (1 - .1 * Math.pow(Math.sin(a), 6)); if (r < .42) r = .42; prof.push([r, y]); }
  const dome = M.lathe(prof, domeMat, 96); dome.position.y = y0; GD.add(dome);
  // raised ribs (24) following the profile
  const ribPts = prof.slice(2).map(([r, y]) => new THREE.Vector3(r + .03, y, 0));
  const ribGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ribPts), 48, .11, 6, false);
  const ribs = new THREE.InstancedMesh(ribGeo, new THREE.MeshPhysicalMaterial({ color: '#28a35c', roughness: .3, clearcoat: .6, clearcoatRoughness: .25 }), 24);
  for (let i = 0; i < 24; i++) { m4.makeRotationY(i / 24 * Math.PI * 2); ribs.setMatrixAt(i, m4); }
  ribs.position.y = y0; ribs.castShadow = ribs.receiveShadow = true; GD.add(ribs);
  // gilded finial (alem): neck, three spheres, rod, upward crescent
  const goldMat = new THREE.MeshPhysicalMaterial({ color: '#f1c35a', metalness: 1, roughness: .2, clearcoat: .5, clearcoatRoughness: .15 });
  const fin = new THREE.Group(); fin.position.y = y0 + .3 + Hd * .985; GD.add(fin);
  fin.add(M.lathe([[.5, 0], [.56, .12], [.34, .34], [.28, .55], [.36, .62], [.0001, .64]], goldMat, 32));
  for (const [r, y] of [[.5, 1.08], [.38, 1.86], [.28, 2.44]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), goldMat); s.position.y = y; s.castShadow = true; fin.add(s); }
  for (const y of [1.6, 2.22]) { const c = new THREE.Mesh(new THREE.TorusGeometry(.17, .05, 8, 20), goldMat); c.rotation.x = Math.PI / 2; c.position.y = y; fin.add(c); }
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, 1.0, 10), goldMat); rod.position.y = 3.0; fin.add(rod);
  const cs = new THREE.Shape(); cs.absarc(0, 0, .82, 0, Math.PI * 2, false); const ch = new THREE.Path(); ch.absarc(0, .3, .7, 0, Math.PI * 2, true); cs.holes.push(ch);
  const cres = new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: .1, bevelEnabled: true, bevelThickness: .045, bevelSize: .045, bevelSegments: 3, curveSegments: 48 }), goldMat);
  cres.geometry.translate(0, 0, -.05); cres.position.y = 4.15; cres.rotation.y = -.35; cres.castShadow = true; fin.add(cres);
  R.finTop = new THREE.Vector3(0, 12 + y0 + .3 + Hd * .985 + 3.9, -6);
  // sun glint on the gilding (real specular sparkle, driven in update)
  R.glint = FX.glow({ size: 2.0, opacity: 0, color: '#fff0c8' }); R.glint.position.copy(R.finTop).add(new THREE.Vector3(-.5, -.2, .6)); G.add(R.glint);
  const starTex = TEX.drawTexture(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.12, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'destination-in'; x.fillStyle = '#fff'; x.beginPath(); for (let k = 0; k < 4; k++) { x.save(); x.translate(64, 64); x.rotate(k * Math.PI / 4); x.rect(-64, -2.2 + (k % 2), 128, 4.4 - 2 * (k % 2)); x.restore(); } x.fill(); });
  R.glint2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#fff2cf', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  R.glint2.scale.setScalar(3.6); R.glint2.position.copy(R.glint.position); R.glint2.userData.noDepth = true; R.glint2.renderOrder = 16; G.add(R.glint2);

  // ---- slender minaret (rises from the roof, behind-left) ----
  const MN = new THREE.Group(); MN.position.set(-10.5, 12, -27); G.add(MN);
  const mbase = new THREE.Mesh(M.rbox(4.2, 6, 4.2, .2), stoneMat); mbase.position.y = 3; MN.add(mbase);
  const mprof = [[2.2, 6], [1.6, 6.4], [1.5, 6.6], [1.45, 17], [1.5, 17.2], [1.62, 17.6], [2.05, 18.6], [2.2, 18.8], [2.2, 19.05], [1.2, 19.1], [1.18, 27], [1.3, 27.2], [1.75, 28.0], [1.85, 28.2], [1.85, 28.4], [1.0, 28.45], [.98, 32.2], [1.12, 32.4], [1.22, 33.2], [1.12, 34.3], [.75, 35.6], [.32, 36.6], [.12, 37.1], [.0001, 37.15]];
  const mlath = M.lathe(mprof, stoneMat, 24); MN.add(mlath);
  // balcony railings (alpha-tested lattice cylinders)
  const latT = TEX.drawTexture(512, 64, (x, w, h) => { x.fillStyle = '#fff'; x.fillRect(0, 0, w, 10); x.fillRect(0, h - 8, w, 8); for (let i = 0; i < 32; i++) { x.fillRect(i * 16, 0, 4, h); x.save(); x.translate(i * 16 + 10, h / 2); x.rotate(Math.PI / 4); x.strokeStyle = '#fff'; x.lineWidth = 3; x.strokeRect(-7, -7, 14, 14); x.restore(); } });
  const latMat = new THREE.MeshStandardMaterial({ color: '#f1e4c8', alphaMap: latT, alphaTest: .5, side: THREE.DoubleSide, roughness: .8 });
  for (const [r, y] of [[2.12, 19.6], [1.8, 28.9]]) { const rail = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .95, 32, 1, true), latMat); rail.position.y = y; rail.castShadow = true; MN.add(rail); }
  const capMat = new THREE.MeshPhysicalMaterial({ color: '#1e8f4d', roughness: .38, clearcoat: .5 });
  const cap = M.lathe([[1.0, 34.25], [1.12, 34.6], [.98, 35.4], [.62, 36.2], [.28, 36.9], [.1, 37.4], [.0001, 37.5]], capMat, 24); MN.add(cap);
  const mfin = new THREE.Group(); mfin.position.y = 37.4; MN.add(mfin);
  for (const [r, y] of [[.22, .25], [.16, .7]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), goldMat); s.position.y = y; mfin.add(s); }
  const mcres = cres.clone(); mcres.scale.setScalar(.38); mcres.position.y = 1.25; mcres.rotation.y = .4; mfin.add(mcres);
  M.shadowAll(MN);

  // ---- palm grove (foreground) + a low mudbrick garden wall ----
  const wallMat = MAT.plaster({ a: '#dcbf96', b: '#b8946a', seed: 8, repeat: [12, 1] });
  const gw = new THREE.Mesh(M.rbox(70, 1.5, .6, .25), wallMat); gw.position.set(0, .75, 25.2); gw.castShadow = gw.receiveShadow = true; G.add(gw);
  R.palms = [];
  const palmSpots = [[-8.5, 52, 9.5, .3], [9.5, 49, 8.6, -.25], [-13, 41, 10.5, .2], [13.5, 37, 9.8, -.2], [-6.5, 33, 8.4, .35], [7.5, 30, 9, -.3], [-18, 29.5, 10, .15], [19, 28, 10.6, -.1], [-11, 61, 9.2, .25], [12, 63, 9.6, -.2], [-15.5, 15, 9.4, .2], [16, 14, 10, -.25], [-23, 18, 9, .1], [24, 19, 9.5, -.1], [-2.5, 46, 7.6, .25], [6.2, 40, 8.2, -.3], [-4.2, 21, 9.6, .2], [3.6, 17, 8.8, -.15]];
  palmSpots.forEach(([x, z, h, lean], i) => { const p = M.palm({ height: h, lean: lean * 4, seed: 30 + i, fronds: 18, leafColor: i % 2 ? '#4d7a33' : '#5a8236' }); p.position.set(x, 0, z); p.rotation.y = i * 1.3; p.userData.rz = 0; const dt = p.children[p.children.length - 1]; dt.scale.set(.45, .7, .45); dt.material.color.set('#7a3814'); G.add(p); R.palms.push(p); });

  // ---- distant city fabric (flat-roofed, low) + mountains ----
  const rnd = U.rng(77); const hs = [];
  for (let i = 0; i < 160; i++) { const a = rnd() * Math.PI * 2, r = 70 + rnd() * 170; const x = Math.cos(a) * r, z = Math.sin(a) * r - 20; if (z > 0 && Math.abs(x) < 50) continue; hs.push([x, z, 5 + rnd() * 7, 4 + rnd() * 8, 3 + rnd() * 6]); }
  const houses = new THREE.InstancedMesh(M.rbox(1, 1, 1, .06), MAT.plaster({ a: '#e6cfa8', b: '#c4a37a', seed: 3 }), hs.length);
  hs.forEach(([x, z, w, d, h], i) => { m4.compose(new THREE.Vector3(x, h / 2, z), q.setFromEuler(new THREE.Euler(0, rnd() * .5, 0)), new THREE.Vector3(w, h, d)); houses.setMatrixAt(i, m4); });
  houses.receiveShadow = true; G.add(houses);
  const mt = []; const mi = []; const seg = 160, rad = 430; const f = (a) => 26 + 22 * U.fbm1(a * 4.0, 5, 4) + 14 * Math.max(0, Math.sin(a * 3 + 1));
  for (let i = 0; i <= seg; i++) { const a = i / seg * Math.PI * 2; const h = f(a); mt.push(Math.cos(a) * rad, -2, Math.sin(a) * rad, Math.cos(a) * rad * .96, h, Math.sin(a) * rad * .96); if (i < seg) { const b = i * 2; mi.push(b, b + 1, b + 2, b + 1, b + 3, b + 2); } }
  const mgeo = new THREE.BufferGeometry(); mgeo.setAttribute('position', new THREE.Float32BufferAttribute(mt, 3)); mgeo.setIndex(mi); mgeo.computeVertexNormals();
  G.add(new THREE.Mesh(mgeo, new THREE.MeshBasicMaterial({ color: '#b59a92', side: THREE.DoubleSide })));

  // dawn haze motes drifting through the grove
  G.add(FX.particles({ count: 160, center: [0, 6, 40], box: [30, 12, 30], size: 10, color: '#ffe6c2', opacity: .35, drift: [.12, .05, 0], swirl: .2 }));
}

function archPath(x, cx, by, w, h) { // pointed (ogival) arch, bottom y = by
  const top = by - h, spring = top + w * .62;
  x.beginPath(); x.moveTo(cx - w / 2, by); x.lineTo(cx - w / 2, spring); x.quadraticCurveTo(cx - w / 2, top + w * .12, cx, top);
  x.quadraticCurveTo(cx + w / 2, top + w * .12, cx + w / 2, spring); x.lineTo(cx + w / 2, by); x.closePath();
}

function facadeDraw(x, w, h, emissive) { // 8 m × 12 m tile of the mosque front
  const s = w / 512;
  if (emissive) { x.fillStyle = '#000'; x.fillRect(0, 0, w, h); }
  else {
    x.fillStyle = '#e8d5b2'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(150,120,88,.22)'; x.lineWidth = 2;
    for (let y = 0; y < h; y += 32) { x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); for (let xx = ((y / 32) % 2) * 48; xx < w; xx += 96) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 32); x.stroke(); } }
    x.fillStyle = '#d5c09c'; x.fillRect(0, h - 64, w, 64); x.fillStyle = '#dccaa6'; x.fillRect(0, 34, w, 30);
    x.fillStyle = 'rgba(120,90,60,.25)'; x.fillRect(0, 62, w, 4); x.fillRect(0, h - 66, w, 4);
    x.fillStyle = '#e4d3b2'; x.fillRect(250, 66, 12, h - 130);
  }
  for (const cx of [128, 384]) {
    if (!emissive) { x.fillStyle = '#cdb68e'; archPath(x, cx * s, (h - 92 * s / s), 176 * s, 420 * s); x.fill(); }
    x.fillStyle = emissive ? '#5a3410' : '#3a2a20'; archPath(x, cx * s, h - 104 * s, 140 * s, 392 * s); x.fill();
    if (emissive) { const g = x.createLinearGradient(0, h - 480 * s, 0, h - 104 * s); g.addColorStop(0, 'rgba(255,170,80,.0)'); g.addColorStop(1, 'rgba(255,170,80,.55)'); x.fillStyle = g; archPath(x, cx * s, h - 104 * s, 140 * s, 392 * s); x.fill(); }
    // window grille
    x.strokeStyle = emissive ? '#000' : '#7a6248'; x.lineWidth = 5 * s;
    for (let k = -1; k <= 1; k++) { x.beginPath(); x.moveTo(cx * s + k * 40 * s, h - 104 * s); x.lineTo(cx * s + k * 40 * s, h - 430 * s); x.stroke(); }
    for (let k = 0; k < 6; k++) { const yy = h - 104 * s - k * 60 * s; x.beginPath(); x.moveTo(cx * s - 70 * s, yy); x.lineTo(cx * s + 70 * s, yy); x.stroke(); }
    // upper small window
    x.fillStyle = emissive ? '#000' : '#cdb68e'; archPath(x, cx * s, 230 * s, 96 * s, 130 * s); x.fill();
    x.fillStyle = emissive ? '#3a200a' : '#3a2a20'; archPath(x, cx * s, 222 * s, 70 * s, 112 * s); x.fill();
  }
}

// ------------------------------------------------------------------------------------------------
// SET B: the Hilye-i Şerif panel on a plaster wall in warm window light
function buildHilye(ctx, G) {
  const { MODELS: M, FX, TEX } = ctx; const MAT = M.MAT;
  const wallMat = MAT.plaster({ a: '#dcc3a0', b: '#b99a74', seed: 12, repeat: [4, 3] }); wallMat.normalScale.set(.25, .25);
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
  const key = new THREE.SpotLight('#ffd09a', 120, 18, .36, .75, 2);
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
  const ops = []; for (let i = 0; i < 420; i++) ops.push([rnd() * w, rnd() * h, 5 + Math.pow(rnd(), 1.4) * 17, pal[Math.floor(rnd() * pal.length)]]);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); const im = x.createImageData(w, h); const D = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    let px = i + .5 + Math.sin(j * .045) * 5, py = j + .5 + Math.sin(i * .03) * 3; let col = base, vein = 0;
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

  const ar = (str, cx, cy, maxW, size, color, weight = 700) => {
    x.save(); x.direction = 'rtl'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `${weight} ${size}px Amiri`;
    const mw = x.measureText(str).width; if (mw > maxW) { size = size * maxW / mw; x.font = `${weight} ${size}px Amiri`; }
    x.fillStyle = color; x.fillText(str, cx, cy); x.restore();
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
  ar(words[0], gcx, gcy - 76, 420, 200, C.ink);
  ar(words.slice(1).join(' '), gcx, gcy + 112, 430, 124, C.ink);
  // corner roundels with the four names
  for (const [cx, cy, name] of corners) {
    x.fillStyle = C.gold; x.beginPath(); x.arc(cx, cy, 68, 0, Math.PI * 2); x.fill();
    x.fillStyle = C.lapis; x.beginPath(); x.arc(cx, cy, 62, 0, Math.PI * 2); x.fill();
    x.fillStyle = C.gold; x.beginPath(); x.arc(cx, cy, 55, 0, Math.PI * 2); x.fill();
    x.fillStyle = C.paper; x.beginPath(); x.arc(cx, cy, 51, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.fillStyle = C.gold; x.beginPath(); x.arc(cx + Math.cos(a) * 58.5, cy + Math.sin(a) * 58.5, 2.4, 0, Math.PI * 2); x.fill(); }
    ar(name, cx, cy + 6, 84, 48, C.ink);
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
  ar(AR.ayet, W / 2, ay + ah / 2 + 6, aw - 60, 72, C.gold);

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
