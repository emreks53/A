// s10 son bölüm: "O vahşetgâh dünya bir tenezzühgâha döner ve bir ticaretgâh olur."
// Aynı yerin iki hâli: karanlık, eğri ağaçlı, sisli, gözlü, dikenli yaban (vahşetgâh) ve aydınlık gezinti bahçesi
// (servi, çiçekli ağaçlar, lale tarhları, çakıl yol, çeşme, kuşlar); bahçe sağa doğru zarif bir çarşıya uzanır
// (ablaklı sivri kemerler, çizgili tenteler, tezgâhlar, pirinç fenerler, terazi, alışveriş eden erkekler).
// Yerleşim "referans ekran" koordinatlarıyla yapılır: kamera (1750, 900), z = 1 iken ekranda görülen yer. Paralaks
// katmanına çevirme: Xw = sx + 1210·f, Yw = sy − 60·f.
import { tuval, W, H, clamp, lerp, ease, an, rng, TAU, rgba, smooth, pop } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, darbe, TON, PALET, FILM } from '../motor/kalem.mjs';
import { acarak } from './s10-yardim.mjs';
import { svg, elips, cokgen, dikdortgen, sivriKemer, yumusat, donustur, yuvarlakDikdortgen } from '../motor/sekil.mjs';
import { kameraUygula, ekranda } from '../motor/sahne.mjs';
import { insanYan, insanOn, DURUS, ON_DURUS } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';

export const CV = { x: 1750, y: 900 };
const KX = 1210, KY = -60;
/** Referans ekran koordinatlı çizim için katman dönüşümü */
export function katman(g, cam, f) {
  kameraUygula(g, cam, f);
  g.translate(KX * f, KY * f);
}
/** Referans ekran noktasının (f katmanında) gerçek ekran yeri */
export function refEkran(cam, sx, sy, f = 1) {
  return ekranda(cam, sx + KX * f, sy + KY * f, f);
}
export const YOL = 1352; // yürüme yolu (ayak tabanı), referans ekran y'si (f = 1)

// ---------------------------------------------------------------- palet yardımcıları
const TAC_PAL = {
  pembe: { arka: '#F7CEDA', tara: [[0, '#F6C3D1'], [0.55, '#E795AD'], [1, '#B4546F']], kontur: '#9C3F5C' },
  beyaz: { arka: '#F4F0F7', tara: [[0, '#ECE6F2'], [0.55, '#CBC1DE'], [1, '#9184B4']], kontur: '#7B6AA8' },
  yesil: { arka: '#B5DBA2', tara: [[0, '#A9D592'], [0.55, '#5A995E'], [1, '#2F6B45']], kontur: '#2F6B45' },
  koyu: { arka: '#7E8C86', tara: [[0, '#7D8A85'], [0.55, '#55625F'], [1, '#353E40']], kontur: '#2C3335' },
};

function bulutsu(R, tohum, loblar = 9, basik = 0.92) {
  const r = rng(tohum);
  const L = Array.from({ length: loblar }, () => r.ara(0.84, 1.08));
  const pts = [];
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * TAU, f = (a / TAU) * loblar, i = Math.floor(f), u = f - i;
    const l = L[i % loblar] * (1 - u) + L[(i + 1) % loblar] * u + 0.06 * Math.abs(Math.sin(f * Math.PI));
    pts.push([Math.cos(a) * R * l, Math.sin(a) * R * l * basik]);
  }
  return [{ pts, kapali: true }];
}

/** Taçlı (yuvarlak) ağaç: gövde + kubbe kümeler; palet: pembe/beyaz/yesil */
function tacliAgac({ ad, boy, tohum, palet = 'yesil', olcek = 1, meyve = null }) {
  const r = rng(tohum);
  const gk = boy * 0.06, gy = boy * 0.46;
  const govde = oge({
    ad: ad + '-govde', olcek, sekil: svg(`M${-gk * 1.3} 0C${-gk * 0.7} ${-boy * 0.03} ${-gk * 0.55} ${-boy * 0.08} ${-gk * 0.5} ${-boy * 0.14}C${-gk * 0.42} ${-gy * 0.6} ${-gk * 0.36} ${-gy * 0.85} ${-gk * 0.3} ${-gy}L${gk * 0.3} ${-gy}C${gk * 0.36} ${-gy * 0.85} ${gk * 0.42} ${-gy * 0.6} ${gk * 0.5} ${-boy * 0.14}C${gk * 0.55} ${-boy * 0.08} ${gk * 0.7} ${-boy * 0.03} ${gk * 1.3} 0Z`),
    arka: '#D3B99A', arkaAlfa: 0.85,
    tarama: { ton: TON.silindir(-gk * 0.6, gk * 0.6), renkler: [[0, '#C29F7A'], [1, '#4E3826']], yon: -Math.PI / 2, aralik: 2.8, boy: [14, 40], esikler: [0.15, 0.45, 0.72], alfa: 0.55 },
    kontur: '#4E3826', konturKal: 2.0,
  });
  const P = TAC_PAL[palet];
  const tx = 0, ty = -boy * 0.68, TW = boy * 0.36, TH = boy * 0.27;
  const yer = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU + r.ara(-0.2, 0.2), rr = r.ara(0.5, 0.95);
    yer.push({ x: tx + Math.cos(a) * TW * rr, y: ty + Math.sin(a) * TH * rr * (Math.sin(a) > 0 ? 0.7 : 1), R: boy * r.ara(0.13, 0.17) });
  }
  for (let i = 0; i < 4; i++) yer.push({ x: tx + r.ara(-TW * 0.3, TW * 0.3), y: ty + r.ara(-TH * 0.3, TH * 0.2), R: boy * r.ara(0.15, 0.19) });
  yer.sort((a, b) => a.y - b.y);
  const kumeler = yer.map((k, i) => ({
    ...k, R: Math.round(k.R / 16) * 16, t: i / yer.length,
    oge: oge({
      ad: `s10-tackume-${palet}-${i % 3}-${Math.round(k.R / 16)}`, olcek, sekil: bulutsu(Math.round(k.R / 16) * 16, 900 + (i % 3)), arka: P.arka, arkaAlfa: 0.85,
      tarama: { ton: TON.gurultulu(TON.kure(k.R * 0.25, -k.R * 0.3, k.R * 1.3, { lz: 0.8, ortam: 0.18 }), 0.1, 0.03, i), renkler: P.tara, yonF: (x, y) => Math.atan2(y, x) * 0.3 - 0.9, aralik: 3.0, boy: [10, 28], esikler: [0.14, 0.44, 0.72], alfa: 0.55 },
      kontur: P.kontur, konturKal: 1.8, konturAlfa: 0.8,
    }),
  }));
  const meyveler = [];
  if (meyve) for (const k of kumeler.slice(4)) if (r() < 0.8) meyveler.push([k.x + r.ara(-k.R * 0.5, k.R * 0.5), k.y + r.ara(-k.R * 0.2, k.R * 0.5)]);
  return { govde, kumeler, meyveler, meyve };
}
function tacliCiz(g, A, x, y, { s = 1, u = 1, t = 0, faz = 0 } = {}) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  if (u > 0) ogeCiz(g, A.govde, 0, 0, { sy: ease.outBack(clamp(u * 3.2), 1.2) });
  A.kumeler.forEach((k, i) => {
    const v = clamp((u - 0.12 - k.t * 0.28) / 0.45);
    if (v <= 0) return;
    ogeCiz(g, k.oge, k.x, k.y, { s: ease.outBack(v, 1.7), r: Math.sin(t * 1.2 + i + faz) * 0.015 });
  });
  if (A.meyve) A.meyveler.forEach((m, i) => {
    const v = clamp((u - 0.55 - (i % 4) * 0.06) / 0.3);
    if (v > 0) ogeCiz(g, A.meyve, m[0], m[1], { s: ease.outBack(v, 1.8) });
  });
  g.restore();
}

function serviOge(boy, olcek, ad) {
  const w = boy * 0.13;
  return oge({
    ad, olcek, sekil: svg(`M0 ${-boy}C${w * 0.5} ${-boy * 0.82} ${w * 1.05} ${-boy * 0.5} ${w} ${-boy * 0.22}C${w * 0.95} ${-boy * 0.08} ${w * 0.5} 0 0 0C${-w * 0.5} 0 ${-w * 0.95} ${-boy * 0.08} ${-w} ${-boy * 0.22}C${-w * 1.05} ${-boy * 0.5} ${-w * 0.5} ${-boy * 0.82} 0 ${-boy}Z`),
    arka: '#7FB28A', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.silindir(-w, w, { ortam: 0.25 }), 0.12, 0.03, 4), renkler: [[0, '#8CC492'], [0.5, '#3F7F55'], [1, '#1F4E35']], yonF: (x, y) => -Math.PI / 2 + x * 0.012, aralik: 2.8, boy: [16, 44], esikler: [0.15, 0.45, 0.72], alfa: 0.58 },
    kontur: '#1F4E35', konturKal: 2.0,
    detay: (c, api) => {
      const r = rng(boy);
      for (let i = 0; i < 9; i++) {
        const y = -boy * r.ara(0.12, 0.85), x = r.ara(-w * 0.5, w * 0.5);
        api.cizgi([[x - 8, y + 6], [x, y], [x + 8, y + 5]], { renk: '#1F4E35', kal: 1.2, alfa: 0.5 });
      }
    },
  });
}

// eğri ağaç geometrisi: kıvrık gövde, dallanan eğri dallar, uçlarda diken ya da çiçek kümeleri
function egriGeometri(boy, tohum, { dalSay = 3, derin = 4, egrilik = 0.32, yayilim = 0.78, govdeAci = 0, kalin = 0.075 } = {}) {
  const r = rng(tohum);
  const parca = [], uclar = [], dikenler = [];
  const serit = (pts, k0, k1) => {
    const n = pts.length - 1, sol = [], sag = [];
    for (let i = 0; i <= n; i++) {
      const a0 = pts[Math.max(0, i - 1)], a1 = pts[Math.min(n, i + 1)];
      let tx = a1[0] - a0[0], ty = a1[1] - a0[1];
      const tl = Math.hypot(tx, ty) || 1;
      tx /= tl; ty /= tl;
      const w = lerp(k0, k1, i / n) / 2;
      sol.push([pts[i][0] - ty * w, pts[i][1] + tx * w]);
      sag.push([pts[i][0] + ty * w, pts[i][1] - tx * w]);
    }
    kenarlar.push(sol, [...sag]);
    return { pts: [...sol, ...sag.reverse()], kapali: true };
  };
  const kenarlar = [];
  const dal = (x, y, a, L, k0, d) => {
    const n = 8, pts = [[x, y]];
    let px = x, py = y, aa = a;
    for (let i = 1; i <= n; i++) {
      aa += r.ara(-egrilik, egrilik) * (d === 0 ? 0.45 : 1);
      px += (Math.sin(aa) * L) / n; py -= (Math.cos(aa) * L) / n;
      pts.push([px, py]);
    }
    const k1 = Math.max(2.2, k0 * 0.6);
    parca.push(serit(pts, k0, k1));
    if (d >= derin || L < boy * 0.05) {
      uclar.push([px, py, aa, d]);
      for (let s = 0; s < 3; s++) {
        const sa = aa + r.ara(-0.9, 0.9), sl = r.ara(10, 26) * (boy / 900);
        dikenler.push([[px, py], [px + Math.sin(sa) * sl, py - Math.cos(sa) * sl]]);
      }
      return;
    }
    const m = d === 0 ? dalSay : r() < 0.55 ? 2 : 3;
    for (let i = 0; i < m; i++) {
      const j = m === 3 && i === 1 ? n : (i === 0 ? Math.round(n * (d === 0 ? r.ara(0.74, 0.9) : r.ara(0.55, 0.85))) : n);
      const [sx, sy] = pts[j];
      const yon = (i - (m - 1) / 2) * yayilim + r.ara(-0.22, 0.22);
      dal(sx, sy, aa * 0.7 + yon, L * r.ara(0.58, 0.76), k1 * (j === n ? 0.95 : 0.75), d + 1);
    }
    // dal boyunca birkaç diken
    for (let s = 0; s < 2; s++) {
      const q = pts[1 + Math.floor(r() * (n - 1))];
      const sa = aa + (r() < 0.5 ? 1 : -1) * r.ara(0.8, 1.3), sl = r.ara(8, 18) * (boy / 900);
      dikenler.push([[q[0], q[1]], [q[0] + Math.sin(sa) * sl, q[1] - Math.cos(sa) * sl]]);
    }
  };
  const k = boy * kalin;
  dal(0, 2, govdeAci, boy * 0.44, k, 0);
  const kok = svg(`M${-k * 1.7} 2C${-k * 0.9} ${-boy * 0.01} ${-k * 0.6} ${-boy * 0.04} ${-k * 0.48} ${-boy * 0.1}L${k * 0.48} ${-boy * 0.1}C${k * 0.6} ${-boy * 0.04} ${k * 0.9} ${-boy * 0.01} ${k * 1.7} 2Z`)[0].pts;
  parca.push({ pts: kok, kapali: true });
  const yarim = Math.floor(kok.length / 2);
  kenarlar.push(svg(`M${-k * 1.7} 2C${-k * 0.9} ${-boy * 0.01} ${-k * 0.6} ${-boy * 0.04} ${-k * 0.48} ${-boy * 0.1}`)[0].pts, svg(`M${k * 1.7} 2C${k * 0.9} ${-boy * 0.01} ${k * 0.6} ${-boy * 0.04} ${k * 0.48} ${-boy * 0.1}`)[0].pts);
  return { parca, uclar, dikenler, kenarlar };
}
const AGAC_PAL = {
  kara: { arka: '#6F6882', tara: [[0, '#857D98'], [0.5, '#585069'], [1, '#332D40']], kontur: '#28222F' },
  sisli: { arka: '#A9A2B8', tara: [[0, '#B5AEC3'], [0.5, '#8F88A2'], [1, '#6C6582']], kontur: '#5E5672' },
  kahve: { arka: '#D3B99A', tara: [[0, '#C29F7A'], [0.5, '#8A6A4C'], [1, '#4E3826']], kontur: '#4E3826' },
};
function egriAgacOge(ad, Gm, palet, olcek, { diken = true } = {}) {
  const P = AGAC_PAL[palet];
  return oge({
    ad, olcek, sekil: Gm.parca, arka: P.arka, arkaAlfa: 0.88,
    tarama: { ton: TON.gurultulu((x, y) => 0.55, 0.3, 0.02, ad.length), renkler: P.tara, yon: -Math.PI / 2 + 0.25, aralik: 2.8, boy: [12, 40], kal: 1.15, alfa: 0.55, esikler: [0.18, 0.45, 0.72] },
    kontur: null,
    detay: (c, api) => {
      for (const e of Gm.kenarlar) api.cizgi(e, { renk: P.kontur, kal: 1.9, alfa: 0.9, titreme: 0.4 });
      if (diken) for (const d of Gm.dikenler) api.cizgi(d, { renk: P.kontur, kal: 1.5, alfa: 0.9 });
    },
  });
}
/** Karanlık eğri ağaç (koyu ya da sisli); çiçekli: aynı dallar kahverengi + uçlarda çiçek kümeleri */
function karanlikAgac(boy, tohum, olcek, palet = 'kara', ops = {}) {
  const Gm = egriGeometri(boy, tohum, ops);
  return { G: Gm, oge: egriAgacOge(`s10-egri-${boy}-${tohum}-${palet}`, Gm, palet, olcek), lekeler: [] };
}
function cicekliAgac(K, boy, tohum, olcek, renk = 'pembe') {
  const Gm = K.G;
  const govde = egriAgacOge(`s10-egri-${boy}-${tohum}-kahve`, Gm, 'kahve', olcek, { diken: false });
  const P = TAC_PAL[renk];
  const r = rng(tohum + 9);
  const kumeler = Gm.uclar.map(([x, y, a, d], i) => {
    const R = Math.round((boy * r.ara(0.06, 0.09) * (d < 3 ? 1.3 : 1)) / 20) * 20;
    return { x, y, R, t: r(), oge: oge({
      ad: `s10-cicekkume-${renk}-${R}-${i % 3}`, olcek, sekil: bulutsu(R, 300 + (i % 3), 8, 0.85), arka: P.arka, arkaAlfa: 0.85,
      tarama: { ton: TON.kure(R * 0.25, -R * 0.3, R * 1.3, { lz: 0.8, ortam: 0.18 }), renkler: P.tara, yonF: (px, py) => Math.atan2(py, px) * 0.3 - 0.9, aralik: 2.8, boy: [8, 22], esikler: [0.14, 0.44, 0.72], alfa: 0.55 },
      kontur: P.kontur, konturKal: 1.7, konturAlfa: 0.8,
      detay: (c, api) => {
        const rr = rng(i * 13 + 1);
        for (let k = 0; k < Math.round(R / 7); k++) {
          const aa = rr() * TAU, dd = R * rr.ara(0.1, 0.8);
          api.dolgu(elips(Math.cos(aa) * dd, Math.sin(aa) * dd * 0.85, 3.2, 3.2), '#FFFFFF', 0.85);
          api.dolgu(elips(Math.cos(aa) * dd, Math.sin(aa) * dd * 0.85, 1.2, 1.2), '#E2B23E', 0.9);
        }
      },
    }) };
  });
  return { govde, kumeler };
}
function karanlikCiz(g, K, x, y, s, t, faz) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.rotate(Math.sin(t * 0.7 + faz) * 0.006);
  ogeCiz(g, K.oge, 0, 0);
  g.restore();
}
function cicekliCiz(g, C, x, y, s, t, u, faz) {
  if (u <= 0) return;
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.rotate(Math.sin(t * 0.6 + faz) * 0.005);
  ogeCiz(g, C.govde, 0, 0, { alfa: clamp(u * 3) });
  C.kumeler.forEach((k, i) => {
    const v = clamp((u - 0.2 - k.t * 0.4) / 0.4);
    if (v > 0) ogeCiz(g, k.oge, k.x, k.y, { s: ease.outBack(v, 1.7), r: Math.sin(t * 1.3 + i) * 0.03 });
  });
  g.restore();
}

// ---------------------------------------------------------------- zeminler
function zeminKaranlik() {
  return oge({
    ad: 's10-v-zemin-kara', olcek: 0.75, sekil: cokgen([[-460, 1110], [300, 1120], [900, 1106], [1500, 1116], [2100, 1110], [2100, 2300], [-460, 2300]]),
    arka: '#ABA5B9', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.45 + 0.35 * clamp((y - 1100) / 900)), 0.2, 0.006, 3), renkler: [[0, '#9E98AE'], [0.6, '#6E6784'], [1, '#4A4458']], yon: -0.06, aralik: 3.3, boy: [30, 100], esikler: [0.22, 0.5, 0.78], alfa: 0.52 },
    kontur: null,
  });
}
function zeminBahce() {
  // çimen: ufukta açık, öne doğru zengin yeşil; ortada çakıl yürüme yolu
  return oge({
    ad: 's10-v-zemin-bahce', olcek: 0.75, sekil: cokgen([[-460, 1110], [300, 1120], [900, 1106], [1500, 1116], [2100, 1110], [2100, 2300], [-460, 2300]]),
    arka: '#C4E3AE', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.3 + 0.4 * clamp((y - 1100) / 900)), 0.16, 0.006, 5), renkler: [[0, '#B4DB9C'], [0.55, '#79B571'], [1, '#3E7C4F']], yon: -0.08, aralik: 3.4, boy: [30, 90], esikler: [0.22, 0.5, 0.8], alfa: 0.5 },
    kontur: null,
  });
}
function yolOge() {
  // çakıl yol (yatay şerit) ve çeşmeye uzanan kısa kol
  const sekil = svg('M-700 1296C-200 1290 300 1300 640 1294L760 1294C1000 1290 1500 1296 2100 1292L2100 1384C1500 1390 1000 1384 760 1386L640 1386C300 1388 -200 1382 -700 1386Z');
  return oge({
    ad: 's10-v-yol', olcek: 0.9, sekil, arka: '#F1E6CE', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(() => 0.45, 0.25, 0.02, 7), renkler: [[0, '#EADCBF'], [1, '#B9A27D']], yon: -0.03, aralik: 3.4, boy: [10, 30], kal: 1.1, alfa: 0.42, esikler: [0.3, 0.62] },
    kontur: '#B39B74', konturKal: 1.8,
    detay: (c, api) => {
      const r = rng(5);
      for (let i = 0; i < 160; i++) {
        const x = r.ara(-680, 2080), y = r.ara(1302, 1380);
        api.dolgu(elips(x, y, r.ara(1.5, 3.2), r.ara(1, 2)), '#A8916C', 0.45);
      }
    },
  });
}
function kaldirimOge() {
  // çarşı meydanı: yoldan aşağı uzanan sakin taş döşeme (sol kenarı çimene yumuşakça karışır)
  const x0 = -480, x1 = 2200, y0 = 1294, y1 = 2300;
  const sekil = cokgen([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  return oge({
    ad: 's10-v-kaldirim3', olcek: 0.75, sekil, arka: '#F1E3C8', arkaAlfa: 0.85, arkaBulanik: 10,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.28 + 0.3 * clamp((y - y0) / 600)), 0.12, 0.01, 9), renkler: [[0, '#EAD9B8'], [1, '#B89B74']], yon: -0.04, aralik: 3.8, boy: [26, 70], kal: 1.1, alfa: 0.4, esikler: [0.3, 0.62] },
    kontur: null,
    detay: (c, api) => {
      let y = y0 + 22, sira = 0;
      while (y < y1) {
        const h = 26 + (y - y0) * 0.1;
        api.cizgi([[x0, y], [x1, y]], { renk: '#B0967A', kal: 1.2, alfa: 0.28 });
        const w = 90 + (y - y0) * 0.22;
        for (let x = x0 + (sira % 2) * w * 0.5; x < x1; x += w) api.cizgi([[x, y], [x - 3, y + h]], { renk: '#B0967A', kal: 1.1, alfa: 0.24 });
        y += h; sira++;
      }
    },
  });
}

// ---------------------------------------------------------------- bitkiler (bahçe)
function laleOge(renk) {
  const P = { kirmizi: ['#F1A096', '#C8524A', '#8E2E2B'], sari: ['#F8E08A', '#E2B23E', '#9A6A16'], pembe: ['#F6BFCD', '#DE7F9C', '#9C3F5C'], beyaz: ['#F4F0F7', '#C9BEDC', '#7B6AA8'] }[renk];
  const sekil = [
    ...svg('M-1.3 0L-1.3 -34L1.3 -34L1.3 0Z'),
    ...svg('M0 -2C-9 -8 -12 -20 -10 -30C-6 -22 -3 -12 0 -2Z'),
    ...svg('M-8 -40C-9 -48 -7 -55 -4 -58L-2 -52L0 -59L2 -52L4 -58C7 -55 9 -48 8 -40C6 -34 -6 -34 -8 -40Z'),
  ];
  return oge({
    ad: 's10-lale-' + renk, olcek: 2, sekil, arka: P[0], arkaAlfa: 0.85,
    tarama: [
      { sekil: svg('M-8 -40C-9 -48 -7 -55 -4 -58L-2 -52L0 -59L2 -52L4 -58C7 -55 9 -48 8 -40C6 -34 -6 -34 -8 -40Z'), ton: TON.kure(3, -50, 10), renkler: [[0, P[0]], [1, P[1]]], yon: -Math.PI / 2, aralik: 1.8, boy: [4, 10], kal: 0.9, alfa: 0.6, esikler: [0.2, 0.5] },
      { sekil: [...svg('M-1.3 0L-1.3 -34L1.3 -34L1.3 0Z'), ...svg('M0 -2C-9 -8 -12 -20 -10 -30C-6 -22 -3 -12 0 -2Z')], ton: () => 0.6, renkler: [[0, '#9CC79A'], [1, '#3E7C4F']], yon: -1.2, aralik: 1.8, boy: [4, 10], kal: 0.9, alfa: 0.7, esikler: [0.2] },
    ],
    kontur: P[2], konturKal: 1.2, pay: 4,
    detay: (c, api) => { api.cizgi([[0, -1], [0, -34]], { renk: '#3E7C4F', kal: 1.2 }); },
  });
}
function caliOge(R, tohum, renk) {
  // çiçekli çalı (bahçe) ya da dikenli çalı (karanlık)
  const kara = renk === 'kara';
  const P = kara ? TAC_PAL.koyu : TAC_PAL.yesil;
  return oge({
    ad: `s10-cali-${R}-${tohum}-${renk}`, olcek: 1.2, sekil: bulutsu(R, tohum, 8, 0.62), arka: P.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.kure(R * 0.2, -R * 0.3, R * 1.2), renkler: P.tara, yon: -0.8, aralik: 2.8, boy: [10, 26], esikler: [0.15, 0.45, 0.72], alfa: 0.58 },
    kontur: P.kontur, konturKal: 1.9,
    detay: (c, api) => {
      const r = rng(tohum * 3);
      if (kara) {
        // dikenler
        for (let i = 0; i < 22; i++) {
          const a = Math.PI + r() * Math.PI, d = R * r.ara(0.85, 1.0);
          const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.62;
          const L = r.ara(8, 16);
          api.cizgi([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.62]], { renk: '#2C3335', kal: 1.5, alfa: 0.85 });
        }
        for (let i = 0; i < 4; i++) {
          const x0 = r.ara(-R, R) * 0.8, pts = [[x0, 0]];
          let x = x0, y = 0;
          for (let k = 0; k < 5; k++) { x += r.ara(-14, 14); y -= r.ara(10, 18); pts.push([x, y]); }
          api.cizgi(pts, { renk: '#2C3335', kal: 1.6, alfa: 0.8 });
        }
      } else {
        const renkler = ['#F2B6C5', '#F7F2F8', '#F3D57F', '#E98A78'];
        for (let i = 0; i < 14; i++) {
          const a = Math.PI + r() * Math.PI, d = R * r.ara(0.2, 0.85);
          const x = Math.cos(a) * d, y = Math.sin(a) * d * 0.6;
          const k = r.sec(renkler);
          api.dolgu(elips(x, y, 5.5, 5.5), k, 0.95);
          api.halka(elips(x, y, 5.5, 5.5)[0].pts, { renk: '#9C3F5C', kal: 1.0, alfa: 0.6 });
          api.dolgu(elips(x, y, 1.8, 1.8), '#E2B23E', 1);
        }
      }
    },
  });
}

// ---------------------------------------------------------------- çeşme
function cesmeOge() {
  // sekizgen havuz (önden: üç yüz), ortada sütun, lotus tas, küçük kubbe başlık
  const sekil = [
    ...svg('M-170 0L-170 -62L-120 -74L120 -74L170 -62L170 0Z'), // havuz gövdesi
    ...svg('M-178 -60L-124 -76L124 -76L178 -60L172 -54L118 -68L-118 -68L-172 -54Z'), // havuz kenarı
    ...svg('M-16 -74L-14 -170L14 -170L16 -74Z'), // sütun
    ...svg('M-58 -170C-56 -186 -30 -194 0 -194C30 -194 56 -186 58 -170C40 -164 -40 -164 -58 -170Z'), // tas
    ...svg('M-10 -194L-10 -222C-10 -236 10 -236 10 -222L10 -194Z'),
    ...svg('M-14 -226C-14 -244 -6 -254 0 -260C6 -254 14 -244 14 -226Z'), // başlık
  ];
  return oge({
    ad: 's10-cesme', olcek: 1.25, sekil, arka: '#EFE8DA', arkaAlfa: 0.9,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.3 + 0.4 * Math.abs(x) / 170 + (x < 0 ? 0.12 : 0)), 0.08, 0.03, 3), renkler: [[0, '#EDE3D0'], [0.6, '#C9B99C'], [1, '#8F7E66']], yon: -Math.PI / 2, aralik: 2.8, boy: [10, 30], kal: 1.1, alfa: 0.5, esikler: [0.25, 0.55, 0.8] },
    kontur: '#7E6B52', konturKal: 2.1,
    detay: (c, api) => {
      // panel çizgileri ve çini kuşak
      for (const x of [-120, 120]) api.cizgi([[x, -68], [x, 0]], { renk: '#7E6B52', kal: 1.6, alfa: 0.8 });
      api.dolgu(cokgen([[-118, -52], [118, -52], [118, -38], [-118, -38]]), '#9FC7CF', 0.8);
      for (let x = -110; x < 118; x += 18) {
        api.dolgu(elips(x + 9, -45, 5, 5), '#3F8C86', 0.75);
      }
      api.cizgi([[-118, -52], [118, -52]], { renk: '#3F7F86', kal: 1.3 });
      api.cizgi([[-118, -38], [118, -38]], { renk: '#3F7F86', kal: 1.3 });
      for (const sx of [-1, 1]) api.cizgi([[sx * 125, -50], [sx * 165, -40]], { renk: '#3F7F86', kal: 1.2, alfa: 0.7 });
      api.dolgu(elips(0, -174, 50, 5), '#BFE3EA', 0.9);
      api.cizgi([[-128, -71], [128, -71]], { renk: '#89C3CC', kal: 2.2, alfa: 0.8 });
    },
  });
}
function suCiz(g, x, y, t, guc) {
  if (guc <= 0) return;
  // tastan havuza dökülen su kavisleri ve fıskiye
  g.save();
  const yuk = 34 * guc;
  for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
    const x0 = x + sx * (40 + k * 6), y0 = y - 172;
    const x1 = x + sx * (96 + k * 16) * guc, y1 = y - 72;
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      pts.push([lerp(x0, x1, u), y0 - Math.sin(u * Math.PI * 0.55) * 18 * guc + u * u * (y1 - y0)]);
    }
    konturCiz(g, pts, { renk: '#8CC9D6', kal: 2.2 - k * 0.4, alfa: 0.75 * guc, kapali: false, titreme: 0.5, tohum: 80 + k + (sx > 0 ? 9 : 0) });
  }
  // fıskiye: başlıktan yükselen ince su
  const f = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; f.push([x + Math.sin(u * 3 + t * 6) * 1.5, y - 260 - u * 60 * guc]); }
  konturCiz(g, f, { renk: '#9ED3DE', kal: 2, alfa: 0.7 * guc, kapali: false, titreme: 0.3, tohum: 91 });
  // damlacıklar
  const r = rng(3);
  g.globalCompositeOperation = 'screen';
  for (let i = 0; i < 26; i++) {
    const u = ((t * r.ara(0.8, 1.4) + r()) % 1);
    const sx = r() < 0.5 ? -1 : 1;
    const px = x + sx * lerp(40, r.ara(80, 150), u) * guc, py = y - 172 - Math.sin(u * Math.PI) * 30 * guc + u * 100;
    g.fillStyle = `rgba(240,252,255,${0.75 * guc * (1 - u)})`;
    g.beginPath(); g.arc(px, py, 2.2, 0, TAU); g.fill();
  }
  g.restore();
  M.hale(g, x, y - 120, 140, '#E6F7FA', 0.25 * guc);
}

// ---------------------------------------------------------------- çarşı
const KEMER = { x0: 770, n: 3, aci: 330, ayak: 42, taban: 1302, yuk: 390, kemerYuk: 230 }; // referans ekran
function kemerSirasiOge() {
  const { x0, n, aci, ayak, taban, yuk, kemerYuk } = KEMER;
  const ust = taban - yuk - kemerYuk - 70; // korniş üstü
  const x1 = x0 + n * aci + ayak;
  // dış gövde: dikdörtgen cephe (boşluklar ayrı çizilir)
  const cephe = cokgen([[x0 - 10, taban], [x0 - 10, ust], [x1 + 10, ust], [x1 + 10, taban]]);
  const bosluklar = [];
  for (let i = 0; i < n; i++) bosluklar.push(...sivriKemer(x0 + ayak + i * aci, taban, aci - ayak, yuk, kemerYuk));
  const sekil = [...cephe, ...bosluklar];
  return oge({
    ad: 's10-carsi-kemer', olcek: 1.1, sekil, kural: 'evenodd', arka: '#F2E6D2', arkaAlfa: 0.9,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.3 + 0.25 * clamp((y - ust) / (taban - ust))), 0.1, 0.01, 5), renkler: [[0, '#F0E2CA'], [0.6, '#D4BF9C'], [1, '#A88D66']], yon: -0.05, aralik: 3.2, boy: [20, 60], kal: 1.1, alfa: 0.45, esikler: [0.3, 0.62] },
    kontur: '#8A7158', konturKal: 2.2,
    detay: (c, api) => {
      // ablak: kemer yaylarında dönüşümlü kırmızı-krem taşlar
      for (let i = 0; i < n; i++) {
        const bx = x0 + ayak + i * aci, w = aci - ayak, r0 = w / 2;
        const cx = bx + r0;
        const yay = (k, d) => {
          // sivri kemerin iç eğrisini d kadar dışa ötele: iki yarım kubik
          const pts = [];
          for (let j = 0; j <= 24; j++) {
            const u = j / 24;
            const sol = u <= 0.5;
            const v = sol ? u * 2 : (u - 0.5) * 2;
            const P0 = sol ? [bx - d, taban - yuk] : [cx, taban - yuk - kemerYuk - d * 1.1];
            const P1 = sol ? [bx - d, taban - yuk - kemerYuk * 0.55] : [cx + r0 * 0.45 + d * 0.6, taban - yuk - kemerYuk * 0.85 - d];
            const P2 = sol ? [bx + r0 * 0.55 - d * 0.6, taban - yuk - kemerYuk * 0.85 - d] : [bx + w + d, taban - yuk - kemerYuk * 0.55];
            const P3 = sol ? [cx, taban - yuk - kemerYuk - d * 1.1] : [bx + w + d, taban - yuk];
            const q = 1 - v;
            pts.push([q * q * q * P0[0] + 3 * q * q * v * P1[0] + 3 * q * v * v * P2[0] + v * v * v * P3[0], q * q * q * P0[1] + 3 * q * q * v * P1[1] + 3 * q * v * v * P2[1] + v * v * v * P3[1]]);
          }
          return pts;
        };
        const ic = yay(0, 0), dis = yay(0, 30);
        const parca = 11;
        for (let k = 0; k < parca; k++) {
          const a0 = Math.floor((k / parca) * 24), a1 = Math.floor(((k + 1) / parca) * 24);
          const poly = [...ic.slice(a0, a1 + 1), ...dis.slice(a0, a1 + 1).reverse()];
          api.tara([{ pts: poly, kapali: true }], { ton: () => (k % 2 ? 0.3 : 0.75), renkler: k % 2 ? [[0, '#F4E9D6'], [1, '#D8C3A0']] : [[0, '#E9A08F'], [1, '#A84A3E']], yon: -0.6, aralik: 2.2, boy: [6, 16], kal: 1.0, alfa: 0.7, esikler: [0.2, 0.5] });
          api.cizgi([ic[a0], dis[a0]], { renk: '#8A5A44', kal: 1.2, alfa: 0.8 });
        }
        api.cizgi(dis, { renk: '#8A5A44', kal: 1.7, alfa: 0.85 });
        // ayak başlıkları
        api.cizgi([[bx - 22, taban - yuk + 4], [bx + 6, taban - yuk + 4]], { renk: '#8A7158', kal: 1.8 });
        api.cizgi([[bx + w - 6, taban - yuk + 4], [bx + w + 22, taban - yuk + 4]], { renk: '#8A7158', kal: 1.8 });
      }
      // korniş ve mazgallar
      api.cizgi([[x0 - 14, ust + 34], [x1 + 14, ust + 34]], { renk: '#8A7158', kal: 2 });
      api.cizgi([[x0 - 14, ust + 44], [x1 + 14, ust + 44]], { renk: '#8A7158', kal: 1.4, alfa: 0.8 });
      for (let x = x0; x < x1; x += 26) api.cizgi([[x, ust + 34], [x + 13, ust + 44]], { renk: '#A08060', kal: 1.1, alfa: 0.55 });
    },
  });
}
function kemerIcOge() {
  // dükkân içleri: sıcak, loş (arkada raflar)
  const { x0, n, aci, ayak, taban, yuk, kemerYuk } = KEMER;
  const sekil = [];
  for (let i = 0; i < n; i++) sekil.push(...sivriKemer(x0 + ayak + i * aci, taban, aci - ayak, yuk, kemerYuk));
  return oge({
    ad: 's10-carsi-ic', olcek: 1.0, sekil, arka: '#E7B97E', arkaAlfa: 0.9,
    tarama: { ton: (x, y) => clamp(0.45 + 0.4 * clamp((taban - y) / (yuk + kemerYuk))), renkler: [[0, '#E2A866'], [0.6, '#A7663A'], [1, '#6B3E22']], yon: -Math.PI / 2 + 0.1, aralik: 2.8, boy: [20, 50], kal: 1.15, alfa: 0.55, esikler: [0.25, 0.55, 0.8] },
    kontur: null,
    detay: (c, api) => {
      for (let i = 0; i < n; i++) {
        const bx = x0 + ayak + i * aci, w = aci - ayak;
        for (const yy of [taban - 120, taban - 200]) {
          api.cizgi([[bx + 10, yy], [bx + w - 10, yy]], { renk: '#5C3820', kal: 2, alfa: 0.7 });
          for (let x = bx + 18; x < bx + w - 18; x += 22) api.dolgu(yuvarlakDikdortgen(x, yy - 26, 14, 26, 5), ['#C8524A', '#3F8C86', '#E2B23E', '#7D6BA6'][Math.floor((x + yy) / 22) % 4], 0.55);
        }
      }
    },
  });
}
function tenteOge(r1, r2, ad) {
  // çizgili tente: üst kenar 236, alt kenar daha geniş ve dilimli; yerel (0,0) üst orta
  const W0 = KEMER.aci - KEMER.ayak - 6, W1 = W0 + 40, Hh = 84;
  const alt = [];
  const n = 8;
  for (let i = 0; i <= n; i++) {
    const x = -W1 / 2 + (i / n) * W1;
    alt.push([x, Hh]);
    if (i < n) alt.push([x + W1 / n / 2, Hh + 14]);
  }
  const sekil = cokgen([[-W0 / 2, 0], [W0 / 2, 0], ...alt.reverse()]);
  return oge({
    ad, olcek: 1.2, sekil, arka: r2, arkaAlfa: 0.85,
    tarama: [
      ...Array.from({ length: 6 }, (_, i) => ({
        sekil: cokgen([[-W0 / 2 + (i * 2 * W0) / 12, 0], [-W0 / 2 + ((i * 2 + 1) * W0) / 12, 0], [-W1 / 2 + ((i * 2 + 1) * W1) / 12, Hh + 14], [-W1 / 2 + (i * 2 * W1) / 12, Hh + 14]]),
        ton: (x, y) => 0.55 + 0.3 * (y / Hh), renkler: [[0, r1], [1, r1]], yon: Math.PI / 2 - 0.1, aralik: 2.4, boy: [10, 30], kal: 1.1, alfa: 0.75, esikler: [0.2, 0.5, 0.8],
      })),
      { ton: (x, y) => 0.2 + 0.5 * (y / Hh), renkler: [[0, '#F7EFE2'], [1, '#C9B79A']], yon: 0.1, aralik: 3, boy: [14, 40], kal: 1, alfa: 0.35, esikler: [0.35, 0.6] },
    ],
    kontur: '#6E4A32', konturKal: 1.9,
  });
}
function tezgahOge() {
  return oge({
    ad: 's10-tezgah', olcek: 1.2, sekil: [...cokgen([[-136, 0], [-136, -64], [136, -64], [136, 0]]), ...cokgen([[-144, -64], [-144, -74], [144, -74], [144, -64]])],
    arka: '#C9925E', arkaAlfa: 0.88,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.45 + 0.3 * (y + 60) / 60), 0.1, 0.03, 2), renkler: [[0, '#C9925E'], [1, '#6E4426']], yon: 0.02, aralik: 2.6, boy: [20, 60], kal: 1.1, alfa: 0.55, esikler: [0.2, 0.5, 0.78] },
    kontur: '#4E2E1A', konturKal: 1.9,
    detay: (c, api) => { for (const x of [-68, 0, 68]) api.cizgi([[x, -62], [x, -2]], { renk: '#4E2E1A', kal: 1.2, alfa: 0.6 }); },
  });
}
function fenerOge() {
  // pirinç fener: üstte kubbe ve halka, cam gövde (ışık), altta damla uç; yerel (0,0) asma halkası
  const sekil = [
    ...svg('M-3 0A3 3 0 1 1 3 0A3 3 0 1 1 -3 0Z'),
    ...svg('M-14 18C-14 8 -6 3 0 3C6 3 14 8 14 18Z'),
    ...svg('M-16 18L16 18L12 52L-12 52Z'),
    ...svg('M-12 52L12 52L4 62L0 70L-4 62Z'),
  ];
  return oge({
    ad: 's10-fener', olcek: 2.2, sekil, arka: '#E9C27A', arkaAlfa: 0.9,
    tarama: [
      { sekil: [...svg('M-14 18C-14 8 -6 3 0 3C6 3 14 8 14 18Z'), ...svg('M-12 52L12 52L4 62L0 70L-4 62Z')], ton: TON.kure(5, 10, 18), renkler: [[0, '#F0CF86'], [1, '#9A6A16']], yon: -1, aralik: 1.8, boy: [4, 10], kal: 0.9, alfa: 0.7, esikler: [0.2, 0.5] },
      { sekil: svg('M-16 18L16 18L12 52L-12 52Z'), ton: (x) => 0.2 + 0.25 * Math.abs(x) / 16, renkler: [[0, '#FFF3C4'], [1, '#F2C14E']], yon: Math.PI / 2, aralik: 2, boy: [6, 14], kal: 0.9, alfa: 0.55, esikler: [0.3] },
    ],
    kontur: '#7A5212', konturKal: 1.6,
    detay: (c, api) => { for (const x of [-6, 6]) api.cizgi([[x, 19], [x * 0.75, 51]], { renk: '#9A6A16', kal: 1.1, alfa: 0.8 }); },
  });
}
function teraziCiz(g, x, y, t, egim) {
  // tezgâh üstünde terazi: dikme, kol, iki kefe (kalemle canlı çizilir)
  const kol = 46, a = egim;
  const tepe = [x, y - 92];
  konturCiz(g, [[x, y], [x, y - 92]], { renk: '#7A5212', kal: 2.4, kapali: false, titreme: 0.3, tohum: 1 });
  konturCiz(g, [[x - 16, y], [x + 16, y]], { renk: '#7A5212', kal: 2.4, kapali: false, titreme: 0.3, tohum: 2 });
  const L = [tepe[0] - Math.cos(a) * kol, tepe[1] - Math.sin(a) * kol], R = [tepe[0] + Math.cos(a) * kol, tepe[1] + Math.sin(a) * kol];
  konturCiz(g, [L, R], { renk: '#7A5212', kal: 2.4, kapali: false, titreme: 0.3, tohum: 3 });
  for (const [p, i] of [[L, 0], [R, 1]]) {
    const kx = p[0], ky = p[1] + 40;
    konturCiz(g, [[p[0], p[1]], [kx - 14, ky]], { renk: '#9A6A16', kal: 1.2, kapali: false, titreme: 0.2, tohum: 4 + i });
    konturCiz(g, [[p[0], p[1]], [kx + 14, ky]], { renk: '#9A6A16', kal: 1.2, kapali: false, titreme: 0.2, tohum: 6 + i });
    g.fillStyle = 'rgba(226,178,62,0.85)';
    g.beginPath(); g.ellipse(kx, ky, 17, 5, 0, 0, Math.PI); g.fill();
    konturCiz(g, elips(kx, ky + 1, 17, 5, 30)[0].pts.slice(8, 24), { renk: '#7A5212', kal: 1.6, kapali: false, titreme: 0.2, tohum: 8 + i });
    if (i === 1) { g.fillStyle = 'rgba(200,82,74,0.9)'; g.beginPath(); g.arc(kx, ky - 6, 6, 0, TAU); g.fill(); }
  }
  g.fillStyle = 'rgba(226,178,62,0.95)';
  g.beginPath(); g.arc(tepe[0], tepe[1], 3.6, 0, TAU); g.fill();
}
function sepetOge() {
  // örgü sepet (sap üstte), içinde meyveler; yerel (0,0) sapın tepesi
  const sekil = [...svg('M-26 30L26 30L20 58C18 63 -18 63 -20 58Z')];
  return oge({
    ad: 's10-sepet', olcek: 2.4, sekil, arka: '#D9AE72', arkaAlfa: 0.9,
    tarama: { ton: (x, y) => 0.3 + 0.4 * ((y - 30) / 30), renkler: [[0, '#D6A866'], [1, '#7A5228']], yon: 0.6, aralik: 2.2, boy: [6, 14], kal: 1, alfa: 0.65, esikler: [0.2, 0.5], gecisAci: 1.2 },
    kontur: '#5C3A1C', konturKal: 1.6, pay: 30,
    detay: (c, api) => {
      api.cizgi([[-22, 30], [-16, 4], [0, -1], [16, 4], [22, 30]], { renk: '#7A5228', kal: 2.4 });
      for (const y of [40, 50]) api.cizgi([[-24, y], [24, y]], { renk: '#7A5228', kal: 1.1, alfa: 0.6 });
    },
  });
}

// çarşı damındaki küçük kubbeler (kurşun gri-mavi) ve arkada ince minare
function kubbeOge() {
  const sekil = [...svg('M-62 0L-62 -26L62 -26L62 0Z'), ...svg('M-58 -26C-58 -78 -30 -104 0 -106C30 -104 58 -78 58 -26Z'), ...svg('M-3 -104L-3 -128L3 -128L3 -104Z'), ...svg('M0 -140C5 -140 8 -134 6 -129C10 -131 9 -124 4 -124L-4 -124C-9 -124 -10 -131 -6 -129C-8 -134 -5 -140 0 -140Z')];
  return oge({
    ad: 's10-kubbe', olcek: 1.2, sekil, arka: '#C9D0E2', arkaAlfa: 0.88,
    tarama: [
      { sekil: svg('M-58 -26C-58 -78 -30 -104 0 -106C30 -104 58 -78 58 -26Z'), ton: TON.kure(18, -70, 70, { lx: 0.6, ly: -0.6 }), renkler: [[0, '#DCE2EE'], [0.55, '#97A2C2'], [1, '#5E6A92']], yonF: (x, y) => Math.atan2(y + 26, x) + Math.PI / 2, aralik: 2.6, boy: [10, 26], kal: 1.05, alfa: 0.6, esikler: [0.2, 0.5, 0.75] },
      { sekil: svg('M-62 0L-62 -26L62 -26L62 0Z'), ton: () => 0.45, renkler: [[0, '#EFE2CA'], [1, '#B49A76']], yon: -0.05, aralik: 2.8, boy: [12, 30], kal: 1.05, alfa: 0.5, esikler: [0.3, 0.6] },
    ],
    kontur: '#56607E', konturKal: 1.9,
    detay: (c, api) => { for (let x = -48; x <= 48; x += 24) api.dolgu(sivriKemer(x - 6, -4, 12, 10, 8), '#7A5A3C', 0.55); },
  });
}
function minareOge() {
  const sekil = [
    ...svg('M-26 0L-26 -80L26 -80L26 0Z'), ...svg('M-20 -80L-20 -560L20 -560L20 -80Z'),
    ...svg('M-34 -560L34 -560L28 -580L-28 -580Z'), ...svg('M-17 -580L-17 -700L17 -700L17 -580Z'),
    ...svg('M-22 -700L22 -700L0 -830Z'), ...svg('M-2 -830L-2 -860L2 -860L2 -830Z'),
  ];
  return oge({
    ad: 's10-minare', olcek: 1.0, sekil, arka: '#E9E2EE', arkaAlfa: 0.85,
    tarama: { ton: TON.silindir(-24, 24, { ortam: 0.2 }), renkler: [[0, '#EDE6F0'], [0.6, '#B9B2CF'], [1, '#8A83AA']], yon: -Math.PI / 2, aralik: 2.8, boy: [16, 44], kal: 1.05, alfa: 0.5, esikler: [0.3, 0.6] },
    kontur: '#7D76A2', konturKal: 1.8,
    detay: (c, api) => { for (const y of [-300, -420]) api.cizgi([[-20, y], [20, y]], { renk: '#7D76A2', kal: 1.3, alfa: 0.7 }); api.dolgu(cokgen([[-22, -700], [22, -700], [0, -830]]), '#8D9CC4', 0.45); },
  });
}

// uzak şehir silueti: kubbeler ve iki minare (soluk lila-mavi)
function sehirOge() {
  const parcalar = [
    ...svg('M0 0L0 -60L40 -60C40 -110 70 -140 110 -146C150 -140 180 -110 180 -60L220 -60L220 0Z'),
    ...svg('M-70 0L-70 -40C-70 -66 -54 -80 -36 -82C-18 -80 -2 -66 -2 -40L-2 0Z'),
    ...svg('M222 0L222 -40C222 -66 238 -80 256 -82C274 -80 290 -66 290 -40L290 0Z'),
    ...svg('M-110 0L-110 -200L-104 -214L-98 -200L-98 0Z'),
    ...svg('M318 0L318 -200L324 -214L330 -200L330 0Z'),
    ...svg('M106 -146L110 -166L114 -146Z'),
  ];
  return oge({
    ad: 's10-sehir', olcek: 1.0, sekil: parcalar, arka: '#DCDAEE', arkaAlfa: 0.85,
    tarama: { ton: () => 0.45, renkler: [[0, '#D0CDE6'], [1, '#9A97C4']], yon: -0.2, aralik: 3.2, boy: [14, 40], kal: 1.1, alfa: 0.45, esikler: [0.3, 0.6] },
    kontur: '#8C89BC', konturKal: 1.8,
    detay: (c, api) => {
      for (const x of [-104, 324]) for (const y of [-120, -160]) api.cizgi([[x - 9, y], [x + 9, y]], { renk: '#8C89BC', kal: 1.4 });
    },
  });
}

// ---------------------------------------------------------------- yerleşim ve hazırlık
export const CESME = { sx: 470, sy: 1288, s: 1.3 };
export const V = {};
export function bahceHazirla() {
  if (V.hazir) return;
  V.hazir = true;
  V.zKara = zeminKaranlik();
  V.zBahce = zeminBahce();
  V.yol = yolOge();
  V.kaldirim = kaldirimOge();
  V.bulutlar = [M.bulutOge(380, 51, 1.0), M.bulutOge(300, 57, 1.0)];
  V.cesme = cesmeOge();
  V.kemer = kemerSirasiOge();
  V.kemerIc = kemerIcOge();
  V.kubbe = kubbeOge();
  V.minare = minareOge();
  V.tenteler = [tenteOge('#C8524A', '#F4E9D6', 's10-tente-k'), tenteOge('#3F5E9C', '#F4E9D6', 's10-tente-l'), tenteOge('#3F8C6E', '#F6E7C0', 's10-tente-y')];
  V.tezgah = tezgahOge();
  V.fener = fenerOge();
  V.sepet = sepetOge();
  V.sehir = sehirOge();
  V.nar = M.meyveOge(10, 2, 'kirmizi');
  V.portakal = M.meyveOge(9, 2, 'altin');
  V.servi = serviOge(430, 1.1, 's10-servi');
  V.laleler = ['kirmizi', 'sari', 'pembe', 'beyaz'].map(laleOge);
  const r = rng(808);
  // KARANLIK: sisli arka sıra, koyu orta sıra, ortada kuru ağaç, kenarlarda dev eğri ağaçlar
  V.karaArka = [-20, 150, 330, 520, 700, 880, 1060, 1250, 1450, 1650].map((sx, i) => ({ sx: sx + r.ara(-25, 25), sy: 1130 + r.ara(-8, 8), f: 0.78, s: r.ara(0.85, 1.1), K: karanlikAgac(560, 120 + (i % 5), 1.0, 'sisli', { derin: 4 }), faz: r() * TAU }));
  V.karaOrta = [60, 260, 700, 900, 1120, 1380, 1600].map((sx, i) => ({ sx: sx + r.ara(-20, 20), sy: 1228 + r.ara(-6, 6), f: 0.88, s: r.ara(0.9, 1.15), K: karanlikAgac(760, 140 + (i % 4), 1.0, 'kara', { derin: 4 }), faz: r() * TAU }));
  V.karaOrtaAgac = karanlikAgac(720, 171, 1.0, 'kara', { derin: 4, dalSay: 3 });
  const devSol = karanlikAgac(1500, 181, 0.8, 'kara', { derin: 5, govdeAci: 0.22, yayilim: 0.7, kalin: 0.06 });
  const devSag = karanlikAgac(1400, 191, 0.8, 'kara', { derin: 5, govdeAci: -0.25, yayilim: 0.7, kalin: 0.06 });
  V.dev = [{ sx: -70, sy: 1600, f: 1.1, K: devSol, faz: 1 }, { sx: 1170, sy: 1610, f: 1.1, K: devSag, faz: 2 }];
  // BAHÇE: soldaki dev ağaç çiçek açar (çerçeve); arkada taçlı ağaçlar, ortada çiçekli ağaçlar, serviler
  V.cicekDev = cicekliAgac(devSol, 1500, 181, 0.8, 'pembe');
  const paletler = ['beyaz', 'yesil', 'pembe', 'yesil', 'beyaz', 'yesil', 'pembe'];
  V.tacArka = [0, 190, 360, 560, 760, 960, 1160, 1380, 1600].map((sx, i) => ({ sx: sx + r.ara(-15, 15), sy: 1136 + r.ara(-6, 6), f: 0.78, s: r.ara(0.72, 0.85), A: tacliAgac({ ad: `s10-tacA-${i % 4}`, boy: 520, tohum: 61 + (i % 4) * 5, palet: ['yesil', 'beyaz', 'yesil', 'pembe'][i % 4], olcek: 0.9 }), faz: r() * TAU }));
  V.tacOrta = [{ sx: 110, p: 'pembe' }, { sx: 840, p: 'yesil' }, { sx: 1080, p: 'beyaz' }, { sx: 1340, p: 'pembe' }, { sx: 1580, p: 'yesil' }].map((o, i) => ({ sx: o.sx, sy: 1232, f: 0.88, s: r.ara(1.0, 1.12), A: tacliAgac({ ad: `s10-tacO-${o.p}-${i}`, boy: 560, tohum: 81 + i * 7, palet: o.p, olcek: 1.0, meyve: o.p === 'yesil' ? V.portakal : null }), faz: r() * TAU }));
  V.serviler = [{ sx: 230, sy: 1270, f: 0.93, s: 1 }, { sx: 715, sy: 1270, f: 0.93, s: 1.02 }, { sx: -40, sy: 1262, f: 0.92, s: 0.86 }];
  // ön plan: dikenli çalı (karanlık) / çiçekli çalı (bahçe)
  V.on = [
    { sx: -10, sy: 1850, R: 250 }, { sx: 340, sy: 1930, R: 190 }, { sx: 700, sy: 1935, R: 170 },
    { sx: 1040, sy: 1860, R: 240 }, { sx: 1380, sy: 1910, R: 210 }, { sx: 1700, sy: 1860, R: 240 },
  ].map((o, k) => ({ ...o, f: 1.15, kara: caliOge(o.R, 11 + k, 'kara'), bahce: caliOge(o.R, 11 + k, 'bahce') }));
  // lale tarhları: yolun gerisinde, çeşmenin iki yanında
  V.tarh = [];
  for (let i = 0; i < 60; i++) {
    const sx = -140 + i * 21 + r.ara(-5, 5);
    if (sx > 740) break;
    if (Math.abs(sx - CESME.sx) < 240) continue;
    V.tarh.push({ sx, sy: 1290 + r.ara(-5, 4), o: V.laleler[i % 4], s: r.ara(1.0, 1.25) });
  }
  // gözler (karanlıkta, koyu boşluklarda)
  V.gozler = [[150, 1150, 0.8], [420, 1090, 0.78], [620, 1170, 0.84], [860, 1112, 0.8], [1000, 1196, 0.88], [330, 1240, 0.88], [780, 1250, 0.9]].map(([sx, sy, f], k) => ({ sx, sy, f, k }));
}

// ---------------------------------------------------------------- çizim: karanlık hâl
function sisBant(g, cam, t, sy, f, a, hiz, x0 = -200, x1 = 1900) {
  g.save(); katman(g, cam, f);
  const per = 520;
  const kay = ((t * hiz) % per + per) % per;
  for (let x = x0 - per + kay; x < x1; x += per) {
    g.save();
    g.translate(x, sy);
    g.scale(400, 56);
    const gg = g.createRadialGradient(0, 0, 0, 0, 0, 1);
    gg.addColorStop(0, `rgba(228,224,238,${a})`);
    gg.addColorStop(1, 'rgba(228,224,238,0)');
    g.fillStyle = gg;
    g.beginPath(); g.arc(0, 0, 1, 0, TAU); g.fill();
    g.restore();
  }
  g.restore();
}
export function karanlikCizV(g, cam, t, Z) {
  // gök kararması (saydam tampona örtü; bölge maskesiyle bindirilir)
  const gr = g.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, 'rgba(70,64,96,0.66)');
  gr.addColorStop(0.55, 'rgba(98,92,124,0.5)');
  gr.addColorStop(1, 'rgba(110,104,132,0.35)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.save(); katman(g, cam, 1); ogeCiz(g, V.zKara, 0, 0); g.restore();
  for (const a of V.karaArka) { g.save(); katman(g, cam, a.f); karanlikCiz(g, a.K, a.sx, a.sy, a.s, t, a.faz); g.restore(); }
  sisBant(g, cam, t, 1120, 0.8, 0.55, 14);
  gozCiz(g, cam, t, Z, 0.8);
  for (const a of V.karaOrta) { g.save(); katman(g, cam, a.f); karanlikCiz(g, a.K, a.sx, a.sy, a.s, t, a.faz); g.restore(); }
  g.save(); katman(g, cam, 0.95); karanlikCiz(g, V.karaOrtaAgac, CESME.sx, CESME.sy, 1, t, 3); g.restore();
  sisBant(g, cam, t, 1235, 0.9, 0.5, -10);
  gozCiz(g, cam, t, Z, 0.88);
  sisBant(g, cam, t, 1330, 1.0, 0.42, 18);
  for (const d of V.dev) { g.save(); katman(g, cam, d.f); karanlikCiz(g, d.K, d.sx, d.sy, 1, t, d.faz); g.restore(); }
  g.save(); katman(g, cam, 1.15);
  for (const o of V.on) ogeCiz(g, o.kara, o.sx, o.sy);
  g.restore();
  sisBant(g, cam, t, 1560, 1.1, 0.22, 24);
}
function gozCiz(g, cam, t, Z, fKat) {
  for (const e of V.gozler) {
    if (Math.abs(e.f - fKat) > 0.045) continue;
    const ac = an(t, Z.vah + 0.05 + e.k * 0.13, 0.25);
    if (ac <= 0) continue;
    const kirp = (t * 0.9 + e.k * 0.37) % 2.3;
    const kapak = kirp < 0.14 ? Math.abs(Math.cos((kirp / 0.14) * Math.PI)) : 1;
    const [x, y, z] = refEkran(cam, e.sx, e.sy, e.f);
    g.save();
    g.globalCompositeOperation = 'screen';
    for (const dx of [-8, 8]) {
      const gx = x + dx * z, gy = y;
      const gr = g.createRadialGradient(gx, gy, 0, gx, gy, 18 * z);
      gr.addColorStop(0, `rgba(240,232,160,${0.9 * ac})`);
      gr.addColorStop(0.25, `rgba(230,220,140,${0.35 * ac})`);
      gr.addColorStop(1, 'rgba(230,220,140,0)');
      g.fillStyle = gr;
      g.fillRect(gx - 18 * z, gy - 18 * z, 36 * z, 36 * z);
      g.fillStyle = `rgba(255,250,210,${ac})`;
      g.beginPath(); g.ellipse(gx, gy, 4.2 * z, 2.8 * z * kapak * ac, 0, 0, TAU); g.fill();
    }
    g.restore();
  }
}

// ---------------------------------------------------------------- çizim: bahçe ve çarşı
/** B: { varis(sx, sy) → bahçenin oraya vardığı an (sn), carsi: 0..1, tCarsi, fener: 0..1, terazi } */
export function bahceCizV(g, cam, t, B) {
  const va = (sx, sy) => B.varis(sx, sy);
  // sıcak, altın-mavi gök: ufukta altın, tepede açık mavi
  g.save();
  g.globalCompositeOperation = 'soft-light';
  const gk = g.createLinearGradient(0, 0, 0, H * 0.7);
  gk.addColorStop(0, 'rgba(120,160,220,0.5)');
  gk.addColorStop(1, 'rgba(255,214,150,0.55)');
  g.fillStyle = gk;
  g.fillRect(0, 0, W, H * 0.7);
  g.restore();
  M.hale(g, W * 0.82, H * 0.1, 760, '#FFEFC4', 0.55);
  g.save(); katman(g, cam, 0.5);
  ogeCiz(g, V.bulutlar[0], 760 + t * 6, 330, { alfa: 0.9 });
  ogeCiz(g, V.bulutlar[1], 1280 + t * 5, 520, { alfa: 0.85 });
  g.restore();
  // uzak şehir ve minare (çarşıyla belirir)
  if (B.carsi > 0) {
    g.save(); katman(g, cam, 0.86);
    acarak(g, V.minare, 1290, 1180, an(B.carsi, 0.18, 0.55, ease.outCubic), { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.12 });
    g.restore();
  }
  g.save(); katman(g, cam, 1); ogeCiz(g, V.zBahce, 0, 0);
  if (B.carsi > 0) acarak(g, V.kaldirim, 0, 0, an(B.carsi, 0.0, 0.75, ease.inOutSine), { mod: 'sil', yon: Math.PI, yumusak: 0.25 });
  g.restore();
  for (const a of V.tacArka) {
    const u = clamp((t - va(a.sx, a.sy)) / 0.55);
    g.save(); katman(g, cam, a.f); tacliCiz(g, a.A, a.sx, a.sy, { s: a.s, u, t, faz: a.faz }); g.restore();
  }
  for (const a of V.tacOrta) {
    const u = clamp((t - va(a.sx, a.sy)) / 0.55);
    g.save(); katman(g, cam, a.f); tacliCiz(g, a.A, a.sx, a.sy, { s: a.s, u, t, faz: a.faz }); g.restore();
  }
  for (const sv of V.serviler) {
    const u = clamp((t - va(sv.sx, sv.sy)) / 0.6);
    if (u <= 0) continue;
    g.save(); katman(g, cam, sv.f);
    ogeCiz(g, V.servi, sv.sx, sv.sy, { sy: ease.outBack(u, 1.4) * sv.s, sx: sv.s, r: Math.sin(t * 0.9 + sv.sx) * 0.008 });
    g.restore();
  }
  if (B.carsi > 0) carsiCiz(g, cam, t, B);
  {
    const u = clamp((t - va(CESME.sx, CESME.sy)) / 0.6);
    if (u > 0) {
      g.save(); katman(g, cam, 0.95);
      g.translate(CESME.sx, CESME.sy);
      g.scale(CESME.s, CESME.s);
      ogeCiz(g, V.cesme, 0, 0, { sy: ease.outBack(u, 1.5), sx: lerp(0.9, 1, u) });
      suCiz(g, 0, 0, t, an(t, va(CESME.sx, CESME.sy) + 0.3, 0.7));
      g.restore();
    }
  }
  g.save(); katman(g, cam, 1);
  acarak(g, V.yol, 0, 0, clamp((t - va(CESME.sx, YOL)) / 0.9), { mod: 'daire', merkez: [CESME.sx, 1340], yumusak: 0.3 });
  for (const l of V.tarh) {
    const u = pop(t, va(l.sx, l.sy) + 0.1, 0.45);
    if (u > 0) ogeCiz(g, l.o, l.sx, l.sy, { s: u * l.s, r: Math.sin(t * 1.5 + l.sx) * 0.05 });
  }
  g.restore();
}

/** Bahçenin ön plan çerçevesi: soldaki çiçekli dev ağaç, alttaki çiçekli çalılar, çarşı fener zinciri */
export function bahceOnPlan(g, cam, t, B) {
  const va = (sx, sy) => B.varis(sx, sy);
  const d = V.dev[0];
  g.save(); katman(g, cam, d.f);
  cicekliCiz(g, V.cicekDev, d.sx, d.sy, 1, t, clamp((t - va(150, 900)) / 1.0), d.faz);
  g.restore();
  // fener zinciri: çiçekli dalın ucundan çarşının damına
  if (B.carsi > 0) {
    const zu = an(B.carsi, 0.4, 0.5, ease.outCubic);
    if (zu > 0) {
      const [ax, ay] = refEkran(cam, 430, 420, 1.0), [bx, by] = refEkran(cam, 1280, 560, 0.97);
      const ex = lerp(ax, bx, zu), ey = lerp(ay, by, zu);
      const pts = [];
      for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([lerp(ax, ex, u), lerp(ay, ey, u) + Math.sin(u * Math.PI) * 120 * zu]); }
      konturCiz(g, pts, { renk: '#7A5212', kal: 1.6, kapali: false, titreme: 0.3, tohum: 5 });
      const renk = ['#E9A23B', '#C8524A', '#3F8C86', '#E2C23E', '#B5506E'];
      for (let i = 2; i < 30; i += 3) {
        const [px, py] = pts[i];
        const yan = B.fener * (0.8 + 0.2 * Math.sin(t * 6 + i));
        if (yan > 0) M.hale(g, px, py + 12, 40, '#FFE2A0', 0.55 * yan);
        g.fillStyle = rgba(renk[(i / 3) % 5 | 0], 0.92);
        g.beginPath(); g.ellipse(px, py + 12, 8, 11, 0, 0, TAU); g.fill();
        konturCiz(g, elips(px, py + 12, 8, 11)[0].pts, { renk: '#6E4A20', kal: 1.2, tohum: i });
        konturCiz(g, [[px, py], [px, py + 2]], { renk: '#6E4A20', kal: 1.2, kapali: false, tohum: i + 50 });
      }
    }
  }
  g.save(); katman(g, cam, 1.15);
  for (const o of V.on) {
    const u = pop(t, va(o.sx, Math.min(o.sy, 1600)) + 0.05, 0.5);
    if (u > 0) ogeCiz(g, o.bahce, o.sx, o.sy, { s: u });
  }
  g.restore();
}

function carsiCiz(g, cam, t, B) {
  const { x0, n, aci, ayak, taban, yuk, kemerYuk } = KEMER;
  const c = B.carsi;
  const ust = taban - yuk - kemerYuk - 70;
  g.save(); katman(g, cam, 0.97);
  const kur = an(c, 0, 0.5, ease.outCubic);
  // damdaki kubbeler (kemerlerden sonra yükselir)
  for (let i = 0; i < n; i++) {
    const cx = x0 + ayak + i * aci + (aci - ayak) / 2;
    const ku = an(c, 0.32 + i * 0.05, 0.4, ease.outBack);
    if (ku > 0) ogeCiz(g, V.kubbe, cx, ust + 4, { sy: ku, sx: lerp(0.85, 1, clamp(ku)) });
  }
  acarak(g, V.kemerIc, 0, 0, kur, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.12 });
  acarak(g, V.kemer, 0, 0, kur, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.12 });
  for (let i = 0; i < n; i++) {
    const cx = x0 + ayak + i * aci + (aci - ayak) / 2;
    const inis = an(c, 0.36 + i * 0.06, 0.4, ease.outBack);
    if (inis > 0) {
      const tepeY = taban - yuk - kemerYuk + 16;
      const fy = tepeY + 74 * inis;
      const sal = Math.sin(t * 1.6 + i) * 0.05;
      const fx = cx + Math.sin(sal) * 74;
      konturCiz(g, [[cx, tepeY], [fx, fy]], { renk: '#7A5212', kal: 1.5, kapali: false, titreme: 0.2, tohum: 40 + i });
      const yan = B.fener * (0.85 + 0.15 * Math.sin(t * 7 + i * 2));
      if (yan > 0) { M.hale(g, fx, fy + 38, 150, '#FFD98A', 0.6 * yan); M.hale(g, fx, fy + 38, 40, '#FFF6D6', 0.75 * yan); }
      ogeCiz(g, V.fener, fx, fy, { r: sal * 0.5, s: 1.15 });
    }
    const tu = an(c, 0.22 + i * 0.07, 0.45, ease.outBack);
    if (tu > 0) ogeCiz(g, V.tenteler[i], cx, taban - yuk + 14, { sy: tu, sx: lerp(0.8, 1, clamp(tu)) });
  }
  g.restore();
  g.save(); katman(g, cam, 0.98);
  for (let i = 0; i < n; i++) {
    const cx = x0 + ayak + i * aci + (aci - ayak) / 2;
    const su = an(c, 0.45 + i * 0.08, 0.14);
    if (su > 0) insanOn(g, cx + (i === 1 ? 26 : -16), taban - 8, { ...ON_DURUS, kol: [0.25, i === 2 ? 0.95 : 0.35], dirsek: [0.9, i === 2 ? 1.3 : 0.85], bas: Math.sin(t * 0.8 + i) * 0.05 }, { s: 0.66, alfa: su });
    const tu = an(c, 0.3 + i * 0.07, 0.4, ease.outBack);
    if (tu <= 0) continue;
    ogeCiz(g, V.tezgah, cx, taban + 4, { sy: tu });
    const my = taban - 74 + 4;
    if (i === 0) {
      for (let k = 0; k < 15; k++) {
        const row = k < 8 ? 0 : 1, kk = row ? k - 8 : k;
        const mx = cx - 98 + kk * 28 + (row ? 14 : 0), mmy = my - 9 - row * 16;
        const u = pop(t, B.tCarsi + 0.5 + k * 0.025, 0.4);
        if (u > 0) ogeCiz(g, k % 3 === 2 ? V.portakal : V.nar, mx, mmy, { s: u });
      }
    } else if (i === 1) {
      const renk = ['#C8524A', '#E2B23E', '#3F5E9C', '#3F8C86', '#B5506E', '#7D6BA6', '#E9A23B'];
      for (let k = 0; k < 7; k++) {
        const u = pop(t, B.tCarsi + 0.55 + k * 0.035, 0.4);
        if (u <= 0) continue;
        const kx = cx - 108 + k * 36;
        g.save(); g.translate(kx, my); g.scale(u, u);
        g.fillStyle = rgba(renk[k], 0.85);
        g.beginPath(); g.ellipse(0, -16, 15, 16, 0, 0, TAU); g.fill();
        konturCiz(g, elips(0, -16, 15, 16)[0].pts, { renk: '#4E2E1A', kal: 1.4, tohum: 50 + k });
        konturCiz(g, elips(0, -16, 6, 6.5)[0].pts, { renk: '#4E2E1A', kal: 1.1, tohum: 60 + k });
        g.restore();
      }
    } else {
      const renk = [['#E9A23B', '#B5651D'], ['#C8524A', '#8E2E2B'], ['#7D6BA6', '#4E3F7A'], ['#E2C23E', '#9A7A16']];
      for (let k = 0; k < 4; k++) {
        const u = pop(t, B.tCarsi + 0.6 + k * 0.05, 0.4);
        if (u <= 0) continue;
        const kx = cx - 112 + k * 34;
        g.save(); g.translate(kx, my); g.scale(u, u);
        g.fillStyle = rgba(renk[k][0], 0.9);
        g.beginPath(); g.moveTo(-15, 0); g.quadraticCurveTo(-7, -27, 0, -29); g.quadraticCurveTo(7, -27, 15, 0); g.closePath(); g.fill();
        konturCiz(g, [[-15, 0], [-7, -22], [0, -29], [7, -22], [15, 0]], { renk: renk[k][1], kal: 1.4, kapali: false, tohum: 70 + k });
        g.restore();
      }
      const tu2 = an(t, B.tCarsi + 0.65, 0.4);
      if (tu2 > 0) { g.save(); g.globalAlpha *= tu2; teraziCiz(g, cx + 70, my, t, B.terazi); g.restore(); }
    }
  }
  g.restore();
}

/** Çarşının önündeki alışverişçiler */
export function alisverisciler(g, cam, t, B) {
  if (B.carsi <= 0) return;
  const { x0, ayak, aci } = KEMER;
  g.save(); katman(g, cam, 0.99);
  const a1 = an(B.carsi, 0.5, 0.14);
  if (a1 > 0) insanOn(g, x0 + ayak + aci * 0.5 + 50, 1330, { ...ON_DURUS, kol: [0.15, 0.5], dirsek: [0.2, 1.1], bas: Math.sin(t * 1.1) * 0.04 }, { s: 0.64, arka: true, alfa: a1 });
  const a3 = an(B.carsi, 0.6, 0.14);
  if (a3 > 0) insanYan(g, x0 + ayak + aci * 1.5 + 40, 1334, { ...DURUS, bas: -0.05 + Math.sin(t * 1.3) * 0.04, omuz: [-0.05, 0.75], dirsek: [0.2, 0.9] }, { s: 0.64, yon: -1, alfa: a3 });
  g.restore();
}

export { sepetOge, KEMER };
