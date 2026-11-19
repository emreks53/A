// s10 açılışı: s09'un son karesi birebir (kuşbakışı devasa gri labirent, ortada elleri başında küçücük adam).
// s09'un labirent modülü ve son kare çizicisi içe aktarılır (s09 dosyaları değiştirilmez): 96,1–96,5 arasında s09'un
// kamerası aynen izlenir, böylece çapraz geçişte çift görüntü olmaz. Sonra: bulutlar kenarlardan sızar ve bir ışık
// huzmesi onları yararak adamın üzerine iner ("Eğer sahibini"); adamdan ışığa giden düz bir yol açılır ("bulsa"),
// duvarlar merkezden dışa altın ışığa dönüşüp erir; kamera adama dalar.
import { tuval, W, H, clamp, lerp, ease, an, rng, TAU, rgba } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, TON } from '../motor/kalem.mjs';
import { dikdortgen } from '../motor/sekil.mjs';
import * as M from '../motor/motifler.mjs';
import * as LB from './s09-labirent.mjs';
import { tepeAdam } from './s09-figur.mjs';
import { SON_KAMERA, sonKareCiz, sonKareHazirla } from './s09.mjs';
import { tampon, radyalMaske, huzme, zerreler } from './s10-yardim.mjs';

const SON = { ...SON_KAMERA }; // s09'un son kamerası (adam ekranın ortasında, labirent 90° dönük)
const T_SERGERDAN = 93.57; // s09: adamın başını tutup sallanmaya başladığı an (salınım evresi için)

// s09'un 94,85–96,5 arası kamera eğrisi (çapraz geçişte birebir aynı görüntü için)
function s09Kamera(t) {
  const a = { t: 94.85, z: 1.36, r: 0.46 }, b = { t: 96.28, z: 0.113, r: Math.PI / 2 }, c = { t: 96.5, z: 0.1105, r: Math.PI / 2 };
  if (t <= b.t) {
    const e = ease.inOutCubic(clamp((t - a.t) / (b.t - a.t)));
    return { x: SON.x, y: SON.y, z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)), r: lerp(a.r, b.r, e) };
  }
  const e = clamp((t - b.t) / (c.t - b.t));
  return { x: SON.x, y: SON.y, z: Math.exp(lerp(Math.log(b.z), Math.log(c.z), e)), r: Math.PI / 2 };
}
// s09 sonunda adam ~18 px; s10 başlar başlamaz kamera adama yaklaşır (Z_ODAK'ta ~45 px), böylece "Eğer sahibini"de
// inen ışık görünür bir adamın üstüne iner. "bulsa"dan sonra (ilk itme bitmeden, duraksamadan) ışığa dalış.
const Z_ODAK = 0.27, Z_DALIS = 0.5;
function kamera(t, Z) {
  if (t <= 96.5) return s09Kamera(t);
  const u1 = ease.inOutSine(clamp((t - 96.5) / 0.8));
  const t2 = Z.bul - 0.22;
  const u2 = ease.inCubic(clamp((t - t2) / (Z.gecis + 0.25 - t2)));
  const z = Math.exp(Math.log(0.1105) + Math.log(Z_ODAK / 0.1105) * u1 + Math.log(Z_DALIS / Z_ODAK) * u2);
  return { x: SON.x, y: SON.y, z, r: Math.PI / 2 + 0.07 * u2 };
}

// adamın s09 sonundaki duruşu (elleri başında, hafifçe sallanır); ışık gelince elleri iner, başı kalkar
function adamCiz(ctx, cam, t, Z) {
  const dus = an(t, Z.sah + 0.1, 0.6, ease.inOutCubic); // elleri iner
  const tt = Math.max(96.3, t);
  const sal = 1 - dus;
  const h = -Math.PI - 0.3 + 0.22 * Math.sin((tt - T_SERGERDAN) * 3.4) * sal + 0.3 * dus; // ışığa (ekranda yukarı) döner
  const poz = { faz: 0, yuru: 0, eller: 1 - dus, sallan: 2.5 * Math.sin((tt - T_SERGERDAN) * 5.1) * sal, kipir: 0 };
  const buyut = Math.max(1, Math.pow(0.2 / 0.1105, 0.55));
  ctx.save();
  LB.labKameraUygula(ctx, cam);
  tepeAdam(ctx, SON.x, SON.y, h, poz, { s: 1.24 * buyut, ekranOlcek: cam.z, golgeYon: [11 * buyut, 15 * buyut] });
  ctx.restore();
}
// s09'un kenar kararması (yükseklikte kenarlar kararır, ışık adamın çevresinde toplanır)
function kenarKarart(ctx, cam, guc = 1) {
  const yuk = clamp((1.2 - cam.z) / 1.0) * guc;
  if (yuk <= 0) return;
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
// kuşbakışı bulut (yuvarlak loblu leke): kameraya yakın, kenarlardan sızar, huzmeyle yarılır
function bulutUstten(w, tohum) {
  const r = rng(tohum);
  const parca = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = r.ara(0, w * 0.32);
    parca.push({ x: Math.cos(a) * d * 1.3, y: Math.sin(a) * d * 0.7, R: w * r.ara(0.16, 0.27) });
  }
  const pts = [];
  for (let k = 0; k < 180; k++) {
    const a = (k / 180) * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let best = 0;
    for (const p of parca) {
      const b = p.x * dx + p.y * dy, c2 = p.x * p.x + p.y * p.y - p.R * p.R, D = b * b - c2;
      if (D >= 0) best = Math.max(best, b + Math.sqrt(D));
    }
    pts.push([dx * best, dy * best]);
  }
  return oge({
    ad: `s10-bulut-ustten-${w}-${tohum}`, olcek: 0.7, sekil: [{ pts, kapali: true }], arka: '#CFCAD8', arkaAlfa: 0.7, arkaBulanik: 18, arkaTasma: false,
    tarama: { ton: TON.gurultulu(TON.radyal(0, 0, w * 0.6, 0.15, 0.85), 0.15, 0.01, tohum), renkler: [[0, '#C9C3D3'], [1, '#8F87A2']], yon: -0.16, aralik: 3.6, boy: [30, 90], kal: 1.2, alfa: 0.4, esikler: [0.35, 0.6] },
    kontur: null, pay: 24,
  });
}

// ---------------------------------------------------------------- hazırlık
let hazir = false, ince, sicakZemin, bulutlar;
export function labirentHazirla() {
  if (hazir) return;
  hazir = true;
  sonKareHazirla();
  LB.labirentHazirla();
  // dalış sırasında bulanmasın: adamın çevresi için daha ince bir ayrıntı seviyesi (s = 0.2)
  const b = LB.gorusKutusu({ x: SON.x, y: SON.y, z: 0.15, r: Math.PI / 2 }, 60);
  ince = LB.seviyeOlustur(0.2, b.x0 / LB.HUCRE - 1, b.y0 / LB.HUCRE - 1, b.x1 / LB.HUCRE + 1, b.y1 / LB.HUCRE + 1, { tohum: 11 });
  // eriyen labirentin altından çıkan sıcak ışık zemini (kalem taramalı)
  sicakZemin = oge({
    ad: 's10-lab-sicak3', olcek: 0.8, sekil: dikdortgen(0, 0, 1500, 2400), arka: '#F6E1AE', arkaAlfa: 0.85, arkaBulanik: 10,
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
}

/** Labirent evresi. Z: { egr, sah, bul, gecis } */
export function labirentCiz(ctx, t, Z) {
  labirentHazirla();
  const cam = kamera(t, Z);
  const ax = W / 2, ay = H / 2; // adam ekranın ortasında
  const isik = an(t, Z.egr, 0.7, ease.inOutSine);
  const sicaklik = an(t, Z.sah, 0.6);
  const Rs = 1900 * an(t, Z.bul + 0.12, 1.0, (u) => u * u * (1.6 - 0.6 * u)); // erime yarıçapı (ekran px)
  const yolU = an(t, Z.bul - 0.02, 0.45, ease.outCubic);
  const yolUst = lerp(ay, -80, yolU);
  const yolEn = LB.HUCRE * (1 - LB.DUVAR) * cam.z * 0.86;

  // 1) taban: s09'un son karesi (labirent + adam + kenar kararması), kamera bizim
  const tb = tampon('lab-taban');
  const g = tb.getContext('2d');
  const yedek = { ...SON_KAMERA };
  Object.assign(SON_KAMERA, cam);
  try { sonKareCiz(g, t); } finally { Object.assign(SON_KAMERA, yedek); }
  const inceA = clamp((cam.z - 0.14) / 0.04);
  if (inceA > 0) {
    // ince seviye kendi kenar kararmasıyla ayrı tamponda hazırlanır, sonra karışır: tabanın (s09'un zaten kararmış)
    // karesi ikinci kez kararmaz (geçişte parlaklık çukuru olmaz)
    const ti = tampon('lab-ince');
    const gi = ti.getContext('2d');
    LB.seviyeCiz(gi, cam, ince, { alfa: 1 });
    kenarKarart(gi, cam, 1 - isik * 0.6);
    g.save();
    g.globalAlpha = inceA;
    g.drawImage(ti, 0, 0);
    g.restore();
  }
  // 96,5'ten sonra adam (s10'un, sabit ölçekte) ışığın üstüne ayrıca çizilir (6. adım); tabandaki s09 adamı ondan küçük
  // ya da eşit kalır ve altında örtülür.
  // ışık geldikçe kenar kararması açılır
  if (isik > 0) {
    g.save();
    g.globalCompositeOperation = 'screen';
    const gr = g.createRadialGradient(ax, ay, 100, ax, ay, 1200);
    gr.addColorStop(0, `rgba(255,246,222,${0.22 * isik})`);
    gr.addColorStop(1, `rgba(222,214,232,${0.18 * isik})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  // 2) altın kopya (erime cephesi için), tabandan türetilir
  let tAltin = null;
  if (Rs > 4) {
    tAltin = tampon('lab-altin');
    const ga = tAltin.getContext('2d');
    ga.filter = 'sepia(0.7) saturate(1.6) brightness(1.16)';
    ga.drawImage(tb, 0, 0);
    ga.filter = 'none';
    const b = 150;
    radyalMaske(ga, ax, ay, [[0, 0], [Math.max(0, Rs - b), 0], [Math.max(0.6, Rs - b * 0.4), 0.9], [Rs + 4, 0.8], [Rs + 34, 0]], 'destination-in');
  }
  // 3) tabanı ışık alanında ve yol şeridinde sil
  if (Rs > 1) radyalMaske(g, ax, ay, [[0, 1], [Math.max(0.5, Rs - 70), 1], [Rs, 0]], 'destination-out');
  if (yolU > 0) {
    g.save();
    g.globalCompositeOperation = 'destination-out';
    const gr = g.createLinearGradient(0, ay, 0, yolUst);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.88, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(ax - yolEn / 2, yolUst, yolEn, ay - yolUst + 4);
    g.restore();
  }

  // 4) çizim: sıcak ışık zemini (silinen yerlerde görünür), taban, altın cephe
  if (Rs > 1 || yolU > 0) {
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(cam.r - Math.PI / 2);
    const zz = (cam.z / 0.1105) * 0.9;
    ctx.scale(zz, zz);
    ogeCiz(ctx, sicakZemin, -750, -1200);
    ctx.restore();
    M.hale(ctx, ax, ay, Math.max(200, Rs * 0.9), '#FFE7AE', 0.4);
  }
  ctx.drawImage(tb, 0, 0);
  if (tAltin) {
    ctx.drawImage(tAltin, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const gr = ctx.createRadialGradient(ax, ay, Math.max(0, Rs - 150), ax, ay, Rs + 30);
    gr.addColorStop(0, 'rgba(255,240,200,0)');
    gr.addColorStop(0.7, 'rgba(255,236,180,0.3)');
    gr.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // yol kenarlarında ince altın çizgiler
  if (yolU > 0) {
    for (const sx of [-1, 1]) konturCiz(ctx, [[ax + (sx * yolEn) / 2, ay - 6], [ax + (sx * yolEn) / 2, yolUst + 30]], { renk: '#D9A93F', kal: 1.8, alfa: 0.75 * (1 - an(t, Z.gecis - 0.3, 0.4)), kapali: false, titreme: 0.3, tohum: 30 + sx });
    M.hale(ctx, ax, Math.max(0, yolUst + 30), 100, '#FFF1C4', 0.5 * (1 - yolU * 0.6));
  }
  // 5) adamın çevresi: s09 bittikten sonra ışık gelmeden önce de göz onu bulsun (çevre hafifçe kararır, adamın
  // durduğu yer sıcak ve aydınlık bir benek olur)
  const az = cam.z / 0.1105;
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
    M.hale(ctx, ax, ay, 80 * Math.sqrt(az), '#FFDC8E', 0.62 * odak);
  }

  // 6) huzme ve havuz; adam ışıkta, havuzun üstünde (ışık onu silmez)
  if (isik > 0) {
    huzme(ctx, W / 2 + 30, -260, lerp(30, 250, isik), ax, ay, (16 + 10 * sicaklik) * az + 8, isik, {});
    M.hale(ctx, ax, ay, 90 * Math.sqrt(az) * (0.7 + 0.3 * sicaklik), '#FFF0BE', 0.6 * isik);
    M.hale(ctx, ax, ay, 26 * Math.sqrt(az), '#FFFFFF', 0.5 * isik);
    M.isinlar(ctx, ax, ay, 14 * Math.sqrt(az), 60 * Math.sqrt(az) * (0.6 + 0.4 * sicaklik), t, { sayi: 22, alfa: 0.45 * isik * sicaklik, kal: Math.max(1.4, 1.6 * Math.sqrt(az)), tohum: 5, renk: '#E2B44C' });
  }
  if (t > 96.5) {
    adamCiz(ctx, cam, t, Z);
    if (isik > 0) M.hale(ctx, ax, ay, 24 * Math.sqrt(az), '#FFF6DA', 0.22 * isik); // adamın üstünde sıcak ışık
  }
  if (isik > 0) zerreler(ctx, ax - 120, ay - 900, 240, 900, t, { sayi: 22, alfa: 0.7 * isik, hiz: 60, tohum: 8, boy: 2.6 });
  // 7) erime zerreleri (cepheden yükselen ışık)
  if (Rs > 10 && Rs < 2400) {
    const r = rng(77);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 80; i++) {
      const a = r() * TAU, gecik = r() * 0.5;
      const d = Math.max(0, Rs - r() * 160);
      const omur = clamp(t - (Z.bul + 0.12) - gecik, 0, 1);
      const px = ax + Math.cos(a) * d, py = ay + Math.sin(a) * d - 50 * (r() + 0.5) * omur;
      const b = 2.4 + r() * 3.2;
      const al = 0.75 * Math.sin(Math.PI * clamp((t * 1.7 + r()) % 1));
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
