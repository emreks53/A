// Sahne zaman çizelgesi. Komşu sahneler konuşmadaki duraklarda 0,4 sn çakışır (geçiş). Her sahne kendi dosyasında
// (sNN.mjs) { hazirla(), ciz(ctx, t), gecis? } dışa aktarır; zamanlar burada tek yerden belirlenir.
// Bir sahne dosyası yüklenemezse ya da çizerken hata verirse yerine uyarı karesi çizilir (öteki sahneler etkilenmez).
import { W, H } from '../motor/temel.mjs';

export const ZAMAN = [
  { ad: 's01', bas: 0.0, son: 7.8 },
  { ad: 's02', bas: 7.4, son: 16.6 },
  { ad: 's03', bas: 16.2, son: 24.8 },
  { ad: 's04', bas: 24.4, son: 34.8 },
  { ad: 's05', bas: 34.4, son: 46.8 },
  { ad: 's06', bas: 46.4, son: 57.4 },
  { ad: 's07', bas: 57.0, son: 67.6 },
  { ad: 's08', bas: 67.2, son: 82.9 },
  { ad: 's09', bas: 82.5, son: 96.5 },
  { ad: 's10', bas: 96.1, son: 110.9 },
  { ad: 'kapanis', bas: 110.3, son: 117.0 },
];
export const TOPLAM_SURE = 117.0;

function yerTutucu(ad, hata) {
  return {
    hazirla() {},
    ciz(ctx, t) {
      ctx.fillStyle = '#EEE8F0';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#8A6A9A';
      ctx.font = '600 54px "Cormorant Garamond"';
      ctx.textAlign = 'center';
      ctx.fillText(`${ad} · ${t.toFixed(2)} sn`, W / 2, H / 2 - 30);
      if (hata) {
        ctx.font = '28px sans-serif';
        ctx.fillText(String(hata.message || hata).slice(0, 60), W / 2, H / 2 + 30);
      }
    },
  };
}

const yuklenen = await Promise.all(
  ZAMAN.map(async (z) => {
    try {
      const m = await import(`./${z.ad}.mjs`);
      return m.default;
    } catch (e) {
      if (e.code !== 'ERR_MODULE_NOT_FOUND' || !String(e.message).includes(`${z.ad}.mjs`)) console.error(`[${z.ad}] yüklenemedi:`, e.message);
      return yerTutucu(z.ad, e.code === 'ERR_MODULE_NOT_FOUND' ? null : e);
    }
  }),
);

export const SAHNELER = ZAMAN.map((z, i) => {
  const s = yuklenen[i];
  let hatali = null;
  return {
    ...z,
    gecis: s.gecis,
    filmYok: !!s.filmYok,
    hazirla() {
      try { s.hazirla?.(); } catch (e) { hatali = e; console.error(`[${z.ad}] hazirla hatası:`, e.stack); }
    },
    ciz(ctx, t) {
      if (hatali) return yerTutucu(z.ad, hatali).ciz(ctx, t);
      try {
        s.ciz(ctx, t);
      } catch (e) {
        hatali = e;
        console.error(`[${z.ad}] çizim hatası (t=${t.toFixed(2)}):`, e.stack);
        yerTutucu(z.ad, e).ciz(ctx, t);
      }
    },
  };
});
