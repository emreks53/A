// Group F helpers (s13, s14): instanced library books with a spine atlas, keyed camera path, scrolls, chronicle volumes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from './textures.js';
import { rbox, MAT, lathe, shadowAll } from './models.js';
import { rng, clamp } from './util.js';

// ------------------------------------------------------------------------------------------------
// Camera path keyed by TIME: keys = [[t, [x,y,z], yawDeg, pitchDeg, fov?, roll?], ...]
// Cubic Hermite through keys with Catmull-Rom tangents on non-uniform time knots (smooth velocity).
// yaw: 0 looks toward -Z, positive turns toward -X (left). pitch: positive looks up.
export function camPath(keys) {
  const n = keys.length;
  const val = (i, k) => { const v = keys[i][k]; return Array.isArray(v) ? v : [v]; };
  // monotone (Fritsch–Carlson) tangents: no overshoot when segments have very different lengths / reverse direction
  function tangent(i, k) {
    const v = val(i, k);
    const d0 = i > 0 ? val(i - 1, k).map((x, j) => (v[j] - x) / (keys[i][0] - keys[i - 1][0])) : null;
    const d1 = i < n - 1 ? val(i + 1, k).map((x, j) => (x - v[j]) / (keys[i + 1][0] - keys[i][0])) : null;
    if (!d0) return d1; if (!d1) return d0;
    return d0.map((a, j) => { const b = d1[j]; if (a * b <= 0) return 0; const m = (a + b) / 2; const lim = 3 * Math.min(Math.abs(a), Math.abs(b)); return Math.sign(m) * Math.min(Math.abs(m), lim); });
  }
  function evalK(t, k) {
    if (t <= keys[0][0]) { const m = tangent(0, k); return val(0, k).map((x, j) => x + m[j] * (t - keys[0][0])); }
    if (t >= keys[n - 1][0]) { const m = tangent(n - 1, k); return val(n - 1, k).map((x, j) => x + m[j] * (t - keys[n - 1][0])); }
    // (outside the keyed range the camera keeps drifting with its end velocity, so handles never freeze)
    let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
    const t0 = keys[i][0], t1 = keys[i + 1][0], h = t1 - t0, s = (t - t0) / h;
    const p0 = val(i, k), p1 = val(i + 1, k), m0 = tangent(i, k), m1 = tangent(i + 1, k);
    const s2 = s * s, s3 = s2 * s; const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    return p0.map((x, j) => h00 * x + h10 * h * m0[j] + h01 * p1[j] + h11 * h * m1[j]);
  }
  return {
    pos: t => new THREE.Vector3(...evalK(t, 1)),
    apply(camera, t, extraShake) {
      const p = evalK(t, 1), yaw = evalK(t, 2)[0] * Math.PI / 180, pitch = evalK(t, 3)[0] * Math.PI / 180;
      camera.position.set(p[0], p[1], p[2]);
      if (extraShake) camera.position.add(extraShake);
      camera.rotation.order = 'YXZ'; camera.rotation.set(pitch, yaw, keys[0][5] !== undefined ? evalK(t, 5)[0] * Math.PI / 180 : 0);
      if (keys[0][4] !== undefined) { camera.fov = evalK(t, 4)[0]; camera.updateProjectionMatrix(); }
      camera.updateMatrixWorld();
    },
  };
}
// yaw/pitch (deg) that make a camera at `from` look at `to` (for authoring keys)
export function aim(from, to) {
  const dx = to[0] - from[0], dy = to[1] - from[1], dz = to[2] - from[2];
  return [Math.atan2(-dx, -dz) * 180 / Math.PI, Math.atan2(dy, Math.hypot(dx, dz)) * 180 / Math.PI];
}

// ------------------------------------------------------------------------------------------------
// Spine atlas: N cells (each 128x512) side by side. Color canvas: grayscale leather grain (tinted per instance)
// + gold raised bands, fillets and coloured title labels (no lettering). Mask canvas: R = "not tinted" (decor),
// G = roughness, B = metalness (three reads G/B from roughnessMap/metalnessMap).
const ATLAS_N = 8;
let _atlas = null;
export function spineAtlas() {
  if (_atlas) return _atlas;
  const CW = 128, CH = 512, W = CW * ATLAS_N;
  const col = document.createElement('canvas'); col.width = W; col.height = CH; const c = col.getContext('2d');
  const msk = document.createElement('canvas'); msk.width = W; msk.height = CH; const m = msk.getContext('2d');
  const R = rng(91);
  // leather grain base
  c.fillStyle = '#eeeeee'; c.fillRect(0, 0, W, CH);
  for (let i = 0; i < 9000; i++) { const g = 200 + Math.floor(R() * 55); c.fillStyle = `rgb(${g},${g},${g})`; c.globalAlpha = .35; c.fillRect(R() * W, R() * CH, 1 + R() * 2.5, 1 + R() * 2.5); }
  c.globalAlpha = 1;
  // spine shading across width (rounded spine reads better)
  for (let k = 0; k < ATLAS_N; k++) { const gr = c.createLinearGradient(k * CW, 0, (k + 1) * CW, 0); gr.addColorStop(0, 'rgba(0,0,0,.22)'); gr.addColorStop(.25, 'rgba(0,0,0,0)'); gr.addColorStop(.75, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.22)'); c.fillStyle = gr; c.fillRect(k * CW, 0, CW, CH); }
  m.fillStyle = 'rgb(0,150,0)'; m.fillRect(0, 0, W, CH); // leather: rough .6, non-metal
  const gold = (x, y, w, h) => {
    const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#fff0b0'); gr.addColorStop(.45, '#e2b552'); gr.addColorStop(1, '#8c6420');
    c.fillStyle = gr; c.fillRect(x, y, w, h); m.fillStyle = 'rgb(255,90,230)'; m.fillRect(x, y, w, h);
  };
  const label = (x, y, w, h, fill) => {
    c.fillStyle = fill; c.fillRect(x, y, w, h); m.fillStyle = 'rgb(255,120,0)'; m.fillRect(x, y, w, h);
    gold(x, y, w, 3); gold(x, y + h - 3, w, 3);
    // small gold lozenge ornament (no lettering)
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(Math.PI / 4); c.fillStyle = '#e8c463'; c.fillRect(-6, -6, 12, 12); c.restore();
    m.save(); m.translate(x + w / 2, y + h / 2); m.rotate(Math.PI / 4); m.fillStyle = 'rgb(255,90,230)'; m.fillRect(-6, -6, 12, 12); m.restore();
  };
  const labels = ['#3a0f0c', '#16110d', '#1d3a26', '#5a1a12', '#1b2440', '#3a0f0c', '#16110d', '#4a2a10'];
  for (let k = 0; k < ATLAS_N; k++) {
    const x0 = k * CW; const nb = 3 + (k % 3); // raised bands
    const top = 30, bot = CH - 30; const step = (bot - top) / (nb + 1);
    for (let b = 1; b <= nb; b++) { const y = top + step * b; gold(x0, y - 7, CW, 5); gold(x0, y + 3, CW, 3); }
    gold(x0, 14, CW, 4); gold(x0, CH - 18, CW, 4);
    if (k % 4 !== 3) { const yb = top + step * (k % 2 ? 1 : 0) + 12; label(x0 + 10, yb, CW - 20, Math.min(step - 24, 90), labels[k]); }
    if (k % 3 === 0) { const yb = top + step * nb + 14; label(x0 + 10, yb, CW - 20, Math.min(step - 28, 60), labels[(k + 3) % ATLAS_N]); }
  }
  const tc = new THREE.CanvasTexture(col); tc.colorSpace = THREE.SRGBColorSpace; tc.anisotropy = 4;
  const tm = new THREE.CanvasTexture(msk); tm.colorSpace = THREE.NoColorSpace; tm.anisotropy = 4;
  _atlas = { map: tc, mask: tm, n: ATLAS_N };
  return _atlas;
}

// unit book geometry (x = thickness, y = height, z = cover width; spine bulges toward +Z)
let _bg = null;
function bookGeos() {
  if (_bg) return _bg;
  // (non-uniform instance scale makes small bevels meaningless, so plain boxes for the boards)
  const c1 = new THREE.BoxGeometry(.12, 1, .9); c1.translate(-.44, 0, -.05);
  const c2 = new THREE.BoxGeometry(.12, 1, .9); c2.translate(.44, 0, -.05);
  const covers = mergeGeometries([c1, c2]);
  const spine = new THREE.CylinderGeometry(.5, .5, 1, 8, 1, false, -Math.PI / 2, Math.PI); spine.scale(1, 1, .16); spine.translate(0, 0, .38);
  const pages = new THREE.BoxGeometry(.78, .94, .9); pages.translate(0, 0, -.06);
  _bg = { covers, spine, pages };
  return _bg;
}

// Instanced library books. items: [{m: Matrix4 (world; scale = thickness,height,width), color, v (atlas idx)}]
// Returns group; group.userData.setMatrix(i, m4) / commit() for animation.
export function bookInstances(items, o = {}) {
  const { covers, spine, pages } = bookGeos(); const A = spineAtlas(); const n = items.length;
  const lt = TEX.leather({ a: '#f4f1ee', b: '#b9b4ae', seed: 61 });
  const coverMat = new THREE.MeshStandardMaterial({ map: lt.map, normalMap: lt.normalMap, normalScale: new THREE.Vector2(.35, .35), roughness: .62 });
  const spineMat = new THREE.MeshStandardMaterial({ map: A.map, roughnessMap: A.mask, metalnessMap: A.mask, metalness: 1, roughness: 1 });
  spineMat.onBeforeCompile = sh => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aSpine;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec2 aUv = uv * vec2(${(1 / A.n).toFixed(6)}, 1.) + vec2(aSpine * ${(1 / A.n).toFixed(6)}, 0.);
        vMapUv = aUv; vRoughnessMapUv = aUv; vMetalnessMapUv = aUv;`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `float decorM = texture2D(metalnessMap, vMetalnessMapUv).r;
        #if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
        diffuseColor.rgb = mix(diffuseColor.rgb * vColor, diffuseColor.rgb, decorM);
        #endif`);
  };
  spineMat.customProgramCacheKey = () => 'F_spine_atlas';
  const pt = TEX.drawTexture(64, 64, (x, W, H) => { x.fillStyle = '#efe0bf'; x.fillRect(0, 0, W, H); for (let i = 0; i < W; i += 2) { x.fillStyle = `rgba(120,88,50,${i % 6 === 0 ? .16 : .07})`; x.fillRect(i, 0, 1, H); } });
  const pageMat = new THREE.MeshStandardMaterial({ map: pt, roughness: .92, color: o.pageColor ?? '#f2e6cc' });
  const mk = (geo, mat, tint) => { const im = new THREE.InstancedMesh(geo, mat, n); if (tint) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); im.castShadow = o.castShadow ?? true; im.receiveShadow = true; im.frustumCulled = false; return im; };
  const spineGeo = spine.clone(); const aS = new Float32Array(n); spineGeo.setAttribute('aSpine', new THREE.InstancedBufferAttribute(aS, 1));
  const mC = mk(covers, coverMat, true), mS = mk(spineGeo, spineMat, true), mP = mk(pages, pageMat, false);
  mP.castShadow = false; // page blocks sit inside the covers: no need to render them into the shadow map
  const C = new THREE.Color();
  items.forEach((it, i) => {
    mC.setMatrixAt(i, it.m); mS.setMatrixAt(i, it.m); mP.setMatrixAt(i, it.m);
    C.set(it.color); mC.setColorAt(i, C); mS.setColorAt(i, C); aS[i] = it.v ?? (i % A.n);
  });
  spineGeo.attributes.aSpine.needsUpdate = true;
  const g = new THREE.Group(); g.add(mC, mS, mP);
  g.userData.meshes = [mC, mS, mP];
  g.userData.setMatrix = (i, m4) => { mC.setMatrixAt(i, m4); mS.setMatrixAt(i, m4); mP.setMatrixAt(i, m4); };
  g.userData.commit = () => { mC.instanceMatrix.needsUpdate = mS.instanceMatrix.needsUpdate = mP.instanceMatrix.needsUpdate = true; };
  return g;
}

// Fill one shelf (local coords: shelf board top at y, front edge at z = 0, books' spines toward +Z) from x0..x1.
// Pushes {pos:[x,y,z], rot:[rx,ry,rz], s:[thick,height,width], color, v} into out. clearance = free height above board.
export const LEATHER = ['#7a2418', '#5e1c14', '#6b4226', '#4f2f1c', '#8a5a30', '#2f4a2c', '#3c5a3a', '#24304f', '#9a6a2a', '#2c1d16', '#5a1a2a', '#7b3a1e', '#a0522d', '#33402a'];
export function fillShelf(R, x0, x1, y, clearance, depth, out, o = {}) {
  let x = x0 + .01; const flatP = o.flatP ?? .12, gapP = o.gapP ?? .03;
  while (x < x1 - .03) {
    const roll = R();
    if (roll < flatP && x1 - x > .36) { // horizontal stack (old manuscript style)
      const k = 2 + Math.floor(R() * 5); let yy = y; const W = Math.min(.24 + R() * .1, depth * .95), Lh = .2 + R() * .12;
      for (let j = 0; j < k && yy + .06 < y + clearance - .02; j++) { const th = .03 + R() * .035; out.push({ pos: [x + Lh / 2 + (R() - .5) * .02, yy + th / 2, -W / 2 + .02 + (R() - .5) * .015], rot: [0, (R() - .5) * .08, Math.PI / 2], s: [th, Lh, W], color: o.pick ? o.pick(R) : LEATHER[Math.floor(R() * LEATHER.length)], v: Math.floor(R() * ATLAS_N) }); yy += th; }
      x += Lh + .02; continue;
    }
    if (roll < flatP + gapP) { x += .04 + R() * .08; continue; }
    const th = .035 + R() * .05, h = Math.min(clearance - .015, (o.hMin ?? .2) + R() * (o.hVar ?? .16)), w = Math.min(depth * .95, .15 + R() * .1);
    let rz = 0; let px = x + th / 2;
    if (R() < .05) { rz = (R() < .5 ? -1 : 1) * (.08 + R() * .12); px += Math.abs(Math.sin(rz)) * h * .5; }
    out.push({ pos: [px, y + h / 2 * Math.cos(rz), -w / 2 + .01 + (R() - .5) * .02], rot: [0, (R() - .5) * .04, rz], s: [th, h, w], color: o.pick ? o.pick(R) : LEATHER[Math.floor(R() * LEATHER.length)], v: Math.floor(R() * ATLAS_N) });
    x += th + .002 + Math.abs(Math.sin(rz)) * h;
  }
  return out;
}
export function itemMatrix(it, parentM) {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...it.pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...it.rot)), new THREE.Vector3(...it.s));
  return parentM ? parentM.clone().multiply(m) : m;
}

// ------------------------------------------------------------------------------------------------
// Rolled parchment scroll (optionally with wooden rollers), tied with cord + wax seal. Axis along X.
export function scroll(o = {}) {
  const g = new THREE.Group(); const L = o.length ?? .34, r = o.radius ?? .028;
  const pt = TEX.parchment({ a: o.a ?? '#efdcb3', b: o.b ?? '#cfae7a', seed: o.seed ?? 17 });
  const side = new THREE.MeshStandardMaterial({ map: pt.map, roughness: .88 });
  const spiralTex = TEX.drawTexture(128, 128, (x, W, H) => {
    x.fillStyle = '#e8d3a6'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(110,78,40,.75)'; x.lineWidth = 2.2; x.beginPath();
    for (let a = 0; a < Math.PI * 2 * 6; a += .05) { const rr = 6 + a / (Math.PI * 2) * 9.5; const px = W / 2 + Math.cos(a) * rr, py = H / 2 + Math.sin(a) * rr; a === 0 ? x.moveTo(px, py) : x.lineTo(px, py); }
    x.stroke(); x.fillStyle = 'rgba(70,45,20,.8)'; x.beginPath(); x.arc(W / 2, H / 2, 5, 0, 7); x.fill();
  });
  const cap = new THREE.MeshStandardMaterial({ map: spiralTex, roughness: .9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 32, 1), [side, cap, cap]); body.rotation.z = Math.PI / 2; g.add(body);
  if (o.rollers) {
    const wood = MAT.darkWood({ rings: 8 });
    for (const s of [-1, 1]) { const k = lathe([[0, 0], [.011, 0], [.012, .02], [.018, .03], [.014, .042], [.006, .05], [0, .052]], wood, 16); k.rotation.z = s * -Math.PI / 2; k.position.x = s * L / 2; g.add(k); }
  }
  if (o.tie !== false) {
    const cord = new THREE.Mesh(new THREE.TorusGeometry(r + .002, .0026, 6, 32), new THREE.MeshStandardMaterial({ color: o.cord ?? '#8a2a1e', roughness: .8 }));
    cord.rotation.y = Math.PI / 2; cord.position.x = o.tieAt ?? 0; g.add(cord);
    const c2 = cord.clone(); c2.position.x += .012; g.add(c2);
    if (o.seal !== false) {
      const seal = new THREE.Mesh(new THREE.CylinderGeometry(.016, .017, .006, 20), new THREE.MeshPhysicalMaterial({ color: o.sealColor ?? '#9c1c14', roughness: .35, clearcoat: .6 }));
      seal.position.set((o.tieAt ?? 0) + .006, 0, r + .004); seal.rotation.x = Math.PI / 2; g.add(seal);
    }
  }
  return shadowAll(g);
}

export const _F = { clamp };
