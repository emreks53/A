// Cennet manzarası (Perde 5): güneşsiz inci-şeftali-nane gök, pastel bulut kuşağı, uzak teraslı bahçeler,
// üst üste odalı iki köşk (altın-gümüş tuğla, yarı saydam inci pano, oyuk inci kubbe), orta bahçe kuşağı
// (güller, bağlar, meyve bahçeleri), köşklerin altındaki kemerlerden çıkıp birleşen ve yüzeyde akan ırmak
// (altın ve inci kıyılar, inci kubbecikler, inci-yakut çakıllar), çerçeveleyen altın gövdeli büyük ağaçlar.
// Işık: kaynaksız, yumuşak, eşit; serin, uzayan gölge (56:30). Gökte güneş, ışın ya da ışık kaynağı yok.
// Dünya koordinatı = zoom 1'de ekran pikseli (1080×1920), sol üst köken.
'use strict';
const CENNET_M = (() => {
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- palet
  const GOLD = ['#7A4C12', '#9C6A1C', '#BE8C2A', '#D9AC3E', '#EBC85E', '#F6DE8E', '#FFF1C2'];
  const SILV = ['#7F8299', '#9A9DB2', '#B4B7C9', '#CBCDDB', '#DFE0EA', '#EFEFF5', '#FBFBFF'];
  const PEARL = ['#B7AECF', '#CCC4DD', '#DFD8E7', '#ECE6EF', '#F7F2F4', '#FFFDFB'];
  const NACRE = ['#F6D2E2', '#CFF0E2', '#D9D0F3', '#F8E4CC', '#CDE6F6'];
  const RUBY = ['#5E0A1C', '#8A1027', '#B3192F', '#D63545', '#F07B80'];
  const LEAF = ['#05302A', '#083E33', '#0B5040', '#106446', '#1A7B4D', '#279453', '#3FAD58', '#6CC45C', '#A2D752'];
  const BUSH = ['#0A4537', '#0F5A40', '#18724A', '#258C52', '#3DA65B', '#62BC62'];
  const ROSE_COLS = ['#F28DB2', '#FBF1F2', '#E04866', '#F6C24E', '#F7AE8C', '#F5B8CF', '#FFFFFF'];

  // ---------------------------------------------------------------- yardımcılar
  function stroke(S, x, y, ang, len, wid, col, o) { Paint.drawStroke(S, x, y, ang, len * S.k, wid * S.k, col, o || {}); }
  function fill(S, path, col, o = {}) {
    S.x.save(); S.x.globalAlpha = o.alpha ?? 1; S.x.fillStyle = col; S.x.fill(path); S.x.restore();
    if (o.height !== false) { const g = o.h ?? 150; S.hx.save(); S.hx.globalAlpha = o.alpha ?? 1; S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fill(path); S.hx.strokeStyle = `rgb(${g + 50},${g + 50},${g + 50})`; S.hx.lineWidth = 1; S.hx.stroke(path); S.hx.restore(); }
  }
  const poly = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  const circ = (x, y, r) => ellipsePath(x, y, r, r);
  function leafPath(len, wid, r) {
    const p = new Path2D(); const l = len / 2, w = wid / 2; const b = (r() - 0.5) * w * 0.5;
    p.moveTo(-l, 0);
    p.bezierCurveTo(-l * 0.55, -w * 1.15 + b, l * 0.35, -w * 1.05 + b, l, b * 0.4);
    p.bezierCurveTo(l * 0.35, w * 1.05 + b, -l * 0.55, w * 1.15 + b, -l, 0);
    p.closePath(); return p;
  }
  // badem yaprak darbesi (len, wid ekran px; k ile ölçeklenir)
  function leaf(S, x, y, ang, len, wid, col, o = {}) {
    const k = S.k; len *= k; wid *= k; const r = S.r; const ctx = S.x, hx = S.hx;
    const p = leafPath(len, wid, r);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col; ctx.globalAlpha = o.alpha ?? 1; ctx.fill(p);
    ctx.clip(p);
    const n = Math.max(2, Math.round(wid / 2.6));
    for (let i = 0; i < n; i++) {
      const yy = -wid / 2 + ((i + 0.5) * wid) / n;
      ctx.globalAlpha = (o.alpha ?? 1) * (0.1 + r() * 0.16); ctx.strokeStyle = shade(col, r() < 0.5 ? 0.08 : -0.08); ctx.lineWidth = 0.6 + r() * 0.8 * k;
      ctx.beginPath(); ctx.moveTo(-len / 2, yy); ctx.lineTo(len / 2, yy * 0.6); ctx.stroke();
    }
    if (o.vein) { ctx.globalAlpha = 0.45; ctx.strokeStyle = o.vein; ctx.lineWidth = Math.max(0.8, wid * 0.08); ctx.beginPath(); ctx.moveTo(-len * 0.45, 0); ctx.lineTo(len * 0.38, 0); ctx.stroke(); }
    if (o.lit) { ctx.globalAlpha = 0.7; ctx.fillStyle = o.lit; ctx.beginPath(); ctx.ellipse(-len * 0.05, -wid * 0.22, len * 0.32, wid * 0.16, 0, 0, TAU); ctx.fill(); }
    ctx.restore();
    if (o.height !== false) {
      hx.save(); hx.translate(x, y); hx.rotate(ang); const g = 125 + Math.floor(r() * 30);
      hx.fillStyle = `rgb(${g},${g},${g})`; hx.globalAlpha = 0.9; hx.fill(p);
      hx.strokeStyle = `rgb(${g + 60},${g + 60},${g + 60})`; hx.globalAlpha = 0.5; hx.lineWidth = 1 * k; hx.stroke(p); hx.restore();
    }
  }
  // Taban dolgusu yapmayan darbe alanı. o: {bbox, path, mask, clip, ramp, shade, dir, len, wid, cover|count, jitter,
  // jitterFreq, noise, broken, sort, dry, lJit, hJit, alpha|alphaF, colorF, size, leaf, vein, height}
  function field(S, o) {
    const r = S.r, k = S.k; const cols = o.ramp; const steps = cols.length; const f = o.shade || Paint.cst(0.5);
    const dirf = typeof o.dir === 'function' ? o.dir : () => (o.dir ?? 0) + (r() - 0.5) * (o.dirJit ?? 0.2);
    const [lenA, lenB] = o.len, [widA, widB] = o.wid; const bb = o.bbox;
    const area = Math.max(1, (bb[2] - bb[0]) * (bb[3] - bb[1])); const meanS = ((lenA + lenB) / 2) * ((widA + widB) / 2) * k * k;
    const count = o.count ?? Math.min(o.max ?? 12000, Math.round((area / meanS) * (o.cover ?? 2)));
    const jit = (o.jitter ?? 0) * k; const fq = (o.jitterFreq ?? 0.01) / k; const nz = o.noise ?? 0.03;
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
      if (o.path && !S.x.isPointInPath(o.path, x, y)) continue;
      if (o.mask && !o.mask(x, y)) continue;
      let v = f(x + (NOISE(x * fq + 3, y * fq) - 0.5) * jit * 2, y + (NOISE(x * fq, y * fq + 9) - 0.5) * jit * 2) + (r() - 0.5) * nz * 2;
      let ki = clamp(Math.floor(v * steps), 0, steps - 1);
      if (r() < (o.broken ?? 0.05)) ki = clamp(ki + r.sign(), 0, steps - 1);
      list.push([x, y, ki, o.sort === 'y' ? y : ki + r() * (o.sortJit ?? 0)]);
    }
    if (o.sort !== false) list.sort((a, b) => a[3] - b[3]);
    if (o.clip) { S.x.save(); S.hx.save(); S.x.clip(o.clip); S.hx.clip(o.clip); }
    for (const [x, y, ki] of list) {
      let col = cols[ki]; if (o.colorF) col = o.colorF(x, y, ki, col);
      col = shade(col, (r() - 0.5) * (o.lJit ?? 0.03), 1 + (r() - 0.5) * 0.08, (r() - 0.5) * (o.hJit ?? 5));
      const sz = o.size ? o.size(x, y) : 1;
      const al = o.alphaF ? o.alphaF(x, y) : o.alpha;
      if (al !== undefined && al <= 0.01) continue;
      const ang = dirf(x, y), len = lerp(lenA, lenB, r()) * sz, wid = lerp(widA, widB, r()) * sz;
      if (o.leaf) leaf(S, x, y, ang, len, wid, col, { alpha: al, height: o.height, vein: o.vein });
      else Paint.drawStroke(S, x, y, ang, len * k, wid * k, col, { dry: o.dry ?? 0.15, alpha: al, height: o.height });
    }
    if (o.clip) { S.x.restore(); S.hx.restore(); }
    return list.length;
  }
  // kavisli darbe (kemer/hilal): merkez, yarıçap, açı aralığı, genişlik (sprite px)
  function arc(S, cx, cy, rr, a0, a1, wid, col, o = {}) {
    const r = S.r, ctx = S.x, hx = S.hx; const ro = rr + wid / 2, ri = Math.max(0.5, rr - wid / 2);
    const p = new Path2D();
    p.arc(cx, cy, ro, a0, a1);
    const tx = cx + Math.cos(a1) * rr, ty = cy + Math.sin(a1) * rr;
    p.lineTo(tx + Math.cos(a1 + 1.4) * wid * 0.2, ty + Math.sin(a1 + 1.4) * wid * 0.2);
    p.arc(cx, cy, ri, a1 - 0.02, a0 + 0.02, true);
    p.closePath();
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = col; ctx.fill(p); ctx.clip(p);
    const n = Math.max(2, Math.round(wid / 2.5));
    for (let i = 0; i < n; i++) {
      const rad = ri + ((i + 0.5) / n) * (ro - ri);
      ctx.globalAlpha = (o.alpha ?? 1) * (0.08 + r() * 0.14); ctx.strokeStyle = shade(col, r() < 0.5 ? 0.06 : -0.06); ctx.lineWidth = 0.6 + r() * 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, rad, a0 + (a1 - a0) * r() * 0.2, a1 - (a1 - a0) * r() * 0.2); ctx.stroke();
    }
    ctx.restore();
    if (o.height !== false) { hx.save(); const g = 130 + Math.floor(r() * 30); hx.fillStyle = `rgb(${g},${g},${g})`; hx.fill(p); hx.strokeStyle = `rgb(${g + 70},${g + 70},${g + 70})`; hx.lineWidth = 1.2; hx.stroke(p); hx.restore(); }
  }
  function crSample(pts, per = 10) {
    const out = []; const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      for (let j = 0; j < per; j++) {
        const t = j / per, t2 = t * t, t3 = t2 * t;
        out.push(p1.map((_, q) => 0.5 * (2 * p1[q] + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t2 + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t3)));
      }
    }
    out.push(pts[n - 1].slice());
    return out;
  }
  const tangents = (P) => P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; });
  const bboxOf = (P, pad = 0) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const p of P) { const w = (p[2] || 0) / 2; a = Math.min(a, p[0] - w); b = Math.min(b, p[1] - w); c = Math.max(c, p[0] + w); d = Math.max(d, p[1] + w); } return [a - pad, b - pad, c + pad, d + pad]; };
  // kalın fırçalı tüp (gövde, dal): pts [[x,y,w]]
  function tube(S, pts, cols, o = {}) {
    const P = crSample(pts, o.per ?? 8); const T = tangents(P), N = T.map(([tx, ty]) => [-ty, tx]);
    const path = new Path2D(); const seedN = o.nz ?? 0;
    P.forEach((p, i) => { const ww = (p[2] / 2) * (1 + (NOISE(i * 0.21, 4.4 + seedN) - 0.5) * 0.14); const q = [p[0] + N[i][0] * ww, p[1] + N[i][1] * ww]; i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]); });
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; const ww = (p[2] / 2) * (1 + (NOISE(i * 0.21, 8.8 + seedN) - 0.5) * 0.14); path.lineTo(p[0] - N[i][0] * ww, p[1] - N[i][1] * ww); }
    path.closePath();
    const near = (x, y) => { let bi = 0, bd = 1e18; for (let i = 0; i < P.length; i++) { const dx = x - P[i][0], dy = y - P[i][1]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } } return bi; };
    const lit = o.lit ?? [-0.6, -0.8];
    const offAt = (x, y) => { const i = near(x, y); const off = clamp(((x - P[i][0]) * N[i][0] + (y - P[i][1]) * N[i][1]) / (P[i][2] / 2 + 0.01), -1, 1); const side = N[i][0] * lit[0] + N[i][1] * lit[1] > 0 ? 1 : -1; return [off, off * side, i]; };
    const shadeF = (x, y) => { const [off, u] = offAt(x, y); const base = o.prof ? o.prof(u) : 0.5 + u * 0.34 - Math.pow(Math.abs(off), 3) * 0.3; return clamp(base + (o.lift ?? 0) + (o.shadeY ? o.shadeY(y) : 0)); };
    if (o.rim !== false) S.rim(path, { w: o.rimW ?? 2.6 });
    S.region(path, { ramp: cols, shade: shadeF, dir: (x, y) => { const i = near(x, y); return Math.atan2(T[i][1], T[i][0]) + (S.r() - 0.5) * 0.1; }, len: o.len ?? [40, 90], wid: o.wid ?? [8, 14], cover: o.cover ?? 2.6, jitter: 5, noise: 0.05, rim: false, bbox: bboxOf(P, 4), broken: 0.05 });
    return { path, P, T, N, near, offAt };
  }
  // ---- güller
  // tek katlı yaban gülü (5 yaprak, safran göbek) — üslup referansındaki çiçek
  function wildRose(S, x, y, R, col, o = {}) {
    const r = S.r; const ph = o.ph ?? r() * TAU; const inner = o.inner ?? shade(col, -0.12, 1.4, -8);
    for (let i = 0; i < 5; i++) {
      const a = ph + (i / 5) * TAU + (r() - 0.5) * 0.2; const px = x + Math.cos(a) * R * 0.5, py = y + Math.sin(a) * R * 0.46;
      const pet = smoothPath(blobPts(px, py, R * 0.56, R * 0.48, 14, 0.07, Math.floor(r() * 1e5), a));
      fill(S, pet, col, { h: 160 });
      fill(S, smoothPath(blobPts(x + Math.cos(a) * R * 0.3, y + Math.sin(a) * R * 0.28, R * 0.26, R * 0.2, 10, 0.08, Math.floor(r() * 1e5), a)), inner, { h: 158, alpha: 0.85 });
      if (R > 6) arc(S, px, py, R * 0.42, a - 0.9, a + 0.9, Math.max(1, R * 0.08), shade(col, 0.06, 0.7, 6), { alpha: 0.9 });
    }
    fill(S, circ(x, y, R * 0.2), '#F2B33A', { h: 175 });
    if (R > 7) for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU; fill(S, circ(x + Math.cos(a) * R * 0.2, y + Math.sin(a) * R * 0.2, Math.max(0.7, R * 0.055)), '#B0601C', { h: 178 }); }
    fill(S, circ(x - R * 0.06, y - R * 0.06, R * 0.09), '#FFE07A', { h: 180 });
  }
  // dolgun gül (kâse + sarmal)
  function cupRose(S, x, y, R, col) {
    const r = S.r; const dk = shade(col, -0.15, 1.05, -6), lt = shade(col, 0.1, 0.8, 6), dd = shade(col, -0.32, 1.1, -10);
    if (R < 4) { fill(S, circ(x, y, R), col, { h: 165 }); fill(S, circ(x - R * 0.3, y - R * 0.3, R * 0.45), lt, { h: 170 }); return; }
    for (let i = 0; i < 6; i++) { // dış taç yapraklar
      const a = Math.PI * 0.05 + (i / 5) * Math.PI * 0.9 + (r() - 0.5) * 0.2; const px = x + Math.cos(a) * R * 0.5, py = y + Math.sin(a) * R * 0.34 + R * 0.12;
      fill(S, smoothPath(blobPts(px, py, R * 0.55, R * 0.4, 12, 0.06, Math.floor(r() * 1e5), a)), i % 2 ? dk : col, { h: 150 });
    }
    for (let i = 0; i < 3; i++) { const a = Math.PI + 0.4 + i * 0.9; fill(S, smoothPath(blobPts(x + Math.cos(a) * R * 0.5, y + Math.sin(a) * R * 0.3, R * 0.5, R * 0.36, 12, 0.06, Math.floor(r() * 1e5), a)), dk, { h: 148 }); }
    fill(S, ellipsePath(x, y - R * 0.08, R * 0.66, R * 0.56), col, { h: 160 });
    arc(S, x, y - R * 0.14, R * 0.44, Math.PI * 0.95, Math.PI * 2.15, Math.max(1, R * 0.15), dk);
    arc(S, x + R * 0.04, y - R * 0.16, R * 0.22, Math.PI * 1.5, Math.PI * 2.8, Math.max(0.8, R * 0.12), dd);
    arc(S, x, y - R * 0.3, R * 0.62, Math.PI * 0.18, Math.PI * 0.82, Math.max(1, R * 0.17), lt);
    arc(S, x, y + R * 0.2, R * 0.6, Math.PI * 1.15, Math.PI * 1.85, Math.max(1, R * 0.12), shade(col, 0.15, 0.7, 8), { alpha: 0.9 });
  }
  // gül çalısı: taban (x,y) sprite px, boyut s (ekran px)
  function roseBush(S, x, y, s, o = {}) {
    const r = S.r; const k = S.k; const cols = o.cols || ROSE_COLS; const base = o.leafRamp || BUSH;
    const n = Math.round(6 + s * 0.45);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.7; const rad = s * k * (0.22 + r() * 0.55);
      const px = x + Math.cos(a) * rad * 0.95, py = y - s * k * 0.36 + Math.sin(a) * rad * 0.6;
      const vi = clamp(Math.floor((1 - (py - (y - s * k)) / (s * k)) * base.length * 0.85 + (r() - 0.5) * 1.3 + (o.lift ?? 0)), 0, base.length - 1);
      leaf(S, px, py, a + (r() - 0.5) * 0.9, s * (0.34 + r() * 0.18), s * (0.17 + r() * 0.07), base[vi], {});
    }
    const m = o.roses ?? Math.max(1, Math.round(s / 8));
    const c0 = o.color ?? r.pick(cols);
    for (let i = 0; i < m; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2; const rad = s * k * (0.12 + r() * 0.4);
      const col = shade(r() < 0.75 ? c0 : r.pick(cols), (r() - 0.5) * 0.05); const R = s * k * (0.1 + r() * 0.06);
      const px = x + Math.cos(a) * rad, py = y - s * k * 0.48 + Math.sin(a) * rad * 0.6;
      if (R > 5.5 && r() < 0.45) wildRose(S, px, py, R * 1.15, col); else cupRose(S, px, py, R, col);
    }
  }

  // ================================================================ IRMAK GEOMETRİSİ (ırmak katmanı dünya koordinatı)
  // ctrl: [x, y, genişlik]; banks: [A tarafı (+normal), B tarafı (−normal)]. Her köşkün kemer dizisinden çıkan
  // geniş, sığ su yelpazesi daralarak dereye dönüşür; iki dere birleşip izleyiciye doğru genişleyen ana ırmak olur.
  const STREAM_DEFS = [
    { id: 'L', banks: ['gold', 'gold'], ctrl: [[250, 1074, 262], [251, 1096, 180], [258, 1126, 108], [282, 1160, 80], [338, 1196, 70], [426, 1232, 74], [510, 1258, 82], [562, 1274, 88]] },
    { id: 'R', banks: ['pearl', 'pearl'], ctrl: [[830, 1004, 246], [829, 1026, 168], [822, 1056, 100], [796, 1090, 72], [736, 1138, 64], [664, 1194, 70], [606, 1240, 80], [568, 1270, 88]] },
    { id: 'M', banks: ['gold', 'pearl'], ctrl: [[560, 1236, 104], [538, 1290, 120], [500, 1350, 138], [476, 1420, 158], [494, 1500, 192], [576, 1582, 232], [684, 1678, 284], [712, 1790, 342], [646, 1918, 420], [566, 2050, 510], [530, 2140, 552]] },
  ];
  const STREAMS = STREAM_DEFS.map((d) => {
    const P = crSample(d.ctrl, 18); const T = tangents(P); const N = T.map(([tx, ty]) => [-ty, tx]);
    const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { ...d, P, T, N, L, len: L[L.length - 1] };
  });
  const bankW = (y) => 6 + Math.max(0, y - 1000) * 0.07; // kıyı şeridi (perspektif)
  const wob = (i, s, side) => (NOISE(i * 0.17 + s * 13.1, side * 7.3 + 2) - 0.5) * 6;
  function ribbon(st, fa, fb, ox = 0, oy = 0) {
    const p = new Path2D(); const { P, N } = st;
    for (let i = 0; i < P.length; i++) { const o = fa(i); const q = [P[i][0] + N[i][0] * o - ox, P[i][1] + N[i][1] * o - oy]; i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }
    for (let i = P.length - 1; i >= 0; i--) { const o = fb(i); p.lineTo(P[i][0] + N[i][0] * o - ox, P[i][1] + N[i][1] * o - oy); }
    p.closePath(); return p;
  }
  const sIdx = (st) => STREAMS.indexOf(st);
  const fanK = (st, i) => clamp(st.L[i] / 70); // yelpazede kenar dalgası/kıyı yavaş belirir
  const waterA = (st) => (i) => st.P[i][2] / 2 + wob(i, sIdx(st), 1) * fanK(st, i);
  const waterB = (st) => (i) => -(st.P[i][2] / 2 + wob(i, sIdx(st), 2) * fanK(st, i));
  function waterPath(ox = 0, oy = 0) { const p = new Path2D(); for (const st of STREAMS) p.addPath(ribbon(st, waterA(st), waterB(st), ox, oy)); return p; }
  function bankPath(st, side, ox = 0, oy = 0) {
    if (side === 0) return ribbon(st, (i) => waterA(st)(i) - 3, (i) => waterA(st)(i) + bankW(st.P[i][1]) * fanK(st, i), ox, oy);
    return ribbon(st, (i) => waterB(st)(i) + 3, (i) => waterB(st)(i) - bankW(st.P[i][1]) * fanK(st, i), ox, oy);
  }
  function nearestRaw(x, y) {
    let dep = 0, gap = 1e9, sx = 0, sy = 0, bt = null, be = 1e9;
    for (const st of STREAMS) {
      const { P, N, T } = st; let bi = 0, bd = 1e18;
      for (let i = 0; i < P.length; i++) { const dx = x - P[i][0], dy = y - P[i][1]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
      const off = Math.sqrt(bd); const hw = P[bi][2] / 2; // uç noktaların ötesi de doğru: öklid uzaklığı
      const d1 = 1 - off / hw; if (d1 > dep) dep = d1;
      const e = off - hw; gap = Math.min(gap, e - bankW(y) * fanK(st, bi));
      if (d1 > 0) { const wgt = d1 * d1 * (st.id === 'M' ? 1.5 : 1); sx += T[bi][0] * wgt; sy += T[bi][1] * wgt; }
      if (e < be) { be = e; bt = T[bi]; }
    }
    if (sx === 0 && sy === 0) { sx = bt[0]; sy = bt[1]; }
    const l = Math.hypot(sx, sy) || 1; return [clamp(dep), sx / l, sy / l, gap];
  }
  // kaba ızgara önbelleği (5 px): derinlik, akış yönü, suya/kıyıya uzaklık
  const GRID = { x0: -220, y0: 940, x1: 1300, y1: 2160, s: 5 };
  let grid = null;
  function buildGrid() {
    const { x0, y0, x1, y1, s } = GRID; const nx = Math.ceil((x1 - x0) / s) + 1, ny = Math.ceil((y1 - y0) / s) + 1;
    const D = new Float32Array(nx * ny), FX = new Float32Array(nx * ny), FY = new Float32Array(nx * ny), G = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = nearestRaw(x0 + i * s, y0 + j * s); const k = j * nx + i; D[k] = q[0]; FX[k] = q[1]; FY[k] = q[2]; G[k] = q[3]; }
    grid = { nx, ny, D, FX, FY, G };
  }
  function sampleGrid(arr, x, y) {
    if (!grid) buildGrid(); const { x0, y0, s } = GRID; const { nx, ny } = grid;
    const fx = clamp((x - x0) / s, 0, nx - 1.001), fy = clamp((y - y0) / s, 0, ny - 1.001); const i = Math.floor(fx), j = Math.floor(fy); const u = fx - i, v = fy - j;
    const k = j * nx + i; return lerp(lerp(arr[k], arr[k + 1], u), lerp(arr[k + nx], arr[k + nx + 1], u), v);
  }
  const inGrid = (x, y) => x >= GRID.x0 && x <= GRID.x1 && y >= GRID.y0 && y <= GRID.y1;
  function depthAt(x, y) { return inGrid(x, y) ? sampleGrid(grid ? grid.D : (buildGrid(), grid.D), x, y) : nearestRaw(x, y)[0]; }
  function waterGap(x, y) { return inGrid(x, y) ? sampleGrid(grid ? grid.G : (buildGrid(), grid.G), x, y) : nearestRaw(x, y)[3]; }
  function flowDir(x, y) {
    if (!inGrid(x, y)) { const q = nearestRaw(x, y); return [q[1], q[2]]; }
    if (!grid) buildGrid();
    const dx = sampleGrid(grid.FX, x, y), dy = sampleGrid(grid.FY, x, y); const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l];
  }
  let _rp = null;
  const riverPath = () => (_rp || (_rp = waterPath(0, 0)));

  // ================================================================ 1. GÖK (güneşsiz, inci-şeftali-nane-lavanta)
  const SKY = { x: -200, y: -1400, w: 1480, h: 2600 };
  function paintSky() {
    const { w, h } = SKY; const ox = SKY.x, oy = SKY.y;
    const S = Paint.sprite(w, h, { seed: 5101, k: 1 }); const r = S.r;
    const bands = [[-1400, '#8784C4'], [-1190, '#9590CB'], [-980, '#A39DD2'], [-770, '#B1AAD9'], [-570, '#BFB6DE'], [-390, '#CCC2E3'], [-220, '#D8CCE6'],
      [-60, '#E3D3E5'], [80, '#EDD8E0'], [200, '#F3DBD5'], [310, '#F6E0CD'], [410, '#F6E7D5'], [500, '#EFEDDC'], [590, '#E2EEDD'], [690, '#D6ECDD'], [820, '#E1F0E4'], [980, '#EAF3EA']];
    const ramp = bands.map((b) => b[1]); const n = ramp.length;
    const yIdx = (yw) => { for (let i = n - 1; i >= 0; i--) if (yw >= bands[i][0]) { const y0 = bands[i][0], y1 = i < n - 1 ? bands[i + 1][0] : y0 + 150; return (i + clamp((yw - y0) / (y1 - y0))) / n; } return 0; };
    const sf = (x, y) => yIdx(y + oy + 26 * Math.sin((x + ox) * 0.0042 + 0.7) + 14 * Math.sin((x + ox) * 0.0113 + y * 0.003));
    for (let y = 0; y < h; y += 4) { S.x.fillStyle = ramp[clamp(Math.floor(sf(w / 2, y) * n), 0, n - 1)]; S.x.fillRect(0, y, w, 4); }
    field(S, { bbox: [-60, -20, w + 60, h + 20], ramp, shade: sf, dir: 0, dirJit: 0.06, len: [140, 320], wid: [18, 34], cover: 3.0, jitter: 22, jitterFreq: 0.004, noise: 0.02, broken: 0.08, max: 9000, sortJit: 0.6 });
    // sedef tülleri: orta gökte hafif eğik, yumuşak pastel darbe grupları (ışık kaynağı değil)
    for (let g = 0; g < 30; g++) {
      const gx = r() * w, gy = -650 - oy + r() * 1150;
      const base = ramp[clamp(Math.floor(sf(gx, gy) * n), 0, n - 1)];
      const col = mix(base, NACRE[g % NACRE.length], 0.42);
      const ang = -0.05 + (r() - 0.5) * 0.06; const m = 4 + Math.floor(r() * 5);
      for (let i = 0; i < m; i++) stroke(S, gx + (r() - 0.5) * 300, gy + (r() - 0.5) * 46, ang + (r() - 0.5) * 0.03, 120 + r() * 200, 12 + r() * 12, shade(col, (r() - 0.5) * 0.02), { dry: 0.35 });
    }
    return { canvas: S.finish({ emboss: 0.42 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-gok', paintSky);

  // ================================================================ 2. BULUT KUŞAĞI (kameranın içinden geçtiği)
  const BAND = { x: -200, y: -600, w: 1480, h: 900 };
  function paintBand() {
    const { w, h } = BAND;
    const S = Paint.sprite(w, h, { seed: 5202, k: 1 }); const r = S.r;
    // pufta: [cx, cy, rx, ry, sıra]; sıralar arkadan öne; alttaki sıra üsttekinin tabanını örter
    const puffs = [];
    const row = (y0, rA, rB, gapA, gapB, ri, yJ = 40) => { for (let x = -90 + r() * 80; x < w + 110;) { const R = rA + r() * (rB - rA); puffs.push([x, y0 + (r() - 0.5) * yJ, R * (1.15 + r() * 0.3), R * (0.78 + r() * 0.16), ri]); x += R * (gapA + r() * (gapB - gapA)); } };
    row(150, 60, 120, 1.2, 1.9, 0, 60); // üst tepe (kırık)
    for (let i = 0; i < 7; i++) { const R = 30 + r() * 34; puffs.push([r() * w, 96 + r() * 40, R * 1.3, R * 0.85, 0]); }
    row(258, 80, 130, 1.1, 1.5, 1);
    row(360, 90, 140, 1.05, 1.45, 2);
    row(462, 90, 140, 1.05, 1.45, 3);
    row(562, 85, 130, 1.1, 1.5, 4);
    row(668, 70, 115, 1.35, 2.2, 5, 50); // alt sarkan pufçuklar (kırık)
    for (let i = 0; i < 9; i++) { const R = 20 + r() * 26; puffs.push([r() * w, 770 + r() * 50, R * 1.35, R * 0.8, 6]); }
    const sil = new Path2D(); sil.addPath(rectPath(-30, 250, w + 60, 420));
    for (const [cx, cy, rx, ry] of puffs) sil.addPath(ellipsePath(cx, cy, rx, ry));
    S.rim(sil, { w: 2.2, alpha: 0.55 });
    fill(S, rectPath(-30, 250, w + 60, 420), '#D9CEE7', { h: 140 });
    puffs.sort((a, b) => a[4] - b[4] || a[1] - b[1]);
    for (const [cx, cy, rx, ry, ri] of puffs) {
      const t = ri / 6;
      const warm = NOISE(cx * 0.004 + 3, ri * 0.7) ; // bölgesel sıcaklık: şeftali ↔ nane ↔ lavanta
      const tint = warm < 0.42 ? '#F6D9CB' : warm < 0.58 ? '#F4E4EA' : '#DCEFE6';
      const shC = mix('#BEB4DD', '#A9A0D2', t), loC = mix('#D3C9E7', '#C0B7DF', t);
      const midC = mix(mix('#F1E3E4', tint, 0.6), '#DED4EC', t * 0.8), topC = mix(mix('#FCF6F1', tint, 0.25), '#F2ECF6', t * 0.7);
      const pz = smoothPath(blobPts(cx, cy, rx, ry, 30, 0.035, 900 + Math.round(cx * 7 + cy)));
      fill(S, pz, shC, { h: 135 });
      S.x.save(); S.hx.save(); S.x.clip(pz); S.hx.clip(pz);
      // alt gölge katmanı: düz yatay darbeler
      field(S, { bbox: [cx - rx, cy + ry * 0.1, cx + rx, cy + ry], ramp: [shade(shC, -0.025), shC, loC], shade: Paint.grad(0, cy + ry, 0, cy + ry * 0.1, 0.1, 0.9), dir: 0, dirJit: 0.08, len: [rx * 0.4, rx * 0.8], wid: [9, 14], count: Math.round(rx / 11), noise: 0.2 });
      // orta (şeftali/sedef) ve üst (inci) katlar: yukarı kaymış elipsler → altta lavanta hilal
      const m1 = ellipsePath(cx, cy - ry * 0.16, rx * 0.93, ry * 0.86);
      fill(S, m1, midC, { h: 145 });
      field(S, { bbox: [cx - rx, cy - ry, cx + rx, cy + ry * 0.6], clip: m1, ramp: [shade(midC, -0.02), midC, shade(midC, 0.02)], shade: Paint.cst(0.5), dir: (x, y) => Math.atan2(y - (cy + ry * 0.8), x - cx) + Math.PI / 2 + (r() - 0.5) * 0.2, len: [rx * 0.35, rx * 0.6], wid: [8, 13], count: Math.round(rx / 12), noise: 0.6 });
      const m2 = ellipsePath(cx - rx * 0.06, cy - ry * 0.32, rx * 0.72, ry * 0.62);
      fill(S, m2, topC, { h: 160 });
      // tek, ince kemer (üst kenarda) + yumuşak ışık
      arc(S, cx - rx * 0.04, cy + ry * 0.35, Math.min(rx, ry * 1.3) * 0.98, Math.PI + 0.42, TAU - 0.5, ry * 0.13, mix(topC, '#FFFFFF', 0.7), { alpha: 0.95 });
      if (r() < 0.5) arc(S, cx + rx * 0.1, cy + ry * 0.2, Math.min(rx, ry * 1.3) * 0.62, Math.PI + 0.55, TAU - 0.7, ry * 0.08, mix(midC, shC, 0.25), { alpha: 0.8 });
      S.x.restore(); S.hx.restore();
    }
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k: 1 };
  }
  defSprite('bulut-kusagi', paintBand);

  // ================================================================ 3. UZAK TERASLI BAHÇELER (sise karışan)
  const FAR = { x: -200, y: 540, w: 1480, h: 980 };
  function paintFar() {
    const { w, h } = FAR; const ox = FAR.x, oy = FAR.y;
    const S = Paint.sprite(w, h, { seed: 5303, k: 1 }); const r = S.r;
    // katlar: uzaktan yakına; her biri basamaklı teraslarla örtülü tepe sırası, sise karışır
    const LAY = [
      { top: (x) => 584 + 18 * Math.sin(x * 0.0046 + 1.2) + 10 * Math.sin(x * 0.012 + 0.3), surf: '#CFE3DA', rise: '#A9C8C2', terr: 15, sc: 0.34 },
      { top: (x) => 628 + 24 * Math.sin(x * 0.0052 + 2.6) + 10 * Math.sin(x * 0.015 + 1.1), surf: '#B9DCC9', rise: '#8BBBA8', terr: 19, sc: 0.46 },
      { top: (x) => 684 + 30 * Math.sin(x * 0.0047 + 0.4) + 12 * Math.sin(x * 0.017 + 2.0), surf: '#9DD1AE', rise: '#66A987', terr: 24, sc: 0.6 },
      { top: (x) => 756 + 34 * Math.sin(x * 0.0058 + 4.1) + 12 * Math.sin(x * 0.019 + 0.7), surf: '#83C795', rise: '#47976C', terr: 30, sc: 0.76 },
      { top: (x) => 846 + 34 * Math.sin(x * 0.0051 + 5.3) + 14 * Math.sin(x * 0.021 + 1.9), surf: '#6BBC80', rise: '#2F8458', terr: 38, sc: 0.94 },
      { top: (x) => 980 + 30 * Math.sin(x * 0.0063 + 0.9) + 12 * Math.sin(x * 0.018 + 3.3), surf: '#58B172', rise: '#22744B', terr: 48, sc: 1.15 },
    ];
    LAY.forEach((Ly, li) => {
      const top = (xs) => Ly.top(xs + ox) - oy;
      const hill = new Path2D(); hill.moveTo(-10, h + 10); for (let x = -10; x <= w + 10; x += 8) hill.lineTo(x, top(x)); hill.lineTo(w + 10, h + 10); hill.closePath();
      const lim = li < LAY.length - 1 ? (x) => LAY[li + 1].top(x + ox) - oy + 26 : () => h + 10;
      const haze = 0.6 - li * 0.1; // aşağı doğru sis
      S.rim(hill, { w: 1.8, alpha: 0.25 + li * 0.1 });
      fill(S, hill, Ly.surf, { h: 140 });
      const sp = (j) => Ly.terr * (1 + j * 0.1);
      const edges = []; { let acc = 0; for (let j = 0; j < 40; j++) { acc += sp(j); edges.push(acc); if (acc > 520) break; } }
      const slope = (x) => Math.atan2(top(x + 6) - top(x - 6), 12);
      const mistAt = (x, y) => clamp((y - top(x) - 20) / 150) * haze;
      // teras yüzeyleri: yatay sakin darbeler (sise doğru açılır)
      const surfR = [shade(Ly.surf, -0.018), Ly.surf, shade(Ly.surf, 0.018), mix(Ly.surf, '#F1F6F0', 0.3), mix(Ly.surf, '#F4F7F2', 0.55)];
      field(S, { bbox: [-10, top(w / 2) - 60, w + 10, h + 4], path: hill, mask: (x, y) => y < lim(x), ramp: surfR, shade: (x, y) => clamp(0.3 + mistAt(x, y) * 1.1 + (NOISE(x * 0.01, y * 0.03) - 0.5) * 0.16), dir: (x) => slope(x) + (r() - 0.5) * 0.03,
        len: [Ly.terr * 1.2, Ly.terr * 2.6], wid: [Ly.terr * 0.22 + 1.5, Ly.terr * 0.36 + 2], cover: 2.2, noise: 0.01, broken: 0.02, max: 7000 });
      // şevler: her terasın altında net, koyu bant (basamak) + üst dudakta ışık çizgisi
      for (const e of edges) {
        const rh = Math.max(2.5, sp(0) * 0.4 * (1 + e / 700));
        const pts = []; for (let x = -10; x <= w + 10; x += 8) pts.push([x, top(x) + e]);
        const band = new Path2D(); pts.forEach(([x, y], i) => (i ? band.lineTo(x, y) : band.moveTo(x, y))); for (let i = pts.length - 1; i >= 0; i--) band.lineTo(pts[i][0], pts[i][1] + rh); band.closePath();
        const yMid = top(w / 2) + e; if (yMid > h + 20) break;
        S.x.save(); S.hx.save(); const clipP = new Path2D(); clipP.addPath(hill); S.x.clip(clipP); S.hx.clip(clipP);
        // önündeki katın arkasında kalan kısmı boyama
        const vis = new Path2D(); vis.moveTo(-10, -10); for (let x = -10; x <= w + 10; x += 8) vis.lineTo(x, lim(x)); vis.lineTo(w + 10, -10); vis.closePath(); S.x.clip(vis); S.hx.clip(vis);
        const rc = mix(Ly.rise, '#EEF4EE', clamp((e - 20) / 150) * haze);
        fill(S, band, rc, { h: 128 });
        for (let x = -10; x < w + 10;) { const len = 22 + r() * 46; stroke(S, x + len / 2, top(x + len / 2) + e + rh * 0.5, slope(x), len, Math.max(2, rh * 0.8), shade(rc, (r() - 0.5) * 0.05), { dry: 0.3 }); x += len * (0.9 + r() * 0.2); }
        for (let x = -10; x < w + 10;) { const len = 26 + r() * 60; if (r() < 0.85) stroke(S, x + len / 2, top(x + len / 2) + e - 1, slope(x), len, 1.2 + Ly.sc * 1.3, mix(Ly.surf, '#FBFDF7', 0.55), { dry: 0.45, height: false }); x += len * (0.95 + r() * 0.25); }
        S.x.restore(); S.hx.restore();
      }
      const edgeY = (x, j) => top(x) + edges[j];
      // meyve bahçesi sıraları: teras kenarı boyunca düzenli yuvarlak ağaççıklar
      const nRows = Math.round(18 * Ly.sc + 3);
      for (let i = 0; i < nRows; i++) {
        const j = Math.floor(r() * Math.min(8, edges.length - 1)); let x = r() * w; const n = 4 + Math.floor(r() * 12); const rr = (2.6 + r() * 1.6) * Ly.sc + 1;
        for (let q = 0; q < n; q++, x += rr * 2.15) {
          const y = edgeY(x, j) - 1; if (y > lim(x) - 4 || y > h - 4) continue;
          const mz = mistAt(x, y); const c = mix(shade(Ly.rise, 0.02), '#E6F0EA', mz * 0.8);
          fill(S, circ(x, y - rr, rr), c, { h: 150 }); fill(S, circ(x - rr * 0.28, y - rr * 1.3, rr * 0.5), mix(Ly.surf, '#F4F8F2', 0.2 + mz * 0.5), { h: 160 });
          if (li >= 3 && r() < 0.35) fill(S, circ(x + rr * 0.3, y - rr * 0.8, Math.max(0.9, rr * 0.22)), r() < 0.6 ? RUBY[3] : '#E9B640', { h: 168 });
        }
      }
      // gül tarhları: bazı terasların yüzeyinde pembe/beyaz çiçek kuşakları
      for (let i = 0; i < Math.round(10 * Ly.sc + 2); i++) {
        const j = Math.floor(r() * Math.min(8, edges.length - 1)); const x0 = r() * w, L2 = (60 + r() * 140) * Ly.sc; const col = r.pick(['#F4B9CF', '#FBF1F3', '#F7D27A', '#EDA0B8']);
        for (let x = x0; x < x0 + L2; x += 2.2 + Ly.sc * 2) { const y = edgeY(x, j) - sp(j) * (0.35 + r() * 0.3); if (y > lim(x) - 3 || y < top(x) + 2) continue; fill(S, circ(x, y, 0.8 + Ly.sc * 1.2), mix(col, '#F2F6F2', mistAt(x, y) * 0.7), { h: 165 }); }
      }
      // ince parlak dereler (teras boyunca kıvrılır)
      if (li >= 1 && li <= 4) for (let q = 0; q < 2; q++) {
        let x = 60 + r() * (w - 160); const j = 1 + Math.floor(r() * 3); const L2 = 100 + r() * 200;
        for (let t = 0; t < L2; t += 12) { const y = edgeY(x, j) - sp(j) * 0.55 + Math.sin(t * 0.04) * 1.5; if (y < lim(x) - 4) stroke(S, x, y, slope(x), 16, 1.4 + Ly.sc * 1.4, r() < 0.6 ? '#F2FCFA' : '#C4EEE8', { dry: 0.3, height: false }); x += 11; }
      }
      // inci köşkçükler (üst üste odalar + inci kubbe); uzaktakiler yıldız gibi sakin parlar (ışık konutların kendisinden)
      const nCh = [30, 22, 16, 12, 9, 6][li];
      for (let i = 0; i < nCh; i++) {
        const x = 30 + r() * (w - 60); const j = Math.floor(r() * Math.min(5, edges.length - 1)); const y = edgeY(x, j) - sp(j) * 0.4;
        if (y > lim(x) - 4 || y > h - 6) continue;
        const sc = Ly.sc * (0.85 + r() * 0.5); const mz = mistAt(x, y) * 0.6;
        const tiers = 1 + Math.floor(r() * (li < 3 ? 3 : 2));
        let by = y, bw = (22 + r() * 14) * sc;
        for (let t = 0; t < tiers; t++) {
          const bh = (8 + r() * 4) * sc; const x0 = x - bw / 2;
          fill(S, rectPath(x0, by - bh, bw, bh), mix('#F7F2F3', '#EEF2EE', mz), { h: 165 });
          fill(S, rectPath(x0 + bw * 0.76, by - bh, bw * 0.24, bh), mix('#D7CFE4', '#E3ECE6', mz), { h: 150 });
          fill(S, rectPath(x0 - 0.8, by - bh - 1.2, bw + 1.6, 1.1 * sc + 0.8), mix('#E9C766', '#EEF0E4', mz), { h: 170 });
          const nw = Math.max(1, Math.round(bw / (6.5 * sc)));
          for (let q = 0; q < nw; q++) fill(S, rectPath(x0 + bw * (q + 0.28) / nw, by - bh * 0.76, Math.max(1, bw * 0.44 / nw), bh * 0.56), mix(r() < 0.5 ? '#F6D8E4' : '#D6F0E6', '#F2F4F0', mz), { h: 160 });
          by -= bh + 1.2 * sc; bw *= 0.72;
        }
        const dr = bw * 0.56 + 1.2; const dome = new Path2D(); dome.arc(x, by + dr * 0.15, dr, Math.PI * 1.05, Math.PI * 1.95); dome.closePath();
        fill(S, dome, mix('#FCF8F7', '#F2F5F0', mz), { h: 176 });
        fill(S, ellipsePath(x + dr * 0.38, by - dr * 0.25, dr * 0.32, dr * 0.42), mix('#DDD3EE', '#EEF1EE', mz), { h: 168, alpha: 0.8 });
        if (li < 4 && r() < 0.6) { // sakin inci parıltısı
          const gx = x, gy = by - dr * 0.55; const gl = 4 + 6 * Ly.sc;
          S.x.save(); S.x.globalAlpha = 0.28; S.x.fillStyle = '#FFFDF8'; S.x.beginPath(); S.x.ellipse(gx, gy, gl * 0.6, gl * 0.5, 0, 0, TAU); S.x.fill(); S.x.restore();
          stroke(S, gx, gy, 0, gl * 1.2, 1.2, '#FFFFFF', { height: false, alpha: 0.75 });
          stroke(S, gx, gy, Math.PI / 2, gl * 0.75, 1.1, '#FFFFFF', { height: false, alpha: 0.65 });
          fill(S, circ(gx, gy, 1.2 + Ly.sc * 0.8), '#FFFFFF', { h: 190 });
        }
      }
    });
    return { canvas: S.finish({ emboss: 0.35 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-uzak', paintFar);

  // ================================================================ 4. KÖŞKLER (üst üste kurulmuş odalar, 39:20)
  // oyuk inci kubbe: kürenin ~%62'si görünür, tabanda altın yuva; sedef yanardönerliği, yumuşak ışık
  function pearlDomeTop(S, cx, baseY, R, seed) {
    const r = S.r; const cy = baseY - R * 0.26;
    const a0 = Math.asin(clamp((baseY - cy) / R));
    const body = new Path2D(); body.arc(cx, cy, R, a0, Math.PI - a0, true); body.closePath();
    S.rim(body, { w: 2, alpha: 0.75 });
    fill(S, body, PEARL[3], { h: 150 });
    const sph = Paint.sphere(cx - R * 0.22, cy - R * 0.42, R * 1.18, [-0.35, -0.94], 0.22);
    field(S, { bbox: [cx - R, cy - R, cx + R, baseY], clip: body, ramp: PEARL, shade: sph, dir: (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2 + (r() - 0.5) * 0.18,
      len: [R * 0.32, R * 0.62], wid: [Math.max(3, R * 0.08), Math.max(5, R * 0.13)], cover: 3.4, noise: 0.035, broken: 0.04,
      colorF: (x, y, ki, c) => { if (ki < 1 || ki > 4) return c; const u = ((x - cx) * 0.55 + (y - cy) * 0.83) / R; return mix(c, NACRE[(Math.floor((u + 1.4) * 2.4) + 10) % NACRE.length], 0.42); } });
    // içten hafif ışıyan alt kuşak (oyuk inci), serin kenar yansıması, yumuşak ışık lekesi
    arc(S, cx, cy, R * 0.86, Math.PI * 0.05 + a0, Math.PI * 0.95 - a0, R * 0.12, '#FBEADF', { alpha: 0.55 });
    arc(S, cx, cy, R * 0.95, -0.25, 0.45, R * 0.08, '#C6BCDB', { alpha: 0.7 });
    arc(S, cx - R * 0.06, cy - R * 0.06, R * 0.66, Math.PI * 1.1, Math.PI * 1.42, R * 0.12, '#FFFFFF', { alpha: 0.85 });
    // altın yuva
    const ring = new Path2D(); ring.ellipse(cx, baseY, R * Math.cos(a0) + 4 * S.k, 6.5 * S.k, 0, 0, TAU);
    S.rim(ring, { w: 1.4, alpha: 0.6 });
    fill(S, ring, GOLD[4], { h: 175 });
    fill(S, ellipsePath(cx, baseY - 2.4 * S.k, R * Math.cos(a0), 2.2 * S.k), GOLD[6], { h: 185, alpha: 0.85 });
    fill(S, ellipsePath(cx, baseY + 3.2 * S.k, R * Math.cos(a0), 2 * S.k), GOLD[2], { h: 150, alpha: 0.8 });
    void seed;
  }
  function paintPalace(cfg) {
    const K = cfg.K ?? 1; const W0 = cfg.w, H0 = cfg.h;
    const S = Paint.sprite(W0 * K, H0 * K, { seed: cfg.seed, k: K }); const r = S.r;
    const X = (v) => v * K; const cx = W0 / 2; const side = cfg.side;
    const TT = cfg.terrace; const CH = cfg.cornice;
    let yb = TT.top + 6; const st = [];
    for (const s of cfg.storeys) { const y1 = yb, y0 = y1 - s.h; st.push({ ...s, x0: cx - s.w / 2, x1: cx + s.w / 2, y0, y1 }); yb = y0 - CH; }
    const sideW = (s) => Math.max(10, s.w * 0.075);
    const sideDy = (y) => clamp((cfg.vpY - y) * 0.09, -20, 20);
    // ---- altın ve gümüş tuğla (ince desen, sıcak misk derz)
    function bricks(path, bb, o = {}) {
      fill(S, path, o.joint ?? '#BE9152', { h: 128 });
      S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
      const bh = o.bh ?? 7, bl = o.bl ?? 15; const dark = o.dark ?? 0;
      let row = 0;
      for (let y = bb[1] + bh / 2; y < bb[3] + bh; y += bh, row++) {
        const off = (row % 2) * bl * 0.5; let col = 0;
        for (let x = bb[0] - off; x < bb[2] + bl; x += bl, col++) {
          const gold = (col + row) % 2 === 0;
          const ao = o.ao ? o.ao(y) : 0;
          let c = gold ? mix('#EAC874', '#F3DA92', r()) : mix('#E1E0E8', '#EFEEF4', r());
          c = shade(c, -ao * 0.12 - dark * 0.1 + (r() - 0.5) * 0.025, 1 - dark * 0.15, dark * (gold ? -4 : 6));
          stroke(S, X(x + bl / 2), X(y), (r() - 0.5) * 0.02, bl - 1.5, bh - 1.3, c, { dry: 0.02 });
        }
      }
      S.x.restore(); S.hx.restore();
    }
    function archPath(xc, yTop, ow, yBot, grow = 0) {
      const p = new Path2D(); const rr = ow / 2 + grow; const yc = yTop + ow / 2;
      p.moveTo(X(xc - rr), X(yBot)); p.lineTo(X(xc - rr), X(yc)); p.arc(X(xc), X(yc), X(rr), Math.PI, 0); p.lineTo(X(xc + rr), X(yBot)); p.closePath(); return p;
    }
    // yarı saydam inci pano (içi ve dışı birbirinden görünür): sedef bantlar, içte ılık ışık
    function pearlPanel(xc, yTop, ow, yBot) {
      const pn = archPath(xc, yTop, ow, yBot, 0);
      fill(S, pn, '#EFE8F0', { h: 140 });
      S.x.save(); S.hx.save(); S.x.clip(pn); S.hx.clip(pn);
      const nb = Math.max(4, Math.round(ow / 4.5));
      for (let i = 0; i < nb; i++) {
        const u = (i + 0.5) / nb; const xx = xc - ow / 2 + u * ow;
        const tint = NACRE[(Math.floor(u * 4 + (xc * 0.013)) + 8) % 4];
        const c = mix('#F4EEF3', tint, 0.5 + r() * 0.25);
        stroke(S, X(xx), X(yTop + (yBot - yTop) * (0.3 + r() * 0.4)), Math.PI / 2 + (r() - 0.5) * 0.04, (yBot - yTop) * (0.75 + r() * 0.35), ow / nb + 2.2, c, { dry: 0.25 });
      }
      const hh = yBot - yTop;
      fill(S, ellipsePath(X(xc), X(yBot - hh * 0.12), X(ow * 0.42), X(hh * 0.3)), '#FBEADF', { h: 140, alpha: 0.65 }); // içte ılık ışıma
      fill(S, rectPath(X(xc - ow / 2), X(yTop + hh * 0.7), X(ow), X(2.2)), '#D9CBDF', { h: 135, alpha: 0.7 }); // içerideki zemin çizgisi
      arc(S, X(xc), X(yTop + ow / 2), X(ow / 2 - 1.2), Math.PI, TAU, X(3.2), '#C9BCD9', { alpha: 0.8 }); // kemer içi derinlik
      const sx = side > 0 ? xc - ow / 2 + 1.6 : xc + ow / 2 - 1.6;
      fill(S, rectPath(X(sx - 1.6), X(yTop + ow / 2), X(3.2), X(hh - ow / 2)), '#CBBDD6', { h: 130, alpha: 0.75 });
      S.x.restore(); S.hx.restore();
    }
    function goldCol(x, yTop, yBot, wd) { // ince altın sütun: başlık + kaide
      const p = rectPath(X(x - wd / 2), X(yTop), X(wd), X(yBot - yTop));
      fill(S, p, GOLD[4], { h: 175 });
      fill(S, rectPath(X(x - wd / 2), X(yTop), X(wd * 0.35), X(yBot - yTop)), GOLD[6], { h: 182, alpha: 0.8 });
      fill(S, rectPath(X(x + wd * 0.18), X(yTop), X(wd * 0.32), X(yBot - yTop)), GOLD[2], { h: 160, alpha: 0.8 });
      fill(S, rectPath(X(x - wd), X(yTop - 3), X(wd * 2), X(3.4)), GOLD[5], { h: 180 });
      fill(S, rectPath(X(x - wd * 0.9), X(yBot - 2.6), X(wd * 1.8), X(3)), GOLD[3], { h: 170 });
    }
    function archivolt(xc, yTop, ow) { // açıklığı çevreleyen altın kemer bandı
      arc(S, X(xc), X(yTop + ow / 2), X(ow / 2 + 3), Math.PI, TAU, X(5), GOLD[4]);
      arc(S, X(xc), X(yTop + ow / 2), X(ow / 2 + 4.6), Math.PI * 1.08, Math.PI * 1.55, X(1.6), GOLD[6], { alpha: 0.9 });
      fill(S, rectPath(X(xc - 3), X(yTop - 5.5), X(6), X(5)), GOLD[5], { h: 182 }); // kilit taşı
    }
    function cornice(x0, x1, yTopC, sw) {
      const ov = 7; const xa = x0 - ov, xb = x1 + ov;
      const p = rectPath(X(xa), X(yTopC), X(xb - xa), X(CH));
      S.rim(p, { w: 1.6, alpha: 0.6 });
      fill(S, p, GOLD[4], { h: 175 });
      field(S, { bbox: [X(xa), X(yTopC), X(xb), X(yTopC + CH)], clip: p, ramp: GOLD.slice(2, 7), shade: Paint.grad(0, X(yTopC), 0, X(yTopC + CH), 0.95, 0.25), dir: 0, dirJit: 0.03, len: [24, 50], wid: [3, 5], count: Math.round((xb - xa) / 8), noise: 0.06 });
      fill(S, rectPath(X(xa), X(yTopC), X(xb - xa), X(1.8)), GOLD[6], { h: 186 });
      fill(S, rectPath(X(xa + 2), X(yTopC + CH * 0.55), X(xb - xa - 4), X(1.4)), GOLD[2], { h: 150, alpha: 0.7 });
      fill(S, rectPath(X(xa + 2), X(yTopC + CH - 1.5), X(xb - xa - 4), X(1.6)), GOLD[1], { h: 130 });
      const xs = side > 0 ? xb : xa; const dy = sideDy(yTopC); const swc = sw + 4;
      fill(S, poly([[X(xs), X(yTopC)], [X(xs + side * swc), X(yTopC + dy)], [X(xs + side * swc), X(yTopC + dy + CH)], [X(xs), X(yTopC + CH)]]), GOLD[2], { h: 150 });
      fill(S, poly([[X(xs), X(yTopC)], [X(xs + side * swc), X(yTopC + dy)], [X(xs + side * swc), X(yTopC + dy + 1.8)], [X(xs), X(yTopC + 1.8)]]), GOLD[5], { h: 170 });
    }
    // korniş önünden sarkan yeşillik ve güller (asma bahçe)
    function drape(xa, xb, y) {
      for (let x = xa; x < xb; x += 4 + r() * 5) {
        const L2 = 6 + r() * 14; const c = r.pick(BUSH.slice(1, 5));
        leaf(S, X(x), X(y + L2 * 0.45), Math.PI / 2 + (r() - 0.5) * 0.6, L2, 5 + r() * 2, c, {});
      }
    }
    function storey(s) {
      const sw = sideW(s); const xs = side > 0 ? s.x1 : s.x0;
      const front = rectPath(X(s.x0), X(s.y0), X(s.w), X(s.h));
      const sideP = poly([[X(xs), X(s.y0)], [X(xs + side * sw), X(s.y0 + sideDy(s.y0))], [X(xs + side * sw), X(s.y1 + sideDy(s.y1))], [X(xs), X(s.y1)]]);
      const sil = new Path2D(); sil.addPath(front); sil.addPath(sideP);
      S.rim(sil, { w: 2.2, alpha: 0.85 });
      const ao = (y) => clamp(1 - (y - s.y0) / 22);
      bricks(sideP, [Math.min(xs, xs + side * sw) - 2, s.y0 - 24, Math.max(xs, xs + side * sw) + 2, s.y1 + 24], { dark: 1, ao });
      bricks(front, [s.x0, s.y0, s.x1, s.y1], { ao });
      // yan yüzde dar inci pencere
      { const xm = xs + side * sw * 0.5, t0 = s.y0 + s.h * 0.3, t1 = s.y1 - s.h * 0.14; const pp = poly([[X(xm - sw * 0.22), X(t0 + sideDy(t0) * 0.5)], [X(xm + sw * 0.22), X(t0 + sideDy(t0) * 0.5)], [X(xm + sw * 0.22), X(t1 + sideDy(t1) * 0.5)], [X(xm - sw * 0.22), X(t1 + sideDy(t1) * 0.5)]]); fill(S, pp, '#D8CCE0', { h: 140 }); }
      // kemer dizisi (revak): köşelerde tuğla payeler, aralarda ince altın sütunlar
      const pil = Math.max(12, s.w * 0.05); const ax0 = s.x0 + pil, ax1 = s.x1 - pil; const pitch = (ax1 - ax0) / s.n; const colW = Math.max(5, pitch * 0.09);
      const ow = pitch - colW - 4; const aTop = s.y0 + s.h * 0.2, aBot = s.y1 - 7;
      for (let q = 0; q < s.n; q++) { const xc = ax0 + pitch * (q + 0.5); pearlPanel(xc, aTop, ow, aBot); }
      for (let q = 0; q < s.n; q++) archivolt(ax0 + pitch * (q + 0.5), aTop, ow);
      for (let q = 0; q <= s.n; q++) goldCol(ax0 + pitch * q, aTop + ow / 2, aBot, colW);
      // alt korkuluk (ince altın parmaklık): oda hissi
      fill(S, rectPath(X(ax0 - 2), X(aBot - s.h * 0.15), X(ax1 - ax0 + 4), X(2.2)), GOLD[5], { h: 178, alpha: 0.95 });
      for (let x = ax0 + 3; x < ax1 - 2; x += 5.5) fill(S, rectPath(X(x), X(aBot - s.h * 0.15), X(1.4), X(s.h * 0.15)), GOLD[3], { h: 165, alpha: 0.75 });
      fill(S, rectPath(X(s.x0 - 2), X(s.y1 - 5), X(s.w + 4), X(5)), GOLD[3], { h: 168 }); // kaide bandı
      cornice(s.x0, s.x1, s.y0 - CH, sw);
    }
    // ---- çizim: kubbe → üst kat … alt kat (her katın çatı terasında güller) → teras
    const topS = st[st.length - 1];
    pearlDomeTop(S, X(cx), X(topS.y0 - CH + 1), X(cfg.dome), cfg.seed + 7);
    for (let i = st.length - 1; i >= 0; i--) {
      const s = st[i];
      storey(s);
      const yy = s.y0 - CH;
      if (i < st.length - 1) {
        const up = st[i + 1];
        const segs = [[s.x0 - 6, up.x0 - 2], [up.x1 + 2, s.x1 + 6]];
        for (const [a, b] of segs) {
          if (b - a < 8) continue;
          for (let x = a + 5; x < b - 3; x += 7 + r() * 7) roseBush(S, X(x), X(yy + 2), 13 + r() * 7, {});
          drape(a + 2, b - 2, yy + CH);
        }
        // üst katın önüne de alçak çiçek sırası
        for (let x = up.x0 + 4; x < up.x1 - 4; x += 9 + r() * 8) roseBush(S, X(x), X(yy + 2), 8 + r() * 4, { roses: 1 });
      } else {
        for (let x = s.x0 - 2; x < s.x1 + 2; x += 9 + r() * 8) if (Math.abs(x - cx) > cfg.dome * 0.95) roseBush(S, X(x), X(yy + 2), 10 + r() * 4, { roses: 1 });
      }
    }
    // ---- yükseltilmiş yeşil teras: ortada alçak geniş kemerli altın-gümüş duvar (su buradan çıkar),
    // iki yanda çimenli, güllü şevler; üst kenardan yeşillik sarkar
    const tx0 = TT.x0, tx1 = TT.x1, tt = TT.top, tb = H0; const wa = TT.wall[0], wb = TT.wall[1]; const lip = 16;
    const berm = (x0, x1, outer) => { // dış uca doğru alçalan şev
      const pts = []; for (let t = 0; t <= 1.0001; t += 0.1) { const x = lerp(x0, x1, t); const u = outer < 0 ? 1 - t : t; const y = tt + Math.pow(u, 2.2) * (tb - tt) * 0.62; pts.push([X(x), X(y)]); }
      pts.push([X(x1 + (outer > 0 ? 6 : 0)), X(tb)], [X(x0 - (outer < 0 ? 6 : 0)), X(tb)]); return poly(pts);
    };
    const bL = berm(tx0, wa + 4, -1), bR = berm(wb - 4, tx1, 1);
    const wallP = rectPath(X(wa), X(tt + lip - 2), X(wb - wa), X(tb - tt - lip + 4));
    const lipP = rectPath(X(wa - 2), X(tt), X(wb - wa + 4), X(lip));
    const tsil = new Path2D(); tsil.addPath(bL); tsil.addPath(bR); tsil.addPath(wallP); tsil.addPath(lipP);
    S.rim(tsil, { w: 2.4 });
    for (const bp of [bL, bR]) {
      fill(S, bp, '#2E9456', { h: 145 });
      field(S, { bbox: [X(tx0 - 10), X(tt - 4), X(tx1 + 10), X(tb + 2)], clip: bp, ramp: ['#14603F', '#1C7449', '#278A52', '#37A05B', '#4FB263', '#72C46A'], shade: (x, y) => clamp(0.8 - (y - X(tt)) / X(tb - tt) * 0.5 + (NOISE(x * 0.03, y * 0.03) - 0.5) * 0.3),
        dir: () => (r() - 0.5) * 0.6, len: [12, 24], wid: [5, 8], cover: 2.6, noise: 0.06 });
    }
    // duvar: iri altın-gümüş taşlar
    bricks(wallP, [wa, tt + lip - 2, wb, tb + 2], { bh: 10, bl: 22, ao: (y) => clamp(1 - (y - tt - lip) / 18) });
    for (const [axc, ahw, ah] of TT.arches) {
      const yTop = tb - ah, ow = ahw * 2;
      const vous = archPath(axc, yTop, ow, tb, 8);
      fill(S, vous, '#B98A4C', { h: 130 });
      const yc = yTop + ahw; const nV = Math.round(ahw * 0.3) * 2 + 1;
      for (let q = 0; q < nV; q++) {
        const a = Math.PI + (q + 0.5) / nV * Math.PI; const rr = ahw + 4;
        stroke(S, X(axc + Math.cos(a) * rr), X(yc + Math.sin(a) * rr), a, 7.4, Math.PI * rr / nV - 1.4, q % 2 ? '#E6E5EC' : '#EDCB76', { dry: 0 });
      }
      const op = archPath(axc, yTop, ow, tb + 1, 0);
      fill(S, op, '#1B4A57', { h: 120 });
      S.x.save(); S.hx.save(); S.x.clip(op); S.hx.clip(op);
      fill(S, rectPath(X(axc - ahw), X(yTop + ah * 0.34), X(ow), X(ah)), '#215C69', { h: 120 });
      for (let q = 0; q < Math.round(ahw / 4); q++) stroke(S, X(axc + (r() - 0.5) * ow * 0.8), X(yTop + ah * (0.22 + r() * 0.3)), (r() - 0.5) * 0.12, 12 + r() * 14, 1.8, r() < 0.5 ? '#4FA7AE' : '#3B8E98', { dry: 0.3 });
      const wTop = tb - ah * 0.42;
      fill(S, rectPath(X(axc - ahw), X(wTop), X(ow), X(tb - wTop + 2)), '#49B6BB', { h: 140 });
      for (let q = 0; q < Math.round(ahw * 1.1); q++) { const yy2 = wTop + r() * (tb - wTop); const u = (yy2 - wTop) / (tb - wTop); stroke(S, X(axc + (r() - 0.5) * ow * (0.6 + u * 0.4)), X(yy2), Math.PI / 2 + (r() - 0.5) * 0.25, 5 + u * 10, 1.8 + u * 2.4, r() < 0.45 ? '#E2F8F4' : r() < 0.65 ? '#9EE2DB' : '#2C97A6', { dry: 0.2 }); }
      fill(S, rectPath(X(axc - ahw), X(wTop - 1), X(ow), X(2)), '#C4F0E9', { h: 150, alpha: 0.9 });
      S.x.restore(); S.hx.restore();
    }
    // üst kenar çimi ve sarkan yeşillik
    fill(S, lipP, '#3FA35C', { h: 150 });
    field(S, { bbox: [X(wa - 4), X(tt - 2), X(wb + 4), X(tt + lip + 2)], clip: lipP, ramp: ['#2A8E55', '#3FA35C', '#5DB765', '#86CB72'], shade: Paint.grad(0, X(tt), 0, X(tt + lip), 0.9, 0.2), dir: 0, len: [14, 26], wid: [4, 6], cover: 2.4, noise: 0.15 });
    drape(wa, wb, tt + lip - 3);
    // teras üstü gül çiti (alt katın önünde) ve şevlerde çiçek kümeleri
    for (let x = tx0 + 10; x < tx1 - 8; x += 8 + r() * 8) { const inW = x > wa && x < wb; const yB = inW ? tt + 4 : tt + 4 + Math.pow(clamp(x < wa ? (wa - x) / (wa - tx0) : (x - wb) / (tx1 - wb)), 2.2) * (tb - tt) * 0.62; roseBush(S, X(x), X(yB), inW ? 12 + r() * 5 : 15 + r() * 7, {}); }
    for (const [x0, x1] of [[tx0 + 8, wa - 8], [wb + 8, tx1 - 8]]) for (let q = 0; q < 7; q++) { const x = lerp(x0, x1, r()); const u = x < wa ? (wa - x) / (wa - tx0) : (x - wb) / (tx1 - wb); const y = tt + Math.pow(u, 2.2) * (tb - tt) * 0.62 + 18 + r() * (tb - tt) * 0.4; if (y < tb - 6) roseBush(S, X(x), X(y), 13 + r() * 6, { color: r.pick(ROSE_COLS) }); }
    return { canvas: S.finish({ emboss: 0.5 }), px: X(cx), py: X(H0), k: K };
  }
  const KASR_SOL = { seed: 5401, K: 1.25, w: 560, h: 900, side: 1, vpY: 520, cornice: 13, dome: 78,
    terrace: { x0: 6, x1: 554, top: 800, wall: [96, 464], arches: [[160, 46, 58], [280, 60, 72], [400, 46, 58]] },
    storeys: [{ w: 420, h: 176, n: 5 }, { w: 330, h: 146, n: 4 }, { w: 246, h: 122, n: 3 }, { w: 168, h: 96, n: 2 }] };
  const KASR_SAG = { seed: 5402, K: 1.25, w: 500, h: 820, side: -1, vpY: 500, cornice: 12, dome: 66,
    terrace: { x0: 6, x1: 494, top: 728, wall: [96, 404], arches: [[144, 42, 54], [250, 56, 66], [356, 42, 54]] },
    storeys: [{ w: 372, h: 160, n: 4 }, { w: 288, h: 134, n: 3 }, { w: 212, h: 112, n: 3 }, { w: 142, h: 86, n: 2 }] };
  defSprite('kasr-sol', () => paintPalace(KASR_SOL));
  defSprite('kasr-sag', () => paintPalace(KASR_SAG));

  // ================================================================ 5. ORTA BAHÇE KUŞAĞI (güller, bağlar, meyve bahçeleri)
  const MID = { x: -200, y: 880, w: 1480, h: 660 };
  function paintMid() {
    const { w, h } = MID; const ox = MID.x, oy = MID.y;
    const S = Paint.sprite(w, h, { seed: 5505, k: 1 }); const r = S.r;
    const sx = (xw) => xw - ox, sy = (yw) => yw - oy;
    const outline = [[-200, 992], [-12, 992], [-10, 1076], [518, 1076], [521, 958], [582, 944], [586, 1006], [1076, 1006], [1076, 988], [1280, 988], [1280, 1540], [-200, 1540]];
    const region = poly(outline.map(([x, y]) => [sx(x), sy(y)]));
    const lawn = ['#1A6E47', '#23804F', '#2F9357', '#42A760', '#5CBA68', '#84CB72'];
    fill(S, region, lawn[2], { h: 140 });
    const persp = (yw) => 0.5 + clamp((yw - 950) / 560) * 0.85;
    field(S, { bbox: [0, 50, w, h], path: region, ramp: lawn, shade: (x, y) => clamp(0.56 + (NOISE(x * 0.005 + 2, y * 0.011) - 0.5) * 0.75 - clamp((y + oy - 1320) / 240) * 0.16), dir: () => (r() - 0.5) * 0.22,
      len: [24, 50], wid: [7, 12], size: (x, y) => persp(y + oy), cover: 2.4, noise: 0.05, broken: 0.06, max: 9000 });
    const items = [];
    const dry = (xw, yw, m) => waterGap(xw, yw) > m;
    const free = (xw, yw, hgt, m = 4) => dry(xw, yw, m) && dry(xw, yw - hgt * 0.5, 2) && dry(xw, yw - hgt, 0);
    const VP = [540, 800];
    // -- bağ sıraları (sol): kaybolma noktasına koşan sürekli asma çitleri, altında gölge, salkımlar
    const VINE = ['#0B4535', '#125A40', '#1C724A', '#2B8C53', '#45A65B', '#6FBE64'];
    function vineSeg(x, y, s, grape) {
      S.x.save(); S.x.globalAlpha = 0.35; S.x.fillStyle = '#0C4A36'; S.x.beginPath(); S.x.ellipse(x + 3 * s, y + 2 * s, 13 * s, 4 * s, 0, 0, TAU); S.x.fill(); S.x.restore();
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.4; const rad = 13 * s * (0.2 + r() * 0.8);
        const px = x + Math.cos(a) * rad, py = y - 13 * s + Math.sin(a) * rad * 0.75;
        const vi = clamp(Math.floor((1 - (py - (y - 28 * s)) / (28 * s)) * 4.8 + (r() - 0.5) * 1.2), 0, 5);
        leaf(S, px, py, a + (r() - 0.5), 12 * s + 3, 9 * s + 2, VINE[vi], {});
      }
      if (grape) {
        const gx = x + (r() - 0.5) * 6 * s, gy = y - 6 * s; const br = 1.6 + 1.6 * s;
        for (let row = 0; row < 4; row++) for (let c = 0; c < 4 - row; c++) fill(S, circ(gx + (c - (3 - row) / 2) * br * 1.7, gy + row * br * 1.45, br), ['#93AC34', '#B2C84E', '#CFDE7A', '#E6EDA8'][clamp(3 - row + (r() < 0.3 ? -1 : 0), 0, 3)], { h: 166 });
      }
    }
    for (const xb of [-360, -200, -50, 90, 220, 336]) {
      const sl = (1540 - VP[1]) / (xb - VP[0]); let n = 0;
      for (let yw = 1132; yw < 1545;) { const xw = VP[0] + (yw - VP[1]) / sl; const s = persp(yw); if (free(xw, yw, 30 * s, 5 + 5 * s)) { const g = n++ % 5 === 2; items.push([yw, ((a, b, c, d) => () => vineSeg(a, b, c, d))(sx(xw), sy(yw), s, g)]); } yw += 3 + 4.5 * s; }
    }
    // -- meyve bahçesi ağaçları (altın gövde, yuvarlak taç, meyve)
    function orchardTree(x, y, s, fruit) {
      S.x.save(); S.x.globalAlpha = 0.35; S.x.fillStyle = '#0C4A36'; S.x.beginPath(); S.x.ellipse(x + 4 * s, y + 2 * s, 26 * s, 6 * s, 0, 0, TAU); S.x.fill(); S.x.restore();
      const th = 24 * s; Paint.drawStroke(S, x, y - th / 2, Math.PI / 2, th, 5 * s + 1.5, GOLD[3], { dry: 0 });
      Paint.drawStroke(S, x - 1.2 * s, y - th / 2, Math.PI / 2, th * 0.9, 1.8 * s, GOLD[6], { dry: 0, height: false });
      const R = 25 * s; const tcx = x, tcy = y - th - R * 0.6;
      const crown = smoothPath(blobPts(tcx, tcy, R, R * 0.86, 18, 0.12, Math.floor(r() * 1e5)));
      S.rim(crown, { w: 1.6 * s + 0.6, alpha: 0.8 });
      fill(S, crown, '#1C7A4C', { h: 140 });
      field(S, { bbox: [tcx - R - 6, tcy - R - 6, tcx + R + 6, tcy + R + 6], mask: (px, py) => Math.hypot(px - tcx, (py - tcy) / 0.86) < R * 1.02, ramp: ['#0D4F3B', '#166645', '#22804E', '#33995A', '#56B163', '#86C86C'],
        shade: Paint.sphere(tcx - R * 0.2, tcy - R * 0.45, R * 1.2, [-0.3, -0.95], 0.1), dir: (px, py) => Math.atan2(py - tcy, px - tcx) + (r() - 0.5) * 0.8, len: [10, 18], wid: [5, 8], size: () => 0.6 + s * 0.5, cover: 3, leaf: true, noise: 0.06 });
      const nf = Math.round(5 + s * 5);
      for (let i = 0; i < nf; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.75; const fx = tcx + Math.cos(a) * d, fy = tcy + Math.sin(a) * d * 0.8 + R * 0.12; const fr = 2.2 + 2.8 * s; fill(S, circ(fx, fy, fr), fruit, { h: 170 }); fill(S, circ(fx - fr * 0.35, fy - fr * 0.35, fr * 0.35), shade(fruit, 0.25, 0.6), { h: 180 }); }
    }
    const FR = [RUBY[3], '#E3A93A', RUBY[2], '#E9C35A'];
    // sağ bölge: perspektif sıralı meyve bahçesi
    for (const xb of [700, 860, 1040, 1240]) { const sl = (1540 - VP[1]) / (xb - VP[0]); let n = 0; for (let yw = 1100; yw < 1545;) { const xw = VP[0] + (yw - VP[1]) / sl; const s = persp(yw) * 0.92; if (free(xw, yw, 70 * s, 8)) items.push([yw, ((a, b, c, f) => () => orchardTree(a, b, c, f))(sx(xw), sy(yw), s, FR[n++ % 4])]); yw += 46 + 70 * s; } }
    // iki köşk arası boşluk ve kenarlar
    [[536, 976, 0.44], [568, 970, 0.4], [552, 1000, 0.5], [1110, 1000, 0.6], [1180, 1016, 0.66], [1240, 1004, 0.6], [-70, 1006, 0.6], [-130, 1014, 0.66], [470, 1086, 0.56], [646, 1044, 0.56], [178, 1150, 0.72]]
      .forEach(([x, y, s], i) => { if (free(x, y, 70 * s, 4)) items.push([y, () => orchardTree(sx(x), sy(y), s, FR[i % 4])]); });
    // -- köşk teraslarının önünde gül çitleri (iri, sık)
    for (let x = -10; x < 518; x += 9 + r() * 6) if (dry(x, 1084, 2)) items.push([1083, ((xx) => () => roseBush(S, sx(xx), sy(1084 + r() * 3), 19 + r() * 8, {}))(x)]);
    for (let x = 588; x < 1074; x += 9 + r() * 6) if (dry(x, 1014, 2)) items.push([1013, ((xx) => () => roseBush(S, sx(xx), sy(1014 + r() * 3), 18 + r() * 7, {}))(x)]);
    // -- derelerin iki kıyısında sık gül sınırları
    for (const st of STREAMS) {
      const { P, N } = st; let acc = 0;
      for (let i = 4; i < P.length; i++) {
        acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc < 10) continue; acc = 0;
        for (const sgn of [1, -1]) {
          const d = P[i][2] / 2 + bankW(P[i][1]) + 9 + r() * 4;
          const xw = P[i][0] + N[i][0] * d * sgn, yw = P[i][1] + N[i][1] * d * sgn; const s = persp(yw); const hgt = 18 + s * 12;
          if (yw > 1530 || !free(xw, yw, hgt, 2)) continue;
          items.push([yw, () => roseBush(S, sx(xw), sy(yw), hgt * 0.85, {})]);
        }
      }
    }
    // -- alt sınır (ırmak katmanının zemin kenarı) boyunca çiçek bordürü
    for (let xw = -200; xw < 1280; xw += 11 + r() * 8) { const yw = 1470 + r() * 34; const s = persp(yw); if (free(xw, yw, 24 * s, 3)) items.push([yw, ((a, b, c) => () => roseBush(S, a, b, c, { roses: 1 + Math.floor(r() * 2) }))(sx(xw), sy(yw), 15 + 8 * s)]); }
    // -- çiçek öbekleri (dağınık konfeti yerine küçük kümeler)
    for (let i = 0; i < 70; i++) {
      const cxw = ox + r() * w, cyw = 1000 + r() * 520; const col = r.pick(['#FBF3F2', '#F5B5CC', '#F6CF62', '#E8687F', '#FFFFFF', '#CFC2EE']);
      const m = 4 + Math.floor(r() * 6); const s0 = persp(cyw);
      for (let q = 0; q < m; q++) {
        const xw = cxw + (r() - 0.5) * 40 * s0, yw = cyw + (r() - 0.5) * 14 * s0; if (!S.x.isPointInPath(region, sx(xw), sy(yw)) || !dry(xw, yw, 3)) continue;
        const s = persp(yw);
        items.push([yw, () => { if (s > 0.85 && r() < 0.4) wildRose(S, sx(xw), sy(yw), 3 + 2.6 * s, col); else { fill(S, circ(sx(xw), sy(yw), 1.6 + 2 * s), col, { h: 168 }); } }]);
      }
    }
    items.sort((a, b) => a[0] - b[0]);
    for (const [, f] of items) f();
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-orta', paintMid);

  // ================================================================ 6. IRMAK SİSTEMİ (yüzeyde akan, oyuksuz, kıyısı zeminle düz)
  const RIV = { x: -200, y: 1000, w: 1480, h: 1100 };
  const gTop = (xw) => 1478 + 10 * Math.sin(xw * 0.012 + 0.5) + 6 * Math.sin(xw * 0.033 + 2);
  function bankDome(S, x, y, R) { // kıyıdaki küçük oyuk inci kubbe (taban merkezi x,y): kürenin ~%60'ı görünür
    const r = S.r; const cy = y - R * 0.22; const a0 = Math.asin(clamp((y - cy) / R)); const hw = R * Math.cos(a0);
    S.x.save(); S.x.globalAlpha = 0.32; S.x.fillStyle = '#2E3A5E'; S.x.beginPath(); S.x.ellipse(x + R * 0.05, y + R * 0.03, hw * 1.12, R * 0.16, 0, 0, TAU); S.x.fill(); S.x.restore();
    const body = new Path2D(); body.arc(x, cy, R, a0, Math.PI - a0, true); body.closePath();
    S.rim(body, { w: 1 + R * 0.02, alpha: 0.45 });
    fill(S, body, '#E4DDEA', { h: 150 });
    const sph = Paint.sphere(x - R * 0.3, cy - R * 0.45, R * 1.15, [-0.4, -0.92], 0.12);
    field(S, { bbox: [x - R, cy - R, x + R, y], clip: body, ramp: ['#9C93BE', '#B5ACD0', '#CEC6E0', '#E2DCEA', '#F1ECF2', '#FBF8F8', '#FFFFFF'], shade: sph,
      dir: (px, py) => Math.atan2(py - cy, px - x) + Math.PI / 2 + (r() - 0.5) * 0.2, len: [R * 0.35, R * 0.7], wid: [Math.max(2.5, R * 0.09), Math.max(4, R * 0.15)], cover: 3.4, noise: 0.03,
      colorF: (px, py, ki, c) => { if (ki < 2 || ki > 5) return c; const u = ((px - x) * 0.55 + (py - cy) * 0.83) / R; return mix(c, ['#F7CDE0', '#C9EEDF', '#D6CCF4', '#F8E2C8'][(Math.floor((u + 1.5) * 2.3) + 8) % 4], 0.55); } });
    if (R > 20) { // içten ılık ışıyan alçak kemerli kapı (oyuk inci)
      const dw = R * 0.32, dh = R * 0.46, dx = x + R * 0.1; const dp = new Path2D();
      dp.moveTo(dx - dw / 2, y); dp.lineTo(dx - dw / 2, y - dh + dw / 2); dp.arc(dx, y - dh + dw / 2, dw / 2, Math.PI, 0); dp.lineTo(dx + dw / 2, y); dp.closePath();
      fill(S, dp, '#F4DCCF', { h: 140 }); fill(S, rectPath(dx - dw / 2, y - dh * 0.55, dw * 0.32, dh * 0.55), '#DEC5D2', { h: 135, alpha: 0.75 });
    }
    arc(S, x, cy, R * 0.94, Math.PI * 0.02 + a0 * 0.5, Math.PI * 0.42, R * 0.08, '#A79DC8', { alpha: 0.7 }); // serin yan yansıma
    arc(S, x - R * 0.06, cy - R * 0.08, R * 0.64, Math.PI * 1.1, Math.PI * 1.45, R * 0.13, '#FFFFFF', { alpha: 0.9 });
    fill(S, circ(x - R * 0.42, cy - R * 0.5, R * 0.07), '#FFFFFF', { h: 186 });
  }
  function paintRiver() {
    const { w, h } = RIV; const ox = RIV.x, oy = RIV.y;
    const S = Paint.sprite(w, h, { seed: 5606, k: 1 }); const r = S.r;
    const sx = (xw) => xw - ox, sy = (yw) => yw - oy;
    const persp = (yw) => 0.5 + clamp((yw - 1050) / 850) * 1.15;
    // -- 1. ön zemin: serin, uzayan gölgede çimen (ağaç taçlarının gölgesi)
    const gp = new Path2D(); gp.moveTo(-10, h + 10); for (let x = -10; x <= w + 10; x += 10) gp.lineTo(x, sy(gTop(x + ox))); gp.lineTo(w + 10, h + 10); gp.closePath();
    S.rim(gp, { w: 2, alpha: 0.5 });
    const grass = ['#0A3A3B', '#0E4A44', '#135B49', '#1A6D4F', '#248054', '#329459', '#47A75F', '#66B966'];
    fill(S, gp, grass[3], { h: 140 });
    const shadeG = (x, y) => { const xw = x + ox, yw = y + oy; const edge = Math.min(Math.abs(xw), Math.abs(xw - 1080)); return clamp(0.5 - clamp((yw - 1500) / 480) * 0.3 - clamp(1 - edge / 380) * 0.14 + (NOISE(x * 0.004 + 7, y * 0.006) - 0.5) * 0.5); };
    field(S, { bbox: [-10, sy(1450), w + 10, h + 10], path: gp, ramp: grass, shade: shadeG, dir: () => (r() - 0.5) * 0.35, len: [26, 56], wid: [8, 14], size: (x, y) => persp(y + oy), cover: 2.3, noise: 0.05, broken: 0.07, max: 7000 });
    for (let x = -10; x < w + 10; x += 5 + r() * 6) { const yy = sy(gTop(x + ox)) + 2; Paint.drawStroke(S, x, yy - 5, -Math.PI / 2 + (r() - 0.5) * 0.6, 11 + r() * 9, 3 + r() * 2, r.pick(grass.slice(3, 7)), { dry: 0.5 }); }
    // zeminde yaban gülleri ve çiçek noktaları (gölgede, sakin)
    for (let i = 0; i < 260; i++) {
      const xw = ox + r() * w, yw = 1490 + r() * 600; if (waterGap(xw, yw) < 6) continue;
      const s = persp(yw); const col = r.pick(['#F3E9EE', '#E9A6C0', '#E8C25C', '#D9637B', '#C9BEE6']);
      if (r() < 0.22) wildRose(S, sx(xw), sy(yw), 4 + 5 * s, shade(col, -0.06)); else fill(S, circ(sx(xw), sy(yw), 1.5 + 2 * s), shade(col, -0.08), { h: 166 });
    }
    // -- 2. kıyılar: zeminle aynı düzlemde altın ve inci şeritler
    const GB = ['#BB9241', '#CFA954', '#E0BE6D', '#EDD38F', '#F7E6B8'], PB = ['#ABA4C4', '#C4BDD6', '#D9D3E2', '#E9E5ED', '#F8F5F5'];
    const bankShade = (x, y) => clamp(0.7 - clamp((y + oy - 1520) / 520) * 0.34 + (NOISE(x * 0.02, y * 0.02) - 0.5) * 0.3);
    for (const st of STREAMS) for (const side of [0, 1]) {
      const bp = bankPath(st, side, ox, oy); const kind = st.banks[side];
      const bb = bboxOf(st.P.map((p) => [p[0] - ox, p[1] - oy, p[2] + 2 * bankW(p[1]) + 12]), 4);
      fill(S, bp, kind === 'gold' ? GB[2] : PB[2], { h: 150 });
      field(S, { bbox: bb, path: bp, clip: bp, ramp: kind === 'gold' ? GB : PB, shade: bankShade, dir: (x, y) => { const f = flowDir(x + ox, y + oy); return Math.atan2(f[1], f[0]) + (r() - 0.5) * 0.3; }, len: [12, 30], wid: [4, 8], size: (x, y) => persp(y + oy), cover: 2.4, noise: 0.08,
        colorF: kind === 'pearl' ? (x, y, ki, c) => (ki >= 2 && r() < 0.45 ? mix(c, r.pick(NACRE), 0.5) : c) : (x, y, ki, c) => (ki >= 3 && r() < 0.12 ? '#FFF6D6' : c) });
      // altın kıyıda küçük altın/yakut taneler, inci kıyıda inci taneler
      S.x.save(); S.x.clip(bp);
      for (let i = 0; i < 60; i++) { const q = Math.floor(r() * st.P.length); const p = st.P[q], n = st.N[q]; const sg = side === 0 ? 1 : -1; const d = p[2] / 2 + bankW(p[1]) * (0.2 + r() * 0.7) * fanK(st, q); const xw = p[0] + n[0] * d * sg, yw = p[1] + n[1] * d * sg; const pr = (1.2 + r() * 1.6) * persp(yw); S.x.fillStyle = kind === 'gold' ? r.pick(['#F7E3A4', '#FFF6D8', '#F7E3A4', '#C23048']) : r.pick(['#FFFFFF', '#F6DCE7', '#D8F1E8']); S.x.beginPath(); S.x.ellipse(sx(xw), sy(yw), pr, pr * 0.7, 0, 0, TAU); S.x.fill(); }
      S.x.restore();
    }
    // -- 3. su: yatak (sığda açık, derinde turkuaz) → inci ve yakut çakıllar → saydam katlar → yüzey ışıltısı
    const wp = waterPath(ox, oy);
    const dep = (x, y) => depthAt(x + ox, y + oy);
    const fdir = (x, y) => { const f = flowDir(x + ox, y + oy); return Math.atan2(f[1], f[0]); };
    const shadeW = (y) => clamp((y + oy - 1560) / 500) * 0.16; // önde ağaç gölgesi
    S.rim(wp, { w: 1.4, alpha: 0.5, color: '#2E7E86' });
    fill(S, wp, '#7FD0CC', { h: 135 });
    const wbb = [sx(-20), sy(990), sx(1100), h + 10];
    // derinliğe göre basamaklı bantlar (kıyıya paralel), akış yönünde kısa geniş darbeler
    const BED = ['#1F7D92', '#2A92A3', '#3CA8B2', '#5BBDBF', '#82D0CC', '#ABE1DA', '#D1F1EA'];
    field(S, { bbox: wbb, path: wp, ramp: BED, shade: (x, y) => clamp(0.98 - Math.pow(dep(x, y), 0.8) * 0.82 - shadeW(y)), dir: (x, y) => fdir(x, y) + (r() - 0.5) * 0.14, len: [22, 46], wid: [8, 13], size: (x, y) => persp(y + oy), cover: 2.6, noise: 0.03, broken: 0.04, jitter: 6, jitterFreq: 0.02 });
    // çakıllar: sığda net, derinde suyun rengine karışır
    S.x.save(); S.hx.save(); S.x.clip(wp); S.hx.clip(wp);
    for (let i = 0; i < 1500; i++) {
      const x = wbb[0] + r() * (wbb[2] - wbb[0]), y = wbb[1] + r() * (wbb[3] - wbb[1]);
      const d = dep(x, y); if (d <= 0.02 || r() < d * 0.7) continue;
      const s = persp(y + oy); const pr = (1.6 + Math.pow(r(), 1.6) * 4) * s;
      const kind = r(); const wc = mix('#B3E6DF', '#2D97A7', d);
      let c0, c1, c2;
      if (kind < 0.7) { c0 = '#F3EEF3'; c1 = '#B9AED0'; c2 = '#FFFFFF'; } else if (kind < 0.88) { c0 = '#B81E36'; c1 = '#6E1020'; c2 = '#F58E98'; } else { c0 = '#E8C35A'; c1 = '#9C6A1C'; c2 = '#FFF0B8'; }
      const t = 0.12 + d * 0.62; const ang = r() * Math.PI;
      S.x.save(); S.x.translate(x, y); S.x.rotate(ang);
      S.x.fillStyle = mix(c1, wc, t); S.x.beginPath(); S.x.ellipse(pr * 0.12, pr * 0.16, pr, pr * 0.7, 0, 0, TAU); S.x.fill();
      S.x.fillStyle = mix(c0, wc, t); S.x.beginPath(); S.x.ellipse(0, 0, pr * 0.9, pr * 0.62, 0, 0, TAU); S.x.fill();
      S.x.fillStyle = mix(c2, wc, t * 0.5); S.x.beginPath(); S.x.ellipse(-pr * 0.3, -pr * 0.22, pr * 0.3, pr * 0.19, 0, 0, TAU); S.x.fill();
      S.x.restore();
      S.hx.save(); S.hx.fillStyle = 'rgb(168,168,168)'; S.hx.beginPath(); S.hx.ellipse(x, y, pr, pr * 0.7, ang, 0, TAU); S.hx.fill(); S.hx.restore();
    }
    S.x.restore(); S.hx.restore();
    // saydam turkuaz örtü: derinde daha yoğun (çakıllar suyun altında kalır)
    field(S, { bbox: wbb, path: wp, clip: wp, ramp: ['#1E7A90', '#2B93A4', '#41AAB3', '#66C2C2'], shade: (x, y) => clamp(0.95 - dep(x, y) * 0.9 - shadeW(y)), dir: (x, y) => fdir(x, y) + (r() - 0.5) * 0.1, len: [30, 60], wid: [8, 13], size: (x, y) => persp(y + oy),
      cover: 1.1, noise: 0.05, alphaF: (x, y) => { const d = dep(x, y); return d < 0.25 ? 0 : 0.12 + (d - 0.25) * 0.5; }, height: false, dry: 0.35 });
    // yüzey: akış yönünde kısa, gruplu ışıltı darbeleri; kıyılardan altın ve inci yansımaları
    S.x.save(); S.hx.save(); S.x.clip(wp); S.hx.clip(wp);
    for (let g = 0; g < 75; g++) {
      const x = wbb[0] + r() * (wbb[2] - wbb[0]), y = wbb[1] + r() * (wbb[3] - wbb[1]); const d = dep(x, y); if (d <= 0.12) continue;
      const a = fdir(x, y); const s = persp(y + oy); const m = 2 + Math.floor(r() * 3); const n = [-Math.sin(a), Math.cos(a)];
      for (let q = 0; q < m; q++) { const o = (q - m / 2) * 6 * s, t = (r() - 0.5) * 20 * s; Paint.drawStroke(S, x + n[0] * o + Math.cos(a) * t, y + n[1] * o + Math.sin(a) * t, a + (r() - 0.5) * 0.06, (22 + r() * 30) * s, (1.8 + r() * 1.6) * s, r() < 0.6 ? '#EAFCF8' : '#BDEDE6', { dry: 0.55, alpha: 0.7 }); }
    }
    for (const st of STREAMS) for (const sd of [0, 1]) {
      const kind = st.banks[sd]; const col = kind === 'gold' ? '#F2D88E' : '#EADFF2';
      for (let i = 3; i < st.P.length; i += 2) {
        if (r() < 0.45) continue; const p = st.P[i], n = st.N[i], t = st.T[i]; const sg = sd === 0 ? 1 : -1; const o = (p[2] / 2) * (0.62 + r() * 0.22) * sg;
        const xw = p[0] + n[0] * o, yw = p[1] + n[1] * o; const s = persp(yw);
        Paint.drawStroke(S, sx(xw), sy(yw), Math.atan2(t[1], t[0]) + (r() - 0.5) * 0.06, (14 + r() * 22) * s, (2 + r() * 2) * s, col, { dry: 0.4, alpha: 0.55 });
      }
    }
    S.x.restore(); S.hx.restore();
    // ıslak kenar: ince ışıklı menisküs (kıyı ile su aynı düzlemde, set yok)
    for (const st of STREAMS) for (const sd of [1, -1]) {
      for (let i = 2; i < st.P.length - 1; i++) {
        if (r() < 0.3) continue;
        const o = sd > 0 ? waterA(st)(i) : waterB(st)(i); const p = st.P[i], n = st.N[i], t = st.T[i];
        const xw = p[0] + n[0] * (o - sd * 2.2), yw = p[1] + n[1] * (o - sd * 2.2); if (depthAt(xw, yw) > 0.3) continue;
        Paint.drawStroke(S, sx(xw), sy(yw), Math.atan2(t[1], t[0]), (10 + r() * 14) * persp(yw), (1.4 + r() * 0.8) * persp(yw) * 0.8, r() < 0.7 ? '#F4FFFC' : '#A8E2DC', { dry: 0.3, alpha: 0.8 });
      }
    }
    // -- 4. kıyılarda oyuk inci kubbecikler
    const M = STREAMS.find((s) => s.id === 'M');
    const atM = (t, side, kR = 1) => { const i = Math.round(t * (M.P.length - 1)); const p = M.P[i], n = M.N[i]; const sgn = side === 0 ? 1 : -1; const bw = bankW(p[1]); const R = (12 + Math.max(0, p[1] - 1050) * 0.062) * kR; const d = p[2] / 2 + bw * 0.55 + R * 0.6; return [p[0] + n[0] * d * sgn, p[1] + n[1] * d * sgn, R]; };
    const domes = [];
    [[0.06, 1, 0.8], [0.46, 1, 0.9], [0.66, 1, 1.0], [0.705, 1, 0.55], [0.9, 1, 1.0], [0.55, 0, 0.85], [0.77, 0, 1.0]].forEach(([t, sd, kR]) => domes.push(atM(t, sd, kR)));
    const atS = (id, t, side, R) => { const st = STREAMS.find((s) => s.id === id); const i = Math.round(t * (st.P.length - 1)); const p = st.P[i], n = st.N[i]; const sgn = side === 0 ? 1 : -1; const d = p[2] / 2 + bankW(p[1]) * 0.55 + R * 0.7; return [p[0] + n[0] * d * sgn, p[1] + n[1] * d * sgn, R]; };
    domes.push(atS('L', 0.56, 0, 13), atS('R', 0.6, 1, 13));
    domes.sort((a, b) => a[1] - b[1]);
    for (const [xw, yw, R] of domes) if (yw < 1310 || yw > 1460) bankDome(S, sx(xw), sy(yw), R);
    // -- 5. kıyı dışında küçük gül tutamları (ön planda)
    for (const st of STREAMS) {
      const { P, N } = st;
      for (let i = 8; i < P.length; i += 3) {
        if (r() < 0.4) continue;
        const sgn = r() < 0.5 ? 1 : -1; const bw = bankW(P[i][1]); const d = P[i][2] / 2 + bw + 5 + r() * 12;
        const xw = P[i][0] + N[i][0] * d * sgn, yw = P[i][1] + N[i][1] * d * sgn;
        if (yw < gTop(xw) + 6 || waterGap(xw, yw) < 2 || domes.some(([dx, dy, R]) => Math.hypot(dx - xw, dy - yw) < R * 1.5)) continue;
        roseBush(S, sx(xw), sy(yw), 8 + 10 * persp(yw), { roses: 1 + Math.floor(r() * 2), lift: -0.8 });
      }
    }
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-irmak', paintRiver);

  // ================================================================ 7. ÇERÇEVE AĞAÇLARI (altın gövde, zümrüt taç, alçak sarkan meyve)
  function paintPom(S, x, y, R, tilt = 0) { // sarkık nar: taç aşağıda
    const r = S.r;
    const body = smoothPath(blobPts(x, y, R, R * 0.95, 24, 0.035, Math.floor(r() * 1e5)));
    S.rim(body, { w: 1.8 });
    fill(S, body, RUBY[2], { h: 150 });
    const cxw = x + Math.sin(tilt) * R, cyw = y + Math.cos(tilt) * R;
    field(S, { bbox: [x - R, y - R, x + R, y + R], clip: body, ramp: RUBY, shade: Paint.sphere(x - R * 0.3, y - R * 0.38, R * 1.12, [-0.45, -0.89], 0.12), dir: (px, py) => Math.atan2(py - cyw, px - cxw) + Math.PI / 2 + (r() - 0.5) * 0.3, len: [R * 0.5, R * 0.9], wid: [4, 7], cover: 3.4, noise: 0.04 });
    // taç (kaliks): altta, 6 kısa dişli
    const ct = [x + Math.sin(tilt) * R * 0.86, y + Math.cos(tilt) * R * 0.86]; const cw = R * 0.34;
    const cr = new Path2D(); const ux = Math.cos(tilt), uy = -Math.sin(tilt), vx = Math.sin(tilt), vy = Math.cos(tilt);
    const P = (a, b) => [ct[0] + ux * a + vx * b, ct[1] + uy * a + vy * b];
    cr.moveTo(...P(-cw, -R * 0.06));
    for (let i = 0; i <= 6; i++) { const a = -cw + (i / 6) * cw * 2; const tip = i % 2 === 0; cr.lineTo(...P(a * (tip ? 1.12 : 0.9), tip ? R * 0.34 : R * 0.16)); }
    cr.lineTo(...P(cw, -R * 0.06)); cr.closePath();
    S.rim(cr, { w: 1.2, alpha: 0.7 });
    fill(S, cr, '#8E1A2C', { h: 155 });
    fill(S, poly([P(-cw * 0.5, R * 0.05), P(cw * 0.5, R * 0.05), P(cw * 0.4, R * 0.16), P(-cw * 0.4, R * 0.16)]), '#4E0A16', { h: 140 });
    fill(S, circ(x - R * 0.36, y - R * 0.42, R * 0.17), '#F8B2B2', { h: 180 });
    fill(S, circ(x - R * 0.46, y - R * 0.5, R * 0.07), '#FFF0EE', { h: 186 });
  }
  function paintGrapes(S, x, y, s, cols) {
    const r = S.r; const berry = 7.5 * s; const rows = 7;
    const list = [];
    for (let row = 0; row < rows; row++) { const n = Math.max(1, Math.round(4.6 - row * 0.6)); for (let c = 0; c < n; c++) list.push([x + (c - (n - 1) / 2) * berry * 1.5 + (r() - 0.5) * berry * 0.4 + Math.sin(row * 0.8) * berry * 0.3, y + row * berry * 1.28 + (r() - 0.5) * 2, row]); }
    Paint.drawStroke(S, x, y - berry * 1.4, Math.PI / 2, berry * 2.6, 2.6, '#6B5A1C', { dry: 0 });
    for (const [bx, by, row] of list) {
      const t = row / rows; const c0 = cols[clamp(Math.round(2.4 + (r() - 0.5) * 1.6 - t * 0.8), 0, cols.length - 1)];
      S.rim(circ(bx, by, berry), { w: 1, alpha: 0.5 });
      fill(S, circ(bx, by, berry), shade(c0, -0.08), { h: 160 });
      fill(S, circ(bx - berry * 0.12, by - berry * 0.14, berry * 0.78), c0, { h: 165 });
      fill(S, circ(bx - berry * 0.34, by - berry * 0.36, berry * 0.24), '#FCFBE6', { h: 185 });
    }
  }
  function grapeLeaf(S, x, y, R, ang, col) { // beş loblu asma yaprağı
    const p = new Path2D(); const n = 5;
    for (let i = 0; i <= n * 2; i++) { const a = ang - Math.PI * 0.9 + (i / (n * 2)) * Math.PI * 1.8; const rr = i % 2 ? R * 0.62 : R * (i === n ? 1.05 : 0.92); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? p.lineTo(px, py) : p.moveTo(px, py); }
    p.lineTo(x, y); p.closePath();
    S.rim(p, { w: 1.2, alpha: 0.6 });
    fill(S, p, col, { h: 155 });
    for (let i = 0; i < 5; i++) { const a = ang - Math.PI * 0.72 + i * Math.PI * 0.36; Paint.drawStroke(S, x + Math.cos(a) * R * 0.38, y + Math.sin(a) * R * 0.38, a, R * 0.7, 1.4, shade(col, -0.14), { dry: 0.3, height: false }); }
    Paint.drawStroke(S, x + Math.cos(ang - 0.6) * R * 0.4, y + Math.sin(ang - 0.6) * R * 0.4, ang, R * 0.6, R * 0.22, shade(col, 0.1, 0.85), { dry: 0.4, alpha: 0.7 });
  }
  function paintDates(S, x, y, s) { // altın hurma salkımı
    const r = S.r; const n = 10;
    Paint.drawStroke(S, x, y + 12 * s, Math.PI / 2 + 0.08, 34 * s, 6 * s, '#C67C1E', { dry: 0 });
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.13; const L = (66 + r() * 34) * s; const x0 = x + Math.cos(a) * 22 * s, y0 = y + 26 * s;
      const pts = []; for (let q = 0; q <= 6; q++) { const t = q / 6; pts.push([x0 + Math.cos(a) * L * t + Math.sin(t * 3 + i) * 3 * s, y0 + Math.sin(a) * L * t]); }
      S.line(pts, 2.2 * s, '#B8701C', { w1: 1.5 * s, edge: false });
      for (let q = 1; q <= 6; q++) {
        const [fx, fy] = pts[q]; const sd = q % 2 ? 1 : -1; const c = r.pick(['#E3A12E', '#D88A22', '#EDB848', '#C9741C']);
        const ex = fx + sd * 5 * s, ey = fy + 2 * s;
        S.x.save(); S.x.translate(ex, ey); S.x.rotate(sd * 0.32); S.x.fillStyle = shade(c, -0.14); S.x.beginPath(); S.x.ellipse(0.8, 1, 4.8 * s, 7.6 * s, 0, 0, TAU); S.x.fill();
        S.x.fillStyle = c; S.x.beginPath(); S.x.ellipse(0, 0, 4.3 * s, 7 * s, 0, 0, TAU); S.x.fill(); S.x.fillStyle = '#FFE9A8'; S.x.beginPath(); S.x.ellipse(-1.4 * s, -2.2 * s, 1.2 * s, 2.3 * s, 0, 0, TAU); S.x.fill(); S.x.restore();
        S.hx.save(); S.hx.fillStyle = 'rgb(168,168,168)'; S.hx.beginPath(); S.hx.ellipse(ex, ey, 4.5 * s, 7.3 * s, 0, 0, TAU); S.hx.fill(); S.hx.restore();
      }
    }
  }
  function paintTree(cfgT) {
    const OY = 220; // tepe silüeti için yukarı pay: kamera yükselirken tacın üstü doğal görünür
    const w = 900, h = 2080 + OY; const mir = cfgT.mirror;
    const S = Paint.sprite(w, h, { seed: cfgT.seed, k: 1 }); const r = S.r;
    const BX = 200; // gövde tabanı (sol ağaç tasarım x); dünya = tasarım + (−240, −130), sağ ağaç aynalanır
    const MX = (x) => (mir ? w - x : x);
    const M = (pts) => pts.map(([x, y, ww]) => [MX(x), y + OY, ww]);
    const LIT = [mir ? -0.5 : 0.5, -0.86]; // gövdenin açık manzaraya bakan yüzü aydınlık (kaynaksız ortam ışığı)
    const G2 = ['#5A3207', '#7C480C', '#A26614', '#C68A22', '#DFAE3A', '#EFCB62', '#F9E39A', '#FFF5D2'];
    // metal parıltılı kesit: gölge kenarı koyu, aydınlık tarafa yakın parlak şerit, kenarda hafif düşüş
    const PROF = [[-1, 0.1], [-0.6, 0.28], [-0.1, 0.46], [0.3, 0.66], [0.55, 0.9], [0.72, 0.97], [0.9, 0.74], [1, 0.52]];
    const prof = (u) => { for (let i = 0; i < PROF.length - 1; i++) if (u <= PROF[i + 1][0]) return lerp(PROF[i][1], PROF[i + 1][1], (u - PROF[i][0]) / (PROF[i + 1][0] - PROF[i][0])); return 0.5; };
    const low = cfgT.low;
    const lowY = (x) => { for (let i = 0; i < low.length - 1; i++) if (x >= low[i][0] && x <= low[i + 1][0]) return lerp(low[i][1], low[i + 1][1], (x - low[i][0]) / (low[i + 1][0] - low[i][0])); return x < low[0][0] ? low[0][1] : low[low.length - 1][1]; };
    const trunk = cfgT.trunk || [[BX, 2112, 176], [244, 1880, 146], [322, 1630, 124], [384, 1380, 108], [404, 1180, 98], [394, 1010, 88], [374, 880, 80], [362, 780, 74]];
    const topY = (x) => -200 + 70 * Math.pow((x - 260) / 700, 2) + 18 * Math.sin(x * 0.021 + cfgT.seed) + 10 * Math.sin(x * 0.053);
    const holes = cfgT.holes || [];
    const roots = [[[BX + 24, 2052, 54], [BX + 104, 2082, 30], [BX + 186, 2098, 14]], [[BX - 30, 2052, 46], [BX - 110, 2086, 24]]];
    const boughs = [
      [[362, 800, 70], [366, 650, 56], [384, 510, 46], [430, 390, 38], [540, 300, 30], [680, 236, 24], [820, 204, 18], [960, 190, 14]],
      [[352, 860, 56], [300, 690, 46], [244, 480, 38], [160, 240, 28], [70, 0, 22], [20, -60, 18]],
      [[380, 980, 44], [280, 940, 32], [160, 930, 24], [40, 950, 18], [-40, 980, 14]],
      [[436, 380, 22], [560, 350, 16], [700, 340, 12]],
      [[244, 480, 24], [330, 330, 18], [430, 200, 14], [540, 100, 11]],
    ];
    boughs.slice(2).forEach((b, i) => tube(S, M(b), G2, { len: [24, 50], wid: [5, 9], nz: i * 3 + 1, lit: LIT, prof }));
    tube(S, M(boughs[1]), G2, { len: [30, 64], wid: [6, 11], nz: 11, lit: LIT, prof });
    tube(S, M(boughs[0]), G2, { len: [30, 64], wid: [6, 11], nz: 13, lit: LIT, prof });
    roots.forEach((rt, i) => tube(S, M(rt), G2, { len: [24, 50], wid: [6, 10], nz: 21 + i, lit: LIT, prof }));
    tube(S, M(trunk), G2, { len: [44, 96], wid: [8, 13], nz: 17, lit: LIT, cover: 3.0, prof, shadeY: (y) => -clamp((y - 1500) / 600) * 0.12 });
    // kabuk: koyu kehribar oluklar, açık altın şeritler, birkaç budak
    const TP = crSample(M(trunk), 8); const TT = tangents(TP);
    for (let i = 0; i < 120; i++) {
      const q = Math.floor(r() * (TP.length - 3)) + 1; const p = TP[q], t = TT[q]; const n = [-t[1], t[0]]; const off = (r() - 0.5) * p[2] * 0.8;
      const lit = (n[0] * LIT[0] + n[1] * LIT[1]) * Math.sign(off) > 0; const edge = Math.abs(off) / (p[2] * 0.4);
      const c = lit ? (edge < 0.75 ? r.pick(['#FFF3C4', '#FBE7A0']) : '#E8C25A') : r.pick(['#5A3809', '#7A4E10', '#94661A']);
      Paint.drawStroke(S, p[0] + n[0] * off, p[1] + n[1] * off, Math.atan2(t[1], t[0]) + (r() - 0.5) * 0.05, 24 + r() * 60, 2.4 + r() * 3, c, { dry: 0.4, alpha: 0.8 });
    }
    // kabuk yarıkları: koyu ince yarık + yanında açık boya sırtı (dikey, kısa-orta)
    for (let i = 0; i < 70; i++) {
      const q = Math.floor(r() * (TP.length - 3)) + 1; const p = TP[q], t = TT[q]; const n = [-t[1], t[0]]; const off = (r() - 0.5) * p[2] * 0.72;
      const xx = p[0] + n[0] * off, yy = p[1] + n[1] * off; const L2 = 30 + r() * 70; const a2 = Math.atan2(t[1], t[0]) + (r() - 0.5) * 0.06;
      const side = (n[0] * LIT[0] + n[1] * LIT[1]) > 0 ? 1 : -1;
      Paint.drawStroke(S, xx, yy, a2, L2, 2.2 + r() * 1.4, '#5E3608', { dry: 0.3, alpha: 0.8 });
      Paint.drawStroke(S, xx + n[0] * side * 3.2, yy + n[1] * side * 3.2, a2, L2 * 0.8, 1.6 + r(), '#FFF0C0', { dry: 0.4, alpha: 0.7 });
    }
    for (const [ky, ko] of [[1300, 0.18], [1060, -0.2], [1660, 0.05]]) { const q = TP.findIndex((p) => p[1] < ky + OY); const p = TP[q], t = TT[q]; const n = [-t[1], t[0]]; const kx = p[0] + n[0] * p[2] * ko, kyy = p[1] + n[1] * p[2] * ko; fill(S, ellipsePath(kx, kyy, 9, 13), '#74480F', { h: 130 }); arc(S, kx, kyy, 10, Math.PI * 1.1, Math.PI * 1.9, 3, '#F6DC8A'); }
    // ---- taç: profilin üstünü dolduran kümeler (arka → ön); alt kenar köşk kubbelerinin üstünde
    const clumps = [];
    const inHole = (x, y, R) => holes.some(([hx, hy, hr]) => Math.hypot(x - hx, y - hy) < hr + R * 0.85);
    for (let gx = -40; gx < 980; gx += 88) for (let gy = -280; gy < 1000; gy += 88) { const x = gx + (r() - 0.5) * 56, y = gy + (r() - 0.5) * 56; const R = 78 + r() * 50; if (y > lowY(x) - 70 || y < topY(x) + R * 0.6 || inHole(x, y, R)) continue; clumps.push([x, y, R, 0]); }
    // tepe silüeti: üst kenarda yuvarlak kümeler
    for (let x = -40; x < 980; x += 52 + r() * 30) { const R = 56 + r() * 30; const y = topY(x) + R * 0.75; if (!inHole(x, y, R)) clumps.push([x, y, R, 1]); }
    for (let x = -50; x < 960; x += 40 + r() * 30) { const ly = lowY(x); const R = (ly > 600 ? 62 : 52) + r() * 26; if (!inHole(x, ly - R * 0.66, R * 0.6)) clumps.push([x + (r() - 0.5) * 16, ly - R * 0.66, R, 1]); }
    for (let x = -30; x < 950; x += 64 + r() * 46) { const ly = lowY(x); const R = (ly > 600 ? 50 : 42) + r() * 18; clumps.push([x, ly - R * 0.42 + r() * 8, R, 2]); }
    for (const c of clumps) c[1] += OY; // tasarım → sprite
    const can = new Path2D(); for (const [x, y, R] of clumps) can.addPath(smoothPath(blobPts(MX(x), y, R * 0.92, R * 0.86, 18, 0.1, Math.floor(x * 3 + y))));
    S.rim(can, { w: 3 });
    fill(S, can, '#073A30', { h: 130 });
    field(S, { bbox: [0, 0, w, 1000 + OY], path: can, ramp: LEAF.slice(0, 4), shade: (px, py) => clamp(0.6 - clamp((py - OY - 300) / 500) * 0.4 + (NOISE(px * 0.01, py * 0.01) - 0.5) * 0.4), dir: () => r() * TAU, len: [24, 38], wid: [10, 15], cover: 0.9, leaf: true, noise: 0.05, max: 2600 });
    for (const pass of [0, 1, 2]) {
      const list = clumps.filter((c) => c[3] === pass).sort((a, b) => a[1] - b[1]);
      for (const [x0, y, R] of list) {
        const x = MX(x0);
        const sph = Paint.sphere(x + (mir ? 0.15 : -0.15) * R, y - R * 0.55, R * 1.25, [mir ? 0.25 : -0.25, -0.97], 0.06);
        const lift = pass === 0 ? -0.22 : pass === 1 ? -0.06 : 0.05;
        const deep = (yy) => clamp((yy - OY - 420) / 600) * 0.14;
        field(S, { bbox: [x - R * 1.1, y - R * 1.1, x + R * 1.1, y + R * 1.1], mask: (px, py) => Math.hypot(px - x, (py - y) / 0.9) < R * (0.9 + NOISE(px * 0.03, py * 0.03) * 0.25),
          ramp: LEAF, shade: (px, py) => clamp(sph(px, py) * 0.95 + lift - deep(py)), dir: (px, py) => Math.atan2(py - y, px - x) + (r() - 0.5) * 1.1,
          len: [26, 42], wid: [11, 17], cover: pass === 2 ? 2.3 : 1.8, leaf: true, noise: 0.05, broken: 0.06 });
      }
    }
    // alt kenardan sarkan yaprak saçakları
    for (let x = -30; x < 950; x += 9 + r() * 12) { const ly = lowY(x) - 8 + OY; const m = 2 + Math.floor(r() * 3); for (let q = 0; q < m; q++) leaf(S, MX(x + (r() - 0.5) * 16), ly + r() * 20, Math.PI / 2 + (r() - 0.5) * 0.9, 26 + r() * 14, 11 + r() * 4, r.pick(LEAF.slice(3, 7)), {}); }
    // ---- sarkan meyveler: x tasarım koordinatında, sap taç kenarından aşağı
    const GRAPE = ['#5E7A1E', '#7E9A2A', '#A3B83A', '#C6D25A', '#E2E79A'];
    const stem = (x, y0, y1, bend) => S.line([[x, y0], [x + bend * 0.5, (y0 + y1) / 2], [x + bend, y1]], 3.4, '#8A6418', { w1: 2.4, edge: false });
    for (const f of cfgT.fruit) {
      const xl = mir ? 1320 - f.wx : f.wx + 240; const y0 = lowY(xl) - 14 + OY, y = y0 + f.len;
      const x = MX(xl), bend = (mir ? -1 : 1) * (f.bend ?? 0);
      stem(x, y0, y, bend);
      const fx = x + bend;
      if (f.t === 'nar') {
        const n = f.n ?? 2; leaf(S, fx - 22, y - 8, -2.6, 38, 15, '#1F8A50', { vein: '#0B5A40' });
        for (let i = 0; i < n; i++) { const a = i - (n - 1) / 2; paintPom(S, fx + a * 44, y + 32 + Math.abs(a) * 14, f.R ?? 30, a * 0.25); }
        leaf(S, fx + 24, y - 4, -0.5, 38, 15, '#2E9A52', { vein: '#127048' });
      }
      if (f.t === 'uzum') { grapeLeaf(S, fx + (mir ? -20 : 20), y - 4, 26, -Math.PI / 2 + (mir ? -0.5 : 0.5), '#3A9E52'); paintGrapes(S, fx, y + 12, f.s ?? 1, GRAPE); }
      if (f.t === 'hurma') paintDates(S, fx, y - 8, f.s ?? 1);
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: MX(BX), py: h, k: 1 };
  }
  // taç alt kenarı (tasarım koordinatı): sol kenarda alçak sarkar, ortada köşk kubbelerinin üstünde kalır
  const TREE_SOL = { seed: 5701, mirror: false, holes: [[560, 40, 44], [780, 150, 36], [420, -40, 34], [250, -120, 30]],
    low: [[-40, 990], [200, 990], [262, 960], [300, 880], [322, 760], [334, 620], [346, 490], [362, 390], [404, 346], [520, 348], [600, 332], [690, 354], [770, 322], [880, 316], [960, 310]],
    fruit: [{ t: 'nar', wx: 44, len: 46, n: 3, bend: 6, R: 30 }, { t: 'nar', wx: 404, len: 30, n: 2, bend: 4, R: 26 }, { t: 'uzum', wx: 520, len: 26, s: 1.0, bend: 3 }, { t: 'hurma', wx: 610, len: 22, s: 0.92, bend: 3 }] };
  const TREE_SAG = { seed: 5702, mirror: true, holes: [[640, 70, 42], [470, 150, 32], [820, -20, 38], [330, -100, 30]],
    trunk: [[200, 2112, 170], [212, 1880, 142], [232, 1630, 120], [256, 1380, 104], [276, 1180, 94], [294, 1010, 86], [312, 880, 78], [330, 780, 72]],
    low: [[-40, 1010], [200, 1010], [262, 980], [300, 900], [320, 780], [332, 640], [344, 510], [360, 400], [400, 352], [520, 352], [610, 336], [700, 358], [790, 326], [880, 318], [960, 312]],
    fruit: [{ t: 'uzum', wx: 976, len: 40, s: 1.12, bend: 5 }, { t: 'nar', wx: 1056, len: 110, n: 2, bend: 12, R: 31 }, { t: 'hurma', wx: 690, len: 24, s: 0.95, bend: 3 }, { t: 'nar', wx: 588, len: 28, n: 2, bend: 4, R: 26 }, { t: 'uzum', wx: 478, len: 24, s: 0.9, bend: 2 }] };
  defSprite('cennet-agac-sol', () => paintTree(TREE_SOL));
  defSprite('cennet-agac-sag', () => paintTree(TREE_SAG));

  // ================================================================ 8. KIYI GÜLLERİ (~160 px; k = 1.5)
  function paintFlowers(seed, cols, kind) {
    const K = 1.5, Wd = 172, Hd = 172;
    const S = Paint.sprite(Wd * K, Hd * K, { seed, k: K }); const r = S.r; const X = (v) => v * K;
    const bx = Wd / 2, by = Hd - 4;
    const heads = kind === 1 ? [[bx - 30, 74, 22, 'c'], [bx + 28, 62, 24, 'c'], [bx - 2, 104, 21, 'w'], [bx + 52, 104, 16, 'w'], [bx - 58, 110, 15, 'c']]
      : kind === 2 ? [[bx - 24, 60, 24, 'w'], [bx + 30, 84, 22, 'c'], [bx - 48, 104, 17, 'w'], [bx + 6, 112, 18, 'w'], [bx + 56, 120, 13, 'c']]
        : [[bx, 58, 24, 'c'], [bx - 42, 90, 20, 'w'], [bx + 42, 94, 21, 'c'], [bx - 12, 118, 15, 'w']];
    for (const [hx, hy] of heads) S.line([[X(bx + (hx - bx) * 0.2), X(by)], [X(bx + (hx - bx) * 0.7), X((hy + by) / 2)], [X(hx), X(hy + 8)]], X(3.2), '#1C6A3E', { w1: X(2.2), edge: false });
    for (let i = 0; i < 30; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.9; const rad = 18 + r() * 54;
      const px = bx + Math.cos(a) * rad * 1.05, py = by - 26 + Math.sin(a) * rad * 0.6;
      const v = clamp((py - 60) / 110); const col = ['#62C05E', '#38A256', '#218C50', '#147249', '#0C5B41'][clamp(Math.floor(v * 4.6 + (r() - 0.5)), 0, 4)];
      leaf(S, X(px), X(py), a + (r() - 0.5) * 0.9, 26 + r() * 10, 12 + r() * 4, col, { vein: shade(col, -0.12) });
    }
    for (let i = 0; i < 3; i++) { const x = bx + (r() - 0.5) * 124, y = 66 + r() * 50; const c = cols[0]; S.line([[X(x), X(y + 26)], [X(x + 2), X(y + 6)]], X(2.2), '#1F7A44', { edge: false }); fill(S, smoothPath(blobPts(X(x), X(y), X(5), X(8), 10, 0.05, i + seed)), shade(c, -0.05), { h: 165 }); leaf(S, X(x - 3), X(y + 5), -2, 10, 5, '#2E9A52', {}); leaf(S, X(x + 3), X(y + 5), -1.1, 10, 5, '#2E9A52', {}); }
    heads.sort((a, b) => a[1] - b[1]).forEach(([hx, hy, rr, t], i) => {
      const c = cols[i % cols.length];
      S.rim(circ(X(hx), X(hy), X(rr * 0.9)), { w: 1.6, alpha: 0.7 });
      if (t === 'w') wildRose(S, X(hx), X(hy), X(rr * 1.05), c, { inner: kind === 2 ? '#F2A9C4' : undefined });
      else cupRose(S, X(hx), X(hy), X(rr), c);
    });
    return { canvas: S.finish({ emboss: 0.55 }), px: X(bx), py: X(by), k: K };
  }
  defSprite('cennet-cicek-1', () => paintFlowers(5801, ['#F07FA8', '#F59BBC', '#E8628E'], 1));
  defSprite('cennet-cicek-2', () => paintFlowers(5802, ['#FBF2F1', '#F7E3E6', '#FFFFFF'], 2));
  defSprite('cennet-cicek-3', () => paintFlowers(5803, ['#F6C04E', '#F5A57C', '#F8D47A'], 3));

  // ================================================================ katmanlar ve meta
  const layers = [
    { name: 'cennet-gok', x: SKY.x, y: SKY.y, parallax: 0.1 },
    { name: 'bulut-kusagi', x: BAND.x, y: BAND.y, parallax: 0.6 },
    { name: 'cennet-uzak', x: FAR.x, y: FAR.y, parallax: 0.3 },
    { name: 'kasr-sol', x: 250, y: 1080, parallax: 0.65 },
    { name: 'kasr-sag', x: 830, y: 1010, parallax: 0.65 },
    { name: 'cennet-orta', x: MID.x, y: MID.y, parallax: 0.75 },
    { name: 'cennet-irmak', x: RIV.x, y: RIV.y, parallax: 0.9 },
    { name: 'cennet-agac-sol', x: -40, y: 1950, parallax: 1.1 },
    { name: 'cennet-agac-sag', x: 1120, y: 1950, parallax: 1.1 },
  ];
  // kıyı gülleri için önerilen yerler (ırmak katmanı dünya koordinatı, parallax 0.9): [x, y, ad, ölçek]
  const flowerSpots = [[318, 1600, 'cennet-cicek-1', 0.66], [236, 1760, 'cennet-cicek-3', 0.8], [952, 1660, 'cennet-cicek-2', 0.78], [990, 1890, 'cennet-cicek-1', 0.98], [150, 1930, 'cennet-cicek-2', 1.0], [836, 1540, 'cennet-cicek-3', 0.58]];
  const springs = [[250, 1076], [830, 1006]];
  return {
    layers, riverPath, flowDir, springs, flowerSpots,
    depthAt, // 0 kıyı … 1 orta (ırmak katmanı dünya koordinatı)
    streams: STREAMS.map((s) => ({ id: s.id, ctrl: s.ctrl })),
    SKY, BAND, FAR, MID, RIV,
  };
})();
