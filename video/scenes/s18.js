// s18 (100.50–106.90) "yazdıkları eserleriyle bu hakikati ifade eden Batılı düşünürlerden yalnızca iki örnektir."
// Visual: dusk in a grand Western library. A single sunbeam from a high side window falls on two books pulled
// slightly out of a shelf: Carlyle's "On Heroes, Hero-Worship" and Gibbon's "The Decline and Fall of the Roman Empire".
// On "Batılı düşünürlerden" the camera pulls back and up to reveal a three-storey wall of countless books; the two
// books stay a warm, sunlit spot in the vast library (ring + magnifier inset that shows the two spines) — "yalnızca iki örnek".
import * as THREE from 'three';
import { path3, spineAtlas, instancedBooks, fillShelf, heroBook, instances, beamMotes, plankTex } from '../engine/lib/extra_H.js';

let R = {};
const HERO_Y = 0.14 + 4 * 0.38 + 0.028; // standing surface of the hero shelf (lower case, 5th shelf)

// ---------------------------------------------------------------------------------------------------------------
// Volumetric sunbeam (cone from the window to the lit patch). Unlike FX.lightShaft it stays visible all the way
// down to the books, so the wide shot reads "window -> beam -> two books". Soft edges, drifting dust striations.
function sunShaft({ from, to, r0, r1, color, opacity }) {
  const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to); const len = A.distanceTo(B);
  const geo = new THREE.CylinderGeometry(r0, r1, len, 64, 1, true); geo.translate(0, -len / 2, 0);
  const u = { time: { value: 0 }, color: { value: new THREE.Color(color) }, opacity: { value: opacity }, endBoost: { value: 0 }, fexp: { value: 2.4 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: `varying vec3 vN, vV; varying vec2 vUv; varying float vD;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vV = normalize(-mv.xyz); vN = normalize(normalMatrix*normal); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; uniform float opacity, time, endBoost, fexp; varying vec3 vN, vV; varying vec2 vUv; varying float vD;
      float h11(float p){ return fract(sin(p*127.1)*43758.5453); }
      float vn1(float x){ float i = floor(x), f = fract(x); f = f*f*(3.-2.*f); return mix(h11(i), h11(i+1.), f); }
      void main(){
        float f = abs(dot(normalize(vN), normalize(vV))); f = pow(f, fexp);
        float s = 1. - vUv.y;                                     // 0 at the window .. 1 at the books
        float along = smoothstep(0., .1, s) * (1. - .45*smoothstep(.8, 1., s) + endBoost*smoothstep(.55, 1., s));  // endBoost: wide shot only
        float a = vUv.x * 6.28318;                                 // periodic striations around the cone (no seam)
        float st = .5 + .5*sin(a*5. + vn1(s*3. + time*.15)*4.) * sin(a*3. - 1.3 + vn1(s*2. - time*.1)*3.);
        float near = smoothstep(.3, 1.2, vD);
        gl_FragColor = vec4(color, f * along * opacity * (.55 + .7*st) * near); }`,
  });
  const mesh = new THREE.Mesh(geo, m); mesh.position.copy(A);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), B.clone().sub(A).normalize());
  mesh.userData.uniforms = u; mesh.userData.noDepth = true; mesh.renderOrder = 5; mesh.frustumCulled = false;
  return mesh;
}

// Dust motes floating in front of the two books, lit only where they cross the sunbeam (cylinder test in the shader).
function heroMotes({ count = 380, axisFrom, axisTo, radius, seed = 5, pxScale = 1, reach = 1.5 }) {
  let a = seed >>> 0; const R = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const A = new THREE.Vector3(...axisFrom), B = new THREE.Vector3(...axisTo); const Dn = A.clone().sub(B).normalize();
  const e1 = new THREE.Vector3(0, 1, 0).cross(Dn).normalize(), e2 = Dn.clone().cross(e1).normalize();
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {   // sampled inside the last metres of the beam, in front of the books
    const sAl = .04 + Math.pow(R(), 1.3) * reach, ang = R() * 6.2832, rr = Math.sqrt(R()) * radius * 1.1;
    const p = B.clone().addScaledVector(Dn, sAl).addScaledVector(e1, Math.cos(ang) * rr).addScaledVector(e2, Math.sin(ang) * rr);
    pos.set([p.x, p.y, p.z], i * 3); rnd.set([R(), R(), R(), R()], i * 4);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 4));
  const u = { time: { value: 0 }, A: { value: A }, D: { value: B.clone().sub(A).normalize() }, rad: { value: radius }, px: { value: pxScale }, master: { value: 1 }, color: { value: new THREE.Color('#ffe2b4') } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, rad, px; uniform vec3 A, D; attribute vec4 rnd; varying float vA;
      void main(){ vec3 p = position;
        p.x += sin(time * (.21 + rnd.x * .3) + rnd.y * 40.) * .035; p.y += sin(time * (.17 + rnd.z * .25) + rnd.w * 40.) * .03 + time * (.004 + rnd.y * .006);
        p.z += cos(time * (.19 + rnd.w * .3) + rnd.x * 40.) * .03;
        vec3 q = p - A; float along = dot(q, D); float dr = length(q - D * along) / rad;
        float lit = 1. - smoothstep(.55, 1., dr);
        float tw = .55 + .45 * sin(time * (1.3 + rnd.z * 2.) + rnd.x * 30.);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        float sz = (1.5 + rnd.w * 2.8) * px * 2.2 / max(.05, -mv.z);
        vA = lit * tw * smoothstep(.5, 2.5, sz) * (1. - smoothstep(2.5, 6., -mv.z));
        gl_PointSize = clamp(sz, 1., 14. * px); }`,
    fragmentShader: `uniform vec3 color; uniform float master; varying float vA;
      void main(){ vec2 c = gl_PointCoord - .5; float d = length(c) * 2.; float a = smoothstep(1., .1, d); gl_FragColor = vec4(color * 1.4, a * vA * master); }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.uniforms = u; pts.userData.noDepth = true; pts.renderOrder = 12;
  return pts;
}

// Render a still of the two hero spines once in setup (tone-mapped, straight to the canvas) and keep it as a 2D
// image for the magnifier inset of the wide shot. The engine's composer overwrites the canvas on the next frame.
function captureInset(ctx, cam, size, exposure) {
  const r = ctx.renderer, cv = r.domElement;
  const vp = new THREE.Vector4(), sc = new THREE.Vector4(); r.getViewport(vp); r.getScissor(sc); const st = r.getScissorTest();
  const ex = r.toneMappingExposure, tm = r.toneMapping;
  r.setRenderTarget(null); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = exposure;
  r.setViewport(0, 0, size, size); r.setScissor(0, 0, size, size); r.setScissorTest(true);
  r.setClearColor(0x000000, 1); r.clear();
  r.render(ctx.scene, cam);
  const out = document.createElement('canvas'); out.width = out.height = size;
  const x = out.getContext('2d'); x.filter = 'contrast(1.06) saturate(1.08)'; x.drawImage(cv, 0, cv.height - size, size, size, 0, 0, size, size); x.filter = 'none';
  // spotlight the two hero spines inside the lens: neighbours fall into shadow
  x.save(); x.translate(size * .5, size * .52); x.scale(1, 1.55); const g = x.createRadialGradient(0, 0, size * .2, 0, 0, size * .42);
  g.addColorStop(0, 'rgba(10,6,4,0)'); g.addColorStop(1, 'rgba(10,6,4,.62)'); x.fillStyle = g; x.fillRect(-size, -size, size * 2, size * 2); x.restore();
  r.setViewport(vp); r.setScissor(sc); r.setScissorTest(st); r.toneMappingExposure = ex; r.toneMapping = tm;
  return out;
}

export default {
  post: {
    exposure: 1.0,
    bloom: { enabled: true, strength: 0.34, radius: 0.5, threshold: 0.86 },
    grade: { contrast: 1.07, saturation: 1.08, warmth: 0.0, lift: [0.008, 0.014, 0.04], gain: [1.02, 1.0, 0.98] },
    vignette: 0.4, grain: 0.03,
    dof: { enabled: false },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, TEX } = ctx;
    R = {};
    const rnd = U.rng(1818);
    scene.background = new THREE.Color('#121829');
    scene.fog = new THREE.FogExp2('#1d2540', 0.018);
    scene.environment = await ctx.loadHDR('old_hall'); scene.environmentIntensity = 0.16;
    R.hemi = new THREE.HemisphereLight('#5f7fd8', '#2a1c14', 0.9); scene.add(R.hemi);
    const fill = new THREE.DirectionalLight('#93abee', 0.4); fill.position.set(6, 4, 12); scene.add(fill); R.fill = fill;

    // ---------- floor ----------
    const ftex = plankTex({ a: '#6a3f22', b: '#3e2312', planks: 10, seed: 3 }); ftex.repeat.set(14, 14);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: ftex, roughness: .55, metalness: 0, envMapIntensity: .6 }));
    floor.position.set(0, 0, 10); floor.receiveShadow = true; scene.add(floor);

    // ---------- bookcase wall (3 storeys) ----------
    const X0 = -5.5, X1 = 5.5, BAY = 1.0, PIL = .07;
    const caseMat = M.MAT.wood({ a: '#6b3d20', b: '#3a1f0f', rings: 14, seed: 21 });
    const shelfMat = M.MAT.wood({ a: '#7a4626', b: '#45240f', rings: 30, seed: 23 });
    const backMat = new THREE.MeshStandardMaterial({ color: '#3a2212', roughness: .9 });
    const levels = [
      { y0: 0, plinth: .14, rows: 8, rowH: .38, top: .22 },
      { y0: 3.62, plinth: .08, rows: 8, rowH: .36, top: .22 },
      { y0: 7.12, plinth: .08, rows: 7, rowH: .36, top: .4 },
    ];
    // 2048² atlas (256×1024 px per spine cell): crisp neighbours in the close-up, full mip chain for the wide shot
    const atlas = spineAtlas({ seed: 77, size: 2048 });
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
    // One gold-tooled book on the shelf above the heroes sits inside the sun-spot: when the pull-back starts the camera
    // crosses its mirror plane and the foil reflection of the spot flashed on in a single frame (t≈3.32). Render that
    // one book with its own, rougher material (broader lobe -> the sheen fades in smoothly instead of popping).
    const gi = bookItems.findIndex(it => Math.abs(it.x - .175) < .004 && Math.abs(it.y - (HERO_Y + .38)) < .004);
    const glintBook = gi >= 0 ? bookItems.splice(gi, 1)[0] : null;
    const books = instancedBooks(bookItems, atlas, { envIntensity: 1.2 }); scene.add(books); R.books = books;
    if (glintBook) { const gb = instancedBooks([glintBook], atlas, { envIntensity: 1.2 }); gb.material.roughness = 1.8; scene.add(gb); R.glintBook = gb; }

    // galleries with balustrades
    const balGeo = new THREE.LatheGeometry([[0, 0], [.03, 0], [.03, .05], [.018, .1], [.032, .3], [.02, .55], [.026, .7], [.03, .74], [0, .74]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 10);
    const balList = [];
    [3.4, 6.9].forEach(gy => {
      const slab = new THREE.Mesh(M.rbox(X1 - X0 + .4, .22, 1.15, .03), caseMat); slab.position.set(0, gy + .11, .42); slab.receiveShadow = true; scene.add(slab);
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

    // long runner rug on the parquet (muted antique palette; it sits under the subtitle band in the wide shot)
    const rugTex = TEX.drawTexture(256, 1024, (x, W, H) => {
      x.fillStyle = '#3e1512'; x.fillRect(0, 0, W, H); x.fillStyle = '#8a6a3c'; x.fillRect(10, 10, W - 20, H - 20); x.fillStyle = '#4a1a16'; x.fillRect(18, 18, W - 36, H - 36);
      x.fillStyle = '#1c2236'; x.fillRect(40, 40, W - 80, H - 80);
      for (let j = 0; j < 9; j++) { const cy = 110 + j * 100; x.fillStyle = '#6e2a22'; x.beginPath(); x.moveTo(W / 2, cy - 42); x.lineTo(W / 2 + 60, cy); x.lineTo(W / 2, cy + 42); x.lineTo(W / 2 - 60, cy); x.closePath(); x.fill(); x.fillStyle = '#9a7a48'; x.beginPath(); x.moveTo(W / 2, cy - 18); x.lineTo(W / 2 + 26, cy); x.lineTo(W / 2, cy + 18); x.lineTo(W / 2 - 26, cy); x.closePath(); x.fill(); }
    });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 8.8).rotateX(-Math.PI / 2).rotateY(Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: rugTex, roughness: 1, sheen: .6, sheenColor: new THREE.Color('#d08a6a'), sheenRoughness: .5 }));
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
      spine: { color: '#5c3418', dark: '#2e170a', bands: 7, top: .05, bottom: .95, gold,
        labels: [{ panel: 1, span: 3, bg: '#7d1a14', lines: ['THE DECLINE', 'AND FALL', 'OF THE', 'ROMAN', 'EMPIRE'] }, { panel: 4, bg: '#16110d', lines: ['VOL. I'], size: .16 }, { panel: 5, bg: '#16110d', lines: ['GIBBON'], size: .15 }] },
    });
    const hb = new THREE.Group(); hb.position.set(0, HERO_Y, 0); scene.add(hb); R.hb = hb;
    carlyle.position.set(-.043, 0, -.057); carlyle.rotation.y = .03; hb.add(carlyle); R.carlyle = carlyle;
    gibbon.position.set(.047, 0, -.066); gibbon.rotation.y = -.02; hb.add(gibbon); R.gibbon = gibbon;
    R.cz = carlyle.position.z; R.gz = gibbon.position.z;

    // ---------- dusk sunbeam through a high arched side window ----------
    const cookie = TEX.drawTexture(256, 256, (x, W, H) => {
      // arched window opening (mullion + transoms off-centre so the two books sit in a clear pane), with a soft
      // radial falloff so the hottest light lands on the two books and the shelf above does not blow out.
      x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.filter = 'blur(4px)';
      x.fillStyle = '#fff'; const cx = W / 2, ww = W * .62, top = H * .1, bot = H * .9;
      x.beginPath(); x.moveTo(cx - ww / 2, bot); x.lineTo(cx - ww / 2, top + ww / 2); x.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); x.lineTo(cx + ww / 2, bot); x.closePath(); x.fill();
      x.fillStyle = '#000'; x.fillRect(cx - ww * .3, top, W * .022, bot - top); x.fillRect(cx - ww / 2, H * .3, ww, H * .02); x.fillRect(cx - ww / 2, H * .75, ww, H * .02);
      x.filter = 'none';
      x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(cx, H * .54, 0, cx, H * .54, W * .42);
      g.addColorStop(0, '#fff'); g.addColorStop(.45, '#d8d8d8'); g.addColorStop(1, '#6a6a6a'); x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalCompositeOperation = 'source-over';
    });
    const SUN_FROM = new THREE.Vector3(-6.2, 5.6, 6.6), SUN_TO = new THREE.Vector3(.0, HERO_Y + .14, .02);
    const spot = new THREE.SpotLight('#ffcb8a', 640, 30, 0.056, 0.3, 1.3);
    spot.position.copy(SUN_FROM); spot.target.position.copy(SUN_TO); spot.map = cookie;
    spot.castShadow = true; spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0004; spot.shadow.normalBias = .01; spot.shadow.camera.near = 4; spot.shadow.camera.far = 14; spot.shadow.radius = 2;
    scene.add(spot, spot.target); R.spot = spot;
    // broad warm wash from the same windows (scattered dusk light) — lifts the lower storey around the beam in the wide
    const wash = new THREE.SpotLight('#ffb27a', 0, 40, 0.3, 1, 1.2); wash.position.set(-7, 9, 9); wash.target.position.set(.1, 1.9, 0); scene.add(wash, wash.target); R.wash = wash;
    const shaft = sunShaft({ from: SUN_FROM.toArray(), to: SUN_TO.clone().add(new THREE.Vector3(0, -.04, .06)).toArray(), r0: .3, r1: .34, color: '#ffbf7a', opacity: .1 }); scene.add(shaft); R.shaft = shaft;
    const motes = beamMotes({ from: SUN_FROM.toArray(), to: SUN_TO.toArray(), radius: .36, count: 900, size: 2.0, color: '#ffd9a8', opacity: .7, speed: .02 }); scene.add(motes); R.motes = motes;
    R.hmotes = heroMotes({ axisFrom: SUN_FROM.toArray(), axisTo: SUN_TO.toArray(), radius: .34, pxScale: ctx.renderer.domElement.height / 1920 });
    scene.add(R.hmotes);
    // warm bounce from the lit patch onto the floor/shelves nearby (very soft)
    const bounce = new THREE.PointLight('#ff9d55', 0.35, 3.5, 2); bounce.position.set(0, HERO_Y + .1, .6); scene.add(bounce); R.bounce = bounce;

    // ---------- magnifier inset image (captured once, drawn in the overlay of the wide shot) ----------
    const icam = new THREE.PerspectiveCamera(34, 1, .02, 60);
    icam.position.set(.07, HERO_Y + .16, .66); icam.lookAt(.004, HERO_Y + .145, .03); icam.updateMatrixWorld();
    R.inset = captureInset(ctx, icam, Math.min(640, ctx.renderer.domElement.width), 0.9);

    camera.fov = 36; camera.near = .03; camera.far = 200; camera.updateProjectionMatrix();
    // camera: slow 3/4 drift on the two spines, then (from "Batılı") a long pull-back & rise to the whole wall
    const cy = HERO_Y + .135;
    // close-up drift (same keys as before); past 3.05 path3 extrapolates linearly, so the drift never stops dead
    R.drift = path3([[-0.6, [.36, cy - .02, .9]], [1.4, [.2, cy + .0, .82]], [3.05, [.02, cy + .02, .76]]]);
    // pull-back = ONE smooth ease in log-distance: perceived zoom speed d(lnD)/dt is a single bell
    // (regularised incomplete beta I_x(a,b): zero velocity AND zero acceleration at the start, peak on
    // "düşünürlerden", long tail that is still drifting at the end of the visible window). No knots -> no kinks.
    const PA = 2.6, PB = 5.5, NT = 2048, tab = new Float64Array(NT + 1); let acc = 0;
    for (let i = 1; i <= NT; i++) { const x = (i - .5) / NT; acc += Math.pow(x, PA - 1) * Math.pow(1 - x, PB - 1); tab[i] = acc; }
    for (let i = 1; i <= NT; i++) tab[i] /= acc;
    const norm = acc / NT;
    R.pull = { T0: 2.85, T: 5.0, D0: .76, D1: 16.4, cy,
      B: x => { if (x <= 0) return 0; if (x >= 1) return 1; const f = x * NT, i = Math.floor(f); return tab[i] + (tab[i + 1] - tab[i]) * (f - i); },
      dB: x => (x <= 0 || x >= 1) ? 0 : Math.pow(x, PA - 1) * Math.pow(1 - x, PB - 1) / norm };
  },

  update(t, ctx) {
    const { ui, U, camera, post } = ctx;
    // ---------- camera: close-up drift + log-distance pull-back (see setup) ----------
    const PL = R.pull, px = (t - PL.T0) / PL.T, lnR = Math.log(PL.D1 / PL.D0);
    const Dd = PL.D0 * Math.exp(lnR * PL.B(px)), k = (Dd - PL.D0) / (PL.D1 - PL.D0);
    const zoomRate = lnR * PL.dB(px) / PL.T;   // relative pull-back speed (1/s)
    // motion blur follows the zoom rate (odd sample counts keep the overlay sub-frame exactly at t); switches on
    // while the image motion is still ~1 px/frame, enough sub-frames at the peak to fuse into a smooth smear
    post.motionBlur = { samples: zoomRate > 1.0 ? 7 : zoomRate > .55 ? 5 : zoomRate > .12 ? 3 : 1, shutter: .5 };
    const wideK = U.smoothstep(3.5, 5.7, t);
    post.exposure = U.lerp(0.74, 1.32, wideK);
    R.hemi.intensity = U.lerp(.8, 1.55, wideK);
    R.wash.intensity = U.lerp(0, 120, wideK);
    R.fill.intensity = U.lerp(.4, .7, wideK);
    R.spot.intensity = U.lerp(640, 470, wideK);
    R.shaft.userData.uniforms.opacity.value = U.lerp(.06, .2, U.smoothstep(3.4, 5.6, t));
    // wide shot: carry the beam all the way down onto the two books (the close-up keeps its original falloff)
    R.shaft.userData.uniforms.endBoost.value = 1.1 * wideK; R.shaft.userData.uniforms.fexp.value = U.lerp(2.4, 1.8, wideK);
    // on "yazdıkları" the two books are drawn out of the row (staggered, small overshoot, settle)
    const pull = (t0) => { const a = U.clamp((t - t0) / .7); return -.042 * (1 - U.ease.outBack(a, 1.7)); };
    R.carlyle.position.z = R.cz + pull(0.0); R.gibbon.position.z = R.gz + pull(.16);
    const P = R.drift(t).add(new THREE.Vector3(-.72 * k, .88 * k, Dd - PL.D0));
    const L = new THREE.Vector3(.1 * k, PL.cy + .03 - .002 * U.clamp((t + .6) / 3.65) + 1.272 * k, 0);
    P.add(U.shake(t, .006 + .02 * U.smoothstep(3.2, 6, t), .35, 4));
    camera.position.copy(P); camera.lookAt(L); camera.updateMatrixWorld();

    // ---------- typography ----------
    const tHak = ctx.wordTime('hakikati'), tDus = ctx.wordTime('düşünürlerden'), tYal = ctx.wordTime('yalnızca'), tIki = ctx.wordTime('iki');
    ui.text('bu hakikati ifade eden eserler', { t, t0: tHak - .05, t1: tYal - .1, x: 540, y: 300, size: 46, weight: 800, color: '#fff4dc', anim: 'rise', bg: 'rgba(16,20,38,.6)', pad: 22 });

    // ring around the two books (draw-on on "düşünürlerden"); it never shrinks below a readable marker size
    const X = ui.ctx;
    const c3 = new THREE.Vector3(); R.hb.localToWorld(c3.set(.003, .145, .06));
    const [sx, sy] = ui.project(c3);
    const e3 = new THREE.Vector3(); R.hb.localToWorld(e3.set(.1, .145, .06)); const rx = Math.max(46, Math.abs(ui.project(e3)[0] - sx) * 1.12);
    const v3 = new THREE.Vector3(); R.hb.localToWorld(v3.set(.003, .33, .06)); const ry = Math.max(70, Math.abs(ui.project(v3)[1] - sy) * 1.12);
    const ringA = U.prog(t, tDus - .25, tDus + .35, 'outCubic');
    if (ringA > 0) {
      const pulse = 1 + .04 * Math.sin((t - tDus) * 5.5) * U.smoothstep(tDus + .3, tDus + .8, t);
      X.save(); X.globalAlpha = Math.min(1, ringA * 1.5); X.lineCap = 'round';
      X.strokeStyle = 'rgba(255,207,107,.25)'; X.lineWidth = 16; X.beginPath(); X.ellipse(sx, sy, rx * pulse, ry * pulse, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringA); X.stroke();
      X.strokeStyle = '#ffcf6b'; X.lineWidth = 6; X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 10;
      X.beginPath(); X.ellipse(sx, sy, rx * pulse, ry * pulse, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ringA); X.stroke(); X.restore();
    }

    // magnifier inset (Kurzgesagt-style call-out): grows out of the ring once the books get small in frame
    const tIn = 4.5, RIN = 178, icx = 400, icy = 790;
    const ip = U.prog(t, tIn, tIn + .55, 'outCubic'), ipop = U.ease.outBack(U.clamp((t - tIn) / .55), 1.6);
    let badge = [sx, Math.max(560, sy - ry - 50)];
    if (ip > 0) {
      const cx = U.lerp(sx, icx, ip), cyy = U.lerp(sy, icy, ip), rr = Math.max(1, RIN * ipop);
      // connector "cone" from the ring to the lens
      const dx = cx - sx, dy = cyy - sy, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
      const lineA = U.smoothstep(tIn + .2, tIn + .6, t);
      if (lineA > 0) {
        X.save(); X.globalAlpha = lineA;
        X.fillStyle = 'rgba(255,207,107,.10)'; X.beginPath(); X.moveTo(sx + nx * rx * .9, sy + ny * ry * .9); X.lineTo(cx + nx * rr, cyy + ny * rr); X.lineTo(cx - nx * rr, cyy - ny * rr); X.lineTo(sx - nx * rx * .9, sy - ny * ry * .9); X.closePath(); X.fill();
        X.strokeStyle = 'rgba(255,207,107,.75)'; X.lineWidth = 3; X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 6;
        for (const s of [1, -1]) { X.beginPath(); X.moveTo(sx + s * nx * rx * .9, sy + s * ny * ry * .9); X.lineTo(cx + s * nx * rr, cyy + s * ny * rr); X.stroke(); }
        X.restore();
      }
      X.save(); X.globalAlpha = Math.min(1, ip * 2);
      X.shadowColor = 'rgba(0,0,0,.55)'; X.shadowBlur = 30; X.shadowOffsetY = 10; X.fillStyle = '#120e0c'; X.beginPath(); X.arc(cx, cyy, rr, 0, Math.PI * 2); X.fill(); X.shadowColor = 'transparent';
      X.save(); X.beginPath(); X.arc(cx, cyy, Math.max(.5, rr - 2), 0, Math.PI * 2); X.clip();
      const z = 1.04 + .05 * U.smoothstep(tIn, 7.2, t), S = rr * 2 * z;  // slow push inside the lens (never static)
      X.drawImage(R.inset, cx - S / 2, cyy - S / 2, S, S);
      const gl = X.createRadialGradient(cx - rr * .35, cyy - rr * .45, rr * .05, cx, cyy, rr); gl.addColorStop(0, 'rgba(255,255,255,.10)'); gl.addColorStop(.5, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,.28)'); X.fillStyle = gl; X.fillRect(cx - rr, cyy - rr, rr * 2, rr * 2);
      X.restore();
      X.lineWidth = 7; X.strokeStyle = '#ffcf6b'; X.beginPath(); X.arc(cx, cyy, rr, 0, Math.PI * 2); X.stroke();
      X.lineWidth = 2; X.strokeStyle = 'rgba(40,24,8,.6)'; X.beginPath(); X.arc(cx, cyy, Math.max(.5, rr - 5), 0, Math.PI * 2); X.stroke();
      X.restore();
      badge = [U.lerp(badge[0], icx, ip), U.lerp(badge[1], icy + RIN + 6, ip)];
    }
    ui.pill('2 örnek', { t, t0: tDus + .15, x: badge[0], y: badge[1], size: 50, bg: 'rgba(16,20,38,.88)', color: '#ffcf6b', border: 'rgba(255,207,107,.5)', borderW: 2 });

    { const a = U.smoothstep(tYal - .3, tYal + .3, t); if (a > 0) { const g = X.createLinearGradient(0, 0, 0, 600); g.addColorStop(0, `rgba(8,10,20,${.6 * a})`); g.addColorStop(1, 'rgba(8,10,20,0)'); X.fillStyle = g; X.fillRect(0, 0, 1080, 600); } }
    ui.text('yalnızca', { t, t0: tYal - .05, x: 540, y: 304, size: 62, weight: 800, color: '#fff4dc', anim: 'rise' });
    ui.text('İKİ ÖRNEK', { t, t0: tIki - .06, x: 540, y: 440, size: 116, weight: 900, color: '#ffcf6b', letterSpacing: 4, anim: 'pop' });
  },
};
