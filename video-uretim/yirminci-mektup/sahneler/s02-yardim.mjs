// s02 yardımcıları: bulut denizinden göğe yükselen krem taş merdiven-köprü (iki kanat, üstte sahanlık, altta sivri
// köprü kemeri), altın konturlu sivri kemer (makam), bulut denizi, ölçeklenebilir nur küresi (s01 ile aynı motif),
// merdiven çıkan adamın ters kinematiği (her adımda ayak basamağa basar, kayma yok), merkezden dışa çizilen marifet
// deseni ve altın-krem ışık zemini (s03 başlangıcıyla aynı). Motor dosyalarına dokunmaz.
import { tuval, rng, clamp, lerp, ease, TAU, rgba, W, H, gurultu2 } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, tara, darbe, TON, PALET, FILM } from '../motor/kalem.mjs';
import { svg, elips, cokgen, yenidenOrnekle } from '../motor/sekil.mjs';
import * as M from '../motor/motifler.mjs';

// ================================================================ dünya geometrisi
export const S = 0.8; // adamın ölçeği (boy ~307 px; basamak yüksekliği bacak boyunun ~%22'si, gerçek merdivene yakın)
export const LEG = 184 * S; // kalça ekleminden ayak bileğine
export const ANK = 11 * S; // ayak bileği ile taban arası

const R = 32, D = 40, N = 9; // basamak yüksekliği, derinliği, sahanlığa kadar kanat başına basamak (dış ölçü: (N+1)·R = 320, (N+1)·D = 400)
const AX = 540, YP = 800, LW = 200; // eksen, sahanlık üstü, sahanlık eni
const PX0 = AX - LW / 2, PX1 = AX + LW / 2;
const KMIN = -10; // bulutların içine inen en alt basamak
const YALT = 1600; // yapının (bulutlara gömülü) alt ucu
const TH = 230; // kanat kalınlığı (basamak burun çizgisinden köprü kemerine yatay uzaklık)
export const Y = (k) => YP + (N + 1 - k) * R; // k. basamağın üst yüzü (N+1: sahanlık)
export const T = (k) => PX0 - (N + 1 - k) * D; // k. basamağın basış yüzünün sol kenarı
export const F = (k) => T(k) + 9; // k. basamakta ayak bileğinin x'i (topuk burunda, parmak ucu bir sonraki rıhtı geçmez)
const ayna = (x) => 2 * AX - x;

export const G = {
  R, D, N, AX, YP, PX0, PX1, Y, T, F,
  NUR: { x: AX, y: 392, r: 56 }, // nur küresinin dünya yeri (kemerin sivri kısmında, adamın başının üstünde)
  KEMER: { w: 200, h: 330, k: 175, kal: 22 }, // dış en, düz gövde boyu, sivri kısım boyu, ayak kalınlığı
  APEX: 880, // köprü kemerinin tepe noktası (sahanlığın altında)
};

/** x noktasındaki yürüme yüzeyi (y) */
export function yuzey(x) {
  if (x > AX) return yuzey(ayna(x));
  if (x >= PX0) return YP;
  const k = Math.floor((x - T(0)) / D);
  return Y(Math.max(KMIN, Math.min(N, k)));
}

// fener yerleri: sol kanatta her basamağın yan yüzünde, basış kenarının altında
export const FENERLER = [];
for (let k = -3; k <= N; k++) FENERLER.push({ k, x: T(k) + D * 0.5, y: Y(k) + R * 0.52 });

// ================================================================ merdiven-köprü (tek sprite)
const TAS = { arka: '#EBDDC0', tara: [[0, '#EADCC1'], [0.45, '#D4BF9B'], [1, '#9A8468']], kontur: '#86735C' };

/** Köprü kemeri: iki merkezli sivri kemer (tepe G.APEX, üzengi YS, yarı açıklık KA), altında dikey ayaklar */
const YS = 1250, KA = 262;
const KH = YS - 880, KC = (KH * KH - KA * KA) / (2 * KA), KRHO = KA + KC;
/** Sol yarıda y yüksekliğinde köprü kemerinin iç hattının x'i */
export function kemerX(y) {
  if (y >= YS) return AX - KA;
  if (y <= 880) return AX;
  return AX + KC - Math.sqrt(KRHO * KRHO - (YS - y) * (YS - y));
}
function intrados() {
  const sol = [[AX - KA, YALT]];
  for (let y = YALT - 20; y > YS; y -= 20) sol.push([AX - KA, y]);
  const ta = Math.atan2(-KH, -KC);
  const n = 70;
  for (let i = 0; i <= n; i++) {
    const th = -Math.PI + (ta + Math.PI) * (i / n);
    sol.push([AX + KC + KRHO * Math.cos(th), YS + KRHO * Math.sin(th)]);
  }
  const sag = sol.map(([x, y]) => [ayna(x), y]).reverse().slice(1);
  return [...sol, ...sag];
}
export const INTRADOS = intrados();

function yapiSekli() {
  const sol = [[T(KMIN), YALT]];
  for (let k = KMIN; k <= N; k++) { sol.push([T(k), Y(k)]); sol.push([T(k + 1), Y(k)]); }
  sol.push([PX0, YP]);
  const sag = sol.map(([x, y]) => [ayna(x), y]).reverse();
  return [...sol, ...sag, ...INTRADOS.slice().reverse()];
}

/** Basamak dizisine paralel altın kakma yolu (sol kanat, aşağıdan yukarı, sahanlık ortasına kadar) */
function kakmaYolu() {
  const ofs = D + 46; // burun çizgisinden yatay uzaklık
  const x = (y) => PX0 - (y - YP) * (D / R) + ofs;
  const yh = YP + 24; // sahanlık yüzündeki yatay çizgi
  return yenidenOrnekle([[x(YALT - 40), YALT - 40], [x(yh), yh], [AX, yh]], 3, false);
}

export function yapiOge(olcek = 1.4) {
  const sekil = [{ pts: yapiSekli(), kapali: true }];
  const n = gurultu2(41);
  const ton = (x, y) => {
    const ust = yuzey(x);
    const derin = clamp((y - ust) / 170);
    let v = 0.1 + 0.52 * Math.pow(derin, 0.8);
    // köprü kemerinin kenarına doğru (alt yüz) koyulaşır
    const xl = x <= AX ? x : ayna(x);
    const kx = kemerX(y);
    if (y > 870) v += 0.22 * clamp(1 - Math.abs(kx - xl) / 85);
    // aşağı indikçe bulut buğusu: ton hafifler
    v -= 0.2 * clamp((y - 1200) / 260);
    return clamp(v + 0.08 * n.fbm(x * 0.012, y * 0.012, 3));
  };
  return oge({
    ad: 's02-kopru', olcek, sekil, arka: TAS.arka, arkaAlfa: 0.8, arkaBulanik: 6,
    tarama: [{ ton, renkler: TAS.tara, yon: -0.12, aralik: 3.1, boy: [26, 80], kal: 1.15, alfa: 0.52, esikler: [0.16, 0.42, 0.68] }],
    kontur: TAS.kontur, konturKal: 2.3, titreme: 0.45,
    detay: (ctx, api) => {
      // basamak burunlarının altında ince gölge şeridi
      for (let k = KMIN + 1; k <= N; k++) {
        for (const ay of [false, true]) {
          const x0 = T(k), x1 = T(k) + D;
          const p = [[x0, Y(k) + 2], [x1, Y(k) + 2], [x1, Y(k) + 9], [x0, Y(k) + 6]].map(([x, y]) => (ay ? [ayna(x), y] : [x, y]));
          api.tara(cokgen(p), { ton: () => 0.6, renkler: TAS.tara, yon: ay ? Math.PI - 0.1 : 0.1, aralik: 2.4, boy: [10, 30], esikler: [0.3], alfa: 0.3 });
        }
      }
      // köprü kemerine paralel altın archivolt çizgisi
      const ic = INTRADOS;
      const ofsYol = (yol, d) => yol.map((p, i) => {
        const a = yol[Math.max(0, i - 1)], b = yol[Math.min(yol.length - 1, i + 1)];
        let tx = b[0] - a[0], ty = b[1] - a[1];
        const tl = Math.hypot(tx, ty) || 1;
        // normal: kemerin dışına (taşın içine) doğru
        return [p[0] + (ty / tl) * d, p[1] - (tx / tl) * d];
      });
      const arc1 = ofsYol(ic, 18).filter(([, y]) => y < YALT - 30);
      api.cizgi(arc1, { renk: M.ALTIN_KOYU, kal: 1.6, alfa: 0.75, titreme: 0.3 });
      // kilit taşı
      const ky = G.APEX;
      const kilit = [[AX - 13, ky - 2], [AX - 17, ky - 40], [AX + 17, ky - 40], [AX + 13, ky - 2]];
      api.tara(cokgen(kilit), { ton: () => 0.55, renkler: [[0, '#EAD9B0'], [1, '#C7A764']], yon: -1.4, aralik: 2.6, boy: [10, 26], esikler: [0.3], alfa: 0.4 });
      api.halka(kilit, { renk: M.ALTIN_KOYU, kal: 1.5, alfa: 0.75, titreme: 0.25 });
      // altın kakma: kanatlar boyunca, sahanlıkta yatay
      const kak = kakmaYolu();
      api.cizgi(kak, { renk: M.ALTIN_KOYU, kal: 1.6, alfa: 0.72, titreme: 0.3 });
      api.cizgi(kak.map(([x, y]) => [ayna(x), y]).reverse(), { renk: M.ALTIN_KOYU, kal: 1.6, alfa: 0.72, titreme: 0.3 });
      // sahanlık yüzünde ince ikinci çizgi
      api.cizgi([[PX0 + 2, YP + 6], [PX1 - 2, YP + 6]], { renk: TAS.kontur, kal: 1.1, alfa: 0.5 });
      // söner fener yuvaları: küçük kakma halkalar (iki kanatta)
      for (const f of FENERLER) {
        for (const x of [f.x, ayna(f.x)]) {
          api.dolgu(elips(x, f.y, 7.5, 7.5), '#F4ECDA', 0.92);
          api.halka(elips(x, f.y, 7.5, 7.5)[0].pts, { renk: '#9C8250', kal: 1.4, alfa: 0.85 });
        }
      }
      // sahanlık ortasında gül pencere yuvası
      const rc = 13, ry = YP + 52;
      api.dolgu(elips(AX, ry, rc, rc), '#F3EAD6', 0.9);
      api.halka(elips(AX, ry, rc, rc)[0].pts, { renk: M.ALTIN_KOYU, kal: 1.5, alfa: 0.85 });
      for (let j = 0; j < 8; j++) {
        const a = (j / 8) * TAU;
        api.cizgi([[AX + Math.cos(a) * 3.5, ry + Math.sin(a) * 3.5], [AX + Math.cos(a) * (rc - 2.5), ry + Math.sin(a) * (rc - 2.5)]], { renk: M.ALTIN_KOYU, kal: 1.0, alfa: 0.6 });
      }
    },
  });
}
export const GUL_PENCERE = { x: AX, y: YP + 52 };

// ================================================================ kemer (makam)
/** Sivri kemer yolu: taban ortası (cx, y), en w, düz gövde h, sivri kısım k. Sol tabandan saat yönünde, açık yol. */
function kemerYolu(cx, y, w, h, k) {
  const x = cx - w / 2, r = w / 2;
  return svg(`M${x} ${y}V${y - h}C${x} ${y - h - k * 0.58} ${x + r * 0.5} ${y - h - k * 0.9} ${x + r} ${y - h - k}C${x + r * 1.5} ${y - h - k * 0.9} ${x + w} ${y - h - k * 0.58} ${x + w} ${y - h}V${y}`, 2)[0].pts;
}
export function kemerGeo() {
  const { w, h, k, kal } = G.KEMER;
  const dis = kemerYolu(AX, YP, w, h, k);
  const ic = kemerYolu(AX, YP, w - 2 * kal, h, k - kal * 0.95);
  const ic2 = kemerYolu(AX, YP, w - 2 * kal + 9, h, k - kal * 0.95 + 4.5);
  return { dis, ic, ic2 };
}
/** Kemerin taş çerçevesi (dış kontur canlı çizilir) */
export function kemerOge(olcek = 2.2) {
  const { dis, ic } = kemerGeo();
  const cerceve = [{ pts: [...dis, ...ic.slice().reverse()], kapali: true }];
  const { w, h, kal } = G.KEMER;
  return oge({
    ad: 's02-kemer', olcek, sekil: cerceve, arka: '#F4EAD2', arkaAlfa: 0.8, arkaBulanik: 4,
    tarama: { ton: TON.gurultulu(TON.dogrusal(AX - 100, 0, AX + 100, 0, 0.62, 0.3), 0.1, 0.03, 7), renkler: [[0, '#F1E3BC'], [0.6, '#DCC48D'], [1, '#B9974F']], yon: -Math.PI / 2 + 0.08, aralik: 2.7, boy: [14, 40], kal: 1.1, alfa: 0.46, esikler: [0.28, 0.58] },
    kontur: null, pay: 16,
    detay: (ctx, api) => {
      for (const s of [-1, 1]) {
        const x0 = AX + s * (w / 2 - kal / 2);
        // kaide ve başlık bilezikleri
        api.cizgi([[x0 - kal / 2 - 3, YP - 16], [x0 + kal / 2 + 3, YP - 16]], { renk: M.ALTIN_KOYU, kal: 1.5, alfa: 0.85 });
        api.cizgi([[x0 - kal / 2 - 3, YP - 22], [x0 + kal / 2 + 3, YP - 22]], { renk: M.ALTIN_KOYU, kal: 1.1, alfa: 0.6 });
        api.cizgi([[x0 - kal / 2 - 3, YP - h + 8], [x0 + kal / 2 + 3, YP - h + 8]], { renk: M.ALTIN_KOYU, kal: 1.5, alfa: 0.85 });
        api.cizgi([[x0 - kal / 2 - 3, YP - h + 14], [x0 + kal / 2 + 3, YP - h + 14]], { renk: M.ALTIN_KOYU, kal: 1.1, alfa: 0.6 });
      }
    },
  });
}

// ================================================================ bulut denizi
const BULUT_RENK = {
  arka: { arka: '#DCD7EC', tara: [[0, '#D4CEE8'], [0.6, '#B4B4DD'], [1, '#8E93C8']], alfa: 0.38, esik: [0.12, 0.42, 0.7] },
  orta: { arka: '#E7E3F2', tara: [[0, PALET.lila], [1, PALET.lilaMavi]], alfa: 0.34, esik: [0.25, 0.55] },
  on: { arka: '#EEEBF6', tara: [[0, PALET.lila], [1, PALET.lilaMavi]], alfa: 0.3, esik: [0.3, 0.6] },
};
/** Bulut denizi: üst kenarı kabarık, (0,0) sol üst. Döner { oge, kenar(x) } */
export function bulutDenizi({ w, h, tohum, tur = 'orta', olcek = 1, ad, rMin = 50, rMax = 120, genlik = 50 }) {
  const r = rng(tohum);
  const puflar = [];
  let x = -rMax;
  while (x < w + rMax) {
    const Rr = r.ara(rMin, rMax);
    puflar.push({ cx: x + Rr * 0.7, cy: Rr * 0.75 + r.ara(0, genlik), R: Rr });
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
    const e = kenar(px);
    let v = clamp((py - e - 16) / 150) * 0.7;
    for (const p of puflar) {
      const dx = px - p.cx, dy = py - p.cy;
      const d = Math.hypot(dx, dy) / p.R;
      if (d < 1 && dy > -p.R * 0.1) v = Math.max(v, 0.5 * clamp((dy + p.R * 0.1) / p.R) * (1 - d * 0.35));
    }
    // en alt kısım yine açılır (sis)
    v *= 1 - 0.45 * clamp((py - e - 260) / 300);
    return clamp(v + 0.08 * n.fbm(px * 0.01, py * 0.01, 3));
  };
  const o = oge({
    ad: ad || `s02-bulutd-${w}-${h}-${tohum}-${tur}`, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.55, arkaBulanik: 10, arkaTasma: false,
    tarama: { ton, renkler: P.tara, yon: -0.157, aralik: 3.5, boy: [40, 130], kal: 1.2, alfa: P.alfa, esikler: P.esik, esikYay: 0.12, yumusak: 0.22 },
    kontur: null,
    detay: (ctx, api) => {
      for (const p of puflar) {
        if (p.cx < 0 || p.cx > w) continue;
        const pts2 = [];
        for (let a = Math.PI * 1.08; a <= Math.PI * 1.62; a += 0.05) pts2.push([p.cx + Math.cos(a) * p.R * 0.96, p.cy + Math.sin(a) * p.R * 0.96 + p.R * 0.5]);
        if (pts2.length > 2) api.cizgi(pts2, { renk: '#A39FD0', kal: 1.25, alfa: 0.3 });
      }
    },
  });
  return { oge: o, kenar };
}

// ================================================================ nur küresi (s01'in motifiyle aynı, ölçeklenebilir)
let NURS = null, nurPush = null;
export function nurHazirla() {
  // s01 sonundaki nur küresi tam bu sprite'lardır (r≈156 → rk 155, olcek 1.3); küçük boy için 60'lık takım
  NURS = [155, 60].map((NB) => ({ NB, ic: M.nurCekirdek(NB, 1.3), aura: M.nurAura(NB, 1.3) }));
  // yakın plan (itme) için kontursuz çekirdek: kontur canlı çizilir
  nurPush = oge({
    ad: 's02-nur-push', olcek: 1.3, sekil: elips(0, 0, 155, 155), arka: '#FFF1C9', arkaAlfa: 0.55, arkaBulanik: 155 * 0.25, arkaTasma: false,
    tarama: { ton: TON.radyal(0, 0, 155, 0, 0.9), renkler: [[0, '#F8E7A8'], [1, '#E7C565']], yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 3.2, boy: [10, 26], kal: 1.1, alfa: 0.45, esikler: [0.45, 0.75] },
    kontur: null,
  });
}
/** Nur küresi: (x, y) merkez, r yarıçap (ekran px); s01'deki M.nurKuresi ile aynı katmanlar */
export function nurCiz(ctx, x, y, r, t, { guc = 1, alfa = 1, isin = 1, hale = 1 } = {}) {
  if (alfa <= 0.002 || r < 0.5) return;
  ctx.save();
  ctx.globalAlpha *= alfa;
  const nefes = 1 + 0.018 * Math.sin(t * 2.1);
  M.hale(ctx, x, y, r * 4.6 * (0.8 + 0.2 * guc), '#FFF0B8', 0.42 * guc * hale);
  M.hale(ctx, x, y, r * 2.1, '#FFFBEA', 0.6 * guc * hale);
  const w155 = clamp((r - 82) / 40); // büyük takımın ağırlığı
  const auraAlfa = 0.85 * guc * (1 - clamp((r - 260) / 300));
  for (const [i, wa] of [[1, 1 - w155], [0, w155]]) {
    if (wa <= 0.003 || auraAlfa <= 0.003) continue;
    const N_ = NURS[i];
    ogeCiz(ctx, N_.aura, x, y, { s: (r / N_.NB) * nefes * (0.92 + 0.08 * guc), r: t * 0.04, alfa: auraAlfa * wa });
  }
  if (isin > 0) {
    M.isinlar(ctx, x, y, r * 1.25, r * 2.7 * (0.7 + 0.3 * guc), t, { sayi: 26, alfa: 0.45 * guc * isin, kal: clamp(r * 0.02, 1.6, 4.2), tohum: 7 });
    M.isinlar(ctx, x, y, r * 1.2, r * 1.9 * (0.7 + 0.3 * guc), -t * 0.6, { sayi: 18, renk: '#EBC867', alfa: 0.35 * guc * isin, kal: clamp(r * 0.015, 1.3, 3.4), tohum: 11 });
  }
  // çekirdek: küçükte 60'lık, ortada s01'inki, büyükte kontursuz + canlı kontur
  const wPush = clamp((r - 175) / 60);
  if (w155 < 1) ogeCiz(ctx, NURS[1].ic, x, y, { s: (r / 60) * nefes });
  if (w155 > 0) {
    if (wPush < 1) ogeCiz(ctx, NURS[0].ic, x, y, { s: (r / 155) * nefes, alfa: w155 });
    if (wPush > 0) ogeCiz(ctx, nurPush, x, y, { s: (r / 155) * nefes, alfa: w155 * wPush });
  }
  if (wPush > 0) {
    const pts = elips(x, y, r * nefes, r * nefes, Math.max(64, Math.ceil(r * 0.9)))[0].pts;
    konturCiz(ctx, pts, { renk: M.ALTIN_KOYU, kal: clamp(2.4 + r * 0.0015, 2.4, 3.6), alfa: 0.75 * wPush, kapali: true, titreme: 0.45, tohum: 77 });
  }
  M.hale(ctx, x - r * 0.2, y - r * 0.25, r * 0.95, '#FFFFFF', 0.55 * guc);
  ctx.restore();
}

// ================================================================ merdiven çıkan adam (ters kinematik)
const P_ADIM = 0.355; // basamak periyodu
const SW = 0.29; // salınım süresi
export const S1 = 8.3; // ilk salınımın başlangıcı
const kaydir = (j) => S1 + (j - 1) * P_ADIM;
const AYAK0 = [T(0) + 2, T(0) + 9]; // başlangıçta [uzak, yakın] ayak bileği x
const FA = AX + 9, FB = AX - 11; // sahanlıkta son duruş (yakın ayak önde)
// salınımlar: f: 1 yakın (ön) ayak, 0 uzak (arka) ayak; x0,k0 → x1,k1; s başlangıç, d süre; th: topuk kalkışı
const SALINIM = [];
SALINIM.push({ f: 1, x0: AYAK0[1], k0: 0, x1: F(1), k1: 1, s: kaydir(1), d: SW, th: 0.3, lift: 14 });
SALINIM.push({ f: 0, x0: AYAK0[0], k0: 0, x1: F(2), k1: 2, s: kaydir(2), d: SW, th: 0.42, lift: 12 });
for (let j = 3; j <= N + 1; j++) SALINIM.push({ f: j % 2, x0: F(j - 2), k0: j - 2, x1: F(j), k1: j, s: kaydir(j), d: SW, th: 0.45, lift: 12 });
{
  const son = SALINIM[SALINIM.length - 1]; // sahanlığa basış (j = N+1, uzak ayak)
  const s9 = son.s + son.d + 0.06;
  SALINIM.push({ f: 1, x0: F(N), k0: N, x1: FA, k1: N + 1, s: s9, d: 0.36, th: 0.38, lift: 12 });
  SALINIM.push({ f: 0, x0: F(N + 1), k0: N + 1, x1: FB, k1: N + 1, s: s9 + 0.36 + 0.02, d: 0.32, th: 0.24, lift: 8 });
}
const HR = 0.12; // topuk kalkışı penceresi
export const ADAM = {
  gorun: 8.16, // belirme
  inis: SALINIM.map((s) => s.s + s.d), // ayak basma anları
  basamakInis: {}, // k. basamağa ilk basış zamanı
  dur: 0,
  salinimlar: SALINIM,
};
for (const s of SALINIM) if (ADAM.basamakInis[s.k1] === undefined) ADAM.basamakInis[s.k1] = s.s + s.d;
ADAM.dur = SALINIM[SALINIM.length - 1].s + SALINIM[SALINIM.length - 1].d;

// ayakların t anındaki duruş konumu (salınımda değilken)
function ayakYer(f, t) {
  let x = AYAK0[f], k = 0;
  for (const s of SALINIM) if (s.f === f && t >= s.s + s.d) { x = s.x1; k = s.k1; }
  return { x, k };
}
// kalça anahtarları: her basışta arka (destek) ayak üzerinden
const ETA = 0.955, BETA = 0.45;
const KALCA = [];
{
  const x0 = (AYAK0[0] + AYAK0[1]) / 2;
  const yDur = Y(0) - ANK - 0.99 * LEG;
  KALCA.push({ t: 7.0, x: x0, y: yDur });
  KALCA.push({ t: S1 - 0.2, x: x0, y: yDur });
  KALCA.push({ t: S1 - 0.02, x: x0 + 3, y: Y(0) - ANK - 0.975 * LEG });
  const sonIki = SALINIM.length - 2;
  SALINIM.forEach((s, j) => {
    if (j >= sonIki) return;
    const tb = s.s + s.d;
    const destek = ayakYer(1 - s.f, tb);
    const hx = destek.x + BETA * D;
    const dx = hx - destek.x;
    KALCA.push({ t: tb, x: hx, y: Y(destek.k) - ANK - Math.sqrt((ETA * LEG) ** 2 - dx * dx) });
  });
  // sahanlıkta son iki adım: kalça iki ayağın arasında, arka ayak kalkmadan yükselmez
  const s9 = SALINIM[sonIki], s10 = SALINIM[sonIki + 1];
  const yuk = (dx, oran) => YP - ANK - Math.sqrt((oran * LEG) ** 2 - dx * dx);
  const m9 = (s9.x1 + s10.x0) / 2;
  KALCA.push({ t: s9.s + s9.d, x: m9, y: yuk(Math.abs(s9.x1 - s10.x0) / 2, 0.965) });
  const xm = lerp(m9, (FA + FB) / 2, 0.45);
  KALCA.push({ t: s10.s + s10.d * 0.5, x: xm, y: yuk(Math.abs(FA - xm), 0.965) });
  KALCA.push({ t: s10.s + s10.d, x: (FA + FB) / 2 + 1, y: yuk(Math.abs(FA - FB) / 2, 0.97) });
  KALCA.push({ t: s10.s + s10.d + 0.45, x: (FA + FB) / 2 + 1, y: YP - ANK - 0.99 * LEG });
  KALCA.push({ t: 30, x: (FA + FB) / 2 + 1, y: YP - ANK - 0.99 * LEG });
}
// zaman düğümlü Catmull-Rom (Hermite)
const egimler = KALCA.map((k, i) => {
  if (i === 0 || i === KALCA.length - 1) return { x: 0, y: 0 };
  const a = KALCA[i - 1], b = KALCA[i + 1];
  return { x: (b.x - a.x) / (b.t - a.t), y: (b.y - a.y) / (b.t - a.t) };
});
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

// ayak tabanı noktaları (ayak sprite'ının yerel koordinatı; çizim noktası bil - (0,2))
const TABAN = [[-13, 13], [8, 13], [33, 12.5], [39, 8]];
const UC = [31, 13]; // topuk kalkarken dönülen burun noktası
const rotP = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
/** Topuğu θ kadar kalkmış ayağın bilek noktası (dünya) */
function topukKalkik(x, k, th) {
  const toe = [x + UC[0] * S, Y(k) - 13 * S + UC[1] * S];
  const q = rotP(UC, th);
  return [toe[0] - q[0] * S, toe[1] - q[1] * S];
}
/** t anında f ayağının durumu: { x, y (bilek), a3 (ayak açısı; - topuk kalkık) } */
export function ayak(f, t) {
  const liste = SALINIM.filter((s) => s.f === f);
  let x = AYAK0[f], k = 0;
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
      // önce yüksel (ara basamağın ve hedef basamağın burnunu aş), sonra ilerle, en sonda basamağa dik in:
      // parmak ucu hiçbir an basamağın içinden geçmez, ayak havada sarkmaz
      const yTop = Math.min(ys, ye) - s.lift;
      const ex = ease.inOutSine(clamp((u - 0.12) / 0.76));
      const bx = lerp(xs, xe, ex);
      const by = u < 0.5 ? lerp(ys, yTop, ease.outCubic(u / 0.5)) : lerp(yTop, ye, ease.inOutSine((u - 0.5) / 0.5));
      const a3 = u < 0.4 ? lerp(-s.th, 0.1, ease.inOutSine(u / 0.4)) : lerp(0.1, 0, ease.inOutSine((u - 0.4) / 0.6));
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
  return { a1: adir + al, a2: adir - al, oran: d0 / (2 * L1) };
}
export const zamanEgri = (t, noktalar) => {
  if (t <= noktalar[0][0]) return noktalar[0][1];
  for (let i = 1; i < noktalar.length; i++) {
    if (t <= noktalar[i][0]) return lerp(noktalar[i - 1][1], noktalar[i][1], ease.inOutSine((t - noktalar[i - 1][0]) / (noktalar[i][0] - noktalar[i - 1][0])));
  }
  return noktalar[noktalar.length - 1][1];
};
/** t anında adamın çizim parametreleri: insanYan(ctx, x, y, poz, { s: S }) */
export function adamDurum(t) {
  const h = kalcaTaban(t);
  // basamaklarda duruş ortasında hafif yükselme
  const L = ADAM.inis;
  for (let j = 0; j < L.length - 1; j++) {
    if (t > L[j] && t < L[j + 1]) { h.y -= 2.2 * Math.sin(Math.PI * (t - L[j]) / (L[j + 1] - L[j])); break; }
  }
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
  const t1 = S1 - 0.1, t2 = ADAM.dur;
  const yuru = zamanEgri(t, [[t1, 0], [t1 + 0.3, 1], [t2 - 0.35, 1], [t2 + 0.1, 0]]);
  const ayr = clamp((ayaklar[1].x - ayaklar[0].x) / (2.2 * D), -1, 1);
  const kolOn = lerp(0.06, 0.05 - 0.34 * ayr, yuru), kolArka = lerp(-0.05, 0.02 + 0.34 * ayr, yuru);
  poz.omuz = [kolArka, kolOn];
  poz.dirsek = [lerp(0.12, 0.22 + 0.3 * Math.max(0, kolArka), yuru), lerp(0.16, 0.22 + 0.3 * Math.max(0, kolOn), yuru)];
  const nefes = 0.006 * Math.sin(t * 2.2);
  poz.govde = zamanEgri(t, [[S1 - 0.2, -0.02], [S1 + 0.15, 0.17], [t2 - 0.75, 0.17], [t2 - 0.2, 0.05], [t2 + 0.25, 0.0], [t2 + 0.6, -0.035]]) + nefes;
  poz.bas = zamanEgri(t, [[8.2, -0.16], [S1 + 0.2, 0.04], [t2 - 0.6, 0.04], [t2 - 0.1, -0.06], [t2 + 0.25, -0.06], [t2 + 0.75, -0.38]]);
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
  if (dolgu > 0 && dolguOge && dolguYari > 0) {
    if (dolguYari >= 0.999) ogeCiz(ctx, dolguOge, 0, 0, { s: Rr / 400, alfa: dolgu });
    else {
      // dolgu merkezden yumuşak kenarlı bir daireyle yayılır
      const rr = Rr * 1.02 * dolguYari;
      const m = tuval(W, H);
      const mc = m.getContext('2d');
      mc.setTransform(ctx.getTransform());
      ogeCiz(mc, dolguOge, 0, 0, { s: Rr / 400, alfa: dolgu });
      mc.globalCompositeOperation = 'destination-in';
      const g = mc.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, rr));
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.8, 'rgba(0,0,0,1)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      mc.fillStyle = g;
      mc.beginPath();
      mc.arc(0, 0, Math.max(1, rr), 0, TAU);
      mc.fill();
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(m, 0, 0);
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
    if (u >= 1) {
      konturCiz(ctx, yol.pts, { renk, kal, alfa: 0.88, kapali: yol.kapali, titreme: 0.4, tohum: 40 + i });
      return;
    }
    const e = ease.inOutCubic(u);
    if (!yol.kapali) {
      // kollar merkezden dışa doğru çizilir
      konturCiz(ctx, [yol.pts[1], yol.pts[0]], { renk, kal, alfa: 0.88, kapali: false, titreme: 0.4, tohum: 40 + i, cizim: e });
      return;
    }
    // kapalı yollar simetrik olarak birden çok noktadan aynı anda çizilir
    const n = yol.katman === 1 ? 4 : yol.katman === 4 ? 4 : 8;
    for (const [j, parca] of simetrikParcalar(yol.pts, n).entries()) {
      konturCiz(ctx, parca, { renk, kal, alfa: 0.88, kapali: false, titreme: 0.4, tohum: 40 + i * 13 + j, cizim: e, uc: 0.0 });
    }
  });
  // kollar boyunca merkeze akan ışık (bütün çizgiler merkezdeki noktaya çıkar)
  if (kolIsik >= 0 && kolIsik <= 1) {
    const e = ease.inOutSine(kolIsik);
    const a0 = Math.sin(Math.PI * clamp(kolIsik * 1.06));
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU + Math.PI / 8;
      const r0 = k % 2 ? Rr * 0.44 : Rr * 0.6;
      const d = lerp(r0, Rr * 0.085, e);
      const iz = lerp(r0, Rr * 0.085, ease.inOutSine(clamp(kolIsik - 0.16)));
      const cx = Math.cos(a), cy = Math.sin(a);
      // ışık izi: arkasında incelen altın çizgi
      if (iz - d > 3) {
        ctx.save();
        ctx.fillStyle = rgba('#EDBE45', 0.8 * a0);
        darbe(ctx, [[cx * iz, cy * iz], [cx * (iz + d) / 2, cy * (iz + d) / 2], [cx * d, cy * d]], 4.6, { incelme: 0.5, sivri: 0.7 });
        ctx.restore();
      }
      M.hale(ctx, cx * d, cy * d, 22, '#F3C955', 0.45 * a0, 'source-over');
      M.hale(ctx, cx * d, cy * d, 9, '#FFFFFF', 0.95 * a0, 'source-over');
    }
  }
  // ışıklar merkeze ulaşınca yayılan yumuşak altın halka
  if (kolIsik > 0.92) {
    const u = clamp((kolIsik - 0.92) / 0.6);
    if (u < 1) {
      const rr = Rr * lerp(0.09, 0.62, ease.outCubic(u));
      konturCiz(ctx, elips(0, 0, rr, rr)[0].pts, { renk: '#E9C35C', kal: lerp(4, 1.5, u), alfa: 0.7 * (1 - u), kapali: true, titreme: 0.3, tohum: 91 });
      M.hale(ctx, 0, 0, rr * 1.1, '#FFF6D8', 0.35 * (1 - u));
    }
  }
  if (merkezIsik > 0) {
    M.hale(ctx, 0, 0, Rr * 0.22, '#FFFBEA', 0.85 * merkezIsik);
    M.hale(ctx, 0, 0, Rr * 0.08, '#FFFFFF', 0.9 * merkezIsik);
  }
  ctx.restore();
}

/**
 * Kapalı yolu merkezden dışa çizilecek açık parçalara böler: merkeze en yakın noktalardan (kenar ortaları, yıldızın iç
 * köşeleri) iki yana, en uzak noktalara (köşeler, uçlar) doğru. Daire için n eşit parça (ileri yönde).
 */
const parcaOnbellek = new Map();
function simetrikParcalar(pts, n) {
  const key = pts.length + ':' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2) + ':' + n + ':' + pts[1][0].toFixed(2);
  if (parcaOnbellek.has(key)) return parcaOnbellek.get(key);
  const q = yenidenOrnekle(pts, 2, true);
  q.pop(); // son nokta ilkinin tekrarı
  const N_ = q.length;
  const r = q.map(([x, y]) => Math.hypot(x, y));
  const rmax = Math.max(...r), rmin = Math.min(...r);
  const out = [];
  if ((rmax - rmin) / rmax < 0.03) {
    for (let j = 0; j < n; j++) {
      const a = Math.round((j * N_) / n), b = Math.round(((j + 1) * N_) / n);
      const parca = [];
      for (let k = a; k <= b; k++) parca.push(q[k % N_]);
      out.push(parca);
    }
  } else {
    // yerel en küçükler (merkeze en yakın) ve aralarındaki en büyükler
    const at = (k) => r[((k % N_) + N_) % N_];
    const W_ = 3;
    const minler = [];
    for (let k = 0; k < N_; k++) {
      let m = true;
      for (let d = 1; d <= W_; d++) if (at(k) > at(k - d) || at(k) > at(k + d)) { m = false; break; }
      if (m && (!minler.length || k - minler[minler.length - 1] > W_)) minler.push(k);
    }
    if (minler.length > 1 && minler[0] + N_ - minler[minler.length - 1] <= W_) minler.pop();
    for (let i = 0; i < minler.length; i++) {
      const a = minler[i], b = i + 1 < minler.length ? minler[i + 1] : minler[0] + N_;
      let M_ = a, best = -1;
      for (let k = a; k <= b; k++) if (at(k) > best) { best = at(k); M_ = k; }
      const ileri = [], geri = [];
      for (let k = a; k <= M_; k++) ileri.push(q[k % N_]);
      for (let k = b; k >= M_; k--) geri.push(q[k % N_]);
      if (ileri.length > 1) out.push(ileri);
      if (geri.length > 1) out.push(geri);
    }
  }
  if (parcaOnbellek.size > 400) parcaOnbellek.clear();
  parcaOnbellek.set(key, out);
  return out;
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
/** Yanan fener: küçük altın ışık (dünya koordinatı). yanma: yanmadan bu yana geçen süre (sn) */
export function fenerCiz(ctx, x, y, t, yanma, { tohum = 1, guc = 1 } = {}) {
  if (yanma <= 0) return;
  const p = ease.outBack(clamp(yanma / 0.35), 2.0);
  const titres = 0.92 + 0.08 * Math.sin(t * 7.3 + tohum * 2.1) * Math.sin(t * 3.1 + tohum);
  const parlama = Math.exp(-Math.max(0, yanma - 0.12) * 3.2); // ilk anda parlak, sonra sakin
  const gir = clamp(yanma * 5);
  M.hale(ctx, x, y, 38 * (0.75 + 0.6 * parlama) * guc, '#FFE6A0', (0.42 + 0.4 * parlama) * titres * gir);
  ctx.save();
  ctx.globalAlpha *= gir;
  ctx.fillStyle = rgba('#FFF4CF', 0.95);
  ctx.beginPath();
  ctx.arc(x, y, 6.2 * p, 0, TAU);
  ctx.fill();
  konturCiz(ctx, elips(x, y, 7.5 * p, 7.5 * p, 28)[0].pts, { renk: M.ALTIN_KOYU, kal: 1.5, alfa: 0.9, kapali: true, titreme: 0.2, tohum });
  ctx.restore();
  M.hale(ctx, x, y, 9, '#FFFFFF', 0.65 * titres * gir);
  if (parlama > 0.05) M.isinlar(ctx, x, y, 9, 20 + 9 * parlama, t, { sayi: 8, alfa: 0.55 * parlama, kal: 1.4, tohum: 5 + tohum, hiz: 0.3 });
}
