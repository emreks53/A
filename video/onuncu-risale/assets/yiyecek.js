// Yiyecek ve nimetler (grup "yiyecek"): dünya sofrası, Perde 4 nimetleri, cennet tepsi / kadeh / ibrik.
// Araçlar fruits.js'teki YIY'dir (nar, nar-kuru ve taç da orada; bu dosya fruits.js'ten SONRA yüklenmeli).
// Işık sol üstten. Ölçüler ekran pikseli × k (sprite pikseli / k = ekran pikseli, ölçek 1'de).
// Meta veri: YIYECEK = {
//   names: [...] tüm sprite adları (gölge sprite'ları dahil),
//   size[name] = [g, y]  ölçek 1'de görünür sınır kutusu (ekran px),
//   base[name] = [0, dy] pivottan aşağı, öğenin yere/örtüye değdiği ön nokta (ekran px, ölçek 1),
//   shadow[name] = { spr: '<ad>-golge' } temas gölgesi sprite'ı: öğeyle AYNI (x, y, ölçek) ile öğeden ÖNCE çizilir,
//   drawOnTable(ctx, name, x, y, s, alpha): gölge + öğe birlikte,
//   onTableSpots[name] = { x, y, s, rot:0, surf, z, main, shadow, wither } 'sofra' pivotuna (üst yüz merkezi) göre öğe pivotu
//      (sofra ölçek 1), s öğe ölçeği, surf örtüye değme y'si, z çizim sırası (küçük önce), main: p2 ana takımı,
//      shadow: gölge sprite adı ya da null (gölge sprite'a gömülü: nar-acik, uzum-yatik), wither: solma eşi (aynı pivot),
//   sofra: { rx, ry, clothRx, clothRy, hang } üst yüz ve örtü elipsleri, örtü eteği sarkması; PAL: paletler }
// Işıklı sprite'lar döndürülmez (en çok ±0.15 rad); sofrada yatan salkım için 'uzum-yatik' / 'uzum-yatik-kuru' kullanın.
'use strict';
const YIYECEK = { names: ['nar', 'nar-kuru'], onTableSpots: {}, base: { nar: [0, 192], 'nar-kuru': [0, 170] }, size: { nar: [399, 448], 'nar-kuru': [339, 336] } };

(() => {
  const { TAU, LT, poly, bboxOf, circ, ellPts, shape, polyShape, ellShape, outside, crPts, withClip, fill, dab, field, layer, line, crease, softLine, leaf, moved, crescent, toneBall, gridEval, gridMask, masked, stepBody, L3 } = YIY;
  const LN = Math.hypot(LT[0], LT[1]); const LX = LT[0] / LN, LY = LT[1] / LN;
  const reg = (name, fn, meta = {}) => {
    YIYECEK.names.push(name);
    defSprite(name, () => { const o = fn(); if (meta.size) YIYECEK.size[name] = meta.size; return o; });
    if (meta.size) YIYECEK.size[name] = meta.size;
    if (meta.base) YIYECEK.base[name] = meta.base;
  };
  const done = (S, px, py, emboss = 0.42) => ({ canvas: S.finish({ emboss }), px, py, k: S.k });


  // ---------------------------------------------------------------- paletler (koyu → açık)
  const PAL = {
    aril: ['#2A0210', '#5C0620', '#8E0A28', '#B80F2E', '#DA1E3A', '#F0475A', '#FF97A2', '#FFFFFF'],
    arilK: ['#1A0608', '#300C12', '#4E181C', '#682422', '#80302A', '#943E34', '#A85A4A', '#C08070'],
    pith: ['#B89A62', '#D2B47C', '#E6CC98', '#F3E0B6', '#FBF0D4', '#FFFAEC'],
    pithK: ['#3A2418', '#46301E', '#543A24', '#62442A', '#6E4E30', '#7A5A3A'],
    grapeP: ['#140828', '#24103E', '#381A5C', '#4C287A', '#663A98', '#8A62BA', '#B4A6DC', '#F0ECFC'],
    grapeG: ['#2E4A10', '#46661A', '#628A22', '#82AA2C', '#A3C83E', '#C6E070', '#E6F4AE', '#FBFFE6'],
    raisin: ['#1A0A08', '#2C120C', '#401C12', '#56281A', '#6C3622', '#84482C', '#A0623C', '#C89A70'],
    leaf: ['#08331F', '#0B4A2C', '#11633A', '#1C7E42', '#2E9A4C', '#5DB858', '#9ED64A'],
    leafK: ['#3A2410', '#5A3A16', '#7A541E', '#987026', '#B48C34', '#CCA850', '#E0C472'],
    stem: ['#2E1E10', '#4A3018', '#664422', '#86602E', '#A47E40', '#C49E5C'],
    crust: ['#4A1E0A', '#6E300E', '#944412', '#B85E18', '#D47E22', '#E9A23A', '#F6C664', '#FDE6A8'],
    crumb: ['#C8A060', '#DCB878', '#ECD096', '#F7E4B4', '#FFF4D8'],
    date: ['#120402', '#240A04', '#3C1206', '#561A0A', '#722612', '#923A1C', '#B45A30', '#E4A070', '#FFF0D8'],
    honey: ['#7A3A06', '#A85808', '#D2800E', '#EDA41C', '#F9C83A', '#FFE27A', '#FFF6C8'],
    glazeB: ['#0C1E52', '#132C74', '#1A3E99', '#2456B4', '#2E86CE', '#5CAAE0', '#A6D4F2', '#F0FAFF'],
    wood: ['#3A1C0C', '#562A12', '#764018', '#965822', '#B47432', '#CE9450', '#E4B47A'],
    clay: ['#5A200E', '#7E3014', '#A4441C', '#C25A26', '#D87436', '#E8945A', '#F4B888', '#FCDCC0'],
    milk: ['#8C96B8', '#AAB2CE', '#C8CEE0', '#E2E6F0', '#F4F6FA', '#FFFFFF'],
    apple: ['#3A0614', '#640A1C', '#920F22', '#BE1A26', '#DC2E2C', '#EE5236', '#F88A5A', '#FFD2B0', '#FFF4E6'],
    fig: ['#1A0C24', '#2C1438', '#44204E', '#5E2E66', '#7A407E', '#9A5E98', '#BE8AB8', '#E2C2DE'],
    figIn: ['#7A0E2A', '#A8183A', '#D02E4E', '#E8506A', '#F07BB2', '#F8B0CC', '#FFE0EA'],
    oliveG: ['#2A3A0C', '#3E5212', '#566E1A', '#708A24', '#8EA634', '#B0C258', '#D4E08E', '#F6FADC'],
    oliveB: ['#120A14', '#1E1220', '#2C1A30', '#3C2442', '#4E3256', '#6A4C72', '#9A84A6', '#D0C6DC'],
    oliveLeaf: ['#1A3020', '#24442C', '#325A38', '#447048', '#5E8A5C', '#86A884', '#B4C8AE'],
    rose: ['#5A0A2C', '#8A1440', '#B82456', '#D8457A', '#F07BB2', '#F8A8CC', '#FFD4E6', '#FFF2F8'],
    linen: ['#7E7AA8', '#A9A3CC', '#C8C4DE', '#DEDBEA', '#EEEBF2', '#F8F5F4', '#FFFDF8'],
    woodT: ['#3A1606', '#58220A', '#7A3410', '#9A4A18', '#B86424', '#D28438', '#E8A85A'],
    gold: ['#5A2A04', '#8A4A08', '#B86E0C', '#DE9A18', '#F2BE2E', '#FAD862', '#FFF0A8', '#FFFCE8'],
    silver: ['#323A52', '#4C5672', '#6C7894', '#909CB6', '#B6C0D6', '#D8E0EE', '#F0F4FA', '#FFFFFF'],
    under: Paint.UNDER,
  };
  YIYECEK.PAL = PAL;

  // ---- dışbükey çokgen yardımcıları (tane hücreleri)
  // yarı düzlem kırpma: a·p <= b tarafı kalır
  function clipHalf(P, ax, ay, b) {
    const out = []; const n = P.length; if (!n) return out;
    for (let i = 0; i < n; i++) {
      const p = P[i], q = P[(i + 1) % n]; const dp = ax * p[0] + ay * p[1] - b, dq = ax * q[0] + ay * q[1] - b;
      if (dp <= 0) out.push(p);
      if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const t = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]); }
    }
    return out;
  }
  const polyArea = (P) => { let a = 0; for (let i = 0; i < P.length; i++) { const p = P[i], q = P[(i + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a) / 2; };
  const polyCen = (P) => { let x = 0, y = 0; for (const p of P) { x += p[0]; y += p[1]; } return [x / P.length, y / P.length]; };
  // köşe yuvarlatma (Chaikin)
  function chaikin(P, it = 2, f = 0.22) { let Q = P; for (let k = 0; k < it; k++) { const R = []; for (let i = 0; i < Q.length; i++) { const p = Q[i], q = Q[(i + 1) % Q.length]; R.push([lerp(p[0], q[0], f), lerp(p[1], q[1], f)], [lerp(p[0], q[0], 1 - f), lerp(p[1], q[1], 1 - f)]); } Q = R; } return Q; }
  function hull(P) { const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } up.pop(); lo.pop(); return lo.concat(up); }
  const nearestOn = (px, py, pts) => { let best = [1e9, 0, 0, 0]; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const dx = bx - ax, dy = by - ay; const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)); const qx = ax + dx * t, qy = ay + dy * t; const d = Math.hypot(px - qx, py - qy); if (d < best[0]) best = [d, qx, qy, (i + t) / (pts.length - 1)]; } return best; };

  // yere düşen basamaklı temas gölgesi (iki ton, keskin kenar): sprite'a doğrudan, yarı saydam
  const SHC = ['#4A3346', '#5E4458']; // koyu sıcak keten gölgesi (öz / dış)
  function contactShadow(S, x, y, rx, ry, o = {}) {
    const sd = o.seed ?? 5; const a = o.alpha ?? 1;
    const outer = smoothPath(blobPts(x + rx * 0.12, y + ry * 0.1, rx, ry, 18, 0.05, sd, o.rot ?? 0));
    const core = smoothPath(blobPts(x - rx * 0.05, y - ry * 0.05, rx * (o.coreX ?? 0.66), ry * (o.coreY ?? 0.6), 16, 0.06, sd + 1, o.rot ?? 0));
    fill(S, outer, SHC[1], { alpha: 0.3 * a, height: false });
    fill(S, core, SHC[0], { alpha: 0.32 * a, height: false });
  }

  // ---- tek nar tanesi (dışbükey hücre ayak izi, ekran px): yakut kubbe; ışık sol üstten, içten ışıma sağ altta
  // F: ayak izi noktaları (ekran), hgt: kabarıklık (ekran px yukarı), AP: palet, wi: kuruma
  function arilCell(S, F, hgt, AP, wi, sd, o = {}) {
    const r2 = rng(sd); const K = S.k;
    const top = F.map(([x, y]) => [x, y - hgt]);
    const H = chaikin(hull(F.concat(top)), 2, 0.24);
    const sh = polyShape(H); const bp = sh.path; const bb = sh.bb;
    const [cx, cy] = polyCen(H); const sz = Math.max(bb[2] - bb[0], bb[3] - bb[1]) / 2;
    if (o.rim) S.rim(bp, { w: 1.1, alpha: 0.85 });
    fill(S, bp, AP[2], { h: 150 });
    // gölge yarımı (sağ alt), ışık katı (sol üst), içten ışıma (gölgede sıcak), parıltı
    fill(S, bp, AP[1], { clip: [bp, crescent(bp, bb, sz * 0.62)], height: false });
    const lit = moved(bp, LX * sz * 0.34, LY * sz * 0.34, 0.74, cx, cy);
    fill(S, lit, AP[3 + (o.litUp ?? 0)], { clip: bp, h: 160, ridge: false });
    const li2 = moved(bp, LX * sz * 0.5, LY * sz * 0.52, 0.42, cx, cy);
    fill(S, li2, AP[4 + (o.litUp ?? 0)], { clip: bp, height: false, alpha: 0.95 });
    if (o.glow ?? 0.6) fill(S, ellipsePath(cx + sz * 0.3, cy + sz * 0.26, sz * 0.36, sz * 0.22, -0.5), AP[5], { clip: [bp, crescent(bp, bb, sz * 0.5)], height: false, alpha: o.glow ?? 0.6 });
    // fırça izi: ışık katında tek kısa darbe
    dab(S, cx + LX * sz * 0.3, cy + LY * sz * 0.3, -0.5 + (r2() - 0.5) * 0.6, (sz * 0.9) / K, (sz * 0.42) / K, AP[4], { alpha: 0.5, height: false, dry: 0.5 });
    if (wi < 0.5) {
      const a = 1 - wi * 2; const hs = 0.6 + r2() * 0.8; const hx = cx + LX * sz * (0.42 + r2() * 0.18) + (r2() - 0.5) * sz * 0.2, hy = cy + LY * sz * (0.5 + r2() * 0.15);
      if (r2() < 0.88) fill(S, ellipsePath(hx, hy, sz * 0.16 * hs, sz * 0.1 * hs, -0.55), '#FFFFFF', { alpha: 0.95 * a, height: false });
      if (r2() < 0.4) fill(S, ellipsePath(hx + sz * 0.26, hy - sz * 0.05, sz * 0.06 * hs, sz * 0.045 * hs, -0.5), '#FFFFFF', { alpha: 0.8 * a, height: false });
    } else fill(S, ellipsePath(cx + LX * sz * 0.4, cy + LY * sz * 0.45, sz * 0.12, sz * 0.08, -0.6), AP[6], { alpha: 0.45, height: false });
    return sh;
  }

  // ================================================================ NAR AÇIK (yarım nar, kesik yüzü yukarıda; sofra açısında)
  // geometri ortak: taze ve kuru aynı yerleşimi paylaşır (çapraz geçiş için)
  const PITH_K = ['#4E3622', '#62452C', '#7A5A3A', '#8C6A44', '#A07850', '#B48C62'];
  const MEMB_K = ['#5A3E22', '#7A5A30', '#8A6A3A', '#A07E46', '#B08A50', '#C8A468'];
  function paintNarAcik(wi = 0) {
    const k = 2.2, K = k; const w = 520 * K, h = 420 * K;
    const S = Paint.sprite(w, h, { seed: 1201, k }); const rr = rng(1207);
    const cx = 256 * K, cy = 150 * K; // kesik yüz merkezi
    const shr = 1 - wi * 0.05;
    const RX = 214 * K * shr, RY = 86 * K * shr; // yüz elipsi (RY/RX = 0.40, sofraya uygun)
    const DOWN = 176 * K * shr; // kubbe altı (yüz merkezinden en alt nokta)
    const NP = NAR_PAL.map((c, i) => (wi > 0 ? mix(c, NAR_KURU[i], wi * 0.9) : c));
    const AP = PAL.aril.map((c, i) => (wi > 0 ? mix(c, PAL.arilK[i], wi) : c));
    const PP = PAL.pith.map((c, i) => (wi > 0 ? mix(c, PITH_K[i], wi) : c));
    const MP = PAL.pith.map((c, i) => (wi > 0 ? mix(c, MEMB_K[i], wi) : c));
    const Rs = RX / K;
    // --- temas gölgesi (kubbenin dibinde, sağa)
    contactShadow(S, cx + RX * 0.16, cy + DOWN * 0.93, RX * 0.86, RY * 0.36, { seed: 1209, coreX: 0.62, coreY: 0.55 });
    // --- dış kabuk: yüzün üst yayı + alttaki kubbe yayı
    const outline = [];
    for (let i = 0; i <= 40; i++) { const a = Math.PI + (i / 40) * Math.PI; outline.push([cx + Math.cos(a) * RX * 1.012, cy + Math.sin(a) * RY * 1.02]); }
    for (let i = 1; i < 40; i++) { const a = (i / 40) * Math.PI; const wob = 1 + (wi ? 0.025 * Math.sin(a * 7 + 1) : 0.008 * Math.sin(a * 5)); const sx = Math.cos(a), sy = Math.sin(a); outline.push([cx + sx * RX * 1.012 * wob, cy + Math.pow(sy, 0.9) * DOWN * wob * (1 - 0.06 * sx * sx)]); }
    const skin = shape(outline, 0.5);
    const sL = [Rs * 0.16, Rs * 0.3], sW = [clamp(Rs * 0.06, 6, 16), clamp(Rs * 0.095, 8, 20)];
    // kabuk darbeleri: alt kutuptan çıkan meridyenler gibi (kubbeye sarılır)
    const pole = [cx + RX * 0.05, cy + DOWN * 1.3];
    const sdir = (x, y) => Math.atan2(y - pole[1], x - pole[0]) + (S.r() - 0.5) * 0.25;
    // kubbe ışığı: küre normali (yüz düzleminin altı)
    const domeV = (x, y) => { const u = (x - cx) / RX, v = clamp((y - cy) / DOWN, 0, 1); const nz = Math.sqrt(Math.max(0, 1 - u * u - v * v * 0.6)); const l = Math.hypot(u, v * 0.9, nz) || 1; const d = (u * L3[0] + v * 0.9 * L3[1] + nz * L3[2]) / l; return clamp(d * 0.7 + 0.42); };
    stepBody(S, skin.path, skin.bb, [NP[1], NP[2], NP[3], NP[4], NP[5]], domeV, sdir, { thr: [0.24, 0.42, 0.6, 0.78], len: sL, wid: sW, rim: { w: 2.4, alpha: 0.9 } });
    layer(S, { clip: [skin.path, crescent(skin.path, skin.bb, RX * 0.05)], bb: skin.bb, cols: [mix(NP[2], '#62207A', 0.34 - wi * 0.22)], base: mix(NP[2], '#62207A', 0.34 - wi * 0.22), dir: sdir, len: [sL[0] * 0.5, sL[1] * 0.5], wid: [sW[0] * 0.6, sW[1] * 0.6], cover: 1.6 });
    if (wi < 0.5) { // parlak vurgu darbeleri (sol alt kıvrım boyunca)
      for (let i = 0; i < 4; i++) { const a = 2.5 + i * 0.12; dab(S, cx + Math.cos(a) * RX * 0.86, cy + Math.sin(a) * DOWN * 0.66, a + Math.PI / 2 + 0.1, Rs * 0.09, Rs * 0.03, NP[7], { alpha: 0.9 * (1 - wi * 2), dry: 0.4 }); }
      dab(S, cx + Math.cos(2.58) * RX * 0.85, cy + Math.sin(2.58) * DOWN * 0.65, 2.58 + Math.PI / 2, Rs * 0.05, Rs * 0.022, NP[8], { alpha: 1 - wi * 2 });
    }
    if (wi > 0.05) withClip(S, skin.path, () => {
      for (let i = 0; i < Math.round(9 * wi); i++) {
        const a = 0.25 + rr() * 2.6; const r0 = 0.25 + rr() * 0.3, r1 = r0 + 0.25 + rr() * 0.3; const q = [];
        for (let j = 0; j <= 8; j++) { const t = lerp(r0, r1, j / 8); const aa = a + Math.sin(t * 9 + i) * 0.06; q.push([cx + Math.cos(aa) * RX * (0.35 + t * 0.62), cy + RY * 0.6 + Math.sin(aa) * (DOWN - RY * 0.6) * (0.3 + t * 0.7)]); }
        crease(S, q, clamp(Rs * 0.02, 2, 4.4), NP[1], NP[6], { alpha: 0.85 });
      }
    });
    // --- kesik yüz (u,v birim daire → ekran)
    const F = (u, v) => [cx + u * RX, cy + v * RY];
    const rimPts = []; for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU; const wob = 1 + (wi ? 0.02 * Math.sin(a * 6 + 2) : 0.006 * Math.sin(a * 9)); rimPts.push(F(Math.cos(a) * wob, Math.sin(a) * wob)); }
    const face = shape(rimPts, 0.5);
    fill(S, face.path, NP[2], { h: 140 });
    const rindW = 0.085;
    const lobR = (a) => 1 - rindW - 0.028 * Math.pow(Math.abs(Math.sin(a * 3.5 + 0.4)), 0.6) - 0.012 * Math.sin(a * 11) - (wi ? 0.01 * Math.sin(a * 5 + 1) : 0);
    const rind = shape(rimPts.map(([x, y]) => [cx + (x - cx) * 0.972, cy + (y - cy) * 0.955]), 0.5);
    layer(S, { clip: rind.path, bb: rind.bb, cols: [PP[2], PP[3], PP[4]], base: PP[3], shade: (x, y) => clamp(0.55 + ((cx - x) / RX) * 0.3 + ((cy - y) / RY) * 0.12), dir: (x, y) => Math.atan2((y - cy) / RY, (x - cx) / RX) + Math.PI / 2, dirJit: 0.15, len: [14, 26], wid: [5, 8], cover: 1.6 });
    const inner = []; for (let i = 0; i < 96; i++) { const a = (i / 96) * TAU; const l = lobR(a); inner.push(F(Math.cos(a) * l, Math.sin(a) * l)); }
    const inn = shape(inner, 0.5);
    // boşluk (taneler arası): derin kızıl; kuruyunca koyu kahve-bordo
    fill(S, inn.path, wi ? mix(AP[1], '#42201A', wi) : AP[1], { h: 106 });
    if (wi > 0.05) { // kurumuş öz: kahve-bordo zemin üstünde kuru fırça izleri, ince çatlaklar
      field(S, { bb: inn.bb, inside: inn.path, clip: inn.path, cols: ['#4C2620', '#5A3028', '#3A1C18'], dir: (x, y) => Math.atan2((y - cy) / RY, (x - cx) / RX) + (S.r() - 0.5) * 0.5, len: [16, 30], wid: [6, 10], cover: 1.3 * wi, alpha: 0.7, dry: 0.6 });
    }
    // kabuk içi kenarında ince gölge (çukur): üst-sol iç kenar
    fill(S, inn.path, wi ? '#2E1612' : AP[0], { clip: [inn.path, crescent(inn.path, inn.bb, -RY * 0.1)], height: false, alpha: 0.55 });
    // --- zarlar: özden kabuğa uzanan, kalınlığı değişen, dallanan duvarlar (u,v)
    const coreR = 0.11; const memb = [];
    // eşit olmayan aralıklı 5 ana duvar; bazıları özden değil ortadan başlar, kavisleri güçlü (tekerlek değil)
    const nM = 5; const m0 = rr() * 0.6; const gaps = [1.3, 0.75, 1.15, 0.85, 1.25].map((g) => g * (0.9 + rr() * 0.2)); const gs = gaps.reduce((a2, b2) => a2 + b2, 0);
    let acc = 0;
    for (let i = 0; i < nM; i++) {
      const a = m0 + (acc / gs) * TAU; acc += gaps[i]; const bend = (rr() < 0.5 ? -1 : 1) * (0.35 + rr() * 0.6); const ph = rr() * 6;
      const r0 = i === 1 || i === 3 ? 0.3 + rr() * 0.12 : coreR * 0.7;
      const pts = []; for (let j = 0; j <= 16; j++) { const t = r0 + (j / 16) * (lobR(a) + 0.01 - r0); const aa = a + bend * Math.sin(t * Math.PI * 0.9) * (0.6 + 0.4 * t) + 0.05 * Math.sin(t * 13 + ph); pts.push([Math.cos(aa) * t, Math.sin(aa) * t]); }
      const w0 = 0.034 + rr() * 0.018, w1 = 0.014 + rr() * 0.01; const bulge = 0.4 + rr() * 0.8;
      const bt = 0.3 + rr() * 0.45; memb.push({ pts, hw: (t) => (lerp(w0, w1, t) + bulge * 0.016 * Math.exp(-Math.pow((t - bt) / 0.12, 2))) * (0.75 + 0.5 * NOISE(t * 9 + i * 3, 1.7)), a, ph });
      if (rr() < 0.7) { // dal: orta-dış bölümden yana ayrılan kısa duvar
        const j0 = 7 + Math.floor(rr() * 5); const p0 = pts[j0]; const da = (rr() < 0.5 ? 1 : -1) * (0.45 + rr() * 0.3); const L = 0.75; const bp = [];
        const base = Math.atan2(p0[1], p0[0]);
        for (let j = 0; j <= 12; j++) { const t = j / 12; const aa = base + da * t; const rad = Math.hypot(p0[0], p0[1]) + L * t; const r1 = Math.min(rad, lobR(aa) + 0.01); bp.push([Math.cos(aa) * r1, Math.sin(aa) * r1]); if (rad >= lobR(aa) + 0.01) break; }
        const wb = 0.018 + rr() * 0.008; memb.push({ pts: bp, hw: (t) => lerp(wb, wb * 0.6, t) * (0.75 + 0.5 * NOISE(t * 7 + i, 5.1)) * Math.min(1, 0.55 + t * 4), a: base, ph, branch: true });
      }
    }
    // kabuk dibi cepleri (taneler yok, gölgeli krem çukur)
    const pockets = [[0.6, -0.22, 0.16, 0.12, 0.5], [-0.34, 0.52, 0.13, 0.1, -0.3]];
    // --- taneler: sarsıntılı altıgen tohumlar + ağırlıklı (güç) Voronoi hücreleri → bastırılmış yüzler
    const ar = 0.088; const seeds = [];
    for (let j = -16; j <= 16; j++) for (let i = -16; i <= 16; i++) {
      let u = (i + (j % 2 ? 0.5 : 0)) * ar * 1.78, v = j * ar * 1.54;
      u += (rr() - 0.5) * ar * 1.2; v += (rr() - 0.5) * ar * 1.2;
      const rad = Math.hypot(u, v); const a = Math.atan2(v, u);
      const sz = ar * (0.75 + rr() * 0.55);
      if (rad > lobR(a) - sz * 0.25 || rad < coreR + sz * 0.3) continue;
      if (pockets.some(([pu, pv, prx, pry]) => Math.hypot((u - pu) / prx, (v - pv) / pry) < 1.0)) continue;
      let ok = true; for (const m of memb) { const [d, , , t] = nearestOn(u, v, m.pts); if (d < m.hw(t) + sz * 0.12) { ok = false; break; } }
      if (!ok) continue;
      seeds.push({ u, v, r: sz, sd: Math.floor(rr() * 1e6) });
    }
    const gap = 0.006;
    for (const s0 of seeds) {
      let P = []; for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; P.push([s0.u + Math.cos(a) * s0.r * 1.32, s0.v + Math.sin(a) * s0.r * 1.32]); }
      for (const s1 of seeds) {
        if (s1 === s0) continue; const dx = s1.u - s0.u, dy = s1.v - s0.v; const d2 = dx * dx + dy * dy; if (d2 > Math.pow((s0.r + s1.r) * 1.35 + 0.02, 2)) continue;
        // güç bisektörü: 2(c1-c0)·p <= |c1|²-|c0|² - r1² + r0²  (boşluk payı ile)
        const b = (s1.u * s1.u + s1.v * s1.v - s0.u * s0.u - s0.v * s0.v - s1.r * s1.r + s0.r * s0.r) - gap * Math.sqrt(d2) * 2;
        P = clipHalf(P, 2 * dx, 2 * dy, b); if (P.length < 3) break;
      }
      if (P.length < 3) { s0.cell = null; continue; }
      for (const m of memb) { const [d, qx, qy, t] = nearestOn(s0.u, s0.v, m.pts); const need = m.hw(t) + gap; if (d < s0.r * 1.3 + need && d > 1e-4) { const nx = (s0.u - qx) / d, ny = (s0.v - qy) / d; P = clipHalf(P, -nx, -ny, -(nx * qx + ny * qy + need)); } if (P.length < 3) break; }
      if (P.length >= 3) { const a = Math.atan2(s0.v, s0.u); for (const da of [-0.12, 0, 0.12]) { const aa = a + da; P = clipHalf(P, Math.cos(aa), Math.sin(aa), lobR(aa) - gap * 1.5); } }
      if (P.length >= 3) { const rad = Math.hypot(s0.u, s0.v) || 1; P = clipHalf(P, -s0.u / rad, -s0.v / rad, -(coreR + gap)); }
      s0.cell = P.length >= 3 && polyArea(P) > Math.PI * s0.r * s0.r * 0.12 ? P : null;
    }
    // kuruma: büzüş, kümelenerek en yakın duvara (zar ya da kabuk) çekil, bir kısmı yok
    const wr = rng(1291);
    const cells = [];
    for (const s0 of seeds) {
      if (!s0.cell) continue;
      let P = s0.cell; const [ccx, ccy] = polyCen(P);
      if (wi) {
        if (wr() < 0.08 * wi) continue;
        const f = 1 - wi * (0.2 + wr() * 0.24);
        // en yakın duvar
        let best = [1e9, 0, 0]; for (const m of memb) { const q = nearestOn(ccx, ccy, m.pts); if (q[0] < best[0]) best = q; }
        const a = Math.atan2(ccy, ccx); const rad = Math.hypot(ccx, ccy); const dr = lobR(a) - rad;
        let tx = 0, ty = 0; if (dr < best[0]) { tx = Math.cos(a) * dr; ty = Math.sin(a) * dr; } else { tx = best[1] - ccx; ty = best[2] - ccy; }
        const tl = Math.hypot(tx, ty) || 1; const pull = Math.max(0, tl - s0.r * f * 0.8) * 0.85 * wi;
        P = P.map(([x, y]) => [ccx + (x - ccx) * f + tx / tl * pull, ccy + (y - ccy) * f + ty / tl * pull]);
        P = P.map(([x, y], i) => [x + (wr() - 0.5) * s0.r * 0.25 * wi, y + (wr() - 0.5) * s0.r * 0.25 * wi]);
        P = hull(P);
      }
      cells.push({ P, v: polyCen(P)[1], s0 });
    }
    cells.sort((a, b) => a.v - b.v);
    const hgtK = RX * ar * 0.55 * (1 - wi * 0.4); // tane kabarıklığı (ekran yukarı)
    for (const c of cells) {
      const Fp = c.P.map(([u, v]) => F(u, v));
      arilCell(S, Fp, hgtK * (0.7 + 0.6 * (c.s0.r / ar - 0.75)), AP, wi, c.s0.sd, { glow: wi ? 0.15 : 0.55 });
    }
    // cepler: krem çukur, üst-sol iç kenarı gölgeli
    for (const [pu, pv, prx, pry, rot] of pockets) {
      const pts = blobPts(0, 0, prx, pry, 11, 0.32, Math.floor(pu * 100 + 7), rot).map(([u, v]) => F(pu + u, pv + v));
      const ps = shape(pts, 0.45);
      layer(S, { clip: ps.path, bb: ps.bb, cols: [MP[3], MP[4]], base: MP[3], dir: rot, dirJit: 0.4, len: [10, 18], wid: [5, 8], cover: 1.6, rim: false });
      fill(S, ps.path, MP[1], { clip: [ps.path, crescent(ps.path, ps.bb, -RY * 0.09)], height: false, alpha: 0.95 });
    }
    // zarlar: tanelerin üstünü örten krem duvarlar (gölge yanı koyu, ışık yanı açık sırt)
    withClip(S, face.path, () => {
      const mr = rng(1301);
      for (const m of memb) {
        let segs = [m.pts];
        if (wi) { // kuru: buruşuk, kırık, yer yer çökmüş
          const col = mr() < 0.35 ? 0.05 : 0.016; const P2 = m.pts.map(([u, v], j) => [u + (mr() - 0.5) * 0.024 * wi + Math.sin(j * 1.7 + m.ph) * col * wi, v + (mr() - 0.5) * 0.024 * wi + Math.cos(j * 1.3 + m.ph) * col * 0.6 * wi]);
          segs = []; let cur = []; for (let j = 0; j < P2.length; j++) { if (mr() < 0.16 * wi && cur.length > 2) { segs.push(cur); cur = []; j += 1 + Math.floor(mr() * 2); continue; } cur.push(P2[j]); } if (cur.length > 1) segs.push(cur);
        }
        for (const sg of segs) {
          const n = sg.length; if (n < 2) continue;
          const N = sg.map((p, j) => { const a = sg[Math.max(0, j - 1)], b = sg[Math.min(n - 1, j + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
          const t0 = m.pts.indexOf(sg[0]) >= 0 ? m.pts.indexOf(sg[0]) / (m.pts.length - 1) : 0;
          const hwj = (j) => m.hw(t0 + (j / (n - 1)) * (1 - t0)) * (wi ? 0.7 + 0.6 * mr() : 1);
          const L1 = [], R1 = []; for (let j = 0; j < n; j++) { const hw = hwj(j); L1.push(F(sg[j][0] + N[j][0] * hw, sg[j][1] + N[j][1] * hw)); R1.push(F(sg[j][0] - N[j][0] * hw, sg[j][1] - N[j][1] * hw)); }
          const wall = shape([...L1, ...R1.reverse()], 0.4);
          fill(S, wall.path, MP[wi ? 2 : 3], { h: 158 });
          fill(S, wall.path, MP[wi ? 0 : 1], { clip: [wall.path, crescent(wall.path, wall.bb, -RY * 0.035)], height: false, alpha: 0.9 });
          fill(S, wall.path, MP[wi ? 4 : 5], { clip: [wall.path, crescent(wall.path, wall.bb, RY * 0.028)], height: false, alpha: 0.95 });
        }
      }
      // öz: düzensiz krem çekirdek
      const core = shape(blobPts(cx + RX * 0.01, cy + RY * 0.01, RX * coreR * 1.15, RY * coreR * 1.3, 12, 0.22, 1231), 0.5);
      layer(S, { clip: core.path, bb: core.bb, cols: [MP[2], MP[3], MP[4]], base: MP[3], shade: (x, y) => clamp(0.5 + (cx - x) / (RX * 0.25)), dir: 0.3, len: [10, 18], wid: [5, 8], cover: 1.8, rim: false });
      fill(S, core.path, MP[1], { clip: [core.path, crescent(core.path, core.bb, -RY * 0.05)], height: false, alpha: 0.8 });
    });
    // yüzün üst kenarında kabuk dudağı: ışığa bakan ince parlak çizgi
    const lip = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * 1.05 + (i / 24) * Math.PI * 0.75; lip.push(F(Math.cos(a), Math.sin(a))); }
    line(S, lip, 2.6, wi ? NP[5] : NP[6], { w1: 1.2, taper: true, height: false });
    // önde dökülmüş birkaç tane, temas gölgeli (kuruyunca soluk, büzüşük)
    const loose = [[322, 352, 0.4], [356, 368, -0.5], [390, 350, 0.9], [298, 374, 0.1]];
    const LP = wi ? AP.map((c) => shade(c, 0.06, 0.85)) : AP;
    for (const [lx, ly, rot] of loose) {
      const x = lx * K, y = ly * K; const f = 1 - wi * 0.3; const rx = 15 * K * f, ry = 10 * K * f;
      contactShadow(S, x + 5 * K, y + ry * 0.75, rx * 1.15, ry * 0.5, { seed: lx + ly, coreX: 0.6, coreY: 0.55 });
      const pts = blobPts(x, y + ry * 0.3, rx, ry * 0.75, 9, wi ? 0.22 : 0.12, Math.floor(lx * 7 + ly), rot * 0.3);
      arilCell(S, pts, ry * 0.9, LP, wi, Math.floor(lx * 7 + ly), { rim: true, glow: wi ? 0.15 : 0.6 });
    }
    // pivot: yarım narın görsel merkezi
    return done(S, cx, cy + (DOWN - RY) * 0.5 + 6 * K, 0.4);
  }
  reg('nar-acik', () => paintNarAcik(0), { size: [465, 327], base: [0, 125] });
  reg('nar-acik-kuru', () => paintNarAcik(1), { size: [443, 319], base: [0, 122] });

  // ================================================================ ÜZÜM
  // tek tane: az sayıda, büyük, keskin ton basamağı (taban, gölge hilali, ışık düzlemi, vurgu) — her basamak görünür
  // geniş bir fırça izi (en ≥ 0.5 r). o.raisin: kuru üzüm, o.glow: yeşil üzümde içten ışık, o.bloom: mat buğu lekesi
  const grapeShape = (x, y, r, sd, raisin) => { const r2 = rng(sd); return shape(blobPts(x, y, r * (1 + raisin * 0.03), r * (1.05 - raisin * 0.12), raisin ? 12 : 16, raisin ? 0.12 : 0.025, sd, (r2() - 0.5) * 0.8), 0.5); };
  function grape(S, x, y, r, P0, o = {}) {
    const K = S.k; const sd = o.seed ?? 1; const r2 = rng(sd + 7); const rs = r / K;
    const raisin = o.raisin ?? 0;
    const dh = (r2() - 0.5) * (o.hueJit ?? 10), dl = (r2() - 0.5) * 0.035 + (o.dl ?? 0);
    const P = P0.map((c, i) => (i < P0.length - 1 ? shade(c, dl, 1, dh) : c));
    const sh = grapeShape(x, y, r, sd, raisin); const bp = sh.path; const bb = sh.bb;
    if (o.rim) S.rim(bp, { w: clamp(rs * 0.06, 1, 2.2), alpha: 0.9 });
    const dk = o.dark ?? 0; const C = (i) => P[clamp(i - dk, 0, P.length - 2)];
    const sw = Math.max(rs * 0.55, 3); const dirA = -0.8 + (r2() - 0.5) * 0.5;
    const strokes = (cx0, cy0, rad, col, n, ang, a = 0.95) => { for (let i = 0; i < n; i++) dab(S, cx0 + (r2() - 0.5) * rad, cy0 + (r2() - 0.5) * rad, ang + (r2() - 0.5) * 0.35, rs * (1.1 + r2() * 0.5), sw * (0.85 + r2() * 0.3), shade(col, (r2() - 0.5) * 0.025), { alpha: a, dry: 0.35 }); };
    // 1) taban
    fill(S, bp, C(3), { h: 138 });
    withClip(S, bp, () => strokes(x, y, r * 0.9, C(3), 3, dirA));
    // 2) gölge hilali (sağ alt) + ince serin yansıma kenarı
    const shC = [bp, crescent(bp, bb, r * (o.shadowD ?? 0.5))];
    withClip(S, shC, () => { fill(S, bp, C(1), { height: false }); strokes(x - LX * r * 0.5, y - LY * r * 0.5, r * 0.6, C(1), 2, dirA + 1.3); });
    if (!raisin && o.refl !== false) withClip(S, [bp, crescent(bp, bb, r * 0.13)], () => fill(S, bp, o.refl ?? shade(C(2), 0.02, 1.1, -14), { height: false, alpha: 0.95 }));
    // 3) içten ışık (yeşil): gölge tarafında sıcak açık lunk
    if (o.glow) withClip(S, shC, () => fill(S, ellipsePath(x - LX * r * 0.34, y - LY * r * 0.34, r * 0.44, r * 0.3, -0.75), o.glowC ?? C(5), { alpha: o.glow, height: false }));
    // 4) ışık düzlemi (sol üst) ve açık vurgu katı
    const lx = x + LX * r * 0.24, ly = y + LY * r * 0.24;
    const litP = ellipsePath(lx, ly, r * 0.64, r * 0.6, -0.7);
    withClip(S, [bp, litP], () => { fill(S, bp, C(4), { h: 152, ridge: false }); strokes(lx, ly, r * 0.4, C(4), 2, dirA); });
    if (!o.dark && r2() < (o.accent ?? 0.8)) { const ax = x + LX * r * 0.44, ay = y + LY * r * 0.44; const ar2 = r * (0.26 + r2() * 0.12); withClip(S, [bp, ellipsePath(ax, ay, ar2 * 1.15, ar2, -0.7)], () => { fill(S, bp, C(5), { height: false }); dab(S, ax, ay, dirA, rs * 0.7, rs * 0.42, C(5), { alpha: 0.9, height: false }); }); }
    // 5) buğu: mat lavanta lekeleri (vurgunun bir kısmını örter)
    if (o.bloom) withClip(S, bp, () => { const bx = x + (r2() - 0.2) * r * 0.5, by = y + (r2() - 0.1) * r * 0.5; const n = 3 + Math.floor(r2() * 3); for (let i = 0; i < n; i++) dab(S, bx + (r2() - 0.5) * r * 0.7, by + (r2() - 0.5) * r * 0.6, -0.4 + (r2() - 0.5) * 0.6, rs * (0.28 + r2() * 0.22), rs * (0.16 + r2() * 0.1), o.bloomC ?? P[6], { alpha: o.bloom * (0.7 + r2() * 0.3), height: false, dry: 0.9 }); });
    if (raisin) {
      // yumuşak kıvrımlar: koyu kahve oluk + sol üstte ışık alan sırt
      withClip(S, bp, () => {
        const nF = 2 + Math.floor(r2() * 3);
        for (let i = 0; i < nF; i++) {
          const a = r2() * TAU; const x0 = x + Math.cos(a) * r * 0.32, y0 = y + Math.sin(a) * r * 0.32; const d = a + Math.PI / 2 + (r2() - 0.5) * 0.8;
          const q = []; for (let j = 0; j <= 6; j++) { const t = j / 6 - 0.5; q.push([x0 + Math.cos(d) * r * 1.05 * t + Math.sin(t * 6 + i) * r * 0.06, y0 + Math.sin(d) * r * 1.05 * t]); }
          crease(S, q, clamp(rs * 0.16, 1.6, 4.5), P[1], P[5], { alpha: 0.6 });
        }
      });
      fill(S, ellipsePath(x + LX * r * 0.42, y + LY * r * 0.46, r * 0.13, r * 0.09, -0.6), P[6], { alpha: 0.75, height: false });
    } else if (!o.dark || r2() < 0.4) {
      // 6) parıltı: boyu ve yeri değişken (bazen ikinci küçük nokta)
      const hs = 0.6 + r2() * 0.9; const hx = x + LX * r * (0.46 + r2() * 0.18) + (r2() - 0.5) * r * 0.16, hy = y + LY * r * (0.52 + r2() * 0.14);
      fill(S, ellipsePath(hx, hy, r * 0.12 * hs, r * 0.08 * hs, -0.65), P[7], { alpha: o.dark ? 0.6 : 0.95, height: false });
      if (r2() < 0.35) fill(S, ellipsePath(hx + r * 0.24, hy - r * 0.06, r * 0.045 * hs, r * 0.035 * hs, -0.6), P[7], { alpha: 0.7, height: false });
    }
    return sh;
  }
  // salkım yerleşimi: üst (cx, top), genişlik W, boy H, tane r (büyük taneler, gevşek koni)
  function bunchLayout(cx, top, W, Hh, r, seed, o = {}) {
    const R = rng(seed); const front = [], back = [];
    const hw = (t) => (W / 2) * (t < 0.16 ? 0.72 + t * 1.75 : Math.pow(Math.max(0, 1 - (t - 0.16) / 0.9), 0.62)) * (1 + (o.wing ?? 0.18) * Math.exp(-Math.pow((t - 0.3) / 0.12, 2)));
    const rows = Math.max(3, Math.round((Hh - 2 * r) / (r * 1.48)));
    for (let j = 0; j <= rows; j++) {
      const t = j / rows; const y = top + r + t * (Hh - 2 * r);
      const half = Math.max(0, hw(t) - r * 0.7); const n = Math.max(1, Math.round((half * 2) / (r * 1.78)) + 1);
      const skew = (o.skew ?? 0) * t * W * 0.2 + Math.sin(t * 4 + seed) * r * 0.3;
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        const x = cx + skew + u * half + (j % 2 ? r * 0.28 : -r * 0.18) + (R() - 0.5) * r * 0.45;
        front.push([x, y + (R() - 0.5) * r * 0.4, r * (0.88 + R() * 0.22), Math.abs(u), t]);
        if (i < n - 1 && R() < 0.9) back.push([x + half / Math.max(1, n - 1), y - r * 0.62, r * (0.88 + R() * 0.16)]);
      }
    }
    return { front, back, hw };
  }
  // asma yaprağı: beş loblu, dişli; (x,y) merkez, R yarıçap, ang sap yönünün tersi (uç yönü); sy: dikey basıklık (yatık yaprak)
  function vineLeafPts(x, y, R, ang, seed, sy = 1) {
    const r = rng(seed); const pts = []; const n = 90;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU; // a=0: uç
      const lobe = 0.62 + 0.38 * Math.pow(Math.abs(Math.cos(a * 2.5)), 1.6);
      const sinus = 1 - 0.55 * Math.exp(-Math.pow((Math.abs(((a + Math.PI) % TAU) - Math.PI) - Math.PI) / 0.32, 2));
      const serr = 1 + (i % 3 === 0 ? 0.05 : -0.015);
      const rr2 = R * lobe * sinus * serr * (1 + (r() - 0.5) * 0.04);
      pts.push([x + Math.cos(a + ang) * rr2, y + Math.sin(a + ang) * rr2 * sy]);
    }
    return pts;
  }
  function vineLeaf(S, x, y, R, ang, P, seed, o = {}) {
    const K = S.k; const Rs = R / K; const sy = o.sy ?? 1;
    const pts = vineLeafPts(x, y, R, ang, seed, sy); const sh = shape(pts, 0.3);
    const ldir = (px, py) => Math.atan2((py - y) / sy, px - x) + (S.r() - 0.5) * 0.4;
    layer(S, { clip: sh.path, bb: sh.bb, cols: [P[1], P[2]], base: P[2], dir: ldir, len: [Rs * 0.25, Rs * 0.5], wid: [clamp(Rs * 0.1, 4, 12), clamp(Rs * 0.16, 5, 16)], cover: 1.4, rim: { w: 1.6, alpha: 0.85 } });
    // ışık katı (sol üst yarı) ve açık lekeler
    const lc = [x + LX * R * 0.35, y + LY * R * 0.35 * sy];
    layer(S, { clip: [sh.path, smoothPath(blobPts(lc[0], lc[1], R * 0.8, R * 0.7 * sy, 16, 0.08, seed + 3, 0.5))], bb: sh.bb, cols: [P[3], P[4]], base: P[3], dir: ldir, len: [Rs * 0.22, Rs * 0.45], wid: [clamp(Rs * 0.09, 4, 11), clamp(Rs * 0.14, 5, 15)], cover: 1.3, shade: (px, py) => clamp(0.95 - Math.hypot(px - lc[0], (py - lc[1]) / sy) / (R * 0.75)) });
    // damarlar: beş ana damar + ikinciller
    const vc = o.vein ?? shade(P[4], 0.1, 0.75);
    for (let i = 0; i < 5; i++) {
      const a = ang + (i - 2) * 0.98; const L = R * (i === 2 ? 0.8 : i === 0 || i === 4 ? 0.5 : 0.68);
      const q = []; for (let j = 0; j <= 6; j++) { const t = j / 6; q.push([x + Math.cos(a + Math.sin(t * 2) * 0.06) * L * t, y + Math.sin(a + Math.sin(t * 2) * 0.06) * L * t * sy]); }
      line(S, q, clamp(Rs * 0.035, 1.4, 3.4), vc, { w1: 0.6, height: false });
      for (let m = 1; m <= 2; m++) { const t = 0.35 + m * 0.2; const p0 = q[Math.round(t * 6)]; for (const sd2 of [-1, 1]) { const a2 = a + sd2 * 0.7; line(S, [p0, [p0[0] + Math.cos(a2) * L * 0.25, p0[1] + Math.sin(a2) * L * 0.25 * sy]], clamp(Rs * 0.02, 1, 2), vc, { w1: 0.5, height: false }); } }
    }
    return sh;
  }
  const GRAPE_G = ['#2E4A10', '#4A6A16', '#6C9220', '#93B42A', '#BCD43C', '#DDEA6A', '#F2F6B0', '#FDFFE8'];
  const grapeOpt = (kind, P) => kind === 'mor' ? { bloom: 0, refl: '#4E3E9A' } : kind === 'yesil' ? { glow: 0.75, glowC: '#E4EE7A', refl: '#7A9A2E', bloom: 0 } : { raisin: 1 };
  function paintUzum(kind) {
    // kind: 'mor' | 'kuru' | 'yesil'
    const k = 1.6, K = k; const w = 360 * K, h = 470 * K;
    const S = Paint.sprite(w, h, { seed: kind === 'yesil' ? 1402 : 1401, k });
    const dry = kind === 'kuru'; const P = kind === 'yesil' ? GRAPE_G : dry ? PAL.raisin : PAL.grapeP;
    const seed = kind === 'yesil' ? 77 : 41;
    const cx = 178 * K, top = 100 * K; const r = 33 * K;
    const L = bunchLayout(cx, top, 268 * K, 330 * K, r, seed, { skew: kind === 'yesil' ? -0.5 : 0.6, wing: kind === 'yesil' ? 0.1 : 0.22 });
    if (dry) { const tc = (q) => { q[0] = cx + (q[0] - cx) * 0.88; q[1] = top + (q[1] - top) * 0.9; }; L.front.forEach(tc); L.back.forEach(tc); } // kuru: salkım toplanır
    const shrink = (sd) => (dry ? 0.62 + rng(sd + 3)() * 0.24 : 1); // bazıları dolgun kalır
    // yaprak (salkımın arkasında, sol üst) — kuruyunca sararmış
    const LP = dry ? PAL.leafK : PAL.leaf;
    if (kind !== 'yesil') vineLeaf(S, 110 * K, 94 * K, 84 * K * (dry ? 0.92 : 1), -2.5, LP, 7, { vein: dry ? '#E6CE8A' : undefined });
    else vineLeaf(S, 252 * K, 94 * K, 78 * K, -0.7, LP, 9);
    // sap: üstte odunsu dal, salkıma iner
    const SP = dry ? PAL.stem.map((c) => shade(c, -0.04, 0.8)) : PAL.stem;
    const stalk = kind === 'yesil' ? [[150 * K, 26 * K], [166 * K, 52 * K], [176 * K, 84 * K], [178 * K, 130 * K]] : [[212 * K, 24 * K], [198 * K, 52 * K], [184 * K, 84 * K], [180 * K, 130 * K]];
    line(S, crPts(stalk, 4), 11, SP[2], { w1: 6, rim: { w: 1.4, alpha: 0.85 } });
    line(S, crPts(stalk, 4).map(([x, y]) => [x - 2.5 * K, y - 1 * K]), 4, SP[4], { w1: 2, height: false });
    fill(S, ellipsePath(stalk[0][0], stalk[0][1], 6 * K, 4 * K, 0.4), SP[4], { h: 150 });
    // sülük (kıvrık filiz)
    const tq = []; const t0x = (kind === 'yesil' ? 166 : 196) * K, t0y = 50 * K; const sgn = kind === 'yesil' ? -1 : 1;
    for (let i = 0; i <= 30; i++) { const t = i / 30; const a = t * 9 + 0.5; const rad = (16 - t * 11) * K; tq.push([t0x + sgn * (t * 40 * K + Math.cos(a) * rad), t0y - t * 18 * K + Math.sin(a) * rad * 0.8]); }
    line(S, tq, 3.4, dry ? SP[3] : '#6E8A2A', { w1: 1.4, height: false });
    // salkım içi saplar
    for (let i = 0; i < 5; i++) { const g = L.front[(i * 2) % L.front.length]; line(S, [[180 * K, 122 * K], [g[0], g[1] - r * 0.4]], 3.4, SP[2], { w1: 2, height: false }); }
    // astar kenarı yalnız salkımın dış hattında: önce kenar tanelerin astarı, sonra taneler üstüne
    const nb = L.back.length; const opt = grapeOpt(kind, P);
    const fr = L.front.map((g, j) => [...g, seed * 100 + nb + j]).sort((a, b) => a[1] - b[1]);
    // salkım ölçeğinde ışık: sol üst taneler bir tık açık, sağ alttakiler koyu
    const gl = (x, y) => clamp(((cx - x) / (134 * K)) * 0.03 + ((top + 120 * K - y) / (340 * K)) * 0.05, -0.05, 0.04);
    const bloomPick = (sd) => kind === 'mor' && rng(sd + 11)() < 0.32 ? 0.42 : kind === 'yesil' && rng(sd + 11)() < 0.18 ? 0.3 : 0;
    for (const [x, y, rr0, u, t, sd] of fr) if (u > 0.6 || t > 0.8 || t < 0.08) S.rim(grapeShape(x, y, rr0 * shrink(sd), sd, dry ? 1 : 0).path, { w: 2, alpha: 0.9 });
    let i = 0;
    for (const [x, y, rr0] of L.back) { const sd = seed * 100 + i++; grape(S, x, y, rr0 * shrink(sd), P, { ...opt, seed: sd, dark: 1, dl: gl(x, y) - 0.03, bloom: bloomPick(sd) * 0.6 }); }
    for (const [x, y, rr0, u, t, sd] of fr) grape(S, x, y, rr0 * shrink(sd), P, { ...opt, seed: sd, dl: gl(x, y), bloom: bloomPick(sd), bloomC: kind === 'yesil' ? '#E8F0C8' : '#B4A6DC' });
    return done(S, cx, 250 * K, 0.4);
  }
  reg('uzum', () => paintUzum('mor'), { size: [306, 423], base: [0, 183] });
  reg('uzum-kuru', () => paintUzum('kuru'), { size: [277, 372], base: [0, 138] });
  reg('uzum-yesil', () => paintUzum('yesil'), { size: [297, 408], base: [0, 174] });

  // ================================================================ ÜZÜM YATIK (sofrada yatan salkım; tabla düzleminde kısalmış, ışık sol üstten)
  // 3B yerleşim: eksen x (sap solda), tabla düzleminde y (izleyiciye +), yükseklik z. Ekran: X = x, Y = y·E − z·C
  const YATIK = { E: 0.36, C: 0.93 };
  function yatikLayout(seed) {
    const R = rng(seed); const r = 30; const out = [];
    const L0 = -128, L1 = 128; const rot = 0.2; const cr = Math.cos(rot), sr = Math.sin(rot);
    const prof = (t) => 94 * (t < 0.2 ? 0.72 + t * 1.4 : Math.pow(Math.max(0, 1 - (t - 0.2) / 0.86), 0.6)) + 6;
    // yukarıdan aşağıya doğru örnekle (görünür üst kat önce dolsun)
    for (let tries = 0; tries < 2400 && out.length < 46; tries++) {
      const t = R(); const x = lerp(L0, L1, t); const pr = prof(t);
      const phi = R() * Math.PI; // eksen etrafında üst yarı (0: izleyiciye, π: arkaya)
      const rad = pr * Math.sqrt(R()) ;
      const y = Math.cos(phi) * rad; const z = r + Math.sin(phi) * rad * 0.78 * (1 - Math.abs(y) / (pr + 1) * 0.3);
      if (out.some((q) => Math.hypot(q.x - x, q.y - y, q.z - z) < r * 1.78)) continue;
      out.push({ x, y, z, r: r * (0.9 + R() * 0.18), t });
    }
    // tabla düzleminde hafif döndür (uç izleyiciye-sağa)
    for (const q of out) { const x = q.x * cr - q.y * sr, y = q.x * sr + q.y * cr; q.x = x; q.y = y; q.depth = q.y * YATIK.C + q.z * YATIK.E; }
    out.sort((a, b) => a.depth - b.depth);
    return out;
  }
  function paintUzumYatik(dry) {
    const k = 1.6, K = k; const w = 470 * K, h = 290 * K;
    const S = Paint.sprite(w, h, { seed: 1451, k }); const P = dry ? PAL.raisin : PAL.grapeP;
    const cx = 250 * K, cy = 170 * K; // pivot: salkımın tabla izinin merkezi
    const B = yatikLayout(43); const { E, C } = YATIK;
    if (dry) for (const q of B) { q.x *= 0.9; q.y *= 0.88; q.z = 30 + (q.z - 30) * 0.8; }
    const scr = (x, y, z) => [cx + x * K, cy + (y * E - z * C) * K];
    // tabla gölgesi (tek yol, düzgün saydamlık): tanelerin değme izleri sağa-aşağı kaymış
    const sh1 = new Path2D(), sh2 = new Path2D();
    for (const q of B) { const [x, y] = scr(q.x, q.y, 0); sh1.ellipse(x + 16 * K, y + 7 * K, q.r * 1.25 * K, q.r * E * 1.35 * K, 0, 0, TAU); sh2.ellipse(x + 8 * K, y + 3 * K, q.r * 0.9 * K, q.r * E * 0.95 * K, 0, 0, TAU); }
    // yaprak: tablada yatan asma yaprağı (sap ucunda, salkımın altında)
    const LP = dry ? PAL.leafK : PAL.leaf;
    vineLeaf(S, cx - 120 * K, cy - 6 * K, 92 * K * (dry ? 0.92 : 1), -2.75, LP, 17, { sy: E * 1.25, vein: dry ? '#E6CE8A' : undefined });
    fill(S, sh1, SHC[1], { alpha: 0.3, height: false }); fill(S, sh2, SHC[0], { alpha: 0.34, height: false });
    // sap: salkımın geniş ucundan sola, tablaya yaslanmış odunsu dal + kısa yan dal
    const SP = dry ? PAL.stem.map((c) => shade(c, -0.04, 0.8)) : PAL.stem;
    const st = [scr(-150, -10, 40), scr(-190, -4, 34), scr(-226, 8, 22), scr(-246, 16, 14)];
    line(S, crPts(st, 4), 10, SP[2], { w1: 6, rim: { w: 1.4, alpha: 0.85 } });
    line(S, crPts(st, 4).map(([x, y]) => [x - 1.5 * K, y - 2.5 * K]), 3.6, SP[4], { w1: 2, height: false });
    fill(S, ellipsePath(st[3][0], st[3][1], 4.5 * K, 6 * K, 0.3), SP[4], { h: 150 });
    const tq = []; for (let i = 0; i <= 26; i++) { const t = i / 26; const a = t * 8.5 + 1; const rad = (14 - t * 9) * K; tq.push([st[1][0] + t * 26 * K + Math.cos(a) * rad, st[1][1] - t * 30 * K + Math.sin(a) * rad * 0.8]); }
    line(S, tq, 3.2, dry ? SP[3] : '#6E8A2A', { w1: 1.3, height: false });
    // salkım içi saplar (üst taneler arasında görünür)
    const topB = B.filter((q) => q.z > 50).slice(-6);
    for (const q of topB) { const [x, y] = scr(q.x, q.y, q.z + q.r * 0.6); line(S, [scr(-140, -8, 48), [x, y]], 3, SP[2], { w1: 1.8, height: false }); }
    // taneler (uzaktan yakına); astar yalnız dış hatta: önce hepsinin astarı, sonra taneler
    const opt = grapeOpt(dry ? 'kuru' : 'mor', P);
    const shrink = (sd) => (dry ? 0.62 + rng(sd + 3)() * 0.24 : 1);
    for (const q of B) { const [x, y] = scr(q.x, q.y, q.z); const sd = 4500 + Math.round(q.x * 3 + q.y * 7); S.rim(grapeShape(x, y, q.r * K * shrink(sd), sd, dry ? 1 : 0).path, { w: 2, alpha: 0.9 }); }
    for (const q of B) {
      const [x, y] = scr(q.x, q.y, q.z); const sd = 4500 + Math.round(q.x * 3 + q.y * 7);
      const low = q.z < 40 && q.y < 0; // arkada, alt katta: gölgede
      const gl = clamp(((q.z - 40) / 60) * 0.04 - (q.x / 300) * 0.02, -0.05, 0.04);
      grape(S, x, y, q.r * K * shrink(sd), P, { ...opt, seed: sd, dark: low ? 1 : 0, dl: gl, bloom: !dry && rng(sd + 11)() < 0.32 ? 0.42 : 0, bloomC: '#B4A6DC' });
    }
    return done(S, cx, cy, 0.4);
  }
  reg('uzum-yatik', () => paintUzumYatik(false), { size: [423, 184], base: [0, 34] });
  reg('uzum-yatik-kuru', () => paintUzumYatik(true), { size: [410, 161], base: [0, 32] });

  // ---- serbest biçimli gövde için basamaklı tonlar (gövdenin kaydırılmış/küçültülmüş kopyalarıyla katlar)
  // o: c=[cx,cy] ölçek merkezi, size (sprite px, tipik yarıçap), P (8-9 renk), dir, sL, sW
  //    litD/litS: aydınlık kat kayması/ölçeği, lightD/lightS, shadowD, refl, hi: [x,y,rx,ry,rot] vurgu elipsi
  function toneShape(S, body, o) {
    const P = o.P; const bp = body.path, bb = body.bb; const [cx, cy] = o.c; const z = o.size; const dir = o.dir; const sL = o.sL, sW = o.sW;
    const mv = (d, sc) => moved(bp, LX * z * d, LY * z * d, sc, cx, cy);
    layer(S, { clip: bp, bb, cols: [P[2], P[3], P[3]], base: P[3], dir, len: sL, wid: sW, cover: o.cover ?? 1.3, rim: o.rim === false ? false : { w: o.rimW ?? 2, alpha: 0.9 } });
    if (o.shadowD !== 0) layer(S, { clip: [bp, crescent(bp, bb, z * (o.shadowD ?? 0.4))], bb, cols: [P[1], P[2]], dir, len: sL, wid: sW, soft: true, cover: 2.4 });
    if (o.refl) fill(S, bp, o.refl, { clip: [bp, crescent(bp, bb, z * (o.reflD ?? 0.08))], height: false, alpha: o.reflA ?? 0.85 });
    const litP = mv(o.litD ?? 0.32, o.litS ?? 0.9);
    layer(S, { clip: [bp, litP], bb, cols: [P[4], P[4], P[5]], base: P[4], dir, len: sL, wid: sW, cover: 1.2, broken: 0.06, shade: o.litShade, noise: 0.05 });
    if (o.lightS !== 0) {
      const lightP = mv(o.lightD ?? 0.55, o.lightS ?? 0.6);
      layer(S, { clip: [bp, litP, lightP], bb, cols: [P[5], P[5], P[6]], dir, len: [sL[0] * 0.8, sL[1] * 0.8], wid: [sW[0] * 0.85, sW[1] * 0.85], soft: true, cover: 2.2, noise: 0.06, shade: o.lightShade });
    }
    if (o.hi) { const [hx, hy, hrx, hry, hrot] = o.hi; layer(S, { clip: [bp, ellipsePath(hx, hy, hrx, hry, hrot)], bb, cols: [P[6], P[7]], dir: hrot, dirJit: 0.2, len: [sL[0] * 0.45, sL[1] * 0.5], wid: [sW[0] * 0.55, sW[1] * 0.6], soft: true, cover: 2.6, alpha: o.hiA ?? 1 }); }
  }

  // ================================================================ ELMA (kırmızı elma, sap ve yaprak)
  reg('elma', () => {
    const k = 1, K = k; const S = Paint.sprite(380 * K, 400 * K, { seed: 1501, k }); const rr = rng(1503);
    const cx = 186 * K, cy = 222 * K, R = 150 * K;
    const loc = [[0, -108], [36, -132], [92, -130], [138, -94], [158, -28], [152, 40], [124, 100], [74, 136], [16, 130], [-40, 140], [-100, 116], [-142, 58], [-160, -14], [-146, -84], [-100, -128], [-42, -134]];
    const pts = crPts(loc.map(([x, y]) => [cx + x * K, cy + y * K]), 6, true);
    const body = polyShape(pts);
    const stemB = [cx + 4 * K, cy - 104 * K];
    const merid = (x, y) => Math.atan2(y - (stemB[1] - 30 * K), x - stemB[0]) + (S.r() - 0.5) * 0.25;
    const P = PAL.apple;
    const sphV = (x, y) => { const nx = (x - cx) / (R * 1.04), ny = (y - cy - 6 * K) / (R * 0.98); const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)); const l = Math.hypot(nx, ny, nz) || 1; return clamp(((nx * L3[0] + ny * L3[1] + nz * L3[2]) / l) * 0.68 + 0.34); };
    const mer2 = (x, y) => { const m = merid(x, y); const d = (y - (cy - R)) / (2 * R); return m + smooth(clamp((d - 0.66) / 0.3)) * Math.sign(x - cx || 1) * 1.15; };
    stepBody(S, body.path, body.bb, [P[1], P[2], P[3], P[4], P[5]], sphV, mer2, { thr: [0.24, 0.42, 0.6, 0.79], len: [26, 50], wid: [12, 19], edgeFreq: 0.016, edgeAmp: 0.022, lJit: 0.04, cover: 1.5, rim: { w: 2.6, alpha: 0.9 } });
    layer(S, { clip: [body.path, crescent(body.path, body.bb, R * 0.075)], bb: body.bb, cols: ['#7A1A4A', '#84224E'], base: '#7A1A4A', dir: merid, len: [13, 25], wid: [7, 11], cover: 1.6 });
    { const hx = cx + LX * R * 0.56, hy = cy + LY * R * 0.56; layer(S, { clip: [body.path, smoothPath(blobPts(hx, hy, R * 0.22, R * 0.16, 12, 0.12, 1509, -0.7))], bb: body.bb, cols: [P[6], shade(P[6], 0.02)], base: P[6], dir: merid, len: [14, 26], wid: [8, 12], cover: 1.6 }); }
    // meridyen boyunca alacalar: ışık tarafında sarımsı-açık, gölgede koyu kısa darbeler
    // meridyen alacaları: sap çukurundan inen uzun, ince, kavisli çizgiler (gölge yanında az ve koyu)
    withClip(S, body.path, () => {
      const sp = (a, t) => [cx + Math.sin(a) * Math.sin(Math.PI * t) * R * 1.02, cy - Math.cos(Math.PI * t) * R * 0.95];
      let a = -1.42;
      while (a < 1.42) {
        a += 0.1 + rr() * 0.22; const [mx, my] = sp(a, 0.5); const lit = (mx - cx) * LX + (my - cy) * LY > -R * 0.1;
        if (!lit && rr() < 0.6) continue;
        const t0 = 0.1 + rr() * 0.1, t1 = lit ? 0.4 + rr() * 0.38 : 0.28 + rr() * 0.22; const q = [];
        for (let j = 0; j <= 14; j++) { const t = lerp(t0, t1, j / 14); q.push(sp(a + Math.sin(t * 5 + a * 7) * 0.035, t)); }
        const col = lit ? mix(P[6], '#F2A440', rr() * 0.6) : P[2];
        if (rr() < 0.3) { const m = 5 + Math.floor(rr() * 4); line(S, q.slice(0, m), 2.4 + rr() * 1.6, col, { w1: 0.8, taper: true, height: false }); line(S, q.slice(m + 2), 2 + rr() * 1.4, col, { w1: 0.7, taper: true, height: false }); }
        else line(S, q, lit ? 2 + rr() * 2.2 : 2.2, col, { w1: 0.7, taper: true, height: false, alpha: 0.8 });
      }
    });
    // sap çukuru
    // sap çukuru: basamaklı çukur (uzak kenarda koyu hilal, orta ton, yakın kenarda açık dudak)
    const cvx = cx + 2 * K, cvy = cy - 108 * K;
    const cav = shape(blobPts(cvx, cvy, 40 * K, 15 * K, 16, 0.05, 1507, 0.04), 0.5);
    layer(S, { clip: cav.path, bb: cav.bb, cols: [P[3], P[3]], base: P[3], dir: (x, y) => Math.atan2(y - cvy, x - cvx), len: [8, 14], wid: [5, 7], cover: 1.6, rim: false });
    const far = moved(cav.path, 0, 7 * K, 0.95, cvx, cvy); // uzak (üst) iç duvar
    fill(S, cav.path, P[1], { clip: [cav.path, (() => { const q = new Path2D(); q.rect(cav.bb[0] - 20, cav.bb[1] - 20, cav.bb[2] - cav.bb[0] + 40, cav.bb[3] - cav.bb[1] + 40); q.addPath(far); return [q, 'evenodd']; })()], h: 110 });
    fill(S, ellipsePath(cvx - 2 * K, cvy + 1 * K, 15 * K, 5 * K, 0), P[0], { h: 100 });
    line(S, crPts([[cvx - 34 * K, cvy + 5 * K], [cvx, cvy + 13 * K], [cvx + 34 * K, cvy + 6 * K]], 3), 4, P[6], { w1: 1.6, taper: true, height: true });
    // parlak vurgu (keskin pencere lekesi)
    dab(S, cx - 82 * K, cy - 70 * K, -0.95, 26, 9, P[7], { alpha: 0.95 });
    dab(S, cx - 98 * K, cy - 48 * K, -1.25, 14, 6, P[7], { alpha: 0.9 });
    fill(S, ellipsePath(cx - 84 * K, cy - 74 * K, 5 * K, 3.4 * K, -0.9), P[8], { height: false });
    // sap
    const stem = crPts([[cx - 1 * K, cy - 106 * K], [cx + 6 * K, cy - 140 * K], [cx + 22 * K, cy - 170 * K]], 3);
    line(S, stem, 9, PAL.stem[2], { w1: 6, rim: { w: 1.2, alpha: 0.8 } });
    line(S, stem.map(([x, y]) => [x - 2 * K, y]), 3, PAL.stem[4], { w1: 2, height: false });
    fill(S, ellipsePath(cx + 22 * K, cy - 171 * K, 4 * K, 3 * K, 0.5), PAL.stem[4], { h: 150 });
    // yaprak
    leaf(S, cx + 10 * K, cy - 146 * K, -0.42, 128 * K, 58 * K, PAL.leaf, { bend: -0.12, rim: { w: 1.6, alpha: 0.85 } });
    return done(S, cx, cy - 10 * K);
  }, { size: [324, 352], base: [0, 146] });

  // ================================================================ İNCİR (iki mor incir; biri yarık, pembe içi)
  function figPts(cx, cy, r, ang, sq = 1) {
    // boyun yönü ang; geniş taban
    const ax = Math.cos(ang), ay = Math.sin(ang), bx = -ay, by = ax; const out = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * TAU; const c = Math.cos(a), s2 = Math.sin(a);
      const u = c > 0 ? c * r * 1.5 : c * r * 1.0; const v = s2 * r * sq * (c > 0 ? lerp(1, 0.3, Math.pow(c, 1.4)) : 1);
      out.push([cx + ax * u + bx * v, cy + ay * u + by * v]);
    }
    return out;
  }
  // bütün incir: c merkez, r taban yarıçapı, a1 boyun yönü
  function figWhole(S, f1c, r1, a1, sd) {
    const K = S.k; const rr = rng(1600 + sd); const P = PAL.fig; const N = PAL.oliveG; const rs = r1 / K;
    const b1 = polyShape(crPts(figPts(f1c[0], f1c[1], r1, a1), 4, true));
    const neck1 = [f1c[0] + Math.cos(a1) * r1 * 1.5, f1c[1] + Math.sin(a1) * r1 * 1.5];
    const d1 = (x, y) => Math.atan2(y - neck1[1], x - neck1[0]) + (S.r() - 0.5) * 0.25;
    const hp = [f1c[0] + Math.cos(a1 - 1.2) * r1 * 0.5, f1c[1] + Math.sin(a1 - 1.2) * r1 * 0.5];
    toneShape(S, b1, { c: f1c, size: r1, P, dir: d1, sL: [rs * 0.24, rs * 0.46], sW: [clamp(rs * 0.12, 4, 10), clamp(rs * 0.19, 6, 16)], refl: '#3E3A8A', litD: 0.3, litS: 0.86, lightD: 0.55, lightS: 0.55, hi: [f1c[0] + LX * r1 * 0.45, f1c[1] + LY * r1 * 0.3, r1 * 0.13, r1 * 0.3, a1 + 0.2], rimW: clamp(rs * 0.025, 1.2, 2.2) });
    withClip(S, b1.path, () => {
      // boyun: küçük, mat zeytin-hardal, mora iki basamakla geçer (patlıcan şapkası değil)
      const nk = (rad, col, sd2) => { const pp = smoothPath(blobPts(neck1[0] - Math.cos(a1) * r1 * 0.12, neck1[1] - Math.sin(a1) * r1 * 0.12, rad, rad * 0.8, 12, 0.18, sd2, a1)); layer(S, { clip: [b1.path, pp], bb: b1.bb, cols: [col, shade(col, 0.03)], base: col, dir: d1, len: [rs * 0.12, rs * 0.22], wid: [clamp(rs * 0.07, 3, 6), clamp(rs * 0.1, 4, 9)], cover: 1.5 }); };
      nk(r1 * 0.42, mix(P[3], '#6E6A3A', 0.45), 1600 + sd); nk(r1 * 0.3, '#7A7436', 1601 + sd); nk(r1 * 0.18, '#968E48', 1602 + sd);
      // damar kuşakları: ince siyah çizgi yerine yumuşak açık/koyu fırça bantları
      for (let i = 0; i < 6; i++) { const phi = (i - 2.5) * 0.42; const q = []; for (let j = 0; j <= 10; j++) { const t = 0.16 + j / 10 * 0.7; const u = Math.cos(Math.PI * t) * r1 * 1.2, v = Math.sin(Math.PI * t) * Math.sin(phi) * r1; q.push([f1c[0] + Math.cos(a1) * u + Math.sin(a1) * v, f1c[1] + Math.sin(a1) * u - Math.cos(a1) * v]); } const lit = phi < 0; line(S, q, clamp(rs * 0.07, 2.5, 6), lit ? P[5] : P[2], { w1: clamp(rs * 0.03, 1, 2.5), taper: true, height: false, alpha: lit ? 0.4 : 0.45 }); }
      for (let i = 0; i < 26; i++) { const x = lerp(b1.bb[0], b1.bb[2], rr()), y = lerp(b1.bb[1], b1.bb[3], rr()); if (Math.hypot(x - neck1[0], y - neck1[1]) < r1 * 0.6) continue; fill(S, ellipsePath(x, y, r1 * 0.021, r1 * 0.015, rr() * 3), P[6], { alpha: 0.55, height: false }); }
      for (let i = 0; i < 5; i++) dab(S, f1c[0] + (rr() - 0.5) * r1, f1c[1] + (rr() - 0.5) * r1 * 0.8, rr() * 3, rs * 0.28, rs * 0.14, P[7], { alpha: 0.18, height: false });
    });
    const st1 = crPts([neck1, [neck1[0] + Math.cos(a1) * r1 * 0.16 + 2 * K, neck1[1] + Math.sin(a1) * r1 * 0.16], [neck1[0] + Math.cos(a1 + 0.4) * r1 * 0.3, neck1[1] + Math.sin(a1 + 0.4) * r1 * 0.3]], 3);
    line(S, st1, clamp(rs * 0.1, 3, 9), N[1], { w1: clamp(rs * 0.07, 2, 6), rim: { w: 1.2, alpha: 0.8 } }); line(S, st1.map(([x, y]) => [x - 1.5 * K, y]), clamp(rs * 0.035, 1, 3), N[4], { w1: 1.4, height: false });
    const e1 = st1[st1.length - 1]; fill(S, ellipsePath(e1[0], e1[1], r1 * 0.05, r1 * 0.04, a1), N[5], { h: 150 });
    return b1;
  }
  reg('incir', () => {
    const k = 1, K = k; const S = Paint.sprite(430 * K, 380 * K, { seed: 1601, k }); const rr = rng(1603);
    const P = PAL.fig; const N = PAL.oliveG;
    figWhole(S, [150 * K, 206 * K], 86 * K, -Math.PI / 2 - 0.18, 1);
    // --- ön: ikiye bölünmüş incir (yatık, kesik yüzü izleyiciye)
    const f2c = [280 * K, 252 * K], r2 = 92 * K, a2 = -0.42;
    const outer = polyShape(crPts(figPts(f2c[0], f2c[1], r2, a2, 1.0), 4, true));
    // kabuk: ince mor kenar
    layer(S, { clip: outer.path, bb: outer.bb, cols: [P[2], P[3]], base: P[3], dir: a2, dirJit: 0.4, len: [14, 24], wid: [8, 12], cover: 1.4, rim: { w: 2.2, alpha: 0.9 } });
    layer(S, { clip: [outer.path, crescent(outer.path, outer.bb, r2 * 0.25)], bb: outer.bb, cols: [P[1], P[2]], base: P[1], dir: a2, len: [14, 24], wid: [8, 12], cover: 1.4 });
    // beyaz-krem et
    const fleshP = crPts(figPts(f2c[0] + 2 * K, f2c[1], r2 * 0.9, a2, 0.96), 4, true); const flesh = polyShape(fleshP);
    layer(S, { clip: flesh.path, bb: flesh.bb, cols: ['#E8D6B4', '#F4E6CA', '#FCF4E2'], base: '#F4E6CA', shade: (x, y) => clamp(0.6 + (f2c[0] - x) / (r2 * 3) + (f2c[1] - y) / (r2 * 3)), dir: (x, y) => Math.atan2(y - f2c[1], x - f2c[0]) + Math.PI / 2, dirJit: 0.2, len: [12, 22], wid: [6, 9], cover: 1.5 });
    // pembe-kırmızı iç
    const inP = crPts(figPts(f2c[0] + 4 * K, f2c[1] + 0.5 * K, r2 * 0.82, a2, 0.92), 4, true); const inn = polyShape(inP);
    const F = PAL.figIn; const neck2 = [f2c[0] + Math.cos(a2) * r2 * 1.25, f2c[1] + Math.sin(a2) * r2 * 1.25];
    const rad2 = (x, y) => Math.atan2(y - neck2[1], x - neck2[0]) + (S.r() - 0.5) * 0.3;
    layer(S, { clip: inn.path, bb: inn.bb, cols: [F[1], F[2], F[3], F[4]], base: F[2], shade: (x, y) => clamp(0.95 - Math.hypot(x - neck2[0], y - neck2[1]) / (r2 * 2.0) + (rr() - 0.5) * 0.1), dir: rad2, len: [16, 30], wid: [5, 9], cover: 2.2, noise: 0.1 });
    // pembe et lifleri krem kabuk halkasına doğru ışınsal uzanır
    withClip(S, flesh.path, () => {
      for (let i = 0; i < 34; i++) { const j = Math.floor(rr() * (inP.length - 1)); const [px, py] = inP[j]; const ang = Math.atan2(py - f2c[1], px - f2c[0]) + (rr() - 0.5) * 0.5; const L = (2 + rr() * 9) * K; line(S, [[px - Math.cos(ang) * 4 * K, py - Math.sin(ang) * 4 * K], [px + Math.cos(ang) * L, py + Math.sin(ang) * L]], 1.4 + rr() * 1.4, rr() < 0.6 ? F[3] : F[4], { w1: 0.5, height: false }); }
    });
    // orta boşluk (koyu kırmızı, uzun) ve tohum telleri
    const cav = smoothPath(blobPts(f2c[0] + 12 * K, f2c[1] - 4 * K, r2 * 0.36, r2 * 0.2, 12, 0.2, 1611, a2));
    fill(S, cav, F[0], { h: 110 });
    withClip(S, inn.path, () => {
      for (let i = 0; i < 70; i++) {
        const t = rr(); const a = rr() * TAU; const x = f2c[0] + 10 * K + Math.cos(a) * r2 * 0.6 * Math.sqrt(t) * 1.1, y = f2c[1] + Math.sin(a) * r2 * 0.5 * Math.sqrt(t);
        const ang = Math.atan2(y - neck2[1], x - neck2[0]);
        line(S, [[x, y], [x + Math.cos(ang) * 9 * K, y + Math.sin(ang) * 9 * K]], 1.6, rr() < 0.5 ? F[5] : F[3], { w1: 0.8, height: false });
        fill(S, ellipsePath(x + Math.cos(ang) * 10 * K, y + Math.sin(ang) * 10 * K, 2.2 * K, 1.6 * K, ang), rr() < 0.7 ? '#F4D890' : '#C8A050', { h: 170 });
      }
    });
    // kesik yüzün üst kenarında ince ışık çizgisi
    const lipP = fleshP.slice(8, 26);
    line(S, lipP, 2.2, '#FFFBF0', { w1: 1, taper: true, height: false });
    // sap (kısa)
    const st2 = [[f2c[0] + Math.cos(a2) * r2 * 1.45, f2c[1] + Math.sin(a2) * r2 * 1.45], [f2c[0] + Math.cos(a2) * r2 * 1.68, f2c[1] + Math.sin(a2) * r2 * 1.68 - 4 * K]];
    line(S, st2, 8, N[1], { w1: 6, rim: { w: 1.2, alpha: 0.8 } });
    return done(S, 242 * K, 205 * K);
  }, { size: [360, 297], base: [0, 141] });

  // ================================================================ HURMA (üç parlak hurma)
  function dateOn(S, x, y, len, ang, P, sd, o = {}) {
    const K = S.k; const r2 = rng(sd); const th = len * (o.th ?? 0.42);
    const ax = Math.cos(ang), ay = Math.sin(ang), bx = -ay, by = ax;
    // yuvarlak uçlu oval: iki uca doğru hafif incelen (sosis/kütük değil)
    const pts = []; for (let i = 0; i < 44; i++) { const a = (i / 44) * TAU; const c = Math.cos(a), s2 = Math.sin(a); const u = c * len / 2 * (1 + 0.025 * Math.sin(a * 3 + sd)); const v = s2 * th / 2 * (1 - 0.16 * c * c) * (1 - (c > 0 ? 0.08 : 0.03) * c) * (1 + 0.03 * Math.sin(a * 5 + sd)); pts.push([x + ax * u + bx * v, y + ay * u + by * v]); }
    const body = shape(pts, 0.5); const z = th / 2;
    toneShape(S, body, { c: [x, y], size: z, P, dir: ang, sL: [len / K * 0.24, len / K * 0.42], sW: [clamp(th / K * 0.16, 5, 12), clamp(th / K * 0.24, 7, 16)], shadowD: 0.72, refl: '#6A2A3A', reflD: 0.16, litD: 0.42, litS: 0.84, lightD: 0.82, lightS: 0.58, rimW: 1.8 });
    // uzunlamasına yumuşak buruşukluklar
    withClip(S, body.path, () => {
      for (let i = 0; i < 4; i++) {
        const v = (r2() - 0.5) * th * 0.62; const u0 = (-0.32 + r2() * 0.2) * len, u1 = u0 + (0.25 + r2() * 0.3) * len; const q = [];
        for (let j = 0; j <= 8; j++) { const u = lerp(u0, u1, j / 8); const vv = v + Math.sin(j * 0.9 + i) * th * 0.04; q.push([x + ax * u + bx * vv, y + ay * u + by * vv]); }
        crease(S, q, clamp(th / K * 0.045, 1.2, 2.6), P[3], P[6], { alpha: 0.55 });
      }
      // parlak sırt: üst sırt boyunca bir uzun ince keskin vurgu + bir kısa; iki beyazımsı nokta
      const sgn = (bx * LX + by * LY) > 0 ? 1 : -1; const ridge = (f0, f1, off) => { const q = []; for (let j = 0; j <= 10; j++) { const u = lerp(f0, f1, j / 10) * len; const vv = sgn * th * off * (1 - Math.pow(u / (len * 0.5), 2) * 0.6); q.push([x + ax * u + bx * vv, y + ay * u + by * vv]); } return q; };
      const q1 = ridge(-0.3, 0.2, 0.25); line(S, q1, clamp(th / K * 0.1, 2.4, 6), P[7], { w1: 1, taper: true, height: false });
      line(S, ridge(-0.22, 0.06, 0.27), clamp(th / K * 0.05, 1.2, 3), P[8], { w1: 0.6, taper: true, height: false });
      const q2 = ridge(0.26, 0.4, 0.2); line(S, q2, clamp(th / K * 0.06, 1.4, 3.5), P[7], { w1: 0.8, taper: true, height: false, alpha: 0.85 });
      fill(S, ellipsePath(q1[4][0], q1[4][1], th * 0.055, th * 0.035, ang), P[8], { height: false });
    });
    // sap ucu: küçük koyu hardal dört loblu çanak
    if (o.cap !== false) {
      const ex = x - ax * len * 0.47, ey = y - ay * len * 0.47; const cr = th * 0.075;
      for (let i = 0; i < 4; i++) { const a = ang + Math.PI / 4 + (i * Math.PI) / 2; fill(S, ellipsePath(ex + Math.cos(a) * cr * 0.7, ey + Math.sin(a) * cr * 0.55, cr * 0.62, cr * 0.42, a), i % 2 ? '#6A4418' : '#7E5420', { h: 150 }); }
      fill(S, ellipsePath(ex, ey, cr * 0.38, cr * 0.32, 0), '#4A2E10', { h: 140 });
      fill(S, ellipsePath(ex + LX * cr * 0.5, ey + LY * cr * 0.5, cr * 0.22, cr * 0.15, -0.6), '#B08850', { height: false, alpha: 0.9 });
    }
    return body;
  }
  reg('hurma', () => {
    const k = 1, K = k; const S = Paint.sprite(390 * K, 270 * K, { seed: 1701, k });
    const P = PAL.date;
    dateOn(S, 136 * K, 178 * K, 168 * K, 0.18, P, 1711);
    dateOn(S, 258 * K, 186 * K, 160 * K, -0.22, P.map((c) => shade(c, -0.02, 1, 6)), 1712);
    dateOn(S, 202 * K, 118 * K, 172 * K, -0.05, P.map((c) => shade(c, 0.015, 1, -4)), 1713);
    return done(S, 196 * K, 150 * K);
  }, { size: [285, 145], base: [0, 72] });

  // ================================================================ ZEYTİN (zeytin dalı: gümüşi yapraklar, yeşil-siyah zeytinler)
  // zeytin: uzunca, uçları hafif sivri (erik değil). rot: eksen eğikliği (sap yukarıda)
  function olivePts(x, y, rx, ry, rot, sd) {
    const r2 = rng(sd); const out = []; const c = Math.cos(rot), s2 = Math.sin(rot); const N = 30; const asym = (r2() - 0.5) * 0.1;
    const side = (sg) => { for (let i = 0; i <= N; i++) { const t = sg > 0 ? i / N : 1 - i / N; const u = -ry + 2 * ry * t; const hw = rx * (t < 0.5 ? Math.pow(Math.max(0, 1 - Math.pow(1 - 2 * t, 2)), 0.5) : Math.pow(Math.sin(Math.PI * t), 0.95) * (1.04 - 0.16 * t)) * (1 + sg * asym); out.push([x + (sg * hw) * c - u * s2, y + (sg * hw) * s2 + u * c]); } };
    side(1); side(-1); return out;
  }
  function oliveOn(S, x, y, rx, ry, rot, P, sd) {
    const K = S.k; const pts = olivePts(x, y, rx, ry, rot, sd); const b = shape(pts, 0.5);
    toneShape(S, b, { c: [x, y], size: Math.min(rx, ry), P, dir: rot + Math.PI / 2, sL: [ry / K * 0.5, ry / K * 0.9], sW: [clamp(rx / K * 0.3, 4, 10), clamp(rx / K * 0.45, 5, 13)], shadowD: 0.5, refl: shade(P[3], 0.02, 1, -20), reflD: 0.14, litD: 0.36, litS: 0.84, lightD: 0.6, lightS: 0.5, rimW: 1.4 });
    fill(S, ellipsePath(x + LX * rx * 0.5, y + LY * ry * 0.5, rx * 0.2, ry * 0.12, rot - 0.5), P[7], { height: false, alpha: 0.95 });
    fill(S, ellipsePath(x + LX * rx * 0.2, y + LY * ry * 0.7, rx * 0.08, ry * 0.05, rot - 0.5), P[7], { height: false, alpha: 0.7 });
    return b;
  }
  reg('zeytin', () => {
    const k = 1, K = k; const S = Paint.sprite(470 * K, 330 * K, { seed: 1801, k }); const rr = rng(1803);
    const twig = crPts([[40, 132], [130, 114], [230, 106], [320, 98], [400, 80]].map(([x, y]) => [x * K, y * K]), 5);
    const at = (t) => twig[Math.min(twig.length - 1, Math.round(t * (twig.length - 1)))];
    const tang = (t) => { const a = at(Math.max(0, t - 0.02)), b = at(Math.min(1, t + 0.02)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const LG = PAL.oliveLeaf; const LS = ['#4E6050', '#6E8270', '#8EA28E', '#AABCA8', '#C6D4C2', '#E0E8DC'];
    const leaves = [];
    // karşılıklı çiftler: her boğumda iki yaprak, açıları değişken; bazıları aşağı sarkar
    const nodes = [0.08, 0.26, 0.44, 0.62, 0.8, 0.96];
    nodes.forEach((t0, n) => {
      const t = t0 + (rr() - 0.5) * 0.03; const droop = rr() < 0.45; const tg = tang(t);
      for (const side of [-1, 1]) {
        let a = tg + side * (0.5 + rr() * 0.55);
        if (side > 0 && droop) a = tg + 1.25 + rr() * 0.45; // aşağı sarkan
        if (n === nodes.length - 1 && side > 0) a = tg + 0.15; // uçta öne uzanan
        const len = (n === nodes.length - 1 ? 62 : 92 + rr() * 30) * K;
        leaves.push({ t, a, len, wid: (17 + rr() * 6) * K, silver: rr() < 0.36, bend: side * (0.04 + rr() * 0.09) * (droop && side > 0 ? -1.4 : 1), front: Math.sin(a) < -0.2 && rr() < 0.5 });
      }
    });
    const drawLeaf = (L) => { const [x, y] = at(L.t); leaf(S, x, y, L.a, L.len, L.wid, L.silver ? LS : LG, { bend: L.bend, pow: 0.75, fat: 0.8, vein: L.silver ? '#F0F4EC' : shade(LG[4], 0.08, 0.7), rim: { w: 1.3, alpha: 0.85 } }); };
    for (const L of leaves.filter((l) => !l.front)) drawLeaf(L);
    // dal
    line(S, twig, 10, '#5E4A3A', { w1: 4, rim: { w: 1.3, alpha: 0.85 } });
    line(S, twig.map(([x, y]) => [x - 1 * K, y - 2.2 * K]), 3.6, '#9A8670', { w1: 1.4, height: false });
    // zeytinler: iki salkım halinde, kısa saplarla
    const OG = PAL.oliveG, OB = PAL.oliveB; const OM = ['#2A1016', '#401A20', '#5A2A2C', '#743A36', '#8E4E42', '#A86A54', '#CC9A80', '#F6E6DA'];
    const olv = [
      [0.3, -22, 58, 0.25, OB], [0.31, 26, 70, -0.15, OG], [0.36, -2, 104, 0.1, OM],
      [0.66, -14, 56, 0.2, OG], [0.71, 30, 76, -0.25, OB], [0.6, -50, 90, 0.35, OB],
    ];
    for (const [t, dx, dy, rot, P] of olv) {
      const [x0, y0] = at(t); const x = x0 + dx * K, y = y0 + dy * K;
      line(S, crPts([[x0, y0], [lerp(x0, x, 0.4), lerp(y0, y, 0.5) - 4 * K], [x, y - 24 * K]], 3), 3.2, '#6A6A3A', { w1: 2.2, height: false });
    }
    for (const [t, dx, dy, rot, P] of olv.slice().sort((a, b) => a[2] - b[2])) { const [x0, y0] = at(t); oliveOn(S, x0 + dx * K, y0 + dy * K, 21 * K, 36 * K, rot, P, Math.floor(t * 1000 + dx)); }
    for (const L of leaves.filter((l) => l.front)) drawLeaf(L);
    return done(S, 244 * K, 123 * K);
  }, { size: [420, 234], base: [0, 124] });

  // ================================================================ GÜL (pembe gül dalı)
  // yaprak (taç yaprağı): taban → tepe, genişlik w; yuvarlak tepe kenarı
  function petalPts(bx, by, tx, ty, w, o = {}) {
    const ang = Math.atan2(ty - by, tx - bx); const L = Math.hypot(tx - bx, ty - by); const c = Math.cos(ang), s2 = Math.sin(ang);
    const T = ([u, v]) => [bx + u * c - v * s2, by + u * s2 + v * c];
    const skew = o.skew ?? 0; const n = 26; const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n; const a = Math.PI * t; // yan → tepe → öbür yan
      const u = L * (0.55 + 0.45 * Math.sin(a)) * (1 + 0.04 * Math.sin(a * 5 + (o.seed ?? 0)));
      const v = (w / 2) * Math.cos(a) * (1 + skew * Math.sin(a));
      pts.push(T([u, v]));
    }
    pts.push(T([L * 0.12, -w * 0.18])); pts.push(T([0, 0])); pts.push(T([L * 0.12, w * 0.18]));
    return { pts, T, L, ang };
  }
  // bant: gövdenin (dx,dy) kaydırılmış kopyası dışında kalan kısım (evenodd kırpma)
  const bandClip = (path, bb, dx, dy) => { const p = new Path2D(); p.rect(bb[0] - 100, bb[1] - 100, bb[2] - bb[0] + 200, bb[3] - bb[1] + 200); p.addPath(moved(path, dx, dy)); return [p, 'evenodd']; };
  function petal(S, bx, by, tx, ty, w, P, o = {}) {
    const K = S.k; const pp = petalPts(bx, by, tx, ty, w, o); const sh = shape(pp.pts, 0.45); const Ls = pp.L / K;
    const ux = (tx - bx) / pp.L, uy = (ty - by) / pp.L; // tabandan uca birim
    const dir = (x, y) => Math.atan2(y - by, x - bx) + (S.r() - 0.5) * 0.25;
    const t = clamp(o.tone ?? 0.5); const i0 = Math.round(1 + t * 2); // 1..3
    const sw = [clamp(Ls * 0.1, 4, 12), clamp(Ls * 0.15, 5, 15)], sl = [Ls * 0.28, Ls * 0.5];
    layer(S, { clip: sh.path, bb: sh.bb, cols: [P[i0], P[i0 + 1]], base: P[i0], dir, len: sl, wid: sw, cover: 1.2, rim: o.rim ? { w: 1.5, alpha: 0.85 } : false });
    // tabanda koyu iç gölge
    layer(S, { clip: [sh.path, bandClip(sh.path, sh.bb, ux * pp.L * 0.5, uy * pp.L * 0.5)], bb: sh.bb, cols: [P[Math.max(0, i0 - 1)]], base: P[Math.max(0, i0 - 1)], dir, len: sl, wid: sw, cover: 1.2 });
    // ışık alan yan (sol üst)
    const px = -uy, py = ux; const side = px * LX + py * LY > 0 ? 1 : -1;
    if (o.sideLit !== false) layer(S, { clip: [sh.path, bandClip(sh.path, sh.bb, -px * side * w * 0.38, -py * side * w * 0.38), bandClip(sh.path, sh.bb, ux * pp.L * 0.3, uy * pp.L * 0.3)], bb: sh.bb, cols: [P[i0 + 1], P[i0 + 2]], dir, len: sl, wid: sw, soft: true, cover: 2 });
    // tepe kenarı: geriye kıvrık açık bant + ince parlak çizgi
    const rb = o.roll ?? 0.13;
    if (rb > 0) {
      layer(S, { clip: [sh.path, bandClip(sh.path, sh.bb, -ux * pp.L * rb, -uy * pp.L * rb)], bb: sh.bb, cols: [P[i0 + 2], P[i0 + 3]], base: P[i0 + 2], dir: Math.atan2(uy, ux) + Math.PI / 2, dirJit: 0.25, len: [Ls * 0.18, Ls * 0.32], wid: [sw[0] * 0.7, sw[1] * 0.7], cover: 1.4 });
      const q = []; for (let i = 4; i <= 22; i++) q.push(pp.pts[i]);
      line(S, q, clamp(Ls * 0.035, 1.4, 3.5), P[Math.min(P.length - 1, i0 + 4)], { w1: 1, taper: true, height: false });
    }
    return sh;
  }
  function roseBloom(S, cx, cy, sc, P, sd) {
    const K = S.k; const Q = (u, v) => [cx + u * sc, cy + v * sc]; const rr = rng(sd);
    const pt = (b, t, w, o) => petal(S, ...Q(...b), ...Q(...t), w * sc, P, { seed: rr() * 10, ...o });
    // çanak yapraklar (yeşil sivri uçlar, alttan)
    for (const [a, l] of [[2.3, 60], [1.45, 50], [0.6, 58]]) { const b = Q(0, 46); leaf(S, b[0], b[1], a, l * sc, 18 * sc, PAL.leaf, { bend: 0.15, pow: 0.6, fat: 0.7, vein: false, rim: { w: 1.2, alpha: 0.8 } }); }
    // arka büyük yapraklar (koyu)
    pt([-4, 6], [-62, -84], 116, { tone: 0.1, rim: true, roll: 0.12 });
    pt([4, 6], [64, -82], 116, { tone: 0.05, rim: true, roll: 0.12 });
    pt([0, 0], [0, -104], 110, { tone: 0.25, rim: true, roll: 0.12 });
    // yan yapraklar (dışa açılan)
    pt([-8, 30], [-112, -6], 104, { tone: 0.45, rim: true, skew: 0.2, roll: 0.15 });
    pt([8, 30], [110, -12], 100, { tone: 0.15, rim: true, skew: -0.2, roll: 0.15 });
    // iç çanak: koyu çukur
    const cup = ellShape(cx + 2 * sc, cy - 36 * sc, 54 * sc, 30 * sc, -0.05);
    layer(S, { clip: cup.path, bb: cup.bb, cols: [P[0], P[1], P[2]], base: P[1], shade: (x, y) => clamp(0.2 + (y - (cy - 66 * sc)) / (60 * sc) * 0.8), dir: (x, y) => Math.atan2(y - (cy - 36 * sc), x - cx) + Math.PI / 2, len: [10, 18], wid: [5, 8], cover: 1.6 });
    // sarmal: iç içe üç kıvrık kenar (gölge + açık sırt)
    for (let j = 0; j < 3; j++) {
      const rx = (14 + j * 14) * sc, ry2 = (8 + j * 7.5) * sc; const a0 = 3.3 + j * 0.7, a1 = a0 + 3.6 - j * 0.35;
      const q = []; for (let i = 0; i <= 18; i++) { const a = lerp(a0, a1, i / 18); q.push([cx + 4 * sc + Math.cos(a) * rx, cy - 38 * sc + Math.sin(a) * ry2]); }
      line(S, q.map(([x, y]) => [x + 1.5 * K, y + 3 * K]), 7 - j, P[0], { w1: 2, taper: true, height: false });
      line(S, q, 5.5 - j * 0.8, P[5 - j], { w1: 1.4, taper: true });
    }
    // çanağı saran iç yapraklar
    pt([-44, 18], [-40, -46], 66, { tone: 0.75, skew: 0.3, roll: 0.16 });
    pt([46, 18], [40, -44], 62, { tone: 0.3, skew: -0.3, roll: 0.16 });
    // ön yapraklar: tepe kenarı geriye kıvrık
    pt([-18, 66], [-64, 4], 100, { tone: 0.85, skew: 0.15, roll: 0.17, rim: true });
    pt([20, 66], [66, 2], 96, { tone: 0.55, skew: -0.1, roll: 0.17, rim: true });
    pt([0, 74], [2, 16], 92, { tone: 1, roll: 0.2, rim: true });
  }
  reg('gul', () => {
    const k = 1, K = k; const S = Paint.sprite(340 * K, 440 * K, { seed: 1901, k });
    const P = PAL.rose; const G = ['#0A3A22', '#0F5030', '#186A3A', '#248442', '#3A9E4A', '#6CBA58'];
    const cx = 166 * K, cy = 150 * K, sc = 0.95 * K;
    // sap (arkada): çiçekten aşağı kıvrılarak iner; küçük dikenler
    const stem = crPts([[cx + 2 * K, cy + 60 * K], [cx - 6 * K, cy + 140 * K], [cx + 8 * K, cy + 214 * K], [cx - 2 * K, cy + 276 * K]], 4);
    line(S, stem, 10, G[2], { w1: 7, rim: { w: 1.3, alpha: 0.85 } });
    line(S, stem.map(([x, y]) => [x - 2.5 * K, y]), 3.2, G[4], { w1: 2, height: false });
    for (const t of [0.35, 0.6, 0.82]) { const q = stem[Math.round(t * (stem.length - 1))]; const sd = t > 0.5 ? 1 : -1; const tip = [q[0] + sd * 12 * K, q[1] - 6 * K]; fill(S, poly([[q[0], q[1] - 5 * K], tip, [q[0], q[1] + 4 * K]]), G[1], { h: 150 }); }
    // yaprak kümeleri (dişli, üçlü)
    const leafSet = (t, side, sz) => {
      const q = stem[Math.round(t * (stem.length - 1))]; const a = side > 0 ? -0.5 : Math.PI + 0.5;
      const e = [q[0] + Math.cos(a) * 46 * K * sz, q[1] + Math.sin(a) * 46 * K * sz];
      line(S, [q, e], 4, G[2], { w1: 2.4, height: false });
      leaf(S, e[0], e[1], a + 0.15 * side, 70 * K * sz, 38 * K * sz, G, { serr: true, n: 22, bend: -0.05 * side, rim: { w: 1.2, alpha: 0.8 } });
      const m = [lerp(q[0], e[0], 0.5), lerp(q[1], e[1], 0.5)];
      leaf(S, m[0], m[1], a - 1.0 * side, 52 * K * sz, 30 * K * sz, G, { serr: true, n: 20, bend: 0.06 * side, rim: { w: 1.2, alpha: 0.8 } });
      leaf(S, m[0], m[1], a + 1.0 * side, 50 * K * sz, 28 * K * sz, G, { serr: true, n: 20, bend: -0.06 * side, rim: { w: 1.2, alpha: 0.8 } });
    };
    leafSet(0.5, -1, 1.05); leafSet(0.74, 1, 0.95);
    // küçük gonca (yan dalda)
    const bq = stem[Math.round(0.3 * (stem.length - 1))]; const bt = [bq[0] + 92 * K, bq[1] - 36 * K];
    line(S, crPts([bq, [bq[0] + 40 * K, bq[1] - 20 * K], bt], 3), 5, G[2], { w1: 3.4, rim: { w: 1, alpha: 0.8 } });
    const bud = petal(S, bt[0], bt[1] + 6 * K, bt[0] + 6 * K, bt[1] - 40 * K, 36 * K, P, { tone: 0.3, roll: 0.15, rim: true });
    for (const a of [-2.2, -1.0]) leaf(S, bt[0], bt[1] + 4 * K, a, 34 * K, 12 * K, G, { pow: 0.6, fat: 0.7, vein: false, rim: { w: 1, alpha: 0.8 } });
    roseBloom(S, cx, cy, sc, P, 1907);
    // çanak: çiçeğin sapa oturduğu yerde küçük yeşil kadeh + aşağı kıvrılan sivri çanak yaprakları
    const rcx = cx + 1 * K, rcy = cy + 84 * sc;
    for (const [a, l, b] of [[2.25, 30, 0.22], [0.95, 28, -0.2], [1.62, 22, 0.05]]) leaf(S, rcx, rcy - 2 * K, a, l * K, 9 * K, G, { bend: b, pow: 0.55, fat: 0.75, vein: false, rim: { w: 1, alpha: 0.85 } });
    const rec = ellShape(rcx, rcy, 11 * K, 9 * K);
    layer(S, { clip: rec.path, bb: rec.bb, cols: [G[2], G[3], G[4]], base: G[3], shade: (x, y) => clamp(0.75 - ((x - rcx) * -LX + (y - rcy) * -LY) / (14 * K)), dir: 0.3, len: [6, 10], wid: [4, 6], cover: 2, rim: { w: 1, alpha: 0.85 } });
    return done(S, cx - 2 * K, 237 * K);
  }, { size: [226, 380], base: [0, 190] });

  // ================================================================ EKMEK (yuvarlak köy ekmeği, haç çizikli altın kabuk)
  // kubbe yüzeyi (u,w) → ekran; ışık ve darbe yönü için ekran ızgarasına geri haritalanır
  function convexHull(P) { const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]); const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); } for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); } up.pop(); lo.pop(); return lo.concat(up); }
  function domeSurface(cx, y0, R, H, elev, prof) {
    const se = Math.sin(elev), ce = Math.cos(elev);
    const hgt = (u, w) => { const p = Math.min(1, Math.hypot(u, w)); return H * Math.pow(Math.max(0, 1 - Math.pow(p, prof[0])), prof[1]); };
    const proj = (u, w, dh = 0) => { const h = hgt(u, w) + dh; return [cx + u * R, y0 + w * R * se - h * ce]; };
    const normal = (u, w) => { const e = 0.01; const hx = (hgt(u + e, w) - hgt(u - e, w)) / (2 * e * R), hw = (hgt(u, w + e) - hgt(u, w - e)) / (2 * e * R); const n = [-hx, 1, -hw]; const l = Math.hypot(...n); return n.map((v) => v / l); };
    return { proj, hgt, normal, se, ce };
  }
  function domeMap(D, bb, cell, light) {
    const nx = Math.ceil((bb[2] - bb[0]) / cell), ny = Math.ceil((bb[3] - bb[1]) / cell);
    const L = new Float32Array(nx * ny).fill(-1), A = new Float32Array(nx * ny);
    const ln = Math.hypot(...light); const l3 = light.map((v) => v / ln);
    const N = 220;
    for (let j = 0; j <= N; j++) { const w = -1 + (2 * j) / N; // arkadan öne: öndeki üstüne yazar
      for (let i = 0; i <= N; i++) { const u = -1 + (2 * i) / N; if (u * u + w * w > 1.0) continue;
        const [X, Y] = D.proj(u, w); const cxI = Math.floor((X - bb[0]) / cell), cyI = Math.floor((Y - bb[1]) / cell);
        if (cxI < 0 || cyI < 0 || cxI >= nx || cyI >= ny) continue;
        const n = D.normal(u, w); const v = Math.max(0, n[0] * l3[0] + n[1] * l3[1] + n[2] * l3[2]);
        const idx = cyI * nx + cxI; L[idx] = v;
        // kontur yönü: (u,w) çemberine teğet doğrultunun ekran açısı
        const [X2, Y2] = D.proj(u - w * 0.02, w + u * 0.02); A[idx] = Math.atan2(Y2 - Y, X2 - X);
      }
    }
    const look = (arr, x, y, def) => { const i = Math.floor((x - bb[0]) / cell), j = Math.floor((y - bb[1]) / cell); if (i < 0 || j < 0 || i >= nx || j >= ny) return def; const v = arr[j * nx + i]; return v; };
    return { light: (x, y) => { const v = look(L, x, y, 0); return v < 0 ? 0.3 : v; }, ang: (x, y) => look(A, x, y, 0) };
  }
  reg('ekmek', () => {
    const k = 1, K = k; const S = Paint.sprite(450 * K, 320 * K, { seed: 2001, k }); const rr = rng(2003);
    const P = PAL.crust; const cx = 224 * K, y0 = 196 * K, R = 192 * K, H = 112 * K;
    const D = domeSurface(cx, y0, R, H, 0.56, [2.4, 0.62]);
    const hp = []; for (let j = 0; j < 72; j++) { const a = (j / 72) * TAU; for (const rho of [0.6, 0.85, 1]) hp.push(D.proj(Math.cos(a) * rho, Math.sin(a) * rho)); }
    hp.push(D.proj(0, 0));
    const body = polyShape(crPts(convexHull(hp), 6, true));
    const M = domeMap(D, body.bb, 3 * K, [-0.62, 0.7, -0.36]); // sol-üst-arkadan: kubbenin sol üstü en açık
    const sh = (x, y) => clamp(Math.pow(M.light(x, y), 1.35) * 1.05 - 0.04);
    const dirC = (x, y) => M.ang(x, y) + (S.r() - 0.5) * 0.3;
    // taban + basamaklı kabuk tonları (gerçek kubbe ışığıyla), konturu izleyen darbeler
    layer(S, { clip: body.path, bb: body.bb, cols: [P[1], P[2], P[3], P[4], P[5], P[6]], base: P[3], shade: sh, dir: dirC, len: [26, 50], wid: [12, 19], cover: 2.4, noise: 0.03, broken: 0.04, jitter: 6, rim: { w: 2.6, alpha: 0.9 } });
    // alt kenar ve sağ yan: koyu pişmiş kabuk (#6E300E) basamağı
    layer(S, { clip: [body.path, crescent(body.path, body.bb, 22 * K)], bb: body.bb, cols: [P[1], P[1], P[0]], base: P[1], dir: dirC, len: [20, 40], wid: [10, 16], cover: 1.6 });
    layer(S, { clip: [body.path, crescent(body.path, body.bb, 9 * K)], bb: body.bb, cols: [P[0], shade(P[0], 0.03)], base: P[0], dir: dirC, len: [16, 30], wid: [8, 12], cover: 1.6 });
    // pişmiş koyu benekler, kabarcıklar
    withClip(S, body.path, () => { for (let i = 0; i < 18; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * 0.8; const [x, y] = D.proj(Math.cos(a) * d, Math.sin(a) * d); dab(S, x, y, M.ang(x, y), 10 + rr() * 10, 5 + rr() * 3, P[2 + Math.floor(rr() * 2)], { alpha: 0.55, height: false }); } });
    // çizikler: haç biçimli iki yarık (yüzey uzayında), açılmış krem iç + kalkık parlak dudak
    const cut = (th, len0, len1, wd, sd) => {
      const n = 22; const c = Math.cos(th), s2 = Math.sin(th);
      const side = (sgn, f) => { const out = []; for (let i = 0; i <= n; i++) { const t = lerp(len0, len1, i / n); const ww = Math.sin(Math.PI * (i / n)) * wd * f * (1 + 0.15 * Math.sin(i * 1.3 + sd)); out.push(D.proj(c * t - s2 * ww * sgn, s2 * t + c * ww * sgn, 1.5 * K)); } return out; };
      const lens = shape([...side(1, 1), ...side(-1, 1).reverse()], 0.5);
      layer(S, { clip: lens.path, bb: lens.bb, cols: PAL.crumb.slice(1, 4), base: PAL.crumb[2], shade: (x, y) => clamp(0.3 + M.light(x, y) * 0.9), dir: Math.atan2(s2, c), dirJit: 0.25, len: [12, 22], wid: [5, 8], cover: 1.8 });
      // hangi kenar ışığa bakıyor (yüzey uzayında sol-arka)
      const litS = (-s2 * -0.55 + c * -0.45) > 0 ? 1 : -1;
      line(S, side(-litS, 0.6), 4, P[2], { w1: 1.6, taper: true, height: false });
      line(S, side(litS, 1.05), 6, P[6], { w1: 2.4, taper: true });
      line(S, side(litS, 1.22), 2.4, P[7], { w1: 1, taper: true, height: false });
    };
    cut(0.42, -0.7, 0.7, 0.12, 1);
    cut(0.42 + Math.PI / 2, -0.68, 0.68, 0.115, 2);
    // un tozu (tepede mat, açık)
    withClip(S, body.path, () => { for (let i = 0; i < 34; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * 0.62; const [x, y] = D.proj(Math.cos(a) * d - 0.1, Math.sin(a) * d - 0.08); dab(S, x, y, rr() * 3, 7 + rr() * 10, 4 + rr() * 4, '#FBF2DC', { alpha: 0.3 + rr() * 0.3, height: false, dry: 0.7 }); } });
    return done(S, cx, (body.bb[1] + body.bb[3]) / 2);
  }, { size: [389, 245], base: [0, 120] });

  // ================================================================ KAPLAR (dönel profil)
  // prof: [[y, yarıGenişlik], ...] yukarıdan aşağı; e: yatay çemberlerin basıklığı (ry/rx)
  function vessel(cx, prof, e, o = {}) {
    const sp = crPts(prof.map(([y, hw]) => [hw, y]), 3).map(([hw, y]) => [y, hw]);
    const hwAt = (y) => { if (y <= sp[0][0]) return sp[0][1]; for (let i = 0; i < sp.length - 1; i++) if (y >= sp[i][0] && y <= sp[i + 1][0]) return lerp(sp[i][1], sp[i + 1][1], (y - sp[i][0]) / (sp[i + 1][0] - sp[i][0] || 1)); return sp[sp.length - 1][1]; };
    const topY = sp[0][0], botY = sp[sp.length - 1][0], rTop = sp[0][1], rBot = sp[sp.length - 1][1];
    const pts = [];
    for (const [y, hw] of sp) pts.push([cx - hw, y]);
    for (let i = 0; i <= 20; i++) { const a = Math.PI - (i / 20) * Math.PI; pts.push([cx + Math.cos(a) * rBot, botY + Math.sin(a) * rBot * e]); }
    for (let i = sp.length - 1; i >= 0; i--) pts.push([cx + sp[i][1], sp[i][0]]);
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI; pts.push([cx + Math.cos(a) * rTop, topY - Math.sin(a) * rTop * e]); }
    const sh = polyShape(pts);
    // silindirik ışık: sol yan aydınlık, ince parlak şerit, sağda yansıma; omuzlar (yukarı bakan) daha açık
    const shadeF = (x, y) => {
      const hw = hwAt(y) || 1; const u = clamp((x - cx) / hw, -1, 1);
      const slope = (hwAt(y + 3) - hwAt(y - 3)) / 6; // >0: aşağı doğru genişliyor → yukarı bakan yüzey
      let v = 0.56 - u * 0.4 - u * u * 0.18 + clamp(slope * 0.9, -0.25, 0.3);
      if (u > -0.66 && u < -0.36) v += o.gloss ?? 0.18;
      if (u > 0.72) v += o.refl ?? 0.06;
      return clamp(v);
    };
    // hızlı genişlik tablosu (1 px adım) ve yüzey koordinatı: ekran (x,y) → (u, y0) ön yüzde
    const T0 = Math.floor(topY) - 2, TN = Math.ceil(botY) - T0 + 4; const HT = new Float32Array(TN);
    for (let i = 0; i < TN; i++) HT[i] = hwAt(T0 + i);
    const hwF = (y) => { const f = clamp(y - T0, 0, TN - 1.001); const i = Math.floor(f); return HT[i] + (HT[i + 1] - HT[i]) * (f - i); };
    const surf = (x, y) => {
      let y0 = y - hwF(y) * e * 0.6;
      for (let i = 0; i < 6; i++) { const hw = Math.max(0.5, hwF(y0)); const u = clamp((x - cx) / hw, -1, 1); y0 = clamp(y - Math.sqrt(1 - u * u) * hw * e, topY, botY); }
      const hw = Math.max(0.5, hwF(y0)); return [clamp((x - cx) / hw, -1, 1), y0, hw];
    };
    const slopeAt = (y0) => (hwF(y0 + 2.5) - hwF(y0 - 2.5)) / 5;
    // yüzey normali (dünya: x sağ, y aşağı, z izleyiciye)
    const normal = (u, y0) => { const s = slopeAt(y0); const z = Math.sqrt(Math.max(0, 1 - u * u)); const l = Math.hypot(u, s, z) || 1; return [u / l, -s / l, z / l]; };
    // darbe yönü: meridyen (profil boyunca) ekran açısı
    const merid = (x, y) => { const [u, y0] = surf(x, y); const s = slopeAt(y0); const z = Math.sqrt(Math.max(0, 1 - u * u)); return Math.atan2(1 + z * s * e, u * s); };
    return { ...sh, hwAt, hwF, surf, normal, merid, slopeAt, topY, botY, rTop, rBot, e, shadeF, cx, sp };
  }
  // dönel gövde ışığı: lambert + yansıyan ışık (+ isteğe bağlı keskin parlama). 0..1
  const H3 = (() => { const v = [L3[0], L3[1], L3[2] + 1]; const l = Math.hypot(...v); return v.map((q) => q / l); })();
  const revolveLight = (V, o = {}) => (x, y) => {
    const [u, y0] = V.surf(x, y); const n = V.normal(u, y0);
    let v = (n[0] * L3[0] + n[1] * L3[1] + n[2] * L3[2]) * (o.c ?? 0.66) + (o.b ?? 0.36);
    v = Math.pow(clamp(v), o.gamma ?? 1);
    if (o.bounce) v += o.bounce * clamp((u - 0.62) / 0.3) * (1 - clamp((u - 0.97) / 0.03));
    if (o.spec) { const sp = Math.pow(Math.max(0, n[0] * H3[0] + n[1] * H3[1] + n[2] * H3[2]), o.specPow ?? 24); v += sp * o.spec; }
    return clamp(v * (o.k ?? 1) + (o.lift ?? 0));
  };
  // yüzeyde yatay çember (ön yarı) noktaları: y seviyesinde
  const ringPts = (V, y, a0 = 0, a1 = Math.PI, n = 24, sc = 1) => { const hw = V.hwAt(y) * sc; const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([V.cx + Math.cos(a) * hw, y + Math.sin(a) * hw * V.e]); } return out; };

  // ================================================================ BAL (sırlı kâsede bal, tahta kaşık, damlayan bal)
  reg('bal', () => {
    const k = 1, K = k; const S = Paint.sprite(390 * K, 390 * K, { seed: 2101, k }); const rr = rng(2103);
    const G = PAL.glazeB, HN = PAL.honey, WD = PAL.wood; const cx = 186 * K; const e = 0.3;
    const V = vessel(cx, [[176, 156], [190, 156], [226, 148], [262, 128], [296, 100], [318, 80], [328, 74]].map(([y, w]) => [y * K, w * K]), e, { gloss: 0.22 });
    // ayak halkası
    const foot = ellShape(cx, 330 * K, 80 * K, 22 * K);
    layer(S, { clip: foot.path, bb: foot.bb, cols: [G[0], G[1], G[2]], base: G[1], shade: (x) => clamp(0.6 - (x - cx) / (160 * K)), dir: 0, len: [16, 28], wid: [6, 9], cover: 1.6, rim: { w: 2, alpha: 0.85 } });
    // kâse gövdesi: kobalt sır, basamaklı ton, dikey darbeler (profili izler)
    layer(S, { clip: V.path, bb: V.bb, cols: [G[0], G[1], G[2], G[3], G[4], G[5]], base: G[2], shade: V.shadeF, dir: (x, y) => Math.PI / 2 + ((x - cx) / (V.hwAt(y) || 1)) * 0.5 + (S.r() - 0.5) * 0.15, len: [22, 40], wid: [9, 14], cover: 2.2, noise: 0.03, broken: 0.03, rim: { w: 2.4, alpha: 0.9 } });
    // beyaz bant ve nokta süsü
    const by0 = 214 * K, by1 = 232 * K;
    const band = polyShape([...ringPts(V, by0, Math.PI, 0, 24), ...ringPts(V, by1, 0, Math.PI, 24)]);
    layer(S, { clip: [V.path, band.path], bb: band.bb, cols: ['#C8D4E8', '#E6EEF8', '#FFFFFF'], base: '#E6EEF8', shade: V.shadeF, dir: 0, dirJit: 0.1, len: [14, 24], wid: [5, 8], cover: 1.6 });
    for (let i = 1; i < 12; i++) { const a = Math.PI - (i / 12) * Math.PI; const hw = V.hwAt(250 * K); const x = cx + Math.cos(a) * hw * 0.98, y = 250 * K + Math.sin(a) * hw * e; const s2 = 0.5 + 0.5 * Math.sin(a); fill(S, ellipsePath(x, y, 4.2 * K * s2 + 1.5 * K, 4.2 * K, 0), '#F2F6FC', { h: 175 }); }
    // ağız: iç duvar (krem sır) ve bal yüzeyi
    const rimE = ellShape(cx, 176 * K, 156 * K, 156 * K * e);
    layer(S, { clip: rimE.path, bb: rimE.bb, cols: ['#C9BCA0', '#E4D8BE', '#F6EEDC'], base: '#E4D8BE', shade: (x, y) => clamp(0.3 + (y - rimE.bb[1]) / (rimE.bb[3] - rimE.bb[1]) * 0.8 + (x - cx) / (900 * K)), dir: 0, len: [20, 36], wid: [7, 11], cover: 1.6 });
    const hy = 184 * K; const honeyE = ellShape(cx, hy, 142 * K, 142 * K * e * 0.95);
    layer(S, { clip: honeyE.path, bb: honeyE.bb, cols: [HN[1], HN[2], HN[3], HN[4], HN[5]], base: HN[3], shade: (x, y) => clamp(0.25 + (y - honeyE.bb[1]) / (honeyE.bb[3] - honeyE.bb[1]) * 0.55 + Math.max(0, 0.35 - Math.hypot((x - (cx - 50 * K)) / (90 * K), (y - (hy - 4 * K)) / (24 * K))) * 1.2), dir: 0, dirJit: 0.15, len: [24, 44], wid: [7, 12], cover: 2, noise: 0.04 });
    // bal yüzeyinde ışık yansıması (keskin) ve sır kenarı
    dab(S, cx - 70 * K, hy - 8 * K, 0.05, 40, 7, HN[6], { alpha: 0.9, height: false });
    dab(S, cx - 30 * K, hy - 13 * K, 0.0, 18, 4, '#FFFFFF', { alpha: 0.8, height: false });
    // dudak: ön kenarda açık ince bant, arka kenarda koyu
    line(S, ringPts(V, 176 * K, 0.08, Math.PI - 0.08, 30), 4.5, G[6], { w1: 4.5, height: true });
    line(S, ringPts(V, 177 * K, Math.PI + 0.1, TAU - 0.1, 30), 3, G[1], { w1: 3, height: false });
    line(S, ringPts(V, 178 * K, 2.0, 2.9, 10), 2.4, '#FFFFFF', { w1: 1, taper: true, height: false });
    // dışa taşan damla (ön sol, kenardan aşağı)
    const dx = cx - 70 * K; const dTop = 176 * K + V.hwAt(176 * K) * e * 0.9;
    const drip = shape([[dx - 14 * K, dTop - 4 * K], [dx + 14 * K, dTop - 4 * K], [dx + 8 * K, dTop + 14 * K], [dx + 5 * K, dTop + 44 * K], [dx + 9 * K, dTop + 56 * K], [dx, dTop + 66 * K], [dx - 9 * K, dTop + 56 * K], [dx - 5 * K, dTop + 44 * K], [dx - 7 * K, dTop + 14 * K]], 0.5);
    layer(S, { clip: drip.path, bb: drip.bb, cols: [HN[2], HN[3], HN[4]], base: HN[3], shade: (x) => clamp(0.7 - (x - dx) / (20 * K)), dir: Math.PI / 2, len: [12, 20], wid: [5, 7], cover: 2, rim: { w: 1.2, alpha: 0.7 } });
    line(S, [[dx - 4 * K, dTop + 4 * K], [dx - 2 * K, dTop + 40 * K]], 2.6, HN[6], { w1: 1, taper: true, height: false });
    fill(S, ellipsePath(dx - 3 * K, dTop + 56 * K, 2.6 * K, 3.2 * K, 0), '#FFFFFF', { alpha: 0.85, height: false });
    // tahta bal kaşığı: sap sağ üste uzanır, oluklu baş kâsenin üstünde; baştan bal akar
    const hx = 136 * K, hy0 = 112 * K; const ang = -0.56; const ax = Math.cos(ang), ay = Math.sin(ang);
    const hEnd = [hx + ax * 200 * K, hy0 + ay * 200 * K];
    const handle = [[hx + ax * 30 * K, hy0 + ay * 30 * K], hEnd];
    line(S, handle, 13, WD[2], { w1: 10, rim: { w: 1.4, alpha: 0.85 } });
    line(S, handle.map(([x, y]) => [x - 1.5 * K, y - 3.2 * K]), 4.5, WD[5], { w1: 3.2, height: false });
    fill(S, ellipsePath(hEnd[0], hEnd[1], 5.5 * K, 6.5 * K, ang), WD[4], { h: 160 });
    // akış: baştan bal yüzeyine kurdele gibi
    const flow = []; for (let i = 0; i <= 16; i++) { const t = i / 16; flow.push([hx - 2 * K + Math.sin(t * 5) * 3 * K * t, hy0 + 30 * K + t * (hy - hy0 - 30 * K)]); }
    line(S, flow, 7, HN[3], { w1: 5, rim: false });
    line(S, flow.map(([x, y]) => [x - 1.6 * K, y]), 2.4, HN[6], { w1: 1.4, taper: true, height: false });
    // akışın yüzeyde kıvrılan halkası
    line(S, crPts([[hx - 22 * K, hy + 2 * K], [hx - 8 * K, hy + 7 * K], [hx + 14 * K, hy + 5 * K], [hx + 20 * K, hy], [hx + 4 * K, hy - 3 * K]], 3), 6, HN[4], { w1: 3, taper: true });
    // oluklu baş: eksen boyunca dizili diskler, alt yarısı balla kaplı
    for (let i = -2; i <= 2; i++) {
      const t = i * 11 * K; const x = hx + ax * t, y = hy0 + ay * t; const rad = (33 - Math.abs(i) * 5) * K;
      const disc = ellShape(x, y, rad * 0.42, rad, ang);
      layer(S, { clip: disc.path, bb: disc.bb, cols: [WD[2], WD[3], WD[4], WD[5]], base: WD[3], shade: (px, py) => clamp(0.75 - ((px - x) * -LX + (py - y) * -LY) / (rad * 1.6) - 0.1), dir: ang + Math.PI / 2, len: [8, 14], wid: [4, 6], cover: 2, rim: { w: 1.2, alpha: 0.8 } });
      // bal kaplaması (alt kısım)
      fill(S, ellipsePath(x + 2 * K, y + rad * 0.45, rad * 0.4, rad * 0.55, ang), HN[3], { clip: disc.path, alpha: 0.9, h: 160 });
      fill(S, ellipsePath(x - rad * 0.12, y + rad * 0.2, rad * 0.08, rad * 0.22, ang), HN[6], { clip: disc.path, alpha: 0.9, height: false });
    }
    fill(S, ellipsePath(hx - 3 * K, hy0 + 26 * K, 9 * K, 11 * K, 0), HN[3], { h: 160 });
    fill(S, ellipsePath(hx - 6 * K, hy0 + 22 * K, 2.6 * K, 4 * K, 0), '#FFFFFF', { alpha: 0.85, height: false });
    return done(S, cx, 200 * K);
  }, { size: [317, 353], base: [0, 150] });

  // ================================================================ SÜT (ağzında süt görünen toprak sürahi)
  reg('sut', () => {
    const k = 1, K = k; const S = Paint.sprite(330 * K, 460 * K, { seed: 2201, k }); const rr = rng(2203);
    const C = ['#3E160C', '#5A2212', '#7A3218', '#9A4622', '#B65E30', '#CC7A48', '#E09C6C', '#F2C49E']; const M = PAL.milk;
    const cx = 160 * K; const e = 0.3;
    const V = vessel(cx, [[70, 70], [82, 66], [104, 58], [132, 70], [180, 104], [240, 118], [300, 110], [360, 88], [404, 74], [414, 72]].map(([y, w]) => [y * K, w * K]), e, { gloss: 0.16 });
    // kulp (arkada, sağda): boyundan karına kalın şerit
    const hd = crPts([[cx + 58 * K, 104 * K], [cx + 104 * K, 104 * K], [cx + 140 * K, 150 * K], [cx + 138 * K, 220 * K], [cx + 108 * K, 268 * K]], 4);
    line(S, hd, 24, '#3A5014', { w1: 20, rim: { w: 1.6, alpha: 0.85 } });
    line(S, hd.map(([x, y]) => [x - 3 * K, y - 2 * K]), 10, '#667E26', { w1: 8, height: false });
    line(S, hd.map(([x, y]) => [x - 5 * K, y - 4 * K]), 3, '#A6B65C', { w1: 2, height: false });
    // gövde
    const cerL = revolveLight(V, { bounce: 0.1, spec: 0.5, specPow: 30, gamma: 1 });
    stepBody(S, V.path, V.bb, [C[1], C[2], C[3], C[4], C[5], C[6]], cerL, V.merid, { thr: [0.26, 0.42, 0.57, 0.72, 0.88], len: [20, 38], wid: [9, 13], rim: { w: 2.2, alpha: 0.9 } });
    // üst yarı yeşil sır (daldırma; aşağıya düzensiz akıntılarla)
    const GZ = ['#22300E', '#344814', '#4C621C', '#667E26', '#84983A', '#A6B65C', '#D2DC96'];
    const gl = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI; const run = Math.max(0, Math.sin(i * 1.9 + 1) * 0.6 + Math.sin(i * 0.7) * 0.5) * 22 * K; const yy = 226 * K + run; const hw = V.hwAt(yy) * 1.05; gl.push([cx + Math.cos(a) * hw, yy + Math.sin(a) * hw * e]); }
    const glaze = polyShape([[cx + 130 * K, 226 * K], ...gl, [cx - 130 * K, 226 * K], [cx - 130 * K, 40 * K], [cx + 130 * K, 40 * K]]);
    stepBody(S, [V.path, glaze.path], V.bb, [GZ[1], GZ[2], GZ[3], GZ[4], GZ[5], GZ[6]], cerL, V.merid, { thr: [0.2, 0.36, 0.52, 0.68, 0.88], len: [18, 34], wid: [8, 12], rim: false });
    // omuzda iki ince boyalı krem çizgi + dalga
    for (const yy of [150, 164]) line(S, ringPts(V, yy * K, 0.05, Math.PI - 0.05, 30), 3.2, '#F2DEC0', { w1: 3.2, height: false });
    const wv = []; for (let i = 0; i <= 40; i++) { const a = 0.08 + (i / 40) * (Math.PI - 0.16); const yy = 196 * K + Math.sin(i * 1.1) * 6 * K; const hw = V.hwAt(yy); wv.push([cx + Math.cos(a) * hw, yy + Math.sin(a) * hw * e]); }
    line(S, wv, 3, '#F2DEC0', { w1: 3, height: false });
    // ağız: dudak halkası + süt yüzeyi
    const lipO = ellShape(cx, 70 * K, 70 * K, 70 * K * e);
    // emzik (sol): dudaktan dışa sivrilen oluk
    const GZ2 = ['#344814', '#4C621C', '#667E26', '#84983A', '#A6B65C', '#D2DC96'];
    const sp = shape([[cx - 54 * K, 56 * K], [cx - 96 * K, 52 * K], [cx - 108 * K, 58 * K], [cx - 96 * K, 70 * K], [cx - 60 * K, 88 * K]], 0.4);
    layer(S, { clip: sp.path, bb: sp.bb, cols: [GZ2[2], GZ2[3], GZ2[4]], base: GZ2[3], shade: (x, y) => clamp(0.8 - (y - 50 * K) / (40 * K)), dir: Math.PI, len: [14, 22], wid: [6, 9], cover: 2, rim: { w: 1.6, alpha: 0.85 } });
    layer(S, { clip: lipO.path, bb: lipO.bb, cols: [GZ2[1], GZ2[2], GZ2[3]], base: GZ2[2], shade: (x, y) => clamp(0.3 + (y - lipO.bb[1]) / (lipO.bb[3] - lipO.bb[1]) * 0.7), dir: 0, len: [16, 26], wid: [6, 9], cover: 1.8 });
    const milk = ellShape(cx - 2 * K, 72 * K, 58 * K, 58 * K * e * 0.92);
    layer(S, { clip: milk.path, bb: milk.bb, cols: [M[1], M[2], M[3], M[4], M[5]], base: M[3], shade: (x, y) => clamp(0.35 + (y - milk.bb[1]) / (milk.bb[3] - milk.bb[1]) * 0.5 - (x - cx) / (300 * K)), dir: 0, dirJit: 0.1, len: [18, 30], wid: [6, 10], cover: 2 });
    dab(S, cx - 26 * K, 70 * K, 0.05, 24, 5, '#FFFFFF', { alpha: 0.95, height: false });
    // emzik oluğunda süt ve süzülen damla
    fill(S, shape([[cx - 58 * K, 64 * K], [cx - 92 * K, 58 * K], [cx - 100 * K, 61 * K], [cx - 90 * K, 66 * K], [cx - 60 * K, 74 * K]], 0.4).path, M[4], { h: 160 });
    // emziğin ucunda dudağa yapışmış küçük süt boncuğu (≤ 9 px)
    const bead = shape([[cx - 107 * K, 63 * K], [cx - 101 * K, 63.5 * K], [cx - 100 * K, 68 * K], [cx - 103.5 * K, 71.5 * K], [cx - 107.5 * K, 68.5 * K]], 0.5);
    fill(S, bead.path, M[3], { h: 165 }); fill(S, ellipsePath(cx - 104.5 * K, 66 * K, 1.4 * K, 1.8 * K, 0), '#FFFFFF', { height: false });
    // dudak ön kenarı açık
    line(S, ringPts(V, 70 * K, 0.1, Math.PI - 0.5, 24), 4.5, GZ2[5], { w1: 3, taper: true });
    return done(S, cx + 12 * K, 240 * K);
  }, { size: [276, 391], base: [0, 195] });

  // ================================================================ SU TESTİSİ (toprak testi: dar boyun, emzik, kulp)
  reg('su-testi', () => {
    const k = 1, K = k; const S = Paint.sprite(330 * K, 460 * K, { seed: 2301, k }); const rr = rng(2303);
    const C = PAL.clay; const cx = 162 * K; const e = 0.3;
    const V = vessel(cx, [[52, 34], [60, 32], [70, 26], [96, 24], [124, 34], [160, 76], [204, 112], [252, 122], [300, 112], [352, 86], [400, 66], [412, 64]].map(([y, w]) => [y * K, w * K]), e, { gloss: 0.18 });
    // kulp (sağ): boyundan omza
    const hd = crPts([[cx + 22 * K, 86 * K], [cx + 70 * K, 76 * K], [cx + 104 * K, 104 * K], [cx + 104 * K, 150 * K], [cx + 86 * K, 178 * K]], 4);
    line(S, hd, 20, C[2], { w1: 18, rim: { w: 1.6, alpha: 0.85 } });
    line(S, hd.map(([x, y]) => [x - 2.5 * K, y - 2 * K]), 8, C[5], { w1: 6, height: false });
    // emzik (sol omuzda, yukarı-sola bakan kısa ağız)
    const spA = -2.3; const sx0 = cx - 64 * K, sy0 = 150 * K; const sx1 = sx0 + Math.cos(spA) * 48 * K, sy1 = sy0 + Math.sin(spA) * 48 * K;
    line(S, [[sx0, sy0], [sx1, sy1]], 26, C[3], { w1: 16, rim: { w: 1.6, alpha: 0.85 } });
    line(S, [[sx0 - 3 * K, sy0 - 2 * K], [sx1 - 3 * K, sy1 - 1 * K]], 9, C[5], { w1: 5, height: false });
    fill(S, ellipsePath(sx1, sy1, 10 * K, 6 * K, spA + Math.PI / 2), C[1], { h: 110 });
    line(S, ellPts(sx1, sy1, 10 * K, 6 * K, spA + Math.PI / 2, 20).concat([ellPts(sx1, sy1, 10 * K, 6 * K, spA + Math.PI / 2, 20)[0]]), 2.4, C[6], { height: false });
    // gövde
    stepBody(S, V.path, V.bb, [C[1], C[2], C[3], C[4], C[5], C[6]], revolveLight(V, { bounce: 0.12, spec: 0.35, specPow: 26, gamma: 1 }), V.merid, { thr: [0.26, 0.42, 0.57, 0.72, 0.88], len: [20, 38], wid: [9, 13], rim: { w: 2.2, alpha: 0.9 } });
    // omuzda oyma halkalar (koyu oluk + açık sırt)
    for (const yy of [170, 182, 312]) { const q = ringPts(V, yy * K, 0.06, Math.PI - 0.06, 30); crease(S, q, 2.4, C[2], C[6], { alpha: 0.75 }); }
    // terleyen testi: altta serin nem lekeleri (koyu, soğuk) ve birkaç damla
    withClip(S, V.path, () => { for (let i = 0; i < 14; i++) { const y = (300 + rr() * 90) * K; const hw = V.hwAt(y); const x = cx + (rr() - 0.5) * hw * 1.6; dab(S, x, y, Math.PI / 2, 12 + rr() * 10, 6 + rr() * 4, C[2], { alpha: 0.35, height: false }); } });
    for (const [u, y] of [[-0.42, 262], [-0.2, 300], [-0.55, 330]]) { const hw = V.hwAt(y * K); const x = cx + u * hw, yy = y * K; fill(S, ellipsePath(x, yy, 3 * K, 4 * K, 0), C[6], { h: 170 }); fill(S, ellipsePath(x - 1 * K, yy - 1.4 * K, 1.1 * K, 1.4 * K, 0), '#FFFFFF', { height: false, alpha: 0.9 }); }
    // ağız: dudak halkası ve koyu iç
    const lip = ellShape(cx, 52 * K, 34 * K, 34 * K * e);
    layer(S, { clip: lip.path, bb: lip.bb, cols: [C[3], C[4], C[5]], base: C[4], shade: (x, y) => clamp(0.4 + (y - lip.bb[1]) / (lip.bb[3] - lip.bb[1]) * 0.6), dir: 0, len: [10, 16], wid: [5, 7], cover: 1.8 });
    fill(S, ellipsePath(cx, 53 * K, 24 * K, 24 * K * e * 0.8), C[0], { h: 100 });
    line(S, ringPts(V, 52 * K, 0.15, Math.PI - 0.6, 16), 3.6, C[6], { w1: 2.2, taper: true });
    return done(S, cx, 236 * K);
  }, { size: [249, 394], base: [0, 195] });

  // ================================================================ SU BARDAĞI (berrak su, cam parıltıları; yarı saydam)
  // cam yardımcıları: silindir boyunca düz bant (u0..u1, y0..y1), keskin kenarlı yarı saydam dolgu
  const glassBand = (V, u0, u1, y0, y1, step = 3) => { const L = [], R = []; for (let y = y0; y <= y1 + 0.1; y += step) { const hw = V.hwF(y); L.push([V.cx + u0 * hw, y]); R.push([V.cx + u1 * hw, y]); } return poly([...L, ...R.reverse()]); };
  function glassBody(S, V, o) {
    const K = S.k; const { top, bot, wy } = o; const cx = V.cx; const e = V.e;
    S.rim(V.path, { w: 1, alpha: 0.35 });
    fill(S, V.path, '#E2F2F8', { alpha: 0.14, h: 130 });
    // kırılan koyu bant (sağ iç kenar) + sol kenarda ince serin bant: krem zeminde camı görünür kılar
    fill(S, glassBand(V, 0.6, 0.9, top + 6 * K, bot - 8 * K), '#4A7E9C', { clip: V.path, alpha: 0.4, height: false });
    fill(S, glassBand(V, -0.97, -0.86, top + 8 * K, bot - 10 * K), '#6A98B2', { clip: V.path, alpha: 0.32, height: false });
    if (wy) {
      // su: üç düz ton bandı (sol açık, orta, sağ koyu kırılma)
      const wpts = [...ringPts(V, wy, Math.PI, 0, 24, 0.96)];
      for (let y = wy; y <= o.wb; y += 3 * K) wpts.push([cx + V.hwF(y) * 0.95, y]);
      for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI; wpts.push([cx + Math.cos(a) * V.hwF(o.wb) * 0.95, o.wb + Math.sin(a) * V.hwF(o.wb) * 0.95 * e]); }
      for (let y = o.wb; y >= wy; y -= 3 * K) wpts.push([cx - V.hwF(y) * 0.95, y]);
      const water = polyShape(wpts);
      fill(S, water.path, '#9ED6E8', { alpha: 0.3, h: 132 });
      fill(S, glassBand(V, -1, -0.3, wy - 30 * K, o.wb + 30 * K), '#D2F0F7', { clip: water.path, alpha: 0.5, height: false });
      fill(S, glassBand(V, 0.42, 1, wy - 30 * K, o.wb + 30 * K), '#3F8AAE', { clip: water.path, alpha: 0.45, height: false });
      // yüzey: iki basamak (arka yarı koyu), keskin menisküs çizgisi
      const surf = ellShape(cx, wy, V.hwF(wy) * 0.96, V.hwF(wy) * 0.96 * e);
      fill(S, surf.path, '#D8F3F9', { alpha: 0.8, h: 140 });
      fill(S, ellipsePath(cx + V.hwF(wy) * 0.1, wy - V.hwF(wy) * e * 0.28, V.hwF(wy) * 0.8, V.hwF(wy) * e * 0.55), '#A6DAE9', { clip: surf.path, alpha: 0.6, height: false });
      softLine(S, ringPts(V, wy, 0.06, Math.PI - 0.06, 28, 0.96), 2.2, '#FFFFFF', 0.95);
      softLine(S, ringPts(V, wy + 2.2 * K, 0.2, Math.PI - 0.2, 24, 0.95), 1.4, '#4E8EAE', 0.55);
    }
    // kalın cam taban
    const baseE = ellShape(cx, bot - 6 * K, V.hwF(bot) * 0.95, V.hwF(bot) * e * 1.1);
    fill(S, baseE.path, '#D4EEF6', { alpha: 0.55, h: 150 });
    softLine(S, ringPts(V, bot - 4 * K, 0.18, Math.PI - 0.18, 20, 0.9), 2.6, '#FFFFFF', 0.85);
    // iki keskin parıltı: solda uzun dar (menisküste kesik), sağda kısa
    const hl = (u0, u1, y0, y1, a) => fill(S, glassBand(V, u0, u1, y0, y1), '#FFFFFF', { alpha: a, height: false });
    if (wy) { hl(-0.66, -0.55, top + 12 * K, wy - 10 * K, 0.92); hl(-0.64, -0.54, wy + 14 * K, bot - 24 * K, 0.85); }
    else hl(-0.66, -0.55, top + 12 * K, bot - 24 * K, 0.9);
    hl(0.7, 0.77, top + 24 * K, top + (bot - top) * 0.45, 0.75);
    // dudak ve dış hat
    softLine(S, ringPts(V, top, Math.PI, TAU, 30), 1.8, '#9CC2D6', 0.85);
    softLine(S, ringPts(V, top, 0, Math.PI, 30), 2.6, '#FFFFFF', 0.95);
    const outl = (sg) => { const q = []; for (let y = top; y <= bot; y += 4 * K) q.push([cx + sg * V.hwF(y), y]); softLine(S, q, 1.6, sg < 0 ? '#E6F8FF' : '#4E86A6', 0.8); };
    outl(-1); outl(1);
    softLine(S, ringPts(V, bot, 0, Math.PI, 24), 1.8, '#4E86A6', 0.7);
    S.hx.save(); S.hx.strokeStyle = 'rgb(190,190,190)'; S.hx.lineWidth = 3 * K; S.hx.stroke(V.path); S.hx.restore();
  }
  reg('su-bardak', () => {
    const k = 1.25, K = k; const S = Paint.sprite(190 * K, 300 * K, { seed: 2401, k });
    const cx = 95 * K; const e = 0.26; const top = 40 * K, bot = 262 * K; const RT = 72 * K, RB = 56 * K;
    const V = vessel(cx, [[top, RT], [bot, RB]], e);
    glassBody(S, V, { top, bot, wy: 92 * K, wb: bot - 14 * K });
    return done(S, cx, 150 * K, 0.3);
  }, { size: [146, 257], base: [0, 126] });

  // ================================================================ SOFRA (alçak yuvarlak köy sofrası, beyaz keten örtü)
  // pivot: üst yüz (örtü) elipsinin merkezi. Üst yüz: rx 540, ry 150 (ekran px, ölçek 1)
  const SOFRA = { rx: 540, ry: 150, e: 150 / 540, hang: 74 };
  reg('sofra', () => {
    const k = 1, K = k; const W0 = 1140 * K, H0 = 500 * K; const S = Paint.sprite(W0, H0, { seed: 2501, k }); const rr = rng(2503);
    const LI = PAL.linen, WD = PAL.woodT; const cx = 570 * K, cy = 170 * K; const RX = SOFRA.rx * K, RY = SOFRA.ry * K;
    const HG = SOFRA.hang * K; // örtünün ön kenardan sarkması
    const RXc = RX * 1.012, RYc = RY * 1.02; // örtü üst yüzü (tablayı tamamen örter)
    // örtü eteği: ön yay boyunca sarkan bant; etek ucu 4–5 yumuşak kıvrımla dalgalı
    const NF = 4.5, ph = 0.6;
    const foldA = (a) => Math.sin(a * NF * 2 + ph); // kıvrım fazı (a: 0..π, sağdan sola)
    const hemY = (a) => cy + Math.sin(a) * RYc + HG * (0.92 + 0.08 * Math.sin(a)) + 11 * K * foldA(a) * Math.pow(Math.sin(a), 0.7);
    const topY = (a) => cy + Math.sin(a) * RYc;
    const aOfX = (x) => Math.acos(clamp((x - cx) / RXc, -1, 1)); // ön yay
    // ayaklar: kısa, kalın, tornalı (önde iki, arkada biri görünür); etek altında başlar
    const legs = [];
    for (const [lx, back] of [[0, 1], [-318, 0], [318, 0]]) {
      const x = cx + lx * K, y0 = cy + RY * (back ? 0.5 : 0.78); const hh = (back ? 214 : 236) * K, ww = (back ? 22 : 28) * K;
      const leg = shape([[x - ww, y0], [x + ww, y0], [x + ww * 0.72, y0 + hh * 0.6], [x + ww * 0.95, y0 + hh * 0.8], [x + ww * 0.8, y0 + hh], [x - ww * 0.8, y0 + hh], [x - ww * 0.95, y0 + hh * 0.8], [x - ww * 0.72, y0 + hh * 0.6]], 0.3);
      layer(S, { clip: leg.path, bb: leg.bb, cols: [WD[back ? 0 : 1], WD[back ? 1 : 2], WD[back ? 2 : 3], WD[back ? 3 : 4]], base: WD[back ? 1 : 2], shade: (px) => clamp(0.75 - (px - x) / (ww * 2.2)), dir: Math.PI / 2, len: [18, 32], wid: [8, 12], cover: 1.8, rim: { w: 2, alpha: 0.85 } });
      line(S, [[x - ww * 0.75, y0 + hh * 0.61], [x + ww * 0.75, y0 + hh * 0.61]], 3.4, WD[0], { height: false });
      line(S, [[x - ww * 0.9, y0 + hh * 0.81], [x + ww * 0.9, y0 + hh * 0.81]], 3, WD[5], { height: false });
      legs.push({ leg, x, ww });
    }
    // etek altındaki basamaklı gölge (ayakların üst kısmında, etek ucunu izleyen dalgalı sınır)
    for (const { leg, x, ww } of legs) {
      const pts = []; for (let i = 0; i <= 12; i++) { const xx = x - ww * 1.2 + (i / 12) * ww * 2.4; pts.push([xx, hemY(aOfX(xx)) + 26 * K]); }
      pts.push([x + ww * 1.2, 0], [x - ww * 1.2, 0]);
      fill(S, poly(pts), WD[0], { clip: leg.path, alpha: 0.72, height: false });
      const p2 = pts.slice(0, 13).map(([px, py]) => [px, py - 12 * K]); p2.push([x + ww * 1.2, 0], [x - ww * 1.2, 0]);
      fill(S, poly(p2), '#24100A', { clip: leg.path, alpha: 0.5, height: false });
    }
    // --- örtü üst yüzü: geniş düz keten; sol üst bir basamak açık, arka kenar ince sırt
    const topPts = []; for (let i = 0; i < 120; i++) { const a = (i / 120) * TAU; const wob = 1 + 0.004 * Math.sin(a * 7 + 1); topPts.push([cx + Math.cos(a) * RXc * wob, cy + Math.sin(a) * RYc * wob]); }
    const top = shape(topPts, 0.5);
    const topV = (x, y) => clamp(0.58 + (cx - x) / (RXc * 2.2) + (cy - y) / (RYc * 3.2) - Math.pow((x - cx) / RXc, 4) * 0.16);
    { const bk = new Path2D(); for (let i = 0; i <= 60; i++) { const a = Math.PI - 0.06 + (i / 60) * (Math.PI + 0.12); const x = cx + Math.cos(a) * RXc, y = cy + Math.sin(a) * RYc; i ? bk.lineTo(x, y) : bk.moveTo(x, y); } S.rim(bk, { w: 1.8, alpha: 0.7 }); }
    const cdir = (x, y) => { // elips konturu boyunca (ortada yataya yaklaşır)
      const dx = x - cx, dy = y - cy; let a = Math.atan2(RYc * RYc * dx, -RXc * RXc * dy); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
      const rho = Math.hypot(dx / RXc, dy / RYc); return a * clamp(rho * rho * 1.2) + (S.r() - 0.5) * 0.05; };
    stepBody(S, top.path, top.bb, [LI[3], LI[4], LI[5], LI[6]], topV, cdir, { thr: [0.4, 0.56, 0.72], len: [60, 110], wid: [14, 20], edgeFreq: 0.006, edgeAmp: 0.05, rim: false });
    // --- etek: ön yaydan sarkan kıvrımlı bant (dikey kıvrım tüpleri; sol yanları ışıkta)
    const sk = [];
    for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI; sk.push([cx + Math.cos(a) * RXc, topY(a) - 2 * K]); }
    for (let i = 96; i >= 0; i--) { const a = (i / 96) * Math.PI; const fl = 1 + 0.012 * foldA(a); sk.push([cx + Math.cos(a) * RXc * fl, hemY(a)]); }
    const skirt = polyShape(sk);
    const skirtV = (x, y) => {
      const a = aOfX(x); const t = clamp((y - topY(a)) / HG); // sarkma oranı
      const fold = Math.sin(a * NF * 2 + ph + 1.35) * (0.8 + 0.2 * t); // kıvrım tüpü: sol yanı ışıkta
      return clamp(0.47 - Math.cos(a) * 0.14 + fold * 0.3 - t * 0.03);
    };
    stepBody(S, skirt.path, skirt.bb, [shade(LI[0], -0.03), mix(LI[0], LI[1], 0.55), LI[1], LI[2], LI[3]], skirtV, (x, y) => Math.PI / 2 + (x - cx) / RXc * 0.12 + (S.r() - 0.5) * 0.06, { thr: [0.22, 0.36, 0.5, 0.64], len: [26, 46], wid: [12, 18], edgeFreq: 0.02, edgeAmp: 0.015, rim: false });
    { const hp = new Path2D(); for (let i = 0; i <= 96; i++) { const a = (i / 96) * Math.PI; const fl = 1 + 0.012 * foldA(a); const x = cx + Math.cos(a) * RXc * fl, y = hemY(a); i ? hp.lineTo(x, y) : hp.moveTo(x, y); } S.rim(hp, { w: 2.2, alpha: 0.85 }); }
    // tabla kenarında katlanan örtü: açık, yuvarlak sırt (ışığı yakalar)
    { const q = []; for (let i = 3; i <= 93; i++) { const a = (i / 96) * Math.PI; q.push([cx + Math.cos(a) * RXc * 0.999, topY(a) + 1 * K]); } line(S, q, 6, LI[6], { taper: true, height: true }); }
    // nakışlı etek bordürü: ucu izleyen kırmızı + çivit çift şerit (kıvrımlarla dalgalanır)
    const border = (off, w, col) => { const q = []; for (let i = 2; i <= 94; i++) { const a = (i / 96) * Math.PI; const fl = 1 + 0.012 * foldA(a); q.push([cx + Math.cos(a) * RXc * fl * 0.998, hemY(a) - off * K]); } line(S, q, w, col, { height: false }); };
    border(16, 5, '#E2582E'); border(23, 2.2, '#1A3E99'); border(9.5, 2.2, '#1A3E99');
    // kıvrım içlerinde, etek ucunda koyu kısa gölge cepleri (ucun altı)
    withClip(S, skirt.path, () => {
      for (let i = 0; i < 60; i++) { const a = 0.08 + (i / 60) * (Math.PI - 0.16); if (foldA(a) < 0.55) continue; const x = cx + Math.cos(a) * RXc; dab(S, x, hemY(a) - 6 * K, 0, 14, 7, LI[1], { alpha: 0.85, height: false }); }
    });
    // etek ucu: ince açık kenar (kıvrım dudakları)
    { const q = []; for (let i = 1; i <= 95; i++) { const a = (i / 96) * Math.PI; const fl = 1 + 0.012 * foldA(a); q.push([cx + Math.cos(a) * RXc * fl, hemY(a) - 2 * K]); } line(S, q, 2.4, LI[5], { taper: true, height: false }); }
    return done(S, cx, cy, 0.2);
  }, { size: [1102, 484], base: [0, 329] });

  // ================================================================ TABAK (sofra açısında sırlı tabak)
  function plateOn(S, cx, cy, RX, o = {}) {
    const K = S.k; const e = o.e ?? 0.28; const RY = RX * e;
    const W0 = o.pal ?? ['#8C8CA8', '#B2B4C8', '#D2D2DE', '#E8E6EA', '#F6F3EE', '#FFFDF8'];
    const B = o.band ?? PAL.glazeB;
    // alt kalınlık + ayak gölgesi
    const under = ellShape(cx, cy + 9 * K, RX * 0.99, RY * 0.99);
    layer(S, { clip: under.path, bb: under.bb, cols: [W0[0], W0[1], W0[2]], base: W0[1], shade: (x) => clamp(0.7 - (x - cx) / (RX * 1.4)), dir: 0, len: [24, 44], wid: [6, 9], cover: 1.6, rim: { w: 2, alpha: 0.85 } });
    // üst: kenar bandı (mavi sır), iç çukur
    const top = ellShape(cx, cy, RX, RY);
    layer(S, { clip: top.path, bb: top.bb, cols: [W0[2], W0[3], W0[4], W0[5]], base: W0[4], shade: (x, y) => clamp(0.6 + (cx - x) / (RX * 2.2) - (y - cy) / (RY * 4)), dir: (x, y) => Math.atan2(-(x - cx) * RY * RY, (y - cy) * RX * RX + 1e-6) + Math.PI / 2, len: [20, 40], wid: [7, 11], cover: 1.6 });
    // mavi kenar bandı
    const bandO = ellShape(cx, cy, RX * 0.97, RY * 0.97), bandI = ellPts(cx, cy + 1 * K, RX * 0.84, RY * 0.84, 0, 48);
    const bandClip = (() => { const p = new Path2D(); p.addPath(bandO.path); p.addPath(poly(bandI)); return [p, 'evenodd']; })();
    layer(S, { clip: [bandClip], bb: bandO.bb, cols: [B[1], B[2], B[3], B[4]], base: B[2], shade: (x, y) => clamp(0.6 + (cx - x) / (RX * 2) - (y - cy) / (RY * 3)), dir: (x, y) => Math.atan2(-(x - cx) * RY * RY, (y - cy) * RX * RX + 1e-6) + Math.PI / 2, len: [14, 26], wid: [5, 8], cover: 1.8 });
    // iç çukur: hafif aşağıda, arkada iç duvar gölgesi
    const well = ellShape(cx, cy + 3 * K, RX * 0.74, RY * 0.7);
    layer(S, { clip: well.path, bb: well.bb, cols: [W0[2], W0[3], W0[4], W0[5]], base: W0[4], shade: (x, y) => clamp(0.35 + (y - well.bb[1]) / (well.bb[3] - well.bb[1]) * 0.55 + (cx - x) / (RX * 3)), dir: (x, y) => Math.atan2(-(x - cx) * RY * RY, (y - cy) * RX * RX + 1e-6) + Math.PI / 2, len: [20, 36], wid: [6, 10], cover: 1.6 });
    // çukurun arka iç duvarı: basamaklı gölge (iki kat), ön kenarda açık dudak
    const wellOut = (dy) => { const q = new Path2D(); q.rect(well.bb[0] - 20, well.bb[1] - 20, well.bb[2] - well.bb[0] + 40, well.bb[3] - well.bb[1] + 40); q.addPath(moved(well.path, 0, dy)); return [q, 'evenodd']; };
    layer(S, { clip: [well.path, wellOut(RY * 0.34)], bb: well.bb, cols: [W0[1], shade(W0[1], 0.02)], base: W0[1], dir: (x, y) => Math.atan2(-(x - cx) * RY * RY, (y - cy) * RX * RX + 1e-6) + Math.PI / 2, len: [16, 30], wid: [5, 8], cover: 1.6 });
    layer(S, { clip: [well.path, wellOut(RY * 0.15)], bb: well.bb, cols: [W0[0], shade(W0[0], 0.02)], base: W0[0], dir: (x, y) => Math.atan2(-(x - cx) * RY * RY, (y - cy) * RX * RX + 1e-6) + Math.PI / 2, len: [12, 24], wid: [4, 6], cover: 1.6 });
    line(S, ellPts(cx, cy + 3 * K, RX * 0.6, RY * 0.56, 0, 48).concat([ellPts(cx, cy + 3 * K, RX * 0.6, RY * 0.56, 0, 48)[0]]), 2, B[3], { height: false });
    line(S, ellPts(cx, cy + 3 * K, RX * 0.735, RY * 0.69, 0, 64).slice(6, 27), 2.6, '#FFFFFF', { w1: 1, taper: true, height: true });
    // parıltılar
    dab(S, cx - RX * 0.62, cy - RY * 0.42, -0.25, RX / K * 0.22, 4, '#FFFFFF', { alpha: 0.9, height: false });
    dab(S, cx - RX * 0.2, cy + RY * 0.2, 0.05, RX / K * 0.16, 3, '#FFFFFF', { alpha: 0.6, height: false });
    line(S, ellPts(cx, cy, RX * 0.995, RY * 0.995, 0, 48).slice(4, 22), 2.4, '#FFFFFF', { taper: true, height: false });
    return top;
  }
  reg('tabak', () => {
    const k = 1.25, K = k; const S = Paint.sprite(390 * K, 130 * K, { seed: 2601, k });
    const cx = 195 * K, cy = 58 * K; plateOn(S, cx, cy, 178 * K);
    return done(S, cx, cy, 0.35);
  }, { size: [356, 110], base: [0, 58] });


  // ================================================================ CENNET: ALTIN TEPSİ
  // trayOn: (cx,cy) üst kenar elipsinin merkezi; RX, RY dış kenar yarıçapları
  function trayOn(S, cx, cy, RX, RY, o = {}) {
    const K = S.k; const G = PAL.gold; const rr = rng(o.seed ?? 3101);
    const e = RY / RX; const rimW = RX * 0.085; const RXi = RX - rimW, RYi = RY - rimW * e * 1.1;
    const TH = RX * 0.05; // kenar kalınlığı (önde görünen)
    // ayak (alçak halka), kenarın altında
    const foot = ellShape(cx, cy + RY * 0.62 + TH * 1.6, RX * 0.56, RY * 0.5);
    layer(S, { clip: foot.path, bb: foot.bb, cols: [G[0], G[1], G[2], G[3]], base: G[1], shade: (x) => clamp(0.7 - (x - cx) / (RX * 0.9)), dir: 0, len: [20, 36], wid: [6, 9], cover: 1.8, rim: { w: 1.8, alpha: 0.85 } });
    // ön kenar bandı (yan yüz): yatay krom bantları (u = x konumu)
    const sideP = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI; sideP.push([cx + Math.cos(a) * RX, cy + Math.sin(a) * RY]); }
    for (let i = 48; i >= 0; i--) { const a = (i / 48) * Math.PI; sideP.push([cx + Math.cos(a) * RX * 0.985, cy + TH + Math.sin(a) * RY * 0.985]); }
    const side = polyShape(sideP);
    S.rim(side.path, { w: 1.6, alpha: 0.85 });
    for (const [u0, u1, ci] of METAL_BANDS) { const c = G[clamp(ci - 1, 0, 7)]; const bp = poly([[cx + u0 * RX, side.bb[1] - 5], [cx + u1 * RX, side.bb[1] - 5], [cx + u1 * RX, side.bb[3] + 5], [cx + u0 * RX, side.bb[3] + 5]]); layer(S, { clip: [side.path, bp], bb: side.bb, cols: [c], base: c, dir: 0, len: [14, 26], wid: [4, 6], cover: 1.1, lJit: 0.015 }); }
    // üst kenar halkası: açıya göre keskin ton katları (metal yansıması)
    const top = ellShape(cx, cy, RX, RY);
    const inner = ellPts(cx, cy + rimW * e * 0.15, RXi, RYi, 0, 64);
    const ring = (() => { const p = new Path2D(); p.addPath(top.path); p.addPath(poly(inner)); return [p, 'evenodd']; })();
    S.rim(top.path, { w: 1.8, alpha: 0.85 });
    const sector = (a0, a1) => { const pts2 = [[cx, cy]]; for (let i = 0; i <= 12; i++) { const a = lerp(a0, a1, i / 12); pts2.push([cx + Math.cos(a) * RX * 1.2, cy + Math.sin(a) * RY * 1.2]); } return poly(pts2); };
    const RB = [[-Math.PI, -2.55, 5], [-2.55, -1.85, 7], [-1.85, -1.2, 5], [-1.2, -0.45, 3], [-0.45, 0.25, 2], [0.25, 0.9, 4], [0.9, 1.7, 3], [1.7, 2.3, 5], [2.3, 2.75, 6], [2.75, Math.PI, 4]];
    for (const [a0, a1, ci] of RB) layer(S, { clip: [ring, sector(a0, a1)], bb: top.bb, cols: [G[ci]], base: G[ci], dir: (x, y) => Math.atan2((y - cy) / RY, (x - cx) / RX) + Math.PI / 2, dirJit: 0.06, len: [14, 26], wid: [4, 6], cover: 1.2, lJit: 0.015 });
    // kenarda kabartma boncuk dizisi
    const nb = Math.round(RX / K / 6.5);
    for (let i = 0; i < nb; i++) { const a = (i / nb) * TAU; const x = cx + Math.cos(a) * (RX - rimW * 0.5), y = cy + Math.sin(a) * (RY - rimW * e * 0.55); const br = rimW * 0.22 * (0.8 + 0.2 * Math.sin(a)); const lit = Math.cos(a - (Math.PI + 0.9)) > -0.3;
      fill(S, ellipsePath(x, y, br, br * 0.85, 0), G[2], { h: 170 }); fill(S, ellipsePath(x - br * 0.25, y - br * 0.28, br * 0.55, br * 0.45, 0), lit ? G[7] : G[5], { height: false }); }
    // iç duvar (arkada, gölgede) + taban (yansıtıcı, yatay keskin bantlar)
    const innerS = polyShape(inner);
    const fl = ellShape(cx, cy + rimW * e * 1.6, RXi * 0.985, RYi * 0.95);
    layer(S, { clip: innerS.path, bb: innerS.bb, cols: [G[1], G[2]], base: G[2], dir: 0, len: [20, 40], wid: [6, 9], cover: 1.4 });
    // taban: tabanın elipsini izleyen kavisli yansıma bantları (az sayıda, yüksek kontrast: koyu turuncu-kahve → doygun sarı)
    const fcx = (fl.bb[0] + fl.bb[2]) / 2, fcy = (fl.bb[1] + fl.bb[3]) / 2, frx = (fl.bb[2] - fl.bb[0]) / 2, fry = (fl.bb[3] - fl.bb[1]) / 2;
    const arcBand = (s0, s1, sh0 = 0, sh1 = 0) => { // s: ön yay ölçeği (−1 arka … 1 ön); bantlar ön kenara paralel kavisli
      const P2 = []; for (let i = 0; i <= 32; i++) { const x = fcx - frx * 1.05 + (i / 32) * frx * 2.1; const q = clamp((x - fcx) / frx, -1, 1); P2.push([x, fcy + s0 * fry * Math.sqrt(1 - q * q) + sh0 * fry]); }
      for (let i = 32; i >= 0; i--) { const x = fcx - frx * 1.05 + (i / 32) * frx * 2.1; const q = clamp((x - fcx) / frx, -1, 1); P2.push([x, fcy + s1 * fry * Math.sqrt(1 - q * q) + sh1 * fry]); }
      return poly(P2);
    };
    layer(S, { clip: fl.path, bb: fl.bb, cols: [G[4], shade(G[4], 0.02)], base: G[4], dir: 0, dirJit: 0.04, len: [40, 80], wid: [7, 11], cover: 1.1, lJit: 0.015 });
    const FB2 = [[-1.6, -0.3, G[5], -0.25, 0.02], [0.2, 0.42, G[1], 0.04, 0.04], [0.42, 0.62, G[3], 0.04, 0.04]];
    for (const [s0, s1, c, sh0, sh1] of FB2) layer(S, { clip: [fl.path, arcBand(s0, s1, sh0, sh1)], bb: fl.bb, cols: [c, shade(c, 0.02)], base: c, dir: (x, y) => Math.atan2(-(x - fcx) * fry * fry, (y - fcy) * frx * frx + 1e-6) + Math.PI / 2, dirJit: 0.04, len: [30, 60], wid: [7, 11], cover: 1.1, lJit: 0.015 });
    // keskin speküler lekeler (G7) parlak bant boyunca
    { const q = []; for (let i = 0; i <= 16; i++) { const u = -0.62 + (i / 16) * 0.5; q.push([fcx + u * frx, fcy - fry * 0.66 * Math.sqrt(1 - u * u) + fry * 0.02]); } line(S, q, 5, G[7], { w1: 1.4, taper: true, height: false });
      const u2 = 0.18; fill(S, ellipsePath(fcx + u2 * frx, fcy - fry * 0.6 * Math.sqrt(1 - u2 * u2), 6 * K, 2.4 * K, 0), G[7], { height: false }); }
    // tabanda ince oyma halka (noktalı)
    const nd = Math.round(RX / K / 5);
    for (let i = 0; i < nd; i++) { const a = (i / nd) * TAU; const x = cx + Math.cos(a) * RXi * 0.78, y = fcy + Math.sin(a) * RYi * 0.74; fill(S, ellipsePath(x, y, RX * 0.006, RX * 0.004, 0), Math.sin(a) < 0 ? G[3] : G[6], { alpha: 0.85, height: false }); }
    // ön kenar üstü: ince beyaz parıltı
    line(S, ellPts(cx, cy + 1.5 * K, RX * 0.995, RY * 0.995, 0, 64).slice(18, 30), 2.6, '#FFFDF0', { w1: 1, taper: true, height: false });
    line(S, ellPts(cx, cy + TH + 1 * K, RX * 0.985, RY * 0.985, 0, 64).slice(2, 30), 2, G[0], { height: false });
    return { top, floor: fl, RXi, RYi };
  }
  reg('altin-tepsi', () => {
    const k = 1.5, K = k; const S = Paint.sprite(560 * K, 250 * K, { seed: 3101, k });
    const cx = 280 * K, cy = 98 * K; trayOn(S, cx, cy, 258 * K, 80 * K);
    return done(S, cx, cy + 10 * K, 0.28);
  }, { size: [519, 193], base: [0, 100] });

  // ================================================================ CENNET: MEYVE YÜKLÜ ALTIN TEPSİ (üzüm, nar, incir, hurma)
  reg('tepsi-meyve', () => {
    const k = 1.5, K = k; const S = Paint.sprite(600 * K, 400 * K, { seed: 3201, k }); const rr = rng(3203);
    const cx = 300 * K, cy = 262 * K, RX = 276 * K, RY = 84 * K;
    trayOn(S, cx, cy, RX, RY, { seed: 3205 });
    // altta yeşil asma yaprakları (tepsiden taşan)
    vineLeaf(S, cx - 228 * K, cy - 18 * K, 62 * K, 3.0, PAL.leaf, 31);
    vineLeaf(S, cx + 232 * K, cy - 26 * K, 60 * K, -0.1, PAL.leaf, 32);
    vineLeaf(S, cx - 60 * K, cy - 100 * K, 58 * K, -1.9, PAL.leaf, 33);
    // arka: iki nar (asimetrik): sol küçük ve öne yakın; sağdaki daha yüksekte, üzüm tepesinin arkasına kısmen gizli
    pomegranateOn(S, cx + 104 * K, cy - 122 * K, 80 * K, { seed: 42, crownAng: -1.15 });
    pomegranateOn(S, cx - 178 * K, cy - 66 * K, 66 * K, { seed: 41, crownAng: -2.2 });
    // orta: mor üzüm tepesi (sola kaymış); astar yalnız tepenin dış hattında: önce hepsinin astarı, sonra taneler
    const mound = [];
    for (let i = 0; i < 64; i++) { const a = rr() * TAU, u = Math.sqrt(rr()); mound.push([cx - 26 * K + Math.cos(a) * u * 118 * K, cy - 50 * K + Math.sin(a) * u * 54 * K - (1 - u * u) * 64 * K, u, (21 + rr() * 4) * K]); }
    mound.sort((a, b) => a[1] - b[1]);
    line(S, crPts([[cx + 4 * K, cy - 186 * K], [cx - 12 * K, cy - 160 * K], [cx - 22 * K, cy - 132 * K]], 3), 6, PAL.stem[2], { w1: 4, rim: { w: 1, alpha: 0.8 } });
    let gi = 0;
    for (const [x, y, u, r0] of mound) S.rim(grapeShape(x, y, r0, 3300 + gi++, 0).path, { w: 1.8, alpha: 0.9 });
    gi = 0;
    for (const [x, y, u, r0] of mound) { const sd = 3300 + gi++; grape(S, x, y, r0, PAL.grapeP, { seed: sd, dark: u > 0.82 && y < cy - 90 * K ? 1 : 0, refl: '#4E3E9A', bloom: rng(sd + 11)() < 0.3 ? 0.4 : 0, bloomC: '#B4A6DC' }); }
    // sağ: yeşil üzüm salkımı kenardan sarkar
    const L = bunchLayout(cx + 196 * K, cy - 44 * K, 120 * K, 150 * K, 16 * K, 51, { skew: 0.5, wing: 0.1 });
    const gf = L.front.sort((a, b) => a[1] - b[1]); let gj = 0;
    for (const [x, y, r0, u2, t] of gf) S.rim(grapeShape(x, y, r0, 3500 + gj++, 0).path, { w: 1.6, alpha: 0.9 });
    gj = 0; for (const [x, y, r0] of gf) grape(S, x, y, r0, GRAPE_G, { seed: 3500 + gj++, glow: 0.75, glowC: '#E4EE7A', refl: '#7A9A2E' });
    // ön sol: incirler
    figWhole(S, [cx - 190 * K, cy + 8 * K], 34 * K, -Math.PI / 2 - 0.5, 2);
    figWhole(S, [cx - 128 * K, cy + 24 * K], 37 * K, -Math.PI / 2 + 0.2, 3);
    figWhole(S, [cx - 70 * K, cy + 40 * K], 32 * K, -Math.PI / 2 + 0.75, 4);
    // ön orta-sağ: hurma yığını
    const dts = [[cx + 4 * K, cy + 30 * K, 0.25], [cx + 62 * K, cy + 36 * K, -0.3], [cx + 34 * K, cy + 10 * K, 0.05], [cx + 112 * K, cy + 24 * K, 0.4], [cx - 22 * K, cy + 50 * K, -0.15], [cx + 40 * K, cy + 54 * K, 0.1], [cx + 96 * K, cy + 52 * K, -0.2], [cx + 78 * K, cy + 6 * K, 0.5]];
    for (const [x, y, a] of dts.sort((p, q) => p[1] - q[1])) dateOn(S, x, y, 66 * K, a, PAL.date, Math.floor(x + y));
    return done(S, cx, cy - 39 * K, 0.42);
  }, { size: [590, 343], base: [0, 155] });

  // ================================================================ CENNET: GÜMÜŞ KADEH, BİLLUR KADEH, İBRİK
  // metal yansıma profili (kapak/topuz gibi küçük parçalar): u ∈ [-1,1] (sol → sağ), basamaklı krom bantlar
  const metalShade = (V, o = {}) => (x, y) => {
    const hw = V.hwAt(y) || 1; const u = clamp((x - V.cx) / hw, -1, 1); const slope = (V.hwAt(y + 3) - V.hwAt(y - 3)) / 6;
    let v = u < -0.82 ? 0.42 : u < -0.64 ? 0.72 : u < -0.42 ? 0.97 : u < -0.12 ? 0.6 : u < 0.32 ? 0.36 : u < 0.72 ? 0.5 : u < 0.9 ? 0.2 : 0.42;
    v += clamp(slope * 0.6, -0.2, 0.2) + (o.lift ?? 0);
    return clamp(v);
  };
  const METAL_BANDS = [[-1.05, -0.8, 3], [-0.8, -0.62, 5], [-0.62, -0.4, 7], [-0.4, -0.12, 4], [-0.12, 0.3, 2], [0.3, 0.7, 3], [0.7, 0.88, 1], [0.88, 1.05, 3]];
  // dönel metal gövde tonu: u boyunca keskin çevre yansıma bantları + yukarı bakan yüzeyler açık, aşağı bakanlar koyu
  // (bant sınırları profil boyunca, eğim sınırları kesit elipsleri boyunca kıvrılır)
  const metalV = (V, o = {}) => (x, y) => {
    const [u, y0] = V.surf(x, y); const n = V.normal(u, y0);
    // bant değerleri basamak ortalarında (i+0.5)/7: küçük eğim kaymaları eşik aşmaz → ızgara/kare deseni oluşmaz;
    // yalnız belirgin yukarı/aşağı bakan bölgeler bir basamak kayar (sınır kesit eğrisini izler)
    const c = (i) => (i + 0.5) / 7;
    let v = u < -0.86 ? c(3) : u < -0.66 ? c(5) : u < -0.44 ? c(6) : u < -0.14 ? c(4) : u < 0.3 ? c(2) : u < 0.68 ? c(3) : u < 0.88 ? c(0) : c(2);
    return clamp(v - n[1] * (o.up ?? 0.2) + (o.lift ?? 0));
  };
  const SEVEN = [1 / 7, 2 / 7, 3 / 7, 4 / 7, 5 / 7, 6 / 7];
  // kulpsuz, ağızsız (lülesiz), ayaksız alçak yuvarlak kadeh profili (akvab)
  const cupProfile = (K) => [[30, 64], [44, 66], [70, 63], [94, 55], [112, 42], [121, 30], [124, 24]].map(([y, w]) => [y * K, w * K]);
  reg('kadeh-gumus', () => {
    const k = 2, K = k; const S = Paint.sprite(160 * K, 150 * K, { seed: 3301, k }); const SV = PAL.silver; const GD = PAL.gold;
    const cx = 80 * K; const e = 0.3;
    const V = vessel(cx, cupProfile(K), e);
    stepBody(S, V.path, V.bb, SV.slice(1, 8), metalV(V), (x, y) => V.merid(x, y) + (S.r() - 0.5) * 0.05, { thr: SEVEN, len: [10, 18], wid: [4, 6], edgeAmp: 0.008, rim: { w: 1.4, alpha: 0.85 } });
    // ince altın kuşak (gövdeyi saran, profil kesitini izler)
    line(S, ringPts(V, 76 * K, 0.04, Math.PI - 0.04, 28), 3, GD[4], { height: false });
    line(S, ringPts(V, 77.5 * K, 0.5, 1.3, 10), 1.3, GD[6], { height: false });
    // ağız: boş iç (arka iç duvar bantlı yansıma, ön dudağın altı koyu)
    const mouth = ellShape(cx, 30 * K, V.rTop, V.rTop * e);
    fill(S, mouth.path, SV[2], { h: 128 });
    const inB = (u0, u1, c) => { const p2 = poly([[cx + u0 * 64 * K, 8 * K], [cx + u1 * 64 * K, 8 * K], [cx + u1 * 52 * K, 52 * K], [cx + u0 * 52 * K, 52 * K]]); layer(S, { clip: [mouth.path, p2], bb: mouth.bb, cols: [c, shade(c, 0.02)], base: c, dir: Math.PI / 2, len: [6, 12], wid: [3, 5], cover: 1.2, lJit: 0.012 }); };
    inB(-1, -0.55, SV[3]); inB(-0.55, -0.12, SV[5]); inB(0.18, 0.5, SV[6]); inB(0.5, 0.74, SV[4]);
    layer(S, { clip: [mouth.path, ellipsePath(cx, 30 * K + 64 * K * e * 0.72, 64 * K, 64 * K * e * 0.58)], bb: mouth.bb, cols: [SV[1], shade(SV[1], 0.02)], base: SV[1], dir: 0, len: [10, 18], wid: [4, 6], cover: 1.2, lJit: 0.012 });
    // dudak: altın ince bant + beyaz parıltı
    line(S, ringPts(V, 30 * K, 0, Math.PI, 30), 3.4, GD[5], { height: true });
    line(S, ringPts(V, 30 * K, Math.PI, TAU, 30), 2.2, SV[3], { height: false });
    line(S, ringPts(V, 31 * K, 1.9, 2.8, 10), 2, '#FFFFFF', { w1: 1, taper: true, height: false });
    return done(S, cx, 78 * K, 0.22);
  }, { size: [135, 124], base: [0, 53] });

  reg('kadeh-billur', () => {
    const k = 2, K = k; const S = Paint.sprite(160 * K, 150 * K, { seed: 3401, k }); const SV = PAL.silver;
    const cx = 80 * K; const e = 0.3; const top = 30 * K;
    const V = vessel(cx, cupProfile(K), e);
    // billur gövde: berrak su, düz ton bantları, keskin menisküs ve iki parıltı
    glassBody(S, V, { top, bot: V.botY, wy: 62 * K, wb: 112 * K });
    // gümüş dudak bandı ve gövdede ince gümüş kuşak (opak, basamaklı krom)
    const bandAt = (y0, y1) => { const p2 = polyShape([...ringPts(V, y0, Math.PI, 0, 24, 1.01), ...ringPts(V, y1, 0, Math.PI, 24, 1.01)]); stepBody(S, p2.path, p2.bb, SV.slice(1, 8), metalV(V, { up: 0 }), 0, { thr: SEVEN, len: [6, 10], wid: [3, 4], edgeAmp: 0.005, rim: false }); };
    bandAt(top + 1 * K, top + 9 * K); bandAt(98 * K, 103 * K);
    softLine(S, ringPts(V, top, Math.PI, TAU, 30), 2.2, SV[5], 0.95);
    softLine(S, ringPts(V, top, 0, Math.PI, 30), 2.6, '#FFFFFF', 0.95);
    return done(S, cx, 78 * K, 0.22);
  }, { size: [134, 123], base: [0, 53] });

  reg('ibrik', () => {
    const k = 2, K = k; const S = Paint.sprite(200 * K, 340 * K, { seed: 3501, k }); const SV = PAL.silver; const GD = PAL.gold;
    const cx = 104 * K; const e = 0.28;
    const prof = [[44, 22], [52, 20], [62, 15], [96, 13], [126, 17], [156, 36], [190, 54], [226, 62], [256, 58], [282, 44], [298, 28], [304, 24], [312, 34], [322, 40], [326, 41]].map(([y, w]) => [y * K, w * K]);
    const V = vessel(cx, prof, e);
    // ince parçalar (kulp, lüle): orta-açık gümüş taban, gölge yanında açık yansıma kenarı, kesintisiz astar
    const thin = (pts, w0, w1, sgOff) => {
      line(S, pts, w0, SV[3], { w1, rim: { w: 1.1, alpha: 0.9, solid: true } });
      line(S, pts.map(([x, y]) => [x + sgOff * 0.32 * w0 * K, y + 0.18 * w0 * K]), w0 * 0.34, SV[1], { w1: w1 * 0.34, height: false });
      line(S, pts.map(([x, y]) => [x + sgOff * 0.44 * w0 * K, y + 0.26 * w0 * K]), w0 * 0.16, SV[5], { w1: w1 * 0.2, height: false });
      line(S, pts.map(([x, y]) => [x - 0.22 * w0 * K, y - 0.14 * w0 * K]), w0 * 0.4, SV[5], { w1: w1 * 0.4, height: false });
      line(S, pts.map(([x, y]) => [x - 0.3 * w0 * K, y - 0.2 * w0 * K]), w0 * 0.12, '#FFFFFF', { w1: Math.max(0.6, w1 * 0.12), height: false });
    };
    // kulp (arkada, sağda): boyundan karına C kıvrımı
    const hd = crPts([[cx + 12 * K, 74 * K], [cx + 52 * K, 76 * K], [cx + 74 * K, 110 * K], [cx + 74 * K, 170 * K], [cx + 60 * K, 214 * K], [cx + 50 * K, 228 * K]], 3);
    thin(hd, 11, 9, 1);
    // lüle (önde, solda): karından yükselen ince S kıvrımı; uçta en az 8 sprite px
    const sp = crPts([[cx - 44 * K, 238 * K], [cx - 66 * K, 206 * K], [cx - 76 * K, 160 * K], [cx - 84 * K, 112 * K], [cx - 96 * K, 74 * K], [cx - 108 * K, 58 * K]], 3);
    thin(sp, 18, 8, 1);
    fill(S, ellipsePath(cx - 108 * K, 58 * K, 4.6 * K, 3 * K, -0.7), SV[0], { h: 120 });
    fill(S, ellipsePath(cx - 109.5 * K, 57 * K, 2 * K, 1.2 * K, -0.7), SV[5], { height: false });
    // gövde: basamaklı metal katlar (bantlar profili, eğim geçişleri kesitleri izler)
    stepBody(S, V.path, V.bb, SV.slice(1, 8), metalV(V), (x, y) => V.merid(x, y) + (S.r() - 0.5) * 0.05, { thr: SEVEN, len: [14, 26], wid: [4.5, 7], edgeAmp: 0.008, rim: { w: 1.4, alpha: 0.8 } });
    // ince altın bantlar
    for (const yy of [126, 190, 298]) line(S, ringPts(V, yy * K, 0.05, Math.PI - 0.05, 24), 3, GD[4], { height: false });
    line(S, ringPts(V, 190 * K + 4 * K, 0.05, Math.PI - 0.05, 24), 1.4, GD[6], { height: false });
    // lülenin gövdeye bağlandığı yerde küçük halka (gövde hattına kırpılı)
    withClip(S, V.path, () => { const jx = cx - V.hwAt(232 * K) + 3 * K, jy = 232 * K; fill(S, ellipsePath(jx, jy, 5 * K, 11 * K, 0.5), SV[3], { h: 150 }); line(S, crPts([[jx - 1 * K, jy - 11 * K], [jx - 4 * K, jy], [jx + 1 * K, jy + 11 * K]], 2), 2, GD[4], { height: false }); });
    // kapak: alçak kubbe + topuz
    const lid = new Path2D(); lid.moveTo(cx - 23 * K, 46 * K); lid.quadraticCurveTo(cx - 20 * K, 28 * K, cx, 26 * K); lid.quadraticCurveTo(cx + 20 * K, 28 * K, cx + 23 * K, 46 * K); lid.closePath();
    const lidV = vessel(cx, [[26 * K, 4 * K], [32 * K, 14 * K], [40 * K, 20 * K], [46 * K, 23 * K]], e);
    layer(S, { clip: lid, bb: [cx - 26 * K, 22 * K, cx + 26 * K, 50 * K], cols: SV.slice(1, 8), base: SV[4], shade: metalShade(lidV), dir: -0.3, len: [8, 14], wid: [3, 5], cover: 2.4, rim: { w: 1.2, alpha: 0.85 } });
    line(S, ringPts(V, 44 * K, 0, Math.PI, 20, 1.04), 2.6, GD[4], { height: false });
    const kn = circ(cx, 18 * K, 9 * K);
    layer(S, { clip: kn, bb: [cx - 10 * K, 8 * K, cx + 10 * K, 28 * K], cols: SV.slice(2, 8), base: SV[4], shade: Paint.sphere(cx - 3 * K, 15 * K, 11 * K), dir: (x, y) => Math.atan2(y - 18 * K, x - cx) + Math.PI / 2, len: [5, 9], wid: [2.5, 4], cover: 2.4, rim: { w: 1, alpha: 0.85 } });
    fill(S, ellipsePath(cx - 3.5 * K, 14.5 * K, 2.4 * K, 1.8 * K, -0.6), '#FFFFFF', { height: false });
    // gövdede dikey beyaz parıltı
    for (const [y0, y1] of [[64, 120], [170, 280], [306, 320]]) { const q = []; for (let y = y0; y <= y1; y += 4) q.push([cx - V.hwAt(y * K) * 0.53, y * K]); line(S, q, 3.4, '#FFFFFF', { w1: 1.4, taper: true, height: false }); }
    return done(S, cx - 6 * K, 176 * K, 0.24);
  }, { size: [186, 330], base: [0, 161] });

  // ---------------------------------------------------------------- temas gölgeleri ('<ad>-golge')
  // Öğeyle AYNI x, y, ölçekle (öğeden önce) çizilir: drawSpr(ctx, spr('<ad>-golge'), x, y, s). Basamaklı iki ton
  // (koyu sıcak keten gölgesi), keskin kenar, sağ-aşağı kaymış. rx, ry, dx, dy: ekran px (ölçek 1), öğe pivotuna göre.
  YIYECEK.shadow = {};
  function golge(name, rx, ry, dx, dy, o = {}) {
    const nm = name + '-golge'; YIYECEK.shadow[name] = { spr: nm }; YIYECEK.names.push(nm);
    defSprite(nm, () => {
      const pad = 10; const w = (rx * 2 + pad * 2), h = (ry * 2 + pad * 2);
      const S = Paint.sprite(w, h, { seed: hashStr(nm) % 9999, k: 1 }); const c0 = [pad + rx, pad + ry];
      const outer = shape(blobPts(c0[0], c0[1], rx, ry, 22, 0.035, hashStr(nm) % 97, 0), 0.5);
      const cx2 = c0[0] - rx * (o.coreDx ?? 0.14), cy2 = c0[1] - ry * 0.1;
      const core = shape(blobPts(cx2, cy2, rx * (o.core ?? 0.68), ry * (o.coreY ?? 0.62), 20, 0.04, hashStr(nm) % 89, 0), 0.5);
      layer(S, { clip: outer.path, bb: outer.bb, cols: ['#705A72', '#6A5470'], base: '#6E5871', dir: 0, dirJit: 0.08, len: [rx * 0.5, rx * 0.9], wid: [ry * 0.35, ry * 0.55], cover: 1.4, rim: false, height: false });
      layer(S, { clip: core.path, bb: core.bb, cols: ['#3E2A42', '#46304A'], base: '#422C45', dir: 0, dirJit: 0.08, len: [rx * 0.35, rx * 0.7], wid: [ry * 0.3, ry * 0.5], cover: 1.4, rim: false, height: false });
      const c = makeCanvas(S.w, S.h); const q = c.getContext('2d'); q.globalAlpha = o.alpha ?? 0.5; q.drawImage(S.c, 0, 0);
      return { canvas: c, px: c0[0] - dx, py: c0[1] - dy, k: 1 };
    });
  }
  golge('ekmek', 176, 42, 26, 96, { core: 0.74 });
  golge('bal', 106, 26, 24, 134, { core: 0.7 });
  golge('hurma', 138, 32, 14, 52);
  golge('nar', 176, 44, 34, 168);
  golge('nar-kuru', 156, 40, 30, 152);
  golge('elma', 140, 36, 26, 124);
  golge('incir', 172, 38, 22, 120);
  golge('sut', 98, 24, 22, 180);
  golge('su-testi', 92, 24, 20, 181);
  golge('su-bardak', 66, 17, 14, 114, { alpha: 0.32 });
  golge('zeytin', 200, 30, 16, 106, { alpha: 0.4 });
  golge('tabak', 172, 34, 18, 24, { core: 0.82, coreY: 0.7 });
  // öğe + gölgesi (sofrada): pivot (x,y), ölçek s
  YIYECEK.drawOnTable = (ctx, name, x, y, s = 1, alpha = 1) => { const g = YIYECEK.shadow[name]; if (g) drawSpr(ctx, spr(g.spr), x, y, s, 0, alpha); drawSpr(ctx, spr(name), x, y, s, 0, alpha); };

  // ---------------------------------------------------------------- sofra üstü yerleşim önerileri
  // x,y: sofra pivotuna (üst yüz merkezi) göre öğe PİVOTUNUN konumu (sofra ölçek 1'de ekran px); s: öğe ölçeği.
  // surf: öğenin örtüye değdiği ön nokta (y). main: p2 yakın planı için ana takım. z: çizim sırası (küçük önce).
  // shadow: temas gölgesi sprite'ı (öğeyle aynı x,y,s ile önce çizilir) ya da null (gölge sprite'a gömülü).
  // wither: solma çapraz geçişinin eşi (aynı pivot). Işıklı sprite'lar döndürülmez (rot hep 0).
  const spot = (name, sx, sy, sc, main, o = {}) => { const b = o.b ?? (YIYECEK.base[name] || [0, 0])[1]; YIYECEK.onTableSpots[name] = { x: sx, y: Math.round(sy - b * sc), s: sc, rot: 0, surf: sy, z: o.z ?? sy, main: !!main, shadow: YIYECEK.shadow[name] ? YIYECEK.shadow[name].spr : null, wither: o.wither ?? null }; };
  spot('bal', 292, -40, 0.5, true);
  spot('uzum-yatik', -110, -10, 0.62, true, { wither: 'uzum-yatik-kuru' });
  spot('su-testi', 420, -30, 0.42, false);
  spot('sut', -380, -24, 0.42, false);
  spot('ekmek', -300, 52, 0.6, true);
  spot('nar-acik', 80, 52, 0.7, true, { wither: 'nar-acik-kuru' });
  spot('tabak', 300, 96, 0.62, true);
  spot('hurma', 300, 92, 0.42, true, { z: 97 });
  spot('su-bardak', 470, 40, 0.5, false);
  spot('elma', -40, -50, 0.4, false);
  spot('nar', 150, -52, 0.4, false, { wither: 'nar-kuru' });
  spot('incir', -170, 100, 0.44, false);
  spot('zeytin', 160, 118, 0.4, false);
  YIYECEK.sofra = { pivot: 'üst yüz merkezi', rx: SOFRA.rx, ry: SOFRA.ry, clothRx: Math.round(SOFRA.rx * 1.012), clothRy: Math.round(SOFRA.ry * 1.02), hang: SOFRA.hang };
})();
