// s21–s23 yürüyüş ve kol IK yardımcıları: scenes/_s02_walk.js'ten (s02 yazarı) birebir kopya — o dosya
// değişirse sahnelerim bozulmasın diye kendi kopyam. Ayak izi tabanlı, ayak kaymayan yürüyüş + iki kemikli kol IK.
// Yürüyüş yardımcıları (s02, s03, s04).
// Motordaki M.walk fazı ileri sardığında diz geri giden bacakta bükülüyor, salınımdaki topuk yere sürtüyor;
// kökü ona göre ilerletince ayak kayıyor. Bu yüzden burada AYAK İZİ TABANLI bir yürüyüş var:
//   - her basma evresinde ayak yere sabitlenir (ayak izi), salınımda bir sonraki ize yay çizerek gider;
//   - topuk vuruşunda topuk, itişte burun etrafında döner (yere tam basar, kaymaz);
//   - kalça yüksekliği bacakların erişebileceği en yüksek değerden (yumuşak min) seçilir; bacak açıları IK ile bulunur;
//   - sonuç bir M.pose nesnesidir; çizim her zaman M.drawMan ile (varsayılan görünüm) yapılır.
// Birimler: h=1 (boy oranı). Dünya: x sağa, y aşağı, zemin y=0.
'use strict';
const M = require('../engine/man');
const P = require('../engine/paint');
const C = require('../engine/core');
const { clamp, lerp, deg, TAU } = C;

const LT = M.L.thigh, LS = M.L.shin, LL = LT + LS;
const FL = M.L.foot, FH = 0.042;
const SHOE_CTRL = [[-0.28, -0.25], [0.15, -0.55], [0.55, -0.42], [0.92, -0.12], [1.0, 0.25], [0.6, 0.42], [0.0, 0.45], [-0.32, 0.38], [-0.38, 0.0]];
const SHOE_UNIT = P.smoothPts(SHOE_CTRL, true, 5);
// ayak çerçevesindeki (a,b) noktasının bilekten uzaklığı (man.js shoePts ile aynı dönüşüm), fa = mutlak ayak açısı
function footOff(a, b, fa) { const c = Math.cos(fa), s = Math.sin(fa); return [c * a * FL - s * b * FH, s * a * FL + c * b * FH + 0.35 * FH]; }
function shoePts(ankle, fa, h = 1) { return SHOE_UNIT.map(([a, b]) => { const o = footOff(a, b, fa); return [ankle[0] + o[0] * h, ankle[1] + o[1] * h]; }); }
const FLAT_DROP = Math.max(...SHOE_UNIT.map(([a, b]) => footOff(a, b, 0)[1])); // düz ayakta bileğin zeminden yüksekliği

// Topuk/burun dönme noktaları: o açı aralığında diğer noktaların zemine en az gömüldüğü köşe
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
// ayak açısı fa iken en alçak noktanın bilekten düşüşü (yere tam oturtmak için)
function dropAt(fa) { let m = -Infinity; for (const [a, b] of SHOE_UNIT) { const y = footOff(a, b, fa)[1]; if (y > m) m = y; } return m; }
const TOE_PIV = bestPivot(deg(4), deg(34));

const sm = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
function smin(a, b, k) { const m = Math.min(a, b); return m - k * Math.log(Math.exp(-(a - m) / k) + Math.exp(-(b - m) / k)); }

// Tek bacak: yerel faz loc (0..1; 0 topuk vuruşu, 0..ST basma, ST..1 salınım), ayak izleri fpA (bu basma), fpB (sonraki)
// Dönen: { ankle:[x,y] (h=1, dünya; y zemine göre), fa (mutlak ayak açısı), stance (0..1 ağırlık) }
const ST = 0.6;
function legTarget(loc, fpA, fpB, o) {
  const hs = o.heelStrike ?? deg(11), to = o.toeOff ?? deg(30), lift = o.lift ?? 0.055;
  const flatY = -FLAT_DROP;
  if (loc < ST) {
    const k = loc / ST;
    if (k < 0.13) { // topuk vuruşu: burun yukarıdan iner
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
  // salınım: itiş bitimindeki bilekten bir sonraki topuk vuruşu bileğine
  const k = (loc - ST) / (1 - ST);
  const a0 = legTarget(ST - 1e-6, fpA, fpB, o), a1 = legTarget(0, fpB, fpB, o);
  const ex = k * k * (3 - 2 * k) * 0.88 + k * 0.12;
  const x = lerp(a0.ankle[0], a1.ankle[0], ex);
  const y = lerp(a0.ankle[1], a1.ankle[1], sm(k)) - lift * Math.pow(Math.sin(Math.PI * Math.pow(k, 0.8)), 0.85);
  const fa = lerp(a0.fa, a1.fa, sm(k * 1.15));
  return { ankle: [x, y], fa, stance: 0 };
}

// İki kemikli bacak IK (diz önde). hip, ankle: yerel (y aşağı). Dönen th, kn, sa
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

// Yürüyen adamı değerlendir. spec:
//   D: kalça x (h=1 birim, dünya), legs: [near, far] her biri { loc, fpA, fpB }
//   age, ext (orta basmada bacak uzanımı), armAmp, armU (kol fazı), lean, over (poz üstüne yaz), legOpts
// Dönen: { pose, hipH } — kök (ayak tabanı) dünya konumu x=D, y=0 (zemin) ile çizilir.
function evalWalker(spec) {
  const age = spec.age ?? 0;
  const lo = Object.assign({}, spec.legOpts || {});
  let tg = spec.legs.map((L) => legTarget(L.loc, L.fpA, L.fpB, L.opts ? Object.assign({}, lo, L.opts) : lo)); // (s21: bacak başına seçenek)
  // eğri zemin vb. için hedef bükme (kalçanın teğet çerçevesinde)
  if (spec.warp) tg = tg.map((g) => { const w = spec.warp(g.ankle[0] - spec.D, g.ankle[1], g.fa); return { ankle: [spec.D + w[0], w[1]], fa: w[2], stance: g.stance }; });
  const ext = spec.ext ?? lerp(0.988, 0.962, age);
  const cap = (spec.cap ?? FLAT_DROP + LL * ext);
  // her bacak için erişilebilir en yüksek kalça
  const feas = tg.map((g, i) => {
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

// Sabit adımlı düz yürüyüş: u = faz (sınırsız), S = adım (h=1), D0 = u=0'daki kalça konumu
function steadyLegs(u, S, D0) {
  const kN = Math.floor(u), lN = u - kN;
  const uF = u + 0.5, kF = Math.floor(uF), lF = uF - kF;
  const fpN = D0 + 2 * S * (kN + 0.3), fpF = D0 + 2 * S * (kF - 0.2);
  return [{ loc: lN, fpA: fpN, fpB: fpN + 2 * S }, { loc: lF, fpA: fpF, fpB: fpF + 2 * S }];
}

// İki kemikli kol IK (dirsek geride). S omuz, T bilek (yerel). Dönen { ua, fa }
function armIK(Sh, T, flip = false) { // (s21: flip → dirsek önde)
  const a = M.L.upper, b = M.L.fore;
  let dx = T[0] - Sh[0], dy = T[1] - Sh[1];
  let d = Math.hypot(dx, dy);
  const dmax = (a + b) * 0.998, dmin = Math.abs(a - b) + 0.01;
  if (d > dmax) { dx *= dmax / d; dy *= dmax / d; d = dmax; }
  if (d < dmin) { dx *= dmin / d; dy *= dmin / d; d = dmin; }
  const q = Math.atan2(dx, dy);
  const A = Math.acos(clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1));
  const ua = flip ? q + A : q - A;
  const ex = Sh[0] + Math.sin(ua) * a, ey = Sh[1] + Math.cos(ua) * a;
  const fa = Math.atan2(Sh[0] + dx - ex, Sh[1] + dy - ey);
  return { ua, fa };
}
// pozun kolunu (which: 'N'|'F') bileği yerel hedefe götürecek biçimde ayarla; k: karışım
function reach(p, target, which = "N", k = 1, handA = null, flip = false) {
  const s = M.skeleton(p, 1);
  const ik = armIK(s['arm' + which].shoulder, target, flip);
  const follow = p.armFollow ?? 0.3;
  const o = Object.assign({}, p);
  o['arm' + which] = lerp(p['arm' + which], ik.ua - p.torso * follow, k);
  o['elbow' + which] = lerp(p['elbow' + which], ik.fa - ik.ua, k);
  if (handA != null) o['hand' + which] = lerp(p['hand' + which], handA - ik.fa, k);
  return o;
}

module.exports = { SHOE_UNIT, FLAT_DROP, footOff, shoePts, legTarget, legIK, evalWalker, steadyLegs, armIK, reach, sm, smin, ST };
