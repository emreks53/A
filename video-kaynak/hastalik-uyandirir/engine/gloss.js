// Kelime anlamları: eski kelimenin ilk harfi okunduğu anda, günümüz Türkçesindeki karşılığı zarif bir alt yazı olarak çıkar.
// Kutu yok, kelimenin kendisi yazılmaz; yalnız anlam. Yeni anlam gelince öncekiler yumuşakça yukarı kayar (en çok 3 satır).
'use strict';
const { GlobalFonts } = require('@napi-rs/canvas');
const path = require('path');
const C = require('./core');
const { E, clamp, seg, lerp } = C;

const FONT_DIR = path.join(__dirname, '..', 'assets', 'fonts');
let _fonts = false;
function loadFonts() {
  if (_fonts) return;
  const reg = (f, fam) => GlobalFonts.registerFromPath(path.join(FONT_DIR, f), fam);
  reg('EBGaramond-500Italic.ttf', 'Garamond Italic');
  reg('EBGaramond-600Italic.ttf', 'Garamond Italic SemiBold');
  reg('EBGaramond-500.ttf', 'Garamond');
  reg('EBGaramond-600.ttf', 'Garamond SemiBold');
  reg('EBGaramond-700.ttf', 'Garamond Bold');
  reg('CormorantGaramond-600Italic.ttf', 'Cormorant Italic');
  reg('CormorantGaramond-600.ttf', 'Cormorant SemiBold');
  reg('CormorantGaramond-700.ttf', 'Cormorant Bold');
  reg('Cinzel-500.ttf', 'Cinzel');
  reg('Cinzel-600.ttf', 'Cinzel SemiBold');
  _fonts = true;
}

const timing = require('../timing.json');
const BASE_Y = 1482;      // en yeni satırın taban çizgisi (karenin ~%77'si; %64–82 bandı içinde)
const LINE = 96;           // satır aralığı
const SIZE = 80;           // punto
const LEAD = 0.04;         // ilk harfle aynı karede belirgin görünsün diye ~1 kare önce başla
const FIN = 0.2, FOUT = 0.5;

// sahne sınırları (anlam, kelimesinin geçtiği sahne bitince söner; başka bir sahnenin üstünde kalmasın)
let _bounds = null;
function sceneEnd(t) {
  if (!_bounds) { try { _bounds = require('../scenes/index').LIST.map((s) => s.end); } catch (e) { _bounds = []; } }
  for (const b of _bounds) if (b > t) return b;
  return Infinity;
}
function glossTimes() {
  const g = timing.glosses.map((x) => ({ ...x }));
  for (let i = 0; i < g.length; i++) {
    const x = g[i];
    x.on = x.t - LEAD;
    // en az ~2.1 sn ya da kelime bitiminden 1.5 sn sonrasına kadar
    let off = Math.max(x.on + 2.15, x.wordEnd + 1.5);
    // iki yeni anlam geldiyse (3. satıra itilecekse) erken çık
    if (g[i + 2] && g[i + 2].t - LEAD < off) off = Math.max(g[i + 2].t - LEAD + 0.6, x.on + 1.2);
    // sahne kesmesinde sönmeye başlasın (en az ~1.05 sn tam görünür kalsın)
    off = Math.min(off, Math.max(sceneEnd(x.t) - 0.3, x.on + 1.05));
    x.off = off;
  }
  return g;
}
// döngüsel yüklemeyi önlemek için ilk kullanımda hesaplanır (gloss → scenes/index → s27 → gloss)
let _GL = null;
function GLs() { return _GL || (_GL = glossTimes()); }

function draw(ctx, t) {
  loadFonts();
  const GL = GLs();
  const vis = GL.filter((g) => t >= g.on && t < g.off + FOUT);
  if (!vis.length) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${SIZE}px "Garamond Italic"`;
  for (const g of vis) {
    // kaç tane daha yeni anlam görünür durumda → o kadar yukarı kay
    const newer = GL.filter((h) => h.on > g.on && h.on - 0.1 <= t && t < h.off + FOUT);
    let lift = 0;
    for (const h of newer) lift += E.outCubic(seg(t, h.on - 0.1, h.on + 0.18));
    const ain = E.outCubic(seg(t, g.on, g.on + FIN));
    let aout = 1 - E.inOutSine(seg(t, g.off, g.off + FOUT));
    // zaten sönerken yeni anlam gelirse hızla çekil (üst üste binmesin)
    for (const h of newer) if (h.on >= g.off - 0.05) aout = Math.min(aout, 1 - E.outCubic(seg(t, h.on - 0.02, h.on + 0.12)));
    const a = ain * aout * (1 - 0.18 * clamp(lift));
    if (a <= 0.003) continue;
    const y = BASE_Y - lift * LINE + (1 - ain) * 26 - (1 - aout) * 10;
    const x = C.W / 2;
    const sc = lerp(0.965, 1, ain);
    ctx.save();
    ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.globalAlpha = a;
    // geniş, yumuşak koyu hale (kutu değil): okunurluk için
    ctx.shadowColor = 'rgba(16,10,28,0.62)'; ctx.shadowBlur = 34; ctx.shadowOffsetY = 3;
    ctx.fillStyle = 'rgba(255,248,236,1)';
    ctx.fillText(g.text, 0, 0);
    // ikinci geçiş: daha sıkı gölge + sıcak fildişi
    ctx.shadowColor = 'rgba(20,12,24,0.55)'; ctx.shadowBlur = 7; ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#FFF7E8';
    ctx.fillText(g.text, 0, 0);
    ctx.shadowColor = 'transparent';
    // ince altın parıltı: giriş anında soldan sağa akan ışık
    const sweep = seg(t, g.on + 0.05, g.on + 0.75);
    if (sweep > 0 && sweep < 1) {
      const w = ctx.measureText(g.text).width;
      const gx = lerp(-w / 2 - 80, w / 2 + 80, E.inOutSine(sweep));
      const grad = ctx.createLinearGradient(gx - 70, 0, gx + 70, 0);
      grad.addColorStop(0, 'rgba(255,214,140,0)'); grad.addColorStop(0.5, 'rgba(255,222,160,0.9)'); grad.addColorStop(1, 'rgba(255,214,140,0)');
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = grad; ctx.fillText(g.text, 0, 0);
    }
    ctx.restore();
  }
  ctx.restore();
}

module.exports = { draw, loadFonts, get GL() { return GLs(); }, BASE_Y, LINE };
