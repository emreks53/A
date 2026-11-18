// 1. cümle: "Kat'iyen bil ki: Hilkatin en yüksek gayesi ve fıtratın en yüce neticesi iman-ı billahtır."
// Boş filmde ufuk çizgisi çizilir, tepeler ve büyük ağaç belirir (Kat'iyen bil ki); yaratılış canlanır: çiçekler,
// kuşlar, bulutlar, güneş (Hilkatin); kamera ağacın en yüksek yerine çıkar (en yüksek gayesi); taçta meyveler belirir,
// tepede altın bir meyve olgunlaşır (fıtratın en yüce neticesi); meyve nura dönüşür (iman-ı billahtır).
import { W, H, clamp, lerp, ease, an, pop, rng, TAU } from '../motor/temel.mjs';
import { ogeCiz, ogeAcarak, gokTuvali, konturCiz, PALET } from '../motor/kalem.mjs';
import { kameraYolu, kameraIle, salinim, ekranda } from '../motor/sahne.mjs';
import { kb, ks } from '../motor/zaman.mjs';
import { insanYan, DURUS } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';

const T = {
  katiyen: kb('katiyen'), bil: kb('bil'), hilkat: kb('hilkatin'), yuksek: kb('yüksek'), gaye: kb('gayesi'),
  fitrat: kb('fıtratın'), yuce: kb('yüce'), netice: kb('neticesi'), iman: kb('imanı'), billah: kb('billahtır'), son: ks('billahtır'),
};

// dünya yerleşimi
const UFUK = 1480;
const AGAC = { x: 560, y: 1395, boy: 980 };
let gok, tepeArka, tepeOrta, tepeOn, A, kirmiziMeyve, altinMeyve, cicekler, gunes, bulutlar, cimenler;
let altinYer; // altın meyvenin dünya konumu

const kamera = () => kameraYolu([
  { t: 0, x: 540, y: 990, z: 1.0 },
  { t: T.hilkat, x: 540, y: 975, z: 1.02 },
  { t: T.gaye + 0.6, x: 548, y: 660, z: 1.22, e: ease.inOutCubic },
  { t: T.netice + 0.45, x: altinYer[0], y: altinYer[1] + 260 / 1.7, z: 1.7, e: ease.inOutCubic },
  { t: T.son + 0.3, x: altinYer[0], y: altinYer[1] + 100 / 2.4, z: 2.4, e: ease.inOutQuart },
  { t: 7.8, x: altinYer[0], y: altinYer[1] + 100 / 2.5, z: 2.5, e: ease.lin },
]);
let kam;

export default {
  sesler: [
    { t: T.katiyen, tur: 'kalem', guc: 0.6, sure: 0.7 },
    { t: T.bil + 0.1, tur: 'firca', guc: 0.4 },
    { t: T.hilkat, tur: 'pop', guc: 0.35, tekrar: 6, ara: 0.07 },
    { t: T.hilkat + 0.2, tur: 'kanat', guc: 0.25 },
    { t: T.yuksek, tur: 'whoosh', guc: 0.35, sure: 1.2 },
    { t: T.fitrat + 0.05, tur: 'pop', guc: 0.3, tekrar: 5, ara: 0.08 },
    { t: T.yuce + 0.1, tur: 'parilti', guc: 0.35 },
    { t: T.iman, tur: 'nur', guc: 0.55, sure: 2.2 },
  ],
  hazirla() {
    gok = gokTuvali({ w: 1500, h: 2300, ad: 's01-gok2', olcek: 1.25 });
    tepeArka = M.tepeOge({ w: 1700, h: 600, tohum: 11, renk: 'yesil', dalga: 70, ad: 's01-tepe-arka', olcek: 1 });
    tepeOrta = M.tepeOge({ w: 1500, h: 1000, tohum: 5, renk: 'yesil', dalga: 90, ad: 's01-tepe-orta', olcek: 1.5 });
    tepeOn = M.tepeOge({ w: 1600, h: 900, tohum: 8, renk: 'koyu', dalga: 60, ad: 's01-tepe-on', olcek: 1 });
    A = M.agac({ boy: AGAC.boy, tohum: 21, olcek: 2.2 });
    kirmiziMeyve = M.meyveOge(15, 2.6, 'kirmizi');
    altinMeyve = M.meyveOge(22, 3.5, 'altin');
    altinYer = [AGAC.x + A.tepe[0], AGAC.y + A.tepe[1] + 58];
    kam = kamera();
    gunes = M.gunesOge(58, 1.2);
    bulutlar = [M.bulutOge(300, 3, 1.2), M.bulutOge(220, 7, 1.2), M.bulutOge(260, 12, 1.2)];
    const r = rng(101);
    cicekler = [];
    for (let i = 0; i < 16; i++) {
      const x = r.ara(-80, 1160);
      if (Math.abs(x - AGAC.x) < 70) continue;
      cicekler.push({ x, y: UFUK + 20 + r.ara(0, 260) * (i % 2 ? 1 : 0.4), s: r.ara(0.55, 1), t: T.hilkat + i * 0.045 + r.ara(0, 0.1), renk: r.sec(['beyaz', 'beyaz', 'pembe', 'sari']) });
    }
    cicekler.sort((a, b) => a.y - b.y);
    cicekler.forEach((c) => (c.oge = M.cicekOge(26, 1.6, c.renk)));
  },
  ciz(ctx, t) {
    const c = kam(t);
    const sl = salinim(t, 3, 0.3, 4);
    const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
    const giris = an(t, 0.15, 1.1, ease.inOutSine);

    // gök (paralaks 0.35), güneş yükselir
    kameraIle(ctx, cam, (g) => {
      g.globalAlpha = giris;
      ogeCiz(g, gok, -210, -260);
      const gy = lerp(1250, 760, an(t, T.hilkat - 0.1, 2.2, ease.outCubic));
      ogeCiz(g, gunes, 980, gy, { alfa: an(t, T.hilkat - 0.2, 0.8) });
      M.hale(g, 980, gy, 260, '#FFF4D2', 0.5 * an(t, T.hilkat, 1.2));
      const bx = [[180, 560], [820, 380], [1180, 640]];
      bulutlar.forEach((b, i) => {
        const gir = an(t, T.hilkat + 0.1 * i, 1.4, ease.outCubic);
        ogeCiz(g, b, bx[i][0] + (1 - gir) * (i % 2 ? 300 : -300) + t * 6, bx[i][1], { alfa: gir });
      });
      g.globalAlpha = 1;
    }, 0.35);

    // kuşlar (Hilkatin): soldan sağa süzülür
    kameraIle(ctx, cam, (g) => {
      for (let i = 0; i < 4; i++) {
        const u = (t - T.hilkat - i * 0.18) / 5.5;
        if (u <= 0 || u >= 1) continue;
        const x = lerp(-120, 1250, u) + i * 40, y = 760 - i * 38 + Math.sin(u * 7 + i) * 18;
        M.kus(g, x, y, 1.5 - i * 0.12, t, { faz: i * 1.3, alfa: an(t, T.hilkat + i * 0.18, 0.3) });
      }
    }, 0.6);

    // arka tepe (paralaks 0.6)
    kameraIle(ctx, cam, (g) => {
      ogeAcarak(g, tepeArka, -300, UFUK - 120, an(t, 0.3, 0.7, ease.inOutCubic), { mod: 'sil', yon: 0, yumusak: 0.15 });
    }, 0.6);

    // ufuk çizgisi: Kat'iyen'de soldan sağa çizilir
    const cizgi = an(t, T.katiyen, 0.55, ease.inOutCubic);
    if (cizgi > 0 && cizgi < 1.01) {
      kameraIle(ctx, cam, (g) => {
        konturCiz(g, [[-200, UFUK - 14], [1300, UFUK - 30]], { renk: PALET.yesil, kal: 2.4, alfa: 0.8 * (1 - an(t, 1.2, 0.5)), kapali: false, cizim: cizgi, tohum: 5 });
      }, 1);
    }

    // orta tepe + ağaç + çiçekler (paralaks 1)
    kameraIle(ctx, cam, (g) => {
      ogeAcarak(g, tepeOrta, -200, UFUK - 60, an(t, 0.38, 0.7, ease.inOutCubic), { mod: 'sil', yon: 0, yumusak: 0.12 });
      const buyume = an(t, T.bil - 0.05, 1.1, ease.outCubic);
      const yaprak = an(t, T.bil + 0.35, 1.0, ease.lin);
      const meyveA = an(t, T.fitrat, 0.9, ease.lin);
      M.agacCiz(g, A, AGAC.x, AGAC.y, { buyume, yaprak, meyveA, t, meyveOge: kirmiziMeyve });
      // altın meyve: en yüce netice
      const am = pop(t, T.yuce, 0.7);
      const parla = an(t, T.iman - 0.1, 0.9, ease.inOutSine);
      if (am > 0) {
        M.hale(g, altinYer[0], altinYer[1], 90 + 60 * am, '#FFE9A6', 0.55 * am);
        ogeCiz(g, altinMeyve, altinYer[0], altinYer[1], { s: am * (1 - parla * 0.15), alfa: 1 - parla });
      }
      for (const cc of cicekler) {
        if (cc.y > UFUK + 120) continue;
        const u = pop(t, cc.t, 0.45);
        if (u > 0) ogeCiz(g, cc.oge, cc.x, cc.y, { s: u * cc.s, r: Math.sin(t * 1.4 + cc.x) * 0.04 });
      }
    }, 1);

    // ön tepe + insan + ön çiçekler (paralaks 1.15)
    kameraIle(ctx, cam, (g) => {
      ogeAcarak(g, tepeOn, -250, UFUK + 150, an(t, 0.45, 0.7, ease.inOutCubic), { mod: 'sil', yon: 0, yumusak: 0.12 });
      const ia = an(t, T.bil, 0.5);
      if (ia > 0) {
        const bakis = an(t, T.hilkat + 0.6, 1.2);
        const poz = { ...DURUS, bas: lerp(0, -0.32, bakis), govde: lerp(0, -0.04, bakis), omuz: [-0.05, lerp(0.06, 0.1, bakis)] };
        insanYan(g, 205, UFUK + 205, poz, { s: 0.62, olcek: 1, alfa: ia });
      }
      for (const cc of cicekler) {
        if (cc.y <= UFUK + 120) continue;
        const u = pop(t, cc.t, 0.45);
        if (u > 0) ogeCiz(g, cc.oge, cc.x, cc.y + 40, { s: u * cc.s * 1.15, r: Math.sin(t * 1.4 + cc.x) * 0.04 });
      }
    }, 1.15);

    // iman: altın meyve nura dönüşür (ekran uzayında keskin çizilir)
    const nur = an(t, T.iman - 0.1, 1.2, ease.outCubic);
    if (nur > 0) {
      const [sx, sy] = ekranda(cam, altinYer[0], altinYer[1]);
      // sahne hafifçe ışığa boğulur
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,248,226,${0.16 * nur})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      const r = lerp(40, 150, nur) * (1 + 0.04 * an(t, T.billah, 1.2, ease.inOutSine));
      M.nurKuresi(ctx, sx, sy, r, t, { guc: nur, olcek: 1.3 });
      M.parcaciklar(ctx, sx - 380, sy - 520, 760, 1040, t, { sayi: 34, alfa: 0.7 * nur, tohum: 9 });
    }
  },
};
