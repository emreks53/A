// s05 yardımcıları: dört simge (kandil, çiçekli dalda kuş, yarılmış nar, bal peteği), simge levhaları, ışık zemini
// (sıcak ve loş iki sürüm), gri sürüm üretimi. Hepsi S-232 tekniğiyle (buğu + saten tarama + koyu kontur) önbelleğe çizilir.
import { tuval, rng, clamp, lerp, ease, TAU, rgba, W, H } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, tara, TON, FILM, bulutSekli } from '../motor/kalem.mjs';
import { svg, elips, cokgen, donustur, icinde, path2d, yumusat } from '../motor/sekil.mjs';
import * as M from '../motor/motifler.mjs';

export const OL = 1.6; // simge sprite çözünürlüğü (ekranda ~1-1.1 ölçekle çizilir)

// ---------------------------------------------------------------- gri sürüm
/** Sprite'ın soluk-gri kopyası (renk çekilmiş, hafif leylak gölgeli) */
export function griSurum(o, { doyum = 0.08, parlak = 1.0, kontrast = 0.8, leylak = 0.06 } = {}) {
  const c = tuval(o.tuval.width, o.tuval.height);
  const g = c.getContext('2d');
  g.filter = `saturate(${doyum}) brightness(${parlak}) contrast(${kontrast})`;
  g.drawImage(o.tuval, 0, 0);
  g.filter = 'none';
  if (leylak > 0) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = `rgba(112,102,140,${leylak})`;
    g.fillRect(0, 0, c.width, c.height);
  }
  return { ...o, tuval: c };
}

// ---------------------------------------------------------------- ışık zemini
/**
 * Büyük zemin tuvali: çıplak film, kaynağa göre ışıklı arka yüz buğusu, kenarlara doğru koyulaşan uzun saten
 * süpürüşler. p: palet ('sicak' | 'los'). Dünya koordinatında (X0, Y0)'a yerleşir.
 */
export const ZEMIN = { X0: -120, Y0: -150, w: 1320, h: 2220 };
export function zeminTuvali(tur, kx, ky) {
  const { X0, Y0, w, h } = ZEMIN;
  const P = tur === 'sicak'
    ? { merkez: '#FFF4D8', orta: '#F2E5C4', kenar: '#E2D6C6', alt: '#E6DDD6', tara: [[0, '#F1E3BD'], [0.5, '#DEC89A'], [1, '#B79F78']], alfa: 0.3 }
    : { merkez: '#EEECF0', orta: '#E0DCE4', kenar: '#CDC8D4', alt: '#D2CDD8', tara: [[0, '#D8D4DE'], [0.5, '#B6B0C2'], [1, '#948CA4']], alfa: 0.3 };
  const c = tuval(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, w, h);
  // arka yüz buğusu
  const tmp = tuval(w, h);
  const t = tmp.getContext('2d');
  const cx = kx - X0, cy = ky - Y0;
  const g = t.createRadialGradient(cx, cy, 0, cx, cy, 1500);
  g.addColorStop(0, rgba(P.merkez, 0.9));
  g.addColorStop(0.32, rgba(P.orta, 0.85));
  g.addColorStop(0.75, rgba(P.kenar, 0.85));
  g.addColorStop(1, rgba(P.alt, 0.9));
  t.fillStyle = g;
  t.fillRect(0, 0, w, h);
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.filter = 'blur(8px)';
  ctx.drawImage(tmp, 0, 0);
  ctx.filter = 'none';
  ctx.restore();
  // ön yüz: uzun saten süpürüşler, kaynaktan uzaklaştıkça koyulaşır
  const ton = (x, y) => {
    const d = Math.hypot(x - cx, (y - cy) * 0.85) / 1250;
    const alt = clamp((y + Y0 - 1350) / 600); // bulut yatağının arkası daha sakin
    return clamp((0.1 + 0.85 * Math.pow(d, 1.25)) * (1 - 0.4 * alt));
  };
  tara(ctx, { x0: 0, y0: 0, x1: w, y1: h, yon: -0.157, aralik: 3.6, boy: [170, 430], kal: 1.3, alfa: P.alfa, ton,
    renkler: P.tara, esikler: [0.22, 0.5, 0.78], gecisAci: 0.04, tohum: tur === 'sicak' ? 51 : 52, minUc: 10, incelme: 0.1, esikYay: 0.12, yumusak: 0.25 });
  return { tuval: c, ox: 0, oy: 0, olcek: 1, w, h, sinir: { x0: 0, y0: 0, x1: w, y1: h, w, h, cx: w / 2, cy: h / 2 } };
}

// ---------------------------------------------------------------- simge levhası
export const LR = 122; // levha yarıçapı
export function levhaOge() {
  return oge({
    ad: 's05-levha', olcek: OL, sekil: elips(0, 0, LR, LR), arka: '#F7ECCD', arkaAlfa: 0.75, arkaBulanik: 14, arkaTasma: false,
    tarama: { ton: TON.radyal(0, 0, LR, 0.0, 0.72), renkler: [[0, '#F4E6C2'], [1, '#D9BF86']], yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 3.2, boy: [16, 40], kal: 1.15, alfa: 0.4, esikler: [0.42, 0.62] },
    kontur: M.ALTIN_KOYU, konturKal: 2.2, konturAlfa: 0.8,
    detay: (c, api) => api.halka(elips(0, 0, LR - 10, LR - 10)[0].pts, { renk: M.ALTIN, kal: 1.2, alfa: 0.45 }),
  });
}

// ---------------------------------------------------------------- kandil (turkuaz sırlı kandil)
// yerel (0,0): gövde merkezi. Fitil ucu FITIL'de.
export const FITIL = [93, -21];
export function kandilOge() {
  const govde = svg('M90 -27C70 -25 50 -27 34 -33C14 -43 -38 -45 -60 -33C-84 -19 -84 13 -60 25C-36 35 16 35 38 23C56 13 70 -5 92 -11C102 -13 103 -25 90 -27Z');
  const kulp = svg('M-70 -17C-104 -27 -116 15 -71 16L-69 7C-98 7 -94 -15 -67 -8Z');
  const ayak = svg('M-27 29C-28 38 -35 43 -42 46L36 46C29 43 22 38 21 29Z');
  const taban = elips(-3, 47, 42, 6.5);
  const sekil = [...kulp, ...ayak, ...taban, ...govde];
  return oge({
    ad: 's05-kandil', olcek: OL, sekil, arka: '#A6D8D0', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.kure(18, -22, 95, { lx: 0.5, ly: -0.7, lz: 0.5, ortam: 0.1 }), 0.06, 0.05, 4), renkler: [[0, '#C5E6E0'], [0.5, '#5FAAA0'], [1, '#235F58']], yonF: (x, y) => Math.atan2(y + 120, x) + Math.PI / 2, aralik: 2.8, boy: [10, 30], kal: 1.15, alfa: 0.55, esikler: [0.18, 0.45, 0.72] },
    kontur: '#1F4F49', konturKal: 2.1,
    detay: (c, api) => {
      // omuzda krem şerit ve noktalar (İznik çinisi tadında)
      const ust = [], alt = [];
      for (let k = 0; k <= 24; k++) {
        const x = lerp(-66, 40, k / 24);
        const y = -4 - 6 * Math.sin((k / 24) * Math.PI);
        ust.push([x, y - 5]);
        alt.push([x, y + 5]);
      }
      api.dolgu([{ pts: [...ust, ...alt.reverse()], kapali: true }], '#F7EED6', 0.92);
      api.cizgi(ust, { renk: '#B98A2E', kal: 1.3, alfa: 0.9 });
      api.cizgi(alt.slice().reverse(), { renk: '#B98A2E', kal: 1.3, alfa: 0.9 });
      for (let k = 1; k < 8; k++) {
        const x = lerp(-66, 40, k / 8);
        const y = -4 - 6 * Math.sin((k / 8) * Math.PI);
        api.dolgu(elips(x, y, 2.6, 2.6), '#C8524A', 0.85);
      }
      // dolum ağzı
      api.dolgu(elips(-14, -39, 17, 5), '#2C6A62', 0.9);
      api.halka(elips(-14, -39, 17, 5)[0].pts, { renk: '#1F4F49', kal: 1.6 });
      // fitil ağzı
      api.dolgu(elips(FITIL[0] - 1, FITIL[1] + 2, 4.5, 3), '#3A2A1E', 0.9);
      // parlaklık
      api.dolgu(svg('M12 -34C24 -33 34 -28 40 -20C34 -23 24 -28 12 -30Z'), '#FFFFFF', 0.85);
      api.dolgu(elips(-46, -20, 4, 7), '#FFFFFF', 0.55);
    },
  });
}
/** Alev (önbellekli): yerel (0,0) alevin dibi */
export function alevOge() {
  const s = svg('M2 -66C8 -46 17 -32 15 -15C14 -4 8 2 0 2C-8 2 -14 -4 -15 -15C-16 -31 -5 -44 2 -66Z');
  return oge({
    ad: 's05-alev', olcek: OL * 1.2, sekil: s, arka: '#FFE29A', arkaAlfa: 0.7, arkaBulanik: 6, arkaTasma: false,
    tarama: { ton: (x, y) => clamp(Math.hypot(x / 15, (y + 16) / 40) * 0.9), renkler: [[0, '#FFF0B0'], [0.6, '#F4C24A'], [1, '#E5803A']], yonF: (x, y) => -Math.PI / 2 + x * 0.02, aralik: 2.4, boy: [10, 30], kal: 1.1, alfa: 0.6, esikler: [0.35, 0.65] },
    kontur: '#D26B2A', konturKal: 1.7, konturAlfa: 0.85,
    detay: (c, api) => api.dolgu(svg('M0.5 -30C4 -20 7 -12 6 -6C5 -1 3 1 0 1C-3 1 -5 -1 -6 -6C-6 -14 -2 -21 0.5 -30Z'), '#FFFDF2', 0.95),
  });
}

// ---------------------------------------------------------------- kuş ve çiçekli dal
const KUS_MAVI = { arka: '#B3C8EC', tara: [[0, '#C8DCF2'], [0.5, '#7D93CF'], [1, '#475A94']] };
const KUS_GOGUS = { arka: '#F5BC8A', tara: [[0, '#F8D2AC'], [0.55, '#E79A57'], [1, '#B8652E']] };
const KUS_KONTUR = '#34416E';
const gogusSekli = svg('M49 -63C58 -50 58 -31 46 -18C38 -10 28 -7 18 -9C24 -24 30 -44 38 -62C42 -66 46 -66 49 -63Z');
export const KUS = { boyun: [34, -63], gaga: [59, -75], goz: [48, -82] };
export function kusOgeleri() {
  const govde = svg('M24 -72C36 -76 46 -72 50 -62C58 -50 58 -30 46 -18C34 -6 12 -4 -6 -10C-18 -14 -26 -18 -32 -21L-66 1C-73 4 -80 0 -82 -6C-83 -11 -81 -15 -76 -17L-38 -38C-26 -54 -10 -64 4 -68C12 -71 18 -72 24 -72Z');
  const kure = TON.kure(20, -55, 70, { lx: 0.4, ly: -0.8, lz: 0.5, ortam: 0.12 });
  const govdeO = oge({
    ad: 's05-kus-govde', olcek: OL, sekil: govde,
    arka: KUS_MAVI.arka, arkaAlfa: 0.85,
    arkaCiz: (t, yol) => { t.fill(yol); t.fillStyle = rgba(KUS_GOGUS.arka, 0.9); t.beginPath(); for (const p of gogusSekli) { t.moveTo(...p.pts[0]); p.pts.forEach((q) => t.lineTo(...q)); } t.fill(); },
    tarama: [
      { ton: (x, y) => (icinde(gogusSekli, x, y) ? 0 : kure(x, y)), renkler: KUS_MAVI.tara, yonF: (x, y) => Math.atan2(y + 20, x + 160) + 0.1, aralik: 2.7, boy: [10, 28], kal: 1.1, alfa: 0.55, esikler: [0.15, 0.42, 0.7] },
      { sekil: gogusSekli, ton: TON.gurultulu(TON.dogrusal(52, -50, 22, -14, 0.25, 0.8), 0.06, 0.05, 3), renkler: KUS_GOGUS.tara, yonF: (x, y) => Math.atan2(y + 40, x - 10) + Math.PI / 2, aralik: 2.6, boy: [8, 22], kal: 1.1, alfa: 0.55, esikler: [0.2, 0.5] },
    ],
    kontur: KUS_KONTUR, konturKal: 2.0,
    detay: (c, api) => {
      // kuyruk tüyleri
      api.cizgi([[-40, -27], [-79, -8]], { renk: KUS_KONTUR, kal: 1.2, alfa: 0.55 });
      api.cizgi([[-38, -24], [-73, -2]], { renk: KUS_KONTUR, kal: 1.1, alfa: 0.45 });
      // bacaklar ve tutunan parmaklar
      for (const [x0, x1] of [[4, 0], [14, 12]]) {
        api.cizgi([[x0, -9], [x1, 1]], { renk: '#5A4A3A', kal: 2.0 });
        api.cizgi([[x1 - 5, 2], [x1 + 1, 0], [x1 + 6, 3]], { renk: '#5A4A3A', kal: 1.6 });
      }
    },
  });
  const kanat = oge({
    ad: 's05-kus-kanat', olcek: OL, sekil: svg('M27 -60C10 -63 -16 -55 -40 -31C-48 -23 -52 -19 -57 -14C-36 -16 -6 -22 18 -32C30 -38 35 -54 27 -60Z'),
    arka: '#8EA4DA', arkaAlfa: 0.9,
    tarama: { ton: TON.dogrusal(20, -55, -50, -18, 0.5, 0.95), renkler: [[0, '#A9C0EA'], [0.5, '#5F76BA'], [1, '#33437C']], yonF: () => 2.55, aralik: 2.4, boy: [12, 30], kal: 1.15, alfa: 0.62, esikler: [0.2, 0.45, 0.7] },
    kontur: KUS_KONTUR, konturKal: 1.9,
    detay: (c, api) => {
      api.cizgi([[10, -44], [-20, -34], [-44, -20]], { renk: KUS_KONTUR, kal: 1.2, alfa: 0.6 });
      api.cizgi([[2, -36], [-26, -26], [-46, -17]], { renk: KUS_KONTUR, kal: 1.1, alfa: 0.5 });
    },
  });
  const gerdan = svg('M58 -72C56 -64 50 -58 42 -58C46 -64 50 -70 58 -72Z');
  const bas = oge({
    ad: 's05-kus-bas', olcek: OL, sekil: elips(40, -78, 21, 20),
    arka: KUS_MAVI.arka, arkaAlfa: 0.85,
    arkaCiz: (t, yol) => { t.fill(yol); t.fillStyle = rgba(KUS_GOGUS.arka, 0.95); t.beginPath(); t.ellipse(52, -64, 12, 9, 0, 0, TAU); t.fill(); },
    tarama: { ton: (x, y) => (Math.hypot((x - 52) / 12, (y - 64 + 0) / 9) < 1 && y > -70 ? 0.25 : TON.kure(46, -88, 26, { ortam: 0.12 })(x, y)), renkler: KUS_MAVI.tara, yonF: (x, y) => Math.atan2(y + 78, x - 40) + Math.PI / 2, aralik: 2.5, boy: [8, 20], kal: 1.05, alfa: 0.55, esikler: [0.2, 0.5, 0.74] },
    kontur: KUS_KONTUR, konturKal: 2.0,
    detay: (c, api) => { api.tara(gerdan, { ton: () => 0.5, renkler: KUS_GOGUS.tara, yon: 1.2, aralik: 2.4, boy: [6, 14], esikler: [0.2], alfa: 0.5 }); },
  });
  const gagaUst = oge({ ad: 's05-kus-gaga-ust', olcek: OL, sekil: svg('M57 -86C66 -85 74 -82 81 -78C72 -77 64 -76 58 -76Z'), arka: '#E9B856', arkaAlfa: 0.9, tarama: null, kontur: '#7A4E14', konturKal: 1.6 });
  const gagaAlt = oge({ ad: 's05-kus-gaga-alt', olcek: OL, sekil: svg('M58 -76C66 -76 73 -77 78 -77C72 -74 65 -72 58 -72Z'), arka: '#D9A24A', arkaAlfa: 0.9, tarama: null, kontur: '#7A4E14', konturKal: 1.5 });
  return { govde: govdeO, kanat, bas, gagaUst, gagaAlt };
}
/** Çiçekli dal (önbellekli): yerel (0,0) kuşun tuttuğu yer. Döner: { dal, yapraklar:[{x,y,r,oge}], cicekler:[{x,y,s,oge}] } */
export function dalOgeleri() {
  const dalS = svg('M-124 30C-70 14 0 6 60 -2C84 -6 104 -12 122 -20L124 -13C104 -4 84 2 62 6C2 14 -70 24 -122 41Z');
  const ince1 = svg('M44 1C58 -14 72 -30 88 -44L91 -41C76 -27 63 -11 50 3Z');
  const ince2 = svg('M-62 20C-74 32 -88 44 -104 52L-106 48C-90 40 -77 29 -66 17Z');
  const dal = oge({
    ad: 's05-dal', olcek: OL, sekil: [...ince2, ...ince1, ...dalS], arka: '#CDB08E', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.sabit(0.55), 0.2, 0.05, 9), renkler: [[0, '#C29F7A'], [1, '#5A3E28']], yon: -0.12, aralik: 2.5, boy: [10, 30], kal: 1.1, alfa: 0.55, esikler: [0.25, 0.55] },
    kontur: '#4E3826', konturKal: 1.9,
  });
  const yp = (b, e) => M.yaprakOge(b, e, OL);
  const yapraklar = [
    { x: -96, y: 34, r: 2.6, oge: yp(34, 15) }, { x: -40, y: 18, r: -2.2, oge: yp(30, 14) }, { x: 26, y: 6, r: 1.9, oge: yp(32, 14) },
    { x: 78, y: -8, r: -1.2, oge: yp(30, 13) }, { x: 70, y: -32, r: -2.5, oge: yp(26, 12) }, { x: -84, y: 40, r: 1.4, oge: yp(28, 12) },
  ];
  const cicekler = [
    { x: 92, y: -44, s: 1, oge: M.cicekOge(15, OL, 'pembe') }, { x: 118, y: -18, s: 0.8, oge: M.cicekOge(15, OL, 'pembe') },
    { x: -106, y: 52, s: 0.9, oge: M.cicekOge(15, OL, 'pembe') }, { x: -58, y: 20, s: 0.7, oge: M.cicekOge(15, OL, 'beyaz') },
  ];
  return { dal, yapraklar, cicekler };
}

// ---------------------------------------------------------------- nar
const NAR_R = 62;
function narGovdeSekli() {
  const r = NAR_R;
  return svg(`M0 ${-r * 0.86}C${r * 0.42} ${-r * 0.98} ${r * 1.02} ${-r * 0.8} ${r * 1.04} ${-r * 0.08}C${r * 1.05} ${r * 0.62} ${r * 0.52} ${r * 1.0} 0 ${r * 0.98}C${-r * 0.52} ${r * 1.0} ${-r * 1.05} ${r * 0.62} ${-r * 1.04} ${-r * 0.08}C${-r * 1.02} ${-r * 0.8} ${-r * 0.42} ${-r * 0.98} 0 ${-r * 0.86}Z`);
}
function narTacSekli() {
  const r = NAR_R;
  // kısa boyun ve altı sivri taç yaprağı
  const y0 = -r * 0.84;
  return svg(`M${-r * 0.2} ${y0}C${-r * 0.2} ${y0 - 10} ${-r * 0.24} ${y0 - 16} ${-r * 0.34} ${y0 - 24}L${-r * 0.2} ${y0 - 19}L${-r * 0.13} ${y0 - 30}L${-r * 0.04} ${y0 - 20}L${r * 0.06} ${y0 - 31}L${r * 0.12} ${y0 - 19}L${r * 0.26} ${y0 - 27}L${r * 0.2} ${y0 - 14}C${r * 0.2} ${y0 - 8} ${r * 0.2} ${y0 - 4} ${r * 0.2} ${y0}Z`);
}
const narAcikSekli = () => cokgen(yumusat([[-12, -43], [-2, -45], [7, -39], [17, -38], [23, -29], [33, -24], [35, -13], [42, -5], [40, 7], [45, 16], [38, 26], [37, 36], [27, 42], [19, 50], [7, 48], [-1, 52], [-9, 42], [-17, 37], [-19, 25], [-28, 17], [-25, 5], [-32, -5], [-27, -15], [-30, -26], [-21, -32]], 1, true));
/** Nar: tur 'kapali' | 'acik' | 'kuru'. yerel (0,0) meyvenin merkezi */
export function narOge(tur) {
  const kuru = tur === 'kuru';
  const R = kuru
    ? { arka: '#D9B8A8', tara: [[0, '#D2B0A0'], [0.5, '#A27464'], [1, '#5E3B34']], kontur: '#4E2C28', tane: '#A0505A' }
    : { arka: '#F0A494', tara: [[0, '#F3A898'], [0.5, '#D65A50'], [1, '#8C2830']], kontur: '#6A1E24', tane: '#D0304C' };
  const govde = narGovdeSekli();
  const tac = narTacSekli();
  const acik = narAcikSekli();
  const tane = oge({
    ad: `s05-nar-tane-${kuru}`, olcek: OL, sekil: svg(kuru ? 'M0 -5C3.5 -5 5 -2 5 1C5 4 2.5 5.5 0 5.5C-3 5.5 -5 3.5 -5 0.5C-5 -2.5 -3 -5 0 -5Z' : 'M0 -8C5 -8 7.5 -4 7.5 0C7.5 5 4 8 0 8C-4.5 8 -7.5 5 -7.5 0.5C-7.5 -4 -4.5 -8 0 -8Z'),
    arka: kuru ? '#B97A80' : '#EE7086', arkaAlfa: 0.9, arkaBulanik: 2,
    tarama: { ton: TON.kure(2, -3, kuru ? 6 : 9, { ortam: 0.2 }), renkler: kuru ? [[0, '#B4767C'], [1, '#5E2A34']] : [[0, '#F58A9C'], [1, '#9A1636']], yon: -0.8, aralik: 1.7, boy: [4, 10], kal: 0.9, alfa: 0.65, esikler: [0.25, 0.6] },
    kontur: kuru ? '#5E2A30' : '#7C1230', konturKal: 1.1, konturAlfa: 0.85, pay: 4,
    detay: (c, api) => { if (!kuru) api.dolgu(elips(-2.4, -3, 1.8, 2.4), '#FFFFFF', 0.95); },
  });
  const sekil = [...tac, ...govde];
  return oge({
    ad: `s05-nar-${tur}`, olcek: OL, sekil, arka: R.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.kure(NAR_R * 0.35, -NAR_R * 0.4, NAR_R * 1.25, { ortam: 0.12 }), 0.07, 0.04, 6), renkler: R.tara, yonF: (x, y) => Math.atan2(y + NAR_R * 2.2, x) + Math.PI / 2, aralik: 2.7, boy: [10, 30], kal: 1.15, alfa: 0.55, esikler: [0.18, 0.45, 0.72] },
    kontur: R.kontur, konturKal: 2.1,
    detay: (c, api) => {
      if (kuru) {
        // buruşukluk çizgileri
        const r = rng(77);
        for (let i = 0; i < 9; i++) {
          const a = r.ara(0, TAU), d = r.ara(NAR_R * 0.35, NAR_R * 0.85);
          const x = Math.cos(a) * d, y = Math.sin(a) * d;
          if (icinde(acik, x, y)) continue;
          api.cizgi([[x, y], [x + r.ara(-6, 6), y + r.ara(4, 9)], [x + r.ara(-5, 5), y + r.ara(12, 18)]], { renk: R.kontur, kal: 1.1, alfa: 0.5 });
        }
      }
      if (tur === 'kapali') {
        // yarılma çizgisi (henüz açılmamış)
        api.cizgi([[-8, -38], [6, -18], [0, 4], [12, 26], [8, 42]], { renk: R.kontur, kal: 1.4, alfa: 0.55 });
        api.dolgu(elips(-NAR_R * 0.45, -NAR_R * 0.4, 7, 11), '#FFF6EE', 0.75);
        return;
      }
      // yarığın içi: kabuk kesiti (krem), zar ve taneler
      api.dolgu(acik, kuru ? '#D8C6A8' : '#F6E6BE', 1);
      api.tara(acik, { ton: () => 0.5, renkler: kuru ? [[0, '#C9B48E'], [1, '#9A8462']] : [[0, '#F1DBA6'], [1, '#D8B670']], yon: 0.9, aralik: 2.6, boy: [8, 20], esikler: [0.3], alfa: 0.5 });
      const ic = donustur(acik, { x: 3, y: 3, s: 0.84 });
      api.dolgu(ic, kuru ? '#6E3A3E' : '#9A1E36', 0.85);
      const r = rng(kuru ? 13 : 12);
      const adim = kuru ? 9.5 : 13.5;
      const yerler = [];
      for (let y = -46; y < 52; y += adim * 0.86) {
        const sat = Math.round((y + 46) / (adim * 0.86));
        for (let x = -36 + (sat % 2) * adim * 0.5; x < 46; x += adim) {
          const px = x + r.ara(-1.2, 1.2), py = y + r.ara(-1.2, 1.2);
          if (icinde(ic, px, py)) yerler.push([px, py]);
        }
      }
      yerler.sort((a, b) => a[1] - b[1]);
      for (const [x, y] of yerler) ogeCiz(c, tane, x, y, { r: r.ara(-0.5, 0.5), s: r.ara(0.92, 1.08) });
      api.halka(ic[0].pts, { renk: kuru ? '#8E7A5E' : '#C9A060', kal: 1.2, alfa: 0.7 });
      api.halka(acik[0].pts, { renk: R.kontur, kal: 2.0 });
      // kabukta parıltı
      api.dolgu(elips(-NAR_R * 0.55, -NAR_R * 0.42, 6, 10), '#FFF6EE', kuru ? 0.25 : 0.75);
    },
  });
}
/** Narın tane yerleri (parıltılar için) */
export function narTaneYerleri() {
  const ic = donustur(narAcikSekli(), { x: 3, y: 3, s: 0.84 });
  const r = rng(404);
  const out = [];
  while (out.length < 7) {
    const x = r.ara(-26, 36), y = r.ara(-36, 40);
    if (icinde(ic, x, y) && out.every((p) => Math.hypot(p[0] - x, p[1] - y) > 16)) out.push([x, y]);
  }
  return out;
}
export const NAR_ACIK_MERKEZ = [8, 2];

// ---------------------------------------------------------------- bal peteği
const HS = 21; // altıgen çevre yarıçapı
function petekHucreleri() {
  const w = Math.sqrt(3) * HS, dy = 1.5 * HS;
  const satirlar = [[-1, 0, 1], [-1.5, -0.5, 0.5, 1.5], [-1, 0, 1], [-0.5, 0.5]];
  const hucreler = [];
  satirlar.forEach((xs, si) => xs.forEach((u) => hucreler.push([u * w, (si - 1.5) * dy - 6])));
  return hucreler;
}
const altigen = (cx, cy, s) => Array.from({ length: 6 }, (_, k) => {
  const a = -Math.PI / 2 + (k * Math.PI) / 3;
  return [cx + s * Math.cos(a), cy + s * Math.sin(a)];
});
function petekDisHat(hucreler) {
  // köşeleri toleransla birleştir (kayan nokta), her kenarın kaç hücrede geçtiğini say, tekleri zincirle
  const koseler = [];
  const kid = (p) => {
    for (let i = 0; i < koseler.length; i++) if (Math.hypot(koseler[i][0] - p[0], koseler[i][1] - p[1]) < 0.5) return i;
    koseler.push(p);
    return koseler.length - 1;
  };
  const kenarlar = new Map();
  for (const [cx, cy] of hucreler) {
    const h = altigen(cx, cy, HS).map(kid);
    for (let k = 0; k < 6; k++) {
      const a = h[k], b = h[(k + 1) % 6];
      const key = a < b ? a + '|' + b : b + '|' + a;
      if (kenarlar.has(key)) kenarlar.get(key).n++;
      else kenarlar.set(key, { a, b, n: 1 });
    }
  }
  const dis = [...kenarlar.values()].filter((e) => e.n === 1);
  const sonraki = new Map();
  for (const e of dis) sonraki.set(e.a, e);
  const pts = [koseler[dis[0].a]];
  let cur = dis[0];
  for (let i = 0; i < dis.length; i++) {
    pts.push(koseler[cur.b]);
    cur = sonraki.get(cur.b);
    if (!cur || cur === dis[0]) break;
  }
  return pts;
}
export const BAL_DAMLA_YERI = (() => {
  // en alttaki hücrenin alt köşesi
  const h = petekHucreleri();
  const alt = h.reduce((m, p) => (p[1] > m[1] || (p[1] === m[1] && p[0] > m[0]) ? p : m), h[0]);
  return [alt[0], alt[1] + HS];
})();
/** Bal peteği (önbellekli). parlak: true ise yalnız ıslak parıltılar (ayrı katman, donuklaşınca söner) */
export function petekOge(parlak = false) {
  const hucreler = petekHucreleri();
  const dis = petekDisHat(hucreler);
  const kapakli = new Set([0, 4, 6]);
  if (parlak) {
    const sekil = [{ pts: dis, kapali: true }];
    return oge({
      ad: 's05-petek-parlak', olcek: OL, sekil, zemin: null, arka: null, tarama: null, kontur: null,
      detay: (c, api) => {
        hucreler.forEach(([cx, cy], i) => {
          if (kapakli.has(i)) return;
          api.dolgu(svg(`M${cx - 9} ${cy - 6}C${cx - 6} ${cy - 11} ${cx} ${cy - 13} ${cx + 5} ${cy - 12}C${cx} ${cy - 10} ${cx - 5} ${cy - 8} ${cx - 8} ${cy - 3}Z`), '#FFFFFF', 0.9);
          api.dolgu(elips(cx + 7, cy + 7, 1.8, 1.8), '#FFFDF0', 0.85);
        });
        // alttan sızan balın üstünde parıltı
        api.dolgu(elips(BAL_DAMLA_YERI[0] - 3, BAL_DAMLA_YERI[1] - 2, 1.6, 3), '#FFFFFF', 0.8);
      },
    });
  }
  // dış hat + alt kenardan sarkan bal birikintisi
  const [dx, dy] = BAL_DAMLA_YERI;
  const sizinti = svg(`M${dx - 16} ${dy - 9}C${dx - 10} ${dy - 3} ${dx - 6} ${dy + 3} ${dx - 5} ${dy + 7}C${dx - 4} ${dy + 12} ${dx + 4} ${dy + 12} ${dx + 5} ${dy + 7}C${dx + 6} ${dy + 3} ${dx + 10} ${dy - 3} ${dx + 16} ${dy - 9}Z`);
  const sekil = [{ pts: dis, kapali: true }, ...sizinti];
  return oge({
    ad: 's05-petek', olcek: OL, sekil, arka: '#F4C65A', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.kure(20, -40, 110, { ortam: 0.15 }), 0.06, 0.04, 8), renkler: [[0, '#F8D987'], [0.55, '#DDA43A'], [1, '#9C6416']], yon: -0.6, aralik: 2.7, boy: [10, 26], kal: 1.1, alfa: 0.5, esikler: [0.25, 0.55] },
    kontur: '#8A5A12', konturKal: 2.1,
    detay: (c, api) => {
      hucreler.forEach(([cx, cy], i) => {
        const ic = cokgen(altigen(cx, cy, HS * 0.76));
        if (kapakli.has(i)) {
          api.dolgu(ic, '#F7E3A6', 0.95);
          api.tara(ic, { ton: () => 0.45, renkler: [[0, '#F2D58A'], [1, '#D7AE55']], yon: 0.5, aralik: 2.4, boy: [6, 14], esikler: [0.3], alfa: 0.55 });
          api.cizgi([[cx - 8, cy - 2], [cx, cy - 5], [cx + 8, cy - 2]], { renk: '#B98A2E', kal: 1, alfa: 0.5 });
        } else {
          api.dolgu(ic, '#C9861E', 0.55, 'multiply');
          api.tara(ic, { ton: TON.radyal(cx + 4, cy + 6, HS, 0.85, 0.35), renkler: [[0, '#E2A23A'], [1, '#8E5410']], yon: -1.0, aralik: 2.2, boy: [6, 16], esikler: [0.3, 0.6], alfa: 0.55 });
        }
        api.halka(ic[0].pts, { renk: '#9A6A16', kal: 1.25, alfa: 0.8 });
        api.halka(altigen(cx, cy, HS), { renk: '#B5862E', kal: 1.0, alfa: 0.55 });
      });
    },
  });
}

// ---------------------------------------------------------------- yardımcı: duman kıvrımı
export function duman(ctx, x, y, u, t, { renk = '#8D869A', alfa = 0.6 } = {}) {
  // u: 0..1 yaşam; iki ince kıvrım yükselir, uzar ve solar
  if (u <= 0 || u >= 1) return;
  for (let k = 0; k < 2; k++) {
    const boy = lerp(10, 120, ease.outCubic(clamp(u * 1.2 - k * 0.12)));
    const pts = [];
    for (let i = 0; i <= 30; i++) {
      const s = i / 30;
      const yy = y - s * boy;
      const xx = x + Math.sin(s * 5.2 + t * 2.1 + k * 2.2) * (3 + s * 11) + s * (k ? -8 : 10);
      pts.push([xx, yy]);
    }
    konturCiz(ctx, pts, { renk, kal: 1.8 - k * 0.4, alfa: alfa * (1 - u) * (k ? 0.7 : 1), kapali: false, titreme: 0.2, tohum: 300 + k, uc: 0.3 });
  }
}

/** Ses yayları (kuş öterken): gagadan dışa açılan küçük yaylar */
export function sesYaylari(ctx, x, y, t, guc, { renk = '#C99A35', yon = -0.35 } = {}) {
  if (guc <= 0.01) return;
  for (let k = 0; k < 3; k++) {
    const u = ((t * 1.3 + k / 3) % 1 + 1) % 1;
    const r = 10 + u * 34;
    const a0 = yon - 0.55, a1 = yon + 0.55;
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = lerp(a0, a1, i / 14);
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    konturCiz(ctx, pts, { renk, kal: 2.0, alfa: 0.85 * guc * Math.sin(u * Math.PI), kapali: false, titreme: 0.2, tohum: 500 + k, uc: 0.35 });
  }
}

/** Dört kollu küçük parıltı (çapraz ışık) */
export function parilti(ctx, x, y, r, alfa, renk = '#FFFDF0') {
  if (alfa <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  M.hale(ctx, x, y, r * 2.2, '#FFF3C4', 0.55 * alfa);
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = rgba(renk, alfa);
  ctx.beginPath();
  ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x, y, x + r * 0.35, y); ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r * 0.35, y); ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.moveTo(x - r * 0.7, y); ctx.quadraticCurveTo(x, y, x, y - r * 0.25); ctx.quadraticCurveTo(x, y, x + r * 0.7, y);
  ctx.quadraticCurveTo(x, y, x, y + r * 0.25); ctx.quadraticCurveTo(x, y, x - r * 0.7, y);
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- s04'ten devralınan altın halkalar (aynı biçim)
function isikHalkasi(ctx, x, y, R, gen, renk, alfa) {
  if (alfa <= 0.002 || R <= 0) return;
  const r0 = Math.max(0, R - gen), r1 = R + gen;
  ctx.save();
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  g.addColorStop(0, rgba(renk, 0));
  g.addColorStop(clamp((R - r0) / (r1 - r0)), rgba(renk, alfa));
  g.addColorStop(1, rgba(renk, 0));
  ctx.fillStyle = g;
  const x0 = Math.max(0, x - r1), y0 = Math.max(0, y - r1);
  ctx.fillRect(x0, y0, Math.min(W, x + r1) - x0, Math.min(H, y + r1) - y0);
  ctx.restore();
}
export function altinHalka(ctx, x, y, R, { alfa = 1, kal = 3, tohum = 1 } = {}) {
  if (alfa <= 0.003 || R < 2) return;
  isikHalkasi(ctx, x, y, R, 26 + R * 0.03, '#F7DA8C', 0.32 * alfa);
  const n = Math.max(48, Math.ceil((TAU * R) / 5));
  konturCiz(ctx, elips(x, y, R, R, n)[0].pts, { renk: '#C99428', kal, alfa: 0.9 * alfa, kapali: true, titreme: 0.7, tohum, adim: 3 });
  const R2 = R * 0.975 - 5;
  if (R2 > 4) konturCiz(ctx, elips(x, y, R2, R2, n)[0].pts, { renk: '#E2B94F', kal: Math.max(1.1, kal * 0.42), alfa: 0.55 * alfa, kapali: true, titreme: 0.6, tohum: tohum + 50, adim: 3 });
}

// ---------------------------------------------------------------- alt bulut yatağı
export function bulutYatagi() {
  const liste = [
    { x: 300, y: 1640, w: 380, t: 21 }, { x: 790, y: 1630, w: 360, t: 22 },
    { x: 40, y: 1700, w: 520, t: 3 }, { x: 1040, y: 1690, w: 500, t: 12 }, { x: 560, y: 1730, w: 560, t: 7 },
    { x: 250, y: 1810, w: 640, t: 5 }, { x: 860, y: 1820, w: 660, t: 9 },
    { x: -40, y: 1910, w: 700, t: 16 }, { x: 560, y: 1930, w: 780, t: 14 }, { x: 1120, y: 1920, w: 700, t: 18 },
  ];
  return liste.map((b) => ({
    ...b,
    oge: oge({
      ad: `s05-bulut-${b.w}-${b.t}`, olcek: 1.1, sekil: bulutSekli(b.w, b.t), arka: '#F1E8F0', arkaAlfa: 0.55, arkaBulanik: 16, arkaTasma: false,
      tarama: { ton: (x, y) => clamp((y + b.w * 0.05) / (b.w * 0.14)) * 0.7, renkler: [[0, '#E2DAEE'], [1, '#B7AFD6']], yon: -0.157, aralik: 3.4, boy: [30, 110], esikler: [0.2, 0.45], alfa: 0.32 },
      kontur: null,
    }),
  }));
}
