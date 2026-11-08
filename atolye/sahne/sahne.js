/*
 * Atölye ortak sahnesi: Yeşil Kubbe (Kubbe-i Hadrâ), yanındaki minare ve çiçekler.
 *
 * Her stilin örnek görseli AYNI sahneyi çizer; böylece stiller yan yana konunca fark yalnız
 * "render stili"nden gelir. Bu dosya sahnenin geometrisini (ölçüler, yollar), çiçeklerin yerini
 * ve düz renkli bir başvuru çizimini verir.
 *
 * - Bütün ölçüler 1024 × 1024 tuval içindir. Işık sağ üstten (güneş 880,140) gelir.
 * - Klasik betiktir (modül değil), file:// ile açılan sayfada da çalışır: <script src="../../sahne/sahne.js">
 * - Genel ad: window.SAHNE. Çizim bitince SAHNE.hazir() çağrılır (çizim aracı bunu bekler).
 */
(function () {
  'use strict';

  const S = {};
  S.W = 1024;
  S.H = 1024;
  S.zemin = 800; // yer çizgisi
  S.gunes = { x: 880, y: 140 }; // ışık kaynağı: sağ üst

  /** Başvuru (doğal) paleti. Stiller kendi paletini kullanır. */
  S.renk = {
    gokUst: '#8DBBE5',
    gokAlt: '#F4ECDA',
    gunes: '#FFF4D6',
    bulut: '#FFFFFF',
    kubbe: '#2F7D3B',
    kubbeAcik: '#5DAA62',
    kubbeKoyu: '#1E5527',
    kasnak: '#2A7034',
    pencere: '#173F1D',
    altin: '#C9A23A',
    altinAcik: '#F1D77A',
    altinKoyu: '#8C6A1C',
    tas: '#EEE6D3',
    tasAcik: '#FBF6EA',
    tasGolge: '#CBBE9E',
    tasKoyu: '#A8987A',
    pencereTas: '#857A63',
    zemin: '#DCCFB2',
    yaprak: '#6F9258',
    yaprakKoyu: '#4C6E3E',
    sap: '#5E7F4A',
    cicek: '#FFFFFF',
    cicekKenar: '#F2CCD6',
    cicekOrta: '#E8B93F',
  };

  /** Bölge haritası renkleri (SAHNE.ciz(ctx, {bolge:true}) ile). Her bölge ayrı, düz bir renk. */
  S.BOLGE = {
    gok: '#0000ff',
    gunes: '#ff0000',
    zemin: '#804000',
    minare: '#00ffff',
    kaide: '#ffff00',
    kasnak: '#ff8000',
    kubbe: '#00ff00',
    pencere: '#000000',
    altin: '#ff00ff',
    sap: '#408000',
    yaprak: '#008000',
    cicek: '#ffffff',
    cicekOrta: '#808080',
  };
  const BOLGE_RGB = Object.entries(S.BOLGE).map(([ad, hex]) => [ad, parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]);
  /** Bölge haritasından okunan (r,g,b) değerine en yakın bölgenin adı (kenar yumuşatmasına dayanıklı). */
  S.bolgeAdi = function (r, g, b) {
    let en = null;
    let enUzak = Infinity;
    for (const [ad, R, G, B] of BOLGE_RGB) {
      const d = (r - R) * (r - R) + (g - G) * (g - G) + (b - B) * (b - B);
      if (d < enUzak) {
        enUzak = d;
        en = ad;
      }
    }
    return en;
  };

  // ------------------------------------------------------------------ yardımcılar

  /** Tohumlu rastgele sayı üreteci (mulberry32): aynı tohum → hep aynı görsel. */
  S.rng = function (tohum) {
    let a = tohum >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** Çizim bitti: çizim aracı (araclar/ciz.mjs) bu işareti bekleyip görüntüyü alır. */
  S.hazir = function () {
    window.__hazir = true;
  };

  /** Bir tuvali sahne boyutunda (1024) kurar; ölçek > 1 ise iç çözünürlük artar ama koordinatlar 1024'te kalır. */
  S.tuval = function (tuval, olcek) {
    olcek = olcek || 1;
    tuval.width = S.W * olcek;
    tuval.height = S.H * olcek;
    const ctx = tuval.getContext('2d');
    ctx.setTransform(olcek, 0, 0, olcek, 0, 0);
    return ctx;
  };

  /** Ekran dışı tuval. */
  S.yeniTuval = function (w, h) {
    const c = document.createElement('canvas');
    c.width = w || S.W;
    c.height = h || S.H;
    return c;
  };

  const f = (n) => Math.round(n * 100) / 100;
  /** Nokta dizisini SVG yoluna çevirir. */
  S.yol = function (noktalar, kapali) {
    let d = '';
    noktalar.forEach(([x, y], i) => {
      d += (i ? ' L' : 'M') + f(x) + ',' + f(y);
    });
    return kapali ? d + ' Z' : d;
  };
  const dikdortgen = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

  function bez(p0, p1, p2, p3, t) {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
  }

  /**
   * Sivri kemer (pencere, niş) yolu. x: orta, y: kemerin tepesi, w: genişlik, h: toplam yükseklik.
   */
  S.kemerYolu = function (x, y, w, h) {
    const l = x - w / 2;
    const r = x + w / 2;
    const b = y + h;
    const s = y + Math.min(h, w * 0.62);
    return (
      `M${f(l)},${f(b)} L${f(l)},${f(s)} ` +
      `C${f(l)},${f(s - w * 0.42)} ${f(x - w * 0.14)},${f(y + w * 0.1)} ${f(x)},${f(y)} ` +
      `C${f(x + w * 0.14)},${f(y + w * 0.1)} ${f(r)},${f(s - w * 0.42)} ${f(r)},${f(s)} L${f(r)},${f(b)} Z`
    );
  };

  /** Boynuzları yukarı bakan hilal yolu. Dış yarıçap R, merkez (cx, cy). */
  S.hilalYolu = function (cx, cy, R) {
    const r2 = R * 0.85;
    const d = R * 0.4; // iç dairenin yukarı kayması
    const yk = (r2 * r2 - R * R - d * d) / (2 * d); // kesişimin merkeze göre y'si (negatif = yukarı)
    const xk = Math.sqrt(Math.max(0, R * R - yk * yk));
    return (
      `M${f(cx - xk)},${f(cy + yk)} A${f(R)},${f(R)} 0 1,0 ${f(cx + xk)},${f(cy + yk)} ` +
      `A${f(r2)},${f(r2)} 0 1,1 ${f(cx - xk)},${f(cy + yk)} Z`
    );
  };

  // ------------------------------------------------------------------ kubbe

  /** Kubbe: taban genişliği 400 (x 360–760), taban y=555, sivri tepe (560,300). */
  S.kubbe = { cx: 560, taban: 555, yari: 200, tepe: 300 };
  S.kubbeYolu = 'M360,555 C358,430 440,318 560,300 C680,318 762,430 760,555 Z';

  /** Kubbenin tabandan tepeye yükseklik → yarıçap profili: [{y, r}] */
  S.kubbeProfili = function (n) {
    n = n || 60;
    const out = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push({ y: bez(555, 430, 318, 300, t), r: 560 - bez(360, 358, 440, 560, t) });
    }
    return out;
  };

  /** Kubbe dış çizgisi nokta dizisi (soldan tepeye, tepeden sağa). */
  S.kubbeNoktalari = function (n) {
    const p = S.kubbeProfili(n);
    const sol = p.map((q) => [560 - q.r, q.y]);
    const sag = p
      .slice()
      .reverse()
      .map((q) => [560 + q.r, q.y]);
    return sol.concat(sag.slice(1));
  };

  /**
   * Kaburgalar: kubbenin görünen yarısındaki meridyenler. u = sin(boylam), -1 sol kenar, +1 sağ kenar.
   * adet: yarım küredeki dilim sayısı (adet-1 çizgi döner).
   */
  S.kaburgalar = function (adet, n) {
    adet = adet || 16;
    const p = S.kubbeProfili(n || 40);
    const out = [];
    for (let k = 1; k < adet; k++) {
      const boylam = -Math.PI / 2 + (Math.PI * k) / adet;
      const u = Math.sin(boylam);
      out.push({ u, boylam, noktalar: p.map((q) => [560 + u * q.r, q.y]) });
    }
    return out;
  };

  /** Bir noktanın kubbe içinde olup olmadığı. */
  S.kubbedeMi = function (x, y) {
    if (y > 555 || y < 300) return false;
    const p = S.kubbeProfili(60);
    for (let i = 0; i < p.length - 1; i++) {
      if (y <= p[i].y && y >= p[i + 1].y) {
        const t = (p[i].y - y) / (p[i].y - p[i + 1].y || 1);
        const r = p[i].r + (p[i + 1].r - p[i].r) * t;
        return Math.abs(x - 560) <= r;
      }
    }
    return false;
  };

  // ------------------------------------------------------------------ kasnak (kubbenin altındaki pencereli silindir)

  S.kasnak = [
    { ad: 'üst', x1: 352, x2: 768, y1: 555, y2: 610, pencere: { adet: 15, w: 14, h: 30, y: 567 } },
    { ad: 'alt', x1: 334, x2: 786, y1: 610, y2: 692, pencere: { adet: 13, w: 21, h: 48, y: 628 } },
  ];

  /** Kasnak katındaki kemerli pencereler; silindir üzerinde olduğu için kenarlara doğru daralır. */
  S.kasnakPencereleri = function (kat) {
    const k = S.kasnak[kat];
    const cx = (k.x1 + k.x2) / 2;
    const R = ((k.x2 - k.x1) / 2) * 0.92;
    const out = [];
    for (let j = 0; j < k.pencere.adet; j++) {
      const th = -Math.PI / 2 + (Math.PI * (j + 0.5)) / k.pencere.adet;
      const c = Math.cos(th);
      if (c < 0.22) continue;
      out.push({ x: cx + R * Math.sin(th), y: k.pencere.y, w: k.pencere.w * c, h: k.pencere.h, aci: th });
    }
    return out;
  };

  // ------------------------------------------------------------------ kaide (beyaz taş yapı)

  S.kaide = {
    x1: 300,
    x2: 820,
    y1: 704,
    y2: 800,
    kornis: { x1: 290, x2: 830, y1: 692, y2: 704 },
    pencereler: [
      { x: 430, y: 722, w: 26, h: 54 },
      { x: 560, y: 718, w: 30, h: 60 },
      { x: 690, y: 722, w: 26, h: 54 },
    ],
  };

  // ------------------------------------------------------------------ alem (kubbe ve minare tepesindeki altın süs)

  /** Alem parçaları. Kubbede: SAHNE.alemParcalari(560, 300, 1) → hilalin tepesi y≈187. */
  S.alemParcalari = function (cx, taban, olcek) {
    const s = olcek || 1;
    return {
      yaka: { cx, cy: taban, rx: 20 * s, ry: 8 * s },
      cubuk: { x1: cx - 2.6 * s, x2: cx + 2.6 * s, y1: taban - 90 * s, y2: taban - 4 * s },
      kureler: [
        { cx, cy: taban - 22 * s, r: 11 * s },
        { cx, cy: taban - 46 * s, r: 8.5 * s },
        { cx, cy: taban - 66 * s, r: 6.5 * s },
      ],
      hilal: { cx, cy: taban - 99 * s, R: 13 * s },
    };
  };

  // ------------------------------------------------------------------ minare (kubbenin solunda, arkada)

  S.minare = { cx: 300, taban: 800, tepe: 82 };

  /**
   * Minare parçaları, aşağıdan yukarı çizim sırasıyla. Her parça: {ad, tip, ...}
   *  tip 'poligon' → noktalar; 'bant' / 'korkuluk' → x1,x2,y1,y2; 'topuz' → yol; 'alem' → alemParcalari
   */
  S.minareParcalari = function () {
    const c = S.minare.cx;
    return [
      { ad: 'gövde-alt', tip: 'poligon', noktalar: dikdortgen(c - 34, 488, c + 34, 800) },
      { ad: 'zikzak', tip: 'bant', x1: c - 34, x2: c + 34, y1: 522, y2: 582 },
      { ad: 'çıkma-1', tip: 'poligon', noktalar: [[c - 34, 488], [c - 52, 468], [c + 52, 468], [c + 34, 488]] },
      { ad: 'şerefe-1', tip: 'poligon', noktalar: dikdortgen(c - 54, 456, c + 54, 468) },
      { ad: 'korkuluk-1', tip: 'korkuluk', x1: c - 48, x2: c + 48, y1: 436, y2: 456 },
      { ad: 'gövde-orta', tip: 'poligon', noktalar: dikdortgen(c - 27, 316, c + 27, 436) },
      { ad: 'çıkma-2', tip: 'poligon', noktalar: [[c - 27, 316], [c - 43, 300], [c + 43, 300], [c + 27, 316]] },
      { ad: 'şerefe-2', tip: 'poligon', noktalar: dikdortgen(c - 45, 290, c + 45, 300) },
      { ad: 'korkuluk-2', tip: 'korkuluk', x1: c - 40, x2: c + 40, y1: 272, y2: 290 },
      { ad: 'gövde-üst', tip: 'poligon', noktalar: dikdortgen(c - 19, 206, c + 19, 272) },
      { ad: 'bilezik', tip: 'poligon', noktalar: dikdortgen(c - 25, 198, c + 25, 206) },
      {
        ad: 'topuz',
        tip: 'topuz',
        yol: `M${c - 22},200 C${c - 34},182 ${c - 12},160 ${c},146 C${c + 12},160 ${c + 34},182 ${c + 22},200 Z`,
      },
      { ad: 'alem', tip: 'alem', alem: S.alemParcalari(c, 146, 0.62) },
    ];
  };

  /** Minare gövdesindeki kemerli pencereler. */
  S.minarePencereleri = [
    { x: 300, y: 222, w: 11, h: 26 },
    { x: 300, y: 350, w: 13, h: 36 },
    { x: 300, y: 610, w: 13, h: 38 },
  ];

  /** Zikzak bandının çizgileri (üç sıra şerit), her biri nokta dizisi. */
  S.zikzakCizgileri = function () {
    const b = S.minareParcalari().find((p) => p.ad === 'zikzak');
    const out = [];
    for (let k = 0; k < 3; k++) {
      const y0 = b.y1 + 4 + k * 19;
      const pts = [];
      const dis = 6;
      for (let i = 0; i <= dis * 2; i++) pts.push([b.x1 + ((b.x2 - b.x1) * i) / (dis * 2), y0 + (i % 2 ? 0 : 12)]);
      out.push(pts);
    }
    return out;
  };

  // ------------------------------------------------------------------ çiçekler ve yapraklar

  /** Çiçeklerin serbest olduğu alanlar: önde bir şerit, iki yanda yükselen dallar. */
  S.cicekAlani = {
    on: { x1: 0, x2: 1024, y1: 780, y2: 1024 },
    sol: { x1: 30, x2: 260, y1: 520, y2: 1024 },
    sag: { x1: 780, x2: 1000, y1: 520, y2: 1024 },
  };

  function bitkileriKur() {
    const r = S.rng(7);
    const saplar = [];
    const yapraklar = [];
    const cicekler = [];
    const tomurcuklar = [];
    const dallar = [
      { x0: 150, y0: 1010, x1: 118, y1: 560, egri: -38, taraf: -1 },
      { x0: 222, y0: 1010, x1: 250, y1: 650, egri: 26, taraf: 1 },
      { x0: 874, y0: 1010, x1: 906, y1: 560, egri: 38, taraf: 1 },
      { x0: 802, y0: 1010, x1: 774, y1: 650, egri: -26, taraf: -1 },
    ];
    for (const d of dallar) {
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        pts.push([d.x0 + (d.x1 - d.x0) * t + d.egri * Math.sin(Math.PI * t), d.y0 + (d.y1 - d.y0) * t]);
      }
      saplar.push(pts);
      for (let i = 6; i < 23; i += 2) {
        const [x, y] = pts[i];
        const [xn, yn] = pts[i + 1];
        const yon = Math.atan2(yn - y, xn - x);
        const taraf = i % 4 === 2 ? 1 : -1;
        yapraklar.push({ x, y, uzunluk: 30 + r() * 16, genislik: 0.44, aci: yon + taraf * (0.85 + r() * 0.3) });
      }
      const uc = pts[24];
      tomurcuklar.push({ x: uc[0], y: uc[1] - 6, r: 9, aci: -Math.PI / 2 + d.taraf * 0.15 });
      tomurcuklar.push({ x: pts[20][0] + d.taraf * 20, y: pts[20][1] - 4, r: 7, aci: -Math.PI / 2 + d.taraf * 0.7 });
      cicekler.push({ x: pts[15][0] - d.taraf * 24, y: pts[15][1], r: 24, aci: r() * Math.PI });
    }
    // öndeki yaprak yelpazesi (çiçeklerin arkasında)
    for (let i = 0; i < 54; i++) {
      const x = 30 + r() * 964;
      const y = 830 + r() * 200;
      yapraklar.push({ x, y, uzunluk: 48 + r() * 42, genislik: 0.46, aci: -Math.PI / 2 + (x - 512) / 900 + (r() - 0.5) * 1.6 });
    }
    // öndeki çiçek kümesi: büyükler önde
    const on = [
      { x: 290, y: 846, r: 30 },
      { x: 450, y: 872, r: 28 },
      { x: 625, y: 862, r: 27 },
      { x: 770, y: 848, r: 32 },
      { x: 200, y: 905, r: 62 },
      { x: 860, y: 908, r: 60 },
      { x: 372, y: 968, r: 48 },
      { x: 700, y: 970, r: 46 },
      { x: 532, y: 935, r: 66 },
    ];
    for (const c of on) cicekler.push({ x: c.x, y: c.y, r: c.r, aci: r() * ((Math.PI * 2) / 5) });
    for (let i = 0; i < 7; i++) tomurcuklar.push({ x: 110 + i * 135 + r() * 40, y: 815 + r() * 30, r: 8 + r() * 3, aci: -Math.PI / 2 + (r() - 0.5) * 0.8 });
    return { saplar, yapraklar, cicekler, tomurcuklar };
  }

  /**
   * Bitkiler (hep aynı yerde): saplar (nokta dizileri), yapraklar {x,y,uzunluk,genislik,aci},
   * çiçekler {x,y,r,aci} (beş taç yapraklı), tomurcuklar {x,y,r,aci}. Çizim sırası: sap → yaprak → tomurcuk → çiçek.
   */
  S.bitki = bitkileriKur();

  /** Badem biçimli yaprak yolu: (x,y) yaprağın sapı, aci yönünde uzanır. */
  S.yaprakYolu = function (y) {
    const L = y.uzunluk;
    const W = L * y.genislik;
    const ca = Math.cos(y.aci);
    const sa = Math.sin(y.aci);
    const p = (u, v) => [y.x + u * ca - v * sa, y.y + u * sa + v * ca];
    const a = p(0, 0);
    const b = p(L, 0);
    const c1 = p(L * 0.35, -W * 0.75);
    const c2 = p(L * 0.8, -W * 0.45);
    const c3 = p(L * 0.8, W * 0.45);
    const c4 = p(L * 0.35, W * 0.75);
    return (
      `M${f(a[0])},${f(a[1])} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(b[0])},${f(b[1])} ` +
      `C${f(c3[0])},${f(c3[1])} ${f(c4[0])},${f(c4[1])} ${f(a[0])},${f(a[1])} Z`
    );
  };

  /** Yaprağın orta damarı: [başlangıç, uç] */
  S.yaprakDamari = function (y) {
    return [
      [y.x, y.y],
      [y.x + Math.cos(y.aci) * y.uzunluk * 0.92, y.y + Math.sin(y.aci) * y.uzunluk * 0.92],
    ];
  };

  /** Beş taç yaprağın elipsleri: {cx, cy, rx, ry, aci} */
  S.tacYapraklari = function (c) {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const a = c.aci + (i * Math.PI * 2) / 5;
      out.push({ cx: c.x + Math.cos(a) * c.r * 0.52, cy: c.y + Math.sin(a) * c.r * 0.52, rx: c.r * 0.52, ry: c.r * 0.4, aci: a });
    }
    return out;
  };

  /** Tomurcuk yolu (damla biçimi, ucu aci yönünde). */
  S.tomurcukYolu = function (t) {
    const ca = Math.cos(t.aci);
    const sa = Math.sin(t.aci);
    const p = (u, v) => [t.x + u * ca - v * sa, t.y + u * sa + v * ca];
    const a = p(-t.r * 0.9, 0);
    const b = p(t.r * 1.6, 0);
    const c1 = p(-t.r * 0.9, -t.r * 1.3);
    const c2 = p(t.r * 0.9, -t.r * 0.9);
    const c3 = p(t.r * 0.9, t.r * 0.9);
    const c4 = p(-t.r * 0.9, t.r * 1.3);
    return `M${f(a[0])},${f(a[1])} C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(b[0])},${f(b[1])} C${f(c3[0])},${f(c3[1])} ${f(c4[0])},${f(c4[1])} ${f(a[0])},${f(a[1])} Z`;
  };

  // ------------------------------------------------------------------ hazır SVG yolları

  /**
   * Sahnedeki her öğenin SVG yolu (çizgi, vektör ve kesim stilleri için). Canvas'ta new Path2D(yol) ile de kullanılır.
   */
  S.yollar = function () {
    const Y = {};
    Y.kubbe = S.kubbeYolu;
    Y.kaburgalar = S.kaburgalar(16).map((k) => S.yol(k.noktalar));
    Y.kasnakUst = S.yol(dikdortgen(S.kasnak[0].x1, S.kasnak[0].y1, S.kasnak[0].x2, S.kasnak[0].y2), true);
    Y.kasnakAlt = S.yol(dikdortgen(S.kasnak[1].x1, S.kasnak[1].y1, S.kasnak[1].x2, S.kasnak[1].y2), true);
    Y.kasnakPencereleri = [0, 1].flatMap((k) => S.kasnakPencereleri(k).map((p) => S.kemerYolu(p.x, p.y, p.w, p.h)));
    const K = S.kaide;
    Y.kaide = S.yol(dikdortgen(K.x1, K.y1, K.x2, K.y2), true);
    Y.kornis = S.yol(dikdortgen(K.kornis.x1, K.kornis.y1, K.kornis.x2, K.kornis.y2), true);
    Y.kaidePencereleri = K.pencereler.map((p) => S.kemerYolu(p.x, p.y, p.w, p.h));
    Y.minare = [];
    Y.minareAlem = [];
    for (const p of S.minareParcalari()) {
      if (p.tip === 'poligon') Y.minare.push(S.yol(p.noktalar, true));
      else if (p.tip === 'korkuluk' || p.tip === 'bant') Y.minare.push(S.yol(dikdortgen(p.x1, p.y1, p.x2, p.y2), true));
      else if (p.tip === 'topuz') Y.minare.push(p.yol);
      else if (p.tip === 'alem') Y.minareAlem = alemYollari(p.alem);
    }
    Y.minarePencereleri = S.minarePencereleri.map((p) => S.kemerYolu(p.x, p.y, p.w, p.h));
    Y.zikzak = S.zikzakCizgileri().map((z) => S.yol(z));
    Y.alem = alemYollari(S.alemParcalari(560, 300, 1));
    Y.saplar = S.bitki.saplar.map((s) => S.yol(s));
    Y.yapraklar = S.bitki.yapraklar.map(S.yaprakYolu);
    Y.tomurcuklar = S.bitki.tomurcuklar.map(S.tomurcukYolu);
    Y.cicekler = S.bitki.cicekler.map((c) => S.tacYapraklari(c).map(elipsYolu).join(' '));
    return Y;
  };

  function elipsYolu(e) {
    // döndürülmüş elips: dört kübik eğriyle
    const k = 0.5523;
    const ca = Math.cos(e.aci);
    const sa = Math.sin(e.aci);
    const p = (u, v) => [e.cx + u * ca - v * sa, e.cy + u * sa + v * ca];
    const P = [p(e.rx, 0), p(e.rx, e.ry * k), p(e.rx * k, e.ry), p(0, e.ry), p(-e.rx * k, e.ry), p(-e.rx, e.ry * k), p(-e.rx, 0), p(-e.rx, -e.ry * k), p(-e.rx * k, -e.ry), p(0, -e.ry), p(e.rx * k, -e.ry), p(e.rx, -e.ry * k)];
    const q = (i) => `${f(P[i % 12][0])},${f(P[i % 12][1])}`;
    return `M${q(0)} C${q(1)} ${q(2)} ${q(3)} C${q(4)} ${q(5)} ${q(6)} C${q(7)} ${q(8)} ${q(9)} C${q(10)} ${q(11)} ${q(12)} Z`;
  }
  S.elipsYolu = elipsYolu;

  function daireYolu(cx, cy, r) {
    return `M${f(cx - r)},${f(cy)} A${f(r)},${f(r)} 0 1,0 ${f(cx + r)},${f(cy)} A${f(r)},${f(r)} 0 1,0 ${f(cx - r)},${f(cy)} Z`;
  }
  S.daireYolu = daireYolu;

  function alemYollari(a) {
    return [
      elipsYolu({ cx: a.yaka.cx, cy: a.yaka.cy, rx: a.yaka.rx, ry: a.yaka.ry, aci: 0 }),
      S.yol(dikdortgen(a.cubuk.x1, a.cubuk.y1, a.cubuk.x2, a.cubuk.y2), true),
      ...a.kureler.map((k) => daireYolu(k.cx, k.cy, k.r)),
      S.hilalYolu(a.hilal.cx, a.hilal.cy, a.hilal.R),
    ];
  }

  // ------------------------------------------------------------------ düz renkli başvuru çizimi (canvas)

  /**
   * Sahnenin doğal renkli başvuru çizimi.
   *  o.bolge = true → her bölge SAHNE.BOLGE'deki düz renkle (maske / renk örnekleme için)
   *  o.cicek = false → çiçek ve yapraklar çizilmez
   *  o.gok = false → gök ve güneş çizilmez (saydam kalır)
   * Fırça/nokta/parça tabanlı stiller bu çizimi ekran dışı bir tuvale çizip renk örnekleyebilir:
   *   const c = SAHNE.yeniTuval(); SAHNE.ciz(c.getContext('2d')); const veri = c.getContext('2d').getImageData(0,0,1024,1024);
   */
  S.ciz = function (ctx, o) {
    o = o || {};
    const R = S.renk;
    const B = S.BOLGE;
    const bolge = !!o.bolge;
    const yol = (d) => new Path2D(d);
    const doldur = (d, renk) => {
      ctx.fillStyle = renk;
      ctx.fill(typeof d === 'string' ? yol(d) : d);
    };
    const yatayDegrade = (x1, x2, durak) => {
      const g = ctx.createLinearGradient(x1, 0, x2, 0);
      durak.forEach(([t, c]) => g.addColorStop(t, c));
      return g;
    };
    ctx.save();

    // gök
    if (o.gok !== false) {
      if (bolge) {
        ctx.fillStyle = B.gok;
        ctx.fillRect(0, 0, S.W, S.H);
        doldur(daireYolu(S.gunes.x, S.gunes.y, 46), B.gunes);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, S.zemin);
        g.addColorStop(0, R.gokUst);
        g.addColorStop(1, R.gokAlt);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, S.W, S.H);
        const gl = ctx.createRadialGradient(S.gunes.x, S.gunes.y, 10, S.gunes.x, S.gunes.y, 340);
        gl.addColorStop(0, 'rgba(255,248,226,0.95)');
        gl.addColorStop(0.25, 'rgba(255,244,214,0.5)');
        gl.addColorStop(1, 'rgba(255,244,214,0)');
        ctx.fillStyle = gl;
        ctx.fillRect(0, 0, S.W, S.H);
        // yumuşak bulutlar
        const rb = S.rng(3);
        const bulutlar = [
          [170, 250, 1.0],
          [500, 150, 0.8],
          [760, 330, 1.1],
          [940, 470, 0.7],
          [90, 470, 0.7],
        ];
        for (const [bx, by, bs] of bulutlar) {
          for (let i = 0; i < 14; i++) {
            const x = bx + (rb() - 0.5) * 150 * bs;
            const y = by + (rb() - 0.5) * 34 * bs;
            const r = (24 + rb() * 30) * bs;
            const gg = ctx.createRadialGradient(x, y, 0, x, y, r);
            gg.addColorStop(0, 'rgba(255,255,255,0.34)');
            gg.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gg;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
          }
        }
      }
      // yer
      if (bolge) {
        ctx.fillStyle = B.zemin;
        ctx.fillRect(0, S.zemin, S.W, S.H - S.zemin);
      } else {
        const z = ctx.createLinearGradient(0, S.zemin, 0, S.H);
        z.addColorStop(0, R.zemin);
        z.addColorStop(1, '#C9BB9B');
        ctx.fillStyle = z;
        ctx.fillRect(0, S.zemin, S.W, S.H - S.zemin);
      }
    }

    // minare
    for (const p of S.minareParcalari()) {
      if (p.tip === 'alem') {
        alemCiz(ctx, p.alem, bolge);
        continue;
      }
      let d;
      let x1;
      let x2;
      if (p.tip === 'poligon') {
        d = S.yol(p.noktalar, true);
        x1 = Math.min(...p.noktalar.map((q) => q[0]));
        x2 = Math.max(...p.noktalar.map((q) => q[0]));
      } else if (p.tip === 'topuz') {
        d = p.yol;
        x1 = 266;
        x2 = 334;
      } else {
        d = S.yol(dikdortgen(p.x1, p.y1, p.x2, p.y2), true);
        x1 = p.x1;
        x2 = p.x2;
      }
      if (p.tip === 'bant') {
        if (!bolge) {
          ctx.strokeStyle = R.tasKoyu;
          ctx.lineWidth = 3.2;
          ctx.lineJoin = 'miter';
          for (const z of S.zikzakCizgileri()) ctx.stroke(yol(S.yol(z)));
        }
        continue;
      }
      doldur(d, bolge ? B.minare : yatayDegrade(x1, x2, [[0, R.tasKoyu], [0.55, R.tas], [0.85, R.tasAcik], [1, R.tasGolge]]));
      if (p.tip === 'korkuluk' && !bolge) {
        ctx.fillStyle = 'rgba(90,78,58,0.45)';
        const adet = 9;
        for (let i = 0; i < adet; i++) {
          const x = p.x1 + 5 + ((p.x2 - p.x1 - 10) * (i + 0.5)) / adet;
          ctx.fillRect(x - 2, p.y1 + 4, 4, p.y2 - p.y1 - 8);
        }
      }
      if (p.ad.startsWith('şerefe') && !bolge) {
        ctx.fillStyle = 'rgba(70,60,45,0.25)';
        ctx.fillRect(x1, p.noktalar[2][1] - 3, x2 - x1, 3);
      }
    }
    for (const p of S.minarePencereleri) doldur(S.kemerYolu(p.x, p.y, p.w, p.h), bolge ? B.pencere : R.pencereTas);

    // kaide
    const K = S.kaide;
    doldur(S.yol(dikdortgen(K.x1, K.y1, K.x2, K.y2), true), bolge ? B.kaide : yatayDegrade(K.x1, K.x2, [[0, R.tasGolge], [0.5, R.tas], [1, R.tasAcik]]));
    doldur(S.yol(dikdortgen(K.kornis.x1, K.kornis.y1, K.kornis.x2, K.kornis.y2), true), bolge ? B.kaide : R.tasAcik);
    if (!bolge) {
      ctx.fillStyle = 'rgba(120,105,80,0.35)';
      ctx.fillRect(K.x1, K.y1, K.x2 - K.x1, 4);
    }
    for (const p of K.pencereler) doldur(S.kemerYolu(p.x, p.y, p.w, p.h), bolge ? B.pencere : R.pencereTas);

    // kasnak (alttan üste)
    for (let k = 1; k >= 0; k--) {
      const q = S.kasnak[k];
      doldur(
        S.yol(dikdortgen(q.x1, q.y1, q.x2, q.y2), true),
        bolge ? B.kasnak : yatayDegrade(q.x1, q.x2, [[0, R.kubbeKoyu], [0.45, R.kasnak], [0.78, R.kubbeAcik], [1, R.kasnak]])
      );
      if (!bolge) {
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        ctx.fillRect(q.x1, q.y1, q.x2 - q.x1, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.fillRect(q.x1, q.y2 - 3, q.x2 - q.x1, 3);
      }
      for (const p of S.kasnakPencereleri(k)) doldur(S.kemerYolu(p.x, p.y, p.w, p.h), bolge ? B.pencere : R.pencere);
    }

    // kubbe
    if (bolge) {
      doldur(S.kubbeYolu, B.kubbe);
    } else {
      const g = ctx.createRadialGradient(640, 370, 10, 600, 420, 330);
      g.addColorStop(0, R.kubbeAcik);
      g.addColorStop(0.45, R.kubbe);
      g.addColorStop(1, R.kubbeKoyu);
      doldur(S.kubbeYolu, g);
      ctx.save();
      ctx.clip(yol(S.kubbeYolu));
      for (const k of S.kaburgalar(16)) {
        const d = yol(S.yol(k.noktalar));
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(10,40,15,0.35)';
        ctx.stroke(d);
        ctx.save();
        ctx.translate(1.8, 0);
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = 'rgba(200,255,200,0.22)';
        ctx.stroke(d);
        ctx.restore();
      }
      ctx.restore();
    }
    alemCiz(ctx, S.alemParcalari(560, 300, 1), bolge);

    // bitkiler
    if (o.cicek !== false) {
      ctx.lineCap = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = bolge ? B.sap : R.sap;
      for (const s of S.bitki.saplar) ctx.stroke(yol(S.yol(s)));
      for (const y of S.bitki.yapraklar) {
        doldur(S.yaprakYolu(y), bolge ? B.yaprak : y.uzunluk > 50 ? R.yaprakKoyu : R.yaprak);
        if (!bolge) {
          const [a, b] = S.yaprakDamari(y);
          ctx.strokeStyle = 'rgba(220,240,200,0.45)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(a[0], a[1]);
          ctx.lineTo(b[0], b[1]);
          ctx.stroke();
        }
      }
      for (const t of S.bitki.tomurcuklar) doldur(S.tomurcukYolu(t), bolge ? B.cicek : R.cicekKenar);
      for (const c of S.bitki.cicekler) {
        for (const e of S.tacYapraklari(c)) {
          if (bolge) doldur(elipsYolu(e), B.cicek);
          else {
            const g = ctx.createRadialGradient(c.x, c.y, c.r * 0.1, c.x, c.y, c.r * 1.05);
            g.addColorStop(0, R.cicekKenar);
            g.addColorStop(0.45, R.cicek);
            g.addColorStop(1, '#F7EEF0');
            doldur(elipsYolu(e), g);
            ctx.strokeStyle = 'rgba(180,150,160,0.35)';
            ctx.lineWidth = 1;
            ctx.stroke(yol(elipsYolu(e)));
          }
        }
        doldur(daireYolu(c.x, c.y, c.r * 0.18), bolge ? B.cicekOrta : R.cicekOrta);
        if (!bolge) {
          ctx.fillStyle = '#C98F22';
          for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(c.x + Math.cos(a) * c.r * 0.26, c.y + Math.sin(a) * c.r * 0.26, Math.max(1.2, c.r * 0.035), 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();

    function alemCiz(ctx, a, bolge) {
      const altin = (x1, x2) => (bolge ? B.altin : yatayDegrade(x1, x2, [[0, R.altinKoyu], [0.55, R.altin], [0.8, R.altinAcik], [1, R.altin]]));
      const ys = alemYollari(a);
      ys.forEach((d, i) => {
        let x1 = a.yaka.cx - a.yaka.rx;
        let x2 = a.yaka.cx + a.yaka.rx;
        if (i >= 2 && i <= 4) {
          const k = a.kureler[i - 2];
          x1 = k.cx - k.r;
          x2 = k.cx + k.r;
        } else if (i === 5) {
          x1 = a.hilal.cx - a.hilal.R;
          x2 = a.hilal.cx + a.hilal.R;
        }
        doldur(d, altin(x1, x2));
      });
    }
  };

  /** Bölge haritası tuvali + piksel başına bölge sorgusu. */
  S.bolgeHaritasi = function () {
    const c = S.yeniTuval();
    const ctx = c.getContext('2d', { willReadFrequently: true });
    S.ciz(ctx, { bolge: true });
    const veri = ctx.getImageData(0, 0, S.W, S.H).data;
    return {
      tuval: c,
      veri,
      bolge(x, y) {
        x = Math.max(0, Math.min(S.W - 1, Math.round(x)));
        y = Math.max(0, Math.min(S.H - 1, Math.round(y)));
        const i = (y * S.W + x) * 4;
        return S.bolgeAdi(veri[i], veri[i + 1], veri[i + 2]);
      },
    };
  };

  /** Doğal renkli başvuru çiziminin piksel verisi + renk örnekleme. */
  S.renkHaritasi = function (o) {
    const c = S.yeniTuval();
    const ctx = c.getContext('2d', { willReadFrequently: true });
    S.ciz(ctx, o);
    const veri = ctx.getImageData(0, 0, S.W, S.H).data;
    return {
      tuval: c,
      veri,
      renk(x, y) {
        x = Math.max(0, Math.min(S.W - 1, Math.round(x)));
        y = Math.max(0, Math.min(S.H - 1, Math.round(y)));
        const i = (y * S.W + x) * 4;
        return [veri[i], veri[i + 1], veri[i + 2], veri[i + 3]];
      },
    };
  };

  window.SAHNE = S;
})();
