// S27 — Kaynak (114.7–122.0 sn)
// Kamerayla çekilmiş gibi gerçekçi Risale-i Nur Külliyatı ve Kur'an-ı Kerim (Blender Cycles ile işlendi),
// ağır bir kamera itmesi, ışık hüzmesinde süzülen toz zerreleri ve kaynak yazısı:
//   Risale-i Nur / Lem’alar / Yirmi Beşinci Lem’a / 240. Sayfa
'use strict';
const fs = require('fs');
const path = require('path');
const { Image, createCanvas } = require('@napi-rs/canvas');
const C = require('../engine/core');
const G = require('../engine/gloss');
const { seg, E, lerp, clamp, rgba } = C;

const BOOKS = path.join(__dirname, '..', 'books', 'books_final_8bit.png');
const DEPTH = path.join(__dirname, '..', 'books', 'books_depth_8bit.png');
let img = null, dep = null, grain = [];

// ham RGBA (1440x2560) — eşzamanlı yükleme (Image.src çözümü eşzamansız olduğundan)
function load(p) {
  const raw = p.replace(/_8bit\.png$/, '.rgba');
  if (!fs.existsSync(raw)) return null;
  const Wd = 1440, Hd = 2560, buf = fs.readFileSync(raw);
  const cv = createCanvas(Wd, Hd), x = cv.getContext('2d');
  const id = x.createImageData(Wd, Hd); id.data.set(buf); x.putImageData(id, 0, 0);
  return cv;
}

module.exports = {
  init() {
    img = load(BOOKS);
    // fotoğraf greni: birkaç kare döngüsü
    for (let k = 0; k < 6; k++) {
      const cv = createCanvas(540, 960), x = cv.getContext('2d');
      const d = x.createImageData(540, 960), r = C.rng(900 + k);
      for (let i = 0; i < d.data.length; i += 4) { const v = 128 + r.gauss() * 22; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
      x.putImageData(d, 0, 0); grain.push(cv);
    }
  },
  draw(ctx, t, lt, sc) {
    const { W, H } = C;
    const dur = sc.end - sc.start;
    const k = E.inOutSine(seg(t, sc.start - 0.5, sc.end));
    if (img) {
      // kapla (üst kenara hizalı) + ağır itme: kitaplar ile Kur'an arasındaki noktaya doğru
      const f = lerp(1.0, 1.05, k), ax = 540, ay = 1100;
      const w = W * f, h = (img.height * W / img.width) * f;
      ctx.drawImage(img, ax - ax * f, ay - ay * f, w, h);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2A1A14'); g.addColorStop(1, '#6A4A34');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    // ışık hüzmesinde toz zerreleri (sol üstten gelen pencere ışığı)
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    const r = C.rng(77);
    for (let i = 0; i < 70; i++) {
      const sp = r.range(6, 22), ph = r.range(0, 100);
      const px = (r.range(-100, W) + (t * sp + ph * 3) % (W + 200)) % (W + 100);
      const py = r.range(150, H * 0.85) + Math.sin(t * r.range(0.3, 0.9) + ph) * 30 - t * r.range(2, 8) % 60;
      const beam = clamp(1 - Math.abs((px - (W * 0.15 + py * 0.35)) / 420)); // çapraz hüzme
      const a = beam * r.range(0.15, 0.55) * (0.6 + 0.4 * Math.sin(t * r.range(1, 3) + ph));
      if (a < 0.02) continue;
      const s = r.range(1.2, 3.4);
      const gr = ctx.createRadialGradient(px, py, 0, px, py, s * 2.5);
      gr.addColorStop(0, rgba('#FFE7B8', a)); gr.addColorStop(1, rgba('#FFE7B8', 0));
      ctx.fillStyle = gr; ctx.fillRect(px - s * 3, py - s * 3, s * 6, s * 6);
    }
    ctx.restore();
    // üstte yazı için yumuşak koyulaştırma
    const top = ctx.createLinearGradient(0, 0, 0, H * 0.34);
    top.addColorStop(0, 'rgba(14,9,6,0.62)'); top.addColorStop(0.65, 'rgba(14,9,6,0.28)'); top.addColorStop(1, 'rgba(14,9,6,0)');
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, H * 0.34);
    // fotoğraf greni ve köşe kararması
    ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.16;
    ctx.drawImage(grain[Math.floor(t * 24) % grain.length], 0, 0, W, H); ctx.restore();
    const vg = ctx.createRadialGradient(W / 2, H * 0.55, H * 0.3, W / 2, H * 0.55, H * 0.8);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,6,4,0.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    // kaynak yazısı
    G.loadFonts();
    const lines = [
      { txt: 'Risale-i Nur', font: '600 50px "Cormorant SemiBold"', y: 150, col: '#E8C88A', t0: 115.35, sp: 5 },
      { txt: 'Lem’alar', font: '700 120px "Cormorant Bold"', y: 292, col: '#FFF6E6', t0: 115.85, sp: 1 },
      { txt: 'Yirmi Beşinci Lem’a', font: '58px "Garamond Italic"', y: 374, col: '#F4E6CC', t0: 116.4, sp: 0.5 },
      { txt: '240. Sayfa', font: '42px "Garamond SemiBold"', y: 452, col: '#E8C88A', t0: 116.95, sp: 4 },
    ];
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (const L of lines) {
      const a = E.outCubic(seg(t, L.t0, L.t0 + 0.7));
      if (a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = L.font;
      try { ctx.letterSpacing = `${L.sp}px`; } catch (e) { /* desteklenmiyorsa geç */ }
      const yy = L.y + (1 - a) * 18;
      ctx.shadowColor = 'rgba(8,4,2,0.7)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 3;
      ctx.fillStyle = L.col; ctx.fillText(L.txt, W / 2, yy);
      ctx.restore();
    }
    // ince altın çizgi (başlık ile alt satırlar arası)
    const ra = E.inOutCubic(seg(t, 115.6, 116.6));
    if (ra > 0) {
      ctx.save(); ctx.strokeStyle = 'rgba(232,200,138,0.85)'; ctx.lineWidth = 2;
      const hw = 150 * ra;
      ctx.beginPath(); ctx.moveTo(W / 2 - hw, 186); ctx.lineTo(W / 2 + hw, 186); ctx.stroke();
      ctx.fillStyle = 'rgba(232,200,138,0.95)';
      ctx.beginPath(); ctx.moveTo(W / 2, 180); ctx.lineTo(W / 2 + 6, 186); ctx.lineTo(W / 2, 192); ctx.lineTo(W / 2 - 6, 186); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // sona doğru yumuşak kararma (döngüde açılışa bağlanır)
    const out = seg(t, sc.end - 0.6, sc.end);
    if (out > 0) { ctx.fillStyle = `rgba(8,6,14,${E.inOutSine(out)})`; ctx.fillRect(0, 0, W, H); }
  },
  sfx: [
    { t: 114.75, type: 'swell', gain: 0.22 },
    { t: 115.85, type: 'chime', gain: 0.16 },
  ],
};
