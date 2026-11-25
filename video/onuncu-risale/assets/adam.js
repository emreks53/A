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

// boyama kısayolu: bbox'u biçimden alır
function adamRegion(S, sh, o) { return S.region(sh.path, { bbox: sh.bb, lJit: 0.022, broken: 0.035, ...o }); }
// kolun gövdeye düşen gölgesi (ışık sol üstten → gölge sağ alta), clip biçimlerine kırpılır
function adamArmShadow(S, armPath, clipPaths, col, dx = 7, dy = 8, alpha = 0.9) {
  const c = S.x; c.save();
  const cp = new Path2D(); for (const p of clipPaths) cp.addPath(p); c.clip(cp);
  c.translate(dx, dy); c.globalAlpha = alpha; c.fillStyle = col; c.fill(armPath); c.restore();
}
// örtüşme çizgisi: kolun kenarı boyunca, arkadaki biçime (clip) kırpılmış koyu şerit; kol sonra üstüne boyanır
function adamOccl(S, poly, clipPaths, col, w = 3, alpha = 0.9) {
  const c = S.x; c.save();
  const cp = new Path2D(); for (const p of clipPaths) cp.addPath(p); c.clip(cp);
  c.globalAlpha = alpha; c.strokeStyle = col; c.lineWidth = w * 2; c.lineJoin = 'round'; c.lineCap = 'round';
  c.stroke(adamPoly(poly, false)); c.restore();
}
// omuz dikişi: kol başının üstünde ince koyu yay
function adamSeam(S, cx, cy, r, col, w = 2.6, a0 = -2.75, a1 = -0.45) {
  const pts = []; for (let i = 0; i <= 16; i++) { const a = lerp(a0, a1, i / 16); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  S.line(pts, w, col, { w1: w * 0.6, edge: false });
}
// sert düz dolgu (minik ayrıntılar: fırça izi yok)
function adamFill(S, path, col, alpha = 1) { const c = S.x; c.save(); c.globalAlpha = alpha; c.fillStyle = col; c.fill(path); c.restore(); }
// kırık astar kenarı: dış hat boyunca genişliği gürültüyle 0..w arasında değişen şerit.
// Biçimin dolgusundan ÖNCE çağrılır; iç yarısı dolguyla örtülür, dışta yer yer astar görünür.
const ADAM_RIMK = 1.35; // astar kenarı genel kalınlık çarpanı
function adamRim(S, poly, w = 2, o = {}) {
  if (!Array.isArray(poly) || poly.length < 2) return;
  w *= ADAM_RIMK;
  const n = poly.length, sd = S.r() * 200, fq = (o.freq ?? 0.03), th = o.th ?? 0.34;
  const A = [], B = []; let acc = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[Math.max(0, i - 1)], b = poly[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    if (i) acc += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    const nv = 0.65 * NOISE(acc * fq + sd, sd * 0.37) + 0.35 * NOISE(acc * fq * 3.1 + 7, sd);
    const hw = w * clamp(((nv - th) / (1 - th)) * 2.2, 0, 1);
    A.push([poly[i][0] - (dy / l) * hw, poly[i][1] + (dx / l) * hw]);
    B.push([poly[i][0] + (dy / l) * hw, poly[i][1] - (dx / l) * hw]);
  }
  const p = new Path2D(); A.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  for (let i = n - 1; i >= 0; i--) p.lineTo(B[i][0], B[i][1]);
  p.closePath();
  adamFill(S, p, o.color ?? Paint.UNDER, o.alpha ?? 0.92);
}
// ton basamakları (koyu → açık)
const adamRamp = (base, n = 5, o = {}) => ramp(base, n, { span: 0.34, cool: 20, warm: 10, chromaDark: 1.04, chromaLight: 0.9, ...o });
const ADAM_SKIN = () => adamRamp(ADAM_C.skin, 5, { span: 0.3, cool: 16, warm: 8 });

// ---------------------------------------------------------------- BAŞ (birim: baş yüksekliği = 1)
// köken: x = glabella (kaş arası) dikeyi, y = kafatası tepesi. +x yüz yönü (sağ), +y aşağı.
const ADAM_HEAD = {
  face: [
    [-0.32, 0.02], [-0.12, 0.07], [-0.062, 0.15], [-0.026, 0.27], [-0.004, 0.38], [0.002, 0.425],
    [-0.02, 0.478, 0.6], [0.012, 0.535], [0.058, 0.6], [0.102, 0.646], [0.106, 0.671], [0.084, 0.689],
    [0.045, 0.698], [0.02, 0.706, 0], [0.03, 0.735], [0.041, 0.764], [0.02, 0.788, 0.4], [0.034, 0.812],
    [0.016, 0.842], [-0.01, 0.866], [0.004, 0.902], [0.008, 0.934], [-0.022, 0.982], [-0.085, 1.006],
    [-0.2, 0.996], [-0.33, 0.95], [-0.44, 0.86], [-0.52, 0.8], [-0.62, 0.83], [-0.73, 0.79], [-0.845, 0.62],
    [-0.878, 0.45], [-0.845, 0.28], [-0.73, 0.12], [-0.53, 0.025],
  ],
  // boyun: yakanın altına uzun iner; dönüşte gövdenin dışına taşmasın diye arkası dar
  neck: [
    [-0.18, 0.96], [-0.236, 1.02], [-0.252, 1.09], [-0.248, 1.125], [-0.26, 1.19], [-0.27, 1.3], [-0.285, 1.44],
    [-0.295, 1.56, 0], [-0.6, 1.6], [-0.85, 1.5, 0], [-0.86, 1.36], [-0.825, 1.22], [-0.795, 1.06],
    [-0.755, 0.88], [-0.6, 0.78], [-0.42, 0.82],
  ],
  hair: [
    [-0.068, 0.148, 0.4], [-0.08, 0.09], [-0.12, 0.036], [-0.2, -0.004], [-0.32, -0.026], [-0.46, -0.028], [-0.6, -0.002],
    [-0.735, 0.075], [-0.845, 0.21], [-0.9, 0.38], [-0.89, 0.54], [-0.84, 0.68], [-0.775, 0.78], [-0.73, 0.81, 0],
    [-0.69, 0.73], [-0.655, 0.6], [-0.615, 0.48], [-0.555, 0.432], [-0.49, 0.45, 0.5], [-0.478, 0.55], [-0.474, 0.62, 0],
    [-0.436, 0.6, 0], [-0.428, 0.46], [-0.37, 0.335], [-0.27, 0.228], [-0.165, 0.168],
  ],
  ear: [
    [-0.502, 0.468], [-0.576, 0.446], [-0.636, 0.5], [-0.655, 0.6], [-0.628, 0.688], [-0.585, 0.725], [-0.549, 0.71],
    [-0.53, 0.672], [-0.512, 0.62], [-0.498, 0.54],
  ],
  earIn: [[-0.538, 0.494], [-0.598, 0.522], [-0.614, 0.6], [-0.593, 0.655], [-0.566, 0.668]],
  beard: [
    [-0.474, 0.585], [-0.425, 0.668], [-0.33, 0.722], [-0.21, 0.748], [-0.11, 0.758], [-0.064, 0.756],
    [-0.046, 0.728], [-0.012, 0.715], [0.02, 0.719], [0.036, 0.736, 0.6], [0.026, 0.752], [0.0, 0.759], [-0.03, 0.771, 0],
    [-0.008, 0.83, 0], [0.014, 0.838], [0.024, 0.872], [0.026, 0.925], [0.006, 0.968], [-0.04, 0.998],
    [-0.12, 1.012], [-0.22, 1.008, 0.5], [-0.32, 0.976], [-0.41, 0.915], [-0.48, 0.82], [-0.5, 0.71], [-0.494, 0.62],
  ],
  lips: [[0.015, 0.758], [0.036, 0.764], [0.022, 0.787], [0.033, 0.81], [0.016, 0.831], [-0.012, 0.829, 0], [-0.026, 0.775, 0]],
  eye: [[-0.15, 0.507, 0], [-0.118, 0.494], [-0.08, 0.494], [-0.066, 0.506, 0.4], [-0.074, 0.52], [-0.115, 0.521]],
  brow: [[-0.172, 0.447], [-0.12, 0.43], [-0.068, 0.426], [-0.032, 0.434]],
  pts: { eye: [-0.088, 0.507], ear: [-0.57, 0.59], nose: [0.106, 0.66], mouth: [0.03, 0.79], chin: [0.02, 0.95] },
};

// baş biçimleri (boyamadan): şema ve maskeler için
function adamHeadShapes(ox, oy, hs) {
  const X = (u, v) => [ox + u * hs, oy + v * hs], HD = ADAM_HEAD;
  const sh = (pts) => adamShape(adamMap(pts, X), true, Math.max(0.8, hs / 110));
  return { X, neck: sh(HD.neck), face: sh(HD.face), hair: sh(HD.hair), ear: sh(HD.ear), beard: sh(HD.beard), eye: sh(HD.eye) };
}
// Başı (boynuyla) S'ye boyar. ox,oy: birim kökeninin sprite konumu; hs: baş yüksekliği (px).
function adamPaintHead(S, ox, oy, hs, o = {}) {
  const X = (u, v) => [ox + u * hs, oy + v * hs];
  const sh = (pts, closed = true) => adamShape(adamMap(pts, X), closed, Math.max(0.8, hs / 110));
  const ss = hs / 153; // fırça ölçeği
  const HD = ADAM_HEAD;
  const SK = ADAM_SKIN();
  const U = (x) => (x - ox) / hs, V = (y) => (y - oy) / hs; // ters dönüşüm
  const rimW = Math.max(1.0, 1.3 * ss);
  const sz = o.detail ?? 1; // büyük boyda fırçalar biraz daha ince

  // boyun (yüzün gölgesinde, bir ton koyu) + çene altı düşen gölge
  const neck = sh(HD.neck);
  const neckAxis = adamMap([[-0.5, 0.9], [-0.54, 1.25], [-0.58, 1.6]], X);
  adamRim(S, adamMap(adamCurve(HD.neck.slice(0, 8), false), X), rimW);
  adamRim(S, adamMap(adamCurve(HD.neck.slice(10, 15), false), X), rimW);
  adamRegion(S, neck, {
    ramp: SK, shade: adamTubeShade(neckAxis, 0.27 * hs, { amb: 0.1, lz: 0.9, gain: 0.7, bias: 0.02 }), dir: adamAlong(neckAxis, S, 0.3),
    len: [18 * ss * sz, 34 * ss * sz], wid: [7 * ss * sz, 11 * ss * sz], cover: 2.6, jitter: 6 * ss, rim: false, noise: 0.015, broken: hs > 300 ? 0.005 : 0.03, lJit: hs > 300 ? 0.012 : 0.02,
  });
  const jawSh = sh([[-0.16, 0.98], [-0.23, 1.05], [-0.33, 1.075], [-0.45, 1.03], [-0.56, 0.93], [-0.64, 0.84], [-0.55, 0.78], [-0.3, 0.9]]);
  S.x.save(); S.x.clip(neck.path); S.hx.save(); S.hx.clip(neck.path);
  // boyun planı: göğüs-köprücük-kulak kası çizgisinin önü (gırtlak üçgeni) bir ton gölgede
  const scm = sh([[-0.54, 0.84], [-0.44, 1.12], [-0.37, 1.46], [-0.18, 1.62], [-0.12, 1.0], [-0.3, 0.9]]);
  adamRegion(S, scm, { ramp: [mix(SK[1], SK[2], 0.55), mix(SK[1], SK[2], 0.7)], shade: Paint.cst(0.5), dir: adamAlong(neckAxis, S, 0.25), len: [16 * ss * sz, 30 * ss * sz], wid: [7 * ss * sz, 10 * ss * sz], cover: 2.4, rim: false, jitter: 2 * ss, lJit: 0.012 });
  adamRegion(S, jawSh, { ramp: [mix(SK[1], SK[2], 0.35), mix(SK[1], SK[2], 0.25)], shade: Paint.cst(0.5), dir: 0.15, len: [14 * ss, 26 * ss], wid: [6 * ss, 9 * ss], cover: 2.2, rim: false, jitter: 0 });
  S.x.restore(); S.hx.restore();

  // yüz + kafatası
  const face = sh(HD.face);
  const faceShade = adamEllShade(ox - 0.38 * hs, oy + 0.48 * hs, 0.62 * hs, 0.66 * hs, {
    amb: 0.2, lz: 1.0, bias: -0.08,
    add: adamSpot(ox - 0.06 * hs, oy + 0.3 * hs, 0.12 * hs, 0.16 * hs, 0.05), // alın
  });
  adamRim(S, adamMap(adamCurve(HD.face.slice(1, 23), false), X), rimW * 0.9, { gap: 1.6 });
  adamRegion(S, face, {
    ramp: SK.slice(0, 4), shade: faceShade,
    dir: (x, y) => { const u = U(x), v = V(y); return Math.atan2(v - 0.52, u + 0.36) + Math.PI / 2 + (S.r() - 0.5) * 0.25; },
    len: [18 * ss * sz, 32 * ss * sz], wid: [7.5 * ss * sz, 11.5 * ss * sz], cover: 2.5, jitter: 3 * ss, jitterFreq: 0.014 / ss, noise: 0.01, broken: hs > 300 ? 0 : 0.02, lJit: hs > 300 ? 0.012 : 0.02, rim: false,
  });

  // saç
  const hair = sh(HD.hair);
  const HR = adamRamp(ADAM_C.hair, 4, { span: 0.2, cool: 8, warm: 20, chromaLight: 1.15 });
  // yüz düzlemleri: göz çukuru gölgesi, elmacık ışığı, alt dudak altı gölgesi (yüze kırpılı, düz ton katları)
  S.x.save(); S.x.clip(face.path); S.hx.save(); S.hx.clip(face.path);
  const plane = (pts, cols, dirA, f = 1) => adamRegion(S, sh(pts), { ramp: cols, shade: Paint.cst(0.5), dir: () => dirA + (S.r() - 0.5) * 0.3, len: [12 * ss * sz * f, 22 * ss * sz * f], wid: [6 * ss * sz * f, 9 * ss * sz * f], cover: 2.6, jitter: 1.5 * ss, rim: false, lJit: 0.012, broken: 0 });
  plane([[-0.165, 0.462], [-0.11, 0.452], [-0.05, 0.46], [-0.04, 0.49], [-0.058, 0.53], [-0.1, 0.545], [-0.155, 0.53], [-0.178, 0.495]], [mix(SK[1], SK[2], 0.45)], 0.1, 0.8);
  plane([[-0.37, 0.52], [-0.27, 0.5], [-0.18, 0.53], [-0.15, 0.58], [-0.22, 0.625], [-0.33, 0.63], [-0.39, 0.585]], [mix(SK[2], SK[3], 0.6)], 0.5);
  plane([[-0.03, 0.835], [0.012, 0.84], [0.0, 0.875], [-0.03, 0.88]], [mix(SK[1], SK[2], 0.4)], 0.3, 0.6);
  S.x.restore(); S.hx.restore();
  adamRim(S, adamMap(adamCurve(HD.hair.slice(0, 14), false), X), rimW, { gap: 1.3 });
  adamRegion(S, hair, {
    ramp: HR, shade: adamEllShade(ox - 0.52 * hs, oy + 0.44 * hs, 0.48 * hs, 0.52 * hs, { amb: 0.0, lz: 0.45, bias: -0.04 }),
    dir: (x, y) => { const u = U(x), v = V(y); return Math.atan2(v - 0.55, u + 0.42) + Math.PI / 2 + 0.3 + (S.r() - 0.5) * 0.3; },
    len: [12 * ss * sz, 24 * ss * sz], wid: [5 * ss * sz, 8 * ss * sz], cover: 2.8, jitter: 4 * ss, jitterFreq: 0.04 / ss, rim: false,
  });
  // saçta birkaç ışık darbesi (sol üst)
  S.x.save(); S.x.clip(hair.path); S.hx.save(); S.hx.clip(hair.path);
  for (let i = 0; i < 7; i++) {
    const a = -2.55 + i * 0.16 + (S.r() - 0.5) * 0.08, rr = 0.42 + S.r() * 0.04;
    const [hx0, hy0] = X(-0.46 + Math.cos(a) * rr, 0.43 + Math.sin(a) * rr * 1.02);
    S.dab(hx0, hy0, a + Math.PI / 2 + 0.15, (10 + S.r() * 8) * ss * sz, (3 + S.r() * 2) * ss * sz, shade(HR[3], 0.05, 1, 6), { alpha: 0.85 });
  }
  S.x.restore(); S.hx.restore();

  // kulak
  const ear = sh(HD.ear);
  adamRim(S, adamMap(adamCurve(HD.ear.slice(0, 7), false), X), rimW * 0.8, { gap: 0.7 });
  adamRegion(S, ear, {
    ramp: SK.map((c) => shade(c, 0, 1.05, -3)), shade: adamEllShade(ox - 0.6 * hs, oy + 0.55 * hs, 0.1 * hs, 0.16 * hs, { amb: 0.35, lz: 1 }),
    dir: -1.25, len: [9 * ss, 16 * ss], wid: [4 * ss, 7 * ss], cover: 3, jitter: 2 * ss, rim: false,
  });
  S.line(adamCurve(adamMap(HD.earIn, X), false, 1.5), Math.max(1.6, 3.4 * ss), shade(ADAM_C.skin, -0.19, 1.1, -6), { w1: Math.max(1, 2 * ss), edge: false });
  const [cx0, cy0] = X(-0.545, 0.6);
  adamFill(S, ellipsePath(cx0, cy0, 0.016 * hs, 0.026 * hs, -0.3), shade(ADAM_C.skin, -0.16, 1.1, -6), 0.8);

  // sakal + bıyık (kısa, düzgün kesilmiş: tenden biraz açık, kenarda kuru fırça)
  const beard = sh(HD.beard);
  const BR = adamRamp(mix(ADAM_C.beard, '#7A5038', 0.3), 4, { span: 0.2, cool: 10, warm: 16, chromaLight: 1.05 });
  adamRegion(S, beard, {
    ramp: BR, shade: adamEllShade(ox - 0.3 * hs, oy + 0.72 * hs, 0.42 * hs, 0.34 * hs, { amb: 0.05, lz: 0.55 }),
    dir: (x, y) => 1.3 + (S.r() - 0.5) * 0.5, len: [8 * ss * sz, 15 * ss * sz], wid: [3.5 * ss * sz, 6 * ss * sz], cover: 3.2, jitter: 2 * ss, rim: false,
  });
  // yanak sınırında birkaç kısa kıl darbesi (yumuşak geçiş)
  const cheek = adamCurve(adamMap(HD.beard.slice(0, 6), X), false, 2);
  for (let i = 0; i < 6; i++) {
    const [bx, by] = cheek[Math.floor((0.08 + 0.84 * ((i + S.r() * 0.8) / 6)) * cheek.length)];
    S.dab(bx, by + (S.r() - 0.3) * 2 * ss, 1.25 + (S.r() - 0.5) * 0.6, (4 + S.r() * 5) * ss * sz, (2 + S.r() * 1.5) * ss * sz, shade(BR[2], 0.01), { alpha: 0.55 });
  }
  // dudaklar (sade, tene yakın)
  adamFill(S, sh(HD.lips).path, mix(ADAM_C.skin, ADAM_C.lip, 0.55), 0.95);
  S.line(adamCurve(adamMap([[-0.024, 0.786], [0.0, 0.789], [0.02, 0.788]], X), false, 1), Math.max(1, 1.8 * ss), shade(ADAM_C.lip, -0.2), { edge: false });
  // burun kanadı
  S.line(adamCurve(adamMap([[0.038, 0.656], [0.056, 0.674], [0.05, 0.69]], X), false, 1), Math.max(1.2, 2.4 * ss), shade(ADAM_C.skin, -0.18, 1.1, -8), { edge: false });

  // göz (badem; koyu iris noktası, minik parıltı)
  const eye = sh(HD.eye);
  adamFill(S, eye.path, '#EFE2D4');
  S.x.save(); S.x.clip(eye.path);
  const [ix, iy] = X(-0.086, 0.507);
  adamFill(S, ellipsePath(ix, iy, 0.017 * hs, 0.021 * hs), ADAM_C.iris);
  adamFill(S, rectPath(ix - 0.06 * hs, iy - 0.03 * hs, 0.12 * hs, 0.013 * hs), 'rgba(60,30,20,0.25)'); // üst kapak gölgesi
  S.x.restore();
  S.line(adamCurve(adamMap([[-0.156, 0.511], [-0.12, 0.492], [-0.08, 0.491], [-0.063, 0.503]], X), false, 1), Math.max(1.5, 2.8 * ss), '#2A1C18', { w1: Math.max(1, 1.5 * ss), edge: false });
  S.line(adamCurve(adamMap([[-0.14, 0.478], [-0.105, 0.47], [-0.078, 0.474]], X), false, 1), Math.max(1, 1.6 * ss), shade(ADAM_C.skin, -0.14), { edge: false }); // kapak çizgisi
  const [hx, hy] = X(-0.08, 0.5);
  adamFill(S, ellipsePath(hx, hy, Math.max(0.9, 0.0055 * hs), Math.max(0.9, 0.0055 * hs)), '#FFFFFF');
  // kaş
  S.line(adamCurve(adamMap(HD.brow, X), false, 1), 4.6 * ss, shade(ADAM_C.hair, 0.03), { w1: 2.6 * ss, edge: false });

  const P = {}; for (const k in HD.pts) P[k] = X(...HD.pts[k]);
  P.shapes = { neck, face, hair, ear, beard };
  return P;
}

// ---------------------------------------------------------------- KOL & EL
// kol yeni (gömlek kolu): eksen + yarı genişlikler; omuz başı yuvarlak. Astar yalnız alt kısımlarda.
function adamSleeveShape(axis, half, cap = 1.08) { return adamShape(adamTube(axis, half, { startCap: cap })); }
function adamPaintSleeve(S, axis, half, o = {}) {
  const sh = adamSleeveShape(axis, half, o.cap ?? 1.08);
  const SR = o.ramp || adamRamp(ADAM_C.shirt, 5, { span: 0.32, cool: 12, warm: 16 });
  // astar: kol altı kenarlar (omuz başı hariç)
  const n = axis.length, L = adamTube(axis, half, {}).slice(0, n), R = adamTube(axis, half, {}).slice(n).reverse();
  if (o.rim !== false) { adamRim(S, adamCurve(L.slice(1), false), 2.4); adamRim(S, adamCurve(R.slice(1), false), 2.4); }
  adamRegion(S, sh, {
    ramp: SR, shade: adamTubeShade(axis, half.map((h) => h * 1.05), { amb: 0.08, lz: 0.8 }), dir: adamAlong(axis, S, 0.22),
    len: o.len || [28, 52], wid: o.wid || [11, 17], cover: 2.6, jitter: 8, noise: 0.03, rim: false,
  });
  return sh;
}

// gevşek sarkan el (dıştan görünüş, başparmak önde). (wx,wy) bilek merkezi, ang: el ekseni açısı (aşağı ≈ π/2)
// side = +1: "ön" (başparmak) eksenin sağında
function adamHandRelaxedGeom(wx, wy, ang, sc = 1) {
  const Lh = 122 * sc, c = Math.cos(ang), s = Math.sin(ang);
  // yerel: u el boyunca (0 bilek → 1 uç), v px; +v = ön (aşağı bakan elde sağ). ön yönü = eksenin saat yönü tersine dik
  const M = (pts) => pts.map(([u, v, t]) => { const p = [wx + c * u * Lh + s * v * sc, wy + s * u * Lh - c * v * sc]; return t === undefined ? p : [...p, t]; });
  const hand = [
    [-0.08, -19], [0.14, -22], [0.34, -23.5], [0.54, -22], [0.72, -19], [0.86, -15.5], [0.955, -10], [1.0, -2], [0.99, 5],
    [0.93, 11], [0.82, 15], [0.7, 17], [0.61, 18.5, 0.3], [0.645, 23], [0.655, 27.5], [0.62, 31], [0.52, 32], [0.38, 30.5],
    [0.22, 26], [0.06, 21.5], [-0.08, 20],
  ];
  return { M, hand, sh: adamShape(M(hand)) };
}
function adamHandRelaxed(S, wx, wy, ang, sc = 1, o = {}) {
  const { M, hand, sh } = adamHandRelaxedGeom(wx, wy, ang, sc);
  const SK = ADAM_SKIN();
  const axis = M([[-0.08, 2], [1.0, 2]]);
  adamRim(S, adamCurve(M(hand.slice(1, 19)), false), 1.5, { gap: 1.2 });
  adamRegion(S, sh, {
    ramp: SK, shade: adamTubeShade(axis, 28 * sc, { amb: 0.2, lz: 0.9, gain: 0.85 }), dir: adamAlong(axis, S, 0.3),
    len: [14 * sc, 26 * sc], wid: [6 * sc, 10 * sc], cover: 2.8, jitter: 4, rim: false, noise: 0.03,
  });
  const dk = shade(ADAM_C.skin, -0.17, 1.08, -6);
  // parmak ayrımları ve başparmak çizgisi
  S.line(adamCurve(M([[0.62, -8], [0.8, -7], [0.93, -5]]), false, 1.5), 2.2 * sc, dk, { w1: 1.1 * sc, edge: false });
  S.line(adamCurve(M([[0.64, 4], [0.8, 5], [0.92, 6]]), false, 1.5), 2.2 * sc, dk, { w1: 1.1 * sc, edge: false });
  S.line(adamCurve(M([[0.2, 18], [0.42, 21], [0.6, 20]]), false, 1.5), 2.6 * sc, dk, { w1: 1.4 * sc, edge: false });
  // eklem ışığı
  S.dab(...M([[0.42, -12]])[0], ang, 18 * sc, 5 * sc, shade(SK[3], 0.02), { alpha: 0.7 });
  return { fingertip: M([[1.0, 0]])[0], palm: M([[0.45, 2]])[0], shape: sh };
}

// ---------------------------------------------------------------- AYAKTA
const ADAM_ST = { w: 560, h: 1220, hs: 153.3, gx: 335, top: 57, shoulder: [255, 292], neck: [251, 254], ground: 1200 };

function adamStandLeg() { // yakın bacak (pantolon) dış hattı
  return [
    [190, 600], [194, 690], [207, 770], [223, 845], [233, 886], [229, 950], [233, 1020], [237, 1090], [240, 1144, 0],
    [276, 1150], [311, 1146, 0], [308, 1070], [309, 990], [316, 905], [324, 820], [329, 740], [327, 670], [322, 600],
  ];
}
function adamStandFarLeg() { // uzak bacak: diz üstü gizli, alt bacakta önde ince şerit
  return [
    [200, 600], [320, 600], [325, 740], [319, 860], [323, 905], [331, 1000], [339, 1080], [346, 1146, 0],
    [300, 1152], [270, 1146, 0], [258, 1050], [236, 900], [212, 760],
  ];
}
function adamStandShoe(dx = 0) {
  return [
    [222, 1200, 0.3], [214, 1187], [213, 1167], [222, 1146, 0.5], [258, 1139], [292, 1142], [322, 1150], [352, 1160],
    [380, 1167], [400, 1174], [411, 1185], [409, 1196, 0.6], [398, 1200, 0.3],
  ].map(([x, y, t]) => (t === undefined ? [x + dx, y] : [x + dx, y, t]));
}
// ayakkabı ayrıntısı: taban bandı (topuk + kemer), burun parıltısı, saya dikişi
function adamShoeDetail(S, f, dk = 0) {
  const sole = adamShape(adamMap([[214, 1191], [262, 1192], [300, 1194], [350, 1193], [409, 1191], [408, 1197, 0.6], [398, 1201, 0], [300, 1201], [222, 1201, 0], [214, 1197]], f), true, 1.5);
  adamFill(S, sole.path, shade(ADAM_C.shoe, -0.13 + dk), 1);
  S.line(adamCurve(adamMap([[218, 1191.5], [300, 1193.5], [404, 1191.5]], f), false), 1.4, shade(ADAM_C.shoe, 0.1 + dk), { edge: false });
  S.line(adamCurve(adamMap([[262, 1192], [264, 1200]], f), false), 1.4, shade(ADAM_C.shoe, -0.2 + dk), { edge: false });
  S.line(adamCurve(adamMap([[300, 1147], [318, 1166], [346, 1180], [372, 1184]], f), false), 1.6, shade(ADAM_C.shoe, -0.12 + dk), { w1: 0.8, edge: false });
  const [tx, ty] = f(388, 1174); S.dab(tx, ty, 0.25, 22, 4, shade(ADAM_C.shoe, 0.2 + dk, 0.8, 10), { alpha: 0.8 });
}
function adamStandTorso() {
  return [
    [212, 231, 0], [198, 245], [187, 270], [180, 305], [179, 345], [183, 395], [190, 445], [195, 495], [194, 545],
    [189, 595], [187, 626], [189, 648, 0], [235, 654], [282, 652], [323, 645, 0], [328, 612], [330, 556], [327, 500],
    [326, 455], [332, 412], [339, 368], [338, 326], [328, 291], [313, 272], [298, 262, 0], [272, 256], [246, 248], [225, 240],
  ];
}
function adamStandArmGeom() {
  const [sx, sy] = ADAM_ST.shoulder;
  const axis = [[sx, sy], [sx - 4, sy + 100], [sx - 6, sy + 196], [sx + 4, sy + 280], [sx + 16, sy + 352]];
  return { axis, half: [40, 34, 29, 27, 23] };
}

function adamStandHandPlace() {
  const { axis } = adamStandArmGeom();
  const wr = axis[axis.length - 1], pr = axis[axis.length - 2];
  const ang = Math.atan2(wr[1] - pr[1], wr[0] - pr[0]) - 0.06;
  return [wr[0] + Math.cos(ang) * -6, wr[1] + Math.sin(ang) * -6, ang];
}
function adamPaintStandArm(S, o = {}) {
  const { axis, half } = adamStandArmGeom();
  const hp = adamHandRelaxed(S, ...adamStandHandPlace(), 1);
  adamPaintSleeve(S, axis, half);
  adamSeam(S, axis[0][0], axis[0][1] + 4, half[0] * 0.98, shade(ADAM_C.shirt, -0.075), 2.2, -2.6, -0.55);
  // manşet: kol ucundan biraz yukarıda koyu bant çizgisi
  const n = axis.length, t = 0.82, a = axis[n - 2], b = axis[n - 1];
  const cxm = lerp(a[0], b[0], t), cym = lerp(a[1], b[1], t), dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / dl, ny = (b[0] - a[0]) / dl, hw = lerp(half[n - 2], half[n - 1], t) - 1;
  S.line([[cxm + nx * hw, cym + ny * hw], [cxm - nx * hw, cym - ny * hw]], 3.2, shade(ADAM_C.shirt, -0.13), { edge: false });
  return hp;
}

function adamPaintStandBody(S, o = {}) {
  const PR = adamRamp(ADAM_C.pants, 5, { span: 0.3, cool: 10, warm: 12 });
  const SHR = adamRamp(ADAM_C.shoe, 4, { span: 0.3, warm: 14 });
  const legAxis = [[258, 600], [272, 888], [272, 1145]];
  // ayakkabılar + bacaklar: önce uzak (koyu), sonra yakın
  for (const pass of ['far', 'near']) {
    const far = pass === 'far', dk = far ? -0.05 : 0, dx = far ? 36 : 0;
    const shoe = adamShape(adamStandShoe(dx));
    adamRim(S, adamCurve(adamStandShoe(dx).slice(0, 4), false), 1.6); adamRim(S, adamCurve(adamStandShoe(dx).slice(7), false), 1.6);
    adamRegion(S, shoe, {
      ramp: SHR.map((c) => shade(c, dk)), shade: adamEllShade(300 + dx, 1140, 130, 60, { amb: 0.15, lz: 0.8 }),
      dir: 0.12, len: [16, 30], wid: [6, 10], cover: 3, jitter: 4, rim: false,
    });
    adamShoeDetail(S, (x, y) => [x + dx, y], dk);
    const leg = adamShape(far ? adamStandFarLeg() : adamStandLeg());
    const ax = far ? [[262, 600], [278, 888], [300, 1145]] : legAxis;
    if (far) adamRim(S, adamCurve(adamStandFarLeg().slice(3, 8), false), 2.2);
    else { adamRim(S, adamCurve(adamStandLeg().slice(0, 9), false), 2.4); adamRim(S, adamCurve(adamStandLeg().slice(11), false), 2.4); }
    adamRegion(S, leg, {
      ramp: PR.map((c) => shade(c, dk)), shade: adamTubeShade(ax, [66, 44, 38], { amb: 0.08, lz: 0.75 }), dir: adamAlong(ax, S, 0.18),
      len: [32, 62], wid: [11, 17], cover: 2.6, jitter: 8, rim: false,
    });
  }
  // diz arkası ve paça kırışıkları
  S.line(adamCurve([[236, 878], [248, 892], [262, 897]], false), 3, shade(ADAM_C.pants, -0.12), { w1: 1.5, edge: false });
  S.line(adamCurve([[246, 1128], [270, 1122], [300, 1126]], false), 3, shade(ADAM_C.pants, -0.1), { w1: 1.5, edge: false });

  // gövde (gömlek)
  const torso = adamShape(adamStandTorso());
  const SR = adamRamp(ADAM_C.shirt, 5, { span: 0.32, cool: 12, warm: 16 });
  const tAxis = [[252, 250], [258, 420], [258, 650]];
  adamRim(S, adamCurve(adamStandTorso().slice(0, 25), false), 2.2);
  adamRegion(S, torso, {
    ramp: SR, shade: adamTubeShade(tAxis, [80, 80, 72], { amb: 0.08, lz: 0.8, add: adamSpot(330, 450, 30, 60, -0.12) }), dir: adamAlong(tAxis, S, 0.22),
    len: [30, 62], wid: [11, 18], cover: 2.6, jitter: 9, rim: false,
  });
  // etek kenarı: hafif koyu kıvrım
  S.line(adamCurve([[192, 640], [240, 646], [285, 645], [320, 638]], false), 4, shade(ADAM_C.shirt, -0.1), { w1: 3, edge: false });
  // yaka çizgisi
  S.line(adamCurve([[214, 235], [242, 248], [270, 258], [294, 263]], false), 3.4, shade(ADAM_C.shirt, -0.14), { w1: 2.4, edge: false });
}

defSprite('adam-ayakta-bas', () => {
  const S = Paint.sprite(ADAM_ST.w, ADAM_ST.h, { seed: 101 });
  adamPaintHead(S, ADAM_ST.gx, ADAM_ST.top, ADAM_ST.hs);
  return { canvas: S.finish({ emboss: 0.3 }), px: ADAM_ST.neck[0], py: ADAM_ST.neck[1], k: 1 };
});
defSprite('adam-ayakta-govde', () => {
  const S = Paint.sprite(ADAM_ST.w, ADAM_ST.h, { seed: 102 });
  adamPaintStandBody(S);
  return { canvas: S.finish({ emboss: 0.55 }), px: 290, py: ADAM_ST.ground, k: 1 };
});
defSprite('adam-ayakta-kol', () => {
  const S = Paint.sprite(ADAM_ST.w, ADAM_ST.h, { seed: 103 });
  adamPaintStandArm(S);
  return { canvas: S.finish({ emboss: 0.5 }), px: ADAM_ST.shoulder[0], py: ADAM_ST.shoulder[1], k: 1 };
});

// ---------------------------------------------------------------- AYAKTA: ŞEMA (koyu çivit zemin için) + ORGANLAR
// bütün vücut dış hatlarının biçimleri (ayakta çerçevesi)
function adamStandShapes() {
  const hd = adamHeadShapes(ADAM_ST.gx, ADAM_ST.top, ADAM_ST.hs);
  const { axis, half } = adamStandArmGeom();
  const hand = adamHandRelaxedGeom(...adamStandHandPlace(), 1).sh;
  return {
    hd, hand, sleeve: adamSleeveShape(axis, half), torso: adamShape(adamStandTorso()),
    leg: adamShape(adamStandLeg()), farLeg: adamShape(adamStandFarLeg()), shoe: adamShape(adamStandShoe(0)), farShoe: adamShape(adamStandShoe(36)),
  };
}
const ADAM_SEMA = { ramp: ['#1E3860', '#22406A', '#2A4F7E', '#335F91', '#3B6E9E'], line: '#7FE3E0' };

defSprite('adam-ayakta-sema', () => {
  const w = ADAM_ST.w, h = ADAM_ST.h, sh = adamStandShapes(), hd = sh.hd;
  const F = Paint.sprite(w, h, { seed: 121 });
  const R = ADAM_SEMA.ramp;
  const legAx = [[258, 600], [272, 888], [272, 1145]], farAx = [[262, 600], [278, 888], [300, 1145]];
  const fill = (s, shadeF, dir, o = {}) => adamRegion(F, s, { ramp: R, shade: shadeF, dir, len: o.len || [30, 60], wid: o.wid || [11, 17], cover: 2.4, jitter: 10, noise: 0.03, rim: false, lJit: 0.02, hJit: 4 });
  const { axis, half } = adamStandArmGeom();
  fill(sh.farShoe, Paint.cst(0.22), 0.1, { len: [16, 30], wid: [6, 10] });
  fill(sh.farLeg, adamTubeShade(farAx, [66, 44, 38], { amb: 0.0, gain: 0.8 }), adamAlong(farAx, F, 0.18));
  fill(sh.shoe, Paint.cst(0.3), 0.1, { len: [16, 30], wid: [6, 10] });
  fill(sh.leg, adamTubeShade(legAx, [66, 44, 38], { amb: 0.08 }), adamAlong(legAx, F, 0.18));
  const tAx = [[252, 250], [258, 420], [258, 650]];
  fill(sh.torso, adamTubeShade(tAx, [80, 80, 72], { amb: 0.08 }), adamAlong(tAx, F, 0.2));
  const nAx = adamMap([[-0.5, 0.9], [-0.54, 1.25]], hd.X);
  fill(hd.neck, adamTubeShade(nAx, 0.27 * ADAM_ST.hs, { amb: 0.05 }), adamAlong(nAx, F, 0.3), { len: [16, 30], wid: [6, 10] });
  const headSh = adamEllShade(hd.X(-0.42, 0.5)[0], hd.X(-0.42, 0.5)[1], 0.6 * ADAM_ST.hs, 0.64 * ADAM_ST.hs, { amb: 0.15, lz: 0.9 });
  for (const k of ['face', 'beard', 'hair', 'ear']) fill(hd[k], headSh, (x, y) => Math.atan2(y - hd.X(0, 0.5)[1], x - hd.X(-0.4, 0)[0]) + Math.PI / 2 + (F.r() - 0.5) * 0.4, { len: [14, 26], wid: [6, 10] });
  fill(sh.sleeve, adamTubeShade(axis, half.map((v) => v * 1.05), { amb: 0.1 }), adamAlong(axis, F, 0.2));
  const hp = adamStandHandPlace();
  fill(sh.hand, adamTubeShade([[hp[0], hp[1]], [hp[0] + Math.cos(hp[2]) * 122, hp[1] + Math.sin(hp[2]) * 122]], 28, { amb: 0.15 }), hp[2], { len: [14, 24], wid: [6, 9] });
  const fc = F.finish({ emboss: 0.45 });

  // dış hat: tüm biçimlerin birleşiminin çevresinde fırçalı açık camgöbeği çizgi
  const O = Paint.sprite(w, h, { seed: 122 });
  const all = [hd.neck, hd.face, hd.hair, hd.ear, hd.beard, sh.torso, sh.leg, sh.farLeg, sh.shoe, sh.farShoe, sh.sleeve, sh.hand];
  for (const s of all) O.line(s.poly.concat([s.poly[0]]), 6.5, ADAM_SEMA.line, { edge: false });
  O.x.save(); O.x.globalCompositeOperation = 'destination-out'; for (const s of all) O.x.fill(s.path); O.x.restore();
  // iç hatlar (yarı saydam): kol, el, uzak bacak, ayakkabı, kulak, göz
  const inner = (pts, wd = 2.6, a = 0.55) => { O.x.save(); O.x.globalAlpha = a; O.line(pts, wd, ADAM_SEMA.line, { edge: false }); O.x.restore(); };
  const sl = adamTube(axis, half, {}), n = axis.length;
  inner(adamCurve(sl.slice(0, n), false));
  inner(adamCurve(sl.slice(n), false));
  inner(sh.hand.poly.concat([sh.hand.poly[0]]), 2.4, 0.6);
  inner(adamCurve(adamStandFarLeg().slice(3, 8), false), 2.4, 0.4);
  inner(adamCurve(adamStandLeg().slice(9, 14), false), 2.2, 0.35);
  inner(adamCurve(adamMap(ADAM_HEAD.ear, hd.X), false).concat([hd.X(...ADAM_HEAD.ear[0])]), 2, 0.55);
  inner(adamCurve(adamMap(ADAM_HEAD.earIn, hd.X), false), 1.6, 0.45);
  inner(hd.eye.poly.concat([hd.eye.poly[0]]), 1.6, 0.8);
  inner(adamCurve(adamMap(ADAM_HEAD.brow, hd.X), false), 1.8, 0.45);
  const oc = O.finish({ emboss: 0.25 });
  const c = makeCanvas(w, h), x = c.getContext('2d');
  x.globalAlpha = 0.86; x.drawImage(fc, 0, 0); x.globalAlpha = 1; x.drawImage(oc, 0, 0);
  return { canvas: c, px: 290, py: ADAM_ST.ground, k: 1 };
});

// ---- organlar (yan görünüş, ayakta çerçevesi; gövde pivotu ile aynı yere çizilir). Önerilen sıra: akciğer → kalp → mide.
const ADAM_ORG = {
  lungNear: [[260, 256], [280, 264], [300, 288], [313, 328], [319, 376], [317, 418, 0.6], [298, 432], [264, 442], [230, 456], [208, 466, 0.5], [199, 438], [197, 384], [204, 326], [221, 284], [242, 262]],
  heart: {
    body: [[262, 364], [282, 356], [304, 360], [322, 374], [332, 396], [330, 418], [318, 438], [306, 450, 0.3], [290, 442], [270, 428], [256, 408], [252, 386]],
    center: [292, 400],
  },
  stomach: [[256, 450], [272, 441], [294, 443], [312, 456], [319, 477], [314, 499], [300, 515], [284, 524, 0.6], [291, 507], [295, 489], [286, 475], [271, 473], [257, 468]],
};
function adamOrganCanvas(seed) { return Paint.sprite(ADAM_ST.w, ADAM_ST.h, { seed }); }
const adamOrgRamp = (base, n = 4) => adamRamp(base, n, { span: 0.32, cool: 12, warm: 8, chromaLight: 0.9 });
// ıslak parlaklık darbeleri
function adamGloss(S, pts, col, wd = 4) { for (const [x, y, a, l] of pts) S.dab(x, y, a, l, wd, col, { alpha: 0.85 }); }
// koyu ince kontur (organı zeminden ayırır)
function adamOrgEdge(S, sh, col, wd = 2.2) { S.line(sh.poly.concat([sh.poly[0]]), wd, col, { edge: false }); }

defSprite('organ-akciger', () => {
  const S = adamOrganCanvas(131);
  const base = '#EE8A84', Rm = adamRamp(base, 4, { span: 0.26, cool: 12, warm: 6, chromaLight: 0.95 });
  const near = ADAM_ORG.lungNear;
  // uzak akciğer: biraz arkada ve küçük, bir ton koyu
  const far = near.map(([x, y, t]) => { const q = [258 + (x - 258) * 0.94 - 13, 360 + (y - 360) * 0.96 - 4]; return t === undefined ? q : [...q, t]; });
  const lungDir = (cx) => (x, y) => Math.PI / 2 + (x - cx) * 0.004 + (S.r() - 0.5) * 0.18;
  const farSh = adamShape(far);
  adamRim(S, farSh.poly, 2.2);
  adamRegion(S, farSh, { ramp: Rm.map((c) => shade(c, -0.12, 1.05, -8)), shade: adamEllShade(236, 330, 75, 120, { amb: 0.1 }), dir: lungDir(245), len: [26, 46], wid: [9, 14], cover: 2.4, jitter: 6, noise: 0.02, rim: false });
  adamOrgEdge(S, farSh, shade(base, -0.32, 1.1, -10), 2);
  const nearSh = adamShape(near);
  adamRim(S, nearSh.poly, 2.4);
  adamRegion(S, nearSh, { ramp: Rm, shade: adamEllShade(248, 330, 80, 125, { amb: 0.12, lz: 0.8 }), dir: lungDir(258), len: [28, 50], wid: [10, 15], cover: 2.4, jitter: 7, noise: 0.02, rim: false });
  adamOrgEdge(S, nearSh, shade(base, -0.3, 1.1, -10), 2.2);
  // lob yarıkları
  const dk = shade(base, -0.22, 1.1, -8);
  S.line(adamCurve([[212, 316], [244, 358], [274, 400], [298, 431]], false), 2.6, dk, { w1: 1.6, edge: false });
  S.line(adamCurve([[262, 376], [290, 372], [317, 370]], false), 2.2, dk, { w1: 1.3, edge: false });
  adamGloss(S, [[228, 300, -1.2, 24], [220, 334, -1.45, 16], [244, 280, -0.9, 12]], shade(base, 0.18, 0.6, 10), 5);
  return { canvas: S.finish({ emboss: 0.5 }), px: 290, py: ADAM_ST.ground, k: 1 };
});

defSprite('organ-kalp', () => {
  const S = adamOrganCanvas(132);
  const base = '#C9333B', Rm = adamOrgRamp(base, 5);
  const H0 = ADAM_ORG.heart;
  const vein = '#6B5FB4', pulm = '#7C6CC4';
  // arkadaki damarlar: üst ana toplardamar (mor), inen aort (kırmızı)
  S.line(adamCurve([[266, 372], [264, 344], [266, 316]], false), 13, vein, { rim: { w: 1.4 } });
  S.line(adamCurve([[252, 344], [248, 380], [248, 420]], false), 13, shade(base, -0.1, 1, -6), { rim: { w: 1.4 } });
  // aort yayı: üstten yükselip arkaya kıvrılır
  S.line(adamCurve([[290, 368], [290, 338], [280, 322], [262, 320], [252, 334], [251, 352]], false), 16, shade(base, 0.02, 1, -2), { rim: { w: 1.6 } });
  S.line(adamCurve([[282, 324], [272, 312], [268, 300]], false), 7, shade(base, 0.02, 1, -2), { edge: false });
  S.line(adamCurve([[272, 321], [262, 310], [256, 300]], false), 6, shade(base, 0.02, 1, -2), { edge: false });
  // akciğer atardamarı (önde, mor-mavi)
  S.line(adamCurve([[308, 376], [312, 352], [304, 338], [290, 336]], false), 14, pulm, { rim: { w: 1.4 } });
  // kalp gövdesi: tepesi aşağı-öne bakan yuvarlak koni
  const body = adamShape(H0.body);
  adamRim(S, body.poly, 2.4);
  adamRegion(S, body, { ramp: Rm, shade: adamEllShade(286, 390, 46, 52, { amb: 0.1, lz: 0.7 }), dir: (x, y) => Math.atan2(y - 360, x - 270) + Math.PI / 2 + (S.r() - 0.5) * 0.3, len: [16, 28], wid: [8, 12], cover: 2.8, jitter: 5, noise: 0.02, rim: false });
  adamOrgEdge(S, body, shade(base, -0.28, 1.1, -10), 2);
  // kulakçık çıkıntısı
  const aur = adamShape([[300, 362], [314, 358], [322, 368], [314, 376], [302, 374]]);
  adamRegion(S, aur, { ramp: Rm.slice(1, 4), shade: adamEllShade(310, 364, 14, 10, { amb: 0.2 }), dir: 0.3, len: [8, 14], wid: [4, 7], cover: 3, jitter: 2, rim: false });
  adamOrgEdge(S, aur, shade(base, -0.28, 1.1, -10), 1.6);
  // koroner oluk (sarımsı yağ çizgisi + koyu damar)
  S.line(adamCurve([[300, 378], [298, 402], [304, 426], [308, 446]], false), 4, '#E4B048', { w1: 2, edge: false });
  S.line(adamCurve([[300, 378], [298, 402], [304, 426], [308, 446]], false), 1.6, shade(base, -0.25), { edge: false });
  S.line(adamCurve([[262, 392], [280, 398], [298, 398]], false), 2.4, '#E4B048', { w1: 1.4, edge: false });
  adamGloss(S, [[270, 376, -0.95, 18], [264, 392, -1.35, 10], [284, 330, -0.4, 10]], shade(base, 0.26, 0.55, 14), 4);
  return { canvas: S.finish({ emboss: 0.5 }), px: 290, py: ADAM_ST.ground, k: 1 };
});

defSprite('organ-mide', () => {
  const S = adamOrganCanvas(133);
  const base = '#EBA35E', Rm = adamOrgRamp(base);
  const dk = shade(base, -0.24, 1.1, -10);
  // yemek borusu: kalbin arkasından mideye (ince, sakin)
  S.line(adamCurve([[240, 396], [242, 426], [250, 446], [260, 456]], false), 8, shade(base, -0.05, 0.95), { rim: { w: 1.2 } });
  // kalın bağırsak çerçevesi
  const colon = [[228, 614], [223, 574], [228, 538], [250, 527], [284, 528], [313, 534], [326, 560], [323, 600], [305, 623], [274, 630]];
  const cl = adamCurve(colon, false);
  S.line(cl, 22, dk, { rim: { w: 2 }, edge: false });
  S.line(cl, 18, shade(base, -0.04, 1, -4), { edge: false });
  S.line(cl, 6, shade(base, 0.12, 0.85, 6), { edge: false });
  for (let i = 1; i < 9; i++) { const q = cl[Math.floor((i / 9) * cl.length)], q2 = cl[Math.floor((i / 9) * cl.length) + 2]; const a = Math.atan2(q2[1] - q[1], q2[0] - q[0]) + Math.PI / 2; S.line([[q[0] + Math.cos(a) * 9, q[1] + Math.sin(a) * 9], [q[0] - Math.cos(a) * 9, q[1] - Math.sin(a) * 9]], 1.8, dk, { edge: false }); }
  // ince bağırsak: tek, düzensiz kıvrımlı boru
  const r = rng(77), loops = [];
  const rows = [552, 566, 580, 595, 608];
  rows.forEach((y, i) => {
    const d = i % 2 ? -1 : 1, xa = d > 0 ? 248 : 304, xb = d > 0 ? 304 : 248, amp = 3 + r() * 3, ph = r() * 3, fr = 2 + r() * 1.5;
    for (let j = 0; j <= 7; j++) { const t = j / 7; loops.push([lerp(xa, xb, t) + (r() - 0.5) * 3, y + Math.sin(t * Math.PI * fr + ph) * amp]); }
  });
  const lp = adamCurve(loops, false, 2);
  S.line(lp, 14, dk, { edge: false });
  S.line(lp, 11, shade(base, 0.03, 1, 3), { edge: false });
  S.line(lp, 3.5, shade(base, 0.17, 0.75, 8), { edge: false });
  // mide
  const st = adamShape(ADAM_ORG.stomach);
  adamRim(S, st.poly, 2.4);
  adamRegion(S, st, { ramp: Rm, shade: adamEllShade(282, 468, 40, 40, { amb: 0.12, lz: 0.75 }), dir: (x, y) => Math.atan2(y - 482, x - 288) + Math.PI / 2 + (S.r() - 0.5) * 0.3, len: [14, 26], wid: [8, 12], cover: 2.8, jitter: 5, noise: 0.02, rim: false });
  adamOrgEdge(S, st, dk, 2);
  S.line(adamCurve([[264, 462], [284, 466], [298, 482], [298, 500]], false), 2.2, dk, { w1: 1.2, edge: false });
  adamGloss(S, [[272, 452, -0.5, 16], [300, 458, 0.3, 10]], shade(base, 0.2, 0.6, 10), 4);
  return { canvas: S.finish({ emboss: 0.5 }), px: 290, py: ADAM_ST.ground, k: 1 };
});

// ---------------------------------------------------------------- OTURAN (çimende, dizler yukarıda, önkollar dizlerde)
// Ayakta gövdesinin üst kısmı kalça çevresinde 12° öne eğilip oturma kalçasına taşınır.
const ADAM_SIT = (() => {
  const hs = 143, kS = hs / ADAM_ST.hs, lean = 0.21, hip = [170, 575];
  const c = Math.cos(lean), s = Math.sin(lean);
  // ayakta çerçevesinden oturan çerçevesine (gövde üstü için): ölçek + eğim + taşı
  const T = (x, y) => { const dx = (x - 258) * kS, dy = (y - 600) * kS; return [hip[0] + dx * c - dy * s, hip[1] + dx * s + dy * c]; };
  const neck = T(...ADAM_ST.neck), shoulder = T(...ADAM_ST.shoulder);
  const u = (ADAM_ST.neck[0] - ADAM_ST.gx) / ADAM_ST.hs, v = (ADAM_ST.neck[1] - ADAM_ST.top) / ADAM_ST.hs;
  const knee = [hip[0] + 245 * 0.5, hip[1] - 245 * 0.866], ground = 622;
  const ankle = [knee[0] + 250 * Math.sin(0.52), ground - 44];
  return { w: 580, h: 640, hs, kS, lean, hip, T, neck, shoulder, head: [neck[0] - u * hs, neck[1] - v * hs], knee, ankle, ground, seat: [176, ground] };
})();

// yakın bacak (pantolon): kalça/oturak → uyluk altı → diz arkası kıvrımı → baldır → paça → kaval önü → diz → uyluk üstü
function adamSitLeg() {
  const K = ADAM_SIT.knee, A = ADAM_SIT.ankle, H0 = ADAM_SIT.hip, g = ADAM_SIT.ground;
  const dt = [K[0] - H0[0], K[1] - H0[1]], lt = Math.hypot(...dt); const t = [dt[0] / lt, dt[1] / lt], nl = [-t[1], t[0]]; // nl: alt-sağ (uyluk altı)
  const ds = [A[0] - K[0], A[1] - K[1]], ls = Math.hypot(...ds); const sd = [ds[0] / ls, ds[1] / ls], nf = [sd[1], -sd[0]]; // nf: kaval önü (sağ-üst)
  const at = (P, d, k, n, w) => [P[0] + d[0] * k + n[0] * w, P[1] + d[1] * k + n[1] * w];
  const kneeArc = []; for (let i = 0; i <= 4; i++) { const a = Math.atan2(-nl[1], -nl[0]) + (i / 4) * (Math.atan2(nf[1], nf[0]) - Math.atan2(-nl[1], -nl[0]) + (Math.atan2(nf[1], nf[0]) < Math.atan2(-nl[1], -nl[0]) ? Math.PI * 2 : 0)); kneeArc.push([K[0] + Math.cos(a) * 40, K[1] + Math.sin(a) * 40]); }
  return [
    // uyluk altı (kalçadan dize)
    [118, 548], [112, 584], [122, 612], [150, g - 1, 0.6], [198, g - 2], at(H0, t, 70, nl, 52), at(H0, t, 140, nl, 45),
    // diz arkası kıvrımı (uyluk altı ile baldırın buluştuğu yer)
    [K[0] + 2, K[1] + 74, 0.7],
    // baldır → paça arkası
    at(K, sd, 112, [-nf[0], -nf[1]], 39), at(K, sd, 190, [-nf[0], -nf[1]], 31), [...at(A, sd, -6, [-nf[0], -nf[1]], 28), 0],
    // paça önü → kaval → diz
    [...at(A, sd, -12, nf, 30), 0], at(K, sd, 140, nf, 34), at(K, sd, 50, nf, 39), ...kneeArc.reverse().slice(1),
    // uyluk üstü (gövdenin altında kaybolur)
    at(H0, t, 170, [-nl[0], -nl[1]], 44), at(H0, t, 80, [-nl[0], -nl[1]], 52), [124, 500],
  ];
}
function adamSitShoe(dx = 0, dy = 0) {
  const A = ADAM_SIT.ankle, k = ADAM_SIT.kS, g = ADAM_SIT.ground;
  const r = adamStandShoe(0).map(([x, y, t]) => { const p = [A[0] + (x - 262) * k + dx, g + (y - 1200) * k + dy]; return t === undefined ? p : [...p, t]; });
  r.dx = dx; return r;
}
function adamSitTorso() {
  const T = ADAM_SIT.T, st = adamStandTorso();
  const up = (i) => { const p = T(st[i][0], st[i][1]); return st[i].length > 2 ? [...p, st[i][2]] : p; };
  return [
    up(0), up(1), up(2), up(3), up(4), up(5), up(6), up(7),
    [114, 520], [110, 566], [120, 604], [146, 612, 0], [196, 590], [236, 548], [262, 500],
    up(18), up(19), up(20), up(21), up(22), up(23), up(24), up(25), up(26), up(27),
  ];
}
// kol: omuz → dirsek (aşağı) → bilek (diz üstünde). Keskin dirsek bükümü: iki tüp + dirsek başı
function adamSitArmGeom(dx = 0, dy = 0) {
  const S0 = ADAM_SIT.shoulder, k = ADAM_SIT.kS;
  const sh = [S0[0] + dx, S0[1] + dy], el = [S0[0] + 8 + dx, S0[1] + 156 + dy], wr = [ADAM_SIT.knee[0] + 24 + dx, ADAM_SIT.knee[1] - 30 + dy];
  const up = [sh, [lerp(sh[0], el[0], 0.5) - 2, lerp(sh[1], el[1], 0.5)], el], fo = [el, [lerp(el[0], wr[0], 0.45) - 3, lerp(el[1], wr[1], 0.45)], wr];
  return { sh, el, wr, up, fo, hu: [38 * k, 32 * k, 28 * k], hf: [28 * k, 27 * k, 22 * k] };
}
function adamPaintSitArm(S, o = {}) {
  const g = adamSitArmGeom(o.dx || 0, o.dy || 0), dk = o.dk || 0;
  const SR = adamRamp(ADAM_C.shirt, 5, { span: 0.32, cool: 12, warm: 16 }).map((c) => shade(c, dk));
  // el (önce; kol ucu üstüne biner): bilekten öne-aşağı sarkar, dizin önünden
  const ang = 1.08, hx = g.wr[0] + Math.cos(ang) * -5, hy = g.wr[1] + Math.sin(ang) * -5;
  let hp = null;
  if (!o.noHand) {
    if (dk) { const geo = adamHandRelaxedGeom(hx, hy, ang, ADAM_SIT.kS); adamRegion(S, geo.sh, { ramp: ADAM_SKIN().map((c) => shade(c, dk)), shade: Paint.cst(0.45), dir: ang, len: [12, 22], wid: [5, 9], cover: 2.6, rim: false }); }
    else hp = adamHandRelaxed(S, hx, hy, ang, ADAM_SIT.kS);
  }
  const path = new Path2D();
  const tu = adamTube(g.up, g.hu, { startCap: 1.08, endCap: 1.0 }), tf = adamTube(g.fo, g.hf, { startCap: 1.0 });
  const pu = adamCurve(tu), pf = adamCurve(tf);
  path.addPath(adamPoly(pu)); path.addPath(adamPoly(pf));
  const axis = [g.sh, g.el, g.wr];
  if (o.shadowOn) { adamArmShadow(S, path, o.shadowOn, shade(ADAM_C.shirt, -0.12), 8, 8, 0.85); adamOccl(S, pu.slice(0, Math.floor(pu.length * 0.8)), o.shadowOn, shade(ADAM_C.shirt, -0.16), 2.4, 0.85); adamOccl(S, pf, o.shadowOn, shade(ADAM_C.shirt, -0.16), 2.4, 0.85); }
  if (!dk) { adamRim(S, adamCurve(tu.slice(1, 4), false), 2.2); adamRim(S, adamCurve(tf.slice(3, 9), false), 2.2); }
  S.region(path, { bbox: adamBBox(pu.concat(pf)), ramp: SR.map((c) => shade(c, 0.015)), shade: adamTubeShade(axis, [36, 30, 24], { amb: 0.1, lz: 0.8 }), dir: adamAlong(axis, S, 0.2), len: [24, 46], wid: [10, 15], cover: 2.6, jitter: 7, rim: false, lJit: 0.02, broken: 0.03 });

  // dirsek kıvrımı + manşet
  S.line(adamCurve([[g.el[0] + 10, g.el[1] - 52], [g.el[0] + 20, g.el[1] - 30], [g.el[0] + 18, g.el[1] - 12]], false), 3, shade(ADAM_C.shirt, -0.14 + dk), { w1: 1.4, edge: false });
  const a = g.fo[1], b = g.wr, t = 0.8, cx = lerp(a[0], b[0], t), cy = lerp(a[1], b[1], t), dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / dl, ny = (b[0] - a[0]) / dl, hw = 22;
  S.line([[cx + nx * hw, cy + ny * hw], [cx - nx * hw, cy - ny * hw]], 3, shade(ADAM_C.shirt, -0.13 + dk), { edge: false });
  return hp;
}

function adamPaintSitBody(S) {
  const PR = adamRamp(ADAM_C.pants, 5, { span: 0.3, cool: 10, warm: 12 });
  const SHR = adamRamp(ADAM_C.shoe, 4, { span: 0.3, warm: 14 });
  const K = ADAM_SIT.knee, A = ADAM_SIT.ankle, H0 = ADAM_SIT.hip;
  const legAx = [[H0[0], H0[1]], K, A];
  const legPaint = (pts, dk, ax) => {
    const sh = adamShape(pts);
    if (!dk) adamRim(S, sh.poly.slice(0, Math.floor(sh.poly.length * 0.8)), 2.4);
    adamRegion(S, sh, { ramp: PR.map((c) => shade(c, dk)), shade: adamTubeShade(ax, [56, 42, 30], { amb: 0.08, lz: 0.75 }), dir: adamAlong(ax, S, 0.2), len: [30, 56], wid: [11, 16], cover: 2.6, jitter: 8, rim: false });
    return sh;
  };
  const shoePaint = (pts, dk) => {
    const sh = adamShape(pts);
    if (!dk) adamRim(S, sh.poly, 1.6);
    adamRegion(S, sh, { ramp: SHR.map((c) => shade(c, dk)), shade: adamEllShade(A[0] + 30, A[1] - 10, 120, 56, { amb: 0.15, lz: 0.8 }), dir: 0.12, len: [14, 28], wid: [6, 9], cover: 3, jitter: 4, rim: false });
    adamShoeDetail(S, (x, y) => [A[0] + (x - 262) * ADAM_SIT.kS + (pts.dx || 0), ADAM_SIT.ground + (y - 1200) * ADAM_SIT.kS], dk);
  };
  // uzak bacak + ayakkabı (biraz önde ve yukarıda, koyu)
  const fdx = 22, fdy = -8;
  shoePaint(adamSitShoe(fdx + 6, 0), -0.06);
  legPaint(adamSitLeg().map(([x, y, t]) => (t === undefined ? [x + fdx, y + fdy] : [x + fdx, y + fdy, t])), -0.06, legAx.map(([x, y]) => [x + fdx, y + fdy]));
  // gövde
  const torso = adamShape(adamSitTorso());
  const SR = adamRamp(ADAM_C.shirt, 5, { span: 0.32, cool: 12, warm: 16 });
  const tAx = [ADAM_SIT.T(252, 250), ADAM_SIT.T(258, 420), [150, 590]];
  adamRim(S, adamCurve(adamSitTorso().slice(0, 12), false), 2.4);
  adamRegion(S, torso, { ramp: SR, shade: adamTubeShade(tAx, [76, 76, 70], { amb: 0.08, lz: 0.8 }), dir: adamAlong(tAx, S, 0.22), len: [28, 56], wid: [11, 17], cover: 2.6, jitter: 9, rim: false });
  const tl = adamSitTorso(); S.line(adamCurve(tl.slice(21).concat([tl[0]]).reverse(), false), 3.2, shade(ADAM_C.shirt, -0.14), { w1: 2.2, edge: false });
  // yakın ayakkabı + bacak
  shoePaint(adamSitShoe(0, 0), 0);
  const leg = legPaint(adamSitLeg(), 0, legAx);
  // diz arkası ve kalça kırışıkları
  const kc = adamSitLeg()[7];
  S.x.save(); S.x.clip(leg.path);
  S.line(adamCurve([[kc[0] - 16, kc[1] - 26], [kc[0] - 4, kc[1] - 10], [kc[0] + 6, kc[1] - 4]], false), 3, shade(ADAM_C.pants, -0.13), { w1: 1.4, edge: false });
  S.x.restore();
  // gömlek eteği: kalça/oturağın üstüne düşer (bacağın üstüne yeniden boyanır)
  const flapPts = [[196, 392], [204, 450], [205, 500], [192, 552], [164, 590], [126, 613]];
  const flap = adamShape([[80, 360], ...flapPts, [80, 650]]);
  S.x.save(); S.x.clip(torso.path); S.hx.save(); S.hx.clip(torso.path);
  adamRegion(S, flap, { ramp: SR, shade: adamTubeShade(tAx, [76, 76, 70], { amb: 0.08, lz: 0.8 }), dir: adamAlong(tAx, S, 0.22), len: [26, 50], wid: [11, 16], cover: 2.6, jitter: 9, rim: false });
  S.x.restore(); S.hx.restore();
  S.line(adamCurve(flapPts.slice(1).map(([x, y]) => [x - 2, y - 1]), false), 3.6, shade(ADAM_C.shirt, -0.13), { w1: 2.4, edge: false });
  // yakın kol (gövdeye ve bacağa düşen gölgesiyle)
  return adamPaintSitArm(S, { shadowOn: [torso.path, leg.path] });
}

defSprite('adam-oturan-bas', () => {
  const S = Paint.sprite(ADAM_SIT.w, ADAM_SIT.h, { seed: 141 });
  adamPaintHead(S, ADAM_SIT.head[0], ADAM_SIT.head[1], ADAM_SIT.hs);
  return { canvas: S.finish({ emboss: 0.3 }), px: ADAM_SIT.neck[0], py: ADAM_SIT.neck[1], k: 1 };
});
defSprite('adam-oturan-govde', () => {
  const S = Paint.sprite(ADAM_SIT.w, ADAM_SIT.h, { seed: 142 });
  adamPaintSitBody(S);
  return { canvas: S.finish({ emboss: 0.55 }), px: ADAM_SIT.seat[0], py: ADAM_SIT.seat[1], k: 1 };
});

// ---------------------------------------------------------------- YAKIN PLAN (omuzlar + baş + nar taneli el)
const ADAM_YK = (() => {
  const hs = 470, k = hs / ADAM_ST.hs, gx = 560, top = 92;
  const T = (x, y) => [gx + (x - ADAM_ST.gx) * k, top + (y - ADAM_ST.top) * k]; // ayakta çerçevesinden
  return { w: 900, h: 1100, hs, k, gx, top, T, neck: T(...ADAM_ST.neck), shoulder: T(...ADAM_ST.shoulder), elbow: [352, 1062], wrist: [662, 693] };
})();

function adamYkTorso() {
  const st = adamStandTorso(), T = ADAM_YK.T;
  const m = (i) => { const p = T(st[i][0], st[i][1]); return st[i].length > 2 ? [...p, st[i][2]] : p; };
  return [m(0), m(1), m(2), m(3), m(4), [80, 1160, 0], [600, 1160, 0], m(20), m(21), m(22), m(23), m(24), m(25), m(26), m(27)];
}
// üst kol (gövdede): omuz başı → dirsek (kısalmış: dirsek izleyiciye doğru)
function adamYkUpperArm() {
  const S0 = ADAM_YK.shoulder, E0 = ADAM_YK.elbow, k = ADAM_YK.k;
  return { axis: [S0, [lerp(S0[0], E0[0], 0.5) + 6, lerp(S0[1], E0[1], 0.5)], E0], half: [40 * k, 34 * k, 30 * k] };
}
// önkol (kol sprite'ı): dirsek → bilek
function adamYkForearm() {
  const E0 = ADAM_YK.elbow, W0 = ADAM_YK.wrist, k = ADAM_YK.k;
  return { axis: [E0, [lerp(E0[0], W0[0], 0.45) - 4, lerp(E0[1], W0[1], 0.45)], W0], half: [28.5 * k, 27 * k, 21.5 * k] };
}

// Nar tanesi: parlak yakut, köşeli damla; içte soluk çekirdek, beyaz parıltı
function adamAril(S, cx, cy, r, ang, seed) {
  const rr = rng(seed), pts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, el = 1 + 0.38 * Math.cos(a) * (Math.cos(a) > 0 ? 1 : 0.4); // bir yana sivri
    const q = r * el * (0.92 + rr() * 0.12), x = Math.cos(a) * q * 1.12, y = Math.sin(a) * q * 0.88;
    pts.push([cx + x * Math.cos(ang) - y * Math.sin(ang), cy + x * Math.sin(ang) + y * Math.cos(ang), 0.55]);
  }
  const sh = adamShape(pts, true, 1.5);
  adamRim(S, sh.poly, 1.6, { th: 0.2 });
  const R = ['#5E0718', '#8A0D25', '#B3122F', '#D8243F', '#F0546C'];
  adamRegion(S, sh, { ramp: R, shade: adamEllShade(cx - r * 0.25, cy - r * 0.3, r * 1.1, r * 1.1, { amb: 0.05, lz: 0.5 }), dir: ang + Math.PI / 2, len: [r * 0.5, r * 0.9], wid: [r * 0.22, r * 0.36], cover: 3.2, jitter: 1, noise: 0.02, rim: false });
  // içteki çekirdek (yarı saydam soluk pembe)
  const c2 = [cx + Math.cos(ang) * r * 0.25, cy + Math.sin(ang) * r * 0.25];
  adamFill(S, ellipsePath(c2[0], c2[1], r * 0.42, r * 0.22, ang), 'rgba(250,200,200,0.35)');
  // koyu kenar + parıltılar
  S.line(sh.poly.concat([sh.poly[0]]), Math.max(1.4, r * 0.08), '#4A0614', { edge: false });
  S.dab(cx - r * 0.38, cy - r * 0.36, ang - 0.6, r * 0.55, r * 0.2, '#FFE6EA', { alpha: 0.95 });
  adamFill(S, ellipsePath(cx - r * 0.1, cy - r * 0.5, r * 0.09, r * 0.09), '#FFFFFF');
}

// Tutam (çimdik) eli: başparmak ve işaret parmağı uçları buluşur, 3 nar tanesi dudak önünde.
// Yerel çerçeve: köken bilek; u el ekseni boyunca (yukarı), v eksene dik (+v sola: yüze doğru). Birim: ayakta px (× k).
function adamHandPinch(S, o = {}) {
  const k = ADAM_YK.k, W0 = ADAM_YK.wrist;
  const ang = -1.45, c = Math.cos(ang), s = Math.sin(ang);
  const M = (pts) => pts.map(([u, v, t]) => { const p = [W0[0] + (c * u + s * v) * k, W0[1] + (s * u - c * v) * k]; return t === undefined ? p : [...p, t]; });
  const SK = ADAM_SKIN();
  const line = shade(ADAM_C.skin, -0.24, 1.1, -10), dk = shade(ADAM_C.skin, -0.16, 1.08, -6);
  const lw = 1.5 * k; // ayrım çizgisi kalınlığı
  // avuç + kıvrık parmaklar (tek kütle)
  const mass = [[-2, -19], [16, -22.5], [34, -23.5], [47, -21], [57, -16], [62, -7], [62, 3], [57, 10], [48, 13], [38, 16], [24, 19], [10, 18.5], [-2, 17]];
  // işaret parmağı: boğumdan yükselir, ucu yüze doğru kıvrılır
  const index = [[44, -15], [56, -17], [66, -13], [73.5, -5], [76.5, 5], [74.5, 14], [69.5, 20.5, 0.6], [64.5, 19.5], [63.5, 12], [60, 5], [53, 1], [45, 0]];
  // başparmak: avuç yanından yükselir, ucu işaret ucuna değer
  const thumb = [[6, 15], [18, 22.5], [32, 26.5], [46, 27.5], [58, 26.5], [65.5, 23.5, 0.6], [66.5, 18.5], [59, 16.5], [47, 16.5], [34, 15.5], [20, 12.5]];
  const tub = (a, b2, r, bias = 0) => adamTubeShade(M([a, b2]), r * k, { amb: 0.2, lz: 0.95, gain: 0.8, bias: bias - 0.06 });
  const reg = (pts, shf, dirA, big = 1) => {
    const sh = adamShape(M(pts), true, 1.5);
    adamRegion(S, sh, { ramp: SK, shade: shf, dir: () => ang + dirA + (S.r() - 0.5) * 0.25, len: [16 * big, 30 * big], wid: [7 * big, 11 * big], cover: 2.6, jitter: 4, noise: 0.01, lJit: 0.015, broken: 0.02, rim: false });
    return sh;
  };
  const outline = (sh, from = 0, to = 1, wd = lw) => { const P2 = sh.poly.concat([sh.poly[0]]); S.line(P2.slice(Math.floor(from * P2.length), Math.ceil(to * P2.length)), wd, line, { edge: false }); };
  const shMass = adamShape(M(mass), true, 1.5);
  adamRim(S, shMass.poly.slice(0, Math.floor(shMass.poly.length * 0.55)), 2.6);
  reg(mass, tub([0, -3], [62, -3], 22, -0.02), 0, 1.1);
  // kıvrık parmak boğumları (arka kenarda iki küçük çizgi) ve eklem ışığı
  S.line(adamCurve(M([[50, -19], [55, -13]]), false, 2), lw * 0.8, dk, { w1: lw * 0.4, edge: false });
  S.dab(...M([[30, -17]])[0], ang, 18 * k * 0.6, 5.5 * k * 0.6, shade(SK[3], 0.03), { alpha: 0.6 });
  // nar taneleri: parmak uçlarının arasında, dudağa doğru taşar (parmakların arkasında başlar)
  const ar = 6.6 * k;
  const A = M([[71, 27.5], [63.5, 31.5], [77, 22.5]]);
  adamAril(S, A[1][0], A[1][1], ar * 0.92, ang + 0.7, 301);
  adamAril(S, A[2][0], A[2][1], ar * 0.95, ang + 1.9, 302);
  adamAril(S, A[0][0], A[0][1], ar * 1.05, ang + 1.25, 303);
  // başparmak ve işaret parmağı (üstte, ince koyu ayrım çizgileriyle)
  const shT = reg(thumb, tub([8, 18], [66, 21], 7.5, -0.03), -0.22, 0.75);
  outline(shT, 0.47, 0.66);
  const shI = reg(index, tub([46, -8], [72, 14], 7, 0.04), 0.55, 0.75);
  outline(shI, 0.5, 0.74);
  adamRim(S, shI.poly.slice(0, Math.floor(shI.poly.length * 0.5)), 2.2);
  // tırnaklar
  const nail = (pts) => { const sh = adamShape(M(pts), true, 1); adamFill(S, sh.path, shade(ADAM_C.skin, 0.1, 0.75, 8), 0.95); S.line(sh.poly.concat([sh.poly[0]]), lw * 0.6, dk, { edge: false }); };
  nail([[62, 23.5], [66, 22.8], [66.5, 26], [62.5, 26.5]]);
  nail([[71.5, 11], [75, 11.5], [73.5, 17.5], [70.5, 16.5]]);
  return { pinch: M([[69, 22]])[0], arils: A, shapes: [shMass, shT, shI] };
}

function adamPaintYkBody(S) {
  const SR = adamRamp(ADAM_C.shirt, 5, { span: 0.32, cool: 12, warm: 16 });
  const k = ADAM_YK.k;
  const torso = adamShape(adamYkTorso());
  const tAx = [ADAM_YK.T(252, 250), ADAM_YK.T(258, 420)];
  adamRim(S, adamCurve(adamYkTorso().slice(0, 5), false), 3.2);
  adamRim(S, adamCurve(adamYkTorso().slice(7, 12), false), 3.2);
  adamRegion(S, torso, { ramp: SR, shade: adamTubeShade(tAx, [80 * k, 80 * k], { amb: 0.08, lz: 0.8 }), dir: adamAlong(tAx, S, 0.22), len: [36, 70], wid: [14, 22], cover: 2.6, jitter: 14, rim: false, max: 3000 });
  // yaka çizgisi
  const tl = adamYkTorso();
  S.line(adamCurve(tl.slice(11).concat([tl[0]]).reverse().map(([x, y]) => [x, y + 6]), false), 7, shade(ADAM_C.shirt, -0.14), { w1: 5, edge: false });
  // üst kol + dirsek
  const { axis, half } = adamYkUpperArm();
  const tu = adamTube(axis, half, { startCap: 1.06, endCap: 1.0 });
  const sh = adamShape(tu);
  // örtüşme çizgileri: arka kenar (omuzdan dirseğe doğru) ve ön kenar (koltuk altından)
  const Ls = adamTube(axis, half, {}).slice(0, 3), Rs = adamTube(axis, half, {}).slice(3).reverse();
  const part = (P2, t0, t1) => { const c2 = adamCurve(P2, false); return c2.slice(Math.floor(t0 * c2.length), Math.floor(t1 * c2.length)); };
  adamOccl(S, part(Ls, 0.02, 0.8), [torso.path], shade(ADAM_C.shirt, -0.16), 5, 0.85);
  adamOccl(S, part(Rs, 0.1, 0.75), [torso.path], shade(ADAM_C.shirt, -0.16), 5, 0.85);
  adamRim(S, adamCurve(tu.slice(1, 3), false), 3);
  adamRegion(S, sh, { ramp: SR.map((c) => shade(c, 0.035)), shade: adamTubeShade(axis, half, { amb: 0.08, lz: 0.8 }), dir: adamAlong(axis, S, 0.22), len: [36, 66], wid: [14, 21], cover: 2.6, jitter: 12, rim: false });
  // koltuk altı / göğüs gölge kıvrımı
  S.line(adamCurve([[axis[1][0] + half[1] - 6, axis[1][1] - 60], [axis[1][0] + half[1] + 4, axis[1][1] + 20], [axis[2][0] + half[2] - 2, axis[2][1] - 30]], false), 6, shade(ADAM_C.shirt, -0.15), { w1: 3, edge: false });
}

function adamPaintYkArm(S) {
  const SR = adamRamp(ADAM_C.shirt, 5, { span: 0.32, cool: 12, warm: 16 });
  const hp = adamHandPinch(S);
  const { axis, half } = adamYkForearm();
  const tf = adamTube(axis, half, { startCap: 1.0 });
  const sh = adamShape(tf);
  adamRim(S, adamCurve(tf.slice(1, 3), false), 3); adamRim(S, adamCurve(tf.slice(4, 7), false), 3);
  const SRf = adamRamp(shade(ADAM_C.shirt, 0.03), 4, { span: 0.24, cool: 10, warm: 14 });
  adamRegion(S, sh, { ramp: SRf, shade: adamTubeShade(axis, half.map((h) => h * 1.1), { amb: 0.12, lz: 0.9 }), dir: adamAlong(axis, S, 0.14), len: [40, 80], wid: [14, 22], cover: 2.6, jitter: 18, jitterFreq: 0.008, rim: false, lJit: 0.015, broken: 0.02 });
  // manşet bandı + kumaş kıvrımları
  const a = axis[1], b = axis[2], t = 0.86, cx = lerp(a[0], b[0], t), cy = lerp(a[1], b[1], t), dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / dl, ny = (b[0] - a[0]) / dl, hw = lerp(half[1], half[2], t) - 2;
  S.line([[cx + nx * hw, cy + ny * hw], [cx - nx * hw, cy - ny * hw]], 6, shade(ADAM_C.shirt, -0.14), { edge: false });
  S.line(adamCurve([[axis[0][0] + 30, axis[0][1] - 70], [axis[0][0] + 70, axis[0][1] - 120], [axis[0][0] + 90, axis[0][1] - 190]], false), 5, shade(ADAM_C.shirt, -0.12), { w1: 2, taper: true, edge: false });
  return hp;
}

defSprite('adam-yakin-bas', () => {
  const S = Paint.sprite(ADAM_YK.w, ADAM_YK.h, { seed: 161 });
  adamPaintHead(S, ADAM_YK.gx, ADAM_YK.top, ADAM_YK.hs, { detail: 0.6 });
  return { canvas: S.finish({ emboss: 0.35 }), px: ADAM_YK.neck[0], py: ADAM_YK.neck[1], k: 1 };
});
defSprite('adam-yakin-govde', () => {
  const S = Paint.sprite(ADAM_YK.w, ADAM_YK.h, { seed: 162 });
  adamPaintYkBody(S);
  return { canvas: S.finish({ emboss: 0.5 }), px: ADAM_YK.w / 2, py: ADAM_YK.h, k: 1 };
});
defSprite('adam-yakin-kol', () => {
  const S = Paint.sprite(ADAM_YK.w, ADAM_YK.h, { seed: 163 });
  adamPaintYkArm(S);
  return { canvas: S.finish({ emboss: 0.5 }), px: ADAM_YK.elbow[0], py: ADAM_YK.elbow[1], k: 1 };
});

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
// ölçü noktasını ekrana taşır; baş/kol dönüşlerini (o.head, o.arm) hesaba katar
ADAM.PARTS = {
  ayakta: { head: ['eye', 'ear', 'nose', 'mouth'], arm: ['fingertip', 'palm'] },
  oturan: { head: ['eye', 'ear', 'nose', 'mouth'], arm: [] },
  yakin: { head: ['eye', 'ear', 'nose', 'mouth'], arm: ['handAtMouth', 'arils', 'wrist'] },
};
ADAM.pt = (pose, name, x, y, sc = 1, o = {}) => {
  const g = spr('adam-' + pose + '-govde'), M = ADAM[pose], P = ADAM.PARTS[pose];
  let p = M[name];
  const rot = (q, c, a) => adamRot(c[0], c[1], a)(q[0], q[1]);
  if (o.head && P.head.includes(name)) p = rot(p, M.neck, o.head);
  if (o.arm && P.arm.includes(name)) p = rot(p, pose === 'yakin' ? M.elbow : M.shoulder, o.arm);
  return [x + (p[0] - g.px) * sc, y + (p[1] - g.py) * sc];
};

// ---- dışa açık ölçüler (her biri kendi poz çerçevesinin koordinatlarında, px)
ADAM.ayakta = (() => {
  const X = (u, v) => [ADAM_ST.gx + u * ADAM_ST.hs, ADAM_ST.top + v * ADAM_ST.hs], P = ADAM_HEAD.pts;
  const { M } = adamHandRelaxedGeom(...adamStandHandPlace(), 1);
  return {
    w: ADAM_ST.w, h: ADAM_ST.h, ground: [290, ADAM_ST.ground], neck: ADAM_ST.neck, shoulder: ADAM_ST.shoulder,
    eye: X(...P.eye), ear: X(...P.ear), nose: X(...P.nose), mouth: X(...P.mouth),
    fingertip: M([[1.0, 0]])[0], palm: M([[0.45, 4]])[0], heart: ADAM_ORG.heart.center, lungs: [256, 362], stomach: [288, 484], intestine: [276, 580],
    foot: [318, 1170], hip: [258, 600], knee: [272, 888],
  };
})();
ADAM.oturan = (() => {
  const X = (u, v) => [ADAM_SIT.head[0] + u * ADAM_SIT.hs, ADAM_SIT.head[1] + v * ADAM_SIT.hs], P = ADAM_HEAD.pts;
  return { w: ADAM_SIT.w, h: ADAM_SIT.h, neck: ADAM_SIT.neck, seat: ADAM_SIT.seat, eye: X(...P.eye), ear: X(...P.ear), nose: X(...P.nose), mouth: X(...P.mouth), knee: ADAM_SIT.knee };
})();
ADAM.yakin = (() => {
  const X = (u, v) => [ADAM_YK.gx + u * ADAM_YK.hs, ADAM_YK.top + v * ADAM_YK.hs], P = ADAM_HEAD.pts;
  const k = ADAM_YK.k, W0 = ADAM_YK.wrist, a = -1.45, c = Math.cos(a), s = Math.sin(a);
  const M = (u, v) => [W0[0] + (c * u + s * v) * k, W0[1] + (s * u - c * v) * k];
  return { w: ADAM_YK.w, h: ADAM_YK.h, neck: ADAM_YK.neck, elbow: ADAM_YK.elbow, mouth: X(...P.mouth), eye: X(...P.eye), nose: X(...P.nose), ear: X(...P.ear), handAtMouth: M(69, 22), arils: M(70, 28), wrist: W0 };
})();
