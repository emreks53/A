// s10 ortak yardımcılar: ekran tamponları, maskeli çizim, ayak kaymayan yürüyüş (basan ayağa kilitli), dönüş,
// yumuşak dalga halkası. motor/ dosyalarına dokunmaz; onların üstüne kurulur.
import { tuval, W, H, clamp, lerp, ease, smooth, rng, TAU, rgba } from '../motor/temel.mjs';
import { konturCiz, darbe } from '../motor/kalem.mjs';
import { DURUS, yuruyus, pozKaristir, OLCU, insanYan } from '../motor/insan.mjs';
import { elips } from '../motor/sekil.mjs';

// ---------------------------------------------------------------- ekran tamponları
const tamponlar = new Map();
/** Ekran boyunda (W×H) yeniden kullanılan tampon tuval; temizlenmiş, dönüşümü sıfırlanmış döner */
export function tampon(ad) {
  let c = tamponlar.get(ad);
  if (!c) { c = tuval(W, H); tamponlar.set(ad, c); }
  const g = c.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  g.filter = 'none';
  g.clearRect(0, 0, W, H);
  return c;
}

/** Radyal maske duraklarıyla (r, alfa) destination-in / destination-out uygular */
export function radyalMaske(g, x, y, duraklar, mod = 'destination-in') {
  const R = Math.max(1, duraklar[duraklar.length - 1][0]);
  g.save();
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = mod;
  const gr = g.createRadialGradient(x, y, 0, x, y, R);
  for (const [r, a] of duraklar) gr.addColorStop(clamp(r / R), `rgba(0,0,0,${clamp(a)})`);
  g.fillStyle = gr;
  if (mod === 'destination-in') g.fillRect(0, 0, W, H);
  else g.fillRect(x - R, y - R, 2 * R, 2 * R);
  g.restore();
}

/** Yumuşak kenarlı dolu daire maskesi duraklarını üretir: R'ye kadar a, R+yum'da 0 */
export const daireDurak = (R, yum, a = 1) => {
  R = Math.max(0, R);
  return [[0, a], [Math.max(0.01, R), a], [R + yum, 0]];
};

// ---------------------------------------------------------------- yürüyüş (basan ayağa kilitli)
const KX = [-3, 3];
function bilekRel(p, i) {
  const a1 = p.kalca[i];
  const a2 = a1 + p.diz[i];
  return [KX[i] + Math.sin(a1) * OLCU.uyluk + Math.sin(a2) * OLCU.baldir, Math.cos(a1) * OLCU.uyluk + Math.cos(a2) * OLCU.baldir];
}

// Kendi yürüyüş döngümüz (ters kinematik): basan ayak zeminde düz kalır ve kalçaya göre doğrusal geriye süpürülür,
// salınan ayak kalkar; kalça çift basışta en alçak, tek basışın ortasında en yüksek. Motorun insanYan kurallarıyla poz döner.
const AD = { A: 72, beta: 0.62, kalk: 24, hMin: Math.sqrt(183 * 183 - 72 * 72), dh: 13 };
const BACAK = OLCU.uyluk + OLCU.baldir;
function ikBacak(fx, fy) {
  let d = Math.hypot(fx, fy);
  let asim = 0;
  if (d > BACAK * 0.997) { asim = d - BACAK * 0.997; d = BACAK * 0.997; }
  const th = Math.atan2(fx, fy);
  const al = Math.acos(clamp(d / BACAK, -1, 1));
  return { a1: th + al, a2: th - al, asim };
}
function bacakFaz(phi) {
  const { A, beta, kalk } = AD;
  phi = ((phi % TAU) + TAU) % TAU;
  const sb = TAU * beta;
  if (phi < sb) { const u = phi / sb; return { fx: A - 2 * A * u, kalk: 0, ayak: 0, basiyor: true, u }; }
  const u = (phi - sb) / (TAU - sb);
  return { fx: -A + 2 * A * (0.5 - 0.5 * Math.cos(Math.PI * u)), kalk: kalk * Math.pow(Math.sin(Math.PI * u), 0.85), ayak: -0.55 * Math.pow(1 - u, 2) * Math.sin(Math.PI * Math.min(1, u * 1.6)) + 0.16 * u * u, basiyor: false, u };
}
/** Yürüyüş pozu: faz (radyan, döngü 2π). FAZ0'da bir ayak basışın ortasında, öteki salınımın ortasında (ayaklar bitişik) */
export const FAZ0 = Math.PI * AD.beta;
export function adimPozu(faz, { kol = 0.34, egim = 0.045 } = {}) {
  const h = AD.hMin + AD.dh * (0.5 - 0.5 * Math.cos(2 * faz));
  const kalca = [0, 0], diz = [0, 0], bilek = [0, 0], omuz = [0, 0], dirsek = [0, 0];
  for (const i of [0, 1]) {
    const b = bacakFaz(faz + (i === 0 ? Math.PI : 0));
    const ik = ikBacak(b.fx - KX[i], h - b.kalk);
    kalca[i] = ik.a1;
    diz[i] = ik.a2 - ik.a1;
    const ayak = b.basiyor ? -Math.min(0.5, ik.asim / 14) : b.ayak;
    bilek[i] = ayak - ik.a2;
    omuz[i] = -kol * (b.fx / AD.A);
    dirsek[i] = 0.2 + 0.32 * Math.max(0, omuz[i] / kol);
  }
  return { govde: egim, bas: 0.02, kalca, diz, bilek, omuz, dirsek, zipla: 0, el: [0, 0] };
}

/**
 * t0..t1 arasında n yarım döngü (adım) yürüyüş. Faz yumuşakça hızlanıp yavaşlar; başta ve sonda duruş pozuyla
 * harmanlanır (ayaklar bitişikken). Gövdenin x'i basan ayağa kilitlenerek önceden tümlenir: basan ayak yerinde kalır.
 * pozF(poz, faz, w, u): yürüyüş pozuna ek (sepet tutan kol, kalkık baş...). Döner: t => { x, poz, faz, w }
 */
export function yurumePlani({ t0, t1, n, s, yon = 1, x0, kol = 0.34, egim = 0.045, duruA = DURUS, duruB = DURUS, pozF = null, e = ease.inOutSine, harm = 0.75, sabitHiz = false }) {
  const toplam = n * Math.PI;
  const pozAt = (u) => {
    const fz = toplam * (sabitHiz ? clamp(u) : e(clamp(u)));
    const w = smooth(0, harm, fz) * smooth(toplam, toplam - harm, fz);
    const duru = pozKaristir(duruA, duruB, smooth(0.5, 1, u));
    let p = pozKaristir(duru, adimPozu(FAZ0 + fz, { kol, egim }), w);
    if (pozF) p = pozF(p, fz, w, u);
    return { p, faz: fz, w };
  };
  const N = Math.max(2, Math.ceil((t1 - t0) * 400));
  const xs = new Float64Array(N + 1);
  let x = x0;
  let onceki = pozAt(0).p;
  xs[0] = x0;
  for (let k = 1; k <= N; k++) {
    const p = pozAt(k / N).p;
    const b0 = bilekRel(p, 0), b1 = bilekRel(p, 1);
    const pl = b0[1] >= b1[1] ? 0 : 1;
    const bp = bilekRel(onceki, pl), bc = pl ? b1 : b0;
    x += (bp[0] - bc[0]) * s * yon;
    xs[k] = x;
    onceki = p;
  }
  const f = (t) => {
    const u = clamp((t - t0) / (t1 - t0));
    const k = u * N, i = Math.min(N - 1, Math.floor(k));
    const xx = lerp(xs[i], xs[i + 1], k - i);
    const r = pozAt(u);
    return { x: xx, poz: r.p, faz: r.faz, w: r.w, u };
  };
  f.x1 = xs[N];
  f.x0 = x0;
  f.t0 = t0;
  f.t1 = t1;
  return f;
}

/** Yan figürü yatayda sıkıştırarak (kâğıt kesik gibi) çizer: k 0..1 genişlik çarpanı */
export function insanYanSikis(ctx, x, y, poz, { s, yon, k = 1, olcek = 1, alfa = 1 }) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(Math.max(0.06, k), 1);
  const r = insanYan(ctx, 0, 0, poz, { s, yon, olcek, alfa });
  ctx.restore();
  return r;
}

// ---------------------------------------------------------------- ışık ve dalga
/** Işıklı dalga halkası (ekran uzayı): ince altın kontur + yumuşak parıltı */
export function dalgaHalkasi(ctx, x, y, R, guc, { renk = '#F3D27A', kal = 3, basik = 1, tohum = 1 } = {}) {
  if (guc <= 0.003 || R <= 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, Math.max(0, R - 70), x, y, R + 40);
  g.addColorStop(0, 'rgba(255,248,220,0)');
  g.addColorStop(0.62, rgba('#FFF4CE', 0.42 * guc));
  g.addColorStop(1, 'rgba(255,248,220,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, R + 40, (R + 40) * basik, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  konturCiz(ctx, elips(x, y, R, R * basik, Math.max(48, Math.ceil(R / 3)))[0].pts, { renk, kal, alfa: 0.85 * guc, kapali: true, titreme: 0.8, tohum });
}

/** Yumuşak ışık huzmesi: (x0,y0) tepesinden (x1,y1)'e genişleyen kama (ekleme karışımı) */
export function huzme(ctx, x0, y0, w0, x1, y1, w1, guc, { renk = '#FFF1C2', ic = '#FFFBEA' } = {}) {
  if (guc <= 0.003) return;
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (const [k, a, col] of [[1, 0.32, renk], [0.55, 0.38, ic]]) {
    ctx.beginPath();
    ctx.moveTo(x0 + nx * w0 * k, y0 + ny * w0 * k);
    ctx.lineTo(x1 + nx * w1 * k, y1 + ny * w1 * k);
    ctx.lineTo(x1 - nx * w1 * k, y1 - ny * w1 * k);
    ctx.lineTo(x0 - nx * w0 * k, y0 - ny * w0 * k);
    ctx.closePath();
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, rgba(col, a * guc * 0.5));
    g.addColorStop(0.7, rgba(col, a * guc));
    g.addColorStop(1, rgba(col, a * guc * 0.75));
    ctx.fillStyle = g;
    ctx.filter = `blur(${Math.max(4, w1 * 0.18)}px)`;
    ctx.fill();
  }
  ctx.filter = 'none';
  ctx.restore();
}

/** Tohumlu, süzülen ışık zerreleri (bir alanda, yukarı yükselir) */
export function zerreler(ctx, x, y, w, h, t, { sayi = 30, renk = '#FFF1B8', boy = 3, alfa = 0.8, hiz = 40, tohum = 5, yon = -1 } = {}) {
  if (alfa <= 0.003) return;
  const r = rng(tohum);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < sayi; i++) {
    const px = x + r() * w + Math.sin(t * r.ara(0.5, 1.2) + i * 2.1) * 10;
    const faz = r();
    const v = hiz * r.ara(0.6, 1.4);
    const yy = (((faz * h - yon * t * v) % h) + h) % h;
    const py = yon < 0 ? y + yy : y + yy;
    const yasam = Math.sin(clamp(yy / h) * Math.PI);
    const b = boy * r.ara(0.5, 1.4);
    const g = ctx.createRadialGradient(px, py, 0, px, py, b * 3);
    g.addColorStop(0, rgba(renk, alfa * yasam));
    g.addColorStop(0.4, rgba(renk, alfa * 0.35 * yasam));
    g.addColorStop(1, rgba(renk, 0));
    ctx.fillStyle = g;
    ctx.fillRect(px - b * 3, py - b * 3, b * 6, b * 6);
  }
  ctx.restore();
}

/** Ekranın tamamına sıcak ışık (screen) */
export function isikBas(ctx, alfa, renk = '#FFF8E6') {
  if (alfa <= 0.002) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rgba(renk, clamp(alfa));
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** Kalem darbesiyle kısa çizgi (yağmur damlası vb.) */
export function cizgiDarbe(ctx, x0, y0, x1, y1, kal, renk, alfa) {
  ctx.fillStyle = rgba(renk, alfa);
  darbe(ctx, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2], [x1, y1]], kal, { incelme: 0.45, sivri: 0.6, dalga: 0 });
}

/** Pozun i. ayak bileğinin kalçaya göre yatay konumu (yerel birim) */
export function bilekX(poz, i = 0) {
  const p = { ...DURUS, ...poz };
  return bilekRel(p, i)[0];
}
