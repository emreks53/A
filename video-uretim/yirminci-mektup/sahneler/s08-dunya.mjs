// s08 dünya öğeleri: gri-lila "perişan dünya" (eğri evler, kırık çit, eğik fener, savrulan kâğıt ve yapraklar),
// yüksekten görülen meydan (taş döşeme, kuru çeşme, çatılar), çatlak kuru ova, uzak tepeler, fırtına bulutu,
// rüzgâr çizgileri, yağmur. Hepsi S-232 dilinde (oge: arka buğu + saten tarama + koyu kontur), düşük doygunlukta.
import { tuval, rng, clamp, lerp, ease, TAU, rgba, gurultu2, W, H } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, darbe, TON, gokTuvali, bulutSekli } from '../motor/kalem.mjs';
import { svg, elips, cokgen, yaprak, donustur, yenidenOrnekle, yolUzunlugu, sinir } from '../motor/sekil.mjs';

// ---------------------------------------------------------------- palet (gri-lila, soluk)
export const G = {
  gokUst: '#6E6784', gokOrta: '#A7A1BA', gokAlt: '#CFCAD8', arkaUst: '#B9B3C7', arkaAlt: '#DCD8E2',
  kontur: '#4F4A5C', konturAcik: '#6A6276', koyu: '#5E5752',
  duvar: [
    { arka: '#C9C2CF', tara: [[0, '#C2BACB'], [0.6, '#9D95AB'], [1, '#726A84']] },
    { arka: '#C0BACB', tara: [[0, '#B9B2C6'], [0.6, '#938BA6'], [1, '#6A6280']] },
    { arka: '#CEC6C8', tara: [[0, '#C7BEC2'], [0.6, '#A0979F'], [1, '#756C7A']] },
  ],
  cati: { arka: '#968EA9', tara: [[0, '#9890AA'], [0.6, '#716988'], [1, '#4C4561']], kontur: '#3F3950' },
  tahta: { arka: '#BEB3AD', tara: [[0, '#B6ABA5'], [1, '#756B6B']], kontur: '#524748' },
  cam: { arka: '#79728D', tara: [[0, '#8A83A0'], [1, '#463F57']] },
  tas: { arka: '#CBC6D1', tara: [[0, '#C4BFCC'], [0.6, '#9E97AB'], [1, '#756D84']], kontur: '#5A536C' },
  toprak: { arka: '#C9C2CC', tara: [[0, '#C2BAC6'], [0.55, '#9D94A6'], [1, '#716880']], kontur: '#5E5570' },
};

/** Gri-lila taranmış gök */
export function griGok({ w, h, ad, olcek = 1, tohum = 5, koyu = 0 }) {
  return gokTuvali({
    w, h, olcek, ad, tohum,
    ust: koyu ? '#5E5774' : G.gokUst, orta: koyu ? '#958FA9' : G.gokOrta, alt: G.gokAlt, parilti: '#C9C2D4',
    arkaUst: koyu ? '#A7A0B8' : G.arkaUst, arkaAlt: G.arkaAlt, alfa: 0.42, aralik: 3.4,
  });
}

/** Birden çok sprite'ı tek tuvale birleştirir: parcalar [{ o, x, y, r?, s? }] */
export function birlestir(parcalar, olcek = 1) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parcalar) {
    const s = p.s ?? 1, r = p.r ?? 0;
    const w = p.o.tuval.width / p.o.olcek, h = p.o.tuval.height / p.o.olcek;
    const kos = [[-p.o.ox, -p.o.oy], [w - p.o.ox, -p.o.oy], [w - p.o.ox, h - p.o.oy], [-p.o.ox, h - p.o.oy]];
    for (const [a, b] of kos) {
      const X = p.x + (a * Math.cos(r) - b * Math.sin(r)) * s, Y = p.y + (a * Math.sin(r) + b * Math.cos(r)) * s;
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
  }
  const c = tuval((x1 - x0) * olcek, (y1 - y0) * olcek);
  const g = c.getContext('2d');
  g.scale(olcek, olcek);
  g.translate(-x0, -y0);
  for (const p of parcalar) ogeCiz(g, p.o, p.x, p.y, { s: p.s ?? 1, r: p.r ?? 0 });
  return { tuval: c, ox: -x0, oy: -y0, olcek, w: x1 - x0, h: y1 - y0, sinir: { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 } };
}

/** Sprite'ın filtrelenmiş kopyası (ör. doygunluk düşürme) */
export function filtreli(o, filtre) {
  const c = tuval(o.tuval.width, o.tuval.height);
  const g = c.getContext('2d');
  g.filter = filtre;
  g.drawImage(o.tuval, 0, 0);
  return { ...o, tuval: c };
}

const dikdortgen = (x, y, w, h) => cokgen([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
// titrek çizgi noktaları (çatlak)
function zikzak(r, x0, y0, x1, y1, n = 6, sap = 4) {
  const pts = [[x0, y0]];
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  for (let k = 1; k < n; k++) {
    const u = k / n;
    const o = r.ara(-sap, sap);
    pts.push([x0 + dx * u - (dy / L) * o, y0 + dy * u + (dx / L) * o]);
  }
  pts.push([x1, y1]);
  return pts;
}

// ---------------------------------------------------------------- ev (eğri, harap)
/**
 * Harap ev: taban ortası (0,0). w en, h duvar boyu, catiH çatı boyu, egri: duvarın üst kayması (çarpıklık), sarkma:
 * mahyanın çöküklüğü. pencereler: [{x, y, w, h, tur: 'kirik'|'tahta'|'kepenk'|'saglam'}] (duvar yerel: x soldan, y
 * tabandan yukarı). kapi: {x, w, h, aralik}. baca: {x, h, egim}.
 */
export function evOge({ ad, w, h, catiH, egri = 0, sarkma = 0, renk = 0, pencereler = [], kapi = null, baca = null, tohum = 1, olcek = 1 }) {
  const r = rng(tohum);
  const D = G.duvar[renk % G.duvar.length];
  const sol = -w / 2, sag = w / 2;
  const duvar = cokgen([[sol, 0], [sag, 0], [sag + egri, -h], [sol + egri, -h]]);
  const duvarO = oge({
    ad: ad + '-duvar', olcek, sekil: duvar, arka: D.arka, arkaAlfa: 0.8,
    tarama: { ton: TON.gurultulu(TON.dogrusal(sol, -h, sag, 0, 0.12, 0.6), 0.14, 0.02, tohum), renkler: D.tara, yon: -Math.PI / 2 + 0.08, aralik: 3.1, boy: [20, 60], kal: 1.2, alfa: 0.5, esikler: [0.2, 0.45, 0.72] },
    kontur: G.kontur, konturKal: 2.1, titreme: 0.7,
    detay: (c, api) => {
      const kx = (yy) => egri * (yy / h); // yükseklikte kayma
      // sıva çatlakları ve dökülmüş sıva (tuğla izleri)
      for (let i = 0; i < 3; i++) {
        const x = r.ara(sol + 12, sag - 12), y = -r.ara(h * 0.25, h * 0.95);
        api.cizgi(zikzak(r, x + kx(-y), y, x + r.ara(-25, 25) + kx(-y), y + r.ara(30, 70), 5, 5), { renk: G.kontur, kal: 1.2, alfa: 0.55 });
      }
      const bx = r.ara(sol + 20, sag - 70), by = -r.ara(h * 0.15, h * 0.5);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3 - (i % 2); j++) {
        const xx = bx + j * 18 + (i % 2) * 9 + kx(-by), yy = by - i * 9;
        api.halka(dikdortgen(xx, yy, 16, 7)[0].pts, { renk: G.konturAcik, kal: 1.0, alfa: 0.5 });
      }
      // pencereler
      for (const p of pencereler) {
        const x = sol + p.x + kx(p.y + p.h / 2), y = -p.y - p.h;
        const cer = dikdortgen(x, y, p.w, p.h);
        if (p.tur !== 'bos') {
          api.dolgu(cer, G.cam.arka, 0.7, 'multiply');
          api.tara(cer, { ton: () => 0.75, renkler: G.cam.tara, yon: -0.7, aralik: 2.6, boy: [8, 22], kal: 1.1, alfa: 0.6, esikler: [0.2, 0.5, 0.78], minUc: 4 });
        }
        api.halka(cer[0].pts, { renk: G.kontur, kal: 2.0 });
        // pervaz
        api.cizgi([[x - 5, y + p.h + 4], [x + p.w + 5, y + p.h + 4]], { renk: G.kontur, kal: 2.2 });
        if (p.tur === 'saglam' || p.tur === 'kirik') {
          api.cizgi([[x + p.w / 2, y], [x + p.w / 2, y + p.h]], { renk: G.kontur, kal: 1.5 });
          api.cizgi([[x, y + p.h * 0.45], [x + p.w, y + p.h * 0.45]], { renk: G.kontur, kal: 1.5 });
        }
        if (p.tur === 'kirik') {
          const cx = x + p.w * r.ara(0.3, 0.7), cy = y + p.h * r.ara(0.3, 0.6);
          for (let k = 0; k < 5; k++) {
            const a = r.ara(0, TAU), L = r.ara(p.w * 0.3, p.w * 0.6);
            api.cizgi(zikzak(r, cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L, 3, 2), { renk: '#E4E0EA', kal: 1.1, alfa: 0.8 });
          }
        }
        if (p.tur === 'tahta') {
          for (const [a0, a1] of [[0.12, 0.88], [0.88, 0.12]]) {
            const pa = [x - 6, y + p.h * a0], pb = [x + p.w + 6, y + p.h * a1];
            const ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]);
            const nx = -Math.sin(ang) * 5, ny = Math.cos(ang) * 5;
            const tahta = cokgen([[pa[0] + nx, pa[1] + ny], [pb[0] + nx, pb[1] + ny], [pb[0] - nx, pb[1] - ny], [pa[0] - nx, pa[1] - ny]]);
            api.dolgu(tahta, G.tahta.arka, 0.95);
            api.tara(tahta, { ton: () => 0.5, renkler: G.tahta.tara, yon: ang, aralik: 2.4, boy: [10, 30], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.6], minUc: 4 });
            api.halka(tahta[0].pts, { renk: G.tahta.kontur, kal: 1.4 });
          }
        }
      }
      // kapı (aralık, eğri)
      if (kapi) {
        const x = sol + kapi.x + kx(kapi.h / 2), y = -kapi.h;
        const bos = dikdortgen(x, y, kapi.w, kapi.h);
        api.dolgu(bos, '#5D566C', 0.85, 'multiply');
        api.tara(bos, { ton: () => 0.85, renkler: [[0, '#6E6782'], [1, '#3E384B']], yon: -1.2, aralik: 2.5, boy: [10, 26], kal: 1.1, alfa: 0.55, esikler: [0.3, 0.6], minUc: 4 });
        const ac = kapi.aralik ?? 0.35;
        const kan = cokgen([[x, y], [x + kapi.w * (1 - ac), y + 6], [x + kapi.w * (1 - ac), y + kapi.h - 2], [x, y + kapi.h]]);
        api.dolgu(kan, G.tahta.arka, 0.95);
        api.tara(kan, { ton: () => 0.55, renkler: G.tahta.tara, yon: -Math.PI / 2, aralik: 2.6, boy: [14, 40], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.6], minUc: 4 });
        api.halka(kan[0].pts, { renk: G.tahta.kontur, kal: 1.6 });
        api.halka(bos[0].pts, { renk: G.kontur, kal: 2.0 });
      }
    },
  });
  // çatı: sarkık mahyalı üçgen/yamuk
  const e = 18; // saçak taşması
  const ux = sol + egri, vx = sag + egri;
  const tepeX = (ux + vx) / 2 + r.ara(-8, 8);
  const catiPts = [[ux - e, -h + 4], [vx + e, -h + 4]];
  for (let k = 12; k >= 0; k--) {
    const u = k / 12;
    const x = lerp(ux + w * 0.18, vx - w * 0.18, u);
    const tepeY = -h - catiH;
    // iki yamaç + ortada çöküklük
    const yY = lerp(-h, tepeY, 1 - Math.abs(u - 0.5) * 0.25) + sarkma * Math.sin(Math.PI * u);
    if (k === 12) catiPts.push([vx - w * 0.06, -h - catiH * 0.82]);
    catiPts.push([x + (tepeX - (ux + vx) / 2) * (1 - Math.abs(u - 0.5) * 2), yY]);
    if (k === 0) catiPts.push([ux + w * 0.06, -h - catiH * 0.8]);
  }
  const cati = cokgen(catiPts);
  const catiO = oge({
    ad: ad + '-cati', olcek, sekil: cati, arka: G.cati.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, -h - catiH, 0, -h, 0.35, 0.8), 0.12, 0.02, tohum + 3), renkler: G.cati.tara, yon: 0.02, aralik: 3.0, boy: [24, 70], kal: 1.2, alfa: 0.5, esikler: [0.2, 0.5, 0.78] },
    kontur: G.cati.kontur, konturKal: 2.2, titreme: 0.8,
    detay: (c, api) => {
      // kiremit sıraları ve eksik kiremitler
      for (let k = 1; k < 5; k++) {
        const yy = -h - catiH * (k / 5) * 0.85 + sarkma * 0.6;
        const yar = w * 0.5 * (1 - k / 6) + e * (1 - k / 5);
        api.cizgi(zikzak(r, tepeX - yar, yy + 2, tepeX + yar, yy + r.ara(-3, 3), 8, 1.5), { renk: G.cati.kontur, kal: 1.1, alfa: 0.55 });
      }
      for (let i = 0; i < 3; i++) {
        const xx = tepeX + r.ara(-w * 0.3, w * 0.3), yy = -h - catiH * r.ara(0.2, 0.55);
        const del = dikdortgen(xx, yy, r.ara(10, 18), r.ara(7, 11));
        api.dolgu(del, '#4C4659', 0.55, 'multiply');
        api.halka(del[0].pts, { renk: G.cati.kontur, kal: 1.1, alfa: 0.7 });
      }
    },
  });
  const parcalar = [{ o: duvarO, x: 0, y: 0 }, { o: catiO, x: 0, y: 0 }];
  if (baca) {
    const bw = 26, bh = baca.h;
    const bacaO = oge({
      ad: ad + '-baca', olcek, sekil: cokgen([[-bw / 2, 0], [bw / 2, 0], [bw / 2 + 2, -bh], [-bw / 2 - 2, -bh]]), arka: '#BDB3B2', arkaAlfa: 0.85,
      tarama: { ton: TON.silindir(-bw / 2, bw / 2), renkler: [[0, '#B7ACAA'], [1, '#6F6470']], yon: -Math.PI / 2, aralik: 2.6, boy: [10, 30], kal: 1.1, alfa: 0.55, esikler: [0.25, 0.55] },
      kontur: G.kontur, konturKal: 1.9,
      detay: (c, api) => {
        for (let k = 1; k < bh / 12; k++) api.cizgi([[-bw / 2, -k * 12], [bw / 2, -k * 12]], { renk: G.konturAcik, kal: 1.0, alfa: 0.5 });
        api.halka(dikdortgen(-bw / 2 - 5, -bh - 8, bw + 10, 8)[0].pts, { renk: G.kontur, kal: 1.6 });
      },
    });
    parcalar.unshift({ o: bacaO, x: baca.x + egri * 0.9, y: -h - catiH * 0.45, r: baca.egim ?? 0 });
  }
  return birlestir(parcalar, olcek);
}

/** Kepenk (sallanan pencere kanadı): menteşe sol üst (0,0) */
export function kepenkOge(w, h, olcek = 1) {
  return oge({
    ad: `s08-kepenk-${w}-${h}`, olcek, sekil: dikdortgen(0, 0, w, h), arka: G.tahta.arka, arkaAlfa: 0.9,
    tarama: { ton: () => 0.55, renkler: G.tahta.tara, yon: -Math.PI / 2, aralik: 2.6, boy: [14, 36], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.6] },
    kontur: G.tahta.kontur, konturKal: 1.8,
    detay: (c, api) => { for (let k = 1; k < 5; k++) api.cizgi([[3, (h * k) / 5], [w - 3, (h * k) / 5 + 2]], { renk: G.tahta.kontur, kal: 1.1, alfa: 0.65 }); },
  });
}

// ---------------------------------------------------------------- kırık çit
export function citOge({ ad, w, tohum = 1, olcek = 1, eksik = 0.25 }) {
  const r = rng(tohum);
  const parcalar = [];
  const kazik = (boy, en) => cokgen([[-en / 2, 0], [en / 2, 0], [en / 2, -boy + en * 0.6], [0, -boy], [-en / 2, -boy + en * 0.6]]);
  const kazikO = (boy, k) => oge({
    ad: `s08-kazik-${Math.round(boy)}-${k}`, olcek, sekil: kazik(boy, 15), arka: G.tahta.arka, arkaAlfa: 0.88,
    tarama: { ton: TON.gurultulu(TON.silindir(-8, 8), 0.1, 0.05, k), renkler: G.tahta.tara, yon: -Math.PI / 2, aralik: 2.5, boy: [12, 40], kal: 1.0, alfa: 0.55, esikler: [0.2, 0.5, 0.75], minUc: 4 },
    kontur: G.tahta.kontur, konturKal: 1.8, titreme: 0.5,
    detay: (c, api) => { api.cizgi([[-2, -boy * 0.3], [1, -boy * 0.55]], { renk: G.tahta.kontur, kal: 0.9, alfa: 0.5 }); },
  });
  // yatay kirişler (biri kırık ve sarkık)
  const kiris = (L, k) => oge({
    ad: `s08-kiris-${Math.round(L)}-${k}`, olcek, sekil: dikdortgen(0, -5, L, 10), arka: G.tahta.arka, arkaAlfa: 0.88,
    tarama: { ton: () => 0.55, renkler: G.tahta.tara, yon: 0, aralik: 2.5, boy: [20, 60], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.6], minUc: 4 },
    kontur: G.tahta.kontur, konturKal: 1.7,
  });
  const yar = w * r.ara(0.45, 0.6);
  parcalar.push({ o: kiris(yar, 1), x: 0, y: -38, r: 0.02 });
  parcalar.push({ o: kiris(w - yar - 20, 2), x: yar + 14, y: -32, r: 0.16 });
  parcalar.push({ o: kiris(w, 3), x: 0, y: -82, r: -0.025 });
  for (let x = 8, k = 0; x < w; x += r.ara(24, 32), k++) {
    if (r() < eksik) continue;
    const boy = r.ara(88, 112);
    parcalar.push({ o: kazikO(boy, k % 4), x, y: 6, r: r.ara(-0.12, 0.12) + (r() < 0.15 ? r.ara(-0.4, 0.4) : 0) });
  }
  // yere düşmüş kazık
  parcalar.push({ o: kazikO(100, 9), x: w * r.ara(0.3, 0.7), y: 10, r: Math.PI / 2 - 0.08 });
  return birlestir(parcalar, olcek);
}

// ---------------------------------------------------------------- eğilmiş, sönük sokak feneri
export function fenerOge(olcek = 1) {
  const pts = [];
  for (let k = 0; k <= 20; k++) {
    const u = k / 20;
    pts.push([Math.pow(u, 2.4) * 70, -u * 430]);
  }
  const sol = pts.map(([x, y], k) => [x - lerp(7, 4, k / 20), y]);
  const sag = pts.map(([x, y], k) => [x + lerp(7, 4, k / 20), y]).reverse();
  const direk = cokgen([...sol, ...sag]);
  const direkO = oge({
    ad: 's08-fener-direk', olcek, sekil: direk, arka: '#B4AEBD', arkaAlfa: 0.85,
    tarama: { ton: () => 0.55, renkler: [[0, '#ADA6B8'], [1, '#625B70']], yon: -Math.PI / 2, aralik: 2.4, boy: [20, 60], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.6] },
    kontur: G.kontur, konturKal: 1.9,
    detay: (c, api) => { api.halka(dikdortgen(-13, -16, 26, 16)[0].pts, { renk: G.kontur, kal: 1.8 }); },
  });
  // kırık lamba başlığı (kolda sarkık)
  const bas = cokgen([[-20, 0], [20, 0], [12, 34], [-12, 34]]);
  const basO = oge({
    ad: 's08-fener-bas', olcek, sekil: bas, arka: '#9F98AE', arkaAlfa: 0.85,
    tarama: { ton: () => 0.7, renkler: [[0, '#A39CB2'], [1, '#575069']], yon: -0.6, aralik: 2.4, boy: [8, 20], kal: 1.0, alfa: 0.6, esikler: [0.25, 0.6] },
    kontur: G.kontur, konturKal: 1.8,
    detay: (c, api) => {
      api.cizgi([[-6, 8], [2, 16], [-3, 26]], { renk: '#E4E0EA', kal: 1.1 });
      api.cizgi([[6, 6], [9, 18]], { renk: '#E4E0EA', kal: 1.0 });
    },
  });
  const kol = cokgen([[0, -3], [46, 4], [46, 10], [0, 3]]);
  const kolO = oge({ ad: 's08-fener-kol', olcek, sekil: kol, arka: '#B4AEBD', tarama: null, kontur: G.kontur, konturKal: 1.6 });
  const ux = pts[20][0], uy = pts[20][1];
  return birlestir([{ o: direkO, x: 0, y: 0 }, { o: kolO, x: ux, y: uy + 6 }, { o: basO, x: ux + 46, y: uy + 12, r: 0.35 }], olcek);
}

// ---------------------------------------------------------------- savrulan kâğıt ve kuru yaprak
export function kagitOge(k, olcek = 1) {
  const r = rng(300 + k);
  const w = r.ara(26, 34), h = w * r.ara(1.2, 1.4);
  const pts = [[-w / 2, -h / 2], [r.ara(-3, 3), -h / 2 + r.ara(-2, 2)], [w / 2, -h / 2], [w / 2 + r.ara(-2, 2), r.ara(-3, 3)], [w / 2, h / 2], [r.ara(-3, 3), h / 2 + r.ara(-2, 2)], [-w / 2, h / 2], [-w / 2 + r.ara(-2, 2), r.ara(-3, 3)]];
  return oge({
    ad: `s08-kagit-${k}`, olcek, sekil: cokgen(pts), arka: '#EEECF2', arkaAlfa: 0.6,
    tarama: { ton: TON.dogrusal(-w / 2, -h / 2, w / 2, h / 2, 0.15, 0.6), renkler: [[0, '#DDD9E4'], [1, '#A49DB3']], yon: 0.6, aralik: 3, boy: [8, 20], kal: 1.0, alfa: 0.45, esikler: [0.35, 0.6], minUc: 4 },
    kontur: '#7A7389', konturKal: 1.5, titreme: 0.3,
    detay: (c, api) => api.cizgi([[r.ara(-w / 3, 0), -h / 2], [r.ara(-3, 3), 0], [r.ara(0, w / 3), h / 2]], { renk: '#A9A2B8', kal: 0.9, alfa: 0.6 }),
  });
}
export function kuruYaprakOge(k, olcek = 1) {
  const r = rng(500 + k);
  const boy = r.ara(20, 30), en = boy * r.ara(0.45, 0.6);
  const ton = [['#B7A894', '#7A6A58', '#5E5044'], ['#ABA394', '#76705F', '#544E44'], ['#B9A79C', '#806B66', '#5B4B48']][k % 3];
  return oge({
    ad: `s08-kyaprak-${k}`, olcek, sekil: donustur(yaprak(boy, en, r.ara(-2, 2)), { x: -boy / 2 }), arka: ton[0], arkaAlfa: 0.8,
    tarama: { ton: () => 0.6, renkler: [[0, ton[0]], [1, ton[1]]], yon: -0.9, aralik: 2.4, boy: [5, 12], kal: 1.0, alfa: 0.6, esikler: [0.3, 0.6], minUc: 3 },
    kontur: ton[2], konturKal: 1.5,
    detay: (c, api) => api.cizgi([[-boy / 2 + 1, 0], [boy / 2 - 2, 0]], { renk: ton[2], kal: 1.0, alfa: 0.7 }),
  });
}

/**
 * Rüzgârda savrulan parçacık yolu (kâğıt/yaprak): soldan sağa, girdaplı. t saniye. Döner {x, y, r, sx, alfa}.
 * p: { x0, y0, hiz, t0, faz, genlik, donus }
 */
export function savrulma(p, t) {
  const a = t - p.t0;
  if (a < 0) return null;
  const x = p.x0 + p.hiz * a + Math.sin(a * 1.7 + p.faz) * 30;
  const y = p.y0 + Math.sin(a * 2.3 + p.faz * 1.3) * p.genlik - a * p.yuksel + Math.sin(a * 5.1 + p.faz) * 6;
  return { x, y, r: p.faz + a * p.donus, sx: Math.cos(a * p.cevir + p.faz), alfa: 1 };
}

// ---------------------------------------------------------------- yolu kaplayan çatlak zemin
/**
 * Perspektifli çamur çatlağı ağı (ekran/dünya uzayında): ufuktan (yUfuk) aşağı (y1) satırlar. Hücre eni ufka uzaklıkla
 * doğru orantılı (wK · dy), boyu en × dy / f (perspektif basıklığı). Düğümler titrek; her düğüm satırdaki komşusuna ve
 * alt satırdaki en yakın düğüme bağlanır. Döner: [{ pts, kal, alfa }]
 */
export function catlakAgi({ x0, x1, yUfuk, y1, tohum = 1, wK = 0.28, f = 1100, dyMin = 55, olasilik = 0.86, wMin = 16 }) {
  const r = rng(tohum);
  const out = [];
  const satirlar = [];
  let dy = dyMin;
  while (yUfuk + dy < y1 + 200) {
    const w = Math.max(wMin, wK * dy);
    const h = Math.max(5, (w * dy) / f);
    const y = yUfuk + dy;
    const sira = [];
    for (let x = x0 - w * r.ara(0, 1); x < x1 + w; x += w * r.ara(0.75, 1.3)) sira.push([x + r.ara(-w, w) * 0.22, y + r.ara(-h, h) * 0.3, w, h]);
    satirlar.push(sira);
    dy += h;
  }
  const kalOf = (yy) => clamp((yy - yUfuk) / 150, 0.55, 2.3);
  const kenar = (A, B) => {
    const kal = kalOf((A[1] + B[1]) / 2);
    const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
    const n = Math.max(2, Math.round(L / 10));
    out.push({ pts: zikzakYumusak(r, A[0], A[1], B[0], B[1], n, Math.min(L * 0.12, 3 + kal * 1.5)), kal, alfa: clamp(0.35 + (A[1] - yUfuk) / 500, 0.35, 0.8) });
  };
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i];
    const alt = satirlar[i + 1];
    let k = 0;
    for (let j = 0; j < s.length; j++) {
      if (j + 1 < s.length && r() < olasilik) kenar(s[j], s[j + 1]);
      if (alt && r() < olasilik * 0.85) {
        while (k + 1 < alt.length && Math.abs(alt[k + 1][0] - s[j][0]) < Math.abs(alt[k][0] - s[j][0])) k++;
        kenar(s[j], alt[k]);
      }
    }
  }
  return out;
}
function zikzakYumusak(r, x0, y0, x1, y1, n, sap) {
  const pts = zikzak(r, x0, y0, x1, y1, n, sap);
  // hafif yumuşat (köşeli kırılma yerine kıvrımlı çatlak)
  return pts.map((p, i) => (i === 0 || i === pts.length - 1 ? p : [(pts[i - 1][0] + 2 * p[0] + pts[i + 1][0]) / 4, (pts[i - 1][1] + 2 * p[1] + pts[i + 1][1]) / 4]));
}

/** Kuru toprak zemin (çatlaklı): dünya dikdörtgeni [x0,x1]×[yUst,yAlt]; çatlaklar dünya koordinatında verilir */
export function toprakOge({ ad, x0, x1, yUst, yAlt, catlaklar = [], olcek = 1, tohum = 1, ustDalga = 0, renk = G.toprak, kenarYumusat = 0, kalCarpan = 1 }) {
  const r = rng(tohum);
  const pts = [];
  const n = 60;
  for (let k = 0; k <= n; k++) {
    const x = lerp(x0, x1, k / n);
    pts.push([x, yUst + ustDalga * (0.5 + 0.3 * Math.sin(k * 0.37 + tohum) + 0.2 * Math.sin(k * 1.13 + tohum * 2))]);
  }
  pts.push([x1, yAlt], [x0, yAlt]);
  const yer = cokgen(pts);
  const o = oge({
    ad, olcek, sekil: yer, arka: renk.arka, arkaAlfa: 0.85, arkaTasma: true,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.3 + 0.45 * clamp((y - yUst) / 900)), 0.2, 0.004, tohum), renkler: renk.tara, yon: -0.04, aralik: 3.4, boy: [40, 120], kal: 1.25, alfa: 0.5, esikler: [0.25, 0.52, 0.78] },
    kontur: ustDalga ? renk.kontur : null, konturKal: 2.0, titreme: 0.6, konturAtla: [],
    detay: (c, api) => {
      for (const k of catlaklar) {
        if (k.pts.every(([x, y]) => x < x0 - 20 || x > x1 + 20 || y < yUst - 20 || y > yAlt + 20)) continue;
        api.cizgi(k.pts, { renk: renk.kontur, kal: Math.max(0.6, k.kal * kalCarpan), alfa: k.alfa ?? 0.75, titreme: 0.2 });
      }
    },
  });
  if (!kenarYumusat) return o;
  // kenarları yumuşat (alt düzeydeki zemine dikişsiz karışsın)
  const c = o.tuval, g = c.getContext('2d');
  const S = o.olcek, F = kenarYumusat * S;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const mk = (x0_, y0_, x1_, y1_) => { const gr = g.createLinearGradient(x0_, y0_, x1_, y1_); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); return gr; };
  const w = c.width, h = c.height;
  const maske = tuval(w, h), mg = maske.getContext('2d');
  mg.fillStyle = '#000'; mg.fillRect(0, 0, w, h);
  mg.globalCompositeOperation = 'destination-in';
  for (const [a, b, cc, d] of [[0, 0, F, 0], [w, 0, w - F, 0], [0, h, 0, h - F], [0, 0, 0, F]]) { mg.fillStyle = mk(a, b, cc, d); mg.fillRect(0, 0, w, h); }
  g.drawImage(maske, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return o;
}

/** Uzak tepeler (lila-gri, soluk): üst kenarı yumuşak dalgalı şerit */
export function uzakTepeOge({ ad, w, h, tohum = 1, olcek = 1, dalga = 60, renk = 'uzak' }) {
  const r = rng(tohum);
  const P = renk === 'uzak'
    ? { arka: '#CCC7D8', tara: [[0, '#C7C1D3'], [1, '#958DA8']], kontur: '#8E87A3' }
    : { arka: '#BEB7C8', tara: [[0, '#B8B1C3'], [1, '#7E7591']], kontur: '#776F8C' };
  const pts = [];
  const f = [r() * TAU, r() * TAU, r() * TAU];
  for (let k = 0; k <= 80; k++) {
    const u = k / 80;
    pts.push([u * w, dalga * (0.5 + 0.3 * Math.sin(u * 4.1 + f[0]) + 0.15 * Math.sin(u * 9.7 + f[1]) + 0.08 * Math.sin(u * 23 + f[2]))]);
  }
  pts.push([w, h], [0, h]);
  return oge({
    ad, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.8, arkaTasma: true,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, 0, 0, h, 0.25, 0.6), 0.12, 0.008, tohum), renkler: P.tara, yon: -0.08, aralik: 3.6, boy: [40, 120], kal: 1.2, alfa: 0.45, esikler: [0.3, 0.6] },
    kontur: P.kontur, konturKal: 1.8, titreme: 0.5,
  });
}

/** Koyu fırtına bulutu (altında yağmur perdesi) */
export function firtinaBulutOge(w, tohum, olcek = 1, perde = true) {
  const sek = bulutSekli(w, tohum);
  const b = sinir(sek);
  const govde = oge({
    ad: `s08-firtina-${w}-${tohum}`, olcek, sekil: sek, arka: '#A39DB3', arkaAlfa: 0.75,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.35 + 0.5 * ((y - b.y0) / b.h)), 0.12, 0.01, tohum), renkler: [[0, '#B3ADC2'], [0.6, '#857E98'], [1, '#5C5570']], yon: -0.157, aralik: 3.2, boy: [30, 100], kal: 1.25, alfa: 0.5, esikler: [0.15, 0.45, 0.72] },
    kontur: '#6E6784', konturKal: 1.8, konturAlfa: 0.7, titreme: 0.8,
  });
  if (!perde) return govde;
  // yağmur perdesi: bulutun altında aşağı doğru seyrelen eğik çizgiler
  const ph = w * 0.9;
  const perdeO = oge({
    ad: `s08-perde-${w}-${tohum}`, olcek, sekil: dikdortgen(-w * 0.38, 0, w * 0.76, ph), zemin: null, arka: null,
    tarama: { ton: (x, y) => clamp((1 - y / ph) * (1 - Math.pow(Math.abs(x) / (w * 0.38), 2)) * 1.15), renkler: [[0, '#9E97B0'], [1, '#6A6380']], yon: Math.PI / 2 + 0.3, aralik: 3.6, boy: [30, 90], kal: 1.2, alfa: 0.5, esikler: [0.15, 0.45], karisim: 'source-over' },
    kontur: null, pay: 4,
  });
  return birlestir([{ o: perdeO, x: 0, y: -4 }, { o: govde, x: 0, y: 0 }], olcek);
}

// ---------------------------------------------------------------- yüksekten meydan
/** Taş döşemeli meydan zemini (perspektifli derzler, çatlaklar, eksik taşlar). Dünya: x0..x1, y0..y1; kaçış noktası (vx, vy) */
export function meydanOge({ ad, x0, x1, y0, y1, vx = 540, vy = -1600, olcek = 1, tohum = 4 }) {
  const r = rng(tohum);
  return oge({
    ad, olcek, sekil: dikdortgen(x0, y0, x1 - x0, y1 - y0), arka: '#D9D5DD', arkaAlfa: 0.8,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.22 + 0.3 * ((y - y0) / (y1 - y0))), 0.16, 0.005, tohum), renkler: G.tas.tara, yon: -0.06, aralik: 3.6, boy: [40, 110], kal: 1.2, alfa: 0.42, esikler: [0.25, 0.5, 0.78] },
    kontur: null,
    detay: (c, api) => {
      // yatay derzler: aralık derinlikle büyür
      const satir = [];
      for (let y = y0 + 20, d = 26; y < y1; y += d, d *= 1.075) satir.push(y);
      satir.forEach((y) => api.cizgi(zikzak(r, x0, y, x1, y + r.ara(-2, 2), 24, 1.2), { renk: '#8F879E', kal: clamp(0.8 + (y - y0) / 900, 0.8, 1.8), alfa: 0.5 }));
      // kaçış noktasına giden derzler
      for (let xb = x0 - 900; xb < x1 + 900; xb += 64) {
        const pts = [];
        for (let k = 0; k <= 10; k++) {
          const y = lerp(y0, y1, k / 10);
          const u = (y - vy) / (y1 - vy);
          pts.push([vx + (xb - vx) * u + r.ara(-1, 1), y]);
        }
        api.cizgi(pts, { renk: '#8F879E', kal: 1.0, alfa: 0.4 });
      }
      for (let i = 0; i < 9; i++) {
        const x = r.ara(x0, x1), y = r.ara(y0 + 80, y1 - 40);
        const a = r.ara(0, TAU), L = r.ara(60, 180);
        api.cizgi(zikzak(r, x, y, x + Math.cos(a) * L, y + Math.sin(a) * L * 0.5, 8, 4), { renk: '#6E6780', kal: 1.2, alfa: 0.55 });
      }
    },
  });
}

/** Kuru çeşme (yukarıdan, eğik): merkez taban (0,0) havuz ortası */
export function kuruCesmeOge(olcek = 1) {
  const R = 175, ry = 62;
  const dis = elips(0, 0, R, ry);
  const dpts = [];
  for (let k = 0; k <= 40; k++) { const a = Math.PI + (k / 40) * Math.PI; dpts.push([Math.cos(a) * R, Math.sin(a) * ry]); }
  for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI; dpts.push([Math.cos(a) * R, Math.sin(a) * ry + 26]); }
  const havuz = oge({
    ad: 's08-cesme-havuz', olcek, sekil: cokgen(dpts), arka: G.tas.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.silindir(-R, R), 0.08, 0.02, 3), renkler: G.tas.tara, yon: -Math.PI / 2, aralik: 2.8, boy: [10, 30], kal: 1.1, alfa: 0.5, esikler: [0.2, 0.5, 0.75] },
    kontur: null,
    detay: (c, api) => {
      // ön dış yüz (silindir) + ağız
      const on = [];
      for (let k = 0; k <= 40; k++) { const a = (k / 40) * Math.PI; on.push([Math.cos(a) * R, Math.sin(a) * ry + 26]); }
      api.cizgi([[-R, 0], [-R, 26]], { renk: G.tas.kontur, kal: 2.0 });
      api.cizgi([[R, 0], [R, 26]], { renk: G.tas.kontur, kal: 2.0 });
      api.cizgi(on, { renk: G.tas.kontur, kal: 2.1 });
      // iç: boş, kuru havuz (koyu), çatlaklar ve dökülmüş yapraklar
      const ic = elips(0, 0, R - 16, ry - 10);
      api.dolgu(ic, '#A59FAF', 0.6, 'multiply');
      api.tara(ic, { ton: (x, y) => clamp(0.85 - (y + ry) / (2 * ry) * 0.5), renkler: [[0, '#B4AEBE'], [1, '#5F586E']], yon: -0.3, aralik: 2.5, boy: [10, 26], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.5, 0.75], minUc: 3 });
      api.halka(ic[0].pts, { renk: G.tas.kontur, kal: 1.8 });
      api.halka(dis[0].pts, { renk: G.tas.kontur, kal: 2.2 });
      const r = rng(77);
      for (let i = 0; i < 5; i++) {
        const x = r.ara(-R * 0.6, R * 0.6), y = r.ara(-ry * 0.4, ry * 0.5);
        api.cizgi(zikzak(r, x, y, x + r.ara(-50, 50), y + r.ara(-14, 14), 5, 3), { renk: '#5A5368', kal: 1.1, alfa: 0.7 });
      }
    },
  });
  // orta sütun ve kuru kurna
  const sutun = oge({
    ad: 's08-cesme-sutun', olcek, sekil: cokgen([[-16, 0], [16, 0], [12, -120], [-12, -120]]), arka: G.tas.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.silindir(-16, 16), renkler: G.tas.tara, yon: -Math.PI / 2, aralik: 2.5, boy: [10, 30], kal: 1.0, alfa: 0.55, esikler: [0.2, 0.5, 0.75] },
    kontur: G.tas.kontur, konturKal: 1.9,
  });
  const kurna = oge({
    ad: 's08-cesme-kurna', olcek, sekil: svg('M-58 -6C-50 18 -22 30 0 30C22 30 50 18 58 -6Z'), arka: G.tas.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.silindir(-58, 58), renkler: G.tas.tara, yon: -Math.PI / 2, aralik: 2.5, boy: [8, 20], kal: 1.0, alfa: 0.55, esikler: [0.2, 0.5, 0.75] },
    kontur: G.tas.kontur, konturKal: 1.9,
    detay: (c, api) => { api.halka(elips(0, -6, 58, 14)[0].pts, { renk: G.tas.kontur, kal: 1.8 }); api.cizgi([[-20, 4], [-6, 14], [8, 9]], { renk: '#5A5368', kal: 1.1 }); },
  });
  return birlestir([{ o: havuz, x: 0, y: 0 }, { o: sutun, x: 0, y: 6 }, { o: kurna, x: 0, y: -122 }], olcek);
}

/** Yukarıdan görülen çatı saçakları (bakış noktamızın önündeki çatılar): şerit, üst kenar kırıklı */
export function onCatiOge({ ad, w, h, olcek = 1, tohum = 8 }) {
  const r = rng(tohum);
  const pts = [[0, 40], [w * 0.38, 30], [w * 0.42, 0], [w * 0.78, 12], [w * 0.8, 46], [w, 38], [w, h], [0, h]];
  return oge({
    ad, olcek, sekil: cokgen(pts), arka: '#9790A6', arkaAlfa: 0.85, arkaTasma: true,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.45 + y / h * 0.4), 0.1, 0.01, tohum), renkler: G.cati.tara, yon: -Math.PI / 2 + 0.05, aralik: 3, boy: [20, 50], kal: 1.2, alfa: 0.55, esikler: [0.2, 0.5, 0.75] },
    kontur: G.cati.kontur, konturKal: 2.2,
    detay: (c, api) => {
      for (let y = 70; y < h; y += 34) api.cizgi(zikzak(r, 0, y, w, y + r.ara(-3, 3), 24, 1.5), { renk: G.cati.kontur, kal: 1.2, alfa: 0.5 });
      for (let i = 0; i < 40; i++) { const x = r.ara(0, w), y = r.ara(60, h); api.cizgi([[x, y], [x, y + 30]], { renk: G.cati.kontur, kal: 1.0, alfa: 0.4 }); }
      // oluk çizgisi
      api.cizgi([[0, 52], [w * 0.38, 42]], { renk: G.cati.kontur, kal: 2.4 });
      api.cizgi([[w * 0.8, 58], [w, 50]], { renk: G.cati.kontur, kal: 2.4 });
      api.cizgi([[w * 0.42, 12], [w * 0.78, 24]], { renk: G.cati.kontur, kal: 2.4 });
    },
  });
}

// ---------------------------------------------------------------- rüzgâr çizgisi ve yağmur
/** Kalem rüzgâr çizgisi: pts boyunca [a, b] (0..1) aralığı görünür; uçları incelir */
export function ruzgarCizgisi(ctx, pts, a, b, { renk = '#8F89A3', kal = 1.8, alfa = 0.55, tohum = 1 } = {}) {
  a = clamp(a); b = clamp(b);
  if (b - a < 0.01) return;
  const p = yenidenOrnekle(pts, 4, false);
  const n = p.length;
  const i0 = Math.floor(a * (n - 1)), i1 = Math.ceil(b * (n - 1));
  const parca = p.slice(i0, i1 + 1);
  if (parca.length < 3) return;
  ctx.save();
  ctx.fillStyle = rgba(renk, alfa);
  darbe(ctx, parca, kal, { incelme: 0.4, sivri: 0.7, dalga: 0.1, faz: tohum });
  ctx.restore();
}
/** Rüzgâr çizgisi yolu: yatay, hafif dalgalı, ucunda kıvrım (girdap) */
export function ruzgarYolu(x0, y0, L, { genlik = 18, kivrim = true, tohum = 1 } = {}) {
  const r = rng(tohum);
  const f = r() * TAU;
  const pts = [];
  for (let k = 0; k <= 40; k++) {
    const u = k / 40;
    pts.push([x0 + u * L, y0 + Math.sin(u * 5 + f) * genlik * (0.4 + u * 0.6)]);
  }
  if (kivrim) {
    const [ex, ey] = pts[pts.length - 1];
    const R = genlik * 1.6;
    for (let k = 1; k <= 24; k++) {
      const a = -Math.PI / 2 + (k / 24) * TAU * 0.85;
      const rr = R * (1 - k / 40);
      pts.push([ex + Math.cos(a) * rr, ey - R + Math.sin(a) * rr + R * 0]);
    }
  }
  return pts;
}

/** Ekran uzayında eğik yağmur. guc 0..1; bant: altyazı bandında seyrelt */
export function yagmur(ctx, t, guc, { sayi = 150, aci = 0.32, hiz = 1500, tohum = 21, renk = '#7C7591' } = {}) {
  if (guc <= 0.01) return;
  const r = rng(tohum);
  const ux = Math.sin(aci), uy = Math.cos(aci);
  ctx.save();
  for (let i = 0; i < sayi; i++) {
    const x0 = r() * (W + 600) - 300, y0 = r() * H;
    const v = hiz * r.ara(0.8, 1.2);
    const L = r.ara(26, 58) * (0.6 + 0.4 * guc);
    const esik = r();
    if (esik > guc) continue;
    const d = (y0 + t * v) % (H + 200);
    const y = d - 100;
    const x = ((x0 + d * (ux / uy)) % (W + 600) + (W + 600)) % (W + 600) - 300;
    const acik = r() < 0.55;
    let a = (acik ? r.ara(0.42, 0.7) : r.ara(0.34, 0.62)) * Math.min(1, guc * 1.4);
    if (y > 1360 && y < 1660) a *= 0.35;
    ctx.fillStyle = rgba(acik ? '#EEECF4' : renk, a);
    darbe(ctx, [[x, y], [x + ux * L * 0.5, y + uy * L * 0.5], [x + ux * L, y + uy * L]], r.ara(1.3, 2.0), { incelme: 0.45, sivri: 0.6 });
  }
  ctx.restore();
}

// ---------------------------------------------------------------- sokak döküntüleri
/** Devrik fıçı (yan yatmış): merkez taban (0,0) */
export function ficiOge(olcek = 1) {
  const w = 96, h = 62;
  return oge({
    ad: 's08-fici', olcek, sekil: svg(`M${-w / 2} ${-h}C${-w / 2 - 10} ${-h * 0.7} ${-w / 2 - 10} ${-h * 0.3} ${-w / 2} 0L${w / 2} 0C${w / 2 + 10} ${-h * 0.3} ${w / 2 + 10} ${-h * 0.7} ${w / 2} ${-h}Z`), arka: G.tahta.arka, arkaAlfa: 0.88,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.3 + 0.55 * Math.pow((y + h / 2) / (h / 2), 2) * 0.5 + (y > -h * 0.3 ? 0.25 : 0)), 0.08, 0.05, 2), renkler: G.tahta.tara, yon: 0, aralik: 2.4, boy: [16, 44], kal: 1.0, alfa: 0.55, esikler: [0.2, 0.5, 0.75], minUc: 4 },
    kontur: G.tahta.kontur, konturKal: 1.8,
    detay: (c, api) => {
      for (const x of [-w * 0.3, w * 0.3]) api.cizgi([[x, -h + 1], [x + 3, -h * 0.5], [x, -1]], { renk: G.kontur, kal: 2.2 });
      api.halka(elips(w / 2 + 2, -h / 2, 9, h / 2 - 2)[0].pts, { renk: G.tahta.kontur, kal: 1.6 });
      for (let k = 1; k < 4; k++) api.cizgi([[-w / 2 + 6, -h * k / 4], [w / 2 - 8, -h * k / 4 + 2]], { renk: G.tahta.kontur, kal: 0.9, alfa: 0.5 });
    },
  });
}
/** Kırık araba tekerleği (duvara yaslanmış gibi eğik dursun diye merkezli): merkez (0,0), yarıçap 58 */
export function tekerlekOge(olcek = 1) {
  const R = 58;
  const dis = elips(0, 0, R, R), ic = elips(0, 0, R - 9, R - 9);
  return oge({
    ad: 's08-tekerlek', olcek, sekil: [...dis, ...ic.map((p) => ({ ...p, pts: [...p.pts].reverse() }))], arka: G.tahta.arka, arkaAlfa: 0.9, kural: 'evenodd',
    tarama: { ton: () => 0.55, renkler: G.tahta.tara, yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 2.4, boy: [10, 26], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.6], minUc: 3 },
    kontur: G.tahta.kontur, konturKal: 1.8,
    detay: (c, api) => {
      const r = rng(4);
      for (let k = 0; k < 8; k++) {
        if (k === 3 || k === 6) continue; // kırık parmaklar
        const a = (k / 8) * TAU + 0.2;
        const pa = [Math.cos(a) * 10, Math.sin(a) * 10], pb = [Math.cos(a) * (R - 9), Math.sin(a) * (R - 9)];
        const nx = -Math.sin(a) * 3.2, ny = Math.cos(a) * 3.2;
        const p = cokgen([[pa[0] + nx, pa[1] + ny], [pb[0] + nx, pb[1] + ny], [pb[0] - nx, pb[1] - ny], [pa[0] - nx, pa[1] - ny]]);
        api.dolgu(p, G.tahta.arka, 0.95);
        api.halka(p[0].pts, { renk: G.tahta.kontur, kal: 1.2 });
      }
      const a = (3 / 8) * TAU + 0.2;
      api.cizgi([[Math.cos(a) * 10, Math.sin(a) * 10], [Math.cos(a) * 26, Math.sin(a) * 26 + 3]], { renk: G.tahta.kontur, kal: 2.4 });
      api.dolgu(elips(0, 0, 12, 12), '#9E948F', 0.95);
      api.halka(elips(0, 0, 12, 12)[0].pts, { renk: G.tahta.kontur, kal: 1.5 });
      api.cizgi([[R * 0.6, -R * 0.62], [R * 0.75, -R * 0.4]], { renk: '#3E3446', kal: 2.0 });
    },
  });
}
/** Kırık sandık: taban ortası (0,0) */
export function kirikSandikOge(olcek = 1) {
  const w = 84, h = 64;
  return oge({
    ad: 's08-ksandik', olcek, sekil: cokgen([[-w / 2, 0], [w / 2, 0], [w / 2, -h * 0.7], [w * 0.2, -h * 0.55], [0, -h], [-w / 2, -h]]), arka: G.tahta.arka, arkaAlfa: 0.88,
    tarama: { ton: TON.dogrusal(-w / 2, -h, w / 2, 0, 0.3, 0.75), renkler: G.tahta.tara, yon: 0, aralik: 2.4, boy: [14, 40], kal: 1.0, alfa: 0.55, esikler: [0.25, 0.55, 0.8], minUc: 4 },
    kontur: G.tahta.kontur, konturKal: 1.8,
    detay: (c, api) => {
      for (const y of [-h * 0.33, -h * 0.66]) api.cizgi([[-w / 2, y], [w / 2 - (y < -h * 0.5 ? w * 0.3 : 0), y]], { renk: G.tahta.kontur, kal: 1.3 });
      api.cizgi([[-w / 2 + 4, -2], [w / 2 - 4, -h * 0.66]], { renk: G.tahta.kontur, kal: 1.6 });
      // içi karanlık kırık köşe
      const b = cokgen([[w * 0.2, -h * 0.55], [w / 2, -h * 0.7], [w / 2 - 6, -h * 0.5], [w * 0.22, -h * 0.42]]);
      api.dolgu(b, '#4E4659', 0.8);
    },
  });
}
