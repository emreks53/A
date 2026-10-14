// s14 (77.75–87.50) "Şu ana kadar yazılmış başta Şifa-i Şerif gibi çok kitaplar yüzlerce ciltlerle bu "yüksek ahlak"
// mu'cizesini beyan ve ispat etmiştir."
// Visual: a grand old manuscript library (stone piers + pointed arches, two tiers of walnut shelving with a gallery,
// tall arched windows letting warm morning sun shafts in, dust motes). The camera glides along the shelves to a lectern in
// the sunbeam: the hero binding "Şifâ-i Şerif" (Kadı İyâz). On "yüzlerce ciltlerle" it pulls back and cranes up: the upper
// shelves fill with volumes in a rapid time-lapse wave (counter), revealing the immense wall. "beyan ve ispat" stamp.
import * as THREE from 'three';
import { camPath, aim, bookInstances, fillShelf, itemMatrix } from '../engine/lib/extra_F.js';

let R = {};
const HALL = { x0: -5, x1: 5, z0: 5.5, z1: -27, bays: 9, bayW: 3.4, zStart: 4.6 };

export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.5, radius: 0.7, threshold: 0.8 },
    grade: { contrast: 1.08, saturation: 1.08, warmth: 0.02, lift: [0.0, 0.008, 0.022], gain: [1.03, 1.0, 0.97] },
    vignette: 0.45, grain: 0.03,
    dof: { enabled: true, focus: 8, range: 6, amount: 0.8 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx;
    R = {};
    await document.fonts.load('700 60px Amiri', 'الشفا');
    scene.background = new THREE.Color('#1a120c');
    scene.fog = new THREE.FogExp2('#3b2c22', 0.012);
    scene.environment = await ctx.loadHDR('old_hall'); scene.environmentIntensity = 0.32;

    // ---- light: morning sun through the left windows + warm ambient -----------------------------------------
    const SUND = new THREE.Vector3(0.74, -0.6, -0.3).normalize(); R.SUND = SUND;
    const tgt = new THREE.Vector3(0.5, 1.5, -9);
    const sun = ENV.sunLight({ color: '#ffd9a0', intensity: 4.6, pos: tgt.clone().addScaledVector(SUND, -40).toArray(), target: tgt.toArray(), size: 19, mapSize: 2048, radius: 2.5, bias: -0.0004, normalBias: .025 });
    sun.shadow.camera.far = 90; scene.add(sun, sun.target); R.sun = sun;
    scene.add(new THREE.HemisphereLight('#ffe6c8', '#7a5236', 0.5));
    const sky = new THREE.DirectionalLight('#9cb6ff', 0.75); sky.position.set(-12, 6, -4); sky.target.position.set(2, 2, -10); scene.add(sky, sky.target); // cool skylight through the windows
    const bounce = new THREE.PointLight('#ffb070', 4, 9, 2); bounce.position.set(1.4, 0.5, -10.2); scene.add(bounce);

    // ---- materials -----------------------------------------------------------------------------------------
    const walnut = M.MAT.wood({ a: '#7a4a28', b: '#4a2814', rings: 14, seed: 31 });
    const walnutDark = M.MAT.wood({ a: '#5e3820', b: '#331a0c', rings: 18, seed: 33 });
    const stoneM = M.MAT.stone({ a: '#d8c6a6', b: '#a88f6e', seed: 41, repeat: [1, 2] });
    const plasterM = M.MAT.plaster({ a: '#e3cfac', b: '#c4a67e', seed: 8, repeat: [3, 3] });

    // floor: polished stone tiles + a long kilim runner
    const tileTex = TEX.drawTexture(1024, 1024, (x, W, H) => {
      const n = 4, s = W / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const c = (i + j) % 2 ? '#c9a77e' : '#e2ccaa'; x.fillStyle = c; x.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(${(i + j) % 2 ? '120,80,50' : '160,130,100'},0.06)`; x.beginPath(); x.ellipse(i * s + ((k * 37) % s), j * s + ((k * 71) % s), 20 + (k % 7) * 9, 6 + (k % 5) * 3, k, 0, 7); x.fill(); } }
      x.strokeStyle = '#7d6347'; x.lineWidth = 5; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, H); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(W, i * s); x.stroke(); } });
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(4, 13);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 34).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: tileTex, roughness: .45, clearcoat: .25, clearcoatRoughness: .45 }));
    floor.position.set(0, 0, -10.75); floor.receiveShadow = true; scene.add(floor);
    const kilimTex = TEX.drawTexture(256, 1024, (x, W, H) => {
      x.fillStyle = '#8c2418'; x.fillRect(0, 0, W, H); x.fillStyle = '#e1b45a'; x.fillRect(10, 0, 8, H); x.fillRect(W - 18, 0, 8, H); x.fillStyle = '#23324f'; x.fillRect(26, 0, 12, H); x.fillRect(W - 38, 0, 12, H);
      for (let j = 0; j < 16; j++) { const cy = j * 64 + 32; x.fillStyle = j % 2 ? '#e8cf9a' : '#2c3d5c'; x.beginPath(); x.moveTo(W / 2, cy - 28); x.lineTo(W / 2 + 60, cy); x.lineTo(W / 2, cy + 28); x.lineTo(W / 2 - 60, cy); x.closePath(); x.fill(); x.fillStyle = '#b8402e'; x.fillRect(W / 2 - 8, cy - 8, 16, 16); }
    });
    kilimTex.wrapT = THREE.RepeatWrapping; kilimTex.repeat.set(1, 4);
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 28, 1, 1).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: kilimTex, roughness: 1, sheen: .8, sheenColor: new THREE.Color('#ffb08a') }));
    runner.position.set(-.6, .006, -10); runner.receiveShadow = true; scene.add(runner);

    // ---- architecture --------------------------------------------------------------------------------------
    const arch = new THREE.Group(); scene.add(arch);
    const bayZ = i => HALL.zStart - i * HALL.bayW; // pier positions (bay i spans bayZ(i)..bayZ(i+1))
    // piers on both sides
    const pierGeo = M.rbox(.7, 7.6, .7, .06, 2);
    for (let i = 0; i <= HALL.bays; i++) for (const sx of [-1, 1]) { const p = new THREE.Mesh(pierGeo, stoneM); p.position.set(sx * 4.85, 3.8, bayZ(i)); p.castShadow = p.receiveShadow = true; arch.add(p);
      const cap = new THREE.Mesh(M.rbox(.95, .25, .95, .05, 2), stoneM); cap.position.set(sx * 4.85, 7.65, bayZ(i)); arch.add(cap); }
    // transverse pointed arches across the hall + wall arches
    const pointedArch = (span, rise, thick, depth) => {
      const s = new THREE.Shape(); const h = span / 2; const r = (h * h + rise * rise) / (2 * h); // two circular arcs meeting at apex
      const outer = (sgn, rr) => { const pts = []; const cx = sgn * (h - rr) * -1; for (let a = 0; a <= 1; a += 1 / 16) { const ang = Math.acos(((sgn * h) - cx) / rr); const t = ang + (Math.acos((0 - cx) / rr) - ang) * a; pts.push([cx + Math.cos(t) * rr, Math.sin(t) * rr]); } return pts; };
      const o = []; for (let i = 0; i <= 16; i++) { const a = i / 16; const x = -h + h * a; const y = rise * Math.sin(a * Math.PI / 2) ** .8; o.push([x, y]); }
      const L = o.concat(o.slice(0, -1).reverse().map(([x, y]) => [-x, y]));
      s.moveTo(L[0][0] - thick, 0); L.forEach(([x, y], i) => { const k = Math.abs(x) / h; s.lineTo(x * (1 + thick / h), y + thick * (1 - k * .3)); }); s.lineTo(h + thick, 0); s.lineTo(h, 0);
      [...L].reverse().forEach(([x, y]) => s.lineTo(x, y)); s.lineTo(-h, 0); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: .04, bevelSize: .04, bevelSegments: 2, curveSegments: 12 }); g.translate(0, 0, -depth / 2); return g;
    };
    const tArch = pointedArch(9.0, 3.2, .45, .6);
    for (let i = 0; i <= HALL.bays; i++) { const m = new THREE.Mesh(tArch, stoneM); m.position.set(0, 7.75, bayZ(i)); m.castShadow = m.receiveShadow = true; arch.add(m); }
    // vault/ceiling: warm plaster barrel segments between arches
    const vaultGeo = new THREE.CylinderGeometry(4.9, 4.9, HALL.bayW, 24, 1, true, -Math.PI / 2, Math.PI); vaultGeo.rotateX(-Math.PI / 2); vaultGeo.scale(1, .68, 1);
    const vaultMat = new THREE.MeshStandardMaterial({ color: '#d6bf9c', roughness: .95, side: THREE.BackSide });
    for (let i = 0; i < HALL.bays; i++) { const v = new THREE.Mesh(vaultGeo, vaultMat); v.position.set(0, 7.75, bayZ(i) - HALL.bayW / 2); v.receiveShadow = true; arch.add(v); }
    // right wall (plaster) behind shelves, cornice above the upper tier
    const rwall = new THREE.Mesh(new THREE.PlaneGeometry(34, 8).rotateY(-Math.PI / 2), plasterM); rwall.position.set(5.25, 4, -10.75); rwall.receiveShadow = true; arch.add(rwall);
    // left wall with tall arched window openings (extruded shape with holes) — casts the sun patches
    { const s = new THREE.Shape(); const zA = HALL.zStart + 1, zB = bayZ(HALL.bays) - 1; s.moveTo(-zA, 0); s.lineTo(-zB, 0); s.lineTo(-zB, 9.5); s.lineTo(-zA, 9.5); s.closePath();
      R.windows = [];
      for (let i = 0; i < HALL.bays; i++) { const zc = bayZ(i) - HALL.bayW / 2; const w = 1.5, y0 = 3.55, y1 = 6.6; const hole = new THREE.Path(); const u = -zc;
        hole.moveTo(u - w / 2, y0); hole.lineTo(u + w / 2, y0); hole.lineTo(u + w / 2, y1); hole.quadraticCurveTo(u + w / 2, y1 + .75, u, y1 + 1.15); hole.quadraticCurveTo(u - w / 2, y1 + .75, u - w / 2, y1); hole.closePath(); s.holes.push(hole); R.windows.push(zc); }
      const g = new THREE.ExtrudeGeometry(s, { depth: .9, bevelEnabled: false, curveSegments: 10 }); // shape XY = (-z, y), extrude +Z -> rotate to world
      g.rotateY(Math.PI / 2); // (x,y,z) -> (z,y,-x): shape u=-z -> world z, extrusion -> +x (wall spans x -6.1..-5.2)
      const m = new THREE.Mesh(g, plasterM); m.position.set(-6.1, 0, 0); m.castShadow = m.receiveShadow = true; arch.add(m); R.lwall = m; }
    // window mullions & sills (wood) + bright exterior backdrop
    const exterior = new THREE.Mesh(new THREE.PlaneGeometry(40, 14).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff3dc').multiplyScalar(1.6), fog: false }));
    exterior.position.set(-8.5, 5, -10.75); scene.add(exterior);
    R.windows.forEach(zc => {
      const tr = new THREE.Mesh(M.rbox(.12, .1, 1.5, .03, 1), walnutDark); tr.position.set(-5.65, 6.62, zc); tr.castShadow = true; arch.add(tr);
      const sill = new THREE.Mesh(M.rbox(1.0, .14, 1.8, .04, 2), stoneM); sill.position.set(-5.05, 3.48, zc); sill.castShadow = sill.receiveShadow = true; arch.add(sill);
    });
    // far end wall with one tall window (backlight)
    { const s = new THREE.Shape(); s.moveTo(-5.4, 0); s.lineTo(5.4, 0); s.lineTo(5.4, 11.5); s.lineTo(-5.4, 11.5); s.closePath(); const h = new THREE.Path(); h.moveTo(-1.0, 5.1); h.lineTo(1.0, 5.1); h.lineTo(1.0, 8.2); h.quadraticCurveTo(1.0, 9.1, 0, 9.6); h.quadraticCurveTo(-1.0, 9.1, -1.0, 8.2); h.closePath(); s.holes.push(h);
      const g = new THREE.ExtrudeGeometry(s, { depth: .8, bevelEnabled: false }); const m = new THREE.Mesh(g, plasterM); m.position.set(0, 0, bayZ(HALL.bays) - .9); m.receiveShadow = true; arch.add(m);
      const ext = new THREE.Mesh(new THREE.PlaneGeometry(6, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe8c4').multiplyScalar(1.25), fog: false })); ext.position.set(0, 7, bayZ(HALL.bays) - 2.5); scene.add(ext); }

    // ---- shelving + books ----------------------------------------------------------------------------------
    const rnd = U.rng(77); const items = []; const late = []; // late: fill during the time-lapse
    // generic shelving unit in a local frame M4 (x along the shelf from 0..len, +z out of the shelf front, y up)
    const boardGeos = {};
    const unit = (M4, len, y0, nShelves, pitch, isLate, meta) => {
      const bg = boardGeos[len.toFixed(2)] || (boardGeos[len.toFixed(2)] = M.rbox(len, .045, .42, .012, 1));
      const put = (geo, mat, lx, ly, lz, sy = 1) => { const m = new THREE.Mesh(geo, mat); m.matrixAutoUpdate = false; m.matrix.copy(M4).multiply(new THREE.Matrix4().makeTranslation(lx, ly, lz)).multiply(new THREE.Matrix4().makeScale(1, sy, 1)); m.castShadow = m.receiveShadow = true; scene.add(m); return m; };
      for (let k = 0; k <= nShelves; k++) put(bg, walnut, len / 2, y0 + k * pitch - .022, -.2);
      const H = nShelves * pitch + .06; put(sideGeo, walnut, .02, y0 + H / 2 - .03, -.21, H); put(sideGeo, walnut, len - .02, y0 + H / 2 - .03, -.21, H);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(len, nShelves * pitch), walnutDark); back.matrixAutoUpdate = false; back.matrix.copy(M4).multiply(new THREE.Matrix4().makeTranslation(len / 2, y0 + nShelves * pitch / 2, -.43)); back.receiveShadow = true; scene.add(back);
      for (let k = 0; k < nShelves; k++) {
        const list = []; fillShelf(rnd, .04, len - .04, y0 + k * pitch, pitch - .05, .4, list, { flatP: .1, gapP: .025, hMin: .2, hVar: pitch - .26 });
        list.forEach(it => { const m = itemMatrix(it, M4); const rec = { m, color: it.color, v: it.v, ...meta, k, x: it.pos[0] / len }; (isLate && (isLate === true || rnd() < isLate) ? late : items).push(rec); });
      }
    };
    const sideGeo = M.rbox(.05, 1, .44, .012, 1);
    const shelfUnit = (side, i, y0, nShelves, pitch, isLate) => {
      // side: +1 right wall (spines face -x), -1 left wall (spines face +x)
      const zA = bayZ(i) - .36, zB = bayZ(i + 1) + .36, len = zA - zB; const xF = side * 4.62;
      const M4 = new THREE.Matrix4();
      if (side > 0) M4.makeRotationY(-Math.PI / 2).setPosition(xF, 0, zB); else M4.makeRotationY(Math.PI / 2).setPosition(xF, 0, zA);
      unit(M4, len, y0, nShelves, pitch, isLate, { side, i });
    };
    for (let i = 0; i < HALL.bays; i++) {
      shelfUnit(1, i, .14, 6, .54, false);                // right wall, lower tier: full
      shelfUnit(1, i, 3.86, 6, .5, i < 2 ? .3 : .78);     // right wall, upper tier: mostly filled during the time-lapse
      shelfUnit(-1, i, .14, 5, .54, false);               // left wall, under the windows
    }
    const zEnd = bayZ(HALL.bays) - .1 + .45; // end wall shelving below the high window
    unit(new THREE.Matrix4().makeTranslation(-4.4, 0, zEnd), 4.2, .14, 8, .54, false, { side: 0, i: 9 });
    unit(new THREE.Matrix4().makeTranslation(.2, 0, zEnd), 4.2, .14, 8, .54, false, { side: 0, i: 9 });
    // gallery walkway + balustrade on the right
    { const deckMat = M.MAT.wood({ a: '#8a5a32', b: '#5a3418', rings: 10, seed: 35, repeat: [1, 22] }); const deck = new THREE.Mesh(M.rbox(1.25, .14, 31.5, .04, 2), deckMat); deck.position.set(4.05, 3.66, -10.75); deck.castShadow = deck.receiveShadow = true; scene.add(deck);
      const rail = new THREE.Mesh(M.rbox(.09, .09, 31.5, .03, 2), walnut); rail.position.set(3.48, 4.68, -10.75); rail.castShadow = true; scene.add(rail);
      const balGeo = new THREE.LatheGeometry([[0, 0], [.035, 0], [.03, .1], [.05, .35], [.025, .6], [.035, .85], [.03, .95], [0, .95]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 10);
      const nb = 120; const bal = new THREE.InstancedMesh(balGeo, walnut, nb); const m4 = new THREE.Matrix4(); for (let k = 0; k < nb; k++) { m4.makeTranslation(3.48, 3.73, 4.9 - k * .262); bal.setMatrixAt(k, m4); } bal.castShadow = true; bal.receiveShadow = true; scene.add(bal);
      const cs = new THREE.Shape(); cs.moveTo(0, 0); cs.lineTo(1.0, 0); cs.lineTo(1.0, -.12); cs.quadraticCurveTo(.25, -.15, .08, -.85); cs.lineTo(0, -.85); cs.closePath();
      const cg = new THREE.ExtrudeGeometry(cs, { depth: .16, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1, curveSegments: 10 }); cg.translate(0, 0, -.08);
      for (let i = 0; i <= HALL.bays; i++) { const br = new THREE.Mesh(cg, walnut); br.position.set(4.5, 3.59, bayZ(i)); br.rotation.y = Math.PI; br.castShadow = br.receiveShadow = true; scene.add(br); } }

    const all = items.concat(late); R.nStatic = items.length; R.late = late;
    late.forEach(r => { r.t0 = 4.85 + (r.i * .15 + (5 - r.k) * .045 + (1 - r.x) * .12) + rnd() * .1; });
    const books = bookInstances(all); scene.add(books); R.books = books;
    R.tmpM = new THREE.Matrix4(); R.zero = new THREE.Matrix4().makeScale(0, 0, 0);

    // ---- lectern + hero book (Şifâ-i Şerif) in the sunbeam ----------------------------------------------------
    const lec = new THREE.Group(); lec.position.set(.02, 0, -9.5); lec.rotation.y = .42; scene.add(lec); R.lec = lec;
    { const base = M.lathe([[0, 0], [.3, 0], [.3, .05], [.22, .09], [.11, .14], [.085, .3], [.1, .55], [.08, .75], [.13, .84], [.0, .86]], walnut, 8); lec.add(base);
      const topB = new THREE.Mesh(M.rbox(.62, .04, .46, .012, 2), walnut); const tilt = new THREE.Group(); tilt.position.set(0, .93, 0); tilt.rotation.x = .42; lec.add(tilt); tilt.add(topB);
      const lip = new THREE.Mesh(M.rbox(.62, .05, .03, .01, 2), walnut); lip.position.set(0, .035, .22); tilt.add(lip);
      const post = new THREE.Mesh(M.rbox(.14, .2, .14, .02, 2), walnut); post.position.set(0, .86, 0); lec.add(post);
      shadowify(lec);
      // hero book: Islamic binding (spine on the right, fore-edge flap), gold-tooled şemse and a title cartouche with الشفا
      const w = .24, h = .33, d = .065;
      const cover = (x, W, H) => {
        x.clearRect(0, 0, W, H); x.save(); x.translate(W, H); x.rotate(Math.PI); // book is turned 180° (spine on the right)
        const gold = x.createLinearGradient(0, 0, W, H); gold.addColorStop(0, '#f7da8e'); gold.addColorStop(.35, '#d6a243'); gold.addColorStop(.6, '#f3cf7a'); gold.addColorStop(1, '#b27f2a'); x.strokeStyle = gold; x.fillStyle = gold;
        x.lineWidth = W * .014; x.strokeRect(W * .06, H * .045, W * .88, H * .91); x.lineWidth = W * .006; x.strokeRect(W * .09, H * .065, W * .82, H * .87);
        // chain border of small lozenges
        for (let k = 0; k < 22; k++) { const yy = H * (.09 + k * .82 / 21); for (const xx of [W * .075, W * .925]) { x.save(); x.translate(xx, yy); x.rotate(Math.PI / 4); x.fillRect(-W * .007, -W * .007, W * .014, W * .014); x.restore(); } }
        const cx = W / 2, cy = H * .55;
        x.save(); x.translate(cx, cy); x.beginPath(); x.ellipse(0, 0, W * .25, H * .165, 0, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.moveTo(0, -H * .2); x.lineTo(W * .03, -H * .165); x.lineTo(-W * .03, -H * .165); x.fill(); x.beginPath(); x.moveTo(0, H * .2); x.lineTo(W * .03, H * .165); x.lineTo(-W * .03, H * .165); x.fill();
        x.fillStyle = '#5a1610'; x.beginPath(); x.ellipse(0, 0, W * .2, H * .125, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = gold; for (let k = 0; k < 12; k++) { x.save(); x.rotate(k * Math.PI / 6); x.beginPath(); x.ellipse(0, -W * .1, W * .016, W * .05, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
        x.beginPath(); x.arc(0, 0, W * .035, 0, 7); x.fill(); x.restore();
        // corner pieces
        x.globalAlpha = .9; [[W * .09, H * .065, 0], [W * .91, H * .065, Math.PI / 2], [W * .91, H * .935, Math.PI], [W * .09, H * .935, -Math.PI / 2]].forEach(([px, py, r]) => { x.save(); x.translate(px, py); x.rotate(r); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, W * .13, 0, Math.PI / 2); x.closePath(); x.fill(); x.restore(); }); x.globalAlpha = 1;
        // title cartouche (dark leather inlay) with the Arabic title
        const ty = H * .2; x.fillStyle = '#2a0e0a'; x.beginPath(); x.ellipse(cx, ty, W * .27, H * .055, 0, 0, Math.PI * 2); x.fill(); x.lineWidth = W * .008; x.strokeStyle = gold; x.stroke();
        x.fillStyle = gold; x.font = `700 ${Math.round(W * .13)}px Amiri`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText('الشفا', cx, ty + H * .004);
        x.restore();
      };
      const hb = M.book({ w, h, d, color: '#7a2216', dark: '#3a0e08', seed: 5, gold: false, coverDraw: cover, pageColor: '#e8d9b8' });
      hb.traverse(o => { if (o.isMesh && o.material && o.material.map && o.material.transparent) { o.material.metalness = .7; o.material.roughness = .32; } });
      const flap = new THREE.Mesh(M.rbox(.006, h, d + .01, .003, 2), hb.children[1].material); flap.position.x = w / 2 + .002; hb.add(flap);
      hb.rotation.z = Math.PI; // spine to the right
      const hold = new THREE.Group(); hold.position.set(0, .02 + d / 2, -.01); hold.rotation.x = -Math.PI / 2; // lie on the board, cover up
      hold.add(hb); tilt.add(hold); shadowify(hold);
      R.hero = hold; R.heroTilt = tilt; }
    // a reading table nearby with small stacks of volumes
    { const tbl = new THREE.Group(); tbl.position.set(-2.0, 0, -12.2); tbl.rotation.y = .1; scene.add(tbl);
      const top = new THREE.Mesh(M.rbox(1.6, .07, .8, .02, 2), walnut); top.position.y = .78; tbl.add(top);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(M.rbox(.08, .76, .08, .02, 1), walnutDark); l.position.set(sx * .7, .38, sz * .32); tbl.add(l); }
      const st = []; const rr = U.rng(9); let yy = .815; [[.3, .22, .06], [.28, .21, .05], [.26, .2, .07], [.25, .19, .045]].forEach(([w, h, d], k) => { st.push({ pos: [-.35 + (rr() - .5) * .03, yy + d / 2, (rr() - .5) * .03], rot: [0, (rr() - .5) * .3, Math.PI / 2], s: [d, h, w], color: ['#2f4a2c', '#7a2418', '#24304f', '#8a5a30'][k], v: k }); yy += d; });
      yy = .815; [[.28, .2, .06], [.27, .2, .05]].forEach(([w, h, d], k) => { st.push({ pos: [.4, yy + d / 2, .05], rot: [0, .4 + k * .2, Math.PI / 2], s: [d, h, w], color: ['#5a1a2a', '#6b4226'][k], v: k + 3 }); yy += d; });
      shadowify(tbl);
      tbl.updateMatrixWorld(true); const tb = bookInstances(st.map(it => ({ m: itemMatrix(it, tbl.matrixWorld), color: it.color, v: it.v }))); scene.add(tb); }

    // ---- light shafts + dust ------------------------------------------------------------------------------
    R.shafts = [];
    R.windows.forEach((zc, i) => {
      const from = new THREE.Vector3(-5.6, 5.6, zc); const k = (from.y - .2) / -SUND.y; const to = from.clone().addScaledVector(SUND, k);
      const sh = FX.lightShaft({ from: from.toArray(), to: to.toArray(), r0: .7, r1: .95, color: '#ffd9a0', opacity: .05 }); scene.add(sh); R.shafts.push(sh);
    });
    const motes = FX.particles({ count: 700, center: [0, 3, -9], box: [9, 6, 26], size: 5, color: '#ffe6b8', opacity: .55, drift: [.03, .02, -.01], swirl: .08 }); scene.add(motes);

    camera.near = .05; camera.far = 120; camera.updateProjectionMatrix();
    // ---- camera ---------------------------------------------------------------------------------------------
    const bookP = new THREE.Vector3(); R.hero.updateMatrixWorld(true); R.hero.getWorldPosition(bookP); R.bookP = bookP;
    const BP = bookP.toArray();
    const add = (a, b) => a.map((v, i) => v + b[i]);
    const c0 = [2.45, 1.35, 3.6], c1 = [2.15, 1.5, -2.8], c2 = add(BP, [.72, .7, 1.12]), c3 = add(BP, [.46, .6, .9]), c3b = add(BP, [.66, .76, 1.25]);
    const c4a = [.4, 2.9, -2.4], c4 = [-1.6, 4.6, 1.2], c5 = [-.7, 5.25, -3.4];
    const k0 = aim(c0, [4.6, 1.55, -3.5]), k1 = aim(c1, [.2, .95, -9.6]), k2 = aim(c2, BP), k3 = aim(c3, BP), k3b = aim(c3b, BP), k4a = aim(c4a, [3.2, 3.0, -11]), k4 = aim(c4, [2.5, 3.2, -12]), k5 = aim(c5, [3.0, 3.1, -15.5]);
    R.cam = camPath([
      [-0.6, [2.5, 1.32, 4.3], k0[0] - 1, k0[1], 40],
      [0.0, c0, k0[0], k0[1], 40],
      [1.75, c1, k1[0], k1[1], 40],
      [2.7, c2, k2[0], k2[1], 34],
      [4.4, c3, k3[0] + 1.5, k3[1], 33],
      [4.75, c3b, k3b[0] + 1, k3b[1] + 4, 35],
      [5.3, c4a, k4a[0], k4a[1], 40],
      [5.95, c4, k4[0], k4[1], 42],
      [10.3, c5, k5[0] - 2, k5[1] + 1, 40],
    ]);
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    R.cam.apply(camera, t, U.shake(t, .01, .5, 11));
    // time-lapse fill of the upper shelves
    const bk = R.books.userData; const n0 = R.nStatic; let shown = 0;
    R.late.forEach((r, j) => {
      const p = U.clamp((t - r.t0) / .32);
      if (p <= 0) { bk.setMatrix(n0 + j, R.zero); return; }
      shown++;
      if (p >= 1) { bk.setMatrix(n0 + j, r.m); return; }
      const e = U.ease.outBack(p, 1.6); const m = R.tmpM.copy(r.m); const off = (1 - e);
      m.elements[12] += -r.side * off * .8; m.elements[13] += off * .3; // slides in from the front, settling down
      bk.setMatrix(n0 + j, m);
    });
    bk.commit(); R.shown = shown;
    // DOF: on the shelves / hero book, then wide
    const bf = U.smoothstep(1.6, 2.6, t) * (1 - U.smoothstep(4.6, 5.4, t)), wide = U.smoothstep(4.9, 5.9, t);
    const fBase = U.lerp(7, camera.position.distanceTo(new THREE.Vector3(4.3, 3.3, -8)), wide);
    post.dof.focus = U.lerp(fBase, camera.position.distanceTo(R.bookP), bf);
    post.dof.range = U.lerp(U.lerp(7, 18, wide), .9, bf); post.dof.amount = U.lerp(U.lerp(.5, .18, wide), .85, bf);
    R.shafts.forEach((s, i) => { s.userData.uniforms.opacity.value = .045 + .012 * Math.sin(t * .7 + i); });

    // ---- typography ----------------------------------------------------------------------------------------
    const tS = ctx.wordTime('şifa'), tSe = ctx.wordTime('şerif'), tK = ctx.wordTime('kitaplar'), tY = ctx.wordTime('yüzlerce'), tC = ctx.wordTime('ciltlerle');
    const tYu = ctx.wordTime('yüksek'), tB = ctx.wordTime('beyan'), tI = ctx.wordTime('ispat');
    ui.text('Şifâ-i Şerif', { t, t0: tS - .05, t1: tY - .05, x: 540, y: 330, size: 104, weight: 900, family: 'Playfair Display', color: '#ffd98a', anim: 'pop', stroke: 'rgba(40,20,8,.55)', strokeW: 12 });
    ui.pill('Kadı İyâz (ö. 1149)', { t, t0: tSe - .05, t1: tY - .05, x: 540, y: 450, size: 44, weight: 800, bg: 'rgba(40,22,12,.72)', color: '#fff1d6' });
    ui.text('yüzlerce cilt', { t, t0: tY - .05, t1: tYu - .1, x: 540, y: 330, size: 92, weight: 900, color: '#ffd98a', anim: 'pop', stroke: 'rgba(40,20,8,.55)', strokeW: 12 });
    tally(ui, U, t, tY + .05, tYu - .1, R.shown / Math.max(1, R.late.length));
    ui.text('“yüksek ahlâk” mu\'cizesi', { t, t0: tYu - .05, t1: 99, x: 540, y: 330, size: 62, weight: 500, family: 'Lora', italic: true, color: '#fff4dc', anim: 'rise', stroke: 'rgba(40,20,8,.5)', strokeW: 8 });
    const hit = U.clamp((t - (tI - .04)) / .16); const jolt = hit > 0 && hit < 1 ? Math.sin(hit * Math.PI) : 0;
    ui.text('beyan ve ispat', { t, t0: tB - .05, t1: 99, x: 540, y: 455, size: 84 * (1 - .05 * jolt), weight: 900, color: '#ffd98a', anim: 'pop', stroke: 'rgba(40,20,8,.55)', strokeW: 12 });
    if (hit > 0) { // rubber-stamp frame slams down on "ispat"
      const X = ui.ctx, sc = 1 + .35 * (1 - U.ease.outCubic(hit)); X.save(); X.globalAlpha = Math.min(1, hit * 2.5) * .92; X.translate(540, 458); X.rotate(-.035); X.scale(sc, sc);
      X.strokeStyle = '#e04a3c'; X.lineWidth = 9; ui.rrect(-330, -68, 660, 136, 22); X.stroke(); X.lineWidth = 3.5; ui.rrect(-314, -54, 628, 108, 14); X.stroke(); X.restore(); }
  },
};
// Kurzgesagt-style pictogram tally: rows of little book spines filling in step with the shelves (no invented number)
function tally(ui, U, t, t0, t1, frac) {
  const e = ui.env(t, t0, t1, .3, 'fade'); if (e.o <= .001) return; const X = ui.ctx; const cols = 18, rows = 2, bw = 26, bh = 58, gap = 9;
  const W = cols * (bw + gap) - gap, x0 = 540 - W / 2, y0 = 405; const n = Math.round(frac * cols * rows);
  const cs = ['#c0392b', '#2e7d4f', '#2f4f8f', '#b7791f', '#7b3f2a', '#8e2c48'];
  X.save(); X.globalAlpha = e.o;
  X.fillStyle = 'rgba(30,16,8,.55)'; ui.rrect(x0 - 18, y0 - 16, W + 36, rows * (bh + gap) - gap + 32, 18); X.fill();
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const k = r * cols + c; const x = x0 + c * (bw + gap), y = y0 + r * (bh + gap);
    if (k < n) { const s = Math.min(1, (frac * cols * rows - k) * 1.5); X.save(); X.translate(x + bw / 2, y + bh); X.scale(1, .3 + .7 * U.ease.outBack(U.clamp(s), 2)); X.fillStyle = cs[(k * 7) % cs.length]; ui.rrect(-bw / 2, -bh, bw, bh, 5); X.fill(); X.fillStyle = '#f2c860'; X.fillRect(-bw / 2, -bh * .78, bw, 3); X.fillRect(-bw / 2, -bh * .25, bw, 3); X.restore(); }
    else { X.strokeStyle = 'rgba(255,240,210,.25)'; X.lineWidth = 2; ui.rrect(x + 2, y + 2, bw - 4, bh - 4, 5); X.stroke(); } }
  X.restore();
}
function shadowify(o) { o.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); }
