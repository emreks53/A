// 2. cümle: "Ve insaniyetin en âlî mertebesi ve beşeriyetin en büyük makamı, iman-ı billah içindeki marifetullahtır."
// s01'in nur küresiyle açılır: kamera geri çekilir, küre göğe süzülür; aşağıda bulut denizinden göğe yükselen krem taş
// bir merdiven-köprü görünür (mertebe = basamak). Adam merdivenin dibinde belirir ve çıkar (insaniyetin); kamera onu
// izler, bastığı her basamakta küçük bir ışık yanar (en âlî mertebesi). Zirvede altın konturlu sivri kemer çizilir,
// adam kemerin altına varır, nur kemerin içinde parlar (beşeriyetin en büyük makamı). Kamera nura itilir, ışığın
// içine girilir (iman-ı billah); nurun içinde marifet deseni merkezden dışa çizilir, dolgusu yayılır, yavaşça döner,
// bütün çizgiler merkezdeki parlayan noktaya çıkar (içindeki marifetullahtır). Bitiş: desen (540, 900), R 400.
import { W, H, clamp, lerp, ease, an, tuval } from '../motor/temel.mjs';
import { ogeCiz, ogeAcarak, gokTuvali, konturCiz } from '../motor/kalem.mjs';
import { kameraYolu, kameraIle, salinim, ekranda } from '../motor/sahne.mjs';
import { kb } from '../motor/zaman.mjs';
import { insanYan } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import {
  G, S, FENERLER, GUL_PENCERE, ADAM, yapiOge, kemerOge, kemerGeo, bulutDenizi, nurHazirla, nurCiz, adamDurum,
  desenMerkezden, isikZemini, fenerCiz,
} from './s02-yardim.mjs';

const T_ = {
  bas: 7.4, insan: kb('insaniyetin'), en: kb('en', 3), ali: kb('ali'), mertebe: kb('mertebesi'),
  besEr: kb('beşeriyetin'), buyuk: kb('büyük'), makam: kb('makamı'), iman: kb('imanı', 2), billah: kb('billah'),
  icindeki: kb('içindeki'), marifet: kb('marifetullahtır'), son: 16.6,
};

const NUR = G.NUR;
const ZEND = 1150 / NUR.r; // nurun içine girildiğinde (ekranı dolduran yarıçap)
const ITME = { t0: T_.iman, sure: 1.2 }; // kamera nura itilir

// hızlı başlayıp uzun yavaşlayan geri çekilme (Kurzgesagt kamerası)
function geriCekil(u) { return ease.inOutCubic(Math.pow(u, 0.7)); }
// kamera (itmeden önce): dünya anahtarları
const KAM = kameraYolu([
  { t: 7.4, x: 540, y: NUR.y + 100 / (156 / NUR.r), z: 156 / NUR.r }, // s01 devri: nur ekranda (540, 860), r 156
  { t: 7.6, x: 540, y: NUR.y + 100 / (156 / NUR.r), z: 156 / NUR.r * 0.997, e: ease.inOutSine },
  { t: 8.5, x: 300, y: 877, z: 1.4, e: geriCekil }, // geri çekilme: merdivenin dibi + nur
  { t: 9.25, x: 310, y: 868, z: 1.415, e: ease.inOutSine },
  { t: 12.55, x: 540, y: 658, z: 1.55, e: ease.inOutSine }, // adamı izler, zirvede kemer ortada
  { t: ITME.t0, x: 540, y: 655, z: 1.57, e: ease.inOutSine },
]);
const kamOnce = KAM(ITME.t0);
const nurEkran0 = ekranda(kamOnce, NUR.x, NUR.y);

function kamera(t) {
  if (t < ITME.t0) return KAM(t);
  // itme: nurun ekrandaki merkezi (540, 900)'e kayarken yakınlaşma log uzayında artar; ardından yavaş oturma
  const e1 = an(t, ITME.t0, ITME.sure, ease.inOutCubic);
  const e2 = an(t, ITME.t0 + 0.7, 16.2 - ITME.t0 - 0.7, ease.inOutSine);
  const lz = lerp(Math.log(kamOnce.z), Math.log(ZEND * 0.955), e1) + Math.log(1 / 0.955) * e2;
  const z = Math.exp(lz);
  const sx = lerp(nurEkran0[0], 540, e1), sy = lerp(nurEkran0[1], 900, e1);
  return { x: NUR.x - (sx - 540) / z, y: NUR.y - (sy - 960) / z, z, r: 0 };
}

// paralaks çarpanları
const F = { gok: 0.35, uzak: 0.5, bulutArka: 0.7, bulutOrta: 0.85, yapi: 1, bulutOn: 1.12, on: 1.3 };

let gok, yapi, kemer, kemerG, bdArka, bdOrta, bdOn, zemin, bulutlar, dolguOge, kumuluslar;

export default {
  sesler: [
    { t: 7.66, tur: 'whoosh', guc: 0.3, sure: 1.0 },
    { t: ADAM.gorun + 0.02, tur: 'parilti', guc: 0.22 },
    { t: +(ADAM.inis[0] - 0.02).toFixed(2), tur: 'adim', guc: 0.14, tekrar: ADAM.inis.length, ara: +((ADAM.inis[ADAM.inis.length - 1] - ADAM.inis[0]) / (ADAM.inis.length - 1)).toFixed(3) },
    { t: +ADAM.basamakInis[2].toFixed(2), tur: 'parilti', guc: 0.2, tekrar: 3, ara: 0.84 },
    { t: T_.besEr, tur: 'kalem', guc: 0.4, sure: 0.8 },
    { t: T_.makam, tur: 'nur', guc: 0.4, sure: 1.6 },
    { t: T_.iman, tur: 'whoosh', guc: 0.38, sure: 1.1 },
    { t: T_.icindeki, tur: 'kalem', guc: 0.4, sure: 1.0 },
    { t: T_.marifet, tur: 'nur', guc: 0.5, sure: 2.2 },
    { t: 15.6, tur: 'parilti', guc: 0.3 },
  ],
  hazirla() {
    nurHazirla();
    gok = gokTuvali({ w: 1500, h: 2400, ad: 's02-gok', olcek: 1.15, tohum: 8, arkaAlt: '#E3DCEE' });
    yapi = yapiOge(1.4);
    kemer = kemerOge(2.2);
    kemerG = kemerGeo();
    bdArka = bulutDenizi({ w: 2200, h: 900, tohum: 3, tur: 'arka', ad: 's02-bd-arka', rMin: 60, rMax: 140, genlik: 60 });
    bdOrta = bulutDenizi({ w: 2300, h: 900, tohum: 9, tur: 'orta', ad: 's02-bd-orta', rMin: 70, rMax: 150, genlik: 50 });
    bdOn = bulutDenizi({ w: 2500, h: 900, tohum: 14, tur: 'on', ad: 's02-bd-on', rMin: 80, rMax: 170, genlik: 40 });
    bulutlar = [
      { o: M.bulutOge(260, 5, 1.2), x: 150, y: 470, f: F.uzak, hiz: 5 },
      { o: M.bulutOge(200, 17, 1.2), x: 930, y: 260, f: F.uzak, hiz: -4 },
      { o: M.bulutOge(320, 23, 1.2), x: 1060, y: 960, f: F.uzak, hiz: 4 },
      { o: M.bulutOge(180, 31, 1.2), x: -40, y: 1000, f: F.uzak, hiz: 6 },
    ];
    kumuluslar = [
      { o: M.bulutOge(620, 41, 1.1), x: -120, y: 1185, hiz: 3 },
      { o: M.bulutOge(540, 47, 1.1), x: 560, y: 1175, hiz: -2 },
      { o: M.bulutOge(680, 53, 1.1), x: 1260, y: 1190, hiz: 2.5 },
    ];
    zemin = isikZemini();
    dolguOge = M.marifetDolgu(400, 1.25);
  },

  ciz(ctx, t) {
    const c = kamera(t);
    const sl = salinim(t, 3, 0.3, 4);
    const slA = 1 - an(t, 13.6, 0.6); // itmede el salınımı söner
    const cam = { x: c.x + (sl.x / c.z) * slA, y: c.y + (sl.y / c.z) * slA, z: c.z, r: sl.r * slA };
    const [nsx, nsy, nz] = ekranda(cam, NUR.x, NUR.y);
    const nr = NUR.r * nz;

    // ışık zemini (nurun içi) ne kadar örttü
    const icAlfa = clamp((nr - 420) / 380);
    const dunya = icAlfa < 0.999;

    if (dunya) {
      dunyaCiz(ctx, t, cam, nsx, nsy, nr);
      // dalışta ekranın alt yarısı nurun sıcak ışığıyla örtülür (altyazı bandı sakin kalır)
      const ort = an(t, ITME.t0 + 0.18, 0.5, ease.inOutSine);
      if (ort > 0) {
        const gr = ctx.createLinearGradient(0, H * 0.42, 0, H);
        gr.addColorStop(0, 'rgba(252,242,214,0)');
        gr.addColorStop(0.45, `rgba(252,242,214,${0.82 * ort})`);
        gr.addColorStop(1, `rgba(252,242,214,${0.95 * ort})`);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // nur küresi (dünyanın önünde; ışık)
    const gucMakam = 0.25 * an(t, T_.makam - 0.05, 0.35, ease.outCubic) * (1 - an(t, T_.makam + 0.4, 0.9, ease.inOutSine));
    if (icAlfa < 1) {
      const isin = 1 - clamp((nr - 300) / 300);
      nurCiz(ctx, nsx, nsy, nr, t, { guc: 1 + gucMakam, isin, hale: 1 - icAlfa });
    }
    // s01'den gelen sıcak örtü ve ışık zerreleri
    const s01 = 1 - an(t, 7.6, 0.9, ease.inOutSine);
    if (s01 > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,248,226,${0.16 * s01})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      M.parcaciklar(ctx, nsx - 380, nsy - 520, 760, 1040, t, { sayi: 34, alfa: 0.7 * s01, tohum: 9 });
    }

    // ışığın içi: altın-krem zemin
    if (icAlfa > 0) {
      ctx.save();
      ctx.globalAlpha = icAlfa;
      ctx.drawImage(zemin, 0, 0);
      ctx.restore();
    }
    desenCiz(ctx, t, c, nsx, nsy, icAlfa);
  },
};

// ---------------------------------------------------------------- dünya (gök, bulutlar, merdiven, kemer, adam)
function dunyaCiz(ctx, t, cam, nsx, nsy, nr) {
  // gök
  kameraIle(ctx, cam, (g) => ogeCiz(g, gok, -210, -330), F.gok);
  // nurun göğe vuran sıcak ışığı (gökte, bulutların arkasında)
  M.hale(ctx, nsx, nsy, Math.min(1500, nr * 11), '#FFF2CF', 0.32);
  huzmeler(ctx, t, nsx, nsy, nr);
  // uzak bulutlar
  kameraIle(ctx, cam, (g) => {
    for (const b of bulutlar) ogeCiz(g, b.o, b.x + (t - 7.4) * b.hiz, b.y, { alfa: 0.95 });
  }, F.uzak);
  // bulut denizi: arka ve orta katman (köprü kemerinin içinden görünür)
  kameraIle(ctx, cam, (g) => {
    for (const k of kumuluslar) ogeCiz(g, k.o, k.x + (t - 7.4) * k.hiz, k.y, { alfa: 0.97 });
    ogeCiz(g, bdArka.oge, -560 + (t - 7.4) * 3, 1150);
  }, F.bulutArka);
  kameraIle(ctx, cam, (g) => ogeCiz(g, bdOrta.oge, -620 - (t - 7.4) * 4, 1225), F.bulutOrta);

  // merdiven-köprü, fenerler, kemer, adam
  const yapiA = an(t, 7.68, 0.4, ease.inOutSine); // s01 geçişinde köprü sonradan belirir
  kameraIle(ctx, cam, (g) => {
    ogeCiz(g, yapi, 0, 0, { alfa: yapiA });
    // fenerler: bastığı basamakta yanar
    for (const f of FENERLER) {
      let t0 = f.k === 0 ? ADAM.gorun + 0.25 : ADAM.basamakInis[f.k];
      if (t0 === undefined) continue;
      fenerCiz(g, f.x, f.y, t, t - t0, { tohum: f.k + 4 });
    }
    // sahanlıktaki gül pencere: makamda yanar
    const gp = t - (T_.makam + 0.05);
    const gpA = 1 - an(t, ITME.t0, 0.3, ease.inOutSine); // itmede altyazı bandına girmeden söner
    if (gp > 0 && gpA > 0) { g.save(); g.globalAlpha *= gpA; fenerCiz(g, GUL_PENCERE.x, GUL_PENCERE.y, t, gp, { tohum: 21, guc: 1.4 }); g.restore(); }
    kemerCiz(g, t);
    const zr = an(t, 8.2, 1.0) * (1 - an(t, ITME.t0 + 0.2, 0.4));
    if (zr > 0) M.parcaciklar(g, NUR.x - 260, NUR.y - 330, 520, 760, t, { sayi: 22, renk: '#FFF0B8', boy: 2.6, alfa: 0.75 * zr, hiz: 16, tohum: 13 });
    adamCiz(g, t, cam.z);
  }, F.yapi);

  // ön bulut denizi (merdivenin dibini örter)
  kameraIle(ctx, cam, (g) => ogeCiz(g, bdOn.oge, -720 + (t - 7.4) * 6, 1290), F.bulutOn);
  // zirveye yaklaştıkça ışık ısınır
  const sicak = 0.1 * an(t, 10.6, 2.4, ease.inOutSine);
  if (sicak > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = `rgba(255,214,140,${sicak * 2.2})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- nurdan inen yumuşak ışık huzmeleri
// [açı (tuval: y aşağı; π/2 dik aşağı), yarım genişlik, güç]
const HUZME = [[2.08, 0.05, 0.9], [1.8, 0.035, 0.7], [2.4, 0.045, 0.8], [1.5, 0.03, 0.55], [2.72, 0.04, 0.6]];
function huzmeler(ctx, t, x, y, r) {
  const A = an(t, 7.9, 0.9, ease.inOutSine) * (1 - an(t, ITME.t0 + 0.1, 0.5, ease.inOutSine));
  if (A <= 0) return;
  const L = Math.min(2200, r * 26);
  const P = (a, d) => [x + Math.cos(a) * d, y + Math.sin(a) * d];
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  HUZME.forEach(([a0, en, guc], i) => {
    const a = a0 + 0.05 * Math.sin(t * 0.35 + i * 1.7);
    const [ex, ey] = P(a, L);
    const g = ctx.createLinearGradient(x, y, ex, ey);
    g.addColorStop(0, `rgba(255,244,214,${0.22 * guc * A})`);
    g.addColorStop(0.45, `rgba(255,244,214,${0.09 * guc * A})`);
    g.addColorStop(1, 'rgba(255,244,214,0)');
    ctx.fillStyle = g;
    const w = en * (1 + 0.25 * Math.sin(t * 0.5 + i));
    const b1 = P(a + Math.PI / 2, r * 0.5), b2 = P(a - Math.PI / 2, r * 0.5);
    const c1 = P(a - w, L), c2 = P(a + w, L);
    ctx.beginPath();
    ctx.moveTo(b1[0], b1[1]);
    ctx.lineTo(c2[0], c2[1]);
    ctx.lineTo(c1[0], c1[1]);
    ctx.lineTo(b2[0], b2[1]);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- kemer (makam)
function kemerCiz(g, t) {
  const t0 = T_.besEr;
  const cz = an(t, t0, 0.8, ease.inOutCubic); // altın kontur: iki ayaktan tepeye
  if (cz <= 0) return;
  const { AX, YP } = G;
  // içte ışık nişi (makam): nurun ışığı kemerin içini doldurur
  const nis = an(t, t0 + 0.35, 0.9, ease.inOutSine) * (0.75 + 0.25 * an(t, T_.makam, 0.6, ease.inOutSine));
  if (nis > 0) {
    g.save();
    g.beginPath();
    const ic = kemerG.ic;
    g.moveTo(ic[0][0], ic[0][1]);
    for (const p of ic) g.lineTo(p[0], p[1]);
    g.closePath();
    g.clip();
    const gr = g.createLinearGradient(0, NUR.y - 120, 0, YP);
    gr.addColorStop(0, `rgba(255,246,214,${0.92 * nis})`);
    gr.addColorStop(0.55, `rgba(255,240,200,${0.6 * nis})`);
    gr.addColorStop(1, `rgba(250,232,190,${0.35 * nis})`);
    g.fillStyle = gr;
    g.fillRect(AX - 120, NUR.y - 200, 240, YP - NUR.y + 200);
    g.restore();
  }
  // taş çerçeve: aşağıdan yukarı açılır
  const tas = an(t, t0 + 0.1, 0.85, ease.inOutCubic);
  if (tas > 0) ogeAcarak(g, kemer, 0, 0, tas, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.18 });
  // altın kontur (dış, iç, ince iç çizgi): iki yarı ayrı ayrı tabandan tepeye
  const yarim = (pts) => {
    const n = pts.length, m = Math.floor(n / 2);
    return [pts.slice(0, m + 1), pts.slice(m).reverse()];
  };
  const parla = an(t, T_.makam, 0.3, ease.outCubic) * (1 - an(t, T_.makam + 0.4, 1.0, ease.inOutSine));
  for (const [pts, kal, alfa, tohum, gecik] of [[kemerG.dis, 2.6, 0.92, 61, 0], [kemerG.ic, 2.2, 0.85, 63, 0.08], [kemerG.ic2, 1.2, 0.6, 65, 0.16]]) {
    const u = clamp((cz - gecik) / (1 - gecik));
    if (u <= 0) continue;
    for (const [i, yol] of yarim(pts).entries()) konturCiz(g, yol, { renk: M.ALTIN_KOYU, kal: kal * (1 + 0.25 * parla), alfa, kapali: false, titreme: 0.35, tohum: tohum + i, cizim: u, uc: 0.01 });
  }
  // makam: kemer altın bir ışıkla parlar (dış hattında yumuşak ışıma; sonra hafifçe kalır)
  const isima = Math.max(parla, 0.35 * an(t, T_.makam + 0.3, 0.6, ease.inOutSine));
  if (isima > 0.01) {
    g.save();
    g.globalCompositeOperation = 'screen';
    g.lineJoin = 'round';
    g.beginPath();
    const d = kemerG.dis;
    g.moveTo(d[0][0], d[0][1]);
    for (const p of d) g.lineTo(p[0], p[1]);
    g.strokeStyle = `rgba(255,226,140,${0.55 * isima})`;
    g.shadowColor = `rgba(255,214,110,${0.9 * isima})`;
    g.shadowBlur = 28 * g.getTransform().a;
    g.lineWidth = 7;
    g.stroke();
    g.restore();
    M.hale(g, AX, YP - G.KEMER.h - G.KEMER.k * 0.5, 280, '#FFE9A8', 0.3 * parla);
  }
}

// ---------------------------------------------------------------- adam
let adamKatman = null;
function adamCiz(g, t, z = 1) {
  const ol = S * z > 1.6 ? 4 : 1.5; // itmede yüksek çözünürlüklü parçalar
  // nura dalışta adam ışığa karışarak çekilir (dev boyutta altyazının arkasından geçmez)
  const gor = an(t, ADAM.gorun, 0.32, ease.inOutSine) * (1 - an(t, ITME.t0 + 0.22, 0.34, ease.inOutSine));
  if (gor <= 0) return;
  const d = adamDurum(t);
  // belirirken arkasında yumuşak bir ışık
  const isik = an(t, ADAM.gorun, 0.25) * (1 - an(t, ADAM.gorun + 0.3, 0.8, ease.inOutSine));
  if (isik > 0) M.hale(g, d.x, d.y - 150 * S, 170, '#FFF4D2', 0.5 * isik);
  if (gor >= 0.999) { insanYan(g, d.x, d.y, d.poz, { s: S, olcek: ol }); return; }
  // yarı saydamken uzuvlar birbirinin içinden görünmesin: ayrı katmanda çizip bütün olarak soldur
  if (!adamKatman) adamKatman = tuval(W, H);
  const kc = adamKatman.getContext('2d');
  kc.setTransform(1, 0, 0, 1, 0, 0);
  kc.clearRect(0, 0, W, H);
  kc.setTransform(g.getTransform());
  insanYan(kc, d.x, d.y, d.poz, { s: S, olcek: ol });
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha *= gor;
  g.drawImage(adamKatman, 0, 0);
  g.restore();
}

// ---------------------------------------------------------------- marifet deseni (ekran uzayı, nurun merkezinde)
function desenCiz(ctx, t, c, nsx, nsy, icAlfa) {
  if (t < T_.icindeki - 0.05) return;
  // s03 ile aynı el salınımı (devirde desen üst üste otursun)
  const sl3 = salinim(t, 2.4, 0.3, 11);
  const b = an(t, 14.5, 0.8, ease.inOutSine);
  const x = lerp(nsx, 540, b) - sl3.x * b, y = lerp(nsy, 900, b) - sl3.y * b;
  const Rr = 400 * (c.z / ZEND);
  const cizim = an(t, T_.icindeki, 1.15, ease.lin);
  const dolguU = an(t, T_.marifet, 0.85, ease.outCubic);
  const ru = an(t, T_.icindeki, 16.2 - T_.icindeki, ease.lin);
  const r = 0.022 * (t - 16.2) - 0.42 * Math.pow(1 - ru, 3);
  const kolIsik = t < 15.05 ? -1 : Math.min(1.6, (t - 15.05) / 0.8);
  const merkez = Math.max(0.35 * an(t, T_.icindeki, 0.4), an(t, 15.65, 0.4, ease.outCubic));
  // ışık zemini altında nurun buğusu (s03'teki gibi)
  M.hale(ctx, x, y, 800 * (Rr / 400), '#FFF3CF', 0.5 * icAlfa);
  desenMerkezden(ctx, x, y, Rr, t, { cizim, dolgu: dolguU, dolguYari: dolguU, r, alfa: 1, merkezIsik: merkez, kolIsik, dolguOge });
  // desen çizilirken merkezde parlayan çekirdek
  const cek = an(t, T_.icindeki, 0.3) * (1 - an(t, T_.marifet + 0.2, 0.6));
  if (cek > 0) M.hale(ctx, x, y, Rr * 0.16, '#FFFFFF', 0.7 * cek);
}
