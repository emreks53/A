// s02 yardımcıları: göğe yükselen krem taş merdiven (iki kanatlı, ortada sahanlık), altın konturlu sivri kemer
// (makam), bulut denizi, ölçeklenebilir nur küresi, merdiven çıkan adamın ters kinematiği (ayak basamağa basar,
// kayma yok), merkezden dışa çizilen marifet deseni ve altın-krem ışık zemini. Motor dosyalarına dokunmaz.
import { tuval, rng, clamp, lerp, ease, TAU, rgba, smooth, W, H, gurultu2 } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, tara, TON, PALET, FILM, darbe } from '../motor/kalem.mjs';
import { svg, elips, cokgen, path2d, yolCiz, yenidenOrnekle } from '../motor/sekil.mjs';
import * as M from '../motor/motifler.mjs';

// ================================================================ dünya geometrisi
export const S = 0.62; // adamın ölçeği (boy ~238 px)
export const LEG = 184 * S; // kalça ekleminden ayak bileğine
export const ANK = 11 * S; // ayak bileği (insanYan 'bil' noktası) ile taban arası

const R = 40, D = 50, N = 7; // basamak yüksekliği, derinliği, kanat başına basamak
const Yp = 760; // sahanlık üstü
const Px0 = 560; // sahanlığın sol kenarı (sol kanadın tepesi)
const Y = (k) => Yp + (N + 1 - k) * R; // k. seviyenin yüzeyi (0: alt sahanlık, N+1: üst sahanlık)
const T = (k) => Px0 - (N + 1 - k) * D; // k. basamağın basış yüzeyinin sol kenarı
const F = (k) => T(k) + 15; // k. basamakta ayak bileğinin x'i
const FA = 660, FB = 650; // üst sahanlıkta son duruş (yakın ayak A, uzak ayak B)
const Ax = 655; // adamın son duruşu = kemer ve nur ekseni
const Px1 = 2 * Ax - Px0;

export const G = {
  R, D, N, Yp, Px0, Px1, Ax, Y, T, F,
  XL: -120, // sol alt sahanlığın (bulutlara gömülen) ucu
  NUR: { x: Ax, y: 418, r: 56 }, // nur küresinin dünya yeri
  KEMER: { w: 192, h: 330, k: 165, kal: 21 }, // dış en, düz gövde boyu, sivri kısım boyu, ayak kalınlığı
};
G.XR = 2 * Ax - G.XL;

/** Sol kanatta x noktasındaki yürüme yüzeyi (y) */
export function yuzey(x) {
  if (x >= Px0 && x <= Px1) return Yp;
  if (x > Px1) return yuzey(2 * Ax - x);
  if (x < T(1)) return Y(0);
  const k = Math.min(N, Math.floor((x - T(1)) / D) + 1);
  return Y(k);
}

// fener (ışık) yerleri: her basamağın yan yüzünde, basış kenarının hemen altında
export const FENERLER = Array.from({ length: N }, (_, i) => {
  const k = i + 1;
  return { k, x: T(k) + D * 0.5, y: Y(k) + R * 0.46 };
});

// ================================================================ merdiven yapısı (tek sprite)
const SICAK = { arka: '#EFE5CF', tara: [[0, '#EADFC6'], [0.45, '#D6C6A8'], [1, '#A39581']], kontur: '#8A7964' };
const KALINLIK = 78; // kanat (kiriş) kalınlığı, dikey

function yapiSekli() {
  const k = KALINLIK;
  const ust = [];
  ust.push([G.XL, Y(0)]);
  for (let i = 1; i <= N; i++) { ust.push([T(i), Y(i - 1)]); ust.push([T(i), Y(i)]); }
  ust.push([Px0, Y(N)]); ust.push([Px0, Yp]);
  // sağ kanat (ayna)
  const sag = ust.map(([x, y]) => [2 * Ax - x, y]).reverse();
  const tepe = [...ust, ...sag];
  // alt: kanat altları iç köşe çizgisine paralel; sahanlık altında yumuşak bir omurga ve sarkıt
  const egim = R / D;
  const altSol = (x) => Y(0) + k - Math.max(0, x - T(1)) * egim;
  const omurgaY = Yp + 92;
  const xm = T(1) + (Y(0) + k - omurgaY) / egim; // sol kanat altı omurgaya burada değer
  const d = [];
  d.push(`M${G.XR} ${Y(0)}`);
  // tepe zinciri sağdan sola değil: önce tepe soldan sağa çizildi, burada sağ uçtan aşağı iniyoruz
  const alt = [];
  alt.push([G.XR, Y(0) + k]);
  alt.push([2 * Ax - T(1), Y(0) + k]);
  // sağ kanat altı → omurga (yumuşak geçiş)
  const xmR = 2 * Ax - xm;
  const egri = (x0, y0, x1, y1, cx, cy, n = 14) => {
    for (let i = 1; i <= n; i++) {
      const u = i / n, v = 1 - u;
      alt.push([v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1]);
    }
  };
  const gir = 46; // geçiş uzunluğu
  alt.push([xmR + gir, omurgaY + gir * egim]);
  egri(xmR + gir, omurgaY + gir * egim, xmR - gir * 0.6, omurgaY + 2, xmR, omurgaY);
  // sarkıt: ortada aşağı doğru sivri, yumuşak bir damla
  const sw = 58;
  alt.push([Ax + sw, omurgaY + 2]);
  egri(Ax + sw, omurgaY + 2, Ax, omurgaY + 66, Ax + sw * 0.25, omurgaY + 8, 16);
  egri(Ax, omurgaY + 66, Ax - sw, omurgaY + 2, Ax - sw * 0.25, omurgaY + 8, 16);
  alt.push([xm + gir * 0.6, omurgaY + 2]);
  egri(xm + gir * 0.6, omurgaY + 2, xm - gir, omurgaY + gir * egim, xm, omurgaY);
  alt.push([T(1), Y(0) + k]);
  alt.push([G.XL, Y(0) + k]);
  void altSol; void d;
  return { pts: [...tepe, ...alt], omurgaY };
}

export function yapiOge(olcek = 1.4) {
  const { pts, omurgaY } = yapiSekli();
  const sekil = [{ pts, kapali: true }];
  const n = gurultu2(41);
  const ton = (x, y) => {
    const ust = yuzey(x < Px0 || x > Px1 ? x : x);
    const derin = clamp((y - ust) / 118);
    let v = 0.1 + 0.62 * Math.pow(derin, 0.9);
    // sahanlık gövdesi biraz daha aydınlık (nur yukarıda)
    if (x > Px0 - 30 && x < Px1 + 30) v -= 0.07 * (1 - clamp((y - Yp) / 140));
    return clamp(v + 0.07 * n.fbm(x * 0.012, y * 0.012, 3));
  };
  return oge({
    ad: 's02-yapi', olcek, sekil, arka: SICAK.arka, arkaAlfa: 0.8, arkaBulanik: 6,
    tarama: [
      { ton, renkler: SICAK.tara, yon: -0.12, aralik: 3.2, boy: [26, 80], kal: 1.15, alfa: 0.48, esikler: [0.2, 0.46, 0.7] },
    ],
    kontur: SICAK.kontur, konturKal: 2.3, titreme: 0.45,
    detay: (ctx, api) => {
      // basamak burunlarının altında ince gölge şeridi (kısa tarama)
      for (let i = 1; i <= N; i++) {
        for (const ayna of [false, true]) {
          const x0 = T(i), x1 = T(i) + D;
          const p = [[x0, Y(i) + 2], [x1, Y(i) + 2], [x1, Y(i) + 9], [x0, Y(i) + 7]].map(([x, y]) => (ayna ? [2 * Ax - x, y] : [x, y]));
          api.tara(cokgen(p), { ton: () => 0.6, renkler: SICAK.tara, yon: ayna ? Math.PI - 0.1 : 0.1, aralik: 2.4, boy: [10, 30], esikler: [0.3], alfa: 0.3 });
        }
      }
      // altın kakma çizgisi: kiriş boyunca, basamak çizgisine paralel
      const kakma = kakmaYolu();
      api.cizgi(kakma, { renk: M.ALTIN_KOYU, kal: 1.6, alfa: 0.72, titreme: 0.3 });
      api.cizgi(kakma.map(([x, y]) => [2 * Ax - x, y]), { renk: M.ALTIN_KOYU, kal: 1.6, alfa: 0.72, titreme: 0.3 });
      // sahanlık yüzünde ince çift altın çizgi ve ortada küçük gül pencere
      api.cizgi([[Px0 + 6, Yp + 16], [Px1 - 6, Yp + 16]], { renk: M.ALTIN_KOYU, kal: 1.4, alfa: 0.7 });
      api.cizgi([[Px0 + 26, omurgaY - 6], [Px1 - 26, omurgaY - 6]], { renk: M.ALTIN_KOYU, kal: 1.3, alfa: 0.55 });
      const rc = 15, ry = Yp + 50;
      api.dolgu(elips(Ax, ry, rc, rc), '#F6E6B8', 0.55);
      api.halka(elips(Ax, ry, rc, rc)[0].pts, { renk: M.ALTIN_KOYU, kal: 1.6, alfa: 0.85 });
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * TAU;
        api.cizgi([[Ax + Math.cos(a) * 4, ry + Math.sin(a) * 4], [Ax + Math.cos(a) * (rc - 3), ry + Math.sin(a) * (rc - 3)]], { renk: M.ALTIN_KOYU, kal: 1.1, alfa: 0.65 });
      }
      // sarkıtın ucunda küçük altın damla
      api.dolgu(elips(Ax, omurgaY + 70, 5, 6), '#E7C565', 0.9);
      api.halka(elips(Ax, omurgaY + 70, 5, 6)[0].pts, { renk: M.ALTIN_KOYU, kal: 1.3 });
      // söner fenerler (yuva): küçük kakma halkalar
      for (const f of FENERLER) {
        for (const x of [f.x, 2 * Ax - f.x]) {
          api.dolgu(elips(x, f.y, 6.5, 6.5), '#F3EAD6', 0.9);
          api.halka(elips(x, f.y, 6.5, 6.5)[0].pts, { renk: '#9C8250', kal: 1.3, alfa: 0.8 });
        }
      }
    },
  });
}

/** Sol kanadın altın kakma yolu (alttan üste) */
export function kakmaYolu() {
  const ofs = 40;
  const pts = [[G.XL + 30, Y(0) + ofs - 22]];
  pts.push([T(1) - 18, Y(0) + ofs - 22]);
  // basamak iç köşe çizgisine paralel, aşağıda
  const egim = R / D;
  const x1 = Px0 - 4;
  pts.push([T(1) + 4, Y(0) + ofs - 22 - 4 * egim + 6]);
  pts.push([x1, Y(0) + ofs - (x1 - T(1)) * egim]);
  return yenidenOrnekle(pts, 3, false);
}

// ================================================================ kemer (makam)
/** Sivri kemer yolu: taban ortası (cx, y), en w, düz gövde h, sivri kısım k. Sol tabandan saat yönünde. */
function kemerYolu(cx, y, w, h, k) {
  const x = cx - w / 2, r = w / 2;
  return svg(`M${x} ${y}V${y - h}C${x} ${y - h - k * 0.58} ${x + r * 0.5} ${y - h - k * 0.9} ${x + r} ${y - h - k}C${x + r * 1.5} ${y - h - k * 0.9} ${x + w} ${y - h - k * 0.58} ${x + w} ${y - h}V${y}`, 2)[0].pts;
}
export function kemerGeo() {
  const { w, h, k, kal } = G.KEMER;
  const dis = kemerYolu(Ax, Yp, w, h, k);
  const ic = kemerYolu(Ax, Yp, w - 2 * kal, h, k - kal * 0.95);
  const ic2 = kemerYolu(Ax, Yp, w - 2 * kal + 8, h, k - kal * 0.95 + 4); // içteki ince ikinci çizgi
  return { dis, ic, ic2 };
}
/** Kemerin taş çerçevesi (kontursuz; kontur canlı çizilir) */
export function kemerOge(olcek = 1.4) {
  const { dis, ic } = kemerGeo();
  const cerceve = [{ pts: [...dis, ...ic.slice().reverse()], kapali: true }];
  return oge({
    ad: 's02-kemer', olcek, sekil: cerceve, arka: '#F4ECD8', arkaAlfa: 0.75, arkaBulanik: 4,
    tarama: { ton: TON.gurultulu(TON.dogrusal(Ax - 90, 0, Ax + 90, 0, 0.55, 0.25), 0.1, 0.03, 7), renkler: [[0, '#F1E3BC'], [0.6, '#DCC48D'], [1, '#B9974F']], yon: -Math.PI / 2 + 0.08, aralik: 2.8, boy: [14, 40], kal: 1.1, alfa: 0.45, esikler: [0.3, 0.6] },
    kontur: null, pay: 16,
    detay: (ctx, api) => {
      // ayak kaideleri ve başlık bilezikleri
      const { w, h, kal } = G.KEMER;
      for (const s of [-1, 1]) {
        const x0 = Ax + s * (w / 2 - kal / 2);
        api.cizgi([[x0 - kal / 2 - 3, Yp - 14], [x0 + kal / 2 + 3, Yp - 14]], { renk: M.ALTIN_KOYU, kal: 1.4, alfa: 0.8 });
        api.cizgi([[x0 - kal / 2 - 2, Yp - h + 10], [x0 + kal / 2 + 2, Yp - h + 10]], { renk: M.ALTIN_KOYU, kal: 1.4, alfa: 0.8 });
      }
    },
  });
}

// ================================================================ bulut denizi
const BULUT_RENK = {
  arka: { arka: '#DCD7EC', tara: [[0, '#D4CEE8'], [0.6, '#B4B4DD'], [1, '#8E93C8']], alfa: 0.4, esik: [0.12, 0.42, 0.7] },
  orta: { arka: '#E7E3F2', tara: [[0, PALET.lila], [1, PALET.lilaMavi]], alfa: 0.36, esik: [0.25, 0.55] },
  on: { arka: null, tara: [[0, PALET.lila], [1, PALET.lilaMavi]], alfa: 0.32, esik: [0.3, 0.6] },
};
/** Bulut denizi: üst kenarı kabarık, (0,0) sol üst; ust(x) kenar yüksekliği. kenarY(x) ile çağıran tarafa döner */
export function bulutDenizi({ w, h, tohum, tur = 'orta', olcek = 1, ad, rMin = 50, rMax = 120, genlik = 50, kase = 0 }) {
  const r = rng(tohum);
  const puflar = [];
  let x = -rMax;
  while (x < w + rMax) {
    const Rr = r.ara(rMin, rMax);
    const u = clamp(x / w);
    const kaseY = kase * (1 - Math.pow(Math.sin(u * Math.PI), 1.4)); // kenarlar yukarıda (kase: uçlar ne kadar yüksek)
    puflar.push({ cx: x + Rr * 0.7, cy: Rr * 0.75 + r.ara(0, genlik) + kase - kaseY, R: Rr });
    x += Rr * r.ara(1.0, 1.45);
  }
  const kenar = (px) => {
    let m = Infinity;
    for (const p of puflar) {
      const dx = px - p.cx;
      if (Math.abs(dx) < p.R) m = Math.min(m, p.cy - Math.sqrt(p.R * p.R - dx * dx));
    }
    return m === Infinity ? genlik + rMax : m;
  };
  const pts = [];
  for (let px = 0; px <= w; px += 4) pts.push([px, kenar(px)]);
  pts.push([w, h], [0, h]);
  const P = BULUT_RENK[tur];
  const n = gurultu2(tohum + 5);
  const ton = (px, py) => {
    // pufun altına doğru koyulaşır; her pufun alt yarısında ayrıca hafif gölge
    const e = kenar(px);
    let v = clamp((py - e - 16) / 150) * 0.75;
    for (const p of puflar) {
      const dx = px - p.cx, dy = py - p.cy;
      const d = Math.hypot(dx, dy) / p.R;
      if (d < 1 && dy > 0) v = Math.max(v, 0.32 * (dy / p.R) * (1 - d * 0.4));
    }
    return clamp(v + 0.08 * n.fbm(px * 0.01, py * 0.01, 3));
  };
  const o = oge({
    ad: ad || `s02-bulutd-${w}-${h}-${tohum}-${tur}`, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.55, arkaBulanik: 10, arkaTasma: false,
    tarama: { ton, renkler: P.tara, yon: -0.157, aralik: 3.5, boy: [40, 130], kal: 1.2, alfa: P.alfa, esikler: P.esik, esikYay: 0.12, yumusak: 0.22 },
    kontur: null,
    detay: (ctx, api) => {
      // pufların arasında çok ince lila hatlar (yalnız üstteki birkaç puf)
      for (const p of puflar) {
        if (p.cx < 0 || p.cx > w) continue;
        const pts2 = [];
        for (let a = Math.PI * 1.08; a <= Math.PI * 1.62; a += 0.05) pts2.push([p.cx + Math.cos(a) * p.R * 0.96, p.cy + Math.sin(a) * p.R * 0.96 + p.R * 0.5]);
        if (pts2.length > 2) api.cizgi(pts2, { renk: '#A9A6D2', kal: 1.2, alfa: 0.25 });
      }
    },
  });
  return { oge: o, kenar };
}

// ================================================================ nur küresi (ölçeklenebilir, kontur canlı)
let nurIc = null, nurHale = null;
const NB = 120; // taban yarıçap
export function nurHazirla() {
  nurIc = oge({
    ad: 's02-nur-ic', olcek: 1.3, sekil: elips(0, 0, NB, NB), arka: '#FFF1C9', arkaAlfa: 0.55, arkaBulanik: NB * 0.25, arkaTasma: false,
    tarama: { ton: TON.radyal(0, 0, NB, 0, 0.9), renkler: [[0, '#F8E7A8'], [1, '#E7C565']], yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 3.2, boy: [10, 26], kal: 1.1, alfa: 0.45, esikler: [0.45, 0.75] },
    kontur: null,
  });
  nurHale = M.nurAura(NB, 1.1);
}
/** Nur küresi: (x, y) ekran/dünya merkezi, r yarıçap; kontur ve ışınlar her ölçekte keskin */
export function nurCiz(ctx, x, y, r, t, { guc = 1, alfa = 1, isin = 1, kontur = 1 } = {}) {
  if (alfa <= 0.002 || r < 0.5) return;
  ctx.save();
  ctx.globalAlpha *= alfa;
  const nefes = 1 + 0.018 * Math.sin(t * 2.1);
  M.hale(ctx, x, y, r * 4.6 * (0.8 + 0.2 * guc), '#FFF0B8', 0.42 * guc);
  M.hale(ctx, x, y, r * 2.1, '#FFFBEA', 0.6 * guc);
  ogeCiz(ctx, nurHale, x, y, { s: (r / NB) * nefes * (0.92 + 0.08 * guc), r: t * 0.04, alfa: 0.85 * guc });
  if (isin > 0) {
    M.isinlar(ctx, x, y, r * 1.25, r * 2.7 * (0.7 + 0.3 * guc), t, { sayi: 26, alfa: 0.45 * guc * isin, kal: clamp(r * 0.02, 1.5, 4), tohum: 7 });
    M.isinlar(ctx, x, y, r * 1.2, r * 1.9 * (0.7 + 0.3 * guc), -t * 0.6, { sayi: 18, renk: '#EBC867', alfa: 0.35 * guc * isin, kal: clamp(r * 0.015, 1.2, 3), tohum: 11 });
  }
  ogeCiz(ctx, nurIc, x, y, { s: (r / NB) * nefes });
  if (kontur > 0) {
    const pts = elips(x, y, r * nefes, r * nefes, Math.max(48, Math.ceil(r * 0.8)))[0].pts;
    konturCiz(ctx, pts, { renk: M.ALTIN_KOYU, kal: clamp(1.7 + r * 0.004, 1.8, 3.4), alfa: 0.75 * kontur, kapali: true, titreme: 0.45, tohum: 77 });
  }
  M.hale(ctx, x - r * 0.2, y - r * 0.25, r * 0.95, '#FFFFFF', 0.55 * guc);
  ctx.restore();
}

// ================================================================ merdiven çıkan adam (ters kinematik)
const P_ADIM = 0.42; // basamak periyodu
const SW = 0.34; // salınım süresi
const S1 = 8.4; // ilk salınım
const kaydir = (j) => S1 + (j - 1) * P_ADIM;
// salınımlar: f: 1 yakın (ön) ayak, 0 uzak (arka) ayak; x0,k0 → x1,k1; s başlangıç, d süre; th: topuk kalkışı
const SALINIM = [];
SALINIM.push({ f: 1, x0: 180, k0: 0, x1: F(1), k1: 1, s: kaydir(1), d: SW, th: 0.3, lift: 14 });
SALINIM.push({ f: 0, x0: 170, k0: 0, x1: F(2), k1: 2, s: kaydir(2), d: SW, th: 0.4, lift: 22 });
for (let j = 3; j <= N; j++) SALINIM.push({ f: j % 2, x0: F(j - 2), k0: j - 2, x1: F(j), k1: j, s: kaydir(j), d: SW, th: 0.42, lift: 22 });
SALINIM.push({ f: 0, x0: F(N - 1), k0: N - 1, x1: F(N + 1), k1: N + 1, s: kaydir(N + 1), d: SW, th: 0.42, lift: 22 });
SALINIM.push({ f: 1, x0: F(N), k0: N, x1: FA, k1: N + 1, s: kaydir(N + 1) + SW + 0.1, d: 0.38, th: 0.38, lift: 18 });
SALINIM.push({ f: 0, x0: F(N + 1), k0: N + 1, x1: FB, k1: N + 1, s: kaydir(N + 1) + SW + 0.1 + 0.46, d: 0.3, th: 0.22, lift: 7 });
const HR = 0.12; // topuk kalkışı penceresi
export const ADAM = {
  gorun: 8.16, // belirme
  inis: SALINIM.map((s) => s.s + s.d), // ayak basma anları
  basamakInis: [], // k. basamağa ilk basış zamanı
  dur: 0,
};
for (const s of SALINIM) if (ADAM.basamakInis[s.k1] === undefined) ADAM.basamakInis[s.k1] = s.s + s.d;
ADAM.dur = SALINIM[SALINIM.length - 1].s + SALINIM[SALINIM.length - 1].d;

// kalça anahtarları (dünya px): basma anlarında arka ayak üzerinden hesaplanır
const ETA = 0.96, BETA = 0.45;
const hYuk = Math.sqrt((ETA * LEG) ** 2 - (BETA * D) ** 2);
const KALCA = [];
KALCA.push({ t: 7.0, x: 176, y: Y(0) - ANK - 0.99 * LEG });
KALCA.push({ t: 8.12, x: 176, y: Y(0) - ANK - 0.99 * LEG });
KALCA.push({ t: S1 - 0.06, x: 178, y: Y(0) - ANK - 0.965 * LEG });
KALCA.push({ t: SALINIM[0].s + SW, x: 170 + BETA * D, y: Y(0) - ANK - hYuk });
for (let j = 2; j <= N + 1; j++) KALCA.push({ t: SALINIM[j - 1].s + SW, x: F(j - 1) + BETA * D, y: Y(j - 1) - ANK - hYuk });
{
  const s9 = SALINIM[N + 1], s10 = SALINIM[N + 2];
  KALCA.push({ t: s9.s + s9.d, x: F(N + 1) + 0.45 * (FA - F(N + 1)), y: Yp - ANK - 100 });
  KALCA.push({ t: s10.s + s10.d, x: (FA + FB) / 2 + 0.5, y: Yp - ANK - 0.972 * LEG });
  KALCA.push({ t: s10.s + s10.d + 0.38, x: Ax, y: Yp - ANK - 0.99 * LEG });
  KALCA.push({ t: 30, x: Ax, y: Yp - ANK - 0.99 * LEG });
}
// Catmull-Rom (zaman düğümlü) Hermite
const egimler = KALCA.map((k, i) => {
  if (i === 0 || i === KALCA.length - 1) return { x: 0, y: 0 };
  const a = KALCA[i - 1], b = KALCA[i + 1];
  return { x: (b.x - a.x) / (b.t - a.t), y: (b.y - a.y) / (b.t - a.t) };
});
// anahtar 1-2 (bekleme) ve sondaki duruş: teğet sıfır
egimler[1] = { x: 0, y: 0 };
egimler[KALCA.length - 2] = { x: 0, y: 0 };
export function kalcaTaban(t) {
  if (t <= KALCA[0].t) return { x: KALCA[0].x, y: KALCA[0].y };
  for (let i = 1; i < KALCA.length; i++) {
    const a = KALCA[i - 1], b = KALCA[i];
    if (t <= b.t) {
      const h = b.t - a.t, u = (t - a.t) / h;
      const u2 = u * u, u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
      const ma = egimler[i - 1], mb = egimler[i];
      return { x: h00 * a.x + h10 * h * ma.x + h01 * b.x + h11 * h * mb.x, y: h00 * a.y + h10 * h * ma.y + h01 * b.y + h11 * h * mb.y };
    }
  }
  const z = KALCA[KALCA.length - 1];
  return { x: z.x, y: z.y };
}
function kalca(t) {
  const b = kalcaTaban(t);
  // basamaklarda duruş ortasında hafif yükselme
  const L = ADAM.inis;
  for (let j = 0; j < N; j++) {
    if (t > L[j] && t < L[j + 1]) {
      const u = (t - L[j]) / (L[j + 1] - L[j]);
      b.y -= 2.4 * Math.sin(Math.PI * u);
      break;
    }
  }
  return b;
}

// ayak tabanı noktaları (ayak sprite'ının yerel koordinatı; çizim noktası bil - (0,2))
const TABAN = [[-13, 12], [8, 13], [33, 12.5], [39, 8]];
const UC = [31, 13]; // topuk kalkarken dönülen burun noktası
const rotP = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
/** Topuğu θ kadar kalkmış ayağın 'bil' noktası (dünya) */
function topukKalkik(x, k, th) {
  const toe = [x + UC[0] * S, Y(k) - 13 * S + UC[1] * S];
  const q = rotP(UC, th);
  return [toe[0] - q[0] * S, toe[1] - q[1] * S + 2 * S];
}
/** t anında f ayağının durumu: { x, y (bil noktası), a3 (ayak açısı; + burun yukarı) } */
export function ayak(f, t) {
  const liste = SALINIM.filter((s) => s.f === f);
  let x = f === 1 ? 180 : 170, k = 0;
  for (const s of liste) {
    if (t < s.s - HR) break;
    if (t < s.s) {
      const th = s.th * ease.inOutSine((t - (s.s - HR)) / HR);
      const [bx, by] = topukKalkik(s.x0, s.k0, th);
      return { x: bx, y: by, a3: -th };
    }
    if (t < s.s + s.d) {
      const u = (t - s.s) / s.d;
      const [xs, ys] = topukKalkik(s.x0, s.k0, s.th);
      const xe = s.x1, ye = Y(s.k1) - ANK;
      const ex = ease.inOutCubic(u);
      const ey = 1 - Math.pow(1 - u, 2.2);
      const bx = lerp(xs, xe, ex);
      const by = lerp(ys, ye, ey) - s.lift * Math.sin(Math.PI * u);
      const a3 = u < 0.45 ? lerp(-s.th, 0.12, ease.inOutSine(u / 0.45)) : lerp(0.12, 0, ease.inOutSine((u - 0.45) / 0.55));
      return { x: bx, y: by, a3 };
    }
    x = s.x1; k = s.k1;
  }
  return { x, y: Y(k) - ANK, a3: 0 };
}
/** Ayağın taban noktaları (dünya), denetim için */
export function ayakTabani(f, t) {
  const a = ayak(f, t);
  const r = -a.a3;
  return TABAN.map((p) => { const q = rotP(p, r); return [a.x + q[0] * S, a.y - 2 * S + q[1] * S]; });
}
const L1 = 92;
function ik(hx, hy, ax, ay) {
  const dx = ax - hx, dy = ay - hy;
  const d0 = Math.hypot(dx, dy);
  const d = Math.min(d0, 2 * L1 * 0.9995);
  const adir = Math.atan2(dx, dy);
  const al = Math.acos(clamp(d / (2 * L1), -1, 1));
  const a1 = adir + al, a2 = adir - al;
  return { a1, a2, oran: d0 / (2 * L1) };
}
const zamanEgri = (t, noktalar) => {
  // [[t, v], ...] arası yumuşak geçiş
  if (t <= noktalar[0][0]) return noktalar[0][1];
  for (let i = 1; i < noktalar.length; i++) {
    if (t <= noktalar[i][0]) return lerp(noktalar[i - 1][1], noktalar[i][1], ease.inOutSine((t - noktalar[i - 1][0]) / (noktalar[i][0] - noktalar[i - 1][0])));
  }
  return noktalar[noktalar.length - 1][1];
};
/** t anında adamın çizim parametreleri: insanYan(ctx, x, y, poz, { s: S }) */
export function adamDurum(t) {
  const h = kalca(t);
  const ox = h.x, oy = h.y + 196 * S; // figür kökü (kalça yerelde (0,-196))
  const kx = [-3, 3];
  const poz = { serbest: true, zipla: 0, kalca: [0, 0], diz: [0, 0], bilek: [0, 0] };
  let maxOran = 0;
  const ayaklar = [ayak(0, t), ayak(1, t)];
  for (let i = 0; i < 2; i++) {
    const a = ayaklar[i];
    const axl = (a.x - ox) / S, ayl = (a.y - oy) / S;
    const s = ik(kx[i], -196, axl, ayl);
    poz.kalca[i] = s.a1;
    poz.diz[i] = s.a2 - s.a1;
    poz.bilek[i] = a.a3 - s.a2;
    maxOran = Math.max(maxOran, s.oran);
  }
  // kollar: bacak ayrıklığına karşı salınır
  const yuru = zamanEgri(t, [[8.25, 0], [8.55, 1], [12.3, 1], [12.75, 0]]);
  const ayr = clamp((ayaklar[1].x - ayaklar[0].x) / (2.2 * D), -1, 1);
  const kolOn = lerp(0.06, 0.05 - 0.34 * ayr, yuru), kolArka = lerp(-0.05, 0.02 + 0.34 * ayr, yuru);
  poz.omuz = [kolArka, kolOn];
  poz.dirsek = [lerp(0.12, 0.22 + 0.3 * Math.max(0, kolArka), yuru), lerp(0.16, 0.22 + 0.3 * Math.max(0, kolOn), yuru)];
  const nefes = 0.006 * Math.sin(t * 2.2);
  poz.govde = zamanEgri(t, [[8.2, 0.0], [8.5, 0.13], [11.7, 0.13], [12.25, 0.05], [12.7, 0.0]]) + nefes;
  poz.bas = zamanEgri(t, [[8.3, 0], [8.6, 0.05], [11.05, 0.05], [11.45, -0.12], [11.95, -0.03], [12.72, -0.03], [13.12, -0.36]]);
  poz.el = [0, 0];
  return { x: ox, y: oy, poz, maxOran, ayaklar };
}

// ================================================================ marifet deseni: merkezden dışa
/**
 * marifetGeometri katmanlarını içten dışa çizer (4: kollar ve merkez, 3: iç yıldız, 2: rozet, 1: kareler, 0: halkalar).
 * Kalınlık, renk ve tohumlar motor/s03 ile aynı (devir anında çizgiler üst üste oturur).
 */
export function desenMerkezden(ctx, x, y, Rr, t, { cizim = 1, dolgu = 0, dolguYari = 1, r = 0, alfa = 1, merkezIsik = 0, kolIsik = -1, dolguOge = null } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.globalAlpha *= alfa;
  if (dolgu > 0 && dolguOge) {
    if (dolguYari >= 0.999) ogeCiz(ctx, dolguOge, 0, 0, { s: Rr / 400, alfa: dolgu });
    else if (dolguYari > 0) {
      // dolgu merkezden yayılır
      ctx.save();
      const rr = Rr * dolguYari;
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, rr));
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.82, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, TAU);
      ctx.clip();
      ogeCiz(ctx, dolguOge, 0, 0, { s: Rr / 400, alfa: dolgu });
      ctx.restore();
    }
  }
  const geo = M.marifetGeometri(Rr);
  geo.forEach((yol, i) => {
    const sira = 4 - yol.katman; // içten dışa
    const u = clamp((cizim - (sira / 5) * 0.72) / 0.32);
    if (u <= 0) return;
    const kal = Math.max(1.6, Rr * (yol.katman === 4 ? 0.006 : 0.009));
    const renk = yol.katman >= 3 ? M.ALTIN_KOYU : '#2F6F67';
    let pts = yol.pts;
    if (!yol.kapali && u < 1) pts = [pts[1], pts[0]]; // kollar merkezden dışa doğru çizilir
    konturCiz(ctx, pts, { renk, kal, alfa: 0.88, kapali: yol.kapali, titreme: 0.4, tohum: 40 + i, cizim: u >= 1 ? 1 : ease.inOutCubic(u) });
  });
  // kollar boyunca merkeze akan ışık (bütün çizgiler merkezdeki noktaya çıkar)
  if (kolIsik >= 0 && kolIsik <= 1) {
    const e = ease.inOutSine(kolIsik);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU + Math.PI / 8;
      const r0 = k % 2 ? Rr * 0.44 : Rr * 0.6;
      const d = lerp(r0 * 1.02, Rr * 0.09, e);
      const gx = Math.cos(a) * d, gy = Math.sin(a) * d;
      const a0 = Math.sin(Math.PI * clamp(kolIsik * 1.15));
      M.hale(ctx, gx, gy, 16, '#FFF6D2', 0.85 * a0);
      M.hale(ctx, gx, gy, 6, '#FFFFFF', 0.9 * a0);
    }
  }
  if (merkezIsik > 0) {
    M.hale(ctx, 0, 0, Rr * 0.22, '#FFFBEA', 0.85 * merkezIsik);
    M.hale(ctx, 0, 0, Rr * 0.08, '#FFFFFF', 0.9 * merkezIsik);
  }
  ctx.restore();
}

// ================================================================ altın-krem ışık zemini (s03 başlangıcıyla aynı)
export function isikZemini() {
  const c = tuval(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(540, 900, 0, 540, 900, 1250);
  g.addColorStop(0, '#FFF9EA');
  g.addColorStop(0.42, '#F9EBC8');
  g.addColorStop(1, '#EFDDB2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  tara(ctx, {
    x0: 0, y0: 0, x1: W, y1: H, yonF: (x, y) => Math.atan2(y - 900, x - 540), aralik: 3.6, boy: [60, 180], kal: 1.15, alfa: 0.2,
    ton: (x, y) => clamp((Math.hypot(x - 540, y - 900) - 260) / 900), renkler: [[0, '#F4E2B0'], [1, '#D9B568']], esikler: [0.2, 0.55], tohum: 31, minUc: 10, incelme: 0.2,
  });
  return c;
}

// ================================================================ küçük yardımcılar
/** Yanan fener: küçük altın ışık (dünya koordinatı) */
export function fenerCiz(ctx, x, y, t, yanma, { tohum = 1, guc = 1 } = {}) {
  if (yanma <= 0) return;
  const p = ease.outBack(clamp(yanma / 0.6), 2.0);
  const titres = 0.92 + 0.08 * Math.sin(t * 7.3 + tohum * 2.1) * Math.sin(t * 3.1 + tohum);
  const parlama = Math.exp(-Math.max(0, yanma - 0.25) * 2.2); // ilk anda parlak, sonra sakin
  M.hale(ctx, x, y, 34 * (0.7 + 0.5 * parlama) * guc, '#FFE9A6', (0.42 + 0.35 * parlama) * titres * clamp(yanma * 3));
  ctx.save();
  ctx.globalAlpha *= clamp(yanma * 4);
  ctx.fillStyle = rgba('#FFF4CF', 0.95);
  ctx.beginPath();
  ctx.arc(x, y, 5.6 * p, 0, TAU);
  ctx.fill();
  konturCiz(ctx, elips(x, y, 6.6 * p, 6.6 * p, 28)[0].pts, { renk: M.ALTIN_KOYU, kal: 1.5, alfa: 0.9, kapali: true, titreme: 0.2, tohum });
  ctx.restore();
  M.hale(ctx, x, y, 9, '#FFFFFF', 0.7 * titres * clamp(yanma * 3));
  if (parlama > 0.05) M.isinlar(ctx, x, y, 9, 22 + 8 * parlama, t, { sayi: 8, alfa: 0.5 * parlama, kal: 1.4, tohum: 5 + tohum, hiz: 0.3 });
}

export { yolCiz, path2d };
