// 6. cümle: "Cenab-ı Hakk'ı tanıyan ve seven, nihayetsiz saadete, nimete, envara, esrara ya bi'l-kuvve veya bilfiil
// mazhardır."
// s05'in loş, gri dünyasından şafak açılır: ufuktaki vadiden nur doğar, renk ışıkla birlikte ufuktan yayılır; adam
// (yan, sağa bakar) bir sırtta durur (Cenab-ı Hakk'ı). Başını kaldırır; çiçekte, ağaçta, kuşta küçük ışık izleri belirir,
// ince ışık iplikleri ufuktaki nura bağlanır (tanıyan). Elini göğsüne koyar, göğsünde sıcak bir ışık (ve seven).
// Kamera geri çekilir: adamın ayağından başlayıp ufka, sonsuza uzanan yol; kandiller yakından uzağa, sonsuza doğru
// birer birer yanar (nihayetsiz saadete). Yol boyunca ağaçlar meyveye durur (nimete). Işık zerreleri ve fenerler
// göğe yükselir, kamera onları izler (envara). Kamera ufka dalar: zarif kemerli küçük kapılar aralanır, içlerinden
// ışık sızar (esrara). Nurdan kopan bir kıvılcım sırta, adamın yanındaki toprağa iner; toprak kesiti açılır: tohum ve
// üstünde tam bir ağacın kesik çizgili hayali (bi'l-kuvve). Tohum filizlenir, ağaç hayalin çizgilerini doldurarak
// büyür, meyve verir (bilfiil). Yukarıdan adamın üzerine nur iner; adam ağacın yanında ışıkla yıkanır (mazhardır).
// Bitiş: adam (yan) nur altında, meyveli ağacın yanında, aydınlık yeşil manzara.
import { W, H, clamp, lerp, ease, an, pop, rng, TAU, rgba } from '../motor/temel.mjs';
import { ogeCiz, gokTuvali, konturCiz, darbe, PALET } from '../motor/kalem.mjs';
import { kameraIle, ekranda, salinim } from '../motor/sahne.mjs';
import { kb } from '../motor/zaman.mjs';
import { insanYan, DURUS, pozKaristir, OLCU } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import * as Y from './s06-yardim.mjs';

const T = {
  bas: 46.4, cenab: kb('cenabı'), hak: kb('hakkı'), taniyan: kb('tanıyan'), seven: kb('seven'),
  nihayet: kb('nihayetsiz'), saadet: kb('saadete'), nimet: kb('nimete'), envar: kb('envara'), esrar: kb('esrara'),
  ya: kb('ya'), kuvve: kb('bilkuvve'), veya: kb('veya'), fiil: kb('bilfiil'), mazhar: kb('mazhardır'), son: 57.4,
};

// bilfiil: gövde filizin ucundan (tohumdan yüzeye çıktığı an) dal yolları boyunca büyür
const BUY = { t0: T.fiil + 0.18, sure: 0.74 };
const KUME_SURE = 0.32, MEYVE_SURE = 0.25;
/** büyüme boyu (λ) t'de */
const buyumeBoyu = (t, Ltop) => Ltop * an(t, BUY.t0, BUY.sure, ease.inOutSine);
/** λ'ya ulaşılan an (buyumeBoyu'nun tersi) */
const buyumeAni = (lm, Ltop) => BUY.t0 + (BUY.sure * Math.acos(clamp(1 - (2 * lm) / Ltop, -1, 1))) / Math.PI;

// ---------------------------------------------------------------- dünya yerleşimi (nötr görünüş = geniş plan)
const { PERS } = Y;
const VP = [PERS.vx, PERS.hy];
const ZM = 4.6; // adamın ve ağacın derinliği
const ZEMIN = PERS.hy + PERS.k / ZM; // onların bastığı yer (y)
const ADAM = { x: 546, y: ZEMIN, s: (PERS.F * 1.78) / (ZM * 384) };
// ağaç, tohum ve toprak kesiti yolun solunda, çimenin üstünde (kesit yola taşmaz: yolun sol kenarı ZEMIN'de x≈354,
// 40 px altında ≈305, 120 px altında ≈240)
// ağaç adamın biraz gerisinde (s07'de adam sola yürürken ağacın önünden geçer, içinden değil)
const AG = { x: 112, y: ZEMIN - 24, boy: 600, tohum: 37 };
const TOH = { x: AG.x + 3, y: AG.y + 57 };
const KESIT = { cx: 105, y0: AG.y, rx: 175, ry: 150 };
/** (x, y) toprak kesiti penceresinin içinde mi (pay: kenardan dışarı tolerans, px) */
const kesitte = (x, y, pay = 0) => y > KESIT.y0 - pay && ((x - KESIT.cx) / (KESIT.rx + pay)) ** 2 + ((y - KESIT.y0) / (KESIT.ry + pay)) ** 2 < 1;
const NUR = { x: VP[0], y0: 990, y1: 765, r: 78 };
const KAPILAR = [[-50, 1.18], [76, 1.32], [202, 1.18]];
const KAPI_Y = 886;
const YOL_NOKTA = [[-0.45, 1.3], [-0.85, 3.0], [-0.95, 4.1], [-0.6, 4.9], [0.35, 5.6], [1.6, 6.9], [2.1, 9.5], [1.7, 13], [0.4, 19], [-1.3, 30], [0.4, 50], [1.4, 90]];

// paralaks
const F = { gok: 0.92, dag: 0.96, tepe: 0.98, ova: 1, on: 1.08 };

// kamera: tek, akıcı yolculuk (hız anahtarlarda sürekli)
// envara → esrara → bi'l-kuvve: gidip dönen savrulma yok. Kamera geniş plandan sola, kapılara doğru yavaşça kayıp
// hafifçe yaklaşır (adam kadrajın sağında kalır), sonra kapıların hemen altındaki toprağa, tohuma doğru aşağı süzülür
// (her hareket ≥ 1,2 sn, yumuşak giriş/çıkış).
const KAM = Y.puruzsuzYol([
  { t: 46.4, x: 612, y: 1112, z: 1.28 },
  { t: 47.8, x: 614, y: 1106, z: 1.31 },
  { t: 48.95, x: 618, y: 1100, z: 1.36 },
  { t: 50.5, x: 610, y: 992, z: 0.95 },
  { t: 51.75, x: 618, y: 968, z: 0.99 },
  { t: 52.1, x: 620, y: 930, z: 0.95 },
  { t: 53.35, x: 268, y: 990, z: 1.42 },
  { t: 54.6, x: 300, y: 1216, z: 1.3 },
  { t: 55.4, x: 302, y: 1212, z: 1.36 },
  { t: 56.05, x: 306, y: 1208, z: 1.34 },
  { t: 57.4, x: 415, y: 1130, z: 1.14 },
]);
const SALINIM = (t) => salinim(t, 3, 0.28, 6);
/** s06'nın kamerası (s07 devir tesliminde aynı kareyi kurmak için dışa açık) */
export function kamera06(t) {
  const c = KAM(t);
  const sl = SALINIM(t);
  return { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
}
export const kamera06Ham = (t) => KAM(t);
export const salinim06 = SALINIM;

let hazir = false;
let gok, bulutlar, dagUzak, dagYakin, seritler, yol, yolYakin, yolUzak, kandilS, kandilY, agacTur, nesneler, kapi, toprak, tohum,
  hayal, A, meyveK, meyveY, cicekler, fener, kokler, zerreler, fenerler, kus0, AGM, kumeT, meyveT, agacBitis;

const POZ_EGIK = { ...DURUS, bas: 0.2, govde: 0.02 };
const POZ_BAKIS = { ...DURUS, bas: -0.17, govde: -0.015 };
// el göğüste: dirsek gövdenin yanında (siluetin içinde), ön kol çapraz yukarı, el göğsün üstünde (parmaklar karşı omza)
const POZ_GOGUS = { ...DURUS, bas: -0.17, govde: -0.015, omuz: [-0.05, -0.12], dirsek: [0.12, 2.84], el: [0, 1.05] };
const POZ_NUR = { ...POZ_GOGUS, bas: -0.3, govde: -0.03 };
// göğüs ışığının göğüs noktasına göre yeri (dünya px): göğüs ile elin son yeri arasında (elin altında)
const GOGUS_ISIK = (() => {
  const [bx, by] = bilekYeri(POZ_GOGUS.omuz[1], POZ_GOGUS.dirsek[1]);
  const wx = 2 + bx - 8, wy = -OLCU.govde + by + 85; // insanYan: ön omuz (2, -118), göğüs (8, -85) kalçaya göre
  return [0.55 * wx * ADAM.s, 0.4 * wy * ADAM.s];
})();

/** Ön kolun bileği (omuz eklemine göre, gövde çerçevesinde; +x ileri, +y aşağı) */
function bilekYeri(o, d) {
  return [OLCU.kol * Math.sin(o) + OLCU.onkol * Math.sin(o + d), OLCU.kol * Math.cos(o) + OLCU.onkol * Math.cos(o + d)];
}
/** İki parçalı kol ters kinematiği (dirsek bilek–omuz doğrusunun gerisinde; s07'nin kolIK'siyle aynı dal) */
function kolIK(x, y) {
  const L1 = OLCU.kol, L2 = OLCU.onkol;
  const d = clamp(Math.hypot(x, y), Math.abs(L1 - L2) + 1, L1 + L2 - 0.01);
  const be = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
  const o = Math.atan2(x, y) - be;
  let b2 = Math.atan2(x - L1 * Math.sin(o), y - L1 * Math.cos(o));
  if (b2 < -0.5) b2 += 2 * Math.PI;
  return { o, d: b2 - o };
}
/** ve seven: bilek gövdenin hemen önünden, hafifçe öne kavis çizerek göğse çıkar; dirsek yanda kalır (geriye kanat
 *  gibi açılmaz), ön kol bel hizasında döner (göğüs hizasında öne uzanmaz); el yolun ilk yarısında avucu göğse dönecek
 *  biçimde kıvrılır */
function kolGogse(w) {
  const p0 = bilekYeri(DURUS.omuz[1], DURUS.dirsek[1]), p1 = bilekYeri(POZ_GOGUS.omuz[1], POZ_GOGUS.dirsek[1]);
  const k = kolIK(lerp(p0[0], p1[0], w) + 23 * Math.sin(Math.PI * w), lerp(p0[1], p1[1], w));
  return { ...k, el: POZ_GOGUS.el[1] * ease.inOutSine(clamp(w / 0.5)) }; // avuç erkenden göğse döner (öne uzanan yumruk değil)
}

function adamPoz(t) {
  let p = pozKaristir(POZ_EGIK, POZ_BAKIS, an(t, T.taniyan, 0.65, ease.inOutCubic));
  const eg = an(t, T.seven - 0.02, 0.62, ease.inOutCubic);
  if (eg > 0) {
    const k = eg < 1 ? kolGogse(eg) : { o: POZ_GOGUS.omuz[1], d: POZ_GOGUS.dirsek[1], el: POZ_GOGUS.el[1] };
    p = pozKaristir(p, POZ_GOGUS, eg); // baş, gövde ve arka kol
    p.omuz[1] = k.o;
    p.dirsek[1] = k.d;
    p.el[1] = k.el;
  }
  p = pozKaristir(p, POZ_NUR, an(t, T.mazhar + 0.05, 0.9, ease.inOutSine));
  p.govde += 0.006 * Math.sin(t * 2.0);
  p.bas += 0.008 * Math.sin(t * 2.0 + 0.6);
  return p;
}

// ---------------------------------------------------------------- hazırlık
export default {
  sesler: [
    { t: T.cenab, tur: 'nur', guc: 0.4, sure: 2.4 },
    { t: T.taniyan + 0.05, tur: 'parilti', guc: 0.3, tekrar: 4, ara: 0.11 },
    { t: T.saadet + 0.05, tur: 'pop', guc: 0.2, tekrar: 8, ara: 0.09 },
    { t: T.nimet + 0.04, tur: 'pop', guc: 0.24, tekrar: 6, ara: 0.07 },
    { t: T.envar, tur: 'parilti', guc: 0.28, sure: 1.0 },
    { t: T.esrar + 0.06, tur: 'nur', guc: 0.24, sure: 1.2 },
    { t: 53.4, tur: 'whoosh', guc: 0.2, sure: 1.1 },
    { t: T.kuvve, tur: 'kalem', guc: 0.4, sure: 0.9 },
    { t: T.fiil + 0.05, tur: 'firca', guc: 0.35, sure: 0.8 },
    { t: T.mazhar, tur: 'nur', guc: 0.55, sure: 2.4 },
  ],
  hazirla() {
    if (hazir) return; // s07 de çağırır (devir teslim karesi): bir kez hazırlanır
    hazir = true;
    // gök: şafak (ufukta sıcak gül-şeftali parıltı, yukarıda serin mavi)
    gok = gokTuvali({ w: 2100, h: 1560, olcek: 1.6, ad: 's06-gok', gunes: { x: NUR.x + 500, y: NUR.y1 + 620, r: 95 },
      ust: '#5D76B8', orta: '#93AEDC', alt: '#EDC9BE', parilti: '#FBDDB0', arkaUst: '#B6C7EA', arkaAlt: '#F6DCC8', tohum: 61 });
    bulutlar = [[M.bulutOge(300, 5, 1.6), 140, 470], [M.bulutOge(240, 9, 1.6), 1010, 330], [M.bulutOge(200, 14, 1.6), 420, 210], [M.bulutOge(260, 2, 1.6), 1330, 560]];

    // dağlar: kaçış noktasında vadi (nur bu vadiden doğar)
    dagUzak = Y.alanOge({ ad: 's06-dag-uzak', X0: -560, X1: 1900, alt: 1010, olcek: 2.4, tohum: 3, tonY: 260, aralik: 2.6, boy: [30, 90], konturKal: 1.6,
      ust: Y.tumsek(905, [[-260, 300, 230], [120, 215, 170], [400, 128, 140], [560, 40, 90], [850, 46, 90], [1010, 150, 150], [1290, 235, 190], [1640, 300, 240]]),
      renk: { arka: '#D3CDEA', tara: [[0, '#D6D1EC'], [0.6, '#B1ABD8'], [1, '#8F89C0']], kontur: '#9893C6' } });
    dagYakin = Y.alanOge({ ad: 's06-dag-yakin', X0: -560, X1: 1900, alt: 1010, olcek: 2.4, tohum: 7, tonY: 160, aralik: 2.6, boy: [30, 90], konturKal: 1.6,
      ust: Y.tumsek(906, [[-120, 120, 260], [300, 70, 170], [480, 22, 90], [930, 30, 100], [1120, 78, 170], [1480, 120, 260]]),
      renk: { arka: '#C2DCCF', tara: [[0, '#C3DCCF'], [0.6, '#98BFAE'], [1, '#709C8B']], kontur: '#7FA898' } });

    // ova şeritleri (perspektifte incelen tarlalar); kenarlar altyazı bandına düşmesin
    const ZS = [2.3, 4.75, 6.2, 8, 10.5, 14, 20, 30, 50, 95, 200];
    const PAL = [
      { arka: '#B3D897', tara: [[0, '#A9D18E'], [0.6, '#6DAA60'], [1, '#3E7C4F']], kontur: '#55935A' },
      { arka: '#CBE3A0', tara: [[0, '#C4DE95'], [0.6, '#96BF69'], [1, '#62914A']], kontur: '#78A55A' },
      { arka: '#B0D7A4', tara: [[0, '#A6D09A'], [0.6, '#73AE76'], [1, '#4C8A5E']], kontur: '#62996A' },
    ];
    const SIS = [204, 218, 216];
    const kar = (c, h) => { const a = parseInt(c.slice(1), 16); const r = (a >> 16) & 255, g = (a >> 8) & 255, b = a & 255; return '#' + [r, g, b].map((v, i) => Math.round(lerp(v, SIS[i], h)).toString(16).padStart(2, '0')).join(''); };
    seritler = ZS.map((Z, b) => {
      const p = PAL[b % 3];
      const h = Math.pow(b / (ZS.length - 1), 1.15) * 0.6;
      const yTop = PERS.hy + PERS.k / Z;
      const amp = Math.min(30, 140 / Z);
      const sonraki = b > 0 ? PERS.hy + PERS.k / ZS[b - 1] : 2600;
      const r = rng(900 + b);
      const f1 = r() * TAU, f2 = r() * TAU;
      return Y.alanOge({ ad: 's06-serit2-' + b, X0: -620, X1: 1900, alt: b === 0 ? 2600 : sonraki + 50, olcek: b < 2 ? 1.5 : b < 6 ? 1.9 : 2.5,
        tohum: 20 + b, tonY: Math.max(20, Math.min(600, (sonraki - yTop) * 1.3)), aralik: b < 3 ? 3.2 : 2.5, boy: b < 3 ? [40, 110] : [24, 70], konturKal: b < 4 ? 1.8 : 1.4,
        ust: (x) => yTop - amp * (0.55 + 0.3 * Math.sin(x * 0.0042 + f1) + 0.15 * Math.sin(x * 0.011 + f2)),
        renk: { arka: kar(p.arka, h), tara: p.tara.map(([u, c]) => [u, kar(c, h)]), kontur: kar(p.kontur, h * 0.8) } });
    });

    // yol: aşağıdan (izleyiciden) gelir, adamın ayağında sağa döner, kıvrılarak sonsuza gider
    yol = Y.yolModeli({ noktalar: YOL_NOKTA, gen: 1.8 });
    yolYakin = Y.yolOge(yol, { olcek: 1.5, Zmin: 0, Zmax: 12.6, ad: 's06-yol-yakin' });
    yolUzak = Y.yolOge(yol, { olcek: 2.6, Zmin: 11.8, Zmax: 3000, ad: 's06-yol-uzak' });
    const sAdam = yol.sBul(ZM);
    kandilS = Y.kandilLod(false, 2.0);
    kandilY = Y.kandilLod(true, 2.0);
    meyveY = M.meyveOge(11, 2.4, 'kirmizi');
    agacTur = [51, 63, 77].map((t) => Y.yolAgaci(t, { meyve: meyveY }));

    // yol boyu nesneler (kandiller ve ağaçlar), derinliğe göre sıralı
    nesneler = [];
    for (let s = sAdam + 4.6; s < 1500; s += 5) {
      for (const yan of [1, -1]) {
        const p = yol.yan(s, yan * (yol.gen / 2 + 0.36));
        if (p.Z > 1000) continue;
        const [x, y] = Y.proj(p.X, p.Z);
        const d = s - sAdam - 4.6;
        nesneler.push({ tur: 'kandil', s: d, Z: p.Z, x, y, sc: PERS.F / (100 * p.Z), tYan: T.saadet + 0.03 + 0.3 * Math.log(1 + d / 4.5) + (yan === -1 ? 0.04 : 0) });
      }
    }
    const ar = rng(4242);
    for (let s = sAdam + 5.5, j = 0; s < 260; s += (s < 40 ? 4.2 : 6.5) + ar() * 2, j++) {
      const yan = j % 2 ? -1 : 1;
      const d = yan * (yol.gen / 2 + 2.3 + ar() * 1.2);
      const p = yol.yan(s, d);
      const [x, y] = Y.proj(p.X, p.Z);
      const boyM = 3.8 + ar() * 1.0;
      const u = s - sAdam - 5.5;
      if (x > 612 && x < 795 && p.Z < 40) continue; // nurun önü açık kalsın
      if (x > 465 && x < 628 && p.Z < 26) continue; // adamın başının arkası sakin
      if (x > -90 && x < 495 && p.Z < 70) continue; // tohumun hayal ağacının arkası sakin
      nesneler.push({ tur: 'agac', s: u, Z: p.Z, x, y, sc: (PERS.F * boyM) / (p.Z * 363), v: j % 3, faz: ar() * TAU, tMeyve: T.nimet + 0.03 + 0.24 * Math.log(1 + u / 6) });
    }
    // ovada dağınık korular (kapıların ve adamın başının çevresi sakin kalır)
    for (let i = 0; i < 60; i++) {
      const Z = 9 + Math.pow(ar(), 1.6) * 120;
      const sY = yol.sBul(Z);
      const yc = yol.at(sY);
      const X = yc.X + (ar() < 0.5 ? -1 : 1) * (6 + ar() * (8 + Z * 0.55));
      const [x, y] = Y.proj(X, Z);
      if (x < -150 || x > 1350) continue;
      if (x < 500 && Z < 70) continue; // sol: kapılar ve hayal ağacı için sakin tarlalar
      if (x > 465 && x < 628 && Z < 26) continue; // adamın başının arkası
      if (x > 612 && x < 795 && Z < 60) continue; // nurun önü
      if (Z > 30 && x < 330) continue; // kapıların çevresi
      if (x > -90 && x < 495 && Z < 70) continue; // tohumun hayal ağacının arkası
      const boyM = 3.4 + ar() * 1.4;
      nesneler.push({ tur: 'agac', s: Z, Z, x, y, sc: (PERS.F * boyM) / (Z * 363), v: i % 3, faz: ar() * TAU, tMeyve: T.nimet + 0.1 + 0.24 * Math.log(1 + Z / 6) + ar() * 0.1 });
    }
    nesneler.sort((a, b) => b.Z - a.Z);

    // kapılar, tohum, toprak, hayal ağacı, gerçek ağaç
    kapi = Y.kapiOgeleri(3.4);
    toprak = Y.toprakOge({ rx: KESIT.rx, ry: KESIT.ry, olcek: 1.6 });
    tohum = Y.tohumOge(3);
    A = M.agac({ boy: AG.boy, tohum: AG.tohum, olcek: 1.7 });
    hayal = Y.hayalOge(A, { boy: AG.boy, tohum: AG.tohum, olcek: 1.7 });
    meyveK = M.meyveOge(12, 2.2, 'kirmizi');
    // bilfiil: organik büyüme modeli; her yaprak kümesi bağlı olduğu dal noktası açıldıktan sonra oradan çıkar, her
    // meyve kendi kümesi oturduktan sonra (en erken "mazhardır"da) belirir
    AGM = Y.agacBuyumeModeli(A, { boy: AG.boy, tohum: AG.tohum });
    kumeT = AGM.kumeBag.map(([, , lm], i) => buyumeAni(lm, AGM.Ltop) + 0.04 + (i % 3) * 0.025);
    meyveT = A.meyveler.map((m, i) => Math.max(T.mazhar + 0.08 + (i % 5) * 0.04, kumeT[AGM.meyveKume[i]] + KUME_SURE * 0.75));
    agacBitis = Math.max(BUY.t0 + BUY.sure, ...kumeT.map((v) => v + KUME_SURE), ...meyveT.map((v) => v + MEYVE_SURE));
    fener = Y.fenerOge(3);
    // kökler (tohumdan aşağı ve yanlara; kesit penceresinin içinde)
    const kr = rng(77);
    kokler = [];
    for (let i = 0; i < 6; i++) {
      const a = lerp(0.3, Math.PI - 0.3, i / 5) + kr.ara(-0.12, 0.12);
      const L = kr.ara(60, 95);
      const pts = [];
      for (let q = 0; q <= 10; q++) {
        const u = q / 10;
        pts.push([TOH.x + Math.cos(a) * L * u * 1.15 + Math.sin(u * 5 + i) * 4, TOH.y + 4 + Math.sin(a) * L * u * 0.55 + u * u * 8]);
      }
      kokler.push({ pts, t0: T.fiil + 0.06 + i * 0.05 });
    }

    // çiçekler (adamın çevresinde ve ön köşelerde)
    cicekler = [
      { x: 316, y: ZEMIN + 6, s: 0.6, renk: 'sari', isik: true },
      { x: 862, y: ZEMIN + 34, s: 0.62, renk: 'beyaz', isik: true },
      { x: 92, y: ZEMIN + 10, s: 0.58, renk: 'beyaz' },
      { x: -20, y: ZEMIN + 28, s: 0.62, renk: 'pembe' },
      { x: 975, y: ZEMIN + 18, s: 0.5, renk: 'pembe' },
      { x: 150, y: ZEMIN + 36, s: 0.5, renk: 'pembe' },
      { x: 60, y: 1835, s: 1.1, renk: 'pembe', on: true },
      { x: 140, y: 1890, s: 0.9, renk: 'beyaz', on: true },
      { x: 1000, y: 1800, s: 1.05, renk: 'beyaz', on: true },
      { x: 1075, y: 1880, s: 1.15, renk: 'sari', on: true },
    ].map((c) => ({ ...c, oge: M.cicekOge(26, 1.9, c.renk), kesitte: kesitte(c.x, c.y, 16) }));

    // envar: kandillerden ve bütün ovadan göğe yükselen ışık zerreleri, fenerler
    const zr = rng(515);
    const yakin = nesneler.filter((n) => n.tur === 'kandil' && n.s < 60);
    zerreler = [];
    for (let i = 0; i < 30; i++) {
      const n = yakin[Math.floor(zr() * yakin.length)];
      zerreler.push({ x: n.x, y: n.y + Y.KANDIL_ISIK_Y * n.sc, b: clamp(0.45 + n.sc * 0.5, 0.4, 1.1), t0: T.envar - 0.06 + zr() * 0.4, v: 95 + zr() * 80, faz: zr() * TAU, gen: 8 + zr() * 18 });
    }
    for (let i = 0; i < 74; i++) {
      const x = -260 + zr() * 1520;
      // kapıların çevresinde (sol) yalnız ufka yakın tarlalardan: kapı planında altyazı bandına düşmesinler
      const y = x < 380 ? 892 + zr() * 60 : 950 + Math.pow(zr(), 0.8) * 400;
      if (Math.abs(x - ADAM.x) < 70 && y > ZEMIN - 380) continue;
      const b = clamp((y - 880) / 420, 0.3, 1.1);
      zerreler.push({ x, y, b, t0: T.envar + zr() * 0.55 + (x < 350 ? 0.15 : 0), v: 85 + zr() * 90, faz: zr() * TAU, gen: 8 + zr() * 20 });
    }
    // fenerler: hiçbiri adamın (başı dâhil) ya da ufuk kapılarının ve büyüyen ağacın taç alanının önünden geçmez.
    // Her fenerin bütün yolu (yükseliş + salınım) sahne sonuna dek denenir; çakışan aday yeniden seçilir. Soldakiler
    // kapıların arasındaki ve yanındaki boşluklardan yükselir.
    const kutular = [
      { x0: ADAM.x - 52, x1: ADAM.x + 58, y0: ZEMIN - 392, y1: ZEMIN + 10, t0: 0, t1: 99 },
      ...KAPILAR.map(([x, s]) => ({ x0: x - 25 * s, x1: x + 25 * s, y0: KAPI_Y - 72 * s, y1: KAPI_Y + 8, t0: 0, t1: 54.7 })),
    ];
    {
      const K = A.kumeler;
      kutular.push({ x0: AG.x + Math.min(...K.map((k) => k.x - k.R * 1.1)), x1: AG.x + Math.max(...K.map((k) => k.x + k.R * 1.1)),
        y0: AG.y + Math.min(...K.map((k) => k.y - k.R)) - 20, y1: AG.y, t0: 55.75, t1: 99 });
    }
    const fenerCakisir = (f) => {
      for (let tt = f.t0; tt <= T.son + 0.01; tt += 1 / 30) {
        const d = tt - f.t0;
        const y = f.y - d * f.v * f.b - d * d * 4;
        if (an(tt, f.t0, 0.4) * clamp((y + 300) / 400) < 0.03) continue;
        const x = f.x + Math.sin(d * 0.9 + f.faz) * 14 * f.b;
        const s = 0.75 + f.b * 1.05, m = 12;
        for (const k of kutular) {
          if (tt < k.t0 || tt > k.t1) continue;
          if (x + 11 * s + m > k.x0 && x - 11 * s - m < k.x1 && y + m > k.y0 && y - 29 * s - m < k.y1) return true;
        }
      }
      return false;
    };
    const SOL = [-150, 11, 141, 282, 345]; // kapı boşlukları: (-18, 40), (112, 170), 234'ün sağı
    fenerler = [];
    for (let i = 0; i < 13; i++) {
      for (let deneme = 0; deneme < 40; deneme++) {
        const x = i < 5 ? SOL[i] + (zr() - 0.5) * 6 : deneme === 0 ? 400 + (i - 5) * 100 + zr() * 60 : 380 + zr() * 800;
        const y = i < 5 ? 900 + zr() * 50 : 1010 + zr() * 260;
        const b = clamp((y - 880) / 380, 0.4, 1.1);
        const f = { x, y: y - 40, b, t0: T.envar + 0.02 + zr() * 0.5, v: 95 + zr() * 40, faz: zr() * TAU };
        if (!fenerCakisir(f)) { fenerler.push(f); break; }
      }
    }
    kus0 = { t0: 46.9, t1: 50.6 };
  },

  // ops.poz(t): adam pozu yerine geçer (s07, devir teslimde kendi adamını bu karenin içine koyar)
  ciz(ctx, t, ops = {}) {
    const cam = kamera06(t);
    const z = cam.z;
    const nurA = an(t, 46.5, 2.0, ease.outCubic);
    const nurY = lerp(NUR.y0, NUR.y1, nurA);
    const nurG = 0.55 + 0.45 * an(t, 46.6, 1.6, ease.inOutSine);

    // 1) gök ve bulutlar
    kameraIle(ctx, cam, (g) => {
      ogeCiz(g, gok, -500, -620);
      for (const [b, x, y] of bulutlar) ogeCiz(g, b, x + (t - 46.4) * 5, y, { alfa: 0.92 });
    }, F.gok);
    // 2) nur (dağların ardından doğar)
    kameraIle(ctx, cam, (g) => {
      M.nurKuresi(g, NUR.x, nurY, NUR.r, t, { guc: nurG, olcek: 2.4 });
    }, 1);
    // 3) dağlar
    kameraIle(ctx, cam, (g) => ogeCiz(g, dagUzak, 0, 0), F.dag);
    kameraIle(ctx, cam, (g) => {
      ogeCiz(g, dagYakin, 0, 0);
      M.hale(g, NUR.x, PERS.hy - 10, 330, '#FFF0CC', 0.32 * nurG); // vadide ışık
    }, F.tepe);

    // 4) ova, sırt, yol, nesneler, adam
    kameraIle(ctx, cam, (g) => {
      for (let b = seritler.length - 1; b >= 0; b--) ogeCiz(g, seritler[b], 0, 0);
      ogeCiz(g, yolYakin, 0, 0);
      ogeCiz(g, yolUzak, 0, 0);
      // ufuk kapıları
      // kapılar "esrara"nın ilk harfiyle belirmeye başlar (± 0,1 sn), sonra aralanır, içlerinden ışık sızar
      const kc = an(t, T.esrar - 0.02, 0.36, ease.outCubic) * (1 - an(t, 54.05, 0.6, ease.inOutSine));
      if (kc > 0) KAPILAR.forEach(([x, s], i) => {
        g.save();
        g.globalAlpha *= clamp(1 - an(t, 54.05, 0.6, ease.inOutSine));
        Y.kapiCiz(g, kapi, x, KAPI_Y, s, { cizim: an(t, T.esrar - 0.02 + i * 0.06, 0.34, ease.outCubic), acik: an(t, T.esrar + 0.2 + i * 0.09, 0.6, ease.inOutCubic), isik: an(t, T.esrar + 0.26 + i * 0.09, 0.7, ease.outCubic), t, tohum: 30 + i });
        g.restore();
      });
      // yol boyu nesneler
      for (const n of nesneler) {
        const hPx = n.sc * 260 * z;
        if (n.y > 1960 || n.x < -400 || n.x > 1500) continue;
        if (n.tur === 'kandil') {
          if (hPx < 1.2) continue;
          const L = an(t, n.tYan, 0.22, ease.outCubic);
          const ly = n.y + Y.KANDIL_ISIK_Y * n.sc;
          if (hPx >= 4) {
            if (L < 1) Y.lodCiz(g, kandilS, n.x, n.y, n.sc, z);
            if (L > 0) Y.lodCiz(g, kandilY, n.x, n.y, n.sc, z, { alfa: L });
          }
          if (L > 0) {
            const parla = t > n.tYan ? Math.exp(-(t - n.tYan) * 5) : 0;
            Y.isikNokta(g, n.x, ly, Math.max(2.4 / z, 125 * n.sc * (1 + 1.1 * parla)), L * (0.85 + 0.15 * parla));
            if (n.sc > 0.25) { g.save(); g.translate(n.x, n.y); g.scale(1, 0.25); Y.isikNokta(g, 0, 0, 150 * n.sc, 0.45 * L); g.restore(); }
          }
        } else {
          const tr = agacTur[n.v];
          const hA = n.sc * 363 * z;
          if (hA < 2) continue;
          const mA = an(t, n.tMeyve, 0.3, ease.outCubic);
          const r = hA > 60 ? 0.012 * Math.sin(t * 1.1 + n.faz) : 0;
          if (hA > 170 && mA > 0 && mA < 1) {
            Y.lodCiz(g, tr.bos, n.x, n.y, n.sc, z, { r });
            // meyveler tek tek (taşmalı)
            g.save();
            g.translate(n.x, n.y);
            g.rotate(r);
            tr.A.meyveler.forEach((m, k) => {
              const u = pop(t, n.tMeyve + (k % 5) * 0.045, 0.42);
              if (u > 0) ogeCiz(g, meyveY, m[0] * n.sc, m[1] * n.sc, { s: u * n.sc });
            });
            g.restore();
          } else {
            Y.lodCiz(g, mA >= 1 ? tr.dolu : tr.bos, n.x, n.y, n.sc, z, { r });
            if (mA > 0 && mA < 1) Y.lodCiz(g, tr.dolu, n.x, n.y, n.sc, z, { r, alfa: mA });
          }
        }
      }
      // kuş (yaratılıştan bir iz; ışığa doğru uçar)
      if (t > kus0.t0 && t < kus0.t1) {
        const [kx, ky] = kusYeri(t);
        M.kus(g, kx, ky, 1.15, t, { faz: 0.7, alfa: an(t, kus0.t0, 0.3) * (1 - an(t, kus0.t1 - 0.3, 0.3)), renk: '#4A5B7A' });
      }
    }, F.ova);

    // 5) sırt önü: toprak kesiti, tohum, hayal, ağaç, çiçekler, adam
    let adamEk = null;
    kameraIle(ctx, cam, (g) => {
      const acil0 = an(t, 54.0, 0.5, ease.inOutCubic), kapan = 1 - an(t, 56.35, 0.6, ease.inOutSine);
      const acil = acil0 * kapan;
      if (acil > 0) {
        Y.acarakCiz(g, toprak, KESIT.cx, KESIT.y0, acil0, { mod: 'daire', merkez: [TOH.x - KESIT.cx, TOH.y - KESIT.y0], yumusak: 0.012, alfa: kapan });
        // kökler
        for (const k of kokler) {
          const u = an(t, k.t0, 0.7, ease.outCubic);
          if (u > 0) {
            konturCiz(g, k.pts, { renk: '#4E3420', kal: 4.2, alfa: 0.85 * acil, kapali: false, cizim: u, tohum: 9 });
            konturCiz(g, k.pts, { renk: '#EAD5AC', kal: 2.0, alfa: 0.95 * acil, kapali: false, cizim: u * 0.985, tohum: 9 });
          }
        }
        // filiz: tohumdan yüzeye kalın, görünür bir sap; ağaç büyüdükçe kalınlaşıp gövdenin dibine bağlanan kahverengi
        // bir kazık köke döner (ağaç tohumdan çıkar)
        const fz = an(t, T.fiil - 0.02, 0.24, ease.inOutSine);
        if (fz > 0) filizCiz(g, fz, an(t, T.fiil + 0.2, 0.65, ease.inOutSine), acil);
        // tohum ve içindeki saklı ışık
        const ta = an(t, 54.15, 0.35, ease.outCubic) * acil;
        if (ta > 0) {
          const parla = 0.78 + 0.18 * Math.sin(t * 3.2) + 0.9 * Math.exp(-Math.max(0, t - T.fiil) * 3) * (t > T.fiil ? 1 : 0);
          tohumHale(g, TOH.x, TOH.y - 2, 92 * (0.9 + 0.1 * parla), 0.8 * ta * Math.min(1.25, parla));
          Y.isikNokta(g, TOH.x, TOH.y - 2, 95, 0.6 * ta * parla);
          ogeCiz(g, tohum, TOH.x, TOH.y, { s: 1.9, r: -0.12, alfa: ta });
        }
      }
      // gerçek ağaç (bilfiil): gövde filizin ucundan yuvarlak uçlu bir sürgün gibi yükselir, çatalda dallara ayrılır,
      // dallar kendi yolları boyunca uzar (hayalin çizgilerini doldurur); yaprak kümeleri kendi dal noktalarından çıkar,
      // meyveler kümeleri oturduktan sonra gelir. Bitince M.agacCiz'in tam ağacına dikişsiz devredilir.
      if (t >= agacBitis) M.agacCiz(g, A, AG.x, AG.y, { buyume: 1, yaprak: 1, meyveA: 1, t, meyveOge: meyveK, salinim: 0.8 });
      else if (t > BUY.t0) {
        Y.agacBuyuyerekCiz(g, A, AG.x, AG.y, AGM, buyumeBoyu(t, AGM.Ltop), { t, salinim: 0.8, meyveOge: meyveK,
          kumeU: (i) => an(t, kumeT[i], KUME_SURE, ease.lin), meyveU: (i) => an(t, meyveT[i], MEYVE_SURE, ease.lin) });
      }
      // kesik çizgili hayal (bi'l-kuvve)
      const hy = an(t, T.kuvve + 0.1, 0.95, ease.inOutSine);
      const hs = 1 - an(t, T.fiil + 0.45, 0.6, ease.inOutSine);
      if (hy > 0 && hs > 0) {
        Y.isikNokta(g, AG.x, AG.y - AG.boy * 0.62, 330, 0.16 * hy * hs);
        Y.acarakCiz(g, hayal, AG.x, AG.y, hy, { mod: 'sil', yon: -Math.PI / 2, alfa: hs * (0.85 + 0.15 * Math.sin(t * 4)) });
      }
      // mazhardır: yukarıdan inen nur (adamın arkasında; adam ışıkta okunur kalır)
      const ni = an(t, T.mazhar, 0.6, ease.outCubic);
      if (ni > 0) nurSutunu(g, t, ni);
      // çiçekler (kesit açıkken penceresine düşenler toprağa çekilir: toprağın içinde çiçek durmaz)
      cicekCiz(g, t, acil);
      // adam
      const poz = ops.poz ? ops.poz(t) : adamPoz(t);
      adamEk = insanYan(g, ADAM.x, ADAM.y + 1, poz, { s: ADAM.s, olcek: 1.7 });
      // göğüsteki sıcak ışık (ve seven)
      const gl = an(t, T.seven + 0.25, 0.6, ease.outCubic);
      if (gl > 0) {
        const gx = adamEk.gogus[0] + GOGUS_ISIK[0], gy = adamEk.gogus[1] + GOGUS_ISIK[1] - 4;
        const nab = 1 + 0.12 * Math.sin(t * 4.2);
        const guc = gl * (0.75 + 0.5 * an(t, T.mazhar + 0.2, 0.8));
        M.hale(g, gx, gy, 70 * nab, '#FFD9A0', 0.55 * guc);
        Y.yildizcik(g, gx, gy, 9 * nab, 0.9 * guc, '#FFF1D0');
      }
    }, F.ova);

    // ön plan çiçekleri (hafif paralaks)
    kameraIle(ctx, cam, (g) => {
      for (const cc of cicekler) if (cc.on) ogeCiz(g, cc.oge, cc.x, cc.y, { s: cc.s, r: Math.sin(t * 1.1 + cc.x) * 0.05 });
    }, F.on);

    // 6) mazhardır: adamın çevresinde ışık, inen zerreler
    const ni = an(t, T.mazhar, 0.6, ease.outCubic);
    if (ni > 0) kameraIle(ctx, cam, (g) => nurIsik(g, t, ni, adamEk), F.ova);

    // 7) ışık esintisi: nurun ovaya taşan parıltısı
    kameraIle(ctx, cam, (g) => M.hale(g, NUR.x, nurY, 560, '#FFE7BC', 0.26 * nurG), 1);

    // 8) envar: yükselen zerreler ve fenerler
    if (t > T.envar - 0.1) kameraIle(ctx, cam, (g) => envarCiz(g, t), F.ova);

    // 9) şafak: loş, renksiz dünya ufuktan yayılan ışıkla renklenir (ekran uzayı)
    const [nsx, nsy] = ekranda(cam, NUR.x, nurY, 1);
    const R = 3200 * an(t, 46.45, 2.3, ease.inOutSine);
    if (R < 3150) {
      ctx.save();
      const g1 = ctx.createRadialGradient(nsx, nsy, Math.max(0, R - 1000), nsx, nsy, R + 1);
      g1.addColorStop(0, 'rgba(126,122,138,0)');
      g1.addColorStop(1, 'rgba(126,122,138,0.94)');
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(nsx, nsy, Math.max(0, R - 1100), nsx, nsy, R + 1);
      g2.addColorStop(0, 'rgba(214,210,222,0)');
      g2.addColorStop(1, 'rgba(206,201,216,0.75)');
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // 10) tanıyan: her şeyde küçük ışık izi, nura bağlanan ince ışık iplikleri
    const ip = an(t, T.taniyan - 0.02, 0.2) * (1 - an(t, T.nihayet + 0.15, 0.7, ease.inOutSine));
    if (ip > 0) baglantilar(ctx, cam, t, ip, [nsx, nsy]);

    // 11) sırra geçiş: nurdan kopan kıvılcım tohumun yerine iner
    kivilcim(ctx, cam, t);
  },
};

// ---------------------------------------------------------------- yardımcı çizimler
/** Tohumdaki saklı ışık: toprak üstünde de seçilen sıcak altın buğu (normal karışım) */
function tohumHale(g, x, y, R, a) {
  if (a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, R);
  gr.addColorStop(0, `rgba(255,226,140,${0.85 * a})`);
  gr.addColorStop(0.45, `rgba(246,200,100,${0.4 * a})`);
  gr.addColorStop(1, 'rgba(240,190,90,0)');
  g.fillStyle = gr;
  g.fillRect(x - R, y - R, R * 2, R * 2);
}
/** Sırt üstündeki (ön plan olmayan) çiçekler; ac: toprak kesitinin açıklığı (0..1) */
function cicekCiz(g, t, ac = 0) {
  for (const cc of cicekler) {
    if (cc.on) continue;
    const k = cc.kesitte ? 1 - ac : 1;
    if (k <= 0.01) continue;
    ogeCiz(g, cc.oge, cc.x, cc.y, { s: cc.s * (0.35 + 0.65 * k), r: Math.sin(t * 1.3 + cc.x) * 0.05, alfa: Math.min(1, k * 1.6) });
  }
}
/** Filiz → kazık kök: u filizin boyu (tohumdan yüzeye), k kalınlaşma ve kahverengiye dönme, a görünürlük */
function filizCiz(g, u, k, a) {
  const y0 = TOH.y - 9, y1 = AG.y + 1;
  const n = 14;
  const L = [], R = [], M0 = [];
  const m = Math.max(1, Math.round(n * u));
  for (let i = 0; i <= m; i++) {
    const v = i / n;
    const x = TOH.x + lerp(0, AG.x - TOH.x, v) + Math.sin(v * Math.PI) * 4;
    const y = lerp(y0, y1, v);
    // yarı genişlik: dipte ince, yüzeye doğru kalın; ağaç büyüdükçe gövdenin dibi kadar genişler
    const hw = lerp(lerp(4, 7.5, v), lerp(7, 24, v * v), k);
    L.push([x - hw, y]); R.push([x + hw, y]); M0.push([x - hw * 0.35, y]);
  }
  const govde = (pay) => {
    g.beginPath();
    L.forEach(([x, y], i) => (i ? g.lineTo(x - pay, y) : g.moveTo(x - pay, y)));
    for (let i = R.length - 1; i >= 0; i--) g.lineTo(R[i][0] + pay, R[i][1]);
    g.closePath();
  };
  g.save();
  g.globalAlpha *= a;
  g.fillStyle = rgba(k < 0.5 ? '#2F4A22' : '#3E2A18', 0.95);
  govde(1.8);
  g.fill();
  const r = Math.round(lerp(0x7E, 0x9C, k)), gg = Math.round(lerp(0xA8, 0x74, k)), b = Math.round(lerp(0x56, 0x48, k));
  g.fillStyle = `rgb(${r},${gg},${b})`;
  govde(0);
  g.fill();
  // ışık tarafı (ince açık çizgi)
  g.fillStyle = rgba('#F1E2B8', 0.55);
  if (M0.length > 1) darbe(g, M0, 1.6, { incelme: 0.3 });
  g.restore();
}
function kusYeri(t) {
  const u = (t - 46.9) / 3.7;
  return [lerp(-90, 1180, u), 655 - 120 * u + Math.sin(u * 9) * 14];
}

function baglantilar(ctx, cam, t, ip, nur) {
  const n0 = nesneler.filter((n) => n.tur === 'agac').reduce((m, n) => (n.Z < m.Z ? n : m)); // en yakın yol ağacı
  const kaynak = [
    { t0: T.taniyan, w: cicekler[1].x, y: cicekler[1].y - 4 },
    { t0: T.taniyan + 0.12, w: n0 ? n0.x : 800, y: n0 ? n0.y - n0.sc * 300 : 1000 },
    { t0: T.taniyan + 0.22, w: cicekler[0].x, y: cicekler[0].y - 4 },
    { t0: T.taniyan + 0.3, kus: true },
  ];
  ctx.save();
  kaynak.forEach((k, i) => {
    let wx = k.w, wy = k.y;
    if (k.kus) [wx, wy] = kusYeri(t);
    const [sx, sy] = ekranda(cam, wx, wy, 1);
    const u = an(t, k.t0, 0.55, ease.inOutCubic);
    if (u <= 0) return;
    const iz = pop(t, k.t0, 0.4);
    Y.yildizcik(ctx, sx, sy, 15 * iz, ip);
    // iplik: hafif kavisli
    const mx = (sx + nur[0]) / 2, my = Math.min(sy, nur[1]) - 90 - i * 20;
    const pts = [];
    for (let q = 0; q <= 40; q++) {
      const v = q / 40;
      pts.push([(1 - v) * (1 - v) * sx + 2 * v * (1 - v) * mx + v * v * nur[0], (1 - v) * (1 - v) * sy + 2 * v * (1 - v) * my + v * v * nur[1]]);
    }
    ctx.globalCompositeOperation = 'screen';
    konturCiz(ctx, pts, { renk: '#F6D48A', kal: 8, alfa: 0.25 * ip, kapali: false, cizim: u, tohum: 50 + i, titreme: 0.2 });
    konturCiz(ctx, pts, { renk: '#FFF4D2', kal: 2.6, alfa: 0.95 * ip, kapali: false, cizim: u, tohum: 60 + i, titreme: 0.2 });
    // ipliğin ucunda ilerleyen ışık
    if (u < 1) {
      const p = pts[Math.round(u * 40)];
      Y.isikNokta(ctx, p[0], p[1], 16, 0.8 * ip);
    }
  });
  ctx.restore();
  // kuş (ipliğin kaynağı; ışıkla birlikte görünür)
}

function nurSutunu(g, t, ni, alfa = 1) {
  const x = ADAM.x + 6, yAlt = ADAM.y;
  const yUst = -760;
  const yBas = lerp(yUst, yAlt + 10, ni);
  const gen0 = 95, gen1 = 175;
  const nefes = 0.85 + 0.15 * Math.sin(t * 2.3);
  g.save();
  g.globalCompositeOperation = 'screen';
  const gr = g.createLinearGradient(0, yUst, 0, yAlt);
  gr.addColorStop(0, 'rgba(255,232,170,0)');
  gr.addColorStop(0.3, 'rgba(255,226,150,0.7)');
  gr.addColorStop(1, 'rgba(255,214,128,0.85)');
  g.fillStyle = gr;
  g.filter = 'blur(22px)';
  for (const [k, a, kar] of [[1.15, 0.3, 'source-over'], [1.0, 0.5, 'screen'], [0.5, 0.5, 'screen']]) {
    g.globalCompositeOperation = kar;
    g.globalAlpha = a * nefes * ni * alfa;
    g.beginPath();
    g.moveTo(x - gen0 * k, yUst);
    g.lineTo(x + gen0 * k, yUst);
    g.lineTo(x + gen1 * k, yBas);
    g.lineTo(x - gen1 * k, yBas);
    g.closePath();
    g.fill();
  }
  g.filter = 'none';
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'screen';
  // inen kalem ışınları (ince, altın)
  const r = rng(808);
  for (let i = 0; i < 9; i++) {
    const u = (i + 0.5) / 9 - 0.5;
    const x0 = x + u * gen0 * 1.6, x1 = x + u * gen1 * 1.7;
    const L = yBas - yUst;
    const a0 = r.ara(0.0, 0.25), a1 = r.ara(0.55, 0.95);
    const pts = [];
    for (let q = 0; q <= 10; q++) { const v = lerp(a0, a1, q / 10); pts.push([lerp(x0, x1, v), yUst + L * v]); }
    g.fillStyle = rgba('#EDBE55', 0.55 * ni * alfa * (0.6 + 0.4 * Math.sin(t * 1.7 + i * 1.3)));
    darbe(g, pts, 2.6, { incelme: 0.4, sivri: 0.6 });
  }
  g.restore();
}
function nurIsik(g, t, ni, adamEk, alfa = 1) {
  const x = ADAM.x + 6, yAlt = ADAM.y;
  const yUst = -760;
  const yBas = lerp(yUst, yAlt + 10, ni);
  const gen1 = 175;
  const r = rng(809);
  // yerde ve adamın çevresinde ışık (kenar ışığı gibi, yumuşak)
  const yak = an(t, T.mazhar + 0.3, 0.7, ease.outCubic);
  if (adamEk) {
    M.hale(g, adamEk.bas[0], adamEk.bas[1] - 10, 120, '#FFF2CC', 0.22 * yak * (adamEk.basAlfa ?? 1) * alfa);
    M.hale(g, x, yAlt + 4, 170, '#FFE9B4', 0.36 * yak * alfa);
  }
  // inen ışık zerreleri
  for (let i = 0; i < 20; i++) {
    const faz = r();
    const hiz = 120 + r() * 110;
    const yy = yUst + 500 + ((((faz * 1150 + (t - T.mazhar) * hiz) % 1150) + 1150) % 1150);
    if (yy > yBas) continue;
    const xx = x + (r() - 0.5) * gen1 * 1.5 + Math.sin(t * 1.5 + i) * 8;
    Y.isikNokta(g, xx, yy, 5 + r() * 6, 0.8 * ni * alfa * Math.sin(clamp((yy - yUst - 500) / 1150) * Math.PI));
  }
}

function envarCiz(g, t) {
  for (const z0 of zerreler) {
    const d = t - z0.t0;
    if (d <= 0) continue;
    const y = z0.y - d * z0.v * z0.b - d * d * 6;
    const x = z0.x + Math.sin(d * 1.6 + z0.faz) * z0.gen * z0.b;
    const a = an(t, z0.t0, 0.18) * clamp((y + 100) / 400) * (1 - an(t, z0.t0 + 3.8, 1.2));
    if (a <= 0) continue;
    const R = (17 + 6 * Math.sin(d * 3 + z0.faz)) * z0.b + 6;
    Y.isikNokta(g, x, y, R, 0.9 * a);
    if (z0.b > 0.7) Y.isikNokta(g, x, y, R * 0.4, 0.8 * a, 'lighter');
  }
  for (const f of fenerler) {
    const d = t - f.t0;
    if (d <= 0) continue;
    const y = f.y - d * f.v * f.b - d * d * 4;
    const x = f.x + Math.sin(d * 0.9 + f.faz) * 14 * f.b;
    const a = an(t, f.t0, 0.4) * clamp((y + 300) / 400);
    if (a <= 0) continue;
    const s = 0.75 + f.b * 1.05;
    Y.isikNokta(g, x, y - 12 * s, 70 * s, 0.75 * a);
    ogeCiz(g, fener, x, y, { s, r: Math.sin(d * 1.2 + f.faz) * 0.06, alfa: a });
  }
}

function kivilcim(ctx, cam, t) {
  const t0 = 53.62, t1 = 54.25;
  if (t < t0 || t > t1 + 0.25) return;
  const p0 = [KAPILAR[1][0], KAPI_Y - 24], p1 = [250, 1000], p2 = [TOH.x, TOH.y];
  const at = (u) => [(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1]];
  const u = an(t, t0, t1 - t0, ease.inOutSine);
  const son = 1 - an(t, t1, 0.25);
  for (let k = 7; k >= 0; k--) {
    const v = clamp(u - k * 0.022);
    const [wx, wy] = at(v);
    const [sx, sy] = ekranda(cam, wx, wy, 1);
    if (k === 0) { Y.yildizcik(ctx, sx, sy, 26, son); Y.isikNokta(ctx, sx, sy, 60, 0.6 * son); }
    else Y.isikNokta(ctx, sx, sy, 34 - k * 3, (0.7 - k * 0.08) * son);
  }
}

// ---------------------------------------------------------------- devir teslim (s07) için dışa açık parçalar
// s07, s06'nın son karesini birebir sürdürür: aynı kamera (benzerlik dönüşümüyle), aynı ağaç, çiçekler, yol, nur ve adam.
export const GEO06 = { ADAM, AG, NUR, ZEMIN, ADAM_OLCEK: 1.7 };
export const adamPoz06 = adamPoz;
/** Sırttaki çiçekler (dünya s06) ve onları s06'daki gibi çizen işlev */
export const cicekler06 = () => cicekler.filter((c) => !c.on);
export const cicekCiz06 = (g, t) => cicekCiz(g, t, 0);
/** Tam büyümüş, meyveli ağaç (s06'daki son hâli) */
export const agac06 = () => ({ A, meyveK, salinim: 0.8 });
export const nurSutunu06 = nurSutunu;
export const nurIsik06 = nurIsik;
/** Yolun yakın parçasının kenarları (s06 dünyası) */
export const yolKenar06 = (Zmax = 12.6) => Y.yolCokgen(yol, 0, Zmax);
/** Yolun yakın parçasının sprite'ı (s06 dünyasında (0, 0)'a çizilir) */
export const yolOge06 = () => yolYakin;
/** Nur küresinin t'deki yeri, yarıçapı ve gücü (s06 dünyası, paralaks 1) */
export function nur06(t) {
  return { x: NUR.x, y: lerp(NUR.y0, NUR.y1, an(t, 46.5, 2.0, ease.outCubic)), r: NUR.r, guc: 0.55 + 0.45 * an(t, 46.6, 1.6, ease.inOutSine) };
}
