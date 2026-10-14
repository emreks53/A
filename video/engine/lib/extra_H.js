// Group H helpers (s18 library wall, s19 reading hall, s20 Risale-i Nur still life).
// Everything is procedural and deterministic. Only imports shared engine libs (read-only).
import * as THREE from 'three';
import { rng, clamp, lerp, smoothstep } from './util.js';
import { rbox, MAT, shadowAll } from './models.js';
import { softDot } from './textures.js';

// ---------------------------------------------------------------------------------------------
// Camera / animation: per-component monotone cubic (PCHIP) keyframe path. No overshoot, C1,
// linear extrapolation beyond the ends (so the camera keeps drifting in the handles).
// keys: [[t, [x,y,z]], ...]  -> returns f(t) => THREE.Vector3
export function path3(keys) {
  const n = keys.length, T = keys.map(k => k[0]), P = keys.map(k => k[1]);
  const dims = P[0].length; const M = [];
  for (let d = 0; d < dims; d++) {
    const h = [], del = [];
    for (let i = 0; i < n - 1; i++) { h.push(T[i + 1] - T[i]); del.push((P[i + 1][d] - P[i][d]) / h[i]); }
    const m = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) {
      if (del[i - 1] * del[i] <= 0) m[i] = 0;
      else { const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / del[i - 1] + w2 / del[i]); }
    }
    const endM = (h0, h1, d0, d1) => { if (h1 === undefined) return d0; let mm = ((2 * h0 + h1) * d0 - h0 * d1) / (h0 + h1); if (Math.sign(mm) !== Math.sign(d0)) mm = 0; else if (Math.sign(d0) !== Math.sign(d1) && Math.abs(mm) > Math.abs(3 * d0)) mm = 3 * d0; return mm; };
    m[0] = endM(h[0], h[1], del[0], del[1]);
    m[n - 1] = endM(h[n - 2], h[n - 3], del[n - 2], del[n - 3]);
    M.push(m);
  }
  return (t) => {
    const out = new Array(dims);
    if (t <= T[0]) { for (let d = 0; d < dims; d++) out[d] = P[0][d] + M[d][0] * (t - T[0]); }
    else if (t >= T[n - 1]) { for (let d = 0; d < dims; d++) out[d] = P[n - 1][d] + M[d][n - 1] * (t - T[n - 1]); }
    else {
      let i = 0; while (i < n - 2 && t > T[i + 1]) i++;
      const hh = T[i + 1] - T[i], s = (t - T[i]) / hh, s2 = s * s, s3 = s2 * s;
      const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s, h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
      for (let d = 0; d < dims; d++) out[d] = h00 * P[i][d] + h10 * hh * M[d][i] + h01 * P[i + 1][d] + h11 * hh * M[d][i + 1];
    }
    return dims === 3 ? new THREE.Vector3(out[0], out[1], out[2]) : dims === 1 ? out[0] : out;
  };
}
export const path1 = keys => { const f = path3(keys.map(([t, v]) => [t, [v]])); return t => f(t); };

// ---------------------------------------------------------------------------------------------
// Book geometry (unit): x = thickness (-.5...5), y = height (0..1), z = depth (-.5..+.5); the spine
// is the curved face at +z. Groups: 0 spine, 1 sides, 2 top. uvMode 'atlas' writes cell-local UVs
// (all faces read the same atlas cell; top face reads the cream page strip at the bottom of the cell).
export function bookGeometry({ bulge = 0.07, segs = 8, uvMode = 'full', pad = 0.03, strip = 0.07 } = {}) {
  const pos = [], nor = [], uv = [], idx = []; const groups = [];
  const curve = u => 0.5 + bulge * (1 - (2 * u - 1) ** 2);
  const dzdu = u => bulge * (-4 * (2 * u - 1));
  const U = (u, v, face) => {
    if (uvMode !== 'atlas') return [u, v];
    if (face === 'spine') return [pad + u * (1 - 2 * pad), strip + pad + v * (1 - strip - 2 * pad)];
    if (face === 'side') return [pad + 0.02 + u * 0.06, strip + pad + v * (1 - strip - 2 * pad)];
    return [pad + u * (1 - 2 * pad), pad * 0.5 + v * (strip - pad)];
  };
  let base = 0;
  const begin = () => { base = pos.length / 3; };
  // spine
  begin(); let g0 = idx.length;
  for (let j = 0; j <= 1; j++) for (let i = 0; i <= segs; i++) {
    const u = i / segs; const x = u - 0.5, z = curve(u); pos.push(x, j, z);
    const n = new THREE.Vector3(-dzdu(u), 0, 1).normalize(); nor.push(n.x, n.y, n.z); uv.push(...U(u, j, 'spine'));
  }
  for (let i = 0; i < segs; i++) { const a = base + i, b = base + i + 1, c = base + segs + 1 + i, d = base + segs + 2 + i; idx.push(a, b, d, a, d, c); }
  groups.push([g0, idx.length - g0, 0]);
  // sides (x = -.5 and +.5)
  g0 = idx.length;
  for (const sx of [-1, 1]) {
    begin();
    const zs = [-0.5, 0.5];
    for (let j = 0; j <= 1; j++) for (let k = 0; k <= 1; k++) { pos.push(sx * 0.5, j, zs[k]); nor.push(sx, 0, 0); uv.push(...U(k, j, 'side')); }
    if (sx < 0) idx.push(base, base + 1, base + 3, base, base + 3, base + 2); else idx.push(base, base + 3, base + 1, base, base + 2, base + 3);
  }
  groups.push([g0, idx.length - g0, 1]);
  // top (follows the spine bulge at the front)
  g0 = idx.length; begin();
  for (let i = 0; i <= segs; i++) { const u = i / segs; pos.push(u - 0.5, 1, -0.5); nor.push(0, 1, 0); uv.push(...U(u, 0, 'top')); }
  for (let i = 0; i <= segs; i++) { const u = i / segs; pos.push(u - 0.5, 1, curve(u) - 0.004); nor.push(0, 1, 0); uv.push(...U(u, 1, 'top')); }
  for (let i = 0; i < segs; i++) { const a = base + i, b = base + i + 1, c = base + segs + 1 + i, d = base + segs + 2 + i; idx.push(a, c, d, a, d, b); }
  groups.push([g0, idx.length - g0, 2]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  if (uvMode !== 'atlas') groups.forEach(([s, c, m]) => geo.addGroup(s, c, m));
  return geo;
}

// Leather spine painter: base color + rounded shading + raised bands + gold tooling + label(s).
// o: {color, dark, label (css), label2, bands (n), gold, title:[lines], titleSize, author:[lines], vol}
export function paintSpine(x, W, H, o = {}, R = rng(1)) {
  const c = new THREE.Color(o.color ?? '#6d2418'), dk = new THREE.Color(o.dark ?? c.clone().multiplyScalar(.55));
  const css = col => `#${col.getHexString()}`;
  x.fillStyle = css(c); x.fillRect(0, 0, W, H);
  // leather mottling
  for (let i = 0; i < 260; i++) { const a = R() * .08; x.fillStyle = R() < .5 ? `rgba(0,0,0,${a})` : `rgba(255,235,200,${a * .6})`; const r = 2 + R() * W * .08; x.beginPath(); x.arc(R() * W, R() * H, r, 0, 7); x.fill(); }
  // wear at head/tail
  const gw = x.createLinearGradient(0, 0, 0, H); gw.addColorStop(0, 'rgba(30,15,5,.35)'); gw.addColorStop(.03, 'rgba(30,15,5,0)'); gw.addColorStop(.97, 'rgba(30,15,5,0)'); gw.addColorStop(1, 'rgba(30,15,5,.4)'); x.fillStyle = gw; x.fillRect(0, 0, W, H);
  const gold = o.gold ?? '#e6be63';
  const nb = o.bands ?? 5; const top = H * (o.top ?? .06), bot = H * (o.bottom ?? .94);
  const bandY = []; for (let i = 0; i < nb; i++) bandY.push(lerp(top, bot, (i + .5) / nb));
  const panel = (bandY[1] - bandY[0]);
  // raised bands
  bandY.forEach((by, i) => {
    if (i === 0) return;
    const yb = by - panel / 2; x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, yb - H * .006, W, H * .012); x.fillStyle = 'rgba(255,240,210,.18)'; x.fillRect(0, yb - H * .006, W, H * .004);
    x.fillStyle = gold; x.fillRect(0, yb - H * .011, W, H * .0025); x.fillRect(0, yb + H * .009, W, H * .0025);
  });
  x.fillStyle = gold; x.fillRect(0, top - H * .01, W, H * .003); x.fillRect(0, bot + H * .008, W, H * .003);
  // fleurons in empty panels
  // small lozenge + dots ornament (deliberately not cross-shaped)
  const fleuron = (cx, cy, s) => { x.save(); x.translate(cx, cy); x.fillStyle = gold; x.beginPath(); x.moveTo(-s * .5, 0); x.lineTo(0, -s * .2); x.lineTo(s * .5, 0); x.lineTo(0, s * .2); x.closePath(); x.fill(); x.fillStyle = css(dk); x.beginPath(); x.moveTo(-s * .26, 0); x.lineTo(0, -s * .09); x.lineTo(s * .26, 0); x.lineTo(0, s * .09); x.closePath(); x.fill(); x.fillStyle = gold; for (const d of [-1, 1]) { x.beginPath(); x.arc(d * s * .66, 0, s * .06, 0, 7); x.fill(); } x.restore(); };
  const labels = o.labels ?? [];
  const covered = new Set(); labels.forEach(l => { for (let k = 0; k < (l.span ?? 1); k++) covered.add(l.panel + k); });
  bandY.forEach((by, i) => { if (!covered.has(i) && o.fleurons !== false) fleuron(W / 2, by, Math.min(W * .5, panel * .5)); });
  labels.forEach(lab => {
    const sp = lab.span ?? 1; const by = bandY[lab.panel];
    const y0 = by - panel / 2 + H * .014, h = panel * sp - H * .028;
    x.fillStyle = lab.bg; x.fillRect(W * .05, y0, W * .9, h);
    x.strokeStyle = gold; x.lineWidth = Math.max(1, W * .012); x.strokeRect(W * .09, y0 + Math.min(h * .05, W * .05), W * .82, h - 2 * Math.min(h * .05, W * .05));
    if (lab.lines && lab.lines.length) {
      x.fillStyle = gold; x.textAlign = 'center'; x.textBaseline = 'middle';
      const n = lab.lines.length; const cond = lab.cond ?? .82; const fs0 = Math.min(lab.size ? lab.size * W : 1e9, (h * .84) / n / 1.12);
      // one common size for all lines (fit the widest line)
      x.font = `${lab.weight ?? 700} ${fs0}px "${lab.family ?? 'Playfair Display'}"`;
      const mw = Math.max(...lab.lines.map(l => x.measureText(l).width)) * cond; const fs = mw > W * .74 ? fs0 * W * .74 / mw : fs0;
      x.font = `${lab.weight ?? 700} ${fs}px "${lab.family ?? 'Playfair Display'}"`;
      lab.lines.forEach((ln, k) => { x.save(); x.translate(W / 2, y0 + h * .5 + (k - (n - 1) / 2) * fs * 1.12); x.scale(cond, 1); x.fillText(ln, 0, 0); x.restore(); });
    } else if (lab.dashes) {
      x.fillStyle = gold; for (let k = 0; k < lab.dashes; k++) { const lw = W * (.3 + R() * .4); x.globalAlpha = .85; x.fillRect(W / 2 - lw / 2, y0 + h * (.3 + k * .4 / Math.max(1, lab.dashes - 1)) - H * .003, lw, H * .006); }
      x.globalAlpha = 1;
    }
  });
  // rounded-spine shading
  const gs = x.createLinearGradient(0, 0, W, 0); gs.addColorStop(0, 'rgba(0,0,0,.35)'); gs.addColorStop(.25, 'rgba(0,0,0,0)'); gs.addColorStop(.75, 'rgba(0,0,0,0)'); gs.addColorStop(1, 'rgba(0,0,0,.35)'); x.fillStyle = gs; x.fillRect(0, 0, W, H);
}

// Atlas of generic (title-less) spines for instanced shelves + a matching roughness/metalness map.
const BOOK_COLORS = ['#7a2418', '#5c1a14', '#2f4a32', '#22392a', '#26385a', '#1c2a44', '#8a5a2c', '#6e4421', '#4e2a3e', '#9a6a36', '#3a3020', '#7c3a1c', '#2b4d4a', '#5a2a1a', '#a0773e', '#463a5a'];
export function spineAtlas({ cols = 8, rows = 2, size = 1024, seed = 5, colors = BOOK_COLORS, strip = 0.07 } = {}) {
  const W = size, H = size; const cw = W / cols, ch = H / rows; const R = rng(seed);
  const c1 = document.createElement('canvas'); c1.width = W; c1.height = H; const x = c1.getContext('2d');
  const c2 = document.createElement('canvas'); c2.width = W; c2.height = H; const y = c2.getContext('2d');
  y.fillStyle = 'rgb(0,170,0)'; y.fillRect(0, 0, W, H); // G = roughness .67, B = metalness 0
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c; const x0 = c * cw, y0 = r * ch; const sh = ch * (1 - strip);
    x.save(); x.translate(x0, y0); x.beginPath(); x.rect(0, 0, cw, sh); x.clip();
    const col = colors[i % colors.length];
    const style = i % 4;
    const labels = style === 0 ? [{ panel: 1, bg: '#1b1410', dashes: 2 }] : style === 1 ? [{ panel: 1, bg: '#7a1c14', dashes: 2 }, { panel: 2, bg: '#1b1410', dashes: 1 }] : style === 2 ? [] : [{ panel: 1, bg: '#203a26', dashes: 2 }];
    paintSpine(x, cw, sh, { color: col, bands: 4 + (i % 3), labels, fleurons: style !== 2 || R() < .7, gold: R() < .2 ? '#cfa64f' : '#e6be63' }, R);
    x.restore();
    // page strip
    x.fillStyle = '#c9b48c'; x.fillRect(x0, y0 + sh, cw, ch - sh);
    x.fillStyle = 'rgba(90,65,35,.3)'; for (let k = 0; k < 14; k++) x.fillRect(x0 + cw * (.08 + .84 * k / 14), y0 + sh, 1, ch - sh);
    x.fillStyle = col; x.fillRect(x0, y0 + sh, cw * .06, ch - sh); x.fillRect(x0 + cw * .94, y0 + sh, cw * .06, ch - sh);
    // metal map: gold where the color is goldish -> sample after drawing
  }
  // derive metalness/roughness from the gold color
  const im = x.getImageData(0, 0, W, H), om = y.getImageData(0, 0, W, H);
  for (let p = 0; p < im.data.length; p += 4) {
    const r = im.data[p], g = im.data[p + 1], b = im.data[p + 2];
    const isGold = r > 150 && g > 110 && b < 120 && r - b > 90 && g - b > 50;
    if (isGold) { om.data[p + 1] = 85; om.data[p + 2] = 255; }
    else { om.data[p + 1] = 150 + ((p >> 2) % 7) * 6; om.data[p + 2] = 0; }
  }
  y.putImageData(om, 0, 0);
  const tex = new THREE.CanvasTexture(c1); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const orm = new THREE.CanvasTexture(c2); orm.colorSpace = THREE.NoColorSpace; orm.anisotropy = 8;
  return { tex, orm, cols, rows, n: cols * rows, strip };
}

// Instanced books. items: [{x,y,z, w(thickness), h, d(depth), rotZ, rotY, cell, tint}]
export function instancedBooks(items, atlas, { bulge = .07, segs = 6, castShadow = true, receiveShadow = true, envIntensity = 1 } = {}) {
  const geo = bookGeometry({ bulge, segs, uvMode: 'atlas', strip: atlas.strip });
  const cellA = new Float32Array(items.length * 2);
  items.forEach((it, i) => { const c = it.cell % atlas.n; cellA[i * 2] = (c % atlas.cols) / atlas.cols; cellA[i * 2 + 1] = 1 - (Math.floor(c / atlas.cols) + 1) / atlas.rows; });
  geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellA, 2));
  const mat = new THREE.MeshStandardMaterial({ map: atlas.tex, roughnessMap: atlas.orm, metalnessMap: atlas.orm, roughness: 1, metalness: 1, envMapIntensity: envIntensity });
  const cs = new THREE.Vector2(1 / atlas.cols, 1 / atlas.rows);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uCellScale = { value: cs };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell; uniform vec2 uCellScale;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        vec2 cuv = uv * uCellScale + aCell;
        #ifdef USE_MAP
          vMapUv = cuv;
        #endif
        #ifdef USE_ROUGHNESSMAP
          vRoughnessMapUv = cuv;
        #endif
        #ifdef USE_METALNESSMAP
          vMetalnessMapUv = cuv;
        #endif`);
  };
  mat.customProgramCacheKey = () => 'H_bookAtlas';
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), s = new THREE.Vector3(); const col = new THREE.Color();
  items.forEach((it, i) => { e.set(it.rotX ?? 0, it.rotY ?? 0, it.rotZ ?? 0, 'YXZ'); q.setFromEuler(e); p.set(it.x, it.y, it.z); s.set(it.w, it.h, it.d); m4.compose(p, q, s); mesh.setMatrixAt(i, m4); col.setScalar(it.tint ?? 1); mesh.setColorAt(i, col); });
  mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow; mesh.frustumCulled = false;
  return mesh;
}

// Fill a shelf row [xL,xR] standing on y, spines facing +z with their front at zFront. Returns item list.
// gaps: [[xa,xb], ...] reserved ranges (hero books). maxH: clearance.
export function fillShelf(R, { xL, xR, y, zFront, maxH, depth = .2, gaps = [], cells = 16, lean = true, stacks = true }) {
  const items = []; let x = xL + .004;
  const inGap = (a, b) => gaps.find(([ga, gb]) => b > ga && a < gb);
  while (x < xR - .02) {
    const g = inGap(x, x + .06); if (g) { x = g[1] + .002; continue; }
    const r = R();
    if (stacks && r < .025 && xR - x > .32 && !inGap(x, x + .3)) { // horizontal stack of 2-4 books (lying on their sides, spines out)
      const n = 2 + Math.floor(R() * 3); let yy = y; const L = .2 + R() * .06;
      for (let k = 0; k < n; k++) {
        const th = .03 + R() * .025, len = L - k * .012 + (R() - .5) * .01;
        // rotZ=-90deg maps local height(y) -> +x, local thickness(x) -> -y; origin = left end, vertical center
        items.push({ x: x + .005 + (R() - .5) * .008, y: yy + th / 2, z: zFront - depth / 2, w: th, h: len, d: depth * (.85 + R() * .1), rotZ: -Math.PI / 2, rotY: (R() - .5) * .06, cell: Math.floor(R() * cells), tint: .85 + R() * .25, _lay: true });
        yy += th;
      }
      x += L + .012; continue;
    }
    if (lean && r < .05 && x > xL + .1 && !inGap(x, x + .2)) { // a gap followed by a book leaning right onto its neighbour
      x += .03 + R() * .05;
      const w = .03 + R() * .03, h = Math.min(maxH * .9, .2 + R() * .1); const a = .16 + R() * .18;
      items.push({ x: x + w / 2, y: y + Math.sin(a) * w / 2, z: zFront - depth / 2 + (R() - .5) * .01, w, h, d: depth * (.9 + R() * .1), rotZ: -a, cell: Math.floor(R() * cells), tint: .85 + R() * .25 });
      x += w / 2 + Math.sin(a) * h + Math.cos(a) * w / 2 + .003; continue;
    }
    const w = .024 + Math.pow(R(), 1.5) * .045; const h = Math.min(maxH * .96, (.2 + R() * .12) * (R() < .15 ? 1.2 : 1));
    const dz = (R() - .5) * .012 + (R() < .06 ? .02 : 0);
    items.push({ x: x + w / 2, y, z: zFront - depth / 2 + dz, w, h, d: depth * (.88 + R() * .12), rotY: (R() - .5) * .03, cell: Math.floor(R() * cells), tint: .82 + R() * .3 });
    x += w + (R() < .3 ? .002 : 0);
  }
  // remove books overrunning xR
  return items.filter(it => it.x + it.w / 2 < xR + .005 || it._lay);
}

// Hero book (single mesh) with painted spine (+z) — same geometry as instanced books.
export function heroBook({ w = .05, h = .27, d = .2, spine = {}, seed = 3, page = '#eadcb8' } = {}) {
  const geo = bookGeometry({ bulge: .09, segs: 12, uvMode: 'full' });
  const R = rng(seed);
  const SW = 256, SH = Math.round(256 * h / w);
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = Math.min(2048, SH); const x = cv.getContext('2d');
  paintSpine(x, cv.width, cv.height, spine, R);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  // metal/rough map from gold
  const c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; const y = c2.getContext('2d');
  const im = x.getImageData(0, 0, cv.width, cv.height), om = y.createImageData(cv.width, cv.height);
  for (let p = 0; p < im.data.length; p += 4) { const r = im.data[p], g = im.data[p + 1], b = im.data[p + 2]; const gold = r > 150 && g > 110 && b < 130 && r - b > 80; om.data[p] = 0; om.data[p + 1] = gold ? 80 : 150; om.data[p + 2] = gold ? 255 : 0; om.data[p + 3] = 255; }
  y.putImageData(om, 0, 0); const orm = new THREE.CanvasTexture(c2); orm.colorSpace = THREE.NoColorSpace;
  const spineMat = new THREE.MeshStandardMaterial({ map: tex, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 });
  const sideMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(spine.color ?? '#6d2418').multiplyScalar(.8), roughness: .7 });
  const pageTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 256; const z = c.getContext('2d'); z.fillStyle = page; z.fillRect(0, 0, 64, 256); for (let i = 0; i < 256; i += 3) { z.fillStyle = `rgba(120,90,50,${.06 + (i % 9 === 0 ? .06 : 0)})`; z.fillRect(0, i, 64, 1); } z.fillStyle = spine.color ?? '#6d2418'; z.fillRect(0, 0, 5, 256); z.fillRect(59, 0, 5, 256); z.fillRect(0, 250, 64, 6); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const topMat = new THREE.MeshStandardMaterial({ map: pageTex, roughness: .9 });
  const mesh = new THREE.Mesh(geo, [spineMat, sideMat, topMat]); mesh.scale.set(w, h, d); mesh.castShadow = mesh.receiveShadow = true;
  const g = new THREE.Group(); g.add(mesh); g.userData.mesh = mesh; return g;
}

// ---------------------------------------------------------------------------------------------
// Flame sprite texture (teardrop with hot core) for Points-based candle fields.
let _flameTex = null;
export function flameTex() {
  if (_flameTex) return _flameTex;
  const S = 128, c = document.createElement('canvas'); c.width = S; c.height = S; const x = c.getContext('2d');
  const im = x.createImageData(S, S);
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = (i + .5) / S * 2 - 1, v = 1 - (j + .5) / S * 2; // v up
    const py = v + .45; const r = Math.hypot(u * 2.6, py > 0 ? py * .62 : py * 1.6);
    const body = clamp(1 - smoothstep(.55, 1, r)); const core = clamp(1 - smoothstep(.0, .55, r));
    const p = (j * S + i) * 4; im.data[p] = 255; im.data[p + 1] = Math.round(140 + 115 * core); im.data[p + 2] = Math.round(40 + 190 * core * core); im.data[p + 3] = Math.round(255 * body);
  }
  x.putImageData(im, 0, 0); _flameTex = new THREE.CanvasTexture(c); _flameTex.colorSpace = THREE.SRGBColorSpace; return _flameTex;
}

// Candle-flame field: one point per candle. on[i] = ignition time (local s). GPU animated.
// Returns Points; set userData.uniforms.master for global fade.
export function flamePoints(positions, on, { size = 0.05, seedBase = 0, glow = false, color = [1, .62, .25], intensity = 2.4 } = {}) {
  const n = on.length; const fpos = new Float32Array(positions), fon = new Float32Array(on), fs = new Float32Array(n);
  for (let i = 0; i < n; i++) fs[i] = (i * 0.618 + seedBase) % 1 * 40;
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(fpos, 3)); g.setAttribute('on', new THREE.BufferAttribute(fon, 1)); g.setAttribute('seed', new THREE.BufferAttribute(fs, 1));
  const u = { time: { value: 0 }, map: { value: glow ? softDot(64, 0) : flameTex() }, master: { value: 1 }, size: { value: size }, pxScale: { value: 1000 }, col: { value: new THREE.Vector3(...color) }, inten: { value: intensity } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, size, pxScale; attribute float on, seed; varying float vB;
      void main(){ vec3 p = position; float age = time - on; float b = smoothstep(0., .18, age);
        float pop = 1. + .6 * exp(-age * 9.) * step(0., age);
        float fl = .86 + .14 * sin(time * 11. + seed) * sin(time * 5.3 + seed * 1.7);
        ${glow ? '' : 'p.y += size * .35 * b;'}
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        vB = b * fl; gl_PointSize = min(${glow ? '320.' : '160.'}, max(1.5, size * pxScale / -mv.z) * b * pop * (${glow ? '1.' : '.9 + .1 * fl'})); }`,
    fragmentShader: `uniform sampler2D map; uniform float master, inten; uniform vec3 col; varying float vB;
      void main(){ vec4 t = texture2D(map, gl_PointCoord); ${glow ? 'gl_FragColor = vec4(col * inten, t.a * vB * master);' : 'gl_FragColor = vec4(t.rgb * inten, t.a * vB * master);'} }`,
  });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.uniforms = u; pts.userData.noDepth = true; pts.renderOrder = glow ? 18 : 20;
  return pts;
}

// Additive light pools (instanced quads), brightness = smoothstep(on, on+.3, time). GPU-driven.
// items: [{x,y,z, r, on, rotX(=-PI/2 for floors), col:[r,g,b] }]
export function lightPools(items, { opacity = .35, color = '#ff9a45', normal = 'up' } = {}) {
  const geo = new THREE.PlaneGeometry(1, 1); if (normal === 'up') geo.rotateX(-Math.PI / 2);
  const onA = new Float32Array(items.length); items.forEach((it, i) => onA[i] = it.on);
  geo.setAttribute('aOn', new THREE.InstancedBufferAttribute(onA, 1));
  const tex = (() => { const S = 128, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d'); const gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.2, 'rgba(255,255,255,.55)'); gr.addColorStop(.55, 'rgba(255,255,255,.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, S, S); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const u = { time: { value: 0 }, map: { value: tex }, opacity: { value: opacity }, color: { value: new THREE.Color(color) }, master: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    vertexShader: `attribute float aOn; uniform float time; varying vec2 vUv; varying float vB;
      void main(){ vUv = uv; float age = time - aOn; vB = smoothstep(0., .35, age) * (.92 + .08 * sin(time * 9. + aOn * 31.));
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D map; uniform float opacity, master; uniform vec3 color; varying vec2 vUv; varying float vB;
      void main(){ float a = texture2D(map, vUv).a; gl_FragColor = vec4(color, a * vB * opacity * master); }`,
  });
  const mesh = new THREE.InstancedMesh(geo, m, items.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  items.forEach((it, i) => { e.set(it.rotX ?? 0, it.rotY ?? 0, 0); q.setFromEuler(e); m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, new THREE.Vector3(it.r * 2, it.r * 2, it.r * 2)); mesh.setMatrixAt(i, m4); });
  mesh.userData.uniforms = u; mesh.userData.noDepth = true; mesh.renderOrder = 3; mesh.frustumCulled = false;
  return mesh;
}

// Generic instancing of an arbitrary geometry+material at a list of transforms.
export function instances(geo, mat, list, { cast = true, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, mat, list.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  list.forEach((it, i) => { e.set(it.rx ?? 0, it.ry ?? 0, it.rz ?? 0); q.setFromEuler(e); const s = it.s ?? 1; m4.compose(new THREE.Vector3(it.x, it.y, it.z), q, Array.isArray(s) ? new THREE.Vector3(...s) : new THREE.Vector3(s, s, s)); mesh.setMatrixAt(i, m4); });
  mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.frustumCulled = false; return mesh;
}

// Dust motes confined to a light beam (cylinder from A to B); alpha falls off radially.
export function beamMotes({ from, to, radius = .5, count = 300, size = 6, color = '#ffe2b0', opacity = .8, seed = 9, speed = .03 } = {}) {
  const A = new THREE.Vector3(...from), B = new THREE.Vector3(...to); const L = A.distanceTo(B); const R = rng(seed);
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { const a = R() * 6.283, r = Math.sqrt(R()) * radius; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = -R() * L; pos[i * 3 + 2] = Math.sin(a) * r; rnd[i * 4] = R(); rnd[i * 4 + 1] = R(); rnd[i * 4 + 2] = R(); rnd[i * 4 + 3] = R(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('rnd', new THREE.BufferAttribute(rnd, 4));
  const u = { time: { value: 0 }, map: { value: softDot(64, .1) }, color: { value: new THREE.Color(color) }, size: { value: size }, opacity: { value: opacity }, radius: { value: radius }, len: { value: L }, speed: { value: speed }, master: { value: 1 } };
  const m = new THREE.ShaderMaterial({
    uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float time, size, radius, len, speed; attribute vec4 rnd; varying float vA;
      void main(){ vec3 p = position; p.x += sin(time * (.3 + rnd.x * .4) + rnd.y * 40.) * radius * .25; p.z += cos(time * (.25 + rnd.z * .4) + rnd.w * 40.) * radius * .25;
        p.y += sin(time * .2 + rnd.x * 30.) * .1 - time * speed * (.5 + rnd.y);
        p.y = -mod(-p.y, len);
        float rr = length(p.xz) / radius; float ends = smoothstep(0., len * .12, -p.y) * smoothstep(len, len * .7, -p.y);
        vA = (1. - smoothstep(.55, 1., rr)) * ends * (.45 + .55 * sin(time * (1. + rnd.w * 2.) + rnd.z * 20.) * .5 + .3);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = size * (.4 + rnd.y) * 10. / -mv.z; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float opacity, master; varying float vA; void main(){ vec4 t = texture2D(map, gl_PointCoord); gl_FragColor = vec4(color, t.a * vA * opacity * master); }`,
  });
  const pts = new THREE.Points(g, m); pts.position.copy(A); pts.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), B.clone().sub(A).normalize());
  pts.frustumCulled = false; pts.userData.uniforms = u; pts.userData.noDepth = true; pts.renderOrder = 11; return pts;
}

// Parquet / plank floor texture
export function plankTex({ w = 1024, h = 1024, a = '#7a4a2a', b = '#4e2c16', planks = 8, seed = 4 } = {}) {
  const R = rng(seed); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
  const A = new THREE.Color(a), B = new THREE.Color(b);
  const ph = h / planks;
  for (let j = 0; j < planks; j++) {
    let xx = -R() * w * .5;
    while (xx < w) {
      const L = w * (.35 + R() * .45); const col = A.clone().lerp(B, R() * .7);
      x.fillStyle = `#${col.getHexString()}`; x.fillRect(xx, j * ph, L, ph);
      for (let k = 0; k < 14; k++) { x.strokeStyle = `rgba(30,15,5,${.05 + R() * .08})`; x.lineWidth = 1 + R() * 2; x.beginPath(); const yy = j * ph + R() * ph; x.moveTo(xx, yy); x.bezierCurveTo(xx + L * .3, yy + (R() - .5) * 8, xx + L * .6, yy + (R() - .5) * 8, xx + L, yy + (R() - .5) * 6); x.stroke(); }
      x.fillStyle = 'rgba(20,10,4,.6)'; x.fillRect(xx, j * ph, 2, ph);
      xx += L;
    }
    x.fillStyle = 'rgba(20,10,4,.55)'; x.fillRect(0, j * ph, w, 2);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}

// ---------------------------------------------------------------------------------------------
// Bookcase wall (facing +z, spines at z≈0) built in a Group. levels: [{y0, plinth, rows, rowH, top, gallery:bool}]
// Returns { group, books (InstancedMesh) }. Cheap mode (segs 2) for long side walls.
export function bookWall(M, { X0 = -5, X1 = 5, bay = 1.0, pil = .07, levels, atlas, R, caseMat, shelfMat, backColor = '#2a170c', segs = 3, bookDepth = .21, galleryDepth = 1.1, balStep = .16, cheap = false }) {
  const g = new THREE.Group();
  const backMat = new THREE.MeshStandardMaterial({ color: backColor, roughness: .9 });
  const shelfList = [], pilList = [], items = [], balList = [];
  const nb = Math.round((X1 - X0) / bay);
  levels.forEach(L => {
    const H = L.plinth + L.rows * L.rowH + L.top; L.H = H; const yb = L.y0 + L.plinth;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, H), backMat); back.position.set((X0 + X1) / 2, L.y0 + H / 2, -.3); g.add(back);
    for (let k = 0; k <= L.rows; k++) {
      const y = yb + k * L.rowH;
      for (let b = 0; b < nb; b++) {
        const xc = X0 + bay / 2 + b * bay; shelfList.push({ x: xc, y: y + .014, z: -.13 });
        if (k < L.rows) items.push(...fillShelf(R, { xL: xc - bay / 2 + pil / 2, xR: xc + bay / 2 - pil / 2, y: y + .028, zFront: .018, maxH: L.rowH - .045, depth: bookDepth, cells: atlas.n, stacks: segs > 2, lean: true }));
      }
    }
    for (let b = 0; b <= nb; b++) pilList.push({ x: X0 + b * bay, y: L.y0 + H / 2, z: -.1, s: [1, H, 1] });
    const plinth = new THREE.Mesh(rbox(X1 - X0 + .1, L.plinth, .44, .02), caseMat); plinth.position.set((X0 + X1) / 2, L.y0 + L.plinth / 2, -.1); g.add(plinth);
    const corn = new THREE.Mesh(rbox(X1 - X0 + .2, L.top * .6, .5, .03), caseMat); corn.position.set((X0 + X1) / 2, L.y0 + H - L.top * .3, -.07); g.add(corn);
    const corn2 = new THREE.Mesh(rbox(X1 - X0 + .3, L.top * .25, .58, .03), caseMat); corn2.position.set((X0 + X1) / 2, L.y0 + H - L.top * .12, -.05); g.add(corn2);
    if (L.gallery) {
      const gy = L.y0 + H;
      const slab = new THREE.Mesh(rbox(X1 - X0 + .4, .22, galleryDepth, .03), caseMat); slab.position.set((X0 + X1) / 2, gy + .11, galleryDepth / 2 - .13); g.add(slab);
      const rail = new THREE.Mesh(rbox(X1 - X0 + .4, .07, .09, .025), caseMat); rail.position.set((X0 + X1) / 2, gy + .22 + .82, galleryDepth - .17); g.add(rail);
      const brail = new THREE.Mesh(rbox(X1 - X0 + .4, .06, .08, .02), caseMat); brail.position.set((X0 + X1) / 2, gy + .22 + .05, galleryDepth - .17); g.add(brail);
      for (let x = X0 - .1; x <= X1 + .1; x += balStep) balList.push({ x, y: gy + .22 + .07, z: galleryDepth - .17 });
    }
  });
  g.add(instances(cheap ? new THREE.BoxGeometry(bay - pil, .028, .34) : rbox(bay - pil, .028, .34, .008, 2), shelfMat, shelfList));
  g.add(instances(cheap ? new THREE.BoxGeometry(pil, 1, .42) : rbox(pil, 1, .42, .015, 2), caseMat, pilList));
  if (balList.length) { const balGeo = new THREE.LatheGeometry([[0, 0], [.03, 0], [.03, .05], [.018, .1], [.032, .3], [.02, .55], [.026, .7], [.03, .74], [0, .74]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 8); g.add(instances(balGeo, caseMat, balList)); }
  const books = instancedBooks(items, atlas, { segs, envIntensity: 1.1 }); g.add(books);
  g.traverse(o => { if (o.isMesh) { o.receiveShadow = true; } });
  return { group: g, books, items };
}

// Soft contact-shadow decals (instanced, normal blending black).
export function contactShadows(list, { opacity = .55 } = {}) {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
  const gr = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(.5, 'rgba(0,0,0,.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.MeshBasicMaterial({ color: '#000', alphaMap: tex, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  const mesh = instances(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, list, { cast: false, receive: false });
  mesh.userData.noDepth = true; mesh.renderOrder = 1; return mesh;
}

// Page texture with subtle gray line strokes as "text" (not readable). opts: {num (string), side ('L'|'R'), lines, bg}
export function drawPage(x, W, H, o = {}) {
  const R = rng(o.seed ?? 3);
  x.fillStyle = o.bg ?? '#f3ead2'; x.fillRect(0, 0, W, H);
  // paper fibres / warmth
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(150,110,60,${R() * .035})`; x.beginPath(); x.arc(R() * W, R() * H, 1 + R() * W * .05, 0, 7); x.fill(); }
  const mx = W * (o.marginX ?? .14), top = H * (o.top ?? .14), bot = H * (o.bottom ?? .9);
  const n = o.lines ?? 22; const lh = (bot - top) / n;
  x.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = top + lh * (i + .5);
    if (o.gapAt && o.gapAt.includes(i)) continue;
    const para = (o.paraAt ?? []).includes(i);
    const endShort = (o.paraAt ?? []).includes(i + 1) || i === n - 1;
    const x0 = mx + (para ? W * .06 : 0), x1 = W - mx - (endShort ? W * (.2 + R() * .3) : 0);
    // a line is a sequence of word strokes
    let xx = x0; x.strokeStyle = o.ink ?? 'rgba(70,62,55,.42)'; x.lineWidth = Math.max(1.5, lh * .26);
    while (xx < x1 - 4) { const wl = Math.min(x1 - xx, W * (.03 + R() * .09)); x.beginPath(); x.moveTo(xx, y); x.lineTo(xx + wl, y); x.stroke(); xx += wl + W * .018; }
  }
}

// Straight-grain hardwood (canvas): streaks run along the texture's V axis. Returns MeshPhysicalMaterial.
export function grainWood({ a = '#a8703e', b = '#6e4220', seed = 3, streaks = 90, size = 512, repeat = [1, 1], clearcoat = .35, roughness = .55 } = {}) {
  const R = rng(seed); const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const A = new THREE.Color(a), B = new THREE.Color(b);
  x.fillStyle = `#${A.getHexString()}`; x.fillRect(0, 0, size, size);
  for (let i = 0; i < streaks; i++) {
    const col = A.clone().lerp(B, .25 + R() * .75); const w = 1 + R() * size / streaks * 1.6; let px = R() * size; const amp = 1 + R() * 4, fr = 1 + Math.floor(R() * 3);
    x.strokeStyle = `rgba(${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)},${.08 + R() * .2})`; x.lineWidth = w;
    for (const off of [-size, 0, size]) { x.beginPath(); for (let y = 0; y <= size; y += 8) { const xx = px + off + Math.sin((y / size) * Math.PI * 2 * fr + i) * amp; if (y === 0) x.moveTo(xx, y); else x.lineTo(xx, y); } x.stroke(); }
  }
  // a couple of soft cathedral figures
  for (let k = 0; k < 3; k++) { const cx = R() * size, cy = R() * size; for (let r = 6; r < 60; r += 7) { x.strokeStyle = `rgba(60,30,10,${.08})`; x.lineWidth = 2; x.beginPath(); x.ellipse(cx, cy, r * .35, r * 1.6, 0, 0, 7); x.stroke(); } }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); t.anisotropy = 8;
  return new THREE.MeshPhysicalMaterial({ map: t, roughness, clearcoat, clearcoatRoughness: .35 });
}
