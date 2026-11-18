// s08 servet: altın sikke yığını (sandık, kadeh, külçe, mücevher), taht, taç, yuvarlanan sikkeler, parıltılar;
// "kaç para eder"de servetin griye dönüp toza dağılması (piksel düzeyinde dağılma haritası + kalem lekesi tozlar).
// Altın yalnız burada kullanılır.
import { tuval, rng, clamp, lerp, ease, TAU, rgba, gurultu2, smooth } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, darbe, TON } from '../motor/kalem.mjs';
import { svg, elips, cokgen, donustur, sinir } from '../motor/sekil.mjs';
import { birlestir } from './s08-dunya.mjs';

export const AL = {
  arka: '#F2D277', tara: [[0, '#F6DD90'], [0.55, '#DDAE45'], [1, '#956717']], kontur: '#7A5514', koyu: '#6B4A10',
  parlak: '#FFF4CC',
};
const dik = (x, y, w, h) => cokgen([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const altinTara = (ton, ek = {}) => ({ ton, renkler: AL.tara, aralik: 2.6, boy: [8, 22], kal: 1.05, alfa: 0.55, esikler: [0.18, 0.45, 0.72], minUc: 3, ...ek });

// ---------------------------------------------------------------- sikke (tek)
export function sikkeOge(r = 7, olcek = 3) {
  return oge({
    ad: 's08-sikke-' + r, olcek, sekil: elips(0, 0, r, r), arka: AL.arka, arkaAlfa: 0.9,
    tarama: altinTara(TON.kure(r * 0.2, -r * 0.3, r * 1.2), { yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 1.6, boy: [3, 8] }),
    kontur: AL.kontur, konturKal: 0.9,
    detay: (c, api) => {
      api.halka(elips(0, 0, r * 0.7, r * 0.7)[0].pts, { renk: AL.kontur, kal: 0.6, alfa: 0.7 });
      api.dolgu(elips(-r * 0.32, -r * 0.35, r * 0.22, r * 0.14), '#FFF7DA', 0.85);
    },
  });
}

// ---------------------------------------------------------------- yığın
/** Altın yığını: taban ortası (0,0), en 2·YW, boy YH. Döner { oge, ust(x) (yerel yüzey y'si) } */
export function yiginOge({ YW = 280, YH = 240, olcek = 2, tohum = 31 } = {}) {
  const r = rng(tohum);
  const n = gurultu2(tohum);
  const ust = (x) => {
    const u = clamp(Math.abs(x) / YW);
    let y = -YH * Math.pow(1 - Math.pow(u, 1.7), 0.85);
    // tepede taht için düzlük
    const duz = smooth(0.32, 0.12, u);
    y = lerp(y, -YH * 0.985, duz * 0.7);
    return y;
  };
  const pts = [];
  for (let k = 0; k <= 120; k++) {
    const x = lerp(-YW, YW, k / 120);
    const kabarti = (Math.abs(Math.sin(x * 0.21 + 1.3)) * 3.2 + n(x * 0.05, 1) * 4) * (1 - Math.pow(Math.abs(x) / YW, 4));
    pts.push([x, Math.min(0, ust(x) - kabarti)]);
  }
  pts.push([YW, 0], [-YW, 0]);
  const sekil = cokgen(pts);
  const ana = oge({
    ad: 's08-yigin', olcek, sekil, arka: AL.arka, arkaAlfa: 0.9,
    tarama: altinTara(TON.gurultulu((x, y) => clamp(0.25 + 0.45 * ((y + YH) / YH) + 0.18 * (x / YW)), 0.12, 0.03, tohum), { yon: -0.5, aralik: 2.8, boy: [10, 30] }),
    kontur: AL.kontur, konturKal: 1.8, titreme: 0.4,
    detay: (c, api) => {
      // sikkeler: yüzeye yakın sıralar halinde, arkadan öne
      const sik = [];
      for (let i = 0; i < 520; i++) {
        const x = r.ara(-YW * 0.97, YW * 0.97);
        const yu = ust(x);
        const y = r.ara(yu + 6, -4);
        if (y > -2) continue;
        sik.push([x, y, r.ara(5.5, 8)]);
      }
      sik.sort((a, b) => a[1] - b[1]);
      for (const [x, y, rr] of sik) {
        const ry = rr * r.ara(0.42, 0.62);
        const a = r.ara(-0.35, 0.35);
        const e = donustur(elips(0, 0, rr, ry), { x, y, r: a });
        api.dolgu(e, '#F4D47E', 0.9);
        api.dolgu(donustur(elips(0, ry * 0.35, rr, ry * 0.75), { x, y, r: a }), '#C99632', 0.35, 'multiply');
        api.halka(e[0].pts, { renk: AL.kontur, kal: 1.0, alfa: 0.85, adim: 1.6 });
        if (r() < 0.45) api.cizgi(donustur([{ pts: [[-rr * 0.5, -ry * 0.2], [-rr * 0.1, -ry * 0.5], [rr * 0.3, -ry * 0.45]] }], { x, y, r: a })[0].pts, { renk: '#FFF7DA', kal: 1.1, alfa: 0.9 });
      }
      // mücevherler
      const tas = ['#B85A6A', '#5E9A8A', '#6B7FB8', '#B85A6A'];
      for (let i = 0; i < 16; i++) {
        const x = r.ara(-YW * 0.8, YW * 0.8), yu = ust(x), y = r.ara(yu + 8, yu * 0.3);
        const s = r.ara(4.5, 7.5), renk = tas[i % 4];
        const p = cokgen([[x, y - s], [x + s * 0.8, y], [x, y + s * 0.9], [x - s * 0.8, y]]);
        api.dolgu(p, renk, 0.85);
        api.cizgi([[x - s * 0.8, y], [x + s * 0.8, y]], { renk: '#3E3446', kal: 0.8, alfa: 0.6 });
        api.halka(p[0].pts, { renk: '#3E3446', kal: 1.0, alfa: 0.8 });
        api.dolgu(elips(x - s * 0.25, y - s * 0.35, s * 0.18, s * 0.12), '#FFFFFF', 0.85);
      }
      // inci dizileri
      for (let i = 0; i < 3; i++) {
        const x0 = r.ara(-YW * 0.6, YW * 0.4);
        for (let k = 0; k < 14; k++) {
          const x = x0 + k * 6.5, y = ust(x) + 10 + Math.sin(k * 0.45) * 6 + k * 1.2;
          api.dolgu(elips(x, y, 2.6, 2.6), '#F3EFE6', 0.95);
          api.halka(elips(x, y, 2.6, 2.6)[0].pts, { renk: '#8C8478', kal: 0.6, alfa: 0.7, adim: 1 });
        }
      }
    },
  });
  // sandık (sol yamaç), kadeh (sağ yamaç), külçeler (taban)
  const sandik = sandikOge(olcek);
  const kadeh = kadehOge(olcek);
  const kulce = kulceOge(olcek);
  const parcalar = [
    { o: ana, x: 0, y: 0 },
    { o: sandik, x: -YW * 0.52, y: ust(-YW * 0.52) + 34, r: -0.12 },
    { o: kadeh, x: YW * 0.5, y: ust(YW * 0.5) + 16, r: 0.18 },
    { o: kulce, x: -YW * 0.8, y: 2, r: 0.0 },
    { o: kulce, x: YW * 0.78, y: 3, r: -0.05, s: 0.9 },
    { o: kulce, x: YW * 0.86, y: -9, r: 0.08, s: 0.85 },
  ];
  return { oge: birlestir(parcalar, olcek), ust };
}

function sandikOge(olcek) {
  const w = 88, h = 52;
  const govde = oge({
    ad: 's08-sandik', olcek, sekil: dik(-w / 2, -h, w, h), arka: '#B48A55', arkaAlfa: 0.9,
    tarama: { ton: TON.dogrusal(-w / 2, -h, w / 2, 0, 0.3, 0.8), renkler: [[0, '#B58D5C'], [1, '#6B4A2C']], yon: 0, aralik: 2.5, boy: [12, 30], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.55, 0.8], minUc: 3 },
    kontur: '#4E3826', konturKal: 1.8,
    detay: (c, api) => {
      for (const x of [-w / 2 + 8, w / 2 - 14]) { const b = dik(x, -h, 6, h); api.dolgu(b, AL.arka, 0.95); api.tara(b, altinTara(() => 0.5, { yon: -Math.PI / 2 })); api.halka(b[0].pts, { renk: AL.kontur, kal: 1.1 }); }
      const kilit = dik(-7, -h + 10, 14, 16); api.dolgu(kilit, AL.arka, 1); api.halka(kilit[0].pts, { renk: AL.kontur, kal: 1.1 });
    },
  });
  // açık kapak ve taşan sikkeler
  const kapak = oge({
    ad: 's08-sandik-kapak', olcek, sekil: svg(`M${-w / 2} 0C${-w / 2} -26 ${w / 2} -26 ${w / 2} 0Z`), arka: '#A47C4A', arkaAlfa: 0.9,
    tarama: { ton: () => 0.6, renkler: [[0, '#B58D5C'], [1, '#6B4A2C']], yon: -0.3, aralik: 2.5, boy: [10, 24], kal: 1.0, alfa: 0.55, esikler: [0.3, 0.6], minUc: 3 },
    kontur: '#4E3826', konturKal: 1.8,
    detay: (c, api) => api.cizgi([[-w / 2 + 4, -2], [w / 2 - 4, -2]], { renk: AL.kontur, kal: 2.4 }),
  });
  const tasma = oge({
    ad: 's08-sandik-tasma', olcek, sekil: svg(`M${-w / 2 + 2} 0C${-w / 3} -18 ${w / 3} -22 ${w / 2 - 2} 0Z`), arka: AL.arka, arkaAlfa: 0.95,
    tarama: altinTara(TON.dogrusal(0, -20, 0, 0, 0.2, 0.7), { yon: -0.4 }), kontur: AL.kontur, konturKal: 1.4,
    detay: (c, api) => { for (let k = 0; k < 7; k++) { const x = -w / 3 + k * 10, y = -8 - Math.sin(k * 0.6) * 6; api.halka(elips(x, y, 6, 3)[0].pts, { renk: AL.kontur, kal: 0.9 }); } },
  });
  return birlestir([{ o: kapak, x: 0, y: -h - 2, r: -0.5 }, { o: tasma, x: 0, y: -h + 2 }, { o: govde, x: 0, y: 0 }], olcek);
}
function kadehOge(olcek) {
  return oge({
    ad: 's08-kadeh', olcek, sekil: svg('M-22 -78C-22 -52 -12 -38 -4 -34L-4 -10C-4 -6 -16 -4 -18 0L18 0C16 -4 4 -6 4 -10L4 -34C12 -38 22 -52 22 -78Z'), arka: AL.arka, arkaAlfa: 0.9,
    tarama: altinTara(TON.silindir(-22, 22), { yon: -Math.PI / 2 }), kontur: AL.kontur, konturKal: 1.6,
    detay: (c, api) => {
      api.halka(elips(0, -78, 22, 5)[0].pts, { renk: AL.kontur, kal: 1.2 });
      api.dolgu(elips(-8, -56, 2.5, 8), '#FFF7DA', 0.8);
      api.dolgu(cokgen([[0, -64], [4, -58], [0, -52], [-4, -58]]), '#B85A6A', 0.9);
    },
  });
}
function kulceOge(olcek) {
  return oge({
    ad: 's08-kulce', olcek, sekil: cokgen([[-26, 0], [26, 0], [20, -16], [-20, -16]]), arka: AL.arka, arkaAlfa: 0.9,
    tarama: altinTara(TON.dogrusal(-26, -16, 26, 0, 0.2, 0.8), { yon: 0 }), kontur: AL.kontur, konturKal: 1.6,
    detay: (c, api) => { api.cizgi([[-18, -13], [18, -13]], { renk: '#FFF7DA', kal: 1.1, alfa: 0.8 }); },
  });
}

// ---------------------------------------------------------------- taht (yan görünüş, oturan sola bakar)
/**
 * Taht: yerel (0,0) oturanın ayak tabanı (basamak üstü) ve kalça ekseni x'i; birim adam birimi × S.
 * Sırtlık sağda (+x), ön sola (-x). Altında basamaklı kaide (yüksekliği KAIDE·S).
 */
export const KAIDE = 34;
export function tahtOge(S = 0.36, olcek = 2) {
  const s = (v) => v * S;
  const P = (pts) => cokgen(pts.map(([x, y]) => [s(x), s(y)]));
  const kaide = oge({
    ad: 's08-taht-kaide', olcek, sekil: P([[-150, 0], [92, 0], [92, 16], [104, 16], [104, KAIDE], [-162, KAIDE], [-162, 16], [-150, 16]]), arka: AL.arka, arkaAlfa: 0.9,
    tarama: altinTara(TON.dogrusal(0, 0, 0, s(KAIDE), 0.3, 0.8), { yon: 0 }), kontur: AL.kontur, konturKal: 1.7,
    detay: (c, api) => {
      api.cizgi([[s(-150), s(16)], [s(92), s(16)]], { renk: AL.kontur, kal: 1.2 });
      for (let k = 0; k < 6; k++) { const x = s(-130 + k * 40); api.halka(elips(x, s(25), s(6), s(4))[0].pts, { renk: AL.kontur, kal: 0.9, alfa: 0.8 }); }
    },
  });
  // ayaklar ve oturak
  const iskelet = oge({
    ad: 's08-taht-iskelet', olcek,
    sekil: [
      ...P([[-104, -88], [42, -88], [42, -64], [-104, -64]]), // oturak
      ...P([[-102, -64], [-86, -64], [-84, -6], [-96, 0], [-108, -4]]), // ön ayak (pençe)
      ...P([[24, -64], [40, -64], [42, -2], [26, 0]]), // arka ayak
      ...P([[24, -88], [54, -88], [58, -330], [20, -330]]), // sırtlık
      ...P([[40, -150], [-74, -150], [-82, -158], [-92, -150], [-84, -138], [-74, -142], [-70, -88], [-80, -88], [-80, -142], [40, -138]]), // kol dayanağı
    ],
    arka: AL.arka, arkaAlfa: 0.9,
    tarama: altinTara(TON.gurultulu(TON.dogrusal(s(-104), s(-330), s(58), 0, 0.15, 0.85), 0.1, 0.05, 3), { yon: -Math.PI / 2 + 0.2 }),
    kontur: AL.kontur, konturKal: 1.6,
    detay: (c, api) => {
      // sırtlık kabartması
      api.halka(cokgen([[s(29), s(-110)], [s(49), s(-110)], [s(52), s(-310)], [s(26), s(-310)]])[0].pts, { renk: AL.kontur, kal: 1.0, alfa: 0.8 });
      api.cizgi([[s(-100), s(-76)], [s(38), s(-76)]], { renk: AL.kontur, kal: 1.0, alfa: 0.8 });
    },
  });
  // tepelik: soğan kubbe biçimli taç, ortasında madalyon ve kırmızı taş
  const tepelik = oge({
    ad: 's08-taht-tepelik', olcek, sekil: svg(`M${s(14)} ${s(-326)}C${s(4)} ${s(-350)} ${s(18)} ${s(-372)} ${s(39)} ${s(-392)}C${s(60)} ${s(-372)} ${s(74)} ${s(-350)} ${s(64)} ${s(-326)}Z`), arka: AL.arka, arkaAlfa: 0.9,
    tarama: altinTara(TON.kure(s(44), s(-360), s(32))), kontur: AL.kontur, konturKal: 1.6,
    detay: (c, api) => {
      api.dolgu(elips(s(39), s(-350), s(9), s(11)), '#A8485E', 0.95);
      api.halka(elips(s(39), s(-350), s(9), s(11))[0].pts, { renk: '#5A2232', kal: 1.0 });
      api.dolgu(elips(s(36), s(-354), s(2.5), s(3)), '#FFFFFF', 0.8);
      api.cizgi([[s(39), s(-392)], [s(39), s(-406)]], { renk: AL.kontur, kal: 1.4 });
      api.dolgu(elips(s(39), s(-408), s(4), s(4)), AL.arka, 1);
      api.halka(elips(s(39), s(-408), s(4), s(4))[0].pts, { renk: AL.kontur, kal: 1.0 });
    },
  });
  // minder (koyu kadife)
  const minder = oge({
    ad: 's08-taht-minder', olcek, sekil: svg(`M${s(-100)} ${s(-86)}C${s(-104)} ${s(-104)} ${s(-90)} ${s(-106)} ${s(-60)} ${s(-104)}L${s(16)} ${s(-104)}C${s(30)} ${s(-104)} ${s(34)} ${s(-96)} ${s(30)} ${s(-86)}Z`), arka: '#B45C70', arkaAlfa: 0.9,
    tarama: { ton: TON.dogrusal(0, s(-106), 0, s(-86), 0.3, 0.9), renkler: [[0, '#C06A7E'], [1, '#6E2A3E']], yon: 0, aralik: 2.2, boy: [8, 20], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.55, 0.8], minUc: 3 },
    kontur: '#5A2232', konturKal: 1.4,
  });
  return birlestir([{ o: kaide, x: 0, y: 0 }, { o: iskelet, x: 0, y: 0 }, { o: tepelik, x: 0, y: 0 }, { o: minder, x: 0, y: 0 }], olcek);
}

// ---------------------------------------------------------------- taç
/** Taç: yerel (0,0) taban ortası (başın üstüne oturur), en 2·w */
export function tacOge(w = 11.5, olcek = 5) {
  const h = w * 0.62;
  const uclar = [];
  const n = 5;
  for (let k = 0; k <= n * 2; k++) {
    const x = lerp(-w, w, k / (n * 2));
    const y = k % 2 === 0 ? -h * (k === n ? 1.45 : 1.15) : -h * 0.55;
    uclar.push([x, y]);
  }
  const pts = [[-w * 0.92, 0], ...uclar, [w * 0.92, 0]];
  return oge({
    ad: 's08-tac', olcek, sekil: cokgen(pts), arka: AL.arka, arkaAlfa: 0.92,
    tarama: altinTara(TON.dogrusal(-w, -h, w, 0, 0.15, 0.8), { yon: -Math.PI / 2, aralik: 1.4, boy: [3, 8], kal: 0.6 }),
    kontur: AL.kontur, konturKal: 0.75,
    detay: (c, api) => {
      api.cizgi([[-w * 0.92, -h * 0.22], [w * 0.92, -h * 0.22]], { renk: AL.kontur, kal: 0.5 });
      for (let k = 0; k <= n * 2; k += 2) {
        const [x, y] = uclar[k];
        api.dolgu(elips(x, y, w * 0.07, w * 0.07), AL.parlak, 1);
        api.halka(elips(x, y, w * 0.07, w * 0.07)[0].pts, { renk: AL.kontur, kal: 0.4, adim: 0.6 });
      }
      for (const [x, renk] of [[-w * 0.5, '#5E9A8A'], [0, '#B85A6A'], [w * 0.5, '#6B7FB8']]) {
        api.dolgu(elips(x, -h * 0.4, w * 0.1, w * 0.12), renk, 0.95);
        api.halka(elips(x, -h * 0.4, w * 0.1, w * 0.12)[0].pts, { renk: '#3E3446', kal: 0.4, adim: 0.6 });
      }
    },
  });
}

// ---------------------------------------------------------------- parıltı (dört kollu ışık)
export function parilti(ctx, x, y, R, a, { renk = '#FFF3C4', donus = 0 } = {}) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x, y, 0, x, y, R * 1.2);
  g.addColorStop(0, rgba('#FFFBEA', 0.9 * a));
  g.addColorStop(0.3, rgba(renk, 0.35 * a));
  g.addColorStop(1, rgba(renk, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - R * 1.2, y - R * 1.2, R * 2.4, R * 2.4);
  ctx.fillStyle = rgba('#FFFDF2', 0.95 * a);
  for (let k = 0; k < 4; k++) {
    const an = donus + (k * Math.PI) / 2, L = k % 2 ? R * 0.7 : R;
    darbe(ctx, [[x - Math.cos(an) * L, y - Math.sin(an) * L], [x, y], [x + Math.cos(an) * L, y + Math.sin(an) * L]], R * 0.16, { incelme: 0.5, sivri: 0.8 });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- toza dağılma
/**
 * Bir altın sprite tuvalini (dünya: x0, y0 sol üst; res: dünya birimi başına piksel) griye çevirip toza dağıtır.
 * ciz(ctx, griyeDonus 0..1, dagilma 0..1, sure): ctx dünya dönüşümünde olmalı.
 */
export class TozaDagilma {
  constructor({ altin, x0, y0, res, tohum = 5, sayi = 2600, harita = null, sure = 0.85 }) {
    this.x0 = x0; this.y0 = y0; this.res = res; this.sure = sure;
    const w = altin.width, h = altin.height;
    this.w = w; this.h = h;
    const ac = altin.getContext('2d');
    const A = ac.getImageData(0, 0, w, h).data;
    this.A = A;
    // gri sürüm: ışıklılık → lila-gri rampası
    const Gd = new Uint8ClampedArray(A.length);
    for (let i = 0; i < A.length; i += 4) {
      const L = (0.3 * A[i] + 0.59 * A[i + 1] + 0.11 * A[i + 2]) / 255;
      const v = clamp((L - 0.25) / 0.75);
      Gd[i] = lerp(92, 206, v); Gd[i + 1] = lerp(86, 200, v); Gd[i + 2] = lerp(104, 212, v); Gd[i + 3] = A[i + 3];
    }
    this.G = Gd;
    // dağılma haritası: üstten alta, soldan sağa (rüzgâr soldan), gürültülü
    const n = gurultu2(tohum);
    const M = new Float32Array(w * h);
    let mn = 1e9, mx = -1e9;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (A[i * 4 + 3] < 4) { M[i] = 9; continue; }
      const v = harita ? harita(x / w, y / h, n) : 0.6 * (y / h) + 0.35 * (x / w) + 0.22 * n.fbm(x * 0.012, y * 0.012, 3);
      M[i] = v; if (v < mn) mn = v; if (v > mx) mx = v;
    }
    for (let i = 0; i < M.length; i++) if (M[i] < 9) M[i] = (M[i] - mn) / (mx - mn);
    this.M = M;
    // parçacıklar
    const r = rng(tohum + 1);
    this.P = [];
    let deneme = 0;
    while (this.P.length < sayi && deneme < sayi * 40) {
      deneme++;
      const x = Math.floor(r() * w), y = Math.floor(r() * h);
      const i = y * w + x;
      if (A[i * 4 + 3] < 128) continue;
      const agir = r() < 0.22;
      this.P.push({
        x: x0 + x / res, y: y0 + y / res, m: M[i],
        c: [Gd[i * 4], Gd[i * 4 + 1], Gd[i * 4 + 2]],
        vx: agir ? r.ara(40, 120) : r.ara(140, 330), vy: agir ? r.ara(-10, 30) : r.ara(-95, -15),
        ay: agir ? 260 : -20, ax: agir ? 40 : r.ara(120, 260),
        omur: r.ara(0.55, 1.25), L: r.ara(2.2, 6.5), kal: r.ara(0.9, 1.7), faz: r() * TAU, f: r.ara(2, 5),
      });
    }
    this.cikis = tuval(w, h);
    this.n = n;
  }
  ciz(ctx, gri, u, t) {
    const { w, h, A, G: Gd, M } = this;
    if (u < 1) {
      const c = this.cikis.getContext('2d');
      const img = c.createImageData(w, h);
      const d = img.data;
      const bant = 0.05;
      for (let y = 0; y < h; y++) {
        // griye dönüş dalgası soldan sağa
        for (let x = 0; x < w; x++) {
          const i = y * w + x, j = i * 4;
          const a = A[j + 3];
          if (a === 0) continue;
          const m = M[i];
          const kal = u <= 0 ? 1 : 1 - smooth(m - bant, m + 0.002, u);
          if (kal <= 0) continue;
          const g = clamp(gri * 1.6 - (x / w) * 0.6);
          d[j] = A[j] + (Gd[j] - A[j]) * g;
          d[j + 1] = A[j + 1] + (Gd[j + 1] - A[j + 1]) * g;
          d[j + 2] = A[j + 2] + (Gd[j + 2] - A[j + 2]) * g;
          d[j + 3] = a * kal;
        }
      }
      c.putImageData(img, 0, 0);
      ctx.save();
      ctx.translate(this.x0, this.y0);
      ctx.scale(1 / this.res, 1 / this.res);
      ctx.drawImage(this.cikis, 0, 0);
      ctx.restore();
    }
    this.tozCiz(ctx, u, t);
  }
  tozCiz(ctx, u, t) {
    if (u <= 0) return;
    ctx.save();
    for (const p of this.P) {
      const yas = (u - p.m) * this.sure;
      if (yas <= 0 || yas > p.omur) continue;
      const k = yas / p.omur;
      const tx = this.n(p.x * 0.02 + yas * 1.3, p.y * 0.02) * 22 * yas;
      const ty = this.n(p.y * 0.02, p.x * 0.02 + yas * 1.3) * 18 * yas;
      const x = p.x + p.vx * yas + 0.5 * p.ax * yas * yas + tx;
      const y = p.y + p.vy * yas + 0.5 * p.ay * yas * yas + ty;
      const vx = p.vx + p.ax * yas, vy = p.vy + p.ay * yas;
      const vl = Math.hypot(vx, vy) || 1;
      const L = p.L * (1 - k * 0.5);
      const a = (1 - k) * (k < 0.08 ? k / 0.08 : 1) * 0.85;
      const [cr, cg, cb] = p.c;
      const lc = k * 0.35;
      ctx.fillStyle = `rgba(${(cr + (225 - cr) * lc) | 0},${(cg + (221 - cg) * lc) | 0},${(cb + (230 - cb) * lc) | 0},${a})`;
      const ux = vx / vl, uy = vy / vl;
      darbe(ctx, [[x - ux * L, y - uy * L], [x, y], [x + ux * L * 0.4, y + uy * L * 0.4]], p.kal * (1 - k * 0.4), { incelme: 0.45, sivri: 0.7 });
    }
    ctx.restore();
  }
}

/** Yumuşak toz bulutu (gri buğu kümeleri) — dünya koordinatında */
export function tozBulutu(ctx, merkezler, u, { renk = '#9D97A8', sure = 1.2 } = {}) {
  ctx.save();
  for (const b of merkezler) {
    const yas = (u - b.m) * sure;
    if (yas <= 0 || yas > b.omur) continue;
    const k = yas / b.omur;
    const x = b.x + b.vx * yas + 60 * yas * yas, y = b.y + b.vy * yas;
    const R = b.R * (0.5 + k * 1.3);
    const a = 0.32 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * b.a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, rgba(renk, a));
    g.addColorStop(0.55, rgba(renk, a * 0.45));
    g.addColorStop(1, rgba(renk, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, R * 2, R * 2);
  }
  ctx.restore();
}
