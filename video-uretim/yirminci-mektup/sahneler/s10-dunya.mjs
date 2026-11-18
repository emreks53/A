// s10 yan görünüş dünyası (rahmet ve kudret bölümü): gök, uzak sırtlar, heybetli dağ ve dibindeki kaya, koruyucu
// ağaç, kuru → yeşeren toprak, çimen ve çiçekler, rahmet bulutları ve ışıklı yağmur.
import { tuval, W, H, clamp, lerp, ease, an, rng, TAU, rgba, smooth, pop } from '../motor/temel.mjs';
import { oge, ogeCiz, gokTuvali, konturCiz, TON, PALET } from '../motor/kalem.mjs';
import { svg, elips, cokgen, yumusat } from '../motor/sekil.mjs';
import { kameraUygula, ekranda } from '../motor/sahne.mjs';
import * as M from '../motor/motifler.mjs';
import { tampon, cizgiDarbe } from './s10-yardim.mjs';

export const G = 1300; // zemin çizgisi (paralaks 1)
export const AGAC = { x: 520, y: G + 4, boy: 820 };
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
function dagSekli() {
  const ana = [
    [-1500, 1320], [-1500, 260], [-1330, 40], [-1180, -250], [-1050, -380], [-930, -610], [-800, -760], [-700, -950],
    [-610, -1060], [-520, -1190], [-455, -1250], [-400, -1215], [-350, -1150], [-290, -1090], [-250, -980], [-180, -900],
    [-140, -760], [-80, -640], [-40, -500], [10, -420], [40, -250], [70, -130], [110, 40], [135, 240], [150, 420],
    [185, 560], [205, 720], [196, 820], [214, 940], [222, 1080], [232, 1200], [238, 1320],
  ];
  // hafif kalem pürüzü
  const r = rng(41);
  const p = [];
  for (let i = 0; i < ana.length; i++) {
    const a = ana[i], b = ana[(i + 1) % ana.length];
    p.push(a);
    if (i < ana.length - 1 && i > 0) {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const n = Math.floor(L / 45);
      for (let k = 1; k < n; k++) {
        const u = k / n;
        p.push([lerp(a[0], b[0], u) + r.ara(-7, 7), lerp(a[1], b[1], u) + r.ara(-7, 7)]);
      }
    }
  }
  return cokgen(p);
}
function dagOge() {
  const sekil = dagSekli();
  // ışık sağ üstten: sağa bakan yüzler aydınlık (sıcak), sol yüzler gölgede (mavi-mor)
  const tepeX = -455, tepeY = -1250;
  const ton = (x, y) => {
    const sirtX = lerp(tepeX, 150, clamp((y - tepeY) / 2400));
    const d = (x - sirtX) / 520; // sırtın sağı aydınlık
    let v = 0.55 - 0.32 * Math.tanh(d * 1.4);
    v += 0.18 * clamp((y - 400) / 900); // eteklere doğru koyulaşır
    v -= 0.22 * clamp(1 - (y - tepeY) / 700); // zirve parlak
    return clamp(v);
  };
  return oge({
    ad: 's10-dag', olcek: 0.95, sekil, arka: '#C9CBE2', arkaAlfa: 0.9, arkaBulanik: 10,
    arkaCiz: (g, yol) => {
      // arka yüz: gövde mavi-lila, zirveye doğru sıcak krem (ışığın yakaladığı)
      const gr = g.createLinearGradient(0, tepeY, 0, 1320);
      gr.addColorStop(0, 'rgba(250,236,200,0.95)');
      gr.addColorStop(0.18, 'rgba(226,218,232,0.9)');
      gr.addColorStop(0.55, 'rgba(196,198,226,0.9)');
      gr.addColorStop(1, 'rgba(178,178,206,0.9)');
      g.fillStyle = gr;
      g.fill(yol);
      g.strokeStyle = 'rgba(190,190,218,0.9)';
      g.lineWidth = 24;
      g.stroke(yol);
    },
    tarama: [
      { ton: TON.gurultulu(ton, 0.12, 0.005, 3), renkler: [[0, '#E9DFD6'], [0.35, '#B8B6D6'], [0.7, '#8483B4'], [1, '#56578A']], yonF: (x, y) => (x > lerp(tepeX, 150, clamp((y - tepeY) / 2400)) ? 1.05 : 2.05) + 0.08 * Math.sin(y * 0.004), aralik: 3.3, boy: [26, 80], kal: 1.2, alfa: 0.55, esikler: [0.22, 0.48, 0.72], gecisAci: 0.18 },
    ],
    kontur: '#4F5080', konturKal: 2.4, titreme: 0.7,
    detay: (c, api) => {
      // kaya sırtları ve katmanlar
      const r = rng(9);
      const sirtlar = [
        [[-455, -1240], [-470, -1080], [-520, -900], [-560, -700], [-640, -520], [-700, -300]],
        [[-400, -1210], [-380, -1020], [-330, -860], [-300, -650], [-250, -420], [-200, -180], [-160, 60]],
        [[-180, -890], [-170, -700], [-150, -520], [-110, -300]],
        [[-700, -940], [-760, -700], [-860, -480], [-950, -250]],
        [[40, -240], [60, -60], [80, 140], [100, 330]],
      ];
      for (const s of sirtlar) api.cizgi(yumusat(s, 2, false), { renk: '#5A5B8A', kal: 1.6, alfa: 0.55 });
      // yatay katman çizgileri (kısa, kırık)
      for (let i = 0; i < 46; i++) {
        const y = r.ara(-950, 1200);
        const sirtX = lerp(tepeX, 150, clamp((y - tepeY) / 2400));
        const x = r.ara(Math.max(-1400, sirtX - 900 * clamp((y + 1300) / 1600)), Math.min(200, sirtX + 160));
        const L = r.ara(30, 90);
        api.cizgi([[x, y], [x + L * 0.5, y + r.ara(-4, 6)], [x + L, y + r.ara(-2, 10)]], { renk: '#5E5F8E', kal: 1.2, alfa: 0.4 });
      }
    },
  });
}
function kayaOge() {
  // dağın dibindeki büyük, yuvarlak kaya (yaslanılacak sağ yüz x ≈ 300)
  const sekil = svg('M-40 1310C-46 1230 -30 1150 10 1090C46 1036 106 1004 170 1008C232 1012 280 1044 300 1104C318 1160 316 1240 306 1310Z');
  return oge({
    ad: 's10-kaya', olcek: 1.25, sekil, arka: '#C3C3DC', arkaAlfa: 0.9,
    tarama: [
      { ton: TON.gurultulu(TON.kure(210, 1080, 260, { lx: 0.7, ly: -0.6, ortam: 0.18 }), 0.1, 0.02, 5), renkler: [[0, '#DCD8E8'], [0.5, '#9C9BC2'], [1, '#5E5F8C']], yonF: (x, y) => Math.atan2(y - 1180, x - 130) + Math.PI / 2, aralik: 2.9, boy: [16, 44], kal: 1.15, alfa: 0.55, esikler: [0.2, 0.45, 0.72] },
      // üstte yosun
      { sekil: svg('M-6 1150C20 1080 80 1030 160 1024C226 1020 270 1046 290 1090C240 1066 180 1060 120 1074C70 1086 30 1114 -6 1150Z'), ton: () => 0.5, renkler: [[0, '#A9D592'], [1, '#5A995E']], yon: -0.4, aralik: 2.8, boy: [8, 20], kal: 1.1, alfa: 0.6, esikler: [0.2, 0.5] },
    ],
    kontur: '#4F5080', konturKal: 2.3,
    detay: (c, api) => {
      api.cizgi([[60, 1100], [92, 1150], [100, 1220], [86, 1290]], { renk: '#5A5B8A', kal: 1.5, alfa: 0.55 });
      api.cizgi([[200, 1060], [226, 1120], [240, 1200]], { renk: '#5A5B8A', kal: 1.3, alfa: 0.45 });
    },
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
    ad, olcek: 1, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85, arkaBulanik: 8,
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
export function dunyaHazirla() {
  D.gok = gokTuvali({ w: 2100, h: 2650, olcek: 0.95, ad: 's10-gok', gunes: { x: NUR.x + 300, y: NUR.y + 450, r: 120 }, parilti: '#F4E2B0', arkaUst: '#B9D0EC', arkaAlt: '#E8DDEB', tohum: 31 });
  D.gokX = -300; D.gokY = -450;
  D.uzak = sirtOge({ ad: 's10-uzak', x0: -900, x1: 2500, ust: tumsek(1240, [[-300, 160, 260], [250, 70, 200], [700, 120, 260], [1150, 60, 200], [1650, 150, 280], [2150, 90, 230]]), alt: 1700, P: PAL.uzak, olcek: 0.9, tohum: 4 });
  D.ortaKuru = sirtOge({ ad: 's10-orta-kuru', x0: -800, x1: 2900, ust: tumsek(1290, [[500, 60, 260], [900, 95, 220], [1400, 50, 260], [1900, 80, 260], [2500, 60, 240]]), alt: 1800, P: PAL.ortaKuru, olcek: 0.95, tohum: 7 });
  D.ortaYesil = sirtOge({ ad: 's10-orta-yesil', x0: -800, x1: 2900, ust: tumsek(1290, [[500, 60, 260], [900, 95, 220], [1400, 50, 260], [1900, 80, 260], [2500, 60, 240]]), alt: 1800, P: PAL.ortaYesil, olcek: 0.95, tohum: 7 });
  D.dag = dagOge();
  D.kaya = kayaOge();
  D.zKuru = zeminOge('s10-zemin-kuru', PAL.kuru, true);
  D.zYesil = zeminOge('s10-zemin-yesil', PAL.yesil, false);
  D.agac = M.agac({ boy: AGAC.boy, tohum: 33, yaprakli: true, meyve: true, olcek: 1.25 });
  D.meyve = M.cicekOge(13, 1.6, 'beyaz');
  D.bulutlar = [
    { o: M.bulutOge(420, 5, 1.0), x: 120, y: 330, gir: -1 },
    { o: M.bulutOge(520, 11, 1.0), x: 640, y: 230, gir: 1 },
    { o: M.bulutOge(360, 17, 1.0), x: 1060, y: 420, gir: 1 },
    { o: M.bulutOge(300, 23, 1.0), x: -260, y: 520, gir: -1 },
  ];
  // çimenler ve çiçekler (yeşerme maskesinin geldiği an açılır)
  const r = rng(303);
  D.lekeler = [];
  for (let i = 0; i < 26; i++) {
    D.lekeler.push({ x: r.ara(-1300, 1400), y: G + 30 + Math.pow(r(), 1.3) * 900, t0: r.ara(0, 1.15), R: r.ara(320, 560), sure: r.ara(0.8, 1.2) });
  }
  // ağacın dibinden ilk yeşerme
  D.lekeler.push({ x: AGAC.x, y: G + 40, t0: -0.05, R: 700, sure: 1.3 });
  const cimenler = [0, 1, 2, 3].map((k) => cimenOge(50 + k));
  const cicekler = ['beyaz', 'pembe', 'sari', 'lila'].map((c) => M.cicekOge(18, 1.5, c));
  D.bitkiler = [];
  for (let i = 0; i < 70; i++) {
    const y = G + 6 + Math.pow(r(), 1.6) * 520;
    const x = r.ara(-1100, 1450);
    if (Math.abs(x - KAYA.x) < 170 && y < G + 40) continue;
    const cicek = r() < 0.35;
    D.bitkiler.push({ x, y, s: (0.55 + (y - G) / 500) * r.ara(0.8, 1.15), o: cicek ? r.sec(cicekler) : r.sec(cimenler), cicek, faz: r() * TAU });
  }
  D.bitkiler.sort((a, b) => a.y - b.y);
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

/** Işıklı rahmet yağmuru (ekran uzayında). guc 0..1; siper: yağmursuz bölge (ekran elipsi) */
export function yagmurCiz(ctx, t, guc, { zeminY = 1380, siper = null, tohum = 9 } = {}) {
  if (guc <= 0.003) return;
  const r = rng(tohum);
  const n = Math.round(170 * guc);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const egim = 0.16;
  for (let i = 0; i < 200; i++) {
    const x0 = r.ara(-200, W + 100), faz = r(), hiz = r.ara(1500, 2100), boy = r.ara(34, 64), renk = r() < 0.4 ? '#FFF0C4' : '#EEF5FF';
    const k = r.ara(1.3, 2.1), a = r.ara(0.45, 0.85);
    if (i >= n) continue;
    const yol = zeminY + 160;
    const y = ((faz * yol + t * hiz) % yol) - 120;
    const x = x0 + y * egim;
    if (y > zeminY) continue;
    if (siper) {
      const dx = (x - siper.x) / siper.rx;
      if (Math.abs(dx) < 1 && y > siper.y - siper.ry * Math.sqrt(1 - dx * dx)) continue;
    }
    const y1 = Math.min(y + boy, zeminY);
    cizgiDarbe(ctx, x, y, x + (y1 - y) * egim, y1, k, renk, a * guc);
  }
  // sıçrayan damlacıklar (zeminde küçük ışıklı halkalar)
  const r2 = rng(tohum + 1);
  for (let i = 0; i < Math.round(26 * guc); i++) {
    const x = r2.ara(0, W), per = r2.ara(0.35, 0.6), f = r2();
    const u = ((t / per + f) % 1);
    if (siper && Math.abs(x - siper.x) < siper.rx * 0.9) continue;
    const y = zeminY - 6 + r2.ara(-14, 30);
    const R = 3 + u * 14;
    ctx.strokeStyle = `rgba(255,248,226,${0.6 * (1 - u) * guc})`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(x, y, R, R * 0.32, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- çizim
import { insanYanSikis } from './s10-yardim.mjs';

/** Yan dünyayı çizer (kamera g'ye uygulanır). S: durum */
export function yanCiz(g, cam, t, S) {
  // gök
  g.save(); kameraUygula(g, cam, F.gok); ogeCiz(g, D.gok, D.gokX, D.gokY); g.restore();
  // uzak sırt
  g.save(); kameraUygula(g, cam, F.uzak); ogeCiz(g, D.uzak, 0, 0); g.restore();
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
  if (S.dagIsik > 0.003) {
    M.hale(g, -455, -1180, 520, '#FFE7A8', 0.5 * S.dagIsik);
    M.isinlar(g, -455, -1220, 120, 700, t, { sayi: 24, alfa: 0.35 * S.dagIsik, kal: 3.2, tohum: 13, hiz: 0.03 });
  }
  ogeCiz(g, D.zKuru, 0, 0);
  g.restore();
  if (S.yesil > 0) {
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
  M.agacCiz(g, D.agac, AGAC.x, AGAC.y, { buyume: 1, yaprak: S.yaprak, meyveA: S.cicek ?? 0, t, meyveOge: D.meyve, salinim: 1.4 });
  ogeCiz(g, D.kaya, 0, 0);
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
    insanYanSikis(g, a.x, G, a.poz, { s: a.s, yon: a.yon, k: a.k ?? 1, olcek: 1.2 });
  }
  bitki(true);
  g.restore();
}
