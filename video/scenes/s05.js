// s05 (25.25–29.75) "…Peygamberimiz ﷺ'a emanet ederlerdi."
// Visual: inside the modest house the lights converged to in s04 (open door on the right, clay lamps burning on the
// neighbour's wall across the moonlit alley). One clay oil lamp on a small wall bracket beside a deep plastered wall niche with two wooden
// shelves: warm raking light, soft shadows on the plaster, cool moonlight spilling through the door.
// The entrusted items arrive one by one on the beat — each grows in just in front of the niche and glides onto its shelf
// with a small hop, landing with squash & stretch and a puff of dust (paths stay inside the compartments: no clipping):
// leather pouches tied with cord, a wooden chest with brass bands, a sealed clay jar, a folded fine textile, a sheathed
// dagger, a small jewellery box, a rolled parchment with a wax seal — each with a small parchment tag sealed with red wax
// (the red dots of s04). Typography: "el-Emîn" + pill "Mekkeliler O’na “el-Emîn” (güvenilir) derdi". No person.
import * as THREE from 'three';
import { plasterWall } from '../engine/lib/extra_B.js';

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
  const card = mesh(M.rbox(.056, .036, .003, .006, 1), mats.tag, 0, -.066, .002); card.rotation.z = (seed % 2 ? 1 : -1) * .12; piv.add(card);
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(.0105, .0115, .004, 14), mats.wax); wax.rotation.x = Math.PI / 2; wax.position.set(.008 * (seed % 2 ? -1 : 1), -.066, .0055); wax.castShadow = true; piv.add(wax);
  const hole = new THREE.Mesh(new THREE.TorusGeometry(.004, .0012, 6, 12), mats.cord); hole.position.set(0, -.05, .004); piv.add(hole);
  piv.userData.isTag = true;
  return piv;
}
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
  const tg = tag(M, mats, o.seed); tg.position.set(.0, h * .79, r * .36 + .004); g.add(tg); g.userData.tag = tg; g.userData.tagRest = .55; // rests against the bulging belly
  g.userData.w = r * 2 * 1.08; g.userData.d = r * 2 * .9; g.userData.h = h;
  return g;
}
function chest(M, mats, o) {
  const g = new THREE.Group(); const w = o.w, h = o.h, d = o.d; const hb = h * .66;
  g.add(mesh(M.rbox(w, hb, d, .014, 2), o.wood, 0, hb / 2, 0));
  // the barrel lid is an open half-cylinder + single-sided end caps: render both faces into the shadow map, otherwise the
  // lamp-facing cap is culled and light leaks through the hollow lid as a pale band inside the chest's wall shadow
  const lidM = o.wood.clone(); lidM.shadowSide = THREE.DoubleSide;
  const lid = mesh(new THREE.CylinderGeometry(d / 2 + .004, d / 2 + .004, w + .006, 26, 1, false, 0, Math.PI), lidM, 0, hb, 0); lid.rotation.z = Math.PI / 2; lid.scale.set((h - hb) / (d / 2), 1, 1); g.add(lid);
  const lidSide = (s) => { const c = mesh(new THREE.CircleGeometry(d / 2 + .004, 26, 0, Math.PI), lidM, s * (w / 2 + .003), hb, 0); c.rotation.y = s * Math.PI / 2; c.scale.y = (h - hb) / (d / 2); return c; };
  g.add(lidSide(1), lidSide(-1));
  for (const x of [-w * .3, w * .3]) {
    g.add(mesh(M.rbox(.022, hb + .004, d + .006, .003, 1), mats.brass, x, hb / 2, 0));
    const st = mesh(new THREE.TorusGeometry(d / 2 + .006, .0035, 6, 24, Math.PI), mats.brass, x, hb, 0); st.rotation.y = Math.PI / 2; st.scale.y = (h - hb) / (d / 2); g.add(st);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(M.rbox(.03, .03, .03, .006, 1), mats.brass, sx * (w / 2 - .012), .016, sz * (d / 2 - .012)));
  g.add(mesh(M.rbox(.05, .055, .008, .004, 1), mats.brass, 0, hb - .02, d / 2 + .003));
  const hasp = mesh(new THREE.TorusGeometry(.011, .0028, 6, 14), mats.brass, 0, hb - .045, d / 2 + .009); g.add(hasp);
  const tg = tag(M, mats, o.seed); tg.position.set(0, hb - .056, d / 2 + .012); g.add(tg); g.userData.tag = tg; g.userData.tagRest = .06;
  g.userData.w = w + .01; g.userData.d = d + .02; g.userData.h = h;
  return g;
}
function jar(M, mats, o, TEX) {
  const g = new THREE.Group(); const H = o.h, Rr = o.r;
  const prof = [[0, 0], [Rr * .5, 0], [Rr * .62, H * .03], [Rr * .92, H * .25], [Rr, H * .45], [Rr * .86, H * .66], [Rr * .52, H * .8], [Rr * .38, H * .86], [Rr * .42, H * .92], [Rr * .45, H * .95], [Rr * .3, H * .96], [0, H * .955]];
  const sp = new THREE.SplineCurve(prof.map(([a, b]) => new THREE.Vector2(a, b))).getPoints(60).map(v => new THREE.Vector2(Math.max(v.x, 1e-4), v.y));
  const geo = new THREE.LatheGeometry(sp, 48); { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const f = 1 + .008 * (Math.sin(a * 3 + 4) * .6 + Math.sin(a * 5 + y * 40 + 8) * .4); p.setX(i, x * f); p.setZ(i, z * f); } geo.computeVertexNormals(); }
  // painted ochre bands + burnished clay (lathe uv: u around, v along the profile)
  const band = TEX.drawTexture(256, 512, (x, W, Hh) => { const gr = x.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#c8875a'); gr.addColorStop(.5, '#b4744a'); gr.addColorStop(1, '#9a5e3a'); x.fillStyle = gr; x.fillRect(0, 0, W, Hh);
    x.fillStyle = '#6a2a18'; for (const [y, hh] of [[.52, .012], [.555, .03], [.625, .012]]) x.fillRect(0, Hh * y, W, Hh * hh);
    x.strokeStyle = '#6a2a18'; x.lineWidth = 5; x.beginPath(); for (let i = 0; i <= 24; i++) x.lineTo(i * W / 24, Hh * (.59 + (i % 2 ? .025 : 0))); x.stroke();
    const r = rngL(7); x.globalAlpha = .1; for (let i = 0; i < 2600; i++) { x.fillStyle = r() < .5 ? '#3a1a0a' : '#f2c8a0'; x.fillRect(r() * W, r() * Hh, 1 + r() * 2, 1 + r() * 2); } });
  const clay = new THREE.MeshPhysicalMaterial({ map: band, normalMap: o.clay.normalMap, normalScale: new THREE.Vector2(.4, .4), roughness: .72, sheen: .4, sheenColor: new THREE.Color('#ffc9a0'), clearcoat: .15, clearcoatRoughness: .6 });
  g.add(mesh(geo, clay));
  const cap = mesh(new THREE.SphereGeometry(Rr * .5, 24, 10, 0, Math.PI * 2, 0, Math.PI * .55), o.cloth, 0, H * .9, 0); cap.scale.y = .55; g.add(cap);
  const skirt = mesh(new THREE.CylinderGeometry(Rr * .47, Rr * .52, H * .08, 24, 1, true), o.cloth, 0, H * .88, 0); g.add(skirt);
  const tie = mesh(new THREE.TorusGeometry(Rr * .44, .006, 8, 28), mats.cord, 0, H * .87, 0); tie.rotation.x = Math.PI / 2; g.add(tie);
  const seal = mesh(new THREE.CylinderGeometry(.03, .033, .012, 16), mats.wax, 0, H * .995, 0); g.add(seal);
  const tg = tag(M, mats, 3); tg.position.set(0, H * .87, Rr * .45 + .006); g.add(tg); g.userData.tag = tg; g.userData.tagRest = .5;
  g.userData.w = Rr * 2; g.userData.d = Rr * 2; g.userData.h = H;
  return g;
}
function textile(M, mats, o) {
  const g = new THREE.Group(); const w = o.w, d = o.d; let y = 0;
  [[.0, 0, .036], [.01, -.008, .034], [-.006, .006, .032]].forEach(([dx, dz, th], i) => {
    const m = mesh(M.rbox(w - i * .01, th, d - i * .012, th * .48, 3), o.mat, dx, y + th / 2, dz); m.rotation.y = (i - 1) * .025; g.add(m); y += th - .004;
  });
  // fringe along the front edge
  const fr = []; for (let i = 0; i < 22; i++) { const c = new THREE.CylinderGeometry(.0018, .0018, .022, 4); c.rotateX(Math.PI / 2 - .5); c.translate(-w / 2 + .012 + i * (w - .024) / 21, .008, d / 2 + .009); fr.push(c); }
  const { mergeGeometries } = o; if (mergeGeometries) g.add(mesh(mergeGeometries(fr), mats.cord));
  const tg = tag(M, mats, 6); tg.position.set(w * .3, y - .004, d / 2 - .02); tg.rotation.x = -1.35; g.add(tg); g.userData.tagFlat = true; g.userData.top = y;
  g.userData.w = w + .02; g.userData.d = d + .03; g.userData.h = y;
  return g;
}
function dagger(M, mats, o) {
  const g = new THREE.Group(); const inner = new THREE.Group(); g.add(inner); inner.rotation.x = -Math.PI / 2; // lies flat; length along local -z..+z
  const L = o.len; const s = new THREE.Shape(); s.moveTo(-.018, 0); s.quadraticCurveTo(-.02, L * .5, -.01, L * .92); s.quadraticCurveTo(0, L * 1.0, .008, L * .93); s.quadraticCurveTo(.022, L * .5, .018, 0); s.closePath();
  const sg = new THREE.ExtrudeGeometry(s, { depth: .014, bevelEnabled: true, bevelThickness: .006, bevelSize: .005, bevelSegments: 3, curveSegments: 16 }); sg.translate(0, 0, -.007);
  inner.add(mesh(sg, o.leather));
  inner.add(mesh(new THREE.ConeGeometry(.013, .05, 12), mats.brass, .0, L * .93, 0));
  inner.add(mesh(M.rbox(.05, .03, .026, .006, 1), mats.brass, 0, .012, 0));
  inner.add(mesh(M.rbox(.075, .016, .026, .006, 1), mats.brass, 0, -.008, 0));
  inner.add(mesh(new THREE.CylinderGeometry(.012, .014, .1, 12), o.wood, 0, -.066, 0));
  for (const y of [-.035, -.07, -.1]) { const r = mesh(new THREE.TorusGeometry(.0135, .0025, 6, 14), mats.brass, 0, y, 0); r.rotation.x = Math.PI / 2; inner.add(r); }
  inner.add(mesh(new THREE.SphereGeometry(.019, 14, 10), mats.brass, 0, -.125, 0));
  inner.position.y = .019; // pommel (r .019) touches the surface below
  g.userData.w = .08; g.userData.d = L + .15; g.userData.h = .04;
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
  const tg = tag(M, mats, 9); tg.position.set(0, h * .62, d / 2 + .009); g.add(tg); g.userData.tag = tg; g.userData.tagRest = .05;
  g.userData.w = w + .01; g.userData.d = d + .02; g.userData.h = h;
  return g;
}
function scroll(M, mats, o, TEX) {
  const g = new THREE.Group(); const L = o.len, r = o.r;
  const pm = M.MAT.parchment({ a: '#ecd3a0', b: '#b88a52' }); pm.roughness = .8;
  // slightly waisted roll (rolled by hand) with a visible spiral at both ends and the outer leaf's edge
  const prof = []; for (let i = 0; i <= 16; i++) { const v = i / 16; prof.push(new THREE.Vector2(r * (1 - .06 * Math.sin(v * Math.PI)), (v - .5) * L)); }
  const rollG = new THREE.LatheGeometry(prof, 32); rollG.rotateZ(Math.PI / 2); const roll = mesh(rollG, pm, 0, r, 0); g.add(roll);
  const endTex = TEX.drawTexture(128, 128, (x, W, H) => { x.fillStyle = '#e8cf9c'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(110,70,30,.6)'; x.lineWidth = 3; x.beginPath(); for (let a = 0; a < Math.PI * 9; a += .1) { const rr = 5 + a * 2.0; x.lineTo(W / 2 + Math.cos(a) * rr, H / 2 + Math.sin(a) * rr); } x.stroke(); });
  for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(r * .995, 28), new THREE.MeshStandardMaterial({ map: endTex, roughness: .9 })); c.position.set(s * (L / 2 + .0005), r, 0); c.rotation.y = s * Math.PI / 2; c.castShadow = true; g.add(c); }
  const leaf = new THREE.Mesh(new THREE.CylinderGeometry(r + .0015, r + .0015, L * .995, 24, 1, true, Math.PI * .05, Math.PI * .5), pm); leaf.rotation.z = Math.PI / 2; leaf.position.y = r; leaf.castShadow = true; g.add(leaf);
  const cord = mesh(new THREE.TorusGeometry(r + .003, .0032, 6, 26), mats.redCord, -L * .08, r, 0); cord.rotation.y = Math.PI / 2; g.add(cord);
  // wax seal: wrapped onto the roll's curvature and tilted up-forward (a flat disc facing the lamp mirrored its whole
  // clearcoat highlight and read as a white blob), satin wax so it stays red
  const sealG = new THREE.CylinderGeometry(.021, .023, .005, 20); { const p = sealG.attributes.position; for (let i = 0; i < p.count; i++) { const a = Math.atan2(p.getZ(i), p.getX(i)); const f = 1 + .08 * Math.sin(a * 5) + .05 * Math.sin(a * 9); p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); const z = p.getZ(i); p.setY(i, p.getY(i) - z * z / (2 * (r + .005))); } sealG.computeVertexNormals(); }
  const sealM = mats.wax.clone(); sealM.roughness = .5; sealM.clearcoat = .3; sealM.clearcoatRoughness = .55;
  const sa = .6, sd = r + .005; const seal = mesh(sealG, sealM, -L * .08, r + sd * Math.sin(sa), sd * Math.cos(sa)); seal.rotation.x = Math.PI / 2 - sa; g.add(seal);
  // tag tied over the top of the roll, its card leaning forward-down on the shelf facing the camera (not edge-on)
  const tg = tag(M, mats, 11); tg.position.set(L * .28, r * 1.9, r * .75); tg.rotation.x = -.8; g.add(tg); g.userData.tagFlat = true;
  g.userData.w = L + .01; g.userData.d = 2 * r + .01; g.userData.h = 2 * r;
  return g;
}
function rngL(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export default {
  post: {
    exposure: 1.08,
    toneMapping: 'agx',
    bloom: { enabled: true, strength: 0.42, radius: 0.6, threshold: 0.88 },
    grade: { contrast: 1.15, saturation: 1.08, warmth: 0.0, lift: [0.008, 0.012, 0.034], gain: [1.02, 0.99, 0.95] },
    vignette: 0.52, grain: 0.03,
    dof: { enabled: true, focus: 4.9, range: 1.6, amount: 0.7 },
  },
  async setup(ctx) {
    const { scene, camera, U, MODELS: M, ENV, FX, TEX } = ctx;
    R = {};
    const { mergeGeometries } = await import('three/addons/utils/BufferGeometryUtils.js');
    scene.background = new THREE.Color('#0d1226');
    scene.fog = new THREE.Fog('#1a1a2a', 9, 30);
    scene.environment = await ctx.loadHDR('fireplace'); scene.environmentIntensity = 0.13;

    const mats = {
      cord: new THREE.MeshStandardMaterial({ color: '#c9a36c', roughness: .85 }),
      redCord: new THREE.MeshStandardMaterial({ color: '#8f2a20', roughness: .8 }),
      tag: M.MAT.parchment({ a: '#f4e2bb', b: '#dcc193' }),
      wax: new THREE.MeshPhysicalMaterial({ color: '#c2271e', roughness: .32, clearcoat: .7, clearcoatRoughness: .25, sheen: .2 }),
      brass: M.MAT.brass(),
    };
    R.mats = mats;
    // ---------------- room ----------------
    const pw = plasterWall({ a: '#ece2d2', b: '#c8ab90', seed: 8, size: 1024, crack: .22 });
    const plaster = (rx, ry, tint = '#ffffff') => { const cl = t => { const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c; };
      return new THREE.MeshStandardMaterial({ map: cl(pw.map), normalMap: cl(pw.normalMap), normalScale: new THREE.Vector2(.5, .5), roughnessMap: cl(pw.roughnessMap), roughness: 1, color: tint }); };
    const wall = plaster(.45, .45), wallDark = plaster(.45, .45, '#d9c2a6'), sideWall = plaster(2.5, 1.4, '#e8d6c0');
    const room = new THREE.Group(); scene.add(room); R.room = room;
    const T = .42, RH = 3.1; // back wall thickness / room height
    // a deep wall niche with two wooden shelves; the lamp bracket to its right; the doorway further right
    const NX0 = -1.32, NX1 = .03, NY0 = 1.0, NY1 = 2.35, ND = .36, DX0 = .72, DX1 = 1.62, DY = 2.1;
    R.N = { NX0, NX1, NY0, NY1, ND };
    const outline = () => { const sh = new THREE.Shape(); sh.moveTo(-2.6, 0); sh.lineTo(DX0, 0); sh.lineTo(DX0, DY); sh.lineTo(DX1, DY); sh.lineTo(DX1, 0); sh.lineTo(2.6, 0); sh.lineTo(2.6, RH); sh.lineTo(-2.6, RH); sh.closePath(); return sh; };
    { const sh = outline(); const hole = new THREE.Path(); hole.moveTo(NX0, NY0); hole.lineTo(NX0, NY1); hole.lineTo(NX1, NY1); hole.lineTo(NX1, NY0); hole.closePath(); sh.holes.push(hole);
      const bt = .035; const g = new THREE.ExtrudeGeometry(sh, { depth: ND - bt * 2, bevelEnabled: true, bevelThickness: bt, bevelSize: .03, bevelSegments: 4, curveSegments: 4 }); g.translate(0, 0, -ND + bt);
      room.add(mesh(g, wall)); }
    { const g = new THREE.ExtrudeGeometry(outline(), { depth: T - ND, bevelEnabled: false }); g.translate(0, 0, -T); room.add(mesh(g, wallDark)); }
    for (const sx of [-2.6, 2.6]) { const sw = mesh(M.rbox(T, RH, 5.5, .03, 2), sideWall, sx, RH / 2, 2.6); sw.castShadow = false; room.add(sw); } // far walls: no need to cast
    const floorT = TEX.plaster({ a: '#a8886a', b: '#7a5e44', seed: 22, repeat: [4, 4] });
    const floorM = new THREE.MeshStandardMaterial({ map: floorT.map, normalMap: floorT.normalMap, normalScale: new THREE.Vector2(.8, .8), roughness: .95 });
    const floor = mesh(new THREE.PlaneGeometry(5.4, 6).rotateX(-Math.PI / 2), floorM, 0, 0, 2.7); floor.castShadow = false; room.add(floor);
    const beamT = TEX.drawTexture(64, 512, (x, W, H) => { x.fillStyle = '#6a4a30'; x.fillRect(0, 0, W, H); for (let y = 0; y < H; y += 10) { x.fillStyle = `rgba(40,25,12,${.25 + (y % 30 ? 0 : .2)})`; x.fillRect(0, y, W, 3); } });
    const beamM = new THREE.MeshStandardMaterial({ map: beamT, roughness: .95 });
    for (let k = 0; k < 7; k++) { const b = mesh(new THREE.CylinderGeometry(.09, .1, 5.6, 12), beamM, -2.4 + k * .8, RH + .02, 2.6); b.rotation.x = Math.PI / 2; b.rotation.z = (k % 2 ? .02 : -.02); b.castShadow = false; room.add(b); }
    const reed = TEX.fabric({ a: '#a88a5c', b: '#7a6040', weave: 90 });
    { const ce = mesh(new THREE.PlaneGeometry(5.4, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ map: reed.map, normalMap: reed.normalMap, roughness: 1 }), 0, RH + .1, 2.7); ce.castShadow = false; room.add(ce); }
    const wood = M.MAT.wood({ a: '#a06c3c', b: '#64401f', rings: 18, seed: 31 });
    const darkWood = M.MAT.darkWood({ rings: 26, seed: 17 });
    const SH0 = NY0 + .02, SH1 = 1.66; R.SH0 = SH0; R.SH1 = SH1;
    room.add(mesh(M.rbox(NX1 - NX0 + .1, .045, ND + .08, .014, 2), wood, (NX0 + NX1) / 2, SH0 - .0225, -ND / 2 + .04)); // sill board
    room.add(mesh(M.rbox(NX1 - NX0 - .004, .045, ND + .05, .014, 2), wood, (NX0 + NX1) / 2, SH1 - .0225, -ND / 2 + .025)); // middle shelf
    room.add(mesh(M.rbox(NX1 - NX0 + .3, .1, .14, .03, 2), wood, (NX0 + NX1) / 2, NY1 + .055, .03)); // lintel
    for (const x of [NX0 + .03, NX1 - .03]) room.add(mesh(M.rbox(.05, .05, .05, .01, 1), darkWood, x, SH1 - .07, -.03)); // shelf pegs
    // bench below + kilim, floor mat
    const benchX0 = -1.7, benchX1 = .35, BH = .44;
    room.add(mesh(M.rbox(benchX1 - benchX0, BH, .62, .06, 3), wallDark, (benchX0 + benchX1) / 2, BH / 2, .31));
    const matT = TEX.drawTexture(512, 256, (x, W, H) => {
      x.fillStyle = '#7d2b1f'; x.fillRect(0, 0, W, H); x.fillStyle = '#d8a955'; x.fillRect(10, 10, W - 20, H - 20); x.fillStyle = '#7d2b1f'; x.fillRect(20, 20, W - 40, H - 40); x.fillStyle = '#23365c'; x.fillRect(34, 34, W - 68, H - 68);
      x.fillStyle = '#d8a955'; for (let i = 0; i < 12; i++) { x.save(); x.translate(60 + i * 36, H / 2); x.rotate(Math.PI / 4); x.fillRect(-9, -9, 18, 18); x.restore(); }
      x.strokeStyle = '#b84a34'; x.lineWidth = 6; for (const y of [60, H - 60]) { x.beginPath(); for (let i = 0; i <= 30; i++) x.lineTo(40 + i * 15.4, y + (i % 2 ? 10 : -10)); x.stroke(); }
    });
    room.add(mesh(M.rbox(benchX1 - benchX0 - .1, .016, .6, .007, 1), new THREE.MeshPhysicalMaterial({ map: matT, roughness: 1, sheen: 1, sheenColor: new THREE.Color('#ffb98a'), sheenRoughness: .5 }), (benchX0 + benchX1) / 2, BH + .008, .31));
    const hasir = TEX.fabric({ a: '#c8a466', b: '#9a7a44', weave: 60 });
    const fmat = mesh(M.rbox(2.6, .012, 1.6, .005, 1), new THREE.MeshStandardMaterial({ map: hasir.map, normalMap: hasir.normalMap, roughness: 1 }), -.35, .006, 1.55); fmat.castShadow = false; room.add(fmat);
    // woven palm-leaf basket on the bench + a water jug by the door (set dressing)
    { const bk = TEX.fabric({ a: '#c9a25e', b: '#8a6a34', weave: 40 }); const bm = new THREE.MeshStandardMaterial({ map: bk.map, normalMap: bk.normalMap, roughness: 1 });
      const b = M.lathe([[0, 0], [.13, 0], [.16, .04], [.17, .16], [.165, .17], [.15, .165], [.15, .03], [0, .03]], bm, 32); b.position.set(-1.45, BH + .016, .3); room.add(b);
      const jug = M.lathe([[0, 0], [.09, 0], [.13, .1], [.14, .2], [.1, .32], [.05, .38], [.055, .44], [.045, .45], [.0001, .44]], M.MAT.clay({ a: '#b97a52', b: '#86533a', seed: 12 }), 28); jug.position.set(DX0 - .3, 0, .45); room.add(jug); }
    // the open door leaf (planks + iron straps) swung inward; wooden lintel + stone threshold
    const leaf = new THREE.Group(); leaf.position.set(DX1 - .02, 0, .02); leaf.rotation.y = 1.95; room.add(leaf);
    for (let k = 0; k < 5; k++) leaf.add(mesh(M.rbox(.175, DY - .06, .05, .012, 1), darkWood, -.09 - k * .176, DY / 2, 0));
    const stud = new THREE.MeshStandardMaterial({ color: '#2c2724', metalness: .8, roughness: .45 });
    for (const y of [.35, 1.05, 1.75]) leaf.add(mesh(M.rbox(.86, .05, .012, .004, 1), stud, -.45, y, .032));
    room.add(mesh(M.rbox(DX1 - DX0 + .3, .16, .5, .03, 2), darkWood, (DX0 + DX1) / 2, DY + .08, -.18));
    room.add(mesh(M.rbox(DX1 - DX0 + .2, .06, .5, .02, 1), M.MAT.stone({ a: '#b9ab95', b: '#8f8270' }), (DX0 + DX1) / 2, .03, -.2));
    // ---- the clay oil lamp on a turned wooden lamp stand in front-right of the niche: the key light (soft raking shadows) ----
    const stand = new THREE.Group(); stand.position.set(.3, 0, .66); room.add(stand);
    const standWood = M.MAT.wood({ a: '#b07a46', b: '#6c4524', rings: 10, seed: 44 });
    stand.add(M.lathe([[0, 0], [.16, 0], [.17, .03], [.12, .06], [.065, .09], [.045, .13], [.055, .2], [.036, .3], [.04, .52], [.055, .57], [.04, .62], [.035, .9], [.05, .95], [.036, 1.0], [.034, 1.3], [.046, 1.34], [.12, 1.37], [.13, 1.4], [.11, 1.42], [0, 1.42]], standWood, 28));
    const lamp = M.oilLamp({ scale: 1.5, light: false, seed: 4 }); lamp.position.set(-.01, 1.42, 0); lamp.rotation.y = Math.PI * .86; stand.add(lamp); R.lamp = lamp;
    lamp.userData.glow.material.opacity = .2; lamp.userData.glow.scale.setScalar(.22); lamp.userData.flame.userData.uniforms.intensity.value = 2.8;
    room.updateMatrixWorld(true); const flameW = new THREE.Vector3(); lamp.userData.flame.getWorldPosition(flameW); R.flameW = flameW;
    const halo = FX.glow({ size: .5, opacity: .14, color: '#ffb066' }); halo.position.copy(flameW).add(new THREE.Vector3(0, .05, 0)); scene.add(halo); R.halo = halo;
    const key = new THREE.PointLight('#ffb870', 2.0, 9, 2); key.position.copy(flameW).add(new THREE.Vector3(0, .07, 0));
    key.castShadow = true; key.shadow.mapSize.set(512, 512); key.shadow.bias = -.0015; key.shadow.normalBias = .01; key.shadow.radius = 10; key.shadow.camera.near = .03; scene.add(key); R.key = key;
    const fill = new THREE.PointLight('#ff9c5a', .62, 8, 2); fill.position.set(-1.3, 1.0, 2.3); room.add(fill); R.fill = fill; // warm bounce off the floor / a second lamp out of frame
    scene.add(new THREE.HemisphereLight('#5a6ea8', '#2a1a10', .3));
    const moonS = new THREE.SpotLight('#8eaaff', 16, 14, .5, .7, 1.4); moonS.position.set(2.0, 3.9, -3.4); moonS.target.position.set(.9, 0, 1.4); room.add(moonS, moonS.target);

    // ---------------- outside the door: the moonlit alley + the lantern lights from s04 ----------------
    const out = new THREE.Group(); scene.add(out);
    out.add(mesh(new THREE.PlaneGeometry(14, 10).rotateX(-Math.PI / 2), M.MAT.sand({ a: '#a59684', b: '#857868', repeat: [4, 3] }), 0, -.01, -5.2));
    const opp = M.MAT.plaster({ a: '#cdb08c', b: '#9c7c5e', seed: 3, repeat: [2, 1] });
    out.add(mesh(M.rbox(9, 3.6, .6, .1, 2), opp, .6, 1.8, -5.4));
    out.add(mesh(M.rbox(.3, .28, .8, .08, 1), darkWood, -.4, 3.4, -4.9));
    out.add(mesh(M.rbox(1.0, 1.9, .2, .05, 1), darkWood, 2.4, .95, -5.05));
    const sky = ENV.skyDome({ top: '#060b1e', mid: '#12224a', horizon: '#33406a', bottom: '#141a2c', sunDir: [.3, .5, -1], sunColor: '#e9efff', sunSize: 0, sunGlow: .3, stars: .8, clouds: 0, intensity: 1 }); scene.add(sky);
    out.traverse(o => { if (o.isMesh) o.castShadow = false; if (o.isMesh && o.material && o.material.emissive) { o.material = o.material.clone(); o.material.emissive = new THREE.Color('#2a3658'); o.material.emissiveIntensity = .3; } });
    // the warm lights seen through the door are real sources: two clay oil lamps on small wooden wall brackets on the
    // neighbour's wall across the alley (small glows -> soft bokeh, no floating hand-height lights), plus one warm point
    // light so the lamps visibly light the plaster and the ground around them
    R.lanterns = [[1.22, 1.36, .3, 0], [2.08, 1.5, -.35, 2.1]].map(([x, y, ry, ph], k) => {
      const br = mesh(M.rbox(.3, .035, .24, .01, 1), darkWood, x, y - .0175, -4.98); br.castShadow = false; out.add(br);
      const lp = M.oilLamp({ scale: 1.8, light: false, seed: 7 + k }); lp.position.set(x - .04, y, -4.98); lp.rotation.y = ry; out.add(lp);
      lp.userData.glow.visible = false; // its built-in glow ignores depth (would shine through the door jamb)
      lp.traverse(c => { if (c.isMesh) c.castShadow = false; });
      out.updateMatrixWorld(true); const fw = new THREE.Vector3(); lp.userData.flame.getWorldPosition(fw);
      const gl = FX.glow({ size: .34, opacity: .5, color: '#ffa850' }); gl.position.copy(fw).add(new THREE.Vector3(0, .07, .02)); out.add(gl);
      const core = FX.glow({ size: .08, opacity: .9, color: '#fff0c8' }); core.position.copy(fw).add(new THREE.Vector3(0, .05, .02)); out.add(core);
      return { gl, core, ph };
    });
    R.alleyL = new THREE.PointLight('#ffa04a', .45, 3.4, 2); R.alleyL.position.set(1.65, 1.72, -4.55); out.add(R.alleyL);


    // ---------------- items ----------------
    const leatherA = M.MAT.leather({ a: '#9a5a2e', b: '#5a3014', seed: 13 });
    const leatherB = M.MAT.leather({ a: '#7a3a1c', b: '#3e180a', seed: 29 });
    const leatherC = M.MAT.leather({ a: '#a8763e', b: '#64401c', seed: 41 });
    const chestWood = M.MAT.wood({ a: '#8c5530', b: '#55301a', rings: 12, seed: 7 });
    const boxWood = M.MAT.wood({ a: '#73301c', b: '#3c130a', rings: 30, seed: 19 });
    const clay = M.MAT.clay({ a: '#b97a52', b: '#86533a', seed: 33 });
    const capCloth = M.MAT.fabric({ a: '#d8c7a2', b: '#a8946c', weave: 70, sheen: '#fff3d8' });
    const stripes = TEX.drawTexture(512, 512, (x, W, H) => { x.fillStyle = '#8a2420'; x.fillRect(0, 0, W, H); const st = [['#1f3466', 54], ['#e3b04e', 10], ['#8a2420', 40], ['#e3b04e', 6], ['#f0e0c0', 12], ['#e3b04e', 6], ['#8a2420', 34]]; let u = 0; while (u < W) for (const [c, w] of st) { x.fillStyle = c; x.fillRect(u, 0, w, H); u += w; } for (let i = 0; i < H; i += 3) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, i, W, 1); } for (let i = 0; i < W; i += 5) { x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(i, 0, 1, H); } });
    const textileM = new THREE.MeshPhysicalMaterial({ map: stripes, roughness: .9, sheen: 1, sheenColor: new THREE.Color('#9fb6ff'), sheenRoughness: .4 });
    const sheathL = M.MAT.leather({ a: '#a8562e', b: '#5e2a16', seed: 51 }); // lighter tan-red so the sheath reads against the textile
    const IS = 1.3; R.IS = IS;
    const items = [];
    // compartment ceilings (for collision-free arrival paths)
    const CEIL = { lo: SH1 - .045, hi: NY1 };
    const add = (obj, x, y, z, ry, tl, kind, ceil) => { obj.position.set(x, y, z); obj.rotation.y = ry; room.add(obj); items.push({ obj, base: new THREE.Vector3(x, y, z), ry, tl, kind, ceil }); };
    // lay a shelf out left->right with equal gaps between the niche jambs (inner faces at NX0+.03 .. NX1-.03)
    const layout = (list, y, ceil) => { const ext = list.map(([o, ry]) => (Math.abs(Math.cos(ry)) * o.userData.w + Math.abs(Math.sin(ry)) * o.userData.d) * IS);
      const x0 = NX0 + .035, x1 = NX1 - .035, gap = (x1 - x0 - ext.reduce((a, b) => a + b, 0)) / (list.length + 1); let x = x0 + gap;
      list.forEach(([o, ry, tl, kind, zf], k) => { const d = (Math.abs(Math.sin(ry)) * o.userData.w + Math.abs(Math.cos(ry)) * o.userData.d) * IS; const z = Math.max(-ND + .025 + d / 2, -.02 - d / 2 - (zf ?? 0)); add(o, x + ext[k] / 2, y, z, ry, tl, kind, ceil); x += ext[k] + gap; }); };
    const ch = chest(M, mats, { w: .33, h: .23, d: .2, wood: chestWood, seed: 2 });
    const pB = pouch(M, mats, { h: .14, r: .064, mat: leatherB, seed: 4 }), pA = pouch(M, mats, { h: .19, r: .085, mat: leatherA, seed: 1 });
    const jr = jar(M, mats, { h: .32, r: .125, clay, cloth: capCloth }, TEX);
    const jb = jewelBox(M, mats, { w: .2, h: .11, d: .15, wood: boxWood }, TEX);
    const tx = textile(M, mats, { w: .27, d: .22, mat: textileM, mergeGeometries });
    const sc = scroll(M, mats, { len: .26, r: .032 }, TEX);
    // arrival order: right -> left (the camera pans from the door toward the niche), alternating shelves
    layout([[tx, -.05, 2.5, 'cloth', .02], [jr, .4, 1.44, 'clay', .01], [ch, -.04, .34, 'wood', .015]], SH0, CEIL.lo);
    // the sealed scroll sits at the lamp-lit right end of the upper shelf (it was lost in the jewel box's shadow at the left)
    layout([[jb, -.1, 2.15, 'wood', .02], [pA, .3, 1.8, 'cloth', .02], [pB, -.4, .9, 'cloth', .02], [sc, .18, 3.22, 'paper', .03]], SH1, CEIL.hi);
    { const dg = dagger(M, mats, { len: .15, leather: sheathL, wood: boxWood }); add(dg, tx.position.x + .005, SH0 + tx.userData.top * IS, tx.position.z + .02, Math.PI / 2 - .22, 2.86, 'metal', CEIL.lo); }
    R.chest = ch;
    items.forEach(it => it.obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }));
    R.items = items;

    // dust puffs on landing (CPU-animated points, deterministic)
    const NP = 16; const dpos = new Float32Array(items.length * NP * 3), dal = new Float32Array(items.length * NP);
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3)); dg.setAttribute('alpha', new THREE.BufferAttribute(dal, 1));
    const du = { map: { value: TEX.softDot(64, .1) }, pxs: { value: ctx.renderer.getSize(new THREE.Vector2()).y / 960 } };
    const dm = new THREE.ShaderMaterial({ uniforms: du, transparent: true, depthWrite: false,
      vertexShader: `uniform float pxs; attribute float alpha; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; vA = alpha; gl_PointSize = (9. + 22.*(1.-alpha)) * 3.2 * pxs / -mv.z; }`,
      fragmentShader: `uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a; gl_FragColor = vec4(vec3(.9,.76,.58), a * vA * .26); }` });
    const dust = new THREE.Points(dg, dm); dust.frustumCulled = false; dust.userData.noDepth = true; dust.renderOrder = 12; scene.add(dust);
    const pr = U.rng(55); R.puff = items.map(() => Array.from({ length: NP }, () => ({ a: pr() * 6.283, sp: .25 + pr() * .35, up: .05 + pr() * .12, life: .5 + pr() * .4 })));
    R.dpos = dpos; R.dal = dal; R.dg = dg; R.NP = NP;
    // warm dust motes drifting through the lamp light
    scene.add(FX.particles({ count: 130, center: [-.3, 1.65, .8], box: [2.4, 1.8, 1.6], size: 1.3, color: '#ffd9a0', opacity: .42, drift: [.01, .025, 0], swirl: .05 }));

    // ---------------- camera ----------------
    camera.fov = 40; camera.near = .05; camera.far = 200; camera.updateProjectionMatrix();
    R.cam = {
      px: mono([[-0.6, .62], [0.4, .5], [1.6, -.1], [2.6, -.4], [5.1, -.5]]), py: mono([[-0.6, 1.95], [5.1, 1.82]]), pz: mono([[-0.6, 5.0], [1.6, 4.86], [3.0, 4.72], [5.1, 4.5]]),
      lx: mono([[-0.6, .34], [0.4, .26], [1.6, -.18], [2.6, -.42], [5.1, -.5]]), ly: mono([[-0.6, 1.63], [5.1, 1.6]]), lz: mono([[-0.6, 0], [5.1, 0]]),
    };
  },

  update(t, ctx) {
    const { ui, U, post, camera } = ctx;
    const C = R.cam; camera.position.set(C.px(t), C.py(t), C.pz(t)).add(U.shake(t, .006, .5, 5)); camera.lookAt(C.lx(t), C.ly(t), C.lz(t)); camera.updateMatrixWorld();
    post.dof.focus = camera.position.distanceTo(new THREE.Vector3(C.lx(t), 1.6, -.15)); post.dof.range = U.lerp(3.0, 1.7, U.prog(t, .4, 2.6)); post.dof.amount = U.lerp(.55, .72, U.prog(t, .4, 2.6));

    // lamp flicker (soft, calm flame)
    const fl = 1 + .05 * Math.sin(t * 13.1) * Math.sin(t * 5.3 + 1) + .025 * Math.sin(t * 23.7);
    R.key.intensity = 2.0 * fl; R.fill.intensity = .62 * (1 + .04 * Math.sin(t * 9.1 + 2)); R.halo.material.opacity = .16 * fl;
    // the alley lamps across the street: fixed flames, gentle flicker only
    R.lanterns.forEach(l => { const f = 1 + .06 * Math.sin(t * 11 + l.ph * 3) * Math.sin(t * 4.3 + l.ph); l.gl.material.opacity = .5 * f; l.core.material.opacity = .9 * f; });
    R.alleyL.intensity = .45 * (1 + .05 * Math.sin(t * 9.7 + 1) * Math.sin(t * 3.1));

    // items: grow in just in front of their compartment (smooth spring: zero start slope, ~4 % overshoot, never a one-frame
    // pop), glide back onto the shelf with a small hop that never reaches the shelf above, land with squash & stretch
    // (bottom stays on the shelf), settle; tags swing outward only (never into the item). Landing beats tl are unchanged.
    const dpos = R.dpos, dal = R.dal; const NP = R.NP; const IS = R.IS;
    R.items.forEach((it, i) => {
      const { obj, base, tl } = it; const travel = .46, t0 = tl - travel;
      const hItem = (obj.userData.h ?? .2) * IS; const room = it.ceil - base.y - hItem * 1.09; const hop = U.clamp(room - .015, 0, .085);
      const tau = t - t0; const pop = tau <= 0 ? 0 : 1 - Math.exp(-9.1 * tau) * (Math.cos(9.28 * tau) + .98 * Math.sin(9.28 * tau)); // zeta .7, wn 13
      if (pop < .002) { obj.visible = false; } else {
        obj.visible = true;
        let y = base.y, z = base.z, x = base.x, sy = 1, rx = 0, rz = 0;
        if (t < tl) { const u = U.clamp(tau / travel); const e = 1 - (1 - u) * (1 - u);
          z = base.z + .2 * (1 - e); x = base.x + .03 * (1 - e) * (i % 2 ? 1 : -1); y = base.y + hop * Math.sin(Math.PI * Math.min(1, u * 1.05)) * (1 - u * .2);
          sy = 1 + .06 * Math.sin(Math.PI * u); rx = -(1 - u) * .12; rz = (1 - u) * .1 * (i % 2 ? 1 : -1); }
        else { const a = t - tl; sy = 1 - .13 * Math.exp(-a * 9) * Math.cos(a * 27); rz = .03 * Math.exp(-a * 7) * Math.sin(a * 21) * (i % 2 ? 1 : -1); }
        const sx = 1 / Math.sqrt(sy); obj.scale.set(IS * pop * sx, IS * pop * sy, IS * pop * sx);
        obj.position.set(x, y, z); obj.rotation.set(rx, it.ry, rz);
        const tg = obj.userData.tag; if (tg) { const a = Math.max(0, t - tl); const rest = obj.userData.tagRest ?? .1; const sw = t < tl ? .5 : .55 * Math.exp(-a * 3.4) * (1 + Math.cos(a * 11)) * .5; tg.rotation.x = rest + sw; tg.rotation.z = Math.sin(a * 8 + i) * .16 * Math.exp(-a * 3); }
      }
      // dust puff
      const a = t - tl; R.puff[i].forEach((p, k) => {
        const j = (i * NP + k); let al = 0; let px = base.x, py = base.y, pz = base.z;
        if (a > 0 && a < p.life) { const q = a / p.life; const r = .06 + p.sp * (1 - Math.exp(-a * 5)) * .45; px += Math.cos(p.a) * r; pz += Math.max(-.12, Math.sin(p.a) * r * .5); py += .01 + p.up * (1 - Math.exp(-a * 3)) * .6; al = (1 - q) * (1 - q) * Math.min(1, a * 20); }
        dpos[j * 3] = px; dpos[j * 3 + 1] = py; dpos[j * 3 + 2] = pz; dal[j] = al;
      });
    });
    R.dg.attributes.position.needsUpdate = true; R.dg.attributes.alpha.needsUpdate = true;

    // ---------------- typography ----------------
    const X = ui.ctx;
    // title block sits inside the text safe zone (circumflex top ~y 236 > 230)
    { const a = U.clamp((t - .15) / .3) * (1 - U.prog(t, 4.3, 4.6)); if (a > 0) { const g = X.createLinearGradient(0, 190, 0, 560); g.addColorStop(0, 'rgba(20,10,6,0)'); g.addColorStop(.3, 'rgba(20,10,6,.5)'); g.addColorStop(.72, 'rgba(20,10,6,.36)'); g.addColorStop(1, 'rgba(20,10,6,0)'); X.save(); X.globalAlpha = a; X.fillStyle = g; X.fillRect(0, 190, 1080, 370); X.restore(); } }
    ui.text('el-Emîn', { t, t0: .3, t1: 4.62, x: 540, y: 293, size: 110, weight: 900, family: 'Playfair Display', color: '#ffd77e', anim: 'pop', letterSpacing: 2, shadowBlur: 26, shadowColor: 'rgba(30,12,0,.8)' });
    ui.underline({ t, t0: .62, t1: 4.62, x: 540, y: 362, w: 290, color: '#ffd77e', width: 6 });
    ui.text('Mekkeliler O’na “el-Emîn” (güvenilir) derdi', { t, t0: 1.38, t1: 4.62, x: 540, y: 420, size: 37, weight: 800, bg: 'rgba(28,16,10,.82)', color: '#fff1d6', anim: 'rise', maxWidth: 920 });
    // "emanet" keyword pointing at the chest's red-wax tag, on the spoken word
    { const tg = R.chest.userData.tag; const wp = new THREE.Vector3(0, -.066, .006); tg.localToWorld(wp); const [ax, ay, az] = ui.project(wp);
      if (az < 1) ui.callout('emanet', { t, t0: ctx.wordTime('emanet') - .2, t1: 4.62, anchor: [ax, ay], to: [U.clamp(ax + 30, 200, 780), U.clamp(ay - 255, 600, 1260)], size: 48, weight: 900, bg: '#f2b84b', color: '#3b2208', dotColor: '#ff5a4e', lineColor: 'rgba(255,236,200,.95)' }); }
  },
};
