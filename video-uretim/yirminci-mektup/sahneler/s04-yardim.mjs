// s04 yardımcıları: ışık zeminleri (gül buğusu, açık krem), sabah çayırı tepeleri, başını kaldırabilen önden büyük
// plan erkek figür (motor/insan.mjs insanOn'un kopyası + baş kaldırma ve nefes), stilize kalp, kalbin içindeki berrak
// su, altın halka. Motor dosyalarına dokunmadan, onların üstüne kurulur.
import { tuval, rng, clamp, lerp, TAU, rgba, W, H } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, tara, darbe, TON, FILM } from '../motor/kalem.mjs';
import { svg, elips, cokgen, kalp, donustur, yenidenOrnekle, yumusat, icinde, path2d } from '../motor/sekil.mjs';
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

/** Ot sapı: tabanı geniş, ucu sivri kalem darbesi (pts tabandan uca) */
function otSapi(ctx, pts, kal) {
  const n = pts.length;
  const sol = [], sag = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let tx = pts[i1][0] - pts[i0][0], ty = pts[i1][1] - pts[i0][1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const u = i / (n - 1);
    const h = (kal / 2) * Math.pow(1 - u, 0.85) * (0.55 + 0.45 * Math.min(1, u / 0.12));
    sol.push([pts[i][0] - ty * h, pts[i][1] + tx * h]);
    sag.push([pts[i][0] + ty * h, pts[i][1] - tx * h]);
  }
  ctx.beginPath();
  ctx.moveTo(sol[0][0], sol[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(sol[i][0], sol[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(sag[i][0], sag[i][1]);
  ctx.closePath();
  ctx.fill();
}

/**
 * Uzun otlu çayır katmanı (ön planda: adam bunun içinde durur; arkada: adamın arkasında süren çayır). Gövdenin üst
 * kenarı konturlu bir sırt DEĞİL: tırtıklı ot öbekleri silueti; üstüne gövdenin içinden yükselen ot sapları (tabanı
 * geniş, ucu sivri kalem darbeleri; arka sıra kısa ve koyu, ön sıra uzun ve açık uçlu) biner; sapların arasından
 * arkadaki görünür. taban(x): dünya x'inde gövde üst kenarının dünya y'si. k: sap boylarının ölçeği.
 * Döner: { oge, ust(x), X0, Y0 } (çizim: ogeCiz(ctx, oge, X0, Y0)).
 */
export function otluCayir({ w, ad, X0 = 0, Yalt = 2200, taban, olcek = 1.3, tohum = 3, k = 1, soluk = 0, aralik = 3.4 }) {
  const r0 = rng(tohum * 17 + 5);
  // tırtıklı üst kenar: sık, düzensiz ot öbekleri (sivri tepeler)
  const sivri = [];
  for (let x = -6; x < w + 6; x += r0.ara(4, 9)) sivri.push([x, r0.ara(6, 26) * k, r0.ara(3.5, 8)]);
  const tepeH = (x) => { let m = 0; for (const [xc, hc, wc] of sivri) { const d = Math.abs(x - xc); if (d < wc) m = Math.max(m, hc * Math.pow(1 - d / wc, 1.3)); } return m; };
  const xs = [];
  for (let x = 0; x <= w; x += 2) xs.push(x);
  const ys = xs.map((x) => taban(x + X0) - tepeH(x));
  const Y0 = Math.min(...ys);
  const pts = xs.map((x, i) => [x, ys[i] - Y0]);
  const h = Yalt - Y0;
  pts.push([w, h], [0, h]);
  const P = soluk
    ? { arka: '#CFE6B8', tara: [[0, '#C6E2AE'], [0.55, '#A2CC8C'], [1, '#76A970']] }
    : { arka: '#BFE0A2', tara: [[0, '#B5DA98'], [0.55, '#86BE74'], [1, '#4F8E55']] };
  const ust = (x) => taban(x + X0) - Y0; // yerel
  const o = oge({
    ad, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85, arkaTasma: false, arkaBulanik: 2, pay: 140,
    tarama: [
      // gövde: dikine, hafif eğik kısa ot taraması; üst kenarın hemen altı otların gölgesinde, derine doğru hafif koyulaşır
      { ton: TON.gurultulu((x, y) => { const d = y - ust(x); return clamp(0.28 + 0.3 * clamp(d / 700) + 0.32 * Math.exp(-Math.max(0, d) / 46)); }, 0.16, 0.012, tohum), renkler: P.tara, yon: -Math.PI / 2 + 0.16, aralik, boy: [14, 40], kal: 1.15, esikler: [0.25, 0.52, 0.78], alfa: 0.48 },
    ],
    kontur: null,
    detay: (ctx) => {
      const r = rng(tohum * 53 + 11);
      const RENKLER = soluk ? ['#5F9663', '#6EA46A', '#7FB375', '#93C284', '#AED59A', '#C3E1AE'] : ['#3B7444', '#4A8A51', '#5E9A5E', '#6EA964', '#84BC72', '#A3CF88'];
      // üç sıra: arka (kısa, koyu, kenarda), orta, ön (uzun, açık uçlu, gövdenin daha içinden çıkar)
      const SIRA = [
        { adim: [1.6, 3.2], boy: [16, 40], derin: [-4, 8], renk: [0, 2], alfa: [0.78, 0.95], kal: [1.8, 2.6] },
        // taban örtüsü: kenarın hemen altından çıkan sık, opak orta boy saplar (arkadakinin alt sınırı seçilmesin)
        { adim: [1.4, 2.8], boy: [22, 48], derin: [4, 14], renk: [0, 3], alfa: [0.82, 0.97], kal: [2.0, 2.9] },
        { adim: [1.9, 3.8], boy: [28, 66], derin: [6, 18], renk: [1, 4], alfa: [0.72, 0.94], kal: [1.9, 2.8] },
        { adim: [3.0, 6.5], boy: [44, 96], derin: [16, 34], renk: [2, 5], alfa: [0.7, 0.95], kal: [2.1, 3.0] },
      ];
      for (const s of SIRA) {
        for (let x = 1; x < w - 1; x += r.ara(...s.adim)) {
          const boy = r.ara(...s.boy) * k * (r() < 0.12 ? 1.3 : 1);
          const y0 = ust(x) + r.ara(...s.derin) * k;
          const egim = r.ara(-0.42, 0.42), kivrim = r.ara(-0.12, 0.12);
          const sap = [];
          for (let i = 0; i <= 9; i++) {
            const u = i / 9;
            sap.push([x + egim * boy * u * u + kivrim * boy * Math.sin(u * Math.PI), y0 - boy * u * (1 - 0.12 * Math.abs(egim) * u)]);
          }
          ctx.fillStyle = rgba(RENKLER[r.tam(s.renk[0], s.renk[1])], r.ara(...s.alfa));
          otSapi(ctx, sap, r.ara(...s.kal) * Math.sqrt(k));
        }
      }
    },
  });
  return { oge: o, ust: taban, X0, Y0 };
}

/** Saplı kır çiçeği (canlı çizim, dünya koordinatında): taban (x, y), sap boyu, eğim (rad), salınım açısı */
export function sapliCicek(ctx, c, t) {
  const sal = c.egim + 0.05 * Math.sin(t * 1.15 + c.faz) + 0.02 * Math.sin(t * 2.3 + c.faz * 1.7);
  const ux = Math.sin(sal), uy = -Math.cos(sal);
  const bx = c.x + ux * c.boy, by = c.y + uy * c.boy;
  // sap: hafif kavisli, tabanda kalın, başa doğru incelir
  const kv = c.kivrim * c.boy;
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    pts.push([c.x + ux * c.boy * u - uy * kv * Math.sin(u * Math.PI), c.y + uy * c.boy * u + ux * kv * Math.sin(u * Math.PI)]);
  }
  ctx.fillStyle = rgba('#4A8A51', 0.92);
  otSapi(ctx, pts, 3.2);
  // sapın ortasından çıkan tek yaprak
  const m = pts[4];
  const yy = c.yaprakYon;
  const yp = [];
  for (let i = 0; i <= 8; i++) { const u = i / 8; yp.push([m[0] + yy * 22 * u + ux * 10 * u, m[1] - 14 * u * u + uy * 6 * u]); }
  ctx.fillStyle = rgba('#5E9A5E', 0.9);
  otSapi(ctx, yp, 5.5);
  ogeCiz(ctx, c.oge, bx, by, { s: c.s, sy: c.s * 0.82, r: sal * 0.8 });
}

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
 * poz: ON_DURUS alanları + basKalk -0.3..1 (çene hafifçe yukarı: saç bandı incelir, kulaklar iner, boyun uzar;
 * eksi: baş hafifçe öne eğik), nefes (birim: omuzlar yükselir, gövde hafifçe uzar), gogus 0..1 (nefeste göğüs ve
 * omuzlar hafifçe genişler), bilek [sol, sağ] (elin ön kola göre gecikme dönüşü, rad).
 * Döner: { gogus, bas, eller } (dünya koordinatı).
 */
export function insanOnBuyuk(ctx, x, y, poz = ON_DURUS, { s = 1, olcek = 3, alfa = 1 } = {}) {
  const P = onParcalar(olcek);
  const p = { ...ON_DURUS, ...poz };
  const k = clamp(p.basKalk || 0, -0.3, 1), nef = p.nefes || 0;
  const gen = 1 + 0.022 * (p.gogus || 0);
  const bilek = p.bilek || [0, 0];
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
    const sx = yon * 34 * gen, sy = omuzY + 9;
    const dirsek = [sx + Math.sin(a1) * OLCU.kol, sy + Math.cos(a1) * OLCU.kol];
    const a2 = a1 - yon * p.dirsek[i];
    const bil = [dirsek[0] + Math.sin(a2) * OLCU.onkol, dirsek[1] + Math.cos(a2) * OLCU.onkol];
    return { a1, a2, sx, sy, dirsek, bil };
  };
  const eller = [null, null];
  [-1, 1].forEach((yon, i) => { const g = kolGeo(yon, i); ogeCiz(ctx, P.kol, g.sx, g.sy, { r: -g.a1 }); });
  ogeCiz(ctx, P.govde, 0, ky, { sx: gen, sy: (129 + nef) / 129 });
  ogeCiz(ctx, P.boyun, 0, omuzY - 6, { sy: 1 + 0.28 * k });
  const basY = omuzY - 18 - 4.2 * k;
  ctx.save();
  ctx.translate(0, basY);
  ctx.rotate(p.bas);
  ogeCiz(ctx, P.kulak, -22.5, -30 + 4.5 * k);
  ogeCiz(ctx, P.kulak, 22.5, -30 + 4.5 * k);
  const hs = 1 - 0.045 * Math.abs(k); // öne eğilişte de yukarı bakışta da baş önden biraz kısalır
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
    ogeCiz(ctx, P.el, g.bil[0] - Math.sin(g.a2) * 3, g.bil[1] - Math.cos(g.a2) * 3, { r: -g.a2 - bilek[i] });
    ogeCiz(ctx, P.onkol, g.dirsek[0], g.dirsek[1], { r: -g.a2 });
    eller[i] = g.bil;
  });
  ctx.restore();
  const dunya = ([px, py]) => [x + px * s, y + py * s];
  return { gogus: dunya([0, omuzY + 40]), bas: dunya([0, basY - 32]), eller: eller.map(dunya) };
}

// ---------------------------------------------------------------- stilize kalp
// S-232 dilinde değerli bir nesne: gül-kırmızısı arka buğu, biçimi saran kalem taraması (ton koyulaştıkça katlar
// artar), yerel rengin koyu konturu, içte ince altın pervaz (çift cetvel + aralarında altın noktalar). Işık leke
// değil: lopların kıvrımını izleyen beyaz kalem taramasıyla (saten hilal) ve alt kenarda yansıyan ışık çizgileriyle.

/** Kalbin dış hattından içeri doğru d kadar içerlek kapalı hat (normaller boyunca kaydırma, kıvrık uç döngüleri
 *  ayıklanır, köşeler yumuşatılır). Döner: [[x, y], ...] */
const icHatOnbellek = new Map();
function kalpIcHat(r, d) {
  const k = r + '|' + d;
  if (icHatOnbellek.has(k)) return icHatOnbellek.get(k);
  const P = yenidenOrnekle(kalp(r)[0].pts, 2, true);
  const n = P.length;
  let alan = 0;
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; alan += a[0] * b[1] - b[0] * a[1]; }
  const yon = alan > 0 ? 1 : -1; // içe bakan normalin işareti
  const ham = [];
  for (let i = 0; i < n; i++) {
    const a = P[(i - 3 + n) % n], b = P[(i + 3) % n];
    let tx = b[0] - a[0], ty = b[1] - a[1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    ham.push([P[i][0] - ty * d * yon, P[i][1] + tx * d * yon]);
  }
  // dış hatta d'den yakın düşen noktalar (uçta kendini kesen döngü) atılır
  const S = P.filter((_, i) => i % 2 === 0);
  const tut = ham.filter(([x, y]) => {
    let m = Infinity;
    for (const [px, py] of S) { const v = (x - px) * (x - px) + (y - py) * (y - py); if (v < m) m = v; }
    return Math.sqrt(m) >= d * 0.97;
  });
  // içbükey köşede (iki lopun buluştuğu yer) kaydırılmış noktalar arasında açılan boşluk: köşe çevresinde d yarıçaplı yay
  const dolu = [];
  for (let i = 0; i < tut.length; i++) {
    const a = tut[i], b = tut[(i + 1) % tut.length];
    dolu.push(a);
    const ara = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (ara > 6) {
      const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
      let c = P[0], m = Infinity;
      for (const p of P) { const v = (p[0] - mx) ** 2 + (p[1] - my) ** 2; if (v < m) { m = v; c = p; } }
      const a0 = Math.atan2(a[1] - c[1], a[0] - c[0]);
      let a1 = Math.atan2(b[1] - c[1], b[0] - c[0]);
      while (a1 - a0 > Math.PI) a1 -= TAU;
      while (a1 - a0 < -Math.PI) a1 += TAU;
      const say = Math.ceil(ara / 2);
      for (let k = 1; k < say; k++) { const aa = lerp(a0, a1, k / say); dolu.push([c[0] + Math.cos(aa) * d, c[1] + Math.sin(aa) * d]); }
    }
  }
  const sonuc = yumusat(yenidenOrnekle(dolu, 3, true), 2, true);
  icHatOnbellek.set(k, sonuc);
  return sonuc;
}

/** Kalbin gövde alanı: iç uzaklık ızgarası → yastık yüzey normali (stilize hacim) */
const alanOnbellek = new Map();
function kalpAlan(r) {
  if (alanOnbellek.has(r)) return alanOnbellek.get(r);
  const sekil = kalp(r);
  const P = yenidenOrnekle(sekil[0].pts, 5, true);
  const g = 4, x0 = -1.12 * r, y0 = -1.12 * r;
  const nx = Math.ceil((2.24 * r) / g) + 1, ny = Math.ceil((2.12 * r) / g) + 1;
  const D = new Float32Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const x = x0 + i * g, y = y0 + j * g;
    let m = Infinity;
    for (let k = 0, L = P.length; k < L; k++) {
      const a = P[k], b = P[(k + 1) % L];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const u = clamp(((x - a[0]) * ex + (y - a[1]) * ey) / (ex * ex + ey * ey || 1));
      const dx = a[0] + ex * u - x, dy = a[1] + ey * u - y;
      const v = dx * dx + dy * dy;
      if (v < m) m = v;
    }
    D[j * nx + i] = (icinde(sekil, x, y) ? 1 : -1) * Math.sqrt(m);
  }
  const ornek = (A, x, y) => {
    const fx = clamp((x - x0) / g, 0, nx - 1.001), fy = clamp((y - y0) / g, 0, ny - 1.001);
    const i = Math.floor(fx), j = Math.floor(fy), u = fx - i, v = fy - j;
    const a = A[j * nx + i], b = A[j * nx + i + 1], c = A[(j + 1) * nx + i], e = A[(j + 1) * nx + i + 1];
    return lerp(lerp(a, b, u), lerp(c, e, u), v);
  };
  // yüzey: kenarlarda yuvarlanan yastık + bütün kalbi kapsayan alçak kubbe (lopların arasındaki çukur yumuşasın)
  const Dp = 0.42 * r;
  const yuk = (x, y) => {
    const u = clamp(ornek(D, x, y) / Dp);
    const yas = Dp * 0.8 * Math.sqrt(1 - (1 - u) * (1 - u));
    const q = 1 - (x * x + (y + 0.18 * r) * (y + 0.18 * r)) / (1.35 * r * 1.35 * r);
    return yas + 0.42 * r * Math.sqrt(Math.max(0, q)) * clamp(u * 3);
  };
  const normal = (x, y) => {
    const e = 3;
    const gx = (yuk(x + e, y) - yuk(x - e, y)) / (2 * e), gy = (yuk(x, y + e) - yuk(x, y - e)) / (2 * e);
    const l = Math.hypot(gx, gy, 1);
    return [-gx / l, -gy / l, 1 / l];
  };
  const A = { uzak: (x, y) => ornek(D, x, y), normal };
  alanOnbellek.set(r, A);
  return A;
}

/** Kalp sprite'ı (merkez 0,0; en ~2.1r) */
export function kalpOge(r, olcek = 1) {
  const A = kalpAlan(r);
  const L = (() => { const v = [-0.5, -0.72, 0.62], l = Math.hypot(...v); return v.map((q) => q / l); })();
  // gölge tonu: yastık yüzeyde dağınık ışık (sol üstten) + sağ alta doğru genel koyulaşma
  const golge = (x, y) => {
    const [a, b, c] = A.normal(x, y);
    const dif = Math.max(0, a * L[0] + b * L[1] + c * L[2]);
    const cukur = Math.exp(-(x * x + (y + 0.6 * r) * (y + 0.6 * r)) / (0.05 * r * r)); // lopların buluştuğu çukur sert kararmasın
    return clamp(0.98 - 0.86 * dif + 0.16 * ((x / r) * 0.45 + (y / r) * 0.55) - 0.22 * cukur);
  };
  const ton = TON.gurultulu(golge, 0.07, 0.014, 12);
  // kenarı saran tarama yönü: iç uzaklık alanının eş-uzaklık çizgilerine teğet
  const sarYon = (x, y) => {
    const e = 4;
    const gx = A.uzak(x + e, y) - A.uzak(x - e, y), gy = A.uzak(x, y + e) - A.uzak(x, y - e);
    return Math.atan2(gy, gx) + Math.PI / 2;
  };
  const kenar = (x, y) => clamp(1 - A.uzak(x, y) / (0.2 * r)) * (1 - 0.8 * Math.exp(-(x * x + (y + 0.6 * r) * (y + 0.6 * r)) / (0.06 * r * r)));
  return oge({
    ad: `s04-kalp3-${r}`, olcek, sekil: kalp(r), arka: '#E58C9F', arkaBulanik: r * 0.03,
    arkaCiz: (c, yol) => {
      const gr = c.createRadialGradient(-0.48 * r, -0.6 * r, 0, -0.3 * r, -0.4 * r, 1.7 * r);
      gr.addColorStop(0, 'rgba(252,212,216,0.92)');
      gr.addColorStop(0.4, 'rgba(232,112,136,0.92)');
      gr.addColorStop(1, 'rgba(172,40,74,0.94)');
      c.fillStyle = gr;
      c.fill(yol);
      c.strokeStyle = gr;
      c.lineWidth = r * 0.08;
      c.stroke(yol);
    },
    tarama: [
      // gövde: eğik saten tarama; katlar tonla artar, geçişlerde açı hafifçe döner (çapraz tarama)
      { ton, renkler: [[0, '#F2A3B1'], [0.5, '#D43F5F'], [1, '#86183A']], yon: -1.02, gecisAci: 0.32, aralik: 3.0, boy: [26, 70], kal: 1.2, alfa: 0.5, esikler: [0.16, 0.4, 0.62] },
      // kenarı saran tarama: hacmi biçimin kıvrımıyla verir (yalnız gölgeli yanda belirgin)
      { ton: (x, y) => ton(x, y) * (0.3 + 0.7 * kenar(x, y)), renkler: [[0, '#DE6F8A'], [1, '#7E1636']], yonF: sarYon, gecisAci: 0.1, aralik: 3.2, boy: [22, 54], kal: 1.15, alfa: 0.48, esikler: [0.46, 0.66] },
      // derin gölge: sağ alt lop ve uç
      { ton, renkler: [[0, '#A93556'], [1, '#6A1631']], yon: 0.62, gecisAci: 0.12, aralik: 3.3, boy: [18, 46], kal: 1.15, alfa: 0.42, esikler: [0.7, 0.84] },
    ],
    kontur: '#741B39', konturKal: 2.6, titreme: 0.45,
    detay: (c, api) => {
      const rr = rng(r * 7 + 3);
      // 1) ışık: sol lopun kıvrımını izleyen beyaz kalem hilali (yay yay kısa saten darbeler, ortası yoğun)
      const hilal = (cx, cy, R0, R1, a0, a1, yogun, alfa, renk) => {
        c.save();
        c.clip(path2d(kalp(r)));
        const satir = Math.round((R1 - R0) / 2.7);
        for (let s = 0; s <= satir; s++) {
          const v = s / satir; // 0 iç .. 1 dış
          const R = lerp(R0, R1, v);
          const agirlik = Math.pow(Math.sin(Math.PI * clamp(v * 1.05)), 0.9);
          let a = a0 + rr.ara(0, 0.06);
          while (a < a1) {
            const boy = rr.ara(18, 46) / R;
            const orta = (a + boy / 2 - a0) / (a1 - a0);
            const yog = agirlik * Math.pow(Math.sin(Math.PI * clamp(orta)), 1.4) * yogun;
            if (rr() < yog) {
              const pts = [];
              for (let k = 0; k <= 8; k++) { const aa = a + (boy * k) / 8; pts.push([cx + Math.cos(aa) * R, cy + Math.sin(aa) * R]); }
              c.fillStyle = rgba(renk, alfa * rr.ara(0.55, 1) * (0.45 + 0.55 * yog));
              darbe(c, pts, rr.ara(1.0, 1.5), { incelme: 0.35, sivri: 0.5, faz: rr() * TAU });
            }
            a += boy * rr.ara(1.05, 1.5);
          }
        }
        c.restore();
      };
      hilal(-0.5 * r, -0.42 * r, 0.2 * r, 0.47 * r, -3.0, -1.2, 1.0, 0.8, '#FFF4F1');
      hilal(-0.5 * r, -0.42 * r, 0.28 * r, 0.41 * r, -2.65, -1.65, 0.9, 0.75, '#FFFFFF');
      hilal(0.5 * r, -0.42 * r, 0.28 * r, 0.43 * r, -2.4, -1.45, 0.5, 0.45, '#FFEFEC');
      // 2) yansıyan ışık: sağ alt kenarın içinde, hatta paralel ince açık pembe çizgiler
      const yansi = kalpIcHat(r, 0.085 * r);
      const parca = yansi.filter(([x, y]) => x > 0.08 * r && y > -0.25 * r && y < 0.82 * r);
      for (let k = 0; k < 3; k++) {
        const kay = k * 3.2;
        const pts = parca.map(([x, y]) => [x - kay * 0.6, y - kay * 0.8]);
        if (pts.length > 4) api.cizgi(pts, { renk: '#F8C7D1', kal: 1.25, alfa: 0.5 - k * 0.12, uc: 0.35, titreme: 0.5 });
      }
      // 3) altın pervaz: dış cetvel, iç cetvel ve aralarında altın noktalar (tezhip)
      const dis = kalpIcHat(r, 0.05 * r), ic = kalpIcHat(r, 0.108 * r), orta = kalpIcHat(r, 0.079 * r);
      api.halka(dis, { renk: '#B4801F', kal: 2.5, alfa: 0.95, titreme: 0.35 });
      api.halka(dis.map(([x, y]) => [x + 0.7, y + 1.0]), { renk: '#FBE39A', kal: 1.0, alfa: 0.92, titreme: 0.3 });
      api.halka(ic, { renk: '#BA8826', kal: 1.45, alfa: 0.9, titreme: 0.3 });
      const nokta = yenidenOrnekle(orta, 15, true);
      for (const [x, y] of nokta) {
        c.fillStyle = 'rgba(176,124,36,0.95)';
        c.beginPath(); c.arc(x, y, 2.0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(252,230,160,0.95)';
        c.beginPath(); c.arc(x - 0.5, y - 0.6, 0.8, 0, TAU); c.fill();
      }
    },
  });
}
/** Kalbin iç boşluğu (suyun dolduğu yer): altın pervazın hemen içi */
export const kalpIc = (r) => [{ pts: kalpIcHat(r, 0.125 * r), kapali: true }];
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
