// s10 açılışı: s09'un son karesi birebir (kuşbakışı devasa gri labirent, ortada küçük adam).
// s09'un labirent modülü, kamerası, adamı ve son kare çizicisi içe aktarılır: 96,1–96,5 arasında s09'un kamerası ve
// adamı aynen izlenir, böylece çapraz geçişte çift görüntü olmaz. Kamera s09'un yükselişinin bittiği yükseklikte durur
// (geri dalış yok); yalnız "bulsa"dan sonra ışığa doğru çok yavaş bir itme başlar.
// Kural: Allah'a dair hiçbir şey görselleştirilmez (yukarıdan inen ışık, huzme, nur, parıltı YOK). "Eğer sahibini
// bulsa": adam yönünü bulur (yolun açılacağı yöne döner); "bulsa"da önündeki duvarlar sade biçimde silinip yok olur
// (ışık değil: duvarlar solar, yerinde çıplak film kalır) ve üç hücre eninde düz, sakin bir yol açılır; adam o yolda
// yürümeye başlar. Ardından silinme yoldan iki yana genişleyen yumuşak bir şerit olarak labirenti çözer;
// s10.mjs'teki geçiş bunun içinden açılır.
import { W, H, clamp, lerp, ease, an, rng, TAU, rgba } from '../motor/temel.mjs';
import { oge, ogeCiz, TON } from '../motor/kalem.mjs';
import { dikdortgen } from '../motor/sekil.mjs';
import * as LB from './s09-labirent.mjs';
import { SON_KAMERA, Z_SON, labirentKamerasi, labirentAdamDurum, labirentAdamCiz, sonKareCiz, sonKareHazirla } from './s09.mjs';
import { tampon, huzme, zerreler } from './s10-yardim.mjs';

// açılan yolun ve çözülen labirentin zemini
const YOL_ZEMIN = '#D4D2D6'; // labirent koridorunun kendi zemin tonu (parlak bir ışık şeridi gibi okunmasın)
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
      gd.drawImage(tb, 0, 0);
    }
    const tm = tampon('lab-yol-maske');
    yolMaskesi(tm.getContext('2d'), cam, yOn);
    const ty = tampon('lab-yol');
    const gy = ty.getContext('2d');
    gy.fillStyle = YOL_ZEMIN;
    gy.fillRect(0, 0, W, H);
    gy.globalCompositeOperation = 'destination-in';
    gy.drawImage(tm, 0, 0);
    g.drawImage(ty, 0, 0);
    if (duvarVar) g.drawImage(tdv, 0, 0);
  }

  // 2) altın kopya (merkezden yayılan erime cephesi için), tabandan türetilir
  let tAltin = null;
  if (false) {
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
    ctx.fillStyle = YOL_ZEMIN;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(tb, 0, 0);
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

  // adam: 96,1'den beri s10 çizer (s09'un adamıyla aynı; tabanda adam yok). Huzme inince ayaklarından geriye
  // (ekranda aşağı, ışığın tersine) uzun, yumuşak bir insan gölgesi düşer: ayakta duran bir insan olduğu uzaktan da
  // okunur (ışık onun çevresinde hale değil, zeminde gölge ve aydınlık olarak görünür)
  const adam = adamDurumu(t, Z);
  labirentAdamCiz(ctx, cam, adam);
  return { cam, ax, ay };
}
