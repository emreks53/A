// Canlılar (s06 ve s08 ortak): uğur böceği, arı, su kabarcığında balık, kuş, tavşan, ceylan, koyun, kelebek.
// Sevimli ama sade akrilik figürler; her biri küçük bir çimen öbeğinin (kaide) üstünde durur.
// Kuş, koyun ve kelebek _s05_lib'den gelir (s05/s10 ile aynı görünüm). Hepsi deterministik; darbe tohumları nesneye bağlı.
// Ortak arayüz: fn(ctx, x, y, s, o) — x,y tabanın (yere bastığı yerin) ortası; s ölçek;
// o: { dir (1 sağa bakar), t (sn), look (0..1 başını kaldırıp yukarı bakma), la (ışık açısı), phase, seed }
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const L = require('./_s05_lib');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, deg } = C;

const INK = '#1D1B2E';

// yerel çerçeve: önce yerel dönüş (rot, + saat yönü), sonra yön aynası ve ölçek
function F(x, y, s, dir = 1, rot = 0) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return (u, v) => { const U = u * c - v * sn, V = u * sn + v * c; return [x + U * dir * s, y + V * s]; };
}
// alt çerçeve: (pu,pv) pivotu çevresinde a kadar dönmüş yerel koordinat → üst çerçeve
function sub(T, pu, pv, a) {
  const c = Math.cos(a), sn = Math.sin(a);
  return (u, v) => T(pu + u * c - v * sn, pv + u * sn + v * c);
}
const mp = (T, pts) => pts.map(([u, v]) => T(u, v));
const ell = (T, cu, cv, rx, ry, n = 20) => mp(T, P.ellipsePts(cu, cv, rx, ry, n));
const sm = (T, ctrl, per = 5) => mp(T, P.smoothPts(ctrl, true, per));

function eye(ctx, p, r, dir, o = {}) {
  if ((o.blink ?? 0) > 0.5) {
    ctx.strokeStyle = o.color || INK; ctx.lineWidth = Math.max(1, r * 0.55); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(p[0], p[1] - r * 0.3, r * 0.9, 0.25, Math.PI - 0.25); ctx.stroke();
    return;
  }
  if (o.white) { ctx.fillStyle = '#FBF7EE'; ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.55, 0, TAU); ctx.fill(); }
  const px = p[0] + (o.white ? dir * r * 0.4 : 0);
  ctx.fillStyle = o.color || INK; ctx.beginPath(); ctx.arc(px, p[1], r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.beginPath(); ctx.arc(px + dir * r * 0.32, p[1] - r * 0.36, r * 0.38, 0, TAU); ctx.fill();
}
function line(ctx, pts, w, color) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
}
function dot(ctx, p, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); }
// kısa bir göz kırpma takvimi (deterministik)
function blinkAt(t, ph) { const k = (t * 0.42 + ph * 0.137) % 1; return k > 0.955 ? 1 : 0; }

// ---------- uğur böceği (yandan) ----------
const LADY = { shell: '#E2362C', shellD: '#98202E', shellL: '#FF7A55', body: '#2A2238', bodyL: '#4A4060' };
function ladybug(ctx, x, y, s, o = {}) {
  const dir = o.dir ?? 1, la = o.la ?? -2.3, t = o.t ?? 0, look = clamp(o.look ?? 0), ph = o.phase ?? 0;
  const T = F(x, y, s, dir, 0);
  const cr = Math.sin(t * 5.5 + ph);
  const lift = -0.008 * Math.abs(cr);
  // bacaklar (uzak sıra biraz geride ve açık)
  const leg = (u0, p, far) => {
    const sw = Math.sin(t * 5.5 + ph + p) * 0.018;
    line(ctx, [T(u0, -0.1 + lift), T(u0 + 0.075 + sw, -0.075), T(u0 + 0.105 + sw * 1.4, 0)], Math.max(1.3, s * 0.038), far ? '#3A3354' : INK);
  };
  for (const [u, p] of [[-0.2, 1], [0.0, 3], [0.18, 5]]) leg(u + 0.035, p, true);
  // baş (gövdenin önünde, kabuğun altından çıkar)
  const ha = -deg(22) * look + Math.sin(t * 1.7 + ph) * deg(3);
  const H = sub(T, 0.3, -0.12 + lift, ha);
  // anten
  for (const [k, off] of [[0, 0], [1, 0.05]]) {
    const w = Math.sin(t * 3.2 + ph + k * 1.3) * 0.05 - look * 0.06;
    const a = H(0.06 + off * 0.4, -0.09), b = H(0.13 + off + w * 0.5, -0.2 - look * 0.03), c = H(0.2 + off + w, -0.27 - look * 0.06);
    line(ctx, [a, b, c], Math.max(1, s * 0.026), k ? '#3A3354' : INK);
    dot(ctx, c, Math.max(1.4, s * 0.03), k ? '#3A3354' : INK);
  }
  L.blob(ctx, ell(H, 0.08, 0.0, 0.135, 0.12, 18), LADY.body, { dark: '#17121F', light: LADY.bodyL, la, size: s * 0.12, ks: 0.3, rim: true, rimW: Math.max(1.2, s * 0.02) });
  eye(ctx, H(0.12, -0.02), s * 0.028, dir, { white: true });
  // ön göğüs (siyah, beyaz lekeli)
  const pro = sm(T, [[0.18, -0.36 + lift], [0.32, -0.3 + lift], [0.38, -0.16 + lift], [0.3, -0.09 + lift], [0.18, -0.16 + lift]], 4);
  L.blob(ctx, pro, LADY.body, { dark: '#17121F', light: LADY.bodyL, la, size: s * 0.12, ks: 0.3 });
  L.blob(ctx, ell(T, 0.29, -0.22 + lift, 0.04, 0.035, 12), '#F4EEE4', { dark: '#C9C0D8', light: '#FFFFFF', la, size: s * 0.04 });
  // kabuk (kubbe)
  const shell = sm(T, [[-0.44, -0.08], [-0.43, -0.27], [-0.27, -0.44], [0.0, -0.5], [0.2, -0.44], [0.32, -0.3], [0.34, -0.12], [0.2, -0.07], [-0.1, -0.06]].map(([u, v]) => [u, v + lift]), 6);
  const sp = L.blob(ctx, shell, LADY.shell, { dark: LADY.shellD, light: LADY.shellL, la, size: s * 0.42, ks: 0.22, kl: 0.1, rim: true, rimW: Math.max(1.5, s * 0.025) });
  ctx.save(); ctx.clip(sp);
  for (const [u, v, r] of [[-0.27, -0.22, 0.075], [-0.05, -0.36, 0.08], [0.17, -0.24, 0.065], [-0.17, -0.1, 0.05], [0.07, -0.12, 0.055], [-0.4, -0.38, 0.06]]) {
    L.blob(ctx, ell(T, u, v + lift, r, r * 0.92, 14), '#251E30', { dark: '#120E18', light: '#4A4060', la, size: s * r, ks: 0.3 });
  }
  // kabuğun alt kenarında koyu bant (kanat örtüsü kıvrımı)
  ctx.strokeStyle = rgba(LADY.shellD, 0.8); ctx.lineWidth = Math.max(1.2, s * 0.03);
  ctx.beginPath(); const q0 = T(-0.42, -0.1 + lift), q1 = T(0.0, -0.075 + lift), q2 = T(0.3, -0.1 + lift); ctx.moveTo(q0[0], q0[1]); ctx.quadraticCurveTo(q1[0], q1[1], q2[0], q2[1]); ctx.stroke();
  P.texture(ctx, P.bbox(shell), 0.3, 0.35, 0.3);
  ctx.restore();
  // parlak cila vurgusu
  const arc = []; for (let k = 0; k <= 8; k++) { const a = lerp(-2.55, -1.75, k / 8); arc.push(T(-0.06 + Math.cos(a) * 0.3, -0.12 + lift + Math.sin(a) * 0.3)); }
  P.curveStroke(ctx, arc, s * 0.045, rgba('#FFF4EC', 0.85), 11, { taper: true, bristles: 1, detail: 0 });
  return { head: H(0.1, -0.05) };
}

// ---------- arı (havada süzülen, yandan) ----------
const BEE = { y: '#F6C33A', yD: '#C98A1E', yL: '#FFE58A', k: '#2A2238', kL: '#4A4060', fur: '#E9A23B', wing: '#EAF6FF' };
function bee(ctx, x, y, s, o = {}) {
  const dir = o.dir ?? 1, la = o.la ?? -2.3, t = o.t ?? 0, look = clamp(o.look ?? 0), ph = o.phase ?? 0;
  const hx = Math.sin(t * 1.6 + ph) * 0.06 * s * (o.drift ?? 1), hy = Math.sin(t * 3.3 + ph) * 0.06 * s;
  const rot = -deg(16) * look + Math.sin(t * 2.4 + ph) * deg(4);
  const T = F(x + hx * dir, y + hy, s, dir, rot);
  // kanatlar: hızlı çırpış → bulanık yelpaze + net kanat (titremesin diye yavaş salınan)
  const wing = (far) => {
    const base = far ? -0.5 : -0.35, fl = Math.sin(t * 9 + ph) * 0.18;
    const W = (a) => sub(T, 0.06, -0.12, a);
    ctx.save();
    for (const da of [-0.5, -0.17, 0.17, 0.5]) { ctx.fillStyle = rgba(BEE.wing, far ? 0.12 : 0.16); ctx.fill(P.pathOf(ell(W(base + da + fl), -0.02, -0.17, 0.11, 0.2, 18))); }
    const wp = ell(W(base + fl), -0.02, -0.17, 0.11, 0.2, 18);
    ctx.fillStyle = rgba(far ? '#D6E6F6' : BEE.wing, far ? 0.45 : 0.62); ctx.fill(P.pathOf(wp));
    ctx.strokeStyle = rgba('#FFFFFF', 0.85); ctx.lineWidth = Math.max(1, s * 0.016); ctx.stroke(P.pathOf(wp));
    const vb = W(base + fl); line(ctx, [vb(-0.02, -0.04), vb(-0.02, -0.3)], Math.max(0.8, s * 0.01), rgba('#9FB8D8', 0.7));
    ctx.restore();
  };
  wing(true);
  // bacaklar
  for (const [u, k] of [[0.06, 0], [-0.04, 1], [-0.13, 2]]) { const sw = Math.sin(t * 2 + k) * 0.02; line(ctx, [T(u, 0.12), T(u + 0.03 + sw, 0.22), T(u + 0.01 + sw, 0.28)], Math.max(1.1, s * 0.03), INK); }
  // iğne
  ctx.fillStyle = INK; ctx.fill(P.pathOf(mp(T, [[-0.43, 0.02], [-0.6, 0.07], [-0.43, 0.11]])));
  // karın (çizgili)
  const ab = ell(T, -0.2, 0.05, 0.27, 0.215, 26);
  const ap = L.blob(ctx, ab, BEE.y, { dark: BEE.yD, light: BEE.yL, la, size: s * 0.3, ks: 0.26, kl: 0.12, rim: true, rimW: Math.max(1.2, s * 0.022) });
  ctx.save(); ctx.clip(ap);
  for (const [u0, u1] of [[-0.12, -0.03], [-0.31, -0.22]]) {
    const band = mp(T, [[u0 + 0.02, -0.3], [u1 + 0.02, -0.3], [u1 - 0.02, 0.35], [u0 - 0.02, 0.35]]);
    L.blob(ctx, band, BEE.k, { dark: '#17121F', light: BEE.kL, la, size: s * 0.2, ks: 0.25 });
  }
  P.texture(ctx, P.bbox(ab), 0.2, 0.35, 0.25);
  ctx.restore();
  // göğüs (tüylü)
  L.blob(ctx, ell(T, 0.09, -0.01, 0.16, 0.155, 20), BEE.fur, { dark: '#A8641E', light: '#FFD07A', la, size: s * 0.16, ks: 0.3, rim: true, rimW: Math.max(1, s * 0.02) });
  const rr = rng(o.seed ?? 21);
  for (let i = 0; i < 6; i++) { const a = rr.range(-2.8, 0.2), p0 = T(0.09 + Math.cos(a) * 0.12, -0.01 + Math.sin(a) * 0.12), p1 = T(0.09 + Math.cos(a) * 0.19, -0.01 + Math.sin(a) * 0.19); line(ctx, [p0, p1], Math.max(1, s * 0.025), rgba('#FFE2A0', 0.8)); }
  // baş
  const hd = sub(T, 0.24, 0.0, -deg(6) * look);
  for (const [k, off] of [[1, 0.04], [0, 0]]) {
    const w = Math.sin(t * 3 + ph + k) * 0.03;
    const a = hd(0.06 + off * 0.5, -0.09), b = hd(0.12 + off, -0.2), c = hd(0.2 + off + w, -0.25 + w);
    line(ctx, [a, b, c], Math.max(1, s * 0.024), k ? '#3A3354' : INK); dot(ctx, c, Math.max(1.3, s * 0.03), k ? '#3A3354' : INK);
  }
  L.blob(ctx, ell(hd, 0.08, 0.02, 0.12, 0.115, 18), BEE.k, { dark: '#17121F', light: BEE.kL, la, size: s * 0.12, ks: 0.3, rim: true, rimW: Math.max(1, s * 0.018) });
  eye(ctx, hd(0.12, 0.0), s * 0.03, dir, { white: true, blink: blinkAt(t, ph + 3) });
  wing(false);
  return { head: hd(0.1, 0) };
}

// ---------- su kabarcığında balık ----------
const FISH = { body: '#F57A2A', dark: '#B8401E', light: '#FFB45A', fin: '#FF9A4A', finL: '#FFD08A' };
function fish(ctx, x, y, s, o = {}) {
  // x,y: balığın merkezi; s: balık boyu; o.sx: yatay yön/basıklık (-1..1), o.rot, o.wag
  const la = o.la ?? -2.3, sx = o.sx ?? 1, wag = o.wag ?? 0;
  const T = (u, v) => { const c = Math.cos(o.rot ?? 0), sn = Math.sin(o.rot ?? 0); const U = u * sx, V = v; return [x + (U * c - V * sn) * s, y + (U * sn + V * c) * s]; };
  const dir = sx >= 0 ? 1 : -1;
  const asx = Math.abs(sx);
  // kuyruk
  const tail = sm(T, [[-0.26, 0], [-0.52, -0.24 + wag * 0.1], [-0.6, -0.2 + wag * 0.16], [-0.5, 0.0 + wag * 0.12], [-0.6, 0.22 + wag * 0.16], [-0.52, 0.25 + wag * 0.1]], 4);
  L.blob(ctx, tail, FISH.fin, { dark: FISH.dark, light: FISH.finL, la, size: s * 0.18, ks: 0.35 });
  // sırt yüzgeci
  L.blob(ctx, sm(T, [[0.12, -0.2], [-0.02, -0.36], [-0.2, -0.32], [-0.22, -0.13]], 4), FISH.fin, { dark: FISH.dark, light: FISH.finL, la, size: s * 0.12, ks: 0.35 });
  // gövde
  const body = sm(T, [[0.44, -0.02], [0.32, -0.18], [0.05, -0.24], [-0.2, -0.16], [-0.3, 0.0], [-0.2, 0.15], [0.05, 0.22], [0.32, 0.16]], 6);
  const bp = L.blob(ctx, body, FISH.body, { dark: FISH.dark, light: FISH.light, la, size: s * 0.32, ks: 0.25, kl: 0.14, rim: true, rimW: Math.max(1, s * 0.02) });
  if (asx > 0.35) {
    // pul darbeleri + solungaç
    ctx.save(); ctx.clip(bp);
    const r = rng(o.seed ?? 33);
    for (let i = 0; i < 6; i++) { const u = r.range(-0.15, 0.2), v = r.range(-0.12, 0.1); const arc = []; for (let k = 0; k <= 5; k++) { const a = -1.1 + k * 0.44; arc.push(T(u + Math.cos(a) * 0.05, v + Math.sin(a) * 0.05)); } P.curveStroke(ctx, arc, s * 0.022, rgba(r.chance(0.5) ? FISH.light : FISH.dark, 0.6), r.int(1, 1e9), { bristles: 0, detail: 0 }); }
    ctx.restore();
    const g = []; for (let k = 0; k <= 6; k++) { const a = -0.9 + k * 0.3; g.push(T(0.12 + Math.cos(a) * 0.12, Math.sin(a) * 0.14)); }
    line(ctx, g, Math.max(1, s * 0.02), rgba(FISH.dark, 0.7));
    // göğüs yüzgeci
    L.blob(ctx, sm(T, [[0.06, 0.06], [-0.06, 0.16 + wag * 0.04], [-0.1, 0.1], [-0.02, 0.04]], 4), FISH.finL, { dark: FISH.fin, light: '#FFE8B0', la, size: s * 0.08, ks: 0.35 });
    eye(ctx, T(0.3, -0.05), s * 0.045 * Math.max(0.5, asx), dir, { white: true });
  }
}
function fishBubble(ctx, x, y, s, o = {}) {
  // x,y: kabarcığın yere değdiği nokta; s: çap
  const la = o.la ?? -2.3, t = o.t ?? 0, look = clamp(o.look ?? 0), ph = o.phase ?? 0, dir = o.dir ?? 1;
  const wob = Math.sin(t * 2.3 + ph) * 0.022;
  const rx = s * 0.5 * (1 + wob), ry = s * 0.5 * (1 - wob);
  const cx = x, cy = y - ry * 0.97;
  // temas gölgesi
  ctx.fillStyle = rgba('#1E1A40', 0.25); ctx.beginPath(); ctx.ellipse(cx, y - 1, rx * 0.62, s * 0.05, 0, 0, TAU); ctx.fill();
  const bub = P.ellipsePts(cx, cy, rx, ry, 40), bp = P.pathOf(bub);
  // su (yarı saydam): dış astar halkası + iki ton
  ctx.save(); ctx.strokeStyle = rgba(P.UNDERPAINT, 0.7); ctx.lineWidth = Math.max(1.5, s * 0.02); ctx.setLineDash([s * 0.3, s * 0.5, s * 0.15, s * 0.4]); ctx.translate(1.2, 1.2); ctx.stroke(bp); ctx.restore();
  ctx.fillStyle = rgba('#3FB2D6', 0.5); ctx.fill(bp);
  ctx.save(); ctx.clip(bp);
  ctx.fillStyle = rgba('#2A6FC0', 0.45); ctx.beginPath(); ctx.ellipse(cx + rx * 0.15, cy + ry * 0.55, rx * 1.05, ry * 0.75, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = rgba('#9EE6EE', 0.35); ctx.beginPath(); ctx.ellipse(cx - rx * 0.3, cy - ry * 0.35, rx * 0.6, ry * 0.45, -0.4, 0, TAU); ctx.fill();
  // dipte kum ve çakıl
  ctx.fillStyle = rgba('#F2D08A', 0.85); ctx.beginPath(); ctx.ellipse(cx, cy + ry * 0.95, rx * 0.75, ry * 0.2, 0, 0, TAU); ctx.fill();
  for (const [u, r2, c] of [[-0.3, 0.07, '#A9A3CC'], [0.05, 0.055, '#8C7FC0'], [0.32, 0.065, '#C9B8E0']]) L.blob(ctx, P.ellipsePts(cx + u * rx, cy + ry * 0.8, r2 * s, r2 * s * 0.75, 12), c, { la, size: r2 * s, ks: 0.35 });
  // su bitkisi (salınan)
  for (const [u, hgt, k] of [[-0.42, 0.62, 0], [-0.3, 0.46, 1], [0.4, 0.5, 2]]) {
    const ln = []; for (let i = 0; i <= 6; i++) { const q = i / 6; ln.push([cx + u * rx + Math.sin(t * 1.6 + k + q * 2.2) * q * s * 0.05, cy + ry * 0.82 - q * hgt * s * 0.6]); }
    P.curveStroke(ctx, ln, (q) => s * 0.04 * (1 - q * 0.7), k === 2 ? '#3E9B4F' : '#2EAD56', 40 + k, { bristles: 1, detail: 0.5 });
  }
  // balık: sağ-sol yüzer, dönerken yatayda daralır; "look"ta yukarı süzülüp başını kaldırır
  const sp = 1.15, a = t * sp + ph;
  const swim = 1 - look;
  const fx = cx + Math.sin(a) * rx * 0.32 * swim, fy = cy + Math.sin(a * 2) * ry * 0.08 * swim - look * ry * 0.18;
  let sxv = clamp(Math.cos(a) * 3.5, -1, 1);
  sxv = lerp(sxv, dir, look);
  fish(ctx, fx, fy, s * 0.46, { la, sx: sxv, wag: Math.sin(t * 9 + ph), rot: -0.55 * look * (sxv >= 0 ? 1 : -1), seed: 33 });
  // kabarcıklar
  for (let i = 0; i < 4; i++) {
    const k = (t * 0.55 + i * 0.27 + ph) % 1;
    const bx = cx + (i - 1.5) * rx * 0.25 + Math.sin(t * 3 + i) * 2, by = cy + ry * 0.6 - k * ry * 1.4;
    ctx.strokeStyle = rgba('#FFFFFF', 0.7 * Math.sin(k * Math.PI)); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(bx, by, s * (0.018 + 0.01 * (i % 2)), 0, TAU); ctx.stroke();
  }
  ctx.restore();
  // ön yüz: kenar ışığı, gölge kenarı, parlama hilali
  ctx.save();
  ctx.strokeStyle = rgba('#E8FCFF', 0.75); ctx.lineWidth = Math.max(1.5, s * 0.022); ctx.stroke(bp);
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 0.97, ry * 0.97, 0, 0.2, 1.6); ctx.strokeStyle = rgba('#1F4E9A', 0.45); ctx.lineWidth = Math.max(2, s * 0.04); ctx.stroke();
  ctx.restore();
  const arc = []; for (let k = 0; k <= 8; k++) { const aa = lerp(-2.75, -1.75, k / 8); arc.push([cx + Math.cos(aa) * rx * 0.74, cy + Math.sin(aa) * ry * 0.74]); }
  P.curveStroke(ctx, arc, s * 0.07, rgba('#FFFFFF', 0.82), 41, { taper: true, bristles: 1, detail: 0 });
  dot(ctx, [cx + rx * 0.38, cy - ry * 0.5], s * 0.028, rgba('#FFFFFF', 0.85));
  return { head: [cx, cy - ry * 0.3] };
}

// ---------- tavşan (oturan, yandan) ----------
const RAB = { fur: '#CDA07A', furD: '#8E6248', furL: '#EECBA2', cream: '#F6EAD6', creamD: '#D2BBA6', pink: '#F2A1A8' };
function rabbit(ctx, x, y, s, o = {}) {
  const dir = o.dir ?? 1, la = o.la ?? -2.3, t = o.t ?? 0, look = clamp(o.look ?? 0), ph = o.phase ?? 0;
  const T = F(x, y, s, dir, 0);
  const br = Math.sin(t * 2.6 + ph) * 0.006;
  const ha = -deg(26) * look + Math.sin(t * 1.3 + ph) * deg(2);
  const H = sub(T, 0.1, -0.56 + br, ha);
  const twitch = Math.max(0, Math.sin(t * 2.1 + ph * 3)) ** 8;
  const earA = (k) => -deg(98) + deg(k ? 10 : 0) - look * deg(8) + twitch * deg(k ? 7 : -4) + Math.sin(t * 1.9 + k) * deg(1.5);
  const ear = (k) => {
    const E2 = sub(H, k ? 0.02 : 0.08, -0.29, earA(k));
    const pts = sm(E2, [[0, -0.05], [0.18, -0.08], [0.38, -0.07], [0.5, 0], [0.38, 0.07], [0.18, 0.08], [0, 0.05]], 4);
    L.blob(ctx, pts, k ? shade(RAB.fur, -0.08) : RAB.fur, { dark: RAB.furD, light: RAB.furL, la, size: s * 0.1, ks: 0.3, rim: !k, rimW: Math.max(1, s * 0.016) });
    if (!k) L.blob(ctx, sm(E2, [[0.06, -0.02], [0.2, -0.035], [0.38, -0.03], [0.44, 0], [0.38, 0.03], [0.2, 0.035], [0.06, 0.02]], 4), RAB.pink, { dark: '#D07A88', light: '#FFC8CC', la, size: s * 0.05, ks: 0.3 });
  };
  ear(1);
  // arka ayak (yerde uzun)
  L.blob(ctx, sm(T, [[-0.3, -0.02], [-0.22, -0.07], [0.06, -0.07], [0.14, -0.03], [0.12, 0.0], [-0.3, 0.0]], 4), shade(RAB.fur, -0.04), { dark: RAB.furD, light: RAB.furL, la, size: s * 0.07, ks: 0.35 });
  // gövde + kalça
  const body = sm(T, [[-0.38, -0.03], [-0.47, -0.22], [-0.4, -0.43], [-0.2, -0.57], [0.04, -0.6], [0.18, -0.52], [0.22, -0.32], [0.18, -0.1], [0.08, -0.02]].map(([u, v]) => [u, v + br]), 6);
  L.toneUnion2(ctx, [body], { base: RAB.fur, dark: RAB.furD, light: RAB.furL, seed: (o.seed ?? 5) + 1, lightAng: la, shadowW: 0.14, lightW: 0.06, dabs: 5, highlights: 3, texture: 0.35, size: s * 0.6, rimW: Math.max(1.5, s * 0.016) });
  // göğüs kremi
  L.blob(ctx, sm(T, [[0.18, -0.48 + br], [0.22, -0.3], [0.17, -0.1], [0.08, -0.12], [0.1, -0.34]], 4), RAB.cream, { dark: RAB.creamD, light: '#FFFFFF', la, size: s * 0.08, ks: 0.3 });
  // kalça kıvrımı
  const hip = []; for (let k = 0; k <= 8; k++) { const a = lerp(-2.9, -0.5, k / 8); hip.push(T(-0.2 + Math.cos(a) * 0.2, -0.17 + br + Math.sin(a) * 0.17)); }
  P.curveStroke(ctx, hip, s * 0.025, rgba(RAB.furD, 0.75), 51, { taper: true, bristles: 0, detail: 0 });
  // ön bacak
  L.blob(ctx, M_capsule(T(0.12, -0.28 + br), T(0.16, -0.02), s * 0.085, s * 0.07), RAB.fur, { dark: RAB.furD, light: RAB.furL, la, size: s * 0.07, ks: 0.32 });
  L.blob(ctx, ell(T, 0.19, -0.025, 0.06, 0.03, 12), RAB.cream, { dark: RAB.creamD, light: '#FFFFFF', la, size: s * 0.04 });
  // kuyruk
  L.toneUnion2(ctx, [ell(T, -0.47, -0.18 + br, 0.085, 0.08, 16), ell(T, -0.43, -0.12 + br, 0.07, 0.065, 14)], { base: '#FBF6EE', dark: '#C9C0D8', light: '#FFFFFF', seed: 52, lightAng: la, shadowW: 0.2, rim: false, dabs: 1, highlights: 1, texture: 0.2 });
  // baş
  const head = sm(H, [[-0.08, -0.2], [0.02, -0.32], [0.17, -0.37], [0.31, -0.3], [0.385, -0.17], [0.38, -0.06], [0.31, 0.01], [0.16, 0.03], [0.02, 0.0], [-0.08, -0.1]], 6);
  L.blob(ctx, head, RAB.fur, { dark: RAB.furD, light: RAB.furL, la, size: s * 0.3, ks: 0.22, kl: 0.12, rim: true, rimW: Math.max(1.2, s * 0.016) });
  ctx.save(); ctx.clip(P.pathOf(head));
  L.blob(ctx, ell(H, 0.33, -0.05, 0.085, 0.07, 14), RAB.cream, { dark: RAB.creamD, light: '#FFFFFF', la, size: s * 0.06, ks: 0.25 });
  ctx.restore();
  const nz = 1 + 0.25 * Math.sin(t * 11 + ph) * (0.5 + 0.5 * Math.sin(t * 1.3));
  L.blob(ctx, mp(H, [[0.355, -0.135], [0.392, -0.125], [0.38, -0.135 + 0.035 * nz]]), RAB.pink, { dark: '#C86A78', light: '#FFC8CC', la, size: s * 0.03 });
  line(ctx, [H(0.375, -0.1), H(0.37, -0.07), H(0.35, -0.055)], Math.max(1, s * 0.012), rgba('#8E5A50', 0.7));
  eye(ctx, H(0.21, -0.19), s * 0.04, dir, { blink: blinkAt(t, ph + 1) });
  ear(0);
  return { head: H(0.15, -0.15) };
}
function M_capsule(a, b, wa, wb) { return L.capsule(a, b, wa, wb); }

// ---------- ceylan (ayakta, yandan) ----------
const GAZ = { tan: '#D88E4A', tanD: '#94532E', tanL: '#F4B878', white: '#F7EFE2', whiteD: '#CFC2CF', stripe: '#5A3020', horn: '#3A2A26', hoof: '#2A1E22' };
function gazelle(ctx, x, y, s, o = {}) {
  const dir = o.dir ?? 1, la = o.la ?? -2.3, t = o.t ?? 0, look = clamp(o.look ?? 0), ph = o.phase ?? 0;
  const T = F(x, y, s, dir, 0);
  const br = Math.sin(t * 2.2 + ph) * 0.004;
  // bacak: kalça→diz→bilek→toynak (yerel), far: uzak bacak
  const leg = (u, front, far, k) => {
    const col = far ? shade(GAZ.tan, -0.1) : GAZ.tan;
    const top = T(u, -0.5 + br), knee = front ? T(u + 0.01, -0.27) : T(u - 0.05, -0.3), ank = front ? T(u, -0.07) : T(u + 0.02, -0.08), hoof = T(u + (front ? 0.01 : 0.025), -0.005);
    L.blob(ctx, L.capsule(top, knee, s * (front ? 0.07 : 0.1), s * 0.04), col, { dark: GAZ.tanD, light: GAZ.tanL, la, size: s * 0.05, ks: 0.32 });
    L.blob(ctx, L.capsule(knee, ank, s * 0.042, s * 0.032), far ? shade(GAZ.white, -0.1) : GAZ.white, { dark: GAZ.whiteD, light: '#FFFFFF', la, size: s * 0.035, ks: 0.32 });
    L.blob(ctx, L.capsule(ank, hoof, s * 0.034, s * 0.036), GAZ.hoof, { dark: '#120C10', light: '#4A3A40', la, size: s * 0.03, ks: 0.3 });
  };
  leg(-0.25, false, true); leg(0.2, true, true);
  // kuyruk (siyah, sallanan)
  const tw = Math.sin(t * 6 + ph) * Math.max(0, Math.sin(t * 1.1 + ph)) * 0.6;
  const ta = sub(T, -0.37, -0.64 + br, deg(70) + tw);
  L.blob(ctx, sm(ta, [[0, -0.025], [0.12, -0.02], [0.16, 0], [0.12, 0.02], [0, 0.025]], 3), GAZ.stripe, { dark: '#2A1810', light: '#7A4A30', la, size: s * 0.03 });
  // gövde
  const body = sm(T, [[-0.38, -0.62], [-0.24, -0.69], [0.06, -0.68], [0.24, -0.68], [0.31, -0.58], [0.27, -0.47], [0.04, -0.44], [-0.24, -0.46], [-0.39, -0.52]].map(([u, v]) => [u, v + br]), 6);
  const bp = L.toneUnion2(ctx, [body], { base: GAZ.tan, dark: GAZ.tanD, light: GAZ.tanL, seed: (o.seed ?? 7) + 3, lightAng: la, shadowW: 0.16, lightW: 0.07, dabs: 4, highlights: 2, texture: 0.35, size: s * 0.45, rimW: Math.max(1.5, s * 0.014) });
  ctx.save(); ctx.clip(bp);
  // beyaz karın + koyu yan şerit + beyaz sağrı
  const belly = sm(T, [[-0.42, -0.5 + br], [-0.1, -0.535 + br], [0.18, -0.54 + br], [0.36, -0.55 + br], [0.36, -0.4], [-0.42, -0.4]], 4);
  L.blob(ctx, belly, GAZ.white, { dark: GAZ.whiteD, light: '#FFFFFF', la, size: s * 0.08, ks: 0.35 });
  const stripe = [[-0.32, -0.535 + br], [-0.1, -0.555 + br], [0.18, -0.56 + br], [0.3, -0.57 + br], [0.3, -0.535 + br], [0.18, -0.525 + br], [-0.1, -0.52 + br], [-0.32, -0.505 + br]];
  ctx.fillStyle = GAZ.stripe; ctx.fill(P.pathOf(sm(T, stripe, 4)));
  L.blob(ctx, ell(T, -0.4, -0.58 + br, 0.07, 0.09, 14), GAZ.white, { dark: GAZ.whiteD, light: '#FFFFFF', la, size: s * 0.06, ks: 0.3 });
  ctx.restore();
  leg(-0.2, false, false); leg(0.25, true, false);
  // boyun + baş (look ile yukarı)
  const na = -deg(28) * look + Math.sin(t * 1.4 + ph) * deg(1.5);
  const N = sub(T, 0.22, -0.63 + br, na);
  const neck = sm(N, [[-0.04, 0.04], [0.1, -0.02], [0.17, -0.2], [0.17, -0.3], [0.1, -0.31], [0.04, -0.18], [-0.06, -0.06]], 5);
  L.blob(ctx, neck, GAZ.tan, { dark: GAZ.tanD, light: GAZ.tanL, la, size: s * 0.12, ks: 0.28, rim: true, rimW: Math.max(1.2, s * 0.012) });
  L.blob(ctx, sm(N, [[0.1, -0.02], [0.17, -0.18], [0.16, -0.26], [0.13, -0.2], [0.07, -0.06]], 4), GAZ.white, { dark: GAZ.whiteD, light: '#FFFFFF', la, size: s * 0.04, ks: 0.3 });
  const hb = sub(N, 0.13, -0.31, deg(8) * (1 - look) - deg(6) * look + Math.sin(t * 1.9 + ph) * deg(2));
  // boynuzlar (lir biçimli, halkalı)
  for (const k of [1, 0]) {
    const hn = []; for (let i = 0; i <= 8; i++) { const q = i / 8; hn.push(hb(-0.03 - q * 0.08 + Math.sin(q * 3.2) * 0.025 + k * 0.025, -0.06 - q * 0.22 + q * q * 0.04)); }
    P.curveStroke(ctx, hn, (q) => s * 0.03 * (1 - q * 0.65), k ? '#5A4A44' : GAZ.horn, 60 + k, { bristles: 1, detail: 0.4 });
    if (!k) for (let i = 1; i < 6; i++) { const p = hn[i]; dot(ctx, [p[0] + dir * s * 0.01, p[1]], Math.max(0.8, s * 0.008), rgba('#B8A898', 0.7)); }
  }
  // kulak
  const ea = sub(hb, -0.04, -0.06, -deg(160) + Math.max(0, Math.sin(t * 2.7 + ph * 2)) ** 10 * deg(25));
  L.blob(ctx, sm(ea, [[0, -0.025], [0.08, -0.035], [0.13, 0], [0.08, 0.03], [0, 0.025]], 4), GAZ.tan, { dark: GAZ.tanD, light: GAZ.tanL, la, size: s * 0.04, ks: 0.3 });
  const head = sm(hb, [[-0.07, -0.04], [0.0, -0.08], [0.1, -0.06], [0.19, 0.0], [0.22, 0.04], [0.18, 0.07], [0.06, 0.05], [-0.06, 0.04]], 5);
  L.blob(ctx, head, GAZ.tan, { dark: GAZ.tanD, light: GAZ.tanL, la, size: s * 0.1, ks: 0.26, kl: 0.12, rim: true, rimW: Math.max(1.2, s * 0.012) });
  // yüz: göz şeridi (beyaz + koyu), burun
  ctx.save(); ctx.clip(P.pathOf(head));
  ctx.fillStyle = GAZ.white; ctx.fill(P.pathOf(sm(hb, [[0.0, -0.045], [0.1, -0.03], [0.2, 0.01], [0.19, 0.025], [0.1, -0.005], [0.0, -0.02]], 3)));
  ctx.fillStyle = rgba(GAZ.stripe, 0.85); ctx.fill(P.pathOf(sm(hb, [[0.02, -0.01], [0.1, 0.0], [0.19, 0.03], [0.18, 0.045], [0.1, 0.02], [0.02, 0.01]], 3)));
  ctx.restore();
  dot(ctx, hb(0.205, 0.035), s * 0.016, GAZ.hoof);
  eye(ctx, hb(0.06, -0.025), s * 0.02, dir, { blink: blinkAt(t, ph + 2) });
  return { head: hb(0.05, -0.02) };
}

// ---------- koyun (s10 ile aynı: _s05_lib) ----------
function sheep(ctx, x, y, s, o = {}) {
  // look 1: baş kalkık (graze 0); look 0: yarı otlar (graze o.graze ?? 0.45)
  const look = clamp(o.look ?? 0), t = o.t ?? 0, ph = o.phase ?? 0;
  const g0 = o.graze ?? 0.42;
  const graze = clamp(lerp(g0 + Math.sin(t * 1.7 + ph) * 0.04, -0.0, look));
  return L.sheep(ctx, x, y, s, { dir: o.dir ?? 1, graze, chew: t * 9 + ph, seed: o.seed ?? 3, la: o.la ?? -2.3, bob: Math.sin(t * 9 + ph) * (1 - graze) * 0.6 });
}

// ---------- kuş (s05 ile aynı) ----------
function bird(ctx, x, y, s, o = {}) {
  // x,y: ayakların bastığı nokta
  const t = o.t ?? 0, ph = o.phase ?? 0, look = clamp(o.look ?? 0);
  const hop = Math.max(0, Math.sin(t * 2.4 + ph)) ** 12;
  const cr = 0.15 + 0.3 * hop * (1 - look);
  return L.bird(ctx, x, y - s * 0.31 + cr * s * 0.04, s, { col: o.col || L.BIRD_A, dir: o.dir ?? 1, crouch: cr, seed: o.seed ?? 70, la: o.la ?? -2.3, blink: blinkAt(t, ph + 4), headDy: Math.sin(t * 3.1 + ph) * 0.012 - look * 0.07, headDx: -look * 0.03, rot: -look * 0.18 * (o.dir ?? 1) });
}

// ---------- kelebek (çiçeğe konmuş / uçan) ----------
function butterfly(ctx, x, y, s, o = {}) {
  const t = o.t ?? 0, ph = o.phase ?? 0;
  const fly = o.fly ?? 0;
  const ph2 = fly > 0 ? t * 15 + ph : Math.PI / 2 + Math.sin(t * 2.2 + ph) * 0.9; // konmuşken yavaş aç-kapa
  L.butterfly(ctx, x, y, s, ph2, { c1: o.c1 || '#F59A2E', c2: o.c2 || '#FFD45A', rot: o.rot ?? 0 });
}

// ---------- çiçek (sap + baş) ----------
function stemFlower(ctx, x, y, h, s, seed, o = {}) {
  const t = o.t ?? 0;
  const sway = Math.sin(t * 1.4 + seed) * 0.05;
  const ln = []; for (let i = 0; i <= 6; i++) { const q = i / 6; ln.push([x + Math.sin(sway * q * 3) * h * 0.3 * q, y - q * h]); }
  P.curveStroke(ctx, ln, (q) => Math.max(2, s * 0.16 * (1 - q * 0.5)), '#2F8A45', seed, { bristles: 1, detail: 0.4 });
  R.leaf(ctx, ln[2][0], ln[2][1], s * 0.9, -0.6, seed + 2, { base: '#3E9B4F', dark: '#1F6A3E', light: '#8FD14F' });
  const top = ln[6];
  R.flower(ctx, top[0], top[1], s, seed, { color: o.color || '#FBF6FF', dark: o.dark || '#B8A9DA', inner: o.inner || '#F07BB2', tilt: sway });
  return top;
}

// ---------- çimen öbeği (kaide) ----------
const TUFT_PAL = {
  dusk: { base: '#4E9E6A', dark: '#24604E', light: '#8CCB6A', g1: '#2E7A52', g2: '#8CC85A', soil: '#7A4A3E' },
  sunset: { base: '#8AA845', dark: '#4E6A3A', light: '#E0C25A', g1: '#5E7A3A', g2: '#D8C060', soil: '#8A4A2E' },
};
function tuftCv(w, pal, seed) {
  const P0 = TUFT_PAL[pal] || TUFT_PAL.dusk;
  const h = w * 0.62, ss = 1.6;
  return L.hcache(`s06tuft:${pal}:${Math.round(w)}:${seed}`, w + 20, h, ss, (x) => {
    x.translate((w + 20) / 2, h - 6);
    const hw = w / 2, mh = w * 0.16;
    const pts = P.smoothPts([[-hw, 0], [-hw * 0.92, -mh * 0.55], [-hw * 0.55, -mh * 0.95], [0, -mh * 1.08], [hw * 0.55, -mh * 0.95], [hw * 0.92, -mh * 0.55], [hw, 0], [hw * 0.6, mh * 0.18], [-hw * 0.6, mh * 0.18]], true, 6);
    P.toneShape(x, pts, { base: P0.base, dark: P0.dark, light: P0.light, seed, shadowW: 0.25, lightW: 0.14, dabs: 5, strokeAng: 0, rimW: 3 });
    const r = rng(seed + 3);
    for (let i = 0; i < 4; i++) R.grass(x, r.range(-hw * 0.8, hw * 0.8), r.range(-mh * 0.5, mh * 0.05), r.range(w * 0.13, w * 0.2), r.int(1, 999), { c1: P0.g1, c2: P0.g2, n: 5 });
    if (w > 80) R.flower(x, r.range(-hw * 0.7, -hw * 0.3), -mh * 0.7, w * 0.055, seed + 7, { color: '#FFFFFF', dark: '#B8A9DA', inner: '#F6C83B' });
    if (w > 95) R.flower(x, r.range(hw * 0.35, hw * 0.7), -mh * 0.6, w * 0.05, seed + 8, { color: '#FFD34E', dark: '#D9952A', inner: '#E8682E' });
  });
}
function tuft(ctx, x, y, w, pal = 'dusk', seed = 1) {
  const cv = tuftCv(w, pal, seed), h = w * 0.62;
  ctx.drawImage(cv, x - (w + 20) / 2, y - h + 6 + w * 0.06, w + 20, h);
}

// ---------- canlılar listesi ----------
// s: çizim ölçeği; tw: kaide genişliği; lift: kaide üstünde tabanın yüksekliği; head: kabaca başın yerel yüksekliği (oran)
const BEINGS = {
  ladybug: { fn: ladybug, s: 60, tw: 76, seed: 11 },
  bee: { fn: bee, s: 56, tw: 76, seed: 12, flower: true },
  fish: { fn: fishBubble, s: 86, tw: 98, seed: 13 },
  bird: { fn: bird, s: 66, tw: 90, seed: 14 },
  rabbit: { fn: rabbit, s: 64, tw: 88, seed: 15 },
  gazelle: { fn: gazelle, s: 142, tw: 114, seed: 16 },
  sheep: { fn: sheep, s: 122, tw: 128, seed: 17 },
  butterfly: { fn: butterfly, s: 30, tw: 76, seed: 18, flower: true },
};
// Bir canlıyı kaidesiyle çiz. (x,y) kaidenin taban ortası. o: { t, dir, look, pop (0..1+ ölçek), la, pal, phase, scale }
function drawBeing(ctx, kind, x, y, o = {}) {
  const B = BEINGS[kind]; if (!B) return;
  const k = o.pop ?? 1; if (k <= 0.001) return;
  const sc = (o.scale ?? 1);
  const t = o.t ?? 0, dir = o.dir ?? 1, la = o.la ?? -2.3, ph = o.phase ?? B.seed * 0.71;
  ctx.save();
  ctx.translate(x, y); ctx.scale(k * sc, k * sc); ctx.translate(-x, -y);
  if (o.tuft !== false) tuft(ctx, x, y, B.tw, o.pal || 'dusk', B.seed);
  const gy = o.tuft === false ? y : y - B.tw * 0.15; // kaidenin üst yüzü
  const s = B.s;
  const oo = { dir, t, look: o.look ?? 0, la, phase: ph, seed: B.seed };
  // temas gölgesi
  const shw = { ladybug: 0.5, bee: 0.3, fish: 0, bird: 0.45, rabbit: 0.55, gazelle: 0.4, sheep: 0.55, butterfly: 0 }[kind] * s;
  if (shw > 0) { ctx.fillStyle = rgba('#1E1A40', 0.22); ctx.beginPath(); ctx.ellipse(x + dir * s * 0.04, gy + 2, shw, Math.max(3, s * 0.05), 0, 0, TAU); ctx.fill(); }
  let head;
  if (kind === 'bee') {
    stemFlower(ctx, x - dir * B.tw * 0.18, gy + 3, B.tw * 0.5, 12, B.seed, { t, color: '#FFD34E', dark: '#D9952A', inner: '#E8682E' });
    // o.orbit: arı çiçeğin çevresinde daire çizer (yönü hızına göre döner)
    const ob = o.orbit ?? 0, oa = t * 2.6 + ph;
    const odir = ob > 0.05 ? (-Math.sin(oa) >= 0 ? 1 : -1) : dir;
    head = (B.fn(ctx, x + dir * s * 0.12 + Math.cos(oa) * 46 * ob, gy - B.tw * 0.75 - (o.look ?? 0) * s * 0.25 + Math.sin(oa) * 20 * ob, s, Object.assign({}, oo, { dir: odir, drift: 1 - ob })) || {}).head;
  } else if (kind === 'butterfly') {
    const top = stemFlower(ctx, x, gy + 3, B.tw * 0.5, 13, B.seed, { t });
    const fly = o.fly ?? 0;
    const bx = top[0] + Math.sin(t * 1.3 + ph) * 30 * fly, by = top[1] - s * 0.62 - fly * (40 + Math.sin(t * 2.1 + ph) * 16);
    butterfly(ctx, bx, by, s, { t, phase: ph, fly, rot: Math.sin(t * 2 + ph) * 0.2 * (fly + 0.3) });
    head = [bx, by];
  } else {
    head = (B.fn(ctx, x, gy, s, oo) || {}).head;
  }
  ctx.restore();
  return { head, top: gy };
}

module.exports = { ladybug, bee, fish, fishBubble, rabbit, gazelle, sheep, bird, butterfly, stemFlower, tuft, tuftCv, drawBeing, BEINGS, F, sub, eye, line, dot };
