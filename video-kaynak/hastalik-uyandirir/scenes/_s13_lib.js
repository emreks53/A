// Ortak yardımcılar (s13, s14, s15):
//   - altın ışık küresi ("sermaye"): önbellekli gövde + dönen ışın darbeleri + ışıma
//   - kürenin yörüngesinde dönen altın sikkeler ve mücevherler (önde/arkada katman)
//   - ışık fidanı (ticaretle alınan, yol boyunca dikilen)
//   - ayak izi tabanlı yürüyüş ve kol IK: scenes/_s02_walk.js'ten UYARLANMIŞ KOPYA (o dosya başka yazarın;
//     değişirse bu sahneler bozulmasın diye kopyalandı).
// Altın tonları R.coin ve R.hourglass kumuyla birebir aynı: PAL.gold / PAL.goldDeep / PAL.goldLight.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, deg, noise1 } = C;
const PAL = P.PAL;

const GOLD = PAL.gold, GOLD_D = PAL.goldDeep, GOLD_L = PAL.goldLight;
const CREAM = '#FFF4CF', HOT = '#FFFCEE';

// =====================================================================
// Işık küresi
// =====================================================================
const R0 = 200;              // önbellekteki referans yarıçap
const PAD = 1.34;            // tuval kenar payı (taç halkası için)
function orbBody() {
  const S = Math.ceil(R0 * 2 * PAD);
  return R.cached('s13:orbBody', S, S, (x) => {
    const c = S / 2;
    // dış disk: kumla/sikkeyle aynı altın; sağ altta soğuk-sıcak gölge, sol üstte ışık
    P.toneShape(x, P.ellipsePts(c, c, R0, R0, 80), { base: GOLD, dark: GOLD_D, light: GOLD_L, seed: 131, shadowW: 0.13, lightW: 0.1, coreScale: 0.93, dabs: 16, dabW: 16, highlights: 3, texture: 0.4, rimW: 7 });
    // iç katlar: ışık merkeze doğru yoğunlaşır (düz ton katları, keskin sınırlar)
    P.toneShape(x, P.blobPts(c - R0 * 0.08, c - R0 * 0.1, R0 * 0.74, R0 * 0.72, 3, 0.05, 60), { base: '#F6C64E', dark: GOLD, light: GOLD_L, rim: false, shadowW: 0.1, lightW: 0.1, dabs: 12, dabW: 13, texture: 0.32, seed: 132 });
    P.toneShape(x, P.blobPts(c - R0 * 0.18, c - R0 * 0.2, R0 * 0.48, R0 * 0.46, 5, 0.06, 48), { base: '#FFE28E', dark: '#F6C64E', light: '#FFF6D2', rim: false, shadowW: 0.12, lightW: 0.12, dabs: 8, dabW: 11, texture: 0.25, seed: 133 });
    P.toneShape(x, P.blobPts(c - R0 * 0.28, c - R0 * 0.3, R0 * 0.24, R0 * 0.21, 7, 0.1, 30), { base: CREAM, dark: '#FFE28E', light: HOT, rim: false, shadowW: 0.1, lightW: 0.2, dabs: 3, highlights: 1, texture: 0.15, seed: 134 });
    // biçimi izleyen kıvrık darbeler (yuvarlak nesnede darbe biçimi izler)
    const r = rng(135);
    for (let i = 0; i < 22; i++) {
      const rr = R0 * r.range(0.3, 0.92), a0 = r.range(0, TAU), span = r.range(0.35, 0.9);
      const arc = []; for (let k = 0; k <= 8; k++) { const a = a0 + span * k / 8; arc.push([c + Math.cos(a) * rr, c + Math.sin(a) * rr]); }
      const lightSide = Math.cos(a0 + span / 2 + 2.3) > 0; // sol üst yarı
      const col = rr > R0 * 0.7 ? (lightSide ? GOLD_L : (r.chance(0.5) ? '#F6C64E' : GOLD_D)) : (lightSide ? HOT : '#FFE7A0');
      P.curveStroke(x, arc, R0 * r.range(0.04, 0.075), rgba(col, r.range(0.45, 0.75)), r.int(1, 1e9), { taper: true, detail: 0 });
    }
    // taç halkası: disk kenarında kısa altın yay darbeleri (R.sun ile aynı dil)
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU + r.range(-0.05, 0.05), a2 = a + r.range(0.22, 0.4);
      const arc = []; for (let k = 0; k <= 6; k++) { const aa = lerp(a, a2, k / 6); arc.push([c + Math.cos(aa) * R0 * 1.05, c + Math.sin(aa) * R0 * 1.05]); }
      P.curveStroke(x, arc, R0 * 0.13, r.chance(0.55) ? GOLD_L : (r.chance(0.5) ? GOLD : '#F6C64E'), r.int(1, 1e9), { taper: true, bristles: 3 });
    }
  });
}
// gövdenin üstünde yavaşça dönen iç enerji darbeleri (saydam katman)
function orbSwirl() {
  const S = Math.ceil(R0 * 2 * PAD);
  return R.cached('s13:orbSwirl', S, S, (x) => {
    const c = S / 2, r = rng(141);
    for (let i = 0; i < 12; i++) {
      const rr = R0 * r.range(0.35, 0.8), a0 = r.range(0, TAU), span = r.range(0.5, 1.1);
      const arc = []; for (let k = 0; k <= 9; k++) { const a = a0 + span * k / 9; arc.push([c + Math.cos(a) * rr, c + Math.sin(a) * rr]); }
      P.curveStroke(x, arc, R0 * r.range(0.035, 0.06), rgba(r.chance(0.6) ? HOT : GOLD_L, r.range(0.35, 0.6)), r.int(1, 1e9), { taper: true, detail: 0 });
    }
  });
}

// Işın darbeleri: yerel çerçevede sabit biçimli (titremez), uzunluk ölçekle değişir.
const RAYS = (() => {
  const r = rng(151), out = [];
  const N = 20;
  for (let i = 0; i < N; i++) {
    const long = i % 2 === 0;
    out.push({ a: (i / N) * TAU + r.range(-0.04, 0.04), L: R0 * (long ? r.range(0.95, 1.25) : r.range(0.45, 0.62)), w: R0 * (long ? r.range(0.15, 0.19) : r.range(0.11, 0.14)), seed: r.int(1, 1e9), ph: r.range(0, TAU), col: long ? GOLD_L : CREAM });
  }
  return out;
})();
function orbRays(ctx, x, y, r, t, amt = 1, rot = 0, alpha = 0.62) {
  if (amt <= 0.001) return;
  const k = r / R0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  for (const q of RAYS) {
    const pulse = 0.86 + 0.14 * Math.sin(t * 2.4 + q.ph);
    ctx.save(); ctx.rotate(q.a); ctx.translate(R0 * 1.1, 0); ctx.scale(Math.max(0.02, amt * pulse), 1);
    ctx.globalAlpha = alpha * clamp(amt * 1.6);
    P.stroke(ctx, 0, 0, q.L, 0, q.w, q.col, q.seed, { taper0: 1, taper1: 0.1, detail: 0.6, ridge: false, wob: 0.08 });
    ctx.restore();
  }
  ctx.restore();
}
// Tam küre: o = { glow, rays, rayRot, swirl, alpha, flash }
function drawOrb(ctx, x, y, r, t, o = {}) {
  if (r <= 0.5) return;
  const glow = o.glow ?? 1;
  const pulse = 1 + 0.06 * Math.sin(t * 3.1) + 0.03 * Math.sin(t * 7.7);
  if (glow > 0) {
    P.glow(ctx, x, y, r * 3.6 * (o.glowScale ?? 1), '#FFC861', 0.42 * glow * pulse);
    P.glow(ctx, x, y, r * 1.9, '#FFF0B8', 0.5 * glow * pulse);
  }
  orbRays(ctx, x, y, r, t, o.rays ?? 1, o.rayRot ?? t * 0.12, o.rayAlpha ?? 0.62);
  const body = orbBody(), S = body.width, k = r / R0;
  ctx.save();
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  ctx.translate(x, y); ctx.scale(k, k);
  ctx.drawImage(body, -S / 2, -S / 2);
  if ((o.swirl ?? 1) > 0) { ctx.rotate(t * 0.35); ctx.globalAlpha = (o.alpha ?? 1) * (o.swirl ?? 1); ctx.drawImage(orbSwirl(), -S / 2, -S / 2); }
  ctx.restore();
  if (glow > 0) P.glow(ctx, x - r * 0.25, y - r * 0.28, r * 0.75, '#FFFFFF', 0.35 * glow * pulse);
}

// Kıvılcım (küre doğmadan önce): dört uçlu parıltı + küçük ışıma
function spark(ctx, x, y, s, t, a = 1) {
  if (a <= 0 || s <= 0) return;
  P.glow(ctx, x, y, s * 5, '#FFE7A0', 0.7 * a);
  ctx.save(); ctx.translate(x, y); ctx.rotate(t * 1.5);
  R.sparkle(ctx, 0, 0, s * 1.6, a, '#FFFBEA');
  ctx.rotate(Math.PI / 4); R.sparkle(ctx, 0, 0, s * 0.8, a * 0.8, GOLD_L);
  ctx.restore();
}

// =====================================================================
// Yörüngedeki sikkeler ve mücevherler
// =====================================================================
const GEM_COLS = ['#D8283E', '#2EAD56', '#2E6FD8', '#9B4FD0'];
function makeOrbit(n = 12, seed = 161, gems = 3) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const gem = i % Math.max(1, Math.round(n / gems)) === 2 && out.filter((q) => q.gem).length < gems;
    out.push({ i, a0: (i / n) * TAU + r.range(-0.12, 0.12), rad: r.range(0.92, 1.1), dy: r.range(-0.06, 0.06), sz: r.range(0.85, 1.15), spin: r.range(2.5, 4.5), ph: r.range(0, TAU), seed: r.int(1, 999), gem, col: GEM_COLS[out.filter((q) => q.gem).length % GEM_COLS.length] });
  }
  return out;
}
function gemShape(ctx, x, y, s, col, rot, seed) {
  const pts = []; for (let k = 0; k < 6; k++) { const a = rot + (k / 6) * TAU; pts.push([x + Math.cos(a) * s, y + Math.sin(a) * s * 0.86]); }
  P.toneShape(ctx, pts, { base: col, dark: shade(col, -0.2, 0.05), light: shade(col, 0.22), rim: false, shadowW: 0.28, lightW: 0.22, texture: 0.15, dabs: 0, highlights: 0, seed });
  // faset ışığı
  ctx.fillStyle = rgba('#FFFFFF', 0.75);
  ctx.beginPath(); ctx.moveTo(x - s * 0.45, y - s * 0.2); ctx.lineTo(x - s * 0.1, y - s * 0.55); ctx.lineTo(x + s * 0.05, y - s * 0.25); ctx.closePath(); ctx.fill();
}
// Yörünge konumları: k (0..1) çıkış ilerlemesi (merkezden dışarı), layer: 'back' | 'front'
// o = { rx, ry, tilt, speed, coinR, born(i) -> 0..1 }
function orbitItems(cx, cy, t, items, o) {
  const out = [];
  const ct = Math.cos(o.tilt ?? 0), st = Math.sin(o.tilt ?? 0);
  for (const q of items) {
    const born = o.born ? o.born(q) : 1;
    if (born <= 0) continue;
    const a = q.a0 + t * (o.speed ?? 1);
    const ex = Math.cos(a) * o.rx * q.rad, ey = Math.sin(a) * o.ry * q.rad + q.dy * o.ry;
    let px = ex * ct - ey * st, py = ex * st + ey * ct;
    const out01 = lerp(o.from ?? 0, 1, E.outBack(clamp(born), 1.3));
    px *= out01; py *= out01;
    const depth = Math.sin(a); // + önde
    const sc = (0.72 + 0.5 * (depth * 0.5 + 0.5)) * q.sz * clamp(born * 3) * (o.scale ?? 1);
    out.push({ q, x: cx + px, y: cy + py, depth, sc, a, born });
  }
  return out;
}
function drawOrbitItems(ctx, list, t, layer, o = {}) {
  const coinR = o.coinR ?? 20;
  for (const it of list) {
    if (layer === 'back' && it.depth >= 0) continue;
    if (layer === 'front' && it.depth < 0) continue;
    const q = it.q, rr = coinR * it.sc;
    if (rr < 0.8) continue;
    // önden geçen sikke küreye yumuşak bir gölge düşürür (ayrı durduğu okunsun)
    if (layer === 'front' && o.shadowOn) {
      const dx = it.x - o.shadowOn[0], dy = it.y - o.shadowOn[1];
      if (dx * dx + dy * dy < o.shadowOn[2] * o.shadowOn[2]) { ctx.fillStyle = rgba('#8A4A10', 0.28); ctx.beginPath(); ctx.ellipse(it.x + rr * 0.35, it.y + rr * 0.55, rr * 1.05, rr * 0.8, 0, 0, TAU); ctx.fill(); }
    }
    ctx.save();
    if (o.alpha != null) ctx.globalAlpha = o.alpha;
    if (q.gem) gemShape(ctx, it.x, it.y, rr * 0.95, q.col, t * 0.8 + q.ph, q.seed);
    else {
      const sq = Math.cos(t * q.spin + q.ph);
      R.coin(ctx, it.x, it.y, rr, { squash: sq, seed: q.seed });
      // kenar parıltısı: sikke yüzü ışığa dönünce
      if (sq > 0.85 && it.depth > 0) R.sparkle(ctx, it.x - rr * 0.3, it.y - rr * 0.35, rr * 0.7, (sq - 0.85) / 0.15 * 0.9, '#FFFBEA');
    }
    if (layer === 'back') { ctx.fillStyle = rgba('#3B2F7A', 0.12); ctx.beginPath(); ctx.arc(it.x, it.y, rr, 0, TAU); ctx.fill(); }
    if (it.born < 1 && it.depth >= 0) R.sparkle(ctx, it.x + rr * 0.6, it.y - rr * 0.6, rr * 1.3 * Math.sin(Math.PI * it.born), 0.95, '#FFFBEA');
    ctx.restore();
  }
}
// yörünge izi: ince altın yay (arka yarı / ön yarı)
function orbitTrail(ctx, cx, cy, o, layer, a = 1) {
  if (a <= 0) return;
  const ct = Math.cos(o.tilt ?? 0), st = Math.sin(o.tilt ?? 0);
  ctx.save(); ctx.strokeStyle = rgba(GOLD_L, 0.35 * a); ctx.lineWidth = o.trailW ?? 3; ctx.setLineDash([22, 16]);
  ctx.lineDashOffset = -(o.t ?? 0) * 40;
  ctx.beginPath();
  const a0 = layer === 'back' ? Math.PI : 0, a1 = a0 + Math.PI;
  for (let k = 0; k <= 40; k++) {
    const aa = lerp(a0, a1, k / 40), ex = Math.cos(aa) * o.rx, ey = Math.sin(aa) * o.ry;
    const px = cx + ex * ct - ey * st, py = cy + ex * st + ey * ct;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke(); ctx.restore();
}

// =====================================================================
// Işık fidanı: grow 0..1 (boy), glow 0..1
// =====================================================================
const SAP = { stem: '#E6F29A', leaf: '#F2F4B4', leafD: '#C2D872', leafL: '#FFFFF2', bud: '#FFF6C8', vein: '#B8CC66' };
function sapling(ctx, x, y, s, grow, t, seed = 1, o = {}) {
  grow = clamp(grow); if (grow <= 0.01) return;
  const r = rng(seed);
  const glow = (o.glow ?? 1) * (0.85 + 0.15 * Math.sin(t * 3 + seed));
  const sway = Math.sin(t * 1.8 + seed) * 0.05 + (o.lean ?? 0);
  const hgt = s * grow;
  if (glow > 0) { P.glow(ctx, x, y - hgt * 0.55, s * 1.4, '#FFD86A', 0.55 * glow * grow); P.glow(ctx, x, y - hgt * 0.6, s * 0.6, '#FFFFFF', 0.45 * glow * grow); }
  const line = []; for (let k = 0; k <= 6; k++) { const u = k / 6; line.push([x + Math.sin(sway) * hgt * u * u + Math.sin(u * 3 + seed) * s * 0.03, y - hgt * u]); }
  P.curveStroke(ctx, line, (u) => s * 0.075 * (1 - u * 0.55), SAP.stem, seed, { bristles: 1 });
  const nl = o.leaves ?? 4;
  for (let i = 0; i < nl; i++) {
    const u = 0.38 + 0.55 * (i / Math.max(1, nl - 1));
    const k = Math.round(u * 6), p = line[Math.min(6, k)];
    const side = i % 2 === 0 ? -1 : 1;
    const lg = clamp((grow - u * 0.55) / 0.45);
    if (lg <= 0) continue;
    const ang = -Math.PI / 2 + side * (0.85 + r.range(-0.15, 0.15)) + sway;
    R.leaf(ctx, p[0], p[1], s * 0.42 * lg * (1 - u * 0.3), ang, seed * 7 + i, { base: SAP.leaf, dark: SAP.leafD, light: SAP.leafL, vein: SAP.vein, rim: false });
  }
  // tepe tomurcuğu
  const tip = line[6];
  P.glow(ctx, tip[0], tip[1], s * 0.28 * grow, '#FFFFFF', 0.7 * glow);
  ctx.fillStyle = rgba(SAP.bud, 0.95); ctx.beginPath(); ctx.arc(tip[0], tip[1], s * 0.06 * grow, 0, TAU); ctx.fill();
}

// =====================================================================
// Yürüyüş (scenes/_s02_walk.js'ten uyarlanmış kopya)
// =====================================================================
const LT = M.L.thigh, LS = M.L.shin, LL = LT + LS;
const FL = M.L.foot, FH = 0.042;
const SHOE_UNIT = P.smoothPts([[-0.28, -0.25], [0.15, -0.55], [0.55, -0.42], [0.92, -0.12], [1.0, 0.25], [0.6, 0.42], [0.0, 0.45], [-0.32, 0.38], [-0.38, 0.0]], true, 5);
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
const TOE_PIV = bestPivot(deg(4), deg(34));
function dropAt(fa) { let m = -Infinity; for (const [a, b] of SHOE_UNIT) { const y = footOff(a, b, fa)[1]; if (y > m) m = y; } return m; }
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
// spec: { D, legs:[{loc,fpA,fpB}x2], age, armAmp, armU, lean, over, legOpts, ext, hipDrop }
function evalWalker(spec) {
  const age = spec.age ?? 0;
  const lo = Object.assign({}, spec.legOpts || {});
  const tg = spec.legs.map((L) => legTarget(L.loc, L.fpA, L.fpB, lo));
  const ext = spec.ext ?? lerp(0.988, 0.962, age);
  const cap = FLAT_DROP + LL * ext;
  const feas = tg.map((g) => {
    const dx = g.ankle[0] - spec.D;
    const L = LL * (g.stance ? 0.997 : 0.985);
    return -g.ankle[1] + Math.sqrt(Math.max(1e-6, L * L - dx * dx));
  });
  let H = smin(feas[0], feas[1], 0.006);
  H = smin(H, cap, 0.008) - (spec.hipDrop ?? 0);
  const hip = [0, -H];
  const legs = tg.map((g) => {
    const ik = legIK(hip, [g.ankle[0] - spec.D, g.ankle[1]]);
    return { th: ik.th, kn: ik.kn, ft: g.fa - ik.sa, ankle: g.ankle, fa: g.fa, stance: g.stance };
  });
  const armAmp = spec.armAmp ?? deg(20) * (1 - 0.6 * age);
  const au = spec.armU ?? spec.legs[0].loc;
  const sw = Math.cos(TAU * (au - 0.04));
  const aN = -armAmp * sw, aF = armAmp * sw;
  const torso = deg(4) + age * deg(15) + (spec.lean ?? 0);
  const p = M.pose({
    px: 0, py: H - 0.5,
    thighN: legs[0].th, kneeN: legs[0].kn, footN: legs[0].ft,
    thighF: legs[1].th, kneeF: legs[1].kn, footF: legs[1].ft,
    armN: aN + deg(1), armF: aF + deg(1),
    elbowN: deg(12 + 12 * age) + Math.max(0, aN) * 0.8, elbowF: deg(12 + 12 * age) + Math.max(0, aF) * 0.8,
    torso, spine: age, neck: deg(4) + age * deg(10), head: -age * deg(9),
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
// İki kemikli kol IK (dirsek aşağıda/geride). Sh omuz, T bilek (yerel, h=1)
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
// pozun kolunu bileği yerel hedefe (h=1, köke göre) götürecek biçimde ayarla
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

// Parça parça çizerken (o.parts) atlanan astar kenarı
function manRim(ctx, p, o) {
  const h = o.h, cap = M.capsule, s = M.skeleton(p, h);
  const sil = [cap(s.legF.hip, s.legF.knee, 0.085 * h, 0.06 * h), cap(s.legF.knee, s.legF.ankle, 0.06 * h, 0.045 * h),
    cap(s.legN.hip, s.legN.knee, 0.085 * h, 0.06 * h), cap(s.legN.knee, s.legN.ankle, 0.06 * h, 0.045 * h), cap(s.hip, s.sh, 0.12 * h, 0.13 * h),
    cap(s.armN.shoulder, s.armN.elbow, 0.062 * h, 0.05 * h), cap(s.armN.elbow, s.armN.wrist, 0.05 * h, 0.042 * h)];
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.dir ?? 1, 1);
  ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = Math.max(1.4, h * 0.0052); ctx.lineJoin = 'round';
  ctx.setLineDash([h * 0.04, h * 0.15, h * 0.02, h * 0.2, h * 0.06, h * 0.12]);
  ctx.translate(h * 0.003, h * 0.002);
  for (const q of sil) ctx.stroke(P.pathOf(q));
  ctx.restore();
}

// Yerden yükselen sıcak ışık parçacıkları (sürekli ikincil hareket)
function motes(ctx, box, n, t, seed, o = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r.range(box.x0, box.x1), sp = r.range(0.04, 0.1) * (o.speed ?? 1), ph = r.range(0, 1), sz = r.range(2, 5.5) * (o.scale ?? 1);
    const k = (t * sp + ph) % 1;
    const y = lerp(box.y1, box.y0, k), x = x0 + Math.sin(t * r.range(0.4, 0.9) + i) * 18;
    const a = Math.sin(k * Math.PI) * (o.alpha ?? 0.8);
    ctx.fillStyle = rgba(r.chance(0.5) ? '#FFE9A8' : '#FFF8E0', a);
    ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
  }
}

// =====================================================================
// Yakın plan için avuç: yandan, avuç yukarı, parmaklar öne-yukarı kıvrık (kase gibi) + başparmak.
// wrist: bilek (dünya), ang: elin yönü (0 = ileri/sağa), L: el boyu (px). o: { far, la, thumb, dir }
// Gölge tarafı serin mor, ışık tarafı sıcak; turuncu astar kenarı + alt kenarda koyu serin çizgi (arka plandan ayrılsın).
const CUP = P.smoothPts([[0.0, -0.17], [0.22, -0.13], [0.45, -0.09], [0.64, -0.12], [0.77, -0.24], [0.85, -0.4], [0.93, -0.47], [1.0, -0.42],
  [1.05, -0.24], [1.04, -0.02], [0.95, 0.17], [0.74, 0.29], [0.46, 0.33], [0.2, 0.29], [0.0, 0.2]], true, 6);
function cupXform(wrist, ang, L, dir = 1) { const c = Math.cos(ang), s = Math.sin(ang); return ([u, v]) => [wrist[0] + dir * (c * u * L - s * v * L), wrist[1] + s * u * L + c * v * L]; }
function cupPoint(wrist, ang, L, u, v, dir = 1) { return cupXform(wrist, ang, L, dir)([u, v]); }
function cuppedHand(ctx, wrist, ang, L, o = {}) {
  const X = cupXform(wrist, ang, L, o.dir ?? 1);
  const far = o.far ? (c) => mix(c, '#2A2350', 0.14) : (c) => c;
  const skin = far(shade(M.LOOK.skin, 0.03, 0.08)), dark = far(mix(M.LOOK.skinDark, '#3B2F7A', 0.2)), light = far(o.light || '#F9CFA2');
  const pts = CUP.map(X);
  // astar kenarı (sürekli, ince) + serin alt çizgi
  ctx.save(); ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = Math.max(2, L * 0.05); ctx.lineJoin = 'round'; ctx.stroke(P.pathOf(pts)); ctx.restore();
  M.partShade(ctx, pts, skin, dark, light, o.la ?? -1.6, 0.2);
  // kıvrık parmak kütlesi: içte gölge, parmak araları
  ctx.save(); ctx.clip(P.pathOf(pts));
  const inner = [[0.7, -0.1], [0.8, -0.22], [0.86, -0.36], [0.9, -0.3], [0.86, -0.1]].map(X);
  ctx.fillStyle = rgba(dark, 0.35); ctx.fill(P.pathOf(P.smoothPts(inner, true, 4)));
  ctx.strokeStyle = rgba(far('#8A4A50'), 0.7); ctx.lineWidth = Math.max(1, L * 0.022); ctx.lineCap = 'round';
  for (const [a0, a1] of [[[1.0, 0.04], [1.02, -0.22]], [[0.92, 0.14], [0.96, -0.12]], [[0.82, 0.22], [0.88, -0.02]]]) { const A = X(a0), B = X(a1); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.quadraticCurveTo(lerp(A[0], B[0], 0.5) + (B[1] - A[1]) * 0.15, lerp(A[1], B[1], 0.5), B[0], B[1]); ctx.stroke(); }
  // sırt (alt kenar) serin koyu şerit
  ctx.strokeStyle = rgba('#5A3A62', 0.45); ctx.lineWidth = Math.max(1.5, L * 0.04);
  const back = [[0.05, 0.22], [0.3, 0.31], [0.6, 0.31], [0.86, 0.22], [1.02, 0.04]].map(X);
  ctx.beginPath(); back.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
  ctx.restore();
  // başparmak: avuç üstünde, öne doğru (yakın elde görünür)
  if (o.thumb !== false) {
    const th = P.ribbonPts([[0.14, -0.12], [0.3, -0.2], [0.46, -0.26], [0.58, -0.3]].map(X), (u) => L * (0.17 - 0.07 * u));
    ctx.save(); ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = Math.max(1.5, L * 0.035); ctx.stroke(P.pathOf(th)); ctx.restore();
    M.partShade(ctx, th, far(shade(M.LOOK.skin, 0.03)), dark, light, o.la ?? -1.6, 0.4);
    const nail = X([0.56, -0.3]); ctx.fillStyle = rgba(far('#F6D0B8'), 0.8); ctx.beginPath(); ctx.ellipse(nail[0], nail[1], L * 0.045, L * 0.03, ang, 0, TAU); ctx.fill();
  }
}

module.exports = {
  cuppedHand, cupPoint, R0, GOLD, GOLD_D, GOLD_L, CREAM, HOT, orbBody, orbRays, drawOrb, spark,
  makeOrbit, orbitItems, drawOrbitItems, orbitTrail, gemShape, sapling, SAP,
  FLAT_DROP, legTarget, legIK, evalWalker, steadyLegs, armIK, reach, sm, smin, ST, manRim, motes,
};
