// 4. cümle: "Ve ruh-u beşer için en hâlis sürur ve kalb-i insan için en safi sevinç, o muhabbetullah içindeki
// lezzet-i ruhaniyedir."
// s03'ün gülü (540, 900, R 300) pembe-krem buğuda. "Ve ruh-u beşer": buğu bir adamın göğsüne toplanır, gül küçülerek
// göğsüne yerleşir ve yumuşak bir ışığa (ruh) döner; kamera geri çekilir: sabah ışığında çayırda duran, önden, belden
// yukarı büyük plan bir adam. "en hâlis sürur": göğüsteki ışık nabız gibi parlar, arkasından ince ışık çizgileri
// yayılır; adam başını hafifçe kaldırır, kollarını hafifçe açar. "kalb-i insan": kamera göğse dalar, göğüste stilize
// bir kalp belirir ve göğüsten açılan ışık penceresiyle ekrana yerleşir. "en safi sevinç": kalbin içi berrak suyla
// dolar (dalgalanan yüzey, ışıltılar, kabarcıklar, halkacıklar). "o muhabbetullah": kalbin içinde gül yeniden açar,
// kamera gülün merkezine iner. "içindeki": ışık zerreleri merkezde toplanıp altın bir nektar damlası olur.
// "lezzet-i ruhaniyedir": damla parlar ve düşer; altın halkalar yayılarak ekranı doldurur. Bitiş: altın halkalar
// (540, 900) merkezli yayılıp soluyor, açık krem zemin.
import { W, H, clamp, lerp, ease, an, pop, rng, TAU, smooth, tuval } from '../motor/temel.mjs';
import { ogeCiz, gokTuvali, darbe, konturCiz } from '../motor/kalem.mjs';
import { salinim, kameraIle, ekranda } from '../motor/sahne.mjs';
import { kb } from '../motor/zaman.mjs';
import { ON_DURUS } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import { zeminGul, zeminKrem, tepe, tumsekler, insanHazirla, insanOnBuyuk, kalpOge, kalpIc, suOge, isikHalkasi, altinHalka, isilti } from './s04-yardim.mjs';

const T = {
  s03muh: kb('muhabbetullahtır'),
  ve: kb('ve', 6), ruh: kb('ruhu'), beser: kb('beşer'), icin: kb('için'), halis: kb('halis'), surur: kb('sürur'),
  kalb: kb('kalbi'), insan: kb('insan'), safi: kb('safi'), sevinc: kb('sevinç'),
  muh: kb('muhabbetullah'), icindeki: kb('içindeki', 3), lezzet: kb('lezzeti'), ruhani: kb('ruhaniyedir'),
};
// türetilmiş zamanlar
const Z = {
  toplan: T.ve - 0.02, // buğu göğse toplanmaya başlar
  itis: T.kalb, // kamera göğse dalar
  iris: T.kalb + 0.16, // göğüsten ışık penceresi açılır
  zum: T.muh + 0.04, // kamera gülün merkezine iner
  dus: T.lezzet + 0.2, // damla düşmeye başlar
  carp: T.ruhani, // damla yere değer, halkalar başlar
};

// dünya yerleşimi (adam sahnesi): göğüs (540, 900); kamera göğüs ekranda (540, 900) kalacak biçimde yakınlaşır
const GX = 540, GY = 900;
const S = 2.8; // figür ölçeği
const AYAK = GY + 274 * S; // insanOnBuyuk'te göğüs, ayak tabanından 274 birim yukarıda
const F = { gok: 0.3, bulut: 0.35, uzak: 0.55, orta: 0.8, on: 1.12 };

let zG, zK, gok, bulutlar, tUzak, tOrta, tOn, cicekler, agaclar, kalpB, suB, katman, maske, ic, gecici, hR;

// kamera yakınlığı (adam dünyası)
function zAdam(t) {
  const a = an(t, Z.toplan, 1.15, ease.inOutSine);
  const b = an(t, Z.toplan + 1.1, T.kalb - (Z.toplan + 1.1), ease.inOutSine);
  const c = an(t, Z.itis, 0.85, ease.inOutCubic);
  return Math.exp(Math.log(1.45) + Math.log(1.3 / 1.45) * a + Math.log(1.35 / 1.3) * b + Math.log(2.3 / 1.35) * c);
}
// kalp sahnesinin ölçeği (ekran uzayında, (540, 900) çevresinde)
function zKalp(t) {
  const p = 0.2 * pop(t, T.kalb, 0.42);
  const g = 0.8 * an(t, Z.iris + 0.06, 0.8, ease.inOutCubic);
  const d = 0.06 * an(t, 29.1, 2.0, ease.inOutSine);
  const zm = Math.log(2.4 / 1.06) * an(t, Z.zum, 0.88, ease.inOutCubic);
  const s = 0.08 * an(t, Z.zum + 0.88, 1.0, ease.outSine);
  return (p + g + d) * Math.exp(zm + s);
}
// kalp atışı: "lup-dup" (0..1)
function atis(t, t0, ara = 0.95) {
  if (t < t0) return 0;
  const u = (t - t0) % ara;
  const b = (v) => (v < 0 ? 0 : Math.sin(Math.min(1, v / 0.06) * Math.PI / 2) * Math.exp(-v / 0.11));
  return b(u) + 0.6 * b(u - 0.2);
}
// göğüs ışığının nabzı (hâlis, sürur kelimelerinde iki vuruş, sonra sakin atış)
function nabiz(t) {
  const v = (t0, a) => (t < t0 ? 0 : a * Math.sin(Math.min(1, (t - t0) / 0.07) * Math.PI / 2) * Math.exp(-(t - t0) / 0.32));
  return v(T.halis, 1) + v(T.halis + 0.24, 0.55) + v(T.surur, 0.85) + v(T.surur + 0.24, 0.45) + 0.35 * atis(t, T.surur + 0.95, 0.95);
}

export default {
  sesler: [
    { t: Z.toplan, tur: 'whoosh', guc: 0.22, sure: 1.1 },
    { t: T.halis, tur: 'kalp', guc: 0.28 },
    { t: T.halis + 0.02, tur: 'nur', guc: 0.36, sure: 2.4 },
    { t: Z.itis - 0.02, tur: 'whoosh', guc: 0.28, sure: 0.9 },
    { t: T.kalb + 0.04, tur: 'kalp', guc: 0.34 },
    { t: T.safi + 0.02, tur: 'damla', guc: 0.2, tekrar: 3, ara: 0.24 },
    { t: T.sevinc + 0.02, tur: 'parilti', guc: 0.26, tekrar: 2, ara: 0.32 },
    { t: T.icindeki + 0.04, tur: 'parilti', guc: 0.3 },
    { t: Z.carp - 0.06, tur: 'damla', guc: 0.42 },
    { t: Z.carp, tur: 'nur', guc: 0.5, sure: 2.4 },
  ],
  hazirla() {
    zG = zeminGul();
    zK = zeminKrem();
    // sabah göğü: üstte lavanta mavisi, ufka doğru pembe-şeftali; ufukta, adamın arkasında sıcak parıltı
    gok = gokTuvali({ w: 1500, h: 1500, olcek: 1.05, ad: 's04-gok', ust: '#8D93CC', orta: '#C6A7CF', alt: '#F2C8BA', parilti: '#FFE7C6',
      arkaUst: '#C5C8EA', arkaAlt: '#F8DACB', gunes: { x: 750, y: 1280, r: 210 }, tohum: 17, alfa: 0.38 });
    bulutlar = [M.bulutOge(300, 5, 1.1), M.bulutOge(230, 9, 1.1), M.bulutOge(260, 14, 1.1)];
    tUzak = tepe({ w: 1640, ad: 's04-tepe-uzak', renk: 'lila', X0: -290, Yalt: 2000, olcek: 1.15, tohum: 4,
      sirt: tumsekler(1160, [[-120, 120, 260], [250, 70, 200], [620, 40, 260], [950, 105, 210], [1300, 140, 230]]) });
    tOrta = tepe({ w: 1620, ad: 's04-tepe-orta', renk: 'ada', X0: -280, Yalt: 2050, olcek: 1.2, tohum: 8,
      sirt: tumsekler(1215, [[-60, 60, 330], [400, 18, 220], [1150, 70, 360]]) });
    tOn = tepe({ w: 1560, ad: 's04-tepe-on', renk: 'cayir', X0: -240, Yalt: 2150, olcek: 1.3, tohum: 3, ot: 1,
      sirt: tumsekler(1290, [[-80, 70, 300], [540, 46, 330], [1180, 80, 300]]) });
    agaclar = [{ A: M.agac({ boy: 200, tohum: 51, olcek: 1.25 }), x: 175, f: F.orta }, { A: M.agac({ boy: 165, tohum: 57, olcek: 1.25 }), x: 930, f: F.orta }];
    agaclar.forEach((a) => { a.y = tOrta.ust(a.x) + 18; });
    // çiçekler: ön çayırın sırtında ve alt köşelerde (altyazı bandının ortası boş)
    const r = rng(404);
    cicekler = [];
    // (x, sırta göre derinlik): sırtta ince bir sıra; bant yanlarında birkaç; altta (ekranın alt şeridi) daha büyükler
    const yer = [[120, 6], [206, 14], [300, 4], [388, 22], [700, 20], [782, 6], [872, 16], [962, 8], [60, 18], [1030, 14],
      [110, 110], [40, 170], [990, 120], [1060, 190],
      [70, 250], [190, 300], [330, 270], [460, 320], [600, 285], [740, 315], [880, 265], [1000, 300], [130, 360], [950, 370], [540, 370]];
    for (const [x, dy] of yer) {
      const renk = r.sec(['beyaz', 'beyaz', 'pembe', 'sari', 'beyaz', 'lila']);
      cicekler.push({ x, y: tOn.ust(x) + dy, s: r.ara(0.85, 1.15) * (dy > 200 ? 1.3 : 1), faz: r() * TAU, oge: M.cicekOge(dy > 200 ? 26 : 22, dy > 200 ? 1.9 : 1.6, renk) });
    }
    cicekler.sort((a, b) => a.y - b.y);
    insanHazirla(3);
    kalpB = kalpOge(300, 2);
    suB = suOge(300, 2);
    hR = M.nektarDamla(26, 2.4);
    katman = tuval(W, H);
    maske = tuval(W, H);
    ic = tuval(W, H);
    gecici = tuval(W, H);
    // gül sprite'larını ısıt (s03 ile aynı olcek 1; kalpteki için olcek 1.6)
    const sc = tuval(8, 8).getContext('2d');
    M.gul(sc, 0, 0, 300, 1, 0, { olcek: 1 });
    M.gul(sc, 0, 0, 300, 1, 0, { olcek: 1.6 });
  },

  ciz(ctx, t) {
    ctx.imageSmoothingQuality = 'high';
    const sl = salinim(t, 2.2, 0.3, 14);
    const z = zAdam(t);
    const cam = { x: GX + sl.x / z, y: GY + (960 - GY) / z + sl.y / z, z, r: sl.r * 0.5 };
    const [gsx, gsy] = ekranda(cam, GX, GY, 1);

    // ışık penceresi (göğüsten açılır) ve gül buğusunun göğse toplanması
    const irisU = an(t, Z.iris, 0.78, ease.inOutCubic);
    const irisR = 1400 * irisU;
    const toplan = an(t, Z.toplan, 1.0, ease.inOutSine);
    const buguR = lerp(1500, 0, toplan);
    const dunyaVar = t >= Z.toplan && irisR < 1250 && t < 29.2;

    if (dunyaVar) adamDunyasi(ctx, t, cam, gsx, gsy);

    // 1) başlangıç: gül buğusu göğse toplanır, gül küçülerek göğse yerleşir
    if (t < Z.toplan + 1.3) {
      const kk = lerp(1, 34 / 300, toplan);
      const gx = lerp(540, gsx, toplan), gy = lerp(900, gsy, toplan);
      if (buguR > 1) {
        if (buguR >= 1400) ctx.drawImage(zG, 0, 0);
        else maskeli(ctx, zG, gx, gy, buguR, 340);
      }
      const gulA = 1 - an(t, Z.toplan + 0.72, 0.5, ease.inOutSine);
      if (gulA > 0) {
        M.hale(ctx, gx, gy, 600 * kk, '#FFE6EA', 0.5);
        M.hale(ctx, gx, gy, 320 * kk, '#FFF8F2', 0.42);
        katmanla(ctx, gulA, (g) => {
          g.translate(gx, gy);
          g.scale(kk, kk);
          M.gul(g, 0, 0, 300, 1, t, { olcek: 1, r: 0.016 * (t - T.s03muh) });
        });
        M.parcaciklar(ctx, 160, 520, 760, 820, t, { sayi: 22, renk: '#FFE7C8', boy: 3, alfa: 0.6 * (1 - toplan), hiz: 22, tohum: 31 });
      }
    }

    // 2) kalp: göğüste belirir, ışık penceresi açılır, kalp ekrana yerleşir; sonra su, gül, damla, halkalar
    if (t >= T.kalb) {
      if (irisR < 1250) {
        const icc = ic.getContext('2d');
        icc.setTransform(1, 0, 0, 1, 0, 0);
        icc.globalCompositeOperation = 'source-over';
        icc.drawImage(zG, 0, 0);
        icc.globalCompositeOperation = 'destination-in';
        pencereMaskesi(icc, gsx, gsy, irisR, 170);
        icc.globalCompositeOperation = 'source-over';
        ctx.drawImage(ic, 0, 0);
        // pencere kenarında sıcak ışık
        isikHalkasi(ctx, gsx, gsy, Math.max(0, irisR - 70), 110, '#FFF1DE', 0.55 * clamp(irisU * 6) * (1 - irisU), 'screen');
      } else {
        kalpDunyasi(ctx, t, 'zemin');
      }
      kalpDunyasi(ctx, t, 'on', irisR < 1250 ? [gsx, gsy] : null);
    }
  },
};

// ---------------------------------------------------------------- maskeler
/** Görüntüyü (cx, cy) merkezli yumuşak kenarlı bir daireyle maskeleyerek çizer */
function maskeli(ctx, kaynak, cx, cy, R, yumusak) {
  const mc = maske.getContext('2d');
  mc.setTransform(1, 0, 0, 1, 0, 0);
  mc.globalCompositeOperation = 'source-over';
  mc.clearRect(0, 0, W, H);
  mc.drawImage(kaynak, 0, 0);
  mc.globalCompositeOperation = 'destination-in';
  pencereMaskesi(mc, cx, cy, R, yumusak);
  mc.globalCompositeOperation = 'source-over';
  ctx.drawImage(maske, 0, 0);
}
function pencereMaskesi(c, cx, cy, R, yumusak) {
  const Rr = Math.max(1, R);
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, Rr);
  const ici = clamp(Rr / yumusak);
  const e = clamp((Rr - yumusak) / Rr);
  g.addColorStop(0, `rgba(0,0,0,${ici})`);
  if (e > 0) g.addColorStop(e, `rgba(0,0,0,${ici})`);
  g.addColorStop(Math.min(1, e + (1 - e) * 0.55), `rgba(0,0,0,${0.3 * ici})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- adam sahnesi
function adamDunyasi(ctx, t, cam, gsx, gsy) {
  const ruhA = an(t, Z.toplan + 0.55, 0.7, ease.inOutSine); // göğüsteki ışık
  const sur = an(t, T.halis, 0.9, ease.outCubic); // sürur
  const nb = nabiz(t);
  // gök, bulutlar
  kameraIle(ctx, cam, (g) => ogeCiz(g, gok, -210, -180), F.gok);
  kameraIle(ctx, cam, (g) => {
    const bx = [[120, 300], [900, 190], [760, 560]];
    bulutlar.forEach((b, i) => ogeCiz(g, b, bx[i][0] + (t - 24) * (i % 2 ? -6 : 7), bx[i][1], { alfa: 0.92 }));
  }, F.bulut);
  // uzak ve orta tepeler, küçük ağaçlar
  kameraIle(ctx, cam, (g) => ogeCiz(g, tUzak.oge, tUzak.X0, tUzak.Y0), F.uzak);
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, tOrta.oge, tOrta.X0, tOrta.Y0);
    for (const a of agaclar) M.agacCiz(g, a.A, a.x, a.y, { t, salinim: 1 });
  }, F.orta);
  // adamın arkasından yayılan ışık: geniş sıcak buğu + ince ışık çizgileri
  const zz = cam.z;
  M.hale(ctx, gsx, gsy, 520 * zz * (0.6 + 0.4 * ruhA + 0.25 * sur), '#FFEBD2', (0.25 * ruhA + 0.25 * sur) * (1 + 0.5 * nb));
  if (sur > 0) {
    const boy = lerp(80, 560, sur) * (1 + 0.06 * nb);
    M.isinlar(ctx, gsx, gsy, 70 * zz, boy * zz, t, { sayi: 34, renk: '#E9B952', alfa: 0.5 * sur, kal: 2.4, hiz: 0.05, tohum: 41, titresim: 0.3 });
    M.isinlar(ctx, gsx, gsy, 64 * zz, boy * 0.72 * zz, -t, { sayi: 22, renk: '#FFF4D8', alfa: 0.55 * sur, kal: 2.0, hiz: 0.03, tohum: 43 });
  }
  // adam: ayrı katmanda; göğüsten yayılan sıcak ışıkla
  const L = katman, lc = L.getContext('2d');
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.globalCompositeOperation = 'source-over';
  lc.clearRect(0, 0, W, H);
  const acil = an(t, T.halis + 0.1, 1.1, ease.inOutCubic);
  const kalk = 0.8 * an(t, T.halis, 1.0, ease.inOutCubic);
  const nef = 1.4 * Math.sin(t * 1.75) + 2.2 * kalk;
  const poz = {
    ...ON_DURUS,
    kol: [lerp(0.07, 0.36, acil) + 0.008 * Math.sin(t * 1.75), lerp(0.07, 0.34, acil) + 0.008 * Math.sin(t * 1.75)],
    dirsek: [lerp(0.1, -0.1, acil), lerp(0.1, -0.08, acil)],
    bas: 0.025 * Math.sin(t * 0.7 + 0.4) - 0.015 * kalk, govde: 0.01 * Math.sin(t * 0.55), basKalk: kalk, nefes: nef,
  };
  kameraIle(lc, cam, (g) => insanOnBuyuk(g, GX, AYAK, poz, { s: S, olcek: 3 }), 1);
  // göğüs ışığının gövdeye vurması (yalnız figürün üstüne)
  const isik = 0.35 * ruhA + 0.25 * sur + 0.25 * nb;
  if (isik > 0.01) {
    lc.save();
    lc.globalCompositeOperation = 'source-atop';
    const g = lc.createRadialGradient(gsx, gsy, 0, gsx, gsy, 300 * zz);
    g.addColorStop(0, `rgba(255,232,206,${Math.min(0.85, isik)})`);
    g.addColorStop(0.5, `rgba(255,224,190,${Math.min(0.5, isik * 0.45)})`);
    g.addColorStop(1, 'rgba(255,224,190,0)');
    lc.fillStyle = g;
    lc.fillRect(0, 0, W, H);
    lc.restore();
  }
  ctx.drawImage(L, 0, 0);
  // ön çayır ve çiçekler (adamın belini örter)
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, tOn.oge, tOn.X0, tOn.Y0);
    for (const c of cicekler) ogeCiz(g, c.oge, c.x, c.y, { s: c.s, r: Math.sin(t * 1.2 + c.faz) * 0.05 });
  }, F.on);
  // göğüsteki ışık (ruh)
  if (ruhA > 0) ruhIsigi(ctx, gsx, gsy, zz, ruhA, t, nb);
  // ışık zerreleri (süruru izler)
  if (sur > 0) M.parcaciklar(ctx, gsx - 420, gsy - 700, 840, 900, t, { sayi: 26, renk: '#FFF0C8', boy: 3, alfa: 0.75 * sur, hiz: 30, tohum: 23 });
}

function ruhIsigi(ctx, x, y, z, guc, t, nb) {
  const b = (1 + 0.035 * Math.sin(t * 2.2)) * (1 + 0.22 * nb);
  M.hale(ctx, x, y, 200 * z * b, '#FFD6C6', 0.42 * guc * (1 + 0.5 * nb));
  M.hale(ctx, x, y, 92 * z * b, '#FFF1DA', 0.62 * guc);
  M.hale(ctx, x, y, 34 * z * b, '#FFFFFF', 0.9 * guc);
  M.isinlar(ctx, x, y, 22 * z, 58 * z * b, t, { sayi: 14, renk: '#F6D27E', alfa: 0.45 * guc, kal: 1.8, hiz: 0.08, tohum: 61 });
}

// ---------------------------------------------------------------- kalp sahnesi (ekran uzayında)
const R0 = 300; // kalbin taban yarıçapı (zKalp = 1'de ekranda)
function kalpDunyasi(ctx, t, katmanAdi, gogus = null) {
  const zh = zKalp(t);
  // gül (kalbin içinde) ve dalış
  const dalis = an(t, Z.dus - 0.04, 0.4, ease.inQuad);
  const kremA = an(t, Z.dus + 0.02, 0.5, ease.inOutSine);
  if (katmanAdi === 'zemin') {
    const zs = Math.max(1, Math.pow(Math.max(zh, 0.01), 0.18)) * (1 + 0.012 * Math.sin(t * 1.6) * kremA);
    zeminCiz(ctx, zG, zs, 1);
    if (kremA > 0) zeminCiz(ctx, zK, zs, kremA);
    return;
  }
  // kalp (pencere açılırken göğüs noktasından ekran merkezine kayar)
  const gx = gogus ? lerp(gogus[0], 540, an(t, Z.iris, 0.7, ease.inOutCubic)) : 540;
  const gy = gogus ? lerp(gogus[1], 900, an(t, Z.iris, 0.7, ease.inOutCubic)) : 900;
  const atisK = 1 + 0.022 * atis(t, T.kalb + 0.5, 0.95) * (1 - an(t, Z.zum, 0.5));
  const sc = zh * atisK;
  const kalpA = 1 - smooth(1.4, 2.0, zh);
  const cx = gx, cy = gy + 0.12 * R0 * sc;
  if (kalpA > 0.002) {
    // kalbin altında yumuşak gölge-buğu, çevresinde pembe ışık
    M.hale(ctx, cx, cy, 520 * sc, '#FFE3E8', 0.45 * kalpA);
    katmanla(ctx, kalpA, (g) => {
      ogeCiz(g, kalpB, cx, cy, { s: sc });
      suCiz(g, t, cx, cy, sc, 1);
    });
  }
  // gül
  const gulU = an(t, T.muh, 0.95, ease.outQuad);
  if (gulU > 0) {
    const gulA = 1 - an(t, Z.dus + 0.08, 0.28, ease.inQuad);
    if (gulA > 0) {
      const k = 0.5 * zh * atisK * lerp(0.45, 1, ease.outCubic(an(t, T.muh, 0.8))) * lerp(1, 1.9, dalis);
      M.hale(ctx, gx, gy, 330 * k * 1.6, '#FFE9EE', 0.45 * gulU * gulA);
      katmanla(ctx, gulA, (g) => {
        g.translate(gx, gy);
        g.scale(k, k);
        M.gul(g, 0, 0, 300, gulU, t, { olcek: 1.6, r: 0.2 * (1 - gulU) + 0.02 * (t - T.muh) });
      });
    }
  }
  // nektar damlası
  damlaCiz(ctx, t, gx, gy, zh);
  // halkalar
  if (t >= Z.carp - 0.02) halkalarCiz(ctx, t);
}

/** Bileşik bir öğeyi tek parça olarak saydamlaştırır (üst üste binen parçalar birbirinden görünmesin) */
function katmanla(ctx, alfa, fn) {
  if (alfa <= 0.002) return;
  if (alfa >= 0.999) { ctx.save(); fn(ctx); ctx.restore(); return; }
  const g = gecici.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  g.imageSmoothingQuality = 'high';
  g.save();
  fn(g);
  g.restore();
  ctx.save();
  ctx.globalAlpha *= alfa;
  ctx.drawImage(gecici, 0, 0);
  ctx.restore();
}

function zeminCiz(ctx, z, s, alfa) {
  ctx.save();
  ctx.globalAlpha = alfa;
  if (s > 1.0005) {
    ctx.translate(540, 900);
    ctx.scale(s, s);
    ctx.translate(-540, -900);
  }
  ctx.drawImage(z, 0, 0);
  ctx.restore();
}

// ---------------------------------------------------------------- berrak su
const SU = { bos: 0.8 * R0, dolu: -0.66 * R0 };
const SU_YOL = kalpIc(R0);
function suSeviyesi(t) {
  return lerp(SU.bos, SU.dolu, an(t, T.safi, 1.05, ease.inOutSine));
}
function suCiz(ctx, t, cx, cy, sc, alfa) {
  if (t < T.safi) return;
  const u = an(t, T.safi, 1.05, ease.inOutSine);
  const lvl = suSeviyesi(t);
  const sakin = an(t, T.safi + 0.6, 1.6, ease.inOutSine);
  const gen = lerp(9, 3.2, sakin);
  const egim = 0.05 * Math.sin((t - T.safi) * 3.1) * (1 - sakin);
  const yuzey = (x) => lvl + gen * (0.6 * Math.sin(x * 0.026 + t * 3.1) + 0.4 * Math.sin(x * 0.061 - t * 4.3)) + egim * x;
  const xs = [];
  for (let x = -R0 * 1.02; x <= R0 * 1.02; x += 8) xs.push(x);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  ctx.globalAlpha *= alfa;
  // suyu iç boşluğa ve yüzeyin altına kırp
  ctx.beginPath();
  ctx.moveTo(xs[0], yuzey(xs[0]));
  for (const x of xs) ctx.lineTo(x, yuzey(x));
  ctx.lineTo(xs[xs.length - 1], R0 * 1.2);
  ctx.lineTo(xs[0], R0 * 1.2);
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  for (const p of SU_YOL) { ctx.moveTo(p.pts[0][0], p.pts[0][1]); for (const q of p.pts) ctx.lineTo(q[0], q[1]); ctx.closePath(); }
  ctx.clip();
  ogeCiz(ctx, suB, 0, 0, { alfa: 0.95 });
  // ışık yansımaları: suyun içinde yavaş kayan çapraz parlak bantlar
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const x0 = -R0 + ((i * 0.37 + (t - T.safi) * 0.06) % 1) * 2 * R0;
    const g = ctx.createLinearGradient(x0 - 50, 0, x0 + 50, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, `rgba(255,255,255,${0.35 * u})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - 40, lvl - 20); ctx.lineTo(x0 + 10, lvl - 20); ctx.lineTo(x0 - 70, R0); ctx.lineTo(x0 - 120, R0);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  // kabarcıklar: dipten yükselir
  const r = rng(77);
  for (let i = 0; i < 12; i++) {
    const x0 = r.ara(-0.55, 0.55) * R0, hiz = r.ara(70, 120), faz = r(), b = r.ara(3, 7);
    const yol = R0 * 1.3;
    const yy = 0.75 * R0 - (((t - T.safi) * hiz + faz * yol) % yol);
    if (yy < yuzey(x0) + 8 || yy > 0.78 * R0) continue;
    const xx = x0 + 6 * Math.sin(t * 3 + i * 1.7);
    const a = 0.85 * u;
    konturCiz(ctx, [...Array(20)].map((_, k) => [xx + b * Math.cos((k / 20) * TAU), yy + b * Math.sin((k / 20) * TAU)]), { renk: '#6FB6CB', kal: 1.3 / Math.max(1, sc * 0.8), alfa: 0.7 * a, kapali: true, titreme: 0.2, tohum: i });
    ctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
    ctx.beginPath();
    ctx.arc(xx - b * 0.35, yy - b * 0.35, b * 0.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  // yüzey çizgisi ve altındaki parlak menisküs (kırpmasız, iç boşlukla sınırlı)
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(sc, sc);
  ctx.globalAlpha *= alfa;
  ctx.beginPath();
  for (const p of SU_YOL) { ctx.moveTo(p.pts[0][0], p.pts[0][1]); for (const q of p.pts) ctx.lineTo(q[0], q[1]); ctx.closePath(); }
  ctx.clip();
  const kal = 2.3 / Math.max(1, sc * 0.75);
  konturCiz(ctx, xs.map((x) => [x, yuzey(x) + 5]), { renk: '#FFFFFF', kal: kal * 1.7, alfa: 0.75 * u, kapali: false, titreme: 0.3, tohum: 5 });
  konturCiz(ctx, xs.map((x) => [x, yuzey(x)]), { renk: '#4E9DB6', kal, alfa: 0.9 * u, kapali: false, titreme: 0.3, tohum: 6 });
  // yüzeyde halkacıklar
  for (let i = 0; i < 6; i++) {
    const per = 1.3, t0 = T.safi + 0.5 + i * 0.37;
    if (t < t0) continue;
    const v = ((t - t0) % per) / per;
    const k = Math.floor((t - t0) / per);
    const rr = rng(900 + i * 13 + k * 7);
    const x0 = rr.ara(-0.5, 0.5) * R0 * (lvl < 0 ? 1.4 : 0.6);
    const rx = lerp(4, 46, ease.outCubic(v)), ry = rx * 0.2;
    konturCiz(ctx, [...Array(28)].map((_, j) => [x0 + rx * Math.cos((j / 28) * TAU), yuzey(x0) + 3 + ry * Math.sin((j / 28) * TAU)]), { renk: '#5FAAC2', kal: kal * 0.7, alfa: 0.75 * (1 - v) * u, kapali: true, titreme: 0.2, tohum: 30 + i });
  }
  ctx.restore();
  // sevinç: su yüzeyinde ve kalbin çevresinde altın ışıltılar (birer birer yanıp söner)
  const pr = rng(611);
  for (let i = 0; i < 11; i++) {
    const t0 = T.sevinc + i * 0.11 + pr.ara(0, 0.08);
    const disari = i % 3 === 2;
    const x0 = disari ? pr.ara(0.75, 1.15) * R0 * (i % 2 ? 1 : -1) : pr.ara(-0.6, 0.6) * R0;
    const y0 = disari ? pr.ara(-1.05, 0.3) * R0 : yuzey(x0) + pr.ara(-2, 46);
    const per = pr.ara(1.0, 1.5);
    if (t < t0) continue;
    const v = ((t - t0) % per) / per;
    const a = Math.pow(Math.sin(v * Math.PI), 1.5) * alfa * (1 - an(t, Z.zum, 0.4));
    isilti(ctx, cx + x0 * sc, cy + y0 * sc, pr.ara(8, 14) * Math.min(sc, 1.6) * (0.7 + 0.3 * Math.sin(v * Math.PI)), a, v * 0.6);
  }
}

// ---------------------------------------------------------------- nektar damlası
function damlaCiz(ctx, t, gx, gy, zh) {
  if (t < T.icindeki) return;
  // ışık zerreleri gül yapraklarından merkeze akar
  const pr = rng(321);
  ctx.save();
  for (let i = 0; i < 16; i++) {
    const t0 = T.icindeki + i * 0.025;
    const u = an(t, t0, 0.62, ease.inOutCubic);
    if (u <= 0 || u >= 1) continue;
    const a0 = pr() * TAU, r0 = pr.ara(160, 360), don = pr.ara(1.1, 1.9);
    const yer = (v) => { const rr = r0 * (1 - v), aa = a0 + don * v; return [gx + Math.cos(aa) * rr, gy + Math.sin(aa) * rr]; };
    const [px, py] = yer(u);
    const iz = [];
    for (let k = 0; k <= 8; k++) iz.push(yer(Math.max(0, u - 0.16 * (1 - k / 8))));
    iz.reverse();
    ctx.fillStyle = `rgba(236,186,80,${0.45 * Math.sin(u * Math.PI)})`;
    darbe(ctx, iz.reverse(), 3.0, { incelme: 0.5, sivri: 0.8, dalga: 0 });
    M.hale(ctx, px, py, 26, '#FFDF8A', 0.85 * Math.sin(u * Math.PI));
    M.hale(ctx, px, py, 8, '#FFFFFF', 0.95 * Math.sin(u * Math.PI));
  }
  ctx.restore();
  // damla oluşur, parlar, düşer
  const olus = pop(t, T.icindeki + 0.32, 0.5);
  if (olus <= 0) return;
  const parla = an(t, T.lezzet, 0.22, ease.outCubic);
  const d = an(t, Z.dus, Z.carp - Z.dus, ease.inQuad);
  if (d >= 1) return;
  const s = olus * lerp(1, 0.18, d) * (1 + 0.04 * Math.sin(t * 5));
  const dy = 34 * d;
  const sy = 1 + 0.4 * d;
  M.hale(ctx, gx, gy - 14 * s + dy, (110 + 170 * parla) * s, '#FFE29A', (0.6 + 0.35 * parla) * Math.min(1, olus));
  M.hale(ctx, gx, gy - 14 * s + dy, 520 * s * parla, '#FFF1C4', 0.4 * parla * (1 - d));
  if (parla > 0) M.isinlar(ctx, gx, gy - 22 * s + dy, 34 * s, (70 + 70 * parla) * s, t, { sayi: 16, renk: '#F2C454', alfa: 0.6 * parla * (1 - d), kal: 2, hiz: 0.1, tohum: 71 });
  ogeCiz(ctx, hR, gx, gy + 22 * s + dy, { sy: s * 1.5 * sy, sx: s * 1.5 / Math.sqrt(sy) });
  if (parla > 0) {
    ctx.save();
    M.hale(ctx, gx, gy - 18 * s + dy, 40 * s, '#FFFFFF', 0.6 * parla * (1 - d));
    ctx.restore();
  }
}

// ---------------------------------------------------------------- altın halkalar
function halkalarCiz(ctx, t) {
  const u = t - Z.carp;
  // çarpma parlaması
  const f = u < 0 ? 0 : Math.exp(-u / 0.28) * Math.min(1, u / 0.04 + 0.2);
  if (f > 0.01) {
    M.hale(ctx, 540, 900, 420, '#FFF3CF', 0.8 * f);
    M.hale(ctx, 540, 900, 140, '#FFFFFF', 0.9 * f);
  }
  // merkez: soluyan altın ışık
  const nefes = 0.5 + 0.5 * Math.sin((u - 0.2) * 2 * Math.PI / 1.25);
  const gir = an(t, Z.carp, 0.3, ease.outCubic);
  M.hale(ctx, 540, 900, (230 + 50 * nefes) * gir, '#FBE2A0', 0.5 * gir);
  M.hale(ctx, 540, 900, (70 + 14 * nefes) * gir, '#FFFDF4', 0.85 * gir);
  // halkalar: düzenli aralıkla doğar, yayılır, solar
  const ara = 0.27, sure = 2.7, Rmax = 1340;
  for (let i = 0; i < 12; i++) {
    const v = (u - i * ara) / sure;
    if (v <= 0 || v >= 1) continue;
    const R = lerp(18, Rmax, ease.outCubic(v));
    const alfa = Math.pow(1 - v, 1.15) * Math.min(1, v * 12) * (i === 0 ? 1 : 0.85 + 0.15 * Math.sin(i * 1.3));
    altinHalka(ctx, 540, 900, R, { alfa, kal: lerp(4.2, 2.0, v), tohum: 80 + i * 3, bant: i % 2 ? 0.75 : 1 });
  }
  M.parcaciklar(ctx, 0, 300, W, 1200, t, { sayi: 30, renk: '#FFE9B0', boy: 3, alfa: 0.7 * gir, hiz: 20, tohum: 47 });
}
