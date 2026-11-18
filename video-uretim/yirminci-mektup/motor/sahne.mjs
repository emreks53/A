// Sahne altyapısı: kamera yolu, paralaks katmanları, geçişler, film dokusu ve tam kare kompozisyonu.
import { tuval, W, H, clamp, lerp, ease, gurultu2, rng } from './temel.mjs';
import { FILM } from './kalem.mjs';
import { altyaziCiz } from './altyazi.mjs';

// ---------------------------------------------------------------- kamera
/**
 * Anahtar karelerden kamera yolu. anahtarlar: [{ t, x, y, z=1, r=0, e }] (e: o anahtara VARIŞ yumuşatması).
 * Yakınlaşma logaritmik uzayda ara değerlenir (büyük yakınlaşmalarda hız algısı eşit kalır).
 */
export function kameraYolu(anahtarlar) {
  const k = anahtarlar.map((a) => ({ x: 0, y: 0, z: 1, r: 0, ...a }));
  return (t) => {
    if (t <= k[0].t) return { ...k[0] };
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i].t) {
        const a = k[i - 1], b = k[i];
        const e = (b.e || ease.inOutCubic)(clamp((t - a.t) / (b.t - a.t)));
        return {
          x: lerp(a.x, b.x, e),
          y: lerp(a.y, b.y, e),
          z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), e)),
          r: lerp(a.r, b.r, e),
        };
      }
    }
    return { ...k[k.length - 1] };
  };
}

/**
 * Kamerayı uygular: dünya (cam.x, cam.y) noktası ekran ortasına gelir, cam.z yakınlaşma.
 * Dünya koordinatları "nötr görünüşte" (cam = 540, 960, z = 1) ekran koordinatlarıyla aynıdır.
 * f: paralaks çarpanı. f < 1 uzak katman (kameradan daha az etkilenir), f > 1 yakın katman. Katman nötr görünüşte
 * tasarlandığı gibi durur; kamera nötrden ne kadar saparsa katman o sapmanın f katı kadar kayar ve büyür.
 */
export const NOTR = { x: W / 2, y: H / 2 };
export function kameraUygula(ctx, cam, f = 1) {
  const z = Math.exp(Math.log(cam.z) * f);
  ctx.translate(W / 2, H / 2);
  if (cam.r) ctx.rotate(cam.r * f);
  ctx.scale(z, z);
  ctx.translate(-(NOTR.x + (cam.x - NOTR.x) * f), -(NOTR.y + (cam.y - NOTR.y) * f));
}

/** Dünya noktasının ekrandaki yeri (f paralaksında) */
export function ekranda(cam, x, y, f = 1) {
  const z = Math.exp(Math.log(cam.z) * f);
  return [W / 2 + (x - (NOTR.x + (cam.x - NOTR.x) * f)) * z, H / 2 + (y - (NOTR.y + (cam.y - NOTR.y) * f)) * z, z];
}

/** Kamera altında çizim: fn(ctx) dünya koordinatında çizer */
export function kameraIle(ctx, cam, fn, f = 1) {
  ctx.save();
  kameraUygula(ctx, cam, f);
  fn(ctx);
  ctx.restore();
}

/** Hafif el kamerası salınımı (çok küçük, yumuşak) */
export function salinim(t, genlik = 4, hiz = 0.25, tohum = 1) {
  const n = gurultu2(tohum);
  return { x: n(t * hiz, 0.5) * genlik, y: n(0.5, t * hiz) * genlik, r: n(t * hiz * 0.7, 3.3) * 0.002 };
}

// ---------------------------------------------------------------- film dokusu (kare üstü)
let filmDokusu = null;
export function filmDokusuAl() {
  if (filmDokusu) return filmDokusu;
  const c = tuval(W, H);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const d = img.data;
  const n = gurultu2(91);
  const r = rng(17);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      // mat filmin geniş benekleri + ince tane
      const v = 128 + n.fbm(x * 0.004, y * 0.004, 3) * 9 + n(x * 0.08, y * 0.08) * 3 + (r() - 0.5) * 7;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  filmDokusu = c;
  return c;
}

/** Kare üstü son işlem: film dokusu (yumuşak ışık) ve çok hafif köşe kararması */
export function sonIslem(ctx, { doku = 0.55, kenar = 0.1 } = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.globalAlpha = doku;
  ctx.drawImage(filmDokusuAl(), 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.35, W / 2, H * 0.5, H * 0.78);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, `rgba(${Math.round(255 - 255 * kenar * 0.8)},${Math.round(255 - 255 * kenar * 0.85)},${Math.round(255 - 255 * kenar * 0.6)},1)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// ---------------------------------------------------------------- kompozisyon
/**
 * Sahne: { ad, bas, son, hazirla?(), ciz(ctx, t), gecis?: { tip: 'karisim'|'beyaz'|'daire'|'kesme', sure } }
 * Ardışık iki sahne çakışırsa (yeni.bas < eski.son) yeni sahnenin gecis'ine göre karıştırılır.
 */
export function kompozisyon(sahneler, { altyazi = true } = {}) {
  const tampon = [tuval(W, H), tuval(W, H)];
  const hazir = new Set();
  const hazirla = (s) => {
    if (!hazir.has(s)) {
      s.hazirla?.();
      hazir.add(s);
    }
  };
  const sahneCiz = (s, ctx, t) => {
    hazirla(s);
    ctx.save();
    ctx.fillStyle = FILM;
    ctx.fillRect(0, 0, W, H);
    s.ciz(ctx, t);
    ctx.restore();
  };
  return (ctx, t) => {
    const etkin = sahneler.filter((s) => t >= s.bas && t < s.son);
    if (!etkin.length) {
      ctx.fillStyle = FILM;
      ctx.fillRect(0, 0, W, H);
    } else if (etkin.length === 1) {
      sahneCiz(etkin[0], ctx, t);
    } else {
      const [a, b] = etkin.slice(-2);
      const g = b.gecis || { tip: 'karisim', sure: a.son - b.bas };
      const sure = Math.max(0.001, a.son - b.bas);
      const u = clamp((t - b.bas) / sure);
      if (g.tip === 'kesme') {
        sahneCiz(b, ctx, t);
      } else {
        const ca = tampon[0].getContext('2d'), cb = tampon[1].getContext('2d');
        sahneCiz(a, ca, t);
        sahneCiz(b, cb, t);
        ctx.drawImage(tampon[0], 0, 0);
        if (g.tip === 'daire') {
          const e = ease.inOutCubic(u);
          const R = Math.hypot(W, H) * 0.55 * e;
          ctx.save();
          ctx.beginPath();
          ctx.arc(g.x ?? W / 2, g.y ?? H / 2, Math.max(0.1, R), 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(tampon[1], 0, 0);
          ctx.restore();
        } else if (g.tip === 'beyaz') {
          // nur parlaması: önce beyaza açılır, sonra yeni sahne beyazdan belirir
          if (u < 0.5) {
            ctx.fillStyle = `rgba(252,252,247,${ease.inOutSine(u * 2)})`;
            ctx.fillRect(0, 0, W, H);
          } else {
            ctx.drawImage(tampon[1], 0, 0);
            ctx.fillStyle = `rgba(252,252,247,${1 - ease.inOutSine((u - 0.5) * 2)})`;
            ctx.fillRect(0, 0, W, H);
          }
        } else {
          ctx.globalAlpha = ease.inOutSine(u);
          ctx.drawImage(tampon[1], 0, 0);
          ctx.globalAlpha = 1;
        }
      }
    }
    // film dokusu: kalem sahnelerinde var; fotoğraf (kapanış) sahnesinde yok (geçişte kademeli)
    const ust = etkin[etkin.length - 1];
    let doku = 1;
    if (ust && ust.filmYok) {
      const onceki = etkin.length > 1 ? etkin[etkin.length - 2] : null;
      doku = onceki && !onceki.filmYok ? 1 - clamp((t - ust.bas) / Math.max(0.001, onceki.son - ust.bas)) : 0;
    }
    if (doku > 0) sonIslem(ctx, { doku: 0.55 * doku, kenar: 0.1 * doku });
    if (altyazi) altyaziCiz(ctx, t);
  };
}
