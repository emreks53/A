// Kapanış sahnesi dokuları: Risale-i Nur ciltlerinin sırtları (yaldız maskesi + kabartma yükseklik haritası) ve
// Kur'an-ı Kerim kapağı. Ölçüler gerçek RNK deri cildinden: sırt boyu 240 mm; uçlarda 5,5 / 9,2 / 12,6 mm'de üç
// kabartma sırt, 16–26 mm arasında başlığa bakan gözyaşı + ok motifli dantel şeridi, ortada yaldızlı EB Garamond ad.
import { createCanvas, GlobalFonts, Path2D } from '@napi-rs/canvas';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const KOK = path.dirname(fileURLToPath(import.meta.url));
const FONT = path.join(KOK, '..', 'yazitipi');
GlobalFonts.registerFromPath(path.join(FONT, 'EBGaramond-600.ttf'), 'EBG');
GlobalFonts.registerFromPath(path.join(FONT, 'Amiri-700.ttf'), 'Amiri');
const CIKTI = process.argv[2] || '/tmp/claude-0/kapanis/dokular';
mkdirSync(CIKTI, { recursive: true });

export const KITAPLAR = [
  ['sozler', 'Sözler', 0.1869], ['mektubat', 'Mektubat', 0.131], ['lemalar', 'Lem’alar', 0.115], ['sualar', 'Şuâlar', 0.1582],
  ['mesnevi', 'Mesnevî-i Nûriye', 0.0724], ['isarat', 'İşârâtü’l-İ’câz', 0.0844], ['barla', 'Barla Lâhikası', 0.1003],
  ['kastamonu', 'Kastamonu Lâhikası', 0.0751], ['emirdag', 'Emirdağ Lâhikası', 0.1097], ['sikke', 'Sikke-i Tasdîk-i Gaybî', 0.0644],
  ['tarihce', 'Tarihçe-i Hayat', 0.1489], ['asa', 'Asâ-yı Mûsâ', 0.0878], ['iman', 'İman ve Küfür Muvâzeneleri', 0.0692],
  ['muhakemat', 'Muhâkemat', 0.0614],
];
const PX = 10; // px / mm
const BOY = 240;
const MOTIF_DAMLA = new Path2D('M5 35C5 22 18 17.5 32 25.5L54 35L32 44.5C18 52.5 5 48 5 35Z');
const MOTIF_OK = new Path2D('M59 21.5L74 35L59 48.5');

function sirt(id, ad, oran) {
  const kalinlik = oran * BOY; // mm
  const yay = kalinlik * 1.12; // yuvarlak sırtın yay uzunluğu
  const w = Math.round(yay * PX), h = BOY * PX;
  const yuk = createCanvas(w, h), mask = createCanvas(w, h);
  const y = yuk.getContext('2d'), m = mask.getContext('2d');
  y.fillStyle = 'rgb(128,128,128)'; y.fillRect(0, 0, w, h);
  m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
  // uç sırtları (ribs): yükseltilmiş yuvarlak bantlar
  const rib = (mm) => {
    const c = mm * PX, r = 1.35 * PX;
    const g = y.createLinearGradient(0, c - r, 0, c + r);
    g.addColorStop(0, 'rgba(128,128,128,0)'); g.addColorStop(0.5, 'rgb(225,225,225)'); g.addColorStop(1, 'rgba(128,128,128,0)');
    y.fillStyle = g; y.fillRect(0, c - r, w, 2 * r);
  };
  for (const mm of [5.5, 9.2, 12.6]) { rib(mm); rib(BOY - mm); }
  // dantel şeridi: 16–26 mm, motif başlığa bakar
  const serit = (ust) => {
    const bant0 = ust ? 16 : BOY - 26;
    const tile = 8.8 * PX; // enine tekrar
    const uz = 10 * PX; // boyuna
    const n = Math.max(1, Math.round(w / tile));
    const tw = w / n;
    for (let i = 0; i < n; i++) {
      y.save();
      // motif koordinatı 80x70: x boyuna (başlığa doğru), y enine
      y.translate(i * tw + tw / 2, bant0 * PX + uz / 2);
      y.rotate(ust ? Math.PI / 2 : -Math.PI / 2);
      y.scale(uz / 80, tw / 70);
      y.translate(-40, -35);
      y.fillStyle = 'rgb(205,205,205)';
      y.fill(MOTIF_DAMLA);
      y.strokeStyle = 'rgb(205,205,205)'; y.lineWidth = 7.5; y.lineCap = 'round'; y.lineJoin = 'round';
      y.stroke(MOTIF_OK);
      y.restore();
    }
    // şeridin iki yanında ince çizgi (kör baskı)
    y.fillStyle = 'rgb(95,95,95)';
    y.fillRect(0, (bant0 - 0.6) * PX, w, 0.45 * PX);
    y.fillRect(0, (bant0 + 10.2) * PX, w, 0.45 * PX);
  };
  serit(true); serit(false);
  // başlık: sırt boyunca (yukarıdan aşağı okunur), yaldız
  const alan = BOY - 2 * 34; // mm
  let fs = Math.min(kalinlik * 0.5, 11) * PX; // yazı boyu (px)
  const olc = (s) => { m.font = `${s}px EBG`; return m.measureText(ad).width; };
  while (olc(fs) > alan * PX * 0.92 && fs > 10) fs *= 0.95;
  fs = Math.min(fs, (kalinlik * 0.62) * PX);
  for (const [ctx, renk] of [[m, '#fff'], [y, 'rgb(150,150,150)']]) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(Math.PI / 2);
    ctx.font = `${fs}px EBG`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = renk;
    ctx.fillText(ad, 0, fs * 0.04);
    ctx.restore();
  }
  writeFileSync(path.join(CIKTI, `sirt-${id}-yuk.png`), yuk.toBuffer('image/png'));
  writeFileSync(path.join(CIKTI, `sirt-${id}-yaldiz.png`), mask.toBuffer('image/png'));
  return { id, ad, kalinlik, yay };
}

// Kur'an-ı Kerim kapağı (ön): zencerek pervaz, köşebentler, ortada şemse ve "القرآن الكريم"
function kuranKapak() {
  const W_MM = 175, H_MM = 245, P = 10;
  const w = W_MM * P, h = H_MM * P;
  const yuk = createCanvas(w, h), mask = createCanvas(w, h);
  const y = yuk.getContext('2d'), m = mask.getContext('2d');
  y.fillStyle = 'rgb(128,128,128)'; y.fillRect(0, 0, w, h);
  m.fillStyle = '#000'; m.fillRect(0, 0, w, h);
  const ikisi = (fn) => { fn(m, '#fff'); fn(y, 'rgb(170,170,170)'); };
  // pervaz: iki ince çizgi ve arada zencerek (ince dolanan yaprak dizisi)
  ikisi((c, r) => {
    c.strokeStyle = r; c.lineWidth = 0.9 * P;
    c.strokeRect(9 * P, 9 * P, w - 18 * P, h - 18 * P);
    c.lineWidth = 0.5 * P;
    c.strokeRect(14.5 * P, 14.5 * P, w - 29 * P, h - 29 * P);
    // zencerek: iki çizgi arasında sıralı küçük baklava yapraklar
    c.fillStyle = r;
    const yap = (x, yy, a) => { c.save(); c.translate(x, yy); c.rotate(a); c.beginPath(); c.ellipse(0, 0, 1.6 * P, 0.7 * P, 0, 0, Math.PI * 2); c.fill(); c.restore(); };
    for (let x = 16 * P; x < w - 15 * P; x += 4.2 * P) { yap(x, 11.75 * P, 0.6); yap(x, h - 11.75 * P, -0.6); }
    for (let yy = 16 * P; yy < h - 15 * P; yy += 4.2 * P) { yap(11.75 * P, yy, 0.6 + Math.PI / 2); yap(w - 11.75 * P, yy, -0.6 + Math.PI / 2); }
  });
  // köşebentler: çeyrek daire içinde rumî kıvrımlı salbek
  const kose = (cx, cy, sx, sy) => ikisi((c, r) => {
    c.save(); c.translate(cx, cy); c.scale(sx, sy);
    c.fillStyle = r; c.strokeStyle = r;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(34 * P, 0); c.bezierCurveTo(32 * P, 14 * P, 14 * P, 32 * P, 0, 34 * P); c.closePath();
    c.lineWidth = 0.7 * P; c.stroke();
    c.beginPath(); c.moveTo(4 * P, 4 * P); c.lineTo(24 * P, 4 * P); c.bezierCurveTo(22 * P, 12 * P, 12 * P, 22 * P, 4 * P, 24 * P); c.closePath(); c.fill();
    c.restore();
  });
  kose(14.5 * P, 14.5 * P, 1, 1); kose(w - 14.5 * P, 14.5 * P, -1, 1); kose(14.5 * P, h - 14.5 * P, 1, -1); kose(w - 14.5 * P, h - 14.5 * P, -1, -1);
  // şemse: dilimli oval madalyon + salbekler
  const cx = w / 2, cy = h / 2;
  const semse = (c, r, dolu) => {
    c.save(); c.translate(cx, cy);
    c.beginPath();
    const N = 16, A = 44 * P, B = 62 * P;
    for (let k = 0; k <= N * 8; k++) {
      const t = (k / (N * 8)) * Math.PI * 2;
      const dil = 1 + 0.045 * Math.abs(Math.sin(t * N / 2));
      const x = Math.cos(t) * A * dil, yy = Math.sin(t) * B * dil;
      k ? c.lineTo(x, yy) : c.moveTo(x, yy);
    }
    c.closePath();
    if (dolu) { c.fillStyle = r; c.fill(); } else { c.strokeStyle = r; c.lineWidth = 0.8 * P; c.stroke(); }
    // salbekler (üst/alt)
    for (const s of [-1, 1]) {
      c.beginPath(); c.moveTo(-5 * P, s * 64 * P); c.lineTo(0, s * 78 * P); c.lineTo(5 * P, s * 64 * P); c.closePath();
      c.fillStyle = r; c.fill();
      c.beginPath(); c.arc(0, s * 82 * P, 2.2 * P, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  };
  // dış şemse yaldız (dolgu), içi deri (yazı alanı) — yazı yaldız
  semse(m, '#fff', true); semse(y, 'rgb(165,165,165)', true);
  const ic = (c, r) => {
    c.save(); c.translate(cx, cy); c.beginPath(); c.ellipse(0, 0, 37 * P, 54 * P, 0, 0, Math.PI * 2); c.fillStyle = r; c.fill(); c.restore();
  };
  ic(m, '#000'); ic(y, 'rgb(118,118,118)');
  ikisi((c, r) => {
    c.save(); c.translate(cx, cy);
    c.fillStyle = r; c.font = `${17 * P}px Amiri`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.direction = 'rtl';
    c.fillText('القرآن', 0, -12 * P);
    c.fillText('الكريم', 0, 18 * P);
    c.restore();
  });
  writeFileSync(path.join(CIKTI, 'kuran-kapak-yuk.png'), yuk.toBuffer('image/png'));
  writeFileSync(path.join(CIKTI, 'kuran-kapak-yaldiz.png'), mask.toBuffer('image/png'));
}

const bilgi = KITAPLAR.map(([id, ad, oran]) => sirt(id, ad, oran));
kuranKapak();
writeFileSync(path.join(CIKTI, 'kitaplar.json'), JSON.stringify(bilgi, null, 1));
console.log('dokular:', CIKTI);
