// s14 dünyası: dağın tepesinde ebedî bahçe, sonsuza kıvrılan yol, dağ eteğinde çarşı tezgâhı.
// Dünya koordinatı: x 0..1080, y 0..2800 (kamera sahnede uygulanır). Önbellek tuvali kenar paylı (OX, OY).
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, noise1 } = C;

const OX = 60, OY = 60;                 // önbellek tuvalinde dünya başlangıcı
const WW = 1080, WH = 2920;
const GATE = { x: 566, y: 604, s: 150 };

// ---------------- yol ----------------
const ROAD_CTRL = [[380, 3000], [348, 2760], [336, 2560], [376, 2330], [520, 2080], [782, 1904], [806, 1744], [560, 1616], [262, 1528], [62, 1450], [6, 1384],
  [110, 1346], [420, 1340], [800, 1328], [912, 1268], [812, 1176], [596, 1118], [452, 1040], [506, 952], [652, 884], [646, 806], [544, 748], [548, 684], [GATE.x, GATE.y + 4]];
const ROAD = (() => {
  const pts = P.smoothPts(ROAD_CTRL, false, 18, 0.5);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
})();
function roadW(y) { return 10 + 205 * Math.pow(clamp((y - GATE.y) / (2800 - GATE.y)), 1.2) * (y > 2800 ? 1 + (y - 2800) / 2200 : 1); }
// yol üzerinde yay uzunluğu oranı u (0 = alt, 1 = kapı) → { x, y, tx, ty, w }
function roadAt(u) {
  const L = clamp(u) * ROAD.len, c = ROAD.cum, p = ROAD.pts;
  let lo = 0, hi = c.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (c[m] < L) lo = m; else hi = m; }
  const k = (L - c[lo]) / Math.max(1e-6, c[hi] - c[lo]);
  const x = lerp(p[lo][0], p[hi][0], k), y = lerp(p[lo][1], p[hi][1], k);
  let tx = p[hi][0] - p[lo][0], ty = p[hi][1] - p[lo][1]; const d = Math.hypot(tx, ty) || 1;
  return { x, y, tx: tx / d, ty: ty / d, w: roadW(y) };
}
// dünya noktasına en yakın yol parametresi (yalnız başlangıçta kullanılır)
function roadParamNear(x, y, u0 = 0, u1 = 1) {
  let best = u0, bd = Infinity;
  for (let i = 0; i <= 2000; i++) { const u = lerp(u0, u1, i / 2000), q = roadAt(u); const dd = (q.x - x) ** 2 + (q.y - y) ** 2; if (dd < bd) { bd = dd; best = u; } }
  return best;
}

// ---------------- dağ ----------------
const MT_CTRL = [[-80, 1640], [-30, 1440], [60, 1300], [120, 1236], [168, 1130], [236, 1020], [262, 960], [314, 900], [352, 812], [410, 700], [452, 630], [504, 600], [628, 596], [684, 618], [736, 684], [790, 760], [826, 790], [866, 860], [900, 930], [962, 1010], [1000, 1080], [1070, 1190], [1150, 1380], [1180, 1640]];
const MT = P.smoothPts(MT_CTRL, false, 8).concat([[1180, 1700], [-80, 1700]]);
// sırt hattı: zirveden sol-aşağı inen ana sırt (solu ışıkta, sağı gölgede)
function ridgeX(y) { return 590 - (y - 600) * 0.2 + Math.sin(y / 120) * 22 + Math.sin(y / 47) * 8; }
function ridge2X(y) { return 250 + (y - 900) * -0.05 + Math.sin(y / 90) * 18; }

function worldCanvas() {
  return R.cached('s14:world', WW + OX * 2, WH + OY * 2, (x) => {
    x.translate(OX, OY);
    const r = rng(1401);
    x.fillStyle = P.UNDERPAINT; x.fillRect(-OX, -OY, WW + OX * 2, WH + OY * 2);
    // ---- gök: kobalt → turkuaz → sıcak açık ufuk ----
    const sky = R.skyCanvas('s14sky', WW + OX * 2, 1560, ['#1F4AAE', '#2A66C4', '#2E86CE', '#4FB3CF', '#A8DCE4', '#F2E4C2'],
      { seed: 1402, stops: [0, 0.18, 0.38, 0.6, 0.82, 1], wMin: 20, wMax: 40, lMin: 90, lMax: 300, mixJitter: 0.06 });
    x.drawImage(sky, -OX, -OY);
    // bahçenin göğe yaydığı sıcak ışık (statik kısmı)
    P.glow(x, GATE.x, GATE.y - 60, 700, '#FFE3A0', 0.45);
    // ---- uzak sıradağlar (iki kat, serin lavanta) ----
    const range = (base, amp, seed, cols, lightC, shadowC) => {
      const top = []; for (let i = 0; i <= 80; i++) { const xx = -OX + (i / 80) * (WW + OX * 2), u = xx / WW; let yy = 0, a = 1, f = 2.6; for (let k = 0; k < 4; k++) { const n = noise1(u * f + seed, seed + k); yy += a * (1 - Math.abs(2 * n - 1)); a *= 0.5; f *= 2.1; } top.push([xx, base - yy * amp]); }
      const pts = top.concat([[WW + OX, 1700], [-OX, 1700]]), path = P.pathOf(pts);
      x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([90, 50, 40, 70]); x.stroke(P.pathOf(top, false)); x.restore();
      x.save(); x.clip(path); x.fillStyle = cols[0]; x.fillRect(-OX, base - amp * 2, WW + OX * 2, 1700); x.restore();
      P.bandFill(x, path, { x0: -OX, y0: base - amp * 2, x1: WW + OX, y1: 1700, w: WW + OX * 2, h: 1700 - base + amp * 2 }, cols, { seed, wMin: 12, wMax: 22, lMin: 50, lMax: 160, angle: 0.02, mixJitter: 0.1 });
      x.save(); x.clip(path);
      const rr = rng(seed + 5);
      for (let i = 0; i < 160; i++) {
        const k = rr.int(1, 79), p0 = top[k], slope = (top[k + 1][1] - top[k - 1][1]) / (top[k + 1][0] - top[k - 1][0]);
        const lit = slope < -0.15, sh = slope > 0.15; if (!lit && !sh) continue;
        const nrm = Math.hypot(1, slope), ux = (lit ? -1 : 1) / nrm, uy = Math.abs(slope) / nrm;
        const dn = rr.range(6, 60), len = rr.range(18, 46), cx0 = p0[0] + rr.range(-6, 6) + ux * dn * 0.3, cy0 = p0[1] + 5 + dn;
        P.stroke(x, cx0 - ux * len / 2, cy0 - uy * len / 2, cx0 + ux * len / 2, cy0 + uy * len / 2, rr.range(6, 11), lit ? lightC : shadowC, rr.int(1, 1e9), { detail: 0.3, taper1: 0.6 });
      }
      x.restore();
    };
    range(1120, 210, 1403, ['#C2C0E2', '#B0B0DC', '#A6A8D6'], '#F1D6D2', '#9494C8');
    range(1290, 160, 1404, ['#A8A2D6', '#9690CC', '#8A88C4'], '#EBC2C2', '#7C78B8');
    // ---- ana dağ ----
    const mp = P.pathOf(MT);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([150, 60, 70, 100]); x.stroke(P.pathOf(MT.slice(0, MT.length - 2), false)); x.restore();
    x.save(); x.clip(mp); x.fillStyle = '#7A78BC'; x.fillRect(-OX, 560, WW + OX * 2, 1200); x.restore();
    const colAt = (xx, yy, rr) => {
      const lit = xx < ridgeX(yy) && !(xx > ridge2X(yy) - 30 && xx < ridge2X(yy) + 40 && yy > 900);
      const g = clamp((yy - 960) / 260 + rr.range(-0.18, 0.18));         // aşağıda orman yeşili
      const hi = lit ? (rr.chance(0.5) ? '#F0BCA4' : '#E4A6AE') : (rr.chance(0.5) ? '#6866B2' : '#5A58A6');
      const lo = lit ? (rr.chance(0.5) ? '#7EBB5C' : '#64AA58') : (rr.chance(0.5) ? '#2F7A5C' : '#2B6858');
      const mid = lit ? '#B8A6B0' : '#4E5E96';
      return g < 0.35 ? hi : g < 0.62 ? (rr.chance(0.5) ? mid : (g < 0.5 ? hi : lo)) : lo;
    };
    P.fillStrokes(x, mp, { x0: -80, y0: 580, x1: 1180, y1: 1700, w: 1260, h: 1120 }, { seed: 1405, angle: -0.5, wMin: 14, wMax: 26, lMin: 40, lMax: 120, colorFn: colAt, jitterAng: 0.25, rowGap: 0.55 });
    // ışıklı yüzlerde zirveden inen sıcak vurgu darbeleri, gölgede serin
    x.save(); x.clip(mp);
    for (let i = 0; i < 70; i++) {
      const yy = r.range(640, 1050), rx = ridgeX(yy), side = r.chance(0.6) ? -1 : 1;
      const xx = rx + side * r.range(4, 50);
      const a = side < 0 ? 2.05 + r.range(-0.2, 0.2) : 1.1 + r.range(-0.2, 0.2), len = r.range(30, 80);
      if (side > 0) continue;
      P.stroke(x, xx, yy, xx + Math.cos(a) * len, yy + Math.sin(a) * len, r.range(8, 13), '#FAD2B4', r.int(1, 1e9), { detail: 0.4, taper1: 0.5 });
    }
    // orman: alt yamaçlarda küçük koyu ağaç darbeleri
    for (let i = 0; i < 260; i++) {
      const xx = r.range(-60, 1160), yy = r.range(1040, 1600);
      if (!P.inPoly(xx, yy, MT)) continue;
      const lit = xx < ridgeX(yy);
      const s = lerp(10, 22, (yy - 1040) / 560);
      P.stroke(x, xx, yy, xx + r.range(-2, 2), yy - s * 1.6, s * 0.7, lit ? (r.chance(0.5) ? '#3F8F52' : '#2F7A4C') : (r.chance(0.5) ? '#235E4C' : '#1E4E44'), r.int(1, 1e9), { detail: 0.3, taper1: 0.35 });
    }
    x.restore();
    // ---- zirvedeki bahçe: ışıyan ağaçlar ----
    const garden = [[404, 640, 44], [736, 640, 44], [446, 604, 62], [690, 604, 62], [492, 572, 70], [640, 570, 72], [566, 540, 64], [526, 590, 40], [610, 590, 40]];
    for (const [gx, gy, gs] of garden) {
      const list = [P.blobPts(gx, gy - gs * 0.4, gs * 0.62, gs * 0.55, gx, 0.14, 22), P.blobPts(gx - gs * 0.38, gy - gs * 0.1, gs * 0.42, gs * 0.38, gx + 1, 0.14, 18), P.blobPts(gx + gs * 0.4, gy - gs * 0.1, gs * 0.44, gs * 0.38, gx + 2, 0.14, 18)];
      P.toneUnion(x, list, { base: '#A8DC56', dark: '#5FA84E', light: '#EAF8A8', seed: gx, shadowW: 0.14, lightW: 0.1, dabs: 4, texture: 0.35, rimW: 3 });
      // çiçekli dallar: pembe-beyaz benekler
      const fr = rng(gx + 7);
      for (let k = 0; k < 7; k++) { x.fillStyle = fr.pick(['#FFFFFF', '#FBD3E4', '#FFE9A8']); x.beginPath(); x.arc(gx + fr.range(-0.6, 0.6) * gs, gy - gs * fr.range(0.1, 0.8), fr.range(2.5, 4.5), 0, TAU); x.fill(); }
    }
    // bahçe duvarı (kapının iki yanı)
    for (const [x0, x1] of [[404, GATE.x - 56], [GATE.x + 56, 730]]) {
      const pts = P.roundRectPts(x0, GATE.y - 34, x1 - x0, 38, 8);
      P.toneShape(x, pts, { base: '#F3E6CE', dark: '#C8A9C2', light: '#FFF8EA', seed: x0, shadowW: 0.25, lightW: 0.15, dabs: 3, rimW: 3, strokeAng: 0 });
      for (let k = x0 + 10; k < x1 - 6; k += 22) P.toneShape(x, P.roundRectPts(k, GATE.y - 46, 12, 14, 4), { base: '#F3E6CE', dark: '#C8A9C2', light: '#FFF8EA', rim: false, seed: k, shadowW: 0.3, dabs: 0, highlights: 0, texture: 0.2 });
    }
    // ---- çayır: yumuşak tepeler ----
    const hill = (yTop, amp, fr, ph, cols, seed) => {
      const top = []; for (let i = 0; i <= 60; i++) { const xx = -OX + (i / 60) * (WW + OX * 2); top.push([xx, yTop + Math.sin(xx / WW * Math.PI * fr + ph) * amp + (noise1(xx / 300, seed) - 0.5) * amp * 0.6]); }
      const pts = top.concat([[WW + OX, WH + OY], [-OX, WH + OY]]), path = P.pathOf(pts);
      x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 6; x.setLineDash([130, 50, 60, 90]); x.stroke(P.pathOf(top, false)); x.restore();
      x.save(); x.clip(path); x.fillStyle = cols[1]; x.fillRect(-OX, yTop - amp * 2, WW + OX * 2, WH); x.restore();
      P.bandFill(x, path, { x0: -OX, y0: yTop - amp * 2, x1: WW + OX, y1: WH + OY, w: WW + OX * 2, h: WH + OY - yTop + amp * 2 }, cols, { seed, wMin: 16, wMax: 32, lMin: 70, lMax: 240, angle: 0.03, mixJitter: 0.07 });
      for (let i = 0; i < 16; i++) { const k = r.int(2, 57), p0 = top[k], p1 = top[k + 2]; P.stroke(x, p0[0], p0[1] + 9, p1[0], p1[1] + 9, r.range(8, 13), shade(cols[0], 0.1), r.int(1, 1e9), { detail: 0.5 }); }
      return top;
    };
    hill(1440, 26, 1.6, 0.4, ['#9ED64A', '#6CBC4E', '#4FA24E', '#3E8E4A'], 1406);
    hill(1760, 30, 1.2, 2.0, ['#A6DA50', '#78C24E', '#58A84C', '#3F904A'], 1407);
    hill(2140, 34, 1.0, 1.1, ['#B2DE58', '#86C850', '#62AE4C', '#46964A', '#3A8446'], 1408);
    // çiçek beneği
    for (let i = 0; i < 280; i++) {
      const xx = r.range(-40, 1120), yy = r.range(1460, 2960), s = lerp(2, 6, (yy - 1460) / 1340);
      x.fillStyle = r.pick(['#FFFFFF', '#FBE3F0', '#FFE88A', '#F6C1D3']); x.beginPath(); x.arc(xx, yy, s, 0, TAU); x.fill();
    }
    // çayırda ağaçlar (yolun iki yanında)
    for (const [tx, ty, ts, kind] of [[90, 1520, 70, 'r'], [960, 1560, 80, 'r'], [1010, 1440, 120, 'c'], [60, 1880, 150, 'c'], [980, 2000, 100, 'r'], [140, 1700, 100, 'c'], [900, 1720, 60, 'r']]) {
      if (kind === 'r') R.roundTree(x, tx, ty, ts, tx + ty); else R.cypress(x, tx, ty, ts, tx + ty);
    }
    // ---- yol ----
    drawRoad(x);
    // ---- çarşı: arka planda iki küçük çadır ve bayrak dizisi ----
    tent(x, 140, 2340, 0.62, '#3F8FA8', 1410);
    tent(x, 990, 2280, 0.55, '#8E5A9E', 1411);
    bunting(x, [[-60, 2110], [250, 2170], [560, 2120]], 1412);
    // ---- ana tezgâh (statik kısımlar) ----
    stallStatic(x);
  });
}

function drawRoad(x) {
  const pts = ROAD.pts;
  const rib = P.ribbonPts(pts, (t) => roadW(pts[Math.round(t * (pts.length - 1))][1]));
  const path = P.pathOf(rib);
  x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([80, 40, 30, 60]); x.stroke(path); x.restore();
  x.fillStyle = '#E6C48C'; x.fill(path);
  x.save(); x.clip(path);
  const r = rng(1420);
  // yol boyunca darbeler (yolun yönünde)
  for (let i = 0; i < 900; i++) {
    const u = r.next(), q = roadAt(u), off = r.range(-0.45, 0.45) * q.w;
    const cx = q.x - q.ty * off, cy = q.y + q.tx * off, len = q.w * r.range(0.4, 1.0), wd = Math.max(2, q.w * r.range(0.1, 0.2));
    const col = r.pick(['#F2D49C', '#E0B47C', '#F7E3B2', '#D6A672', '#EDCB92']);
    P.stroke(x, cx - q.tx * len / 2, cy - q.ty * len / 2, cx + q.tx * len / 2, cy + q.ty * len / 2, wd, col, r.int(1, 1e9), { detail: 0.4, taper1: 0.6 });
  }
  // alt (gölge) kenar: serin mor-kahve şerit
  x.restore();
  x.save(); x.clip(path);
  x.strokeStyle = rgba('#9A6E78', 0.5);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], w = roadW(b[1]);
    let tx = b[0] - a[0], ty = b[1] - a[1]; const d = Math.hypot(tx, ty) || 1; tx /= d; ty /= d;
    const nx = -ty, ny = tx, sgn = ny > 0 ? 1 : -1; // aşağı bakan kenar
    x.lineWidth = Math.max(1.5, w * 0.12);
    x.beginPath(); x.moveTo(a[0] + nx * sgn * w * 0.44, a[1] + ny * sgn * w * 0.44); x.lineTo(b[0] + nx * sgn * w * 0.44, b[1] + ny * sgn * w * 0.44); x.stroke();
  }
  x.restore();
  // kenarda çimen tutamları
  const r2 = rng(1421);
  for (let i = 0; i < 260; i++) {
    const u = r2.next(), q = roadAt(u), side = r2.sign(), off = side * q.w * 0.5;
    const cx = q.x - q.ty * off, cy = q.y + q.tx * off, s = Math.max(3, q.w * 0.16);
    P.stroke(x, cx, cy + s * 0.3, cx + r2.range(-2, 2), cy - s, s * 0.35, r2.chance(0.5) ? '#4E9E4C' : '#8CC84B', r2.int(1, 1e9), { detail: 0.3, taper1: 0.35 });
  }
}

function tent(x, cx, gy, k, col, seed) {
  const w = 300 * k, h = 330 * k;
  for (const sx of [-1, 1]) P.toneShape(x, P.rectPts(cx + sx * w * 0.42 - 6 * k, gy - h * 0.72, 12 * k, h * 0.72), { base: '#8A5A3A', dark: '#4E2C18', light: '#B07A50', seed: seed + sx, shadowW: 0.3, dabs: 1, rim: false });
  const roof = [[cx - w * 0.55, gy - h * 0.66], [cx, gy - h], [cx + w * 0.55, gy - h * 0.66]];
  P.toneShape(x, roof, { base: col, dark: C.coolShadow(col, 0.2), light: C.warmLight(col, 0.18), seed, shadowW: 0.2, dabs: 3, rimW: 3 });
  P.toneShape(x, P.rectPts(cx - w * 0.46, gy - h * 0.36, w * 0.92, h * 0.36), { base: '#9A6A44', dark: '#5A3424', light: '#C08A5A', seed: seed + 3, shadowW: 0.2, dabs: 2, rimW: 3 });
  // tezgâhta renkli mallar
  const rr = rng(seed + 9);
  for (let i = 0; i < 5; i++) P.toneShape(x, P.ellipsePts(cx - w * 0.36 + i * w * 0.18, gy - h * 0.4, 16 * k, 13 * k, 14), { base: rr.pick(['#E8B04A', '#D8503A', '#9ED64A', '#F07BB2', '#F2D08A']), rim: false, shadowW: 0.3, dabs: 0, highlights: 1, seed: seed + 20 + i });
}
function bunting(x, anchors, seed) {
  const r = rng(seed);
  for (let s = 0; s < anchors.length - 1; s++) {
    const [ax, ay] = anchors[s], [bx, by] = anchors[s + 1];
    const line = []; for (let k = 0; k <= 20; k++) { const u = k / 20; line.push([lerp(ax, bx, u), lerp(ay, by, u) + Math.sin(u * Math.PI) * 40]); }
    x.strokeStyle = '#6B3E26'; x.lineWidth = 2.5; x.beginPath(); line.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke();
    for (let k = 1; k < 20; k += 2) {
      const p = line[k], q = line[k + 1];
      const flag = [[p[0], p[1]], [q[0], q[1]], [lerp(p[0], q[0], 0.5), lerp(p[1], q[1], 0.5) + 30]];
      x.fillStyle = r.pick(['#D8503A', '#F2D08A', '#3FB7C9', '#9ED64A', '#F07BB2', '#FBF7EE']); x.fill(P.pathOf(flag));
    }
  }
}

// ---------------- tezgâh ----------------
const STALL = { x0: 548, x1: 930, top: 2316, ground: 2576, awnY: 2002, scaleX: 690 };
function stallStatic(x) {
  const S = STALL;
  // direkler
  for (const px of [S.x0 + 4, S.x1 - 4]) P.toneShape(x, P.rectPts(px - 11, S.awnY - 10, 22, S.ground - S.awnY + 10), { base: '#8A5532', dark: '#4E2C18', light: '#B9804E', seed: px, shadowW: 0.3, dabs: 3, rimW: 3, strokeAng: Math.PI / 2 });
  // tezgâh gövdesi
  P.toneShape(x, P.rectPts(S.x0, S.top + 14, S.x1 - S.x0, S.ground - S.top - 14), { base: '#9A6038', dark: '#5A3020', light: '#C4864E', seed: 1430, shadowW: 0.12, lightW: 0.06, dabs: 8, rimW: 4, strokeAng: 0 });
  // tahta derzleri
  x.strokeStyle = rgba('#4A2618', 0.5); x.lineWidth = 3;
  for (let i = 1; i < 4; i++) { const yy = S.top + 14 + i * (S.ground - S.top - 14) / 4; x.beginPath(); x.moveTo(S.x0 + 6, yy); x.lineTo(S.x1 - 6, yy + 2); x.stroke(); }
  // kilim örtü (tezgâh önüne sarkan, geometrik desen — yazı yok)
  const kx0 = S.x0 + 40, kx1 = S.x1 - 40, ky0 = S.top + 16, ky1 = S.top + 150;
  P.toneShape(x, P.rectPts(kx0, ky0, kx1 - kx0, ky1 - ky0), { base: '#B8342E', dark: '#7A1E2A', light: '#D85A44', seed: 1431, shadowW: 0.1, lightW: 0.05, dabs: 4, rim: false, strokeAng: 0 });
  x.save(); x.beginPath(); x.rect(kx0, ky0, kx1 - kx0, ky1 - ky0); x.clip();
  for (let i = 0; i < 6; i++) {
    const cx = kx0 + 30 + i * (kx1 - kx0 - 60) / 5, cy = (ky0 + ky1) / 2;
    const dm = [[cx, cy - 40], [cx + 26, cy], [cx, cy + 40], [cx - 26, cy]];
    x.fillStyle = '#C88A3E'; x.fill(P.pathOf(dm));
    x.fillStyle = '#7A1E2A'; x.fill(P.pathOf(dm.map(([a, b]) => [cx + (a - cx) * 0.55, cy + (b - cy) * 0.55])));
    x.fillStyle = '#D8A050'; x.fill(P.pathOf(dm.map(([a, b]) => [cx + (a - cx) * 0.2, cy + (b - cy) * 0.2])));
  }
  x.fillStyle = '#C88A3E'; x.fillRect(kx0, ky0 + 8, kx1 - kx0, 5); x.fillRect(kx0, ky1 - 14, kx1 - kx0, 5);
  x.restore();
  // püsküller
  for (let k = kx0 + 8; k < kx1; k += 18) P.stroke(x, k, ky1, k + 1, ky1 + 18, 5, '#F2D08A', k, { detail: 0, taper1: 0.4 });
  // tezgâh üstü
  P.toneShape(x, P.rectPts(S.x0 - 14, S.top, S.x1 - S.x0 + 28, 22), { base: '#C4864E', dark: '#7A4A2A', light: '#E8B07A', seed: 1432, shadowW: 0.3, dabs: 4, rimW: 3, strokeAng: 0 });
  // tente: çizgili, dalgalı alt kenar
  const aw0 = S.x0 - 50, aw1 = S.x1 + 50, ay0 = S.awnY - 70, ay1 = S.awnY + 40;
  const awn = [[aw0 + 30, ay0], [aw1 - 30, ay0], [aw1, ay1]];
  const nS = 9;
  for (let i = nS; i >= 0; i--) { const u = i / nS; const sx = lerp(aw1, aw0, u); awn.push([sx, ay1 + (i % 2 ? 0 : 0)]); }
  // şeritler
  for (let i = 0; i < nS; i++) {
    const u0 = i / nS, u1 = (i + 1) / nS;
    const top0 = lerp(aw0 + 30, aw1 - 30, u0), top1 = lerp(aw0 + 30, aw1 - 30, u1);
    const b0 = lerp(aw0, aw1, u0), b1 = lerp(aw0, aw1, u1);
    const sc = [];
    sc.push([top0, ay0], [top1, ay0], [b1, ay1]);
    for (let k = 0; k <= 8; k++) { const a = k / 8; sc.push([lerp(b1, b0, a), ay1 + Math.sin(a * Math.PI) * 26]); }
    const col = i % 2 ? '#F4E6CC' : '#C8423A';
    P.toneShape(x, sc, { base: col, dark: C.coolShadow(col, 0.18), light: C.warmLight(col, 0.12), seed: 1440 + i, lightAng: -2.0, shadowW: 0.12, lightW: 0.06, dabs: 3, rimW: 3, strokeAng: Math.PI / 2 });
  }
  // tezgâhın dibinde testi ve çuval; ön planda çimen tutamları ve çiçekler
  jar(x, 498, S.ground + 6, 1.0, '#C8742F', 1433);
  jar(x, 966, S.ground + 4, 0.8, '#A4522A', 1434);
  P.toneShape(x, P.blobPts(1010, S.ground - 30, 46, 38, 4, 0.12, 22), { base: '#D8B07A', dark: '#9A7050', light: '#F2D4A0', seed: 1435, shadowW: 0.22, dabs: 2, rimW: 3 });
  const r = rng(1436);
  for (let i = 0; i < 9; i++) {
    const fx = r.pick([r.range(-40, 220), r.range(800, 1120)]), fy = r.range(2690, 2830);
    R.grass(x, fx, fy, r.range(70, 110), 1437 + i, { n: 8, c1: '#3E8E4A', c2: '#86C850' });
    if (r.chance(0.6)) R.flower(x, fx + r.range(-20, 20), fy - r.range(60, 90), r.range(18, 26), 1450 + i, { color: r.pick(['#FBF6FF', '#FFE3EE', '#FFF4D6']) });
  }
}
function jar(x, cx, gy, k, col, seed) {
  const h = 110 * k, w = 70 * k;
  const pts = P.smoothPts([[cx - w * 0.22, gy - h], [cx + w * 0.22, gy - h], [cx + w * 0.18, gy - h * 0.86], [cx + w * 0.5, gy - h * 0.55], [cx + w * 0.36, gy - h * 0.08], [cx, gy], [cx - w * 0.36, gy - h * 0.08], [cx - w * 0.5, gy - h * 0.55], [cx - w * 0.18, gy - h * 0.86]], true, 6);
  P.toneShape(x, pts, { base: col, dark: C.coolShadow(col, 0.22), light: C.warmLight(col, 0.18), seed, shadowW: 0.2, lightW: 0.12, dabs: 3, rimW: 3, strokeAng: Math.PI / 2 });
  x.strokeStyle = rgba('#F2D08A', 0.8); x.lineWidth = 3 * k; x.beginPath(); x.ellipse(cx, gy - h * 0.55, w * 0.46, h * 0.05, 0, 0, Math.PI); x.stroke();
}

module.exports = { OX, OY, WW, WH, GATE, ROAD, roadAt, roadW, roadParamNear, worldCanvas, STALL, MT, ridgeX };
