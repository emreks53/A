// 1. cümle: "Kat'iyen bil ki: Hilkatin en yüksek gayesi ve fıtratın en yüce neticesi iman-ı billahtır."
// Boş filmde ufuk çizgisi çizilir, tepeler ve büyük ağaç belirir (Kat'iyen bil ki); yaratılış canlanır: çiçekler,
// kuşlar, bulutlar, güneş (Hilkatin); kamera ağacın en yüksek yerine çıkar (en yüksek gayesi); taçta meyveler belirir,
// tepede altın bir meyve olgunlaşır (fıtratın en yüce neticesi); meyve nura dönüşür (iman-ı billahtır).
import { W, H, clamp, lerp, ease, an, pop, rng, TAU, smooth, hashStr, tuval } from '../motor/temel.mjs';
import { oge, ogeCiz, ogeAcarak, gokTuvali, konturCiz, PALET, TON } from '../motor/kalem.mjs';
import { svg } from '../motor/sekil.mjs';
import { kameraYolu, kameraIle, salinim, ekranda } from '../motor/sahne.mjs';
import { kb, ks } from '../motor/zaman.mjs';
import { GRUPLAR, YAZI } from '../motor/altyazi.mjs';
import { insanYan, DURUS } from '../motor/insan.mjs';
import * as M from '../motor/motifler.mjs';

// ---------------------------------------------------------------- ağaç yardımcıları (yalnız bu sahne)
// Motorun ağacı gövdeyi ve dalları iki ayrı sprite olarak tarar; çatal yakasında iki taramanın ve iki buğunun üst
// üste bindiği yerde yatay bir doku dikişi oluşur. Burada gövde + dallar TEK sprite'ta, tek buğu ve tek taramayla
// çizilir: tarama çizgileri gövdeden dallara kesintisiz akar, ton her uzvu (gövde, dal) silindir gibi gölgeler ve
// uzuvlar arasında yumuşakça karışır. Geometri motorun ağacıyla aynıdır; yalnız sağ çatalın yakası yuvarlatılır
// (bkz. catalYakasi).
const kesir = (u) => {
  const v = clamp(u, -1, 1);
  const dif = Math.max(0, v * 0.6 + Math.sqrt(Math.max(0, 1 - v * v)) * 0.75);
  return 1 - 0.15 - dif * 0.85; // TON.silindir ile aynı ışık (sağdan)
};
// Çatal yakası: gövdenin üstünü ana dalların diplerine kesintisiz bağlayan dolgu. Motorun yakasının üstü düz bir
// kenardır; sol çatalda dalların içinde kalır, ama sağ dal geniş açıyla ayrıldığı için sağ çatalda bu düz kenar
// orta dalla sağ dal arasında açıkta kalıp kutu gibi bir basamak çizer. Burada yakanın sağ üstü, orta dalın sağ
// kenarıyla sağ dalın üst kenarının kesiştiği köşeye teğet bir kavisle (yuvarlatılmış V) kapanır: iki kenara da
// teğet olduğundan siluet konturu kırılmadan dal kenarlarından kavise akar.
function catalYakasi(A, gk, gy, egri, d = 30) {
  const sol = [egri - gk * 0.55, -gy - gk * 0.75], sag = [egri + gk * 0.55, -gy - gk * 0.75];
  const kenarlar = [`M${egri - gk * 0.31} ${-gy + gk * 0.9}C${egri - gk * 0.36} ${-gy + gk * 0.2} ${egri - gk * 0.6} ${-gy - gk * 0.35} ${sol[0]} ${sol[1]}`,
    `C${egri + gk * 0.6} ${-gy - gk * 0.35} ${egri + gk * 0.36} ${-gy + gk * 0.2} ${egri + gk * 0.31} ${-gy + gk * 0.9}Z`];
  const y0 = -gy + gk * 0.4;
  const ana = A.dallar.filter((q) => Math.abs(q.x - egri) < 1e-6 && Math.abs(q.y - y0) < 1e-6);
  const orta = ana.reduce((m, q) => (Math.abs(q.x2 - q.x) < Math.abs(m.x2 - m.x) ? q : m));
  const sagDal = ana.reduce((m, q) => (q.x2 > m.x2 ? q : m));
  // dal kenarı (karesel Bézier, alt yolla aynı): yan = +1 normal yönündeki kenar, -1 karşısı
  const kenarNok = (q, yan) => {
    const ang = Math.atan2(q.y2 - q.y, q.x2 - q.x);
    const nx = -Math.sin(ang) * yan, ny = Math.cos(ang) * yan;
    const p0 = [q.x + nx * q.k0 / 2, q.y + ny * q.k0 / 2], c = [q.bx + nx * (q.k0 + q.k1) / 4, q.by + ny * (q.k0 + q.k1) / 4], p2 = [q.x2 + nx * q.k1 / 2, q.y2 + ny * q.k1 / 2];
    const pts = [];
    for (let i = 0; i <= 600; i++) {
      const s = i / 600, a = (1 - s) * (1 - s), b = 2 * s * (1 - s), e = s * s;
      pts.push([a * p0[0] + b * c[0] + e * p2[0], a * p0[1] + b * c[1] + e * p2[1]]);
    }
    return { pts, nx };
  };
  const yanSec = (q, f) => (f(kenarNok(q, 1).nx) ? 1 : -1);
  const ok = kenarNok(orta, yanSec(orta, (nx) => nx > 0)).pts; // orta dalın sağ kenarı
  const sk = kenarNok(sagDal, yanSec(sagDal, (nx) => nx < 0)).pts; // sağ dalın üst (orta dala bakan) kenarı
  // iki kenarın kesişimi (dipten yukarı ilk kesişim)
  let X = null, io = 0, is = 0;
  for (let i = 0; i < ok.length - 1 && !X; i++) {
    const [ax, ay] = ok[i], [bx, by] = ok[i + 1];
    for (let j = 0; j < sk.length - 1; j++) {
      const [cx, cy] = sk[j], [dx, dy] = sk[j + 1];
      const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(den) < 1e-12) continue;
      const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
      const v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
      if (u >= 0 && u <= 1 && v >= 0 && v <= 1) { X = [ax + u * (bx - ax), ay + u * (by - ay)]; io = i; is = j; break; }
    }
  }
  if (!X) return kenarlar[0] + `L${sag[0]} ${sag[1]}` + kenarlar[1];
  // kesişimden kenar boyunca d birim yukarıdaki nokta
  const yuru = (pts, i0, bas) => {
    let kalan = d, p = bas;
    for (let i = i0 + 1; i < pts.length; i++) {
      const L = Math.hypot(pts[i][0] - p[0], pts[i][1] - p[1]);
      if (L >= kalan) return [p[0] + ((pts[i][0] - p[0]) * kalan) / L, p[1] + ((pts[i][1] - p[1]) * kalan) / L];
      kalan -= L; p = pts[i];
    }
    return p;
  };
  const P1 = yuru(ok, io, X), P2 = yuru(sk, is, X);
  // P2 yakanın sağ üst köşesini geçtiyse köşeye dönülmez (geri dönen kenar olmasın)
  const kose = P2[1] > sag[1] ? `L${sag[0]} ${sag[1]}` : '';
  return kenarlar[0] + `L${P1[0]} ${P1[1]}Q${X[0]} ${X[1]} ${P2[0]} ${P2[1]}` + kose + kenarlar[1];
}
function govdeDalTek(A, boy, tohum, olcek) {
  const gk = boy * 0.075, gy = boy * 0.5;
  const egri = A.dallar[0].x; // ana dallar gövde ekseninin tepesinden çıkar
  const govdeSekil = svg(`M${-gk * 1.25} 0C${-gk * 0.7} ${-boy * 0.02} ${-gk * 0.55} ${-boy * 0.06} ${-gk * 0.5} ${-boy * 0.12}C${-gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${-gk * 0.36 + egri} ${-gy * 0.8} ${-gk * 0.3 + egri} ${-gy}L${gk * 0.3 + egri} ${-gy}C${gk * 0.36 + egri} ${-gy * 0.8} ${gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${gk * 0.5} ${-boy * 0.12}C${gk * 0.55} ${-boy * 0.06} ${gk * 0.7} ${-boy * 0.02} ${gk * 1.3} 0Z`);
  const dalSekil = [];
  for (const d of A.dallar) {
    const ang = Math.atan2(d.y2 - d.y, d.x2 - d.x);
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    dalSekil.push(...svg(`M${d.x + nx * d.k0 / 2} ${d.y + ny * d.k0 / 2}Q${d.bx + nx * (d.k0 + d.k1) / 4} ${d.by + ny * (d.k0 + d.k1) / 4} ${d.x2 + nx * d.k1 / 2} ${d.y2 + ny * d.k1 / 2}A${d.k1 / 2} ${d.k1 / 2} 0 0 0 ${d.x2 - nx * d.k1 / 2} ${d.y2 - ny * d.k1 / 2}Q${d.bx - nx * (d.k0 + d.k1) / 4} ${d.by - ny * (d.k0 + d.k1) / 4} ${d.x - nx * d.k0 / 2} ${d.y - ny * d.k0 / 2}Z`));
  }
  dalSekil.push(...svg(catalYakasi(A, gk, gy, egri)));
  const butun = [...govdeSekil, ...dalSekil];
  M.yonDuzelt(butun); // tek dönüş yönü: üst üste binen alt yollar delik açmaz
  // gövdenin sol/sağ kenarı (her y için): gövde tonu kenarlara göre silindir
  const kenar = (d) => svg(d)[0].pts;
  const solK = kenar(`M${-gk * 1.25} 0C${-gk * 0.7} ${-boy * 0.02} ${-gk * 0.55} ${-boy * 0.06} ${-gk * 0.5} ${-boy * 0.12}C${-gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${-gk * 0.36 + egri} ${-gy * 0.8} ${-gk * 0.3 + egri} ${-gy}`);
  const sagK = kenar(`M${gk * 1.3} 0C${gk * 0.7} ${-boy * 0.02} ${gk * 0.55} ${-boy * 0.06} ${gk * 0.5} ${-boy * 0.12}C${gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${gk * 0.36 + egri} ${-gy * 0.8} ${gk * 0.3 + egri} ${-gy}`);
  const N = Math.ceil(gy) + 1;
  const tablo = (pts) => {
    const out = new Float64Array(N);
    let j = 0;
    for (let yi = 0; yi < N; yi++) {
      const y = -yi;
      while (j < pts.length - 2 && pts[j + 1][1] > y) j++;
      const [x0, y0] = pts[j], [x1, y1] = pts[j + 1];
      out[yi] = y0 === y1 ? x0 : lerp(x0, x1, clamp((y - y0) / (y1 - y0)));
    }
    return out;
  };
  const XL = tablo(solK), XR = tablo(sagK);
  const uzuvlar = A.dallar.map((d) => {
    const dx = d.x2 - d.x, dy = d.y2 - d.y, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L;
    const s = uy <= 0 ? 1 : -1; // normal sağa (ekranda +x) baksın: ışık sağdan
    return { x: d.x, y: d.y, L, ux, uy, nx: -uy * s, ny: ux * s, h0: d.k0 / 2, h1: d.k1 / 2 };
  });
  const K = 2.6; // uzuvlar arası yumuşak karışım keskinliği
  const tonF = (x, y) => {
    let sw = 0, st = 0;
    if (y <= 0 && y > -gy - gk) {
      const yi = Math.min(N - 1, Math.round(-y));
      const xl = XL[yi], xr = XR[yi];
      const u = (2 * x - xl - xr) / Math.max(1, xr - xl);
      let w = Math.exp(-K * u * u);
      if (y < -gy) w *= 1 - (-gy - y) / gk;
      sw += w; st += w * kesir(u);
    }
    for (const q of uzuvlar) {
      const px = x - q.x, py = y - q.y;
      const s = (px * q.ux + py * q.uy) / q.L;
      const sc = clamp(s);
      const hw = lerp(q.h0, q.h1, sc);
      const tas = s < 0 ? (-s * q.L) / q.h0 : s > 1 ? ((s - 1) * q.L) / q.h1 : 0;
      const u = (px * q.nx + py * q.ny) / hw;
      const w = Math.exp(-K * (u * u + tas * tas));
      if (w < 1e-5) continue;
      sw += w; st += w * kesir(u);
    }
    return sw > 1e-6 ? st / sw : 0.5;
  };
  const renk = { arka: '#D3B99A', tara: [[0, '#C29F7A'], [1, PALET.koyuKahve]], kontur: PALET.koyuKahve };
  // siluet konturu motorunkiyle aynı (kalınlık, renk, sınır kutusu: açılma ilerlemesi dolguyla eşleşir); yalnız
  // yakası bu sahnenin yuvarlatılmış çatalını izler
  const kontur = oge({
    ad: `s01-govde-dal-kontur-${boy}-${tohum}`, olcek, sekil: butun, zemin: null, arka: null, tarama: null, kontur: null,
    detay: (c) => M.siluetKontur(c, butun, renk.kontur, 2.1, 0.9),
  });
  const dolgu = oge({
    ad: `s01-govde-dal-tek-${boy}-${tohum}`, olcek, sekil: butun, arka: renk.arka, arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(tonF, 0.1, 0.03, tohum), renkler: renk.tara, yon: -Math.PI / 2, aralik: 2.8, boy: [16, 60], esikler: [0.15, 0.45, 0.72], alfa: 0.55 },
    kontur: null,
    detay: (c, api) => {
      // kabuk çizgileri: motorun gövdesindekiyle aynı tohum sırası (aynı yerlerde)
      const r = rng(tohum);
      r();
      for (let i = 0; i < 5; i++) {
        const x = r.ara(-gk * 0.35, gk * 0.35), y0 = -r.ara(boy * 0.05, gy * 0.8), L = r.ara(boy * 0.04, boy * 0.1);
        api.cizgi([[x, y0], [x + r.ara(-3, 3), y0 - L / 2], [x + r.ara(-4, 4), y0 - L]], { renk: renk.kontur, kal: 1.3, alfa: 0.5 });
      }
    },
  });
  return { dolgu, kontur };
}

// motorun yaprak kümesi biçimi (motifler.mjs bulutsuKume ile aynı)
function bulutsuKume(R, tohum) {
  const r = rng(tohum);
  const pts = [];
  const n = 9;
  const loblar = Array.from({ length: n }, () => r.ara(0.82, 1.08));
  for (let k = 0; k < 120; k++) {
    const a = (k / 120) * TAU;
    const f = (a / TAU) * n;
    const i = Math.floor(f), u = f - i;
    const l = loblar[i % n] * (1 - u) + loblar[(i + 1) % n] * u;
    const tumsek = 0.06 * Math.abs(Math.sin(f * Math.PI));
    pts.push([Math.cos(a) * R * (l + tumsek), Math.sin(a) * R * (l + tumsek) * 0.92]);
  }
  return [{ pts, kapali: true }];
}
// Taç yakın planı (z ≈ 2,4) için ince taramalı küme: aynı biçim, aynı ton, aynı kontur titremesi; çizgi kalınlığı,
// aralığı ve kontur yarıya iner (örtü/ortalama ton aynı kalır). Yakınlaşırken kaba kümeden buna yumuşakça geçilir:
// ekranda tarama ~1,5 px, kontur ~2,2 px kalır (büyütülmüş fırça gibi değil, ince saten kalem).
function inceKume(R, k, olcek) {
  // R: motorun yuvarladığı yarıçap (4'ün katı), k: küme sırası — kaba kümeyle aynı ton gürültüsü ve kontur tohumu
  const kaba = `agac2-kume-${Math.round(R)}-${k % 5}`;
  return oge({
    ad: `s01-kume-ince-${Math.round(R)}-${k % 5}`, tohum: hashStr(kaba), olcek, sekil: bulutsuKume(R, 30 + (k % 5)), arka: '#A9D49A', arkaAlfa: 0.85,
    tarama: { ton: TON.gurultulu(TON.kure(R * 0.25, -R * 0.3, R * 1.3, { lz: 0.8, ortam: 0.18 }), 0.1, 0.03, k), renkler: [[0, PALET.yesilAcik], [0.55, PALET.yesilOrta], [1, PALET.yesil]], yonF: (x, y) => -0.9 + 0.42 * clamp(x / R, -1.2, 1.2) + 0.12 * clamp(y / R, -1.2, 1.2), aralik: 1.5, boy: [7, 21], kal: 0.62, minKosu: 3, minUc: 4, esikler: [0.12, 0.42, 0.7], alfa: 0.55 },
    kontur: PALET.yesil, konturKal: 0.95, konturAlfa: 0.8,
  });
}

const T = {
  katiyen: kb('katiyen'), bil: kb('bil'), hilkat: kb('hilkatin'), yuksek: kb('yüksek'), gaye: kb('gayesi'),
  fitrat: kb('fıtratın'), yuce: kb('yüce'), netice: kb('neticesi'), iman: kb('imanı'), billah: kb('billahtır'), son: ks('billahtır'),
};

// dünya yerleşimi
const UFUK = 1480;
const AGAC = { x: 560, y: 1395, boy: 980 };
let gok, tepeArka, tepeOrta, tepeOn, A, kirmiziMeyve, altinMeyve, cicekler, gunes, bulutlar, cimenler, yaprakSp, yapraklar;
let altinYer; // altın meyvenin dünya konumu
let govdeTek, govdeKontur, inceKumeler, meyveler, yaziKutulari;
// kaba kümeden ince taramalı kümeye geçiş: kamera yakınlaşması (z) bu aralıktan geçerken (hızlı itme sırasında)
const INCE_Z = [1.52, 2.1];

// Altyazı bandı sakin kalsın: s01'deki her mananın yazı kutusu (buğusuyla). Elmalar ve süzülen yapraklar, yazı
// ekrandayken bu kutulara girmeyecek yerlere konur.
function yaziKutulariHesapla() {
  const c = tuval(8, 8).getContext('2d');
  c.font = YAZI.font(YAZI.boy);
  return GRUPLAR.filter((g) => g.bas < 7.8).map((g) => {
    const satirlar = g.satirlar.map((s) => s.map((p) => p.yazi).join(' '));
    const w = Math.max(...satirlar.map((s) => c.measureText(s).width));
    const y0 = YAZI.taban - (satirlar.length - 1) * YAZI.satirAra - YAZI.boy * 0.8;
    return { t0: g.bas - 0.2, t1: g.son + g.cikis + 0.1, x0: W / 2 - w / 2 - 40, x1: W / 2 + w / 2 + 40, y0: y0 - 34, y1: YAZI.taban + 44 };
  });
}
// genis: yatayda ek pay; bant: dikeyde bütün altyazı bandı (y 1380–1640)
function kutuda(sx, sy, r, t, { genis = 0, bant = false } = {}) {
  for (const k of yaziKutulari) {
    if (t < k.t0 || t > k.t1) continue;
    const y0 = bant ? Math.min(k.y0, 1380) : k.y0, y1 = bant ? Math.max(k.y1, 1640) : k.y1;
    if (sx + r > k.x0 - genis && sx - r < k.x1 + genis && sy + r > y0 && sy - r < y1) return true;
  }
  return false;
}
// elma i'nin büyüme ilerlemesi (agacCiz ile aynı)
const meyveU = (t, i) => clamp((an(t, T.fitrat, 0.9, ease.lin) - (i % 5) * 0.08) / 0.5);
function elmaYaziyaGirer(x, y, i) {
  for (let f = Math.floor(T.fitrat * 30); f <= 7.85 * 30; f++) {
    const t = f / 30;
    if (meyveU(t, i) <= 0) continue;
    const [sx, sy, z] = ekranda(kam(t), AGAC.x + x, AGAC.y + y);
    if (kutuda(sx, sy, 18 * z + 6, t, { genis: 70, bant: true })) return true;
  }
  return false;
}
// süzülen yaprağın t anındaki yeri ve saydamlığı
function yaprakDurum(y, t) {
  const u = t - y.t0;
  if (u <= 0 || u > 7) return null;
  return {
    a: Math.min(1, u / 0.4) * Math.min(1, (7 - u) / 0.8),
    x: y.x + Math.sin(u * 1.3 + y.f) * y.sal + u * 18,
    y: y.y + u * y.hiz,
    r: y.r0 + Math.sin(u * 2.1 + y.f) * 0.9,
  };
}
function yaprakYaziyaGirer(y) {
  for (let f = Math.floor(y.t0 * 30); f <= 7.85 * 30; f++) {
    const t = f / 30, d = yaprakDurum(y, t);
    if (!d || d.a < 0.03) continue;
    const [sx, sy, z] = ekranda(kam(t), d.x, d.y);
    if (kutuda(sx, sy, 17 * z + 6, t, { genis: 30 })) return true;
  }
  return false;
}

const kamera = () => kameraYolu([
  { t: 0, x: 540, y: 990, z: 1.0 },
  { t: T.hilkat, x: 540, y: 975, z: 1.02 },
  { t: T.gaye + 0.6, x: 548, y: 660, z: 1.22, e: ease.inOutCubic },
  { t: T.netice + 0.45, x: altinYer[0], y: altinYer[1] + 330 / 1.5, z: 1.5, e: ease.inOutCubic },
  { t: T.son + 0.3, x: altinYer[0], y: altinYer[1] + 100 / 2.4, z: 2.4, e: ease.inOutQuart },
  { t: 7.8, x: altinYer[0], y: altinYer[1] + 100 / 2.5, z: 2.5, e: ease.lin },
]);
let kam;

// Meyve → nur dönüşümü: "iman-ı"nın (5,82) başında 6 karelik (0,2 sn) çapraz geçiş. Meyve şişip ışıyarak solar;
// nur küresi meyvenin ekrandaki boyundan doğar, saydamlıktan belirir ve büyür; ortada kısa bir parıltı dönüşümü
// örter. Yarıçap meyveninkinden nurun büyüme eğrisine tek tümsekli bir hızla geçer (durgun başlar, ~5,9 sn'de en
// hızlı, 6,2 sn'de eski eğriye hızıyla birlikte tam oturur): sıçrama ya da ani hız değişimi olmaz; 6,2 sn'den sonrası
// aynen eskisi gibidir. z: kamera yakınlığı (meyvenin ekrandaki boyu için).
function nurDonusum(t, z) {
  const t0 = T.iman - 0.1;
  const k = an(t, t0, 0.2, ease.lin);
  const nur = an(t, t0, 1.2, ease.outCubic); // parlaklık ve nurun kendi büyümesi
  const rNur = lerp(40, 150, nur) * (1 + 0.04 * an(t, T.billah, 1.2, ease.inOutSine));
  const rMeyve = 22 * z; // altın meyvenin (r = 22) ekrandaki yarıçapı
  const u = an(t, t0, 0.52, ease.lin);
  const w = 1 - (1 - u) ** 3 * (1 + 3 * u); // hızı 12u(1-u)²: başta ve sonda sıfır
  const r = lerp(rMeyve, rNur, w);
  return {
    nur, rMeyve, r,
    rM: lerp(rMeyve, r, 0.8), // meyve nurdan biraz geride şişer: sapı nurun dışına taşmaz
    nurA: smooth(0, 0.6, k),
    meyveA: 1 - smooth(0.3, 0.85, k),
    parilti: Math.sin(Math.PI * k) ** 2,
  };
}

// Ağacı çizer (motorun agacCiz'iyle aynı büyüme): gövde+dallar tek sprite, siluet konturu aynı ilerlemeyle açılır;
// kümeler patlar; ince: 0..1 yakın plan kümelerine geçiş; elmalar yerleşmiş listeden (kendi zamanlamalarıyla).
function agacCiz(ctx, x, y, { buyume = 1, yaprak = 1, t = 0, ince = 0 } = {}) {
  ctx.save();
  ctx.translate(x, y);
  if (buyume > 0) {
    // gövde dipten çatala (buyume 0..0,55), dallar çatallardan uçlara (0,55..0,92) açılır: kesintisiz
    const go = A.govdeOran ?? 0.5;
    const pk = buyume <= 0.55 ? (buyume / 0.55) * go : go + (1 - go) * clamp((buyume - 0.55) / 0.37);
    ogeAcarak(ctx, govdeTek, 0, 0, pk, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.08 });
    ogeAcarak(ctx, govdeKontur, 0, 0, pk, { mod: 'sil', yon: -Math.PI / 2, yumusak: 0.08 });
  }
  A.kumeler.forEach((k, i) => {
    const u = clamp((yaprak - k.t * 0.5) / 0.5);
    if (u <= 0) return;
    const o = { s: ease.outBack(u, 1.4), r: Math.sin(t * 1.1 + i) * 0.012 };
    const ic = inceKumeler[i];
    if (ic && ince > 0) {
      ogeCiz(ctx, ic, k.x, k.y, o);
      if (ince < 1) ogeCiz(ctx, k.oge, k.x, k.y, { ...o, alfa: 1 - ince });
    } else ogeCiz(ctx, k.oge, k.x, k.y, o);
  });
  for (const m of meyveler) {
    const u = meyveU(t, m.i);
    if (u > 0) ogeCiz(ctx, kirmiziMeyve, m.x, m.y, { s: ease.outBack(u, 1.8) });
  }
  ctx.restore();
}

export default {
  sesler: [
    { t: T.katiyen, tur: 'kalem', guc: 0.6, sure: 0.7 },
    { t: T.bil + 0.1, tur: 'firca', guc: 0.4 },
    { t: T.hilkat, tur: 'pop', guc: 0.35, tekrar: 6, ara: 0.07 },
    { t: T.hilkat + 0.2, tur: 'kanat', guc: 0.25 },
    { t: T.yuksek, tur: 'whoosh', guc: 0.35, sure: 1.2 },
    { t: T.fitrat + 0.05, tur: 'pop', guc: 0.3, tekrar: 5, ara: 0.08 },
    { t: T.yuce + 0.1, tur: 'parilti', guc: 0.35 },
    { t: T.iman, tur: 'nur', guc: 0.55, sure: 2.2 },
  ],
  hazirla() {
    gok = gokTuvali({ w: 1500, h: 2300, ad: 's01-gok2', olcek: 1.25 });
    tepeArka = M.tepeOge({ w: 1700, h: 600, tohum: 11, renk: 'yesil', dalga: 70, ad: 's01-tepe-arka', olcek: 1 });
    tepeOrta = M.tepeOge({ w: 1500, h: 1000, tohum: 5, renk: 'yesil', dalga: 90, ad: 's01-tepe-orta', olcek: 1.5 });
    tepeOn = M.tepeOge({ w: 1600, h: 900, tohum: 8, renk: 'koyu', dalga: 60, ad: 's01-tepe-on', olcek: 1 });
    A = M.agac({ boy: AGAC.boy, tohum: 21, olcek: 3.0 }); // taca yakınlaşmada (z 2.5) keskin kalsın
    ({ dolgu: govdeTek, kontur: govdeKontur } = govdeDalTek(A, AGAC.boy, 21, 3.0));
    // yakın planda kadraja giren kümelerin ince taramalı eşleri (kadraj dışındakiler kaba kalır)
    {
      const camI = { x: AGAC.x + A.tepe[0], z: INCE_Z[0] };
      const yarim = W / 2 / camI.z + 40;
      inceKumeler = A.kumeler.map((k, i) => {
        const x = AGAC.x + k.x;
        if (x + k.R * 1.15 < camI.x - yarim || x - k.R * 1.15 > camI.x + yarim) return null;
        return inceKume(Math.round(k.R / 4) * 4, i, 3.0);
      });
    }
    kirmiziMeyve = M.meyveOge(15, 2.6, 'kirmizi');
    altinMeyve = M.meyveOge(22, 3.5, 'altin');
    altinYer = [AGAC.x + A.tepe[0], AGAC.y + A.tepe[1] + 58];
    kam = kamera();
    yaziKutulari = yaziKutulariHesapla();
    // elmalar: altyazı ekrandayken yazının arkasına/yanına (bantta) düşecek olanlar aynı tacın önündeki kümelerde,
    // yazıya hiç girmeyen ve öteki elmalardan olabildiğince uzak bir yere taşınır (her elma kendi zamanlamasını
    // korur; yükseklik dağılımı aşağı yukarı aynı kalır). Yer bulunamazsa o elma çizilmez.
    {
      const re = rng(303);
      const on = A.kumeler.slice(Math.floor(A.kumeler.length * 0.35));
      const altinYerel = [altinYer[0] - AGAC.x, altinYer[1] - AGAC.y];
      meyveler = [];
      const tasinacak = [];
      A.meyveler.forEach(([x, y], i) => (elmaYaziyaGirer(x, y, i) ? tasinacak.push({ x, y, i }) : meyveler.push({ x, y, i })));
      for (const m of tasinacak) {
        let iyi = null, iyiP = -Infinity;
        for (let d = 0; d < 400; d++) {
          const k = on[Math.floor(re() * on.length)];
          const nx = k.x + re.ara(-0.5, 0.5) * k.R, ny = k.y + re.ara(-0.1, 0.55) * k.R;
          if (Math.abs(ny - m.y) > 160 || Math.hypot(nx - altinYerel[0], ny - altinYerel[1]) < 130) continue;
          const ara = Math.min(...meyveler.map((o) => Math.hypot(o.x - nx, o.y - ny)), 999);
          if (ara < 80) continue;
          const puan = ara - 0.25 * Math.hypot(nx - m.x, ny - m.y);
          if (puan > iyiP && !elmaYaziyaGirer(nx, ny, m.i)) { iyi = { x: nx, y: ny, i: m.i }; iyiP = puan; }
        }
        if (iyi) meyveler.push(iyi);
      }
    }
    gunes = M.gunesOge(58, 1.2);
    bulutlar = [M.bulutOge(300, 3, 1.2), M.bulutOge(220, 7, 1.2), M.bulutOge(260, 12, 1.2)];
    const r = rng(101);
    cicekler = [];
    for (let i = 0; i < 16; i++) {
      const x = r.ara(-80, 1160);
      if (Math.abs(x - AGAC.x) < 70) continue;
      cicekler.push({ x, y: UFUK + 20 + r.ara(0, 260) * (i % 2 ? 1 : 0.4), s: r.ara(0.55, 1), t: T.hilkat + i * 0.045 + r.ara(0, 0.1), renk: r.sec(['beyaz', 'beyaz', 'pembe', 'sari']) });
    }
    cicekler.sort((a, b) => a.y - b.y);
    cicekler.forEach((c) => (c.oge = M.cicekOge(26, 1.6, c.renk)));
    // tacın çevresinde süzülen yapraklar (yaratılışın canlılığı)
    yaprakSp = [M.yaprakOge(30, 13, 2, 'yesil'), M.yaprakOge(26, 11, 2, 'koyu')];
    // yapraklar altyazının arkasından geçmesin: yazıya giren aday yerine yenisi seçilir
    const ry = rng(77);
    yapraklar = [];
    for (let i = 0; i < 9; i++) {
      let y;
      for (let d = 0; d < 60; d++) {
        y = { x: AGAC.x + ry.ara(-380, 380), y: AGAC.y - AGAC.boy * ry.ara(0.55, 0.95), t0: T.hilkat + 0.6 + i * 0.35, hiz: ry.ara(55, 85), sal: ry.ara(30, 60), f: ry() * TAU, r0: ry() * TAU, sp: i % 2 };
        if (!yaprakYaziyaGirer(y)) break;
        y = null;
      }
      if (y) yapraklar.push(y);
    }
  },
  ciz(ctx, t) {
    const c = kam(t);
    const sl = salinim(t, 3, 0.3, 4);
    const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r };
    const giris = an(t, 0.15, 1.1, ease.inOutSine);

    // gök (paralaks 0.35), güneş yükselir
    kameraIle(ctx, cam, (g) => {
      g.globalAlpha = giris;
      ogeCiz(g, gok, -210, -260);
      const gy = lerp(1250, 760, an(t, T.hilkat - 0.1, 2.2, ease.outCubic));
      // güneş: taca yakınlaşma başlarken söner (kadraj kenarında yarım kalıp ikinci bir nur gibi okunmasın)
      const gunesA = 1 - an(t, T.netice - 0.3, 0.7, ease.inOutSine);
      ogeCiz(g, gunes, 980, gy, { alfa: an(t, T.hilkat - 0.2, 0.8) * gunesA });
      M.hale(g, 980, gy, 260, '#FFF4D2', 0.5 * an(t, T.hilkat, 1.2) * gunesA);
      const bx = [[180, 560], [820, 380], [1180, 640]];
      bulutlar.forEach((b, i) => {
        const gir = an(t, T.hilkat + 0.1 * i, 1.4, ease.outCubic);
        ogeCiz(g, b, bx[i][0] + (1 - gir) * (i % 2 ? 300 : -300) + t * 6, bx[i][1], { alfa: gir });
      });
      g.globalAlpha = 1;
    }, 0.35);

    // kuşlar (Hilkatin): soldan sağa süzülür
    kameraIle(ctx, cam, (g) => {
      for (let i = 0; i < 4; i++) {
        const u = (t - T.hilkat - i * 0.18) / 5.5;
        if (u <= 0 || u >= 1) continue;
        const x = lerp(-120, 1250, u) + i * 40, y = 760 - i * 38 + Math.sin(u * 7 + i) * 18;
        M.kus(g, x, y, 1.5 - i * 0.12, t, { faz: i * 1.3, alfa: an(t, T.hilkat + i * 0.18, 0.3) });
      }
    }, 0.6);

    // arka tepe (paralaks 0.6)
    kameraIle(ctx, cam, (g) => {
      ogeAcarak(g, tepeArka, -300, UFUK - 120, an(t, 0.3, 0.7, ease.inOutCubic), { mod: 'sil', yon: 0, yumusak: 0.15 });
    }, 0.6);

    // ufuk çizgisi: Kat'iyen'de soldan sağa çizilir
    const cizgi = an(t, T.katiyen, 0.55, ease.inOutCubic);
    if (cizgi > 0 && cizgi < 1.01) {
      kameraIle(ctx, cam, (g) => {
        konturCiz(g, [[-200, UFUK - 14], [1300, UFUK - 30]], { renk: PALET.yesil, kal: 2.4, alfa: 0.8 * (1 - an(t, 1.2, 0.5)), kapali: false, cizim: cizgi, tohum: 5 });
      }, 1);
    }

    // orta tepe + ağaç + çiçekler (paralaks 1)
    kameraIle(ctx, cam, (g) => {
      ogeAcarak(g, tepeOrta, -200, UFUK - 60, an(t, 0.38, 0.7, ease.inOutCubic), { mod: 'sil', yon: 0, yumusak: 0.12 });
      const buyume = an(t, T.bil - 0.05, 1.1, ease.outCubic);
      const yaprak = an(t, T.bil + 0.72, 1.0, ease.lin); // dallar tamamlanınca taç patlar
      agacCiz(g, AGAC.x, AGAC.y, { buyume, yaprak, t, ince: smooth(INCE_Z[0], INCE_Z[1], c.z) });
      // altın meyve: en yüce netice; "iman-ı"da şişip ışıyarak nura dönüşür (nurDonusum)
      const am = pop(t, T.yuce, 0.7);
      if (am > 0) {
        const nd = nurDonusum(t, cam.z);
        M.hale(g, altinYer[0], altinYer[1], 90 + 60 * am, '#FFE9A6', 0.55 * am);
        if (nd.meyveA > 0) ogeCiz(g, altinMeyve, altinYer[0], altinYer[1], { s: (am * nd.rM) / nd.rMeyve, alfa: nd.meyveA });
      }
      for (const cc of cicekler) {
        if (cc.y > UFUK + 120) continue;
        const u = pop(t, cc.t, 0.45);
        if (u > 0) ogeCiz(g, cc.oge, cc.x, cc.y, { s: u * cc.s, r: Math.sin(t * 1.4 + cc.x) * 0.04 });
      }
    }, 1);

    // tacın çevresinde süzülen yapraklar ve dönen iki kuş; güneşten taca ince ışık huzmeleri
    kameraIle(ctx, cam, (g) => {
      for (const y of yapraklar) {
        const d = yaprakDurum(y, t);
        if (d) ogeCiz(g, yaprakSp[y.sp], d.x, d.y, { r: d.r, alfa: d.a * 0.95 });
      }
      for (let i = 0; i < 2; i++) {
        const u = t - (T.yuksek + 0.2 + i * 0.5);
        if (u <= 0) continue;
        const a = Math.min(1, u / 0.5) * (1 - an(t, T.iman - 0.3, 0.6));
        const ang = u * 0.9 + i * Math.PI;
        const cx = AGAC.x + Math.cos(ang) * (440 - i * 60), cy = AGAC.y - AGAC.boy * 0.78 + Math.sin(ang) * 120;
        M.kus(g, cx, cy, 1.15 - i * 0.15, t, { faz: i * 2.1, yon: Math.sin(ang) > 0 ? -1 : 1, alfa: a });
      }
    }, 1);
    const huzme = an(t, T.fitrat - 0.2, 1.4, ease.inOutSine) * (1 - an(t, T.iman + 0.2, 0.8));
    if (huzme > 0) {
      // sağ üstten taca vuran sıcak, yumuşak gün ışığı (çizgi değil, geniş buğu)
      M.hale(ctx, W * 1.05, -H * 0.05, H * 0.85, '#FFF1C8', 0.34 * huzme);
    }

    // ön tepe + insan + ön çiçekler (paralaks 1.15)
    kameraIle(ctx, cam, (g) => {
      ogeAcarak(g, tepeOn, -250, UFUK + 150, an(t, 0.45, 0.7, ease.inOutCubic), { mod: 'sil', yon: 0, yumusak: 0.12 });
      const ia = an(t, T.bil, 0.5);
      if (ia > 0) {
        const bakis = an(t, T.hilkat + 0.6, 1.2);
        const poz = { ...DURUS, bas: lerp(0, -0.32, bakis), govde: lerp(0, -0.04, bakis), omuz: [-0.05, lerp(0.06, 0.1, bakis)] };
        insanYan(g, 205, UFUK + 205, poz, { s: 0.62, olcek: 1, alfa: ia });
      }
      for (const cc of cicekler) {
        if (cc.y <= UFUK + 120) continue;
        const u = pop(t, cc.t, 0.45);
        if (u > 0) ogeCiz(g, cc.oge, cc.x, cc.y + 40, { s: u * cc.s * 1.15, r: Math.sin(t * 1.4 + cc.x) * 0.04 });
      }
    }, 1.15);

    // altyazı bandı: taç (sık, koyu tarama) yazının arkasına geldiğinde, yazı ekrandayken arkasına geniş, çok yumuşak
    // açık bir buğu (motorun yazı buğusunun devamı): bant sakinleşir, sahne kararmaz ya da şeritlenmez.
    for (const k of yaziKutulari) {
      if (t < k.t0 || t > k.t1 + 0.2) continue;
      const a = smooth(k.t0, k.t0 + 0.35, t) * (1 - smooth(k.t1 - 0.3, k.t1 + 0.15, t)) * smooth(2.9, 3.5, t);
      if (a <= 0.003) continue;
      const rx = (k.x1 - k.x0) / 2 + 150, ry = 125, cy = YAZI.taban - 22;
      ctx.save();
      ctx.translate(W / 2, cy);
      ctx.scale(rx / ry, 1);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
      g.addColorStop(0, `rgba(249,250,246,${0.3 * a})`);
      g.addColorStop(0.55, `rgba(249,250,246,${0.2 * a})`);
      g.addColorStop(1, 'rgba(249,250,246,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-ry, -ry, ry * 2, ry * 2);
      ctx.restore();
    }

    // iman: altın meyve nura dönüşür (ekran uzayında keskin çizilir)
    const nd = nurDonusum(t, cam.z);
    const nur = nd.nur;
    if (nur > 0) {
      const [sx, sy] = ekranda(cam, altinYer[0], altinYer[1]);
      // sahne hafifçe ışığa boğulur
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(255,248,226,${0.16 * nur})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      M.nurKuresi(ctx, sx, sy, nd.r, t, { guc: nur, olcek: 1.3, alfa: nd.nurA });
      if (nd.parilti > 0.002) {
        // dönüşüm parıltısı: meyve ışıyıp nura geçerken kısa, yumuşak bir ışık kabarması
        M.hale(ctx, sx, sy, nd.r * 3.2, '#FFF1C4', 0.4 * nd.parilti);
        M.hale(ctx, sx, sy, nd.r * 1.3, '#FFFFFF', 0.55 * nd.parilti);
      }
      M.parcaciklar(ctx, sx - 380, sy - 520, 760, 1040, t, { sayi: 34, alfa: 0.7 * nur, tohum: 9 });
    }
  },
};
