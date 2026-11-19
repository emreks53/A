// Akrilik boya ilkelleri (Atölye Stil Kataloğu S-042 "Akrilik"):
// doygun renkler, düz uçlu fırçanın keskin kenarlı darbeleri, karışmadan üst üste binen düz ton katları,
// darbe kenarında ince boya sırtı, kıl izleri, yer yer görünen turuncu-kırmızı astar ve tuval bezi dokusu.
'use strict';
const { createCanvas, Path2D } = require('@napi-rs/canvas');
const C = require('./core');
const { rng, clamp, lerp, mix, shade, rgba, noise2, fbm, TAU } = C;

const UNDERPAINT = '#E2582E';
const PAL = {
  cobaltDeep: '#1A3E99', cobalt: '#2457B8', cerulean: '#2E86CE', turquoise: '#3FB7C9', skyLight: '#9ED8E6', skyPale: '#CDEBEE',
  phthalo: '#0B5A40', emerald: '#2EAD56', green: '#3E9B4F', pistachio: '#9ED64A', leaf: '#2F8A45',
  lavender: '#A9A3CC', lilac: '#8C7FC0', mauve: '#F07BB2', rose: '#E86A8E', pinkPale: '#F6C1D3',
  underpaint: UNDERPAINT, ochre: '#E8B04A', sand: '#F2D08A', sandPale: '#F7E3B2', earth: '#C8742F', rust: '#A4522A', umber: '#6B3A24',
  cream: '#FFF4DF', white: '#FBF7EE', ink: '#1D1B2E',
  night: '#1B1E4B', nightDeep: '#121335', ultramarine: '#23307A', purple: '#4B2E6F', lamp: '#FFB84D', lampCore: '#FFE9A8',
  gold: '#E8B23A', goldDeep: '#B77F1E', goldLight: '#FFE08A',
  skin: '#E2A37C', skinShadow: '#B9715A', skinLight: '#F3C4A0',
};

// ---------- nokta dizileri ----------
function pathOf(pts, closed = true) {
  const p = new Path2D();
  if (!pts.length) return p;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) p.lineTo(pts[i][0], pts[i][1]);
  if (closed) p.closePath();
  return p;
}
function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function inPoly(x, y, pts) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function ellipsePts(cx, cy, rx, ry, n = 48, rot = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
}
// düzensiz yuvarlak leke
function blobPts(cx, cy, rx, ry, seed = 1, wob = 0.12, n = 40) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + wob * (noise2(Math.cos(a) * 1.6 + seed, Math.sin(a) * 1.6 - seed, seed) - 0.5) * 2;
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return out;
}
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function roundRectPts(x, y, w, h, r, n = 6) {
  r = Math.min(r, w / 2, h / 2);
  const out = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * (Math.PI / 2); out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(x + w - r, y + r, -Math.PI / 2); corner(x + w - r, y + h - r, 0); corner(x + r, y + h - r, Math.PI / 2); corner(x + r, y + r, Math.PI);
  return out;
}
// Catmull-Rom: kontrol noktalarından yumuşak çokgen
function smoothPts(ctrl, closed = true, per = 10, tension = 0.5) {
  const out = []; const n = ctrl.length;
  const get = (i) => (closed ? ctrl[(i + n) % n] : ctrl[clamp(i, 0, n - 1)]);
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      const m1x = (p2[0] - p0[0]) * tension, m1y = (p2[1] - p0[1]) * tension;
      const m2x = (p3[0] - p1[0]) * tension, m2y = (p3[1] - p1[1]) * tension;
      const a = 2 * t3 - 3 * t2 + 1, b = t3 - 2 * t2 + t, c = -2 * t3 + 3 * t2, d = t3 - t2;
      out.push([a * p1[0] + b * m1x + c * p2[0] + d * m2x, a * p1[1] + b * m1y + c * p2[1] + d * m2y]);
    }
  }
  if (!closed) out.push(ctrl[n - 1]);
  return out;
}
function xform(pts, { x = 0, y = 0, rot = 0, sx = 1, sy = sx, ox = 0, oy = 0 } = {}) {
  const c = Math.cos(rot), s = Math.sin(rot);
  return pts.map(([px, py]) => { const X = (px - ox) * sx, Y = (py - oy) * sy; return [x + X * c - Y * s, y + X * s + Y * c]; });
}
function translatePts(pts, dx, dy) { return pts.map(([x, y]) => [x + dx, y + dy]); }
// kalın çizgi -> çokgen (değişken genişlik)
function ribbonPts(line, wFn) {
  const L = [], R = [];
  for (let i = 0; i < line.length; i++) {
    const p = line[i], a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const w = (typeof wFn === 'function' ? wFn(i / (line.length - 1)) : wFn) / 2;
    L.push([p[0] - dy * w, p[1] + dx * w]); R.push([p[0] + dy * w, p[1] - dx * w]);
  }
  return L.concat(R.reverse());
}

// ---------- dokular ----------
let _bristle = null, _weave = null, _paper = null;
// kıl izi dokusu: orta gri üstünde yatay ince çizgiler (overlay ile kullanılır, gri=etkisiz)
function bristleTile() {
  if (_bristle) return _bristle;
  const S = 512, cv = createCanvas(S, S), x = cv.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, S, S);
  const r = rng(77);
  for (let i = 0; i < 900; i++) {
    const y = r.range(0, S), x0 = r.range(-S * 0.2, S), len = r.range(40, 260), v = r.range(-1, 1);
    const g = Math.round(128 + v * 34);
    x.strokeStyle = `rgba(${g},${g},${g},${r.range(0.35, 0.8)})`;
    x.lineWidth = r.range(0.6, 2.2);
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y + r.range(-1.5, 1.5)); x.stroke();
    if (x0 + len > S) { x.beginPath(); x.moveTo(x0 - S, y); x.lineTo(x0 + len - S, y); x.stroke(); }
  }
  // darbe sırtları: kısa açık/koyu çift çizgiler
  for (let i = 0; i < 140; i++) {
    const y = r.range(0, S), x0 = r.range(0, S), len = r.range(30, 120);
    x.strokeStyle = 'rgba(190,190,190,0.55)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
    x.strokeStyle = 'rgba(70,70,70,0.45)'; x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(x0, y + 2); x.lineTo(x0 + len, y + 2); x.stroke();
  }
  _bristle = cv; return cv;
}
// tuval bezi (çözgü-atkı)
function weaveTile() {
  if (_weave) return _weave;
  const S = 384, cv = createCanvas(S, S), x = cv.getContext('2d');
  const img = x.createImageData(S, S), d = img.data;
  const cell = 4.2;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / cell, v = j / cell;
    const iu = Math.floor(u), iv = Math.floor(v), fu = u - iu, fv = v - iv;
    const over = (iu + iv) % 2 === 0; // hangi iplik üstte
    const th = over ? Math.sin(fv * Math.PI) : Math.sin(fu * Math.PI);
    const n = (C.hash2(i, j, 5) - 0.5) * 22 + (noise2(i / 23, j / 23, 9) - 0.5) * 18;
    const g = clamp(118 + th * 34 + n, 0, 255);
    const k = (j * S + i) * 4; d[k] = d[k + 1] = d[k + 2] = g; d[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  _weave = cv; return cv;
}

// "rgba(...)"/"rgb(...)" ya da onaltılık renk → [onaltılık, alfa]
function splitColor(c) {
  if (typeof c === 'string' && c.startsWith('rgb')) {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) { const v = m[1].split(',').map((x) => parseFloat(x)); return [C.rgb2hex([v[0], v[1], v[2]]), v.length > 3 ? v[3] : 1]; }
  }
  return [c, 1];
}

// ---------- fırça darbesi ----------
// Düz uçlu fırça darbesi çokgeni: uzun kenarlar hafif dalgalı, uçlar köşeli ve tırtıklı.
function brushPts(x0, y0, x1, y1, w, seed = 1, o = {}) {
  const r = rng(seed);
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, dx = (x1 - x0) / L, dy = (y1 - y0) / L, nx = -dy, ny = dx;
  const k = Math.max(3, Math.round(L / 14));
  const taper0 = o.taper0 ?? 1, taper1 = o.taper1 ?? 1, wob = o.wob ?? 0.06;
  const side = (sgn) => {
    const out = [];
    for (let i = 0; i <= k; i++) {
      const t = i / k;
      const tw = lerp(taper0, taper1, t) * (1 + wob * (noise2(t * 3 + seed, sgn * 7, seed) - 0.5) * 2);
      const hw = (w / 2) * tw;
      out.push([x0 + dx * L * t + nx * hw * sgn, y0 + dy * L * t + ny * hw * sgn]);
    }
    return out;
  };
  const A = side(1), B = side(-1).reverse();
  // uç tırtıkları
  const teeth = (px, py, dir, hw, n) => {
    const out = [];
    for (let i = 1; i < n; i++) {
      const t = i / n * 2 - 1;
      const ext = r.range(-0.15, 0.35) * Math.min(w, 26);
      out.push([px + nx * hw * t * dir + dx * ext * dir, py + ny * hw * t * dir + dy * ext * dir]);
    }
    return out;
  };
  const endT = teeth(x1, y1, 1, (w / 2) * taper1, r.int(3, 5)).reverse();
  const startT = teeth(x0, y0, -1, (w / 2) * taper0, r.int(2, 4));
  return A.concat(endT, B, startT.reverse());
}
// tek darbe çiz: gövde + kıl izleri + kenar sırtı (+ isteğe bağlı kuru uç)
function stroke(ctx, x0, y0, x1, y1, w, color, seed = 1, o = {}) {
  const [hex, al] = splitColor(color);
  if (al < 1) { ctx.save(); ctx.globalAlpha *= al; const res = stroke(ctx, x0, y0, x1, y1, w, hex, seed, o); ctx.restore(); return res; }
  const r = rng(seed * 7 + 3);
  const pts = brushPts(x0, y0, x1, y1, w, seed, o);
  ctx.fillStyle = color; ctx.fill(pathOf(pts));
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, dx = (x1 - x0) / L, dy = (y1 - y0) / L, nx = -dy, ny = dx;
  const detail = o.detail ?? 1;
  if (detail > 0 && w > 5) {
    // kıl izleri
    const nb = Math.min(9, Math.round((w / 6) * detail));
    for (let i = 0; i < nb; i++) {
      const off = r.range(-0.42, 0.42) * w, a = r.range(0, 0.35), b = r.range(0.6, 1.02);
      const light = r.chance(0.5);
      ctx.strokeStyle = light ? rgba(shade(color, 0.07), 0.55) : rgba(shade(color, -0.07, 0.03), 0.5);
      ctx.lineWidth = r.range(0.7, Math.max(1, w * 0.07));
      ctx.beginPath();
      ctx.moveTo(x0 + dx * L * a + nx * off, y0 + dy * L * a + ny * off);
      ctx.lineTo(x0 + dx * L * b + nx * off, y0 + dy * L * b + ny * off);
      ctx.stroke();
    }
    // kenar sırtı: ışığa bakan kenarda ince açık çizgi, karşıda ince koyu
    if (o.ridge !== false) {
      const s = ny < 0 ? 1 : -1; // üst kenar
      const hw = w * 0.46;
      ctx.lineWidth = Math.max(0.8, w * 0.045);
      ctx.strokeStyle = rgba(shade(color, 0.13), 0.5);
      ctx.beginPath(); ctx.moveTo(x0 + nx * hw * s + dx * w * 0.1, y0 + ny * hw * s + dy * w * 0.1); ctx.lineTo(x1 + nx * hw * s - dx * w * 0.1, y1 + ny * hw * s - dy * w * 0.1); ctx.stroke();
      ctx.strokeStyle = rgba(shade(color, -0.16, 0.05), 0.35);
      ctx.beginPath(); ctx.moveTo(x0 - nx * hw * s, y0 - ny * hw * s); ctx.lineTo(x1 - nx * hw * s, y1 - ny * hw * s); ctx.stroke();
    }
  }
  // kuru fırça ucu: uçtan taşan ince kıl demetleri
  if (o.dry) {
    const n = r.int(3, 7);
    ctx.strokeStyle = color; ctx.lineCap = 'butt';
    for (let i = 0; i < n; i++) {
      const off = r.range(-0.45, 0.45) * w, ext = r.range(0.05, 0.35) * L;
      ctx.lineWidth = r.range(0.8, w * 0.12);
      ctx.beginPath(); ctx.moveTo(x1 - dx * 4 + nx * off, y1 - dy * 4 + ny * off); ctx.lineTo(x1 + dx * ext + nx * off, y1 + dy * ext + ny * off); ctx.stroke();
    }
  }
  return pts;
}
// eğri boyunca darbe (bulut kıvrımı, yaprak, sap)
function curveStroke(ctx, line, w, color, seed = 1, o = {}) {
  const [hex, al] = splitColor(color);
  if (al < 1) { ctx.save(); ctx.globalAlpha *= al; const res = curveStroke(ctx, line, w, hex, seed, o); ctx.restore(); return res; }
  const r = rng(seed);
  const wf = typeof w === 'function' ? w : (t) => w * (o.taper ? Math.sin(Math.PI * clamp(t * 0.9 + 0.05)) ** 0.5 : 1) * (1 + (noise2(t * 4, seed, 3) - 0.5) * 0.12);
  const pts = ribbonPts(line, wf);
  ctx.fillStyle = color; ctx.fill(pathOf(pts));
  if ((o.detail ?? 1) > 0) {
    const nb = o.bristles ?? 4;
    for (let i = 0; i < nb; i++) {
      const off = r.range(-0.38, 0.38), a = r.range(0, 0.3), b = r.range(0.65, 1);
      const sub = [];
      for (let k = Math.floor(a * (line.length - 1)); k <= Math.floor(b * (line.length - 1)); k++) {
        const p = line[k], q = line[Math.min(line.length - 1, k + 1)], pp = line[Math.max(0, k - 1)];
        let dx = q[0] - pp[0], dy = q[1] - pp[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
        const ww = wf(k / (line.length - 1));
        sub.push([p[0] - dy * ww * off, p[1] + dx * ww * off]);
      }
      if (sub.length < 2) continue;
      ctx.strokeStyle = r.chance(0.5) ? rgba(shade(color, 0.08), 0.5) : rgba(shade(color, -0.08), 0.45);
      ctx.lineWidth = r.range(0.6, 1.6);
      ctx.beginPath(); ctx.moveTo(sub[0][0], sub[0][1]); for (const p of sub) ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
  }
  return pts;
}

// ---------- bölgeyi darbelerle doldurma ----------
// Bir alanı yönlü düz darbelerle boyar; renk konuma göre colorFn(x,y,r) ile seçilir.
function fillStrokes(ctx, clip, box, o = {}) {
  const r = rng(o.seed ?? 11);
  const ang = o.angle ?? 0, ca = Math.cos(ang), sa = Math.sin(ang);
  const wMin = o.wMin ?? 18, wMax = o.wMax ?? 34, lMin = o.lMin ?? 60, lMax = o.lMax ?? 200;
  const gap = o.rowGap ?? 0.62;
  ctx.save();
  if (clip) ctx.clip(clip instanceof Path2D ? clip : pathOf(clip));
  // yerel koordinatta satırlar
  const cx = box.x0 + box.w / 2, cy = box.y0 + box.h / 2;
  const R = Math.hypot(box.w, box.h) / 2 + wMax;
  for (let v = -R; v < R; v += ((wMin + wMax) / 2) * gap) {
    let u = -R - r.range(0, lMax);
    while (u < R) {
      const len = r.range(lMin, lMax), w = r.range(wMin, wMax);
      const vv = v + r.range(-3, 3);
      const a0 = ang + r.range(-1, 1) * (o.jitterAng ?? 0.04);
      const mx = cx + (u + len / 2) * ca - vv * sa, my = cy + (u + len / 2) * sa + vv * ca;
      const hx = Math.cos(a0) * len / 2, hy = Math.sin(a0) * len / 2;
      if (mx > box.x0 - len && mx < box.x1 + len && my > box.y0 - w * 2 && my < box.y1 + w * 2) {
        const col = o.colorFn ? o.colorFn(mx, my, r) : (o.color || '#888');
        if (col) stroke(ctx, mx - hx, my - hy, mx + hx, my + hy, w, col, r.int(1, 1e9), { detail: o.detail ?? 1, dry: r.chance(o.dry ?? 0.08), ridge: o.ridge });
      }
      u += len * r.range(o.overlapMin ?? 0.72, o.overlapMax ?? 0.98);
    }
  }
  ctx.restore();
}
// Bant geçişli alan (gök gibi): renkler eksen boyunca sıralanır, sınırlar darbe darbe iç içe geçer.
function bandFill(ctx, clip, box, colors, o = {}) {
  const axis = o.axis ?? Math.PI / 2; // bantların dizildiği yön (varsayılan yukarıdan aşağı)
  const ax = Math.cos(axis), ay = Math.sin(axis);
  const p0 = Math.min(...[[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]].map(([x, y]) => x * ax + y * ay));
  const p1 = Math.max(...[[box.x0, box.y0], [box.x1, box.y0], [box.x0, box.y1], [box.x1, box.y1]].map(([x, y]) => x * ax + y * ay));
  const stops = o.stops || colors.map((_, i) => i / (colors.length - 1));
  const vary = o.vary ?? 0.035;
  fillStrokes(ctx, clip, box, {
    ...o,
    angle: o.angle ?? axis - Math.PI / 2,
    colorFn: (x, y, r) => {
      let t = ((x * ax + y * ay) - p0) / (p1 - p0);
      t = clamp(t + r.range(-1, 1) * (o.mixJitter ?? 0.07));
      let i = 0; while (i < stops.length - 2 && t > stops[i + 1]) i++;
      const local = (t - stops[i]) / (stops[i + 1] - stops[i]);
      // düz ton katları: yumuşak geçiş yerine en yakın tona yuvarla (biraz karışık)
      const base = local < (o.split ?? 0.5) ? colors[i] : colors[i + 1];
      return shade(base, r.range(-vary, vary), r.range(-0.03, 0.03), r.range(-0.006, 0.006));
    },
  });
}

// ---------- tonlu biçim (nesne gölgelendiricisi) ----------
// Bir biçimi: astar kenarı + temel renk + ışık ve gölge hilalleri (keskin, darbe kenarlı) + kıl dokusu ile boyar.
// lightAng: ışığın GELDİĞİ yön (radyan; -2.3 ≈ sol üst)
function toneShape(ctx, pts, o = {}) {
  const b = bbox(pts), size = Math.max(b.w, b.h);
  const base = o.base || '#888';
  const dark = o.dark || C.coolShadow(base, 0.2);
  const light = o.light || C.warmLight(base, 0.14);
  const la = o.lightAng ?? -2.3;
  const lx = Math.cos(la), ly = Math.sin(la);
  const seed = o.seed ?? 5;
  const r = rng(seed);
  const path = pathOf(pts);
  // 1) astar kenarı (biçimin çevresinde yer yer görünen turuncu-kırmızı)
  if (o.rim !== false) {
    ctx.save();
    ctx.strokeStyle = o.rimColor || UNDERPAINT;
    ctx.lineWidth = o.rimW ?? Math.max(2.5, Math.min(9, size * 0.022));
    ctx.lineJoin = 'round';
    const dashes = []; for (let i = 0; i < 10; i++) dashes.push(r.range(size * 0.05, size * 0.4), r.range(size * 0.04, size * 0.25));
    ctx.setLineDash(dashes); ctx.lineDashOffset = r.range(0, 300);
    ctx.translate(r.range(-1.5, 1.5) - lx * 1.2, r.range(-1.5, 1.5) - ly * 1.2);
    ctx.stroke(path);
    ctx.restore();
  }
  // 2) temel renk
  ctx.fillStyle = base; ctx.fill(path);
  ctx.save(); ctx.clip(path);
  // 3) ışık hilali
  const lw = (o.lightW ?? 0.12) * size, sw = (o.shadowW ?? 0.12) * size;
  if (lw > 0.5) {
    const p2 = multiPath([pts, translatePts(pts, -lx * lw, -ly * lw)]);
    ctx.fillStyle = light; ctx.fill(p2, 'evenodd');
  }
  // 4) gölge hilali
  let shadowInner = null;
  if (sw > 0.5) {
    // aydınlık çekirdek: biçimin küçültülüp ışığa doğru kaydırılmış kopyası; gölge = biçim - çekirdek
    const ks = o.coreScale ?? 0.9;
    shadowInner = pts.map(([x, y]) => [b.cx + (x - b.cx) * ks + lx * sw, b.cy + (y - b.cy) * ks + ly * sw]);
    const p3 = multiPath([pts, shadowInner]);
    ctx.fillStyle = dark; ctx.fill(p3, 'evenodd');
  }
  // 5) ton sınırını darbe darbe kır
  const sAng = o.strokeAng ?? (la + Math.PI / 2);
  const nd = o.dabs ?? Math.round(clamp(size / 22, 4, 28));
  const dabW = o.dabW ?? clamp(size * 0.055, 3, 22);
  if (shadowInner && nd > 0) {
    let placed = 0, tries = 0;
    while (placed < nd && tries < nd * 8) {
      tries++;
      const q = shadowInner[r.int(0, shadowInner.length - 1)];
      if (!inPoly(q[0], q[1], pts)) continue;
      const len = dabW * r.range(1.2, 4.2), a = sAng + r.range(-0.3, 0.3);
      const off = r.range(-0.5, 0.5) * dabW;
      const mx = q[0] + lx * off + Math.cos(a) * r.range(-0.4, 0.4) * len, my = q[1] + ly * off + Math.sin(a) * r.range(-0.4, 0.4) * len;
      const col = r.chance(0.5) ? dark : base;
      stroke(ctx, mx - Math.cos(a) * len / 2, my - Math.sin(a) * len / 2, mx + Math.cos(a) * len / 2, my + Math.sin(a) * len / 2, dabW * r.range(0.4, 0.85), col, r.int(1, 1e9), { detail: 0.6, ridge: true, taper1: r.range(0.55, 1), dry: r.chance(0.2) });
      placed++;
    }
  }
  // 6) ışıklı yanda vurgu darbeleri
  const nh = o.highlights ?? Math.round(clamp(size / 60, 1, 8));
  for (let i = 0; i < nh; i++) {
    const t = r.range(0.15, 0.85);
    const px = lerp(b.x0, b.x1, 0.5 + lx * r.range(0.15, 0.35) + r.range(-0.2, 0.2));
    const py = lerp(b.y0, b.y1, 0.5 + ly * r.range(0.15, 0.35) + r.range(-0.2, 0.2));
    if (!inPoly(px, py, pts)) continue;
    const len = dabW * r.range(1.5, 3), a = sAng + r.range(-0.3, 0.3);
    stroke(ctx, px - Math.cos(a) * len / 2, py - Math.sin(a) * len / 2, px + Math.cos(a) * len / 2, py + Math.sin(a) * len / 2, dabW * r.range(0.45, 0.8), o.hi || shade(light, 0.06), r.int(1, 1e9), { detail: 0.5 });
  }
  // 7) kıl dokusu
  if ((o.texture ?? 0.55) > 0) texture(ctx, b, o.texAng ?? sAng, o.texture ?? 0.55, o.texScale ?? clamp(size / 500, 0.35, 1.4));
  ctx.restore();
  // 8) isteğe bağlı ince kontur (gölge tarafında koyu)
  if (o.edge) {
    ctx.save(); ctx.strokeStyle = o.edge; ctx.lineWidth = o.edgeW ?? 2; ctx.lineJoin = 'round'; ctx.globalAlpha = o.edgeA ?? 0.6; ctx.stroke(path); ctx.restore();
  }
  return path;
}
// geçerli kırpma içine kıl dokusu (overlay)
function texture(ctx, b, ang, alpha = 0.5, scale = 1) {
  const pat = ctx.createPattern(bristleTile(), 'repeat');
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = alpha;
  ctx.translate(b.cx, b.cy); ctx.rotate(ang); ctx.scale(scale, scale);
  const R = (Math.hypot(b.w, b.h) / 2 + 4) / scale;
  ctx.fillStyle = pat; ctx.fillRect(-R, -R, R * 2, R * 2);
  ctx.restore();
}
// düz renkli basit biçim (dokulu, gölgesiz) — küçük ayrıntılar için
function flat(ctx, pts, color, o = {}) {
  const path = pathOf(pts, o.closed !== false);
  ctx.fillStyle = color; ctx.fill(path);
  if (o.texture) { const b = bbox(pts); ctx.save(); ctx.clip(path); texture(ctx, b, o.texAng ?? 0, o.texture, o.texScale ?? 0.6); ctx.restore(); }
  return path;
}


// Birden çok çokgenin birleşimini tek biçim gibi boya (bulut, ağaç tacı, yuvarlak öbekler):
// astar kenarı + temel + ışık/gölge (iç içe kırpma ile) + sınırda darbeler + kıl dokusu.
function polyArea(q) { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] - q[i][0]) * (q[j][1] + q[i][1]); return a / 2; }
// çokgenleri tek yolda birleştir (hepsi aynı dönüş yönünde; addPath'in kırpma hatasından kaçınır)
function unionPath(list) {
  const p = new Path2D();
  for (let q of list) { if (!q.length) continue; if (polyArea(q) < 0) q = q.slice().reverse(); p.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) p.lineTo(q[k][0], q[k][1]); p.closePath(); }
  return p;
}
// birden çok çokgen tek yolda (dönüş yönüne dokunmadan; evenodd için)
function multiPath(lists) {
  const p = new Path2D();
  for (const q of lists) { if (!q.length) continue; p.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) p.lineTo(q[k][0], q[k][1]); p.closePath(); }
  return p;
}
function toneUnion(ctx, list, o = {}) {
  const path = unionPath(list);
  const all = list.flat(); const b = bbox(all), size = o.size ?? Math.max(b.w, b.h);
  const base = o.base || '#888', dark = o.dark || C.coolShadow(base, 0.2), light = o.light || C.warmLight(base, 0.14);
  const la = o.lightAng ?? -2.3, lx = Math.cos(la), ly = Math.sin(la);
  const r = rng(o.seed ?? 7);
  if (o.rim !== false) {
    ctx.save(); ctx.strokeStyle = o.rimColor || UNDERPAINT; ctx.lineWidth = o.rimW ?? Math.max(2.5, Math.min(8, size * 0.02)); ctx.lineJoin = 'round';
    const d = []; for (let i = 0; i < 8; i++) d.push(r.range(size * 0.04, size * 0.3), r.range(size * 0.03, size * 0.2));
    ctx.setLineDash(d); ctx.translate(-lx * 1.5, -ly * 1.5);
    for (const q of list) ctx.stroke(pathOf(q));
    ctx.restore();
  }
  const sb = (o.shadowW ?? 0.14) * size, la2 = (o.lightW ?? 0.08) * size;
  ctx.save();
  ctx.clip(path);
  ctx.fillStyle = dark; ctx.fill(path);
  ctx.translate(lx * sb, ly * sb); ctx.clip(path); ctx.translate(-lx * sb, -ly * sb);
  ctx.fillStyle = light; ctx.fill(path);
  ctx.translate(-lx * la2, -ly * la2); ctx.fillStyle = base; ctx.fill(path); ctx.translate(lx * la2, ly * la2);
  ctx.restore();
  ctx.save(); ctx.clip(path);
  // ton sınırında darbeler: her parçanın gölge kenarına
  const nd = o.dabs ?? Math.round(clamp(size / 30, 3, 24));
  const dabW = o.dabW ?? clamp(size * 0.045, 3, 18);
  const sAng = o.strokeAng ?? 0;
  for (let i = 0; i < nd; i++) {
    const q = list[r.int(0, list.length - 1)]; const qb = bbox(q);
    const a0 = la + Math.PI + r.range(-1.1, 1.1);
    const px = qb.cx + Math.cos(a0) * qb.w * 0.5 * r.range(0.45, 0.8), py = qb.cy + Math.sin(a0) * qb.h * 0.5 * r.range(0.45, 0.8);
    const len = dabW * r.range(1.5, 4), a = sAng + r.range(-0.35, 0.35);
    stroke(ctx, px - Math.cos(a) * len / 2, py - Math.sin(a) * len / 2, px + Math.cos(a) * len / 2, py + Math.sin(a) * len / 2, dabW * r.range(0.5, 0.9), r.chance(0.5) ? dark : base, r.int(1, 1e9), { detail: 0.5, taper1: r.range(0.5, 1) });
  }
  const nh = o.highlights ?? Math.round(clamp(size / 50, 2, 10));
  for (let i = 0; i < nh; i++) {
    const q = list[r.int(0, list.length - 1)]; const qb = bbox(q);
    const px = qb.cx + lx * qb.w * r.range(0.1, 0.32), py = qb.cy + ly * qb.h * r.range(0.1, 0.32);
    const len = dabW * r.range(1.4, 3.2), a = sAng + r.range(-0.4, 0.4);
    stroke(ctx, px - Math.cos(a) * len / 2, py - Math.sin(a) * len / 2, px + Math.cos(a) * len / 2, py + Math.sin(a) * len / 2, dabW * r.range(0.45, 0.8), o.hi || shade(light, 0.05), r.int(1, 1e9), { detail: 0.4 });
  }
  if ((o.texture ?? 0.5) > 0) texture(ctx, b, o.texAng ?? sAng, o.texture ?? 0.5, o.texScale ?? clamp(size / 500, 0.35, 1.4));
  ctx.restore();
  return path;
}
// yumuşak ışıma (ekran karışımı)
function glow(ctx, x, y, r, color, a = 0.6, mode = 'screen') {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.4, rgba(color, a * 0.45)); g.addColorStop(1, rgba(color, 0));
  ctx.save(); ctx.globalCompositeOperation = mode; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}

// ---------- son işlem ----------
let _weaveFrame = null, _vignette = null;
function finish(ctx, o = {}) {
  const { W, H } = C;
  // tuval bezi dokusu (ekran uzayında sabit: gerçek tuval kımıldamaz)
  if (!_weaveFrame) {
    _weaveFrame = createCanvas(W, H);
    const x = _weaveFrame.getContext('2d');
    x.fillStyle = x.createPattern(weaveTile(), 'repeat'); x.fillRect(0, 0, W, H);
    // geniş ölçekli boya kalınlığı dalgalanması
    const img = x.getImageData(0, 0, W, H), d = img.data;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const k = (j * W + i) * 4;
      const n = (fbm(i / 180, j / 180, 3, 21) - 0.5) * 26;
      d[k] = d[k + 1] = d[k + 2] = clamp(d[k] + n, 0, 255);
    }
    x.putImageData(img, 0, 0);
  }
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = o.weave ?? 0.32;
  ctx.drawImage(_weaveFrame, 0, 0);
  ctx.restore();
  // saten parlama: sağ üstten geniş, yumuşak ışık
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = o.sheen ?? 1;
  const g = ctx.createLinearGradient(W, 0, 0, H);
  g.addColorStop(0, 'rgba(255,248,230,0.32)'); g.addColorStop(0.5, 'rgba(128,128,128,0)'); g.addColorStop(1, 'rgba(20,20,40,0.22)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // hafif köşe kararması
  if (!_vignette) {
    _vignette = createCanvas(W, H);
    const x = _vignette.getContext('2d');
    const rg = x.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.78);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(18,12,30,0.42)');
    x.fillStyle = rg; x.fillRect(0, 0, W, H);
  }
  ctx.save(); ctx.globalAlpha = o.vignette ?? 0.8; ctx.drawImage(_vignette, 0, 0); ctx.restore();
}

module.exports = {
  UNDERPAINT, PAL, pathOf, bbox, inPoly, ellipsePts, blobPts, rectPts, roundRectPts, smoothPts, xform, translatePts, ribbonPts,
  bristleTile, weaveTile, brushPts, stroke, curveStroke, fillStrokes, bandFill, toneShape, toneUnion, unionPath, multiPath, glow, texture, flat, finish,
};
