// s18 (100.50–106.90) "yazdıkları eserleriyle bu hakikati ifade eden Batılı düşünürlerden yalnızca iki örnektir."
// Visual: dusk in a grand Western library. A single sunbeam from a high side window falls on two books pulled
// slightly out of a shelf: Carlyle's "On Heroes, Hero-Worship" and Gibbon's "The Decline and Fall of the Roman Empire".
// On "Batılı düşünürlerden" the camera pulls back and up to reveal a three-storey wall of countless books; the two
// books become a small warm spot in the vast library — "yalnızca iki örnek".
import * as THREE from 'three';
import { path3, path1, spineAtlas, instancedBooks, fillShelf, heroBook, instances, beamMotes, plankTex } from '../engine/lib/extra_H.js';

let R = {};
const HERO_Y = 0.14 + 4 * 0.38 + 0.028; // standing surface of the hero shelf (lower case, 5th shelf)

export default {
  post: {
    exposure: 1.12,
    bloom: { enabled: true, strength: 0.36, radius: 0.5, threshold: 0.85 },
    grade: { contrast: 1.07, saturation: 1.08, warmth: 0.0, lift: [0.006, 0.014, 0.045], gain: [1.02, 1.0, 0.98] },
    vignette: 0.42, grain: 0.03,
    dof: { enabled: false },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, FX, TEX } = ctx;
    R = {};
    const rnd = U.rng(1818);
    scene.background = new THREE.Color('#121829');
    scene.fog = new THREE.FogExp2('#1b2440', 0.02);
    scene.environment = await ctx.loadHDR('old_hall'); scene.environmentIntensity = 0.16;
    R.hemi = new THREE.HemisphereLight('#5577d6', '#1a1414', 0.9); scene.add(R.hemi);
    const fill = new THREE.DirectionalLight('#93abee', 0.4); fill.position.set(6, 4, 12); scene.add(fill);

    // ---------- floor ----------
    const ftex = plankTex({ a: '#6a3f22', b: '#3e2312', planks: 10, seed: 3 }); ftex.repeat.set(14, 14);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ftex, roughness: .55, metalness: 0, envMapIntensity: .6 }));
    floor.position.set(0, 0, 10); floor.receiveShadow = true; scene.add(floor);

    // ---------- bookcase wall (3 storeys) ----------
    const X0 = -5.5, X1 = 5.5, BAY = 1.0, PIL = .07;
    const caseMat = M.MAT.wood({ a: '#6b3d20', b: '#3a1f0f', rings: 14, seed: 21 });
    const shelfMat = M.MAT.wood({ a: '#7a4626', b: '#45240f', rings: 30, seed: 23 });
    const backMat = new THREE.MeshStandardMaterial({ color: '#2a170c', roughness: .9 });
    const levels = [
      { y0: 0, plinth: .14, rows: 8, rowH: .38, top: .22 },
      { y0: 3.62, plinth: .08, rows: 8, rowH: .36, top: .22 },
      { y0: 7.12, plinth: .08, rows: 7, rowH: .36, top: .4 },
    ];
    const atlas = spineAtlas({ seed: 77 });
    const shelfList = [], pilList = [], bookItems = [];
    const heroGap = [[-0.083, 0.09]];
    levels.forEach((L, li) => {
      const yb = L.y0 + L.plinth; const H = L.plinth + L.rows * L.rowH + L.top; L.H = H;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, H), backMat); back.position.set(0, L.y0 + H / 2, -.3); back.receiveShadow = true; scene.add(back);
      for (let k = 0; k <= L.rows; k++) {
        const y = yb + k * L.rowH;
        for (let b = 0; b < (X1 - X0) / BAY; b++) {
          const xc = X0 + BAY / 2 + b * BAY;
          shelfList.push({ x: xc, y: y + .014, z: -.13, s: [1, 1, 1] });
          if (k < L.rows) {
            const items = fillShelf(rnd, { xL: xc - BAY / 2 + PIL / 2, xR: xc + BAY / 2 - PIL / 2, y: y + .028, zFront: .018, maxH: L.rowH - .045, depth: .21, gaps: li === 0 && k === 4 && b === 5 ? heroGap : [], cells: atlas.n });
            bookItems.push(...items);
          }
        }
      }
      for (let b = 0; b <= (X1 - X0) / BAY; b++) pilList.push({ x: X0 + b * BAY, y: L.y0 + H / 2, z: -.1, s: [1, H, 1] });
      const plinth = new THREE.Mesh(M.rbox(X1 - X0 + .1, L.plinth, .44, .02), caseMat); plinth.position.set(0, L.y0 + L.plinth / 2, -.1); scene.add(plinth);
      const corn = new THREE.Mesh(M.rbox(X1 - X0 + .2, L.top * .6, .5, .03), caseMat); corn.position.set(0, L.y0 + H - L.top * .3, -.07); scene.add(corn);
      const corn2 = new THREE.Mesh(M.rbox(X1 - X0 + .3, L.top * .25, .58, .03), caseMat); corn2.position.set(0, L.y0 + H - L.top * .12, -.05); scene.add(corn2);
    });
    const shelves = instances(M.rbox(BAY - PIL, .028, .34, .008, 2), shelfMat, shelfList); scene.add(shelves);
    const pils = instances(M.rbox(PIL, 1, .42, .015, 2), caseMat, pilList); scene.add(pils);
    const books = instancedBooks(bookItems, atlas, { envIntensity: 1.2 }); scene.add(books); R.books = books;

    // galleries with balustrades
    const balGeo = new THREE.LatheGeometry([[0, 0], [.03, 0], [.03, .05], [.018, .1], [.032, .3], [.02, .55], [.026, .7], [.03, .74], [0, .74]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 10);
    const balList = [];
    [3.4, 6.9].forEach(gy => {
      const slab = new THREE.Mesh(M.rbox(X1 - X0 + .4, .22, 1.15, .03), caseMat); slab.position.set(0, gy + .11, .42); scene.add(slab);
      const rail = new THREE.Mesh(M.rbox(X1 - X0 + .4, .07, .09, .025), caseMat); rail.position.set(0, gy + .22 + .82, .93); scene.add(rail);
      const brail = new THREE.Mesh(M.rbox(X1 - X0 + .4, .06, .08, .02), caseMat); brail.position.set(0, gy + .22 + .05, .93); scene.add(brail);
      for (let x = X0 - .1; x <= X1 + .1; x += .16) balList.push({ x, y: gy + .22 + .07, z: .93 });
    });
    scene.add(instances(balGeo, caseMat, balList));

    // rolling library ladder on a brass rail
    const brass = M.MAT.brass();
    const railBar = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, X1 - X0, 12).rotateZ(Math.PI / 2), brass); railBar.position.set(0, 3.14, .14); scene.add(railBar);
    const ladder = new THREE.Group(); const lh = 3.25, lw = .46;
    for (const sx of [-1, 1]) { const r = new THREE.Mesh(M.rbox(.05, lh, .035, .012), caseMat); r.position.set(sx * lw / 2, lh / 2, 0); ladder.add(r); }
    for (let y = .3; y < lh - .1; y += .3) { const rung = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, lw, 10).rotateZ(Math.PI / 2), caseMat); rung.position.set(0, y, 0); ladder.add(rung); }
    for (const sx of [-1, 1]) { const hk = new THREE.Mesh(new THREE.TorusGeometry(.03, .008, 8, 16, Math.PI), brass); hk.position.set(sx * lw / 2, lh - .02, -.02); hk.rotation.y = Math.PI / 2; ladder.add(hk); const wh = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .02, 14).rotateZ(Math.PI / 2), brass); wh.position.set(sx * lw / 2, .03, .01); ladder.add(wh); }
    ladder.position.set(1.18, 0, .98); ladder.rotation.x = -Math.atan2(.98 - .16, lh); M.shadowAll(ladder); scene.add(ladder);

    // long runner rug on the parquet (adds colour to the floor in the wide shot)
    const rugTex = TEX.drawTexture(256, 1024, (x, W, H) => {
      x.fillStyle = '#5a1a18'; x.fillRect(0, 0, W, H); x.fillStyle = '#c9974a'; x.fillRect(10, 10, W - 20, H - 20); x.fillStyle = '#6d201c'; x.fillRect(18, 18, W - 36, H - 36);
      x.fillStyle = '#1f2c4a'; x.fillRect(40, 40, W - 80, H - 80);
      for (let j = 0; j < 9; j++) { const cy = 110 + j * 100; x.fillStyle = '#b8443a'; x.beginPath(); x.moveTo(W / 2, cy - 42); x.lineTo(W / 2 + 60, cy); x.lineTo(W / 2, cy + 42); x.lineTo(W / 2 - 60, cy); x.closePath(); x.fill(); x.fillStyle = '#e0b866'; x.beginPath(); x.moveTo(W / 2, cy - 20); x.lineTo(W / 2 + 28, cy); x.lineTo(W / 2, cy + 20); x.lineTo(W / 2 - 28, cy); x.closePath(); x.fill(); }
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 8.8).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: rugTex, roughness: 1, sheen: .8, sheenColor: new THREE.Color('#ff9f7a'), sheenRoughness: .5 }));
    rug.position.set(0, .005, 3.2); rug.receiveShadow = true; scene.add(rug);

    // ---------- hero books ----------
    const gold = '#e9c46a';
    const carlyle = heroBook({
      w: .07, h: .268, d: .2, seed: 41,
      spine: { color: '#2f5a3e', dark: '#183022', bands: 6, top: .05, bottom: .95, gold,
        labels: [{ panel: 1, span: 2, bg: '#16110d', lines: ['ON HEROES,', 'HERO-', 'WORSHIP'] }, { panel: 4, bg: '#6e1a14', lines: ['CARLYLE'], size: .17 }] },
    });
    const gibbon = heroBook({
      w: .08, h: .296, d: .21, seed: 43,
      spine: { color: '#6a3c20', dark: '#3a1f0e', bands: 7, top: .05, bottom: .95, gold,
        labels: [{ panel: 1, span: 3, bg: '#16110d', lines: ['THE DECLINE', 'AND FALL', 'OF THE', 'ROMAN', 'EMPIRE'] }, { panel: 4, bg: '#7a1d15', lines: ['GIBBON'], size: .17 }, { panel: 5, bg: '#16110d', lines: ['VOL. I'], size: .15 }] },
    });
    const hb = new THREE.Group(); hb.position.set(0, HERO_Y, 0); scene.add(hb); R.hb = hb;
    carlyle.position.set(-.043, 0, -.057); carlyle.rotation.y = .03; hb.add(carlyle); R.carlyle = carlyle;
    gibbon.position.set(.047, 0, -.066); gibbon.rotation.y = -.02; hb.add(gibbon); R.gibbon = gibbon;

    // ---------- dusk sunbeam through a high arched side window ----------
    const cookie = TEX.drawTexture(256, 256, (x, W, H) => {
      // arched window opening, mullion + transom kept off-centre so the two books sit in a clear pane
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.filter = 'blur(4px)';
      x.fillStyle = '#fff'; const cx = W / 2, ww = W * .62, top = H * .1, bot = H * .9;
      x.beginPath(); x.moveTo(cx - ww / 2, bot); x.lineTo(cx - ww / 2, top + ww / 2); x.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); x.lineTo(cx + ww / 2, bot); x.closePath(); x.fill();
      x.fillStyle = '#000'; x.fillRect(cx - ww * .3, top, W * .022, bot - top); x.fillRect(cx - ww / 2, H * .3, ww, H * .02); x.fillRect(cx - ww / 2, H * .75, ww, H * .02);
      x.filter = 'none';
    });
    const SUN_FROM = new THREE.Vector3(-6.2, 5.6, 6.6), SUN_TO = new THREE.Vector3(.0, HERO_Y + .14, .02);
    const spot = new THREE.SpotLight('#ffcf94', 620, 30, 0.058, 0.3, 1.3);
    spot.position.copy(SUN_FROM); spot.target.position.copy(SUN_TO); spot.map = cookie;
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.normalBias = .01; spot.shadow.camera.near = 4; spot.shadow.camera.far = 14; spot.shadow.radius = 2;
    scene.add(spot, spot.target); R.spot = spot;
    const shaft = FX.lightShaft({ from: SUN_FROM.toArray(), to: SUN_TO.clone().add(new THREE.Vector3(0, -.05, .1)).toArray(), r0: .28, r1: .42, color: '#ffbf7a', opacity: .16 }); scene.add(shaft); R.shaft = shaft;
    const motes = beamMotes({ from: SUN_FROM.toArray(), to: SUN_TO.toArray(), radius: .42, count: 900, size: 2.2, color: '#ffd9a8', opacity: .75, speed: .02 }); scene.add(motes); R.motes = motes;
    // warm bounce from the lit patch onto the floor/shelves nearby (very soft)
    const bounce = new THREE.PointLight('#ff9d55', 0.35, 3.5, 2); bounce.position.set(0, HERO_Y + .1, .6); scene.add(bounce);

    camera.fov = 36; camera.near = .03; camera.far = 200; camera.updateProjectionMatrix();
    // camera: slow 3/4 drift on the two spines, then (from "Batılı") a long pull-back & rise to the whole wall
    const cy = HERO_Y + .135;
    R.camPos = path3([[-0.6, [.36, cy - .02, .9]], [1.4, [.2, cy + .0, .82]], [3.05, [.02, cy + .02, .76]], [3.9, [-.02, cy + .12, 1.7]], [4.9, [-.35, cy + .5, 7.2]], [5.9, [-1.0, cy + .8, 14.2]], [6.9, [-1.25, cy + .9, 16.4]]]);
    R.camLook = path3([[-0.6, [0, cy + .03, 0]], [3.05, [0, cy + .028, 0]], [4.2, [0, cy + .35, 0]], [5.4, [.1, cy + 1.45, 0]], [6.9, [.2, cy + 1.72, 0]]]);
  },

  update(t, ctx) {
    const { ui, U, camera, post } = ctx;
    const wideK = U.smoothstep(4.1, 6.0, t); post.exposure = U.lerp(0.72, 1.3, wideK); R.hemi.intensity = U.lerp(.8, 1.25, wideK);
    const P = R.camPos(t), L = R.camLook(t);
    P.add(U.shake(t, .006 + .02 * U.smoothstep(3.2, 6, t), .35, 4));
    camera.position.copy(P); camera.lookAt(L); camera.updateMatrixWorld();

    // hero books ease out of the row a touch on "yazdıkları" (they were pulled forward)

    // ---------- typography ----------
    const tEser = ctx.wordTime('eserleriyle'), tHak = ctx.wordTime('hakikati'), tBat = ctx.wordTime('batılı'), tDus = ctx.wordTime('düşünürlerden'), tYal = ctx.wordTime('yalnızca'), tIki = ctx.wordTime('iki'), tOrn = ctx.wordTime('örnektir');
    const cW = new THREE.Vector3(), gW = new THREE.Vector3();
    R.carlyle.localToWorld(cW.set(-.022, .15, .11)); R.gibbon.localToWorld(gW.set(.026, .17, .12));
    if (0) ui.callout('T. Carlyle', { t, t0: tEser - .05, t1: tBat + .15, anchor: cW, to: [205, 700], size: 38, bg: 'rgba(16,20,38,.78)', color: '#fff4dc' });
    if (0) ui.callout('E. Gibbon', { t, t0: tEser + .3, t1: tBat + .15, anchor: gW, to: [868, 760], size: 38, bg: 'rgba(16,20,38,.78)', color: '#fff4dc' });
    ui.text('bu hakikati ifade eden eserler', { t, t0: tHak - .05, t1: tYal - .1, x: 540, y: 300, size: 44, weight: 800, color: '#fff4dc', anim: 'rise' });

    // ring around the two books (draw-on), then "2 örnek" pill
    const c3 = new THREE.Vector3(); R.hb.localToWorld(c3.set(.003, .14, .06));
    const [sx, sy] = ui.project(c3);
    const e3 = new THREE.Vector3(); R.hb.localToWorld(e3.set(.1, .14, .06)); const rx = Math.max(26, Math.abs(ui.project(e3)[0] - sx) * 1.1);
    const v3 = new THREE.Vector3(); R.hb.localToWorld(v3.set(.003, .33, .06)); const ry = Math.max(40, Math.abs(ui.project(v3)[1] - sy) * 1.12);
    const ringA = U.prog(t, tDus - .25, tDus + .35, 'outCubic');
    if (ringA > 0) {
      const X = ui.ctx; X.save(); X.globalAlpha = Math.min(1, ringA * 1.5); X.strokeStyle = '#ffcf6b'; X.lineWidth = 6; X.lineCap = 'round';
      X.shadowColor = 'rgba(0,0,0,.45)'; X.shadowBlur = 10; X.beginPath(); X.ellipse(sx, sy, rx, ry, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringA); X.stroke(); X.restore();
    }
    ui.pill('2 örnek', { t, t0: tDus + .15, x: sx, y: Math.max(560, sy - ry - 52), size: 42, bg: 'rgba(16,20,38,.8)', color: '#ffcf6b' });
    { const a = U.smoothstep(tYal - .3, tYal + .3, t); if (a > 0) { const X = ui.ctx; const g = X.createLinearGradient(0, 0, 0, 640); g.addColorStop(0, `rgba(8,10,20,${.55 * a})`); g.addColorStop(1, 'rgba(8,10,20,0)'); X.fillStyle = g; X.fillRect(0, 0, 1080, 640); } }
    ui.text('yalnızca', { t, t0: tYal - .05, x: 540, y: 330, size: 60, weight: 800, color: '#fff4dc', anim: 'rise' });
    ui.text('İKİ ÖRNEK', { t, t0: tIki - .06, x: 540, y: 432, size: 112, weight: 900, color: '#ffcf6b', letterSpacing: 4, anim: 'pop' });
  },
};
