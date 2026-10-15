// Shared helpers for group B (s03 desert camps, s04 night map of Mecca, s05 the trust room).
// Everything is procedural and deterministic (pure functions of t). No people.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TEX from './textures.js';
import { rng, clamp, lerp, smoothstep } from './util.js';
import { MAT, rbox } from './models.js';
import { flame, glow, particles, cloudSprite } from './fx.js';

const TAU = Math.PI * 2;
const hash1 = (i, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

// ---------------------------------------------------------------------------------------------
// Woven tent cloth: long hand-woven strips (sewn along the tent's length), weave relief, fibre noise.
// dark=true -> black goat-hair (beit al-sha'ar); false -> undyed wool / camel-hair with brown stripes.
export function tentCloth({ dark = false, seed = 3, size = 512, repeat = [1, 1] } = {}) {
  const n = TEX.fbmField(seed, 4, 4), fib = TEX.fbmField(seed + 5, 48, 2);
  const A = dark ? [.27, .225, .2] : [.83, .73, .58];
  const B = dark ? [.17, .14, .125] : [.66, .54, .40];
  const S = dark ? [.36, .27, .2] : [.42, .29, .18];
  const strips = 6, weave = 150;
  const b = TEX.bake(size, (u, v) => {
    const sv = v * strips, si = Math.floor(sv), sf = sv - si;
    const tone = (hash1(si, seed) - .5) * (dark ? .25 : .12);
    const big = n(u, v) * .5 + .5, f = fib(u, v) * .5 + .5;
    let c = [lerp(A[0], B[0], big * .8 + f * .25), lerp(A[1], B[1], big * .8 + f * .25), lerp(A[2], B[2], big * .8 + f * .25)].map(x => x * (1 + tone));
    // woven pin-stripes inside each strip (lighter camp: brown bands, dark camp: faint brown-grey)
    const st = (Math.abs(sf - .5) > .36 && Math.abs(sf - .5) < .42) || (Math.abs(sf - .5) < .035) ? 1 : 0;
    c = c.map((x, k) => lerp(x, S[k], st * (dark ? .55 : .8)));
    const seam = smoothstep(.035, 0, Math.min(sf, 1 - sf));
    c = c.map(x => x * (1 - seam * .45));
    const wx = Math.sin(u * weave * TAU) * .5 + .5, wy = Math.sin(v * weave * strips / 2 * TAU) * .5 + .5;
    const over = ((Math.floor(u * weave * 2) + Math.floor(v * weave * strips)) & 1) ? wx : wy;
    return { c, h: over * .55 + f * .3 - seam * .4, r: .9 + f * .08 };
  }, { normalStrength: 2.4 });
  const tex = c => TEX.texFromCanvas(c, { repeat });
  return { map: tex(b.colorCanvas), normalMap: TEX.texFromCanvas(b.normalCanvas, { srgb: false, repeat }), roughnessMap: TEX.texFromCanvas(b.roughCanvas, { srgb: false, repeat }) };
}

// decorative woven band (Bedouin sadu style: triangles, diamonds) for the tent's front valance
export function saduBand({ c1 = '#a3241c', c2 = '#efe0c0', c3 = '#1c1614', c4 = '#2f6a46', seed = 1 } = {}) {
  return TEX.drawTexture(512, 64, (x, W, H) => {
    x.fillStyle = c1; x.fillRect(0, 0, W, H);
    x.fillStyle = c3; x.fillRect(0, 0, W, 7); x.fillRect(0, H - 7, W, 7);
    x.fillStyle = c2; x.fillRect(0, 9, W, 4); x.fillRect(0, H - 13, W, 4);
    for (let i = 0; i < 16; i++) { const cx = (i + .5) * W / 16; x.fillStyle = i % 2 ? c2 : c3; x.beginPath(); x.moveTo(cx - 13, H / 2); x.lineTo(cx, 16); x.lineTo(cx + 13, H / 2); x.lineTo(cx, H - 16); x.closePath(); x.fill();
      x.fillStyle = c4; x.beginPath(); x.arc(cx, H / 2, 3.5, 0, TAU); x.fill(); }
    for (let i = 0; i < 32; i++) { const cx = i * W / 32; x.fillStyle = c2; x.beginPath(); x.moveTo(cx, 16); x.lineTo(cx + 4, 21); x.lineTo(cx + 8, 16); x.fill(); x.beginPath(); x.moveTo(cx, H - 16); x.lineTo(cx + 4, H - 21); x.lineTo(cx + 8, H - 16); x.fill(); }
    const r = rng(seed); x.globalAlpha = .12; for (let i = 0; i < 900; i++) { x.fillStyle = r() < .5 ? '#000' : '#fff'; x.fillRect(r() * W, r() * H, 2 + r() * 5, 1); } x.globalAlpha = 1;
  });
}

// kilim-like rug texture
export function rugTex({ a = '#8a2a1e', b = '#22335a', c = '#e2c48a', d = '#3a1810', seed = 2 } = {}) {
  return TEX.drawTexture(256, 512, (x, W, H) => {
    x.fillStyle = a; x.fillRect(0, 0, W, H); x.fillStyle = d; x.fillRect(8, 8, W - 16, H - 16); x.fillStyle = a; x.fillRect(16, 16, W - 32, H - 32);
    for (let k = 0; k < 7; k++) { const y = 40 + k * 66; x.fillStyle = k % 2 ? b : c; x.fillRect(24, y, W - 48, 30);
      x.fillStyle = k % 2 ? c : d; for (let i = 0; i < 6; i++) { const cx = 40 + i * 35; x.beginPath(); x.moveTo(cx - 12, y + 15); x.lineTo(cx, y + 3); x.lineTo(cx + 12, y + 15); x.lineTo(cx, y + 27); x.closePath(); x.fill(); } }
    const r = rng(seed); x.globalAlpha = .14; for (let i = 0; i < 1400; i++) { x.fillStyle = r() < .5 ? '#000' : '#fff'; x.fillRect(r() * W, r() * H, 1, 3 + r() * 4); } x.globalAlpha = 1;
  });
}

// ---------------------------------------------------------------------------------------------
// Rope with catenary sag between a and b (tube); returns a BufferGeometry (merge many of them).
export function ropeGeo(a, b, { sag = .05, r = .01, seg = 14, rad = 5 } = {}) {
  const pts = []; for (let i = 0; i <= seg; i++) { const s = i / seg; const p = new THREE.Vector3().lerpVectors(a, b, s); p.y -= sag * 4 * s * (1 - s) * a.distanceTo(b); pts.push(p); }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rad, false);
}

// ---------------------------------------------------------------------------------------------
// Bedouin "house of hair" tent: three rows of poles (back, ridge, front), cloth tensioned over them so that it peaks at
// every pole and sags in scallops between; fold creases radiate from each pole top; the back and the two ends hang to
// the ground as curtains with vertical folds and a flared hem; the front is open with a woven valance and a rolled
// front curtain; guy ropes with catenary sag run to wooden stakes. Interior: kilim rug + cushions.
// Local frame: length along x, back at -z, open front toward +z. Origin on the ground at the tent centre.
export function bedouinTent(o = {}) {
  const L = o.L ?? 4.2, D = o.D ?? 2.6, hM = o.hM ?? 1.85, hB = o.hB ?? 1.05, hF = o.hF ?? 1.45, n = o.n ?? 4, seed = o.seed ?? 1;
  const R = rng(seed); const G = new THREE.Group();
  const sp = L / (n - 1); const poleX = Array.from({ length: n }, (_, i) => -L / 2 + i * sp + (i > 0 && i < n - 1 ? (R() - .5) * .12 : 0));
  const rows = [[-D / 2, hB], [0, hM], [D / 2, hF]];
  const P = z => { if (z <= 0) { const s = clamp((z + D / 2) / (D / 2)); return lerp(hB, hM, s) - .09 * Math.sin(Math.PI * s); } const s = clamp(z / (D / 2)); return lerp(hM, hF, s) - .11 * Math.sin(Math.PI * s); };
  const sagAmp = z => { const e = Math.min(1, Math.abs(z) / (D / 2)); return (.15 + .1 * e * e) * (o.sag ?? 1); };
  const Sx = x => { // 0 at each pole column, 1 midway (uneven spacing handled per span)
    if (x <= poleX[0] || x >= poleX[n - 1]) return 0;
    let k = 0; while (k < n - 2 && x > poleX[k + 1]) k++; const f = (x - poleX[k]) / (poleX[k + 1] - poleX[k]); return Math.pow(Math.sin(Math.PI * f), 1.15);
  };
  const poleTops = []; poleX.forEach(px => rows.forEach(([pz, ph]) => poleTops.push([px, pz, ph])));
  const roofY = (x, z) => {
    const ex = Math.max(0, Math.abs(x) - L / 2), ez = Math.max(0, Math.abs(z) - D / 2);
    let y = P(clamp(z, -D / 2, D / 2)) - Sx(x) * sagAmp(z) - ex * ex * 9 - ez * .6;
    // radial creases + slight tenting at each pole top
    for (const [px, pz, ph] of poleTops) { const dx = x - px, dz = z - pz; const r2 = dx * dx + dz * dz; if (r2 > 1.6) continue; const r = Math.sqrt(r2); const th = Math.atan2(dz, dx);
      y += .045 * Math.exp(-r2 / .012) + .022 * Math.sin(th * 7 + px * 3 + seed) * Math.exp(-r / .55) * smoothstep(.03, .3, r); }
    // drape wrinkles running down the slopes between pole columns
    const s = Sx(x); y -= s * (.018 * (Math.sin(x * 10.5 + 2.2 * Math.sin(z * 1.6 + seed)) * .5 + .5) + .01 * Math.sin(x * 23 + z * 3 + seed));
    return y;
  };
  G.userData.roofY = roofY;
  const clothMat = o.mat, innerMat = o.innerMat ?? o.mat;
  // ---- roof sheet
  {
    const x0 = -L / 2 - .1, x1 = L / 2 + .1, z0 = -D / 2 - .06, z1 = D / 2 + .07; const NX = o.nx ?? 76, NZ = o.nz ?? 40;
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= NZ; j++) for (let i = 0; i <= NX; i++) { const x = lerp(x0, x1, i / NX), z = lerp(z0, z1, j / NZ); pos.push(x, roofY(x, z), z); uv.push(x / 2.2, (z - z0) / 2.2); }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) { const a = j * (NX + 1) + i, b = a + NX + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, clothMat); m.castShadow = m.receiveShadow = true; G.add(m); G.userData.roof = m;
  }
  // ---- curtains (back wall, two end walls) hanging from the roof edge to the ground
  const curtain = (edge, NU, NV, foldDir, foldF, flare) => {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
      const u = i / NU, v = j / NV; const [ex, ez, along] = edge(u); const top = roofY(ex, ez) - .015; const y = top * (1 - v) + .0 * v;
      const fold = (.03 * Math.sin(along * foldF + seed) + .016 * Math.sin(along * foldF * 2.3 + seed * 2) + .008 * Math.sin(along * 31)) * (.25 + .75 * v);
      const fl = flare * v * v * v + fold;
      pos.push(ex + foldDir[0] * fl, Math.max(.004, y + (v > .97 ? (hash1(i, seed) - .5) * .02 : 0)), ez + foldDir[1] * fl); uv.push(along / 2.2, (1 - v) * top / 2.2);
    }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, innerMat); m.castShadow = m.receiveShadow = true; G.add(m); return m;
  };
  curtain(u => { const x = lerp(-L / 2 - .1, L / 2 + .1, u); return [x, -D / 2 - .06, x]; }, 64, 10, [0, -1], 8.3, .12);
  const zOpen = D / 2 * (o.endOpen ?? .25);
  for (const s of [-1, 1]) curtain(u => { const z = lerp(-D / 2 - .06, zOpen, s > 0 ? u : 1 - u); return [s * (L / 2 + .1), z, z]; }, 26, 10, [s, 0], 9.1, .1);
  // ---- woven valance along the open front edge + red pom-pom tassels
  {
    const NU = 60, NV = 3, pos = [], uv = [], idx = [], H = .17, z = D / 2 + .07;
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = i / NU, v = j / NV; const x = lerp(-L / 2 - .1, L / 2 + .1, u); pos.push(x, roofY(x, z) - v * H - .005, z + .004 + v * .012); uv.push(u * L / 1.2, 1 - v); }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const band = o.band ?? saduBand({ seed }); band.wrapS = THREE.RepeatWrapping;
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: band, roughness: .95, sheen: .8, sheenRoughness: .5, sheenColor: new THREE.Color('#ffd0a8'), side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; G.add(m);
    const tg = []; const tm = new THREE.MeshStandardMaterial({ color: o.tassel ?? '#c8321e', roughness: .9 });
    for (let x = -L / 2; x <= L / 2 + 1e-3; x += .32) { const y = roofY(x, z) - H - .045; const s = new THREE.SphereGeometry(.028, 8, 6); s.scale(1, 1.25, 1); s.translate(x, y, z + .018); tg.push(s); const c = new THREE.CylinderGeometry(.004, .004, .04, 4); c.translate(x, y + .035, z + .017); tg.push(c); }
    const tmesh = new THREE.Mesh(mergeGeometries(tg), tm); tmesh.castShadow = true; G.add(tmesh);
  }
  // ---- rolled front curtain lashed under the front edge (behind the valance)
  {
    const pts = []; for (let i = 0; i <= 30; i++) { const x = lerp(-L / 2 + .05, L / 2 - .05, i / 30); pts.push(new THREE.Vector3(x, roofY(x, D / 2) - .2, D / 2 - .03)); }
    const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, .045, 10, false); const m = new THREE.Mesh(g, innerMat); m.castShadow = true; m.receiveShadow = true; G.add(m);
  }
  // ---- poles (slightly irregular, tops tucked under the cloth)
  const poleMat = o.poleMat;
  { const gs = []; poleX.forEach((px, i) => rows.forEach(([pz], k) => { const h = roofY(px, pz) - .01; const c = new THREE.CylinderGeometry(.022, .03, h, 7); c.translate(0, h / 2, 0); c.rotateZ((R() - .5) * .04); c.rotateX((R() - .5) * .04); c.translate(px, 0, pz); gs.push(c); }));
    const m = new THREE.Mesh(mergeGeometries(gs), poleMat); m.castShadow = true; G.add(m); }
  // ---- guy ropes + stakes
  {
    const rs = [], ss = []; const stake = p => { const c = new THREE.CylinderGeometry(.016, .012, .28, 6); c.translate(0, .1, 0); c.rotateZ((p.x > 0 ? -1 : 1) * .25); c.translate(p.x, 0, p.z); ss.push(c); };
    const add = (a, b, sag) => { rs.push(ropeGeo(a, b, { sag, r: o.ropeR ?? .011 })); stake(b); };
    poleX.forEach((px, i) => {
      if (!(o.skipFront ?? []).includes(i)) add(new THREE.Vector3(px, roofY(px, D / 2 + .07) - .02, D / 2 + .07), new THREE.Vector3(px * 1.06 + (R() - .5) * .15, .02, D / 2 + 1.25 + R() * .2), .035);
      add(new THREE.Vector3(px, roofY(px, -D / 2 - .06) - .02, -D / 2 - .06), new THREE.Vector3(px * 1.05 + (R() - .5) * .15, .02, -D / 2 - 1.05 - R() * .2), .04);
    });
    for (const s of (o.endRopes ?? [-1, 1])) add(new THREE.Vector3(s * (L / 2 + .1), roofY(s * L / 2, 0) - .03, 0), new THREE.Vector3(s * (L / 2 + .85), .02, -.25), .04);
    const rm = new THREE.Mesh(mergeGeometries(rs), o.ropeMat); rm.castShadow = true; G.add(rm);
    const sm = new THREE.Mesh(mergeGeometries(ss), poleMat); sm.castShadow = true; G.add(sm);
  }
  // ---- interior: kilim rug, bolster cushions, a clay jar
  if (o.interior !== false) {
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(L * .86, D * .82).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ map: o.rug ?? rugTex({ seed }), roughness: 1, sheen: .6, sheenColor: new THREE.Color('#ffc8a0') }));
    rug.material.map.rotation = Math.PI / 2; rug.material.map.center.set(.5, .5);
    rug.position.set(0, .012, -.02); rug.receiveShadow = true; G.add(rug);
    const cm = o.cushionMat ?? new THREE.MeshPhysicalMaterial({ color: '#7a2a20', roughness: .95, sheen: 1, sheenColor: new THREE.Color('#ffb088'), sheenRoughness: .5 });
    const cg = []; for (let k = 0; k < Math.max(2, n - 1); k++) { const w = L * .8 / Math.max(2, n - 1) - .06; const c = rbox(w, .24, .3, .1, 3); c.translate(-L * .4 + w / 2 + .03 + k * (w + .06), .13, -D / 2 + .3); cg.push(c); }
    const cmesh = new THREE.Mesh(mergeGeometries(cg), cm); cmesh.castShadow = cmesh.receiveShadow = true; G.add(cmesh);
    const jarM = o.jarMat ?? MAT.clay({ a: '#b8784c', b: '#7c4a2c' });
    const jar = new THREE.Mesh(new THREE.LatheGeometry([[0, 0], [.09, 0], [.15, .1], [.16, .22], [.1, .34], [.06, .37], [.07, .41], [.001, .41]].map(([a, b]) => new THREE.Vector2(Math.max(a, 1e-4), b)), 18), jarM);
    jar.position.set(L / 2 - .35, .01, -D / 2 + .35); jar.castShadow = jar.receiveShadow = true; G.add(jar);
  }
  G.userData.poleX = poleX; G.userData.ridgeTop = new THREE.Vector3(0, hM + .06, 0); G.userData.front = new THREE.Vector3(0, 0, D / 2 + .7);
  return G;
}

// ---------------------------------------------------------------------------------------------
// Camp fire: stone ring, ash bed, crossed logs with glowing ends, layered flames, embers, smoke, flickering light.
export function campfire(o = {}) {
  const G = new THREE.Group(); const s = o.scale ?? 1, seed = o.seed ?? 1; const R = rng(seed);
  const rockGeo = new THREE.IcosahedronGeometry(1, 2); { const p = rockGeo.attributes.position; for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(p, i); const d = 1 + .15 * Math.sin(v.x * 3.1 + v.y * 2.3 + seed) + .1 * Math.sin(v.z * 4.7 - v.x * 1.7); v.multiplyScalar(d); v.y *= .7; p.setXYZ(i, v.x, v.y, v.z); } rockGeo.computeVertexNormals(); }
  const st = new THREE.InstancedMesh(rockGeo, o.stoneMat ?? MAT.stone({ a: '#8a7a6a', b: '#4a4038', seed: 9 }), 11); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let i = 0; i < 11; i++) { const a = i / 11 * TAU + R() * .2; const sc = (.11 + R() * .05) * s; m4.compose(new THREE.Vector3(Math.cos(a) * .44 * s, sc * .35, Math.sin(a) * .44 * s), q.setFromEuler(e.set(R() * .4, R() * 6, R() * .4)), new THREE.Vector3(sc, sc, sc)); st.setMatrixAt(i, m4); }
  st.castShadow = st.receiveShadow = true; G.add(st);
  const ash = new THREE.Mesh(new THREE.CircleGeometry(.38 * s, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#2a201c', roughness: 1, emissive: '#ff4a10', emissiveIntensity: .25 })); ash.position.y = .008; ash.receiveShadow = true; G.add(ash);
  const logMat = new THREE.MeshStandardMaterial({ color: '#3a2416', roughness: 1, emissive: '#ff5212', emissiveIntensity: .45, emissiveMap: TEX.drawTexture(16, 128, (x, W, H) => { const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#ffffff'); g.addColorStop(.15, '#ffffff'); g.addColorStop(.38, '#000'); g.addColorStop(1, '#000'); x.fillStyle = g; x.fillRect(0, 0, W, H); }) });
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(.04 * s, .05 * s, .62 * s, 8), logMat); const a = i / 5 * TAU + .3; l.rotation.set(0, 0, 0); l.position.set(Math.cos(a) * .17 * s, .12 * s, Math.sin(a) * .17 * s); l.lookAt(0, .42 * s, 0); l.rotateX(Math.PI / 2); l.castShadow = true; G.add(l); }
  const fl = []; [[.2, .42, 0, 0], [.14, .3, .1, .07], [.15, .28, -.1, -.05], [.11, .23, .05, -.12], [.1, .2, -.06, .11]].forEach(([w, h, ox, oz], i) => { const f = flame({ height: h * s, width: w * s, seed: i * 3 + seed, intensity: o.flameI ?? 2.1, core: '#ffe2a0', mid: '#ff9a30', edge: '#e2400e' }); f.position.set(ox * s, .06 * s, oz * s); G.add(f); fl.push(f); });
  const gl = glow({ size: 1.7 * s, opacity: .26, color: '#ff8a3a' }); gl.position.y = .4 * s; G.add(gl);
  const gl2 = glow({ size: .6 * s, opacity: .28, color: '#ffb060' }); gl2.position.y = .25 * s; G.add(gl2);
  G.add(particles({ count: 46, center: [0, 1.1 * s, 0], box: [.7 * s, 2.2 * s, .7 * s], size: 2.2, color: '#ffb060', opacity: .95, drift: [.06, .6, 0], swirl: .14, seed: seed + 3 }));
  if (o.smoke !== false) G.add(smoke({ seed, scale: s, count: 9, color: o.smokeColor ?? '#6a5a66' }));
  const L = new THREE.PointLight(o.color ?? '#ff9a48', o.intensity ?? 10, o.distance ?? 11, 2); L.position.y = .55 * s; L.userData.baseIntensity = L.intensity; G.add(L);
  G.userData.light = L; G.userData.glow = gl;
  return G;
}

// soft rising smoke column (sprites, pure function of t)
export function smoke(o = {}) {
  const G = new THREE.Group(); const R = rng(o.seed ?? 5); const n = o.count ?? 8, s = o.scale ?? 1; const items = [];
  for (let i = 0; i < n; i++) { const m = new THREE.SpriteMaterial({ map: cloudSprite(), color: new THREE.Color(o.color ?? '#6a5a66'), transparent: true, opacity: 0, depthWrite: false, rotation: R() * 6.28 }); const sp = new THREE.Sprite(m); sp.userData.noDepth = true; sp.renderOrder = 9; G.add(sp); items.push({ sp, ph: i / n + R() * .05, rot: (R() - .5) * .6, dx: (R() - .5) * .3 }); }
  const life = o.life ?? 4.2, rise = o.rise ?? 3.2, op = o.opacity ?? .16;
  G.userData.update = t => { items.forEach(it => { const k = ((t / life + it.ph) % 1 + 1) % 1; it.sp.position.set((it.dx + k * k * .9) * s, (.5 + k * rise) * s, -k * .25 * s); it.sp.scale.setScalar((.35 + k * 1.6) * s); it.sp.material.opacity = op * Math.sin(Math.PI * Math.min(1, k * 1.25)) * (1 - k * .35); it.sp.material.rotation = it.rot * t + it.ph * 6; }); };
  return G;
}

// ---------------------------------------------------------------------------------------------
// Hand-trowelled lime/mud plaster for close-up interiors: large tonal clouds, trowel sweeps, fine grit, hairline cracks.
export function plasterWall({ a = '#ead2ae', b = '#c49c74', seed = 8, size = 1024, repeat = [1, 1], crack = .6 } = {}) {
  const big = TEX.fbmField(seed, 3, 5), mid = TEX.fbmField(seed + 3, 10, 3), grit = TEX.fbmField(seed + 7, 160, 2), cr = TEX.fbmField(seed + 11, 6, 4);
  const A = new THREE.Color(a), B = new THREE.Color(b);
  const bk = TEX.bake(size, (u, v) => {
    const g = big(u, v) * .5 + .5, m = mid(u, v), gr = grit(u, v) * .5 + .5;
    // trowel sweeps: arcs of slightly smoother/brighter plaster
    const sw = Math.sin((u * 7 + Math.sin(v * 9 + m * 2) * .35) * Math.PI * 2) * .5 + .5; const sweep = Math.pow(sw, 6) * .5;
    // hairline cracks along ridges of a low-frequency noise
    const c = Math.abs(cr(u, v)); const line = crack * smoothstep(.022, .0, c) * smoothstep(.15, .45, g);
    const t = clamp(g * .75 + m * .18 + (gr - .5) * .25 - sweep * .2);
    const col = [lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t)].map(x => x * (1 - line * .35) * (.97 + gr * .06));
    return { c: col, h: g * .25 + m * .2 + gr * .35 + sweep * .25 - line * .6, r: .88 + gr * .1 - sweep * .12 };
  }, { normalStrength: 3.2 });
  return { map: TEX.texFromCanvas(bk.colorCanvas, { repeat }), normalMap: TEX.texFromCanvas(bk.normalCanvas, { srgb: false, repeat }), roughnessMap: TEX.texFromCanvas(bk.roughCanvas, { srgb: false, repeat }) };
}
