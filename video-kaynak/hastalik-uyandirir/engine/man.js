// İnsan figürü: sade, ayrıntısız ama normal oranlı bir erkek. Yandan görünüş, iskelet (ileri kinematik) ile pozlanır.
// Varsayılan yön sağa bakar; dir:-1 sola çevirir. Boy (h) piksel cinsindendir, kök nokta ayakların bastığı yerdir.
'use strict';
const { Path2D } = require('@napi-rs/canvas');
const C = require('./core');
const P = require('./paint');
const { lerp, clamp, mix, shade, rgba, deg, TAU } = C;

const LOOK = {
  skin: '#E0A27A', skinDark: '#B46B55', skinLight: '#F5C9A2',
  hair: '#2A1E1B', hairOld: '#DAD6CF',
  shirt: '#EEE6D6', shirtDark: '#A9A1C9', shirtLight: '#FFFBF1',
  pants: '#2E3767', pantsDark: '#1C2048', pantsLight: '#46559A',
  shoe: '#5A3423', shoeDark: '#3A2018',
  eye: '#1E1622',
};

// segment boyları (boyun oranı)
const L = { thigh: 0.245, shin: 0.235, foot: 0.13, torso: 0.3, neck: 0.04, head: 0.13, upper: 0.165, fore: 0.15, hand: 0.072 };

const STAND = {
  px: 0, py: 0, rot: 0,            // kök kayması (h oranı) ve tüm gövde dönüşü (radyan, leğen çevresinde)
  torso: deg(2), spine: 0,          // gövde eğimi (ileri +), kambur (yaşlılık)
  neck: deg(4), head: deg(0),       // baş eğimi (aşağı +)
  // kollar: üst kol açısı (dikeyden ileri +), dirsek bükümü (+ önkolu öne/yukarı kaldırır), el açısı
  armN: deg(4), elbowN: deg(10), handN: deg(5),
  armF: deg(-4), elbowF: deg(8), handF: deg(5),
  // bacaklar: uyluk (dikeyden ileri +), diz bükümü (+ baldır geriye), ayak bileği
  thighN: deg(2), kneeN: deg(2), footN: 0,
  thighF: deg(-3), kneeF: deg(3), footF: 0,
  eye: 1, brow: 0, mouth: 0,        // göz açıklığı 0..1, kaş eğimi (+ endişe), ağız (+ gülümseme, - üzgün)
  grip: 0,                          // el kapanması 0..1
  armFollow: 0.3,                   // kolların gövde eğimini izleme oranı
};
function pose(over = {}) { return Object.assign({}, STAND, over); }
function lerpPose(a, b, t) {
  const o = {};
  for (const k in STAND) o[k] = lerp(a[k] ?? STAND[k], b[k] ?? STAND[k], t);
  return o;
}
// yürüyüş döngüsü (faz 0..1)
function walk(phase, o = {}) {
  const s = o.stride ?? 1, age = o.age ?? 0;
  const a = phase * TAU;
  const sw = deg(24) * s * (1 - age * 0.35);
  const p = pose({
    thighN: Math.sin(a) * sw, thighF: Math.sin(a + Math.PI) * sw,
    kneeN: deg(4) + Math.max(0, Math.sin(a - 1.3)) * deg(48) * s, kneeF: deg(4) + Math.max(0, Math.sin(a + Math.PI - 1.3)) * deg(48) * s,
    footN: Math.max(0, Math.sin(a - 0.6)) * deg(-14), footF: Math.max(0, Math.sin(a + Math.PI - 0.6)) * deg(-14),
    armN: Math.sin(a + Math.PI) * deg(20) * s * (1 - age * 0.5), armF: Math.sin(a) * deg(20) * s * (1 - age * 0.5),
    elbowN: deg(14) + Math.max(0, Math.sin(a + Math.PI)) * deg(16), elbowF: deg(14) + Math.max(0, Math.sin(a)) * deg(16),
    torso: deg(5) + age * deg(16), spine: age, neck: deg(4) + age * deg(10), head: -age * deg(8),
    py: -Math.abs(Math.cos(a)) * 0.012 * s + 0.006 * s,
  });
  return Object.assign(p, o.over || {});
}

// ---------- geometri ----------
function dirDown(a) { return [Math.sin(a), Math.cos(a)]; } // dikey aşağıdan a kadar ileri dönmüş birim vektör (sağa bakan)
function capsule(a, b, wa, wb, n = 8) {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const out = [];
  for (let i = 0; i <= n; i++) { const t = ang - Math.PI / 2 + (i / n) * Math.PI; out.push([b[0] + Math.cos(t) * wb / 2, b[1] + Math.sin(t) * wb / 2]); }
  for (let i = 0; i <= n; i++) { const t = ang + Math.PI / 2 + (i / n) * Math.PI; out.push([a[0] + Math.cos(t) * wa / 2, a[1] + Math.sin(t) * wa / 2]); }
  return out;
}
function add(p, v, k = 1) { return [p[0] + v[0] * k, p[1] + v[1] * k]; }
function rotAround(pt, c, a) { const s = Math.sin(a), co = Math.cos(a); const x = pt[0] - c[0], y = pt[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; }

// Pozdan eklem konumlarını hesapla (yerel: kök=0,0; y aşağı +; sağa bakan)
function skeleton(p, h) {
  const hip = [p.px * h, -(0.5 + p.py) * h];
  const td = [Math.sin(p.torso), -Math.cos(p.torso)]; // yukarı doğru gövde yönü
  const sh = add(hip, td, L.torso * h * (1 - p.spine * 0.06));
  const na = p.torso + p.neck;
  const nd = [Math.sin(na), -Math.cos(na)];
  const neckTop = add(sh, nd, L.neck * h);
  const ha = na + p.head;
  const headC = add(neckTop, [Math.sin(ha), -Math.cos(ha)], L.head * h * 0.42);
  const shoulder = add(add(sh, td, -0.025 * h), [Math.cos(p.torso), Math.sin(p.torso)], -0.006 * h);
  const arm = (a, e, hd) => {
    const ua = p.torso * (p.armFollow ?? 0.3) + a; // kollar çoğunlukla yerçekimiyle sarkar
    const elbow = add(shoulder, dirDown(ua), L.upper * h);
    const fa = ua + e;
    const wrist = add(elbow, dirDown(fa), L.fore * h);
    const handA = fa + hd;
    const tip = add(wrist, dirDown(handA), L.hand * h);
    return { shoulder, elbow, wrist, tip, ua, fa, handA };
  };
  const leg = (th, kn, ft) => {
    const knee = add(hip, dirDown(th), L.thigh * h);
    const sa = th - kn;
    const ankle = add(knee, dirDown(sa), L.shin * h);
    const fa = sa + ft;
    return { hip, knee, ankle, ta: th, sa, fa };
  };
  return {
    hip, sh, neckTop, headC, ha, td,
    armN: arm(p.armN, p.elbowN, p.handN), armF: arm(p.armF, p.elbowF, p.handF),
    legN: leg(p.thighN, p.kneeN, p.footN), legF: leg(p.thighF, p.kneeF, p.footF),
  };
}

// ---------- parça boyama ----------
function partShade(ctx, pts, base, dark, light, la, k = 0.22, rimJobs = null) {
  const path = P.pathOf(pts);
  ctx.fillStyle = base; ctx.fill(path);
  const b = P.bbox(pts), size = Math.min(b.w, b.h);
  const lx = Math.cos(la), ly = Math.sin(la);
  ctx.save(); ctx.clip(path);
  // gölge hilali
  const sh = P.multiPath([pts, P.translatePts(pts, lx * size * k, ly * size * k)]);
  ctx.fillStyle = dark; ctx.fill(sh, 'evenodd');
  // ışık şeridi
  const li = P.multiPath([pts, P.translatePts(pts, -lx * size * k * 0.45, -ly * size * k * 0.45)]);
  ctx.fillStyle = light; ctx.fill(li, 'evenodd');
  ctx.restore();
  return path;
}

// Birden çok çokgenin birleşimini tek parça gibi gölgele (eklem yerlerinde iz kalmaz).
// size: gölge/ışık kaydırmasının ölçüsü (genelde uzuv kalınlığı)
function shadeUnion(ctx, list, base, dark, light, la, size, ks = 0.3, kl = 0.14) {
  const path = P.unionPath(list);
  const lx = Math.cos(la), ly = Math.sin(la);
  const b = size * ks, a = size * kl;
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = dark; ctx.fill(path);
  ctx.translate(lx * b, ly * b); ctx.clip(path); ctx.translate(-lx * b, -ly * b);
  ctx.fillStyle = light; ctx.fill(path);
  ctx.translate(-lx * a, -ly * a); ctx.fillStyle = base; ctx.fill(path);
  ctx.restore();
  return path;
}

// el (yandan, eldiven biçimi + başparmak)
function handPts(w, tip, h, grip, near) {
  const dx = tip[0] - w[0], dy = tip[1] - w[1], d = Math.hypot(dx, dy) || 1;
  const ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
  const len = d * (1 - grip * 0.35), wid = 0.034 * h;
  const pts = [];
  const ctrl = [
    [0, -wid * 0.42], [len * 0.45, -wid * 0.55], [len * 0.88, -wid * 0.42], [len * 1.0, -wid * 0.05],
    [len * 0.9, wid * 0.38], [len * 0.55, wid * (0.5 + grip * 0.25)], [len * 0.3, wid * 0.62], // başparmak tarafı
    [len * 0.12, wid * 0.86], [-len * 0.02, wid * 0.5],
  ];
  for (const [a, b] of P.smoothPts(ctrl, true, 5)) pts.push([w[0] + ux * a + nx * b, w[1] + uy * a + ny * b]);
  return pts;
}
// ayakkabı
function shoePts(ankle, fa, h) {
  const fwd = [Math.cos(fa), Math.sin(fa)]; // ayak yönü: bacak dikken sağa doğru
  const up = [Math.sin(fa), -Math.cos(fa)];
  const fl = L.foot * h, fh = 0.042 * h;
  const ctrl = [
    [-0.28, -0.25], [0.15, -0.55], [0.55, -0.42], [0.92, -0.12], [1.0, 0.25], [0.6, 0.42], [0.0, 0.45], [-0.32, 0.38], [-0.38, 0.0],
  ];
  return P.smoothPts(ctrl, true, 5).map(([a, b]) => [ankle[0] + fwd[0] * a * fl - up[0] * b * fh * 1.0, ankle[1] + fwd[1] * a * fl - up[1] * b * fh * 1.0 + fh * 0.35]);
}

// baş (yerel birim: baş yüksekliği; merkez 0,0; sağa bakan)
const HEAD = P.smoothPts([
  [-0.43, -0.04], [-0.36, -0.33], [-0.08, -0.5], [0.24, -0.43], [0.39, -0.22], [0.42, -0.06], [0.5, 0.07], [0.43, 0.12],
  [0.43, 0.22], [0.37, 0.37], [0.16, 0.47], [-0.1, 0.4], [-0.26, 0.25], [-0.37, 0.14],
], true, 6);
const HAIR = P.smoothPts([
  [0.31, -0.32], [0.2, -0.48], [-0.06, -0.55], [-0.34, -0.45], [-0.47, -0.2], [-0.46, 0.04], [-0.37, 0.17], [-0.25, 0.12],
  [-0.17, -0.03], [-0.03, -0.09], [0.05, 0.03], [0.11, 0.02], [0.12, -0.13], [0.24, -0.23],
], true, 6);
const BEARD = P.smoothPts([
  [0.05, 0.03], [0.11, 0.03], [0.2, 0.15], [0.33, 0.17], [0.43, 0.165], [0.44, 0.29], [0.375, 0.4], [0.16, 0.485], [-0.07, 0.41], [-0.03, 0.14],
], true, 6);

function drawHead(ctx, s, h, p, o, la) {
  const u = L.head * h;
  ctx.save();
  ctx.translate(s.headC[0], s.headC[1]);
  ctx.rotate(s.ha);
  ctx.scale(u, u);
  const hairC = mix(o.hair || LOOK.hair, LOOK.hairOld, clamp(o.age ?? 0));
  const L0 = la - s.ha;
  // baş
  partShade(ctx, HEAD, o.skin || LOOK.skin, o.skinDark || LOOK.skinDark, o.skinLight || LOOK.skinLight, L0, 0.18);
  // kulak
  const ear = P.ellipsePts(-0.06, 0.02, 0.065, 0.1, 20);
  partShade(ctx, ear, shade(o.skin || LOOK.skin, -0.04), o.skinDark || LOOK.skinDark, o.skinLight || LOOK.skinLight, L0, 0.35);
  ctx.strokeStyle = rgba(LOOK.skinDark, 0.8); ctx.lineWidth = 0.018; ctx.beginPath(); ctx.arc(-0.055, 0.02, 0.04, -1.2, 1.5); ctx.stroke();
  // saç ve sakal
  const hairShade = shade(hairC, -0.08), hairLight = shade(hairC, (o.age ?? 0) > 0.5 ? 0.06 : 0.12);
  partShade(ctx, HAIR, hairC, hairShade, hairLight, L0, 0.2);
  const beard = o.beard ?? 1;
  if (beard > 0) {
    ctx.save(); ctx.globalAlpha = clamp(beard);
    partShade(ctx, BEARD, hairC, hairShade, hairLight, L0, 0.2);
    ctx.restore();
  }
  // göz
  const ex = 0.27, ey = -0.04;
  const op = clamp(p.eye);
  ctx.fillStyle = LOOK.eye;
  if (op > 0.15) {
    ctx.beginPath(); ctx.ellipse(ex, ey, 0.036, 0.052 * op, 0, 0, TAU); ctx.fill();
    // ışık noktası
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(ex + 0.01, ey - 0.018 * op, 0.0105, 0, TAU); ctx.fill();
  } else {
    ctx.strokeStyle = LOOK.eye; ctx.lineWidth = 0.022; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(ex, ey - 0.012, 0.04, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
  }
  // kaş
  ctx.strokeStyle = shade(hairC, -0.05); ctx.lineWidth = 0.03; ctx.lineCap = 'round';
  const bt = p.brow;
  ctx.beginPath(); ctx.moveTo(ex - 0.075, ey - 0.11 + bt * 0.03); ctx.lineTo(ex + 0.06, ey - 0.125 - bt * 0.035); ctx.stroke();
  // ağız (yalnız ifade gerektiğinde)
  if (Math.abs(p.mouth) > 0.05) {
    // sakalın üstünde de okunsun: açık dudak rengi bir yay, altında ince koyu çizgi
    const m = clamp(p.mouth, -1, 1), k = clamp(Math.abs(m) * 1.6);
    const lip = mix(o.skin || LOOK.skin, '#C46A6A', 0.35);
    ctx.lineCap = 'round';
    ctx.strokeStyle = rgba(lip, 0.95 * k); ctx.lineWidth = 0.034;
    ctx.beginPath(); ctx.moveTo(0.29, 0.25 - m * 0.012); ctx.quadraticCurveTo(0.355, 0.262 + m * 0.03, 0.425, 0.238 - m * 0.022); ctx.stroke();
    ctx.strokeStyle = rgba('#4A2420', 0.8 * k); ctx.lineWidth = 0.012;
    ctx.beginPath(); ctx.moveTo(0.3, 0.256 - m * 0.012); ctx.quadraticCurveTo(0.355, 0.266 + m * 0.03, 0.42, 0.244 - m * 0.022); ctx.stroke();
  }
  ctx.restore();
}

// gövde (gömlek) biçimi
function torsoPts(s, h, p) {
  const t = p.torso, up = s.td, fw = [Math.cos(t), Math.sin(t)];
  const at = (k, f) => add(add(s.hip, up, k * L.torso * h), fw, f * h);
  const hunch = p.spine;
  const ctrl = [
    at(-0.2, -0.055), at(0.15, -0.062), at(0.55, -0.068 - hunch * 0.02), at(0.86, -0.06 - hunch * 0.035), at(1.02, -0.035 - hunch * 0.02),
    at(1.06, 0.0), at(1.0, 0.035), at(0.82, 0.066), at(0.6, 0.064), at(0.35, 0.056), at(0.05, 0.062), at(-0.2, 0.058),
  ];
  return P.smoothPts(ctrl, true, 6);
}

// Ana çizim. o: { x, y, h, dir, age, light (ışık açısı), shirt, pants, skin, hair, beard, alpha, hold(ctx,s,h) }
function drawMan(ctx, p, o = {}) {
  const h = o.h ?? 600;
  const la0 = o.light ?? -2.3;
  ctx.save();
  ctx.translate(o.x ?? 0, o.y ?? 0);
  const dir = o.dir ?? 1;
  ctx.scale(dir, 1);
  const la = dir > 0 ? la0 : Math.PI - la0; // aynalanınca ışık yönünü koru
  const s = skeleton(p, h);
  if (p.rot) { ctx.translate(s.hip[0], s.hip[1]); ctx.rotate(p.rot); ctx.translate(-s.hip[0], -s.hip[1]); }
  if (o.alpha != null) ctx.globalAlpha = o.alpha;
  const shirt = o.shirt || LOOK.shirt, shirtD = o.shirtDark || mix(shirt, '#5B4F9E', 0.38), shirtL = o.shirtLight || shade(shirt, 0.05);
  const pants = o.pants || LOOK.pants, pantsD = shade(pants, -0.1), pantsL = shade(pants, 0.09);
  const skin = o.skin || LOOK.skin, skinD = o.skinDark || LOOK.skinDark, skinL = o.skinLight || LOOK.skinLight;
  const far = (c) => mix(c, '#2A2350', 0.22);
  const parts = [];
  const limb = (seg) => seg;

  // --- uzak kol ---
  const arm = (A, isFar) => {
    const k = isFar ? far : (c) => c;
    const up = capsule(A.shoulder, A.elbow, 0.062 * h, 0.05 * h);
    const fo = capsule(A.elbow, A.wrist, 0.05 * h, 0.042 * h);
    const hp = handPts(A.wrist, A.tip, h, p.grip, !isFar);
    partShade(ctx, hp, k(skin), k(skinD), k(skinL), la, 0.25);
    shadeUnion(ctx, [up, fo], k(shirt), k(shirtD), k(shirtL), la, 0.055 * h, 0.32, 0.14);
    parts.push(up, fo, hp);
  };
  const leg = (G, isFar) => {
    const k = isFar ? far : (c) => c;
    const th = capsule(G.hip, G.knee, 0.085 * h, 0.06 * h);
    const sn = capsule(G.knee, G.ankle, 0.06 * h, 0.045 * h);
    const sh = shoePts(G.ankle, G.fa, h);
    shadeUnion(ctx, [th, sn], k(pants), k(pantsD), k(pantsL), la, 0.07 * h, 0.3, 0.12);
    partShade(ctx, sh, k(LOOK.shoe), k(LOOK.shoeDark), k(shade(LOOK.shoe, 0.1)), la, 0.3);
    parts.push(th, sn, sh);
  };
  // astar kenarı: siluetin çevresinde yer yer turuncu-kırmızı
  if (o.rim !== false && !o.parts) {
    const sil = [capsule(s.armF.shoulder, s.armF.elbow, 0.062 * h, 0.05 * h), capsule(s.armF.elbow, s.armF.wrist, 0.05 * h, 0.042 * h),
      capsule(s.legF.hip, s.legF.knee, 0.085 * h, 0.06 * h), capsule(s.legF.knee, s.legF.ankle, 0.06 * h, 0.045 * h),
      capsule(s.legN.hip, s.legN.knee, 0.085 * h, 0.06 * h), capsule(s.legN.knee, s.legN.ankle, 0.06 * h, 0.045 * h), torsoPts(s, h, p),
      capsule(s.armN.shoulder, s.armN.elbow, 0.062 * h, 0.05 * h), capsule(s.armN.elbow, s.armN.wrist, 0.05 * h, 0.042 * h)];
    ctx.save();
    ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = Math.max(1.4, h * 0.0052); ctx.lineJoin = 'round';
    ctx.setLineDash([h * 0.04, h * 0.15, h * 0.02, h * 0.2, h * 0.06, h * 0.12]);
    ctx.translate(h * 0.003, h * 0.002);
    for (const q of sil) ctx.stroke(P.pathOf(q));
    ctx.restore();
  }
  const want = (k) => !o.parts || o.parts.includes(k);
  if (o.behind) o.behind(ctx, s, h);
  if (want('armF')) arm(s.armF, true);
  if (want('legF')) leg(s.legF, true);
  if (want('legN')) leg(s.legN, false);
  // boyun
  const neck = capsule(s.sh, add(s.neckTop, [Math.sin(s.ha), -Math.cos(s.ha)], 0.02 * h), 0.05 * h, 0.046 * h);
  if (want('torso')) { partShade(ctx, neck, skin, skinD, skinL, la, 0.3); parts.push(neck); }
  // gövde
  const tp = torsoPts(s, h, p);
  if (want('torso')) { partShade(ctx, tp, shirt, shirtD, shirtL, la, 0.2); parts.push(tp); }
  // yaka ve kemer hattı (çok sade)
  if (want('torso')) { ctx.save(); ctx.clip(P.pathOf(tp));
  ctx.strokeStyle = rgba(shirtD, 0.75); ctx.lineWidth = h * 0.006; ctx.lineCap = 'round';
  const beltA = add(add(s.hip, s.td, -0.03 * h), [Math.cos(p.torso), Math.sin(p.torso)], -0.07 * h), beltB = add(add(s.hip, s.td, -0.03 * h), [Math.cos(p.torso), Math.sin(p.torso)], 0.07 * h);
  ctx.beginPath(); ctx.moveTo(beltA[0], beltA[1]); ctx.lineTo(beltB[0], beltB[1]); ctx.stroke();
  ctx.restore(); }
  if (want('head')) drawHead(ctx, s, h, p, o, la);
  if (o.mid) o.mid(ctx, s, h);
  if (want('armN')) arm(s.armN, false);
  // tek seferde kıl dokusu
  if (parts.length) { const all = P.unionPath(parts);
  const bb = P.bbox(parts.flat());
  ctx.save(); ctx.clip(all); P.texture(ctx, bb, deg(80), 0.42, clamp(h / 900, 0.35, 1.2)); ctx.restore(); }
  if (o.cane) {
    const hand = s.armN.wrist, tipX = hand[0] + 0.03 * h, base = [tipX + 0.02 * h, 0];
    const cane = capsule([hand[0] + 0.005 * h, hand[1] - 0.03 * h], base, 0.016 * h, 0.014 * h, 4);
    partShade(ctx, cane, '#7A4A2A', '#4E2C18', '#A8703F', la, 0.4);
    // tutan el yeniden üstte
    partShade(ctx, handPts(s.armN.wrist, s.armN.tip, h, 0.8, true), skin, skinD, skinL, la, 0.25);
  }
  if (o.front) o.front(ctx, s, h);
  ctx.restore();
  return s;
}

// İskelet noktasını dünya koordinatına çevir (nesne tutturmak için)
function toWorld(pt, o, s, p) {
  let q = pt;
  if (p && p.rot) q = rotAround(q, s.hip, p.rot);
  return [(o.x ?? 0) + q[0] * (o.dir ?? 1), (o.y ?? 0) + q[1]];
}

module.exports = { LOOK, L, STAND, pose, lerpPose, walk, skeleton, drawMan, toWorld, capsule, partShade, shadeUnion, handPts };
