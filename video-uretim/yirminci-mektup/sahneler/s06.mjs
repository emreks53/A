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
import { ogeCiz, ogeAcarak, gokTuvali, konturCiz, PALET } from '../motor/kalem.mjs';
import { kameraIle, ekranda, salinim } from '../motor/sahne.mjs';
import { kb } from '../motor/zaman.mjs';
import { insanYan, DURUS, pozKaristir } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import * as Y from './s06-yardim.mjs';

const T = {
  bas: 46.4, cenab: kb('cenabı'), hak: kb('hakkı'), taniyan: kb('tanıyan'), seven: kb('seven'),
  nihayet: kb('nihayetsiz'), saadet: kb('saadete'), nimet: kb('nimete'), envar: kb('envara'), esrar: kb('esrara'),
  ya: kb('ya'), kuvve: kb('bilkuvve'), veya: kb('veya'), fiil: kb('bilfiil'), mazhar: kb('mazhardır'), son: 57.4,
};

// ---------------------------------------------------------------- dünya yerleşimi (nötr görünüş = geniş plan)
const { PERS } = Y;
const VP = [PERS.vx, PERS.hy];
const ZM = 4.6; // adamın ve ağacın derinliği
const ZEMIN = PERS.hy + PERS.k / ZM; // onların bastığı yer (y)
const ADAM = { x: 436, y: ZEMIN, s: (PERS.F * 1.78) / (ZM * 384) };
const AG = { x: 128, y: ZEMIN + 1, boy: 600, tohum: 37 };
const TOH = { x: AG.x + 3, y: ZEMIN + 62 };
const KESIT = { cx: 150, y0: ZEMIN, rx: 255, ry: 172 };
const NUR = { x: VP[0], y0: 990, y1: 765, r: 78 };
const KAPILAR = [[505, 0.86], [592, 0.98], [810, 0.98], [898, 0.86]];
const KAPI_Y = 886;
const YOL_NOKTA = [[-0.9, 1.2], [-1.3, 3.0], [-1.35, ZM], [0.3, 5.6], [2.4, 7.5], [2.8, 11], [1.0, 18], [-1.5, 30], [0.5, 50], [1.5, 90]];

// paralaks
const F = { gok: 0.92, dag: 0.96, tepe: 0.98, ova: 1, on: 1.08 };

// kamera: tek, akıcı yolculuk (hız anahtarlarda sürekli)
const KAM = Y.puruzsuzYol([
  { t: 46.4, x: 538, y: 1112, z: 1.28 },
  { t: 47.8, x: 540, y: 1106, z: 1.31 },
  { t: 48.95, x: 544, y: 1100, z: 1.36 },
  { t: 50.5, x: 600, y: 992, z: 0.95 },
  { t: 51.75, x: 612, y: 968, z: 0.99 },
  { t: 52.5, x: 650, y: 832, z: 0.98 },
  { t: 53.3, x: 700, y: 872, z: 2.1 },
  { t: 53.62, x: 700, y: 875, z: 2.18 },
  { t: 54.35, x: 278, y: 1222, z: 1.35 },
  { t: 55.4, x: 280, y: 1216, z: 1.41 },
  { t: 56.05, x: 284, y: 1210, z: 1.39 },
  { t: 57.4, x: 380, y: 1130, z: 1.16 },
]);

let gok, bulutlar, dagUzak, dagYakin, seritler, sirt, yol, yolSp, kandilS, kandilY, agacTur, nesneler, kapi, toprak, tohum,
  hayal, A, meyveK, meyveY, cicekler, fener, kokler, zerreler, fenerler, kus0;

const POZ_EGIK = { ...DURUS, bas: 0.2, govde: 0.02 };
const POZ_BAKIS = { ...DURUS, bas: -0.17, govde: -0.015 };
const POZ_GOGUS = { ...DURUS, bas: -0.17, govde: -0.015, omuz: [-0.05, -0.34], dirsek: [0.12, 2.82], el: [0, 0.32] };
const POZ_NUR = { ...POZ_GOGUS, bas: -0.3, govde: -0.03 };

function adamPoz(t) {
  let p = pozKaristir(POZ_EGIK, POZ_BAKIS, an(t, T.taniyan, 0.65, ease.inOutCubic));
  p = pozKaristir(p, POZ_GOGUS, an(t, T.seven - 0.02, 0.6, ease.inOutCubic));
  p = pozKaristir(p, POZ_NUR, an(t, T.mazhar + 0.05, 0.9, ease.inOutSine));
  p.govde += 0.006 * Math.sin(t * 2.0);
  p.bas += 0.008 * Math.sin(t * 2.0 + 0.6);
  return p;
}

// ---------------------------------------------------------------- hazırlık
export default {
  sesler: [
    { t: 46.55, tur: 'ruzgar', guc: 0.18, sure: 2.2 },
    { t: T.cenab, tur: 'nur', guc: 0.4, sure: 2.4 },
    { t: T.taniyan + 0.05, tur: 'parilti', guc: 0.3, tekrar: 4, ara: 0.11 },
    { t: T.seven + 0.1, tur: 'kalp', guc: 0.22 },
    { t: T.nihayet, tur: 'whoosh', guc: 0.3, sure: 1.3 },
    { t: T.saadet + 0.05, tur: 'pop', guc: 0.2, tekrar: 8, ara: 0.09 },
    { t: T.nimet + 0.04, tur: 'pop', guc: 0.24, tekrar: 6, ara: 0.07 },
    { t: T.envar, tur: 'parilti', guc: 0.32, sure: 1.2 },
    { t: T.esrar, tur: 'kapi', guc: 0.25 },
    { t: 53.6, tur: 'whoosh', guc: 0.34, sure: 0.8 },
    { t: T.kuvve, tur: 'kalem', guc: 0.4, sure: 0.9 },
    { t: T.fiil + 0.05, tur: 'firca', guc: 0.35, sure: 0.8 },
    { t: T.mazhar, tur: 'nur', guc: 0.55, sure: 2.4 },
  ],
  hazirla() {
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

    // ova şeritleri (perspektifte incelen tarlalar)
    const ZS = [6.0, 7.6, 10, 13.5, 19, 28, 45, 80, 170];
    const PAL = [
      { arka: '#B3D897', tara: [[0, '#A9D18E'], [0.6, '#6DAA60'], [1, '#3E7C4F']], kontur: '#55935A' },
      { arka: '#CBE3A0', tara: [[0, '#C4DE95'], [0.6, '#96BF69'], [1, '#62914A']], kontur: '#78A55A' },
      { arka: '#B0D7A4', tara: [[0, '#A6D09A'], [0.6, '#73AE76'], [1, '#4C8A5E']], kontur: '#62996A' },
    ];
    const SIS = [200, 216, 214];
    const kar = (c, h) => { const a = parseInt(c.slice(1), 16); const r = (a >> 16) & 255, g = (a >> 8) & 255, b = a & 255; return '#' + [r, g, b].map((v, i) => Math.round(lerp(v, SIS[i], h)).toString(16).padStart(2, '0')).join(''); };
    seritler = ZS.map((Z, b) => {
      const p = PAL[b % 3];
      const h = Math.pow(b / (ZS.length - 1), 1.1) * 0.62;
      const yTop = PERS.hy + PERS.k / Z;
      const amp = 230 / Z;
      const sonraki = b > 0 ? PERS.hy + PERS.k / ZS[b - 1] : 2500;
      const r = rng(900 + b);
      const f1 = r() * TAU, f2 = r() * TAU;
      return Y.alanOge({ ad: 's06-serit-' + b, X0: -600, X1: 1900, alt: b === 0 ? 2500 : sonraki + 60, olcek: b < 3 ? 1.5 : b < 6 ? 2.0 : 2.5,
        tohum: 20 + b, tonY: Math.max(20, (sonraki - yTop) * 1.4), aralik: b < 3 ? 3.2 : 2.5, boy: b < 3 ? [40, 110] : [24, 70], konturKal: b < 4 ? 1.8 : 1.4,
        ust: (x) => yTop - amp * (0.55 + 0.3 * Math.sin(x * 0.0042 + f1) + 0.15 * Math.sin(x * 0.011 + f2)),
        renk: { arka: kar(p.arka, h), tara: p.tara.map(([u, c]) => [u, kar(c, h)]), kontur: kar(p.kontur, h * 0.8) } });
    });
    // adamın durduğu sırt
    sirt = Y.alanOge({ ad: 's06-sirt', X0: -620, X1: 1900, alt: 2500, olcek: 1.6, tohum: 41, tonY: 520, ust,
      renk: { arka: '#B7DB9F', tara: [[0, '#A9D392'], [0.6, '#6EAD62'], [1, '#3D7B4E']], kontur: '#4E8A55' } });

    // yol
    const Z0 = Y.zemindenZ(1252);
    yol = Y.yolModeli({ X0: ((430 - PERS.vx) * Z0) / PERS.F, Z0, th0: 0.3, gen: 1.8 });
    yolSp = Y.yolOge(yol, { olcek: 2.2 });
    kandilS = Y.kandilLod(false, 2.0);
    kandilY = Y.kandilLod(true, 2.0);
    meyveY = M.meyveOge(9, 2.4, 'kirmizi');
    agacTur = [51, 63, 77].map((t) => Y.yolAgaci(t, { meyve: meyveY }));

    // yol boyu nesneler (kandiller ve ağaçlar), derinliğe göre sıralı
    nesneler = [];
    for (let s = 3, i = 0; s < 1400; s += 4, i++) {
      for (const yan of [1, -1]) {
        if (yan === -1 && s < 10) continue; // ön taraftaki ilk kandiller adamın önünü kapatmasın
        const p = yol.yan(s, yan * (yol.gen / 2 + 0.38));
        if (p.Z > 900) continue;
        const [x, y] = Y.proj(p.X, p.Z);
        nesneler.push({ tur: 'kandil', s, Z: p.Z, x, y, sc: PERS.F / (100 * p.Z), tYan: T.saadet + 0.04 + 0.32 * Math.log(1 + (s - 3) / 5) + (yan === -1 ? 0.03 : 0) });
      }
    }
    const ar = rng(4242);
    for (let s = 5, j = 0; s < 420; s += 4.4 + ar() * 1.2, j++) {
      const yan = j % 2 ? -1 : 1;
      if (yan === -1 && s < 9) continue;
      const d = yan * (yol.gen / 2 + 1.9 + ar() * 0.8);
      const p = yol.yan(s, d);
      const [x, y] = Y.proj(p.X, p.Z);
      const boyM = 3.7 + ar() * 1.0;
      nesneler.push({ tur: 'agac', s, Z: p.Z, x, y, sc: (PERS.F * boyM) / (p.Z * 363), v: j % 3, faz: ar() * TAU, tMeyve: T.nimet + 0.03 + 0.26 * Math.log(1 + (s - 5) / 6) });
    }
    // ovada dağınık korular
    for (let i = 0; i < 46; i++) {
      const Z = 11 + Math.pow(ar(), 1.6) * 150;
      const yc = yol.m.reduce((m, p) => (Math.abs(p.Z - Z) < Math.abs(m.Z - Z) ? p : m), yol.m[0]);
      const X = yc.X + (ar() < 0.5 ? -1 : 1) * (5 + ar() * (8 + Z * 0.5));
      const [x, y] = Y.proj(X, Z);
      if (x < -150 || x > 1350) continue;
      if (x < 520 && Z < 60) continue; // adamın başının çevresi sakin kalsın
      const boyM = 3.4 + ar() * 1.4;
      nesneler.push({ tur: 'agac', s: Z, Z, x, y, sc: (PERS.F * boyM) / (Z * 363), v: i % 3, faz: ar() * TAU, tMeyve: T.nimet + 0.1 + 0.26 * Math.log(1 + Z / 6) + ar() * 0.1 });
    }
    nesneler.sort((a, b) => b.Z - a.Z);

    // kapılar, tohum, toprak, hayal ağacı, gerçek ağaç
    kapi = Y.kapiOgeleri(3.4);
    toprak = Y.toprakOge({ X0: -460, X1: 1010, ust, alt: 2450, olcek: 1.6, cakilYasak: (x, y) => (x > 30 && x < 470 && y < 1520) });
    tohum = Y.tohumOge(3);
    A = M.agac({ boy: AG.boy, tohum: AG.tohum, olcek: 1.7 });
    hayal = Y.hayalOge(A, { boy: AG.boy, tohum: AG.tohum, olcek: 1.7 });
    meyveK = M.meyveOge(12, 2.2, 'kirmizi');
    fener = Y.fenerOge(3);
    // kökler (tohumdan aşağı ve yanlara)
    const kr = rng(77);
    kokler = [];
    for (let i = 0; i < 6; i++) {
      const a = lerp(0.35, Math.PI - 0.35, i / 5) + kr.ara(-0.12, 0.12);
      const L = kr.ara(55, 95);
      const pts = [];
      for (let q = 0; q <= 10; q++) {
        const u = q / 10;
        pts.push([TOH.x + Math.cos(a) * L * u * 1.25 + Math.sin(u * 5 + i) * 4, TOH.y + 6 + Math.sin(a) * L * u * 0.62 + u * u * 10]);
      }
      kokler.push({ pts, t0: T.fiil + 0.08 + i * 0.05 });
    }

    // çiçekler (sırtta)
    cicekler = [
      { x: 474, dy: 10, s: 0.62, renk: 'beyaz', isik: true },
      { x: 262, dy: 6, s: 0.55, renk: 'sari', isik: true },
      { x: 538, dy: 22, s: 0.5, renk: 'pembe' },
      { x: 30, dy: 16, s: 0.58, renk: 'beyaz' },
      { x: -70, dy: 30, s: 0.6, renk: 'pembe' },
      { x: 610, dy: 40, s: 0.55, renk: 'beyaz' },
      { x: 205, dy: 34, s: 0.5, renk: 'pembe' },
    ].map((c) => ({ ...c, y: ust(c.x) + c.dy, oge: M.cicekOge(26, 1.7, c.renk) }));

    // envar: yükselen ışık zerreleri ve fenerler
    const zr = rng(515);
    const yakin = nesneler.filter((n) => n.tur === 'kandil' && n.s < 70);
    zerreler = Array.from({ length: 48 }, (_, i) => {
      const n = yakin[Math.floor(zr() * yakin.length)];
      return { x: n.x, y: n.y + Y.KANDIL_ISIK_Y * n.sc, b: 0.45 + n.sc * 0.55, t0: T.envar - 0.05 + zr() * 0.45, v: 70 + zr() * 90, faz: zr() * TAU, gen: 8 + zr() * 18 };
    });
    fenerler = Array.from({ length: 9 }, (_, i) => {
      const s = 7 + i * 4.2 + zr() * 2;
      const p = yol.yan(s, (i % 2 ? 1 : -1) * (0.6 + zr() * 1.8));
      const [x, y] = Y.proj(p.X, p.Z, 1.2);
      return { x, y, b: Math.min(1.25, (PERS.F / (100 * p.Z)) * 1.1), t0: T.envar + 0.04 + i * 0.075, v: 45 + zr() * 30, faz: zr() * TAU };
    });
    kus0 = { t0: 46.9, t1: 50.6 };
  },

  ciz(ctx, t) {
    const c = KAM(t);
    const sl = salinim(t, 3, 0.28, 6);
    const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
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
      ogeCiz(g, sirt, 0, 0);
      ogeCiz(g, yolSp, 0, 0);
      // ufuk kapıları
      const kc = an(t, T.esrar - 0.42, 0.42, ease.outCubic);
      if (kc > 0) KAPILAR.forEach(([x, s], i) => {
        Y.kapiCiz(g, kapi, x, KAPI_Y, s, { cizim: an(t, T.esrar - 0.42 + i * 0.05, 0.4, ease.outCubic), acik: an(t, T.esrar + 0.02 + i * 0.09, 0.6, ease.inOutCubic), isik: an(t, T.esrar + 0.08 + i * 0.09, 0.7, ease.outCubic), t, tohum: 30 + i });
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
            Y.isikNokta(g, n.x, ly, Math.max(2.2 / z, 95 * n.sc * (1 + 0.6 * parla)), L * (0.8 + 0.2 * parla));
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
      const acil = an(t, 54.0, 0.5, ease.inOutCubic) * (1 - an(t, 56.4, 0.7, ease.inOutCubic));
      if (acil > 0) {
        ogeAcarak(g, toprak, 0, 0, acil, { mod: 'sil', yon: Math.PI / 2, yumusak: 0.06 });
        // kökler
        for (const k of kokler) {
          const u = an(t, k.t0, 0.7, ease.outCubic);
          if (u > 0) konturCiz(g, k.pts, { renk: '#7A5536', kal: 2.0, alfa: 0.85 * acil, kapali: false, cizim: u, tohum: 9 });
        }
        // filiz (tohumdan yüzeye)
        const fz = an(t, T.fiil, 0.3, ease.inOutSine);
        if (fz > 0) konturCiz(g, [[TOH.x, TOH.y - 6], [TOH.x - 3, TOH.y - 26], [TOH.x + 1, AG.y - 2]], { renk: '#4E7A3A', kal: 3.2, alfa: acil, kapali: false, cizim: fz, tohum: 3 });
        // tohum ve içindeki saklı ışık
        const ta = an(t, 54.15, 0.35, ease.outCubic) * acil;
        if (ta > 0) {
          const parla = 0.5 + 0.2 * Math.sin(t * 3.2) + 0.9 * Math.exp(-Math.max(0, t - T.fiil) * 3) * (t > T.fiil ? 1 : 0);
          Y.isikNokta(g, TOH.x, TOH.y - 2, 60, 0.55 * ta * parla);
          ogeCiz(g, tohum, TOH.x, TOH.y, { s: 1.15, r: -0.12, alfa: ta });
        }
      }
      // gerçek ağaç (bilfiil)
      const bu = an(t, T.fiil + 0.12, 0.75, ease.outCubic);
      if (bu > 0) {
        M.agacCiz(g, A, AG.x, AG.y, { buyume: bu, yaprak: an(t, T.fiil + 0.38, 0.6, ease.lin), meyveA: an(t, T.mazhar + 0.08, 0.5, ease.lin), t, meyveOge: meyveK, salinim: 0.8 });
      }
      // kesik çizgili hayal (bi'l-kuvve)
      const hy = an(t, T.kuvve + 0.1, 0.95, ease.inOutSine);
      const hs = 1 - an(t, T.fiil + 0.45, 0.6, ease.inOutSine);
      if (hy > 0 && hs > 0) {
        Y.isikNokta(g, AG.x, AG.y - AG.boy * 0.62, 330, 0.16 * hy * hs);
        ogeAcarak(g, hayal, AG.x, AG.y, hy, { mod: 'sil', yon: -Math.PI / 2, alfa: hs * (0.85 + 0.15 * Math.sin(t * 4)) });
      }
      // çiçekler
      for (const cc of cicekler) ogeCiz(g, cc.oge, cc.x, cc.y, { s: cc.s, r: Math.sin(t * 1.3 + cc.x) * 0.05 });
      // adam
      const poz = adamPoz(t);
      adamEk = insanYan(g, ADAM.x, ust(ADAM.x) + 1, poz, { s: ADAM.s, olcek: 1.6 });
      // göğüsteki sıcak ışık (ve seven)
      const gl = an(t, T.seven + 0.25, 0.6, ease.outCubic);
      if (gl > 0) {
        const gx = lerp(adamEk.gogus[0], adamEk.el[0], 0.55), gy = lerp(adamEk.gogus[1], adamEk.el[1], 0.4) - 4;
        const nab = 1 + 0.12 * Math.sin(t * 4.2);
        const guc = gl * (0.75 + 0.5 * an(t, T.mazhar + 0.2, 0.8));
        M.hale(g, gx, gy, 70 * nab, '#FFD9A0', 0.55 * guc);
        Y.yildizcik(g, gx, gy, 9 * nab, 0.9 * guc, '#FFF1D0');
      }
    }, F.ova);

    // 6) mazhardır: yukarıdan inen nur
    const ni = an(t, T.mazhar, 0.6, ease.outCubic);
    if (ni > 0) kameraIle(ctx, cam, (g) => nurSutunu(g, t, ni, adamEk), F.ova);

    // 7) ışık esintisi: nurun ovaya taşan parıltısı
    kameraIle(ctx, cam, (g) => M.hale(g, NUR.x, nurY, 560, '#FFE7BC', 0.26 * nurG), 1);

    // 8) envar: yükselen zerreler ve fenerler
    if (t > T.envar - 0.1) kameraIle(ctx, cam, (g) => envarCiz(g, t), F.ova);

    // 9) şafak: loş, renksiz dünya ufuktan yayılan ışıkla renklenir (ekran uzayı)
    const [nsx, nsy] = ekranda(cam, NUR.x, nurY, 1);
    const R = 2900 * an(t, 46.5, 2.1, ease.inOutSine);
    if (R < 2850) {
      ctx.save();
      const g1 = ctx.createRadialGradient(nsx, nsy, Math.max(0, R - 800), nsx, nsy, R + 1);
      g1.addColorStop(0, 'rgba(126,122,138,0)');
      g1.addColorStop(1, 'rgba(126,122,138,0.94)');
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, W, H);
      const g2 = ctx.createRadialGradient(nsx, nsy, Math.max(0, R - 900), nsx, nsy, R + 1);
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
function kusYeri(t) {
  const u = (t - 46.9) / 3.7;
  return [lerp(-90, 1180, u), 655 - 120 * u + Math.sin(u * 9) * 14];
}

function baglantilar(ctx, cam, t, ip, nur) {
  const n0 = nesneler.find((n) => n.tur === 'agac' && n.s < 12); // en yakın yol ağacı
  const kaynak = [
    { t0: T.taniyan, w: cicekler[0].x, y: cicekler[0].y - 6 },
    { t0: T.taniyan + 0.12, w: n0 ? n0.x : 800, y: n0 ? n0.y - n0.sc * 300 : 1000 },
    { t0: T.taniyan + 0.22, w: cicekler[1].x, y: cicekler[1].y - 6 },
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
    Y.yildizcik(ctx, sx, sy, 10 * iz, 0.95 * ip);
    // iplik: hafif kavisli
    const mx = (sx + nur[0]) / 2, my = Math.min(sy, nur[1]) - 90 - i * 20;
    const pts = [];
    for (let q = 0; q <= 40; q++) {
      const v = q / 40;
      pts.push([(1 - v) * (1 - v) * sx + 2 * v * (1 - v) * mx + v * v * nur[0], (1 - v) * (1 - v) * sy + 2 * v * (1 - v) * my + v * v * nur[1]]);
    }
    ctx.globalCompositeOperation = 'screen';
    konturCiz(ctx, pts, { renk: '#F6D48A', kal: 5, alfa: 0.22 * ip, kapali: false, cizim: u, tohum: 50 + i, titreme: 0.2 });
    konturCiz(ctx, pts, { renk: '#FFF2C8', kal: 1.8, alfa: 0.85 * ip, kapali: false, cizim: u, tohum: 60 + i, titreme: 0.2 });
    // ipliğin ucunda ilerleyen ışık
    if (u < 1) {
      const p = pts[Math.round(u * 40)];
      Y.isikNokta(ctx, p[0], p[1], 16, 0.8 * ip);
    }
  });
  ctx.restore();
  // kuş (ipliğin kaynağı; ışıkla birlikte görünür)
}

function nurSutunu(g, t, ni, adamEk) {
  const x = ADAM.x + 10, yAlt = ust(ADAM.x);
  const yUst = -700;
  const yBas = lerp(yUst, yAlt, ni);
  const gen0 = 120, gen1 = 210;
  g.save();
  g.globalCompositeOperation = 'screen';
  const gr = g.createLinearGradient(0, yUst, 0, yAlt);
  gr.addColorStop(0, 'rgba(255,246,214,0.0)');
  gr.addColorStop(0.25, 'rgba(255,244,210,0.42)');
  gr.addColorStop(1, 'rgba(255,236,190,0.5)');
  for (const [k, a] of [[1.0, 0.5], [0.55, 0.65]]) {
    g.globalAlpha = a * (0.7 + 0.3 * Math.sin(t * 2.3)) * ni;
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(x - gen0 * k, yUst);
    g.lineTo(x + gen0 * k, yUst);
    g.lineTo(x + gen1 * k, yBas);
    g.lineTo(x - gen1 * k, yBas);
    g.closePath();
    g.filter = 'blur(18px)';
    g.fill();
  }
  g.filter = 'none';
  g.globalAlpha = 1;
  g.restore();
  // yerde ve adamın çevresinde ışık
  const yak = an(t, T.mazhar + 0.35, 0.6, ease.outCubic);
  if (adamEk) {
    M.hale(g, adamEk.bas[0], adamEk.bas[1] + 40, 230, '#FFF2C8', 0.45 * yak);
    M.hale(g, x, yAlt, 170, '#FFEFC0', 0.4 * yak);
  }
  // inen ışık zerreleri
  const r = rng(808);
  for (let i = 0; i < 22; i++) {
    const faz = r();
    const hiz = 140 + r() * 120;
    const yy = yUst + 400 + (((faz * 1100 + (t - T.mazhar) * hiz) % 1100) + 1100) % 1100 * 0.92;
    if (yy > yBas) continue;
    const xx = x + (r() - 0.5) * gen1 * 1.4 + Math.sin(t * 1.5 + i) * 8;
    Y.isikNokta(g, xx, yy, 5 + r() * 6, 0.75 * ni * Math.sin(clamp((yy - yUst - 400) / 1000) * Math.PI));
  }
}

function envarCiz(g, t) {
  for (const z0 of zerreler) {
    const d = t - z0.t0;
    if (d <= 0) continue;
    const y = z0.y - d * z0.v * z0.b - d * d * 6;
    const x = z0.x + Math.sin(d * 1.6 + z0.faz) * z0.gen * z0.b;
    const a = an(t, z0.t0, 0.3) * clamp((y + 100) / 400) * (1 - an(t, z0.t0 + 3.8, 1.2));
    if (a <= 0) continue;
    Y.isikNokta(g, x, y, (7 + 5 * Math.sin(d * 3 + z0.faz)) * z0.b + 4, 0.85 * a);
  }
  for (const f of fenerler) {
    const d = t - f.t0;
    if (d <= 0) continue;
    const y = f.y - d * f.v * f.b - d * d * 4;
    const x = f.x + Math.sin(d * 0.9 + f.faz) * 14 * f.b;
    const a = an(t, f.t0, 0.4) * clamp((y + 300) / 400);
    if (a <= 0) continue;
    const s = f.b * 0.95;
    Y.isikNokta(g, x, y - 12 * s, 60 * s, 0.7 * a);
    ogeCiz(g, fener, x, y, { s, r: Math.sin(d * 1.2 + f.faz) * 0.06, alfa: a });
  }
}

function kivilcim(ctx, cam, t) {
  const t0 = 53.5, t1 = 54.22;
  if (t < t0 || t > t1 + 0.25) return;
  const p0 = [NUR.x, NUR.y1 + 30], p1 = [480, 720], p2 = [TOH.x, TOH.y];
  const at = (u) => [(1 - u) * (1 - u) * p0[0] + 2 * u * (1 - u) * p1[0] + u * u * p2[0], (1 - u) * (1 - u) * p0[1] + 2 * u * (1 - u) * p1[1] + u * u * p2[1]];
  const u = an(t, t0, t1 - t0, ease.inOutSine);
  const son = 1 - an(t, t1, 0.25);
  for (let k = 7; k >= 0; k--) {
    const v = clamp(u - k * 0.022);
    const [wx, wy] = at(v);
    const [sx, sy] = ekranda(cam, wx, wy, 1);
    if (k === 0) Y.yildizcik(ctx, sx, sy, 15, son);
    else Y.isikNokta(ctx, sx, sy, 22 - k * 2, (0.6 - k * 0.07) * son);
  }
}
