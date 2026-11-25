// 10. cümle: "Eğer sahibini bulsa mâlikini tanısa o vakit rahmetine iltica eder, kudretine istinad eder.
// O vahşetgâh dünya, bir tenezzühgâha döner ve bir ticaretgâh olur."
import { W, H, clamp, lerp, ease, an, smooth, pop, tuval } from '../motor/temel.mjs';
import { ogeCiz } from '../motor/kalem.mjs';
import { ki } from '../motor/zaman.mjs';
import { kameraYolu, kameraUygula, ekranda, salinim } from '../motor/sahne.mjs';
import { DURUS, ON_DURUS, pozKaristir } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import { labirentHazirla, labirentCiz } from './s10-labirent.mjs';
import { tampon, radyalMaske, isikBas, dalgaHalkasi, huzme, zerreler, yurumePlani, bilekX, yerGolgesi, kusV } from './s10-yardim.mjs';
import { yanCiz, yagmurCiz, D, G, AGAC, NUR, F } from './s10-dunya.mjs';
import { bahceHazirla, karanlikCizV, bahceCizV, bahceOnPlan, alisverisciler, katman, refEkran, V, YOL, CV, CESME } from './s10-bahce.mjs';
import { insanYan } from '../motor/insan.mjs';

const kb = (i) => ki(i).bas - 0.04;
const T = {
  egr: kb(159), sah: kb(160), bul: kb(161), mal: kb(162), tan: kb(163),
  o: kb(164), vakit: kb(165), rah: kb(166), ilt: kb(167), eder1: kb(168),
  kud: kb(169), ist: kb(170), eder2: kb(171),
  o2: kb(172), vah: kb(173), dun: kb(174), bir1: kb(175), ten: kb(176), don: kb(177),
  ve: kb(178), bir2: kb(179), tic: kb(180), olur: kb(181),
};
T.gecis = T.mal - 0.12; // labirentten yan görünüşe ışık geçişi (tepe noktası)

// ---------------------------------------------------------------- adam (yan görünüş)
const S_ADAM = 0.72;
const X0_ADAM = 860;
const POZ = {
  cokuk: { ...DURUS, govde: 0.1, bas: 0.42, omuz: [0.04, 0.1], dirsek: [0.08, 0.12] },
  bakis: { ...DURUS, govde: -0.05, bas: -0.4, omuz: [-0.12, 0.2], dirsek: [0.18, 0.24] },
  yagmur: { ...DURUS, govde: -0.06, bas: -0.5, omuz: [-0.3, 0.62], dirsek: [0.3, 0.75], el: [0, -0.5] },
  sayvan: { ...DURUS, govde: -0.03, bas: -0.46, omuz: [-0.08, 0.1], dirsek: [0.15, 0.2] },
  duz: { ...DURUS, govde: 0.0, bas: -0.05 },
  // 'tanısa': dikleşir, başı ufka bakar (göğe bakmaz: Allah'a dair yön/ışık imgesi yok)
  dik: { ...DURUS, govde: -0.02, bas: -0.05, omuz: [-0.05, 0.05], dirsek: [0.14, 0.18] },
  // 'rahmetine iltica eder': iltica gerçek bir eylemle, duayla gösterilir (ağaca sığınma ya da gökten inen bir şey yok):
  // iki el göğüs hizasında açık, avuçlar yukarı, baş hafifçe eğik
  dua: { ...DURUS, govde: 0.04, bas: 0.22, omuz: [0.04, 0.12], dirsek: [2.18, 2.3], el: [-0.85, -0.9] },
  // 'kudretine istinad eder': kayaya yaslanma yok; eller iner, rüzgâra rağmen sarsılmadan dik ve sakin durur (tevekkül)
  sabit: { ...DURUS, govde: -0.03, bas: -0.06, kalca: [-0.07, 0.08], diz: [0, -0.02], bilek: [0.05, -0.04], omuz: [-0.04, 0.04], dirsek: [0.12, 0.15] },
  // kayaya yaslanma: gövde geriye (-0,24); sırt (kürek kemikleri) ve kalça kayanın sağ yüzüne değer, ayaklar kayadan
  // ~yarım adım önde, düz basar. Kollar gövdenin yanında rahatça iner, dirsekler hafif bükük, eller uyluğun yanında.
  // (insanYan'da kolun mutlak açısı = govde + omuz; geriye eğik gövdede kolu sarkık tutmak için omuz ≈ -govde + 0,1.)
  // Değerler kayanın biçimine göre ölçüldü: sırtla kaya arası 0..1,5 px (konturlar birbirine değer, iç içe geçmez).
  yaslan: { ...DURUS, govde: -0.24, bas: -0.18, kalca: [0.232, 0.332], diz: [-0.04, -0.16], bilek: [-0.2, -0.18], omuz: [0.32, 0.39], dirsek: [0.18, 0.25] },
};
// kayanın yeri bu (ilk) bacak duruşuna göre bir kez belirlenmiştir; yaslanma pozu inceltilirken kaya yerinden oynamaz
const KAYA_REF = { kalca: [0.24, 0.34], diz: [-0.04, -0.16] };
let yuru1, yuru2;

function adamDurumu(t) {
  // çökük → 'tanısa'da dikleşir (aşmasız, yumuşak) → 'rahmetine' ellerini açıp dua eder → 'kudretine' elleri iner,
  // dik ve sakin durur; rüzgâr eser, o sarsılmaz (yalnız hafif nefes)
  let p = pozKaristir(POZ.cokuk, POZ.dik, an(t, T.tan - 0.06, 0.72, basKalkis));
  p = pozKaristir(p, POZ.dua, an(t, T.rah - 0.22, 0.62, ease.inOutCubic));
  p = pozKaristir(p, POZ.sabit, an(t, T.kud - 0.12, 0.62, ease.inOutCubic));
  const nefes = Math.sin(t * 2.0) * 0.008;
  return { x: X0_ADAM, poz: { ...p, govde: p.govde + nefes }, yon: -1, s: S_ADAM };
}
// dönüş: süre (sn), önden görünüşün dönüş ilerlemesindeki aralığı [a, b] (≈4 kare) ve en dar genişlik çarpanı
const DONUS = { sure: 0.32, a: 0.21, b: 0.79, dar: 0.8 };
const ON_POZ = { ...ON_DURUS, kol: [0.07, 0.07], dirsek: [0.12, 0.12], bacak: 0.04 };
// baş kaldırma eğrisi: yavaş başlar (smoothstep gibi), uzun ve yumuşak yerleşir (outCubic gibi); aşma yok
function basKalkis(u) {
  const a = u * u * (3 - 2 * u), b = 1 - Math.pow(1 - u, 3);
  return lerp(a, b, u);
}
// ağaçtan kayaya yürürken adam gövdenin ÖNÜNDEN geçer: ilk adımda zemin çizgisinin biraz önüne (aşağı) çıkar ve
// hafifçe büyür (derinlik); kayaya da önden yaslanır
const ON_DY = 18;
function onDy(t) { return ON_DY * ease.inOutSine(clamp((t - yuru2.t0) / 0.42)); }

// ---------------------------------------------------------------- kamera (yan dünya)
let kamYan;
// dağ geniş planı: doruk üstte, ağaç sağda, adam kayada; sol kenarda gök tuvali, sağ kenarda karanlık bölge görünmez
const GENIS = { x: 10, y: 410, z: 0.48 };
function kameraKur() {
  kamYan = kameraYolu([
    // yeni dünya açılmaya başlarken kamera zaten yavaşça geri çekiliyor (geçişin ortasında ani hızlanma yok)
    { t: GECIS.bas, x: 800, y: 964, z: 1.4 },
    { t: T.tan + 0.2, x: 760, y: 945, z: 1.16, e: ease.outSine },
    { t: T.o + 0.1, x: 735, y: 930, z: 1.1, e: ease.inOutSine },
    { t: T.ilt, x: 700, y: 860, z: 0.98, e: ease.inOutCubic },
    { t: T.kud - 0.05, x: 690, y: 880, z: 1.02, e: ease.inOutSine },
    // "kudretine istinad eder": dağ ya da kaya simgesi yok; kamera dik duran adama yavaşça yaklaşır (rüzgâr eser, o
    // sarsılmaz). Orman bölgesinin sınırı (dünya x≈1150) bu planda kadraj dışında kalır; "O vahşetgâh"ta kamera tek bir
    // kayışla sağa, ormana gider.
    { t: T.o2 - 0.42, x: 700, y: 900, z: 1.26, e: ease.inOutSine },
    { t: T.vah + 0.55, x: CV.x, y: CV.y, z: 0.96, e: ease.inOutSine },
    { t: T.ten, x: CV.x + 10, y: CV.y + 12, z: 1.05, e: ease.inOutSine },
    { t: T.ve, x: CV.x + 10, y: CV.y + 14, z: 1.04, e: ease.inOutSine },
    // ikram: kamera iki adama yavaşça yaklaşır (çarşıya kayış yok)
    { t: T.olur + 0.5, x: 1640, y: 968, z: 1.2, e: ease.inOutCubic },
    { t: 110.9, x: 1632, y: 972, z: 1.24, e: ease.outSine },
  ]);
}

// ---------------------------------------------------------------- yan dünya durumu
function yanDurum(t) {
  // dünya, adamın bakışı değişince ('tanısa' → 'o vakit') canlanır: gökten inen yağmur/ışık yok
  const yTam = T.o + 0.1; // yeşerme başı
  return {
    yesil: t > yTam ? t - yTam : -1,
    yaprak: an(t, T.o + 0.25, 1.4, ease.inOutSine),
    cicek: an(t, T.rah + 0.4, 1.0),
    ortaYesil: an(t, T.o + 0.35, 1.5),
    bulut: 0,
    gokKoyu: 0,
    dagIsik: 0,
    sayvan: 0,
    adam: adamDurumu(t),
    adamIsik: 0,
    yakin: t < T.vah + 0.55,
  };
}

function yanSahne(ctx, t) {
  const sl = salinim(t, 3, 0.3, 10);
  const c = kamYan(t);
  // vahşetgâh: ormanın içine yavaş itme ve yana kayma (paralaks derinlik verir). Kaymalar 'tenezzühgâh'ta sıfıra
  // iner: renk dalgası ve bahçe kareleri aynen kalır.
  const ow = an(t, T.o2 - 0.32, 0.5, ease.inOutSine) * (1 - an(t, T.vah, T.ten - T.vah, ease.outSine));
  if (ow > 0) { c.x += 80 * ow; c.y += 16 * ow; c.z *= Math.exp(Math.log(0.92) * ow); } // sağdan sola, geriden içeri
  const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
  const S = yanDurum(t);
  const adamEk = ekranda(cam, S.adam.x, G - 150 * S_ADAM / 0.72);
  // renk dalgaları: 'tanısa' ile adamdan dışa üç dalga
  const dalgalar = [0, 0.36, 0.72].map((d) => {
    const u = clamp((t - (T.tan + 0.05 + d)) / 1.5);
    return { R: 2300 * ease.outCubic(u), u };
  });
  const renkTam = dalgalar[2].u >= 0.999;
  if (t > T.o2 - 0.4) {
    vBolumu(ctx, cam, t, S);
  } else if (renkTam) {
    yanCiz(ctx, cam, t, S);
  } else {
    const K = tampon('s10-yan');
    const g = K.getContext('2d');
    yanCiz(g, cam, t, S);
    // gri-lila hâli
    ctx.save();
    ctx.filter = 'saturate(0.1) brightness(0.93) contrast(0.92)';
    ctx.drawImage(K, 0, 0);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(222,215,236,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
    const [R1, R2, R3] = dalgalar.map((d) => d.R);
    if (R1 > 1) {
      const yum = 140;
      const st = [[0, 1]];
      const ekle = (r, a) => { const son = st[st.length - 1][0]; st.push([Math.max(son + 0.5, r), a]); };
      ekle(R3 - yum, 1); ekle(R3, 0.82); ekle(R2 - yum, 0.82); ekle(R2, 0.5); ekle(R1 - yum, 0.5); ekle(R1, 0);
      radyalMaske(g, adamEk[0], adamEk[1], st, 'destination-in');
      ctx.drawImage(K, 0, 0);
    }
  }
  if (t > T.vah + 0.6) return { cam };
  // gökte sade bir güneş (sabit; hiçbir kelimeye tepki vermez, adama ışık indirmez)
  const [nx, ny, nz] = ekranda(cam, NUR.x, NUR.y, F.nur);
  const gunesA = 1 - an(t, T.o2 - 0.3, 0.45);
  if (gunesA > 0.003) {
    if (!GUNES) GUNES = M.gunesOge(56, 1.3);
    M.hale(ctx, nx, ny, 230 * nz, '#FFF4D2', 0.42 * gunesA);
    ogeCiz(ctx, GUNES, nx, ny, { s: nz, alfa: gunesA });
  }
  // 'kudretine istinad eder': soldan bir rüzgâr eser, yapraklar savrulur; adam sarsılmadan durur
  ruzgarYapraklari(ctx, t);
  return { cam };
}

let GUNES = null, YAPRAKLAR = null;
const RUZGAR = { t0: () => T.kud + 0.05, sure: 1.5 };
function ruzgarYapraklari(ctx, t) {
  const t0 = RUZGAR.t0();
  if (t < t0 || t > t0 + RUZGAR.sure + 1.2) return;
  if (!YAPRAKLAR) {
    const o = [M.yaprakOge(30, 13, 1.2), M.yaprakOge(26, 11, 1.2, 'koyu')];
    YAPRAKLAR = Array.from({ length: 11 }, (_, i) => ({ o: o[i % 2], gec: (i * 0.37) % 1 * 0.9, y: 560 + ((i * 211) % 700), dy: ((i * 97) % 120) - 60, s: 0.8 + ((i * 53) % 40) / 100, don: 3 + (i % 4), faz: i * 1.3 }));
  }
  for (const l of YAPRAKLAR) {
    const u = (t - t0 - l.gec) / 1.25;
    if (u <= 0 || u >= 1) continue;
    const x = lerp(-80, W + 80, u), y = l.y + l.dy * u + Math.sin(u * 9 + l.faz) * 26;
    ogeCiz(ctx, l.o, x, y, { s: l.s, r: l.faz + u * l.don * 2.4, alfa: Math.min(1, 6 * u, 6 * (1 - u)) * 0.9 });
  }
}

// ---------------------------------------------------------------- vahşetgâh → tenezzühgâh → ticaretgâh
const DALGA = { sx: 470, sy: 1150, Rmax: 1600, sure: 1.3 };
function varis(sx, sy) {
  const d = Math.hypot(sx - DALGA.sx, sy - DALGA.sy);
  if (d >= DALGA.Rmax) return T.ten + DALGA.sure;
  return T.ten + DALGA.sure * (1 - Math.cbrt(1 - d / DALGA.Rmax));
}
/** V bölgesinin sol sınırı: dünya x 1060..1330 (f = 1) arasında yumuşak geçiş */
function bolgeMaske(g, cam, t) {
  if (t >= T.vah + 0.55) return true;
  // sınır, kaydırma başlayana dek dağ geniş planının dışında (sağ kenarın ötesinde); kaydırmayla sola kayar
  const sx0 = lerp(1150, 880, an(t, T.o2 - 0.32, 0.6, ease.inOutSine));
  const xa = ekranda(cam, sx0, 0)[0], xb = ekranda(cam, sx0 + 290, 0)[0];
  if (xa > W) { g.clearRect(0, 0, W, H); return false; }
  if (xb < 0) return true;
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(xa, 0, xb, 0);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.restore();
  return true;
}
let yuru3;
function bahceDurum(t) {
  const tc = T.tic - 0.12;
  const tt = Math.max(0, t - (tc + 0.75));
  return {
    // 'ticaretgâh' mecazdır (dünyanın âhiret için kazanç yeri olması): gerçek bir çarşı çizilmez (carsi = 0); onun yerine
    // bahçede gerçek bir iyilik (ikram) gösterilir
    varis, carsi: 0, tCarsi: tc, fener: 0,
    terazi: 0.2 * Math.exp(-tt * 1.6) * Math.cos(tt * 5.5) + 0.02 * Math.sin(t * 1.3),
  };
}
function vBolumu(ctx, cam, t, S) {
  bahceHazirla();
  const B = bahceDurum(t);
  const dalgaU = clamp((t - T.ten) / DALGA.sure);
  const [dx, dy, dz] = refEkran(cam, DALGA.sx, DALGA.sy, 1);
  const R = DALGA.Rmax * ease.outCubic(dalgaU) * dz;
  const karanlik = (g) => {
    yanCiz(g, cam, t, S);
    const KV = tampon('s10-v-kara');
    const k = KV.getContext('2d');
    karanlikCizV(k, cam, t, T);
    if (bolgeMaske(k, cam, t)) g.drawImage(KV, 0, 0);
  };
  const aydinlik = (g) => {
    yanCiz(g, cam, t, S);
    const KB = tampon('s10-v-bahce');
    const k = KB.getContext('2d');
    bahceCizV(k, cam, t, B);
    iyilik(k, cam, t);
    bahceOnPlan(k, cam, t, B);
    kuslar(k, cam, t);
    if (bolgeMaske(k, cam, t)) g.drawImage(KB, 0, 0);
  };
  if (dalgaU <= 0) {
    karanlik(ctx);
  } else if (dalgaU < 1) {
    karanlik(ctx);
    const K2 = tampon('s10-v-isik');
    const g2 = K2.getContext('2d');
    aydinlik(g2);
    radyalMaske(g2, dx, dy, [[0, 1], [Math.max(1, R - 120), 1], [R, 0]], 'destination-in');
    ctx.drawImage(K2, 0, 0);
  } else {
    aydinlik(ctx);
  }
}
// 've bir ticaretgâh olur': sepetli adam bahçede yürür, çeşmenin önünde duran birine varır; sepetinden bir nar çıkarıp
// ona ikram eder; öteki elini uzatıp alır ve narı göğsüne götürür. (Dünya, iyiliklerle âhiret kazancının yeri olur.)
const IKRAM = { t0: () => yuru3.t1 + 0.05, uzat: 0.36, al: () => yuru3.t1 + 0.85 };
const POZ_B = { bekle: { ...DURUS, bas: -0.04, omuz: [-0.04, 0.05], dirsek: [0.12, 0.16] } };
let XB = 0;
function adamA(t) {
  if (t < yuru3.t1) return yuru3(t).poz;
  const son = yuru3(yuru3.t1).poz;
  const t0 = IKRAM.t0();
  // 1) ön el sepete iner (sepet arka elde, kalça hizasında) 2) narı alıp karşıdakine uzatır 3) nar verilince el iner
  const sep = { ...son, omuz: [son.omuz[0], -0.22], dirsek: [son.dirsek[0], 0.55], el: [0, 0] };
  const uz = { ...son, bas: -0.02, omuz: [son.omuz[0], 1.18], dirsek: [son.dirsek[0], 0.16], el: [0, -0.32] };
  const dinlen = { ...son, bas: -0.02, omuz: [son.omuz[0], 0.06], dirsek: [son.dirsek[0], 0.2] };
  let p = pozKaristir(son, sep, an(t, t0, 0.24, ease.inOutSine));
  p = pozKaristir(p, uz, an(t, t0 + 0.26, IKRAM.uzat, ease.inOutCubic));
  p = pozKaristir(p, dinlen, an(t, IKRAM.al() + 0.1, 0.45, ease.inOutSine));
  return p;
}
function adamB(t) {
  const al = IKRAM.al();
  const uz = { ...POZ_B.bekle, omuz: [-0.04, 1.14], dirsek: [0.12, 0.2], el: [0, -0.3] };
  const gogus = { ...POZ_B.bekle, bas: 0.08, omuz: [-0.04, 0.42], dirsek: [0.12, 1.62], el: [0, -0.2] };
  let p = pozKaristir(POZ_B.bekle, uz, an(t, al - 0.42, 0.38, ease.inOutCubic));
  p = pozKaristir(p, gogus, an(t, al + 0.06, 0.5, ease.inOutSine));
  return { ...p, govde: p.govde + Math.sin(t * 1.9) * 0.006 };
}
function iyilik(g, cam, t) {
  if (!V.nar) return;
  g.save(); katman(g, cam, 1);
  const s = 0.7;
  // karşıdaki adam (sola bakar): bahçe dalgasıyla birlikte belirir, çeşmenin önünde bekler
  yerGolgesi(g, XB + 6, YOL + 2, 66);
  const pb = insanYan(g, XB, YOL, adamB(t), { s, yon: -1, olcek: 1.1 });
  let pa = null;
  if (t >= yuru3.t0) {
    const xa = t < yuru3.t1 ? yuru3(t).x : yuru3.x1;
    yerGolgesi(g, xa + 6, YOL + 2, 66);
    pa = insanYan(g, xa, YOL, adamA(t), { s, yon: 1, olcek: 1.1 });
    const faz = t < yuru3.t1 ? yuru3(t).faz : 0;
    ogeCiz(g, V.sepet, pa.arkaEl[0] + 2, pa.arkaEl[1] - 6, { s: s * 1.35, r: Math.sin(faz * 2) * 0.05 });
  }
  // nar: sepetten A'nın eline, oradan B'nin eline
  if (pa) {
    const t0 = IKRAM.t0(), al = IKRAM.al();
    const cik = an(t, t0 + 0.18, 0.12);
    if (cik > 0) {
      const ver = an(t, al - 0.04, 0.14, ease.inOutSine);
      const x = lerp(pa.el[0] + 6, pb.el[0] - 6, ver), y = lerp(pa.el[1] - 4, pb.el[1] - 4, ver);
      ogeCiz(g, V.nar, x, y, { s: s * 1.5 * lerp(0.75, 1, cik) });
    }
  }
  g.restore();
}
// kuşlar: kalemle açık 'V' kuşlar, gökten bir ton koyu lila-gri; birbirinden en az bir boy aralıklı.
// Bahçe sürüsü çeşmenin yanından havalanır, çarşı kurulmadan gökyüzünden yukarı çıkar; çarşı sürüsü "olur"dan sonra
// minarenin tepesinin üstünden, gevşek bir V düzeninde sağdan sola geçer (kubbe ve minareyle kesişmez).
const KUS_RENK = '#766D90';
const BAHCE_SURU = [[430, 1180], [505, 1222], [570, 1160], [640, 1205], [712, 1168]];
const CARSI_SURU = [[0, 0], [72, -32], [74, 36], [146, -60]];
function kuslar(g, cam, t) {
  const t0 = T.ten + 0.55;
  BAHCE_SURU.forEach(([sx, sy], i) => {
    const u = (t - t0 - i * 0.13) / 2.0;
    if (u <= 0 || u >= 1) return;
    const e = Math.pow(u, 0.85);
    const wx = sx + 520 * e + Math.sin(u * 7 + i * 1.9) * 9, wy = sy - 1350 * e + Math.sin(u * 5 + i) * 7;
    const [x, y, z] = refEkran(cam, wx, wy, 0.9);
    kusV(g, x, y, (0.88 + (i % 3) * 0.06) * z * lerp(1.05, 0.92, u), t, { faz: i * 1.7, renk: KUS_RENK, alfa: clamp(u * 10), hiz: 9.5 });
  });
  const t1 = T.olur + 0.12;
  CARSI_SURU.forEach(([ox, oy], i) => {
    const u = t - t1 - i * 0.05;
    if (u <= 0) return;
    const x = 1150 - 255 * u + ox + Math.sin(t * 1.3 + i * 2.2) * 4, y = 236 - 18 * u + oy + Math.sin(t * 1.7 + i * 1.3) * 4;
    kusV(g, x, y, 0.92, t, { faz: i * 2.3, renk: KUS_RENK, alfa: clamp(u * 6), hiz: 7.5 });
  });
}

// ---------------------------------------------------------------- labirent → yan görünüş geçişi
// Labirentin erime yarıçapı (s10-labirent ile aynı eğri); yeni dünya bu dairenin biraz gerisinden açılır, böylece
// dışarıdan içe: gri labirent → altın erime cephesi → sıcak ışık kuşağı → yeni dünya.
const GECIS = { bas: 98.0, son: 98.58, mx: W / 2, my: H / 2 };
const erimeR = (t) => 1900 * an(t, T.bul + 0.12, 1.0, (u) => u * u * (1.6 - 0.6 * u));
function gecisCiz(ctx, t) {
  labirentCiz(ctx, t, T);
  const Rs = erimeR(t);
  const Rr = Rs * 1.08 - 330; // açılan dairenin tam görünen kısmı
  const yum = 240; // yumuşak kenar
  if (Rr + yum <= 0) return;
  const { mx, my } = GECIS;
  const K = tampon('s10-gecis');
  const g = K.getContext('2d');
  yanSahne(g, t);
  radyalMaske(g, mx, my, [[0, 1], [Math.max(0.5, Rr), 1], [Math.max(1, Rr) + yum, 0]], 'destination-in');
  ctx.drawImage(K, 0, 0);
}

export default {
  sesler: [
    { t: T.bul + 0.05, tur: 'firca', guc: 0.16, sure: 0.7 },
    { t: T.gecis - 0.2, tur: 'whoosh', guc: 0.16, sure: 0.9 },
    { t: T.kud + 0.05, tur: 'ruzgar', guc: 0.2, sure: 1.6 },
    { t: T.vah, tur: 'ruzgar', guc: 0.16, sure: 1.6 },
    { t: T.ten, tur: 'whoosh', guc: 0.14, sure: 1.2 },
  ],
  hazirla() {
    // ağacın altına tek adım: gövdenin sağında durur (eli ve ayağı gövdeye girmez)
    yuru1 = yurumePlani({ t0: T.ilt + 0.02, t1: T.ilt + 0.74, n: 1, s: S_ADAM, yon: -1, x0: X0_ADAM, duruA: POZ.yagmur, duruB: POZ.sayvan });
    // gövdenin önünden geçip kayaya üç adım
    yuru2 = yurumePlani({ t0: T.kud - 0.34, t1: T.ist + 0.02, n: 3, s: S_ADAM, yon: -1, x0: yuru1.x1, duruA: POZ.sayvan, duruB: POZ.duz });
    // kaya, adamın yaslanacağı yere: kalça hizasında sırtı kayanın sağ yüzüne değsin
    D.kayaDx = yuru2.x1 - (bilekX(KAYA_REF, 0) - bilekX(POZ.duz, 0)) * S_ADAM - 15 - 318;
    // bahçede keyifle yürüyüş (sepet arka elde): soldan girer, çeşmenin önünde duran adama varır ('ticaretgâh')
    yuru3 = yurumePlani({ t0: T.ten + 0.3, t1: T.tic + 0.2, n: 4, s: 0.7, yon: 1, x0: -10, kol: 0.3, egim: 0.03,
      pozF: (p) => ({ ...p, bas: -0.08, omuz: [0.05, p.omuz[1]], dirsek: [0.24, p.dirsek[1]] }) });
    {
      // uzanan iki elin buluşacağı yer: A'nın elinin ve B'nin elinin gövdeye göre yatay uzaklığı (s = 0,7)
      const c = tuval(8, 8).getContext('2d');
      const xa = yuru3.x1;
      const ua = { ...yuru3(yuru3.t1).poz, omuz: [0.05, 1.18], dirsek: [0.24, 0.16] };
      const ub = { ...POZ_B.bekle, omuz: [-0.04, 1.14], dirsek: [0.12, 0.2] };
      const ha = insanYan(c, 0, 0, ua, { s: 0.7, yon: 1, olcek: 1.1 }).el[0];
      const hb = insanYan(c, 0, 0, ub, { s: 0.7, yon: -1, olcek: 1.1 }).el[0];
      XB = xa + ha - hb + 14;
    }
    kameraKur();
  },
  ciz(ctx, t) {
    // labirent → yan görünüş: ekran beyazlamaz. Eriyen labirentin ışık alanı içinden yeni dünya açılır (kapı gibi);
    // açılan dairenin kenarında sıcak altın bir ışık kuşağı dışa doğru yürür.
    if (t < GECIS.bas) labirentCiz(ctx, t, T);
    else if (t < GECIS.son) gecisCiz(ctx, t);
    else yanSahne(ctx, t);
  },
};
