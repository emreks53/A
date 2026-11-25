// Cennet manzarası (Perde 5): güneşsiz inci-lavanta-şeftali gök, orta tonlu lavanta bulut kuşağı, sise karışan
// yuvarlak teraslı tepeler, üst üste odalı altın-gümüş köşk (açık altın sütunlu revak üstünde) ve tek parça oyuk
// inci köşk (Buhârî 4879), orta bahçe (güller, bağlar, meyve bahçeleri), köşklerin altındaki havuzlardan doğup
// yüzeyde akan ırmak (altın kıyı ve inci kubbelerden kıyı, inci-yakut çakıllar), altın gövdeli çerçeve ağaçları.
// Işık kaynaksız, yumuşak, eşit; serin uzayan gölge (56:30). Gökte güneş, ışın ya da ışık kaynağı yok.
// Dünya koordinatı = zoom 1'de ekran pikseli (1080×1920), sol üst köken.
'use strict';
const CENNET_M = (() => {
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- palet
  const GOLD = ['#6A3C0A', '#8E5A14', '#B57C1E', '#D69E30', '#E9B947', '#F4D06C', '#FFE89A'];
  const NACRE = ['#F6D2E2', '#CFF0E2', '#D9D0F3', '#F8E4CC', '#CDE6F6'];
  const RUBY = ['#5E0A1C', '#8A1027', '#B3192F', '#D63545', '#F07B80'];
  const LEAF = ['#05302A', '#083E33', '#0B5040', '#106446', '#1A7B4D', '#279453', '#3FAD58', '#6CC45C', '#A2D752'];
  const BUSH = ['#0A4537', '#0F5A40', '#18724A', '#258C52', '#3DA65B', '#62BC62'];
  const ROSE_COLS = ['#F28DB2', '#FBF1F2', '#E04866', '#F6C24E', '#F7AE8C', '#F5B8CF', '#FFFFFF'];
  const LAWN2 = ['#17663F', '#1F7748', '#2A8A51', '#3A9E5A', '#52B062', '#70C26A', '#97D274'];
  const PEARL_R = ['#9F97C3', '#B7AED6', '#CEC6E3', '#E2DBEC', '#F1ECF3', '#FBF8F8'];

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
  // kavisli darbe (kemer bandı): merkez, yarıçap, açı aralığı, genişlik (sprite px)
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
  // yumuşak basamaklı leke (2-3 eşmerkezli düz ton): parlama değil, sedefin içten ışıması
  function softPatch(S, x, y, rx, ry, col, a = 0.35, steps = 3) {
    for (let i = 0; i < steps; i++) { const f = 1 - i / steps * 0.62; fill(S, ellipsePath(x, y, rx * f, ry * f), col, { alpha: a * (0.55 + i * 0.25), height: false }); }
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
    P.forEach((p, i) => { const ww = (p[2] / 2) * (1 + (NOISE(i * 0.21, 4.4 + seedN) - 0.5) * 0.1); const q = [p[0] + N[i][0] * ww, p[1] + N[i][1] * ww]; i ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1]); });
    for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; const ww = (p[2] / 2) * (1 + (NOISE(i * 0.21, 8.8 + seedN) - 0.5) * 0.1); path.lineTo(p[0] - N[i][0] * ww, p[1] - N[i][1] * ww); }
    path.closePath();
    const near = (x, y) => { let bi = 0, bd = 1e18; for (let i = 0; i < P.length; i++) { const dx = x - P[i][0], dy = y - P[i][1]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } } return bi; };
    const lit = o.lit ?? [-0.6, -0.8];
    const offAt = (x, y) => { const i = near(x, y); const off = clamp(((x - P[i][0]) * N[i][0] + (y - P[i][1]) * N[i][1]) / (P[i][2] / 2 + 0.01), -1, 1); const side = N[i][0] * lit[0] + N[i][1] * lit[1] > 0 ? 1 : -1; return [off, off * side, i]; };
    const shadeF = (x, y) => { const [off, u] = offAt(x, y); const base = o.prof ? o.prof(u) : 0.5 + u * 0.34 - Math.pow(Math.abs(off), 3) * 0.3; return clamp(base + (o.lift ?? 0) + (o.shadeY ? o.shadeY(y) : 0)); };
    if (o.rim !== false) S.rim(path, { w: o.rimW ?? 2.6 });
    S.region(path, { ramp: cols, shade: shadeF, dir: (x, y) => { const i = near(x, y); return Math.atan2(T[i][1], T[i][0]) + (S.r() - 0.5) * 0.06; }, len: o.len ?? [40, 90], wid: o.wid ?? [8, 14], cover: o.cover ?? 2.6, jitter: 3, noise: 0.03, rim: false, bbox: bboxOf(P, 4), broken: 0.03 });
    return { path, P, T, N, near, offAt };
  }
  // ---- güller
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
  function cupRose(S, x, y, R, col) {
    const r = S.r; const dk = shade(col, -0.15, 1.05, -6), lt = shade(col, 0.1, 0.8, 6), dd = shade(col, -0.32, 1.1, -10);
    if (R < 4) { fill(S, circ(x, y, R), col, { h: 165 }); fill(S, circ(x - R * 0.3, y - R * 0.3, R * 0.45), lt, { h: 170 }); return; }
    for (let i = 0; i < 6; i++) {
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
      const col = shade(r() < 0.75 ? c0 : r.pick(cols), (r() - 0.5) * 0.05 + (o.dim ?? 0)); const R = s * k * (0.12 + r() * 0.07);
      const px = x + Math.cos(a) * rad, py = y - s * k * 0.48 + Math.sin(a) * rad * 0.6;
      if (R > 5.5 && r() < 0.45) wildRose(S, px, py, R * 1.15, col); else cupRose(S, px, py, R, col);
    }
  }
  // yuvarlak yaprak kümesi (çalı, dal ucu): merkez, yarıçap (sprite px)
  function leafClump(S, x, y, R, o = {}) {
    const r = S.r; const ramp = o.ramp || LEAF;
    const sph = Paint.sphere(x - R * 0.1, y - R * 0.55, R * 1.25, [-0.15, -0.99], 0.06);
    field(S, { bbox: [x - R * 1.1, y - R * 1.1, x + R * 1.1, y + R * 1.1], mask: (px, py) => Math.hypot(px - x, (py - y) / (o.sy ?? 0.9)) < R * (0.88 + NOISE(px * 0.03, py * 0.03) * 0.25),
      ramp, shade: (px, py) => clamp(sph(px, py) * 0.95 + (o.lift ?? 0)), dir: (px, py) => Math.atan2(py - y, px - x) + (r() - 0.5) * 1.1,
      len: o.len || [24, 40], wid: o.wid || [10, 16], cover: o.cover ?? 2.0, leaf: true, noise: 0.05, broken: 0.06 });
  }
  // düz basamaklı ton dolgusu (piksel piksel, kırık kenarlı): colorAt(x,y) → hex; clip içinde
  function stepFill(S, bb, clipP, colorAt) {
    const x0 = Math.floor(bb[0]), y0 = Math.floor(bb[1]), w = Math.ceil(bb[2] - x0), h = Math.ceil(bb[3] - y0);
    if (w < 1 || h < 1) return;
    const c = makeCanvas(w, h); const cx = c.getContext('2d'); const id = cx.createImageData(w, h); const d = id.data; const cache = {};
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const hex = colorAt(x0 + i + 0.5, y0 + j + 0.5); const rgb = cache[hex] || (cache[hex] = hex2rgb(hex));
      const o = (j * w + i) * 4; d[o] = rgb[0]; d[o + 1] = rgb[1]; d[o + 2] = rgb[2]; d[o + 3] = 255;
    }
    cx.putImageData(id, 0, 0);
    S.x.save(); S.x.clip(clipP); S.x.drawImage(c, x0, y0); S.x.restore();
  }
  // sedef küre boyası: 5-6 düz sedef basamağı (kırık kenar), geniş yumuşak yanardöner bölgeler (pembe/nane/lila),
  // serin gölge yanı; üstüne meridyen yönünde ince fırça darbeleri. Işık kaynaksız: yüz izleyiciye baktıkça açılır.
  function nacreSphere(S, cx, cy, R, clipP, o = {}) {
    const r = S.r, k = S.k; const ramp = o.ramp || PEARL_R; const n = ramp.length; const sd = o.side ?? 1;
    const shadeF = (x, y) => { const u = (x - cx) / R, v = (y - cy) / R; const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v)); return 0.08 + nz * 0.64 - v * 0.12 - u * sd * 0.15 + (o.lift ?? 0); };
    const TINT = o.tint || ['#F2C6DA', '#C0E8D8', '#CDC3F0', '#F3D8C0'];
    const amt = o.tintAmt ?? 0.34; const tf = 1.6 / R, ef = 7 / R;
    const tab = ramp.map((c, ki) => TINT.map((t) => (ki >= 1 && ki <= n - 2 ? mix(c, t, amt) : c)));
    const colorAt = (x, y) => {
      const v = shadeF(x, y) + (NOISE(x * ef + 5.1, y * ef + 2.3) - 0.5) * 0.09; const ki = clamp(Math.floor(v * n), 0, n - 1);
      const z = clamp(Math.floor(NOISE(x * tf + 11.3, y * tf * 1.3 + 3.7) * TINT.length * 1.25 - 0.1), 0, TINT.length - 1);
      return tab[ki][z];
    };
    stepFill(S, [cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1], clipP, colorAt);
    const dirF = (x, y) => { const u = (x - cx) / R, v = clamp((y - cy) / R, -0.97, 0.97); const sq = Math.sqrt(1 - v * v); return Math.atan2(sq, -v * u / sq * 1.6) + (r() - 0.5) * 0.1; };
    if (R / k < 7) return colorAt;
    field(S, { bbox: [cx - R, cy - R, cx + R, cy + R], clip: clipP, mask: (x, y) => Math.hypot(x - cx, y - cy) < R * 0.98, ramp: [ramp[0]], shade: Paint.cst(0.5), dir: dirF,
      len: [R * 0.16 / k, R * 0.34 / k], wid: [Math.max(1.6, R * 0.035 / k), Math.max(2.4, R * 0.06 / k)], cover: o.cover ?? 1.1, noise: 0, broken: 0, lJit: 0.02, hJit: 3, dry: 0.3,
      colorF: (x, y) => colorAt(x, y) });
    return colorAt;
  }

  // ================================================================ IRMAK GEOMETRİSİ (ırmak katmanı dünya koordinatı)
  // ctrl: [x, y, genişlik]; banks: [A tarafı (+normal), B tarafı (−normal)]. Dereler köşklerin açık revaklarının
  // altındaki havuzlardan (ön kenar = köşk pivotu) doğar, birleşip izleyiciye doğru genişleyen ana ırmak olur.
  const STREAM_DEFS = [
    { id: 'L', banks: ['gold', 'gold'], ctrl: [[250, 1077, 196], [251, 1098, 146], [257, 1124, 104], [280, 1158, 80], [338, 1196, 70], [426, 1232, 74], [510, 1258, 82], [562, 1274, 88]] },
    { id: 'R', banks: ['pearl', 'pearl'], ctrl: [[830, 1007, 168], [829, 1029, 128], [822, 1057, 94], [796, 1091, 72], [736, 1138, 64], [664, 1194, 70], [606, 1240, 80], [568, 1270, 88]] },
    { id: 'M', banks: ['gold', 'pearl'], ctrl: [[560, 1236, 104], [538, 1290, 120], [500, 1350, 138], [476, 1420, 158], [494, 1500, 192], [576, 1582, 232], [684, 1678, 284], [712, 1790, 342], [646, 1918, 420], [566, 2050, 510], [522, 2190, 580], [504, 2330, 640], [498, 2470, 680]] },
  ];
  const STREAMS = STREAM_DEFS.map((d) => {
    const P = crSample(d.ctrl, 18); const T = tangents(P); const N = T.map(([tx, ty]) => [-ty, tx]);
    const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    return { ...d, P, T, N, L, len: L[L.length - 1] };
  });
  const sIdx = (st) => STREAMS.indexOf(st);
  const bankBase = (y) => 6 + Math.max(0, y - 1000) * 0.05; // perspektifle genişleyen kıyı
  // kıyı genişliği akış boyunca değişir; yan dereler birleşmeden önceki son 60 px'te sıfıra iner
  function bankWi(st, i, side) {
    const v = NOISE(st.L[i] * 0.011 + sIdx(st) * 7.7 + side * 3.1, 2.2 + side * 5.3);
    let wv = bankBase(st.P[i][1]) * (0.45 + v * 1.05);
    if (st.id !== 'M') wv *= clamp((st.len - st.L[i]) / 60);
    return wv;
  }
  const wob = (i, s, side) => (NOISE(i * 0.17 + s * 13.1, side * 7.3 + 2) - 0.5) * 6;
  const waterA = (st) => (i) => st.P[i][2] / 2 + wob(i, sIdx(st), 1);
  const waterB = (st) => (i) => -(st.P[i][2] / 2 + wob(i, sIdx(st), 2));
  function ribbon(st, fa, fb, ox = 0, oy = 0) {
    const p = new Path2D(); const { P, N } = st;
    for (let i = 0; i < P.length; i++) { const o = fa(i); const q = [P[i][0] + N[i][0] * o - ox, P[i][1] + N[i][1] * o - oy]; i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }
    for (let i = P.length - 1; i >= 0; i--) { const o = fb(i); p.lineTo(P[i][0] + N[i][0] * o - ox, P[i][1] + N[i][1] * o - oy); }
    p.closePath(); return p;
  }
  function waterPath(ox = 0, oy = 0) { const p = new Path2D(); for (const st of STREAMS) p.addPath(ribbon(st, waterA(st), waterB(st), ox, oy)); return p; }
  // kıyı şeridi: iç kenar suyun altına girer, dış kenar düzensiz (çimene karışır)
  const ragged = (st, i, side) => 1 + (NOISE(i * 0.45 + side * 9.1, sIdx(st) * 4.4 + 1.3) - 0.5) * 0.7;
  function bankPath(st, side, ox = 0, oy = 0) {
    if (side === 0) return ribbon(st, (i) => waterA(st)(i) - 3, (i) => waterA(st)(i) + bankWi(st, i, 0) * ragged(st, i, 0), ox, oy);
    return ribbon(st, (i) => waterB(st)(i) + 3, (i) => waterB(st)(i) - bankWi(st, i, 1) * ragged(st, i, 1), ox, oy);
  }
  // [derinlik 0..1, akış x, akış y, kıyı dış kenarına uzaklık, su kenarına uzaklık, en derin derenin sırası]
  function nearestRaw(x, y) {
    let dep = 0, gap = 1e9, edge = 1e9, sx = 0, sy = 0, bt = null, be = 1e9, id = 0, bestD = -1e9;
    for (let s = 0; s < STREAMS.length; s++) {
      const st = STREAMS[s]; const { P, N, T } = st; let bi = 0, bd = 1e18;
      for (let i = 0; i < P.length; i++) { const dx = x - P[i][0], dy = y - P[i][1]; const d = dx * dx + dy * dy; if (d < bd) { bd = d; bi = i; } }
      const off = Math.sqrt(bd); const hw = P[bi][2] / 2;
      const d1 = 1 - off / hw; if (d1 > dep) dep = d1; if (d1 > bestD) { bestD = d1; id = s; }
      const e = off - hw; if (e < edge) edge = e;
      const side = ((x - P[bi][0]) * N[bi][0] + (y - P[bi][1]) * N[bi][1]) >= 0 ? 0 : 1;
      gap = Math.min(gap, e - bankWi(st, bi, side));
      if (d1 > 0) { const wgt = d1 * d1 * (st.id === 'M' ? 1.5 : 1); sx += T[bi][0] * wgt; sy += T[bi][1] * wgt; }
      if (e < be) { be = e; bt = T[bi]; }
    }
    if (sx === 0 && sy === 0) { sx = bt[0]; sy = bt[1]; }
    const l = Math.hypot(sx, sy) || 1; return [clamp(dep), sx / l, sy / l, gap, edge, id];
  }
  // kaba ızgara önbelleği (5 px)
  const GRID = { x0: -220, y0: 940, x1: 1300, y1: 2480, s: 5 };
  let grid = null;
  function buildGrid() {
    const { x0, y0, x1, y1, s } = GRID; const nx = Math.ceil((x1 - x0) / s) + 1, ny = Math.ceil((y1 - y0) / s) + 1;
    const n = nx * ny; const D = new Float32Array(n), FX = new Float32Array(n), FY = new Float32Array(n), G = new Float32Array(n), Ed = new Float32Array(n);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const q = nearestRaw(x0 + i * s, y0 + j * s); const k = j * nx + i; D[k] = q[0]; FX[k] = q[1]; FY[k] = q[2]; G[k] = q[3]; Ed[k] = q[4]; }
    grid = { nx, ny, D, FX, FY, G, Ed };
  }
  function sampleGrid(key, x, y) {
    if (!grid) buildGrid(); const arr = grid[key]; const { x0, y0, s } = GRID; const { nx, ny } = grid;
    const fx = clamp((x - x0) / s, 0, nx - 1.001), fy = clamp((y - y0) / s, 0, ny - 1.001); const i = Math.floor(fx), j = Math.floor(fy); const u = fx - i, v = fy - j;
    const k = j * nx + i; return lerp(lerp(arr[k], arr[k + 1], u), lerp(arr[k + nx], arr[k + nx + 1], u), v);
  }
  const inGrid = (x, y) => x >= GRID.x0 && x <= GRID.x1 && y >= GRID.y0 && y <= GRID.y1;
  function depthAt(x, y) { return inGrid(x, y) ? sampleGrid('D', x, y) : nearestRaw(x, y)[0]; }
  function waterGap(x, y) { return inGrid(x, y) ? sampleGrid('G', x, y) : nearestRaw(x, y)[3]; }
  function waterDist(x, y) { return inGrid(x, y) ? sampleGrid('Ed', x, y) : nearestRaw(x, y)[4]; }
  function flowDir(x, y) {
    if (!inGrid(x, y)) { const q = nearestRaw(x, y); return [q[1], q[2]]; }
    const dx = sampleGrid('FX', x, y), dy = sampleGrid('FY', x, y); const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l];
  }
  let _rp = null;
  const riverPath = () => (_rp || (_rp = waterPath(0, 0)));
  const springs = [[250, 1078], [830, 1008]];
  // kaynağa yakınlık (0..1): havuzdan çıkan suyun ilk ~100 px'i sığ ve parlak, darbeleri yatay (düşüş yok)
  const nearSpring = (x, y) => { let v = 0; for (const [sx2, sy2] of springs) { if (y < sy2 - 4) continue; v = Math.max(v, 1 - clamp(Math.hypot((x - sx2) * 0.6, y - sy2) / 110)); } return v; };

  // ================================================================ 1. GÖK (güneşsiz, lavanta-inci-şeftali-nane)
  const SKY = { x: -200, y: -1400, w: 1480, h: 2600 };
  function paintSky() {
    const { w, h } = SKY; const ox = SKY.x, oy = SKY.y;
    const S = Paint.sprite(w, h, { seed: 5101, k: 1 }); const r = S.r;
    // kubbelerin arkasında (y≈180–460) bir ton koyu lavanta kuşak: inci kubbe ışığı zıtlıkla kendinden gelir
    const bands = [[-1400, '#5F5CA6'], [-1180, '#6E6BB0'], [-960, '#7D79BA'], [-740, '#8C87C3'], [-540, '#9A94CA'], [-350, '#A79FD0'], [-170, '#B1A8D3'],
      [0, '#B8ADD4'], [140, '#BDB0D3'], [290, '#C3B3D2'], [430, '#CDBAD1'], [500, '#D9C4CF'], [550, '#E3D0CC'], [600, '#E6DCCD'], [660, '#DCE3D3'], [740, '#D2E2D6'], [880, '#CFE3D9'], [1040, '#D5E7DD']];
    const ramp = bands.map((b) => b[1]); const n = ramp.length;
    const yIdx = (yw) => { for (let i = n - 1; i >= 0; i--) if (yw >= bands[i][0]) { const y0 = bands[i][0], y1 = i < n - 1 ? bands[i + 1][0] : y0 + 150; return (i + clamp((yw - y0) / (y1 - y0))) / n; } return 0; };
    const sf = (x, y) => yIdx(y + oy + 22 * Math.sin((x + ox) * 0.0042 + 0.7) + 12 * Math.sin((x + ox) * 0.0113 + y * 0.003));
    for (let y = 0; y < h; y += 4) { S.x.fillStyle = ramp[clamp(Math.floor(sf(w / 2, y) * n), 0, n - 1)]; S.x.fillRect(0, y, w, 4); }
    field(S, { bbox: [-60, -20, w + 60, h + 20], ramp, shade: sf, dir: 0, dirJit: 0.06, len: [140, 320], wid: [18, 34], cover: 3.0, jitter: 22, jitterFreq: 0.004, noise: 0.02, broken: 0.08, max: 9000, sortJit: 0.6 });
    // sedef tülleri: gök boyunca hafif eğik pastel darbe grupları (ışık kaynağı değil)
    for (let g = 0; g < 26; g++) {
      const gx = r() * w, gy = -900 - oy + r() * 1300;
      const base = ramp[clamp(Math.floor(sf(gx, gy) * n), 0, n - 1)];
      const col = mix(base, NACRE[g % NACRE.length], 0.3);
      const ang = -0.05 + (r() - 0.5) * 0.06; const m = 4 + Math.floor(r() * 5);
      for (let i = 0; i < m; i++) stroke(S, gx + (r() - 0.5) * 300, gy + (r() - 0.5) * 46, ang + (r() - 0.5) * 0.03, 120 + r() * 200, 12 + r() * 12, shade(col, (r() - 0.5) * 0.02), { dry: 0.35 });
    }
    return { canvas: S.finish({ emboss: 0.42 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-gok', paintSky);

  // ================================================================ 2. BULUT KUŞAĞI (kameranın içinden geçtiği; orta tonlu)
  // Yapı (sahne bu düzene güvenir): üst ~40–230 kabarık kırık kenar, 230–700 tam örtücü gövde, 700–860 seyrek.
  // Her bulut kümesi ayrı tuvalde, tam opak boyanır (yarı saydam katman yok): tümsekler arkadan öne, her biri düz
  // basamaklı tonlarla (altta serin mor gölge, üstte ılık pembe-lila ışık) ve üst yarısında kırık turuncu astar kenarıyla.
  // drawBand() kuşağı alfa ile soldurmaz: gövde ve kümeler kadrajın altına/yanlarına kayıp küçülerek çıkar.
  const BAND = { x: -200, y: -600, w: 1480, h: 900 };
  const CLOUD_Z = ['#5D589B', '#716BAE', '#8781C0', '#A099CF', '#BAAFDC', '#D3C3E1', '#E8D4DF'];
  const CLOUD_TINT = ['#E8B9C6', '#AFD6D2', '#C6B8EA', '#EBC6B4'];
  // kümenin paleti: açık basamaklar yanardöner pastel tonla (pembe/nane/lila/şeftali) hafifçe ısınır; derinde koyulaşır
  const cloudPal = (tint, dk = 0, amt = 0.22) => CLOUD_Z.map((c, i) => { const q = shade(c, -dk); return i >= 3 ? mix(q, tint, amt * (i - 2) / 4 + 0.06) : q; });
  // birleşik yol dolgusu: yükseklik haritasına iç alt-yol çizgisi basmaz (kabartmada "içten görünen kontur" olmasın)
  function fillU(S, path, col, h = 135) {
    S.x.save(); S.x.fillStyle = col; S.x.fill(path); S.x.restore();
    S.hx.save(); S.hx.fillStyle = `rgb(${h},${h},${h})`; S.hx.fill(path); S.hx.restore();
  }
  // astar kenarı yalnız verilen yatay şeridin içinde (tümseğin üst yarısı / tabanın alt kenarı)
  function rimBand(S, path, ya, yb, o) { S.x.save(); const c = new Path2D(); c.rect(-10, ya, S.w + 20, yb - ya); S.x.clip(c); S.rim(path, o); S.x.restore(); }
  // basamak elipsleri: yukarı kaydıkça küçülür, üst kenara kadar uzanır (tümseğin tepesi açık, altı serin gölge;
  // top gibi her yanı koyulaşan kenar yok)
  const ZS = [0.93, 0.8, 0.67, 0.53, 0.4], ZO = [0.14, 0.27, 0.39, 0.5, 0.6];
  // opak bulut kümesi. bumps: [[cx, cy, R], ...] tasarım px'i; o: {k, pal, seed, base: [x0, x1, y], cover, rimA}
  // Döner: {c (tuval, k ölçekli), x, y (tasarım sol üst), w, h (tasarım)}
  function puffMass(bumps, o = {}) {
    const k = o.k ?? 1, pal = o.pal || cloudPal(CLOUD_TINT[2]), seed = o.seed ?? 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [cx, cy, R] of bumps) { x0 = Math.min(x0, cx - R * 1.22); x1 = Math.max(x1, cx + R * 1.22); y0 = Math.min(y0, cy - R * 1.12); y1 = Math.max(y1, cy + R * 1.08); }
    if (o.base) { x0 = Math.min(x0, o.base[0] - 16); x1 = Math.max(x1, o.base[1] + 16); y1 = Math.max(y1, o.base[2] + 12); }
    x0 = Math.floor(x0 - 6); y0 = Math.floor(y0 - 6); x1 = Math.ceil(x1 + 6); y1 = Math.ceil(y1 + 6);
    const S = Paint.sprite((x1 - x0) * k, (y1 - y0) * k, { seed, k }); const r = S.r;
    const X = (v) => (v - x0) * k, Y = (v) => (v - y0) * k;
    const rimA = o.rimA ?? 0.8;
    const bpaths = bumps.map(([cx, cy, R], bi) => smoothPath(blobPts(X(cx), Y(cy), R * 1.1 * k, R * k, 22, 0.07, seed * 31 + bi * 101)));
    let basePath = null, by = 0;
    if (o.base) { const [bx0, bx1] = o.base; by = o.base[2]; const bry = 15; basePath = smoothPath(blobPts(X((bx0 + bx1) / 2), Y(by - bry * 0.55), ((bx1 - bx0) / 2 + 12) * k, bry * k, 26, 0.05, seed * 7 + 3)); }
    // kümenin tek silueti: kırık astar kenarı yalnız dış kenarda (iç tümsek sınırları dolguyla örtülür)
    const sil = new Path2D(); for (const bp of bpaths) sil.addPath(bp); if (basePath) sil.addPath(basePath);
    const yLow = o.base ? Y(by - 4) : Y(Math.max(...bumps.map((b) => b[1] + b[2] * 0.3)));
    rimBand(S, sil, -10, yLow, { w: 1.7, alpha: rimA });
    if (basePath) rimBand(S, basePath, Y(by - 6), S.h + 10, { w: 1.5, alpha: rimA * 0.75 });
    fillU(S, sil, pal[0], 128);
    if (basePath) field(S, { bbox: [X(o.base[0] - 12), Y(by - 26), X(o.base[1] + 12), Y(by + 4)], clip: basePath, ramp: [pal[0], shade(pal[0], 0.03)], shade: Paint.cst(0.5), dir: 0, dirJit: 0.05,
      len: [30, 70], wid: [5, 8], cover: 0.5, noise: 0, broken: 0, lJit: 0.02, hJit: 3, dry: 0.4 });
    // tümsekler arkadan öne (büyükler arkada); her biri kendi düz ton basamaklarıyla (kenarları gürültülü)
    const order = bumps.map((b, i) => [b, i]).sort((a, b) => b[0][2] - a[0][2]);
    for (const [[cx, cy, R], bi] of order) {
      const sd = bi % 2 ? 1 : -1; const sb = seed * 31 + bi * 101; const bp = bpaths[bi];
      fillU(S, bp, pal[0], 128);
      const nz = R >= 30 ? 5 : R >= 16 ? 4 : 3;
      const Z = []; for (let j = 0; j < nz; j++) Z.push([X(cx + sd * R * 0.06 * (j + 1)), Y(cy - R * ZO[j]), R * 1.1 * ZS[j] * k * (1 + j * 0.04), R * ZS[j] * k]);
      S.x.save(); S.hx.save(); S.x.clip(bp); S.hx.clip(bp);
      Z.forEach(([zx, zy, rx, ry], j) => fillU(S, smoothPath(blobPts(zx, zy, rx, ry, 18, 0.12, sb + j * 17)), pal[j + 1], 132 + j * 8));
      S.x.restore(); S.hx.restore();
      // tümsek biçimini izleyen kısa darbeler: rengini bulunduğu basamaktan alır (düz tonu bozmaz, doku verir)
      const zoneAt = (x, y) => { for (let j = nz - 1; j >= 0; j--) { const [zx, zy, rx, ry] = Z[j]; const u = (x - zx) / rx, v = (y - zy) / ry; if (u * u + v * v < 1) return j + 1; } return 0; };
      const bx = X(cx), byy = Y(cy), rxk = R * 1.1 * k, ryk = R * k;
      const dirF = (x, y) => { const dx = x - bx, dy = y - byy; const l = Math.hypot(dx, dy) || 1; let tx = -dy / l, ty = dx / l; if (tx < 0) { tx = -tx; ty = -ty; } const vx = tx * 0.62 + 0.96 * 0.38, vy = ty * 0.62 - 0.26 * 0.38; return Math.atan2(vy, vx) + (r() - 0.5) * 0.25; };
      field(S, { bbox: [bx - rxk, byy - ryk, bx + rxk, byy + ryk], clip: bp, mask: (x, y) => { const u = (x - bx) / rxk, v = (y - byy) / ryk; return u * u + v * v < 0.94; },
        ramp: [pal[0]], shade: Paint.cst(0.5), dir: dirF, len: [clamp(R * 0.3, 9, 30), clamp(R * 0.58, 16, 56)], wid: [clamp(R * 0.08, 3.2, 9), clamp(R * 0.13, 5, 13)],
        cover: o.cover ?? 0.55, noise: 0, broken: 0, lJit: 0.025, hJit: 4, dry: 0.3, colorF: (x, y) => { let j = zoneAt(x, y); if (r() < 0.07) j = clamp(j + r.sign(), 0, nz); return pal[j]; } });
      // büyük tümseklerin tepesinde ılık, kuru tek fırça ışığı (parıltı noktası değil)
      if (R > 34 && r() < 0.7) Paint.drawStroke(S, X(cx - sd * R * 0.12), Y(cy - R * 0.8), -0.12 * sd + (r() - 0.5) * 0.2, R * 0.75 * k, Math.max(3, R * 0.07) * k, pal[6], { dry: 0.7, height: false });
    }
    return { c: S.finish({ emboss: o.emboss ?? 0.3 }), x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  // tümsek dizisi (bir küme): sol kenar x, taban y; çan biçimli yarıçaplar
  const R0end = (b) => b[b.length - 1][2] * 0.35;
  function bumpRow(r, x, yb, n, rA, rB) {
    const bumps = []; let bx = x;
    for (let i = 0; i < n; i++) {
      const bell = 1 - Math.abs(i - (n - 1) / 2) / n; const R = (rA + Math.pow(r(), 0.8) * (rB - rA)) * (0.7 + bell * 0.45);
      if (i === 0) bx += R;
      bumps.push([bx, yb - R * (0.45 + r() * 0.3), R]); bx += R * (0.64 + r() * 0.3);
    }
    return { bumps, end: bx + R0end(bumps) };
  }
  let _band = null;
  function buildBand() {
    if (_band) return _band;
    const { w } = BAND; const r = rng(5202);
    // gövde: iki kenarı da kabarık, opak lavanta kütle (kümeler ayrılınca altındaki manzara görünsün diye ayrı tuval)
    const BY = 118, BH = 632; // gövde kuşak satırı ~152..730 arasını kesintisiz örter (sahnede A/B bindirmesi ve önceki sahne kenarı delik bırakmasın)
    const body = Paint.sprite(w, BH, { seed: 5203, k: 1 });
    { const bp = new Path2D(); bp.rect(-30, 44, w + 60, BH - 88);
      for (const yc of [44, BH - 44]) for (let x = -40; x < w + 50;) { const R = 30 + r() * 18; bp.addPath(ellipsePath(x + R, yc + (yc < 100 ? 4 : -4), R * 1.08, R)); x += R * (1.4 + r() * 0.4); }
      body.rim(bp, { w: 1.6, alpha: 0.75 });
      fillU(body, bp, CLOUD_Z[2], 132);
      const bz = (x, y) => 0.5 + (NOISE(x * 0.004 + 1, y * 0.012) - 0.5) * 0.9;
      field(body, { bbox: [-20, 0, w + 20, BH], path: bp, ramp: [CLOUD_Z[1], CLOUD_Z[2], mix(CLOUD_Z[2], CLOUD_Z[3], 0.5)], shade: bz, dir: -0.18, dirJit: 0.1, len: [70, 150], wid: [16, 24], cover: 1.1, noise: 0.04, broken: 0.04 }); }
    const bodyC = body.finish({ emboss: 0.36 });
    const ROWS = [
      { yb: 142, rA: 16, rB: 36, n: [2, 4], gap: [50, 200], t: 0, jy: 30 },
      { yb: 208, rA: 36, rB: 72, n: [3, 6], gap: [-40, -6], t: 0.08, jy: 18 },
      { yb: 318, rA: 42, rB: 90, n: [3, 5], gap: [-70, -20], t: 0.2 },
      { yb: 398, rA: 48, rB: 100, n: [3, 5], gap: [-80, -30], t: 0.34 },
      { yb: 478, rA: 50, rB: 104, n: [3, 5], gap: [-80, -30], t: 0.48 },
      { yb: 558, rA: 50, rB: 104, n: [3, 5], gap: [-80, -30], t: 0.62 },
      { yb: 638, rA: 48, rB: 98, n: [3, 5], gap: [-70, -20], t: 0.76 },
      { yb: 714, rA: 36, rB: 84, n: [2, 5], gap: [10, 110], t: 0.88, jy: 36 },
    ];
    const pieces = []; let seed = 9000;
    for (const R0 of ROWS) {
      let x = -140 + r() * 80;
      while (x < w + 100) {
        const nb = R0.n[0] + Math.floor(r() * (R0.n[1] - R0.n[0] + 1));
        const yb0 = R0.yb + (R0.jy ? (r() - 0.5) * R0.jy : 0);
        const { bumps, end } = bumpRow(r, x, yb0, nb, R0.rA, R0.rB);
        const fx0 = bumps[0][0] - bumps[0][2] * 0.6, fx1 = bumps[nb - 1][0] + bumps[nb - 1][2] * 0.6;
        const tint = CLOUD_TINT[Math.floor(NOISE(x * 0.004 + 3, R0.t * 4) * 4) % 4];
        const pm = puffMass(bumps, { k: 1, seed: seed++, pal: cloudPal(tint, R0.t * 0.05), base: R0.t > 0.05 ? [fx0, fx1, yb0 + 8] : null, rimA: R0.t > 0.05 && R0.t < 0.95 ? 0.82 : 0.9 });
        pieces.push({ ...pm, cx: pm.x + pm.w / 2, row: R0.t, fringe: R0.t < 0.1, delay: clamp(0.02 + (R0.t < 0.1 ? 0 : 0.06) + r() * 0.14, 0, 0.3) });
        x = end + R0.gap[0] + r() * (R0.gap[1] - R0.gap[0]);
      }
    }
    // A: düz kuşak. B: ters kuşak (sahnede alttaki kat) — yerleşim aynalanır ama kümeler dik kalır (tepeleri yukarıda,
    // alttakiler önde); önceki sahneye bakan alt kenarı gövdenin kabarık kenarı ve saçak kümeleri oluşturur.
    const canvas = makeCanvas(BAND.w, BAND.h); const cA = canvas.getContext('2d');
    cA.drawImage(bodyC, 0, BY); for (const pc of pieces) cA.drawImage(pc.c, pc.x, pc.y);
    const orderB = [...pieces].reverse();
    const canvasB = makeCanvas(BAND.w, BAND.h); const cB = canvasB.getContext('2d');
    cB.save(); cB.translate(0, BAND.h); cB.scale(1, -1); cB.drawImage(bodyC, 0, BY); cB.restore();
    for (const pc of orderB) drawPiece(cB, pc, true, 0, 0, 1);
    _band = { canvas, canvasB, body: bodyC, bodyY: BY, pieces, orderB };
    return _band;
  }
  // kümeyi kuşak koordinatında çiz; B'de (flip) aynalanmış yerine, dik
  function drawPiece(ctx, pc, flip, dx, dy, s) {
    const py = flip ? BAND.h - pc.y - pc.h : pc.y; const w = pc.w * s, h = pc.h * s;
    ctx.drawImage(pc.c, pc.x + dx + (pc.w - w) / 2, py + dy + (pc.h - h) / 2, w, h);
  }
  defSprite('bulut-kusagi', () => ({ canvas: buildBand().canvas, px: 0, py: 0, k: 1 }));
  // kuşağı (x,y) sol üst köşesine sc ölçekle çiz; p 0..1 dağılma (0: tam kuşak). flip: sahnedeki alt (B) kat.
  // Global alfa yok: gövde ve kümeler bulundukları yerden kadrajın altına (ve kenarlara doğru) kayıp küçülerek çıkar;
  // p = 0.85'te hepsi kadraj dışındadır. Alfa yalnız son %10'da ve kümeler zaten kadraj dışındayken sıfıra iner.
  function drawBand(ctx, x, y, sc = 1, p = 0, flip = false) {
    const B = buildBand();
    if (p >= 0.999) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (p <= 0.001) { ctx.drawImage(flip ? B.canvasB : B.canvas, 0, 0); ctx.restore(); return; }
    const m = ctx.getTransform(); const CH = ctx.canvas ? ctx.canvas.height : H;
    const down = m.d > 0.01 ? m.d : 0; // kuşak birimi → aygıt pikseli (dikey)
    const needDown = (v, hh) => (down ? Math.max(70, (CH - (m.d * v + m.f)) / down + hh * 0.32 + 18) : 900);
    const a0 = ctx.globalAlpha;
    // gövde: kümelerin arkasında, erken ve düz aşağı iner
    { const q = clamp(p / 0.6); if (q < 1) {
      const top = flip ? BAND.h - B.bodyY - B.body.height : B.bodyY; const e = E.io2(q); const dy = e * needDown(top, 0);
      ctx.globalAlpha = a0 * (1 - inv(0.9, 1, q));
      if (flip) { ctx.save(); ctx.translate(0, top + dy + B.body.height); ctx.scale(1, -1); ctx.drawImage(B.body, 0, 0); ctx.restore(); } else ctx.drawImage(B.body, 0, top + dy);
    } }
    for (const pc of flip ? B.orderB : B.pieces) {
      const q = clamp((p - pc.delay) / (0.85 - pc.delay)); if (q >= 1) continue;
      const e = E.io2(q); const s = 1 - 0.36 * e;
      const py = flip ? BAND.h - pc.y - pc.h : pc.y; const dir = Math.sign(pc.cx - BAND.w / 2) || 1; const far = Math.abs(pc.cx - BAND.w / 2) / (BAND.w / 2);
      const dx = dir * e * (110 + 320 * far), dy = e * needDown(py + pc.h * 0.5, pc.h);
      ctx.globalAlpha = a0 * (1 - inv(0.9, 1, q));
      drawPiece(ctx, pc, flip, dx, dy, s);
    }
    ctx.restore();
  }
  // ---- önde hızlı geçen bulut kümeleri (yükselişte paralaks derinliği): 4 ayrı opak küme, aralarında boşluk.
  // Kuşakla aynı palet ve boya; k = 2 boyanır (sc 1.6–1.8'de pikselleşmez). Yerleşim (cx, cy) çevresinde tasarım
  // x −420…+420 (sc 1.7'de ≈1430 px), y −150…+90.
  let _wisps = null;
  function buildWisps() {
    if (_wisps) return _wisps;
    const r = rng(5260);
    const DEF = [ // [sol x, taban y, tümsek sayısı, rA, rB, renk]
      [-420, 40, 3, 34, 62, 0], [-172, 84, 4, 40, 78, 2], [96, 26, 3, 30, 58, 3], [272, 70, 3, 36, 66, 1],
    ];
    const masses = DEF.map(([x, yb, n, rA, rB, ti], i) => {
      const { bumps } = bumpRow(r, x, yb, n, rA, rB);
      // ortadaki tümseğin üstüne bir tepe: küme tek sıra gibi değil, kabarık küme gibi okunur
      const mid = bumps[Math.floor(n / 2)]; bumps.push([mid[0] + (r() - 0.5) * mid[2] * 0.4, mid[1] - mid[2] * 0.62, mid[2] * 0.66]);
      const fx0 = bumps[0][0] - bumps[0][2] * 0.55, fx1 = bumps[n - 1][0] + bumps[n - 1][2] * 0.55;
      return puffMass(bumps, { k: 2, seed: 9600 + i, pal: cloudPal(CLOUD_TINT[ti], 0.01, 0.26), base: [fx0, fx1, yb + 8], cover: 0.75, rimA: 0.9 });
    });
    return (_wisps = { masses });
  }
  // (cx, cy) çevresine sc ölçekle 4 opak küme çiz; alpha genel çarpan (1 = tam opak)
  function drawWisps(ctx, cx, cy, sc = 1, alpha = 1) {
    if (alpha <= 0.001 || sc <= 0.0001) return;
    const Wm = buildWisps();
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.scale(sc, sc);
    for (const m of Wm.masses) ctx.drawImage(m.c, m.x, m.y, m.w, m.h);
    ctx.restore();
  }
  defSprite('bulut-kumeleri', () => { const Wm = buildWisps(); const c = makeCanvas(900 * 2, 360 * 2); const cx = c.getContext('2d'); cx.scale(2, 2); for (const m of Wm.masses) cx.drawImage(m.c, m.x + 450, m.y + 220, m.w, m.h); return { canvas: c, px: 900, py: 440, k: 2 }; });

  // ================================================================ 3. UZAK TERASLI TEPELER (sise karışan)
  const FAR = { x: -200, y: 540, w: 1480, h: 1100 };
  function paintFar() {
    const { w, h } = FAR; const ox = FAR.x, oy = FAR.y;
    const S = Paint.sprite(w, h, { seed: 5303, k: 1 }); const r = S.r;
    const HAZE = '#DCE6E0';
    const LAY = [
      { base: 652, hA: 22, hB: 52, wA: 120, wB: 260, haze: 0.55, sc: 0.32, pav: 0, glint: 12, trees: 4 },
      { base: 732, hA: 30, hB: 76, wA: 150, wB: 320, haze: 0.36, sc: 0.44, pav: 0, glint: 10, trees: 8 },
      { base: 832, hA: 40, hB: 100, wA: 170, wB: 360, haze: 0.22, sc: 0.6, pav: 7, glint: 0.6, trees: 12 },
      { base: 950, hA: 50, hB: 120, wA: 190, wB: 400, haze: 0.12, sc: 0.78, pav: 6, glint: 0.3, trees: 14 },
      { base: 1080, hA: 56, hB: 130, wA: 210, wB: 440, haze: 0.05, sc: 0.98, pav: 4, glint: 0, trees: 14 },
      { base: 1240, hA: 56, hB: 120, wA: 230, wB: 480, haze: 0.03, sc: 1.2, pav: 0, glint: 0, trees: 12 },
    ];
    const TOPC = '#9ED05A', RISEC = '#2A786E', DEEPC = '#1B5E5A';
    const glints = [];
    LAY.forEach((Ly, li) => {
      const hz = (c, extra = 0) => mix(c, li === 0 ? '#DAD9E6' : HAZE, clamp(Ly.haze + extra));
      // tepe dizisi: üst üste binen yuvarlak kütleler
      const hills = []; let x = -120 + r() * 60;
      while (x < w + 120) { const wh = Ly.wA + r() * (Ly.wB - Ly.wA); const cx = x + wh * 0.7; hills.push({ cx, wh, hg: Ly.hA + r() * (Ly.hB - Ly.hA), base: Ly.base - oy + (r() - 0.5) * 18 }); x = cx + wh * (0.55 + r() * 0.5); }
      hills.sort((a, b) => a.hg - b.hg); // alçaklar arkada
      for (const hl of hills) {
        const top = (xx) => { const u = (xx - hl.cx) / hl.wh; return Math.abs(u) >= 1 ? hl.base + 40 : hl.base - hl.hg * Math.pow(1 - u * u, 0.62); };
        const pth = new Path2D(); pth.moveTo(hl.cx - hl.wh, hl.base + 420); for (let xx = hl.cx - hl.wh; xx <= hl.cx + hl.wh + 0.1; xx += 5) pth.lineTo(xx, Math.min(top(xx), hl.base + 30)); pth.lineTo(hl.cx + hl.wh, hl.base + 420); pth.closePath();
        const bb = [hl.cx - hl.wh, hl.base - hl.hg - 4, hl.cx + hl.wh, Math.min(h, hl.base + 260)];
        fill(S, pth, hz(TOPC), { h: 140 });
        const slope = (xx) => Math.atan2(top(xx + 5) - top(xx - 5), 10);
        const mistAt = (xx, yy) => clamp((yy - top(xx)) / (hl.hg + 40));
        // teras yüzeyleri: ılık sarı-yeşil, aşağı doğru serinleşir
        const surfR = [hz(mix(TOPC, RISEC, 0.55)), hz(mix(TOPC, RISEC, 0.34)), hz(mix(TOPC, RISEC, 0.14)), hz(TOPC), hz(shade(TOPC, 0.06, 0.95, 10))];
        field(S, { bbox: bb, path: pth, ramp: surfR, shade: (xx, yy) => clamp(0.82 - mistAt(xx, yy) * 0.8 + (NOISE(xx * 0.01, yy * 0.02) - 0.5) * 0.3), dir: (xx) => slope(xx) * 0.8 + (r() - 0.5) * 0.04,
          len: [14 * Ly.sc + 8, 40 * Ly.sc + 12], wid: [3 * Ly.sc + 2, 6 * Ly.sc + 2.5], cover: 1.8, noise: 0.02, broken: 0.03, max: 1600 });
        // basamaklar: serin mavi-yeşil şev bandı + ılık ışıklı dudak (konturlar tepeyi sarar)
        const sp0 = (19 + r() * 7) * Ly.sc + 6; let d = sp0 * (0.5 + r() * 0.5); let j = 0;
        S.x.save(); S.hx.save(); S.x.clip(pth); S.hx.clip(pth);
        while (d < hl.hg + 30 && j < 10) {
          const rh = Math.max(2.2, (4.4 + j * 0.35) * Ly.sc + 1.2);
          const pts = []; for (let xx = hl.cx - hl.wh; xx <= hl.cx + hl.wh; xx += 5) pts.push([xx, top(xx) + d]);
          const band = new Path2D(); pts.forEach(([a, b], i) => (i ? band.lineTo(a, b) : band.moveTo(a, b))); for (let i = pts.length - 1; i >= 0; i--) band.lineTo(pts[i][0], pts[i][1] + rh); band.closePath();
          const rc = hz(mix(RISEC, DEEPC, clamp(j / 8)), (d / (hl.hg + 30)) * 0.18);
          fill(S, band, rc, { h: 126 });
          for (let xx = hl.cx - hl.wh; xx < hl.cx + hl.wh;) { const len = 16 + r() * 34; if (r() < 0.55) stroke(S, xx + len / 2, top(xx + len / 2) + d - 0.6, slope(xx + len / 2), len, 0.8 + Ly.sc * 0.9, hz(shade(TOPC, 0.1, 0.9, 12), 0.05), { dry: 0.5, height: false, alpha: 0.85 }); xx += len * (0.95 + r() * 0.3); }
          // terası izleyen koyu yuvarlak ağaç sıraları
          if (j > 0 && r() < Ly.trees / 16) {
            const cr = (2 + r() * 1.6) * Ly.sc + 0.8; let xx = hl.cx - hl.wh * (0.2 + r() * 0.7); const n2 = 4 + Math.floor(r() * 14);
            for (let q = 0; q < n2; q++, xx += cr * 2.1) { const yy = top(xx) + d - cr * 0.6; if (yy > hl.base + 26 || top(xx) > hl.base) continue; fill(S, circ(xx, yy, cr), hz('#1E5A4C', 0.05), { h: 150 }); fill(S, circ(xx - cr * 0.25, yy - cr * 0.35, cr * 0.5), hz('#4E9A5E', 0.08), { h: 160 }); }
          }
          d += sp0 * (1 + j * 0.16) * (0.85 + r() * 0.3); j++;
        }
        S.x.restore(); S.hx.restore();
        // tepe eteğinde sis
        field(S, { bbox: [hl.cx - hl.wh, hl.base - 24, hl.cx + hl.wh, hl.base + 40], path: pth, ramp: [hz(HAZE, 0.3), mix(HAZE, '#E6E1EC', 0.4)], shade: Paint.cst(0.5), dir: 0, dirJit: 0.04, len: [40, 110], wid: [6, 12], cover: 0.9, alphaF: (xx, yy) => clamp((yy - (hl.base - 24)) / 50) * (0.16 + Ly.haze * 0.5), height: false, dry: 0.4 });
        hl.top = top;
      }
      // köşkçükler: altın taban + inci kubbe; uzaktakiler yalnızca yumuşak inci parıltısı (ışık konutların kendisinden)
      const placePav = (xx, tiers, scl) => {
        const hl = hills.reduce((a, b) => (Math.abs(b.cx - xx) / b.wh < Math.abs(a.cx - xx) / a.wh ? b : a)); const u = (xx - hl.cx) / hl.wh; if (Math.abs(u) > 0.8) return;
        const yy = hl.top(xx) + (4 + r() * hl.hg * 0.35) * 0.6; const s = Ly.sc * scl;
        let by = yy, bw = (14 + r() * 8) * s;
        for (let t = 0; t < tiers; t++) {
          const bh = (6 + r() * 2) * s;
          fill(S, rectPath(xx - bw / 2, by - bh, bw, bh), hz(t % 2 ? '#E2B04A' : '#D9A23C'), { h: 165 });
          fill(S, rectPath(xx - bw / 2 + bw * 0.12, by - bh * 0.78, bw * 0.76, bh * 0.5), hz('#F1E6EC', 0.05), { h: 160 });
          fill(S, rectPath(xx - bw / 2 - 0.6, by - bh - 0.9 * s - 0.4, bw + 1.2, 0.9 * s + 0.6), hz('#F6D276'), { h: 172 });
          by -= bh + 0.9 * s; bw *= 0.72;
        }
        const dr = bw * 0.62 + 1; const dome = new Path2D(); dome.arc(xx, by + dr * 0.12, dr, Math.PI * 1.04, Math.PI * 1.96); dome.closePath();
        fill(S, dome, hz('#F3ECF3'), { h: 176 }); fill(S, ellipsePath(xx + dr * 0.35, by - dr * 0.2, dr * 0.32, dr * 0.42), hz('#CFC6E4', 0.05), { h: 168, alpha: 0.75 });
        if (r() < Ly.glint) glints.push([xx, by - dr * 0.45, 2.4 + 4 * Ly.sc]);
      };
      for (let i = 0; i < Ly.pav; i++) placePav(30 + r() * (w - 60), 1 + Math.floor(r() * (li >= 3 ? 3 : 2)), 0.9 + r() * 0.4);
      // iki köşk arasındaki boşlukta (dünya x 470–650) katlı köşkçükler
      if (li >= 2 && li <= 4) for (let q = 0; q < (li === 4 ? 1 : 2); q++) placePav(470 - ox + r() * 180, 2 + Math.floor(r() * 2), 1.15);
      if (li <= 1) for (let i = 0; i < Ly.glint; i++) { const xx = 20 + r() * (w - 40); const hl = hills.reduce((a, b) => (Math.abs(b.cx - xx) / b.wh < Math.abs(a.cx - xx) / a.wh ? b : a)); glints.push([xx, hl.top(xx) + 3 + r() * 10, 2.2 + r() * 1.4]); }
      // katın önünde ince sis kuşağı
      field(S, { bbox: [-20, Ly.base - oy - 30, w + 20, Ly.base - oy + 30], ramp: [mix(HAZE, '#E4E0EC', 0.3), HAZE], shade: Paint.cst(0.5), dir: 0, dirJit: 0.03, len: [80, 200], wid: [6, 12], cover: 0.5, alpha: 0.18 + Ly.haze * 0.3, height: false, dry: 0.5 });
    });
    // sakin, yuvarlak inci parıltıları (artı/yıldız patlaması yok)
    for (const [gx, gy, g] of glints) { softPatch(S, gx, gy, g * 2.2, g * 1.8, '#FFF9F0', 0.22); fill(S, circ(gx, gy, g * 0.42), '#FFFFFF', { h: 190, alpha: 0.95 }); }
    return { canvas: S.finish({ emboss: 0.3 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-uzak', paintFar);

  // ================================================================ 4. KÖŞKLER
  // ortak takım: altın-gümüş tuğla, inci pano, altın sütun/paye, ince altın bant, sedir, havuz
  function kit(S, K, side, vpY) {
    const X = (v) => v * K; const r = S.r;
    const sideDy = (y) => clamp((vpY - y) * 0.09, -20, 20);
    // altın ve gümüş tuğla (dama), ince sıcak misk derzler; gümüşün üst kenarı açık, altının alt kenarı koyu
    function bricks(path, bb, o = {}) {
      fill(S, path, o.joint ?? '#8C5E2E', { h: 124 });
      S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
      const bh = o.bh ?? 7, bl = o.bl ?? 15, dark = o.dark ?? 0; let row = 0;
      for (let y = bb[1] + bh / 2; y < bb[3] + bh; y += bh, row++) {
        const off = (row % 2) * bl * 0.5; let col = 0;
        for (let x = bb[0] - off; x < bb[2] + bl; x += bl, col++) {
          const gold = (col + row) % 2 === 0; const ao = o.ao ? o.ao(y) : 0;
          let c = gold ? mix('#DEA63A', '#EEC254', r()) : mix('#A9AECB', '#D9DCEB', r());
          c = shade(c, -ao * 0.12 - dark * 0.13 + (r() - 0.5) * 0.03, 1 - dark * 0.1, 0);
          stroke(S, X(x + bl / 2), X(y), (r() - 0.5) * 0.02, bl - 1.5, bh - 1.3, c, { dry: 0.02 });
          if (gold) fill(S, rectPath(X(x + 0.9), X(y + bh / 2 - 2.1), X(bl - 2.5), X(1.1)), shade(c, -0.18, 1.1, -6), { h: 138, alpha: 0.8 });
          else fill(S, rectPath(X(x + 0.9), X(y - bh / 2 + 0.8), X(bl - 2.5), X(1.0)), shade('#F4F5FB', -dark * 0.1), { h: 160, alpha: 0.8 });
        }
      }
      S.x.restore(); S.hx.restore();
    }
    function archPath(xc, yTop, ow, yBot) {
      const p = new Path2D(); const rr = ow / 2; const yc = yTop + rr;
      p.moveTo(X(xc - rr), X(yBot)); p.lineTo(X(xc - rr), X(yc)); p.arc(X(xc), X(yc), X(rr), Math.PI, 0); p.lineTo(X(xc + rr), X(yBot)); p.closePath(); return p;
    }
    // yarı saydam inci pano: 3 geniş sedef basamağı + içte ılık ışıma (+ istenirse içeride hafif sedir/yeşil yastık)
    function pearlPanel(xc, yTop, ow, yBot, o = {}) {
      const pn = archPath(xc, yTop, ow, yBot); const hh = yBot - yTop;
      fill(S, pn, '#DCD3E6', { h: 140 });
      S.x.save(); S.hx.save(); S.x.clip(pn); S.hx.clip(pn);
      const T3 = ['#E7D1E3', '#D2E6DF', '#D9D2EE']; const ph = Math.abs(Math.floor(xc * 0.37 + yTop * 0.11)) % 3;
      for (let b = 0; b < 3; b++) {
        const c0 = T3[(b + ph) % 3]; const bx0 = xc - ow / 2 + (b * ow) / 3;
        fill(S, rectPath(X(bx0), X(yTop), X(ow / 3 + 0.6), X(hh)), c0, { h: 142 });
        for (let q = 0; q < 3; q++) stroke(S, X(bx0 + (ow / 3) * ((q + 0.5) / 3)), X(yTop + hh * (0.4 + r() * 0.25)), Math.PI / 2 + (r() - 0.5) * 0.03, hh * (0.75 + r() * 0.35), ow / 9 + 1.4, shade(c0, (r() - 0.5) * 0.035), { dry: 0.3 });
      }
      fill(S, rectPath(X(xc - ow / 2), X(yBot - hh * 0.42), X(ow), X(hh * 0.42)), '#EED7C6', { h: 138, alpha: 0.45 });
      fill(S, rectPath(X(xc - ow / 2), X(yBot - hh * 0.28), X(ow), X(hh * 0.28)), '#F5E2CF', { h: 140, alpha: 0.55 });
      for (let q = 0; q < 4; q++) stroke(S, X(xc - ow * 0.3 + q * ow * 0.2), X(yBot - hh * (0.32 + r() * 0.06)), (r() - 0.5) * 0.08, ow * 0.3, 2.2, '#F6E4D2', { dry: 0.5, alpha: 0.6, height: false });
      if (o.couch) {
        const cw = ow * 0.74, cy = yBot - hh * 0.1;
        fill(S, rectPath(X(xc - cw / 2), X(cy - 3), X(cw), X(3)), '#C2913A', { h: 140, alpha: 0.42 });
        fill(S, rectPath(X(xc - cw / 2), X(cy - 9), X(cw), X(6), X(2)), '#3A8A5E', { h: 140, alpha: 0.38 });
        fill(S, rectPath(X(xc - cw / 2 + 2), X(cy - 15), X(cw * 0.4), X(6.5), X(3)), '#4C9C6C', { h: 140, alpha: 0.32 });
        fill(S, rectPath(X(xc + cw / 2 - 2 - cw * 0.36), X(cy - 14), X(cw * 0.36), X(5.5), X(3)), '#4C9C6C', { h: 140, alpha: 0.28 });
      }
      arc(S, X(xc), X(yTop + ow / 2), X(ow / 2 - 1.3), Math.PI, TAU, X(3.2), '#B8ACCF', { alpha: 0.6, height: false });
      const sx = side > 0 ? xc - ow / 2 + 1.3 : xc + ow / 2 - 1.3;
      fill(S, rectPath(X(sx - 1.3), X(yTop + ow / 2), X(2.6), X(hh - ow / 2)), '#BCB0D1', { h: 132, alpha: 0.6 });
      S.x.restore(); S.hx.restore();
    }
    // ince altın bant (korniş, eşik, kemer üstü)
    function gband(x0, x1, y, hgt) {
      const p = rectPath(X(x0), X(y), X(x1 - x0), X(hgt));
      fill(S, p, GOLD[4], { h: 172 });
      field(S, { bbox: [X(x0), X(y), X(x1), X(y + hgt)], clip: p, ramp: GOLD.slice(3, 6), shade: Paint.grad(0, X(y), 0, X(y + hgt), 0.9, 0.2), dir: 0, dirJit: 0.02, len: [20, 44], wid: [Math.max(2, hgt * 0.5), Math.max(3, hgt * 0.7)], count: Math.max(3, Math.round((x1 - x0) / 9)), noise: 0.05 });
      fill(S, rectPath(X(x0), X(y), X(x1 - x0), X(Math.min(1.5, hgt * 0.3))), GOLD[6], { h: 184, alpha: 0.85 });
      fill(S, rectPath(X(x0), X(y + hgt - 1.3), X(x1 - x0), X(1.3)), GOLD[1], { h: 138, alpha: 0.85 });
    }
    // düz altın paye (kemerler arası): sade, başlıksız
    function goldPier(x, yTop, yBot, wd) {
      fill(S, rectPath(X(x - wd / 2), X(yTop), X(wd), X(yBot - yTop)), GOLD[4], { h: 172 });
      fill(S, rectPath(X(x - wd / 2), X(yTop), X(wd * 0.28), X(yBot - yTop)), GOLD[5], { h: 178, alpha: 0.9 });
      fill(S, rectPath(X(x - wd * 0.06), X(yTop), X(wd * 0.14), X(yBot - yTop)), GOLD[6], { h: 186, alpha: 0.55 });
      fill(S, rectPath(X(x + wd * 0.24), X(yTop), X(wd * 0.26), X(yBot - yTop)), GOLD[2], { h: 150, alpha: 0.85 });
    }
    // ince altın sütun (revak): kaide + sade başlık; arka sıra serin ve koyu
    function goldCol(x, yTop, yBot, wd, o = {}) {
      const dk = o.back ? 0.16 : 0; const c = (i) => (dk ? shade(GOLD[i], -dk, 0.8, 18) : GOLD[i]);
      const body = rectPath(X(x - wd / 2), X(yTop), X(wd), X(yBot - yTop));
      if (!o.back) S.rim(body, { w: 1.2, alpha: 0.55 });
      fill(S, body, c(4), { h: 172 });
      field(S, { bbox: [X(x - wd / 2), X(yTop), X(x + wd / 2), X(yBot)], clip: body, ramp: [c(2), c(3), c(4), c(5)], shade: (px) => { const u = (px - X(x)) / X(wd / 2); return clamp(0.62 - u * 0.3 - u * u * 0.3); }, dir: Math.PI / 2, dirJit: 0.02, len: [20, 40], wid: [2.2, 3.2], count: Math.round((yBot - yTop) / 6), noise: 0.05 });
      fill(S, rectPath(X(x - wd * 0.12), X(yTop), X(wd * 0.18), X(yBot - yTop)), c(6), { h: 186, alpha: o.back ? 0.35 : 0.75 });
      const pb = o.plinth ?? 4.5;
      fill(S, rectPath(X(x - wd * 0.85), X(yBot - pb), X(wd * 1.7), X(pb)), c(3), { h: 170 });
      fill(S, rectPath(X(x - wd * 0.85), X(yBot - pb), X(wd * 1.7), X(1.2)), c(5), { h: 180 });
      fill(S, rectPath(X(x - wd * 0.8), X(yTop), X(wd * 1.6), X(3.4)), c(5), { h: 180 });
      fill(S, rectPath(X(x - wd * 0.8), X(yTop + 2.4), X(wd * 1.6), X(1)), c(2), { h: 150 });
    }
    function drape(xa, xb, y) {
      for (let x = xa; x < xb; x += 5 + r() * 6) { const L2 = 6 + r() * 14; leaf(S, X(x), X(y + L2 * 0.45), Math.PI / 2 + (r() - 0.5) * 0.6, L2, 4.5 + r() * 2, r.pick(BUSH.slice(1, 6)), {}); }
    }
    function planterTree(x, y, sc, fruit) {
      const pw = 14 * sc, ph = 10 * sc;
      fill(S, poly([[X(x - pw / 2), X(y - ph)], [X(x + pw / 2), X(y - ph)], [X(x + pw * 0.36), X(y)], [X(x - pw * 0.36), X(y)]]), GOLD[4], { h: 172 });
      fill(S, rectPath(X(x - pw / 2 - 1), X(y - ph - 2), X(pw + 2), X(2.4)), GOLD[6], { h: 182 });
      Paint.drawStroke(S, X(x), X(y - ph - 6 * sc), Math.PI / 2, X(12 * sc), X(2.6 * sc), GOLD[3], { dry: 0 });
      const R = 15 * sc, tcx = X(x), tcy = X(y - ph - 10 * sc - R);
      const crown = smoothPath(blobPts(tcx, tcy, X(R), X(R * 0.9), 18, 0.1, Math.floor(r() * 1e5)));
      fill(S, crown, '#145C43', { h: 140 });
      field(S, { bbox: [tcx - X(R + 4), tcy - X(R + 4), tcx + X(R + 4), tcy + X(R + 4)], mask: (px, py) => Math.hypot(px - tcx, (py - tcy) / 0.9) < X(R), ramp: ['#0B4537', '#105640', '#186A47', '#248451', '#3E9C5B', '#66B465'],
        shade: Paint.sphere(tcx, tcy - X(R * 0.5), X(R * 1.2), [-0.1, -0.99], 0.1), dir: (px, py) => Math.atan2(py - tcy, px - tcx) + (r() - 0.5) * 0.8, len: [8, 14], wid: [4.5, 6.5], cover: 3, leaf: true, noise: 0.06 });
      for (let i = 0; i < 4; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.65; const fx = tcx + X(Math.cos(a) * d), fy = tcy + X(Math.sin(a) * d * 0.85 + R * 0.12); const fr = X(1.7 * sc + 0.8); fill(S, circ(fx, fy, fr), fruit, { h: 170 }); fill(S, circ(fx - fr * 0.3, fy - fr * 0.3, fr * 0.36), shade(fruit, 0.2, 0.7), { h: 178 }); }
    }
    // karşılıklı sedir: altın ayaklı kasa, yeşil minder, dış yanda yaslanma yastığı, önde yuvarlak yastık; suya bakar.
    // D: sedirin boyu (öne→arkaya derinlik yönü); facing +1 sağa (havuza), −1 sola
    function couch(x0, x1, yF, D) { // uzun ekseni cepheye paralel divan: altın ayaklı kasa, yeşil minder, yüksek arkalık, iki ucunda yuvarlak yastık
      const g = 3, h1 = 6, hb = 17;
      const P = (x, t, up) => [X(x + D[0] * t), X(yF + D[1] * t - up)];
      const quadF = (a, b, t, z0, z1) => poly([P(a, t, z0), P(b, t, z0), P(b, t, z1), P(a, t, z1)]);
      const quadT = (a, b, t0, t1, z) => poly([P(a, t0, z), P(b, t0, z), P(b, t1, z), P(a, t1, z)]);
      const quadS = (x, t0, t1, z0, z1) => poly([P(x, t0, z0), P(x, t1, z0), P(x, t1, z1), P(x, t0, z1)]);
      fill(S, quadT(x0 - 2, x1 + 4, -0.08, 1.05, 0), '#3A4D44', { h: 130, alpha: 0.3 });
      // arkalık (arkada, önce boyanır)
      fill(S, quadF(x0 + 1, x1 - 1, 0.86, g + h1, g + h1 + hb), '#1B573A', { h: 150 });
      fill(S, quadT(x0 + 1, x1 - 1, 0.86, 1, g + h1 + hb), '#3E9A63', { h: 165 });
      if (D[0] > 0) fill(S, quadS(x1 - 1, 0.86, 1, g + h1, g + h1 + hb), '#1C5E3B', { h: 145 });
      const nc = Math.max(2, Math.round((x1 - x0) / 22)); const cwid = (x1 - x0 - 14) / nc;
      for (let q = 0; q < nc; q++) { const a = x0 + 7 + q * cwid + 1, b = a + cwid - 2; fill(S, smoothPath([P(a, 0.8, g + h1 + 1), P(b, 0.8, g + h1 + 1), P(b, 0.8, g + h1 + hb - 3), P((a + b) / 2, 0.8, g + h1 + hb + 0.5), P(a, 0.8, g + h1 + hb - 3)], true, 0.3), q % 2 ? '#3A9661' : '#45A36C', { h: 168 }); fill(S, smoothPath([P(a + 2, 0.8, g + h1 + hb * 0.55), P(b - 2, 0.8, g + h1 + hb * 0.55), P((a + b) / 2, 0.8, g + h1 + hb - 1)], true, 0.3), '#78C793', { h: 176, alpha: 0.8 }); }
      S.line([P(x0 + 1, 0.93, g + h1 + hb + 0.3), P(x1 - 1, 0.93, g + h1 + hb + 0.3)], X(1.5), GOLD[5], { edge: false });
      // ayaklar ve altın kasa
      for (const x of [x0 + 1.6, x1 - 1.6]) fill(S, quadF(x - 1.2, x + 1.2, 0.02, 0, g + 0.5), GOLD[2], { h: 150 });
      fill(S, quadT(x0, x1, 0, 0.88, g + h1), GOLD[4], { h: 170 }); if (D[0] > 0) fill(S, quadS(x1, 0, 0.88, g, g + h1), GOLD[2], { h: 150 });
      fill(S, quadF(x0, x1, 0, g, g + h1), GOLD[3], { h: 160 }); fill(S, quadF(x0, x1, 0, g + h1 - 1.1, g + h1), GOLD[6], { h: 182 }); fill(S, quadF(x0, x1, 0, g, g + 1), GOLD[1], { h: 140 });
      // minder
      fill(S, quadT(x0 + 3, x1 - 3, 0.04, 0.84, g + h1 + 3), '#4AAA70', { h: 170 }); fill(S, quadF(x0 + 3, x1 - 3, 0.04, g + h1, g + h1 + 3), '#2C8656', { h: 160 });
      fill(S, quadT(x0 + 5, x1 - 5, 0.1, 0.24, g + h1 + 3.1), '#80CC97', { h: 178, alpha: 0.75 });
      // iki uçta yuvarlak yastık (altın başlıklı)
      for (const [x, sg] of [[x0 + 3.6, 1], [x1 - 3.6, -1]]) { const [ex, ey] = P(x, 0.32, g + h1 + 5); fill(S, ellipsePath(ex, ey, X(3.4), X(3.6)), '#378F5C', { h: 166 }); fill(S, ellipsePath(ex - X(0.6) * sg, ey - X(1.1), X(1.5), X(1.3)), '#74C48E', { h: 176 }); fill(S, ellipsePath(ex, ey, X(1.1), X(1.1)), GOLD[5], { h: 182, alpha: 0.9 }); }
    }
    // parlak sığ havuz (zeminle aynı düzlem): yatay dalgacık darbeleri, inci-yakut çakıllar, kaynakta halkalar
    function pool(path, bb, spring) {
      fill(S, path, '#9EDCD5', { h: 136 });
      field(S, { bbox: bb, path, ramp: ['#56B9BF', '#79CCC9', '#A2DFD8', '#C8EFE7', '#E6FAF5'], shade: (x, y) => clamp(0.6 + (NOISE(x * 0.04, y * 0.09) - 0.5) * 0.55 - clamp(1 - Math.hypot((x - X(spring[0])) * 0.5, y - X(spring[1])) / X(60)) * 0.15), dir: 0, dirJit: 0.1, len: [10, 22], wid: [2.6, 4.4], cover: 2.8, noise: 0.08 });
      S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
      for (let i = 0; i < 70; i++) { const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r()); const pr = X(0.9 + r() * 1.5); const ruby = r() < 0.08; S.x.fillStyle = mix(ruby ? '#C2394C' : r() < 0.2 ? '#E8C35A' : '#F6F0F4', '#8FD6D0', 0.45); S.x.beginPath(); S.x.ellipse(x, y, pr, pr * 0.6, 0, 0, TAU); S.x.fill(); }
      for (let q = 0; q < 3; q++) { const rx = X(8 + q * 9), ry = rx * 0.28; S.x.globalAlpha = 0.7 - q * 0.15; S.x.strokeStyle = '#F2FFFC'; S.x.lineWidth = X(1.1); S.x.beginPath(); S.x.ellipse(X(spring[0]), X(spring[1]), rx, ry, 0, Math.PI * (1.08 + q * 0.03), Math.PI * (1.92 - q * 0.03)); S.x.stroke(); S.x.beginPath(); S.x.ellipse(X(spring[0]), X(spring[1]), rx, ry, 0, Math.PI * 0.15, Math.PI * 0.85); S.x.stroke(); }
      S.x.globalAlpha = 1;
      for (let i = 0; i < 26; i++) { const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r()); if (!S.x.isPointInPath(path, x, y)) continue; Paint.drawStroke(S, x, y, (r() - 0.5) * 0.1, X(6 + r() * 10), X(1 + r() * 0.7), r() < 0.6 ? '#F2FFFC' : '#C3EEE7', { dry: 0.5, alpha: 0.8, height: false }); }
      S.x.restore(); S.hx.restore();
    }
    // çim şeridi (revak arkasında ve yanlarında zemin): üst kenarı düzensiz
    function lawnStrip(x0, x1, yTop, yBot, cols) {
      const pts = [[X(x0), X(yBot)], [X(x1), X(yBot)]]; for (let x = x1; x >= x0; x -= 6) pts.push([X(x), X(yTop - 3 * NOISE(x * 0.06, yTop * 0.01))]);
      const p = poly(pts); fill(S, p, cols[2], { h: 140 });
      field(S, { bbox: [X(x0), X(yTop - 4), X(x1), X(yBot)], path: p, ramp: cols, shade: (x, y) => clamp(0.55 + (NOISE(x * 0.02, y * 0.05) - 0.5) * 0.5 - (y - X(yTop)) / X(yBot - yTop + 1) * 0.15), dir: 0, dirJit: 0.25, len: [10, 22], wid: [4, 7], cover: 2.4, noise: 0.06 });
      return p;
    }
    return { X, r, sideDy, bricks, archPath, pearlPanel, gband, goldPier, goldCol, drape, planterTree, couch, pool, lawnStrip };
  }
  const LAWN_P = ['#1B6E47', '#24804F', '#309356', '#45A65E', '#62B866', '#8ACB70'];

  // oyuk inci kubbe (köşk tepesi): kürenin ~%62'si görünür, tabanda altın yuva; meridyen darbeleri, serin gölge yanı
  function pearlDomeTop(S, cx, baseY, R, side) {
    const cy = baseY - R * 0.26; const a0 = Math.asin(clamp((baseY - cy) / R));
    const body = new Path2D(); body.arc(cx, cy, R, a0, Math.PI - a0, true); body.closePath();
    S.rim(body, { w: 1.6, alpha: 0.6 });
    fill(S, body, '#E2DAEA', { h: 150 });
    nacreSphere(S, cx, cy, R, body, { side, ramp: ['#8F87BA', '#A69DCC', '#BEB5DC', '#D3CBE7', '#E5DFEF', '#F4F0F5'], tintAmt: 0.38 });
    S.x.save(); S.hx.save(); S.x.clip(body); S.hx.clip(body);
    softPatch(S, cx - R * 0.18 * side, cy - R * 0.36, R * 0.34, R * 0.24, '#FFFCF8', 0.32);
    softPatch(S, cx, baseY - R * 0.12, R * 0.6, R * 0.16, '#F7DCCB', 0.28); // oyuk incinin içten ılık ışıması
    S.x.restore(); S.hx.restore();
    const ring = new Path2D(); ring.ellipse(cx, baseY, R * Math.cos(a0) + 4 * S.k, 5.5 * S.k, 0, 0, TAU);
    S.rim(ring, { w: 1.2, alpha: 0.5 });
    fill(S, ring, GOLD[4], { h: 175 });
    fill(S, ellipsePath(cx, baseY - 2 * S.k, R * Math.cos(a0), 1.8 * S.k), GOLD[6], { h: 185, alpha: 0.85 });
    fill(S, ellipsePath(cx, baseY + 2.8 * S.k, R * Math.cos(a0), 1.8 * S.k), GOLD[2], { h: 150, alpha: 0.8 });
  }

  // ---- 4a. kasr-sol: üst üste kurulmuş odalar (39:20), açık altın sütunlu revak üstünde; revak altında doğan havuz
  // ve suya bakan karşılıklı sedirler (min tahtihim). Kamera bu revağa yakınlaşır.
  function paintTiered(cfg) {
    const K = cfg.K; const W0 = cfg.w, H0 = cfg.h; const EXT = 16;
    const S = Paint.sprite(W0 * K, (H0 + EXT) * K, { seed: cfg.seed, k: K }); const r = S.r;
    const kt = kit(S, K, cfg.side, cfg.vpY); const { X, sideDy } = kt;
    const cx = W0 / 2; const side = cfg.side; const CH = cfg.CH; const yb = H0; const LG = cfg.loggia;
    const ys = yb - LG.LH; const slabTop = ys - LG.SL;
    const st = []; { let y1 = slabTop; for (const s of cfg.storeys) { const y0 = y1 - s.h; st.push({ ...s, x0: cx - s.w / 2, x1: cx + s.w / 2, y0, y1 }); y1 = y0 - CH; } }
    const s0 = st[0]; const sideW = (s) => Math.max(10, s.w * 0.075); const sw0 = sideW(s0);
    const D = [side * sw0, -LG.FD];
    const stream = STREAMS.find((q) => q.id === cfg.stream); const exitHW = stream.P[0][2] / 2;
    const ox = cfg.pivotW[0] - cx; // dünya − tasarım (x)
    // sütun yerleri: köşeler + kemer bölümleri
    const pil = Math.max(12, s0.w * 0.05); const ax0 = s0.x0 + pil, ax1 = s0.x1 - pil; const pitch = (ax1 - ax0) / s0.n;
    const colX = [s0.x0 + 6]; for (let q = 1; q < s0.n; q++) colX.push(ax0 + pitch * q); colX.push(s0.x1 - 6);
    const colW = 7.5;
    // ---- 1. zemin: revak arkasında çim şeridi ve çalılar (arka sütunlar arasından görünür), yanlarda alçak çimen sırtlar
    kt.lawnStrip(0, W0, yb + D[1] - 12, yb + 2, LAWN_P);
    for (let x = 6; x < W0 - 6; x += 10 + r() * 8) { const inside = x > s0.x0 - 4 && x < s0.x1 + sw0 + 4; roseBush(S, X(x), X(yb + D[1] - 6 + r() * 3), inside ? 12 + r() * 4 : 16 + r() * 6, { roses: 1 + Math.floor(r() * 2), lift: inside ? -0.6 : 0 }); }
    const berm = (x0, x1, outer) => { const pts = []; for (let t = 0; t <= 1.0001; t += 0.1) { const x = lerp(x0, x1, t); const u = outer < 0 ? 1 - t : t; pts.push([X(x), X(yb - 30 + Math.pow(u, 1.8) * 30)]); } pts.push([X(x1), X(yb + 2)], [X(x0), X(yb + 2)]); return poly(pts); };
    const bL = berm(0, s0.x0 + 4, -1), bR = berm(s0.x1 + sw0 - 4, W0, 1);
    for (const bp of [bL, bR]) { S.rim(bp, { w: 1.6, alpha: 0.5 }); fill(S, bp, LAWN_P[3], { h: 145 }); field(S, { bbox: [0, X(yb - 34), X(W0), X(yb + 2)], clip: bp, ramp: LAWN_P, shade: (x, y) => clamp(0.85 - (y - X(yb - 30)) / X(32) * 0.45 + (NOISE(x * 0.03, y * 0.03) - 0.5) * 0.3), dir: () => (r() - 0.5) * 0.6, len: [10, 20], wid: [4, 7], cover: 2.6, noise: 0.06 }); }
    // ---- 2. revak zemini: safran-krem döşeme, ortada kaynak havuzu (çimenle aynı düzlem)
    const fl = poly([[X(s0.x0), X(yb)], [X(s0.x1), X(yb)], [X(s0.x1 + D[0]), X(yb + D[1])], [X(s0.x0 + D[0]), X(yb + D[1])]]);
    fill(S, fl, '#E3CC98', { h: 140 });
    field(S, { bbox: [X(s0.x0), X(yb + D[1]), X(s0.x1 + D[0]), X(yb)], path: fl, ramp: ['#C8AC74', '#D8BE88', '#E5CF9C', '#F0E0B6'], shade: (x, y) => clamp(0.35 + (y - X(yb + D[1])) / X(-D[1]) * 0.45 + (NOISE(x * 0.03, y * 0.1) - 0.5) * 0.25), dir: 0, dirJit: 0.05, len: [12, 26], wid: [3.5, 5.5], cover: 2.4, noise: 0.05 });
    const pb = [cx - exitHW * 1.22 + D[0], yb + D[1] + 4]; const pe = [cx + exitHW * 1.22 + D[0], yb + D[1] + 4];
    const poolP = smoothPath([[X(cx - exitHW), X(yb + EXT - 1)], [X(cx - exitHW - 2), X(yb - 6)], [X(pb[0] - 4), X(pb[1] + 6)], [X(pb[0] + 10), X(pb[1])], [X(cx + D[0]), X(pb[1] - 1.5)], [X(pe[0] - 10), X(pe[1])], [X(pe[0] + 4), X(pe[1] + 6)], [X(cx + exitHW + 2), X(yb - 6)], [X(cx + exitHW), X(yb + EXT - 1)]], true, 0.35);
    const spring = [cx + D[0] * 0.7, yb + D[1] * 0.62];
    kt.pool(poolP, [X(cx - exitHW * 1.3), X(yb + D[1]), X(cx + exitHW * 1.3 + D[0]), X(yb + EXT)], spring);
    // ---- 3. arka sütunlar (açık revak: aralarından arka bahçe ve uzak tepeler görünür)
    for (const x of colX) kt.goldCol(x + D[0], ys, yb + D[1] + 1, colW * 0.72, { back: true, plinth: 3.2 });
    // ---- 4. karşılıklı sedirler: havuzun iki yanındaki dış bölmelerde, suya bakar
    const bay0 = [(colX[0] + colX[1]) / 2, colX[1] - colX[0]], bayN = [(colX[s0.n - 1] + colX[s0.n]) / 2, colX[s0.n] - colX[s0.n - 1]];
    kt.couch(bay0[0] - bay0[1] * 0.4, bay0[0] + bay0[1] * 0.4, yb - 7, [D[0] * 0.6, D[1] * 0.6]);
    kt.couch(bayN[0] - bayN[1] * 0.4, bayN[0] + bayN[1] * 0.4, yb - 7, [D[0] * 0.6, D[1] * 0.6]);
    // ---- 5. yan sütunlar (yan yüzün altında)
    for (const t of [0.5, 1]) { const x = (side > 0 ? s0.x1 : s0.x0) + D[0] * t; kt.goldCol(x, ys + sideDy(ys) * t, yb + D[1] * t, colW * (1 - t * 0.2), { back: t > 0.9, plinth: 3.8 }); }
    // ---- 6. ön sütunlar; sudakilerin kaidesinde yatay dalgacık
    for (const x of colX) {
      const inWater = Math.abs(x - cx) < exitHW - 4;
      kt.goldCol(x, ys, inWater ? yb - 3 : yb, colW, { plinth: inWater ? 3.5 : 4.5 });
      if (inWater) for (let q = 0; q < 2; q++) Paint.drawStroke(S, X(x + (q ? 5 : -5)), X(yb - 2.5 + q * 1.5), (r() - 0.5) * 0.06, X(10 + r() * 6), X(1.3), '#F2FFFC', { dry: 0.4, alpha: 0.85, height: false });
    }
    // eşik: döşemenin ön kenarında ince altın çizgi (basamak yok; su eşiğin üzerinden düzce akar)
    for (const [a, b] of [[s0.x0 - 2, cx - exitHW - 3], [cx + exitHW + 3, s0.x1 + 2]]) kt.gband(a, b, yb - 2.2, 2.4);
    // ---- 7. döşeme: ön yüz (altın-gümüş tuğla) + yan yüz
    const slab = rectPath(X(s0.x0 - 4), X(slabTop), X(s0.w + 8), X(LG.SL));
    const xsS = side > 0 ? s0.x1 + 4 : s0.x0 - 4;
    const slabSide = poly([[X(xsS), X(slabTop)], [X(xsS + side * sw0), X(slabTop + sideDy(slabTop))], [X(xsS + side * sw0), X(ys + sideDy(ys))], [X(xsS), X(ys)]]);
    S.rim(slab, { w: 1.6, alpha: 0.6 });
    kt.bricks(slabSide, [Math.min(xsS, xsS + side * sw0) - 2, slabTop - 24, Math.max(xsS, xsS + side * sw0) + 2, ys + 24], { dark: 1 });
    kt.bricks(slab, [s0.x0 - 4, slabTop, s0.x1 + 4, ys]);
    kt.gband(s0.x0 - 5, s0.x1 + 5, ys - 2, 2.6);
    kt.drape(s0.x0 - 2, s0.x1 + 2, ys - 1);
    // ---- 8. tepe kubbesi, katlar (üstten alta), çatı bahçeleri
    const topS = st[st.length - 1];
    pearlDomeTop(S, X(cx), X(topS.y0 - CH + 1), X(cfg.dome), side);
    function storey(s, i) {
      const sw = sideW(s); const xs = side > 0 ? s.x1 : s.x0;
      const front = rectPath(X(s.x0), X(s.y0), X(s.w), X(s.h));
      const sideP = poly([[X(xs), X(s.y0)], [X(xs + side * sw), X(s.y0 + sideDy(s.y0))], [X(xs + side * sw), X(s.y1 + sideDy(s.y1))], [X(xs), X(s.y1)]]);
      const sil = new Path2D(); sil.addPath(front); sil.addPath(sideP);
      S.rim(sil, { w: 2, alpha: 0.8 });
      const ao = (y) => clamp(1 - (y - s.y0) / 20);
      kt.bricks(sideP, [Math.min(xs, xs + side * sw) - 2, s.y0 - 24, Math.max(xs, xs + side * sw) + 2, s.y1 + 24], { dark: 1, ao });
      kt.bricks(front, [s.x0, s.y0, s.x1, s.y1], { ao });
      { const xm = xs + side * sw * 0.5, t0 = s.y0 + s.h * 0.3, t1 = s.y1 - s.h * 0.12; fill(S, poly([[X(xm - sw * 0.2), X(t0 + sideDy(t0) * 0.5)], [X(xm + sw * 0.2), X(t0 + sideDy(t0) * 0.5)], [X(xm + sw * 0.2), X(t1 + sideDy(t1) * 0.5)], [X(xm - sw * 0.2), X(t1 + sideDy(t1) * 0.5)]]), '#CFC4DC', { h: 140 }); }
      // kemer dizisi: inci panolar, aralarda sade altın payeler, ince altın kemer bandı
      const pl = Math.max(12, s.w * 0.05); const a0 = s.x0 + pl, a1 = s.x1 - pl; const pt = (a1 - a0) / s.n; const pw = Math.max(6, pt * 0.11);
      const ow = pt - pw; const aTop = s.y0 + s.h * 0.17, aBot = s.y1 - 6;
      for (let q = 0; q < s.n; q++) kt.pearlPanel(a0 + pt * (q + 0.5), aTop, ow, aBot, { couch: (i === 0 || i === 1) && (q % 2 === (i === 0 ? 1 : 0)) });
      for (let q = 0; q < s.n; q++) arc(S, X(a0 + pt * (q + 0.5)), X(aTop + ow / 2), X(ow / 2 + 1.4), Math.PI, TAU, X(3), GOLD[4]);
      for (let q = 0; q <= s.n; q++) kt.goldPier(a0 + pt * q, aTop + ow / 2 - 1, aBot, pw);
      kt.gband(a0 - pw / 2, a1 + pw / 2, aBot - 0.5, 3.2);
      kt.gband(s.x0 - 3, s.x1 + 3, s.y0 - CH, CH);
      const xc2 = side > 0 ? s.x1 + 3 : s.x0 - 3; const dy = sideDy(s.y0 - CH);
      fill(S, poly([[X(xc2), X(s.y0 - CH)], [X(xc2 + side * (sw + 3)), X(s.y0 - CH + dy)], [X(xc2 + side * (sw + 3)), X(s.y0 + dy)], [X(xc2), X(s.y0)]]), GOLD[2], { h: 150 });
      fill(S, poly([[X(xc2), X(s.y0 - CH)], [X(xc2 + side * (sw + 3)), X(s.y0 - CH + dy)], [X(xc2 + side * (sw + 3)), X(s.y0 - CH + dy + 1.5)], [X(xc2), X(s.y0 - CH + 1.5)]]), GOLD[5], { h: 170 });
    }
    for (let i = st.length - 1; i >= 0; i--) {
      const s = st[i]; storey(s, i);
      const yy = s.y0 - CH;
      if (i < st.length - 1) {
        const up = st[i + 1];
        for (const [a, b] of [[s.x0 - 3, up.x0 - 2], [up.x1 + 2, s.x1 + 3]]) {
          if (b - a < 8) continue;
          const outer = a < cx ? a + 8 : b - 8;
          if (b - a > 26) kt.planterTree(outer, yy + 1, 0.9 + (i === 0 ? 0.12 : 0), [RUBY[3], '#E9B640', RUBY[2]][i % 3]);
          for (let x = a + 6; x < b - 4; x += 7 + r() * 6) if (b - a <= 26 || Math.abs(x - outer) > 16) roseBush(S, X(x), X(yy + 3), 20 + r() * 8, {});
          kt.drape(a + 2, b - 2, yy + CH);
        }
        for (let x = up.x0 + 4; x < up.x1 - 4; x += 8 + r() * 7) roseBush(S, X(x), X(yy + 3), 12 + r() * 5, { roses: 1 + Math.floor(r() * 2) });
      } else {
        for (let x = s.x0; x < s.x1; x += 7 + r() * 6) if (Math.abs(x - cx) > cfg.dome * 0.92) roseBush(S, X(x), X(yy + 3), 16 + r() * 6, { roses: 1 + Math.floor(r() * 2) });
      }
    }
    void ox;
    return { canvas: S.finish({ emboss: 0.48 }), px: X(cx), py: X(H0), k: K };
  }
  const KASR_SOL = { seed: 5401, K: 1.5, w: 600, h: 800, side: 1, vpY: 520, CH: 8, dome: 82, pivotW: [250, 1080], stream: 'L',
    loggia: { LH: 100, SL: 12, FD: 34 },
    storeys: [{ w: 440, h: 154, n: 5 }, { w: 346, h: 132, n: 4 }, { w: 258, h: 112, n: 3 }, { w: 176, h: 92, n: 2 }] };
  defSprite('kasr-sol', () => paintTiered(KASR_SOL));

  // ---- 4b. kasr-sag: tek parça oyuk inci köşk (Buhârî 4879) — açık altın sütunlu yuvarlak sahanlık üstünde dev inci,
  // ön yüzünde içi ılık ışıyan kemerli açıklıklar; sahanlığın altında doğan havuz
  function paintPearlPavilion(cfg) {
    const K = cfg.K; const W0 = cfg.w, H0 = cfg.h; const EXT = 16;
    const S = Paint.sprite(W0 * K, (H0 + EXT) * K, { seed: cfg.seed, k: K }); const r = S.r;
    const kt = kit(S, K, -1, 520); const { X } = kt;
    const cx = W0 / 2, yb = H0;
    const FL = { cy: yb - 30, rx: 190, ry: 30 }; // zemin elipsi (sütun tabanları)
    const DK = { cy: yb - 30 - 104, rx: 200, ry: 30, th: 18 }; // sahanlık üst yüzü
    const Rp = cfg.R; const pcy = DK.cy - Rp * 0.62;
    const stream = STREAMS.find((q) => q.id === cfg.stream); const exitHW = stream.P[0][2] / 2;
    // ---- zemin, arka çalılar, yan sırtlar
    kt.lawnStrip(0, W0, FL.cy - FL.ry - 14, yb + 2, LAWN_P);
    for (let x = 8; x < W0 - 8; x += 10 + r() * 8) roseBush(S, X(x), X(FL.cy - FL.ry - 8 + r() * 3), Math.abs(x - cx) < FL.rx ? 12 + r() * 4 : 16 + r() * 6, { roses: 1 + Math.floor(r() * 2), lift: -0.4 });
    const mound = (x0, x1, outer) => { const pts = []; for (let t = 0; t <= 1.0001; t += 0.1) { const x = lerp(x0, x1, t); const u = outer < 0 ? 1 - t : t; pts.push([X(x), X(yb - 26 + Math.pow(u, 1.7) * 26)]); } pts.push([X(x1), X(yb + 2)], [X(x0), X(yb + 2)]); return poly(pts); };
    for (const bp of [mound(0, cx - FL.rx + 18, -1), mound(cx + FL.rx - 18, W0, 1)]) { S.rim(bp, { w: 1.6, alpha: 0.5 }); fill(S, bp, LAWN_P[3], { h: 145 }); field(S, { bbox: [0, X(yb - 30), X(W0), X(yb + 2)], clip: bp, ramp: LAWN_P, shade: (x, y) => clamp(0.85 - (y - X(yb - 26)) / X(28) * 0.45 + (NOISE(x * 0.03, y * 0.03) - 0.5) * 0.3), dir: () => (r() - 0.5) * 0.6, len: [10, 20], wid: [4, 7], cover: 2.6, noise: 0.06 }); }
    // ---- zemin elipsi: döşeme + havuz + kaynak
    const flP = ellipsePath(X(cx), X(FL.cy), X(FL.rx), X(FL.ry));
    fill(S, flP, '#E3CC98', { h: 140 });
    field(S, { bbox: [X(cx - FL.rx), X(FL.cy - FL.ry), X(cx + FL.rx), X(FL.cy + FL.ry)], path: flP, ramp: ['#C8AC74', '#D8BE88', '#E5CF9C', '#F0E0B6'], shade: (x, y) => clamp(0.35 + (y - X(FL.cy - FL.ry)) / X(2 * FL.ry) * 0.45 + (NOISE(x * 0.03, y * 0.1) - 0.5) * 0.25), dir: 0, dirJit: 0.05, len: [12, 26], wid: [3.5, 5.5], cover: 2.4, noise: 0.05 });
    const poolP = smoothPath([[X(cx - exitHW), X(yb + EXT - 1)], [X(cx - exitHW - 3), X(yb - 8)], [X(cx - 140), X(FL.cy + 4)], [X(cx - 120), X(FL.cy - 16)], [X(cx), X(FL.cy - 21)], [X(cx + 120), X(FL.cy - 16)], [X(cx + 140), X(FL.cy + 4)], [X(cx + exitHW + 3), X(yb - 8)], [X(cx + exitHW), X(yb + EXT - 1)]], true, 0.4);
    kt.pool(poolP, [X(cx - 150), X(FL.cy - FL.ry), X(cx + 150), X(yb + EXT)], [cx, FL.cy - 6]);
    // ---- sütunlar: arka yarı (ince, serin), ön yarı
    const colAt = (a, back) => [cx + FL.rx * 0.97 * Math.cos(a), FL.cy + FL.ry * Math.sin(a), DK.cy + DK.ry * Math.sin(a) + DK.th];
    for (let i = 0; i < 7; i++) { const a = Math.PI + 0.2 + i * ((Math.PI - 0.4) / 6); const [x, yB, yT] = colAt(a); kt.goldCol(x, Math.min(yT, DK.cy + DK.th), yB, 6, { back: true, plinth: 3 }); }
    // ---- sahanlık: üst yüz (açık altın-safran), ön bant (altın-gümüş tuğla)
    const deckTop = ellipsePath(X(cx), X(DK.cy), X(DK.rx), X(DK.ry));
    const band = new Path2D(); band.ellipse(X(cx), X(DK.cy), X(DK.rx), X(DK.ry), 0, 0, Math.PI); band.lineTo(X(cx - DK.rx), X(DK.cy + DK.th)); band.ellipse(X(cx), X(DK.cy + DK.th), X(DK.rx), X(DK.ry), 0, Math.PI, 0, true); band.closePath();
    // ön sütunlar sahanlıktan önce: sahanlığın altına girer
    const frontA = []; for (let i = 0; i < 8; i++) frontA.push(0.1 * Math.PI + i * (0.8 / 7) * Math.PI);
    S.rim(band, { w: 1.8, alpha: 0.6 });
    kt.bricks(band, [cx - DK.rx, DK.cy - 4, cx + DK.rx, DK.cy + DK.ry + DK.th + 2], { bh: 6, bl: 13 });
    { const lip = new Path2D(); lip.ellipse(X(cx), X(DK.cy + DK.th - 2), X(DK.rx), X(DK.ry), 0, 0, Math.PI); lip.lineTo(X(cx - DK.rx), X(DK.cy + DK.th + 1)); lip.ellipse(X(cx), X(DK.cy + DK.th + 1), X(DK.rx), X(DK.ry), 0, Math.PI, 0, true); lip.closePath(); fill(S, lip, GOLD[3], { h: 160 }); }
    fill(S, deckTop, '#E9D7A8', { h: 150 });
    field(S, { bbox: [X(cx - DK.rx), X(DK.cy - DK.ry), X(cx + DK.rx), X(DK.cy + DK.ry)], path: deckTop, ramp: ['#D6BC84', '#E3CC98', '#EEDCAE', '#F6E9C6'], shade: (x, y) => clamp(0.45 + (NOISE(x * 0.03, y * 0.08) - 0.5) * 0.4), dir: 0, dirJit: 0.05, len: [14, 28], wid: [3.5, 5.5], cover: 2.2, noise: 0.05 });
    S.x.save(); S.x.strokeStyle = GOLD[5]; S.x.lineWidth = X(1.6); S.x.globalAlpha = 0.9; S.x.beginPath(); S.x.ellipse(X(cx), X(DK.cy), X(DK.rx - 1), X(DK.ry - 0.5), 0, 0, Math.PI); S.x.stroke(); S.x.restore();
    // ---- dev inci: sahanlığa oturur (düzlemin altı görünmez), altın kaşta
    const ri = Math.sqrt(Rp * Rp - Math.pow(Rp * 0.62, 2)); const ry2 = ri * (DK.ry / DK.rx);
    const clipPe = new Path2D(); clipPe.moveTo(X(cx - Rp - 4), X(pcy - Rp - 4)); clipPe.lineTo(X(cx + Rp + 4), X(pcy - Rp - 4)); clipPe.lineTo(X(cx + Rp + 4), X(DK.cy));
    for (let a = 0; a <= Math.PI + 0.001; a += Math.PI / 40) clipPe.lineTo(X(cx + ri * Math.cos(a)), X(DK.cy + ry2 * Math.sin(a)));
    clipPe.lineTo(X(cx - Rp - 4), X(DK.cy)); clipPe.closePath();
    const sph = ellipsePath(X(cx), X(pcy), X(Rp), X(Rp));
    S.x.save(); S.hx.save(); S.x.clip(clipPe); S.hx.clip(clipPe);
    S.rim(sph, { w: 2, alpha: 0.65 });
    fill(S, sph, '#DCD3E8', { h: 150 });
    const pClip = new Path2D(); pClip.addPath(sph);
    nacreSphere(S, X(cx), X(pcy), X(Rp), pClip, { side: 1, ramp: ['#8E86BC', '#A69DCE', '#BFB6DE', '#D5CDE9', '#E7E1F1', '#F5F1F6'], tintAmt: 0.44, cover: 1.2, lift: 0.04 });
    // yarı saydamlık: açıklıkların çevresinde içten ılık ışık
    softPatch(S, X(cx), X(DK.cy - 60), X(Rp * 0.62), X(64), '#F4D9C6', 0.26);
    softPatch(S, X(cx - Rp * 0.2), X(pcy - Rp * 0.42), X(Rp * 0.32), X(Rp * 0.22), '#FFFCF8', 0.28);
    // kemerli açıklıklar: ortada geniş, yanlarda küreyle daralan
    const opens = [[0, 23, 112, 0], [-64, 19, 102, 4], [64, 19, 102, -4], [-114, 12, 84, 9], [114, 12, 84, -9]];
    for (const [dx, hw, hgt, lean] of opens) {
      const xb = cx + dx; const yB = DK.cy + ry2 * Math.sqrt(Math.max(0, 1 - (dx / ri) ** 2)) - 2; const yT = yB - hgt; const xt = xb + lean;
      const op = (g) => { const p = new Path2D(); p.moveTo(X(xb - hw - g), X(yB)); p.lineTo(X(xt - hw - g), X(yT + hw)); p.arc(X(xt), X(yT + hw), X(hw + g), Math.PI, 0); p.lineTo(X(xb + hw + g), X(yB)); p.closePath(); return p; };
      fill(S, op(2.6), GOLD[4], { h: 174 });
      fill(S, op(0), '#EBCFB3', { h: 136 });
      S.x.save(); S.hx.save(); S.x.clip(op(0)); S.hx.clip(op(0));
      fill(S, rectPath(X(xb - hw - 4), X(yT), X(hw * 0.5), X(hgt)), '#D4B7A6', { h: 132, alpha: 0.7 });
      softPatch(S, X(xb), X(yB - hgt * 0.32), X(hw * 0.9), X(hgt * 0.34), '#FBEBD6', 0.55);
      const cw = hw * 1.5; fill(S, rectPath(X(xb - cw / 2), X(yB - 6), X(cw), X(3)), '#C2913A', { h: 140, alpha: 0.55 }); fill(S, rectPath(X(xb - cw / 2), X(yB - 12), X(cw), X(6), X(2)), '#3A8A5E', { h: 140, alpha: 0.5 }); fill(S, rectPath(X(xb - cw / 2 + 1), X(yB - 19), X(cw * 0.42), X(7), X(3)), '#4C9C6C', { h: 140, alpha: 0.45 });
      S.x.restore(); S.hx.restore();
    }
    S.x.restore(); S.hx.restore();
    // altın kaş (incinin sahanlığa oturduğu halka)
    { const p = new Path2D(); for (let a = 0; a <= Math.PI + 0.001; a += Math.PI / 40) { const q = [X(cx + (ri + 2) * Math.cos(a)), X(DK.cy + (ry2 + 1) * Math.sin(a))]; a ? p.lineTo(...q) : p.moveTo(...q); } for (let a = Math.PI; a >= -0.001; a -= Math.PI / 40) p.lineTo(X(cx + (ri + 2) * Math.cos(a)), X(DK.cy + (ry2 + 1) * Math.sin(a) - 5)); p.closePath(); S.rim(p, { w: 1, alpha: 0.5 }); fill(S, p, GOLD[4], { h: 176 }); }
    { const p = new Path2D(); for (let a = 0.05; a <= Math.PI - 0.05; a += Math.PI / 40) { const q = [X(cx + (ri + 2) * Math.cos(a)), X(DK.cy + (ry2 + 1) * Math.sin(a) - 4.2)]; a > 0.06 ? p.lineTo(...q) : p.moveTo(...q); } S.x.save(); S.x.strokeStyle = GOLD[6]; S.x.lineWidth = X(1.2); S.x.stroke(p); S.x.restore(); }
    // ---- ön sütunlar (sahanlık bandının altından zemine), sudakilerin kaidesinde dalgacık
    for (const a of frontA) {
      const [x, yB, yT] = colAt(a); const inWater = Math.abs(x - cx) < exitHW - 4 && yB > yb - 12;
      kt.goldCol(x, yT, inWater ? Math.min(yB, yb - 3) : yB, 8, { plinth: inWater ? 3.4 : 4.6 });
      if (inWater) for (let q = 0; q < 2; q++) Paint.drawStroke(S, X(x + (q ? 5 : -5)), X(Math.min(yB, yb - 3) + q * 1.2), (r() - 0.5) * 0.06, X(9 + r() * 5), X(1.2), '#F2FFFC', { dry: 0.4, alpha: 0.85, height: false });
    }
    kt.drape(cx - DK.rx + 10, cx + DK.rx - 10, DK.cy + DK.ry + DK.th - 1);
    // ---- sahanlık kenarında güller ve altın saksıda meyve ağaçları
    for (let a = 0.06 * Math.PI; a < 0.94 * Math.PI; a += 0.045 + r() * 0.03) { const x = cx + (DK.rx - 8) * Math.cos(a), y = DK.cy + (DK.ry - 4) * Math.sin(a) + 2; if (Math.abs(x - cx) < 116) continue; roseBush(S, X(x), X(y), 16 + r() * 7, {}); }
    for (const sg of [-1, 1]) { kt.planterTree(cx + sg * (DK.rx - 26), DK.cy + 6, 1.05, sg < 0 ? RUBY[3] : '#E9B640'); }
    for (let x = cx - 110; x <= cx + 110; x += 9 + r() * 6) { const a = Math.acos(clamp((x - cx) / (DK.rx - 6))); const y = DK.cy + (DK.ry - 3) * Math.sin(a) + 2; roseBush(S, X(x), X(y), 9 + r() * 3, { roses: 1 }); }
    return { canvas: S.finish({ emboss: 0.46 }), px: X(cx), py: X(H0), k: K };
  }
  const KASR_SAG = { seed: 5402, K: 1.4, w: 520, h: 470, R: 166, pivotW: [830, 1010], stream: 'R' };
  defSprite('kasr-sag', () => paintPearlPavilion(KASR_SAG));

  // ================================================================ 5. ORTA BAHÇE KUŞAĞI (güller, bağlar, meyve bahçeleri)
  const MID = { x: -200, y: 880, w: 1480, h: 660 };
  // köşk zeminleri: sol köşk dünya x −50..550 (zemin çizgisi 1080), inci köşk 570..1090 (1010)
  function paintMid() {
    const { w, h } = MID; const ox = MID.x, oy = MID.y;
    const S = Paint.sprite(w, h, { seed: 5505, k: 1 }); const r = S.r;
    const sx = (xw) => xw - ox, sy = (yw) => yw - oy;
    const outline = [[-200, 1004], [-36, 1004], [-36, 1079], [540, 1079], [540, 1000], [578, 1000], [578, 1009], [1088, 1009], [1088, 1002], [1280, 1002], [1280, 1540], [-200, 1540]];
    const region = poly(outline.map(([x, y]) => [sx(x), sy(y)]));
    fill(S, region, LAWN2[2], { h: 140 });
    const persp = (yw) => 0.5 + clamp((yw - 950) / 560) * 0.85;
    const MOUNDS = []; for (let i = 0; i < 16; i++) MOUNDS.push([ox + r() * w, 1000 + r() * 520, 90 + r() * 170, 26 + r() * 40, 0.6 + r() * 0.5]);
    const Hm = (xw, yw) => { let v = 0; for (const [mx, my, ax, ay, a] of MOUNDS) v += a * Math.exp(-(((xw - mx) / ax) ** 2 + ((yw - my) / ay) ** 2)); return Math.min(1.2, v); };
    field(S, { bbox: [0, 100, w, h], path: region, ramp: LAWN2, shade: (x, y) => { const xw = x + ox, yw = y + oy; return clamp(0.36 + Hm(xw, yw) * 0.42 - (Hm(xw, yw + 14) - Hm(xw, yw - 14)) * 0.5 + (NOISE(x * 0.006 + 2, y * 0.012) - 0.5) * 0.3 - clamp((yw - 1330) / 220) * 0.14); }, dir: () => (r() - 0.5) * 0.22,
      len: [24, 50], wid: [7, 12], size: (x, y) => persp(y + oy), cover: 2.5, noise: 0.04, broken: 0.05, max: 9000 });
    const items = [];
    const dry = (xw, yw, m) => waterGap(xw, yw) > m;
    const free = (xw, yw, hgt, m = 4) => dry(xw, yw, m) && dry(xw, yw - hgt * 0.5, 2) && dry(xw, yw - hgt, 0);
    const VP = [540, 800];
    // -- üst kenar: basamakları örten yuvarlak çalı/ağaç kütleleri (sert pencere yok)
    const hedge = (xw, yw, R, sy2 = 0.8) => {
      const x = sx(xw), y = sy(yw); const sil = smoothPath(blobPts(x, y, R * 1.05, R * sy2, 20, 0.1, Math.floor(xw * 7 + yw)));
      S.rim(sil, { w: 1.6, alpha: 0.5 }); fill(S, sil, '#0F4A3B', { h: 140 });
      leafClump(S, x, y, R, { ramp: ['#08392F', '#0D4A3A', '#145E43', '#1E744B', '#2E8C54', '#4AA45C', '#78BE66'], sy: sy2, len: [16, 26], wid: [7, 11], cover: 2.2, lift: -0.05 });
      for (let q = 0; q < Math.round(R / 9); q++) { const a = -Math.PI / 2 + (r() - 0.5) * 2.4, d = R * (0.3 + r() * 0.55); const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d * sy2; if (r() < 0.6) cupRose(S, px, py, 3 + r() * 2.5, r.pick(ROSE_COLS)); }
    };
    const HEDGES = [[-120, 1000, 36], [-60, 1012, 40], [-28, 1046, 30], [-8, 1068, 18], [556, 994, 40], [528, 1030, 26], [586, 1018, 28], [544, 1062, 20], [598, 1004, 22], [1090, 1004, 34], [1150, 996, 38], [1220, 1000, 40], [1270, 1002, 34], [-170, 1004, 34]];
    for (const [xw, yw, R] of HEDGES) items.push([yw - 30, () => hedge(xw, yw, R)]);
    // -- bağ sıraları (sol)
    const VINE = ['#0A3F31', '#11553D', '#1B6E47', '#2C8A50', '#4BA85A', '#7CC566', '#A9DA70'];
    function vineSeg(x, y, s, grape) {
      S.x.save(); S.x.globalAlpha = 0.45; S.x.fillStyle = '#0B4434'; S.x.beginPath(); S.x.ellipse(x + 2 * s, y + 2 * s, 15 * s, 4.5 * s, 0, 0, TAU); S.x.fill(); S.x.restore();
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (r() - 0.5) * 2.5; const rad = 15 * s * (0.2 + r() * 0.8);
        const px = x + Math.cos(a) * rad, py = y - 15 * s + Math.sin(a) * rad * 0.75;
        const vi = clamp(Math.floor((1 - (py - (y - 32 * s)) / (32 * s)) * 5.8 + (r() - 0.5) * 1.1), 0, 6);
        leaf(S, px, py, a + (r() - 0.5), 13 * s + 3, 10 * s + 2, VINE[vi], {});
      }
      if (grape) {
        const gx = x + (r() - 0.5) * 6 * s, gy = y - 7 * s; const br = 1.5 + 1.5 * s;
        for (let row = 0; row < 4; row++) for (let c = 0; c < 4 - row; c++) { const bx2 = gx + (c - (3 - row) / 2) * br * 1.7, by2 = gy + row * br * 1.45; fill(S, circ(bx2, by2, br), ['#7E9A2A', '#9DB83E', '#BCD262', '#D8E794'][clamp(3 - row + (r() < 0.3 ? -1 : 0), 0, 3)], { h: 166 }); fill(S, circ(bx2 - br * 0.35, by2 - br * 0.35, br * 0.28), '#F2F6D0', { h: 175 }); }
      }
    }
    for (const xb of [-360, -200, -50, 90, 220, 336]) {
      const sl = (1540 - VP[1]) / (xb - VP[0]); let n = 0;
      for (let yw = 1136; yw < 1545;) { const xw = VP[0] + (yw - VP[1]) / sl; const s = persp(yw); if (free(xw, yw, 30 * s, 5 + 5 * s)) { const g = n++ % 4 === 2; items.push([yw, ((a, b, c, d) => () => vineSeg(a, b, c, d))(sx(xw), sy(yw), s, g)]); } yw += 3 + 4.5 * s; }
    }
    // -- meyve bahçesi ağaçları: koyu serin taç, altın gövde, küçük az meyve, net temas gölgesi
    function orchardTree(x, y, s, fruit) {
      S.x.save(); S.x.globalAlpha = 0.5; S.x.fillStyle = '#083C30'; S.x.beginPath(); S.x.ellipse(x + 1 * s, y + 1.5 * s, 24 * s, 5.5 * s, 0, 0, TAU); S.x.fill(); S.x.restore();
      const th = 22 * s; Paint.drawStroke(S, x, y - th / 2, Math.PI / 2, th, 4.6 * s + 1.4, GOLD[3], { dry: 0 });
      Paint.drawStroke(S, x - 0.6 * s, y - th / 2, Math.PI / 2, th * 0.9, 1.4 * s, GOLD[6], { dry: 0, height: false, alpha: 0.7 });
      const R = 24 * s; const tcx = x, tcy = y - th - R * 0.6;
      const crown = smoothPath(blobPts(tcx, tcy, R, R * 0.86, 18, 0.12, Math.floor(r() * 1e5)));
      S.x.save(); const lowH = new Path2D(); lowH.rect(tcx - R * 2, tcy + R * 0.1, R * 4, R * 2); S.x.clip(lowH); S.rim(crown, { w: 1.3 * s + 0.5, alpha: 0.7 }); S.x.restore();
      fill(S, crown, '#0F4E3D', { h: 140 });
      field(S, { bbox: [tcx - R - 6, tcy - R - 6, tcx + R + 6, tcy + R + 6], mask: (px, py) => Math.hypot(px - tcx, (py - tcy) / 0.86) < R * 1.02, ramp: ['#08372E', '#0C473A', '#135A42', '#1C6E49', '#2B8552', '#47A05C'],
        shade: Paint.sphere(tcx, tcy - R * 0.5, R * 1.2, [-0.1, -0.99], 0.06), dir: (px, py) => Math.atan2(py - tcy, px - tcx) + (r() - 0.5) * 0.8, len: [10, 18], wid: [5, 8], size: () => 0.6 + s * 0.5, cover: 3, leaf: true, noise: 0.06 });
      const nf = Math.round(3 + s * 3);
      for (let i = 0; i < nf; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R * 0.7; const fx = tcx + Math.cos(a) * d, fy = tcy + Math.sin(a) * d * 0.8 + R * 0.15; const fr = (2.2 + 2.8 * s) * 0.6; fill(S, circ(fx, fy, fr), fruit, { h: 170 }); fill(S, circ(fx - fr * 0.3, fy - fr * 0.3, fr * 0.34), shade(fruit, 0.2, 0.7), { h: 178 }); }
    }
    const FR = [RUBY[3], '#E3A93A', RUBY[2], '#E9C35A'];
    for (const xb of [700, 860, 1040, 1240]) { const sl = (1540 - VP[1]) / (xb - VP[0]); let n = 0; for (let yw = 1100; yw < 1545;) { const xw = VP[0] + (yw - VP[1]) / sl; const s = persp(yw) * 0.92; if (free(xw, yw, 70 * s, 8)) items.push([yw, ((a, b, c, f) => () => orchardTree(a, b, c, f))(sx(xw), sy(yw), s, FR[n++ % 4])]); yw += 46 + 70 * s; } }
    [[1110, 1040, 0.62], [1200, 1048, 0.66], [-90, 1060, 0.62], [-150, 1050, 0.66], [470, 1112, 0.58], [650, 1060, 0.58], [178, 1160, 0.72]]
      .forEach(([x, y, s], i) => { if (free(x, y, 70 * s, 4)) items.push([y, () => orchardTree(sx(x), sy(y), s, FR[i % 4])]); });
    // -- köşk önlerinde gül çitleri (revak önü açık bırakılır: sütunlar ve sedirler görünsün)
    for (let x = -30; x < 540; x += 9 + r() * 6) { if (x > 30 && x < 492) continue; if (dry(x, 1086, 2)) items.push([1085, ((xx) => () => roseBush(S, sx(xx), sy(1086 + r() * 3), 18 + r() * 8, {}))(x)]); }
    for (let x = 580; x < 1086; x += 9 + r() * 6) { if (x > 636 && x < 1024) continue; if (dry(x, 1015, 2)) items.push([1014, ((xx) => () => roseBush(S, sx(xx), sy(1015 + r() * 3), 17 + r() * 7, {}))(x)]); }
    for (let x = 34; x < 490; x += 7 + r() * 5) if (dry(x, 1084, 6)) items.push([1083, ((xx) => () => { for (let q = 0; q < 3; q++) Paint.drawStroke(S, sx(xx) + (r() - 0.5) * 6, sy(1083) - 2, -Math.PI / 2 + (r() - 0.5) * 0.7, 7 + r() * 5, 2.4, r.pick(LAWN2.slice(2, 6)), { dry: 0.4 }); })(x)]);
    // -- derelerin iki kıyısında sık gül sınırları
    for (const st of STREAMS) {
      const { P, N } = st; let acc = 0;
      for (let i = 4; i < P.length; i++) {
        acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc < 10) continue; acc = 0;
        for (const sgn of [1, -1]) {
          const d = P[i][2] / 2 + bankWi(st, i, sgn > 0 ? 0 : 1) * 1.3 + 10 + r() * 4;
          const xw = P[i][0] + N[i][0] * d * sgn, yw = P[i][1] + N[i][1] * d * sgn; const s = persp(yw); const hgt = 18 + s * 12;
          if (yw > 1530 || !free(xw, yw, hgt, 3)) continue;
          items.push([yw, () => roseBush(S, sx(xw), sy(yw), hgt * 0.85, {})]);
        }
      }
    }
    // -- çiçek tarhları
    for (const [bx, by, bw2, bh2] of [[160, 1132, 70, 16], [440, 1126, 46, 12], [700, 1076, 50, 12], [960, 1084, 60, 14], [300, 1270, 60, 16], [800, 1250, 70, 16], [210, 1420, 80, 20], [880, 1400, 80, 20]]) {
      for (let q = 0; q < Math.round(bw2 * bh2 / 40); q++) { const a = r() * TAU, d = Math.sqrt(r()); const xw = bx + Math.cos(a) * d * bw2, yw = by + Math.sin(a) * d * bh2; const s = persp(yw); if (free(xw, yw, 20 * s, 2)) items.push([yw, () => roseBush(S, sx(xw), sy(yw), 13 + 7 * s, { roses: 2 })]); }
    }
    // -- alt sınır boyunca çiçek bordürü
    for (let xw = -200; xw < 1280; xw += 11 + r() * 8) { const yw = 1470 + r() * 34; const s = persp(yw); if (free(xw, yw, 24 * s, 3)) items.push([yw, ((a, b, c) => () => roseBush(S, a, b, c, { roses: 1 + Math.floor(r() * 2) }))(sx(xw), sy(yw), 15 + 8 * s)]); }
    // -- yapraklı küçük çiçek öbekleri (tek başına nokta yok)
    for (let i = 0; i < 46; i++) {
      const xw = ox + r() * w, yw = 1030 + r() * 480; if (!S.x.isPointInPath(region, sx(xw), sy(yw)) || !free(xw, yw, 16, 3)) continue;
      const s = persp(yw); items.push([yw, () => roseBush(S, sx(xw), sy(yw), 9 + 6 * s, { roses: 2 + Math.floor(r() * 2), color: r.pick(['#FBF3F2', '#F5B5CC', '#F6CF62', '#E8687F', '#FFFFFF', '#CFC2EE']) })]);
    }
    items.sort((a, b) => a[0] - b[0]);
    for (const [, f] of items) f();
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-orta', paintMid);

  // ================================================================ 6. IRMAK SİSTEMİ (yüzeyde akan, oyuksuz, kıyısı zeminle düz)
  const RIV = { x: -200, y: 1000, w: 1480, h: 1420 };
  const gTop = (xw) => 1478 + 10 * Math.sin(xw * 0.012 + 0.5) + 6 * Math.sin(xw * 0.033 + 2);
  const SUB = [1322, 1448]; // alt yazı kuşağı (zoom 1): kıyılar orta tonlu, parıltı yok
  const inSub = (yw) => yw > SUB[0] && yw < SUB[1];
  // kıyı kubbesi: oyuk inci (kapı yok), sedef yanardönerliği, içten ılık ışıma, altın taban halkası, temas gölgesi
  function bankDome(S, x, y, R, o = {}) {
    const cy = y - R * 0.16; const a0 = Math.asin(clamp((y - cy) / R)); const hw = R * Math.cos(a0);
    fill(S, ellipsePath(x, y + R * 0.04, hw * 1.06, R * 0.16), '#2A3E5A', { h: 130, alpha: 0.26 });
    const body = new Path2D(); body.arc(x, cy, R, a0, Math.PI - a0, true); body.closePath();
    S.rim(body, { w: 0.7 + R * 0.025, alpha: 0.4 });
    fill(S, body, o.dim ? '#B9B0D2' : '#D6CEE5', { h: 150 });
    const ramp = o.dim ? ['#7E77A8', '#928BBA', '#A79FC8', '#BAB2D4', '#C9C2DD', '#D6D0E5'] : ['#968EBF', '#AEA5D1', '#C7BFE1', '#DCD5EB', '#ECE7F2', '#F8F5F7'];
    nacreSphere(S, x, cy, R, body, { ramp, side: 1, tintAmt: 0.42, cover: 0.9 });
    S.x.save(); S.hx.save(); S.x.clip(body); S.hx.clip(body);
    softPatch(S, x, y - R * 0.2, R * 0.55, R * 0.28, '#F6D8C4', o.dim ? 0.2 : 0.32);
    if (!o.dim) softPatch(S, x - R * 0.16, cy - R * 0.4, R * 0.3, R * 0.2, '#FFFDF8', 0.3);
    S.x.restore(); S.hx.restore();
    fill(S, ellipsePath(x, y - R * 0.02, hw * 1.03, Math.max(1.2, R * 0.07)), GOLD[3], { h: 168, alpha: 0.95 });
    fill(S, ellipsePath(x, y - R * 0.05, hw * 0.98, Math.max(0.6, R * 0.03)), GOLD[5], { h: 178, alpha: 0.8 });
  }
  let _domes = null;
  function domeList() { // inci kıyı boyunca kesintisiz kubbe dizisi (kıyının kendisi oyuk inci kubbelerdir)
    if (_domes) return _domes;
    const out = [];
    for (const st of STREAMS) for (const side of [0, 1]) {
      if (st.banks[side] !== 'pearl') continue;
      let l = st.id === 'R' ? 20 : 14; const lEnd = st.id === 'M' ? st.len : st.len - 56;
      while (l < lEnd) {
        let i = st.L.findIndex((v) => v >= l); if (i < 0) break;
        const p = st.P[i], n = st.N[i]; const sg = side === 0 ? 1 : -1;
        const R = clamp(bankBase(p[1]) * 0.6, 5, 34) * (0.86 + NOISE(l * 0.05, side + sIdx(st) * 3) * 0.28);
        const wE = side === 0 ? waterA(st)(i) : -waterB(st)(i); const d = wE + R * 0.98;
        const xw = p[0] + n[0] * d * sg, yw = p[1] + n[1] * d * sg;
        if (waterDist(xw, yw) >= R * 0.86 && yw < RIV.y + RIV.h - 12) out.push([xw, yw, R]);
        l += R * 1.62;
      }
    }
    out.sort((a, b) => a[1] - b[1]);
    return (_domes = out);
  }
  function paintRiver() {
    const { w, h } = RIV; const ox = RIV.x, oy = RIV.y;
    const S = Paint.sprite(w, h, { seed: 5606, k: 1 }); const r = S.r;
    const sx = (xw) => xw - ox, sy = (yw) => yw - oy;
    const persp = (yw) => 0.5 + clamp((yw - 1050) / 850) * 1.15;
    // -- 1. ön zemin: serin, uzayan gölgede çimen
    const gp = new Path2D(); gp.moveTo(-10, h + 10); for (let x = -10; x <= w + 10; x += 10) gp.lineTo(x, sy(gTop(x + ox))); gp.lineTo(w + 10, h + 10); gp.closePath();
    S.rim(gp, { w: 2, alpha: 0.5 });
    const grass = ['#0A3A3B', '#0E4A44', '#135B49', '#1A6D4F', '#248054', '#329459', '#47A75F', '#66B966'];
    fill(S, gp, grass[3], { h: 140 });
    const shadeG = (x, y) => { const xw = x + ox, yw = y + oy; const edge = Math.min(Math.abs(xw), Math.abs(xw - 1080)); return clamp(0.5 - clamp((yw - 1500) / 480) * 0.3 - clamp(1 - edge / 380) * 0.14 + (NOISE(x * 0.004 + 7, y * 0.006) - 0.5) * 0.5); };
    field(S, { bbox: [-10, sy(1450), w + 10, h + 10], path: gp, ramp: grass, shade: shadeG, dir: () => (r() - 0.5) * 0.35, len: [26, 56], wid: [8, 14], size: (x, y) => persp(y + oy), cover: 2.3, noise: 0.05, broken: 0.07, max: 8000 });
    for (let x = -10; x < w + 10; x += 5 + r() * 6) { const yy = sy(gTop(x + ox)) + 2; Paint.drawStroke(S, x, yy - 5, -Math.PI / 2 + (r() - 0.5) * 0.6, 11 + r() * 9, 3 + r() * 2, r.pick(grass.slice(3, 7)), { dry: 0.5 }); }
    // -- 2. kıyılar: zeminle aynı düzlemde altın ve inci; genişlik değişir, dış kenar çimene karışır
    const GB = ['#B88A34', '#CCA24A', '#DEB862', '#EBCD84', '#F5E2AC'], PB = ['#A39CC0', '#BCB5D2', '#D2CCDF', '#E3DEEA', '#F2EFF3'];
    const bankShade = (x, y) => clamp(0.66 - clamp((y + oy - 1520) / 520) * 0.34 - (inSub(y + oy) ? 0.24 : 0) + (NOISE(x * 0.02, y * 0.02) - 0.5) * 0.3);
    for (const st of STREAMS) for (const side of [0, 1]) {
      const bp = bankPath(st, side, ox, oy); const kind = st.banks[side];
      const bb = bboxOf(st.P.map((p) => [p[0] - ox, p[1] - oy, p[2] + 2.6 * bankBase(p[1]) + 14]), 4);
      fill(S, bp, kind === 'gold' ? GB[2] : PB[2], { h: 150 });
      field(S, { bbox: bb, path: bp, clip: bp, ramp: kind === 'gold' ? GB : PB, shade: bankShade, dir: (x, y) => { const f = flowDir(x + ox, y + oy); return Math.atan2(f[1], f[0]) + (r() - 0.5) * 0.3; }, len: [12, 30], wid: [4, 8], size: (x, y) => persp(y + oy), cover: 2.4, noise: 0.08,
        colorF: kind === 'pearl' ? (x, y, ki, c) => (ki >= 2 && r() < 0.45 ? mix(c, r.pick(NACRE), 0.45) : c) : (x, y, ki, c) => (ki >= 3 && r() < 0.1 && !inSub(y + oy) ? '#FFF2C8' : c) });
      // dış kenarda çimen tutamları ve kıyı taneleri: kıyı çimene kademeli geçer
      const { P, N } = st; const sg = side === 0 ? 1 : -1;
      for (let i = 2; i < P.length; i++) {
        const bw = bankWi(st, i, side) * ragged(st, i, side); if (bw < 2) continue; const wE = side === 0 ? waterA(st)(i) : -waterB(st)(i);
        const yw0 = P[i][1]; const s = persp(yw0); const gcol = yw0 < 1490 ? LAWN2 : grass;
        for (let q = 0; q < 2; q++) {
          const d = wE + bw * (0.78 + r() * 0.45); const xw = P[i][0] + N[i][0] * d * sg, yw = P[i][1] + N[i][1] * d * sg;
          if (waterDist(xw, yw) < bw * 0.6) continue;
          Paint.drawStroke(S, sx(xw), sy(yw), Math.atan2(N[i][1] * sg, N[i][0] * sg) + (r() - 0.5) * 1.2, (6 + r() * 8) * s, (2 + r() * 1.6) * s, r.pick(gcol.slice(yw0 < 1490 ? 2 : 3, yw0 < 1490 ? 5 : 6)), { dry: 0.5 });
          if (r() < 0.35) { const d2 = wE + bw * (0.9 + r() * 0.6); const xx = P[i][0] + N[i][0] * d2 * sg, yy = P[i][1] + N[i][1] * d2 * sg; const pr = (1 + r() * 1.3) * s; fill(S, ellipsePath(sx(xx), sy(yy), pr, pr * 0.7), kind === 'gold' ? (inSub(yy) ? '#B89040' : '#EBCB78') : (inSub(yy) ? '#A69FC2' : '#ECE6F1'), { h: 165 }); }
        }
      }
    }
    // -- 3. su: yatak (sığda açık, derinde turkuaz) → çakıllar (yalnız sığda, suyun rengine boyanmış) → saydam örtü → yüzey
    const wp = waterPath(ox, oy);
    const dep = (x, y) => depthAt(x + ox, y + oy) * (1 - 0.5 * nearSpring(x + ox, y + oy));
    const fdir = (x, y) => { const f = flowDir(x + ox, y + oy); const a = Math.atan2(f[1], f[0]); return lerp(a, 0, nearSpring(x + ox, y + oy) * 0.9); };
    const shadeW = (y) => clamp((y + oy - 1560) / 500) * 0.16;
    S.rim(wp, { w: 1.4, alpha: 0.5, color: '#2E7E86' });
    fill(S, wp, '#7FD0CC', { h: 135 });
    const wbb = [sx(-20), sy(1000), sx(1120), h + 10];
    const BED = ['#1F7D92', '#2A92A3', '#3CA8B2', '#5BBDBF', '#82D0CC', '#ABE1DA', '#D1F1EA'];
    field(S, { bbox: wbb, path: wp, ramp: BED, shade: (x, y) => clamp(0.98 - Math.pow(dep(x, y), 0.8) * 0.82 - shadeW(y)), dir: (x, y) => fdir(x, y) + (r() - 0.5) * 0.14, len: [22, 46], wid: [8, 13], size: (x, y) => persp(y + oy), cover: 2.6, noise: 0.03, broken: 0.04, jitter: 6, jitterFreq: 0.02 });
    S.x.save(); S.hx.save(); S.x.clip(wp); S.hx.clip(wp);
    for (let i = 0; i < 1400; i++) {
      const x = wbb[0] + r() * (wbb[2] - wbb[0]), y = wbb[1] + r() * (wbb[3] - wbb[1]);
      const d = dep(x, y); if (d <= 0.03 || d > 0.42 || r() < d * 1.6) continue;
      const s = persp(y + oy); const pr = (1.4 + Math.pow(r(), 1.6) * 3.2) * s;
      const kind = r(); const wc = mix('#B8E8E0', '#3E9FAD', d * 1.6);
      let c0, c1, c2;
      if (kind < 0.8) { c0 = '#F3EEF3'; c1 = '#B9AED0'; c2 = '#FFFFFF'; } else if (kind < 0.86) { c0 = '#B81E36'; c1 = '#6E1020'; c2 = '#F58E98'; } else { c0 = '#E8C35A'; c1 = '#9C6A1C'; c2 = '#FFF0B8'; }
      const t = clamp(0.42 + d * 0.9, 0, 0.85); const ang = r() * Math.PI;
      S.x.save(); S.x.translate(x, y); S.x.rotate(ang);
      S.x.fillStyle = mix(c1, wc, t); S.x.beginPath(); S.x.ellipse(pr * 0.12, pr * 0.16, pr, pr * 0.7, 0, 0, TAU); S.x.fill();
      S.x.fillStyle = mix(c0, wc, t); S.x.beginPath(); S.x.ellipse(0, 0, pr * 0.9, pr * 0.62, 0, 0, TAU); S.x.fill();
      S.x.fillStyle = mix(c2, wc, t * 0.7); S.x.beginPath(); S.x.ellipse(-pr * 0.3, -pr * 0.22, pr * 0.3, pr * 0.19, 0, 0, TAU); S.x.fill();
      S.x.restore();
      S.hx.save(); S.hx.fillStyle = 'rgb(160,160,160)'; S.hx.beginPath(); S.hx.ellipse(x, y, pr, pr * 0.7, ang, 0, TAU); S.hx.fill(); S.hx.restore();
    }
    S.x.restore(); S.hx.restore();
    field(S, { bbox: wbb, path: wp, clip: wp, ramp: ['#1E7A90', '#2B93A4', '#41AAB3', '#66C2C2'], shade: (x, y) => clamp(0.95 - dep(x, y) * 0.9 - shadeW(y)), dir: (x, y) => fdir(x, y) + (r() - 0.5) * 0.1, len: [30, 60], wid: [8, 13], size: (x, y) => persp(y + oy),
      cover: 1.1, noise: 0.05, alphaF: (x, y) => { const d = dep(x, y); return d < 0.25 ? 0 : 0.12 + (d - 0.25) * 0.5; }, height: false, dry: 0.35 });
    S.x.save(); S.hx.save(); S.x.clip(wp); S.hx.clip(wp);
    // yüzey ışıltıları (alt yazı kuşağında yok)
    for (let g = 0; g < 75; g++) {
      const x = wbb[0] + r() * (wbb[2] - wbb[0]), y = wbb[1] + r() * (wbb[3] - wbb[1]); const d = dep(x, y); if (d <= 0.12 || inSub(y + oy)) continue;
      const a = fdir(x, y); const s = persp(y + oy); const m = 2 + Math.floor(r() * 3); const n = [-Math.sin(a), Math.cos(a)];
      for (let q = 0; q < m; q++) { const o = (q - m / 2) * 6 * s, t = (r() - 0.5) * 20 * s; Paint.drawStroke(S, x + n[0] * o + Math.cos(a) * t, y + n[1] * o + Math.sin(a) * t, a + (r() - 0.5) * 0.06, (22 + r() * 30) * s, (1.8 + r() * 1.6) * s, r() < 0.6 ? '#EAFCF8' : '#BDEDE6', { dry: 0.55, alpha: 0.7 }); }
    }
    // kıyı yansımaları: yalnız kendi derelerinin sığ kenarında; birleşme yerinde ana ırmağın üstüne düşmez
    for (const st of STREAMS) for (const sd of [0, 1]) {
      const kind = st.banks[sd]; const col = kind === 'gold' ? '#F0D690' : '#E6DDF0'; const si = sIdx(st);
      for (let i = 3; i < st.P.length; i += 2) {
        if (r() < 0.45) continue; if (st.id !== 'M' && st.len - st.L[i] < 70) continue;
        const p = st.P[i], n = st.N[i], t = st.T[i]; const sg = sd === 0 ? 1 : -1; const o = (p[2] / 2) * (0.66 + r() * 0.2) * sg;
        const xw = p[0] + n[0] * o, yw = p[1] + n[1] * o; const s = persp(yw);
        if (depthAt(xw, yw) > 0.38 || nearestRaw(xw, yw)[5] !== si || inSub(yw)) continue;
        Paint.drawStroke(S, sx(xw), sy(yw), Math.atan2(t[1], t[0]) + (r() - 0.5) * 0.06, (14 + r() * 22) * s, (2 + r() * 2) * s, col, { dry: 0.4, alpha: 0.5 });
      }
    }
    S.x.restore(); S.hx.restore();
    // su kıyıyı yalar: kenardan kıyıya taşan ince sığ su dilleri, sonra ıslak menisküs
    for (const st of STREAMS) for (const sd of [1, -1]) {
      for (let i = 2; i < st.P.length - 1; i++) {
        const o = sd > 0 ? waterA(st)(i) : waterB(st)(i); const p = st.P[i], n = st.N[i], t = st.T[i];
        if (r() < 0.16) { const bw = bankWi(st, i, sd > 0 ? 0 : 1); const off = o + sd * bw * (0.2 + r() * 0.3); const xw = p[0] + n[0] * off, yw = p[1] + n[1] * off; if (depthAt(xw, yw) <= 0) Paint.drawStroke(S, sx(xw), sy(yw), Math.atan2(t[1], t[0]) + (r() - 0.5) * 0.1, (12 + r() * 20) * persp(yw), (2.4 + r() * 2.4) * persp(yw), inSub(yw) ? '#7FC4C2' : '#BDEAE3', { dry: 0.3, alpha: 0.6 }); }
        if (r() < 0.3) continue;
        const xw = p[0] + n[0] * (o - sd * 2.2), yw = p[1] + n[1] * (o - sd * 2.2); if (depthAt(xw, yw) > 0.3) continue;
        Paint.drawStroke(S, sx(xw), sy(yw), Math.atan2(t[1], t[0]), (10 + r() * 14) * persp(yw), (1.4 + r() * 0.8) * persp(yw) * 0.8, inSub(yw) ? '#A8E2DC' : r() < 0.7 ? '#F4FFFC' : '#A8E2DC', { dry: 0.3, alpha: 0.8 });
      }
    }
    // -- 4. inci kıyı: kesintisiz oyuk inci kubbe dizisi
    for (const [xw, yw, R] of domeList()) bankDome(S, sx(xw), sy(yw), R, { dim: inSub(yw) });
    // -- 5. zeminde yapraklı gül öbekleri (dağınık tek nokta yok) ve kıyı dışında küçük güller
    const domes = domeList();
    const nearDome = (xw, yw, m = 1.4) => domes.some(([dx, dy, R]) => Math.hypot(dx - xw, (dy - yw) * 1.3) < R * m + 8);
    const spots = [];
    for (let i = 0; i < 70; i++) { const xw = ox + r() * w, yw = 1500 + r() * (h + oy - 1520); if (waterGap(xw, yw) < 10 || nearDome(xw, yw)) continue; spots.push([xw, yw]); }
    for (const st of STREAMS) { const { P, N } = st; for (let i = 8; i < P.length; i += 3) { if (r() < 0.45) continue; const sgn = r() < 0.5 ? 1 : -1; const d = P[i][2] / 2 + bankWi(st, i, sgn > 0 ? 0 : 1) * 1.3 + 8 + r() * 12; const xw = P[i][0] + N[i][0] * d * sgn, yw = P[i][1] + N[i][1] * d * sgn; if (yw < gTop(xw) + 6 || waterGap(xw, yw) < 3 || nearDome(xw, yw, 1.6)) continue; spots.push([xw, yw]); } }
    spots.sort((a, b) => a[1] - b[1]);
    for (const [xw, yw] of spots) { const s = persp(yw); roseBush(S, sx(xw), sy(yw), 9 + 10 * s, { roses: 1 + Math.floor(r() * 3), lift: -0.8, dim: -0.04 }); }
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k: 1 };
  }
  defSprite('cennet-irmak', paintRiver);

  // ================================================================ 7. ÇERÇEVE AĞAÇLARI (altın gövde, zümrüt taç, alçak dallarda meyve)
  function paintPom(S, x, y, R, tilt = 0) {
    const r = S.r;
    const body = smoothPath(blobPts(x, y, R, R * 0.95, 24, 0.035, Math.floor(r() * 1e5)));
    S.rim(body, { w: 1.8 });
    fill(S, body, RUBY[2], { h: 150 });
    const cxw = x + Math.sin(tilt) * R, cyw = y + Math.cos(tilt) * R;
    field(S, { bbox: [x - R, y - R, x + R, y + R], clip: body, ramp: RUBY, shade: Paint.sphere(x - R * 0.15, y - R * 0.3, R * 1.15, [-0.25, -0.97], 0.14), dir: (px, py) => Math.atan2(py - cyw, px - cxw) + Math.PI / 2 + (r() - 0.5) * 0.3, len: [R * 0.5, R * 0.9], wid: [4, 7], cover: 3.4, noise: 0.04 });
    const ct = [x + Math.sin(tilt) * R * 0.86, y + Math.cos(tilt) * R * 0.86]; const cw = R * 0.34;
    const cr = new Path2D(); const ux = Math.cos(tilt), uy = -Math.sin(tilt), vx = Math.sin(tilt), vy = Math.cos(tilt);
    const P = (a, b) => [ct[0] + ux * a + vx * b, ct[1] + uy * a + vy * b];
    cr.moveTo(...P(-cw, -R * 0.06));
    for (let i = 0; i <= 6; i++) { const a = -cw + (i / 6) * cw * 2; const tip = i % 2 === 0; cr.lineTo(...P(a * (tip ? 1.12 : 0.9), tip ? R * 0.34 : R * 0.16)); }
    cr.lineTo(...P(cw, -R * 0.06)); cr.closePath();
    S.rim(cr, { w: 1.2, alpha: 0.7 });
    fill(S, cr, '#8E1A2C', { h: 155 });
    fill(S, poly([P(-cw * 0.5, R * 0.05), P(cw * 0.5, R * 0.05), P(cw * 0.4, R * 0.16), P(-cw * 0.4, R * 0.16)]), '#4E0A16', { h: 140 });
    softPatch(S, x - R * 0.22, y - R * 0.36, R * 0.24, R * 0.16, '#F6A9AC', 0.45, 2);
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
      fill(S, circ(bx - berry * 0.08, by - berry * 0.12, berry * 0.78), c0, { h: 165 });
      fill(S, circ(bx - berry * 0.22, by - berry * 0.3, berry * 0.22), mix(c0, '#FCFBE6', 0.6), { h: 178 });
    }
  }
  function grapeLeaf(S, x, y, R, ang, col) { // beş loblu asma yaprağı: koyu taca karşı açık sarı-yeşil, koyu damarlar
    const p = new Path2D(); const n = 5;
    for (let i = 0; i <= n * 2; i++) { const a = ang - Math.PI * 0.9 + (i / (n * 2)) * Math.PI * 1.8; const rr = i % 2 ? R * 0.6 : R * (i === n ? 1.05 : 0.92); const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; i ? p.lineTo(px, py) : p.moveTo(px, py); }
    p.lineTo(x, y); p.closePath();
    S.rim(p, { w: 1.6, alpha: 0.8 });
    fill(S, p, col, { h: 155 });
    field(S, { bbox: [x - R, y - R, x + R, y + R], clip: p, ramp: [shade(col, -0.1), col, shade(col, 0.08, 0.9)], shade: (px, py) => clamp(0.5 + ((px - x) * Math.cos(ang) + (py - y) * Math.sin(ang)) / R * 0.4), dir: ang, dirJit: 0.5, len: [R * 0.4, R * 0.8], wid: [3, 5], count: 14, noise: 0.1 });
    for (let i = 0; i < 5; i++) { const a = ang - Math.PI * 0.72 + i * Math.PI * 0.36; Paint.drawStroke(S, x + Math.cos(a) * R * 0.36, y + Math.sin(a) * R * 0.36, a, R * 0.68, 1.6, shade(col, -0.24, 1.1), { dry: 0.3, height: false, alpha: 0.9 }); }
  }
  // dünya koordinatından ağaç sprite'ına (pivot dünya noktasıyla eşleşir)
  function paintTree(cfgT) {
    const OY = 220, EXTB = 420; // üstte taç payı; altta gövde payı (yükselişte gövde tabanı görünmez)
    const w = 900, h = 2080 + OY + EXTB; const mir = cfgT.mirror;
    const S = Paint.sprite(w, h, { seed: cfgT.seed, k: 1 }); const r = S.r;
    const BX = 200; const PX = mir ? w - BX : BX, PY = h - EXTB;
    const W2S = (wx, wy) => [wx - cfgT.at[0] + PX, wy - cfgT.at[1] + PY];
    const MX = (x) => (mir ? w - x : x);
    const M = (pts) => pts.map(([x, y, ww]) => [MX(x), y + OY, ww]);
    const LIT = [mir ? -0.3 : 0.3, -0.95];
    // doygun metal altın: koyu kehribar gölge, dar parlak şerit, solgun krem yok
    const G2 = ['#4A2606', '#6B3C09', '#91590F', '#B87C18', '#D49C27', '#E9BB42', '#FFE89A'];
    const PROF = [[-1, 0.06], [-0.75, 0.18], [-0.4, 0.34], [-0.05, 0.5], [0.14, 0.62], [0.24, 0.74], [0.3, 0.97], [0.36, 0.74], [0.5, 0.6], [0.75, 0.46], [0.92, 0.32], [1, 0.24]];
    const prof = (u) => { for (let i = 0; i < PROF.length - 1; i++) if (u <= PROF[i + 1][0]) return lerp(PROF[i][1], PROF[i + 1][1], (u - PROF[i][0]) / (PROF[i + 1][0] - PROF[i][0])); return 0.5; };
    const low = cfgT.low;
    const lowY = (x) => { for (let i = 0; i < low.length - 1; i++) if (x >= low[i][0] && x <= low[i + 1][0]) return lerp(low[i][1], low[i + 1][1], (x - low[i][0]) / (low[i + 1][0] - low[i][0])); return x < low[0][0] ? low[0][1] : low[low.length - 1][1]; };
    const trunk = [[BX - 64, 2112 + EXTB + 30, 214], ...(cfgT.trunk || [[BX, 2112, 176], [244, 1880, 146], [322, 1630, 124], [384, 1380, 108], [404, 1180, 98], [394, 1010, 88], [374, 880, 80], [362, 780, 74]])];
    const topY = (x) => -200 + 70 * Math.pow((x - 260) / 700, 2) + 18 * Math.sin(x * 0.021 + cfgT.seed) + 10 * Math.sin(x * 0.053);
    const boughs = [
      [[362, 800, 70], [366, 650, 56], [384, 510, 46], [430, 390, 38], [520, 300, 30], [610, 230, 22], [680, 170, 16]],
      [[352, 860, 56], [300, 690, 46], [244, 480, 38], [160, 240, 28], [70, 0, 22], [20, -60, 18]],
      [[380, 980, 44], [280, 940, 32], [160, 930, 24], [40, 950, 18], [-40, 980, 14]],
      [[436, 380, 22], [530, 330, 16], [620, 300, 12]],
      [[244, 480, 24], [330, 330, 18], [420, 210, 14], [500, 120, 11]],
    ];
    { const tt = trunk[trunk.length - 1]; const dx = tt[0] - 362, dy = tt[1] - 780; for (const b of boughs) for (const q of b) { q[0] += dx; q[1] += dy; } }
    const tubeO = (nz, big) => ({ len: big ? [30, 64] : [24, 50], wid: big ? [6, 11] : [5, 9], nz, lit: LIT, prof });
    boughs.slice(2).forEach((b, i) => tube(S, M(b), G2, tubeO(i * 3 + 1, false)));
    tube(S, M(boughs[1]), G2, tubeO(11, true));
    tube(S, M(boughs[0]), G2, tubeO(13, true));
    // alçak dallar gövdeden önce boyanır: dibi gövdenin arkasında kalır (kesik dal ucu görünmez)
    const LB = (cfgT.lowBoughs || []).map((lb) => ({ ...lb, sp: lb.pts.map(([wx, wy, ww]) => [...W2S(wx, wy), ww]) }));
    LB.forEach((lb, i) => tube(S, lb.sp, G2, { len: [24, 50], wid: [5, 9], nz: 31 + i * 5, lit: LIT, prof, rimW: 2 }));
    tube(S, M(trunk), G2, { len: [50, 110], wid: [8, 13], nz: 17, lit: LIT, cover: 3.0, prof, shadeY: (y) => -clamp((y - 1500) / 600) * 0.1 });
    // pürüzsüz metal yüzey: uzun, ince kehribar ve altın şeritler (budak, yarık, kırık kabuk yok)
    const TP = crSample(M(trunk), 8); const TT = tangents(TP);
    for (let i = 0; i < 46; i++) {
      const q = Math.floor(r() * (TP.length - 3)) + 1; const p = TP[q], t = TT[q]; const n = [-t[1], t[0]]; const off = (r() - 0.5) * p[2] * 0.8;
      const lit = (n[0] * LIT[0] + n[1] * LIT[1]) * Math.sign(off) > 0;
      const c = lit ? r.pick(['#F0CC5E', '#E4B444']) : r.pick(['#6E430C', '#8A5A14']);
      Paint.drawStroke(S, p[0] + n[0] * off, p[1] + n[1] * off, Math.atan2(t[1], t[0]) + (r() - 0.5) * 0.03, 50 + r() * 90, 2 + r() * 2.4, c, { dry: 0.25, alpha: 0.55 });
    }
    // ---- taç
    const clumps = [];
    for (let gx = -40; gx < 800; gx += 88) for (let gy = -280; gy < 1000; gy += 88) { const x = gx + (r() - 0.5) * 56, y = gy + (r() - 0.5) * 56; const R = Math.min(78 + r() * 50, 830 - x); if (R < 40 || y > lowY(x) - 70 || y < topY(x) + R * 0.6) continue; clumps.push([x, y, R, 0]); }
    for (let x = -40; x < 820; x += 52 + r() * 30) { const R = Math.min(56 + r() * 30, 830 - x); const y = topY(x) + R * 0.75; clumps.push([x, y, R, 1]); }
    for (let x = -50; x < 830; x += 40 + r() * 30) { const ly = lowY(x); const R = Math.min((ly > 600 ? 62 : 52) + r() * 26, 830 - x); clumps.push([x + (r() - 0.5) * 16, ly - R * 0.66, R, 1]); }
    for (let x = -30; x < 830; x += 64 + r() * 46) { const ly = lowY(x); const R = Math.min((ly > 600 ? 50 : 42) + r() * 18, 830 - x); clumps.push([x, ly - R * 0.42 + r() * 8, R, 2]); }
    for (const c of clumps) c[1] += OY;
    const can = new Path2D(); for (const [x, y, R] of clumps) can.addPath(smoothPath(blobPts(MX(x), y, R * 0.92, R * 0.86, 18, 0.1, Math.floor(x * 3 + y))));
    {
      const rc = new Path2D(); rc.rect(mir ? w - 600 : 0, 0, 600, h);
      const lowP = new Path2D(); lowP.moveTo(MX(-60), h); for (let x = -60; x <= 900; x += 20) lowP.lineTo(MX(x), lowY(x) - 50 + OY); lowP.lineTo(MX(900), h); lowP.closePath();
      S.x.save(); const cp = new Path2D(); cp.addPath(rc); cp.addPath(lowP); S.x.clip(cp); S.rim(can, { w: 3 }); S.x.restore();
    }
    fill(S, can, '#073A30', { h: 130 });
    field(S, { bbox: [0, 0, w, 1000 + OY], path: can, ramp: LEAF.slice(0, 4), shade: (px, py) => clamp(0.6 - clamp((py - OY - 300) / 500) * 0.4 + (NOISE(px * 0.01, py * 0.01) - 0.5) * 0.4), dir: () => r() * TAU, len: [24, 38], wid: [10, 15], cover: 0.9, leaf: true, noise: 0.05, max: 2600 });
    for (const pass of [0, 1, 2]) {
      const list = clumps.filter((c) => c[3] === pass).sort((a, b) => a[1] - b[1]);
      for (const [x0, y, R] of list) {
        const x = MX(x0);
        const sph = Paint.sphere(x + (mir ? 0.1 : -0.1) * R, y - R * 0.55, R * 1.25, [mir ? 0.15 : -0.15, -0.99], 0.06);
        const lift = pass === 0 ? -0.22 : pass === 1 ? -0.06 : 0.05;
        const deep = (yy) => clamp((yy - OY - 420) / 600) * 0.14;
        field(S, { bbox: [x - R * 1.1, y - R * 1.1, x + R * 1.1, y + R * 1.1], mask: (px, py) => Math.hypot(px - x, (py - y) / 0.9) < R * (0.9 + NOISE(px * 0.03, py * 0.03) * 0.25),
          ramp: LEAF, shade: (px, py) => clamp(sph(px, py) * 0.95 + lift - deep(py)), dir: (px, py) => Math.atan2(py - y, px - x) + (r() - 0.5) * 1.1,
          len: [26, 42], wid: [11, 17], cover: pass === 2 ? 2.3 : 1.8, leaf: true, noise: 0.05, broken: 0.06 });
      }
    }
    for (let x = -30; x < 820; x += 9 + r() * 12) { const ly = lowY(x) - 8 + OY; const m = 2 + Math.floor(r() * 3); for (let q = 0; q < m; q++) leaf(S, MX(x + (r() - 0.5) * 16), ly + r() * 20, Math.PI / 2 + (r() - 0.5) * 0.9, 26 + r() * 14, 11 + r() * 4, r.pick(LEAF.slice(3, 7)), {}); }
    // ---- alçak dallar: gövdeden içeri ve izleyiciye doğru eğilir; meyve elle uzanılacak yükseklikte (dünya y≈1250–1700)
    const GRAPE = ['#5E7A1E', '#7E9A2A', '#A3B83A', '#C6D25A', '#E2E79A'];
    const stemW = (x0, y0, x1, y1, bend) => S.line([[x0, y0], [lerp(x0, x1, 0.5) + bend * 0.5, lerp(y0, y1, 0.5)], [x1, y1]], 3.2, '#7A5512', { w1: 2.2, edge: false });
    const hangFruit = (f, x, y) => {
      if (f.t === 'nar') { const n = f.n ?? 2; leaf(S, x - 20, y - 6, -2.6, 36, 14, '#1F8A50', { vein: '#0B5A40' }); for (let i = 0; i < n; i++) { const a = i - (n - 1) / 2; paintPom(S, x + a * 42, y + 30 + Math.abs(a) * 12, f.R ?? 28, a * 0.25); } leaf(S, x + 22, y - 3, -0.5, 36, 14, '#2E9A52', { vein: '#127048' }); }
      if (f.t === 'uzum') { grapeLeaf(S, x + (mir ? -22 : 22), y - 2, 26, -Math.PI / 2 + (mir ? -0.55 : 0.55), '#86C24E'); paintGrapes(S, x, y + 12, f.s ?? 1, GRAPE); }
    };
    for (const lb of LB) {
      const P2 = crSample(lb.sp, 6);
      for (let q = 0; q < 34; q++) { const p = P2[Math.floor((0.25 + r() * 0.75) * (P2.length - 1))]; leaf(S, p[0] + (r() - 0.5) * 40, p[1] + 6 + r() * 26, Math.PI / 2 + (r() - 0.5) * 1.2, 26 + r() * 12, 11 + r() * 4, r.pick(LEAF.slice(1, 5)), {}); }
      for (const [t0, R, lift] of lb.clumps) { const p = P2[Math.min(P2.length - 1, Math.floor(t0 * (P2.length - 1)))]; const sil = smoothPath(blobPts(p[0] + lift[0], p[1] + lift[1], R * 0.95, R * 0.78, 18, 0.12, Math.floor(p[0] * 3 + p[1]))); S.rim(sil, { w: 2.4, alpha: 0.7 }); fill(S, sil, '#073A30', { h: 130 }); leafClump(S, p[0] + lift[0], p[1] + lift[1], R, { lift: -0.06, sy: 0.82, cover: 2.8, len: [26, 40], wid: [11, 16] }); }
      for (let q = 0; q < 26; q++) { const p = P2[Math.floor((0.3 + r() * 0.7) * (P2.length - 1))]; leaf(S, p[0] + (r() - 0.5) * 50, p[1] + 14 + r() * 26, Math.PI / 2 + (r() - 0.5) * 1.0, 24 + r() * 12, 10 + r() * 4, r.pick(LEAF.slice(3, 7)), {}); }
      for (const f of lb.fruit) { const [ax, ay] = W2S(f.at[0], f.at[1]); const [fx, fy] = W2S(f.at[0] + (f.bend ?? 0), f.at[1] + f.len); stemW(ax, ay, fx, fy, (f.bend ?? 0) * 0.5); hangFruit(f, fx, fy); }
    }
    // taç kenarındaki eski iki salkım (gövde yanında, gökte değil)
    const stem = (x, y0, y1, bend) => S.line([[x, y0], [x + bend * 0.5, (y0 + y1) / 2], [x + bend, y1]], 3.4, '#7A5512', { w1: 2.4, edge: false });
    for (const f of cfgT.fruit) {
      const xl = mir ? 1320 - f.wx : f.wx + 240; const y0 = lowY(xl) - 14 + OY, y = y0 + f.len;
      const x = MX(xl), bend = (mir ? -1 : 1) * (f.bend ?? 0);
      stem(x, y0, y, bend); hangFruit(f, x + bend, y);
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: PX, py: PY, k: 1 };
  }
  const TREE_SOL = { seed: 5701, mirror: false, at: [-40, 1950],
    low: [[-40, 990], [200, 990], [262, 960], [300, 880], [322, 760], [334, 620], [346, 490], [362, 390], [404, 346], [520, 348], [600, 332], [690, 354], [770, 322], [880, 316], [960, 310]],
    fruit: [{ t: 'nar', wx: 44, len: 46, n: 3, bend: 6, R: 30 }],
    lowBoughs: [
      { pts: [[108, 1440, 40], [176, 1460, 30], [250, 1468, 22], [318, 1482, 15], [362, 1500, 10]], clumps: [[0.3, 46, [-4, -18]], [0.6, 60, [0, -12]], [0.88, 56, [8, -6]], [1.0, 44, [22, 6]]],
        fruit: [{ t: 'nar', at: [292, 1478], len: 38, n: 2, bend: 4, R: 27 }] },
      { pts: [[56, 1620, 32], [112, 1640, 24], [170, 1660, 16], [214, 1676, 10]], clumps: [[0.45, 44, [0, -12]], [0.85, 46, [6, -4]], [1.0, 34, [16, 4]]],
        fruit: [{ t: 'uzum', at: [176, 1662], len: 26, s: 1.05, bend: 3 }] },
    ] };
  const TREE_SAG = { seed: 5702, mirror: true, at: [1120, 1950],
    trunk: [[200, 2112, 170], [212, 1880, 142], [232, 1630, 120], [256, 1380, 104], [276, 1180, 94], [294, 1010, 86], [312, 880, 78], [330, 780, 72]],
    low: [[-40, 1010], [200, 1010], [262, 980], [300, 900], [320, 780], [332, 640], [344, 510], [360, 400], [400, 352], [520, 352], [610, 336], [700, 358], [790, 326], [880, 318], [960, 312]],
    fruit: [{ t: 'uzum', wx: 976, len: 40, s: 1.12, bend: 5 }, { t: 'nar', wx: 1056, len: 110, n: 2, bend: 12, R: 31 }],
    lowBoughs: [
      { pts: [[1066, 1196, 34], [1004, 1212, 26], [944, 1222, 18], [896, 1236, 11]], clumps: [[0.25, 40, [4, -18]], [0.55, 52, [0, -12]], [0.9, 46, [-8, -6]], [1.0, 34, [-18, 4]]],
        fruit: [{ t: 'uzum', at: [930, 1226], len: 20, s: 0.95, bend: -2 }] },
      { pts: [[1096, 1560, 38], [1030, 1584, 28], [966, 1606, 20], [916, 1630, 12], [884, 1650, 8]], clumps: [[0.3, 48, [0, -16]], [0.6, 60, [0, -10]], [0.88, 54, [-10, -4]], [1.0, 40, [-22, 6]]],
        fruit: [{ t: 'nar', at: [944, 1614], len: 34, n: 2, bend: -4, R: 28 }] },
    ] };
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
  // Köşkler, orta bahçe ve ırmak aynı paralaksta (0.9): havuzdan çıkan su her yakınlaşmada revağa bağlı kalır.
  const layers = [
    { name: 'cennet-gok', x: SKY.x, y: SKY.y, parallax: 0.1 },
    { name: 'bulut-kusagi', x: BAND.x, y: BAND.y, parallax: 0.6 },
    { name: 'cennet-uzak', x: FAR.x, y: FAR.y, parallax: 0.3 },
    { name: 'kasr-sol', x: 250, y: 1080, parallax: 0.9 },
    { name: 'kasr-sag', x: 830, y: 1010, parallax: 0.9 },
    { name: 'cennet-orta', x: MID.x, y: MID.y, parallax: 0.9 },
    { name: 'cennet-irmak', x: RIV.x, y: RIV.y, parallax: 0.9 },
    { name: 'cennet-agac-sol', x: -40, y: 1950, parallax: 1.1 },
    { name: 'cennet-agac-sag', x: 1120, y: 1950, parallax: 1.1 },
  ];
  // kıyı gülleri için önerilen yerler (ırmak katmanı dünya koordinatı): [x, y, ad, ölçek] — kubbelerden ve sudan uzak
  const flowerSpots = [[330, 1640, 'cennet-cicek-1', 0.7], [262, 1820, 'cennet-cicek-3', 0.85], [990, 1760, 'cennet-cicek-2', 0.8], [1000, 1930, 'cennet-cicek-1', 1.05], [140, 1960, 'cennet-cicek-2', 1.15], [880, 1530, 'cennet-cicek-3', 0.55]];
  return {
    layers, riverPath, flowDir, springs, flowerSpots,
    depthAt, // 0 kıyı … 1 orta (ırmak katmanı dünya koordinatı)
    streams: STREAMS.map((s) => ({ id: s.id, ctrl: s.ctrl })),
    loggia: { x: 250, y: 1036, w: 440 }, // sol köşkün açık revağı (yakınlaşma hedefi), dünya
    drawBand,
    drawWisps, // (ctx, cx, cy, sc, alpha): önde geçen 4 opak bulut kümesi
    SKY, BAND, FAR, MID, RIV,
  };
})();
