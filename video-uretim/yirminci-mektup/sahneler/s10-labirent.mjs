// s10 açılışı: s09'un son karesi birebir (kuşbakışı devasa gri labirent, ortada küçük adam).
// s09'un labirent modülü, kamerası, adamı ve son kare çizicisi içe aktarılır: 96,1–96,5 arasında s09'un kamerası ve
// adamı aynen izlenir, böylece çapraz geçişte çift görüntü olmaz. Kamera s09'un yükselişinin bittiği yükseklikte durur
// (geri dalış yok); yalnız "bulsa"dan sonra ışığa doğru çok yavaş bir itme başlar.
// Sonra: bulutlar kenarlardan sızar, yukarıdan yumuşak bir ışık huzmesi onları yararak adamın üzerine iner ("Eğer");
// ışık zemine yayılır, adamın arkasına uzun yumuşak gölgesi düşer (adamın çevresinde ışın halesi yok); adam ışığa döner.
// "bulsa"da adamın önündeki duvarlar sırayla altın ışığa dönüşüp erir: ışığa giden, üç hücre eninde, kenarları yumuşak,
// taranmış ışık zeminli düz bir yol açılır; adam o yolda ışığa doğru yürümeye başlar.
// Ardından erime yoldan iki yana genişleyen yumuşak bir şerit olarak yayılır (adamı ortalayan bir ışık diski oluşmaz);
// s10.mjs'teki iris geçişi bunun içinden açılır.
import { W, H, clamp, lerp, ease, an, rng, TAU, rgba } from '../motor/temel.mjs';
import { oge, ogeCiz, TON } from '../motor/kalem.mjs';
import { dikdortgen } from '../motor/sekil.mjs';
import * as LB from './s09-labirent.mjs';
import { SON_KAMERA, Z_SON, labirentKamerasi, labirentAdamDurum, labirentAdamCiz, sonKareCiz, sonKareHazirla } from './s09.mjs';
import { tampon, huzme, zerreler } from './s10-yardim.mjs';

const SON = { ...SON_KAMERA }; // s09'un son kamerası (adam ekranın ortasında, labirent 90° dönük)
const C = LB.HUCRE;
const DUV = (C * LB.DUVAR) / 2; // duvarın yarı kalınlığı

// kamera: 96,5'e kadar s09'un kamerası; sonra s09'un yüksekliğinde durur, "bulsa"dan sonra ışığa doğru yavaş itme
const ITME = 1.25;
function kamera(t, Z) {
  if (t <= 96.5) return labirentKamerasi(t);
  const u = ease.inOutSine(clamp((t - (Z.bul - 0.12)) / 1.25));
  return { x: SON.x, y: SON.y, z: Z_SON * Math.exp(Math.log(ITME) * u), r: Math.PI / 2 };
}

// adam: s09'un duruşu (elleri inmiş, koridorda duruyor); ışık inince ışığa (ekranda yukarı) döner; yol açılınca
// ("bulsa") ışığa doğru yürümeye başlar (basan ayak yerde kalır: adım boyu döngü yolunun dörtte biri genlik)
const YURUYUS = { v: 250, ta: 0.4, dongu: 184, s: 1.24 };
function yuruyusYolu(t, t0) {
  const u = t - t0, { v, ta } = YURUYUS;
  if (u <= 0) return { s: 0, k: 0 };
  if (u < ta) return { s: (0.5 * v * u * u) / ta, k: u / ta };
  return { s: v * (u - ta / 2), k: 1 };
}
function adamDurumu(t, Z) {
  const a = labirentAdamDurum(t); // s09 ile aynı an (çapraz geçişte çift görüntü olmasın)
  const don = an(t, Z.egr + 0.1, 0.55, ease.inOutSine);
  a.h = lerp(a.h, -Math.PI, don);
  // dönerken ayaklar yerinde kıpırdar
  a.poz.kipir = 4 * Math.sin(Math.PI * don) * Math.sin(t * 20);
  const w = yuruyusYolu(t, Z.bul - 0.02);
  if (w.s > 0) {
    a.x -= w.s; // batıya (ekranda yukarı), yolun ortasında
    a.poz.faz = (w.s / YURUYUS.dongu) * TAU;
    a.poz.yuru = 1;
    a.poz.adim = YURUYUS.dongu / 4 / YURUYUS.s;
    a.poz.kolYuru = 0.85 * w.k;
  }
  return a;
}

// ---------------------------------------------------------------- bulutlar
// kuşbakışı yumuşak bulut: üst üste binen ışıklı puflar, sağ altta lila gölge (kenarı sert değil)
function bulutPuf(ctx, x, y, w, alfa, tohum) {
  if (alfa <= 0.003) return;
  const r = rng(tohum);
  ctx.save();
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = r.ara(0, w * 0.3);
    const px = x + Math.cos(a) * d * 1.25, py = y + Math.sin(a) * d * 0.8, R = w * r.ara(0.2, 0.32);
    const gg = ctx.createRadialGradient(px + R * 0.18, py + R * 0.22, 0, px + R * 0.18, py + R * 0.22, R * 1.05);
    gg.addColorStop(0, `rgba(140,132,162,${0.22 * alfa})`);
    gg.addColorStop(1, 'rgba(140,132,162,0)');
    ctx.fillStyle = gg;
    ctx.fillRect(px - R * 1.3, py - R * 1.3, R * 2.6, R * 2.6);
    const g = ctx.createRadialGradient(px - R * 0.15, py - R * 0.2, 0, px, py, R);
    g.addColorStop(0, `rgba(250,248,252,${0.85 * alfa})`);
    g.addColorStop(0.6, `rgba(232,228,240,${0.6 * alfa})`);
    g.addColorStop(1, 'rgba(225,220,235,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - R, py - R, R * 2, R * 2);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- hazırlık
let hazir = false, sicakZemin, bulutlar, lekeler;
export function labirentHazirla() {
  if (hazir) return;
  hazir = true;
  sonKareHazirla();
  LB.labirentHazirla();
  // eriyen labirentin altından çıkan sıcak ışık zemini (kalem taramalı); kamera ölçeğinde (z = Z_SON'da 1:1) çizilir
  sicakZemin = oge({
    ad: 's10-lab-sicak4', olcek: 1, sekil: dikdortgen(0, 0, 1300, 2200), arka: '#F6E1AE', arkaAlfa: 0.85, arkaBulanik: 10,
    tarama: { ton: TON.gurultulu(() => 0.55, 0.22, 0.004, 9), renkler: [[0, '#F1D894'], [1, '#D3A248']], yon: -0.42, aralik: 3.6, boy: [40, 110], kal: 1.15, alfa: 0.45, esikler: [0.25, 0.55] },
    kontur: null, pay: 2,
  });
  bulutlar = [
    { w: 720, x: -120, y: 240, dx: -1, dy: -0.3 },
    { w: 760, x: 1180, y: 420, dx: 1, dy: -0.2 },
    { w: 600, x: -200, y: 1000, dx: -1, dy: 0 },
    { w: 640, x: 1260, y: 1260, dx: 1, dy: 0.2 },
    { w: 700, x: 330, y: -180, dx: -0.3, dy: -1 },
    { w: 720, x: 820, y: 2080, dx: 0.4, dy: 1 },
  ];
  // zemine düşen dağınık ışık lekeleri (bulut aralığından süzülen ışık): adamın çevresinde, altyazı bandının üstünde
  const r = rng(404);
  lekeler = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = r.ara(110, 300);
    lekeler.push({ x: Math.cos(a) * d * 0.9, y: Math.sin(a) * d * 1.05 - 40, rx: r.ara(28, 60), ry: r.ara(20, 44), don: r() * Math.PI, gec: r.ara(0, 0.5), a: r.ara(0.16, 0.3), faz: r() * TAU });
  }
}

// sıcak taranmış zemin (kamera ölçeğinde) bir tampona ya da doğrudan çizilir
function sicakZeminCiz(g, cam) {
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(cam.r - Math.PI / 2);
  const zz = cam.z / Z_SON;
  g.scale(zz, zz);
  ogeCiz(g, sicakZemin, -650, -1100);
  g.restore();
}

// ---------------------------------------------------------------- ışık yolu
// Adamın satırı (dünya y = SON.y) batıya (ekranda yukarı) uzanır. Ekran: x = W/2 − (dy) z, y = H/2 + (dx) z.
const ekY = (wx, cam) => H / 2 + (wx - SON.x) * cam.z;
const ekX = (wy, cam) => W / 2 - (wy - SON.y) * cam.z;
const SATIR = Math.floor(SON.y / C); // 60
const HUC0 = Math.floor(SON.x / C); // adamın hücresi (61)
const kose = (i, j) => LB.duvarH(i - 1, j) | LB.duvarH(i, j) | LB.duvarV(i, j - 1) | LB.duvarV(i, j);
// yolun ilerleyen önü (ekran y): adamın arkasından başlar, ekranın üstüne dek gider
const YOL = { t0: 97.4, sure: 0.72, erime: 0.32 };
function yolOnu(t, cam) {
  return lerp(H / 2 + 100 * cam.z, -160, an(t, YOL.t0, YOL.sure, ease.inOutSine));
}
/** ön, ekranda y'ye hangi anda varır (erime zamanlaması için) */
function onVaris(y, cam) {
  const y0 = H / 2 + 100 * cam.z;
  const e = clamp((y0 - y) / (y0 + 160));
  return YOL.t0 + (Math.acos(1 - 2 * e) / Math.PI) * YOL.sure;
}
// yol: adamın satırı ve iki yanındaki satırlar (üç hücre eninde düz bir cadde); dış duvarları yerinde kalır
const YARI = 1;
const yolDis = (cam) => ({
  xa: ekX((SATIR + YARI + 1) * C - DUV, cam), // sol (güney) dış duvarın yüzü
  xb: ekX((SATIR - YARI) * C + DUV, cam), // sağ (kuzey) dış duvarın yüzü
  yAlt: ekY((HUC0 + 1) * C - DUV, cam), // adamın arkasındaki çıkmaz duvarın yüzü
});
/** yol maskesi: caddenin içi (dış duvarların yüzüne kadar) + dış açıklıklarda yumuşakça sönen uzantılar */
function yolMaskesi(g, cam, yOn) {
  const z = cam.z;
  const { xa, xb, yAlt } = yolDis(cam);
  const tas = 80 * z; // açıklıklarda ışığın taşma boyu
  const dolgu = (x0, y0, x1, y1, gx0, gx1, gy0, gy1) => {
    const gr = g.createLinearGradient(gx0, gy0, gx1, gy1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  };
  g.fillStyle = '#000';
  g.fillRect(xa + 1, -20, xb - xa - 2, yAlt - 1 + 20);
  // alt uç: arkada duvar olmayan satırlarda yumuşak biter
  for (let j = SATIR - YARI; j <= SATIR + YARI; j++) {
    if (LB.duvarV(HUC0 + 1, j)) continue;
    const x0 = Math.max(xa + 1, ekX((j + 1) * C, cam)), x1 = Math.min(xb - 1, ekX(j * C, cam));
    dolgu(x0, yAlt - 1, x1, yAlt + tas, 0, 0, yAlt - 1, yAlt + tas);
  }
  const jn = SATIR - YARI, js = SATIR + YARI + 1; // dış duvar çizgileri
  for (let i = HUC0; i >= 0; i--) {
    const y1 = ekY((i + 1) * C, cam), y0 = ekY(i * C, cam);
    if (y1 < -20) break;
    if (!LB.duvarH(i, jn)) { // kuzey (ekranda sağ) açık
      const ya = y0 + (kose(i, jn) ? DUV * z : 0), yb = y1 - (kose(i + 1, jn) ? DUV * z : 0);
      if (yb > ya) dolgu(xb - 1, ya, xb + tas, yb, xb - 1, xb + tas, 0, 0);
    }
    if (!LB.duvarH(i, js)) { // güney (ekranda sol) açık
      const ya = y0 + (kose(i, js) ? DUV * z : 0), yb = y1 - (kose(i + 1, js) ? DUV * z : 0);
      if (yb > ya) dolgu(xa - tas, ya, xa + 1, yb, xa + 1, xa - tas, 0, 0);
    }
  }
  // ilerleyen ön: yumuşak
  g.save();
  g.globalCompositeOperation = 'destination-in';
  const gr = g.createLinearGradient(0, yOn - 70, 0, yOn + 40);
  gr.addColorStop(0, 'rgba(0,0,0,0)');
  gr.addColorStop(1, 'rgba(0,0,0,1)');
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  g.restore();
}
/** caddenin içinde kalan (eriyecek) duvar parçaları: ekran dikdörtgenleri { x0, x1, y0, y1, y (orta) } */
function yolDuvarlari(cam) {
  const { xa, xb, yAlt } = yolDis(cam);
  const L = [];
  const ekle = (id, wx0, wx1, wy0, wy1) => {
    const x0 = Math.max(xa + 1, ekX(wy1, cam)), x1 = Math.min(xb - 1, ekX(wy0, cam));
    const y0 = Math.max(-40, ekY(wx0, cam)), y1 = Math.min(yAlt, ekY(wx1, cam));
    if (x1 - x0 < 1 || y1 - y0 < 1) return;
    L.push({ x0, x1, y0, y1, y: (y0 + y1) / 2, id });
  };
  for (let i = HUC0; i >= 0; i--) {
    if (ekY((i + 1) * C, cam) < -40) break;
    for (let j = SATIR - YARI; j <= SATIR + YARI; j++) if (LB.duvarV(i, j)) ekle(i * 16 + j - SATIR + 3, i * C - DUV, i * C + DUV, j * C - DUV, (j + 1) * C + DUV);
    for (let j = SATIR - YARI + 1; j <= SATIR + YARI; j++) if (LB.duvarH(i, j)) ekle(i * 16 + j - SATIR + 9, i * C - DUV, (i + 1) * C + DUV, j * C - DUV, j * C + DUV);
  }
  return L;
}

// uzun gölge: yerel çerçevede +X gölge yönü (dünya +x, ışığın tersi), Y yanal; birim dünya. Ayaklarda dar, omuz
// hizasında geniş, ucu yuvarlak yumuşak bir leke (simge gibi okunacak keskin bir siluet değil)
const GOLGE_YOL = (() => {
  const P = [[-4, -18], [18, -30], [46, -40], [78, -44], [104, -38], [118, -24], [123, -8]];
  const ust = P.map(([x, y]) => [x, y]);
  const alt = P.slice().reverse().map(([x, y]) => [x, -y]);
  return [...ust, ...alt];
})();
function uzunGolge(ctx, cam, a, guc) {
  if (guc <= 0.01) return;
  const duvarYuzu = (HUC0 + 1) * C - DUV; // gölge çıkmaz duvarının yüzünde biter
  const boy = 0.9; // ışık dik: gölge kısa, çıkmaz duvarına varmadan biter
  ctx.save();
  LB.labKameraUygula(ctx, cam);
  ctx.beginPath();
  ctx.rect(a.x - 400, a.y - 400, duvarYuzu - (a.x - 400), 800);
  ctx.clip();
  ctx.translate(a.x + 6, a.y);
  ctx.globalCompositeOperation = 'multiply';
  ctx.filter = `blur(${(3.2 * cam.z * 4).toFixed(1)}px)`;
  ctx.fillStyle = `rgba(92,82,118,${0.42 * guc})`;
  ctx.beginPath();
  GOLGE_YOL.forEach(([x, y], k) => (k ? ctx.lineTo(x * boy, y) : ctx.moveTo(x * boy, y)));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- yoldan yayılan erime
// Erime, adamı ortalayan bir daire olarak değil, ışık yolundan iki yana genişleyen yumuşak bir şerit olarak yayılır:
// uzaklık, adamdan yukarı (ışığa) uzanan yarı doğruya ölçülür (adamın altında yarım daire). Böylece adamın çevresinde
// parlak bir disk / "sap üstünde halka" biçimi oluşmaz; yol genişleyerek labirenti yutar.
function seritMaskesi(ad, x, y, duraklar) {
  const R = Math.max(1, duraklar[duraklar.length - 1][0]);
  const m = tampon(ad);
  const g = m.getContext('2d');
  const xb = Math.round(x), yb = Math.round(y);
  const durak = (gr) => { for (const [r, a] of duraklar) gr.addColorStop(clamp(r / R), `rgba(0,0,0,${clamp(a)})`); };
  for (const yon of [-1, 1]) {
    const gr = g.createLinearGradient(x, 0, x + yon * R, 0);
    durak(gr);
    g.fillStyle = gr;
    if (yon > 0) g.fillRect(xb, 0, W - xb, yb);
    else g.fillRect(0, 0, xb, yb);
  }
  const gr = g.createRadialGradient(x, y, 0, x, y, R);
  durak(gr);
  g.fillStyle = gr;
  g.fillRect(0, yb, W, H - yb);
  return m;
}
/** şerit maskesini renkli bir ışık katmanı olarak (screen) çizer */
function seritIsik(ctx, ad, x, y, duraklar, renk) {
  const m = seritMaskesi(ad, x, y, duraklar);
  const g = m.getContext('2d');
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = renk;
  g.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(m, 0, 0);
  ctx.restore();
}

/** Labirent evresi. Z: { egr, sah, bul, gecis } */
export function labirentCiz(ctx, t, Z) {
  labirentHazirla();
  const cam = kamera(t, Z);
  const ax = W / 2, ay = H / 2; // adam ekranın ortasında
  const az = cam.z / Z_SON;
  const isik = an(t, Z.egr, 0.7, ease.inOutSine);
  const sicaklik = an(t, Z.sah, 0.6);
  const Rs = 1900 * an(t, Z.bul + 0.12, 1.0, (u) => u * u * (1.6 - 0.6 * u)); // erime yarıçapı (ekran px)
  // ışık yolu: "bulsa"da adamın önünden yukarı (ışığa) doğru açılır
  const yolU = an(t, YOL.t0, YOL.sure, ease.inOutSine);
  const yOn = yolOnu(t, cam);

  // 1) taban: s09'un son karesi (labirent + kenar kararması; adam ayrıca çizilir), kamera bizim
  const tb = tampon('lab-taban');
  const g = tb.getContext('2d');
  const yedek = { ...SON_KAMERA };
  Object.assign(SON_KAMERA, cam);
  try { sonKareCiz(g, t, { adam: false }); } finally { Object.assign(SON_KAMERA, yedek); }
  // ışık geldikçe kenar kararması açılır
  if (isik > 0) {
    g.save();
    g.globalCompositeOperation = 'screen';
    const gr = g.createRadialGradient(ax, ay, 100, ax, ay, 1200);
    gr.addColorStop(0, `rgba(255,246,222,${0.2 * isik})`);
    gr.addColorStop(1, `rgba(222,214,232,${0.16 * isik})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  // 1b) ışık yolu tabana işlenir: koridorun içi sıcak taranmış ışık zemini olur, yolu kesen duvarlar bu zeminin altında
  // kalır (eriyip gider); yan duvarlar yerinde kalır
  if (yolU > 0) {
    // yolu kesen duvarların altın kopyası (ön geçince parlar, sonra söner: duvar ışığa dönüşüp erir)
    const tdv = tampon('lab-yol-duvar');
    const gd = tdv.getContext('2d');
    let duvarVar = false;
    gd.fillStyle = '#000';
    for (const d of yolDuvarlari(cam)) {
      const tv = onVaris(d.y, cam);
      const a = 1 - an(t, tv + 0.04, YOL.erime, ease.inOutSine);
      if (t < tv - 0.06 || a <= 0.003) continue;
      gd.globalAlpha = a;
      gd.fillRect(d.x0 - 1.5, d.y0 - 1.5, d.x1 - d.x0 + 3, d.y1 - d.y0 + 3);
      duvarVar = true;
    }
    gd.globalAlpha = 1;
    if (duvarVar) {
      gd.globalCompositeOperation = 'source-in';
      gd.filter = 'sepia(0.75) saturate(1.7) brightness(1.22)';
      gd.drawImage(tb, 0, 0);
      gd.filter = 'none';
    }
    const tm = tampon('lab-yol-maske');
    yolMaskesi(tm.getContext('2d'), cam, yOn);
    const ty = tampon('lab-yol');
    const gy = ty.getContext('2d');
    sicakZeminCiz(gy, cam);
    gy.globalCompositeOperation = 'destination-in';
    gy.drawImage(tm, 0, 0);
    g.drawImage(ty, 0, 0);
    // yolun yumuşak ışıması (kenarlara ve açıklıklara sızar)
    const tp = tampon('lab-yol-isil');
    const gp = tp.getContext('2d');
    gp.filter = `blur(${(14 * az).toFixed(1)}px)`;
    gp.drawImage(tm, 0, 0);
    gp.filter = 'none';
    gp.globalCompositeOperation = 'source-in';
    gp.fillStyle = '#FFE7A8';
    gp.fillRect(0, 0, W, H);
    g.save();
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.5;
    g.drawImage(tp, 0, 0);
    g.restore();
    if (duvarVar) g.drawImage(tdv, 0, 0);
  }

  // 2) altın kopya (merkezden yayılan erime cephesi için), tabandan türetilir
  let tAltin = null;
  if (Rs > 4) {
    tAltin = tampon('lab-altin');
    const ga = tAltin.getContext('2d');
    ga.filter = 'sepia(0.7) saturate(1.6) brightness(1.16)';
    ga.drawImage(tb, 0, 0);
    ga.filter = 'none';
    const b = 150;
    const m = seritMaskesi('lab-serit-altin', ax, ay, [[0, 0], [Math.max(0, Rs - b), 0], [Math.max(0.6, Rs - b * 0.4), 0.9], [Rs + 4, 0.8], [Rs + 34, 0]]);
    ga.globalCompositeOperation = 'destination-in';
    ga.drawImage(m, 0, 0);
    ga.globalCompositeOperation = 'source-over';
  }
  // 3) tabanı ışık alanında sil (yoldan iki yana genişleyen şerit)
  if (Rs > 1) {
    const m = seritMaskesi('lab-serit-sil', ax, ay, [[0, 1], [Math.max(0.5, Rs - 70), 1], [Rs, 0]]);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(m, 0, 0);
    g.globalCompositeOperation = 'source-over';
  }

  // 4) çizim: sıcak ışık zemini (silinen yerlerde görünür), taban, altın cephe
  if (Rs > 1) {
    sicakZeminCiz(ctx, cam);
    // yumuşak ışıma da şerit biçiminde (adamı ortalayan disk değil); erime büyüdükçe belirir
    const Rh = Math.max(140, Rs * 0.9), gh = 0.4 * clamp(Rs / 260);
    seritIsik(ctx, 'lab-serit-hale', ax, ay, [[0, gh], [Rh * 0.35, gh * 0.45], [Rh, 0]], '#FFE7AE');
  }
  ctx.drawImage(tb, 0, 0);
  if (tAltin) {
    ctx.drawImage(tAltin, 0, 0);
    const r0 = Math.max(0, Rs - 150);
    seritIsik(ctx, 'lab-serit-cephe', ax, ay, [[0, 0], [r0, 0], [r0 + 0.7 * (Rs + 30 - r0), 0.3], [Rs + 30, 0]], '#FFECB4');
  }
  // 4b) caddedeki duvarlar ışığa dönüşür: ön gelince duvar altın ışıkla parlar, eridikçe ışık söner
  if (yolU > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const d of yolDuvarlari(cam)) {
      const tv = onVaris(d.y, cam);
      const k = Math.sin(Math.PI * clamp((t - tv + 0.04) / (YOL.erime + 0.12)));
      if (k <= 0.01) continue;
      const cx = (d.x0 + d.x1) / 2, rx = (d.x1 - d.x0) / 2 + 14 * az, ry = (d.y1 - d.y0) / 2 + 14 * az;
      const R = Math.max(rx, ry);
      const gr = ctx.createRadialGradient(cx, d.y, 0, cx, d.y, R);
      gr.addColorStop(0, `rgba(255,236,170,${0.55 * k})`);
      gr.addColorStop(0.55, `rgba(255,226,150,${0.25 * k})`);
      gr.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = gr;
      ctx.save();
      ctx.translate(cx, d.y);
      ctx.scale(rx / R, ry / R);
      ctx.fillRect(-R, -R, 2 * R, 2 * R);
      ctx.restore();
    }
    ctx.restore();
  }

  // 5) adamın çevresi: s09 bittikten sonra ışık gelmeden önce göz onu bulsun (çevre hafifçe kararır)
  const odak = an(t, 96.5, 0.35, ease.inOutSine) * (1 - an(t, Z.bul, 0.5));
  if (odak > 0.003) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    const R0 = 70 * Math.sqrt(az), R1 = 560 * Math.sqrt(az);
    const gr = ctx.createRadialGradient(ax, ay, R0, ax, ay, R1);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(1, `rgba(${255 - 48 * odak},${255 - 50 * odak},${255 - 30 * odak},1)`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // 6) yukarıdan inen yumuşak huzme; ışık zemine düşer (adamın ayaklarının çevresinde uzunca, yumuşak bir ışık
  // birikintisi ve dağınık lekeler). Işın halesi yok: adam ışığın içinde, ışık onun üstünü beyazlatmaz.
  if (isik > 0) {
    huzme(ctx, W / 2 + 24, -260, lerp(30, 230, isik), ax, ay - 6 * az, (20 + 8 * sicaklik) * az + 10, isik * 0.9, {});
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(ax, ay - 26 * az);
    ctx.scale(1, 1.45);
    const R = 95 * az;
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    gr.addColorStop(0, rgba('#FFEDB8', 0.42 * isik));
    gr.addColorStop(0.55, rgba('#FFE6A6', 0.2 * isik));
    gr.addColorStop(1, rgba('#FFE6A6', 0));
    ctx.fillStyle = gr;
    ctx.fillRect(-R, -R, 2 * R, 2 * R);
    ctx.restore();
    // dağınık lekeler (yavaşça kayar, sıcaklıkla belirginleşir)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const l of lekeler) {
      const a = l.a * isik * (0.5 + 0.5 * sicaklik) * an(t, Z.egr + 0.2 + l.gec, 0.6) * (1 - an(t, Z.bul + 0.3, 0.5));
      if (a <= 0.004) continue;
      const lx = ax + (l.x + 6 * Math.sin(t * 0.7 + l.faz)) * az, ly = ay + (l.y + 4 * Math.cos(t * 0.5 + l.faz)) * az;
      ctx.save();
      ctx.translate(lx, ly);
      ctx.rotate(l.don);
      ctx.scale(1, l.ry / l.rx);
      const R2 = l.rx * az;
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, R2);
      g2.addColorStop(0, rgba('#FFEBB4', a));
      g2.addColorStop(1, rgba('#FFEBB4', 0));
      ctx.fillStyle = g2;
      ctx.fillRect(-R2, -R2, 2 * R2, 2 * R2);
      ctx.restore();
    }
    ctx.restore();
  }
  // adam: 96,1'den beri s10 çizer (s09'un adamıyla aynı; tabanda adam yok). Huzme inince ayaklarından geriye
  // (ekranda aşağı, ışığın tersine) uzun, yumuşak bir insan gölgesi düşer: ayakta duran bir insan olduğu uzaktan da
  // okunur (ışık onun çevresinde hale değil, zeminde gölge ve aydınlık olarak görünür)
  const adam = adamDurumu(t, Z);
  if (isik > 0) uzunGolge(ctx, cam, adam, isik * (1 - an(t, Z.bul + 0.3, 0.5)));
  labirentAdamCiz(ctx, cam, adam);
  if (isik > 0) zerreler(ctx, ax - 110, ay - 900, 220, 860, t, { sayi: 20, alfa: 0.6 * isik, hiz: 60, tohum: 8, boy: 2.4 });
  // 7) erime zerreleri: yolu kesen duvarlardan ve merkezden yayılan cepheden yükselen ışık
  if (yolU > 0 && t < YOL.t0 + YOL.sure + YOL.erime + 0.3) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const d of yolDuvarlari(cam)) {
      const omur = clamp((t - onVaris(d.y, cam)) / (YOL.erime + 0.25));
      if (omur <= 0 || omur >= 1) continue;
      const r = rng(500 + d.id);
      for (let k = 0; k < 3; k++) {
        const px = lerp(d.x0, d.x1, r()), py = lerp(d.y0, d.y1, r()) - 70 * omur * r.ara(0.5, 1.2) * az;
        const b = (2 + r() * 2.4) * Math.sqrt(az);
        const al = 0.8 * Math.sin(Math.PI * omur);
        const gr = ctx.createRadialGradient(px, py, 0, px, py, b * 3);
        gr.addColorStop(0, `rgba(255,244,205,${al})`);
        gr.addColorStop(1, 'rgba(255,244,205,0)');
        ctx.fillStyle = gr;
        ctx.fillRect(px - b * 3, py - b * 3, b * 6, b * 6);
      }
    }
    ctx.restore();
  }
  if (Rs > 10 && Rs < 2400) {
    const r = rng(77);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 80; i++) {
      const a = r() * TAU, gecik = r() * 0.5, rd = r(), ry = r(), rb = r(), rf = r();
      const d = Rs - rd * Math.min(160, Rs * 0.55);
      if (d < 70 * az) continue; // adamın üstüne birikip onu beyazlatmasın
      const omur = clamp(t - (Z.bul + 0.12) - gecik, 0, 1);
      // şerit cephesinde: üst yarıda yolun iki yanındaki dikey cephelerde, altta yarım daire üzerinde
      const ust = Math.sin(a) < 0;
      const px = ust ? ax + Math.sign(Math.cos(a)) * d : ax + Math.cos(a) * d;
      const py = (ust ? lerp(ay, -60, -Math.sin(a)) : ay + Math.sin(a) * d) - 50 * (ry + 0.5) * omur;
      const b = 2.4 + rb * 3.2;
      const al = 0.75 * Math.sin(Math.PI * clamp((t * 1.7 + rf) % 1)) * clamp((Rs - 60) / 160);
      const gr = ctx.createRadialGradient(px, py, 0, px, py, b * 3);
      gr.addColorStop(0, `rgba(255,244,205,${al})`);
      gr.addColorStop(1, 'rgba(255,244,205,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(px - b * 3, py - b * 3, b * 6, b * 6);
    }
    ctx.restore();
  }
  // 8) bulutlar: s09 bittikten sonra kenarlardan sızar, huzmeyle yarılıp uzaklaşır
  const gir = an(t, 96.42, 0.4, ease.outCubic);
  const yaril = an(t, Z.egr - 0.05, 1.2, ease.inOutCubic);
  const bulutA = gir * (1 - an(t, Z.bul - 0.2, 0.7));
  if (bulutA > 0.005) {
    bulutlar.forEach((b, i) => {
      const k = (1 - gir) * 260 + yaril * 640;
      bulutPuf(ctx, b.x + b.dx * k + Math.sin(t * 0.4 + b.x) * 6, b.y + b.dy * k, b.w * (1 + 0.25 * yaril), 0.8 * bulutA, 40 + i);
    });
  }
  return { cam, ax, ay };
}
