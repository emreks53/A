// 7. cümle: "Onu hakiki tanımayan, sevmeyen nihayetsiz şakavete, âlâma ve evhama manen ve maddeten müptela olur."
// s06'nın dünyasında başlar: adam (yan, sağa bakar, eli göğsünde) yolun kıyısında, solunda meyveli ağaç, sağda nur,
// yukarıdan inen ışığın altında, aydınlık yeşil manzara. "Onu hakiki tanımayan": ışığa sırtını döner, sola yürür; yürüdükçe renk ışığa doğru çekilir, dünya gri-lila
// olur, tarama koyulaşır, ağır bulutlar toplanır. "sevmeyen": göğsündeki sıcak ışık titreyip söner. "nihayetsiz
// şakavete": kamera geri çekilir; önünde ufka uzanan sisli, çorak ova, kuru ağaç, ağır bulutlar. "âlâma": ayaklarının
// dibinden dikenli çalılar fışkırır, bacaklarına dolanır, adam durur. "ve evhama": çevresinde dönen koyu sis
// şeritleri, siste beliren yüzsüz, belirsiz büyük gölgeler. "manen": eli göğsüne gider, göğsünde koyu bir bulut;
// "ve maddeten": üstüne ağır bir bulut çöker, yağmur iner, omuzları düşer. "müptela olur": dizlerinin üstüne çöker;
// kamera yavaşça yaklaşır. Bitiş: gri, ıssız, loş; diz çökmüş adam.
import { W, H, clamp, lerp, ease, an, pop, rng, TAU, smooth, tuval, rgba, gurultu2, renkKaristir } from '../motor/temel.mjs';
import { ogeCiz, gokTuvali, darbe, oge, TON } from '../motor/kalem.mjs';
import { kameraIle, ekranda, salinim } from '../motor/sahne.mjs';
import { kb } from '../motor/zaman.mjs';
import { insanYan, insanOn, DURUS, ON_DURUS } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import { elips } from '../motor/sekil.mjs';
import * as Y from './s07-yardim.mjs';

const T = {
  bas: 57.0, son: 67.6,
  onu: kb('onu'), hakiki: kb('hakiki', 2), taniyan: kb('tanımayan'), sevmeyen: kb('sevmeyen'), nihayet: kb('nihayetsiz', 2),
  sakavet: kb('şakavete'), alam: kb('alama'), ve: kb('ve', 13), evham: kb('evhama'), manen: kb('manen'), maddeten: kb('maddeten'),
  muptela: kb('müptela'), olur: kb('olur'),
};
const DONUS = { t0: T.onu + 0.04, sure: 0.36 };
const YURU = { t0: DONUS.t0 + 0.3, dur0: 62.12, dur1: 62.84 };

// dünya yerleşimi (nötr görünüşte ekranla aynı)
const ZEMIN = 1330; // adamın bastığı çizgi
const S = 0.85; // adam ölçeği (boy ~326)
const X0 = 470; // başlangıçta adamın yeri
const AGAC = { x: 172, y: 1304 };
const F = { gok: 0.3, isik: 0.35, bulut: 0.42, dag: 0.45, uzak: 0.55, sisU: 0.6, orta: 0.75, sisO: 0.88, golge: 0.93, on: 1 };
const ISIK = { x: 837, y: 629, r: 80 }; // nur (F.isik katmanında; s06'nın sonundaki yerinde)

const tumsek = (x, c, h, w) => h * Math.exp(-(((x - c) / w) ** 2));
const pOn = (x) => 1236 + 12 * Math.sin(x * 0.0045 + 0.6) + 7 * Math.sin(x * 0.013 + 2);
const pOrta = (x) => 1160 + 4 * Math.sin(x * 0.02) - tumsek(x, 1090, 80, 250) - tumsek(x, 560, 48, 280) - tumsek(x, 150, 24, 230);
const pDag = (x) => 1110 - tumsek(x, 760, 250, 230) - tumsek(x, 1080, 300, 210) - tumsek(x, 470, 150, 190) - tumsek(x, 1330, 210, 200);
const pUzak = (x) => 1080 + 3 * Math.sin(x * 0.017 + 1) - tumsek(x, 920, 120, 270) - tumsek(x, 390, 74, 250) - tumsek(x, -10, 28, 200);

let sim, gokR, gokG, uzakR, uzakG, ortaR, ortaG, onR, onG, agacR, agacG, cicekR, cicekG, bulutlarR, agirlar, yagmurBulutu;
let kucukAgacR, kucukAgacG, kuruAgac, uzakKuru, calilar, taslar, golgeler, sisU, sisO, huzme, kamera, onDallar, renkTuval, adamTuval;
let XDUR; // adamın durduğu yer
let sisBlob, onPlan, otlar, yolR, yolG, dagR, dagG, XFIN, kucukBulut, golgeSis;

// ---------------------------------------------------------------- yardımcılar
function griKopya(c, { sat = 0.22, parlak = 0.94, tint = '#E4DFEA' } = {}) {
  const k = tuval(c.width, c.height);
  const g = k.getContext('2d');
  g.filter = `saturate(${sat}) brightness(${parlak})`;
  g.drawImage(c, 0, 0);
  g.filter = 'none';
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = tint;
  g.fillRect(0, 0, k.width, k.height);
  g.globalCompositeOperation = 'destination-in';
  g.drawImage(c, 0, 0);
  return k;
}
const griOge = (o, ops) => ({ ...o, tuval: griKopya(o.tuval, ops) });

/** Kuru çalı: dipten açılan çıplak, ince dallar (gri) */
function caliOge(boy, tohum, olcek = 1.2) {
  const r = rng(tohum);
  const dallar = [];
  for (let i = 0; i < 7; i++) {
    const a = r.ara(-0.9, 0.9);
    dallar.push(Y.dalYolu(boy * r.ara(0.55, 1), a, r.ara(-1.2, 1.2), tohum * 7 + i));
  }
  const sek = elips(0, -boy * 0.5, boy * 0.75, boy * 0.6);
  return oge({
    ad: `s07-cali-${boy}-${tohum}`, olcek, sekil: sek, zemin: null, pay: 10,
    detay: (c, api) => {
      for (const d of dallar) {
        api.cizgi(d, { renk: '#5E5568', kal: 1.7, alfa: 0.85 });
        // yan çatallar
        for (let k = 8; k < d.length - 4; k += 9) {
          const [x, y] = d[k];
          const yan = k % 2 ? 1 : -1;
          api.cizgi([[x, y], [x + yan * boy * 0.12, y - boy * 0.1], [x + yan * boy * 0.16, y - boy * 0.18]], { renk: '#5E5568', kal: 1.2, alfa: 0.75 });
        }
      }
    },
  });
}
/** Taş: basık, gri, kalem taralı */
function tasOge(w, tohum) {
  const r = rng(tohum);
  const h = w * r.ara(0.45, 0.6);
  return oge({
    ad: `s07-tas-${w}-${tohum}`, olcek: 1.3,
    sekil: elips(0, -h * 0.5, w / 2, h / 2),
    arka: '#C9C4CE', arkaAlfa: 0.8,
    tarama: { ton: TON.kure(w * 0.15, -h * 0.8, w * 0.6), renkler: [[0, '#BDB7C5'], [1, '#6E667A']], yon: -0.6, aralik: 2.8, boy: [8, 22], esikler: [0.25, 0.55, 0.8], alfa: 0.55 },
    kontur: '#5F576B', konturKal: 1.8,
  });
}

// ---------------------------------------------------------------- adam: poz ve durum
// diz çökme: önce parmak üstüne düşüş (baldır yatık, ayak dik), çarpmadan sonra baldır yere yatar, ayak sırtı yere döner.
// Son poz s08'in açılış pozu (DIZ_COK) ile aynıdır.
const DIZ_ARA = { kalca: [0.22, 0.32], a2: [-1.86, -1.84], a3: [-Math.PI / 2, -Math.PI / 2] };
const DIZ_SON = { govde: 0.3, bas: 0.55, kalca: [0.22, 0.32], diz: [-1.92, -2.0], bilek: [-1.15, -1.1], omuz: [0.12, 0.22], dirsek: [0.15, 0.25] };
const DIZ_SURE = 0.56;
const DIZ_CARPMA = kb('müptela') + 0.02 + DIZ_SURE;

function ustKaristir(p, h, w) {
  if (w <= 0) return p;
  const o = { ...p };
  for (const k of ['govde', 'bas']) if (h[k] !== undefined) o[k] = lerp(p[k], h[k], w);
  for (const k of ['omuz', 'dirsek', 'el']) if (h[k]) o[k] = (p[k] || [0, 0]).map((v, i) => lerp(v, h[k][i], w));
  return o;
}

/** t anında adamın durumu: { mod: 'yan'|'arka', X, yon, sx, poz (serbest, zipla çözülmüş) } */
function adamDurum(t) {
  const u = clamp((t - DONUS.t0) / DONUS.sure);
  const nefes = Math.sin(t * 2.2);
  if (t < DONUS.t0 + DONUS.sure * 0.66) {
    if (u < 0.36) {
      const k = ease.inQuad(u / 0.36);
      const el = an(t, T.onu - 0.1, 0.32, ease.inOutSine); // göğüsteki el iner
      // s06'nın son pozu (eli göğsünde); el inerken dirsek hafifçe geriye kaçar, ön kol aşağı düşer
      const poz = { ...DURUS, bas: lerp(-0.17 + 0.012 * nefes, 0.08, an(t, T.onu - 0.08, 0.32)), govde: -0.015 + 0.01 * nefes + 0.03 * k,
        omuz: [-0.05 - 0.07 * k, lerp(-0.34, 0.06, el) - 0.22 * Math.sin(Math.PI * el) + 0.1 * k], dirsek: [0.12, lerp(2.82, 0.18, el)], el: [0, lerp(0.32, 0, el)] };
      return yanPoz({ mod: 'yan', X: X0, yon: 1, sx: 1 - 0.32 * k, poz });
    }
    const k = (u - 0.36) / 0.3;
    return { mod: "arka", X: X0, Xkam: X0, yon: 1, sx: 0.74 + 0.26 * Math.sin(Math.PI * k), poz: { ...ON_DURUS, kol: [0.1, 0.1], bas: 0.04 } };
  }
  const o = sim(t);
  let poz = Y.yuruyusPozu(o, { S0: 118, kol: 0.22, govde: 0.09, bas: 0.17 });
  // dönüşün sonu: hafif açılma
  const sx = u < 1 ? 0.68 + 0.32 * ease.outQuad((u - 0.66) / 0.34) : 1;
  // duruş ve ruh hâli (yalnız üst gövde)
  poz = ustKaristir(poz, { govde: 0.1, bas: 0.3 }, an(t, 62.35, 0.6, ease.inOutSine));
  poz = ustKaristir(poz, { govde: 0.04, bas: -0.02, omuz: [-0.12, -0.2], dirsek: [0.3, 0.36] }, an(t, T.evham, 0.45, ease.outCubic));
  poz = ustKaristir(poz, { govde: 0.08, bas: 0.34, omuz: [-0.04, -0.34], dirsek: [0.2, 2.82], el: [0, 0.32] }, an(t, T.manen - 0.02, 0.4, ease.inOutCubic));
  poz = ustKaristir(poz, { govde: 0.22, bas: 0.52, omuz: [0.05, 0.1], dirsek: [0.06, 0.1], el: [0, 0] }, an(t, T.maddeten + 0.04, 0.55, ease.outCubic));
  // nefes / omuz inip kalkması
  poz.govde += 0.012 * nefes * an(t, 62.8, 0.5);
  let X = o.X;
  const k = an(t, T.muptela + 0.02, DIZ_SURE, ease.inQuad);
  if (k > 0) {
    const kd = { ...poz };
    const sk0 = Y.iskelet(poz);
    const yat = an(t, DIZ_CARPMA, 0.5, ease.inOutSine); // çarpmadan sonra baldır yere yatar
    Object.assign(kd, dizBacak(poz, sk0, k, yat));
    // düşüşte gövde öne savrulur, kollar ataletle öne gelir; çarpmadan sonra gövde oturur, kollar sarkar, baş gecikmeyle
    // düşer (ikincil hareket)
    const sonra = an(t, DIZ_CARPMA, 0.8, ease.outCubic);
    const bas2 = an(t, DIZ_CARPMA + 0.08, 1.0, ease.inOutSine);
    kd.govde = lerp(lerp(poz.govde, 0.4, k), DIZ_SON.govde, sonra);
    kd.bas = lerp(lerp(poz.bas, 0.42, k), DIZ_SON.bas, bas2);
    kd.omuz = [0, 1].map((i) => lerp(lerp(poz.omuz[i], [0.24, 0.34][i], k), DIZ_SON.omuz[i], sonra));
    kd.dirsek = [0, 1].map((i) => lerp(lerp(poz.dirsek[i], 0.22, k), DIZ_SON.dirsek[i], sonra));
    kd.govde += 0.012 * Math.sin(t * 2.2) * sonra; // s08 ile aynı nefes
    // temas noktaları yerinde kalsın: düşerken ayak parmakları, çarpmadan sonra dizler (yon -1: yerel ileri = dünya -x)
    const parmak = (p) => { const q = Y.iskelet(p); return (q.bacak[0].ayak[4][0] + q.bacak[1].ayak[4][0]) / 2; };
    const dizX = (p) => { const q = Y.iskelet(p); return (q.bacak[0].diz[0] + q.bacak[1].diz[0]) / 2; };
    const pCarp = { ...poz, ...dizBacak(poz, sk0, 1, 0) };
    if (t < DIZ_CARPMA) X = o.X + S * (parmak(kd) - parmak(poz));
    else X = o.X + S * (parmak(pCarp) - parmak(poz)) + S * (dizX(kd) - dizX(pCarp));
    poz = kd;
    poz.zipla = Y.zeminZipla(poz) + 1;
    poz.serbest = true;
    return { mod: 'yan', X, yon: -1, sx, poz, Xkam: o.X };
  }
  return yanPoz({ mod: 'yan', X, yon: -1, sx, poz, Xkam: o.X });
}
/** diz çökmede bacak açıları: k düşüş (0..1), yat çarpma sonrası yerleşme (0..1) */
function dizBacak(poz, sk0, k, yat) {
  const sonA2 = [0, 1].map((i) => DIZ_SON.kalca[i] + DIZ_SON.diz[i]);
  const sonA3 = [0, 1].map((i) => sonA2[i] + DIZ_SON.bilek[i]);
  const kalca = [0, 1].map((i) => lerp(poz.kalca[i], DIZ_ARA.kalca[i], k) + 0.34 * Math.sin(Math.PI * k));
  const a2 = [0, 1].map((i) => lerp(lerp(sk0.bacak[i].a2, DIZ_ARA.a2[i], k), sonA2[i], yat));
  const a3 = [0, 1].map((i) => lerp(lerp(sk0.bacak[i].a3, DIZ_ARA.a3[i], ease.inOutSine(k)), sonA3[i], yat));
  return { kalca, diz: [0, 1].map((i) => a2[i] - kalca[i]), bilek: [0, 1].map((i) => a3[i] - a2[i]) };
}
/** yürüyüş / duruş pozunu motorun zemin kuralıyla (en alçak bilek + 12) serbest poza çevirir */
function yanPoz(d) {
  const sk = Y.iskelet({ ...d.poz, zipla: 0 });
  const taban = Math.max(sk.bacak[0].bil[1], sk.bacak[1].bil[1]) + 12;
  d.poz = { ...d.poz, zipla: (d.poz.zipla || 0) + taban, serbest: true };
  if (d.Xkam === undefined) d.Xkam = d.X;
  return d;
}

/** adamı dünya koordinatında çizer; göğüs konumunu döndürür */
function adamCiz(g, d) {
  g.save();
  g.translate(d.X, 0);
  g.scale(d.sx, 1);
  g.translate(-d.X, 0);
  let r;
  if (d.mod === 'arka') r = insanOn(g, d.X, ZEMIN, d.poz, { s: S, olcek: 1.5, arka: true });
  else r = insanYan(g, d.X, ZEMIN, d.poz, { s: S, yon: d.yon, olcek: 1.5 });
  g.restore();
  return r.gogus;
}
/** bacak kemik zinciri (dünya): bilek → diz → uyluğun oran kadarı */
function bacakZinciri(d, i, oran) {
  const sk = Y.iskelet(d.poz);
  const b = sk.bacak[i];
  const w = ([x, y]) => [d.X + x * S * d.yon, ZEMIN + y * S];
  const ust = [lerp(b.diz[0], b.kalca[0], oran), lerp(b.diz[1], b.kalca[1], oran)];
  return [w([b.bil[0], b.bil[1] - 4]), w(b.diz), w(ust)];
}

// ---------------------------------------------------------------- kamera
let KS, KY, KZ;
const YAKIN = Math.log(1.15); // evham–maddeten arası ek yakınlaşma (figür kalabalıkta okunur kalsın)
function kameraAl(t) {
  const d = adamDurum(t);
  const z = Math.exp(KZ(t) + YAKIN * smooth(62.7, 63.75, t) * (1 - smooth(64.45, 66.0, t)));
  const sx = KS(t), sy = KY(t);
  const sl = salinim(t, 3, 0.25, 7);
  const ax = XFIN === null ? d.Xkam : lerp(d.Xkam, XFIN, smooth(T.muptela, T.son - 0.35, t));
  return { x: ax - (sx - 540) / z + sl.x / z, y: ZEMIN - (sy - 960) / z + sl.y / z, z, r: sl.r, d };
}

// ---------------------------------------------------------------- renk süpürmesi
const CEPHE = Y.egri([[T.hakiki - 0.02, -640], [T.taniyan + 0.38, 420], [T.sevmeyen + 0.55, 980], [T.nihayet + 0.02, 1720]]);
const SUP_EN = 720, SUP_EGIM = 0.25;

// ---------------------------------------------------------------- sahne
export default {
  sesler: [
    { t: DONUS.t0, tur: 'whoosh', guc: 0.14, sure: 0.5 },
    { t: YURU.t0 + 0.35, tur: 'adim', guc: 0.16, tekrar: 6, ara: 0.62 },
    { t: T.hakiki + 0.1, tur: 'ruzgar', guc: 0.22, sure: 2.6 },
    { t: T.sevmeyen + 0.05, tur: 'kalp', guc: 0.3 },
    { t: T.nihayet, tur: 'whoosh', guc: 0.24, sure: 1.4 },
    { t: T.sakavet + 0.05, tur: 'gok', guc: 0.34, sure: 2.6 },
    { t: T.sakavet + 0.3, tur: 'ruzgar', guc: 0.2, sure: 1.8 },
    { t: T.alam, tur: 'kalem', guc: 0.34, sure: 0.8 },
    { t: T.evham, tur: 'ruzgar', guc: 0.26, sure: 1.8 },
    { t: T.manen + 0.05, tur: 'kalp', guc: 0.24 },
    { t: T.maddeten, tur: 'yagmur', guc: 0.32, sure: 2.7 },
    { t: DIZ_CARPMA, tur: 'toz', guc: 0.22 },
  ],
  hazirla() {
    // yürüyüş
    const wF = (t) => (t < YURU.t0 ? 0 : smooth(YURU.t0, YURU.t0 + 0.55, t) * (1 - smooth(YURU.dur0, YURU.dur1, t)));
    const omF = (t) => (t < YURU.t0 ? 0 : (TAU / lerp(1.18, 1.42, smooth(60.3, 61.9, t))) * (0.4 + 0.6 * smooth(YURU.t0, YURU.t0 + 0.4, t)) * (1 - smooth(YURU.dur0, YURU.dur1 + 0.04, t)));
    sim = Y.yuruyusSim({ t0: T.bas - 0.2, t1: T.son + 0.2, x0: X0, yon: -1, s: S, S0: 118, wF, omF, L0: 24 });
    XDUR = sim.sonX;

    // kamera: başta s06'nın son karesi (adam ekranda 615/1195, ölçek 1,05), sonda s08'in ilk karesi (adam 420/1291, 1,18)
    KS = Y.egri([[57.0, 615], [57.75, 617], [59.4, 650], [60.4, 662], [61.95, 765], [62.5, 760], [64.9, 560], [67.6, 420]]);
    KY = Y.egri([[57.0, 1195], [58.2, 1202], [60.4, 1290], [61.95, 1290], [62.5, 1290], [64.9, 1300], [67.6, 1291]]);
    KZ = Y.egri([[57.0, Math.log(1.238)], [57.75, Math.log(1.245)], [60.4, Math.log(1.1)], [61.95, Math.log(0.725)], [62.4, Math.log(0.73)], [63.6, Math.log(0.92)], [64.9, Math.log(1.12)], [65.6, Math.log(1.2)], [67.6, Math.log(1.176 / S)]]);
    XFIN = null;
    XFIN = adamDurum(T.son).X;

    // gökler
    gokR = gokTuvali({ w: 1800, h: 1750, olcek: 1.05, ad: 's07-gok-renk2', gunes: { x: 1150, y: 980, r: 90 }, ust: '#9FAFD6', orta: '#CDC6E0', alt: '#F0D9C2', arkaUst: '#CFD3EA', arkaAlt: '#F3E0CA', parilti: '#FBE6B6', tohum: 21 });
    gokG = gokTuvali({ w: 2150, h: 1800, olcek: 1.05, ad: 's07-gok-gri', ust: '#6A6380', orta: '#A39CB5', alt: '#CEC9D7', arkaUst: '#B1AAC2', arkaAlt: '#DAD6E1', parilti: '#D4CFDD', yogunluk: 1.12, alfa: 0.45, aralik: 3.1, tohum: 17 });
    // zemin katmanları: aynı biçim, iki palet
    uzakR = Y.zeminOge({ ad: 's07-uzak-r', profil: pUzak, x0: -420, x1: 1420, yAlt: 1760, palet: 'yesilUzak', olcek: 1, tohum: 4 });
    uzakG = Y.zeminOge({ ad: 's07-uzak-g', profil: pUzak, x0: -1120, x1: 1420, yAlt: 1760, palet: 'griUzak', olcek: 1, tohum: 4 });
    dagR = Y.zeminOge({ ad: 's07-dag-r', profil: pDag, x0: -720, x1: 1520, yAlt: 1500, palet: 'dag', olcek: 1, tohum: 2 });
    dagG = Y.zeminOge({ ad: 's07-dag-g', profil: pDag, x0: -720, x1: 1520, yAlt: 1500, palet: 'dagGri', olcek: 1, tohum: 2 });
    ortaR = Y.zeminOge({ ad: 's07-orta-r', profil: pOrta, x0: -520, x1: 1520, yAlt: 1900, palet: 'yesilOrta', olcek: 1.05, tohum: 6 });
    ortaG = Y.zeminOge({ ad: 's07-orta-g', profil: pOrta, x0: -1320, x1: 1520, yAlt: 1900, palet: 'griOrta', olcek: 1.05, tohum: 6 });
    const cimen = (renk, kuru) => (c, api) => {
      const r = rng(kuru ? 77 : 78);
      for (let i = 0; i < 70; i++) {
        const x = r.ara(-1500, 1500), y = r.ara(1250, 1372);
        const n = r.tam(3, 5);
        for (let k = 0; k < n; k++) {
          const a = r.ara(-0.5, 0.5) + (kuru ? 0.35 : 0), L = r.ara(9, 18) * (kuru ? 0.9 : 1);
          api.cizgi([[x + k * 2.5, y], [x + k * 2.5 + Math.sin(a) * L * 0.5, y - L * 0.55], [x + k * 2.5 + Math.sin(a * 1.6) * L, y - L * (kuru ? 0.7 : 1)]], { renk, kal: 1.3, alfa: 0.7 });
        }
      }
      if (kuru) {
        // çatlaklar
        for (let i = 0; i < 26; i++) {
          let x = r.ara(-1450, 250), y = r.ara(1262, 1372);
          const pts = [[x, y]];
          for (let k = 0; k < 5; k++) { x += r.ara(10, 26) * (r() < 0.5 ? -1 : 1); y += r.ara(-3, 5); pts.push([x, y]); }
          api.cizgi(pts, { renk: '#625A6E', kal: 1.2, alfa: 0.55 });
        }
        for (let i = 0; i < 14; i++) {
          let x = r.ara(-1450, 1400), y = r.ara(1680, 1980);
          const pts = [[x, y]];
          for (let k = 0; k < 5; k++) { x += r.ara(14, 30) * (r() < 0.5 ? -1 : 1); y += r.ara(-4, 6); pts.push([x, y]); }
          api.cizgi(pts, { renk: '#625A6E', kal: 1.3, alfa: 0.45 });
        }
      }
    };
    onR = Y.zeminOge({ ad: 's07-on-r', profil: pOn, x0: -720, x1: 1520, yAlt: 2320, palet: 'yesil', olcek: 1.15, tohum: 8, detay: cimen('#3E7C4F', false) });
    onG = Y.zeminOge({ ad: 's07-on-g', profil: pOn, x0: -1520, x1: 1520, yAlt: 2320, palet: 'gri', olcek: 1.3, tohum: 8, detay: cimen('#655D70', true) });

    // yol (s06'dan): sol alttan adamın ayağının dibinden sağa, nura doğru kıvrılır; gri dünyada kuru, çatlak toprak
    const yolPts = [];
    const solK = [[-60, 2360], [40, 1960], [170, 1640], [330, 1450], [520, 1352], [720, 1300], [930, 1268], [1180, 1250], [1530, 1244]];
    const sagK = [[1530, 1262], [1180, 1276], [960, 1316], [780, 1388], [640, 1500], [540, 1680], [480, 1980], [450, 2360]];
    const egriNokta = (K) => { const o = []; for (let i = 0; i < K.length - 1; i++) for (let k = 0; k < 8; k++) { const u = k / 8; const p0 = K[Math.max(0, i - 1)], p1 = K[i], p2 = K[i + 1], p3 = K[Math.min(K.length - 1, i + 2)]; const u2 = u * u, u3 = u2 * u; o.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3), 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]); } o.push(K[K.length - 1]); return o; };
    yolPts.push(...egriNokta(solK), ...egriNokta(sagK));
    yolR = Y.zeminOge({ ad: 's07-yol-r', sekilPts: yolPts, palet: 'yol', olcek: 1.2, tohum: 31, yon: -0.75 });
    yolG = Y.zeminOge({ ad: 's07-yol-g', sekilPts: yolPts, palet: 'yolGri', olcek: 1.3, tohum: 31, yon: -0.75, detay: (c, api) => {
      const r = rng(313);
      for (let i = 0; i < 16; i++) {
        let x = r.ara(80, 900), y = r.ara(1320, 2100);
        const pts = [[x, y]];
        for (let k = 0; k < 4; k++) { x += r.ara(-22, 22); y += r.ara(8, 22); pts.push([x, y]); }
        api.cizgi(pts, { renk: '#6E6670', kal: 1.3, alfa: 0.5 });
      }
    } });

    // ağaç (meyveli) ve gri kopyası
    const A = M.agac({ boy: 470, tohum: 21, olcek: 1.45 });
    const meyve = M.meyveOge(11, 2, 'kirmizi');
    const OL = 1.45, AW = 700, AH = 640;
    const at = tuval(AW * OL, AH * OL);
    const ag = at.getContext('2d');
    ag.scale(OL, OL);
    M.agacCiz(ag, A, AW / 2, AH - 20, { t: 0, meyveOge: meyve });
    agacR = { tuval: at, ox: AW / 2, oy: AH - 20, olcek: OL };
    agacG = { ...agacR, tuval: griKopya(at, { sat: 0.18, parlak: 0.9 }) };

    // çiçekler (renkli dünyada), gri dünyada boyun büken gri kopyaları
    const cr = rng(707);
    cicekR = [];
    for (let i = 0; i < 16; i++) {
      const x = cr.ara(-300, 1260);
      if (Math.abs(x - X0) < 50 || Math.abs(x - AGAC.x) < 60 || (x > 420 && x < 980)) continue;
      const renk = cr.sec(['beyaz', 'beyaz', 'pembe', 'sari']);
      cicekR.push({ x, y: cr.ara(1262, 1312), s: cr.ara(0.5, 0.8), oge: M.cicekOge(22, 1.5, renk), faz: cr() * TAU });
    }
    cicekG = cicekR.map((c) => ({ ...c, oge: griOge(c.oge, { sat: 0.15, parlak: 0.88 }) }));
    bulutlarR = [[M.bulutOge(300, 3, 1.15), 120, 300], [M.bulutOge(240, 7, 1.15), 980, 160], [M.bulutOge(260, 12, 1.15), 1260, 420]];

    // ağır bulutlar (gri gök): gelirken soldan sürüklenir; "şakavete"de alçak bir küme daha çöker
    agirlar = [
      { o: Y.agirBulut(900, 31, 1.05), x: -260, y: 330, t0: T.hakiki + 0.2, dx: -260 },
      { o: Y.agirBulut(760, 33, 1.05), x: 420, y: 180, t0: T.hakiki + 0.6, dx: -320 },
      { o: Y.agirBulut(820, 37, 1.05), x: 1020, y: 300, t0: T.taniyan + 0.5, dx: -360 },
      { o: Y.agirBulut(700, 41, 1.05), x: 170, y: 560, t0: T.sevmeyen, dx: -300 },
      { o: Y.agirBulut(1100, 43, 1.05, 1), x: -380, y: 760, t0: T.sakavet - 0.1, dy: -420, alcak: true },
      { o: Y.agirBulut(980, 47, 1.05, 1), x: 640, y: 700, t0: T.sakavet + 0.15, dy: -440, alcak: true },
    ];
    yagmurBulutu = Y.yagmurBulutuOge(640, 53, 1.3);
    kucukBulut = Y.gogusBulutuOge(84, 61, 2.4);

    // orta katmanda küçük ağaçlar: renkli dünyada yeşil, gri dünyada aynı yerde kuru
    const ka = M.agac({ boy: 150, tohum: 61, olcek: 1.2 });
    const kk = M.agac({ boy: 150, tohum: 61, olcek: 1.2, yaprakli: false, kuru: true });
    const kTuval = (A0) => {
      const c = tuval(260 * 1.2, 220 * 1.2);
      const g = c.getContext('2d');
      g.scale(1.2, 1.2);
      M.agacCiz(g, A0, 130, 205, { t: 0 });
      return { tuval: c, ox: 130, oy: 205, olcek: 1.2 };
    };
    kucukAgacR = kTuval(ka);
    const kgri = kTuval(kk);
    kucukAgacG = { ...kgri, tuval: griKopya(kgri.tuval, { sat: 0.1, parlak: 0.95 }) };
    // çorak ova: kuru ağaç, ufukta küçük kuru ağaçlar, çalılar, taşlar
    const kuru = M.agac({ boy: 300, tohum: 71, olcek: 1.2, yaprakli: false, kuru: true });
    {
      const c = tuval(480 * 1.2, 360 * 1.2);
      const g = c.getContext('2d');
      g.scale(1.2, 1.2);
      M.agacCiz(g, kuru, 240, 345, { t: 0 });
      kuruAgac = { tuval: griKopya(c, { sat: 0.1, parlak: 0.95 }), ox: 240, oy: 345, olcek: 1.2 };
    }
    uzakKuru = kucukAgacG;
    calilar = [caliOge(60, 3), caliOge(48, 5), caliOge(70, 9), caliOge(40, 11)];
    taslar = [tasOge(46, 3), tasOge(30, 7), tasOge(60, 13), tasOge(24, 17)];

    // kuruntu gölgeleri
    golgeler = [
      { o: Y.kuruntuOge({ h: 520, w: 250, tohum: 5, yon: 1, egil: 0.72 }), yon: 1, dx: -300, dy: -30, t0: T.evham + 0.02, faz: 0.3, R: 22 },
      { o: Y.kuruntuOge({ h: 495, w: 236, tohum: 8, yon: -1, egil: 0.7 }), yon: -1, dx: 300, dy: -45, t0: T.evham + 0.26, faz: 2.1, R: 20 },
      { o: Y.kuruntuOge({ h: 510, w: 240, tohum: 13, yon: -1, egil: 0.5 }), yon: -1, dx: 150, dy: -125, t0: T.evham + 0.5, faz: 4.0, R: 28, uzak: true },
    ];
    golgeSis = Y.sisTuvali(2400, 260, 15, '#E6E2EC');
    sisU = Y.sisTuvali(2400, 260, 3, '#EEEBF2');
    sisBlob = tuval(1120, 900);
    {
      const g = sisBlob.getContext('2d');
      g.filter = 'blur(60px)';
      const r = rng(77);
      for (let i = 0; i < 9; i++) {
        g.fillStyle = rgba('#E6E2EC', r.ara(0.5, 0.85));
        g.beginPath();
        g.ellipse(560 + r.ara(-250, 250), 450 + r.ara(-220, 260), r.ara(180, 300), r.ara(150, 260), 0, 0, TAU);
        g.fill();
      }
    }
    sisO = Y.sisTuvali(2400, 220, 9, '#E8E5EE');

    // nur huzmesi (yumuşak yamuk)
    huzme = tuval(420, 1000);
    {
      const g = huzme.getContext('2d');
      g.filter = 'blur(26px)';
      const gr = g.createLinearGradient(0, 0, 0, 1000);
      gr.addColorStop(0, 'rgba(255,246,214,0.95)');
      gr.addColorStop(0.6, 'rgba(255,240,196,0.55)');
      gr.addColorStop(1, 'rgba(255,240,196,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(170, 40); g.lineTo(250, 40); g.lineTo(380, 960); g.lineTo(40, 960); g.closePath();
      g.fill();
    }

    // zeminden fışkıran dikenli dallar (adamın durduğu yerin çevresinde; dz: derinlik, + önde), yan dallarıyla
    const dr = rng(909);
    onDallar = [];
    [-150, -118, -88, -62, -38, -16, 10, 32, 56, 82, 108, 138, -178, 166].forEach((dx, i) => {
      const sg = dx < 0 ? 1 : -1; // adama doğru yatar ve kıvrılır
      const yakin = 1 - Math.min(1, Math.abs(dx) / 185);
      const boy = dr.ara(85, 130) + 135 * yakin;
      const aci = sg * dr.ara(0.1, 0.42) + dr.ara(-0.08, 0.08);
      const kv = sg * dr.ara(0.8, 1.8);
      const pts = Y.dalYolu(boy, aci, kv, 300 + i);
      const dallar = [];
      for (let j = 0; j < (boy > 150 ? 2 : 1); j++) {
        const f = dr.ara(0.3, 0.6);
        const [bx, by] = pts[Math.floor(f * (pts.length - 1))];
        const yonA = aci + (j % 2 ? 1 : -1) * dr.ara(0.55, 0.95);
        dallar.push({ f, pts: Y.dalYolu(boy * dr.ara(0.3, 0.45), yonA, -sg * dr.ara(0.4, 1.3), 500 + i * 7 + j).map(([x, y]) => [x + bx, y + by]) });
      }
      onDallar.push({ dx, dz: (i % 2 ? 1 : -1) * dr.ara(5, 18), pts, dallar, t0: T.alam + i * 0.028 + dr.ara(0, 0.05), sure: dr.ara(0.55, 0.85), faz: dr() });
    });
    // ön plan: alt kenarı çerçeveleyen otlar ve taşlar (renkli dünyada yeşil, gri dünyada kuru)
    onPlan = [
      { x: -1320, s: 1.0, tip: 0 }, { x: -1060, s: 0.8, tip: 2 }, { x: -820, s: 0.9, tip: 1 }, { x: -520, s: 1.05, tip: 0 },
      { x: -300, s: 0.75, tip: 2 }, { x: -60, s: 0.9, tip: 1 }, { x: 260, s: 1.0, tip: 0 }, { x: 520, s: 0.8, tip: 2 },
      { x: 760, s: 0.95, tip: 1 }, { x: 1080, s: 1.0, tip: 0 }, { x: 1340, s: 0.85, tip: 1 },
    ];
    otlar = { renk: [Y.otOge(230, 3, false), Y.otOge(190, 8, false)], kuru: [Y.otOge(230, 3, true), Y.otOge(190, 8, true)], tas: tasOge(110, 21) };

    renkTuval = tuval(W, H);
    adamTuval = tuval(W, H);
  },

  ciz(ctx, t) {
    const cam = kameraAl(t);
    const d = cam.d;
    const Fc = CEPHE(t);
    const tamRenk = Fc + SUP_EN / 2 < -SUP_EGIM * 960 - 10;
    const tamGri = Fc - SUP_EN / 2 > W + SUP_EGIM * 960 + 10;
    const durum = { cam, d, gogus: null };
    if (tamRenk) dunya(ctx, t, durum, false);
    else if (tamGri) dunya(ctx, t, durum, true);
    else {
      dunya(ctx, t, durum, true);
      const rc = renkTuval.getContext('2d');
      rc.setTransform(1, 0, 0, 1, 0, 0);
      rc.globalCompositeOperation = 'source-over';
      rc.globalAlpha = 1;
      rc.clearRect(0, 0, W, H);
      dunya(rc, t, durum, false);
      // süpürme maskesi: solda gri, sağda renk; eğik ve yumuşak sınır
      const k = SUP_EN / (1 + SUP_EGIM * SUP_EGIM);
      const x0 = Fc - SUP_EN / 2;
      const g = rc.createLinearGradient(x0, 960, x0 + k, 960 - k * SUP_EGIM);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.5, 'rgba(0,0,0,0.5)');
      g.addColorStop(1, 'rgba(0,0,0,1)');
      rc.globalCompositeOperation = 'destination-in';
      rc.fillStyle = g;
      rc.fillRect(0, 0, W, H);
      rc.globalCompositeOperation = 'source-over';
      ctx.drawImage(renkTuval, 0, 0);
    }
    gogusIsigi(ctx, t, durum);
  },
};

// ---------------------------------------------------------------- dünya (renkli ya da gri geçiş)
function dunya(g, t, durum, gri) {
  const { cam, d } = durum;
  const solma = an(t, T.hakiki, 2.6, ease.inOutSine); // ışığın çekilmesi

  // gök
  kameraIle(g, cam, (c) => {
    if (gri) ogeCiz(c, gokG, -820, -380);
    else ogeCiz(c, gokR, -420, -320);
  }, F.gok);

  if (!gri) {
    // nur ve beyaz bulutlar
    kameraIle(g, cam, (c) => {
      const guc = 1 - 0.75 * solma;
      M.nurKuresi(c, ISIK.x, ISIK.y, ISIK.r, t, { guc, olcek: 1.2 });
    }, F.isik);
    kameraIle(g, cam, (c) => {
      for (const [b, x, y] of bulutlarR) ogeCiz(c, b, x + (t - 57) * 5, y);
    }, F.bulut);
  } else {
    kameraIle(g, cam, (c) => {
      for (const b of agirlar) {
        const u = an(t, b.t0, b.alcak ? 1.3 : 2.4, ease.outCubic);
        if (u <= 0) continue;
        const x = b.x + (b.dx || 0) * (1 - u) - (t - 57) * 9;
        const y = b.y + (b.dy || 0) * (1 - u);
        ogeCiz(c, b.o, x, y, { alfa: clamp(u * 1.4) });
      }
    }, F.bulut);
  }

  // uzak dağlar (yalnız sağda; solda ufuk düz ve sonsuz kalır)
  kameraIle(g, cam, (c) => ogeCiz(c, gri ? dagG : dagR, 0, 0), F.dag);

  // uzak sırtlar
  kameraIle(g, cam, (c) => {
    ogeCiz(c, gri ? uzakG : uzakR, 0, 0);
    if (gri) {
      for (const [x, s] of [[-470, 0.38], [-230, 0.3], [-760, 0.33], [-610, 0.22], [-340, 0.18], [-905, 0.26]]) ogeCiz(c, uzakKuru, x, pUzak(x) + 8, { s });
    }
  }, F.uzak);
  if (gri) kameraIle(g, cam, (c) => sisCiz(c, sisU, 1000, t * 10, 0.85), F.sisU);

  // orta sırtlar ve küçük ağaçlar
  kameraIle(g, cam, (c) => {
    ogeCiz(c, gri ? ortaG : ortaR, 0, 0);
    for (const x of [600, 1000, 1330]) ogeCiz(c, gri ? kucukAgacG : kucukAgacR, x, pOrta(x) + 14, { s: x === 1000 ? 0.85 : 1 });
    if (gri) {
      ogeCiz(c, kuruAgac, -540, pOrta(-540) + 18, { s: 1 });
      ogeCiz(c, calilar[1], -380, pOrta(-380) + 24, { s: 0.7 });
      ogeCiz(c, calilar[3], -930, pOrta(-930) + 24, { s: 0.75 });
      ogeCiz(c, taslar[3], -420, pOrta(-420) + 30, { s: 0.8 });
    }
  }, F.orta);
  if (gri) kameraIle(g, cam, (c) => sisCiz(c, sisO, 1130, -t * 14, 0.7), F.sisO);

  // ön zemin, ağaç, çiçekler, çalı ve taşlar
  kameraIle(g, cam, (c) => {
    ogeCiz(c, gri ? onG : onR, 0, 0);
    const agacSis = gri ? an(t, 60.3, 2.4, ease.inOutSine) : 0; // geride kalan ağaç ve nura giden yol sise gömülür
    ogeCiz(c, gri ? yolG : yolR, 0, 0, { alfa: 1 - 0.72 * agacSis });
    ogeCiz(c, gri ? agacG : agacR, AGAC.x, AGAC.y, { r: Math.sin(t * 0.9) * 0.004, alfa: 1 - 0.82 * agacSis });
    if (agacSis > 0) {
      c.save();
      c.globalAlpha = 0.75 * agacSis;
      c.drawImage(sisBlob, AGAC.x - 560 + (t - 60) * 14, AGAC.y - 760);
      c.restore();
    }
    for (const cc of gri ? cicekG : cicekR) {
      if (gri && cc.x < 160) continue; // çorak ovada çiçek kalmaz
      const egil = gri ? 0.5 + 0.2 * Math.sin(cc.faz) : 0;
      ogeCiz(c, cc.oge, cc.x, cc.y, { s: cc.s * (gri ? 0.9 : 1), sy: cc.s * (gri ? 0.7 : 1), r: (gri ? egil * (cc.faz > 3 ? 1 : -1) : 0) + Math.sin(t * 1.3 + cc.faz) * 0.04 });
    }
    if (gri) {
      ogeCiz(c, calilar[0], 120, 1268, { s: 1 });
      ogeCiz(c, calilar[2], -610, 1262, { s: 1.05 });
      ogeCiz(c, calilar[3], -1010, 1276, { s: 1.1 });
      ogeCiz(c, taslar[0], -260, 1290, { s: 1 });
      ogeCiz(c, taslar[1], -840, 1270, { s: 1 });
      ogeCiz(c, taslar[2], 330, 1262, { s: 0.9 });
    }
  }, F.on);

  if (gri) {
    // kuruntu gölgeleri (adamın ardında, sisin içinde)
    kameraIle(g, cam, (c) => golgeCiz(c, t), F.golge);
    kameraIle(g, cam, (c) => {
      ruzgarCiz(c, t);
      dikenler(c, t, d, -1);
      seritler(c, t, -1, d.X);
      yagmurCiz(c, t, 0);
    }, F.on);
  }

  // adam
  if (gri) {
    const [px, py] = ekranda(cam, d.X, ZEMIN);
    const h = 384 * S * cam.z;
    const bx = Math.max(0, Math.floor(px - h * 0.75)), by = Math.max(0, Math.floor(py - h * 1.2));
    const bw = Math.min(W, Math.ceil(px + h * 0.75)) - bx, bh = Math.min(H, Math.ceil(py + h * 0.2)) - by;
    if (bw > 0 && bh > 0) {
      const ac = adamTuval.getContext('2d');
      ac.setTransform(1, 0, 0, 1, 0, 0);
      ac.clearRect(bx, by, bw, bh);
      kameraIle(ac, cam, (c) => { durum.gogus = adamCiz(c, d); }, F.on);
      g.save();
      g.filter = 'saturate(0.34) brightness(0.97)';
      g.drawImage(adamTuval, bx, by, bw, bh, bx, by, bw, bh);
      g.filter = 'none';
      g.restore();
    }
    kameraIle(g, cam, (c) => {
      dikenler(c, t, d, 1);
      seritler(c, t, 1, d.X);
      gogusBulutu(c, t, durum);
      yagmurCiz(c, t, 1);
    }, F.on);
    onPlanCiz(g, cam, true);
    renkAyari(g, t);
  } else {
    kameraIle(g, cam, (c) => { durum.gogus = adamCiz(c, d); }, F.on);
    // nur huzmesi: ağacın ve adamın ilk durduğu yere iner
    const guc = 1 - solma;
    if (guc > 0.01) {
      const [zx, zy] = ekranda(cam, X0 + 10, ZEMIN + 10, F.on);
      const ix = zx + 70 * cam.z, iy = -120;
      const L = Math.hypot(zx - ix, zy - iy);
      g.save();
      g.globalCompositeOperation = 'screen';
      g.globalAlpha = 0.42 * guc;
      g.translate(ix, iy);
      g.rotate(Math.atan2(zx - ix, zy - iy) * -1);
      g.scale(0.75 * cam.z, L / 960);
      g.drawImage(huzme, -210, -40);
      g.restore();
      // huzmede süzülen zerreler
      const r = rng(55);
      g.save();
      g.globalCompositeOperation = 'screen';
      for (let i = 0; i < 16; i++) {
        const v = (r() + (t - 57) * r.ara(0.04, 0.09)) % 1;
        const yan = r.ara(-0.5, 0.5);
        const x = lerp(ix, zx, v) + yan * lerp(50, 300, v) * cam.z + Math.sin(t * 1.3 + i) * 8;
        const y = lerp(iy, zy, v);
        const a = 0.75 * guc * Math.sin(v * Math.PI);
        const b = r.ara(2.2, 4.5) * cam.z;
        const gr = g.createRadialGradient(x, y, 0, x, y, b * 3);
        gr.addColorStop(0, rgba('#FFF4C8', a));
        gr.addColorStop(1, rgba('#FFF4C8', 0));
        g.fillStyle = gr;
        g.fillRect(x - b * 3, y - b * 3, b * 6, b * 6);
      }
      g.restore();
    }
    onPlanCiz(g, cam, false);
  }
}

/** ön plan: yatayda paralaksla kayan, dikeyde alt kenara bağlı otlar/taşlar (altyazı bandının altında kalır) */
function onPlanCiz(g, cam, gri) {
  const f = 1.3;
  const zf = Math.pow(cam.z, 0.45);
  const merkez = 540 + (cam.x - 540) * f;
  for (const o of onPlan) {
    const x = 540 + (o.x - merkez) * zf * 1.05;
    if (x < -260 || x > W + 260) continue;
    const y = H + 12 + (1 - zf) * 30;
    if (o.tip === 2) ogeCiz(g, otlar.tas, x, y + 10, { s: o.s * zf });
    else ogeCiz(g, (gri ? otlar.kuru : otlar.renk)[o.tip], x, y, { s: o.s * zf, r: Math.sin(o.x + cam.x * 0.002) * 0.03 });
  }
}

function sisCiz(c, tv, y, kay, alfa) {
  const w = tv.width;
  const x0 = (((kay % w) + w) % w) - w - 900;
  c.save();
  c.globalAlpha = alfa;
  for (let x = x0; x < 2200; x += w) c.drawImage(tv, x, y - tv.height / 2);
  c.restore();
}

/** gri dünyanın genel ışığı: loşlaşma ve kenar kararması (siyaha gitmez) */
function renkAyari(g, t) {
  const los = an(t, 60.2, 7.2, ease.inOutSine);
  const c = renkKaristir('#F6F4F8', '#D9D4E0', los);
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
  g.fillRect(-50, -50, W + 100, H + 100);
  const rg = g.createRadialGradient(W / 2, H * 0.48, H * 0.3, W / 2, H * 0.5, H * 0.75);
  rg.addColorStop(0, 'rgba(255,255,255,1)');
  rg.addColorStop(1, rgba(renkKaristir('#E6E2EC', '#C9C3D2', los), 1));
  g.fillStyle = rg;
  g.fillRect(-50, -50, W + 100, H + 100);
  g.restore();
}

// ---------------------------------------------------------------- göğüsteki sıcak ışık ("sevmeyen"de söner)
const gIsik = gurultu2(41);
function gogusIsigi(ctx, t, durum) {
  const { cam, d } = durum;
  if (!durum.gogus || d.mod === 'arka' || t > T.sevmeyen + 2) return;
  const sonum = 1 - an(t, T.sevmeyen + 0.05, 0.62, ease.inQuad);
  const titre = t > T.sevmeyen ? clamp(0.55 + 0.75 * gIsik(t * 14, 0.3)) * (Math.sin(t * 47) > 0.55 ? 0.35 : 1) : 1;
  const guc = sonum * titre * (0.92 + 0.08 * Math.sin(t * 3.1));
  const [gx, gy] = durum.gogus;
  kameraIle(ctx, cam, (c) => {
    // yandan: ışık göğsün önünde (adamın baktığı yana kaymış)
    const x = gx + d.yon * 9 * S, y = gy - 4;
    if (guc > 0.01) {
      M.hale(c, x, y, 110, '#FFE9B0', 0.5 * guc);
      M.hale(c, x, y, 36, '#F2BE55', 0.6 * guc, 'source-over');
      M.isinlar(c, x, y, 15, 44, t, { sayi: 12, alfa: 0.5 * guc, kal: 1.7, renk: '#E2AE3E', tohum: 5, hiz: 0.3 });
      M.hale(c, x, y, 15, '#FFF9E6', 0.95 * guc, 'source-over');
    }
    // sönüşten sonra yükselen ince gri duman
    const du = clamp((t - T.sevmeyen - 0.62) / 1.2);
    if (du > 0 && du < 1) {
      c.save();
      for (let k = 0; k < 3; k++) {
        const pts = [];
        for (let i = 0; i <= 14; i++) {
          const v = i / 14;
          const yy = y - (12 + 70 * du) * v - 30 * du;
          pts.push([x + Math.sin(v * 5 + t * 2.4 + k * 2) * (4 + 10 * v) + k * 3 - 3, yy]);
        }
        c.fillStyle = rgba('#8A8396', 0.4 * Math.sin(du * Math.PI));
        darbe(c, pts, 2.2, { incelme: 0.45 });
      }
      c.restore();
    }
  }, F.on);
}

// ---------------------------------------------------------------- gölgeler, şeritler, dikenler, yağmur
// Kalabalığı açmak için fikirler sırayla öne çıkar: evhamda gölgeler ve dönen sis; "manen"de göğüsteki bulut girerken
// gölgeler sise çekilir, dönen sis dağılır; "maddeten"de yağmur bulutu girerken gölgeler iyice söner, göğüs bulutu
// sakinleşir; "müptela"da yalnız adam, yağmur ve ıssızlık kalır.
function golgeEvre(t, gl) {
  const giris = an(t, gl.t0, 1.05, ease.outCubic);
  const sakin = lerp(1, 0.55, an(t, T.manen - 0.1, 0.75, ease.inOutSine)) * lerp(1, 0.42, an(t, T.maddeten - 0.06, 0.75, ease.inOutSine));
  const son = 1 - an(t, T.muptela - 0.1, 1.3, ease.inOutSine);
  return { giris, cek: 1 - sakin * son, varlik: giris * sakin * son };
}
/** evham: sisten yükselip adama doğru eğilen uzun gölgeler (adamın ardında); tabanları yerdeki sis kuşağına karışır */
function golgeCiz(c, t) {
  let enCok = 0;
  for (const gl of golgeler) {
    const { giris, cek, varlik } = golgeEvre(t, gl);
    if (varlik <= 0.003) continue;
    enCok = Math.max(enCok, varlik);
    const a = (gl.uzak ? 0.5 : 0.95) * varlik;
    const w = 0.42 * (t - gl.t0) + gl.faz;
    // çekilirken biraz dışarı ve geriye kayar, sise çöker
    const x = XDUR + gl.dx * (1 + 0.12 * cek) + Math.sin(w) * gl.R;
    const y = ZEMIN + gl.dy + 26 * cek;
    const nefes = 1 + 0.025 * Math.sin(t * 1.3 + gl.faz);
    const sy = (0.42 + 0.58 * ease.outCubic(giris)) * nefes * (1 - 0.22 * cek);
    const sx = (0.86 + 0.14 * giris) / nefes;
    // yükselirken adama doğru eğilir, salınır; çekilirken doğrulur
    const egil = gl.yon * (0.015 + 0.05 * an(t, gl.t0 + 0.35, 1.4, ease.inOutSine)) * (1 - 0.6 * cek) + 0.022 * Math.sin(w * 1.3);
    ogeCiz(c, gl.o, x, y, { sx, sy, r: egil, alfa: a });
  }
  if (enCok > 0.003) sisCiz(c, golgeSis, ZEMIN - 34, 40 + t * 12, 0.7 * enCok);
}

const SERIT = [
  { a: 230, b: 34, dy: -95, w: 0.95, f0: 0.4, span: 1.4, kal: 4.4 },
  { a: 285, b: 44, dy: -175, w: -0.78, f0: 2.6, span: 1.2, kal: 5.0 },
  { a: 205, b: 30, dy: -258, w: 1.1, f0: 4.4, span: 1.05, kal: 3.8 },
];
/** evham: adamın çevresinde dönen koyu sis şeritleri (taraf: -1 arkadaki yarı, 1 öndeki yarı) */
function seritler(c, t, taraf, cx) {
  for (let i = 0; i < SERIT.length; i++) {
    const s = SERIT[i];
    const u = an(t, T.evham + 0.25 + i * 0.12, 0.8, ease.outCubic) * (1 - an(t, T.manen - 0.16 + i * 0.05, 0.62, ease.inOutSine));
    if (u <= 0.003) continue;
    const ac = 1.6 - 0.6 * u; // dışarıdan daralarak yaklaşır
    const A = s.a * ac, B = s.b * ac;
    const cy = ZEMIN + s.dy * S;
    const th0 = s.f0 + s.w * (t - T.evham - 0.25);
    for (let k = 0; k < 4; k++) {
      const off = (k - 1.5) * 7;
      const span = s.span * (0.7 + 0.3 * ((k * 37) % 5) / 5);
      const st = th0 + k * 0.12;
      let parca = [];
      const bitir = () => {
        if (parca.length > 2) {
          // öndeki yarı biraz daha açık (figürün önünde ağırlık yapmasın)
          c.fillStyle = rgba('#4E4760', (0.21 + 0.07 * (k % 2)) * u * (taraf > 0 ? 0.75 : 1));
          darbe(c, parca, s.kal * (0.75 + 0.15 * k), { incelme: 0.42, sivri: 0.5 });
        }
        parca = [];
      };
      for (let j = 0; j <= 24; j++) {
        const th = st + (span * j) / 24;
        const on = Math.sin(th) > 0 ? 1 : -1;
        const px = cx + A * Math.cos(th);
        // öndeki yarı adamın önünden geçerken kesilir (kalemde kayıp çizgi): figür okunur kalsın
        if (on !== taraf || (taraf > 0 && Math.abs(px - cx) < 34)) { bitir(); continue; }
        parca.push([px, cy + B * Math.sin(th) + off]);
      }
      bitir();
    }
  }
}

/** âlâm: zeminden fışkıran dikenli dallar ve bacaklara dolanan sarmallar */
function dikenler(c, t, d, taraf) {
  if (t < T.alam - 0.02) return;
  // zeminden
  for (const dl of onDallar) {
    if ((dl.dz > 0 ? 1 : -1) !== taraf) continue;
    const u = an(t, dl.t0, dl.sure, ease.outCubic);
    if (u <= 0) continue;
    const tr = ([x, y]) => [XDUR + dl.dx + x * S, ZEMIN + dl.dz + y * S];
    Y.dikenliDal(c, dl.pts.map(tr), u, { k0: 6.2 * S, k1: 1.4, aralik: 13, dikenBoy: 7.5, faz: dl.faz });
    for (const al of dl.dallar) {
      const us = clamp((u - al.f) / (1 - al.f));
      if (us > 0) Y.dikenliDal(c, al.pts.map(tr), us, { k0: 3.8 * S, k1: 1.2, aralik: 12, dikenBoy: 6.5, faz: 1 - dl.faz });
    }
  }
  // sarmallar: ön bacak (iki yarı) ve arka bacak (yalnız arkada)
  const bacaklar = [
    { i: 1, t0: T.alam + 0.16, tur: 2.4, oran: 0.66, r0: 22, r1: 27, faz: 0.6 },
    { i: 0, t0: T.alam + 0.26, tur: 1.8, oran: 0.45, r0: 22, r1: 25, faz: 2.2 },
  ];
  for (const b of bacaklar) {
    const u = an(t, b.t0, 0.95, ease.outCubic);
    if (u <= 0) continue;
    if (b.i === 0 && taraf === 1) continue;
    const zin = bacakZinciri(d, b.i, b.oran);
    const sp = Y.sarmal(zin, { tur: b.tur, r0: b.r0 * S, r1: b.r1 * S, faz: b.faz, adim: 2.5 });
    sarmalCiz(c, sp, u, taraf, b.i === 0);
  }
}
function sarmalCiz(c, sp, u, taraf, hepsi) {
  const s = [0];
  for (let i = 1; i < sp.length; i++) s.push(s[i - 1] + Math.hypot(sp[i].x - sp[i - 1].x, sp[i].y - sp[i - 1].y));
  const L = s[s.length - 1], Lb = L * u;
  const k0 = 5.6 * S, k1 = 1.6;
  let i = 0;
  while (i < sp.length - 1) {
    const yan = sp[i].on > 0 ? 1 : -1;
    let j = i;
    while (j < sp.length - 1 && (sp[j + 1].on > 0 ? 1 : -1) === yan) j++;
    if (s[i] >= Lb) break;
    if (hepsi || yan === taraf) {
      const pts = [];
      for (let k = i; k <= Math.min(j + 1, sp.length - 1); k++) {
        if (s[k] > Lb) {
          const v = (Lb - s[k - 1]) / (s[k] - s[k - 1] || 1);
          pts.push([lerp(sp[k - 1].x, sp[k].x, v), lerp(sp[k - 1].y, sp[k].y, v)]);
          break;
        }
        pts.push([sp[k].x, sp[k].y]);
      }
      if (pts.length > 1) {
        const a0 = s[i] / L, a1 = Math.min(s[Math.min(j + 1, sp.length - 1)], Lb) / L;
        const renk = yan > 0 ? '#463C47' : '#5A505C';
        Y.dalCiz(c, pts, lerp(k0, k1, a0), lerp(k0, k1, a1), renk, yan > 0 ? '#8E8290' : null);
        if (yan > 0) {
          // dikenler
          let ps = 0, yon = 1;
          for (let k = 1; k < pts.length; k++) {
            const dx = pts[k][0] - pts[k - 1][0], dy = pts[k][1] - pts[k - 1][1];
            const l = Math.hypot(dx, dy) || 1;
            ps += l;
            if (ps > 11) {
              ps = 0;
              Y.dikenCiz(c, pts[k][0], pts[k][1], dx / l, dy / l, yon, 7 * lerp(1, 0.7, a0), renk);
              yon = -yon;
            }
          }
        }
      }
    }
    i = j + 1;
  }
}

/** manen: göğüste koyu, taralı küçük bir bulut ve çevresinde dönen birkaç kalem kıvrımı ("maddeten"de sakinleşir) */
function gogusBulutu(c, t, durum) {
  const u = pop(t, T.manen, 0.7);
  if (u <= 0 || !durum.gogus) return;
  const [gx, gy] = durum.gogus;
  const d = durum.d;
  const x = gx + d.yon * 8 * S, y = gy - 2;
  const sakin = 1 - 0.28 * an(t, T.maddeten + 0.1, 0.7, ease.inOutSine) - 0.4 * an(t, T.muptela + 0.5, 1.1, ease.inOutSine);
  const R = 30 * u * (0.85 + 0.15 * sakin);
  // hafif koyu buğu (leke değil: küçük ve saydam)
  c.save();
  c.globalCompositeOperation = 'multiply';
  const rg = c.createRadialGradient(x, y, 0, x, y, R * 1.7);
  rg.addColorStop(0, rgba('#8A829C', 0.5 * sakin));
  rg.addColorStop(1, rgba('#8A829C', 0));
  c.fillStyle = rg;
  c.fillRect(x - R * 1.7, y - R * 1.7, R * 3.4, R * 3.4);
  c.restore();
  ogeCiz(c, kucukBulut, x + Math.sin(t * 1.7) * 1.5, y + 2, { s: 0.72 * u * (0.85 + 0.15 * sakin), r: Math.sin(t * 1.1) * 0.05, alfa: 0.94 * clamp(sakin * 1.25 - 0.1) });
  // bulutun üstünden kopup kıvrılan iki kısa kalem yayı (dönen, huzursuz)
  for (let k = 0; k < 2; k++) {
    const a0 = t * (1.4 + k * 0.35) * (k ? -1 : 1) + k * 2.6;
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const v = i / 14;
      const a = a0 + v * 1.5;
      const rr = R * (1.05 + 0.25 * v);
      pts.push([x + Math.cos(a) * rr, y - 4 + Math.sin(a) * rr * 0.7]);
    }
    c.fillStyle = rgba('#3E3749', 0.42 * sakin * u);
    darbe(c, pts, 1.8, { incelme: 0.45 });
  }
}

/** şakavet: ovada esen rüzgâr: uzun, ince kalem çizgileri ve savrulan kuru yaprak kırıntıları (gri dünya) */
function ruzgarCiz(c, t) {
  const zarf0 = an(t, T.sakavet - 0.3, 0.8) * (1 - an(t, T.alam + 0.1, 0.9, ease.inOutSine));
  if (zarf0 <= 0) return;
  const r = rng(808);
  for (let i = 0; i < 9; i++) {
    const y = r.ara(1120, 1300), hiz = r.ara(320, 470), faz = r(), L = r.ara(120, 230);
    const yol = 1900;
    const x = XDUR + 700 - ((t * hiz + faz * yol) % yol);
    const a = 0.22 * zarf0 * Math.sin(clamp((XDUR + 700 - x) / yol) * Math.PI);
    if (a <= 0.01) continue;
    const pts = [];
    for (let k = 0; k <= 16; k++) {
      const v = k / 16;
      pts.push([x + v * L, y + Math.sin(v * 5 + t * 3 + i) * 5 - (v > 0.7 ? (v - 0.7) * 30 : 0)]);
    }
    c.fillStyle = rgba('#5E5670', a);
    darbe(c, pts, 1.8, { incelme: 0.45 });
  }
  for (let i = 0; i < 7; i++) {
    const hiz = r.ara(260, 400), faz = r(), y0 = r.ara(1180, 1310);
    const yol = 1900;
    const x = XDUR + 700 - ((t * hiz + faz * yol) % yol);
    const y = y0 - Math.abs(Math.sin(t * 4 + i * 2)) * 22;
    const a = 0.7 * zarf0 * Math.sin(clamp((XDUR + 700 - x) / yol) * Math.PI);
    if (a <= 0.01) continue;
    c.save();
    c.translate(x, y);
    c.rotate(t * 6 + i);
    c.fillStyle = rgba('#5A5163', a);
    c.beginPath();
    c.ellipse(0, 0, 5, 2.2, 0, 0, TAU);
    c.fill();
    c.restore();
  }
}

/** maddeten: üstüne çöken ağır bulut ve yağmur (katman 0: arkadaki damlalar, 1: öndekiler + bulut) */
function yagmurCiz(c, t, katman) {
  const u = an(t, T.maddeten - 0.02, 0.7, ease.outCubic);
  if (u <= 0) return;
  const bx = XDUR + 6, by = ZEMIN - 384 * S - 165 + (1 - u) * -520;
  const ya = an(t, T.maddeten + 0.18, 0.45);
  const son = 1 - 0.3 * an(t, 66.6, 1.0);
  if (ya > 0) {
    Y.yagmur(c, bx - 250, bx + 250, by + 30, ZEMIN, t, { sayi: 60, tohum: katman ? 71 : 72, alfa: 0.5 * ya * son, renk: '#5D6A88', hiz: 1500, egim: 0.14, sicrama: true });
  }
  if (katman === 1) ogeCiz(c, yagmurBulutu, bx, by, { alfa: clamp(u * 1.3) });
}
