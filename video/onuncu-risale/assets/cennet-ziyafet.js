// Cennet ziyafeti (Perde 5, 33.19–36.40 sn): köşkün altında, ırmak kıyısında yakın plan — insansız (88:13-16):
// yükseltilmiş, altın örgülü karşılıklı tahtlar, dizili yastıklar, serili halılar, altın tepside meyveler, hazır kadehler,
// gümüş ibrik, uzayan serin gölge (56:30) ve kümeleri alçalan dallar (69:23, 76:14).
// Dünya koordinatı = zoom 1'de ekran pikseli (1080×1920, sol üst köken); kamera itmesi için 120 px kenar payı.
// Işık: güneş yok, gökte kaynak yok, huzme yok; yumuşak, eşit, kaynaksız ortam ışığı. Parıltı patlaması yok.
// Köşk: üst üste odalar (39:20) — kemerin üstünde bir sonraki katın inci pencereleri; çatı / kubbe / kaynak yok.
// Zemin: döşeme / kiriş / direk / iskele YOK — tahtlar ve halı doğal çimene serili. Irmaklar oyuksuz, setsiz, YÜZEYDE akar
// (Enes hadisi): bahçeden gelen dere tahtların arasından iner, sağ tahtın ayaklarının yanından kıvrılır, halının sağından
// geçip öndeki ırmağa çimenin üstünde katılır; hiçbir yerde zeminin altına girmez. Kıyılar yumuşak: çimen, inci çakıl, çiçek.
// Arka bahçe: altın gövdeli, yapraklı, meyveli canlı ağaçlar (her gövde bir tacın içine girer); fon düz basamaklı inci-nane-şeftali.
'use strict';
const ZIYAFET = (() => {
  const TAU = Math.PI * 2;
  const LA = [-0.3, -0.86]; // kaynaksız ortam: gök kubbesi gibi yukarıdan yumuşak (yön vurgusu yok)
  // ortak perspektif (zemin, halı, tahtlar, tepsi, kadehler): göz hizası y=760, odak 1100, göz yüksekliği 1 birim
  const CAM = { hz: 760, f: 1100, cx: 540 };
  const proj = (X, Y, Z) => [CAM.cx + (CAM.f * X) / Z, CAM.hz + (CAM.f * (1 - Y)) / Z];
  // ziyafet takımı (tahtlar, halı, tepsi, kadehler, ibrik) ufuk noktasına göre SET ölçeğiyle küçültülür = derinlikte geri itilir;
  // böylece karşılıklı tahtların kolçakları geniş kadrajda (z 0.95–1.07) çerçeve kenarlarına değmez. Sprite'lar aynı, k / SET ile çizilir.
  const SET = 0.92;
  const setP = (x, y) => [CAM.cx + (x - CAM.cx) * SET, CAM.hz + (y - CAM.hz) * SET];
  const gP = (X, Z) => [CAM.cx + (CAM.f * X) / Z, CAM.hz + CAM.f / Z]; // zemin düzlemi (X, Z) → dünya
  const w2g = (x, y) => { const Z = CAM.f / Math.max(0.5, y - CAM.hz); return [((x - CAM.cx) * Z) / CAM.f, Z]; };

  // ---------------------------------------------------------------- palet (koyu → açık, basamaklı)
  const PAL = {
    gold: ['#5A2C06', '#8E500E', '#C2821A', '#E4AA2C', '#F1CB60', '#FCE9A8'],
    goldC: ['#4A2D16', '#77502A', '#A67A34', '#CFA244', '#EBC664', '#F6E3A2'], // serin gölgede altın
    silver: ['#38456A', '#596C96', '#8297BE', '#ACBFDE', '#D4E0F3', '#F3F8FF'], // serin mavi gümüş
    pearl: ['#7F7895', '#9E93AA', '#BDAFB9', '#D8CAC8', '#EDE2DA', '#FBF6EF'], // sıcak inci (lavanta gölge → krem)
    nacre: ['#F2C4D2', '#C4EAD9', '#D3CAF0', '#F8E2C2'], // pembe, nane, lavanta, krem ışıltı
    emer: ['#07332E', '#0B4A3C', '#106246', '#187C4F', '#279956', '#55B85E', '#9CD468'],
    silk: ['#063A30', '#09503E', '#0D684B', '#158556', '#25A260', '#5CC47A', '#A8E6A6'],
    ruby: ['#4A0A1E', '#7A102F', '#A61B3A', '#CC304A', '#E85E6E', '#FAA3A4'],
    violet: ['#1C1336', '#2C1E52', '#41306F', '#5B4790', '#7E68B2', '#B0A0D6'],
    grapeG: ['#3A5616', '#59791C', '#7E9E26', '#A3BE38', '#CAD966', '#EBF1AE'],
    dateA: ['#3A1105', '#64200A', '#8E340E', '#B85416', '#DA8428', '#F4BC5E'], // amber → kızıl kahve, parlak
    dateY: ['#6E4006', '#9C640E', '#C98F1A', '#E8B830', '#F6D65E', '#FDEFA8'], // taze sarı (berhi) hurma
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
  // kırık astar yayı: yalnız gölge yanında (sağ alt), kısa ve kesik — tam halka yok
  function arcRim(S, x, y, rx, ry, o = {}) {
    const r = S.r; const w = (o.w ?? 1.4) * S.k;
    const base = o.ang ?? 1.0; // gölge yönü (sağ alt)
    const n = r() < 0.35 ? 2 : 1;
    S.x.save(); S.x.strokeStyle = PAL.under; S.x.lineCap = 'round'; S.x.globalAlpha = o.alpha ?? 0.88; S.x.lineWidth = w * 2;
    for (let i = 0; i < n; i++) {
      const c = base + (r() - 0.5) * 1.3; const span = (o.span ?? 1.0) * (0.45 + r() * 0.6);
      S.x.beginPath(); S.x.ellipse(x, y, rx, ry, o.rot ?? 0, c - span / 2, c + span / 2); S.x.stroke();
    }
    S.x.restore();
  }
  // serin gölge lekeleri (yalnız gölge, ışık lekesi yok): boyanmış piksellerin üstüne, kaynaksız
  function dapple(S, bb, o = {}) {
    const r = S.r; const ctx = S.x; ctx.save(); ctx.globalCompositeOperation = 'source-atop';
    const n = o.n ?? 30;
    for (let i = 0; i < n; i++) {
      const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
      if (o.mask && !o.mask(x, y)) continue;
      const rx = lerp(o.r[0], o.r[1], r()) * S.k, ry = rx * (o.flat ?? 0.42);
      for (let j = 0; j < 4; j++) Paint.drawStroke(S, x + (r() - 0.5) * rx * 0.8, y + (r() - 0.5) * ry * 0.8, (o.dir ?? 0) + (r() - 0.5) * 0.3, rx * (0.8 + r() * 0.6), ry * (0.6 + r() * 0.4), o.color ?? '#1B2442', { alpha: o.alpha ?? 0.16, height: false, dry: 0.3 });
    }
    ctx.restore();
  }
  // elipsoit gölgelendirme (hurma gibi uzun meyveler)
  const ellShade = (cx, cy, rx, ry, ang, amb = 0.1) => (x, y) => {
    const ca = Math.cos(ang), sa = Math.sin(ang); const dx = x - cx, dy = y - cy;
    const u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry; const d2 = u * u + v * v;
    const nz = Math.sqrt(Math.max(0, 1 - d2)); const nx = u * ca - v * sa, ny = u * sa + v * ca;
    const ln = Math.hypot(LA[0], LA[1], 0.55); const val = (nx * LA[0] + ny * LA[1] + nz * 0.55) / ln;
    return clamp(amb + (1 - amb) * (val * 0.5 + 0.5));
  };
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
      cover: 2.4, jitter: 0, noise: 0.06, bbox: bboxOf(pts), rim: o.rim ?? { w: 1.2, alpha: 0.6 } });
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
    if (R() < (o.rimP ?? 0.3)) arcRim(S, x, y, r, r, { w: clamp(rs * 0.09, 0.6, 1.4), span: 0.9 });
    S.region(circ(x, y, r), {
      ramp, shade: ((f) => (px, py) => f(px, py) * (o.dim ?? 0.86))(sph(x - r * 0.3, y - r * 0.38, r * 1.22, o.amb ?? 0.1)),
      dir: (px, py) => Math.atan2(py - y, px - x) + Math.PI / 2 + (R() - 0.5) * 0.6,
      len: [rs * 0.8, rs * 1.5], wid: [clamp(rs * 0.42, 1.6, 9), clamp(rs * 0.7, 2.4, 13)],
      cover: 3.2, jitter: 0, noise: 0.05, broken: 0.04, bbox: [x - r - 1, y - r - 1, x + r + 1, y + r + 1],
      rim: false, dry: 0.1, lJit: 0.02,
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
    for (const [x, y, rr, z, edge] of list) grape(S, x, y, rr, pal, { amb: 0.05 + z * 0.14, dark: z < 0.38, rimP: edge ? (o.rimP ?? 0.35) : 0 });
    return list;
  }
  // nar: taç yönü ca (radyan; -π/2 yukarı, +π/2 aşağı = dalda sarkan nar)
  function pomegranate(S, x, y, r, o = {}) {
    const rs = r / S.k; const ca = o.crownAng ?? -Math.PI / 2; const pal = o.pal ?? PAL.ruby; const R = S.r;
    const tx = x + Math.cos(ca) * r * 0.86, ty = y + Math.sin(ca) * r * 0.86;
    const body = smoothPath(blobPts(x, y, r, r * 0.95, 26, 0.035, o.seed ?? 5, ca + Math.PI / 2));
    arcRim(S, x, y, r * 1.0, r * 0.96, { w: clamp(rs * 0.045, 0.9, 2.0), span: 1.5 });
    S.region(body, {
      ramp: pal, shade: ((f) => (px, py) => f(px, py) * 0.8)(sph(x - r * 0.28, y - r * 0.36, r * 1.18, 0.08)),
      dir: (px, py) => Math.atan2(py - ty, px - tx) + (R() - 0.5) * 0.3,
      len: [rs * 0.34, rs * 0.68], wid: [clamp(rs * 0.13, 2, 14), clamp(rs * 0.22, 3, 20)], cover: 3.0, jitter: rs * 0.08, noise: 0.03,
      bbox: [x - r - 3, y - r - 3, x + r + 3, y + r + 3], rim: false,
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
    S.region(crown, { ramp: ramp(cb, 4, { span: 0.34, warm: 4 }), shade: Paint.grad(tx - r * 0.3, ty - r * 0.3, tx + r * 0.3, ty + r * 0.3, 0.9, 0.15), dir: ca, len: [rs * 0.14, rs * 0.26], wid: [Math.max(1.5, rs * 0.06), Math.max(2, rs * 0.1)], cover: 3, rim: false, bbox: bboxOf(pts) });
    const oc = [tx + Math.cos(ca) * ch * 0.55, ty + Math.sin(ca) * ch * 0.55];
    fillP(S, ellipsePath(oc[0], oc[1], cw * 0.62, cw * 0.2, ca + Math.PI / 2), '#3A0C18', { alpha: 0.85 });
  }
  // hurma: dolgun, parlak oval (boy ≈ 3 × en); koyu öz, tek açık parlama darbesi, sap ucunda küçük kaliks
  function date(S, x, y, len, ang, pal = PAL.dateA, o = {}) {
    const ls = len / S.k; const rx = len / 2, ry = len * (o.th ?? 0.17); const R = S.r; const dim = o.dim ?? 1;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const oval = (cx, cy, ex, ey) => { const pts = []; for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU; const c = Math.cos(a), s2 = Math.sin(a); const tp = c > 0 ? 1 - 0.12 * c * c : 1; pts.push([cx + c * ex * ca - s2 * ey * tp * sa, cy + c * ex * sa + s2 * ey * tp * ca]); } return pts; };
    const pts = oval(x, y, rx, ry); const p = smoothPath(pts);
    let nx = -sa, ny = ca; if (nx * LA[0] + ny * LA[1] < 0) { nx = -nx; ny = -ny; } // ışık yanına bakan normal
    const P2 = (u, v) => [x + ca * u + nx * v, y + sa * u + ny * v];
    const dc = (c) => (dim < 1 ? shade(c, (dim - 1) * 0.3) : c);
    if (R() < 0.45) arcRim(S, x, y, rx, ry, { rot: ang, w: clamp(ls * 0.025, 0.7, 1.3), span: 1.2 });
    fillP(S, p, dc(pal[2]), { h: 150 });
    S.x.save(); S.hx.save(); S.x.clip(p); S.hx.clip(p);
    // basamaklar: gölge yanı (koyu öz), orta, ışık yanı — keskin kenarlı katlar
    { const q = P2(0, -ry * 0.55); fillP(S, smoothPath(oval(q[0], q[1], rx * 1.05, ry * 0.75)), dc(pal[1]), { h: 140 }); }
    { const q = P2(0, -ry * 0.9); fillP(S, smoothPath(oval(q[0], q[1], rx * 1.05, ry * 0.45)), dc(pal[0]), { h: 135, alpha: 0.8 }); }
    { const q = P2(-rx * 0.05, ry * 0.42); fillP(S, smoothPath(oval(q[0], q[1], rx * 0.82, ry * 0.5)), dc(pal[3]), { h: 160 }); }
    for (let i = 0; i < 2; i++) { const q = P2((R() - 0.5) * rx * 0.4, (R() - 0.3) * ry * 0.6); stroke(S, q[0], q[1], ang, ls * 0.6, clamp(ls * 0.12, 1.2, 6), dc(pal[2 + i]), { alpha: 0.5 }); }
    S.x.restore(); S.hx.restore();
    // tek, net parlama darbesi (ışık yanında) + küçük ikinci parıltı
    { const q = P2(-rx * 0.08, ry * 0.5); stroke(S, q[0], q[1], ang, ls * 0.46, clamp(ls * 0.075, 1, 4), pal[5], { alpha: 0.95 }); }
    { const q = P2(rx * 0.42, ry * 0.36); stroke(S, q[0], q[1], ang, ls * 0.14, clamp(ls * 0.05, 0.8, 2.4), pal[4], { alpha: 0.8 }); }
    // kaliks (sap ucu)
    const ex = x - ca * rx * 0.92, ey = y - sa * rx * 0.92;
    fillP(S, ellipsePath(ex, ey, ry * 0.3, ry * 0.4, ang), o.calyx ?? '#6E4E18', { h: 160 });
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
    arcRim(S, x, y, r, r, { w: clamp(rs * 0.045, 0.8, 1.8), span: 1.3 });
    S.region(path, { ramp: pal, shade: sph(x - r * 0.3, y - r * 0.4, r * 1.3, 0.1), dir: ang, dirJit: 0.3, len: [rs * 0.5, rs * 1.0], wid: [clamp(rs * 0.18, 2, 12), clamp(rs * 0.3, 3, 16)], cover: 3, noise: 0.04, bbox: bb, rim: false });
    // boyun: yeşilimsi
    S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
    for (let i = 0; i < 9; i++) { const u = r * (0.75 + S.r() * 0.75), v = (S.r() - 0.5) * r * 0.5; const q = P(u, v); stroke(S, q[0], q[1], ang + (S.r() - 0.5) * 0.3, rs * 0.45, rs * 0.16, o.neck ?? PAL.figN[1 + Math.floor(S.r() * 3)], { alpha: 0.8 }); }
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
    for (let i = 0; i < 7; i++) {
      const t = 0.12 + i * 0.13; const q = twig[Math.min(6, Math.round(t * 6))]; const side = i % 2 ? 1 : -1;
      const a = ang + side * (0.9 + R() * 0.4);
      leaf(S, q[0] + Math.cos(a) * s * 0.34, q[1] + Math.sin(a) * s * 0.34, a, (s * 0.62) / k, (s * 0.36) / k, PAL.leaf[3 + Math.floor(R() * 3)], { vein: PAL.leaf[1] });
    }
    const berries = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.15 + R() * 0.85; const q = twig[Math.min(6, Math.round(t * 6))]; const side = R() < 0.5 ? 1 : -1;
      berries.push([q[0] + -ay * side * s * (0.2 + R() * 0.25) + (R() - 0.5) * s * 0.2, q[1] + ax * side * s * (0.2 + R() * 0.25) + s * 0.12, s * (0.16 + R() * 0.05), R()]);
    }
    berries.sort((a, b) => a[1] - b[1]);
    for (const [bx, by, br, z] of berries) {
      const pal = z < 0.3 ? ['#5A2A0A', '#8A3E10', '#B45A1A', '#D98030', '#F0B060', '#FCE0A8'] : PAL.lote;
      grape(S, bx, by, br, pal, { amb: 0.1, rimP: 0.3 });
    }
  }
  // gül: spiral taç yaprakları (dikensiz)
  function rose(S, x, y, r, pal = PAL.rose, seed = 1) {
    const R = rng(seed); const rs = r / S.k;
    const body = smoothPath(blobPts(x, y, r, r * 0.9, 18, 0.12, seed));
    arcRim(S, x, y, r, r * 0.9, { w: clamp(rs * 0.05, 0.8, 1.6), span: 1.2 });
    S.region(body, { ramp: pal.slice(0, 5), shade: sph(x - r * 0.2, y - r * 0.3, r * 1.2, 0.15), dir: (px, py) => Math.atan2(py - y, px - x) + Math.PI / 2, len: [rs * 0.5, rs * 0.9], wid: [clamp(rs * 0.2, 2, 10), clamp(rs * 0.32, 3, 14)], cover: 2.6, bbox: [x - r - 2, y - r - 2, x + r + 2, y + r + 2], rim: false });
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
  // inci boncuk (küçük, ölçülü)
  function bead(S, x, y, rr, col = PAL.pearl[4]) { fillP(S, circ(x, y, rr), col, { h: 188 }); fillP(S, circ(x - rr * 0.3, y - rr * 0.34, rr * 0.42), '#FFFFFF', { height: false, alpha: 0.85 }); }

  // ---------------------------------------------------------------- ortak: basamaklı altın dal (koyu gövde, orta, açık sırt, ince parlak tepe)
  function limb(S, pts, w0, w1, o = {}) {
    const pal = o.pal ?? PAL.gold;
    const off = (d) => pts.map((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
      let nx = -dy / l, ny = dx / l; if (nx * LA[0] + ny * LA[1] < 0) { nx = -nx; ny = -ny; }
      const ww = lerp(w0, w1, i / (pts.length - 1)); return [q[0] + nx * ww * d, q[1] + ny * ww * d];
    });
    S.line(pts, w0, pal[1], { w1, rim: o.rim ?? { w: 1.4, alpha: 0.8 }, edge: false });
    S.line(off(0.12), w0 * 0.7, pal[2], { w1: w1 * 0.7, edge: false });
    S.line(off(0.22), w0 * 0.4, pal[3], { w1: w1 * 0.4, edge: false });
    S.line(off(0.3), Math.max(1.4, w0 * 0.15), o.crest ?? '#F1CB60', { w1: Math.max(1, w1 * 0.15), edge: false });
    if (w0 > 12 * S.k && o.top !== false) S.line(off(0.34), Math.max(1.2, w0 * 0.05), o.top2 ?? '#FCE9A8', { w1: Math.max(0.8, w1 * 0.05), edge: false });
  }
  // 8 köşeli yıldız
  const star8 = (cx, cy, R, rot = 0, ri = 0.74) => { const pts = []; for (let i = 0; i < 16; i++) { const a = rot + (i / 16) * TAU; const rr = i % 2 ? R * ri : R; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } return poly(pts); };
  // gül yaprağı biçimli rozet (n taç yaprağı)
  const rosette = (cx, cy, R, n, rot = 0) => { const p = new Path2D(); for (let i = 0; i < n; i++) { const a = rot + (i / n) * TAU; p.addPath(ellipsePath(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.52, R * 0.26, a)); } return p; };
  // eksene hizalı baklava (dik uzun)
  const lozenge = (cx, cy, rx, ry) => poly([[cx, cy - ry], [cx + rx, cy], [cx, cy + ry], [cx - rx, cy]]);

  // ---------------------------------------------------------------- 1) z-tepsi: altın tepside meyve yığını
  // Kenar elipsi zemin perspektifine uyar (RY/RX ≈ 0.46). İnci boncuklar yalnız uzak (üst) yarıda; ön kenar koyu yansımalı altın.
  const TEPSI = { x: 540, y: 1228, RX: 210, RY: 97 }; // dünya: kenar elipsi merkezi ve yarıçapları (ekran px)
  function paintTepsi() {
    const k = 2, w = 1000, h = 640; const S = Paint.sprite(w, h, { seed: 7301, k }); const r = S.r;
    const cx = 500, cy = 384, RX = TEPSI.RX * k, RY = TEPSI.RY * k; const G = PAL.gold;
    // halı üstünde serin temas gölgesi
    fillP(S, ellipsePath(cx, cy + 96, RX * 0.97, RY * 0.66), '#101C24', { alpha: 0.34, height: false });
    fillP(S, ellipsePath(cx, cy + 90, RX * 0.88, RY * 0.56), '#0C151C', { alpha: 0.22, height: false });
    // eş merkezli (teğet) darbe yönü: cilalı metal halkalar boyunca akar
    const tan = (ex, ey, erx, ery) => (x, y) => Math.atan2((y - ey) * erx * erx, -(x - ex) * ery * ery) + (r() - 0.5) * 0.08;
    // kenar kalınlığı (yan bant): halıyı yansıtan koyu altın, iki yanda açılan basamaklar
    const side = ellipsePath(cx, cy + 20, RX, RY);
    arcRim(S, cx, cy + 20, RX, RY, { w: 1.6, span: 1.6, ang: 1.2 });
    S.region(side, { ramp: [G[0], G[1], mix(G[1], '#1E5A44', 0.25), G[2], G[3]], shade: (x) => clamp(0.16 + 0.62 * Math.pow(Math.abs(x - cx) / RX, 2.4) + 0.06 * (NOISE(x * 0.03, 2) - 0.5)), dir: tan(cx, cy + 20, RX, RY), len: [50, 90], wid: [8, 11], cover: 2.6, broken: 0.02, bbox: [cx - RX - 2, cy - RY + 16, cx + RX + 2, cy + RY + 22], rim: false });
    // üst kenar bandı: uzak yanda sıcak parlak, yanlarda orta, önde koyu yansıma (basamaklı, teğet darbeler)
    const top = ellipsePath(cx, cy, RX, RY);
    const ang = (x, y) => Math.atan2((y - cy) / RY, (x - cx) / RX);
    S.region(top, { ramp: [G[0], G[1], G[2], G[3], G[4], G[5]], shade: (x, y) => { const a = ang(x, y); return clamp(0.5 - 0.46 * Math.sin(a) + 0.1 * Math.cos(a + 0.6) + 0.05 * (NOISE(x * 0.02, y * 0.02) - 0.5)); }, dir: tan(cx, cy, RX, RY), len: [50, 96], wid: [9, 13], cover: 2.6, noise: 0.015, broken: 0.02, bbox: [cx - RX - 2, cy - RY - 2, cx + RX + 2, cy + RY + 2], rim: false });
    // ön yarıda halının zümrüt yansıması (kırık, ince, teğet)
    for (let i = 0; i < 22; i++) { const a = 0.3 + r() * (Math.PI - 0.6); const x = cx + Math.cos(a) * RX * 0.94, y = cy + Math.sin(a) * RY * 0.9; stroke(S, x, y, Math.atan2(Math.cos(a) * RY, -Math.sin(a) * RX), 18 + r() * 16, 3, r() < 0.6 ? '#2A5A3E' : '#6E4A12', { alpha: 0.5 }); }
    // çukur: arka iç duvar açık-sıcak, ön kısım koyu (teğet, basamaklı)
    const RXi = RX - 56, RYi = RY - 26; const wy = cy + 6; const well = ellipsePath(cx, wy, RXi, RYi);
    S.region(well, { ramp: [PAL.goldC[1], G[1], G[2], G[3], G[4]], shade: (x, y) => clamp(0.86 - 0.66 * ((y - (wy - RYi)) / (2 * RYi)) + 0.06 * (NOISE(x * 0.01, y * 0.02) - 0.5)), dir: tan(cx, wy, RXi, RYi), len: [70, 130], wid: [12, 18], cover: 2.4, noise: 0.015, broken: 0.02, bbox: [cx - RXi, wy - RYi, cx + RXi, wy + RYi], rim: false });
    // sıcak parlama bantları (#FCE9A8): uzak kenar sırtı ve arka iç duvar; önde koyu yansımalı kenar çizgisi
    for (const [rx, ry, yy, wd, al, a0, a1] of [[RX - 10, RY - 5, cy, 5, 0.95, 1.05, 1.95], [RX - 30, RY - 15, cy + 2, 3, 0.75, 1.1, 1.9], [RXi - 12, RYi - 7, wy + 4, 4, 0.8, 1.12, 1.88], [RX - 8, RY - 4, cy + 1, 3.2, 0.55, 0.12, 0.88]]) {
      const n = 26;
      for (let i = 0; i < n; i++) { const a = Math.PI * (a0 + ((a1 - a0) * i) / (n - 1)) + (r() - 0.5) * 0.02; if (r() < 0.1) continue; const x = cx + Math.cos(a) * rx, y = yy + Math.sin(a) * ry; const front = a0 < 1; stroke(S, x, y, Math.atan2(Math.cos(a) * ry, -Math.sin(a) * rx), 24 + r() * 10, wd, front ? G[0] : i % 3 ? G[5] : G[4], { alpha: al }); }
    }
    S.x.save(); S.x.strokeStyle = G[0]; S.x.globalAlpha = 0.7; S.x.lineWidth = 2.4 * k; S.x.beginPath(); S.x.ellipse(cx, cy + 4, RXi + 6, RYi + 4, 0, 0, TAU); S.x.stroke(); S.x.restore();
    // inci boncuk dizisi yalnız uzak yarıda (form tanımlar)
    for (let i = 0; i <= 18; i++) { const a = Math.PI + (i / 18) * Math.PI; const x = cx + Math.cos(a) * (RX - 26), y = cy + Math.sin(a) * (RY - 12); bead(S, x, y, 4.8 + 1.2 * (1 - Math.abs(Math.cos(a)))); }

    // --- meyve yığını (arkadan öne); hepsi çukurun içinde, dökülen / sarkan tek tane yok
    vineLeaf(S, 262, 302, 82, -2.4, { seed: 11 });
    vineLeaf(S, 752, 292, 86, -0.7, { seed: 12 });
    vineLeaf(S, 866, 404, 66, 0.15, { seed: 13, dark: true });
    vineLeaf(S, 150, 420, 62, 2.8, { seed: 14, dark: true });
    pomegranate(S, 338, 262, 88, { crownAng: -2.0, seed: 21 });
    pomegranate(S, 664, 248, 94, { crownAng: -1.15, seed: 22 });
    // orta: mor üzüm tepesi (kubbe biçimli yığın; taneler yığının içinde kalır)
    // kubbe biçimli yığın: yükselti halkaları (taban → tepe), önden görünen yüz; arkadan öne çizilir
    const mound = [];
    for (const [phi, off] of [[0.12, 0], [0.5, 0.5], [0.88, 0], [1.25, 0.5], [1.57, 0]]) {
      const rho = Math.cos(phi), z = Math.sin(phi); const n = Math.max(1, Math.round((TAU * rho * 96) / 44));
      for (let i = 0; i < n; i++) { const th = ((i + off) / n) * TAU + (r() - 0.5) * 0.08; const sx = Math.cos(th), sy = Math.sin(th); if (sy < -0.35 && phi < 0.6) continue; mound.push([505 + rho * sx * 120, 300 + rho * sy * 54 - z * 74, rho * sy, phi]); }
    }
    mound.sort((a, b) => a[2] - b[2]);
    S.line([[540, 116], [524, 148], [512, 182]], 7, G[2], { w1: 5, edge: false });
    for (const [x, y, d] of mound) grape(S, x, y, 25 + r() * 3, PAL.violet, { amb: 0.04 + clamp((d + 1) / 2) * 0.2, dim: 1, dark: d < -0.4, hlCol: '#D4C8F0', rimP: d > 0.7 ? 0.25 : 0 });
    // sol: yeşil-altın salkım yığına yaslanıp kenardan taşar (sapı yığında)
    grapeCluster(S, 252, 312, 164, 214, 19, PAL.grapeG, 31, { rot: 0.5, stemLen: 30, stemDx: -10 });
    // sağ ön nar
    pomegranate(S, 768, 386, 76, { crownAng: -0.35, seed: 23 });
    // sidre kümesi kenardan taşar
    loteCluster(S, 812, 432, 60, 0.55, 41);
    // incirler
    fig(S, 300, 466, 40, -1.9, { seed: 51 });
    fig(S, 376, 446, 45, -1.35, { seed: 52 });
    fig(S, 452, 474, 46, -1.75, { seed: 53 });
    // hurmalar: iki düzenli sıra, dolgun parlak (amber → kızıl kahve)
    const rowB = [[580, 432, -0.34], [652, 424, -0.12], [724, 436, 0.12]];
    const rowF = [[604, 472, -0.22], [680, 468, 0.02], [752, 480, 0.22]];
    for (const [x, y, a] of rowB) date(S, x, y, 86, a, PAL.dateA.map((c) => shade(c, -0.05)), { th: 0.2, dim: 0.85 });
    for (const [x, y, a] of rowF) date(S, x, y, 90, a, PAL.dateA, { th: 0.2, dim: 0.92 });
    return { canvas: S.finish({ emboss: 0.55 }), px: cx, py: cy, k: k / SET };
  }

  // ---------------------------------------------------------------- 2) z-akvab: kulpsuz, ağızsız, ayaksız gümüş-billur kadeh (küçük; halıda)
  const AKVAB_K = 4.2; // sprite pikseli / ekran pikseli → ekranda ≈ 65×77
  function paintAkvab() {
    const k = 2.5, w = 275, h = 325; const S = Paint.sprite(w, h, { seed: 7401, k }); const r = S.r;
    const cx = 137, rimY = 50, RX = 102, RY = 40; const baseY = 288, BX = 52, BY = 19;
    const SV = PAL.silver;
    // halıda yumuşak temas gölgesi
    fillP(S, ellipsePath(cx + 6, baseY + 4, BX * 1.5, BY * 1.05), '#0C1620', { alpha: 0.36, height: false });
    // lale biçimli gövde: hafif açık dudak, dolgun karın, yuvarlak taban, alçak halka (sap yok)
    const prof = crPts([[cx - RX, rimY], [cx - RX + 9, rimY + 38], [cx - RX + 7, rimY + 104], [cx - RX + 20, rimY + 176], [cx - BX - 14, baseY - 22], [cx - BX, baseY - 4]], 5);
    const hwAt = (y) => { for (let i = 0; i < prof.length - 1; i++) if (y >= prof[i][1] && y <= prof[i + 1][1]) return cx - lerp(prof[i][0], prof[i + 1][0], (y - prof[i][1]) / (prof[i + 1][1] - prof[i][1] || 1)); return BX; };
    const bodyPts = [...prof];
    for (let i = 0; i <= 16; i++) { const a = Math.PI - (i / 16) * Math.PI; bodyPts.push([cx + Math.cos(a) * BX, baseY - 4 + Math.sin(a) * BY]); }
    for (let i = prof.length - 1; i >= 0; i--) bodyPts.push([2 * cx - prof[i][0], prof[i][1]]);
    for (let i = 0; i <= 16; i++) { const a = (i / 16) * Math.PI; bodyPts.push([cx + Math.cos(a) * RX, rimY - Math.sin(a) * RY]); }
    const body = poly(bodyPts);
    // gövde: çok yarı saydam serin gümüş-billur (arkası görünür)
    fillP(S, body, '#CFD9EE', { alpha: 0.16, h: 132 });
    const inner = ellipsePath(cx, rimY, RX - 6, RY - 4);
    fillP(S, inner, '#B4C2DE', { alpha: 0.4, h: 132 });
    field(S, { bbox: [cx - RX, rimY - RY, cx + RX, rimY + RY], clip: inner, ramp: [SV[1], SV[2], SV[3], SV[4]], shade: (x, y) => clamp(0.25 + 0.65 * ((y - rimY + RY) / (2 * RY))), dir: Math.PI / 2, dirJit: 0.2, len: [10, 18], wid: [3, 5], cover: 2.2, alpha: 0.5 });
    // su: berrak, hafif turkuaz; ortası malzemenin kendi yumuşak ışığıyla açık
    const wY = rimY + 58; const wHW = hwAt(wY) - 7; const wRY = wHW * (RY / RX);
    const wb = []; for (let y = wY; y <= baseY - 8; y += 5) wb.push([cx - hwAt(y) + 7, y]);
    const wPoly = [...wb];
    for (let i = 0; i <= 12; i++) { const a = Math.PI - (i / 12) * Math.PI; wPoly.push([cx + Math.cos(a) * (BX - 9), baseY - 10 + Math.sin(a) * (BY - 5)]); }
    for (let i = wb.length - 1; i >= 0; i--) wPoly.push([2 * cx - wb[i][0], wb[i][1]]);
    const waterBody = poly(wPoly); waterBody.addPath(ellipsePath(cx, wY, wHW, wRY));
    fillP(S, waterBody, '#B6E6E6', { alpha: 0.34, h: 128 });
    field(S, { bbox: [cx - RX, wY - wRY, cx + RX, baseY], clip: waterBody, ramp: ['#7CC6CE', '#A4DEDD', '#CCF2EE', '#EFFFFB'], shade: (x, y) => clamp(0.95 - Math.abs(x - cx + 8) / (RX * 0.85) - (y - wY) / 380), dir: Math.PI / 2, dirJit: 0.25, len: [16, 28], wid: [4, 7], cover: 2, alpha: 0.4 });
    const surf = ellipsePath(cx, wY, wHW, wRY);
    fillP(S, surf, '#D5F5F1', { alpha: 0.6, h: 148 });
    field(S, { bbox: [cx - wHW, wY - wRY, cx + wHW, wY + wRY], clip: surf, ramp: ['#9EDDDA', '#C6EFEA', '#E9FFFA'], shade: (x, y) => clamp(0.45 + (wY - y) / (wRY * 2) + (cx - x) / (wHW * 3)), dir: 0, dirJit: 0.15, len: [14, 24], wid: [3, 5], cover: 2, alpha: 0.7 });
    S.x.save(); S.x.globalAlpha = 0.8; S.x.strokeStyle = '#F4FFFC'; S.x.lineWidth = 2 * k; S.x.beginPath(); S.x.ellipse(cx, wY, wHW, wRY, 0, Math.PI * 0.05, Math.PI * 0.95); S.x.stroke(); S.x.restore();
    // ön cidar: kenarlarda serin mavi gümüş basamaklar (gümüşü gümüş okutan)
    for (let i = 0; i < 2; i++) {
      const sd = i ? 1 : -1;
      for (let y = rimY + 14; y < baseY - 14; y += 10) {
        const hw = hwAt(y); const x = cx + sd * (hw - 6);
        stroke(S, x, y, Math.PI / 2 + sd * 0.08, 13, 6, sd < 0 ? SV[3] : SV[1], { alpha: 0.9 });
        stroke(S, x - sd * 9, y + 4, Math.PI / 2, 10, 3.4, sd < 0 ? SV[4] : SV[2], { alpha: 0.6 });
      }
    }
    // tek inci dikey ışıltı (pembe-nane-lavanta) + yumuşak beyaz vurgu (çizgi değil)
    for (let y = rimY + 24; y < baseY - 40; y += 12) { const hw = hwAt(y); if (r() < 0.15) continue; stroke(S, cx - hw * 0.5 + (r() - 0.5) * 3, y, Math.PI / 2 - 0.05, 12 + r() * 6, 6, y < rimY + 90 ? PAL.nacre[0] : y < rimY + 160 ? PAL.nacre[1] : PAL.nacre[2], { alpha: 0.55 }); stroke(S, cx - hw * 0.5, y, Math.PI / 2, 9, 2.6, '#FFFFFF', { alpha: 0.75 }); }
    // gümüş taban bandı: güçlü, serin mavi basamaklı
    const bandAt = (y0, y1) => {
      const pts = []; const h0 = hwAt(y0) + 2, h1 = hwAt(y1) + 2; const e = RY / RX;
      for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; pts.push([cx + Math.cos(a) * h0, y0 + Math.sin(a) * h0 * e]); }
      for (let i = 0; i <= 14; i++) { const a = (i / 14) * Math.PI; pts.push([cx + Math.cos(a) * h1, y1 + Math.sin(a) * h1 * e]); }
      const p = poly(pts);
      S.region(p, { ramp: SV, shade: (x) => clamp(0.82 - ((x - cx) / h0) * 0.42 - Math.pow((x - cx) / h0, 2) * 0.4), dir: 0, len: [8, 14], wid: [3, 4.5], cover: 3, bbox: bboxOf(pts), rim: false });
    };
    bandAt(baseY - 50, baseY - 32);
    // kalın billur taban
    const base = ellipsePath(cx, baseY - 6, BX - 2, BY);
    fillP(S, base, '#D6E0F0', { alpha: 0.6, h: 160 });
    field(S, { bbox: [cx - BX, baseY - 6 - BY, cx + BX, baseY + BY], clip: base, ramp: [SV[2], SV[3], SV[4], '#FFFFFF'], shade: (x, y) => clamp(0.8 - Math.hypot((x - cx + 14) / BX, (y - baseY + 10) / BY) * 0.7), dir: 0, len: [10, 18], wid: [3, 5], cover: 2.6, alpha: 0.8 });
    S.x.save(); S.x.globalAlpha = 0.95; S.x.strokeStyle = SV[1]; S.x.lineWidth = 3 * k; S.x.beginPath(); S.x.ellipse(cx, baseY - 2, BX, BY, 0, 0.12, Math.PI - 0.12); S.x.stroke(); S.x.restore();
    // dudak: kalın gümüş bant (opak), alt yüzü serin mavi koyu, üst sırtı açık; üstünde seyrek inci
    S.x.save(); S.x.lineCap = 'round';
    S.x.globalAlpha = 1; S.x.strokeStyle = SV[2]; S.x.lineWidth = 7 * k; S.x.beginPath(); S.x.ellipse(cx, rimY, RX - 3, RY - 1.5, 0, Math.PI, TAU); S.x.stroke();
    S.x.strokeStyle = SV[1]; S.x.lineWidth = 8 * k; S.x.beginPath(); S.x.ellipse(cx, rimY + 2, RX - 3, RY - 1.5, 0, 0.05, Math.PI - 0.05); S.x.stroke();
    S.x.strokeStyle = SV[4]; S.x.lineWidth = 3.6 * k; S.x.beginPath(); S.x.ellipse(cx, rimY - 2, RX - 3, RY - 1.5, 0, 0.1, Math.PI - 0.1); S.x.stroke();
    S.x.strokeStyle = '#FFFFFF'; S.x.globalAlpha = 0.9; S.x.lineWidth = 1.8 * k; S.x.beginPath(); S.x.ellipse(cx, rimY - 3, RX - 3, RY - 1.5, 0, 0.6, 1.8); S.x.stroke();
    S.x.globalAlpha = 0.6; S.x.strokeStyle = PAL.nacre[0]; S.x.lineWidth = 1.5 * k; S.x.beginPath(); S.x.ellipse(cx, rimY + 1, RX - 3, RY - 1, 0, 2.1, 2.8); S.x.stroke();
    S.x.restore();
    S.hx.save(); S.hx.strokeStyle = 'rgb(205,205,205)'; S.hx.lineWidth = 7 * k; S.hx.beginPath(); S.hx.ellipse(cx, rimY, RX - 3, RY - 1.5, 0, 0, TAU); S.hx.stroke(); S.hx.restore();
    for (let i = 1; i < 6; i++) { const a = (i / 6) * Math.PI; bead(S, cx + Math.cos(a) * (RX - 3), rimY + 12 + Math.sin(a) * (RY - 1), 4.4); }
    return { canvas: S.finish({ emboss: 0.45 }), px: cx, py: baseY + BY - 4, k: AKVAB_K / SET };
  }

  // ---------------------------------------------------------------- 3) z-ibrik: ince gümüş ibrik (56:18), lüleli ve kulplu
  const IBRIK_K = 3.33; // ekranda ≈ 102×180
  function paintIbrik() {
    const k = 2.5, w = 340, h = 620; const S = Paint.sprite(w, h, { seed: 7501, k }); const r = S.r;
    const cx = 150; const SV = PAL.silver;
    fillP(S, ellipsePath(cx + 10, 592, 92, 22), '#0C1620', { alpha: 0.36, height: false });
    const prof = [[104, 38], [112, 40], [118, 31], [150, 25], [190, 20], [228, 24], [250, 30], [262, 36], [300, 58], [350, 76], [410, 82], [460, 76], [500, 62], [520, 46], [530, 40], [540, 42], [560, 52], [578, 62]];
    const sp = crPts(prof.map(([y, hw]) => [hw, y]), 5).map(([hw, y]) => [y, hw]);
    const hwAt = (y) => { for (let i = 0; i < sp.length - 1; i++) if (y >= sp[i][0] && y <= sp[i + 1][0]) return lerp(sp[i][1], sp[i + 1][1], (y - sp[i][0]) / (sp[i + 1][0] - sp[i][0] || 1)); return 0; };
    const sil = []; for (const [y, hw] of sp) sil.push([cx - hw, y]);
    for (let i = 0; i <= 14; i++) { const a = Math.PI - (i / 14) * Math.PI; sil.push([cx + Math.cos(a) * 62, 578 + Math.sin(a) * 14]); }
    for (let i = sp.length - 1; i >= 0; i--) sil.push([cx + sp[i][1], sp[i][0]]);
    const body = poly(sil);
    const hdl = crPts([[cx - 24, 150], [cx - 62, 156], [cx - 98, 196], [cx - 106, 262], [cx - 96, 330], [cx - 70, 388], [cx - 60, 420]], 5);
    S.line(hdl, 20, SV[1], { w1: 16, rim: { w: 1.2, alpha: 0.7 }, edge: false });
    S.line(hdl.map(([x, y]) => [x - 2, y - 2]), 11, SV[3], { w1: 8, edge: false });
    S.line(hdl.map(([x, y]) => [x - 3, y - 3]), 2.6, SV[5], { w1: 2, edge: false });
    const spt = crPts([[cx + 58, 404], [cx + 96, 352], [cx + 128, 278], [cx + 150, 196], [cx + 166, 142], [cx + 176, 126]], 5);
    S.line(spt, 40, SV[1], { w1: 13, rim: { w: 1.2, alpha: 0.7 }, edge: false });
    S.line(spt.map(([x, y]) => [x - 4, y - 1]), 22, SV[3], { w1: 7, edge: false });
    S.line(spt.map(([x, y]) => [x - 5, y - 2]), 4, SV[5], { w1: 1.6, edge: false });
    fillP(S, ellipsePath(cx + 176, 126, 7, 4, -0.5), SV[0], { h: 120 });
    arcRim(S, cx, 420, 84, 160, { w: 1.4, span: 1.2, ang: 0.4 });
    S.region(body, {
      ramp: SV, shade: (x, y) => { const hw = hwAt(y) || 1; const u = clamp((x - cx) / hw, -1, 1); return clamp(0.62 - u * 0.32 - u * u * 0.32 + (u > -0.62 && u < -0.32 ? 0.3 : 0)); },
      dir: Math.PI / 2, dirJit: 0.12, len: [20, 40], wid: [6, 10], cover: 3, jitter: 2, noise: 0.04, bbox: [cx - 86, 100, cx + 86, 594], rim: false,
    });
    S.x.save(); S.hx.save(); S.x.clip(body); S.hx.clip(body);
    for (let i = 0; i < 24; i++) { const y = 330 + r() * 150; const hw = hwAt(y); const u = 0.15 + r() * 0.65; stroke(S, cx + u * hw, y, Math.PI / 2 + (r() - 0.5) * 0.2, 16 + r() * 10, 5, r() < 0.6 ? '#5C9C8A' : '#7FB6A2', { alpha: 0.45 }); }
    for (let i = 0; i < 8; i++) { const y = 140 + r() * 380; const hw = hwAt(y); stroke(S, cx + (r() - 0.5) * hw, y, Math.PI / 2, 18, 3, PAL.nacre[i % 4], { alpha: 0.35, height: false }); }
    S.x.restore(); S.hx.restore();
    // altın bantlar (seyrek inci)
    const band = (y0, y1, beads) => {
      const pts = []; const hw0 = hwAt(y0) + 2, hw1 = hwAt(y1) + 2;
      pts.push([cx - hw0, y0]); for (let i = 0; i <= 10; i++) { const a = Math.PI - (i / 10) * Math.PI; pts.push([cx + Math.cos(a) * hw0, y0 + Math.sin(a) * hw0 * 0.18]); }
      for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([cx + Math.cos(a) * hw1, y1 + Math.sin(a) * hw1 * 0.18]); }
      const p = poly(pts);
      S.region(p, { ramp: PAL.gold.slice(1), shade: (x) => clamp(0.72 - ((x - cx) / (hw0 + 1)) * 0.4 - Math.pow((x - cx) / (hw0 + 1), 2) * 0.3), dir: 0, len: [10, 18], wid: [3, 5], cover: 3, bbox: [cx - hw0 - 2, y0 - 2, cx + hw0 + 2, y1 + hw1 * 0.2 + 2], rim: false });
      if (beads) { const ym = (y0 + y1) / 2; const hw = (hw0 + hw1) / 2; for (let i = 1; i < beads; i++) { const a = Math.PI - (i / beads) * Math.PI; bead(S, cx + Math.cos(a) * hw * 0.94, ym + Math.sin(a) * hw * 0.18, 4); } }
    };
    band(104, 116, 4); band(246, 262, 4); band(404, 414, 0); band(520, 534, 0); band(566, 574, 0);
    const lid = new Path2D(); lid.moveTo(cx - 34, 106); lid.quadraticCurveTo(cx - 30, 74, cx, 70); lid.quadraticCurveTo(cx + 30, 74, cx + 34, 106); lid.closePath();
    S.region(lid, { ramp: SV.slice(1), shade: (x) => clamp(0.75 - (x - cx) / 60), dir: -0.3, len: [12, 20], wid: [4, 6], cover: 3, bbox: [cx - 36, 66, cx + 36, 108], rim: false });
    const kn = circ(cx, 58, 15);
    S.region(kn, { ramp: PAL.pearl.slice(1), shade: sph(cx - 5, 52, 18, 0.2), dir: (x, y) => Math.atan2(y - 58, x - cx) + Math.PI / 2, len: [8, 14], wid: [3, 5], cover: 3, bbox: [cx - 16, 42, cx + 16, 74], rim: false });
    stroke(S, cx - 5, 51, -0.7, 6, 3, PAL.nacre[0], { alpha: 0.8 }); stroke(S, cx + 6, 62, 0.8, 6, 2.4, PAL.nacre[1], { alpha: 0.7 });
    for (let y = 280; y < 500; y += 18) { const hw = hwAt(y); stroke(S, cx - hw * 0.46, y, Math.PI / 2 - 0.05, 22, 5, '#FFFFFF', { alpha: 0.8 }); }
    for (let y = 150; y < 240; y += 14) { const hw = hwAt(y); stroke(S, cx - hw * 0.45, y, Math.PI / 2, 14, 3, '#FFFFFF', { alpha: 0.75 }); }
    return { canvas: S.finish({ emboss: 0.5 }), px: cx, py: 592, k: IBRIK_K / SET };
  }

  // ---------------------------------------------------------------- 4) z-hali: perspektifte serili halı (zümrüt + altın, yakut vurgular; figürsüz)
  const HALI = { w: 900, h: 300, yF: 14, yN: 282, nearW: 840 }; // sprite satırları; dünya y = sprite y + 1180
  function paintHali() {
    const FW = 868, FH = 620; const F = Paint.sprite(FW, FH, { seed: 7601, k: 1 });
    const C = { em: '#10694A', em2: '#0B553C', emd: '#073E2D', emB: '#0A3A2E', ruby: '#A3193A', ruby2: '#7A1230', gold: '#DDA636', gold2: '#A9741E', goldL: '#EEC458', fr: '#C4B48E', fr2: '#A99A76' };
    const B = 84;
    // bordür zemini: koyu zümrüt
    F.region(rectPath(0, 0, FW, FH), { ramp: [shade(C.emB, -0.03), C.emB, shade(C.emB, 0.04)], shade: (x, y) => 0.5 + 0.3 * (NOISE(x * 0.02, y * 0.02) - 0.5), noise: 0.2, dir: 0, dirJit: 0.05, len: [40, 80], wid: [22, 32], cover: 2.2, bbox: [0, 0, FW, FH], rim: false });
    const ring = (inset, wdt, col) => { const p = new Path2D(); p.rect(inset, inset, FW - 2 * inset, FH - 2 * inset); p.rect(inset + wdt, inset + wdt, FW - 2 * (inset + wdt), FH - 2 * (inset + wdt)); F.x.save(); F.x.fillStyle = col; F.x.fill(p, 'evenodd'); F.x.restore(); F.hx.save(); F.hx.fillStyle = 'rgb(150,150,150)'; F.hx.fill(p, 'evenodd'); F.hx.restore(); };
    ring(10, 8, C.gold); ring(B - 20, 6, C.ruby); ring(B - 10, 9, C.gold);
    // alan: zümrüt
    const inner = rectPath(B, B, FW - 2 * B, FH - 2 * B);
    F.region(inner, { ramp: [C.emd, C.em2, C.em, shade(C.em, 0.05)], shade: (x, y) => 0.55 + 0.35 * (NOISE(x * 0.008 + 4, y * 0.008) - 0.5), noise: 0.14, dir: 0, dirJit: 0.05, len: [40, 80], wid: [22, 32], cover: 2.4, bbox: [B, B, FW - B, FH - B], rim: false });
    // alan kafesi: ince koyu-altın çaprazlar + düğümlerde küçük sekiz yapraklı altın rozet (eksene hizalı, düşük kontrast)
    F.x.save(); F.hx.save(); F.x.clip(inner); F.hx.clip(inner);
    const sp = 96;
    for (let d = -FH; d < FW + FH; d += sp) for (const sg of [1, -1]) {
      const pts = sg > 0 ? [[d, 0], [d + FH, FH]] : [[d, FH], [d + FH, 0]];
      for (let t = 0; t < 1; t += 0.06) { const x = lerp(pts[0][0], pts[1][0], t), y = lerp(pts[0][1], pts[1][1], t); stroke(F, x, y, Math.atan2(pts[1][1] - pts[0][1], pts[1][0] - pts[0][0]), 40, 5, C.gold2, { alpha: 0.42, dry: 0 }); }
    }
    for (let y = B - sp; y < FH; y += sp / 2) for (let x = B - sp; x < FW; x += sp) {
      const xx = x + ((Math.round((y - B) / (sp / 2)) % 2) ? sp / 2 : 0);
      fillP(F, rosette(xx, y, 17, 8, 0), C.gold2, { h: 165 });
      fillP(F, circ(xx, y, 5), C.ruby, { h: 180 });
    }
    F.x.restore(); F.hx.restore();
    // merkez madalyon: altın yıldız, yakut sekizgen yıldız, zümrüt göbek (fildişi yok)
    const mx = FW / 2, my = FH / 2;
    fillP(F, rosette(mx, my, 196, 12, 0), C.gold2, { h: 150 });
    fillP(F, rosette(mx, my, 174, 12, Math.PI / 12), C.emd, { h: 150 });
    F.region(star8(mx, my, 150, Math.PI / 8, 0.76), { ramp: [C.gold2, C.gold, C.goldL], shade: (x, y) => 0.5 + 0.4 * (NOISE(x * 0.03, y * 0.03) - 0.5), dir: 0, len: [24, 44], wid: [18, 26], cover: 2.4, bbox: [mx - 152, my - 152, mx + 152, my + 152], rim: false });
    fillP(F, star8(mx, my, 104, 0, 0.8), C.ruby, { h: 160 });
    fillP(F, rosette(mx, my, 66, 8, 0), C.gold, { h: 175 });
    fillP(F, circ(mx, my, 22), C.em, { h: 185 });
    for (const [qx, qy] of [[B, B], [FW - B, B], [B, FH - B], [FW - B, FH - B]]) {
      F.x.save(); F.hx.save(); F.x.clip(inner); F.hx.clip(inner);
      fillP(F, star8(qx, qy, 120, Math.PI / 8, 0.76), C.gold, { h: 160 });
      fillP(F, star8(qx, qy, 80, 0, 0.8), C.ruby, { h: 170 });
      fillP(F, circ(qx, qy, 30), C.em2, { h: 180 });
      F.x.restore(); F.hx.restore();
    }
    // bordür motifleri: altın yıldız (yakut göbek) + küçük altın baklava (yakut nokta)
    const motif = (x, y, i) => { if (i % 2) { fillP(F, star8(x, y, 24, Math.PI / 8, 0.72), C.gold, { h: 175 }); fillP(F, circ(x, y, 8), C.ruby, { h: 185 }); } else { fillP(F, lozenge(x, y, 12, 18), C.gold2, { h: 170 }); fillP(F, circ(x, y, 4.5), C.ruby, { h: 180 }); } };
    const mid = (10 + 8 + B - 20) / 2;
    let i = 0; for (let x = mid + 30; x < FW - mid - 10; x += 62, i++) { motif(x, mid, i); motif(x, FH - mid, i + 1); }
    i = 0; for (let y = mid + 62; y < FH - mid - 30; y += 62, i++) { motif(mid, y, i); motif(FW - mid, y, i + 1); }
    field(F, { bbox: [0, 0, FW, FH], ramp: ['#000000', '#FFFFFF'], shade: Paint.cst(0.5), dir: 0, dirJit: 0.02, len: [60, 120], wid: [6, 10], cover: 0.5, alpha: 0.05, height: true });

    // perspektife bük: satır satır (derinlik ∝ 1/(y - ufuk))
    const w = HALI.w, h = HALI.h; const S = Paint.sprite(w, h, { seed: 7602, k: 1 });
    const hz = CAM.hz - 1180; const yF = HALI.yF, yN = HALI.yN; const wAt = (y) => (HALI.nearW * (y - hz)) / (yN - hz);
    const dF = 1 / (yF - hz), dN = 1 / (yN - hz);
    const trap = poly([[w / 2 - wAt(yF) / 2, yF], [w / 2 + wAt(yF) / 2, yF], [w / 2 + wAt(yN) / 2, yN], [w / 2 - wAt(yN) / 2, yN]]);
    S.rim(trap, { w: 2.0, alpha: 0.75 });
    for (let y = yF; y < yN; y++) {
      const v0 = (1 / (y - hz) - dF) / (dN - dF), v1 = (1 / (y + 1 - hz) - dF) / (dN - dF);
      const ww = wAt(y + 0.5), x0 = w / 2 - ww / 2; const sy = v0 * FH, sh = Math.max(0.6, (v1 - v0) * FH);
      S.x.drawImage(F.c, 0, sy, FW, sh, x0, y, ww, 1.4);
      S.hx.drawImage(F.hc, 0, sy, FW, sh, x0, y, ww, 1.4);
    }
    // uzayan gölgenin serin lekeleri (yalnız gölge)
    dapple(S, [0, yF, w, yN], { n: 16, r: [70, 150], flat: 0.32, alpha: 0.2 });
    // saçaklar
    for (const [yy, len, n] of [[yN, 12, 70], [yF, 5, 46]]) {
      const ww = wAt(yy);
      for (let j = 0; j < n; j++) { const x = w / 2 - ww / 2 + ((j + 0.5) / n) * ww; const dx = (x - w / 2) * 0.03; stroke(S, x + dx * 0.5, yy + (yy === yN ? len / 2 : -len / 2), Math.PI / 2 + dx * 0.01, len, yy === yN ? 3.4 : 2.2, j % 2 ? C.fr : C.fr2, { dry: 0.5 }); }
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: w / 2, py: 150, k: 1 / SET };
  }

  // ---------------------------------------------------------------- 5) z-taht-sol / z-taht-sag: altın örgülü, yükseltilmiş, karşılıklı tahtlar
  const TH = { L: 1.14, D: 0.6, t: 0.075, leg: 0.21, seat: 0.43, mat: 0.08, arm: 0.63, back: 0.98, al: 0.5 };
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
  // brokar: yastık yüzeyine hizalı küçük baklavalar ve noktalar (çapraz / haç yok)
  function brocade(S, q, path, col, n, m) {
    S.x.save(); S.hx.save(); S.x.clip(path); S.hx.clip(path);
    const us = [(q[1][0] - q[0][0]) / n, (q[1][1] - q[0][1]) / n], vs = [(q[3][0] - q[0][0]) / m, (q[3][1] - q[0][1]) / m];
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const p = bil(q, (i + 0.5 + (j % 2) * 0.5) / n, (j + 0.5) / m);
      if ((i + j) % 2 === 0) {
        const a = 0.16, b = 0.26; const lz = poly([[p[0] - vs[0] * b, p[1] - vs[1] * b], [p[0] + us[0] * a, p[1] + us[1] * a], [p[0] + vs[0] * b, p[1] + vs[1] * b], [p[0] - us[0] * a, p[1] - us[1] * a]]);
        fillP(S, lz, col, { h: 170, alpha: 0.9 });
      } else fillP(S, circ(p[0], p[1], Math.max(1.6 * S.k, Math.hypot(us[0], us[1]) * 0.07)), col, { h: 170, alpha: 0.85 });
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
    const pearl = (p, rr) => bead(S, p[0], p[1], rr);
    // çerçeveli, örgülü pano: dış çerçeve dolgu + iç örgü + kenar pervazı + seyrek inci düğme
    const panel = (q, o) => {
      const path = poly(q); const ang = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
      S.region(path, { ramp: o.ramp, shade: Paint.cst(o.v), dir: ang, dirJit: 0.1, len: [14, 26], wid: [5, 9], cover: 2.6, noise: 0.08, bbox: bboxOf(q), rim: o.rim ?? false });
      const fs = o.frame ?? 0.12, ft = o.frameT ?? 0.18; const iq = [bil(q, fs, ft), bil(q, 1 - fs, ft), bil(q, 1 - fs, 1 - ft), bil(q, fs, 1 - ft)];
      const ip = poly(iq);
      fillP(S, ip, shade(o.ramp[1], -0.08), { h: 115 });
      const sl = Math.hypot(iq[1][0] - iq[0][0], iq[1][1] - iq[0][1]) / k, tl = Math.hypot(iq[3][0] - iq[0][0], iq[3][1] - iq[0][1]) / k;
      const nS = Math.max(2, Math.round(sl / 9)), nT = Math.max(2, Math.round(tl / 9));
      weave(S, iq, ip, nS, nT, o.wc, 0.36);
      // örgüye kakılmış seyrek yakut ve inci (mevdûne)
      for (let i = 2; i < nS - 1; i += 5) for (let j = 2; j < nT - 1; j += 5) { const p = bil(iq, i / nS, j / nT); const ruby = (i + j) % 2 === 0; fillP(S, circ(p[0], p[1], 1.9 * k), ruby ? PAL.ruby[3] : PAL.pearl[4], { h: 190 }); fillP(S, circ(p[0] - 0.5 * k, p[1] - 0.6 * k, 0.8 * k), ruby ? PAL.ruby[5] : '#FFFFFF', { height: false }); }
      S.x.save(); S.x.strokeStyle = o.ramp[o.ramp.length - 1]; S.x.globalAlpha = 0.85; S.x.lineWidth = 1.6 * k; S.x.stroke(ip); S.x.restore();
      if (o.studs) { const n = o.studs; for (let i = 0; i <= n; i++) { pearl(bil(q, lerp(fs * 0.5, 1 - fs * 0.5, i / n), ft * 0.5), 2.4 * k); } }
      return path;
    };
    // yükseltilmiş tahtın altındaki serin gölge (zeminde)
    fillP(S, pillowPath([Q(-0.03, -0.03, 0), Q(L + 0.03, -0.03, 0), Q(L + 0.03, D + 0.05, 0), Q(-0.03, D + 0.05, 0)], 0.04, 0.04), '#1F1D38', { alpha: 0.42, height: false });
    fillP(S, poly([Q(0.04, 0.04, 0), Q(L - 0.04, 0.04, 0), Q(L - 0.04, D - 0.04, 0), Q(0.04, D - 0.04, 0)]), '#17152C', { alpha: 0.35, height: false });
    // tornalı yüksek ayaklar
    for (const [u, v] of [[0.06, 0.06], [L - 0.06, D - 0.06], [0.06, D - 0.06], [L - 0.06, 0.06]]) {
      const a = Q(u, v, 0.005), b = Q(u, v, leg); const ww = pxu(u, v, leg / 2) * 0.05;
      const pts = crPts([a, lerp2(a, b, 0.45), b], 4);
      limb(S, pts, ww * 0.7, ww * 1.05, { rim: { w: 0.9, alpha: 0.7 }, top: false });
      for (const f of [0.35, 0.7]) { const m = lerp2(a, b, f); fillP(S, ellipsePath(m[0], m[1], ww * 0.75, ww * 0.25), G[4], { h: 190 }); }
      fillP(S, ellipsePath(a[0], a[1], ww * 0.55, ww * 0.2), G[2], { h: 170 });
    }
    // arkalık: iç yüz (kemerli taç), üst yüz, yakın uç yüzü
    const N = 16;
    const bin = []; for (let i = 0; i <= N; i++) { const u = t + ((L - 2 * t) * i) / N; bin.push(Q(u, t, seat)); } for (let i = N; i >= 0; i--) { const u = t + ((L - 2 * t) * i) / N; bin.push(Q(u, t, ytop(u))); }
    const bpath = poly(bin);
    const ua = Math.atan2(Q(L, t, seat)[1] - Q(0, t, seat)[1], Q(L, t, seat)[0] - Q(0, t, seat)[0]);
    S.region(bpath, { ramp: GC.slice(0, 5), shade: Paint.cst(0.42), dir: ua, len: [16, 28], wid: [6, 10], cover: 2.6, bbox: bboxOf(bin), rim: { w: 1.2, alpha: 0.75 } });
    const biq = [Q(t + 0.06, t, seat + 0.02), Q(L - t - 0.06, t, seat + 0.02), Q(L - t - 0.06, t, back - 0.06), Q(t + 0.06, t, back - 0.06)];
    fillP(S, poly(biq), shade(GC[1], -0.06), { h: 115 });
    weave(S, biq, poly(biq), 13, 7, wcS, 0.36);
    S.x.save(); S.x.strokeStyle = GC[4]; S.x.globalAlpha = 0.8; S.x.lineWidth = 1.5 * k; S.x.stroke(poly(biq)); S.x.restore();
    // taç rayı (altın; seyrek inci)
    const crest = []; for (let i = 0; i <= N; i++) { const u = (L * i) / N; crest.push(Q(u, t * 0.6, ytop(u) - 0.005)); }
    limb(S, crest, pxu(L / 2, t, back) * 0.05, pxu(L / 2, t, back) * 0.05);
    const btop = []; for (let i = 0; i <= N; i++) { const u = (L * i) / N; btop.push(Q(u, 0, ytop(u) + 0.014)); } for (let i = N; i >= 0; i--) { const u = (L * i) / N; btop.push(Q(u, t, ytop(u) + 0.01)); }
    S.region(poly(btop), { ramp: G.slice(2), shade: Paint.cst(0.62), dir: ua, len: [16, 30], wid: [4, 7], cover: 2.6, bbox: bboxOf(btop), rim: false });
    for (const u of [L * 0.18, L * 0.5, L * 0.82]) pearl(Q(u, t * 0.5, ytop(u) + 0.016), 3.4 * k);
    // uzak kolçak
    panel([Q(L - t, D, seat), Q(L - t, 0, seat), Q(L - t, 0, arm), Q(L - t, D, arm)], { ramp: GC.slice(0, 5), v: 0.42, wc: wcS, frame: 0.1, frameT: 0.16, rim: { w: 1.0, alpha: 0.7 } });
    face(S, [Q(L - t, 0, arm), Q(L, 0, arm), Q(L, D, arm), Q(L - t, D, arm)], { ramp: G.slice(2), v: 0.62 });
    // gövde ön yüzü: çerçeveli örgü pano, ortada yakut
    const fq = [Q(0, D, leg), Q(L, D, leg), Q(L, D, seat), Q(0, D, seat)];
    panel(fq, { ramp: G.slice(0, 5), v: 0.5, wc: wcF, frame: 0.06, frameT: 0.22, studs: 4, rim: { w: 1.4, alpha: 0.8 } });
    { const p = bil(fq, 0.5, 0.5); fillP(S, circ(p[0], p[1], 6.4 * k), G[4], { h: 190 }); fillP(S, circ(p[0], p[1], 4.4 * k), PAL.ruby[2], { h: 200 }); fillP(S, circ(p[0] - 1.4 * k, p[1] - 1.5 * k, 1.6 * k), PAL.ruby[5], { height: false }); }
    face(S, [Q(L - t, D, leg), Q(L, D, leg), Q(L, D, arm), Q(L - t, D, arm)], { ramp: G.slice(1, 5), v: 0.55 });
    // ipek şilte (sündüs): üst ve ön yüz, altın şerit ve püsküller
    const mt = [Q(t, t, sm), Q(L - t, t, sm), Q(L - t, D + 0.01, sm), Q(t, D + 0.01, sm)];
    const ma = Math.atan2(mt[1][1] - mt[0][1], mt[1][0] - mt[0][0]);
    S.region(pillowPath(mt, 0.02, 0.02), { ramp: PAL.silk.slice(1), shade: (x, y) => clamp(0.48 + 0.12 * Math.sin((x * 0.05) / k + (y * 0.02) / k) + 0.22 * ((y - mt[0][1]) / (mt[3][1] - mt[0][1] + 1))), dir: ma, dirJit: 0.08, len: [26, 50], wid: [7, 11], cover: 2.8, bbox: bboxOf(mt, 8), rim: { w: 1.2, alpha: 0.75 } });
    const mf = [Q(t, D + 0.012, seat), Q(L - t, D + 0.012, seat), Q(L - t, D + 0.012, sm), Q(t, D + 0.012, sm)];
    S.region(pillowPath(mf, 0.03, 0.03), { ramp: PAL.silk.slice(0, 5), shade: Paint.cst(0.5), dir: ma, dirJit: 0.06, len: [26, 50], wid: [5, 8], cover: 2.8, bbox: bboxOf(mf, 6), rim: false, noise: 0.25 });
    S.line([Q(t, D + 0.014, sm), Q(L - t, D + 0.014, sm)], 3.2 * k, G[4], { edge: false });
    for (let i = 0; i <= 22; i++) { const u = t + ((L - 2 * t) * i) / 22; const p = Q(u, D + 0.016, seat - 0.004); stroke(S, p[0], p[1] + 5 * k, Math.PI / 2, 9, 2.4, i % 2 ? G[4] : G[3], { dry: 0.6 }); }
    for (let i = 0; i < 10; i++) { const p = bil(mt, 0.08 + r() * 0.75, 0.25 + r() * 0.6); stroke(S, p[0], p[1], ma, 30 + r() * 30, 3.5, PAL.silk[5], { alpha: 0.6 }); }
    // dizili yastıklar (nemârik)
    const nP = 4; const pw = (L - 2 * t - 0.04) / nP;
    const pals = [[PAL.silk.slice(1, 6), G[4]], [PAL.ruby.slice(0, 5), G[4]], [['#9C8A66', '#BFAE86', '#DACCA6', '#EEE3C6', '#FBF4E2'], G[2]], [PAL.silk.slice(1, 6), G[4]]];
    for (let i = nP - 1; i >= 0; i--) {
      const u0 = t + 0.02 + i * pw + 0.012, u1 = u0 + pw - 0.024; const lean = (r() - 0.5) * 0.02;
      const pq = [Q(u0 + lean, t + 0.04, sm + 0.31), Q(u1 + lean, t + 0.04, sm + 0.31), Q(u1, t + 0.17, sm), Q(u0, t + 0.17, sm)];
      const pp = pillowPath(pq, 0.13, 0.07);
      const c = [(pq[0][0] + pq[2][0]) / 2, (pq[0][1] + pq[2][1]) / 2]; const R = Math.hypot(pq[2][0] - pq[0][0], pq[2][1] - pq[0][1]) * 0.55;
      const [pr, dot] = pals[(i + (side > 0 ? 1 : 0)) % pals.length];
      S.region(pp, { ramp: pr, shade: sph(c[0] - R * 0.25, c[1] - R * 0.3, R * 1.1, 0.12), dir: (x, y) => Math.atan2(y - c[1], x - c[0]) + Math.PI / 2 + (r() - 0.5) * 0.4, len: [12, 22], wid: [6, 9], cover: 2.8, bbox: bboxOf(pq, 12), rim: { w: 1.1, alpha: 0.7 } });
      brocade(S, pq, pp, dot, 3, 4);
      S.x.save(); S.x.clip(pp); S.x.strokeStyle = dot; S.x.globalAlpha = 0.55; S.x.lineWidth = 1.6 * k; S.x.stroke(pillowPath(pq.map((q) => lerp2(q, c, 0.1)), 0.13, 0.07)); S.x.restore();
      for (const cq of [pq[0], pq[1]]) stroke(S, cq[0], cq[1] + 3 * k, Math.PI / 2 + (r() - 0.5) * 0.3, 10, 3.2, G[4]);
    }
    // yakın kolçak
    face(S, [Q(0, 0, arm), Q(0, t, arm), Q(0, t, ytop(0)), Q(0, 0, ytop(0))], { ramp: GC.slice(1, 5), v: 0.5, rim: { w: 1.0, alpha: 0.7 } });
    const eq = [Q(0, D, leg), Q(0, 0, leg), Q(0, 0, arm), Q(0, D, arm)];
    panel(eq, { ramp: G.slice(0, 5), v: 0.44, wc: wcF, frame: 0.1, frameT: 0.1, studs: 3, rim: { w: 1.4, alpha: 0.8 } });
    { const p = bil(eq, 0.5, 0.5); fillP(S, star8(p[0], p[1], 7.2 * k, Math.PI / 8, 0.78), G[3], { h: 190 }); fillP(S, circ(p[0], p[1], 4 * k), PAL.ruby[2], { h: 200 }); fillP(S, circ(p[0] - 1.2 * k, p[1] - 1.3 * k, 1.5 * k), PAL.ruby[5], { height: false }); }
    face(S, [Q(0, D, leg), Q(t, D, leg), Q(t, D, arm), Q(0, D, arm)], { ramp: G.slice(1, 5), v: 0.6 });
    face(S, [Q(0, 0, arm), Q(t, 0, arm), Q(t, D, arm), Q(0, D, arm)], { ramp: G.slice(2), v: 0.66, rim: { w: 1.0, alpha: 0.7 } });
    limb(S, crPts([Q(t * 0.5, D + 0.01, arm + 0.012), Q(t * 0.5, D * 0.5, arm + 0.016), Q(t * 0.5, -0.005, arm + 0.012)], 5), pxu(0, D / 2, arm) * 0.045, pxu(0, D / 2, arm) * 0.04, { rim: { w: 0.9, alpha: 0.7 } });
    for (const pt of [Q(0, D, arm + 0.012), Q(L, D, arm + 0.012)]) pearl(pt, 4 * k);
    // tacın uzayan serin gölgesi: şilte, yastık ve arkalıkta yumuşak lekeler (ışık lekesi yok)
    return { canvas: S.finish({ emboss: 0.5 }), px: (cxW - ox) * k, py: (1180 - oy) * k, k: k / SET };
  }

  // ---------------------------------------------------------------- 6) z-platform: inci-krem köşk zemini, ince direkli yükseltilmiş teras, altından akan berrak ırmak
  // Kemer / kanal / set yok: zemin levhası az sayıda ince altın direğe oturur; su levhanın altında gölgede geriye uzanır,
  // önde yüzeyde akar ve yakın kıyıda düzensiz çimen + inci çakılla biter.
  const PLAT = { top: 1100, y: 1260, frontY: 1572, edgeY: 1589, slabY: 1605, waterY: 1700, bottom: 2040,
    posts: [60, 410, 690, 1024], notch: [[-10, 78], [1002, 1090]], notchY: 1160 };
  const bankTop = (wx) => { const l = clamp((250 - wx) / 360), rr = clamp((wx - 840) / 360); return 1846 - 80 * Math.pow(l, 1.3) - 70 * Math.pow(rr, 1.2) + 9 * Math.sin(wx * 0.021 + 0.7) + 5 * Math.sin(wx * 0.047 + 2.0) + 8 * (NOISE(wx * 0.008, 6.1) - 0.5); };
  function streamPath() {
    const p = new Path2D(); p.moveTo(-120, PLAT.slabY + 2); p.lineTo(1200, PLAT.slabY + 2);
    for (let x = 1200; x >= -120; x -= 20) p.lineTo(x, bankTop(x) + 2);
    p.closePath();
    // direkler sudan çıkarılır (ters yönlü dikdörtgen: nonzero dolguda delik)
    for (const px of PLAT.posts) { const x0 = px - 8, x1 = px + 8, y0 = PLAT.slabY, y1 = PLAT.waterY + 4; p.moveTo(x0, y0); p.lineTo(x0, y1); p.lineTo(x1, y1); p.lineTo(x1, y0); p.closePath(); }
    return p;
  }
  function paintPlatform() {
    const w = 1320, h = PLAT.bottom - PLAT.top, k = 1; const S = Paint.sprite(w, h, { seed: 7701, k }); const r = S.r;
    const X = (x) => x + 120, Y = (y) => y - PLAT.top;
    const yFront = Y(PLAT.frontY);
    // --- zemin (çentikli: sütun ayakları önde kalsın)
    const [n1, n2] = PLAT.notch; const nY = Y(PLAT.notchY);
    const floor = poly([[0, 0], [X(n1[0]), 0], [X(n1[0]), nY], [X(n1[1]), nY], [X(n1[1]), 0], [X(n2[0]), 0], [X(n2[0]), nY], [X(n2[1]), nY], [X(n2[1]), 0], [w, 0], [w, yFront], [0, yFront]]);
    // sıcak inci-krem; ziyafetin çevresi açık, kenarlar ve ön serin-koyu; tacın uzayan gölgesi lekeler halinde (yalnız gölge)
    const fShade = (x, y) => { const wy = y + PLAT.top, wx = x - 120;
      let v = 0.8 - 0.36 * Math.pow(Math.min(1, Math.abs(wx - 540) / 620), 1.5) - 0.34 * clamp((wy - 1240) / 320);
      v -= 0.12 * clamp((1180 - wy) / 80);
      const d = NOISE.fbm(wx * 0.006 + 2, wy * 0.013, 3); v -= 0.2 * smooth(clamp((d - 0.5) / 0.1));
      for (const tx of [215, 865]) v -= 0.2 * Math.exp(-Math.pow((wx - tx) / 230, 2) - Math.pow((wy - 1190) / 46, 2));
      return clamp(v); };
    const FL = ['#6A5660', '#846C70', '#9E8580', '#B69E92', '#CAB4A4', '#DDC8B6', '#EEDAC8'];
    S.region(floor, { ramp: FL, shade: fShade, dir: 0, dirJit: 0.22, len: [30, 110], wid: [9, 15], cover: 2.6, jitter: 10, noise: 0.04, broken: 0.07, bbox: [0, 0, w, yFront], rim: false, max: 9000 });
    // sedef basamakları: şeftali, nane, lavanta (seyrek, uzun, yakına doğru büyür)
    field(S, { bbox: [0, 4, w, yFront - 4], path: floor, ramp: ['#E2C2AE', '#C2DACB', '#D2C6DA'], shade: () => S.r(), dir: 0, dirJit: 0.15, len: [40, 90], wid: [6, 10], cover: 0.3, alpha: 0.34, size: (x, y) => 0.6 + 0.8 * (y / yFront), height: false });
    // döşeme: perspektif ızgara, ince altın kakma derzler (düşük kontrast)
    const depth = (y) => CAM.f / (y + PLAT.top - CAM.hz);
    S.x.save(); S.hx.save(); S.x.clip(floor); S.hx.clip(floor);
    const Zf = depth(yFront), Zb = depth(0);
    const rowsZ = []; for (let Z = Zf; Z < Zb + 0.5; Z += 0.48) rowsZ.push(Z);
    const colsX = []; for (let Xu = -3.36; Xu <= 3.4; Xu += 0.56) colsX.push(Xu);
    for (const Z of rowsZ) { const y = CAM.hz + CAM.f / Z - PLAT.top; const wd = clamp((CAM.f / Z) / 280, 0.45, 2.2);
      for (let x = 0; x < w; x += 70) stroke(S, x + 35, y, (r() - 0.5) * 0.01, 72, 2 * wd, '#8E6A2C', { alpha: 0.42, dry: 0.3 });
      for (let x = 0; x < w; x += 90) stroke(S, x + 45, y - 1.1 * wd, 0, 70, 0.8 * wd, '#E2BC62', { alpha: 0.35, dry: 0.3 }); }
    for (const Xu of colsX) { const a = [X(540 + Xu * (PLAT.top - CAM.hz)), 0], b = [X(540 + Xu * (PLAT.frontY - CAM.hz)), yFront]; const n = 12;
      for (let i = 0; i < n; i++) { const p = lerp2(a, b, (i + 0.5) / n); const wd = clamp(((p[1] + PLAT.top - CAM.hz) / 280), 0.45, 2.2); stroke(S, p[0], p[1], Math.atan2(b[1] - a[1], b[0] - a[0]), Math.hypot(b[0] - a[0], b[1] - a[1]) / n + 6, 1.8 * wd, '#8E6A2C', { alpha: 0.38, dry: 0.3 }); } }
    S.x.restore(); S.hx.restore();
    // tahtların altına serili yolluklar (zerâbiyy mebsûse): zümrüt zemin, altın kenar, yakut şerit
    const P0 = throneProj();
    for (const sd of [-1, 1]) {
      const Wq = (u, v) => { const p = P0(u, v, 0); const x = sd > 0 ? 1080 - p[0] : p[0]; return [X(x), Y(p[1])]; };
      const q = [Wq(-0.14, -0.1), Wq(TH.L + 0.14, -0.1), Wq(TH.L + 0.14, TH.D + 0.34), Wq(-0.14, TH.D + 0.34)];
      const ua = Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]);
      S.rim(poly(q), { w: 1.6, alpha: 0.7 });
      S.region(poly(q), { ramp: ['#073E2D', '#0B553C', '#10694A', '#178056'], shade: (x, y) => clamp(0.45 + 0.3 * (NOISE(x * 0.02, y * 0.02) - 0.5)), dir: ua, dirJit: 0.05, len: [30, 60], wid: [10, 16], cover: 2.4, bbox: bboxOf(q), rim: false });
      for (const [ins, col, wd] of [[0.035, '#DDA636', 4], [0.1, '#A3193A', 3], [0.14, '#C99A34', 2]]) {
        const iq = [bil(q, ins, ins * 1.6), bil(q, 1 - ins, ins * 1.6), bil(q, 1 - ins, 1 - ins * 1.6), bil(q, ins, 1 - ins * 1.6)];
        S.x.save(); S.x.strokeStyle = col; S.x.globalAlpha = 0.9; S.x.lineWidth = wd; S.x.lineJoin = 'round'; S.x.stroke(poly(iq)); S.x.restore();
      }
      for (let i = 1; i < 9; i++) { const p = bil(q, i / 9, 0.82); fillP(S, lozenge(p[0], p[1], 6, 4), '#DDA636', { h: 170 }); }
      for (let i = 0; i < 40; i++) { const p = bil(q, (i + 0.5) / 40, 1); stroke(S, p[0], p[1] + 4, Math.PI / 2, 8, 2.2, i % 2 ? '#C4B48E' : '#A99A76', { dry: 0.5 }); }
    }
    // arka kenar: ince altın çizgi
    S.line([[0, 2], [X(n1[0]), 2]], 4, PAL.goldC[3], { edge: false }); S.line([[X(n1[1]), 2], [X(n2[0]), 2]], 4, PAL.goldC[3], { edge: false }); S.line([[X(n2[1]), 2], [w, 2]], 4, PAL.goldC[3], { edge: false });
    // --- ön kenar: altın şerit (seyrek inci)
    const eY0 = yFront, eY1 = Y(PLAT.edgeY);
    S.rim(rectPath(0, eY0, w, eY1 - eY0), { w: 1.4, alpha: 0.75 });
    S.region(rectPath(0, eY0, w, eY1 - eY0), { ramp: PAL.gold.slice(1), shade: (x, y) => 0.72 - 0.42 * ((y - eY0) / (eY1 - eY0)) + 0.1 * (NOISE(x * 0.02, 1) - 0.5), dir: 0, dirJit: 0.03, len: [40, 70], wid: [7, 10], cover: 3, bbox: [0, eY0, w, eY1], rim: false });
    for (let x = 40; x < w; x += 92) bead(S, x, (eY0 + eY1) / 2, 4.2);
    // levha alnı (inci krem) + altında ince altın lento çizgisi
    const sY0 = eY1, sY1 = Y(PLAT.slabY);
    S.region(rectPath(0, sY0, w, sY1 - sY0), { ramp: ['#9A8C98', '#B4A5AC', '#CBBAB8', '#DCCBC2'], shade: (x, y) => clamp(0.55 + 0.25 * (NOISE(x * 0.01, 3) - 0.5) - 0.25 * ((y - sY0) / (sY1 - sY0))), dir: 0, dirJit: 0.04, len: [40, 80], wid: [7, 10], cover: 2.6, bbox: [0, sY0, w, sY1], rim: false });
    S.line([[0, sY1 - 1], [w, sY1 - 1]], 3.4, PAL.goldC[2], { edge: false });
    // --- levhanın altı: gölgede geriye uzanan su (lacivert değil, orta teal), altın yansımalar, direkler arası pırıltı
    const gY0 = sY1, gY1 = Y(PLAT.waterY);
    S.region(rectPath(0, gY0, w, gY1 - gY0 + 3), { ramp: ['#2A6670', '#34747D', '#41848B', '#52969A', '#67A9AA', '#7EBAB6'], shade: (x, y) => clamp(0.06 + 0.9 * Math.pow(clamp((y - gY0) / (gY1 - gY0)), 1.3) + 0.1 * (NOISE(x * 0.01, y * 0.05) - 0.5)), dir: 0, dirJit: 0.03, len: [50, 110], wid: [6, 10], cover: 2.6, bbox: [0, gY0, w, gY1 + 3], rim: false });
    for (let i = 0; i < 70; i++) { const y = gY0 + 6 + Math.pow(r(), 0.8) * (gY1 - gY0 - 8); stroke(S, r() * w, y, 0, 30 + r() * 50, 2 + r() * 1.5, r() < 0.5 ? '#86B9B6' : '#9C8F7C', { alpha: 0.28 }); }
    for (let i = 0; i < 46; i++) { const y = gY1 - 4 - r() * 18; const x = r() * w; if (PLAT.posts.some((p) => Math.abs(X(p) - x) < 22)) continue; stroke(S, x, y, 0, 14 + r() * 18, 2.2, '#D9F3EE', { alpha: 0.55 }); }
    // ince altın direkler (inci tabanlı); yansımaları önde
    for (const pw of PLAT.posts) {
      const x = X(pw), wd = 14;
      S.rim(rectPath(x - wd / 2, gY0, wd, gY1 - gY0), { w: 1.2, alpha: 0.75 });
      limb(S, [[x, gY0], [x, gY1 + 2]], wd, wd * 0.9, { rim: false, top: false });
      fillP(S, rectPath(x - wd, gY0, wd * 2, 5), PAL.gold[3], { h: 180 });
      fillP(S, ellipsePath(x, gY1, wd * 0.95, 4), PAL.pearl[3], { h: 185 }); fillP(S, ellipsePath(x - 2, gY1 - 1.4, wd * 0.4, 1.6), '#FFFFFF', { height: false, alpha: 0.7 });
    }
    // --- ön ırmak: berrak turkuaz-beyaz, sakin; dipte inci (çok), yakut (az, küçük) ve altın çakıllar
    const wY = gY1; const water = rectPath(0, wY, w, h - wY);
    const bankY = (x) => Y(bankTop(x - 120));
    const wT = (x, y) => clamp((y - wY) / Math.max(40, bankY(x) - wY));
    S.region(water, { ramp: ['#3B8F9F', '#4FA2AF', '#68B6BE', '#86C8CA', '#A6D9D5', '#C4E7E0'], shade: (x, y) => clamp(0.16 + 0.72 * Math.pow(wT(x, y), 0.8) + 0.08 * (NOISE(x * 0.01, y * 0.03) - 0.5)), dir: 0, dirJit: 0.03, len: [70, 140], wid: [8, 13], cover: 2.4, jitter: 6, bbox: [0, wY, w, h], rim: false });
    S.x.save(); S.hx.save(); S.x.clip(water); S.hx.clip(water);
    field(S, { bbox: [0, wY + 40, w, h], ramp: ['#A5D2C2', '#BBDCC6', '#CDE4CC'], shade: (x, y) => NOISE(x * 0.01, y * 0.02), dir: 0, dirJit: 0.3, len: [30, 60], wid: [12, 20], cover: 0.5, alpha: 0.3, mask: (x, y) => NOISE(x * 0.006 + 5, y * 0.01) > 0.52 });
    // levha kenarının ve direklerin kırık yansıması
    for (let i = 0; i < 60; i++) { const x = r() * w; const y = wY + 3 + Math.pow(r(), 1.5) * 26; stroke(S, x, y, 0, 24 + r() * 30, 3 + r() * 2, r() < 0.6 ? '#C9A24A' : '#B9C3C6', { alpha: 0.32 * (1 - (y - wY) / 32) }); }
    for (const pw of PLAT.posts) { const x = X(pw); for (let j = 0; j < 7; j++) { const y = wY + 6 + j * 9; stroke(S, x + Math.sin(j * 1.7) * 4, y, 0, 18 - j * 1.5, 4, '#C9A24A', { alpha: 0.42 - j * 0.05 }); } }
    // dip çakılları: kümeler halinde, yakına doğru büyür
    const peb = [];
    for (let i = 0; i < 700 && peb.length < 54; i++) { const x = r() * w; const y = wY + 40 + Math.pow(r(), 0.8) * (bankY(x) - wY - 50); if (NOISE(x * 0.009 + 11, y * 0.02 + 3) < 0.53) continue; peb.push([x, y]); }
    peb.sort((a, b) => a[1] - b[1]);
    for (const [x, y] of peb) {
      const t = r(); const ruby = t > 0.9, gold = t > 0.8 && !ruby; const sc = (0.55 + 1.0 * wT(x, y)) * (ruby ? 0.7 : 1); const rx = (8 + r() * 8) * sc, ry = rx * (0.5 + r() * 0.14); const rot = (r() - 0.5) * 0.5;
      const pal = (ruby ? ['#6A2A3C', '#8F3F52', '#B05A68', '#C9858A'] : gold ? ['#8E7032', '#B4944A', '#D2B970', '#E9DAA4'] : (r() < 0.5 ? ['#9FA2B8', '#C4C6D6', '#E2E3EA', '#F8F8FA'] : ['#ABA6B0', '#CEC8CE', '#EAE4E6', '#FBF7F6'])).map((c) => mix(c, '#7CC3C6', ruby ? 0.4 : 0.32));
      fillP(S, ellipsePath(x, y, rx, ry, rot), pal[1], { h: 150 });
      S.x.save(); S.hx.save(); const ep = ellipsePath(x, y, rx, ry, rot); S.x.clip(ep); S.hx.clip(ep);
      stroke(S, x + rx * 0.2, y + ry * 0.45, rot, rx * 1.4, Math.max(1.5, ry * 0.7), pal[0], { alpha: 0.6 });
      stroke(S, x - rx * 0.15, y - ry * 0.25, rot, rx * 1.2, Math.max(1.5, ry * 0.7), pal[2], { alpha: 0.85 });
      stroke(S, x - rx * 0.35, y - ry * 0.45, rot - 0.2, rx * 0.6, Math.max(1.2, ry * 0.35), pal[3], { alpha: 0.85 });
      S.x.restore(); S.hx.restore();
    }
    // su örtüsü: çakılları suyun ALTINA alır (yarı saydam akış darbeleri çakılların üstünden geçer)
    field(S, { bbox: [-40, wY, w + 40, h], ramp: ['#3E9BB0', '#5FB6C2', '#87CDD1', '#B3E3DF', '#DDF6F1'], shade: (x, y) => clamp(0.25 + 0.6 * wT(x, y) + 0.15 * (NOISE(x * 0.008, y * 0.02) - 0.5)), dir: 0, dirJit: 0.04, len: [70, 150], wid: [7, 12], cover: 2.2, alpha: 0.46, size: (x, y) => 0.7 + 0.6 * wT(x, y), height: false });
    for (let i = 0; i < 90; i++) { const x = r() * w; const y = wY + 12 + r() * (bankY(x) - wY - 12); const sc = 0.6 + 0.8 * wT(x, y); stroke(S, x, y, (r() - 0.5) * 0.04, (30 + r() * 50) * sc, (2 + r() * 1.4) * sc, r() < 0.6 ? '#EAFBF6' : '#C4EEE9', { alpha: 0.55, height: false }); }
    S.x.restore(); S.hx.restore();
    // --- yakın kıyı: düzensiz çimen kenarı, kıyıda inci çakıl kümeleri, birkaç yakut taş (set / duvar yok)
    const bpts = []; for (let x = 0; x <= w; x += 10) bpts.push([x, bankY(x)]);
    const bank = poly([...bpts, [w, h], [0, h]]);
    for (const [x, y] of bpts) if (r() < 0.5) stroke(S, x, y - 2, (r() - 0.5) * 0.1, 16 + r() * 16, 2.2, '#D6F1EA', { alpha: 0.6, height: false });
    S.region(bank, { ramp: ['#0C4230', '#12563A', '#1A6A43', '#26804E', '#3C955A', '#5AAA68'], shade: (x, y) => clamp(0.72 - 0.9 * ((y - bankY(x)) / 140) + 0.18 * (NOISE(x * 0.02, y * 0.03) - 0.5)), dir: (x, y) => (NOISE(x * 0.03, y * 0.03) - 0.5) * 1.2, len: [18, 34], wid: [7, 11], cover: 2.6, bbox: [0, Y(1740), w, h], rim: { w: 1.4, alpha: 0.6 } });
    for (let i = 0; i < 60; i++) { const x = r() * w; const y = bankY(x) + 10 + r() * 14; stroke(S, x, y, (r() - 0.5) * 0.5, 16 + r() * 14, 4, r() < 0.5 ? '#5AAA68' : '#3C955A'); }
    const groups = [[300, 0.8], [470, 0.6], [640, 0.75], [760, 0.6], [930, 0.8], [1110, 0.6]];
    for (const [gx, gs] of groups) {
      const n = 3 + Math.floor(r() * 3);
      for (let j = 0; j < n; j++) {
        const x = gx + (r() - 0.5) * 70 * gs, y = bankY(x) + 3 + r() * 12; const rr = (6 + r() * 7) * gs; const rub = r() < 0.15;
        fillP(S, ellipsePath(x + 2, y + 3, rr * 1.05, rr * 0.5), '#0C3324', { alpha: 0.45, height: false });
        S.region(ellipsePath(x, y, rr, rr * 0.72), { ramp: rub ? PAL.ruby.slice(1, 5) : PAL.pearl.slice(1), shade: sph(x - rr * 0.3, y - rr * 0.4, rr * 1.2, 0.18), dir: (px, py) => Math.atan2(py - y, px - x) + Math.PI / 2, len: [rr * 0.6, rr * 1.1], wid: [Math.max(2, rr * 0.3), Math.max(3, rr * 0.5)], cover: 3, bbox: [x - rr - 1, y - rr - 1, x + rr + 1, y + rr + 1], rim: false });
        stroke(S, x - rr * 0.3, y - rr * 0.3, -0.6, rr * 0.7, Math.max(1.5, rr * 0.25), rub ? PAL.ruby[5] : '#FFFFFF', { alpha: 0.8 });
      }
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: PLAT.y - PLAT.top, k: 1 };
  }

  // ---------------------------------------------------------------- 7) z-kosk: üst kat (inci pencereler), altın-gümüş tuğla kuşak, kemer ve ince sütunlar; saydam orta
  const ARCH = { cx: 540, cy: 470, ai: 478, bi: 250, ae: 534, be: 290 };
  const COLS = { cx: [34, 1046], R: 27, capY: 438, springY: 470, baseY: 1120, footY: 1160 };
  const UPPER = { c0: 142, c1: 178, sill: 132, apex: 50, ww: 50, xs: [-60, 90, 240, 390, 540, 690, 840, 990, 1140] };
  // tuğla tonları: serin gölgede altın ve gümüş, yakın değerde (desen ölçülü kalsın)
  const BR = { gold: ['#563614', '#7A521E', '#9F702A', '#BE8E3A', '#D6AA54'], silver: ['#48495A', '#626578', '#7D8195', '#989CAF', '#B3B7C7'] };
  function paintKosk() {
    const w = 1320, h = 1920, k = 1; const S = Paint.sprite(w, h, { seed: 7801, k }); const r = S.r;
    const X = (x) => x + 120, Y = (y) => y + 120;
    const acx = X(ARCH.cx), acy = Y(ARCH.cy);
    const E = (th, t) => [acx + lerp(ARCH.ai, ARCH.ae, t) * Math.cos(th), acy - lerp(ARCH.bi, ARCH.be, t) * Math.sin(th)];
    // --- duvar (üst kat + köşe dolguları): sıcak, orta değerde inci-şeftali, yatay darbeler; serin gölge lekeleri
    const sp = [[0, 0], [w, 0], [w, acy]];
    for (let i = 0; i <= 60; i++) sp.push(E((i / 60) * Math.PI, 1));
    sp.push([0, acy]);
    const wall = poly(sp);
    const WL = ['#5A4856', '#6E5A66', '#846E76', '#998285', '#AC9592', '#BDA59E'];
    const wShade = (x, y) => { let v = 0.58 + 0.1 * clamp((y - 140) / 400) - 0.22 * clamp(Math.abs(x - acx) / 720); v -= 0.22 * smooth(clamp((NOISE.fbm(x * 0.006, y * 0.008, 3) - 0.48) / 0.12)); return clamp(v); };
    S.region(wall, { ramp: WL, shade: wShade, dir: 0, dirJit: 0.06, len: [40, 90], wid: [10, 16], cover: 2.4, jitter: 6, noise: 0.04, bbox: [0, 0, w, acy], rim: false, max: 5000 });
    // üst kat: kemerli yarı saydam inci pencereler (içi dışından görünen odalar; içten ılık, kaynak değil)
    for (const wx of UPPER.xs) {
      const x = X(wx), hw = UPPER.ww / 2, x0 = x - hw, x1 = x + hw; const yA = Y(UPPER.apex), yC = yA + hw, yS = Y(UPPER.sill);
      const arcP = (pad, ext) => { const p = new Path2D(); p.moveTo(x0 - pad, yS + ext); p.lineTo(x0 - pad, yC); p.arc(x, yC, hw + pad, Math.PI, TAU); p.lineTo(x1 + pad, yS + ext); p.closePath(); return p; };
      S.rim(arcP(7, 0), { w: 1.2, alpha: 0.6 });
      fillP(S, arcP(7, 0), BR.gold[2], { h: 160 });
      S.x.save(); S.x.strokeStyle = BR.gold[4]; S.x.globalAlpha = 0.55; S.x.lineWidth = 1.6; S.x.stroke(arcP(5, 0)); S.x.restore();
      const win = arcP(0, 0);
      S.region(win, { ramp: ['#8C7F92', '#A093A4', '#B3A6B3', '#C4B7BF'], shade: (px, py) => clamp(0.3 + 0.5 * ((py - yA) / (yS - yA)) + 0.15 * (NOISE(px * 0.05, py * 0.03) - 0.5)), dir: Math.PI / 2, dirJit: 0.1, len: [20, 36], wid: [7, 11], cover: 2.6, bbox: [x0, yA, x1, yS], rim: false });
      field(S, { bbox: [x0 + 8, yC, x1 - 8, yS - 4], clip: win, ramp: ['#CFAE9E', '#D9BBA9', '#E2C6B4'], shade: (px) => clamp(1 - Math.abs(px - x) / (UPPER.ww * 0.4)), dir: Math.PI / 2, dirJit: 0.15, len: [14, 26], wid: [5, 8], cover: 1.1, alpha: 0.34, height: false });
      for (let i = 0; i < 3; i++) stroke(S, x0 + 12 + i * 14, yC + 16 + r() * 30, Math.PI / 2, 22, 3, PAL.nacre[i], { alpha: 0.3, height: false });
      // iç kemer (odanın içi dışından görünür): ince koyu inci çizgi
      { const ip = new Path2D(); ip.moveTo(x - hw * 0.5, yS - 2); ip.lineTo(x - hw * 0.5, yC + 8); ip.arc(x, yC + 8, hw * 0.5, Math.PI, TAU); ip.lineTo(x + hw * 0.5, yS - 2); S.x.save(); S.x.strokeStyle = '#7C6E80'; S.x.globalAlpha = 0.45; S.x.lineWidth = 2.2; S.x.stroke(ip); S.x.restore(); }
      fillP(S, rectPath(x0 - 11, yS, UPPER.ww + 22, 8), BR.gold[3], { h: 175 });
    }
    // kat kuşağı: iki sıra küçük altın-gümüş tuğla, koyu misk derzler, altın pervazlar
    const cY0 = Y(UPPER.c0), cY1 = Y(UPPER.c1);
    fillP(S, rectPath(0, cY0, w, cY1 - cY0), '#3A2414', { h: 110 });
    const bh = (cY1 - cY0) / 2;
    for (let row = 0; row < 2; row++) { const y = cY0 + row * bh; for (let x = row ? -17 : 0, j = 0; x < w; x += 34, j++) { const pal = (j + row) % 2 ? BR.silver : BR.gold; const ki = 1 + Math.floor(NOISE(j * 0.7, row * 3) * 2.4); fillP(S, rectPath(x + 1.5, y + 1.5, 31, bh - 3), pal[ki], { h: 150 + ki * 6 }); stroke(S, x + 17, y + bh * 0.42, 0, 24, 5, pal[ki + 1], { alpha: 0.7 }); } }
    S.line([[0, cY0 - 2], [w, cY0 - 2]], 5, BR.gold[3], { edge: false }); S.line([[0, cY0 - 3.6], [w, cY0 - 3.6]], 1.4, '#E8C25A', { edge: false });
    S.line([[0, cY1 + 2], [w, cY1 + 2]], 5, BR.gold[3], { edge: false });
    // köşe dolgusunda kemere koşut ince altın çizgi
    { const pts = []; for (let i = 0; i <= 80; i++) pts.push(E((i / 80) * Math.PI, 1.075)); const L1 = pts.filter((p) => p[1] > cY1 + 10 && p[0] < acx), R1 = pts.filter((p) => p[1] > cY1 + 10 && p[0] > acx); if (L1.length > 1) S.line(L1, 3, BR.gold[3], { edge: false }); if (R1.length > 1) S.line(R1, 3, BR.gold[3], { edge: false }); }
    // --- sütunlar (ince, sade silindir; tarihî düzen yok), serin gölgede
    const col = (cxw) => {
      const cx = X(cxw), R = COLS.R; const yTop = Y(COLS.springY), yBot = Y(COLS.baseY);
      const shaft = rectPath(cx - R, yTop, 2 * R, yBot - yTop);
      S.rim(shaft, { w: 1.8, alpha: 0.75 });
      fillP(S, shaft, '#3A2414', { h: 110 });
      const rowH = 18; let row = 0;
      for (let y = yTop + 6; y < yBot - 4; y += rowH, row++) {
        const nB = 4; const dth = Math.PI / nB; const off = row % 2 ? 0.5 : 0;
        for (let j = -1; j <= nB; j++) {
          let t0 = -Math.PI / 2 + (j + off) * dth, t1 = t0 + dth; t0 = Math.max(-Math.PI / 2, t0); t1 = Math.min(Math.PI / 2, t1); if (t1 - t0 < 0.05) continue;
          const xa = cx + R * Math.sin(t0) + (t0 > -Math.PI / 2 + 0.01 ? 1 : 0), xb = cx + R * Math.sin(t1) - (t1 < Math.PI / 2 - 0.01 ? 1 : 0);
          const pal = (j + row + 8) % 2 === 0 ? BR.gold : BR.silver;
          const tm = (t0 + t1) / 2; const v = clamp(0.5 + 0.36 * Math.cos(tm + 0.45) - 0.22 * Math.pow(Math.sin(tm), 2));
          const ki = clamp(Math.floor(v * 4), 0, 3); const q = rectPath(xa, y + 1, xb - xa, rowH - 2);
          fillP(S, q, pal[ki], { h: 150 + ki * 6 });
          if (xb - xa > 5) { stroke(S, (xa + xb) / 2, y + rowH * 0.4, 0, (xb - xa) * 0.85, 5, pal[ki + 1], { alpha: 0.6 }); stroke(S, (xa + xb) / 2, y + rowH * 0.72, 0, (xb - xa) * 0.7, 3.5, pal[Math.max(0, ki - 1)], { alpha: 0.4 }); }
        }
        if (row === 12 || row === 25) { for (let j = 0; j < 4; j++) { const th = -Math.PI / 2 + ((j + 0.5) / 4) * Math.PI; const x = cx + R * 0.9 * Math.sin(th); fillP(S, ellipsePath(x, y + rowH + 0.5, 3, 3.2), PAL.pearl[3], { h: 195 }); } }
      }
      S.x.save(); S.x.clip(shaft); S.x.globalAlpha = 0.24; S.x.fillStyle = '#1C2440'; S.x.fillRect(cx + R * 0.35, yTop, R, yBot - yTop); S.x.globalAlpha = 0.1; S.x.fillRect(cx - R, yTop, 2 * R, yBot - yTop); S.x.restore();
      const cap1 = smoothPath([[cx - R - 6, yTop - 4], [cx, yTop - 10], [cx + R + 6, yTop - 4], [cx + R + 4, yTop + 8], [cx, yTop + 14], [cx - R - 4, yTop + 8]]);
      S.region(cap1, { ramp: PAL.pearl.slice(0, 5), shade: (x) => clamp(0.75 - Math.abs(x - cx + 10) / (R * 1.6)), dir: 0, len: [14, 24], wid: [5, 8], cover: 3, bbox: [cx - R - 8, yTop - 12, cx + R + 8, yTop + 16], rim: false });
      const ab = rectPath(cx - R - 14, Y(COLS.capY), 2 * R + 28, Y(COLS.springY) - Y(COLS.capY) - 8);
      S.region(ab, { ramp: BR.gold, shade: (x, y) => clamp(0.75 - Math.abs(x - cx + 12) / (R * 3) - 0.25 * ((y - Y(COLS.capY)) / 22)), dir: 0, len: [20, 36], wid: [6, 9], cover: 3, bbox: [cx - R - 16, Y(COLS.capY) - 2, cx + R + 16, Y(COLS.springY)], rim: { w: 1.2, alpha: 0.7 } });
      const bY = Y(COLS.baseY), fY = Y(COLS.footY);
      const b1 = smoothPath([[cx - R - 6, bY + 2], [cx, bY - 4], [cx + R + 6, bY + 2], [cx + R + 8, bY + 16], [cx, bY + 22], [cx - R - 8, bY + 16]]);
      S.region(b1, { ramp: PAL.pearl.slice(0, 5), shade: (x) => clamp(0.7 - Math.abs(x - cx + 10) / (R * 1.6)), dir: 0, len: [14, 24], wid: [5, 8], cover: 3, bbox: [cx - R - 10, bY - 6, cx + R + 10, bY + 24], rim: false });
      S.region(rectPath(cx - R - 12, bY + 18, 2 * R + 24, fY - bY - 18), { ramp: BR.gold, shade: (x) => clamp(0.6 - Math.abs(x - cx + 10) / (R * 3)), dir: 0, len: [20, 36], wid: [6, 9], cover: 3, bbox: [cx - R - 14, bY + 16, cx + R + 14, fY], rim: { w: 1.2, alpha: 0.7 } });
    };
    col(COLS.cx[0]); col(COLS.cx[1]);
    // --- kemer: iki sıra küçük altın-gümüş tuğla, iç ve dış kenarda altın pervaz, yalnız kilit taşı çevresinde inci
    const band = []; for (let i = 0; i <= 80; i++) band.push(E((i / 80) * Math.PI, 0)); for (let i = 80; i >= 0; i--) band.push(E((i / 80) * Math.PI, 1));
    const bandP = poly(band);
    S.rim(bandP, { w: 2.0, alpha: 0.8 });
    fillP(S, bandP, '#3A2414', { h: 110 });
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
    for (const d of [-2, -1, 0, 1, 2]) { const th = Math.PI / 2 + d * 0.085; const p = E(th, 0.5); bead(S, p[0], p[1], d ? 4 : 5.2); }
    const sof = []; for (let i = 0; i <= 80; i++) sof.push(E((i / 80) * Math.PI, 0)); for (let i = 80; i >= 0; i--) sof.push(E((i / 80) * Math.PI, -0.08));
    S.region(poly(sof), { ramp: PAL.goldC.slice(0, 4), shade: Paint.cst(0.4), dir: (x, y) => Math.atan2(y - acy, x - acx) + Math.PI / 2, len: [20, 36], wid: [5, 8], cover: 3, bbox: bboxOf(sof), rim: false });
    const edgeL = (t, wd, c) => { const pts = []; for (let i = 0; i <= 120; i++) pts.push(E((i / 120) * Math.PI, t)); S.line(pts, wd, c, { edge: false }); };
    edgeL(0.0, 5, BR.gold[4]); edgeL(1.0, 6, BR.gold[3]); edgeL(1.0 - 0.02, 1.4, '#E8C25A');
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }

  // ---------------------------------------------------------------- 8) z-kanopi: kemerin ötesinde uçsuz bucaksız tacın altı (uzayan serin gölge), kıvrımlı altın dallar
  function paintKanopi() {
    const w = 1320, h = 760, k = 1; const S = Paint.sprite(w, h, { seed: 7901, k }); const r = S.r;
    const edgeY = (x) => 552 + 26 * Math.sin(x * 0.012 + 0.8) + 18 * Math.sin(x * 0.031 + 2.1) + 30 * (NOISE(x * 0.006, 1.7) - 0.5);
    const mass = new Path2D(); mass.rect(-20, -20, w + 40, 520);
    const clumps = [];
    for (let x = -30; x < w + 40; x += 28 + r() * 22) { const y = edgeY(x); const rr = 34 + r() * 30; clumps.push([x, y - rr * 0.5, rr]); mass.addPath(circ(x, y - rr * 0.5, rr)); }
    const CAN = ['#052220', '#082E28', '#0B3B32', '#104B3B', '#155E42', '#1D7249', '#2B894F', '#47A255', '#7EBE5E'];
    const nC = CAN.length;
    const pockets = [[420, 420, 120], [700, 400, 140], [960, 440, 110], [560, 500, 90], [820, 500, 80]];
    const cShade = (x, y) => { let v = 0.1 + 0.4 * clamp((y - 260) / 300) + 0.46 * (NOISE.fbm(x * 0.006, y * 0.009, 3) - 0.5); for (const [px, py, pr] of pockets) v += 0.22 * Math.exp(-(Math.pow(x - px, 2) + Math.pow((y - py) * 1.4, 2)) / (pr * pr)); return clamp(v); };
    S.region(mass, { ramp: CAN, shade: cShade, dir: (x, y) => (NOISE(x * 0.01, y * 0.01) - 0.5) * 6, len: [18, 36], wid: [9, 15], cover: 2.6, jitter: 8, noise: 0.06, broken: 0.07, bbox: [0, 0, w, h], rim: false, max: 9000 });
    const leafBunch = (x0, y0, n, R, vf) => { for (let i = 0; i < n; i++) { const a = r() * TAU, u = Math.sqrt(r()) * R; const x = x0 + Math.cos(a) * u, y = y0 + Math.sin(a) * u * 0.8; const v = clamp(vf(x, y) + (r() - 0.5) * 0.22); leaf(S, x, y, a + (r() - 0.5) * 0.8, 22 + r() * 14, 9 + r() * 5, CAN[clamp(Math.floor(v * nC), 0, nC - 1)]); } };
    for (let i = 0; i < 44; i++) { const x = r() * w, y = 280 + r() * 260; leafBunch(x, y, 9, 44, (xx, yy) => cShade(xx, yy) + 0.06); }
    // kıvrımlı, çatallanan, incelen altın dallar (gölgede serin altın, sırtı #F1CB60 / #FCE9A8)
    const br = (ctrl, w0, w1) => limb(S, crPts(ctrl, 7), w0, w1, { pal: PAL.goldC, rim: { w: 1.1, alpha: 0.6 }, crest: '#E8C25A', top2: '#F6E2A0' });
    br([[20, 360], [150, 384], [270, 420], [370, 462], [430, 510]], 42, 14);
    br([[270, 420], [300, 470], [312, 526]], 15, 5);
    br([[150, 384], [210, 350], [280, 336], [350, 334]], 14, 5);
    br([[1340, 410], [1220, 418], [1110, 440], [1020, 478], [966, 528]], 36, 12);
    br([[1110, 440], [1086, 392], [1040, 356], [980, 336]], 14, 5);
    br([[1020, 478], [1060, 512], [1076, 548]], 11, 4);
    br([[300, 352], [380, 384], [460, 420], [536, 448], [612, 484], [690, 504], [770, 540]], 24, 7);
    br([[612, 484], [648, 432], [702, 400]], 10, 4);
    for (const [x, y] of [[180, 400], [400, 470], [600, 420], [860, 430], [1080, 470], [1200, 456], [300, 410], [980, 520]]) leafBunch(x + (r() - 0.5) * 30, y + (r() - 0.5) * 16, 8, 28, (xx, yy) => cShade(xx, yy) + 0.14);
    // dal uçları ve sırtı yaprak kümeleriyle örtülür (çıplak / kesik dal görünmez)
    for (const [x, y, n] of [[420, 396, 7], [790, 540, 9], [712, 394, 8], [560, 452, 5], [430, 506, 8], [318, 524, 7], [350, 334, 7], [966, 526, 8], [980, 338, 7], [1076, 546, 7]]) leafBunch(x, y, n, 26, (xx, yy) => cShade(xx, yy) + 0.2);
    // alt kenar: bahçeden gelen ortam ışığını alan sarkık yapraklar
    for (const [cx, cy, rr] of clumps) for (let i = 0; i < 8; i++) { const a = Math.PI * (0.08 + r() * 0.84); const x = cx + Math.cos(a) * rr * (0.55 + r() * 0.4), y = cy + Math.sin(a) * rr * (0.55 + r() * 0.4); const v = clamp(0.48 + r() * 0.42); leaf(S, x, y, a + (r() - 0.5) * 0.7, 26 + r() * 14, 10 + r() * 5, CAN[clamp(Math.floor(v * nC), 0, nC - 1)]); }
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }

  // ---------------------------------------------------------------- 8b) z-on-kanopi: çerçevenin üstünden sarkan ön yapraklar (serin, koyu) + sol altın dal: yeşil-altın üzüm salkımı ve taze sarı hurma
  // Salkım sol tahtın arkalığının hemen üstüne kadar iner (69:23 "kümeleri yakın").
  function paintOnKanopi() {
    const w = 1320, h = 920, k = 1; const S = Paint.sprite(w, h, { seed: 7951, k }); const r = S.r;
    const X = (x) => x + 120, Y = (y) => y + 120;
    const edgeW = (wx) => { const l = clamp((180 - wx) / 300), rr = clamp((wx - 860) / 340); return 8 + 268 * Math.pow(l, 0.9) + 236 * Math.pow(rr, 1.2) + 16 * Math.sin(wx * 0.027 + 1.3) + 14 * (NOISE(wx * 0.012, 4.2) - 0.5); };
    const mass = new Path2D(); mass.moveTo(0, 0); mass.lineTo(w, 0);
    for (let sx = w; sx >= 0; sx -= 12) mass.lineTo(sx, Y(edgeW(sx - 120)));
    mass.closePath();
    const clumps = []; for (let sx = -20; sx < w + 30; sx += 30 + r() * 26) { const ey = Y(edgeW(sx - 120)); const rr = 20 + r() * 26 + (ey > 260 ? 16 : 0); clumps.push([sx, ey - rr * 0.3, rr]); mass.addPath(circ(sx, ey - rr * 0.3, rr)); }
    const FC = ['#031615', '#06201D', '#092A25', '#0D352D', '#124236', '#19523F', '#256447', '#367A4E'];
    const nF = FC.length;
    const fS = (x, y) => clamp(0.14 + 0.5 * clamp((y - 80) / 380) + 0.38 * (NOISE.fbm(x * 0.008, y * 0.01, 3) - 0.5));
    S.region(mass, { ramp: FC, shade: fS, dir: (x, y) => (NOISE(x * 0.012, y * 0.012) - 0.5) * 6, len: [22, 44], wid: [10, 18], cover: 2.4, jitter: 8, broken: 0.07, bbox: [0, 0, w, Y(300) + 50], rim: false, max: 6000 });
    // iri yakın yapraklar (kütle içinde)
    for (let i = 0; i < 150; i++) { const x = r() * w, wx = x - 120; const ey = Y(edgeW(wx)); const y = r() * ey; const v = clamp(fS(x, y) + (r() - 0.5) * 0.25); leaf(S, x, y, r() * TAU, 40 + r() * 22, 15 + r() * 7, FC[clamp(Math.floor(v * nF), 0, nF - 1)]); }
    // kenarda sarkan yapraklar (ortam ışığını hafifçe alır)
    for (const [cx, cy, rr] of clumps) for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + r() * 0.8); const x = cx + Math.cos(a) * rr * (0.6 + r() * 0.5), y = cy + Math.sin(a) * rr * (0.6 + r() * 0.5); leaf(S, x, y, a + (r() - 0.5) * 0.6, 40 + r() * 20, 15 + r() * 6, FC[3 + Math.floor(r() * 5)], { vein: FC[1] }); }
    // ortada birkaç sarkan yaprak dalcığı (üst kat pencereleri görünür kalır)
    for (const [wx, len] of [[352, 70], [610, 46], [788, 84]]) {
      const x0 = X(wx), y0 = Y(edgeW(wx)) - 8; const pts = crPts([[x0, y0], [x0 + 6, y0 + len * 0.5], [x0 + 2, y0 + len]], 5);
      S.line(pts, 3.4, PAL.goldC[3], { w1: 2, edge: false });
      for (let j = 0; j < 5; j++) { const p = pts[Math.min(pts.length - 1, Math.round(((j + 1) / 5) * (pts.length - 1)))]; const sd = j % 2 ? 1 : -1; leaf(S, p[0] + sd * 16, p[1] + 6, Math.PI / 2 + sd * 0.9, 36 + r() * 12, 14 + r() * 4, FC[4 + Math.floor(r() * 4)], { vein: FC[1] }); }
    }
    // --- sol altın dal: sol üst köşeden kıvrılarak iner, ucunda salkım; yan çatalda hurma salkımı
    const P = (x, y) => [X(x), Y(y)];
    const main = crPts([P(-150, 30), P(-70, 70), P(10, 150), P(96, 226), P(196, 286), P(258, 352), P(286, 426)], 6);
    vineLeaf(S, ...P(232, 380), 48, -0.9, { seed: 91, dark: true });
    vineLeaf(S, ...P(150, 286), 42, 2.4, { seed: 92, dark: true });
    limb(S, main, 40, 13);
    const fork = crPts([P(90, 222), P(70, 280), P(74, 330)], 5);
    limb(S, fork, 15, 8);
    for (let i = 0; i < 18; i++) { const p = main[Math.floor((0.15 + r() * 0.8) * (main.length - 1))]; const a = (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.8) + 0.8; leaf(S, p[0] + Math.cos(a) * 24, p[1] + Math.sin(a) * 24, a, 40 + r() * 14, 15 + r() * 4, FC[3 + Math.floor(r() * 5)], { vein: FC[1] }); }
    // taze sarı (berhi) hurma salkımı: görünür sap, altın teller, dolgun parlak oval taneler
    { const s0 = P(74, 330); const stalk = crPts([s0, P(80, 362), P(88, 392)], 4); S.line(stalk, 9, '#B98A2A', { w1: 7, edge: false, rim: { w: 1, alpha: 0.7 } });
      const top = P(88, 392); const list = [];
      for (let i = 0; i < 10; i++) { const u = i / 9 - 0.5; const ex = top[0] + u * 150 + (r() - 0.5) * 10, ey = top[1] + 150 + r() * 24 - Math.abs(u) * 60; const pts = crPts([top, [lerp(top[0], ex, 0.35), lerp(top[1], ey, 0.3)], [ex, ey]], 4); S.line(pts, 2.4, '#D9A838', { w1: 1.6, edge: false }); const n = 3 + Math.floor(r() * 2); for (let j = 0; j < n; j++) { const p = pts[Math.min(pts.length - 1, Math.floor(pts.length * (0.34 + (0.64 * j) / n)))]; const sd = j % 2 ? 1 : -1; list.push([p[0] + sd * 6, p[1] + 9, r(), u]); } }
      list.sort((a, b) => a[2] - b[2]);
      for (const [dx, dy, z, u] of list) date(S, dx, dy, 24 + r() * 3, Math.PI / 2 + u * 0.7 + (r() - 0.5) * 0.3, z < 0.35 ? PAL.dateY.map((c) => shade(c, -0.07)) : PAL.dateY, { th: 0.3, calyx: '#9A7420' });
    }
    // ağır yeşil-altın üzüm salkımı (sol tahtın arkalığının hemen üstüne iner)
    S.line(crPts([P(284, 424), P(280, 444), P(282, 462)], 4), 8, PAL.gold[2], { w1: 6, edge: false, rim: { w: 1, alpha: 0.7 } });
    grapeCluster(S, ...P(282, 460), 176, 312, 15.5, PAL.grapeG, 93, { stem: false, rot: -0.03 });
    vineLeaf(S, ...P(318, 446), 40, 0.6, { seed: 94 });
    vineLeaf(S, ...P(250, 452), 34, 2.6, { seed: 95 });
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: 1 };
  }

  // ---------------------------------------------------------------- 9) z-arka: köşkün ötesindeki bahçe — uçsuz tacın altında geriye uzanan altın gövde sıraları (hava perspektifiyle
  // keskin basamaklar), ufukta inci-şeftali-nane pus (kaynak değil), uzak inci kubbeler, güller, bahçe içinden doğan dere, orta planda kalın altın gövde
  function paintArka() {
    const w = 1320, h = 1920, k = 1; const S = Paint.sprite(w, h, { seed: 8001, k }); const r = S.r;
    const HZ = 880; const WX = (x) => x + 120, WY = (y) => y + 120; // ufuk (sprite) = dünya 760
    S.x.fillStyle = '#123B32'; S.x.fillRect(0, 0, w, HZ);
    // ufuk pusu: basamaklı yatay katlar (inci-şeftali / nane / lavanta), parlak nokta yok
    const hazeB = [[770, '#B5CBBF'], [804, '#C8D7CB'], [832, '#D8DFD3'], [854, '#E2E0D4'], [870, '#E8DCCF']];
    for (let i = 0; i < hazeB.length; i++) { const y0 = hazeB[i][0], y1 = i < hazeB.length - 1 ? hazeB[i + 1][0] : HZ; S.x.fillStyle = hazeB[i][1]; S.x.fillRect(0, y0, w, y1 - y0); }
    field(S, { bbox: [-40, 766, w + 40, HZ], ramp: hazeB.map((b) => b[1]), shade: (x, y) => clamp((y - 766) / (HZ - 766)), dir: 0, dirJit: 0.03, len: [90, 200], wid: [8, 14], cover: 1.4, noise: 0.08, broken: 0.1 });
    field(S, { bbox: [-40, 784, w + 40, HZ - 4], ramp: ['#E1D0C2', '#D0E1D2', '#D9D5E0'], shade: () => r(), dir: 0, dirJit: 0.02, len: [80, 180], wid: [6, 10], cover: 0.5, alpha: 0.45, height: false });
    // çimen: basamaklı zümrüt bantlar (ufukta açık, öne doğru derin)
    const lawn = [[HZ, '#92C68A'], [904, '#82BD7E'], [940, '#72B272'], [990, '#62A667'], [1056, '#53995D'], [1140, '#468C54'], [1250, '#3D804C']];
    for (let i = 0; i < lawn.length; i++) { const y0 = lawn[i][0], y1 = i < lawn.length - 1 ? lawn[i + 1][0] : h; S.x.fillStyle = lawn[i][1]; S.x.fillRect(0, y0, w, y1 - y0); }
    const lawnI = (x, y) => { let i = 0; for (let j = 0; j < lawn.length; j++) if (y + 5 * Math.sin(x * 0.02 + y * 0.01) >= lawn[j][0]) i = j; return (i + 0.5) / lawn.length; };
    field(S, { bbox: [-40, HZ, w + 40, 1380], ramp: lawn.map((b) => b[1]), shade: lawnI, dir: 0, dirJit: 0.06, len: [60, 140], wid: [12, 20], cover: 1.6, noise: 0, broken: 0.04, max: 3000 });
    // altın gövde (pus oranı = uzaklık); yakın gövdelerde pus ≤ 0.12
    const trunk = (x, yTop, yBot, wd, haze = 0) => {
      const pal = PAL.gold.map((c) => mix(c, '#A9C9B4', haze));
      const pts = crPts([[x - wd * 0.1, yBot], [x + wd * 0.12, lerp(yBot, yTop, 0.35)], [x - wd * 0.08, lerp(yBot, yTop, 0.7)], [x + wd * 0.05, yTop]], 6);
      if (haze < 0.3) arcRim(S, x, yBot, wd * 0.9, wd * 0.25, { w: 1, span: 1.2, ang: 0.4 });
      limb(S, pts.slice().reverse(), wd * 0.78, wd * 1.12, { pal, rim: false, crest: mix('#F1CB60', '#A9C9B4', haze), top2: mix('#FCE9A8', '#A9C9B4', haze), top: wd > 14 });
      if (wd > 6) { const sg = r() < 0.5 ? 1 : -1; const fy = yTop + (yBot - yTop) * 0.12; limb(S, crPts([[x, fy], [x - sg * wd * 1.1, yTop - wd * 0.6], [x - sg * wd * 2.2, yTop - wd * 1.8]], 5), wd * 0.55, wd * 0.25, { pal, rim: false, crest: mix('#F1CB60', '#A9C9B4', haze), top: false }); limb(S, crPts([[x, fy + wd], [x + sg * wd * 0.9, yTop - wd * 0.2], [x + sg * wd * 1.6, yTop - wd * 1.4]], 5), wd * 0.45, wd * 0.2, { pal, rim: false, crest: mix('#F1CB60', '#A9C9B4', haze), top: false }); }
      fillP(S, ellipsePath(x - wd * 0.1, yBot + 1, wd * 0.9, Math.max(1.5, wd * 0.14)), mix('#2E5E46', '#A9C9B4', haze), { alpha: 0.7, height: false });
    };
    // tacın alt yüzü: her derinlik basamağının sarkan loblu kenarı bir öncekinin önüne düşer
    const canopyLevel = (y0, amp, pal, seed, lobeR) => {
      const R = rng(seed); const edge = (x) => y0 + amp * (Math.sin(x * 0.013 + seed) * 0.6 + Math.sin(x * 0.037 + seed * 2) * 0.4);
      const p = new Path2D(); p.moveTo(-20, -20); p.lineTo(w + 20, -20); for (let x = w + 20; x >= -20; x -= 10) p.lineTo(x, edge(x)); p.closePath();
      for (let x = -20; x < w + 30; x += lobeR * (1.1 + R() * 0.9)) { const rr = lobeR * (0.6 + R() * 0.6); p.addPath(ellipsePath(x, edge(x) + rr * 0.12, rr * 1.25, rr * 0.72)); }
      S.region(p, { ramp: pal, shade: (x, y) => clamp(0.12 + 0.8 * clamp((y - (y0 - 120)) / 150) + 0.14 * (NOISE(x * 0.012, y * 0.02 + seed) - 0.5)), dir: (x, y) => (NOISE(x * 0.02, y * 0.02) - 0.5) * 3, len: [16 + lobeR * 0.2, 28 + lobeR * 0.3], wid: [8, 13], cover: 2.2, bbox: [0, Math.max(0, y0 - 200), w, y0 + amp + lobeR + 4], rim: false, noise: 0.03, broken: 0.04, max: 3500 });
      // sarkan yaprak uçları: kütlenin alt kenarı aşağıdaki aydınlık pustan hafif ışık alır
      const lw = Math.max(8, lobeR * 0.55);
      for (let x = -10; x < w + 10; x += lobeR * 0.7 * (0.7 + R() * 0.6)) { const ey = edge(x) + lobeR * 0.35 * (0.4 + R() * 0.6); leaf(S, x, ey, Math.PI / 2 + (R() - 0.5) * 0.9, lw * (0.9 + R() * 0.4), lw * 0.42, pal[pal.length - 1 - (R() < 0.4 ? 1 : 0)], { height: false }); }
    };
    const DOME = [[626, 40, 66], [850, 28, 44], [372, 24, 30], [1012, 8, 24], [200, 6, 15]]; // [dünya x, ufuk altı, R]
    const nearDome = (sx, pad) => DOME.some(([dx, , R]) => R > 28 && Math.abs(sx - WX(dx)) < R + pad);
    const row = (n, seed, wMin, wMax, haze, top, base, avoid) => { const R = rng(seed); const xs = []; for (let i = 0; i < n; i++) xs.push(lerp(-30, w + 30, (i + 0.2 + R() * 0.6) / n)); for (const x of xs) { if (avoid && nearDome(x, avoid)) continue; trunk(x, top + R() * 8, base + R() * 4, lerp(wMin, wMax, R()), haze); } };
    row(18, 71, 4, 6, 0.6, 806, HZ + 1, 0);
    canopyLevel(814, 5, ['#93B3A2', '#A3C0B0', '#B3CCBE', '#C6D8CB'], 3, 16);
    row(12, 72, 7, 10, 0.42, 750, HZ + 7, 0);
    canopyLevel(758, 9, ['#5F8D7B', '#6F9B89', '#80A997', '#97BAA9'], 5, 24);
    // uzak inci kubbeler (içi boş tek inci): yarımküreden biraz uzun, basamaklı küre (sol üst krem, sağ alt lavanta),
    // eğriliği izleyen düşük kontrastlı sedef, içten ılık hafif buğu, tabanda koyu temas kuşağı; tepe süsü / hilal yok
    const dome = (wx, dy, R, haze) => {
      const cx = WX(wx), base = HZ + dy; const ry = R * 1.12, cy = base - R * 0.08;
      const pal = ['#766C94', '#8D84A9', '#A69DBD', '#BFB5CD', '#D6CCD8', '#E9DEDC', '#F6EDE2'].map((c) => mix(c, '#BCD3C4', haze));
      const clipR = new Path2D(); clipR.rect(cx - R - 6, cy - ry - 6, 2 * R + 12, base - (cy - ry) + 6);
      const p = ellipsePath(cx, cy, R, ry);
      const shf = Paint.sphere(cx - R * 0.12, cy - R * 0.1, R * 1.08, [-0.55, -0.62], 0.1);
      S.x.save(); S.hx.save(); S.x.clip(clipR); S.hx.clip(clipR);
      S.region(p, { ramp: pal, shade: (x, y) => clamp(0.18 + (shf(x, cy + (y - cy) / 1.12) - 0.36) * 1.35), dir: (x, y) => Math.atan2((y - cy) / 1.12, x - cx) + Math.PI / 2, len: [R * 0.4, R * 0.7], wid: [Math.max(5, R * 0.14), Math.max(7, R * 0.2)], cover: 2.6, noise: 0.01, bbox: [cx - R - 2, cy - ry - 2, cx + R + 2, base + 2], rim: false, broken: 0.03 });
      for (let i = 0; i < 12; i++) { const lat = -1.2 + r() * 1.05, lon = (r() - 0.5) * 2.2; const x = cx + Math.sin(lon) * Math.cos(lat) * R * 0.9, y = cy + Math.sin(lat) * ry * 0.9; if (y > base - 4) continue; const ta = Math.atan2(-Math.sin(lon) * Math.sin(lat) * 0.35, Math.cos(lon)); stroke(S, x, y, ta, R * 0.5, Math.max(4, R * 0.1), mix(PAL.nacre[i % 3], '#CFE2D6', haze * 0.5), { alpha: 0.36, height: false }); }
      stroke(S, cx - R * 0.36, cy - ry * 0.46, -0.62, R * 0.36, Math.max(3, R * 0.07), mix('#FFF9F0', '#E3EEE6', haze), { alpha: 0.55 });
      field(S, { bbox: [cx - R * 0.55, base - R * 0.6, cx + R * 0.6, base - 4], clip: p, ramp: ['#E7C2AC', '#EFD0BA'], shade: () => r(), dir: (x, y) => Math.atan2((y - cy) / 1.12, x - cx) + Math.PI / 2, len: [R * 0.2, R * 0.36], wid: [Math.max(3, R * 0.07), Math.max(5, R * 0.1)], cover: 1.6, alpha: 0.42, height: false });
      S.x.restore(); S.hx.restore();
      S.x.save(); S.x.beginPath(); S.x.rect(cx - R - 4, base - R * 0.2, 2 * R + 8, R * 0.2); S.x.clip(); S.x.globalAlpha = 0.35; S.x.fillStyle = mix('#5E5878', '#9DBBAA', haze); S.x.fill(p); S.x.restore();
      fillP(S, ellipsePath(cx, base + 1, R * 1.05, Math.max(3, R * 0.08)), mix('#2A5A44', '#93C2A2', haze), { alpha: 0.8, height: false });
    };
    dome(200, 6, 15, 0.55); dome(1012, 8, 24, 0.42);
    row(8, 73, 12, 16, 0.24, 684, HZ + 20, 30);
    canopyLevel(688, 13, ['#2F6151', '#3C705F', '#4C806E', '#649683'], 7, 34);
    dome(850, 28, 44, 0.16); dome(372, 24, 30, 0.24); dome(626, 40, 66, 0.06);
    for (const [x, wd] of [[866, 22], [520, 19], [1160, 24]]) trunk(x, 600, HZ + 46, wd, 0.12);
    canopyLevel(598, 17, ['#163F32', '#204D3E', '#2C5C4B', '#41735F'], 9, 44);
    // orta zemin: bahçenin içinden doğan dere — set / kaldırım yok, çimen üstünde düzensiz kıyı, kıyıda serpili inci ve yakut taşlar
    const brook = crPts([[WX(668), WY(822)], [WX(650), WY(848)], [WX(614), WY(892)], [WX(582), WY(952)], [WX(560), WY(1022)], [WX(540), WY(1110)]], 6);
    const bw = (i) => lerp(6, 92, Math.pow(i / (brook.length - 1), 1.25));
    const sideP = (sg) => brook.map((p, i) => { const a = brook[Math.max(0, i - 1)], b = brook[Math.min(brook.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; const wob = 1 + 0.09 * Math.sin(i * 0.45 + sg * 2) + 0.06 * (NOISE(i * 0.15, sg * 5) - 0.5); return [p[0] - (dy / l) * bw(i) * sg * wob, p[1] + (dx / l) * bw(i) * sg * wob]; });
    const wl = sideP(1), wr = sideP(-1);
    S.region(poly([...sideP(1.22), ...sideP(-1.22).reverse()]), { ramp: ['#3E8A52', '#4A985B', '#56A363'], shade: () => r(), dir: 0, len: [14, 26], wid: [6, 9], cover: 2.2, bbox: bboxOf([...sideP(1.3), ...sideP(-1.3)]), rim: false });
    S.region(smoothPath([...wl, ...wr.slice().reverse()]), { ramp: ['#5AAEB9', '#7EC4C8', '#A3D8D4', '#C8ECE5'], shade: (x, y) => clamp(0.3 + (y - HZ) / 480 + 0.25 * (NOISE(x * 0.02, y * 0.04) - 0.5)), dir: 0, dirJit: 0.15, len: [20, 40], wid: [5, 9], cover: 2.6, bbox: bboxOf([...wl, ...wr]), rim: false });
    for (let i = 3; i < brook.length; i += 2) for (const s2 of [1.1, -1.1]) { if (r() < 0.45) continue; const p = sideP(s2)[i]; const rr = 1.6 + (i / brook.length) * 3 + r(); const ruby = s2 < 0 ? r() < 0.55 : r() < 0.08; fillP(S, circ(p[0] + (r() - 0.5) * 8, p[1] + (r() - 0.5) * 4, rr), ruby ? PAL.ruby[3] : '#EDE8EC', { h: 170 }); }
    { const p = brook[0]; for (let i = 0; i < 3; i++) { S.x.save(); S.x.strokeStyle = '#E6F7F2'; S.x.globalAlpha = 0.7 - i * 0.18; S.x.lineWidth = 2.2; S.x.beginPath(); S.x.ellipse(p[0], p[1] + 2, 10 + i * 7, 3 + i * 2, 0, 0.3, Math.PI * 1.7); S.x.stroke(); S.x.restore(); } }
    // çalılar ve güller (yanlarda)
    const crown = (cx, cy, rx, ry, pal, seed, lw = [16, 30], ww = [10, 16]) => {
      const pts = blobPts(cx, cy, rx, ry, 20, 0.15, seed); const p = smoothPath(pts);
      S.region(p, { ramp: pal, shade: (x, y) => clamp(0.66 - ((y - cy) / ry) * 0.36 - ((x - cx) / rx) * 0.12 + 0.12 * (NOISE(x * 0.02, y * 0.02) - 0.5)), dir: (x, y) => (NOISE(x * 0.02, y * 0.02) - 0.5) * 4, len: lw, wid: ww, cover: 2.4, jitter: 4, bbox: bboxOf(pts), rim: false, broken: 0.03, noise: 0.02 });
    };
    const bush = (cx, cy, rx, ry, seed) => {
      crown(cx, cy, rx, ry, ['#174F38', '#20624A', '#2B7752', '#3B8B5E', '#52A06C'], seed, [12, 24], [8, 12]);
      const n = Math.round((rx * ry) / 320);
      for (let i = 0; i < n; i++) { const a = r() * TAU, u = Math.sqrt(r()); const x = cx + Math.cos(a) * u * rx * 0.8, y = cy + Math.sin(a) * u * ry * 0.65 - ry * 0.12; const rr = 3.5 + r() * 3 + (cy - HZ) / 70; const t = r(); const pal = t < 0.45 ? PAL.rose : t < 0.75 ? ['#6E0F2C', '#981A3A', '#C02C48', '#DC5466', '#EE8590'] : ['#B9A1AE', '#D6C0CA', '#EADCE2', '#F7EEF1', '#FFFFFF']; fillP(S, circ(x, y, rr), pal[2], { h: 170 }); stroke(S, x - rr * 0.2, y - rr * 0.25, r() * 3, rr * 1.1, rr * 0.7, pal[3]); stroke(S, x + rr * 0.15, y + rr * 0.15, r() * 3, rr * 0.7, rr * 0.4, pal[1], { alpha: 0.7 }); }
    };
    bush(140, HZ + 64, 120, 56, 31); bush(430, HZ + 62, 86, 38, 32); bush(1000, HZ + 60, 130, 54, 33); bush(1220, HZ + 74, 120, 60, 34);
    bush(250, HZ + 166, 160, 76, 35); bush(1060, HZ + 176, 170, 80, 36); bush(470, HZ + 236, 100, 54, 37); bush(840, HZ + 236, 120, 60, 38);
    // orta planda kalın altın gövde (sol tahtın yanında, tacın içine yükselir); pus 0.08
    { const x = WX(972), yTop = WY(300), yBot = WY(880);
      const pts = crPts([[x - 6, yBot], [x + 6, lerp(yBot, yTop, 0.3)], [x - 8, lerp(yBot, yTop, 0.62)], [x + 4, yTop]], 6);
      const pal = PAL.gold.map((c) => mix(c, '#A9C9B4', 0.08));
      limb(S, pts.slice().reverse(), 40, 56, { pal, rim: { w: 1.4, alpha: 0.7 } });
      limb(S, crPts([[x, yTop + 60], [x - 40, yTop + 10], [x - 70, yTop - 40]], 6), 24, 10, { pal });
      limb(S, crPts([[x + 4, yTop + 90], [x + 50, yTop + 40], [x + 96, yTop - 10]], 6), 22, 9, { pal });
    }
    return { canvas: S.finish({ emboss: 0.4 }), px: 0, py: 0, k: 1 };
  }

  // ---------------------------------------------------------------- 10) z-sarkan-dal: sağ kenardan uzanan, üzüm salkımı ve iki narla yüklü ön dal
  // Pivot = dalın çerçeve dışındaki kökü (dünya 1170, 400). lowerRot (−0.26) dalı aşağı indirir: salkım ≈70 px iner, sağdaki tahta yaklaşır.
  // z-dal-bos: aynı dal, öndeki nar olmadan; z-dal-nar: o nar (pivot = sapın dala bağlandığı nokta) — "koparılan meyvenin yerine yenisi" için.
  const DAL = { x0: 700, y0: 300, w: 540, h: 530, k: 1.5, px: 1170, py: 400 };
  const NAR = { x0: 920, y0: 414, w: 112, h: 142, ax: 980, ay: 424 };
  function paintNar() {
    const k = DAL.k; const S = Paint.sprite(Math.round(NAR.w * k), Math.round(NAR.h * k), { seed: 8191, k });
    const P = (x, y) => [(x - NAR.x0) * k, (y - NAR.y0) * k];
    S.line(crPts([P(980, 424), P(978, 440), P(974, 458)], 4), 7 * k, PAL.gold[3], { w1: 5 * k, edge: false });
    pomegranate(S, ...P(972, 496), 40 * k, { crownAng: Math.PI / 2 + 0.18, seed: 84 });
    return S;
  }
  function paintDal(withFruit) {
    const k = DAL.k, w = Math.round(DAL.w * k), h = Math.round(DAL.h * k); const S = Paint.sprite(w, h, { seed: 8101, k }); const r = S.r;
    const P = (x, y) => [(x - DAL.x0) * k, (y - DAL.y0) * k];
    const CAN = ['#06201D', '#0A2C26', '#0F3A30', '#164A38', '#1F5C40', '#2C7048', '#43874F', '#6AA458'];
    // köke doğru yaprak buketi (sağ kenar, arka)
    for (let i = 0; i < 26; i++) { const a = r() * TAU; const u = 10 + r() * 70; const p = P(1180 + Math.cos(a) * u, 392 + Math.sin(a) * u * 0.6); leaf(S, p[0], p[1], a + (r() - 0.5) * 0.6, 40 + r() * 16, 15 + r() * 5, CAN[1 + Math.floor(r() * 4)]); }
    const main = crPts([P(1250, 372), P(1170, 398), P(1100, 410), P(1030, 417), P(960, 424), P(905, 432), P(866, 446)], 6);
    vineLeaf(S, ...P(930, 410), 46 * k, -0.6, { seed: 81, dark: true });
    vineLeaf(S, ...P(1080, 396), 40 * k, -1.4, { seed: 82, dark: true });
    limb(S, main, 32 * k, 11 * k);
    for (let i = 0; i < 16; i++) { const t = 0.08 + r() * 0.85; const p = main[Math.floor(t * (main.length - 1))]; const a = (r() < 0.5 ? -1 : 1) * (0.6 + r() * 0.9) - 0.4; leaf(S, p[0] + Math.cos(a) * 24 * k, p[1] + Math.sin(a) * 24 * k, a, 36 + r() * 12, 14 + r() * 4, CAN[2 + Math.floor(r() * 5)], { vein: CAN[1] }); }
    // arka nar (kısa sap)
    S.line(crPts([P(1040, 417), P(1044, 432), P(1046, 450)], 4), 7 * k, PAL.gold[3], { w1: 5 * k, edge: false });
    pomegranate(S, ...P(1048, 488), 38 * k, { crownAng: Math.PI / 2 - 0.2, seed: 83 });
    // ağır mor üzüm salkımı (dinlenme pozunda alt ucu hafif sola; alçalınca dikleşip sağa döner)
    S.line(crPts([P(884, 438), P(876, 454), P(870, 470)], 4), 8 * k, PAL.gold[3], { w1: 6 * k, edge: false, rim: { w: 1, alpha: 0.7 } });
    grapeCluster(S, ...P(870, 466), 170 * k, 272 * k, 15 * k, PAL.violet, 85, { stem: false, rot: 0.08 });
    vineLeaf(S, ...P(892, 454), 38 * k, 2.3, { seed: 86 });
    for (let i = 0; i < 6; i++) { const p = P(880 + (r() - 0.5) * 60, 450 + (r() - 0.5) * 12); const a = -Math.PI / 2 + (r() - 0.5) * 2.2; leaf(S, p[0], p[1], a, 30 + r() * 8, 12, CAN[4 + Math.floor(r() * 4)], { vein: CAN[1] }); }
    for (let i = 0; i < 14; i++) { const a = r() * TAU; const u = 8 + r() * 50; const p = P(1176 + Math.cos(a) * u, 396 + Math.sin(a) * u * 0.6); leaf(S, p[0], p[1], a + (r() - 0.5) * 0.6, 40 + r() * 14, 15 + r() * 4, CAN[3 + Math.floor(r() * 5)], { vein: CAN[1] }); }
    // öndeki nar en son: z-dal-bos'ta yok, z-dal-nar ile aynı piksel
    if (withFruit) {
      const F = paintNar(); const ox = (NAR.x0 - DAL.x0) * k, oy = (NAR.y0 - DAL.y0) * k;
      S.x.drawImage(F.c, ox, oy);
      const t = makeCanvas(F.w, F.h); const tx = t.getContext('2d'); tx.drawImage(F.hc, 0, 0); tx.globalCompositeOperation = 'destination-in'; tx.drawImage(F.c, 0, 0);
      S.hx.drawImage(t, ox, oy);
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: (DAL.px - DAL.x0) * k, py: (DAL.py - DAL.y0) * k, k };
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
    const items = [[22, 30, 11, 'p'], [46, 22, 7, 'r'], [64, 32, 12, 'p'], [38, 38, 8, 'p'], [76, 20, 7, 'p']];
    for (const [x, y, rr, t] of items) {
      const [cx, cy] = P(x, y); const R = rr * k;
      fillP(S, ellipsePath(cx + R * 0.15, cy + R * 0.7, R * 0.95, R * 0.3), '#1E3E52', { alpha: 0.35, height: false });
      if (t === 'p') { S.region(circ(cx, cy, R), { ramp: PAL.pearl.slice(1), shade: sph(cx - R * 0.3, cy - R * 0.4, R * 1.2, 0.2), dir: (px, py) => Math.atan2(py - cy, px - cx) + Math.PI / 2, len: [rr * 0.6, rr * 1.1], wid: [rr * 0.3, rr * 0.5], cover: 3, bbox: [cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1], rim: false }); stroke(S, cx + R * 0.25, cy + R * 0.3, 0.7, rr * 0.7, rr * 0.25, PAL.nacre[r() < 0.5 ? 0 : 1], { alpha: 0.7 }); stroke(S, cx - R * 0.35, cy - R * 0.4, -0.7, rr * 0.5, rr * 0.25, '#FFFFFF'); }
      else { const pal = PAL.ruby.map((c) => mix(c, '#6E9EA6', 0.22)); S.region(smoothPath(blobPts(cx, cy, R, R * 0.8, 10, 0.08, x)), { ramp: pal, shade: sph(cx - R * 0.3, cy - R * 0.4, R * 1.2, 0.1), dir: 0.6, len: [rr * 0.5, rr * 0.9], wid: [rr * 0.3, rr * 0.45], cover: 3, bbox: [cx - R - 1, cy - R - 1, cx + R + 1, cy + R + 1], rim: false }); stroke(S, cx - R * 0.3, cy - R * 0.35, -0.6, rr * 0.5, rr * 0.25, pal[5]); }
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
  defSprite('z-on-kanopi', paintOnKanopi);
  defSprite('z-sarkan-dal', () => paintDal(true));
  defSprite('z-dal-bos', () => paintDal(false));
  defSprite('z-dal-nar', () => { const F = paintNar(); return { canvas: F.finish({ emboss: 0.5 }), px: (NAR.ax - NAR.x0) * DAL.k, py: (NAR.ay - NAR.y0) * DAL.k, k: DAL.k }; });
  defSprite('z-gul', paintGul);
  defSprite('z-inci', paintInci);

  // ---------------------------------------------------------------- yerleşim (arkadan öne); dünya = zoom 1'de ekran
  const cups = [[352, 1322], [742, 1316], [790, 1232]];
  const ewer = [256, 1306];
  const branch = { x: DAL.px, y: DAL.py, restRot: 0, lowerRot: -0.26,
    // yeniden biten meyve: dalın pivotuna göre (dönüş 0'da) dünya ofseti; sahne z-dal-bos + z-dal-nar çizer
    fruit: { name: 'z-dal-nar', bare: 'z-dal-bos', ax: NAR.ax - DAL.px, ay: NAR.ay - DAL.py } };
  const roses = [[60, 1848, 1], [178, 1874, 1], [1012, 1860, 1]];
  const pebbles = [[330, 1852, 0.9], [612, 1860, 1], [846, 1854, 0.85]];
  const layers = [
    { name: 'z-arka', x: -120, y: -120, parallax: 0.6 },
    { name: 'z-kanopi', x: -120, y: -120, parallax: 1.05 },
    { name: 'z-kosk', x: -120, y: -120, parallax: 1.0 },
    { name: 'z-platform', x: -120, y: PLAT.y, parallax: 1.0 },
    ...pebbles.map(([x, y]) => ({ name: 'z-inci', x, y, parallax: 1.0 })),
    ...roses.map(([x, y]) => ({ name: 'z-gul', x, y, parallax: 1.0 })),
    { name: 'z-hali', x: 540, y: 1330, parallax: 1.0 },
    { name: 'z-taht-sol', x: 215, y: 1180, parallax: 1.0 },
    { name: 'z-taht-sag', x: 865, y: 1180, parallax: 1.0 },
    { name: 'z-tepsi', x: TEPSI.x, y: TEPSI.y, parallax: 1.0 },
    // tek giriş: sahne bu katmanda ZIYAFET.cups'taki üç kadehi çizer (saydam gövde üst üste binmesin)
    { name: 'z-akvab', x: cups[0][0], y: cups[0][1], parallax: 1.0 },
    { name: 'z-ibrik', x: ewer[0], y: ewer[1], parallax: 1.0 },
    { name: 'z-on-kanopi', x: -120, y: -120, parallax: 1.05 },
    { name: 'z-sarkan-dal', x: branch.x, y: branch.y, parallax: 1.05 },
  ];
  // dal + yeniden biten meyve: rot = dal dönüşü; fs = meyve ölçeği (0 → 1 biter), fa = meyve saydamlığı
  function fruitPos(rot = 0) { const f = branch.fruit, c = Math.cos(rot), s = Math.sin(rot); return [branch.x + f.ax * c - f.ay * s, branch.y + f.ax * s + f.ay * c]; }
  function drawBranch(ctx, rot = 0, fs = 1, fa = 1) {
    drawSpr(ctx, spr('z-dal-bos'), branch.x, branch.y, 1, rot);
    if (fs > 0.001 && fa > 0.001) { const [x, y] = fruitPos(rot); drawSpr(ctx, spr('z-dal-nar'), x, y, fs, rot, fa); }
  }
  return {
    layers, cups, ewer, branch, tray: TEPSI,
    streamPath, streamDir: [1, 0],
    roses, pebbles, fruitPos, drawBranch,
    PAL, CAM, proj, PLAT, ARCH, COLS, UPPER, bankTop,
  };
})();
