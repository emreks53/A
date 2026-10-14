// s11 (49.25–52.85) "Hem mesela dürüstlükte en yüksek derecede olduğu gibi;"
// Kurzgesagt-style 3D bar chart built from real materials in a sunlit stone courtyard: carved sandstone columns rise from
// a travertine plinth like bars of a chart; one white-marble column with a gilded band — "DÜRÜSTLÜK" (engraved on the
// plinth) — keeps rising past all others and out of frame; the camera cranes and tilts up after it: "en yüksek derece".
import * as THREE from 'three';

let R = {};
const PLAT_Y = .36;           // top of the plinth platform
const XS = [-1.5, -.9, -.3, .3, .9, 1.5];
const HERO = 3;
const SHORT = [.95, 1.3, 1.1, 0, 1.42, 1.18];

function marbleMat(TEX, U, o = {}) {
  const f = TEX.fbmField(o.seed ?? 3, 3, 5), g = TEX.fbmField((o.seed ?? 3) + 11, 6, 3);
  const A = new THREE.Color(o.a ?? '#f4ede2'), B = new THREE.Color(o.b ?? '#b9a385');
  const b = TEX.bake(512, (u, v) => {
    const n = f(u, v), m = g(u, v);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * .9 + v * 1.4 + n * 1.9) * Math.PI * 2)), 14) * .7 + Math.pow(1 - Math.abs(Math.sin((u * 2.3 - v * .8 + m * 1.4) * Math.PI * 2)), 40) * .35;
    const cl = U.smoothstep(.35, .8, .5 + .5 * n) * .22 + U.smoothstep(.4, .9, .5 + .5 * m) * .1; const k = U.clamp(vein * .8 + cl);
    return { c: [U.lerp(A.r, B.r, k), U.lerp(A.g, B.g, k), U.lerp(A.b, B.b, k)].map(x => Math.pow(x, 1 / 2.2)), h: 1 - vein * .2, r: .2 + vein * .2 };
  }, { normalStrength: .6 });
  const rep = o.repeat ?? [1, 1];
  const map = TEX.texFromCanvas(b.colorCanvas, { repeat: rep }), rough = TEX.texFromCanvas(b.roughCanvas, { srgb: false, repeat: rep }), nrm = TEX.texFromCanvas(b.normalCanvas, { srgb: false, repeat: rep });
  return new THREE.MeshPhysicalMaterial({ map, roughnessMap: rough, normalMap: nrm, normalScale: new THREE.Vector2(.08, .08), roughness: 1, clearcoat: .6, clearcoatRoughness: .25 });
}

// column height curves (local time)
function heights(t, ctx) {
  const { U } = ctx; const tD = ctx.wordTime('dürüstlük');
  const hs = SHORT.map((H, i) => { if (i === HERO) return 0; const t0 = .02 + [0, .12, .24, 0, .36, .48][i]; const p = U.clamp((t - t0) / .55); return H * U.ease.outBack(p, 1.6); });
  // hero: rises with the others to ~1.2, a tiny anticipation dip on "dürüstlükte", then soars and settles with a bounce
  const p0 = U.clamp((t - .3) / .55); let h = 1.22 * U.ease.outBack(p0, 1.6);
  const a = t - (tD - .12);
  if (a > 0) {
    const dip = -.05 * Math.sin(Math.PI * U.clamp(a / .16));
    const r = U.clamp((a - .1) / 2.05); const e = r < 1 ? (1 - Math.pow(1 - r, 2.6)) : 1; // fast then decelerate
    const settle = a > 2.15 ? Math.sin((a - 2.15) * 9) * Math.exp(-(a - 2.15) * 5) * .12 : 0;
    h = 1.22 + dip + (11.2 - 1.22) * U.ease.inOutSine(Math.min(1, r * 1.0)) * .15 + (11.2 - 1.22) * .85 * e + settle;
    if (r <= 0) h = 1.22 + dip;
  }
  hs[HERO] = h; return hs;
}

export default {
  post: {
    exposure: 1.05, toneMapping: 'aces',
    bloom: { enabled: true, strength: .32, radius: .5, threshold: .9 },
    grade: { contrast: 1.06, saturation: 1.1, warmth: .03, lift: [.01, .012, .025], gain: [1.02, 1.0, .97] },
    vignette: .38, grain: .03,
    dof: { enabled: true, focus: 7, range: 6, amount: .7 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx; R = {};
    scene.environment = await ctx.loadHDR('kloofendal_48d_partly_cloudy_puresky'); scene.environmentIntensity = .5;
    scene.fog = new THREE.Fog('#e6dccb', 22, 80);
    const sky = ENV.skyDome({ top: '#3d6db4', mid: '#7cb0e4', horizon: '#efdcc0', bottom: '#d9bf98', sunDir: [-.55, .55, .45], sunColor: '#fff0d0', sunSize: 0, sunGlow: .5, clouds: .75, cloudColor: '#fff8f0' });
    scene.add(sky);
    const sun = ENV.sunLight({ color: '#ffe2b4', intensity: 3.1, pos: [-7, 9, 6.5], target: [0, 1.5, 0], size: 9, mapSize: 2048, bias: -.0003, normalBias: .02, radius: 4 });
    scene.add(sun, sun.target); R.sun = sun;
    const rim = new THREE.DirectionalLight('#ffd7a6', 1.6); rim.position.set(6, 5, -7); scene.add(rim);
    scene.add(new THREE.HemisphereLight('#bcd6f5', '#b48c62', .55));

    // courtyard floor: stone flags
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90).rotateX(-Math.PI / 2), M.MAT.stone({ a: '#d9ccb6', b: '#a89880', blocks: 4, repeat: [22, 22], seed: 21 }));
    floor.receiveShadow = true; scene.add(floor);
    // plinth platform (two stepped travertine slabs)
    const trav = M.MAT.stone({ a: '#e3d3b8', b: '#bba182', seed: 33, repeat: [3, 1] });
    const step = new THREE.Mesh(M.rbox(4.3, .14, 1.75, .04), trav); step.position.y = .07; scene.add(step);
    const slab = new THREE.Mesh(M.rbox(4.0, .22, 1.4, .05), trav); slab.position.y = .14 + .11; scene.add(slab);
    // engraved gilt label on the platform front under the hero column
    const lab = TEX.drawTexture(1024, 192, (x, w, h) => {
      x.clearRect(0, 0, w, h); x.font = '700 120px "Cinzel"'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(60,35,15,.75)'; x.fillText('DÜRÜSTLÜK', w / 2 + 3, h / 2 + 5);
      const gr = x.createLinearGradient(0, h * .2, 0, h * .8); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(.5, '#e0aa48'); gr.addColorStop(1, '#a8701e'); x.fillStyle = gr; x.fillText('DÜRÜSTLÜK', w / 2, h / 2);
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.62, .116), new THREE.MeshPhysicalMaterial({ map: lab, transparent: true, metalness: .8, roughness: .3, clearcoat: .4 }));
    plaque.position.set(XS[HERO], .25, .7 + .002); scene.add(plaque); R.plaque = plaque;

    // columns
    const sand = M.MAT.stone({ a: '#e6caa0', b: '#be9a6e', blocks: 2, seed: 12, repeat: [1, 4.4] });
    const sandCap = M.MAT.stone({ a: '#f0d6aa', b: '#cfa775', seed: 14 });
    const marble = marbleMat(TEX, U, { repeat: [1, 4], b: '#9c8b78' });
    const marbleCap = marbleMat(TEX, U, { repeat: [1, 1], seed: 9 });
    const gold = M.MAT.gold();
    const shortGeo = M.rbox(.34, 2.2, .34, .035, 3), heroGeo = M.rbox(.36, 13, .36, .035, 3);
    R.cols = XS.map((x, i) => {
      const hero = i === HERO; const g = new THREE.Group(); g.position.set(x, PLAT_Y, 0); scene.add(g);
      const base = new THREE.Mesh(M.rbox(.48, .1, .48, .025), hero ? marbleCap : sandCap); base.position.y = .05; g.add(base);
      const shaft = new THREE.Mesh(hero ? heroGeo : shortGeo, hero ? marble : sand); g.add(shaft);
      const top = new THREE.Group(); g.add(top);
      const cap = new THREE.Mesh(M.rbox(.46, .1, .46, .025), hero ? marbleCap : sandCap); cap.position.y = .05; top.add(cap);
      const aba = new THREE.Mesh(M.rbox(.52, .06, .52, .02), hero ? marbleCap : sandCap); aba.position.y = .13; top.add(aba);
      if (hero) { const band = new THREE.Mesh(M.rbox(.385, .07, .385, .02), gold); band.position.y = -.08; top.add(band); const band2 = band.clone(); band2.scale.set(.98, .5, .98); band2.position.y = -.17; top.add(band2); }
      M.shadowAll(g);
      return { g, shaft, top, hero, len: hero ? 13 : 2.2 };
    });
    M.shadowAll(step); M.shadowAll(slab); step.castShadow = slab.castShadow = true;

    // distant arcade wall with arches (madrasa courtyard), softened by DOF + fog
    const ws = new THREE.Shape(); const WL = 34, WH = 4.6; ws.moveTo(-WL / 2, 0); ws.lineTo(WL / 2, 0); ws.lineTo(WL / 2, WH); ws.lineTo(-WL / 2, WH); ws.closePath();
    for (let i = -7; i <= 7; i++) { const cx = i * 2.2, hw = .75, hh = 2.6; const hp = new THREE.Path(); hp.moveTo(cx - hw, 0); hp.lineTo(cx - hw, hh); hp.absarc(cx, hh, hw, Math.PI, 0, true); hp.lineTo(cx + hw, 0); hp.lineTo(cx - hw, 0); ws.holes.push(hp); }
    const wallGeo = new THREE.ExtrudeGeometry(ws, { depth: .7, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2, curveSegments: 16 });
    const wall = new THREE.Mesh(wallGeo, M.MAT.plaster({ a: '#f2e6d0', b: '#d9c6a6', seed: 8, repeat: [6, 1] })); wall.position.set(0, 0, -11); M.shadowAll(wall); scene.add(wall);
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.2), new THREE.MeshStandardMaterial({ color: '#8a6e58', roughness: 1 })); backWall.position.set(0, 2.1, -13.2); scene.add(backWall);
    const cornice = new THREE.Mesh(M.rbox(34.4, .3, 1.0, .06), M.MAT.stone({ a: '#efe2c8', b: '#cdb994', seed: 5 })); cornice.position.set(0, WH + .12, -10.65); M.shadowAll(cornice); scene.add(cornice);
    [[-9, -15.5, 7.5, 1], [6.5, -16, 8.5, 4], [12, -14.5, 6.5, 7], [-14, -15, 6.8, 9]].forEach(([x, z, h, s]) => { const p = M.palm({ height: h, seed: s, lean: .3 }); p.position.set(x, 0, z); scene.add(p); });

    // dust puffs where columns grind up out of the plinth
    const ctex = FX.cloudSprite(); R.puffs = [];
    XS.forEach((x, i) => { for (let k = 0; k < 6; k++) { const m = new THREE.SpriteMaterial({ map: ctex, color: '#e2cba5', transparent: true, opacity: 0, depthWrite: false, rotation: k * 1.7 }); const s = new THREE.Sprite(m); s.userData.noDepth = true; scene.add(s); R.puffs.push({ s, i, k, a: k / 6 * Math.PI * 2 + i }); } });
    // soft cumulus far behind the courtyard (parallax during the crane-up)
    const cr = U.rng(5); R.clouds = [];
    for (let i = 0; i < 11; i++) {
      const m = new THREE.SpriteMaterial({ map: ctex, color: new THREE.Color().setHSL(.08, .35, .93 + cr() * .05), transparent: true, opacity: .45 + cr() * .3, depthWrite: false, fog: false, rotation: cr() * 6.28 });
      const sp = new THREE.Sprite(m); const sc = 14 + cr() * 16; sp.scale.set(sc * 1.7, sc, 1);
      sp.position.set(-55 + cr() * 110, 52 + cr() * 40, -70 - cr() * 45); sp.userData.noDepth = true; sp.renderOrder = -10; scene.add(sp); R.clouds.push({ sp, x: sp.position.x, v: .4 + cr() * .5 });
    }
    // sun glint on the gilded band when the column settles
    const gl = TEX.drawTexture(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.15, 'rgba(255,240,200,.7)'); g.addColorStop(1, 'rgba(255,220,150,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,245,220,.9)'; x.fillRect(62, 4, 4, 120); x.fillRect(4, 62, 120, 4); });
    R.glint = new THREE.Sprite(new THREE.SpriteMaterial({ map: gl, color: '#fff2d0', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    R.glint.userData.noDepth = true; R.glint.renderOrder = 30; scene.add(R.glint);
    // sunlit dust motes
    const motes = FX.particles({ count: 160, center: [0, 2.5, 1], box: [7, 5, 5], size: 6, color: '#fff0d0', opacity: .5, drift: [.03, .02, 0], swirl: .1 }); scene.add(motes);

    camera.fov = 38; camera.near = .1; camera.far = 1200; camera.updateProjectionMatrix();
  },
  update(t, ctx) {
    const { ui, U, camera, post } = ctx;
    const hs = heights(t, ctx);
    R.cols.forEach((c, i) => { const h = Math.max(.02, hs[i]); c.shaft.position.y = .1 + h - c.len / 2; c.top.position.y = .1 + h; c.shaft.visible = true; });
    // dust puffs at rise starts
    const tD = ctx.wordTime('dürüstlük');
    R.puffs.forEach(p => {
      const t0 = p.i === HERO ? tD : .02 + [0, .12, .24, 0, .36, .48][p.i]; const a = t - t0 - .02;
      const on = a > 0 && a < 1.1; p.s.visible = on; if (!on) return;
      const r = .2 + a * (p.i === HERO ? .55 : .4); p.s.position.set(XS[p.i] + Math.cos(p.a) * r, PLAT_Y + .08 + a * .18, Math.sin(p.a) * r * .7 + .1);
      p.s.scale.setScalar(.25 + a * .5); p.s.material.opacity = .38 * Math.sin(Math.PI * U.clamp(a / 1.1)) * (p.i === HERO ? 1.2 : .8);
    });
    // camera: low 3/4 view of the chart, slow push; then crane + tilt up following the hero's capital
    const heroTop = PLAT_Y + .1 + hs[HERO] + .16;
    const hx = XS[HERO];
    const k = U.smoothstep(tD - .05, tD + 1.85, t);              // follow weight
    const ang = (U.lerp(U.lerp(27, 19, U.prog(t, -.5, tD, 'inOutSine')), 8, U.ease.inOutSine(k)) - 6 * U.smoothstep(2.4, 4.2, t)) * Math.PI / 180;
    const dist = U.lerp(U.lerp(10.6, 9.4, U.prog(t, -.5, tD + .3, 'inOutSine')), 8.2, U.ease.inOutSine(k)) - .9 * U.smoothstep(2.3, 4.2, t);
    const tgt = new THREE.Vector3(U.lerp(.08, hx, U.ease.inOutSine(U.smoothstep(tD - .3, tD + 1, t))), U.lerp(2.15, heroTop - .3, U.ease.inOutSine(k)), 0);
    // the camera body rises slower than the look target -> tilt up
    const camY = U.lerp(U.lerp(1.95, 1.75, U.prog(t, -.5, tD)), Math.max(1.75, heroTop * .5), U.ease.inOutSine(k));
    const pos = new THREE.Vector3(tgt.x + Math.sin(ang) * dist, camY, Math.cos(ang) * dist).add(U.shake(t, .015, .5, 4));
    camera.position.copy(pos); camera.lookAt(tgt);
    camera.fov = U.lerp(40, 42, U.ease.inOutSine(k)); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    post.dof.focus = pos.distanceTo(new THREE.Vector3(hx, U.lerp(1, heroTop - .5, k), 0)); post.dof.range = 7; post.dof.amount = U.lerp(.6, .3, k);

    R.clouds.forEach(c => { c.sp.position.x = c.x + c.v * t; });
    { const a = t - (tD + 2.05); const hero = R.cols[HERO]; const p = new THREE.Vector3(XS[HERO] - .19, hero.top.position.y + PLAT_Y - .08, .2);
      R.glint.position.copy(p); const o = a > 0 ? Math.sin(Math.PI * U.clamp(a / .7)) : 0; R.glint.material.opacity = o; R.glint.scale.setScalar(.25 + .35 * o); R.glint.material.rotation = a * .8; R.glint.visible = o > .01; }
    // --- typography ---
    const tEn = ctx.wordTime('en'), tYuk = ctx.wordTime('yüksek'), tDer = ctx.wordTime('derece');
    // dashed reference line at the top of the other columns (Kurzgesagt chart guide)
    const maxH = PLAT_Y + .1 + Math.max(...SHORT) + .16;
    const la = ui.project(new THREE.Vector3(XS[0] - .45, maxH, 0)), lb = ui.project(new THREE.Vector3(XS[5] + .45, maxH, 0));
    const ge = ui.env(t, .75, tYuk + .3, .4, 'fade');
    if (ge.o > .001) { const X = ui.ctx; X.save(); X.globalAlpha = ge.o * .85; X.setLineDash([18, 12]); X.lineWidth = 5; X.strokeStyle = '#fff6e6'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 6; X.beginPath(); X.moveTo(la[0], la[1]); X.lineTo(la[0] + (lb[0] - la[0]) * U.ease.outCubic(U.clamp((t - .75) / .5)), la[1] + (lb[1] - la[1]) * U.ease.outCubic(U.clamp((t - .75) / .5))); X.stroke(); X.restore(); }
    ui.text('DÜRÜSTLÜK', { t, t0: tD - .04, x: 540, y: 300, size: 100, weight: 900, color: '#ffcf6b', letterSpacing: 5, anim: 'pop', shadowBlur: 22, shadowColor: 'rgba(30,24,40,.75)', stroke: 'rgba(90,50,20,.5)', strokeW: 9 });
    // callout from the capital: "en yüksek derece"
    const cap = new THREE.Vector3(hx, heroTop - .05, .2);
    ui.callout('en yüksek derece', { t, t0: tEn - .02, anchor: cap, to: [540, 450], size: 50, weight: 800, bg: 'rgba(28,30,52,.72)', color: '#fff4dc', dotColor: '#ffcf6b' });
    ui.underline({ t, t0: tDer, x: 540, y: 500, w: 330, color: 'rgba(255,207,107,.9)', width: 7 });
  },
};
