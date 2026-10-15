// extra_S02.js — s02 set pieces: the Green Dome (Kubbe-i Hadrâ) of al-Masjid an-Nabawi, its Mamluk/Ottoman-style
// minaret, the small silver dome, the crenellated stone parapet, plaza + brass lantern posts.
// Modelled after reference photographs; dome proportions are measured in units of the dome's springline radius R:
//   white buttressed base 0–.42R · flared octagonal drum (lip 1.30R) .42–.84R · paired-window band (1.06R) .84–1.0R ·
//   blind-arch tier 1.0–1.22R · pointed ribbed ogive (48 ribs) 1.22R → apex ≈2.36R · gold lotus finial (3 bulbs + crescent).
// Everything is deterministic (seeded) and built once in setup.
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';

const TAU = Math.PI * 2;
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function srand(seed) { let s = (seed >>> 0) || 1; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ================================================================================================
// Textures: paired colour + height painters → {map, normalMap}
// ================================================================================================
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
export function normalFromHeight(hc, strength = 3, wrapY = false) {
  const w = hc.width, h = hc.height; const src = hc.getContext('2d').getImageData(0, 0, w, h).data;
  const H = new Float32Array(w * h); for (let i = 0; i < w * h; i++) H[i] = src[i * 4] / 255;
  const c = cnv(w, h); const x = c.getContext('2d'); const im = x.createImageData(w, h); const D = im.data;
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) {
    const xl = (i - 1 + w) % w, xr = (i + 1) % w; const yu = wrapY ? (y - 1 + h) % h : Math.max(0, y - 1), yd = wrapY ? (y + 1) % h : Math.min(h - 1, y + 1);
    const hx = H[y * w + xr] - H[y * w + xl], hy = H[yd * w + i] - H[yu * w + i];
    const nx = -hx * strength, ny = hy * strength, l = Math.hypot(nx, ny, 1); const p = (y * w + i) * 4;
    D[p] = (nx / l * .5 + .5) * 255; D[p + 1] = (ny / l * .5 + .5) * 255; D[p + 2] = (1 / l * .5 + .5) * 255; D[p + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}
export function texOf(c, { srgb = true, rep = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
}
const grey = v => { const k = Math.round(Math.min(1, Math.max(0, v)) * 255); return `rgb(${k},${k},${k})`; };
// draw(x, w, h, P, isHeight): P(colour, heightValue) returns the right fill for the current pass.
export function surface(w, h, draw, { strength = 3, rep = [1, 1], wrapY = false, blur = 1.2, base = .5 } = {}) {
  const cc = cnv(w, h), hc = cnv(w, h);
  draw(cc.getContext('2d'), w, h, (c) => c, false);
  const hx = hc.getContext('2d'); hx.fillStyle = grey(base); hx.fillRect(0, 0, w, h); draw(hx, w, h, (c, v) => grey(v), true);
  let hs = hc; if (blur) { hs = cnv(w, h); const bx = hs.getContext('2d'); bx.fillStyle = grey(base); bx.fillRect(0, 0, w, h); bx.filter = `blur(${blur}px)`; bx.drawImage(hc, 0, 0); }
  return { map: texOf(cc, { rep }), normalMap: texOf(normalFromHeight(hs, strength, wrapY), { srgb: false, rep }) };
}
// arch outlines (bottom y = by, width w, total height hh)
export function roundArch(x, cx, by, w, hh) { const r = w / 2; x.beginPath(); x.moveTo(cx - r, by); x.lineTo(cx - r, by - hh + r); x.arc(cx, by - hh + r, r, Math.PI, 0); x.lineTo(cx + r, by); x.closePath(); }
export function pointArch(x, cx, by, w, hh) {
  const r = w / 2, top = by - hh, spring = top + w * .7; x.beginPath(); x.moveTo(cx - r, by); x.lineTo(cx - r, spring);
  x.bezierCurveTo(cx - r, top + w * .3, cx - r * .25, top + w * .12, cx, top); x.bezierCurveTo(cx + r * .25, top + w * .12, cx + r, top + w * .3, cx + r, spring); x.lineTo(cx + r, by); x.closePath();
}
function mottle(x, w, h, seed, n, cols, a0 = .03, a1 = .06, sx = [4, 20], sy = [4, 20]) {
  const r = srand(seed); for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${cols[Math.floor(r() * cols.length)]},${a0 + r() * (a1 - a0)})`; x.beginPath(); x.ellipse(r() * w, r() * h, sx[0] + r() * (sx[1] - sx[0]), sy[0] + r() * (sy[1] - sy[0]), r() * 3, 0, TAU); x.fill(); }
}

// ================================================================================================
// Geometry
// ================================================================================================
// Revolve [[r,y],...] about Y (x = r·sinθ, z = r·cosθ, like THREE.LatheGeometry). disp(θ, r, y, j) → radius multiplier.
// uv: u = θ/2π·uRep, v = arc length (0 at first point) normalised. Seam normals are averaged.
export function revolve(prof, cols, { disp = null, uRep = 1, vMode = 'arc', phi0 = 0 } = {}) {
  const rows = prof.length, pos = [], uv = [], idx = [];
  const L = [0]; for (let j = 1; j < rows; j++) L.push(L[j - 1] + Math.hypot(prof[j][0] - prof[j - 1][0], prof[j][1] - prof[j - 1][1]));
  const y0 = prof[0][1], y1 = prof[rows - 1][1];
  for (let j = 0; j < rows; j++) {
    const [r, y] = prof[j]; const v = vMode === 'arc' ? L[j] / (L[rows - 1] || 1) : (y - y0) / ((y1 - y0) || 1);
    for (let i = 0; i <= cols; i++) { const th = phi0 + i / cols * TAU; const rr = Math.max(0, disp ? r * disp(th - phi0, r, y, j) : r); pos.push(rr * Math.sin(th), y, rr * Math.cos(th)); uv.push(i / cols * uRep, v); }
  }
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols; i++) { const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, b, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal; for (let j = 0; j < rows; j++) { const a = j * (cols + 1), b = a + cols; const v = new THREE.Vector3(n.getX(a) + n.getX(b), n.getY(a) + n.getY(b), n.getZ(a) + n.getZ(b)).normalize(); n.setXYZ(a, v.x, v.y, v.z); n.setXYZ(b, v.x, v.y, v.z); }
  return g;
}
// Revolve several runs (hard edges between runs) into one geometry.
export function revolveRuns(runs, cols, o = {}) { return mergeGeos(runs.map(r => revolve(r, cols, o))); }
// Regular n-gon prism swept along runs of [apothem, y] (smooth within a run, hard edges between runs and faces).
// Face k is centred at angle rot + k·2π/n (angle 0 faces +z). uv: u 0..uRep across each face, v = (y − yMin)/(yMax − yMin).
export function prism(runs, n, { rot = 0, uRep = 1 } = {}) {
  const pos = [], uv = [], idx = []; let yMin = Infinity, yMax = -Infinity;
  runs.forEach(run => run.forEach(([, y]) => { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }));
  const kc = 1 / Math.cos(Math.PI / n);
  for (let k = 0; k < n; k++) {
    const ac = rot + k * TAU / n, aL = ac - Math.PI / n, aR = ac + Math.PI / n;
    for (const run of runs) {
      const base = pos.length / 3;
      for (const [a, y] of run) { const rc = a * kc; pos.push(rc * Math.sin(aL), y, rc * Math.cos(aL), rc * Math.sin(aR), y, rc * Math.cos(aR)); const v = (y - yMin) / ((yMax - yMin) || 1); uv.push(0, v, uRep, v); }
      for (let i = 0; i < run.length - 1; i++) { const a = base + i * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, b, d, a, d, c); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function mergeGeos(geos) {
  const pos = [], nor = [], uv = [], idx = []; let off = 0;
  for (const g of geos) {
    const gi = g.index ? g : null; const P = g.attributes.position, N = g.attributes.normal, UV = g.attributes.uv;
    for (let i = 0; i < P.count; i++) { pos.push(P.getX(i), P.getY(i), P.getZ(i)); nor.push(N.getX(i), N.getY(i), N.getZ(i)); uv.push(UV ? UV.getX(i) : 0, UV ? UV.getY(i) : 0); }
    if (gi) for (let i = 0; i < g.index.count; i++) idx.push(g.index.getX(i) + off); else for (let i = 0; i < P.count; i++) idx.push(i + off);
    off += P.count;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
const mesh = (g, m, cast = true, recv = true) => { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = recv; return o; };

// Upward-opening crescent: outer circle r1 at origin minus inner circle r2 centred (0, dy)
export function crescentShape(r1, dy, r2) {
  const yi = (r1 * r1 - r2 * r2 + dy * dy) / (2 * dy), xi = Math.sqrt(Math.max(0, r1 * r1 - yi * yi));
  const a1 = Math.atan2(yi, xi), a2 = Math.atan2(yi - dy, xi); const sh = new THREE.Shape(); const N = 48;
  for (let i = 0; i <= N; i++) { const a = a1 - (i / N) * (Math.PI + 2 * a1); const p = [Math.cos(a) * r1, Math.sin(a) * r1]; i ? sh.lineTo(...p) : sh.moveTo(...p); }
  for (let i = 0; i <= N; i++) { const a = (Math.PI - a2) + (i / N) * (Math.PI + 2 * a2); sh.lineTo(Math.cos(a) * r2, dy + Math.sin(a) * r2); }
  sh.closePath(); return sh;
}
function crescent(r1, dy, r2, depth, mat) {
  const g = new THREE.ExtrudeGeometry(crescentShape(r1, dy, r2), { depth, bevelEnabled: true, bevelThickness: depth * .35, bevelSize: depth * .35, bevelSegments: 3, curveSegments: 40 });
  g.translate(0, 0, -depth / 2); return mesh(g, mat);
}

// ================================================================================================
// Materials
// ================================================================================================
export function materials() {
  const M = {};
  M.gold = new THREE.MeshPhysicalMaterial({ color: '#f0b94e', metalness: 1, roughness: .26, clearcoat: .35, clearcoatRoughness: .2, envMapIntensity: 1.25 });
  M.bronze = new THREE.MeshPhysicalMaterial({ color: '#b08348', metalness: 1, roughness: .34, envMapIntensity: 1.1 });
  M.white = new THREE.MeshStandardMaterial({ color: '#efeae1', roughness: .82 });
  M.silver = new THREE.MeshStandardMaterial({ color: '#bfc3c6', metalness: .6, roughness: .44, envMapIntensity: .95 });
  M.iron = new THREE.MeshStandardMaterial({ color: '#27302b', metalness: .6, roughness: .45 });
  return M;
}
// satin painted lead (deep green) — physical with low clearcoat; colour comes from the map
function greenMat(s, o = {}) { return new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, normalScale: new THREE.Vector2(o.ns ?? 1, o.ns ?? 1), roughness: o.rough ?? .5, envMapIntensity: .9 }); }
const GREEN = '#26603a', GREEN_D = '#1b4629', GREEN_L = '#337046', HOLE = '#0d1611';

// ================================================================================================
// THE GREEN DOME — returns a Group whose origin is the roof level at the dome axis.
// ================================================================================================
export function greenDome({ R = 6.5, M = materials() } = {}) {
  const G = new THREE.Group(); const NR = 48;
  // ---- textures ----
  const bay = surface(128, 1024, (x, w, h, P, H) => { // one rib bay of the ogive (u: rib→rib, v: springline→apex)
    x.fillStyle = P(GREEN, .5); x.fillRect(0, 0, w, h);
    if (!H) {
      const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(70,120,80,.10)'); g.addColorStop(1, 'rgba(10,30,15,.06)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      mottle(x, w, h, 7, 260, ['18,45,25', '70,118,82', '40,80,48'], .03, .07, [3, 14], [8, 40]);
      const r = srand(9); for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${r() < .5 ? '16,40,22' : '74,120,84'},${.025 + r() * .04})`; x.fillRect(r() * w, 0, 1 + r() * 6, h); }
      const a = x.createLinearGradient(0, 0, w, 0); a.addColorStop(0, 'rgba(120,170,128,.10)'); a.addColorStop(.035, 'rgba(120,170,128,.10)'); a.addColorStop(.05, 'rgba(8,26,12,.16)'); a.addColorStop(.14, 'rgba(8,26,12,0)'); a.addColorStop(.86, 'rgba(8,26,12,0)'); a.addColorStop(.95, 'rgba(8,26,12,.16)'); a.addColorStop(.965, 'rgba(120,170,128,.10)'); a.addColorStop(1, 'rgba(120,170,128,.10)'); x.fillStyle = a; x.fillRect(0, 0, w, h);
    } else { mottle(x, w, h, 11, 120, ['0,0,0', '255,255,255'], .02, .05, [6, 20], [10, 50]); }
    for (let k = 1; k < 15; k++) { const y = Math.round(h * k / 15); x.fillStyle = P('rgba(16,40,22,.5)', .36); x.fillRect(0, y - 1, w, 2); if (H) { x.fillStyle = P('', .6); x.fillRect(0, y + 1, w, 3); } else { x.fillStyle = 'rgba(110,160,120,.12)'; x.fillRect(0, y + 1, w, 2); } }
  }, { strength: 2.5, wrapY: false });
  const winB = surface(512, 128, (x, w, h, P, H) => { // window band tile: one pair of small round-headed windows
    x.fillStyle = P(GREEN, .5); x.fillRect(0, 0, w, h);
    if (!H) mottle(x, w, h, 21, 60, ['18,45,25', '70,118,82'], .03, .06, [6, 20], [6, 20]);
    x.fillStyle = P(GREEN_L, .62); x.fillRect(0, 0, w, 7); x.fillStyle = P(GREEN_D, .44); x.fillRect(0, h - 6, w, 6);
    for (const cx of [w * .33, w * .67]) {
      x.fillStyle = P('#3a7a47', .66); roundArch(x, cx, h - 14, 92, 104); x.fill();
      if (H) { x.fillStyle = P('', .08); roundArch(x, cx, h - 18, 72, 94); x.fill(); }
      else { const g = x.createLinearGradient(0, h - 112, 0, h - 18); g.addColorStop(0, '#060c08'); g.addColorStop(1, '#16251b'); x.fillStyle = g; roundArch(x, cx, h - 18, 72, 94); x.fill(); x.strokeStyle = 'rgba(120,170,130,.35)'; x.lineWidth = 2; roundArch(x, cx, h - 16, 80, 98); x.stroke(); }
    }
  }, { strength: 4 });
  const arcB = surface(512, 256, (x, w, h, P, H) => { // blind-arch tier tile: three shallow round-headed arches between ribs
    x.fillStyle = P(GREEN, .55); x.fillRect(0, 0, w, h);
    if (!H) mottle(x, w, h, 23, 80, ['18,45,25', '70,118,82'], .03, .06, [6, 20], [6, 30]);
    x.fillStyle = P(GREEN_D, .45); x.fillRect(0, h - 8, w, 8);
    for (let k = 0; k < 3; k++) {
      const cx = (k + .5) * w / 3;
      x.fillStyle = P(GREEN_L, .62); roundArch(x, cx, h - 10, 138, 226); x.fill();
      if (H) { const g = x.createLinearGradient(0, 30, 0, h); g.addColorStop(0, grey(.18)); g.addColorStop(1, grey(.3)); x.fillStyle = g; }
      else { const g = x.createLinearGradient(0, 24, 0, h - 14); g.addColorStop(0, '#173d22'); g.addColorStop(.35, '#24572f'); g.addColorStop(1, '#2b6436'); x.fillStyle = g; }
      roundArch(x, cx, h - 14, 118, 214); x.fill();
    }
  }, { strength: 4 });
  const drumF = surface(512, 256, (x, w, h, P, H) => { // one octagon face of the drum: two blind niches above the flare
    x.fillStyle = P(GREEN, .5); x.fillRect(0, 0, w, h);
    if (!H) { mottle(x, w, h, 31, 90, ['18,45,25', '70,118,82'], .03, .06, [6, 24], [6, 24]); const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(8,26,12,.18)'); g.addColorStop(.04, 'rgba(8,26,12,0)'); g.addColorStop(.96, 'rgba(8,26,12,0)'); g.addColorStop(1, 'rgba(8,26,12,.18)'); x.fillStyle = g; x.fillRect(0, 0, w, h); }
    x.fillStyle = P(GREEN_L, .6); x.fillRect(0, 0, w, 10);
    for (const cx of [w * .25, w * .75]) {
      x.fillStyle = P(GREEN_L, .64); roundArch(x, cx, 192, 92, 156); x.fill();
      if (H) { x.fillStyle = P('', .22); } else { const g = x.createLinearGradient(0, 40, 0, 190); g.addColorStop(0, '#163a20'); g.addColorStop(.4, '#225430'); g.addColorStop(1, '#2a6235'); x.fillStyle = g; }
      roundArch(x, cx, 188, 78, 146); x.fill();
    }
  }, { strength: 4 });

  const mOg = greenMat(bay), mWin = greenMat(winB), mArc = greenMat(arcB), mDrum = greenMat(drumF);
  [bay, winB, arcB, drumF].forEach(s => { s.map.wrapT = s.normalMap.wrapT = THREE.ClampToEdgeWrapping; });

  // ---- white faceted base with pyramid-like corner buttresses ----
  const s = R;
  const core = mesh(prism([[[1.2 * s, 0], [1.2 * s, .43 * s]], [[1.2 * s, .43 * s], [0, .43 * s]]], 8), M.white); G.add(core);
  const bp = [[-.20, 0, 1.58], [.20, 0, 1.58], [-.36, 0, 1.12], [.36, 0, 1.12], [0, .405, 1.25], [-.17, .405, 1.15], [.17, .405, 1.15], [0, .2, 1.46], [-.3, .16, 1.16], [.3, .16, 1.16]].map(([a, b, c]) => new THREE.Vector3(a * s, b * s, c * s));
  const bGeo = new ConvexGeometry(bp);
  for (let k = 0; k < 8; k++) { const b = mesh(bGeo, M.white); b.rotation.y = (k + .5) * TAU / 8; G.add(b); }
  // small openings in the base (dark glass in a green frame)
  const openTex = texOf((() => { const c = cnv(64, 96); const x = c.getContext('2d'); x.fillStyle = '#2c6a3a'; x.fillRect(0, 0, 64, 96); x.fillStyle = '#0f1814'; x.fillRect(8, 8, 48, 80); x.fillStyle = 'rgba(120,160,150,.18)'; x.fillRect(10, 10, 20, 76); return c; })());
  const openMat = new THREE.MeshStandardMaterial({ map: openTex, roughness: .4, metalness: .2 });
  for (const [ang, off] of [[0, -.25], [TAU / 8 * 2, .2], [-TAU / 8 * 2, -.2]]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(.11 * s, .19 * s), openMat); o.position.set(Math.sin(ang) * 1.201 * s + Math.cos(ang) * off * s, .14 * s, Math.cos(ang) * 1.201 * s - Math.sin(ang) * off * s); o.rotation.y = ang; o.receiveShadow = true; G.add(o); }

  // ---- octagonal drum: projecting lip, concave flare, faces, cornice ----
  const drum = mesh(prism([
    [[1.19 * s, .42 * s], [1.305 * s, .426 * s]],
    [[1.305 * s, .426 * s], [1.305 * s, .452 * s]],
    [[1.305 * s, .452 * s], [1.215 * s, .468 * s]],
    [[1.215 * s, .468 * s], [1.18 * s, .49 * s], [1.16 * s, .52 * s], [1.148 * s, .57 * s], [1.142 * s, .64 * s], [1.14 * s, .80 * s]],
    [[1.14 * s, .80 * s], [1.168 * s, .806 * s]],
    [[1.168 * s, .806 * s], [1.168 * s, .83 * s]],
    [[1.168 * s, .83 * s], [1.07 * s, .842 * s]],
  ], 8), mDrum); G.add(drum);
  // ---- circular window band + ledge ----
  G.add(mesh(revolveRuns([[[1.065 * s, .838 * s], [1.065 * s, 1.008 * s]]], 192, { uRep: 16 }), mWin));
  G.add(mesh(revolveRuns([[[1.065 * s, 1.008 * s], [1.082 * s, 1.013 * s]], [[1.082 * s, 1.013 * s], [1.082 * s, 1.025 * s]], [[1.082 * s, 1.025 * s], [1.046 * s, 1.032 * s]]], 192), mDrum));
  // ---- blind-arch tier (ribs continue as pilasters) ----
  const ribDisp = (amp, wide = 1) => th => { const f = (th / TAU * NR) % 1, d = Math.min(f, 1 - f); const bat = sstep(.085 * wide, .032 * wide, d), pil = sstep(.07, .5, d); return 1 + amp * (.016 * bat + .0012 * pil); };
  const tierProf = []; for (let i = 0; i <= 10; i++) { const t = i / 10; tierProf.push([1.046 * s, (1.03 + .18 * t) * s]); } tierProf.push([1.03 * s, 1.218 * s], [1.0 * s, 1.226 * s]);
  G.add(mesh(revolve(tierProf, NR * 12, { disp: ribDisp(1, 1.2), uRep: 16, phi0: 0, vMode: 'y' }), mArc));
  // ---- the pointed ribbed ogive ----
  // silhouette measured from the reference photo (r, h above the springline, in R): near-hemispherical shoulders,
  // then an almost conical pointed crown (~37° flanks) reaching ≈1.165R under the lotus finial.
  const ys = 1.22 * s; const rows = 64;
  const ref = [[1, 0], [.997, .05], [.988, .12], [.972, .2], [.948, .28], [.915, .36], [.873, .44], [.822, .52], [.76, .6], [.685, .68], [.6, .76], [.505, .84], [.405, .92], [.3, 1.0], [.195, 1.07], [.1, 1.125], [0, 1.165]];
  const spl = new THREE.SplineCurve(ref.map(([r, h]) => new THREE.Vector2(r, h))).getSpacedPoints(rows);
  const og = spl.map((v, j) => [j === rows ? 0 : Math.max(0, v.x) * s, ys + (j === rows ? 1.165 : v.y) * s]); og[0] = [s, ys];
  const apexY = og[rows][1];
  const ogive = mesh(revolve(og, NR * 12, { disp: ribDisp(1), uRep: NR }), mOg); G.add(ogive);
  // ---- gold finial (alem): lobed lotus calyx, stem with three onion bulbs and collars, small upward crescent ----
  const lotR = .085 * s; let yb = apexY; for (let j = rows; j >= 0; j--) { if (og[j][0] >= lotR * .72) { yb = og[j][1]; break; } }
  const fin = new THREE.Group(); fin.position.y = yb; G.add(fin);
  const lot = [[.72, 0], [.9, .05], [1.0, .16], [1.0, .3], [.9, .46], [.68, .6], [.42, .7], [.24, .76], [.17, .8]].map(([r, y]) => [r * lotR, y * lotR * 1.9]);
  fin.add(mesh(revolve(lot, 120, { disp: th => .86 + .14 * Math.sqrt(Math.abs(Math.cos(th * 5))) }), M.gold));
  let y = lot[lot.length - 1][1]; const k = .0125 * s;
  const add = (o, dy) => { o.position.y = y; fin.add(o); y += dy; };
  const collar = (r) => mesh(revolve([[r * .6, 0], [r, .25 * k], [r, .65 * k], [r * .6, .9 * k]], 32), M.gold);
  const bulb = (sc) => { const p = [[.25, 0], [.62, .14], [.95, .42], [1, .62], [.82, .86], [.46, 1.05], [.24, 1.16], [.2, 1.22]].map(([r, yy]) => [r * 4.4 * k * sc, yy * 5.2 * k * sc]); return [mesh(revolve(p, 40), M.gold), p[p.length - 1][1]]; };
  const stem = (len) => { const m = mesh(new THREE.CylinderGeometry(.9 * k, .9 * k, len, 12), M.gold); m.geometry.translate(0, len / 2, 0); return m; };
  add(stem(1.4 * k), 1.2 * k); add(collar(2.4 * k), .8 * k);
  for (const sc of [1, .86, .72]) { const [b, hh] = bulb(sc); add(b, hh * .97); add(collar(2.1 * k * sc), .78 * k); }
  add(stem(2.4 * k), 2.0 * k);
  const cr = crescent(3.6 * k, 1.5 * k, 3.0 * k, .7 * k, M.gold); cr.position.y = y + 2.6 * k; fin.add(cr); cr.rotation.y = .5;
  const topY = yb + y + 6.5 * k;
  G.userData = { R: s, apexY, finialBaseY: yb, topY, lipY: .45 * s, lipR: 1.305 * s, crescentY: yb + y + 2.6 * k, ogive, finial: fin };
  return G;
}

// ================================================================================================
// Small silver (lead) dome
// ================================================================================================
export function silverDome({ r = 2.1, M = materials() } = {}) {
  const G = new THREE.Group();
  G.add(mesh(revolveRuns([[[1.06 * r, 0], [1.06 * r, .16 * r]], [[1.06 * r, .16 * r], [1.0 * r, .19 * r]]], 48), M.white));
  const p = []; for (let i = 0; i <= 40; i++) { const t = i / 40, a = t * Math.PI / 2; let rr = Math.cos(a) * (1 - .05 * Math.pow(Math.sin(a), 4)), yy = Math.sin(a) * 1.08; if (i === 40) rr = 0; p.push([rr * r, .19 * r + yy * r]); }
  const n = 24; G.add(mesh(revolve(p, n * 12, { disp: th => { const f = (th / TAU * n) % 1, d = Math.min(f, 1 - f); return 1 + .016 * sstep(.09, .03, d); } }), M.silver));
  const top = .19 * r + 1.08 * r;
  const sp = mesh(revolve([[.09, 0], [.12, .06], [.08, .14], [.05, .2], [.04, .5], [.07, .56], [.04, .64], [.02, .9], [.0001, 1.0]].map(([a, b]) => [a * r * .55, b * r * .55]), 24), M.gold); sp.position.y = top - .03; G.add(sp);
  return G;
}

// ================================================================================================
// Mamluk/Ottoman minaret (after the Ra'isiyya minaret): origin at ground; P = parapet height (where the carved part starts)
// ================================================================================================
export function minaret({ P = 14, M = materials(), stone } = {}) {
  const G = new THREE.Group();
  const CREAM = '#efe2c6', SH = '#b8a07a', SH2 = '#d2bf9c', HL = '#fbf3e2';
  const stoneM = (s, rough = .86) => new THREE.MeshStandardMaterial({ map: s.map, normalMap: s.normalMap, roughness: rough });
  const plain = stone ?? new THREE.MeshStandardMaterial({ color: CREAM, roughness: .86 });
  // --- square shaft (carved panels) ---
  const shaftTop = P + 13.2, W2 = 3.5;
  const shaft = surface(512, 1024, (x, w, h, Pp, H) => {
    x.fillStyle = Pp(CREAM, .55); x.fillRect(0, 0, w, h);
    if (!H) mottle(x, w, h, 41, 220, ['190,165,125', '255,248,230', '210,190,150'], .03, .08, [6, 30], [6, 30]);
    // block joints
    x.fillStyle = Pp('rgba(150,125,90,.35)', .42); for (let yy = 40; yy < h; yy += 74) { x.fillRect(0, yy, w, 2); for (let xx = (Math.round(yy / 74) % 2) * 64 + 30; xx < w; xx += 128) x.fillRect(xx, yy, 2, 74); }
    // corner pilaster strips
    for (const xx of [0, w - 26]) { x.fillStyle = Pp(HL, .78); x.fillRect(xx, 0, 26, h); x.fillStyle = Pp('rgba(160,135,100,.4)', .5); x.fillRect(xx + (xx ? 0 : 24), 0, 2, h); }
    // string courses
    for (const yy of [16, 250]) { x.fillStyle = Pp(HL, .74); x.fillRect(0, yy, w, 14); x.fillStyle = Pp('rgba(150,120,85,.45)', .38); x.fillRect(0, yy + 14, w, 4); }
    // central tall panel frame
    x.strokeStyle = Pp(HL, .75); x.lineWidth = 12; x.strokeRect(120, 40, 272, 650);
    x.strokeStyle = Pp('rgba(150,120,85,.5)', .4); x.lineWidth = 3; x.strokeRect(129, 49, 254, 632);
    // interlaced ribbon (two crossing pointed arches) at the top of the panel
    x.lineJoin = 'round';
    for (const [lw, c, v] of [[20, 'rgba(150,120,85,.55)', .35], [12, HL, .8]]) { x.lineWidth = lw; x.strokeStyle = Pp(c, v); for (const o of [-46, 46]) { pointArch(x, 256 + o, 245, 150, 200); x.stroke(); } }
    // small pointed niche (arrow) inside the knot
    x.fillStyle = Pp(SH, .2); pointArch(x, 256, 200, 34, 62); x.fill();
    // arched window niche + window
    x.fillStyle = Pp(SH2, .35); pointArch(x, 256, 470, 120, 190); x.fill();
    x.fillStyle = Pp('#3b2a1e', .1); roundArch(x, 256, 450, 46, 110); x.fill();
    // lower slot window
    x.fillStyle = Pp('#4a3826', .15); x.fillRect(246, 760, 20, 92);
    // pilaster colonnettes beside the niche
    for (const xx of [180, 332]) { x.fillStyle = Pp(HL, .76); x.fillRect(xx - 6, 300, 12, 360); }
  }, { strength: 3 });
  const shaftMesh = mesh(prism([[[W2, 0], [W2, P - 1]], [[W2, P - 1], [W2, shaftTop]]], 4, {}), stoneM(shaft));
  // UVs: give the region below the parapet the same texture (it is mostly hidden) — remap v so the carved part spans P-1..top
  { const uv = shaftMesh.geometry.attributes.uv, pos = shaftMesh.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { const yy = pos.getY(i); uv.setY(i, Math.max(0, (yy - (P - 1)) / (shaftTop - (P - 1)))); } }
  G.add(shaftMesh);
  // corner colonnettes
  const colG = new THREE.CylinderGeometry(.16, .16, shaftTop - P + .2, 10); colG.translate(0, (shaftTop - P + .2) / 2, 0);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const c = mesh(colG, plain); c.position.set(sx * (W2 + .02), P - .2, sz * (W2 + .02)); G.add(c); }
  // mini corbelled balconies under the windows (one per face)
  for (let k = 0; k < 4; k++) {
    const a = k * TAU / 4, bal = new THREE.Group(); bal.rotation.y = a; G.add(bal);
    const box = mesh(new THREE.BoxGeometry(1.25, .55, .5), plain); box.position.set(0, P + 6.72, W2 + .25); bal.add(box);
    const cor = mesh(new THREE.CylinderGeometry(.62, .2, .9, 4, 1), plain); cor.rotation.y = Math.PI / 4; cor.scale.set(1, 1, .45); cor.position.set(0, P + 6.0, W2 + .12); bal.add(cor);
  }
  // --- muqarnas texture factory: rows of pointed cells, alternating ---
  const muq = (cells, tiers, wpx = 512) => surface(wpx, 64 * tiers, (x, w, h, Pp, H) => {
    x.fillStyle = Pp(CREAM, .6); x.fillRect(0, 0, w, h);
    for (let t = 0; t < tiers; t++) {
      const y1 = h - t * 64, off = (t % 2) * .5; const cw = w / cells;
      for (let i = -1; i <= cells; i++) {
        const cx = (i + .5 + off) * cw;
        if (H) { const g = x.createLinearGradient(0, y1 - 62, 0, y1); g.addColorStop(0, grey(.05)); g.addColorStop(1, grey(.42)); x.fillStyle = g; }
        else { const g = x.createLinearGradient(0, y1 - 62, 0, y1); g.addColorStop(0, '#7d6648'); g.addColorStop(.55, '#bba37e'); g.addColorStop(1, '#e8d8b8'); x.fillStyle = g; }
        pointArch(x, cx, y1 - 3, cw * .86, 58); x.fill();
        x.strokeStyle = Pp(HL, .75); x.lineWidth = 3; pointArch(x, cx, y1 - 2, cw * .9, 60); x.stroke();
      }
      x.fillStyle = Pp(HL, .72); x.fillRect(0, y1 - 4, w, 4);
    }
  }, { strength: 3.5 });
  const muqSq = muq(12, 3), muqOct = muq(4, 3), muqOct2 = muq(4, 2);
  const corbel = (n, a0, a1, y0, y1, tex, rot = 0) => { const runs = []; const steps = 14; const run = []; for (let i = 0; i <= steps; i++) { const t = i / steps; run.push([a0 + (a1 - a0) * Math.pow(t, 1.6), y0 + (y1 - y0) * t]); } runs.push(run); return mesh(prism(runs, n, { rot }), stoneM(tex, .9)); };
  // --- square muqarnas corbel + square balcony parapet with carved rosette panels ---
  G.add(corbel(4, W2, 4.22, shaftTop, P + 15.6, muqSq));
  G.add(mesh(prism([[[4.24, P + 15.6], [4.24, P + 15.75]], [[4.24, P + 15.75], [2.35, P + 15.75]]], 4), plain));
  const pan = surface(512, 96, (x, w, h, Pp, H) => {
    x.fillStyle = Pp(CREAM, .6); x.fillRect(0, 0, w, h); if (!H) mottle(x, w, h, 51, 40, ['190,165,125', '255,248,230'], .03, .07, [6, 20], [6, 20]);
    x.fillStyle = Pp(HL, .75); x.fillRect(0, 0, w, 10); x.fillStyle = Pp(SH2, .45); x.fillRect(0, h - 8, w, 8);
    for (let i = 0; i < 4; i++) {
      const cx = (i + .5) * w / 4, cy = h / 2 + 2; x.fillStyle = Pp(SH2, .38); x.fillRect(cx - 50, cy - 34, 100, 68);
      x.fillStyle = Pp(HL, .78); for (let p = 0; p < 8; p++) { const a = p * TAU / 8; x.beginPath(); x.ellipse(cx + Math.cos(a) * 15, cy + Math.sin(a) * 15, 14, 6, a, 0, TAU); x.fill(); }
      x.beginPath(); x.arc(cx, cy, 7, 0, TAU); x.fill(); x.strokeStyle = Pp(HL, .74); x.lineWidth = 4; x.strokeRect(cx - 44, cy - 28, 88, 56);
    }
  }, { strength: 3 });
  const panM = stoneM(pan);
  for (let k = 0; k < 4; k++) { const a = k * TAU / 4; const wall = mesh(new THREE.BoxGeometry(8.1, 1.5, .3), [plain, plain, plain, plain, panM, plain]); wall.position.set(Math.sin(a) * 3.95, P + 16.5, Math.cos(a) * 3.95); wall.rotation.y = a; G.add(wall); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const post = mesh(new THREE.BoxGeometry(.45, 1.75, .45), plain); post.position.set(sx * 3.98, P + 16.6, sz * 3.98); G.add(post); const ball = mesh(new THREE.SphereGeometry(.2, 14, 10), plain); ball.position.set(sx * 3.98, P + 17.68, sz * 3.98); G.add(ball); }
  // --- chevron octagon ---
  const chev = surface(256, 640, (x, w, h, Pp, H) => {
    x.fillStyle = Pp('#f1e3c7', .55); x.fillRect(0, 0, w, h);
    const rows = 10, top = 34, bot = h - 34, rh = (bot - top) / rows;
    for (let r = 0; r < rows; r++) {
      const yy = top + r * rh;
      x.beginPath(); for (let i = 0; i <= 4; i++) { const xx = i * w / 4, dy = (i % 2) ? rh * .42 : 0; i ? x.lineTo(xx, yy + dy) : x.moveTo(xx, yy + dy); }
      for (let i = 4; i >= 0; i--) { const xx = i * w / 4, dy = (i % 2) ? rh * .42 : 0; x.lineTo(xx, yy + dy + rh * .46); } x.closePath();
      x.fillStyle = Pp('#874e40', .42); x.fill();
      x.beginPath(); for (let i = 0; i <= 4; i++) { const xx = i * w / 4, dy = (i % 2) ? rh * .42 : 0; i ? x.lineTo(xx, yy + dy + rh * .62) : x.moveTo(xx, yy + dy + rh * .62); } x.strokeStyle = Pp('#b9796a', .5); x.lineWidth = 3; x.stroke();
    }
    x.fillStyle = Pp(HL, .72); x.fillRect(0, 0, w, 22); x.fillRect(0, h - 22, w, 22);
    for (let i = 0; i < 8; i++) { x.fillStyle = Pp('#9a4a3b', .4); x.beginPath(); x.moveTo(i * w / 8, h - 22); x.lineTo((i + .5) * w / 8, h - 34); x.lineTo((i + 1) * w / 8, h - 22); x.fill(); x.beginPath(); x.moveTo(i * w / 8, 22); x.lineTo((i + .5) * w / 8, 34); x.lineTo((i + 1) * w / 8, 22); x.fill(); }
    if (!H) mottle(x, w, h, 61, 120, ['150,120,90', '255,248,230'], .02, .06, [4, 16], [4, 16]);
  }, { strength: 2 });
  const o1 = 2.37; G.add(mesh(prism([[[o1, P + 15.75], [o1, P + 22.2]]], 8, { rot: 0 }), stoneM(chev)));
  const ring = (r, yy, tube = .09) => { const t = mesh(new THREE.TorusGeometry(r, tube, 8, 48), plain); t.rotation.x = Math.PI / 2; t.position.y = yy; G.add(t); };
  ring(o1 * 1.04, P + 17.3); ring(o1 * 1.04, P + 22.25);
  G.add(mesh(prism([[[o1, P + 22.2], [o1, P + 22.7]]], 8, { rot: 0 }), plain));
  // --- 1st round balcony (octagonal muqarnas corbel, floor, iron railing) ---
  const railTex = (() => { const c = cnv(512, 64); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 512, 6); x.fillRect(0, 56, 512, 8); x.fillRect(0, 30, 512, 3); for (let i = 0; i < 32; i++) { x.fillRect(i * 16 + 6, 0, 3, 64); x.beginPath(); x.arc(i * 16 + 7.5, 18, 5, 0, TAU); x.lineWidth = 2; x.strokeStyle = '#fff'; x.stroke(); } const t = texOf(c, { srgb: false }); return t; })();
  const railM = new THREE.MeshStandardMaterial({ color: '#28332d', metalness: .5, roughness: .45, alphaMap: railTex, transparent: true, alphaTest: .12, depthWrite: false, side: THREE.DoubleSide }); // soft alpha: no mip shimmer
  const balcony = (n, a0, a1, y0, y1, tex, railR, railRep) => {
    G.add(corbel(n, a0, a1, y0, y1, tex, 0));
    G.add(mesh(prism([[[a1 + .06, y1], [a1 + .06, y1 + .18]], [[a1 + .06, y1 + .18], [0, y1 + .18]]], n, { rot: 0 }), plain));
    const rt = railTex.clone(); rt.repeat.set(railRep, 1); rt.needsUpdate = true; const rm = railM.clone(); rm.alphaMap = rt;
    const rl = mesh(new THREE.CylinderGeometry(railR, railR, 1.05, 48, 1, true), rm); rl.position.y = y1 + .18 + .52; G.add(rl);
  };
  balcony(8, o1, 3.05, P + 22.7, P + 25.5, muqOct, 3.0, 5);
  // --- window shaft ---
  const winS = surface(256, 512, (x, w, h, Pp, H) => {
    x.fillStyle = Pp(CREAM, .55); x.fillRect(0, 0, w, h); if (!H) mottle(x, w, h, 71, 80, ['190,165,125', '255,248,230'], .03, .07, [6, 20], [6, 20]);
    x.fillStyle = Pp('rgba(150,125,90,.3)', .42); for (let yy = 30; yy < h; yy += 60) x.fillRect(0, yy, w, 2);
    x.fillStyle = Pp(HL, .74); x.fillRect(0, 0, 10, h); x.fillRect(w - 10, 0, 10, h); x.fillRect(0, 70, w, 12);
    x.fillStyle = Pp(SH2, .36); pointArch(x, w / 2, 400, 74, 250); x.fill();
    x.fillStyle = Pp('#3a2a1e', .1); pointArch(x, w / 2, 388, 46, 220); x.fill();
  }, { strength: 3 });
  const o2 = 1.9; G.add(mesh(prism([[[o2, P + 25.6], [o2, P + 29.8]]], 8, { rot: 0 }), stoneM(winS)));
  balcony(8, o2, 2.4, P + 29.8, P + 31.7, muqOct2, 2.36, 4);
  // --- upper arcade + muqarnas ring ---
  const arc = surface(256, 384, (x, w, h, Pp, H) => {
    x.fillStyle = Pp(CREAM, .55); x.fillRect(0, 0, w, h); if (!H) mottle(x, w, h, 81, 60, ['190,165,125', '255,248,230'], .03, .07, [6, 20], [6, 20]);
    x.fillStyle = Pp(HL, .74); x.fillRect(0, 0, w, 14);
    x.fillStyle = Pp(SH2, .38); roundArch(x, w / 2, h - 30, 120, 270); x.fill();
    x.fillStyle = Pp('#2e2219', .08); roundArch(x, w / 2, h - 30, 92, 250); x.fill();
  }, { strength: 3 });
  const o3 = 1.7; G.add(mesh(prism([[[o3, P + 31.8], [o3, P + 34.3]]], 8, { rot: 0 }), stoneM(arc)));
  G.add(corbel(8, o3, 2.02, P + 34.3, P + 35.3, muqOct2, 0));
  G.add(mesh(prism([[[2.05, P + 35.3], [2.05, P + 35.45]], [[2.05, P + 35.45], [1.45, P + 35.47]]], 8, { rot: 0 }), plain));
  // --- fluted (lobed) bulbous cap ---
  const capP = [[1.36, 0], [1.43, .5], [1.47, 1.2], [1.42, 1.9], [1.25, 2.5], [.95, 3.0], [.62, 3.32], [.5, 3.45]].map(([r, yy]) => [r, P + 35.45 + yy]);
  const capS = surface(256, 256, (x, w, h, Pp, H) => { x.fillStyle = Pp(CREAM, .5); x.fillRect(0, 0, w, h); if (!H) mottle(x, w, h, 91, 60, ['190,165,125', '255,248,230'], .03, .07, [6, 20], [6, 20]); });
  G.add(mesh(revolve(capP, 16 * 12, { disp: th => { const f = (th / TAU * 16) % 1; return .94 + .07 * Math.sin(f * Math.PI); } }), stoneM(capS)));
  // --- lantern + small dome ---
  const lan = surface(256, 128, (x, w, h, Pp, H) => { x.fillStyle = Pp(CREAM, .55); x.fillRect(0, 0, w, h); x.fillStyle = Pp('#2e2219', .1); roundArch(x, w / 2, h - 16, 100, 92); x.fill(); x.fillStyle = Pp(HL, .74); x.fillRect(0, 0, w, 10); });
  G.add(mesh(prism([[[.78, P + 38.75], [.78, P + 39.95]], [[.78, P + 39.95], [.9, P + 40.05]], [[.9, P + 40.05], [0, P + 40.07]]], 8, { rot: 0 }), stoneM(lan)));
  G.add(mesh(revolve([[.62, 0], [.55, .2], [.35, .42], [.12, .56], [.06, .6]].map(([r, yy]) => [r, P + 40.05 + yy]), 32), plain));
  // --- bronze finial: stacked spheres + crescent ring ---
  const fy = P + 40.6; const fin = new THREE.Group(); fin.position.y = fy; G.add(fin);
  fin.add(mesh(new THREE.CylinderGeometry(.05, .07, 2.1, 10).translate(0, 1.05, 0), M.bronze));
  for (const [r, yy] of [[.3, .32], [.24, .95], [.13, 1.42]]) { const sp = mesh(new THREE.SphereGeometry(r, 20, 14), M.bronze); sp.scale.y = 1.12; sp.position.y = yy; fin.add(sp); }
  const mc = crescent(.52, .2, .43, .07, M.bronze); mc.position.y = 2.0; mc.rotation.y = -.4; fin.add(mc);
  G.userData = { top: fy + 2.55, P, shaftTop };
  return G;
}

// ================================================================================================
// Parapet with pointed merlons (instanced) along a line; returns Group. Wall front at z=0, top at y=top.
// ================================================================================================
export function merlonGeo() {
  const s = new THREE.Shape(); s.moveTo(-.19, 0); s.lineTo(.19, 0); s.lineTo(.19, .2); s.quadraticCurveTo(.2, .33, .07, .42); s.quadraticCurveTo(.02, .46, 0, .55); s.quadraticCurveTo(-.02, .46, -.07, .42); s.quadraticCurveTo(-.2, .33, -.19, .2); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: .3, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 1, curveSegments: 3 }); g.translate(0, 0, -.15); return g;
}

// Facade bay texture (8 m wide × H m tall): beige limestone coursing, a raised pilaster at the bay edge, a grilled
// round-headed window, cornice band under the parapet, darker plinth. Soft AO under the cornice.
export function facadeSurface(Hm = 14) {
  const w = 512, h = Math.round(512 * Hm / 8); const pm = w / 8;
  return surface(w, h, (x, W, Hh, P, H) => {
    x.fillStyle = P('#d6bf9c', .55); x.fillRect(0, 0, W, Hh);
    const r = srand(33);
    for (let row = 0, yy = Hh; yy > 0; row++, yy -= .5 * pm) {
      for (let xx = (row % 2) * .6 * pm - .6 * pm; xx < W; xx += 1.2 * pm) { if (!H) { x.fillStyle = `rgba(${r() < .5 ? '160,132,96' : '246,234,210'},${.05 + r() * .09})`; x.fillRect(xx, yy - .5 * pm, 1.2 * pm, .5 * pm); } x.fillStyle = P('rgba(140,114,82,.42)', .42); x.fillRect(xx, yy - .5 * pm, 2, .5 * pm); }
      x.fillStyle = P('rgba(140,114,82,.42)', .42); x.fillRect(0, yy - 2, W, 2);
    }
    // pilaster at the bay edge (raised strip, catches the raking sun)
    x.fillStyle = P('#dcc6a4', .78); x.fillRect(0, 0, .45 * pm, Hh); x.fillRect(W - .45 * pm, 0, .45 * pm, Hh);
    // cornice band
    const cy = Hh - 12.4 * pm; x.fillStyle = P('#e2cfae', .8); x.fillRect(0, cy - .55 * pm, W, .55 * pm); x.fillStyle = P('rgba(110,86,60,.45)', .3); x.fillRect(0, cy, W, .12 * pm);
    if (!H) { const g = x.createLinearGradient(0, 0, 0, cy + .8 * pm); g.addColorStop(0, 'rgba(90,70,50,.0)'); g.addColorStop(.6, 'rgba(90,70,50,.0)'); g.addColorStop(1, 'rgba(90,70,50,.10)'); x.fillStyle = g; x.fillRect(0, 0, W, cy + .8 * pm); }
    // grilled round-headed window with stone surround
    const wy = Hh - 3.2 * pm; x.fillStyle = P('#e4d2b0', .72); roundArch(x, W / 2, wy, 2.3 * pm, 5.0 * pm); x.fill();
    x.fillStyle = P('#2e241b', .12); roundArch(x, W / 2, wy - .25 * pm, 1.8 * pm, 4.5 * pm); x.fill();
    x.save(); roundArch(x, W / 2, wy - .25 * pm, 1.8 * pm, 4.5 * pm); x.clip(); x.strokeStyle = P('#9a7a46', .3); x.lineWidth = 3;
    for (let k = -12; k < 12; k++) { x.beginPath(); x.moveTo(W / 2 + k * 18, wy); x.lineTo(W / 2 + k * 18 + 300, wy - 300); x.stroke(); x.beginPath(); x.moveTo(W / 2 + k * 18, wy); x.lineTo(W / 2 + k * 18 - 300, wy - 300); x.stroke(); } x.restore();
    // plinth
    x.fillStyle = P('#c9b08c', .62); x.fillRect(0, Hh - .8 * pm, W, .8 * pm); x.fillStyle = P('rgba(110,86,60,.4)', .35); x.fillRect(0, Hh - .82 * pm, W, 3);
  }, { strength: 2.5 });
}

// Brass + glass lantern post (as in the plazas of the Haram)
export function lampPost(M = materials(), stoneMat) {
  const G = new THREE.Group(); const st = stoneMat ?? new THREE.MeshStandardMaterial({ color: '#e9dcc2', roughness: .8 });
  const brass = new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 1, roughness: .3, envMapIntensity: 1.2 });
  G.add(mesh(prism([[[.5, 0], [.5, .9]], [[.5, .9], [.4, 1.0]], [[.4, 1.0], [0, 1.0]]], 4), st));
  G.add(mesh(revolveRuns([[[.28, 1.0], [.26, 1.2], [.21, 1.32], [.19, 1.6], [.19, 4.5], [.21, 4.62]], [[.21, 4.62], [.29, 4.7], [.3, 4.86], [.24, 4.9]]], 24), st));
  G.add(mesh(revolve([[.24, 4.9], [.34, 5.0], [.36, 5.12], [.3, 5.2]], 24), brass));
  const glass = (() => { const c = cnv(128, 256); const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 128, 256); g.addColorStop(0, '#8fa6a2'); g.addColorStop(.5, '#3d4f50'); g.addColorStop(1, '#6f8582'); x.fillStyle = g; x.fillRect(0, 0, 128, 256); x.fillStyle = '#c9a04a'; x.fillRect(0, 0, 10, 256); x.fillRect(118, 0, 10, 256); x.fillRect(0, 0, 128, 14); x.fillRect(0, 242, 128, 14); x.fillRect(0, 120, 128, 6); return texOf(c); })();
  const met = (() => { const c = cnv(128, 256); const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 128, 256); x.fillStyle = '#fff'; x.fillRect(0, 0, 10, 256); x.fillRect(118, 0, 10, 256); x.fillRect(0, 0, 128, 14); x.fillRect(0, 242, 128, 14); x.fillRect(0, 120, 128, 6); return texOf(c, { srgb: false }); })();
  G.add(mesh(prism([[[.36, 5.2], [.5, 5.45], [.52, 6.25], [.44, 6.45]]], 8, { rot: 0 }), new THREE.MeshStandardMaterial({ map: glass, metalnessMap: met, metalness: 1, roughness: .2, envMapIntensity: 1.3 })));
  G.add(mesh(revolve([[.44, 6.45], [.56, 6.5], [.5, 6.62], [.36, 6.8], [.18, 6.98], [.1, 7.05]], 32), brass));
  G.add(mesh(revolve([[.1, 7.05], [.15, 7.2], [.09, 7.36], [.05, 7.45], [.045, 7.9], [.0001, 8.25]], 24), M.gold));
  return G;
}
