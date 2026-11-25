// Yiyecek ve nimetler (grup "yiyecek"): dünya sofrası, Perde 4 nimetleri, cennet tepsi / kadeh / ibrik.
// Araçlar fruits.js'teki YIY'dir (nar, nar-kuru ve taç da orada; bu dosya fruits.js'ten SONRA yüklenmeli).
// Işık sol üstten. Ölçüler ekran pikseli × k (sprite pikseli / k = ekran pikseli, ölçek 1'de).
// Meta veri: YIYECEK = {
//   names: [...] tüm sprite adları,
//   size[name] = [g, y]  ölçek 1'de görünür sınır kutusu (ekran px),
//   base[name] = [0, dy] pivottan aşağı, öğenin yere/örtüye değdiği nokta (ekran px, ölçek 1),
//   onTableSpots[name] = { x, y, s, rot, surf, z, main } 'sofra' pivotuna (üst yüz merkezi) göre öğe pivotu (sofra ölçek 1),
//      s öğe ölçeği, rot önerilen dönüş, surf örtüye değme y'si, z çizim sırası (küçük önce), main: p2 ana takımı,
//   sofra: { rx, ry, clothRx, clothRy } üst yüz ve örtü elipsleri, PAL: paletler }
'use strict';
const YIYECEK = { names: ['nar', 'nar-kuru'], onTableSpots: {}, base: { nar: [0, 192], 'nar-kuru': [0, 175] }, size: { nar: [399, 444], 'nar-kuru': [341, 339] } };

(() => {
  const { TAU, LT, poly, bboxOf, circ, ellPts, shape, polyShape, ellShape, outside, crPts, withClip, fill, dab, field, layer, line, crease, softLine, leaf, moved, crescent, toneBall } = YIY;
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
    date: ['#140602', '#2A0C04', '#461608', '#62220C', '#823214', '#A44A22', '#C87038', '#EEAA6C', '#FFF0D8'],
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

  // tek nar tanesi: köşeli-yuvarlak, yakut, içten ışıklı; beyaz küçük parıltı. wi: kuruma
  function aril(S, x, y, rx, ry, rot, AP, wi, sd, o = {}) {
    const K = S.k; const r2 = rng(sd);
    const pts = blobPts(x, y, rx, ry, 8, wi ? 0.26 : 0.16, sd, rot);
    const p = smoothPath(pts, true, 0.42);
    if (o.rim) S.rim(p, { w: 1.3, alpha: 0.8 });
    fill(S, p, AP[2], { h: 150 });
    withClip(S, p, () => {
      fill(S, ellipsePath(x - rx * 0.06, y - ry * 0.08, rx * 0.84, ry * 0.8, rot), AP[3], { h: 160, ridge: false });
      // içten ışık (yarı saydam jöle): alt sağda sıcak açık leke
      fill(S, ellipsePath(x + rx * 0.24, y + ry * 0.3, rx * 0.5, ry * 0.36, rot + 0.3), AP[5], { alpha: wi ? 0.18 : 0.55, height: false });
      // çekirdek gölgesi: içte soluk pembe uzun benek
      if (!wi && r2() < 0.6) fill(S, ellipsePath(x + rx * 0.05, y + ry * 0.05, rx * 0.34, ry * 0.18, rot + 0.9), '#F6B8C0', { alpha: 0.32, height: false });
      // aydınlık üst-sol hilal (fırça darbesi)
      dab(S, x - rx * 0.28, y - ry * 0.34, -0.6 + rot * 0.3, (rx * 0.95) / K, (ry * 0.42) / K, AP[4], { alpha: 0.95, height: false, dry: 0.3 });
    });
    if (wi < 0.5) {
      const a = 1 - wi * 2;
      fill(S, ellipsePath(x - rx * 0.4, y - ry * 0.44, rx * 0.2, ry * 0.15, -0.6), '#FFFFFF', { alpha: 0.95 * a, height: false });
      fill(S, ellipsePath(x - rx * 0.12, y - ry * 0.55, rx * 0.09, ry * 0.07, -0.6), '#FFFFFF', { alpha: 0.7 * a, height: false });
    } else fill(S, ellipsePath(x - rx * 0.36, y - ry * 0.4, rx * 0.18, ry * 0.12, -0.6), AP[6], { alpha: 0.4, height: false });
    return p;
  }

  // ================================================================ NAR AÇIK (yarım nar, kesik yüzü yukarıda ve izleyiciye eğik)
  // geometri ortak: taze ve kuru aynı yerleşimi paylaşır (çapraz geçiş için)
  function paintNarAcik(wi = 0) {
    const k = 1.4, K = k; const w = 520 * K, h = 440 * K;
    const S = Paint.sprite(w, h, { seed: 1201, k }); const rr = rng(1207);
    const cx = 252 * K, cy = 168 * K; // kesik yüz merkezi
    const shr = 1 - wi * 0.06;
    const RX = 212 * K * shr, RY = 112 * K * shr; // yüz elipsi
    const DOWN = 168 * K * shr; // kubbe altı (yüz merkezinden en alt nokta)
    const NP = NAR_PAL.map((c, i) => (wi > 0 ? mix(c, NAR_KURU[i], wi * 0.9) : c));
    const AP = PAL.aril.map((c, i) => (wi > 0 ? mix(c, PAL.arilK[i], wi) : c));
    const PP = PAL.pith.map((c, i) => (wi > 0 ? mix(c, PAL.pithK[i], wi) : c));
    // --- dış kabuk: yüzün üst yayı + alttaki kubbe yayı
    const outline = [];
    for (let i = 0; i <= 40; i++) { const a = Math.PI + (i / 40) * Math.PI; outline.push([cx + Math.cos(a) * RX * 1.012, cy + Math.sin(a) * RY * 1.02]); }
    for (let i = 1; i < 40; i++) { const a = (i / 40) * Math.PI; const wob = 1 + (wi ? 0.025 * Math.sin(a * 7 + 1) : 0.008 * Math.sin(a * 5)); outline.push([cx + Math.cos(a) * RX * 1.012 * wob, cy + Math.sin(a) * DOWN * wob]); }
    const skin = shape(outline, 0.5);
    const Rs = RX / K;
    const sL = [Rs * 0.16, Rs * 0.3], sW = [clamp(Rs * 0.06, 6, 16), clamp(Rs * 0.095, 8, 20)];
    // kabuk darbeleri: alt kutuptan çıkan meridyenler gibi (kubbeye sarılır)
    const pole = [cx + RX * 0.05, cy + DOWN * 1.25];
    const sdir = (x, y) => Math.atan2(y - pole[1], x - pole[0]) + (S.r() - 0.5) * 0.25;
    layer(S, { clip: skin.path, bb: skin.bb, cols: [NP[2], NP[3]], base: NP[3], dir: sdir, len: sL, wid: sW, cover: 1.4, rim: { w: 2.4, alpha: 0.9 } });
    // gölge: sağ ve alt (yüzün kapattığı üst kısım zaten görünmez)
    layer(S, { clip: [skin.path, crescent(skin.path, skin.bb, RX * 0.36)], bb: skin.bb, cols: [NP[1], NP[2]], dir: sdir, len: sL, wid: sW, soft: true, cover: 2.6 });
    layer(S, { clip: [skin.path, crescent(skin.path, skin.bb, RX * 0.06)], bb: skin.bb, cols: [mix(NP[2], '#62207A', 0.36 - wi * 0.24)], base: mix(NP[2], '#62207A', 0.34 - wi * 0.22), dir: sdir, len: [sL[0] * 0.5, sL[1] * 0.5], wid: [sW[0] * 0.6, sW[1] * 0.6], cover: 1.6 });
    // ışık: sol yan
    const litC = [cx - RX * 0.42, cy + DOWN * 0.32];
    const lit = smoothPath(blobPts(litC[0], litC[1], RX * 0.62, DOWN * 0.62, 20, 0.06, 1211, 0.4));
    layer(S, { clip: [skin.path, lit], bb: skin.bb, cols: [NP[4], NP[5]], base: NP[4], dir: sdir, len: sL, wid: sW, cover: 1.3, shade: (x, y) => clamp(0.9 - Math.hypot(x - litC[0] + RX * 0.1, y - litC[1]) / (RX * 0.6)) });
    const lit2 = smoothPath(blobPts(cx - RX * 0.66, cy + DOWN * 0.3, RX * 0.24, DOWN * 0.34, 16, 0.08, 1212, 0.5));
    layer(S, { clip: [skin.path, lit2], bb: skin.bb, cols: [NP[5], NP[6]], dir: sdir, len: [sL[0] * 0.8, sL[1] * 0.8], wid: [sW[0] * 0.8, sW[1] * 0.8], soft: true, cover: 2.4, shade: (x, y) => clamp(0.7 - Math.hypot(x - (cx - RX * 0.7), y - (cy + DOWN * 0.3)) / (RX * 0.5)) });
    if (wi < 0.5) { // parlak vurgu darbeleri (sol alt kıvrım boyunca)
      for (let i = 0; i < 4; i++) { const a = 2.55 + i * 0.12; dab(S, cx + Math.cos(a) * RX * 0.84, cy + Math.sin(a) * DOWN * 0.8, a + Math.PI / 2 + 0.1, Rs * 0.09, Rs * 0.03, NP[7], { alpha: 0.9 * (1 - wi * 2), dry: 0.4 }); }
      dab(S, cx + Math.cos(2.62) * RX * 0.83, cy + Math.sin(2.62) * DOWN * 0.79, 2.62 + Math.PI / 2, Rs * 0.05, Rs * 0.022, NP[8], { alpha: 1 - wi * 2 });
    }
    if (wi > 0.05) withClip(S, skin.path, () => {
      for (let i = 0; i < Math.round(9 * wi); i++) {
        const a = 0.25 + rr() * 2.6; const r0 = 0.25 + rr() * 0.3, r1 = r0 + 0.25 + rr() * 0.3; const q = [];
        for (let j = 0; j <= 8; j++) { const t = lerp(r0, r1, j / 8); const aa = a + Math.sin(t * 9 + i) * 0.06; q.push([cx + Math.cos(aa) * RX * (0.35 + t * 0.62), cy + RY * 0.6 + Math.sin(aa) * (DOWN - RY * 0.6) * (0.3 + t * 0.7)]); }
        crease(S, q, clamp(Rs * 0.02, 2, 4.4), NP[1], NP[6], { alpha: 0.85 });
      }
    });
    // --- kesik yüz
    const faceAt = (u, v) => [cx + u * RX, cy + v * RY];
    // kabuk kesiti (kırmızı ince bant) + kabuk içi (krem)
    const rimPts = []; for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU; const wob = 1 + (wi ? 0.02 * Math.sin(a * 6 + 2) : 0.006 * Math.sin(a * 9)); rimPts.push(faceAt(Math.cos(a) * wob, Math.sin(a) * wob)); }
    const face = shape(rimPts, 0.5);
    fill(S, face.path, NP[2], { h: 140 });
    const rindW = 0.075; const rind = shape(rimPts.map(([x, y]) => [cx + (x - cx) * 0.975, cy + (y - cy) * 0.965]), 0.5);
    layer(S, { clip: rind.path, bb: rind.bb, cols: [PP[2], PP[3], PP[4]], base: PP[3], shade: (x, y) => clamp(0.55 + ((cx - x) / RX) * 0.25 + ((cy - y) / RY) * 0.2), dir: (x, y) => Math.atan2((y - cy) / RY, (x - cx) / RX) + Math.PI / 2, dirJit: 0.15, len: [14, 26], wid: [5, 8], cover: 1.6 });
    // iç bölge: girintili (kabuk içi kenarı loblu)
    const inner = []; const NI = 72;
    for (let i = 0; i < NI; i++) { const a = (i / NI) * TAU; const lob = 1 - rindW - 0.03 * Math.pow(Math.abs(Math.sin(a * 3.5 + 0.4)), 0.6) - 0.012 * Math.sin(a * 11); inner.push(faceAt(Math.cos(a) * lob, Math.sin(a) * lob)); }
    const inn = shape(inner, 0.5);
    fill(S, inn.path, mix(AP[0], '#1A0008', 0.2), { h: 104 });
    // zarlar: merkezdeki düzensiz özden kabuğa uzanan krem duvarlar (yüz düzleminde, u-v)
    const memb = []; const nM = 6; const m0 = rr() * 0.6;
    for (let i = 0; i < nM; i++) {
      const a = m0 + (i / nM) * TAU + (rr() - 0.5) * 0.4; const bend = (rr() - 0.5) * 0.7;
      const pts = []; for (let j = 0; j <= 12; j++) { const t = 0.12 + (j / 12) * (0.86 - 0.12); const aa = a + bend * Math.sin(t * Math.PI * 0.9); pts.push([Math.cos(aa) * t, Math.sin(aa) * t]); }
      memb.push(pts);
    }
    const core = smoothPath(blobPts(cx + RX * 0.02, cy + RY * 0.02, RX * 0.1, RY * 0.13, 12, 0.22, 1231));
    // zar–tane mesafe testi (u-v)
    const segD = (px, py, pts) => { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const dx = bx - ax, dy = by - ay; const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); d = Math.min(d, Math.hypot(px - ax - dx * t, py - ay - dy * t)); } return d; };
    withClip(S, inn.path, () => {
      for (const pts of memb) {
        const sp = pts.map(([u, v]) => faceAt(u, v));
        line(S, sp, 6 * shr, PP[1], { w1: 3 * shr, rim: false });
        line(S, sp.map(([x, y]) => [x - 1.2 * K, y - 1 * K]), 3.2 * shr, PP[4], { w1: 1.5 * shr, height: false });
      }
      layer(S, { clip: core, bb: [cx - RX * 0.2, cy - RY * 0.25, cx + RX * 0.2, cy + RY * 0.25], cols: [PP[2], PP[3], PP[4]], base: PP[3], shade: (x, y) => clamp(0.5 + (cx - x) / (RX * 0.3)), dir: 0.3, len: [10, 18], wid: [5, 8], cover: 1.8 });
    });
    // taneler: sıkı paket (altıgen + sarsıntı), zar ve kabuktan uzak
    const ar = 0.074; const arils = [];
    for (let j = -20; j <= 20; j++) for (let i = -20; i <= 20; i++) {
      let u = (i + (j % 2 ? 0.5 : 0)) * ar * 1.72, v = j * ar * 1.5; u += (rr() - 0.5) * ar * 0.5; v += (rr() - 0.5) * ar * 0.5;
      const rad = Math.hypot(u, v); const a = Math.atan2(v, u);
      const lob = 1 - rindW - 0.03 * Math.pow(Math.abs(Math.sin(a * 3.5 + 0.4)), 0.6);
      if (rad > lob - ar * 0.55 || rad < 0.11) continue;
      let dm = 1e9; for (const pts of memb) dm = Math.min(dm, segD(u, v, pts));
      if (dm < ar * 0.62) continue;
      arils.push([u, v, ar * (0.9 + rr() * 0.22) * (1 - wi * 0.24)]);
    }
    arils.sort((a, b) => a[1] - b[1]);
    withClip(S, inn.path, () => {
      const wr = rng(1291); // kuruyunca düzensizlik (ayrı tohum: taze ile yerleşim aynı kalsın)
      for (const [u, v, a0] of arils) {
        const [x0, y0] = faceAt(u, v); const rot = (rr() - 0.5) * 1.2; const sd = Math.floor(rr() * 1e6);
        let x = x0, y = y0, f = 1;
        if (wi) { x += (wr() - 0.5) * ar * RX * 0.7 * wi; y += (wr() - 0.5) * ar * RY * 0.7 * wi; f = 1 - wr() * 0.3 * wi; if (wr() < 0.12 * wi) continue; }
        const rx = a0 * RX * 0.9 * f, ry = a0 * RX * 0.7 * f;
        aril(S, x, y, rx, ry, rot, AP, wi, sd);
      }
    });
    // yüzün üst kenarında kabuk dudağı: ışığa bakan ince parlak çizgi
    const lip = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * 1.05 + (i / 24) * Math.PI * 0.75; lip.push(faceAt(Math.cos(a) * 1.0, Math.sin(a) * 1.0)); }
    line(S, lip, 2.6, wi ? NP[5] : NP[6], { w1: 1.2, taper: true, height: false });
    // önde dökülmüş birkaç tane (kuruyunca soluk, büzüşük)
    const loose = [[318, 352, 0.4], [352, 366, -0.5], [384, 350, 0.9], [296, 372, 0.1]];
    const LP = wi ? AP.map((c) => shade(c, 0.08, 0.8)) : AP;
    for (const [lx, ly, rot] of loose) {
      const x = lx * K, y = ly * K; const rx = 15 * K * (1 - wi * 0.28), ry = 11.5 * K * (1 - wi * 0.28);
      aril(S, x, y, rx, ry, rot, LP, wi, Math.floor(lx * 7 + ly), { rim: true });
    }
    // pivot: yarım narın görsel merkezi
    return done(S, cx, cy + (DOWN - RY) * 0.5 + 6 * K, 0.4);
  }
  reg('nar-acik', () => paintNarAcik(0), { size: [434, 334], base: [0, 150] });
  reg('nar-acik-kuru', () => paintNarAcik(1), { size: [412, 324], base: [0, 150] });

  // ================================================================ ÜZÜM
  // tek tane: basamaklı küre + buğu + parıltı. o.raisin: kuru üzüm (buruşuk), o.glow: yeşil üzümde içten ışık
  const grapeShape = (x, y, r, sd, raisin) => { const r2 = rng(sd); return shape(blobPts(x, y, r * (1 + raisin * 0.02), r * (1.06 - raisin * 0.1), raisin ? 13 : 16, raisin ? 0.13 : 0.025, sd, (r2() - 0.5) * 0.8), 0.5); };
  function grape(S, x, y, r, P0, o = {}) {
    const K = S.k; const sd = o.seed ?? 1; const r2 = rng(sd + 7); const rs = r / K;
    const raisin = o.raisin ?? 0;
    const dh = (r2() - 0.5) * (o.hueJit ?? 14), dl = (r2() - 0.5) * 0.05; const P = P0.map((c, i) => (i < P0.length - 1 ? shade(c, dl, 1, dh) : c));
    const sh = grapeShape(x, y, r, sd, raisin); const bp = sh.path;
    if (o.rim) S.rim(bp, { w: clamp(rs * 0.07, 0.9, 2), alpha: 0.85 });
    const dk = o.dark ?? 0; // arka sıradakiler gölgede
    const C = (i) => (dk ? shade(P[clamp(i - 1, 0, P.length - 1)], -0.03 * dk) : P[i]);
    const dirA = -0.9 + (r2() - 0.5) * 0.5;
    layer(S, { clip: bp, bb: sh.bb, cols: [C(2), C(3)], base: C(3), dir: dirA, dirJit: 0.25, len: [rs * 0.7, rs * 1.3], wid: [clamp(rs * 0.35, 2, 10), clamp(rs * 0.55, 3, 14)], cover: 1.2 });
    // gölge hilali + yansıyan serin ışık
    layer(S, { clip: [bp, crescent(bp, sh.bb, r * 0.42)], bb: sh.bb, cols: [C(1), C(1)], base: C(1), dir: dirA + 1.4, dirJit: 0.3, len: [rs * 0.6, rs * 1.0], wid: [clamp(rs * 0.3, 2, 9), clamp(rs * 0.45, 3, 12)], cover: 1.2 });
    if (!raisin) fill(S, bp, o.refl ?? shade(C(2), 0.03, 1.1, -12), { clip: [bp, crescent(bp, sh.bb, r * 0.1)], height: false, alpha: 0.9 });
    // içten ışık (yeşil üzüm): alt-sağda açık sıcak leke
    if (o.glow) fill(S, ellipsePath(x + r * 0.22, y + r * 0.3, r * 0.42, r * 0.32, 0.5), C(5), { clip: bp, alpha: o.glow, height: false });
    // aydınlık ve açık katlar (sol üst)
    fill(S, ellipsePath(x - r * 0.2, y - r * 0.24, r * 0.66, r * 0.62, 0.4), C(4), { clip: bp, h: 150, ridge: false });
    dab(S, x - r * 0.3, y - r * 0.36, -0.75 + (r2() - 0.5) * 0.4, rs * 0.85, clamp(rs * 0.42, 2, 10), C(5), { alpha: 0.95, height: false, dry: 0.4 });
    // buğu (mat, lavanta pudrası) ve parıltı
    if (o.bloom) { for (let i = 0; i < 2; i++) dab(S, x + (r2() - 0.5) * r * 0.9, y + (r2() - 0.2) * r * 0.7, r2() * 3, rs * 0.5, rs * 0.28, P[6], { alpha: o.bloom * (0.5 + r2() * 0.5), height: false }); }
    if (raisin) {
      // buruşukluklar
      withClip(S, bp, () => {
        for (let i = 0; i < 3; i++) {
          const a = r2() * TAU; const x0 = x + Math.cos(a) * r * 0.3, y0 = y + Math.sin(a) * r * 0.3; const d = a + Math.PI / 2 + (r2() - 0.5);
          const q = []; for (let j = 0; j <= 5; j++) { const t = j / 5 - 0.5; q.push([x0 + Math.cos(d) * r * 1.1 * t + Math.sin(t * 7 + i) * r * 0.06, y0 + Math.sin(d) * r * 1.1 * t]); }
          crease(S, q, clamp(rs * 0.13, 1.2, 3), P[0], P[5], { alpha: 0.85 });
        }
      });
      fill(S, ellipsePath(x - r * 0.36, y - r * 0.4, r * 0.14, r * 0.1, -0.6), P[7], { alpha: 0.6, height: false });
    } else {
      fill(S, ellipsePath(x - r * 0.4, y - r * 0.44, r * 0.15, r * 0.11, -0.65), P[7], { alpha: 0.95, height: false });
      fill(S, ellipsePath(x - r * 0.12, y - r * 0.56, r * 0.06, r * 0.045, -0.6), P[7], { alpha: 0.7, height: false });
    }
    return sh;
  }
  // salkım yerleşimi: üst (cx, top), genişlik W, boy H, tane r
  function bunchLayout(cx, top, W, Hh, r, seed, o = {}) {
    const R = rng(seed); const front = [], back = [];
    const hw = (t) => (W / 2) * (t < 0.18 ? 0.7 + t * 1.6 : Math.pow(Math.max(0, 1 - (t - 0.18) / 0.82), 0.75)) * (1 + (o.wing ?? 0.18) * Math.exp(-Math.pow((t - 0.3) / 0.12, 2)));
    const rows = Math.round((Hh - r) / (r * 1.32));
    for (let j = 0; j <= rows; j++) {
      const t = j / rows; const y = top + r + t * (Hh - 2 * r);
      const half = Math.max(0, hw(t) - r * 0.6); const n = Math.max(1, Math.round((half * 2) / (r * 1.62)) + 1);
      const skew = (o.skew ?? 0) * t * W * 0.2 + Math.sin(t * 4 + seed) * r * 0.35;
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : (i / (n - 1)) * 2 - 1;
        const x = cx + skew + u * half + (j % 2 ? r * 0.3 : -r * 0.2) + (R() - 0.5) * r * 0.6;
        front.push([x, y + (R() - 0.5) * r * 0.5, r * (0.86 + R() * 0.26), Math.abs(u), t]);
        if (i < n - 1 && R() < 0.85) back.push([x + half / Math.max(1, n - 1), y - r * 0.55, r * (0.85 + R() * 0.2)]);
      }
    }
    return { front, back, hw };
  }
  // asma yaprağı: beş loblu, dişli; (x,y) merkez, R yarıçap, ang sap yönünün tersi (uç yönü)
  function vineLeafPts(x, y, R, ang, seed) {
    const r = rng(seed); const pts = []; const n = 90;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU; // a=0: uç
      const lobe = 0.62 + 0.38 * Math.pow(Math.abs(Math.cos(a * 2.5)), 1.6);
      const sinus = 1 - 0.55 * Math.exp(-Math.pow((Math.abs(((a + Math.PI) % TAU) - Math.PI) - Math.PI) / 0.32, 2));
      const serr = 1 + (i % 3 === 0 ? 0.05 : -0.015);
      const rr2 = R * lobe * sinus * serr * (1 + (r() - 0.5) * 0.04);
      pts.push([x + Math.cos(a + ang) * rr2, y + Math.sin(a + ang) * rr2]);
    }
    return pts;
  }
  function vineLeaf(S, x, y, R, ang, P, seed, o = {}) {
    const K = S.k; const Rs = R / K;
    const pts = vineLeafPts(x, y, R, ang, seed); const sh = shape(pts, 0.3);
    const ldir = (px, py) => Math.atan2(py - y, px - x) + (S.r() - 0.5) * 0.4;
    layer(S, { clip: sh.path, bb: sh.bb, cols: [P[1], P[2]], base: P[2], dir: ldir, len: [Rs * 0.25, Rs * 0.5], wid: [clamp(Rs * 0.1, 4, 12), clamp(Rs * 0.16, 5, 16)], cover: 1.4, rim: { w: 1.6, alpha: 0.85 } });
    // ışık katı (sol üst yarı) ve açık lekeler
    const lc = [x + LX * R * 0.35, y + LY * R * 0.35];
    layer(S, { clip: [sh.path, smoothPath(blobPts(lc[0], lc[1], R * 0.8, R * 0.7, 16, 0.08, seed + 3, 0.5))], bb: sh.bb, cols: [P[3], P[4]], base: P[3], dir: ldir, len: [Rs * 0.22, Rs * 0.45], wid: [clamp(Rs * 0.09, 4, 11), clamp(Rs * 0.14, 5, 15)], cover: 1.3, shade: (px, py) => clamp(0.95 - Math.hypot(px - lc[0], py - lc[1]) / (R * 0.75)) });
    // damarlar: beş ana damar + ikinciller
    const vc = o.vein ?? shade(P[4], 0.1, 0.75);
    for (let i = 0; i < 5; i++) {
      const a = ang + (i - 2) * 0.98; const L = R * (i === 2 ? 0.8 : i === 0 || i === 4 ? 0.5 : 0.68);
      const q = []; for (let j = 0; j <= 6; j++) { const t = j / 6; q.push([x + Math.cos(a + Math.sin(t * 2) * 0.06) * L * t, y + Math.sin(a + Math.sin(t * 2) * 0.06) * L * t]); }
      line(S, q, clamp(Rs * 0.035, 1.4, 3.4), vc, { w1: 0.6, height: false });
      for (let m = 1; m <= 2; m++) { const t = 0.35 + m * 0.2; const p0 = q[Math.round(t * 6)]; for (const sd2 of [-1, 1]) { const a2 = a + sd2 * 0.7; line(S, [p0, [p0[0] + Math.cos(a2) * L * 0.25, p0[1] + Math.sin(a2) * L * 0.25]], clamp(Rs * 0.02, 1, 2), vc, { w1: 0.5, height: false }); } }
    }
    return sh;
  }
  function paintUzum(kind) {
    // kind: 'mor' | 'kuru' | 'yesil'
    const k = 1, K = k; const w = 360 * K, h = 470 * K;
    const S = Paint.sprite(w, h, { seed: kind === 'yesil' ? 1402 : 1401, k });
    const dry = kind === 'kuru'; const P = kind === 'yesil' ? PAL.grapeG : dry ? PAL.raisin : PAL.grapeP;
    const seed = kind === 'yesil' ? 77 : 41;
    const cx = 178 * K, top = 96 * K; const r = 27 * K;
    const L = bunchLayout(cx, top, 250 * K, 340 * K, r, seed, { skew: kind === 'yesil' ? -0.5 : 0.6, wing: kind === 'yesil' ? 0.1 : 0.22 });
    const sc = dry ? 0.74 : 1;
    // yaprak (salkımın arkasında, sol üst) — kuruyunca sararmış
    const LP = dry ? PAL.leafK : PAL.leaf;
    if (kind !== 'yesil') vineLeaf(S, 112 * K, 92 * K, 82 * K * (dry ? 0.92 : 1), -2.5, LP, 7, { vein: dry ? '#E6CE8A' : undefined });
    else vineLeaf(S, 250 * K, 92 * K, 76 * K, -0.7, LP, 9);
    // sap: üstte odunsu dal, salkıma iner
    const SP = dry ? PAL.stem.map((c) => shade(c, -0.04, 0.8)) : PAL.stem;
    const stalk = kind === 'yesil' ? [[150 * K, 26 * K], [166 * K, 52 * K], [176 * K, 84 * K], [178 * K, 130 * K]] : [[212 * K, 24 * K], [198 * K, 52 * K], [184 * K, 84 * K], [180 * K, 130 * K]];
    line(S, crPts(stalk, 4), 11, SP[2], { w1: 6, rim: { w: 1.4, alpha: 0.85 } });
    line(S, crPts(stalk, 4).map(([x, y]) => [x - 2.5 * K, y - 1 * K]), 4, SP[4], { w1: 2, height: false });
    // dal ucu kesiti
    fill(S, ellipsePath(stalk[0][0], stalk[0][1], 6 * K, 4 * K, 0.4), SP[4], { h: 150 });
    // sülük (kıvrık filiz)
    const tq = []; const t0x = (kind === 'yesil' ? 166 : 196) * K, t0y = 50 * K; const sgn = kind === 'yesil' ? -1 : 1;
    for (let i = 0; i <= 30; i++) { const t = i / 30; const a = t * 9 + 0.5; const rad = (16 - t * 11) * K; tq.push([t0x + sgn * (t * 40 * K + Math.cos(a) * rad), t0y - t * 18 * K + Math.sin(a) * rad * 0.8]); }
    line(S, tq, 3.4, dry ? SP[3] : '#6E8A2A', { w1: 1.4, height: false });
    // salkım içi saplar (üst sıralar arasında görünür)
    for (let i = 0; i < 5; i++) { const g = L.front[i * 2 % L.front.length]; line(S, [[180 * K, 120 * K], [g[0], g[1] - r * 0.4]], 3.2, SP[2], { w1: 2, height: false }); }
    // arka sıra (gölgede), sonra ön taneler yukarıdan aşağı
    // astar kenarı yalnız salkımın dış hattında: önce kenar tanelerin astarı, sonra taneler üstüne
    let i = 0; const nb = L.back.length;
    const fr = L.front.map((g, j) => [...g, seed * 100 + nb + j]).sort((a, b) => a[1] - b[1]);
    for (const [x, y, rr0, u, t, sd] of fr) if (u > 0.6 || t > 0.8 || t < 0.08) S.rim(grapeShape(x, y, rr0 * sc, sd, dry ? 1 : 0).path, { w: 2, alpha: 0.9 });
    for (const [x, y, rr0] of L.back) grape(S, x, y, rr0 * sc, P, { seed: seed * 100 + i++, dark: 1, raisin: dry ? 1 : 0, bloom: kind === 'mor' ? 0.25 : 0, glow: kind === 'yesil' ? 0.3 : 0 });
    for (const [x, y, rr0, u, t, sd] of fr) grape(S, x, y, rr0 * sc, P, { seed: sd, raisin: dry ? 1 : 0, bloom: kind === 'mor' ? 0.35 : 0, glow: kind === 'yesil' ? 0.45 : 0, refl: kind === 'mor' ? '#4E3E9A' : undefined });
    return done(S, cx, 250 * K, 0.4);
  }
  reg('uzum', () => paintUzum('mor'), { size: [309, 425], base: [0, 184] });
  reg('uzum-kuru', () => paintUzum('kuru'), { size: [300, 406], base: [0, 172] });
  reg('uzum-yesil', () => paintUzum('yesil'), { size: [296, 428], base: [0, 190] });

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
    toneBall(S, body, { cx, cy, R, P, dir: merid, sL: [26, 50], wid: 0, sW: [12, 19], seed: 1505, shadowD: 0.4, litD: 0.34, litR: 0.8, lightD: 0.5, lightR: [0.48, 0.42], hiD: 0.62, hiR: [0.2, 0.14], refl: '#7A1A4A', rimW: 2.6 });
    // meridyen boyunca alacalar: ışık tarafında sarımsı-açık, gölgede koyu kısa darbeler
    withClip(S, body.path, () => {
      for (let i = 0; i < 34; i++) {
        const a = (rr() - 0.5) * 2.7; const t = 0.18 + rr() * 0.6;
        const xx = Math.sin(a) * Math.sin(Math.PI * t) * R * 1.02, yy = -Math.cos(Math.PI * t) * R * 0.95; const x = cx + xx, y = cy + yy;
        const t2 = t + 0.04; const ang = Math.atan2(-Math.cos(Math.PI * t2) * R * 0.95 - yy, Math.sin(a) * Math.sin(Math.PI * t2) * R * 1.02 - xx);
        const lit = (x - cx) * LX + (y - cy) * LY > -R * 0.15;
        dab(S, x, y, ang, 26 + rr() * 26, 4 + rr() * 4, lit ? (rr() < 0.45 ? '#F4B248' : P[6]) : P[2], { alpha: lit ? 0.75 : 0.6, height: false, dry: 0.5 });
      }
    });
    // sap çukuru
    const cav = ellShape(cx + 2 * K, cy - 110 * K, 36 * K, 13 * K, 0.04);
    layer(S, { clip: cav.path, bb: cav.bb, cols: [P[1], P[2]], base: P[1], shade: (x, y) => clamp(0.3 + (y - (cy - 110 * K)) / (26 * K)), dir: (x, y) => Math.atan2(y - cav.bb[1] - 13 * K, x - cx) , len: [8, 14], wid: [4, 6], cover: 2 });
    line(S, crPts([[cx - 30 * K, cy - 108 * K], [cx, cy - 98 * K], [cx + 32 * K, cy - 106 * K]], 3), 3, P[5], { w1: 1.4, taper: true, height: false });
    // parlak vurgu (keskin pencere lekesi)
    dab(S, cx - 82 * K, cy - 70 * K, -0.95, 26, 9, P[7], { alpha: 0.95 });
    dab(S, cx - 98 * K, cy - 48 * K, -1.25, 14, 6, P[7], { alpha: 0.9 });
    fill(S, ellipsePath(cx - 84 * K, cy - 74 * K, 5 * K, 3.4 * K, -0.9), P[8], { height: false });
    // sap
    const stem = crPts([[cx + 2 * K, cy - 104 * K], [cx + 8 * K, cy - 140 * K], [cx + 22 * K, cy - 170 * K]], 3);
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
      field(S, { bb: b1.bb, inside: (x, y) => Math.hypot(x - neck1[0], y - neck1[1]) < r1 * 0.75, cols: [N[2], N[3], N[4]], shade: (x, y) => clamp(0.8 - ((x - neck1[0]) * -LX + (y - neck1[1]) * -LY) / (r1 * 0.5)), dir: d1, len: [rs * 0.16, rs * 0.3], wid: [clamp(rs * 0.08, 3, 7), clamp(rs * 0.13, 4, 11)], cover: 1.4, alpha: 0.9 });
      for (let i = 0; i < 6; i++) { const phi = (i - 2.5) * 0.42; const q = []; for (let j = 0; j <= 10; j++) { const t = 0.1 + j / 10 * 0.8; const u = Math.cos(Math.PI * t) * r1 * 1.2, v = Math.sin(Math.PI * t) * Math.sin(phi) * r1; q.push([f1c[0] + Math.cos(a1) * u + Math.sin(a1) * v, f1c[1] + Math.sin(a1) * u - Math.cos(a1) * v]); } line(S, q, clamp(rs * 0.023, 1, 2), phi < 0 ? P[5] : P[1], { w1: 0.6, taper: true, height: false }); }
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
    const inP = crPts(figPts(f2c[0] + 6 * K, f2c[1] + 1 * K, r2 * 0.74, a2, 0.88), 4, true); const inn = polyShape(inP);
    const F = PAL.figIn; const neck2 = [f2c[0] + Math.cos(a2) * r2 * 1.25, f2c[1] + Math.sin(a2) * r2 * 1.25];
    const rad2 = (x, y) => Math.atan2(y - neck2[1], x - neck2[0]) + (S.r() - 0.5) * 0.3;
    layer(S, { clip: inn.path, bb: inn.bb, cols: [F[1], F[2], F[3], F[4]], base: F[2], shade: (x, y) => clamp(0.95 - Math.hypot(x - neck2[0], y - neck2[1]) / (r2 * 2.0) + (rr() - 0.5) * 0.1), dir: rad2, len: [16, 30], wid: [5, 9], cover: 2.2, noise: 0.1 });
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
  }, { size: [360, 300], base: [0, 141] });

  // ================================================================ HURMA (üç parlak hurma)
  function dateOn(S, x, y, len, ang, P, sd, o = {}) {
    const K = S.k; const r2 = rng(sd); const th = len * (o.th ?? 0.4);
    const ax = Math.cos(ang), ay = Math.sin(ang), bx = -ay, by = ax;
    const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * TAU; const c = Math.cos(a), s2 = Math.sin(a); const ex = 2 / 2.7; const cu = Math.sign(c) * Math.pow(Math.abs(c), ex), sv = Math.sign(s2) * Math.pow(Math.abs(s2), ex); const u = cu * len / 2 * (1 + 0.03 * Math.sin(a * 3 + sd)); const v = sv * th / 2 * (1 - (c > 0 ? 0.12 : 0.04) * Math.pow(Math.abs(c), 3)) * (1 + 0.04 * Math.sin(a * 5 + sd)); pts.push([x + ax * u + bx * v, y + ay * u + by * v]); }
    const body = shape(pts, 0.5); const z = th / 2;
    toneShape(S, body, { c: [x, y], size: z, P, dir: ang, sL: [len / K * 0.28, len / K * 0.5], sW: [clamp(th / K * 0.16, 5, 12), clamp(th / K * 0.24, 7, 16)], shadowD: 0.75, refl: '#6A2A3A', reflD: 0.16, litD: 0.45, litS: 0.86, lightD: 0.9, lightS: 0.62, rimW: 1.8 });
    // uzunlamasına buruşukluklar
    withClip(S, body.path, () => {
      for (let i = 0; i < 5; i++) {
        const v = (r2() - 0.5) * th * 0.7; const u0 = (-0.35 + r2() * 0.2) * len, u1 = u0 + (0.3 + r2() * 0.3) * len; const q = [];
        for (let j = 0; j <= 8; j++) { const u = lerp(u0, u1, j / 8); const vv = v + Math.sin(j * 0.9 + i) * th * 0.04; q.push([x + ax * u + bx * vv, y + ay * u + by * vv]); }
        crease(S, q, clamp(th / K * 0.05, 1.2, 3), P[2], P[6], { alpha: 0.7 });
      }
      // parlak sırt: uzun ince açık vurgu
      const sgn = (bx * LX + by * LY) > 0 ? 1 : -1; const q = []; for (let j = 0; j <= 10; j++) { const u = (-0.3 + j / 10 * 0.55) * len; const vv = sgn * th * 0.26 * (1 - Math.pow(u / (len * 0.5), 2) * 0.5); q.push([x + ax * u + bx * vv, y + ay * u + by * vv]); }
      line(S, q, clamp(th / K * 0.11, 2.5, 7), P[7], { w1: 1.2, taper: true, height: false });
      fill(S, ellipsePath(q[3][0], q[3][1], th * 0.07, th * 0.04, ang), P[8], { height: false });
      fill(S, ellipsePath(q[6][0], q[6][1], th * 0.035, th * 0.025, ang), P[8], { height: false, alpha: 0.8 });
    });
    // sap ucu: küçük açık kapak
    if (o.cap !== false) { const ex = x - ax * len * 0.485, ey = y - ay * len * 0.485; fill(S, ellipsePath(ex, ey, th * 0.07, th * 0.15, ang), '#B88A4E', { h: 160 }); fill(S, ellipsePath(ex - ax * th * 0.02 - LX * 1, ey - ay * th * 0.02, th * 0.035, th * 0.08, ang), '#E2BE80', { height: false }); }
    return body;
  }
  reg('hurma', () => {
    const k = 1, K = k; const S = Paint.sprite(390 * K, 270 * K, { seed: 1701, k });
    const P = PAL.date;
    dateOn(S, 136 * K, 178 * K, 168 * K, 0.18, P, 1711);
    dateOn(S, 258 * K, 186 * K, 160 * K, -0.22, P.map((c) => shade(c, -0.02, 1, 6)), 1712);
    dateOn(S, 202 * K, 118 * K, 172 * K, -0.05, P.map((c) => shade(c, 0.015, 1, -4)), 1713);
    return done(S, 196 * K, 150 * K);
  }, { size: [287, 147], base: [0, 72] });

  // ================================================================ ZEYTİN (zeytin dalı: gümüşi yapraklar, yeşil-siyah zeytinler)
  function oliveOn(S, x, y, rx, ry, rot, P, sd) {
    const K = S.k; const pts = blobPts(x, y, rx, ry, 18, 0.03, sd, rot); const b = shape(pts, 0.5);
    toneShape(S, b, { c: [x, y], size: Math.min(rx, ry), P, dir: rot + Math.PI / 2, sL: [ry / K * 0.5, ry / K * 0.9], sW: [clamp(rx / K * 0.3, 4, 10), clamp(rx / K * 0.45, 5, 13)], shadowD: 0.5, refl: shade(P[3], 0.02, 1, -20), reflD: 0.14, litD: 0.36, litS: 0.84, lightD: 0.6, lightS: 0.5, rimW: 1.4 });
    fill(S, ellipsePath(x + LX * rx * 0.5, y + LY * ry * 0.5, rx * 0.2, ry * 0.12, rot - 0.5), P[7], { height: false, alpha: 0.95 });
    fill(S, ellipsePath(x + LX * rx * 0.2, y + LY * ry * 0.7, rx * 0.08, ry * 0.05, rot - 0.5), P[7], { height: false, alpha: 0.7 });
    return b;
  }
  reg('zeytin', () => {
    const k = 1, K = k; const S = Paint.sprite(470 * K, 330 * K, { seed: 1801, k }); const rr = rng(1803);
    const twig = crPts([[22, 132], [120, 112], [230, 106], [340, 96], [446, 70]].map(([x, y]) => [x * K, y * K]), 5);
    const at = (t) => twig[Math.min(twig.length - 1, Math.round(t * (twig.length - 1)))];
    const tang = (t) => { const a = at(Math.max(0, t - 0.02)), b = at(Math.min(1, t + 0.02)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const LG = PAL.oliveLeaf; const LS = ['#4E6050', '#6E8270', '#8EA28E', '#AABCA8', '#C6D4C2', '#E0E8DC'];
    const leaves = [];
    for (let i = 0; i < 11; i++) {
      const t = 0.06 + i * 0.086 + (rr() - 0.5) * 0.02; const side = i % 2 ? 1 : -1;
      const a = tang(t) + side * (0.55 + rr() * 0.45);
      leaves.push({ t, a, len: (96 + rr() * 34) * K, wid: (19 + rr() * 6) * K, silver: rr() < 0.38, bend: side * (0.05 + rr() * 0.08), front: rr() < 0.45 });
    }
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
    for (const [t, dx, dy, rot, P] of olv.slice().sort((a, b) => a[2] - b[2])) { const [x0, y0] = at(t); oliveOn(S, x0 + dx * K, y0 + dy * K, 25 * K, 33 * K, rot, P, Math.floor(t * 1000 + dx)); }
    for (const L of leaves.filter((l) => l.front)) drawLeaf(L);
    return done(S, 244 * K, 123 * K);
  }, { size: [450, 246], base: [0, 123] });

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
    const M = domeMap(D, body.bb, 3 * K, [-0.55, 0.75, 0.45]);
    const sh = (x, y) => clamp(Math.pow(M.light(x, y), 1.5) * 1.02 - 0.02);
    const dirC = (x, y) => M.ang(x, y) + (S.r() - 0.5) * 0.3;
    // taban + basamaklı kabuk tonları (gerçek kubbe ışığıyla), konturu izleyen darbeler
    layer(S, { clip: body.path, bb: body.bb, cols: [P[1], P[2], P[3], P[4], P[5], P[6]], base: P[3], shade: sh, dir: dirC, len: [26, 50], wid: [12, 19], cover: 2.4, noise: 0.03, broken: 0.04, jitter: 6, rim: { w: 2.6, alpha: 0.9 } });
    // pişmiş koyu benekler, kabarcıklar
    withClip(S, body.path, () => { for (let i = 0; i < 18; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * 0.8; const [x, y] = D.proj(Math.cos(a) * d, Math.sin(a) * d); dab(S, x, y, M.ang(x, y), 10 + rr() * 10, 5 + rr() * 3, P[2 + Math.floor(rr() * 2)], { alpha: 0.55, height: false }); } });
    // çizikler: haç biçimli iki yarık (yüzey uzayında), açılmış krem iç + kalkık parlak dudak
    const cut = (th, len0, len1, wd, sd) => {
      const n = 22; const c = Math.cos(th), s2 = Math.sin(th);
      const side = (sgn, f) => { const out = []; for (let i = 0; i <= n; i++) { const t = lerp(len0, len1, i / n); const ww = Math.sin(Math.PI * (i / n)) * wd * f * (1 + 0.15 * Math.sin(i * 1.3 + sd)); out.push(D.proj(c * t - s2 * ww * sgn, s2 * t + c * ww * sgn, 1.5 * K)); } return out; };
      const lens = shape([...side(1, 1), ...side(-1, 1).reverse()], 0.5);
      layer(S, { clip: lens.path, bb: lens.bb, cols: PAL.crumb.slice(1, 4), base: PAL.crumb[2], shade: (x, y) => clamp(M.light(x, y) * 1.1), dir: Math.atan2(s2, c), dirJit: 0.25, len: [12, 22], wid: [5, 8], cover: 1.8 });
      // hangi kenar ışığa bakıyor (yüzey uzayında sol-arka)
      const litS = (-s2 * -0.55 + c * -0.45) > 0 ? 1 : -1;
      line(S, side(-litS, 0.6), 4, P[2], { w1: 1.6, taper: true, height: false });
      line(S, side(litS, 1.05), 6, P[6], { w1: 2.4, taper: true });
      line(S, side(litS, 1.22), 2.4, P[7], { w1: 1, taper: true, height: false });
    };
    cut(0.42, -0.7, 0.7, 0.09, 1);
    cut(0.42 + Math.PI / 2, -0.68, 0.68, 0.085, 2);
    // un tozu (tepede mat, açık)
    withClip(S, body.path, () => { for (let i = 0; i < 34; i++) { const a = rr() * TAU, d = Math.sqrt(rr()) * 0.62; const [x, y] = D.proj(Math.cos(a) * d - 0.1, Math.sin(a) * d - 0.08); dab(S, x, y, rr() * 3, 7 + rr() * 10, 4 + rr() * 4, '#FBF2DC', { alpha: 0.3 + rr() * 0.3, height: false, dry: 0.7 }); } });
    return done(S, cx, (body.bb[1] + body.bb[3]) / 2);
  }, { size: [389, 245], base: [0, 116] });

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
    return { ...sh, hwAt, topY, botY, rTop, rBot, e, shadeF, cx, sp };
  }
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
  }, { size: [317, 353], base: [0, 140] });

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
    metalBands(S, V, C, { bands: CER_BANDS, len: [18, 34], wid: [8, 12], rimW: 2.2, rimA: 0.9 });
    // üst yarı yeşil sır (daldırma; aşağıya düzensiz akıntılarla)
    const GZ = ['#22300E', '#344814', '#4C621C', '#667E26', '#84983A', '#A6B65C', '#D2DC96'];
    const gl = []; for (let i = 0; i <= 40; i++) { const a = (i / 40) * Math.PI; const run = Math.max(0, Math.sin(i * 1.9 + 1) * 0.6 + Math.sin(i * 0.7) * 0.5) * 22 * K; const yy = 226 * K + run; const hw = V.hwAt(yy) * 1.05; gl.push([cx + Math.cos(a) * hw, yy + Math.sin(a) * hw * e]); }
    const glaze = polyShape([[cx + 130 * K, 226 * K], ...gl, [cx - 130 * K, 226 * K], [cx - 130 * K, 40 * K], [cx + 130 * K, 40 * K]]);
    withClip(S, glaze.path, () => metalBands(S, V, GZ, { bands: CER_BANDS, len: [16, 30], wid: [7, 11], rim: false }));
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
    const dr = shape([[cx - 104 * K, 60 * K], [cx - 99 * K, 64 * K], [cx - 100 * K, 82 * K], [cx - 96 * K, 92 * K], [cx - 102 * K, 98 * K], [cx - 109 * K, 92 * K], [cx - 105 * K, 82 * K], [cx - 108 * K, 64 * K]], 0.5);
    fill(S, dr.path, M[3], { h: 165 }); fill(S, ellipsePath(cx - 105 * K, 90 * K, 2 * K, 3 * K, 0), '#FFFFFF', { height: false });
    // dudak ön kenarı açık
    line(S, ringPts(V, 70 * K, 0.1, Math.PI - 0.5, 24), 4.5, GZ2[5], { w1: 3, taper: true });
    return done(S, cx + 12 * K, 240 * K);
  }, { size: [276, 391], base: [0, 185] });

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
    metalBands(S, V, C, { bands: CER_BANDS, len: [18, 34], wid: [8, 12], rimW: 2.2, rimA: 0.9 });
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
  }, { size: [249, 394], base: [0, 186] });

  // ================================================================ SU BARDAĞI (berrak su, cam parıltıları; yarı saydam)
  reg('su-bardak', () => {
    const k = 1.25, K = k; const S = Paint.sprite(190 * K, 300 * K, { seed: 2401, k }); const rr = rng(2403);
    const cx = 95 * K; const e = 0.26; const top = 40 * K, bot = 262 * K; const RT = 72 * K, RB = 56 * K;
    const V = vessel(cx, [[top, RT], [bot, RB]].map(([y, w]) => [y, w]), e);
    const hwAt = V.hwAt; const wy = 92 * K;
    const ctx = S.x;
    S.rim(V.path, { w: 1.1, alpha: 0.35 });
    // cam gövdesi: çok hafif soğuk tül
    fill(S, V.path, '#E4F6FC', { alpha: 0.16, h: 130 });
    // su gövdesi
    const wpts = [...ringPts(V, wy, Math.PI, 0, 24, 0.97)];
    for (let y = wy; y <= bot - 10 * K; y += 4 * K) wpts.push([cx + hwAt(y) * 0.95, y]);
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI; wpts.push([cx + Math.cos(a) * RB * 0.93, bot - 12 * K + Math.sin(a) * RB * 0.93 * e]); }
    for (let y = bot - 10 * K; y >= wy; y -= 4 * K) wpts.push([cx - hwAt(y) * 0.95, y]);
    const water = polyShape(wpts);
    fill(S, water.path, '#8FD4E8', { alpha: 0.28, h: 132 });
    field(S, { bb: water.bb, inside: water.path, clip: water.path, cols: ['#6AB4D4', '#94D2E6', '#C4ECF6', '#EEFCFF'], shade: (x, y) => { const u = (x - cx) / hwAt(y); return clamp(0.55 - u * 0.35 + (u < -0.4 && u > -0.75 ? 0.3 : 0) - (y - wy) / (bot - wy) * 0.1); }, dir: Math.PI / 2, dirJit: 0.05, len: [30, 56], wid: [10, 16], cover: 1.1, alpha: 0.3 });
    // su yüzeyi (elips) ve menisküs
    const surf = ellShape(cx, wy, hwAt(wy) * 0.97, hwAt(wy) * 0.97 * e);
    fill(S, surf.path, '#D8F4FA', { alpha: 0.55, h: 140 });
    field(S, { bb: surf.bb, inside: surf.path, clip: surf.path, cols: ['#A8DCEA', '#D0F0F8', '#F6FFFF'], shade: (x, y) => clamp(0.4 + (cx - x) / (hwAt(wy) * 2) + (y - surf.bb[1]) / (surf.bb[3] - surf.bb[1]) * 0.3), dir: 0, len: [16, 28], wid: [5, 8], cover: 1.6, alpha: 0.7 });
    softLine(S, ringPts(V, wy, 0.1, Math.PI - 0.1, 24, 0.97), 2.2, '#FFFFFF', 0.85);
    // kalın cam taban (kırılma: açık halka + parlak leke)
    const baseE = ellShape(cx, bot - 6 * K, RB * 0.96, RB * e * 1.15);
    fill(S, baseE.path, '#DDF2F8', { alpha: 0.5, h: 150 });
    softLine(S, ringPts(V, bot - 4 * K, 0.15, Math.PI - 0.15, 20, 0.92), 3, '#FFFFFF', 0.75);
    dab(S, cx - RB * 0.45, bot - 8 * K, 0.1, 16, 4, '#FFFFFF', { alpha: 0.8, height: false });
    // cidar: solda kalın beyaz dikey parıltı, sağda serin koyu kenar
    const side = (u, w, col, a, y0 = top + 14 * K, y1 = bot - 18 * K) => { const q = []; for (let y = y0; y <= y1; y += 6 * K) q.push([cx + u * hwAt(y), y]); softLine(S, q, w, col, a); };
    side(-0.64, 12, '#FFFFFF', 0.22); side(-0.62, 4, '#FFFFFF', 0.85, top + 18 * K, wy - 14 * K); side(-0.6, 4.5, '#FFFFFF', 0.75, wy + 26 * K, wy + 110 * K); side(-0.58, 3, '#FFFFFF', 0.6, wy + 126 * K, bot - 34 * K);
    side(-0.9, 2.2, '#FFFFFF', 0.6); side(0.88, 4, '#3E7EA0', 0.4); side(0.95, 1.6, '#FFFFFF', 0.7, top + 40 * K, bot - 30 * K);
    side(0.55, 2.5, '#FFFFFF', 0.35, top + 60 * K, wy + 70 * K);
    // kenar: dudak çemberi (ön parlak, arka ince)
    softLine(S, ringPts(V, top, Math.PI, TAU, 30), 1.8, '#FFFFFF', 0.65);
    softLine(S, ringPts(V, top, 0, Math.PI, 30), 2.6, '#FFFFFF', 0.95);
    softLine(S, ringPts(V, top + 2.5 * K, 0.3, 1.4, 12), 2, '#BFE8F4', 0.8);
    // dış hat: ince soğuk çizgiler
    const outl = (sg) => { const q = []; for (let y = top; y <= bot; y += 6 * K) q.push([cx + sg * hwAt(y), y]); softLine(S, q, 1.6, sg < 0 ? '#E8FAFF' : '#5E9AB8', 0.75); };
    outl(-1); outl(1);
    softLine(S, ringPts(V, bot, 0, Math.PI, 24), 1.8, '#5E9AB8', 0.7);
    // kabartma: cam kenarı sırtları
    S.hx.save(); S.hx.strokeStyle = 'rgb(190,190,190)'; S.hx.lineWidth = 3 * K; S.hx.stroke(V.path); S.hx.restore();
    return done(S, cx, 150 * K, 0.3);
  }, { size: [146, 257], base: [0, 118] });

  // ================================================================ SOFRA (alçak yuvarlak köy sofrası, beyaz keten örtü)
  // pivot: üst yüz (örtü) elipsinin merkezi. Üst yüz: rx 540, ry 150 (ekran px, ölçek 1)
  const SOFRA = { rx: 540, ry: 150, e: 150 / 540 };
  reg('sofra', () => {
    const k = 1, K = k; const W0 = 1140 * K, H0 = 470 * K; const S = Paint.sprite(W0, H0, { seed: 2501, k }); const rr = rng(2503);
    const LI = PAL.linen, WD = PAL.woodT; const cx = 570 * K, cy = 170 * K; const RX = SOFRA.rx * K, RY = SOFRA.ry * K;
    const TH = 44 * K; // tabla kalınlığı
    // ayaklar: kısa, kalın, tornalı (önde iki, arkada biri görünür)
    for (const [lx, back] of [[0, 1], [-300, 0], [300, 0]]) {
      const x = cx + lx * K, y0 = cy + RY * (back ? 0.4 : 0.72) + TH - 6 * K; const hh = (back ? 96 : 120) * K, ww = (back ? 22 : 28) * K;
      const leg = shape([[x - ww, y0], [x + ww, y0], [x + ww * 0.72, y0 + hh * 0.45], [x + ww * 0.95, y0 + hh * 0.7], [x + ww * 0.8, y0 + hh], [x - ww * 0.8, y0 + hh], [x - ww * 0.95, y0 + hh * 0.7], [x - ww * 0.72, y0 + hh * 0.45]], 0.3);
      layer(S, { clip: leg.path, bb: leg.bb, cols: [WD[back ? 0 : 1], WD[back ? 1 : 2], WD[back ? 2 : 3], WD[back ? 3 : 4]], base: WD[back ? 1 : 2], shade: (px) => clamp(0.75 - (px - x) / (ww * 2.2)), dir: Math.PI / 2, len: [18, 32], wid: [8, 12], cover: 1.8, rim: { w: 2, alpha: 0.85 } });
      line(S, [[x - ww * 0.8, y0 + hh * 0.46], [x + ww * 0.8, y0 + hh * 0.46]], 3.4, WD[0], { height: false });
      line(S, [[x - ww * 0.9, y0 + hh * 0.71], [x + ww * 0.9, y0 + hh * 0.71]], 3, WD[5], { height: false });
    }
    // tabla yan kenarı (ön yarı silindir bandı)
    const side = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI; side.push([cx + Math.cos(a) * RX, cy + Math.sin(a) * RY]); }
    for (let i = 48; i >= 0; i--) { const a = (i / 48) * Math.PI; side.push([cx + Math.cos(a) * RX * 0.995, cy + TH + Math.sin(a) * RY * 0.995]); }
    const sideS = polyShape(side);
    layer(S, { clip: sideS.path, bb: sideS.bb, cols: WD.slice(0, 5), base: WD[2], shade: (x, y) => { const u = (x - cx) / RX; return clamp(0.62 - u * 0.45 - u * u * 0.18); }, dir: (x) => Math.atan2(-(x - cx) / RX * RY, RX * Math.sqrt(Math.max(0.05, 1 - Math.pow((x - cx) / RX, 2)))) * 0.3, len: [70, 140], wid: [8, 12], cover: 1.8, noise: 0.012, broken: 0.01, lJit: 0.02, rim: { w: 2.6, alpha: 0.9 } });
    // kenarın üst köşesinde ince parlak pah
    { const q = []; for (let i = 2; i <= 46; i++) { const a = (i / 48) * Math.PI; q.push([cx + Math.cos(a) * RX * 0.997, cy + 3 * K + Math.sin(a) * RY * 0.997]); } line(S, q, 3.6, WD[6], { taper: true, height: false }); }
    // tabla üstü (ahşap halka): düzleme yatık uzun darbeler, damar çizgileri
    const top = ellShape(cx, cy, RX, RY);
    layer(S, { clip: top.path, bb: top.bb, cols: [WD[3], WD[4], WD[5]], base: WD[4], shade: (x, y) => clamp(0.55 + (cx - x) / (RX * 1.8) - (y - cy) / (RY * 3.5)), dir: 0, dirJit: 0.03, len: [110, 220], wid: [9, 14], cover: 1.8, noise: 0.012, broken: 0.01, lJit: 0.02, rim: { w: 2.6, alpha: 0.85 } });
    withClip(S, top.path, () => { for (let i = 0; i < 46; i++) { const y = cy + (rr() - 0.5) * 2 * RY; const x0 = cx + (rr() - 0.5) * 2 * RX; const L = (120 + rr() * 320) * K; const q = []; for (let j = 0; j <= 14; j++) { const t = j / 14; q.push([x0 - L / 2 + L * t, y + Math.sin(t * 5 + i) * 3.5 * K]); } line(S, q, 1.6 + rr() * 1.8, rr() < 0.65 ? WD[2] : WD[6], { w1: 0.7, taper: true, height: false }); } });
    // keten örtü: tablanın içinde, daha küçük elips; nakışlı kenar
    const CRX = RX * 0.86, CRY = RY * 0.84, ccx = cx - 6 * K, ccy = cy - 2 * K;
    const cl = []; for (let i = 0; i < 90; i++) { const a = (i / 90) * TAU; const wob = 1 + 0.012 * Math.sin(a * 6 + 1) + 0.008 * Math.sin(a * 13); cl.push([ccx + Math.cos(a) * CRX * wob, ccy + Math.sin(a) * CRY * wob]); }
    const cloth = shape(cl, 0.5);
    // örtünün tablaya düşen ince gölgesi (sağ alt)
    fill(S, moved(cloth.path, 7 * K, 6 * K), WD[1], { clip: top.path, alpha: 0.75, height: false });
    layer(S, { clip: cloth.path, bb: cloth.bb, cols: [LI[2], LI[3], LI[4], LI[5], LI[6]], base: LI[4], shade: (x, y) => clamp(0.62 + (ccx - x) / (CRX * 2.6) + (ccy - y) / (CRY * 4) - Math.pow((x - ccx) / CRX, 4) * 0.12), dir: 0, dirJit: 0.05, len: [60, 120], wid: [14, 22], cover: 2, noise: 0.03, rim: { w: 1.8, alpha: 0.7 } });
    // ütü katlama izleri (çapraz; perspektifte)
    withClip(S, cloth.path, () => {
      const crease2 = (pts) => { line(S, pts, 2.6, LI[2], { height: false }); line(S, pts.map(([x, y]) => [x - 1 * K, y - 2.6 * K]), 2, LI[6], { height: false }); };
      crease2([[ccx - CRX, ccy - 4 * K], [ccx + CRX, ccy + 6 * K]]);
      crease2([[ccx - 26 * K, ccy - CRY], [ccx + 30 * K, ccy + CRY]]);
    });
    // nakış: kenara yakın kırmızı + çivit ince çift şerit
    const ringE = (sc, w, col) => { const q = []; for (let i = 0; i <= 90; i++) { const a = (i / 90) * TAU; q.push([ccx + Math.cos(a) * CRX * sc, ccy + Math.sin(a) * CRY * sc]); } line(S, q, w, col, { height: false }); };
    ringE(0.955, 3.2, '#E2582E'); ringE(0.925, 1.8, '#1A3E99'); ringE(0.982, 1.6, '#1A3E99');
    // örtünün ön kenarında hafif kalkık, açık kıvrım
    { const q = []; for (let i = 6; i <= 39; i++) { const a = (i / 45) * Math.PI; q.push([ccx + Math.cos(a) * CRX * 0.998, ccy + Math.sin(a) * CRY * 0.998]); } line(S, q, 3, LI[6], { taper: true, height: false }); }
    return done(S, cx, cy, 0.38);
  }, { size: [1085, 423], base: [0, 270] });

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
    line(S, ellPts(cx, cy + 3 * K, RX * 0.6, RY * 0.56, 0, 48).concat([ellPts(cx, cy + 3 * K, RX * 0.6, RY * 0.56, 0, 48)[0]]), 2, B[3], { height: false });
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
  }, { size: [356, 110], base: [0, 10] });


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
    const fh = fl.bb[3] - fl.bb[1];
    const FB = [[0, 0.2, 6], [0.2, 0.5, 4], [0.5, 0.62, 2], [0.62, 0.86, 3], [0.86, 1.01, 4]];
    for (const [v0, v1, ci] of FB) {
      const bp = []; for (let i = 0; i <= 20; i++) { const x = fl.bb[0] + (i / 20) * (fl.bb[2] - fl.bb[0]); const cur = Math.pow((x - cx) / RXi, 2) * fh * 0.12; bp.push([x, fl.bb[1] + v0 * fh + cur]); }
      for (let i = 20; i >= 0; i--) { const x = fl.bb[0] + (i / 20) * (fl.bb[2] - fl.bb[0]); const cur = Math.pow((x - cx) / RXi, 2) * fh * 0.12; bp.push([x, fl.bb[1] + v1 * fh + cur]); }
      layer(S, { clip: [fl.path, poly(bp)], bb: fl.bb, cols: [G[ci], shade(G[ci], 0.02)], base: G[ci], dir: 0, dirJit: 0.04, len: [40, 80], wid: [7, 11], cover: 1.1, lJit: 0.015 });
    }
    // tabanda ince oyma halka (noktalı) ve çapraz parlama
    const nd = Math.round(RX / K / 5);
    for (let i = 0; i < nd; i++) { const a = (i / nd) * TAU; const x = cx + Math.cos(a) * RXi * 0.78, y = fl.bb[1] + (fl.bb[3] - fl.bb[1]) / 2 + Math.sin(a) * RYi * 0.74; fill(S, ellipsePath(x, y, RX * 0.006, RX * 0.004, 0), Math.sin(a) < 0 ? G[3] : G[6], { alpha: 0.85, height: false }); }
    { // çapraz yansıma bandı (keskin kenarlı açık şerit)
      const fh2 = fl.bb[3] - fl.bb[1]; const x0 = cx - RXi * 0.5;
      const ref = poly([[x0 - fh2 * 0.1, fl.bb[3]], [x0 + RXi * 0.16 - fh2 * 0.1, fl.bb[3]], [x0 + RXi * 0.34, fl.bb[1]], [x0 + RXi * 0.18, fl.bb[1]]]);
      layer(S, { clip: [fl.path, ref], bb: fl.bb, cols: [G[5], G[6]], base: G[5], dir: -1.1, dirJit: 0.05, len: [20, 36], wid: [6, 10], cover: 1.2, lJit: 0.015, alpha: 0.9 });
      const ref2 = poly([[x0 + RXi * 0.2, fl.bb[3]], [x0 + RXi * 0.25, fl.bb[3]], [x0 + RXi * 0.47, fl.bb[1]], [x0 + RXi * 0.42, fl.bb[1]]]);
      layer(S, { clip: [fl.path, ref2], bb: fl.bb, cols: [G[6]], base: G[6], dir: -1.1, len: [16, 28], wid: [4, 6], cover: 1.2, lJit: 0.015, alpha: 0.8 });
    }
    // ön kenar üstü: ince beyaz parıltı
    line(S, ellPts(cx, cy + 1.5 * K, RX * 0.995, RY * 0.995, 0, 64).slice(18, 30), 2.6, '#FFFDF0', { w1: 1, taper: true, height: false });
    line(S, ellPts(cx, cy + TH + 1 * K, RX * 0.985, RY * 0.985, 0, 64).slice(2, 30), 2, G[0], { height: false });
    return { top, floor: fl, RXi, RYi };
  }
  reg('altin-tepsi', () => {
    const k = 1.5, K = k; const S = Paint.sprite(560 * K, 250 * K, { seed: 3101, k });
    const cx = 280 * K, cy = 98 * K; trayOn(S, cx, cy, 258 * K, 80 * K);
    return done(S, cx, cy + 10 * K, 0.28);
  }, { size: [519, 193], base: [0, 84] });

  // ================================================================ CENNET: MEYVE YÜKLÜ ALTIN TEPSİ (üzüm, nar, incir, hurma)
  reg('tepsi-meyve', () => {
    const k = 1.5, K = k; const S = Paint.sprite(600 * K, 400 * K, { seed: 3201, k }); const rr = rng(3203);
    const cx = 300 * K, cy = 262 * K, RX = 276 * K, RY = 84 * K;
    trayOn(S, cx, cy, RX, RY, { seed: 3205 });
    // altta yeşil asma yaprakları (tepsiden taşan)
    vineLeaf(S, cx - 228 * K, cy - 18 * K, 62 * K, 3.0, PAL.leaf, 31);
    vineLeaf(S, cx + 232 * K, cy - 26 * K, 60 * K, -0.1, PAL.leaf, 32);
    vineLeaf(S, cx - 60 * K, cy - 100 * K, 58 * K, -1.9, PAL.leaf, 33);
    // arka: iki nar
    pomegranateOn(S, cx - 150 * K, cy - 92 * K, 74 * K, { seed: 41, crownAng: -2.1 });
    pomegranateOn(S, cx + 138 * K, cy - 100 * K, 80 * K, { seed: 42, crownAng: -1.05 });
    // orta: mor üzüm tepesi
    const mound = [];
    for (let i = 0; i < 86; i++) { const a = rr() * TAU, u = Math.sqrt(rr()); mound.push([cx - 4 * K + Math.cos(a) * u * 126 * K, cy - 52 * K + Math.sin(a) * u * 58 * K - (1 - u * u) * 66 * K, u]); }
    mound.sort((a, b) => a[1] - b[1]);
    line(S, crPts([[cx + 30 * K, cy - 186 * K], [cx + 14 * K, cy - 160 * K], [cx + 4 * K, cy - 132 * K]], 3), 6, PAL.stem[2], { w1: 4, rim: { w: 1, alpha: 0.8 } });
    let gi = 0;
    for (const [x, y, u] of mound) grape(S, x, y, (19 + rr() * 4) * K, PAL.grapeP, { seed: 3300 + gi++, dark: u > 0.82 && y < cy - 90 * K ? 1 : 0, bloom: 0.3, refl: '#4E3E9A', rim: u > 0.85 });
    // sağ: yeşil üzüm salkımı kenardan sarkar
    const L = bunchLayout(cx + 196 * K, cy - 44 * K, 120 * K, 150 * K, 16 * K, 51, { skew: 0.5, wing: 0.1 });
    for (const [x, y, r0, u2, t] of L.front.sort((a, b) => a[1] - b[1])) grape(S, x, y, r0, PAL.grapeG, { seed: 3500 + gi++, glow: 0.45, rim: u2 > 0.6 || t > 0.8 });
    // ön sol: incirler
    figWhole(S, [cx - 190 * K, cy + 8 * K], 34 * K, -Math.PI / 2 - 0.5, 2);
    figWhole(S, [cx - 128 * K, cy + 24 * K], 37 * K, -Math.PI / 2 + 0.2, 3);
    figWhole(S, [cx - 70 * K, cy + 40 * K], 32 * K, -Math.PI / 2 + 0.75, 4);
    // ön orta-sağ: hurma yığını
    const dts = [[cx + 4 * K, cy + 30 * K, 0.25], [cx + 62 * K, cy + 36 * K, -0.3], [cx + 34 * K, cy + 10 * K, 0.05], [cx + 112 * K, cy + 24 * K, 0.4], [cx - 22 * K, cy + 50 * K, -0.15], [cx + 40 * K, cy + 54 * K, 0.1], [cx + 96 * K, cy + 52 * K, -0.2], [cx + 78 * K, cy + 6 * K, 0.5]];
    for (const [x, y, a] of dts.sort((p, q) => p[1] - q[1])) dateOn(S, x, y, 66 * K, a, PAL.date, Math.floor(x + y));
    return done(S, cx, cy - 39 * K, 0.42);
  }, { size: [590, 313], base: [0, 140] });

  // ================================================================ CENNET: GÜMÜŞ KADEH, BİLLUR KADEH, İBRİK
  // metal yansıma profili: u ∈ [-1,1] (sol → sağ), basamaklı krom bantlar
  const metalShade = (V, o = {}) => (x, y) => {
    const hw = V.hwAt(y) || 1; const u = clamp((x - V.cx) / hw, -1, 1); const slope = (V.hwAt(y + 3) - V.hwAt(y - 3)) / 6;
    let v = u < -0.82 ? 0.42 : u < -0.64 ? 0.72 : u < -0.42 ? 0.97 : u < -0.12 ? 0.6 : u < 0.32 ? 0.36 : u < 0.72 ? 0.5 : u < 0.9 ? 0.2 : 0.42;
    v += clamp(slope * 0.6, -0.2, 0.2) + (o.lift ?? 0);
    return clamp(v);
  };
  // krom bantlar: keskin, karışmayan dikey ton şeritleri (profil boyunca kıvrılır); yukarı bakan bölgeler bir ton açık,
  // aşağı bakanlar bir ton koyu. pal: koyu→açık; bands: [u0, u1, renkSırası]
  const CER_BANDS = [[-1.05, -0.8, 3], [-0.8, -0.42, 5], [-0.42, -0.02, 4], [-0.02, 0.42, 3], [0.42, 0.8, 2], [0.8, 1.05, 3]];
  const METAL_BANDS = [[-1.05, -0.8, 3], [-0.8, -0.62, 5], [-0.62, -0.4, 7], [-0.4, -0.12, 4], [-0.12, 0.3, 2], [0.3, 0.7, 3], [0.7, 0.88, 1], [0.88, 1.05, 3]];
  function metalBands(S, V, pal, o = {}) {
    const bands = o.bands ?? METAL_BANDS; const y0 = V.bb[1], y1 = V.bb[3]; const K = S.k;
    if (o.rim !== false) S.rim(V.path, { w: o.rimW ?? 1.4, alpha: o.rimA ?? 0.8 });
    const n = pal.length - 1;
    // eğim bölgeleri
    const zones = []; let cur = null;
    for (let y = y0; y <= y1; y += 2 * K) { const sl = (V.hwAt(y + 3 * K) - V.hwAt(y - 3 * K)) / (6 * K); const z = sl > 0.32 ? 1 : sl < -0.32 ? -1 : 0; if (!cur || cur.z !== z) { cur = { z, a: y, b: y }; zones.push(cur); } else cur.b = y; }
    const bandPoly = (u0, u1, ya, yb) => { const L = [], R = []; for (let y = ya; y <= yb + 0.1; y += 3 * K) { const hw = V.hwAt(clamp(y, V.topY, V.botY)); L.push([V.cx + u0 * hw * 1.02, y]); R.push([V.cx + u1 * hw * 1.02, y]); } return poly([...L, ...R.reverse()]); };
    for (const zn of zones) {
      const ya = zn.a - 2 * K - (zn === zones[0] ? 40 * K : 0), yb = zn.b + 2 * K + (zn === zones[zones.length - 1] ? 40 * K : 0);
      for (const [u0, u1, ci] of bands) {
        const c = pal[clamp(ci + zn.z + (o.lift ?? 0), 0, n)];
        const bp = bandPoly(u0, u1, ya, yb);
        layer(S, { clip: [V.path, bp], bb: [V.bb[0] - 4, ya, V.bb[2] + 4, yb], cols: [c, shade(c, 0.02)], base: c, dir: Math.PI / 2, dirJit: 0.04, len: o.len ?? [12, 22], wid: o.wid ?? [4, 6], cover: 1.1, lJit: 0.012, hJit: 2, cJit: 0.03 });
      }
    }
  }
  reg('kadeh-gumus', () => {
    const k = 2, K = k; const S = Paint.sprite(150 * K, 216 * K, { seed: 3301, k }); const SV = PAL.silver;
    const cx = 75 * K; const e = 0.3;
    // kadeh: geniş, yuvarlak çanak; kısa kalın sap, boğumlu; geniş ayak
    const prof = [[30, 62], [44, 61], [66, 57], [90, 47], [108, 32], [118, 20], [126, 14], [134, 13], [142, 19], [150, 13], [164, 12], [176, 20], [188, 38], [198, 52], [202, 55]].map(([y, w]) => [y * K, w * K]);
    const V = vessel(cx, prof, e);
    metalBands(S, V, SV, { len: [12, 22], wid: [4, 6] });
    // çanakta sıcak yansıma, altın bantlar
    withClip(S, V.path, () => { for (let i = 0; i < 6; i++) dab(S, cx + (0.08 + i * 0.07) * 50 * K, (78 + i * 3) * K, Math.PI / 2, 12, 4, '#EAC896', { alpha: 0.45, height: false }); });
    line(S, ringPts(V, 66 * K, 0.04, Math.PI - 0.04, 24), 3.4, PAL.gold[4], { height: false });
    line(S, ringPts(V, 67.5 * K, 0.4, 1.4, 10), 1.4, PAL.gold[6], { height: false });
    line(S, ringPts(V, 188 * K, 0.08, Math.PI - 0.08, 20), 2.6, PAL.gold[4], { height: false });
    fill(S, ellipsePath(cx, 142 * K, 19 * K, 6 * K, 0), PAL.gold[3], { h: 160 }); fill(S, ellipsePath(cx - 6 * K, 140.5 * K, 6 * K, 2 * K, 0), PAL.gold[6], { height: false });
    // ağız: iç duvar (arka yarı aydınlık, ön yarı gölgeli), dudak halkası
    const mouth = ellShape(cx, 30 * K, 62 * K, 62 * K * e);
    // iç duvar: ön dudağın altında koyu, arka duvarda bantlı yansıma (keskin katlar)
    fill(S, mouth.path, SV[2], { h: 128 });
    const inB = (u0, u1, c) => { const p2 = poly([[cx + u0 * 62 * K, 10 * K], [cx + u1 * 62 * K, 10 * K], [cx + u1 * 50 * K, 52 * K], [cx + u0 * 50 * K, 52 * K]]); layer(S, { clip: [mouth.path, p2], bb: mouth.bb, cols: [c], base: c, dir: Math.PI / 2, len: [6, 12], wid: [3, 5], cover: 1.2, lJit: 0.012 }); };
    inB(-1, -0.55, SV[3]); inB(-0.55, -0.1, SV[4]); inB(0.15, 0.48, SV[6]); inB(0.48, 0.7, SV[4]);
    layer(S, { clip: [mouth.path, ellipsePath(cx, 30 * K + 62 * K * e * 0.75, 62 * K, 62 * K * e * 0.6)], bb: mouth.bb, cols: [SV[1]], base: SV[1], dir: 0, len: [10, 18], wid: [4, 6], cover: 1.2, lJit: 0.012 });
    line(S, ringPts(V, 30 * K, 0, Math.PI, 30), 3.4, SV[6], { height: true });
    line(S, ringPts(V, 30 * K, Math.PI, TAU, 30), 2.2, SV[2], { height: false });
    line(S, ringPts(V, 31 * K, 1.9, 2.8, 10), 2, '#FFFFFF', { w1: 1, taper: true, height: false });
    return done(S, cx, 116 * K, 0.22);
  }, { size: [128, 206], base: [0, 88] });

  reg('kadeh-billur', () => {
    const k = 2, K = k; const S = Paint.sprite(150 * K, 216 * K, { seed: 3401, k }); const SV = PAL.silver;
    const cx = 75 * K; const e = 0.3; const top = 24 * K;
    const prof = [[24, 60], [40, 57], [70, 53], [104, 49], [134, 44], [158, 36], [170, 28], [176, 30], [186, 38], [196, 42], [200, 43]].map(([y, w]) => [y * K, w * K]);
    const V = vessel(cx, prof, e); const hwAt = V.hwAt;
    S.rim(V.path, { w: 1, alpha: 0.4 });
    // yarı saydam billur gövde: gümüşi tül + dikey yüzeyler (faset)
    fill(S, V.path, '#E8EEF8', { alpha: 0.22, h: 132 });
    const nf = 9;
    withClip(S, V.path, () => {
      for (let i = 0; i <= nf; i++) { const u = -1 + (2 * i) / nf; const q = []; for (let y = top + 6 * K; y <= 166 * K; y += 5 * K) q.push([cx + u * hwAt(y) * 0.98, y]); softLine(S, q, i % 2 ? 2 : 3.4, u < -0.2 ? '#FFFFFF' : '#9AA6C4', u < -0.2 ? 0.55 : 0.4); }
      // fasetler arası dolgu: solda açık, sağda soğuk
      field(S, { bb: V.bb, inside: V.path, cols: ['#A8B4D0', '#CCD6EA', '#EEF3FB', '#FFFFFF'], shade: metalShade(V, { lift: 0.05 }), dir: Math.PI / 2, dirJit: 0.04, len: [14, 26], wid: [4, 7], cover: 1.3, alpha: 0.32 });
    });
    // berrak su (alt yarı)
    const wy = 88 * K; const wpts = [...ringPts(V, wy, Math.PI, 0, 24, 0.95)]; for (let y = wy; y <= 160 * K; y += 4 * K) wpts.push([cx + hwAt(y) * 0.93, y]); for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; wpts.push([cx + Math.cos(a) * hwAt(160 * K) * 0.93, 160 * K + Math.sin(a) * hwAt(160 * K) * 0.93 * e]); } for (let y = 160 * K; y >= wy; y -= 4 * K) wpts.push([cx - hwAt(y) * 0.93, y]);
    const water = polyShape(wpts);
    fill(S, water.path, '#BFE6F2', { alpha: 0.3, h: 134 });
    const surf = ellShape(cx, wy, hwAt(wy) * 0.95, hwAt(wy) * 0.95 * e);
    fill(S, surf.path, '#E6F8FC', { alpha: 0.55, h: 140 });
    softLine(S, ringPts(V, wy, 0.1, Math.PI - 0.1, 24, 0.95), 1.8, '#FFFFFF', 0.85);
    // gümüş dudak ve ayak bantları (opak)
    const bandAt = (y0, y1) => { const p2 = polyShape([...ringPts(V, y0, Math.PI, 0, 24, 1.01), ...ringPts(V, y1, 0, Math.PI, 24, 1.01)]); layer(S, { clip: p2.path, bb: p2.bb, cols: SV.slice(1, 8), base: SV[4], shade: metalShade(V), dir: 0, len: [8, 14], wid: [3, 5], cover: 2.4 }); };
    bandAt(top + 2 * K, top + 12 * K);
    // gümüş taban halkası (opak, krom bantlı)
    const footZone = polyShape([[cx - 80 * K, 168 * K], [cx + 80 * K, 168 * K], [cx + 80 * K, 230 * K], [cx - 80 * K, 230 * K]]);
    S.x.save(); S.hx.save(); S.x.clip(footZone.path); S.hx.clip(footZone.path); metalBands(S, V, SV, { len: [8, 14], wid: [3, 5], rim: false }); S.x.restore(); S.hx.restore();
    line(S, ringPts(V, 170 * K, 0.05, Math.PI - 0.05, 20), 2.4, PAL.gold[4], { height: false });
    // ağız halkaları ve parıltılar
    softLine(S, ringPts(V, top, Math.PI, TAU, 30), 2.2, SV[5], 0.9);
    softLine(S, ringPts(V, top, 0, Math.PI, 30), 3, '#FFFFFF', 0.95);
    const glint = (u, y0, y1, w, a) => { const q = []; for (let y = y0; y <= y1; y += 4 * K) q.push([cx + u * hwAt(y), y]); softLine(S, q, w, '#FFFFFF', a); };
    glint(-0.6, top + 18 * K, 80 * K, 4, 0.9); glint(-0.58, 96 * K, 150 * K, 3.4, 0.8); glint(0.72, top + 30 * K, 140 * K, 2, 0.6);
    S.hx.save(); S.hx.strokeStyle = 'rgb(186,186,186)'; S.hx.lineWidth = 2 * K; S.hx.stroke(V.path); S.hx.restore();
    return done(S, cx, 112 * K, 0.22);
  }, { size: [123, 209], base: [0, 90] });

  reg('ibrik', () => {
    const k = 2, K = k; const S = Paint.sprite(200 * K, 340 * K, { seed: 3501, k }); const SV = PAL.silver; const GD = PAL.gold;
    const cx = 104 * K; const e = 0.28;
    const prof = [[44, 22], [52, 20], [62, 15], [96, 13], [126, 17], [156, 36], [190, 54], [226, 62], [256, 58], [282, 44], [298, 28], [304, 24], [312, 34], [322, 40], [326, 41]].map(([y, w]) => [y * K, w * K]);
    const V = vessel(cx, prof, e);
    const mDir = (x, y) => Math.PI / 2 + ((x - cx) / (V.hwAt(y) || 1)) * 0.1 + (S.r() - 0.5) * 0.06;
    // kulp (arkada, sağda): boyundan karına C kıvrımı
    const hd = crPts([[cx + 12 * K, 74 * K], [cx + 52 * K, 76 * K], [cx + 74 * K, 110 * K], [cx + 74 * K, 170 * K], [cx + 60 * K, 214 * K], [cx + 50 * K, 228 * K]], 3);
    line(S, hd, 11, SV[1], { w1: 9, rim: { w: 1.2, alpha: 0.85 } });
    line(S, hd.map(([x, y]) => [x - 1.5 * K, y - 1.5 * K]), 5, SV[4], { w1: 4, height: false });
    line(S, hd.map(([x, y]) => [x - 2.4 * K, y - 2.4 * K]), 1.6, '#FFFFFF', { w1: 1.2, height: false });
    // lüle (önde, solda): karından yükselen ince S kıvrımı, uçta gaga
    const sp = crPts([[cx - 44 * K, 238 * K], [cx - 66 * K, 206 * K], [cx - 76 * K, 160 * K], [cx - 84 * K, 112 * K], [cx - 96 * K, 74 * K], [cx - 108 * K, 58 * K]], 3);
    line(S, sp, 18, SV[1], { w1: 6, rim: { w: 1.2, alpha: 0.85 } });
    line(S, sp.map(([x, y]) => [x - 2 * K, y - 0.5 * K]), 9, SV[4], { w1: 3, height: false });
    line(S, sp.map(([x, y]) => [x - 3 * K, y - 1 * K]), 2.4, '#FFFFFF', { w1: 1, height: false });
    fill(S, ellipsePath(cx - 108 * K, 58 * K, 4 * K, 2.6 * K, -0.7), SV[0], { h: 120 });
    // gövde
    metalBands(S, V, SV, { len: [14, 26], wid: [4.5, 7] });
    
    // ince altın bantlar
    for (const yy of [126, 190, 298]) line(S, ringPts(V, yy * K, 0.05, Math.PI - 0.05, 24), 3, GD[4], { height: false });
    line(S, ringPts(V, 190 * K + 4 * K, 0.05, Math.PI - 0.05, 24), 1.4, GD[6], { height: false });
    // lülenin gövdeye bağlandığı yerde küçük halka
    { const jx = cx - V.hwAt(232 * K) + 3 * K, jy = 232 * K; fill(S, ellipsePath(jx, jy, 5 * K, 11 * K, 0.5), SV[3], { h: 150 }); line(S, crPts([[jx - 1 * K, jy - 11 * K], [jx - 4 * K, jy], [jx + 1 * K, jy + 11 * K]], 2), 2, PAL.gold[4], { height: false }); }
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
  }, { size: [186, 329], base: [0, 150] });

  // ---------------------------------------------------------------- sofra üstü yerleşim önerileri
  // x,y: sofra pivotuna (üst yüz merkezi) göre öğe PİVOTUNUN konumu (sofra ölçek 1'de ekran px); s: öğe ölçeği.
  // surf: öğenin örtüye değdiği nokta (y). main: p2 yakın planı için önerilen ana takım. Arkadan öne çizin (y artan).
  // z: çizim sırası (küçük önce; verilmezse surf), rot: önerilen dönüş (radyan; ör. salkımı yatırmak için)
  const spot = (name, sx, sy, sc, main, o = {}) => { const b = o.b ?? (YIYECEK.base[name] || [0, 0])[1]; YIYECEK.onTableSpots[name] = { x: sx, y: Math.round(sy - b * sc), s: sc, rot: o.rot ?? 0, surf: sy, z: o.z ?? sy, main: !!main }; };
  spot('bal', 292, -40, 0.5, true);
  spot('uzum', -120, -20, 0.56, true, { rot: -1.22, b: 118 });
  spot('su-testi', 420, -30, 0.42, false);
  spot('sut', -380, -24, 0.42, false);
  spot('ekmek', -300, 52, 0.6, true);
  spot('nar-acik', 70, 50, 0.7, true);
  spot('tabak', 300, 96, 0.62, true);
  spot('hurma', 300, 92, 0.42, true, { z: 97 });
  spot('su-bardak', 470, 40, 0.5, false);
  spot('elma', -40, -50, 0.4, false);
  spot('nar', 150, -52, 0.4, false);
  spot('incir', -170, 100, 0.44, false);
  spot('zeytin', 160, 118, 0.4, false);
  spot('uzum-yesil', -260, -40, 0.44, false);
  spot('gul', -440, 40, 0.36, false);
  YIYECEK.sofra = { pivot: 'üst yüz merkezi', rx: SOFRA.rx, ry: SOFRA.ry, clothRx: Math.round(SOFRA.rx * 0.86), clothRy: Math.round(SOFRA.ry * 0.84) };
})();
