// s04 yardımcıları: ışık zeminleri (gül buğusu, açık krem), sabah çayırı tepeleri, başını kaldırabilen önden büyük
// plan erkek figür (motor/insan.mjs insanOn'un kopyası + baş kaldırma ve nefes), stilize kalp, kalbin içindeki berrak
// su, altın halka. Motor dosyalarına dokunmadan, onların üstüne kurulur.
import { tuval, rng, clamp, lerp, TAU, rgba, W, H } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, tara, darbe, TON, FILM } from '../motor/kalem.mjs';
import { svg, elips, cokgen, kalp, donustur } from '../motor/sekil.mjs';
import { RENK, OLCU, ON_DURUS } from '../motor/insan.mjs';

// ---------------------------------------------------------------- ışık zeminleri (tam ekran, ekran uzayında)
/** s03'ün bitişindeki soluk pembe-krem gül buğusu (aynısı: devir teslim kesintisiz olsun). Merkez (540, 900) */
export function zeminGul() {
  const c = tuval(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, W, H);
  const P = { ic: '#FFF7F3', orta: '#F9E4E3', dis: '#EFD0D6', tara: [[0, '#F3D4DA'], [1, '#D99AAA']] };
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(540, 900, 0, 540, 900, 1250);
  g.addColorStop(0, P.ic);
  g.addColorStop(0.42, P.orta);
  g.addColorStop(1, P.dis);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  tara(ctx, {
    x0: 0, y0: 0, x1: W, y1: H, yonF: (x, y) => Math.atan2(y - 900, x - 540), aralik: 3.6, boy: [60, 180], kal: 1.15, alfa: 0.2,
    ton: (x, y) => clamp((Math.hypot(x - 540, y - 900) - 260) / 900), renkler: P.tara, esikler: [0.2, 0.55], tohum: 37, minUc: 10, incelme: 0.2,
  });
  return c;
}

/** Açık krem zemin: merkezi (540, 900) çıplak, dışa doğru halkalara eşlik eden eş merkezli soluk altın tarama */
export function zeminKrem() {
  const c = tuval(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(540, 900, 0, 540, 900, 1250);
  g.addColorStop(0, '#FFFDF7');
  g.addColorStop(0.45, '#FBF3E3');
  g.addColorStop(1, '#F1E4CA');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  tara(ctx, {
    x0: 0, y0: 0, x1: W, y1: H, yonF: (x, y) => Math.atan2(y - 900, x - 540) + Math.PI / 2, aralik: 4.4, boy: [50, 150], kal: 1.1, alfa: 0.15,
    ton: (x, y) => clamp((Math.hypot(x - 540, y - 900) - 300) / 950), renkler: [[0, '#F0E0BA'], [1, '#D3B271']], esikler: [0.22, 0.6], tohum: 41, minUc: 10, incelme: 0.2,
  });
  return c;
}

// ---------------------------------------------------------------- tepe / çayır (sırt profili fonksiyonla)
const TEPE_PALET = {
  lila: { arka: '#DCD3EC', tara: [[0, '#DAD2EC'], [0.6, '#BDB2DB'], [1, '#9C90C4']], kontur: '#A397C9' },
  ada: { arka: '#CFE2C4', tara: [[0, '#C9E0BC'], [0.6, '#A5C99A'], [1, '#7FAE7C']], kontur: '#88B488' },
  cayir: { arka: '#BFE0A2', tara: [[0, '#B5DA98'], [0.55, '#86BE74'], [1, '#4F8E55']], kontur: '#5E9A5E' },
};
/** Tepe öğesi. sirt(x): dünya x'inde sırtın dünya y'si. Döner: { oge, ust(x), X0, Y0 } (çizim: ogeCiz(ctx, oge, X0, Y0)) */
export function tepe({ w, ad, renk = 'cayir', olcek = 1, X0 = 0, Yalt = 2300, sirt, tohum = 1, aralik = 3.4, ot = 0 }) {
  const n = 90;
  const xs = Array.from({ length: n + 1 }, (_, k) => X0 + (k / n) * w);
  const ys = xs.map(sirt);
  const Y0 = Math.min(...ys) - (ot ? 30 : 0);
  const pts = xs.map((x, k) => [x - X0, ys[k] - Y0]);
  const h = Yalt - Y0;
  pts.push([w, h], [0, h]);
  const P = TEPE_PALET[renk];
  const o = oge({
    ad, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85, arkaTasma: true, pay: 34,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.3 + 0.5 * clamp((y - (sirt(x + X0) - Y0)) / 600)), 0.18, 0.006, tohum), renkler: P.tara, yon: -0.05, aralik, boy: [40, 120], esikler: [0.25, 0.55, 0.8], alfa: 0.5 },
    kontur: P.kontur, konturKal: 2.0, titreme: 0.6, konturAtla: [],
    detay: ot ? (ctx, api) => {
      // sırt boyunca ot öbekleri: tabandan yukarı kıvrılan ince kalem çizgileri
      const r = rng(tohum * 31 + 7);
      for (let x = 6; x < w - 6; x += r.ara(7, 13)) {
        const y = sirt(x + X0) - Y0 + 2;
        const say = r.tam(1, 3);
        for (let k = 0; k < say; k++) {
          const boy = r.ara(10, 26) * ot, egim = r.ara(-0.5, 0.5);
          const x0 = x + r.ara(-3, 3);
          api.cizgi([[x0, y + 3], [x0 + egim * boy * 0.35, y - boy * 0.55], [x0 + egim * boy, y - boy]], { renk: r() < 0.5 ? P.kontur : '#3F7A47', kal: 1.35, alfa: 0.8, uc: 0.45 });
        }
      }
    } : null,
  });
  return { oge: o, ust: sirt, X0, Y0 };
}
/** Yumuşak tümsekler toplamı: taban - Σ yükseklik·çan(x) */
export const tumsekler = (taban, liste) => (x) => taban - liste.reduce((s, [cx, yuk, gen]) => s + yuk * Math.exp(-Math.pow((x - cx) / gen, 2)), 0);

// ---------------------------------------------------------------- önden erkek figür (insanOn kopyası + baş kaldırma)
const kapsul = (r0, L, r1) => svg(`M${-r0} 0A${r0} ${r0} 0 0 1 ${r0} 0L${r1} ${L}A${r1} ${r1} 0 0 1 ${-r1} ${L}Z`);
const kapsulKontur = (r0, L, r1) => svg(`M${r0} 0L${r1} ${L}A${r1} ${r1} 0 0 1 ${-r1} ${L}L${-r0} 0`).map((p) => ({ ...p, kapali: false }));

function parca(ad, sekil, renk, olcek, { kontur = null, yon = Math.PI / 2, aralik = 3.1, boy = [18, 46], tonF = null, esik = [0.12, 0.5, 0.78], ek = null } = {}) {
  const xs = sekil.flatMap((p) => p.pts.map((q) => q[0]));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  return oge({
    ad: 'insan-' + ad, sekil, olcek, arka: renk.arka, arkaAlfa: 0.8, arkaBulanik: 4,
    tarama: { ton: tonF || TON.gurultulu(TON.silindir(x0, x1), 0.06, 0.05, ad.length), renkler: renk.tara, yon, aralik, boy, kal: 1.15, alfa: 0.5, esikler: esik, minUc: 4 },
    kontur: kontur ? null : renk.kontur, konturKal: 2.0, titreme: 0.3,
    detay: (ctx, api) => {
      if (kontur) kontur.forEach((p) => api.cizgi(p.pts, { renk: renk.kontur, kal: 2.0, titreme: 0.3 }));
      if (ek) ek(ctx, api);
    },
  });
}
const R = (ad) => ({
  gomlek: { arka: RENK.gomlekArka, tara: RENK.gomlekTara, kontur: RENK.gomlekKontur },
  pantolon: { arka: RENK.pantolonArka, tara: RENK.pantolonTara, kontur: RENK.pantolonKontur },
  ten: { arka: RENK.tenArka, tara: RENK.tenTara, kontur: RENK.tenKontur },
  sac: { arka: RENK.sac, tara: RENK.sacTara, kontur: RENK.sacKontur },
  ayakkabi: { arka: RENK.ayakkabi, tara: RENK.ayakkabiTara, kontur: RENK.ayakkabiKontur },
}[ad]);

const parcalar = new Map();
function onParcalar(olcek) {
  const k = 'on' + olcek;
  if (parcalar.has(k)) return parcalar.get(k);
  const P = {};
  P.uyluk = parca('on-uyluk', kapsul(17.5, OLCU.uyluk, 13.5), R('pantolon'), olcek, { kontur: kapsulKontur(17.5, OLCU.uyluk, 13.5) });
  P.kol = parca('on-kol', kapsul(12.5, OLCU.kol, 10), R('gomlek'), olcek, { kontur: svg(`M-12.5 0A12.5 12.5 0 0 1 12.5 0L10 ${OLCU.kol}A10 10 0 0 1 -10 ${OLCU.kol}L-12.5 0`).map((p) => ({ ...p, kapali: false })) });
  P.onkol = parca('on-onkol', svg(`M-10 0A10 10 0 0 1 10 0L9 ${OLCU.onkol}L-9 ${OLCU.onkol}Z`), R('gomlek'), olcek, {
    kontur: svg(`M10 0L9 ${OLCU.onkol}L-9 ${OLCU.onkol}L-10 0`).map((p) => ({ ...p, kapali: false })),
  });
  P.el = parca('on-el', svg('M-7 -2C-9 6 -9 14 -6 19C-3 23 3 23 6 19C9 14 9 6 7 -2C4 -4 -4 -4 -7 -2Z'), R('ten'), olcek, { aralik: 2.6, boy: [6, 14] });
  P.kalca = parca('on-kalca', svg('M-30 -36C-32 -22 -33 -8 -32 4C-31 10 -20 14 0 12C20 14 31 10 32 4C33 -8 32 -22 30 -36Z'), R('pantolon'), olcek, { aralik: 3, boy: [14, 34] });
  P.govde = parca('on-govde', svg('M-29 -30C-30 -54 -32 -76 -34 -92C-36 -102 -42 -106 -45 -112C-47 -120 -40 -126 -28 -127C-16 -128 -7 -129 0 -129C7 -129 16 -128 28 -127C40 -126 47 -120 45 -112C42 -106 36 -102 34 -92C32 -76 30 -54 29 -30C12 -27 -12 -27 -29 -30Z'), R('gomlek'), olcek, {
    aralik: 3.1, boy: [20, 60], tonF: TON.gurultulu(TON.silindir(-46, 46), 0.06, 0.05, 4),
    ek: (ctx, api) => { api.cizgi([[-11, -128], [0, -117], [11, -128]], { renk: RENK.gomlekKontur, kal: 1.5, alfa: 0.7 }); },
  });
  P.boyun = parca('on-boyun', svg('M-9 0L-8 -18C-3 -20 3 -20 8 -18L9 0Z'), R('ten'), olcek, { aralik: 2.6, boy: [6, 12] });
  P.bas = parca('on-bas', svg('M0 -2C-12 -2 -21 -12 -23 -26C-25 -42 -18 -62 0 -62C18 -62 25 -42 23 -26C21 -12 12 -2 0 -2Z'), R('ten'), olcek, { aralik: 2.7, boy: [10, 26], tonF: TON.kure(4, -34, 32, { lx: 0.45, ly: -0.5 }) });
  P.sac = parca('on-sac', svg('M-24 -34C-27 -52 -16 -66 0 -66C17 -66 27 -53 24 -34C22 -42 18 -47 12 -50C4 -48 -6 -47 -14 -49C-18 -46 -21 -41 -24 -34Z'), R('sac'), olcek, { yon: -0.3, aralik: 2.4, boy: [10, 24], tonF: TON.kure(4, -52, 30) });
  P.kulak = parca('on-kulak', elips(0, 0, 3.8, 6.5), R('ten'), olcek, { aralik: 2.4, boy: [5, 10] });
  parcalar.set(k, P);
  return P;
}
export function insanHazirla(olcek) { onParcalar(olcek); }

/**
 * Önden büyük plan erkek (bel altı çayırın arkasında kalır; bacaklar çizilmez, yalnız kalça ve uyluk başı).
 * poz: ON_DURUS alanları + basKalk 0..1 (çene hafifçe yukarı: saç bandı incelir, kulaklar iner, boyun uzar),
 * nefes (birim: omuzlar yükselir, gövde hafifçe uzar). Döner: { gogus, bas, eller } (dünya koordinatı).
 */
export function insanOnBuyuk(ctx, x, y, poz = ON_DURUS, { s = 1, olcek = 3, alfa = 1 } = {}) {
  const P = onParcalar(olcek);
  const p = { ...ON_DURUS, ...poz };
  const k = clamp(p.basKalk || 0), nef = p.nefes || 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.rotate(p.govde * 0.3);
  ctx.globalAlpha *= alfa;
  const ky = -OLCU.kalca;
  // uyluk başları (çayırın arkasında kalır)
  for (const yon of [-1, 1]) ogeCiz(ctx, P.uyluk, yon * 15, ky, { r: yon * 0.05 });
  ogeCiz(ctx, P.kalca, 0, ky);
  const omuzY = ky - OLCU.govde - nef;
  const kolGeo = (yon, i) => {
    const a1 = yon * p.kol[i];
    const sx = yon * 34, sy = omuzY + 9;
    const dirsek = [sx + Math.sin(a1) * OLCU.kol, sy + Math.cos(a1) * OLCU.kol];
    const a2 = a1 - yon * p.dirsek[i];
    const bil = [dirsek[0] + Math.sin(a2) * OLCU.onkol, dirsek[1] + Math.cos(a2) * OLCU.onkol];
    return { a1, a2, sx, sy, dirsek, bil };
  };
  const eller = [null, null];
  [-1, 1].forEach((yon, i) => { const g = kolGeo(yon, i); ogeCiz(ctx, P.kol, g.sx, g.sy, { r: -g.a1 }); });
  ogeCiz(ctx, P.govde, 0, ky, { sy: (129 + nef) / 129 });
  ogeCiz(ctx, P.boyun, 0, omuzY - 6, { sy: 1 + 0.28 * k });
  const basY = omuzY - 18 - 4.2 * k;
  ctx.save();
  ctx.translate(0, basY);
  ctx.rotate(p.bas);
  ogeCiz(ctx, P.kulak, -22.5, -30 + 4.5 * k);
  ogeCiz(ctx, P.kulak, 22.5, -30 + 4.5 * k);
  const hs = 1 - 0.045 * k;
  ogeCiz(ctx, P.bas, 0, 0, { sy: hs });
  // saç: başın tepesine doğru sıkışır (yukarı bakınca alından çok saç değil yüz görünür)
  ctx.save();
  ctx.translate(0, -66 * hs);
  ctx.scale(1, 1 - 0.2 * k);
  ogeCiz(ctx, P.sac, 0, 66);
  ctx.restore();
  ctx.restore();
  [-1, 1].forEach((yon, i) => {
    const g = kolGeo(yon, i);
    ogeCiz(ctx, P.el, g.bil[0] - Math.sin(g.a2) * 3, g.bil[1] - Math.cos(g.a2) * 3, { r: -g.a2 });
    ogeCiz(ctx, P.onkol, g.dirsek[0], g.dirsek[1], { r: -g.a2 });
    eller[i] = g.bil;
  });
  ctx.restore();
  const dunya = ([px, py]) => [x + px * s, y + py * s];
  return { gogus: dunya([0, omuzY + 40]), bas: dunya([0, basY - 32]), eller: eller.map(dunya) };
}

// ---------------------------------------------------------------- stilize kalp
/** Kalp çizgisi alanı: (x, y) noktasında, kalbin iç içe çizgilerine teğet yön (kaba örtük kalp fonksiyonundan) */
function kalpYon(r) {
  const f = (X, Y) => Math.pow(X * X + Y * Y - 1, 3) - X * X * Y * Y * Y;
  return (x, y) => {
    const X = x / (r * 0.98), Y = -(y + r * 0.08) / (r * 0.98);
    const e = 0.01;
    const gx = (f(X + e, Y) - f(X - e, Y)) / (2 * e), gy = -(f(X, Y + e) - f(X, Y - e)) / (2 * e);
    return Math.atan2(gy, gx) + Math.PI / 2;
  };
}
/** Kalp sprite'ı (merkez 0,0; en ~2.1r): gül pembesi buğu, kalbin biçimini izleyen saten tarama, koyu gül kontur, parıltı */
export function kalpOge(r, olcek = 1) {
  return oge({
    ad: `s04-kalp2-${r}`, olcek, sekil: kalp(r), arka: '#F3B6C5', arkaAlfa: 0.85, arkaBulanik: r * 0.025,
    tarama: [
      { ton: TON.gurultulu(TON.kure(-0.05 * r, -0.25 * r, 1.22 * r, { lx: -0.4, ly: -0.62, lz: 0.68, ortam: 0.1 }), 0.06, 0.012, 5),
        renkler: [[0, '#F5C3CF'], [0.55, '#E68BA3'], [1, '#B0446A']], yon: -1.05, gecisAci: 0.14, aralik: 3.1, boy: [26, 70], kal: 1.2, alfa: 0.55, esikler: [0.16, 0.42, 0.7] },
    ],
    kontur: '#9A3858', konturKal: 2.4, titreme: 0.4,
    detay: (c, api) => {
      // sol üst lopta parlak bir benek ve kıvrımı izleyen iki ince ışık çizgisi
      api.dolgu(elips(-0.5 * r, -0.66 * r, 0.13 * r, 0.075 * r).map((p) => ({ ...p, pts: p.pts.map(([px, py]) => {
        const a = -0.55, dx = px + 0.5 * r, dy = py + 0.66 * r;
        return [-0.5 * r + dx * Math.cos(a) - dy * Math.sin(a), -0.66 * r + dx * Math.sin(a) + dy * Math.cos(a)];
      }) })), '#FFFFFF', 0.75);
      const yay = (r0, a0, a1, cx, cy) => Array.from({ length: 24 }, (_, i) => { const a = lerp(a0, a1, i / 23); return [cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]; });
      api.cizgi(yay(0.36 * r, -2.75, -1.75, -0.45 * r, -0.42 * r), { renk: '#FFFFFF', kal: 2.2, alfa: 0.85, uc: 0.35 });
    },
  });
}
/** Kalbin iç boşluğu (suyun dolduğu yer) */
export const kalpIc = (r) => donustur(kalp(0.86 * r), { y: -0.02 * r });
/** Berrak su dokusu: iç boşluk biçiminde, çıplak filme yakın açık su rengi + derinleştikçe koyulaşan yatay tarama */
export function suOge(r, olcek = 1) {
  return oge({
    ad: `s04-su2-${r}`, olcek, sekil: kalpIc(r), zemin: '#F5FBFB', arka: '#D6EEF1', arkaAlfa: 0.6, arkaTasma: true, arkaBulanik: r * 0.03,
    arkaCiz: (c, yol) => {
      // derinleştikçe koyulaşan arka buğu (yüzeye yakın neredeyse çıplak film)
      const g = c.createLinearGradient(0, -0.85 * r, 0, 0.85 * r);
      g.addColorStop(0, 'rgba(232,247,248,0.35)');
      g.addColorStop(0.55, 'rgba(200,234,239,0.75)');
      g.addColorStop(1, 'rgba(160,214,224,0.9)');
      c.fillStyle = g;
      c.fill(yol);
    },
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, -0.85 * r, 0, 0.8 * r, 0.05, 0.85), 0.1, 0.01, 9), renkler: [[0, '#D6F0F2'], [0.6, '#98D2DC'], [1, '#5FA9BC']], yon: -0.035, aralik: 3.3, boy: [30, 95], kal: 1.15, alfa: 0.4, esikler: [0.28, 0.55, 0.8] },
    kontur: null,
  });
}

// ---------------------------------------------------------------- ışık yardımcıları
/** Yumuşak ışık halkası (radyal geçişli halka bant): R yarıçapında, gen kalınlığında */
export function isikHalkasi(ctx, x, y, R, gen, renk, alfa, karisim = 'source-over') {
  if (alfa <= 0.002 || R <= 0) return;
  const r0 = Math.max(0, R - gen), r1 = R + gen;
  ctx.save();
  ctx.globalCompositeOperation = karisim;
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, rgba(renk, 0));
  g.addColorStop(clamp((R - r0) / (r1 - r0)), rgba(renk, alfa));
  g.addColorStop(1, rgba(renk, 0));
  ctx.fillStyle = g;
  const x0 = Math.max(0, x - r1), y0 = Math.max(0, y - r1);
  ctx.fillRect(x0, y0, Math.min(W, x + r1) - x0, Math.min(H, y + r1) - y0);
  ctx.restore();
}

/** Altın halka (lezzet-i ruhaniye): ışıklı bant + bant üstünde teğet kısa altın kalem darbeleri + altın kalem çizgisi
 *  + içte ince ikinci çizgi. tohum: halkanın kimliği (darbeler halka büyürken yerinde kalsın) */
export function altinHalka(ctx, x, y, R, { alfa = 1, kal = 3, tohum = 1, bant = 1 } = {}) {
  if (alfa <= 0.003 || R < 2) return;
  const gen = (22 + R * 0.035) * bant;
  isikHalkasi(ctx, x, y, R - gen * 0.25, gen * 1.6, '#F8DD95', 0.42 * alfa);
  // taranmış bant: halkanın içine doğru, teğet yönde kısa darbeler
  const r = rng(tohum * 977 + 3);
  const n = Math.min(520, Math.floor((TAU * R) / 9));
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + r.ara(-0.01, 0.01);
    const rr = R - r.ara(0, 1) * r.ara(0.2, 1) * gen * 1.6;
    const boy = r.ara(16, 34) / Math.max(rr, 20);
    const yon = r() < 0.5 ? 1 : -1;
    const p0 = [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    const p1 = [x + Math.cos(a + yon * boy * 0.5) * (rr - 1), y + Math.sin(a + yon * boy * 0.5) * (rr - 1)];
    const p2 = [x + Math.cos(a + yon * boy) * (rr - 2.5), y + Math.sin(a + yon * boy) * (rr - 2.5)];
    if (p0[0] < -40 || p0[0] > W + 40 || p0[1] < -40 || p0[1] > H + 40) continue;
    const c = r() < 0.6 ? '226,178,72' : '240,206,120';
    ctx.fillStyle = `rgba(${c},${(0.5 * alfa * r.ara(0.5, 1)).toFixed(3)})`;
    darbe(ctx, [p0, p1, p2], r.ara(1.1, 1.6), { incelme: 0.4, sivri: 0.6, dalga: 0 });
  }
  ctx.restore();
  halkaCizgi(ctx, x, y, R, { renk: '#BF8A22', kal, alfa: 0.92 * alfa, titreme: 0.7, tohum });
  const R2 = R - gen * 0.9;
  if (R2 > 4) halkaCizgi(ctx, x, y, R2, { renk: '#DDB24A', kal: Math.max(1.1, kal * 0.4), alfa: 0.6 * alfa, titreme: 0.6, tohum: tohum + 50 });
}

/** Kapalı daire kalem çizgisi: titreme ve basınç açıya göre periyodik (dikiş yok) */
export function halkaCizgi(ctx, x, y, R, { renk = '#BF8A22', kal = 2.4, alfa = 0.9, titreme = 0.6, tohum = 1 } = {}) {
  if (alfa <= 0.003 || R < 1) return;
  const r = rng(tohum);
  const f1 = r() * TAU, f2 = r() * TAU, f3 = r() * TAU, f4 = r() * TAU;
  const L = TAU * R;
  // açısal frekanslar sabit: halka büyürken desen kayar ama sıçramaz
  const m1 = 9, m2 = 29, m3 = 6, m4 = 21;
  const n = Math.max(64, Math.min(2400, Math.ceil(L / 3)));
  const dis = [], ic = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const o = titreme * (0.6 * Math.sin(m1 * a + f1) + 0.4 * Math.sin(m2 * a + f2));
    const w = (kal * (0.86 + 0.16 * Math.sin(m3 * a + f3) + 0.08 * Math.sin(m4 * a + f4))) / 2;
    const c = Math.cos(a), sn = Math.sin(a);
    dis.push([x + c * (R + o + w), y + sn * (R + o + w)]);
    ic.push([x + c * (R + o - w), y + sn * (R + o - w)]);
  }
  ctx.save();
  ctx.fillStyle = rgba(renk, alfa);
  ctx.beginPath();
  ctx.moveTo(dis[0][0], dis[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(dis[i][0], dis[i][1]);
  ctx.closePath();
  ctx.moveTo(ic[n - 1][0], ic[n - 1][1]);
  for (let i = n - 2; i >= 0; i--) ctx.lineTo(ic[i][0], ic[i][1]);
  ctx.closePath();
  ctx.fill('evenodd');
  ctx.restore();
}

/** Dört köşeli ışıltı (sevinç): altın yıldız, beyaz göbek, sıcak buğu — açık zeminde de okunur */
export function isilti(ctx, x, y, b, alfa, aci = 0) {
  if (alfa <= 0.003) return;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 0, x, y, b * 2.6);
  g.addColorStop(0, `rgba(255,236,170,${0.55 * alfa})`);
  g.addColorStop(1, 'rgba(255,236,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - b * 2.6, y - b * 2.6, b * 5.2, b * 5.2);
  const c = Math.cos(aci), s = Math.sin(aci);
  const kol = (L, w) => {
    darbe(ctx, [[x - c * L, y - s * L], [x, y], [x + c * L, y + s * L]], w, { incelme: 0.5, sivri: 0.75, dalga: 0 });
    darbe(ctx, [[x + s * L, y - c * L], [x, y], [x - s * L, y + c * L]], w, { incelme: 0.5, sivri: 0.75, dalga: 0 });
  };
  ctx.fillStyle = `rgba(214,160,44,${0.9 * alfa})`;
  kol(b * 1.75, b * 0.42);
  ctx.fillStyle = `rgba(255,252,236,${alfa})`;
  kol(b * 1.2, b * 0.2);
  ctx.restore();
}
