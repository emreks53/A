// S20 — "Vücuduna ve cesedine der ki:" (83.30–85.70)
// Oda (gece), adam yatakta doğrulmuş oturuyor, yorgan bacaklarında; başı eğik, kendine bakıyor (orta plan).
// 83.86 "Vücuduna": göğsünden yayılarak bütün bedeninin (yorganın altındaki bacakları dahil) çevresinde yumuşak,
// ışıyan bir kontur belirir. 84.48 "cesedine": göğsündeki ateş parıltısı toplanıp sıcak bir köze dönüşür.
// 84.96 "der ki": közden halka halka yumuşak ses dalgaları yayılır, adam başını kaldırıp dinler; kamera köze iter
// (s21'in iç dünyasına hazırlık).
'use strict';
const { createCanvas } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const B = require('./_s19_bed');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng } = C;
const d = C.deg;

const T_VUC = 83.86, T_CES = 84.48, T_DER = 84.96;
const SIT20 = Object.assign({}, B.SIT, { armN: d(0), elbowN: d(80), handN: d(8), armF: d(4), elbowF: d(82), handF: d(10), grip: 0.2 });

function manState(t) {
  const q = Object.assign({ up: 1 }, SIT20);
  // başı eğik, kendi bedenine bakıyor; "der ki" ile başını kaldırıp dinler
  const look = E.inOutCubic(seg(t, T_DER - 0.08, T_DER + 0.45));
  q.head = lerp(d(17), d(2), look);
  q.neck = lerp(d(12), d(6), look);
  q.eye = lerp(0.8, 1, look) - 0.8 * Math.max(0, 1 - Math.abs(t - 84.2) / 0.06); // bir göz kırpma
  q.brow = lerp(0.35, 0.15, look);
  // kontur belirince hafifçe irkilip kollarına bakar
  const notice = E.smooth(seg(t, T_VUC, T_VUC + 0.3)) * (1 - look);
  q.head += d(3) * notice; q.torso += d(1.5) * notice;
  const br = Math.sin(t * 2.4);
  q.torso += d(0.7) * br; q.head -= d(0.5) * br;
  return q;
}

// köz noktası: göğsün önü (kolun önünde kalacak biçimde)
function emberAt(info) {
  const s = info.sh, hp = info.hip;
  const td = [s[0] - hp[0], s[1] - hp[1]], l = Math.hypot(...td), u = [td[0] / l, td[1] / l], nf = [-u[1], u[0]];
  const k = 0.66;
  return [hp[0] + td[0] * k + nf[0] * 0.034 * B.H, hp[1] + td[1] * k + nf[1] * 0.034 * B.H];
}

// ---------------------------------------------------------------- ışıyan kontur (yarım çözünürlükte maske)
const HS = 0.5;
const BAND_TOP = 1280;   // anlam (gloss) bandının üstü (ekran)
let _m1 = null, _m2 = null, _m3 = null;
function masks() {
  if (!_m1) { _m1 = createCanvas(C.W * HS, C.H * HS); _m2 = createCanvas(C.W * HS, C.H * HS); _m3 = createCanvas(C.W * HS, C.H * HS); }
  return [_m1, _m2, _m3];
}
function outline(ctx, t, q, ember, warm, pulse) {
  const k = seg(t, T_VUC - 0.04, T_VUC + 0.55);
  if (k <= 0) return;
  const [m1, m2, m3] = masks();
  const tr = ctx.getTransform();
  // 1) siluet
  const a = m1.getContext('2d');
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-over'; a.clearRect(0, 0, m1.width, m1.height);
  a.setTransform(tr.a * HS, tr.b * HS, tr.c * HS, tr.d * HS, tr.e * HS, tr.f * HS);
  B.manFull(a, q);
  a.setTransform(1, 0, 0, 1, 0, 0); a.globalCompositeOperation = 'source-in'; a.fillStyle = '#fff'; a.fillRect(0, 0, m1.width, m1.height);
  // 2) genişlet − siluet = halka
  const b = m2.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, m2.width, m2.height);
  const rr = 4.2;
  for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU; b.drawImage(m1, Math.cos(an) * rr, Math.sin(an) * rr); }
  b.globalCompositeOperation = 'destination-out'; b.drawImage(m1, 0, 0);
  // 3) renk + göğüsten yayılan açılış
  b.globalCompositeOperation = 'source-in';
  b.fillStyle = mix('#FFF0C8', '#FFB45A', warm); b.fillRect(0, 0, m2.width, m2.height);
  const [ex, ey] = [(tr.a * ember[0] + tr.c * ember[1] + tr.e) * HS, (tr.b * ember[0] + tr.d * ember[1] + tr.f) * HS];
  const rad = E.inOutSine(k) * 600 + 1;
  b.globalCompositeOperation = 'destination-in';
  const g = b.createRadialGradient(ex, ey, 0, ex, ey, rad);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.82, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = g; b.fillRect(0, 0, m2.width, m2.height);
  // anlam bandını sakin tut: ekranda y≈1230'dan aşağısı söner
  const gb = b.createLinearGradient(0, BAND_TOP * HS - 70 * HS, 0, BAND_TOP * HS);
  gb.addColorStop(0, 'rgba(255,255,255,1)'); gb.addColorStop(1, 'rgba(255,255,255,0)');
  b.fillStyle = gb; b.fillRect(0, 0, m2.width, m2.height);
  // 4) bas: yumuşak hale + keskin çizgi
  // yarım çözünürlükte bulanıklaştır (hız)
  const c3 = m3.getContext('2d');
  c3.setTransform(1, 0, 0, 1, 0, 0); c3.globalCompositeOperation = 'source-over'; c3.filter = 'none'; c3.clearRect(0, 0, m3.width, m3.height);
  c3.filter = 'blur(5px)'; c3.drawImage(m2, 0, 0); c3.filter = 'blur(1.5px)'; c3.globalAlpha = 0.9; c3.drawImage(m2, 0, 0); c3.globalAlpha = 1; c3.filter = 'none';
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.95 * pulse; ctx.drawImage(m3, 0, 0, C.W, C.H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.85 * pulse; ctx.drawImage(m2, 0, 0, C.W, C.H);
  ctx.restore();
  // açılış ucunda parıltılar
  if (k < 1) {
    const r = rng(2031);
    for (let i = 0; i < 10; i++) {
      const an = r.range(0, TAU), dd = rad / HS / tr.a * r.range(0.85, 1.0);
      R.sparkle(ctx, ember[0] + Math.cos(an) * dd * 0.6, ember[1] + Math.sin(an) * dd, r.range(5, 10), (1 - k) * 0.9, '#FFF2D0');
    }
  }
}

// ---------------------------------------------------------------- ateş → köz
function emberBeat(t) { const ph = ((t - T_CES) % 0.84 + 0.84) % 0.84; return Math.exp(-ph * 8) + 0.5 * (ph > 0.18 ? Math.exp(-(ph - 0.18) * 10) : 0); }
const EMBER = P.blobPts(0, 0, 1, 0.86, 2041, 0.18, 30);
function ember(ctx, t, at) {
  const [x, y] = at;
  const cond = E.inOutCubic(seg(t, T_CES - 0.12, T_CES + 0.25));
  // ateş parıltısı: geniş, kırmızı, düzensiz titreşim → toplanır
  const fl = 0.75 + 0.15 * Math.sin(t * 5.3) + 0.1 * Math.sin(t * 8.9 + 1);
  P.glow(ctx, x, y, lerp(170, 110, cond), mix('#FF3E2E', '#FF8A3A', cond), lerp(0.42 * fl, 0.38, cond), 'screen');
  if (cond <= 0.01) return;
  const b = emberBeat(t);
  const sc = C.pop(t, T_CES - 0.02, 0.5, 2.2) * (1 + 0.1 * b);
  if (sc <= 0.01) return;
  P.glow(ctx, x, y, 150 + 40 * b, '#FFB04A', (0.45 + 0.25 * b) * cond, 'screen');
  P.glow(ctx, x, y, 70 + 14 * b, '#FFD27A', (0.4 + 0.3 * b) * cond, 'screen');
  const R0 = 18 * sc;
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.35);
  const pts = EMBER.map(([u, v]) => [u * R0, v * R0]);
  const path = P.pathOf(pts);
  // kömür: koyu kızıl kabuk, içi erimiş turuncu-sarı (atışta parlar)
  P.toneShape(ctx, pts, { base: '#C2401E', dark: '#7A1E16', light: '#FF9A3E', lightAng: -2.3, seed: 2042, shadowW: 0.3, lightW: 0.14, dabs: 3, highlights: 1, rimColor: '#FFB04A', rimW: 2, texture: 0.3 });
  ctx.save(); ctx.clip(path);
  const g = ctx.createRadialGradient(-R0 * 0.15, -R0 * 0.1, 0, -R0 * 0.15, -R0 * 0.1, R0 * 0.9);
  g.addColorStop(0, rgba('#FFF6C0', 0.95)); g.addColorStop(0.35, rgba('#FFC64A', 0.9 * (0.75 + 0.25 * b))); g.addColorStop(0.75, rgba('#FF7A2A', 0.5)); g.addColorStop(1, rgba('#FF7A2A', 0));
  ctx.fillStyle = g; ctx.fillRect(-R0 * 1.2, -R0 * 1.2, R0 * 2.4, R0 * 2.4);
  ctx.strokeStyle = rgba('#8E2216', 0.75); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(R0 * 0.25, -R0 * 0.85); ctx.quadraticCurveTo(R0 * 0.45, -R0 * 0.3, R0 * 0.85, -R0 * 0.1); ctx.moveTo(-R0 * 0.9, R0 * 0.35); ctx.quadraticCurveTo(-R0 * 0.4, R0 * 0.45, -R0 * 0.2, R0 * 0.85); ctx.stroke();
  ctx.restore();
  ctx.restore();
  P.glow(ctx, x - 4, y - 4, 40 + 10 * b, '#FFF4C8', 0.5 + 0.3 * b, 'screen');
  // yukarı süzülen kıvılcımlar
  const r = rng(2043);
  for (let i = 0; i < 7; i++) {
    const ph = (t * r.range(0.5, 0.9) + r.next()) % 1;
    const px = x + r.range(-24, 24) + Math.sin(t * 3 + i) * 6, py = y - ph * 110;
    const al = Math.sin(ph * Math.PI) * cond * 0.9;
    ctx.fillStyle = rgba(r.chance(0.5) ? '#FFD27A' : '#FF9A4A', al); ctx.beginPath(); ctx.arc(px, py, r.range(1.8, 3.4), 0, TAU); ctx.fill();
  }
}

// ---------------------------------------------------------------- ses halkaları
const RING_T = [T_DER, T_DER + 0.28, T_DER + 0.56, T_DER + 0.84];
function rings(ctx, t, at) {
  const [x, y] = at;
  RING_T.forEach((t0, i) => {
    const a = (t - t0) / 1.25;
    if (a <= 0 || a >= 1) return;
    const rad = 34 + 360 * E.outCubic(a);
    const al = Math.pow(1 - a, 1.3) * 0.9;
    const w = 15 * (1 - a) + 3;
    const r = rng(2050 + i), rot = r.range(0, TAU) + a * 0.5 * (i % 2 ? 1 : -1);
    const tr = ctx.getTransform();
    const ga = ctx.globalAlpha;
    for (let sgm = 0; sgm < 3; sgm++) {
      const a0 = rot + sgm * (TAU / 3), span = TAU / 3 - r.range(0.18, 0.4);
      const NP = 6;
      for (let pc = 0; pc < NP; pc++) {
        const arc = []; for (let k = 0; k <= 5; k++) { const an = a0 + span * ((pc + k / 5) / NP); arc.push([x + Math.cos(an) * rad, y + Math.sin(an) * rad * 0.96]); }
        const mid = arc[2], sy = tr.b * mid[0] + tr.d * mid[1] + tr.f;
        const band = 1 - E.smooth(seg(sy, BAND_TOP - 110, BAND_TOP - 20));
        if (band <= 0.01) continue;
        const u0 = pc / NP, u1 = (pc + 1) / NP;
        ctx.globalAlpha = ga * al * band;
        P.curveStroke(ctx, arc, (u) => w * Math.pow(Math.sin(Math.PI * clamp(lerp(u0, u1, u))), 0.5), i % 2 ? '#FFE7B8' : '#FFD08A', 2060 + i * 3 + sgm * 7 + pc, { bristles: 1 });
      }
    }
    ctx.globalAlpha = ga;
    if (a < 0.25) P.glow(ctx, x, y, 90, '#FFE2A0', 0.35 * (1 - a / 0.25), 'screen');
  });
}

function camera(ctx, t) {
  const k = E.inOutSine(seg(t, 83.2, 85.95));
  const push = E.inOutCubic(seg(t, T_DER, 86.0));
  const [bx, by] = R.breathe(t, 2.5, 20);
  R.camera(ctx, { zoom: lerp(1.66, 1.74, k) + 0.3 * push, cx: lerp(502, 492, k) + bx - 6 * push, cy: lerp(1078, 1084, k) + by + 6 * push });
}

module.exports = {
  draw(ctx, t) {
    ctx.save();
    camera(ctx, t);
    B.drawRoom(ctx, t, { mood: 0, lamp: 1, clockSpeed: 1, pillow: true });
    const q = manState(t);
    const info = B.probe(q);
    const at = emberAt(info);
    // köz yanınca odaya sıcak ışık
    const warm = E.smooth(seg(t, T_CES - 0.1, T_CES + 0.4));
    if (warm > 0) P.glow(ctx, at[0], at[1], 620, '#FF9A4A', 0.16 * warm, 'screen');
    B.bedMan(ctx, q, { mood: 0, armOver: true });
    // alındaki ateş (s19'dan devam) göğse iner
    const fh = 1 - E.smooth(seg(t, 83.3, 84.4));
    if (fh > 0) P.glow(ctx, info.forehead[0], info.forehead[1], 120, '#FF4A2E', 0.38 * fh * (0.8 + 0.2 * Math.sin(t * 6)), 'screen');
    const pulse = 0.85 + 0.15 * Math.sin(t * 3.2) + 0.25 * warm * emberBeat(t);
    outline(ctx, t, q, at, warm, pulse);
    ember(ctx, t, at);
    rings(ctx, t, at);
    ctx.restore();
  },
  sfx: [
    { t: 83.84, type: 'swell', gain: 0.26 },
    { t: 84.46, type: 'flame', gain: 0.3 },
    { t: 84.5, type: 'heartbeat', gain: 0.32 },
    { t: 84.96, type: 'chime', gain: 0.24 },
    { t: 85.3, type: 'heartbeat', gain: 0.22 },
  ],
};
