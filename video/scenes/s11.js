// s11 (49.25–52.85) "Hem mesela dürüstlükte en yüksek derecede olduğu gibi;"
// Kurzgesagt-style 3D bar chart built from real materials in a sunlit stone courtyard: fluted columns of fine carved
// sandstone rise from a travertine plinth like bars of a chart; one white-marble column with a gilded astragal —
// "DÜRÜSTLÜK" (engraved on the plinth) — keeps rising past all others; the camera tilts after its capital (kept below
// the title at all times) in a low-angle push, then pulls back to reveal the whole chart: "en yüksek derece".
// Motion blur is switched on adaptively only for the soar (5 samples at peak speed, 3 otherwise) and the fast reveal.
import * as THREE from 'three';
import { worldBoxUV, fineStoneMat, flutedShaft, palmD } from '../engine/lib/extra_D.js';

let R = {};
const PLAT_Y = .36;           // top of the plinth platform
const XS = [-2, -1.2, -.4, .4, 1.2, 2];
const HERO = 3;
const SHORT = [.95, 1.3, 1.1, 0, 1.42, 1.18];
const HERO_H = 5.9;
const RISE0 = [0, .12, .24, 0, .36, .48];
const CAP_Y = 600;            // screen y where the hero capital is held while the camera follows it

function marbleMat(TEX, U, o = {}) {
  const f = TEX.fbmField(o.seed ?? 3, 3, 5), g = TEX.fbmField((o.seed ?? 3) + 11, 6, 3), q = TEX.fbmField((o.seed ?? 3) + 5, 48, 2);
  const A = new THREE.Color(o.a ?? '#f6f0e6'), B = new THREE.Color(o.b ?? '#a8978a');
  const b = TEX.bake(512, (u, v) => {
    const n = f(u, v), m = g(u, v), gr = q(u, v) * .5 + .5;
    const vein = Math.pow(1 - Math.abs(Math.sin((u * .9 + v * 1.4 + n * 1.9) * Math.PI * 2)), 18) * .6 + Math.pow(1 - Math.abs(Math.sin((u * 2.3 - v * .8 + m * 1.4) * Math.PI * 2)), 46) * .3;
    const cl = U.smoothstep(.35, .8, .5 + .5 * n) * .14 + U.smoothstep(.4, .9, .5 + .5 * m) * .07 + gr * .04; const k = U.clamp(vein * .75 + cl);
    return { c: [U.lerp(A.r, B.r, k), U.lerp(A.g, B.g, k), U.lerp(A.b, B.b, k)].map(x => Math.pow(x, 1 / 2.2)), h: 1 - vein * .2 + gr * .05, r: .22 + vein * .15 + gr * .08 };
  }, { normalStrength: .6 });
  const rep = o.repeat ?? [1, 1];
  const map = TEX.texFromCanvas(b.colorCanvas, { repeat: rep, aniso: 8 }), rough = TEX.texFromCanvas(b.roughCanvas, { srgb: false, repeat: rep }), nrm = TEX.texFromCanvas(b.normalCanvas, { srgb: false, repeat: rep });
  return new THREE.MeshPhysicalMaterial({ map, roughnessMap: rough, normalMap: nrm, normalScale: new THREE.Vector2(.08, .08), roughness: 1, clearcoat: .5, clearcoatRoughness: .3 });
}

// column height curves (local time)
function heights(t, ctx) {
  const { U } = ctx; const tD = ctx.wordTime('dürüstlük');
  const hs = SHORT.map((H, i) => { if (i === HERO) return 0; const p = U.clamp((t - .02 - RISE0[i]) / .55); return H * U.ease.outBack(p, 1.6); });
  // hero: rises with the others to ~1.22, a tiny anticipation dip on "dürüstlükte", then soars and settles with a bounce
  const p0 = U.clamp((t - .3) / .55); let h = 1.22 * U.ease.outBack(p0, 1.6);
  const a = t - (tD - .12);
  if (a > 0) {
    const dip = -.05 * Math.sin(Math.PI * U.clamp(a / .16));
    const r = U.clamp((a - .1) / 1.8); const e = .62 * (1 - Math.pow(1 - r, 2.4)) + .38 * U.ease.inOutSine(r); // quick launch, long glide
    const ease0 = U.smoothstep(0, .14, r);                                // no velocity jump at lift-off
    const settle = a > 1.9 ? Math.sin((a - 1.9) * 9) * Math.exp(-(a - 1.9) * 5) * .08 : 0;
    h = 1.22 + dip + (HERO_H - 1.22) * e * ease0 + settle;
  }
  hs[HERO] = h; return hs;
}

export default {
  post: {
    exposure: 1.0, toneMapping: 'aces',
    bloom: { enabled: true, strength: .3, radius: .5, threshold: .9 },
    grade: { contrast: 1.1, saturation: 1.12, warmth: .025, lift: [.01, .012, .026], gain: [1.02, 1.0, .97] },
    vignette: .36, grain: .03, aberration: .0005,
    dof: { enabled: true, focus: 7, range: 6, amount: .7 },
    motionBlur: { samples: 1, shutter: .5 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx; R = {};
    scene.environment = await ctx.loadHDR('kloofendal_48d_partly_cloudy_puresky'); scene.environmentIntensity = .42;
    scene.fog = new THREE.Fog('#e9dcc6', 26, 95);
    const sky = ENV.skyDome({ top: '#3d6db4', mid: '#7cb0e4', horizon: '#efdcc0', bottom: '#d9bf98', sunDir: [-.55, .55, .45], sunColor: '#fff0d0', sunSize: 0, sunGlow: .5, clouds: .75, cloudColor: '#fff8f0' });
    scene.add(sky);
    const sun = ENV.sunLight({ color: '#ffdcaa', intensity: 4.1, pos: [-7, 10, 9.5], target: [0, 2.5, -2], size: 15, mapSize: 2048, bias: -.0003, normalBias: .025, radius: 4 });
    sun.shadow.camera.top = 13; sun.shadow.camera.bottom = -8; sun.shadow.camera.updateProjectionMatrix();
    scene.add(sun, sun.target); R.sun = sun;
    const rim = new THREE.DirectionalLight('#ffd7a6', 1.6); rim.position.set(6, 5, -7); scene.add(rim);
    scene.add(new THREE.HemisphereLight('#a9c8f0', '#a8825c', .42));

    // courtyard floor: large stone flags
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120).rotateX(-Math.PI / 2), M.MAT.stone({ a: '#d9d0c1', b: '#a3988a', blocks: 4, repeat: [30, 30], seed: 21 }));
    floor.receiveShadow = true; scene.add(floor);
    // plinth platform (two stepped travertine slabs, world-scaled UVs -> no stretched grain)
    const trav = fineStoneMat({ a: '#ecdcbf', b: '#d2bb98', d: '#9c8466', pores: .9, beds: 3, seed: 33, ns: 1.2, repeat: [1, 1] });
    const step = new THREE.Mesh(worldBoxUV(M.rbox(5.6, .14, 1.85, .04), .55), trav); step.position.y = .07; scene.add(step);
    const slab = new THREE.Mesh(worldBoxUV(M.rbox(5.25, .22, 1.5, .05), .55), trav); slab.position.y = .14 + .11; scene.add(slab);
    // engraved gilt label on the platform front under the hero column
    const lab = TEX.drawTexture(1024, 192, (x, w, h) => {
      x.clearRect(0, 0, w, h); x.font = '700 120px "Cinzel"'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = 'rgba(60,35,15,.75)'; x.fillText('DÜRÜSTLÜK', w / 2 + 3, h / 2 + 5);
      const gr = x.createLinearGradient(0, h * .2, 0, h * .8); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(.5, '#e0aa48'); gr.addColorStop(1, '#a8701e'); x.fillStyle = gr; x.fillText('DÜRÜSTLÜK', w / 2, h / 2);
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(.62, .116), new THREE.MeshPhysicalMaterial({ map: lab, transparent: true, metalness: .8, roughness: .3, clearcoat: .4 }));
    plaque.position.set(XS[HERO], .25, .75 + .002); plaque.userData.depthOk = true; scene.add(plaque); R.plaque = plaque;

    // columns: fluted shafts of fine carved sandstone; the hero in veined white marble with a gilded astragal
    const sand = fineStoneMat({ a: '#ebc795', b: '#c99b64', d: '#a87d4e', beds: 9, seed: 12, ns: 1.4, nScale: .2 });
    const sandParts = fineStoneMat({ a: '#efd2a2', b: '#d0a774', beds: 5, seed: 14, ns: 1.3, nScale: .22 });
    const marble = marbleMat(TEX, U, { repeat: [1, 1] });
    const marbleParts = marbleMat(TEX, U, { repeat: [1, 1], seed: 9 });
    const gold = new THREE.MeshPhysicalMaterial({ color: '#f3cf7c', metalness: 1, roughness: .26, clearcoat: .4, clearcoatRoughness: .2 });
    const goldT = TEX.brushedMetal({ a: '#fbe9b8', b: '#dcb86a' }); gold.map = goldT.map; gold.roughnessMap = goldT.roughnessMap; gold.color.set('#ffffff');
    const RS = .2, RH = .26; const shortGeo = flutedShaft(RS, 2.4, { flutes: 20, depth: .07, uvScale: .9 }), heroGeo = flutedShaft(RH, HERO_H + 1.4, { flutes: 24, depth: .065, uvScale: .5 });
    // attic base (square plinth + torus) and Doric capital (astragal, echinus, abacus) as lathe parts
    const lath = (prof, seg = 48) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
    const baseProf = s => [[.001, .06], [.2 * s, .06], [.215 * s, .075], [.228 * s, .1], [.222 * s, .125], [.2 * s, .135], [.19 * s, .15], [.187 * s, .175], [.001, .175]];
    const capProf = s => [[.001, -.02], [.19 * s, -.02], [.2 * s, -.005], [.19 * s, .012], [.182 * s, .02], [.2 * s, .045], [.24 * s, .08], [.265 * s, .1], [.001, .1]];
    R.cols = XS.map((x, i) => {
      const hero = i === HERO; const s = hero ? 1.45 : RS / .165; const g = new THREE.Group(); g.position.set(x, PLAT_Y, 0); scene.add(g);
      const pm = hero ? marbleParts : sandParts;
      const plinth = new THREE.Mesh(worldBoxUV(M.rbox(.5 * s, .065, .5 * s, .02), 1.2), pm); plinth.position.y = .0325; g.add(plinth);
      const base = new THREE.Mesh(worldBoxUV(lath(baseProf(s)), 1.2), pm); g.add(base);
      const shaft = new THREE.Mesh(hero ? heroGeo : shortGeo, hero ? marble : sand); g.add(shaft);
      const top = new THREE.Group(); g.add(top);
      const cap = new THREE.Mesh(worldBoxUV(lath(capProf(s)), 1.2), pm); top.add(cap);
      const aba = new THREE.Mesh(worldBoxUV(M.rbox(.56 * s, .075, .56 * s, .02), 1.2), pm); aba.position.y = .135; top.add(aba);
      if (hero) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(RH + .005, .026, 12, 72), gold); ring.rotation.x = Math.PI / 2; ring.position.y = -.07; top.add(ring);
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(RH, .014, 10, 72), gold); ring2.rotation.x = Math.PI / 2; ring2.position.y = -.115; top.add(ring2);
        const band = new THREE.Mesh(M.rbox(.56 * s + .01, .02, .56 * s + .01, .008), gold); band.position.y = .163; top.add(band);
      }
      M.shadowAll(g);
      return { g, shaft, top, hero, len: hero ? HERO_H + 1.4 : 2.4 };
    });
    M.shadowAll(step); M.shadowAll(slab);

    // distant arcade wall with arches (madrasa courtyard), softened by DOF + fog
    const ws = new THREE.Shape(); const WL = 40, WH = 4.6; ws.moveTo(-WL / 2, 0); ws.lineTo(WL / 2, 0); ws.lineTo(WL / 2, WH); ws.lineTo(-WL / 2, WH); ws.closePath();
    for (let i = -8; i <= 8; i++) { const cx = i * 2.2, hw = .75, hh = 2.6; const hp = new THREE.Path(); hp.moveTo(cx - hw, 0); hp.lineTo(cx - hw, hh); hp.absarc(cx, hh, hw, Math.PI, 0, true); hp.lineTo(cx + hw, 0); hp.lineTo(cx - hw, 0); ws.holes.push(hp); }
    const wallGeo = new THREE.ExtrudeGeometry(ws, { depth: .7, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2, curveSegments: 16 });
    const wall = new THREE.Mesh(wallGeo, M.MAT.plaster({ a: '#f4ebdf', b: '#ddd0bc', seed: 8, repeat: [6, 1] })); wall.position.set(0, 0, -11); M.shadowAll(wall); scene.add(wall);
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(46, 4.2), new THREE.MeshStandardMaterial({ color: '#8a6e58', roughness: 1 })); backWall.position.set(0, 2.1, -13.2); scene.add(backWall);
    const cornice = new THREE.Mesh(M.rbox(40.4, .3, 1.0, .06), M.MAT.stone({ a: '#efe2c8', b: '#cdb994', seed: 5 })); cornice.position.set(0, WH + .12, -10.65); M.shadowAll(cornice); scene.add(cornice);
    // parapet merlons along the cornice (reads as a real building in the wide reveal)
    { const mg = M.rbox(.5, .42, .5, .05); const mm = M.MAT.plaster({ a: '#f0e2c8', b: '#d6c19e', seed: 9 }); const inst = new THREE.InstancedMesh(mg, mm, 34); const m4 = new THREE.Matrix4(); for (let k = 0; k < 34; k++) { m4.makeTranslation(-19.8 + k * 1.2, WH + .48, -10.65); inst.setMatrixAt(k, m4); } inst.castShadow = inst.receiveShadow = true; scene.add(inst); }
    [[-9, -15.5, 7.6, 1, .4], [6.5, -16, 8.4, 4, -2.6], [12, -14.5, 6.6, 7, 3.6], [-14, -15, 6.9, 9, 1.4], [-19, -17, 8.8, 11, 2]].forEach(([x, z, h, s, la]) => { const p = palmD({ height: h, seed: s, lean: .5, leanAz: la }); p.position.set(x, 0, z); p.rotation.y = s; scene.add(p); });

    // dust puffs where columns grind up out of their bases
    const ctex = FX.cloudSprite(); R.puffs = [];
    XS.forEach((x, i) => { for (let k = 0; k < 6; k++) { const m = new THREE.SpriteMaterial({ map: ctex, color: '#e2cba5', transparent: true, opacity: 0, depthWrite: false, rotation: k * 1.7 }); const s = new THREE.Sprite(m); s.userData.noDepth = true; scene.add(s); R.puffs.push({ s, i, k, a: k / 6 * Math.PI * 2 + i }); } });
    // soft cumulus far behind the courtyard (parallax during the crane-up)
    const cr = U.rng(5); R.clouds = [];
    for (let i = 0; i < 13; i++) {
      const m = new THREE.SpriteMaterial({ map: ctex, color: new THREE.Color().setHSL(.08, .35, .93 + cr() * .05), transparent: true, opacity: .45 + cr() * .3, depthWrite: false, fog: false, rotation: cr() * 6.28 });
      const sp = new THREE.Sprite(m); const sc = 14 + cr() * 16; sp.scale.set(sc * 1.7, sc, 1);
      sp.position.set(-60 + cr() * 120, 40 + cr() * 55, -70 - cr() * 45); sp.userData.noDepth = true; sp.renderOrder = -10; scene.add(sp); R.clouds.push({ sp, x: sp.position.x, v: .4 + cr() * .5 });
    }
    // sun glint on the gilded astragal when the column settles
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
    R.cols.forEach((c, i) => { const h = Math.max(.02, hs[i]); c.shaft.position.y = .17 + h - c.len; c.top.position.y = .17 + h; });
    const tD = ctx.wordTime('dürüstlük');
    // dust puffs at rise starts
    R.puffs.forEach(p => {
      const t0 = p.i === HERO ? tD : .02 + RISE0[p.i]; const a = t - t0 - .02;
      const on = a > 0 && a < 1.1; p.s.visible = on; if (!on) return;
      const r = .2 + a * (p.i === HERO ? .55 : .4); p.s.position.set(XS[p.i] + Math.cos(p.a) * r, PLAT_Y + .12 + a * .18, Math.sin(p.a) * r * .7 + .1);
      p.s.scale.setScalar(.25 + a * .5); p.s.material.opacity = .38 * Math.sin(Math.PI * U.clamp(a / 1.1)) * (p.i === HERO ? 1.2 : .8);
    });
    // ---- camera ----
    // A: 3/4 view of the whole chart with a slow push. B: on "dürüstlükte" the camera tilts after the soaring hero capital,
    // which is held at screen y = CAP_Y (always below the title / callout), while dollying in low so the column towers.
    // C: on "derecede" it pulls back + up to reveal the complete chart (all bars above the subtitle band).
    const hx = XS[HERO]; const heroTop = PLAT_Y + .17 + hs[HERO] + .2;
    const k = U.smoothstep(tD - .05, tD + 1.7, t);                  // follow weight
    const kr = U.smoothstep(2.1, 4.05, t);                           // reveal (pull back) weight
    const ang = (U.lerp(U.lerp(27, 19, U.prog(t, -.5, tD, 'inOutSine')), 9, U.ease.inOutSine(k)) - 5 * kr - .9 * t) * Math.PI / 180;
    // B is a low-angle push (the column towers and the others drop out of frame), C pulls back + up to the full chart
    const dist = U.lerp(12.8, 11.5, U.prog(t, -.5, tD + .3, 'inOutSine')) - 3.0 * U.ease.inOutSine(k) + 13.6 * kr + .25 * t;
    const camY = U.lerp(1.95, 1.75, U.prog(t, -.5, tD)) - .4 * U.ease.inOutSine(k) + 3.3 * kr;
    const tx = U.lerp(.08, hx, U.ease.inOutSine(U.smoothstep(tD - .3, tD + 1, t)));
    const pos = new THREE.Vector3(tx + Math.sin(ang) * dist, camY, Math.cos(ang) * dist).add(U.shake(t, .012, .5, 4));
    camera.position.copy(pos);
    camera.fov = U.lerp(40, 41, U.ease.inOutSine(k)); camera.updateProjectionMatrix();
    const capV = new THREE.Vector3(hx, heroTop, 0);
    const screenY = ly => { camera.lookAt(tx, ly, 0); camera.updateMatrixWorld(); return ui.project(capV)[1]; };
    const lyA = 1.55 + .02 * Math.sin(t * .7);                       // phase-A framing
    const ysA = screenY(lyA);
    const w = U.smoothstep(tD, tD + .55, t);                         // hand-over to the capital lock
    const want = Math.max(CAP_Y, U.lerp(ysA, CAP_Y, w));
    let ly = lyA;
    if (w > 0 || ysA < CAP_Y) { // solve look height so the capital sits at `want` (screen y is monotonic in ly)
      let lo = -10, hi = heroTop + 30; for (let it = 0; it < 26; it++) { const mid = (lo + hi) / 2; if (screenY(mid) > want) hi = mid; else lo = mid; } ly = (lo + hi) / 2;
    }
    camera.lookAt(tx, ly, 0); camera.updateMatrixWorld();
    post.dof.focus = pos.distanceTo(new THREE.Vector3(hx, U.lerp(1, heroTop - 1, k), 0)); post.dof.range = U.lerp(7, 12, kr); post.dof.amount = U.lerp(.6, .3, k);
    // motion blur only while the column soars and the camera whips up after it
    post.motionBlur.samples = (t > tD + .03 && t < tD + .8) ? 5 : ((t > tD - .05 && t < tD + 1.4) || (t > 2.55 && t < 3.6)) ? 3 : 1;

    R.clouds.forEach(c => { c.sp.position.x = c.x + c.v * t; });
    { const a = t - (tD + 1.8); const hero = R.cols[HERO]; const p = new THREE.Vector3(XS[HERO] - .2, hero.top.position.y + PLAT_Y - .07, .12);
      R.glint.position.copy(p); const o = a > 0 ? Math.sin(Math.PI * U.clamp(a / .7)) : 0; R.glint.material.opacity = o; R.glint.scale.setScalar(.25 + .35 * o); R.glint.material.rotation = a * .8; R.glint.visible = o > .01; }
    // --- typography ---
    const tEn = ctx.wordTime('en'), tYuk = ctx.wordTime('yüksek'), tDer = ctx.wordTime('derece');
    // dashed reference line at the top of the other columns (Kurzgesagt chart guide), visible whenever it is on screen
    const maxH = PLAT_Y + .17 + Math.max(...SHORT) + .2;
    const la = ui.project(new THREE.Vector3(XS[0] - .45, maxH, 0)), lb = ui.project(new THREE.Vector3(XS[5] + .45, maxH, 0));
    const ge = ui.env(t, .75, Infinity, .4, 'fade');
    const onScr = U.smoothstep(1880, 1700, Math.max(la[1], lb[1]));
    if (ge.o * onScr > .001) { const X = ui.ctx; const pp = U.ease.outCubic(U.clamp((t - .75) / .5)); X.save(); X.globalAlpha = ge.o * onScr * .85; X.setLineDash([18, 12]); X.lineWidth = 5; X.strokeStyle = '#fff6e6'; X.shadowColor = 'rgba(0,0,0,.35)'; X.shadowBlur = 6; X.beginPath(); X.moveTo(la[0], la[1]); X.lineTo(la[0] + (lb[0] - la[0]) * pp, la[1] + (lb[1] - la[1]) * pp); X.stroke(); X.restore(); }
    ui.text('DÜRÜSTLÜK', { t, t0: tD - .04, x: 540, y: 300, size: 100, weight: 900, color: '#ffcf6b', letterSpacing: 5, anim: 'pop', shadowBlur: 22, shadowColor: 'rgba(30,24,40,.75)', stroke: 'rgba(90,50,20,.5)', strokeW: 9 });
    // callout from the capital: "en yüksek derece"; on "derece" the anchor pulses (a ring) — lands on the words
    const cap = new THREE.Vector3(hx, heroTop + .02, .2);
    ui.callout('en yüksek derece', { t, t0: tEn - .02, anchor: cap, to: [540, 455], size: 50, weight: 800, bg: 'rgba(28,30,52,.74)', color: '#fff4dc', dotColor: '#ffcf6b' });
    { const a = t - tDer; if (a > 0 && a < .9) { const [cx, cy] = ui.project(cap); const X = ui.ctx; X.save(); X.globalAlpha = (1 - a / .9) * .9; X.strokeStyle = '#ffcf6b'; X.lineWidth = 5; X.beginPath(); X.arc(cx, cy, 12 + 60 * U.ease.outCubic(a / .9), 0, Math.PI * 2); X.stroke(); X.restore(); } }
  },
};
