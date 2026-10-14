// Shared procedural models (code-built, Pixar-like stylization: soft bevels, warm materials, slight hand-made irregularity).
// Units: meters. Every function returns a THREE.Group (or Mesh) with castShadow/receiveShadow set.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TEX from './textures.js';
import { rng } from './util.js';
import { flame, glow } from './fx.js';
import { pointLight } from './env.js';

export const shadowAll = (o, cast = true, receive = true) => { o.traverse(c => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = receive; } }); return o; };
export const rbox = (w, h, d, r = 0.02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));

// ---- Materials -------------------------------------------------------------------------------
export const MAT = {
  wood: (o = {}) => { const t = TEX.wood({ a: o.a ?? '#8a5a34', b: o.b ?? '#5a361d', rings: o.rings ?? 16, seed: o.seed ?? 11, repeat: o.repeat ?? [1, 1] }); return new THREE.MeshPhysicalMaterial({ map: t.map, roughnessMap: t.roughnessMap, normalMap: t.normalMap, normalScale: new THREE.Vector2(.4, .4), roughness: 1, clearcoat: o.clearcoat ?? .25, clearcoatRoughness: .45, color: o.tint ?? '#ffffff' }); },
  darkWood: (o = {}) => MAT.wood({ a: '#5b3720', b: '#2e1a0e', ...o }),
  leather: (o = {}) => { const t = TEX.leather({ a: o.a ?? '#7a2a1c', b: o.b ?? '#4a160d', seed: o.seed ?? 13 }); return new THREE.MeshPhysicalMaterial({ map: t.map, roughnessMap: t.roughnessMap, normalMap: t.normalMap, normalScale: new THREE.Vector2(.6, .6), roughness: 1, sheen: .4, sheenColor: new THREE.Color('#ffd8b0'), sheenRoughness: .6 }); },
  gold: (o = {}) => { const t = TEX.brushedMetal({ a: o.a ?? '#f2c75c', b: o.b ?? '#b98a2e' }); return new THREE.MeshPhysicalMaterial({ map: t.map, roughnessMap: t.roughnessMap, metalness: 1, roughness: 1, clearcoat: .3 }); },
  brass: (o = {}) => MAT.gold({ a: '#d6a94e', b: '#8c6324', ...o }),
  iron: () => new THREE.MeshStandardMaterial({ color: '#3a3836', metalness: .85, roughness: .45 }),
  steel: () => new THREE.MeshPhysicalMaterial({ color: '#c9ccd2', metalness: 1, roughness: .22, clearcoat: .5 }),
  clay: (o = {}) => { const t = TEX.plaster({ a: o.a ?? '#c9774a', b: o.b ?? '#9a5232', seed: o.seed ?? 31, repeat: [1, 1] }); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.5, .5), roughness: .82, sheen: .3, sheenColor: new THREE.Color('#ffc9a0') }); },
  plaster: (o = {}) => { const t = TEX.plaster({ a: o.a ?? '#dcbc90', b: o.b ?? '#b58c5f', seed: o.seed ?? 5, repeat: o.repeat ?? [1, 1] }); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.8, .8), roughness: .95 }); },
  stone: (o = {}) => { const t = TEX.stone({ a: o.a ?? '#c8b79c', b: o.b ?? '#8a7a64', seed: o.seed ?? 7, blocks: o.blocks ?? 0, repeat: o.repeat ?? [1, 1] }); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: .9 }); },
  sand: (o = {}) => { const t = TEX.sand({ a: o.a ?? '#ecc690', b: o.b ?? '#c8955a', repeat: o.repeat ?? [10, 10] }); return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, normalScale: new THREE.Vector2(.7, .7), roughness: .95 }); },
  parchment: (o = {}) => { const t = TEX.parchment({ a: o.a ?? '#f4e4c1', b: o.b ?? '#d8bb8c' }); return new THREE.MeshStandardMaterial({ map: t.map, roughness: .9 }); },
  fabric: (o = {}) => { const t = TEX.fabric({ a: o.a ?? '#2f5e3a', b: o.b ?? '#1c3a23', weave: o.weave ?? 140 }); return new THREE.MeshPhysicalMaterial({ map: t.map, normalMap: t.normalMap, roughness: 1, sheen: 1, sheenColor: new THREE.Color(o.sheen ?? '#9fd0a8'), sheenRoughness: .5 }); },
  wax: (o = {}) => new THREE.MeshPhysicalMaterial({ color: o.color ?? '#f3e6cf', roughness: .55, transmission: .25, thickness: .05, attenuationColor: new THREE.Color('#ffcf8a'), attenuationDistance: .05, sheen: .5 }),
  glass: (o = {}) => new THREE.MeshPhysicalMaterial({ color: o.color ?? '#ffffff', roughness: .05, transmission: 1, thickness: .02, ior: 1.5, transparent: true }),
  paper: () => new THREE.MeshStandardMaterial({ color: '#f1e6cc', roughness: .95 }),
  emissive: (c = '#ffb347', i = 3) => new THREE.MeshStandardMaterial({ color: '#000', emissive: c, emissiveIntensity: i }),
};

// ---- Lathe helper: profile [[r,y],...] -> smooth revolved mesh -------------------------------
export function lathe(profile, mat, seg = 48) { const pts = profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)); const m = new THREE.Mesh(new THREE.LatheGeometry(pts, seg), mat); m.castShadow = m.receiveShadow = true; return m; }

// ---- Candle with dripping wax, wick, animated flame, optional point light ---------------------
// o: {height=.18, radius=.025, color, light:true, lightIntensity, seed}
export function candle(o = {}) {
  const g = new THREE.Group(); const h = o.height ?? .18, r = o.radius ?? .025, R = rng(o.seed ?? 3);
  const prof = []; for (let i = 0; i <= 12; i++) { const y = h * i / 12; prof.push([r * (1 + (R() - .5) * .04), y]); }
  prof.push([r * .92, h + .004], [r * .55, h - .006], [r * .1, h - .004]);
  const body = lathe([[0, 0], [r * 1.02, 0], ...prof], MAT.wax({ color: o.color }), 40); g.add(body);
  for (let i = 0; i < 4; i++) { const a = R() * 6.28, len = h * (.15 + R() * .35); const d = new THREE.Mesh(new THREE.CapsuleGeometry(r * .13, len, 4, 8), body.material); d.position.set(Math.cos(a) * r * .98, h - len / 2, Math.sin(a) * r * .98); d.castShadow = true; g.add(d); }
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .0018, .014, 6), new THREE.MeshStandardMaterial({ color: '#1a120b', roughness: 1 })); wick.position.y = h + .005; g.add(wick);
  const f = flame({ height: o.flameHeight ?? .045, seed: o.seed ?? 1 }); f.position.y = h + .01; g.add(f);
  const gl = glow({ size: .22, opacity: .35 }); gl.position.y = h + .035; g.add(gl);
  if (o.light !== false) { const l = pointLight({ intensity: o.lightIntensity ?? 1.6, distance: o.lightDistance ?? 3, pos: [0, h + .06, 0], castShadow: !!o.shadow }); g.add(l); g.userData.light = l; }
  g.userData.flame = f; g.userData.glow = gl; return g;
}

// ---- Clay oil lamp (kandil) as used in 7th-century Arabia ------------------------------------
export function oilLamp(o = {}) {
  const g = new THREE.Group(); const s = o.scale ?? 1; const mat = MAT.clay({ seed: o.seed ?? 31 });
  const body = lathe([[0, 0], [.035, 0], [.05, .008], [.055, .018], [.05, .026], [.03, .032], [.012, .034], [.014, .042], [.008, .044]], mat, 40);
  body.scale.set(1, 1, 1.15); g.add(body);
  const spout = new THREE.Mesh(new THREE.CapsuleGeometry(.012, .05, 6, 12), mat); spout.rotation.z = Math.PI / 2 - .25; spout.position.set(.062, .022, 0); spout.castShadow = true; g.add(spout);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(.016, .006, 8, 16, Math.PI * 1.2), mat); handle.position.set(-.058, .028, 0); handle.rotation.y = Math.PI / 2; handle.rotation.x = .2; g.add(handle);
  const f = flame({ height: .05, seed: o.seed ?? 2 }); f.position.set(.088, .036, 0); g.add(f);
  const gl = glow({ size: .3, opacity: .45 }); gl.position.set(.088, .06, 0); g.add(gl);
  if (o.light !== false) { const l = pointLight({ intensity: o.lightIntensity ?? 1.4, distance: o.lightDistance ?? 2.5, pos: [.09, .08, 0] }); g.add(l); g.userData.light = l; }
  g.userData.flame = f; g.userData.glow = gl; g.scale.setScalar(s); return g;
}

// ---- Book (closed): cover + page block + spine bands. o: {w,h,d,color,b(dark),gold:true,title(drawn on spine), coverTex(fn)}
export function book(o = {}) {
  const g = new THREE.Group(); const w = o.w ?? .16, h = o.h ?? .23, d = o.d ?? .045; const ct = .0045;
  const leather = o.material ?? MAT.leather({ a: o.color ?? '#6d2418', b: o.dark ?? '#3c0f08', seed: o.seed ?? 13 });
  const pageTex = TEX.drawTexture(64, 256, (x, W, H) => { x.fillStyle = '#efe2c4'; x.fillRect(0, 0, W, H); for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(120,90,50,${0.08 + (i % 6 === 0 ? .08 : 0)})`; x.fillRect(0, i, W, 1); } });
  const pages = new THREE.Mesh(rbox(w - .006, h - .01, d - ct * 2, .003, 2), new THREE.MeshStandardMaterial({ map: pageTex, roughness: .95, color: o.pageColor ?? '#ffffff' }));
  pages.position.x = .003; g.add(pages);
  const front = new THREE.Mesh(rbox(w, h, ct, .002, 2), leather); front.position.z = d / 2 - ct / 2; g.add(front);
  const back = front.clone(); back.position.z = -d / 2 + ct / 2; g.add(back);
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(d / 2, d / 2, h, 24, 1, false, Math.PI, Math.PI), leather); spine.position.x = -w / 2; g.add(spine);
  if (o.gold !== false) {
    const gm = MAT.gold();
    for (const y of [-h * .34, -h * .12, h * .12, h * .34]) { const band = new THREE.Mesh(new THREE.TorusGeometry(d / 2 + .0008, .0016, 6, 24, Math.PI), gm); band.rotation.set(Math.PI / 2, 0, Math.PI / 2); band.position.set(-w / 2, y, 0); g.add(band); }
  }
  if (o.coverDraw) { const tex = TEX.drawTexture(512, Math.round(512 * h / w), o.coverDraw); const cv = new THREE.Mesh(new THREE.PlaneGeometry(w * .96, h * .97), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: .5, metalness: .2, clearcoat: .2 })); cv.position.z = d / 2 + .0003; g.add(cv); }
  if (o.spineDraw) { const tex = TEX.drawTexture(128, Math.round(128 * h / d), o.spineDraw); const sp = new THREE.Mesh(new THREE.PlaneGeometry(d * .9, h * .95), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: .5, metalness: .3 })); sp.position.set(-w / 2 - d / 2 - .0005, 0, 0); sp.rotation.y = -Math.PI / 2; g.add(sp); }
  return shadowAll(g);
}

// ---- Open book with curved pages. o: {w (single page), h, leftDraw(ctx,W,H), rightDraw(ctx,W,H), color}
export function openBook(o = {}) {
  const g = new THREE.Group(); const w = o.w ?? .16, h = o.h ?? .23; const leather = MAT.leather({ a: o.color ?? '#6d2418', b: o.dark ?? '#3c0f08' });
  const cover = new THREE.Mesh(rbox(w * 2 + .02, .006, h + .012, .003), leather); cover.position.y = -.003; g.add(cover);
  const mkPage = (side, draw) => {
    const geo = new THREE.PlaneGeometry(w, h, 24, 1); const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i) + w / 2; const u = x / w; p.setX(i, side * x); p.setZ(i, 0); p.setY(i, p.getY(i)); }
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < p.count; i++) { const x = Math.abs(p.getX(i)) / w; p.setY(i, .012 + Math.sin(Math.min(x * 1.25, 1) * Math.PI * .5) * .012 - x * x * .006); }
    geo.computeVertexNormals();
    const tex = TEX.drawTexture(512, Math.round(512 * h / w), (x, W, H) => { x.fillStyle = '#f3e7cb'; x.fillRect(0, 0, W, H); const gr = x.createLinearGradient(side > 0 ? 0 : W, 0, side > 0 ? W * .2 : W * .8, 0); gr.addColorStop(0, 'rgba(90,60,30,.35)'); gr.addColorStop(1, 'rgba(90,60,30,0)'); x.fillStyle = gr; x.fillRect(0, 0, W, H); if (draw) draw(x, W, H); });
    if (side < 0) { tex.wrapS = THREE.RepeatWrapping; tex.repeat.x = -1; }
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: .92, side: THREE.DoubleSide })); return m;
  };
  g.add(mkPage(1, o.rightDraw)); g.add(mkPage(-1, o.leftDraw));
  const block = new THREE.Mesh(rbox(w * 2 - .01, .012, h - .004, .004), new THREE.MeshStandardMaterial({ color: '#e9dcbc', roughness: .95 })); block.position.y = .004; g.add(block);
  return shadowAll(g);
}

// ---- Rahle: traditional X-shaped folding wooden book stand (carved from one board) ------------
export function rahle(o = {}) {
  const g = new THREE.Group(); const L = o.length ?? .5, W = o.width ?? .22, T = .014; const mat = o.material ?? MAT.wood({ a: '#8b5a2b', b: '#4f2f15', rings: 22 });
  const shape = new THREE.Shape(); shape.moveTo(-W / 2, 0); shape.lineTo(W / 2, 0); shape.lineTo(W / 2, L * .55); shape.quadraticCurveTo(W / 2, L, 0, L); shape.quadraticCurveTo(-W / 2, L, -W / 2, L * .55); shape.closePath();
  const hole = new THREE.Path(); hole.absellipse(0, L * .2, W * .16, L * .06, 0, Math.PI * 2, true); shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: .003, bevelSize: .003, bevelSegments: 2, curveSegments: 24 }); geo.translate(0, 0, -T / 2);
  // Side view is an X: board A leans forward (+z at top), board B leans back; they cross at fraction c of their length.
  const th = o.angle ?? 1.0, c = .42;
  const a = new THREE.Mesh(geo, mat), b = new THREE.Mesh(geo, mat);
  a.rotation.x = th; a.position.set(0, 0, -L * Math.sin(th) * c);
  b.rotation.x = -th; b.position.set(0, 0, L * Math.sin(th) * c); b.scale.x = .9; // inner leaf a bit narrower (interlocked)
  g.add(a, b);
  g.userData.crossY = c * L * Math.cos(th); g.userData.topY = L * Math.cos(th); g.userData.bookY = c * L * Math.cos(th) + .06; g.userData.openAngle = th;
  return shadowAll(g);
}

// ---- Mushaf (closed Qur'an) with geometric gold-tooled leather cover & flap (miklep). NO script/letters.
export function mushaf(o = {}) {
  const w = o.w ?? .17, h = o.h ?? .24, d = o.d ?? .05;
  const draw = (x, W, H) => {
    x.clearRect(0, 0, W, H); x.strokeStyle = '#e8c06a'; x.fillStyle = '#e8c06a';
    x.lineWidth = W * .012; x.strokeRect(W * .06, H * .045, W * .88, H * .91); x.lineWidth = W * .005; x.strokeRect(W * .09, H * .065, W * .82, H * .87);
    // central şemse (almond medallion) with 8-point star rosette
    const cx = W / 2, cy = H / 2; x.save(); x.translate(cx, cy); x.beginPath(); x.ellipse(0, 0, W * .28, H * .2, 0, 0, Math.PI * 2); x.globalAlpha = .9; x.fill(); x.globalAlpha = 1;
    x.fillStyle = '#5a170d'; for (let k = 0; k < 2; k++) { x.save(); x.rotate(k * Math.PI / 4); x.fillRect(-W * .09, -W * .09, W * .18, W * .18); x.restore(); }
    x.fillStyle = '#e8c06a'; x.beginPath(); x.arc(0, 0, W * .045, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 16; i++) { x.save(); x.rotate(i * Math.PI / 8); x.beginPath(); x.ellipse(0, -W * .19, W * .018, W * .04, 0, 0, Math.PI * 2); x.fill(); x.restore(); }
    x.restore();
    // corner quarter-medallions (köşebent)
    for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { x.save(); x.translate(W * (.09 + sx * .82), H * (.065 + sy * .87)); x.beginPath(); x.arc(0, 0, W * .16, (sx ? Math.PI / 2 : 0) + (sy ? (sx ? 0 : Math.PI * 1.5) : 0), (sx ? Math.PI : Math.PI / 2) + (sy ? (sx ? 0 : Math.PI * 1.5) : 0)); x.restore(); }
    x.globalAlpha = .85; const cs = [[W * .09, H * .065, 0], [W * .91, H * .065, Math.PI / 2], [W * .91, H * .935, Math.PI], [W * .09, H * .935, -Math.PI / 2]];
    cs.forEach(([px, py, r]) => { x.save(); x.translate(px, py); x.rotate(r); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, W * .15, 0, Math.PI / 2); x.closePath(); x.fill(); x.restore(); });
  };
  const g = book({ w, h, d, color: o.color ?? '#5e1a10', dark: o.dark ?? '#300a05', coverDraw: draw, seed: 21, gold: false });
  // flap (miklep) folded over fore-edge
  const leather = g.children[1].material; const flap = new THREE.Mesh(rbox(.004, h, d + .008, .002), leather); flap.position.x = w / 2 + .001; g.add(flap);
  return shadowAll(g);
}

// ---- Desk (simple 18th/19th c. writing desk) -------------------------------------------------
export function desk(o = {}) {
  const g = new THREE.Group(); const W = o.w ?? 1.4, D = o.d ?? .75, H = o.h ?? .76; const mat = o.material ?? MAT.darkWood({ rings: 10, repeat: [1, 1] });
  const top = new THREE.Mesh(rbox(W, .045, D, .012), mat); top.position.y = H; g.add(top);
  const apron = new THREE.Mesh(rbox(W - .1, .12, D - .1, .01), mat); apron.position.y = H - .08; g.add(apron);
  const legGeo = new THREE.LatheGeometry([[.0, 0], [.035, 0], [.03, .05], [.022, .2], [.032, .32], [.028, .5], [.035, .62], [.035, H - .05], [0, H - .05]].map(([r, y]) => new THREE.Vector2(Math.max(r, 1e-4), y)), 16);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = new THREE.Mesh(legGeo, mat); l.position.set(sx * (W / 2 - .07), 0, sz * (D / 2 - .07)); g.add(l); }
  if (o.leather !== false) { const pad = new THREE.Mesh(rbox(W * .6, .004, D * .55, .002), MAT.leather({ a: '#2f4a2c', b: '#16261a' })); pad.position.set(0, H + .024, .02); g.add(pad); }
  g.userData.topY = H + .0225; return shadowAll(g);
}

// ---- Quill + inkwell ---------------------------------------------------------------------------
export function inkwell(o = {}) {
  const g = new THREE.Group();
  const pot = lathe([[0, 0], [.035, 0], [.04, .01], [.04, .035], [.025, .045], [.012, .05], [.014, .058], [0, .058]], new THREE.MeshPhysicalMaterial({ color: '#1d2a3a', roughness: .08, transmission: .3, thickness: .02, clearcoat: 1 }), 32);
  g.add(pot);
  if (o.quill !== false) {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.0015, .003, .28, 8), new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: .6 })); shaft.position.set(.0, .17, 0); shaft.rotation.z = -.35; g.add(shaft);
    const vaneShape = new THREE.Shape(); vaneShape.moveTo(0, 0); vaneShape.quadraticCurveTo(.03, .07, .012, .19); vaneShape.lineTo(0, .2); vaneShape.quadraticCurveTo(-.018, .1, 0, 0);
    const vane = new THREE.Mesh(new THREE.ShapeGeometry(vaneShape, 16), new THREE.MeshPhysicalMaterial({ color: '#f6f1e7', roughness: .7, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color('#ffffff') }));
    vane.position.set(.035, .2, 0); vane.rotation.z = -.35; g.add(vane);
  }
  return shadowAll(g);
}

// ---- Desert dunes terrain (heightfield). o: {size, seg, height, seed, color a/b, flatCenter radius}
export function dunes(o = {}) {
  const size = o.size ?? 200, seg = o.seg ?? 200, H = o.height ?? 6; const f = TEX.fbmField(o.seed ?? 5, 2, 5);
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2); const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i); const u = x / size + .5, v = z / size + .5;
    let h = f(u, v) * .5 + .5; const ridge = 1 - Math.abs(f(u * 1.0 + .3, v * .7) * 2); h = h * .55 + Math.pow(Math.max(ridge, 0), 2.5) * .65;
    const fc = o.flatCenter ? Math.min(1, Math.hypot(x - (o.flatAt?.[0] ?? 0), z - (o.flatAt?.[1] ?? 0)) / o.flatCenter) : 1;
    p.setY(i, h * H * (fc * fc * (3 - 2 * fc)));
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, o.material ?? MAT.sand({ a: o.a, b: o.b, repeat: [size / 6, size / 6] })); m.receiveShadow = true; m.castShadow = false;
  m.userData.heightAt = (x, z) => { const u = x / size + .5, v = z / size + .5; let h = f(u, v) * .5 + .5; const ridge = 1 - Math.abs(f(u + .3, v * .7) * 2); h = h * .55 + Math.pow(Math.max(ridge, 0), 2.5) * .65; const fc = o.flatCenter ? Math.min(1, Math.hypot(x - (o.flatAt?.[0] ?? 0), z - (o.flatAt?.[1] ?? 0)) / o.flatCenter) : 1; return h * H * (fc * fc * (3 - 2 * fc)); };
  return m;
}

// ---- Date palm ---------------------------------------------------------------------------------
export function palm(o = {}) {
  const g = new THREE.Group(); const R = rng(o.seed ?? 9); const H = o.height ?? 6; const lean = o.lean ?? .15;
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(lean * .3, H * .35, 0), new THREE.Vector3(lean * .8, H * .7, 0), new THREE.Vector3(lean * 1.4, H, 0)]);
  const trunkTex = TEX.drawTexture(64, 512, (x, W, Hh) => { x.fillStyle = '#7a5a3a'; x.fillRect(0, 0, W, Hh); for (let y = 0; y < Hh; y += 12) { x.fillStyle = '#5a3f26'; x.beginPath(); x.moveTo(0, y); x.lineTo(W / 2, y + 8); x.lineTo(W, y); x.lineTo(W, y + 4); x.lineTo(W / 2, y + 12); x.lineTo(0, y + 4); x.fill(); } });
  trunkTex.wrapS = trunkTex.wrapT = THREE.RepeatWrapping; trunkTex.repeat.set(3, 2);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, H * .028, 10), new THREE.MeshStandardMaterial({ map: trunkTex, roughness: 1 })); g.add(trunk);
  const top = curve.getPoint(1); const leafMat = new THREE.MeshStandardMaterial({ color: o.leafColor ?? '#4f7a32', roughness: .8, side: THREE.DoubleSide });
  const n = o.fronds ?? 16;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + R() * .3, droop = .5 + R() * .7, L = H * (.32 + R() * .12);
    const pts = []; for (let k = 0; k <= 10; k++) { const s = k / 10; pts.push(new THREE.Vector3(Math.cos(a) * s * L, Math.sin(s * Math.PI * .5) * L * .25 - s * s * L * droop * .6, Math.sin(a) * s * L)); }
    const fc = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.BufferGeometry(); const verts = [], idx = []; const M = 40;
    for (let k = 0; k <= M; k++) { const s = k / M; const p = fc.getPoint(s); const tng = fc.getTangent(s); const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)); const w = Math.sin(s * Math.PI) * L * .13 * (1 - s * .3); const lf = Math.sin(k * 2.2) * .02; verts.push(p.x - side.x * w, p.y - w * .35 + lf, p.z - side.z * w, p.x, p.y + .02, p.z, p.x + side.x * w, p.y - w * .35 - lf, p.z + side.z * w); if (k < M) { const b = k * 3; idx.push(b, b + 1, b + 3, b + 1, b + 4, b + 3, b + 1, b + 2, b + 4, b + 2, b + 5, b + 4); } }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, leafMat); leaf.position.copy(top); g.add(leaf);
  }
  const dates = new THREE.Mesh(new THREE.SphereGeometry(H * .05, 12, 8), new THREE.MeshStandardMaterial({ color: '#a3561c', roughness: .6 })); dates.position.copy(top).add(new THREE.Vector3(.1, -.25, .05)); dates.scale.set(1, 1.4, 1); g.add(dates);
  return shadowAll(g);
}

// ---- Hejaz mudbrick/stone house (flat roof, parapet, small windows, wooden door) ---------------
export function house(o = {}) {
  const g = new THREE.Group(); const w = o.w ?? 4, h = o.h ?? 3.2, d = o.d ?? 4; const R = rng(o.seed ?? 1);
  const wallMat = o.material ?? MAT.plaster({ a: o.a ?? '#d8b48a', b: o.b ?? '#a97f55', seed: o.seed ?? 5, repeat: [1, 1] });
  const body = new THREE.Mesh(rbox(w, h, d, .08), wallMat); body.position.y = h / 2; g.add(body);
  const par = new THREE.Mesh(rbox(w + .05, .35, d + .05, .06), wallMat); par.position.y = h + .1; g.add(par);
  const roofIn = new THREE.Mesh(new THREE.BoxGeometry(w - .3, .1, d - .3), new THREE.MeshStandardMaterial({ color: '#8a6a48', roughness: 1 })); roofIn.position.y = h + .2; g.add(roofIn);
  const doorMat = MAT.darkWood({ rings: 30 });
  const door = new THREE.Mesh(rbox(.9, 1.7, .12, .03), doorMat); door.position.set(R.range(-w * .25, w * .25), .85, d / 2 + .01); g.add(door);
  const winMat = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 1, emissive: o.windowGlow ?? '#000000', emissiveIntensity: o.windowGlow ? 2.5 : 0 });
  const nWin = 1 + Math.floor(R() * 2);
  for (let i = 0; i < nWin; i++) { const wi = new THREE.Mesh(rbox(.45, .55, .1, .03), winMat); wi.position.set((i - (nWin - 1) / 2) * w * .4, h * .72, d / 2 + .01); g.add(wi); }
  g.userData.door = door; g.userData.windowMat = winMat;
  return shadowAll(g);
}
