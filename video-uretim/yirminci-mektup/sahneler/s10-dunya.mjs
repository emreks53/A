// s10 yan görünüş dünyası (rahmet ve kudret bölümü): gök, uzak sırtlar, heybetli dağ ve dibindeki kaya, koruyucu
// ağaç, kuru → yeşeren toprak, çimen ve çiçekler, rahmet bulutları ve ışıklı yağmur.
import { tuval, W, H, clamp, lerp, ease, an, rng, TAU, rgba, smooth, pop } from '../motor/temel.mjs';
import { oge, ogeCiz, gokTuvali, konturCiz, darbe, TON, PALET } from '../motor/kalem.mjs';
import { svg, elips, cokgen, yumusat, path2d } from '../motor/sekil.mjs';
import { kameraUygula, ekranda } from '../motor/sahne.mjs';
import * as M from '../motor/motifler.mjs';
import { tampon, cizgiDarbe, sisSeridi, sisCiz } from './s10-yardim.mjs';

export const G = 1300; // zemin çizgisi (paralaks 1)
export const AGAC = { x: 640, y: G + 4, boy: 820 };
export const KAYA = { x: 200, sag: 318 }; // kayanın sağ yüzü (adam buraya yaslanır)
export const NUR = { x: 380, y: 130, r: 56 }; // gök katmanında (f = 0.3)
export const F = { gok: 0.3, nur: 0.3, uzak: 0.5, orta: 0.72, bulut: 0.6, dag: 0.92, ana: 1, on: 1.15 };

// ---------------------------------------------------------------- sırt (tepe) öğesi
function sirtOge({ ad, x0, x1, ust, alt, P, olcek = 1, tohum = 1, aralik = 3.4, yon = -0.05 }) {
  const n = Math.ceil((x1 - x0) / 14);
  const pts = [];
  for (let k = 0; k <= n; k++) { const x = x0 + (k / n) * (x1 - x0); pts.push([x, ust(x)]); }
  pts.push([x1, alt], [x0, alt]);
  const ymin = Math.min(...pts.map((p) => p[1]));
  return oge({
    ad, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.3 + 0.55 * clamp((y - ymin) / 600)), 0.16, 0.006, tohum), renkler: P.tara, yon, aralik, boy: [40, 120], esikler: [0.25, 0.55, 0.8], alfa: 0.5 },
    kontur: P.kontur, konturKal: 2.0, titreme: 0.6, konturAtla: [],
  });
}
const tumsek = (taban, liste) => (x) => taban - liste.reduce((s, [cx, yuk, gen]) => s + yuk * Math.exp(-Math.pow((x - cx) / gen, 2)), 0);

const PAL = {
  uzak: { arka: '#D3D4EC', tara: [[0, '#CFD0EA'], [0.6, '#ADAFD8'], [1, '#8E90C0']], kontur: '#9496C6' },
  ortaKuru: { arka: '#E2DABD', tara: [[0, '#DCD2B0'], [0.6, '#C2B48A'], [1, '#A08E66']], kontur: '#A8976E' },
  ortaYesil: { arka: '#C6E2B2', tara: [[0, '#BCDDA8'], [0.6, '#93C690'], [1, '#6FA873']], kontur: '#7FB37F' },
  kuru: { arka: '#EADDBC', tara: [[0, '#E3D2AA'], [0.55, '#C9AF7E'], [1, '#9C7F55']], kontur: '#A58A5E' },
  yesil: { arka: '#BFE0A6', tara: [[0, '#A9D592'], [0.55, '#6FB06A'], [1, '#3E7C4F']], kontur: '#5A995E' },
};

// ---------------------------------------------------------------- dağ
// iki doruklu heybetli kütle: ana doruk (-480, -1250), yan doruk (-60, -640); etekleri sağa doğru kayaya iner
const DORUK = [-600, -1262];
function dagSekli() {
  const ana = [
    [-1750, 1330], [-1750, 120], [-1580, -130], [-1420, -340], [-1270, -530], [-1130, -730], [-1000, -905], [-880, -1045],
    [-780, -1150], [-690, -1218], [-600, -1264], [-536, -1206], [-478, -1108], [-420, -990], [-366, -902], [-318, -852],
    [-268, -806], [-226, -782], [-178, -732], [-130, -652], [-92, -542], [-64, -420], [-46, -290], [-24, -140], [4, 20],
    [40, 190], [78, 360], [116, 530], [152, 700], [182, 870], [206, 1030], [226, 1180], [238, 1330],
  ];
  const r = rng(41);
  const p = [];
  for (let i = 0; i < ana.length; i++) {
    const a = ana[i], b = ana[(i + 1) % ana.length];
    p.push(a);
    if (i > 0 && i < ana.length - 1) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.floor(L / 38);
      for (let k = 1; k < n; k++) {
        const u = k / n;
        p.push([lerp(a[0], b[0], u) + r.ara(-6, 6), lerp(a[1], b[1], u) + r.ara(-6, 6)]);
      }
    }
  }
  return cokgen(p);
}
// ışığı bölen sırt çizgileri (sağı aydınlık): ana sırt doruktan sağ aşağı, yan doruğun sırtı
const sirtX = (y) => lerp(DORUK[0] + 30, 150, clamp((y - DORUK[1]) / 2500)) + 80 * Math.sin(y * 0.0048 + 0.9) + 26 * Math.sin(y * 0.017);
function dagTon(x, y) {
  const d = (x - sirtX(y)) / 260;
  let v = 0.62 - 0.4 * Math.tanh(d * 1.6); // sağ aydınlık
  // yan doruğun sol yamacı gölge
  const yd = Math.hypot((x + 300) / 220, (y + 700) / 260);
  if (yd < 1 && x < -226) v += 0.12 * (1 - yd);
  v += 0.14 * clamp((y - 300) / 1000); // etekler koyulaşır
  v -= 0.3 * clamp(1 - (y - DORUK[1]) / 520); // doruk ışıkta
  return clamp(v);
}
// yüzeyler (faset): sırt çizgileriyle ayrılmış düzlemler; her biri kendi tonu ve tarama yönüyle
const R1 = [[-600, -1262], [-566, -1110], [-526, -970], [-486, -810], [-426, -630], [-356, -430], [-276, -210], [-186, 30], [-86, 290], [34, 620], [116, 900], [176, 1150], [200, 1340]];
const R2 = [[-600, -1262], [-614, -1130], [-652, -970], [-697, -800], [-772, -620], [-842, -430], [-932, -200], [-1022, 60], [-1102, 400], [-1152, 800], [-1200, 1340]];
const OLUK = [[-586, -1180], [-556, -1040], [-536, -900], [-520, -760], [-486, -600], [-436, -420], [-372, -230], [-300, -20], [-226, 200], [-150, 440], [-60, 720], [10, 980], [60, 1340]];
function puruz(pts, gen = 26, tohum = 1) {
  const r = rng(tohum);
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    for (let k = 0; k < 4; k++) { const u = k / 4; out.push([lerp(ax, bx, u) + (i || k ? r.ara(-gen, gen) : 0), lerp(ay, by, u)]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function serit(sol, sag) { return cokgen([...sol, ...[...sag].reverse()]); }
// sırt listesinde y'ye göre x (doğrusal ara değer)
function xAt(liste, y) {
  if (y <= liste[0][1]) return liste[0][0];
  for (let i = 1; i < liste.length; i++) {
    if (y <= liste[i][1]) { const [x0, y0] = liste[i - 1], [x1, y1] = liste[i]; return lerp(x0, x1, (y - y0) / (y1 - y0)); }
  }
  return liste[liste.length - 1][0];
}
function noktaIcinde(pts, x, y) {
  let ic = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ic = !ic;
  }
  return ic;
}
function dagOge() {
  const sekil = dagSekli();
  const sinirPts = sekil[0].pts;
  const sagUzak = R1.map(([x, y]) => [x + 900, y]);
  const solUzak = R2.map(([x, y]) => [x - 900, y]);
  const r1 = puruz(R1, 22, 3), r2 = puruz(R2, 26, 5), ol = puruz(OLUK, 30, 7);
  const aydinlik = serit(r1, sagUzak);
  const orta = serit(r2, r1);
  const golge = serit(solUzak, r2);
  const oluk = serit(ol, r1.map(([x, y]) => [x - 4, y]));
  const yogun = (v0, k = 0.16) => TON.gurultulu((x, y) => clamp(v0 + k * clamp((y + 300) / 1600) - 0.25 * clamp(1 - (y - DORUK[1]) / 420)), 0.08, 0.006, Math.round(v0 * 100));
  // ön yüzde sırta yaklaştıkça koyulaşan ton (keskin sırt: aydınlık yüzle ön yüz arasında belirgin ayrım)
  // ana sırtın x'i (y'ye göre, 4 px adımlı tablo: tarama her örnekte sorar)
  const R1T = new Float32Array(700);
  for (let i = 0; i < 700; i++) R1T[i] = xAt(R1, -1300 + i * 4);
  const r1x = (y) => R1T[Math.max(0, Math.min(699, Math.round((y + 1300) / 4)))];
  const ortaTon = TON.gurultulu((x, y) => clamp(0.46 + 0.22 * clamp(1 - (r1x(y) - x) / 260) + 0.16 * clamp((y + 300) / 1600) - 0.25 * clamp(1 - (y - DORUK[1]) / 420)), 0.08, 0.006, 57);
  const R = [[0, '#F3EADC'], [0.3, '#D6D3E2'], [0.6, '#A0A2C4'], [1, '#62669A']];
  const RS = [[0, '#C8C6DE'], [0.5, '#8E90BC'], [1, '#55588C']]; // çapraz tarama (gölgede)
  return oge({
    ad: 's10-dag5', olcek: 0.88, sekil, arka: '#DCDBE8', arkaAlfa: 0.9, arkaBulanik: 12,
    arkaCiz: (g, yol) => {
      const gr = g.createLinearGradient(0, DORUK[1], 0, 1330);
      gr.addColorStop(0, 'rgba(253,240,210,0.95)');
      gr.addColorStop(0.15, 'rgba(236,228,234,0.9)');
      gr.addColorStop(0.5, 'rgba(210,210,230,0.9)');
      gr.addColorStop(1, 'rgba(192,194,216,0.9)');
      g.fillStyle = gr;
      g.fill(yol);
      g.strokeStyle = 'rgba(206,206,226,0.9)';
      g.lineWidth = 26;
      g.stroke(yol);
      // ışık alan yüz sıcak, gölge yüz serin
      g.save();
      g.clip(yol);
      g.fillStyle = 'rgba(255,236,204,0.32)';
      g.fill(path2d(aydinlik));
      g.fillStyle = 'rgba(150,152,196,0.35)';
      g.fill(path2d(golge));
      g.restore();
    },
    tarama: [
      { sekil: aydinlik, ton: yogun(0.24), renkler: R, yon: 1.02, aralik: 3.6, boy: [30, 80], kal: 1.15, alfa: 0.4, esikler: [0.18, 0.5, 0.8] },
      { sekil: orta, ton: ortaTon, renkler: R, yon: 1.95, aralik: 3.2, boy: [30, 80], kal: 1.2, alfa: 0.5, esikler: [0.18, 0.5, 0.8] },
      { sekil: golge, ton: yogun(0.86), renkler: R, yon: 2.28, aralik: 3.1, boy: [30, 80], kal: 1.2, alfa: 0.52, esikler: [0.18, 0.5, 0.8] },
      { sekil: oluk, ton: yogun(0.8), renkler: R, yon: 1.3, aralik: 3.0, boy: [16, 40], kal: 1.15, alfa: 0.52, esikler: [0.18, 0.5, 0.8] },
      // gölgede çapraz tarama: koyu yüzler derinleşir
      { sekil: golge, ton: yogun(0.86), renkler: RS, yon: 2.28 - 1.05, aralik: 4.0, boy: [24, 60], kal: 1.1, alfa: 0.4, esikler: [0.62, 0.86] },
      { sekil: orta, ton: ortaTon, renkler: RS, yon: 1.95 - 1.0, aralik: 4.4, boy: [24, 60], kal: 1.1, alfa: 0.34, esikler: [0.66] },
    ],
    kontur: '#55578A', konturKal: 2.5, titreme: 0.7,
    detay: (c, api) => {
      api.cizgi(r1.slice(0, 44), { renk: '#4E5084', kal: 1.9, alfa: 0.65 });
      api.cizgi(r2.slice(0, 36), { renk: '#4E5084', kal: 1.7, alfa: 0.55 });
      // sırtın ışıklı kenarı (ana sırtın hemen sağında ince sıcak çizgi)
      api.cizgi(r1.slice(0, 40).map(([x, y]) => [x + 5, y]), { renk: '#FFF2DA', kal: 1.5, alfa: 0.7 });
      const yuz = (x, y) => (x > xAt(R1, y) ? 0 : x > xAt(R2, y) ? 1 : 2);
      const YUZ = [
        { aci: 0.46, renk: '#6C6D9C', golge: '#8486B4', a: 0.42, L: [40, 110], n: 70 },
        { aci: -0.2, renk: '#4E5084', golge: '#62649A', a: 0.5, L: [50, 150], n: 150 },
        { aci: -0.46, renk: '#3F4176', golge: '#4C4E84', a: 0.5, L: [50, 140], n: 110 },
      ];
      // kaya katmanları: kısa saçak çizgileri ve altlarında kalem gölgesi
      const rk = rng(77);
      const sayac = [0, 0, 0];
      for (let deneme = 0; deneme < 1400; deneme++) {
        const y = rk.ara(-1050, 1290), x = rk.ara(-1740, 230);
        if (!noktaIcinde(sinirPts, x, y)) continue;
        const f = yuz(x, y);
        const P = YUZ[f];
        if (sayac[f] >= P.n) continue;
        sayac[f]++;
        const L = rk.ara(P.L[0], P.L[1]) * lerp(0.7, 1.15, clamp((y + 1000) / 2200));
        const a = P.aci + rk.ara(-0.12, 0.12);
        const ux = Math.cos(a), uy = Math.sin(a);
        const pts = [];
        for (let k = 0; k <= 5; k++) {
          const px = x + ux * L * (k / 5), py = y + uy * L * (k / 5) + rk.ara(-2.2, 2.2);
          if (k > 1 && (yuz(px, py) !== f || !noktaIcinde(sinirPts, px, py))) break;
          pts.push([px, py]);
        }
        if (pts.length < 3) continue;
        api.cizgi(pts, { renk: P.renk, kal: 1.25, alfa: P.a });
        // saçağın altında kısa gölge darbeleri (uçlara doğru kısalır)
        const n = Math.floor(pts.length * 2.4);
        c.fillStyle = rgba(P.golge, P.a * 0.7);
        for (let k = 0; k < n; k++) {
          const u = k / n, i = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1)));
          const q = u * (pts.length - 1) - i;
          const px = lerp(pts[i][0], pts[i + 1][0], q), py = lerp(pts[i][1], pts[i + 1][1], q);
          const h = rk.ara(6, 15) * Math.sin(Math.PI * clamp(u * 0.9 + 0.05));
          darbe(c, [[px, py + 2], [px - 1.5, py + 2 + h * 0.5], [px - 2.5, py + 2 + h]], 1.05, { incelme: 0.5, sivri: 0.6, dalga: 0 });
        }
      }
      // ikincil sırtlar (mahmuzlar): ana sırtlardan aşağı inen, gölge yanı taranmış kaburgalar
      const mahmuz = (x0, y0, dx, dy, L, koyu, tohum) => {
        const rr = rng(tohum);
        const pts = [[x0, y0]];
        let x = x0, y = y0, ax = dx, ay = dy;
        for (let k = 1; k <= 9; k++) {
          ax += rr.ara(-0.08, 0.08); const l = Math.hypot(ax, ay); ax /= l; ay /= l;
          x += (ax * L) / 9; y += (ay * L) / 9;
          if (!noktaIcinde(sinirPts, x, y)) break;
          pts.push([x, y]);
        }
        if (pts.length < 3) return;
        // gölge şeridi sol-alt yanda
        const sag = pts.map(([px, py], k) => [px - (24 - k * 1.6), py + 6]);
        api.tara([{ pts: [...pts, ...sag.reverse()], kapali: true }], { ton: () => 0.7, renkler: koyu ? RS : R, yon: Math.atan2(ay, ax) + 0.35, aralik: 2.6, boy: [10, 26], kal: 1.1, alfa: koyu ? 0.5 : 0.42, esikler: [0.35, 0.6] });
        api.cizgi(pts, { renk: koyu ? '#3F4176' : '#4E5084', kal: 1.55, alfa: 0.6 });
        api.cizgi(pts.map(([px, py]) => [px + 4, py - 1]), { renk: '#F4EEF0', kal: 1.2, alfa: koyu ? 0.25 : 0.5 });
      };
      [[-900, 300], [-700, 380], [-480, 420], [-240, 380], [20, 340], [300, 300], [560, 260], [820, 220]].forEach(([y, L], i) => mahmuz(xAt(R1, y) - 6, y, -0.62, 0.78, L, false, 300 + i));
      [[-820, 360], [-500, 420], [-160, 440], [200, 420], [560, 360]].forEach(([y, L], i) => mahmuz(xAt(R2, y) - 6, y, -0.7, 0.71, L, true, 400 + i));
      [[-760, 200], [-420, 240], [-60, 260], [320, 240]].forEach(([y, L], i) => mahmuz(xAt(R1, y) + 10, y, 0.5, 0.86, L, false, 500 + i));
      // eteklerde döküntü taşlar (kalemle küçük kaya parçaları)
      const rt = rng(91);
      for (let i = 0; i < 70; i++) {
        const y = rt.ara(1080, 1310), x = rt.ara(-1700, 220);
        if (!noktaIcinde(sinirPts, x, y - 6)) continue;
        const w = rt.ara(6, 16), h = w * rt.ara(0.45, 0.7);
        const f = yuz(x, y);
        api.cizgi([[x - w, y], [x - w * 0.6, y - h], [x + w * 0.3, y - h * 1.1], [x + w, y - h * 0.2], [x + w * 0.8, y]], { renk: YUZ[f].renk, kal: 1.1, alfa: 0.5 });
      }
    },
  });
}
function karOge() {
  // doruğu örten, sırtlardan ve oluktan dil dil inen kar; sağ yanı ışıkta (sıcak), sol yanı gölgede (lila-mavi)
  const ust = [[-1004, -900], [-880, -1041], [-780, -1146], [-690, -1214], [-600, -1260], [-536, -1202], [-478, -1104], [-420, -986], [-370, -900]];
  const alt = [[-392, -872], [-420, -902], [-446, -856], [-470, -884], [-490, -800], [-502, -726], [-516, -792], [-532, -862], [-556, -830], [-580, -896], [-612, -866], [-640, -906], [-662, -836], [-684, -764], [-702, -830], [-724, -898], [-760, -866], [-800, -926], [-842, -888], [-880, -948], [-930, -898], [-972, -928]];
  const pts = [...ust, ...alt];
  const xs = (y) => -600 + 0.27 * (y + 1262); // ışık/gölge ayrımı (ana sırt)
  return oge({
    ad: 's10-kar2', olcek: 1, sekil: cokgen(pts), zemin: '#FBFAF6', arka: '#E6E3F2', arkaAlfa: 0.6, arkaTasma: false, arkaBulanik: 6,
    arkaCiz: (g, yol) => {
      const gr = g.createLinearGradient(-700, 0, -520, 0);
      gr.addColorStop(0, 'rgba(206,202,232,0.85)');
      gr.addColorStop(0.55, 'rgba(226,222,240,0.6)');
      gr.addColorStop(1, 'rgba(255,240,206,0.75)');
      g.fillStyle = gr;
      g.fill(yol);
    },
    tarama: [
      { ton: TON.gurultulu((x, y) => (x < xs(y) ? 0.62 + 0.2 * clamp((xs(y) - x) / 200) : 0), 0.06, 0.02, 4), renkler: [[0, '#D2CFE6'], [1, '#8C89B8']], yon: 2.2, aralik: 3, boy: [12, 30], kal: 1.1, alfa: 0.5, esikler: [0.3, 0.7] },
      { ton: (x, y) => (x >= xs(y) ? 0.4 : 0), renkler: [[0, '#F3DFAE'], [1, '#E4BF72']], yon: 1.0, aralik: 4.6, boy: [10, 24], kal: 1.0, alfa: 0.4, esikler: [0.3] },
    ],
    kontur: '#8D8BB4', konturKal: 1.8,
    detay: (c, api) => {
      // ışıklı yanın kenarında sıcak altın çizgi
      api.cizgi(ust.slice(4).map(([x, y]) => [x - 3, y + 3]), { renk: '#E0B25A', kal: 1.7, alfa: 0.8 });
      api.cizgi([[-600, -1258], [-582, -1180], [-560, -1090], [-542, -1000], [-524, -920]], { renk: '#9D9AC4', kal: 1.3, alfa: 0.6 });
      // gölgedeki karda rüzgâr sırtları
      for (const [x, y, L] of [[-700, -1120, 60], [-780, -1040, 70], [-660, -1010, 50], [-860, -970, 60]]) {
        api.cizgi([[x, y], [x + L * 0.5, y + 6], [x + L, y + 18]], { renk: '#9D9AC4', kal: 1.2, alfa: 0.55 });
      }
    },
  });
}
function kayaOge() {
  // dağın dibindeki büyük, yuvarlak kaya; adam sağ yüzüne yaslanır
  const sekil = cokgen([[-44, 1312], [-38, 1214], [-12, 1136], [34, 1076], [96, 1030], [170, 1008], [232, 1022], [278, 1064], [304, 1124], [316, 1196], [314, 1262], [308, 1312]]);
  return oge({
    ad: 's10-kaya3', olcek: 1.25, sekil, arka: '#C9C8DE', arkaAlfa: 0.9,
    tarama: [
      { ton: TON.gurultulu(TON.kure(220, 1070, 290, { lx: 0.75, ly: -0.55, ortam: 0.16, sert: 1.3 }), 0.12, 0.02, 5), renkler: [[0, '#E6E1EC'], [0.45, '#A9A8C8'], [1, '#62638F']], yon: -1.05, aralik: 3.0, boy: [14, 40], kal: 1.15, alfa: 0.55, esikler: [0.2, 0.45, 0.7], gecisAci: 0.35 },
      { sekil: svg('M-4 1146C24 1076 84 1028 162 1022C228 1018 274 1046 292 1092C244 1068 186 1064 124 1078C72 1090 32 1116 -4 1146Z'), ton: () => 0.5, renkler: [[0, '#B4DA9C'], [1, '#5A995E']], yon: -0.35, aralik: 2.7, boy: [6, 16], kal: 1.05, alfa: 0.62, esikler: [0.2, 0.5] },
    ],
    kontur: '#50518A', konturKal: 2.3,
    detay: (c, api) => {
      api.cizgi([[70, 1096], [98, 1146], [104, 1214], [90, 1300]], { renk: '#5A5B8A', kal: 1.5, alfa: 0.55 });
      api.cizgi([[206, 1052], [232, 1112], [246, 1180]], { renk: '#5A5B8A', kal: 1.3, alfa: 0.45 });
      api.cizgi([[150, 1240], [176, 1262], [200, 1300]], { renk: '#5A5B8A', kal: 1.2, alfa: 0.4 });
    },
  });
}
function tasOge(w, h, tohum) {
  const r = rng(tohum);
  const pts = [];
  for (let k = 0; k < 40; k++) {
    const a = Math.PI + (k / 39) * Math.PI;
    const rr = 1 + r.ara(-0.06, 0.06);
    pts.push([Math.cos(a) * w * 0.5 * rr, Math.sin(a) * h * rr]);
  }
  return oge({
    ad: `s10-tas-${w}-${h}-${tohum}`, olcek: 1.3, sekil: cokgen(pts), arka: '#CFCDE0', arkaAlfa: 0.85,
    tarama: { ton: TON.kure(w * 0.15, -h * 0.75, Math.max(w, h) * 0.75, { lx: 0.7, ly: -0.6 }), renkler: [[0, '#E3DFEA'], [0.5, '#A9A8C8'], [1, '#6A6B95']], yon: -1.0, aralik: 2.8, boy: [10, 26], kal: 1.1, alfa: 0.55, esikler: [0.25, 0.5, 0.75] },
    kontur: '#55568A', konturKal: 2.0,
  });
}

// ---------------------------------------------------------------- ağaç: çıplak dallar + rahmetle açan yaprak kümeleri
export function agacCiz2(g, x, y, yaprak, cicekA, t) {
  const A = D.agac, B = D.agacCiplak;
  ogeCiz(g, B.dallarOge, x, y);
  ogeCiz(g, B.govde, x, y);
  A.kumeler.forEach((k, i) => {
    const u = clamp((yaprak - k.t * 0.55) / 0.45);
    if (u <= 0) return;
    const sl = Math.sin(t * 1.1 + i) * 0.014;
    ogeCiz(g, k.oge, x + k.x, y + k.y - 30, { s: ease.outBack(u, 1.5) * 1.08, r: sl });
  });
  if (cicekA > 0) A.meyveler.forEach((m, i) => {
    const u = clamp((cicekA - (i % 5) * 0.08) / 0.5);
    if (u > 0) ogeCiz(g, D.meyve, x + m[0], y + m[1] - 30, { s: ease.outBack(u, 1.8), r: Math.sin(t + i) * 0.1 });
  });
}

// ---------------------------------------------------------------- zemin
function zeminOge(ad, P, catlak) {
  const r = rng(ad.length * 7);
  const x0 = -1520, x1 = 1520, alt = 2420;
  const ust = (x) => G - 4 + 5 * Math.sin(x * 0.006) + 3 * Math.sin(x * 0.017 + 1);
  const n = 120, pts = [];
  for (let k = 0; k <= n; k++) { const x = x0 + (k / n) * (x1 - x0); pts.push([x, ust(x)]); }
  pts.push([x1, alt], [x0, alt]);
  return oge({
    ad, olcek: 0.85, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85, arkaBulanik: 8,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.38 + 0.35 * clamp((y - G) / 900)), 0.2, 0.005, ad.length), renkler: P.tara, yon: catlak ? -0.04 : -0.1, aralik: 3.5, boy: catlak ? [40, 130] : [30, 90], kal: 1.2, alfa: 0.5, esikler: [0.22, 0.5, 0.78] },
    kontur: P.kontur, konturKal: 2.0, titreme: 0.5, konturAtla: [],
    detay: (c, api) => {
      if (catlak) {
        // kuru toprakta çatlaklar (ufka doğru basık)
        for (let i = 0; i < 60; i++) {
          const y = G + 20 + Math.pow(r(), 1.4) * 1000;
          const x = r.ara(-1450, 1450);
          const s = 0.4 + (y - G) / 900;
          const pts = [[x, y]];
          let a = r.ara(-0.4, 0.4), px = x, py = y;
          for (let k = 0; k < 4; k++) { a += r.ara(-0.7, 0.7); px += Math.cos(a) * 22 * s; py += Math.sin(a) * 6 * s; pts.push([px, py]); }
          api.cizgi(pts, { renk: '#8C7048', kal: 1.2, alfa: 0.45 });
        }
      }
    },
  });
}

function kuruOtOge(tohum) {
  const r = rng(tohum);
  const yollar = [];
  for (let i = 0; i < 7; i++) {
    const x = r.ara(-12, 12), h = r.ara(14, 28), e = r.ara(-12, 12);
    yollar.push(...svg(`M${x - 2} 0Q${x + e * 0.4} ${-h * 0.5} ${x + e} ${-h}Q${x + e * 0.4 + 1.2} ${-h * 0.5} ${x + 2} 0Z`));
  }
  return oge({
    ad: `s10-kuruot-${tohum}`, olcek: 1.6, sekil: yollar, arka: '#E3CC92', arkaAlfa: 0.8,
    tarama: { ton: TON.dogrusal(0, -26, 0, 0, 0.2, 0.8), renkler: [[0, '#E2C987'], [1, '#9C7A3E']], yon: -Math.PI / 2, aralik: 2.4, boy: [6, 14], kal: 1, alfa: 0.6, esikler: [0.3, 0.6] },
    kontur: '#8C6A34', konturKal: 1.2, pay: 6,
  });
}
function cimenOge(tohum, renk = 'yesil') {
  const r = rng(tohum);
  const yollar = [];
  const n = 5 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const x = r.ara(-10, 10), h = r.ara(18, 34), e = r.ara(-9, 9);
    yollar.push(...svg(`M${x - 2.5} 0Q${x + e * 0.4} ${-h * 0.5} ${x + e} ${-h}Q${x + e * 0.4 + 1.5} ${-h * 0.5} ${x + 2.5} 0Z`));
  }
  return oge({
    ad: `s10-cimen-${tohum}-${renk}`, olcek: 1.6, sekil: yollar, arka: '#B6DC9E', arkaAlfa: 0.8,
    tarama: { ton: TON.dogrusal(0, -30, 0, 0, 0.2, 0.8), renkler: [[0, '#A9D592'], [1, '#3E7C4F']], yon: -Math.PI / 2, aralik: 2.4, boy: [6, 16], kal: 1, alfa: 0.6, esikler: [0.3, 0.6] },
    kontur: '#3E7C4F', konturKal: 1.3, pay: 6,
  });
}

// ---------------------------------------------------------------- hazırlık
export const D = {};
export function uzakHazirla() {
  if (D.uzakHazir) return;
  D.uzakHazir = true;
  D.gok = gokTuvali({ w: 2100, h: 2650, olcek: 0.85, ad: 's10-gok', gunes: { x: NUR.x + 300, y: NUR.y + 450, r: 120 }, parilti: '#F4E2B0', arkaUst: '#B9D0EC', arkaAlt: '#E8DDEB', tohum: 31 });
  D.gokX = -300; D.gokY = -450;
  D.uzak = sirtOge({ ad: 's10-uzak', x0: -900, x1: 2500, ust: tumsek(1240, [[-300, 160, 260], [250, 70, 200], [700, 120, 260], [1150, 60, 200], [1650, 150, 280], [2150, 90, 230]]), alt: 1700, P: PAL.uzak, olcek: 0.8, tohum: 4 });
}
export function yakinHazirla() {
  if (D.yakinHazir) return;
  D.yakinHazir = true;
  D.ortaKuru = sirtOge({ ad: 's10-orta-kuru', x0: -800, x1: 2900, ust: tumsek(1290, [[500, 60, 260], [900, 95, 220], [1400, 50, 260], [1900, 80, 260], [2500, 60, 240]]), alt: 1800, P: PAL.ortaKuru, olcek: 0.8, tohum: 7 });
  D.ortaYesil = sirtOge({ ad: 's10-orta-yesil', x0: -800, x1: 2900, ust: tumsek(1290, [[500, 60, 260], [900, 95, 220], [1400, 50, 260], [1900, 80, 260], [2500, 60, 240]]), alt: 1800, P: PAL.ortaYesil, olcek: 0.8, tohum: 7 });
  D.dag = dagOge();
  D.kar = karOge();
  D.dagSis = sisSeridi('s10-dag-sis', { w: 2400, h: 300, renk: '#F7F5FC', cizgi: '#9C98C0', kume: 6, tohum: 71, yogun: 1.5, cizgiA: 0.24 });
  D.taslar = [
    { o: tasOge(170, 70, 3), x: -90, y: 1790, f: 1.15 },
    { o: tasOge(120, 52, 5), x: 1180, y: 1760, f: 1.15 },
    { o: tasOge(80, 34, 8), x: 1010, y: 1700, f: 1.15 },
    { o: tasOge(64, 26, 11), x: 900, y: 1430, f: 1 },
    { o: tasOge(54, 22, 13), x: -260, y: 1460, f: 1 },
  ];
  D.agacCiplak = M.agac({ boy: AGAC.boy * 0.94, tohum: 33, yaprakli: false, meyve: false, olcek: 1.25 });
  D.kaya = kayaOge();
  D.zKuru = zeminOge('s10-zemin-kuru', PAL.kuru, true);
  D.zYesil = zeminOge('s10-zemin-yesil', PAL.yesil, false);
  D.agac = M.agac({ boy: AGAC.boy, tohum: 33, yaprakli: true, meyve: true, olcek: 1.25 });
  D.meyve = M.cicekOge(13, 1.6, 'beyaz');
  D.bulutlar = [
    { o: M.bulutOge(560, 5, 1.0), x: 80, y: 300, gir: -1 },
    { o: M.bulutOge(620, 11, 1.0), x: 700, y: 210, gir: 1 },
    { o: M.bulutOge(440, 17, 1.0), x: 1150, y: 380, gir: 1 },
    { o: M.bulutOge(400, 23, 1.0), x: -330, y: 470, gir: -1 },
    { o: M.bulutOge(480, 29, 1.0), x: 420, y: 470, gir: -1 },
    { o: M.bulutOge(380, 35, 1.0), x: 980, y: 560, gir: 1 },
    { o: M.bulutOge(520, 41, 1.0), x: 260, y: 120, gir: -1 },
  ];
  // çimenler ve çiçekler (yeşerme maskesinin geldiği an açılır)
  const r = rng(303);
  D.lekeler = [];
  for (let i = 0; i < 26; i++) {
    D.lekeler.push({ x: r.ara(-1300, 1400), y: G + 30 + Math.pow(r(), 1.3) * 900, t0: r.ara(0, 1.15), R: r.ara(320, 560), sure: r.ara(0.8, 1.2) });
  }
  // ağacın dibinden ilk yeşerme; sonunda her yer yeşil
  D.lekeler.push({ x: AGAC.x, y: G + 40, t0: -0.05, R: 700, sure: 1.3 });
  D.lekeler.push({ x: 300, y: G + 300, t0: 1.0, R: 3400, sure: 1.3 });
  const cimenler = [0, 1, 2, 3].map((k) => cimenOge(50 + k));
  const cicekler = ['beyaz', 'pembe', 'sari', 'lila'].map((c) => M.cicekOge(18, 1.5, c));
  D.bitkiler = [];
  for (let i = 0; i < 70; i++) {
    const yu = r();
    const y = yu < 0.55 ? G + 6 + yu * 90 : G + 330 + (yu - 0.55) * 520;
    const x = r.ara(-1100, 1450);
    if (Math.abs(x - KAYA.x) < 170 && y < G + 40) continue;
    const cicek = r() < 0.35;
    D.bitkiler.push({ x, y, s: (0.55 + (y - G) / 500) * r.ara(0.8, 1.15), o: cicek ? r.sec(cicekler) : r.sec(cimenler), cicek, faz: r() * TAU });
  }
  D.bitkiler.sort((a, b) => a.y - b.y);
  const kuru = [0, 1, 2].map((k) => kuruOtOge(70 + k));
  D.kuruOt = [];
  for (let i = 0; i < 30; i++) {
    const yu = r();
    const y = yu < 0.6 ? G + 8 + yu * 70 : G + 360 + (yu - 0.6) * 500;
    D.kuruOt.push({ x: r.ara(-1000, 1450), y, s: (0.6 + (y - G) / 500) * r.ara(0.8, 1.2), o: r.sec(kuru) });
  }
  D.kuruOt.sort((a, b) => a.y - b.y);
}

/** Yeşerme lekesinin (x, y) noktasına varış zamanı (göreli) */
export function yesilVaris(x, y) {
  let m = Infinity;
  for (const l of D.lekeler) {
    const d = Math.hypot(x - l.x, (y - l.y) / 0.45);
    if (d > l.R) continue;
    const u = 1 - Math.cbrt(1 - d / l.R); // outCubic tersi
    m = Math.min(m, l.t0 + u * l.sure);
  }
  return m;
}

/** Yeşerme maskesini (ekran) tampona çizer: tg zaman (yeşermenin başından beri) */
export function yesilMaske(g, cam, tg) {
  g.save();
  kameraUygula(g, cam, 1);
  for (const l of D.lekeler) {
    const u = clamp((tg - l.t0) / l.sure);
    if (u <= 0) continue;
    const R = l.R * ease.outCubic(u);
    g.save();
    g.translate(l.x, l.y);
    g.scale(1, 0.45);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
    gr.addColorStop(0, 'rgba(0,0,0,1)');
    gr.addColorStop(0.72, 'rgba(0,0,0,0.92)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(-R, -R, 2 * R, 2 * R);
    g.restore();
  }
  g.restore();
}

/**
 * Işıklı rahmet yağmuru (ekran uzayında). Damlalar derinliğe dağılır: uzaktakiler küçük, yavaş, soluk ve ufka;
 * yakındakiler iri, hızlı ve ekranın altına düşer. Her damla: uçları incelen saten bir iz + yumuşak parıltı + ışıklı
 * inci uç (bazıları bir an ışıldar). Düştüğü yerde küçük bir ışık halkası açılır, iki zerre sıçrar.
 * siper: yağmursuz bölge (ağacın tacı, ekran elipsi); yalnız ağaç derinliğindeki damlalara uygulanır.
 */
export function yagmurCiz(ctx, t, guc, { zeminY = 1380, siper = null, tohum = 9, z = 1 } = {}) {
  if (guc <= 0.003) return;
  const r = rng(tohum);
  const N = 200, n = Math.round(N * guc);
  const egim = 0.13, tepe = -160, OMUR = 0.5;
  const zk = Math.sqrt(clamp(z, 0.4, 1.4));
  const altyazi = (x, y) => (y > 1390 && y < 1640 && x > 150 && x < 930 ? 0.55 : 1);
  const altinda = (x, y) => {
    if (!siper) return false;
    const dx = (x - siper.x) / Math.max(1, siper.rx);
    return Math.abs(dx) < 1 && y > siper.y - siper.ry * Math.sqrt(1 - dx * dx);
  };
  const damlalar = [], halkalar = [];
  for (let i = 0; i < N; i++) {
    const d = Math.pow(r(), 1.5);
    const x0 = r.ara(-260, W + 60), faz = r(), hk = r.ara(0.9, 1.1), sicak = r() < 0.55, aK = r.ara(0.7, 1), par = r();
    if (i >= n) continue;
    const inis = lerp(zeminY + 6, H + 40, d);
    const hiz = lerp(1150, 2250, d) * hk;
    const yol = inis - tepe;
    const p = (faz * yol + t * hiz) % yol;
    const y = tepe + p, x = x0 + y * egim;
    const a = aK * guc * lerp(0.5, 1, d);
    const siperli = d < 0.5; // ağaç derinliğine yakın damlalar tacın altına girmez
    // bir önceki damlanın düştüğü yer (halka)
    const tau = p / hiz;
    const lx = x0 + inis * egim;
    if (tau < OMUR && !(siperli && altinda(lx, inis - 4))) halkalar.push({ x: lx, y: inis, u: tau / OMUR, d, a: aK * guc });
    if (siperli && altinda(x, y)) continue;
    damlalar.push({ x, y, d, a, sicak, par, i });
  }
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // yere düşen ışık halkacıkları (önce: damlalar önlerinden geçer)
  for (const h of halkalar) {
    const R = (3 + lerp(8, 32, h.d) * ease.outCubic(h.u)) * zk;
    const a = Math.pow(1 - h.u, 1.4) * h.a * lerp(0.55, 1, h.d) * altyazi(h.x, h.y);
    if (a < 0.01) continue;
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(1, 0.3);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 1.7);
    gr.addColorStop(0, rgba('#FFE7AE', 0.32 * a));
    gr.addColorStop(0.6, rgba('#FFE7AE', 0.14 * a));
    gr.addColorStop(1, 'rgba(255,231,174,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(-R * 1.7, -R * 1.7, R * 3.4, R * 3.4);
    ctx.restore();
    // halkanın ön yayı koyu kalemle (açık zeminde seçilsin), arka yayı ve içi ışıkla
    const lw = lerp(1.1, 1.9, h.d);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = rgba('#8E7046', 0.5 * a);
    ctx.lineWidth = lw;
    ctx.beginPath(); ctx.ellipse(h.x, h.y + 0.8, R, R * 0.3, 0, 0.15, Math.PI - 0.15); ctx.stroke();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = rgba('#FFF8E2', 0.9 * a);
    ctx.lineWidth = lw * 0.8;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - 0.6, R * 0.97, R * 0.28, 0, 0, TAU); ctx.stroke();
    if (h.d > 0.35 && h.u > 0.15) {
      ctx.strokeStyle = rgba('#FFF4D8', 0.55 * a);
      ctx.beginPath(); ctx.ellipse(h.x, h.y, R * 0.55, R * 0.165, 0, 0, TAU); ctx.stroke();
    }
    if (h.u < 0.6) {
      const v = h.u / 0.6, yuk = Math.sin(v * Math.PI) * lerp(4, 15, h.d) * zk;
      ctx.fillStyle = rgba('#FFFBEA', 0.9 * a);
      for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(h.x + sx * R * 0.55, h.y - yuk, lerp(0.9, 1.9, h.d), 0, TAU); ctx.fill(); }
    }
  }
  // damlalar
  ctx.lineCap = 'round';
  for (const k of damlalar) {
    const boy = lerp(22, 74, k.d) * zk, kal = lerp(1.0, 2.3, k.d) * zk;
    const ya = Math.max(tepe, k.y - boy), xa = k.x - (k.y - ya) * egim;
    const a = k.a * altyazi(k.x, k.y);
    ctx.strokeStyle = rgba(k.sicak ? '#FFD98A' : '#D8E6FF', 0.17 * a);
    ctx.lineWidth = kal * 5.5;
    ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(k.x, k.y); ctx.stroke();
    cizgiDarbe(ctx, xa, ya, k.x, k.y, kal, k.sicak ? '#FFEBB8' : '#F1F6FF', 0.72 * a);
    const R = kal * 2.3;
    const gr = ctx.createRadialGradient(k.x, k.y, 0, k.x, k.y, R * 2.2);
    gr.addColorStop(0, rgba('#FFFDF4', 0.95 * a));
    gr.addColorStop(0.3, rgba(k.sicak ? '#FFE2A0' : '#E6EEFF', 0.45 * a));
    gr.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(k.x - R * 2.2, k.y - R * 2.2, R * 4.4, R * 4.4);
    if (k.par < 0.14) {
      // bir an ışıldayan damla: ince dört kollu yıldızcık
      const tw = Math.max(0, Math.sin(t * 13 + k.i * 3.1));
      if (tw > 0.25) {
        const L = R * 3.2 * tw;
        ctx.strokeStyle = rgba('#FFF6DA', 0.75 * a * tw);
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(k.x - L, k.y); ctx.lineTo(k.x + L, k.y);
        ctx.moveTo(k.x, k.y - L); ctx.lineTo(k.x, k.y + L);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- çizim
import { insanYanSikis, yerGolgesi } from './s10-yardim.mjs';

/** Dağın belinde yavaşça sürüklenen sis kuşağı (sağ ucu gökte yumuşakça biter); kudret anında sıcak ışık alır */
function dagSisi(g, cam, t, S) {
  const [xl] = ekranda(cam, -1900, 0, F.ana), [xr] = ekranda(cam, 320, 0, F.ana);
  if (xr < 0 || xl > W) return;
  const [, yu] = ekranda(cam, 0, -480, F.ana), [, ya] = ekranda(cam, 0, 600, F.ana);
  if (ya < 0 || yu > H) return;
  const K = tampon('s10-dag-sis');
  const k = K.getContext('2d');
  k.save(); kameraUygula(k, cam, F.ana);
  sisCiz(k, D.dagSis, -300, t, { hiz: 18, olcek: 1.3, alfa: 1, xa: -2000, xb: 700 });
  sisCiz(k, D.dagSis, 430, t, { hiz: -12, olcek: 1.0, alfa: 0.6, xa: -2000, xb: 700, kay: 900 });
  k.restore();
  const [xa] = ekranda(cam, -180, 0, F.ana), [xb] = ekranda(cam, 300, 0, F.ana);
  k.globalCompositeOperation = 'destination-in';
  const gr = k.createLinearGradient(xa, 0, Math.max(xa + 1, xb), 0);
  gr.addColorStop(0, 'rgba(0,0,0,1)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  k.fillStyle = gr;
  k.fillRect(0, 0, W, H);
  const isik = S.dagIsik || 0;
  if (isik > 0.003) {
    // sisin üstü altın ışıkla yıkanır
    k.globalCompositeOperation = 'source-atop';
    k.fillStyle = `rgba(255,226,160,${0.35 * isik})`;
    k.fillRect(0, 0, W, H);
  }
  k.globalCompositeOperation = 'source-over';
  g.drawImage(K, 0, 0);
}

/** Yan dünyayı çizer (kamera g'ye uygulanır). S: durum */
export function yanCiz(g, cam, t, S) {
  uzakHazirla();
  const yakin = S.yakin !== false;
  if (yakin) yakinHazirla();
  // gök
  g.save(); kameraUygula(g, cam, F.gok); ogeCiz(g, D.gok, D.gokX, D.gokY); g.restore();
  if (S.gokKoyu > 0.003) {
    g.save();
    g.globalCompositeOperation = 'multiply';
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgba(150,158,196,${0.55 * S.gokKoyu})`);
    gr.addColorStop(0.6, `rgba(190,190,214,${0.35 * S.gokKoyu})`);
    gr.addColorStop(1, `rgba(214,210,226,${0.15 * S.gokKoyu})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  // uzak sırt
  g.save(); kameraUygula(g, cam, F.uzak); ogeCiz(g, D.uzak, 0, 0); g.restore();
  if (!yakin) return;
  // rahmet bulutları
  if (S.bulut > 0.003) {
    g.save(); kameraUygula(g, cam, F.bulut);
    D.bulutlar.forEach((b, i) => {
      const u = clamp(S.bulut * 1.25 - i * 0.08);
      const e = ease.outCubic(u);
      ogeCiz(g, b.o, b.x + b.gir * (1 - e) * 700 + Math.sin(t * 0.4 + i) * 6, b.y, { alfa: e });
    });
    g.restore();
  }
  // orta sırtlar
  g.save(); kameraUygula(g, cam, F.orta);
  ogeCiz(g, D.ortaKuru, 0, 0);
  if (S.ortaYesil > 0.003) ogeCiz(g, D.ortaYesil, 0, 0, { alfa: S.ortaYesil });
  g.restore();
  // ana katman
  g.save(); kameraUygula(g, cam, F.ana);
  ogeCiz(g, D.dag, 0, 0);
  ogeCiz(g, D.kar, 0, 0);
  if (S.dagIsik > 0.003) {
    M.hale(g, -600, -1200, 560, '#FFE7A8', 0.5 * S.dagIsik);
    M.isinlar(g, -600, -1240, 120, 700, t, { sayi: 24, alfa: 0.35 * S.dagIsik, kal: 3.2, tohum: 13, hiz: 0.03 });
  }
  g.restore();
  dagSisi(g, cam, t, S);
  g.save(); kameraUygula(g, cam, F.ana);
  // doruğun yamacında süzülen birkaç kuş: dağın büyüklüğü ölçeklenir
  for (let i = 0; i < 3; i++) {
    const a = t * 0.32 + i * 2.1;
    const bx = -400 + Math.cos(a) * 170 + i * 70, by = -600 + Math.sin(a) * 44 + i * 56;
    M.kus(g, bx, by, 1.1 + i * 0.12, t * 0.45 + i, { faz: i * 1.3, yon: Math.sin(a) > 0 ? -1 : 1, renk: '#565B84', alfa: 0.85 });
  }
  ogeCiz(g, D.zKuru, 0, 0);
  for (const k of D.kuruOt) ogeCiz(g, k.o, k.x, k.y, { s: k.s, r: Math.sin(t * 1.3 + k.x) * 0.04 });
  g.restore();
  if (S.yesil > 2.3) {
    g.save(); kameraUygula(g, cam, F.ana); ogeCiz(g, D.zYesil, 0, 0); g.restore();
  } else if (S.yesil > 0) {
    const tb = tampon('s10-yesil');
    const tg = tb.getContext('2d');
    tg.save(); kameraUygula(tg, cam, F.ana); ogeCiz(tg, D.zYesil, 0, 0); tg.restore();
    const mk = tampon('s10-yesil-m');
    yesilMaske(mk.getContext('2d'), cam, S.yesil);
    tg.globalCompositeOperation = 'destination-in';
    tg.drawImage(mk, 0, 0);
    g.drawImage(tb, 0, 0);
  }
  g.save(); kameraUygula(g, cam, F.ana);
  // ağaç (adamın arkasında)
  if (S.sayvan > 0.003) M.hale(g, AGAC.x + 20, AGAC.y - 330, 520, '#FFF2C6', 0.4 * S.sayvan);
  agacCiz2(g, AGAC.x, AGAC.y, S.yaprak, S.cicek ?? 0, t);
  ogeCiz(g, D.kaya, D.kayaDx || 0, 0);
  for (const ts of D.taslar) if (ts.f === 1) ogeCiz(g, ts.o, ts.x, ts.y);
  // bitkiler: arkadakiler
  const bitki = (on) => {
    if (S.yesil <= 0) return;
    for (const b of D.bitkiler) {
      if ((b.y > G + 22) !== on) continue;
      if (b.tv === undefined) b.tv = yesilVaris(b.x, b.y);
      const u = pop(S.yesil, b.tv + 0.12, 0.5);
      if (u <= 0) continue;
      ogeCiz(g, b.o, b.x, b.y, { s: u * b.s, r: Math.sin(t * 1.6 + b.faz) * 0.05 });
    }
  };
  bitki(false);
  if (S.adam) {
    const a = S.adam;
    if (S.adamIsik > 0.003) M.hale(g, a.x, G - 150, 260, '#FFF0C0', 0.35 * S.adamIsik);
    yerGolgesi(g, a.x + 8, G + 2, 70);
    insanYanSikis(g, a.x, G, a.poz, { s: a.s, yon: a.yon, k: a.k ?? 1, olcek: 1.2 });
  }
  bitki(true);
  g.restore();
  // ön plan taşları
  g.save(); kameraUygula(g, cam, F.on);
  for (const ts of D.taslar) if (ts.f !== 1) ogeCiz(g, ts.o, ts.x, ts.y);
  g.restore();
}
