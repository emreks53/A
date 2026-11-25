// Cennet ziyafeti (Perde 5, 33.19–36.40 sn): köşkün altında, ırmak kıyısında yakın plan — insansız (88:13-16):
// yükseltilmiş, altın örgülü karşılıklı tahtlar, dizili yastıklar, serili halı, altın tepside meyveler, hazır kadehler,
// gümüş ibrik, uzayan serin gölge (56:30) ve kümeleri alçalan dallar (69:23, 76:14); altlarından berrak ırmak akar.
// Dünya koordinatı = zoom 1'de ekran pikseli (1080×1920, sol üst köken); kamera itmesi için 120 px kenar payı.
// Işık: güneş yok, gökte kaynak yok, huzme yok; yumuşak, eşit, kaynaksız ortam ışığı. Parıltı patlaması yok.
'use strict';
const ZIYAFET = (() => {
  const TAU = Math.PI * 2;
  const LA = [-0.3, -0.86]; // kaynaksız ortam: gök kubbesi gibi yukarıdan yumuşak (yön vurgusu yok)
  // ortak perspektif (zemin, halı, tahtlar, tepsi, kadehler): göz hizası y=760, odak 1100, göz yüksekliği 1 birim
  const CAM = { hz: 760, f: 1100, cx: 540 };
  const proj = (X, Y, Z) => [CAM.cx + (CAM.f * X) / Z, CAM.hz + (CAM.f * (1 - Y)) / Z];

  // ---------------------------------------------------------------- palet (koyu → açık, basamaklı)
  const PAL = {
    gold: ['#5E3410', '#8A5418', '#B87D22', '#DCA638', '#F1CB60', '#FCE9A8'],
    goldC: ['#4E3524', '#7A5530', '#A87A36', '#CFA246', '#EBC866', '#F8E6A6'], // serin gölgede altın
    silver: ['#444B62', '#666F8A', '#8D97B0', '#B6BFD3', '#DCE2EC', '#F8FAFE'],
    pearl: ['#7E789E', '#9993B4', '#B4AFC9', '#CDC9DC', '#E3E0EA', '#F7F4F1'],
    nacre: ['#F4C7D7', '#C7ECDC', '#D6CCF2', '#FAE5C6'], // pembe, nane, lavanta, krem ışıltı
    emer: ['#07332E', '#0B4A3C', '#106246', '#187C4F', '#279956', '#55B85E', '#9CD468'],
    silk: ['#063A30', '#09503E', '#0D684B', '#158556', '#25A260', '#5CC47A', '#A8E6A6'],
    ruby: ['#4A0A1E', '#7A102F', '#A61B3A', '#CC304A', '#E85E6E', '#FAA3A4'],
    violet: ['#1C1336', '#2C1E52', '#41306F', '#5B4790', '#7E68B2', '#B0A0D6'],
    grapeG: ['#3A5616', '#59791C', '#7E9E26', '#A3BE38', '#CAD966', '#EBF1AE'],
    dateG: ['#5A2A0A', '#8A4512', '#B8691C', '#DB9330', '#F1BE55', '#FCE29A'],
    dateB: ['#2C1106', '#4C1F0C', '#713214', '#994C1E', '#C47438', '#E6AA70'],
    fig: ['#22132D', '#3A2046', '#573062', '#784480', '#9F68A0', '#CC9DC2'],
    figN: ['#3B5726', '#5C7C33', '#84A247', '#B1C66E', '#D6E19C'],
    lote: ['#6A2E08', '#9A4A0E', '#C97416', '#E89E2A', '#F7C64E', '#FFE69A'],
    leaf: ['#0A3B2C', '#0F5236', '#176B3E', '#228646', '#37A04E', '#6CBE58', '#B0DB72'],
    water: ['#11506E', '#1A6C8A', '#2A8AA2', '#47A8B8', '#72C5CB', '#A6E0DE', '#DDF7F1'],
    rose: ['#6E0F32', '#9E1D4A', '#C83A66', '#E2668C', '#F294B4', '#FBC8D8', '#FFF0F2'],
    under: Paint.UNDER,
  };

  // ---------------------------------------------------------------- yardımcılar
  const stroke = (S, x, y, a, l, w, c, o) => Paint.drawStroke(S, x, y, a, l * S.k, w * S.k, c, o || {});
  const poly = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  const circ = (x, y, r) => ellipsePath(x, y, r, r);
  const sph = (cx, cy, r, amb = 0.12) => Paint.sphere(cx, cy, r, LA, amb);
  const bboxOf = (pts, pad = 2) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return [a - pad, b - pad, c + pad, d + pad]; };
  const lerp2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  // dörtgende çift doğrusal nokta: q = [p00, p10, p11, p01]
  const bil = (q, s, t) => lerp2(lerp2(q[0], q[1], s), lerp2(q[3], q[2], s), t);
  // Catmull-Rom örnekleme
  function crPts(ctrl, step = 8) {
    const out = []; const n = ctrl.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(n - 1, i + 2)];
      const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < m; j++) {
        const t = j / m, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(ctrl[n - 1]); return out;
  }
  // düz dolgu (renk + kabartma yüksekliği)
  function fillP(S, path, col, o = {}) {
    S.x.save(); S.x.globalAlpha = o.alpha ?? 1; S.x.fillStyle = col; S.x.fill(path); S.x.restore();
    if (o.height !== false) { const g = o.h ?? 140; S.hx.save(); S.hx.globalAlpha = o.hAlpha ?? 1; S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fill(path); S.hx.strokeStyle = `rgb(${g + 50},${g + 50},${g + 50})`; S.hx.lineWidth = S.k; S.hx.stroke(path); S.hx.restore(); }
  }
  // taban dolgusu yapmayan darbe alanı (katmanlanabilir). bbox zorunlu.
  function field(S, o) {
    const r = S.r, k = S.k; const cols = o.ramp; const steps = cols.length; const f = o.shade || Paint.cst(0.5);
    const dirf = typeof o.dir === 'function' ? o.dir : () => (o.dir ?? 0) + (r() - 0.5) * (o.dirJit ?? 0.2);
    const [lenA, lenB] = o.len, [widA, widB] = o.wid; const bb = o.bbox;
    const area = (bb[2] - bb[0]) * (bb[3] - bb[1]); const meanS = ((lenA + lenB) / 2) * ((widA + widB) / 2) * k * k;
    const count = o.count ?? Math.min(o.max ?? 12000, Math.round((area / meanS) * (o.cover ?? 2)));
    const jit = (o.jitter ?? 0) * k; const fq = (o.jitterFreq ?? 0.01) / k; const nz = o.noise ?? 0.03;
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
      if (o.path && !S.x.isPointInPath(o.path, x, y)) continue;
      if (o.mask && !o.mask(x, y)) continue;
      const v = f(x + (NOISE(x * fq + 3, y * fq) - 0.5) * jit * 2, y + (NOISE(x * fq, y * fq + 9) - 0.5) * jit * 2) + (r() - 0.5) * nz * 2;
      let ki = clamp(Math.floor(v * steps), 0, steps - 1);
      if (r() < (o.broken ?? 0.05)) ki = clamp(ki + r.sign(), 0, steps - 1);
      list.push([x, y, ki, o.sort === 'y' ? y : ki + r() * (o.sortJit ?? 0)]);
    }
    if (o.sort !== false) list.sort((a, b) => a[3] - b[3]);
    if (o.clip) { S.x.save(); S.hx.save(); S.x.clip(o.clip); S.hx.clip(o.clip); }
    for (const [x, y, ki] of list) {
      const col = shade(cols[ki], (r() - 0.5) * (o.lJit ?? 0.03), 1 + (r() - 0.5) * 0.08, (r() - 0.5) * (o.hJit ?? 5));
      const sz = o.size ? o.size(x, y) : 1;
      Paint.drawStroke(S, x, y, dirf(x, y), lerp(lenA, lenB, r()) * k * sz, lerp(widA, widB, r()) * k * sz, col, { dry: o.dry ?? 0.15, alpha: o.alpha, height: o.height });
    }
    if (o.clip) { S.x.restore(); S.hx.restore(); }
    return list.length;
  }
  // badem yaprak
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
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    if (o.rim) { ctx.save(); ctx.strokeStyle = PAL.under; ctx.globalAlpha = 0.85; ctx.lineWidth = 2.2 * k; ctx.stroke(p); ctx.restore(); }
    ctx.fillStyle = col; ctx.globalAlpha = o.alpha ?? 1; ctx.fill(p);
    ctx.clip(p);
    // iki tonlu yaprak: ışık alan yarı
    if (o.half !== false) { ctx.globalAlpha = (o.alpha ?? 1) * 0.9; ctx.fillStyle = o.light ?? shade(col, 0.07, 0.95, -6); ctx.fillRect(-len / 2, -wid, len, wid * (0.95 + (r() - 0.5) * 0.1)); }
    const n = Math.max(2, Math.round(wid / (2.6 * k)));
    for (let i = 0; i < n; i++) {
      const yy = -wid / 2 + ((i + 0.5) * wid) / n;
      ctx.globalAlpha = 0.1 + r() * 0.16; ctx.strokeStyle = shade(col, r() < 0.5 ? 0.08 : -0.08); ctx.lineWidth = (0.6 + r() * 0.8) * k;
      ctx.beginPath(); ctx.moveTo(-len / 2, yy); ctx.lineTo(len / 2, yy * 0.6); ctx.stroke();
    }
    if (o.vein) { ctx.globalAlpha = 0.55; ctx.strokeStyle = o.vein; ctx.lineWidth = Math.max(0.8 * k, wid * 0.07); ctx.beginPath(); ctx.moveTo(-len * 0.46, 0); ctx.lineTo(len * 0.38, 0); ctx.stroke(); }
    ctx.restore();
    if (o.height !== false) {
      hx.save(); hx.translate(x, y); hx.rotate(ang); const g = 125 + Math.floor(r() * 30);
      hx.fillStyle = `rgb(${g},${g},${g})`; hx.globalAlpha = 0.9; hx.fill(p);
      hx.strokeStyle = `rgb(${g + 60},${g + 60},${g + 60})`; hx.globalAlpha = 0.5; hx.lineWidth = k; hx.stroke(p); hx.restore();
    }
  }
  // asma yaprağı (beş loblu), merkez (x,y), sap yönü ang
  function vineLeafPath(x, y, R, ang, seed) {
    const r = rng(seed); const pts = [];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU; // a=0: uç (sap karşısı)
      const lobe = 0.58 + 0.42 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2.2);
      const notch = 1 - 0.6 * Math.exp(-Math.pow((a - Math.PI) / 0.3, 2)); // sap girintisi
      const serr = 1 + (i % 2 ? 0.045 : -0.03); // ince dişler
      const rr = R * lobe * notch * serr * (1 + (r() - 0.5) * 0.05);
      pts.push([x + Math.cos(a + ang) * rr, y + Math.sin(a + ang) * rr]);
    }
    return { path: smoothPath(pts), pts };
  }
  function vineLeaf(S, x, y, R, ang, o = {}) {
    const { path, pts } = vineLeafPath(x, y, R, ang, o.seed ?? 3);
    const pal = o.pal ?? PAL.leaf; const Rs = R / S.k;
    S.region(path, { ramp: pal.slice(o.dark ? 0 : 1, o.dark ? 5 : 7), shade: sph(x - R * 0.3, y - R * 0.4, R * 1.4, 0.15),
      dir: (px, py) => Math.atan2(py - y, px - x) + (S.r() - 0.5) * 0.4, len: [Rs * 0.35, Rs * 0.7], wid: [clamp(Rs * 0.16, 3, 12), clamp(Rs * 0.26, 4, 16)],
      cover: 2.4, jitter: 0, noise: 0.06, bbox: bboxOf(pts), rim: o.rim ?? { w: 1.4, alpha: 0.85 } });
    // damarlar
    const vc = o.vein ?? shade(pal[4], 0.12, 0.8);
    for (let i = 0; i < 5; i++) {
      const a = ang + (i - 2) * 0.95; const L = R * (i === 2 ? 0.82 : 0.68);
      stroke(S, x + Math.cos(a) * L * 0.5, y + Math.sin(a) * L * 0.5, a, (L * 0.95) / S.k, clamp(Rs * 0.05, 1.2, 3), vc, { alpha: 0.75, dry: 0.5 });
    }
  }

  // ---------------------------------------------------------------- meyveler (sprite pikseli; darbe = ekran pikseli × k)
  function grape(S, x, y, r, pal, o = {}) {
    const rs = r / S.k, R = S.r;
    const ramp = o.dark ? pal.slice(0, pal.length - 1).map((c) => shade(c, -0.04)) : pal;
    S.region(circ(x, y, r), {
      ramp, shade: ((f) => (px, py) => f(px, py) * (o.dim ?? 0.86))(sph(x - r * 0.3, y - r * 0.38, r * 1.22, o.amb ?? 0.1)),
      dir: (px, py) => Math.atan2(py - y, px - x) + Math.PI / 2 + (R() - 0.5) * 0.6,
      len: [rs * 0.8, rs * 1.5], wid: [clamp(rs * 0.42, 1.6, 9), clamp(rs * 0.7, 2.4, 13)],
      cover: 3.2, jitter: 0, noise: 0.05, broken: 0.04, bbox: [x - r - 1, y - r - 1, x + r + 1, y + r + 1],
      rim: R() < (o.rimP ?? 0.4) ? { w: clamp(rs * 0.1, 0.7, 1.8), alpha: 0.85 } : false, dry: 0.1, lJit: 0.02,
    });
    if (o.hl !== false) {
      // yumuşak inci buğusu (parlama değil)
      stroke(S, x - r * 0.34, y - r * 0.4, -0.75 + (R() - 0.5) * 0.4, rs * 0.6, clamp(rs * 0.3, 1.2, 5), o.hlCol ?? pal[pal.length - 1], { alpha: 0.9 });
      if (rs > 7) stroke(S, x + r * 0.28, y + r * 0.42, 0.6, rs * 0.5, clamp(rs * 0.16, 1, 3), shade(pal[3], 0.04), { alpha: 0.5 });
    }
  }
  // sarkan salkım: üst (cx, top), genişlik w, boy h, tane yarıçapı r; rot: üst nokta çevresinde dönüş
  function grapeCluster(S, cx, top, w, h, r, pal, seed, o = {}) {
    const R = rng(seed); const list = [];
    const rows = Math.max(2, Math.floor((h - 2 * r) / (r * 1.38)));
    const rot = o.rot ?? 0; const cr = Math.cos(rot), sr = Math.sin(rot);
    for (let j = 0; j <= rows; j++) {
      const v = j / rows; const yy = r + v * (h - 2 * r);
      const sh = v < 0.22 ? 0.72 + v * 1.3 : 1;
      const hw = Math.max(r * 0.05, (w / 2 - r) * Math.pow(1 - v, 0.8) * sh);
      const n = Math.max(1, Math.round((hw * 2) / (r * 1.5)) + 1);
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0.5 : i / (n - 1);
        const xx = (u - 0.5) * 2 * hw + (R() - 0.5) * r * 0.6 + (j % 2 ? r * 0.35 : -r * 0.2) + Math.sin(v * 5 + seed) * r * 0.5;
        const yj = yy + (R() - 0.5) * r * 0.5;
        list.push([cx + xx * cr - yj * sr, top + xx * sr + yj * cr, r * (0.86 + R() * 0.26), R() * 0.75 + (1 - Math.abs(u - 0.5) * 2) * 0.25, n > 1 && (i === 0 || i === n - 1) || j === rows]);
      }
    }
    if (o.stem !== false) {
      const sx = cx - (o.stemDx ?? 0) * cr, sy = top - (o.stemLen ?? r * 2.2);
      S.line([[sx, sy], [cx + (sx - cx) * 0.3, top - r * 0.6], [cx, top + r]], Math.max(2.5, r * 0.28), PAL.gold[2], { w1: Math.max(2, r * 0.2), edge: false });
    }
    list.sort((a, b) => a[3] - b[3]);
    for (const [x, y, rr, z, edge] of list) grape(S, x, y, rr, pal, { amb: 0.05 + z * 0.14, dark: z < 0.38, rimP: edge ? (o.rimP ?? 0.45) : 0 });
    return list;
  }
  // nar: taç yönü ca (radyan; -π/2 yukarı, +π/2 aşağı = dalda sarkan nar)
  function pomegranate(S, x, y, r, o = {}) {
    const rs = r / S.k; const ca = o.crownAng ?? -Math.PI / 2; const pal = o.pal ?? PAL.ruby; const R = S.r;
    const tx = x + Math.cos(ca) * r * 0.86, ty = y + Math.sin(ca) * r * 0.86;
    const body = smoothPath(blobPts(x, y, r, r * 0.95, 26, 0.035, o.seed ?? 5, ca + Math.PI / 2));
    S.region(body, {
      ramp: pal, shade: ((f) => (px, py) => f(px, py) * 0.8)(sph(x - r * 0.28, y - r * 0.36, r * 1.18, 0.08)),
      dir: (px, py) => Math.atan2(py - ty, px - tx) + (R() - 0.5) * 0.3,
      len: [rs * 0.34, rs * 0.68], wid: [clamp(rs * 0.13, 2, 14), clamp(rs * 0.22, 3, 20)], cover: 3.0, jitter: rs * 0.08, noise: 0.03,
      bbox: [x - r - 3, y - r - 3, x + r + 3, y + r + 3], rim: { w: clamp(rs * 0.05, 0.9, 2.4) },
    });
    // ışık lekesi: açık pembe kalın darbeler (yumuşak, kaynaksız üst ışık)
    for (let i = 0; i < 5; i++) {
      const a = -2.25 + i * 0.2 + (R() - 0.5) * 0.08; const rr = r * (0.56 + R() * 0.14);
      stroke(S, x + Math.cos(a) * rr, y + Math.sin(a) * rr, a + Math.PI / 2, rs * (0.24 + R() * 0.12), rs * (0.07 + R() * 0.04), shade(pal[3], 0.16, 0.75, 10));
    }
    stroke(S, x - r * 0.42, y - r * 0.5, -0.8, rs * 0.22, rs * 0.08, mix('#F7CFC4', pal[3], 0.15));
    // taç (kaliks)
    const cw = r * 0.3, ch = r * 0.34; const loc = new Path2D();
    loc.moveTo(-cw, 0.12 * ch); loc.lineTo(-cw * 0.72, -ch * 0.55);
    const nS = 6;
    for (let i = 0; i < nS; i++) {
      const t0 = i / nS, t1 = (i + 1) / nS, tm = (t0 + t1) / 2; const out = (tm - 0.5) * 2;
      loc.lineTo(lerp(-cw * 1.2, cw * 1.2, tm) + out * cw * 0.25, -ch - (1 - Math.abs(out)) * ch * 0.12 + Math.abs(out) * ch * 0.18);
      loc.lineTo(lerp(-cw * 0.8, cw * 0.8, t1), -ch * 0.58);
    }
    loc.lineTo(cw, 0.12 * ch); loc.closePath();
    const m = new DOMMatrix().translateSelf(tx, ty).rotateSelf(((ca + Math.PI / 2) * 180) / Math.PI);
    const crown = new Path2D(); crown.addPath(loc, m);
    const cb = mix(pal[2], '#5A2A18', 0.3);
    const pts = [[-cw * 1.4, 0.2 * ch], [cw * 1.4, 0.2 * ch], [-cw * 1.4, -ch * 1.3], [cw * 1.4, -ch * 1.3]].map(([a, b]) => [m.a * a + m.c * b + m.e, m.b * a + m.d * b + m.f]);
    S.region(crown, { ramp: ramp(cb, 4, { span: 0.34, warm: 4 }), shade: Paint.grad(tx - r * 0.3, ty - r * 0.3, tx + r * 0.3, ty + r * 0.3, 0.9, 0.15), dir: ca, len: [rs * 0.14, rs * 0.26], wid: [Math.max(1.5, rs * 0.06), Math.max(2, rs * 0.1)], cover: 3, rim: { w: clamp(rs * 0.04, 0.8, 2) }, bbox: bboxOf(pts) });
    const oc = [tx + Math.cos(ca) * ch * 0.55, ty + Math.sin(ca) * ch * 0.55];
    fillP(S, ellipsePath(oc[0], oc[1], cw * 0.62, cw * 0.2, ca + Math.PI / 2), '#3A0C18', { alpha: 0.85 });
  }
  // hurma: merkez, uzunluk, açı
  function date(S, x, y, len, ang, pal = PAL.dateB, o = {}) {
    const ls = len / S.k; const rx = len / 2, ry = len * (o.th ?? 0.23);
    const p = ellipsePath(x, y, rx, ry, ang); const R = S.r;
    const ext = Math.max(rx, ry) + 2;
    S.region(p, { ramp: pal, shade: ((f) => (px, py) => f(px, py) * (o.dim ?? 1))(sph(x - ry * 0.5, y - ry * 0.9, rx * 1.05, 0.1)), dir: ang, dirJit: 0.15, len: [ls * 0.35, ls * 0.7], wid: [clamp(ls * 0.1, 1.5, 9), clamp(ls * 0.16, 2, 12)], cover: 3, noise: 0.04, rim: R() < 0.5 ? { w: clamp(ls * 0.03, 0.7, 1.6) } : false, bbox: [x - ext, y - ext, x + ext, y + ext] });
    // parlak sırt
    const nx = Math.cos(ang - Math.PI / 2), ny = Math.sin(ang - Math.PI / 2);
    const up = ny < 0 ? 1 : -1;
    stroke(S, x + nx * ry * 0.45 * up, y + ny * ry * 0.45 * up, ang, ls * 0.48, clamp(ls * 0.06, 1, 4), shade(pal[4], 0.1, 0.8), { alpha: 0.85 });
    // kırışık izleri
    if (ls > 14) stroke(S, x - nx * ry * 0.2 * up, y - ny * ry * 0.2 * up, ang + 0.1, ls * 0.3, clamp(ls * 0.035, 0.8, 2), pal[1], { alpha: 0.4 });
  }
  // incir: geniş taban, boyun yönü ang
  function fig(S, x, y, r, ang, o = {}) {
    const rs = r / S.k; const pal = o.pal ?? PAL.fig;
    const ax = Math.cos(ang), ay = Math.sin(ang), bx = -ay, by = ax;
    const P = (u, v) => [x + ax * u + bx * v, y + ay * u + by * v];
    const pts = [];
    for (let i = 0; i <= 28; i++) {
      const t = i / 28; const a = Math.PI * 0.5 + t * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a); // u eksenine göre: boyun +u
      const u = c > 0 ? c * r * 1.55 : c * r * 0.98; const wv = s * r * (c > 0 ? lerp(1, 0.32, Math.pow(c, 1.3)) : 1);
      pts.push(P(u, wv));
    }
    const path = smoothPath(pts);
    const bb = bboxOf(pts);
    S.region(path, { ramp: pal, shade: sph(x - r * 0.3, y - r * 0.4, r * 1.3, 0.1), dir: ang, dirJit: 0.3, len: [rs * 0.5, rs * 1.0], wid: [clamp(rs * 0.18, 2, 12), clamp(rs * 0.3, 3, 16)], cover: 3, noise: 0.04, bbox: bb, rim: { w: clamp(rs * 0.05, 0.8, 2) } });
    // boyun: yeşilimsi
    S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
    for (let i = 0; i < 9; i++) { const u = r * (0.75 + S.r() * 0.75), v = (S.r() - 0.5) * r * 0.5; const q = P(u, v); stroke(S, q[0], q[1], ang + (S.r() - 0.5) * 0.3, rs * 0.45, rs * 0.16, o.neck ?? PAL.figN[1 + Math.floor(S.r() * 3)], { alpha: 0.8 }); }
    // ince boyuna yivler + açık benekler
    for (let i = 0; i < 6; i++) { const v = (i / 5 - 0.5) * r * 1.4; const q = P(-r * 0.1, v); stroke(S, q[0], q[1], ang + v / r * 0.25, rs * 1.3, clamp(rs * 0.04, 0.8, 2), shade(pal[2], -0.05), { alpha: 0.45 }); }
    for (let i = 0; i < 10; i++) { const q = P((S.r() - 0.6) * r * 1.6, (S.r() - 0.5) * r * 1.4); stroke(S, q[0], q[1], S.r() * 3, rs * 0.08, rs * 0.06, shade(pal[4], 0.12, 0.6), { alpha: 0.6, height: false }); }
    S.x.restore(); S.hx.restore();
    const hl = P(-r * 0.15, -r * 0.45 * Math.sign(by || 1)); stroke(S, hl[0], hl[1], ang + 0.2, rs * 0.5, rs * 0.12, shade(pal[4], 0.12, 0.7), { alpha: 0.75 });
    // sap
    const s0 = P(r * 1.5, 0), s1 = P(r * 1.78, r * 0.06);
    S.line([s0, s1], Math.max(2, r * 0.14), PAL.figN[1], { w1: Math.max(1.5, r * 0.1), edge: false });
  }
  // sidre (nebk) meyvesi kümesi: dikensiz ince dal, küçük oval yapraklar, yuvarlak altın-turuncu taneler
  function loteCluster(S, x, y, s, ang, seed) {
    const R = rng(seed); const k = S.k;
    const ax = Math.cos(ang), ay = Math.sin(ang);
    const twig = []; for (let i = 0; i <= 6; i++) { const t = i / 6; twig.push([x + ax * s * 2.2 * t + Math.sin(t * 3 + seed) * s * 0.12 * -ay, y + ay * s * 2.2 * t + Math.sin(t * 3 + seed) * s * 0.12 * ax]); }
    S.line(crPts(twig, 6), Math.max(2, s * 0.09), '#8A6A3A', { w1: Math.max(1.2, s * 0.05), edge: false });
    // yapraklar (parlak, üç damarlı oval)
    for (let i = 0; i < 7; i++) {
      const t = 0.12 + i * 0.13; const q = twig[Math.min(6, Math.round(t * 6))]; const side = i % 2 ? 1 : -1;
      const a = ang + side * (0.9 + R() * 0.4);
      leaf(S, q[0] + Math.cos(a) * s * 0.34, q[1] + Math.sin(a) * s * 0.34, a, (s * 0.62) / k, (s * 0.36) / k, PAL.leaf[3 + Math.floor(R() * 3)], { vein: PAL.leaf[1] });
    }
    // taneler
    const berries = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.15 + R() * 0.85; const q = twig[Math.min(6, Math.round(t * 6))]; const side = R() < 0.5 ? 1 : -1;
      berries.push([q[0] + -ay * side * s * (0.2 + R() * 0.25) + (R() - 0.5) * s * 0.2, q[1] + ax * side * s * (0.2 + R() * 0.25) + s * 0.12, s * (0.16 + R() * 0.05), R()]);
    }
    berries.sort((a, b) => a[1] - b[1]);
    for (const [bx, by, br, z] of berries) {
      const pal = z < 0.3 ? ['#5A2A0A', '#8A3E10', '#B45A1A', '#D98030', '#F0B060', '#FCE0A8'] : PAL.lote;
      grape(S, bx, by, br, pal, { amb: 0.1, rimP: 0.5 });
    }
  }
  // gül: spiral taç yaprakları (dikensiz)
  function rose(S, x, y, r, pal = PAL.rose, seed = 1) {
    const R = rng(seed); const rs = r / S.k;
    const body = smoothPath(blobPts(x, y, r, r * 0.9, 18, 0.12, seed));
    S.region(body, { ramp: pal.slice(0, 5), shade: sph(x - r * 0.2, y - r * 0.3, r * 1.2, 0.15), dir: (px, py) => Math.atan2(py - y, px - x) + Math.PI / 2, len: [rs * 0.5, rs * 0.9], wid: [clamp(rs * 0.2, 2, 10), clamp(rs * 0.32, 3, 14)], cover: 2.6, bbox: [x - r - 2, y - r - 2, x + r + 2, y + r + 2], rim: { w: clamp(rs * 0.06, 0.8, 1.8) } });
    // taç yaprak kıvrımları: dıştan içe kavisli darbeler
    for (let ring = 0; ring < 3; ring++) {
      const rr = r * (0.78 - ring * 0.24); const n = 5 - ring;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + ring * 0.7 + R() * 0.4;
        const c = pal[Math.min(6, 2 + ring + (R() < 0.5 ? 1 : 0))];
        stroke(S, x + Math.cos(a) * rr * 0.75, y + Math.sin(a) * rr * 0.68, a + Math.PI / 2, rs * (0.7 - ring * 0.14), clamp(rs * (0.18 - ring * 0.03), 1.5, 9), c);
      }
    }
    stroke(S, x - r * 0.05, y - r * 0.08, 0.5, rs * 0.3, rs * 0.14, pal[1]);
  }

  // ---------------------------------------------------------------- 1) z-tepsi: altın tepside meyve yığını
  function paintTepsi() {
    const k = 2, w = 1040, h = 600; const S = Paint.sprite(w, h, { seed: 7301, k }); const r = S.r;
    const cx = 520, cy = 396, RX = 486, RY = 168;
    const G = PAL.gold;
    // ayak halkası
    const foot = ellipsePath(cx, cy + 150, 270, 46);
    S.region(foot, { ramp: G.slice(0, 4), shade: Paint.grad(cx - 270, 0, cx + 270, 0, 0.75, 0.2), dir: 0, len: [24, 44], wid: [8, 12], cover: 2.6, bbox: [cx - 274, cy + 100, cx + 274, cy + 200] });
    // kenar kalınlığı
    const edge = ellipsePath(cx, cy + 16, RX, RY);
    S.region(edge, { ramp: G.slice(0, 5), shade: (x) => 0.25 + 0.45 * (1 - Math.abs(x - cx + 120) / RX), dir: 0, len: [30, 60], wid: [8, 12], cover: 2.6, bbox: [cx - RX - 2, cy - RY + 14, cx + RX + 2, cy + RY + 18], rim: { w: 2.4 } });
    // üst yüz (kenar bandı)
    const top = ellipsePath(cx, cy, RX, RY);
    S.region(top, { ramp: G.slice(1), shade: (x, y) => clamp(0.5 + 0.28 * Math.cos(Math.atan2((y - cy) / RY, (x - cx) / RX) + 2.2) + 0.1 * (NOISE(x * 0.02, y * 0.02) - 0.5)), dir: (x, y) => Math.atan2((y - cy) * RX * RX, -(x - cx) * RY * RY) + (r() - 0.5) * 0.2, len: [26, 50], wid: [8, 13], cover: 2.8, bbox: [cx - RX - 2, cy - RY - 2, cx + RX + 2, cy + RY + 2], rim: false });
    // çukur
    const RXi = 418, RYi = 140; const well = ellipsePath(cx, cy + 6, RXi, RYi);
    S.region(well, { ramp: PAL.goldC.slice(1), shade: (x, y) => clamp(0.35 + 0.4 * ((y - (cy + 6 - RYi)) / (2 * RYi)) + 0.12 * (NOISE(x * 0.01, y * 0.02) - 0.5)), dir: 0, len: [40, 80], wid: [10, 16], cover: 2.6, bbox: [cx - RXi, cy + 6 - RYi, cx + RXi, cy + 6 + RYi], rim: false });
    // kenarda ince oyma (çift yönlü küçük darbeler) ve inci boncuk dizisi
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * TAU; const rx = (RX + RXi) / 2, ry = (RY + RYi) / 2;
      const x = cx + Math.cos(a) * rx, y = cy + 3 + Math.sin(a) * ry;
      const tang = Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx);
      stroke(S, x, y, tang + (i % 2 ? 0.5 : -0.5), 10, 3.2, i % 2 ? G[5] : G[2], { alpha: 0.75 });
    }
    for (let i = 0; i < 84; i++) {
      const a = (i / 84) * TAU; const x = cx + Math.cos(a) * (RX - 7), y = cy + Math.sin(a) * (RY - 4);
      const pr = 5.5 + (Math.sin(a) > 0 ? 1.5 : 0);
      fillP(S, circ(x, y, pr), PAL.pearl[3], { h: 175 });
      fillP(S, circ(x - pr * 0.3, y - pr * 0.35, pr * 0.45), PAL.pearl[5], { height: false });
    }

    // --- meyve yığını (arkadan öne)
    vineLeaf(S, 250, 292, 92, -2.4, { seed: 11 });
    vineLeaf(S, 805, 282, 96, -0.7, { seed: 12 });
    vineLeaf(S, 958, 392, 78, 0.15, { seed: 13, dark: true });
    vineLeaf(S, 150, 448, 74, 2.8, { seed: 14, dark: true });
    pomegranate(S, 335, 248, 98, { crownAng: -2.0, seed: 21 });
    pomegranate(S, 708, 232, 104, { crownAng: -1.15, seed: 22 });
    // orta: mor üzüm tepesi (yatık salkım, kubbe biçimli yığın)
    const mound = [];
    for (let i = 0; i < 120; i++) {
      const a = r() * TAU, u = Math.sqrt(r());
      const x = 520 + Math.cos(a) * u * 142, y = 292 + Math.sin(a) * u * 100 - (1 - u * u) * 78;
      mound.push([x, y, u]);
    }
    mound.sort((a, b) => a[1] + a[2] * 10 - (b[1] + b[2] * 10));
    S.line([[556, 96], [536, 134], [524, 172]], 7, G[2], { w1: 5, edge: false });
    for (const [x, y, u] of mound) grape(S, x, y, 22 + r() * 5, PAL.violet, { amb: 0.07 + clamp((y - 150) / 280) * 0.12, dark: u > 0.8 && y < 300, rimP: u > 0.86 ? 0.4 : 0 });
    // sol: yeşil-altın salkım kenardan sarkıyor
    grapeCluster(S, 238, 300, 180, 250, 21, PAL.grapeG, 31, { rot: 0.5, stemLen: 34, stemDx: -10 });
    // sağ ön nar
    pomegranate(S, 812, 372, 86, { crownAng: -0.35, seed: 23 });
    // sidre kümesi kenardan taşar
    loteCluster(S, 860, 410, 70, 0.55, 41);
    // incirler
    fig(S, 300, 470, 44, -1.9, { seed: 51 });
    fig(S, 382, 448, 50, -1.35, { seed: 52 });
    fig(S, 468, 482, 52, -1.75, { seed: 53 });
    // hurmalar (ön orta-sağ yığın)
    const dts = [];
    for (let i = 0; i < 28; i++) { const a = r() * TAU, u = Math.sqrt(r()); dts.push([648 + Math.cos(a) * u * 104, 474 + Math.sin(a) * u * 40 - (1 - u) * 26, (r() - 0.5) * 1.8]); }
    dts.sort((a, b) => a[1] - b[1]);
    for (const [x, y, a] of dts) date(S, x, y, 72 + r() * 16, a, r() < 0.15 ? PAL.dateG : PAL.dateB, { dim: 0.8, th: 0.21 });
    return { canvas: S.finish({ emboss: 0.55 }), px: cx, py: cy, k };
  }

  // ---------------------------------------------------------------- 2) z-akvab: kulpsuz, ağızsız, ayaksız gümüş-billur kadeh
  function paintAkvab() {
    const k = 2.5, w = 275, h = 325; const S = Paint.sprite(w, h, { seed: 7401, k }); const r = S.r;
    const cx = 137, rimY = 50, RX = 102, RY = 40; const baseY = 290, BX = 50, BY = 18;
    // lale biçimli gövde: hafif açık dudak, ince bel, dolgun karın, yuvarlak taban, alçak halka (sap yok)
    const prof = crPts([[cx - RX, rimY], [cx - RX + 9, rimY + 38], [cx - RX + 7, rimY + 104], [cx - RX + 20, rimY + 176], [cx - BX - 14, baseY - 22], [cx - BX, baseY - 4]], 5);
    const hwAt = (y) => { for (let i = 0; i < prof.length - 1; i++) if (y >= prof[i][1] && y <= prof[i + 1][1]) return cx - lerp(prof[i][0], prof[i + 1][0], (y - prof[i][1]) / (prof[i + 1][1] - prof[i][1] || 1)); return BX; };
    const bodyPts = [...prof];
    for (let i = 0; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI; bodyPts.push([cx + Math.cos(a) * BX, baseY - 4 + Math.sin(a) * BY]); }
    for (let i = prof.length - 1; i >= 0; i--) bodyPts.push([2 * cx - prof[i][0], prof[i][1]]);
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; bodyPts.push([cx + Math.cos(a) * RX, rimY - Math.sin(a) * RY]); }
    const body = poly(bodyPts);
    S.rim(body, { w: 1.0, alpha: 0.45 });
    // gövde tabanı: çok yarı saydam gümüş-billur (arkası görünür)
    fillP(S, body, '#D9DEEC', { alpha: 0.2, h: 132 });
    // iç arka duvar (ağızdan görünen)
    const inner = ellipsePath(cx, rimY, RX - 6, RY - 4);
    fillP(S, inner, '#C3C9DD', { alpha: 0.4, h: 132 });
    field(S, { bbox: [cx - RX, rimY - RY, cx + RX, rimY + RY], clip: inner, ramp: ['#8F98B6', '#AEB5CE', '#CDD2E3', '#ECEFF6'], shade: (x, y) => clamp(0.25 + 0.65 * ((y - rimY + RY) / (2 * RY))), dir: Math.PI / 2, dirJit: 0.2, len: [10, 18], wid: [3, 5], cover: 2.2, alpha: 0.5 });
    // su gövdesi: berrak, hafif turkuaz; ortası malzemenin kendi yumuşak ışığıyla açık
    const wY = rimY + 58; const wHW = hwAt(wY) - 7; const wRY = wHW * (RY / RX);
    const wb = []; for (let y = wY; y <= baseY - 8; y += 5) wb.push([cx - hwAt(y) + 7, y]);
    const wPoly = [...wb];
    for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI; wPoly.push([cx + Math.cos(a) * (BX - 9), baseY - 10 + Math.sin(a) * (BY - 5)]); }
    for (let i = wb.length - 1; i >= 0; i--) wPoly.push([2 * cx - wb[i][0], wb[i][1]]);
    const waterBody = poly(wPoly); waterBody.addPath(ellipsePath(cx, wY, wHW, wRY));
    fillP(S, waterBody, '#BDEBE8', { alpha: 0.36, h: 128 });
    field(S, { bbox: [cx - RX, wY - wRY, cx + RX, baseY], clip: waterBody, ramp: ['#86CFD2', '#ADE5E1', '#D3F6F0', '#F2FFFB'], shade: (x, y) => clamp(0.95 - Math.abs(x - cx + 8) / (RX * 0.85) - (y - wY) / 380), dir: Math.PI / 2, dirJit: 0.25, len: [16, 28], wid: [4, 7], cover: 2.2, alpha: 0.42 });
    // su yüzeyi
    const surf = ellipsePath(cx, wY, wHW, wRY);
    fillP(S, surf, '#D9F7F2', { alpha: 0.6, h: 148 });
    field(S, { bbox: [cx - wHW, wY - wRY, cx + wHW, wY + wRY], clip: surf, ramp: ['#A2E0DC', '#C8F1EC', '#EBFFFA'], shade: (x, y) => clamp(0.45 + (wY - y) / (wRY * 2) + (cx - x) / (wHW * 3)), dir: 0, dirJit: 0.15, len: [14, 24], wid: [3, 5], cover: 2, alpha: 0.7 });
    S.x.save(); S.x.globalAlpha = 0.8; S.x.strokeStyle = '#F4FFFC'; S.x.lineWidth = 2 * k; S.x.beginPath(); S.x.ellipse(cx, wY, wHW, wRY, 0, Math.PI * 0.05, Math.PI * 0.95); S.x.stroke(); S.x.restore();
    // ön cidar: kenarlarda gümüş tonlar (kırık, basamaklı), inci ışıltısı
    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1;
      for (let y = rimY + 14; y < baseY - 14; y += 10) {
        const hw = hwAt(y); const x = cx + side * (hw - 5);
        stroke(S, x, y, Math.PI / 2 + side * 0.08, 13, 4.6, side < 0 ? PAL.silver[3] : PAL.silver[2], { alpha: 0.82 });
        if (r() < 0.55) stroke(S, x - side * 9, y + 4, Math.PI / 2, 9, 3, side < 0 ? PAL.silver[4] : PAL.silver[3], { alpha: 0.45 });
      }
    }
    for (let i = 0; i < 10; i++) {
      const u = (i / 9 - 0.5) * 1.5; const y = rimY + 40 + r() * 150; const hw = hwAt(y); const x = cx + u * hw * 0.62;
      stroke(S, x, y, Math.PI / 2 + u * 0.08, 18 + r() * 18, 3, PAL.nacre[i % 3], { alpha: 0.42, height: false });
    }
    // yumuşak, kırık beyaz vurgu (çizgi değil)
    for (let y = rimY + 26; y < baseY - 50; y += 13) {
      if (r() < 0.22) continue; const hw = hwAt(y);
      stroke(S, cx - hw * 0.55 + (r() - 0.5) * 4, y, Math.PI / 2 - 0.05, 11 + r() * 6, 4.4, '#FFFFFF', { alpha: 0.7 + r() * 0.2 });
    }
    for (let y = rimY + 30; y < baseY - 110; y += 15) { if (r() < 0.4) continue; const hw = hwAt(y); stroke(S, cx + hw * 0.64, y + 5, Math.PI / 2 + 0.05, 10, 2.4, '#F4F7FF', { alpha: 0.6 }); }
    // gümüş bant (taban üstü) + inci boncuklar
    const bandAt = (y0, y1, beads, pal) => {
      const pts = []; const h0 = hwAt(y0) + 1, h1 = hwAt(y1) + 1; const e = RY / RX;
      for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; pts.push([cx + Math.cos(a) * h0, y0 + Math.sin(a) * h0 * e]); }
      for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI; pts.push([cx + Math.cos(a) * h1, y1 + Math.sin(a) * h1 * e]); }
      const p = poly(pts);
      S.region(p, { ramp: pal, shade: (x) => clamp(0.78 - ((x - cx) / h0) * 0.42 - Math.pow((x - cx) / h0, 2) * 0.32), dir: 0, len: [8, 14], wid: [3, 4.5], cover: 3, bbox: bboxOf(pts), rim: false });
      for (let i = 1; i < beads; i++) { const a = Math.PI - (i / beads) * Math.PI; const hw = (h0 + h1) / 2; const x = cx + Math.cos(a) * hw * 0.93, y = (y0 + y1) / 2 + Math.sin(a) * hw * e; fillP(S, circ(x, y, 3.8), PAL.pearl[4], { h: 185 }); fillP(S, circ(x - 1.2, y - 1.3, 1.6), '#FFFFFF', { height: false }); }
    };
    bandAt(baseY - 46, baseY - 34, 11, PAL.silver.slice(1));
    // kalın billur taban
    const base = ellipsePath(cx, baseY - 6, BX - 2, BY);
    fillP(S, base, '#DCE3EF', { alpha: 0.62, h: 160 });
    field(S, { bbox: [cx - BX, baseY - 6 - BY, cx + BX, baseY + BY], clip: base, ramp: ['#9AA4BF', '#C6CDDE', '#E9EDF6', '#FFFFFF'], shade: (x, y) => clamp(0.8 - Math.hypot((x - cx + 14) / BX, (y - baseY + 10) / BY) * 0.7), dir: 0, len: [10, 18], wid: [3, 5], cover: 2.6, alpha: 0.8 });
    S.x.save(); S.x.globalAlpha = 0.9; S.x.strokeStyle = '#8D97B0'; S.x.lineWidth = 2.6 * k; S.x.beginPath(); S.x.ellipse(cx, baseY - 2, BX, BY, 0, 0.12, Math.PI - 0.12); S.x.stroke(); S.x.restore();
    // dudak: gümüş bant (opak), önde açık; üstünde inci dizisi
    S.x.save(); S.x.lineCap = 'round';
    S.x.globalAlpha = 1; S.x.strokeStyle = PAL.silver[2]; S.x.lineWidth = 6 * k; S.x.beginPath(); S.x.ellipse(cx, rimY, RX - 3, RY - 1.5, 0, Math.PI, TAU); S.x.stroke();
    S.x.strokeStyle = PAL.silver[4]; S.x.lineWidth = 6.4 * k; S.x.beginPath(); S.x.ellipse(cx, rimY + 1, RX - 3, RY - 1.5, 0, 0.05, Math.PI - 0.05); S.x.stroke();
    S.x.strokeStyle = '#FFFFFF'; S.x.globalAlpha = 0.85; S.x.lineWidth = 1.8 * k; S.x.beginPath(); S.x.ellipse(cx, rimY - 1, RX - 3, RY - 1.5, 0, 0.5, 1.9); S.x.stroke();
    S.x.globalAlpha = 0.6; S.x.strokeStyle = PAL.nacre[0]; S.x.lineWidth = 1.5 * k; S.x.beginPath(); S.x.ellipse(cx, rimY + 3, RX - 3, RY - 1, 0, 2.0, 2.9); S.x.stroke();
    S.x.strokeStyle = PAL.nacre[1]; S.x.beginPath(); S.x.ellipse(cx, rimY + 3, RX - 3, RY - 1, 0, 0.15, 0.6); S.x.stroke();
    S.x.restore();
    S.hx.save(); S.hx.strokeStyle = 'rgb(205,205,205)'; S.hx.lineWidth = 6 * k; S.hx.beginPath(); S.hx.ellipse(cx, rimY, RX - 3, RY - 1.5, 0, 0, TAU); S.hx.stroke(); S.hx.restore();
    for (let i = 1; i < 14; i++) { const a = (i / 14) * Math.PI; const x = cx + Math.cos(a) * (RX - 3), y = rimY + 13 + Math.sin(a) * (RY - 1); fillP(S, circ(x, y, 3.4), PAL.pearl[4], { h: 185 }); fillP(S, circ(x - 1, y - 1.1, 1.4), '#FFFFFF', { height: false }); }
    return { canvas: S.finish({ emboss: 0.45 }), px: cx, py: baseY + BY - 4, k };
  }

  // ---------------------------------------------------------------- 3) z-ibrik: ince gümüş ibrik (56:18), lüleli ve kulplu
  function paintIbrik() {
    const k = 2.5, w = 340, h = 600; const S = Paint.sprite(w, h, { seed: 7501, k }); const r = S.r;
    const cx = 150;
    // profil: [y, yarı genişlik]
    const prof = [[104, 38], [112, 40], [118, 31], [150, 25], [190, 20], [228, 24], [250, 30], [262, 36], [300, 58], [350, 76], [410, 82], [460, 76], [500, 62], [520, 46], [530, 40], [540, 42], [560, 52], [578, 62]];
    const sp = crPts(prof.map(([y, hw]) => [hw, y]), 5).map(([hw, y]) => [y, hw]);
    const hwAt = (y) => { for (let i = 0; i < sp.length - 1; i++) if (y >= sp[i][0] && y <= sp[i + 1][0]) return lerp(sp[i][1], sp[i + 1][1], (y - sp[i][0]) / (sp[i + 1][0] - sp[i][0] || 1)); return 0; };
    const sil = []; for (const [y, hw] of sp) sil.push([cx - hw, y]);
    for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; sil.push([cx + Math.cos(a) * 62, 578 + Math.sin(a) * 14]); }
    for (let i = sp.length - 1; i >= 0; i--) sil.push([cx + sp[i][1], sp[i][0]]);
    const body = poly(sil);
    // kulp (arkada, önce)
    const hdl = crPts([[cx - 24, 150], [cx - 62, 156], [cx - 98, 196], [cx - 106, 262], [cx - 96, 330], [cx - 70, 388], [cx - 60, 420]], 5);
    S.line(hdl, 20, PAL.silver[1], { w1: 16, rim: { w: 1.4 }, edge: false });
    S.line(hdl.map(([x, y]) => [x - 2, y - 2]), 11, PAL.silver[3], { w1: 8, edge: false });
    S.line(hdl.map(([x, y]) => [x - 3, y - 3]), 2.6, PAL.silver[5], { w1: 2, edge: false });
    // lüle (gövdenin sağından yükselir)
    const spt = crPts([[cx + 58, 404], [cx + 96, 352], [cx + 128, 278], [cx + 150, 196], [cx + 166, 142], [cx + 176, 126]], 5);
    S.line(spt, 40, PAL.silver[1], { w1: 13, rim: { w: 1.4 }, edge: false });
    S.line(spt.map(([x, y]) => [x - 4, y - 1]), 22, PAL.silver[3], { w1: 7, edge: false });
    S.line(spt.map(([x, y]) => [x - 5, y - 2]), 4, PAL.silver[5], { w1: 1.6, edge: false });
    fillP(S, ellipsePath(cx + 176, 126, 7, 4, -0.5), PAL.silver[0], { h: 120 });
    // gövde: silindirik basamaklı gümüş, alt kısımda bahçenin yeşil yansıması
    S.region(body, {
      ramp: PAL.silver, shade: (x, y) => { const hw = hwAt(y) || 1; const u = clamp((x - cx) / hw, -1, 1); return clamp(0.62 - u * 0.32 - u * u * 0.32 + (u > -0.62 && u < -0.32 ? 0.3 : 0)); },
      dir: Math.PI / 2, dirJit: 0.12, len: [20, 40], wid: [6, 10], cover: 3, jitter: 2, noise: 0.04, bbox: [cx - 86, 100, cx + 86, 594], rim: { w: 1.5 },
    });
    S.x.save(); S.hx.save(); S.x.clip(body); S.hx.clip(body);
    for (let i = 0; i < 26; i++) { const y = 330 + r() * 150; const hw = hwAt(y); const u = 0.15 + r() * 0.65; stroke(S, cx + u * hw, y, Math.PI / 2 + (r() - 0.5) * 0.2, 16 + r() * 10, 5, r() < 0.6 ? '#6FA88E' : '#8FC1A6', { alpha: 0.5 }); }
    for (let i = 0; i < 10; i++) { const y = 140 + r() * 380; const hw = hwAt(y); stroke(S, cx + (r() - 0.5) * hw, y, Math.PI / 2, 18, 3, PAL.nacre[i % 4], { alpha: 0.35, height: false }); }
    S.x.restore(); S.hx.restore();
    // altın bantlar + inci boncuklar
    const band = (y0, y1, beads) => {
      const pts = []; const hw0 = hwAt(y0) + 2, hw1 = hwAt(y1) + 2;
      pts.push([cx - hw0, y0]); for (let i = 0; i <= 10; i++) { const a = Math.PI - (i / 10) * Math.PI; pts.push([cx + Math.cos(a) * hw0, y0 + Math.sin(a) * hw0 * 0.18]); }
      for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([cx + Math.cos(a) * hw1, y1 + Math.sin(a) * hw1 * 0.18]); }
      const p = poly(pts);
      S.region(p, { ramp: PAL.gold.slice(1), shade: (x) => clamp(0.7 - ((x - cx) / (hw0 + 1)) * 0.4 - Math.pow((x - cx) / (hw0 + 1), 2) * 0.3), dir: 0, len: [10, 18], wid: [3, 5], cover: 3, bbox: [cx - hw0 - 2, y0 - 2, cx + hw0 + 2, y1 + hw1 * 0.2 + 2], rim: false });
      if (beads) { const ym = (y0 + y1) / 2; const hw = (hw0 + hw1) / 2; for (let i = 1; i < beads; i++) { const a = Math.PI - (i / beads) * Math.PI; const x = cx + Math.cos(a) * hw * 0.94, y = ym + Math.sin(a) * hw * 0.18; fillP(S, circ(x, y, 3.6), PAL.pearl[4], { h: 180 }); fillP(S, circ(x - 1, y - 1.2, 1.6), '#FFFFFF', { height: false }); } }
    };
    band(104, 116, 9); band(246, 262, 9); band(404, 414, 0); band(520, 534, 0); band(566, 574, 12);
    // kapak ve inci topuz
    const lid = new Path2D(); lid.moveTo(cx - 34, 106); lid.quadraticCurveTo(cx - 30, 74, cx, 70); lid.quadraticCurveTo(cx + 30, 74, cx + 34, 106); lid.closePath();
    S.region(lid, { ramp: PAL.silver.slice(1), shade: (x) => clamp(0.75 - (x - cx) / 60), dir: -0.3, len: [12, 20], wid: [4, 6], cover: 3, bbox: [cx - 36, 66, cx + 36, 108], rim: { w: 1.2 } });
    const kn = circ(cx, 58, 15);
    S.region(kn, { ramp: PAL.pearl.slice(1), shade: sph(cx - 5, 52, 18, 0.2), dir: (x, y) => Math.atan2(y - 58, x - cx) + Math.PI / 2, len: [8, 14], wid: [3, 5], cover: 3, bbox: [cx - 16, 42, cx + 16, 74], rim: { w: 1.1 } });
    stroke(S, cx - 5, 51, -0.7, 6, 3, PAL.nacre[0], { alpha: 0.8 }); stroke(S, cx + 6, 62, 0.8, 6, 2.4, PAL.nacre[1], { alpha: 0.7 });
    // gövdede beyaz dikey vurgu
    for (let y = 280; y < 500; y += 18) { const hw = hwAt(y); stroke(S, cx - hw * 0.46, y, Math.PI / 2 - 0.05, 22, 5, '#FFFFFF', { alpha: 0.85 }); }
    for (let y = 150; y < 240; y += 14) { const hw = hwAt(y); stroke(S, cx - hw * 0.45, y, Math.PI / 2, 14, 3, '#FFFFFF', { alpha: 0.8 }); }
    return { canvas: S.finish({ emboss: 0.5 }), px: cx, py: 592, k };
  }


  // ---------------------------------------------------------------- ortak: basamaklı altın dal (koyu gövde, orta, açık sırt)
  function limb(S, pts, w0, w1, o = {}) {
    const pal = o.pal ?? PAL.gold;
    const off = (d) => pts.map((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
      let nx = -dy / l, ny = dx / l; if (nx * LA[0] + ny * LA[1] < 0) { nx = -nx; ny = -ny; }
      const ww = lerp(w0, w1, i / (pts.length - 1)); return [q[0] + nx * ww * d, q[1] + ny * ww * d];
    });
    S.line(pts, w0, pal[1], { w1, rim: o.rim ?? { w: 1.6, alpha: 0.85 }, edge: false });
    S.line(off(0.12), w0 * 0.68, pal[2], { w1: w1 * 0.68, edge: false });
    S.line(off(0.22), w0 * 0.36, pal[3], { w1: w1 * 0.36, edge: false });
    S.line(off(0.3), Math.max(1.4, w0 * 0.11), pal[4], { w1: Math.max(1, w1 * 0.11), edge: false });
  }
  // altın hurma salkımı (sarkan teller)
  function dateBunch(S, x, y, w, h, pal, seed) {
    const R = rng(seed); const k = S.k;
    S.line(crPts([[x, y - 26 * k], [x + 3 * k, y], [x + 1 * k, y + h * 0.16]], 5), 6 * k, PAL.gold[3], { w1: 4 * k, edge: false, rim: { w: 1 } });
    const list = [];
    const strands = 9;
    for (let i = 0; i < strands; i++) {
      const u = i / (strands - 1) - 0.5; const ex = x + u * w + (R() - 0.5) * w * 0.12, ey = y + h * (0.72 + R() * 0.26);
      const pts = crPts([[x + u * 6 * k, y + h * 0.12], [lerp(x, ex, 0.55), lerp(y + h * 0.15, ey, 0.35)], [ex, ey]], 4);
      S.line(pts, 2.6 * k, PAL.gold[4], { w1: 1.8 * k, edge: false });
      const n = 4 + Math.floor(R() * 3);
      for (let j = 0; j < n; j++) { const p = pts[Math.min(pts.length - 1, Math.floor(pts.length * (0.3 + (0.7 * j) / n)))]; list.push([p[0] + (R() - 0.5) * 7 * k, p[1] + 9 * k, R()]); }
    }
    list.sort((a, b) => a[2] - b[2]);
    for (const [dx, dy, z] of list) date(S, dx, dy, (25 + R() * 6) * k, Math.PI / 2 + (R() - 0.5) * 0.6, z < 0.3 ? PAL.dateG.map((c) => shade(c, -0.06)) : pal, { th: 0.27 });
  }
  // 8 köşeli yıldız
  const star8 = (cx, cy, R, rot = 0, ri = 0.74) => { const pts = []; for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * TAU; const rr = i % 2 ? R * ri : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return poly(pts); };
  // gül yaprağı biçimli rozet (n taç yaprağı)
  const rosette = (cx, cy, R, n, rot = 0) => { const p = new Path2D(); for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; p.addPath(ellipsePath(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.52, R * 0.26, a)); } return p; };

  // ---------------------------------------------------------------- 4) z-hali: perspektifte serili halı
  const HALI = { w: 900, h: 300, yF: 14, yN: 282, nearW: 868 }; // sprite satırları; dünya y = sprite y + 1180
  function paintHali() {
    const FW = 868, FH = 620; const F = Paint.sprite(FW, FH, { seed: 7601, k: 1 }); const r = F.r;
    const C = { em: '#0E6446', em2: '#0A4E39', emd: '#073A2C', ruby: '#A3193A', ruby2: '#7A1230', gold: '#E0AC3C', gold2: '#B07A26', iv: '#F1E5CB', iv2: '#D2C3A4' };
    const B = 84; // dış bordür genişliği (düz)
    // bordür zemini: yakut
    F.region(rectPath(0, 0, FW, FH), { ramp: [C.ruby2, C.ruby, shade(C.ruby, 0.05)], shade: (x, y) => 0.5 + 0.3 * (NOISE(x * 0.02, y * 0.02) - 0.5), noise: 0.2, dir: 0, dirJit: 0.05, len: [40, 80], wid: [22, 32], cover: 2.2, bbox: [0, 0, FW, FH], rim: false });
    // koruma şeritleri
    const ring = (inset, wdt, col) => { const p = new Path2D(); p.rect(inset, inset, FW - 2 * inset, FH - 2 * inset); p.rect(inset + wdt, inset + wdt, FW - 2 * (inset + wdt), FH - 2 * (inset + wdt)); F.x.save(); F.x.fillStyle = col; F.x.fill(p, 'evenodd'); F.x.restore(); F.hx.save(); F.hx.fillStyle = 'rgb(150,150,150)'; F.hx.fill(p, 'evenodd'); F.hx.restore(); };
    ring(10, 9, C.gold); ring(B - 16, 8, C.gold); ring(B - 8, 8, C.iv);
    // alan: zümrüt
    const inner = rectPath(B, B, FW - 2 * B, FH - 2 * B);
    F.region(inner, { ramp: [C.emd, C.em2, C.em, shade(C.em, 0.06)], shade: (x, y) => 0.55 + 0.35 * (NOISE(x * 0.008 + 4, y * 0.008) - 0.5), noise: 0.14, dir: 0, dirJit: 0.05, len: [40, 80], wid: [22, 32], cover: 2.4, bbox: [B, B, FW - B, FH - B], rim: false });
    // alan kafesi: koyu zümrüt çapraz çizgiler + düğümlerde küçük çiçekler
    F.x.save(); F.hx.save(); F.x.clip(inner); F.hx.clip(inner);
    const sp = 96;
    for (let d = -FH; d < FW + FH; d += sp) {
      for (const sg of [1, -1]) {
        const pts = sg > 0 ? [[d, 0], [d + FH, FH]] : [[d, FH], [d + FH, 0]];
        const mx = (pts[0][0] + pts[1][0]) / 2, my = FH / 2; const L = Math.hypot(FH, FH);
        for (let t = 0; t < 1; t += 0.06) { const x = lerp(pts[0][0], pts[1][0], t), y = lerp(pts[0][1], pts[1][1], t); stroke(F, x, y, Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]), 40, 7, C.emd, { alpha: 0.85, dry: 0 }); }
      }
    }
    for (let y = B - sp; y < FH; y += sp / 2) for (let x = B - sp; x < FW; x += sp) {
      const xx = x + ((Math.round((y - B) / (sp / 2)) % 2) ? sp / 2 : 0);
      fillP(F, rosette(xx, y, 26, 4, Math.PI / 4), C.iv2, { h: 160 });
      fillP(F, rosette(xx, y, 18, 4, 0), C.gold, { h: 170 });
      fillP(F, circ(xx, y, 6), C.ruby, { h: 180 });
    }
    F.x.restore(); F.hx.restore();
    // merkez madalyon: altın 8 köşeli yıldız, yakut sekizgen, fildişi rozet
    const mx = FW / 2, my = FH / 2;
    fillP(F, rosette(mx, my, 200, 12, 0), C.iv2, { h: 150 });
    fillP(F, rosette(mx, my, 176, 12, Math.PI / 12), C.em2, { h: 150 });
    F.region(star8(mx, my, 150, Math.PI / 8, 0.76), { ramp: [C.gold2, C.gold, shade(C.gold, 0.08)], shade: (x, y) => 0.5 + 0.4 * (NOISE(x * 0.03, y * 0.03) - 0.5), dir: 0, len: [24, 44], wid: [18, 26], cover: 2.4, bbox: [mx - 152, my - 152, mx + 152, my + 152], rim: false });
    fillP(F, star8(mx, my, 104, 0, 0.8), C.ruby, { h: 160 });
    fillP(F, rosette(mx, my, 70, 8, 0), C.iv, { h: 175 });
    fillP(F, circ(mx, my, 22), C.gold, { h: 185 });
    // köşe çeyrek yıldızlar
    for (const [qx, qy] of [[B, B], [FW - B, B], [B, FH - B], [FW - B, FH - B]]) {
      F.x.save(); F.hx.save(); F.x.clip(inner); F.hx.clip(inner);
      fillP(F, star8(qx, qy, 120, Math.PI / 8, 0.76), C.gold, { h: 160 });
      fillP(F, star8(qx, qy, 80, 0, 0.8), C.ruby, { h: 170 });
      fillP(F, rosette(qx, qy, 50, 8, 0), C.iv, { h: 180 });
      F.x.restore(); F.hx.restore();
    }
    // bordür motifleri: yıldız + rozet sırası
    const motif = (x, y, i) => { if (i % 2) { fillP(F, star8(x, y, 26, Math.PI / 8, 0.72), C.gold, { h: 175 }); fillP(F, circ(x, y, 9), C.iv, { h: 185 }); } else { fillP(F, rosette(x, y, 30, 4, Math.PI / 4), C.iv, { h: 170 }); fillP(F, circ(x, y, 7), C.emd, { h: 180 }); } };
    const mid = (10 + 9 + B - 16) / 2;
    let i = 0; for (let x = mid + 30; x < FW - mid - 10; x += 62, i++) { motif(x, mid, i); motif(x, FH - mid, i + 1); }
    i = 0; for (let y = mid + 62; y < FH - mid - 30; y += 62, i++) { motif(mid, y, i); motif(FW - mid, y, i + 1); }
    // dokuma izleri: ince yatay fırça
    field(F, { bbox: [0, 0, FW, FH], ramp: ['#000000', '#FFFFFF'], shade: Paint.cst(0.5), dir: 0, dirJit: 0.02, len: [60, 120], wid: [6, 10], cover: 0.5, alpha: 0.05, height: true });

    // perspektife bük: satır satır (derinlik ∝ 1/(y - ufuk))
    const w = HALI.w, h = HALI.h; const S = Paint.sprite(w, h, { seed: 7602, k: 1 });
    const hz = CAM.hz - 1180; const yF = HALI.yF, yN = HALI.yN; const wAt = (y) => (HALI.nearW * (y - hz)) / (yN - hz);
    const dF = 1 / (yF - hz), dN = 1 / (yN - hz);
    const trap = poly([[w / 2 - wAt(yF) / 2, yF], [w / 2 + wAt(yF) / 2, yF], [w / 2 + wAt(yN) / 2, yN], [w / 2 - wAt(yN) / 2, yN]]);
    S.rim(trap, { w: 2.2, alpha: 0.9 });
    for (let y = yF; y < yN; y++) {
      const v0 = (1 / (y - hz) - dF) / (dN - dF), v1 = (1 / (y + 1 - hz) - dF) / (dN - dF);
      const ww = wAt(y + 0.5), x0 = w / 2 - ww / 2; const sy = v0 * FH, sh = Math.max(0.6, (v1 - v0) * FH);
      S.x.drawImage(F.c, 0, sy, FW, sh, x0, y, ww, 1.4);
      S.hx.drawImage(F.hc, 0, sy, FW, sh, x0, y, ww, 1.4);
    }
    // saçaklar (fildişi püsküller)
    for (const [yy, len, n] of [[yN, 12, 70], [yF, 5, 46]]) {
      const ww = wAt(yy);
      for (let j = 0; j < n; j++) { const x = w / 2 - ww / 2 + ((j + 0.5) / n) * ww; const dx = (x - w / 2) * 0.03; stroke(S, x + dx * 0.5, yy + (yy === yN ? len / 2 : -len / 2), Math.PI / 2 + dx * 0.01, len, yy === yN ? 3.4 : 2.2, j % 2 ? C.iv : C.iv2, { dry: 0.5 }); }
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: w / 2, py: 150, k: 1 };
  }

  // ---------------------------------------------------------------- 5) z-taht-sol / z-taht-sag: altın örgülü, karşılıklı tahtlar
  const TH = { L: 1.14, D: 0.6, t: 0.075, leg: 0.15, seat: 0.37, mat: 0.08, arm: 0.57, back: 0.92, al: 0.5 };
  function throneProj() { // sol taht (sağa, merkeze bakar); taban orta-alt → (215, 1180)
    const al = TH.al; const ax = Math.sin(al), az = Math.cos(al), bx = Math.cos(al), bz = -Math.sin(al);
    const Z0 = CAM.f / (1180 - CAM.hz) - TH.D * bz; let X0 = -0.9;
    const mk = (X) => (u, v, y) => proj(X + u * ax + v * bx, y, Z0 + u * az + v * bz);
    for (let it = 0; it < 10; it++) {
      const P = mk(X0); const pts = [];
      for (const u of [0, TH.L]) for (const v of [0, TH.D]) for (const y of [0, TH.back + 0.06]) pts.push(P(u, v, y));
      const bb = bboxOf(pts, 0); X0 += ((215 - (bb[0] + bb[2]) / 2) * (Z0 + TH.L * az * 0.5)) / CAM.f;
    }
    return mk(X0);
  }
  function weave(S, q, path, nS, nT, cols, wmul = 0.34) {
    S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
    for (let i = 0; i < nS; i++) for (let j = 0; j < nT; j++) {
      const a = bil(q, i / nS, j / nT), b = bil(q, (i + 1) / nS, (j + 1) / nT), c = bil(q, (i + 1) / nS, j / nT), d = bil(q, i / nS, (j + 1) / nT);
      const seg = (p1, p2, col, wd, al) => { const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]); stroke(S, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), (L * 1.08) / S.k, wd, col, { dry: 0, alpha: al }); };
      const cw = Math.min(Math.hypot(c[0] - a[0], c[1] - a[1]), Math.hypot(d[0] - a[0], d[1] - a[1])) / S.k; const wd = clamp(cw * wmul, 1.4, 6);
      if ((i + j) % 2 === 0) { seg(d, c, cols[0], wd, 0.9); seg(a, b, cols[1], wd, 0.95); } else { seg(a, b, cols[0], wd, 0.9); seg(d, c, cols[1], wd, 0.95); }
    }
    S.x.restore(); S.hx.restore();
  }
  function face(S, q, o) {
    const path = poly(q); const ang = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
    S.region(path, { ramp: o.ramp, shade: o.shade || Paint.cst(o.v ?? 0.5), dir: o.dir ?? ang, dirJit: 0.12, len: o.len ?? [14, 26], wid: o.wid ?? [6, 10], cover: o.cover ?? 2.6, jitter: 0, noise: o.noise ?? 0.07, broken: 0.05, bbox: bboxOf(q), rim: o.rim ?? false });
    if (o.weave) { const sl = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / S.k, tl = Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]) / S.k; weave(S, q, path, Math.max(1, Math.round(sl / o.weave)), Math.max(1, Math.round(tl / o.weave)), o.wcols ?? [PAL.gold[1], PAL.gold[4]]); }
    return path;
  }
  // yumuşak yastık: dörtgen köşelerinden şişkin kapalı eğri
  function pillowPath(q, puff = 0.08, pinch = 0.1) {
    const c = [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4];
    const pts = [];
    for (let i = 0; i < 4; i++) {
      const a = q[i], b = q[(i + 1) % 4];
      pts.push(lerp2(a, c, pinch));
      const m = lerp2(a, b, 0.5); pts.push([m[0] + (m[0] - c[0]) * puff, m[1] + (m[1] - c[1]) * puff]);
    }
    return smoothPath(pts, true, 0.55);
  }
  function brocade(S, q, path, col, n, m) {
    S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const p = bil(q, (i + 0.5 + (j % 2) * 0.5) / n, (j + 0.5) / m); const s = Math.max(1.4, Math.min(5, Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]) / S.k / n * 0.22));
      stroke(S, p[0], p[1], 0.785, s * 2.2, s, col, { alpha: 0.9, dry: 0 }); stroke(S, p[0], p[1], -0.785, s * 2.2, s, col, { alpha: 0.9, dry: 0 });
    }
    S.x.restore(); S.hx.restore();
  }
  function paintTaht(side, seed) {
    const k = 1.5; const P0 = throneProj(); const cxW = side > 0 ? 865 : 215;
    const Wp = side > 0 ? (u, v, y) => { const p = P0(u, v, y); return [1080 - p[0], p[1]]; } : P0;
    const all = []; for (const u of [0, TH.L]) for (const v of [0, TH.D]) for (const y of [0, TH.back + 0.1]) all.push(Wp(u, v, y));
    const bb = bboxOf(all, 26); const ox = bb[0], oy = bb[1];
    const w = Math.ceil((bb[2] - bb[0]) * k), h = Math.ceil((1180 + 18 - oy) * k);
    const S = Paint.sprite(w, h, { seed, k }); const r = S.r;
    const Q = (u, v, y) => { const p = Wp(u, v, y); return [(p[0] - ox) * k, (p[1] - oy) * k]; };
    const { L, D, t, leg, seat, mat, arm, back } = TH; const sm = seat + mat;
    const G = PAL.gold, GC = PAL.goldC; const wcF = [G[1], G[4]], wcS = [GC[1], GC[4]];
    const ytop = (u) => back + 0.06 * Math.sin((Math.PI * u) / L);
    const pxu = (u, v, y) => { const a = Q(u, v, y), b = Q(u + 0.01, v, y); return Math.hypot(b[0] - a[0], b[1] - a[1]) * 100; }; // birim başına sprite px
    const pearl = (p, rr) => { fillP(S, circ(p[0], p[1], rr), PAL.pearl[4], { h: 192 }); fillP(S, circ(p[0] - rr * 0.3, p[1] - rr * 0.33, rr * 0.42), '#FFFFFF', { height: false }); };
    // çerçeveli, örgülü pano: dış çerçeve dolgu + iç örgü + kenar rayları + inci düğmeler
    const panel = (q, o) => {
      const path = poly(q); const ang = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
      S.region(path, { ramp: o.ramp, shade: Paint.cst(o.v), dir: ang, dirJit: 0.1, len: [14, 26], wid: [5, 9], cover: 2.6, noise: 0.08, bbox: bboxOf(q), rim: o.rim ?? false });
      const fs = o.frame ?? 0.12, ft = o.frameT ?? 0.18; const iq = [bil(q, fs, ft), bil(q, 1 - fs, ft), bil(q, 1 - fs, 1 - ft), bil(q, fs, 1 - ft)];
      const ip = poly(iq);
      fillP(S, ip, shade(o.ramp[1], -0.08), { h: 115 });
      const sl = Math.hypot(iq[1][0] - iq[0][0], iq[1][1] - iq[0][1]) / k, tl = Math.hypot(iq[3][0] - iq[0][0], iq[3][1] - iq[0][1]) / k;
      const nS = Math.max(2, Math.round(sl / 9)), nT = Math.max(2, Math.round(tl / 9));
      weave(S, iq, ip, nS, nT, o.wc, 0.36);
      // örgü düğümlerinde seyrek inci ve yakut (mevdûne: mücevherle örülmüş)
      for (let i = 1; i < nS; i += 2) for (let j = 1; j < nT; j += 2) { if ((i + j) % 4) continue; const p = bil(iq, i / nS, j / nT); const ruby = (i * 7 + j * 3) % 5 === 0; fillP(S, circ(p[0], p[1], 1.9 * k), ruby ? PAL.ruby[3] : PAL.pearl[4], { h: 190 }); fillP(S, circ(p[0] - 0.5 * k, p[1] - 0.6 * k, 0.8 * k), ruby ? PAL.ruby[5] : '#FFFFFF', { height: false }); }
      // iç kenar pervazı
      S.x.save(); S.x.strokeStyle = o.ramp[o.ramp.length - 1]; S.x.globalAlpha = 0.85; S.x.lineWidth = 1.6 * k; S.x.stroke(ip); S.x.restore();
      if (o.studs) { const n = o.studs; for (let i = 0; i <= n; i++) { pearl(bil(q, lerp(fs * 0.5, 1 - fs * 0.5, i / n), ft * 0.5), 2.6 * k); pearl(bil(q, lerp(fs * 0.5, 1 - fs * 0.5, i / n), 1 - ft * 0.5), 2.6 * k); } }
      return path;
    };
    // yükseltilmiş tahtın altındaki serin gölge (zeminde)
    fillP(S, pillowPath([Q(-0.03, -0.03, 0), Q(L + 0.03, -0.03, 0), Q(L + 0.03, D + 0.05, 0), Q(-0.03, D + 0.05, 0)], 0.04, 0.04), '#1F1D38', { alpha: 0.42, height: false });
    fillP(S, poly([Q(0.04, 0.04, 0), Q(L - 0.04, 0.04, 0), Q(L - 0.04, D - 0.04, 0), Q(0.04, D - 0.04, 0)]), '#17152C', { alpha: 0.35, height: false });
    // tornalı ayaklar
    for (const [u, v] of [[0.06, 0.06], [L - 0.06, D - 0.06], [0.06, D - 0.06], [L - 0.06, 0.06]]) {
      const a = Q(u, v, 0.005), b = Q(u, v, leg); const ww = pxu(u, v, leg / 2) * 0.05;
      const pts = crPts([a, lerp2(a, b, 0.45), b], 4);
      limb(S, pts, ww * 0.7, ww * 1.05, { rim: { w: 1 } });
      const m = lerp2(a, b, 0.5); fillP(S, ellipsePath(m[0], m[1], ww * 0.75, ww * 0.25), G[4], { h: 190 });
      fillP(S, ellipsePath(a[0], a[1], ww * 0.5, ww * 0.18), G[2], { h: 170 });
    }
    // arkalık: iç yüz (kemerli taç), üst yüz, yakın uç yüzü
    const N = 16;
    const bin = []; for (let i = 0; i <= N; i++) { const u = t + ((L - 2 * t) * i) / N; bin.push(Q(u, t, seat)); } for (let i = N; i >= 0; i--) { const u = t + ((L - 2 * t) * i) / N; bin.push(Q(u, t, ytop(u))); }
    const bpath = poly(bin);
    const ua = Math.atan2(Q(L, t, seat)[1] - Q(0, t, seat)[1], Q(L, t, seat)[0] - Q(0, t, seat)[0]);
    S.region(bpath, { ramp: GC.slice(0, 5), shade: Paint.cst(0.4), dir: ua, len: [16, 28], wid: [6, 10], cover: 2.6, bbox: bboxOf(bin), rim: { w: 1.4 } });
    const biq = [Q(t + 0.06, t, seat + 0.02), Q(L - t - 0.06, t, seat + 0.02), Q(L - t - 0.06, t, back - 0.06), Q(t + 0.06, t, back - 0.06)];
    fillP(S, poly(biq), shade(GC[1], -0.06), { h: 115 });
    weave(S, biq, poly(biq), 13, 7, wcS, 0.36);
    S.x.save(); S.x.strokeStyle = GC[4]; S.x.globalAlpha = 0.8; S.x.lineWidth = 1.5 * k; S.x.stroke(poly(biq)); S.x.restore();
    // taç rayı (altın, inci düğmeli)
    const crest = []; for (let i = 0; i <= N; i++) { const u = (L * i) / N; crest.push(Q(u, t * 0.6, ytop(u) - 0.005)); }
    limb(S, crest, pxu(L / 2, t, back) * 0.05, pxu(L / 2, t, back) * 0.05);
    const btop = []; for (let i = 0; i <= N; i++) { const u = (L * i) / N; btop.push(Q(u, 0, ytop(u) + 0.014)); } for (let i = N; i >= 0; i--) { const u = (L * i) / N; btop.push(Q(u, t, ytop(u) + 0.01)); }
    S.region(poly(btop), { ramp: G.slice(2), shade: Paint.cst(0.62), dir: ua, len: [16, 30], wid: [4, 7], cover: 2.6, bbox: bboxOf(btop), rim: false });
    for (let i = 1; i < 12; i++) { const u = (L * i) / 12; pearl(Q(u, t * 0.5, ytop(u) + 0.016), 3.3 * k); }
    // uzak kolçak (iç yüz örgülü pano, üst ray)
    panel([Q(L - t, D, seat), Q(L - t, 0, seat), Q(L - t, 0, arm), Q(L - t, D, arm)], { ramp: GC.slice(0, 5), v: 0.42, wc: wcS, frame: 0.1, frameT: 0.16, rim: { w: 1.2 } });
    face(S, [Q(L - t, 0, arm), Q(L, 0, arm), Q(L, D, arm), Q(L - t, D, arm)], { ramp: G.slice(2), v: 0.62 });
    // gövde ön yüzü: çerçeveli örgü pano, inci düğmeler, ortada yakut
    const fq = [Q(0, D, leg), Q(L, D, leg), Q(L, D, seat), Q(0, D, seat)];
    panel(fq, { ramp: G.slice(0, 5), v: 0.5, wc: wcF, frame: 0.06, frameT: 0.22, studs: 10, rim: { w: 1.6 } });
    { const p = bil(fq, 0.5, 0.5); fillP(S, circ(p[0], p[1], 6.4 * k), PAL.pearl[4], { h: 190 }); fillP(S, circ(p[0], p[1], 4.4 * k), PAL.ruby[2], { h: 200 }); fillP(S, circ(p[0] - 1.4 * k, p[1] - 1.5 * k, 1.6 * k), PAL.ruby[5], { height: false }); }
    face(S, [Q(L - t, D, leg), Q(L, D, leg), Q(L, D, arm), Q(L - t, D, arm)], { ramp: G.slice(1, 5), v: 0.55 });
    // ipek şilte (sündüs): üst ve ön yüz, altın şerit ve püsküller
    const mt = [Q(t, t, sm), Q(L - t, t, sm), Q(L - t, D + 0.01, sm), Q(t, D + 0.01, sm)];
    const ma = Math.atan2(mt[1][1] - mt[0][1], mt[1][0] - mt[0][0]);
    S.region(pillowPath(mt, 0.02, 0.02), { ramp: PAL.silk.slice(1), shade: (x, y) => clamp(0.48 + 0.12 * Math.sin((x * 0.05) / k + (y * 0.02) / k) + 0.22 * ((y - mt[0][1]) / (mt[3][1] - mt[0][1] + 1))), dir: ma, dirJit: 0.08, len: [26, 50], wid: [7, 11], cover: 2.8, bbox: bboxOf(mt, 8), rim: { w: 1.4 } });
    const mf = [Q(t, D + 0.012, seat), Q(L - t, D + 0.012, seat), Q(L - t, D + 0.012, sm), Q(t, D + 0.012, sm)];
    S.region(pillowPath(mf, 0.03, 0.03), { ramp: PAL.silk.slice(0, 5), shade: Paint.cst(0.5), dir: ma, dirJit: 0.06, len: [26, 50], wid: [5, 8], cover: 2.8, bbox: bboxOf(mf, 6), rim: false, noise: 0.25 });
    S.line([Q(t, D + 0.014, sm), Q(L - t, D + 0.014, sm)], 3.2 * k, G[4], { edge: false });
    for (let i = 0; i <= 22; i++) { const u = t + ((L - 2 * t) * i) / 22; const p = Q(u, D + 0.016, seat - 0.004); stroke(S, p[0], p[1] + 5 * k, Math.PI / 2, 9, 2.4, i % 2 ? G[4] : G[3], { dry: 0.6 }); }
    for (let i = 0; i < 10; i++) { const p = bil(mt, 0.08 + r() * 0.75, 0.25 + r() * 0.6); stroke(S, p[0], p[1], ma, 30 + r() * 30, 3.5, PAL.silk[5], { alpha: 0.6 }); }
    // dizili yastıklar (nemârik): arkalığa yaslı brokar yastıklar
    const nP = 4; const pw = (L - 2 * t - 0.04) / nP;
    const pals = [[PAL.silk.slice(1, 6), G[4]], [PAL.ruby.slice(0, 5), G[4]], [['#9C8A66', '#BFAE86', '#DACCA6', '#EEE3C6', '#FBF4E2'], G[2]], [PAL.silk.slice(1, 6), G[4]]];
    for (let i = nP - 1; i >= 0; i--) {
      const u0 = t + 0.02 + i * pw + 0.012, u1 = u0 + pw - 0.024; const lean = (r() - 0.5) * 0.02;
      const pq = [Q(u0 + lean, t + 0.04, sm + 0.31), Q(u1 + lean, t + 0.04, sm + 0.31), Q(u1, t + 0.17, sm), Q(u0, t + 0.17, sm)];
      const pp = pillowPath(pq, 0.13, 0.07);
      const c = [(pq[0][0] + pq[2][0]) / 2, (pq[0][1] + pq[2][1]) / 2]; const R = Math.hypot(pq[2][0] - pq[0][0], pq[2][1] - pq[0][1]) * 0.55;
      const [pr, dot] = pals[(i + (side > 0 ? 1 : 0)) % pals.length];
      S.region(pp, { ramp: pr, shade: sph(c[0] - R * 0.25, c[1] - R * 0.3, R * 1.1, 0.12), dir: (x, y) => Math.atan2(y - c[1], x - c[0]) + Math.PI / 2 + (r() - 0.5) * 0.4, len: [12, 22], wid: [6, 9], cover: 2.8, bbox: bboxOf(pq, 12), rim: { w: 1.3 } });
      brocade(S, pq, pp, dot, 3, 4);
      // dikiş kenarı (ince altın şerit) ve köşe püskülleri
      S.x.save(); S.x.clip(pp); S.x.strokeStyle = dot; S.x.globalAlpha = 0.55; S.x.lineWidth = 1.6 * k; S.x.stroke(pillowPath(pq.map((q) => lerp2(q, c, 0.1)), 0.13, 0.07)); S.x.restore();
      for (const cq of [pq[0], pq[1]]) stroke(S, cq[0], cq[1] + 3 * k, Math.PI / 2 + (r() - 0.5) * 0.3, 10, 3.2, G[4]);
    }
    // yakın kolçak: arkalığın uç yüzü, dış uç panosu, ön ve üst yüzler
    face(S, [Q(0, 0, arm), Q(0, t, arm), Q(0, t, ytop(0)), Q(0, 0, ytop(0))], { ramp: GC.slice(1, 5), v: 0.5, rim: { w: 1.2 } });
    const eq = [Q(0, D, leg), Q(0, 0, leg), Q(0, 0, arm), Q(0, D, arm)];
    panel(eq, { ramp: G.slice(0, 5), v: 0.44, wc: wcF, frame: 0.1, frameT: 0.1, studs: 6, rim: { w: 1.6 } });
    { const p = bil(eq, 0.5, 0.5); fillP(S, circ(p[0], p[1], 8.4 * k), PAL.pearl[3], { h: 185 }); fillP(S, star8(p[0], p[1], 6.6 * k, Math.PI / 8, 0.78), G[3], { h: 190 }); fillP(S, circ(p[0], p[1], 4 * k), PAL.ruby[2], { h: 200 }); fillP(S, circ(p[0] - 1.2 * k, p[1] - 1.3 * k, 1.5 * k), PAL.ruby[5], { height: false }); }
    face(S, [Q(0, D, leg), Q(t, D, leg), Q(t, D, arm), Q(0, D, arm)], { ramp: G.slice(1, 5), v: 0.6 });
    face(S, [Q(0, 0, arm), Q(t, 0, arm), Q(t, D, arm), Q(0, D, arm)], { ramp: G.slice(2), v: 0.66, rim: { w: 1.2 } });
    // yuvarlak kolçak rayı ve köşe incileri
    limb(S, crPts([Q(t * 0.5, D + 0.01, arm + 0.012), Q(t * 0.5, D * 0.5, arm + 0.016), Q(t * 0.5, -0.005, arm + 0.012)], 5), pxu(0, D / 2, arm) * 0.045, pxu(0, D / 2, arm) * 0.04, { rim: { w: 1 } });
    for (const pt of [Q(0, D, arm + 0.012), Q(0, 0, arm + 0.012), Q(L, D, arm + 0.012), Q(0, D, leg + 0.01), Q(L, D, leg + 0.01)]) pearl(pt, 4.2 * k);
    return { canvas: S.finish({ emboss: 0.5 }), px: (cxW - ox) * k, py: (1180 - oy) * k, k };
  }

  // ---------------------------------------------------------------- 6) z-platform: inci-beyaz köşk zemini, alçak geniş kemerler, altından akan berrak ırmak
  const PLAT = { top: 1100, y: 1260, frontY: 1525, edgeY: 1550, fasY: 1586, springY: 1668, crownY: 1626, waterY: 1748, bottom: 2040,
    openings: [[-72, 128], [184, 384], [440, 640], [696, 896], [952, 1152]], notch: [[-10, 78], [1002, 1090]], notchY: 1160 };
  const COLS = { cx: [34, 1046], R: 27, capY: 300, springY: 330, baseY: 1120, footY: 1160 };
  function archOpening(x0, x1, ys, yc, yb, pad = 0) {
    const xc = (x0 + x1) / 2, s = (x1 - x0) / 2 + pad, hh = ys - yc + pad; const R = (s * s + hh * hh) / (2 * hh); const cy = yc - pad + R;
    const p = new Path2D(); const a0 = Math.atan2(ys - cy, xc - s - xc), a1 = Math.atan2(ys - cy, xc + s - xc);
    p.moveTo(xc - s, yb); p.lineTo(xc - s, ys); p.arc(xc, cy, R, a0, a1); p.lineTo(xc + s, yb); p.closePath();
    return { p, xc, cy, R, a0, a1 };
  }
  function streamPath() {
    const p = new Path2D(); p.rect(-120, PLAT.waterY - 4, 1320, PLAT.bottom - PLAT.waterY + 4);
    for (const [x0, x1] of PLAT.openings) p.rect(x0 + 2, PLAT.springY + 30, x1 - x0 - 4, PLAT.waterY - PLAT.springY - 28);
    return p;
  }
  function paintPlatform() {
    const w = 1320, h = PLAT.bottom - PLAT.top, k = 1; const S = Paint.sprite(w, h, { seed: 7701, k }); const r = S.r;
    const X = (x) => x + 120, Y = (y) => y - PLAT.top;
    const yFront = Y(PLAT.frontY);
    // --- zemin (çentikli: sütun ayakları önde kalsın)
    const [n1, n2] = PLAT.notch; const nY = Y(PLAT.notchY);
    const floor = poly([[0, 0], [X(n1[0]), 0], [X(n1[0]), nY], [X(n1[1]), nY], [X(n1[1]), 0], [X(n2[0]), 0], [X(n2[0]), nY], [X(n2[1]), nY], [X(n2[1]), 0], [w, 0], [w, yFront], [0, yFront]]);
    const depth = (y) => CAM.f / (y + PLAT.top - CAM.hz);
    // serin, uzayan gölgede inci taş: arkada koyu, önde biraz açık; tahtların altında yumuşak temas gölgesi
    const fShade = (x, y) => { const wy = y + PLAT.top; const t = clamp((wy - PLAT.top) / (PLAT.frontY - PLAT.top)); const wx = x - 120;
      let v = 0.26 + 0.34 * t + 0.14 * (NOISE.fbm(wx * 0.004, wy * 0.006, 3) - 0.5);
      for (const tx of [215, 865]) v -= 0.24 * Math.exp(-Math.pow((wx - tx) / 240, 2) - Math.pow((wy - 1188) / 50, 2));
      if (wy > 1310 && wy < 1460) v -= 0.08; // altyazı bandı arkası: orta ton
      return clamp(v); };
    const FL = ['#4F4964', '#655E7B', '#7C7593', '#948DA9', '#ABA5BE', '#C3BED2'];
    S.region(floor, { ramp: FL, shade: fShade, dir: 0, dirJit: 0.06, len: [50, 100], wid: [9, 15], cover: 2.6, jitter: 6, noise: 0.03, bbox: [0, 0, w, yFront], rim: false, max: 9000 });
    // döşeme: perspektif ızgara, altın kakma derzler + inci ışıltısı
    S.x.save(); S.hx.save(); S.x.clip(floor); S.hx.clip(floor);
    const Zf = depth(yFront), Zb = depth(0);
    // dama: her ikinci taş hafif açık inci
    const rowsZ = []; for (let Z = Zf; Z < Zb + 0.4; Z += 0.36) rowsZ.push(Z);
    const colsX = []; for (let Xu = -3.36; Xu <= 3.4; Xu += 0.42) colsX.push(Xu);
    for (let i = 0; i < rowsZ.length - 1; i++) for (let j = 0; j < colsX.length - 1; j++) {
      if ((i + j) % 2) continue;
      const yA = CAM.hz + CAM.f / rowsZ[i] - PLAT.top, yB = CAM.hz + CAM.f / rowsZ[i + 1] - PLAT.top;
      const xAt = (Xu, yy) => X(540 + Xu * (yy + PLAT.top - CAM.hz));
      const q = [[xAt(colsX[j], yA), yA], [xAt(colsX[j + 1], yA), yA], [xAt(colsX[j + 1], yB), yB], [xAt(colsX[j], yB), yB]];
      const sc = clamp((yA + PLAT.top - CAM.hz) / 600, 0.4, 1.3);
      field(S, { bbox: bboxOf(q, 0), path: poly(q), ramp: FL.slice(1).map((c) => shade(c, 0.035, 0.9, 8)), shade: (x, y) => fShade(x, y) * 0.9, dir: 0, dirJit: 0.05, len: [40, 80], wid: [8, 12], cover: 1.2, size: () => sc, alpha: 0.75 });
    }
    for (const Z of rowsZ) { const y = CAM.hz + CAM.f / Z - PLAT.top; const wd = clamp((CAM.f / Z) / 260, 0.45, 2.4);
      for (let x = 0; x < w; x += 70) stroke(S, x + 35, y, 0, 72, 2.4 * wd, '#9C7428', { alpha: 0.75, dry: 0.2 });
      for (let x = 0; x < w; x += 80) stroke(S, x + 40, y - 1.2 * wd, 0, 80, 1 * wd, '#EAC56A', { alpha: 0.6, dry: 0.2 }); }
    for (const Xu of colsX) { const a = [X(540 + Xu * (PLAT.top - CAM.hz)), 0], b = [X(540 + Xu * (PLAT.frontY - CAM.hz)), yFront]; const n = 12;
      for (let i = 0; i < n; i++) { const p = lerp2(a, b, (i + 0.5) / n); const wd = clamp(((p[1] + PLAT.top - CAM.hz) / 260), 0.45, 2.4); stroke(S, p[0], p[1], Math.atan2(b[1] - a[1], b[0] - a[0]), Math.hypot(b[0] - a[0], b[1] - a[1]) / n + 6, 2.2 * wd, '#9C7428', { alpha: 0.7, dry: 0.2 }); } }
    for (let i = 0; i < 110; i++) { const x = r() * w, y = 10 + r() * (yFront - 20); const sc = clamp((y + PLAT.top - CAM.hz) / 600, 0.5, 1.3); stroke(S, x, y, (r() - 0.5) * 0.1, 40 * sc, 6 * sc, PAL.nacre[i % 3], { alpha: 0.2 }); }
    S.x.restore(); S.hx.restore();
    // arka kenar: ince altın çizgi
    S.line([[0, 2], [X(n1[0]), 2]], 4, PAL.gold[3], { edge: false }); S.line([[X(n1[1]), 2], [X(n2[0]), 2]], 4, PAL.gold[3], { edge: false }); S.line([[X(n2[1]), 2], [w, 2]], 4, PAL.gold[3], { edge: false });
    // --- ön kenar: altın şerit + inci boncuk
    const eY0 = yFront, eY1 = Y(PLAT.edgeY);
    S.region(rectPath(0, eY0, w, eY1 - eY0), { ramp: PAL.gold.slice(1), shade: (x, y) => 0.75 - 0.4 * ((y - eY0) / (eY1 - eY0)) + 0.1 * (NOISE(x * 0.02, 1) - 0.5), dir: 0, dirJit: 0.03, len: [40, 70], wid: [8, 12], cover: 3, bbox: [0, eY0, w, eY1], rim: { w: 1.6 } });
    for (let x = 14; x < w; x += 30) { fillP(S, circ(x, (eY0 + eY1) / 2, 4.4), PAL.pearl[4], { h: 190 }); fillP(S, circ(x - 1.2, (eY0 + eY1) / 2 - 1.4, 1.7), '#FFFFFF', { height: false }); }
    // --- cephe + kemerli kaide (inci taş; açık suya baktığı için biraz aydınlık)
    const fY0 = eY1, fY1 = Y(PLAT.waterY);
    const faceP = rectPath(0, fY0, w, fY1 - fY0 + 2);
    S.region(faceP, { ramp: PAL.pearl.slice(0, 5), shade: (x, y) => clamp(0.5 + 0.28 * ((y - fY0) / (fY1 - fY0)) + 0.12 * (NOISE(x * 0.01, y * 0.02) - 0.5)), dir: 0, dirJit: 0.05, len: [40, 80], wid: [9, 14], cover: 2.6, bbox: [0, fY0, w, fY1 + 2], rim: false });
    S.line([[0, Y(PLAT.fasY)], [w, Y(PLAT.fasY)]], 5, PAL.gold[2], { edge: false });
    S.line([[0, Y(PLAT.fasY) - 2], [w, Y(PLAT.fasY) - 2]], 1.6, PAL.gold[5], { edge: false });
    // cephe kuşağı: küçük altın-gümüş tuğla dizisi (ölçülü)
    for (let x = 0, j = 0; x < w; x += 30, j++) { const pal = j % 2 ? PAL.silver : PAL.gold; fillP(S, rectPath(x + 1.5, Y(PLAT.edgeY) + 8, 27, 15), pal[2], { h: 150 }); stroke(S, x + 15, Y(PLAT.edgeY) + 14, 0, 22, 6, pal[3], { alpha: 0.75 }); }
    for (let y = Y(PLAT.fasY) + 24; y < fY1; y += 24) for (let x = ((y / 24) % 2) * 40; x < w; x += 80) stroke(S, x, y, 0, 60, 1.6, '#7E789E', { alpha: 0.3, dry: 0.4 });
    // --- alçak, geniş kemerler: serin koyu iç, uzak uçta yumuşak bahçe, içeride akan su
    const sY = Y(PLAT.springY), cY = Y(PLAT.crownY);
    for (const [x0w, x1w] of PLAT.openings) {
      const x0 = X(x0w), x1 = X(x1w);
      const ring = archOpening(x0, x1, sY, cY, fY1, 16);
      const op = archOpening(x0, x1, sY, cY, fY1, 0);
      fillP(S, ring.p, '#4A2C16', { h: 120 });
      const nb = Math.round(((ring.a1 - ring.a0) * (ring.R - 8)) / 26);
      for (let j = 0; j < nb; j++) {
        const a0 = ring.a0 + ((ring.a1 - ring.a0) * j) / nb + 0.006, a1 = ring.a0 + ((ring.a1 - ring.a0) * (j + 1)) / nb - 0.006;
        const ri = op.R + 1.5, ro = ring.R - 1.5; const q = [[ring.xc + Math.cos(a0) * ri, op.cy + Math.sin(a0) * ri], [ring.xc + Math.cos(a1) * ri, op.cy + Math.sin(a1) * ri], [ring.xc + Math.cos(a1) * ro, ring.cy + Math.sin(a1) * ro], [ring.xc + Math.cos(a0) * ro, ring.cy + Math.sin(a0) * ro]];
        const pal = j % 2 === 0 ? PAL.gold : PAL.silver;
        fillP(S, poly(q), pal[2], { h: 160 });
        const m = bil(q, 0.5, 0.5); stroke(S, m[0], m[1], (a0 + a1) / 2 + Math.PI / 2, 18, 6, pal[3], { alpha: 0.8 });
      }
      for (const [xa, xb] of [[x0 - 16, x0], [x1, x1 + 16]]) for (let y = sY; y < fY1 - 4; y += 20) { const pal = Math.round((y - sY) / 20) % 2 === 0 ? PAL.gold : PAL.silver; fillP(S, rectPath(xa + 1.5, y + 1.5, xb - xa - 3, 17), pal[2], { h: 160 }); stroke(S, (xa + xb) / 2, y + 10, Math.PI / 2, 12, 5, pal[3], { alpha: 0.8 }); }
      S.region(op.p, { ramp: ['#0D1D30', '#12283F', '#17344E', '#1E435E', '#28546E'], shade: (x, y) => clamp(0.12 + 0.6 * ((y - cY) / (fY1 - cY))), dir: 0, dirJit: 0.05, len: [30, 60], wid: [9, 14], cover: 2.6, bbox: [x0, cY, x1, fY1], rim: false });
      S.x.save(); S.hx.save(); S.x.clip(op.p); S.hx.clip(op.p);
      const fx = (x0 + x1) / 2, fy = sY + 26;
      field(S, { bbox: [fx - (x1 - x0) * 0.3, fy - 12, fx + (x1 - x0) * 0.3, fy + 18], ramp: ['#335F5A', '#437669', '#578C77', '#70A386'], shade: (x, y) => clamp(0.9 - Math.abs(x - fx) / ((x1 - x0) * 0.32)), dir: 0, dirJit: 0.04, len: [24, 48], wid: [7, 10], cover: 2.2 });
      const wy0 = sY + 38;
      S.region(rectPath(x0, wy0, x1 - x0, fY1 - wy0 + 2), { ramp: ['#1A5068', '#25667E', '#367D92', '#5096A6', '#74B2BA'], shade: (x, y) => clamp(0.22 + 0.6 * ((y - wy0) / (fY1 - wy0)) + 0.22 * (1 - Math.abs(x - fx) / ((x1 - x0) / 2))), dir: 0, dirJit: 0.03, len: [24, 50], wid: [5, 8], cover: 2.6, bbox: [x0, wy0, x1, fY1 + 2], rim: false });
      for (let i = 0; i < 14; i++) { const x = x0 + r() * (x1 - x0), y = wy0 + 5 + r() * (fY1 - wy0 - 6); stroke(S, x, y, 0, 20 + r() * 24, 2.2, '#A6DDE0', { alpha: 0.45 }); }
      for (let i = 0; i < 4; i++) { const a = op.a0 + 0.2 + r() * (op.a1 - op.a0 - 0.4); const rr = op.R - 10 - r() * 12; stroke(S, op.xc + Math.cos(a) * rr, op.cy + Math.sin(a) * rr, a + Math.PI / 2, 24, 2, '#7FC2CC', { alpha: 0.25, height: false }); }
      S.x.restore(); S.hx.restore();
    }
    // --- ön ırmak: berrak turkuaz-beyaz su, dipte görünen inci ve yakut çakıllar (oyuk / set yok)
    const wY = Y(PLAT.waterY) - 4; const water = rectPath(0, wY, w, h - wY);
    const wT = (y) => clamp((y - wY) / (h - wY));
    S.region(water, { ramp: ['#1E6A84', '#2C849C', '#45A0B2', '#69BCC6', '#93D4D6', '#C0E9E4'], shade: (x, y) => clamp(0.18 + 0.7 * Math.pow(wT(y), 0.7) + 0.08 * (NOISE(x * 0.01, y * 0.03) - 0.5)), dir: 0, dirJit: 0.04, len: [60, 120], wid: [8, 14], cover: 2.4, jitter: 8, bbox: [0, wY, w, h], rim: false });
    S.x.save(); S.hx.save(); S.x.clip(water); S.hx.clip(water);
    // dip: safran-krem kum lekeleri
    field(S, { bbox: [0, wY + 50, w, h], ramp: ['#9FCFC0', '#B9DDC6', '#D3E7CC'], shade: (x, y) => NOISE(x * 0.01, y * 0.02), dir: 0, dirJit: 0.3, len: [30, 60], wid: [12, 20], cover: 0.6, alpha: 0.35, mask: (x, y) => NOISE(x * 0.006 + 5, y * 0.01) > 0.5 });
    // kemerlerin ve ayakların kırık yansıması
    for (const [x0w, x1w] of PLAT.openings) { const x0 = X(x0w), x1 = X(x1w);
      for (let i = 0; i < 26; i++) { const x = x0 + 12 + r() * (x1 - x0 - 24); const y = wY + 6 + Math.pow(r(), 1.6) * 60; stroke(S, x, y, (r() - 0.5) * 0.06, 26 + r() * 34, 5 + r() * 3, r() < 0.7 ? '#1C4C66' : '#2C6880', { alpha: 0.55 * (1 - (y - wY) / 80) }); } }
    for (let i = 0; i < 120; i++) { const x = r() * w; const y = wY + 4 + Math.pow(r(), 1.4) * 70; const inOpen = PLAT.openings.some(([a, b]) => x > X(a) + 8 && x < X(b) - 8); if (inOpen) continue; stroke(S, x, y, (r() - 0.5) * 0.06, 22 + r() * 26, 5 + r() * 3, r() < 0.5 ? '#C4BFD6' : '#A9C9D6', { alpha: 0.5 * (1 - (y - wY) / 85) }); }
    // dip çakılları: kümeler halinde, yakına doğru büyür; berrak suyun altında görünür
    const peb = [];
    for (let i = 0; i < 900 && peb.length < 170; i++) { const y = wY + 46 + Math.pow(r(), 0.75) * (h - wY - 40); const x = r() * w; if (NOISE(x * 0.009 + 11, y * 0.02 + 3) < 0.52) continue; peb.push([x, y]); }
    peb.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of peb) {
      const sc = 0.55 + 1.15 * wT(y); const rx = (8 + r() * 9) * sc, ry = rx * (0.5 + r() * 0.14); const t = r(); const rot = (r() - 0.5) * 0.5;
      const pal = t < 0.6 ? (r() < 0.5 ? ['#A9A2BE', '#CFC8DC', '#ECE6EF', '#FFFFFF'] : ['#B3A7B5', '#D8CAD4', '#F2E6EA', '#FFFFFF']) : t < 0.86 ? ['#6E1028', '#A81B3A', '#D2374E', '#F27A84'] : ['#9A6E22', '#C9993A', '#E9C673', '#FBEAB0'];
      fillP(S, ellipsePath(x + 2 * sc, y + 2.6 * sc, rx * 1.02, ry, rot), '#17607A', { alpha: 0.42, height: false });
      fillP(S, ellipsePath(x, y, rx, ry, rot), pal[1], { h: 150 });
      S.x.save(); S.hx.save(); const ep = ellipsePath(x, y, rx, ry, rot); S.x.clip(ep); S.hx.clip(ep);
      stroke(S, x + rx * 0.2, y + ry * 0.45, rot, rx * 1.4, Math.max(1.5, ry * 0.7), pal[0], { alpha: 0.6 });
      stroke(S, x - rx * 0.15, y - ry * 0.25, rot, rx * 1.2, Math.max(1.5, ry * 0.7), pal[2], { alpha: 0.85 });
      stroke(S, x - rx * 0.35, y - ry * 0.45, rot - 0.2, rx * 0.6, Math.max(1.2, ry * 0.35), pal[3], { alpha: 0.9 });
      if (t < 0.6 && r() < 0.6) stroke(S, x + rx * 0.3, y, rot, rx * 0.5, Math.max(1, ry * 0.3), PAL.nacre[Math.floor(r() * 3)], { alpha: 0.7, height: false });
      S.x.restore(); S.hx.restore();
    }
    // su örtüsü: çakılları suyun altına alır (yarı saydam akış darbeleri)
    field(S, { bbox: [-40, wY, w + 40, h], ramp: ['#3E9BB0', '#5FB6C2', '#87CDD1', '#B3E3DF', '#DDF6F1'], shade: (x, y) => clamp(0.25 + 0.6 * wT(y) + 0.15 * (NOISE(x * 0.008, y * 0.02) - 0.5)), dir: 0, dirJit: 0.04, len: [70, 150], wid: [6, 11], cover: 0.9, alpha: 0.32, size: (x, y) => 0.7 + 0.6 * wT(y) });
    for (let i = 0; i < 130; i++) { const y = wY + 12 + r() * (h - wY - 12); const sc = 0.6 + 0.8 * wT(y); stroke(S, r() * w, y, (r() - 0.5) * 0.04, (30 + r() * 50) * sc, (2 + r() * 1.6) * sc, r() < 0.6 ? '#EFFCF8' : '#C4EEE9', { alpha: 0.6 }); }
    for (const [a, b] of PLAT.openings) for (const xw of [a, b]) { const x = X(xw) + (xw === a ? -8 : 8); for (let i = 0; i < 3; i++) stroke(S, x + (r() - 0.5) * 20, wY + 6 + i * 5, 0, 34 - i * 6, 2, '#DDF6F2', { alpha: 0.5 }); }
    S.x.restore(); S.hx.restore();
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: PLAT.y - PLAT.top, k: 1 };
  }

  // ---------------------------------------------------------------- 7) z-kosk: kenarlarda ince sütunlar ve üstte kemer (altın-gümüş tuğla, inci kakma), saydam orta
  const ARCH = { cx: 540, cy: 330, ai: 480, bi: 268, ae: 534, be: 316 };
  // tuğla tonları: altın ve gümüş yakın değerde (desen ölçülü kalsın)
  const BR = { gold: ['#644015', '#8C5D1E', '#B07E28', '#CB9937', '#E2B955'], silver: ['#565463', '#73707F', '#908D9C', '#ACA9B6', '#C6C3CD'] };
  function paintKosk() {
    const w = 1320, h = 1920, k = 1; const S = Paint.sprite(w, h, { seed: 7801, k }); const r = S.r;
    const X = (x) => x + 120, Y = (y) => y + 120;
    const acx = X(ARCH.cx), acy = Y(ARCH.cy);
    const E = (th, t) => [acx + lerp(ARCH.ai, ARCH.ae, t) * Math.cos(th), acy - lerp(ARCH.bi, ARCH.be, t) * Math.sin(th)];
    // --- köşe panoları: yarı saydam inci (içi dışından görünen odalar gibi), altın çerçeve ve ince kafes
    const sp = [[0, 0], [w, 0], [w, acy], [X(1080), acy]];
    for (let i = 0; i <= 60; i++) sp.push(E((i / 60) * Math.PI, 1));
    sp.push([0, acy]);
    const span = poly(sp);
    fillP(S, span, '#CFC9DC', { alpha: 0.84, h: 135 });
    field(S, { bbox: [0, 0, w, acy], clip: span, ramp: ['#8F88AA', '#A59FBF', '#BCB6D0', '#D2CDDF', '#E6E2EC'], shade: (x, y) => clamp(0.3 + 0.45 * (y / acy) + 0.25 * (NOISE(x * 0.006, y * 0.006) - 0.5)), dir: (x, y) => Math.atan2(y - acy, x - acx) + Math.PI / 2, dirJit: 0.2, len: [40, 80], wid: [12, 18], cover: 2, alpha: 0.82, max: 3000 });
    field(S, { bbox: [0, 0, w, acy], clip: span, ramp: PAL.nacre, shade: (x, y) => NOISE(x * 0.004 + 9, y * 0.004), dir: (x, y) => Math.atan2(y - acy, x - acx) + Math.PI / 2, dirJit: 0.2, len: [40, 80], wid: [8, 12], cover: 0.45, alpha: 0.45, height: false });
    // ince altın kafes (eşkenar dörtgen), panoya kakılmış
    S.x.save(); S.hx.save(); S.x.clip(span); S.hx.clip(span);
    for (let d = -800; d < w + 800; d += 74) for (const sg of [1, -1]) { for (let t = 0; t < 1; t += 0.05) { const x = d + sg * t * 520, y = t * 520; if (y > acy) break; stroke(S, x, y, sg > 0 ? Math.PI / 4 : (3 * Math.PI) / 4, 30, 2.4, BR.gold[3], { alpha: 0.45, dry: 0 }); } }
    S.x.restore(); S.hx.restore();
    const inset = []; for (let i = 0; i <= 60; i++) inset.push(E((i / 60) * Math.PI, 1.09));
    S.line(inset.filter((p) => p[1] > -10), 5, PAL.gold[3], { edge: false, rim: { w: 1 } });
    S.line([[0, Y(-62)], [w, Y(-62)]], 8, PAL.gold[3], { edge: false, rim: { w: 1.2 } });
    S.line([[0, Y(-58)], [w, Y(-58)]], 2, PAL.gold[5], { edge: false });
    for (let x = 20; x < w; x += 34) { fillP(S, circ(x, Y(-48), 4.4), PAL.pearl[4], { h: 190 }); fillP(S, circ(x - 1.3, Y(-49.4), 1.7), '#FFFFFF', { height: false }); }
    // köşe panolarında inci rozet
    for (const [qx, qy, R0] of [[X(24), Y(40), 46], [X(1056), Y(40), 46]]) {
      fillP(S, rosette(qx, qy, R0, 8, 0), PAL.pearl[3], { h: 170, alpha: 0.95 }); fillP(S, star8(qx, qy, R0 * 0.5, Math.PI / 8, 0.74), BR.gold[3], { h: 185 }); fillP(S, circ(qx, qy, R0 * 0.2), PAL.pearl[5], { h: 195 });
    }
    // --- sütunlar (ince, sade silindir; tarihî düzen yok)
    const col = (cxw) => {
      const cx = X(cxw), R = COLS.R; const yTop = Y(COLS.springY), yBot = Y(COLS.baseY);
      const shaft = rectPath(cx - R, yTop, 2 * R, yBot - yTop);
      S.rim(shaft, { w: 2 });
      fillP(S, shaft, '#4A2C16', { h: 110 });
      const rowH = 18; let row = 0;
      for (let y = yTop + 6; y < yBot - 4; y += rowH, row++) {
        const nB = 4; const dth = Math.PI / nB; const off = row % 2 ? 0.5 : 0;
        for (let j = -1; j <= nB; j++) {
          let t0 = -Math.PI / 2 + (j + off) * dth, t1 = t0 + dth; t0 = Math.max(-Math.PI / 2, t0); t1 = Math.min(Math.PI / 2, t1); if (t1 - t0 < 0.05) continue;
          const xa = cx + R * Math.sin(t0) + (t0 > -Math.PI / 2 + 0.01 ? 1 : 0), xb = cx + R * Math.sin(t1) - (t1 < Math.PI / 2 - 0.01 ? 1 : 0);
          const pal = (j + row + 8) % 2 === 0 ? BR.gold : BR.silver;
          const tm = (t0 + t1) / 2; const v = clamp(0.58 + 0.36 * Math.cos(tm + 0.45) - 0.2 * Math.pow(Math.sin(tm), 2));
          const ki = clamp(Math.floor(v * 4), 0, 3); const q = rectPath(xa, y + 1, xb - xa, rowH - 2);
          fillP(S, q, pal[ki], { h: 150 + ki * 6 });
          if (xb - xa > 5) { stroke(S, (xa + xb) / 2, y + rowH * 0.4, 0, (xb - xa) * 0.85, 5, pal[ki + 1], { alpha: 0.65 }); stroke(S, (xa + xb) / 2, y + rowH * 0.72, 0, (xb - xa) * 0.7, 3.5, pal[Math.max(0, ki - 1)], { alpha: 0.4 }); }
        }
        if (row % 10 === 5) { for (let j = 0; j < 7; j++) { const th = -Math.PI / 2 + ((j + 0.5) / 7) * Math.PI; const x = cx + R * 0.94 * Math.sin(th); const rr = 3.2 * (0.55 + 0.45 * Math.cos(th)); fillP(S, ellipsePath(x, y + rowH + 0.5, rr * 0.9, 3.4), PAL.pearl[4], { h: 195 }); fillP(S, circ(x - 0.8, y + rowH - 0.6, 1.3), '#FFFFFF', { height: false }); } }
      }
      // sütun boyunca yumuşak serin gölge (sağ yan) ve ışıklı sırt
      S.x.save(); S.x.clip(shaft); S.x.globalAlpha = 0.18; S.x.fillStyle = '#1C2440'; S.x.fillRect(cx + R * 0.45, yTop, R, yBot - yTop); S.x.restore();
      const cap1 = smoothPath([[cx - R - 6, yTop - 4], [cx, yTop - 10], [cx + R + 6, yTop - 4], [cx + R + 4, yTop + 8], [cx, yTop + 14], [cx - R - 4, yTop + 8]]);
      S.region(cap1, { ramp: PAL.pearl.slice(1), shade: (x) => clamp(0.85 - Math.abs(x - cx + 10) / (R * 1.6)), dir: 0, len: [14, 24], wid: [5, 8], cover: 3, bbox: [cx - R - 8, yTop - 12, cx + R + 8, yTop + 16], rim: { w: 1.2 } });
      const ab = rectPath(cx - R - 14, Y(COLS.capY), 2 * R + 28, Y(COLS.springY) - Y(COLS.capY) - 8);
      S.region(ab, { ramp: PAL.gold.slice(1), shade: (x, y) => clamp(0.7 - Math.abs(x - cx + 12) / (R * 3) - 0.25 * ((y - Y(COLS.capY)) / 22)), dir: 0, len: [20, 36], wid: [6, 9], cover: 3, bbox: [cx - R - 16, Y(COLS.capY) - 2, cx + R + 16, Y(COLS.springY)], rim: { w: 1.4 } });
      for (let j = 0; j < 5; j++) { const x = cx - R - 6 + (j + 0.5) * ((2 * R + 12) / 5); fillP(S, circ(x, Y(COLS.capY) + 11, 3.6), PAL.pearl[4], { h: 195 }); fillP(S, circ(x - 1, Y(COLS.capY) + 9.8, 1.4), '#FFFFFF', { height: false }); }
      const bY = Y(COLS.baseY), fY = Y(COLS.footY);
      const b1 = smoothPath([[cx - R - 6, bY + 2], [cx, bY - 4], [cx + R + 6, bY + 2], [cx + R + 8, bY + 16], [cx, bY + 22], [cx - R - 8, bY + 16]]);
      S.region(b1, { ramp: PAL.pearl.slice(1), shade: (x) => clamp(0.8 - Math.abs(x - cx + 10) / (R * 1.6)), dir: 0, len: [14, 24], wid: [5, 8], cover: 3, bbox: [cx - R - 10, bY - 6, cx + R + 10, bY + 24], rim: { w: 1.2 } });
      S.region(rectPath(cx - R - 12, bY + 18, 2 * R + 24, fY - bY - 18), { ramp: PAL.gold.slice(0, 5), shade: (x) => clamp(0.65 - Math.abs(x - cx + 10) / (R * 3)), dir: 0, len: [20, 36], wid: [6, 9], cover: 3, bbox: [cx - R - 14, bY + 16, cx + R + 14, fY], rim: { w: 1.4 } });
    };
    col(COLS.cx[0]); col(COLS.cx[1]);
    // --- kemer: iki sıra küçük altın-gümüş tuğla, iç ve dış kenarda altın pervaz, ortada inci kakma
    const band = []; for (let i = 0; i <= 80; i++) band.push(E((i / 80) * Math.PI, 0)); for (let i = 80; i >= 0; i--) band.push(E((i / 80) * Math.PI, 1));
    const bandP = poly(band);
    S.rim(bandP, { w: 2.2 });
    fillP(S, bandP, '#4A2C16', { h: 110 });
    const NS = 400; const cum = [0]; let prev = E(0, 0.5);
    for (let i = 1; i <= NS; i++) { const p = E((i / NS) * Math.PI, 0.5); cum.push(cum[i - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1])); prev = p; }
    const total = cum[NS]; const thAt = (s0) => { let lo = 0, hi = NS; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] < s0) lo = m; else hi = m; } return ((lo + (s0 - cum[lo]) / (cum[hi] - cum[lo] || 1)) / NS) * Math.PI; };
    const courses = [[0.0, 0.5], [0.5, 1.0]]; const bl = 34;
    courses.forEach(([t0, t1], c) => {
      const n = Math.round(total / bl); const offs = c ? 0.5 : 0;
      for (let j = -1; j < n; j++) {
        const s0 = clamp(((j + offs) / n) * total, 0, total), s1 = clamp(((j + 1 + offs) / n) * total, 0, total); if (s1 - s0 < 4) continue;
        const th0 = thAt(s0 + 1), th1 = thAt(s1 - 1);
        const q = [E(th0, t0 + 0.04), E(th1, t0 + 0.04), E(th1, t1 - 0.04), E(th0, t1 - 0.04)];
        const pal = (j + c + 4) % 2 === 0 ? BR.gold : BR.silver;
        const ki = clamp(1 + Math.floor(NOISE(j * 0.7, c * 3) * 2.4), 1, 3);
        fillP(S, poly(q), pal[ki], { h: 150 + ki * 6 });
        const m = bil(q, 0.5, 0.45); stroke(S, m[0], m[1], Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]), bl * 0.75, 6, pal[ki + 1], { alpha: 0.7 });
      }
    });
    { const n = Math.round(total / (bl * 2)); for (let j = 0; j <= n; j++) { const th = thAt((j / n) * total); if (th < 0.04 || th > Math.PI - 0.04) continue; const p = E(th, 0.5); fillP(S, circ(p[0], p[1], 4.6), PAL.pearl[4], { h: 200 }); fillP(S, circ(p[0] - 1.4, p[1] - 1.5, 1.8), '#FFFFFF', { height: false }); fillP(S, circ(p[0] + 1.5, p[1] + 1.3, 1.4), PAL.nacre[0], { height: false, alpha: 0.7 }); } }
    const sof = []; for (let i = 0; i <= 80; i++) sof.push(E((i / 80) * Math.PI, 0)); for (let i = 80; i >= 0; i--) sof.push(E((i / 80) * Math.PI, -0.08));
    S.region(poly(sof), { ramp: PAL.goldC.slice(0, 4), shade: Paint.cst(0.45), dir: (x, y) => Math.atan2(y - acy, x - acx) + Math.PI / 2, len: [20, 36], wid: [5, 8], cover: 3, bbox: bboxOf(sof), rim: { w: 1.2 } });
    const edgeL = (t, wd, col) => { const pts = []; for (let i = 0; i <= 120; i++) pts.push(E((i / 120) * Math.PI, t)); S.line(pts, wd, col, { edge: false }); };
    edgeL(0.0, 5, PAL.gold[4]); edgeL(1.0, 6, PAL.gold[3]); edgeL(1.0 - 0.02, 1.6, PAL.gold[5]);
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }

  // ---------------------------------------------------------------- 8) z-kanopi: uçsuz bucaksız ağaç tacının altı (uzayan serin gölge), altın dallar, alçak salkımlar
  function paintKanopi() {
    const w = 1320, h = 760, k = 1; const S = Paint.sprite(w, h, { seed: 7901, k }); const r = S.r;
    const edgeY = (x) => 500 + 34 * Math.sin(x * 0.012 + 0.8) + 22 * Math.sin(x * 0.031 + 2.1) + 40 * (NOISE(x * 0.006, 1.7) - 0.5);
    const mass = new Path2D(); mass.rect(-20, -20, w + 40, 470);
    const clumps = [];
    for (let x = -30; x < w + 40; x += 28 + r() * 22) { const y = edgeY(x); const rr = 40 + r() * 34; clumps.push([x, y - rr * 0.5, rr]); mass.addPath(circ(x, y - rr * 0.5, rr)); }
    const CAN = ['#062420', '#09302A', '#0C3E34', '#11503D', '#176444', '#1F794B', '#2E9050', '#4EA957', '#86C460', '#BBDC78'];
    const nC = CAN.length;
    // yumuşak alacalı serin gölge: derin teal, orta zümrüt, seyrek açık sarı-yeşil yaprak boşlukları (huzme yok)
    const pockets = [[300, 330, 120], [610, 300, 140], [930, 360, 110], [140, 420, 90], [760, 440, 90], [460, 420, 80], [1150, 300, 120]];
    const cShade = (x, y) => { let v = 0.12 + 0.42 * clamp(y / 560) + 0.5 * (NOISE.fbm(x * 0.006, y * 0.009, 3) - 0.5); for (const [px, py, pr] of pockets) v += 0.28 * Math.exp(-(Math.pow(x - px, 2) + Math.pow((y - py) * 1.4, 2)) / (pr * pr)); return clamp(v); };
    S.region(mass, { ramp: CAN, shade: cShade, dir: (x, y) => (NOISE(x * 0.01, y * 0.01) - 0.5) * 6, len: [18, 36], wid: [9, 15], cover: 2.6, jitter: 8, noise: 0.06, broken: 0.07, bbox: [0, 0, w, h], rim: false, max: 9000 });
    const leafBunch = (x0, y0, n, R, vf) => { for (let i = 0; i < n; i++) { const a = r() * TAU, u = Math.sqrt(r()) * R; const x = x0 + Math.cos(a) * u, y = y0 + Math.sin(a) * u * 0.8; const v = clamp(vf(x, y) + (r() - 0.5) * 0.22); leaf(S, x, y, a + (r() - 0.5) * 0.8, 22 + r() * 14, 9 + r() * 5, CAN[clamp(Math.floor(v * nC), 0, nC - 1)]); } };
    for (let i = 0; i < 52; i++) { const x = r() * w, y = 30 + r() * 440; leafBunch(x, y, 10, 44, (xx, yy) => cShade(xx, yy) + 0.06); }
    // altın dallar: kalın ana kollar, kıvrılarak incelen kollar (gölgede serin altın)
    const LG = ['#4C3218', '#76501F', '#A2752B', '#C99A3E', '#E6C066', '#F5DE9C'];
    const br = (ctrl, w0, w1) => limb(S, crPts(ctrl, 7), w0, w1, { pal: LG, rim: { w: 1.3, alpha: 0.7 } });
    br([[-20, 206], [140, 230], [300, 262], [430, 274], [560, 258], [700, 244], [860, 220], [1010, 208], [1170, 186], [1340, 164]], 52, 24);
    br([[1340, 348], [1230, 352], [1120, 346], [1010, 330], [930, 312], [884, 300]], 42, 20);
    br([[430, 272], [412, 316], [404, 356], [396, 392]], 22, 6);
    br([[700, 246], [716, 292], [720, 340], [712, 382]], 20, 6);
    br([[300, 262], [282, 306], [276, 350], [282, 388]], 18, 5);
    br([[1120, 346], [1150, 390], [1188, 420]], 18, 5);
    br([[860, 220], [846, 270], [830, 320], [820, 360]], 16, 5);
    br([[560, 258], [586, 214], [624, 180], [672, 160]], 16, 5);
    br([[180, 238], [150, 186], [110, 156]], 16, 5);
    br([[1010, 208], [1040, 160], [1090, 128]], 14, 5);
    br([[640, 252], [620, 300], [600, 340]], 14, 5);
    // dalları yer yer örten yaprak kümeleri
    for (const [x, y] of [[360, 268], [500, 262], [600, 254], [760, 236], [900, 216], [1080, 200], [220, 246], [1250, 176], [60, 216], [1180, 350], [990, 326], [400, 380], [716, 372], [282, 380], [826, 350], [1180, 412], [604, 336], [140, 230], [440, 270]]) leafBunch(x + (r() - 0.5) * 30, y + (r() - 0.5) * 16, 13, 32, (xx, yy) => cShade(xx, yy) + 0.16);
    for (let i = 0; i < 30; i++) { const t = r(); const x = t * w, y = 200 + 50 * Math.sin(t * 5) + r() * 220; leafBunch(x, y, 9, 32, (xx, yy) => cShade(xx, yy) + 0.12); }
    // alt kenar: bahçeden gelen ortam ışığını alan sarkık yapraklar
    for (const [cx, cy, rr] of clumps) {
      for (let i = 0; i < 9; i++) { const a = Math.PI * (0.08 + r() * 0.84); const x = cx + Math.cos(a) * rr * (0.55 + r() * 0.4), y = cy + Math.sin(a) * rr * (0.55 + r() * 0.4); const v = clamp(0.5 + r() * 0.42); leaf(S, x, y, a + (r() - 0.5) * 0.7, 26 + r() * 14, 10 + r() * 5, CAN[clamp(Math.floor(v * nC), 0, nC - 1)]); }
    }
    // --- sarkan salkımlar: yaprak kenarından kısa saplarla, tahtların üstünde el uzanacak yükseklikte
    const stem = (pts, wd = 4) => S.line(crPts(pts, 5), wd, PAL.gold[3], { w1: wd * 0.7, edge: false, rim: { w: 0.9 } });
    stem([[282, 462], [288, 500], [290, 522]], 5); grapeCluster(S, 290, 520, 150, 226, 15, PAL.violet, 61, { stem: false });
    stem([[214, 520], [214, 560], [214, 590]], 4); pomegranate(S, 214, 626, 36, { crownAng: Math.PI / 2 + 0.25, seed: 62 });
    stem([[366, 452], [420, 520], [436, 560]], 4); pomegranate(S, 436, 598, 42, { crownAng: Math.PI / 2 - 0.2, seed: 63 });
    stem([[470, 500], [484, 560], [488, 610]], 3.5); pomegranate(S, 490, 648, 38, { crownAng: Math.PI / 2 + 0.3, seed: 64 });
    dateBunch(S, 580, 528, 116, 180, PAL.dateG, 65);
    stem([[698, 460], [700, 500], [702, 526]], 5); grapeCluster(S, 702, 524, 138, 204, 14, PAL.grapeG, 66, { stem: false });
    stem([[814, 440], [812, 520], [812, 560]], 4); pomegranate(S, 812, 598, 40, { crownAng: Math.PI / 2 - 0.15, seed: 67 });
    stem([[1218, 470], [1222, 510]], 4); dateBunch(S, 1222, 510, 108, 176, PAL.dateG, 68);
    stem([[60, 470], [70, 500], [74, 520]], 4); grapeCluster(S, 74, 518, 128, 196, 14, PAL.grapeG, 69, { stem: false });
    for (const [x, y] of [[290, 516], [702, 520], [580, 522], [1222, 506], [74, 514], [214, 570], [436, 545], [812, 545], [488, 590]]) for (let i = 0; i < 5; i++) { const a = -Math.PI * (0.15 + r() * 0.7); leaf(S, x + (r() - 0.5) * 50, y - 10 + (r() - 0.5) * 16, a + Math.PI + (r() - 0.5), 28 + r() * 10, 11 + r() * 4, CAN[6 + Math.floor(r() * 4)]); }
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }

  // ---------------------------------------------------------------- 9) z-arka: köşkün ötesindeki bahçe (yumuşak zümrüt, uzak inci kubbeler, güller, hafif pus)
  function paintArka() {
    const w = 1320, h = 1920, k = 1; const S = Paint.sprite(w, h, { seed: 8001, k }); const r = S.r;
    const HZ = 880; // ufuk (sprite) = dünya 760
    const bands = [[0, '#123A30'], [300, '#184A3C'], [460, '#22604A'], [580, '#2F7558'], [680, '#468A69'], [760, '#64A07E'], [820, '#86B797'], [862, '#A6CCAE'], [884, '#9CCB92'], [920, '#86C37C'], [980, '#71B96C'], [1050, '#5EAC60'], [1130, '#4F9D57'], [1220, '#448E50'], [1400, '#3A7F48']];
    const by = bands.map((b) => b[0]), bc = bands.map((b) => b[1]); const nb = bands.length;
    const yIdx = (y) => { for (let i = nb - 1; i >= 0; i--) if (y >= by[i]) { const y1 = i < nb - 1 ? by[i + 1] : by[i] + 300; return (i + clamp((y - by[i]) / (y1 - by[i]))) / nb; } return 0; };
    for (let y = 0; y < h; y += 4) { S.x.fillStyle = bc[clamp(Math.floor(yIdx(y) * nb), 0, nb - 1)]; S.x.fillRect(0, y, w, 4); }
    field(S, { bbox: [-40, -20, w + 40, 1360], ramp: bc, shade: (x, y) => yIdx(y + 10 * Math.sin(x * 0.01 + y * 0.003)), dir: 0, dirJit: 0.08, len: [60, 140], wid: [14, 24], cover: 1.6, noise: 0.015, broken: 0.05, max: 5000 });
    // ağaç tacı: yaprak dokulu, basamaklı tonlar
    const crown = (cx, cy, rx, ry, pal, seed, lw = [16, 30], ww = [10, 16], rimP = 0.5) => {
      const pts = blobPts(cx, cy, rx, ry, 22, 0.16, seed); const p = smoothPath(pts);
      S.region(p, { ramp: pal, shade: (x, y) => clamp(0.68 - ((y - cy) / ry) * 0.34 - ((x - cx) / rx) * 0.1 + 0.3 * (NOISE.fbm(x * 0.014, y * 0.014, 2) - 0.5)), dir: (x, y) => (NOISE(x * 0.02, y * 0.02) - 0.5) * 5, len: lw, wid: ww, cover: 2.4, jitter: 6, bbox: bboxOf(pts), rim: r() < rimP ? { w: 1.4, alpha: 0.6 } : false });
    };
    // altın gövde: kök genişlemesi, hafif kavis, basamaklı ton; tepede dallara ayrılır
    const trunk = (x, yTop, yBot, wd, haze = 0) => {
      const pal = PAL.gold.map((c) => mix(c, '#9CC6AA', haze));
      const pts = crPts([[x - wd * 0.1, yBot], [x + wd * 0.08, lerp(yBot, yTop, 0.35)], [x - wd * 0.06, lerp(yBot, yTop, 0.7)], [x + wd * 0.04, yTop]], 6);
      limb(S, pts.slice().reverse(), wd * 0.72, wd * 1.25, { pal, rim: haze > 0.3 ? false : { w: 1.2, alpha: 0.6 } });
      if (wd > 14) { limb(S, crPts([[x, yTop + 20], [x - wd * 1.2, yTop - wd * 1.6], [x - wd * 2.2, yTop - wd * 3]], 6), wd * 0.5, wd * 0.25, { pal }); limb(S, crPts([[x, yTop + 30], [x + wd * 1.1, yTop - wd * 1.2], [x + wd * 2.4, yTop - wd * 2.4]], 6), wd * 0.45, wd * 0.22, { pal }); }
    };
    // ağaç sırası: üst üste binen çok loblu taçlar (lolipop değil), gövdeler yalnız altta kısa görünür
    const treeLine = (yBase, hMin, hMax, rMin, rMax, pal, seed, trunkW, haze, step) => {
      const R = rng(seed); const list = [];
      for (let x = -40; x < w + 60; x += step * (0.6 + R() * 0.7)) { const rr = lerp(rMin, rMax, R()); list.push([x, yBase - lerp(hMin, hMax, R()), rr]); }
      for (const [x, cy, rr] of list) if (R() < 0.7) trunk(x + (R() - 0.5) * rr * 0.4, cy + rr * 0.3, yBase + 4, trunkW, haze);
      list.sort((a, b) => a[1] - b[1]);
      for (const [x, cy, rr] of list) { const n = 2 + Math.floor(R() * 3); const dl = (R() - 0.5) * 0.08, dh = (R() - 0.5) * 18; const pp = pal.map((c) => shade(c, dl, 1.05, dh)); for (let j = 0; j < n; j++) { const a = R() * TAU; crown(x + Math.cos(a) * rr * 0.45, cy + Math.sin(a) * rr * 0.3, rr * (0.6 + R() * 0.35), rr * (0.5 + R() * 0.25), pp, seed * 13 + Math.round(x) + j, [10 + rr * 0.1, 18 + rr * 0.16], [7 + rr * 0.05, 11 + rr * 0.08], 0.12); } }
    };
    // ufukta hafif pus (uzaklık; ışık kaynağı değil) — ağaçlardan önce
    field(S, { bbox: [-40, HZ - 120, w + 40, HZ + 20], ramp: ['#9FC8B0', '#AFD2BC', '#BFDBC8'], shade: (x, y) => clamp(1 - Math.abs(y - HZ + 30) / 120), dir: 0, dirJit: 0.03, len: [80, 180], wid: [10, 18], cover: 0.3, alpha: 0.2, height: false });
    treeLine(HZ + 4, 28, 48, 26, 40, ['#5E9C86', '#6FA993', '#81B6A0', '#94C2AD', '#A8CEBB'], 41, 4, 0.6, 46);
    treeLine(HZ + 16, 80, 150, 44, 74, ['#195C44', '#226B4E', '#2E7C59', '#3E8E66', '#53A076', '#6DB287'], 42, 8, 0.3, 70);
    // sıra C (üstte, kanopiye karışan yakın taçlar)
    for (const [x, cy, rx] of [[80, 420, 200], [400, 360, 190], [700, 400, 210], [1010, 370, 200], [1280, 430, 180]]) crown(x, cy, rx, rx * 0.62, ['#164A3A', '#1D5944', '#26694E', '#327A58', '#428B63'], 500 + x, [20, 38], [12, 18]);
    // uzak inci kubbeler (içi boş inci çadır): yarımküreden biraz fazla, sedef yanardöner; tepe süsü / hilal yok
    const dome = (cx, baseY, R, haze) => {
      const cy = baseY - R * 0.14; const clipR = new Path2D(); clipR.rect(cx - R - 4, cy - R - 4, 2 * R + 8, baseY - (cy - R) + 4);
      const p = circ(cx, cy, R);
      S.x.save(); S.hx.save(); S.x.clip(clipR); S.hx.clip(clipR);
      const pal = ['#6F6990', '#8A84A8', '#A6A0C0', '#C2BCD4', '#DBD5E2', '#EFE9EA', '#FBF6EF'].map((c) => mix(c, '#B5D3C0', haze));
      S.region(p, { ramp: pal, shade: (x, y) => clamp(Paint.sphere(cx - R * 0.15, cy - R * 0.1, R * 1.05, [-0.45, -0.6], 0.06)(x, y) * 0.98), dir: (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2, len: [R * 0.22, R * 0.42], wid: [Math.max(5, R * 0.09), Math.max(7, R * 0.14)], cover: 3, bbox: [cx - R - 2, cy - R - 2, cx + R + 2, baseY + 2], rim: { w: 1.5, alpha: 0.8 } });
      // sedef: enlem kuşakları boyunca pembe / nane / lavanta; altta çimden nane yansıması
      for (let i = 0; i < 34; i++) { const lat = -1.35 + r() * 1.3; const lon = (r() - 0.5) * 2.6; const x = cx + Math.sin(lon) * Math.cos(lat) * R * 0.9, y = cy + Math.sin(lat) * R * 0.9; if (y > baseY - 3) continue; const c = lat > -0.25 ? PAL.nacre[1] : PAL.nacre[i % 3 === 1 ? 2 : i % 3]; stroke(S, x, y, -Math.sin(lon) * Math.sin(lat) * 0.8, R * 0.3, Math.max(4, R * 0.075), mix(c, '#CFE2D6', haze * 0.5), { alpha: 0.72 }); }
      stroke(S, cx - R * 0.36, cy - R * 0.52, -0.55, R * 0.42, Math.max(4, R * 0.1), mix('#FFFDF8', '#E3EEE6', haze), { alpha: 0.85 });
      stroke(S, cx - R * 0.5, cy - R * 0.25, -1.0, R * 0.2, Math.max(3, R * 0.06), mix('#FFFFFF', '#E3EEE6', haze), { alpha: 0.6 });
      S.x.restore(); S.hx.restore();
      fillP(S, ellipsePath(cx, baseY + 1, R * 1.04, Math.max(3, R * 0.08)), mix('#2A6248', '#93C2A2', haze), { alpha: 0.75, height: false });
    };
    dome(200, HZ + 4, 18, 0.55); dome(1108, HZ + 5, 20, 0.55);
    dome(550, HZ + 32, 76, 0.1); dome(810, HZ + 26, 54, 0.18); dome(350, HZ + 22, 36, 0.28); dome(1000, HZ + 20, 32, 0.3);
    // orta zemin: safran-krem kıyılı kaynak suyu (bahçenin içinden doğar, köşkün altına akar)
    const brook = crPts([[812, HZ + 26], [756, HZ + 52], [676, HZ + 100], [620, HZ + 172], [650, HZ + 250], [600, HZ + 350]], 6);
    const bw = (i) => lerp(5, 78, Math.pow(i / (brook.length - 1), 1.3));
    const side = (sg) => brook.map((p, i) => { const a = brook[Math.max(0, i - 1)], b = brook[Math.min(brook.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [p[0] - (dy / l) * bw(i) * sg, p[1] + (dx / l) * bw(i) * sg]; });
    const bankL = side(1.5), bankR = side(-1.5), wl = side(1), wr = side(-1);
    S.region(poly([...bankL, ...bankR.slice().reverse()]), { ramp: ['#C99E52', '#DDB66C', '#EAC98A', '#F3DBAA'], shade: (x, y) => clamp(0.35 + (y - HZ) / 700 + 0.2 * (NOISE(x * 0.03, y * 0.03) - 0.5)), dir: 0, len: [16, 30], wid: [6, 10], cover: 2.4, bbox: bboxOf([...bankL, ...bankR]), rim: false });
    S.region(poly([...wl, ...wr.slice().reverse()]), { ramp: ['#4FA9B8', '#74C2C8', '#9ED9D6', '#C9EEE8'], shade: (x, y) => clamp(0.3 + (y - HZ) / 520 + 0.25 * (NOISE(x * 0.02, y * 0.04) - 0.5)), dir: 0, dirJit: 0.15, len: [20, 40], wid: [5, 9], cover: 2.6, bbox: bboxOf([...wl, ...wr]), rim: false });
    for (let i = 3; i < brook.length; i += 2) { for (const s2 of [1.25, -1.25]) { const p = side(s2)[i]; fillP(S, circ(p[0] + (r() - 0.5) * 5, p[1], 2 + (i / brook.length) * 3.5), r() < 0.75 ? '#F2EEF2' : PAL.ruby[3], { h: 170 }); } }
    // çalılar ve güller
    const bush = (cx, cy, rx, ry, seed) => {
      crown(cx, cy, rx, ry, ['#164F38', '#1E6143', '#28744D', '#358858', '#4B9C64', '#6AB073'], seed, [12, 24], [8, 12]);
      const n = Math.round((rx * ry) / 300);
      for (let i = 0; i < n; i++) { const a = r() * TAU, u = Math.sqrt(r()); const x = cx + Math.cos(a) * u * rx * 0.8, y = cy + Math.sin(a) * u * ry * 0.65 - ry * 0.12; const rr = 3.5 + r() * 3 + (cy - HZ) / 70; const t = r(); const pal = t < 0.45 ? PAL.rose : t < 0.75 ? ['#6E0F2C', '#981A3A', '#C02C48', '#DC5466', '#EE8590'] : ['#B9A1AE', '#D6C0CA', '#EADCE2', '#F7EEF1', '#FFFFFF']; fillP(S, circ(x, y, rr), pal[2], { h: 170 }); stroke(S, x - rr * 0.2, y - rr * 0.25, r() * 3, rr * 1.1, rr * 0.7, pal[3]); stroke(S, x + rr * 0.15, y + rr * 0.15, r() * 3, rr * 0.7, rr * 0.4, pal[1], { alpha: 0.7 }); }
    };
    bush(140, HZ + 64, 120, 56, 31); bush(410, HZ + 58, 96, 42, 32); bush(950, HZ + 60, 130, 54, 33); bush(1190, HZ + 74, 120, 60, 34);
    bush(250, HZ + 166, 160, 76, 35); bush(1050, HZ + 176, 170, 80, 36); bush(468, HZ + 230, 110, 58, 37); bush(806, HZ + 236, 120, 60, 38);
    return { canvas: S.finish({ emboss: 0.4 }), px: 0, py: 0, k: 1 };
  }

  // ---------------------------------------------------------------- 10) z-sarkan-dal: üzüm salkımı ve iki narla yüklü sarkan dal (taban sol üstte)
  const DAL = { w: 520, h: 620, px: 36, py: 30, k: 1.5 };
  function paintDal() {
    const k = DAL.k, w = Math.round(DAL.w * k), h = Math.round(DAL.h * k); const S = Paint.sprite(w, h, { seed: 8101, k }); const r = S.r;
    const P = (x, y) => [x * k, y * k];
    const CAN = ['#0A322C', '#0E4136', '#13523F', '#196647', '#227B4E', '#329353', '#55AD5A', '#8CC864'];
    // tabandaki yaprak buketi (kanopiye karışır) — arka katman
    for (let i = 0; i < 26; i++) { const a = r() * TAU; const u = 10 + r() * 60; const p = P(DAL.px + Math.cos(a) * u, DAL.py + Math.sin(a) * u * 0.7); leaf(S, p[0], p[1], a + (r() - 0.5) * 0.6, 30 + r() * 14, 12 + r() * 4, CAN[1 + Math.floor(r() * 4)]); }
    // ana dal
    const main = crPts([P(36, 30), P(98, 56), P(166, 92), P(232, 132), P(290, 166), P(336, 190)], 6);
    // ikincil kısa saplar (narlar)
    const s1 = crPts([P(100, 60), P(104, 76), P(100, 92)], 4), s2 = crPts([P(172, 98), P(176, 116), P(170, 132)], 4);
    limb(S, main, 26 * k, 12 * k);
    // asma yaprakları ve badem yapraklar dal boyunca (arka)
    vineLeaf(S, ...P(250, 128), 46 * k, -0.6, { seed: 81, dark: true });
    vineLeaf(S, ...P(318, 160), 40 * k, 0.4, { seed: 82, dark: true });
    for (let i = 0; i < 16; i++) { const t = r(); const p = main[Math.floor(t * (main.length - 1))]; const a = (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.9) + 0.5; leaf(S, p[0] + Math.cos(a) * 22 * k, p[1] + Math.sin(a) * 22 * k, a, 34 + r() * 12, 13 + r() * 4, CAN[2 + Math.floor(r() * 5)], { vein: CAN[1] }); }
    S.line(s1, 8 * k, PAL.gold[2], { w1: 6 * k, edge: false, rim: { w: 1 } });
    S.line(s2, 8 * k, PAL.gold[2], { w1: 6 * k, edge: false, rim: { w: 1 } });
    // narlar (sarkık: taç aşağı); ikincisi salkımın arkasında kalır
    pomegranate(S, ...P(96, 134), 44 * k, { crownAng: Math.PI / 2 + 0.25, seed: 83 });
    pomegranate(S, ...P(166, 174), 42 * k, { crownAng: Math.PI / 2 - 0.2, seed: 84 });
    // ağır üzüm salkımı
    S.line(crPts([P(262, 146), P(252, 168), P(236, 186)], 4), 7 * k, PAL.gold[3], { w1: 5 * k, edge: false, rim: { w: 1 } });
    grapeCluster(S, ...P(232, 184), 168 * k, 300 * k, 15.5 * k, PAL.violet, 85, { stem: false });
    // ön katman yapraklar: tabanda ve salkım tepesinde
    vineLeaf(S, ...P(200, 176), 40 * k, 2.2, { seed: 86 });
    for (let i = 0; i < 14; i++) { const a = r() * TAU; const u = 8 + r() * 46; const p = P(DAL.px + Math.cos(a) * u, DAL.py + Math.sin(a) * u * 0.7); leaf(S, p[0], p[1], a + (r() - 0.5) * 0.6, 30 + r() * 12, 12 + r() * 4, CAN[3 + Math.floor(r() * 5)], { vein: CAN[1] }); }
    for (let i = 0; i < 5; i++) { const p = P(240 + (r() - 0.5) * 70, 182 + (r() - 0.5) * 14); const a = -Math.PI / 2 + (r() - 0.5) * 2.2; leaf(S, p[0], p[1], a, 30 + r() * 8, 12, CAN[4 + Math.floor(r() * 4)], { vein: CAN[1] }); }
    return { canvas: S.finish({ emboss: 0.5 }), px: DAL.px * k, py: DAL.py * k, k };
  }

  // ---------------------------------------------------------------- 11) z-gul: gül kümesi (dikensiz) ; z-inci: inci ve yakut çakıllar
  function paintGul() {
    const k = 1.5, w = Math.round(170 * k), h = Math.round(140 * k); const S = Paint.sprite(w, h, { seed: 8201, k }); const r = S.r;
    const P = (x, y) => [x * k, y * k];
    for (let i = 0; i < 26; i++) { const a = -Math.PI * (0.05 + r() * 0.9); const u = 20 + r() * 50; const p = P(85 + Math.cos(a) * u * 1.2, 118 + Math.sin(a) * u); leaf(S, p[0], p[1], a + (r() - 0.5) * 0.5, 26 + r() * 10, 12 + r() * 4, PAL.leaf[1 + Math.floor(r() * 4)], { vein: PAL.leaf[0] }); }
    const roses = [[62, 70, 24, PAL.rose], [108, 62, 27, ['#5E0A26', '#8E1638', '#B42548', '#D24B66', '#E87C90', '#F6B4C0', '#FFE6EA']], [86, 96, 22, ['#B88E9C', '#D3AEBA', '#E8CCD4', '#F5E3E7', '#FBF1F3', '#FFFFFF', '#FFFFFF']], [138, 92, 18, PAL.rose], [36, 98, 17, ['#5E0A26', '#8E1638', '#B42548', '#D24B66', '#E87C90', '#F6B4C0', '#FFE6EA']]];
    roses.forEach(([x, y, rr, pal], i) => rose(S, ...P(x, y), rr * k, pal, 300 + i));
    for (let i = 0; i < 8; i++) { const a = -Math.PI * (0.1 + r() * 0.8); const u = 40 + r() * 30; const p = P(85 + Math.cos(a) * u * 1.25, 120 + Math.sin(a) * u * 0.55); leaf(S, p[0], p[1], a, 24 + r() * 8, 11, PAL.leaf[3 + Math.floor(r() * 3)], { vein: PAL.leaf[1] }); }
    return { canvas: S.finish({ emboss: 0.5 }), px: 85 * k, py: 130 * k, k };
  }
  function paintInci() {
    const k = 1.5, w = Math.round(90 * k), h = Math.round(52 * k); const S = Paint.sprite(w, h, { seed: 8301, k }); const r = S.r;
    const P = (x, y) => [x * k, y * k];
    const items = [[22, 30, 11, 'p'], [46, 22, 9, 'r'], [64, 32, 12, 'p'], [38, 38, 8, 'p'], [76, 18, 7, 'r']];
    for (const [x, y, rr, t] of items) {
      const [cx, cy] = P(x, y); const R = rr * k;
      fillP(S, ellipsePath(cx + R * 0.15, cy + R * 0.7, R * 0.95, R * 0.3), '#1E3E52', { alpha: 0.35, height: false });
      if (t === 'p') { S.region(circ(cx, cy, R), { ramp: PAL.pearl.slice(1), shade: sph(cx - R * 0.3, cy - R * 0.4, R * 1.2, 0.2), dir: (px, py) => Math.atan2(py - cy, px - cx) + Math.PI / 2, len: [rr * 0.6, rr * 1.1], wid: [rr * 0.3, rr * 0.5], cover: 3, bbox: [cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1], rim: { w: 0.9 } }); stroke(S, cx + R * 0.25, cy + R * 0.3, 0.7, rr * 0.7, rr * 0.25, PAL.nacre[r() < 0.5 ? 0 : 1], { alpha: 0.7 }); stroke(S, cx - R * 0.35, cy - R * 0.4, -0.7, rr * 0.5, rr * 0.25, '#FFFFFF'); }
      else { S.region(smoothPath(blobPts(cx, cy, R, R * 0.8, 10, 0.08, x)), { ramp: PAL.ruby, shade: sph(cx - R * 0.3, cy - R * 0.4, R * 1.2, 0.1), dir: 0.6, len: [rr * 0.5, rr * 0.9], wid: [rr * 0.3, rr * 0.45], cover: 3, bbox: [cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1], rim: { w: 0.9 } }); stroke(S, cx - R * 0.3, cy - R * 0.35, -0.6, rr * 0.5, rr * 0.25, PAL.ruby[5]); }
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: w / 2, py: h / 2, k };
  }

  defSprite('z-arka', paintArka);
  defSprite('z-kanopi', paintKanopi);
  defSprite('z-kosk', paintKosk);
  defSprite('z-platform', paintPlatform);
  defSprite('z-hali', paintHali);
  defSprite('z-taht-sol', () => paintTaht(-1, 7101));
  defSprite('z-taht-sag', () => paintTaht(1, 7102));
  defSprite('z-tepsi', paintTepsi);
  defSprite('z-akvab', paintAkvab);
  defSprite('z-ibrik', paintIbrik);
  defSprite('z-sarkan-dal', paintDal);
  defSprite('z-gul', paintGul);
  defSprite('z-inci', paintInci);

  // ---------------------------------------------------------------- yerleşim (arkadan öne); dünya = zoom 1'de ekran
  const cups = [[226, 1318], [854, 1318], [956, 1238]];
  const branch = { x: 760, y: 180, restRot: 0, lowerRot: 0.18 };
  const layers = [
    { name: 'z-arka', x: -120, y: -120, parallax: 0.6 },
    { name: 'z-kanopi', x: -120, y: -120, parallax: 1.05 },
    { name: 'z-kosk', x: -120, y: -120, parallax: 1.0 },
    { name: 'z-platform', x: -120, y: PLAT.y, parallax: 1.0 },
    { name: 'z-hali', x: 540, y: 1330, parallax: 1.0 },
    { name: 'z-taht-sol', x: 215, y: 1180, parallax: 1.0 },
    { name: 'z-taht-sag', x: 865, y: 1180, parallax: 1.0 },
    { name: 'z-tepsi', x: 540, y: 1270, parallax: 1.0 },
    ...cups.map(([x, y]) => ({ name: 'z-akvab', x, y, parallax: 1.0 })),
    { name: 'z-ibrik', x: 112, y: 1338, parallax: 1.0 },
    { name: 'z-sarkan-dal', x: branch.x, y: branch.y, parallax: 1.05 },
  ];
  return {
    layers, cups, branch,
    streamPath, streamDir: [1, 0],
    // önerilen serpiştirmeler (isteğe bağlı): gül kümeleri ve çakıllar [x, y, ölçek]
    roses: [[44, 1534, 0.9], [1036, 1534, 0.9]],
    pebbles: [[150, 1960, 1], [470, 1990, 1.1], [820, 1950, 0.9], [990, 2000, 1.2]],
    PAL, CAM, proj, PLAT, ARCH, COLS,
  };
})();
