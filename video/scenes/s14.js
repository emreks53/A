// s14 (77.75–87.50) "Şu ana kadar yazılmış başta Şifa-i Şerif gibi çok kitaplar yüzlerce ciltlerle bu "yüksek ahlak"
// mu'cizesini beyan ve ispat etmiştir."
// Visual: a grand old manuscript library (stone piers + pointed arches, two tiers of walnut shelving with a gallery,
// tall arched windows letting warm morning sun shafts in, dust motes). The camera glides along the shelves to a lectern in
// the sunbeam: the hero binding "Şifâ-i Şerif" (Kadı İyâz). On "yüzlerce ciltlerle" it pulls back and cranes up: the upper
// shelves fill with volumes in a rapid time-lapse wave (counter), revealing the immense wall. "beyan ve ispat" stamp.
import * as THREE from 'three';
import { aim, bookInstances, fillShelf, itemMatrix } from '../engine/lib/extra_F.js';

let R = {};
const HALL = { x0: -5, x1: 5, z0: 5.5, z1: -27, bays: 9, bayW: 3.4, zStart: 4.6 };

export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.5, radius: 0.7, threshold: 0.8 },
    grade: { contrast: 1.08, saturation: 1.08, warmth: 0.02, lift: [0.0, 0.008, 0.022], gain: [1.03, 1.0, 0.97] },
    vignette: 0.45, grain: 0.03, aberration: 0.0007,
    dof: { enabled: true, focus: 8, range: 6, amount: 0.8 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx;
    R = {};
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
      const n = 4, s = W / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const c = (i + j) % 2 ? '#b48f66' : '#c9ad86'; x.fillStyle = c; x.fillRect(i * s, j * s, s, s);
        for (let k = 0; k < 60; k++) { x.fillStyle = `rgba(${(i + j) % 2 ? '120,80,50' : '160,130,100'},0.06)`; x.beginPath(); x.ellipse(i * s + ((k * 37) % s), j * s + ((k * 71) % s), 20 + (k % 7) * 9, 6 + (k % 5) * 3, k, 0, 7); x.fill(); } }
      x.strokeStyle = '#7d6347'; x.lineWidth = 5; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, H); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(W, i * s); x.stroke(); } });
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping; tileTex.repeat.set(4, 13);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10.4, 34).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: tileTex, roughness: .5, clearcoat: .18, clearcoatRoughness: .5 }));
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
    const archM = M.MAT.stone({ a: '#dcc8a6', b: '#bda381', seed: 41, repeat: [1, 2] }); // lower-contrast grain: big soffits read as dressed stone, not blotches
    for (let i = 0; i <= HALL.bays; i++) { const m = new THREE.Mesh(tArch, archM); m.position.set(0, 7.75, bayZ(i)); m.castShadow = m.receiveShadow = true; arch.add(m); }
    // vault/ceiling: warm plaster barrel segments between arches (lime plaster texture; faint warm emissive = sun bounce
    // off the lit floor, so the big ceiling planes don't go cold-lavender under the blue skylight)
    const vaultGeo = new THREE.CylinderGeometry(4.9, 4.9, HALL.bayW, 24, 1, true, -Math.PI / 2, Math.PI); vaultGeo.rotateX(-Math.PI / 2); vaultGeo.scale(1, .68, 1);
    const vaultMat = M.MAT.plaster({ a: '#eed6aa', b: '#d3b282', seed: 12, repeat: [5, 1] }); vaultMat.side = THREE.BackSide;
    vaultMat.emissive = new THREE.Color('#3c2410'); vaultMat.emissiveIntensity = 1;
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
    // time-lapse wave. Bays 0–3 are never in the wide frame: they fill off-screen during the whip (so the tally starts on
    // "ciltlerle"). Bays 8→4 fill in view, far→near, as the whip lands on the right wall and the crane settles (5.4–6.4).
    // (one rnd() per book either way -> the random sequence / shelf layout is unchanged)
    late.forEach(r => { const j = rnd() * .06;
      r.t0 = r.i < 4 ? 4.95 + r.i * .1 + (5 - r.k) * .02 + r.x * .05 + j : 5.42 + (8 - r.i) * .17 + (5 - r.k) * .03 + r.x * .1 + j; });
    const books = bookInstances(all); scene.add(books); R.books = books;
    // anti-shimmer for the hundreds of small spines at full resolution: sample the spine atlas one mip softer and keep
    // gilt bands from turning into sub-pixel specular sparkles (roughness floor).
    { const sm = books.userData.meshes[1].material; const prev = sm.onBeforeCompile;
      sm.onBeforeCompile = sh => { prev(sh);
        sh.fragmentShader = sh.fragmentShader
          .replace('texture2D(metalnessMap, vMetalnessMapUv).r', 'texture2D(metalnessMap, vMetalnessMapUv, 1.0).r')
          .replace('#include <map_fragment>', '#ifdef USE_MAP\n vec4 sampledDiffuseColor = texture2D( map, vMapUv, 1.0 ); diffuseColor *= sampledDiffuseColor;\n#endif')
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = roughness;\n#ifdef USE_ROUGHNESSMAP\n roughnessFactor *= texture2D( roughnessMap, vRoughnessMapUv, 1.0 ).g;\n#endif\n roughnessFactor = max(roughnessFactor, .5);')
          .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = metalness;\n#ifdef USE_METALNESSMAP\n metalnessFactor *= texture2D( metalnessMap, vMetalnessMapUv, 1.0 ).b * .85;\n#endif'); };
      sm.customProgramCacheKey = () => 'F_spine_atlas_s14aa'; sm.needsUpdate = true; }
    R.tmpM = new THREE.Matrix4(); R.sclM = new THREE.Matrix4(); R.zero = new THREE.Matrix4().makeScale(0, 0, 0);

    // ---- lectern + hero book (Şifâ-i Şerif) in the sunbeam ----------------------------------------------------
    const lec = new THREE.Group(); lec.position.set(.02, 0, -9.5); lec.rotation.y = .42; scene.add(lec); R.lec = lec;
    { const base = M.lathe([[0, 0], [.3, 0], [.3, .035], [.28, .05], [.23, .07], [.205, .09], [0, .09]], walnutDark, 8); lec.add(base); // octagonal plinth
      const col = M.lathe([[0, .09], [.13, .09], [.135, .105], [.11, .125], [.08, .15], [.072, .19], [.088, .225], [.072, .26], [.06, .32], [.066, .4], [.086, .48], [.097, .54], [.09, .6], [.072, .66], [.062, .7],
        [.082, .725], [.09, .745], [.074, .765], [.1, .79], [.122, .815], [.13, .84], [0, .86]], walnut, 32); lec.add(col); // turned baluster with beads and coves
      const topB = new THREE.Mesh(M.rbox(.62, .04, .46, .012, 2), walnut); const tilt = new THREE.Group(); tilt.position.set(0, .93, 0); tilt.rotation.x = .42; lec.add(tilt); tilt.add(topB);
      const lip = new THREE.Mesh(M.rbox(.62, .05, .03, .01, 2), walnut); lip.position.set(0, .035, .22); tilt.add(lip);
      const post = new THREE.Mesh(M.rbox(.14, .2, .14, .02, 2), walnut); post.position.set(0, .86, 0); lec.add(post);
      shadowify(lec);
      // hero book: classical Ottoman şemseli binding (oxblood morocco, gold-tooled şemse + salbek pendants, köşebent
      // corner pieces, zencerek chain border; spine on the right, fore-edge flap). No lettering on the cover (as on
      // real Islamic bindings — the title is given by the overlay).
      const w = .24, h = .33, d = .065;
      const hb = heroBinding(ctx, { w, h, d });
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
    const motes = FX.particles({ count: 620, center: [0, 2.3, -9], box: [9, 3.6, 26], size: 5, color: '#ffe6b8', opacity: .55, drift: [.03, .02, -.01], swirl: .08 }); scene.add(motes); // kept below the crane height (no giant bokeh blobs in the wide shot)

    camera.near = .05; camera.far = 120; camera.updateProjectionMatrix();
    // ---- camera ---------------------------------------------------------------------------------------------
    const bookP = new THREE.Vector3(); R.hero.updateMatrixWorld(true); R.hero.getWorldPosition(bookP); R.bookP = bookP;
    const BP = bookP.toArray();
    const add = (a, b) => a.map((v, i) => v + b[i]);
    // arc-length camera rig: position speed and yaw/pitch are C1-smooth (no dead stops, no jerks); whip move eased
    R.cam = rig(THREE, [
      [-0.6, [2.5, 1.32, 4.3]], [0.0, [2.42, 1.36, 3.4]], [1.0, [2.15, 1.45, -1.2]], [1.95, [1.45, 1.6, -5.9]], [2.75, add(BP, [.72, .7, 1.12])],
      [4.2, add(BP, [.46, .6, .92])], [4.7, add(BP, [.62, .8, 1.3])], [5.35, [.7, 2.8, -4.6]], [6.25, [-.9, 4.5, -.6]], [10.3, [-1.75, 5.1, 1.6]],
    ], [
      [-0.6, [4.6, 1.5, -3.2], -3.4, 0], [0.0, [4.6, 1.55, -3.5]], [1.0, [2.0, 1.15, -9.0]], [1.95, [0.25, 1.0, -9.55]], [2.75, BP],
      [4.2, BP, 1.5, 0], [4.65, BP, 1, 3], [5.7, [2.2, 3.62, -11.5]], [6.8, [2.6, 5.0, -12.5]], [10.3, [2.9, 5.55, -14.5]], // last key aimed a bit higher: lectern stays out of the bottom-left corner
    ], [[-0.6, 40], [0, 40], [1.75, 40], [2.7, 34], [4.4, 33], [4.75, 35], [5.3, 40], [5.95, 42], [10.3, 40]]);
    // motion-blur driver: a fixed cloud of points on the set (shelf fronts, floor, vault, gallery rail, lectern + hero book);
    // camFlow(t) = max image-space motion (px/frame) of the in-frame points, measured on the rig itself -> pure in t.
    { const P = []; const p3 = (x, y, z) => P.push(x, y, z);
      for (let z = 4.5; z >= -26; z -= 1) { for (const y of [.4, 1.4, 2.4, 3.4, 4.4, 5.4, 6.4]) p3(4.42, y, z); for (const y of [.4, 1.4, 2.4, 5, 7]) p3(-4.42, y, z);
        for (const x of [-3, -1, 1, 3]) p3(x, 0, z); for (const x of [-3, 0, 3]) p3(x, 9, z); p3(3.48, 4.68, z); }
      R.heroTilt.updateWorldMatrix(true, false); const v = new THREE.Vector3();
      for (const x of [-.31, 0, .31]) for (const z of [-.23, 0, .23]) { v.set(x, .03, z).applyMatrix4(R.heroTilt.matrixWorld); p3(v.x, v.y, v.z); }
      for (const y of [.1, .5, .85]) p3(.02, y, -9.5);
      R.flowP = new Float32Array(P); R.flowCam = camera.clone(); R.flowM = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()]; }
  },
  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    R.cam.apply(camera, t, U.shake(t, .008, .5, 11));
    // time-lapse fill of the upper shelves
    const bk = R.books.userData; const n0 = R.nStatic; let shown = 0;
    R.late.forEach((r, j) => {
      const p = U.clamp((t - r.t0) / .42);
      if (p <= 0) { bk.setMatrix(n0 + j, R.zero); return; }
      shown++;
      if (p >= 1) { bk.setMatrix(n0 + j, r.m); return; }
      const e = U.ease.outBack(p, 1.15); const m = R.tmpM.copy(r.m); const off = (1 - e);
      m.elements[12] += -r.side * off * .7; m.elements[13] += off * .25; // slides in from the front, settling down
      const s = .3 + .7 * U.smoothstep(0, .3, p); if (s < 1) m.multiply(R.sclM.makeScale(s, s, s)); // grows in instead of popping into existence mid-air
      bk.setMatrix(n0 + j, m);
    });
    bk.commit(); R.shown = shown;
    // DOF: on the shelves / hero book, then wide (focus on the upper tier of bays 4–8, where the time-lapse plays)
    const bf = U.smoothstep(1.6, 2.6, t) * (1 - U.smoothstep(4.6, 5.4, t)), wide = U.smoothstep(4.9, 5.9, t);
    const fBase = U.lerp(7, camera.position.distanceTo(R.wideFocus || (R.wideFocus = new THREE.Vector3(4.4, 4.6, -14))), wide);
    post.dof.focus = U.lerp(fBase, camera.position.distanceTo(R.bookP), bf);
    post.dof.range = U.lerp(U.lerp(7, 12, wide), .9, bf); post.dof.amount = U.lerp(U.lerp(.5, .5, wide), .85, bf);
    // motion blur driven by the actual image motion of the set (engine reads post.motionBlur right after update(t) for this
    // same frame). Constant 0.4 shutter -> the blur length grows/shrinks continuously with the motion; sub-frames are added
    // so that the copies are never more than ~4 px apart (no stepped ghosts, no sharp<->ghosted snaps).
    { const shutter = .4, bpx = camFlow(t) * shutter; post.motionBlur = { samples: bpx < 4 ? 1 : Math.min(8, Math.ceil(bpx / 4)), shutter }; }
    R.shafts.forEach((s, i) => { s.userData.uniforms.opacity.value = .045 + .012 * Math.sin(t * .7 + i); });

    // ---- typography ----------------------------------------------------------------------------------------
    const tS = ctx.wordTime('şifa'), tSe = ctx.wordTime('şerif'), tK = ctx.wordTime('kitaplar'), tY = ctx.wordTime('yüzlerce'), tC = ctx.wordTime('ciltlerle');
    const tYu = ctx.wordTime('yüksek'), tB = ctx.wordTime('beyan'), tI = ctx.wordTime('ispat');
    ui.text('Şifâ-i Şerif', { t, t0: tS - .05, t1: tY - .05, x: 540, y: 330, size: 104, weight: 900, family: 'Playfair Display', color: '#ffd98a', anim: 'pop', stroke: 'rgba(40,20,8,.55)', strokeW: 12 });
    ui.pill('Kadı İyâz (ö. 1149)', { t, t0: tSe - .05, t1: tY - .05, x: 540, y: 450, size: 44, weight: 800, bg: 'rgba(40,22,12,.72)', color: '#fff1d6' });
    ui.text('yüzlerce cilt', { t, t0: tY - .05, t1: tYu - .1, x: 540, y: 330, size: 92, weight: 900, color: '#ffd98a', anim: 'pop', stroke: 'rgba(40,20,8,.55)', strokeW: 12 });
    tally(ui, U, t, tY + .05, tYu + .2, R.shown / Math.max(1, R.late.length));
    { const e = ui.env(t, tYu - .25, 99, .5, 'fade'); if (e.o > .001) { const X = ui.ctx, g = X.createLinearGradient(0, 230, 0, 600); g.addColorStop(0, 'rgba(34,18,8,0)'); g.addColorStop(.25, 'rgba(34,18,8,.42)'); g.addColorStop(.7, 'rgba(34,18,8,.36)'); g.addColorStop(1, 'rgba(34,18,8,0)');
      X.save(); X.globalAlpha = e.o; X.fillStyle = g; X.fillRect(0, 230, 1080, 370); X.restore(); } } // soft scrim: cream/gold type over the bright vault
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

// ---------------------------------------------------------------------------------------------------------------
// Hero binding: one hand-made cover map set (colour / tangent normal / roughness+metalness) baked from canvas masks.
// Local frame like MODELS.book: x across the cover (spine at -x), y = height, z = thickness (front cover at +z).
function heroBinding(ctx, { w, h, d }) {
  const { THREE: T, MODELS: M, U } = ctx; const g = new T.Group(); const ct = .0055;
  const CW = 832, CH = Math.round(CW * h / w); const r = U.rng(1149);
  const mk = () => { const c = document.createElement('canvas'); c.width = CW; c.height = CH; return [c, c.getContext('2d')]; };
  // ---- masks: gold tooling (gm) and blind tooling (bm), white on black -------------------------------------------
  const [gC, gx] = mk(), [bC, bx] = mk(); [gx, bx].forEach(x => { x.fillStyle = '#000'; x.fillRect(0, 0, CW, CH); x.fillStyle = x.strokeStyle = '#fff'; x.lineCap = x.lineJoin = 'round'; });
  const W = CW, H = CH, cx = W / 2, cy = H / 2;
  const frame = (x, inset, lw) => { x.lineWidth = lw; x.strokeRect(inset, inset, W - inset * 2, H - inset * 2); };
  frame(gx, W * .032, W * .007); frame(gx, W * .104, W * .0055); frame(bx, W * .118, W * .004); frame(bx, W * .02, W * .003);
  // zencerek: a chain of small stamped rosettes between the two gold fillets
  const stamp = (x, px, py, s) => { x.save(); x.translate(px, py); for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.beginPath(); x.ellipse(0, -s * .55, s * .26, s * .45, 0, 0, 7); x.fill(); } x.beginPath(); x.arc(0, 0, s * .2, 0, 7); x.fillStyle = '#000'; x.fill(); x.fillStyle = '#fff'; x.restore(); };
  const bi = W * .068, step = W * .046;
  for (let px = bi; px <= W - bi + 1; px += (W - 2 * bi) / Math.round((W - 2 * bi) / step)) { stamp(gx, px, bi, W * .03); stamp(gx, px, H - bi, W * .03); }
  for (let py = bi; py <= H - bi + 1; py += (H - 2 * bi) / Math.round((H - 2 * bi) / step)) { stamp(gx, bi, py, W * .03); stamp(gx, W - bi, py, W * .03); }
  // rumi/hatayi scrollwork cut out of a gold ground (thin leather-coloured lines inside the gold)
  // şemse: cusped almond medallion
  const semse = (x, sx, sy, fill = true) => { x.beginPath(); const N = 96; for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2; const ca = Math.cos(a), sa = Math.sin(a);
      const pr = 1 + .1 * Math.pow(Math.abs(sa), 6); const cusp = 1 + .035 * Math.cos(a * 16); const px = cx + ca * sx * cusp, py = cy + sa * sy * pr * cusp * (1 - .18 * ca * ca); i ? x.lineTo(px, py) : x.moveTo(px, py); }
    x.closePath(); fill ? x.fill() : x.stroke(); };
  const SX = W * .25, SY = H * .19;
  semse(gx, SX, SY);
  for (const s of [-1, 1]) { // salbek pendants + stem
    gx.beginPath(); gx.moveTo(cx, cy + s * SY * 1.02); gx.lineTo(cx, cy + s * SY * 1.22); gx.lineWidth = W * .012; gx.stroke();
    gx.save(); gx.translate(cx, cy + s * SY * 1.33); gx.beginPath(); gx.ellipse(0, 0, W * .07, H * .038, 0, 0, 7); gx.fill();
    gx.beginPath(); gx.moveTo(-W * .03, s * H * .03); gx.lineTo(0, s * H * .07); gx.lineTo(W * .03, s * H * .03); gx.fill(); gx.restore(); }
  // symmetric arabesque cut into the gold ground (leather-coloured lines in relief): inner contour, central
  // rosette, rumi scrolls on the diagonals and on the vertical axis — drawn in one quadrant, mirrored.
  gx.save(); gx.globalCompositeOperation = 'destination-out'; gx.strokeStyle = '#000'; gx.fillStyle = '#000'; gx.lineWidth = W * .0105;
  gx.save(); gx.lineWidth = W * .006; semse(gx, SX * .84, SY * .84, false); gx.restore();
  gx.beginPath(); gx.arc(cx, cy, W * .062, 0, 7); gx.stroke();
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + Math.PI / 8; gx.beginPath(); gx.ellipse(cx + Math.cos(a) * W * .036, cy + Math.sin(a) * W * .036, W * .024, W * .01, a, 0, 7); gx.stroke(); }
  gx.beginPath(); gx.arc(cx, cy, W * .011, 0, 7); gx.fill();
  for (const sxm of [-1, 1]) for (const sym of [-1, 1]) { gx.save(); gx.translate(cx, cy); gx.scale(sxm, sym);
    gx.beginPath(); gx.moveTo(W * .052, H * .03); gx.bezierCurveTo(W * .1, H * .035, W * .1, H * .085, W * .15, H * .09); gx.stroke();
    gx.beginPath(); for (let k = 0; k <= 26; k++) { const a = -Math.PI / 2 + k * .3, rad = W * .032 * (1 - k / 30); const px = W * .165 + Math.cos(a) * rad, py = H * .072 + Math.sin(a) * rad; k ? gx.lineTo(px, py) : gx.moveTo(px, py); } gx.stroke();
    gx.beginPath(); gx.moveTo(W * .1, H * .055); gx.quadraticCurveTo(W * .13, H * .02, W * .175, H * .025); gx.quadraticCurveTo(W * .14, H * .045, W * .115, H * .062); gx.stroke();
    gx.beginPath(); gx.moveTo(W * .012, H * .045); gx.bezierCurveTo(W * .05, H * .07, W * .015, H * .11, W * .04, H * .135); gx.stroke();
    gx.beginPath(); for (let k = 0; k <= 22; k++) { const a = Math.PI + k * .32, rad = W * .022 * (1 - k / 26); const px = W * .06 + Math.cos(a) * rad, py = H * .138 + Math.sin(a) * rad; k ? gx.lineTo(px, py) : gx.moveTo(px, py); } gx.stroke();
    gx.restore(); }
  gx.restore();
  semse(gx, SX * 1.06, SY * 1.06, false); gx.lineWidth = W * .004; semse(gx, SX * 1.06, SY * 1.06, false);
  // köşebent corner pieces (quarter medallions with cusped edges)
  const ci = W * .118;
  [[ci, ci, 0], [W - ci, ci, 1], [W - ci, H - ci, 2], [ci, H - ci, 3]].forEach(([px, py, k]) => { gx.save(); gx.translate(px, py); gx.rotate(k * Math.PI / 2);
    gx.beginPath(); gx.moveTo(0, 0); const R0 = W * .19; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI / 2; const rr = R0 * (1 + .05 * Math.cos(a * 18)); gx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } gx.closePath(); gx.fill(); gx.restore(); });
  [[ci, ci, 0], [W - ci, ci, 1], [W - ci, H - ci, 2], [ci, H - ci, 3]].forEach(([px, py, k]) => { gx.save(); gx.translate(px, py); gx.rotate(k * Math.PI / 2); gx.globalCompositeOperation = 'destination-out'; gx.strokeStyle = '#000'; gx.lineWidth = W * .0065;
    gx.beginPath(); for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI / 2; const rr = W * .145 * (1 + .05 * Math.cos(a * 18)); i ? gx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : gx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } gx.stroke();
    gx.beginPath(); gx.moveTo(W * .02, W * .02); gx.bezierCurveTo(W * .07, W * .03, W * .05, W * .08, W * .1, W * .09); gx.stroke();
    gx.beginPath(); for (let i = 0; i <= 20; i++) { const a = i * .33, rad = W * .022 * (1 - i / 24); const qx = W * .1 + Math.cos(a) * rad, qy = W * .07 + Math.sin(a) * rad; i ? gx.lineTo(qx, qy) : gx.moveTo(qx, qy); } gx.stroke();
    gx.restore(); });
  // blind-tooled fine lines echoing the şemse
  bx.lineWidth = W * .003; semse(bx, SX * 1.16, SY * 1.16, false);
  // ---- wear: gold rubbed off in small patches near the edges / corners ---------------------------------------------
  gx.save(); gx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i++) { const e = r(); const px = e < .5 ? (r() < .5 ? r() * W * .14 : W - r() * W * .14) : r() * W, py = e < .5 ? r() * H : (r() < .5 ? r() * H * .1 : H - r() * H * .1);
    const rr = (3 + r() * 9) * W / 832; const gg = gx.createRadialGradient(px, py, 0, px, py, rr); gg.addColorStop(0, `rgba(0,0,0,${.4 + r() * .5})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); gx.fillStyle = gg; gx.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  gx.restore();
  // ---- leather grain (height) + mottled colour --------------------------------------------------------------------
  const [hC, hx] = mk(); hx.fillStyle = 'rgb(128,128,128)'; hx.fillRect(0, 0, W, H);
  for (let i = 0; i < 46000; i++) { const v = r() < .5 ? 175 : 85; hx.fillStyle = `rgba(${v},${v},${v},${.18 + r() * .22})`; hx.beginPath(); hx.ellipse(r() * W, r() * H, .8 + r() * 2.2, .7 + r() * 1.8, r() * 3, 0, 7); hx.fill(); }
  hx.strokeStyle = 'rgba(70,70,70,.35)'; for (let i = 0; i < 26; i++) { hx.lineWidth = .8 + r() * 1.4; hx.beginPath(); let px = r() * W, py = r() * H; hx.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (r() - .5) * 60; py += (r() - .3) * 40; hx.lineTo(px, py); } hx.stroke(); }
  const [cC, cx2] = mk(); cx2.fillStyle = '#521310'; cx2.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { const px = r() * W, py = r() * H, rr = 30 + r() * 120; const lt = r() < .5; const gg = cx2.createRadialGradient(px, py, 0, px, py, rr); gg.addColorStop(0, lt ? 'rgba(130,44,30,.1)' : 'rgba(34,5,3,.14)'); gg.addColorStop(1, 'rgba(0,0,0,0)'); cx2.fillStyle = gg; cx2.fillRect(px - rr, py - rr, rr * 2, rr * 2); }
  { const eg = (x0, y0, x1, y1) => { const gg = cx2.createLinearGradient(x0, y0, x1, y1); gg.addColorStop(0, 'rgba(30,5,3,.55)'); gg.addColorStop(1, 'rgba(30,5,3,0)'); return gg; };
    cx2.fillStyle = eg(0, 0, W * .06, 0); cx2.fillRect(0, 0, W * .06, H); cx2.fillStyle = eg(W, 0, W * .94, 0); cx2.fillRect(W * .94, 0, W * .06, H);
    cx2.fillStyle = eg(0, 0, 0, W * .06); cx2.fillRect(0, 0, W, W * .06); cx2.fillStyle = eg(0, H, 0, H - W * .06); cx2.fillRect(0, H - W * .06, W, W * .06); }
  // ---- compose colour / height / roughness-metalness per pixel ----------------------------------------------------
  const soft = (c, px) => { const [o, x] = mk(); x.filter = `blur(${px}px)`; x.drawImage(c, 0, 0); return x.getImageData(0, 0, W, H).data; };
  const G1 = soft(gC, .6), G2 = soft(gC, 1.6), B2 = soft(bC, 1.2), HG = soft(hC, .6), CL = cx2.getImageData(0, 0, W, H).data;
  const [oC, ox] = mk(), [nC, nx] = mk(), [rC, rx] = mk(); const io = ox.createImageData(W, H), inn = nx.createImageData(W, H), ir = rx.createImageData(W, H);
  const HT = new Float32Array(W * H); const gn = U.rng(77);
  for (let k = 0, p = 0; k < W * H; k++, p += 4) {
    const gA = G1[p] / 255, gS = G2[p] / 255, bl = B2[p] / 255, gr = HG[p] / 255 - .5;
    const lr = CL[p] / 255 * (1 + gr * .5) * (1 - bl * .4), lg = CL[p + 1] / 255 * (1 + gr * .5) * (1 - bl * .4), lb = CL[p + 2] / 255 * (1 + gr * .5) * (1 - bl * .4);
    const n2 = gn() * .08; const gR = .92 - n2 * .3, gG = .76 - n2 * .35, gB = .43 - n2 * .3; // warm gold leaf with tiny speckle
    io.data[p] = 255 * (lr + (gR - lr) * gA); io.data[p + 1] = 255 * (lg + (gG - lg) * gA); io.data[p + 2] = 255 * (lb + (gB - lb) * gA); io.data[p + 3] = 255;
    HT[k] = gr * .22 * (1 - gA) - gS * .5 - bl * .32 + gA * gr * .05;
    ir.data[p] = 0; ir.data[p + 1] = 255 * (.6 + gr * .25 + (.24 + n2 - (.6 + gr * .25)) * gA); ir.data[p + 2] = 255 * gA; ir.data[p + 3] = 255;
  }
  const NS = 4.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const xm = Math.max(0, x - 1), xp = Math.min(W - 1, x + 1), ym = Math.max(0, y - 1), yp = Math.min(H - 1, y + 1);
    let ax = -(HT[y * W + xp] - HT[y * W + xm]) * NS, ay = (HT[yp * W + x] - HT[ym * W + x]) * NS, az = 1; const l = Math.hypot(ax, ay, az); const p = (y * W + x) * 4;
    inn.data[p] = (ax / l * .5 + .5) * 255; inn.data[p + 1] = (ay / l * .5 + .5) * 255; inn.data[p + 2] = (az / l * .5 + .5) * 255; inn.data[p + 3] = 255;
  }
  ox.putImageData(io, 0, 0); nx.putImageData(inn, 0, 0); rx.putImageData(ir, 0, 0);
  const tex = (c, srgb) => { const t = new T.CanvasTexture(c); t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; return t; };
  const coverMat = new T.MeshPhysicalMaterial({ map: tex(oC, true), normalMap: tex(nC, false), roughnessMap: tex(rC, false), metalnessMap: tex(rC, false), roughness: 1, metalness: 1,
    sheen: .22, sheenColor: new T.Color('#d08070'), sheenRoughness: .55, clearcoat: .18, clearcoatRoughness: .55, envMap: ctx.scene.environment, envMapIntensity: .95 });
  // boards / spine / flap: same morocco (tileable grain), slightly darker at the edges
  const leather = M.MAT.leather({ a: '#4c120d', b: '#2c0806', seed: 61 }); leather.sheen = .2; leather.envMap = ctx.scene.environment; leather.envMapIntensity = .7;
  const front = new T.Mesh(M.rbox(w, h, ct, .0022, 2), leather); front.position.z = d / 2 - ct / 2; g.add(front);
  const back = front.clone(); back.position.z = -d / 2 + ct / 2; g.add(back);
  const cover = new T.Mesh(new T.PlaneGeometry(w - .003, h - .003), coverMat); cover.position.z = d / 2 + .0002; g.add(cover);
  // flat Islamic spine
  const spine = new T.Mesh(M.rbox(.008, h, d, .003, 2), leather); spine.position.x = -w / 2 - .001; g.add(spine);
  // fore-edge flap (sertap) closing over the fore-edge, blind fillets
  const flap = new T.Mesh(M.rbox(.0045, h - .001, d + .003, .002, 2), leather); flap.position.x = w / 2 + .0012; g.add(flap);
  // text block: aged laid paper, fine page lines, slightly darker towards the edges
  const pt = ctx.TEX.drawTexture(64, 256, (x, PW, PH) => { x.fillStyle = '#cdb489'; x.fillRect(0, 0, PW, PH); for (let i = 0; i < PH; i++) { x.fillStyle = `rgba(96,66,34,${.06 + ((i * 7919) % 13) / 13 * .2})`; x.fillRect(0, i, PW, 1); }
    const gg = x.createLinearGradient(0, 0, 0, PH); gg.addColorStop(0, 'rgba(90,60,30,.25)'); gg.addColorStop(.12, 'rgba(90,60,30,0)'); gg.addColorStop(.88, 'rgba(90,60,30,0)'); gg.addColorStop(1, 'rgba(90,60,30,.25)'); x.fillStyle = gg; x.fillRect(0, 0, PW, PH); });
  const pages = new T.Mesh(M.rbox(w - .007, h - .008, d - ct * 2, .0015, 2), new T.MeshStandardMaterial({ map: pt, roughness: .92 })); pages.position.x = .0015; g.add(pages);
  // silk headbands (şiraze) at head and tail of the spine
  const hbT = ctx.TEX.drawTexture(128, 16, (x, PW, PH) => { const cs = ['#b8322a', '#e2b54e', '#2f6b4a', '#e2b54e']; for (let i = 0; i < 32; i++) { x.fillStyle = cs[i % 4]; x.beginPath(); x.moveTo(i * 4, 0); x.lineTo(i * 4 + 4, 0); x.lineTo(i * 4 + 8, PH); x.lineTo(i * 4 + 4, PH); x.fill(); } });
  for (const s of [-1, 1]) { const band = new T.Mesh(new T.CylinderGeometry(.0032, .0032, d - ct * 2 - .002, 12), new T.MeshPhysicalMaterial({ map: hbT, roughness: .5, sheen: .8, sheenColor: new T.Color('#ffe0b0') })); band.rotation.x = Math.PI / 2; band.position.set(-w / 2 + .006, s * (h / 2 - .0045), 0); g.add(band); }
  return g;
}

// monotone cubic through [[t, v], ...] (Fritsch–Carlson), linear extrapolation outside
function monoSpline(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]); const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i])); m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  return t => { if (t <= xs[0]) return ys[0] + m[0] * (t - xs[0]); if (t >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (t - xs[n - 1]); let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h, s2 = s * s, s3 = s2 * s; return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1]; };
}
// Camera rig: position on an arc-length parametrised centripetal Catmull-Rom (pass times per control point), yaw/pitch
// aimed at look targets at key times (monotone splines), FOV keys. Extrapolates smoothly past both ends (handles).
// - the arc-length table is fine and knot-aligned (1000 divisions per segment; three's default 200 for the whole curve
//   left one-frame speed dips at every knot), and getPointAt uses the same table;
// - every channel (path parameter, yaw, pitch, fov) is low-passed with a ±H s Hann window: the monotone splines are only
//   C1, so landings/starts (book landing, whip end, crane end) had a one-frame jerk; the window turns them into ramps
//   without changing the path or the beat timing.
function rig(T, pts, looks, fovs, H = .15) {
  const curve = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(...p[1])), false, 'centripetal');
  const SEG = pts.length - 1, N = SEG * 1000; curve.arcLengthDivisions = N; const L = curve.getLengths(N), tot = L[N]; const uAt = i => L[i * 1000] / tot;
  const taps = []; { const NT = 7; let sw = 0; for (let k = -NT; k <= NT; k++) { const w = .5 * (1 + Math.cos(Math.PI * k / (NT + 1))); taps.push([H * k / NT, w]); sw += w; } taps.forEach(tp => (tp[1] /= sw)); }
  const sm = f => t => { let s = 0; for (const [d, w] of taps) s += w * f(t + d); return s; };
  const u = sm(monoSpline(pts.map((p, i) => [p[0], uAt(i)])));
  const posAt = t => { const k = u(t); if (k >= 0 && k <= 1) return curve.getPointAt(k); const e = k < 0 ? 0 : 1, dd = k < 0 ? 1e-3 : -1e-3; const a = curve.getPointAt(e), b = curve.getPointAt(e + dd); return a.clone().add(a.clone().sub(b).multiplyScalar(Math.abs(k - e) / 1e-3)); };
  const ang = looks.map(([t, tg, dy = 0, dp = 0]) => { const [y, pi] = aim(posAt(t).toArray(), tg); return [t, y + dy, pi + dp]; });
  for (let i = 1; i < ang.length; i++) { while (ang[i][1] - ang[i - 1][1] > 180) ang[i][1] -= 360; while (ang[i][1] - ang[i - 1][1] < -180) ang[i][1] += 360; }
  const yaw = sm(monoSpline(ang.map(a => [a[0], a[1]]))), pitch = sm(monoSpline(ang.map(a => [a[0], a[2]]))), fov = sm(monoSpline(fovs));
  const set = (camera, t, extra) => {
    camera.position.copy(posAt(t)); if (extra) camera.position.add(extra);
    camera.rotation.order = 'YXZ'; camera.rotation.set(pitch(t) * Math.PI / 180, yaw(t) * Math.PI / 180, 0);
    camera.fov = fov(t); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  };
  return { pos: posAt, set, apply: set };
}
// image-space motion (px per frame at 1080x1920) of the set's sample points that are in frame at t (camera rig only, no shake)
function camFlow(t) {
  const c = R.flowCam, P = R.flowP, M3 = R.flowM, h = 1 / 60;
  [-h, 0, h].forEach((d, i) => { R.cam.set(c, t + d); M3[i].multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse); });
  const a = M3[0].elements, b = M3[1].elements, e = M3[2].elements; let m = 0;
  for (let i = 0; i < P.length; i += 3) { const x = P[i], y = P[i + 1], z = P[i + 2];
    const wb = b[3] * x + b[7] * y + b[11] * z + b[15]; if (wb < .1) continue;
    const bx = (b[0] * x + b[4] * y + b[8] * z + b[12]) / wb, by = (b[1] * x + b[5] * y + b[9] * z + b[13]) / wb; if (Math.abs(bx) > 1.05 || Math.abs(by) > 1.05) continue;
    const wa = a[3] * x + a[7] * y + a[11] * z + a[15], we = e[3] * x + e[7] * y + e[11] * z + e[15]; if (wa < .1 || we < .1) continue;
    const dx = ((e[0] * x + e[4] * y + e[8] * z + e[12]) / we - (a[0] * x + a[4] * y + a[8] * z + a[12]) / wa) * 540;
    const dy = ((e[1] * x + e[5] * y + e[9] * z + e[13]) / we - (a[1] * x + a[5] * y + a[9] * z + a[13]) / wa) * 960;
    m = Math.max(m, Math.hypot(dx, dy)); }
  return m;
}
