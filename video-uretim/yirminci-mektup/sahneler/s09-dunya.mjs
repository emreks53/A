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
      let sure = r.ara(1.1, 2.6);
      let hedef = x + yon * v * sure;
      if (hedef < xa || hedef > xb) { hedef = clamp(hedef, xa, xb); sure = Math.abs(hedef - x) / v; }
      if (sure > 0.15) {
        seg.push({ t0: t, t1: t + sure, x0: x, yon, yuru: true, v, m0: mesafe });
        mesafe += Math.abs(hedef - x); x = hedef; t += sure;
      }
      const dur = r.ara(0.35, 0.9);
      seg.push({ t0: t, t1: t + dur, x0: x, yon, yuru: false, m0: mesafe });
      t += dur;
      const kenar = x <= xa + 0.3 || x >= xb - 0.3;
      if (kenar || r() < 0.55) yon = -yon;
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
    yonG = s.yon * ease.inOutSine(k) * 2 - s.yon;
    yonG = s.yon * (-1 + 2 * ease.inOutSine(k));
    if (Math.abs(yonG) < 0.08) yonG = 0.08 * Math.sign(yonG || s.yon);
  }
  // yürüyüş miktarı: başlarken/dururken yumuşak
  let yuru = 0;
  if (s.yuru) yuru = Math.min(clamp((t - s.t0) / 0.2), clamp((s.t1 - t) / 0.2) * 0.6 + 0.4);
  else if (onceki && onceki.yuru) yuru = 1 - clamp((t - s.t0) / 0.22);
  return { x, m, yon: yonG, yuru, yuruyor: s.yuru };
}

// ---------------------------------------------------------------- sprite'lar ve yerleşim
let gok, uzakTepe, zemin, yol, agacB, agacK1, agacK2, sonYapraklar, yuruyenler, cicekler, cicekSprite, solgunSprite, tacSprite, yaprakSp, bulutlar, kirintiSp, cimenler;
export const ADAM = { x: 232, y: 1878, s: 0.6 };
export const AGAC = { x: 168, y: 1612, boy: 330 };

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
  gok = gokTuvali({ w: 1700, h: 1050, olcek: 1, ad: 's09-gok', ust: '#6E6784', orta: '#A39DB5', alt: '#D3CFDC', parilti: '#CEC9DA', arkaUst: '#ABA5BC', arkaAlt: '#DEDBE5', tohum: 29, yogunluk: 1.05 });
  uzakTepe = M.tepeOge({ w: 2000, h: 300, tohum: 13, renk: 'gri', dalga: 85, ad: 's09-uzaktepe', olcek: 1 });
  zemin = M.tepeOge({ w: 2100, h: 2150, tohum: 7, renk: 'gri', dalga: 26, ad: 's09-zemin', olcek: 1 });
  const ys = yolSekli();
  yol = oge({
    ad: 's09-yol', olcek: 1.15, sekil: ys.sekil, arka: '#DDD7CF', arkaAlfa: 0.85, arkaBulanik: 3,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, YH, 0, 1400, 0.25, 0.55), 0.12, 0.01, 4), renkler: [[0, '#D4CCC2'], [0.6, '#B3A99C'], [1, '#8C8276']], yon: -0.03, aralik: 3.0, boy: [24, 80], kal: 1.15, alfa: 0.5, esikler: [0.2, 0.5] },
    kontur: '#7E746C', konturKal: 1.8, titreme: 0.4,
  });
  bulutlar = [M.bulutOge(330, 31, 1.1, true), M.bulutOge(260, 8, 1.1, true), M.bulutOge(300, 17, 1.1, true), M.bulutOge(220, 5, 1.1, true)];
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
  // çiçek sırası (adamın sağında, önde)
  cicekler = [];
  const cr = rng(66);
  const cx = [372, 448, 532, 612, 694, 778, 858];
  cx.forEach((x, k) => {
    const y = 1846 + cr.ara(-10, 12) + (k % 2) * 8;
    const d = derinlik(y);
    cicekler.push({
      x, y, h: pxm(d) * cr.ara(0.5, 0.66), lean: cr.ara(-6, 6), renk: ['pembe', 'lila', 'beyaz', 'pembe', 'lila', 'beyaz', 'pembe'][k],
      k, faz: cr() * TAU, yon: cr() < 0.5 ? -1 : 1,
    });
  });
  cicekSprite = { pembe: M.cicekOge(17, 2.2, 'pembe'), lila: M.cicekOge(17, 2.2, 'lila'), beyaz: M.cicekOge(17, 2.2, 'beyaz') };
  solgunSprite = solgunCicek(17, 2.2);
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
  // önbellekleri ısıt
  const sc = tuval(8, 8).getContext('2d');
  insanYan(sc, 0, 0, DURUS, { s: 0.3, olcek: 1 });
  insanYan(sc, 0, 0, DURUS, { s: 0.3, olcek: 0.5 });
}

// oturan adam pozu (dizleri kucaklar, başı eğik)
export const OTURUS = { serbest: true, govde: 0.2, bas: 0.42, kalca: [2.28, 2.36], diz: [-2.12, -2.2], bilek: [-0.12, -0.1], omuz: [0.95, 1.08], dirsek: [0.75, 0.62], zipla: -152 };

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
    const bx = [[170, 175], [690, 95], [1040, 260], [430, 330]];
    bulutlar.forEach((b, i) => ogeCiz(g, b, bx[i][0] + (t - 82) * (i % 2 ? 7 : 10), bx[i][1], { alfa: 0.95 }));
  }, 0.35);
  kamIle((g) => ogeCiz(g, uzakTepe, -460, YH - 78), 0.6);
  kamIle((g) => {
    ogeCiz(g, zemin, -510, YH - 12);
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
    ogeler.push({ y: 905, ciz: () => M.agacCiz(g, agacK1, 742, 905, { s: 1, t, salinim: 0 }) });
    ogeler.push({ y: 712, ciz: () => M.agacCiz(g, agacK2, 300, 712, { s: 1, t, salinim: 0 }) });
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
    ogeler.push({ y: ADAM.y, ciz: () => insanYan(g, ADAM.x, ADAM.y, { ...OTURUS, bas: OTURUS.bas + 0.03 * Math.sin(t * 0.9) }, { s: ADAM.s, yon: 1, olcek: 1.2 }) });
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
      const a = 1 - clamp((u - 0.9) / 0.5);
      if (a <= 0) return;
      const x = y.x + u * 70 + Math.sin(u * 5 + y.faz) * 16 * Math.min(1, u * 2);
      const yy = y.y + u * 105 + u * u * 25;
      ogeCiz(g, sp, x, yy, { r: y.r0 + u * 3.2 * (k % 2 ? 1 : -1), alfa: a });
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

// ---------------------------------------------------------------- silgi
/** Dikdörtgen bölgeyi süpüren zikzak silgi yolu (ekran koordinatı) */
function zikzak(x0, y0, x1, y1, en, { yatay = true, tohum = 1, egim = 0.18 } = {}) {
  const r = rng(tohum);
  const pts = [];
  if (yatay) {
    const ara = en * 0.62;
    let y = y0 + en * 0.3, sag = r() < 0.5;
    while (y < y1 + en * 0.3) {
      const xa = sag ? x0 - en * 0.2 + r.ara(0, 30) : x1 + en * 0.2 - r.ara(0, 30);
      const xb = sag ? x1 + en * 0.2 - r.ara(0, 30) : x0 - en * 0.2 + r.ara(0, 30);
      pts.push([xa, y - ara * egim], [xb, y + ara * egim]);
      y += ara * r.ara(0.85, 1.1);
      sag = !sag;
    }
  } else {
    const ara = en * 0.62;
    let x = x0 + en * 0.3, asagi = r() < 0.5;
    while (x < x1 + en * 0.3) {
      const ya = asagi ? y0 - en * 0.2 + r.ara(0, 20) : y1 + en * 0.2 - r.ara(0, 20);
      const yb = asagi ? y1 + en * 0.2 - r.ara(0, 20) : y0 - en * 0.2 + r.ara(0, 20);
      pts.push([x - ara * egim, ya], [x + ara * egim, yb]);
      x += ara * r.ara(0.85, 1.1);
      asagi = !asagi;
    }
  }
  // köşeleri yuvarla (Chaikin)
  let p = pts;
  for (let k = 0; k < 2; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  // yay uzunluğu
  const s = [0];
  for (let i = 1; i < p.length; i++) s.push(s[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { pts: p, s, L: s[s.length - 1], en };
}
function yolParca(z, oran) {
  const hedef = z.L * oran;
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

let silgiler = null;
/** Silgi darbelerini (ekran koordinatlarında) kurar. alanlar: [{x0,y0,x1,y1,en,t0,sure,yatay,kirinti}] */
export function silgiKur(alanlar) {
  silgiler = alanlar.map((a, k) => {
    const z = zikzak(a.x0, a.y0, a.x1, a.y1, a.en, { yatay: a.yatay !== false, tohum: 50 + k * 13 });
    // kırıntı noktaları
    const kr = rng(900 + k);
    const kir = [];
    if (a.kirinti) {
      for (let s = 30; s < z.L; s += kr.ara(26, 60)) {
        const p = yolParca(z, s / z.L);
        const q = p[p.length - 1];
        kir.push({ s, x: q[0] + kr.ara(-0.4, 0.4) * a.en, y: q[1] + kr.ara(-0.4, 0.4) * a.en, r0: kr() * TAU, tip: kr.tam(0, 2), vx: kr.ara(60, 170), vy: kr.ara(-20, 60), don: kr.ara(-5, 5), sc: kr.ara(0.8, 1.35) });
      }
    }
    return { ...a, z, kir };
  });
  return silgiler;
}
const silIlerleme = (s, t) => an(t, s.t0, s.sure, (u) => ease.inOutSine(u) * 0.15 + u * 0.85);

/** Maskeye (ekran) silinmiş alanı çizer: beyaz = silindi */
export function silgiMaske(mctx, t) {
  mctx.save();
  mctx.lineCap = 'round';
  mctx.lineJoin = 'round';
  mctx.strokeStyle = '#fff';
  mctx.filter = 'blur(2.5px)';
  for (const s of silgiler) {
    const o = silIlerleme(s, t);
    if (o <= 0) continue;
    const p = yolParca(s.z, o);
    if (p.length < 2) continue;
    mctx.lineWidth = s.en;
    mctx.beginPath();
    mctx.moveTo(p[0][0], p[0][1]);
    for (let i = 1; i < p.length; i++) mctx.lineTo(p[i][0], p[i][1]);
    mctx.stroke();
  }
  mctx.restore();
}
/** Silgi ucu konumları (ekran) – ilerleyen darbelerin uçları */
export function silgiUclari(t) {
  const out = [];
  for (const s of silgiler) {
    const o = silIlerleme(s, t);
    if (o <= 0 || o >= 1) continue;
    const p = yolParca(s.z, o);
    out.push({ x: p[p.length - 1][0], y: p[p.length - 1][1], en: s.en });
  }
  return out;
}
/** Silgi kırıntıları: darbe geçtikçe belirir, rüzgârla savrulup söner */
export function kirintiCiz(ctx, t) {
  for (const s of silgiler) {
    const o = silIlerleme(s, t);
    if (o <= 0) continue;
    // ilerleme -> zaman: kırıntının oluştuğu an (yaklaşık, doğrusal ters)
    for (const k of s.kir) {
      if (k.s > o * s.z.L) continue;
      const tk = s.t0 + (k.s / s.z.L) * s.sure;
      const u = t - tk;
      if (u < 0 || u > 1.6) continue;
      const a = clamp(u / 0.06) * (1 - clamp((u - 0.8) / 0.8));
      const x = k.x + k.vx * u * u * 0.9 + u * 25, y = k.y + k.vy * u + 60 * u * u;
      ogeCiz(ctx, kirintiSp[k.tip], x, y, { r: k.r0 + k.don * u, s: k.sc, alfa: a });
    }
  }
}
