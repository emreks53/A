// 10. cümle: "Eğer sahibini bulsa mâlikini tanısa o vakit rahmetine iltica eder, kudretine istinad eder.
// O vahşetgâh dünya, bir tenezzühgâha döner ve bir ticaretgâh olur."
import { W, H, clamp, lerp, ease, an, smooth, pop } from '../motor/temel.mjs';
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
  if (t < T.ilt + 0.02) {
    // çökük → başını kaldırır (≈0,7 sn, aşmasız: yavaş başlar, yumuşakça yerleşir; önce göğüs dikleşir, baş
    // hemen ardından kalkar) → yağmura yüzünü verir
    let p = pozKaristir(POZ.cokuk, POZ.bakis, an(t, T.tan - 0.06, 0.66, basKalkis));
    p.bas = lerp(POZ.cokuk.bas, POZ.bakis.bas, an(t, T.tan - 0.02, 0.72, basKalkis));
    p = pozKaristir(p, POZ.yagmur, an(t, T.rah + 0.1, 0.6, ease.inOutCubic));
    return { x: X0_ADAM, poz: p, yon: -1, s: S_ADAM };
  }
  if (t < yuru2.t0) {
    const r = yuru1(t);
    return { x: r.x, poz: r.poz, yon: -1, s: S_ADAM };
  }
  if (t < T.ist + 0.02) {
    const r = yuru2(t);
    return { x: r.x, poz: r.poz, yon: -1, s: S_ADAM, dy: onDy(t) };
  }
  // dönüş ve kayaya yaslanma. Dönüş, klasik dönüş çizimleri gibi üç görünüşle: profil (sola) → önden → profil
  // (sağa). Figür görünüş değişirken yalnız hafifçe daralır (en dar %80); kâğıt inceliğine inmez.
  const x0 = yuru2.x1;
  const d = an(t, T.ist + 0.02, DONUS.sure, ease.inOutSine);
  const w = an(t, T.ist + 0.22, 0.55, ease.inOutCubic);
  const p = pozKaristir(POZ.duz, POZ.yaslan, w);
  // arka ayak yerinde kalsın: kalça geriye (kayaya) kayar (figür ON_DY derinliğinde çizildiği ölçekle)
  const dx = (bilekX(p, 0) - bilekX(POZ.duz, 0)) * S_ADAM * (1 + onDy(t) / 360);
  const nefes = Math.sin(t * 2.2) * 0.012 * w;
  const r = { x: x0 - dx, poz: { ...p, govde: p.govde + nefes }, yon: d < 0.5 ? -1 : 1, s: S_ADAM, k: 1, dy: onDy(t) };
  if (d > 0 && d < 1) {
    const { a, b, dar } = DONUS;
    if (d < a) r.k = lerp(1, dar, ease.inSine(d / a));
    else if (d > b) r.k = lerp(dar, 1, ease.outSine((d - b) / (1 - b)));
    else { r.k = dar + (1 - dar) * Math.sin(Math.PI * (d - a) / (b - a)); r.poz.on = ON_POZ; }
  }
  return r;
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
    { t: T.kud - 0.05, x: 680, y: 880, z: 1.0, e: ease.inOutSine },
    // "kudretine istinad eder": tek yönlü, yavaş (1,3 sn) geri çekiliş ve yükseliş; adam kayaya yürüyüp yaslanırken
    // heybetli dağ bütünüyle açılır (zemin altyazı bandının üstünde kalır). Dağ planında kalınır (yavaş süzülme),
    // geri yaklaşılmaz; "O vahşetgâh"ta kamera tek bir kayışla sağa, ormana gider.
    { t: T.kud + 1.25, x: GENIS.x, y: GENIS.y, z: GENIS.z, e: ease.inOutSine },
    { t: T.o2 - 0.42, x: GENIS.x - 4, y: GENIS.y - 5, z: GENIS.z * 0.988, e: ease.lin },
    { t: T.vah + 0.55, x: CV.x, y: CV.y, z: 0.96, e: ease.inOutSine },
    { t: T.ten, x: CV.x + 10, y: CV.y + 12, z: 1.05, e: ease.inOutSine },
    { t: T.ve, x: CV.x + 40, y: CV.y + 4, z: 1.02, e: ease.inOutSine },
    { t: T.olur + 0.5, x: 2060, y: 890, z: 0.95, e: ease.inOutCubic },
    { t: 110.9, x: 2090, y: 884, z: 0.93, e: ease.outSine },
  ]);
}

// ---------------------------------------------------------------- yan dünya durumu
function yanDurum(t) {
  const yTam = T.rah + 0.15; // yeşerme başı
  return {
    yesil: t > yTam ? t - yTam : -1,
    yaprak: an(t, T.rah + 0.3, 1.3, ease.inOutSine),
    cicek: an(t, T.ilt + 0.4, 1.0),
    ortaYesil: an(t, T.rah + 0.4, 1.4),
    bulut: an(t, T.o - 0.05, 0.9, ease.outCubic) * (1 - an(t, T.kud + 0.1, 0.9)),
    gokKoyu: an(t, T.o + 0.1, 0.7) * (1 - an(t, T.kud + 0.05, 0.8)),
    dagIsik: an(t, T.kud, 0.9),
    sayvan: an(t, T.ilt + 0.3, 0.8) * (1 - 0.6 * an(t, T.ist, 0.8)),
    adam: adamDurumu(t),
    adamIsik: an(t, T.ist + 0.3, 0.8),
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
      dalgalar.forEach((d, i) => dalgaHalkasi(ctx, adamEk[0], adamEk[1], d.R, Math.sin(Math.PI * d.u) * (1 - i * 0.2), { kal: 3.2 - i * 0.6, tohum: 60 + i }));
    }
  }
  if (t > T.vah + 0.6) return { cam };
  // nur (gökte) ve adamın üzerine inen huzme: her zaman sıcak ışık
  const [nx, ny, nz] = ekranda(cam, NUR.x, NUR.y, F.nur);
  const nurA = 1 - 0.55 * an(t, T.o, 0.8) + 0.4 * an(t, T.kud, 0.8);
  const nurSon = 1 - an(t, T.o2 - 0.3, 0.45);
  // rahmet bulutları gelince disk bulutların ardında kalır (bulutların önünde parlamaz), bulutlar dağılınca yeniden açılır
  M.nurKuresi(ctx, nx, ny, NUR.r * nz, t, { guc: clamp(nurA), olcek: 1, alfa: nurSon * (1 - 0.94 * S.bulut) });
  const huzmeA = (1 - an(t, T.rah + 0.2, 0.9)) + 0.6 * an(t, T.ist + 0.15, 0.7) * (1 - an(t, T.o2 - 0.4, 0.4));
  if (huzmeA > 0.01) {
    const [hx, hy] = ekranda(cam, S.adam.x, G - 20);
    huzme(ctx, nx, ny + NUR.r * nz, 30 * nz, hx, hy, 90 * cam.z, huzmeA * 0.9, {});
    M.hale(ctx, hx, hy - 120 * cam.z, 230 * cam.z, '#FFF4D0', 0.3 * huzmeA);
  }
  // rahmet yağmuru
  const yag = an(t, T.rah - 0.02, 0.4) * (1 - an(t, T.kud + 0.15, 0.6));
  if (yag > 0) {
    const [zx, zy] = ekranda(cam, 0, G);
    // ağacın tacı altı yağmursuz
    const [cx, cy, cz] = ekranda(cam, AGAC.x + 20, AGAC.y - 600);
    const siper = D.agac ? { x: cx, y: cy + 80 * cz, rx: 420 * cz * an(t, T.rah + 0.3, 1.1), ry: 260 * cz } : null;
    // ıslanan toprak: yağmur altında zemin hafifçe koyulaşır (ışıklı damla ve halkalar seçilir)
    if (zy < H) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const gr = ctx.createLinearGradient(0, zy - 30, 0, H);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.08, `rgba(${255 - 32 * yag},${255 - 34 * yag},${255 - 20 * yag},1)`);
      gr.addColorStop(1, `rgba(${255 - 44 * yag},${255 - 46 * yag},${255 - 28 * yag},1)`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, zy - 30, W, H - zy + 30);
      ctx.restore();
    }
    yagmurCiz(ctx, t, yag, { zeminY: zy, siper, z: cam.z });
  }
  return { cam };
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
    varis, carsi: clamp((t - tc) / 1.6), tCarsi: tc, fener: an(t, T.olur - 0.05, 0.5),
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
    alisverisciler(k, cam, t, B);
    adamSepetli(k, cam, t);
    bahceOnPlan(k, cam, t, B);
    kuslar(k, cam, t);
    if (bolgeMaske(k, cam, t)) g.drawImage(KB, 0, 0);
  };
  if (dalgaU <= 0) {
    karanlik(ctx);
    // 'bir': ortada bir ışık tanesi belirir
    const tn = an(t, T.bir1, 0.3);
    if (tn > 0) {
      M.hale(ctx, dx, dy, 160 * tn, '#FFF2C6', 0.7 * tn);
      M.hale(ctx, dx, dy, 40 * tn, '#FFFFFF', 0.8 * tn);
      M.isinlar(ctx, dx, dy, 14, 70 * tn, t, { sayi: 14, alfa: 0.5 * tn, kal: 2, tohum: 3 });
    }
  } else if (dalgaU < 1) {
    karanlik(ctx);
    const K2 = tampon('s10-v-isik');
    const g2 = K2.getContext('2d');
    aydinlik(g2);
    radyalMaske(g2, dx, dy, [[0, 1], [Math.max(1, R - 120), 1], [R, 0]], 'destination-in');
    ctx.drawImage(K2, 0, 0);
    dalgaHalkasi(ctx, dx, dy, R, Math.sin(Math.PI * dalgaU) * 1.1, { kal: 3.4, tohum: 71 });
    dalgaHalkasi(ctx, dx, dy, R * 0.82, Math.sin(Math.PI * dalgaU) * 0.6, { kal: 2.2, tohum: 72 });
    M.hale(ctx, dx, dy, 220, '#FFF4D2', 0.6 * (1 - dalgaU));
  } else {
    aydinlik(ctx);
  }
  // çarşı fenerleri yanınca sıcak bir ışık; sonda kapanışa doğru ışık artar
  isikBas(ctx, 0.08 * B.fener + 0.12 * an(t, 109.6, 1.3, ease.inQuad), '#FFF1D6');
}
function adamSepetli(g, cam, t) {
  if (t < yuru3.t0) return;
  const r = yuru3(t);
  g.save(); katman(g, cam, 1);
  const s = 0.7;
  yerGolgesi(g, r.x + 6, YOL + 2, 66);
  const p = insanYan(g, r.x, YOL, r.poz, { s, yon: 1, olcek: 1.1 });
  // sepet ön elde (dünya = katman koordinatı)
  const sal = Math.sin(r.faz * 2) * 0.05;
  ogeCiz(g, V.sepet, p.el[0] + 2, p.el[1] - 6, { s: s * 1.35, r: sal });
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
  // kenarda sıcak altın ışık kuşağı (screen), içte yumuşak, dışta erime cephesine karışır. Kuşak ve halkalar, açıklık
  // adamın çevresinde küçük bir hale gibi durmayacak kadar büyüyünce belirir (ilk anlarda adamı ortalayan halka olmaz).
  const hk = ease.inOutSine(clamp((Rr - 60) / 240));
  const k0 = Math.max(0, Rr - 60), k1 = Math.max(k0 + 1, Rr + yum + 120);
  if (hk > 0.002) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const gr = ctx.createRadialGradient(mx, my, k0, mx, my, k1);
    gr.addColorStop(0, 'rgba(255,214,140,0)');
    gr.addColorStop(0.45, `rgba(255,212,128,${0.42 * hk})`);
    gr.addColorStop(0.7, `rgba(255,226,160,${0.3 * hk})`);
    gr.addColorStop(1, 'rgba(255,226,160,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  const guc = hk * clamp((Rr + yum) / 300) * (1 - an(t, GECIS.son - 0.16, 0.16));
  dalgaHalkasi(ctx, mx, my, Math.max(3, Rr + yum * 0.42), 0.8 * guc, { renk: '#E2AE4E', kal: 2.8, tohum: 91 });
  dalgaHalkasi(ctx, mx, my, Math.max(3, Rr + yum * 0.9), 0.4 * guc, { renk: '#EBC36E', kal: 1.8, tohum: 92 });
}

export default {
  sesler: [
    { t: T.egr, tur: 'nur', guc: 0.45, sure: 2.0 },
    { t: T.bul + 0.05, tur: 'parilti', guc: 0.38 },
    { t: T.gecis - 0.2, tur: 'whoosh', guc: 0.3, sure: 0.8 },
    { t: T.rah, tur: 'yagmur', guc: 0.3, sure: 1.9 },
    { t: T.kud, tur: 'whoosh', guc: 0.28, sure: 1.0 },
    { t: T.vah, tur: 'ruzgar', guc: 0.25, sure: 1.6 },
    { t: T.ten, tur: 'nur', guc: 0.4, sure: 1.8 },
    { t: T.ten + 0.6, tur: 'kus', guc: 0.2 },
    { t: T.tic, tur: 'pop', guc: 0.24, tekrar: 4, ara: 0.32 },
    { t: T.olur, tur: 'parilti', guc: 0.3 },
  ],
  hazirla() {
    // ağacın altına tek adım: gövdenin sağında durur (eli ve ayağı gövdeye girmez)
    yuru1 = yurumePlani({ t0: T.ilt + 0.02, t1: T.ilt + 0.74, n: 1, s: S_ADAM, yon: -1, x0: X0_ADAM, duruA: POZ.yagmur, duruB: POZ.sayvan });
    // gövdenin önünden geçip kayaya üç adım
    yuru2 = yurumePlani({ t0: T.kud - 0.34, t1: T.ist + 0.02, n: 3, s: S_ADAM, yon: -1, x0: yuru1.x1, duruA: POZ.sayvan, duruB: POZ.duz });
    // kaya, adamın yaslanacağı yere: kalça hizasında sırtı kayanın sağ yüzüne değsin
    D.kayaDx = yuru2.x1 - (bilekX(KAYA_REF, 0) - bilekX(POZ.duz, 0)) * S_ADAM - 15 - 318;
    // bahçede keyifle yürüyüş (sepetli): soldan girer, çarşıya doğru
    yuru3 = yurumePlani({ t0: T.ten + 0.3, t1: 111.6, n: 12, s: 0.7, yon: 1, x0: -10, sabitHiz: true, kol: 0.3, egim: 0.03,
      pozF: (p) => ({ ...p, bas: -0.1, omuz: [p.omuz[0], 0.06 + 0.05 * p.omuz[0]], dirsek: [p.dirsek[0], 0.22] }) });
    kameraKur();
  },
  ciz(ctx, t) {
    // labirent → yan görünüş: ekran beyazlamaz. Eriyen labirentin ışık alanı içinden yeni dünya açılır (kapı gibi);
    // açılan dairenin kenarında sıcak altın bir ışık kuşağı dışa doğru yürür.
    if (t < GECIS.bas) labirentCiz(ctx, t, T);
    else if (t < GECIS.son) gecisCiz(ctx, t);
    else yanSahne(ctx, t);
    // ölçülü, sıcak altın ışık dalgası (doruğu tepe anında; ekranı örtmez)
    const dalga = an(t, T.gecis - 0.4, 0.4, ease.inOutSine) * (1 - an(t, T.gecis, 0.42, ease.inOutSine));
    isikBas(ctx, 0.13 * dalga, '#FFD993');
  },
};
