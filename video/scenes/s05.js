// s05 (25.25–29.75) "…Peygamberimiz ﷺ'a emanet ederlerdi."
// Visual: inside the modest house the lights converged to in s04 (same open door, lantern lights waiting in the moonlit
// alley outside). Warm oil-lamp light, plaster walls, a wall niche with wooden shelves and a mat-covered bench.
// The entrusted items arrive one by one on the beat and settle with squash-and-stretch + a dust puff: leather pouches
// tied with cord, wooden chests with brass bands, a sealed clay jar, a folded fine textile, a sheathed dagger, a small
// jewellery box, a parchment with a wax seal — each with a small parchment tag sealed with red wax (the red dots of s04).
// Typography: "el-Emîn" + pill "Mekkeliler O'na “el-Emîn” (güvenilir) derdi". No person.
import * as THREE from 'three';

let R = {};

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
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o; };

// ---------- the entrusted items (origin = bottom centre, front = +z) ----------
function tag(M, mats, seed) {
  // small parchment tag on a short cord, sealed with a dab of red wax; pivot at the tie point
  const piv = new THREE.Group();
  const cord = mesh(new THREE.CylinderGeometry(.0016, .0016, .05, 6), mats.cord, 0, -.025, 0); piv.add(cord);
  const card = mesh(M.rbox(.056, .036, .003, .006, 1), mats.tag, 0, -.066, 0); card.rotation.z = (seed % 2 ? 1 : -1) * .12; piv.add(card);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(.0105, .0115, .004, 14), mats.wax); wax.rotation.x = Math.PI / 2; wax.position.set(.008 * (seed % 2 ? -1 : 1), -.066, .003); wax.castShadow = true; piv.add(wax);
  const hole = new THREE.Mesh(new THREE.TorusGeometry(.004, .0012, 6, 12), mats.cord); hole.position.set(0, -.05, .002); piv.add(hole);
  return piv;
}
function deformLumpy(geo, amt, seed) { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const f = 1 + amt * (Math.sin(a * 3 + seed) * .6 + Math.sin(a * 5 + y * 40 + seed * 2) * .4); p.setX(i, x * f); p.setZ(i, z * f); } geo.computeVertexNormals(); return geo; }
function pouch(M, mats, o) {
  const g = new THREE.Group(); const h = o.h, r = o.r;
  const prof = [[0, 0], [r * .55, 0], [r * .92, h * .1], [r, h * .3], [r * .95, h * .5], [r * .7, h * .64], [r * .36, h * .74], [r * .3, h * .79], [r * .38, h * .84], [r * .6, h * .92], [r * .66, h * .98], [r * .5, h], [0, h * .9]];
  const geo = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(Math.max(a, 1e-4), b)), 48);
  { const p = geo.attributes.position, sd = o.seed; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x), v = y / h;
      let f = 1 + .07 * Math.sin(a * 3 + sd) + .04 * Math.sin(a * 5 + sd * 2 + v * 6);
      const pleat = (v > .5 ? Math.min(1, (v - .5) / .2) : 0) * (v < .95 ? 1 : 0); f += pleat * .13 * Math.sin(a * 11 + sd);
      const sag = v < .35 ? (1 + .06 * (1 - v / .35)) : 1; f *= sag;
      p.setX(i, x * f); p.setZ(i, z * f); if (v > .86) p.setY(i, y + h * .035 * Math.sin(a * 7 + sd) * (v - .86) / .14); }
    geo.computeVertexNormals(); }
  const body = mesh(geo, o.mat); body.scale.set(1.08, 1, .9); g.add(body);
  const tie = mesh(new THREE.TorusGeometry(r * .36, .0075, 8, 28), mats.cord, 0, h * .79, 0); tie.rotation.x = Math.PI / 2; tie.scale.z = .9; g.add(tie);
  for (const s of [-1, 1]) { const tail = mesh(new THREE.CapsuleGeometry(.004, .05, 4, 6), mats.cord, s * .012 + r * .25, h * .72, r * .2); tail.rotation.z = s * .5; g.add(tail); }
  const tg = tag(M, mats, o.seed); tg.position.set(.0, h * .79, r * .36); tg.userData.rx0 = -.95; g.add(tg); g.userData.tag = tg;
  return g;
}
function chest(M, mats, o) {
  const g = new THREE.Group(); const w = o.w, h = o.h, d = o.d; const hb = h * .66;
  g.add(mesh(M.rbox(w, hb, d, .014, 2), o.wood, 0, hb / 2, 0));
  const lid = mesh(new THREE.CylinderGeometry(d / 2 + .004, d / 2 + .004, w + .006, 26, 1, false, 0, Math.PI), o.wood, 0, hb, 0); lid.rotation.z = Math.PI / 2; lid.scale.set((h - hb) / (d / 2), 1, 1); g.add(lid);
  const lidSide = (s) => { const c = mesh(new THREE.CircleGeometry(d / 2 + .004, 26, 0, Math.PI), o.wood, s * (w / 2 + .003), hb, 0); c.rotation.y = s * Math.PI / 2; c.scale.y = (h - hb) / (d / 2); return c; };
  g.add(lidSide(1), lidSide(-1));
  // brass straps wrapping body + lid, corner plates, lock plate with hasp
  for (const x of [-w * .3, w * .3]) {
    g.add(mesh(M.rbox(.022, hb + .004, d + .006, .003, 1), mats.brass, x, hb / 2, 0));
    const st = mesh(new THREE.TorusGeometry(d / 2 + .006, .0035, 6, 24, Math.PI), mats.brass, x, hb, 0); st.rotation.y = Math.PI / 2; st.scale.y = (h - hb) / (d / 2); st.scale.x = 1; g.add(st);
  }
  g.add(mesh(M.rbox(.05, .055, .008, .004, 1), mats.brass, 0, hb - .02, d / 2 + .003));
  const hasp = mesh(new THREE.TorusGeometry(.011, .0028, 6, 14), mats.brass, 0, hb - .045, d / 2 + .009); g.add(hasp);
  const tg = tag(M, mats, o.seed); tg.position.set(0, hb - .056, d / 2 + .012); g.add(tg); g.userData.tag = tg;
  return g;
}
function jar(M, mats, o) {
  const g = new THREE.Group(); const H = o.h, Rr = o.r;
  const prof = [[0, 0], [Rr * .5, 0], [Rr * .62, H * .03], [Rr * .92, H * .25], [Rr, H * .45], [Rr * .86, H * .66], [Rr * .52, H * .8], [Rr * .38, H * .86], [Rr * .42, H * .92], [Rr * .45, H * .95], [Rr * .3, H * .96], [0, H * .955]];
  const sp = new THREE.SplineCurve(prof.map(([a, b]) => new THREE.Vector2(a, b))).getPoints(60).map(v => new THREE.Vector2(Math.max(v.x, 1e-4), v.y));
  const geo = new THREE.LatheGeometry(sp, 48); deformLumpy(geo, .008, 4);
  g.add(mesh(geo, o.clay));
  // mouth sealed with a cloth cap tied with cord + a stamped clay/wax seal
  const cap = mesh(new THREE.SphereGeometry(Rr * .5, 24, 10, 0, Math.PI * 2, 0, Math.PI * .55), o.cloth, 0, H * .9, 0); cap.scale.y = .55; g.add(cap);
  const skirt = mesh(new THREE.CylinderGeometry(Rr * .47, Rr * .52, H * .08, 24, 1, true), o.cloth, 0, H * .88, 0); g.add(skirt);
  const tie = mesh(new THREE.TorusGeometry(Rr * .44, .006, 8, 28), mats.cord, 0, H * .87, 0); tie.rotation.x = Math.PI / 2; g.add(tie);
  const seal = mesh(new THREE.CylinderGeometry(.03, .033, .012, 16), mats.wax, 0, H * .995, 0); g.add(seal);
  const tg = tag(M, mats, 3); tg.position.set(0, H * .87, Rr * .45); g.add(tg); g.userData.tag = tg;
  return g;
}
function textile(M, mats, o) {
  const g = new THREE.Group(); const w = o.w, d = o.d; let y = 0;
  [[.0, 0, .028], [.012, -.008, .026], [-.006, .006, .024]].forEach(([dx, dz, th], i) => {
    const m = mesh(M.rbox(w - i * .01, th, d - i * .012, th * .45, 2), o.mat, dx, y + th / 2, dz); m.rotation.y = (i - 1) * .025; g.add(m); y += th - .002;
  });
  const tg = tag(M, mats, 6); tg.position.set(w * .3, y - .004, d / 2 - .02); tg.rotation.x = -1.35; g.add(tg); g.userData.tagFlat = true; g.userData.top = y;
  return g;
}
function dagger(M, mats, o) {
  const g = new THREE.Group(); const inner = new THREE.Group(); g.add(inner); inner.rotation.x = -Math.PI / 2; // lie flat; length along -z->+z local y
  const L = o.len; const s = new THREE.Shape(); s.moveTo(-.018, 0); s.quadraticCurveTo(-.02, L * .5, -.01, L * .92); s.quadraticCurveTo(0, L * 1.0, .008, L * .93); s.quadraticCurveTo(.022, L * .5, .018, 0); s.closePath();
  const sg = new THREE.ExtrudeGeometry(s, { depth: .014, bevelEnabled: true, bevelThickness: .006, bevelSize: .005, bevelSegments: 3, curveSegments: 16 }); sg.translate(0, 0, -.007);
  const sheath = mesh(sg, o.leather); inner.add(sheath);
  const chape = mesh(new THREE.ConeGeometry(.013, .05, 12), mats.brass, .0, L * .93, 0); inner.add(chape);
  const locket = mesh(M.rbox(.05, .03, .03, .006, 1), mats.brass, 0, .012, 0); inner.add(locket);
  const guard = mesh(M.rbox(.075, .016, .026, .006, 1), mats.brass, 0, -.008, 0); inner.add(guard);
  const grip = mesh(new THREE.CylinderGeometry(.012, .014, .1, 12), o.wood, 0, -.066, 0); inner.add(grip);
  for (const y of [-.035, -.07, -.1]) inner.add(mesh(new THREE.TorusGeometry(.0135, .0025, 6, 14), mats.brass, 0, y, 0));
  inner.children.slice(-3).forEach(c => (c.rotation.x = Math.PI / 2));
  const pom = mesh(new THREE.SphereGeometry(.019, 14, 10), mats.brass, 0, -.125, 0); inner.add(pom);
  inner.position.y = .022;
  const tg = tag(M, mats, 7); tg.position.set(.02, .03, .05); tg.rotation.x = -1.4; tg.rotation.z = -.4; g.add(tg); g.userData.tagFlat = true;
  return g;
}
function jewelBox(M, mats, o, TEX) {
  const g = new THREE.Group(); const w = o.w, h = o.h, d = o.d;
  g.add(mesh(M.rbox(w, h * .68, d, .01, 2), o.wood, 0, h * .34, 0));
  g.add(mesh(M.rbox(w + .008, h * .32, d + .008, .012, 2), o.wood, 0, h * .68 + h * .16, 0));
  const inlay = TEX.drawTexture(256, 192, (x, W, H) => {
    x.clearRect(0, 0, W, H); x.strokeStyle = '#efe0bf'; x.fillStyle = '#efe0bf'; x.lineWidth = 6; x.strokeRect(14, 14, W - 28, H - 28); x.lineWidth = 3; x.strokeRect(26, 26, W - 52, H - 52);
    x.save(); x.translate(W / 2, H / 2); for (let k = 0; k < 2; k++) { x.save(); x.rotate(k * Math.PI / 4); x.strokeRect(-30, -30, 60, 60); x.restore(); } x.beginPath(); x.arc(0, 0, 11, 0, Math.PI * 2); x.fill(); x.restore();
    for (const [cx, cy] of [[40, 40], [W - 40, 40], [40, H - 40], [W - 40, H - 40]]) { x.beginPath(); x.arc(cx, cy, 6, 0, Math.PI * 2); x.fill(); }
  });
  const top = new THREE.Mesh(new THREE.PlaneGeometry(w * .9, d * .9), new THREE.MeshPhysicalMaterial({ map: inlay, transparent: true, roughness: .35, clearcoat: .6, iridescence: .3 })); top.rotation.x = -Math.PI / 2; top.position.y = h + .0015; g.add(top);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w * .82, h * .5), new THREE.MeshPhysicalMaterial({ map: inlay, transparent: true, roughness: .3, clearcoat: .7, iridescence: .4 })); front.position.set(0, h * .34, d / 2 + .0015); g.add(front);
  const lidF = new THREE.Mesh(new THREE.PlaneGeometry(w * .82, h * .2), new THREE.MeshPhysicalMaterial({ map: inlay, transparent: true, roughness: .3, clearcoat: .7 })); lidF.position.set(0, h * .84, d / 2 + .0055); g.add(lidF);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(M.rbox(.022, h * .96, .022, .004, 1), mats.brass, sx * (w / 2 - .006), h * .49, sz * (d / 2 - .006)));
  g.add(mesh(M.rbox(.026, .03, .006, .003, 1), mats.brass, 0, h * .68, d / 2 + .004));
  const tg = tag(M, mats, 9); tg.position.set(0, h * .62, d / 2 + .008); g.add(tg); g.userData.tag = tg;
  return g;
}
function scroll(M, mats, o, TEX) {
  const g = new THREE.Group(); const L = o.len, r = o.r;
  const pm = M.MAT.parchment({ a: '#f2dfb6', b: '#cfae7c' });
  const roll = mesh(new THREE.CylinderGeometry(r, r, L, 28), pm, 0, r, 0); roll.rotation.z = Math.PI / 2; g.add(roll);
  const endTex = TEX.drawTexture(128, 128, (x, W, H) => { x.fillStyle = '#ead3a6'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(120,80,40,.55)'; x.lineWidth = 3; x.beginPath(); for (let a = 0; a < Math.PI * 9; a += .1) { const rr = 6 + a * 2.0; x.lineTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); } x.stroke(); });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r * .995, 28), new THREE.MeshStandardMaterial({ map: endTex, roughness: .9 })); c.position.set(s * (L / 2 + .0005), r, 0); c.rotation.y = s * Math.PI / 2; g.add(c); }
  // outer flap edge + red cord + wax seal
  const flap = mesh(new THREE.BoxGeometry(L * .98, .0025, r * 1.1), pm, 0, r * .2, r * .9); flap.rotation.x = .3; g.add(flap);
  const cord = mesh(new THREE.TorusGeometry(r + .003, .0032, 6, 26), mats.redCord, -L * .08, r, 0); cord.rotation.y = Math.PI / 2; g.add(cord);
  const sealG = new THREE.CylinderGeometry(.024, .026, .005, 20); { const p = sealG.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const f = 1 + .08 * Math.sin(a * 5) + .05 * Math.sin(a * 9); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); } sealG.computeVertexNormals(); }
  const seal = mesh(sealG, mats.wax, -L * .08, r * .85, r + .002); seal.rotation.x = Math.PI / 2; g.add(seal);
  const tg = tag(M, mats, 11); tg.position.set(L * .3, r * 1.4, r * .8); tg.rotation.x = -1.2; g.add(tg); g.userData.tagFlat = true;
  return g;
}

export default {
  post: {
    exposure: 1.05,
    toneMapping: 'agx',
    bloom: { enabled: true, strength: 0.4, radius: 0.55, threshold: 0.9 },
    grade: { contrast: 1.13, saturation: 1.12, warmth: 0.0, lift: [0.02, 0.02, 0.035], gain: [1.0, 0.99, 0.97] },
    vignette: 0.5, grain: 0.03,
    dof: { enabled: true, focus: 4.4, range: 1.6, amount: 0.75 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx;
    R = {};
    scene.background = new THREE.Color('#0d1226');
    scene.fog = new THREE.Fog('#1a1a2a', 8, 26);
    scene.environment = await ctx.loadHDR('satara_night_no_lamps'); scene.environmentIntensity = 0.45;

    const mats = {
      cord: new THREE.MeshStandardMaterial({ color: '#c9a36c', roughness: .85 }),
      redCord: new THREE.MeshStandardMaterial({ color: '#8f2a20', roughness: .8 }),
      tag: M.MAT.parchment({ a: '#f4e2bb', b: '#dcc193' }),
      wax: new THREE.MeshPhysicalMaterial({ color: '#c2271e', roughness: .32, clearcoat: .7, clearcoatRoughness: .25, sheen: .2 }),
      brass: M.MAT.brass(),
    };
    R.mats = mats;
    // ---------------- room ----------------
    const wall = M.MAT.plaster({ a: '#ecd8b8', b: '#c9a984', seed: 8, repeat: [2, 2] });
    const wallDark = M.MAT.plaster({ a: '#dcc39e', b: '#b08d68', seed: 14, repeat: [2, 2] });
    const room = new THREE.Group(); scene.add(room); R.room = room;
    const T = .42, RH = 3.1; // back wall thickness / room height
    const WB = (x0, x1, y0, y1, z0 = -T, z1 = 0, m = wall, r = .03) => room.add(mesh(M.rbox(x1 - x0, y1 - y0, z1 - z0, r, 2), m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
    // wall niche (recess) with two shelf rows ; the doorway to the right
    const NX0 = -1.27, NX1 = .06, NY0 = 1.2, NY1 = 2.3, ND = .31, DX0 = .52, DX1 = 1.42, DY = 2.1;
    const outline = () => { const sh = new THREE.Shape(); sh.moveTo(-2.6, 0); sh.lineTo(DX0, 0); sh.lineTo(DX0, DY); sh.lineTo(DX1, DY); sh.lineTo(DX1, 0); sh.lineTo(2.6, 0); sh.lineTo(2.6, RH); sh.lineTo(-2.6, RH); sh.closePath(); return sh; };
    { const sh = outline(); const hole = new THREE.Path(); hole.moveTo(NX0, NY0); hole.lineTo(NX0, NY1); hole.lineTo(NX1, NY1); hole.lineTo(NX1, NY0); hole.closePath(); sh.holes.push(hole);
      const bt = .035; const g = new THREE.ExtrudeGeometry(sh, { depth: ND - bt * 2, bevelEnabled: true, bevelThickness: bt, bevelSize: .03, bevelSegments: 4, curveSegments: 4 }); g.translate(0, 0, -ND + bt);
      room.add(mesh(g, wall)); }
    { const g = new THREE.ExtrudeGeometry(outline(), { depth: T - ND, bevelEnabled: false }); g.translate(0, 0, -T); room.add(mesh(g, wallDark)); }
    room.add(mesh(M.rbox(T, RH, 5.5, .03, 2), wallDark, -2.6, RH / 2, 2.6));
    room.add(mesh(M.rbox(T, RH, 5.5, .03, 2), wallDark, 2.6, RH / 2, 2.6));
    const floorM = M.MAT.plaster({ a: '#a08262', b: '#766046', seed: 22, repeat: [3, 3] });
    const floor = mesh(new THREE.PlaneGeometry(5.4, 6).rotateX(-Math.PI / 2), floorM, 0, 0, 2.7); floor.castShadow = false; room.add(floor);
    const beamT = TEX.drawTexture(64, 512, (x, W, H) => { x.fillStyle = '#6a4a30'; x.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 10) { x.fillStyle = `rgba(40,25,12,${.25 + (y % 30 ? 0 : .2)})`; x.fillRect(0, y, W, 3); } });
    const beamM = new THREE.MeshStandardMaterial({ map: beamT, roughness: .95 });
    for (let k = 0; k < 7; k++) { const b = mesh(new THREE.CylinderGeometry(.09, .1, 5.6, 12), beamM, -2.4 + k * .8, RH + .02, 2.6); b.rotation.x = Math.PI / 2; b.rotation.z = (k % 2 ? .02 : -.02); room.add(b); }
    const reed = TEX.fabric({ a: '#a88a5c', b: '#7a6040', weave: 90 });
    room.add(mesh(new THREE.PlaneGeometry(5.4, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: reed.map, normalMap: reed.normalMap, roughness: 1 }), 0, RH + .1, 2.7));
    const wood = M.MAT.wood({ a: '#a06c3c', b: '#64401f', rings: 18, seed: 31 });
    const darkWood = M.MAT.darkWood({ rings: 26, seed: 17 });
    const SH0 = NY0 + .02, SH1 = 1.7;
    room.add(mesh(M.rbox(NX1 - NX0 + .08, .045, ND + .07, .014, 2), wood, (NX0 + NX1) / 2, NY0 - .0025, -ND / 2 + .035));
    room.add(mesh(M.rbox(NX1 - NX0 - .004, .045, ND + .05, .014, 2), wood, (NX0 + NX1) / 2, SH1 - .0225, -ND / 2 + .025));
    room.add(mesh(M.rbox(NX1 - NX0 + .34, .14, .16, .03, 2), wood, (NX0 + NX1) / 2, NY1 + .075, .03)); // lintel
    for (const x of [NX0 + .03, NX1 - .03]) room.add(mesh(M.rbox(.05, .05, .05, .01, 1), darkWood, x, SH1 - .07, -.03)); // shelf pegs
    const benchX0 = -1.6, benchX1 = .3, BH = .44;
    room.add(mesh(M.rbox(benchX1 - benchX0, BH, .62, .06, 3), wallDark, (benchX0 + benchX1) / 2, BH / 2, .31));
    const matT = TEX.drawTexture(512, 256, (x, W, H) => {
      x.fillStyle = '#7d2b1f'; x.fillRect(0, 0, W, H); x.fillStyle = '#d8a955'; x.fillRect(10, 10, W - 20, H - 20); x.fillStyle = '#7d2b1f'; x.fillRect(20, 20, W - 40, H - 40); x.fillStyle = '#23365c'; x.fillRect(34, 34, W - 68, H - 68);
      x.fillStyle = '#d8a955'; for (let i = 0; i < 12; i++) { x.save(); x.translate(60 + i * 36, H / 2); x.rotate(Math.PI / 4); x.fillRect(-9, -9, 18, 18); x.restore(); }
      x.strokeStyle = '#b84a34'; x.lineWidth = 6; for (const y of [60, H - 60]) { x.beginPath(); for (let i = 0; i <= 30; i++) x.lineTo(40 + i * 15.4, y + (i % 2 ? 10 : -10)); x.stroke(); }
    });
    room.add(mesh(M.rbox(benchX1 - benchX0 - .1, .016, .6, .007, 1), new THREE.MeshPhysicalMaterial({ map: matT, roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffb98a'), sheenRoughness: .5 }), (benchX0 + benchX1) / 2, BH + .008, .31));
    const hasir = TEX.fabric({ a: '#c8a466', b: '#9a7a44', weave: 60 });
    const fmat = mesh(M.rbox(2.6, .012, 1.6, .005, 1), new THREE.MeshStandardMaterial({ map: hasir.map, normalMap: hasir.normalMap, roughness: 1 }), -.35, .006, 1.55); fmat.castShadow = false; room.add(fmat);
    // the open door leaf (planks + iron straps) swung inward; wooden lintel + stone threshold
    const leaf = new THREE.Group(); leaf.position.set(DX1 - .02, 0, .02); leaf.rotation.y = 1.95; room.add(leaf);
    for (let k = 0; k < 5; k++) leaf.add(mesh(M.rbox(.175, DY - .06, .05, .012, 1), darkWood, -.09 - k * .176, DY / 2, 0));
    const stud = new THREE.MeshStandardMaterial({ color: '#2c2724', metalness: .8, roughness: .45 });
    for (const y of [.35, 1.05, 1.75]) leaf.add(mesh(M.rbox(.86, .05, .012, .004, 1), stud, -.45, y, .032));
    room.add(mesh(M.rbox(DX1 - DX0 + .3, .16, .5, .03, 2), darkWood, (DX0 + DX1) / 2, DY + .08, -.18));
    room.add(mesh(M.rbox(DX1 - DX0 + .2, .06, .5, .02, 1), M.MAT.stone({ a: '#b9ab95', b: '#8f8270' }), (DX0 + DX1) / 2, .03, -.2));
    // clay oil lamp on a turned wooden lamp stand in front-right of the niche: the key light (soft shadows)
    const stand = new THREE.Group(); stand.position.set(.34, 0, .62); room.add(stand);
    const standWood = M.MAT.wood({ a: '#b07a46', b: '#6c4524', rings: 10, seed: 44 });
    stand.add(M.lathe([[0, 0], [.17, 0], [.18, .03], [.13, .06], [.07, .09], [.05, .13], [.06, .2], [.04, .3], [.045, .55], [.06, .6], [.045, .65], [.04, .95], [.055, 1.0], [.04, 1.05], [.038, 1.36], [.05, 1.4], [.13, 1.43], [.14, 1.46], [.12, 1.48], [0, 1.48]], standWood, 28));
    const lamp = M.oilLamp({ scale: 1.35, light: false, seed: 4 }); lamp.position.set(-.01, 1.48, 0); lamp.rotation.y = Math.PI * .78; stand.add(lamp); R.lamp = lamp;
    lamp.userData.glow.material.opacity = .14; lamp.userData.glow.scale.setScalar(.22); lamp.userData.flame.userData.uniforms.intensity.value = 2.6;
    room.updateMatrixWorld(true); const flameW = new THREE.Vector3(); lamp.userData.flame.getWorldPosition(flameW); R.flameW = flameW;
    const key = new THREE.PointLight('#ffc082', 3.6, 9, 2); key.position.copy(flameW).add(new THREE.Vector3(0, .07, 0));
    key.castShadow = true; key.shadow.mapSize.set(512, 512); key.shadow.bias = -.002; key.shadow.radius = 7; key.shadow.camera.near = .04; scene.add(key); R.key = key;
    const fill = new THREE.PointLight('#ffa060', 2.6, 7, 2); fill.position.set(-1.9, .7, 2.6); room.add(fill); R.fill = fill; // a second lamp on the floor, out of frame
    scene.add(new THREE.HemisphereLight('#6a7ab0', '#3a2616', .3));
    const moonL = new THREE.SpotLight('#7f9cff', 7, 9, .55, 1, 1.5); moonL.position.set(-2.3, 2.9, 1.8); moonL.target.position.set(-1.0, 1.3, -.1); room.add(moonL, moonL.target); // moonlight from a small window in the left wall (off-screen)
    const moonS = new THREE.SpotLight('#8eaaff', 16, 14, .5, .7, 1.4); moonS.position.set(1.9, 3.9, -3.4); moonS.target.position.set(.6, 0, 1.2); room.add(moonS, moonS.target);

    // ---------------- outside the door: the moonlit alley + the lantern lights from s04 ----------------
    const out = new THREE.Group(); scene.add(out);
    out.add(mesh(new THREE.PlaneGeometry(14, 10).rotateX(-Math.PI / 2), M.MAT.sand({ a: '#a59684', b: '#857868', repeat: [4, 3] }), 0, -.01, -5.2));
    const opp = M.MAT.plaster({ a: '#cdb08c', b: '#9c7c5e', seed: 3, repeat: [2, 1] });
    out.add(mesh(M.rbox(9, 3.6, .6, .1, 2), opp, .6, 1.8, -5.4));
    out.add(mesh(M.rbox(.3, .28, .8, .08, 1), darkWood, -.4, 3.4, -4.9)); // waterspout on the opposite house
    out.add(mesh(M.rbox(1.0, 1.9, .2, .05, 1), darkWood, 2.2, .95, -5.05));
    const sky = ENV.skyDome({ top: '#060b1e', mid: '#12224a', horizon: '#33406a', bottom: '#141a2c', sunDir: [.3, .5, -1], sunColor: '#e9efff', sunSize: 0, sunGlow: .3, stars: .8, clouds: 0, intensity: 1 }); scene.add(sky);
    const outMoon = new THREE.SpotLight('#8eaaff', 26, 30, .42, .5, 1.2); outMoon.position.set(-1.5, 7.5, 1.0); outMoon.target.position.set(1, .5, -4.6); scene.add(outMoon, outMoon.target);
    // waiting lanterns (warm light points + their light pools on the ground and wall)
    R.lanterns = [[.78, 1.3, -2.2, 0], [1.2, 1.24, -3.5, 1.3], [.48, 1.2, -4.3, 2.2], [1.6, 1.32, -2.7, 3.1]].map(([x, y, z, ph]) => {
      const gl = FX.glow({ size: .95, opacity: 1, color: '#ffa850' }); gl.position.set(x, y, z); out.add(gl);
      const core = FX.glow({ size: .16, opacity: 1, color: '#fff0c8' }); core.position.set(x, y, z); out.add(core);
      return { gl, core, x, y, z, ph };
    });
    const lanternLight = new THREE.PointLight('#ffa04a', 1.1, 5, 2); lanternLight.position.set(.9, 1.3, -3.0); out.add(lanternLight); R.lanternLight = lanternLight;

    // ---------------- items ----------------
    const leatherA = M.MAT.leather({ a: '#8a5028', b: '#4e2a10', seed: 13 });
    const leatherB = M.MAT.leather({ a: '#6a3018', b: '#33140a', seed: 29 });
    const leatherC = M.MAT.leather({ a: '#9a6a38', b: '#5a3a1a', seed: 41 });
    const chestWood = M.MAT.wood({ a: '#8c5530', b: '#55301a', rings: 12, seed: 7 });
    const boxWood = M.MAT.wood({ a: '#73301c', b: '#3c130a', rings: 30, seed: 19 });
    const clay = M.MAT.clay({ a: '#b97a52', b: '#86533a', seed: 33 });
    const capCloth = M.MAT.fabric({ a: '#d8c7a2', b: '#a8946c', weave: 70, sheen: '#fff3d8' });
    const stripes = TEX.drawTexture(512, 512, (x, W, H) => { x.fillStyle = '#26407a'; x.fillRect(0, 0, W, H); const st = [['#b8332a', 28], ['#e6b956', 10], ['#26407a', 60], ['#e6b956', 6], ['#f1e3c4', 14], ['#e6b956', 6]]; let y = 30; for (let r = 0; r < 4; r++) for (const [c, h] of st) { x.fillStyle = c; x.fillRect(0, y, W, h); y += h; } for (let i = 0; i < W; i += 4) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i, 0, 1, H); } });
    const textileM = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: .9, sheen: 1, sheenColor: new THREE.Color('#9fb6ff'), sheenRoughness: .4 });
    const sheathL = M.MAT.leather({ a: '#7a3220', b: '#45180c', seed: 51 });
    const items = [];
    const add = (obj, x, y, z, ry, tl, kind) => { obj.position.set(x, y, z); obj.rotation.y = ry; room.add(obj); items.push({ obj, base: new THREE.Vector3(x, y, z), ry, tl, kind }); };
    const zc = -.15;
    add(pouch(M, mats, { h: .19, r: .085, mat: leatherA, seed: 1 }), -.17, SH1, zc, .3, .34, 'cloth');
    add(chest(M, mats, { w: .33, h: .23, d: .2, wood: chestWood, seed: 2 }), -.26, SH0, zc - .01, .06, .74, 'wood');
    add(jewelBox(M, mats, { w: .2, h: .11, d: .15, wood: boxWood }, TEX), -.47, SH1, zc, -.1, 1.12, 'wood');
    add(jar(M, mats, { h: .36, r: .13, clay, cloth: capCloth }), -.79, SH0, zc + .01, .4, 1.5, 'clay');
    add(scroll(M, mats, { len: .26, r: .032 }, TEX), -.8, SH1, zc + .03, .08, 1.9, 'paper');
    add(textile(M, mats, { w: .29, d: .24, mat: textileM }), -1.09, SH0, zc + .01, -.05, 2.28, 'cloth');
    add(dagger(M, mats, { len: .25, leather: sheathL, wood: boxWood }), -1.09, SH0 + .074 * 1.2, zc + .01, 1.5, 2.66, 'metal');
    add(pouch(M, mats, { h: .14, r: .064, mat: leatherB, seed: 4 }), -1.11, SH1, zc, -.4, 3.04, 'cloth');
    add(pouch(M, mats, { h: .13, r: .058, mat: leatherC, seed: 6 }), -.54, SH0, zc + .02, .5, 3.4, 'cloth');
    items.forEach(it => it.obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }));
    R.items = items;

    // dust puffs on landing (CPU-animated points, deterministic)
    const NP = 16; const dpos = new Float32Array(items.length * NP * 3), dal = new Float32Array(items.length * NP);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dg.setAttribute('alpha', new THREE.BufferAttribute(dal, 1));
    const du = { map: { value: TEX.softDot(64, .1) } };
    const dm = new THREE.ShaderMaterial({ uniforms: du, transparent: true, depthWrite: false,
      vertexShader: `attribute float alpha; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; vA = alpha; gl_PointSize = (9. + 22.*(1.-alpha)) * 3.2 / -mv.z; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(.86,.72,.55), a * vA * .32); }` });
    const dust = new THREE.Points(dg, dm); dust.frustumCulled = false; dust.userData.noDepth = true; dust.renderOrder = 12; scene.add(dust);
    const pr = U.rng(55); R.puff = items.map(() => Array.from({ length: NP }, () => ({ a: pr() * 6.283, sp: .25 + pr() * .35, up: .08 + pr() * .18, life: .5 + pr() * .4 })));
    R.dpos = dpos; R.dal = dal; R.dg = dg; R.NP = NP;
    // warm dust motes in the lamp light
    const motes = FX.particles({ count: 120, center: [-.4, 1.7, .9], box: [2.4, 1.6, 1.8], size: 1.3, color: '#ffd9a0', opacity: .4, drift: [.01, .025, 0], swirl: .05 }); scene.add(motes);

    // ---------------- camera ----------------
    camera.fov = 40; camera.near = .05; camera.far = 200; camera.updateProjectionMatrix();
    R.cam = {
      px: mono([[-0.6, .95], [1.4, .3], [3.2, -.3], [5.1, -.52]]), py: mono([[-0.6, 1.78], [5.1, 1.72]]), pz: mono([[-0.6, 4.3], [1.6, 3.9], [3.2, 3.5], [5.1, 3.15]]),
      lx: mono([[-0.6, .42], [1.4, -.16], [3.2, -.52], [5.1, -.64]]), ly: mono([[-0.6, 1.64], [5.1, 1.68]]), lz: mono([[-0.6, 0], [5.1, 0]]),
    };
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const C = R.cam; camera.position.set(C.px(t), C.py(t), C.pz(t)).add(U.shake(t, .006, .5, 5)); camera.lookAt(C.lx(t), C.ly(t), C.lz(t)); camera.updateMatrixWorld();
    post.dof.focus = camera.position.distanceTo(new THREE.Vector3(C.lx(t), 1.5, -.12)); post.dof.range = U.lerp(4.0, 1.5, U.prog(t, .4, 2.6)); post.dof.amount = U.lerp(.55, .8, U.prog(t, .4, 2.6));

    // lamp flicker
    const fl = 1 + .06 * Math.sin(t * 13.1) * Math.sin(t * 5.3 + 1) + .03 * Math.sin(t * 23.7);
    R.key.intensity = 3.3 * fl; R.fill.intensity = 2.6 * (1 + .05 * Math.sin(t * 9.1 + 2));
    // lanterns outside sway gently (carried lights waiting at the door)
    R.lanterns.forEach(l => { const b = Math.sin(t * 2.2 + l.ph) * .025, s = Math.sin(t * 1.3 + l.ph) * .03; l.gl.position.set(l.x + s, l.y + b, l.z); l.core.position.copy(l.gl.position); l.gl.material.opacity = .78 + .08 * Math.sin(t * 11 + l.ph * 3); });
    R.lanternLight.intensity = 1.1 * (1 + .06 * Math.sin(t * 10.3));

    // items: pop in above their place, fall, land with squash & stretch, settle; tags swing
    const dpos = R.dpos, dal = R.dal; const NP = R.NP; const IS = 1.2;
    R.items.forEach((it, i) => {
      const { obj, base, tl } = it; const fall = .3, H0 = .55;
      const t0 = tl - fall;
      if (t < t0 - .02) { obj.visible = false; } else {
        obj.visible = true;
        let y = base.y, sy = 1, rx = 0, rz = 0;
        if (t < tl) { const u = (t - t0) / fall; y = base.y + H0 * (1 - u * u); sy = 1 + .1 * u; const pop = U.ease.outBack(U.clamp((t - t0) / .14), 2); obj.scale.set(IS * pop / Math.sqrt(sy), IS * pop * sy, IS * pop / Math.sqrt(sy)); rz = (1 - u) * .18 * (i % 2 ? 1 : -1); rx = (1 - u) * .1; }
        else { const a = t - tl; sy = 1 - .17 * Math.exp(-a * 9) * Math.cos(a * 27); const sx = 1 / Math.sqrt(sy); obj.scale.set(IS * sx, IS * sy, IS * sx); rz = .035 * Math.exp(-a * 7) * Math.sin(a * 21) * (i % 2 ? 1 : -1); }
        obj.position.set(base.x, y, base.z); obj.rotation.set(rx, it.ry, rz);
        const tg = obj.userData.tag; if (tg) { const a = Math.max(0, t - tl); const sw = t < tl ? -.5 : (-.5 * Math.cos(a * 11) * Math.exp(-a * 3.2)); tg.rotation.x = (tg.userData.rx0 || 0) + sw * .9; tg.rotation.z = Math.sin(a * 8 + i) * .2 * Math.exp(-a * 3); }
      }
      // dust puff
      const a = t - tl; R.puff[i].forEach((p, k) => {
        const j = (i * NP + k); let al = 0; let x = base.x, y = base.y, z = base.z;
        if (a > 0 && a < p.life) { const q = a / p.life; const r = .06 + p.sp * (1 - Math.exp(-a * 5)) * .5; x += Math.cos(p.a) * r; z += Math.sin(p.a) * r * .6; y += .01 + p.up * (1 - Math.exp(-a * 3)) * .6; al = (1 - q) * (1 - q) * Math.min(1, a * 20); }
        dpos[j * 3] = x; dpos[j * 3 + 1] = y; dpos[j * 3 + 2] = z; dal[j] = al;
      });
    });
    R.dg.attributes.position.needsUpdate = true; R.dg.attributes.alpha.needsUpdate = true;

    // ---------------- typography ----------------
    const X = ui.ctx;
    { const a = U.clamp((t - .15) / .3) * (1 - U.prog(t, 4.3, 4.6)); if (a > 0) { const g = X.createLinearGradient(0, 160, 0, 640); g.addColorStop(0, 'rgba(20,10,6,0)'); g.addColorStop(.3, 'rgba(20,10,6,.5)'); g.addColorStop(.62, 'rgba(20,10,6,.32)'); g.addColorStop(1, 'rgba(20,10,6,0)'); X.save(); X.globalAlpha = a; X.fillStyle = g; X.fillRect(0, 160, 1080, 480); X.restore(); } }
    ui.text('el-Emîn', { t, t0: .3, t1: 4.62, x: 540, y: 345, size: 128, weight: 900, family: 'Playfair Display', color: '#ffd77e', anim: 'pop', letterSpacing: 2, shadowBlur: 26, shadowColor: 'rgba(30,12,0,.75)' });
    ui.underline({ t, t0: .62, t1: 4.62, x: 540, y: 432, w: 300, color: '#ffd77e', width: 6 });
    // "emanet" keyword pointing at the chest's red-wax tag, on the spoken word
    { const tg = R.items[0].obj.userData.tag; const wp = new THREE.Vector3(0, -.066, .004); tg.localToWorld(wp); const [ax, ay, az] = ui.project(wp);
      if (az < 1) ui.callout('emanet', { t, t0: ctx.wordTime('emanet') - .2, t1: 4.62, anchor: [ax, ay], to: [U.clamp(ax - 230, 200, 880), Math.max(660, ay - 190)], size: 46, weight: 900, bg: '#f2b84b', color: '#3b2208', dotColor: '#ff5a4e', lineColor: 'rgba(255,236,200,.95)' }); }
    ui.text('Mekkeliler O’na “el-Emîn”\n(güvenilir) derdi', { t, t0: 1.38, t1: 4.62, x: 540, y: 532, size: 42, weight: 800, bg: 'rgba(28,16,10,.78)', color: '#fff1d6', anim: 'rise', maxWidth: 900, lineHeight: 1.2 });
  },
};
