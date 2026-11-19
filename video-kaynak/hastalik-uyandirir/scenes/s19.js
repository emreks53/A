// S19 — "Hastalık ise birden gözünü açtırır." (79.70–83.30)
// Odaya dönüş (s01'in odası, gece). Adam yatakta, alnında ateş parıltısı, göz kapakları yarı kapalı, dalgın;
// başının çevresinde pembe-lila gaflet sisi döner. 80.42 "Hastalık ise": ateş nabız gibi atar, her atışta sıcak bir
// dalga sise çarpar, sis çalkalanır. 81.56 "birden": sis donup cama döner, çatlaklar yayılır, parlak bir çakmayla
// kırılıp parça parça saçılır. 82.0 "gözünü açtırır": gözler kocaman açılır, yatakta hafifçe doğrulur; kamera
// hızla yüzüne iter.
'use strict';
const { createCanvas } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const B = require('./_s19_bed');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng } = C;
const d = C.deg;

const T_HAST = 80.42, T_BIRDEN = 81.56, T_GOZ = 82.0;
const FREEZE0 = 81.22, FREEZE1 = 81.5;           // sis yavaşlayıp donar
const CRACK0 = 81.4;                              // çatlaklar yayılmaya başlar

// ---------------------------------------------------------------- adam
function manState(t) {
  const q = Object.assign({}, B.LIE);
  // dalgın, yarı kapalı gözler; "Hastalık" ile huzursuzlaşır
  const uneasy = E.smooth(seg(t, T_HAST - 0.05, T_HAST + 0.5));
  q.eye = lerp(0.36, 0.24, uneasy) + 0.04 * Math.sin(t * 1.7);
  q.mouth = lerp(0.32, -0.25, uneasy);
  q.brow = lerp(-0.1, 0.65, uneasy);
  q.head = d(2) + d(5) * Math.sin(seg(t, T_HAST, T_HAST + 1.1) * Math.PI) * uneasy - d(3) * Math.sin(seg(t, 80.95, 81.5) * Math.PI);
  // çakma: gözler sımsıkı kapanır
  const squint = seg(t, T_BIRDEN - 0.01, T_BIRDEN + 0.06) * (1 - seg(t, T_GOZ - 0.04, T_GOZ + 0.02));
  if (squint > 0) { q.eye = lerp(q.eye, 0, squint); q.brow = lerp(q.brow, 1, squint); q.mouth = lerp(q.mouth, -0.4, squint); }
  // "gözünü açtırır": gözler bir anda açılır, hafifçe doğrulur
  const open = seg(t, T_GOZ - 0.03, T_GOZ + 0.04);
  if (open > 0) { q.eye = lerp(q.eye, 1, open); q.brow = lerp(q.brow, 0.55, open); q.mouth = lerp(q.mouth, -0.12, open); }
  // doğrulma: yatıştan, yakın eli kalçanın gerisinde döşeğe dayayarak oturur (81.94–82.30)
  const k = SIT_K(t);
  let out = q;
  if (k > 0) {
    const face = { eye: q.eye, brow: q.brow, mouth: q.mouth };
    out = Object.assign(B.mixPose(Object.assign({ up: 0 }, q), B.SITUP, k), face);
  } else out.up = 0;
  // doğrulduktan sonra hızlı nefes
  const br = Math.sin((t - T_GOZ) * 7.5) * E.smooth(seg(t, T_GOZ + 0.4, T_GOZ + 0.8));
  out.up += 0.006 * br; out.head -= d(1) * br;
  return out;
}
function SIT_K(t) { const u = seg(t, T_GOZ - 0.08, T_GOZ + 0.32); return u <= 0 ? 0 : E.inOutCubic(u) + 0.04 * Math.sin(Math.PI * seg(t, T_GOZ + 0.2, T_GOZ + 0.55)); }
function coverAt(t) { return lerp(0.86, 0.1, E.smooth(seg(t, T_GOZ - 0.06, T_GOZ + 0.3))); }

// ---------------------------------------------------------------- gaflet sisi
const LIE_HEAD = B.probe(Object.assign({}, B.LIE, { up: 0 }));
const FOG = { x: LIE_HEAD.head[0] + 2, y: LIE_HEAD.head[1] - 22, rx: 150, ry: 104 };
const IMPACT = [LIE_HEAD.forehead[0] + 30, LIE_HEAD.forehead[1] - 46];
const FOG_COLS = ['#F6C1D3', '#E9A6CF', '#C9B2EC', '#B39ADC', '#FBD9E6', '#DDA0D6'];
// sis öbekleri (başın çevresinde halka + başın üstünde kabaran birkaç öbek)
const LOBES = (() => {
  const r = rng(1902), out = [];
  // başın tepesi/arkası (yatarken solda) ve alnın üstünde küçük puflar — yüz açık kalır
  const spots = [[-80, -4, 38], [-62, -46, 36], [-22, -70, 30], [-100, 34, 28]];
  for (const [x, y, rr] of spots) out.push({ top: true, x, y, rr: rr * r.range(0.9, 1.1), ph: r.range(0, TAU) });
  return out;
})();
const WISPS = (() => {
  const r = rng(1901);
  return Array.from({ length: 7 }, (_, i) => ({
    rx: r.range(0.72, 1.05), ry: r.range(0.62, 0.98), a0: r.range(0, TAU), span: r.range(1.4, 2.6), w: r.range(7, 13),
    om: r.range(0.3, 0.6) * (i % 2 ? 1 : -1), col: FOG_COLS[i % FOG_COLS.length], al: r.range(0.55, 0.85),
    ox: r.range(-20, 20), oy: r.range(-16, 16), seed: 1910 + i, wob: r.range(0, 10),
  }));
})();
// donma: hızın yumuşakça sıfıra inmesiyle bütünleşik zaman
function tau(t) {
  if (t <= FREEZE0) return t;
  const L = FREEZE1 - FREEZE0, u = Math.min(1, (t - FREEZE0) / L);
  return FREEZE0 + L * (u - u * u * u + u * u * u * u / 2);
}
const LAYER = { x0: FOG.x - 300, y0: FOG.y - 280, w: 600, h: 520, ss: 1.5 };
let _layer = null;
// sis katmanı (opak boyanır, sonra saydam basılır → düzgün bir saydamlık)
function fogLayer(x, t, o = {}) {
  const ta = o.tau ?? tau(t), glass = o.glass ?? 0, agit = o.agit ?? 0, beat = o.beat ?? 0;
  // pus
  const haze = [[0, 10, 1.08, '#E7B0D8'], [-60, 30, 0.72, '#C4AEE8'], [70, -30, 0.78, '#F6C6DA']];
  for (const [dx, dy, k, c] of haze) {
    const cx = FOG.x + dx + Math.sin(ta * 0.5 + dx) * 10, cy = FOG.y + dy + Math.cos(ta * 0.4 + dy) * 8;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, FOG.rx * k);
    g.addColorStop(0, rgba(c, 0.22)); g.addColorStop(0.6, rgba(c, 0.12)); g.addColorStop(1, rgba(c, 0));
    x.fillStyle = g; x.fillRect(cx - FOG.rx * k, cy - FOG.rx * k, FOG.rx * k * 2, FOG.rx * k * 2);
  }
  // öbekler
  const list = [];
  for (const l of LOBES) {
    const pul = 1 + 0.05 * Math.sin(ta * 1.3 + l.ph) + 0.1 * beat + agit * 0.05 * Math.sin(t * 13 + l.ph);
    let cx, cy;
    if (l.top) { cx = FOG.x + l.x + Math.sin(ta * 0.6 + l.ph) * 14; cy = FOG.y + l.y + Math.cos(ta * 0.5 + l.ph) * 8; }
    else { const a = l.a + l.om * (ta - 79); cx = FOG.x + Math.cos(a) * FOG.rx * 0.82 * l.k; cy = FOG.y + Math.sin(a) * FOG.ry * 0.78 * l.k; }
    list.push(P.blobPts(cx, cy, l.rr * pul, l.rr * 0.82 * pul, 1903 + list.length, 0.14, 26));
  }
  // s16'daki gaflet sisinin renkleri (_s16_lib FOG)
  P.toneUnion(x, list, { base: mix('#F3BFDB', '#FBE6F2', glass * 0.5), dark: mix('#B9A0DC', '#E2D2F4', glass * 0.4), light: mix('#FFE4F1', '#FFFFFF', glass * 0.5), seed: 1904, lightAng: -2.2, shadowW: 0.06, lightW: 0.03, strokeAng: 0.2, texture: 0.3, dabs: 12, rimColor: '#E07AAE', rimW: 2.5, size: 420 });
  // kıvrılan sis darbeleri
  for (const w of WISPS) {
    const a0 = w.a0 + w.om * (ta - 79), n = 16;
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const a = a0 + (k / n) * w.span;
      const rr = 1 + 0.07 * Math.sin(3 * a + w.wob + ta * 0.8) + agit * 0.07 * Math.sin(7 * a + t * 11 + w.wob);
      pts.push([FOG.x + w.ox + Math.cos(a) * w.rx * FOG.rx * rr, FOG.y + w.oy + Math.sin(a) * w.ry * FOG.ry * rr]);
    }
    x.globalAlpha = clamp(w.al * 0.85);
    P.curveStroke(x, pts, (u) => w.w * Math.pow(Math.sin(Math.PI * clamp(u * 0.94 + 0.03)), 0.7), mix(w.col, '#FFF0F8', glass * 0.45), w.seed, { bristles: 3 });
  }
  x.globalAlpha = 1;
  // yüzün üstünde sis incelir (peçe gibi): yumuşak delik
  const [fx, fy] = LIE_HEAD.face;
  x.save(); x.globalCompositeOperation = 'destination-out';
  const g = x.createRadialGradient(fx + 4, fy - 2, 0, fx + 4, fy - 2, 70);
  g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.6, 'rgba(0,0,0,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(fx - 120, fy - 120, 240, 240);
  x.restore();
  // cam: ince parlak kubbe kenarı, yansımalar
  if (glass > 0.01) {
    x.save(); x.globalAlpha = glass;
    x.fillStyle = rgba('#FFF0F8', 0.22);
    x.beginPath(); x.ellipse(FOG.x, FOG.y, FOG.rx * 1.04, FOG.ry * 1.04, 0, 0, TAU); x.fill();
    x.strokeStyle = rgba('#FFFFFF', 0.85); x.lineWidth = 3;
    x.beginPath(); x.ellipse(FOG.x, FOG.y, FOG.rx * 1.04, FOG.ry * 1.04, 0, 0, TAU); x.stroke();
    const arc = []; for (let k = 0; k <= 10; k++) { const a = -2.75 + k * 0.1; arc.push([FOG.x + Math.cos(a) * FOG.rx * 0.88, FOG.y + Math.sin(a) * FOG.ry * 0.88]); }
    P.curveStroke(x, arc, (u) => 10 * Math.sin(Math.PI * u), '#FFFFFF', 1931, { bristles: 1, detail: 0 });
    const arc2 = []; for (let k = 0; k <= 6; k++) { const a = 0.25 + k * 0.09; arc2.push([FOG.x + Math.cos(a) * FOG.rx * 0.92, FOG.y + Math.sin(a) * FOG.ry * 0.92]); }
    P.curveStroke(x, arc2, (u) => 6 * Math.sin(Math.PI * u), '#FFF6FB', 1932, { bristles: 1, detail: 0 });
    x.restore();
  }
}
function layerCanvas() {
  if (!_layer) _layer = createCanvas(Math.ceil(LAYER.w * LAYER.ss), Math.ceil(LAYER.h * LAYER.ss));
  return _layer;
}
function renderLayer(cv, t, o) {
  const x = cv.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height);
  x.scale(LAYER.ss, LAYER.ss); x.translate(-LAYER.x0, -LAYER.y0);
  fogLayer(x, t, o);
  return cv;
}
function fog(ctx, t, o = {}) {
  const cv = renderLayer(layerCanvas(), t, o);
  ctx.save(); ctx.globalAlpha *= (o.alpha ?? 1) * lerp(0.78, 0.92, o.glass ?? 0);
  ctx.drawImage(cv, LAYER.x0, LAYER.y0, LAYER.w, LAYER.h);
  ctx.restore();
}

// ---------------------------------------------------------------- çatlak ve kırık parçalar
// hücreler: çarpma noktasından kırık ışınlar × halkalar (çatlaklar = parça kenarları)
const RAYS = 13, RINGS = [0, 50, 112, 186, 280, 400];
const CR = (() => {
  const r = rng(1950);
  const ang = []; for (let k = 0; k < RAYS; k++) ang.push((k / RAYS) * TAU + r.range(-0.17, 0.17));
  const rad = ang.map(() => RINGS.map((v, j) => (j === 0 ? 0 : v * r.range(0.8, 1.2))));
  const node = (k, j) => { const kk = ((k % RAYS) + RAYS) % RAYS; return [IMPACT[0] + Math.cos(ang[kk]) * rad[kk][j], IMPACT[1] + Math.sin(ang[kk]) * rad[kk][j]]; };
  // kenar orta noktaları (zikzak): ışın kenarı (k, j→j+1) ve halka kenarı (k→k+1, j)
  const rayMid = ang.map(() => RINGS.map(() => r.range(-0.3, 0.3)));
  const ringMid = ang.map(() => RINGS.map(() => r.range(-0.22, 0.22)));
  const rayEdge = (k, j) => { const kk = ((k % RAYS) + RAYS) % RAYS; const a = node(kk, j), b = node(kk, j + 1); const dx = b[0] - a[0], dy = b[1] - a[1]; const m = rayMid[kk][j]; return [a, [a[0] + dx * 0.5 - dy * m * 0.5, a[1] + dy * 0.5 + dx * m * 0.5], b]; };
  const ringEdge = (k, j) => { const kk = ((k % RAYS) + RAYS) % RAYS; const a = node(kk, j), b = node(kk + 1, j); const dx = b[0] - a[0], dy = b[1] - a[1]; const m = ringMid[kk][j]; return [a, [a[0] + dx * 0.5 - dy * m, a[1] + dy * 0.5 + dx * m], b]; };
  const cells = [];
  for (let k = 0; k < RAYS; k++) for (let j = 0; j < RINGS.length - 1; j++) {
    const e1 = rayEdge(k, j), e2 = j + 1 < RINGS.length ? ringEdge(k, j + 1) : null, e3 = rayEdge(k + 1, j).slice().reverse();
    let poly = e1.concat(e2.slice(1), e3.slice(1));
    if (j > 0) poly = poly.concat(ringEdge(k, j).slice().reverse().slice(1, -1));
    const c = poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
    const ex = (c[0] - FOG.x) / (FOG.rx * 1.1), ey = (c[1] - FOG.y) / (FOG.ry * 1.1);
    if (ex * ex + ey * ey > 1.1) continue;
    const dx = c[0] - IMPACT[0], dy = c[1] - IMPACT[1], dl = Math.hypot(dx, dy) || 1;
    const near = 1 - clamp(dl / 420);
    cells.push({ poly, c, u: [dx / dl, dy / dl], v: r.range(240, 480) + 720 * near * r.range(0.6, 1), w: r.range(-7, 7), delay: dl / 2600, life: r.range(0.55, 0.9), shrink: r.range(0.2, 0.45) });
  }
  return { cells, rad, rayEdge, ringEdge };
})();
function snapshot() {
  return R.cached('s19fogsnap', Math.ceil(LAYER.w * LAYER.ss), Math.ceil(LAYER.h * LAYER.ss), (x, cv) => {
    renderLayer(cv, T_BIRDEN, { tau: tau(T_BIRDEN), glass: 1 });
  });
}
function cracks(ctx, t) {
  const k = E.outCubic(seg(t, CRACK0, T_BIRDEN + 0.01));
  if (k <= 0 || t > T_BIRDEN + 0.02) return;
  const rho = k * 440;
  ctx.save();
  ctx.beginPath(); ctx.ellipse(FOG.x, FOG.y, FOG.rx * 1.06, FOG.ry * 1.06, 0, 0, TAU); ctx.clip();
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = (ctx2) => {
    ctx2.beginPath();
    for (let a = 0; a < RAYS; a++) {
      for (let j = 0; j < RINGS.length - 1; j++) {
        const rp = CR.rad[a][j], rj = CR.rad[a][j + 1];
        if (rho <= rp) break;
        const e = CR.rayEdge(a, j), f = clamp((rho - rp) / (rj - rp));
        ctx2.moveTo(e[0][0], e[0][1]);
        if (f < 0.5) { const q = f * 2; ctx2.lineTo(lerp(e[0][0], e[1][0], q), lerp(e[0][1], e[1][1], q)); }
        else { const q = (f - 0.5) * 2; ctx2.lineTo(e[1][0], e[1][1]); ctx2.lineTo(lerp(e[1][0], e[2][0], q), lerp(e[1][1], e[2][1], q)); }
      }
      for (let j = 1; j < RINGS.length; j++) {
        const rj = Math.max(CR.rad[a][j], CR.rad[(a + 1) % RAYS][j]);
        if (rho < rj * 1.1) continue;
        const e = CR.ringEdge(a, j);
        ctx2.moveTo(e[0][0], e[0][1]); ctx2.lineTo(e[1][0], e[1][1]); ctx2.lineTo(e[2][0], e[2][1]);
      }
    }
  };
  path(ctx); ctx.strokeStyle = rgba('#FFD6EE', 0.4 * k); ctx.lineWidth = 9; ctx.stroke();
  ctx.strokeStyle = rgba('#FFFFFF', 0.95); ctx.lineWidth = 2.6; ctx.stroke();
  ctx.restore();
  P.glow(ctx, IMPACT[0], IMPACT[1], 90 + 70 * k, '#FFFFFF', 0.55 * k);
}
function shards(ctx, t) {
  const a0 = t - T_BIRDEN;
  if (a0 < 0 || a0 > 1.2) return;
  const snap = snapshot();
  for (const c of CR.cells) {
    const a = Math.max(0, a0 - c.delay);
    const al = 1 - E.smooth(clamp(a / c.life));
    if (al <= 0.01) continue;
    const ox = c.u[0] * c.v * a * (1 - 0.3 * a), oy = c.u[1] * c.v * a * (1 - 0.3 * a) + 420 * a * a;
    const sc = 1 - c.shrink * clamp(a / c.life);
    ctx.save();
    ctx.globalAlpha *= al;
    ctx.translate(c.c[0] + ox, c.c[1] + oy); ctx.rotate(c.w * a); ctx.scale(sc, sc); ctx.translate(-c.c[0], -c.c[1]);
    const path = P.pathOf(c.poly);
    ctx.save(); ctx.clip(path);
    ctx.globalAlpha *= 0.92;
    ctx.drawImage(snap, LAYER.x0, LAYER.y0, LAYER.w, LAYER.h);
    ctx.fillStyle = rgba('#FFE8F6', 0.16); ctx.fill(path);
    ctx.restore();
    ctx.strokeStyle = rgba('#FFFFFF', 0.85); ctx.lineWidth = 2.2; ctx.lineJoin = 'round'; ctx.stroke(path);
    ctx.restore();
  }
}
// çakma (dünya koordinatında ışık patlaması + ışınlar)
function flashWorld(ctx, t) {
  const a = t - T_BIRDEN + 0.03;
  if (a < 0 || a > 1.0) return;
  const f = Math.exp(-a * 6.5);
  P.glow(ctx, IMPACT[0], IMPACT[1], 760, '#FFF1D8', 0.85 * f);
  P.glow(ctx, IMPACT[0], IMPACT[1], 240, '#FFFFFF', 0.9 * f);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const r = rng(1970);
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * TAU + r.range(-0.2, 0.2), len = r.range(380, 720) * (0.4 + 0.6 * E.outCubic(clamp(a * 5))), wd = r.range(0.025, 0.05);
    ctx.fillStyle = rgba('#FFF4E0', 0.5 * f);
    ctx.beginPath(); ctx.moveTo(IMPACT[0], IMPACT[1]);
    ctx.lineTo(IMPACT[0] + Math.cos(ang - wd) * len, IMPACT[1] + Math.sin(ang - wd) * len);
    ctx.lineTo(IMPACT[0] + Math.cos(ang + wd) * len, IMPACT[1] + Math.sin(ang + wd) * len); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// kırılmadan sonra süzülen parıltı tozu
function glitter(ctx, t) {
  const a = t - T_BIRDEN;
  if (a < 0.05) return;
  const r = rng(1980);
  for (let i = 0; i < 34; i++) {
    const ang = r.range(0, TAU), sp = r.range(60, 260), ph = r.range(0, 0.4);
    const aa = Math.max(0, a - ph);
    const x = IMPACT[0] + Math.cos(ang) * sp * Math.min(aa, 0.8) + Math.sin(t * 1.3 + i) * 10;
    const y = IMPACT[1] + Math.sin(ang) * sp * 0.6 * Math.min(aa, 0.8) + 40 * aa;
    const al = Math.sin(clamp(aa / 1.6) * Math.PI) * (0.6 + 0.4 * Math.sin(t * 9 + i));
    if (al > 0.02) R.sparkle(ctx, x, y, r.range(4, 9), al, r.chance(0.5) ? '#FFE6F4' : '#FFFFFF');
  }
}

// ---------------------------------------------------------------- ateş
function beatFn(x) { const ph = ((x % 0.72) + 0.72) % 0.72; return Math.exp(-ph * 9) + 0.6 * Math.exp(-Math.max(0, ph - 0.2) * 11) * (ph > 0.2 ? 1 : 0); }
function heatBeat(t) { return E.smooth(seg(t, T_HAST - 0.08, T_HAST + 0.3)) * beatFn(t - T_HAST) * (1 - E.smooth(seg(t, FREEZE0, FREEZE1))); }
function fever(ctx, t, info) {
  // "Hastalık ise": ateş nabız gibi atar (çift vuruşlu), alında/yanaklarda kızarıklık, ter damlaları, sıcak titreşim
  const strong = E.smooth(seg(t, T_HAST - 0.08, T_HAST + 0.25));
  const b = beatFn(t - T_HAST) * strong;
  const calm = 0.45 + 0.55 * (1 - E.smooth(seg(t, T_GOZ, T_GOZ + 0.8)));
  const amp = (0.55 + 0.1 * Math.sin(t * 4) + 0.45 * strong + 0.5 * b) * calm;
  const hc = info.head, u = M_HEAD_U;
  const at = (a, c) => [hc[0] + info.hf[0] * a * u + info.hu[0] * c * u, hc[1] + info.hf[1] * a * u + info.hu[1] * c * u];
  // yüzün içine kırmızı kızarıklık (baş biçimine kırpılmış)
  ctx.save();
  ctx.beginPath(); ctx.arc(hc[0] + info.hf[0] * 0.08 * u, hc[1] + info.hf[1] * 0.08 * u, 0.47 * u, 0, TAU); ctx.clip();
  for (const [p, rr, al] of [[at(0.3, 0.22), 0.36, 0.36], [at(0.3, -0.12), 0.2, 0.3]]) {
    const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr * u * (1 + 0.25 * b));
    g.addColorStop(0, rgba('#FF3A2A', al * amp)); g.addColorStop(1, rgba('#FF3A2A', 0));
    ctx.fillStyle = g; ctx.fillRect(p[0] - u, p[1] - u, 2 * u, 2 * u);
  }
  ctx.restore();
  // sıcak ışıma (küçük, yüzün üstünde; halka değil)
  const fh = at(0.3, 0.2);
  P.glow(ctx, fh[0], fh[1], (70 + 30 * b) * (1 + 0.2 * strong), '#FF5A3A', 0.24 * amp, 'screen');
  // ter damlaları
  const drops = [[0.34, 0.3, 0.0], [0.14, 0.24, 0.12], [0.44, 0.06, 0.24]];
  drops.forEach(([a, c, dl], i) => {
    const k = C.pop(t, T_HAST + 0.05 + dl, 0.35, 2.0) * calm;
    if (k <= 0.01) return;
    const slide = 6 * E.smooth(seg(t, T_HAST + 0.4 + dl, T_HAST + 1.6 + dl));
    const [px, py] = at(a, c);
    const sz = (4.6 + i * 0.8) * k;
    ctx.save(); ctx.translate(px, py + slide);
    ctx.fillStyle = rgba('#DDF2FF', 0.92); ctx.beginPath(); ctx.moveTo(0, -sz * 1.7); ctx.quadraticCurveTo(sz, -sz * 0.2, sz * 0.9, sz * 0.35); ctx.arc(0, sz * 0.35, sz * 0.9, 0, Math.PI); ctx.quadraticCurveTo(-sz, -sz * 0.2, 0, -sz * 1.7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(-sz * 0.3, sz * 0.15, sz * 0.28, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba('#7FA8D0', 0.6); ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
  });
  // sıcak titreşim: alnın üstünden yükselen ince dalgalı çizgiler
  if (strong > 0.01 && t < T_BIRDEN + 0.05) {
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const ph = ((t - T_HAST) * 0.9 + i / 3) % 1;
      const x0 = fh[0] - 26 + i * 26, y0 = fh[1] - 30 - ph * 70;
      ctx.strokeStyle = rgba('#FFC8A0', 0.55 * Math.sin(Math.PI * ph) * strong); ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k <= 10; k++) { const yy = y0 - k * 4; const xx = x0 + Math.sin(k * 0.9 + t * 9 + i) * 4; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
    }
    ctx.restore();
  }
}
const M_HEAD_U = 0.13 * B.H;

// uyanış çizgileri (gözün üstünde kısa parlak darbeler)
function wakeLines(ctx, t, info) {
  const k = C.pop(t, T_GOZ + 0.02, 0.3, 2.2), fade = 1 - E.smooth(seg(t, T_GOZ + 0.55, T_GOZ + 0.95));
  if (k <= 0 || fade <= 0) return;
  const [ex, ey] = info.face;
  const hu = info.hu, hf = info.hf;
  ctx.save(); ctx.globalAlpha *= fade;
  for (let i = 0; i < 3; i++) {
    const a = Math.atan2(hu[1] * 0.8 + hf[1] * 0.6, hu[0] * 0.8 + hf[0] * 0.6) + (i - 1) * 0.5;
    const r0 = 74 * k, r1 = 74 * k + 34 * k;
    P.stroke(ctx, ex + Math.cos(a) * r0, ey + Math.sin(a) * r0, ex + Math.cos(a) * r1, ey + Math.sin(a) * r1, 8, '#FFF3D6', 1995 + i, { detail: 0, taper1: 0.45 });
  }
  ctx.restore();
  // gözde parıltı
  const g = C.pop(t, T_GOZ, 0.2, 2) * (1 - E.smooth(seg(t, T_GOZ + 0.18, T_GOZ + 0.5)));
  if (g > 0.01) { const [gx, gy] = info.eye; R.sparkle(ctx, gx + 6, gy - 8, 16 * g, g, '#FFFFFF'); }
}

// ---------------------------------------------------------------- kamera
const SIT_INFO = B.probe(Object.assign({}, B.SITUP), { hip: B.LIE_HIP });
function camera(ctx, t) {
  // açılış: başa ve sise yakın; saat ve pencere kadrajın tümüyle dışında (üstte), kandil solda dışarıda
  const slow = E.inOutSine(seg(t, 79.4, 82.0));
  let zoom = lerp(2.78, 2.9, slow), cx = lerp(394, 388, slow), cy = lerp(1236, 1232, slow);
  // "gözünü açtırır": doğrulan adamla birlikte yükselip baş+göğse hızla iter
  const push = E.inOutCubic(seg(t, T_GOZ - 0.04, T_GOZ + 0.46));
  const hold = E.inOutSine(seg(t, T_GOZ + 0.5, 83.6));
  zoom = lerp(zoom, 2.62 + 0.24 * hold, push);
  cx = lerp(cx, SIT_INFO.head[0] + 44, push); cy = lerp(cy, SIT_INFO.head[1] + 92 - 8 * hold, push);
  const [bx, by] = R.breathe(t, 2, 19);
  const sh = Math.exp(-Math.max(0, t - T_BIRDEN) * 9) * (t > T_BIRDEN ? 1 : 0);
  R.camera(ctx, { zoom, cx: cx + bx + Math.sin(t * 71) * 5 * sh, cy: cy + by + Math.cos(t * 59) * 4 * sh });
}

module.exports = {
  draw(ctx, t) {
    ctx.save();
    camera(ctx, t);
    B.drawRoom(ctx, t, { mood: 0, lamp: 1, clockSpeed: 1 });
    const q = manState(t);
    const info = B.probe(q, { hip: B.LIE_HIP });
    B.bedMan(ctx, q, { mood: 0, hip: B.LIE_HIP, armOver: true, cover: coverAt(t), stripes: 'chest' });
    fever(ctx, t, info);
    // sis: "Hastalık" ile çalkalanır, sonra donup cama döner; kırılınca yerini parçalara bırakır
    if (t < T_BIRDEN) {
      const agit = E.smooth(seg(t, T_HAST, T_HAST + 0.4)) * (1 - E.smooth(seg(t, FREEZE0, FREEZE1)));
      const glass = E.smooth(seg(t, FREEZE0 + 0.05, CRACK0 + 0.08));
      fog(ctx, t, { glass, agit, beat: heatBeat(t), alpha: 1 });
      cracks(ctx, t);
    }
    shards(ctx, t);
    flashWorld(ctx, t);
    glitter(ctx, t);
    wakeLines(ctx, t, info);
    ctx.restore();
    // ekran çakması
    const a = t - T_BIRDEN + 0.02;
    if (a > 0 && a < 0.5) { ctx.fillStyle = rgba('#FFF6EC', 0.55 * Math.exp(-a * 11)); ctx.fillRect(0, 0, C.W, C.H); }
  },
  sfx: [
    { t: 80.42, type: 'heartbeat', gain: 0.4 },
    { t: 81.14, type: 'heartbeat', gain: 0.32 },
    { t: 81.2, type: 'swell', gain: 0.22 },
    { t: 81.56, type: 'glass', gain: 0.5 },
    { t: 81.72, type: 'sparkle', gain: 0.22 },
    { t: 82.0, type: 'whoosh', gain: 0.3 },
  ],
};
