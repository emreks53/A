// s03 yardımcıları: sabit çözünürlüklü dolgu ile ölçeklenebilen marifet deseni (merkezi aralanabilir), cin alevleri,
// özel renkli tepeler, altın taç yaprakları ve ışık zeminleri. Motor dosyalarına dokunmadan, onların üstüne kurulur.
import { tuval, rng, clamp, lerp, ease, TAU, rgba, smooth, W, H } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, tara, TON, PALET, FILM } from '../motor/kalem.mjs';
import { svg, elips, cokgen, yildiz } from '../motor/sekil.mjs';
import * as M from '../motor/motifler.mjs';

// ---------------------------------------------------------------- tepe (özel paletli, sırt profili fonksiyonla)
const TEPE_PALET = {
  dag: { arka: '#D3D2EA', tara: [[0, '#D2D0EA'], [0.6, '#B2B1D8'], [1, '#9191C0']], kontur: '#9A98C6' },
  uzak: { arka: '#C9DDCF', tara: [[0, '#C4DACB'], [0.6, '#9EBFAE'], [1, '#7FA696']], kontur: '#86AB9A' },
  acik: { arka: '#C9E4B6', tara: [[0, '#BCDDAA'], [0.6, '#93C690'], [1, '#6FA873']], kontur: '#7FB37F' },
  yesil: { arka: '#B9DCA2', tara: [[0, PALET.yesilAcik], [0.6, PALET.yesilOrta], [1, PALET.yesil]], kontur: PALET.yesilOrta },
  koyu: { arka: '#9CC79A', tara: [[0, PALET.yesilOrta], [1, PALET.yesilKoyu]], kontur: PALET.yesil },
};
/**
 * Tepe öğesi. sirt(x): dünya x'inde sırtın dünya y'si. Sprite (X0, Ymin) noktasına yerleşir; alt kenar Yalt.
 * Döner: { oge, ust(x), X0, Y0 } (ust = sirt; çizim: ogeCiz(ctx, oge, X0, Y0)).
 */
export function tepe({ w, ad, renk = 'yesil', olcek = 1, X0 = 0, Yalt = 2300, sirt, tohum = 1, aralik = 3.4 }) {
  const n = 80;
  const xs = Array.from({ length: n + 1 }, (_, k) => X0 + (k / n) * w);
  const ys = xs.map(sirt);
  const Y0 = Math.min(...ys);
  const pts = xs.map((x, k) => [x - X0, ys[k] - Y0]);
  const h = Yalt - Y0;
  pts.push([w, h], [0, h]);
  const P = TEPE_PALET[renk];
  const o = oge({
    ad, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85, arkaTasma: true,
    tarama: { ton: TON.gurultulu((x, y) => clamp(0.32 + 0.5 * clamp(y / 700)), 0.18, 0.006, tohum), renkler: P.tara, yon: -0.05, aralik, boy: [40, 120], esikler: [0.25, 0.55, 0.8], alfa: 0.5 },
    kontur: P.kontur, konturKal: 2.0, titreme: 0.6, konturAtla: [],
  });
  return { oge: o, ust: sirt, X0, Y0 };
}
/** Yumuşak tümsekler toplamı: taban - Σ yükseklik·çan(x) */
export const tumsekler = (taban, liste) => (x) => taban - liste.reduce((s, [cx, yuk, gen]) => s + yuk * Math.exp(-Math.pow((x - cx) / gen, 2)), 0);

// ---------------------------------------------------------------- marifet deseni (ölçeklenebilir, merkezi aralanır)
let dolguK = null, dolguB = null;
const RK = 165, RB = 400;
export function desenHazirla() {
  dolguK = M.marifetDolgu(RK, 1.25);
  dolguB = M.marifetDolgu(RB, 1.25);
}
/**
 * Marifet desenini (x, y) merkezinde, ekranda R yarıçapında çizer. Çizgiler her karede R'ye göre çizilir (keskin),
 * dolgu iki sabit çözünürlüklü sprite'tan ölçeklenir. acilma 0..1: iç rozet aralanır, merkezde ışık açıklığı.
 * merkezIsik: merkez noktasının parıltısı.
 */
export function desenCiz(ctx, x, y, R, t, { r = 0, alfa = 1, dolgu = 1, acilma = 0, merkezIsik = 0, renk = '#2F6F67', altin = M.ALTIN_KOYU } = {}) {
  if (alfa <= 0.002 || R < 2) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(r);
  ctx.globalAlpha *= alfa;
  if (dolgu > 0) {
    const b = smooth(195, 255, R);
    if (b < 1) ogeCiz(ctx, dolguK, 0, 0, { s: R / RK, alfa: dolgu });
    if (b > 0) ogeCiz(ctx, dolguB, 0, 0, { s: R / RB, alfa: dolgu * (b < 1 ? b : 1) });
  }
  // ışık açıklığı (merkez aralanınca)
  const ac = clamp(acilma);
  if (ac > 0) {
    const ra = R * lerp(0.02, 0.4, ac);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ra);
    g.addColorStop(0, `rgba(255,253,246,${0.98 * Math.min(1, ac * 2.2)})`);
    g.addColorStop(0.62, `rgba(255,249,232,${0.92 * Math.min(1, ac * 2.2)})`);
    g.addColorStop(1, 'rgba(255,246,226,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, ra, 0, TAU);
    ctx.fill();
  }
  const g = M.marifetGeometri(R);
  g.forEach((yol, i) => {
    const kal = Math.max(1.6, R * (yol.katman === 4 ? 0.006 : 0.009));
    const renkY = yol.katman >= 3 ? altin : renk;
    if (ac > 0 && yol.katman === 3) {
      // iç yıldız: sekiz uç ayrı ayrı dışa aralanır
      const p = yol.pts; // 16 nokta: çift = dış uç
      for (let j = 0; j < 8; j++) {
        const a = (j * Math.PI) / 4;
        const d = ac * R * 0.2;
        const ox = Math.cos(a) * d, oy = Math.sin(a) * d;
        const q = [p[(2 * j + 15) % 16], p[2 * j], p[(2 * j + 1) % 16]].map(([px, py]) => [px + ox, py + oy]);
        konturCiz(ctx, q, { renk: renkY, kal, alfa: 0.88 * (1 - ac * 0.45), kapali: false, titreme: 0.4, tohum: 40 + i * 13 + j, uc: 0.02 });
      }
      return;
    }
    if (ac > 0 && yol.katman === 4) {
      if (!yol.kapali) {
        // kollar: iç ucu dışa çekilir
        const [[x0, y0], [x1, y1]] = yol.pts;
        const L0 = Math.hypot(x0, y0);
        const rin = Math.min(L0 - R * 0.02, R * lerp(0.08, 0.4, ac));
        if (rin >= L0 - R * 0.025) return;
        const ux = x1 / Math.hypot(x1, y1), uy = y1 / Math.hypot(x1, y1);
        konturCiz(ctx, [[x0, y0], [ux * rin, uy * rin]], { renk: renkY, kal, alfa: 0.88, kapali: false, titreme: 0.4, tohum: 40 + i });
      } else {
        // merkez halkası büyüyüp solar
        const rr = R * lerp(0.08, 0.42, ac);
        konturCiz(ctx, elips(0, 0, rr, rr)[0].pts, { renk: renkY, kal, alfa: 0.88 * (1 - ac), kapali: true, titreme: 0.4, tohum: 40 + i });
      }
      return;
    }
    konturCiz(ctx, yol.pts, { renk: renkY, kal, alfa: 0.88, kapali: yol.kapali, titreme: 0.4, tohum: 40 + i });
  });
  if (merkezIsik > 0) {
    M.hale(ctx, 0, 0, R * 0.22, '#FFFBEA', 0.85 * merkezIsik);
    M.hale(ctx, 0, 0, R * 0.08, '#FFFFFF', 0.9 * merkezIsik);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- cin: dumansız ateş dilleri
const ALEV_RENK = {
  lila: { arka: '#CFC6F0', tara: [[0, '#E2DCF7'], [0.6, '#B6ADE3'], [1, '#8A80C8']], kontur: '#948BD0', ic: '#F6F3FF' },
  mavi: { arka: '#C4D6F4', tara: [[0, '#DCE6F8'], [0.6, '#A9BEE8'], [1, '#7C95D0']], kontur: '#8AA1D6', ic: '#F2F7FF' },
  // cin: dumansız ateş alevi ("mâricin min nâr", Rahman 15): saydam, dumansız, alevin ucu gibi sıcak tonlar
  ates: { arka: '#FBEEDD', tara: [[0, '#FFF6EA'], [0.6, '#F8DCBC'], [1, '#EDB58A']], kontur: '#E9B48C', ic: '#FFFBF4' },
  ates2: { arka: '#FBE9DA', tara: [[0, '#FFF4E8'], [0.6, '#F7D2B4'], [1, '#EAA986']], kontur: '#E6AA88', ic: '#FFFAF4' },
};
/**
 * Alev dili: yuvarlak, şişkin taban; uca doğru incelen, S kıvrımlı ve ucu hafifçe bir yana kıvrılan sivri dil.
 * Orta çizgi x(u) = yon·h·(s1·sin(1.6πu + faz)·u + kv·u^2.6); yarı genişlik tabanU'da en geniş.
 */
function dilGeo(h, w, { s1 = 0.1, kv = 0.15, faz = 0, yon = 1, tabanU = 0.32 } = {}) {
  const N = 80;
  const c = [], th = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    c.push([yon * h * (s1 * Math.sin(Math.PI * 1.6 * u + faz) * Math.pow(u, 1.1) + kv * Math.pow(u, 2.6)), -h * u]);
  }
  for (let i = 0; i <= N; i++) {
    const a = c[Math.min(N, i + 1)], b = c[Math.max(0, i - 1)];
    th.push(Math.atan2(a[1] - b[1], a[0] - b[0]));
  }
  const hw = (u) => (w / 2) * Math.sqrt(Math.sin((Math.PI / 2) * Math.min(1, u / tabanU))) * (u <= tabanU ? 1 : Math.pow((1 - u) / (1 - tabanU), 1.15));
  const sol = [], sag = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N, nx = -Math.sin(th[i]), ny = Math.cos(th[i]), r = hw(u);
    sol.push([c[i][0] + nx * r, c[i][1] + ny * r]);
    sag.push([c[i][0] - nx * r, c[i][1] - ny * r]);
  }
  const sekil = cokgen([...sol, ...sag.reverse()]);
  const yakin = (px, py) => {
    let bi = 0, bd = Infinity;
    for (let i = 0; i <= N; i += 2) { const d = (px - c[i][0]) ** 2 + (py - c[i][1]) ** 2; if (d < bd) { bd = d; bi = i; } }
    return { a: th[bi], oran: Math.sqrt(bd) / Math.max(2, hw(bi / N)), u: bi / N };
  };
  return { sekil, yakin, c, hw, N };
}
/** Alev dili sprite'ı. ic=true: içteki açık, kontursuz çekirdek */
export function alevOge(h, w, { s1 = 0.1, kv = 0.15, faz = 0, yon = 1, tabanU = 0.32, renk = 'lila', olcek = 1, ic = false } = {}) {
  const P = ALEV_RENK[renk];
  const G = dilGeo(h, w, { s1, kv, faz, yon, tabanU });
  const ad = `s03-alev3-${h}-${w}-${s1}-${kv}-${faz.toFixed(2)}-${yon}-${tabanU}-${renk}-${ic}`;
  if (ic) {
    return oge({
      ad, olcek, sekil: G.sekil, zemin: null, arka: P.ic, arkaAlfa: 0.9, arkaTasma: false, arkaBulanik: w * 0.12,
      tarama: { ton: (x, y) => clamp(0.2 + 0.6 * G.yakin(x, y).oran), renkler: [[0, '#FFFFFF'], [1, '#E4E0F8']], yonF: (x, y) => G.yakin(x, y).a, aralik: 3.2, boy: [10, 26], esikler: [0.4], alfa: 0.3, karisim: 'source-over' },
      kontur: null, pay: 14,
    });
  }
  return oge({
    ad, olcek, sekil: G.sekil, zemin: null, arka: P.arka, arkaAlfa: 0.6, arkaBulanik: w * 0.1, arkaTasma: false,
    tarama: { ton: (x, y) => { const q = G.yakin(x, y); return clamp(0.15 + 0.7 * Math.pow(q.oran, 1.5) + 0.2 * (1 - q.u)); },
      renkler: P.tara, yonF: (x, y) => G.yakin(x, y).a, aralik: 2.9, boy: [14, 36], kal: 1.15, esikler: [0.3, 0.58, 0.82], alfa: 0.5, karisim: 'source-over' },
    kontur: P.kontur, konturKal: 1.6, konturAlfa: 0.55, titreme: 0.35, pay: 14,
  });
}
/** Alev dilini salınımla çizer: k yatay eğme (uç kayar), sx/sy ölçek; (x, y) taban */
export function alevCiz(ctx, o, x, y, { k = 0, sx = 1, sy = 1, alfa = 1 } = {}) {
  if (alfa <= 0.002) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.transform(1, 0, k, 1, 0, 0);
  ogeCiz(ctx, o, 0, 0, { sx, sy, alfa });
  ctx.restore();
}

// ---------------------------------------------------------------- ışıklı taç yaprağı (altından güle çalan)
/** Işıklı gül taç yaprağı: dar dip, yuvarlak ve uçta hafifçe dalgalı; ortası krem-altın, kenarı gül pembesi */
export function tacYapragi(L, olcek = 1) {
  const W0 = L * 0.86;
  return oge({
    ad: `s03-tacyaprak3-${L}`, olcek,
    sekil: svg(`M0 0C${-W0 * 0.5} ${-L * 0.16} ${-W0 * 0.66} ${-L * 0.78} ${-W0 * 0.3} ${-L * 0.97}C${-W0 * 0.14} ${-L * 1.04} ${-W0 * 0.05} ${-L * 0.99} 0 ${-L * 0.97}C${W0 * 0.05} ${-L * 0.99} ${W0 * 0.14} ${-L * 1.04} ${W0 * 0.3} ${-L * 0.97}C${W0 * 0.66} ${-L * 0.78} ${W0 * 0.5} ${-L * 0.16} 0 0Z`),
    arka: '#FDE7DA', arkaAlfa: 0.9,
    tarama: [
      { ton: TON.gurultulu(TON.radyal(0, -L * 0.6, L * 0.62, 0.05, 0.9), 0.05, 0.06, L), renkler: [[0, '#FCEBD2'], [0.5, '#F7C6AE'], [1, '#EC97A0']], yonF: (x, y) => Math.atan2(y + L * 0.6, x), aralik: 2.5, boy: [8, 18], kal: 1.05, esikler: [0.35, 0.68], alfa: 0.5 },
      { ton: TON.dogrusal(0, 0, 0, -L * 0.45, 0.9, 0), renkler: [[0, '#F6D79A'], [1, '#E3AE55']], yon: -Math.PI / 2, aralik: 2.4, boy: [6, 14], kal: 1, esikler: [0.4], alfa: 0.45 },
    ],
    kontur: '#D88A8E', konturKal: 1.3, konturAlfa: 0.7,
    detay: (c, api) => {
      api.cizgi([[0, -L * 0.08], [L * 0.015, -L * 0.4], [0, -L * 0.66]], { renk: '#E2A08E', kal: 0.9, alfa: 0.45 });
      api.dolgu(elips(-W0 * 0.17, -L * 0.64, W0 * 0.09, L * 0.15), '#FFFDF6', 0.75);
    },
  });
}

// ---------------------------------------------------------------- ışık zeminleri (tam ekran, ekran uzayında)
/** tur: 'altin' (soluk altın-krem) | 'gul' (soluk pembe-krem). Merkez (540, 900). tarama: false → yalnız buğu tabanı */
export function zeminOge(tur, { tarama = true } = {}) {
  const c = tuval(W, H);
  const ctx = c.getContext('2d');
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, W, H);
  const P = tur === 'altin'
    ? { ic: '#FFF9EA', orta: '#F9EBC8', dis: '#EFDDB2', tara: [[0, '#F4E2B0'], [1, '#D9B568']] }
    : { ic: '#FFF7F3', orta: '#F9E4E3', dis: '#EFD0D6', tara: [[0, '#F3D4DA'], [1, '#D99AAA']] };
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const g = ctx.createRadialGradient(540, 900, 0, 540, 900, 1250);
  g.addColorStop(0, P.ic);
  g.addColorStop(0.42, P.orta);
  g.addColorStop(1, P.dis);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  if (!tarama) return c;
  // yumuşak ışınsal kalem taraması (merkezden dışa), merkez çıplak
  tara(ctx, {
    x0: 0, y0: 0, x1: W, y1: H, yonF: (x, y) => Math.atan2(y - 900, x - 540), aralik: 3.6, boy: [60, 180], kal: 1.15, alfa: 0.2,
    ton: (x, y) => clamp((Math.hypot(x - 540, y - 900) - 260) / 900), renkler: P.tara, esikler: [0.2, 0.55], tohum: tur === 'altin' ? 31 : 37, minUc: 10, incelme: 0.2,
  });
  return c;
}
