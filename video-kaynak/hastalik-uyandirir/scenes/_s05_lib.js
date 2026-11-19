// Ortak yardımcılar (s05, s09, s10): yüksek çözünürlüklü önbellek, halka/biçim gölgelendirme,
// akrilik kuş, koyun, kelebek, hızlı yaprak, yağmur. Hepsi deterministik; darbe tohumları nesneye bağlı.
'use strict';
const { Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, deg } = C;

// ---------- önbellek: kamera yakınlaşınca da keskin kalsın diye ss kat çözünürlükte ----------
function hcache(key, w, h, ss, fn) {
  return R.cached('s05x:' + key, Math.ceil(w * ss), Math.ceil(h * ss), (x) => { x.scale(ss, ss); fn(x); });
}

// yerel (u,v) → dünya dönüştürücü
function frame(x, y, s, dir = 1, rot = 0) {
  const c = Math.cos(rot), sn = Math.sin(rot);
  return (u, v) => { const X = u * dir, Y = v; return [x + (X * c - Y * sn) * s, y + (X * sn + Y * c) * s]; };
}
const mapPts = (T, pts) => pts.map(([u, v]) => T(u, v));

// Path2D'yi düz tonlarla gölgelendir (shadeUnion'ın path sürümü): sb gölge kayması, sa ışık kayması (px)
function shadePath(ctx, path, base, dark, light, la, sb, sa, fillRule = 'nonzero') {
  const lx = Math.cos(la), ly = Math.sin(la);
  ctx.save();
  ctx.clip(path, fillRule);
  ctx.fillStyle = dark; ctx.fill(path, fillRule);
  ctx.translate(lx * sb, ly * sb); ctx.clip(path, fillRule); ctx.translate(-lx * sb, -ly * sb);
  ctx.fillStyle = light; ctx.fill(path, fillRule);
  ctx.translate(-lx * sa, -ly * sa); ctx.fillStyle = base; ctx.fill(path, fillRule);
  ctx.restore();
}
function ringPath(cx, cy, r0, r1) {
  const p = new Path2D();
  p.moveTo(cx + r1, cy); p.arc(cx, cy, r1, 0, TAU, false); p.closePath();
  p.moveTo(cx + r0, cy); p.arc(cx, cy, r0, 0, TAU, true); p.closePath();
  return p;
}
// Path2D.addPath bu tuval sürümünde bazı sıralarda bozuk kırpma üretiyor (yelpaze biçimli delikler);
// birleşik yolu elle (her çokgen için moveTo) kur.
function area(q) { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] - q[i][0]) * (q[j][1] + q[i][1]); return a / 2; }
// aynalanmış çokgenlerin dönüş yönü ters olur; birleşimde delik açılmasın diye hepsini aynı yöne çevir
function unionPath(list) {
  const p = new Path2D();
  for (let q of list) { if (!q.length) continue; if (area(q) < 0) q = q.slice().reverse(); p.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) p.lineTo(q[k][0], q[k][1]); p.closePath(); }
  return p;
}
// P.toneUnion'ın aynısı, yalnız birleşik yol elle kurulur
function toneUnion2(ctx, list, o = {}) {
  const path = unionPath(list);
  const all = list.flat(); const b = P.bbox(all), size = o.size ?? Math.max(b.w, b.h);
  const base = o.base || '#888', dark = o.dark || C.coolShadow(base, 0.2), light = o.light || C.warmLight(base, 0.14);
  const la = o.lightAng ?? -2.3, lx = Math.cos(la), ly = Math.sin(la);
  const r = rng(o.seed ?? 7);
  if (o.rim !== false) {
    ctx.save(); ctx.strokeStyle = o.rimColor || P.UNDERPAINT; ctx.lineWidth = o.rimW ?? Math.max(2.5, Math.min(8, size * 0.02)); ctx.lineJoin = 'round';
    const d = []; for (let i = 0; i < 8; i++) d.push(r.range(size * 0.04, size * 0.3), r.range(size * 0.03, size * 0.2));
    ctx.setLineDash(d); ctx.translate(-lx * 1.5, -ly * 1.5);
    for (const q of list) ctx.stroke(P.pathOf(q));
    ctx.restore();
  }
  const sb = (o.shadowW ?? 0.14) * size, la2 = (o.lightW ?? 0.08) * size;
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = dark; ctx.fill(path);
  ctx.translate(lx * sb, ly * sb); ctx.clip(path); ctx.translate(-lx * sb, -ly * sb);
  ctx.fillStyle = light; ctx.fill(path);
  ctx.translate(-lx * la2, -ly * la2); ctx.fillStyle = base; ctx.fill(path); ctx.translate(lx * la2, ly * la2);
  ctx.restore();
  ctx.save(); ctx.clip(path);
  const nd = o.dabs ?? Math.round(clamp(size / 30, 3, 24));
  const dabW = o.dabW ?? clamp(size * 0.045, 3, 18);
  const sAng = o.strokeAng ?? 0;
  for (let i = 0; i < nd; i++) {
    const q = list[r.int(0, list.length - 1)]; const qb = P.bbox(q);
    const a0 = la + Math.PI + r.range(-1.1, 1.1);
    const px = qb.cx + Math.cos(a0) * qb.w * 0.5 * r.range(0.45, 0.8), py = qb.cy + Math.sin(a0) * qb.h * 0.5 * r.range(0.45, 0.8);
    const len = dabW * r.range(1.5, 4), a = sAng + r.range(-0.35, 0.35);
    P.stroke(ctx, px - Math.cos(a) * len / 2, py - Math.sin(a) * len / 2, px + Math.cos(a) * len / 2, py + Math.sin(a) * len / 2, dabW * r.range(0.5, 0.9), r.chance(0.5) ? dark : base, r.int(1, 1e9), { detail: 0.5, taper1: r.range(0.5, 1) });
  }
  const nh = o.highlights ?? Math.round(clamp(size / 50, 2, 10));
  for (let i = 0; i < nh; i++) {
    const q = list[r.int(0, list.length - 1)]; const qb = P.bbox(q);
    const px = qb.cx + lx * qb.w * r.range(0.1, 0.32), py = qb.cy + ly * qb.h * r.range(0.1, 0.32);
    const len = dabW * r.range(1.4, 3.2), a = sAng + r.range(-0.4, 0.4);
    P.stroke(ctx, px - Math.cos(a) * len / 2, py - Math.sin(a) * len / 2, px + Math.cos(a) * len / 2, py + Math.sin(a) * len / 2, dabW * r.range(0.45, 0.8), o.hi || shade(light, 0.05), r.int(1, 1e9), { detail: 0.4 });
  }
  if ((o.texture ?? 0.5) > 0) P.texture(ctx, b, o.texAng ?? sAng, o.texture ?? 0.5, o.texScale ?? clamp(size / 500, 0.35, 1.4));
  ctx.restore();
  return path;
}
// bulut (R.cloud'un elle kurulan yol sürümü)
function cloud2(ctx, x, y, s, seed = 1, o = {}) {
  const list = R.cloudPts(x, y, s, seed);
  toneUnion2(ctx, list, { base: o.base || '#F7F4FB', dark: o.dark || '#ACA6D2', light: o.light || '#FFFFFF', seed, lightAng: o.lightAng ?? -1.9, shadowW: o.shadowW ?? 0.16, lightW: 0.05, strokeAng: 0, texture: 0.4, dabs: Math.round(s / 12), rim: o.rim, rimW: o.rimW });
  if (o.curls !== false) {
    const r = rng(seed + 9);
    for (let i = 0; i < 4; i++) {
      const cx = x + r.range(-0.6, 0.6) * s, cy = y + s * 0.02;
      const arc = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.15 + 0.7 * k / 8); arc.push([cx + Math.cos(a) * s * 0.28, cy - Math.sin(a) * s * 0.18 - s * 0.12]); }
      // not: curveStroke'a rgba renk verilirse kıl izleri shade() ile bozuk renk üretir (koyu çizikler);
      // bu yüzden düz hex renk + globalAlpha
      ctx.save(); ctx.globalAlpha *= (o.curlA ?? 0.85);
      P.curveStroke(ctx, arc, s * 0.05, o.curl || '#FFFFFF', r.int(1, 1e9), { taper: true, bristles: 2 });
      ctx.restore();
    }
  }
  return list;
}
// temiz akrilik güneş (R.sun'un aynısı; içteki kıvrık darbeler hex renkle çizilir → koyu çizik yok)
function sun2(ctx, x, y, R, t = 0, o = {}) {
  if (o.glowA !== 0) P.glow(ctx, x, y, R * 3.2, o.glow || '#FFE9A0', o.glowA ?? 0.35);
  const r = rng(o.seed ?? 4);
  const ring = o.ring || '#F6D23A';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU + r.range(-0.05, 0.05) + t * 0.05;
    const a2 = a + r.range(0.25, 0.42);
    const arc = []; for (let k = 0; k <= 6; k++) { const aa = lerp(a, a2, k / 6); arc.push([x + Math.cos(aa) * R * 1.04, y + Math.sin(aa) * R * 1.04]); }
    P.curveStroke(ctx, arc, R * 0.2, r.chance(0.5) ? ring : shade(ring, 0.06), r.int(1, 1e9), { taper: true, bristles: 3 });
  }
  const disk = o.disk || '#FFF3C4';
  P.toneShape(ctx, P.ellipsePts(x, y, R * 0.9, R * 0.9, 40), { base: disk, dark: o.diskDark || mix(disk, '#F2C86A', 0.45), light: shade(disk, 0.06), rim: false, shadowW: 0.08, lightW: 0.05, texture: 0.3, dabs: 6, seed: 3 });
  const swirl = o.swirl || mix(disk, '#FFFFFF', 0.6);
  ctx.save(); ctx.globalAlpha *= 0.75;
  for (let i = 0; i < 6; i++) {
    const a = r.range(0, TAU), rr = R * r.range(0.25, 0.65);
    const arc = []; for (let k = 0; k <= 6; k++) { const aa = a + k * 0.18; arc.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); }
    P.curveStroke(ctx, arc, R * 0.09, swirl, r.int(1, 1e9), { taper: true, bristles: 2 });
  }
  ctx.restore();
}
// basit akrilik leke: astar kenarı + gölge/ışık + isteğe bağlı doku (küçük nesneler için ucuz)
function blob(ctx, pts, base, o = {}) {
  const path = P.pathOf(pts);
  const la = o.la ?? -2.3;
  const b = P.bbox(pts), size = o.size ?? Math.min(b.w, b.h);
  if (o.rim) {
    ctx.save(); ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = o.rimW ?? Math.max(1.5, size * 0.06); ctx.lineJoin = 'round';
    ctx.setLineDash(o.dash || [size * 0.5, size * 0.9, size * 0.2, size * 0.7]);
    ctx.translate(-Math.cos(la) * 1.2, -Math.sin(la) * 1.2); ctx.stroke(path); ctx.restore();
  }
  shadePath(ctx, path, base, o.dark || C.coolShadow(base, 0.2), o.light || C.warmLight(base, 0.12), la, size * (o.ks ?? 0.28), size * (o.kl ?? 0.12));
  if (o.tex) { ctx.save(); ctx.clip(path); P.texture(ctx, b, o.texAng ?? 0, o.tex, o.texScale ?? 0.4); ctx.restore(); }
  return path;
}

// ---------- hızlı yaprak (ton katlı, dokusuz) ----------
function leafPts(x, y, len, ang, wr = 0.4) {
  const w = len * wr, ca = Math.cos(ang), sa = Math.sin(ang);
  const L = (u, v) => [x + ca * u * len - sa * v * w, y + sa * u * len + ca * v * w];
  return P.smoothPts([L(0, 0), L(0.28, -0.5), L(0.68, -0.44), L(1, 0), L(0.68, 0.4), L(0.28, 0.46)], true, 5);
}
function quickLeaf(ctx, x, y, len, ang, col, o = {}) {
  const pts = leafPts(x, y, len, ang, o.wr ?? 0.42);
  blob(ctx, pts, col.base, { dark: col.dark, light: col.light, la: o.la ?? -2.3, size: len * 0.4, ks: 0.45, kl: 0.22, rim: o.rim });
  if (len > 14) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    ctx.strokeStyle = rgba(col.vein || col.dark, 0.6); ctx.lineWidth = Math.max(0.8, len * 0.035);
    ctx.beginPath(); ctx.moveTo(x + ca * len * 0.1, y + sa * len * 0.1); ctx.lineTo(x + ca * len * 0.85, y + sa * len * 0.85); ctx.stroke();
  }
}

// ---------- kuş (yandan, ötücü) ----------
const BIRD_A = { body: '#2F6FD2', dark: '#1B3A8E', light: '#69B9EC', belly: '#F6E6C6', bellyD: '#D9B98E', wing: '#1F4FA8', beak: '#F2B23A' };
const BIRD_B = { body: '#E8607E', dark: '#9C3564', light: '#F7A2B6', belly: '#FCE3D0', bellyD: '#E2AE98', wing: '#B9406A', beak: '#F2B23A' };
// o: dir, col, flap (radyan faz; verilmezse tünemiş), rot, crouch 0..1, headTilt, la, seed, blink
function bird(ctx, x, y, s, o = {}) {
  const col = o.col || BIRD_A, dir = o.dir ?? 1, la0 = o.la ?? -2.3;
  const la = la0; // dünya koordinatında boyanır (noktalar dönüştürülür)
  const flying = o.flap != null;
  const T = frame(x, y, s, dir * (o.sx ?? 1), o.rot ?? 0);
  const seed = o.seed ?? 1;
  const cr = o.crouch ?? 0;
  // kanat (uçarken): β açısı
  const wingCtrl = (Ls, back) => { const xb = -0.07 * Math.max(0, Ls) - back; return [[0.12 - back, -0.07], [0.1 - back + xb * 0.4, -0.07 - 0.5 * Ls], [-0.02 + xb, -0.07 - 0.94 * Ls], [-0.12 + xb, -0.07 - Ls], [-0.17 + xb, -0.07 - 0.88 * Ls], [-0.21 + xb, -0.07 - 0.9 * Ls], [-0.25 + xb * 0.8, -0.07 - 0.74 * Ls], [-0.29 + xb * 0.7, -0.07 - 0.75 * Ls], [-0.31 + xb * 0.5, -0.07 - 0.52 * Ls], [-0.27 - back, -0.07 - 0.22 * Ls], [-0.19 - back, -0.04]]; };
  const wingPts = (Ls, back) => mapPts(T, P.smoothPts(wingCtrl(Ls, back), true, 4));
  let Ls = 0;
  if (flying) Ls = 0.85 * Math.sin(o.flap);
  if (flying) blob(ctx, wingPts(Ls * 0.92, 0.06), mix(col.wing, '#2A2350', 0.25), { dark: shade(col.wing, -0.15), light: col.wing, la, size: s * 0.2, ks: 0.3 });
  // kuyruk
  const tail = flying ? [[-0.26, -0.05], [-0.58, -0.12], [-0.63, -0.01], [-0.58, 0.09], [-0.27, 0.06]] : [[-0.26, -0.03], [-0.66, 0.16 + cr * 0.05], [-0.62, 0.27 + cr * 0.05], [-0.24, 0.1]];
  blob(ctx, mapPts(T, P.smoothPts(tail, true, 4)), col.wing, { dark: col.dark, light: col.body, la, size: s * 0.16, ks: 0.3 });
  // bacaklar (tünemiş)
  if (!flying) {
    ctx.strokeStyle = '#5A3A2A'; ctx.lineWidth = Math.max(1.2, s * 0.035); ctx.lineCap = 'round';
    for (const k of [0.06, -0.05]) { const a = T(k, 0.17), b = T(k + 0.02, 0.31); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  }
  // gövde + baş (tek birleşik biçim)
  const hy = -0.17 + cr * 0.06 + (o.headDy ?? 0), hx = 0.33 + (o.headDx ?? 0);
  const body = mapPts(T, P.smoothPts([[0.4, -0.06], [0.33, 0.12], [0.12, 0.21 - cr * 0.02], [-0.14, 0.17], [-0.36, 0.04], [-0.3, -0.07], [-0.06, -0.15 + cr * 0.03], [0.22, -0.16 + cr * 0.04]], true, 6));
  const headC = T(hx, hy);
  const head = P.ellipsePts(headC[0], headC[1], s * 0.16, s * 0.155, 22);
  toneUnion2(ctx, [body, head], { base: col.body, dark: col.dark, light: col.light, seed, lightAng: la, shadowW: 0.16, lightW: 0.07, dabs: 3, highlights: 2, texture: 0.35, rimW: Math.max(1.6, s * 0.035), size: s * 0.7 });
  // göğüs
  const belly = mapPts(T, P.smoothPts([[0.38, -0.02], [0.3, 0.13], [0.1, 0.2 - cr * 0.02], [-0.06, 0.17], [0.06, 0.06], [0.22, -0.01]], true, 5));
  blob(ctx, belly, col.belly, { dark: col.bellyD, light: '#FFFBF0', la, size: s * 0.16, ks: 0.35 });
  // kanat (kapalı ya da yakın kanat)
  if (flying) {
    const wp = wingPts(Ls, 0);
    const path = blob(ctx, wp, col.wing, { dark: col.dark, light: col.light, la, size: s * 0.2, ks: 0.28, kl: 0.1 });
    // örtü tüyleri (açık bant) ve uç tüy ayrımları
    ctx.save(); ctx.clip(path);
    const cv = mapPts(T, P.smoothPts([[0.13, -0.07], [0.11, -0.07 - 0.45 * Ls], [-0.05, -0.07 - 0.5 * Ls], [-0.2, -0.05]], true, 4));
    ctx.fillStyle = rgba(col.light, 0.75); ctx.fill(P.pathOf(cv));
    const wc = wingCtrl(Ls, 0);
    ctx.strokeStyle = rgba(col.dark, 0.8); ctx.lineWidth = Math.max(1, s * 0.022); ctx.lineCap = 'round';
    for (const [i0, f] of [[4, 0.55], [6, 0.5], [8, 0.45]]) { const a = wc[i0], q = T(a[0], a[1]), m = T(lerp(a[0], -0.08, f), lerp(a[1], -0.07 - 0.35 * Ls, f)); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(m[0], m[1]); ctx.stroke(); }
    ctx.restore();
  }
  else blob(ctx, mapPts(T, P.smoothPts([[0.18, -0.07 + cr * 0.03], [0.0, -0.12 + cr * 0.03], [-0.3, -0.04], [-0.52, 0.08], [-0.24, 0.12], [0.06, 0.08]], true, 5)), col.wing, { dark: col.dark, light: col.light, la, size: s * 0.18, ks: 0.3 });
  // gaga
  const bk = mapPts(T, [[hx + 0.12, hy - 0.04], [hx + 0.3, hy + 0.015], [hx + 0.12, hy + 0.06]]);
  ctx.fillStyle = col.beak; ctx.fill(P.pathOf(bk));
  ctx.fillStyle = rgba('#B7741E', 0.8); ctx.fill(P.pathOf([bk[1], bk[2], T(hx + 0.13, hy + 0.02)]));
  // göz
  const ey = T(hx + 0.05, hy - 0.03);
  if ((o.blink ?? 0) < 0.5) {
    ctx.fillStyle = '#1D1B2E'; ctx.beginPath(); ctx.arc(ey[0], ey[1], s * 0.032, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(ey[0] + dir * s * 0.01, ey[1] - s * 0.012, s * 0.011, 0, TAU); ctx.fill();
  } else {
    ctx.strokeStyle = '#1D1B2E'; ctx.lineWidth = Math.max(1, s * 0.022); ctx.beginPath(); ctx.arc(ey[0], ey[1] - s * 0.01, s * 0.03, 0.2, Math.PI - 0.2); ctx.stroke();
  }
  return { head: headC };
}

// ---------- kelebek (önden, kanat çırpan) ----------
function butterfly(ctx, x, y, s, phase, o = {}) {
  const f = Math.abs(Math.cos(phase)) * 0.85 + 0.15; // kanat açıklığı (yatay basıklık)
  const c1 = o.c1 || '#F59A2E', c2 = o.c2 || '#FFD45A', tip = o.tip || '#3A2350';
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  for (const sg of [-1, 1]) {
    const up = P.smoothPts([[0, -0.05], [sg * 0.35 * f, -0.55], [sg * 0.85 * f, -0.62], [sg * 0.92 * f, -0.2], [sg * 0.4 * f, 0.02]], true, 5).map(([a, b]) => [a * s, b * s]);
    const lo = P.smoothPts([[0, 0.02], [sg * 0.55 * f, 0.08], [sg * 0.62 * f, 0.45], [sg * 0.25 * f, 0.5]], true, 5).map(([a, b]) => [a * s, b * s]);
    ctx.fillStyle = shade(c1, -0.06); ctx.fill(P.pathOf(lo));
    ctx.fillStyle = c1; ctx.fill(P.pathOf(up));
    ctx.save(); ctx.clip(P.pathOf(up));
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(sg * 0.42 * f * s, -0.28 * s, 0.2 * f * s + 0.5, 0.17 * s, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = tip; ctx.beginPath(); ctx.ellipse(sg * 0.9 * f * s, -0.62 * s, 0.25 * f * s + 0.5, 0.22 * s, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  ctx.strokeStyle = tip; ctx.lineWidth = Math.max(1.5, s * 0.1); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -0.25 * s); ctx.lineTo(0, 0.42 * s); ctx.stroke();
  ctx.lineWidth = Math.max(0.8, s * 0.04);
  ctx.beginPath(); ctx.moveTo(0, -0.25 * s); ctx.quadraticCurveTo(-0.1 * s, -0.5 * s, -0.22 * s, -0.6 * s); ctx.moveTo(0, -0.25 * s); ctx.quadraticCurveTo(0.1 * s, -0.5 * s, 0.22 * s, -0.6 * s); ctx.stroke();
  ctx.restore();
}

// ---------- koyun (yandan, otlayan) ----------
const SHEEP = { wool: '#F6F0E2', woolD: '#BDB2D2', woolL: '#FFFFFF', face: '#3B2C3A', faceD: '#22182A', faceL: '#6A4E5E', leg: '#3B2C3A' };
// x,y: ayakların bastığı orta nokta; s: gövde uzunluğu; o: dir, graze 0..1 (baş aşağı), chew faz, la, seed, bob, step (bacak salınımı)
function sheep(ctx, x, y, s, o = {}) {
  const dir = o.dir ?? 1, la = o.la ?? -2.3, seed = o.seed ?? 3;
  const T = frame(x, y, s, dir, 0);
  const g = clamp(o.graze ?? 0), bob = o.bob ?? 0;
  const legH = 0.21;
  const by = -legH - 0.19 + bob * 0.008; // gövde merkezi
  // bacaklar (uzak çift biraz koyu)
  const legs = [[0.25, true], [-0.27, true], [0.3, false], [-0.21, false]];
  for (const [lx, far] of legs) {
    const fx = lx + (far ? 0.025 : 0);
    const a = T(lx, by + 0.1), b = T(fx, -0.02);
    const cap = R_capsule(a, b, s * 0.08, s * 0.062);
    blob(ctx, cap, far ? shade(SHEEP.leg, -0.07) : SHEEP.leg, { dark: SHEEP.faceD, light: SHEEP.faceL, la, size: s * 0.07, ks: 0.35 });
    const hf = mapPts(T, [[fx - 0.045, -0.035], [fx + 0.05, -0.035], [fx + 0.056, 0.004], [fx - 0.05, 0.004]]);
    ctx.fillStyle = '#1D1B2E'; ctx.fill(P.pathOf(hf));
  }
  // baş/boyun geometrisi: boyun pivotu gövdenin ön üstünde; graze ile aşağı iner
  const piv = [0.3, by - 0.04];
  const ha = lerp(deg(-38), deg(70), g) + Math.sin(o.chew ?? 0) * deg(2.2) * g; // + aşağı
  const NL = 0.15;
  const cu = Math.cos(ha), su = Math.sin(ha);
  const hb = [piv[0] + cu * NL, piv[1] + su * NL]; // baş kökü
  const HT = (u, v) => T(hb[0] + u * cu - v * su, hb[1] + u * su + v * cu);
  // uzak kulak
  blob(ctx, P.smoothPts([HT(0.03, -0.07), HT(-0.06, -0.15), HT(-0.13, -0.14), HT(-0.05, -0.05)], true, 4), shade(SHEEP.face, -0.06), { dark: SHEEP.faceD, light: SHEEP.faceL, la, size: s * 0.05 });
  // yün gövde + boyun: daireler birleşimi
  const r = rng(seed);
  const list = [];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const cx = Math.cos(a) * 0.35, cy = by + Math.sin(a) * 0.15;
    const rr = r.range(0.135, 0.17);
    const c = T(cx, cy);
    list.push(P.ellipsePts(c[0], c[1], rr * s, rr * s * 0.95, 20));
  }
  const cc = T(0, by); list.push(P.ellipsePts(cc[0], cc[1], s * 0.39, s * 0.2, 28));
  // boyun yünü: pivottan baş köküne kalın kapsül
  list.push(R_capsule(T(piv[0] - 0.05, piv[1] + 0.02), T(hb[0] - cu * 0.02, hb[1] - su * 0.02), s * 0.2, s * 0.15));
  toneUnion2(ctx, list, { base: SHEEP.wool, dark: SHEEP.woolD, light: SHEEP.woolL, seed, lightAng: la, shadowW: 0.14, lightW: 0.06, dabs: 10, highlights: 6, texture: 0.4, size: s * 0.9, rimW: Math.max(2, s * 0.012) });
  // yün kıvrımları (biçimi izleyen kısa yay darbeler)
  const r2 = rng(seed + 5);
  for (let i = 0; i < 9; i++) {
    const cx = r2.range(-0.33, 0.27), cy = by + r2.range(-0.1, 0.09);
    const arc = []; const a0 = r2.range(0, TAU);
    for (let k = 0; k <= 6; k++) { const aa = a0 + k * 0.5; arc.push(T(cx + Math.cos(aa) * 0.045, cy + Math.sin(aa) * 0.04)); }
    P.curveStroke(ctx, arc, s * 0.018, rgba(r2.chance(0.5) ? '#FFFFFF' : SHEEP.woolD, 0.7), r2.int(1, 1e9), { taper: true, bristles: 0, detail: 0 });
  }
  // kuyruk
  const tc = T(-0.46, by - 0.03); blob(ctx, P.ellipsePts(tc[0], tc[1], s * 0.07, s * 0.065, 14), SHEEP.wool, { dark: SHEEP.woolD, light: '#FFFFFF', la, size: s * 0.1 });
  // baş
  const headP = P.smoothPts([HT(0.0, -0.085), HT(0.13, -0.1), HT(0.25, -0.055), HT(0.29, 0.02), HT(0.25, 0.065), HT(0.11, 0.075), HT(0.0, 0.06), HT(-0.04, -0.015)], true, 6);
  blob(ctx, headP, SHEEP.face, { dark: SHEEP.faceD, light: SHEEP.faceL, la, size: s * 0.15, ks: 0.3, kl: 0.16, rim: true, rimW: Math.max(1.5, s * 0.01) });
  // yakın kulak
  blob(ctx, P.smoothPts([HT(0.06, -0.055), HT(-0.01, -0.015), HT(-0.13, 0.02), HT(-0.03, -0.075)], true, 4), SHEEP.face, { dark: SHEEP.faceD, light: '#8A6474', la, size: s * 0.05 });
  // perçem (yün)
  const t1 = HT(0.01, -0.09), t2 = HT(0.08, -0.105);
  toneUnion2(ctx, [P.ellipsePts(t1[0], t1[1], s * 0.06, s * 0.055, 14), P.ellipsePts(t2[0], t2[1], s * 0.048, s * 0.044, 14)], { base: SHEEP.wool, dark: SHEEP.woolD, light: '#FFFFFF', seed: seed + 2, lightAng: la, shadowW: 0.2, rim: false, dabs: 1, highlights: 1, texture: 0.2 });
  // göz: mutlu kapalı yay (başla birlikte döner; ayna yönünde de doğru dursun diye noktalardan çizilir)
  const eye = []; for (let k = 0; k <= 6; k++) { const aa = 0.3 + (k / 6) * (Math.PI - 0.6); eye.push(HT(0.14 + Math.cos(aa) * 0.024, -0.035 + Math.sin(aa) * 0.02)); }
  ctx.strokeStyle = '#F6EADF'; ctx.lineWidth = Math.max(1.3, s * 0.014); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(eye[0][0], eye[0][1]); for (const q of eye) ctx.lineTo(q[0], q[1]); ctx.stroke();
  const nz = HT(0.265, 0.0); ctx.fillStyle = rgba('#8A6474', 0.8); ctx.beginPath(); ctx.arc(nz[0], nz[1], s * 0.012, 0, TAU); ctx.fill();
  return { mouth: HT(0.28, 0.04) };
}
function R_capsule(a, b, wa, wb) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]); const out = [];
  for (let i = 0; i <= 6; i++) { const t = ang - Math.PI / 2 + (i / 6) * Math.PI; out.push([b[0] + Math.cos(t) * wb / 2, b[1] + Math.sin(t) * wb / 2]); }
  for (let i = 0; i <= 6; i++) { const t = ang + Math.PI / 2 + (i / 6) * Math.PI; out.push([a[0] + Math.cos(t) * wa / 2, a[1] + Math.sin(t) * wa / 2]); }
  return out;
}

// ---------- yağmur çizgileri (kısa eğik darbeler, sabit tohumlu döngü) ----------
function rain(ctx, x0, x1, y0, y1, t, n, seed, o = {}) {
  const r = rng(seed);
  const sp = o.speed ?? 900, len = o.len ?? 26, ang = o.ang ?? 0.18;
  ctx.save(); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1), ph = r.next(), w = r.range(1.6, 2.8) * (o.w ?? 1);
    const H = y1 - y0;
    const k = ((t * sp) / H + ph) % 1;
    const y = y0 + k * H;
    const a = Math.min(1, Math.min(k, 1 - k) * 8) * (o.alpha ?? 0.7);
    ctx.strokeStyle = rgba(o.color || '#CFE3F2', a); ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x - Math.sin(ang) * len * 0.5 + (y - y0) * Math.tan(ang) * 0.0, y - len * 0.5); ctx.lineTo(x + Math.sin(ang) * len * 0.5, y + len * 0.5); ctx.stroke();
  }
  ctx.restore();
}

module.exports = { sun2, unionPath, toneUnion2, cloud2, hcache, frame, mapPts, shadePath, ringPath, blob, leafPts, quickLeaf, bird, BIRD_A, BIRD_B, butterfly, sheep, SHEEP, rain, capsule: R_capsule };
