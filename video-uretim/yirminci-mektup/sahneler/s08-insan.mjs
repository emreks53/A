// s08 insan yardımcıları (motor/insan.mjs'in üstüne kurulur, onu değiştirmez):
//  - kin(poz): insanYan ile aynı kinematikle eklem konumları (kalça, diz, bilek), zipla = 0 için
//  - yereOturt(poz): bedenin en alçak temas noktası (ayak tabanı, diz, kalça) zemine (y = 0) oturacak şekilde zipla
//    hesaplar; ayakta, diz çökmüş ve yere oturmuş pozlar arasında karıştırınca beden yerçekimiyle doğal iner/kalkar.
//  - adimPozu(faz): ayak kaymayan yürüyüş döngüsü (basma evresinde ayak düz ve bacak geriye süpürülür, salınımda diz
//    bükülür). Gövdenin x'i önceden "basan ayağa kilitlenerek" tümlenir (yuruyenPlan), böylece basan ayak yerinde kalır.
//  - pozlar: DIZ_COK (diz çökmüş, çökük), BUZUL (yere büzülmüş oturuş), SIPER (kolunu yüzüne siper eder), TAHT (tahtta).
import { OLCU, DURUS, pozKaristir } from '../motor/insan.mjs';
import { clamp, lerp, TAU, rng } from '../motor/temel.mjs';

const KX = [-3, 3];

/** insanYan kinematiği (zipla = 0, serbest): kalça, dizler, bilekler (yerel; yukarı -y) */
export function kin(poz) {
  const p = { ...DURUS, ...poz };
  const hy = -OLCU.kalca;
  const bacak = (i) => {
    const a1 = p.kalca[i];
    const hx = KX[i];
    const diz = [hx + Math.sin(a1) * OLCU.uyluk, hy + Math.cos(a1) * OLCU.uyluk];
    const a2 = a1 + p.diz[i];
    const bilek = [diz[0] + Math.sin(a2) * OLCU.baldir, diz[1] + Math.cos(a2) * OLCU.baldir];
    return { diz, bilek, a1, a2, a3: a2 + p.bilek[i] };
  };
  return { kalca: [0, hy], b: [bacak(0), bacak(1)] };
}

/** En alçak temas noktası zemine (y = 0) otursun: serbest poz + zipla */
export function yereOturt(poz, { kalcaTemas = 16, dizTemas = 13, ayakTemas = 12 } = {}) {
  const k = kin(poz);
  let m = k.kalca[1] + kalcaTemas;
  for (const b of k.b) {
    m = Math.max(m, b.diz[1] + dizTemas, b.bilek[1] + ayakTemas);
    // ayak burnu (ayak öne uzanır; burnu aşağı dönükse temas eder)
    const uc = [b.bilek[0] + Math.cos(b.a3) * 34, b.bilek[1] - Math.sin(b.a3) * 34];
    m = Math.max(m, uc[1] + 6);
  }
  return { ...DURUS, ...poz, serbest: true, zipla: m };
}

// ---------------------------------------------------------------- pozlar (açılar radyan, insanYan kuralları)
// diz çökmüş: dizler yerde, baldırlar geriye yatık, gövde öne çökük, baş eğik, kollar sarkık
export const DIZ_COK = {
  govde: 0.3, bas: 0.55, kalca: [0.22, 0.32], diz: [-1.92, -2.0], bilek: [-1.15, -1.1],
  omuz: [0.12, 0.22], dirsek: [0.15, 0.25], el: [0, 0],
};
// yere büzülmüş: dizler göğse çekili, kollar bacaklara dolanmış, baş dizlerin üstüne eğik
export const BUZUL = {
  govde: 0.42, bas: 0.62, kalca: [2.32, 2.42], diz: [-2.2, -2.3], bilek: [-0.12, -0.12],
  omuz: [-0.42, -0.5], dirsek: [1.7, 1.82], el: [0.2, 0.2],
};
// siper: rüzgâra karşı öne eğilmiş, ön kol yüzüne siper, arka kol gövdeye
export const SIPER = {
  govde: 0.16, bas: 0.28, kalca: [-0.2, 0.22], diz: [-0.08, -0.14], bilek: [0.27, -0.08],
  omuz: [0.05, 1.45], dirsek: [1.75, 2.35], el: [0.4, 0.5],
};
// tahtta: dik oturuş, uyluklar yatay, baldırlar dik, baş kalkık, eller dizlerde
export const TAHT = {
  govde: -0.04, bas: -0.16, kalca: [1.5, 1.58], diz: [-1.48, -1.52], bilek: [-0.02, -0.06],
  omuz: [0.16, 0.26], dirsek: [0.82, 0.74], el: [0.35, 0.35],
};
// ayakta, omuzları düşük
export const AYAKTA = { ...DURUS, govde: 0.06, bas: 0.18, omuz: [-0.02, 0.04], dirsek: [0.1, 0.12] };

export { pozKaristir };

// ---------------------------------------------------------------- ayak kaymayan yürüyüş
// Ayak yörüngesi kalçaya göre kartezyen tanımlanır, açılar iki eklemli ters kinematikle bulunur:
//  basma (oran BETA): bilek zeminde, kalçaya göre +X'ten -X'e sabit hızla geriye gider (gövde sabit hızla ilerler);
//  salınım: bilek kavisle (yükseklik YUK) öne gelir, sıfır hızla iner.
const BETA = 0.56; // basma evresi oranı
const ADIM_X = 62; // basmada bileğin kalçaya göre yatay genliği
const DY = 171; // basma başı/sonunda kalça-bilek dikey uzaklığı (ortada biraz daha yüksek)
const YUK = 30; // salınımda ayak yüksekliği
const L1 = OLCU.uyluk, L2 = OLCU.baldir;
function ik(dx, dy) {
  const d = Math.min(Math.hypot(dx, dy), L1 + L2 - 0.5);
  const phi = Math.atan2(dx, dy);
  const al = Math.acos(clamp(d / (2 * L1), -1, 1));
  return { a1: phi + al, a2: phi - al };
}
function bacakFaz(u) {
  u = ((u % 1) + 1) % 1;
  let dx, dy, a3;
  if (u < BETA) {
    const s = u / BETA;
    dx = ADIM_X * (1 - 2 * s);
    dy = DY + 5 * Math.sin(Math.PI * s);
    a3 = 0;
  } else {
    const w = (u - BETA) / (1 - BETA);
    const e = w * w * (3 - 2 * w);
    dx = -ADIM_X + 2 * ADIM_X * (0.15 * w + 0.85 * e);
    dy = DY - YUK * Math.pow(Math.sin(Math.PI * w), 0.85);
    a3 = -0.28 * Math.sin(Math.PI * w);
  }
  const { a1, a2 } = ik(dx, dy);
  return { kalca: a1, diz: a2 - a1, bilek: a3 - a2, dx };
}
/** Yürüyüş pozu: faz radyan (bir döngü 2π, iki adım). Ön bacak faz, arka bacak faz + π */
export function adimPozu(faz) {
  const u = faz / TAU;
  const on = bacakFaz(u), arka = bacakFaz(u + 0.5);
  return {
    govde: 0.05, bas: 0.03,
    kalca: [arka.kalca, on.kalca],
    diz: [arka.diz, on.diz],
    bilek: [arka.bilek, on.bilek],
    omuz: [-0.32 * (on.dx / ADIM_X), -0.32 * (arka.dx / ADIM_X)],
    dirsek: [0.22 + 0.16 * Math.max(0, on.dx / ADIM_X), 0.22 + 0.16 * Math.max(0, arka.dx / ADIM_X)],
    zipla: 0, el: [0, 0],
  };
}
/** Bir döngüde (iki adım) alınan yol, s = 1 */
export const ADIM_DONGU = (2 * ADIM_X) / BETA;

/** Basan (en alçak) ayağın yerel x'i: poz zemine oturtulmuş olarak */
function basanAyakX(poz) {
  const k = kin(poz);
  const [b0, b1] = k.b;
  return b0.bilek[1] >= b1.bilek[1] ? { i: 0, x: b0.bilek[0] } : { i: 1, x: b1.bilek[0] };
}

/**
 * Yürüyen figür planı. bolumler: [{ tur: 'yuru'|'dur'|'don', sure, hiz? (döngü/sn) }]. Başlangıç: x0, yon.
 * Örneklenmiş zaman çizelgesi üretir; plan(t) → { x, k (yatay ölçek: yön × dönüş basıklığı), poz }.
 * Gövde x'i, basan ayağın yerel x değişimiyle ters yönde tümlenir: ayak zeminde kaymaz.
 */
export function yuruyenPlan({ t0, x0, yon = 1, s = 1, bolumler, hz = 240 }) {
  // bölümleri mutlak zamana yerleştir; her bölümün başındaki yön
  let tt = t0, yy = yon;
  const B = bolumler.map((b) => {
    const o = { ...b, t0: tt, t1: tt + b.sure, yon: yy };
    tt += b.sure;
    if (b.tur === 'don') yy = -yy;
    return o;
  });
  const tSon = tt;
  const N = Math.ceil((tSon - t0) * hz) + 2;
  const xs = new Float32Array(N), fz = new Float32Array(N), ws = new Float32Array(N), ks = new Float32Array(N);
  let x = x0, faz = 0, oncekiB = null;
  let onceki = null;
  const pozAl = (faz, w) => (w <= 0 ? DURUS : w >= 1 ? adimPozu(faz) : pozKaristir(DURUS, adimPozu(faz), w));
  for (let n = 0; n < N; n++) {
    const t = t0 + n / hz;
    const b = B.find((q) => t < q.t1) || B[B.length - 1];
    if (b !== oncekiB) { faz = 0; oncekiB = b; }
    let w = 0, k = b.yon;
    if (b.tur === 'yuru') {
      faz = TAU * (b.hiz ?? 1) * Math.max(0, t - b.t0);
      const gir = clamp((t - b.t0) / 0.22), cik = clamp((b.t1 - t) / 0.22);
      w = Math.min(gir, cik);
      w = w * w * (3 - 2 * w);
    } else if (b.tur === 'don') {
      // dönüş: yatay basıklıkla (en dar 0,32; ortada yön sıçrar, figür çizgiye inmez)
      const u = clamp((t - b.t0) / b.sure);
      const c = Math.cos(Math.PI * u);
      k = b.yon * (c >= 0 ? 1 : -1) * Math.max(0.32, Math.abs(c));
    }
    const poz = pozAl(faz, w);
    const yonS = k >= 0 ? 1 : -1;
    if (onceki) {
      const a = basanAyakX(onceki.poz);
      const bn = kin(poz).b[a.i].bilek[0];
      // aynı ayağın yerel x değişimi kadar gövde ters yönde ilerler (yön çevrilirken ayak yerinde döner)
      if (onceki.yon === yonS) x -= (bn - a.x) * s * yonS;
    }
    xs[n] = x; fz[n] = faz; ws[n] = w; ks[n] = k;
    onceki = { poz, yon: yonS };
  }
  const plan = (t) => {
    const f = clamp((t - t0) * hz, 0, N - 1);
    const i = Math.floor(f), u = f - i, j = Math.min(N - 1, i + 1);
    const w = lerp(ws[i], ws[j], u);
    const faz = Math.abs(fz[j] - fz[i]) > 1 ? fz[i] : lerp(fz[i], fz[j], u);
    const k = Math.sign(ks[i]) !== Math.sign(ks[j]) ? (u < 0.5 ? ks[i] : ks[j]) : lerp(ks[i], ks[j], u);
    return { x: lerp(xs[i], xs[j], u), k, poz: pozAl(faz, w), w };
  };
  plan.tSon = tSon;
  return plan;
}

/** Rastgele (tohumlu) avare yürüyüş bölümleri: yürü, dur, dön, bazen kendi etrafında döner */
export function avareBolumler(tohum, sure) {
  const r = rng(tohum);
  const out = [];
  let t = 0;
  // ilk bölüm: çoğu zaten yürüyor
  while (t < sure) {
    const z = r();
    let b;
    if (z < 0.58) {
      // yürüyüş süresi: faz yarım döngünün katında bitsin (bacaklar yan yana)
      const hiz = r.ara(0.85, 1.2);
      const yarim = r.tam(2, 5);
      b = { tur: 'yuru', hiz, sure: yarim * 0.5 / hiz + 0.04 };
    } else if (z < 0.85) b = { tur: 'don', sure: r.ara(0.22, 0.32) };
    else b = { tur: 'dur', sure: r.ara(0.2, 0.55) };
    // art arda iki dönüş olmasın
    if (b.tur === 'don' && out.length && out[out.length - 1].tur === 'don') b = { tur: 'dur', sure: 0.25 };
    out.push(b);
    t += b.sure;
  }
  return out;
}
