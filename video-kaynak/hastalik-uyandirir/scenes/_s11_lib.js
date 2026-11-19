// s11 / s12 ortak yardımcıları.
// - Ayak izi tabanlı yürüyüş (scenes/_s02_walk.js'in anlık kopyası; o dosya başka yazara ait, değişirse bozulmayalım diye):
//   basma evresinde ayak yere sabit, topuk/burun etrafında döner; eğik zemin için "warp" ile katı dönüşüm.
// - Elle kurulan birleşik yol, bulut ve yağmur (scenes/_s05_lib.js'in kopyası: s10'daki yağmur bulutuyla aynı görünüm).
// - Paralaks kamera katmanı, yüksek çözünürlüklü önbellek.
'use strict';
const { Path2D } = require('@napi-rs/canvas');
const M = require('../engine/man');
const P = require('../engine/paint');
const R = require('../engine/props');
const C = require('../engine/core');
const { clamp, lerp, deg, TAU, rng, shade, rgba, mix } = C;

// ======================= yürüyüş =======================
const LT = M.L.thigh, LS = M.L.shin, LL = LT + LS;
const FL = M.L.foot, FH = 0.042;
const SHOE_CTRL = [[-0.28, -0.25], [0.15, -0.55], [0.55, -0.42], [0.92, -0.12], [1.0, 0.25], [0.6, 0.42], [0.0, 0.45], [-0.32, 0.38], [-0.38, 0.0]];
const SHOE_UNIT = P.smoothPts(SHOE_CTRL, true, 5);
function footOff(a, b, fa) { const c = Math.cos(fa), s = Math.sin(fa); return [c * a * FL - s * b * FH, s * a * FL + c * b * FH + 0.35 * FH]; }
const FLAT_DROP = Math.max(...SHOE_UNIT.map(([a, b]) => footOff(a, b, 0)[1]));
function bestPivot(fa0, fa1) {
  let best = null, bestPen = Infinity;
  for (const v of SHOE_UNIT) {
    let pen = 0;
    for (let i = 0; i <= 12; i++) {
      const fa = lerp(fa0, fa1, i / 12), pv = footOff(v[0], v[1], fa);
      for (const w of SHOE_UNIT) { const q = footOff(w[0], w[1], fa); pen = Math.max(pen, q[1] - pv[1]); }
    }
    if (pen < bestPen) { bestPen = pen; best = v; }
  }
  return best;
}
const HEEL_PIV = bestPivot(deg(-14), deg(-2));
function dropAt(fa) { let m = -Infinity; for (const [a, b] of SHOE_UNIT) { const y = footOff(a, b, fa)[1]; if (y > m) m = y; } return m; }
const TOE_PIV = bestPivot(deg(4), deg(34));
const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
function smin(a, b, k) { const m = Math.min(a, b); return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k)); }
const ST = 0.6;
function legTarget(loc, fpA, fpB, o) {
  const hs = o.heelStrike ?? deg(11), to = o.toeOff ?? deg(30), lift = o.lift ?? 0.055;
  const flatY = -FLAT_DROP;
  if (loc < ST) {
    const k = loc / ST;
    if (k < 0.13) {
      const fa = -hs * (1 - sm(k / 0.13));
      const piv0 = footOff(HEEL_PIV[0], HEEL_PIV[1], 0), pv = footOff(HEEL_PIV[0], HEEL_PIV[1], fa);
      return { ankle: [fpA + piv0[0] - pv[0], -dropAt(fa)], fa, stance: 1 };
    }
    const kr = o.heelRiseStart ?? 0.62;
    if (k < kr) return { ankle: [fpA, flatY], fa: 0, stance: 1 };
    const fa = to * sm((k - kr) / (1 - kr)) * (o.heelRise ?? 1);
    const piv0 = footOff(TOE_PIV[0], TOE_PIV[1], 0), pv = footOff(TOE_PIV[0], TOE_PIV[1], fa);
    return { ankle: [fpA + piv0[0] - pv[0], -dropAt(fa)], fa, stance: 1 };
  }
  const k = (loc - ST) / (1 - ST);
  const a0 = legTarget(ST - 1e-6, fpA, fpB, o), a1 = legTarget(0, fpB, fpB, o);
  const ex = k * k * (3 - 2 * k) * 0.88 + k * 0.12;
  const x = lerp(a0.ankle[0], a1.ankle[0], ex);
  const y = lerp(a0.ankle[1], a1.ankle[1], sm(k)) - lift * Math.pow(Math.sin(Math.PI * Math.pow(k, 0.8)), 0.85);
  const fa = lerp(a0.fa, a1.fa, sm(k * 1.15));
  return { ankle: [x, y], fa, stance: 0 };
}
function legIK(hip, ankle) {
  let dx = ankle[0] - hip[0], dy = ankle[1] - hip[1];
  let d = Math.hypot(dx, dy);
  const dmax = LL * 0.9995, dmin = Math.abs(LT - LS) + 0.02;
  if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
  const q = Math.atan2(dx, dy);
  const al = Math.acos(clamp((LT * LT + d * d - LS * LS) / (2 * LT * d), -1, 1));
  const th = q + al;
  const kx = hip[0] + Math.sin(th) * LT, ky = hip[1] + Math.cos(th) * LT;
  const sa = Math.atan2(hip[0] + dx - kx, hip[1] + dy - ky);
  return { th, kn: th - sa, sa };
}
// spec: D, legs[{loc,fpA,fpB}x2], warp, lean, ext, cap, legOpts, over
function evalWalker(spec) {
  const lo = Object.assign({}, spec.legOpts || {});
  let tg = spec.legs.map((L) => legTarget(L.loc, L.fpA, L.fpB, lo));
  if (spec.warp) tg = tg.map((g) => { const w = spec.warp(g.ankle[0] - spec.D, g.ankle[1], g.fa); return { ankle: [spec.D + w[0], w[1]], fa: w[2], stance: g.stance }; });
  const ext = spec.ext ?? 0.985;
  const cap = (spec.cap ?? FLAT_DROP + LL * ext);
  const feas = tg.map((g) => {
    const dx = g.ankle[0] - spec.D;
    const L = LL * (g.stance ? 0.997 : 0.985);
    return -g.ankle[1] + Math.sqrt(Math.max(1e-6, L * L - dx * dx));
  });
  let H = smin(feas[0], feas[1], 0.006);
  H = smin(H, cap, 0.008);
  const hip = [0, -H];
  const legs = tg.map((g) => {
    const ik = legIK(hip, [g.ankle[0] - spec.D, g.ankle[1]]);
    return { th: ik.th, kn: ik.kn, ft: g.fa - ik.sa, ankle: g.ankle, fa: g.fa, stance: g.stance };
  });
  const p = M.pose({
    px: 0, py: H - 0.5,
    thighN: legs[0].th, kneeN: legs[0].kn, footN: legs[0].ft,
    thighF: legs[1].th, kneeF: legs[1].kn, footF: legs[1].ft,
    torso: deg(4) + (spec.lean ?? 0),
  });
  Object.assign(p, spec.over || {});
  return { pose: p, hipH: H, legs };
}
function steadyLegs(u, S, D0) {
  const kN = Math.floor(u), lN = u - kN;
  const uF = u + 0.5, kF = Math.floor(uF), lF = uF - kF;
  const fpN = D0 + 2 * S * (kN + 0.3), fpF = D0 + 2 * S * (kF - 0.2);
  return [{ loc: lN, fpA: fpN, fpB: fpN + 2 * S }, { loc: lF, fpA: fpF, fpB: fpF + 2 * S }];
}
function armIK(Sh, T) {
  const a = M.L.upper, b = M.L.fore;
  let dx = T[0] - Sh[0], dy = T[1] - Sh[1];
  let d = Math.hypot(dx, dy);
  const dmax = (a + b) * 0.998, dmin = Math.abs(a - b) + 0.01;
  if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
  const q = Math.atan2(dx, dy);
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const ua = q - A;
  const ex = Sh[0] + Math.sin(ua) * a, ey = Sh[1] + Math.cos(ua) * a;
  const fa = Math.atan2(Sh[0] + dx - ex, Sh[1] + dy - ey);
  return { ua, fa };
}
// pozun kolunu bileği yerel hedefe (h=1) götürecek biçimde ayarla
function reach(p, target, which = 'N', k = 1, handA = null) {
  const s = M.skeleton(p, 1);
  const ik = armIK(s['arm' + which].shoulder, target);
  const follow = p.armFollow ?? 0.3;
  const o = Object.assign({}, p);
  o['arm' + which] = lerp(p['arm' + which], ik.ua - p.torso * follow, k);
  o['elbow' + which] = lerp(p['elbow' + which], ik.fa - ik.ua, k);
  if (handA != null) o['hand' + which] = lerp(p['hand' + which], handA - ik.fa, k);
  return o;
}

// ======================= boya yardımcıları =======================
function area(q) { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] - q[i][0]) * (q[j][1] + q[i][1]); return a / 2; }
// Path2D.addPath bazı sıralarda bozuk kırpma üretiyor: birleşik yolu elle kur (aynı dönüş yönüyle)
function unionPath(list) {
  const p = new Path2D();
  for (let q of list) { if (!q.length) continue; if (area(q) < 0) q = q.slice().reverse(); p.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) p.lineTo(q[k][0], q[k][1]); p.closePath(); }
  return p;
}
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
function cloud2(ctx, x, y, s, seed = 1, o = {}) {
  const list = R.cloudPts(x, y, s, seed);
  toneUnion2(ctx, list, { base: o.base || '#F7F4FB', dark: o.dark || '#ACA6D2', light: o.light || '#FFFFFF', seed, lightAng: o.lightAng ?? -1.9, shadowW: o.shadowW ?? 0.16, lightW: 0.05, strokeAng: 0, texture: 0.4, dabs: Math.round(s / 12), rim: o.rim, rimW: o.rimW });
  if (o.curls !== false) {
    const r = rng(seed + 9);
    for (let i = 0; i < 4; i++) {
      const cx = x + r.range(-0.6, 0.6) * s, cy = y + s * 0.02;
      const arc = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.15 + 0.7 * k / 8); arc.push([cx + Math.cos(a) * s * 0.28, cy - Math.sin(a) * s * 0.18 - s * 0.12]); }
      ctx.save(); ctx.globalAlpha *= (o.curlA ?? 0.85); P.curveStroke(ctx, arc, s * 0.05, o.curl || '#FFFFFF', r.int(1, 1e9), { taper: true, bristles: 2 }); ctx.restore();
    }
  }
  return list;
}
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
    const dx = Math.tan(ang) * len * 0.5;
    ctx.beginPath(); ctx.moveTo(x + (y - y0) * Math.tan(ang) - dx, y - len * 0.5); ctx.lineTo(x + (y - y0) * Math.tan(ang) + dx, y + len * 0.5); ctx.stroke();
  }
  ctx.restore();
}
// yüksek çözünürlüklü önbellek (kamera yaklaşınca da keskin)
function hcache(key, w, h, ss, fn) {
  return R.cached('s11x:' + key, Math.ceil(w * ss), Math.ceil(h * ss), (x) => { x.scale(ss, ss); fn(x); });
}
// Paralaks kamera: f=1 dünya katmanı, f<1 uzak katman (daha az kayar, daha az yakınlaşır). ref: başlangıç kamerası
function camLayer(ctx, cam, ref, f) {
  R.camera(ctx, { zoom: lerp(ref.zoom, cam.zoom, f), cx: lerp(ref.cx, cam.cx, f), cy: lerp(ref.cy, cam.cy, f), rot: (cam.rot || 0) * f });
}
// Hermite anahtarlarıyla tekdüze zaman eğrisi: keys [[t, u, du]]
function hermite(keys, t) {
  if (t <= keys[0][0]) return keys[0][1] + (t - keys[0][0]) * keys[0][2];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1] + (t - keys[n - 1][0]) * keys[n - 1][2];
  let i = 0; while (t > keys[i + 1][0]) i++;
  const [t0, u0, d0] = keys[i], [t1, u1, d1] = keys[i + 1];
  const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
  return (2 * s3 - 3 * s2 + 1) * u0 + (s3 - 2 * s2 + s) * h * d0 + (-2 * s3 + 3 * s2) * u1 + (s3 - s2) * h * d1;
}

module.exports = {
  SHOE_UNIT, FLAT_DROP, footOff, legTarget, legIK, evalWalker, steadyLegs, armIK, reach, sm, smin, ST,
  unionPath, shadePath, toneUnion2, cloud2, rain, hcache, camLayer, hermite,
};
