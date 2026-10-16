// s20 (113.30–125.65) "Bu tatlı hakikatten Mektubat kitabının 195. sayfasında ve 19. Söz gibi başka risalelerde çok hoş ve
// etraflıca bahsedilmiştir."  — closing scene of the film (1 s hold after the last word, then the 0.9 s fade to black).
// Visual: a quiet Turkish room at morning. Sun through a window with tulle curtains (gentle breeze), dust in the beam.
// On a low walnut table: a rahle with the deep-red, gold-stamped "MEKTUBAT" (closed, front cover up). On "kitabının"
// the front cover swings open, a few leaves riffle over and the book settles on pages 194 | 195. The camera drops to
// the table front (rose) and pans right to the matching red "SÖZLER" lying beside it, its green satin ribbon bookmark
// tagged "19. Söz"; on "başka risalelerde" it slides back left past the tea glass and rises to the uniform red set of
// other Risale volumes on the sunlit sill, then pulls back into a calm wide still life (tea glass with steam, rose)
// and the end card.
import * as THREE from 'three';
import { path3, path1, beamMotes, plankTex, contactShadows, grainWood, foilLeather, foilMaterial, drawRisaleCover, drawRisaleSpine } from '../engine/lib/extra_H.js';

let R = {};
const TABLE_Y = .42;
const BW = .15, BH = .215, TAU = .0145;          // Mektubat: page width, height, half block thickness
const ALPHA = Math.PI / 2 - 1.1;                   // rahle arm angle above horizontal
const WALL_Z = -.52;
const RED = '#7e1117', RED_D = '#4c070b';

const lrng = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
const tex = (TEX, w, h, f) => { const t = TEX.drawTexture(w, h, f); t.anisotropy = 8; return t; };

async function loadFonts() {
  const list = [['Playfair Display', 'assets/fonts/PlayfairDisplayItalic-600.ttf', { style: 'italic', weight: '600' }],
    ['Cormorant Garamond', 'assets/fonts/CormorantGaramond-700.ttf', { weight: '700' }], ['Cormorant Garamond', 'assets/fonts/CormorantGaramond-600.ttf', { weight: '600' }]];
  await Promise.all(list.map(async ([fam, url, d]) => { try { const f = new FontFace(fam, `url(${url})`, d); await f.load(); document.fonts.add(f); } catch (e) { console.warn('font load failed', url); } }));
}

// ---------- page artwork: cream paper, double-rule frame (cetvel), page number, grey line strokes (not readable) ----------
function drawRisalePage(x, W, H, { num = null, side = 'R', seed = 1, para = [5, 15], gap = [] } = {}) {
  const Rr = lrng(seed * 977 + 13);
  x.fillStyle = '#f3e9d1'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) { x.fillStyle = `rgba(165,125,75,${Rr() * .028})`; x.beginPath(); x.arc(Rr() * W, Rr() * H, 1 + Rr() * W * .045, 0, 7); x.fill(); }
  const fx0 = W * (side === 'R' ? .135 : .085), fx1 = W * (side === 'R' ? .915 : .865), fy0 = H * .1, fy1 = H * .935;
  x.strokeStyle = 'rgba(130,44,36,.6)'; x.lineWidth = W * .0048; x.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
  x.lineWidth = W * .0019; const d = W * .013; x.strokeRect(fx0 + d, fy0 + d, fx1 - fx0 - 2 * d, fy1 - fy0 - 2 * d);
  // page number centred in the head margin, flanked by two short rules
  const cxp = (fx0 + fx1) / 2;
  if (num) { x.fillStyle = 'rgba(52,36,28,.96)'; x.font = `700 ${W * .074}px "Playfair Display"`; x.textBaseline = 'alphabetic'; x.textAlign = 'center'; x.fillText(num, cxp, fy0 - H * .02);
    x.fillStyle = 'rgba(130,44,36,.55)'; for (const sgn of [-1, 1]) x.fillRect(cxp + sgn * W * .1 - (sgn < 0 ? W * .12 : 0), fy0 - H * .036, W * .12, W * .003); }
  // body text as subtle grey line strokes (one stroke per word, thin) — not readable
  const tx0 = fx0 + W * .05, tx1 = fx1 - W * .05, ty0 = fy0 + H * .034, ty1 = fy1 - H * .028, n = 31, lh = (ty1 - ty0) / n;
  x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    if (gap.includes(i)) continue;
    const y = ty0 + lh * (i + .55), isP = para.includes(i), endS = para.includes(i + 1) || i === n - 1;
    let xx = tx0 + (isP ? W * .05 : 0); const xe = tx1 - (endS ? (tx1 - tx0) * (.25 + Rr() * .45) : 0);
    while (xx < xe - 3) { const wl = Math.min(xe - xx, W * (.012 + Rr() * Rr() * .07 + Rr() * .015)); x.strokeStyle = `rgba(78,70,64,${.36 + Rr() * .12})`; x.lineWidth = lh * (.2 + Rr() * .04); x.beginPath(); x.moveTo(xx + 2, y); x.lineTo(xx + wl - 2, y); x.stroke(); xx += wl + W * .0085; }
  }
  const gx = side === 'R' ? 0 : W; const g = x.createLinearGradient(gx, 0, side === 'R' ? W * .22 : W * .78, 0);
  g.addColorStop(0, 'rgba(85,52,26,.42)'); g.addColorStop(.35, 'rgba(85,52,26,.12)'); g.addColorStop(1, 'rgba(85,52,26,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  const ge = x.createLinearGradient(side === 'R' ? W : 0, 0, side === 'R' ? W * .9 : W * .1, 0); ge.addColorStop(0, 'rgba(120,90,50,.12)'); ge.addColorStop(1, 'rgba(120,90,50,0)'); x.fillStyle = ge; x.fillRect(0, 0, W, H);
}
// page-surface profile of an open book: dips into the gutter (u=0), rises, then falls gently to the fore-edge (u=1)
const yTop = u => u < 0 ? -.0072 + u * .07 : .0044 * Math.pow(Math.sin(Math.PI * Math.min(1, Math.pow(u, .7) * 1.04)), .65) - .0072 * Math.exp(-u / .045);
const U0 = -.05; // page surfaces run slightly past the hinge so the two halves close the gutter valley

// strip grid (N along u, NZ along z) with right-handed winding; flip=true reverses it
function stripGeo(N, NZ, flip) {
  const g = new THREE.BufferGeometry(); const pos = new Float32Array((N + 1) * (NZ + 1) * 3), uv = new Float32Array((N + 1) * (NZ + 1) * 2), idx = [];
  for (let j = 0; j < NZ; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, d = c + 1; if (!flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}

export default {
  post: {
    exposure: 1.06,
    toneMapping: 'aces',
    bloom: { enabled: true, strength: 0.3, radius: 0.65, threshold: 0.93 },
    grade: { contrast: 1.08, saturation: 1.07, warmth: 0.03, lift: [0.018, 0.014, 0.012], gain: [1.02, 1.0, 0.96] },
    vignette: 0.3, grain: 0.022,
    dof: { enabled: true, focus: .6, range: .5, amount: .7 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, FX, TEX } = ctx;
    R = {};
    await loadFonts();
    scene.background = new THREE.Color('#e8d8bf');
    scene.environment = await ctx.loadHDR('kiara_interior'); scene.environmentIntensity = 0.42;
    const hemi = new THREE.HemisphereLight('#e4ebff', '#a07a52', 0.42); scene.add(hemi);
    const sun = new THREE.DirectionalLight('#ffe2b4', 3.15); sun.position.set(-1.25, 2.35, -2.3); sun.target.position.set(.05, TABLE_Y, 0);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -1.1; sc.right = 1.1; sc.top = 1.25; sc.bottom = -1.25; sc.near = .5; sc.far = 6; sun.shadow.bias = -.00025; sun.shadow.normalBias = .008; sun.shadow.radius = 5;
    scene.add(sun, sun.target); R.sun = sun;
    const fill = new THREE.PointLight('#ffe6c8', 1.3, 4, 1.5); fill.position.set(.55, 1.15, 1.35); scene.add(fill);
    // soft frontal kicker so the gold foil catches light toward the lens
    const kick = new THREE.PointLight('#fff1d8', 1.1, 2.6, 1.6); kick.position.set(.15, 1.3, .9); scene.add(kick); R.kick = kick;

    // ---------- room ----------
    const wallTex = TEX.plaster({ a: '#e6d6ba', b: '#cfb994', seed: 9, repeat: [2, 2] });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex.map, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.4, .4), roughness: .95 });
    const wshape = new THREE.Shape(); wshape.moveTo(-2.5, 0); wshape.lineTo(2.5, 0); wshape.lineTo(2.5, 2.8); wshape.lineTo(-2.5, 2.8); wshape.closePath();
    const WX0 = -.82, WX1 = .32, WY0 = .78, WY1 = 2.02;
    const hole = new THREE.Path(); hole.moveTo(WX0, WY0); hole.lineTo(WX0, WY1); hole.lineTo(WX1, WY1); hole.lineTo(WX1, WY0); hole.closePath(); wshape.holes.push(hole);
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(wshape), wallMat); wall.position.z = WALL_Z; wall.receiveShadow = true; scene.add(wall);
    // window reveal (wall thickness) so the opening has depth
    const reveal = new THREE.MeshStandardMaterial({ color: '#eadcc2', roughness: .95 });
    for (const [w, h, x0, y0] of [[.02, WY1 - WY0, WX0, (WY0 + WY1) / 2], [.02, WY1 - WY0, WX1, (WY0 + WY1) / 2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, .22), reveal); m.position.set(x0 + (x0 < 0 ? -.01 : .01), y0, WALL_Z - .11); m.receiveShadow = true; scene.add(m); }
    { const m = new THREE.Mesh(new THREE.BoxGeometry(WX1 - WX0 + .04, .02, .22), reveal); m.position.set((WX0 + WX1) / 2, WY1 + .01, WALL_Z - .11); scene.add(m); }
    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), wallMat); sideWall.rotation.y = Math.PI / 2; sideWall.position.set(-1.45, 1.4, 1.2); sideWall.receiveShadow = true; scene.add(sideWall);
    const frameMat = new THREE.MeshPhysicalMaterial({ color: '#f1e9da', roughness: .45, clearcoat: .3, clearcoatRoughness: .4 });
    const fw = .06, wcx = (WX0 + WX1) / 2, ww = WX1 - WX0, wh = WY1 - WY0;
    const addF = (w, h, d, x, y, z, parent = scene) => { const m = new THREE.Mesh(M.rbox(w, h, d, .01), frameMat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    addF(ww + .1, fw, .14, wcx, WY1 + fw / 2 - .01, WALL_Z); addF(fw, wh + .1, .14, WX0 - fw / 2 + .01, (WY0 + WY1) / 2, WALL_Z); addF(fw, wh + .1, .14, WX1 + fw / 2 - .01, (WY0 + WY1) / 2, WALL_Z);
    const sillMat = grainWood({ a: '#a06a3c', b: '#714524', seed: 41, streaks: 120, clearcoat: 0, roughness: .45 });
    const sill = new THREE.Mesh(M.rbox(ww + .22, .04, .27, .012), sillMat); sill.position.set(wcx, WY0 - .02, WALL_Z + .06); sill.castShadow = sill.receiveShadow = true; scene.add(sill);
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .08, roughness: .05, metalness: 0, envMapIntensity: 1.2, depthWrite: false });
    const cas = (open, hingeX, sign) => {
      const g = new THREE.Group(); g.position.set(hingeX, WY0, WALL_Z - .02); const cw = ww / 2 - .01;
      addF(cw, .045, .04, sign * cw / 2, .02, 0, g); addF(cw, .045, .04, sign * cw / 2, wh - .02, 0, g); addF(.045, wh, .04, sign * .02, wh / 2, 0, g); addF(.045, wh, .04, sign * (cw - .02), wh / 2, 0, g); addF(cw, .035, .035, sign * cw / 2, wh * .62, 0, g);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(cw - .06, wh - .06), glassMat); gl.position.set(sign * cw / 2, wh / 2, 0); g.add(gl);
      g.rotation.y = open; scene.add(g); return g;
    };
    cas(0, WX1, -1);
    R.casement = cas(-1.05, WX0, 1);
    // outside: soft morning garden (out of focus)
    const outTex = tex(TEX, 512, 512, (x, W, H) => {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#a3c8ec'); g.addColorStop(.45, '#dfeaf1'); g.addColorStop(1, '#fbeedb'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const Rr = lrng(3);
      for (let i = 0; i < 60; i++) { const cx = W * (.55 + Rr() * .55), cy = H * (.38 + Rr() * .32), r = W * (.04 + Rr() * .09); x.fillStyle = `rgba(${110 + Rr() * 40},${145 + Rr() * 30},${100 + Rr() * 20},${.3 + Rr() * .25})`; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
      for (let i = 0; i < 4; i++) { const cx = W * (.05 + i * .1 + Rr() * .05); x.fillStyle = 'rgba(95,125,95,.28)'; x.beginPath(); x.ellipse(cx, H * .62, W * .025, H * .16, 0, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(150,170,150,.35)'; x.beginPath(); x.moveTo(0, H * .78); x.quadraticCurveTo(W * .3, H * .68, W * .6, H * .76); x.lineTo(W, H * .74); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      const s = x.createRadialGradient(W * .2, H * .28, 0, W * .2, H * .28, W * .65); s.addColorStop(0, 'rgba(255,250,232,1)'); s.addColorStop(.3, 'rgba(255,240,205,.75)'); s.addColorStop(1, 'rgba(255,236,200,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
    });
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ map: outTex, color: new THREE.Color(1.12, 1.1, 1.06) }));
    outside.position.set(-.3, 1.5, WALL_Z - 1.8); outside.userData.depthOk = true; scene.add(outside);
    // tulle curtains (pleated sheer; breeze)
    const curtTex = tex(TEX, 256, 512, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(205,195,175,.3)'; x.lineWidth = 1; for (let i = 0; i < W; i += 5) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += 5) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } x.fillStyle = 'rgba(232,222,204,.55)'; x.fillRect(0, H - 26, W, 26); x.fillStyle = 'rgba(232,222,204,.35)'; x.fillRect(0, H - 34, W, 3); });
    curtTex.wrapS = THREE.RepeatWrapping; curtTex.repeat.x = 2;
    const curtMat = new THREE.MeshStandardMaterial({ map: curtTex, color: '#fffaf0', transparent: true, opacity: .52, side: THREE.DoubleSide, roughness: .9, emissive: '#fff0d6', emissiveIntensity: .36, depthWrite: false });
    R.curtains = [];
    const CH = 1.42, CZ = WALL_Z + .2;
    for (const [x0, w, ph, pleats] of [[WX0 - .22, .44, 0, 8], [WX1 - .05, .38, 1.7, 7]]) {
      const geo = new THREE.PlaneGeometry(w, CH, 48, 16); const base = geo.attributes.position.array.slice();
      const m = new THREE.Mesh(geo, curtMat); m.position.set(x0 + w / 2, WY1 + .2 - CH / 2, CZ); m.renderOrder = 6; m.userData.noDepth = true; scene.add(m);
      R.curtains.push({ m, base, w, ph, pleats });
    }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, ww + .7, 12).rotateZ(Math.PI / 2), M.MAT.brass()); rod.position.set(wcx, WY1 + .2, CZ); scene.add(rod);
    for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.SphereGeometry(.022, 16, 12), M.MAT.brass()); f.position.set(wcx + s * (ww / 2 + .36), WY1 + .2, CZ); scene.add(f); }
    // floor + kilim
    const ftex = plankTex({ a: '#8a5a34', b: '#5e3a1e', planks: 8, seed: 12 }); ftex.repeat.set(3, 3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ftex, roughness: .55 })); floor.position.set(0, 0, 1.5); floor.receiveShadow = true; scene.add(floor);
    const kilim = tex(TEX, 1024, 1024, (x, W, H) => {
      x.fillStyle = '#6a2a22'; x.fillRect(0, 0, W, H); x.fillStyle = '#c6a57a'; x.fillRect(16, 16, W - 32, H - 32); x.fillStyle = '#7a3026'; x.fillRect(30, 30, W - 60, H - 60);
      x.fillStyle = '#2f3d5a'; x.fillRect(70, 70, W - 140, H - 140); x.fillStyle = '#8a3a2c'; x.fillRect(90, 90, W - 180, H - 180);
      for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const cx = 140 + i * 93, cy = 140 + j * 93; x.fillStyle = (i + j) % 2 ? 'rgba(214,180,130,.55)' : 'rgba(40,52,82,.5)'; x.beginPath(); x.moveTo(cx, cy - 30); x.lineTo(cx + 30, cy); x.lineTo(cx, cy + 30); x.lineTo(cx - 30, cy); x.closePath(); x.fill(); x.fillStyle = 'rgba(240,220,180,.5)'; x.beginPath(); x.moveTo(cx, cy - 9); x.lineTo(cx + 9, cy); x.lineTo(cx, cy + 9); x.lineTo(cx - 9, cy); x.closePath(); x.fill(); }
      for (let i = 0; i < 20000; i++) { const Rr = (i * 7919 % 1000) / 1000, Rq = (i * 104729 % 997) / 997; x.fillStyle = `rgba(0,0,0,${.04})`; x.fillRect(Rr * W, Rq * H, 2, 1); }
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: kilim, roughness: 1 })); rug.position.set(0, .004, .25); rug.receiveShadow = true; scene.add(rug);

    // ---------- low walnut table + linen runner ----------
    const walnut = grainWood({ a: '#7f4f2c', b: '#68401f', seed: 51, streaks: 260, clearcoat: 0, roughness: .36 });
    const table = new THREE.Group(); scene.add(table);
    const top = new THREE.Mesh(M.rbox(1.12, .036, .62, .012), walnut); top.position.y = TABLE_Y - .018; table.add(top);
    const apron = new THREE.Mesh(M.rbox(1.0, .06, .5, .01), walnut); apron.position.y = TABLE_Y - .065; table.add(apron);
    const legGeo = new THREE.LatheGeometry([[0, 0], [.024, 0], [.03, .04], [.02, .12], [.028, .22], [.02, .3], [.026, .36], [0, .36]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 16);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(legGeo, walnut); l.position.set(sx * .5, 0, sz * .25); table.add(l); }
    M.shadowAll(table);
    const runnerTex = tex(TEX, 1024, 512, (x, W, H) => {
      x.clearRect(0, 0, W, H); x.fillStyle = '#f5efe2'; x.fillRect(0, 18, W, H - 36);
      for (let i = 0; i < W; i += 4) { x.fillStyle = `rgba(190,170,140,${.06 + (i % 12 === 0 ? .05 : 0)})`; x.fillRect(i, 18, 1, H - 36); } for (let j = 18; j < H - 18; j += 4) { x.fillStyle = 'rgba(190,170,140,.06)'; x.fillRect(0, j, W, 1); }
      // drawn-thread border + small embroidered lozenges
      x.strokeStyle = 'rgba(185,160,120,.55)'; x.lineWidth = 2; x.strokeRect(34, 40, W - 68, H - 80); x.strokeRect(42, 48, W - 84, H - 96);
      x.fillStyle = 'rgba(176,64,52,.45)'; for (let i = 70; i < W - 60; i += 34) { for (const y of [64, H - 64]) { x.beginPath(); x.moveTo(i, y - 6); x.lineTo(i + 6, y); x.lineTo(i, y + 6); x.lineTo(i - 6, y); x.closePath(); x.fill(); } }
      x.fillStyle = 'rgba(200,180,150,.5)'; for (let i = 0; i < W; i += 5) { x.fillRect(i, 22, 2, 3); x.fillRect(i + 2, H - 25, 2, 3); }
    });
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(.98, .5).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: runnerTex, transparent: true, alphaTest: .5, roughness: .95 }));
    runner.position.set(-.02, TABLE_Y + .0012, -.02); runner.receiveShadow = true; scene.add(runner);

    // ---------- shared book materials ----------
    const leatherTile = foilLeather({ W: 512, H: 512, base: RED, dark: RED_D, seed: 3, repeat: [4, 5.6], grainPx: 512 / 4 });
    const leather = foilMaterial(leatherTile, { normalScale: .9 });
    const edgeTex = tex(TEX, 128, 128, (x, W, H) => { x.fillStyle = '#e3d5b6'; x.fillRect(0, 0, W, H); for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(140,106,66,${.12 + ((i * 7) % 10 === 0 ? .12 : 0)})`; x.fillRect(0, i, W, 1); } });
    edgeTex.wrapS = edgeTex.wrapT = THREE.RepeatWrapping; edgeTex.repeat.set(1, 3);
    const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: .92 });
    const edgeMatDS = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: .92, side: THREE.DoubleSide });
    const coverMaps = t => foilLeather({ W: 1024, H: 1468, draw: (x, W, H) => drawRisaleCover(x, W, H, { title: t }), base: RED, dark: RED_D, seed: t.length, grainPx: 230 });
    const spineMaps = (title, w, seed) => foilLeather({ W: 192, H: 1024, draw: (x, W, H) => drawRisaleSpine(x, W, H, { title, family: 'Cormorant Garamond' }), base: RED, dark: RED_D, seed, grainPx: 156, blur: 1.1, deboss: 1.6 });

    // ---------- rahle + MEKTUBAT (animated opening) ----------
    const rahle = M.rahle({ length: .42, width: .25, angle: 1.1, material: grainWood({ a: '#9c673a', b: '#7f4f2b', seed: 61, streaks: 320, repeat: [1.6, 1.6], clearcoat: .55, roughness: .38 }) });
    rahle.rotation.y = Math.PI / 2; rahle.position.set(-.1, TABLE_Y, -.07); scene.add(rahle);
    const hingeY = TABLE_Y + rahle.userData.crossY + (.010 + TAU + .0034) / Math.cos(ALPHA) + .0008;
    const bookRoot = new THREE.Group(); bookRoot.position.set(-.1, hingeY, -.07); scene.add(bookRoot); R.bookRoot = bookRoot;
    const pageT = (num, side, seed, o) => tex(TEX, 768, 1100, (x, W, H) => drawRisalePage(x, W, H, { num, side, seed, ...o }));
    const mkHalf = (sign, map, cover) => {
      const g = new THREE.Group();
      const board = new THREE.Mesh(M.rbox(BW + .007, .0032, BH + .009, .0013, 2), leather); board.position.set(sign * (BW / 2 + .0015), -TAU - .0016, 0); g.add(board);
      const N = 30, NZ = 3;
      const topG = stripGeo(N, NZ, sign > 0); const uvA = topG.attributes.uv;
      for (let j = 0; j <= NZ; j++) for (let i = 0; i <= N; i++) { const k = j * (N + 1) + i, uu = Math.max(0, U0 + (1 - U0) * i / N); uvA.setXY(k, sign > 0 ? uu : 1 - uu, j / NZ); }
      const topM = new THREE.Mesh(topG, new THREE.MeshStandardMaterial({ map, roughness: .88 })); g.add(topM);
      const walls = stripGeo(N, 1, sign > 0); const wallU = walls.attributes.uv; for (let j = 0; j <= 1; j++) for (let i = 0; i <= N; i++) wallU.setXY(j * (N + 1) + i, i / N * 2, j * .35);
      const head = new THREE.Mesh(walls, edgeMatDS), tail = new THREE.Mesh(walls.clone(), edgeMatDS); g.add(head, tail);
      const fore = new THREE.Mesh(new THREE.PlaneGeometry(BH - .001, TAU).rotateY(sign * Math.PI / 2), edgeMat); fore.position.set(sign * BW, -TAU / 2, 0); g.add(fore);
      if (cover) { const cg = new THREE.PlaneGeometry(BW + .0056, BH + .0076).rotateX(Math.PI / 2).rotateY(Math.PI); const cm = new THREE.Mesh(cg, foilMaterial(cover)); cm.material.polygonOffset = true; cm.material.polygonOffsetFactor = -2; cm.material.polygonOffsetUnits = -2; cm.position.set(sign * (BW / 2 + .0015), -TAU - .0033, 0); g.add(cm); }
      M.shadowAll(g);
      g.userData = { topG, N, NZ, head: head.geometry, tail: tail.geometry, sign, topM };
      return g;
    };
    R.pg194 = pageT('194', 'L', 31, { para: [2, 10, 17] }); R.pg188 = pageT('188', 'L', 35, { para: [6, 14] });
    const leftHalf = mkHalf(-1, R.pg188, coverMaps('MEKTUBAT')); bookRoot.add(leftHalf); R.leftHalf = leftHalf;
    const rightHalf = mkHalf(1, pageT('195', 'R', 32, { para: [7, 15, 21] }), null); bookRoot.add(rightHalf); R.rightHalf = rightHalf;
    rightHalf.rotation.z = ALPHA;
    // spine (moves under the gutter as the book opens) + gutter fold of the pages
    // spine: an open half-shell (leather both sides) that bulges toward the crease when closed and sits under the gutter when open
    const spineMat = leather.clone(); spineMat.side = THREE.DoubleSide;
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, BH + .009, 24, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2), spineMat); spine.castShadow = true; bookRoot.add(spine); R.spine = spine;
    const fold = new THREE.Mesh(new THREE.CylinderGeometry(.0045, .0045, BH - .002, 12, 1, false).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#8a7458', roughness: .95 })); bookRoot.add(fold); R.fold = fold;
    // riffling leaves: front = odd page (lying on the right), back = even page (on the left, mirrored)
    R.sheets = [];
    for (let i = 0; i < 3; i++) {
      const N = 24; const geo = stripGeo(N, 1, true); const uvA = geo.attributes.uv; for (let j = 0; j <= 1; j++) for (let k = 0; k <= N; k++) uvA.setXY(j * (N + 1) + k, k / N, j);
      const fT = pageT(String(189 + i * 2), 'R', 40 + i, { para: [3 + i, 11 + i] }), bT = pageT(String(190 + i * 2), 'L', 50 + i, { para: [4, 12 + i] });
      bT.wrapS = THREE.RepeatWrapping; bT.repeat.x = -1;
      const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: fT, roughness: .88, side: THREE.FrontSide }));
      const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bT, roughness: .88, side: THREE.BackSide }));
      front.castShadow = back.castShadow = true; front.receiveShadow = back.receiveShadow = true; front.frustumCulled = back.frustumCulled = false;
      bookRoot.add(front, back); R.sheets.push({ geo, i, N, front, back });
    }

    // ---------- SÖZLER (closed, on the table) with green satin ribbon + "19. Söz" tag ----------
    const soz = new THREE.Group(); soz.position.set(.13, TABLE_Y + .0012, .06); soz.rotation.y = -.35; scene.add(soz); R.soz = soz;
    const SW = .152, SH = .217, SD = .044;
    for (const y of [.0016, SD - .0016]) { const c = new THREE.Mesh(M.rbox(SW, .0032, SH, .0013, 2), leather); c.position.set(.002, y, 0); soz.add(c); }
    const sBlock = new THREE.Mesh(M.rbox(SW - .006, SD - .0062, SH - .007, .0012, 1), edgeMat); sBlock.position.set(.003, SD / 2, 0); soz.add(sBlock);
    const sSpine = new THREE.Mesh(new THREE.CylinderGeometry(SD / 2, SD / 2, SH, 24, 1, true, Math.PI, Math.PI), foilMaterial(spineMaps('SÖZLER', SD, 5))); sSpine.position.set(-SW / 2 + .004, SD / 2, 0); sSpine.scale.set(.32, 1, 1); sSpine.rotation.x = -Math.PI / 2; sSpine.rotation.z = 0; soz.add(sSpine);
    // spine cylinder: axis along z after rotX(-90°); theta range PI..2PI faces -x ; v along -z -> head
    const sCov = new THREE.Mesh(new THREE.PlaneGeometry(SW - .0026, SH - .0026).rotateX(-Math.PI / 2), foilMaterial(coverMaps('SÖZLER')));
    sCov.material.polygonOffset = true; sCov.material.polygonOffsetFactor = -2; sCov.material.polygonOffsetUnits = -2; sCov.position.set(.002, SD + .0001, 0); soz.add(sCov);
    M.shadowAll(soz);
    const ribPts = [[.035, SD * .55, SH / 2 - .012], [.037, SD * .56, SH / 2 + .002], [.04, SD * .3, SH / 2 + .011], [.042, .004, SH / 2 + .025], [.04, .0012, SH / 2 + .05], [.028, .0012, SH / 2 + .07], [.014, .0012, SH / 2 + .083]].map(p => new THREE.Vector3(...p));
    const ribCurve = new THREE.CatmullRomCurve3(ribPts); const RN = 70; const rv = [], ri = [], ruv = [];
    for (let k = 0; k <= RN; k++) { const p = ribCurve.getPoint(k / RN), tg = ribCurve.getTangent(k / RN); const side = new THREE.Vector3(0, 1, 0).cross(tg).normalize().multiplyScalar(.0055); const tw = Math.sin(k / RN * Math.PI) * .0006; rv.push(p.x - side.x, p.y - side.y + .0004 + tw, p.z - side.z, p.x + side.x, p.y + side.y + .0004 - tw, p.z + side.z); ruv.push(0, k / RN, 1, k / RN); if (k < RN) ri.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2); }
    const ribGeo = new THREE.BufferGeometry(); ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); ribGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2)); ribGeo.setIndex(ri); ribGeo.computeVertexNormals();
    const ribTex = tex(TEX, 64, 256, (x, W, H) => { x.fillStyle = '#1f6a44'; x.fillRect(0, 0, W, H); for (let i = 0; i < W; i += 2) { x.fillStyle = `rgba(255,255,255,${.03 + (i % 6 === 0 ? .03 : 0)})`; x.fillRect(i, 0, 1, H); } x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 0, 4, H); x.fillRect(W - 4, 0, 4, H); });
    const ribbon = new THREE.Mesh(ribGeo, new THREE.MeshPhysicalMaterial({ map: ribTex, roughness: .32, sheen: 1, sheenColor: new THREE.Color('#9be0b4'), sheenRoughness: .3, clearcoat: .35, clearcoatRoughness: .25, side: THREE.DoubleSide }));
    ribbon.castShadow = ribbon.receiveShadow = true; soz.add(ribbon);
    const tagTex = tex(TEX, 640, 352, (x, W, H) => {
      x.clearRect(0, 0, W, H); const r = 30, l = 86;
      const shape = () => { x.beginPath(); x.moveTo(l, 10); x.lineTo(W - 10 - r, 10); x.arcTo(W - 10, 10, W - 10, 10 + r, r); x.lineTo(W - 10, H - 10 - r); x.arcTo(W - 10, H - 10, W - 10 - r, H - 10, r); x.lineTo(l, H - 10); x.lineTo(12, H / 2 + 34); x.lineTo(12, H / 2 - 34); x.closePath(); };
      shape(); x.fillStyle = '#efe1c3'; x.fill();
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(170,130,80,${(i * 37 % 10) / 10 * .03})`; x.beginPath(); x.arc((i * 211) % W, (i * 97) % H, 2 + (i % 7), 0, 7); x.fill(); }
      x.save(); shape(); x.clip(); x.strokeStyle = 'rgba(134,21,26,.75)'; x.lineWidth = 5; x.strokeRect(l + 6, 28, W - l - 44, H - 56); x.lineWidth = 2; x.strokeRect(l + 16, 38, W - l - 64, H - 76); x.restore();
      shape(); x.strokeStyle = 'rgba(150,120,80,.55)'; x.lineWidth = 3; x.stroke();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(52, H / 2, 15, 0, 7); x.fill(); x.strokeStyle = '#b8862e'; x.lineWidth = 6; x.stroke();
      x.fillStyle = '#5e0a0f'; x.font = `700 118px "Playfair Display"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('19. Söz', l + (W - l) / 2 - 10, H * .53);
    });
    const tagG = new THREE.PlaneGeometry(.088, .0484, 8, 1).rotateX(-Math.PI / 2); { const p = tagG.attributes.position; for (let i = 0; i < p.count; i++) { const xx = p.getX(i); p.setY(i, .0016 * Math.pow(Math.max(0, (xx + .044) / .088 - .55), 2) * 4); } tagG.computeVertexNormals(); }
    const tag = new THREE.Mesh(tagG, new THREE.MeshStandardMaterial({ map: tagTex, transparent: true, alphaTest: .5, roughness: .85, side: THREE.DoubleSide }));
    const tagEnd = ribPts[ribPts.length - 1]; tag.position.set(tagEnd.x + .036, .0018, tagEnd.z + .008); tag.rotation.y = .16; tag.castShadow = tag.receiveShadow = true; soz.add(tag); R.tag = tag;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(.0055, .0009, 6, 20), new THREE.MeshStandardMaterial({ color: '#2a6a46', roughness: .5 })); loop.rotation.x = Math.PI / 2; loop.position.set(tagEnd.x - .001, .0024, tagEnd.z + .004); soz.add(loop);
    scene.add(contactShadows([{ x: .13, y: TABLE_Y + .0016, z: .06, s: [.2, 1, .27], ry: -.35 }], { opacity: .4 }));

    // ---------- the rest of the set on the sunlit sill (uniform red, gold spines) ----------
    const sillRow = new THREE.Group(); sillRow.position.set(-.26, WY0, WALL_Z + .065); scene.add(sillRow); R.sillRow = sillRow;
    const vols = [["LEM’ALAR", .042], ['ŞUALAR', .046], [['MESNEVÎ-İ', 'NURİYE'], .034], [["İŞARATÜ’L-", "İ’CAZ"], .036], [['BARLA', 'LÂHİKASI'], .038], [['KASTAMONU', 'LÂHİKASI'], .036], [['EMİRDAĞ', 'LÂHİKASI'], .04], [['TARİHÇE-İ', 'HAYAT'], .044]];
    let sxp = 0; const VH = .217, VD = .152; R.sillBooks = [];
    vols.forEach(([title, th], k) => {
      const g = new THREE.Group();
      for (const s of [-1, 1]) { const b = new THREE.Mesh(M.rbox(.0032, VH, VD, .0013, 2), leather); b.position.set(s * (th / 2 - .0016), VH / 2, -.002); g.add(b); }
      const blk = new THREE.Mesh(M.rbox(th - .006, VH - .007, VD - .006, .001, 1), edgeMat); blk.position.set(0, VH / 2, -.004); g.add(blk);
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(th / 2, th / 2, VH, 20, 1, true, -Math.PI / 2, Math.PI), foilMaterial(spineMaps(title, th, 11 + k))); sp.scale.z = .32; sp.position.set(0, VH / 2, VD / 2 - .004); g.add(sp);
      g.position.set(sxp + th / 2, 0, 0); sillRow.add(g); R.sillBooks.push(g); sxp += th + .0015;
    });
    const bookend = new THREE.Mesh(M.rbox(.012, .13, .11, .004), M.MAT.brass()); bookend.position.set(sxp + .007, .065, 0); sillRow.add(bookend);
    const bookend2 = new THREE.Mesh(M.rbox(.012, .13, .11, .004), M.MAT.brass()); bookend2.position.set(-.008, .065, 0); sillRow.add(bookend2);
    M.shadowAll(sillRow);
    R.sillCenter = new THREE.Vector3(-.26 + sxp / 2, WY0 + .11, WALL_Z + .065 + VD / 2);

    // ---------- tea glass (ince belli) on a saucer + teaspoon + steam ----------
    const tea = new THREE.Group(); tea.position.set(-.22, TABLE_Y + .0012, .17); scene.add(tea); R.tea = tea;
    const porcelain = new THREE.MeshPhysicalMaterial({ color: '#fbf8f1', roughness: .18, clearcoat: 1, clearcoatRoughness: .08 });
    const saucer = M.lathe([[0, 0], [.035, 0], [.05, .004], [.062, .009], [.066, .0125], [.064, .0135], [.05, .0085], [.034, .0055], [0, .006]], porcelain, 48); tea.add(saucer);
    const goldM = M.MAT.gold();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.0648, .0011, 6, 56), goldM); rim.rotation.x = Math.PI / 2; rim.position.y = .0131; tea.add(rim);
    const rim2 = new THREE.Mesh(new THREE.TorusGeometry(.036, .0007, 6, 48), goldM); rim2.rotation.x = Math.PI / 2; rim2.position.y = .0062; tea.add(rim2);
    const gOut = [[0, .006], [.019, .006], [.0215, .009], [.0222, .02], [.019, .036], [.0168, .048], [.0178, .062], [.0215, .085], [.0246, .102], [.0252, .106]];
    const gIn = [[.0244, .106], [.0238, .102], [.0207, .085], [.0170, .062], [.0160, .048], [.0182, .036], [.0212, .02], [.0205, .011], [0, .0095]];
    // fake thin glass: black diffuse + additive blending = only the reflections are added over what is behind it
    const glassM = new THREE.MeshPhysicalMaterial({ color: '#000000', transparent: true, blending: THREE.AdditiveBlending, roughness: .03, metalness: 0, envMapIntensity: 2.2, clearcoat: 1, clearcoatRoughness: .03, specularIntensity: 1, depthWrite: false, side: THREE.FrontSide });
    const glass = M.lathe(gOut.concat(gIn), glassM, 48); glass.renderOrder = 8; glass.castShadow = false; tea.add(glass);
    // painted reflections on the glass (window catchlights) — always on the camera-facing side
    const hlTex = tex(TEX, 128, 128, (x, W, H) => { x.clearRect(0, 0, W, H); const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(.0, 'rgba(255,255,255,0)'); g.addColorStop(.22, 'rgba(255,255,255,.0)'); g.addColorStop(.3, 'rgba(255,255,255,.9)'); g.addColorStop(.36, 'rgba(255,255,255,0)'); g.addColorStop(.62, 'rgba(255,255,255,0)'); g.addColorStop(.66, 'rgba(255,255,255,.45)'); g.addColorStop(.7, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    const hl = new THREE.Mesh(new THREE.LatheGeometry(gOut.map(([r, y]) => new THREE.Vector2(Math.max(r * 1.004, 1e-4), y)), 32, -Math.PI * .35, Math.PI * .7), new THREE.MeshBasicMaterial({ map: hlTex, transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide })); hl.renderOrder = 9; hl.userData.noDepth = true; tea.add(hl); R.teaHL = hl;
    const teaGrad = tex(TEX, 8, 256, (x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2e0602'); g.addColorStop(.3, '#4e0e03'); g.addColorStop(.75, '#7e2207'); g.addColorStop(1, '#b4480f'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    teaGrad.wrapS = teaGrad.wrapT = THREE.ClampToEdgeWrapping;
    const teaLiq = M.lathe([[0, .0096], [.0204, .011], [.0211, .02], [.0181, .036], [.0159, .048], [.0168, .062], [.0203, .084], [.0209, .087], [0, .087]], new THREE.MeshPhysicalMaterial({ map: teaGrad, emissiveMap: teaGrad, emissive: '#ffffff', emissiveIntensity: .42, roughness: .06, clearcoat: 1, clearcoatRoughness: .03 }), 40); teaLiq.castShadow = false; tea.add(teaLiq);
    const surf = new THREE.Mesh(new THREE.CircleGeometry(.0207, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: '#3a0b03', emissive: '#7a2408', emissiveIntensity: .35, roughness: .03, clearcoat: 1, envMapIntensity: 2.5 })); surf.position.y = .0868; tea.add(surf);
    const gRim = new THREE.Mesh(new THREE.TorusGeometry(.0249, .0008, 6, 48), new THREE.MeshStandardMaterial({ color: '#3a3a3a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, roughness: .05, envMapIntensity: 2.5 })); gRim.rotation.x = Math.PI / 2; gRim.position.y = .106; tea.add(gRim);
    // teaspoon resting on the saucer
    const silver = new THREE.MeshPhysicalMaterial({ color: '#d9d6cf', metalness: 1, roughness: .18, clearcoat: .6 });
    const spoon = new THREE.Group(); const bowl = new THREE.Mesh(new THREE.SphereGeometry(.0075, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), silver); bowl.scale.set(1, .32, 1.45); spoon.add(bowl);
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(.0019, .0024, .058, 10).rotateX(Math.PI / 2), silver); handle.position.set(0, .002, .038); spoon.add(handle);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.0038, 12, 8), silver); knob.scale.set(1, .45, 1.7); knob.position.set(0, .002, .068); spoon.add(knob);
    spoon.position.set(.03, .011, .02); spoon.rotation.set(-.1, .75, 0); tea.add(spoon);
    M.shadowAll(spoon); saucer.castShadow = true;
    // steam: a soft, noise-driven wisp (billboarded, GPU animated)
    const steamU = { time: { value: 0 }, op: { value: .3 } };
    const steam = new THREE.Mesh(new THREE.PlaneGeometry(.11, .26), new THREE.ShaderMaterial({
      uniforms: steamU, transparent: true, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float time, op; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float a = 0., w = .5; for (int i = 0; i < 4; i++){ a += w * n(p); p = p * 2.03 + 7.1; w *= .5; } return a; }
        float ribbon(vec2 uv, float ph, float amp){ float y = uv.y;
          float xc = .5 + amp * (.35 + y) * sin(y * 6. - time * 1.2 + ph) + .07 * y * sin(y * 3.1 - time * .65 + ph * 2.) + (fbm(vec2(y * 2.2 + ph, time * .25 + ph)) - .5) * .3 * y;
          float w = .028 + y * .15; float d = (uv.x - xc) / w; return exp(-d * d); }
        void main(){ vec2 uv = vUv; float y = uv.y;
          float a = ribbon(uv, 0., .12) * .85 + ribbon(uv, 2.1, .17) * .6 + ribbon(uv, 4.3, .09) * .45;
          float br = fbm(vec2(uv.x * 5. + y * 2., y * 3.5 - time * .75)); a *= smoothstep(.28, .72, br);
          a *= smoothstep(0., .1, y) * (1. - smoothstep(.42, .95, y));
          gl_FragColor = vec4(vec3(1., .985, .96), a * op); }`,
    }));
    steam.position.set(0, .106 + .13, 0); steam.userData.uniforms = steamU; steam.userData.yBillboard = true; steam.userData.noDepth = true; steam.renderOrder = 10; tea.add(steam);

    // ---------- red rose (cupped spiral petals) lying on the table ----------
    const rose = new THREE.Group(); rose.position.set(-.09, TABLE_Y + .032, .27); rose.rotation.set(0, 1.94, 0); rose.scale.setScalar(1.05); scene.add(rose); R.rose = rose;
    const petalMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: .5, sheen: .7, sheenColor: new THREE.Color('#ff3a50'), sheenRoughness: .4, side: THREE.DoubleSide });
    const head = new THREE.Group(); head.rotation.z = Math.PI / 2 - .2; rose.add(head);
    // concentric layers of cupped petals on a surface of revolution: tight spiral bud in the middle, opening, reflexed rims outside
    const cBase = new THREE.Color('#3e040c'), cMid = new THREE.Color('#9c0d1e'), cTip = new THREE.Color('#c42238');
    const LAY = [3, 4, 5, 5, 6, 7], NU = 8, NV = 10;
    LAY.forEach((n, k) => {
      const o = k / (LAY.length - 1), dphi = Math.PI * 2 / n * 1.38, phase = k * 2.39996;
      for (let j = 0; j < n; j++) {
        const phi0 = phase + j * Math.PI * 2 / n;
        const geo = new THREE.PlaneGeometry(1, 1, NU, NV); const p = geo.attributes.position; const col = new Float32Array(p.count * 3);
        for (let q = 0; q < p.count; q++) {
          const u = p.getX(q) + .5, v0 = p.getY(q) + .5; const e = 2 * u - 1;
          const v = v0 * (1 - .22 * e * e);                                   // rounded petal top
          const phi = phi0 + e * dphi / 2;
          let r = .0016 + k * .0016 + v * (.0035 + o * .013) + Math.pow(v, 3) * o * .007 - (1 - o) * .0012 * e * e;
          let y = v * (.019 - o * .006) - Math.pow(v, 4) * o * .005;
          r *= 1 + .06 * Math.sin(phi * 3 + k); // slight irregularity
          p.setXYZ(q, Math.cos(phi) * r, y, Math.sin(phi) * r);
          const c = cBase.clone().lerp(cMid, Math.min(1, v * 2.2)).lerp(cTip, Math.max(0, v - .7) * 2.2 * (.4 + .6 * o)); const sh = .8 + .2 * Math.abs(e);
          col[q * 3] = c.r * sh; col[q * 3 + 1] = c.g * sh; col[q * 3 + 2] = c.b * sh;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, petalMat); m.position.y = -.004; head.add(m);
      }
    });
    const sepMat = new THREE.MeshStandardMaterial({ color: '#35602a', roughness: .55, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(.0035, .024, 4).translate(0, .012, 0), sepMat); const a = i * 1.2566; s.position.set(Math.cos(a) * .006, -.007, Math.sin(a) * .006); s.rotation.set(Math.sin(a) * 2.0, 0, -Math.cos(a) * 2.0); head.add(s); }
    const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.008, 0), new THREE.Vector3(0, -.05, .001), new THREE.Vector3(.002, -.1, .002), new THREE.Vector3(0, -.15, 0)]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 30, .0026, 8), sepMat); head.add(stem);
    for (let i = 0; i < 4; i++) { const th = new THREE.Mesh(new THREE.ConeGeometry(.0012, .004, 5), sepMat); th.position.copy(stemCurve.getPoint(.25 + i * .18)); th.rotation.z = (i % 2 ? 1 : -1) * 1.2; head.add(th); }
    const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); for (let i = 0; i <= 12; i++) { const t = i / 12, w = Math.sin(Math.PI * t) * .011 * (1 + (i % 2) * .12); leafShape.lineTo(w, t * .04); } for (let i = 12; i >= 0; i--) { const t = i / 12, w = Math.sin(Math.PI * t) * .011 * (1 + (i % 2) * .12); leafShape.lineTo(-w, t * .04); }
    const leafG = new THREE.ShapeGeometry(leafShape, 4); { const p = leafG.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, -Math.pow(p.getX(i) / .011, 2) * .003 + Math.pow(p.getY(i) / .04, 2) * .004); leafG.computeVertexNormals(); }
    const leafM = new THREE.MeshPhysicalMaterial({ color: '#4a7a34', roughness: .5, clearcoat: .25, sheen: .4, sheenColor: new THREE.Color('#bfe0a0'), side: THREE.DoubleSide });
    for (const [y, s] of [[-.07, 1], [-.115, -1]]) { const lf = new THREE.Mesh(leafG, leafM); lf.position.set(0, y, 0); lf.rotation.set(0, s * .5, s * 1.05); head.add(lf); }
    M.shadowAll(rose);
    scene.add(contactShadows([{ x: -.22, y: TABLE_Y + .0016, z: .17, s: [.15, 1, .15] }, { x: -.09, y: TABLE_Y + .0016, z: .27, s: [.08, 1, .08] }], { opacity: .35 }));

    // grounding contact shadows under the table legs
    scene.add(contactShadows([[-.5, -.25], [.5, -.25], [-.5, .25], [.5, .25]].map(([x, z]) => ({ x, y: .006, z, s: [.12, 1, .12] })).concat([{ x: 0, y: .005, z: 0, s: [1.4, 1, .9] }]), { opacity: .35 }));

    // ---------- light shaft + dust ----------
    const SH_FROM = [-.5, 1.18, WALL_Z - .02], SH_TO = [.02, TABLE_Y + .02, .02];
    const shaft = FX.lightShaft({ from: SH_FROM, to: SH_TO, r0: .32, r1: .42, color: '#ffe2b0', opacity: .1 }); scene.add(shaft); R.shaft = shaft;
    { // the cone's source end crosses the wall plane below the sill: fade it out by distance from the wall (and at the
      // source end) so the depth test never cuts a hard-edged dark half-disc into the wall
      const sm = shaft.material;
      sm.vertexShader = sm.vertexShader.replace('varying vec2 vUv;', 'varying vec2 vUv; varying float vWz;').replace('vUv = uv;', 'vUv = uv; vWz = (modelMatrix * vec4(position, 1.)).z;');
      sm.fragmentShader = sm.fragmentShader.replace('varying vec2 vUv;', 'varying vec2 vUv; varying float vWz;').replace('float along =', `float along = smoothstep(${(WALL_Z + .02).toFixed(3)}, ${(WALL_Z + .26).toFixed(3)}, vWz) * smoothstep(1., .8, vUv.y) *`);
      sm.needsUpdate = true;
    }
    const motes = beamMotes({ from: SH_FROM, to: SH_TO, radius: .36, count: 650, size: 1.0, color: '#fff0d0', opacity: .8, speed: .012, nearFade: .45 }); scene.add(motes); R.motes = motes;

    camera.fov = 34; camera.near = .02; camera.far = 50; camera.updateProjectionMatrix();
    // camera (local s): establishing → MEKTUBAT cover → open book / 195 → table front → SÖZLER tag → tea glass → sill set
    // → final still life.
    // C2 rig: a sum of overlapping smootherstep moves (pos + look), so speed AND acceleration are continuous everywhere
    // (no slam-stops / step starts at knots) and the camera never comes to a dead stop between beats.
    R.cardY = 760;
    const S5 = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * x * (x * (x * 6 - 15) + 10);
    const P0 = [-.3, .95, .98], L0 = [-.1, .58, -.08];
    let pp = P0, pl = L0;
    // Beats are keyed to the narration words (CTC-aligned, local): Mektubat 1.88 · kitabının 2.43 · 195. 3.15 ·
    // sayfasında 3.85–4.54 · ve 4.75 · 19. 4.98 · Söz 5.63 · gibi 5.90–6.26 · başka 6.52 · risalelerde 6.92–7.62 ·
    // çok 7.88 · ve 8.73 (end card) · etraflıca 8.92 · bahsedilmiştir 9.61–10.52; fade to black 11.45–12.35.
    // The "19. Söz" tag lies on the table IN FRONT of the books, so any straight glide/crane between it and the open book
    // or the sill sweeps it up/down through the subtitle band. So the move in is a pair: drop to the table front (rose)
    // with SÖZLER + tag still beyond the right edge, then pan right - the tag enters from the right at y ~1000–1230 and
    // lands as "19." is spoken; the move out mirrors it (pan left past the tea glass until the tag has left through the
    // right edge, THEN crane up to the sill). Each pair is keyed to ONE word so its shape, and with it the band clearance
    // (tag never below y ~1230 while in frame), survives any retiming. Hold: tag ~y 930–1120, ring inside y ≤ 1330.
    const tMek = ctx.wordTime('mektubat'), tKit = ctx.wordTime('kitabının'), t19 = ctx.wordTime('19', 1), tBas = ctx.wordTime('başka'), tCok = ctx.wordTime('çok');
    const o0 = tKit - .21;                                          // the front cover starts to open (see update)
    const B = R.beats = { in0: t19 - 1.23, out0: tBas - .67, pb0: tCok - .28 }; // move in / move out / pull back start
    const moves = [ // [start, end, pos target, look target]
      [-1.3, 1.35, [-.22, .9, .62], [-.08, .58, -.08]],                        // slow push-in on the still life
      [tMek - 1.03, tMek + .22, [-.15, .99, .3], [-.05, .575, -.08]],          // onto the MEKTUBAT cover ("Mektubat")
      [o0 - .47, o0 + .88, [-.1, 1.0, .25], [-.085, .565, -.115]],             // settle over the opening book (195)
      [tKit + .07, B.in0 + .45, [-.06, .975, .245], [-.05, .555, -.09]],       // drift
      [B.in0, t19 - .26, [-.01, .9, .72], [-.14, .44, .25]],                   // drop to the table front (rose) ...
      [t19 - .76, t19 + .17, [.22, .86, .86], [.125, .428, .24]],              // ... pan right onto SÖZLER + tag ("19.")
      [t19 - .08, B.out0 + .45, [.225, .86, .88], [.125, .428, .25]],          // drift
      [B.out0, tBas + .08, [-.01, .88, .86], [-.19, .45, .22]],                // pan left past the tea glass ...
      [tBas - .37, tBas + 1.03, [-.02, .93, .48], [-.08, .86, -.38]],          // ... crane up to the sill set ("başka risalelerde")
      [tBas + .43, B.pb0 + .7, [-.045, .95, .57], [-.09, .86, -.42]],          // drift
      [B.pb0, tCok + 1.37, [-.055, .92, 1.38], [-.055, .61, -.1]],             // pull back to the wide still life
      [tCok - .03, ctx.dur + 2.05, [-.055, .912, 1.52], [-.055, .605, -.1]],   // gentle end drift (still moving at the last frame)
    ].map(([a, b, P, L]) => { const m = { a, b, dP: P.map((v, i) => v - pp[i]), dL: L.map((v, i) => v - pl[i]) }; pp = P; pl = L; return m; });
    R.cam = t => {
      const P = new THREE.Vector3(...P0), L = new THREE.Vector3(...L0);
      for (const m of moves) { const s = S5((t - m.a) / (m.b - m.a)); if (s) { P.x += m.dP[0] * s; P.y += m.dP[1] * s; P.z += m.dP[2] * s; L.x += m.dL[0] * s; L.y += m.dL[1] * s; L.z += m.dL[2] * s; } }
      return { P, L, fov: 34 + 6 * S5((t - B.pb0 + .55) / 2.8) };
    };
    // probes for the adaptive motion blur: on-screen speed of the hero objects
    R.mbCam = new THREE.PerspectiveCamera(34, 1080 / 1920, .02, 50);
    R.mbPts = [[-.1, hingeY, -.07], [-.03, hingeY + .03, -.07], [-.17, hingeY + .03, -.07], [.13, TABLE_Y + .045, .06], [.18, TABLE_Y + .002, .24], [.05, TABLE_Y + .04, .12],
      [R.sillCenter.x, R.sillCenter.y, R.sillCenter.z], [-.25, WY0 + .1, R.sillCenter.z], [.05, WY0 + .1, R.sillCenter.z], [-.22, TABLE_Y + .08, .17], [-.09, TABLE_Y + .03, .27], [-.1, .66, WALL_Z]].map(p => new THREE.Vector3(...p));
  },

  update(t, ctx) {
    const { ui, U, camera, post } = ctx;
    const C = R.cam(t), P = C.P, L = C.L; P.add(U.shake(t, .0035, .3, 6));
    camera.fov = C.fov; camera.updateProjectionMatrix();
    camera.position.copy(P); camera.lookAt(L); camera.updateMatrixWorld();
    // adaptive motion blur (pure function of t): sub-frame count follows the fastest on-screen motion of the hero
    // objects over one frame, so a 144° shutter smear is sampled every ~5 px (no stacked copies) and slow shots stay at 1
    {
      const proj = tt => { const c = R.cam(tt), mc = R.mbCam; mc.fov = c.fov; mc.updateProjectionMatrix(); mc.position.copy(c.P); mc.lookAt(c.L); mc.updateMatrixWorld(); return R.mbPts.map(p => p.clone().project(mc)); };
      const a = proj(t - 1 / 60), b = proj(t + 1 / 60); let px = 0;
      a.forEach((p, i) => { const q = b[i]; if (p.z > 1 || Math.abs(p.x) > 1.15 || Math.abs(p.y) > 1.15) return; px = Math.max(px, Math.hypot((q.x - p.x) * 540, (q.y - p.y) * 960)); });
      const n = Math.min(9, Math.max(1, Math.ceil(px * .4 / 5)));
      post.motionBlur = n > 1 ? { samples: n, shutter: .4 } : { samples: 1 };
    }
    R.motes.userData.uniforms.size.value = .62 * ctx.renderer.domElement.height / 960; // same look at every render scale
    // DOF range follows the camera beats: wide on the establishing shot, deeper on the SÖZLER hold (book + tag both sharp),
    // shallower through the move out (hides the crane), opening up again on the final pull back
    const B = R.beats, tMek = ctx.wordTime('mektubat');
    post.dof.focus = P.distanceTo(L); post.dof.range = U.lerp(.28, .5, U.smoothstep(B.pb0 - .15, B.pb0 + 2.25, t)) + .45 * (1 - U.smoothstep(tMek - .98, tMek - .18, t)) + .35 * U.smoothstep(B.in0 + .65, B.in0 + 1.25, t) * (1 - U.smoothstep(B.out0 + .1, B.out0 + .7, t)); post.dof.range *= 1 - .6 * Math.sin(Math.PI * U.prog(t, B.out0 + .1, B.out0 + 1.5)); post.dof.amount = .72;

    // --- front cover opens on "kitabının", then three leaves riffle over (right → left) ---
    const tKit = ctx.wordTime('kitabının');
    const o0 = tKit - .21, o1 = o0 + .9;
    let open = U.prog(t, o0, o1, x => x < .1 ? -0.03 * Math.sin(x / .1 * Math.PI) : U.ease.inOutCubic((x - .1) / .9));
    if (t > o1) open = 1 - .03 * Math.abs(Math.sin((t - o1) * 13)) * Math.exp(-(t - o1) * 6.5); // small bounce off the rahle, never into it
    const phiC = -Math.PI + ALPHA, phiO = -ALPHA;
    R.leftHalf.rotation.z = phiC + (phiO - phiC) * open;
    const k = U.smoothstep(.25, 1.0, open);
    for (const half of [R.leftHalf, R.rightHalf]) {
      const d = half.userData; if (d.k === k) continue; d.k = k; const s = d.sign;
      const p = d.topG.attributes.position;
      for (let j = 0; j <= d.NZ; j++) for (let i = 0; i <= d.N; i++) { const u = U0 + (1 - U0) * i / d.N; p.setXYZ(j * (d.N + 1) + i, s * u * BW, yTop(u) * k, BH / 2 - j / d.NZ * BH * .998 - .0002); }
      p.needsUpdate = true; d.topG.computeVertexNormals(); d.topG.computeBoundingSphere();
      for (const [geo, z] of [[d.head, -BH / 2 + .0003], [d.tail, BH / 2 - .0003]]) {
        const q = geo.attributes.position;
        for (let i = 0; i <= d.N; i++) { const u = Math.max(0, i / d.N); q.setXYZ(i, s * u * BW, -TAU, z); q.setXYZ(d.N + 1 + i, s * u * BW, yTop(u) * k, z); }
        q.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
      }
    }
    { // half-shell faces -x (local) before rotation; orient it toward the crease (closed) or straight down (open)
      const sr = U.lerp(TAU + .0034, .0088, k); R.spine.scale.set(sr, sr, 1); R.spine.position.set(0, U.lerp(0, -.0146, k), 0);
      R.spine.rotation.z = U.lerp(Math.PI / 2 + ALPHA, Math.PI, k); }
    R.fold.visible = false;
    const flipT = i => o1 - .38 + i * .11;
    let landed = 0;
    R.sheets.forEach(({ geo, i, N, front, back }) => {
      const f = U.prog(t, flipT(i), flipT(i) + .42, 'inOutSine');
      const vis = f < 1; front.visible = back.visible = vis; if (f >= 1) landed++;
      if (!vis) return;
      const th = ALPHA + (Math.PI - 2 * ALPHA) * f; const curl = .75 * Math.sin(2 * Math.PI * f); const cs = Math.cos(Math.PI * f);
      const lift = U.lerp(.0012 - i * .0004, .0004 + i * .0004, f);
      const nx = -Math.sin(th), ny = Math.cos(th); const p = geo.attributes.position; let x = 0, y = 0; const ds = (BW - .002) / N;
      for (let q = 0; q <= N; q++) {
        const u = q / N; if (q > 0) { const a = th + curl * (u - .5 / N) * (1 - .3 * u); x += Math.cos(a) * ds; y += Math.sin(a) * ds; }
        const off = (yTop(u) * k + lift) * cs;
        for (const row of [0, 1]) p.setXYZ(row * (N + 1) + q, x + nx * off, y + ny * off, row === 0 ? (BH - .003) / 2 : -(BH - .003) / 2);
      }
      p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    });
    const lm = landed >= 3 ? R.pg194 : R.pg188; if (R.leftHalf.userData.topM.material.map !== lm) { R.leftHalf.userData.topM.material.map = lm; R.leftHalf.userData.topM.material.needsUpdate = true; }

    // curtains breeze (pleated sheer)
    R.curtains.forEach(({ m, base, w, ph, pleats }) => {
      const p = m.geometry.attributes.position; const gust = .55 + .45 * Math.sin(t * .6 + ph) * Math.sin(t * .37 + ph * 2);
      for (let i = 0; i < p.count; i++) { const bx = base[i * 3], by = base[i * 3 + 1]; const v = (.71 - by) / 1.42; const pl = Math.sin((bx / w + .5) * pleats * Math.PI * 2) * .016 * (1 - .4 * v);
        p.setXYZ(i, bx + Math.sin(t * 1.0 + by * 3 + ph) * .01 * v * gust, by, pl + (Math.sin(t * 1.2 + bx * 5 + by * 2 + ph) * .03 + .028) * v * v * gust); }
      p.needsUpdate = true; m.geometry.computeVertexNormals();
    });
    // keep the glass catchlights facing the lens
    { const wp = new THREE.Vector3(); R.tea.getWorldPosition(wp); R.teaHL.rotation.y = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z); }

    // ---------- typography ----------
    const t195 = ctx.wordTime('195'), tSay = ctx.wordTime('sayfasında'), t19 = ctx.wordTime('19', 1), tRis = ctx.wordTime('risalelerde'), tBas = ctx.wordTime('başka'), tEtr = ctx.wordTime('etraflıca');
    // ring around the printed page number "195" (after the last leaf has lifted away)
    R.rightHalf.updateWorldMatrix(true, false); R.tag.updateWorldMatrix(true, false);
    const pn = new THREE.Vector3(BW * .525, yTop(.525) + .0005, -BH * .437); R.rightHalf.localToWorld(pn);
    const [px, py] = ui.project(pn);
    // ring + pill land on "195." and hold into "sayfasında"; gone (in0 + .33 = 4.08) before the drop to the table front
    // lifts the page number out of the top safe line (page number y ~300 at 4.05)
    const r0 = Math.max(t195 - .05, flipT(2) + .2), rEnd = Math.min(tSay + .55, B.in0 + .33);
    const ra = U.prog(t, r0, r0 + .45, 'outCubic'); const rOut = U.smoothstep(rEnd, rEnd - .3, t);
    if (ra > 0 && rOut > 0) { const X = ui.ctx; X.save(); X.globalAlpha = rOut; X.strokeStyle = '#d8a23a'; X.lineWidth = 6; X.lineCap = 'round'; X.shadowColor = 'rgba(40,10,0,.35)'; X.shadowBlur = 10; X.beginPath(); X.ellipse(px, py, 74, 50, -.04, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ra); X.stroke(); X.restore(); }
    ui.pill('s. 195', { t, t0: r0 + .03, t1: rEnd, x: Math.min(860, Math.max(220, px - 10)), y: Math.max(300, py - 128), size: 52, bg: 'rgba(96,14,20,.9)', color: '#ffdc8e' });
    // "19. Söz" ring: drawn around the tag's lettering, oriented and sized from the tag's on-screen projection so it
    // hugs the tag at any framing (hold: centre ~(475,1025), extent y ~915–1135 — well inside the y ≤ 1330 safe line)
    const tq = (x, z) => ui.project(R.tag.localToWorld(new THREE.Vector3(x, 0, z)));
    const [tx, ty] = tq(.004, 0), [ax, ay] = tq(-.044, 0), [bx, by] = tq(.044, 0), [cx0, cy0] = tq(.004, -.0242), [cx1, cy1] = tq(.004, .0242);
    const eRx = .52 * Math.hypot(bx - ax, by - ay), eRy = .78 * Math.hypot(cx1 - cx0, cy1 - cy0), eRot = Math.atan2(by - ay, bx - ax);
    const ra2 = U.prog(t, t19 - .05, t19 + .45, 'outCubic'), rOut2 = U.smoothstep(B.out0 + .2, B.out0 - .05, t); // through "Söz" into "gibi"; gone before the pan left picks up speed
    if (ra2 > 0 && rOut2 > 0) { const X = ui.ctx; X.save(); X.globalAlpha = rOut2; X.strokeStyle = '#d8a23a'; X.lineWidth = 6; X.lineCap = 'round'; X.shadowColor = 'rgba(40,10,0,.35)'; X.shadowBlur = 10; X.beginPath(); X.ellipse(tx, ty, eRx, eRy, eRot, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ra2); X.stroke(); X.restore(); }
    // "başka risaleler" label over the sill set (lands on "risalelerde" as the crane settles)
    const sc = R.sillCenter.clone(); const [sx, sy] = ui.project(sc);
    const stp = R.sillCenter.clone(); stp.y += .135; const [, sty] = ui.project(stp);
    ui.pill('başka risaleler', { t, t0: tRis + .15, t1: Math.min(tEtr - .55, B.pb0 + .3), x: U.lerp(540, Math.min(820, Math.max(260, sx)), .35), y: Math.max(290, Math.min(1250, sty - 60)), size: 46, bg: 'rgba(96,14,20,.88)', color: '#ffe3a6' });
    // end card: comes in over 0.6 s on the "ve" of "ve etraflıca" (8.73) and is fully readable from ~9.3 through the 1 s
    // hold after the last word until the fade to black (11.45)
    const tEc = ctx.wordTime('ve', 1), ec = U.smoothstep(tEc, tEc + .6, t);
    if (ec > 0) {
      const X = ui.ctx; X.save(); X.globalAlpha = ec; const y0 = R.cardY + (1 - ec) * 14;
      X.save(); X.translate(540, y0); X.scale(1, .3); const g = X.createRadialGradient(0, 0, 0, 0, 0, 560); g.addColorStop(0, 'rgba(252,245,231,.9)'); g.addColorStop(.62, 'rgba(252,245,231,.78)'); g.addColorStop(1, 'rgba(252,245,231,0)'); X.fillStyle = g; X.fillRect(-560, -560, 1120, 1120); X.restore();
      X.fillStyle = '#a8792a'; const lw = 330 * U.ease.outCubic(ec);
      for (const yy of [y0 - 66, y0 + 66]) { X.fillRect(540 - lw, yy - 1.2, lw - 16, 2.4); X.fillRect(540 + 16, yy - 1.2, lw - 16, 2.4); X.save(); X.translate(540, yy); X.rotate(Math.PI / 4); X.fillRect(-6, -6, 12, 12); X.restore(); }
      X.restore();
    }
    ui.text('Mektubat, s. 195 · Sözler, 19. Söz', { t, t0: tEc, x: 540, y: R.cardY + 2, size: 58, weight: 700, family: 'Playfair Display', color: '#3d1a12', anim: 'fade', dur: .6, shadow: false, maxWidth: 940 });
  },
};
