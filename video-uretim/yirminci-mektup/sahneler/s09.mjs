// 9. cümle (82,5–96,5): "İşte bu âvâre nev-i beşer içinde, bu perişan fâni dünyada; insan, sahibini tanımazsa mâlikini
// bulmazsa ne kadar bîçare sergerdan olduğunu herkes anlar."
// s08'in sonundan (gri dünyada yerde oturan yalnız adam, savrulan toz) kamera geri çekilir: tepeye kıvrıla kıvrıla
// çıkıp sisin içinde kaybolan uzun bir yolda, farklı derinliklerde sağa sola yürüyen, durup geri dönen, kendi
// etrafında dönen ve hiçbir yere varmayan adamlar (İşte bu âvâre nev-i beşer içinde). Kamera adama döner: önünde bir
// sıra çiçek açar ve hemen solar, kuru ağacın son yaprakları savrulur (bu perişan fâni); beyaz bir silgi çiçekleri ve
// adamı silerek çıplak filme döndürür, kamera silinen boşluğa dalar (dünyada). Boş filmde kuşbakışı adam belirir,
// çevresinde labirent önce çizgi, sonra tarama olarak çizilir (insan); adam yürür, çıkmaz bir
// yola girer ve duvara dayanır (sahibini tanımazsa). Çevresinde her yönü gösteren yazısız levhalar biter, adam dönüp
// durur (mâlikini bulmazsa). Labirent yavaşça döner, levhalar fırıl fırıl; adam ellerini başına koyar (ne kadar
// bîçare sergerdan). Kamera dönerek çok yükseğe çekilir: uçsuz bucaksız labirentte küçücük bir adam (herkes anlar).
// Bitiş (s10'a devir): kuşbakışı devasa gri labirent, eksenlere hizalı (dönüş 90°), adam ekranın tam ortasında.
import { W, H, clamp, lerp, ease, an, pop, rng, TAU, tuval } from '../motor/temel.mjs';
import { kameraYolu, kameraIle, salinim } from '../motor/sahne.mjs';
import { KELIMELER, ONCE } from '../motor/zaman.mjs';
import * as D from './s09-dunya.mjs';
import * as LB from './s09-labirent.mjs';
import { tepeAdam, levhaCiz, levhaHazirla } from './s09-figur.mjs';

// bu cümlenin kelimeleri (indeks 137..158)
const kk = (n, ilk = 137) => KELIMELER.find((k) => k.i >= ilk && k.n === n).bas - ONCE;
const T = {
  bas: 82.5, iste: kk('işte'), bu1: kk('bu'), avare: kk('avare'), beser: kk('beşer'), icinde: kk('içinde'),
  bu2: kk('bu', 143), perisan: kk('perişan', 143), fani: kk('fani'), dunyada: kk('dünyada', 143),
  insan: kk('insan'), sahibini: kk('sahibini'), tanimazsa: kk('tanımazsa'), malikini: kk('malikini'), bulmazsa: kk('bulmazsa'),
  ne: kk('ne'), bicare: kk('biçare'), sergerdan: kk('sergerdan'), herkes: kk('herkes'), anlar: kk('anlar'), son: 96.5,
};

// ---------------------------------------------------------------- bölüm A-B: yan görünüş dünyası
const KAM_B = { x: 550, y: 1760, z: 1.5 }; // çiçek çerçevesi (silinme boyunca sabit)
// açılış: s08'in son karesindeki gibi adam ekranın ortasında (540, 1127), ekran ölçeği 0,9
const KAM_0 = { x: D.ADAM.x, y: D.ADAM.y - (1127.5 - 960) / 1.5, z: 1.5 };
const kamA = kameraYolu([
  { t: 82.3, ...KAM_0 },
  { t: T.iste, x: KAM_0.x - 2, y: KAM_0.y - 4, z: 1.49, e: ease.lin },
  { t: T.iste + 1.45, x: 540, y: 975, z: 1.0, e: ease.inOutCubic },
  { t: T.bu2 - 0.04, x: 566, y: 990, z: 1.045, e: ease.inOutSine },
  { t: T.bu2 + 0.55, ...KAM_B, e: ease.inOutCubic },
  { t: 87.88, ...KAM_B, e: ease.lin },
  { t: 88.42, x: 775, y: 1830, z: 10, e: ease.inOutQuad }, // silinen boşluğa dalış: ekran çıplak film olur
  { t: 100, x: 775, y: 1830, z: 10, e: ease.lin },
]);
const SIL_BAS = T.dunyada - 0.04; // silgi ilk darbesi ("dünyada")
const SIL_SON = 87.92;
const SIL_TEMIZ = 88.26; // dalışın sonunda kenarda kalanlar sönsün

// ---------------------------------------------------------------- bölüm C-F: kuşbakışı labirent
const [JX, JY] = LB.hucreMerkez(60, 60); // kavşak
const C = LB.HUCRE;
const P0 = [JX, JY + 0.55 * C];
const SON_X = 62 * C - C * LB.DUVAR / 2 - 34; // çıkmazda durduğu yer (x)
const ADAM_SON = [SON_X, JY];
const YURU = { t0: T.sahibini, t1: 90.3 }; // "sahibini"de yürümeye başlar, "tanımazsa"da çıkmaza döner
const R_DON = 70;
const YOL = (() => {
  const L1 = P0[1] - (JY + R_DON), L2 = (Math.PI / 2) * R_DON, L3 = SON_X - (JX + R_DON);
  return { L1, L2, L3, L: L1 + L2 + L3 };
})();
function yolNokta(s) {
  if (s <= YOL.L1) return { x: JX, y: P0[1] - s, h: -Math.PI / 2 };
  if (s <= YOL.L1 + YOL.L2) {
    const a = Math.PI + (s - YOL.L1) / R_DON;
    return { x: JX + R_DON + R_DON * Math.cos(a), y: JY + R_DON + R_DON * Math.sin(a), h: a - 1.5 * Math.PI };
  }
  return { x: JX + R_DON + (s - YOL.L1 - YOL.L2), y: JY, h: 0 };
}
// hızlanma 0,25 sn, yavaşlama 0,22 sn
function yolS(t) {
  const T0 = YURU.t0, T1 = YURU.t1, ta = 0.25, td = 0.22;
  const v = YOL.L / (T1 - T0 - ta / 2 - td / 2);
  if (t <= T0) return { s: 0, v: 0 };
  if (t >= T1) return { s: YOL.L, v: 0 };
  const u = t - T0;
  if (u < ta) return { s: 0.5 * (v / ta) * u * u, v: (v * u) / ta };
  const s1 = 0.5 * v * ta;
  const kalan = T1 - t;
  if (kalan < td) return { s: YOL.L - 0.5 * (v / td) * kalan * kalan, v: (v * kalan) / td };
  return { s: s1 + v * (u - ta), v };
}
// çıkmazdan sonra bakış yönleri (dönüp durur)
const BAKIS = [
  [90.3, 0], [T.malikini + 0.08, 0], [T.malikini + 0.42, -Math.PI], [T.bulmazsa + 0.02, -Math.PI], [T.bulmazsa + 0.26, -Math.PI + 0.9],
  [91.82, -Math.PI + 0.9], [92.08, -Math.PI - 0.95], [92.28, -Math.PI - 0.95], [92.5, -Math.PI + 0.55], [92.66, -Math.PI + 0.55], [92.9, -Math.PI - 0.3],
];
function bakis(t) {
  if (t <= BAKIS[0][0]) return BAKIS[0][1];
  for (let i = 1; i < BAKIS.length; i++) {
    if (t <= BAKIS[i][0]) {
      const [ta, ha] = BAKIS[i - 1], [tb, hb] = BAKIS[i];
      return lerp(ha, hb, ease.inOutCubic(clamp((t - ta) / (tb - ta))));
    }
  }
  return BAKIS[BAKIS.length - 1][1];
}
function adamDurum(t) {
  const { s, v } = yolS(t);
  const p = yolNokta(s);
  let x = p.x, y = p.y, h = p.h;
  const vmax = YOL.L / (YURU.t1 - YURU.t0 - 0.235);
  const poz = { faz: (s / 262) * TAU, yuru: clamp(v / vmax), eller: 0, sallan: 0, kipir: 0 };
  if (t > YURU.t1) {
    // duvara dayanma: küçük geri sekme
    const u = clamp((t - YURU.t1) / 0.32);
    x -= 10 * Math.sin(Math.PI * u) * (1 - u * 0.3);
    h = bakis(t);
    // dönerken ayaklar kıpırdar
    const dh = Math.abs(bakis(t + 0.03) - bakis(t - 0.03)) / 0.06;
    poz.kipir = 5 * Math.sin(t * 22) * clamp(dh / 4);
    poz.faz = 0;
  }
  if (t > T.sergerdan - 0.1) {
    const e = an(t, T.sergerdan - 0.05, 0.42, ease.inOutCubic);
    poz.eller = e;
    h += e * 0.22 * Math.sin((t - T.sergerdan) * 3.4);
    poz.sallan = e * 2.5 * Math.sin((t - T.sergerdan) * 5.1);
  }
  return { x, y, h, poz };
}

// labirent kamerası
const KAM_L = [
  { t: 88.3, x: P0[0], y: P0[1] - 30, z: 1.26, r: 0 },
  { t: 89.75, x: JX + 70, y: JY + 42, z: 1.08, r: 0, e: ease.inOutSine },
  { t: 90.55, x: JX + 105, y: JY + 15, z: 1.06, r: 0, e: ease.inOutSine },
  { t: T.bicare - 0.02, x: JX + 90, y: JY + 10, z: 1.12, r: 0, e: ease.inOutSine },
  { t: T.herkes - 0.42, x: ADAM_SON[0], y: ADAM_SON[1], z: 1.34, r: 0.42, e: ease.inOutSine },
  { t: T.herkes - 0.05, x: ADAM_SON[0], y: ADAM_SON[1], z: 1.36, r: 0.46, e: ease.lin },
  { t: 96.28, x: ADAM_SON[0], y: ADAM_SON[1], z: 0.113, r: Math.PI / 2, e: ease.inOutCubic },
  { t: 96.5, x: ADAM_SON[0], y: ADAM_SON[1], z: 0.1105, r: Math.PI / 2, e: ease.lin },
];
function kamL(t) {
  const k = KAM_L;
  if (t <= k[0].t) return { ...k[0] };
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i].t) {
      const a = k[i - 1], b = k[i];
      const e = b.e(clamp((t - a.t) / (b.t - a.t)));
      return { x: lerp(a.x, b.x, e), y: lerp(a.y, b.y, e), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)), r: lerp(a.r, b.r, e) };
    }
  }
  return { ...k[k.length - 1] };
}
export const SON_KAMERA = { x: ADAM_SON[0], y: ADAM_SON[1], z: 0.1105, r: Math.PI / 2 };

// levhalar: direk konumu, ana yön, ölçek, yükseklik (gölge), giriş zamanı, dönüş hızı
const LEVHALAR = (() => {
  const t0 = T.malikini;
  const L = [
    // kavşaktaki çok kollu direk
    { x: JX, y: JY, a: -Math.PI / 2 - 0.16, s: 1, yk: 1.0, dt: 0.0, w: 11.5 },
    { x: JX, y: JY, a: 0.1, s: 1, yk: 1.08, dt: 0.07, w: -14 },
    { x: JX, y: JY, a: Math.PI / 2 + 0.24, s: 1, yk: 1.16, dt: 0.14, w: 9.5 },
    { x: JX, y: JY, a: Math.PI - 0.12, s: 1, yk: 1.24, dt: 0.21, w: -12.5 },
    // koridorlardaki tek levhalar (birbirini gösterir)
    { x: JX, y: JY - 1.2 * C, a: Math.PI / 2 + 0.08, s: 0.78, yk: 1.0, dt: 0.3, w: 15 },
    { x: JX - 1.2 * C, y: JY, a: 0.06, s: 0.78, yk: 1.0, dt: 0.37, w: -10.5 },
    { x: JX, y: JY + 1.25 * C, a: -Math.PI / 2 - 0.1, s: 0.78, yk: 1.0, dt: 0.44, w: 13 },
    { x: JX + 2 * C, y: JY + 0.35 * C, a: Math.PI / 2 + 0.12, s: 0.78, yk: 1.0, dt: 0.51, w: -16 },
    { x: JX, y: JY - 2.15 * C, a: -Math.PI / 2 + 0.2, s: 0.78, yk: 1.0, dt: 0.58, w: 12 },
  ];
  const r = rng(77);
  return L.map((l) => ({ ...l, t0: t0 + l.dt, faz: r() * TAU, sal: r.ara(0.18, 0.36) }));
})();
function levhaAci(l, t) {
  // giriş sonrası kararsız salınım; bîçare'de hızlanarak fırıl fırıl döner
  let a = l.a + Math.sin((t - l.t0) * 2.2 + l.faz) * l.sal * an(t, l.t0 + 0.3, 0.6);
  const tb = T.bicare - 0.05;
  if (t > tb) {
    const u = t - tb;
    const rampa = 0.7; // hızlanma süresi
    const aci = u < rampa ? (l.w * u * u) / (2 * rampa) : l.w * (u - rampa / 2);
    a += aci;
  }
  return a;
}

// ---------------------------------------------------------------- hazırlık
let dunyaT, maskeT, hayT, tA, tB, seviyeler, S0;
function seviyeBolgeleri() {
  const S = [1, 0.48, 0.23, 0.113];
  const kutular = S.map(() => ({ x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity }));
  for (let t = 88.3; t <= 96.52; t += 1 / 90) {
    const cam = kamL(t);
    S.forEach((s, k) => {
      const ust = k === 0 ? Infinity : S[k - 1] * 0.75; // bu seviye, bir öncekinin geçişi başladığında görünür
      const alt = s * 0.55;
      if (cam.z > ust * 1.0001 || (k < S.length - 1 && cam.z < alt)) return;
      const b = LB.gorusKutusu(cam, 40);
      const q = kutular[k];
      q.x0 = Math.min(q.x0, b.x0); q.y0 = Math.min(q.y0, b.y0); q.x1 = Math.max(q.x1, b.x1); q.y1 = Math.max(q.y1, b.y1);
    });
  }
  return S.map((s, k) => ({ s, ...kutular[k] }));
}

export default {
  sesler: [
    { t: 82.62, tur: 'ruzgar', guc: 0.22, sure: 2.6 },
    { t: T.iste + 0.05, tur: 'whoosh', guc: 0.28, sure: 1.4 },
    { t: T.perisan + 0.05, tur: 'pop', guc: 0.2, tekrar: 6, ara: 0.065 },
    { t: SIL_BAS, tur: 'firca', guc: 0.34, tekrar: 4, ara: 0.18 },
    { t: 87.92, tur: 'whoosh', guc: 0.24, sure: 0.6 },
    { t: T.insan, tur: 'pop', guc: 0.24 },
    { t: T.insan + 0.1, tur: 'kalem', guc: 0.45, sure: 0.9 },
    { t: YURU.t0 + 0.1, tur: 'adim', guc: 0.16, tekrar: 4, ara: 0.36 },
    { t: T.malikini, tur: 'pop', guc: 0.2, tekrar: 5, ara: 0.12 },
    { t: T.herkes - 0.02, tur: 'whoosh', guc: 0.42, sure: 1.5 },
  ],
  hazirla() {
    D.dunyaHazirla();
    dunyaT = tuval(W, H);
    maskeT = tuval(W, H);
    tA = tuval(W, H);
    tB = tuval(W, H);
    // silgi: çiçek sırasını soldan sağa, sonra adamı siler (dünya koordinatında)
    const ck = D.cicekKutusu();
    D.silgiKur({
      bolge: [{ x0: ck.x0 + 8, x1: D.ADAM.x - 72, yUst: ck.y0 + 8, yAlt: 1950 }, { x0: D.ADAM.x - 72, x1: D.ADAM.x + 128, yUst: 1680, yAlt: 1982 }],
      adim: 47, en: 100, t0: SIL_BAS, t1: SIL_SON, giris: [120, 1600], cikis: [1060, 1480],
    });
    hayT = tuval(W, H);
    // labirent seviyeleri (kamera yolunun gördüğü bölgelere göre)
    LB.labirentHazirla();
    seviyeler = seviyeBolgeleri().map((b, k) => LB.seviyeOlustur(b.s, b.x0 / C - 1, b.y0 / C - 1, b.x1 / C + 1, b.y1 / C + 1, { cizgiAyri: k === 0, tohum: 3 + k }));
    S0 = seviyeler[0];
    levhaHazirla();
  },

  ciz(ctx, t) {
    if (t < T.insan - 0.06) dunyaBolumu(ctx, t);
    else labirentBolumu(ctx, t);
  },
};

// ---------------------------------------------------------------- A-B: yürüyenler, çiçekler, silgi
function dunyaKamerasi(t) {
  const c = kamA(t);
  const sw = 1 - an(t, T.bu2 - 0.2, 0.5);
  const sl = salinim(t, 3, 0.3, 9);
  return { x: c.x + (sl.x * sw) / c.z, y: c.y + (sl.y * sw) / c.z, z: c.z, r: sl.r * sw };
}
function dunyaYaz(g, t) {
  const cam = dunyaKamerasi(t);
  const kamIle = (fn, f) => kameraIle(g, cam, fn, f);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  g.fillStyle = '#F7F9F9';
  g.fillRect(0, 0, W, H);
  g.restore();
  D.dunyaCiz(g, kamIle, t);
  D.tozCiz(g, kamIle, t, 1 - an(t, 82.6, 1.6));
  // soluklaştırma: renkleri çek, hafif lila-gri örtü
  g.save();
  g.globalCompositeOperation = 'saturation';
  g.fillStyle = 'rgba(128,128,128,0.55)';
  g.fillRect(0, 0, W, H);
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(232,228,240,0.5)';
  g.fillRect(0, 0, W, H);
  g.restore();
  D.sonYaprakCiz(g, kamIle, t, T.fani + 0.04);
  D.cicekCiz(g, kamIle, t, T.perisan + 0.02, T.fani);
}
function acilisPusu(g, t) {
  // s08'in gökyüzünden gelen soluk pus: toz yatışınca açılır, arkadaki yol ve yürüyenler belirir
  const a = 1 - an(t, 82.75, 0.85, ease.inOutSine);
  if (a <= 0) return;
  g.save();
  const gr = g.createLinearGradient(0, 0, 0, 900);
  gr.addColorStop(0, `rgba(214,210,224,${0.92 * a})`);
  gr.addColorStop(0.55, `rgba(214,210,224,${0.8 * a})`);
  gr.addColorStop(1, 'rgba(214,210,224,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, 900);
  g.restore();
}
function dunyaBolumu(ctx, t) {
  const dctx = dunyaT.getContext('2d');
  dunyaYaz(dctx, t);
  if (t < 83.7) acilisPusu(dctx, t);
  if (t < SIL_BAS) {
    ctx.drawImage(dunyaT, 0, 0);
    if (t > SIL_BAS - 0.3) kameraIle(ctx, dunyaKamerasi(t), (g) => D.silgiCiz(g, t), 1);
    return;
  }
  const cam = dunyaKamerasi(t);
  // hayalet: çizimin soluk, hafif dağılmış izi (silinen yerde kalır)
  const hg = hayT.getContext('2d');
  hg.clearRect(0, 0, W, H);
  hg.filter = 'blur(2px)';
  hg.drawImage(dunyaT, 0, 0);
  hg.filter = 'none';
  // silinen yerler (dünya koordinatında maske)
  const mctx = maskeT.getContext('2d');
  mctx.clearRect(0, 0, W, H);
  kameraIle(mctx, cam, (g) => D.silgiMaske(g, t), 1);
  dctx.save();
  dctx.globalCompositeOperation = 'destination-out';
  dctx.filter = 'blur(1.2px)';
  dctx.drawImage(maskeT, 0, 0);
  dctx.restore();
  const iz = 1 - an(t, 87.9, 0.3, ease.inOutSine); // dalışta hayalet, iz ve kırıntılar söner
  ctx.save();
  ctx.globalAlpha = 0.13 * iz;
  ctx.drawImage(hayT, 0, 0);
  ctx.globalAlpha = 1;
  kameraIle(ctx, cam, (g) => D.silgiIzi(g, t, iz), 1);
  ctx.globalAlpha = 1 - an(t, SIL_TEMIZ, 0.16, ease.inOutSine);
  ctx.drawImage(dunyaT, 0, 0);
  ctx.restore();
  kameraIle(ctx, cam, (g) => { D.kirintiCiz(g, t, iz); D.silgiCiz(g, t); }, 1);
}

// ---------------------------------------------------------------- C-F: labirent
function labirentBolumu(ctx, t) {
  const cam = kamL(t);
  // labirent: adamdan dışa doğru önce çizgiler, sonra taramalar
  const a = adamDurum(t);
  const [ax, ay] = LB.labEkranda(cam, a.x, a.y);
  const rC = lerp(0, 1750, an(t, T.insan + 0.08, 0.72, ease.inOutSine));
  const dolgu = an(t, T.insan + 0.42, 0.55, ease.inOutSine); // çizgilerden sonra tarama ve gölgeler gelir
  if (dolgu < 1) {
    if (rC > 1) {
      const gb = tB.getContext('2d');
      gb.clearRect(0, 0, W, H);
      LB.seviyeCiz(gb, cam, S0, { tuvalAd: 'cizgi' });
      maskele(gb, ax, ay, rC, 120);
      ctx.drawImage(tB, 0, 0);
    }
    if (dolgu > 0) {
      const ga = tA.getContext('2d');
      ga.clearRect(0, 0, W, H);
      LB.labirentCiz(ga, cam, seviyeler);
      maskele(ga, ax, ay, rC, 420);
      ctx.save();
      ctx.globalAlpha = dolgu;
      ctx.drawImage(tA, 0, 0);
      ctx.restore();
    }
  } else {
    LB.labirentCiz(ctx, cam, seviyeler);
  }
  // levhalar ve adam (dünya koordinatında)
  ctx.save();
  LB.labKameraUygula(ctx, cam);
  // adam, sonra levhalar (levhalar direk boyunda: adamın üstünde kalır)
  const ap = pop(t, T.insan, 0.42);
  // çok yükseklerde bile seçilebilsin: ekrandaki boyu yavaşça alt sınıra yaklaşır
  const buyut = Math.max(1, Math.pow(0.2 / cam.z, 0.55));
  tepeAdam(ctx, a.x, a.y, a.h, a.poz, { s: 1.24 * ap * buyut, ekranOlcek: cam.z, golgeYon: [11 * buyut, 15 * buyut] });
  const levhaA = clamp((cam.z - 0.24) / 0.3); // kamera yükselince levhalar söner
  for (const l of LEVHALAR) {
    const s = pop(t, l.t0, 0.45) * l.s;
    if (s <= 0 || levhaA <= 0) continue;
    const ac = levhaAci(l, t);
    // hızlı dönüşte hareket izi
    const hiz = t > T.bicare ? Math.min(1, (t - T.bicare) / 0.7) : 0;
    if (hiz > 0.2) for (let k = 2; k >= 1; k--) levhaCiz(ctx, l.x, l.y, ac - l.w * 0.012 * k, { s, alfa: 0.18 * hiz * levhaA, yukseklik: l.yk });
    levhaCiz(ctx, l.x, l.y, ac, { s, yukseklik: l.yk, alfa: levhaA });
  }
  ctx.restore();
  yukseklikCiz(ctx, t, cam);
}

// yükselişte: kenarlar kararır, ışık adamın çevresinde toplanır (uçsuz bucaksızlık, göz adamı bulur)
function yukseklikCiz(ctx, t, cam) {
  const yuk = clamp((1.2 - cam.z) / 1.0); // 0 yakında, 1 yüksekte
  if (yuk <= 0) return;
  // kenar kararması
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(W / 2, H / 2, 160, W / 2, H / 2, 1150);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, `rgba(${255 - 40 * yuk},${255 - 44 * yuk},${255 - 30 * yuk},1)`);
  g.addColorStop(1, `rgba(${255 - 95 * yuk},${255 - 100 * yuk},${255 - 75 * yuk},1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function maskele(g, x, y, r, yumusak) {
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
  const k = clamp(1 - yumusak / Math.max(1, r));
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(k, 'rgba(0,0,0,1)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.restore();
}

// ---------------------------------------------------------------- s10'a devir: son kareyi birebir çizmek için
// s10 (veya başka bir dosya) şunları içe aktarabilir: SON, sonKareHazirla(), sonKareCiz(ctx, t).
// SON.kamera: labirent dünyasında ekran ortasına gelen nokta (adam), z (yakın seviyeye göre ölçek), r (dönüş: 90°,
// eksenlere hizalı). Hücre ekranda SON.hucreEkran px; duvar kalınlığı hücrenin %20'si.
export const SON = {
  kamera: SON_KAMERA,
  hucreEkran: LB.HUCRE * SON_KAMERA.z,
  adamEkran: [W / 2, H / 2],
};
let sonSeviye = null;
export function sonKareHazirla() {
  if (seviyeler) { sonSeviye = [seviyeler[seviyeler.length - 1]]; return; }
  LB.labirentHazirla();
  const b = LB.gorusKutusu(SON_KAMERA, 80);
  sonSeviye = [LB.seviyeOlustur(0.113, b.x0 / C - 1, b.y0 / C - 1, b.x1 / C + 1, b.y1 / C + 1, { tohum: 6 })];
}
/** s09'un 96,28 sn sonrasındaki karesi (labirent + adam + kenar kararması); t yalnız adamın salınımı için */
export function sonKareCiz(ctx, t = 96.5) {
  if (!sonSeviye) sonKareHazirla();
  const cam = SON_KAMERA;
  LB.labirentCiz(ctx, cam, sonSeviye);
  const a = adamDurum(Math.max(96.3, t));
  ctx.save();
  LB.labKameraUygula(ctx, cam);
  const buyut = Math.max(1, Math.pow(0.2 / cam.z, 0.55));
  tepeAdam(ctx, a.x, a.y, a.h, a.poz, { s: 1.24 * buyut, ekranOlcek: cam.z, golgeYon: [11 * buyut, 15 * buyut] });
  ctx.restore();
  yukseklikCiz(ctx, t, cam);
}
