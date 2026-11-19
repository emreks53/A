// S09 — "geçmiş lezzetleri ve gelecek belaları düşünmek vasıtasıyla," (27.30–32.00)
// Adam bir taşın üstünde oturur; altında geçmiş ← • → gelecek zaman çizgisi.
// 27.76 "geçmiş lezzetleri": solda sepya düşünce bulutu (ziyafet sofrası, bahar bahçesi), adam omzunun üstünden
// geriye bakar; resim tozlaşıp ufalanır. 29.36 "gelecek belaları": sağda fırtına bulutu (şimşek, yaklaşan dalgalar),
// adam endişeyle sağa döner. 30.40 "düşünmek": iki bulut başının çevresinde döner, ağırlaşır; adam başını ellerine alır.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s05_lib');
const TH = require('./_s05_think');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng } = C;
const d = C.deg;

const MAN = { x: 478, y: 1302, h: 600 };
const LA = -2.3;
const HORIZ = 1188;
const SS = 1.25;
const PAST_AT = [326, 566], STORM_AT = [754, 640];

// ---------- pozlar ----------
// uzak ayak 34 px geride (iki ayakkabı üst üste binmesin)
const SIT = M.pose({ py: -0.224, thighN: d(85), kneeN: d(85), thighF: d(84), kneeF: d(98), footF: d(14), torso: d(6), neck: d(6), head: d(10), armN: d(15), elbowN: d(38), handN: d(25), armF: d(10), elbowF: d(42), handF: d(25), eye: 0.9, brow: 0.25 });
// geçmişe dönük (bütün beden sola döner): dik oturuş, baş kalkık, geçmiş bulutuna bakar
const BACK = M.pose(Object.assign({}, SIT, { torso: d(2), neck: d(0), head: d(-18), brow: 0.5, eye: 0.85, armF: d(8), elbowF: d(44) }));
// geleceğe (fırtınaya) dönük: dik/hafif öne, elleri dizlerini sıkıca kavrar, kaşlar endişeli
const ANX = M.pose(Object.assign({}, SIT, { torso: d(5), neck: d(2), head: d(-14), armN: d(18), elbowN: d(36), handN: d(22), armF: d(13), elbowF: d(40), grip: 0.85, eye: 1, brow: 1, mouth: -0.5 }));
// dönüş anı (taşın üstünde gövdeyle dönerken): öne eğilip elleriyle taşa dayanır, bacaklar toplanır
const TUCK = M.pose(Object.assign({}, SIT, { py: -0.214, torso: d(12), neck: d(4), head: d(6), thighN: d(74), kneeN: d(96), thighF: d(72), kneeF: d(104), armN: d(-8), elbowN: d(20), handN: d(30), armF: d(-12), elbowF: d(18), eye: 0.6 }));
// dirsekler dizlerde, yüz avuçlarda (klasik çaresizlik duruşu: siluet tek bakışta okunur)
const HANDS = M.pose(Object.assign({}, SIT, { torso: d(44), neck: d(16), head: d(40), armN: d(2), elbowN: d(152), handN: d(-40), armF: d(4), elbowF: d(148), handF: d(-36), eye: 0.12, brow: 1, mouth: -0.6, grip: 0.3 }));

// bütün bedenle dönüş (baş tek başına dönmez): 27.90'da sola (geçmişe), 29.30'da sağa (geleceğe)
const TURN_BACK = 27.9, TURN_FRONT = 29.3, PRE = 0.15, POST = 0.26;
const X_R = MAN.x, X_L = MAN.x + 34;   // sola dönükken taşın öbür yanına kayar (bacaklar taşın sol kenarından sarkar)
// dönüş penceresinde TUCK'a yaklaş / TUCK'tan hedefe aç
function swivel(t, tc, from, to) {
  if (t < tc - PRE || t > tc + POST) return null;
  if (t < tc) return M.lerpPose(from, TUCK, E.inOutSine(seg(t, tc - PRE, tc)));
  return M.lerpPose(TUCK, to, E.outBack(seg(t, tc, tc + POST), 1.3));
}
function expressBack(p, t) {
  // geri bakarken ifade: önce tatlı bir anı (hafif gülümseme), ufalanırken hüzün
  const fond = E.smooth(seg(t, 28.05, 28.4)) * (1 - E.smooth(seg(t, 28.75, 29.15)));
  p.mouth = lerp(p.mouth, 0.35, fond) - 0.45 * E.smooth(seg(t, 28.85, 29.2));
  p.brow += 0.35 * E.smooth(seg(t, 28.85, 29.2));
  return p;
}
function poseAt(t) {
  let p, dir, x;
  if (t < TURN_BACK) { dir = 1; p = swivel(t, TURN_BACK, SIT, BACK) || Object.assign({}, SIT); }
  else if (t < TURN_FRONT) { dir = -1; p = expressBack(swivel(t, TURN_BACK, SIT, BACK) || swivel(t, TURN_FRONT, BACK, ANX) || Object.assign({}, BACK), t); }
  else { dir = 1; p = swivel(t, TURN_FRONT, BACK, ANX) || Object.assign({}, ANX); }
  p = Object.assign({}, p);
  x = lerp(X_R, X_L, E.inOutSine(seg(t, TURN_BACK - PRE, TURN_BACK + POST * 0.7))) + (X_R - X_L) * E.inOutSine(seg(t, TURN_FRONT - PRE, TURN_FRONT + POST * 0.7));
  // şimşekte irkilme
  const jolt = Math.exp(-Math.max(0, t - 29.88) * 7) * (t > 29.88 ? 1 : 0);
  p.torso -= d(3) * jolt; p.head -= d(4) * jolt;
  const h = E.inOutCubic(seg(t, 30.32, 30.95));
  if (h > 0) p = M.lerpPose(p, HANDS, h);
  // ağırlık: sonra yavaşça daha da çöker
  const sag = E.inOutSine(seg(t, 30.95, 32.2));
  p.torso += d(3) * sag; p.head += d(3) * sag;
  // nefes
  const br = Math.sin(t * 2.6) * (1 - h * 0.5);
  p.torso += d(0.8) * br; p.py += 0.0015 * br;
  if (h > 0.5) p.torso += d(0.7) * Math.sin(t * 7.5) * Math.exp(-Math.max(0, t - 31.0) * 1.5) * (t > 31.0 ? 1 : 0);
  return { p, dir, x };
}

// yakın kolun gövdeye/uyluğa düşen gölgesi: beyaz gömlekli kol beyaz gövdeyle tek leke gibi birleşmesin
function torsoPts(s, h, p) {
  const t = p.torso, up = s.td, fw = [Math.cos(t), Math.sin(t)];
  const at = (k, f) => [s.hip[0] + up[0] * k * M.L.torso * h + fw[0] * f * h, s.hip[1] + up[1] * k * M.L.torso * h + fw[1] * f * h];
  const hu = p.spine;
  return P.smoothPts([at(-0.2, -0.055), at(0.15, -0.062), at(0.55, -0.068 - hu * 0.02), at(0.86, -0.06 - hu * 0.035), at(1.02, -0.035 - hu * 0.02), at(1.06, 0.0), at(1.0, 0.035), at(0.82, 0.066), at(0.6, 0.064), at(0.35, 0.056), at(0.05, 0.062), at(-0.2, 0.058)], true, 6);
}
function armShadow(p, k) {
  return (ctx, s, h) => {
    if (k <= 0.01) return;
    const A = s.armN, cap = M.capsule;
    const clip = L.unionPath([torsoPts(s, h, p), cap(s.legN.hip, s.legN.knee, 0.085 * h, 0.06 * h)]);
    const off = [0.016 * h, 0.014 * h];
    const sh = L.unionPath([cap(A.shoulder, A.elbow, 0.062 * h, 0.05 * h), cap(A.elbow, A.wrist, 0.05 * h, 0.042 * h)].map((q) => q.map(([x, y]) => [x + off[0], y + off[1]])));
    ctx.save(); ctx.clip(clip); ctx.fillStyle = rgba('#7E76A8', 0.5 * k); ctx.fill(sh); ctx.restore();
  };
}
function drawMan(ctx, t) {
  const { p, dir, x } = poseAt(t);
  const mid = armShadow(p, 0.55 + 0.45 * E.smooth(seg(t, 30.4, 30.9)));
  M.drawMan(ctx, p, { x, y: MAN.y, h: MAN.h, dir, light: LA, mid });
  return { s: M.skeleton(p, MAN.h), dir, x };
}

// ---------- arka plan (önbellek) ----------
function skyCv() {
  const w = C.W + 80, h = HORIZ + 60;
  return L.hcache('s09sky', w, h, SS, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, ['#2C2F6E', '#3E4590', '#6266AC', '#9A92C6', '#D7B9C8', '#F0CFC0'], { seed: 131, wMin: 22, wMax: 42, lMin: 90, lMax: 280, stops: [0, 0.22, 0.45, 0.68, 0.88, 1] });
    // birkaç ince bulut şeridi
    const r = rng(132);
    for (let i = 0; i < 9; i++) { const y = r.range(200, 950), x0 = r.range(-80, w), len = r.range(160, 380); x.save(); x.globalAlpha = 0.75; P.stroke(x, x0, y, x0 + len, y + r.range(-6, 6), r.range(14, 24), r.chance(0.5) ? '#B8AED6' : '#8C86C2', r.int(1, 1e9), { detail: 0.6, taper1: 0.6 }); x.restore(); }
    R.stars(x, w, 600, 26, 133, 0, { maxY: 0.8 });
  });
}
function groundCv() {
  const w = C.W + 80, y0 = HORIZ - 70, h = C.H + 60 - y0;
  return L.hcache('s09ground', w, h, SS, (x) => {
    x.translate(0, -y0);
    // uzak tepeler
    const top = []; for (let i = 0; i <= 60; i++) { const u = i / 60; top.push([u * w, HORIZ - 30 - 26 * Math.sin(u * 6 + 1) - 14 * Math.sin(u * 13 + 2)]); }
    const far = top.concat([[w, HORIZ + 40], [0, HORIZ + 40]]);
    P.toneShape(x, far, { base: '#5C5A9C', dark: '#45437E', light: '#7674B4', seed: 134, shadowW: 0.02, lightW: 0.01, dabs: 12, rimW: 4 });
    // çayır
    const gt = []; for (let i = 0; i <= 60; i++) { const u = i / 60; gt.push([u * w, HORIZ + 6 * Math.sin(u * 5 + 0.3)]); }
    const g = gt.concat([[w, C.H + 60], [0, C.H + 60]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 6; x.setLineDash([110, 60, 40, 90]); x.stroke(P.pathOf(gt, false)); x.restore();
    x.save(); x.clip(P.pathOf(g)); x.fillStyle = '#3F7468'; x.fillRect(0, HORIZ - 20, w, 900); x.restore();
    P.bandFill(x, P.pathOf(g), { x0: 0, y0: HORIZ, x1: w, y1: C.H + 60, w, h: C.H + 60 - HORIZ }, ['#6E9C86', '#4F8676', '#3C6E66', '#2F5C5A'], { seed: 135, wMin: 16, wMax: 30, lMin: 80, lMax: 240, stops: [0, 0.15, 0.45, 1] });
    const r = rng(136);
    for (let i = 0; i < 14; i++) { const gx = r.range(20, w - 20); R.grass(x, gx, r.range(HORIZ + 40, 1400), r.range(22, 34), r.int(1, 999), { c1: '#2F5C5A', c2: '#6E9C86' }); }
  });
}
function stoneCv() {
  const w = 300, h = 190, ox = 350, oy = 1140; // dünya koordinatında (350..650, 1140..1330)
  return L.hcache('s09stone', w, h, SS, (x) => {
    x.translate(-ox, -oy);
    // gölge
    x.fillStyle = rgba('#1E2A3A', 0.35); x.beginPath(); x.ellipse(505, 1312, 150, 16, 0, 0, TAU); x.fill();
    const pts = P.smoothPts([[372, 1314], [366, 1252], [390, 1198], [446, 1167], [530, 1163], [592, 1184], [624, 1238], [622, 1314]], true, 8);
    P.toneShape(x, pts, { base: '#9C95BA', dark: '#5E567E', light: '#D4CEE8', seed: 137, shadowW: 0.16, lightW: 0.1, dabs: 14, strokeAng: 0.3 });
    // yosun
    const r = rng(138);
    for (let i = 0; i < 6; i++) { const mx = r.range(390, 600), my = r.range(1180, 1230); P.stroke(x, mx, my, mx + r.range(16, 34), my + r.range(-4, 4), r.range(7, 11), r.chance(0.5) ? '#7CA86A' : '#5E8E5E', r.int(1, 1e9), { detail: 0.4 }); }
    for (let i = 0; i < 7; i++) R.grass(x, r.range(370, 630), 1316, r.range(18, 30), r.int(1, 999), { c1: '#2F5C5A', c2: '#7CA88A' });
  });
}

// ---------- zaman çizgisi ----------
function timeline(ctx, t, pastHi, futHi) {
  const k = E.outCubic(seg(t, 27.5, 28.15));   // s08'in anlam satırı söndükten sonra, "geçmiş"le birlikte açılır
  if (k <= 0) return;
  const y = 1432, xc = 540, half = 372 * k;
  const pc = mix('#C9A97A', '#F2D49A', pastHi), fc = mix('#8A9CC8', '#B8CCF4', futHi);
  P.stroke(ctx, xc, y, xc - half, y + 1, 8, pc, 141, { detail: 0.5, taper1: 0.7, ridge: false });
  P.stroke(ctx, xc, y, xc + half, y - 1, 8, fc, 142, { detail: 0.5, taper1: 0.7, ridge: false });
  // çentikler
  for (let i = 1; i <= 5; i++) {
    for (const sg of [-1, 1]) {
      const xx = xc + sg * i * 66; if (Math.abs(xx - xc) > half - 10) continue;
      ctx.fillStyle = rgba(sg < 0 ? pc : fc, 0.8); ctx.fillRect(xx - 2, y - 9, 4, 18);
    }
  }
  // ok uçları
  const ah = E.outBack(seg(t, 27.98, 28.28), 2);
  if (ah > 0) {
    for (const sg of [-1, 1]) {
      const ex = xc + sg * (half + 6), c = sg < 0 ? pc : fc, s = 20 * ah;
      ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(ex + sg * s, y); ctx.lineTo(ex - sg * s * 0.4, y - s * 0.75); ctx.lineTo(ex - sg * s * 0.1, y); ctx.lineTo(ex - sg * s * 0.4, y + s * 0.75); ctx.closePath(); ctx.fill();
    }
  }
  // "şimdi" noktası: altın, nabız atan
  const pulse = 1 + 0.12 * Math.sin(t * 5);
  P.glow(ctx, xc, y, 60 * pulse, '#FFD98A', 0.55 * k);
  ctx.fillStyle = '#FFE7A6'; ctx.beginPath(); ctx.arc(xc, y, 12 * pulse * k, 0, TAU); ctx.fill();
  ctx.fillStyle = '#E8B23A'; ctx.beginPath(); ctx.arc(xc + 2, y + 2, 7 * k, 0, TAU); ctx.fill();
}

// ---------- bulutların durumu ----------
function flashAt(t) {
  let f = 0, seed = 1;
  for (const [tf, amp, sd] of [[29.86, 1, 7], [30.3, 0.65, 11], [31.12, 0.5, 19]]) {
    if (t < tf - 0.02) continue;
    const u = t - tf;
    const v = amp * (u < 0 ? 0.4 : Math.exp(-u * 7) * (u < 0.06 ? 1 : 0.85 + 0.15 * Math.sin(u * 80)));
    if (v > f) { f = v; seed = sd; }
  }
  return { f, seed };
}
function bubbleState(t) {
  const orbitK = E.inOutCubic(seg(t, 30.32, 31.0));
  const ang = TAU * 0.36 * Math.pow(Math.max(0, t - 30.32), 1.25);
  // yörünge başın çevresinde (eğilmiş baş ≈ 650, 975)
  // yörünge: eğik başın üstünde (baş ≈ 674, 1019) yatay bir halka; bulutlar ağırlaştıkça biraz çöker
  const ocx = 640 + 5 * Math.sin(t), ocy = lerp(826, 846, E.smooth(seg(t, 30.6, 32.2)));
  const rx = 205, ry = 40;
  const heavy = E.smooth(seg(t, 30.45, 31.6));
  const pastPop = C.pop(t, 27.68, 0.55, 1.6), stormPop = C.pop(t, 29.28, 0.55, 1.6);
  const aP = Math.PI + ang, aS = ang;
  const posP = [lerp(PAST_AT[0], ocx + Math.cos(aP) * rx, orbitK), lerp(PAST_AT[1], ocy + Math.sin(aP) * ry, orbitK)];
  const posS = [lerp(STORM_AT[0], ocx + Math.cos(aS) * rx, orbitK), lerp(STORM_AT[1], ocy + Math.sin(aS) * ry, orbitK)];
  const sc = (a) => lerp(0.8, 0.42 * (1 + 0.16 * Math.sin(a)), orbitK);
  // fırtına bulutu titrer (şimşekte)
  const fl = flashAt(t);
  const shake = fl.f * 6;
  posS[0] += Math.sin(t * 61) * shake; posS[1] += Math.cos(t * 47) * shake;
  return {
    orbitK, heavy,
    past: { x: posP[0], y: posP[1] + Math.sin(t * 1.3) * 5 * (1 - orbitK), s: pastPop * sc(aP), front: orbitK > 0.5 && Math.sin(aP) > 0, crumble: Math.max(0, t - 28.75), dusty: E.smooth(seg(t, 28.9, 29.7)) },
    storm: { x: posS[0], y: posS[1] + Math.sin(t * 1.1 + 1) * 5 * (1 - orbitK), s: stormPop * sc(aS), front: orbitK > 0.5 && Math.sin(aS) > 0, approach: E.smooth(seg(t, 29.4, 31.6)), flash: fl.f, boltSeed: fl.seed },
  };
}

module.exports = {
  draw(ctx, t) {
    // kamera: yavaş itme; "düşünmek"te başa doğru
    const push = E.inOutCubic(seg(t, 30.3, 31.3));
    const zoom = lerp(1.2, 1.26, E.inOutSine(seg(t, 26.95, 30.3))) + 0.1 * push;
    const [bx, by] = R.breathe(t, 2.5, 91);
    R.camera(ctx, { zoom, cx: lerp(540, 572, push) + bx, cy: lerp(950, 985, push) + by });
    const dim = 0.32 * E.smooth(seg(t, 30.4, 31.4));
    ctx.drawImage(skyCv(), -40, -40, C.W + 80, HORIZ + 60);
    const g0 = HORIZ - 70; ctx.drawImage(groundCv(), -40, g0, C.W + 80, C.H + 60 - g0);
    const bs = bubbleState(t);
    // renk sıcaklığı: geçmiş solda sıcak ışık, gelecek sağda soğuk gölge
    const pastVis = clamp(bs.past.s) * (1 - 0.6 * bs.past.dusty), stormVis = clamp(bs.storm.s);
    if (pastVis > 0.01) P.glow(ctx, bs.past.x, bs.past.y + 250, 640, '#FFC878', 0.22 * pastVis * (1 - bs.orbitK));
    if (stormVis > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'multiply';
      const g = ctx.createRadialGradient(bs.storm.x, bs.storm.y + 200, 80, bs.storm.x, bs.storm.y + 200, 760);
      g.addColorStop(0, rgba('#6A72B0', 0.55 * stormVis)); g.addColorStop(1, rgba('#6A72B0', 0));
      ctx.fillStyle = g; ctx.fillRect(-60, -60, C.W + 120, C.H + 120); ctx.restore();
    }
    ctx.drawImage(stoneCv(), 350, 1140, 300, 190);
    const pastHi = clamp(bs.past.s) * (1 - bs.past.dusty * 0.7) * (1 - bs.orbitK), futHi = clamp(bs.storm.s) * (1 - bs.orbitK);
    timeline(ctx, t, pastHi, futHi);
    // arkadaki bulutlar (yörüngede adamın arkasında kalanlar)
    const st = { t, storm: bs.storm };
    const drawB = (which) => {
      const b = bs[which];
      if (b.s <= 0.01) return;
      TH.bubble(ctx, which === 'past' ? 'past' : 'storm', b.x, b.y, { scale: b.s, crumble: b.crumble, dusty: b.dusty, t, storm: b, heavy: bs.heavy });
    };
    if (!bs.past.front) drawB('past');
    if (!bs.storm.front) drawB('storm');
    // ortamı karart (ağırlık)
    if (dim > 0.005) { ctx.save(); ctx.fillStyle = rgba('#1A1634', dim); ctx.fillRect(-60, -60, C.W + 120, C.H + 120); ctx.restore(); }
    const man = drawMan(ctx, t), s = man.s;
    // şimşek çakınca adamın üstüne soğuk ışık
    if (bs.storm.flash > 0.02) { P.glow(ctx, bs.storm.x - 80, bs.storm.y + 220, 700, '#C8D4FF', 0.32 * bs.storm.flash); }
    // düşünce noktacıkları: baştan buluta
    // noktacıkların kökü: başın dinlenme konumu (dönüş anındaki ayna sıçramasını izlemesin)
    const bk = (man.x - X_R) / (X_L - X_R);
    const hw = [man.x + 35 * (1 - 2 * bk), MAN.y - 403];
    const dotFade = 1 - E.smooth(seg(t, 30.3, 30.6));
    if (dotFade > 0) {
      ctx.save(); ctx.globalAlpha *= dotFade;
      TH.dots(ctx, hw[0] - 10, hw[1] - 70, bs.past.x + 60, bs.past.y + 120, seg(t, 27.45, 27.75), 'past');
      TH.dots(ctx, hw[0] + 20, hw[1] - 70, bs.storm.x - 70, bs.storm.y + 120, seg(t, 29.05, 29.35), 'storm');
      ctx.restore();
    }
    // yörüngede fırtına bulutu adamın üstüne yağmur damlatır (ağırlık)
    const rk = bs.orbitK * (1 - 0.0);
    if (rk > 0.05) {
      ctx.save(); ctx.globalAlpha *= rk;
      L.rain(ctx, bs.storm.x - 70, bs.storm.x + 70, bs.storm.y + 50, bs.storm.y + 330, t, 16, 233, { speed: 700, len: 24, ang: -0.12, color: '#AFC2E4', alpha: 0.55 });
      ctx.restore();
    }
    if (bs.past.front) drawB('past');
    if (bs.storm.front) drawB('storm');
    // "lezzetleri": sofranın üstünde kısa parıltılar
    const sp = C.win(t, 28.2, 28.95, 0.15, 0.3);
    if (sp > 0) R.sparkles(ctx, bs.past.x + 30, bs.past.y + 40, 110, 8, t, 151, { alpha: sp, scale: 1.1, color: '#FFF4D0' });
  },
  sfx: [
    { t: 27.68, type: 'bubble', gain: 0.22 },
    { t: 28.8, type: 'sand', gain: 0.3 },
    { t: 29.3, type: 'rumble', gain: 0.3 },
    { t: 29.86, type: 'crack', gain: 0.28 },
    { t: 30.4, type: 'wind', gain: 0.25 },
  ],
};
