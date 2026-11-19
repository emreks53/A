// s09 yardımcısı: kuşbakışı sade erkek figür ve yazısız yön levhaları (direk + ok biçimli tahta, yere düşen gölge).
// Kuşbakışı adam açıkça bir insan olarak okunmalı (göz, böcek ya da amblem gibi değil):
//  - omuzlar: uçları yuvarlak, arkası hafif dolgun bir gövde (badem değil); kum rengi gömlek (zeminden koyu);
//  - kollar gövdenin iki yanında ayrı parçalar (gömlek kollu omuz başı + ten rengi ince ön kol + el), kendi konturlarıyla;
//  - baş gövdenin önüne doğru; saç düz (geriye taranmış) taramalı, önde alın ve burun ucu görünür (bakış yönü);
//  - duruşta ayaklar omuzların altında gizlidir; yürürken mavi-gri paçalı bacaklar makas gibi açılır (basan ayak yerde kalır);
//  - "ellerini başına koyar": asimetrik (bir el tepede, öbürü şakakta), dirsekler farklı açılarda; ten rengi ön kollar
//    dirsekten başa uzanan ayrı uzuvlar olarak okunur (siluet hilal, kanat ya da göz gibi tek parça bir simge olmaz).
// Yerel koordinat: figür -y yönüne bakar, (0,0) omuz ortası; birim = labirent dünya birimi (s = 1).
import { tuval, clamp, lerp, TAU, rgba } from '../motor/temel.mjs';
import { oge, ogeCiz, TON } from '../motor/kalem.mjs';
import { svg, elips } from '../motor/sekil.mjs';

export const FR = {
  gomlek: { arka: '#CDB78E', tara: [[0, '#C6AF85'], [0.6, '#A88F66'], [1, '#7F6745']], kontur: '#5A4733' },
  pantolon: { arka: '#9BA7C2', tara: [[0, '#94A1BF'], [0.6, '#76839F'], [1, '#56617C']], kontur: '#39425A' },
  sac: { arka: '#8A7360', tara: [[0, '#927A66'], [1, '#5A4838']], kontur: '#3E3128' },
  ten: { arka: '#EECFB6', tara: [[0, '#EAC6A8'], [1, '#C49171']], kontur: '#8C6650' },
  // ön kol (kısa kollu gömlek): ten, elden biraz koyu (kalkık kolun gölgesinde); el ondan seçilsin
  onkol: { arka: '#E2B99B', tara: [[0, '#DDB394'], [1, '#B27F60']], kontur: '#7E5843' },
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
  // küçük ölçekte kontur ekranda ~0,8 px'in altına inmesin (siluet seçilsin)
  return oge({
    ad: 's09-tepe2-' + ad, olcek, sekil, arka: R.arka, arkaAlfa: 0.82, arkaBulanik: 3,
    tarama: { ton: ton || TON.kure(-8, -8, 40, { lx: -0.5, ly: -0.6, lz: 0.62 }), renkler: R.tara, yon, yonF, aralik, boy, kal, alfa: 0.5, esikler: [0.15, 0.5, 0.78], minUc: 4 },
    kontur: R.kontur, konturKal: Math.max(1.9, 0.8 / olcek), titreme: 0.25,
  });
}

const kapsul = (r0, L, r1) => svg(`M${-r0} 0A${r0} ${r0} 0 0 1 ${r0} 0L${r1} ${L}A${r1} ${r1} 0 0 1 ${-r1} ${L}Z`);

// ölçüler (yerel birim)
export const TEPE = {
  omuzX: 33, // omuz eklemi (x)
  kalcaX: 10, // kalça eklemi (x)
  ayakX: 12, // duruşta ayak ortası (x)
  ayakY: 4, // duruşta ayak ortası (y): ayaklar omuzların altında, gizli (baş yanında koyu "kulak" gibi görünmesin);
  //          yürürken öndeki ayak ve paça gövdenin önünden, arkadaki ayak arkasından çıkar
  basY: -10, // baş ortası: gövdenin önüne doğru (omuzlar başın arkasında kalır; uzaktan göz gibi okunmasın)
  KOL: 28, ONKOL: 30, BACAK: 40,
};

const YEN = 5; // gömlek kolunun (yen) omuzdan boyu
const parcalar = new Map();
function adamParcalari(olcek) {
  if (parcalar.has(olcek)) return parcalar.get(olcek);
  const P = {};
  // gövde (omuzlar): uçları yuvarlak, önü düz, arkası (kürek kemikleri) dolgun; 76 × 38
  P.govde = parca('govde', svg('M-25 -14C-10 -15.5 10 -15.5 25 -14C34 -13 38 -7 38 1C38 11 32 18 22 20C9 22.5 -9 22.5 -22 20C-32 18 -38 11 -38 1C-38 -7 -34 -13 -25 -14Z'), FR.gomlek, olcek,
    { ton: TON.gurultulu(TON.kure(-12, -9, 48, { lx: -0.5, ly: -0.6, lz: 0.6, ortam: 0.1 }), 0.05, 0.05, 3), yon: 0.25, aralik: 2.6, boy: [10, 28] });
  P.bas = parca('bas', elips(0, 0, 15.5, 18), FR.ten, olcek, { ton: TON.kure(-5, -7, 21) });
  P.burun = parca('burun', elips(0, 0, 3.6, 4.2), FR.ten, olcek, { ton: TON.kure(-1, -1, 5) });
  P.kulak = parca('kulak', elips(0, 0, 3.2, 5), FR.ten, olcek, { ton: TON.kure(-1, -1, 6) });
  // saç: başın üstünü ve arkasını örter, önde alnın ince bir hilali kalır; geriye taranmış düz tarama (girdap yok)
  P.sac = parca('sac', svg('M0 -17C10 -17 16.5 -11 16.5 -1C16.5 9 10 15 0 15C-10 15 -16.5 9 -16.5 -1C-16.5 -11 -10 -17 0 -17Z'), FR.sac, olcek,
    { ton: TON.kure(-5, -6, 21, { lx: -0.5, ly: -0.6, lz: 0.6, ortam: 0.22 }), yonF: (x, y) => Math.atan2(y + 60, x * 0.6), aralik: 2.3, boy: [10, 22] });
  // kol: üst kol (omuz başı, gömlek), ön kol (gömlek kolu), el (ten)
  // üst kol: ten rengi (kısa kollu gömlek), üstünde omuz başını örten gömlek kolu (sabit boylu kapak). Kollar kalkınca
  // omuzdan dirseğe ve dirsekten başa uzanan ten rengi iki parça (dirsek kırığı görünür) olarak okunur; gövdeyle tek
  // bir kum rengi kütleye (hilal) kaynaşmaz.
  P.kol = parca('kol', kapsul(7.4, TEPE.KOL, 6.2), FR.onkol, olcek, { ton: TON.silindir(-7.4, 7.4, { sag: false }), yon: Math.PI / 2, boy: [8, 20] });
  P.yen = parca('yen', kapsul(9.4, YEN, 8.8), FR.gomlek, olcek, { ton: TON.silindir(-9.4, 9.4, { sag: false }), yon: Math.PI / 2, boy: [8, 20] });
  // ön kol: kısa kollu gömlek, ten rengi (gövdeden ve omuz başından ayrı bir uzuv olarak seçilsin), daha ince
  P.onkol = parca('onkol', kapsul(5.6, TEPE.ONKOL, 4.8), FR.onkol, olcek, { ton: TON.silindir(-5.6, 5.6, { sag: false }), yon: Math.PI / 2, boy: [8, 20] });
  P.el = parca('el', elips(0, 0, 6.6, 7.4), FR.ten, olcek, { ton: TON.kure(-2, -2, 8) });
  // bacak (paça) ve ayakkabı
  P.bacak = parca('bacak', kapsul(8.6, TEPE.BACAK, 7.4), FR.pantolon, olcek, { ton: TON.silindir(-8.6, 8.6, { sag: false }), yon: Math.PI / 2, boy: [8, 22] });
  P.ayak = parca('ayak', svg('M0 -16C5.5 -16 8 -9 8 -1C8 7 5.5 11 0 11C-5.5 11 -8 7 -8 -1C-8 -9 -5.5 -16 0 -16Z'), FR.ayakkabi, olcek, { ton: TON.kure(-3, -6, 15), boy: [6, 14] });
  parcalar.set(olcek, P);
  return P;
}

let golgeT = null;
function golgeTuvali() {
  if (golgeT) return golgeT;
  golgeT = tuval(200, 160);
  const g = golgeT.getContext('2d');
  g.filter = 'blur(6px)';
  g.fillStyle = 'rgba(70,62,92,0.5)';
  g.beginPath();
  g.ellipse(100, 81, 46, 22, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(100, 75, 17, 19, 0, 0, TAU);
  g.fill();
  return golgeT;
}

/** a'dan b'ye uzanan uzuv sprite'ı (sprite (0,0)'dan +y yönüne Lref boyunda) */
function uzuv(ctx, sp, ax, ay, bx, by, Lref) {
  const dx = bx - ax, dy = by - ay;
  const L = Math.hypot(dx, dy);
  if (L < 0.01) { ogeCiz(ctx, sp, ax, ay, { sx: 1, sy: 0.3 }); return; }
  const a = Math.atan2(dy, dx) - Math.PI / 2;
  ogeCiz(ctx, sp, ax, ay, { r: a, sx: 1, sy: clamp(L / Lref, 0.3, 1.7) });
}

/**
 * Ayak profili: bir yürüyüş döngüsünde ayağın gövdeye göre ileri ötelemesi (−1..1 → ×genlik). Basma evresinde
 * (yarım döngü) doğrusal geriye gider (ayak yerde, gövde ilerler), salınımda Hermite eğrisiyle öne gelir (uçlarda
 * hız sürekli: ayak yere yumuşak basar, yumuşak kalkar).
 */
function ayakProfil(f) {
  const p = ((f % TAU) + TAU) % TAU;
  if (p <= Math.PI) return 1 - (2 * p) / Math.PI;
  const u = (p - Math.PI) / Math.PI;
  return -8 * u * u * u + 12 * u * u - 2 * u - 1;
}

// Kol uç pozları (|x|, y). "Elleri başında" pozu bilerek asimetriktir: bir el tepede (dirseği öne), öbürü şakakta
// (dirseği yana); iki dirsek farklı açılarda durur. Böylece siluet simetrik bir simgeye (hilal, kanat,
// göz) değil, başını tutan bir insana benzer; ten rengi ön kollar dirsekten başa uzanan ayrı uzuvlar olarak seçilir.
export const KOLP = { H0: [43, 6], E1: [[46, -16], [40, -27]], H1: [[15, -7], [7, -16]] };
/** Kolların yerel geometrisi: omuz S, dirsek E, el H (k: 0 sol (−x), 1 sağ); sv ileri salınım (−1..1), el 0..1 */
export function kolGeo(k, sv, el) {
  const yk = k === 0 ? -1 : 1;
  const u = el * el * (3 - 2 * el);
  const S0 = [33, 1], E0 = [39, 6 - 15 * sv], H0 = [KOLP.H0[0] - 2 * Math.abs(sv), KOLP.H0[1] - 28 * sv];
  // elleri başında: dirsekler yana (biri öne), eller saçın üstünde
  const S1 = [32, -2], E1 = KOLP.E1[k], H1 = KOLP.H1[k];
  const L = (a, b) => [yk * lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  // ara pozda el, omuzun dışından (yaydan) geçer: gövdenin içine girmez
  const H = L(H0, H1);
  const yay = Math.sin(Math.PI * u) * 14;
  H[0] += yk * yay;
  H[1] -= Math.sin(Math.PI * u) * 10;
  const E = L(E0, E1);
  E[0] += yk * Math.sin(Math.PI * u) * 5;
  return { S: L(S0, S1), E, H };
}

/** Ayakların yerel konumu ([x, y] ayak ortası, sol ve sağ). poz.ayaklar verilmişse (dünyada kilitli ayaklar) odur. */
export function ayakGeo(poz = {}) {
  if (poz.ayaklar) return poz.ayaklar;
  const yuru = clamp(poz.yuru || 0), faz = poz.faz || 0;
  const B = (poz.adim ?? 30) * yuru;
  const kipir = poz.kipir || 0, of = poz.ayakOf || 0;
  const fL = B * ayakProfil(faz + Math.PI / 2), fR = B * ayakProfil(faz + 1.5 * Math.PI);
  return [[-TEPE.ayakX, TEPE.ayakY - fL + kipir - of], [TEPE.ayakX, TEPE.ayakY - fR - kipir - of]];
}

/**
 * Kuşbakışı adam. (x, y) dünya konumu, h bakış açısı (0: +x, π/2: +y), poz: { faz (yürüyüş evresi; bir döngü = iki
 * adım), yuru 0..1, adim (ayak genliği, yerel birim; basan ayağın kaymaması için = döngü başına yol / 4 / s),
 * kolYuru (kol salınımı çarpanı, varsayılan yuru), eller 0..1 (elleri başında), sallan (yana salınım), kipir (yerinde
 * ayak kıpırtısı), ayakOf (ayakların yerel ileri ötelemesi: gövde geri sekerken ayaklar yerinde kalsın) }, s ölçek, ekranOlcek: ekrandaki
 * büyütme (sprite çözünürlüğü için), golgeYon: gölgenin dünya ötelemesi [dx, dy].
 */
export function tepeAdam(ctx, x, y, h, poz = {}, { s = 1, ekranOlcek = 1, alfa = 1, golgeYon = [11, 15] } = {}) {
  if (alfa <= 0.002 || s <= 0) return;
  const P = adamParcalari(olcekSec(ekranOlcek * s));
  const faz = poz.faz || 0, yuru = clamp(poz.yuru || 0), el = clamp(poz.eller || 0);
  ctx.save();
  ctx.globalAlpha *= alfa;
  // gölge (dünya yönünde ötelenir, bakışla döner)
  ctx.save();
  ctx.translate(x + golgeYon[0] * s, y + golgeYon[1] * s);
  ctx.rotate(h + Math.PI / 2);
  ctx.scale(s, s);
  ctx.drawImage(golgeTuvali(), -100, -80, 200, 160);
  ctx.restore();
  ctx.translate(x, y);
  ctx.rotate(h + Math.PI / 2);
  ctx.scale(s, s);
  // yürürken gövde basan ayağın üstünde hafifçe yana salınır
  const sal = (poz.sallan || 0) + 1.4 * Math.sin(faz) * yuru;
  ctx.translate(sal, 0);
  // bacaklar ve ayakkabılar (gövdenin altında; yürürken önde ve arkada görünür). Dünyada kilitli ayaklar salınımla
  // kaymasın.
  const ayaklar = poz.ayaklar ? poz.ayaklar.map(([x, y]) => [x - sal, y]) : ayakGeo(poz);
  ayaklar.forEach(([ax, ay], k) => {
    const yk = k === 0 ? -1 : 1;
    ogeCiz(ctx, P.ayak, ax, ay, { r: yk * 0.1 });
    // paça: kalçadan topuğa (ayakkabının arka yarısını örter)
    uzuv(ctx, P.bacak, yk * TEPE.kalcaX, 4, ax - yk * 0.6, ay + 5, TEPE.BACAK);
  });
  ogeCiz(ctx, P.govde, 0, 0);
  // kollar: üst kol (omuz başı) gövdenin üstünde; ön kol ve el en üstte (elleri başındayken saçın üstünde)
  const sw = Math.sin(faz) * clamp(poz.kolYuru ?? yuru);
  const kollar = [kolGeo(0, sw, el), kolGeo(1, -sw, el)];
  for (const g of kollar) uzuv(ctx, P.kol, g.S[0], g.S[1], g.E[0], g.E[1], TEPE.KOL);
  // gömlek kolu: omuzdan dirseğe doğru en çok YEN boyunda (kol kısa göründüğünde de dirseği aşmaz)
  for (const g of kollar) {
    const dx = g.E[0] - g.S[0], dy = g.E[1] - g.S[1], L = Math.hypot(dx, dy);
    const l = Math.min(YEN, L * 0.55);
    const a = L > 0.01 ? Math.atan2(dy, dx) - Math.PI / 2 : 0;
    ogeCiz(ctx, P.yen, g.S[0], g.S[1], { r: a, sx: 1, sy: Math.max(0.05, l / YEN) });
  }
  // baş
  const by = TEPE.basY;
  ogeCiz(ctx, P.kulak, -15.6, by + 0.5, {});
  ogeCiz(ctx, P.kulak, 15.6, by + 0.5, {});
  ogeCiz(ctx, P.burun, 0, by - 18.2, {});
  ogeCiz(ctx, P.bas, 0, by, {});
  ogeCiz(ctx, P.sac, 0, by + 2.2, {});
  // ön kol ve el, altındaki üst kola, başa ve gövdeye hafif gölge düşürür (kollar kalkınca parçalar birbirinden ayrışsın)
  if (el > 0.05) {
    const R = h + Math.PI / 2, gx = 3.2, gy = 4.4; // dünyada sağ alta
    const ox = gx * Math.cos(R) + gy * Math.sin(R), oy = -gx * Math.sin(R) + gy * Math.cos(R);
    ctx.save();
    ctx.translate(ox, oy);
    for (const g of kollar) {
      ctx.save();
      ctx.globalAlpha *= 0.28 * clamp(el * 2);
      ctx.globalCompositeOperation = 'multiply';
      uzuv(ctx, P.onkol, g.E[0], g.E[1], g.H[0], g.H[1], TEPE.ONKOL);
      ogeCiz(ctx, P.el, g.H[0], g.H[1], {});
      ctx.restore();
    }
    ctx.restore();
  }
  for (const g of kollar) uzuv(ctx, P.onkol, g.E[0], g.E[1], g.H[0], g.H[1], TEPE.ONKOL);
  for (const g of kollar) ogeCiz(ctx, P.el, g.H[0], g.H[1], {});
  ctx.restore();
}

/** Figürün yerel sınır noktaları (çakışma denetimi için; parça yarıçapları dahil, kabaca) */
export function tepeSinir(poz = {}) {
  const el = clamp(poz.eller || 0), faz = poz.faz || 0, yuru = clamp(poz.yuru || 0);
  const sw = Math.sin(faz) * clamp(poz.kolYuru ?? yuru);
  const pts = [];
  const daire = (cx, cy, r) => { for (let k = 0; k < 12; k++) pts.push([cx + r * Math.cos((k / 12) * TAU), cy + r * Math.sin((k / 12) * TAU)]); };
  for (const [x, y] of [[-38, 1], [38, 1], [0, -15.5], [0, 22.5], [-25, -14], [25, -14], [-22, 20], [22, 20], [-34, 13], [34, 13]]) pts.push([x, y]);
  [kolGeo(0, sw, el), kolGeo(1, -sw, el)].forEach((g) => { daire(...g.S, 9.5); daire(...g.E, 9); daire(...g.H, 7.5); });
  daire(0, TEPE.basY, 18.5);
  daire(0, TEPE.basY - 18.2, 4.3);
  const dx = (poz.sallan || 0) + 1.4 * Math.sin(faz) * yuru;
  const sonuc = pts.map(([x, y]) => [x + dx, y]);
  const ay = poz.ayaklar ? poz.ayaklar : ayakGeo(poz).map(([x, y]) => [x + dx, y]);
  ay.forEach(([x, y]) => { for (const [cx, cy] of [[x, y - 9], [x, y + 4]]) for (let k = 0; k < 12; k++) sonuc.push([cx + 8.5 * Math.cos((k / 12) * TAU), cy + 8.5 * Math.sin((k / 12) * TAU)]); });
  return sonuc;
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
