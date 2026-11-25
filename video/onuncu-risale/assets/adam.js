// Adam: sade, ayrıntısız ama doğru oranlı erkek figürü — daima profil, sağa bakar (S-042 Akrilik).
// Pozlar: ayakta (gövde/baş/kol + şema + organlar), oturan (gövde/baş), yakın (gövde/baş/önkol).
// Her pozun bütün parçaları AYNI boyut ve koordinat çerçevesindeki tuvallere boyanır; her parçanın
// pivotu döndüğü eklemdir. Önerilen çizim sırası: baş → gövde → kol (ADAM.draw).
// Boyun yakada biter; gövde tuvalinde başın boynuyla birebir aynı darbelerden boyanmış, yukarı doğru
// solan kısa bir "boyun kökü" vardır. Böylece baş dönünce yaka çevresinde boşluk kalmaz ve sahne
// yanlış sırayla (gövde → baş) çizse bile yakanın üstüne ten lekesi taşmaz.
// Oturan poz P1'de ~1.8x yakın çekildiği için k = 1.75 çözünürlükte boyanır (ölçüler çerçeve biriminde).
'use strict';

const ADAM = {};
const ADAM_C = {
  skin: '#D49A72', hair: '#45291D', beard: '#4B3123', shirt: '#2470A8', pants: '#3B2F66', shoe: '#6A3A22',
  lip: '#B0645A', iris: '#2A1A14',
};
// elle seçilmiş ton basamakları (koyu → açık); giysilerde üç ana bant: arka/üst ışık, orta, ön gölge
const ADAM_PAL = {
  skin: ['#A8644A', '#BE7F5E', '#D49A72', '#E6B48B', '#F2CBA4'],
  shirt: ['#0F3A66', '#145B93', '#2A82C2', '#62A8E6', '#92C3F2'],
  pants: ['#1B0F3B', '#2F215A', '#48387D', '#665B9B', '#7A71A9'],
  shoe: ['#40200F', '#56301B', '#6A3A22', '#8A5232', '#AB6E46'],
  hair: ['#26170F', '#352016', '#45291D', '#5E3B29', '#7C543A'],
  beard: ['#2B1A12', '#3B271B', '#4B3123', '#654431', '#825B41'],
};
const ADAM_SKIN = () => ADAM_PAL.skin;
const adamDk = (pal, d) => pal.map((c) => shade(c, d, 1.02));
const ADAM_L2 = [-0.62, -0.78]; // ışık yönü (sol üst), 2B

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
// biçim: {poly, path, bb, c(ağırlık merkezi)}
function adamShape(pts, closed = true, step = 2.5) {
  const poly = adamCurve(pts, closed, step); let cx = 0, cy = 0; for (const p of poly) { cx += p[0]; cy += p[1]; }
  return { poly, path: adamPoly(poly, closed), bb: adamBBox(poly), c: [cx / poly.length, cy / poly.length] };
}
const adamMap = (pts, f) => pts.map((p) => { const q = f(p[0], p[1]); return p.length > 2 ? [q[0], q[1], p[2]] : q; });
const adamRot = (cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return (x, y) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]; };
const adamSub = (poly, t0, t1) => poly.slice(Math.floor(t0 * poly.length), Math.ceil(t1 * poly.length));
// kalın uzuv dış hattı: eksen + yarı genişlikler; uçlar yuvarlak isteğe bağlı. L = eksenin sol yanı (−dy, dx)
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
  const cap = (c, p0, p1, steps, bulge) => {
    const a0 = Math.atan2(p0[1] - c[1], p0[0] - c[0]); const a1 = Math.atan2(p1[1] - c[1], p1[0] - c[0]);
    const r0 = Math.hypot(p0[0] - c[0], p0[1] - c[1]) * bulge;
    let d = a1 - a0; while (d >= 0) d -= Math.PI * 2; // dışa doğru (eksenin ucundan öteye) yay
    for (let k = 1; k < steps; k++) { const a = a0 + (d * k) / steps; pts.push([c[0] + Math.cos(a) * r0, c[1] + Math.sin(a) * r0]); }
  };
  for (let i = 0; i < n; i++) pts.push(L[i].slice());
  if (o.endCap) cap(axis[n - 1], L[n - 1], R[n - 1], 6, o.endCap); else pts[pts.length - 1].push(0);
  for (let i = n - 1; i >= 0; i--) pts.push(R[i].slice());
  if (o.endCap === undefined) pts[n].push(0);
  if (o.startCap) cap(axis[0], R[0], L[0], 6, o.startCap); else { pts[pts.length - 1].push(0); pts[0].push(0); }
  pts.L = L; pts.R = R;
  return pts;
}
// en yakın eksen parçası: [i, t, nx, ny, px, py]
function adamNear(axis, x, y) {
  let bd = 1e18, bs = 0, bt = 0;
  for (let i = 0; i < axis.length - 1; i++) {
    const a = axis[i], b = axis[i + 1], dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1;
    const t = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2), px = a[0] + dx * t, py = a[1] + dy * t;
    const d = (x - px) * (x - px) + (y - py) * (y - py);
    if (d < bd) { bd = d; bs = i; bt = t; }
  }
  const a = axis[bs], b = axis[bs + 1], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [bs, bt, -dy / l, dx / l, a[0] + dx * bt, a[1] + dy * bt, Math.atan2(dy, dx)];
}

// ---------------------------------------------------------------- gölgelendirme yardımcıları
// eksen boyunca silindir ışığı (sol üstten; 0..1)
function adamTubeShade(axis, r, o = {}) {
  const Lg = Paint.L, lz = o.lz ?? 0.62, amb = o.amb ?? 0.08, ln = Math.hypot(Lg[0], Lg[1], lz), gain = o.gain ?? 1, bias = o.bias ?? 0;
  return (x, y) => {
    const [bs, bt, nx, ny, px, py] = adamNear(axis, x, y);
    const rr = Array.isArray(r) ? lerp(r[bs], r[bs + 1], bt) : r;
    const s = clamp(((x - px) * nx + (y - py) * ny) / rr, -1, 1), nz = Math.sqrt(1 - s * s);
    const v = (s * nx * Lg[0] + s * ny * Lg[1] + nz * lz) / ln;
    return clamp(amb + (1 - amb) * (v * 0.5 + 0.5) * gain + bias + (o.add ? o.add(x, y) : 0));
  };
}
// giysi bantları: kesit konumuna göre doğrusal (ışığa bakan yan açık), üç net bant verir
function adamBand(axis, r, o = {}) {
  const k1 = o.k1 ?? 0.62, k2 = o.k2 ?? 0.14, bias = o.bias ?? 0;
  return (x, y) => {
    const [bs, bt, nx, ny, px, py] = adamNear(axis, x, y);
    const rr = Array.isArray(r) ? lerp(r[bs], r[bs + 1], bt) : r;
    const s = clamp(((x - px) * nx + (y - py) * ny) / rr, -1, 1), nz = Math.sqrt(1 - s * s);
    const sL = s * (nx * ADAM_L2[0] + ny * ADAM_L2[1]);
    return clamp(0.5 + k1 * sL + k2 * (nz - 0.7) + bias + (o.add ? o.add(x, y) : 0));
  };
}
function adamEllShade(cx, cy, rx, ry, o = {}) {
  const Lg = Paint.L, lz = o.lz ?? 0.6, amb = o.amb ?? 0.08, ln = Math.hypot(Lg[0], Lg[1], lz), bias = o.bias ?? 0;
  return (x, y) => {
    const nx = (x - cx) / rx, ny = (y - cy) / ry, d2 = nx * nx + ny * ny;
    const k = d2 > 1 ? 1 / Math.sqrt(d2) : 1, nz = Math.sqrt(Math.max(0, 1 - d2));
    const v = (nx * k * Lg[0] + ny * k * Lg[1] + nz * lz) / ln;
    return clamp(amb + (1 - amb) * (v * 0.5 + 0.5) + bias + (o.add ? o.add(x, y) : 0));
  };
}
function adamAlong(axis, S, jit = 0.22, off = 0) {
  return (x, y) => adamNear(axis, x, y)[6] + off + (S.r() - 0.5) * jit;
}
const adamSpot = (cx, cy, rx, ry, amt) => (x, y) => { const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; return d >= 1 ? 0 : amt * (1 - d); };

function adamRegion(S, sh, o) { return S.region(sh.path, { bbox: sh.bb, lJit: 0.022, broken: 0.035, ...o }); }
// giysi boyama: uzun, biçimi izleyen, kuru uçlu darbeler
function adamCloth(S, sh, o) {
  return adamRegion(S, sh, { cover: 2.3, jitter: 9, jitterFreq: 0.01, noise: 0.025, broken: 0.03, dry: 0.5, lJit: 0.018, rim: false, ...o });
}
function adamFill(S, path, col, alpha = 1) { const c = S.x; c.save(); c.globalAlpha = alpha; c.fillStyle = col; c.fill(path); c.restore(); }
function adamClip(S, path, fn) { S.x.save(); S.x.clip(path); S.hx.save(); S.hx.clip(path); fn(); S.x.restore(); S.hx.restore(); }

// Kırık kenar şeridi. Varsayılan: turuncu astar, biçimin DIŞINA taşar (dolgudan önce çağrılır).
// Genişlik gürültüyle 0..w arasında değişir, kenarın yaklaşık yarısında hiç yoktur ve gölge yanına
// (sağ alt) bakan kenarlarda daha geniştir. o.inward: biçimin İÇİNE çizilen koyu örtüşme/gölge çizgisi.
function adamRim(S, poly, w = 2.6, o = {}) {
  if (!Array.isArray(poly) || poly.length < 2) return;
  const n = poly.length, sd = S.r() * 200, fq = o.freq ?? 0.02, th = o.th ?? 0.52, gain = o.gain ?? 2.0;
  let cx = 0, cy = 0;
  if (o.c) [cx, cy] = o.c; else { for (const p of poly) { cx += p[0]; cy += p[1]; } cx /= n; cy /= n; }
  const A = [], B = []; let acc = 0;
  for (let i = 0; i < n; i++) {
    const a = poly[Math.max(0, i - 1)], b = poly[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    let nx = -dy / l, ny = dx / l;
    if (nx * (poly[i][0] - cx) + ny * (poly[i][1] - cy) < 0) { nx = -nx; ny = -ny; }
    if (i) acc += Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]);
    const away = o.flat ? 0.6 : clamp(-(nx * ADAM_L2[0] + ny * ADAM_L2[1]) * 0.5 + 0.5);
    const thr = th + (o.lw ?? 0.24) * (0.5 - away);
    const nv = 0.6 * NOISE(acc * fq + sd, sd * 0.37) + 0.4 * NOISE(acc * fq * 3.3 + 7, sd);
    const hw = w * clamp(((nv - thr) / (1 - thr)) * gain, 0, 1) * lerp(o.minW ?? 0.3, 1, away);
    if (o.inward) { A.push([poly[i][0] + nx * 0.6, poly[i][1] + ny * 0.6]); B.push([poly[i][0] - nx * hw, poly[i][1] - ny * hw]); }
    else { A.push([poly[i][0] + nx * hw, poly[i][1] + ny * hw]); B.push([poly[i][0] - nx * Math.min(hw, 1.2), poly[i][1] - ny * Math.min(hw, 1.2)]); }
  }
  const p = new Path2D(); A.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
  for (let i = n - 1; i >= 0; i--) p.lineTo(B[i][0], B[i][1]);
  p.closePath();
  adamFill(S, p, o.color ?? Paint.UNDER, o.alpha ?? 0.9);
}
// kuru fırça saçağı: çizgi boyunca düzensiz aralıklı, değişken boy ve saydamlıkta kısa sivri darbeler
// (vektör kenarı kırar). ang(x,y,nx,ny,tx,ty): darbe yönü; push: darbeyi kendi yönünde kaydırır (0..1)
function adamFray(S, poly, cols, o = {}) {
  const n = poly.length; if (n < 2) return;
  const step = o.step ?? 5, sj = o.stepJit ?? 0.75; let acc = 0, next = step * S.r();
  for (let i = 1; i < n; i++) {
    const a = poly[i - 1], b = poly[i], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6;
    const tx = (b[0] - a[0]) / d, ty = (b[1] - a[1]) / d, nx = -ty, ny = tx;
    while (acc + d >= next) {
      const t = (next - acc) / d, x = lerp(a[0], b[0], t), y = lerp(a[1], b[1], t);
      const ang = o.ang ? o.ang(x, y, nx, ny, tx, ty) : Math.atan2(ny, nx);
      const len = lerp(o.len[0], o.len[1], Math.pow(S.r(), 1.4)), wid = lerp(o.wid[0], o.wid[1], S.r());
      const off = (o.off ?? 0) + (S.r() - 0.5) * (o.offJit ?? 1.5), push = (o.push ?? 0) * len * 0.5;
      const col = cols[Math.floor(S.r() * cols.length)];
      S.dab(x + nx * off + Math.cos(ang) * push, y + ny * off + Math.sin(ang) * push, ang, len, wid, col, { alpha: (o.alpha ?? 0.9) * (0.55 + 0.45 * S.r()), dry: 1, height: o.height });
      next += step * (1 - sj + S.r() * sj * 2);
    }
    acc += d;
  }
}
// konik, kuru uçlu tek çizgi (saç ışık izi vb.)
function adamStreak(S, pts, w, col, alpha = 0.85) { S.x.save(); S.x.globalAlpha = alpha; S.line(pts, w, col, { w1: w * 0.25, taper: true, edge: false }); S.x.restore(); }

// yüksek çözünürlüklü sprite: çerçeve biriminde çizilir, tuval K kat büyüktür (drawSpr k = K)
function adamSprite(w, h, seed, K = 1) {
  const S = Paint.sprite(Math.ceil(w * K), Math.ceil(h * K), { seed });
  S.K = K; S.fw = w; S.fh = h;
  if (K !== 1) {
    S.x.scale(K, K); S.hx.scale(K, K);
    const ip = S.x.isPointInPath.bind(S.x);
    S.x.isPointInPath = (p, x, y) => ip(p, x * K, y * K);
  }
  return S;
}
const adamOut = (S, px, py, emboss = 0.3) => ({ canvas: S.finish({ emboss }), px: px * S.K, py: py * S.K, k: S.K });
// çoklu çizginin üst tarafı (boyun kırpması için)
function adamAbove(poly, dy = 0) {
  const p = new Path2D(), a = poly[0], b = poly[poly.length - 1], E = 6000;
  p.moveTo(a[0] - E, a[1] + dy); for (const q of poly) p.lineTo(q[0], q[1] + dy);
  p.lineTo(b[0] + E, b[1] + dy); p.lineTo(b[0] + E, -E); p.lineTo(a[0] - E, -E); p.closePath();
  return p;
}

// ---------------------------------------------------------------- BAŞ (birim: baş yüksekliği = 1)
// köken: x = glabella (kaş arası) dikeyi, y = kafatası tepesi. +x yüz yönü (sağ), +y aşağı.
const ADAM_HEAD = {
  face: [
    [-0.32, 0.02], [-0.12, 0.07], [-0.062, 0.15], [-0.026, 0.27], [-0.004, 0.38], [0.002, 0.425],
    [-0.02, 0.478, 0.6], [0.012, 0.535], [0.058, 0.6], [0.102, 0.646], [0.106, 0.671], [0.084, 0.689],
    [0.045, 0.698], [0.02, 0.706, 0], [0.03, 0.735], [0.041, 0.764], [0.02, 0.788, 0.4], [0.034, 0.812],
    [0.016, 0.842], [-0.01, 0.866], [0.006, 0.9], [0.012, 0.932], [-0.014, 0.975], [-0.07, 1.0],
    [-0.17, 1.0], [-0.3, 0.965], [-0.42, 0.885], [-0.52, 0.8], [-0.62, 0.83], [-0.73, 0.79], [-0.845, 0.62],
    [-0.878, 0.45], [-0.845, 0.28], [-0.73, 0.12], [-0.53, 0.025],
  ],
  // boyun: gırtlak çenenin epey gerisinde, tabanda göğüs kemiğine doğru öne açılır; yakada kırpılır
  neck: [
    [-0.25, 0.95], [-0.272, 1.02], [-0.284, 1.09], [-0.282, 1.17], [-0.27, 1.25], [-0.252, 1.33], [-0.232, 1.41],
    [-0.215, 1.5, 0], [-0.55, 1.6], [-0.88, 1.5, 0], [-0.872, 1.36], [-0.835, 1.22], [-0.8, 1.06],
    [-0.757, 0.88], [-0.6, 0.78], [-0.42, 0.82],
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
  // kısa, düzgün kesilmiş sakal: çene hattını izler
  beard: [
    [-0.474, 0.585], [-0.425, 0.668], [-0.33, 0.722], [-0.21, 0.748], [-0.11, 0.758], [-0.064, 0.756],
    [-0.046, 0.728], [-0.012, 0.715], [0.02, 0.719], [0.036, 0.736, 0.6], [0.026, 0.752], [0.0, 0.759], [-0.03, 0.771, 0],
    [-0.008, 0.83, 0], [0.014, 0.838], [0.026, 0.872], [0.03, 0.918], [0.012, 0.958], [-0.03, 0.99],
    [-0.11, 1.008], [-0.21, 1.004, 0.5], [-0.31, 0.972], [-0.4, 0.912], [-0.47, 0.82], [-0.495, 0.71], [-0.49, 0.62],
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

// Boyun. Başın İLK boyanan parçasıdır (aynı tohumla gövdede birebir tekrar boyanır: boyun kökü).
function adamPaintNeck(S, ox, oy, hs, o = {}) {
  const X = (u, v) => [ox + u * hs, oy + v * hs];
  const sh = (pts) => adamShape(adamMap(pts, X), true, Math.max(0.8, hs / 110));
  const ss = hs / 153, sz = o.detail ?? 1, SK = ADAM_SKIN(), HD = ADAM_HEAD;
  const neck = sh(HD.neck);
  const clip = o.collar ? adamAbove(o.collar, o.collarDy ?? 1.2) : null;
  if (clip) { S.x.save(); S.x.clip(clip); S.hx.save(); S.hx.clip(clip); }
  const axis = adamMap([[-0.53, 0.9], [-0.55, 1.25], [-0.55, 1.6]], X);
  const cN = X(-0.55, 1.2);
  adamRim(S, adamCurve(adamMap(HD.neck.slice(1, 8), X), false), 2.4 * ss, { c: cN });
  adamRim(S, adamCurve(adamMap(HD.neck.slice(9, 14), X), false), 2.4 * ss, { c: cN });
  // yüzden bir ton koyu
  adamRegion(S, neck, {
    ramp: SK.slice(0, 4), shade: adamTubeShade(axis, 0.27 * hs, { amb: 0.05, lz: 0.9, gain: 0.7, bias: -0.04 }), dir: adamAlong(axis, S, 0.3),
    len: [22 * ss * sz, 40 * ss * sz], wid: [7 * ss * sz, 11 * ss * sz], cover: 2.6, jitter: 6 * ss, rim: false, noise: 0.015, broken: 0.02, lJit: 0.014,
  });
  adamClip(S, neck.path, () => {
    // gırtlak üçgeni (boynun önü) gölgede; çene altında belirgin düşen gölge
    const scm = sh([[-0.56, 0.84], [-0.47, 1.12], [-0.41, 1.46], [-0.2, 1.62], [-0.15, 1.0], [-0.3, 0.9]]);
    adamRegion(S, scm, { ramp: [mix(SK[1], SK[2], 0.25), mix(SK[1], SK[2], 0.45)], shade: Paint.cst(0.5), dir: adamAlong(axis, S, 0.25), len: [18 * ss * sz, 34 * ss * sz], wid: [7 * ss * sz, 10 * ss * sz], cover: 2.4, rim: false, jitter: 2 * ss, lJit: 0.012, broken: 0 });
    const jaw = sh([[-0.13, 0.97], [-0.22, 1.075], [-0.34, 1.105], [-0.47, 1.06], [-0.59, 0.96], [-0.67, 0.85], [-0.55, 0.78], [-0.3, 0.9]]);
    adamRegion(S, jaw, { ramp: [mix(SK[0], SK[1], 0.55), mix(SK[0], SK[1], 0.75)], shade: Paint.cst(0.5), dir: 0.12, len: [16 * ss, 30 * ss], wid: [6 * ss, 9 * ss], cover: 2.4, rim: false, jitter: 0, broken: 0, lJit: 0.012 });
  });
  if (clip) { S.x.restore(); S.hx.restore(); }
  return neck;
}

// Başı (boynuyla) S'ye boyar. ox,oy: birim kökeninin konumu; hs: baş yüksekliği. o.collar: yaka çoklu çizgisi.
function adamPaintHead(S, ox, oy, hs, o = {}) {
  const neck = adamPaintNeck(S, ox, oy, hs, o); // İLK: tohum sırası boyun köküyle aynı kalmalı
  const X = (u, v) => [ox + u * hs, oy + v * hs];
  const XC = (pts) => adamMap(pts, X);
  const sh = (pts, closed = true) => adamShape(XC(pts), closed, Math.max(0.8, hs / 110));
  const ss = hs / 153, sz = o.detail ?? 1, HD = ADAM_HEAD, SK = ADAM_SKIN();
  const U = (x) => (x - ox) / hs, V = (y) => (y - oy) / hs;
  const cH = X(-0.42, 0.5);

  // yüz + kafatası (astar yalnız alında, kırık)
  const face = sh(HD.face);
  adamRim(S, adamCurve(XC(HD.face.slice(2, 7)), false), 2.2 * ss, { c: cH, th: 0.5 });
  const faceShade = adamEllShade(ox - 0.38 * hs, oy + 0.48 * hs, 0.62 * hs, 0.66 * hs, { amb: 0.2, lz: 1.0, bias: -0.06, add: adamSpot(ox - 0.06 * hs, oy + 0.3 * hs, 0.12 * hs, 0.16 * hs, 0.05) });
  adamRegion(S, face, {
    ramp: SK.slice(0, 4), shade: faceShade,
    dir: (x, y) => Math.atan2(V(y) - 0.52, U(x) + 0.36) + Math.PI / 2 + (S.r() - 0.5) * 0.25,
    len: [18 * ss * sz, 32 * ss * sz], wid: [7.5 * ss * sz, 11.5 * ss * sz], cover: 2.5, jitter: 3 * ss, jitterFreq: 0.014 / ss, noise: 0.01, broken: hs > 300 ? 0 : 0.02, lJit: hs > 300 ? 0.01 : 0.018, rim: false,
  });
  adamClip(S, face.path, () => {
    const plane = (pts, cols, dirA, f = 1) => adamRegion(S, sh(pts), { ramp: cols, shade: Paint.cst(0.5), dir: () => dirA + (S.r() - 0.5) * 0.3, len: [12 * ss * sz * f, 22 * ss * sz * f], wid: [6 * ss * sz * f, 9 * ss * sz * f], cover: 2.6, jitter: 1.5 * ss, rim: false, lJit: 0.012, broken: 0 });
    plane([[-0.165, 0.462], [-0.11, 0.452], [-0.05, 0.46], [-0.04, 0.49], [-0.058, 0.53], [-0.1, 0.545], [-0.155, 0.53], [-0.178, 0.495]], [mix(SK[1], SK[2], 0.45)], 0.1, 0.8);
    plane([[-0.37, 0.52], [-0.27, 0.5], [-0.18, 0.53], [-0.15, 0.58], [-0.22, 0.625], [-0.33, 0.63], [-0.39, 0.585]], [mix(SK[2], SK[3], 0.6)], 0.5);
    plane([[-0.03, 0.835], [0.012, 0.84], [0.0, 0.875], [-0.03, 0.88]], [mix(SK[1], SK[2], 0.4)], 0.3, 0.6);
    // burun ucu ve alın üstü: ışığa bakan küçük açık düzlemler
    plane([[0.04, 0.6], [0.085, 0.636], [0.095, 0.656], [0.07, 0.652], [0.035, 0.625]], [mix(SK[2], SK[3], 0.5)], 0.9, 0.55);
  });

  // saç (kenarlar kuru fırçayla kırılır, sol üstte birkaç ışık izi)
  const hair = sh(HD.hair), HR = ADAM_PAL.hair;
  adamRim(S, adamCurve(XC(HD.hair.slice(0, 14)), false), 2.4 * ss, { c: X(-0.5, 0.4), th: 0.55 });
  const hairDir = (x, y) => Math.atan2(V(y) - 0.55, U(x) + 0.42) + Math.PI / 2 + 0.3;
  adamRegion(S, hair, {
    ramp: HR.slice(0, 4), shade: adamEllShade(ox - 0.52 * hs, oy + 0.44 * hs, 0.48 * hs, 0.52 * hs, { amb: 0.0, lz: 0.45, bias: -0.02 }),
    dir: (x, y) => hairDir(x, y) + (S.r() - 0.5) * 0.3, len: [14 * ss * sz, 28 * ss * sz], wid: [5 * ss * sz, 8 * ss * sz], cover: 2.8, jitter: 4 * ss, jitterFreq: 0.04 / ss, rim: false, dry: 0.4,
  });
  // saç çizgisi (alın/şakak) boyunca kuru fırça saçak: saç akışı yönünde, alına doğru sivrilir
  const hl = adamCurve(XC(HD.hair.slice(14).concat([HD.hair[0]])), false, 2);
  adamFray(S, hl, [HR[2], HR[1], mix(HR[2], SK[2], 0.45)], { len: [7 * ss, 16 * ss], wid: [1.6 * ss, 3 * ss], step: 6 * ss, offJit: 3 * ss, ang: (x, y, nx, ny, tx, ty) => Math.atan2(ty, tx) + (S.r() - 0.5) * 0.7, alpha: 0.8 });
  adamFray(S, hl, [HR[2], mix(HR[2], SK[1], 0.4)], { len: [3 * ss, 8 * ss], wid: [1.2 * ss, 2.2 * ss], step: 9 * ss, ang: (x, y) => hairDir(x, y) + Math.PI + (S.r() - 0.5) * 0.6, push: 0.6, alpha: 0.7 });
  adamClip(S, hair.path, () => {
    // ışık izleri: saçın akışını izleyen 3 uzun ince darbe (sol üst)
    for (let i = 0; i < 3; i++) {
      const a0 = -2.62 + i * 0.2, rr = 0.4 + i * 0.012, pts = [];
      for (let j = 0; j <= 8; j++) { const a = a0 + j * 0.075; pts.push(X(-0.46 + Math.cos(a) * rr, 0.45 + Math.sin(a) * rr * 1.04)); }
      adamStreak(S, pts, (4.2 - i * 0.6) * ss * sz, i ? HR[3] : HR[4], 0.8);
    }
    for (let i = 0; i < 5; i++) {
      const a = -2.5 + i * 0.17 + (S.r() - 0.5) * 0.08, rr = 0.43 + S.r() * 0.03;
      const [hx0, hy0] = X(-0.46 + Math.cos(a) * rr, 0.43 + Math.sin(a) * rr * 1.02);
      S.dab(hx0, hy0, a + Math.PI / 2 + 0.15, (10 + S.r() * 8) * ss * sz, (2.4 + S.r() * 1.6) * ss * sz, HR[3], { alpha: 0.7, dry: 1 });
    }
  });
  // ense ucu: saçın arka-alt kenarında hafif saçak
  adamFray(S, adamCurve(XC(HD.hair.slice(9, 14)), false, 2), [HR[1], HR[2]], { len: [4 * ss, 9 * ss], wid: [1.4 * ss, 2.4 * ss], step: 7 * ss, ang: (x, y) => hairDir(x, y) + (S.r() - 0.5) * 0.5, push: 0.4, alpha: 0.7 });

  // kulak (başın içinde: astar yok)
  const ear = sh(HD.ear);
  adamRegion(S, ear, {
    ramp: SK.map((c) => shade(c, 0, 1.05, -3)), shade: adamEllShade(ox - 0.6 * hs, oy + 0.55 * hs, 0.1 * hs, 0.16 * hs, { amb: 0.35, lz: 1 }),
    dir: -1.25, len: [9 * ss, 16 * ss], wid: [4 * ss, 7 * ss], cover: 3, jitter: 2 * ss, rim: false,
  });
  S.line(adamCurve(XC(HD.ear.slice(4, 10)), false, 1.5), Math.max(1.2, 2.2 * ss), shade(ADAM_C.skin, -0.16, 1.1, -6), { w1: Math.max(0.8, 1.2 * ss), edge: false });
  S.line(adamCurve(XC(HD.earIn), false, 1.5), Math.max(1.6, 3.4 * ss), shade(ADAM_C.skin, -0.19, 1.1, -6), { w1: Math.max(1, 2 * ss), edge: false });
  const [cx0, cy0] = X(-0.545, 0.6);
  adamFill(S, ellipsePath(cx0, cy0, 0.016 * hs, 0.026 * hs, -0.3), shade(ADAM_C.skin, -0.16, 1.1, -6), 0.8);

  // sakal + bıyık
  const beard = sh(HD.beard), BR = ADAM_PAL.beard;
  // ön-alt kenar (zemine bakan siluet) kırık astar
  adamRim(S, adamCurve(XC(HD.beard.slice(14, 22)), false), 2.2 * ss, { c: X(-0.25, 0.85), th: 0.5 });
  adamRegion(S, beard, {
    ramp: BR.slice(0, 4), shade: adamEllShade(ox - 0.3 * hs, oy + 0.72 * hs, 0.42 * hs, 0.34 * hs, { amb: 0.05, lz: 0.55, bias: 0.02 }),
    dir: () => 1.3 + (S.r() - 0.5) * 0.5, len: [8 * ss * sz, 16 * ss * sz], wid: [3.5 * ss * sz, 6 * ss * sz], cover: 3.2, jitter: 2 * ss, rim: false, dry: 0.5,
  });
  adamClip(S, beard.path, () => {
    // çene altında koyu bant, yanakta ışık
    adamRegion(S, sh([[-0.47, 0.82], [-0.38, 0.92], [-0.25, 0.985], [-0.1, 1.01], [-0.02, 0.99], [-0.1, 0.96], [-0.25, 0.94], [-0.4, 0.86]]), { ramp: [BR[0], BR[1]], shade: Paint.cst(0.5), dir: 0.2, len: [10 * ss, 18 * ss], wid: [3 * ss, 5 * ss], cover: 2.6, jitter: 0, rim: false, broken: 0 });
    for (let i = 0; i < 7; i++) {
      const [bx, by] = X(-0.42 + i * 0.045 + (S.r() - 0.5) * 0.02, 0.69 + i * 0.012 + S.r() * 0.05);
      S.dab(bx, by, 1.25 + (S.r() - 0.5) * 0.4, (7 + S.r() * 6) * ss * sz, (1.8 + S.r() * 1.2) * ss * sz, BR[3], { alpha: 0.75, dry: 1 });
    }
  });
  // yanak sınırı: tene doğru incelen kıl uçları (yukarı), alt kenar: boyna doğru (aşağı)
  const cheek = adamCurve(XC(HD.beard.slice(0, 7)), false, 2);
  adamFray(S, cheek, [BR[2], BR[3], mix(BR[2], SK[1], 0.45)], { len: [6 * ss, 15 * ss], wid: [1.4 * ss, 2.8 * ss], step: 6 * ss, offJit: 2.5 * ss, ang: (x, y, nx, ny, tx, ty) => Math.atan2(ty, tx) + (S.r() - 0.5) * 0.6, alpha: 0.75 });
  adamFray(S, cheek, [BR[2], mix(BR[2], SK[1], 0.5)], { len: [3 * ss, 8 * ss], wid: [1.1 * ss, 2.2 * ss], step: 7 * ss, ang: () => -1.7 + (S.r() - 0.5) * 0.7, push: 0.55, alpha: 0.65 });
  const bBot = adamCurve(XC(HD.beard.slice(17, 25)), false, 2);
  adamFray(S, bBot, [BR[1], BR[0], BR[2]], { len: [6 * ss, 14 * ss], wid: [1.4 * ss, 2.8 * ss], step: 6 * ss, offJit: 2.5 * ss, ang: (x, y, nx, ny, tx, ty) => Math.atan2(ty, tx) + (S.r() - 0.5) * 0.6, alpha: 0.8 });
  adamFray(S, bBot, [BR[1], BR[2]], { len: [3 * ss, 7 * ss], wid: [1.1 * ss, 2.2 * ss], step: 8 * ss, ang: (x, y, nx, ny) => Math.atan2(ny, nx) + (S.r() - 0.5) * 0.6, push: 0.4, off: -1 * ss, alpha: 0.7 });
  // dudaklar (sade, tene yakın), burun kanadı
  adamFill(S, sh(HD.lips).path, mix(ADAM_C.skin, ADAM_C.lip, 0.55), 0.95);
  S.line(adamCurve(XC([[-0.024, 0.786], [0.0, 0.789], [0.02, 0.788]]), false, 1), Math.max(1, 1.8 * ss), shade(ADAM_C.lip, -0.2), { edge: false });
  S.line(adamCurve(XC([[0.038, 0.656], [0.056, 0.674], [0.05, 0.69]]), false, 1), Math.max(1.2, 2.4 * ss), shade(ADAM_C.skin, -0.18, 1.1, -8), { edge: false });

  // göz (badem; koyu iris noktası, minik parıltı) + kaş
  const eye = sh(HD.eye);
  adamFill(S, eye.path, '#EFE2D4');
  S.x.save(); S.x.clip(eye.path);
  const [ix, iy] = X(-0.086, 0.507);
  adamFill(S, ellipsePath(ix, iy, 0.017 * hs, 0.021 * hs), ADAM_C.iris);
  adamFill(S, rectPath(ix - 0.06 * hs, iy - 0.03 * hs, 0.12 * hs, 0.013 * hs), 'rgba(60,30,20,0.25)');
  S.x.restore();
  S.line(adamCurve(XC([[-0.156, 0.511], [-0.12, 0.492], [-0.08, 0.491], [-0.063, 0.503]]), false, 1), Math.max(1.5, 2.8 * ss), '#2A1C18', { w1: Math.max(1, 1.5 * ss), edge: false });
  S.line(adamCurve(XC([[-0.14, 0.478], [-0.105, 0.47], [-0.078, 0.474]]), false, 1), Math.max(1, 1.6 * ss), shade(ADAM_C.skin, -0.14), { edge: false });
  const [hx, hy] = X(-0.08, 0.5);
  adamFill(S, ellipsePath(hx, hy, Math.max(0.9, 0.0055 * hs), Math.max(0.9, 0.0055 * hs)), '#FFFFFF');
  S.line(adamCurve(XC(HD.brow), false, 1), 4.6 * ss, shade(ADAM_C.hair, 0.03), { w1: 2.6 * ss, edge: false });

  const P = {}; for (const k in HD.pts) P[k] = X(...HD.pts[k]);
  P.shapes = { neck, face, hair, ear, beard };
  return P;
}

// Gövde tuvaline boyun kökü: başın boynuyla AYNI tohum ve çağrıyla boyanır, yaka bandına maskelenir,
// yukarı doğru solar. Baş dönünce yaka çevresindeki açıklığı kapatır.
function adamNeckStub(S, seed, ox, oy, hs, collar, o = {}) {
  const K = S.K || 1;
  const T = adamSprite(S.fw, S.fh, seed, K);
  const neck = adamPaintNeck(T, ox, oy, hs, { collar, detail: o.detail });
  const M = makeCanvas(S.w, S.h), mx = M.getContext('2d'); mx.scale(K, K);
  const stubH = (o.stubH ?? 0.2) * hs, N = 7;
  const band = (top) => { const p = new Path2D(); collar.forEach((q, i) => (i ? p.lineTo(q[0], q[1] - top) : p.moveTo(q[0], q[1] - top))); for (let i = collar.length - 1; i >= 0; i--) p.lineTo(collar[i][0], collar[i][1] + 8); p.closePath(); return p; };
  mx.save(); mx.clip(neck.path); mx.fillStyle = '#000';
  mx.globalAlpha = 1; mx.fill(band(stubH * 0.3));
  for (let i = 1; i <= N; i++) { mx.globalAlpha = 0.3; mx.fill(band(stubH * (0.3 + (0.7 * i) / N))); }
  mx.restore();
  for (const [src, dst] of [[T.c, S.x], [T.hc, S.hx]]) {
    const tc = makeCanvas(S.w, S.h), tx = tc.getContext('2d');
    tx.drawImage(src, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(M, 0, 0);
    dst.save(); dst.setTransform(1, 0, 0, 1, 0, 0); dst.drawImage(tc, 0, 0); dst.restore();
  }
}

// ---------------------------------------------------------------- KOL & EL
function adamSleeveShape(axis, half, o = {}) { return adamShape(adamTube(axis, half, { startCap: o.cap ?? 1.08, endCap: o.endCap })); }
// gömlek kolu: uzun darbeler, iki yanda kırık koyu (aynı ton ailesi) örtüşme çizgisi; turuncu astar yok
function adamPaintSleeve(S, axis, half, o = {}) {
  const tb = adamTube(axis, half, { startCap: o.cap ?? 1.08, endCap: o.endCap }), sh = adamShape(tb);
  const P = o.pal || ADAM_PAL.shirt;
  adamCloth(S, sh, { ramp: P.slice(0, 4), shade: adamBand(axis, half, { k1: 0.62, bias: o.bias ?? 0.04 }), dir: adamAlong(axis, S, 0.14), len: o.len || [60, 110], wid: o.wid || [12, 18], jitter: 7 });
  const n = axis.length, L = adamCurve(tb.L, false), R = adamCurve(tb.R, false);
  const c = sh.c, deep = P[0];
  if (o.edgeL !== false) adamRim(S, adamSub(L, o.l0 ?? 0.12, o.l1 ?? 1), o.ew ?? 3, { inward: true, color: deep, alpha: 0.85, c, th: 0.32, flat: true, gain: 2.4 });
  if (o.edgeR !== false) adamRim(S, adamSub(R, o.r0 ?? 0.08, o.r1 ?? 1), o.ew ?? 3, { inward: true, color: deep, alpha: 0.85, c, th: 0.36, flat: true, gain: 2.4 });
  return sh;
}
// manşet: kol ucunda, kesite paralel koyu bant
function adamCuff(S, axis, half, t = 0.84, w = 3.2, col) {
  const n = axis.length, a = axis[n - 2], b = axis[n - 1];
  const cx = lerp(a[0], b[0], t), cy = lerp(a[1], b[1], t), dl = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const nx = -(b[1] - a[1]) / dl, ny = (b[0] - a[0]) / dl, hw = lerp(half[n - 2], half[n - 1], t) - 1;
  const ax = (b[0] - a[0]) / dl, ay = (b[1] - a[1]) / dl, bow = hw * 0.18;
  S.line([[cx + nx * hw, cy + ny * hw], [cx + ax * bow, cy + ay * bow], [cx - nx * hw, cy - ny * hw]], w, col, { edge: false, w1: w * 0.7 });
}

// gevşek sarkan el (dış yüz görünür, başparmak önde). (wx,wy) bilek, ang: el ekseni açısı (aşağı ≈ π/2)
// yerel: u el boyunca (0 bilek → 1 parmak ucu), v px (+ ön/başparmak yanı)
function adamHandRelaxedGeom(wx, wy, ang, sc = 1) {
  const Lh = 118 * sc, c = Math.cos(ang), s = Math.sin(ang);
  const M = (pts) => pts.map(([u, v, t]) => { const p = [wx + c * u * Lh + s * v * sc, wy + s * u * Lh - c * v * sc]; return t === undefined ? p : [...p, t]; });
  const UV = (x, y) => [((x - wx) * c + (y - wy) * s) / Lh, ((x - wx) * s - (y - wy) * c) / sc];
  // el sırtı + parmaklar (tek kütle): serçe yanında hafif kavis, işaret boğumunda basamak
  const hand = [
    [-0.07, -17], [0.1, -19.5], [0.28, -21.5], [0.45, -22], [0.56, -20.6], [0.68, -18.6], [0.8, -15.6], [0.9, -11],
    [0.965, -4.5], [0.99, 2.5, 0.8], [0.97, 9], [0.92, 13], [0.84, 15.2], [0.74, 15.8], [0.645, 15.6, 0.5], [0.575, 17.4, 0.4],
    [0.5, 18.6, 0.5], [0.38, 18.4], [0.22, 17.6], [0.06, 16.4], [-0.07, 16],
  ];
  // başparmak: önde, ayrı ve kısa; işaret parmağından V biçimli açıklıkla ayrılır
  const thumb = [
    [0.08, 12.5], [0.2, 19], [0.32, 24.2], [0.43, 27.8], [0.53, 29.6], [0.61, 29.2, 0.7], [0.66, 26.6, 0.6], [0.652, 23.2],
    [0.605, 21], [0.525, 19.4], [0.4, 15.6], [0.24, 12],
  ];
  return { M, UV, Lh, hand, thumb, sh: adamShape(M(hand), true, 1.6), shT: adamShape(M(thumb), true, 1.4) };
}
function adamHandRelaxed(S, wx, wy, ang, sc = 1, o = {}) {
  const G = adamHandRelaxedGeom(wx, wy, ang, sc), SK = adamDk(ADAM_SKIN(), o.dk || 0);
  const dk = shade(SK[1], -0.06, 1.05, -6);
  // iki değer düzlemi: el sırtı ışıkta, parmaklar gölgede (boğum çizgisi basamaklı)
  const handShade = (x, y) => { const [u, v] = G.UV(x, y); let val = u < 0.555 + 0.035 * Math.sin(v * 0.25) ? 0.8 : 0.5; if (v < -15.5) val += 0.08; if (v > 13 && u > 0.5) val -= 0.14; return val; };
  adamRegion(S, G.sh, { ramp: SK.slice(1, 4), shade: handShade, dir: (x, y) => ang + (S.r() - 0.5) * 0.3, len: [12 * sc, 24 * sc], wid: [5 * sc, 8.5 * sc], cover: 2.8, jitter: 1.2, noise: 0.01, rim: false, broken: 0.02 });
  adamRim(S, adamSub(G.sh.poly, 0.38, 0.9), 2.2 * sc, { inward: true, color: dk, alpha: 0.75, c: G.sh.c, th: 0.4, gain: 2.4 });
  // başparmak
  const ta = G.M([[0.12, 15], [0.62, 25]]);
  adamRegion(S, G.shT, { ramp: SK.slice(1, 4), shade: adamBand(ta, 8 * sc, { k1: 0.7, bias: 0.06 }), dir: () => ang - 0.15 + (S.r() - 0.5) * 0.25, len: [10 * sc, 18 * sc], wid: [4.5 * sc, 7 * sc], cover: 3, jitter: 1, noise: 0.01, rim: false, broken: 0.02 });
  S.line(adamCurve(G.M([[0.24, 12.2], [0.4, 15.8], [0.525, 19.5], [0.6, 21]]), false, 1.5), 2.1 * sc, dk, { w1: 0.9 * sc, edge: false });
  adamRim(S, adamSub(G.shT.poly, 0.15, 0.62), 2 * sc, { inward: true, color: dk, alpha: 0.7, c: G.shT.c, th: 0.42, gain: 2.4 });
  // boğumlarda tek ışık darbesi
  S.dab(...G.M([[0.5, -10]])[0], ang + 1.45, 14 * sc, 3.5 * sc, SK[4], { alpha: 0.55, dry: 1 });
  return { fingertip: G.M([[1.0, 2]])[0], palm: G.M([[0.45, 2]])[0], shape: G.sh, thumb: G.shT };
}

// dize sarkan el (serçe parmak yanından): el sırtı öne bakar, parmaklar hafifçe avuca kıvrılır,
// başparmak arkada yalnız ucu görünür. Yerel: u el boyunca (0 bilek → 1 uç), v px (+ el sırtı / öne)
function adamHandHangGeom(wx, wy, ang, sc = 1) {
  const Lh = 112 * sc, c = Math.cos(ang), s = Math.sin(ang);
  const M = (pts) => pts.map(([u, v, t]) => { const p = [wx + c * u * Lh + s * v * sc, wy + s * u * Lh - c * v * sc]; return t === undefined ? p : [...p, t]; });
  const UV = (x, y) => [((x - wx) * c + (y - wy) * s) / Lh, ((x - wx) * s - (y - wy) * c) / sc];
  const hand = [
    [-0.12, 15], [0.1, 16.6], [0.3, 17.8], [0.45, 19, 0.6], [0.56, 17.4], [0.68, 15.2], [0.8, 11.6], [0.9, 6.2],
    [0.965, -0.6], [0.985, -6.6, 0.7], [0.94, -11.6], [0.85, -13], [0.74, -12], [0.63, -12.6, 0.5], [0.52, -14.8],
    [0.38, -16.2], [0.2, -16], [0.04, -14.8], [-0.12, -14],
  ];
  const thumb = [[0.3, -13], [0.42, -17.6], [0.53, -19.2], [0.6, -17.4, 0.7], [0.58, -13], [0.48, -11]];
  return { M, UV, Lh, sh: adamShape(M(hand), true, 1.6), shT: adamShape(M(thumb), true, 1.3) };
}
function adamHandHang(S, wx, wy, ang, sc = 1) {
  const G = adamHandHangGeom(wx, wy, ang, sc), SK = ADAM_SKIN(), dk = shade(SK[1], -0.06, 1.05, -6);
  // başparmak ucu (arkada, koyu)
  adamRegion(S, G.shT, { ramp: [SK[1], SK[2]], shade: Paint.cst(0.4), dir: () => ang + (S.r() - 0.5) * 0.3, len: [8 * sc, 14 * sc], wid: [4 * sc, 6 * sc], cover: 3, jitter: 1, rim: false, broken: 0 });
  const handShade = (x, y) => { const [u, v] = G.UV(x, y); let val = u < 0.5 + 0.03 * Math.sin(v * 0.3) ? 0.8 : 0.5; if (v < -9) val -= 0.12; if (v > 14) val += 0.06; return val; };
  adamRegion(S, G.sh, { ramp: SK.slice(1, 4), shade: handShade, dir: () => ang + (S.r() - 0.5) * 0.3, len: [12 * sc, 22 * sc], wid: [5 * sc, 8 * sc], cover: 2.8, jitter: 1.2, noise: 0.01, rim: false, broken: 0.02 });
  adamRim(S, adamSub(G.sh.poly, 0.42, 0.95), 2.2 * sc, { inward: true, color: dk, alpha: 0.75, c: G.sh.c, th: 0.38, gain: 2.4 });
  // kıvrık parmak boğumları: ön kenarda iki kısa basamak çizgisi
  S.line(adamCurve(G.M([[0.7, 14.6], [0.74, 9], [0.73, 4]]), false, 1.5), 1.9 * sc, dk, { w1: 0.8 * sc, edge: false, taper: true });
  S.line(adamCurve(G.M([[0.86, 9.2], [0.88, 4], [0.86, -1]]), false, 1.5), 1.7 * sc, dk, { w1: 0.7 * sc, edge: false, taper: true });
  S.dab(...G.M([[0.36, 10]])[0], ang, 13 * sc, 3.5 * sc, SK[4], { alpha: 0.5, dry: 1 });
  return { fingertip: G.M([[0.99, -4]])[0], palm: G.M([[0.45, 0]])[0], shape: G.sh };
}

// ---------------------------------------------------------------- AYAKTA
const ADAM_ST = { w: 560, h: 1220, hs: 153.3, gx: 335, top: 57, shoulder: [255, 292], neck: [251, 254], ground: 1200, px: 290 };
// gömlek: sırtta hafif bel çukuru, kalçaya düşen etek, göğüs karından önde
const ADAM_TORSO = {
  back: [[212, 231, 0], [199, 244], [189, 266], [183, 300], [181, 340], [184, 385], [190, 430], [196, 470], [197.5, 505], [194.5, 545], [188, 585], [182, 618], [179.5, 640], [181, 653, 0]],
  hem: [[232, 659], [282, 657]],
  front: [[324, 650, 0], [329, 620], [331, 582], [330, 542], [328, 502], [330, 466], [336, 432], [343, 398], [347, 366], [345, 336], [337, 306], [324, 284], [309, 269], [296, 262, 0]],
  neck: [[272, 256], [248, 248], [226, 239]],
};
function adamStandTorso() { const T = ADAM_TORSO; return [...T.back, ...T.hem, ...T.front, ...T.neck]; }
// yaka çizgisi (+ iki uçta gövde hattından birer nokta): boyun kırpması ve boyun kökü için
const ADAM_COLLAR = [[199, 244], [212, 231], [226, 239], [248, 248], [272, 256], [296, 262], [309, 269]];

// yakın bacak (pantolon): kalça çıkıntısı, diz arkası, baldır kavisi
function adamStandLeg() {
  return [
    [190, 600, 0], [181.5, 630], [175.5, 660], [177, 690], [185, 720], [197, 768], [211, 826], [222, 870], [226, 902],
    [222, 945], [219.5, 985], [224, 1030], [233, 1080], [239, 1120], [242, 1146, 0],
    [276, 1153], [308, 1149, 0], [306.5, 1100], [307.5, 1040], [311, 980], [315.5, 925], [319, 890], [322.5, 850],
    [327, 780], [330, 720], [331, 660], [328, 600, 0],
  ];
}
const ADAM_FARLEG = (x, y) => { const t = clamp((y - 600) / 550); return [x + 12 * t, y - 5 * t]; };
function adamStandShoe(dx = 0, dy = 0) {
  return [
    [224, 1200, 0.3], [217, 1190], [216, 1172], [222, 1152, 0.5], [240, 1144], [268, 1142], [296, 1146], [322, 1154],
    [346, 1164], [366, 1173], [382, 1181], [393, 1189, 0.8], [397, 1196], [391, 1200.5, 0.3], [300, 1201],
  ].map(([x, y, t]) => (t === undefined ? [x + dx, y + dy] : [x + dx, y + dy, t]));
}
// ayakkabı ayrıntısı: taban bandı, burun parıltısı, saya dikişi
function adamShoeDetail(S, f, pal, far = false) {
  const sole = adamShape(adamMap([[217, 1192], [262, 1193.5], [300, 1195], [350, 1194.5], [395, 1193], [397, 1196], [391, 1201, 0.3], [300, 1201.5], [224, 1201, 0.3], [217, 1196]], f), true, 1.5);
  adamFill(S, sole.path, pal[0], 1);
  S.line(adamCurve(adamMap([[220, 1192.5], [300, 1194.5], [392, 1193]], f), false), 1.3, pal[2], { edge: false });
  S.line(adamCurve(adamMap([[300, 1148], [318, 1163], [342, 1175], [362, 1180]], f), false), 1.5, pal[1], { w1: 0.7, edge: false });
  if (far) return;
  const [tx, ty] = f(376, 1176); S.dab(tx, ty, 0.42, 20, 4, pal[4], { alpha: 0.75, dry: 1 });
  const [hx, hy] = f(224, 1168); S.dab(hx, hy, -1.4, 14, 3.5, pal[3], { alpha: 0.6, dry: 1 });
}
function adamPaintShoe(S, pts, pal, o = {}) {
  const sh = adamShape(pts);
  if (o.rim !== false) adamRim(S, sh.poly, 2.6, { c: sh.c });
  adamRegion(S, sh, { ramp: pal.slice(0, 4), shade: adamEllShade(o.cx ?? 300, o.cy ?? 1150, o.rx ?? 120, o.ry ?? 56, { amb: 0.15, lz: 0.8 }), dir: () => 0.2 + (S.r() - 0.5) * 0.3, len: [18, 34], wid: [6, 10], cover: 3, jitter: 4, rim: false, dry: 0.4 });
  return sh;
}
function adamStandArmGeom() {
  const [sx, sy] = ADAM_ST.shoulder;
  return { axis: [[sx, sy], [sx - 3, sy + 100], [sx - 5, sy + 196], [sx + 4, sy + 278], [sx + 15, sy + 346]], half: [41, 34, 29.5, 27, 22.5] };
}
function adamStandHandPlace() {
  const { axis } = adamStandArmGeom();
  const wr = axis[axis.length - 1], pr = axis[axis.length - 2];
  const ang = Math.atan2(wr[1] - pr[1], wr[0] - pr[0]) - 0.07;
  return [wr[0] + Math.cos(ang) * -8, wr[1] + Math.sin(ang) * -8, ang];
}
function adamPaintStandArm(S) {
  const { axis, half } = adamStandArmGeom();
  const hp = adamHandRelaxed(S, ...adamStandHandPlace(), 1);
  adamPaintSleeve(S, axis, half, { endCap: 0.55, bias: 0.05, pal: adamDk(ADAM_PAL.shirt, 0.025), ew: 3.4 });
  adamCuff(S, axis, half, 0.8, 3.2, ADAM_PAL.shirt[0]);
  // dirsek içi kıvrımı (ön yanda kısa koyu iz)
  S.line(adamCurve([[262, 470], [271, 486], [270, 502]], false), 2.6, ADAM_PAL.shirt[0], { w1: 1, edge: false });
  return hp;
}

function adamPaintStandBody(S) {
  const PP = ADAM_PAL.pants, FP = adamDk(PP, -0.13), SHP = ADAM_PAL.shoe, FSH = adamDk(SHP, -0.13);
  const legAx = [[258, 600], [270, 890], [274, 1146]], farAx = adamMap(legAx, ADAM_FARLEG);
  const near = adamShape(adamStandLeg()), farPts = adamMap(adamStandLeg(), ADAM_FARLEG), far = adamShape(farPts);
  // uzak ayakkabı + bacak (biraz önde ve yukarıda, koyu): yalnız ince bir şerit görünür
  adamPaintShoe(S, adamStandShoe(12, -5), FSH, { cx: 312, cy: 1145 });
  adamShoeDetail(S, (x, y) => [x + 12, y - 5], FSH, true);
  adamRim(S, adamCurve(farPts.slice(16, 25), false), 2.6, { c: far.c });
  adamCloth(S, far, { ramp: FP.slice(0, 4), shade: adamBand(farAx, [70, 46, 36], { bias: -0.02 }), dir: adamAlong(farAx, S, 0.12), len: [60, 120], wid: [12, 18] });
  // yakın ayakkabı + bacak
  const shoe = adamPaintShoe(S, adamStandShoe(0, 0), SHP);
  adamShoeDetail(S, (x, y) => [x, y], SHP);
  // uzak ayakkabının burnu üstünde örtüşme çizgisi
  S.line(adamCurve([[372, 1176], [386, 1184], [394, 1192], [396, 1198]], false), 2.2, FSH[0], { w1: 1.2, edge: false });
  adamRim(S, adamCurve(adamStandLeg().slice(0, 15), false), 2.8, { c: near.c });
  adamCloth(S, near, { ramp: PP.slice(0, 4), shade: adamBand(legAx, [72, 48, 38], { bias: 0.02 }), dir: adamAlong(legAx, S, 0.12), len: [60, 120], wid: [12, 18] });
  adamClip(S, near.path, () => {
    // diz arkası, paça kırışığı; ön kenarda (uzak bacakla örtüşme) kırık koyu çizgi
    S.line(adamCurve([[226, 880], [240, 895], [256, 899]], false), 3, PP[0], { w1: 1.2, edge: false });
    S.line(adamCurve([[248, 1126], [272, 1120], [300, 1124]], false), 2.6, PP[0], { w1: 1.2, edge: false, taper: true });
    adamRim(S, adamCurve(adamStandLeg().slice(16, 23), false), 3, { inward: true, color: PP[0], c: near.c, th: 0.3, flat: true, gain: 2.4, alpha: 0.9 });
  });

  // boyun kökü (yaka altına giren kısa, solan boyun)
  adamNeckStub(S, 101, ADAM_ST.gx, ADAM_ST.top, ADAM_ST.hs, ADAM_COLLAR);
  // gövde (gömlek): üç bant — arka ışık, orta, ön gölge (kolun düşen gölgesiyle örtüşür)
  const tp = adamStandTorso(), torso = adamShape(tp);
  const tAx = [[256, 250], [262, 420], [258, 650]];
  adamRim(S, adamCurve(ADAM_TORSO.back, false), 3, { c: torso.c });
  adamRim(S, adamCurve(ADAM_TORSO.front, false), 3, { c: torso.c });
  adamCloth(S, torso, { ramp: ADAM_PAL.shirt.slice(0, 4), shade: adamBand(tAx, [84, 84, 74], { k1: 0.66, k2: 0.1, bias: 0.02, add: (x, y) => (y < 300 ? 0.06 : 0) }), dir: adamAlong(tAx, S, 0.12), len: [70, 140], wid: [13, 20] });
  adamClip(S, torso.path, () => {
    // kolun altında, gövdenin önünde düşen gölge bandı (ön gölge bandının içinde kalır)
    const band = adamShape([[300, 300], [322, 310], [334, 420], [330, 560], [316, 640], [298, 640], [300, 520], [296, 400]]);
    adamCloth(S, band, { ramp: [ADAM_PAL.shirt[0], ADAM_PAL.shirt[1]], shade: Paint.cst(0.55), dir: () => Math.PI / 2 + (S.r() - 0.5) * 0.1, len: [60, 120], wid: [10, 16], broken: 0 });
    // etek kıvrımı ve yaka bandı
    S.line(adamCurve([[184, 646], [232, 652], [282, 650], [322, 643]], false), 3.6, ADAM_PAL.shirt[0], { w1: 2.4, edge: false, taper: true });
    S.line(adamCurve(ADAM_COLLAR.slice(1, 6).map(([x, y]) => [x, y + 2.6]), false), 3.2, ADAM_PAL.shirt[0], { w1: 2.2, edge: false });
  });
}

defSprite('adam-ayakta-bas', () => {
  const S = adamSprite(ADAM_ST.w, ADAM_ST.h, 101);
  adamPaintHead(S, ADAM_ST.gx, ADAM_ST.top, ADAM_ST.hs, { collar: ADAM_COLLAR });
  return adamOut(S, ADAM_ST.neck[0], ADAM_ST.neck[1]);
});
defSprite('adam-ayakta-govde', () => {
  const S = adamSprite(ADAM_ST.w, ADAM_ST.h, 102);
  adamPaintStandBody(S);
  return adamOut(S, ADAM_ST.px, ADAM_ST.ground);
});
defSprite('adam-ayakta-kol', () => {
  const S = adamSprite(ADAM_ST.w, ADAM_ST.h, 103);
  adamPaintStandArm(S);
  return adamOut(S, ADAM_ST.shoulder[0], ADAM_ST.shoulder[1]);
});

// ---------------------------------------------------------------- AYAKTA: ŞEMA (koyu çivit zemin için) + ORGANLAR
function adamStandShapes() {
  const hd = adamHeadShapes(ADAM_ST.gx, ADAM_ST.top, ADAM_ST.hs);
  const { axis, half } = adamStandArmGeom();
  const hg = adamHandRelaxedGeom(...adamStandHandPlace(), 1);
  return {
    hd, hand: hg.sh, thumb: hg.shT, sleeve: adamSleeveShape(axis, half, { endCap: 0.55 }), torso: adamShape(adamStandTorso()),
    leg: adamShape(adamStandLeg()), farLeg: adamShape(adamMap(adamStandLeg(), ADAM_FARLEG)), shoe: adamShape(adamStandShoe(0, 0)), farShoe: adamShape(adamStandShoe(12, -5)),
  };
}
const ADAM_SEMA = { ramp: ['#1E3860', '#22406A', '#2A4F7E', '#335F91', '#3B6E9E'], line: '#7FE3E0' };

defSprite('adam-ayakta-sema', () => {
  const w = ADAM_ST.w, h = ADAM_ST.h, sh = adamStandShapes(), hd = sh.hd;
  const F = adamSprite(w, h, 121);
  const R = ADAM_SEMA.ramp;
  const legAx = [[258, 600], [270, 890], [274, 1146]], farAx = adamMap(legAx, ADAM_FARLEG);
  const fill = (s, shadeF, dir, o = {}) => adamRegion(F, s, { ramp: R, shade: shadeF, dir, len: o.len || [40, 80], wid: o.wid || [11, 17], cover: 2.3, jitter: 10, noise: 0.03, rim: false, lJit: 0.02, hJit: 4, dry: 0.4 });
  const { axis, half } = adamStandArmGeom();
  fill(sh.farShoe, Paint.cst(0.22), 0.1, { len: [16, 30], wid: [6, 10] });
  fill(sh.farLeg, adamTubeShade(farAx, [70, 46, 36], { amb: 0.0, gain: 0.8 }), adamAlong(farAx, F, 0.14));
  fill(sh.shoe, Paint.cst(0.3), 0.1, { len: [16, 30], wid: [6, 10] });
  fill(sh.leg, adamTubeShade(legAx, [72, 48, 38], { amb: 0.08 }), adamAlong(legAx, F, 0.14));
  const tAx = [[256, 250], [262, 420], [258, 650]];
  fill(sh.torso, adamTubeShade(tAx, [84, 84, 74], { amb: 0.08 }), adamAlong(tAx, F, 0.16));
  const nAx = adamMap([[-0.53, 0.9], [-0.55, 1.25]], hd.X);
  // baş + boyun (sakalsız: çene ve çene altı çizgisi belirgin, gırtlak geride)
  F.x.save(); F.x.clip(adamAbove(ADAM_COLLAR, 1.2)); F.hx.save(); F.hx.clip(adamAbove(ADAM_COLLAR, 1.2));
  fill(hd.neck, adamTubeShade(nAx, 0.27 * ADAM_ST.hs, { amb: 0.05 }), adamAlong(nAx, F, 0.3), { len: [16, 30], wid: [6, 10] });
  F.x.restore(); F.hx.restore();
  const headSh = adamEllShade(hd.X(-0.42, 0.5)[0], hd.X(-0.42, 0.5)[1], 0.6 * ADAM_ST.hs, 0.64 * ADAM_ST.hs, { amb: 0.15, lz: 0.9 });
  for (const k of ['face', 'hair', 'ear']) fill(hd[k], headSh, (x, y) => Math.atan2(y - hd.X(0, 0.5)[1], x - hd.X(-0.4, 0)[0]) + Math.PI / 2 + (F.r() - 0.5) * 0.4, { len: [14, 26], wid: [6, 10] });
  fill(sh.sleeve, adamTubeShade(axis, half.map((v) => v * 1.05), { amb: 0.1 }), adamAlong(axis, F, 0.16));
  const hp = adamStandHandPlace();
  const hAx = [[hp[0], hp[1]], [hp[0] + Math.cos(hp[2]) * 118, hp[1] + Math.sin(hp[2]) * 118]];
  fill(sh.hand, adamTubeShade(hAx, 26, { amb: 0.15 }), hp[2], { len: [14, 24], wid: [6, 9] });
  fill(sh.thumb, adamTubeShade(hAx, 26, { amb: 0.2 }), hp[2], { len: [10, 18], wid: [5, 8] });
  const fc = F.finish({ emboss: 0.4 });

  // dış hat: biçimlerin birleşiminin çevresinde fırçalı açık camgöbeği çizgi
  const O = adamSprite(w, h, 122);
  const neckCut = (() => { const p = new Path2D(); p.addPath(adamAbove(ADAM_COLLAR, 1.2)); return p; })();
  const all = [hd.face, hd.hair, hd.ear, sh.torso, sh.leg, sh.farLeg, sh.shoe, sh.farShoe, sh.sleeve, sh.hand, sh.thumb];
  for (const s of all) O.line(s.poly.concat([s.poly[0]]), 6.5, ADAM_SEMA.line, { edge: false });
  O.x.save(); O.x.clip(neckCut); O.line(hd.neck.poly.concat([hd.neck.poly[0]]), 6.5, ADAM_SEMA.line, { edge: false }); O.x.restore();
  O.x.save(); O.x.globalCompositeOperation = 'destination-out'; for (const s of all) O.x.fill(s.path); O.x.save(); O.x.clip(neckCut); O.x.fill(hd.neck.path); O.x.restore(); O.x.restore();
  // iç hatlar (yarı saydam): kol, el, uzak bacak, kulak, göz, kaş
  const inner = (pts, wd = 2.6, a = 0.55) => { O.x.save(); O.x.globalAlpha = a; O.line(pts, wd, ADAM_SEMA.line, { edge: false }); O.x.restore(); };
  const sl = adamTube(axis, half, { endCap: 0.55 });
  inner(adamCurve(sl.L, false)); inner(adamCurve(sl.R, false));
  inner(sh.hand.poly.concat([sh.hand.poly[0]]), 2.2, 0.6);
  inner(sh.thumb.poly.concat([sh.thumb.poly[0]]), 2, 0.55);
  inner(adamCurve(adamMap(adamStandLeg(), ADAM_FARLEG).slice(16, 23), false), 2.2, 0.4);
  inner(adamCurve(adamStandLeg().slice(16, 22), false), 2, 0.3);
  inner(adamCurve(adamMap(ADAM_HEAD.ear, hd.X), false).concat([hd.X(...ADAM_HEAD.ear[0])]), 2, 0.55);
  inner(adamCurve(adamMap(ADAM_HEAD.earIn, hd.X), false), 1.6, 0.45);
  inner(hd.eye.poly.concat([hd.eye.poly[0]]), 1.6, 0.8);
  inner(adamCurve(adamMap(ADAM_HEAD.brow, hd.X), false), 1.8, 0.45);
  inner(adamCurve(ADAM_COLLAR.slice(1, 6), false), 2, 0.35);
  inner(adamCurve(adamMap([[-0.5, 0.74], [-0.44, 0.86], [-0.33, 0.94], [-0.2, 0.975], [-0.08, 0.968]], hd.X), false), 1.8, 0.4);
  const oc = O.finish({ emboss: 0.25 });
  const c = makeCanvas(w, h), x = c.getContext('2d');
  x.globalAlpha = 0.86; x.drawImage(fc, 0, 0); x.globalAlpha = 1; x.drawImage(oc, 0, 0);
  return { canvas: c, px: ADAM_ST.px, py: ADAM_ST.ground, k: 1 };
});

// ---- organlar (yan görünüş, ayakta çerçevesi; gövde pivotu ile aynı yere çizilir). Sıra: akciğer → kalp → mide.
const ADAM_ORG = {
  // akciğer: tabanı diyafram kubbesine oturur (arkada daha aşağı)
  lungNear: [[262, 262], [282, 268], [302, 290], [316, 330], [321, 376], [318, 412, 0.6], [300, 420], [272, 424, 0.6], [244, 438], [216, 452, 0.5], [203, 432], [199, 384], [205, 328], [222, 286], [244, 266]],
  heart: { center: [290, 392], scale: 0.8 },
  heartBody: [[262, 364], [282, 356], [304, 360], [322, 374], [332, 396], [330, 418], [318, 438], [306, 450, 0.3], [290, 442], [270, 428], [256, 408], [252, 386]],
  // mide: J biçimi; fundus solda-yukarıda diyaframın altında, büyük kavis aşağıda, pilor öne-yukarı döner
  stomach: [[238, 470], [252, 458], [272, 456], [288, 466], [294, 486], [298, 508], [308, 522], [318, 514, 0.6], [324, 500], [330, 506], [330, 524], [318, 546], [296, 556], [270, 552], [250, 536], [238, 512], [234, 490]],
};
function adamOrganCanvas(seed) { return adamSprite(ADAM_ST.w, ADAM_ST.h, seed); }
const adamOrgRamp = (base, n = 4) => ramp(base, n, { span: 0.32, cool: 12, warm: 8, chromaLight: 0.9 });
function adamGloss(S, pts, col, wd = 4) { for (const [x, y, a, l] of pts) S.dab(x, y, a, l, wd, col, { alpha: 0.85 }); }
function adamOrgEdge(S, sh, col, wd = 2.2) { S.line(sh.poly.concat([sh.poly[0]]), wd, col, { edge: false }); }

defSprite('organ-akciger', () => {
  const S = adamOrganCanvas(131);
  const base = '#EE8A84', Rm = ramp(base, 4, { span: 0.26, cool: 12, warm: 6, chromaLight: 0.95 });
  const near = ADAM_ORG.lungNear;
  const far = near.map(([x, y, t]) => { const q = [258 + (x - 258) * 0.94 - 13, 350 + (y - 350) * 0.96 - 4]; return t === undefined ? q : [...q, t]; });
  const lungDir = (cx) => (x) => Math.PI / 2 + (x - cx) * 0.004 + (S.r() - 0.5) * 0.18;
  const farSh = adamShape(far);
  adamRim(S, farSh.poly, 2.4, { c: farSh.c });
  adamRegion(S, farSh, { ramp: Rm.map((c) => shade(c, -0.12, 1.05, -8)), shade: adamEllShade(236, 330, 75, 120, { amb: 0.1 }), dir: lungDir(245), len: [26, 46], wid: [9, 14], cover: 2.4, jitter: 6, noise: 0.02, rim: false });
  adamOrgEdge(S, farSh, shade(base, -0.32, 1.1, -10), 2);
  const nearSh = adamShape(near);
  adamRim(S, nearSh.poly, 2.6, { c: nearSh.c });
  adamRegion(S, nearSh, { ramp: Rm, shade: adamEllShade(248, 330, 80, 125, { amb: 0.12, lz: 0.8 }), dir: lungDir(258), len: [28, 50], wid: [10, 15], cover: 2.4, jitter: 7, noise: 0.02, rim: false });
  adamOrgEdge(S, nearSh, shade(base, -0.3, 1.1, -10), 2.2);
  const dk = shade(base, -0.22, 1.1, -8);
  S.line(adamCurve([[212, 316], [244, 356], [270, 392], [290, 420]], false), 2.6, dk, { w1: 1.6, edge: false });
  S.line(adamCurve([[262, 372], [290, 368], [318, 366]], false), 2.2, dk, { w1: 1.3, edge: false });
  adamGloss(S, [[228, 300, -1.2, 24], [220, 334, -1.45, 16], [244, 280, -0.9, 12]], shade(base, 0.18, 0.6, 10), 5);
  return { canvas: S.finish({ emboss: 0.45 }), px: ADAM_ST.px, py: ADAM_ST.ground, k: 1 };
});

defSprite('organ-kalp', () => {
  const S = adamOrganCanvas(132);
  const base = '#C9333B', Rm = adamOrgRamp(base, 5);
  const [hcx, hcy] = ADAM_ORG.heart.center, hk = ADAM_ORG.heart.scale;
  const f = (x, y) => [hcx + (x - 292) * hk, hcy + (y - 400) * hk]; // eski çizimden %20 küçültülmüş
  const C = (pts) => adamCurve(adamMap(pts, f), false);
  const vein = '#6B5FB4', pulm = '#7C6CC4';
  S.line(C([[266, 372], [264, 344], [266, 316]]), 13 * hk, vein, { rim: { w: 1.3 } });
  S.line(C([[252, 344], [248, 380], [248, 420]]), 13 * hk, shade(base, -0.1, 1, -6), { rim: { w: 1.3 } });
  S.line(C([[290, 368], [290, 338], [280, 322], [262, 320], [252, 334], [251, 352]]), 16 * hk, shade(base, 0.02, 1, -2), { rim: { w: 1.5 } });
  S.line(C([[282, 324], [272, 312], [268, 300]]), 7 * hk, shade(base, 0.02, 1, -2), { edge: false });
  S.line(C([[272, 321], [262, 310], [256, 300]]), 6 * hk, shade(base, 0.02, 1, -2), { edge: false });
  S.line(C([[308, 376], [312, 352], [304, 338], [290, 336]]), 14 * hk, pulm, { rim: { w: 1.3 } });
  const body = adamShape(adamMap(ADAM_ORG.heartBody, f));
  adamRim(S, body.poly, 2.4, { c: body.c });
  adamRegion(S, body, { ramp: Rm, shade: adamEllShade(f(286, 390)[0], f(286, 390)[1], 46 * hk, 52 * hk, { amb: 0.1, lz: 0.7 }), dir: (x, y) => Math.atan2(y - f(0, 360)[1], x - f(270, 0)[0]) + Math.PI / 2 + (S.r() - 0.5) * 0.3, len: [14, 24], wid: [7, 11], cover: 2.8, jitter: 4, noise: 0.02, rim: false });
  adamOrgEdge(S, body, shade(base, -0.28, 1.1, -10), 2);
  const aur = adamShape(adamMap([[300, 362], [314, 358], [322, 368], [314, 376], [302, 374]], f));
  adamRegion(S, aur, { ramp: Rm.slice(1, 4), shade: adamEllShade(f(310, 364)[0], f(310, 364)[1], 12, 8, { amb: 0.2 }), dir: 0.3, len: [7, 12], wid: [4, 6], cover: 3, jitter: 2, rim: false });
  adamOrgEdge(S, aur, shade(base, -0.28, 1.1, -10), 1.5);
  S.line(C([[300, 378], [298, 402], [304, 426], [308, 446]]), 3.6, '#E4B048', { w1: 1.8, edge: false });
  S.line(C([[300, 378], [298, 402], [304, 426], [308, 446]]), 1.5, shade(base, -0.25), { edge: false });
  S.line(C([[262, 392], [280, 398], [298, 398]]), 2.2, '#E4B048', { w1: 1.3, edge: false });
  const g = (x, y, a, l) => [...f(x, y), a, l * hk];
  adamGloss(S, [g(270, 376, -0.95, 18), g(264, 392, -1.35, 10), g(284, 330, -0.4, 10)], shade(base, 0.26, 0.55, 14), 3.6);
  return { canvas: S.finish({ emboss: 0.45 }), px: ADAM_ST.px, py: ADAM_ST.ground, k: 1 };
});

defSprite('organ-mide', () => {
  const S = adamOrganCanvas(133);
  const base = '#EBA35E', Rm = adamOrgRamp(base);
  const dk = shade(base, -0.24, 1.1, -10);
  // yemek borusu: kalbin arkasından diyaframı geçip mideye
  S.line(adamCurve([[238, 380], [238, 420], [242, 448], [250, 462]], false), 8, shade(base, -0.05, 0.95), { rim: { w: 1.1 } });
  // kalın bağırsak çerçevesi (karın hattından içeride)
  const colon = [[226, 640], [220, 604], [222, 572], [236, 562], [266, 566], [294, 568], [308, 578], [311, 606], [305, 632], [290, 645], [268, 648]];
  const cl = adamCurve(colon, false);
  S.line(cl, 21, dk, { rim: { w: 1.8 }, edge: false });
  S.line(cl, 17, shade(base, -0.04, 1, -4), { edge: false });
  S.line(cl, 5.5, shade(base, 0.12, 0.85, 6), { edge: false });
  for (let i = 1; i < 9; i++) { const q = cl[Math.floor((i / 9) * cl.length)], q2 = cl[Math.floor((i / 9) * cl.length) + 2]; const a = Math.atan2(q2[1] - q[1], q2[0] - q[0]) + Math.PI / 2; S.line([[q[0] + Math.cos(a) * 8.5, q[1] + Math.sin(a) * 8.5], [q[0] - Math.cos(a) * 8.5, q[1] - Math.sin(a) * 8.5]], 1.7, dk, { edge: false }); }
  // ince bağırsak: tek, düzensiz kıvrımlı boru
  const r = rng(77), loops = [];
  const rows = [586, 598, 610, 622, 633];
  rows.forEach((y, i) => {
    const d = i % 2 ? -1 : 1, xa = d > 0 ? 241 : 292, xb = d > 0 ? 292 : 241, amp = 2.5 + r() * 2.5, ph = r() * 3, fr = 2 + r() * 1.5;
    for (let j = 0; j <= 7; j++) { const t = j / 7; loops.push([lerp(xa, xb, t) + (r() - 0.5) * 3, y + Math.sin(t * Math.PI * fr + ph) * amp]); }
  });
  const lp = adamCurve(loops, false, 2);
  S.line(lp, 12.5, dk, { edge: false });
  S.line(lp, 9.8, shade(base, 0.03, 1, 3), { edge: false });
  S.line(lp, 3.2, shade(base, 0.17, 0.75, 8), { edge: false });
  // mide
  const st = adamShape(ADAM_ORG.stomach);
  adamRim(S, st.poly, 2.4, { c: st.c });
  adamRegion(S, st, { ramp: Rm, shade: adamEllShade(270, 495, 50, 56, { amb: 0.12, lz: 0.75 }), dir: (x, y) => Math.atan2(y - 520, x - 280) + Math.PI / 2 + (S.r() - 0.5) * 0.3, len: [16, 28], wid: [8, 12], cover: 2.8, jitter: 5, noise: 0.02, rim: false });
  adamOrgEdge(S, st, dk, 2);
  // küçük kavis ve kas lifleri
  S.line(adamCurve([[262, 470], [280, 478], [288, 500], [298, 522], [312, 530]], false), 2.2, dk, { w1: 1.2, edge: false });
  S.line(adamCurve([[246, 500], [258, 524], [282, 540], [306, 540]], false), 1.6, shade(base, -0.12), { w1: 0.8, edge: false, taper: true });
  adamGloss(S, [[252, 474, -0.6, 18], [242, 494, -1.3, 12], [316, 530, 0.4, 8]], shade(base, 0.2, 0.6, 10), 4);
  return { canvas: S.finish({ emboss: 0.45 }), px: ADAM_ST.px, py: ADAM_ST.ground, k: 1 };
});

// ---------------------------------------------------------------- OTURAN (çimende, dizler yukarıda, önkollar dizlerde)
// Ayakta gövdesinin üst kısmı kalça çevresinde hafif öne eğilip oturma kalçasına taşınır.
// k = 1.75: tuval 1.75 kat çözünürlükte (P1 kamerası ~1.8x); bütün ölçüler çerçeve biriminde.
const ADAM_SIT = (() => {
  const hs = 143, kS = hs / ADAM_ST.hs, lean = 0.16, hip = [170, 575], K = 1.75;
  const c = Math.cos(lean), s = Math.sin(lean);
  const T = (x, y) => { const dx = (x - 258) * kS, dy = (y - 600) * kS; return [hip[0] + dx * c - dy * s, hip[1] + dx * s + dy * c]; };
  const neck = T(...ADAM_ST.neck), shoulder = T(...ADAM_ST.shoulder);
  const u = (ADAM_ST.neck[0] - ADAM_ST.gx) / ADAM_ST.hs, v = (ADAM_ST.neck[1] - ADAM_ST.top) / ADAM_ST.hs;
  const ground = 622, thA = 0.91, thL = 255;
  const knee = [hip[0] + thL * Math.cos(thA), hip[1] - thL * Math.sin(thA)];
  const ankle = [knee[0] + Math.sqrt(246 * 246 - (ground - 44 - knee[1]) ** 2), ground - 44];
  return { w: 620, h: 640, K, hs, kS, lean, hip, T, neck, shoulder, head: [neck[0] - u * hs, neck[1] - v * hs], knee, ankle, ground, seat: [176, ground] };
})();
const ADAM_SIT_COLLAR = ADAM_COLLAR.map(([x, y]) => ADAM_SIT.T(x, y));

// oturan bacak dış hattı: kalça/oturak → uyluk altı → diz arkası → baldır → paça → kaval önü → diz → uyluk üstü
function adamSitLegPts(H0, K, A) {
  const g = ADAM_SIT.ground;
  const dt = [K[0] - H0[0], K[1] - H0[1]], lt = Math.hypot(...dt); const t = [dt[0] / lt, dt[1] / lt], nl = [-t[1], t[0]], nt = [t[1], -t[0]];
  const ds = [A[0] - K[0], A[1] - K[1]], ls = Math.hypot(...ds); const sd = [ds[0] / ls, ds[1] / ls], nf = [sd[1], -sd[0]], nb = [-sd[1], sd[0]];
  const at = (P, d, k, n, w) => [P[0] + d[0] * k + n[0] * w, P[1] + d[1] * k + n[1] * w];
  // diz arkası: uyluk altı ile baldır çizgisinin kesişimi
  const p1 = at(H0, t, 0, nl, 50), p2 = at(K, sd, 60, nb, 42);
  const den = t[0] * sd[1] - t[1] * sd[0];
  const kk = ((p2[0] - p1[0]) * sd[1] - (p2[1] - p1[1]) * sd[0]) / den;
  const pit = [p1[0] + t[0] * kk, p1[1] + t[1] * kk];
  const a0 = Math.atan2(nf[1], nf[0]); let a1 = Math.atan2(nt[1], nt[0]); while (a1 > a0) a1 -= Math.PI * 2;
  const kneeArc = []; for (let i = 1; i < 6; i++) { const a = lerp(a0, a1, i / 6); kneeArc.push([K[0] + Math.cos(a) * 40, K[1] + Math.sin(a) * 40]); }
  return [
    [112, 552], [108, 584], [116, 607], [136, 619.5, 0.6], [180, g - 0.5], [214, g - 4], at(H0, t, 90, nl, 48),
    [...pit, 0.5],
    at(K, sd, 110, nb, 43), at(K, sd, 190, nb, 33), [...at(A, sd, -6, nb, 28), 0],
    [...at(A, sd, -12, nf, 30), 0], at(K, sd, 140, nf, 33), at(K, sd, 50, nf, 38), ...kneeArc,
    at(K, t, -40, nt, 42), at(H0, t, 120, nt, 48), at(H0, t, 40, nt, 52), [124, 506],
  ];
}
const adamSitLeg = () => adamSitLegPts(ADAM_SIT.hip, ADAM_SIT.knee, ADAM_SIT.ankle);
const ADAM_SIT_FAR = { knee: [4, -10], ankle: [10, -4] };
const adamSitFarLeg = () => adamSitLegPts(ADAM_SIT.hip, [ADAM_SIT.knee[0] + ADAM_SIT_FAR.knee[0], ADAM_SIT.knee[1] + ADAM_SIT_FAR.knee[1]], [ADAM_SIT.ankle[0] + ADAM_SIT_FAR.ankle[0], ADAM_SIT.ankle[1] + ADAM_SIT_FAR.ankle[1]]);
function adamSitShoeF(dx = 0, dy = 0) { const A = ADAM_SIT.ankle, k = ADAM_SIT.kS, g = ADAM_SIT.ground; return (x, y) => [A[0] + (x - 270) * k + dx, g + (y - 1200) * k + dy]; }
function adamSitTorso() {
  const T = ADAM_SIT.T, TO = ADAM_TORSO;
  const m = (p) => { const q = T(p[0], p[1]); return p.length > 2 ? [...q, p[2]] : q; };
  return [
    ...TO.back.slice(0, 10).map(m),
    [112, 552], [108, 584], [116, 607], [136, 619, 0], [196, 606, 0], [236, 572],
    ...TO.front.slice(2).map(m), ...TO.neck.map(m),
  ];
}
// gömlek eteği: kalçayı tek, yumuşak bir kenarla geçer ve uyluk üstü çizgisine teğet biter
function adamSitHem() { return [[114, 604], [142, 597], [168, 573], [184, 538], [192, 504], [195, 474]]; }

// kol: omuz → dirsek (uyluğun üstünde) → bilek (diz önünde). İki tüp + yuvarlak dirsek
function adamSitArmGeom() {
  const S0 = ADAM_SIT.shoulder, k = ADAM_SIT.kS;
  const el = [S0[0] + 10, S0[1] + 189], wr = [ADAM_SIT.knee[0] + 26, ADAM_SIT.knee[1] - 13];
  const up = [S0, [lerp(S0[0], el[0], 0.5) - 1, lerp(S0[1], el[1], 0.5)], el];
  const fo = [el, [lerp(el[0], wr[0], 0.5), lerp(el[1], wr[1], 0.5) - 2], wr];
  return { sh: S0, el, wr, up, fo, hu: [38 * k, 32 * k, 28 * k], hf: [27 * k, 25 * k, 20.5 * k] };
}
function adamPaintSitArm(S, o = {}) {
  const g = adamSitArmGeom(), P = adamDk(ADAM_PAL.shirt, 0.06);
  // el: bilekten dizin önüne sarkar (önce boyanır; manşet üstüne biner)
  const fa = Math.atan2(g.wr[1] - g.fo[1][1], g.wr[0] - g.fo[1][0]), ang = 1.36;
  const hx = g.wr[0] - Math.cos(fa) * 9 - Math.sin(fa) * -5, hy = g.wr[1] - Math.sin(fa) * 9 + Math.cos(fa) * -5;
  const hp = adamHandHang(S, hx, hy, ang, ADAM_SIT.kS);
  const tu = adamTube(g.up, g.hu, { startCap: 1.08, endCap: 1.0 }), tf = adamTube(g.fo, g.hf, { startCap: 1.0, endCap: 0.78 });
  const pu = adamCurve(tu), pf = adamCurve(tf);
  const path = new Path2D(); path.addPath(adamPoly(pu)); path.addPath(adamPoly(pf));
  const axis = [g.sh, g.el, g.wr];
  // üst kolun gövdeye düşen gölgesi (ışık sol üstten → sağ alta); uyluğa düşmez
  if (o.shadowOn) {
    const out = new Path2D(); out.rect(-50, -50, 800, 800); out.addPath(o.notOn);
    S.x.save(); S.x.clip(o.shadowOn); S.x.clip(out, 'evenodd'); S.x.translate(10, 7); S.x.globalAlpha = 0.9; S.x.fillStyle = ADAM_PAL.shirt[0]; S.x.fill(adamPoly(pu)); S.x.restore();
  }
  S.region(path, { bbox: adamBBox(pu.concat(pf)), ramp: P.slice(0, 4), shade: adamBand(axis, [36, 30, 22], { k1: 0.62, bias: 0.06 }), dir: adamAlong(axis, S, 0.14), len: [44, 90], wid: [11, 16], cover: 2.4, jitter: 6, rim: false, lJit: 0.018, broken: 0.03, dry: 0.5, noise: 0.02 });
  // örtüşme: üst kolun ön kenarı (gövde üstünde), önkolun alt kenarı (uyluk üstünde) — aynı ton ailesinde kırık koyu çizgi
  adamRim(S, adamSub(adamCurve(tu.R, false), 0.1, 0.95), 3.2, { inward: true, color: ADAM_PAL.shirt[0], c: [g.el[0] - 30, g.el[1] - 80], th: 0.18, flat: true, gain: 3, alpha: 0.9 });
  adamRim(S, adamSub(adamCurve(tu.L, false), 0.12, 0.9), 3, { inward: true, color: ADAM_PAL.shirt[0], c: [g.el[0] + 40, g.el[1] - 80], th: 0.22, flat: true, gain: 3, alpha: 0.85 });
  adamRim(S, adamSub(adamCurve(tf.R, false), 0.15, 1), 2.8, { inward: true, color: P[0], c: [g.el[0] + 60, g.el[1] - 90], th: 0.3, flat: true, gain: 2.4, alpha: 0.85 });
  // dirsek kıvrımı + yuvarlak manşet
  S.line(adamCurve([[g.el[0] + 14, g.el[1] - 46], [g.el[0] + 22, g.el[1] - 26], [g.el[0] + 20, g.el[1] - 10]], false), 2.6, P[0], { w1: 1.1, edge: false, taper: true });
  adamCuff(S, g.fo, g.hf, 0.8, 2.8, ADAM_PAL.shirt[0]);
  return hp;
}

function adamPaintSitBody(S) {
  const PP = ADAM_PAL.pants, FP = adamDk(PP, -0.13), SHP = ADAM_PAL.shoe, FSH = adamDk(SHP, -0.13), SP = ADAM_PAL.shirt;
  const K0 = ADAM_SIT.knee, A0 = ADAM_SIT.ankle, H0 = ADAM_SIT.hip;
  const legAx = [H0, K0, A0];
  const shoeF = adamSitShoeF(0, 0), shoeFar = adamSitShoeF(ADAM_SIT_FAR.ankle[0], ADAM_SIT_FAR.ankle[1]);
  const shoeOpt = { cx: A0[0] + 30, cy: A0[1] - 6, rx: 112, ry: 52 };
  // uzak bacak + ayakkabı: çoğu yakın bacağın arkasında, yalnız ince koyu şerit
  adamPaintShoe(S, adamMap(adamStandShoe(), shoeFar), FSH, shoeOpt);
  adamShoeDetail(S, shoeFar, FSH, true);
  const farPts = adamSitFarLeg(), far = adamShape(farPts);
  const farAx = [H0, [K0[0] + ADAM_SIT_FAR.knee[0], K0[1] + ADAM_SIT_FAR.knee[1]], [A0[0] + ADAM_SIT_FAR.ankle[0], A0[1] + ADAM_SIT_FAR.ankle[1]]];
  adamRim(S, adamCurve(farPts.slice(11, 21), false), 2.6, { c: far.c });
  adamCloth(S, far, { ramp: FP.slice(0, 4), shade: adamBand(farAx, [54, 42, 30]), dir: adamAlong(farAx, S, 0.12), len: [56, 110], wid: [11, 16] });
  // gövde
  adamNeckStub(S, 141, ADAM_SIT.head[0], ADAM_SIT.head[1], ADAM_SIT.hs, ADAM_SIT_COLLAR);
  const tp = adamSitTorso(), torso = adamShape(tp);
  const tAx = [ADAM_SIT.T(256, 250), ADAM_SIT.T(262, 420), [160, 590]];
  adamRim(S, adamCurve(tp.slice(0, 14), false), 2.8, { c: torso.c });
  adamRim(S, adamCurve(tp.slice(16, 25), false), 2.8, { c: torso.c });
  const tShade = adamBand(tAx, [80, 80, 74], { k1: 0.66, k2: 0.1, bias: -0.03 });
  adamCloth(S, torso, { ramp: SP.slice(0, 4), shade: tShade, dir: adamAlong(tAx, S, 0.12), len: [64, 124], wid: [12, 18] });
  adamClip(S, torso.path, () => S.line(adamCurve(ADAM_SIT_COLLAR.slice(1, 6).map(([x, y]) => [x, y + 2.4]), false), 3, SP[0], { w1: 2, edge: false }));
  // yakın ayakkabı + bacak (uyluk gövdenin önünde)
  adamPaintShoe(S, adamMap(adamStandShoe(), shoeF), SHP, shoeOpt);
  adamShoeDetail(S, shoeF, SHP);
  const lp = adamSitLeg(), leg = adamShape(lp);
  adamRim(S, adamCurve(lp.slice(0, 11), false), 2.8, { c: leg.c });
  adamCloth(S, leg, { ramp: PP.slice(0, 4), shade: adamBand(legAx, [56, 44, 32], { bias: 0.03 }), dir: adamAlong(legAx, S, 0.12), len: [56, 110], wid: [11, 16] });
  adamClip(S, leg.path, () => {
    // diz arkası kıvrımı ve kaval önünde (uzak bacakla örtüşme) kırık koyu çizgi
    const pit = lp[7];
    S.line(adamCurve([[pit[0] - 22, pit[1] - 8], [pit[0] - 6, pit[1] - 2], [pit[0] + 4, pit[1] + 6]], false), 2.8, PP[0], { w1: 1.1, edge: false, taper: true });
    adamRim(S, adamCurve(lp.slice(11, 15), false), 2.8, { inward: true, color: PP[0], c: leg.c, th: 0.3, flat: true, gain: 2.4, alpha: 0.9 });
  });
  // gömlek eteği uyluk kökünün üstüne düşer: tek yumuşak etek çizgisi
  const hem = adamSitHem();
  const flap = adamShape([[60, 700], [60, 400], [194, 400], [205, 440], ...hem.slice().reverse(), [100, 700]].map((p) => [...p]), true);
  adamClip(S, torso.path, () => adamCloth(S, flap, { ramp: SP.slice(0, 4), shade: tShade, dir: adamAlong(tAx, S, 0.12), len: [50, 100], wid: [12, 17] }));
  S.line(adamCurve(hem, false), 3.4, SP[0], { w1: 2, edge: false, taper: true });
  // yakın kol
  return adamPaintSitArm(S, { shadowOn: torso.path, notOn: leg.path });
}

defSprite('adam-oturan-bas', () => {
  const S = adamSprite(ADAM_SIT.w, ADAM_SIT.h, 141, ADAM_SIT.K);
  adamPaintHead(S, ADAM_SIT.head[0], ADAM_SIT.head[1], ADAM_SIT.hs, { collar: ADAM_SIT_COLLAR });
  return adamOut(S, ADAM_SIT.neck[0], ADAM_SIT.neck[1]);
});
defSprite('adam-oturan-govde', () => {
  const S = adamSprite(ADAM_SIT.w, ADAM_SIT.h, 142, ADAM_SIT.K);
  adamPaintSitBody(S);
  return adamOut(S, ADAM_SIT.seat[0], ADAM_SIT.seat[1]);
});

// ---------------------------------------------------------------- YAKIN PLAN (omuzlar + baş + nar taneli SAĞ el)
// Sağa bakan profilde yakın kol sol koldur; sünnete uygun olarak taneleri SAĞ el (uzak kol) ağza götürür.
// Uzak önkol göğsün önünde, sofranın arkasından yükselir; dirsek gövdenin önünde, kadraj altında.
// Yakın (sol) kol omuzdan aşağı sarkar.
const ADAM_YK = (() => {
  const hs = 470, k = hs / ADAM_ST.hs, gx = 560, top = 92;
  const T = (x, y) => [gx + (x - ADAM_ST.gx) * k, top + (y - ADAM_ST.top) * k];
  const pinch = [628, 472], handAng = -1.82, handLen = 88 * k, foreAng = -1.466, foreLen = 545;
  const wrist = [pinch[0] - Math.cos(handAng) * handLen, pinch[1] - Math.sin(handAng) * handLen];
  const elbow = [wrist[0] - Math.cos(foreAng) * foreLen, wrist[1] - Math.sin(foreAng) * foreLen];
  return { w: 1200, h: 1700, hs, k, gx, top, T, neck: T(...ADAM_ST.neck), shoulder: T(...ADAM_ST.shoulder), pinch, handAng, handLen, wrist, elbow, foreAng, px: 450, py: 1100 };
})();
const ADAM_YK_COLLAR = ADAM_COLLAR.map(([x, y]) => ADAM_YK.T(x, y));
function adamYkTorso() { return adamStandTorso().map((p) => { const q = ADAM_YK.T(p[0], p[1]); return p.length > 2 ? [...q, p[2]] : q; }); }

// Nar tanesi: küçük, köşeli çekirdek biçimli, yarı saydam yakut; içte soluk çekirdek, keskin parıltı
function adamAril(S, cx, cy, r, ang, seed) {
  const rr = rng(seed), ca = Math.cos(ang), sa = Math.sin(ang);
  const P = (u, v) => [cx + (u * ca - v * sa) * r, cy + (u * sa + v * ca) * r];
  // sivri uç (+u) ve köşeli yanlar
  const outline = [[1.25, 0, 0.3], [0.62, 0.66], [-0.2, 0.84], [-0.9, 0.56], [-1.06, -0.04], [-0.78, -0.64], [0.02, -0.82], [0.7, -0.58]].map(([u, v, t]) => { const p = P(u * (0.95 + rr() * 0.1), v * (0.95 + rr() * 0.1)); return t === undefined ? [...p, 0.45] : [...p, t]; });
  const sh = adamShape(outline, true, 1);
  adamFill(S, sh.path, '#6E0A1F', 0.96);
  adamClip(S, sh.path, () => {
    // yüzeyler: ışığa bakan üst-sol yüz koyu-orta, karşı yanda içten geçen ışıkla parlak yakut
    adamFill(S, adamShape([P(1.3, 0), P(0.6, -0.7), P(-0.1, -0.9), P(-0.9, -0.7), P(-1.1, 0), P(-0.2, 0.05)].map((p) => [...p, 0]), true, 1).path, '#A3122C', 0.95);
    adamFill(S, adamShape([P(1.2, 0.05), P(0.1, 0.12), P(-0.85, 0.2), P(-0.7, 0.62), P(0.0, 0.78), P(0.6, 0.6)].map((p) => [...p, 0]), true, 1).path, '#D52440', 0.92);
    adamFill(S, adamShape([P(0.9, 0.12), P(0.1, 0.25), P(-0.4, 0.42), P(0.0, 0.62), P(0.55, 0.48)].map((p) => [...p, 0.5]), true, 1).path, '#F2576C', 0.8);
    // soluk çekirdek (içte, sivri uca doğru)
    adamFill(S, ellipsePath(...P(0.2, 0.02), r * 0.5, r * 0.18, ang), 'rgba(250,214,206,0.62)');
    adamFill(S, ellipsePath(...P(0.08, -0.04), r * 0.26, r * 0.09, ang), 'rgba(255,240,236,0.6)');
  });
  // gölge yanında ince koyu kenar (yalnız sağ alt), keskin parıltı (sol üst)
  S.line(adamSub(sh.poly, 0.0, 0.42), Math.max(1, r * 0.09), '#4A0614', { edge: false, taper: true });
  adamFill(S, adamShape([P(-0.62, -0.5), P(-0.2, -0.66), P(0.18, -0.6), P(-0.25, -0.46)].map((p) => [...p, 0.5]), true, 1).path, '#FFF4F4', 0.95);
  adamFill(S, ellipsePath(...P(0.55, -0.34), r * 0.08, r * 0.08), '#FFFFFF');
}

// Sağ el, başparmak ve işaret parmağı ucuyla tutam (başparmak yanından görünür). Yerel çerçeve: köken
// bilek, u el ekseni (bilek → tutam = 88), v eksene dik (+v avuç yanı = yüze doğru). Birim: ayakta px (× k).
function adamPinchFrame() {
  const k = ADAM_YK.k, W0 = ADAM_YK.wrist, a = ADAM_YK.handAng, c = Math.cos(a), s = Math.sin(a);
  const nvx = Math.cos(a - Math.PI / 2), nvy = Math.sin(a - Math.PI / 2);
  const M = (pts) => pts.map(([u, v, t]) => { const p = [W0[0] + (c * u + nvx * v) * k, W0[1] + (s * u + nvy * v) * k]; return t === undefined ? p : [...p, t]; });
  return { M, k };
}
function adamHandPinch(S) {
  const { M, k } = adamPinchFrame(), a = ADAM_YK.handAng;
  const SK = ADAM_SKIN(), line = shade(SK[0], -0.08, 1.05, -6);
  const reg = (pts, ramp0, shf, dirA, big = 1) => {
    const sh = adamShape(M(pts), true, 1.5);
    adamRegion(S, sh, { ramp: ramp0, shade: shf, dir: () => a + dirA + (S.r() - 0.5) * 0.25, len: [14 * big, 28 * big], wid: [6 * big, 10 * big], cover: 2.8, jitter: 3, noise: 0.01, lJit: 0.012, broken: 0.01, rim: false });
    return sh;
  };
  const tub = (p0, p1, r, o = {}) => adamBand(M([p0, p1]), r * k, { k1: 0.7, ...o });
  const edge = (sh, t0, t1, w = 4.2, th = 0.3) => adamRim(S, adamSub(sh.poly, t0, t1), w, { inward: true, color: line, alpha: 0.8, c: sh.c, th, flat: true, gain: 2.4 });
  // (gerçek ölçüler: 1 cm ≈ 6.7 birim; el kalınlığı bilekte ~4.3 cm, parmak ~1.6 cm)
  // kıvrık orta-yüzük-serçe parmaklar: işaret kavisi ile başparmak arasını doldurur, koyu basamaklar
  const curl = reg([[49, -6], [62, -8], [74, -6.5], [82, -1.5], [86, 3.5], [80, 5.5], [68, 7.5], [56, 9.5], [46, 7.5]], [SK[0], SK[1]], Paint.cst(0.62), 0.9, 0.7);
  for (const [cu, cv, rr] of [[70, -1.5, 5.6], [61, 1.5, 5.4], [52.5, 4, 5]]) {
    const lobe = adamShape(M([[cu + rr, cv - 0.5], [cu + rr * 0.3, cv - rr * 0.9], [cu - rr * 0.7, cv - rr * 0.8], [cu - rr, cv + 0.3], [cu - rr * 0.3, cv + rr * 0.9], [cu + rr * 0.6, cv + rr * 0.75]].map((p) => [...p, 0.9])), true, 1.2);
    adamRegion(S, lobe, { ramp: [SK[1], SK[2]], shade: tub([cu + rr, cv], [cu - rr, cv], rr * 1.1, { bias: -0.04 }), dir: () => a + 1.3 + (S.r() - 0.5) * 0.3, len: [8, 14], wid: [4, 7], cover: 3, jitter: 1, rim: false, broken: 0 });
    edge(lobe, 0.45, 1, 2.8, 0.2);
  }
  // el gövdesi: el sırtı düz, avuç yanında başparmak kökü şişkinliği
  const body = reg([[-5, -15], [10, -15.6], [25, -15.2], [38, -14.8], [48, -15], [56, -11.5], [58.5, -4], [55, 3], [47, 8.5], [39, 12.5], [30, 17.5], [19, 19.6], [7, 18], [-5, 15]], SK.slice(1, 4), tub([0, -15], [0, 16], 16, { k1: 0.55, bias: 0.06 }), 0, 0.9);
  edge(body, 0.0, 0.36, 4, 0.34);
  // işaret parmağı: boğumdan kavis çizerek yükselir, ucu başparmak ucuna iner
  const idx = reg([[45, -14.5], [57, -17], [69, -15.6], [79, -10.6], [85.6, -4], [89, 1.6], [88.8, 5.6, 0.7], [85.6, 6], [82.6, 0.6], [76.6, -4.4], [67, -6.6], [56.5, -5.6], [48, -3.6]], SK.slice(1, 4), tub([58, -15], [87, 2], 5.5, { bias: 0.05 }), 0.5, 0.75);
  edge(idx, 0.02, 0.5, 3.8, 0.28);
  // nar taneleri: parmak uçlarının arasında, dudağa doğru taşar
  const ar = 4.7 * k;
  const A = M([[92.5, 8.5], [88.5, 13.5], [95, 1.5]]);
  adamAril(S, A[1][0], A[1][1], ar * 0.9, a + 2.3, 301);
  adamAril(S, A[2][0], A[2][1], ar * 0.95, a + 0.5, 302);
  adamAril(S, A[0][0], A[0][1], ar, a + 1.45, 303);
  // başparmak: en önde, kalın ve kısa; ucu işaret ucuna değer
  const thumb = reg([[33, 18.2], [43, 20.4], [55, 19.2], [67, 15.6], [78.5, 11.6], [85.6, 8.2], [88.6, 4.6, 0.7], [85.2, 1.6], [76, 3], [64, 5.4], [52, 7.4], [42, 8.8]], SK.slice(1, 4), tub([40, 15], [86, 6], 6.5, { bias: 0.1 }), -0.12, 0.8);
  edge(thumb, 0.0, 0.55, 4, 0.3);
  S.line(adamCurve(M([[43, 8.8], [52, 7.4], [64, 5.4], [76, 3]]), false, 1.5), 3.6, line, { w1: 1.6, edge: false, taper: true });
  // tırnaklar
  const nail = (pts) => { const sh = adamShape(M(pts), true, 1); adamFill(S, sh.path, shade(SK[3], 0.05, 0.75, 8), 0.95); S.line(sh.poly.concat([sh.poly[0]]), 1.4, shade(SK[1], -0.04), { edge: false }); };
  nail([[82, 9.6], [86.4, 7.6], [87.6, 5], [83.4, 6.2]]);
  nail([[85.2, -3.4], [87.8, 0], [88.2, 4], [85.8, 2]]);
  // boğum ışığı (el sırtı)
  S.dab(...M([[28, -11]])[0], a, 24, 5, SK[4], { alpha: 0.5, dry: 1 });
  return { pinch: M([[88, 4]])[0], arils: A, shapes: [body, idx, thumb] };
}

function adamPaintYkBody(S) {
  const SP = ADAM_PAL.shirt, k = ADAM_YK.k;
  // uzak (sağ) üst kol: gövdenin arkasından dirseğe; gövde üstüne boyanınca yalnız göbek önünde koyu bir kama kalır
  const E = ADAM_YK.elbow, FS = adamDk(SP, -0.1);
  const farUp = [[420, 850], [lerp(420, E[0], 0.55), lerp(850, E[1], 0.55)], E];
  const fu = adamShape(adamTube(farUp, [86, 78, 68], { startCap: 1, endCap: 1 }));
  adamCloth(S, fu, { ramp: FS.slice(0, 4), shade: adamBand(farUp, [86, 78, 68], { bias: -0.06 }), dir: adamAlong(farUp, S, 0.12), len: [90, 170], wid: [16, 24], jitter: 12 });
  // boyun kökü + gövde
  adamNeckStub(S, 161, ADAM_YK.gx, ADAM_YK.top, ADAM_YK.hs, ADAM_YK_COLLAR, { detail: 0.6 });
  const tp = adamYkTorso(), torso = adamShape(tp);
  const tAx = [ADAM_YK.T(256, 250), ADAM_YK.T(262, 420), ADAM_YK.T(258, 650)];
  const nb = ADAM_TORSO.back.length;
  adamRim(S, adamCurve(tp.slice(0, 9), false), 3.4, { c: torso.c });
  adamRim(S, adamCurve(tp.slice(nb + 2 + 4, nb + 2 + 14), false), 3.4, { c: torso.c });
  adamCloth(S, torso, { ramp: SP.slice(0, 4), shade: adamBand(tAx, [84 * k, 84 * k, 74 * k], { k1: 0.66, k2: 0.1, bias: -0.04, add: (x, y) => (y < 900 ? 0.05 : 0) }), dir: adamAlong(tAx, S, 0.1), len: [100, 190], wid: [16, 24], jitter: 16, max: 3200 });
  const S0 = ADAM_YK.shoulder;
  const up = [[S0[0] - 4, S0[1] + 14], [S0[0] + 2, S0[1] + 300], [S0[0] + 10, S0[1] + 600]];
  const hu = [40 * k, 34 * k, 30 * k];
  const tu = adamTube(up, hu, { startCap: 0.92, endCap: 1 }), shU = adamShape(tu);
  adamClip(S, torso.path, () => {
    // göğsün önü gölgede; yakın kolun gövdeye düşen gölgesi (ışık sol üstten)
    const band = adamShape([[470, 760], [530, 800], [570, 900], [578, 1060], [560, 1300], [520, 1700], [470, 1700], [500, 1300], [512, 1050], [500, 880]]);
    adamCloth(S, band, { ramp: [SP[0], SP[1]], shade: Paint.cst(0.55), dir: () => Math.PI / 2 + (S.r() - 0.5) * 0.1, len: [90, 170], wid: [14, 22], broken: 0 });
    S.x.save(); S.x.translate(34, 22); S.x.globalAlpha = 0.85; S.x.fillStyle = SP[0]; S.x.fill(shU.path); S.x.restore();
    S.line(adamCurve(ADAM_YK_COLLAR.slice(1, 6).map(([x, y]) => [x, y + 7]), false), 8, SP[0], { w1: 5, edge: false });
  });
  // yakın (sol) kol: omuzdan dik sarkar, dirsek kadraj altında; önkol öne-aşağı uzanır. Gövdeden bir ton açık.
  const AP = adamDk(SP, 0.05);
  const fo = [up[2], [up[2][0] + 150, up[2][1] + 200], [up[2][0] + 300, up[2][1] + 400]];
  const tf = adamTube(fo, [30 * k, 28 * k, 25 * k], { startCap: 1 });
  adamCloth(S, adamShape(tf), { ramp: AP.slice(0, 4), shade: adamBand(fo, [30 * k, 28 * k, 25 * k], { bias: 0.04 }), dir: adamAlong(fo, S, 0.12), len: [90, 170], wid: [16, 24], jitter: 12 });
  adamCloth(S, shU, { ramp: AP.slice(0, 4), shade: adamBand(up, hu, { k1: 0.62, bias: 0.07 }), dir: adamAlong(up, S, 0.12), len: [100, 180], wid: [16, 24], jitter: 12 });
  adamRim(S, adamSub(adamCurve(tu.R, false), 0.06, 1), 8, { inward: true, color: SP[0], c: shU.c, th: 0.16, flat: true, gain: 3, alpha: 0.9 });
  adamRim(S, adamSub(adamCurve(tu.L, false), 0.1, 1), 8, { inward: true, color: SP[0], c: shU.c, th: 0.2, flat: true, gain: 3, alpha: 0.85 });
  // koltuk altı / dirsek iç kıvrımları
  S.line(adamCurve([[S0[0] + 66, S0[1] + 170], [S0[0] + 80, S0[1] + 280], [S0[0] + 76, S0[1] + 380]], false), 6, SP[0], { w1: 2, edge: false, taper: true });
}

function adamPaintYkArm(S) {
  const SP = adamDk(ADAM_PAL.shirt, 0.02), k = ADAM_YK.k;
  const hp = adamHandPinch(S);
  const E = ADAM_YK.elbow, W0 = ADAM_YK.wrist;
  const axis = [E, [lerp(E[0], W0[0], 0.5), lerp(E[1], W0[1], 0.5)], W0];
  const half = [22 * k, 20.5 * k, 19.5 * k];
  const tf = adamTube(axis, half, { startCap: 1.0, endCap: 0.4 }), sh = adamShape(tf);
  adamCloth(S, sh, { ramp: SP.slice(0, 4), shade: adamBand(axis, half, { k1: 0.62, bias: 0.06 }), dir: adamAlong(axis, S, 0.1), len: [100, 180], wid: [16, 24], jitter: 14 });
  adamRim(S, adamSub(adamCurve(tf.L, false), 0.0, 1), 4.6, { inward: true, color: SP[0], c: sh.c, th: 0.3, flat: true, gain: 2.4, alpha: 0.8 });
  adamRim(S, adamSub(adamCurve(tf.R, false), 0.0, 1), 3.6, { inward: true, color: SP[0], c: sh.c, th: 0.42, flat: true, gain: 2.4, alpha: 0.6 });
  adamCuff(S, axis, half, 0.86, 6, SP[0]);
  S.line(adamCurve([[E[0] + 14, E[1] - 300], [E[0] + 26, E[1] - 380], [E[0] + 30, E[1] - 450]], false), 5, SP[0], { w1: 2, taper: true, edge: false });
  return hp;
}

defSprite('adam-yakin-bas', () => {
  const S = adamSprite(ADAM_YK.w, ADAM_YK.h, 161);
  adamPaintHead(S, ADAM_YK.gx, ADAM_YK.top, ADAM_YK.hs, { detail: 0.6, collar: ADAM_YK_COLLAR });
  return adamOut(S, ADAM_YK.neck[0], ADAM_YK.neck[1]);
});
defSprite('adam-yakin-govde', () => {
  const S = adamSprite(ADAM_YK.w, ADAM_YK.h, 162);
  adamPaintYkBody(S);
  return adamOut(S, ADAM_YK.px, ADAM_YK.py);
});
defSprite('adam-yakin-kol', () => {
  const S = adamSprite(ADAM_YK.w, ADAM_YK.h, 163);
  adamPaintYkArm(S);
  return adamOut(S, ADAM_YK.elbow[0], ADAM_YK.elbow[1]);
});

// ---------------------------------------------------------------- birleşik çizim yardımcısı
// (x,y): gövde pivotunun ekran konumu; o.head / o.arm: dönüşler (radyan, tuval yönü: + saat yönü)
ADAM.draw = (ctx, pose, x, y, sc = 1, o = {}) => {
  const g = spr('adam-' + pose + '-govde'), M = ADAM[pose], gk = g.k || 1;
  const at = (p) => [x + (p[0] - g.px / gk) * sc, y + (p[1] - g.py / gk) * sc];
  const a = o.alpha ?? 1;
  const hd = spr('adam-' + pose + '-bas'), hp = at(M.neck);
  drawSpr(ctx, hd, hp[0], hp[1], sc, o.head || 0, a);
  drawSpr(ctx, g, x, y, sc, 0, a);
  if (SPRITE_DEFS['adam-' + pose + '-kol']) {
    const k = spr('adam-' + pose + '-kol'), kk = k.k || 1, kp = at([k.px / kk, k.py / kk]);
    drawSpr(ctx, k, kp[0], kp[1], sc, o.arm || 0, a);
  }
};
ADAM.PARTS = {
  ayakta: { head: ['eye', 'ear', 'nose', 'mouth'], arm: ['fingertip', 'palm'] },
  oturan: { head: ['eye', 'ear', 'nose', 'mouth'], arm: [] },
  yakin: { head: ['eye', 'ear', 'nose', 'mouth'], arm: ['handAtMouth', 'arils', 'wrist'] },
};
ADAM.pt = (pose, name, x, y, sc = 1, o = {}) => {
  const g = spr('adam-' + pose + '-govde'), M = ADAM[pose], P = ADAM.PARTS[pose], gk = g.k || 1;
  let p = M[name];
  const rot = (q, c, a) => adamRot(c[0], c[1], a)(q[0], q[1]);
  if (o.head && P.head.includes(name)) p = rot(p, M.neck, o.head);
  if (o.arm && P.arm.includes(name)) p = rot(p, pose === 'yakin' ? M.elbow : M.shoulder, o.arm);
  return [x + (p[0] - g.px / gk) * sc, y + (p[1] - g.py / gk) * sc];
};

// ---- dışa açık ölçüler (her biri kendi poz çerçevesinin koordinatlarında, çerçeve birimi)
ADAM.ayakta = (() => {
  const X = (u, v) => [ADAM_ST.gx + u * ADAM_ST.hs, ADAM_ST.top + v * ADAM_ST.hs], P = ADAM_HEAD.pts;
  const { M } = adamHandRelaxedGeom(...adamStandHandPlace(), 1);
  return {
    w: ADAM_ST.w, h: ADAM_ST.h, ground: [ADAM_ST.px, ADAM_ST.ground], neck: ADAM_ST.neck, shoulder: ADAM_ST.shoulder,
    eye: X(...P.eye), ear: X(...P.ear), nose: X(...P.nose), mouth: X(...P.mouth),
    fingertip: M([[1.0, 2]])[0], palm: M([[0.45, 2]])[0], heart: ADAM_ORG.heart.center, lungs: [258, 352], stomach: [280, 506], intestine: [270, 608],
    foot: [318, 1172], hip: [258, 600], knee: [270, 890],
  };
})();
ADAM.oturan = (() => {
  const X = (u, v) => [ADAM_SIT.head[0] + u * ADAM_SIT.hs, ADAM_SIT.head[1] + v * ADAM_SIT.hs], P = ADAM_HEAD.pts;
  return { w: ADAM_SIT.w, h: ADAM_SIT.h, neck: ADAM_SIT.neck, seat: ADAM_SIT.seat, eye: X(...P.eye), ear: X(...P.ear), nose: X(...P.nose), mouth: X(...P.mouth), knee: ADAM_SIT.knee };
})();
ADAM.yakin = (() => {
  const X = (u, v) => [ADAM_YK.gx + u * ADAM_YK.hs, ADAM_YK.top + v * ADAM_YK.hs], P = ADAM_HEAD.pts;
  const { M } = adamPinchFrame();
  return { w: ADAM_YK.w, h: ADAM_YK.h, neck: ADAM_YK.neck, elbow: ADAM_YK.elbow, mouth: X(...P.mouth), eye: X(...P.eye), nose: X(...P.nose), ear: X(...P.ear), handAtMouth: M([[88, 4]])[0], arils: M([[92, 8]])[0], wrist: ADAM_YK.wrist };
})();
