// Sözlük altyazısı: günümüz Türkçesinde kullanılmayan kelime okunduğu an (ilk harfiyle) karşılığı ekranda belirir.
// Yalnız mana yazılır (kelimenin kendisi yazılmaz), kutu yoktur: koyu mürekkep renginde zarif bir yazı, arkasında
// filmin beyazından yumuşak bir buğu. Art arda okunan kelimelerin manaları aynı satırda birleşir ("saf sevinç");
// arada bir kelime varsa ikinci satıra geçer ("Allah’ı tanıma" / "Allah sevgisidir").
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { KOK, clamp, ease, W, H, tuval } from './temel.mjs';
import { KELIMELER, kelime, ONCE, CUMLELER } from './zaman.mjs';

const SOZLUK = JSON.parse(readFileSync(path.join(KOK, 'veri', 'sozluk.json'), 'utf8')).liste;

export const YAZI = {
  font: (px) => `600 italic ${px}px "Cormorant Garamond"`,
  boy: 66,
  satirAra: 80,
  taban: 1548, // son satırın taban çizgisi (y)
  renk: '#1E2438',
  bugu: 'rgba(250,251,248,0.94)',
};

const okumaSuresi = (s) => 0.35 + s.length * 0.05;
const CIKIS = 0.28; // sönme süresi (sn)

/** Altyazı grupları: [{ bas, son, satirlar: [[{yazi, bas}]] }] */
export const GRUPLAR = (() => {
  const ogeler = SOZLUK.map((g) => {
    const k = kelime(g.kelime, g.kac);
    const sonK = KELIMELER[k.i + g.uzunluk - 1];
    return { mana: g.mana, i0: k.i, i1: sonK.i, bas: k.bas - ONCE, son: sonK.son, virgul: /,$/.test(sonK.yazi), ayri: !!g.ayri };
  }).sort((a, b) => a.bas - b.bas);
  const gruplar = [];
  let g = null;
  for (const o of ogeler) {
    const onceki = g && g.son_oge;
    const arada = onceki ? o.i0 - onceki.i1 - 1 : 99;
    const bosluk = onceki ? o.bas - onceki.son : 99;
    const ayniCumle = onceki && CUMLELER.findIndex((c) => onceki.i1 >= c.ilk && onceki.i1 <= c.son) === CUMLELER.findIndex((c) => o.i0 >= c.ilk && o.i0 <= c.son);
    if (g && !o.ayri && ayniCumle && bosluk < 0.86 && arada <= 1) {
      if (arada === 0) {
        // aynı satıra ekle
        const satir = g.satirlar[g.satirlar.length - 1];
        if (onceki.virgul) satir[satir.length - 1].yazi += ',';
        satir.push({ yazi: o.mana, bas: o.bas });
      } else if (g.satirlar.length < 2) {
        g.satirlar.push([{ yazi: o.mana, bas: o.bas }]);
      } else {
        g = null;
      }
      if (g) { g.son_oge = o; g.sonKelime = o.son; continue; }
    }
    g = { bas: o.bas, satirlar: [[{ yazi: o.mana, bas: o.bas }]], son_oge: o, sonKelime: o.son };
    gruplar.push(g);
  }
  // bitiş zamanları
  for (let i = 0; i < gruplar.length; i++) {
    const gr = gruplar[i];
    const son = gr.satirlar.flat().reduce((m, p) => Math.max(m, p.bas + okumaSuresi(p.yazi)), 0);
    let bit = Math.max(son, gr.sonKelime + 0.75);
    const cumle = CUMLELER.find((c) => gr.son_oge.i1 >= c.ilk && gr.son_oge.i1 <= c.son);
    bit = Math.min(bit, Math.max(cumle.bit + 0.9, son));
    gr.son = Math.max(bit, gr.bas + 0.8);
    gr.cikis = CIKIS;
    // sonraki mana önceki tamamen sönmeden belirmesin (iki yazı aynı yerde üst üste binmez):
    // önceki, sonrakinin ilk harfinden önce kısa bir çıkışla biter
    if (i + 1 < gruplar.length) {
      const sonraki = gruplar[i + 1].bas;
      if (gr.son + CIKIS > sonraki - 0.02) {
        gr.cikis = Math.min(CIKIS, Math.max(0.1, (sonraki - gr.bas) * 0.3));
        gr.son = Math.max(gr.bas + 0.25, sonraki - 0.02 - gr.cikis);
      }
    }
    delete gr.son_oge;
  }
  return gruplar;
})();

/** t anındaki altyazıyı çizer */
export function altyaziCiz(ctx, t) {
  for (const g of GRUPLAR) {
    if (t < g.bas - 0.01 || t > g.son + g.cikis + 0.01) continue;
    const cikis = 1 - ease.inOutQuad(clamp((t - g.son) / g.cikis));
    ctx.save();
    ctx.font = YAZI.font(YAZI.boy);
    ctx.textBaseline = 'alphabetic';
    const satirSay = g.satirlar.length;
    g.satirlar.forEach((satir, si) => {
      const y = YAZI.taban - (satirSay - 1 - si) * YAZI.satirAra;
      const bosluk = ctx.measureText(' ').width;
      const genislikler = satir.map((p) => ctx.measureText(p.yazi).width);
      const top = genislikler.reduce((a, b) => a + b, 0) + bosluk * (satir.length - 1);
      let x = W / 2 - top / 2;
      satir.forEach((p, pi) => {
        const giris = clamp((t - p.bas) / 0.22);
        if (giris > 0) {
          const e = ease.outCubic(giris);
          const a = e * cikis;
          const dy = (1 - e) * 10;
          yaziCiz(ctx, p.yazi, x, y + dy, a);
        }
        x += genislikler[pi] + bosluk;
      });
    });
    ctx.restore();
  }
}

// Her mana önce kendi katmanına tam opak çizilir (buğu + mürekkep), sonra saydamlıkla basılır: giriş ve çıkışta
// buğu ile yazı birlikte solar (yazıdan önce beyaz bir hayalet kalmaz).
const katmanlar = new Map();
function katman(s) {
  if (katmanlar.has(s)) return katmanlar.get(s);
  const pay = 48;
  const olc = tuval(10, 10).getContext('2d');
  olc.font = YAZI.font(YAZI.boy);
  const m = olc.measureText(s);
  const w = Math.ceil(m.width + pay * 2), h = Math.ceil(YAZI.boy * 1.6 + pay * 2);
  const c = tuval(w, h);
  const ctx = c.getContext('2d');
  ctx.font = YAZI.font(YAZI.boy);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const x = pay, y = pay + YAZI.boy * 1.1;
  ctx.fillStyle = YAZI.bugu;
  ctx.shadowColor = 'rgba(250,251,248,0.95)';
  ctx.shadowBlur = 34;
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 14;
  ctx.fillText(s, x, y);
  ctx.shadowBlur = 0;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(250,251,248,0.85)';
  ctx.lineWidth = 6;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = YAZI.renk;
  ctx.fillText(s, x, y);
  const k = { c, ox: x, oy: y };
  katmanlar.set(s, k);
  return k;
}

function yaziCiz(ctx, s, x, y, a) {
  if (a <= 0.003) return;
  const k = katman(s);
  ctx.save();
  ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(k.c, x - k.ox, y - k.oy);
  ctx.restore();
}
