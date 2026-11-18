// s07 yardımcıları: ortak geometrili (yeşil / gri iki paletli) zemin katmanları, ağır bulut, kuruntu gölgesi, sis,
// dikenli çalı (kemiklere sarılan sarmal dahil), yağmur, sürtünmesiz yürüyüş benzetimi (ayak kayması yok), iskelet ve
// zemin çözücü (diz çökme için), tekdüze kübik eğri (kamera).
import { tuval, rng, clamp, lerp, ease, TAU, rgba, gurultu2, smooth } from '../motor/temel.mjs';
import { oge, darbe, TON, PALET, bulutSekli } from '../motor/kalem.mjs';
import { svg, cokgen, path2d } from '../motor/sekil.mjs';
import { OLCU } from '../motor/insan.mjs';

// ---------------------------------------------------------------- tekdüze kübik eğri (Fritsch-Carlson)
/** anahtar: [[t, v], ...] → v(t); uçlarda ve yerel uç noktalarda eğim 0 (yumuşak duruş/kalkış) */
export function egri(anahtar) {
  const n = anahtar.length;
  const xs = anahtar.map((a) => a[0]), ys = anahtar.map((a) => a[1]);
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m = new Array(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1]), w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1]);
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (t) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h;
    const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    return h00 * ys[i] + h10 * h * m[i] + h01 * ys[i + 1] + h11 * h * m[i + 1];
  };
}

// ---------------------------------------------------------------- zemin katmanları
const ZPAL = {
  yesil: { arka: '#B9DCA2', tara: [[0, PALET.yesilAcik], [0.6, PALET.yesilOrta], [1, PALET.yesil]], kontur: PALET.yesilOrta, es: [0.25, 0.55, 0.8], alfa: 0.5 },
  yesilUzak: { arka: '#C9E0C6', tara: [[0, '#BCD9B9'], [0.6, '#8DBB98'], [1, '#5F9478']], kontur: '#7AA88A', es: [0.3, 0.62], alfa: 0.45 },
  yesilOrta: { arka: '#B4D8A4', tara: [[0, '#A6D09A'], [0.6, PALET.yesilOrta], [1, '#3F7F55']], kontur: '#5A995E', es: [0.25, 0.55, 0.8], alfa: 0.5 },
  gri: { arka: '#CBC6CF', tara: [[0, '#B7B1BE'], [0.55, '#8E8699'], [1, '#625A6E']], kontur: '#5F576B', es: [0.18, 0.42, 0.64, 0.84], alfa: 0.52 },
  griUzak: { arka: '#D8D4DE', tara: [[0, '#CBC6D3'], [1, '#958DA4']], kontur: '#8C849A', es: [0.3, 0.6], alfa: 0.42 },
  griOrta: { arka: '#CDC8D3', tara: [[0, '#BAB4C3'], [0.6, '#8F879D'], [1, '#6E667C']], kontur: '#6E667C', es: [0.22, 0.48, 0.72], alfa: 0.48 },
};
/** profil(x) üst kenar; aynı profil iki paletle çizilince renk süpürmesinde biçim kaymaz */
export function zeminOge({ ad, profil, x0, x1, yAlt, palet, olcek = 1, tohum = 1, detay = null }) {
  const pts = [];
  for (let x = x0; x <= x1 + 0.01; x += 16) pts.push([x, profil(x)]);
  pts.push([x1, yAlt], [x0, yAlt]);
  const P = ZPAL[palet];
  const ust = Math.min(...pts.map((p) => p[1]));
  return oge({
    ad, olcek, sekil: cokgen(pts), arka: P.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.dogrusal(0, ust, 0, ust + Math.min(700, (yAlt - ust) * 0.7), 0.32, 0.82), 0.18, 0.006, tohum), renkler: P.tara, yon: -0.05, aralik: 3.3, boy: [40, 130], esikler: P.es, alfa: P.alfa },
    kontur: P.kontur, konturKal: 2.0, titreme: 0.6, detay,
  });
}

// ---------------------------------------------------------------- bulutlar
/** Ağır yağmur bulutu: basık, altı koyu ve sık taralı, üstü çıplak filme açılır (kontursuz) */
export function agirBulut(w, tohum, olcek = 1, koyu = 0) {
  const sek = bulutSekli(w, tohum);
  const renk = koyu
    ? { arka: '#8E879E', tara: [[0, '#9C95AD'], [0.5, '#6E6782'], [1, '#463F55']] }
    : { arka: '#B3ADC2', tara: [[0, '#C2BDCE'], [0.5, '#8F88A3'], [1, '#5E5772']] };
  return oge({
    ad: `s07-agir-bulut-${w}-${tohum}-${koyu}`, olcek, sekil: sek, arka: renk.arka, arkaAlfa: 0.8, arkaBulanik: 10, arkaTasma: false,
    tarama: [
      { ton: (x, y) => clamp(0.25 + (y + w * 0.18) / (w * 0.26)), renkler: renk.tara, yon: -0.157, aralik: 3.0, boy: [30, 110], esikler: [0.15, 0.42, 0.7], alfa: 0.42, gecisAci: 0.05 },
    ],
    kontur: null,
  });
}

// ---------------------------------------------------------------- kuruntu gölgesi (yüzsüz, belirsiz)
/** Uzun, kubbeli, omuzları belli belirsiz, eteği sise karışan yumuşak kütle. Yüz, göz, uzuv yok. (0,0) taban ortası */
export function golgeOge(h, w, tohum, olcek = 1) {
  const r = rng(tohum);
  const n = gurultu2(tohum);
  const yariEn = (v) => {
    // v: 0 tepe .. 1 taban
    const kubbe = v < 0.14 ? Math.sqrt(v / 0.14) * 0.42 : 0.42;
    const omuz = 0.42 + 0.2 * smooth(0.12, 0.3, v);
    const etek = 0.62 + 0.16 * smooth(0.5, 1, v);
    return (w / 2) * (v < 0.14 ? kubbe : v < 0.3 ? omuz : etek);
  };
  const sol = [], sag = [];
  const N = 60;
  const egim = r.ara(-0.05, 0.05);
  for (let k = 0; k <= N; k++) {
    const v = k / N, y = -h + v * h;
    const hw = yariEn(v) * (1 + 0.06 * n(v * 4, 1.3));
    const ox = egim * (h - (y + h)) * 0.5;
    sol.push([ox - hw * (1 + 0.05 * n(v * 6, 7.1)), y]);
    sag.push([ox + hw * (1 + 0.05 * n(v * 6, 3.7)), y]);
  }
  const pts = [...sag, ...sol.reverse()];
  const ton = (x, y) => {
    const v = clamp((y + h) / h);
    const hw = yariEn(v);
    const kenar = smooth(0, 0.45, 1 - Math.abs(x) / hw);
    return clamp((0.85 - 0.45 * v) * kenar * (1 - smooth(0.62, 0.95, v)));
  };
  return oge({
    ad: `s07-golge-${h}-${w}-${tohum}`, olcek, sekil: cokgen(pts), zemin: null, pay: 40,
    arka: '#5D5569', arkaBulanik: 22, arkaTasma: false,
    arkaCiz: (t, yol) => {
      const g = t.createLinearGradient(0, -h, 0, 0);
      g.addColorStop(0, 'rgba(93,85,105,0.75)');
      g.addColorStop(0.55, 'rgba(93,85,105,0.6)');
      g.addColorStop(1, 'rgba(93,85,105,0)');
      t.fillStyle = g;
      t.fill(yol);
    },
    tarama: { ton, renkler: [[0, '#A39CB3'], [0.6, '#6C6480'], [1, '#463F56']], yon: -1.05, aralik: 3.4, boy: [24, 80], esikler: [0.2, 0.48, 0.72], alfa: 0.42, karisim: 'source-over' },
    kontur: null,
  });
}

// ---------------------------------------------------------------- sis
/** Yatay, yumuşak sis kuşağı (önbellekli tuval, yatayda döşenebilir) */
export function sisTuvali(w, h, tohum, renk = '#ECEAF0') {
  const c = tuval(w, h);
  const g = c.getContext('2d');
  const r = rng(tohum);
  g.filter = `blur(${Math.round(h * 0.12)}px)`;
  for (let i = 0; i < 26; i++) {
    const x = r() * w, y = h * r.ara(0.35, 0.7), rx = r.ara(w * 0.06, w * 0.16), ry = h * r.ara(0.12, 0.26);
    for (const dx of [-w, 0, w]) {
      g.fillStyle = rgba(renk, r.ara(0.35, 0.7));
      g.beginPath();
      g.ellipse(x + dx, y, rx, ry, 0, 0, TAU);
      g.fill();
    }
  }
  g.filter = 'none';
  return c;
}

// ---------------------------------------------------------------- yağmur
/** Eğik kalem çizgisi damlalar: x0..x1 arasında yUst'ten yAlt'a. Dünya koordinatında çizilir. */
export function yagmur(ctx, x0, x1, yUst, yAlt, t, { sayi = 90, hiz = 1500, egim = 0.16, boy = [40, 72], renk = '#5E6D8C', alfa = 0.5, kal = 1.6, tohum = 7, yogunluk = 1, sicrama = true } = {}) {
  const r = rng(tohum);
  const aralik = yAlt - yUst;
  ctx.save();
  for (let i = 0; i < sayi; i++) {
    const bx = r.ara(x0, x1), faz = r(), L = r.ara(boy[0], boy[1]), hz = hiz * r.ara(0.85, 1.15), a = alfa * r.ara(0.55, 1);
    const dz = r.ara(0, 34); // derinlik: zemine değdiği yer
    if (r() > yogunluk) continue;
    const yol = aralik + dz + L;
    const p = ((t * hz) / yol + faz) % 1;
    const y = yUst + p * yol - L;
    const yb = Math.min(y + L, yAlt + dz);
    const ya = Math.max(y, yUst);
    if (yb - ya > 4) {
      const x = bx - (y - yUst) * egim;
      const pts = [];
      for (let k = 0; k <= 6; k++) {
        const yy = lerp(ya, yb, k / 6);
        pts.push([x - (yy - y) * egim, yy]);
      }
      ctx.fillStyle = rgba(renk, a);
      darbe(ctx, pts, kal * r.ara(0.8, 1.2), { incelme: 0.4, sivri: 0.5 });
    }
    // sıçrama: zemine değdikten kısa süre sonra küçük açılan iki çizgi
    if (sicrama) {
      const vurus = (yAlt + dz - yUst + L) / yol; // bu p'de alt uç zemine değer
      const q = (p - (vurus - L / yol)) * yol / hz; // sn
      if (q > 0 && q < 0.14) {
        const u = q / 0.14;
        const sx = bx - (yAlt + dz - yUst) * egim, sy = yAlt + dz;
        ctx.fillStyle = rgba(renk, a * 0.8 * (1 - u));
        for (const sg of [-1, 1]) darbe(ctx, [[sx + sg * 2, sy], [sx + sg * (3 + 7 * u), sy - 6 * u - 2], [sx + sg * (4 + 10 * u), sy - 4 * u]], kal * 0.8, { incelme: 0.4 });
      }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- yürüyüş benzetimi (ayak kayması yok)
/**
 * Yürüyüşü baştan sona sayısal olarak yürütür: basan ayak dünyada sabit kalır (plant), salınan ayak bir sonraki
 * basış noktasına yay çizerek gider; gövde adım uzunluğu × faz hızıyla doğrusal ilerler. wF(t) 0..1 adım genliği,
 * omF(t) faz hızı (rad/sn). Döner: ornek(t) → { X, bacak: [{ xf, lift, u, basiyor }] }  (xf yerel, ileri +)
 */
export function yuruyusSim({ t0, t1, dt = 1 / 600, x0, yon, s, S0, wF, omF, L0 = 26 }) {
  const n = Math.ceil((t1 - t0) / dt) + 2;
  const X = new Float64Array(n);
  const XF = [new Float64Array(n), new Float64Array(n)], LF = [new Float64Array(n), new Float64Array(n)], UF = [new Float64Array(n), new Float64Array(n)], BF = [new Uint8Array(n), new Uint8Array(n)];
  const off = [Math.PI, 0]; // 0: arka (uzak) bacak, 1: ön (yakın) bacak
  const leg = off.map(() => ({ mod: null, plant: x0, bas: x0, son: x0 }));
  let x = x0, phi = 0;
  for (let k = 0; k < n; k++) {
    const t = t0 + k * dt;
    const w = wF(t), om = omF(t);
    const v = (yon * s * S0 * w * om) / Math.PI;
    for (let i = 0; i < 2; i++) {
      const L = leg[i];
      const ph = (((phi + off[i]) % TAU) + TAU) % TAU;
      const basiyor = ph < Math.PI;
      if (basiyor && L.mod === 'sal') L.plant = L.son;
      if (!basiyor && L.mod === 'bas') L.bas = L.plant;
      if (L.mod === null && !basiyor) L.bas = x0;
      L.mod = basiyor ? 'bas' : 'sal';
      let ayak, u, lift = 0;
      if (basiyor) { ayak = L.plant; u = ph / Math.PI; }
      else {
        u = (ph - Math.PI) / Math.PI;
        const kalan = om > 1e-6 ? (Math.PI * (1 - u)) / om : 0;
        const hedef = x + v * kalan + (yon * s * S0 * w) / 2;
        ayak = lerp(L.bas, hedef, ease.inOutSine(u));
        L.son = ayak;
        lift = L0 * clamp(w * 1.4) * Math.sin(Math.PI * u);
      }
      XF[i][k] = ((ayak - x) * yon) / s;
      LF[i][k] = lift;
      UF[i][k] = u;
      BF[i][k] = basiyor ? 1 : 0;
    }
    X[k] = x;
    x += v * dt;
    phi += om * dt;
  }
  const ornek = (t) => {
    const k = clamp(Math.round((t - t0) / dt), 0, n - 1);
    return { X: X[k], bacak: [0, 1].map((i) => ({ xf: XF[i][k], lift: LF[i][k], u: UF[i][k], basiyor: !!BF[i][k] })) };
  };
  ornek.sonX = X[n - 1];
  return ornek;
}

const LBACAK = OLCU.uyluk; // uyluk = baldır = 92
const RMAX = 2 * LBACAK * 0.995;
/** İki parçalı bacak ters kinematiği: kalçadan (0,0) bileğe (x, y aşağı +). Döner a1 (uyluk), a2 (baldır) mutlak açılar */
export function bacakIK(x, y) {
  let d = Math.hypot(x, y);
  if (d > RMAX) d = RMAX;
  const th = Math.acos(clamp(d / (2 * LBACAK), -1, 1));
  const al = Math.atan2(x, y);
  return [al + th, al - th];
}
/** Benzetim örneğinden yürüyüş pozu (insanYan pozu; serbest değil: motor en alçak bileği zemine oturtur) */
export function yuruyusPozu(o, { S0, kol = 0.24, govde = 0.09, bas = 0.16 } = {}) {
  const B = o.bacak;
  const basan = B[0].basiyor && !B[1].basiyor ? 0 : B[1].basiyor && !B[0].basiyor ? 1 : Math.abs(B[0].xf) > Math.abs(B[1].xf) ? 0 : 1;
  const Hh = Math.sqrt(Math.max(1, RMAX * RMAX - B[basan].xf * B[basan].xf));
  const kalca = [0, 0], diz = [0, 0], bilek = [0, 0];
  for (let i = 0; i < 2; i++) {
    const b = B[i];
    const [a1, a2] = bacakIK(b.xf, Hh - b.lift);
    let a3 = 0;
    if (!b.basiyor && b.lift > 0.5) a3 = -0.28 * Math.sin(TAU * b.u) * clamp(b.lift / 8);
    kalca[i] = a1; diz[i] = a2 - a1; bilek[i] = a3 - a2;
  }
  const s0 = S0 / 2;
  const omuz = [kol * clamp(B[1].xf / s0, -1.2, 1.2) - 0.02, kol * clamp(B[0].xf / s0, -1.2, 1.2) + 0.02];
  const dirsek = [0.16 + 0.12 * Math.max(0, omuz[0]), 0.16 + 0.12 * Math.max(0, omuz[1])];
  return { govde, bas, kalca, diz, bilek, omuz, dirsek, zipla: 0, el: [0, 0] };
}

// ---------------------------------------------------------------- iskelet ve zemin çözücü
const AYAK_NOKTA = [[-15, 6], [-12, 13], [12, 13], [37, 13], [39, 8], [31, 0], [6, -12], [-13, -9]];
/** insanYan ile aynı hesap (serbest poz, dy = 0): yerel eklemler (yüz +x, yukarı -y) */
export function iskelet(p) {
  const kalca = [0, -OLCU.kalca - (p.zipla || 0)];
  const kx = [-3, 3];
  const bacak = [0, 1].map((i) => {
    const a1 = p.kalca[i];
    const hx = kalca[0] + kx[i], hy = kalca[1];
    const diz = [hx + Math.sin(a1) * OLCU.uyluk, hy + Math.cos(a1) * OLCU.uyluk];
    const a2 = a1 + p.diz[i];
    const bil = [diz[0] + Math.sin(a2) * OLCU.baldir, diz[1] + Math.cos(a2) * OLCU.baldir];
    const a3 = a2 + p.bilek[i];
    const c = Math.cos(-a3), sn = Math.sin(-a3);
    const ayak = AYAK_NOKTA.map(([ax, ay]) => [bil[0] + ax * c - ay * sn, bil[1] - 2 + ax * sn + ay * c]);
    return { kalca: [hx, hy], diz, bil, a1, a2, a3, ayak };
  });
  return { kalca, bacak };
}
/** Pozun en alçak noktasını (diz kapağı, ayakkabı) zemine (y = 0) oturtan zipla değeri */
export function zeminZipla(p, { bacaklar = [0, 1] } = {}) {
  const sk = iskelet({ ...p, zipla: 0 });
  let enAlt = -Infinity;
  for (const i of bacaklar) {
    const b = sk.bacak[i];
    enAlt = Math.max(enAlt, b.diz[1] + 13.5, ...b.ayak.map((q) => q[1]));
  }
  return enAlt; // kalça y = -196 - zipla; en alt nokta 0 olsun: zipla = enAlt (zipla 0 iken enAlt kadar aşağıda)
}

// ---------------------------------------------------------------- dikenli çalı
/** Kalınlığı dipten uca incelen dal çizgisi (dolgu) + ince açık kenar ışığı */
export function dalCiz(ctx, pts, k0, k1, renk = '#463C47', isik = '#8E8290') {
  const n = pts.length;
  if (n < 2) return;
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = s[n - 1] || 1;
  const sol = [], sag = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let tx = pts[i1][0] - pts[i0][0], ty = pts[i1][1] - pts[i0][1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const u = s[i] / L;
    const h = lerp(k0, k1, u) / 2 * (u > 0.92 ? Math.max(0.25, (1 - u) / 0.08) : 1);
    sol.push([pts[i][0] - ty * h, pts[i][1] + tx * h]);
    sag.push([pts[i][0] + ty * h, pts[i][1] - tx * h]);
  }
  ctx.fillStyle = renk;
  ctx.beginPath();
  ctx.moveTo(sol[0][0], sol[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(sol[i][0], sol[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(sag[i][0], sag[i][1]);
  ctx.closePath();
  ctx.fill();
  if (isik && L > 12) {
    ctx.fillStyle = rgba(isik, 0.55);
    const ic = pts.map((p, i) => [lerp(p[0], sol[i][0], 0.45), lerp(p[1], sol[i][1], 0.45)]);
    darbe(ctx, ic.slice(0, Math.max(2, Math.floor(n * 0.85))), Math.max(0.6, k0 * 0.22), { incelme: 0.3 });
  }
}
/** Diken: dal üzerinde, uca doğru yatık küçük sivri üçgen */
export function dikenCiz(ctx, x, y, tx, ty, yan, boy, renk = '#463C47') {
  const nx = -ty * yan, ny = tx * yan;
  const b = boy * 0.32;
  ctx.fillStyle = renk;
  ctx.beginPath();
  ctx.moveTo(x - tx * b, y - ty * b);
  ctx.lineTo(x + tx * b, y + ty * b);
  ctx.lineTo(x + nx * boy + tx * boy * 0.55, y + ny * boy + ty * boy * 0.55);
  ctx.closePath();
  ctx.fill();
}
/** Bir dal yolunu büyüme oranına kadar dikenleriyle çizer. pts dünya koordinatında. */
export function dikenliDal(ctx, pts, buyume, { k0 = 4.2, k1 = 1.2, aralik = 13, dikenBoy = 6.5, renk = '#463C47', isik = '#8E8290', faz = 0 } = {}) {
  if (buyume <= 0 || pts.length < 2) return;
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = s[s.length - 1];
  const Lb = L * clamp(buyume);
  const kes = [];
  for (let i = 0; i < pts.length; i++) {
    if (s[i] <= Lb) kes.push(pts[i]);
    else {
      const u = (Lb - s[i - 1]) / (s[i] - s[i - 1] || 1);
      kes.push([lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]);
      break;
    }
  }
  if (kes.length < 2) return;
  dalCiz(ctx, kes, lerp(k1, k0, clamp(Lb / Math.max(L, 1)) * 0.6 + 0.4), k1, renk, isik);
  // dikenler
  let yan = 1, j = 1;
  for (let d = aralik * (0.6 + 0.4 * faz); d < Lb - 4; d += aralik) {
    while (j < pts.length - 1 && s[j] < d) j++;
    const u = (d - s[j - 1]) / (s[j] - s[j - 1] || 1);
    const x = lerp(pts[j - 1][0], pts[j][0], u), y = lerp(pts[j - 1][1], pts[j][1], u);
    let tx = pts[j][0] - pts[j - 1][0], ty = pts[j][1] - pts[j - 1][1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const g = clamp((Lb - d) / 14);
    const kal = lerp(k0, k1, d / L);
    dikenCiz(ctx, x, y, tx, ty, yan, (dikenBoy * (0.7 + 0.3 * kal / k0)) * ease.outBack(g, 1.5), renk);
    yan = -yan;
  }
}
/** Zeminden çıkan kıvrık dal yolu (yerel: kök (0,0), yukarı -y). yon: yatma yönü, kivrim: uçta kıvrılma */
export function dalYolu(boy, aci, kivrim, tohum) {
  const r = rng(tohum);
  const pts = [[0, 0]];
  let x = 0, y = 0, a = aci;
  const n = Math.ceil(boy / 4);
  const sapma = r.ara(-0.02, 0.02);
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    a += sapma + kivrim * Math.pow(u, 2.2) * 0.09 + 0.012 * Math.sin(i * 0.5 + tohum);
    x += Math.sin(a) * 4;
    y -= Math.cos(a) * 4;
    pts.push([x, y]);
  }
  return pts;
}
/** Kemik zinciri boyunca sarmal (yan görünüş): noktalar ve derinlik (+ önde). zincir: [[x,y],...] dünya */
export function sarmal(zincir, { tur = 2.5, r0 = 14, r1 = 10, faz = 0, adim = 3 } = {}) {
  const seg = [];
  let L = 0;
  for (let i = 1; i < zincir.length; i++) { const l = Math.hypot(zincir[i][0] - zincir[i - 1][0], zincir[i][1] - zincir[i - 1][1]); seg.push(l); L += l; }
  const n = Math.max(8, Math.ceil((L + tur * TAU * r0) / adim));
  const out = [];
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * L;
    let acc = 0, i = 0;
    while (i < seg.length - 1 && acc + seg[i] < d) { acc += seg[i]; i++; }
    const u = clamp((d - acc) / (seg[i] || 1));
    const ax = lerp(zincir[i][0], zincir[i + 1][0], u), ay = lerp(zincir[i][1], zincir[i + 1][1], u);
    let tx = zincir[i + 1][0] - zincir[i][0], ty = zincir[i + 1][1] - zincir[i][1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const th = faz + (k / n) * tur * TAU;
    const rr = lerp(r0, r1, k / n);
    out.push({ x: ax - ty * rr * Math.cos(th), y: ay + tx * rr * Math.cos(th), on: Math.sin(th) });
  }
  return out;
}
