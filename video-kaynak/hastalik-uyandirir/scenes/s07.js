// S07 — "ve cihazatça en zengini" (22.10–24.30)
// İnfografik: adamın yandan büst planı; avucunu açmış eline bakar. 22.40 "cihazatça": başının çevresinde yarım halka
// hâlinde sırayla (soldan sağa) madalyon simgeler POP eder, ince altın çizgilerle bedendeki yerine bağlanır:
// kalp, kulak, akıl (kandil), göz, koku (gül), tat (bal damlası), el. 23.10 "en zengini": simgeler parlar, halka hafifçe
// döner, çizgiler boyunca ışık zerreleri adama akar, altın parıltılar; adam başını kaldırıp hafifçe gülümser.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s05_lib');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

const MAN = { x: 467, y: 1873, h: 1420 };
const LA = -2.3;
const SS = 1.5;
const RING = { r: 370, a0: d(172), a1: d(391) };
const MR = 64; // madalyon yarıçapı
const POP0 = 22.34, POPDT = 0.12;
const RICH = 23.08;
const SKIN = { base: '#E0A27A', dark: '#B46B55', light: '#F5C9A2' };

// ---------- pozlar ----------
const LOOKHAND = M.pose({ torso: d(2), neck: d(6), head: d(15), armN: d(24), elbowN: d(76), handN: d(-20), armF: d(-6), elbowF: d(12), handF: d(5), eye: 0.85, mouth: 0.14, brow: -0.35 });
const PROUD = M.pose({ torso: d(-1), neck: d(3), head: d(-5), armN: d(26), elbowN: d(74), handN: d(-26), armF: d(-6), elbowF: d(12), handF: d(5), eye: 1, mouth: 0.4, brow: -0.3 });
function poseAt(t) {
  const k = E.inOutCubic(seg(t, RICH - 0.02, RICH + 0.5));
  const p = M.lerpPose(LOOKHAND, PROUD, k);
  const br = Math.sin(t * 2.2);
  p.torso += d(0.5) * br; p.py += 0.0012 * br;
  p.head += d(0.6) * Math.sin(t * 1.3);
  return p;
}

// ---------- arka plan ----------
function bgCv() {
  const w = C.W + 160, h = C.H + 160;
  return L.hcache('s07bg', w, h, 1, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, ['#121A4C', '#18286A', '#1F3A7E', '#1D3A74', '#172C5E', '#101C44'], { seed: 171, wMin: 24, wMax: 46, lMin: 100, lMax: 300, stops: [0, 0.15, 0.35, 0.55, 0.78, 1], mixJitter: 0.1 });
    // arkada yumuşak, büyük ışık lekesi (sol üstten gelen ışık; başın arkasında hale yok)
    const r = rng(172);
    for (let i = 0; i < 70; i++) {
      const a = r.range(0, TAU), rr = Math.sqrt(r.next()) * 520;
      const cx = 380 + 80 + Math.cos(a) * rr * 1.1, cy = 900 + 80 + Math.sin(a) * rr;
      const k = 1 - rr / 520;
      P.stroke(x, cx - 90, cy, cx + 90, cy + r.range(-4, 4), r.range(26, 44), rgba(mix('#2A52A0', '#3E78B8', k), 0.35 + 0.4 * k), r.int(1, 1e9), { detail: 0.6, taper1: 0.7 });
    }
    // çok silik infografik halkaları
    x.strokeStyle = rgba('#8FB0E0', 0.08); x.lineWidth = 2;
    for (const rr of [530, 610]) { x.beginPath(); x.arc(520 + 80, 610 + 80, rr, 0, TAU); x.stroke(); }
  });
}

// ---------- simgeler (madalyon içinde; yerel 0,0 merkez, yarıçap r) ----------
function iconEye(x, r) {
  const w = r * 0.6, hg = r * 0.33;
  const al = P.smoothPts([[-w, 0], [-w * 0.5, -hg], [0, -hg * 1.12], [w * 0.5, -hg], [w, 0], [w * 0.5, hg * 0.85], [0, hg], [-w * 0.5, hg * 0.85]], true, 6);
  P.toneShape(x, al, { base: '#FBF7EE', dark: '#C9C2E0', light: '#FFFFFF', seed: 201, rimW: 2.5, shadowW: 0.16, lightW: 0.05, dabs: 4, texture: 0.45 });
  x.save(); x.clip(P.pathOf(al));
  P.toneShape(x, P.ellipsePts(0, 0, r * 0.27, r * 0.27, 30), { base: '#2E86CE', dark: '#1A3E99', light: '#6FC8E8', seed: 202, rim: false, shadowW: 0.24, lightW: 0.14, dabs: 4, texture: 0.45 });
  x.fillStyle = '#1D1B2E'; x.beginPath(); x.arc(0, 0, r * 0.13, 0, TAU); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.95)'; x.beginPath(); x.arc(-r * 0.08, -r * 0.08, r * 0.06, 0, TAU); x.fill();
  x.restore();
  const lid = []; for (let k = 0; k <= 10; k++) { const u = k / 10 * 2 - 1; lid.push([u * w * 1.02, -hg * 1.08 * (1 - u * u) + (Math.abs(u) > 0.9 ? 2 : 0)]); }
  P.curveStroke(x, lid, (q) => r * 0.07 * Math.sin(Math.PI * clamp(q * 0.9 + 0.05)) ** 0.5, '#3A2A3A', 203, { bristles: 0, detail: 0 });
  for (const [u, a] of [[-0.45, -2.2], [0, -1.6], [0.45, -1.0]]) { const p0 = [u * w, -hg * 1.08 * (1 - u * u)]; x.strokeStyle = '#3A2A3A'; x.lineWidth = r * 0.045; x.lineCap = 'round'; x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p0[0] + Math.cos(a) * r * 0.14, p0[1] + Math.sin(a) * r * 0.14); x.stroke(); }
}
function iconEar(x, r) {
  const pts = P.smoothPts([[-0.06, -0.44], [0.18, -0.46], [0.36, -0.28], [0.36, -0.02], [0.24, 0.16], [0.16, 0.36], [-0.02, 0.46], [-0.18, 0.36], [-0.12, 0.18], [-0.2, -0.02], [-0.24, -0.28]].map(([u, v]) => [u * r, v * r]), true, 6);
  P.toneShape(x, pts, { base: SKIN.base, dark: SKIN.dark, light: SKIN.light, seed: 211, rimW: 3, shadowW: 0.2, lightW: 0.12, dabs: 5, texture: 0.5 });
  const helix = [[-0.06, -0.3], [0.12, -0.33], [0.24, -0.2], [0.23, 0.0], [0.1, 0.12], [0.05, 0.3]].map(([u, v]) => [u * r, v * r]);
  P.curveStroke(x, P.smoothPts(helix, false, 6), (q) => r * 0.085 * (1 - q * 0.5), SKIN.dark, 212, { bristles: 1, detail: 0.3 });
  P.toneShape(x, P.ellipsePts(0.02 * r, -0.04 * r, 0.1 * r, 0.12 * r, 18), { base: '#C27D62', dark: '#9A5A48', light: SKIN.base, seed: 213, rim: false, shadowW: 0.3, dabs: 0, texture: 0.2 });
}
function iconHand(x, r) {
  const cap = (a, b, w1, w2) => M.capsule(a, b, w1, w2);
  const parts = [];
  parts.push(P.roundRectPts(-0.22 * r, -0.08 * r, 0.44 * r, 0.42 * r, 0.13 * r));
  for (const [u, top, k] of [[-0.165, -0.42, 0], [-0.055, -0.5, 1], [0.055, -0.48, 2], [0.16, -0.38, 3]]) parts.push(cap([u * r, -0.02 * r], [(u + (u) * 0.15) * r, top * r], 0.115 * r, 0.1 * r));
  parts.push(cap([-0.17 * r, 0.2 * r], [-0.4 * r, -0.04 * r], 0.13 * r, 0.1 * r));
  L.toneUnion2(x, parts, { base: SKIN.base, dark: SKIN.dark, light: SKIN.light, seed: 221, shadowW: 0.12, lightW: 0.05, dabs: 6, highlights: 3, texture: 0.5, rimW: 3, size: r });
  x.strokeStyle = rgba(SKIN.dark, 0.6); x.lineWidth = r * 0.03; x.lineCap = 'round';
  x.beginPath(); x.moveTo(-0.14 * r, 0.06 * r); x.quadraticCurveTo(0, 0.14 * r, 0.16 * r, 0.04 * r); x.stroke();
  x.beginPath(); x.moveTo(-0.1 * r, 0.2 * r); x.quadraticCurveTo(-0.02 * r, 0.12 * r, 0.04 * r, 0.24 * r); x.stroke();
  P.toneShape(x, P.roundRectPts(-0.24 * r, 0.32 * r, 0.48 * r, 0.16 * r, 0.05 * r), { base: '#EEE6D6', dark: '#A9A1C9', light: '#FFFBF1', seed: 222, rim: false, shadowW: 0.3, dabs: 1, texture: 0.3 });
}
function heartPts(r) {
  const out = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * TAU; const X = 16 * Math.sin(a) ** 3, Y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)); out.push([X * r * 0.027, Y * r * 0.027 + r * 0.02]); }
  return out;
}
function iconHeart(x, r) {
  P.toneShape(x, heartPts(r), { base: '#E03C4E', dark: '#9A1E3A', light: '#FF7A72', seed: 231, rimW: 3, shadowW: 0.2, lightW: 0.12, dabs: 6, highlights: 2, texture: 0.5 });
  const arc = []; for (let k = 0; k <= 6; k++) { const a = lerp(-2.6, -1.7, k / 6); arc.push([-0.2 * r + Math.cos(a) * 0.14 * r, -0.08 * r + Math.sin(a) * 0.14 * r]); }
  P.curveStroke(x, arc, r * 0.06, rgba('#FFE4DC', 0.85), 232, { taper: true, bristles: 0, detail: 0 });
}
function iconLamp(x, r) {
  // kandil: altın gövde, kulp, ayak; alev ayrı (canlı)
  x.strokeStyle = '#9A6512'; x.lineWidth = r * 0.07; x.beginPath(); x.arc(-0.42 * r, 0.04 * r, 0.11 * r, Math.PI * 0.5, Math.PI * 1.6); x.stroke();
  const body = P.smoothPts([[-0.4, 0.1], [-0.36, -0.04], [-0.1, -0.1], [0.18, -0.08], [0.34, -0.12], [0.5, -0.17], [0.53, -0.11], [0.4, 0.04], [0.22, 0.16], [-0.2, 0.18]].map(([u, v]) => [u * r, v * r + 0.1 * r]), true, 6);
  P.toneShape(x, body, { base: '#E8B23A', dark: '#A8701E', light: '#FFE08A', seed: 241, rimW: 3, shadowW: 0.24, lightW: 0.14, dabs: 5, texture: 0.5 });
  P.toneShape(x, P.ellipsePts(-0.02 * r, 0.32 * r, 0.2 * r, 0.06 * r, 20), { base: '#D99A2B', dark: '#A8701E', light: '#FFE08A', seed: 242, rim: false, shadowW: 0.3, dabs: 0 });
  P.toneShape(x, P.ellipsePts(-0.04 * r, -0.02 * r, 0.1 * r, 0.035 * r, 16), { base: '#6A4214', dark: '#3A2408', light: '#8A5A20', seed: 243, rim: false, shadowW: 0.3, dabs: 0 });
}
function lampFlame(ctx, x, y, r, t, k) {
  const fx = x + 0.51 * r, fy = y - 0.1 * r;
  const fl = 1 + 0.08 * Math.sin(t * 13) + 0.05 * Math.sin(t * 21 + 1);
  P.glow(ctx, fx, fy - r * 0.12, r * 0.7, '#FFB84D', 0.5 * k);
  const fp = (s, c) => { const pts = P.smoothPts([[0, -0.36 * s * fl], [0.1 * s, -0.12 * s], [0.08 * s, 0.02 * s], [0, 0.06 * s], [-0.08 * s, 0.02 * s], [-0.1 * s, -0.12 * s]].map(([u, v]) => [fx + u * r + Math.sin(t * 9) * 0.015 * r * (v < 0 ? 1 : 0), fy + v * r]), true, 5); ctx.fillStyle = c; ctx.fill(P.pathOf(pts)); };
  ctx.save(); ctx.globalAlpha = clamp(k);
  fp(1, '#FF9A3A'); fp(0.7, '#FFD34E'); fp(0.38, '#FFF8E0');
  ctx.restore();
}
function iconHoney(x, r) {
  // tek, iri bal damlası: sivri tepe, dolgun yuvarlak dip
  const drop = P.smoothPts([[0, -0.6], [0.09, -0.4], [0.24, -0.16], [0.36, 0.06], [0.38, 0.24], [0.28, 0.42], [0, 0.52], [-0.28, 0.42], [-0.38, 0.24], [-0.36, 0.06], [-0.24, -0.16], [-0.09, -0.4]].map(([u, v]) => [u * r, v * r]), true, 6);
  P.toneShape(x, drop, { base: '#F2A21E', dark: '#B05A16', light: '#FFCF5A', hi: '#FFE49A', seed: 252, rimW: 3, shadowW: 0.24, lightW: 0.14, dabs: 6, highlights: 2, texture: 0.5 });
  // içte sıcak öz ve parlama
  P.toneShape(x, P.ellipsePts(0.06 * r, 0.24 * r, 0.16 * r, 0.12 * r, 20), { base: '#FFC048', dark: '#F2A21E', light: '#FFE08A', seed: 253, rim: false, shadowW: 0.3, dabs: 1, texture: 0.3 });
  const arc = []; for (let k = 0; k <= 7; k++) { const a = lerp(-2.75, -1.75, k / 7); arc.push([-0.02 * r + Math.cos(a) * 0.24 * r, 0.22 * r + Math.sin(a) * 0.3 * r]); }
  P.curveStroke(x, arc, r * 0.07, rgba('#FFF6D8', 0.9), 254, { taper: true, bristles: 1, detail: 0.3 });
  x.fillStyle = rgba('#FFF6D8', 0.9); x.beginPath(); x.arc(-0.2 * r, 0.3 * r, 0.035 * r, 0, TAU); x.fill();
}
function iconRose(x, r) {
  R.leaf(x, -0.06 * r, 0.26 * r, 0.36 * r, 2.4, 261, { base: '#3E9B4F', dark: '#1F6A3E', light: '#8FD14F' });
  R.leaf(x, 0.06 * r, 0.28 * r, 0.34 * r, 0.7, 262, { base: '#3E9B4F', dark: '#1F6A3E', light: '#8FD14F' });
  P.curveStroke(x, [[0, 0.2 * r], [0.02 * r, 0.32 * r], [0.0, 0.46 * r]], r * 0.06, '#2F8A45', 263, { bristles: 0 });
  const head = P.blobPts(0, -0.06 * r, 0.3 * r, 0.27 * r, 264, 0.1, 30);
  P.toneShape(x, head, { base: '#D8324A', dark: '#8E1A3A', light: '#FF6A78', seed: 265, rimW: 3, shadowW: 0.22, lightW: 0.12, dabs: 5, texture: 0.5 });
  // sarmal yapraklar
  for (const [rr, a0, w] of [[0.2, -0.4, 0.06], [0.13, 1.6, 0.05], [0.07, 3.4, 0.045]]) {
    const arc = []; for (let k = 0; k <= 8; k++) { const a = a0 + k * 0.42; arc.push([Math.cos(a) * rr * r, -0.06 * r + Math.sin(a) * rr * r * 0.9]); }
    P.curveStroke(x, arc, w * r, rgba('#7A1430', 0.75), 266 + rr * 100, { taper: true, bristles: 0, detail: 0 });
  }
  const hl = []; for (let k = 0; k <= 6; k++) { const a = lerp(-2.7, -1.8, k / 6); hl.push([Math.cos(a) * 0.22 * r, -0.06 * r + Math.sin(a) * 0.2 * r]); }
  P.curveStroke(x, hl, r * 0.05, rgba('#FFC0C8', 0.8), 269, { taper: true, bristles: 0, detail: 0 });
}

// madalyon: krem disk + altın halka + simge (önbellekli, yüksek çözünürlük)
function medalCv(k, fn) {
  const S = MR * 2 + 24;
  return L.hcache('s07medal' + k, S, S, SS, (x) => {
    x.translate(S / 2, S / 2);
    const r = rng(290 + k);
    x.fillStyle = rgba('#070A24', 0.4); x.beginPath(); x.arc(4, 6, MR, 0, TAU); x.fill();
    // altın çerçeve: düz ton katları (ışık sol üst, gölge sağ alt) + astar kenarı
    P.toneShape(x, P.ellipsePts(0, 0, MR, MR, 48), { base: '#D99A2B', dark: '#9A6418', light: '#FFD870', hi: '#FFE9A8', seed: 280 + k, shadowW: 0.16, lightW: 0.12, dabs: 7, highlights: 3, rimW: 3.5, texture: 0.5, strokeAng: 0.6 });
    // iç disk: krem, kısa fırça darbeleriyle
    const inner = P.blobPts(0, 0, MR * 0.8, MR * 0.8, 300 + k, 0.035, 40);
    P.toneShape(x, inner, { base: '#F6EAD2', dark: '#D8C2A0', light: '#FFFAEC', seed: 310 + k, shadowW: 0.12, lightW: 0.06, dabs: 6, highlights: 2, rim: false, texture: 0.55, strokeAng: -0.4 });
    x.save(); x.clip(P.pathOf(inner));
    for (let i = 0; i < 7; i++) { const a = r.range(0, TAU), rr = r.range(0, MR * 0.6), cx = Math.cos(a) * rr, cy = Math.sin(a) * rr, len = r.range(14, 30), an = r.range(-0.6, -0.2); P.stroke(x, cx - Math.cos(an) * len / 2, cy - Math.sin(an) * len / 2, cx + Math.cos(an) * len / 2, cy + Math.sin(an) * len / 2, r.range(5, 9), rgba(r.chance(0.5) ? '#FFFDF4' : '#E6D2B0', 0.6), r.int(1, 1e9), { detail: 0.5 }); }
    x.restore();
    // çerçeve iç kenarında ince koyu darbe (sağ altta), dış kenarda ışık darbeleri (sol üstte)
    const arcS = (a0, a1, rr, w, c, sd) => { const ln = []; for (let i = 0; i <= 10; i++) { const a = lerp(a0, a1, i / 10); ln.push([Math.cos(a) * rr, Math.sin(a) * rr]); } P.curveStroke(x, ln, w, c, sd, { taper: true, bristles: 2, detail: 0.5 }); };
    arcS(-0.3, 1.9, MR * 0.81, 4, rgba('#7A4A14', 0.7), 320 + k);
    arcS(-2.7, -1.2, MR * 0.9, 5, rgba('#FFF0B8', 0.85), 330 + k);
    fn(x, MR * 0.98);
  });
}
// sıra: halkada soldan sağa
const ICONS = [
  { id: 'ear', fn: iconEar, a: 172 },
  { id: 'mind', fn: iconLamp, a: 210 },
  { id: 'eye', fn: iconEye, a: 248 },
  { id: 'smell', fn: iconRose, a: 286 },
  { id: 'taste', fn: iconHoney, a: 322 },
  { id: 'heart', fn: iconHeart, a: 357 },
  { id: 'hand', fn: iconHand, a: 391 },
];

// bedendeki hedef noktalar (dünya)
function targets(p) {
  const h = MAN.h, s = M.skeleton(p, h), U = M.L.head * h;
  const H = (u, v) => { const c = Math.cos(s.ha), sn = Math.sin(s.ha); return [MAN.x + s.headC[0] + (u * c - v * sn) * U, MAN.y + s.headC[1] + (u * sn + v * c) * U]; };
  const up = s.td, fw = [Math.cos(p.torso), Math.sin(p.torso)];
  const chest = [MAN.x + s.hip[0] + up[0] * 0.3 * h * 0.8 + fw[0] * 0.058 * h, MAN.y + s.hip[1] + up[1] * 0.3 * h * 0.8 + fw[1] * 0.058 * h];
  const a = s.armN;
  const palm = [MAN.x + lerp(a.wrist[0], a.tip[0], 0.45), MAN.y + lerp(a.wrist[1], a.tip[1], 0.45) - 0.012 * h];
  return { heart: chest, ear: H(-0.07, 0.0), mind: H(0.08, -0.32), eye: H(0.5, -0.1), smell: H(0.55, 0.07), taste: H(0.47, 0.25), hand: palm, headC: [MAN.x + s.headC[0], MAN.y + s.headC[1]] };
}

module.exports = {
  draw(ctx, t) {
    const z = lerp(1.0, 1.05, E.inOutSine(seg(t, 22.0, 24.6)));
    const [bx, by] = R.breathe(t, 2.5, 171);
    R.camera(ctx, { zoom: z, cx: 540 + bx, cy: 960 + by });
    ctx.drawImage(bgCv(), -80, -80, C.W + 160, C.H + 160);
    // sol üstten sıcak ışık yıkaması (s06'daki altın ışıkla süreklilik; başın arkasında değil)
    P.glow(ctx, 120, 160, 900, '#FFC27A', 0.16 + 0.06 * E.inOutSine(seg(t, RICH, RICH + 0.6)));
    const p = poseAt(t);
    const T = targets(p);
    const rich = E.inOutSine(seg(t, RICH, RICH + 0.5));
    const spin = d(5) * E.inOutSine(seg(t, RICH, 24.6));
    const hc = [520, 610];
    // halka konumları
    const pos = ICONS.map((ic, i) => { const a = d(ic.a) + spin; return [hc[0] + Math.cos(a) * RING.r, hc[1] + Math.sin(a) * RING.r * 0.98]; });
    const popK = ICONS.map((ic, i) => C.pop(t, POP0 + i * POPDT, 0.42, 2.0));
    // noktalı halka (ilk simgeyle açılır)
    const arcK = E.outCubic(seg(t, POP0 - 0.05, POP0 + POPDT * 6 + 0.25));
    if (arcK > 0) {
      ctx.save(); ctx.strokeStyle = rgba('#F2C65A', 0.5 + 0.2 * rich); ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.setLineDash([1, 15]);
      ctx.beginPath(); ctx.arc(hc[0], hc[1], RING.r, RING.a0 + spin - d(6), RING.a0 + spin - d(6) + (RING.a1 - RING.a0 + d(12)) * arcK); ctx.stroke(); ctx.restore();
    }
    // adam (büst)
    M.drawMan(ctx, p, { x: MAN.x, y: MAN.y, h: MAN.h, dir: 1, light: LA });
    // akıl: alında küçük sıcak ışık
    const mindK = clamp(popK[2]) * (0.6 + 0.4 * rich);
    if (mindK > 0) { P.glow(ctx, T.mind[0], T.mind[1], 70 + 20 * rich, '#FFD27A', 0.45 * mindK); P.glow(ctx, T.mind[0], T.mind[1], 26, '#FFF6D8', 0.6 * mindK); }
    // kalp: göğüste hafif nabız
    const hb = clamp(popK[0]) * (0.5 + 0.5 * Math.max(0, Math.sin(t * 7.5)) ** 4);
    if (hb > 0) P.glow(ctx, T.heart[0], T.heart[1], 70, '#FF6A6A', 0.35 * hb);
    // bağlantı çizgileri (madalyondan hedefe büyür)
    ICONS.forEach((ic, i) => {
      const lk = E.inOutCubic(seg(t, POP0 + i * POPDT + 0.08, POP0 + i * POPDT + 0.36));
      if (lk <= 0) return;
      const a = pos[i], tg = T[ic.id];
      const ringed = false;
      const RR = ringed ? 15 : 0;
      const dx0 = tg[0] - a[0], dy0 = tg[1] - a[1], L00 = Math.hypot(dx0, dy0);
      const b = [tg[0] - dx0 / L00 * RR, tg[1] - dy0 / L00 * RR];
      const dx = b[0] - a[0], dy = b[1] - a[1], L0 = Math.hypot(dx, dy);
      const st = [a[0] + dx / L0 * (MR + 4), a[1] + dy / L0 * (MR + 4)];
      const ctl = [lerp(st[0], b[0], 0.5) - dy * 0.12, lerp(st[1], b[1], 0.5) + dx * 0.12];
      const pts = []; const n = 24; for (let k = 0; k <= n * lk; k++) { const u = k / n; pts.push([(1 - u) * (1 - u) * st[0] + 2 * (1 - u) * u * ctl[0] + u * u * b[0], (1 - u) * (1 - u) * st[1] + 2 * (1 - u) * u * ctl[1] + u * u * b[1]]); }
      if (pts.length < 2) return;
      ctx.save(); ctx.strokeStyle = rgba('#3A2A10', 0.35); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); pts.forEach((q, j) => (j ? ctx.lineTo(q[0] + 1.5, q[1] + 2) : ctx.moveTo(q[0] + 1.5, q[1] + 2))); ctx.stroke();
      ctx.strokeStyle = mix('#F2C65A', '#FFE9A8', rich); ctx.lineWidth = 3.2; ctx.beginPath(); pts.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.restore();
      if (lk >= 1) {
        if (ringed) {
          ctx.strokeStyle = rgba('#3A2A10', 0.35); ctx.lineWidth = 4.5; ctx.beginPath(); ctx.arc(tg[0] + 1.5, tg[1] + 2, RR, 0, TAU); ctx.stroke();
          ctx.strokeStyle = mix('#F2C65A', '#FFE9A8', rich); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(tg[0], tg[1], RR, 0, TAU); ctx.stroke();
        } else {
          P.glow(ctx, b[0], b[1], 22 + 10 * rich, '#FFE08A', 0.6);
          ctx.fillStyle = '#FFF2C0'; ctx.beginPath(); ctx.arc(b[0], b[1], 5.5, 0, TAU); ctx.fill();
          ctx.strokeStyle = '#C8902E'; ctx.lineWidth = 2; ctx.stroke();
        }
        // "en zengini": çizgi boyunca adama akan ışık zerreleri
        if (rich > 0) {
          for (let j = 0; j < 2; j++) {
            const u = ((t - RICH) * 0.9 + j * 0.5 + i * 0.13) % 1;
            const q = pts[Math.min(pts.length - 1, Math.floor(u * (pts.length - 1)))];
            P.glow(ctx, q[0], q[1], 18, '#FFE9A8', 0.7 * rich * Math.sin(u * Math.PI));
            ctx.fillStyle = rgba('#FFFBEA', 0.95 * rich * Math.sin(u * Math.PI)); ctx.beginPath(); ctx.arc(q[0], q[1], 3.5, 0, TAU); ctx.fill();
          }
        }
      }
    });
    // madalyonlar
    ICONS.forEach((ic, i) => {
      const k = popK[i]; if (k <= 0.001) return;
      const [x, y] = pos[i];
      const pulse = 1 + 0.07 * Math.sin(Math.PI * seg(t, RICH + i * 0.06, RICH + i * 0.06 + 0.45));
      const sc = k * pulse;
      if (rich > 0) P.glow(ctx, x, y, MR * 1.9, '#FFD27A', 0.45 * rich * (0.8 + 0.2 * Math.sin(t * 3 + i)));
      const S = MR * 2 + 24, cv = medalCv(i, ic.fn);
      ctx.save(); ctx.translate(x, y); ctx.rotate((1 - Math.min(1, k)) * -0.4); ctx.scale(sc, sc);
      ctx.drawImage(cv, -S / 2, -S / 2, S, S);
      if (ic.id === 'mind') lampFlame(ctx, 0, 0, MR * 1.12, t, 1);
      ctx.restore();
    });
    // parıltılar
    if (rich > 0) {
      R.sparkles(ctx, hc[0], hc[1] - 120, 430, 16, t, 175, { rise: 30, alpha: rich, color: '#FFF0C0', scale: 1.1 });
    }
    // alt bant: büstün altını karart (anlam yazısı okunsun, müze ışığı etkisi)
    ctx.save();
    const g = ctx.createLinearGradient(0, 1120, 0, 1760);
    g.addColorStop(0, 'rgba(10,12,40,0)'); g.addColorStop(0.3, 'rgba(10,12,40,0.42)'); g.addColorStop(0.65, 'rgba(10,12,40,0.78)'); g.addColorStop(1, 'rgba(10,12,40,0.9)');
    ctx.fillStyle = g; ctx.fillRect(-100, 1120, C.W + 200, 1000); ctx.restore();
  },
  sfx: [
    { t: 22.34, type: 'pop', gain: 0.22 },
    { t: 22.7, type: 'tick', gain: 0.16 },
    { t: 23.08, type: 'sparkle', gain: 0.32 },
    { t: 23.28, type: 'chime', gain: 0.26 },
  ],
};
