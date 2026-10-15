// s04 (19.60–25.25) "Mesela kendisine düşman olan pek çok müşrikler emanetlerini o kadar kişi arasından…"
// Visual: Kurzgesagt-style night map of old Mecca (valley between dark rocky mountains, ~500 flat-roof mudbrick houses,
// the Kaaba small at the centre as a plain stone cube with a dark cloth). On "düşman … müşrikler" red map dots pop on many
// houses; on "emanetlerini" warm lantern lights leave those houses and flow along the alleys (dotted path lines), all
// converging on ONE modest house; on "o kadar kişi arasından" the camera swoops down to that house's lit doorway
// (s05 continues inside it). No people: lights only.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let R = {};
const DEG = Math.PI / 180;

// ---------- helpers ----------
// monotone cubic (Fritsch–Carlson) through [[t,v],...]; linear extrapolation outside -> camera never stops
function mono(keys) {
  const n = keys.length, xs = keys.map(k => k[0]), ys = keys.map(k => k[1]); const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) { if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; } const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b; if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; } }
  return t => {
    if (t <= xs[0]) return ys[0] + m[0] * (t - xs[0]);
    if (t >= xs[n - 1]) return ys[n - 1] + m[n - 1] * (t - xs[n - 1]);
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], s = (t - xs[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * ys[i] + (s3 - 2 * s2 + s) * h * m[i] + (-2 * s3 + 3 * s2) * ys[i + 1] + (s3 - s2) * h * m[i + 1];
  };
}
const colorize = (g, c) => { const C = new THREE.Color(c); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = C.r; a[i * 3 + 1] = C.g; a[i * 3 + 2] = C.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; };
const place = (g, x, y, z, ry = 0) => { if (ry) g.rotateY(ry); g.translate(x, y, z); return g; };

// reference house variants (8 x 8 m footprint, door on +z), merged with vertex colours (wall white -> tinted per instance)
// lod=false: full bevels (houses near the destination, seen up close at the end of the swoop);
// lod=true: same silhouette with cheap bevels (map-scale houses) — ~5x fewer triangles, identical at that distance.
function houseVariant(M, v, lod = false) {
  const P = [], WALL = '#ffffff', ROOF = '#d9cbb6', DOOR = '#5a3a24', WIN = '#24180f', WOOD = '#7a5434';
  const hgt = v === 1 ? 7 : 4;
  const rb = (w, h, d, r, seg) => lod ? (seg > 1 && Math.min(w, h, d) > 2 ? M.rbox(w, h, d, r, 1) : new THREE.BoxGeometry(w, h, d)) : M.rbox(w, h, d, r, seg);
  P.push(colorize(place(rb(8, hgt, 8, .45, 2), 0, hgt / 2, 0), WALL));
  P.push(colorize(place(new THREE.BoxGeometry(7.3, .12, 7.3), 0, hgt + .0, 0), ROOF));
  for (const s of [-1, 1]) {
    P.push(colorize(place(rb(8.1, .75, .45, .18, 1), 0, hgt + .3, s * 3.83), WALL));
    P.push(colorize(place(rb(.45, .75, 7.2, .18, 1), s * 3.83, hgt + .3, 0), WALL));
  }
  P.push(colorize(place(rb(1.15, 2.15, .32, .1, 1), 1.4, 1.07, 4.0), DOOR));
  P.push(colorize(place(rb(1.7, .28, .4, .08, 1), 1.4, 2.28, 4.0), WOOD)); // lintel
  P.push(colorize(place(rb(.8, .8, .26, .1, 1), -2.0, 2.75, 4.0), WIN));
  P.push(colorize(place(new THREE.BoxGeometry(.28, .22, 1.1), 3.0, hgt + .38, 4.3), WOOD)); // waterspout
  if (v === 1) { P.push(colorize(place(rb(.8, .8, .26, .1, 1), -2.0, 5.5, 4.0), WIN)); P.push(colorize(place(rb(.8, .8, .26, .1, 1), 1.6, 5.5, 4.0), WIN)); P.push(colorize(place(rb(.26, .8, .8, .1, 1), 4.0, 5.4, -1.5), WIN)); }
  if (v === 2) {
    P.push(colorize(place(rb(3.6, 2.7, 3.4, .32, 2), -1.9, hgt + 1.35, -1.9), WALL));
    P.push(colorize(place(rb(.9, 1.7, .24, .08, 1), -1.9, hgt + .85, -.2), DOOR));
    P.push(colorize(place(new THREE.BoxGeometry(3.2, .1, 3.0), -1.9, hgt + 2.72, -1.9), ROOF));
  }
  P.forEach(p => { if (p.attributes.normal && !p.attributes.uv) p.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.attributes.position.count * 2), 2)); });
  const g = mergeGeometries(P.map(p => (p.index ? p.toNonIndexed() : p)), false);
  g.userData = { h: hgt, win: [[-2.0, 2.75, 4.14]].concat(v === 1 ? [[-2.0, 5.5, 4.14], [1.6, 5.5, 4.14]] : []), door: [1.4, 0, 4.25] };
  return g;
}

// Polyline with circular-ish (quadratic) corner fillets, sampled every ~step metres in XZ.
// Returns {pts:[[x,z]...], cum:[arc length], anchor: arc length where the fillet of vertex `anchorIdx` begins}.
function filletPath(P0, rMax, step, anchorIdx) {
  const P = [P0[0]]; let aI = anchorIdx; for (let i = 1; i < P0.length; i++) { const a = P[P.length - 1], b = P0[i]; if (Math.hypot(b.x - a.x, b.z - a.z) > .05) P.push(b); if (i === anchorIdx) aI = P.length - 1; } anchorIdx = aI;
  const out = [[P[0].x, P[0].z]], cum = [0]; let cx = P[0].x, cz = P[0].z, anchor = 0;
  const push = (x, z) => { const l = Math.hypot(x - cx, z - cz); if (l < 1e-4) return; out.push([x, z]); cum.push(cum[cum.length - 1] + l); cx = x; cz = z; };
  const line = (x, z) => { const l = Math.hypot(x - cx, z - cz), n = Math.max(1, Math.ceil(l / step)), x0 = cx, z0 = cz; for (let k = 1; k <= n; k++) push(x0 + (x - x0) * k / n, z0 + (z - z0) * k / n); };
  for (let i = 1; i < P.length; i++) {
    const B = P[i]; if (i === P.length - 1) { if (i === anchorIdx) anchor = cum[cum.length - 1] + Math.hypot(B.x - cx, B.z - cz); line(B.x, B.z); break; }
    const N = P[i + 1]; const lin = Math.hypot(B.x - cx, B.z - cz), lout = Math.hypot(N.x - B.x, N.z - B.z);
    const r = Math.min(i === anchorIdx ? 1.2 : rMax, lin * .98, lout * .48); const ix = (B.x - cx) / lin, iz = (B.z - cz) / lin, ox = (N.x - B.x) / lout, oz = (N.z - B.z) / lout;
    const ax = B.x - ix * r, az = B.z - iz * r, bx = B.x + ox * r, bz = B.z + oz * r;
    line(ax, az); if (i === anchorIdx) anchor = cum[cum.length - 1];
    const n = Math.max(2, Math.ceil(r * 2 / step)); for (let k = 1; k <= n; k++) { const u = k / n, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u; push(w0 * ax + w1 * B.x + w2 * bx, w0 * az + w1 * B.z + w2 * bz); }
  }
  return { pts: out, cum, anchor };
}

// camera: spherical rig around a moving target (pure function of t)
function camRig(camera, t, U, withShake) {
  const K = R.camK; const dist = Math.exp(K.ld(t)), pitch = K.pitch(t) * DEG, az = K.az(t) * DEG;
  const T = new THREE.Vector3(K.tx(t), K.ty(t), K.tz(t));
  const off = new THREE.Vector3(Math.sin(az) * Math.cos(pitch), Math.sin(pitch), Math.cos(az) * Math.cos(pitch)).multiplyScalar(dist);
  camera.position.copy(T).add(off); if (withShake) camera.position.add(U.shake(t, .0025 * dist, .35, 11));
  camera.lookAt(T); camera.updateMatrixWorld();
  return { dist, T };
}
// lantern kinematics: distance travelled along its path at time t, and the world position (lantern height)
function lightS(l, t) { const u = Math.min(1, Math.max(0, (t - l.td) / (l.ta - l.td))); const e = (-(Math.cos(Math.PI * u) - 1) / 2) * .35 + (1 - Math.pow(1 - u, 2.2)) * .65; return e * l.L; }
function lightPos(l, t, U) {
  const s = lightS(l, t); let k = 1; while (k < l.cum.length - 1 && l.cum[k] < s) k++;
  const f = U.clamp((s - l.cum[k - 1]) / Math.max(1e-6, l.cum[k] - l.cum[k - 1]));
  const P = new THREE.Vector3().lerpVectors(l.S[k - 1], l.S[k], f); const moving = t > l.td && t < l.ta ? 1 : 0;
  const idle = U.smoothstep(l.ta - .2, l.ta + .6, t); // waiting at the door: a gentle sway, never frozen
  P.y += 1.35 + Math.sin(t * 9 + l.seed * 5) * .05 * moving + Math.sin(t * 2.1 + l.seed * 3) * .05 * idle; P.x += Math.sin(t * 1.3 + l.seed) * .06 * idle; P.z += Math.cos(t * 1.1 + l.seed * 2) * .05 * idle; return P;
}

export default {
  post: {
    exposure: 1.4,
    bloom: { enabled: true, strength: 0.55, radius: 0.55, threshold: 0.78 },
    grade: { contrast: 1.08, saturation: 1.12, warmth: 0.0, lift: [0.008, 0.018, 0.05], gain: [1.0, 1.0, 1.03] },
    vignette: 0.5, grain: 0.03,
    dof: { enabled: true, tiltShift: true, focusY: 0.52, band: 0.62, amount: 0.75 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx;
    R = {};
    scene.background = new THREE.Color('#0c1428');
    scene.fog = new THREE.FogExp2('#24335a', 0.0006);
    scene.environment = await ctx.loadHDR('satara_night_no_lamps'); scene.environmentIntensity = 0.55;
    const sky = ENV.skyDome({ top: '#060b1e', mid: '#12224a', horizon: '#33406a', bottom: '#141a2c', sunDir: [0.55, 0.32, -1], sunColor: '#e9efff', sunSize: 0.9, sunGlow: 0.55, stars: 1.0, clouds: 0.12, cloudColor: '#3a4670', intensity: 1.0, radius: 900 });
    scene.add(sky); R.sky = sky;

    // ---------------- terrain: the valley (Wadi Ibrahim) between dark rocky mountains ----------------
    const SIZE = 1400; const fA = TEX.fbmField(21, 3, 5), fB = TEX.fbmField(37, 9, 4), fC = TEX.fbmField(53, 26, 3), fD = TEX.fbmField(71, 22, 3), fE = TEX.fbmField(83, 48, 2);
    const wr = v => ((v % 1) + 1) % 1; const N = (f, x, z) => f(wr(x / SIZE + .5), wr(z / SIZE + .5));
    const xc = z => 12 * Math.sin(z / 170 + .6);
    const halfW = z => 80 + 16 * Math.sin(z / 120 + 1.3) + 8 * Math.sin(z / 51);
    const mountain = (x, z) => {
      const d = Math.abs(x - xc(z)) - halfW(z) + N(fA, x, z) * 38 + Math.max(0, Math.abs(z + 20) - 270) * .9;
      const m = Math.max(0, d + 6); if (m <= 0) return 0;
      const big = N(fA, x + 400, z - 200) * .5 + .5, rid = 1 - Math.abs(N(fB, x, z)), rid2 = 1 - Math.abs(N(fD, x, z));
      let h = 115 * (1 - Math.exp(-m / 55)) * (.5 + .75 * big) + 75 * U.smoothstep(50, 260, m) * (N(fB, x * .7 + 100, z * .7) * .5 + .5) * rid
        + rid * rid * rid * 34 * Math.min(1, m / 30) + rid2 * rid2 * rid2 * 22 * Math.min(1, m / 20) + N(fC, x, z) * 7 * Math.min(1, m / 12);
      const g3 = 1 - Math.abs(N(fE, x, z)); h += g3 * g3 * 9 * Math.min(1, m / 25);
      // rock ledges (granite benches) blended in
      const st = 9, q = Math.floor(h / st) * st, f = (h - q) / st, tf = f < .62 ? f * .35 / .62 : .35 + (f - .62) * .65 / .38;
      return h + (q + tf * st - h) * .4 * U.smoothstep(8, 30, h);
    };
    const H = (x, z) => { const r = Math.hypot(x, z); const fl = (1.1 * N(fC, x * .4, z * .4) + .008 * r) * U.smoothstep(22, 60, r); return mountain(x, z) + fl; };
    R.H = H;
    let meshH = H;
    {
      const SEGX = 230, SEGZ = 280, TW = 1100, TD = 1300;
      { const sw = TW / SEGX, sd = TD / SEGZ; const hv = (ix, iy) => H(-TW / 2 + ix * sw, -TD / 2 + iy * sd - 20);
        meshH = (x, z) => { const gx = (x + TW / 2) / sw, gz = (z + 20 + TD / 2) / sd; const ix = Math.floor(gx), iy = Math.floor(gz), fx = gx - ix, fz = gz - iy;
          const a = hv(ix, iy), b = hv(ix, iy + 1), c = hv(ix + 1, iy + 1), d = hv(ix + 1, iy);
          return fx + fz <= 1 ? a + (d - a) * fx + (b - a) * fz : c + (b - c) * (1 - fx) + (d - c) * (1 - fz); }; }
      const geo = new THREE.PlaneGeometry(TW, TD, SEGX, SEGZ); geo.rotateX(-Math.PI / 2);
      const p = geo.attributes.position; const col = new Float32Array(p.count * 3);
      const cSand = new THREE.Color('#968878'), cPlaza = new THREE.Color('#d2b994'), cRock = new THREE.Color('#9a7c68'), cRock2 = new THREE.Color('#6a5246'), cDust = new THREE.Color('#7f6c5c'), c = new THREE.Color();
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), z = p.getZ(i) - 20; const h = H(x, z); p.setY(i, h); p.setZ(i, z);
        const rk = U.smoothstep(2, 16, h), n = N(fC, x * 2, z * 2) * .5 + .5, n2 = N(fB, x, z) * .5 + .5;
        c.copy(cSand).lerp(cDust, n * .6).lerp(cPlaza, (1 - U.smoothstep(26, 40, Math.hypot(x, z))) * .9);
        const rc = cRock.clone().lerp(cRock2, U.smoothstep(.3, .7, n2 * .6 + n * .5)); c.lerp(rc, rk);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      geo.computeVertexNormals();
      { // slope shading: cliffs darker, ridge tops a bit paler (reads as rock at map scale)
        const nr = geo.attributes.normal, RW = SEGX + 1; const hh = new Float32Array(p.count); for (let i = 0; i < p.count; i++) hh[i] = p.getY(i);
        const at = (r, c) => hh[U.clamp(r, 0, SEGZ) * RW + U.clamp(c, 0, SEGX)];
        for (let i = 0; i < p.count; i++) {
          const r = Math.floor(i / RW), cI = i % RW, h = hh[i]; let av = 0; for (const o of [2, 5]) av += at(r - o, cI) + at(r + o, cI) + at(r, cI - o) + at(r, cI + o); av /= 8;
          const cav = U.clamp(1 + (h - av) * .05, .5, 1.3); const ny = nr.getY(i); const cliff = U.smoothstep(.93, .7, ny) * U.smoothstep(3, 14, h);
          const k = (1 - cliff * .25) * (U.smoothstep(2, 10, h) > 0 ? U.lerp(1, cav, U.smoothstep(2, 10, h)) : 1);
          col[i * 3] *= k; col[i * 3 + 1] *= k; col[i * 3 + 2] *= k;
        }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const st = TEX.stone({ a: '#ffffff', b: '#d6cec4', seed: 9, repeat: [150, 177] });
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: st.map, normalMap: st.normalMap, normalScale: new THREE.Vector2(1.1, 1.1), roughness: .96 });
      const terrain = new THREE.Mesh(geo, mat); terrain.receiveShadow = true; terrain.castShadow = true; scene.add(terrain);
    }

    // granite boulders strewn over the slopes (Mecca's hills are piles of rounded granite blocks)
    {
      const br = U.rng(909); const rocks = [];
      for (let k = 0; k < 9000 && rocks.length < 2600; k++) {
        const x = (br() - .5) * 900, z = (br() - .5) * 1000 - 20; const h = H(x, z); if (h < 4 || h > 130 || Math.abs(x) < 60) continue;
        const sl = Math.abs(H(x + 3, z) - H(x - 3, z)) + Math.abs(H(x, z + 3) - H(x, z - 3)); if (sl > 9) continue;
        const sz = 2.2 + Math.pow(br(), 2.0) * 5; rocks.push([x, h - sz * .4, z, sz, br(), br(), br()]);
      }
      const rg = new THREE.IcosahedronGeometry(1, 0); { const p = rg.attributes.position; const jr = U.rng(5); const seen = new Map(); for (let i = 0; i < p.count; i++) { const key = p.getX(i).toFixed(3) + p.getY(i).toFixed(3) + p.getZ(i).toFixed(3); if (!seen.has(key)) seen.set(key, .78 + jr() * .4); const f = seen.get(key); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * .72, p.getZ(i) * f); } rg.computeVertexNormals(); }
      const rt = TEX.stone({ a: '#ffffff', b: '#a49a90', seed: 19, repeat: [1, 1] });
      const rm = new THREE.MeshStandardMaterial({ map: rt.map, normalMap: rt.normalMap, roughness: .9, flatShading: true });
      const ri = new THREE.InstancedMesh(rg, rm, rocks.length); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), c = new THREE.Color();
      rocks.forEach(([x, y, z, sz, a, b, cc], i) => { e.set((a - .5) * .5, b * 6.28, (cc - .5) * .5); q.setFromEuler(e); m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sz * (.8 + a * .5), sz * (.7 + b * .4), sz * (.8 + cc * .5))); ri.setMatrixAt(i, m4); c.set('#8a7464').lerp(new THREE.Color('#5a4840'), b * .8).lerp(new THREE.Color('#a68e7a'), a * a * .5); ri.setColorAt(i, c); });
      ri.castShadow = true; ri.receiveShadow = true; scene.add(ri);
    }

    // ---------------- street graph (warped grid) + houses in the blocks ----------------
    const rnd = U.rng(404);
    const SX = 25, SZ = 29, I0 = -6, I1 = 6, J0 = -10, J1 = 10, NJ = J1 - J0 + 1;
    const nodes = [];
    for (let i = I0; i <= I1; i++) for (let j = J0; j <= J1; j++) {
      const z = j * SZ + (rnd() - .5) * 9, x = i * SX + xc(z) + (rnd() - .5) * 8 + Math.sin(j * .9) * 3;
      nodes.push({ x, z, i, j, h: H(x, z), adj: [] });
    }
    const nid = (i, j) => (i - I0) * NJ + (j - J0);
    const nodeAt = (i, j) => nodes[nid(i, j)];
    const edgeOk = (a, b) => a.h < 17 && b.h < 17 && H((a.x + b.x) / 2, (a.z + b.z) / 2) < 17;
    for (let i = I0; i <= I1; i++) for (let j = J0; j <= J1; j++) {
      const a = nodeAt(i, j);
      for (const [di, dj] of [[1, 0], [0, 1]]) { if (i + di > I1 || j + dj > J1) continue; const b = nodeAt(i + di, j + dj); if (!edgeOk(a, b)) continue; const w = Math.hypot(a.x - b.x, a.z - b.z) * (1 + Math.abs(a.h - b.h) * .05) * (Math.hypot((a.x + b.x) / 2, (a.z + b.z) / 2) < 48 ? 4 : 1); a.adj.push([nid(i + di, j + dj), w]); b.adj.push([nid(i, j), w]); }
    }
    const bil = (q, u, v) => ({ x: (1 - u) * (1 - v) * q[0].x + u * (1 - v) * q[1].x + u * v * q[2].x + (1 - u) * v * q[3].x, z: (1 - u) * (1 - v) * q[0].z + u * (1 - v) * q[1].z + u * v * q[2].z + (1 - u) * v * q[3].z });
    const houses = [];
    for (let i = I0; i < I1; i++) for (let j = J0; j < J1; j++) {
      const q = [nodeAt(i, j), nodeAt(i + 1, j), nodeAt(i + 1, j + 1), nodeAt(i, j + 1)];
      const ni = 2, nj = rnd() < .5 ? 2 : 3; const bw = Math.hypot(q[1].x - q[0].x, q[1].z - q[0].z), bd = Math.hypot(q[3].x - q[0].x, q[3].z - q[0].z);
      const mu = 2.3 / bw, mv = 2.3 / bd;
      for (let a = 0; a < ni; a++) for (let b = 0; b < nj; b++) {
        if (rnd() < .07) continue;
        const u0 = mu + (1 - 2 * mu) * a / ni, u1 = mu + (1 - 2 * mu) * (a + 1) / ni, v0 = mv + (1 - 2 * mv) * b / nj, v1 = mv + (1 - 2 * mv) * (b + 1) / nj;
        const uc = (u0 + u1) / 2, vc = (v0 + v1) / 2; const C = bil(q, uc, vc);
        const pu0 = bil(q, u0, vc), pu1 = bil(q, u1, vc), pv0 = bil(q, uc, v0), pv1 = bil(q, uc, v1);
        const du = Math.hypot(pu1.x - pu0.x, pu1.z - pu0.z), dv = Math.hypot(pv1.x - pv0.x, pv1.z - pv0.z);
        if (Math.hypot(C.x, C.z) < 37) continue; // open ground around the Kaaba
        const hC = H(C.x, C.z); if (hC > 13) continue;
        const uDir = new THREE.Vector2(pu1.x - pu0.x, pu1.z - pu0.z).normalize(), vDir = new THREE.Vector2(pv1.x - pv0.x, pv1.z - pv0.z).normalize();
        // door faces a street (block boundary side)
        const sides = []; if (b === 0) sides.push(['v', -1]); if (b === nj - 1) sides.push(['v', 1]); if (a === 0) sides.push(['u', -1]); if (a === ni - 1) sides.push(['u', 1]);
        const [ax, sg] = sides.length ? sides[Math.floor(rnd() * sides.length)] : ['v', 1];
        const fwd = (ax === 'v' ? vDir : uDir).clone().multiplyScalar(sg); // local +z
        const width = (ax === 'v' ? du : dv) - 1.4 - rnd() * 1.6, depth = (ax === 'v' ? dv : du) - 1.4 - rnd() * 1.6;
        if (width < 4.5 || depth < 4.5) continue;
        const yaw = Math.atan2(fwd.x, fwd.y) + (rnd() - .5) * .05;
        const r = rnd(); const variant = hC > 7 ? 0 : r < .2 ? 1 : r < .38 ? 2 : 0;
        // street edge the door faces
        let e; if (ax === 'v') e = sg < 0 ? [q[0], q[1]] : [q[3], q[2]]; else e = sg < 0 ? [q[0], q[3]] : [q[1], q[2]];
        const hs = Math.min(H(C.x - 3, C.z - 3), H(C.x + 3, C.z - 3), H(C.x - 3, C.z + 3), H(C.x + 3, C.z + 3), hC) - .35;
        houses.push({ x: C.x, z: C.z, y: hs, yaw, sx: width / 8, sz: depth / 8, sh: .92 + rnd() * .2, variant, fwd, edge: e, tint: Math.floor(rnd() * 6), r1: rnd(), r2: rnd(), r3: rnd() });
      }
    }
    R.houses = houses;

    // destination: a modest single-storey house south-west of the Kaaba whose door faces the camera side
    const D0 = new THREE.Vector2(-34, 58); let dest = null, best = 1e9;
    houses.forEach(h => { if (h.variant === 2) return; const sc = Math.hypot(h.x - D0.x, h.z - D0.y) + (h.fwd.y < .7 ? 200 : 0); if (sc < best) { best = sc; dest = h; } });
    dest.isDest = true; dest.variant = 0; R.dest = dest;
    { // a small open square in front of its door, where the lights will gather
      const Q = { x: dest.x + dest.fwd.x * (dest.sz * 4 + 8.5), z: dest.z + dest.fwd.y * (dest.sz * 4 + 8.5) };
      for (let k = houses.length - 1; k >= 0; k--) { const h = houses[k]; if (h !== dest && Math.hypot(h.x - Q.x, h.z - Q.z) < 10.5) houses.splice(k, 1); }
      R.square = Q;
    }

    const variants = [0, 1, 2].map(v => houseVariant(M, v)), variantsLo = [0, 1, 2].map(v => houseVariant(M, v, true));
    const tints = ['#dcb68c', '#cfa67b', '#e3c49d', '#c99c73', '#d6b28e', '#c2946c'].map(c => new THREE.Color(c));
    const pl = TEX.plaster({ a: '#ffffff', b: '#d2c2ad', seed: 15, repeat: [1, 1] });
    const houseMat = new THREE.MeshStandardMaterial({ vertexColors: true, map: pl.map, normalMap: pl.normalMap, normalScale: new THREE.Vector2(.9, .9), roughness: .93 });
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), yAx = new THREE.Vector3(0, 1, 0), v3 = new THREE.Vector3(), s3 = new THREE.Vector3();
    houses.forEach(h => { q4.setFromAxisAngle(yAx, h.yaw); h.mat = new THREE.Matrix4().compose(new THREE.Vector3(h.x, h.y, h.z), q4.clone(), new THREE.Vector3(h.sx, h.sh, h.sz)); });
    {
      const aoT = TEX.drawTexture(64, 64, (x, W, H) => { x.clearRect(0, 0, W, H); x.shadowColor = 'rgba(0,0,0,1)'; x.shadowBlur = 9; x.fillStyle = '#000'; ui_rr(x, 12, 12, 40, 40, 6); x.fill(); });
      const aoM = new THREE.MeshBasicMaterial({ map: aoT, color: '#000000', transparent: true, opacity: .5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const ao = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), aoM, houses.length);
      houses.forEach((hh, k) => { const sc = new THREE.Vector3(hh.sx * 8 * 1.45, 1, hh.sz * 8 * 1.45); m4.compose(new THREE.Vector3(hh.x, meshH(hh.x, hh.z) + .06, hh.z), q4.setFromAxisAngle(yAx, hh.yaw), sc); ao.setMatrixAt(k, m4); });
      ao.renderOrder = 1; ao.userData.noDepth = true; scene.add(ao);
    }
    const winList = [];
    const nearDest = h => Math.hypot(h.x - dest.x, h.z - dest.z) < 85;
    for (let v = 0; v < 3; v++) for (const lo of [false, true]) {
      const list = houses.filter(h => h.variant === v && !h.isDest && nearDest(h) === !lo); if (!list.length) continue;
      const im = new THREE.InstancedMesh(lo ? variantsLo[v] : variants[v], houseMat, list.length);
      list.forEach((h, k) => { im.setMatrixAt(k, h.mat); im.setColorAt(k, tints[h.tint]); });
      im.castShadow = true; im.receiveShadow = true; scene.add(im);
      // a few warm-lit windows (oil lamps inside)
      list.forEach(h => { if (h.r2 < .24) variants[v].userData.win.forEach((w, k) => { if (k === 0 || h.r3 < .5) winList.push({ h, w }); }); });
    }
    houses.forEach(h => { const hh = variants[h.variant].userData.h; h.top = new THREE.Vector3(0, hh + .8, 0).applyMatrix4(h.mat); const d = variants[h.variant].userData.door; h.door = new THREE.Vector3(d[0], 0, d[2] + .4).applyMatrix4(h.mat); });
    {
      const wg = new THREE.PlaneGeometry(.66, .66);
      const wm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffae55').multiplyScalar(2.2), toneMapped: true });
      const wi = new THREE.InstancedMesh(wg, wm, winList.length);
      winList.forEach((o, k) => { m4.makeTranslation(o.w[0], o.w[1], o.w[2]); wi.setMatrixAt(k, o.h.mat.clone().multiply(m4)); });
      scene.add(wi);
    }

    // ---------------- the Kaaba: plain stone cube with a dark cloth (no band), Hijr wall, open ground ----------------
    {
      const K = new THREE.Group(); const KW = 11.5, KD = 9.6, KH = 10.6; K.rotation.y = .12; K.position.y = H(0, 0); scene.add(K); R.kaaba = K;
      const stoneMat = M.MAT.stone({ a: '#a59d92', b: '#7a7268', seed: 4, blocks: 6, repeat: [1, 1] });
      const base = new THREE.Mesh(M.rbox(KW + .7, .7, KD + .7, .15, 2), stoneMat); base.position.y = .35; K.add(base);
      const core = new THREE.Mesh(M.rbox(KW, KH, KD, .2, 2), stoneMat); core.position.y = KH / 2; K.add(core);
      // cloth: four draped panels with soft vertical folds and an uneven hem
      const parts = []; const fold = TEX.fbmField(61, 8, 3);
      const sides = [[KW, KD / 2, 0], [KD, KW / 2, Math.PI / 2], [KW, KD / 2, Math.PI], [KD, KW / 2, -Math.PI / 2]];
      sides.forEach(([w, off, ry], si) => {
        const g = new THREE.PlaneGeometry(w + .2, KH - .75, 40, 14); const p = g.attributes.position;
        for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); const u = (x / (w + .2)) + .5, v = (y / (KH - .75)) + .5; const low = 1 - v; let z = .07 + Math.sin(u * w * 2.3 + si) * .035 * (.4 + low) + fold(u, v * .3 + si * .25) * .03; if (v < .02) { p.setY(i, y + fold(u * 2, .5 + si * .2) * .12); z += .03; } p.setZ(i, z); }
        g.computeVertexNormals(); g.translate(0, (KH - .75) / 2 + .75, off); g.rotateY(ry); parts.push(g);
      });
      const clothMat = new THREE.MeshPhysicalMaterial({ color: '#141315', roughness: .8, sheen: .6, sheenColor: new THREE.Color('#57524f'), sheenRoughness: .5, side: THREE.DoubleSide, envMapIntensity: .4 });
      const cloth = new THREE.Mesh(mergeGeometries(parts), clothMat); K.add(cloth);
      // the raised wooden door on the east face
      const door = new THREE.Mesh(M.rbox(1.7, 2.8, .2, .06, 1), M.MAT.darkWood({ rings: 26 })); door.position.set(KW / 2 - 3.0, 2.2 + 1.4, KD / 2 + .12); K.add(door);
      // Hijr (Hatim): low semicircular wall beside the north-west face, open at both ends
      const hm = M.MAT.stone({ a: '#c2b8a8', b: '#968c7e', seed: 6, repeat: [1, 1] });
      for (let k = 0; k <= 14; k++) { const a = (.12 + .76 * k / 14) * Math.PI; const x = Math.cos(a) * KW * .42, z = -KD / 2 - Math.sin(a) * 7.6; const sgm = new THREE.Mesh(M.rbox(2.05, 1.3, .9, .2, 1), hm); sgm.position.set(x, .65, z); sgm.rotation.y = Math.atan2(7.6 * Math.cos(a), -KW * .42 * Math.sin(a)); K.add(sgm); }
      // Zamzam well: a low stone ring
      const well = M.lathe([[1.0, 0], [1.25, 0], [1.25, .85], [1.05, .95], [.95, .85], [.95, .2]], hm, 28); well.position.set(17, 0, 5); K.add(well);
      M.shadowAll(K);
    }

    // ---------------- the destination house (hero) with an open, lamp-lit doorway ----------------
    {
      const d = dest; const w = d.sx * 8, dp = d.sz * 8, h = 4.1 * d.sh; const G = new THREE.Group();
      G.position.set(d.x, d.y, d.z); G.rotation.y = d.yaw; scene.add(G); R.destG = G;
      const wallMat = M.MAT.plaster({ a: '#e4c59c', b: '#bc946b', seed: 9, repeat: [1, 1] });
      const T = .55, dw = 1.35, dh = 2.3, dx = .9;
      const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); G.add(m); return m; };
      add(M.rbox(w, h, T, .2, 2), wallMat, 0, h / 2, -dp / 2 + T / 2);
      add(M.rbox(T, h, dp, .2, 2), wallMat, -w / 2 + T / 2, h / 2, 0);
      add(M.rbox(T, h, dp, .2, 2), wallMat, w / 2 - T / 2, h / 2, 0);
      const lw = (dx - dw / 2) - (-w / 2), rw = w / 2 - (dx + dw / 2);
      add(M.rbox(lw, h, T, .2, 2), wallMat, -w / 2 + lw / 2, h / 2, dp / 2 - T / 2);
      add(M.rbox(rw, h, T, .2, 2), wallMat, w / 2 - rw / 2, h / 2, dp / 2 - T / 2);
      add(M.rbox(dw + .1, h - dh, T, .12, 2), wallMat, dx, dh + (h - dh) / 2, dp / 2 - T / 2);
      add(M.rbox(w + .05, .42, dp + .05, .15, 2), wallMat, 0, h + .05, 0); // roof slab
      for (const s of [-1, 1]) { add(M.rbox(w + .1, .7, .42, .16, 1), wallMat, 0, h + .5, s * (dp / 2 - .2)); add(M.rbox(.42, .7, dp - .3, .16, 1), wallMat, s * (w / 2 - .2), h + .5, 0); }
      add(new THREE.BoxGeometry(w - .8, .1, dp - .8), M.MAT.plaster({ a: '#cdb595', b: '#a88c6c', seed: 21 }), 0, h + .3, 0);
      const wood = M.MAT.darkWood({ rings: 24 });
      add(M.rbox(dw + .7, .3, T + .2, .08, 1), wood, dx, dh + .15, dp / 2 - T / 2); // lintel beam
      const floor = add(new THREE.PlaneGeometry(w - 2 * T, dp - 2 * T).rotateX(-Math.PI / 2), M.MAT.plaster({ a: '#9a7a5a', b: '#7a5a40', seed: 12 }), 0, .03, 0);
      // door leaf swung open inward against the jamb
      const leafP = new THREE.Group(); leafP.position.set(dx - dw / 2 + .05, 0, dp / 2 - T - .02); G.add(leafP);
      const leaf = new THREE.Mesh(M.rbox(dw - .08, dh - .06, .1, .03, 1), wood); leaf.position.set((dw - .08) / 2, dh / 2, 0); leafP.add(leaf); leafP.rotation.y = 1.35;
      G.updateMatrixWorld(true); const gl = (lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyMatrix4(G.matrixWorld); return meshH(v.x, v.z) - d.y; };
      add(M.rbox(dw + .5, .16, .7, .05, 1), M.MAT.stone({ a: '#b7ab98', b: '#8c8070', seed: 3 }), dx, gl(dx, dp / 2 + .3) + .05, dp / 2 + .3); // threshold
      // small lit window with wooden bars
      const wx = -w / 2 + 1.9;
      add(new THREE.PlaneGeometry(.75, .75), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb562').multiplyScalar(2.4) }), wx, 2.8, dp / 2 + .005);
      for (let k = -1; k <= 1; k++) add(M.rbox(.07, .8, .08, .02, 1), wood, wx + k * .22, 2.8, dp / 2 + .04);
      // bench by the door + water jar + palm
      add(M.rbox(2.0, .5 + .6, .65, .14, 2), wallMat, dx + 2.2, gl(dx + 2.2, dp / 2 + .32) + .25 - .3, dp / 2 + .32);
      const jar = M.lathe([[0, 0], [.16, .02], [.27, .2], [.29, .4], [.22, .62], [.12, .72], [.13, .8], [.1, .82]], M.MAT.clay({ a: '#b56a3f', b: '#87492a' }), 24); jar.position.set(dx - 1.25, gl(dx - 1.25, dp / 2 + .45) - .02, dp / 2 + .45); G.add(jar);
      const palm = M.palm({ height: 9, seed: 5, lean: .5, fronds: 14, leafColor: '#3c5a2c' }); palm.position.set(w / 2 + 2.4, gl(w / 2 + 2.4, dp / 2 - 1.2) - .1, dp / 2 - 1.2); G.add(palm);
      M.shadowAll(G); floor.castShadow = false;
      // interior oil-lamp light: point light inside + a soft spot spilling out of the doorway onto the alley
      const lamp = new THREE.PointLight('#ffa14a', 26, 2.9, 2); lamp.position.set(dx - .2, 1.5, dp / 2 - 1.5); G.add(lamp); R.destLamp = lamp;
      const spill = new THREE.SpotLight('#ffab55', 0, 22, .62, .85, 1.6); spill.position.set(dx, 2.0, dp / 2 - 2.4); spill.target.position.set(dx, 0, dp / 2 + 7); G.add(spill, spill.target); R.spill = spill;
      const doorLocal = new THREE.Vector3(dx, 0, dp / 2 + .9); G.updateMatrixWorld(); R.doorW = doorLocal.clone().applyMatrix4(G.matrixWorld);
      R.doorDir = new THREE.Vector3(0, 0, 1).applyQuaternion(G.quaternion).setY(0).normalize();
      R.destTop = new THREE.Vector3(0, h + 1, 0).applyMatrix4(G.matrixWorld);
      dest.door = R.doorW.clone();
    }

    // ---------------- lantern paths: red-dot houses -> street graph -> the destination door ----------------
    // Dijkstra from the destination's street edge
    const dE = dest.edge; const footOn = (e, p) => { const ax = e[1].x - e[0].x, az = e[1].z - e[0].z; const L2 = ax * ax + az * az; let s = ((p.x - e[0].x) * ax + (p.z - e[0].z) * az) / L2; s = U.clamp(s, .08, .92); return { x: e[0].x + ax * s, z: e[0].z + az * s }; };
    const dFoot = footOn(dE, R.doorW);
    const dist = new Float64Array(nodes.length).fill(Infinity), prev = new Int32Array(nodes.length).fill(-1), done = new Uint8Array(nodes.length);
    for (const e of dE) { const k = nodes.indexOf(e); dist[k] = Math.hypot(e.x - dFoot.x, e.z - dFoot.z); }
    for (; ;) { let k = -1, bd = Infinity; for (let i = 0; i < nodes.length; i++) if (!done[i] && dist[i] < bd) { bd = dist[i]; k = i; } if (k < 0) break; done[k] = 1; for (const [o, w] of nodes[k].adj) if (dist[k] + w < dist[o]) { dist[o] = dist[k] + w; prev[o] = k; } }
    // red-dot houses (müşrikler) — many, but not all
    const pr = U.rng(77);
    const red = houses.filter(h => !h.isDest && h.r1 < .46);
    const center = new THREE.Vector2(-8, 18);
    red.forEach(h => { const dd = Math.hypot(h.x - center.x, h.z - center.y); h.tp = 1.55 + U.clamp(dd / 230, 0, 1) * 1.25 + pr() * .3; });
    R.red = red;
    { let bs = 1e9; for (const h of red) { if (h.tp > 2.5) continue; const sc = Math.hypot(h.x + 48, h.z + 22); if (sc < bs) { bs = sc; R.mlabel = h; } } }
    // pick sources spread around the destination
    const cand = red.map(h => { const f = footOn(h.edge, h.door); const ks = h.edge.map(e => nodes.indexOf(e)); const k = dist[ks[0]] + Math.hypot(f.x - h.edge[0].x, f.z - h.edge[0].z) < dist[ks[1]] + Math.hypot(f.x - h.edge[1].x, f.z - h.edge[1].z) ? ks[0] : ks[1]; const L = dist[k] + Math.hypot(f.x - nodes[k].x, f.z - nodes[k].z); return { h, f, k, L, ang: Math.atan2(h.x - dest.x, h.z - dest.z) }; })
      .filter(c => isFinite(c.L) && c.L > 35 && c.L < 330 && Math.hypot(c.h.x - dest.x, c.h.z - dest.z) > 25);
    cand.sort((a, b) => a.ang - b.ang);
    const NL = 30; const picks = []; const step = cand.length / NL;
    for (let k = 0; k < NL; k++) picks.push(cand[Math.floor(k * step + pr() * step * .8)]);
    const doorW = R.doorW, dd = R.doorDir, side = new THREE.Vector3(dd.z, 0, -dd.x);
    const lights = [];
    picks.forEach((c, li) => {
      const pts = [{ x: c.h.door.x, z: c.h.door.z }, c.f];
      let k = c.k; const seen = new Set(); while (k >= 0 && !seen.has(k)) { seen.add(k); pts.push({ x: nodes[k].x, z: nodes[k].z }); k = prev[k]; }
      pts.push(dFoot);
      // a waypoint spread across the little square, then through the door into the lamp-lit room
      const ring = Math.floor(li / 10), a = (((li * 7) % 10) / 9 - .5) * (2.3 - ring * .3) + (pr() - .5) * .12, rr = 3.4 + ring * 2.5 + pr() * .6;
      const slot = doorW.clone().addScaledVector(dd, Math.cos(a) * rr + .3).addScaledVector(side, Math.sin(a) * rr * 1.25);
      pts.push({ x: slot.x, z: slot.z });
      // corner fillets (radius <= 3 m): beyond each fillet, lanterns that share a street follow IDENTICAL geometry, and the
      // arc-length from any shared point to the meeting point in front of the door is identical too. Trail dots are
      // phased from that meeting point (sF), so the dots of different lanterns on a shared street coincide exactly.
      const F = filletPath(pts, 3, 1.0, pts.length - 2);
      const S = F.pts.map(([x, z]) => new THREE.Vector3(x, meshH(x, z), z)), cum = F.cum;
      lights.push({ S, cum, L: cum[cum.length - 1], src: c.h, seed: pr() * 10, sF: F.anchor });
    });
    // timing: depart 3.05–3.8 ("emanetlerini"), arrive 4.85–5.75 (long paths arrive last)
    const byL = lights.map((l, i) => [l.L, i]).sort((a, b) => a[0] - b[0]);
    byL.forEach(([L, i], rank) => { const l = lights[i]; l.td = 3.0 + pr() * .8; l.ta = 4.55 + (rank / (NL - 1)) * 1.55 + pr() * .1; });
    R.lights = lights;

    // lantern glow points (core + halo) and warm ground pools
    const lpos = new Float32Array(NL * 3), lb = new Float32Array(NL);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3)); lg.setAttribute('bright', new THREE.BufferAttribute(lb, 1));
    const mkPts = (worldSize, minPx, k, gain, col) => {
      const u = { focal: { value: 1000 }, worldSize: { value: worldSize }, minPx: { value: minPx } };
      const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `uniform float focal, worldSize, minPx; attribute float bright; varying float vB; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; vB = bright; gl_PointSize = bright > .001 ? clamp(worldSize*focal/(-mv.z), minPx, 900.) : 0.; }`,
        fragmentShader: `varying float vB; void main(){ vec2 p = gl_PointCoord*2.-1.; float r2 = dot(p,p); if (r2 > 1.) discard; float a = exp(-r2*${k.toFixed(1)}) * (1. - r2); gl_FragColor = vec4(vec3(${col}) * ${gain.toFixed(2)}, a * vB); }` });
      const pts = new THREE.Points(lg, m); pts.frustumCulled = false; pts.userData.noDepth = true; pts.renderOrder = 30; scene.add(pts); return u;
    };
    R.ptsU = [mkPts(2.5, 24, 4.5, .9, '1.,.55,.2'), mkPts(.38, 7, 3.0, 3.0, '1.,.86,.62')];
    const poolTex = TEX.gradientTex([[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.45)'], [0.65, 'rgba(255,255,255,0.1)'], [1, 'rgba(255,255,255,0)']], { w: 128, h: 128, radial: true });
    const pool = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: poolTex, color: '#ff9440', transparent: true, opacity: .4, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), NL);
    pool.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NL * 3), 3); pool.frustumCulled = false; pool.userData.noDepth = true; pool.renderOrder = 3; scene.add(pool); R.pool = pool;
    R.lpos = lpos; R.lb = lb; R.lg = lg;
    // two real lantern lights for the close-up (follow the two lights that end nearest the door)
    const near2 = lights.map((l, i) => [-l.ta, i]).sort((a, b) => a[0] - b[0]).slice(0, 2).map(a => a[1]);
    R.lanternLights = near2.map(i => { const p = new THREE.PointLight('#ffa04a', 0, 16, 2); scene.add(p); return { p, i }; });

    // moonlight: the one shadow caster; its frustum follows the camera target
    const moon = ENV.sunLight({ color: '#a8c2ff', intensity: 2.6, pos: [40, 330, 190], target: [0, 0, 0], size: 240, mapSize: 2048, bias: -0.0006, normalBias: .05, radius: 2.5 });
    moon.shadow.camera.far = 900; scene.add(moon, moon.target); R.moon = moon; R.moonDir = new THREE.Vector3(40, 330, 190).normalize();
    scene.add(new THREE.HemisphereLight('#4c70c4', '#2a2c3c', 0.6));

    // ---------------- camera ----------------
    camera.fov = 34; camera.near = 1; camera.far = 2400; camera.updateProjectionMatrix();
    const G = new THREE.Vector3(dest.x, 0, dest.z).lerp(doorW, .78);
    const doorAz = Math.atan2(dd.x, dd.z) / DEG;
    R.camK = {
      ld: mono([[-0.6, Math.log(640)], [1.6, Math.log(565)], [3.2, Math.log(480)], [4.5, Math.log(320)], [5.1, Math.log(140)], [5.65, Math.log(48)], [6.2, Math.log(33)]]),
      pitch: mono([[-0.6, 66], [3.2, 65], [4.5, 62], [5.1, 54], [5.65, 33], [6.2, 26]]),
      az: mono([[-0.6, -13], [3.2, -3], [4.6, doorAz * .5 + 4], [5.65, doorAz + 20], [6.2, doorAz + 26]]),
      tx: mono([[-0.6, -8], [3.2, -20], [4.5, (G.x - 14) * .6 + G.x * .4], [5.3, G.x], [6.2, G.x]]),
      tz: mono([[-0.6, 18], [3.2, 32], [4.5, G.z - 4], [5.3, G.z], [6.2, G.z]]),
      ty: mono([[-0.6, 0], [4.5, 0], [5.5, dest.y + 4.6], [6.2, dest.y + 4.2]]),
    };
    R.G = G;
    R.focal = ctx.H / 2 / Math.tan(camera.fov * DEG / 2);
    {
      const probe = camera.clone(); let bs = 1e9;
      for (const l of lights) { let sc = 0; for (const tt of [3.5, 3.9, 4.3]) { camRig(probe, tt, U, false); const p = lightPos(l, tt, U).project(probe); sc += Math.hypot(p.x - .15, p.y - .05) + (Math.abs(p.x) > .8 || Math.abs(p.y) > .8 ? 5 : 0); } if (sc < bs) { bs = sc; R.lead = l; } }
    }
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const { dist, T } = camRig(camera, t, U, true);
    const rH = ctx.renderer.getDrawingBufferSize(new THREE.Vector2()).y; const focalR = rH / 2 / Math.tan(camera.fov * DEG / 2);
    R.ptsU.forEach(u => (u.focal.value = focalR));
    // moon shadow frustum follows the target, tighter as we come closer
    const S = U.clamp(dist * .55, 40, 300); const mc = R.moon.shadow.camera; mc.left = -S; mc.right = S; mc.top = S; mc.bottom = -S; mc.updateProjectionMatrix();
    R.moon.target.position.copy(T); R.moon.position.copy(T).addScaledVector(R.moonDir, 450); R.moon.target.updateMatrixWorld();
    // DOF band widens as we fly down, focus centred on the target
    post.dof.band = U.lerp(.62, .5, U.prog(t, 4.8, 5.8)); post.dof.amount = U.lerp(.75, .9, U.prog(t, 4.8, 5.8));

    // --- lanterns ---
    const L = R.lights, lpos = R.lpos, lb = R.lb, pc = R.pool.instanceColor; const m4 = new THREE.Matrix4(); const P = new THREE.Vector3();
    let pulse = 0; const closeK = U.prog(t, 4.7, 5.6, 'inOutSine');
    R.ptsU[0].worldSize.value = U.lerp(2.5, .95, closeK); R.ptsU[1].worldSize.value = U.lerp(.38, .2, closeK);
    L.forEach((l, i) => {
      const u = U.clamp((t - l.td) / (l.ta - l.td));
      const s = lightS(l, t); P.copy(lightPos(l, t, U));
      l.pos = l.pos || new THREE.Vector3(); l.pos.copy(P); l.s = s;
      const enter = 1; // lights gather and wait in front of the door
      const dt = t - l.ta + .12; if (dt > 0) pulse += Math.exp(-dt * 4) * (1 - Math.exp(-dt * 30));
      const on = enter * U.smoothstep(l.td - .25, l.td + .1, t) * (.88 + .12 * Math.sin(t * 13 + l.seed * 7) * Math.sin(t * 5.3 + l.seed));
      lpos[i * 3] = P.x; lpos[i * 3 + 1] = P.y; lpos[i * 3 + 2] = P.z; lb[i] = on;
      const ps = U.lerp(7.5, 3.6, closeK); m4.compose(new THREE.Vector3(P.x, P.y - 1.25, P.z), new THREE.Quaternion(), new THREE.Vector3(ps, 1, ps)); R.pool.setMatrixAt(i, m4);
      const pb = on * (1 - .45 * U.smoothstep(.85, 1, u)) * U.lerp(1, .55, closeK); pc.setXYZ(i, pb, pb * .85, pb * .7);
    });
    R.lg.attributes.position.needsUpdate = true; R.lg.attributes.bright.needsUpdate = true; R.pool.instanceMatrix.needsUpdate = true; pc.needsUpdate = true;
    const close = U.prog(t, 4.9, 5.7, 'inOutSine');
    R.lanternLights.forEach(({ p, i }) => { p.position.copy(L[i].pos); p.intensity = 14 * close * lb[i]; });
    const grow = U.prog(t, 4.4, 5.9);
    R.spill.intensity = 30 * (.35 + .65 * grow) + 10 * Math.min(pulse, 2.5); R.destLamp.intensity = 22 * (.8 + .06 * Math.sin(t * 11)) + 9 * Math.min(pulse, 2.5);

    // ================= Kurzgesagt map layer (2D overlay) =================
    const X = ui.ctx; const FO = ctx.H / 2 / Math.tan(camera.fov * DEG / 2);
    const mapFade = 1 - U.prog(t, 4.95, 5.4);
    const pinA = U.clamp((t - 4.3) / .4) * (1 - U.prog(t, 5.35, 5.6));
    // motion blur only on the fast swoop down to the door (camera zoom ~7%/frame there)
    post.motionBlur = { samples: t > 4.5 && t < 5.95 ? 3 : 1, shutter: .5 };
    if (!R.spr) R.spr = makeSprites();
    const V = new THREE.Vector3();
    // red dots (müşrikler) — sprite-based (crisp, no per-dot blur cost); dots near the destination give way to the gold pin
    const dim = U.lerp(1, .5, U.prog(t, 4.3, 4.8));
    X.save();
    for (const h of R.red) {
      const a = U.clamp((t - h.tp) / .32); if (a <= 0) continue;
      const [sx, sy, sz] = ui.project(h.top); if (sz > 1 || sx < -30 || sx > 1110 || sy < -30 || sy > 1950) continue;
      const d = camera.position.distanceTo(h.top); const r = U.clamp(2.0 * FO / d, 5, 12) * U.ease.outBack(a, 2.6);
      const near = 1 - pinA * U.smoothstep(34, 16, Math.hypot(h.x - R.dest.x, h.z - R.dest.z));
      X.globalAlpha = Math.min(1, a * 3) * dim * mapFade * near; if (X.globalAlpha <= .01 || r <= .5) continue;
      const k = r * 2 / 24; X.drawImage(R.spr.red, sx - 16 * k, sy - 16 * k + 2 * k, 32 * k, 32 * k);
    }
    // departure ripples + dotted trails of the trusts (emanetler): dots are anchored in WORLD space along each street
    // path and march toward the destination — stable under the moving camera (no re-dashing shimmer)
    const SP = 4.2, phase = (t * 8) % SP;
    for (const l of L) {
      if (t < l.td - .05) continue;
      const age = t - l.td; const [ox, oy, oz] = ui.project(l.S[0]);
      if (age < .6 && oz < 1) { X.globalAlpha = (1 - age / .6) * mapFade; X.strokeStyle = '#ffd78a'; X.lineWidth = 3.5; X.beginPath(); X.arc(ox, oy, 8 + age * 70, 0, Math.PI * 2); X.stroke(); }
      const al = .95 * mapFade * U.clamp(age / .2); if (al <= .01) continue;
      let k = 1; const off = ((l.sF + phase) % SP + SP) % SP;
      for (let sd = off; sd < l.s - .8; sd += SP) {
        while (k < l.cum.length - 1 && l.cum[k] < sd) k++;
        const f = (sd - l.cum[k - 1]) / Math.max(1e-6, l.cum[k] - l.cum[k - 1]); V.lerpVectors(l.S[k - 1], l.S[k], U.clamp(f)); V.y += .3;
        const [px, py, pz] = ui.project(V); if (pz > 1 || px < -20 || px > 1100 || py < -20 || py > 1940) continue;
        const d = camera.position.distanceTo(V); const r = U.clamp(.8 * FO / d, 4.4, 8.5);
        const head = U.smoothstep(l.s - 14, l.s - 1, sd); // trail brightens toward the moving light
        X.globalAlpha = al * (.78 + .22 * head); X.drawImage(R.spr.dot, px - r * 2.1, py - r * 2.1, r * 4.2, r * 4.2);
      }
    }
    X.restore();

    // destination pin (gold) + pulse ring — "one door"
    if (pinA > 0) {
      const [px, py, pz] = ui.project(R.destTop);
      if (pz < 1) {
        X.save();
        const ringT = ((t - 4.3) % .9) / .9; X.globalAlpha = pinA * (1 - ringT) * .9; X.strokeStyle = '#ffd36e'; X.lineWidth = 4; X.beginPath(); X.ellipse(px, py + 8, 20 + ringT * 70, (20 + ringT * 70) * .55, 0, 0, Math.PI * 2); X.stroke();
        const s = U.ease.outBack(U.clamp((t - 4.3) / .45), 2.4); const bob = Math.sin(t * 5) * 4; const top = py - 22 - 70 * s + bob;
        X.globalAlpha = pinA; X.translate(px, top); X.scale(s, s);
        X.shadowColor = 'rgba(0,0,0,.5)'; X.shadowBlur = 14; X.shadowOffsetY = 5;
        X.beginPath(); X.moveTo(0, 62); X.bezierCurveTo(-14, 40, -30, 26, -30, 0); X.arc(0, 0, 30, Math.PI, 0); X.bezierCurveTo(30, 26, 14, 40, 0, 62); X.closePath(); X.fillStyle = '#ffc84a'; X.fill();
        X.shadowColor = 'transparent'; X.lineWidth = 4; X.strokeStyle = '#fff3d6'; X.stroke();
        X.fillStyle = '#6b3a12'; X.fillRect(-13, -6, 26, 18); X.beginPath(); X.moveTo(-17, -5); X.lineTo(0, -17); X.lineTo(17, -5); X.closePath(); X.fill(); X.fillStyle = '#ffe6a8'; X.fillRect(-4, 2, 8, 10);
        X.restore();
      }
    }

    // --- typography ---
    { const a = U.clamp((t - 4.15) / .3) * (1 - U.prog(t, 5.6, 5.95)); if (a > 0) { const g = X.createLinearGradient(0, 150, 0, 560); g.addColorStop(0, 'rgba(8,12,28,0)'); g.addColorStop(.3, 'rgba(8,12,28,.72)'); g.addColorStop(.7, 'rgba(8,12,28,.6)'); g.addColorStop(1, 'rgba(8,12,28,0)'); X.save(); X.globalAlpha = a; X.fillStyle = g; X.fillRect(0, 150, 1080, 410); X.restore(); } }
    // location tag "Mekke"
    {
      const e = ui.env(t, .12, 4.25, .45, 'pop'); if (e.o > 0) {
        X.save(); X.globalAlpha = e.o; X.translate(540, 300); X.scale(e.s, e.s);
        X.font = ui.font(76, 900, 'Nunito'); if ('letterSpacing' in X) X.letterSpacing = '6px'; const tw = X.measureText('Mekke').width; const W = tw + 150;
        X.fillStyle = 'rgba(14,20,40,.78)'; X.shadowColor = 'rgba(0,0,0,.4)'; X.shadowBlur = 24; X.shadowOffsetY = 8; ui.rrect(-W / 2, -56, W, 112, 56); X.fill(); X.shadowColor = 'transparent';
        const ix = -W / 2 + 62; X.fillStyle = '#ff5a4e'; X.beginPath(); X.moveTo(ix, 26); X.bezierCurveTo(ix - 8, 12, ix - 20, 4, ix - 20, -10); X.arc(ix, -10, 20, Math.PI, 0); X.bezierCurveTo(ix + 20, 4, ix + 8, 12, ix, 26); X.fill(); X.fillStyle = '#fff1e0'; X.beginPath(); X.arc(ix, -10, 7.5, 0, Math.PI * 2); X.fill();
        X.fillStyle = '#fff4dc'; X.textAlign = 'left'; X.textBaseline = 'middle'; X.fillText('Mekke', -W / 2 + 104, 4);
        X.restore();
      }
    }
    // Kâbe label: a thin ring around it (nothing drawn on the Kaaba itself) + leader line + pill
    {
      const K = R.kaaba; const c = new THREE.Vector3(0, K.position.y + 5, 0); const [kx, ky, kz] = ui.project(c); const [ex, ey] = ui.project(new THREE.Vector3(11, K.position.y + 5, 0));
      const e = ui.env(t, .55, 2.5, .45, 'fade');
      if (kz < 1 && e.o > 0) {
        const rr = Math.max(26, Math.hypot(ex - kx, ey - ky)) * (.85 + .15 * U.ease.outBack(e.a)); const p = U.ease.outCubic(U.clamp((t - .55) / .45));
        const ty = Math.max(420, ky - 160), tx = safeX(ui, 'Kâbe', 42, kx + 190, ty - 10) - 20;
        X.save(); X.globalAlpha = e.o; X.lineCap = 'round';
        for (const [w, c2] of [[7, 'rgba(10,14,30,.45)'], [3.5, 'rgba(255,244,220,.95)']]) { X.strokeStyle = c2; X.lineWidth = w;
          X.beginPath(); X.arc(kx, ky, rr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p); X.stroke();
          const sx = kx + rr * .707, sy = ky - rr * .707; X.beginPath(); X.moveTo(sx, sy); X.lineTo(sx + (tx - sx) * p, sy + (ty - sy) * p); X.stroke(); }
        X.restore();
        if (p > .6) ui.pill('Kâbe', { t, t0: .8, t1: 2.5, x: tx + 20, y: ty - 10, size: 42, weight: 800, bg: 'rgba(14,20,40,.82)', color: '#fff4dc' });
      }
    }
    // "müşrikler" label on a red-dot house; kept clear of the Mekke tag (y 244..356)
    let mPos = null;
    if (R.mlabel && t > 2.3) { const [hx, hy] = ui.project(R.mlabel.top); const my = U.clamp(hy - 170, 450, 1250); mPos = [safeX(ui, 'müşrikler', 46, hx - 110, my), my]; ui.callout('müşrikler', { t, t0: 2.42, t1: 4.25, anchor: [hx, hy], to: mPos, size: 46, weight: 900, bg: '#e2463c', color: '#fff4ec', dotColor: '#ff4d43', lineColor: 'rgba(255,240,228,.95)' }); }
    // "emanetler" label riding on a lantern (never on top of the müşrikler pill)
    if (t > 2.95) { const lp = R.lead.pos; const [lx, ly, lz] = ui.project(lp); const ey = U.clamp(ly - 190, 520, 1250); let to = [safeX(ui, 'emanetler', 46, lx + 190, ey), ey];
      if (mPos && t < 4.25 && Math.abs(to[1] - mPos[1]) < 110 && Math.abs(to[0] - mPos[0]) < 360) to[1] = mPos[1] + (to[1] >= mPos[1] ? 115 : -115);
      if (lz < 1) ui.callout('emanetler', { t, t0: 3.02, t1: 4.45, anchor: [lx, ly], to, size: 46, weight: 900, bg: '#f2b84b', color: '#3b2208', dotColor: '#ffd88f', lineColor: 'rgba(255,226,160,.95)' }); }
    // "o kadar kişi" — many houses vs one door
    ui.text('o kadar kişi', { t, t0: 4.28, t1: 5.95, x: 540, y: 330, size: 84, weight: 900, color: '#fff4dc', anim: 'rise', shadowBlur: 22, shadowColor: 'rgba(4,6,18,.9)' });
    ui.text('arasından…', { t, t0: ctx.wordTime('arasından') - .1, t1: 5.95, x: 540, y: 424, size: 64, weight: 800, color: '#ffd27a', anim: 'rise', shadowBlur: 20, shadowColor: 'rgba(4,6,18,.9)' });
  },
};

// pre-rendered overlay sprites (drawn with drawImage: crisp, cheap, identical every frame)
function makeSprites() {
  const mk = (sz, draw) => { const c = document.createElement('canvas'); c.width = c.height = sz; draw(c.getContext('2d'), sz); return c; };
  const red = mk(32, (x, S) => { x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 3; x.shadowOffsetY = 1.5; x.beginPath(); x.arc(S / 2, S / 2, 11, 0, Math.PI * 2); x.fillStyle = '#ff4d43'; x.fill(); x.shadowColor = 'transparent'; x.lineWidth = 2.8; x.strokeStyle = '#fff0e4'; x.stroke(); });
  const dot = mk(32, (x, S) => { x.beginPath(); x.arc(S / 2, S / 2, 9.5, 0, Math.PI * 2); x.fillStyle = 'rgba(40,20,0,.4)'; x.fill(); x.beginPath(); x.arc(S / 2, S / 2, 7, 0, Math.PI * 2); x.fillStyle = '#ffdc96'; x.fill(); });
  return { red, dot };
}

function ui_rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

// keep a pill (centred at x) inside the safe zone x 80..1000, and clear of the Shorts button column (x > 960, y 1000..1700)
function safeX(ui, str, size, x, y) { const X = ui.ctx; X.save(); X.font = ui.font(size, 900, 'Nunito'); const w = X.measureText(str).width + size * .84; X.restore();
  const xmax = (y > 960 && y < 1720 ? 950 : 1000) - w / 2 - 6; return Math.min(Math.max(x, 80 + w / 2 + 6), xmax); }
