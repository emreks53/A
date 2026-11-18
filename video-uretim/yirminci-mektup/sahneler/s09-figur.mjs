// s09 yardımcısı: kuşbakışı sade erkek figür (saç dairesi + omuzlar; yürürken kollar ve ayakkabı uçları görünür,
// "ellerini başına koyar" pozu) ve yazısız yön levhaları (direk + ok biçimli tahta, yere düşen gölge).
// Yerel koordinat: figür -y yönüne bakar, (0,0) omuz ortası; birim = labirent dünya birimi (s = 1).
import { tuval, clamp, lerp, TAU, rgba } from '../motor/temel.mjs';
import { oge, ogeCiz, TON } from '../motor/kalem.mjs';
import { svg, elips } from '../motor/sekil.mjs';

export const FR = {
  gomlek: { arka: '#E6DDCB', tara: [[0, '#E0D6C2'], [0.6, '#CBBEA4'], [1, '#A99A80']], kontur: '#74675A' },
  sac: { arka: '#5E4D42', tara: [[0, '#6A574A'], [1, '#33281F']], kontur: '#2A211B' },
  ten: { arka: '#EECFB6', tara: [[0, '#EAC6A8'], [1, '#C49171']], kontur: '#8C6650' },
  ayakkabi: { arka: '#6A574A', tara: [[0, '#6E5B4D'], [1, '#3C3029']], kontur: '#2A211B' },
  tahta: { arka: '#DCCDAE', tara: [[0, '#D6C39F'], [0.6, '#B59D76'], [1, '#8C7351']], kontur: '#5C4A33' },
  direk: { arka: '#857565', tara: [[0, '#8A7A69'], [1, '#4C4037']], kontur: '#3A3029' },
};

const OLCEKLER = [2.2, 1.2, 0.6, 0.3, 0.15];
const olcekSec = (ekran) => {
  let o = OLCEKLER[0];
  for (const v of OLCEKLER) if (v >= ekran * 0.95) o = v;
  return o;
};

function parca(ad, sekil, R, olcek, { ton = null, yonF = null, yon = -0.6, aralik = 2.6, boy = [8, 22], kal = 1.1 } = {}) {
  return oge({
    ad: 's09-tepe-' + ad, olcek, sekil, arka: R.arka, arkaAlfa: 0.82, arkaBulanik: 3,
    tarama: { ton: ton || TON.kure(-8, -8, 40, { lx: -0.5, ly: -0.6, lz: 0.62 }), renkler: R.tara, yon, yonF, aralik, boy, kal, alfa: 0.5, esikler: [0.15, 0.5, 0.78], minUc: 4 },
    kontur: R.kontur, konturKal: 1.9, titreme: 0.25,
  });
}

const kapsul = (r0, L, r1) => svg(`M${-r0} 0A${r0} ${r0} 0 0 1 ${r0} 0L${r1} ${L}A${r1} ${r1} 0 0 1 ${-r1} ${L}Z`);

const parcalar = new Map();
function adamParcalari(olcek) {
  if (parcalar.has(olcek)) return parcalar.get(olcek);
  const P = {};
  P.govde = parca('govde', svg('M-43 3C-45 -8 -37 -16 -23 -17L23 -17C37 -16 45 -8 43 3C41 12 31 17 17 17L-17 17C-31 17 -41 12 -43 3Z'), FR.gomlek, olcek,
    { ton: TON.gurultulu(TON.kure(-14, -10, 56, { lx: -0.5, ly: -0.6, lz: 0.6, ortam: 0.1 }), 0.05, 0.05, 3), yon: 0.25, aralik: 2.8, boy: [10, 30] });
  P.bas = parca('bas', svg('M0 -19C10 -19 17 -12 17 -2C17 9 10 15 0 15C-10 15 -17 9 -17 -2C-17 -12 -10 -19 0 -19Z'), FR.ten, olcek, { ton: TON.kure(-5, -8, 22) });
  P.burun = parca('burun', elips(0, 0, 4, 4.5), FR.ten, olcek, { ton: TON.kure(-1, -1, 5) });
  P.kulak = parca('kulak', elips(0, 0, 3.4, 5.2), FR.ten, olcek, { ton: TON.kure(-1, -1, 6) });
  // saç: başın üstünü ve arkasını örter, önde alnın ince bir hilali kalır; tepe girdabı
  P.sac = parca('sac', svg('M0 -15C11 -15 18 -8 18 1C18 11 10 17 0 17C-10 17 -18 11 -18 1C-18 -8 -11 -15 0 -15Z'), FR.sac, olcek,
    { ton: TON.kure(-6, -6, 22, { lx: -0.5, ly: -0.6, lz: 0.6, ortam: 0.2 }), yonF: (x, y) => Math.atan2(y - 3, x - 2) + 1.25, aralik: 2.1, boy: [6, 16] });
  P.kol = parca('kol', kapsul(8.5, 30, 7.5), FR.gomlek, olcek, { ton: TON.silindir(-8.5, 8.5, { sag: false }), yon: Math.PI / 2, boy: [8, 20] });
  P.onkol = parca('onkol', kapsul(7.5, 26, 6.5), FR.gomlek, olcek, { ton: TON.silindir(-7.5, 7.5, { sag: false }), yon: Math.PI / 2, boy: [8, 20] });
  P.el = parca('el', elips(0, 0, 6.5, 7), FR.ten, olcek, { ton: TON.kure(-2, -2, 8) });
  P.ayak = parca('ayak', svg('M0 -14C5 -14 7.5 -8 7.5 -1C7.5 7 5 12 0 12C-5 12 -7.5 7 -7.5 -1C-7.5 -8 -5 -14 0 -14Z'), FR.ayakkabi, olcek, { ton: TON.kure(-3, -5, 14), boy: [6, 14] });
  parcalar.set(olcek, P);
  return P;
}

let golgeT = null;
function golgeTuvali() {
  if (golgeT) return golgeT;
  golgeT = tuval(200, 160);
  const g = golgeT.getContext('2d');
  g.filter = 'blur(7px)';
  g.fillStyle = 'rgba(70,62,92,0.55)';
  g.beginPath();
  g.ellipse(100, 80, 50, 26, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(100, 76, 21, 21, 0, 0, TAU);
  g.fill();
  return golgeT;
}

function uzuv(ctx, sp, ax, ay, bx, by, Lref) {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy);
  if (L < 0.5) return;
  const a = Math.atan2(dy, dx) - Math.PI / 2;
  ogeCiz(ctx, sp, ax, ay, { r: a, sx: 1, sy: clamp(L / Lref, 0.25, 1.6) });
}

/**
 * Kuşbakışı adam. (x, y) dünya konumu, h bakış açısı (0: +x, π/2: +y), poz: { faz (yürüyüş evresi), yuru 0..1,
 * eller 0..1 (elleri başında), sallan (yana salınım, birim) }, s ölçek, ekranOlcek: ekrandaki büyütme (sprite
 * çözünürlüğü için), golgeYon: gölgenin dünya ötelemesi [dx, dy].
 */
export function tepeAdam(ctx, x, y, h, poz = {}, { s = 1, ekranOlcek = 1, alfa = 1, golgeYon = [11, 15] } = {}) {
  if (alfa <= 0.002 || s <= 0) return;
  const P = adamParcalari(olcekSec(ekranOlcek * s));
  const faz = poz.faz || 0, yuru = clamp(poz.yuru || 0), el = clamp(poz.eller || 0);
  const sw = Math.sin(faz) * yuru;
  ctx.save();
  ctx.globalAlpha *= alfa;
  // gölge (dünya yönünde, dönmez)
  ctx.save();
  ctx.translate(x + golgeYon[0] * s, y + golgeYon[1] * s);
  ctx.rotate(h + Math.PI / 2);
  ctx.scale(s, s);
  ctx.drawImage(golgeTuvali(), -100, -80, 200, 160);
  ctx.restore();
  ctx.translate(x, y);
  ctx.rotate(h + Math.PI / 2);
  ctx.scale(s, s);
  ctx.translate((poz.sallan || 0) + 1.6 * Math.sin(faz) * yuru, 0);
  // ayaklar: duruşta burunlar önde hafifçe görünür; yürürken biri önde, biri arkada
  const adim = 21 * sw;
  const kipir = poz.kipir || 0;
  ogeCiz(ctx, P.ayak, -11, -9 - adim + kipir, {});
  ogeCiz(ctx, P.ayak, 11, -9 + adim - kipir, {});
  // kollar
  const kolGeo = (k) => {
    const yonk = k === 0 ? -1 : 1; // 0 sol (-x), 1 sağ
    const sv = k === 0 ? sw : -sw;
    const S = [yonk * 35, 1];
    const Ey = sv >= 0 ? -11 * sv : 10 * -sv, Hy = sv >= 0 ? -28 * sv : 23 * -sv;
    const E0 = [yonk * (40 + 2 * Math.abs(sv)), 2 + Ey], H0 = [yonk * (40 + 1 * Math.abs(sv)), 2 + Hy];
    const E1 = [yonk * 52, -22], H1 = [yonk * 12, -9];
    const u = el * el * (3 - 2 * el);
    return { S, E: [lerp(E0[0], E1[0], u), lerp(E0[1], E1[1], u)], Hd: [lerp(H0[0], H1[0], u), lerp(H0[1], H1[1], u)] };
  };
  const kolCiz = (k) => {
    const g = kolGeo(k);
    uzuv(ctx, P.kol, g.S[0], g.S[1], g.E[0], g.E[1], 30);
    uzuv(ctx, P.onkol, g.E[0], g.E[1], g.Hd[0], g.Hd[1], 26);
  };
  const elCiz = (k) => { const g = kolGeo(k); ogeCiz(ctx, P.el, g.Hd[0], g.Hd[1], {}); };
  const kolUstte = el > 0.45;
  if (!kolUstte) { kolCiz(0); kolCiz(1); elCiz(0); elCiz(1); }
  ogeCiz(ctx, P.govde, 0, 0);
  if (kolUstte) { kolCiz(0); kolCiz(1); }
  // baş
  ogeCiz(ctx, P.kulak, -16.5, -1, {});
  ogeCiz(ctx, P.kulak, 16.5, -1, {});
  ogeCiz(ctx, P.burun, 0, -19.5, {});
  ogeCiz(ctx, P.bas, 0, -1, {});
  ogeCiz(ctx, P.sac, 0, -1, {});
  if (kolUstte) { elCiz(0); elCiz(1); }
  ctx.restore();
}

// ---------------------------------------------------------------- yön levhası
let levhaParca = null;
const LEVHA = svg('M-16 -15L80 -15L80 -27L124 0L80 27L80 15L-16 15C-20 15 -22 12 -22 8L-22 -8C-22 -12 -20 -15 -16 -15Z');
export function levhaHazirla(olcek = 1.6) {
  if (levhaParca && levhaParca.olcek === olcek) return levhaParca;
  const tahta = oge({
    ad: 's09-levha', olcek, sekil: LEVHA, arka: FR.tahta.arka, arkaAlfa: 0.85, arkaBulanik: 4,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, -27, 0, 27, 0.25, 0.7), 0.1, 0.05, 7), renkler: FR.tahta.tara, yon: 0.04, aralik: 2.7, boy: [18, 50], kal: 1.15, alfa: 0.55, esikler: [0.15, 0.45, 0.72] },
    kontur: FR.tahta.kontur, konturKal: 2.0, titreme: 0.3,
    detay: (c, api) => {
      // ağaç damarı
      api.cizgi([[-14, -5], [20, -6], [50, -4], [74, -5]], { renk: FR.tahta.kontur, kal: 1.1, alfa: 0.45 });
      api.cizgi([[-10, 6], [30, 5], [70, 7]], { renk: FR.tahta.kontur, kal: 1.0, alfa: 0.4 });
    },
  });
  const direk = oge({
    ad: 's09-direk', olcek, sekil: elips(0, 0, 8, 8), arka: FR.direk.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.kure(-3, -3, 9), renkler: FR.direk.tara, yon: -0.6, aralik: 2.4, boy: [6, 14], esikler: [0.2, 0.55] },
    kontur: FR.direk.kontur, konturKal: 1.8,
  });
  // gölge (bulanık, koyu lila)
  const gt = tuval(220, 110);
  const g = gt.getContext('2d');
  g.filter = 'blur(5px)';
  g.fillStyle = 'rgba(60,52,82,0.5)';
  g.translate(60, 55);
  g.beginPath();
  for (const p of LEVHA) { g.moveTo(p.pts[0][0], p.pts[0][1]); for (const q of p.pts) g.lineTo(q[0], q[1]); g.closePath(); }
  g.fill();
  levhaParca = { tahta, direk, golge: gt, olcek };
  return levhaParca;
}
/** Levha: direk (x, y) dünya konumunda, a yön açısı, s ölçek (pop), yukseklik: gölge ötelemesi çarpanı */
export function levhaCiz(ctx, x, y, a, { s = 1, alfa = 1, golgeYon = [20, 27], yukseklik = 1 } = {}) {
  if (s <= 0.001 || alfa <= 0.002) return;
  const L = levhaHazirla();
  ctx.save();
  ctx.globalAlpha *= alfa;
  // gölge: dünya yönünde ötelenmiş
  ctx.save();
  ctx.translate(x + golgeYon[0] * yukseklik * s, y + golgeYon[1] * yukseklik * s);
  ctx.rotate(a);
  ctx.scale(s, s);
  ctx.drawImage(L.golge, -60, -55);
  ctx.restore();
  ogeCiz(ctx, L.tahta, x, y, { r: a, s });
  ogeCiz(ctx, L.direk, x, y, { s });
  ctx.restore();
}
