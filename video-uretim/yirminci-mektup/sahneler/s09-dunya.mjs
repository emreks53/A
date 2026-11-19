// s09 yardımcısı: "âvâre nev-i beşer" dünyası (yan görünüş) ve "fâni" silinişi.
//  - Gerçek perspektifle (ufuk y 430, göz yüksekliği 11 m) yer düzleminde tasarlanmış, tepeye kıvrıla kıvrıla
//    çıkan ve sisin içinde kaybolan uzun bir yol; farklı derinliklerde sağa sola yürüyen, durup geri dönen, kendi
//    etrafında dönen adamlar. Önde s08'den gelen, yerde oturan yalnız adam ve son yapraklarını taşıyan kuru ağaç.
//  - Bir sıra çiçek açar ve hemen solar; yapraklar düşer; çizim silgi darbeleriyle çıplak filme döner.
import { tuval, rng, clamp, lerp, ease, an, pop, TAU, W, H, rgba, renkKaristir, renkHex } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, gokTuvali, TON, PALET } from '../motor/kalem.mjs';
import { svg, elips, yaprak as yaprakSekli, donustur, cokgen } from '../motor/sekil.mjs';
import { insanYan, yuruyus, DURUS, pozKaristir, DONGU_YOLU } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';
import { yereOturt, yerdeOturus, OTUR_TEMAS } from './s08-insan.mjs';

// ---------------------------------------------------------------- perspektif
export const YH = 430, HC = 11, F = 1000;
export const proj = (xg, d) => [540 + (xg * F) / d, YH + (F * HC) / d];
export const pxm = (d) => F / d; // metre başına piksel
const PX_M = 384 / 1.75; // insan.mjs: s = 1'de metre başına piksel
export const olcekD = (d) => pxm(d) / PX_M;
export const derinlik = (y) => (F * HC) / (y - YH);

// yolun kıvrımları (yer düzlemi, metre): düz katlar ve aralarındaki yarım daireler
const KAT = [
  { d: 12.6, xa: -14, xb: 3.6 },
  { d: 17.3, xa: -6.6, xb: 3.6 },
  { d: 24.2, xa: -6.6, xb: 7 },
  { d: 34.4, xa: -9, xb: 7 },
  { d: 50, xa: -9, xb: 70 },
];
const YOL_EN = 1.7;

function yolMerkezi() {
  const pts = [];
  const ekle = (x, d) => pts.push([x, d]);
  const duz = (x0, x1, d) => {
    const n = Math.max(2, Math.ceil(Math.abs(x1 - x0) / (0.05 * d / 12)));
    for (let k = 0; k <= n; k++) ekle(lerp(x0, x1, k / n), d);
  };
  const kivrim = (cx, d0, d1, sag) => {
    const r = (d1 - d0) / 2, cd = (d0 + d1) / 2;
    const n = Math.max(12, Math.ceil((Math.PI * r) / (0.05 * cd / 12)));
    for (let k = 1; k < n; k++) {
      const f = (k / n) * Math.PI;
      ekle(cx + (sag ? 1 : -1) * r * Math.sin(f), cd - r * Math.cos(f));
    }
  };
  duz(KAT[0].xa, KAT[0].xb, KAT[0].d);
  kivrim(KAT[0].xb, KAT[0].d, KAT[1].d, true);
  duz(KAT[1].xb, KAT[1].xa, KAT[1].d);
  kivrim(KAT[1].xa, KAT[1].d, KAT[2].d, false);
  duz(KAT[2].xa, KAT[2].xb, KAT[2].d);
  kivrim(KAT[2].xb, KAT[2].d, KAT[3].d, true);
  duz(KAT[3].xb, KAT[3].xa, KAT[3].d);
  kivrim(KAT[3].xa, KAT[3].d, KAT[4].d, false);
  duz(KAT[4].xa, KAT[4].xb, KAT[4].d);
  return pts;
}
function yolSekli() {
  const c = yolMerkezi();
  const sol = [], sag = [];
  for (let i = 0; i < c.length; i++) {
    const a = c[Math.max(0, i - 1)], b = c[Math.min(c.length - 1, i + 1)];
    let tx = b[0] - a[0], td = b[1] - a[1];
    const l = Math.hypot(tx, td) || 1;
    tx /= l; td /= l;
    const nx = -td, nd = tx;
    sol.push(proj(c[i][0] + nx * YOL_EN / 2, c[i][1] + nd * YOL_EN / 2));
    sag.push(proj(c[i][0] - nx * YOL_EN / 2, c[i][1] - nd * YOL_EN / 2));
  }
  return { sekil: cokgen([...sol, ...sag.reverse()]), merkez: c };
}

// ---------------------------------------------------------------- yürüyenler
const YURU_V = 1.2; // m/sn
const DONGU_M = DONGU_YOLU / PX_M; // bir yürüyüş döngüsünde alınan yol (m)
function programUret(r, kat, tip, t0, t1) {
  const d = kat.d + r.ara(-0.45, 0.45) * (kat.d / 20);
  const xa = kat.xa + 0.9, xb = Math.min(kat.xb - 0.9, kat.xa + 22);
  let x = r.ara(xa + 0.5, xb - 0.5), yon = r() < 0.5 ? -1 : 1, t = t0 - r.ara(0, 1.5);
  const v = YURU_V * r.ara(0.85, 1.15);
  const seg = [];
  let mesafe = r() * 3;
  while (t < t1) {
    if (tip === 'don') {
      const sure = r.ara(0.45, 0.85);
      seg.push({ t0: t, t1: t + sure, x0: x, yon, yuru: false, m0: mesafe });
      t += sure;
      if (r() < 0.8) yon = -yon;
      if (r() < 0.2) { // iki adım
        const s2 = 0.7;
        const hedef = clamp(x + yon * v * s2, xa, xb);
        seg.push({ t0: t, t1: t + s2, x0: x, yon, yuru: true, v: Math.abs(hedef - x) / s2, m0: mesafe });
        mesafe += Math.abs(hedef - x); x = hedef; t += s2;
      }
    } else {
      let sure = r.ara(1.5, 3.2);
      let hedef = x + yon * v * sure;
      if (hedef < xa || hedef > xb) { hedef = clamp(hedef, xa, xb); sure = Math.abs(hedef - x) / v; }
      if (sure > 0.15) {
        seg.push({ t0: t, t1: t + sure, x0: x, yon, yuru: true, v, m0: mesafe });
        mesafe += Math.abs(hedef - x); x = hedef; t += sure;
      }
      const dur = r.ara(0.3, 0.75);
      seg.push({ t0: t, t1: t + dur, x0: x, yon, yuru: false, m0: mesafe });
      t += dur;
      const kenar = x <= xa + 0.3 || x >= xb - 0.3;
      if (kenar || r() < 0.5) yon = -yon;
    }
  }
  return { d, seg, olc: olcekD(d), faz0: r() * TAU };
}
function durum(p, t) {
  const S = p.seg;
  let i = 0;
  while (i < S.length - 1 && t >= S[i].t1) i++;
  const s = S[i];
  const u = clamp(t - s.t0, 0, s.t1 - s.t0);
  const x = s.yuru ? s.x0 + s.yon * s.v * u : s.x0;
  const m = s.m0 + (s.yuru ? s.v * u : 0);
  // dönüş: önceki parçanın yönü farklıysa ilk 0,18 sn'de yassılarak döner
  let yonG = s.yon;
  const onceki = i > 0 ? S[i - 1] : null;
  if (onceki && onceki.yon !== s.yon) {
    const k = clamp((t - s.t0) / 0.18);
    yonG = s.yon * (-1 + 2 * ease.inOutSine(k));
    if (Math.abs(yonG) < 0.08) yonG = 0.08 * Math.sign(yonG || s.yon);
  }
  // yürüyüş miktarı: başlarken/dururken yumuşak
  let yuru = 0;
  if (s.yuru) yuru = Math.min(clamp((t - s.t0) / 0.2), clamp((s.t1 - t) / 0.2) * 0.6 + 0.4);
  else if (onceki && onceki.yuru) yuru = 1 - clamp((t - s.t0) / 0.22);
  return { x, m, yon: yonG, yuru, yuruyor: s.yuru };
}

/** Aynı kattaki yürüyenlerden yolları kesişenleri (görünür süre içinde yan yana gelenleri) yolun ön ve arka
 *  şeritlerine ayırır: iki adam aynı derinlikte birbirinin içinden geçmesin, biri ötekinin arkasından geçsin.
 *  Kesişme çizgesi iki renge boyanır (+1 arka, -1 ön); kimseyle kesişmeyen kendi derinliğinde kalır. */
const SERIT = 0.62; // m (yol yarı eni 0,85)
function seritAta(liste, kat) {
  const n = liste.length;
  const kom = liste.map(() => []);
  for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
    for (let t = 82.4; t <= 88.6; t += 0.04) {
      if (Math.abs(durum(liste[a], t).x - durum(liste[b], t).x) < 0.8) { kom[a].push(b); kom[b].push(a); break; }
    }
  }
  const s = new Array(n).fill(0);
  for (let a = 0; a < n; a++) {
    if (s[a] || !kom[a].length) continue;
    s[a] = 1;
    const q = [a];
    while (q.length) {
      const u = q.shift();
      for (const v of kom[u]) if (!s[v]) { s[v] = -s[u]; q.push(v); }
    }
  }
  liste.forEach((w, i) => {
    if (!s[i]) return;
    w.d = kat.d + s[i] * SERIT;
    w.olc = olcekD(w.d);
  });
}

// ---------------------------------------------------------------- sprite'lar ve yerleşim
let gok, uzakTepe, zemin, yol, agacB, agacK1, agacK2, sonYapraklar, yuruyenler, cicekler, cicekSprite, solgunSprite, tacSprite, yaprakSp, bulutlar, kirintiSp, cimenler, cit;
// s08'in son karesiyle aynı: adam (s08 kamerasında ekran 540, 1127; ekran ölçeği 0,9), sola bakar, yerde oturur
export const ADAM = { x: 760, y: 1878, s: 0.6 };
export const AGAC = { x: 110, y: 1500, boy: 330 };

// ---------------------------------------------------------------- oturuş
// s08'in sonundaki yerde oturuşun aynısı (aynı fonksiyon): kalça ve iki taban yerde, kollar baldırlara dolanmış, baş
// öne eğik. Devirde (82,5–82,9) iki sahnedeki adam aynı poz, aynı ekran yeri ve ölçekte üst üste düşer.
export function oturus(t) {
  return yereOturt(yerdeOturus(t), OTUR_TEMAS);
}

/** Solmuş çiçek başı: dar, kıvrık, gri-kahve taç yaprakları */
function solgunCicek(r, olcek) {
  const yp = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU - Math.PI / 2 + 0.2;
    yp.push(...donustur(svg(`M0 0C${-r * 0.32} ${-r * 0.25} ${-r * 0.38} ${-r * 0.7} ${-r * 0.1} ${-r * 0.78}C${r * 0.12} ${-r * 0.7} ${r * 0.3} ${-r * 0.35} 0 0Z`), { r: a + Math.PI / 2 }));
  }
  return oge({
    ad: `s09-solgun-${r}`, olcek, sekil: yp, arka: '#D9CFC2', arkaAlfa: 0.7,
    tarama: { ton: TON.radyal(0, 0, r, 0.75, 0.25), renkler: [[0, '#CBBFAE'], [1, '#8B7A66']], yonF: (x, y) => Math.atan2(y, x), aralik: 2.8, boy: [6, 14], esikler: [0.3, 0.6], alfa: 0.55 },
    kontur: '#6E5E4E', konturKal: 1.7,
    detay: (c, api) => { api.dolgu(elips(0, 0, r * 0.17, r * 0.17), '#A8906A', 0.9); api.halka(elips(0, 0, r * 0.17, r * 0.17)[0].pts, { renk: '#6E5E4E', kal: 1.3 }); },
  });
}
function tacYapragiOge(r, renk, olcek) {
  const R = renk === 'lila' ? { a: '#DCD0F0', t: [[0, '#CBBDE8'], [1, '#7D6BA6']], k: '#5E4E8A' } : { a: '#F3C4D0', t: [[0, '#F0B2C2'], [1, '#B8607C']], k: '#94405C' };
  return oge({
    ad: `s09-tac-${r}-${renk}`, olcek, sekil: svg(`M0 0C${-r * 0.5} ${-r * 0.3} ${-r * 0.6} ${-r * 0.9} 0 ${-r}C${r * 0.6} ${-r * 0.9} ${r * 0.5} ${-r * 0.3} 0 0Z`),
    arka: R.a, arkaAlfa: 0.7, tarama: { ton: () => 0.55, renkler: R.t, yon: -1.2, aralik: 2.6, boy: [5, 10], esikler: [0.3], alfa: 0.5 }, kontur: R.k, konturKal: 1.5,
  });
}

export function dunyaHazirla() {
  gok = gokTuvali({ w: 1700, h: 1050, olcek: 1, ad: 's09-gok', ust: '#5F5876', orta: '#948DA8', alt: '#CBC6D5', parilti: '#CEC9DA', arkaUst: '#9C96AE', arkaAlt: '#D6D2DE', tohum: 29, yogunluk: 1.15 });
  uzakTepe = M.tepeOge({ w: 2000, h: 300, tohum: 13, renk: 'gri', dalga: 85, ad: 's09-uzaktepe', olcek: 1 });
  zemin = M.tepeOge({ w: 2100, h: 2150, tohum: 7, renk: 'gri', dalga: 26, ad: 's09-zemin', olcek: 1 });
  const ys = yolSekli();
  yol = oge({
    ad: 's09-yol', olcek: 1.15, sekil: ys.sekil, arka: '#DDD7CF', arkaAlfa: 0.85, arkaBulanik: 3,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, YH, 0, 1400, 0.25, 0.55), 0.12, 0.01, 4), renkler: [[0, '#D4CCC2'], [0.6, '#B3A99C'], [1, '#8C8276']], yon: -0.03, aralik: 3.0, boy: [24, 80], kal: 1.15, alfa: 0.5, esikler: [0.2, 0.5] },
    kontur: '#7E746C', konturKal: 1.8, titreme: 0.4,
  });
  bulutlar = [M.bulutOge(460, 31, 1.1, true), M.bulutOge(340, 8, 1.1, true), M.bulutOge(420, 17, 1.1, true), M.bulutOge(300, 5, 1.1, true)];
  agacB = M.agac({ boy: AGAC.boy, tohum: 77, yaprakli: false, kuru: true, olcek: 1.7 });
  agacK1 = M.agac({ boy: 170, tohum: 52, yaprakli: false, kuru: true, olcek: 1.2 });
  agacK2 = M.agac({ boy: 110, tohum: 64, yaprakli: false, kuru: true, olcek: 1.2 });
  // kuru ağacın son yaprakları: dal uçlarında
  const yr = rng(404);
  const uclar = agacB.dallar.filter((d) => d.k1 < 3.2).sort((a, b) => a.x2 - b.x2);
  sonYapraklar = [];
  for (let k = 0; k < 7; k++) {
    const d = uclar[Math.floor(((k + 0.5) / 7) * uclar.length)];
    if (!d) continue;
    sonYapraklar.push({ x: AGAC.x + d.x2, y: AGAC.y + d.y2 + 4, r0: yr.ara(0.6, 2.2), tdus: 0, faz: yr() * TAU, oge: null, renk: k % 3 });
  }
  yaprakSp = [0, 1, 2].map((k) => oge({
    ad: 's09-sonyaprak-' + k, olcek: 1.8, sekil: yaprakSekli(17, 8, 1),
    arka: ['#C9C08E', '#B9B48C', '#C7A77C'][k], arkaAlfa: 0.8,
    tarama: { ton: () => 0.55, renkler: [[0, ['#C6BB86', '#B0AA80', '#C49F72'][k]], [1, ['#857B4E', '#77724F', '#8A6644'][k]]], yon: -0.9, aralik: 2.4, boy: [5, 10], esikler: [0.3, 0.6], alfa: 0.55 },
    kontur: ['#6E6638', '#615D3C', '#6E4F33'][k], konturKal: 1.5,
    detay: (c, api) => api.cizgi([[1, 0], [9, 0.6], [16, 0]], { renk: '#5E5634', kal: 1.0, alfa: 0.6 }),
  }));
  // yürüyenler
  const r = rng(2024);
  const say = [3, 4, 4, 3, 3];
  yuruyenler = [];
  KAT.forEach((k, ki) => {
    for (let n = 0; n < say[ki]; n++) {
      const tip = (ki === 1 && n === 2) || (ki === 3 && n === 1) || (ki === 0 && n === 1) ? 'don' : 'yuru';
      yuruyenler.push({ ...programUret(r, k, tip, 82.0, 90), kat: ki });
    }
  });
  KAT.forEach((k, ki) => seritAta(yuruyenler.filter((w) => w.kat === ki), k));
  // çiçek sırası (adamın sağında, önde)
  cicekler = [];
  const cr = rng(66);
  const cx = [300, 372, 444, 516, 588, 660];
  cx.forEach((x, k) => {
    const y = 1850 + cr.ara(-6, 8) + (k % 2) * 8;
    const d = derinlik(y);
    cicekler.push({
      x, y, h: pxm(d) * cr.ara(0.58, 0.72), lean: cr.ara(-6, 6), renk: ['lila', 'pembe', 'beyaz', 'lila', 'pembe', 'beyaz'][k],
      k, faz: cr() * TAU, yon: cr() < 0.5 ? -1 : 1,
    });
  });
  cicekSprite = { pembe: M.cicekOge(21, 2.2, 'pembe'), lila: M.cicekOge(21, 2.2, 'lila'), beyaz: M.cicekOge(21, 2.2, 'beyaz') };
  solgunSprite = solgunCicek(21, 2.2);
  tacSprite = { pembe: tacYapragiOge(9, 'pembe', 2.4), lila: tacYapragiOge(9, 'lila', 2.4), beyaz: tacYapragiOge(9, 'lila', 2.4) };
  kirintiSp = [0, 1, 2].map((k) => oge({
    ad: 's09-kirinti-' + k, olcek: 2, sekil: svg(`M-${5 + k} -2C-${5 + k} -4 ${5 + k} -4.5 ${5 + k} -1.5C${5 + k} 2 -${5 + k} 3 -${5 + k} -2Z`),
    arka: '#EDE6E8', arkaAlfa: 0.8, tarama: { ton: () => 0.5, renkler: [[0, '#E2D8DB'], [1, '#A99BA3']], yon: 0.3, aralik: 2, boy: [3, 6], esikler: [0.3], alfa: 0.5 },
    kontur: '#958791', konturKal: 1.2,
  }));
  // kuru çimen öbekleri (zemin dokusu, önde)
  const gr = rng(808);
  cimenler = [];
  for (let k = 0; k < 26; k++) {
    const y = gr.ara(1380, 2350), x = gr.ara(-120, 1200);
    if (Math.abs(x - ADAM.x) < 110 && Math.abs(y - ADAM.y) < 60) continue;
    cimenler.push({ x, y, s: olcekD(derinlik(y)) / 0.6, n: gr.tam(3, 6), tohum: gr.tam(1, 999) });
  }
  // oturan adamın çevresi boş: önde çizilen tutamlar onun silüetine (çene altı, incik, ayak) binmesin
  // (öbür tutamlar yerinde kalır: rastgele dizi değişmez)
  cimenler = cimenler.filter((c) => !(c.x > ADAM.x - 115 && c.x < ADAM.x + 55 && c.y > ADAM.y - 170 && c.y < ADAM.y + 34));
  // kırık çit: yolun yakın kenarında, sol yarıda
  const ctr = rng(313);
  const dC = derinlik(1384), pm = pxm(dC);
  const direk = oge({ ad: 's09-cit-direk', olcek: 1.4, sekil: svg(`M${-0.06 * pm} 0L${-0.06 * pm} ${-1.0 * pm}L0 ${-1.08 * pm}L${0.06 * pm} ${-1.0 * pm}L${0.06 * pm} 0Z`),
    arka: '#BDB4AE', arkaAlfa: 0.85, tarama: { ton: TON.silindir(-0.06 * pm, 0.06 * pm), renkler: [[0, '#B3A9A2'], [1, '#6E645E']], yon: -Math.PI / 2, aralik: 2.6, boy: [10, 30], esikler: [0.25, 0.55] },
    kontur: '#5E5650', konturKal: 1.7 });
  const tahta = oge({ ad: 's09-cit-tahta', olcek: 1.4, sekil: svg(`M0 ${-0.045 * pm}L${1.75 * pm} ${-0.045 * pm}L${1.75 * pm} ${0.045 * pm}L0 ${0.045 * pm}Z`),
    arka: '#C4BBB5', arkaAlfa: 0.85, tarama: { ton: () => 0.5, renkler: [[0, '#B8AFA8'], [1, '#7A706A']], yon: 0, aralik: 2.6, boy: [16, 40], esikler: [0.3, 0.6] },
    kontur: '#5E5650', konturKal: 1.6 });
  cit = { direk, tahta, pm, direkler: [], tahtalar: [] };
  for (let k = 0, x = -80; x < 640; k++, x += 1.75 * pm * ctr.ara(0.94, 1.06)) {
    if (k === 3) continue; // eksik direk
    cit.direkler.push({ x, y: 1384 + ctr.ara(-3, 3), r: ctr.ara(-0.08, 0.08) + (k === 5 ? -0.32 : 0) + (k === 2 ? 0.2 : 0) });
  }
  cit.direkler.forEach((d, k) => {
    const e = cit.direkler[k + 1];
    if (!e) return;
    const bos = e.x - d.x > 2.5 * pm;
    for (const h of [0.35, 0.72]) {
      const yd = [d.x + Math.sin(d.r) * h * pm, d.y - Math.cos(d.r) * h * pm];
      if (bos || (k === 4 && h > 0.5)) { // kırık: aşağı sarkan tahta
        if (h < 0.5) cit.tahtalar.push({ x: yd[0], y: yd[1], r: 0.52, s: 0.62 });
        continue;
      }
      const ye = [e.x + Math.sin(e.r) * h * pm, e.y - Math.cos(e.r) * h * pm];
      cit.tahtalar.push({ x: yd[0] - 0.08 * pm, y: yd[1], r: Math.atan2(ye[1] - yd[1], ye[0] - yd[0]), s: (Math.hypot(ye[0] - yd[0], ye[1] - yd[1]) + 0.16 * pm) / (1.75 * pm) });
    }
  });
  // önbellekleri ısıt
  const sc = tuval(8, 8).getContext('2d');
  insanYan(sc, 0, 0, DURUS, { s: 0.3, olcek: 1 });
  insanYan(sc, 0, 0, DURUS, { s: 0.3, olcek: 0.5 });
}


function citCiz(g) {
  for (const d of cit.direkler) ogeCiz(g, cit.direk, d.x, d.y, { r: d.r });
  for (const k of cit.tahtalar) ogeCiz(g, cit.tahta, k.x, k.y, { r: k.r, sx: k.s, sy: 1 });
}
function cimenCiz(g, c) {
  const r = rng(c.tohum);
  for (let k = 0; k < c.n; k++) {
    const x = c.x + r.ara(-10, 10) * c.s, L = r.ara(12, 26) * c.s, a = r.ara(-0.5, 0.5);
    konturCiz(g, [[x, c.y], [x + Math.sin(a) * L * 0.5, c.y - L * 0.55], [x + Math.sin(a) * L, c.y - L]], { renk: '#837B8C', kal: 1.4, alfa: 0.75, kapali: false, titreme: 0.2, tohum: c.tohum + k });
  }
}

/**
 * Dünyayı çizer (kamera altında). kamIle(ctx, fn, f) kamera uygulayıcısıdır. t: mutlak zaman.
 */
export function dunyaCiz(ctx, kamIle, t) {
  // gök + bulutlar (uzak)
  kamIle((g) => {
    ogeCiz(g, gok, -310, -560);
    const bx = [[150, 190], [700, 90], [1060, 270], [460, 345]];
    bulutlar.forEach((b, i) => ogeCiz(g, b, bx[i][0] + (t - 82) * (i % 2 ? 7 : 10), bx[i][1], { alfa: 0.95 }));
  }, 0.35);
  kamIle((g) => ogeCiz(g, uzakTepe, -460, YH - 78), 0.6);
  kamIle((g) => {
    ogeCiz(g, zemin, -510, YH - 12);
    g.drawImage(catlakHazirla(), CATLAK.x0, CATLAK.y0);
    ogeCiz(g, yol, 0, 0);
    // ufuk sisi: uzak katlar sise karışır
    const sis = g.createLinearGradient(0, YH - 20, 0, 800);
    sis.addColorStop(0, 'rgba(226,223,232,0.85)');
    sis.addColorStop(0.35, 'rgba(226,223,232,0.45)');
    sis.addColorStop(1, 'rgba(226,223,232,0)');
    g.fillStyle = sis;
    g.fillRect(-600, YH - 20, 2300, 800 - YH + 20);
    for (const c of cimenler) if (c.y < 1700) cimenCiz(g, c);
    // derinliğe göre sıralı çizim: uzak ağaçlar, yürüyenler, kuru ağaç, oturan adam
    const ogeler = [];
    ogeler.push({ y: 975, ciz: () => M.agacCiz(g, agacK1, 640, 975, { s: 1, t, salinim: 0 }) });
    ogeler.push({ y: 702, ciz: () => M.agacCiz(g, agacK2, 455, 702, { s: 1, t, salinim: 0 }) });
    ogeler.push({ y: 1384, ciz: () => citCiz(g) });
    for (const w of yuruyenler) {
      const st = durum(w, t);
      const [x, y] = proj(st.x, w.d);
      ogeler.push({ y, ciz: () => {
        const faz = w.faz0 + (st.m / DONGU_M) * TAU;
        const poz = st.yuru > 0 ? pozKaristir(DURUS, yuruyus(faz), st.yuru) : DURUS;
        insanYan(g, x, y, poz, { s: w.olc, yon: st.yon, olcek: w.olc > 0.3 ? 1 : 0.5 });
      } });
    }
    ogeler.push({ y: AGAC.y, ciz: () => M.agacCiz(g, agacB, AGAC.x, AGAC.y, { s: 1, t, salinim: 0 }) });
    ogeler.push({ y: ADAM.y, ciz: () => { const al = adamSilAlfa(t); if (al > 0.003) insanYan(g, ADAM.x, ADAM.y, oturus(t), { s: ADAM.s, yon: -1, olcek: 1.2, alfa: al }); } });
    ogeler.sort((a, b) => a.y - b.y);
    for (const o of ogeler) o.ciz();
    for (const c of cimenler) if (c.y >= 1700) cimenCiz(g, c);
  }, 1);
}

/** Kuru ağacın son yaprakları: fâni'de düşer. (soluklaştırma geçişinden sonra çizilir) */
export function sonYaprakCiz(ctx, kamIle, t, tDus) {
  kamIle((g) => {
    sonYapraklar.forEach((y, k) => {
      const t0 = tDus + k * 0.07;
      const u = t - t0;
      const sp = yaprakSp[y.renk];
      if (u <= 0) {
        ogeCiz(g, sp, y.x, y.y, { r: y.r0 + Math.sin(t * 2 + y.faz) * 0.12, pivot: [0, 0] });
        return;
      }
      const a = 1 - clamp((u - 1.5) / 0.4);
      if (a <= 0) return;
      const x = y.x + u * 260 + u * u * 60 + Math.sin(u * 4.2 + y.faz) * 22 * Math.min(1, u * 2);
      const yy = y.y + u * 120 + u * u * 70 + Math.sin(u * 6.5 + y.faz) * 8;
      ogeCiz(g, sp, x, yy, { r: y.r0 + u * 3.4 * (k % 2 ? 1 : -1), alfa: a, s: 1.35 });
    });
  }, 1);
}

/**
 * Çiçek sırası: tAc'ta açar (sırayla), tSol'da solar; taç yaprakları ve gövde yaprakları düşer.
 */
export function cicekCiz(ctx, kamIle, t, tAc, tSol) {
  kamIle((g) => {
    for (const c of cicekler) {
      const t0 = tAc + c.k * 0.065;
      const gb = an(t, t0, 0.32, ease.outCubic);
      if (gb <= 0) continue;
      const ts = tSol + c.k * 0.05;
      const w = an(t, ts, 0.5, ease.inOutCubic);
      const sall = Math.sin(t * 1.6 + c.faz) * 0.04 * (1 - w);
      // gövde: dik -> sarkık
      const ux = c.x + c.lean + Math.sin(sall) * c.h, uy = c.y - c.h;
      const sx = c.x + c.yon * c.h * 0.42, sy = c.y - c.h * 0.5;
      const tx = lerp(ux, sx, w), ty = lerp(uy, sy, w);
      const kx = lerp(c.x + c.lean * 0.3, c.x + c.yon * c.h * 0.12, w), ky = lerp(c.y - c.h * 0.55, c.y - c.h * 1.0, w);
      const pts = [];
      for (let k = 0; k <= 16; k++) {
        const u = k / 16, v = 1 - u;
        pts.push([v * v * c.x + 2 * v * u * kx + u * u * tx, v * v * c.y + 2 * v * u * ky + u * u * ty]);
      }
      const renk = renkHex(renkKaristir('#6F8B68', '#8C7D6A', w));
      konturCiz(g, pts, { renk, kal: 2.1, alfa: 0.9, kapali: false, titreme: 0.25, tohum: 300 + c.k, cizim: gb, uc: 0.02 });
      // gövde yaprağı (ortada); solunca düşer
      const ly = Math.floor(16 * 0.45);
      if (gb > 0.5) {
        const [lx, lyy] = pts[ly];
        const dus = t - (ts + 0.15);
        if (dus <= 0) ogeCiz(g, yaprakSp[1], lx, lyy, { r: c.yon > 0 ? -0.5 - w * 0.6 : Math.PI + 0.5 + w * 0.6, s: an(t, t0 + 0.12, 0.25) * (1 - 0.2 * w) });
        else {
          const a = 1 - clamp((dus - 0.6) / 0.4);
          if (a > 0) ogeCiz(g, yaprakSp[1], lx + dus * 40 + Math.sin(dus * 6) * 6, lyy + dus * 80 + dus * dus * 40, { r: -0.5 + dus * 4, alfa: a });
        }
      }
      // baş
      const p = pop(t, t0 + 0.2, 0.42);
      if (p > 0) {
        const aci = Math.atan2(ty - pts[13][1], tx - pts[13][0]) + Math.PI / 2;
        const r = lerp(sall * 2, aci, w);
        const s = p * lerp(1, 0.78, w);
        if (w < 1) ogeCiz(g, cicekSprite[c.renk], tx, ty, { r, s, alfa: 1 - w * w });
        if (w > 0) ogeCiz(g, solgunSprite, tx, ty, { r, s, alfa: w });
      }
      // dökülen taç yaprakları
      for (let q = 0; q < 3; q++) {
        const dt = t - (ts + 0.08 + q * 0.11);
        if (dt <= 0 || dt > 1.4) continue;
        const a = (1 - clamp((dt - 0.8) / 0.6)) * clamp(dt / 0.08);
        const x = tx + (q - 1) * 7 + dt * (55 + q * 18) + Math.sin(dt * 7 + q) * 10;
        const y = ty + dt * (70 + q * 15) + dt * dt * 30;
        const sp = tacSprite[c.renk];
        g.save();
        g.filter = dt > 0.3 ? `saturate(${(1 - clamp((dt - 0.3) / 0.6) * 0.8).toFixed(2)})` : 'none';
        ogeCiz(g, sp, x, y, { r: q * 2 + dt * (3 + q) * (q % 2 ? 1 : -1), alfa: a });
        g.restore();
      }
    }
  }, 1);
}

/** Çiçek başlarının dünya konumları (silgi darbelerini yerleştirmek için) */
export function cicekKutusu() {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const c of cicekler) { x0 = Math.min(x0, c.x - 30); x1 = Math.max(x1, c.x + c.h * 0.5 + 30); y0 = Math.min(y0, c.y - c.h - 30); y1 = Math.max(y1, c.y + 10); }
  return { x0, x1, y0, y1 };
}

// ---------------------------------------------------------------- toz (s08'den kalan)
export function tozCiz(ctx, kamIle, t, alfa) {
  if (alfa <= 0) return;
  kamIle((g) => {
    const r = rng(515);
    g.save();
    for (let k = 0; k < 70; k++) {
      const x0 = r.ara(-200, 900), y0 = r.ara(1250, 2150), v = r.ara(60, 150), b = r.ara(1.5, 4.5);
      const u = t - 82;
      const x = x0 + u * v + Math.sin(u * 1.3 + k) * 14;
      const y = y0 - u * r.ara(8, 30) + Math.sin(u * 2 + k * 0.7) * 6;
      const a = alfa * r.ara(0.35, 0.8);
      g.fillStyle = rgba('#8E8698', a);
      g.beginPath();
      g.ellipse(x, y, b * 1.6, b, 0.2, 0, TAU);
      g.fill();
    }
    g.restore();
  }, 1);
}

// ---------------------------------------------------------------- silgi (dünya koordinatında)
// Beyaz vinil silgi (kâğıt kılıflı, yazısız) çiçek sırasını soldan sağa dikey zikzaklarla siler, sonra adamı;
// ardından sağ üste çekilir. Silinen yer çıplak film olur; çizimin soluk hayaleti ve sürtme izleri kalır.
let silgi = null, silgiSp = null;
function yolParca(z, oran) {
  const hedef = z.L * clamp(oran);
  const out = [z.pts[0]];
  for (let i = 1; i < z.pts.length; i++) {
    if (z.s[i] >= hedef) {
      const k = (hedef - z.s[i - 1]) / (z.s[i] - z.s[i - 1] || 1);
      out.push([lerp(z.pts[i - 1][0], z.pts[i][0], k), lerp(z.pts[i - 1][1], z.pts[i][1], k)]);
      return out;
    }
    out.push(z.pts[i]);
  }
  return out;
}
/**
 * bolge: [{x0, x1, yUst, yAlt}] soldan sağa sıralı alt bölgeler; adim: yarım darbe başına x ilerlemesi; en: silgi eni.
 * t0..t1 silme süresi; giris/cikis: silginin gelip gittiği noktalar.
 */
export function silgiKur({ bolge, adim = 58, en = 100, t0, t1, giris, cikis }) {
  const pts = [];
  let x = bolge[0].x0, ust = true;
  const bul = (xx) => bolge.find((b) => xx <= b.x1) || bolge[bolge.length - 1];
  const r = rng(61);
  while (x <= bolge[bolge.length - 1].x1 + 1) {
    const b = bul(x);
    pts.push([x + r.ara(-4, 4), (ust ? b.yUst : b.yAlt) + r.ara(-13, 13)]); // dönüş noktaları düzensiz: iz kenarı dalgalı
    ust = !ust;
    x += adim * r.ara(0.9, 1.1);
  }
  // yuvarlat
  let p = pts;
  for (let k = 0; k < 2; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push([a[0] * 0.78 + b[0] * 0.22, a[1] * 0.78 + b[1] * 0.22], [a[0] * 0.22 + b[0] * 0.78, a[1] * 0.22 + b[1] * 0.78]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  const s = [0];
  for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  const z = { pts: p, s, L: s[s.length - 1] };
  // kırıntılar
  const kr = rng(907);
  const kir = [];
  for (let d = 40; d < z.L; d += kr.ara(55, 110)) {
    const q = yolParca(z, d / z.L).pop();
    kir.push({ s: d, x: q[0] + kr.ara(-0.45, 0.45) * en, y: q[1] + kr.ara(-0.2, 0.2) * en, r0: kr() * TAU, tip: kr.tam(0, 2), vx: kr.ara(20, 70), vy: kr.ara(-35, 10), don: kr.ara(-5, 5), sc: kr.ara(0.6, 0.95) });
  }
  // silgi izinin dokusu: tam silinen çekirdek (temas ekseninde kaydırılmış, her biri farklı yükseklikte dönen birkaç
  // kat: dönüş yerlerinde kenar düzensiz, köşesiz) + çevresinde silgi yönünde kesik kesik lifler (saçaklı kenar) +
  // kenar kuşağında kısa kalıntı çizgileri (tarama orada yarı yarıya kalır)
  const lr = rng(5150);
  const cekirdek = [];
  for (let k = 0; k < 6; k++) cekirdek.push({ o: lerp(-0.24, 0.24, k / 5) * en + lr.ara(-3, 3), j: lr.ara(-12, 10), w: en * lr.ara(0.5, 0.58) });
  const lif = [];
  for (let k = 0; k < 48; k++) {
    const u = lr.ara(-1, 1), m = Math.abs(u);
    const dash = [];
    for (let q = 0; q < 4; q++) dash.push(lr.ara(40, 200), lr.ara(10, 70) * (0.4 + m));
    lif.push({ o: u * en * 0.64, j: lr.ara(-20, 14), w: lr.ara(1.3, 3.4) * (1.15 - 0.45 * m), a: clamp(lr.ara(0.4, 1) * (1.3 - 0.75 * m)), dash, off: lr.ara(0, 400) });
  }
  const kalinti = [];
  for (let k = 0; k < 16; k++) {
    const u = (lr() < 0.5 ? -1 : 1) * lr.ara(0.38, 0.5);
    const dash = [];
    for (let q = 0; q < 3; q++) dash.push(lr.ara(12, 38), lr.ara(90, 320));
    kalinti.push({ o: u * en, j: lr.ara(-12, 12), w: lr.ara(1.3, 2.6), a: lr.ara(0.3, 0.6), dash, off: lr.ara(0, 600) });
  }
  silgi = { z, en, t0, t1, giris, cikis, kir, cekirdek, lif, kalinti };
  silgiSp = silgiOge(en);
  return silgi;
}
const silIlerleme = (t) => (silgi ? an(t, silgi.t0, silgi.t1 - silgi.t0, (u) => ease.inOutSine(u) * 0.2 + u * 0.8) : 0);

function silgiOge(en) {
  // yerel: temas kenarı (0,0) çevresinde, gövde -y yönünde uzanır
  const w = en * 0.92, L = en * 1.55, r = en * 0.12;
  const govde = svg(`M${-w / 2 + r} 0L${w / 2 - r} 0Q${w / 2} 0 ${w / 2} ${-r}L${w / 2} ${-L}L${-w / 2} ${-L}L${-w / 2} ${-r}Q${-w / 2} 0 ${-w / 2 + r} 0Z`);
  const kilif = svg(`M${-w / 2 - 3} ${-L * 0.4}L${w / 2 + 3} ${-L * 0.4}L${w / 2 + 3} ${-L - 3}L${-w / 2 - 3} ${-L - 3}Z`);
  const g = oge({
    ad: 's09-silgi-govde-' + en, olcek: 1.6, sekil: govde, arka: '#F1EEEA', arkaAlfa: 0.6,
    tarama: { ton: TON.silindir(-w / 2, w / 2, { sag: true, ortam: 0.1 }), renkler: [[0, '#E8E3DE'], [1, '#B9B0B4']], yon: -Math.PI / 2, aralik: 3, boy: [14, 36], esikler: [0.45, 0.75], alfa: 0.45 },
    kontur: '#8B8290', konturKal: 1.9,
  });
  const k = oge({
    ad: 's09-silgi-kilif-' + en, olcek: 1.6, sekil: kilif, arka: '#A9AFCB', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.silindir(-w / 2, w / 2, { sag: true, ortam: 0.2 }), 0.05, 0.05, 3), renkler: [[0, '#9EA5C4'], [0.6, '#7C84A8'], [1, '#5E6588']], yon: -0.35, aralik: 2.7, boy: [16, 40], esikler: [0.15, 0.5, 0.78], alfa: 0.5 },
    kontur: '#4E5476', konturKal: 1.9,
    detay: (c, api) => {
      api.cizgi([[-w / 2 + 2, -L * 0.4 - 7], [w / 2 - 2, -L * 0.4 - 7]], { renk: '#E4E6F0', kal: 1.6, alfa: 0.7 });
      api.cizgi([[-w / 2 + 2, -L + 8], [w / 2 - 2, -L + 8]], { renk: '#E4E6F0', kal: 1.4, alfa: 0.5 });
    },
  });
  const gt = tuval(Math.ceil(w + 60), Math.ceil(L + 60));
  const gc = gt.getContext('2d');
  gc.filter = 'blur(6px)';
  gc.fillStyle = 'rgba(60,54,80,0.32)';
  gc.fillRect(30, 30, w, L);
  return { govde: g, kilif: k, golge: gt, w, L };
}

/** Silgi ucunun dünya konumu ve açısı (giriş, silme, çıkış). null: görünmez */
function silgiUcu(t) {
  if (!silgi) return null;
  const S = silgi, gs = 0.16, cs = 0.2;
  const ac0 = SILGI_ACI;
  if (t < S.t0 - gs || t > S.t1 + cs) return null;
  if (t < S.t0) {
    const u = ease.outCubic(clamp((t - (S.t0 - gs)) / gs));
    const [x, y] = S.z.pts[0];
    return { x: lerp(S.giris[0], x, u), y: lerp(S.giris[1], y, u), a: ac0 - 0.25 * (1 - u), basinc: u };
  }
  if (t <= S.t1) {
    const o = silIlerleme(t);
    const p = yolParca(S.z, o);
    const q = p[p.length - 1], q0 = p[Math.max(0, p.length - 3)];
    const vy = q[1] - q0[1];
    return { x: q[0], y: q[1], a: ac0 + clamp(vy / 30, -1, 1) * 0.07, basinc: 1 };
  }
  const u = ease.inCubic(clamp((t - S.t1) / cs));
  const [x, y] = S.z.pts[S.z.pts.length - 1];
  return { x: lerp(x, S.cikis[0], u), y: lerp(y, S.cikis[1], u), a: ac0 + 0.3 * u, basinc: 1 - u };
}

const SILGI_ACI = -0.62; // gövde sağ üste yatık
const IZ_ACI = -0.28; // temas kenarının ekseni (bileğin hafif dönüşü): lifler ve sürtme izleri bu eksende kayar
/** Silinen alanı maskeye çizer (dünya koordinatında; çağıran kamerayı uygular; beyaz = silinen). Kalem silgisi izi:
 *  silginin zikzak yolu boyunca yuvarlak uçlu çekirdek şerit tam silinir; dönüş noktalarında kenar yuvarlak ve
 *  dalgalıdır. Çevresinde silgi yönünde, kesik kesik, farklı boy ve güçte lifler kenarı saçaklı ve düzensiz yapar;
 *  çekirdeğin kenarına yakın birkaç ince çizgide çizim yarı yarıya kalır (yarı silinmiş tarama). Köşe yoktur. */
export function silgiMaske(g, t) {
  const o = silIlerleme(t);
  if (o <= 0) return;
  const p = yolParca(silgi.z, o);
  if (p.length < 2) p.push([p[0][0] + 0.5, p[0][1] + 0.5]);
  const ux = Math.cos(IZ_ACI), uy = Math.sin(IZ_ACI), en = silgi.en;
  const yol = (dx, dy) => {
    g.beginPath();
    for (let i = 0; i < p.length; i++) {
      const x = p[i][0] + dx, y = p[i][1] + dy;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
  };
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // çekirdek: dar bir yumuşak geçiş kuşağı, sonra tam silinen katlar (her kat dönüşte farklı yükseklikte biter)
  for (const [ek, a] of [[12, 0.38], [6, 0.62], [0, 1]]) {
    g.strokeStyle = `rgba(255,255,255,${a})`;
    for (const c of silgi.cekirdek) {
      g.lineWidth = c.w + ek;
      yol(ux * c.o, uy * c.o + c.j);
      g.stroke();
    }
  }
  // lifler: silgi yönünde (yol boyunca), temas kenarı ekseninde kaydırılmış, kesik kesik
  for (const l of silgi.lif) {
    g.setLineDash(l.dash);
    g.lineDashOffset = l.off;
    g.strokeStyle = `rgba(255,255,255,${l.a.toFixed(3)})`;
    g.lineWidth = l.w;
    yol(ux * l.o, uy * l.o + l.j);
    g.stroke();
  }
  // yarı silinmiş kalıntılar: çekirdeğin kenar kuşağında ince çizgiler boyunca silme zayıflar
  g.globalCompositeOperation = 'destination-out';
  for (const l of silgi.kalinti) {
    g.setLineDash(l.dash);
    g.lineDashOffset = l.off;
    g.strokeStyle = `rgba(0,0,0,${l.a.toFixed(3)})`;
    g.lineWidth = l.w;
    yol(ux * l.o, uy * l.o + l.j);
    g.stroke();
  }
  g.restore();
}
/** Silgi izleri: silinen şeritte silgi yönünde ince, soluk grafit sürtmeleri */
export function silgiIzi(g, t, alfa = 1) {
  if (alfa <= 0.003 || !silgi) return;
  const o = silIlerleme(t);
  if (o <= 0) return;
  const p = yolParca(silgi.z, o);
  if (p.length < 3) return;
  const cx = Math.cos(IZ_ACI), cy = Math.sin(IZ_ACI);
  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const r = rng(17);
  for (let q = 0; q < 6; q++) {
    const off = (q / 5 - 0.5) * silgi.en * 0.75 + r.ara(-3, 3);
    g.strokeStyle = `rgba(112,104,124,${(alfa * r.ara(0.035, 0.07)).toFixed(3)})`;
    g.lineWidth = r.ara(0.8, 2);
    g.setLineDash([r.ara(18, 50), r.ara(70, 190), r.ara(10, 40), r.ara(110, 260)]);
    g.lineDashOffset = r.ara(0, 300);
    g.beginPath();
    for (let i = 0; i < p.length; i++) {
      const x = p[i][0] + cx * off, y = p[i][1] + cy * off - silgi.en * 0.12;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
}
/** Silgi kırıntıları (dünya): darbe geçtikçe belirir, düşüp rüzgârla savrulur */
export function kirintiCiz(g, t, alfa = 1) {
  if (!silgi || alfa <= 0.003) return;
  const o = silIlerleme(t);
  if (o <= 0) return;
  for (const k of silgi.kir) {
    if (k.s > o * silgi.z.L) continue;
    // ters ilerleme: kırıntının oluştuğu an (ikiye bölmeyle)
    let a = silgi.t0, b = silgi.t1;
    for (let i = 0; i < 14; i++) { const m = (a + b) / 2; if (silIlerleme(m) * silgi.z.L < k.s) a = m; else b = m; }
    const u = t - a;
    if (u < 0 || u > 1.5) continue;
    const al = clamp(u / 0.05) * (1 - clamp((u - 0.9) / 0.6));
    const x = k.x + k.vx * u + 40 * u * u, y = k.y + k.vy * u + 90 * u * u;
    ogeCiz(g, kirintiSp[k.tip], x, y, { r: k.r0 + k.don * u, s: k.sc, alfa: al * alfa });
  }
}
/** Silginin kendisi (dünya koordinatında, gölgesiyle) */
export function silgiCiz(g, t) {
  const u = silgiUcu(t);
  if (!u) return;
  const sp = silgiSp;
  const kalk = (1 - u.basinc) * 14; // havadayken gölge uzaklaşır
  g.save();
  g.translate(u.x + 9 + kalk, u.y + 13 + kalk);
  g.rotate(u.a);
  g.drawImage(sp.golge, -sp.w / 2 - 30, -sp.L - 30);
  g.restore();
  ogeCiz(g, sp.govde, u.x, u.y, { r: u.a });
  ogeCiz(g, sp.kilif, u.x, u.y, { r: u.a });
}
/** Oturan adamın silinişi: silgi üzerinden geçerken adam (şeridin kenarından taşan saçı, dizi dahil) tümüyle söner */
function adamSilAlfa(t) {
  if (!silgi || t < silgi.t0) return 1;
  const p = yolParca(silgi.z, silIlerleme(t));
  const x = p[p.length - 1][0];
  // adam silginin gövdesi onu tümüyle örterken söner (x ≈ ADAM.x − 30 … − 14: 87,70–87,73 sn)
  return 1 - ease.inOutSine(clamp((x - (ADAM.x - 30)) / 16));
}
export const silgiVar = () => !!silgi;
export const silgiSonu = () => (silgi ? silgi.t1 : 0);

// ---------------------------------------------------------------- çatlak ağı (yer düzleminde, perspektifli)
let catlakT = null;
export const CATLAK = { x0: -560, y0: 1370, w: 2300, h: 1250 };
export function catlakHazirla() {
  if (catlakT) return catlakT;
  catlakT = tuval(CATLAK.w, CATLAK.h);
  const g = catlakT.getContext('2d');
  g.translate(-CATLAK.x0, -CATLAK.y0);
  const r = rng(4321);
  // perturbe ızgara (metre): derinlik 6..12 m, x -14..18 m
  const satirlar = [];
  for (let d = 5.6; d < 11.8; d += r.ara(1.0, 1.5)) {
    const sira = [];
    for (let x = -16 + r.ara(0, 1.2); x < 20; x += r.ara(1.2, 2.0)) sira.push([x + r.ara(-0.3, 0.3), d + r.ara(-0.25, 0.25)]);
    satirlar.push(sira);
  }
  const kenar = (A, B) => {
    const n = 7;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const sap = i === 0 || i === n ? 0 : r.ara(-0.12, 0.12);
      const x = lerp(A[0], B[0], u) + sap * 0.8, d = lerp(A[1], B[1], u) + sap * 0.3;
      pts.push(proj(x, d));
    }
    const dm = (A[1] + B[1]) / 2;
    konturCiz(g, pts, { renk: '#655D72', kal: clamp(16 / dm, 1.2, 2.4), alfa: clamp(0.85 - dm * 0.03, 0.45, 0.75), kapali: false, titreme: 0.4, tohum: r.tam(1, 9999), uc: 0.15 });
  };
  for (let i = 0; i < satirlar.length; i++) {
    const s = satirlar[i], alt = satirlar[i + 1];
    let k = 0;
    for (let j = 0; j < s.length; j++) {
      if (j + 1 < s.length && r() < 0.8) kenar(s[j], s[j + 1]);
      if (alt && r() < 0.7) {
        while (k + 1 < alt.length && Math.abs(alt[k + 1][0] - s[j][0]) < Math.abs(alt[k][0] - s[j][0])) k++;
        kenar(s[j], alt[k]);
      }
    }
  }
  return catlakT;
}
