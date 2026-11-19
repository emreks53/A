// S24 yardımcısı — küçük ahşap kayık (3B gövde eğrilerinden izdüşüm), kürekler ve kürek çeken adam.
// Gövde u (boy: -1 kıç, +1 baş) / v (kenar: 0 küpeşte, 1 omurga) parametreleriyle tanımlı; darbeler bu yüzey
// koordinatlarına bağlı olduğundan kayık dönerken/sallanırken doku kaynamaz, biçimle birlikte esner.
// Adam kıça bakar (gerçek kürek çekişi): kayık sağa giderken sola bakar. Kollar kürek kollarına IK ile bağlanır.
'use strict';
const { createCanvas, Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const M = require('../engine/man');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, deg } = C;

const BH = 300;                 // adamın boyu (px, ölçek 1'de)
const PPM = BH / 1.75;          // metre başına piksel
const BL = 2.5, HB = 0.6;       // gövde boyu, en büyük yarı-en (m)
const CE = Math.cos(deg(15)), SE = Math.sin(deg(15)); // kamera yükseklik açısı
const X_SEAT = 0.14, Z_SEAT = 0.17, Z_HIP = 0.25;
const X_OL = X_SEAT - 0.3;      // ıskarmozlar oturağın biraz kıç tarafında
const LIN = 0.56, LOUT = 1.5;   // kürek iç / dış boyu
const MAN_PY = -0.224;

// ---------- gövde geometrisi ----------
function hb(u) {
  if (u >= -0.12) { const k = clamp((u + 0.12) / 1.12); return HB * Math.pow(Math.max(0, 1 - Math.pow(k, 2.3)), 0.62); }
  const k = clamp((-0.12 - u) / 0.88); return HB * (1 - 0.36 * k * k);
}
function sheer(u) { return 0.4 + 0.2 * Math.pow(Math.max(0, u), 2.4) + 0.06 * Math.pow(Math.max(0, -u), 2); }
function keelZ(u) {
  if (u > 0.2) { const k = (u - 0.2) / 0.8; return lerp(-0.17, sheer(1) - 0.05, Math.pow(k, 2.6)); }
  if (u < -0.55) { const k = (-0.55 - u) / 0.45; return lerp(-0.17, -0.02, Math.pow(k, 1.5)); }
  return -0.17;
}
function hullPt(u, v, side) {
  const b = hb(u), zs = sheer(u), zk = keelZ(u), a = v * Math.PI / 2;
  return [u * BL / 2, side * b * Math.cos(a), zs + (zk - zs) * Math.sin(a)];
}
// izdüşüm (m → yerel px). psi: kayığın yönü (0: baş sağa; -90°: baş uzağa)
function projector(psi) {
  const c = Math.cos(psi), s = Math.sin(psi);
  return ([x, y, z]) => [(x * c - y * s) * PPM, (-z * CE + (x * s + y * c) * SE) * PPM];
}
function depthOf(psi, [x, y]) { return x * Math.sin(psi) + y * Math.cos(psi); }

// eğri boyunca örnekleme
const US = []; for (let i = 0; i <= 40; i++) US.push(-1 + 2 * i / 40);
function curve(pr, v, side, us = US) { return us.map((u) => pr(hullPt(u, v, side))); }

// gövde boyası (gece ışığında ahşap)
const WOOD = { out: ['#9A5A34', '#86492A', '#A9683A'], outD: '#5A3020', outL: '#C88A54', rail: '#5A3220', railL: '#8A5232', inn: '#B88250', innD: '#7A4E2E', floor: '#6A4028', stripe: '#2E8C8C', stripeL: '#5CB8AE' };

// ---------- kürek ----------
// side: +1 iskele (+y), -1 sancak. phi: süpürme (+ pala başa doğru), th: aşağı eğim. feather: pala yatıklığı 0..1
function oarGeom(side, phi, th) {
  const uo = (X_OL / (BL / 2));
  const O = [X_OL, side * (hb(uo) - 0.02), sheer(uo) + 0.05];
  const d = [Math.sin(phi) * Math.cos(th), side * Math.cos(phi) * Math.cos(th), -Math.sin(th)];
  const at = (s) => [O[0] + d[0] * s, O[1] + d[1] * s, O[2] + d[2] * s];
  return { O, d, at, handle: at(-LIN), tip: at(LOUT) };
}
// kürek parçası çiz (yerel px). part: 'in' | 'out'. lit: ışık karışımı
function drawOar(ctx, pr, g, part, feather, lit = 0, o = {}) {
  const wood = mix(mix('#C08A52', '#3A3460', 0.32), '#E8B070', lit), woodD = mix(mix('#8A5A32', '#2A2450', 0.32), '#B07840', lit);
  const tipC = mix(mix('#E8DCC4', '#3A3460', 0.3), '#FFF0D0', lit);
  const W = 0.045 * PPM;
  if (part === 'in') {
    const a = pr(g.handle), b = pr(g.O);
    P.stroke(ctx, a[0], a[1], b[0], b[1], W, wood, 2601, { detail: 0.4, taper0: 1.15, ridge: false });
    // tutamak
    const h2 = pr(g.at(-LIN + 0.14));
    P.stroke(ctx, a[0], a[1], h2[0], h2[1], W * 1.25, woodD, 2602, { detail: 0, ridge: false });
    return;
  }
  // dış kısım: suya girdiği yerden sonrası soluk
  const zO = g.O[2], dz = -g.d[2];
  const sWater = dz > 0.01 ? zO / dz : 1e9;
  const sBlade0 = LOUT - 0.48;
  const P0 = pr(g.O);
  const drawShaft = (s0, s1, alpha) => {
    if (s1 <= s0) return;
    const a = pr(g.at(s0)), b = pr(g.at(s1));
    ctx.save(); ctx.globalAlpha *= alpha; P.stroke(ctx, a[0], a[1], b[0], b[1], W, wood, 2603, { detail: 0.4, ridge: false }); ctx.restore();
  };
  const sw = Math.min(LOUT, sWater);
  drawShaft(0, Math.min(sw, sBlade0 + 0.02), 1);
  if (sw < sBlade0) drawShaft(sw, sBlade0 + 0.02, 0.22);
  // pala: düz (kare) ya da yatık; uç kısmı krem boyalı
  const up = [0, 0, 1];
  const dd = g.d;
  // pala genişlik yönü: kare → dikey düzlemde, yatık → yatay düzlemde
  const vq = [up[0] - dd[0] * dd[2], up[1] - dd[1] * dd[2], up[2] - dd[2] * dd[2]];
  const nq = Math.hypot(...vq) || 1;
  const hq = [-dd[1], dd[0], 0]; const nh = Math.hypot(...hq) || 1;
  const wv = vq.map((c) => c / nq), wh = hq.map((c) => c / nh);
  const wdir = wv.map((c, i) => lerp(c, wh[i], feather));
  const blade = (s0, s1, w0, w1) => {
    const A = g.at(s0), B = g.at(s1);
    const pts = [
      [A[0] + wdir[0] * w0, A[1] + wdir[1] * w0, A[2] + wdir[2] * w0], [B[0] + wdir[0] * w1, B[1] + wdir[1] * w1, B[2] + wdir[2] * w1],
      [B[0] - wdir[0] * w1, B[1] - wdir[1] * w1, B[2] - wdir[2] * w1], [A[0] - wdir[0] * w0, A[1] - wdir[1] * w0, A[2] - wdir[2] * w0],
    ].map(pr);
    return pts;
  };
  const full = blade(sBlade0, LOUT, 0.035, 0.085), tipPart = blade(LOUT - 0.12, LOUT, 0.082, 0.085);
  const under = sWater < LOUT; // palanın bir kısmı suda
  ctx.save();
  if (under) ctx.globalAlpha *= sWater < sBlade0 ? 0.25 : 0.55;
  ctx.fillStyle = wood; ctx.fill(P.pathOf(full));
  ctx.fillStyle = tipC; ctx.fill(P.pathOf(tipPart));
  ctx.strokeStyle = rgba(woodD, 0.7); ctx.lineWidth = 1.2; ctx.stroke(P.pathOf(full));
  ctx.restore();
  return { entry: sWater < LOUT ? pr(g.at(sWater)) : null, sWater };
}

// ---------- gövde çizimi (yerel px, merkez su hattında) ----------
function strakePoly(pr, v0, v1, side, us = US) { return curve(pr, v0, side, us).concat(curve(pr, v1, side, us).reverse()); }
function drawInterior(ctx, pr, psi, near, lit) {
  const far = -near;
  const open = curve(pr, 0, 1).concat(curve(pr, 0, -1).reverse());
  const openPath = P.pathOf(open);
  ctx.fillStyle = WOOD.inn; ctx.fill(openPath);
  ctx.save(); ctx.clip(openPath);
  // uzak iç duvar (aydınlık), alt kısım (taban) koyu
  ctx.fillStyle = WOOD.innD; ctx.fill(P.pathOf(strakePoly(pr, 0.55, 1, far).concat([])));
  ctx.fillStyle = WOOD.floor; ctx.fill(P.pathOf(curve(pr, 0.82, far).concat(curve(pr, 0.82, near).reverse())));
  // iç duvarda tahta derzleri
  ctx.strokeStyle = rgba('#5A3420', 0.55); ctx.lineWidth = 1.4;
  for (const v of [0.22, 0.45]) { const c = curve(pr, v, far); ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (const q of c) ctx.lineTo(q[0], q[1]); ctx.stroke(); }
  // postalar (kaburgalar)
  ctx.strokeStyle = rgba('#6A4028', 0.8); ctx.lineWidth = 0.035 * PPM;
  for (let u = -0.75; u <= 0.76; u += 0.25) {
    ctx.beginPath(); for (let k = 0; k <= 6; k++) { const q = pr(hullPt(u, k / 6, far)); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke();
  }
  // tahta dokusu: boylamasına darbeler (yüzey koordinatına bağlı)
  const r = rng(2611);
  for (let i = 0; i < 14; i++) {
    const v = r.range(0.05, 0.75), u0 = r.range(-0.95, 0.4), u1 = u0 + r.range(0.25, 0.6);
    const us = []; for (let k = 0; k <= 6; k++) us.push(lerp(u0, Math.min(0.9, u1), k / 6));
    P.curveStroke(ctx, curve(pr, v, far, us), 3.2, rgba(r.chance(0.5) ? '#D09A64' : '#8A5A36', 0.55), r.int(1, 1e9), { bristles: 1, detail: 0.3 });
  }
  ctx.restore();
  // uzak küpeşte
  railStroke(ctx, pr, far);
}
function railStroke(ctx, pr, side) {
  const c = curve(pr, 0, side);
  P.curveStroke(ctx, c, 0.05 * PPM, WOOD.rail, 2620 + side, { bristles: 2, detail: 0.5 });
  const c2 = c.map(([a, b]) => [a, b - 0.012 * PPM]);
  P.curveStroke(ctx, c2.slice(4, 36), 0.016 * PPM, rgba(WOOD.railL, 0.8), 2622 + side, { bristles: 0, detail: 0 });
}
// oturak (thwart): u0..u1 aralığında, z yüksekliğinde enine tahta
function thwart(ctx, pr, uc, wU, z) {
  const u0 = uc - wU, u1 = uc + wU;
  const y0 = hb(uc) * 0.98;
  const quad = [[u0 * BL / 2, -y0, z], [u1 * BL / 2, -y0, z], [u1 * BL / 2, y0, z], [u0 * BL / 2, y0, z]].map(pr);
  const front = [[u0 * BL / 2, y0, z], [u1 * BL / 2, y0, z], [u1 * BL / 2, y0, z - 0.04], [u0 * BL / 2, y0, z - 0.04]].map(pr);
  ctx.fillStyle = '#C8925A'; ctx.fill(P.pathOf(quad));
  ctx.fillStyle = '#8A5A34'; ctx.fill(P.pathOf(front));
  ctx.strokeStyle = rgba('#6A4028', 0.6); ctx.lineWidth = 1; ctx.stroke(P.pathOf(quad));
}
function drawOuter(ctx, pr, psi, near) {
  // dış kaplama: üç sıra tahta (yukarıdan aşağı açıktan koyuya), boyalı ince şerit
  const bands = [[0, 0.2, WOOD.out[2]], [0.2, 0.5, WOOD.out[0]], [0.5, 1.0, WOOD.out[1]]];
  // görünen alt sınır: her u için en aşağıdaki izdüşüm noktası
  const bottom = US.map((u) => { let best = null; for (let k = 0; k <= 8; k++) { const q = pr(hullPt(u, k / 8, near)); if (!best || q[1] > best[1]) best = q; } return best; });
  const outline = curve(pr, 0, near).concat(bottom.slice().reverse());
  const opath = P.pathOf(outline);
  // astar kenarı
  ctx.save(); ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = 2.6; ctx.setLineDash([40, 26, 14, 50]); ctx.translate(1.5, 1.5); ctx.stroke(opath); ctx.restore();
  ctx.fillStyle = WOOD.out[1]; ctx.fill(opath);
  ctx.save(); ctx.clip(opath);
  for (const [a, b, col] of bands) { ctx.fillStyle = col; ctx.fill(P.pathOf(strakePoly(pr, a, b, near))); }
  // gölge: alt yarı soğuk koyu
  ctx.fillStyle = rgba(WOOD.outD, 0.55); ctx.fill(P.pathOf(strakePoly(pr, 0.62, 1, near)));
  // tahta derzleri
  ctx.strokeStyle = rgba('#3E2014', 0.65); ctx.lineWidth = 1.5;
  for (const v of [0.2, 0.5, 0.78]) { const c = curve(pr, v, near); ctx.beginPath(); ctx.moveTo(c[0][0], c[0][1]); for (const q of c) ctx.lineTo(q[0], q[1]); ctx.stroke(); }
  // boyalı şerit (küpeştenin hemen altında)
  ctx.fillStyle = WOOD.stripe; ctx.fill(P.pathOf(strakePoly(pr, 0.05, 0.13, near)));
  ctx.fillStyle = rgba(WOOD.stripeL, 0.7); ctx.fill(P.pathOf(strakePoly(pr, 0.05, 0.075, near)));
  // ahşap darbeleri (yüzey koordinatına bağlı: esner, kaynamaz)
  const r = rng(2631);
  for (let i = 0; i < 22; i++) {
    const v = r.range(0.16, 0.95), u0 = r.range(-1, 0.6), u1 = u0 + r.range(0.2, 0.55);
    const us = []; for (let k = 0; k <= 6; k++) us.push(lerp(u0, Math.min(1, u1), k / 6));
    const col = r.chance(0.5) ? rgba(WOOD.outL, 0.5) : rgba(WOOD.outD, 0.45);
    P.curveStroke(ctx, curve(pr, v, near, us), r.range(2.5, 5), col, r.int(1, 1e9), { bristles: 1, detail: 0.3, taper: true });
  }
  // ışık: küpeşte altında sıcak ince parıltı
  P.curveStroke(ctx, curve(pr, 0.15, near, US.slice(6, 34)), 2.5, rgba('#E8B080', 0.45), 2640, { bristles: 0, detail: 0 });
  P.texture(ctx, P.bbox(outline), 0.05, 0.45, 0.45);
  ctx.restore();
  // pruva bodoslaması
  const stem = []; for (let k = 0; k <= 6; k++) stem.push(pr(hullPt(1, k / 6, near)));
  P.curveStroke(ctx, stem, 0.04 * PPM, WOOD.rail, 2641, { bristles: 1, detail: 0.3 });
  railStroke(ctx, pr, near);
}
function drawTransom(ctx, pr, psi) {
  // ayna (kıç tahtası): dışa bakan normal -x → kameraya bakıyorsa görünür
  const facing = -Math.sin(psi);
  if (facing <= 0.02) return;
  const pts = []; for (let k = 0; k <= 8; k++) pts.push(pr(hullPt(-1, k / 8, 1)));
  for (let k = 8; k >= 0; k--) pts.push(pr(hullPt(-1, k / 8, -1)));
  P.toneShape(ctx, pts, { base: '#8A4E2C', dark: '#5A3020', light: '#B87A48', seed: 2651, rim: false, shadowW: 0.18, lightW: 0.1, dabs: 3, texture: 0.4, strokeAng: 0 });
  const top = [pr(hullPt(-1, 0, 1)), pr(hullPt(-1, 0, -1))];
  P.stroke(ctx, top[0][0], top[0][1], top[1][0], top[1][1], 0.045 * PPM, WOOD.rail, 2652, { detail: 0.3, ridge: false });
}

// ---------- adam ----------
function ik2(S, T, L1, L2) {
  const dx = T[0] - S[0], dy = T[1] - S[1];
  let d = Math.hypot(dx, dy);
  d = clamp(d, Math.abs(L1 - L2) + 1, L1 + L2 - 0.5);
  const th = Math.atan2(dx, dy);
  const al = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const ua = th - al;
  const E2 = [S[0] + Math.sin(ua) * L1, S[1] + Math.cos(ua) * L1];
  const fa = Math.atan2(T[0] - E2[0], T[1] - E2[1]);
  return { ua, fa };
}
// st: { torso, head, eye, brow, mouth, hN:[lx,ly], hF:[lx,ly] } (yerel: kök=ayak, sağa bakan)
function rowPose(st) {
  const p = M.pose({ py: MAN_PY, thighN: deg(100), kneeN: deg(74), thighF: deg(96), kneeF: deg(70), footN: deg(-8), footF: deg(-8),
    torso: st.torso, neck: deg(4), head: st.head, eye: st.eye ?? 1, brow: st.brow ?? 0, mouth: st.mouth ?? 0, grip: 0.9, handN: deg(8), handF: deg(8) });
  const s = M.skeleton(p, BH);
  const L1 = M.L.upper * BH, L2 = M.L.fore * BH, follow = p.armFollow;
  for (const [k, tgt] of [['N', st.hN], ['F', st.hF]]) {
    const S = s['arm' + k].shoulder;
    let hd = Math.atan2(tgt[0] - S[0], tgt[1] - S[1]); // el yönü ilk tahmin
    let r = null;
    for (let it = 0; it < 3; it++) {
      const W = [tgt[0] - Math.sin(hd) * 0.032 * BH, tgt[1] - Math.cos(hd) * 0.032 * BH];
      r = ik2(S, W, L1, L2);
      hd = r.fa + deg(8);
    }
    p['arm' + k] = r.ua - p.torso * follow;
    p['elbow' + k] = r.fa - r.ua;
  }
  return p;
}
// astar kenarı (parça parça çizerken drawMan bunu atladığı için) — yalnız görünen üst gövde
function manRim(ctx, s, o) {
  const h = o.h, cap = M.capsule;
  const shL = [lerp(s.hip[0], s.sh[0], 0.8), lerp(s.hip[1], s.sh[1], 0.8)];
  const sil = [cap(s.hip, shL, 0.12 * h, 0.12 * h), cap(s.armN.shoulder, s.armN.elbow, 0.062 * h, 0.05 * h), cap(s.armN.elbow, s.armN.wrist, 0.05 * h, 0.042 * h)];
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.dir, 1);
  ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = Math.max(1.4, h * 0.0052); ctx.lineJoin = 'round';
  ctx.setLineDash([h * 0.04, h * 0.15, h * 0.02, h * 0.2, h * 0.06, h * 0.12]);
  ctx.translate(h * 0.003, h * 0.002);
  for (const q of sil) ctx.stroke(P.pathOf(q));
  ctx.restore();
}

// ---------- tüm grup ----------
// Grup tuvaline (yerel koordinat, kökeni GX,GY) kayığı + adamı + küreklerin iç kısımlarını çizer.
const GW = 780, GH = 540, GX = 390, GY = 370;
let _g = null, _gn = null, _gl = null;
function canvases() { if (!_g) { _g = createCanvas(GW, GH); _gn = createCanvas(GW, GH); _gl = createCanvas(GW, GH); } return [_g, _gn, _gl]; }

// st: { psi, phi, th, feather, torso, head, mirror(0..1 baş omuz üstünden geri), eye, brow, mouth }
function renderGroup(st) {
  const [G, GN, GL] = canvases();
  const ctx = G.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, GW, GH);
  ctx.translate(GX, GY);
  const psi = st.psi, pr = projector(psi);
  const cps = Math.cos(psi);
  const near = cps >= 0 ? 1 : -1;
  const oN = oarGeom(near, st.phi, st.th), oF = oarGeom(-near, st.phi, st.th);
  // adam: kalça oturakta
  const hip = pr([X_SEAT, 0, Z_HIP]);
  const dir = cps >= 0 ? -1 : 1;           // kıça bakar
  const sq = 1; // profil figür hiç basılmaz; yön değişimi dönüşün kesme anında (çakma + köpük altında) olur
  const root = [hip[0], hip[1] + (0.5 + MAN_PY) * BH];
  const toLocal = (q) => [(q[0] - root[0]) / (dir * sq), q[1] - root[1]];
  const hN = toLocal(pr(oN.handle)), hF = toLocal(pr(oF.handle));
  const p = rowPose({ torso: st.torso, head: st.head, eye: st.eye, brow: st.brow, mouth: st.mouth, hN, hF });
  const LA = st.light ?? -0.95;
  const mo = { x: root[0], y: root[1], h: BH, dir, light: LA };
  const sk = M.skeleton(p, BH);

  drawInterior(ctx, pr, psi, near, 0);
  thwart(ctx, pr, X_SEAT / (BL / 2), 0.07, Z_SEAT);
  thwart(ctx, pr, -0.78, 0.09, Z_SEAT + 0.04);
  thwart(ctx, pr, 0.62, 0.06, Z_SEAT + 0.06);
  // uzak kürek iç kısmı
  drawOar(ctx, pr, oF, 'in', st.feather, 0);
  // adam (yakın kol hariç), dönüşte yatay basık
  ctx.save();
  ctx.translate(root[0], 0); ctx.scale(sq, 1); ctx.translate(-root[0], 0);
  manRim(ctx, sk, mo);
  M.drawMan(ctx, p, Object.assign({}, mo, { parts: ['armF', 'legF', 'legN', 'torso'] }));
  const m = st.mirror || 0;
  if (m < 0.5) M.drawMan(ctx, p, Object.assign({}, mo, { parts: ['head'] }));
  else {
    // baş omzun üstünden geriye: boyun ekseninde aynala
    const mx = root[0] + dir * (sk.neckTop[0] - BH * 0.012);
    ctx.save(); ctx.translate(mx, 0); ctx.scale(-1, 1); ctx.translate(-mx, 0);
    M.drawMan(ctx, p, Object.assign({}, mo, { parts: ['head'], light: Math.PI - LA }));
    ctx.restore();
  }
  ctx.restore();
  // yakın kürek iç kısmı, dış kaplama, ayna, yakın kol
  drawOar(ctx, pr, oN, 'in', st.feather, 0);
  drawOuter(ctx, pr, psi, near);
  drawTransom(ctx, pr, psi);
  // ıskarmozlar
  for (const g of [oN, oF]) { const q = pr(g.O); ctx.fillStyle = '#2A2238'; ctx.fillRect(q[0] - 3, q[1] - 2, 6, 7); }
  ctx.save();
  ctx.translate(root[0], 0); ctx.scale(sq, 1); ctx.translate(-root[0], 0);
  M.drawMan(ctx, p, Object.assign({}, mo, { parts: ['armN'] }));
  ctx.restore();
  // gece / fener ışığı sırları
  for (const [cv, col, a] of [[GN, '#1E2266', st.night ?? 0.36], [GL, '#FFC27A', st.warm ?? 0.16]]) {
    const x = cv.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, GW, GH);
    x.drawImage(G, 0, 0);
    x.globalCompositeOperation = 'source-atop'; x.fillStyle = rgba(col, a); x.fillRect(0, 0, GW, GH);
    x.globalCompositeOperation = 'source-over';
  }
  return { G, GN, GL, oN, oF, pr, near, sk, root, dir };
}

module.exports = { BH, PPM, BL, HB, X_SEAT, X_OL, LIN, LOUT, GW, GH, GX, GY, projector, oarGeom, drawOar, renderGroup, hb, hullPt, depthOf };
