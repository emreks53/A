// S11 — "ancak kederli, meşakkatli bir hayat geçiriyor." (35.50–39.60)
// Adam sırtında kocaman bir çuvalla dik, uzun bir yokuşu ağır ağır tırmanır; kamera yanından onunla kayar
// (ayak izi tabanlı yürüyüş: ayaklar yere sabit, kaymaz). 36.24 "kederli": başının üstünde onu izleyen küçük
// yağmur bulutu belirir, ortam soğur. 37.08 "meşakkatli": tökezler (gövde öne savrulur, çakıllar yokuştan yuvarlanır),
// durur, soluklanıp alnını siler (ter damlası savrulur). 37.9–38.7 "bir hayat": başını kaldırıp yola bakar;
// kamera geri çekilip yukarı eğilir: yol uzak dağın yamacında zikzak çizerek zirveye doğru "uzar".
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s11_lib');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

// ---------- yokuş geometrisi (dünya) ----------
const TH = d(17), CT = Math.cos(TH), SN = Math.sin(TH), TN = Math.tan(TH);
const O = [0, 1700];
const ground = (s) => [O[0] + s * CT, O[1] - s * SN];
const groundY = (x) => O[1] - (x - O[0]) * TN;
const HM = 520;            // adamın boyu
const S = 0.2, D0 = 2.0, C0 = 0.62; // adım (boy oranı), başlangıç, kadans (döngü/sn)
const LA = -2.3;
// yürüyüş fazı: düzenli → tökezleme (hızlı adım, 37.08'de basar) → duruş → yeniden yürüyüş
const UK = [[34.2, 1.7 - C0 * 2.65, C0], [36.85, 1.7, C0], [37.08, 2.0, 1.15], [37.25, 2.085, 0], [37.86, 2.085, 0], [38.5, 2.285, C0], [41.0, 2.285 + C0 * 2.5, C0]];
const uAt = (t) => L.hermite(UK, t);
// kamera izleme fazı: düz ortalama hız (adam duruşta kadrajda hafifçe geride kalır, sonra yetişir)
const UC0 = [34.2, uAt(34.2)], UC1 = [41.0, uAt(41.0)];
const ucAt = (t) => UC0[1] + (UC1[1] - UC0[1]) * (t - UC0[0]) / (UC1[0] - UC0[0]);
const rootAt = (u) => ground((D0 + 2 * S * u) * HM);

// ---------- kamera ----------
const PULL0 = 37.85, PULL1 = 38.8;
function camAt(t) {
  const rc = rootAt(ucAt(t));
  const k = E.inOutCubic(seg(t, PULL0, PULL1));
  const zoom = lerp(1.0, 0.68, k);
  const [bx, by] = R.breathe(t, 3, 111);
  // tökezleme anında küçük bir sarsıntı
  const bump = Math.exp(-9 * Math.max(0, t - 37.08)) * Math.sin(TAU * 5 * Math.max(0, t - 37.08)) * (t > 37.08 ? 7 : 0);
  return { zoom, cx: rc[0] + lerp(70, 300, k) + bx, cy: rc[1] - lerp(235, 520, k) + by + bump };
}
const REF = camAt(35.3);
// uzak katman çizimi: ref kamerada ekran koordinatlarıyla çizilmiş katman
function farLayer(ctx, cam, f, fn) {
  ctx.save();
  L.camLayer(ctx, cam, REF, f);
  ctx.translate(REF.cx - 540, REF.cy - 960);
  fn(ctx);
  ctx.restore();
}

// ---------- adam durumu ----------
const pulseAt = (t) => E.outQuad(seg(t, 36.98, 37.1)) * (1 - E.inOutSine(seg(t, 37.1, 37.8)));
function manState(t) {
  const u = uAt(t);
  const D = D0 + 2 * S * u;
  const warp = (x, y, fa) => [x * CT + y * SN, -x * SN + y * CT, fa - TH];
  const pulse = pulseAt(t);
  const stop = E.inOutSine(seg(t, 37.18, 37.4)) * (1 - E.inOutSine(seg(t, 37.75, 38.1)));
  const breath = Math.sin((t - 37.2) * TAU * 1.3) * stop;
  const r = L.evalWalker({
    D, legs: L.steadyLegs(u, S, D0), warp,
    lean: d(19) + d(13) * pulse + d(3) * stop + d(1.5) * breath + d(1.2) * Math.sin(u * TAU * 2),
    ext: 0.972 - 0.02 * stop,
    cap: L.FLAT_DROP + 0.48 * 0.972 - 0.05 * pulse - 0.012 * stop,
    legOpts: { lift: 0.042, heelRise: 1 - 0.7 * stop, toeOff: d(26) },
  });
  const p = r.pose;
  // baş: yorgun, yola bakan; "kederli"de biraz daha düşer; tökezlemede sarsılır; 37.7'de yola bakar
  const sad = E.inOutSine(seg(t, 36.2, 36.7));
  const look = E.inOutSine(seg(t, 37.62, 38.0)) * (1 - E.inOutSine(seg(t, 38.45, 38.9)));
  p.neck = d(-8) + d(3) * sad - d(10) * look;
  p.head = d(-4) + d(5) * sad + d(12) * pulse - d(14) * look - d(1.5) * breath;
  p.brow = 0.75 + 0.25 * pulse; p.mouth = -0.35 - 0.2 * sad; p.eye = 0.82 + 0.18 * look;
  if ((t > 37.1 && t < 37.17) || (t > 38.92 && t < 38.99)) p.eye = 0.1;
  // kollar: ipi göğüs önünde tutar; tökezlemede yakın el öne savrulur, sonra alnını siler
  const sk = M.skeleton(p, 1);
  const fw = [Math.cos(p.torso), Math.sin(p.torso)], up = sk.td;
  const grip = [sk.sh[0] + fw[0] * 0.085 - up[0] * 0.115, sk.sh[1] + fw[1] * 0.085 - up[1] * 0.115];
  let q = L.reach(p, grip, 'F', 1, p.torso + d(150));
  q.grip = 0.85;
  const fling = E.outCubic(seg(t, 37.0, 37.12)) * (1 - E.inOutSine(seg(t, 37.2, 37.42)));
  const brow = E.inOutSine(seg(t, 37.28, 37.5)) * (1 - E.inOutSine(seg(t, 37.78, 38.02)));
  const wipe = E.inOutSine(seg(t, 37.5, 37.76));
  // alın noktası (baş merkezine göre, başın yönünde)
  const hc = sk.headC, ha = sk.ha, hu = M.L.head;
  const rot = (x, y) => [hc[0] + (x * Math.cos(ha) - y * Math.sin(ha)) * hu, hc[1] + (x * Math.sin(ha) + y * Math.cos(ha)) * hu];
  const browA = rot(0.62, -0.05), browB = rot(0.05, -0.3);
  const browT = [lerp(browA[0], browB[0], wipe), lerp(browA[1], browB[1], wipe)];
  const flingT = [sk.sh[0] + 0.26, sk.sh[1] + 0.1];
  let nT = grip.slice();
  nT = [lerp(nT[0], flingT[0], fling), lerp(nT[1], flingT[1], fling)];
  nT = [lerp(nT[0], browT[0], brow), lerp(nT[1], browT[1], brow)];
  const handA = lerp(lerp(p.torso + d(150), d(55), fling), lerp(d(200), d(235), wipe), brow);
  q = L.reach(q, nT, 'N', 1, handA);
  q.grip = lerp(0.85, 0.2, Math.max(fling, brow));
  return { p: q, u, D, root: ground(D * HM), pulse, stop, brow, wipe, fling, hipH: r.hipH };
}

// ---------- çuval (önbellekli sprite) ----------
const SACK = { w: 320, h: 380, A: [262, 214], N: [180, 66] };
function sackCv() {
  return L.hcache('sack', SACK.w, SACK.h, 1.6, (x) => {
    const body = P.smoothPts([[64, 300], [44, 222], [62, 146], [112, 100], [168, 92], [226, 104], [262, 150], [276, 226], [264, 304], [218, 352], [150, 366], [92, 344]], true, 8);
    P.toneShape(x, body, { base: '#C99A55', dark: '#7C5A55', light: '#EAC583', hi: '#F4D69A', lightAng: LA, seed: 1101, shadowW: 0.16, lightW: 0.1, coreScale: 0.9, dabs: 18, highlights: 5, strokeAng: 0.6, texture: 0.0, rimW: 6 });
    // çuval bezi dokusu: iki yönde kıl izi
    x.save(); x.clip(P.pathOf(body)); const bb = P.bbox(body);
    P.texture(x, bb, 0.0, 0.5, 0.45); P.texture(x, bb, Math.PI / 2, 0.35, 0.45);
    // kıvrım darbeleri: boyundan yayılan kırışıklar ve dolgun karın
    const r = rng(1102);
    for (let i = 0; i < 7; i++) {
      const a = d(60) + i * d(13) + r.range(-0.08, 0.08), r0 = 30, r1 = r.range(70, 120);
      const c = [172, 98], line = [];
      for (let k = 0; k <= 8; k++) { const u = k / 8, rr = lerp(r0, r1, u); line.push([c[0] + Math.cos(a + u * 0.25) * rr, c[1] + Math.sin(a + u * 0.25) * rr]); }
      x.save(); x.globalAlpha = 0.45; P.curveStroke(x, line, 6, '#7A5040', 1110 + i, { taper: true, bristles: 1 }); x.restore();
    }
    for (let i = 0; i < 3; i++) {
      const line = []; for (let k = 0; k <= 10; k++) { const u = k / 10; line.push([lerp(80, 250, u), 250 + 40 * i - Math.sin(u * Math.PI) * (30 + 8 * i)]); }
      x.save(); x.globalAlpha = 0.35; P.curveStroke(x, line, 5, '#8E6448', 1120 + i, { taper: true, bristles: 1 }); x.restore();
    }
    // yama
    const patch = P.xform(P.roundRectPts(-34, -30, 68, 60, 6), { x: 120, y: 268, rot: -0.22 });
    P.toneShape(x, patch, { base: '#5E72A8', dark: '#3D4A80', light: '#7F94C4', lightAng: LA, seed: 1103, shadowW: 0.18, lightW: 0.12, dabs: 3, highlights: 1, rim: false, texture: 0.4 });
    x.strokeStyle = '#F4E6C6'; x.lineWidth = 2.2; x.setLineDash([6, 6]);
    x.stroke(P.pathOf(P.xform(P.roundRectPts(-28, -24, 56, 48, 4), { x: 120, y: 268, rot: -0.22 })));
    x.setLineDash([]);
    x.restore();
    // boyun (büzülmüş ağız) ve püskül
    const neck = P.smoothPts([[146, 104], [154, 76], [172, 62], [196, 66], [206, 84], [202, 106]], true, 6);
    P.toneShape(x, neck, { base: '#BE8E4C', dark: '#7A5545', light: '#E2B977', lightAng: LA, seed: 1104, shadowW: 0.25, lightW: 0.12, dabs: 4, rimW: 4, texture: 0.4 });
    const tuft = P.smoothPts([[154, 66], [140, 34], [160, 44], [168, 16], [182, 38], [198, 20], [200, 46], [216, 38], [206, 66]], true, 4);
    P.toneShape(x, tuft, { base: '#D7A962', dark: '#8A6248', light: '#F0CC8A', lightAng: LA, seed: 1105, shadowW: 0.22, lightW: 0.14, dabs: 3, rimW: 3, texture: 0.4 });
    // bağ ipi
    const tie = P.smoothPts([[150, 72], [176, 62], [206, 70], [208, 82], [176, 76], [148, 86]], true, 4);
    P.toneShape(x, tie, { base: '#8A5A34', dark: '#4E2E20', light: '#B9804E', lightAng: LA, seed: 1106, shadowW: 0.3, lightW: 0.15, dabs: 1, rim: false, texture: 0.3 });
  });
}
function sackFrame(s, h, p, t, st) {
  const up = s.td, fw = [Math.cos(p.torso), Math.sin(p.torso)];
  const A = [s.hip[0] + up[0] * 0.53 * M.L.torso * h - fw[0] * 0.066 * h, s.hip[1] + up[1] * 0.53 * M.L.torso * h - fw[1] * 0.066 * h];
  // ikincil hareket: adımla hafif salınım, tökezlemede öne savrulup geri oturma
  const sway = d(1.6) * Math.sin(st.u * TAU * 2 - 0.9) + d(7) * Math.sin(Math.PI * seg(t, 37.04, 37.4)) * (1 - seg(t, 37.4, 37.9)) - d(2.5) * C.spring(t, 37.35, 2.2, 6) * (t > 37.35 ? 1 : 0) * 0;
  const rot = p.torso * 0.85 + sway;
  const k = h / 500;
  return { A, rot, k };
}
function sackPt(F, q) {
  const dx = (q[0] - SACK.A[0]) * F.k, dy = (q[1] - SACK.A[1]) * F.k, c = Math.cos(F.rot), s = Math.sin(F.rot);
  return [F.A[0] + dx * c - dy * s, F.A[1] + dx * s + dy * c];
}
function drawSack(ctx, F) {
  ctx.save(); ctx.translate(F.A[0], F.A[1]); ctx.rotate(F.rot); ctx.scale(F.k, F.k);
  ctx.drawImage(sackCv(), -SACK.A[0], -SACK.A[1], SACK.w, SACK.h);
  ctx.restore();
}
function rope(ctx, pts, w, seed) {
  const line = P.smoothPts(pts, false, 8);
  P.curveStroke(ctx, line, w * 1.25, '#5A3824', seed + 1, { bristles: 0, detail: 0 });
  P.curveStroke(ctx, line, w, '#9C6B40', seed, { bristles: 3 });
  // burgu: kısa açık eğik çizgiler
  ctx.strokeStyle = rgba('#D9A86A', 0.75); ctx.lineWidth = Math.max(1, w * 0.18);
  for (let i = 2; i < line.length - 2; i += 3) {
    const a = line[i - 1], b = line[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], dd = Math.hypot(dx, dy) || 1;
    const nx = -dy / dd, ny = dx / dd, c = line[i];
    ctx.beginPath(); ctx.moveTo(c[0] - nx * w * 0.38 - dx / dd * w * 0.2, c[1] - ny * w * 0.38 - dy / dd * w * 0.2); ctx.lineTo(c[0] + nx * w * 0.38 + dx / dd * w * 0.2, c[1] + ny * w * 0.38 + dy / dd * w * 0.2); ctx.stroke();
  }
}

// ---------- önbellekli katmanlar ----------
function skyCv() {
  const w = 1500, h = 2600;
  return L.hcache('sky', w, h, 1, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, ['#2E3A70', '#3F4D88', '#56679F', '#7A88B8', '#A3A9CB', '#C9C4D6', '#E3D6D2'],
      { seed: 1131, stops: [0, 0.22, 0.38, 0.52, 0.64, 0.76, 1], wMin: 24, wMax: 46, lMin: 100, lMax: 300, mixJitter: 0.05 });
  });
}
const CLOUDS = [
  { x: 150, y: 210, s: 140, seed: 1141 }, { x: 690, y: 70, s: 105, seed: 1142 }, { x: 1250, y: 300, s: 150, seed: 1143 },
  { x: 1720, y: 130, s: 120, seed: 1145 }, { x: -300, y: 400, s: 120, seed: 1146 }, { x: 980, y: 460, s: 70, seed: 1147 },
];
function cloudCv(c) {
  const w = c.s * 2.6, h = c.s * 1.5;
  return L.hcache('cl' + c.seed, w, h, 1, (x) => {
    L.cloud2(x, w / 2, h * 0.72, c.s, c.seed, { base: '#BDBCD4', dark: '#8584AA', light: '#DCDAEA', lightAng: LA, curl: '#E2E0EE', curlA: 0.55, rimW: 5 });
  });
}
// uzak dağlar (ref ekran koordinatları): sağda zirveli büyük dağ, önünde alçak sırtlar
const MT = { x0: -500, y0: -100, w: 2500, h: 1500 };
const SUMMIT = [820, 300];
const MT_CTRL = [[-500, 1010], [-100, 980], [200, 930], [400, 790], [540, 650], [640, 560], [700, 470], [760, 390], [820, 300], [872, 352], [920, 336], [1000, 430], [1110, 560], [1250, 690], [1420, 810], [1700, 900], [2000, 960]];
// zirveye zikzak yol (ref ekran koordinatları)
function zigzag() {
  const pts = [[1190, 990]];
  const n = 10;
  for (let i = 1; i <= n; i++) {
    const v = i / n;
    const y = lerp(990, SUMMIT[1] + 12, Math.pow(v, 0.9));
    const cx = lerp(1010, SUMMIT[0] + 6, v), half = lerp(190, 14, Math.pow(v, 0.85));
    pts.push([cx + (i % 2 ? -1 : 1) * half, y]);
  }
  return pts;
}
// köşeleri yuvarlat (Chaikin) → dönemeçli patika; birikimli uzunluk
function chaikin(pts, it) { let a = pts; for (let k = 0; k < it; k++) { const b = [a[0]]; for (let i = 0; i < a.length - 1; i++) { const p = a[i], q = a[i + 1]; b.push([lerp(p[0], q[0], 0.25), lerp(p[1], q[1], 0.25)], [lerp(p[0], q[0], 0.75), lerp(p[1], q[1], 0.75)]); } b.push(a[a.length - 1]); a = b; } return a; }
const ZZ = chaikin(zigzag(), 2);
const ZZL = (() => { const c = [0]; for (let i = 1; i < ZZ.length; i++) c.push(c[i - 1] + Math.hypot(ZZ[i][0] - ZZ[i - 1][0], ZZ[i][1] - ZZ[i - 1][1])); return c; })();
function zzPartial(len) {
  const out = [ZZ[0]];
  for (let i = 1; i < ZZ.length; i++) {
    if (ZZL[i] <= len) { out.push(ZZ[i]); continue; }
    const k = (len - ZZL[i - 1]) / (ZZL[i] - ZZL[i - 1]);
    out.push([lerp(ZZ[i - 1][0], ZZ[i][0], k), lerp(ZZ[i - 1][1], ZZ[i][1], k)]);
    break;
  }
  return out;
}
function farCv() {
  return L.hcache('far', MT.w, MT.h, 1, (x) => {
    x.translate(-MT.x0, -MT.y0);
    const r = rng(1151);
    const ridge = (fn, cols, seed, rimA = 0.5) => {
      const top = []; for (let i = 0; i <= 100; i++) { const X = MT.x0 + MT.w * i / 100; top.push([X, fn(X)]); }
      const poly = top.concat([[MT.x0 + MT.w, MT.y0 + MT.h], [MT.x0, MT.y0 + MT.h]]);
      x.save(); x.strokeStyle = rgba(P.UNDERPAINT, rimA); x.lineWidth = 5; x.setLineDash([90, 120, 40, 160]); x.stroke(P.pathOf(top, false)); x.restore();
      x.save(); x.clip(P.pathOf(poly)); x.fillStyle = cols[0]; x.fillRect(MT.x0, MT.y0, MT.w, MT.h); x.restore();
      const y0 = P.bbox(top).y0;
      P.bandFill(x, poly, { x0: MT.x0, y0, x1: MT.x0 + MT.w, y1: MT.y0 + MT.h, w: MT.w, h: MT.y0 + MT.h - y0 }, [cols[1], cols[0], cols[2]], { seed, wMin: 14, wMax: 26, lMin: 60, lMax: 200, stops: [0, 0.18, 1], angle: 0.02 });
      for (let i = 0; i < 26; i++) { const k = r.int(1, 97), p0 = top[k], p1 = top[k + 2]; P.stroke(x, p0[0], p0[1] + 6, p1[0], p1[1] + 6, r.range(6, 10), shade(cols[1], 0.05), r.int(1, 1e9), { detail: 0.4 }); }
      return top;
    };
    // en uzak sırt (soluk leylak)
    ridge((X) => 830 - 60 * Math.sin(X * 0.0045 + 0.4) - 26 * Math.sin(X * 0.012 + 2), ['#A6A5CB', '#BDBBD9', '#9496C2'], 1152, 0.3);
    // zirveli dağ
    const mp = P.smoothPts(MT_CTRL, false, 8);
    const poly = mp.concat([[MT.x0 + MT.w, MT.y0 + MT.h], [MT.x0, MT.y0 + MT.h]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.5); x.lineWidth = 5; x.setLineDash([110, 80, 40, 130]); x.translate(1, -2); x.stroke(P.pathOf(mp, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly));
    x.fillStyle = '#7F83B6'; x.fillRect(MT.x0, MT.y0, MT.w, MT.h);
    P.bandFill(x, null, { x0: MT.x0, y0: SUMMIT[1] - 20, x1: MT.x0 + MT.w, y1: 1200, w: MT.w, h: 1220 - SUMMIT[1] }, ['#9A9CC8', '#8487BA', '#7478AE', '#6C71A6'], { seed: 1153, wMin: 14, wMax: 26, lMin: 60, lMax: 200, stops: [0, 0.3, 0.65, 1], angle: 0.02 });
    // gölge yamacı: zirveden aşağı kırık bir sırt çizgisinin sağı
    const crest = [[SUMMIT[0], SUMMIT[1]], [848, 410], [826, 520], [880, 640], [862, 760], [930, 880], [905, 1010]];
    const shadow = P.smoothPts(crest, false, 6).concat([[1900, 1010], [1900, 200], [SUMMIT[0] + 30, 200]]);
    x.save(); x.clip(P.pathOf(shadow));
    P.fillStrokes(x, null, P.bbox(shadow), { seed: 1154, angle: 0.75, wMin: 12, wMax: 24, lMin: 50, lMax: 150, colorFn: (X, Y, rr) => shade(rr.chance(0.62) ? '#5C6198' : '#666BA2', rr.range(-0.02, 0.02)) });
    x.restore();
    // sırt çizgisi boyunca ışıklı kenar darbeleri ve sol yamaçta ışık
    const cl = P.smoothPts(crest, false, 6);
    x.save(); x.globalAlpha = 0.7; for (let i = 0; i < cl.length - 3; i += 3) P.stroke(x, cl[i][0] - 5, cl[i][1], cl[i + 3][0] - 5, cl[i + 3][1], r.range(4, 6), '#A6A8D0', r.int(1, 1e9), { detail: 0.3 }); x.restore();
    for (let i = 0; i < 22; i++) {
      const v = r.range(0.08, 0.8), Y = SUMMIT[1] + v * 640, X = SUMMIT[0] - v * r.range(150, 430);
      P.stroke(x, X - 34, Y - 16, X + 34, Y + 16, r.range(6, 11), r.chance(0.5) ? '#A9ABD2' : '#9C9FCB', r.int(1, 1e9), { detail: 0.4 });
    }
    // kar yok; zirvede soluk ışık darbeleri
    for (let i = 0; i < 6; i++) { const X = SUMMIT[0] + r.range(-40, 10), Y = SUMMIT[1] + r.range(10, 70); P.stroke(x, X - 18, Y - 10, X + 18, Y + 8, r.range(5, 8), '#C4C4E0', r.int(1, 1e9), { detail: 0.3 }); }
    x.restore();
    // dağ eteğinde sis bandı
    for (let i = 0; i < 40; i++) {
      const X = r.range(MT.x0, MT.x0 + MT.w), Y = r.range(900, 980);
      x.save(); x.globalAlpha = 0.55; P.stroke(x, X - r.range(60, 160), Y, X + r.range(60, 160), Y + r.range(-4, 4), r.range(12, 22), r.chance(0.5) ? '#C9C6DE' : '#B9B8D6', r.int(1, 1e9), { detail: 0.3 }); x.restore();
    }
    // ön sırt (dağın eteği, mavi-yeşil)
    ridge((X) => 1030 - 40 * Math.sin(X * 0.005 + 1.2) - 18 * Math.sin(X * 0.013), ['#6E8AA6', '#88A2BA', '#5A7498'], 1155, 0.4);
  });
}
// orta tepeler (ref ekran koordinatları), paralaks 0.6
const MH = { x0: -700, y0: 700, w: 2900, h: 1300 };
function midCv() {
  return L.hcache('mid', MH.w, MH.h, 1, (x) => {
    x.translate(-MH.x0, -MH.y0);
    const r = rng(1161);
    const top = []; for (let i = 0; i <= 120; i++) { const X = MH.x0 + MH.w * i / 120; top.push([X, 1080 - 50 * Math.sin(X * 0.0032 + 2.2) - 22 * Math.sin(X * 0.009 + 0.5) + 0.06 * (X - 400)]); }
    const poly = top.concat([[MH.x0 + MH.w, MH.y0 + MH.h], [MH.x0, MH.y0 + MH.h]]);
    x.save(); x.strokeStyle = rgba(P.UNDERPAINT, 0.6); x.lineWidth = 6; x.setLineDash([110, 70, 40, 130]); x.translate(1, -2); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#5B8C7E'; x.fillRect(MH.x0, MH.y0, MH.w, MH.h); x.restore();
    P.bandFill(x, P.pathOf(poly), { x0: MH.x0, y0: 960, x1: MH.x0 + MH.w, y1: MH.y0 + MH.h, w: MH.w, h: MH.y0 + MH.h - 960 }, ['#86AE8E', '#5F9182', '#4B7C72', '#3F6A66'], { seed: 1162, wMin: 16, wMax: 30, lMin: 70, lMax: 220, stops: [0, 0.15, 0.45, 1], angle: 0.02 });
    for (let i = 0; i < 30; i++) { const k = r.int(1, 117), p0 = top[k], p1 = top[k + 2]; P.stroke(x, p0[0], p0[1] + 7, p1[0], p1[1] + 7, r.range(7, 11), '#9CC09A', r.int(1, 1e9), { detail: 0.4 }); }
    // rüzgârda eğilmiş tek ağaç ve birkaç servi
    for (const [X, s, seed] of [[160, 120, 1163], [1320, 90, 1164]]) {
      const Y = 1080 - 50 * Math.sin(X * 0.0032 + 2.2) - 22 * Math.sin(X * 0.009 + 0.5) + 0.06 * (X - 400) + 8;
      R.cypress(x, X, Y, s, seed, { base: '#3E6B5A', dark: '#26473F', light: '#6C9A7A' });
    }
  });
}
// yakın yamaç (dünya koordinatları): toprak yol + çimenli yamaç
const NR = { x0: 150, x1: 2900, y1: 2500 };
function nearCv() {
  const yTop = groundY(NR.x1) - 60, w = NR.x1 - NR.x0, h = NR.y1 - yTop;
  const cv = L.hcache('near', w, h, 1, (x) => {
    x.translate(-NR.x0, -yTop);
    const r = rng(1171);
    const line = (off, n = 80) => { const out = []; for (let i = 0; i <= n; i++) { const X = NR.x0 + w * i / n; out.push([X, groundY(X) + off + 3 * Math.sin(X * 0.03) + 2 * Math.sin(X * 0.071)]); } return out; };
    const sil = line(-16);
    // çimenli yamaç gövdesi
    const body = sil.concat([[NR.x1, NR.y1], [NR.x0, NR.y1]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([120, 60, 40, 90]); x.translate(0, -3); x.stroke(P.pathOf(sil, false)); x.restore();
    x.save(); x.clip(P.pathOf(body)); x.fillStyle = '#4E7E4C'; x.fillRect(NR.x0, yTop, w, h); x.restore();
    // eğime paralel bantlar: üstte açık zeytin, aşağı doğru koyulaşan yeşil
    const bandCols = ['#86A25E', '#6A8C52', '#557A4C', '#46694A', '#3A5A47', '#304D43'];
    x.save(); x.clip(P.pathOf(body));
    P.fillStrokes(x, null, { x0: NR.x0, y0: yTop, x1: NR.x1, y1: NR.y1, w, h }, {
      seed: 1172, angle: -TH * 0.85, wMin: 18, wMax: 34, lMin: 80, lMax: 240,
      colorFn: (X, Y, rr) => { const dep = (Y - groundY(X)) / 900 + rr.range(-0.06, 0.06); const i = clamp(Math.floor(dep * (bandCols.length - 1) + 0.5), 0, bandCols.length - 1); return shade(bandCols[i], rr.range(-0.03, 0.03), rr.range(-0.03, 0.03)); },
    });
    x.restore();
    // toprak yol bandı (sırtın hemen altında; ayak çizgisi bandın ortasında)
    const pTop = line(-15), pBot = line(34);
    const pathPoly = pTop.concat(pBot.slice().reverse());
    x.save(); x.clip(P.pathOf(pathPoly));
    x.fillStyle = '#B07E50'; x.fillRect(NR.x0, yTop, w, h);
    P.fillStrokes(x, null, P.bbox(pathPoly), { seed: 1173, angle: -TH, wMin: 8, wMax: 16, lMin: 40, lMax: 140, colorFn: (X, Y, rr) => { const dep = (Y - groundY(X) + 15) / 49; return rr.chance(0.25) ? '#D2A46C' : dep < 0.35 ? shade('#C08D58', rr.range(-0.03, 0.03)) : dep < 0.75 ? shade('#A97848', rr.range(-0.03, 0.03)) : shade('#8C6040', rr.range(-0.03, 0.03)); } });
    x.restore();
    // yolun alt kenarına çimen sarkması
    for (let i = 0; i < 160; i++) {
      const X = NR.x0 + r.range(0, w), Y = groundY(X) + 32 + r.range(-3, 4);
      const hh = r.range(10, 22), lean = r.range(-0.5, 0.2);
      P.stroke(x, X, Y + 4, X + Math.sin(lean) * hh, Y - hh * 0.4, r.range(4, 7), r.chance(0.5) ? '#7DA556' : '#5F8E4C', r.int(1, 1e9), { detail: 0.3, taper1: 0.35 });
    }
    // yol üstünde taşlar/çakıllar
    for (let i = 0; i < 120; i++) {
      const X = NR.x0 + r.range(0, w), Y = groundY(X) + r.range(-8, 28);
      const s = r.range(3, 8);
      x.fillStyle = r.chance(0.5) ? '#8A7C8E' : '#A59AA6'; x.beginPath(); x.ellipse(X, Y, s * 1.4, s, -TH, 0, TAU); x.fill();
      x.fillStyle = rgba('#E6D8C8', 0.6); x.beginPath(); x.ellipse(X - s * 0.3, Y - s * 0.35, s * 0.6, s * 0.35, -TH, 0, TAU); x.fill();
    }
    // sırt çizgisinde (yolun arkasında) kuru otlar
    for (let i = 0; i < 90; i++) {
      const X = NR.x0 + r.range(0, w), Y = groundY(X) - 14;
      R.grass(x, X, Y + 4, r.range(14, 26), r.int(1, 1e6), { n: 4, c1: '#7E9A4E', c2: '#A9B864', wind: -0.25 });
    }
    // yamaçta kayalar
    for (let i = 0; i < 14; i++) {
      const X = NR.x0 + r.range(0, w), Y = groundY(X) + r.range(140, 900), s = r.range(22, 48);
      const pts = P.blobPts(X, Y, s, s * 0.62, r.int(1, 999), 0.18, 22);
      P.toneShape(x, pts, { base: '#8C88A6', dark: '#5C5880', light: '#B5B1C8', lightAng: LA, seed: r.int(1, 1e6), shadowW: 0.22, lightW: 0.14, dabs: 3, highlights: 1, rimW: 3, texture: 0.4 });
    }
    // yamaçta soluk kır çiçekleri (rüzgârda eğik, sakin)
    for (let i = 0; i < 90; i++) {
      const X = NR.x0 + r.range(0, w), Y = groundY(X) + r.range(60, 1300);
      const c = r.pick(['#C9C3E2', '#E8E0D0', '#B8A6D8', '#E2D49A']);
      const sz = r.range(2.6, 4.2);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; x.fillStyle = c; x.beginPath(); x.ellipse(X + Math.cos(a) * sz, Y + Math.sin(a) * sz * 0.6, sz, sz * 0.62, a, 0, TAU); x.fill(); }
      x.fillStyle = '#D9A93A'; x.beginPath(); x.arc(X, Y, sz * 0.45, 0, TAU); x.fill();
    }
    // yamaçta ot öbekleri
    for (let i = 0; i < 60; i++) {
      const X = NR.x0 + r.range(0, w), Y = groundY(X) + r.range(80, 1100);
      R.grass(x, X, Y, r.range(18, 34), r.int(1, 1e6), { n: 5, c1: '#2F5A3E', c2: '#6E9A52', wind: -0.15 });
    }
  });
  return { cv, x: NR.x0, y: yTop, w, h };
}

// ---------- dinamik ayrıntılar ----------
// tökezlemede ayak altından yokuş aşağı yuvarlanan çakıllar
const PEB = (() => { const r = rng(1181); const out = []; for (let i = 0; i < 6; i++) out.push({ v: r.range(160, 340), sz: r.range(8, 14), ph: r.range(0, TAU), delay: r.range(0, 0.12), bounce: r.range(0.5, 1) }); return out; })();
function pebbles(ctx, t, s0) {
  for (const pb of PEB) {
    const tt = t - 37.08 - pb.delay;
    if (tt <= 0 || tt > 1.6) continue;
    const s = s0 - pb.v * tt + 0.5 * 60 * tt * tt * 0; // yokuş aşağı
    const g = ground(s);
    const hop = Math.abs(Math.sin(tt * 9 * pb.bounce + pb.ph)) * 14 * Math.exp(-tt * 2.5) * pb.bounce;
    const a = clamp((1.6 - tt) / 0.4);
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(g[0], g[1] - pb.sz * 0.6 - hop); ctx.rotate(-tt * 12);
    ctx.fillStyle = '#8E8096'; ctx.beginPath(); ctx.ellipse(0, 0, pb.sz * 1.3, pb.sz, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#E6D8C8', 0.7); ctx.beginPath(); ctx.ellipse(-pb.sz * 0.3, -pb.sz * 0.35, pb.sz * 0.55, pb.sz * 0.32, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function dust(ctx, t, x, y, t0) {
  const tt = t - t0; if (tt < 0 || tt > 0.9) return;
  const r = rng(1191);
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + r.range(-0.9, 0.6), sp = r.range(60, 160);
    const px = x + Math.cos(a) * sp * E.outCubic(tt / 0.9), py = y - 6 + Math.sin(a) * sp * 0.25 * E.outCubic(tt / 0.9) - tt * 14;
    const rr = r.range(10, 18) * (0.6 + tt);
    ctx.fillStyle = rgba(r.chance(0.5) ? '#E2C59C' : '#CDAA80', 0.55 * (1 - tt / 0.9));
    ctx.beginPath(); ctx.ellipse(px, py, rr * 1.4, rr, 0, 0, TAU); ctx.fill();
  }
}
// rüzgârla uçuşan yapraklar (ekran uzayı)
function windLeaves(ctx, t) {
  const r = rng(1201);
  for (let i = 0; i < 7; i++) {
    const sp = r.range(260, 420), ph = r.next(), y0 = r.range(250, 1250), size = r.range(9, 15);
    const k = ((t * sp) / 1500 + ph) % 1;
    const x = 1180 - k * 1400;
    const y = y0 + Math.sin(t * 2.3 + i) * 40 + k * 120;
    const ang = t * r.range(3, 6) + i;
    const col = r.pick([{ base: '#C9A24E', dark: '#8A5E2E', light: '#E8C878' }, { base: '#9AAE52', dark: '#5E7A3A', light: '#C2D27A' }, { base: '#B87444', dark: '#7A4426', light: '#DDA06A' }]);
    const pts = P.smoothPts([[0, 0], [size * 0.5, -size * 0.32], [size, 0], [size * 0.5, size * 0.32]], true, 4);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(1, Math.abs(Math.sin(t * 4 + i)) * 0.7 + 0.3);
    L.shadePath(ctx, P.pathOf(pts), col.base, col.dark, col.light, LA, size * 0.12, size * 0.06);
    ctx.restore();
  }
}
// ön plan otları (rüzgârda salınan), paralaks 1.2
function foreTufts(ctx, t) {
  const r = rng(1211);
  for (let i = 0; i < 10; i++) {
    const s = r.range(800, 2000), off = r.range(140, 520);
    const g = ground(s);
    const X = g[0] - off * TN * 0.2, Y = g[1] + off;
    const sz = r.range(36, 60);
    const wind = -0.28 + Math.sin(t * 2.6 + i * 1.7) * 0.12;
    R.grass(ctx, X, Y, sz, 1300 + i, { n: 6, c1: '#2B5038', c2: '#5E8A4A', wind });
  }
}
// ter damlası
function sweatDrop(ctx, x, y, s, rot, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.rotate(rot);
  const pts = P.smoothPts([[0, -s * 1.3], [s * 0.62, -s * 0.1], [s * 0.5, s * 0.55], [0, s * 0.8], [-s * 0.5, s * 0.55], [-s * 0.62, -s * 0.1]], true, 5);
  L.shadePath(ctx, P.pathOf(pts), '#BFE4F4', '#6FA8D8', '#FFFFFF', LA, s * 0.3, s * 0.18);
  ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(-s * 0.18, -s * 0.05, s * 0.14, s * 0.24, 0.3, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------- çizim ----------
module.exports = {
  draw(ctx, t) {
    const cam = camAt(t);
    const st = manState(t);
    const sad = E.inOutSine(seg(t, 36.2, 36.8));
    // gök (neredeyse ekrana sabit)
    farLayer(ctx, cam, 0.06, (x) => { x.drawImage(skyCv(), -210, -340, 1500, 2600); });
    // sürüklenen bulutlar (rüzgâr sola)
    farLayer(ctx, cam, 0.14, (x) => {
      for (const c of CLOUDS) {
        const cv = cloudCv(c), w = c.s * 2.6, h = c.s * 1.5;
        let X = c.x - (t - 35) * (18 + c.s * 0.08);
        x.drawImage(cv, X - w / 2, c.y - h * 0.72, w, h);
      }
    });
    // uzak dağ + zikzak yol (37.85–38.75 yol yukarı doğru "uzar")
    farLayer(ctx, cam, 0.3, (x) => {
      x.drawImage(farCv(), MT.x0, MT.y0, MT.w, MT.h);
      const prog = lerp(0.4, 1, E.inOutSine(seg(t, 37.9, 38.75)));
      const tot = ZZL[ZZL.length - 1];
      const line = zzPartial(prog * tot);
      if (line.length > 1) {
        P.curveStroke(x, line.map(([a, b]) => [a, b + 2]), () => 7, rgba('#464A80', 0.4), 1220, { bristles: 0, detail: 0 });
        P.curveStroke(x, line, () => 4.2, rgba('#EAD2A2', 0.9), 1240, { bristles: 0, detail: 0 });
        const e = line[line.length - 1];
        if (prog < 0.999 && t > 37.9) R.sparkle(x, e[0], e[1] - 2, 10, 0.9, '#FFF1C8');
      }
    });
    // orta tepeler
    farLayer(ctx, cam, 0.6, (x) => { x.drawImage(midCv(), MH.x0, MH.y0, MH.w, MH.h); });
    // dünya katmanı
    ctx.save();
    R.camera(ctx, cam);
    const N = nearCv();
    ctx.drawImage(N.cv, N.x, N.y, N.w, N.h);
    // adamın gölgesi (yumuşak, soğuk)
    const rt = st.root;
    ctx.save(); ctx.translate(rt[0], rt[1] + 4); ctx.rotate(-TH);
    const sg = ctx.createRadialGradient(0, 0, 10, 0, 0, 170); sg.addColorStop(0, rgba('#3A2E5A', 0.38)); sg.addColorStop(1, rgba('#3A2E5A', 0));
    ctx.fillStyle = sg; ctx.scale(1, 0.16); ctx.beginPath(); ctx.arc(0, 0, 170, 0, TAU); ctx.fill();
    ctx.restore();
    // tökezleme: çakıllar ve toz (yakın ayağın bastığı yerde)
    const landS = (D0 + 2 * S * 2.3) * HM;
    // adam + çuval + ip
    const p = st.p;
    M.drawMan(ctx, p, {
      x: rt[0], y: rt[1], h: HM, dir: 1, light: LA,
      mid: (c, s, h) => {
        const F = sackFrame(s, h, p, t, st);
        drawSack(c, F);
        // ip: çuval ağzından yakın omzun üstünden ele
        const neck = sackPt(F, SACK.N);
        const fw = [Math.cos(p.torso), Math.sin(p.torso)], up = s.td;
        const sh = s.armN.shoulder;
        const top = [sh[0] + up[0] * 0.03 * h - fw[0] * 0.012 * h, sh[1] + up[1] * 0.03 * h - fw[1] * 0.012 * h];
        const front = [sh[0] + fw[0] * 0.05 * h + up[0] * 0.005 * h, sh[1] + fw[1] * 0.05 * h + up[1] * 0.005 * h];
        // ipin el ucu: el ipte değilse (silme/savrulma) ip göğse sarkar
        const A = s.armN, hand = [lerp(A.wrist[0], A.tip[0], 0.45), lerp(A.wrist[1], A.tip[1], 0.45)];
        const F2 = s.armF, handF = [lerp(F2.wrist[0], F2.tip[0], 0.45), lerp(F2.wrist[1], F2.tip[1], 0.45)];
        const off = Math.max(st.fling, st.brow);
        const end = [lerp(hand[0], handF[0], off), lerp(hand[1], handF[1], off)];
        const mid1 = [lerp(neck[0], top[0], 0.55), lerp(neck[1], top[1], 0.55) - 0.012 * h];
        rope(c, [neck, mid1, top, front, end], 0.02 * h, 1251);
      },
      front: (c, s, h) => {
        // alında ter damlası: duruşta belirir, silinince kaybolur
        const hc = s.headC, ha = s.ha, hu = M.L.head * h;
        const loc = (x, y) => [hc[0] + (x * Math.cos(ha) - y * Math.sin(ha)) * hu, hc[1] + (x * Math.sin(ha) + y * Math.cos(ha)) * hu];
        const a1 = C.pop(t, 37.16, 0.3) * (1 - seg(t, 37.36, 37.43));
        const q = loc(0.5, -0.5);
        sweatDrop(c, q[0], q[1] + 5 * seg(t, 37.18, 37.42), 0.026 * h * clamp(a1), 0.35, clamp(a1));
        // silme bitince elden savrulan damlalar
        const tt = t - 37.74;
        if (tt > 0 && tt < 0.6) {
          const A = s.armN, base = [A.tip[0], A.tip[1]];
          for (let i = 0; i < 3; i++) {
            const vx = (0.5 + i * 0.25) * h, vy = (-0.5 + i * 0.18) * h;
            const px = base[0] + vx * tt * 0.9, py = base[1] + vy * tt + 0.5 * 2.4 * h * tt * tt;
            sweatDrop(c, px, py, 0.016 * h * (1 - i * 0.2), Math.atan2(vy + 2.4 * h * tt, vx) + Math.PI / 2, 1 - tt / 0.6);
          }
        }
      },
    });
    // tökezleme: yakın ayağın burnundan toz ve yokuş aşağı yuvarlanan çakıllar (adamın önünde)
    pebbles(ctx, t, landS + 0.1 * HM);
    { const g = ground(landS + 0.12 * HM); dust(ctx, t, g[0], g[1], 37.05); }
    // yağmur bulutu: "kederli"de belirir, adamı gecikmeyle izler
    const kc = C.pop(t, 36.2, 0.5, 1.8);
    if (kc > 0.001) {
      const lagU = uAt(t - 0.3);
      const rl = rootAt(lagU);
      const cx = rl[0] + 30 + Math.sin(t * 1.3) * 8, cy = rl[1] - HM * 1.2 + Math.sin(t * 1.9) * 6;
      const rainA = clamp((t - 36.3) / 0.3);
      if (rainA > 0) L.rain(ctx, cx - 85, cx + 75, cy + 20, rt[1] - 10, t, 26, 1261, { speed: 760, len: 30, ang: -0.14, color: '#D6E2F4', alpha: 0.9 * rainA, w: 1.3 });
      ctx.save(); ctx.translate(cx, cy); ctx.scale(kc, kc); ctx.translate(-cx, -cy);
      L.cloud2(ctx, cx, cy, 98, 31, { base: '#6F7198', dark: '#44466C', light: '#9C9EBE', lightAng: LA, curl: '#B4B5D0', curlA: 0.5 });
      ctx.restore();
    }
    ctx.restore();
    // ön plan otları (dünya katmanından biraz hızlı)
    ctx.save();
    R.camera(ctx, { zoom: lerp(1, cam.zoom, 1.1), cx: REF.cx + (cam.cx - REF.cx) * 1.2, cy: REF.cy + (cam.cy - REF.cy) * 1.2 });
    foreTufts(ctx, t);
    ctx.restore();
    windLeaves(ctx, t);
    // "kederli": sahne soğur, ışık biraz çekilir
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = rgba('#9AA0C8', 0.10 + 0.16 * sad); ctx.fillRect(0, 0, C.W, C.H);
    ctx.restore();
  },
  sfx: [
    { t: 35.6, type: 'wind', gain: 0.3 },
    { t: 36.22, type: 'water', gain: 0.18 },
    { t: 37.06, type: 'thud', gain: 0.35 },
    { t: 37.1, type: 'sand', gain: 0.22 },
    { t: 37.9, type: 'whoosh', gain: 0.2 },
  ],
};
