// 3. cümle: "Cin ve insin en parlak saadeti ve en tatlı nimeti, o marifetullah içindeki muhabbetullahtır."
// s02'nin marifet deseninden (540, 900, R 400) kamera geri çekilir: desen gökte parlayan bir madalyon olur. Uzak
// sırtların ardında soluk lila-mavi, saydam alev dilleri (cin) yükselir; önde tepelerde madalyona dönük erkekler
// kümeler hâlinde belirir (insin). Madalyon parlar, ışık dalgası kalabalığı yıkar, figürlerde kenar ışığı ve göğüslerde
// yumuşak ışık (en parlak saadeti). Madalyondan altından güle çalan ışıklı taç yaprakları ve altın çiçekler saçılıp
// kalabalığın üstüne süzülür; kimi iki kolunu, kimi tek kolunu kaldırır, kimi avuçlarını açar, kimi elini göğsüne koyar
// (en tatlı nimeti). Kamera hızla madalyona dalar, ışığın içine girilir (o marifetullah); iç rozet aralanır, merkezden
// ışık taşar (içindeki); ışıktan bir gonca doğar ve gül açar, desen geri çekilip solar (muhabbetullahtır).
// Bitiş: gül (540, 900), R 300, tam açık, soluk pembe-krem buğu.
import { W, H, clamp, lerp, ease, an, pop, rng, TAU, tuval } from '../motor/temel.mjs';
import { ogeCiz, gokTuvali } from '../motor/kalem.mjs';
import { salinim, kameraIle, ekranda } from '../motor/sahne.mjs';
import { kb } from '../motor/zaman.mjs';
import { insanYan, insanOn, DURUS, ON_DURUS } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import { tepe, tumsekler, desenHazirla, desenCiz, alevOge, alevCiz, tacYapragi, zeminOge } from './s03-yardim.mjs';

const T = {
  bas: 16.2,
  cin: kb('cin'), insin: kb('insin'), parlak: kb('parlak'), saadet: kb('saadeti'),
  en6: kb('en', 6), tatli: kb('tatlı'), nimet: kb('nimeti'),
  o: kb('o'), marifet: kb('marifetullah'), icindeki: kb('içindeki', 2), muh: kb('muhabbetullahtır'), son: 24.8,
};

// madalyonun dünya yeri (nötr görünüşte ekranla aynı)
const MX = 540, MY = 450, MR = 165;
const Z0 = 400 / MR; // başlangıç: ekranda R 400 (s02 devri)
const ZD = 480 / MR; // dalış sonu: ekranda R 480

// kamera: madalyonun ekrandaki y'si ve yakınlaşma üzerinden (madalyon ekranda düzgün hareket etsin)
const DALIS = { bas: 21.2, son: 21.96 };
const ANAHTAR = [
  { t: 16.2, sy: 900, z: Z0 },
  { t: 16.44, sy: 900, z: Z0, e: ease.lin }, // s02 devri: desen yerinde durur (s02 de R 400'de bekler)
  { t: 17.52, sy: 452, z: 1.0, e: ease.inOutCubic },
  { t: DALIS.bas, sy: 440, z: 1.05, e: ease.inOutSine },
  { t: DALIS.son, sy: 900, z: ZD, e: ease.inOutCubic },
  { t: 24.8, sy: 900, z: ZD * 1.045, e: ease.outSine },
];
function kamera(t) {
  let a = ANAHTAR[0], b = ANAHTAR[0], e = 0;
  if (t >= ANAHTAR[ANAHTAR.length - 1].t) a = b = ANAHTAR[ANAHTAR.length - 1];
  else for (let i = 1; i < ANAHTAR.length; i++) {
    if (t <= ANAHTAR[i].t) { a = ANAHTAR[i - 1]; b = ANAHTAR[i]; e = b.e(clamp((t - a.t) / (b.t - a.t))); break; }
  }
  const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), e));
  const sy = lerp(a.sy, b.sy, e);
  return { x: MX, y: MY - (sy - 960) / z, z };
}

// paralaks çarpanları
const F = { gok: 0.5, bulut: 0.45, cin: 0.5, uzak: 0.55, orta: 0.78, yakin: 0.92, on: 1.1 };

let gok, bulutlar, tUzak, tOrta, tYakin, tOn, zeminA, zeminG, aura, cinler, figurler, yapraklar, cicekler, agacSol, agacSag, uzakAgaclar, meyve;
let katman = [], auraTuval = [], golge = null; // figür satırları için ekran dışı tuvaller

// alev kümesi biçimleri: [dx, boy, en, s1, kv, faz, yön (Y: kümenin yönü), tabanU]
const KUME = {
  a: [[-0.3, 0.62, 0.34, 0.08, 0.32, 0.6, -1, 0.3], [0.32, 0.66, 0.34, 0.08, 0.3, 2.1, 1, 0.3], [-0.1, 0.9, 0.44, 0.1, 0.16, 0.4, 'Y-', 0.32], [0.12, 0.8, 0.4, 0.1, 0.2, 3.0, 'Y', 0.32], [0, 1.0, 0.62, 0.07, 0.1, 1.7, 'Y', 0.4]],
  b: [[-0.26, 0.55, 0.3, 0.06, 0.42, 0.6, -1, 0.3], [0.28, 0.58, 0.3, 0.06, 0.4, 2.1, 1, 0.3], [0, 1.0, 0.66, 0.1, 0.22, 1.7, 'Y', 0.42], [-0.06, 0.74, 0.36, 0.12, -0.34, 0.4, 'Y', 0.32]],
};

// pozlar: önden/arkadan (insanOn) ve yandan (insanYan) hedef pozlar
function onHedef(tip, fg) {
  const r = fg.kol;
  if (tip === 'V') return { kol: [2.45 + 0.15 * r, 2.4 + 0.15 * (1 - r)], dirsek: [0.14, 0.12] };
  if (tip === 'tek') return fg.el < 0.5 ? { kol: [2.5 + 0.1 * r, 0.12], dirsek: [0.1, 0.2] } : { kol: [0.12, 2.5 + 0.1 * r], dirsek: [0.2, 0.1] };
  if (tip === 'avuc') return { kol: [0.48 + 0.1 * r, 0.5 + 0.1 * r], dirsek: [-0.95, -0.9] };
  return { kol: [0.09, 0.09], dirsek: [0.12, 0.12] };
}
function yanHedef(tip) {
  if (tip === 'uzan') return { omuz: [0.25, 2.55], dirsek: [0.3, 0.18], bas: -0.12 };
  if (tip === 'gogus') return { omuz: [0.05, 0.12], dirsek: [0.15, 2.45], bas: 0.02 };
  if (tip === 'iki') return { omuz: [2.55, 2.4], dirsek: [0.12, 0.1], bas: -0.1 };
  return { omuz: [-0.05, 0.06], dirsek: [0.12, 0.16], bas: 0 };
}

export default {
  sesler: [
    { t: 16.5, tur: 'whoosh', guc: 0.26, sure: 1.1 },
    { t: T.cin, tur: 'firca', guc: 0.22, sure: 0.9 },
    { t: T.insin, tur: 'pop', guc: 0.18, tekrar: 6, ara: 0.09 },
    { t: T.parlak, tur: 'nur', guc: 0.5, sure: 2.2 },
    { t: T.en6 + 0.08, tur: 'parilti', guc: 0.3, tekrar: 3, ara: 0.4 },
    { t: DALIS.bas + 0.05, tur: 'whoosh', guc: 0.4, sure: 0.8 },
    { t: T.icindeki + 0.05, tur: 'parilti', guc: 0.28 },
    { t: T.muh, tur: 'nur', guc: 0.42, sure: 2.0 },
  ],
  hazirla() {
    desenHazirla();
    gok = gokTuvali({ w: 1800, h: 1600, olcek: 1.2, ad: 's03-gok2', gunes: { x: MX + 360, y: MY + 430, r: MR * 1.05 }, parilti: '#F4E4B4', arkaAlt: '#E6DFEE', tohum: 13 });
    bulutlar = [M.bulutOge(280, 21, 1.2), M.bulutOge(220, 4, 1.2), M.bulutOge(240, 15, 1.2)];
    tUzak = tepe({ w: 1760, ad: 's03-tepe-uzak2', renk: 'uzak', X0: -340, Yalt: 1700, olcek: 1.2, tohum: 14,
      sirt: tumsekler(1012, [[-70, 150, 230], [235, 92, 175], [560, 34, 250], [835, 118, 190], [1130, 172, 230], [1420, 110, 200]]) });
    tOrta = tepe({ w: 1680, ad: 's03-tepe-orta2', renk: 'acik', X0: -300, Yalt: 1750, olcek: 1.15, tohum: 6,
      sirt: tumsekler(1162, [[-100, 112, 500], [700, 30, 200], [1250, 42, 300]]) });
    tYakin = tepe({ w: 1680, ad: 's03-tepe-yakin2', renk: 'yesil', X0: -300, Yalt: 2100, olcek: 1.1, tohum: 9,
      sirt: tumsekler(1312, [[1250, 122, 520], [250, 26, 220]]) });
    tOn = tepe({ w: 1760, ad: 's03-tepe-on2', renk: 'koyu', X0: -340, Yalt: 2350, olcek: 1.05, tohum: 3,
      sirt: tumsekler(1712, [[-40, 70, 330], [1150, 64, 330], [560, 14, 200]]) });
    zeminA = zeminOge('altin');
    zeminG = zeminOge('gul');
    aura = M.nurAura(170, 1.2);
    meyve = M.meyveOge(8, 1.5, 'kirmizi');
    agacSol = M.agac({ boy: 250, tohum: 33, olcek: 1.3 });
    agacSag = M.agac({ boy: 190, tohum: 41, olcek: 1.3 });
    uzakAgaclar = [[300, 92, 51], [372, 70, 52], [700, 84, 53]].map(([x, boy, tohum]) => ({ x, A: M.agac({ boy, tohum, olcek: 1, meyve: false }) }));

    // cin: uzak sırtın ardında üç alev kümesi (diller + açık çekirdek)
    const cr = rng(303);
    const R_ = (v) => Math.round(v);
    cinler = [
      { x: 150, h: 372, w: 232, renk: 'lila', Y: 1, tip: 'a', alfa: 0.62, gec: 0.0 },
      { x: 478, h: 236, w: 150, renk: 'mavi', Y: -1, tip: 'b', alfa: 0.5, gec: -0.05 },
      { x: 912, h: 342, w: 214, renk: 'lila', Y: -1, tip: 'b', alfa: 0.6, gec: 0.06 },
    ].map((c0) => {
      const c = { ...c0, y: Math.max(tUzak.ust(c0.x - 70), tUzak.ust(c0.x), tUzak.ust(c0.x + 70)) + 48 };
      const diller = KUME[c.tip].map(([dx, hh, ww, s1, kv, faz, yy, tb]) => {
        const yon = yy === 'Y' ? c.Y : yy === 'Y-' ? -c.Y : yy;
        return { dx: dx * c.w, faz: faz + cr() * 2, oge: alevOge(R_(c.h * hh), R_(c.w * ww), { s1, kv, faz, yon, tabanU: tb, renk: c.renk, olcek: 1.1 }) };
      });
      const ic = { dx: 0, faz: cr() * TAU, oge: alevOge(R_(c.h * 0.55), R_(c.w * 0.3), { s1: 0.1, kv: 0.08 * c.Y, faz: 1.2, yon: 1, tabanU: 0.4, renk: c.renk, olcek: 1.1, ic: true }) };
      return { ...c, diller, ic, t0: T.cin + c.gec };
    });

    // figürler: üç derinlik satırı, kümeler hâlinde. tip: 'on' (arkadan, madalyona dönük) | 'yan' (yon: madalyona bakar)
    const fr = rng(707);
    figurler = [];
    const ekle = (satir, x, y, s, tip, yon, poz) => figurler.push({ satir, x, y, s, tip, yon, poz, faz: fr() * TAU, kol: fr(), el: fr(), gec: fr() });
    // A: orta tepede küçükler (sırtın biraz altında)
    [[34, 0.25, 'on', 1, 'V', 34], [78, 0.235, 'on', 1, 'avuc', 22], [206, 0.27, 'yan', 1, 'uzan', 32], [250, 0.25, 'on', 1, 'V', 42],
      [392, 0.28, 'on', 1, 'tek', 30], [436, 0.26, 'on', 1, 'V', 18], [470, 0.24, 'on', 1, 'avuc', 36], [628, 0.27, 'on', 1, 'V', 26],
      [670, 0.25, 'yan', -1, 'gogus', 40], [806, 0.28, 'on', 1, 'avuc', 30], [850, 0.26, 'on', 1, 'V', 20], [952, 0.27, 'yan', -1, 'uzan', 26]]
      .forEach(([x, s, tip, yon, poz, dy]) => ekle(0, x, tOrta.ust(x) + dy, s, tip, yon, poz));
    // B: yakın tepede orta boy (ayaklar altyazı bandının üstünde)
    [[96, 0.48, 'yan', 1, 'gogus', 1394], [298, 0.5, 'on', 1, 'avuc', 1374], [352, 0.46, 'on', 1, 'V', 1348], [562, 0.52, 'on', 1, 'tek', 1402],
      [760, 0.48, 'on', 1, 'avuc', 1366], [812, 0.45, 'on', 1, 'V', 1342], [980, 0.5, 'yan', -1, 'uzan', 1390]]
      .forEach(([x, s, tip, yon, poz, y]) => ekle(1, x, y, s, tip, yon, poz));
    // C: önde, alt köşelerde büyük iki figür (omuz üstü çekim)
    ekle(2, 150, 2090, 1.12, 'on', 1, 'V');
    ekle(2, 948, 2080, 1.06, 'yan', -1, 'uzan');
    // satır içinde uzaktan yakına çizim sırası
    figurler.sort((a, b) => a.satir - b.satir || a.y - b.y);
    // giriş sırası: merkezden dışa, önden arkaya hafif dalga
    const sira = [...figurler].sort((a, b) => (Math.abs(a.x - 540) - a.satir * 60) - (Math.abs(b.x - 540) - b.satir * 60));
    sira.forEach((f, i) => { f.t0 = T.insin + i * 0.03; });
    figurler.forEach((f) => {
      const gx = f.x, gy = f.y - (f.tip === 'on' ? 274 : 281) * f.s;
      f.gogus = [gx, gy];
      f.mesafe = Math.hypot(gx - MX, gy - MY);
    });
    katman = [0, 1, 2].map(() => tuval(W, H));
    auraTuval = [0, 1, 2].map(() => tuval(W, H));
    // yumuşak gölge: ayaktan uzaklaşan, uca doğru genişleyip solan kama (bulanık)
    golge = tuval(220, 420);
    {
      const gc = golge.getContext('2d');
      gc.filter = 'blur(9px)';
      const gg = gc.createLinearGradient(0, 20, 0, 400);
      gg.addColorStop(0, 'rgba(38,84,58,0.85)');
      gg.addColorStop(0.5, 'rgba(38,84,58,0.45)');
      gg.addColorStop(1, 'rgba(38,84,58,0)');
      gc.fillStyle = gg;
      gc.beginPath();
      gc.moveTo(84, 20); gc.lineTo(136, 20); gc.lineTo(190, 400); gc.lineTo(30, 400); gc.closePath();
      gc.fill();
    }

    // taç yaprakları ve altın çiçekler: madalyonun kenarından saçılır, yavaşlar, salınarak süzülür
    const pr = rng(919);
    yapraklar = [];
    const N = 26;
    for (let i = 0; i < N; i++) {
      const cicek = i % 4 === 1;
      const a = lerp(-0.32 * Math.PI, 1.32 * Math.PI, (i + pr.ara(0.1, 0.9)) / N);
      yapraklar.push({
        a, cicek, boy: cicek ? Math.round(pr.ara(15, 19)) : Math.round(pr.ara(36, 48)),
        te: T.en6 + 0.02 + Math.pow(pr(), 1.3) * 1.15, v0: pr.ara(430, 680), k: pr.ara(1.35, 1.8), vy: pr.ara(55, 105),
        genlik: pr.ara(14, 30), frek: pr.ara(1.3, 2.2), faz: pr() * TAU, don: pr.ara(-1.2, 1.2), cevir: pr.ara(2.4, 4.2), r0: pr() * TAU,
        f: pr() < 0.3 ? pr.ara(1.2, 1.4) : pr.ara(0.98, 1.12),
      });
    }
    yapraklar.forEach((p) => {
      p.oge = p.cicek ? M.cicekOge(p.boy, 1.6, 'sari') : tacYapragi(p.boy, 1.6 * (p.f > 1.15 ? 1.3 : 1));
    });
    yapraklar.sort((a, b) => a.f - b.f);
    // ön tepe çiçekleri (alt kenar)
    cicekler = [];
    const ccr = rng(55);
    for (const [x, y] of [[262, 1790], [398, 1872], [520, 1770], [640, 1858], [770, 1800], [1046, 1760], [40, 1752], [700, 1905]]) {
      const renk = ccr.sec(['beyaz', 'beyaz', 'pembe', 'beyaz', 'lila']);
      cicekler.push({ x, y, s: ccr.ara(0.8, 1.1), renk, faz: ccr() * TAU, oge: M.cicekOge(24, 1.5, renk) });
    }
    // gül sprite'larını ısıt
    const sc = tuval(8, 8).getContext('2d');
    M.gul(sc, 0, 0, 300, 1, 0, { olcek: 1 });
  },

  ciz(ctx, t) {
    const c = kamera(t);
    const sl = salinim(t, 2.4, 0.3, 11);
    const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r * 0.6 };
    const [msx, msy, mz] = ekranda(cam, MX, MY, 1);
    const Rs = MR * mz;

    // zaman eğrileri
    const geri = an(t, 16.44, 1.0, ease.inOutSine); // geri çekilme: ışık zemini açılır, dünya belirir
    const parla = an(t, T.parlak, 0.32, ease.outCubic) * (1 - 0.3 * an(t, T.parlak + 0.35, 1.1, ease.inOutSine));
    const nabiz = Math.sin(Math.PI * an(t, T.en6, 0.5, ease.lin)); // taç yaprakları saçılırken kısa nabız
    const madalyonGuc = 0.62 * an(t, 16.6, 1.1, ease.inOutSine) + 0.5 * parla + 0.25 * nabiz;
    const saadet = an(t, T.parlak + 0.1, 1.0, ease.inOutSine);
    const sel = an(t, DALIS.bas + 0.22, 0.36, ease.inOutSine); // dalışta ışık seli
    const zeminDalis = an(t, DALIS.bas + 0.42, 0.3, ease.inOutSine);
    const zeminAlfa = Math.max(1 - geri, zeminDalis);
    const dunyaGorunur = zeminAlfa < 0.999;

    if (dunyaGorunur) {
      // 1) gök ve bulutlar
      kameraIle(ctx, cam, (g) => ogeCiz(g, gok, -360, -420), F.gok);
      kameraIle(ctx, cam, (g) => {
        const bx = [[150, 250], [935, 175], [1010, 760]];
        bulutlar.forEach((b, i) => ogeCiz(g, b, bx[i][0] + (t - 16) * (i % 2 ? -5 : 6), bx[i][1], { alfa: 0.95 }));
      }, F.bulut);

      // 2) madalyon ışığı (ekran uzayında; sırtların arkasında kalır)
      if (madalyonGuc > 0) {
        const nefes = 1 + 0.012 * Math.sin(t * 2.1);
        M.hale(ctx, msx, msy, Rs * (3.0 + 0.9 * parla), '#FFF0B8', 0.38 * madalyonGuc);
        M.hale(ctx, msx, msy, Rs * 1.7, '#FFFBEA', 0.45 * madalyonGuc);
        ogeCiz(ctx, aura, msx, msy, { s: (Rs / 170) * nefes * (1 + 0.08 * parla), r: t * 0.03, alfa: clamp(0.8 * madalyonGuc) });
        M.isinlar(ctx, msx, msy, Rs * 1.12, Rs * (2.1 + 0.85 * parla), t, { sayi: 30, alfa: 0.4 * clamp(madalyonGuc), kal: Math.max(1.7, Rs * 0.012), tohum: 17, hiz: 0.035 });
        M.isinlar(ctx, msx, msy, Rs * 1.1, Rs * (1.6 + 0.5 * parla), -t, { sayi: 18, renk: '#EBC867', alfa: 0.28 * clamp(madalyonGuc), kal: Math.max(1.4, Rs * 0.009), tohum: 23, hiz: 0.02 });
      }

      // 3) cin: uzak sırtın ardında saydam alev dilleri
      kameraIle(ctx, cam, (g) => cinCiz(g, t), F.cin);
      // 4) uzak sırt (+ birkaç uzak ağaç)
      kameraIle(ctx, cam, (g) => {
        ogeCiz(g, tUzak.oge, tUzak.X0, tUzak.Y0);
        g.globalAlpha = 0.72;
        for (const u of uzakAgaclar) M.agacCiz(g, u.A, u.x, tUzak.ust(u.x) + 10, { t, salinim: 0.6 });
        g.globalAlpha = 1;
      }, F.uzak);
      // 5) orta tepe + küçük ağaç + A satırı
      kameraIle(ctx, cam, (g) => {
        ogeCiz(g, tOrta.oge, tOrta.X0, tOrta.Y0);
        M.agacCiz(g, agacSag, 1046, tOrta.ust(1046) + 20, { t, salinim: 1, meyveOge: meyve });
      }, F.orta);
      satirCiz(ctx, cam, t, 0, F.orta, saadet);
      // 6) yakın tepe + B satırı
      kameraIle(ctx, cam, (g) => {
        ogeCiz(g, tYakin.oge, tYakin.X0, tYakin.Y0);
        M.agacCiz(g, agacSol, -18, tYakin.ust(-18) + 34, { t, salinim: 1, meyveOge: meyve });
      }, F.yakin);
      satirCiz(ctx, cam, t, 1, F.yakin, saadet);
      // 7) ön tepe + C satırı + çiçekler
      kameraIle(ctx, cam, (g) => {
        ogeCiz(g, tOn.oge, tOn.X0, tOn.Y0);
        for (const cc of cicekler) ogeCiz(g, cc.oge, cc.x, cc.y, { s: cc.s, r: Math.sin(t * 1.3 + cc.faz) * 0.05 });
      }, F.on);
      satirCiz(ctx, cam, t, 2, F.on, saadet);

      // 8) saadet ışığı: kalabalığa inen huzmeler, yayılan ışık dalgası, sıcak örtü
      if (saadet > 0) isikCiz(ctx, t, msx, msy, Rs, saadet * (1 - sel));

      // dalışta altyazı bandının ardı yumuşak bir ışık örtüsüyle sakinleşir
      const ortu = an(t, DALIS.bas - 0.02, 0.3, ease.inOutSine);
      if (ortu > 0) {
        // figürler altyazının arkasından geçerken bant ışıkla örtülür (s02 dalışıyla aynı dil)
        const gb = ctx.createLinearGradient(0, H * 0.5, 0, H);
        gb.addColorStop(0, 'rgba(252,244,220,0)');
        gb.addColorStop(0.4, `rgba(252,244,220,${0.84 * ortu})`);
        gb.addColorStop(1, `rgba(252,244,220,${0.92 * ortu})`);
        ctx.fillStyle = gb;
        ctx.fillRect(0, 0, W, H);
      }
      // 9) dalış: madalyondan taşan ışık seli (ışığın içine girilir)
      if (sel > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const Rg = lerp(Rs * 2.2, 2300, ease.inOutSine(sel));
        const g = ctx.createRadialGradient(msx, msy, Rs * 0.6, msx, msy, Rg);
        g.addColorStop(0, `rgba(255,250,232,${0.95 * sel})`);
        g.addColorStop(0.55, `rgba(255,244,214,${0.8 * sel})`);
        g.addColorStop(1, 'rgba(255,240,205,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // 10) ışık zemini (başta s02'den gelen altın-krem; dalışta yeniden; sonda pembe-krem)
    if (zeminAlfa > 0.001) {
      const pembe = an(t, T.muh + 0.05, 1.2, ease.inOutSine);
      ctx.save();
      ctx.globalAlpha = zeminAlfa;
      if (pembe < 1) ctx.drawImage(zeminA, 0, 0);
      if (pembe > 0) { ctx.globalAlpha = zeminAlfa * pembe; ctx.drawImage(zeminG, 0, 0); }
      ctx.restore();
      // ışık zemininde madalyonun buğusu (dalışta ve başta)
      const bugu = zeminAlfa * (1 - an(t, T.muh, 1.0));
      if (bugu > 0) M.hale(ctx, msx, msy, Math.min(Rs * 2.0, 1100), '#FFF3CF', 0.5 * bugu);
    }

    // 11) marifet deseni (madalyon)
    const acilma = an(t, T.icindeki, 0.62, ease.inOutCubic);
    const geriCek = an(t, T.muh + 0.15, 1.5, ease.inOutCubic);
    const desenAlfa = 1 - an(t, T.muh + 0.3, 1.2, ease.inOutSine);
    if (desenAlfa > 0.002) {
      const dR = Rs * lerp(1, 0.8, geriCek);
      const merkezIsik = Math.max(1 - geri, 0.35 * an(t, 21.6, 0.4)) * (1 - acilma);
      desenCiz(ctx, msx, msy, dR, t, { r: 0.022 * (t - T.bas), alfa: desenAlfa, dolgu: 1 - 0.5 * geriCek, acilma, merkezIsik });
      if (acilma > 0) {
        // aralanan merkezden taşan ışık
        M.hale(ctx, msx, msy, dR * (0.3 + 0.45 * acilma), '#FFF6D8', 0.6 * acilma * desenAlfa);
        M.isinlar(ctx, msx, msy, dR * 0.12, dR * (0.24 + 0.24 * acilma), t, { sayi: 22, alfa: 0.5 * acilma * desenAlfa, kal: 1.8, tohum: 29, hiz: 0.06 });
      }
    }

    // 12) gül: ışıktan gonca doğar, sonra açar
    const gonca = an(t, T.muh - 0.02, 0.42, ease.lin);
    if (gonca > 0) {
      const acil = lerp(0.1, 1, an(t, T.muh + 0.2, 1.5, ease.outCubic));
      const k = ease.outBack(gonca, 1.6) * lerp(0.62, 1, an(t, T.muh + 0.15, 1.45, ease.outCubic));
      const gx = 540, gy = 900;
      M.hale(ctx, gx, gy, 600 * k, '#FFE6EA', 0.5 * gonca);
      M.hale(ctx, gx, gy, 320 * k, '#FFF8F2', 0.42 * gonca);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.scale(k, k);
      M.gul(ctx, 0, 0, 300, acil, t, { olcek: 1, r: 0.25 * (1 - acil) + 0.016 * (t - T.muh) });
      ctx.restore();
      M.parcaciklar(ctx, 160, 520, 760, 820, t, { sayi: 22, renk: '#FFE7C8', boy: 3, alfa: 0.6 * an(t, T.muh + 0.5, 0.8), hiz: 22, tohum: 31 });
    }

    // 13) taç yaprakları (önde; dalışta kameranın yanından geçip solar)
    if (t > T.en6 && t < DALIS.son + 0.2) {
      const solma = 1 - an(t, DALIS.bas + 0.35, 0.4, ease.inOutSine);
      if (solma > 0) for (const p of yapraklar) yaprakCiz(ctx, cam, p, t, solma);
    }
  },
};

// ---------------------------------------------------------------- cin alevleri
function cinCiz(g, t) {
  for (const c of cinler) {
    const u = an(t, c.t0, 0.75, ease.outCubic);
    if (u <= 0) continue;
    const yuksel = (1 - ease.outBack(an(t, c.t0, 0.9, ease.lin), 1.2)) * c.h * 0.45;
    const a = u * c.alfa;
    const suz = Math.sin(t * 0.6 + c.x) * 6; // ağır yanal süzülme
    M.hale(g, c.x + suz, c.y - c.h * 0.48 + yuksel, c.h * 0.85, '#EFEBFF', 0.32 * u);
    for (const d of c.diller) {
      const k = 0.07 * Math.sin(t * 2.3 + d.faz) + 0.035 * Math.sin(t * 4.3 + d.faz * 2);
      const sy = 1 + 0.07 * Math.sin(t * 3.3 + d.faz) + 0.035 * Math.sin(t * 5.7 + d.faz * 1.3);
      const sx = 1 - 0.04 * Math.sin(t * 3.3 + d.faz);
      alevCiz(g, d.oge, c.x + suz + d.dx, c.y + yuksel, { k, sx, sy, alfa: a });
    }
    const d = c.ic;
    alevCiz(g, d.oge, c.x + suz, c.y + yuksel, { k: 0.05 * Math.sin(t * 2.6 + d.faz), sy: 1 + 0.08 * Math.sin(t * 3.9 + d.faz), alfa: a * 1.1 });
    M.parcaciklar(g, c.x + suz - c.w * 0.5, c.y - c.h * 1.5 + yuksel, c.w, c.h * 1.05, t, { sayi: 7, renk: '#E6E1FF', boy: 2.6, alfa: 0.8 * u, hiz: 46, tohum: Math.round(c.x) });
  }
}

// ---------------------------------------------------------------- figür satırı (ekran dışı tuvalde, kenar ışığıyla)
function satirCiz(ctx, cam, t, satir, f, saadet) {
  const grup = figurler.filter((fg) => fg.satir === satir && t >= fg.t0);
  if (!grup.length) return;
  // görünür mü (dalışta ekrandan çıkar)
  const ustY = Math.min(...grup.map((fg) => fg.y - 400 * fg.s));
  const [, ey] = ekranda(cam, 540, ustY, f);
  if (ey > H + 20) return;
  const L = katman[satir];
  const lc = L.getContext('2d');
  lc.setTransform(1, 0, 0, 1, 0, 0);
  lc.clearRect(0, 0, W, H);
  // kenar ışığının satıra ulaşma zamanı (ışık dalgası madalyondan yayılır)
  const ortMesafe = grup.reduce((m, fg) => m + fg.mesafe, 0) / grup.length;
  const kenar = an(t, T.parlak + 0.12 + ortMesafe / 1500, 0.45, ease.outCubic) * (1 - 0.25 * an(t, T.parlak + 1.4, 1.2));
  const kaldir = (fg) => an(t, T.tatli - 0.1 + fg.gec * 0.6, 0.85, ease.inOutCubic);
  // gölgeler: ışık figürlerin arkasında (madalyon), gölge kameraya doğru uzanır; saadetle koyulaşır
  kameraIle(ctx, cam, (g) => {
    g.save();
    g.globalCompositeOperation = 'multiply';
    for (const fg of grup) {
      const p = pop(t, fg.t0, 0.5);
      if (p <= 0) continue;
      const aci = Math.atan2(fg.y - MY, fg.x - MX) - Math.PI / 2;
      const boy = fg.s * (0.55 + 0.25 * saadet);
      g.save();
      g.translate(fg.x, fg.y - 4 * fg.s);
      g.rotate(aci);
      g.scale(fg.s * 0.62 * Math.max(0.001, p), boy * Math.max(0.001, p));
      g.globalAlpha = (0.22 + 0.2 * saadet) * an(t, fg.t0, 0.2);
      g.drawImage(golge, -110, -20);
      g.restore();
    }
    g.restore();
  }, f);
  // arkadan görülen figürlerin önündeki ışık (göğüs hizasında, figürün arkasından taşan)
  kameraIle(ctx, cam, (g) => {
    for (const fg of grup) {
      const a = an(t, T.parlak + 0.12 + fg.mesafe / 1500, 0.5, ease.outCubic);
      if (a > 0 && fg.tip === 'on') M.hale(g, fg.gogus[0], fg.gogus[1], 150 * fg.s, '#FFF1C2', 0.42 * a);
    }
  }, f);
  kameraIle(lc, cam, (g) => {
    for (const fg of grup) {
      const p = pop(t, fg.t0, 0.5);
      const s = fg.s * Math.max(0.001, p);
      const alfa = an(t, fg.t0, 0.14, ease.lin);
      const k = kaldir(fg);
      const olcek = fg.s > 0.9 ? 1.25 : fg.s > 0.4 ? 1 : 0.6;
      if (fg.tip === 'on') {
        const h = onHedef(fg.poz, fg);
        const nefes = 0.015 * Math.sin(t * 1.3 + fg.faz);
        const sal = 0.04 * Math.sin(t * 1.7 + fg.faz) * k; // kalkan kollarda hafif sevinç salınımı
        const poz = {
          ...ON_DURUS,
          kol: [lerp(0.09 + nefes, h.kol[0], k) + sal, lerp(0.09 - nefes, h.kol[1], k) - sal],
          dirsek: [lerp(0.12, h.dirsek[0], k), lerp(0.12, h.dirsek[1], k)],
          bacak: 0.055, bas: 0.035 * Math.sin(t * 0.8 + fg.faz) - 0.02,
        };
        insanOn(g, fg.x, fg.y, poz, { s, olcek, alfa, arka: true });
      } else {
        const h = yanHedef(fg.poz);
        const bak = -0.28 - 0.08 * saadet;
        const poz = {
          ...DURUS,
          govde: -0.03 + 0.01 * Math.sin(t * 1.1 + fg.faz) - 0.02 * saadet,
          bas: bak + 0.02 * Math.sin(t * 0.9 + fg.faz) + h.bas * k,
          omuz: [lerp(-0.05, h.omuz[0], k), lerp(0.06, h.omuz[1], k) + 0.03 * Math.sin(t * 1.6 + fg.faz) * k],
          dirsek: [lerp(0.12, h.dirsek[0], k), lerp(0.16, h.dirsek[1], k)],
        };
        const e = insanYan(g, fg.x, fg.y, poz, { s, yon: fg.yon, olcek: fg.s > 0.9 ? 1.25 : fg.s > 0.4 ? 1 : 0.7, alfa });
        fg.yanGogus = e.gogus;
      }
    }
  }, f);
  // uzak satırlara hava perspektifi (soluk gök rengi örtü)
  if (satir < 2) {
    lc.save();
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-atop';
    lc.fillStyle = satir === 0 ? 'rgba(214,224,240,0.3)' : 'rgba(222,230,242,0.12)';
    lc.fillRect(0, 0, W, H);
    lc.restore();
  }
  if (kenar > 0.01) {
    // ışığa dönük kenarlar sıcak parlar: önce figürlere hafif sıcak ton, sonra altın kenar ışığı (drop-shadow)
    lc.save();
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-atop';
    lc.fillStyle = `rgba(255,236,180,${0.16 * kenar})`;
    lc.fillRect(0, 0, W, H);
    lc.restore();
    const bl = [4, 6, 9][satir] * cam.z;
    // geniş, yumuşak altın hale: figür silüetinin altın kopyası bulanıklaştırılıp 'screen' ile
    const A = auraTuval[satir], ac = A.getContext('2d');
    ac.setTransform(1, 0, 0, 1, 0, 0);
    ac.clearRect(0, 0, W, H);
    ac.globalCompositeOperation = 'source-over';
    ac.drawImage(L, 0, 0);
    ac.globalCompositeOperation = 'source-in';
    ac.fillStyle = '#FFD878';
    ac.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.8 * kenar;
    ctx.filter = `blur(${(bl * 2.4).toFixed(1)}px)`;
    ctx.drawImage(A, 0, 0);
    ctx.restore();
    ctx.save();
    ctx.filter = `drop-shadow(0px 0px ${bl.toFixed(1)}px rgba(255,206,96,${kenar.toFixed(3)}))`;
    ctx.drawImage(L, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  } else {
    ctx.drawImage(L, 0, 0);
  }
  // yandan görülen figürlerin göğsünde yumuşak ışık
  kameraIle(ctx, cam, (g) => {
    for (const fg of grup) {
      if (fg.tip !== 'yan' || !fg.yanGogus) continue;
      const a = an(t, T.parlak + 0.12 + fg.mesafe / 1500, 0.5, ease.outCubic) * (0.85 + 0.15 * Math.sin(t * 2.4 + fg.faz));
      if (a > 0) {
        M.hale(g, fg.yanGogus[0], fg.yanGogus[1], 70 * fg.s, '#FFE7A0', 0.6 * a);
        M.hale(g, fg.yanGogus[0], fg.yanGogus[1], 24 * fg.s, '#FFFFFF', 0.55 * a);
      }
    }
  }, f);
}

// ---------------------------------------------------------------- saadet ışığı
function isikCiz(ctx, t, msx, msy, Rs, saadet) {
  if (saadet <= 0.001) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // huzmeler: madalyondan kalabalığa doğru açılan yumuşak ışık kamaları
  const L = 1050 * (Rs / MR);
  for (let i = 0; i < 7; i++) {
    const a = Math.PI / 2 + (i - 3) * 0.19 + 0.025 * Math.sin(t * 0.45 + i * 1.7);
    const gen = (60 + 28 * (i % 3)) * (Rs / MR);
    const ex = msx + Math.cos(a) * L, ey = msy + Math.sin(a) * L;
    const nx = -Math.sin(a), ny = Math.cos(a);
    const gr = ctx.createLinearGradient(msx, msy, ex, ey);
    const al = 0.2 * saadet * (0.75 + 0.25 * Math.sin(t * 0.9 + i * 2.3));
    gr.addColorStop(0, 'rgba(255,243,200,0)');
    gr.addColorStop(0.18, `rgba(255,243,200,${al})`);
    gr.addColorStop(0.55, `rgba(255,240,196,${al * 0.7})`);
    gr.addColorStop(1, 'rgba(255,240,196,0)');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(msx + nx * 8, msy + ny * 8);
    ctx.lineTo(ex + nx * gen, ey + ny * gen);
    ctx.lineTo(ex - nx * gen, ey - ny * gen);
    ctx.lineTo(msx - nx * 8, msy - ny * 8);
    ctx.closePath();
    ctx.fill();
  }
  // ışık dalgası (tek sefer yayılır)
  const u = an(t, T.parlak, 1.7, ease.lin);
  if (u > 0 && u < 1) {
    const Rw = lerp(Rs, 2000, ease.outCubic(u));
    const al = 0.42 * Math.pow(1 - u, 1.3) * Math.min(1, u * 6);
    const g = ctx.createRadialGradient(msx, msy, Math.max(0, Rw - 280), msx, msy, Rw + 40);
    g.addColorStop(0, 'rgba(255,240,190,0)');
    g.addColorStop(0.78, `rgba(255,240,190,${al})`);
    g.addColorStop(1, 'rgba(255,240,190,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // sıcak örtü
  ctx.fillStyle = `rgba(255,238,196,${0.07 * saadet})`;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- taç yaprağı: madalyondan saçılır ve süzülür
function yaprakCiz(ctx, cam, p, t, solma) {
  const u = t - p.te;
  if (u <= 0) return;
  const s = pop(t, p.te, 0.38);
  const alfa = an(t, p.te, 0.14, ease.lin) * solma;
  // madalyon kenarından dışa: hız sürtünmeyle söner, sonra salınarak aşağı süzülür
  const yol = MR * 1.02 + (p.v0 * (1 - Math.exp(-p.k * u))) / p.k;
  const sal = Math.sin(u * p.frek + p.faz) * p.genlik * clamp(u / 0.6);
  const x = MX + Math.cos(p.a) * yol + sal;
  const y = MY + Math.sin(p.a) * yol + p.vy * u + 16 * u * u + 8 * Math.sin(u * p.frek * 2 + p.faz) * clamp(u / 0.6);
  const [sx, sy, z] = ekranda(cam, x, y, p.f);
  if (sy < -90 || sy > H + 90 || sx < -90 || sx > W + 90) return;
  const kz = z * s;
  // ışıltı
  M.hale(ctx, sx, sy, p.boy * 2.4 * kz, p.cicek ? '#FFE7A8' : '#FFE2CF', 0.55 * alfa);
  M.hale(ctx, sx, sy, p.boy * 0.9 * kz, '#FFFBF2', 0.5 * alfa);
  if (p.cicek) {
    ogeCiz(ctx, p.oge, sx, sy, { s: kz, r: p.r0 + u * p.don * 0.6, alfa });
  } else {
    // taç yaprağı: dönerek ve takla atarak (yatay ölçek kosinüsle) süzülür
    const flip = Math.cos(u * p.cevir + p.faz);
    ogeCiz(ctx, p.oge, sx, sy, { sx: kz * (0.22 + 0.78 * Math.abs(flip)), sy: kz, r: p.r0 + u * p.don, alfa, pivot: [0, -p.boy * 0.5] });
  }
}
