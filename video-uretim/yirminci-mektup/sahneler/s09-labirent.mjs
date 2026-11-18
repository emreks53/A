// s09 yardımcısı: kuşbakışı devasa labirent (S-232 kalem üslubu, gri-lila).
//  - labirent: 121 × 121 hücre, tohumlu derinlik öncelikli (DFS) labirent; ortada elle tasarlanmış küçük bir bölge
//    (adamın girdiği çıkmaz ve kavşak).
//  - duvarların birleşik dış hattı ince ızgara üzerinde izlenir (kontur iç çizgisiz, köşeler hafif yuvarlak).
//  - tarama: kalem darbelerinden yapılmış döşenebilir (dikişsiz) dokular; zemin, gölge ve duvar üstü için ayrı.
//  - ayrıntı seviyeleri (LOD): yakın (hücre 230 px), orta, uzak ve en uzak (hücre ~26 px) sprite'ları; her biri kendi
//    doğal ölçeğinde çizilir (kontur kalınlığı ekranda ~2 px kalır), kamera yükselirken aralarında geçiş yapılır.
// Dünya birimi: yakın seviyenin pikseli (HUCRE = 230 birim = bir hücre). s10 bu dosyayı içe aktararak aynı labirenti
// çizebilir (labirentHazirla + seviyeOlustur + labirentCiz).
import { tuval, rng, clamp, lerp, rampa, TAU, W, H } from '../motor/temel.mjs';
import { darbe, konturCiz, FILM } from '../motor/kalem.mjs';

export const HUCRE = 230; // yakın seviyede bir hücrenin boyu (dünya birimi)
export const N_HUCRE = 121; // labirentin bir kenarındaki hücre sayısı
export const DUVAR = 0.2; // duvar kalınlığı / hücre
export const MERKEZ = 60; // tasarlanmış bölgenin ortası (hücre)

export const RENK = {
  zemin: '#E2DEDE', // zemin buğusu (sıcak açık gri)
  zeminTara: [[0, '#D5CFD4'], [0.6, '#B6AEBC'], [1, '#9A91A6']],
  golge: '#8B83A0',
  golgeTara: [[0, '#A8A0BA'], [1, '#6E6784']],
  duvar: '#BBB4CB',
  duvarTara: [[0, '#B5AEC6'], [0.6, '#968EAB'], [1, '#756D8C']],
  kontur: '#544C68',
};

// ---------------------------------------------------------------- labirent üretimi
/** hW[j*N + i]: (i, j) hücresinin üst kenarında duvar (j: 0..N); vW[j*(N+1) + i]: sol kenarında duvar (i: 0..N) */
export const L = { N: N_HUCRE, hW: null, vW: null };
const hIdx = (i, j) => j * L.N + i;
const vIdx = (i, j) => j * (L.N + 1) + i;
export const duvarH = (i, j) => (i < 0 || i >= L.N || j < 0 || j > L.N ? 0 : L.hW[hIdx(i, j)]);
export const duvarV = (i, j) => (i < 0 || i > L.N || j < 0 || j >= L.N ? 0 : L.vW[vIdx(i, j)]);

// Tasarlanmış bölge (hücre 58..62): '#' duvar, '.' açık. Tek koordinatlar hücre içi, çiftler ızgara çizgisi.
// (60,60) kavşak; (61,60) doğuya çıkmaz; (60,61) güneyden gelen koridor.
const BOLGE = [
  '#.###.#####',
  '#...#.#...#',
  '###.#.#.#.#',
  '#...#.#.#..',
  '#.###.###.#',
  '........#.#',
  '#.###.###.#',
  '#.#.#.#...#',
  '#.#.#.#.###',
  '#...#.#...#',
  '#####.###.#',
];
const B0 = 58;

let hazir = false;
export function labirentHazirla() {
  if (hazir) return L;
  const N = L.N;
  L.hW = new Uint8Array((N + 1) * N).fill(1);
  L.vW = new Uint8Array(N * (N + 1)).fill(1);
  // DFS (yinelemeli), tohumlu
  const r = rng(9091);
  const gor = new Uint8Array(N * N);
  const yigin = [MERKEZ * N + MERKEZ];
  gor[yigin[0]] = 1;
  const yon = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (yigin.length) {
    const c = yigin[yigin.length - 1];
    const i = c % N, j = (c / N) | 0;
    const ad = [];
    for (const [dx, dy] of yon) {
      const a = i + dx, b = j + dy;
      if (a >= 0 && a < N && b >= 0 && b < N && !gor[b * N + a]) ad.push([dx, dy]);
    }
    if (!ad.length) { yigin.pop(); continue; }
    const [dx, dy] = ad[Math.floor(r() * ad.length)];
    const a = i + dx, b = j + dy;
    if (dx === 1) L.vW[vIdx(i + 1, j)] = 0;
    else if (dx === -1) L.vW[vIdx(i, j)] = 0;
    else if (dy === 1) L.hW[hIdx(i, j + 1)] = 0;
    else L.hW[hIdx(i, j)] = 0;
    gor[b * N + a] = 1;
    yigin.push(b * N + a);
  }
  // birkaç döngü: labirent fazla "ağaç" görünmesin
  for (let k = 0; k < N * N * 0.03; k++) {
    const i = 1 + Math.floor(r() * (N - 2)), j = 1 + Math.floor(r() * (N - 2));
    if (r() < 0.5) L.vW[vIdx(i, j)] = 0; else L.hW[hIdx(i, j)] = 0;
  }
  // tasarlanmış bölge
  for (let Y = 0; Y < 11; Y++) for (let X = 0; X < 11; X++) {
    const ch = BOLGE[Y][X] === '#' ? 1 : 0;
    if (X % 2 === 1 && Y % 2 === 0) L.hW[hIdx(B0 + (X - 1) / 2, B0 + Y / 2)] = ch;
    else if (X % 2 === 0 && Y % 2 === 1) L.vW[vIdx(B0 + X / 2, B0 + (Y - 1) / 2)] = ch;
  }
  hazir = true;
  return L;
}

export const hucreMerkez = (i, j) => [(i + 0.5) * HUCRE, (j + 0.5) * HUCRE];

// ---------------------------------------------------------------- dış hat izleme
/**
 * [i0,i1) × [j0,j1) penceresindeki duvar birleşiminin dış hatları (hücre biriminde kapalı halkalar).
 * İnce ızgara: çift indis = ızgara çizgisi (duvar bandı), tek = hücre içi.
 */
export function hatlar(i0, j0, i1, j1, w = DUVAR) {
  const n = i1 - i0, m = j1 - j0;
  const GX = 2 * n + 1, GY = 2 * m + 1;
  const dolu = new Uint8Array(GX * GY);
  for (let Y = 0; Y < GY; Y++) for (let X = 0; X < GX; X++) {
    const i = i0 + (X >> 1), j = j0 + (Y >> 1);
    let v = 0;
    if (X % 2 === 1 && Y % 2 === 0) v = duvarH(i, j);
    else if (X % 2 === 0 && Y % 2 === 1) v = duvarV(i, j);
    else if (X % 2 === 0 && Y % 2 === 0) v = duvarH(i - 1, j) | duvarH(i, j) | duvarV(i, j - 1) | duvarV(i, j);
    dolu[Y * GX + X] = v;
  }
  const D = (X, Y) => (X < 0 || Y < 0 || X >= GX || Y >= GY ? 0 : dolu[Y * GX + X]);
  // yönlü kenarlar (dolu solda kalacak biçimde): köşe anahtarı -> sonraki köşe
  const sonraki = new Map();
  const key = (a, b) => a * 100003 + b;
  const ekle = (ax, ay, bx, by) => sonraki.set(key(ax, ay), [bx, by, ax, ay]);
  for (let Y = 0; Y < GY; Y++) for (let X = 0; X < GX; X++) {
    if (!D(X, Y)) continue;
    // ekran koordinatı (y aşağı): dolu solda -> saat yönünün tersine (y aşağıda) dolaşım
    if (!D(X, Y - 1)) ekle(X + 1, Y, X, Y); // üst kenar: sağdan sola
    if (!D(X - 1, Y)) ekle(X, Y, X, Y + 1); // sol kenar: yukarıdan aşağı
    if (!D(X, Y + 1)) ekle(X, Y + 1, X + 1, Y + 1); // alt kenar: soldan sağa
    if (!D(X + 1, Y)) ekle(X + 1, Y + 1, X + 1, Y); // sağ kenar: aşağıdan yukarı
  }
  const koord = (b, o) => o + (b >> 1) + (b % 2 ? w / 2 : -w / 2);
  const halkalar = [];
  const kullan = new Set();
  for (const [k0, e0] of sonraki) {
    if (kullan.has(k0)) continue;
    const pts = [];
    let k = k0, e = e0;
    let guvenlik = 0;
    while (!kullan.has(k) && guvenlik++ < 1e7) {
      kullan.add(k);
      pts.push([e[2], e[3]]);
      k = key(e[0], e[1]);
      e = sonraki.get(k);
      if (!e) break;
    }
    // doğrusal ara köşeleri at
    const sade = [];
    for (let q = 0; q < pts.length; q++) {
      const a = pts[(q - 1 + pts.length) % pts.length], b = pts[q], c = pts[(q + 1) % pts.length];
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) continue;
      sade.push(b);
    }
    if (sade.length >= 4) halkalar.push(sade.map(([bx, by]) => [koord(bx, i0), koord(by, j0)]));
  }
  return halkalar;
}

/** Dik köşeleri r yarıçapla yuvarlar (hücre biriminde) */
export function koseYuvarla(pts, r) {
  const out = [];
  const n = pts.length;
  for (let q = 0; q < n; q++) {
    const a = pts[(q - 1 + n) % n], b = pts[q], c = pts[(q + 1) % n];
    const l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const p1 = [b[0] + ((a[0] - b[0]) / l1) * rr, b[1] + ((a[1] - b[1]) / l1) * rr];
    const p2 = [b[0] + ((c[0] - b[0]) / l2) * rr, b[1] + ((c[1] - b[1]) / l2) * rr];
    for (let k = 0; k <= 3; k++) {
      const u = k / 3, v = 1 - u;
      out.push([v * v * p1[0] + 2 * v * u * b[0] + u * u * p2[0], v * v * p1[1] + 2 * v * u * b[1] + u * u * p2[1]]);
    }
  }
  return out;
}

// ---------------------------------------------------------------- döşenebilir tarama dokusu
function ebob(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; }
/**
 * P × P dikişsiz kalem taraması: aci yönünde, aralik aralıklı paralel sıralar (torus üzerinde tek kapalı çizgi),
 * sıralarda uçları incelen darbeler. Saydam zemin üzerine; çarpımla (multiply) kullanılır.
 */
export function taramaDokusu({ P = 512, aci = -0.3, aralik = 3.6, boy = [30, 90], kal = 1.2, alfa = 0.45, renkler, tohum = 1, sapma = 0.5, gecisler = null }) {
  const c = tuval(P, P);
  const ctx = c.getContext('2d');
  ctx.globalCompositeOperation = 'multiply';
  const katlar = gecisler || [{ aci, aralik, alfa }];
  katlar.forEach((g, gi) => {
    const r = rng(tohum + gi * 977);
    const Nx = -Math.sin(g.aci), Ny = Math.cos(g.aci);
    let m = Math.round((Nx * P) / g.aralik), n = Math.round((Ny * P) / g.aralik);
    while (ebob(m, n) !== 1) n += 1;
    const v = Math.hypot(m, n);
    const nx = m / v, ny = n / v; // gerçek normal
    const tx = n / v, ty = -m / v; // sıra yönü
    const Lt = P * v;
    let s = 0;
    while (s < Lt) {
      const len = r.ara(boy[0], boy[1]);
      const kay = r.ara(-0.5, 0.5);
      const pts = [];
      for (let u = 0; u <= len; u += 3) {
        const bk = kay * Math.sin((u / len) * Math.PI) * 1.4;
        pts.push([(s + u) * tx + bk * nx, (s + u) * ty + bk * ny]);
      }
      // başlangıcı karo içine indir
      const ox = Math.floor(pts[0][0] / P) * P, oy = Math.floor(pts[0][1] / P) * P;
      const ton = clamp(0.5 + (r() - 0.5) * 2 * sapma);
      const col = rampa(renkler, ton);
      const a = (g.alfa ?? alfa) * r.ara(0.6, 1.05);
      ctx.fillStyle = `rgba(${col[0] | 0},${col[1] | 0},${col[2] | 0},${a})`;
      const faz = r() * TAU, k = kal * r.ara(0.8, 1.2);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const q = pts.map(([x, y]) => [x - ox + dx * P, y - oy + dy * P]);
        // karo dışında kalan kopyaları atla
        const x0 = q[0][0], y0 = q[0][1], x1 = q[q.length - 1][0], y1 = q[q.length - 1][1];
        if (Math.max(x0, x1) < -4 || Math.min(x0, x1) > P + 4 || Math.max(y0, y1) < -4 || Math.min(y0, y1) > P + 4) continue;
        darbe(ctx, q, k, { faz, minUc: 8, incelme: 0.22 });
      }
      s += len + r.ara(-len * 0.12, len * 0.06);
    }
  });
  return c;
}

let dokular = null;
export function dokulariAl() {
  if (dokular) return dokular;
  dokular = {
    zemin: taramaDokusu({ aci: -0.32, aralik: 3.9, boy: [26, 80], kal: 1.15, alfa: 0.36, renkler: RENK.zeminTara, tohum: 11 }),
    zemin2: taramaDokusu({ aci: 0.55, aralik: 5.2, boy: [18, 50], kal: 1.1, alfa: 0.22, renkler: RENK.zeminTara, tohum: 12 }),
    golge: taramaDokusu({ gecisler: [{ aci: -0.32, aralik: 3.0, alfa: 0.5 }, { aci: -0.12, aralik: 4.2, alfa: 0.32 }], boy: [20, 60], kal: 1.2, renkler: RENK.golgeTara, tohum: 21 }),
    duvar: taramaDokusu({ gecisler: [{ aci: 0.78, aralik: 3.1, alfa: 0.55 }, { aci: -0.78, aralik: 4.6, alfa: 0.26 }], boy: [14, 44], kal: 1.2, renkler: RENK.duvarTara, tohum: 31 }),
  };
  return dokular;
}

const q0 = (i, j, k) => i * 977 + j * 131 + k * 17;
// ---------------------------------------------------------------- seviye sprite'ı
/**
 * Bir ayrıntı seviyesi: s = doğal ölçek (yakın = 1). [i0,i1) × [j0,j1) hücre bölgesini kapsar.
 * cizgiAyri: yalnız konturların ayrı bir tuvali de üretilir (çizilerek açılış için).
 * Döner: { tuval, cizgi?, s, x0, y0, w, h } (x0, y0, w, h dünya biriminde)
 */
export function seviyeOlustur(s, i0, j0, i1, j1, { cizgiAyri = false, tohum = 1 } = {}) {
  labirentHazirla();
  i0 = Math.max(-3, Math.floor(i0)); j0 = Math.max(-3, Math.floor(j0));
  i1 = Math.min(L.N + 3, Math.ceil(i1)); j1 = Math.min(L.N + 3, Math.ceil(j1));
  const c = HUCRE * s; // hücre (px)
  const Wp = Math.ceil((i1 - i0) * c), Hp = Math.ceil((j1 - j0) * c);
  const T = tuval(Wp, Hp);
  const ctx = T.getContext('2d');
  const D = dokulariAl();
  const ox = -i0 * c, oy = -j0 * c;
  const halka = hatlar(i0 - 1, j0 - 1, i1 + 1, j1 + 1).map((h) => koseYuvarla(h, DUVAR * 0.22));
  const yol = (g, dx = 0, dy = 0) => {
    g.beginPath();
    for (const h of halka) {
      g.moveTo(ox + h[0][0] * c + dx, oy + h[0][1] * c + dy);
      for (let k = 1; k < h.length; k++) g.lineTo(ox + h[k][0] * c + dx, oy + h[k][1] * c + dy);
      g.closePath();
    }
  };
  // 1) zemin: film + buğu + lekeler
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, Wp, Hp);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = RENK.zemin;
  ctx.globalAlpha = 0.75;
  ctx.fillRect(0, 0, Wp, Hp);
  ctx.globalAlpha = 1;
  // lekeler: dünya hücrelerine bağlı (bölgeden bağımsız: aynı yer her seviyede/bölgede aynı)
  for (let j = j0 - 2; j < j1 + 2; j++) for (let i = i0 - 2; i < i1 + 2; i++) {
    if (((i * 73856093) ^ (j * 19349663)) % 3 !== 0) continue;
    const r = rng(((i + 512) * 4099 + (j + 512)) >>> 0);
    const x = ox + (i + r()) * c, y = oy + (j + r()) * c, R = c * r.ara(0.8, 2.6);
    const g = ctx.createRadialGradient(x, y, 0, x, y, R);
    const a = r.ara(0.03, 0.08);
    g.addColorStop(0, `rgba(146,138,160,${a})`);
    g.addColorStop(1, 'rgba(146,138,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - R, y - R, 2 * R, 2 * R);
  }
  // zemin taraması (desen dünya başlangıcına hizalı)
  const desen = (g, doku) => { g.save(); g.translate(ox, oy); g.fillStyle = g.createPattern(doku, 'repeat'); g.fillRect(-ox, -oy, Wp, Hp); g.restore(); };
  desen(ctx, D.zemin);
  desen(ctx, D.zemin2);
  // zemin ayrıntısı (yakın seviyelerde): ince çatlaklar ve çakıllar
  if (s >= 0.4) {
    ctx.globalCompositeOperation = 'source-over';
    for (let j = j0; j < j1; j++) for (let i = i0; i < i1; i++) {
      const ar = rng(((i + 512) * 7919 + (j + 512) * 31 + 11) >>> 0);
      const v = ar();
      const cx = ox + (i + 0.5) * c + ar.ara(-0.22, 0.22) * c, cy = oy + (j + 0.5) * c + ar.ara(-0.22, 0.22) * c;
      if (v < 0.22) {
        const a = ar() * TAU, L = c * ar.ara(0.18, 0.34);
        const pts = [];
        for (let k = 0; k <= 5; k++) {
          const u = k / 5 - 0.5;
          pts.push([cx + Math.cos(a) * L * u + ar.ara(-1, 1) * c * 0.02, cy + Math.sin(a) * L * u + ar.ara(-1, 1) * c * 0.02]);
        }
        konturCiz(ctx, pts, { renk: '#8A8298', kal: clamp(c * 0.005, 0.9, 1.4), alfa: 0.55, kapali: false, titreme: 0.3, tohum: i * 131 + j, uc: 0.3 });
        if (ar() < 0.5) { const m = pts[2 + (ar() < 0.5 ? 1 : 0)]; const b = a + ar.ara(0.6, 1.2) * (ar() < 0.5 ? 1 : -1); konturCiz(ctx, [m, [m[0] + Math.cos(b) * L * 0.3, m[1] + Math.sin(b) * L * 0.3]], { renk: '#8A8298', kal: clamp(c * 0.004, 0.8, 1.2), alfa: 0.45, kapali: false, titreme: 0.2, tohum: i * 7 + j * 3, uc: 0.4 }); }
      } else if (v < 0.36) {
        const n = 1 + Math.floor(ar() * 3);
        for (let k = 0; k < n; k++) {
          const px = cx + ar.ara(-0.08, 0.08) * c, py = cy + ar.ara(-0.08, 0.08) * c, rr = c * ar.ara(0.012, 0.026);
          ctx.fillStyle = 'rgba(214,208,220,0.9)';
          ctx.beginPath(); ctx.ellipse(px, py, rr * 1.3, rr, ar() * 3, 0, TAU); ctx.fill();
          const pts = [];
          for (let q = 0; q < 14; q++) { const aa = (q / 14) * TAU; pts.push([px + Math.cos(aa) * rr * 1.3, py + Math.sin(aa) * rr]); }
          konturCiz(ctx, pts, { renk: '#7E7690', kal: clamp(c * 0.005, 0.9, 1.3), alfa: 0.7, kapali: true, titreme: 0.15, tohum: q0(i, j, k) });
        }
      }
    }
  }
  // 2) duvar gölgesi (ışık sol üstten): bulanık buğu + taranmış gölge
  const gdx = c * 0.085, gdy = c * 0.115;
  {
    const tmp = tuval(Wp, Hp);
    const t = tmp.getContext('2d');
    t.fillStyle = RENK.golge;
    yol(t, gdx, gdy);
    t.fill('evenodd');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    ctx.filter = `blur(${Math.max(1, c * 0.035)}px)`;
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();
    ctx.save();
    yol(ctx, gdx * 0.92, gdy * 0.92);
    ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'multiply';
    desen(ctx, D.golge);
    ctx.restore();
  }
  // 3) duvar üstü: film + buğu + tarama
  ctx.save();
  yol(ctx);
  ctx.clip('evenodd');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, Wp, Hp);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = RENK.duvar;
  ctx.globalAlpha = 0.8;
  ctx.fillRect(0, 0, Wp, Hp);
  ctx.globalAlpha = 1;
  desen(ctx, D.duvar);
  // ışık alan sol-üst kenarda ince açık şerit (duvar üstünün yüksekliği hissi)
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, c * 0.025);
  ctx.translate(c * 0.012, c * 0.016);
  yol(ctx);
  ctx.stroke();
  ctx.restore();
  // 4) kontur
  const kal = clamp(1.25 + c * 0.0045, 1.35, 2.4);
  const konturlar = (g) => {
    halka.forEach((h, k) => {
      const pts = h.map(([x, y]) => [ox + x * c, oy + y * c]);
      // pencere dışındaki halkaları atla
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < -10 || y1 < -10 || x0 > Wp + 10 || y0 > Hp + 10) return;
      konturCiz(g, pts, { renk: RENK.kontur, kal, alfa: 0.88, kapali: true, titreme: clamp(c * 0.003, 0.15, 0.55), tohum: tohum * 31 + k, adim: clamp(c * 0.012, 1.4, 2.6) });
    });
  };
  konturlar(ctx);
  let cizgi = null;
  if (cizgiAyri) {
    cizgi = tuval(Wp, Hp);
    konturlar(cizgi.getContext('2d'));
  }
  return { tuval: T, cizgi, s, x0: i0 * HUCRE, y0: j0 * HUCRE, w: Wp / s, h: Hp / s, i0, j0, i1, j1 };
}

// ---------------------------------------------------------------- kamera ve çizim
/** Labirent kamerası: { x, y (ekran ortasına gelen dünya noktası), z (yakın seviyeye göre ölçek), r (dönüş) } */
export function labKameraUygula(ctx, cam) {
  ctx.translate(W / 2, H / 2);
  if (cam.r) ctx.rotate(cam.r);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -cam.y);
}
export function labEkranda(cam, x, y) {
  const dx = (x - cam.x) * cam.z, dy = (y - cam.y) * cam.z;
  const c = Math.cos(cam.r || 0), s = Math.sin(cam.r || 0);
  return [W / 2 + dx * c - dy * s, H / 2 + dx * s + dy * c];
}
/** Ekran dikdörtgeninin (pay ile) dünyadaki sınır kutusu */
export function gorusKutusu(cam, pay = 0) {
  const c = Math.cos(cam.r || 0), s = Math.sin(cam.r || 0);
  const hw = (W / 2 + pay) / cam.z, hh = (H / 2 + pay) / cam.z;
  const ex = Math.abs(hw * c) + Math.abs(hh * s), ey = Math.abs(hw * s) + Math.abs(hh * c);
  return { x0: cam.x - ex, y0: cam.y - ey, x1: cam.x + ex, y1: cam.y + ey };
}

/** Bir seviyeyi kamera altında çizer (alfa ile); kendi tuvali yerine 'tuvalAd' ('cizgi') verilebilir */
export function seviyeCiz(ctx, cam, S, { alfa = 1, tuvalAd = 'tuval' } = {}) {
  if (alfa <= 0.002) return;
  const img = S[tuvalAd];
  if (!img) return;
  ctx.save();
  labKameraUygula(ctx, cam);
  ctx.globalAlpha *= alfa;
  ctx.imageSmoothingQuality = cam.z / S.s < 0.8 ? 'high' : 'low';
  ctx.drawImage(img, S.x0, S.y0, S.w, S.h);
  ctx.restore();
}

/**
 * Seviyeleri yakınlaşmaya göre karıştırarak çizer. seviyeler: doğal ölçeğe göre büyükten küçüğe sıralı.
 * Geçiş: z, S[k].s * 0.75 ile S[k].s * 0.55 arasında k'dan k+1'e (yukarı ölçeklemede bulanıklık kısa sürer).
 */
export function labirentCiz(ctx, cam, seviyeler) {
  // her seviyenin ağırlığı
  const n = seviyeler.length;
  const wts = new Array(n).fill(0);
  let kalan = 1;
  for (let k = 0; k < n; k++) {
    if (k === n - 1) { wts[k] = kalan; break; }
    const S = seviyeler[k];
    const a = clamp((cam.z / S.s - 0.55) / (0.75 - 0.55));
    wts[k] = kalan * a;
    kalan -= wts[k];
    if (kalan <= 0) break;
  }
  // önce kaba seviye tam opak, üstüne ince seviye karışım oranıyla
  let ilk = -1;
  for (let k = n - 1; k >= 0; k--) if (wts[k] > 0.001) { ilk = k; break; }
  if (ilk < 0) return;
  let birikim = wts[ilk];
  seviyeCiz(ctx, cam, seviyeler[ilk], { alfa: 1 });
  for (let k = ilk - 1; k >= 0; k--) {
    if (wts[k] <= 0.001) continue;
    birikim += wts[k];
    seviyeCiz(ctx, cam, seviyeler[k], { alfa: wts[k] / birikim });
  }
}
