// Ortak motifler: sahneler arasında aynı görünmesi gereken öğeler.
//  - nurKuresi: imanın nuru (beyaz film çekirdek, altın konturlu, ışınlı, buğulu)
//  - marifetDeseni: sekiz kollu yıldız örgüsü (marifetullah: her çizgi tek merkeze çıkar)
//  - gul: muhabbetin gülü (açılma 0..1)
//  - nektar / halkaYayil: lezzet-i ruhaniye damlası ve altın halkalar
//  - agac, cicek, tomurcuk, kus, tepe, isinlar, parcaciklar, gunes
import { tuval, rng, clamp, lerp, ease, TAU, rgba, gurultu2, an, hashStr } from './temel.mjs';
import { oge, ogeCiz, ogeAcarak, konturCiz, darbe, tara, TON, PALET, FILM, bulutSekli } from './kalem.mjs';
import { svg, elips, daire, yaprak, donustur, cokgen, yildiz, path2d, sinir, yolCiz } from './sekil.mjs';

export const ALTIN = '#D9A93F';
export const ALTIN_KOYU = '#A87B22';
export const NUR = '#FFF6D6';

// ---------------------------------------------------------------- ışık yardımcıları
/** Yumuşak ışık halesi (ekleme karışımı) */
export function hale(ctx, x, y, r, renk = '#FFF3C4', guc = 0.6, karisim = 'screen') {
  if (guc <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = karisim;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(renk, guc));
  g.addColorStop(0.35, rgba(renk, guc * 0.45));
  g.addColorStop(1, rgba(renk, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

/** Kalem ışınları: merkezden dışa ince, uçları incelen çizgiler (yavaş döner) */
export function isinlar(ctx, x, y, r0, r1, t, { sayi = 28, renk = ALTIN, alfa = 0.55, kal = 2.2, hiz = 0.05, tohum = 3, titresim = 0.25 } = {}) {
  const r = rng(tohum);
  ctx.save();
  for (let i = 0; i < sayi; i++) {
    const a = (i / sayi) * TAU + t * hiz + r.ara(-0.06, 0.06);
    const uz = lerp(r0, r1, r.ara(0.55, 1)) * (1 + titresim * 0.3 * Math.sin(t * 1.3 + i * 1.7));
    const b0 = r0 * r.ara(1, 1.15);
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const d = lerp(b0, uz, k / 12);
      pts.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
    }
    ctx.fillStyle = rgba(renk, alfa * r.ara(0.55, 1));
    darbe(ctx, pts, kal * r.ara(0.7, 1.3), { incelme: 0.45, sivri: 0.6 });
  }
  ctx.restore();
}

/** Uçuşan ışık zerreleri (yukarı süzülür) */
export function parcaciklar(ctx, x, y, w, h, t, { sayi = 40, renk = '#FFF1B8', boy = 3.2, alfa = 0.8, hiz = 18, tohum = 5 } = {}) {
  const r = rng(tohum);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < sayi; i++) {
    const px = x + r() * w + Math.sin(t * r.ara(0.3, 0.8) + i) * 12;
    const faz = r();
    const py = y + h - (((faz * h + t * hiz * r.ara(0.6, 1.4)) % h) + h) % h;
    const yasam = Math.sin(((py - y) / h) * Math.PI);
    const b = boy * r.ara(0.5, 1.3);
    const g = ctx.createRadialGradient(px, py, 0, px, py, b * 3);
    g.addColorStop(0, rgba(renk, alfa * yasam));
    g.addColorStop(0.4, rgba(renk, alfa * 0.35 * yasam));
    g.addColorStop(1, rgba(renk, 0));
    ctx.fillStyle = g;
    ctx.fillRect(px - b * 3, py - b * 3, b * 6, b * 6);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- nur küresi (iman)
/** Nur küresi çekirdeği (önbellekli): çıplak film, kenara yakın soluk sarı kısa tarama, ince altın kontur */
export function nurCekirdek(r, olcek = 1) {
  return oge({
    ad: 'nur-cekirdek-' + r, olcek, sekil: elips(0, 0, r, r), arka: '#FFF1C9', arkaAlfa: 0.55, arkaBulanik: r * 0.25, arkaTasma: false,
    tarama: { ton: TON.radyal(0, 0, r, 0, 0.9), renkler: [[0, '#F8E7A8'], [1, '#E7C565']], yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 3.2, boy: [10, 26], kal: 1.1, alfa: 0.45, esikler: [0.45, 0.75] },
    kontur: ALTIN_KOYU, konturKal: 2.4, konturAlfa: 0.75,
  });
}
/** Nur küresinin kalemle taranmış halesi: çekirdeğin çevresinde dışa doğru seyrelen kısa altın çizgiler */
export function nurAura(r, olcek = 1) {
  const R = r * 1.9;
  return oge({
    ad: 'nur-aura-' + r, olcek, sekil: elips(0, 0, R, R), zemin: null, arka: null,
    tarama: { ton: (x, y) => { const d = Math.hypot(x, y) / r; return d < 1.02 ? 0 : clamp(1.15 - (d - 1) * 1.15); }, renkler: [[0, '#F3DB8C'], [1, '#D9A93F']], yonF: (x, y) => Math.atan2(y, x), aralik: 3.6, boy: [10, 30], kal: 1.15, alfa: 0.55, esikler: [0.2, 0.55], karisim: 'source-over' },
    kontur: null, pay: 4,
  });
}
/** Nur küresi: x, y merkez; r yarıçap; t zaman; guc 0..1 (parlaklık) */
export function nurKuresi(ctx, x, y, r, t, { guc = 1, isin = true, olcek = 1, alfa = 1 } = {}) {
  if (alfa <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alfa;
  const nefes = 1 + 0.018 * Math.sin(t * 2.1);
  hale(ctx, x, y, r * 4.6 * (0.8 + 0.2 * guc), '#FFF0B8', 0.42 * guc);
  hale(ctx, x, y, r * 2.1, '#FFFBEA', 0.6 * guc);
  const rk = Math.round(r / 5) * 5;
  ogeCiz(ctx, nurAura(rk, olcek), x, y, { s: (r / rk) * nefes * (0.92 + 0.08 * guc), r: t * 0.04, alfa: 0.85 * guc });
  if (isin) {
    isinlar(ctx, x, y, r * 1.25, r * 2.7 * (0.7 + 0.3 * guc), t, { sayi: 26, alfa: 0.45 * guc, kal: Math.max(1.6, r * 0.02), tohum: 7 });
    isinlar(ctx, x, y, r * 1.2, r * 1.9 * (0.7 + 0.3 * guc), -t * 0.6, { sayi: 18, renk: '#EBC867', alfa: 0.35 * guc, kal: Math.max(1.3, r * 0.015), tohum: 11 });
  }
  const c = nurCekirdek(rk, olcek);
  ogeCiz(ctx, c, x, y, { s: (r / rk) * nefes });
  hale(ctx, x - r * 0.2, y - r * 0.25, r * 0.95, '#FFFFFF', 0.55 * guc);
  ctx.restore();
}

// ---------------------------------------------------------------- marifet deseni (8 kollu yıldız örgüsü)
/** Desenin çizgileri (merkez 0,0, yarıçap R): dış halka, iki iç içe sekiz köşeli yıldız, merkeze çıkan kollar */
export function marifetGeometri(R) {
  const yollar = [];
  // dış çift halka
  yollar.push({ pts: elips(0, 0, R, R)[0].pts, kapali: true, katman: 0 });
  yollar.push({ pts: elips(0, 0, R * 0.93, R * 0.93)[0].pts, kapali: true, katman: 0 });
  // sekiz köşeli yıldız (iki kare)
  const kare = (r, a0) => [0, 1, 2, 3].map((k) => [r * Math.cos(a0 + (k * Math.PI) / 2), r * Math.sin(a0 + (k * Math.PI) / 2)]);
  yollar.push({ pts: kare(R * 0.86, Math.PI / 4), kapali: true, katman: 1 });
  yollar.push({ pts: kare(R * 0.86, 0), kapali: true, katman: 1 });
  // iç yıldız (16 köşeli rozet)
  yollar.push({ pts: yildiz(0, 0, 8, R * 0.6, R * 0.44, Math.PI / 8)[0].pts, kapali: true, katman: 2 });
  yollar.push({ pts: yildiz(0, 0, 8, R * 0.34, R * 0.22, 0)[0].pts, kapali: true, katman: 3 });
  // merkeze çıkan kollar (her biri dış yıldız ucundan merkeze)
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * TAU + Math.PI / 8;
    const r0 = k % 2 ? R * 0.44 : R * 0.6;
    yollar.push({ pts: [[Math.cos(a) * r0, Math.sin(a) * r0], [Math.cos(a) * R * 0.08, Math.sin(a) * R * 0.08]], kapali: false, katman: 4 });
  }
  yollar.push({ pts: elips(0, 0, R * 0.08, R * 0.08)[0].pts, kapali: true, katman: 4 });
  return yollar;
}
/** Marifet deseni dolgusu (önbellekli): yıldız uçlarında açık yeşil-mavi tarama, rozet içinde altın buğu */
export function marifetDolgu(R, olcek = 1) {
  return oge({
    ad: 'marifet-dolgu-' + R, olcek, sekil: elips(0, 0, R * 0.93, R * 0.93), zemin: FILM, arka: '#CFE6E0', arkaAlfa: 0.7, arkaTasma: false, arkaBulanik: 10,
    tarama: [
      { sekil: yildiz(0, 0, 8, R * 0.86, R * 0.658, 0), ton: TON.radyal(0, 0, R * 0.86, 0.1, 0.65), renkler: [[0, '#BFE0D8'], [1, '#5FA59B']], yonF: (x, y) => Math.atan2(y, x), aralik: 3.4, boy: [14, 40], esikler: [0.3, 0.6], alfa: 0.38 },
      { sekil: elips(0, 0, R * 0.42, R * 0.42), ton: TON.radyal(0, 0, R * 0.42, 0.2, 0.7), renkler: [[0, '#F6E2A0'], [1, ALTIN]], yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 3, boy: [10, 24], esikler: [0.3], alfa: 0.45 },
    ],
    kontur: null,
  });
}
/**
 * Marifet desenini çizer. cizim 0..1: çizgilerin çizilme ilerlemesi (katman katman), dolgu 0..1, r dönüş.
 */
export function marifetDeseni(ctx, x, y, R, t, { cizim = 1, dolgu = 1, r = 0, renk = '#2F6F67', altin = ALTIN_KOYU, alfa = 1, olcek = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.globalAlpha *= alfa;
  if (dolgu > 0) ogeCiz(ctx, marifetDolgu(Math.round(R), olcek), 0, 0, { alfa: dolgu });
  const g = marifetGeometri(R);
  const katmanlar = 5;
  g.forEach((yol, i) => {
    const k0 = yol.katman / katmanlar;
    const u = clamp((cizim - k0 * 0.75) / 0.3);
    if (u <= 0) return;
    const kal = Math.max(1.6, R * (yol.katman === 4 ? 0.006 : 0.009));
    konturCiz(ctx, yol.pts, { renk: yol.katman >= 3 ? altin : renk, kal, alfa: 0.88, kapali: yol.kapali, titreme: 0.4, tohum: 40 + i, cizim: ease.inOutCubic(u) });
  });
  ctx.restore();
}

// ---------------------------------------------------------------- gül (muhabbet)
function gulYapragiSekli(L, W) {
  // taç yaprak: dipte dar, uçta geniş ve yuvarlak, kenarı hafif dalgalı
  return svg(`M0 0C${-W * 0.35} ${-L * 0.2} ${-W * 0.62} ${-L * 0.62} ${-W * 0.48} ${-L * 0.88}C${-W * 0.3} ${-L * 1.04} ${-W * 0.05} ${-L * 1.0} 0 ${-L * 0.96}C${W * 0.05} ${-L * 1.0} ${W * 0.3} ${-L * 1.04} ${W * 0.48} ${-L * 0.88}C${W * 0.62} ${-L * 0.62} ${W * 0.35} ${-L * 0.2} 0 0Z`);
}
function gulYapragi(L, W, koyu, olcek) {
  return oge({
    ad: `gul-yaprak-${L}-${W}-${koyu}`, olcek, sekil: gulYapragiSekli(L, W), arka: koyu ? '#E893A8' : '#F2B8C6', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, 0, 0, -L, koyu ? 0.95 : 0.75, 0.2), 0.08, 0.04, L), renkler: [[0, '#F0AFC0'], [0.6, PALET.gul], [1, PALET.gulKoyu]], yon: -Math.PI / 2, aralik: 2.9, boy: [12, 34], kal: 1.15, alfa: 0.55, esikler: [0.2, 0.5, 0.78] },
    kontur: '#9C3F5C', konturKal: 1.9, titreme: 0.35,
  });
}
/** Gül: (x, y) merkez, R taç yarıçapı, acilma 0 (gonca) .. 1 (tam açık), t zaman */
export function gul(ctx, x, y, R, acilma, t, { olcek = 1, alfa = 1, r = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.globalAlpha *= alfa;
  const halkalar = [
    { n: 9, L: R * 1.0, W: R * 0.62, a0: 0.1, koyu: false, gec: 0.45 },
    { n: 7, L: R * 0.78, W: R * 0.55, a0: 0.5, koyu: false, gec: 0.3 },
    { n: 6, L: R * 0.58, W: R * 0.48, a0: 0.2, koyu: true, gec: 0.15 },
    { n: 5, L: R * 0.4, W: R * 0.42, a0: 0.9, koyu: true, gec: 0.0 },
  ];
  for (const h of halkalar) {
    const sp = gulYapragi(Math.round(h.L), Math.round(h.W), h.koyu, olcek);
    const u = ease.outBack(clamp((acilma - h.gec) / (1 - h.gec * 0.9)), 1.2);
    if (u <= 0) continue;
    for (let k = 0; k < h.n; k++) {
      const a = h.a0 + (k / h.n) * TAU + Math.sin(t * 0.8 + k) * 0.01;
      // kapalıyken yapraklar içe kıvrık (kısa ve dar görünür)
      const sy = lerp(0.25, 1, u), sx = lerp(0.55, 1, u);
      ogeCiz(ctx, sp, 0, 0, { r: a, sx, sy });
    }
  }
  // gonca merkezi: sarmal
  const merkez = oge({
    ad: 'gul-merkez-' + Math.round(R), olcek, sekil: elips(0, 0, R * 0.22, R * 0.22), arka: '#E27F9A',
    tarama: { ton: TON.kure(0, 0, R * 0.22), renkler: [[0, PALET.gul], [1, PALET.gulKoyu]], yonF: (px, py) => Math.atan2(py, px) + Math.PI / 2, aralik: 2.6, boy: [8, 20], esikler: [0.2, 0.55] },
    kontur: '#9C3F5C', konturKal: 1.8,
    detay: (c, api) => {
      const pts = [];
      for (let k = 0; k < 60; k++) { const a = k * 0.22, rr = R * 0.2 * (1 - k / 64); pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      api.cizgi(pts, { renk: '#8E3552', kal: 1.6 });
    },
  });
  ogeCiz(ctx, merkez, 0, 0, { s: lerp(1.25, 1, clamp(acilma)) });
  ctx.restore();
}

// ---------------------------------------------------------------- nektar damlası ve halkalar
export function nektarDamla(r, olcek = 1) {
  return oge({
    ad: 'nektar-' + r, olcek, sekil: svg(`M0 ${-r * 2.3}C${r * 0.35} ${-r * 1.45} ${r} ${-r * 0.8} ${r} 0A${r} ${r} 0 0 1 ${-r} 0C${-r} ${-r * 0.8} ${-r * 0.35} ${-r * 1.45} 0 ${-r * 2.3}Z`),
    arka: '#F6D27A', arkaAlfa: 0.85,
    tarama: { ton: TON.kure(r * 0.2, -r * 0.4, r * 1.3), renkler: [[0, '#F4D58A'], [1, '#C98F22']], yon: -1.2, aralik: 2.6, boy: [8, 22], esikler: [0.3, 0.65] },
    kontur: '#9A6A16', konturKal: 1.9,
    detay: (c, api) => { api.dolgu(elips(-r * 0.35, -r * 0.35, r * 0.22, r * 0.32), '#FFFDF2', 0.95); },
  });
}
/** Altın halkaların yayılması: t0'dan itibaren her 'ara' saniyede bir halka */
export function halkaYayil(ctx, x, y, t, t0, { sayi = 4, ara = 0.45, Rmax = 520, sure = 2.2, basik = 0.38, renk = ALTIN, kal = 3 } = {}) {
  for (let i = 0; i < sayi; i++) {
    const u = (t - t0 - i * ara) / sure;
    if (u <= 0 || u >= 1) continue;
    const e = ease.outCubic(u);
    const R = Rmax * e;
    const pts = elips(x, y, R, R * basik)[0].pts;
    konturCiz(ctx, pts, { renk, kal: kal * (1 - u * 0.6), alfa: 0.75 * (1 - u), kapali: true, titreme: 0.6, tohum: 70 + i });
  }
}

// ---------------------------------------------------------------- bitkiler
/** Beyaz beş yapraklı çiçek (lila kontur, sarı göbek) — katalog örneğindeki gibi */
export function cicekOge(r, olcek = 1, renk = 'beyaz') {
  const R = {
    beyaz: { arka: '#EEE9F6', tara: [[0, '#E2DAF0'], [1, '#9F92C6']], kontur: '#7B6AA8' },
    pembe: { arka: '#F6C9D4', tara: [[0, '#F2B6C5'], [1, '#C25C7C']], kontur: '#9C3F5C' },
    sari: { arka: '#F8E3A0', tara: [[0, '#F3D57F'], [1, '#C8963E']], kontur: '#9A6A16' },
    lila: { arka: '#DCD0F0', tara: [[0, '#CBBDE8'], [1, '#7D6BA6']], kontur: '#5E4E8A' },
  }[renk];
  const yapraklar = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU - Math.PI / 2;
    yapraklar.push(...donustur(svg(`M0 0C${-r * 0.55} ${-r * 0.25} ${-r * 0.7} ${-r * 0.9} ${-r * 0.2} ${-r * 1.02}C${-r * 0.05} ${-r * 0.92} ${r * 0.05} ${-r * 0.92} ${r * 0.2} ${-r * 1.02}C${r * 0.7} ${-r * 0.9} ${r * 0.55} ${-r * 0.25} 0 0Z`), { r: a + Math.PI / 2 }));
  }
  return oge({
    ad: `cicek-${r}-${renk}`, olcek, sekil: yapraklar, arka: R.arka, arkaAlfa: 0.6,
    tarama: { ton: TON.radyal(0, 0, r, 0.8, 0.05), renkler: R.tara, yonF: (x, y) => Math.atan2(y, x), aralik: 3, boy: [8, Math.max(10, r * 0.5)], esikler: [0.45, 0.7], alfa: 0.5 },
    kontur: R.kontur, konturKal: 1.8,
    detay: (c, api) => {
      api.dolgu(elips(0, 0, r * 0.2, r * 0.2), '#F2C94C', 0.95);
      api.halka(elips(0, 0, r * 0.2, r * 0.2)[0].pts, { renk: '#C8963E', kal: 1.4 });
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; api.cizgi([[Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22], [Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36]], { renk: '#C8963E', kal: 1.1, alfa: 0.7 }); }
    },
  });
}
export function yaprakOge(boy, en, olcek = 1, ton = 'yesil') {
  const koyu = ton === 'koyu';
  return oge({
    ad: `yaprak-${boy}-${en}-${ton}`, olcek, sekil: yaprak(boy, en),
    arka: koyu ? PALET.yesilOrta : PALET.yesilAcik, arkaAlfa: 0.8,
    tarama: [
      { sekil: svg(`M0 0C${boy * 0.25} ${-en * 0.62} ${boy * 0.7} ${-en * 0.48} ${boy} 0Z`), ton: () => 0.4, renkler: [[0, PALET.yesilAcik], [1, PALET.yesilOrta]], yon: -0.9, aralik: 3, boy: [en * 0.3, en * 0.6], esikler: [0.2], alfa: 0.55 },
      { sekil: svg(`M0 0C${boy * 0.25} ${en * 0.62} ${boy * 0.7} ${en * 0.48} ${boy} 0Z`), ton: () => 0.8, renkler: [[0, PALET.yesilOrta], [1, PALET.yesilKoyu]], yon: 0.9, aralik: 2.8, boy: [en * 0.3, en * 0.6], esikler: [0.2, 0.6], alfa: 0.6 },
    ],
    kontur: PALET.yesilKoyu, konturKal: 1.9,
    detay: (c, api) => api.cizgi([[2, 0], [boy * 0.5, 1], [boy * 0.92, 0]], { renk: PALET.yesilKoyu, kal: 1.3, alfa: 0.7 }),
  });
}

/** Tepe/zemin: üst kenarı dalgalı yeşil alan (yatay yamalar hâlinde tarama) */
export function tepeOge({ w, h, ad, tohum = 1, renk = 'yesil', olcek = 1, dalga = 40 }) {
  const r = rng(tohum);
  const pts = [];
  const n = 40;
  const f1 = r() * TAU, f2 = r() * TAU;
  for (let k = 0; k <= n; k++) {
    const x = (k / n) * w;
    const y = dalga * (0.5 + 0.35 * Math.sin((k / n) * 3.1 + f1) + 0.15 * Math.sin((k / n) * 7.3 + f2));
    pts.push([x, y]);
  }
  pts.push([w, h], [0, h]);
  const P = {
    yesil: { arka: '#B9DCA2', tara: [[0, PALET.yesilAcik], [0.6, PALET.yesilOrta], [1, PALET.yesil]], kontur: PALET.yesilOrta },
    koyu: { arka: '#9CC79A', tara: [[0, PALET.yesilOrta], [1, PALET.yesilKoyu]], kontur: PALET.yesil },
    kum: { arka: '#EADFC4', tara: [[0, '#E2D3B0'], [1, '#B59E77']], kontur: '#9A8460' },
    gri: { arka: '#CFCBD3', tara: [[0, '#BDB8C4'], [1, '#7C7489']], kontur: '#6A6276' },
  }[renk];
  return oge({
    ad: ad || `tepe-${w}-${h}-${tohum}-${renk}`, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85, arkaTasma: true,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, 0, 0, h, 0.35, 0.75), 0.18, 0.006, tohum), renkler: P.tara, yon: -0.05, aralik: 3.4, boy: [40, 120], esikler: [0.25, 0.55, 0.8], alfa: 0.5 },
    kontur: P.kontur, konturKal: 2.0, konturAtla: [], titreme: 0.6,
  });
}

/**
 * Ağaç (önbellekli): tek parça gövde (kök genişlemesiyle), taca giren ana dallar, kubbe biçimli yaprak kümeleri,
 * isteğe bağlı meyveler. yaprakli=false: çıplak, dallı budaklı (meyvesiz hayat). Yerel (0,0) gövdenin dibi.
 * Döner: { govde, dallarOge, kumeler: [{x,y,R,t,oge}], meyveler: [[x,y]], tepe: [x,y] }
 */
export function agac({ boy = 600, tohum = 3, yaprakli = true, meyve = true, olcek = 1, kuru = false } = {}) {
  const r = rng(tohum);
  const renk = kuru ? { arka: '#CDBFAE', tara: [[0, '#BCA992'], [1, '#6E5A47']], kontur: '#4E3F33' } : { arka: '#D3B99A', tara: [[0, '#C29F7A'], [1, PALET.koyuKahve]], kontur: PALET.koyuKahve };
  const gk = boy * 0.075; // gövde kalınlığı (dipte)
  const gy = yaprakli ? boy * 0.5 : boy * 0.42; // gövdenin çatallandığı yükseklik
  const egri = r.ara(-0.04, 0.04) * boy;
  // gövde: kök genişlemesi + hafif S eğrisi + üstte daralma
  const govdeSekil = svg(`M${-gk * 1.25} 0C${-gk * 0.7} ${-boy * 0.02} ${-gk * 0.55} ${-boy * 0.06} ${-gk * 0.5} ${-boy * 0.12}C${-gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${-gk * 0.36 + egri} ${-gy * 0.8} ${-gk * 0.3 + egri} ${-gy}L${gk * 0.3 + egri} ${-gy}C${gk * 0.36 + egri} ${-gy * 0.8} ${gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${gk * 0.5} ${-boy * 0.12}C${gk * 0.55} ${-boy * 0.06} ${gk * 0.7} ${-boy * 0.02} ${gk * 1.3} 0Z`);
  const govde = oge({
    ad: `agac2-govde-${boy}-${tohum}-${kuru}-${yaprakli}`, olcek, sekil: govdeSekil, arka: renk.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.silindir(-gk * 0.6, gk * 0.6), 0.1, 0.03, tohum), renkler: renk.tara, yon: -Math.PI / 2, aralik: 2.8, boy: [16, 60], esikler: [0.15, 0.45, 0.72], alfa: 0.55 },
    kontur: null,
    detay: (c, api) => {
      // yan konturlar (üst kenar konturlanmaz: gövde dallara kesintisiz akar)
      const sol = svg(`M${-gk * 1.25} 0C${-gk * 0.7} ${-boy * 0.02} ${-gk * 0.55} ${-boy * 0.06} ${-gk * 0.5} ${-boy * 0.12}C${-gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${-gk * 0.36 + egri} ${-gy * 0.8} ${-gk * 0.3 + egri} ${-gy}`)[0].pts;
      const sag = svg(`M${gk * 1.3} 0C${gk * 0.7} ${-boy * 0.02} ${gk * 0.55} ${-boy * 0.06} ${gk * 0.5} ${-boy * 0.12}C${gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${gk * 0.36 + egri} ${-gy * 0.8} ${gk * 0.3 + egri} ${-gy}`)[0].pts;
      void sol; void sag; // konturu birleşik siluet çizer (konturOge)
      // kabuk çizgileri
      for (let i = 0; i < 5; i++) {
        const x = r.ara(-gk * 0.35, gk * 0.35), y0 = -r.ara(boy * 0.05, gy * 0.8), L = r.ara(boy * 0.04, boy * 0.1);
        api.cizgi([[x, y0], [x + r.ara(-3, 3), y0 - L / 2], [x + r.ara(-4, 4), y0 - L]], { renk: renk.kontur, kal: 1.3, alfa: 0.5 });
      }
    },
  });
  // dallar: çatallanma noktasından yukarı
  const dallar = [];
  const dal = (x, y, a, L, kal, d) => {
    const x2 = x + Math.sin(a) * L, y2 = y - Math.cos(a) * L;
    dallar.push({ x, y, x2, y2, bx: (x + x2) / 2 + Math.cos(a) * L * r.ara(-0.1, 0.1), by: (y + y2) / 2, k0: kal, k1: kal * 0.62 });
    const derin = yaprakli ? 2 : 5;
    if (d >= derin || L < boy * 0.04) return;
    const n = yaprakli ? 2 : (d < 2 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      const sap = n === 3 ? (i - 1) * 0.5 + r.ara(-0.1, 0.1) : (i ? 1 : -1) * r.ara(0.3, 0.55);
      dal(x2, y2, a * 0.55 + sap, L * r.ara(0.62, 0.78), kal * 0.65, d + 1);
    }
  };
  const anaSay = yaprakli ? 3 : 3;
  for (let i = 0; i < anaSay; i++) dal(egri, -gy + gk * 0.4, (i - (anaSay - 1) / 2) * 0.55 + r.ara(-0.1, 0.1), boy * (yaprakli ? 0.24 : 0.26), gk * 0.62, 0);
  const dalSekil = [];
  for (const d of dallar) {
    const ang = Math.atan2(d.y2 - d.y, d.x2 - d.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    dalSekil.push(...svg(`M${d.x + nx * d.k0 / 2} ${d.y + ny * d.k0 / 2}Q${d.bx + nx * (d.k0 + d.k1) / 4} ${d.by + ny * (d.k0 + d.k1) / 4} ${d.x2 + nx * d.k1 / 2} ${d.y2 + ny * d.k1 / 2}A${d.k1 / 2} ${d.k1 / 2} 0 0 0 ${d.x2 - nx * d.k1 / 2} ${d.y2 - ny * d.k1 / 2}Q${d.bx - nx * (d.k0 + d.k1) / 4} ${d.by - ny * (d.k0 + d.k1) / 4} ${d.x - nx * d.k0 / 2} ${d.y - ny * d.k0 / 2}Z`));
  }
  // çatal yakası: gövdenin üstü ile dal diplerini kesintisiz birleştirir (aradaki çentikleri doldurur)
  dalSekil.push(...svg(`M${egri - gk * 0.31} ${-gy + gk * 0.9}C${egri - gk * 0.36} ${-gy + gk * 0.2} ${egri - gk * 0.6} ${-gy - gk * 0.35} ${egri - gk * 0.55} ${-gy - gk * 0.75}L${egri + gk * 0.55} ${-gy - gk * 0.75}C${egri + gk * 0.6} ${-gy - gk * 0.35} ${egri + gk * 0.36} ${-gy + gk * 0.2} ${egri + gk * 0.31} ${-gy + gk * 0.9}Z`));
  yonDuzelt(dalSekil); // bütün alt yollar aynı dönüş yönünde: üst üste binen yerlerde boşluk (delik) olmaz
  const dallarOge = oge({
    ad: `agac2-dal-${boy}-${tohum}-${kuru}-${yaprakli}`, olcek, sekil: dalSekil, arka: renk.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.sabit(0.5), 0.2, 0.02, tohum + 1), renkler: renk.tara, yon: -Math.PI / 2, aralik: 2.8, boy: [12, 40], esikler: [0.25, 0.6], alfa: 0.5 },
    kontur: null,
  });
  // gövde + dallar için TEK siluet konturu: dalların çatalda birbirinin üstünden geçen çizgileri yoktur
  const butun = [...govdeSekil, ...dalSekil];
  const konturOge = oge({
    ad: `agac2-kontur-${boy}-${tohum}-${kuru}-${yaprakli}`, olcek, sekil: butun, zemin: null, arka: null, tarama: null, kontur: null,
    detay: (c) => siluetKontur(c, butun, renk.kontur, 2.1, 0.9),
  });
  // taç: kubbe biçiminde yerleşmiş kümeler (arkadan öne)
  const kumeler = [];
  if (yaprakli) {
    const tx = egri, ty = -boy * 0.7, TW = boy * 0.42, TH = boy * 0.32;
    const yerler = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + r.ara(-0.15, 0.15);
      const rr = r.ara(0.55, 0.95);
      yerler.push({ x: tx + Math.cos(a) * TW * rr, y: ty + Math.sin(a) * TH * rr * (Math.sin(a) > 0 ? 0.75 : 1), R: boy * r.ara(0.12, 0.16) });
    }
    for (let i = 0; i < 5; i++) yerler.push({ x: tx + r.ara(-TW * 0.35, TW * 0.35), y: ty + r.ara(-TH * 0.35, TH * 0.25), R: boy * r.ara(0.15, 0.19) });
    // arkadakiler önce: yukarıdakiler arkada
    yerler.sort((a, b) => a.y - b.y);
    yerler.forEach((y, i) => kumeler.push({ ...y, t: i / yerler.length }));
  }
  const kume = (R, k) => oge({
    ad: `agac2-kume-${Math.round(R)}-${k % 5}`, olcek, sekil: bulutsuKume(R, 30 + (k % 5)), arka: '#A9D49A', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.kure(R * 0.25, -R * 0.3, R * 1.3, { lz: 0.8, ortam: 0.18 }), 0.1, 0.03, k), renkler: [[0, PALET.yesilAcik], [0.55, PALET.yesilOrta], [1, PALET.yesil]], yonF: (x, y) => -0.9 + 0.42 * clamp(x / R, -1.2, 1.2) + 0.12 * clamp(y / R, -1.2, 1.2), aralik: 3.0, boy: [12, 34], esikler: [0.12, 0.42, 0.7], alfa: 0.55 },
    kontur: PALET.yesil, konturKal: 1.8, konturAlfa: 0.8,
  });
  const kumeOgeleri = kumeler.map((k, i) => ({ ...k, oge: kume(Math.round(k.R / 4) * 4, i) }));
  const meyveler = [];
  if (meyve && yaprakli) {
    const on = kumeler.slice(Math.floor(kumeler.length * 0.35));
    for (const k of on) if (r() < 0.75) meyveler.push([k.x + r.ara(-k.R * 0.45, k.R * 0.45), k.y + r.ara(-k.R * 0.1, k.R * 0.5)]);
  }
  const tepe = kumeler.length ? kumeler.reduce((m, k) => (k.y - k.R < m[1] ? [k.x, k.y - k.R] : m), [0, 0]) : [egri, -boy];
  const yUst = Math.min(...dallar.map((d) => Math.min(d.y2 - d.k1, d.y))), yAlt = 0;
  const govdeOran = clamp((gy) / (yAlt - yUst));
  return { govde, dallarOge, konturOge, govdeOran, kumeler: kumeOgeleri, meyveler, tepe, dallar };
}
/** Ağacı çizer: buyume 0..1 (gövde ve dallar aşağıdan yukarı açılır, sonra kümeler patlar), yaprak 0..1, meyveA 0..1 */
export function agacCiz(ctx, A, x, y, { s = 1, buyume = 1, yaprak = 1, meyveA = 1, t = 0, meyveOge = null, salinim = 1 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const gb = clamp(buyume / 0.55);
  if (gb > 0) {
    const db = clamp((buyume - 0.5) / 0.42);
    ogeAcarak(ctx, A.govde, 0, 0, gb, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.08 });
    ogeAcarak(ctx, A.dallarOge, 0, 0, db, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.1 });
    if (A.konturOge) {
      const go = A.govdeOran ?? 0.5;
      const pk = db > 0 ? go + (1 - go) * db : gb * go;
      ogeAcarak(ctx, A.konturOge, 0, 0, pk, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.08 });
    }
  }
  A.kumeler.forEach((k, i) => {
    const u = clamp((yaprak - k.t * 0.5) / 0.5);
    if (u <= 0) return;
    const sl = Math.sin(t * 1.1 + i) * 0.012 * salinim;
    ogeCiz(ctx, k.oge, k.x, k.y, { s: ease.outBack(u, 1.4), r: sl });
  });
  if (meyveOge) A.meyveler.forEach((m, i) => {
    const u = clamp((meyveA - (i % 5) * 0.08) / 0.5);
    if (u > 0) ogeCiz(ctx, meyveOge, m[0], m[1], { s: ease.outBack(u, 1.8) });
  });
  ctx.restore();
}
/** Kapalı alt yolların hepsini aynı dönüş yönüne çevirir (yerinde) */
export function yonDuzelt(sekil) {
  for (const p of sekil) {
    let A = 0;
    const q = p.pts;
    for (let i = 0, j = q.length - 1; i < q.length; j = i++) A += (q[j][0] - q[i][0]) * (q[j][1] + q[i][1]);
    if (A < 0) q.reverse();
  }
  return sekil;
}
/** Şekillerin birleşiminin dış hattına kalem konturu: iç kesişimler çizilmez. kal yerel birim. */
export function siluetKontur(c, sekil, renk, kal = 2, alfa = 0.9) {
  const W0 = c.canvas.width, H0 = c.canvas.height;
  const T = c.getTransform();
  const yol = path2d(sekil);
  const kat = tuval(W0, H0);
  const k = kat.getContext('2d');
  k.setTransform(T);
  k.lineJoin = 'round';
  k.lineCap = 'round';
  k.strokeStyle = rgba(renk, alfa);
  k.lineWidth = kal * 2;
  k.stroke(yol);
  const maske = tuval(W0, H0);
  const m = maske.getContext('2d');
  m.setTransform(T);
  m.fillStyle = '#000';
  for (const p of sekil) m.fill(path2d([p])); // her alt yol ayrı: dönüş yönünden bağımsız birleşim
  k.setTransform(1, 0, 0, 1, 0, 0);
  k.globalCompositeOperation = 'destination-out';
  k.drawImage(maske, 0, 0);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(kat, 0, 0);
  c.restore();
}
function bulutsuKume(R, tohum) {
  const r = rng(tohum);
  const pts = [];
  const n = 9;
  const loblar = Array.from({ length: n }, () => r.ara(0.82, 1.08));
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * TAU;
    const f = (a / TAU) * n;
    const i = Math.floor(f), u = f - i;
    const l = loblar[i % n] * (1 - u) + loblar[(i + 1) % n] * u;
    const tumsek = 0.06 * Math.abs(Math.sin(f * Math.PI));
    pts.push([Math.cos(a) * R * (l + tumsek), Math.sin(a) * R * (l + tumsek) * 0.92]);
  }
  return [{ pts, kapali: true }];
}

/** Meyve (nar/elma gibi yuvarlak, altın-kırmızı) */
export function meyveOge(r, olcek = 1, renk = 'kirmizi') {
  const R = renk === 'altin'
    ? { arka: '#F6D47A', tara: [[0, '#F2CF73'], [1, '#B9822A']], kontur: '#8E6418' }
    : { arka: '#EFA08E', tara: [[0, '#E98A78'], [1, '#A63F3A']], kontur: '#7E2E2B' };
  return oge({
    ad: `meyve-${r}-${renk}`, olcek, sekil: svg(`M0 ${-r * 0.82}C${r * 0.35} ${-r * 1.02} ${r} ${-r * 0.82} ${r} ${-r * 0.1}C${r} ${r * 0.6} ${r * 0.45} ${r} 0 ${r * 0.9}C${-r * 0.45} ${r} ${-r} ${r * 0.6} ${-r} ${-r * 0.1}C${-r} ${-r * 0.82} ${-r * 0.35} ${-r * 1.02} 0 ${-r * 0.82}Z`),
    arka: R.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.kure(r * 0.3, -r * 0.35, r * 1.2), renkler: R.tara, yonF: (x, y) => Math.atan2(y + r * 2, x) + Math.PI / 2, aralik: 2.6, boy: [8, 22], esikler: [0.2, 0.5, 0.75] },
    kontur: R.kontur, konturKal: 1.8,
    detay: (c, api) => {
      api.cizgi([[0, -r * 0.8], [r * 0.08, -r * 1.15], [r * 0.18, -r * 1.3]], { renk: PALET.koyuKahve, kal: 2 });
      api.dolgu(elips(-r * 0.35, -r * 0.3, r * 0.14, r * 0.22), '#FFF8EE', 0.85);
    },
  });
}

/** Kuş (yandan, kanat çırpan): sprite ikilisi */
export function kus(ctx, x, y, s, t, { faz = 0, yon = 1, renk = '#4A5B7A', alfa = 1 } = {}) {
  const k = Math.sin(t * 9 + faz);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * yon, s);
  ctx.globalAlpha *= alfa;
  ctx.fillStyle = rgba(renk, 0.9);
  // gövde
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 5, -0.08, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(13, -3, 4.2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(16.5, -3.5); ctx.lineTo(22, -2.2); ctx.lineTo(16.5, -1.5); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, -1); ctx.lineTo(-22, -6); ctx.lineTo(-20, 2); ctx.closePath(); ctx.fill();
  // kanatlar
  for (const [sy, a] of [[1, 0.9], [0.75, 0.55]]) {
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(-2, -2 - 22 * k * sy, 8 - 4 * Math.abs(k), -4 - 30 * k * sy);
    ctx.quadraticCurveTo(6, -6 - 10 * k * sy, 6, -2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

/** Güneş: çıplak film disk, içinde soluk sarı kısa tarama, çevresinde serin parıltı */
export function gunesOge(r, olcek = 1) {
  return oge({
    ad: 'gunes-' + r, olcek, sekil: elips(0, 0, r, r), arka: '#FFF2C2', arkaAlfa: 0.6, arkaTasma: false, arkaBulanik: r * 0.3,
    tarama: { ton: TON.radyal(0, 0, r, 0.25, 0.7), renkler: [[0, '#F6E39A'], [1, '#E9C462']], yon: -0.3, aralik: 3.2, boy: [6, 16], kal: 1.1, alfa: 0.5, esikler: [0.3, 0.6] },
    kontur: null,
  });
}

/** Bulut (çıplak film, altında lila çizgiler) */
export function bulutOge(w, tohum = 1, olcek = 1, koyu = false) {
  return oge({
    ad: `bulut-${w}-${tohum}-${koyu}`, olcek, sekil: bulutSekli(w, tohum), arka: koyu ? '#B9B4C8' : null, arkaAlfa: 0.6,
    tarama: { ton: (x, y) => (y > -w * 0.02 ? 0.55 : koyu ? 0.4 : 0), renkler: koyu ? [[0, '#A7A1BA'], [1, '#6E6784']] : [[0, PALET.lila], [1, PALET.lilaMavi]], yon: -0.157, aralik: 3.4, boy: [30, 110], esikler: [0.2, 0.5], alfa: koyu ? 0.45 : 0.32 },
    kontur: null,
  });
}
