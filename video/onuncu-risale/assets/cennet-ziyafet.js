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
        list.push([cx + xx * cr - yj * sr, top + xx * sr + yj * cr, r * (0.86 + R() * 0.26), R() * 0.75 + (1 - Math.abs(u - 0.5) * 2) * 0.25]);
      }
    }
    if (o.stem !== false) {
      const sx = cx - (o.stemDx ?? 0) * cr, sy = top - (o.stemLen ?? r * 2.2);
      S.line([[sx, sy], [cx + (sx - cx) * 0.3, top - r * 0.6], [cx, top + r]], Math.max(2.5, r * 0.28), PAL.gold[2], { w1: Math.max(2, r * 0.2), edge: false });
    }
    list.sort((a, b) => a[3] - b[3]);
    for (const [x, y, rr, z] of list) grape(S, x, y, rr, pal, { amb: 0.05 + z * 0.14, dark: z < 0.38, rimP: o.rimP ?? 0.12 });
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
    S.region(p, { ramp: pal, shade: sph(x - ry * 0.5, y - ry * 0.9, rx * 1.05, 0.1), dir: ang, dirJit: 0.15, len: [ls * 0.35, ls * 0.7], wid: [clamp(ls * 0.1, 1.5, 9), clamp(ls * 0.16, 2, 12)], cover: 3, noise: 0.04, rim: R() < 0.5 ? { w: clamp(ls * 0.03, 0.7, 1.6) } : false, bbox: [x - ext, y - ext, x + ext, y + ext] });
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
    for (const [x, y, u] of mound) grape(S, x, y, 22 + r() * 5, PAL.violet, { amb: 0.07 + clamp((y - 150) / 280) * 0.12, dark: u > 0.8 && y < 300, rimP: 0.1 });
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
    for (let i = 0; i < 15; i++) dts.push([560 + r() * 170, 440 + r() * 66, (r() - 0.5) * 1.6]);
    dts.sort((a, b) => a[1] - b[1]);
    for (const [x, y, a] of dts) date(S, x, y, 66 + r() * 14, a, r() < 0.3 ? PAL.dateG : PAL.dateB);
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
    const k = 2, w = 340, h = 600; const S = Paint.sprite(w, h, { seed: 7501, k }); const r = S.r;
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
    S.line(hdl, 15, PAL.silver[1], { w1: 12, rim: { w: 1.4 }, edge: false });
    S.line(hdl.map(([x, y]) => [x - 2, y - 2]), 8, PAL.silver[3], { w1: 6, edge: false });
    S.line(hdl.map(([x, y]) => [x - 3, y - 3]), 2.6, PAL.silver[5], { w1: 2, edge: false });
    // lüle (gövdenin sağından yükselir)
    const spt = crPts([[cx + 58, 404], [cx + 96, 352], [cx + 128, 278], [cx + 150, 196], [cx + 166, 142], [cx + 176, 126]], 5);
    S.line(spt, 30, PAL.silver[1], { w1: 9, rim: { w: 1.4 }, edge: false });
    S.line(spt.map(([x, y]) => [x - 3, y - 1]), 17, PAL.silver[3], { w1: 5, edge: false });
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

  defSprite('z-tepsi', paintTepsi);
  defSprite('z-akvab', paintAkvab);
  defSprite('z-ibrik', paintIbrik);

  return { PAL, CAM, proj };
})();
