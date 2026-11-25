// Cennet manzarası (Perde 5): güneşsiz inci-şeftali-nane gök, pastel bulut kuşağı, uzak teraslı bahçeler,
// üst üste odalı iki köşk (altın-gümüş tuğla, inci pano, oyuk inci kubbe), orta bahçe kuşağı (güller, bağlar,
// meyve bahçeleri), köşklerin altından çıkıp birleşen ve yüzeyde akan ırmak (altın ve inci kıyılar, inci kubbecikler,
// inci-yakut çakıllar), çerçeveleyen altın gövdeli büyük ağaçlar ve kıyı gül demetleri.
// Işık: kaynaksız, yumuşak, eşit; serin, uzayan gölge (56:30). Gökte güneş, ışın, ışık kaynağı yok.
// Dünya koordinatı = zoom 1'de ekran pikseli (1080×1920), sol üst köken.
'use strict';
const CENNET_M = (() => {
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- palet
  const GOLD = ['#7A4C12', '#9C6A1C', '#BE8C2A', '#D9AC3E', '#EBC85E', '#F6DE8E', '#FFF1C2'];
  const SILV = ['#7F8299', '#9A9DB2', '#B4B7C9', '#CBCDDB', '#DFE0EA', '#EFEFF5', '#FBFBFF'];
  const PEARL = ['#B9B0D0', '#CFC7DE', '#E1DAE8', '#EEE8F0', '#F8F3F4', '#FFFDFB'];
  const NACRE = ['#F6D2E2', '#CFF0E2', '#D9D0F3', '#F8E4CC', '#CDE6F6'];
  const EMER = ['#06302B', '#0A4537', '#0B5A40', '#137049', '#1F8A50', '#2EAD56', '#5EC45B', '#9ED64A'];
  const RUBY = ['#5E0A1C', '#8A1027', '#B3192F', '#D63545', '#F07B80'];
  const MUSK = '#93622F'; // amber-misk derz
  const ROSE_COLS = ['#F28DB2', '#FBF1F2', '#E04866', '#F6C24E', '#F7AE8C', '#F5B8CF'];

  // ---------------------------------------------------------------- yardımcılar
  function stroke(S, x, y, ang, len, wid, col, o) { Paint.drawStroke(S, x, y, ang, len * S.k, wid * S.k, col, o || {}); }
  function fill(S, path, col, o = {}) {
    S.x.save(); S.x.globalAlpha = o.alpha ?? 1; S.x.fillStyle = col; S.x.fill(path); S.x.restore();
    if (o.height !== false) { const g = o.h ?? 150; S.hx.save(); S.hx.globalAlpha = o.alpha ?? 1; S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fill(path); S.hx.strokeStyle = `rgb(${g + 50},${g + 50},${g + 50})`; S.hx.lineWidth = 1; S.hx.stroke(path); S.hx.restore(); }
  }
  const poly = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  const circ = (x, y, r) => ellipsePath(x, y, r, r);
  // badem yaprak biçimi (+x yönünde)
  function leafPath(len, wid, r) {
    const p = new Path2D(); const l = len / 2, w = wid / 2; const b = (r() - 0.5) * w * 0.5;
    p.moveTo(-l, 0);
    p.bezierCurveTo(-l * 0.55, -w * 1.15 + b, l * 0.35, -w * 1.05 + b, l, b * 0.4);
    p.bezierCurveTo(l * 0.35, w * 1.05 + b, -l * 0.55, w * 1.15 + b, -l, 0);
    p.closePath(); return p;
  }
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
    ctx.restore();
    if (o.height !== false) {
      hx.save(); hx.translate(x, y); hx.rotate(ang); const g = 125 + Math.floor(r() * 30);
      hx.fillStyle = `rgb(${g},${g},${g})`; hx.globalAlpha = 0.9; hx.fill(p);
      hx.strokeStyle = `rgb(${g + 60},${g + 60},${g + 60})`; hx.globalAlpha = 0.5; hx.lineWidth = 1 * k; hx.stroke(p); hx.restore();
    }
  }
  // Taban dolgusu yapmayan darbe alanı. o: {bbox, path, mask, clip, ramp, shade, dir, len, wid, cover|count, jitter,
  // jitterFreq, noise, broken, sort, dry, lJit, hJit, alpha|alphaF, colorF, size, leaf, vein}
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
  // kavisli darbe (kemer): merkez, yarıçap, açı aralığı, genişlik
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
  // Catmull-Rom örnekleme (her bileşen ara değerlenir)
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
    const shadeF = (x, y) => {
      const i = near(x, y); const off = clamp(((x - P[i][0]) * N[i][0] + (y - P[i][1]) * N[i][1]) / (P[i][2] / 2 + 0.01), -1, 1);
      const side = N[i][0] * lit[0] + N[i][1] * lit[1] > 0 ? 1 : -1; const u = off * side;
      return clamp(0.52 + u * 0.3 - Math.pow(Math.abs(off), 3) * 0.32 + (o.lift ?? 0));
    };
    if (o.rim !== false) S.rim(path, { w: o.rimW ?? 2.6 });
    S.region(path, { ramp: cols, shade: shadeF, dir: (x, y) => { const i = near(x, y); return Math.atan2(T[i][1], T[i][0]) + (S.r() - 0.5) * 0.1; }, len: o.len ?? [40, 90], wid: o.wid ?? [8, 14], cover: o.cover ?? 2.6, jitter: 5, noise: 0.05, rim: false, bbox: bboxOf(P, 4), broken: 0.05 });
    return { path, P, T, N, near };
  }
  // küçük gül başı (r: yarıçap, sprite px)
  function roseHead(S, x, y, rr, col, o = {}) {
    const r = S.r; const dk = shade(col, -0.16, 1.05, -6), lt = shade(col, 0.1, 0.85, 6), dd = shade(col, -0.3, 1.1, -10);
    if (rr < 3.2) { fill(S, circ(x, y, rr), col, { h: 165 }); fill(S, circ(x - rr * 0.3, y - rr * 0.3, rr * 0.45), lt, { h: 170 }); return; }
    // dış taç yapraklar
    const np = 5;
    for (let i = 0; i < np; i++) {
      const a = (i / np) * TAU + r() * 0.6; const px = x + Math.cos(a) * rr * 0.42, py = y + Math.sin(a) * rr * 0.36 + rr * 0.08;
      fill(S, smoothPath(blobPts(px, py, rr * 0.62, rr * 0.5, 12, 0.08, Math.floor(r() * 1e5), a)), i % 2 ? col : dk, { h: 150 });
    }
    fill(S, circ(x, y - rr * 0.06, rr * 0.62), col, { h: 160 });
    // sarmal
    arc(S, x, y - rr * 0.08, rr * 0.42, Math.PI * 0.9, Math.PI * 2.1, Math.max(1, rr * 0.16), dk);
    arc(S, x + rr * 0.04, y - rr * 0.1, rr * 0.22, Math.PI * 1.6, Math.PI * 2.8, Math.max(0.8, rr * 0.12), dd);
    arc(S, x, y - rr * 0.02, rr * 0.6, Math.PI * 1.05, Math.PI * 1.75, Math.max(1, rr * 0.14), lt);
    if (o.hi !== false) fill(S, circ(x - rr * 0.28, y - rr * 0.36, Math.max(0.8, rr * 0.13)), shade(col, 0.2, 0.6, 8), { h: 175 });
  }
  // gül çalısı: taban (x,y), boyut s (ekran px), güller
  function roseBush(S, x, y, s, o = {}) {
    const r = S.r; const k = S.k; const cols = o.cols || ROSE_COLS; const lean = o.lean ?? 0;
    const base = o.leafRamp || ['#0A4537', '#0F5A40', '#18724A', '#258C52', '#3DA65B'];
    const n = Math.round(6 + s * 0.5);
    for (let i = 0; i < n; i++) {
      const t = r(); const a = -Math.PI / 2 + (r() - 0.5) * 2.6;
      const rad = s * k * (0.25 + r() * 0.55);
      const px = x + Math.cos(a) * rad * 0.9 + lean * s * k * 0.2, py = y - s * k * 0.35 + Math.sin(a) * rad * 0.62;
      const vi = clamp(Math.floor((1 - (py - (y - s * k)) / (s * k)) * base.length * 0.9 + (r() - 0.5) * 1.2), 0, base.length - 1);
      leaf(S, px, py, a + (r() - 0.5) * 0.9, s * (0.32 + r() * 0.18), s * (0.16 + r() * 0.07), base[vi], {});
      void t;
    }
    const m = o.roses ?? Math.max(1, Math.round(s / 9));
    const c0 = o.color ?? r.pick(cols);
    for (let i = 0; i < m; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.2; const rad = s * k * (0.15 + r() * 0.4);
      const col = r() < 0.75 ? c0 : r.pick(cols);
      roseHead(S, x + Math.cos(a) * rad, y - s * k * 0.45 + Math.sin(a) * rad * 0.6, s * k * (0.09 + r() * 0.06), shade(col, (r() - 0.5) * 0.05));
    }
  }

  // ================================================================ IRMAK GEOMETRİSİ (dünya koordinatı)
  // ctrl: [x, y, genişlik]; banks: [A tarafı (+normal), B tarafı (−normal)] 'gold' | 'pearl'
  const STREAM_DEFS = [
    { id: 'L', banks: ['gold', 'gold'], ctrl: [[250, 1066, 104], [251, 1090, 90], [264, 1122, 66], [312, 1168, 60], [404, 1212, 66], [494, 1246, 74], [556, 1268, 82]] },
    { id: 'R', banks: ['pearl', 'pearl'], ctrl: [[830, 996, 98], [829, 1020, 86], [814, 1060, 62], [762, 1116, 58], [686, 1174, 64], [612, 1228, 74], [566, 1262, 82]] },
    { id: 'l1', banks: ['gold', 'gold'], ctrl: [[78, 1068, 50], [82, 1092, 34], [118, 1126, 24], [196, 1154, 24], [276, 1166, 26], [328, 1176, 30]] },
    { id: 'l2', banks: ['gold', 'gold'], ctrl: [[432, 1068, 50], [434, 1092, 34], [440, 1128, 26], [426, 1168, 26], [402, 1204, 30]] },
    { id: 'r1', banks: ['pearl', 'pearl'], ctrl: [[668, 998, 46], [670, 1020, 32], [686, 1056, 24], [718, 1094, 24], [752, 1122, 30]] },
    { id: 'r2', banks: ['pearl', 'pearl'], ctrl: [[994, 998, 46], [990, 1022, 32], [956, 1052, 24], [884, 1080, 24], [806, 1090, 30]] },
    { id: 'M', banks: ['gold', 'pearl'], ctrl: [[560, 1236, 100], [538, 1290, 118], [500, 1350, 136], [476, 1420, 156], [494, 1500, 192], [576, 1580, 232], [684, 1676, 286], [714, 1790, 346], [648, 1918, 426], [566, 2050, 516], [530, 2140, 560]] },
  ];
  const STREAMS = STREAM_DEFS.map((d) => {
    const P = crSample(d.ctrl, 16); const T = tangents(P); const N = T.map(([tx, ty]) => [-ty, tx]);
    // kaynakta suyun kemerden yayılarak çıkışı: ilk ~40 px'de kıyı genişliği 0'dan büyür
    const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { ...d, P, T, N, L, len: L[L.length - 1] };
  });
  const bankW = (y) => 7 + Math.max(0, y - 1000) * 0.062; // kıyı şeridi genişliği (perspektif)
  const wob = (i, s, side) => (NOISE(i * 0.19 + s * 13.1, side * 7.3 + 2) - 0.5) * 5; // kenar dalgası
  function ribbon(st, fa, fb, ox = 0, oy = 0) {
    const p = new Path2D(); const { P, N } = st;
    for (let i = 0; i < P.length; i++) { const o = fa(i); const q = [P[i][0] + N[i][0] * o - ox, P[i][1] + N[i][1] * o - oy]; i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }
    for (let i = P.length - 1; i >= 0; i--) { const o = fb(i); p.lineTo(P[i][0] + N[i][0] * o - ox, P[i][1] + N[i][1] * o - oy); }
    p.closePath(); return p;
  }
  const sIdx = (st) => STREAMS.indexOf(st);
  const waterA = (st) => (i) => st.P[i][2] / 2 + wob(i, sIdx(st), 1);
  const waterB = (st) => (i) => -(st.P[i][2] / 2 + wob(i, sIdx(st), 2));
  const ramp0 = (st, i) => clamp(st.L[i] / 40); // kaynaktan uzaklaştıkça kıyı belirir
  function waterPath(ox = 0, oy = 0) { const p = new Path2D(); for (const st of STREAMS) p.addPath(ribbon(st, waterA(st), waterB(st), ox, oy)); return p; }
  function bankPath(st, side, ox = 0, oy = 0) {
    if (side === 0) return ribbon(st, (i) => waterA(st)(i) - 2, (i) => waterA(st)(i) + bankW(st.P[i][1]) * ramp0(st, i), ox, oy);
    return ribbon(st, (i) => waterB(st)(i) + 2, (i) => waterB(st)(i) - bankW(st.P[i][1]) * ramp0(st, i), ox, oy);
  }
  // en yakın akış noktası: her kol için
  function nearestAll(x, y) {
    const res = [];
    for (const st of STREAMS) {
      const { P, N } = st; let bi = 0, bd = 1e18;
      for (let i = 0; i < P.length; i++) { const dx = x - P[i][0], dy = y - P[i][1]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
      const off = (x - P[bi][0]) * N[bi][0] + (y - P[bi][1]) * N[bi][1];
      res.push({ st, i: bi, off, hw: P[bi][2] / 2, dist: Math.sqrt(bd) });
    }
    return res;
  }
  // derinlik 0 (kenar) .. 1 (orta), birleşik
  function depthAt(x, y) { let d = 0; for (const n of nearestAll(x, y)) d = Math.max(d, 1 - Math.abs(n.off) / n.hw); return clamp(d); }
  function flowDir(x, y) {
    let sx = 0, sy = 0, best = null, bd = 1e9;
    for (const n of nearestAll(x, y)) {
      const dep = 1 - Math.abs(n.off) / n.hw; const t = n.st.T[n.i];
      if (dep > 0) { const wgt = dep * dep * (n.st.id === 'M' ? 1.4 : 1); sx += t[0] * wgt; sy += t[1] * wgt; }
      const e = Math.abs(n.off) - n.hw; if (e < bd) { bd = e; best = t; }
    }
    if (sx === 0 && sy === 0) { sx = best[0]; sy = best[1]; }
    const l = Math.hypot(sx, sy) || 1; return [sx / l, sy / l];
  }
  // suya (ve kıyıya) uzaklık: >0 dışarıda
  function waterGap(x, y) { let g = 1e9; for (const n of nearestAll(x, y)) g = Math.min(g, Math.abs(n.off) - n.hw - bankW(y)); return g; }
  let _rp = null;
  const riverPath = () => (_rp || (_rp = waterPath(0, 0)));

  // ================================================================ 1. GÖK (güneşsiz, inci-şeftali-nane-lavanta)
  const SKY = { x: -200, y: -1400, w: 1480, h: 2600 };
  function paintSky() {
    const { w, h } = SKY; const ox = SKY.x, oy = SKY.y;
    const S = Paint.sprite(w, h, { seed: 5101, k: 1 }); const r = S.r;
    const bands = [[-1400, '#8784C4'], [-1190, '#9590CB'], [-980, '#A39DD2'], [-770, '#B1AAD9'], [-570, '#BFB6DE'], [-390, '#CCC2E3'], [-220, '#D8CCE6'],
      [-60, '#E3D3E5'], [90, '#EDD8DF'], [220, '#F3DCD5'], [340, '#F6E1CC'], [450, '#F6E8D4'], [550, '#EEEDDB'], [650, '#DFEEDC'], [760, '#D3EBDB'], [880, '#DFF0E3'], [1020, '#EAF3EA']];
    const ramp = bands.map((b) => b[1]); const n = ramp.length;
    const yIdx = (yw) => { for (let i = n - 1; i >= 0; i--) if (yw >= bands[i][0]) { const y0 = bands[i][0], y1 = i < n - 1 ? bands[i + 1][0] : y0 + 150; return (i + clamp((yw - y0) / (y1 - y0))) / n; } return 0; };
    const sf = (x, y) => yIdx(y + oy + 26 * Math.sin((x + ox) * 0.0042 + 0.7) + 14 * Math.sin((x + ox) * 0.0113 + y * 0.003));
    for (let y = 0; y < h; y += 4) { S.x.fillStyle = ramp[clamp(Math.floor(sf(w / 2, y) * n), 0, n - 1)]; S.x.fillRect(0, y, w, 4); }
    field(S, { bbox: [-60, -20, w + 60, h + 20], ramp, shade: sf, dir: 0, dirJit: 0.06, len: [140, 320], wid: [18, 34], cover: 3.0, jitter: 22, jitterFreq: 0.004, noise: 0.02, broken: 0.08, max: 9000, sortJit: 0.6 });
    // sedef tülleri: orta gökte hafif eğik, yumuşak pastel darbe grupları (ışık kaynağı değil)
    for (let g = 0; g < 34; g++) {
      const gx = r() * w, gy = -650 - oy + r() * 1200;
      const base = ramp[clamp(Math.floor(sf(gx, gy) * n), 0, n - 1)];
      const col = mix(base, NACRE[g % NACRE.length], 0.5);
      const ang = -0.06 + (r() - 0.5) * 0.08; const m = 5 + Math.floor(r() * 6);
      for (let i = 0; i < m; i++) stroke(S, gx + (r() - 0.5) * 300, gy + (r() - 0.5) * 50, ang + (r() - 0.5) * 0.04, 110 + r() * 210, 12 + r() * 14, shade(col, (r() - 0.5) * 0.02), { dry: 0.35 });
    }
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-gok', paintSky);

  // ================================================================ 2. BULUT KUŞAĞI (kameranın içinden geçtiği)
  const BAND = { x: -200, y: -600, w: 1480, h: 900 };
  function paintBand() {
    const { w, h } = BAND;
    const S = Paint.sprite(w, h, { seed: 5202, k: 1 }); const r = S.r;
    const puffs = [];
    for (let x = -70; x < w + 90;) { const R = 70 + r() * 72; puffs.push([x, 176 + r() * 46 - R * 0.22, R, 0]); x += R * (1.1 + r() * 0.35); }
    for (let i = 0; i < 8; i++) { const R = 34 + r() * 40; puffs.push([r() * w, 104 + r() * 40, R, 0]); }
    [300, 405, 510, 610].forEach((yy, j) => { for (let x = -60 + r() * 90; x < w + 90;) { const R = 84 + r() * 56; puffs.push([x, yy + (r() - 0.5) * 46, R, j + 1]); x += R * (1.05 + r() * 0.4); } });
    for (let x = -50 + r() * 70; x < w + 70;) { const R = 58 + r() * 58; puffs.push([x, 702 + r() * 46, R, 5]); x += R * (1.45 + r() * 0.9); }
    for (let i = 0; i < 10; i++) { const R = 22 + r() * 28; puffs.push([r() * w, 800 + r() * 44, R, 6]); }
    const sil = new Path2D(); sil.addPath(rectPath(-20, 236, w + 40, 450));
    for (const [cx, cy, R] of puffs) sil.addPath(circ(cx, cy, R));
    S.rim(sil, { w: 2.6, alpha: 0.8 });
    fill(S, rectPath(-20, 236, w + 40, 450), '#D6CBE6', { h: 140 });
    field(S, { bbox: [0, 230, w, 690], ramp: ['#C7BCE0', '#D2C7E5', '#DDD3EA', '#E8DFEE'], shade: Paint.cst(0.5), dir: 0, dirJit: 0.1, len: [60, 120], wid: [14, 22], cover: 1.6, noise: 0.5 });
    puffs.sort((a, b) => a[3] - b[3] || a[1] - b[1]);
    for (const [cx, cy, R, row] of puffs) {
      const t = row / 6;
      const shC = mix('#BBB1DB', '#A79DCF', t), midC = mix('#F3DDD5', '#DCD0EA', t * 0.9), topC = mix('#FCF4EE', '#F1EBF5', t), loC = mix('#CFC4E4', '#BDB3DC', t);
      const p0 = smoothPath(blobPts(cx, cy, R, R * 0.95, 26, 0.03, 900 + Math.round(cx * 7 + cy)));
      fill(S, p0, shC, { h: 135 });
      S.x.save(); S.hx.save(); S.x.clip(p0); S.hx.clip(p0);
      field(S, { bbox: [cx - R, cy, cx + R, cy + R], ramp: [shade(shC, -0.03), shC, loC], shade: Paint.cst(0.5), dir: 0, dirJit: 0.1, len: [R * 0.5, R * 0.9], wid: [8, 13], count: Math.round(R / 14), noise: 0.4 });
      const m1x = cx - R * 0.05, m1y = cy - R * 0.12, m1r = R * 0.86;
      fill(S, circ(m1x, m1y, m1r), midC, { h: 145 });
      const m2x = cx - R * 0.12, m2y = cy - R * 0.24, m2r = R * 0.66;
      fill(S, circ(m2x, m2y, m2r), topC, { h: 160 });
      // tarak kabuğu kemerleri
      const ac = [cx - R * 0.06, cy + R * 0.28];
      arc(S, ac[0], ac[1], R * 0.84, Math.PI + 0.34, TAU - 0.46, R * 0.18, '#FFFDFB');
      arc(S, ac[0], ac[1], R * 0.63, Math.PI + 0.42, TAU - 0.56, R * 0.06, mix(midC, shC, 0.4), { alpha: 0.85 });
      arc(S, ac[0] - R * 0.05, ac[1] + R * 0.04, R * 0.44, Math.PI + 0.42, TAU - 0.62, R * 0.15, mix(topC, '#FFFFFF', 0.6));
      // şeftali/sedef ışıltısı (kenar)
      if (r() < 0.6) arc(S, cx, cy, R * 0.9, Math.PI * 0.05, Math.PI * 0.55, R * 0.07, mix(r.pick(NACRE), shC, 0.35), { alpha: 0.85 });
      S.x.restore(); S.hx.restore();
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }
  defSprite('bulut-kusagi', paintBand);

  // ================================================================ 3. UZAK TERASLI BAHÇELER
  const FAR = { x: -200, y: 540, w: 1480, h: 480 };
  function paintFar() {
    const { w, h } = FAR; const ox = FAR.x, oy = FAR.y;
    const S = Paint.sprite(w, h, { seed: 5303, k: 1 }); const r = S.r;
    const LAY = [
      { top: (x) => 592 + 22 * Math.sin(x * 0.0045 + 1.2) + 14 * Math.sin(x * 0.012 + 0.3), ramp: ['#9BC4B8', '#A8CDC0', '#B6D6C9', '#C5DFD2', '#D4E8DC'], terr: 17, sc: 0.45, haze: 0.55 },
      { top: (x) => 664 + 34 * Math.sin(x * 0.0056 + 2.6) + 12 * Math.sin(x * 0.015 + 1.1), ramp: ['#73B48E', '#83BF99', '#94C9A5', '#A6D3B2', '#B9DDC0'], terr: 21, sc: 0.62, haze: 0.45 },
      { top: (x) => 752 + 40 * Math.sin(x * 0.0049 + 0.4) + 14 * Math.sin(x * 0.017 + 2.0), ramp: ['#469F6C', '#55AB76', '#66B781', '#7AC28E', '#90CD9C'], terr: 26, sc: 0.8, haze: 0.32 },
      { top: (x) => 852 + 32 * Math.sin(x * 0.0061 + 4.1) + 12 * Math.sin(x * 0.019 + 0.7), ramp: ['#2A885B', '#369464', '#45A16E', '#56AE79', '#6BBB86'], terr: 32, sc: 1.0, haze: 0.2 },
    ];
    LAY.forEach((Ly, li) => {
      const top = (xs) => Ly.top(xs + ox) - oy; // sprite koordinatı
      const pts = []; for (let x = -10; x <= w + 10; x += 12) pts.push([x, top(x)]);
      const hill = new Path2D(); hill.moveTo(-10, h + 10); for (const p of pts) hill.lineTo(p[0], p[1]); hill.lineTo(w + 10, h + 10); hill.closePath();
      S.rim(hill, { w: 2.2, alpha: 0.5 + li * 0.1 });
      fill(S, hill, Ly.ramp[2], { h: 140 });
      const spacing = (j) => Ly.terr * (1 + j * 0.07);
      const bandOf = (x, y) => { let d = y - top(x), j = 0; while (d > spacing(j) && j < 40) { d -= spacing(j); j++; } return [j, d / spacing(j)]; };
      const sh = (x, y) => { const [j, fr] = bandOf(x, y); return clamp(0.86 - fr * 0.5 + clamp((y - top(x) - 30) / 140) * 0.3 * Ly.haze + j * 0.012); };
      const slope = (x) => Math.atan2(top(x + 6) - top(x - 6), 12);
      field(S, { bbox: [-10, top(w / 2) - 60, w + 10, h + 4], path: hill, ramp: Ly.ramp, shade: sh, dir: (x) => slope(x) + (r() - 0.5) * 0.06, len: [30 * Ly.sc + 16, 70 * Ly.sc + 20], wid: [5 * Ly.sc + 4, 9 * Ly.sc + 4], cover: 2.4, noise: 0.03, broken: 0.04, max: 6000 });
      // terasların sırt ve şev çizgileri
      for (let j = 1; j < 14; j++) {
        let acc = 0; for (let q = 0; q < j; q++) acc += spacing(q);
        for (let x = -10; x < w + 10;) {
          const len = 30 + r() * 60; const y = top(x) + acc; if (y > h + 4) break;
          if (r() < 0.86) { stroke(S, x + len / 2, y + 1.5, slope(x), len, 2.6 + Ly.sc * 2, shade(Ly.ramp[0], -0.04), { dry: 0.3 }); stroke(S, x + len / 2, y - 1.6, slope(x), len * 0.8, 1.6 + Ly.sc, Ly.ramp[4], { dry: 0.5 }); }
          x += len * (0.9 + r() * 0.3);
        }
      }
      // meyve bahçesi noktaları (yuvarlak ağaççıklar)
      const nTrees = Math.round(140 * Ly.sc);
      for (let i = 0; i < nTrees; i++) {
        const x = r() * w; const j = 1 + Math.floor(r() * 6); let acc = 0; for (let q = 0; q < j; q++) acc += spacing(q);
        const y = top(x) + acc - 2; if (y > h - 4) continue;
        const rr = (3 + r() * 4) * Ly.sc + 1.2;
        fill(S, circ(x, y - rr, rr), shade(Ly.ramp[0], -0.08 - r() * 0.05), { h: 150 });
        fill(S, circ(x - rr * 0.25, y - rr * 1.25, rr * 0.55), Ly.ramp[3], { h: 160 });
      }
      // küçük ince dereler (teras boyunca)
      if (li === 1 || li === 2) {
        for (let s = 0; s < 3; s++) {
          let x = 80 + r() * (w - 200); const j = 1 + Math.floor(r() * 3); let acc = 0; for (let q = 0; q < j; q++) acc += spacing(q);
          const L2 = 90 + r() * 160;
          for (let t = 0; t < L2; t += 14) { const y = top(x) + acc + spacing(j) * 0.45 + Math.sin(t * 0.05) * 2; stroke(S, x, y, slope(x), 18, 2 + Ly.sc * 1.6, r() < 0.5 ? '#E9FAF6' : '#BFEDE6', { dry: 0.3 }); x += 13; }
        }
      }
      // inci odacıklar (bazıları üst üste), yıldız gibi parıltı (ışık konutların kendisinden)
      const nCh = [26, 18, 13, 9][li];
      for (let i = 0; i < nCh; i++) {
        const x = 30 + r() * (w - 60); const j = Math.floor(r() * 4); let acc = 0; for (let q = 0; q < j; q++) acc += spacing(q);
        const y = top(x) + acc + 1; if (y > h - 6) continue;
        const sc = Ly.sc * (0.8 + r() * 0.5);
        const tiers = 1 + Math.floor(r() * (li < 2 ? 3 : 2));
        let by = y, bw = (14 + r() * 12) * sc;
        for (let t = 0; t < tiers; t++) {
          const bh = (7 + r() * 4) * sc; const x0 = x - bw / 2;
          fill(S, rectPath(x0, by - bh, bw, bh), '#F5F0F1', { h: 165 });
          fill(S, rectPath(x0 + bw * 0.72, by - bh, bw * 0.28, bh), mix('#D6CEE3', Ly.ramp[2], 0.25), { h: 150 });
          fill(S, rectPath(x0 - 0.6, by - bh - 1.2, bw + 1.2, 1.4 * sc + 0.6), '#E9C766', { h: 170 });
          for (let q = 0; q < Math.max(1, Math.round(bw / (6 * sc))); q++) fill(S, rectPath(x0 + 2 * sc + q * 6 * sc, by - bh * 0.72, 2.2 * sc, bh * 0.45), mix('#F7DCE6', '#D8F1E8', r()), { h: 160 });
          by -= bh + 1.4 * sc; bw *= 0.68;
        }
        const dr = bw * 0.62 + 1.6; fill(S, circ(x, by - dr * 0.55, dr), '#FBF7F5', { h: 175 });
        fill(S, circ(x + dr * 0.3, by - dr * 0.4, dr * 0.55), mix('#DCD3EE', '#F3E9F0', 0.4), { h: 170, alpha: 0.7 });
        if (r() < 0.55) { // inci parıltısı
          const gx = x, gy = by - dr * 0.7; const gl = 6 + 7 * Ly.sc;
          S.x.save(); S.x.globalAlpha = 0.35; S.x.fillStyle = '#FFFFFF'; S.x.beginPath(); S.x.ellipse(gx, gy, gl * 0.5, gl * 0.4, 0, 0, TAU); S.x.fill(); S.x.restore();
          stroke(S, gx, gy, 0, gl * 1.3, 1.5, '#FFFFFF', { height: false, alpha: 0.85 });
          stroke(S, gx, gy, Math.PI / 2, gl * 0.85, 1.3, '#FFFFFF', { height: false, alpha: 0.75 });
          fill(S, circ(gx, gy, 1.6 + Ly.sc), '#FFFFFF', { h: 190 });
        }
      }
    });
    return { canvas: S.finish({ emboss: 0.4 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-uzak', paintFar);

  // ================================================================ 4. KÖŞKLER (üst üste odalar, 39:20)
  function pearlBall(S, cx, cy, R, seed, o = {}) {
    // oyuk inci kubbe: sedef yanardönerliği, yumuşak ışık (parıltı patlaması yok)
    const r = S.r;
    const body = smoothPath(blobPts(cx, cy, R, R * (o.squash ?? 1), 36, 0.008, seed));
    S.rim(body, { w: 2.2, alpha: 0.8 });
    fill(S, body, PEARL[3], { h: 150 });
    const sph = Paint.sphere(cx - R * 0.25, cy - R * 0.35, R * 1.15, [-0.4, -0.9], 0.2);
    field(S, { bbox: [cx - R, cy - R, cx + R, cy + R], clip: body, ramp: PEARL, shade: sph, dir: (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2 + (r() - 0.5) * 0.2,
      len: [R * 0.35, R * 0.7], wid: [Math.max(3, R * 0.09), Math.max(5, R * 0.15)], cover: 3.2, noise: 0.04, broken: 0.04,
      colorF: (x, y, ki, c) => { if (ki < 1 || ki > 4) return c; const u = ((x - cx) * 0.7 + (y - cy) * 0.7) / R; const tint = NACRE[(Math.floor((u + 1.4) * 2.2) + 10) % NACRE.length]; return mix(c, tint, 0.45); } });
    // alt kenarda serin yansıma, iç ışık (oyuk inci)
    arc(S, cx, cy, R * 0.88, Math.PI * 0.12, Math.PI * 0.82, R * 0.1, '#C8BEDD', { alpha: 0.75 });
    arc(S, cx, cy, R * 0.7, Math.PI * 0.25, Math.PI * 0.7, R * 0.07, '#FBE8DA', { alpha: 0.6 });
    arc(S, cx - R * 0.08, cy - R * 0.06, R * 0.62, Math.PI * 1.08, Math.PI * 1.42, R * 0.12, '#FFFFFF', { alpha: 0.9 });
    fill(S, circ(cx - R * 0.42, cy - R * 0.46, R * 0.07), '#FFFFFF', { h: 185 });
    return body;
  }
  function paintPalace(cfg) {
    const K = cfg.K ?? 1; const W0 = cfg.w, H0 = cfg.h;
    const S = Paint.sprite(W0 * K, H0 * K, { seed: cfg.seed, k: K }); const r = S.r;
    const X = (v) => v * K; const cx = W0 / 2; const side = cfg.side;
    const TT = cfg.terrace; const CH = cfg.cornice;
    // kat geometrisi (tasarım birimi)
    let yb = TT.top + 4; const st = [];
    for (const s of cfg.storeys) { const y1 = yb, y0 = y1 - s.h; st.push({ ...s, x0: cx - s.w / 2, x1: cx + s.w / 2, y0, y1 }); yb = y0 - CH; }
    const sideW = (s) => s.w * 0.07; // yan yüz genişliği
    const sideDy = (y) => clamp((cfg.vpY - y) * 0.1, -22, 22);
    // altın/gümüş tuğla duvar (yol içinde kırpılır)
    function bricks(path, bb, o = {}) {
      fill(S, path, o.joint ?? MUSK, { h: 125 });
      S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
      const bh = 9.2, bl = 21; const dark = o.dark ?? 0; const ang = o.ang ?? 0;
      let row = 0;
      for (let y = bb[1] + bh / 2; y < bb[3] + bh; y += bh, row++) {
        const off = (row % 2) * bl * 0.5; let col = 0;
        for (let x = bb[0] - off; x < bb[2] + bl; x += bl, col++) {
          const gold = (col + row) % 2 === 0;
          const ao = clamp((y - bb[1]) / 26); // korniş altında gölge
          const RAMP = gold ? GOLD : SILV;
          const idx = clamp(Math.round(3.2 + ao * 1.3 - dark * 1.6 + (r() - 0.5) * 0.9), 1, 6);
          const c = shade(RAMP[idx], (r() - 0.5) * 0.03 - dark * 0.03, gold ? 0.92 : 1, gold ? 0 : -4 * dark);
          const yy = y + (x - bb[0]) * Math.tan(ang);
          stroke(S, X(x + bl / 2), X(yy), ang + (r() - 0.5) * 0.025, bl - 2.4, bh - 1.9, c, { dry: 0.05 });
        }
      }
      S.x.restore(); S.hx.restore();
    }
    // kemerli açıklık + yarı saydam inci pano
    function archPath(xc, yTop, ow, yBot, grow = 0) {
      const p = new Path2D(); const rr = ow / 2 + grow; const xl = xc - rr, xr = xc + rr; const yc = yTop + ow / 2;
      p.moveTo(X(xl), X(yBot + grow * 0.3)); p.lineTo(X(xl), X(yc)); p.arc(X(xc), X(yc), X(rr), Math.PI, 0); p.lineTo(X(xr), X(yBot + grow * 0.3)); p.closePath(); return p;
    }
    function opening(xc, yTop, ow, yBot) {
      const fr = archPath(xc, yTop, ow, yBot, 4.2);
      fill(S, fr, GOLD[4], { h: 170 });
      field(S, { bbox: [X(xc - ow / 2 - 6), X(yTop - 6), X(xc + ow / 2 + 6), X(yBot + 2)], clip: fr, ramp: GOLD.slice(2, 7), shade: Paint.grad(0, X(yTop), 0, X(yBot), 0.85, 0.35), dir: Math.PI / 2, dirJit: 0.2, len: [10, 20], wid: [3, 5], count: Math.round(ow * 0.9), noise: 0.15 });
      const pn = archPath(xc, yTop, ow, yBot, 0);
      fill(S, pn, '#EEE6EF', { h: 140 });
      S.x.save(); S.hx.save(); S.x.clip(pn); S.hx.clip(pn);
      // sedef bantlar: soldan sağa pembe → beyaz → nane → lavanta
      const nb = Math.max(4, Math.round(ow / 5));
      for (let i = 0; i < nb; i++) {
        const u = (i + 0.5) / nb; const xx = xc - ow / 2 + u * ow;
        const tint = u < 0.25 ? NACRE[0] : u < 0.5 ? '#FFFDFB' : u < 0.75 ? NACRE[1] : NACRE[2];
        const c = mix('#F3EDF2', tint, 0.65 + r() * 0.2);
        stroke(S, X(xx), X(yTop + (yBot - yTop) * (0.25 + r() * 0.5)), Math.PI / 2 + (r() - 0.5) * 0.05, (yBot - yTop) * (0.7 + r() * 0.4), ow / nb + 2.5, c, { dry: 0.3 });
      }
      // iç: hafif içerisi görünür (zemin çizgisi), üstte derinlik, yanda pervaz gölgesi
      fill(S, rectPath(X(xc - ow / 2), X(yTop + (yBot - yTop) * 0.68), X(ow), X(3.2)), '#DCCFE2', { h: 135, alpha: 0.8 });
      fill(S, rectPath(X(xc - ow / 2), X(yTop + (yBot - yTop) * 0.72), X(ow), X((yBot - yTop) * 0.28)), '#F6EAE6', { h: 135, alpha: 0.55 });
      arc(S, X(xc), X(yTop + ow / 2), X(ow / 2 - 1.5), Math.PI, TAU, X(3.2), '#CBBEDA', { alpha: 0.85 });
      const sx = side > 0 ? xc - ow / 2 + 2 : xc + ow / 2 - 2;
      fill(S, rectPath(X(sx - 2), X(yTop + ow / 2), X(4), X(yBot - yTop - ow / 2)), '#C9BAD3', { h: 130, alpha: 0.8 });
      S.x.restore(); S.hx.restore();
      fill(S, rectPath(X(xc - ow / 2 - 5), X(yBot - 1), X(ow + 10), X(4)), GOLD[3], { h: 170 }); // eşik
    }
    function cornice(x0, x1, yTopC, sideX) {
      const ov = 7; const xa = x0 - ov, xb = x1 + ov;
      const p = rectPath(X(xa), X(yTopC), X(xb - xa), X(CH));
      S.rim(p, { w: 1.8, alpha: 0.7 });
      fill(S, p, GOLD[4], { h: 175 });
      field(S, { bbox: [X(xa), X(yTopC), X(xb), X(yTopC + CH)], clip: p, ramp: GOLD.slice(2, 7), shade: Paint.grad(0, X(yTopC), 0, X(yTopC + CH), 0.95, 0.2), dir: 0, dirJit: 0.03, len: [24, 50], wid: [3.5, 5.5], count: Math.round((xb - xa) / 9), noise: 0.06 });
      fill(S, rectPath(X(xa), X(yTopC), X(xb - xa), X(1.8)), GOLD[6], { h: 185 });
      fill(S, rectPath(X(xa + 2), X(yTopC + CH - 1.6), X(xb - xa - 4), X(1.8)), GOLD[1], { h: 130 });
      if (sideX !== undefined) { // korniş yan yüzü
        const sw = sideX; const xs = side > 0 ? xb : xa; const dy = sideDy(yTopC);
        const q = poly([[X(xs), X(yTopC)], [X(xs + side * sw), X(yTopC + dy)], [X(xs + side * sw), X(yTopC + dy + CH)], [X(xs), X(yTopC + CH)]]);
        fill(S, q, GOLD[2], { h: 150 });
        fill(S, poly([[X(xs), X(yTopC)], [X(xs + side * sw), X(yTopC + dy)], [X(xs + side * sw), X(yTopC + dy + 1.8)], [X(xs), X(yTopC + 1.8)]]), GOLD[5], { h: 170 });
      }
    }
    function storey(s, i) {
      const sw = sideW(s); const xs = side > 0 ? s.x1 : s.x0;
      const front = rectPath(X(s.x0), X(s.y0), X(s.w), X(s.h));
      const sideP = poly([[X(xs), X(s.y0)], [X(xs + side * sw), X(s.y0 + sideDy(s.y0))], [X(xs + side * sw), X(s.y1 + sideDy(s.y1))], [X(xs), X(s.y1)]]);
      const sil = new Path2D(); sil.addPath(front); sil.addPath(sideP);
      S.rim(sil, { w: 2.4 });
      bricks(sideP, [Math.min(xs, xs + side * sw), s.y0 - 24, Math.max(xs, xs + side * sw), s.y1 + 24], { dark: 1, ang: Math.atan2(sideDy(s.y0) - sideDy(s.y0 + 30), -side * 30) * 0 });
      bricks(front, [s.x0, s.y0, s.x1, s.y1]);
      // açıklıklar
      const pitch = s.w / s.n; const ow = Math.min(pitch * 0.56, 58); const oTop = s.y0 + s.h * 0.17, oBot = s.y1 - s.h * 0.1;
      for (let q = 0; q < s.n; q++) opening(s.x0 + pitch * (q + 0.5), oTop, ow, oBot);
      // yan yüzde tek dar pencere (perspektif)
      if (sw > 12) { const xm = xs + side * sw * 0.5, dy = sideDy((oTop + oBot) / 2); const pp = poly([[X(xm - sw * 0.2), X(oTop + 8 + dy)], [X(xm + sw * 0.2), X(oTop + 8 + dy)], [X(xm + sw * 0.2), X(oBot + dy)], [X(xm - sw * 0.2), X(oBot + dy)]]); fill(S, pp, '#D9CDE0', { h: 140 }); }
      // çatı: öndeki terasa küçük inci kubbeler (köşelerde)
      cornice(s.x0, s.x1, s.y0 - CH, sw);
      void i;
    }
    // ---- en üst inci kubbe
    const topS = st[st.length - 1]; const R = cfg.dome; const dcy = topS.y0 - CH - R * 0.74;
    // altın yuva (kubbeyi taşıyan halka)
    const ring = new Path2D(); ring.ellipse(X(cx), X(topS.y0 - CH - 2), X(R * 0.78), X(9), 0, 0, TAU);
    // ---- çizim sırası: kubbe → üst kat … alt kat → teras (önde olan sonra)
    pearlBall(S, X(cx), X(dcy), X(R), cfg.seed + 7);
    S.rim(ring, { w: 1.8 }); fill(S, ring, GOLD[4], { h: 175 });
    field(S, { bbox: [X(cx - R), X(topS.y0 - CH - 12), X(cx + R), X(topS.y0 - CH + 8)], clip: ring, ramp: GOLD.slice(2, 7), shade: Paint.grad(0, X(topS.y0 - CH - 11), 0, X(topS.y0 - CH + 7), 0.95, 0.15), dir: 0, len: [16, 30], wid: [3, 5], count: 26, noise: 0.08 });
    for (let i = st.length - 1; i >= 0; i--) {
      const s = st[i];
      storey(s, i);
      // bu katın çatı terasındaki (bir üst katın dışında kalan) güller ve köşe kubbecikleri
      if (i < st.length - 1) {
        const up = st[i + 1]; const yy = s.y0 - CH;
        const segs = [[s.x0 - 4, up.x0 - 4], [up.x1 + 4, s.x1 + 4]];
        const md = cfg.minor && cfg.minor[i];
        for (const [a, b] of segs) {
          if (b - a < 8) continue;
          let x = a + 6;
          if (md) { const dx = (a < cx) ? a + md + 6 : b - md - 6; pearlBall(S, X(dx), X(yy - md * 0.62), X(md), cfg.seed + i * 31 + Math.round(dx), { squash: 0.98 }); }
          while (x < b - 4) {
            if (md && Math.abs(x - ((a < cx) ? a + md + 6 : b - md - 6)) < md * 0.9) { x += 6; continue; }
            roseBush(S, X(x), X(yy + 2), 13 + r() * 6, {});
            x += 9 + r() * 8;
          }
        }
      }
    }
    // ---- teras (yeşil, yükseltilmiş) ve altındaki alçak geniş kemerler: su buradan çıkar
    const tx0 = TT.x0, tx1 = TT.x1, tt = TT.top, tb = H0;
    const tSil = poly([[X(tx0), X(tt)], [X(tx1), X(tt)], [X(tx1 + 4), X(tb)], [X(tx0 - 4), X(tb)]]);
    S.rim(tSil, { w: 2.6 });
    // üst yüz (çim)
    const topFace = poly([[X(tx0), X(tt)], [X(tx1), X(tt)], [X(tx1 + 1), X(tt + 14)], [X(tx0 - 1), X(tt + 14)]]);
    fill(S, topFace, '#57B565', { h: 150 });
    field(S, { bbox: [X(tx0), X(tt - 2), X(tx1), X(tt + 15)], clip: topFace, ramp: ['#3EA35C', '#58B666', '#78C76E', '#9ED67A'], shade: Paint.grad(0, X(tt), 0, X(tt + 14), 0.9, 0.3), dir: 0, len: [14, 28], wid: [4, 6], cover: 2.2, noise: 0.15 });
    // ön yüz (çimli şev)
    const frontFace = poly([[X(tx0 - 1), X(tt + 13)], [X(tx1 + 1), X(tt + 13)], [X(tx1 + 4), X(tb)], [X(tx0 - 4), X(tb)]]);
    fill(S, frontFace, '#2E9456', { h: 145 });
    field(S, { bbox: [X(tx0 - 6), X(tt + 12), X(tx1 + 6), X(tb)], clip: frontFace, ramp: ['#14603F', '#1C7449', '#278A52', '#37A05B', '#4FB263'], shade: (x, y) => clamp(0.85 - (y - X(tt + 13)) / X(tb - tt) * 0.55 + NOISE(x * 0.03, y * 0.03) * 0.2 - 0.1),
      dir: (x) => Math.PI / 2 + (r() - 0.5) * 0.7, len: [12, 22], wid: [5, 8], cover: 2.6, noise: 0.06 });
    // kemerler
    for (const [axc, ahw, ah] of TT.arches) {
      const yTop = tb - ah, ow = ahw * 2;
      const vous = archPath(axc, yTop, ow, tb + 2, 9);
      S.rim(vous, { w: 2 });
      fill(S, vous, MUSK, { h: 130 });
      // kemer taşları: altın-gümüş sırayla
      const yc = yTop + ahw; const nV = Math.round(ahw * 0.32) * 2 + 1;
      for (let q = 0; q < nV; q++) {
        const a = Math.PI + (q + 0.5) / nV * Math.PI; const rr = ahw + 4.5;
        stroke(S, X(axc + Math.cos(a) * rr), X(yc + Math.sin(a) * rr), a, 8, Math.PI * rr / nV - 1.6, (q % 2 ? SILV : GOLD)[4 + (r() < 0.4 ? 1 : 0)], { dry: 0 });
      }
      for (const sx of [-1, 1]) for (let yy = yc + 6; yy < tb; yy += 9.2) stroke(S, X(axc + sx * (ahw + 4.5)), X(yy), Math.PI / 2, 8, 8, (Math.round(yy / 9.2) % 2 ? SILV : GOLD)[4], { dry: 0 });
      const op = archPath(axc, yTop, ow, tb + 2, 0);
      fill(S, op, '#1D4D5A', { h: 120 });
      S.x.save(); S.hx.save(); S.x.clip(op); S.hx.clip(op);
      // içeride serin gölge katları, tavanda su yansıması
      fill(S, rectPath(X(axc - ahw), X(yTop + ah * 0.32), X(ow), X(ah)), '#24606C', { h: 120 });
      for (let q = 0; q < Math.round(ahw / 5); q++) stroke(S, X(axc + (r() - 0.5) * ow * 0.8), X(yTop + ah * (0.25 + r() * 0.3)), (r() - 0.5) * 0.15, 14 + r() * 16, 2.2, r() < 0.5 ? '#4FA7AE' : '#3B8E98', { dry: 0.3 });
      // akan su (kemerin içinde, dışarı akar)
      const wTop = tb - ah * 0.38;
      fill(S, rectPath(X(axc - ahw), X(wTop), X(ow), X(tb - wTop + 4)), '#46B4BA', { h: 140 });
      for (let q = 0; q < Math.round(ahw * 0.9); q++) { const yy = wTop + r() * (tb - wTop); const u = (yy - wTop) / (tb - wTop); stroke(S, X(axc + (r() - 0.5) * ow * (0.6 + u * 0.4)), X(yy), Math.PI / 2 + (r() - 0.5) * 0.25, 6 + u * 12, 2 + u * 2.5, r() < 0.45 ? '#E2F8F4' : r() < 0.6 ? '#9EE2DB' : '#2C97A6', { dry: 0.2 }); }
      fill(S, rectPath(X(axc - ahw), X(wTop - 1), X(ow), X(2.2)), '#BDEDE6', { h: 150, alpha: 0.9 });
      S.x.restore(); S.hx.restore();
    }
    // terasın ön kenarındaki gül çiti (kemerlerin üstü dahil, kemer önleri açık)
    for (let x = tx0 + 8; x < tx1 - 4; x += 10 + r() * 9) {
      const bad = side > 0 ? (x > st[0].x0 - 2 && x < st[0].x1 + 2) : (x > st[0].x0 - 2 && x < st[0].x1 + 2);
      roseBush(S, X(x), X(tt + 6), bad ? 11 + r() * 4 : 14 + r() * 6, {});
    }
    // terasın yan uçlarında çiçekli çalılar (ön yüzde)
    for (const ex of [tx0 + 12, tx1 - 12]) for (let q = 0; q < 3; q++) roseBush(S, X(ex + (r() - 0.5) * 18), X(tt + 40 + q * 18), 14 + r() * 5, { color: r.pick(ROSE_COLS) });
    return { canvas: S.finish({ emboss: 0.5 }), px: X(cx), py: X(H0), k: K };
  }
  const KASR_SOL = { seed: 5401, K: 1, w: 560, h: 900, side: 1, vpY: 520, cornice: 13, dome: 78,
    terrace: { x0: 14, x1: 546, top: 804, arches: [[280, 60, 70], [104, 38, 50], [456, 38, 50]] },
    storeys: [{ w: 432, h: 172, n: 5 }, { w: 344, h: 146, n: 4 }, { w: 258, h: 124, n: 3 }, { w: 172, h: 98, n: 2 }],
    minor: { 0: 24 } };
  const KASR_SAG = { seed: 5402, K: 1, w: 500, h: 820, side: -1, vpY: 500, cornice: 12, dome: 66,
    terrace: { x0: 12, x1: 488, top: 726, arches: [[250, 56, 66], [86, 34, 46], [414, 34, 46]] },
    storeys: [{ w: 384, h: 158, n: 4 }, { w: 300, h: 134, n: 3 }, { w: 218, h: 114, n: 3 }, { w: 140, h: 88, n: 2 }],
    minor: { 1: 19 } };
  defSprite('kasr-sol', () => paintPalace(KASR_SOL));
  defSprite('kasr-sag', () => paintPalace(KASR_SAG));

  // ================================================================ 5. ORTA BAHÇE KUŞAĞI
  const MID = { x: -200, y: 880, w: 1480, h: 560 };
  function paintMid() {
    const { w, h } = MID; const ox = MID.x, oy = MID.y;
    const S = Paint.sprite(w, h, { seed: 5505, k: 1 }); const r = S.r;
    const sx = (xw) => xw - ox, sy = (yw) => yw - oy;
    // köşk tabanlarını örtmeyen üst sınır (dünya)
    const outline = [[-200, 992], [-16, 992], [-16, 1076], [518, 1076], [521, 952], [582, 938], [586, 1006], [1076, 1006], [1076, 988], [1280, 988], [1280, 1440], [-200, 1440]];
    const region = poly(outline.map(([x, y]) => [sx(x), sy(y)]));
    const lawn = ['#1E7A4C', '#298C54', '#379F5D', '#4DB165', '#6CC26C', '#93D274'];
    fill(S, region, lawn[2], { h: 140 });
    const persp = (yw) => 0.55 + clamp((yw - 950) / 450) * 0.75;
    field(S, { bbox: [0, 40, w, h], path: region, ramp: lawn, shade: (x, y) => clamp(0.52 + (NOISE(x * 0.006 + 2, y * 0.012) - 0.5) * 0.7 - clamp((y + oy - 1250) / 300) * 0.18), dir: (x, y) => (r() - 0.5) * 0.25,
      len: [24, 50], wid: [7, 12], size: (x, y) => persp(y + oy), cover: 2.4, noise: 0.05, broken: 0.06, max: 9000 });
    // nesne listesi: [yDünya, çizici] — uzaktan yakına sıralanır
    const items = [];
    const okDry = (xw, yw, m) => waterGap(xw, yw) > m;
    // bağ sıraları (asma): sol ve sağ, kaybolma noktasına yönelen sıralar
    const VP = [540, 790];
    const vines = (xA, xB, slopes) => {
      for (const sl of slopes) {
        for (let yw = 1130; yw < 1430;) {
          const xw = VP[0] + (yw - VP[1]) / sl; const s = persp(yw);
          if (xw > xA && xw < xB && okDry(xw, yw, 10 + 26 * s) && okDry(xw, yw - 30 * s, 4)) items.push([yw, () => vineBush(sx(xw), sy(yw), s)]);
          yw += 13 + 22 * s;
        }
      }
    };
    vines(-200, 470, [-0.42, -0.5, -0.6, -0.74, -0.95, -1.3, -2.0]);
    vines(640, 1280, [0.42, 0.5, 0.6, 0.74, 0.95, 1.3]);
    function vineBush(x, y, s) {
      const n = Math.round(5 + s * 5);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.4; const rad = 18 * s * (0.3 + r() * 0.7);
        const px = x + Math.cos(a) * rad, py = y - 16 * s + Math.sin(a) * rad * 0.7;
        const vi = clamp(Math.floor((1 - (py - (y - 34 * s)) / (34 * s)) * 4.5 + (r() - 0.5)), 0, 5);
        leaf(S, px, py, a + (r() - 0.5), 13 * s + 5, 8 * s + 3, ['#0C4B39', '#135F42', '#1E784C', '#2E9254', '#48AA5C', '#78C466'][vi]);
      }
      // salkımlar (altın-yeşil)
      const m = 1 + Math.floor(r() * 2);
      for (let q = 0; q < m; q++) {
        const gx = x + (r() - 0.5) * 22 * s, gy = y - 6 * s; const br = 1.6 + 1.6 * s;
        for (let row = 0; row < 3; row++) for (let c = 0; c < 3 - row; c++) fill(S, circ(gx + (c - (2 - row) / 2) * br * 1.7, gy + row * br * 1.5, br), ['#9DB33A', '#B9CC52', '#D2DF7C'][clamp(2 - row + (r() < 0.3 ? -1 : 0), 0, 2)], { h: 165 });
      }
    }
    // meyve bahçesi ağaççıkları (altın gövde, yuvarlak taç, meyve)
    function orchardTree(x, y, s, fruit) {
      const th = 26 * s; Paint.drawStroke(S, x, y - th / 2, Math.PI / 2, th, 5 * s + 1, GOLD[3], { dry: 0 });
      Paint.drawStroke(S, x + 1.5 * s, y - th / 2, Math.PI / 2, th * 0.9, 2 * s, GOLD[5], { dry: 0, height: false });
      const R = 24 * s; const tcx = x, tcy = y - th - R * 0.6;
      const crown = smoothPath(blobPts(tcx, tcy, R, R * 0.86, 18, 0.12, Math.floor(r() * 1e5)));
      S.rim(crown, { w: 1.8 * s + 0.6 });
      fill(S, crown, '#1C7A4C', { h: 140 });
      field(S, { bbox: [tcx - R - 6, tcy - R - 6, tcx + R + 6, tcy + R + 6], mask: (px, py) => Math.hypot(px - tcx, (py - tcy) / 0.86) < R * 1.02, ramp: ['#0D4F3B', '#166645', '#22804E', '#33995A', '#56B163', '#86C86C'],
        shade: Paint.sphere(tcx - R * 0.2, tcy - R * 0.45, R * 1.2, [-0.3, -0.95], 0.1), dir: (px, py) => Math.atan2(py - tcy, px - tcx) + (r() - 0.5) * 0.8, len: [10, 18], wid: [5, 8], size: () => 0.6 + s * 0.5, cover: 3, leaf: true, noise: 0.06 });
      const nf = Math.round(4 + s * 4);
      for (let i = 0; i < nf; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.75; const fx = tcx + Math.cos(a) * d, fy = tcy + Math.sin(a) * d * 0.8 + R * 0.12; const fr = 2 + 2.4 * s; fill(S, circ(fx, fy, fr), fruit, { h: 170 }); fill(S, circ(fx - fr * 0.35, fy - fr * 0.35, fr * 0.35), shade(fruit, 0.25, 0.6), { h: 180 }); }
    }
    // boşluk (iki köşk arası) ve kenarlarda meyve bahçeleri
    [[536, 968, 0.42, RUBY[3]], [566, 962, 0.4, '#E3A93A'], [552, 990, 0.5, RUBY[2]], [1110, 1000, 0.6, RUBY[3]], [1180, 1016, 0.66, '#E3A93A'], [1240, 1004, 0.6, RUBY[2]], [-60, 1004, 0.6, RUBY[3]], [-130, 1012, 0.66, '#E3A93A'], [-180, 1000, 0.6, RUBY[2]],
      [150, 1210, 0.8, RUBY[3]], [-40, 1180, 0.82, '#E3A93A'], [60, 1235, 0.86, RUBY[2]], [940, 1150, 0.8, RUBY[3]], [1060, 1170, 0.84, '#E3A93A'], [1180, 1140, 0.8, RUBY[2]]]
      .forEach(([x, y, s, f]) => { if (okDry(x, y, 6) && okDry(x, y - 50 * s, 8)) items.push([y, () => orchardTree(sx(x), sy(y), s, f)]); });
    // gül çitleri: köşk teraslarının önü (su çıkışları açık bırakılır)
    const exits = [[250, 70], [78, 36], [432, 36], [830, 66], [668, 34], [994, 34]];
    const openAt = (x, y) => exits.every(([ex, ew]) => Math.abs(x - ex) > ew || Math.abs(y - (ex < 540 ? 1076 : 1006)) > 30);
    for (let x = -12; x < 516; x += 11 + r() * 8) if (openAt(x, 1076)) items.push([1080, ((xx) => () => roseBush(S, sx(xx), sy(1080 + r() * 4), 15 + r() * 7, {}))(x)]);
    for (let x = 590; x < 1074; x += 11 + r() * 8) if (openAt(x, 1006)) items.push([1010, ((xx) => () => roseBush(S, sx(xx), sy(1010 + r() * 4), 14 + r() * 6, {}))(x)]);
    // derelerin uzak kıyısı boyunca gül sınırları
    for (const st of STREAMS) {
      if (st.id === 'M') continue;
      const { P, N } = st; let acc = 0;
      for (let i = 4; i < P.length; i++) {
        acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc < 15) continue; acc = 0;
        const sgn = N[i][1] < 0 ? 1 : -1; // yukarı bakan (uzak) kıyı
        const d = P[i][2] / 2 + bankW(P[i][1]) + 8;
        const xw = P[i][0] + N[i][0] * d * sgn, yw = P[i][1] + N[i][1] * d * sgn;
        if (yw > 1400 || waterGap(xw, yw) < 3) continue;
        items.push([yw, () => roseBush(S, sx(xw), sy(yw), 12 + persp(yw) * 7, {})]);
      }
    }
    // dağınık çiçek noktaları
    for (let i = 0; i < 520; i++) {
      const xw = ox + r() * w, yw = 960 + r() * 470; if (!S.x.isPointInPath(region, sx(xw), sy(yw)) || !okDry(xw, yw, 2)) continue;
      const s = persp(yw); const col = r.pick(['#FBF3F2', '#F5B5CC', '#F6CF62', '#E8687F', '#FFFFFF', '#CFC2EE']);
      items.push([yw - 1000, () => { fill(S, circ(sx(xw), sy(yw), 1.5 + 2.2 * s), col, { h: 168 }); }]);
    }
    items.sort((a, b) => a[0] - b[0]);
    for (const [, f] of items) f();
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-orta', paintMid);

  // ================================================================ 6. IRMAK SİSTEMİ (yüzeyde akan, oyuksuz)
  const RIV = { x: -200, y: 1000, w: 1480, h: 1100 };
  const gTop = (xw) => 1376 + 12 * Math.sin(xw * 0.012 + 0.5) + 7 * Math.sin(xw * 0.033 + 2);
  function pearlDome(S, x, y, R, seed) { // kıyıdaki küçük oyuk inci kubbe (taban y)
    const r = S.r;
    S.x.save(); S.x.globalAlpha = 0.45; S.x.fillStyle = '#5C5A86'; S.x.beginPath(); S.x.ellipse(x + R * 0.08, y + R * 0.02, R * 1.08, R * 0.24, 0, 0, TAU); S.x.fill(); S.x.restore();
    const cy = y - R * 0.42; const body = new Path2D();
    const a0 = Math.asin(clamp((y - cy) / R)); body.arc(x, cy, R, a0, Math.PI - a0, true); body.closePath();
    S.rim(body, { w: 1.6 + R * 0.03, alpha: 0.8 });
    fill(S, body, PEARL[3], { h: 150 });
    field(S, { bbox: [x - R, cy - R, x + R, y], clip: body, ramp: PEARL, shade: Paint.sphere(x - R * 0.3, cy - R * 0.4, R * 1.2, [-0.4, -0.9], 0.18),
      dir: (px, py) => Math.atan2(py - cy, px - x) + Math.PI / 2 + (r() - 0.5) * 0.2, len: [R * 0.4, R * 0.8], wid: [Math.max(2.5, R * 0.1), Math.max(4, R * 0.17)], cover: 3, noise: 0.04,
      colorF: (px, py, ki, c) => { if (ki < 1 || ki > 4) return c; const u = ((px - x) * 0.6 + (py - cy) * 0.8) / R; return mix(c, NACRE[(Math.floor((u + 1.5) * 2) + 10) % NACRE.length], 0.5); } });
    if (R > 22) { // içi ışıklı alçak kapı (oyuk inci)
      const dw = R * 0.34, dh = R * 0.5; const dx = x + R * 0.12; const dp = new Path2D();
      dp.moveTo(dx - dw / 2, y); dp.lineTo(dx - dw / 2, y - dh + dw / 2); dp.arc(dx, y - dh + dw / 2, dw / 2, Math.PI, 0); dp.lineTo(dx + dw / 2, y); dp.closePath();
      fill(S, dp, '#F6E3D8', { h: 140 }); fill(S, rectPath(dx - dw / 2, y - dh * 0.45, dw * 0.35, dh * 0.45), '#E7CFD6', { h: 135, alpha: 0.8 });
    }
    arc(S, x - R * 0.06, cy - R * 0.04, R * 0.66, Math.PI * 1.1, Math.PI * 1.45, R * 0.13, '#FFFFFF', { alpha: 0.85 });
    void seed;
  }
  function paintRiver() {
    const { w, h } = RIV; const ox = RIV.x, oy = RIV.y;
    const S = Paint.sprite(w, h, { seed: 5606, k: 1 }); const r = S.r;
    const sx = (xw) => xw - ox, sy = (yw) => yw - oy;
    const persp = (yw) => 0.5 + clamp((yw - 1050) / 850) * 1.1;
    // -- 1. ön zemin (çimen, serin uzayan gölge)
    const gp = new Path2D(); gp.moveTo(-10, h + 10); for (let x = -10; x <= w + 10; x += 10) gp.lineTo(x, sy(gTop(x + ox))); gp.lineTo(w + 10, h + 10); gp.closePath();
    S.rim(gp, { w: 2.4, alpha: 0.7 });
    const grass = ['#0C3F3E', '#115047', '#17624D', '#1F7653', '#2B8B58', '#3EA05E', '#5CB565', '#82C86C'];
    fill(S, gp, grass[3], { h: 140 });
    const shadeG = (x, y) => { const xw = x + ox, yw = y + oy; const edge = Math.min(Math.abs(xw - 0), Math.abs(xw - 1080)); return clamp(0.66 - clamp((yw - 1420) / 520) * 0.34 - clamp(1 - edge / 360) * 0.16 + (NOISE(x * 0.0045 + 7, y * 0.007) - 0.5) * 0.5); };
    field(S, { bbox: [-10, sy(1350), w + 10, h + 10], path: gp, ramp: grass, shade: shadeG, dir: (x, y) => (r() - 0.5) * 0.35, len: [26, 56], wid: [8, 14], size: (x, y) => persp(y + oy), cover: 2.3, noise: 0.05, broken: 0.07, max: 9000 });
    // çimen uçları (üst kenarı kırar)
    for (let x = -10; x < w + 10; x += 5 + r() * 6) { const yy = sy(gTop(x + ox)) + 2; Paint.drawStroke(S, x, yy - 5, -Math.PI / 2 + (r() - 0.5) * 0.6, 12 + r() * 10, 3 + r() * 2, r.pick(grass.slice(3, 7)), { dry: 0.5 }); }
    // -- 2. kıyılar (zeminle aynı düzlemde: altın ve inci şeritler)
    const GB = ['#C49A44', '#D7B25A', '#E6C574', '#F1D894', '#F8E8BA'], PB = ['#B6AECB', '#CDC6DB', '#E0DAE6', '#EEEAF0', '#FAF7F6'];
    const bankShade = (x, y) => clamp(0.72 - clamp((y + oy - 1500) / 500) * 0.3 + (NOISE(x * 0.02, y * 0.02) - 0.5) * 0.3);
    for (const st of STREAMS) for (const side of [0, 1]) {
      const bp = bankPath(st, side, ox, oy); const kind = st.banks[side];
      const bb = bboxOf(st.P.map((p) => [p[0] - ox, p[1] - oy, p[2] + 2 * bankW(p[1]) + 10]), 4);
      fill(S, bp, kind === 'gold' ? GB[2] : PB[2], { h: 150 });
      field(S, { bbox: bb, clip: bp, ramp: kind === 'gold' ? GB : PB, shade: bankShade, dir: (x, y) => { const f = flowDir(x + ox, y + oy); return Math.atan2(f[1], f[0]) + (r() - 0.5) * 0.3; }, len: [12, 30], wid: [4, 8], size: (x, y) => persp(y + oy), cover: 2.4, noise: 0.08,
        colorF: kind === 'pearl' ? (x, y, ki, c) => (ki >= 2 && r() < 0.45 ? mix(c, r.pick(NACRE), 0.5) : c) : (x, y, ki, c) => (ki >= 3 && r() < 0.12 ? '#FFF6D6' : c) });
    }
    // -- 3. su: yatak (inci-yakut çakıllar) → saydam turkuaz katlar → yüzey akış darbeleri
    const wp = waterPath(ox, oy);
    const dep = (x, y) => depthAt(x + ox, y + oy);
    const fdir = (x, y) => { const f = flowDir(x + ox, y + oy); return Math.atan2(f[1], f[0]); };
    S.rim(wp, { w: 1.6, alpha: 0.6, color: '#2E7E86' });
    fill(S, wp, '#8ED9D2', { h: 135 });
    const BED = ['#3D9FAE', '#5FBBC0', '#86D1CD', '#AEE3DB', '#D3F2EA', '#EFFAF4'];
    const wbb = [sx(-20), sy(990), sx(1100), h + 10];
    field(S, { bbox: wbb, path: wp, ramp: BED, shade: (x, y) => clamp(1 - dep(x, y) * 1.05), dir: (x, y) => fdir(x, y) + (r() - 0.5) * 0.25, len: [18, 40], wid: [6, 11], size: (x, y) => persp(y + oy), cover: 2.2, noise: 0.06, broken: 0.05, height: false });
    // çakıllar
    S.x.save(); S.hx.save(); S.x.clip(wp); S.hx.clip(wp);
    for (let i = 0; i < 1500; i++) {
      const x = wbb[0] + r() * (wbb[2] - wbb[0]), y = wbb[1] + r() * (wbb[3] - wbb[1]);
      if (!S.x.isPointInPath(wp, x, y)) continue;
      const d = dep(x, y); const s = persp(y + oy); const pr = (2 + r() * 3.4) * s;
      const kind = r(); const wc = mix('#BDEDE6', '#3EA6B2', d);
      let c0, c1, c2;
      if (kind < 0.62) { c0 = '#F2EDF2'; c1 = '#BEB4D2'; c2 = '#FFFFFF'; } else if (kind < 0.9) { c0 = '#BE1D35'; c1 = '#74101F'; c2 = '#FF9AA2'; } else { c0 = '#E6C054'; c1 = '#9C6A1C'; c2 = '#FFF0B8'; }
      const t = 0.18 + d * 0.5; const ang = r() * Math.PI;
      S.x.save(); S.x.translate(x, y); S.x.rotate(ang);
      S.x.fillStyle = mix(c1, wc, t); S.x.beginPath(); S.x.ellipse(pr * 0.12, pr * 0.14, pr, pr * 0.72, 0, 0, TAU); S.x.fill();
      S.x.fillStyle = mix(c0, wc, t); S.x.beginPath(); S.x.ellipse(0, 0, pr * 0.92, pr * 0.64, 0, 0, TAU); S.x.fill();
      S.x.fillStyle = mix(c2, wc, t * 0.6); S.x.beginPath(); S.x.ellipse(-pr * 0.3, -pr * 0.22, pr * 0.3, pr * 0.2, 0, 0, TAU); S.x.fill();
      S.x.restore();
      S.hx.save(); S.hx.fillStyle = 'rgb(165,165,165)'; S.hx.beginPath(); S.hx.ellipse(x, y, pr, pr * 0.7, ang, 0, TAU); S.hx.fill(); S.hx.restore();
    }
    S.x.restore(); S.hx.restore();
    // saydam su katları (derinde daha yoğun turkuaz)
    const WT = ['#23859A', '#2F9CAA', '#45B2B8', '#6CC8C6', '#9ADCD5', '#C6EEE7'];
    field(S, { bbox: wbb, path: wp, clip: wp, ramp: WT, shade: (x, y) => clamp(1 - dep(x, y) * 0.95 - clamp((y + oy - 1600) / 600) * 0.12), dir: (x, y) => fdir(x, y) + (r() - 0.5) * 0.12, len: [40, 90], wid: [8, 14], size: (x, y) => persp(y + oy),
      cover: 1.6, noise: 0.05, alphaF: (x, y) => 0.18 + dep(x, y) * 0.55, height: false, dry: 0.3 });
    // yüzey: akış yönünde uzun açık darbeler ve kıyıdan yansıyan yeşil-serin çizgiler
    field(S, { bbox: wbb, path: wp, clip: wp, ramp: ['#1E7486', '#BFEFE8', '#E4FAF6', '#F7FFFD'], shade: (x, y) => (r() < 0.12 ? 0.1 : 0.4 + r() * 0.6), dir: (x, y) => fdir(x, y) + (r() - 0.5) * 0.08, len: [36, 110], wid: [2, 4.5], size: (x, y) => persp(y + oy), cover: 0.55, noise: 0, broken: 0, alphaF: (x, y) => 0.45 + dep(x, y) * 0.35, dry: 0.5 });
    // ıslak kenar çizgisi (kıyı ile su aynı düzlemde; ince ışıklı menisküs)
    for (const st of STREAMS) for (const sd of [1, -1]) {
      for (let i = 2; i < st.P.length - 1; i += 1) {
        if (r() < 0.25) continue;
        const o = sd > 0 ? waterA(st)(i) : waterB(st)(i); const p = st.P[i], n = st.N[i], t = st.T[i];
        const xw = p[0] + n[0] * (o - sd * 2), yw = p[1] + n[1] * (o - sd * 2); if (depthAt(xw, yw) > 0.35) continue;
        Paint.drawStroke(S, sx(xw), sy(yw), Math.atan2(t[1], t[0]), (12 + r() * 14) * persp(yw), (1.6 + r()) * persp(yw) * 0.8, r() < 0.7 ? '#F4FFFC' : '#9EDDD8', { dry: 0.3, alpha: 0.85 });
      }
    }
    // -- 4. kıyılarda inci kubbecikler (oyuk inci)
    const domes = [];
    const M = STREAMS.find((s) => s.id === 'M');
    const atM = (t, side, kR = 1) => { const i = Math.round(t * (M.P.length - 1)); const p = M.P[i], n = M.N[i]; const sgn = side === 0 ? 1 : -1; const bw = bankW(p[1]); const R = (8 + Math.max(0, p[1] - 1050) * 0.042) * kR; const d = p[2] / 2 + bw * 0.5 + R * 0.75; return [p[0] + n[0] * d * sgn, p[1] + n[1] * d * sgn, R]; };
    [[0.06, 1, 0.8], [0.4, 1, 1], [0.47, 1, 0.7], [0.62, 1, 1], [0.84, 1, 0.95], [0.9, 1, 0.65], [0.12, 0, 0.75], [0.55, 0, 0.9], [0.74, 0, 1], [0.79, 0, 0.6]].forEach(([t, sd, kR]) => domes.push(atM(t, sd, kR)));
    const atS = (id, t, side, R) => { const st = STREAMS.find((s) => s.id === id); const i = Math.round(t * (st.P.length - 1)); const p = st.P[i], n = st.N[i]; const sgn = side === 0 ? 1 : -1; const d = p[2] / 2 + bankW(p[1]) * 0.5 + R * 0.8; return [p[0] + n[0] * d * sgn, p[1] + n[1] * d * sgn, R]; };
    domes.push(atS('L', 0.55, 0, 10), atS('R', 0.6, 1, 10), atS('L', 0.3, 0, 8), atS('R', 0.35, 1, 8));
    domes.sort((a, b) => a[1] - b[1]);
    for (const [xw, yw, R] of domes) if (yw < 1300 || yw > 1450) pearlDome(S, sx(xw), sy(yw), R, Math.round(xw));
    // -- 5. kıyı dışı küçük çiçek tutamları
    for (const st of STREAMS) {
      const { P, N } = st;
      for (let i = 6; i < P.length; i += 3) {
        if (r() < 0.35) continue;
        const sgn = r() < 0.5 ? 1 : -1; const bw = bankW(P[i][1]); const d = P[i][2] / 2 + bw + 4 + r() * 10;
        const xw = P[i][0] + N[i][0] * d * sgn, yw = P[i][1] + N[i][1] * d * sgn;
        if (waterGap(xw, yw) < 2 || domes.some(([dx, dy, R]) => Math.hypot(dx - xw, dy - yw) < R * 1.4)) continue;
        const s = persp(yw);
        if (yw < gTop(xw) - 4 && N[i][1] * sgn < 0) continue; // uzak kıyı orta kuşakta
        roseBush(S, sx(xw), sy(yw), 7 + 9 * s, { roses: 1 + Math.floor(r() * 2) });
      }
    }
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-irmak', paintRiver);

  // ================================================================ 7. ÇERÇEVE AĞAÇLARI (altın gövde, zümrüt taç, alçak sarkan meyve)
  function paintPom(S, x, y, R) { // sarkık nar: taç altta
    const body = smoothPath(blobPts(x, y, R, R * 0.95, 22, 0.04, Math.floor(S.r() * 1e5)));
    S.rim(body, { w: 1.6 });
    fill(S, body, RUBY[2], { h: 150 });
    field(S, { bbox: [x - R, y - R, x + R, y + R], clip: body, ramp: RUBY, shade: Paint.sphere(x - R * 0.3, y - R * 0.35, R * 1.1), dir: (px, py) => Math.atan2(py - (y + R * 1.3), px - x) + Math.PI / 2 + (S.r() - 0.5) * 0.3, len: [R * 0.5, R * 0.9], wid: [3.5, 6], cover: 3.2, noise: 0.04 });
    const cr = new Path2D(); const cw = R * 0.32, ct = y + R * 0.82;
    cr.moveTo(x - cw, ct); for (let i = 0; i <= 5; i++) { const xx = x - cw + (i / 5) * cw * 2; cr.lineTo(xx + (i % 2 ? 0 : 1) * 0, ct + (i % 2 ? R * 0.32 : R * 0.1)); } cr.lineTo(x + cw, ct); cr.closePath();
    fill(S, cr, '#7A1424', { h: 150 });
    fill(S, circ(x - R * 0.38, y - R * 0.42, R * 0.16), '#FBB9B8', { h: 180 });
    fill(S, circ(x - R * 0.48, y - R * 0.5, R * 0.07), '#FFF0EE', { h: 185 });
  }
  function paintGrapes(S, x, y, s, cols) { // salkım: üstte geniş
    const berry = 7.5 * s; const rows = 6;
    const list = [];
    for (let row = 0; row < rows; row++) { const n = Math.max(1, Math.round(4.2 - row * 0.62)); for (let c = 0; c < n; c++) list.push([x + (c - (n - 1) / 2) * berry * 1.55 + (S.r() - 0.5) * berry * 0.4, y + row * berry * 1.32 + (S.r() - 0.5) * 2, row]); }
    Paint.drawStroke(S, x, y - berry * 1.4, Math.PI / 2, berry * 2.4, 2.4, '#6B5A1C', { dry: 0 });
    for (const [bx, by, row] of list) {
      const t = row / rows; const c0 = cols[clamp(Math.round(2 + (S.r() - 0.5) * 1.6 - t), 0, cols.length - 1)];
      S.rim(circ(bx, by, berry), { w: 1.1, alpha: 0.6 });
      fill(S, circ(bx, by, berry), shade(c0, -0.06), { h: 160 });
      fill(S, circ(bx - berry * 0.12, by - berry * 0.14, berry * 0.78), c0, { h: 165 });
      fill(S, circ(bx - berry * 0.36, by - berry * 0.38, berry * 0.24), '#FCFBE6', { h: 185 });
    }
  }
  function paintDates(S, x, y, s) { // altın hurma salkımı: ana sap, sarkık teller
    const r = S.r; const n = 9;
    Paint.drawStroke(S, x, y + 10 * s, Math.PI / 2 + 0.1, 30 * s, 5 * s, '#C67C1E', { dry: 0 });
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.12; const L = (60 + r() * 30) * s; const x0 = x + Math.cos(a) * 18 * s, y0 = y + 22 * s;
      const pts = []; for (let q = 0; q <= 6; q++) { const t = q / 6; pts.push([x0 + Math.cos(a) * L * t + Math.sin(t * 3 + i) * 3 * s, y0 + Math.sin(a) * L * t]); }
      S.line(pts, 2 * s, '#B8701C', { w1: 1.4 * s, edge: false });
      for (let q = 1; q <= 6; q++) {
        const [fx, fy] = pts[q]; const side = q % 2 ? 1 : -1; const c = r.pick(['#E2A02E', '#D88A22', '#EDB848', '#C9741C']);
        const ex = fx + side * 4.5 * s, ey = fy + 2 * s;
        S.x.save(); S.x.translate(ex, ey); S.x.rotate(side * 0.35); S.x.fillStyle = shade(c, -0.12); S.x.beginPath(); S.x.ellipse(0.6, 0.8, 4.2 * s, 6.8 * s, 0, 0, TAU); S.x.fill();
        S.x.fillStyle = c; S.x.beginPath(); S.x.ellipse(0, 0, 3.8 * s, 6.2 * s, 0, 0, TAU); S.x.fill(); S.x.fillStyle = '#FFE9A8'; S.x.beginPath(); S.x.ellipse(-1.3 * s, -2 * s, 1.1 * s, 2 * s, 0, 0, TAU); S.x.fill(); S.x.restore();
        S.hx.save(); S.hx.fillStyle = 'rgb(165,165,165)'; S.hx.beginPath(); S.hx.ellipse(ex, ey, 4 * s, 6.5 * s, 0, 0, TAU); S.hx.fill(); S.hx.restore();
      }
    }
  }
  function paintTree(cfgT) {
    const w = 880, h = 2060; const mir = cfgT.mirror;
    const S = Paint.sprite(w, h, { seed: cfgT.seed, k: 1 }); const r = S.r;
    const MX = (x) => (mir ? w - x : x);
    const M = (pts) => pts.map(([x, y, ww]) => [MX(x), y, ww]);
    // gövde ve dallar (sol ağaç koordinatında tanımlı; sağ ağaç aynalanır)
    const trunk = [[200, 2080, 156], [214, 1900, 138], [242, 1660, 118], [278, 1400, 104], [304, 1150, 94], [318, 950, 84], [326, 800, 76], [330, 690, 70]];
    const boughs = [
      [[330, 700, 66], [312, 560, 54], [284, 420, 44], [236, 280, 34], [176, 140, 26], [120, -20, 20]],
      [[330, 700, 62], [400, 560, 46], [480, 430, 38], [580, 330, 30], [690, 250, 22], [800, 190, 16], [900, 160, 12]],
      [[318, 860, 40], [240, 780, 32], [150, 730, 24], [60, 720, 18], [-20, 740, 14]],
      [[284, 420, 28], [380, 300, 22], [480, 210, 17], [580, 130, 13], [680, 70, 10]],
      [[236, 280, 22], [320, 160, 16], [400, 60, 12], [460, -10, 10]],
      [[480, 430, 18], [520, 520, 12], [540, 610, 8]],
    ];
    const G2 = ['#6A4210', '#8A5A16', '#AE7C20', '#CF9E2E', '#E6BC48', '#F4D678', '#FFEDB0'];
    const silT = new Path2D();
    // dallar önce (yaprakların arkasında kalır), gövde sonra
    boughs.slice(2).forEach((b, i) => tube(S, M(b), G2, { len: [24, 50], wid: [5, 9], nz: i * 3 + 1, lit: [mir ? 0.6 : -0.6, -0.8] }));
    tube(S, M(boughs[0]), G2, { len: [30, 60], wid: [6, 11], nz: 11, lit: [mir ? 0.6 : -0.6, -0.8] });
    tube(S, M(boughs[1]), G2, { len: [30, 60], wid: [6, 11], nz: 13, lit: [mir ? 0.6 : -0.6, -0.8] });
    const tr = tube(S, M(trunk), G2, { len: [50, 110], wid: [9, 15], nz: 17, lit: [mir ? 0.6 : -0.6, -0.8], cover: 2.8 });
    void silT;
    // gövde kabuğu: koyu kehribar oluklar ve açık altın şeritler
    const TP = crSample(M(trunk), 8); const TT = tangents(TP);
    for (let i = 0; i < 140; i++) {
      const q = Math.floor(r() * (TP.length - 3)) + 1; const p = TP[q], t = TT[q]; const n = [-t[1], t[0]]; const off = (r() - 0.5) * p[2] * 0.78;
      const lit = (n[0] * (mir ? 0.6 : -0.6) + n[1] * -0.8) * Math.sign(off) > 0;
      const c = r() < 0.55 ? (lit ? '#FFF1BC' : '#5E3A0C') : (lit ? '#F7DC86' : '#875614');
      Paint.drawStroke(S, p[0] + n[0] * off, p[1] + n[1] * off, Math.atan2(t[1], t[0]) + (r() - 0.5) * 0.05, 40 + r() * 110, 2.4 + r() * 2.6, c, { dry: 0.4, alpha: 0.85 });
    }
    // kök tabanı: hafif genişleme
    // ---- taç: yaprak kümeleri (arka → ön)
    const clumps = [];
    const along = (pts, rA, rB, step, jit, pass) => { const P = crSample(pts, 10); let acc = step * 0.5; for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc >= step) { acc = 0; const t = i / (P.length - 1); clumps.push([P[i][0] + (r() - 0.5) * jit, P[i][1] + (r() - 0.5) * jit * 0.7, lerp(rA, rB, t) * (0.82 + r() * 0.36), pass]); } } };
    // köşe kütlesi (arka)
    for (let i = 0; i < 26; i++) clumps.push([-30 + r() * 420, -40 + r() * (i < 18 ? 420 : 640), 95 + r() * 55, 0]);
    // üst bant (iç kemer) — alt kenarı köşk kubbesinin üstünde kalır
    for (let i = 0; i < 18; i++) { const x = 300 + r() * 560; const ymax = lerp(250, 150, (x - 300) / 560); clumps.push([x, -30 + r() * (ymax + 10), 70 + r() * 50, 0]); }
    along(boughs[1], 110, 60, 70, 40, 1);
    along(boughs[0], 120, 90, 80, 50, 1);
    along(boughs[3], 85, 55, 70, 30, 1);
    along(boughs[4], 80, 60, 70, 30, 1);
    along(boughs[2], 85, 50, 60, 40, 1);
    // ön kümeler: alt kenarda, sarkık
    [[300, 600, 72], [250, 700, 64], [160, 640, 80], [340, 470, 66], [440, 330, 64], [560, 260, 58], [680, 210, 54], [790, 170, 48], [120, 820, 60], [60, 760, 70], [220, 840, 52]].forEach(([x, y, R]) => clumps.push([x, y, R, 2]));
    // yaprak taç tabanı (kümeler arası koyu)
    const can = new Path2D(); for (const [x, y, R] of clumps) can.addPath(smoothPath(blobPts(MX(x), y, R * 0.92, R * 0.86, 18, 0.1, Math.floor(x * 3 + y))));
    S.rim(can, { w: 3 });
    fill(S, can, '#08392F', { h: 130 });
    const LEAF = ['#05302A', '#083E33', '#0B5040', '#106446', '#1A7B4D', '#279453', '#3FAD58', '#6CC45C', '#A2D752'];
    for (const pass of [0, 1, 2]) {
      const list = clumps.filter((c) => c[3] === pass).sort((a, b) => a[1] - b[1]);
      for (const [x0, y, R] of list) {
        const x = MX(x0);
        const sph = Paint.sphere(x + (mir ? 0.15 : -0.15) * R, y - R * 0.5, R * 1.25, [mir ? 0.25 : -0.25, -0.97], 0.08);
        const lift = pass === 0 ? -0.22 : pass === 1 ? -0.06 : 0.06;
        const deep = (yy) => clamp((yy - 500) / 600) * 0.12; // alt kısımlar serin gölgede
        field(S, { bbox: [x - R * 1.1, y - R * 1.1, x + R * 1.1, y + R * 1.1], mask: (px, py) => Math.hypot(px - x, (py - y) / 0.9) < R * (0.9 + NOISE(px * 0.03, py * 0.03) * 0.25),
          ramp: LEAF, shade: (px, py) => clamp(sph(px, py) * 0.95 + lift - deep(py)), dir: (px, py) => Math.atan2(py - y, px - x) + (r() - 0.5) * 1.1,
          len: [26, 42], wid: [11, 17], cover: pass === 2 ? 2.4 : 1.9, leaf: true, noise: 0.05, broken: 0.06, vein: undefined });
      }
    }
    // ---- sarkan meyveler (alçak, uzanılacak yerde)
    const GRAPE = ['#5E7A1E', '#7E9A2A', '#A3B83A', '#C6D25A', '#E2E79A'];
    const stem = (x, y0, y1, bend) => S.line([[x, y0], [x + bend * 0.5, (y0 + y1) / 2], [x + bend, y1]], 3.2, '#7A5A1C', { w1: 2.2, edge: false });
    const leafAt = (x, y, a) => leaf(S, x, y, a, 34, 15, '#1F8A50', { vein: '#0B5A40' });
    for (const f of cfgT.fruit) {
      const x = MX(f.x), y = f.y, bend = (mir ? -1 : 1) * (f.bend ?? 0);
      stem(x, y - f.len, y, bend);
      const fx = x + bend;
      if (f.t === 'nar') { const n = f.n ?? 2; for (let i = 0; i < n; i++) { const a = (i - (n - 1) / 2); paintPom(S, fx + a * 34, y + 26 + Math.abs(a) * 10, 22 + r() * 5); } leafAt(fx - 18, y - 6, -2.5); leafAt(fx + 20, y - 2, -0.5); }
      if (f.t === 'uzum') { paintGrapes(S, fx, y + 10, f.s ?? 1, GRAPE); leaf(S, fx + 16, y - 4, -0.6, 40, 26, '#2E9A52', { vein: '#127048' }); }
      if (f.t === 'hurma') { paintDates(S, fx, y - 8, f.s ?? 1); }
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: MX(200), py: 2060, k: 1, trunk: tr };
  }
  const TREE_SOL = { seed: 5701, mirror: false, fruit: [
    { t: 'nar', x: 300, y: 650, len: 36, n: 3, bend: 6 }, { t: 'uzum', x: 214, y: 830, len: 60, s: 1.1, bend: 8 }, { t: 'hurma', x: 298, y: 1020, len: 140, s: 1.05, bend: 14 },
    { t: 'nar', x: 620, y: 300, len: 34, n: 2, bend: 4 }, { t: 'uzum', x: 520, y: 350, len: 40, s: 0.95, bend: 4 }, { t: 'nar', x: 768, y: 236, len: 26, n: 1, bend: 2 }, { t: 'uzum', x: 400, y: 490, len: 46, s: 1, bend: 6 },
  ] };
  const TREE_SAG = { seed: 5702, mirror: true, fruit: [
    { t: 'uzum', x: 290, y: 660, len: 40, s: 1.1, bend: 6 }, { t: 'nar', x: 226, y: 820, len: 70, n: 3, bend: 10 }, { t: 'nar', x: 318, y: 1040, len: 160, n: 2, bend: 16 },
    { t: 'hurma', x: 600, y: 300, len: 30, s: 0.9, bend: 4 }, { t: 'nar', x: 470, y: 400, len: 36, n: 2, bend: 4 }, { t: 'uzum', x: 740, y: 240, len: 30, s: 0.85, bend: 2 },
  ] };
  defSprite('cennet-agac-sol', () => paintTree(TREE_SOL));
  defSprite('cennet-agac-sag', () => paintTree(TREE_SAG));

  // ================================================================ 8. KIYI GÜLLERİ (~160 px; k = 1.5)
  function paintFlowers(seed, cols, kind) {
    const K = 1.5, Wd = 170, Hd = 170;
    const S = Paint.sprite(Wd * K, Hd * K, { seed, k: K }); const r = S.r; const X = (v) => v * K;
    const bx = Wd / 2, by = Hd - 4;
    // saplar
    const heads = kind === 1 ? [[bx - 30, 78, 23], [bx + 26, 64, 26], [bx - 2, 104, 21], [bx + 50, 104, 15], [bx - 56, 112, 14]]
      : kind === 2 ? [[bx - 22, 62, 24], [bx + 30, 86, 22], [bx - 46, 106, 17], [bx + 6, 112, 18]]
        : [[bx, 60, 25], [bx - 40, 92, 20], [bx + 40, 96, 21], [bx - 10, 118, 15]];
    for (const [hx, hy] of heads) S.line([[X(bx + (hx - bx) * 0.2), X(by)], [X(bx + (hx - bx) * 0.7), X((hy + by) / 2)], [X(hx), X(hy + 8)]], X(3.2), '#1C6A3E', { w1: X(2.2), edge: false });
    // yapraklar (alt kısımda yoğun)
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.8; const rad = 20 + r() * 50;
      const px = bx + Math.cos(a) * rad * 1.05, py = by - 26 + Math.sin(a) * rad * 0.62;
      const v = clamp((py - 60) / 110); const col = ['#5FBE5C', '#36A055', '#1F8A50', '#137049', '#0B5A40'][clamp(Math.floor(v * 4.6 + (r() - 0.5)), 0, 4)];
      leaf(S, X(px), X(py), a + (r() - 0.5) * 0.9, 26 + r() * 10, 12 + r() * 4, col, { vein: shade(col, -0.12) });
    }
    // tomurcuklar
    for (let i = 0; i < 3; i++) { const x = bx + (r() - 0.5) * 120, y = 70 + r() * 50; const c = cols[0]; S.line([[X(x), X(y + 26)], [X(x + 2), X(y + 6)]], X(2.2), '#1F7A44', { edge: false }); fill(S, smoothPath(blobPts(X(x), X(y), X(5), X(8), 10, 0.05, i + seed)), c, { h: 165 }); leaf(S, X(x - 3), X(y + 5), -2, 10, 5, '#2E9A52', {}); leaf(S, X(x + 3), X(y + 5), -1.1, 10, 5, '#2E9A52', {}); }
    // güller
    heads.sort((a, b) => a[1] - b[1]).forEach(([hx, hy, rr], i) => {
      const c = cols[i % cols.length];
      S.rim(circ(X(hx), X(hy), X(rr * 0.98)), { w: 1.8, alpha: 0.85 });
      roseHead(S, X(hx), X(hy), X(rr), c);
      // ek dış taç yaprak kemerleri (fırça)
      arc(S, X(hx), X(hy + rr * 0.1), X(rr * 0.86), Math.PI * 0.1, Math.PI * 0.9, X(rr * 0.14), shade(c, -0.12), {});
      arc(S, X(hx), X(hy - rr * 0.05), X(rr * 0.72), Math.PI * 1.1, Math.PI * 1.9, X(rr * 0.12), shade(c, 0.12, 0.8), {});
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
  // kıyı gülleri için önerilen yerler (ırmak katmanının dünya koordinatı; parallax 0.9): [x, y, ad, ölçek]
  const flowerSpots = [[332, 1560, 'cennet-cicek-1', 0.62], [262, 1700, 'cennet-cicek-3', 0.78], [930, 1640, 'cennet-cicek-2', 0.76], [1000, 1860, 'cennet-cicek-1', 0.95], [176, 1900, 'cennet-cicek-2', 1.0], [828, 1512, 'cennet-cicek-3', 0.56]];
  const springs = [[250, 1076], [830, 1006]];
  const springsMinor = [[78, 1076], [432, 1076], [668, 1006], [994, 1006]];
  return {
    layers, riverPath, flowDir, springs, springsMinor, flowerSpots,
    depthAt, // 0 kıyı … 1 orta (ırmak katmanı dünya koordinatı)
    streams: STREAMS.map((s) => ({ id: s.id, ctrl: s.ctrl })),
    SKY, BAND, FAR, MID, RIV,
  };
})();
