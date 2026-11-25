// Adam: sade, ayrıntısız ama doğru oranlı erkek figürü — daima profil, sağa bakar (S-042 Akrilik).
// Pozlar: ayakta (gövde/baş/kol + şema + organlar), oturan (gövde/baş), yakın (gövde/baş/önkol).
// Her pozun bütün parçaları AYNI boyut ve koordinat çerçevesindeki tuvallere boyanır; her parçanın
// pivotu döndüğü eklemdir. Önerilen çizim sırası: baş → gövde → kol (boyun yakanın altına girer).
'use strict';

const ADAM = {};
const ADAM_C = {
  skin: '#D49A72', hair: '#3A2A22', beard: '#3E2C23', shirt: '#2B5D78', pants: '#3A3640', shoe: '#4A2F22',
  lip: '#B0645A', iris: '#2A1A14',
};

// ---------------------------------------------------------------- geometri yardımcıları
// pts: [x, y, t?]  t = teğet ölçeği (0 = köşe, 1 = yumuşak). Yoğun çoklu çizgi döndürür.
function adamCurve(pts, closed = true, step = 2.5) {
  const n = pts.length, out = [];
  const P = (i) => (closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  const T = (i) => { const c = P(i), s = c[2] ?? 1, a = P(i - 1), b = P(i + 1); return [((b[0] - a[0]) / 6) * s, ((b[1] - a[1]) / 6) * s]; };
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const a = P(i), b = P(i + 1), ta = T(i), tb = T(i + 1);
    const c1x = a[0] + ta[0], c1y = a[1] + ta[1], c2x = b[0] - tb[0], c2y = b[1] - tb[1];
    const m = Math.max(2, Math.ceil((Math.hypot(c1x - a[0], c1y - a[1]) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(b[0] - c2x, b[1] - c2y)) / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, u = 1 - t;
      out.push([u * u * u * a[0] + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * b[0], u * u * u * a[1] + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * b[1]]);
    }
  }
  if (!closed) out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}
function adamPoly(poly, closed = true) {
  const p = new Path2D();
  for (let i = 0; i < poly.length; i++) i ? p.lineTo(poly[i][0], poly[i][1]) : p.moveTo(poly[i][0], poly[i][1]);
  if (closed) p.closePath();
  return p;
}
function adamBBox(poly, pad = 6) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [x, y] of poly) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
// biçim: {poly, path, bb}
function adamShape(pts, closed = true, step = 2.5) { const poly = adamCurve(pts, closed, step); return { poly, path: adamPoly(poly, closed), bb: adamBBox(poly) }; }
function adamShapeFromPoly(poly) { return { poly, path: adamPoly(poly), bb: adamBBox(poly) }; }
const adamMap = (pts, f) => pts.map((p) => { const q = f(p[0], p[1]); return p.length > 2 ? [q[0], q[1], p[2]] : q; });
// (x,y) noktasını (cx,cy) çevresinde döndür
const adamRot = (cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
// kalın çizgi (uzuv) dış hattı: eksen noktaları + yarı genişlikler; uçlar yuvarlak isteğe bağlı
function adamTube(axis, half, o = {}) {
  const n = axis.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = axis[Math.max(0, i - 1)], b = axis[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, w = half[i];
    L.push([axis[i][0] + nx * w, axis[i][1] + ny * w]);
    R.push([axis[i][0] - nx * w, axis[i][1] - ny * w]);
  }
  const pts = [];
  const cap = (c, p0, p1, steps, bulge) => { // p0'dan p1'e c çevresinde yay
    const a0 = Math.atan2(p0[1] - c[1], p0[0] - c[0]); let a1 = Math.atan2(p1[1] - c[1], p1[0] - c[0]);
    const r0 = Math.hypot(p0[0] - c[0], p0[1] - c[1]) * bulge;
    let d = a1 - a0; while (d <= 0) d += Math.PI * 2;
    for (let k = 1; k < steps; k++) { const a = a0 + (d * k) / steps; pts.push([c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0]); }
  };
  for (let i = 0; i < n; i++) pts.push(L[i]);
  if (o.endCap) cap(axis[n - 1], L[n - 1], R[n - 1], 5, o.endCap); else pts[pts.length - 1].push(0), R[n - 1].push(0);
  for (let i = n - 1; i >= 0; i--) pts.push(R[i]);
  if (o.startCap) cap(axis[0], R[0], L[0], 5, o.startCap); else { pts[pts.length - 1].push(0); pts[0].push(0); }
  return pts;
}

// ---------------------------------------------------------------- gölgelendirme yardımcıları
// eksen çoklu çizgisi boyunca silindir ışığı (sol üstten); r: sabit ya da düğüm başına yarıçap dizisi
function adamTubeShade(axis, r, o = {}) {
  const Lg = Paint.L, lz = o.lz ?? 0.62, amb = o.amb ?? 0.08, ln = Math.hypot(Lg[0], Lg[1], lz), gain = o.gain ?? 1, bias = o.bias ?? 0;
  return (x, y) => {
    let bd = 1e18, bs = 0, bt = 0;
    for (let i = 0; i < axis.length - 1; i++) {
      const a = axis[i], b = axis[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2), px = a[0] + dx * t, py = a[1] + dy * t;
      const d = (x - px) * (x - px) + (y - py) * (y - py);
      if (d < bd) { bd = d; bs = i; bt = t; }
    }
    const a = axis[bs], b = axis[bs + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l, ny = dx / l, px = a[0] + dx * bt, py = a[1] + dy * bt;
    const rr = Array.isArray(r) ? lerp(r[bs], r[bs + 1], bt) : r;
    const s = clamp(((x - px) * nx + (y - py) * ny) / rr, -1, 1), nz = Math.sqrt(1 - s * s);
    const v = (s * nx * Lg[0] + s * ny * Lg[1] + nz * lz) / ln;
    return clamp(amb + (1 - amb) * (v * 0.5 + 0.5) * gain + bias + (o.add ? o.add(x, y) : 0));
  };
}
// elipsoit ışığı
function adamEllShade(cx, cy, rx, ry, o = {}) {
  const Lg = Paint.L, lz = o.lz ?? 0.6, amb = o.amb ?? 0.08, ln = Math.hypot(Lg[0], Lg[1], lz), bias = o.bias ?? 0;
  return (x, y) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry, d2 = nx * nx + ny * ny;
    const k = d2 > 1 ? 1 / Math.sqrt(d2) : 1, nz = Math.sqrt(Math.max(0, 1 - d2));
    const v = (nx * k * Lg[0] + ny * k * Lg[1] + nz * lz) / ln;
    return clamp(amb + (1 - amb) * (v * 0.5 + 0.5) + bias + (o.add ? o.add(x, y) : 0));
  };
}
// en yakın eksen parçasının yönü (+ sapma)
function adamAlong(axis, S, jit = 0.22, off = 0) {
  return (x, y) => {
    let bd = 1e18, ang = 0;
    for (let i = 0; i < axis.length - 1; i++) {
      const a = axis[i], b = axis[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
      const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2), px = a[0] + dx * t, py = a[1] + dy * t;
      const d = (x - px) * (x - px) + (y - py) * (y - py);
      if (d < bd) { bd = d; ang = Math.atan2(dy, dx); }
    }
    return ang + off + (S.r() - 0.5) * jit;
  };
}
// yumuşak "leke": merkez çevresinde ±amt (gölge/ışık eklemek için)
const adamSpot = (cx, cy, rx, ry, amt) => (x, y) => { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; return d >= 1 ? 0 : amt * (1 - d); };
const adamSum = (...fs) => (x, y) => { let s = 0; for (const f of fs) s += f(x, y); return s; };

// boyama kısayolu: bbox'u biçimden alır
function adamRegion(S, sh, o) { return S.region(sh.path, { bbox: sh.bb, ...o }); }
// sert düz dolgu (minik ayrıntılar: fırça izi yok)
function adamFill(S, path, col, alpha = 1) { const c = S.x; c.save(); c.globalAlpha = alpha; c.fillStyle = col; c.fill(path); c.restore(); }
// seyrek, kırık astar kenarı (path ya da açık çoklu çizgi)
function adamRim(S, path, w = 2, o = {}) {
  if (Array.isArray(path)) path = adamPoly(path, false);
  const c = S.x, r = S.r; c.save(); c.strokeStyle = o.color ?? Paint.UNDER; c.lineWidth = w * 2; c.lineJoin = 'round'; c.lineCap = 'round';
  const dash = []; const g = o.gap ?? 1, d = o.dash ?? 1;
  for (let i = 0; i < 40; i++) dash.push(i % 2 ? (18 + r() * 120) * g : (12 + r() * 70) * d);
  c.setLineDash(dash); c.lineDashOffset = r() * 400; c.globalAlpha = o.alpha ?? 0.9; c.stroke(path); c.restore();
}
// ton basamakları (koyu → açık)
const adamRamp = (base, n = 5, o = {}) => ramp(base, n, { span: 0.34, cool: 20, warm: 10, chromaDark: 1.04, chromaLight: 0.9, ...o });
const ADAM_SKIN = () => adamRamp(ADAM_C.skin, 5, { span: 0.3, cool: 16, warm: 8 });

/*@@BODY@@*/
// ---------------------------------------------------------------- birleşik çizim yardımcısı
// (x,y): gövde pivotunun ekran konumu; o.head / o.arm: dönüşler (radyan, tuval yönü: + saat yönü)
ADAM.draw = (ctx, pose, x, y, sc = 1, o = {}) => {
  const g = spr('adam-' + pose + '-govde'), M = ADAM[pose];
  const at = (p) => [x + (p[0] - g.px) * sc, y + (p[1] - g.py) * sc];
  const a = o.alpha ?? 1;
  const hd = spr('adam-' + pose + '-bas'), hp = at(M.neck);
  drawSpr(ctx, hd, hp[0], hp[1], sc, o.head || 0, a);
  drawSpr(ctx, g, x, y, sc, 0, a);
  if (SPRITE_DEFS['adam-' + pose + '-kol']) {
    const k = spr('adam-' + pose + '-kol'), kp = at([k.px, k.py]);
    drawSpr(ctx, k, kp[0], kp[1], sc, o.arm || 0, a);
  }
};
ADAM.pt = (pose, name, x, y, sc = 1) => { const g = spr('adam-' + pose + '-govde'), p = ADAM[pose][name]; return [x + (p[0] - g.px) * sc, y + (p[1] - g.py) * sc]; };

ADAM.ayakta = { w: ADAM_ST.w, h: ADAM_ST.h, neck: ADAM_ST.neck, shoulder: ADAM_ST.shoulder };
