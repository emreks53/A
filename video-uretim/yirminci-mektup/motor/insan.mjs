// Erkek figür: sade, ayrıntısız ama ölçüleri normal bir insan (7,6 baş boyu). Yüz çizgisi yoktur; yandan görünüşte
// burun ve çene yalnız dış hatta hafifçe belirir. Parçalar S-232 kalem dokusuyla bir kez çizilir, eklemlerden
// döndürülerek canlandırılır. Koordinat: ayak tabanı ortası (0,0), yukarı -y. Boy ~384 birim (olcek 1 = 384 px).
import { oge, ogeCiz, TON, PALET } from './kalem.mjs';
import { svg, elips, donustur } from './sekil.mjs';
import { clamp, lerp, TAU } from './temel.mjs';

export const RENK = {
  gomlek: '#EFE6D3', gomlekArka: '#E9DDC4', gomlekTara: [[0, '#E6DAC3'], [0.6, '#D2C3A8'], [1, '#B5A48A']], gomlekKontur: '#7C6A55',
  pantolon: '#8CA0CC', pantolonArka: '#9DB0D8', pantolonTara: [[0, '#93A6D2'], [0.6, '#6F84B8'], [1, '#4E6197']], pantolonKontur: '#33426E',
  ten: '#F3D3B5', tenArka: '#F1C9A7', tenTara: [[0, '#EDC3A1'], [0.6, '#D9A27E'], [1, '#B97F5E']], tenKontur: '#8E5B40',
  sac: '#5A4130', sacTara: [[0, '#6E513C'], [1, '#3B2A1F']], sacKontur: '#2E2119',
  ayakkabi: '#6D5140', ayakkabiTara: [[0, '#7B5C47'], [1, '#3F2C21']], ayakkabiKontur: '#2E2119',
};

// ölçüler (birim)
export const OLCU = {
  kalca: 196, // kalça ekleminin yerden yüksekliği
  uyluk: 92, baldir: 92, bilek: 12,
  govde: 118, // kalça ekleminden omuz eklemine
  kol: 66, onkol: 60, el: 22,
  boyun: 12,
};

const kapsul = (r0, L, r1) => svg(`M${-r0} 0A${r0} ${r0} 0 0 1 ${r0} 0L${r1} ${L}A${r1} ${r1} 0 0 1 ${-r1} ${L}Z`);
// kontursuz üst kapaklı kapsülün dış hattı (yalnız yanlar ve alt kapak): açık yol
const kapsulKontur = (r0, L, r1) => svg(`M${r0} 0L${r1} ${L}A${r1} ${r1} 0 0 1 ${-r1} ${L}L${-r0} 0`).map((p) => ({ ...p, kapali: false }));

function parca(ad, sekil, renk, olcek, { kontur = null, yon = Math.PI / 2, aralik = 3.1, boy = [18, 46], tonF = null, esik = [0.12, 0.5, 0.78], ek = null } = {}) {
  const b = sekil.length ? sekil : sekil;
  const xs = sekil.flatMap((p) => p.pts.map((q) => q[0]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  return oge({
    ad: 'insan-' + ad, sekil, olcek, arka: renk.arka, arkaAlfa: 0.8, arkaBulanik: 4,
    tarama: { ton: tonF || TON.gurultulu(TON.silindir(x0, x1), 0.06, 0.05, ad.length), renkler: renk.tara, yon, aralik, boy, kal: 1.15, alfa: 0.5, esikler: esik, minUc: 4 },
    kontur: kontur ? null : renk.kontur, konturKal: 2.0, titreme: 0.3,
    detay: (ctx, api) => {
      if (kontur) kontur.forEach((p) => api.cizgi(p.pts, { renk: renk.kontur, kal: 2.0, titreme: 0.3 }));
      if (ek) ek(ctx, api);
    },
  });
}

const R = (ad) => ({
  gomlek: { arka: RENK.gomlekArka, tara: RENK.gomlekTara, kontur: RENK.gomlekKontur },
  pantolon: { arka: RENK.pantolonArka, tara: RENK.pantolonTara, kontur: RENK.pantolonKontur },
  ten: { arka: RENK.tenArka, tara: RENK.tenTara, kontur: RENK.tenKontur },
  sac: { arka: RENK.sac, tara: RENK.sacTara, kontur: RENK.sacKontur },
  ayakkabi: { arka: RENK.ayakkabi, tara: RENK.ayakkabiTara, kontur: RENK.ayakkabiKontur },
}[ad]);

// ---------------------------------------------------------------- parça önbelleği
const parcalar = new Map();
function yanParcalar(olcek) {
  const k = 'yan' + olcek;
  if (parcalar.has(k)) return parcalar.get(k);
  const P = {};
  // bacak: uyluk (pantolon), baldır (pantolon, paça), ayakkabı
  P.uyluk = parca('uyluk', kapsul(19, OLCU.uyluk, 13.5), R('pantolon'), olcek, { kontur: kapsulKontur(19, OLCU.uyluk, 13.5) });
  P.baldir = parca('baldir', svg(`M-13.5 0A13.5 13.5 0 0 1 13.5 0L12 ${OLCU.baldir}L-12.5 ${OLCU.baldir}Z`), R('pantolon'), olcek, {
    kontur: svg(`M13.5 0L12 ${OLCU.baldir}L-12.5 ${OLCU.baldir}L-13.5 0`).map((p) => ({ ...p, kapali: false })),
  });
  // ayakkabı: bilek (0,0); öne (+x) uzanır
  P.ayak = parca('ayak', svg('M-13 -6C-13 -12 -4 -14 6 -12C14 -10 22 -4 31 0C38 3 40 9 37 13L-12 13C-15 13 -16 10 -15 6Z'), R('ayakkabi'), olcek, { yon: 0, aralik: 2.8, boy: [8, 20] });
  // kol: üst kol (gömlek), ön kol (gömlek, manşet), el (ten)
  P.kol = parca('kol', kapsul(12, OLCU.kol, 9.8), R('gomlek'), olcek, { kontur: svg(`M-12 0A12 12 0 0 1 12 0L9.8 ${OLCU.kol}A9.8 9.8 0 0 1 -9.8 ${OLCU.kol}L-12 0`).map((p) => ({ ...p, kapali: false })) });
  P.onkol = parca('onkol', svg(`M-9.8 0A9.8 9.8 0 0 1 9.8 0L8.8 ${OLCU.onkol}L-8.8 ${OLCU.onkol}Z`), R('gomlek'), olcek, {
    kontur: svg(`M9.8 0L8.8 ${OLCU.onkol}L-8.8 ${OLCU.onkol}L-9.8 0`).map((p) => ({ ...p, kapali: false })),
  });
  P.el = parca('el', svg('M-7 -2C-8 6 -8 14 -5.5 19C-3 23 3 24 6 21C9 17 9 9 8 2C6 -2 -5 -3 -7 -2Z'), R('ten'), olcek, { aralik: 2.6, boy: [6, 14] });
  // kalça (pantolon üstü): kalça eklemi (0,0)
  P.kalca = parca('kalca', svg('M-20 -36C-22 -22 -25 -8 -23 4C-21 13 -11 16 0 15C10 14 17 11 19 2C20 -10 20 -24 21 -36Z'), R('pantolon'), olcek, { aralik: 3, boy: [14, 34] });
  // gövde (gömlek, sokuk): kalça eklemi (0,0); omuz eklemi (0,-118)
  P.govde = parca('govde', svg('M-20 -30C-23 -60 -24 -95 -21 -116C-19 -128 -8 -133 2 -133C14 -133 22 -127 24 -114C27 -96 27 -72 23 -52C21 -42 21 -36 21 -30C10 -27 -8 -27 -20 -30Z'), R('gomlek'), olcek, { aralik: 3.1, boy: [20, 60],
    ek: (ctx, api) => { api.cizgi([[-4, -131], [3, -124], [11, -128]], { renk: RENK.gomlekKontur, kal: 1.5, alfa: 0.7 }); } });
  // boyun (ten)
  P.boyun = parca('boyun', svg('M-8 2L-7 -16C-3 -18 4 -18 8 -16L9 2Z'), R('ten'), olcek, { aralik: 2.6, boy: [6, 12] });
  // baş: boyun üstü (0,0) noktasından; yüz sağa bakar. Kafatası, alın, hafif burun ve çene yalnız dış hatta.
  P.bas = parca('bas', svg('M-12 -2C-20 -8 -24 -22 -24 -34C-24 -52 -12 -62 2 -62C16 -62 25 -52 25 -38C25 -33 26 -30 29 -25C30 -23 29 -22 27 -21C27 -17 26 -12 22 -9C18 -6 12 -4 6 -2C0 -1 -6 -1 -12 -2Z'), R('ten'), olcek, { aralik: 2.7, boy: [10, 26], tonF: TON.kure(4, -34, 34, { lx: 0.4, ly: -0.5 }) });
  // saç: başın üst ve arka kısmı
  P.sac = parca('sac', svg('M-23 -28C-27 -44 -20 -62 0 -65C18 -67 28 -56 27 -42C24 -47 18 -50 10 -50C2 -50 -4 -46 -8 -40C-10 -36 -11 -31 -13 -26C-15 -22 -19 -21 -23 -28Z'), R('sac'), olcek, { yon: -0.6, aralik: 2.4, boy: [10, 24], tonF: TON.kure(2, -50, 30) });
  // kulak
  P.kulak = parca('kulak', elips(0, 0, 4, 6.2), R('ten'), olcek, { aralik: 2.4, boy: [5, 10] });
  parcalar.set(k, P);
  return P;
}

function onParcalar(olcek) {
  const k = 'on' + olcek;
  if (parcalar.has(k)) return parcalar.get(k);
  const P = {};
  P.uyluk = parca('on-uyluk', kapsul(17.5, OLCU.uyluk, 13.5), R('pantolon'), olcek, { kontur: kapsulKontur(17.5, OLCU.uyluk, 13.5) });
  P.baldir = parca('on-baldir', svg(`M-13.5 0A13.5 13.5 0 0 1 13.5 0L11.5 ${OLCU.baldir}L-11.5 ${OLCU.baldir}Z`), R('pantolon'), olcek, {
    kontur: svg(`M13.5 0L11.5 ${OLCU.baldir}L-11.5 ${OLCU.baldir}L-13.5 0`).map((p) => ({ ...p, kapali: false })),
  });
  P.ayak = parca('on-ayak', svg('M-12 -6C-12 -12 12 -12 12 -6L14 8C14 13 -14 13 -14 8Z'), R('ayakkabi'), olcek, { yon: 0, aralik: 2.8, boy: [8, 18] });
  P.kol = parca('on-kol', kapsul(12.5, OLCU.kol, 10), R('gomlek'), olcek, { kontur: svg(`M-12.5 0A12.5 12.5 0 0 1 12.5 0L10 ${OLCU.kol}A10 10 0 0 1 -10 ${OLCU.kol}L-12.5 0`).map((p) => ({ ...p, kapali: false })) });
  P.onkol = parca('on-onkol', svg(`M-10 0A10 10 0 0 1 10 0L9 ${OLCU.onkol}L-9 ${OLCU.onkol}Z`), R('gomlek'), olcek, {
    kontur: svg(`M10 0L9 ${OLCU.onkol}L-9 ${OLCU.onkol}L-10 0`).map((p) => ({ ...p, kapali: false })),
  });
  P.el = parca('on-el', svg('M-7 -2C-9 6 -9 14 -6 19C-3 23 3 23 6 19C9 14 9 6 7 -2C4 -4 -4 -4 -7 -2Z'), R('ten'), olcek, { aralik: 2.6, boy: [6, 14] });
  P.kalca = parca('on-kalca', svg('M-30 -36C-32 -22 -33 -8 -32 4C-31 10 -20 14 0 12C20 14 31 10 32 4C33 -8 32 -22 30 -36Z'), R('pantolon'), olcek, { aralik: 3, boy: [14, 34] });
  P.govde = parca('on-govde', svg('M-29 -30C-30 -54 -32 -76 -34 -92C-36 -102 -42 -106 -45 -112C-47 -120 -40 -126 -28 -127C-16 -128 -7 -129 0 -129C7 -129 16 -128 28 -127C40 -126 47 -120 45 -112C42 -106 36 -102 34 -92C32 -76 30 -54 29 -30C12 -27 -12 -27 -29 -30Z'), R('gomlek'), olcek, {
    aralik: 3.1, boy: [20, 60], tonF: TON.gurultulu(TON.silindir(-46, 46), 0.06, 0.05, 4),
    ek: (ctx, api) => { api.cizgi([[-11, -128], [0, -117], [11, -128]], { renk: RENK.gomlekKontur, kal: 1.5, alfa: 0.7 }); },
  });
  P.boyun = parca('on-boyun', svg('M-9 0L-8 -18C-3 -20 3 -20 8 -18L9 0Z'), R('ten'), olcek, { aralik: 2.6, boy: [6, 12] });
  P.bas = parca('on-bas', svg('M0 -2C-12 -2 -21 -12 -23 -26C-25 -42 -18 -62 0 -62C18 -62 25 -42 23 -26C21 -12 12 -2 0 -2Z'), R('ten'), olcek, { aralik: 2.7, boy: [10, 26], tonF: TON.kure(4, -34, 32, { lx: 0.45, ly: -0.5 }) });
  P.sac = parca('on-sac', svg('M-24 -34C-27 -52 -16 -66 0 -66C17 -66 27 -53 24 -34C22 -42 18 -47 12 -50C4 -48 -6 -47 -14 -49C-18 -46 -21 -41 -24 -34Z'), R('sac'), olcek, { yon: -0.3, aralik: 2.4, boy: [10, 24], tonF: TON.kure(4, -52, 30) });
  P.sacArka = parca('arka-sac', svg('M-24 -30C-27 -50 -16 -66 0 -66C17 -66 27 -50 24 -30C22 -20 16 -12 8 -10C2 -9 -2 -9 -8 -10C-16 -12 -22 -20 -24 -30Z'), R('sac'), olcek, { yon: Math.PI / 2, aralik: 2.4, boy: [12, 30], tonF: TON.kure(4, -40, 34) });
  P.kulak = parca('on-kulak', elips(0, 0, 3.8, 6.5), R('ten'), olcek, { aralik: 2.4, boy: [5, 10] });
  parcalar.set(k, P);
  return P;
}

// ---------------------------------------------------------------- pozlar
/**
 * Yan poz (yüz sağa). Açılar radyan; pozitif açı uzvun ucunu ileri (+x) götürür.
 * govde: gövdenin öne eğilmesi, bas: başın eğilmesi (+ öne/aşağı), kalca: [arka, ön] uyluk açısı (gövdeye göre),
 * diz: [arka, ön] (negatif: baldır geriye bükülür), bilek: [arka, ön] ayak açısı (baldıra göre, 0: dik),
 * omuz: [arka, ön] kol açısı, dirsek: [arka, ön] (pozitif: ön kol öne bükülür), zipla: kalçanın ek yüksekliği
 */
export const DURUS = { govde: 0, bas: 0, kalca: [-0.02, 0.03], diz: [0, -0.02], bilek: [0.02, -0.01], omuz: [-0.05, 0.06], dirsek: [0.12, 0.16], zipla: 0, el: [0, 0] };

export function yuruyus(faz, { adim = 0.42, kol = 0.36, egim = 0.05 } = {}) {
  const leg = (f) => {
    const kalca = adim * Math.sin(f);
    const diz = -(0.95 * Math.pow(Math.max(0, Math.cos(f + 0.45)), 1.6) + 0.06 + 0.14 * Math.max(0, Math.sin(f - 0.2)) * Math.max(0, -Math.cos(f)));
    const bilek = -(kalca + diz) * 0.85 - 0.1 * Math.max(0, -Math.sin(f)) * Math.max(0, Math.cos(f + 0.6) * -1);
    return { kalca, diz, bilek };
  };
  const on = leg(faz), arka = leg(faz + Math.PI);
  return {
    govde: egim,
    bas: 0.02,
    kalca: [arka.kalca, on.kalca],
    diz: [arka.diz, on.diz],
    bilek: [arka.bilek, on.bilek],
    omuz: [kol * Math.sin(faz) * 0.95, -kol * Math.sin(faz)],
    dirsek: [0.22 + 0.2 * Math.max(0, Math.sin(faz)), 0.22 + 0.2 * Math.max(0, -Math.sin(faz))],
    zipla: 3.5 * Math.cos(2 * faz) - 1,
    el: [0, 0],
  };
}
/** Bir yürüyüş döngüsünde (2 adım) alınan yol */
export const DONGU_YOLU = 2 * 2 * (OLCU.uyluk + OLCU.baldir) * Math.sin(0.42) * 0.93;

/** İki pozun karışımı */
export function pozKaristir(a, b, t) {
  const o = {};
  for (const k of Object.keys(DURUS)) {
    const va = a[k] ?? DURUS[k], vb = b[k] ?? DURUS[k];
    o[k] = Array.isArray(va) ? va.map((v, i) => lerp(v, vb[i], t)) : lerp(va, vb, t);
  }
  return o;
}

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/**
 * Yandan insan çizer. (x, y): ayak tabanı hizası (iki ayak arası), s: ölçek, yon: 1 sağa, -1 sola bakar.
 * olcek: parça çözünürlüğü (ekranda s büyükse 2-3 verin). Döner: eklemlerin dünya konumları.
 */
export function insanYan(ctx, x, y, poz = DURUS, { s = 1, yon = 1, olcek = 1, alfa = 1, isik = null } = {}) {
  const P = yanParcalar(olcek);
  const p = { ...DURUS, ...poz };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s * yon, s);
  ctx.globalAlpha *= alfa;
  const kalca = [0, -OLCU.kalca - p.zipla];
  // bacakların ileri uzanan uçları zeminde kalsın diye: en alçak ayağı zemine oturt
  const bacak = (i) => {
    const a1 = p.govde * 0.0 + p.kalca[i];
    const diz = [kalca[0] + Math.sin(a1) * OLCU.uyluk, kalca[1] + Math.cos(a1) * OLCU.uyluk];
    const a2 = a1 + p.diz[i];
    const bilek = [diz[0] + Math.sin(a2) * OLCU.baldir, diz[1] + Math.cos(a2) * OLCU.baldir];
    const a3 = a2 + p.bilek[i];
    return { a1, a2, a3, diz, bilek };
  };
  const B = [bacak(0), bacak(1)];
  const tabanY = Math.max(B[0].bilek[1], B[1].bilek[1]) + OLCU.bilek;
  const dy = poz.serbest ? 0 : -tabanY; // ayak zemine
  const kx = [-3, 3]; // arka/ön kalça kayması (derinlik)
  const govdeA = p.govde;
  const omuz = [kalca[0] + Math.sin(govdeA) * OLCU.govde, kalca[1] - Math.cos(govdeA) * OLCU.govde];
  const kolCiz = (i) => {
    const a1 = govdeA + p.omuz[i];
    const sx = omuz[0] + (i === 0 ? -2 : 2), sy = omuz[1] + dy;
    ogeCiz(ctx, P.kol, sx, sy, { r: -a1 });
    const dirsek = [sx + Math.sin(a1) * OLCU.kol, sy + Math.cos(a1) * OLCU.kol];
    const a2 = a1 + p.dirsek[i];
    const bil = [dirsek[0] + Math.sin(a2) * OLCU.onkol, dirsek[1] + Math.cos(a2) * OLCU.onkol];
    ogeCiz(ctx, P.el, bil[0] - Math.sin(a2) * 3, bil[1] - Math.cos(a2) * 3, { r: -(a2 + (p.el?.[i] || 0)) });
    ogeCiz(ctx, P.onkol, dirsek[0], dirsek[1], { r: -a2 });
    return { omuz: [sx, sy], dirsek, el: bil };
  };
  const bacakCiz = (i) => {
    const b = B[i];
    const hx = kalca[0] + kx[i], hy = kalca[1] + dy;
    const diz = [hx + Math.sin(b.a1) * OLCU.uyluk, hy + Math.cos(b.a1) * OLCU.uyluk];
    const bil = [diz[0] + Math.sin(b.a2) * OLCU.baldir, diz[1] + Math.cos(b.a2) * OLCU.baldir];
    ogeCiz(ctx, P.uyluk, hx, hy, { r: -b.a1 });
    ogeCiz(ctx, P.ayak, bil[0], bil[1] - 2, { r: -(b.a3) + 0 });
    ogeCiz(ctx, P.baldir, diz[0], diz[1], { r: -b.a2 });
    return { kalca: [hx, hy], diz, bilek: bil };
  };
  const eklem = {};
  eklem.arkaKol = kolCiz(0);
  eklem.arkaBacak = bacakCiz(0);
  ogeCiz(ctx, P.kalca, kalca[0], kalca[1] + dy, { r: govdeA * 0.5 });
  eklem.onBacak = bacakCiz(1);
  ogeCiz(ctx, P.govde, kalca[0], kalca[1] + dy, { r: govdeA });
  const boyunTaban = [kalca[0] + Math.sin(govdeA) * (OLCU.govde + 10) + 2, kalca[1] - Math.cos(govdeA) * (OLCU.govde + 10) + dy];
  const basA = govdeA * 0.6 + p.bas;
  ogeCiz(ctx, P.boyun, boyunTaban[0], boyunTaban[1] + 4, { r: basA * 0.6 });
  const basTaban = [boyunTaban[0] + Math.sin(basA) * 14, boyunTaban[1] - Math.cos(basA) * 14];
  ogeCiz(ctx, P.bas, basTaban[0], basTaban[1], { r: basA });
  ogeCiz(ctx, P.sac, basTaban[0], basTaban[1], { r: basA });
  const kul = rot(-3, -30, basA);
  ogeCiz(ctx, P.kulak, basTaban[0] + kul[0], basTaban[1] + kul[1], { r: basA + 0.2 });
  eklem.onKol = kolCiz(1);
  eklem.gogus = [kalca[0] + Math.sin(govdeA) * 85 + 8, kalca[1] - Math.cos(govdeA) * 85 + dy];
  eklem.bas = [basTaban[0] + Math.sin(basA) * 32, basTaban[1] - Math.cos(basA) * 32];
  ctx.restore();
  // dünya koordinatına çevir
  const dunya = ([px, py]) => [x + px * s * yon, y + py * s];
  return { gogus: dunya(eklem.gogus), bas: dunya(eklem.bas), el: dunya(eklem.onKol.el), arkaEl: dunya(eklem.arkaKol.el) };
}

/**
 * Önden (ya da arkadan: arka=true) insan. poz: { kol: [sol, sağ] açı (0: aşağı sarkık, + dışa açılır),
 * dirsek: [sol, sağ] (+ ön kol içe/yukarı bükülür), bacak: açıklık, bas: yana eğim, zipla }
 */
export const ON_DURUS = { kol: [0.08, 0.08], dirsek: [0.1, 0.1], bacak: 0.05, bas: 0, govde: 0, zipla: 0, diz: 0 };
export function insanOn(ctx, x, y, poz = ON_DURUS, { s = 1, olcek = 1, alfa = 1, arka = false } = {}) {
  const P = onParcalar(olcek);
  const p = { ...ON_DURUS, ...poz };
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(p.govde * 0.3);
  ctx.globalAlpha *= alfa;
  const ky = -OLCU.kalca - p.zipla + (p.diz ? OLCU.baldir * (1 - Math.cos(p.diz)) * 0.9 : 0);
  ogeCiz(ctx, P.kalca, 0, ky);
  // bacaklar
  for (const yon of [-1, 1]) {
    const a = -yon * p.bacak;
    const hx = yon * 15, hy = ky;
    const diz = [hx + Math.sin(a) * OLCU.uyluk * Math.cos(p.diz || 0), hy + Math.cos(a) * OLCU.uyluk * Math.cos(p.diz || 0)];
    const bil = [diz[0] + Math.sin(a * 0.4) * OLCU.baldir, diz[1] + Math.cos(a * 0.4) * OLCU.baldir];
    ogeCiz(ctx, P.uyluk, hx, hy, { r: -a, sy: Math.cos(p.diz || 0) });
    ogeCiz(ctx, P.ayak, bil[0] + yon * 3, bil[1] + 1);
    ogeCiz(ctx, P.baldir, diz[0], diz[1], { r: -a * 0.4 });
  }
  // kollar (gövdenin arkasında başlar, önünde iner)
  const omuzY = ky - OLCU.govde;
  const kolGeo = (yon, i) => {
    const a1 = yon * p.kol[i];
    const sx = yon * 34, sy = omuzY + 9;
    const dirsek = [sx + Math.sin(a1) * OLCU.kol, sy + Math.cos(a1) * OLCU.kol];
    const a2 = a1 - yon * p.dirsek[i];
    const bil = [dirsek[0] + Math.sin(a2) * OLCU.onkol, dirsek[1] + Math.cos(a2) * OLCU.onkol];
    return { a1, a2, sx, sy, dirsek, bil };
  };
  const ustKol = (yon, i) => { const g = kolGeo(yon, i); ogeCiz(ctx, P.kol, g.sx, g.sy, { r: -g.a1 }); };
  const altKol = (yon, i) => {
    const g = kolGeo(yon, i);
    ogeCiz(ctx, P.el, g.bil[0] - Math.sin(g.a2) * 3, g.bil[1] - Math.cos(g.a2) * 3, { r: -g.a2 });
    ogeCiz(ctx, P.onkol, g.dirsek[0], g.dirsek[1], { r: -g.a2 });
    return g.bil;
  };
  const kolArkada = (i) => (p.kol[i] > 1.9); // kollar başın üstündeyse ön kol da gövdenin arkasında
  const eller = [null, null];
  [-1, 1].forEach((yon, i) => { ustKol(yon, i); if (kolArkada(i)) eller[i] = altKol(yon, i); });
  ogeCiz(ctx, P.govde, 0, ky);
  ogeCiz(ctx, P.boyun, 0, omuzY - 6);
  const basY = omuzY - 18;
  ctx.save();
  ctx.translate(0, basY);
  ctx.rotate(p.bas);
  ogeCiz(ctx, P.kulak, -22.5, -30);
  ogeCiz(ctx, P.kulak, 22.5, -30);
  ogeCiz(ctx, P.bas, 0, 0);
  ogeCiz(ctx, arka ? P.sacArka : P.sac, 0, 0);
  ctx.restore();
  [-1, 1].forEach((yon, i) => { if (!kolArkada(i)) eller[i] = altKol(yon, i); });
  ctx.restore();
  const dunya = ([px, py]) => [x + px * s, y + py * s];
  return { gogus: dunya([0, omuzY + 40]), bas: dunya([0, basY - 32]), eller: eller.map(dunya) };
}

/** Uzaktaki küçük insanlar için tek parça siluet (kalabalıklar): olcek düşük, yürüyüş fazıyla */
export function kucukInsan(ctx, x, y, faz, { s = 0.25, yon = 1, olcek = 0.5, alfa = 1, yuruyor = true } = {}) {
  return insanYan(ctx, x, y, yuruyor ? yuruyus(faz) : DURUS, { s, yon, olcek, alfa });
}
