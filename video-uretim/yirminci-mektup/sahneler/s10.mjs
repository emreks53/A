// 10. cümle: "Eğer sahibini bulsa mâlikini tanısa o vakit rahmetine iltica eder, kudretine istinad eder.
// O vahşetgâh dünya, bir tenezzühgâha döner ve bir ticaretgâh olur."
import { W, H, clamp, lerp, ease, an, smooth } from '../motor/temel.mjs';
import { ki } from '../motor/zaman.mjs';
import { kameraYolu, kameraUygula, ekranda, salinim } from '../motor/sahne.mjs';
import { DURUS, pozKaristir } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import { labirentHazirla, labirentCiz } from './s10-labirent.mjs';
import { tampon, radyalMaske, isikBas, dalgaHalkasi, huzme, zerreler, yurumePlani, bilekX } from './s10-yardim.mjs';
import { dunyaHazirla, yanCiz, yagmurCiz, D, G, AGAC, NUR, F } from './s10-dunya.mjs';

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
const POZ = {
  cokuk: { ...DURUS, govde: 0.1, bas: 0.42, omuz: [0.04, 0.1], dirsek: [0.08, 0.12] },
  bakis: { ...DURUS, govde: -0.05, bas: -0.4, omuz: [-0.12, 0.2], dirsek: [0.18, 0.24] },
  yagmur: { ...DURUS, govde: -0.06, bas: -0.5, omuz: [-0.3, 0.62], dirsek: [0.3, 0.75], el: [0, -0.5] },
  sayvan: { ...DURUS, govde: -0.03, bas: -0.46, omuz: [-0.08, 0.1], dirsek: [0.15, 0.2] },
  duz: { ...DURUS, govde: 0.0, bas: -0.05 },
  yaslan: { ...DURUS, govde: -0.13, bas: -0.14, kalca: [0.17, 0.26], diz: [-0.06, -0.12], bilek: [-0.11, -0.14], omuz: [-0.32, -0.22], dirsek: [0.42, 0.5] },
};
let yuru1, yuru2;

function adamDurumu(t) {
  if (t < T.ilt + 0.02) {
    // çökük → başını kaldırır → yağmura yüzünü verir
    let p = pozKaristir(POZ.cokuk, POZ.bakis, an(t, T.tan - 0.02, 0.75, ease.outBack));
    p = pozKaristir(p, POZ.yagmur, an(t, T.rah + 0.1, 0.6, ease.inOutCubic));
    return { x: 760, poz: p, yon: -1, s: S_ADAM };
  }
  if (t < yuru2.t0) {
    const r = yuru1(t);
    return { x: r.x, poz: r.poz, yon: -1, s: S_ADAM };
  }
  if (t < T.ist + 0.02) {
    const r = yuru2(t);
    return { x: r.x, poz: r.poz, yon: -1, s: S_ADAM };
  }
  // dönüş (kâğıt kesik gibi sıkışarak) ve kayaya yaslanma
  const x0 = yuru2.x1;
  const d = an(t, T.ist + 0.02, 0.26, ease.inOutSine);
  const yon = d < 0.5 ? -1 : 1;
  const k = Math.abs(Math.cos(d * Math.PI));
  const w = an(t, T.ist + 0.2, 0.55, ease.inOutCubic);
  const p = pozKaristir(POZ.duz, POZ.yaslan, w);
  // arka ayak yerinde kalsın: kalça geriye (kayaya) kayar
  const dx = (bilekX(p, 0) - bilekX(POZ.duz, 0)) * S_ADAM;
  const nefes = Math.sin(t * 2.2) * 0.012 * w;
  return { x: x0 - dx, poz: { ...p, govde: p.govde + nefes }, yon, s: S_ADAM, k: Math.max(0.12, k) };
}

// ---------------------------------------------------------------- kamera (yan dünya)
let kamYan;
function kameraKur() {
  kamYan = kameraYolu([
    { t: T.gecis, x: 690, y: 960, z: 1.32 },
    { t: T.tan + 0.2, x: 660, y: 945, z: 1.16, e: ease.outCubic },
    { t: T.o + 0.1, x: 640, y: 930, z: 1.1, e: ease.inOutSine },
    { t: T.ilt, x: 600, y: 860, z: 0.98, e: ease.inOutCubic },
    { t: T.kud - 0.05, x: 590, y: 880, z: 1.0, e: ease.inOutSine },
    { t: T.ist + 0.1, x: 160, y: 380, z: 0.56, e: ease.inOutCubic },
    { t: T.ist + 0.25, x: 170, y: 400, z: 0.57, e: ease.lin },
    { t: T.eder2 + 0.55, x: 430, y: 1010, z: 1.06, e: ease.inOutCubic },
    { t: T.o2 - 0.25, x: 440, y: 1000, z: 1.1, e: ease.outSine },
    { t: 110.9, x: 440, y: 1000, z: 1.1, e: ease.lin },
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
    dagIsik: an(t, T.kud, 0.9),
    sayvan: an(t, T.ilt + 0.3, 0.8) * (1 - 0.6 * an(t, T.ist, 0.8)),
    adam: adamDurumu(t),
    adamIsik: an(t, T.ist + 0.3, 0.8),
  };
}

function yanSahne(ctx, t) {
  const sl = salinim(t, 3, 0.3, 10);
  const c = kamYan(t);
  const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
  const S = yanDurum(t);
  const adamEk = ekranda(cam, S.adam.x, G - 150 * S_ADAM / 0.72);
  // renk dalgaları: 'tanısa' ile adamdan dışa üç dalga
  const dalgalar = [0, 0.36, 0.72].map((d) => {
    const u = clamp((t - (T.tan + 0.05 + d)) / 1.5);
    return { R: 2300 * ease.outCubic(u), u };
  });
  const renkTam = dalgalar[2].u >= 0.999;
  if (renkTam) {
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
  // nur (gökte) ve adamın üzerine inen huzme: her zaman sıcak ışık
  const [nx, ny, nz] = ekranda(cam, NUR.x, NUR.y, F.nur);
  const nurA = 1 - 0.55 * an(t, T.o, 0.8) + 0.4 * an(t, T.kud, 0.8);
  M.nurKuresi(ctx, nx, ny, NUR.r * nz, t, { guc: clamp(nurA), olcek: 1 });
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
    yagmurCiz(ctx, t, yag, { zeminY: zy, siper });
  }
  return { cam };
}

export default {
  sesler: [],
  hazirla() {
    labirentHazirla();
    dunyaHazirla();
    yuru1 = yurumePlani({ t0: T.ilt + 0.02, t1: T.ilt + 0.95, n: 2, s: S_ADAM, yon: -1, x0: 760, duruA: POZ.yagmur, duruB: POZ.sayvan });
    yuru2 = yurumePlani({ t0: T.kud - 0.15, t1: T.ist + 0.02, n: 2, s: S_ADAM, yon: -1, x0: yuru1.x1, duruA: POZ.sayvan, duruB: POZ.duz });
    kameraKur();
  },
  ciz(ctx, t) {
    const tepe = T.gecis; // ışık geçişinin doruğu
    if (t < tepe) {
      labirentCiz(ctx, t, T);
      isikBas(ctx, 0.95 * an(t, tepe - 0.42, 0.42, ease.inQuad));
    } else {
      yanSahne(ctx, t);
      isikBas(ctx, 0.95 * (1 - an(t, tepe, 0.5, ease.outQuad)));
    }
  },
};
