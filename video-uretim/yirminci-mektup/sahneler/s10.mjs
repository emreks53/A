// 10. cümle: "Eğer sahibini bulsa mâlikini tanısa o vakit rahmetine iltica eder, kudretine istinad eder.
// O vahşetgâh dünya, bir tenezzühgâha döner ve bir ticaretgâh olur."
import { W, H, clamp, lerp, ease, an, smooth, pop } from '../motor/temel.mjs';
import { ogeCiz } from '../motor/kalem.mjs';
import { ki } from '../motor/zaman.mjs';
import { kameraYolu, kameraUygula, ekranda, salinim } from '../motor/sahne.mjs';
import { DURUS, pozKaristir } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import { labirentHazirla, labirentCiz } from './s10-labirent.mjs';
import { tampon, radyalMaske, isikBas, dalgaHalkasi, huzme, zerreler, yurumePlani, bilekX } from './s10-yardim.mjs';
import { dunyaHazirla, yanCiz, yagmurCiz, D, G, AGAC, NUR, F } from './s10-dunya.mjs';
import { bahceHazirla, karanlikCizV, bahceCizV, alisverisciler, katman, refEkran, V, YOL, CV } from './s10-bahce.mjs';
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
    { t: T.ist + 0.1, x: 40, y: 250, z: 0.5, e: ease.inOutCubic },
    { t: T.ist + 0.3, x: 50, y: 270, z: 0.51, e: ease.lin },
    { t: T.eder2 + 0.5, x: 430, y: 1010, z: 1.08, e: ease.inOutCubic },
    { t: T.o2 - 0.32, x: 436, y: 1004, z: 1.12, e: ease.outSine },
    { t: T.o2 + 0.12, x: 1000, y: 860, z: 0.78, e: ease.inCubic },
    { t: T.vah + 0.55, x: CV.x, y: CV.y, z: 0.96, e: ease.outCubic },
    { t: T.ten, x: CV.x + 10, y: CV.y + 6, z: 1.0, e: ease.inOutSine },
    { t: T.ve, x: CV.x + 40, y: CV.y, z: 1.0, e: ease.inOutSine },
    { t: T.olur + 0.5, x: 1980, y: 890, z: 0.92, e: ease.inOutCubic },
    { t: 110.9, x: 2010, y: 880, z: 0.9, e: ease.outSine },
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

// ---------------------------------------------------------------- vahşetgâh → tenezzühgâh → ticaretgâh
const DALGA = { sx: 540, sy: 1180, Rmax: 1500, sure: 1.25 };
function varis(sx, sy) {
  const d = Math.hypot(sx - DALGA.sx, sy - DALGA.sy);
  if (d >= DALGA.Rmax) return T.ten + DALGA.sure;
  return T.ten + DALGA.sure * (1 - Math.cbrt(1 - d / DALGA.Rmax));
}
/** V bölgesinin sol sınırı: dünya x 1060..1330 (f = 1) arasında yumuşak geçiş */
function bolgeMaske(g, cam) {
  const xa = ekranda(cam, 1060, 0)[0], xb = ekranda(cam, 1330, 0)[0];
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
  const B = bahceDurum(t);
  const dalgaU = clamp((t - T.ten) / DALGA.sure);
  const [dx, dy, dz] = refEkran(cam, DALGA.sx, DALGA.sy, 1);
  const R = DALGA.Rmax * ease.outCubic(dalgaU) * dz;
  const karanlik = (g) => {
    yanCiz(g, cam, t, S);
    const KV = tampon('s10-v-kara');
    const k = KV.getContext('2d');
    karanlikCizV(k, cam, t, T);
    if (bolgeMaske(k, cam)) g.drawImage(KV, 0, 0);
  };
  const aydinlik = (g) => {
    yanCiz(g, cam, t, S);
    const KB = tampon('s10-v-bahce');
    const k = KB.getContext('2d');
    bahceCizV(k, cam, t, B);
    alisverisciler(k, cam, t, B);
    adamSepetli(k, cam, t);
    onPlanBahce(k, cam, t);
    kuslar(k, cam, t);
    if (bolgeMaske(k, cam)) g.drawImage(KB, 0, 0);
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
  const s = 0.62;
  const p = insanYan(g, r.x, YOL, r.poz, { s, yon: 1, olcek: 1.1 });
  // sepet ön elde (dünya = katman koordinatı)
  const sal = Math.sin(r.faz * 2) * 0.05;
  ogeCiz(g, V.sepet, p.el[0], p.el[1] - 4, { s: s * 1.05, r: sal });
  g.restore();
}
function onPlanBahce(g, cam, t) {
  g.save(); katman(g, cam, 1.15);
  for (const o of V.on) {
    const u = pop(t, varis(o.sx, Math.min(o.sy, 1600)) + 0.05, 0.5);
    if (u > 0) ogeCiz(g, o.bahce, o.sx, o.sy, { s: u });
  }
  g.restore();
}
function kuslar(g, cam, t) {
  const t0 = T.ten + 0.55;
  for (let i = 0; i < 6; i++) {
    const u = (t - t0 - i * 0.12) / 3.2;
    if (u <= 0 || u >= 1) continue;
    const [bx, by] = refEkran(cam, 420 + i * 40, 1150 - (i % 3) * 30, 0.9);
    const x = bx + u * 900 + i * 18, y = by - Math.pow(u, 0.7) * 820 + Math.sin(u * 9 + i) * 14;
    M.kus(g, x, y, 1.1 + (i % 3) * 0.15, t, { faz: i * 1.7, alfa: clamp(u * 6) * (1 - clamp((u - 0.85) / 0.15)), renk: '#4A5B7A' });
  }
}

export default {
  sesler: [],
  hazirla() {
    labirentHazirla();
    dunyaHazirla();
    yuru1 = yurumePlani({ t0: T.ilt + 0.02, t1: T.ilt + 1.0, n: 2, s: S_ADAM, yon: -1, x0: 760, duruA: POZ.yagmur, duruB: POZ.sayvan });
    yuru2 = yurumePlani({ t0: T.kud - 0.18, t1: T.ist + 0.02, n: 2, s: S_ADAM, yon: -1, x0: yuru1.x1, duruA: POZ.sayvan, duruB: POZ.duz });
    // kaya, adamın yaslanacağı yere: kalça hizasında sırtı kayanın sağ yüzüne değsin
    D.kayaDx = yuru2.x1 - (bilekX(POZ.yaslan, 0) - bilekX(POZ.duz, 0)) * S_ADAM - 15 - 318;
    bahceHazirla();
    // bahçede keyifle yürüyüş (sepetli): soldan girer, çarşıya doğru
    yuru3 = yurumePlani({ t0: T.ten + 0.38, t1: 111.6, n: 12, s: 0.62, yon: 1, x0: -60, sabitHiz: true, kol: 0.3, egim: 0.03,
      pozF: (p) => ({ ...p, bas: -0.08, omuz: [p.omuz[0], 0.1 + 0.04 * Math.sin(p.omuz[0] * 3)], dirsek: [p.dirsek[0], 1.45] }) });
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
