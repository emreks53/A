// 8. cümle (ilk yarı): "Evet, şu perişan dünyada, âvâre nev-i beşer içinde, semeresiz bir hayatta; sahipsiz, hâmisiz
// bir surette; âciz, miskin bir insan, bütün dünyanın sultanı da olsa kaç para eder."
// s07'nin sonundaki gri, diz çökmüş adamla açılır; kamera geri çekilip rüzgârda savrulan kâğıtlar ve yapraklar,
// eğri evler, kırık çitler, çatlak yolla perişan dünyayı açar. Kamera yükselir: yüksekten görülen meydanda rastgele
// yönlere yürüyen, dönüp duran küçük adamlar (âvâre nev-i beşer); kuru çeşme. Kuru toprakta meyvesiz, çıplak ağaç; son
// yaprak düşer (semeresiz). Kamera geri çekilir: uçsuz bucaksız boş ovada küçücük yalnız adam (sahipsiz); soldan
// fırtına gelir, kolunu yüzüne siper eder (hâmisiz). Kamera yaklaşır: yere büzülüp oturmuş (âciz, miskin). Birden
// başında taç; altından altın yığını ve taht fışkırır, kamera dramatik biçimde yükselir (sultanı da olsa). "Kaç para
// eder": altın griye döner, toz olup rüzgârda savrulur; adam yine yerde, yalnız oturur. Palet gri-lila; altın yalnız
// serveti.
import { W, H, clamp, lerp, ease, an, pop, rng, TAU, smooth, tuval, rgba } from '../motor/temel.mjs';
import { oge, ogeCiz, TON } from '../motor/kalem.mjs';
import { cokgen, donustur, yaprak } from '../motor/sekil.mjs';
import { kameraYolu, kameraIle, salinim, ekranda } from '../motor/sahne.mjs';
import { kb, ks } from '../motor/zaman.mjs';
import { insanYan, insanOn, DURUS, ON_DURUS, OLCU } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import * as D from './s08-dunya.mjs';
import * as SV from './s08-servet.mjs';
import { yereOturt, pozKaristir, DIZ_COK, BUZUL, SIPER, TAHT, AYAKTA, kalabalikKur, yerdeOturus, OTUR_TEMAS } from './s08-insan.mjs';

const T = {
  bas: 67.2,
  evet: kb('evet', 2), su: kb('şu'), perisan: kb('perişan'), dunyada: kb('dünyada'),
  avare: kb('avare'), nevi: kb('nevi'), beser: kb('beşer', 2), icinde: kb('içinde'),
  semere: kb('semeresiz'), bir1: kb('bir', 1), hayat: kb('hayatta'),
  sahip: kb('sahipsiz'), hami: kb('hamisiz'), suret: kb('surette'),
  aciz: kb('aciz'), miskin: kb('miskin'), insan: kb('insan', 2),
  butun: kb('bütün', 2), dunyanin: kb('dünyanın'), sultan: kb('sultanı'), da: kb('da'), olsa: kb('olsa'),
  kac: kb('kaç'), para: kb('para'), eder: kb('eder'), son: 82.9,
};
// plaka geçişleri
const GB = { t: T.avare - 0.27, sure: 0.27 }; // sokak → meydan (iki plaka aynı yönde, aynı hızla yükselirken çapraz geçiş)
const GD = { t: T.semere - 0.1, sure: 0.36 }; // meydan → ağaç/ova
const GRI = 'saturate(0.42) brightness(0.96) contrast(0.95)';

// ---------------------------------------------------------------- katman (ekran dışı tampon; filtre, saydamlık, hareket bulanıklığı)
// kamera hızından yönlü hareket bulanıklığı: içerik kayma vektörü (ekran px; 180° perde: kare başına yolun yarısı)
function bulanik(kam, t) {
  const a = kam(t - 1 / 60), b = kam(t + 1 / 60);
  const z = (a.z + b.z) / 2;
  const dx = -(b.x - a.x) * z * 0.5, dy = -(b.y - a.y) * z * 0.5;
  return Math.hypot(dx, dy) > 10 ? [dx, dy] : null;
}
const havuz = [], havuzB = [];
let derinlik = 0;
function katman(ctx, fn, { alfa = 1, filtre = null, hareket = null } = {}) {
  if (alfa <= 0.003) return;
  const m = ctx.getTransform();
  const sc = Math.hypot(m.a, m.b);
  const w = Math.round(W * sc), h = Math.round(H * sc);
  let b = havuz[derinlik];
  if (!b || b.width !== w || b.height !== h) { b = tuval(w, h); havuz[derinlik] = b; }
  const g = b.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none';
  g.clearRect(0, 0, w, h);
  g.setTransform(sc, 0, 0, sc, 0, 0);
  derinlik++;
  try { fn(g); } finally { derinlik--; }
  let kaynak = b;
  if (hareket) {
    // sürekli yönlü bulanıklık (kutu süzgeç): her geçişte iki kaydırılmış kopyanın ortalaması, kayma her geçişte
    // yarıya iner → 2^n eşit aralıklı örnek (ayrık kopya basamağı / hayalet yok). Katman içeriği opaktır.
    // Her geçiş AYRI bir tampona yazılır: @napi-rs/canvas tuvalden tuvale çizimi erteleyebildiği için iki tampon
    // arasında gidiş-dönüş (A → B → A) döngüsü kare kaydedilirken yanlış içerik verir.
    const hx = hareket[0] * sc, hy = hareket[1] * sc;
    const L = Math.hypot(hx, hy);
    const n = Math.max(1, Math.min(5, Math.ceil(Math.log2(L / 1.2))));
    const zincir = (havuzB[derinlik] ||= []);
    let src = b, d = 0.5;
    for (let k = 0; k < n; k++) {
      let dst = zincir[k];
      if (!dst || dst.width !== w || dst.height !== h) { dst = tuval(w, h); zincir[k] = dst; }
      const q = dst.getContext('2d');
      q.setTransform(1, 0, 0, 1, 0, 0);
      q.globalCompositeOperation = 'source-over'; q.filter = 'none';
      q.globalAlpha = 1;
      q.drawImage(src, 0, 0); // kenar şeritleri için taban
      q.drawImage(src, -hx * d / 2, -hy * d / 2);
      q.globalAlpha = 0.5;
      q.drawImage(src, hx * d / 2, hy * d / 2);
      src = dst;
      d /= 2;
    }
    kaynak = src;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (filtre) ctx.filter = filtre;
  ctx.globalAlpha = alfa;
  ctx.drawImage(kaynak, m.e, m.f);
  ctx.restore();
}

// ---------------------------------------------------------------- savrulan kâğıt / yaprak (ekran uzayı)
function savrulanlar(ctx, t, liste, alfa = 1) {
  for (const p of liste) {
    const q = D.savrulma(p, t);
    if (!q || q.x > W + 120) continue;
    const a = alfa * clamp((t - p.t0) / 0.15);
    ogeCiz(ctx, p.o, q.x, q.y, { s: p.s, sx: p.s * (0.25 + 0.75 * Math.abs(q.sx)) * Math.sign(q.sx || 1), sy: p.s, r: q.r, alfa: a });
  }
}
function ruzgarlar(ctx, t, liste, guc = 1) {
  for (const w of liste) {
    const u = (t - w.t0) / w.sure;
    if (u <= 0 || u >= 1.45) continue;
    D.ruzgarCizgisi(ctx, w.pts, u - 0.45, u, { renk: w.renk || '#F4F2F8', kal: w.kal, alfa: Math.min(0.85, w.alfa * 1.45) * guc, tohum: w.tohum });
  }
}
function ruzgarListesi(tohum, baslar, { y0 = 300, y1 = 1300, L = [500, 900], sure = [1.0, 1.5], kal = [2.0, 3.0], alfa = 0.5 } = {}) {
  const r = rng(tohum);
  return baslar.map((t0, i) => {
    const x0 = r.ara(-220, 200), y = r.ara(y0, y1);
    while (y > 1340 && y < 1680) return { t0: -99, sure: 1, pts: [[0, 0], [1, 1]], kal: 1, alfa: 0 };
    return { t0, sure: r.ara(...sure), pts: D.ruzgarYolu(x0, y, r.ara(...L), { genlik: r.ara(10, 22), kivrim: r() < 0.6, tohum: tohum + i }), kal: r.ara(...kal), alfa, tohum: i };
  });
}

// ================================================================ PLAKA A: perişan sokak
const KY = 700; // geçişte kameranın yükselme hızı (dünya px/sn); iki plakada aynı
const SOKAK = { yer: 1190, adamX: 540, adamY: 1330, s: 0.8, evS: 1.35 };
const EV_TANIM = [
  { x: -330, w: 230, h: 300, catiH: 115, egri: 14, sarkma: 12, renk: 2, r: 0.03, pencereler: [{ x: 34, y: 170, w: 44, h: 56, tur: 'kirik' }, { x: 140, y: 170, w: 44, h: 56, tur: 'tahta' }] },
  { x: -95, w: 220, h: 280, catiH: 110, egri: -12, sarkma: 10, renk: 1, r: -0.045, pencereler: [{ x: 30, y: 150, w: 44, h: 56, tur: 'tahta' }, { x: 140, y: 160, w: 44, h: 56, tur: 'kirik' }], kapi: { x: 84, w: 48, h: 96, aralik: 0.4 } },
  { x: 150, w: 200, h: 340, catiH: 105, egri: 16, sarkma: 14, renk: 0, r: 0.035, baca: { x: 50, h: 70, egim: 0.12 }, pencereler: [{ x: 28, y: 210, w: 42, h: 58, tur: 'kirik' }, { x: 122, y: 210, w: 42, h: 58, tur: 'saglam' }, { x: 28, y: 80, w: 42, h: 58, tur: 'bos' }, { x: 122, y: 80, w: 42, h: 58, tur: 'tahta' }] },
  { x: 420, w: 240, h: 240, catiH: 125, egri: -8, sarkma: 6, renk: 2, r: -0.02, baca: { x: -60, h: 60, egim: -0.2 }, pencereler: [{ x: 24, y: 112, w: 46, h: 54, tur: 'kirik' }, { x: 170, y: 112, w: 46, h: 54, tur: 'tahta' }], kapi: { x: 98, w: 52, h: 100, aralik: 0.2 } },
  { x: 680, w: 210, h: 310, catiH: 115, egri: 20, sarkma: 16, renk: 1, r: 0.055, baca: { x: 40, h: 80, egim: 0.25 }, pencereler: [{ x: 30, y: 190, w: 42, h: 56, tur: 'saglam' }, { x: 130, y: 190, w: 42, h: 56, tur: 'kirik' }, { x: 80, y: 66, w: 46, h: 60, tur: 'tahta' }] },
  { x: 935, w: 230, h: 270, catiH: 120, egri: -14, sarkma: 12, renk: 0, r: -0.035, pencereler: [{ x: 30, y: 140, w: 44, h: 56, tur: 'tahta' }, { x: 150, y: 146, w: 44, h: 56, tur: 'kirik' }], kapi: { x: 94, w: 48, h: 94, aralik: 0.5 } },
  { x: 1180, w: 220, h: 320, catiH: 110, egri: 10, sarkma: 10, renk: 2, r: 0.04, baca: { x: -40, h: 64, egim: 0.1 }, pencereler: [{ x: 30, y: 190, w: 44, h: 56, tur: 'kirik' }, { x: 140, y: 190, w: 44, h: 56, tur: 'bos' }, { x: 30, y: 70, w: 44, h: 56, tur: 'tahta' }] },
  { x: 1420, w: 230, h: 280, catiH: 115, egri: -10, sarkma: 8, renk: 1, r: -0.03, pencereler: [{ x: 34, y: 150, w: 44, h: 56, tur: 'tahta' }] },
];
// sokak dizilişi: evler 1,35 kat büyük çizilir
const EVLER = EV_TANIM.map((e) => ({ ...e, x: 560 + (e.x - 560) * SOKAK.evS }));
// başlangıçta duran, bitişteki eğimi m olan ivmelenme (2 ≤ m ≤ 3): e(u) = a·u² + (1 − a)·u³, e'(0) = 0, e'(1) = 3 − a
const ivmelen = (m) => { const a = clamp(3 - m, 0, 1); return (u) => a * u * u + (1 - a) * u * u * u; };
// kamera yükselir: geri çekilişin sonunda (A_DUR) bir an durur, oradan TEK bir ivmelenmeyle geçişteki sabit hıza
// (KY) ulaşır ve geçiş boyunca o hızla yukarı kayar. İvmelenmenin bitiş hızı her kanalda (x, y, log z) sonraki
// doğrusal parçanın hızına eşittir: arada duraklama ya da hız sıçraması yok.
const A_DUR = { t: T.dunyada + 0.55, x: 566, y: 1080, z: 1.08 };
const A_YGB = 1074 - KY * 0.295 / 2; // geçiş başında (GB.t) kameranın y'si
const A_SON = { t: GB.t + GB.sure + 0.03, x: 580, z: 1.0 };
A_SON.y = A_YGB - KY * (A_SON.t - GB.t);
const A_M = KY * (GB.t - A_DUR.t) / (A_DUR.y - A_YGB); // y'de bitiş eğimi (≈ 2,8)
const A_ARA = (a, b) => { const d1 = GB.t - A_DUR.t, d2 = A_SON.t - GB.t; return (b * d1 + a * A_M * d2) / (d1 + A_M * d2); };
const kamA = kameraYolu([
  { t: 67.2, x: 622, y: 1105, z: 1.47 },
  { t: T.evet + 0.05, x: 618, y: 1100, z: 1.52, e: ease.inOutSine },
  { ...A_DUR, e: ease.inOutCubic },
  { t: GB.t, x: A_ARA(A_DUR.x, A_SON.x), y: A_YGB, z: Math.exp(A_ARA(Math.log(A_DUR.z), Math.log(A_SON.z))), e: ivmelen(A_M) },
  { ...A_SON, e: ease.lin },
]);

// ================================================================ PLAKA B: yüksekten meydan
const MEYDAN = { cesmeX: 540, cesmeY: 868 };
const kamB = kameraYolu([
  // A ile aynı hızla yükselerek gelir (çatıların ardından meydanı açar), sonra yavaşlayıp oturur
  { t: GB.t, x: 545, y: 1026 + KY * GB.sure, z: 1.04 },
  { t: GB.t + GB.sure, x: 545, y: 1026, z: 1.055, e: ease.lin },
  { t: GB.t + GB.sure + (2 * (1026 - 912)) / KY, x: 545, y: 912, z: 1.07, e: ease.outQuad },
  { t: GD.t, x: 566, y: 890, z: 1.0, e: ease.inOutSine },
  { t: GD.t + GD.sure + 0.05, x: 572, y: 880, z: 1.2, e: ease.inCubic },
]);

// ================================================================ PLAKA C/D: ağaç ve ova
const OVA = { ufuk: 985, adamX: 430, adamY: 1235, agacX: 875, agacY: 1120, agacBoy: 470, S: 0.36 };
const kamD = kameraYolu([
  { t: GD.t - 0.05, x: 877, y: 932, z: 2.16 },
  { t: GD.t + 0.6, x: 875, y: 935, z: 2.03, e: ease.outCubic },
  // geçişten sonra kısa duruş; son yaprak düşerken kamera tek bir yumuşak eğriyle aşağı süzülür
  { t: T.sahip - 0.04, x: 905, y: 985, z: 2.0, e: ease.inOutSine },
  { t: T.hami + 0.36, x: 600, y: 1000, z: 0.95, e: ease.inOutCubic },
  { t: T.aciz - 0.15, x: 520, y: 1060, z: 1.3, e: ease.inOutSine },
  { t: T.aciz + 0.85, x: 431, y: 1130, z: 2.8, e: ease.inOutCubic },
  { t: T.butun, x: 430, y: 1128, z: 3.02, e: ease.inOutSine },
  { t: T.dunyanin, x: 430, y: 1126, z: 2.96, e: ease.inOutSine },
  { t: T.da + 0.08, x: 424, y: 1056, z: 1.84, e: ease.inOutCubic },
  { t: T.kac + 0.15, x: 424, y: 1052, z: 1.92, e: ease.inOutSine },
  { t: 82.55, x: 430, y: 1166, z: 2.45, e: ease.inOutCubic },
  { t: 82.95, x: 430, y: 1168, z: 2.5, e: ease.lin },
]);
// servet zamanları
const SVT = {
  tac: T.butun, yigin: T.dunyanin + 0.02, yiginSure: 0.95, gri: T.kac, griSure: 0.3,
  dag: T.kac + 0.14, dagSure: 0.8, in0: T.para + 0.02, inSure: 0.66,
};

let R = null;

function hazirlaA() {
  R.gokA = D.griGok({ w: 1750, h: 2650, ad: 's08-gokA3', olcek: 1.0, tohum: 31, koyu: 1 });
  R.bulutA = [D.firtinaBulutOge(760, 5, 1, false), D.firtinaBulutOge(560, 12, 1, false), D.firtinaBulutOge(680, 17, 1, false)];
  R.evler = EVLER.map((e, i) => ({ ...e, o: D.evOge({ ad: `s08-ev${i}`, ...e, tohum: 40 + i, olcek: 1.8 }) }));
  R.fici = D.ficiOge(1.8);
  R.tekerlek = D.tekerlekOge(1.8);
  R.ksandik = D.kirikSandikOge(1.8);
  R.uzakEvler = [0, 3, 5, 2, 6, 1, 4, 7].map((k, i) => ({ o: R.evler[k].o, x: -380 + i * 260 + (i % 2) * 40, s: 0.8, r: (i % 2 ? 0.04 : -0.05) }));
  R.kepenk = D.kepenkOge(36, 54, 2.2);
  R.fener = D.fenerOge(2.0);
  const catlak = D.catlakAgi({ x0: -450, x1: 1650, yUfuk: 1120, y1: 2350, wK: 0.36, f: 900, dyMin: 70, tohum: 9, olasilik: 0.8 });
  const r = rng(91);
  // kaldırım kenarı (kırık)
  for (let x = -450; x < 1650; x += r.ara(120, 220)) catlak.push({ pts: [[x, 1224 + r.ara(-2, 2)], [x + r.ara(90, 170), 1226 + r.ara(-2, 2)]], kal: 2.0 });
  for (let x = -440; x < 1650; x += r.ara(60, 90)) catlak.push({ pts: [[x, 1196], [x - 4, 1222]], kal: 1.2 });
  R.yolA = D.toprakOge({ ad: 's08-yolA', x0: -450, x1: 1650, yUst: 1150, yAlt: 2350, catlaklar: catlak, olcek: 1.25, tohum: 12, renk: { ...D.G.toprak, kontur: '#655B6B' } });
  R.citSol = D.citOge({ ad: 's08-cit-sol', w: 420, tohum: 3, olcek: 1.6 });
  R.citSag = D.citOge({ ad: 's08-cit-sag', w: 440, tohum: 8, olcek: 1.6, eksik: 0.35 });
  const kagitlar = [0, 1, 2, 3, 4].map((k) => D.kagitOge(k, 2));
  const yapraklar = [0, 1, 2, 3, 4, 5].map((k) => D.kuruYaprakOge(k, 2));
  const rr = rng(17);
  R.savA = [];
  // Evet: ilk yapraklar; perişan: kâğıt ve yaprak sağanağı; dünyada: süren akış
  const ekle = (t0, tur) => {
    const kagit = tur === 'k';
    R.savA.push({ o: kagit ? rr.sec(kagitlar) : rr.sec(yapraklar), t0, x0: rr.ara(-160, -60), y0: rr.ara(380, 1300), hiz: rr.ara(420, 640) * (kagit ? 0.85 : 1), faz: rr() * TAU, genlik: rr.ara(30, 90), yuksel: rr.ara(-40, 80), donus: rr.ara(-5, 5) * (kagit ? 0.6 : 1), cevir: rr.ara(2, 6), s: kagit ? rr.ara(1.1, 1.6) : rr.ara(0.9, 1.4) });
  };
  for (const t0 of [T.evet - 0.05, T.evet + 0.22, T.evet + 0.4]) ekle(t0, 'y');
  for (let i = 0; i < 9; i++) ekle(T.perisan + i * 0.11 + rr.ara(0, 0.06), i % 3 === 0 ? 'k' : 'y');
  for (let i = 0; i < 9; i++) ekle(T.dunyada + 0.3 + i * 0.16 + rr.ara(0, 0.08), i % 3 === 1 ? 'k' : 'y');
  for (const p of R.savA) if (p.y0 > 1330 && p.y0 < 1690) p.y0 -= 360;
  R.ruzA = ruzgarListesi(7, [T.evet, T.perisan - 0.05, T.perisan + 0.2, T.dunyada, T.dunyada + 0.45, T.dunyada + 0.9, T.dunyada + 1.3]);
}

function hazirlaB() {
  R.gokB = D.griGok({ w: 1700, h: 1900, ad: 's08-gokB2', olcek: 1.0, tohum: 33 });
  R.meydan = D.meydanOge({ ad: 's08-meydan', x0: -320, x1: 1400, y0: 300, y1: 2050, vx: 560, vy: -1700, olcek: 1.0, tohum: 4 });
  R.cesme = D.kuruCesmeOge(1.4);
  R.onCati = D.onCatiOge({ ad: 's08-oncati', w: 1700, h: 520, olcek: 1.0 });
  // kalabalık: farklı derinliklerde, rastgele yürüyen, dönüp duran küçük adamlar; aynı derinlikte iç içe geçmezler
  // yigK/yigX: arkadakinin ayakları öndekinin başına teğet hizada yürümesin (üst üste dizilmiş gibi okunmasın)
  R.kalabalik = kalabalikKur({ tohum: 808, N: 27, tBas: GB.t, tGor: [GB.t - 0.3, GD.t + GD.sure + 0.1], dyK: 0.9, dxK: 140, yigK: 0.35, yigX: 100, engeller: [{ x0: MEYDAN.cesmeX - 250, x1: MEYDAN.cesmeX + 250, y0: 680, y1: MEYDAN.cesmeY }] });
  const r = rng(809);
  R.savB = [];
  const kagitlar = [0, 1, 2].map((k) => D.kagitOge(k, 2));
  const yapraklar = [0, 1, 2, 3].map((k) => D.kuruYaprakOge(k, 2));
  for (let i = 0; i < 6; i++) R.savB.push({ o: i % 3 ? r.sec(yapraklar) : r.sec(kagitlar), t0: GB.t + 0.2 + i * 0.36, x0: -80, y0: r.ara(350, 1250), hiz: r.ara(380, 520), faz: r() * TAU, genlik: r.ara(30, 70), yuksel: r.ara(-20, 50), donus: r.ara(-4, 4), cevir: r.ara(2, 5), s: r.ara(0.8, 1.1) });
  R.ruzB = ruzgarListesi(19, [GB.t + 0.35, GB.t + 1.0, GB.t + 1.7], { y0: 380, y1: 1250, alfa: 0.38 });
}

function hazirlaD() {
  R.gokD = D.griGok({ w: 1900, h: 1700, ad: 's08-gokD', olcek: 1.15, tohum: 35 });
  R.gokDk = D.griGok({ w: 1900, h: 1700, ad: 's08-gokDk', olcek: 1.15, tohum: 36, koyu: 1 });
  R.bulutD = [M.bulutOge(420, 23, 1.1, true), M.bulutOge(320, 27, 1.1, true)];
  R.firtina = [D.firtinaBulutOge(980, 3, 1.1), D.firtinaBulutOge(760, 9, 1.1), D.firtinaBulutOge(860, 14, 1.1)];
  R.tepeUzak = D.uzakTepeOge({ ad: 's08-tepe-uzak2', w: 3400, h: 620, tohum: 5, dalga: 150, olcek: 1.0 });
  R.tepeOrta = D.uzakTepeOge({ ad: 's08-tepe-orta2', w: 3400, h: 560, tohum: 11, dalga: 75, olcek: 1.0, renk: 'orta' });
  const catlak = D.catlakAgi({ x0: -760, x1: 1960, yUfuk: OVA.ufuk - 8, y1: 2500, wK: 0.28, f: 1100, dyMin: 45, tohum: 21, olasilik: 0.86 });
  const r = rng(55);
  // kuru ot tutamları (seyrek)
  for (let i = 0; i < 70; i++) {
    const x = r.ara(-600, 1800), y = r.ara(1000, 2300);
    const d = clamp((y - 930) / 700, 0.15, 1.6);
    for (let k = 0; k < 4; k++) {
      const a = -Math.PI / 2 + r.ara(-0.6, 0.6), L = r.ara(8, 18) * d;
      catlak.push({ pts: [[x + k * 2 * d, y], [x + k * 2 * d + Math.cos(a) * L * 0.5 + 2, y + Math.sin(a) * L * 0.5], [x + k * 2 * d + Math.cos(a) * L, y + Math.sin(a) * L]], kal: clamp(1.0 * d, 0.7, 1.6) });
    }
  }
  R.zeminD = D.toprakOge({ ad: 's08-ova-buyuk', x0: -760, x1: 1960, yUst: OVA.ufuk, yAlt: 2500, catlaklar: catlak, olcek: 1.2, tohum: 22, ustDalga: 5 });
  R.yamaD = D.toprakOge({ ad: 's08-ova-yama', x0: 30, x1: 860, yUst: 1000, yAlt: 1720, catlaklar: catlak, olcek: 2.4, tohum: 22, kenarYumusat: 70, kalCarpan: 0.5 });
  const A = M.agac({ boy: OVA.agacBoy, tohum: 41, yaprakli: false, meyve: false, olcek: 2.3, kuru: true });
  R.agac = { ...A, govde: D.filtreli(A.govde, 'saturate(0.5) brightness(0.98)'), dallarOge: D.filtreli(A.dallarOge, 'saturate(0.5) brightness(0.98)') };
  // son yaprak: sağ üstte bir dal ucunda
  let en = null;
  for (const d of A.dallar) if (d.y2 < -OVA.agacBoy * 0.5 && d.y2 > -OVA.agacBoy * 0.82 && d.x2 > 20 && (!en || Math.abs(d.x2 - 105) < Math.abs(en.x2 - 105))) en = d;
  R.sonYaprakYer = [OVA.agacX + en.x2, OVA.agacY + en.y2];
  R.sonYaprak = sonYaprakOge();
  R.taslar = [];
  for (let i = 0; i < 9; i++) {
    const x = r.ara(-200, 1500), y = r.ara(1060, 1800);
    if (Math.abs(x - OVA.adamX) < 240 && y < 1350) continue;
    R.taslar.push({ x, y, s: clamp((y - 930) / 400, 0.3, 2) * r.ara(0.7, 1.2), o: tasOge(i % 3) });
  }
  // servet
  R.yigin = SV.yiginOge({ YW: 280, YH: 238, olcek: 2.0 });
  R.taht = SV.tahtOge(OVA.S, 2.0);
  R.tac = SV.tacOge(11.5, 5);
  R.sikke = SV.sikkeOge(7, 3);
  R.sikkeGri = D.filtreli(R.sikke, 'grayscale(1) brightness(1.08) contrast(0.85)');
  R.ustY = R.yigin.ust(0);
  const tahtY = OVA.adamY + 2 + R.ustY - SV.KAIDE * OVA.S + 3;
  R.tahtY = tahtY;
  const tam = D.birlestir([{ o: R.yigin.oge, x: OVA.adamX, y: OVA.adamY + 2 }, { o: R.taht, x: OVA.adamX, y: tahtY }], 2.0);
  R.toz = new SV.TozaDagilma({ altin: tam.tuval, x0: -tam.ox, y0: -tam.oy, res: 2.0, tohum: 61, sayi: 5200, sure: SVT.dagSure + 0.3, kum: 0.08, harita: (x, y, n) => 0.68 * y + 0.24 * x + 0.12 * n.fbm(x * 9, y * 9, 3) });
  R.tozB = tam.sinir;
  inisHazirla();
  // taç tozu: tahttaki baş açısıyla döndürülmüş taç
  const basA = TAHT.govde * 0.6 + TAHT.bas;
  const tacTam = D.birlestir([{ o: R.tac, x: 0, y: 0, r: -basA }], 5);
  R.tacToz = { tuval: tacTam.tuval, ox: tacTam.ox, oy: tacTam.oy };
  R.tacDag = new SV.TozaDagilma({ altin: tacTam.tuval, x0: -tacTam.ox, y0: -tacTam.oy, res: 5, tohum: 63, sayi: 160, sure: 1.0, harita: (x, y, n) => x * 0.7 + y * 0.2 + 0.2 * n(x * 4, y * 4) });
  // toz bulutu kümeleri
  const rb = rng(71);
  R.tozBulut = [];
  for (let i = 0; i < 18; i++) {
    const u = rb(), x = OVA.adamX + lerp(-250, 250, rb()), yu = OVA.adamY + R.yigin.ust(x - OVA.adamX);
    R.tozBulut.push({ x, y: lerp(yu, OVA.adamY, rb()) - 10, m: clamp(0.15 + 0.6 * ((x - OVA.adamX + 280) / 560) * 0.5 + rb() * 0.35), vx: rb.ara(90, 220), vy: rb.ara(-50, -5), R: rb.ara(50, 95), omur: rb.ara(0.8, 1.3), a: rb.ara(0.6, 1) });
  }
  // fırlayan sikkeler: yığın büyürken yamaçlardan yuvarlanır, tabana yayılır
  R.sikkeler = [];
  for (let i = 0; i < 22; i++) {
    const yon = i % 2 ? 1 : -1;
    const t0 = SVT.yigin + 0.12 + rb.ara(0, 0.75);
    R.sikkeler.push({ t0, yon, x0: rb.ara(30, 110), vx: rb.ara(150, 300), vy: rb.ara(-380, -180), xs: rb.ara(290, 430), ys: rb.ara(-4, 14), spin: rb.ara(8, 16), faz: rb() * TAU, s: rb.ara(0.85, 1.15), dag: SVT.dag + 0.12 + rb.ara(0, 0.35) });
  }
  R.parilti = [];
  for (let i = 0; i < 18; i++) {
    const x = rb.ara(-230, 230);
    R.parilti.push({ dx: x, dyu: rb.ara(4, 40), t0: SVT.yigin + 0.3 + rb.ara(0, 1.35), sure: rb.ara(0.35, 0.6), R: rb.ara(9, 16) });
  }
  R.ruzC = ruzgarListesi(37, [GD.t + 0.35, T.bir1 - 0.1, T.bir1 + 0.55, T.hayat + 0.8], { y0: 300, y1: 1250, alfa: 0.3, L: [500, 800] });
  R.ruzD = ruzgarListesi(29, [T.hami - 0.05, T.hami + 0.3, T.hami + 0.7, T.suret + 0.2, T.suret + 0.7], { y0: 250, y1: 1250, alfa: 0.42 });
  R.ruzSon = ruzgarListesi(41, [T.kac - 0.02, T.kac + 0.18, T.para, T.para + 0.25, T.eder + 0.1, T.eder + 0.4], { y0: 300, y1: 1300, alfa: 0.48, L: [600, 1000] });
  const kagitlar = [3, 4].map((k) => D.kagitOge(k, 2));
  const yapraklar = [1, 3, 4, 5].map((k) => D.kuruYaprakOge(k, 2));
  R.savD = [];
  for (let i = 0; i < 9; i++) R.savD.push({ o: i % 4 === 0 ? rb.sec(kagitlar) : rb.sec(yapraklar), t0: T.hami + i * 0.22 + rb.ara(0, 0.1), x0: -100, y0: rb.ara(300, 1300), hiz: rb.ara(520, 760), faz: rb() * TAU, genlik: rb.ara(30, 80), yuksel: rb.ara(-30, 60), donus: rb.ara(-6, 6), cevir: rb.ara(3, 7), s: rb.ara(0.8, 1.2) });
  for (const p of R.savD) if (p.y0 > 1330 && p.y0 < 1690) p.y0 -= 380;
}
// ---------------------------------------------------------------- taht: oturuş ve iniş
// kalçanın temas yüksekliği (ayak tabanından, adam birimi): BUZUL → TAHT karışımında (b = 0..1)
const KALCA_TABLO = [];
function kalcaYuk(b) {
  if (!KALCA_TABLO.length) for (let k = 0; k <= 40; k++) { const z = yereOturt(pozKaristir(BUZUL, TAHT, k / 40)); KALCA_TABLO.push(OLCU.kalca + z.zipla - 16); }
  const f = clamp(b) * 40, i = Math.min(39, Math.floor(f));
  return lerp(KALCA_TABLO[i], KALCA_TABLO[i + 1], f - i);
}
// verilen kalça yüksekliğini veren karışım (tablo tekdüze artar)
function kalcaKarisim(h) {
  kalcaYuk(0);
  if (h <= KALCA_TABLO[0]) return 0;
  for (let k = 1; k <= 40; k++) if (KALCA_TABLO[k] >= h) return (k - 1 + (h - KALCA_TABLO[k - 1]) / (KALCA_TABLO[k] - KALCA_TABLO[k - 1])) / 40;
  return 1;
}
// Taht toza dönerken iniş: kalçanın altında kalan (henüz dağılmamış) en üst katı yüzey dağılma ilerlemesiyle aşağı
// iner. Kalça bu yüzeyi tek bir yumuşak eğriyle (sure2 sn) izler: yüzeye gömülmez, sarsılmadan yere oturur
// (yerde oturuş: kalça ve iki taban zeminde).
const INIS = { hz: 240, sure: 1.3, pencere: 0.03, sure2: 0.6 };
function inisHazirla() {
  const tz = R.toz, S = OVA.S;
  const oturak = R.tahtY - 106 * S; // minder üstünün biraz üstü
  const py0 = Math.max(0, Math.floor((oturak - tz.y0) * tz.res));
  const k0 = Math.round((OVA.adamX - 40 - tz.x0) * tz.res), k1 = Math.round((OVA.adamX + 6 - tz.x0) * tz.res);
  const kalan = (cx, py, u) => { const i = py * tz.w + cx; return tz.A[i * 4 + 3] > 90 && tz.M[i] > u + 0.02; };
  const destek = new Float32Array(401);
  for (let n = 0; n <= 400; n++) {
    const u = n / 400, ys = [];
    for (let cx = k0; cx <= k1; cx += 2) {
      let y = OVA.adamY;
      for (let py = py0; py < tz.h - 5; py++) {
        if (!kalan(cx, py, u)) continue;
        // tek tük kalan kum tanesi değil, katı yüzey: altındaki 4 pikselin en az 3'ü de duruyor
        let say = 0;
        for (let q = 1; q <= 4; q++) if (kalan(cx, py + q, u)) say++;
        if (say >= 3) { y = tz.y0 + py / tz.res; break; }
      }
      ys.push(Math.min(y, OVA.adamY));
    }
    ys.sort((a, b) => a - b);
    destek[n] = ys[Math.floor(ys.length / 2)];
  }
  const destekY = (t) => {
    const f = clamp((t - SVT.dag) / SVT.dagSure) * 400, i = Math.min(399, Math.floor(f));
    return lerp(destek[i], destek[i + 1], f - i);
  };
  const H0 = R.tahtY - kalcaYuk(1) * S; // tahtta kalça teması
  const H1 = OVA.adamY - kalcaYukPoz(yerdeOturus(SVT.dag), OTUR_TEMAS) * S; // yerde oturuş: kalça teması zeminde
  const pay = H0 - destekY(SVT.dag); // minderde gömülme
  const N = Math.ceil(INIS.sure * INIS.hz) + 1, P = Math.round(INIS.pencere * INIS.hz);
  const Sy = new Float32Array(N + P);
  for (let n = 0; n < N + P; n++) Sy[n] = destekY(SVT.dag + n / INIS.hz) + pay;
  const ham = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    let top = 0;
    for (let q = 0; q <= P; q++) top += Sy[n + q];
    ham[n] = clamp(top / (P + 1), H0, H1);
  }
  // yumuşak iniş: kalça tek bir yumuşak eğriyle (hızlanıp yavaşlayarak) iner ve yere hızı sıfırlanarak oturur. Eğrinin
  // başlangıcı, kalça henüz dağılmamış oturağa ya da yığına hiçbir karede gömülmeyecek (en çok 3 birim), çöken yüzeyin
  // de olabildiğince yakınında kalacak biçimde seçilir (ham yüzey eğrisi oturak toza dönünce sıçrar: onu izlemek sarsar)
  const D = INIS.sure2 * INIS.hz;
  const egri = (n, a) => H0 + (H1 - H0) * (0.5 - 0.5 * Math.cos(Math.PI * clamp((n - a) / D)));
  let enIyi = null;
  for (let a = 0; a < N; a++) {
    let g = 0, f = 0;
    for (let n = 0; n < N; n++) { const h = egri(n, a); g = Math.max(g, h - ham[n]); f = Math.max(f, ham[n] - h); }
    if (g <= 3 && (!enIyi || f < enIyi.f)) enIyi = { a, f };
  }
  const a0 = enIyi ? enIyi.a : 0;
  R.inisH = new Float32Array(N);
  for (let n = 0; n < N; n++) R.inisH[n] = egri(n, a0);
  R.inisH0 = H0; R.inisH1 = H1;
}
// iniş durumu: k (0 tahtta, 1 yerde), kalça teması y
function inisDurum(t) {
  if (t < SVT.dag) return { k: 0, H: R.inisH0 };
  const f = Math.min(R.inisH.length - 1, (t - SVT.dag) * INIS.hz), i = Math.min(R.inisH.length - 2, Math.floor(f));
  const H = lerp(R.inisH[i], R.inisH[i + 1], f - i);
  return { k: clamp((H - R.inisH0) / (R.inisH1 - R.inisH0)), H };
}

function sonYaprakOge() {
  const boy = 26, en = 13;
  return oge({
    ad: 's08-son-yaprak', olcek: 5, sekil: donustur(yaprak(boy, en, 1.5), { x: -boy / 2 }), arka: '#CDAE76', arkaAlfa: 0.85,
    tarama: { ton: () => 0.6, renkler: [[0, '#C9A971'], [1, '#86663C']], yon: -0.9, aralik: 1.8, boy: [4, 10], kal: 0.8, alfa: 0.6, esikler: [0.3, 0.6], minUc: 3 },
    kontur: '#5E4528', konturKal: 1.1,
    detay: (c, api) => { api.cizgi([[-boy / 2 + 1, 0], [boy / 2 - 2, 0.5]], { renk: '#5E4528', kal: 0.8, alfa: 0.8 }); for (const x of [-4, 2, 7]) api.cizgi([[x, 0.3], [x + 4, -3.5]], { renk: '#5E4528', kal: 0.6, alfa: 0.6 }); },
  });
}
function tasOge(k) {
  const r = rng(900 + k);
  const pts = [];
  for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; pts.push([Math.cos(a) * 16 * r.ara(0.85, 1.1), Math.sin(a) * 10 * r.ara(0.8, 1.15)]); }
  pts.push([16, 2], [-16, 2]);
  return oge({
    ad: 's08-tas-' + k, olcek: 2, sekil: cokgen(pts), arka: D.G.tas.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.kure(4, -6, 18), renkler: D.G.tas.tara, yon: -0.5, aralik: 2.4, boy: [6, 14], kal: 1.0, alfa: 0.55, esikler: [0.2, 0.5, 0.75], minUc: 3 },
    kontur: D.G.tas.kontur, konturKal: 1.5,
  });
}

// ---------------------------------------------------------------- çizim: A
function zeminDoldur(ctx, renk) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = renk;
  ctx.fillRect(0, 0, ctx.canvas ? ctx.canvas.width : W * 2, ctx.canvas ? ctx.canvas.height : H * 2);
  ctx.restore();
}
function plakaA(ctx, t) {
  zeminDoldur(ctx, '#BDB7CA');
  const c = kamA(t);
  const sl = salinim(t, 3, 0.3, 8);
  const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, R.gokA, -330, -770);
    const bx = [[60, 420], [620, 300], [1180, 520]];
    R.bulutA.forEach((b, i) => ogeCiz(g, b, bx[i][0] + (t - 67) * (10 + i * 4), bx[i][1]));
  }, 0.3);
  kameraIle(ctx, cam, (g) => {
    g.globalAlpha = 0.5;
    for (const e of R.uzakEvler) ogeCiz(g, e.o, e.x, SOKAK.yer - 40, { s: e.s, r: e.r });
    g.globalAlpha = 1;
  }, 0.62);
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, R.yolA, 0, 0);
    for (const e of R.evler) ogeCiz(g, e.o, e.x, SOKAK.yer, { r: e.r, s: SOKAK.evS });
    // kırık kepenk (ev 3'ün sağ üst penceresinde, tek menteşesinden sallanır)
    const e = R.evler[2], p = e.pencereler[1], S = SOKAK.evS;
    const lx = (-e.w / 2 + p.x + p.w + e.egri * ((p.y + p.h) / e.h) + 2) * S, ly = (-p.y - p.h) * S;
    const hx = e.x + lx * Math.cos(e.r) - ly * Math.sin(e.r), hy = SOKAK.yer + lx * Math.sin(e.r) + ly * Math.cos(e.r);
    const ruz = an(t, T.perisan, 0.5, ease.outCubic);
    const aci = -0.15 - 0.22 * Math.sin(t * 2.6) - ruz * (0.35 + 0.25 * Math.sin(t * 5.3 + 1));
    ogeCiz(g, R.kepenk, hx, hy, { r: e.r + aci, s: S });
    ogeCiz(g, R.fener, 900, 1222, { r: 0.02, s: 1.3 });
    // sokak döküntüleri
    ogeCiz(g, R.ksandik, 830, 1300, { r: 0.08, s: 1.1 });
    ogeCiz(g, R.tekerlek, 300, 1262, { r: -0.5, sy: 0.55, sx: 1.05 });
    ogeCiz(g, R.fici, 180, 1404, { r: -0.1, s: 1.15 });
  }, 1);
  // adam: diz çökmüş (s07'den), perişan dünyaya bakarken başını hafifçe kaldırır
  katman(ctx, (g) => kameraIle(g, cam, (gg) => {
    const bak = an(t, T.perisan, 0.7) * (1 - an(t, T.dunyada + 0.6, 0.9));
    const nefes = Math.sin(t * 2.2) * 0.012;
    const poz = { ...DIZ_COK, govde: DIZ_COK.govde + nefes - bak * 0.06, bas: DIZ_COK.bas - bak * 0.4 };
    insanYan(gg, SOKAK.adamX, SOKAK.adamY, yereOturt(poz), { s: SOKAK.s, yon: -1, olcek: 1.2 });
  }, 1), { filtre: GRI });
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, R.citSol, -190, 1630, { s: 1.15 });
    ogeCiz(g, R.citSag, 760, 1660, { s: 1.15 });
  }, 1.12);
  // s07'den süren yağmur dinerken
  D.yagmur(ctx, t, 1 - an(t, 67.3, 1.3), { sayi: 150, tohum: 23 });
  savrulanlar(ctx, t, R.savA);
  ruzgarlar(ctx, t, R.ruzA);
}

// ---------------------------------------------------------------- çizim: B
// kalabalıktan bir adam. Dönüş kâğıt kart gibi daraltılmaz: yan → (önden ya da arkadan) → ters yan; yan pozlar dönüşe
// yakın yalnız hafifçe (en az 0,7) basılır, figür hiçbir karede çizgiye inmez.
const ON_KALABALIK = { ...ON_DURUS, kol: [0.1, 0.1], dirsek: [0.12, 0.12], bacak: 0.06 };
function kalabalikFigur(gg, f, q) {
  if (q.don >= 0) {
    const A = 0.34, u = q.don;
    if (u >= A && u <= 1 - A) {
      const arka = (f.arka ? 1 : 0) ^ (Math.round(q.donT0 * 10) & 1);
      insanOn(gg, q.x, f.y, ON_KALABALIK, { s: f.s, olcek: 0.5, arka: !!arka });
      return;
    }
    const e = u < A ? u / A : (1 - u) / A;
    const yon = u < A ? q.yon0 : -q.yon0;
    insanYan(gg, q.x, f.y, q.poz, { s: f.s, yon: yon * (1 - 0.3 * e * e), olcek: 0.5 });
    return;
  }
  insanYan(gg, q.x, f.y, q.poz, { s: f.s, yon: q.k >= 0 ? 1 : -1, olcek: 0.5 });
}
function plakaB(ctx, t) {
  zeminDoldur(ctx, '#C9C4D3');
  const c = kamB(t);
  const sl = salinim(t, 2.5, 0.3, 12);
  const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, R.gokB, -320, -1560);
    ogeCiz(g, R.meydan, 0, 0);
    const ev = [3, 0, 5, 2, 6, 4, 1];
    ev.forEach((k, i) => ogeCiz(g, R.evler[k].o, -230 + i * 225, 352 + (i % 3) * 6, { s: 0.74, r: R.evler[k].r * 0.8 }));
  }, 1);
  // gölgeler + kalabalık + çeşme (derinliğe göre)
  katman(ctx, (g) => kameraIle(g, cam, (gg) => {
    const durum = R.kalabalik.map((f) => ({ f, q: f.plan(t) }));
    gg.save();
    for (const { f, q } of durum) {
      const gr = gg.createRadialGradient(q.x + 6 * f.s, f.y + 2, 0, q.x + 6 * f.s, f.y + 2, 80 * f.s);
      gr.addColorStop(0, 'rgba(76,68,94,0.32)');
      gr.addColorStop(1, 'rgba(84,76,100,0)');
      gg.fillStyle = gr;
      gg.save(); gg.translate(q.x + 6 * f.s, f.y + 2); gg.scale(1, 0.24); gg.translate(-(q.x + 6 * f.s), -(f.y + 2));
      gg.fillRect(q.x - 90 * f.s, f.y - 90 * f.s, 180 * f.s, 180 * f.s);
      gg.restore();
    }
    gg.restore();
    durum.sort((a, b) => a.f.y - b.f.y);
    let cesme = false;
    for (const { f, q } of durum) {
      if (!cesme && f.y > MEYDAN.cesmeY) { ogeCiz(gg, R.cesme, MEYDAN.cesmeX, MEYDAN.cesmeY); cesme = true; }
      kalabalikFigur(gg, f, q);
    }
    if (!cesme) ogeCiz(gg, R.cesme, MEYDAN.cesmeX, MEYDAN.cesmeY);
  }, 1), { filtre: GRI });
  kameraIle(ctx, cam, (g) => ogeCiz(g, R.onCati, -310, 1665), 1.1);
  savrulanlar(ctx, t, R.savB, 0.9);
  ruzgarlar(ctx, t, R.ruzB);
}

// ---------------------------------------------------------------- çizim: C/D
function adamPozu(t) {
  // ayakta → başını kaldırır → siper → büzülür → (taç) → tahtta → iner, büzülür
  let p = AYAKTA;
  const bak = an(t, T.sahip + 0.5, 0.6);
  p = { ...AYAKTA, bas: lerp(AYAKTA.bas, -0.12, bak) };
  const siper = an(t, T.hami - 0.02, 0.45, ease.outCubic);
  if (siper > 0) p = pozKaristir(p, SIPER, siper);
  const cok = an(t, T.aciz - 0.32, 0.8, ease.inOutCubic);
  if (cok > 0) p = pozKaristir(p, BUZUL, cok);
  // titreme (yağmurda)
  if (cok > 0.5 && t < SVT.yigin) {
    const tit = Math.sin(t * 23) * 0.012 * (1 - an(t, T.butun - 0.3, 0.4));
    p = { ...p, govde: p.govde + tit, bas: p.bas + tit * 0.8 + an(t, T.miskin, 0.5) * 0.06 };
  }
  // taç gelince başını hafifçe kaldırır
  const kalk = an(t, SVT.tac + 0.1, 0.35) * (1 - an(t, SVT.yigin, 0.3));
  if (kalk > 0) p = { ...p, bas: p.bas - 0.25 * kalk };
  // taht büyürken kalça oturak yüksekliğine çıkar (oturak yüksekliği taht ölçeğiyle büyür)
  const tb = tahtBuyume(t);
  const taht = tb <= 0 ? 0 : kalcaKarisim(96 * tb);
  if (taht > 0) p = pozKaristir(p, TAHT, taht);
  const gurur = an(t, T.sultan, 0.4) * (1 - an(t, T.kac, 0.25));
  if (gurur > 0) p = { ...p, bas: p.bas - 0.1 * gurur, govde: p.govde - 0.03 * gurur };
  // taht toza dönünce iner: kalça yere, dizler yukarı, kollar baldırlara (yerde oturuş; nefes yerdeOturus'ta)
  const in0 = inis(t);
  if (in0 > 0) p = pozKaristir(p, yerdeOturus(t), in0);
  return p;
}
// dağılan yüzeyle birlikte iniş (0 tahtta, 1 yerde)
function inis(t) {
  return inisDurum(t).k;
}
// taht büyümesi (0..1, ölçek taşmasız)
function tahtBuyume(t) {
  return t <= SVT.yigin - 0.02 ? 0 : ease.outCubic(clamp((t - (SVT.yigin - 0.02)) / 0.4));
}
function yiginDurum(t) {
  const u = clamp((t - SVT.yigin) / SVT.yiginSure);
  // yavaş başlar, hızlanarak fışkırır, sonda hafifçe taşıp oturur
  const k = clamp(u / 0.8);
  const sy = u <= 0 ? 0 : (0.12 * ease.outCubic(clamp(u / 0.25)) + 0.88 * ease.inOutCubic(k)) * (1 + 0.06 * Math.sin(Math.PI * clamp((u - 0.55) / 0.45)));
  const sx = u <= 0 ? 0 : lerp(0.45, 1, ease.outCubic(u));
  // taht 0,4 sn'de büyür, hafifçe taşıp oturur (adam aynı eğriyle oturur)
  const tb = tahtBuyume(t);
  const tahtS = tb * (1 + 0.05 * Math.sin(Math.PI * clamp((t - (SVT.yigin - 0.02) - 0.2) / 0.3)));
  const tahtY = OVA.adamY + 2 + R.ustY * sy - SV.KAIDE * OVA.S + 3;
  return { sy, sx, tahtS, tahtY, tb };
}

/** Plaka D kamerası (salınım, taç vurgusu ve yığın sarsıntısıyla). s09 açılışta yerde oturan adamı ekranda birebir
 *  aynı yer ve ölçekte tutmak için de bunu kullanır (DEVIR_ADAM: adamın dünya konumu ve ölçeği). */
export function kameraD(t) {
  const c = kamD(t);
  const sl = salinim(t, 3, 0.3, 14);
  const bump = 1 + 0.035 * Math.sin(Math.PI * clamp((t - SVT.tac) / 0.45));
  const rr = -0.026 * Math.sin(Math.PI * clamp((t - SVT.yigin) / 1.15));
  return { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z * bump, r: sl.r + rr };
}
export const DEVIR_ADAM = { x: OVA.adamX, y: OVA.adamY, s: OVA.S, olcek: 1.2 };
/** Toz dağılırken ve sonrasında yerde oturuşa iniş ilerlemesi (0..1); zemine oturtma seçenekleri buna göre */
function inisTemas(k) { return { kalcaTemas: lerp(16, OTUR_TEMAS.kalcaTemas, k) }; }
// pozun kalça temas noktasının ayak tabanı hizasından yüksekliği (adam birimi; yereOturt ile)
function kalcaYukPoz(poz, temas) { return OLCU.kalca + yereOturt(poz, temas).zipla - temas.kalcaTemas; }

function plakaD(ctx, t) {
  zeminDoldur(ctx, '#BEB8CA');
  const cam = kameraD(t);
  const firtina = an(t, T.hami - 0.4, 1.1, ease.inOutSine);
  const yagmurG = an(t, T.hami - 0.05, 0.5) * (1 - 0.35 * an(t, T.miskin, 0.6)) * (1 - an(t, T.butun - 0.25, 0.45));
  const gelir = an(t, T.sahip + 0.2, 1.6, ease.outCubic);
  // gök
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, R.gokD, -420, -560);
    if (firtina > 0) {
      ogeCiz(g, R.gokDk, -420, -560, { alfa: firtina * 0.9 });
      g.save();
      g.globalCompositeOperation = 'multiply';
      const gr = g.createLinearGradient(-400, 0, 1300, 0);
      gr.addColorStop(0, rgba('#857D9B', 0.75 * firtina));
      gr.addColorStop(0.55, rgba('#A39CB5', 0.35 * firtina));
      gr.addColorStop(1, rgba('#C9C4D4', 0));
      g.fillStyle = gr;
      g.fillRect(-420, -560, 1900, 1700);
      g.restore();
    }
  }, 0.25);
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, R.bulutD[0], 980 + (t - 72) * 9, 360, { alfa: 1 - firtina * 0.6 });
    ogeCiz(g, R.bulutD[1], 300 + (t - 72) * 6, 520, { alfa: 1 - firtina * 0.6 });
    // fırtına bulutları soldan gelir
    const fx = [[-40, 330], [420, 470], [-420, 600]];
    R.firtina.forEach((b, i) => {
      const x = fx[i][0] - (1 - gelir) * (1250 + i * 160) + (t - 74) * 16;
      ogeCiz(g, b, x, fx[i][1], { alfa: clamp(gelir * 1.5) });
    });
  }, 0.32);
  kameraIle(ctx, cam, (g) => ogeCiz(g, R.tepeUzak, -1200, 858), 0.5);
  kameraIle(ctx, cam, (g) => ogeCiz(g, R.tepeOrta, -1200, 922), 0.72);
  // zemin + ağaç + taşlar
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, R.zeminD, 0, 0);
    const yama = smooth(1.25, 1.7, cam.z);
    if (yama > 0) ogeCiz(g, R.yamaD, 0, 0, { alfa: yama });
    for (const ts of R.taslar) ogeCiz(g, ts.o, ts.x, ts.y, { s: ts.s });
    // ağaç: rüzgârda hafifçe salınır
    const sal = (Math.sin(t * 1.3) * 0.004 + Math.sin(t * 3.1) * 0.0025) * (1 + firtina * 2.5);
    g.save();
    g.translate(OVA.agacX, OVA.agacY);
    g.rotate(sal);
    M.agacCiz(g, R.agac, 0, 0, { buyume: 1, yaprak: 0, meyveA: 0, t });
    g.restore();
    sonYaprak(g, t, sal);
  }, 1);
  // fırtına gölgesi: soldan gelen bulutların zemine düşen gölgesi
  const golge = firtina * (1 - 0.55 * an(t, T.butun - 0.3, 0.6));
  if (golge > 0.01) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const gr = ctx.createLinearGradient(0, 0, W, 0);
    gr.addColorStop(0, rgba('#8E87A3', 0.55 * golge));
    gr.addColorStop(0.6, rgba('#B3ADC3', 0.28 * golge));
    gr.addColorStop(1, rgba('#D8D4E0', 0.12 * golge));
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // altın ışıltısı (servetin arkasında)
  const parla = an(t, SVT.yigin + 0.1, 0.6) * (1 - an(t, SVT.gri, SVT.griSure));
  const yd = yiginDurum(t);
  kameraIle(ctx, cam, (g) => {
    if (parla > 0) {
      M.hale(g, OVA.adamX, OVA.adamY - 200, 520, '#F6DE98', 0.32 * parla);
      const isin = an(t, T.sultan - 0.05, 0.5) * (1 - an(t, SVT.gri, 0.25));
      if (isin > 0) M.isinlar(g, OVA.adamX + 10, yd.tahtY - 80, 70, 330, t, { sayi: 26, renk: M.ALTIN, alfa: 0.4 * isin, kal: 2.2, hiz: 0.04, tohum: 13 });
    }
    // servet: büyüme evresinde ayrı ayrı, dağılırken birleşik tuvalden
    if (t >= SVT.gri) {
      const gri = an(t, SVT.gri, SVT.griSure, ease.inOutSine);
      const u = clamp((t - SVT.dag) / SVT.dagSure);
      R.toz.ciz(g, gri, u, t);
      SV.tozBulutu(g, R.tozBulut, u, { sure: 1.3 });
    } else if (yd.sy > 0 || yd.tahtS > 0) {
      if (yd.sy > 0) ogeCiz(g, R.yigin.oge, OVA.adamX, OVA.adamY + 2, { sx: yd.sx, sy: yd.sy });
      if (yd.tahtS > 0) ogeCiz(g, R.taht, OVA.adamX, yd.tahtY, { s: yd.tahtS });
    }
    sikkeler(g, t);
  }, 1);
  // adam
  const ham = adamPozu(t);
  const temas = inisTemas(inis(t));
  const poz = yereOturt(ham, temas);
  let adamY = OVA.adamY;
  if (yd.tb > 0) adamY = lerp(OVA.adamY, Math.min(OVA.adamY, yd.tahtY), yd.tb);
  if (t >= SVT.dag) {
    // kalça teması dağılan yüzeyi izler; ayak tabanı, o anki pozun kalça yüksekliği kadar aşağıda (zemini geçmez)
    const ind = inisDurum(t);
    adamY = Math.min(OVA.adamY, ind.H + kalcaYukPoz(ham, temas) * OVA.S);
  }
  let bas = null;
  katman(ctx, (g) => kameraIle(g, cam, (gg) => {
    const e = insanYan(gg, OVA.adamX, adamY, poz, { s: OVA.S, yon: -1, olcek: 1.2 });
    bas = e.bas;
  }, 1), { filtre: GRI });
  // taç
  kameraIle(ctx, cam, (g) => {
    const basA = poz.govde * 0.6 + poz.bas;
    const up = [-Math.sin(basA), -Math.cos(basA)];
    const tx = bas[0] + up[0] * 25 * OVA.S, ty = bas[1] + up[1] * 25 * OVA.S;
    const tp = pop(t, SVT.tac, 0.42);
    if (t < SVT.gri + 0.12 && tp > 0) {
      M.hale(g, tx, ty, 60 * (0.6 + tp), '#FFF0BC', 0.5 * (1 - an(t, SVT.tac + 0.15, 0.6)) + 0.12 * parla);
      ogeCiz(g, R.tac, tx, ty, { s: tp, r: -basA });
      if (t > SVT.gri) {
        // griye dönüş: üstüne gri taç
        g.save(); g.globalAlpha = an(t, SVT.gri, SVT.griSure * 0.6); g.filter = 'grayscale(1) brightness(1.05)';
        ogeCiz(g, R.tac, tx, ty, { r: -basA }); g.restore();
      }
    }
    if (t >= SVT.gri + 0.12) {
      const u = clamp((t - (SVT.gri + 0.12)) / 0.45);
      g.save(); g.translate(tx, ty);
      R.tacDag.ciz(g, 1, u, t);
      g.restore();
    }
    // parıltılar
    if (parla > 0) for (const p of R.parilti) {
      const k = (t - p.t0) / p.sure;
      if (k <= 0 || k >= 1) continue;
      const x = OVA.adamX + p.dx * yd.sx, y = OVA.adamY + (R.yigin.ust(p.dx) + p.dyu) * yd.sy;
      SV.parilti(g, x, y, p.R, Math.sin(Math.PI * k) * parla, { donus: p.t0 });
    }
    if (tp > 0 && t < SVT.tac + 0.6) SV.parilti(g, tx + 4, ty - 6, 16, Math.sin(Math.PI * clamp((t - SVT.tac - 0.08) / 0.45)), { donus: 0.3 });
  }, 1);
  // yağmur, savrulanlar, rüzgâr
  D.yagmur(ctx, t, yagmurG, { sayi: 230, tohum: 21 });
  savrulanlar(ctx, t, R.savD, 1);
  ruzgarlar(ctx, t, R.ruzC);
  ruzgarlar(ctx, t, R.ruzD, 1 - an(t, T.butun - 0.4, 0.4));
  ruzgarlar(ctx, t, R.ruzSon);
}

function sonYaprak(g, t, sal) {
  const [x0, y0] = R.sonYaprakYer;
  const kop = T.bir1 - 0.02;
  const S = 1.35;
  const titre = Math.sin(t * 7.1) * 0.22 + Math.sin(t * 12.7) * 0.08 + an(t, kop - 0.35, 0.3) * Math.sin(t * 19) * 0.15;
  if (t < kop) {
    ogeCiz(g, R.sonYaprak, x0 + 3, y0 + 2, { s: S, r: 1.2 + titre, pivot: [-12, 0] });
    return;
  }
  const u = clamp((t - kop) / 1.5);
  const yer = OVA.agacY + 8;
  const y = lerp(y0 + 2, yer, u * u * 0.25 + u * 0.75);
  const x = x0 + 3 + u * 60 + Math.sin(u * 8.5) * 34 * (1 - u * 0.6);
  const r = 1.2 + Math.sin(u * 8.5 + 0.8) * 1.0 + u * 1.4;
  if (u >= 1) ogeCiz(g, R.sonYaprak, x, yer - 2, { sx: S, sy: S * 0.5, r: 0.06 });
  else ogeCiz(g, R.sonYaprak, x, y, { sx: S, sy: S * (0.55 + 0.45 * Math.abs(Math.cos(u * 7))), r });
}

function sikkeler(g, t) {
  for (const k of R.sikkeler) {
    const a = t - k.t0;
    if (a <= 0) continue;
    // fırlama: yığının yamacından, parabol + tabanda sekme + yuvarlanma
    const g0 = 900;
    const x1 = OVA.adamX + k.yon * k.xs;
    const tInis = (-k.vy + Math.sqrt(k.vy * k.vy + 2 * g0 * 180)) / g0; // yaklaşık 180 birim düşüş
    let x, y, ac;
    if (a < tInis) {
      const u = a / tInis;
      x = OVA.adamX + k.yon * lerp(k.x0, k.xs * 0.86, u);
      y = OVA.adamY - 180 + k.vy * a + 0.5 * g0 * a * a + k.ys;
      y = Math.min(y, OVA.adamY + k.ys);
      ac = k.faz + a * k.spin;
    } else {
      const b = a - tInis;
      const sek = Math.abs(Math.sin(Math.min(b, 0.5) * TAU)) * 22 * Math.exp(-b * 6);
      x = lerp(OVA.adamX + k.yon * k.xs * 0.86, x1, ease.outCubic(clamp(b / 0.6)));
      y = OVA.adamY + k.ys - sek;
      ac = k.faz + tInis * k.spin + k.spin * 0.5 * (1 - Math.exp(-b * 4));
    }
    const sx = Math.cos(ac);
    if (t < SVT.gri) ogeCiz(g, R.sikke, x, y - 5, { sx: k.s * (0.2 + 0.8 * Math.abs(sx)), sy: k.s });
    else {
      const gri = an(t, SVT.gri + (x - OVA.adamX + 450) / 1800, 0.2);
      const dag = clamp((t - k.dag) / 0.3);
      if (dag < 1) {
        ogeCiz(g, R.sikke, x, y - 5, { sx: k.s * (0.2 + 0.8 * Math.abs(sx)), sy: k.s, alfa: (1 - gri) * (1 - dag) });
        ogeCiz(g, R.sikkeGri, x, y - 5, { sx: k.s * (0.2 + 0.8 * Math.abs(sx)), sy: k.s, alfa: gri * (1 - dag) });
      }
      if (dag > 0) {
        const r = rng(k.t0 * 1000);
        for (let i = 0; i < 9; i++) {
          const yas = (t - k.dag) - i * 0.015;
          if (yas <= 0 || yas > 0.8) continue;
          const px = x + r.ara(-6, 6) + r.ara(120, 260) * yas, py = y - 5 + r.ara(-4, 4) + r.ara(-60, -10) * yas;
          g.fillStyle = rgba('#8F8A99', 0.8 * (1 - yas / 0.8));
          g.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
        }
      }
    }
  }
}

// ================================================================ sahne
export default {
  sesler: [
    { t: T.evet, tur: 'ruzgar', guc: 0.32, sure: 2.6 },
    { t: GB.t + 0.05, tur: 'whoosh', guc: 0.3, sure: 0.8 },
    { t: T.avare + 0.25, tur: 'adim', guc: 0.14, tekrar: 9, ara: 0.21 },
    { t: T.bir1 + 0.02, tur: 'firca', guc: 0.14, sure: 1.2 },
    { t: T.sahip, tur: 'whoosh', guc: 0.24, sure: 1.2 },
    { t: T.hami - 0.05, tur: 'yagmur', guc: 0.3, sure: 4.0 },
    { t: T.hami + 0.1, tur: 'gok', guc: 0.26, sure: 2.2 },
    { t: SVT.tac, tur: 'parilti', guc: 0.42 },
    { t: SVT.yigin + 0.05, tur: 'para', guc: 0.45, tekrar: 4, ara: 0.18 },
    { t: SVT.gri + 0.1, tur: 'toz', guc: 0.48, sure: 1.4 },
    { t: SVT.gri + 0.05, tur: 'ruzgar', guc: 0.34, sure: 1.6 },
  ],
  hazirla() {
    R = {};
    hazirlaA();
    hazirlaB();
    hazirlaD();
    // parça önbelleklerini ısıt
    const c = tuval(8, 8).getContext('2d');
    insanYan(c, 0, 0, DURUS, { s: 0.1, olcek: 0.5 });
    insanYan(c, 0, 0, DURUS, { s: 0.1, olcek: 1 });
    insanYan(c, 0, 0, DURUS, { s: 0.1, olcek: 1.2 });
    insanOn(c, 0, 0, ON_KALABALIK, { s: 0.1, olcek: 0.5 });
    insanOn(c, 0, 0, ON_KALABALIK, { s: 0.1, olcek: 0.5, arka: true });
    // katman tamponları (tam çözünürlük; karede tuval ayrılmasın): iki derinlik + bulanıklık zinciri
    for (let d = 0; d < 2; d++) havuz[d] ||= tuval(W, H);
    havuzB[0] ||= [];
    for (let k = 0; k < 5; k++) havuzB[0][k] ||= tuval(W, H);
  },
  ciz(ctx, t) {
    const aB = an(t, GB.t, GB.sure, ease.inOutSine);
    const aD = an(t, GD.t, GD.sure, ease.inOutSine);
    if (aD >= 1) return plakaD(ctx, t);
    if (aB >= 1) {
      const hB = bulanik(kamB, t);
      if (hB) katman(ctx, (g) => plakaB(g, t), { hareket: hB });
      else plakaB(ctx, t);
      if (aD > 0) katman(ctx, (g) => plakaD(g, t), { alfa: aD });
      return;
    }
    const hA = bulanik(kamA, t);
    if (hA) katman(ctx, (g) => plakaA(g, t), { hareket: hA });
    else plakaA(ctx, t);
    if (aB > 0) katman(ctx, (g) => plakaB(g, t), { alfa: aB, hareket: bulanik(kamB, t) });
  },
};
