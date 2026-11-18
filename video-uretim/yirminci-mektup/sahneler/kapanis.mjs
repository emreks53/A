// Kapanış (110,3–117): gerçekçi Risale-i Nur Külliyatı ve Kur'an-ı Kerim (Blender/Cycles fotoğrafı) ve kaynak.
// İki kare aynı kameradan: biri Kur'an'a, biri önde yatan Mektubat'a odaklı. Gerçek kamera gibi: çok yavaş itme,
// hafif el salınımı, odak kaydırma (arka → ön), ışık huzmesinde süzülen toz zerreleri, film greni, köşe kararması.
// Kaynak yazısı: Risale-i Nur / Mektubat / Yirminci Mektup / 243. Sayfa.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { loadImage, W, H, KOK, clamp, lerp, ease, an, rng, gurultu2, tuval, TAU } from '../motor/temel.mjs';

const DIZIN = path.join(KOK, 'kapanis', 'kareler');
const yukle = async (ad) => {
  const p = path.join(DIZIN, ad);
  return existsSync(p) ? loadImage(p) : null;
};
const KURAN = await yukle('kuran-odak.png');
const MEKTUBAT = await yukle('mektubat-odak.png');

const T0 = 110.3; // sahne başı
const ODAK0 = 111.15, ODAK1 = 113.3; // odak kaydırma
const YAZI0 = 111.7; // kaynak yazısının girişi
const SON = 117.0;

let gren = null;
const toz = [];

function yaziCiz(ctx, metin, x, y, { font, renk, harfAra = 0, alfa = 1, golge = 0.55 }) {
  if (alfa <= 0) return;
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (harfAra) ctx.letterSpacing = `${harfAra}px`;
  ctx.shadowColor = `rgba(18,10,6,${golge})`;
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 3;
  ctx.fillStyle = renk;
  ctx.fillText(metin, x, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillText(metin, x, y);
  ctx.restore();
}

export default {
  gecis: { tip: 'beyaz' },
  filmYok: true,
  sesler: [
    { t: 110.45, tur: 'nur', guc: 0.4, sure: 2.4 },
    { t: YAZI0, tur: 'firca', guc: 0.25 },
  ],
  hazirla() {
    // film greni: birkaç kare önceden üretilir, sırayla döner
    gren = [];
    const r = rng(77);
    for (let k = 0; k < 6; k++) {
      const c = tuval(W / 2, H / 2);
      const g = c.getContext('2d');
      const img = g.createImageData(W / 2, H / 2);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = 128 + (r() + r() + r() - 1.5) * 34;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      gren.push(c);
    }
    const rr = rng(5);
    for (let i = 0; i < 70; i++) toz.push({ x: rr.ara(-0.1, 0.75), y: rr.ara(0.05, 0.8), z: rr.ara(0.3, 1.6), f: rr() * TAU, h: rr.ara(0.3, 1) });
  },
  ciz(ctx, t) {
    const u = clamp((t - T0) / (SON - T0));
    // yavaş itme (gerçek kamera): ölçek ve hafif kayma
    const itme = lerp(1.0, 1.06, ease.inOutSine(u));
    const n = gurultu2(31);
    const sx = n(t * 0.35, 0.3) * 3.5, sy = n(0.7, t * 0.33) * 3.5, sr = n(t * 0.2, 5.1) * 0.0012;
    const odak = ease.inOutCubic(clamp((t - ODAK0) / (ODAK1 - ODAK0)));
    const nefes = 1 + 0.004 * Math.sin(Math.PI * odak); // odak "nefesi"
    ctx.save();
    ctx.fillStyle = '#120C09';
    ctx.fillRect(0, 0, W, H);
    if (KURAN || MEKTUBAT) {
      const img = MEKTUBAT || KURAN;
      const taban = W / img.width;
      const s = taban * itme * nefes;
      // itme, üstteki Kur'an kadrajdan taşmasın diye karenin üst üçte birine sabitlenir
      ctx.translate(W / 2 + sx, H * 0.3 + sy);
      ctx.rotate(sr);
      ctx.scale(s, s);
      ctx.translate(-img.width / 2, -img.height * 0.3);
      if (KURAN && odak < 1) ctx.drawImage(KURAN, 0, 0);
      if (MEKTUBAT && odak > 0) {
        ctx.globalAlpha = KURAN ? odak : 1;
        ctx.drawImage(MEKTUBAT, 0, 0);
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    // ışık huzmesinde toz zerreleri (soldan gelen pencere ışığı)
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const p of toz) {
      const x = (p.x + 0.012 * Math.sin(t * 0.3 * p.h + p.f) + (t - T0) * 0.004 * p.h) * W;
      const y = (p.y + 0.01 * Math.cos(t * 0.25 * p.h + p.f) - (t - T0) * 0.003 * p.h) * H;
      const isik = clamp(1.1 - (x / W) * 1.2) * clamp(1.2 - y / H);
      const r = 1.2 + 2.4 * p.z;
      const a = 0.16 * isik * (0.5 + 0.5 * Math.sin(t * 1.3 * p.h + p.f)) * an(t, T0 + 0.4, 1.2);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
      g.addColorStop(0, `rgba(255,238,210,${a})`);
      g.addColorStop(1, 'rgba(255,238,210,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r * 2.4, y - r * 2.4, r * 4.8, r * 4.8);
    }
    // sol üstten gelen ışığın hafif sızması
    const sz = ctx.createRadialGradient(-W * 0.1, H * 0.12, 0, -W * 0.1, H * 0.12, H * 0.7);
    sz.addColorStop(0, 'rgba(255,226,180,0.10)');
    sz.addColorStop(1, 'rgba(255,226,180,0)');
    ctx.fillStyle = sz;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // köşe kararması (objektif)
    ctx.save();
    const v = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.32, W / 2, H * 0.5, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(10,6,4,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
    // alt yazı için tabanda yumuşak koyulaşma
    const alt = ctx.createLinearGradient(0, H * 0.66, 0, H);
    alt.addColorStop(0, 'rgba(14,8,5,0)');
    alt.addColorStop(1, `rgba(14,8,5,${0.42 * an(t, YAZI0 - 0.6, 1.2)})`);
    ctx.fillStyle = alt;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // kaynak
    const giris = (k) => an(t, YAZI0 + k * 0.32, 0.9, ease.outCubic);
    const dy = (k) => (1 - giris(k)) * 18;
    const y0 = 1500;
    yaziCiz(ctx, 'Risale-i Nur', W / 2, y0 + dy(0), { font: '600 60px "Cormorant Garamond"', renk: '#EFE4D2', harfAra: 2.5, alfa: giris(0) });
    // ince yaldız ayraç
    const ay = giris(1);
    if (ay > 0) {
      ctx.save();
      ctx.globalAlpha = ay * 0.9;
      ctx.strokeStyle = '#D6B26A';
      ctx.lineWidth = 1.6;
      const yy = y0 + 40, w0 = 150 * ay;
      ctx.beginPath(); ctx.moveTo(W / 2 - w0, yy); ctx.lineTo(W / 2 - 12, yy); ctx.moveTo(W / 2 + 12, yy); ctx.lineTo(W / 2 + w0, yy); ctx.stroke();
      ctx.fillStyle = '#D6B26A';
      ctx.beginPath(); ctx.moveTo(W / 2, yy - 6); ctx.lineTo(W / 2 + 6, yy); ctx.lineTo(W / 2, yy + 6); ctx.lineTo(W / 2 - 6, yy); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    yaziCiz(ctx, 'Mektubat', W / 2, y0 + 140 + dy(1), { font: '700 112px "Cormorant Garamond"', renk: '#FBF5EA', harfAra: 1, alfa: giris(1) });
    yaziCiz(ctx, 'Yirminci Mektup', W / 2, y0 + 214 + dy(2), { font: 'italic 500 56px "Cormorant Garamond"', renk: '#F1E7D6', alfa: giris(2) });
    yaziCiz(ctx, '243. Sayfa', W / 2, y0 + 286 + dy(3), { font: '600 42px "Cormorant SC SemiBold"', renk: '#DDBA72', harfAra: 6, alfa: giris(3) });

    // film greni
    if (gren) {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.11;
      ctx.drawImage(gren[Math.floor(t * 24) % gren.length], 0, 0, W, H);
      ctx.restore();
    }
    // bitiş: yumuşak kararma
    const kar = an(t, SON - 0.7, 0.7, ease.inOutSine);
    if (kar > 0) {
      ctx.fillStyle = `rgba(8,5,3,${kar})`;
      ctx.fillRect(0, 0, W, H);
    }
  },
};
