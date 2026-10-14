// s20 (113.30–124.65) "Bu tatlı hakikatten Mektubat kitabının 195. sayfasında ve 19. Söz gibi başka risalelerde çok hoş ve
// etraflıca bahsedilmiştir."  — closing scene of the film.
// Visual: a quiet Turkish room at morning. Sun through a window with tulle curtains (gentle breeze), dust in the beam.
// On a low table: a wooden rahle with "MEKTUBAT" (closed) which opens on "kitabının"; the breeze riffles a few leaves and
// the book settles on page "195". The camera glides to "SÖZLER" lying beside it, its ribbon bookmark tagged "19. Söz";
// then pulls back past other Risale volumes into a calm wide still life (tea glass, rose) and the end card.
import * as THREE from 'three';
import { path3, path1, beamMotes, drawPage, paintSpine, plankTex, contactShadows, grainWood } from '../engine/lib/extra_H.js';

let R = {};
const TABLE_Y = .42;
const BW = .14, BH = .2, TAU = .015; // book half width, height, half thickness
const ALPHA = Math.PI / 2 - 1.1;         // rahle arm angle above horizontal

// ---------- cover / page artwork ----------
function drawCover(x, W, H, { color, title, gold = '#e6c068' }) {
  const c = new THREE.Color(color);
  x.fillStyle = `#${c.getHexString()}`; x.fillRect(0, 0, W, H);
  const R0 = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
  for (let i = 0; i < 700; i++) { x.fillStyle = R0() < .5 ? `rgba(0,0,0,${R0() * .07})` : `rgba(255,230,200,${R0() * .04})`; x.beginPath(); x.arc(R0() * W, R0() * H, 1 + R0() * 6, 0, 7); x.fill(); }
  x.strokeStyle = gold; x.lineWidth = W * .012; x.strokeRect(W * .07, H * .05, W * .86, H * .9); x.lineWidth = W * .004; x.strokeRect(W * .1, H * .07, W * .8, H * .86);
  // corner ornaments: small lozenges
  x.fillStyle = gold;
  for (const [px, py] of [[.1, .07], [.9, .07], [.1, .93], [.9, .93]]) { x.save(); x.translate(W * px, H * py); x.rotate(Math.PI / 4); x.fillRect(-W * .025, -W * .025, W * .05, W * .05); x.restore(); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `italic 500 ${W * .052}px "Lora"`; x.fillText('Risale-i Nur Külliyatı', W / 2, H * .17);
  x.fillRect(W * .3, H * .21, W * .4, H * .0025);
  // title cartouche
  x.lineWidth = W * .006; x.strokeRect(W * .16, H * .29, W * .68, H * .15);
  let fs = W * .13; x.font = `700 ${fs}px "Cinzel"`; const mw = x.measureText(title).width; if (mw > W * .6) { fs *= W * .6 / mw; x.font = `700 ${fs}px "Cinzel"`; }
  x.fillText(title, W / 2, H * .368);
  // geometric rosette (8-point star of two squares + ring) — ornament only, no letters
  x.save(); x.translate(W / 2, H * .6); const r = W * .14;
  x.lineWidth = W * .008; x.beginPath(); x.arc(0, 0, r * 1.18, 0, 7); x.stroke();
  for (let k = 0; k < 2; k++) { x.save(); x.rotate(k * Math.PI / 4); x.strokeRect(-r * .78, -r * .78, r * 1.56, r * 1.56); x.restore(); }
  x.beginPath(); x.arc(0, 0, r * .32, 0, 7); x.fill();
  for (let k = 0; k < 8; k++) { x.save(); x.rotate(k * Math.PI / 4 + Math.PI / 8); x.beginPath(); x.ellipse(0, -r * .62, r * .07, r * .16, 0, 0, 7); x.fill(); x.restore(); }
  x.restore();
  x.font = `600 ${W * .05}px "Lora"`; x.fillText('Bediüzzaman Said Nursî', W / 2, H * .84);
}
function pageDraw(num, side, seed, opts = {}) {
  return (x, W, H) => {
    drawPage(x, W, H, { seed, lines: 21, top: .16, bottom: .9, marginX: .13, paraAt: opts.para ?? [4, 12], gapAt: opts.gap ?? [], ink: 'rgba(85,72,60,.4)', bg: '#ebdfc3' });
    // gutter shading
    const gx = side === 'R' ? 0 : W; const g = x.createLinearGradient(gx, 0, side === 'R' ? W * .16 : W * .84, 0); g.addColorStop(0, 'rgba(90,60,30,.32)'); g.addColorStop(1, 'rgba(90,60,30,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    if (num) {
      x.fillStyle = 'rgba(60,45,35,.92)'; x.font = `600 ${W * .11}px "Lora"`; x.textBaseline = 'middle';
      x.textAlign = side === 'R' ? 'right' : 'left'; x.fillText(num, side === 'R' ? W * .87 : W * .13, H * .083);
      x.fillStyle = 'rgba(80,60,45,.5)'; x.fillRect(W * .13, H * .118, W * .74, Math.max(1, H * .0025));
    }
  };
}
const tex = (TEX, w, h, f) => { const t = TEX.drawTexture(w, h, f); t.anisotropy = 8; return t; };

export default {
  post: {
    exposure: 1.0,
    toneMapping: 'aces',
    bloom: { enabled: true, strength: 0.28, radius: 0.6, threshold: 0.9 },
    grade: { contrast: 1.04, saturation: 1.06, warmth: 0.035, lift: [0.02, 0.016, 0.012], gain: [1.02, 1.0, 0.96] },
    vignette: 0.32, grain: 0.025,
    dof: { enabled: true, focus: .6, range: .5, amount: .7 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, FX, TEX } = ctx;
    R = {};
    const rnd = U.rng(2020);
    scene.background = new THREE.Color('#e8d8bf');
    scene.environment = await ctx.loadHDR('kiara_interior'); scene.environmentIntensity = 0.5;
    scene.add(new THREE.HemisphereLight('#e4ebff', '#b08a60', 0.85));
    const sun = new THREE.DirectionalLight('#ffd9a0', 3.3); sun.position.set(-1.25, 2.35, -2.3); sun.target.position.set(.05, TABLE_Y, 0);
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); const sc = sun.shadow.camera; sc.left = -1.7; sc.right = 1.7; sc.top = 1.7; sc.bottom = -1.7; sc.near = .5; sc.far = 6; sun.shadow.bias = -.0003; sun.shadow.normalBias = .01; sun.shadow.radius = 4;
    scene.add(sun, sun.target); R.sun = sun;
    const fill = new THREE.PointLight('#ffe2c0', 2.2, 4, 1.5); fill.position.set(.5, 1.2, 1.4); scene.add(fill);

    // ---------- room ----------
    const WALL_Z = -.78;
    const wallTex = TEX.plaster({ a: '#efe2c9', b: '#d9c5a3', seed: 9, repeat: [2, 2] });
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTex.map, normalMap: wallTex.normalMap, normalScale: new THREE.Vector2(.4, .4), roughness: .95 });
    const wshape = new THREE.Shape(); wshape.moveTo(-2.5, 0); wshape.lineTo(2.5, 0); wshape.lineTo(2.5, 2.8); wshape.lineTo(-2.5, 2.8); wshape.closePath();
    const WX0 = -.82, WX1 = .32, WY0 = .78, WY1 = 2.02;
    const hole = new THREE.Path(); hole.moveTo(WX0, WY0); hole.lineTo(WX0, WY1); hole.lineTo(WX1, WY1); hole.lineTo(WX1, WY0); hole.closePath(); wshape.holes.push(hole);
    const wall = new THREE.Mesh(new THREE.ShapeGeometry(wshape), wallMat); wall.position.z = WALL_Z; wall.receiveShadow = true; scene.add(wall);
    const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), wallMat); sideWall.rotation.y = Math.PI / 2; sideWall.position.set(-1.45, 1.4, 1.2); sideWall.receiveShadow = true; scene.add(sideWall);
    // window frame (painted wood), sill, open left casement
    const frameMat = new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: .55 });
    const fw = .06, wcx = (WX0 + WX1) / 2, ww = WX1 - WX0, wh = WY1 - WY0;
    const addF = (w, h, d, x, y, z, parent = scene) => { const m = new THREE.Mesh(M.rbox(w, h, d, .01), frameMat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; };
    addF(ww + .1, fw, .14, wcx, WY1 + fw / 2 - .01, WALL_Z); addF(fw, wh + .1, .14, WX0 - fw / 2 + .01, (WY0 + WY1) / 2, WALL_Z); addF(fw, wh + .1, .14, WX1 + fw / 2 - .01, (WY0 + WY1) / 2, WALL_Z);
    const sill = new THREE.Mesh(M.rbox(ww + .22, .04, .26, .012), M.MAT.wood({ a: '#9a6a40', b: '#6a4426', rings: 18, seed: 41 })); sill.position.set(wcx, WY0 - .02, WALL_Z + .06); sill.castShadow = sill.receiveShadow = true; scene.add(sill);
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .1, roughness: .05, metalness: 0, envMapIntensity: 1.2, depthWrite: false });
    // right casement (closed): frame + 2 panes
    const cas = (open, hingeX, sign) => {
      const g = new THREE.Group(); g.position.set(hingeX, WY0, WALL_Z - .02); const cw = ww / 2 - .01;
      addF(cw, .045, .04, sign * cw / 2, .02, 0, g); addF(cw, .045, .04, sign * cw / 2, wh - .02, 0, g); addF(.045, wh, .04, sign * .02, wh / 2, 0, g); addF(.045, wh, .04, sign * (cw - .02), wh / 2, 0, g); addF(cw, .035, .035, sign * cw / 2, wh * .62, 0, g);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(cw - .06, wh - .06), glassMat); gl.position.set(sign * cw / 2, wh / 2, 0); g.add(gl);
      g.rotation.y = open; scene.add(g); return g;
    };
    cas(0, WX1, -1);
    R.casement = cas(-1.05, WX0, 1); // left casement swung open outward (breeze)
    // outside: morning garden backdrop (soft, out of focus)
    const outTex = tex(TEX, 512, 512, (x, W, H) => {
      const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#a9cdee'); g.addColorStop(.5, '#e2ecf2'); g.addColorStop(1, '#fbeedb'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      const Rr = (q => () => (q = (q * 16807) % 2147483647) / 2147483647)(3);
      // distant soft tree canopy (plane tree) on the right, low hills
      for (let i = 0; i < 46; i++) { const cx = W * (.58 + Rr() * .5), cy = H * (.42 + Rr() * .3), r = W * (.05 + Rr() * .09); x.fillStyle = `rgba(${120 + Rr() * 30},${150 + Rr() * 25},${110 + Rr() * 20},${.35 + Rr() * .25})`; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
      x.fillStyle = 'rgba(150,170,150,.35)'; x.beginPath(); x.moveTo(0, H * .78); x.quadraticCurveTo(W * .3, H * .68, W * .6, H * .76); x.lineTo(W, H * .74); x.lineTo(W, H); x.lineTo(0, H); x.fill();
      const s = x.createRadialGradient(W * .2, H * .28, 0, W * .2, H * .28, W * .6); s.addColorStop(0, 'rgba(255,250,230,1)'); s.addColorStop(.3, 'rgba(255,240,205,.75)'); s.addColorStop(1, 'rgba(255,236,200,0)'); x.fillStyle = s; x.fillRect(0, 0, W, H);
    });
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(5, 4), new THREE.MeshBasicMaterial({ map: outTex, color: new THREE.Color(1.35, 1.3, 1.24) }));
    outside.position.set(-.3, 1.5, WALL_Z - 1.8); outside.userData.depthOk = true; scene.add(outside);
    // tulle curtains (breeze)
    const curtTex = tex(TEX, 256, 512, (x, W, H) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(200,190,170,.35)'; x.lineWidth = 1; for (let i = 0; i < W; i += 6) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); } for (let j = 0; j < H; j += 6) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); } x.fillStyle = 'rgba(230,220,200,.5)'; x.fillRect(0, H - 30, W, 30); });
    const curtMat = new THREE.MeshPhysicalMaterial({ map: curtTex, color: '#fffaf0', transparent: true, opacity: .5, side: THREE.DoubleSide, roughness: .9, sheen: 1, sheenColor: new THREE.Color('#ffffff'), emissive: '#fff1dc', emissiveIntensity: .3, depthWrite: false });
    R.curtains = [];
    for (const [x0, w, ph] of [[WX0 - .14, .46, 0], [WX1 - .22, .38, 1.7]]) {
      const geo = new THREE.PlaneGeometry(w, 1.62, 28, 14); const base = geo.attributes.position.array.slice();
      const m = new THREE.Mesh(geo, curtMat); m.position.set(x0 + w / 2, WY1 + .2 - .81, WALL_Z + .1); m.renderOrder = 6; m.userData.noDepth = true; scene.add(m);
      R.curtains.push({ m, base, w, ph });
    }
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, ww + .7, 12).rotateZ(Math.PI / 2), M.MAT.brass()); rod.position.set(wcx, WY1 + .2, WALL_Z + .1); scene.add(rod);
    // floor + kilim
    const ftex = plankTex({ a: '#8a5a34', b: '#5e3a1e', planks: 8, seed: 12 }); ftex.repeat.set(3, 3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ftex, roughness: .6 })); floor.position.set(0, 0, 1.5); floor.receiveShadow = true; scene.add(floor);
    const kilim = tex(TEX, 512, 512, (x, W, H) => {
      x.fillStyle = '#6a3226'; x.fillRect(0, 0, W, H); x.fillStyle = '#b89a74'; x.fillRect(10, 10, W - 20, H - 20); x.fillStyle = '#74382a'; x.fillRect(18, 18, W - 36, H - 36);
      for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const cx = 34 + i * 29.5, cy = 34 + j * 29.5; x.fillStyle = (i + j) % 2 ? 'rgba(200,170,130,.28)' : 'rgba(50,50,80,.22)'; x.beginPath(); x.moveTo(cx, cy - 9); x.lineTo(cx + 9, cy); x.lineTo(cx, cy + 9); x.lineTo(cx - 9, cy); x.closePath(); x.fill(); }
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.7).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: kilim, roughness: 1, sheen: .7, sheenColor: new THREE.Color('#ffb38a') })); rug.position.set(0, .004, .25); rug.receiveShadow = true; scene.add(rug);

    // ---------- low table (sehpa) + linen runner ----------
    const walnut = grainWood({ a: '#9a6236', b: '#744624', seed: 51, streaks: 160, clearcoat: .5 });
    const table = new THREE.Group(); scene.add(table);
    const top = new THREE.Mesh(M.rbox(1.12, .036, .62, .012), walnut); top.position.y = TABLE_Y - .018; table.add(top);
    const apron = new THREE.Mesh(M.rbox(1.0, .06, .5, .01), walnut); apron.position.y = TABLE_Y - .065; table.add(apron);
    const legGeo = new THREE.LatheGeometry([[0, 0], [.024, 0], [.03, .04], [.02, .12], [.028, .22], [.02, .3], [.026, .36], [0, .36]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 16);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(legGeo, walnut); l.position.set(sx * .5, 0, sz * .25); table.add(l); }
    M.shadowAll(table);
    const runnerTex = tex(TEX, 512, 256, (x, W, H) => {
      x.clearRect(0, 0, W, H); x.fillStyle = '#f7f1e4'; x.fillRect(0, 22, W, H - 44);
      for (let i = 0; i < W; i += 22) { x.beginPath(); x.arc(i + 11, 22, 11, Math.PI, 0); x.fill(); x.beginPath(); x.arc(i + 11, H - 22, 11, 0, Math.PI); x.fill(); }
      x.strokeStyle = 'rgba(200,180,150,.6)'; x.lineWidth = 2; x.strokeRect(20, 36, W - 40, H - 72); for (let i = 40; i < W - 40; i += 24) { x.beginPath(); x.arc(i, H / 2, 6, 0, 7); x.stroke(); }
    });
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(.9, .45).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: runnerTex, transparent: true, alphaTest: .5, roughness: 1 }));
    runner.position.set(-.02, TABLE_Y + .0015, -.02); runner.receiveShadow = true; scene.add(runner);

    // ---------- rahle + MEKTUBAT (animated opening) ----------
    const rahle = M.rahle({ length: .42, width: .25, angle: 1.1, material: grainWood({ a: '#b27846', b: '#8a5530', seed: 61, streaks: 150, repeat: [1.6, 1.6], clearcoat: .45 }) });
    rahle.rotation.y = Math.PI / 2; rahle.position.set(-.1, TABLE_Y, -.04); scene.add(rahle);
    const hingeY = TABLE_Y + rahle.userData.crossY + (.007 + .003) / Math.cos(ALPHA) + TAU / Math.cos(ALPHA) + .0015;
    const bookRoot = new THREE.Group(); bookRoot.position.set(-.1, hingeY, -.04); scene.add(bookRoot); R.bookRoot = bookRoot;
    const leatherM = M.MAT.leather({ a: '#6b1d22', b: '#3f0e12', seed: 71 });
    const pageEdge = tex(TEX, 64, 64, (x, W, H) => { x.fillStyle = '#efe3c6'; x.fillRect(0, 0, W, H); for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(140,110,70,${.12 + (i % 6 === 0 ? .1 : 0)})`; x.fillRect(0, i, W, 1); } });
    const blockMat = new THREE.MeshStandardMaterial({ map: pageEdge, roughness: .95 });
    const pageCurve = u => .0055 * Math.sin(Math.min(u * 1.5, 1) * Math.PI / 2) - .0018 * u * u;
    const mkPagePlane = (sign, drawFn) => {
      const geo = new THREE.PlaneGeometry(BW, BH, 18, 1).rotateX(-Math.PI / 2);
      const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + BW / 2; p.setX(i, sign * x); p.setY(i, pageCurve(x / BW)); }
      if (sign < 0) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i)); const ix = geo.index.array; for (let i = 0; i < ix.length; i += 3) { const a = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = a; } }
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex(TEX, 512, 742, drawFn), roughness: .9 })); m.castShadow = m.receiveShadow = true; return m;
    };
    const mkHalf = (sign, pageFn, withCover) => {
      const g = new THREE.Group();
      const blk = new THREE.Mesh(M.rbox(BW - .004, TAU - .004, BH - .004, .002, 1), blockMat); blk.position.set(sign * (BW / 2), -TAU / 2 + .0005, 0); g.add(blk);
      const cov = new THREE.Mesh(M.rbox(BW + .006, .003, BH + .01, .0012, 1), leatherM); cov.position.set(sign * (BW / 2 + .002), -TAU - .0005, 0); g.add(cov);
      g.add(mkPagePlane(sign, pageFn));
      if (withCover) {
        const ct = tex(TEX, 512, 742, (x, W, H) => drawCover(x, W, H, { color: '#6b1d22', title: 'MEKTUBAT' }));
        const cg = new THREE.PlaneGeometry(BW + .002, BH + .006).rotateX(Math.PI / 2).rotateY(Math.PI);
        const cm = new THREE.Mesh(cg, new THREE.MeshPhysicalMaterial({ map: ct, roughness: .55, clearcoat: .3, clearcoatRoughness: .5, sheen: .3, sheenColor: new THREE.Color('#ffd0b0') })); cm.position.set(sign * (BW / 2 + .002), -TAU - .0022, 0); g.add(cm);
      }
      M.shadowAll(g); return g;
    };
    const leftHalf = mkHalf(-1, pageDraw('194', 'L', 31, { para: [2, 9, 15] }), false); leftHalf.rotation.z = -ALPHA; bookRoot.add(leftHalf);
    const rightHalf = mkHalf(1, pageDraw('195', 'R', 32, { para: [6, 13] }), true); bookRoot.add(rightHalf); R.rightHalf = rightHalf;
    const spine = new THREE.Mesh(new THREE.CylinderGeometry(TAU * .95, TAU * .95, BH - .006, 16, 1, false).rotateX(Math.PI / 2), leatherM); spine.position.y = -TAU * .55; spine.castShadow = true; bookRoot.add(spine);
    // riffling leaves (CPU-bent sheets), front = plain page, back = page 194 (last one)
    R.sheets = [];
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.PlaneGeometry(BW - .003, BH - .004, 16, 1);
      const fT = tex(TEX, 256, 371, pageDraw(null, 'R', 40 + i, { para: [3 + i, 11] })), bT = tex(TEX, 256, 371, i === 2 ? pageDraw('194', 'L', 31, { para: [2, 9, 15] }) : pageDraw(null, 'L', 50 + i));
      const front = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: fT, roughness: .9, side: THREE.FrontSide }));
      const back = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bT, roughness: .9, side: THREE.BackSide }));
      bT.wrapS = THREE.RepeatWrapping; bT.repeat.x = -1;
      front.castShadow = back.castShadow = true; front.receiveShadow = back.receiveShadow = true;
      bookRoot.add(front, back); R.sheets.push({ geo, i });
    }

    // ---------- SÖZLER with ribbon bookmark "19. Söz" ----------
    const soz = new THREE.Group(); soz.position.set(.205, TABLE_Y, -.085); soz.rotation.y = -.04; scene.add(soz); R.soz = soz;
    const SW = .15, SH = .215, SD = .042;
    const greenL = M.MAT.leather({ a: '#1f4a3b', b: '#0f2a20', seed: 73 });
    const sBlock = new THREE.Mesh(M.rbox(SW - .006, SD - .007, SH - .008, .002, 1), blockMat); sBlock.position.set(.002, SD / 2, 0); soz.add(sBlock);
    for (const y of [.0018, SD - .0018]) { const c = new THREE.Mesh(M.rbox(SW + .004, .0036, SH + .008, .0015, 1), greenL); c.position.set(.0, y, 0); soz.add(c); }
    const sSp = new THREE.Mesh(new THREE.CylinderGeometry(SD / 2, SD / 2, SH + .008, 16, 1, false, Math.PI, Math.PI).rotateX(Math.PI / 2), greenL); sSp.position.set(-SW / 2, SD / 2, 0); sSp.scale.x = .35; soz.add(sSp);
    const sCov = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: tex(TEX, 512, 734, (x, W, H) => drawCover(x, W, H, { color: '#1f4a3b', title: 'SÖZLER' })), roughness: .55, clearcoat: .3, clearcoatRoughness: .5 }));
    sCov.position.set(.001, SD + .0003, 0); soz.add(sCov);
    M.shadowAll(soz);
    // ribbon: emerges at the tail (+z) edge, drapes to the table and runs toward the camera
    const ribPts = [[.03, SD * .55, SH / 2 - .01], [.032, SD * .55, SH / 2 + .003], [.034, SD * .25, SH / 2 + .012], [.036, .003, SH / 2 + .03], [.036, .0016, SH / 2 + .065], [.014, .0016, SH / 2 + .1], [-.008, .0016, SH / 2 + .13]].map(p => new THREE.Vector3(...p));
    const ribCurve = new THREE.CatmullRomCurve3(ribPts); const RN = 60; const rv = [], ri = [], ruv = [];
    for (let k = 0; k <= RN; k++) { const p = ribCurve.getPoint(k / RN), tg = ribCurve.getTangent(k / RN); const side = new THREE.Vector3(0, 1, 0).cross(tg).normalize().multiplyScalar(.0045); rv.push(p.x - side.x, p.y - side.y + .0004, p.z - side.z, p.x + side.x, p.y + side.y + .0004, p.z + side.z); ruv.push(0, k / RN, 1, k / RN); if (k < RN) ri.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2); }
    const ribGeo = new THREE.BufferGeometry(); ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(rv, 3)); ribGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ruv, 2)); ribGeo.setIndex(ri); ribGeo.computeVertexNormals();
    const ribbon = new THREE.Mesh(ribGeo, new THREE.MeshPhysicalMaterial({ color: '#2f7a4a', roughness: .35, sheen: 1, sheenColor: new THREE.Color('#bff0c8'), side: THREE.DoubleSide })); ribbon.castShadow = ribbon.receiveShadow = true; soz.add(ribbon);
    // paper tag tied to the ribbon end
    const tagTex = tex(TEX, 384, 224, (x, W, H) => {
      x.clearRect(0, 0, W, H); x.fillStyle = '#f6ecd6'; const r = 26; x.beginPath(); x.moveTo(60, 8); x.lineTo(W - 8 - r, 8); x.arcTo(W - 8, 8, W - 8, 8 + r, r); x.lineTo(W - 8, H - 8 - r); x.arcTo(W - 8, H - 8, W - 8 - r, H - 8, r); x.lineTo(60, H - 8); x.lineTo(8, H / 2); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(150,120,80,.6)'; x.lineWidth = 3; x.stroke();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(44, H / 2, 11, 0, 7); x.fill(); x.strokeStyle = 'rgba(150,120,80,.8)'; x.lineWidth = 3; x.stroke();
      x.fillStyle = '#3a2416'; x.font = `italic 500 92px "Lora"`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('19. Söz', W * .58, H * .53);
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(.074, .043).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: tagTex, transparent: true, alphaTest: .5, roughness: .9, side: THREE.DoubleSide }));
    const tagEnd = ribPts[ribPts.length - 1]; tag.position.set(tagEnd.x + .03, .0022, tagEnd.z + .006); tag.rotation.y = .12; tag.castShadow = tag.receiveShadow = true; soz.add(tag); R.tag = tag;
    // tag's string loop
    const loop = new THREE.Mesh(new THREE.TorusGeometry(.006, .0008, 6, 20), new THREE.MeshStandardMaterial({ color: '#c9b48a', roughness: .8 })); loop.rotation.x = Math.PI / 2; loop.position.set(tagEnd.x - .0, .0022, tagEnd.z + .004); soz.add(loop);

    // ---------- other Risale volumes (untitled spines): stack on the table + row on a wall shelf ----------
    const vols = [['#6b1d22', '#3f0e12'], ['#1f4a3b', '#0f2a20'], ['#23385e', '#101c34'], ['#5a3a1c', '#2e1c0c'], ['#6b1d22', '#3f0e12'], ['#1f4a3b', '#0f2a20'], ['#23385e', '#101c34'], ['#4a2440', '#24101e']];
    const spineTexFor = (c, seed) => { const t = tex(TEX, 128, 512, (x, W, H) => paintSpine(x, W, H, { color: c[0], dark: c[1], bands: 5, gold: '#e6c068', labels: [{ panel: 1, bg: c[1] }], fleurons: true }, U.rng(seed))); return t; };
    const stack = new THREE.Group(); stack.visible = false;
    let yy = 0; [0, 2, 3].forEach((ci, k) => { const th = .036 + k * .004; const b = new THREE.Mesh(M.rbox(.15, th, .215, .003, 1), [M.MAT.leather({ a: vols[ci][0], b: vols[ci][1], seed: 80 + ci })][0]); b.position.set((k - 1) * .006, yy + th / 2, (k - 1) * .004); b.rotation.y = (k - 1) * .06; stack.add(b); const sp = new THREE.Mesh(new THREE.PlaneGeometry(th * .95, .2).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ map: spineTexFor(vols[ci], 90 + k), roughness: .5, metalness: .2 })); sp.rotation.y = -Math.PI / 2; sp.position.set(b.position.x - .0755, yy + th / 2, b.position.z); stack.add(sp); yy += th; });
    M.shadowAll(stack);
    // a row of other Risale volumes standing on the sunlit window sill (untitled spines, gilt ornaments only)
    const sillRow = new THREE.Group(); sillRow.position.set(-.02, WY0, WALL_Z - .02 + .1); scene.add(sillRow); R.sillRow = sillRow;
    let sxp = 0; const sillVols = [0, 1, 2, 4, 5, 3, 6];
    sillVols.forEach((vi, k) => { const c = vols[vi]; const th = .034 + (k % 3) * .005, hh = .2 + (k % 2) * .012; const b = new THREE.Mesh(M.rbox(th, hh, .15, .003, 1), M.MAT.leather({ a: c[0], b: c[1], seed: 100 + vi })); b.position.set(sxp + th / 2, hh / 2, 0); b.rotation.z = k === sillVols.length - 1 ? -.12 : 0; if (k === sillVols.length - 1) b.position.x += .012; sillRow.add(b);
      const sp = new THREE.Mesh(new THREE.PlaneGeometry(th * .92, hh * .96), new THREE.MeshStandardMaterial({ map: spineTexFor(c, 120 + k), roughness: .5, metalness: .25 })); sp.position.set(b.position.x, hh / 2, .0755); sp.rotation.z = b.rotation.z; sillRow.add(sp); sxp += th + .002; });
    const bookend = new THREE.Mesh(M.rbox(.012, .12, .1, .004), M.MAT.brass()); bookend.position.set(-.008, .06, 0); sillRow.add(bookend);
    M.shadowAll(sillRow);

    // ---------- tea glass on saucer + rose ----------
    const tea = new THREE.Group(); tea.position.set(-.225, TABLE_Y, .205); scene.add(tea); R.tea = tea;
    const saucer = M.lathe([[0, 0], [.035, 0], [.05, .004], [.062, .009], [.066, .012], [.064, .013], [.05, .008], [0, .006]], new THREE.MeshPhysicalMaterial({ color: '#fbf7ef', roughness: .25, clearcoat: .8 }), 40); tea.add(saucer);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.0645, .0012, 6, 48), M.MAT.gold()); rim.rotation.x = Math.PI / 2; rim.position.y = .0125; tea.add(rim);
    const gp = [[0, .006], [.02, .006], [.022, .012], [.017, .04], [.019, .07], [.025, .1], [.026, .104]];
    const glass = M.lathe(gp.concat([[.0245, .104], [.0235, .1], [.0178, .07], [.0158, .04], [.0195, .014], [0, .012]]), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: .13, roughness: .02, metalness: 0, envMapIntensity: 3.0, clearcoat: 1, clearcoatRoughness: .02, specularIntensity: 1, depthWrite: false }), 40); glass.renderOrder = 8; tea.add(glass);
    const teaGrad = tex(TEX, 8, 256, (x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a0702'); g.addColorStop(.12, '#5a1604'); g.addColorStop(.6, '#9a3a0c'); g.addColorStop(1, '#d26a1e'); x.fillStyle = g; x.fillRect(0, 0, W, H); });
    teaGrad.wrapS = teaGrad.wrapT = THREE.ClampToEdgeWrapping;
    const teaLiq = M.lathe([[0, .013], [.0192, .014], [.0154, .04], [.0172, .07], [.0225, .092], [0, .092]], new THREE.MeshPhysicalMaterial({ map: teaGrad, emissiveMap: teaGrad, emissive: '#ffffff', emissiveIntensity: .32, roughness: .05, clearcoat: 1, clearcoatRoughness: .03, transparent: true, opacity: .92 }), 32); tea.add(teaLiq);
    const gRim = new THREE.Mesh(new THREE.TorusGeometry(.0252, .0009, 6, 40), new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: .55, roughness: .05, envMapIntensity: 2 })); gRim.rotation.x = Math.PI / 2; gRim.position.y = .1035; tea.add(gRim);
    // steam (soft sprites)
    const steamTex = TEX.softDot(64, 0); R.steam = [];
    for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false })); s.userData.noDepth = true; s.renderOrder = 9; tea.add(s); R.steam.push({ s, ph: i / 7 }); }
    // rose (stylised, built from cupped petals)
    const rose = new THREE.Group(); rose.position.set(-.02, TABLE_Y + .03, .235); rose.rotation.set(0, .45, 0); rose.scale.setScalar(1.3); scene.add(rose);
    const petalMat = new THREE.MeshPhysicalMaterial({ color: '#b3122c', roughness: .5, sheen: 1, sheenColor: new THREE.Color('#ff7a8a'), sheenRoughness: .4, side: THREE.DoubleSide });
    const head = new THREE.Group(); head.rotation.z = Math.PI / 2 - .25; rose.add(head);
    for (let i = 0; i < 17; i++) {
      const layer = i / 16; const pw = .018 + layer * .02, ph = .022 + layer * .016;
      const geo = new THREE.PlaneGeometry(pw, ph, 6, 6); const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const px = p.getX(k) / (pw / 2), py = (p.getY(k) + ph / 2) / ph; p.setZ(k, -(px * px) * pw * .32 + py * py * ph * (.1 + layer * .45)); p.setX(k, p.getX(k) * (1 - .25 * (1 - py))); }
      geo.translate(0, ph / 2, 0); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, petalMat); const a = i * 2.4; const rr = .002 + layer * .009;
      m.position.set(Math.cos(a) * rr, -.004 + layer * .002, Math.sin(a) * rr); m.rotation.set(0, -a + Math.PI / 2, 0); m.rotateX(-(.05 + layer * .75)); head.add(m);
    }
    const sepMat = new THREE.MeshStandardMaterial({ color: '#3f6b2c', roughness: .6, side: THREE.DoubleSide });
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(.004, .022, 4).translate(0, .011, 0), sepMat); const a = i * 1.2566; s.position.set(Math.cos(a) * .006, -.006, Math.sin(a) * .006); s.rotation.set(Math.sin(a) * 1.9, 0, -Math.cos(a) * 1.9); head.add(s); }
    const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -.008, 0), new THREE.Vector3(.0, -.06, .0), new THREE.Vector3(.004, -.14, .003), new THREE.Vector3(.0, -.22, 0)]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 24, .0028, 8), sepMat); head.add(stem);
    for (const [y, s] of [[-.09, 1], [-.15, -1]]) { const lshape = new THREE.Shape(); lshape.moveTo(0, 0); lshape.quadraticCurveTo(.018, .02, 0, .05); lshape.quadraticCurveTo(-.018, .02, 0, 0); const lf = new THREE.Mesh(new THREE.ShapeGeometry(lshape, 10), sepMat); lf.position.set(0, y, 0); lf.rotation.set(0, s * .6, s * 1.0); head.add(lf); }
    M.shadowAll(rose);

    // grounding contact shadows under the table legs
    scene.add(contactShadows([[-.5, -.25], [.5, -.25], [-.5, .25], [.5, .25]].map(([x, z]) => ({ x, y: .006, z, s: [.12, 1, .12] })).concat([{ x: 0, y: .005, z: 0, s: [1.4, 1, .9] }]), { opacity: .35 }));

    // ---------- light shaft + dust ----------
    const SH_FROM = [-.5, 1.18, WALL_Z - .02], SH_TO = [.02, TABLE_Y + .02, .02];
    const shaft = FX.lightShaft({ from: SH_FROM, to: SH_TO, r0: .32, r1: .42, color: '#ffe2b0', opacity: .07 }); scene.add(shaft); R.shaft = shaft;
    const motes = beamMotes({ from: SH_FROM, to: SH_TO, radius: .36, count: 700, size: 1.0, color: '#fff0d0', opacity: .85, speed: .012 }); scene.add(motes); R.motes = motes;

    camera.fov = 34; camera.near = .02; camera.far = 50; camera.updateProjectionMatrix();
    // camera keys (local s): establishing → MEKTUBAT cover → open book / 195 → SÖZLER tag → pull back → final still life
    R.camPos = path3([
      [-0.6, [-.5, .98, 1.3]], [1.1, [-.32, .93, .9]],
      [1.75, [-.15, .99, .22]], [2.6, [-.08, 1.03, .28]], [3.3, [-.03, 1.04, .33]], [4.1, [-.0, .98, .27]],
      [4.95, [.25, .97, .63]], [5.9, [.255, .97, .67]],
      [6.9, [.22, .95, .9]], [8.3, [.02, 1.04, 1.14]], [9.4, [-.01, 1.065, 1.23]], [11.6, [-.015, 1.08, 1.33]],
    ]);
    R.camLook = path3([
      [-0.6, [-.12, .6, -.06]], [1.1, [-.13, .6, -.06]],
      [1.75, [-.17, .6, -.06]], [2.6, [-.06, .57, -.07]], [3.3, [-.04, .545, -.035]], [4.1, [-.02, .545, -.045]],
      [4.95, [.213, .44, .085]], [5.9, [.214, .44, .095]],
      [6.9, [.13, .78, -.58]], [8.3, [-.01, .57, -.06]], [9.4, [-.01, .575, -.055]], [11.6, [-.01, .58, -.06]],
    ]);
    R.camFocus = path1([[-0.6, 1.5], [1.2, 1.1], [2.0, .45], [2.9, .42], [4.0, .36], [5.0, .33], [6.0, .4], [7.4, 1.05], [9.2, 1.5], [11.6, 1.75]]);
  },

  update(t, ctx) {
    const { ui, U, camera, post } = ctx;
    const P = R.camPos(t), L = R.camLook(t); P.add(U.shake(t, .004, .3, 6));
    camera.fov = U.lerp(34, 42, U.smoothstep(6.3, 9.5, t)); camera.updateProjectionMatrix();
    camera.position.copy(P); camera.lookAt(L); camera.updateMatrixWorld();
    post.dof.focus = P.distanceTo(L); post.dof.range = U.lerp(.3, .9, U.smoothstep(6.5, 9.5, t)) + .5 * (1 - U.smoothstep(1.0, 1.8, t)) + .45 * U.smoothstep(4.2, 4.9, t) * (1 - U.smoothstep(6.1, 6.8, t)); post.dof.amount = .72;

    // --- book opening on "kitabının" + riffle (breeze) ---
    const tKit = ctx.wordTime('kitabının'), t195 = ctx.wordTime('195');
    const o0 = tKit - .25, o1 = o0 + .62;
    const open = U.prog(t, o0, o1, x => x < .15 ? -0.06 * Math.sin(x / .15 * Math.PI) : U.ease.outBack((x - .15) / .85, 1.1));
    const thR = ALPHA + (Math.PI - 2 * ALPHA) * (1 - open);
    R.rightHalf.rotation.z = thR;
    R.sheets.forEach(({ geo, i }) => {
      const f0 = o1 - .3 + i * .11; const fl = U.prog(t, f0, f0 + .42, 'inOutCubic');
      const base = thR + (Math.PI - 2 * ALPHA) * fl;
      const lag = .9 * Math.sin(Math.PI * fl) - .5 * Math.sin(Math.PI * U.clamp((t - o0) / (o1 - o0)));
      const p = geo.attributes.position; const n = 16; let x = 0, y = 0; const lift = .0012 + i * .0006 + (2 - i) * .0;
      for (let k = 0; k <= n; k++) {
        const u = k / n; if (k > 0) { const a = base - lag * (u - .5 / n); x += Math.cos(a) * (BW - .003) / n; y += Math.sin(a) * (BW - .003) / n; }
        const nx = -Math.sin(base), ny = Math.cos(base);
        for (const row of [0, 1]) { const idx = row * (n + 1) + k; p.setXYZ(idx, x + nx * lift, y + ny * lift, (row === 0 ? 1 : -1) * (BH - .004) / 2 * -1); }
      }
      p.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
    });

    // curtains breeze
    R.curtains.forEach(({ m, base, w, ph }) => {
      const p = m.geometry.attributes.position; const gust = .6 + .4 * Math.sin(t * .7 + ph);
      for (let i = 0; i < p.count; i++) { const bx = base[i * 3], by = base[i * 3 + 1]; const v = (.81 - by) / 1.62; p.setXYZ(i, bx + Math.sin(t * 1.1 + by * 3 + ph) * .012 * v * gust, by, Math.sin(bx * 46 + ph) * .018 + (Math.sin(t * 1.3 + bx * 5 + by * 2 + ph) * .035 + .03) * v * v * gust); }
      p.needsUpdate = true; m.geometry.computeVertexNormals();
    });
    // tea steam
    R.steam.forEach(({ s, ph }) => { const life = (t * .22 + ph) % 1; s.position.set(Math.sin(t * .9 + ph * 9) * .01 * life, .1 + life * .16, Math.cos(t * .7 + ph * 5) * .008 * life); s.scale.setScalar(.03 + life * .07); s.material.opacity = .16 * Math.sin(life * Math.PI); });

    // ---------- typography ----------
    const tSay = ctx.wordTime('sayfasında'), tSoz = ctx.wordTime('söz'), t19 = ctx.wordTime('19'), tEtr = ctx.wordTime('etraflıca'), tBah = ctx.wordTime('bahsedilmiştir');
    // ring around the printed page number "195"
    const pn = new THREE.Vector3(BW * .8, .006, -BH * .417); R.rightHalf.localToWorld(pn);
    const [px, py] = ui.project(pn);
    const ra = U.prog(t, t195 + .05, t195 + .5, 'outCubic'); const rOut = U.smoothstep(tSay + .55, tSay + .3, t);
    if (ra > 0 && rOut > 0) { const X = ui.ctx; X.save(); X.globalAlpha = rOut; X.strokeStyle = '#d99a2b'; X.lineWidth = 6; X.lineCap = 'round'; X.shadowColor = 'rgba(0,0,0,.25)'; X.shadowBlur = 8; X.beginPath(); X.ellipse(px, py, 78, 50, -.08, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ra); X.stroke(); X.restore(); }
    ui.pill('s. 195', { t, t0: t195 + .12, t1: tSay + .55, x: Math.min(860, Math.max(220, px)), y: Math.max(300, py - 120), size: 50, bg: 'rgba(40,26,16,.82)', color: '#ffd98a' });
    // "19. Söz" callout to the tag
    const tg = new THREE.Vector3(0, 0, 0); R.tag.localToWorld(tg);
    const [tx, ty] = ui.project(tg); const tRis = ctx.wordTime('risalelerde');
    const ra2 = U.prog(t, t19 - .05, t19 + .45, 'outCubic'), rOut2 = U.smoothstep(tRis + .25, tRis - .05, t);
    if (ra2 > 0 && rOut2 > 0) { const X = ui.ctx; X.save(); X.globalAlpha = rOut2; X.strokeStyle = '#d99a2b'; X.lineWidth = 6; X.lineCap = 'round'; X.shadowColor = 'rgba(0,0,0,.25)'; X.shadowBlur = 8; X.beginPath(); X.ellipse(tx + 8, ty, 210, 108, -.06, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ra2); X.stroke(); X.restore(); }
    // end card
    const ec = U.smoothstep(tEtr - .1, tEtr + .9, t);
    if (ec > 0) {
      const X = ui.ctx; X.save(); X.globalAlpha = ec; const y0 = 300 + (1 - ec) * 14;
      const g = X.createLinearGradient(0, y0 - 140, 0, y0 + 190); g.addColorStop(0, 'rgba(255,248,236,0)'); g.addColorStop(.3, 'rgba(252,244,228,.8)'); g.addColorStop(.72, 'rgba(252,244,228,.8)'); g.addColorStop(1, 'rgba(255,248,236,0)'); X.fillStyle = g; X.fillRect(0, y0 - 140, 1080, 330);
      X.fillStyle = '#b8862e'; X.fillRect(540 - 170 * ec, y0 - 44, 340 * ec, 2.5); X.fillRect(540 - 170 * ec, y0 + 96, 340 * ec, 2.5);
      X.save(); X.translate(540, y0 - 43); X.rotate(Math.PI / 4); X.fillRect(-6, -6, 12, 12); X.restore(); X.save(); X.translate(540, y0 + 97); X.rotate(Math.PI / 4); X.fillRect(-6, -6, 12, 12); X.restore();
      X.restore();
    }
    ui.text('Mektubat, s. 195 · Sözler, 19. Söz', { t, t0: tEtr - .1, x: 540, y: 326, size: 60, weight: 700, family: 'Playfair Display', color: '#3b2414', anim: 'fade', dur: .9, shadow: false, maxWidth: 940 });
  },
};
