// 5. cümle: "Evet, bütün hakiki saadet ve hâlis sürur ve şirin nimet ve safi lezzet, elbette marifetullah ve
// muhabbetullahtadır. Onlar, onsuz olamaz."
// Yazısız, temiz bir infografik; zemin altta ince altın taramalı bir buğuyla koyulaşır, altyazının altında ortadan
// iki yana çizilen ince bir tezhip pervazı (rumi kıvrımı) sayfayı kapatır. s04'ün altın halkaları (aynı biçim ve
// zamanlamayla) sürüp solarken üstte kaynak çizilir: merkezinde gül olan marifet madalyonu (küçük, loş).
// Kamera: simgeler girerken yavaşça itilir ve her yeni simgeye hafifçe yönelir; "elbette"de geri çekilip kaynağı
// ve dört simgeyi birlikte çerçeveler.
// "bütün": dört levhanın oturacağı noktalı yay alttan iki yana çizilir. Levhalar kelimelerinde taşmalı pop ile
// belirir: açan laleler (saadet; Alaaddin lambasını andıran kandil kullanılmaz), çiçekli dalda öten kuş (sürur, başını kesik kesik oynatır,
// gagasından ses yayları), yarılan nar (nimet, tanelerde parıltı), bal peteği ve damlası (lezzet, damla düşer).
// "elbette": kaynak büyür ve aydınlanır; "marifetullah": madalyonun halkası parlar, dalga vurur, halkadan dört simgeye
// altın ışık iplikleri akar (parlak, kuyruklu bir uç önde gider; iplik boyunca ışık kesikleri ve kuyruklu ışık
// darbeleri akar); "muhabbetullahtadır": gül parlar, pembe dalga, ipliklere örülerek ikinci bir gül ipliği akar;
// varışta levhalarda halka dalgası ve parıltı, simgeler tam renge gelip parlar. "Onlar": levhalar birlikte nefes alır.
// "onsuz olamaz": kaynağın ışığı çekilir, madalyon solar ve örtülür; karanlık ipliklerden aşağı iner; laleler boyun
// büker, kuş susar (başı düşer), nar kurur, bal donuklaşır; zemin loşlaşır. Bitiş: loş, soluk zemin, gri simgeler.
import { W, H, clamp, lerp, ease, an, pop, TAU, rgba, tuval, smooth } from '../motor/temel.mjs';
import { ogeCiz, ogeAcarak, konturCiz } from '../motor/kalem.mjs';
import { kameraYolu, kameraIle, salinim } from '../motor/sahne.mjs';
import { kb } from '../motor/zaman.mjs';
import { elips } from '../motor/sekil.mjs';
import * as M from '../motor/motifler.mjs';
import * as Y from './s05-yardim.mjs';

const T = {
  bas: 34.4, son: 46.8,
  evet: kb('evet'), butun: kb('bütün'), hakiki: kb('hakiki'),
  saadet: kb('saadet'), surur: kb('sürur', 2), nimet: kb('nimet'), lezzet: kb('lezzet'),
  elbette: kb('elbette'), marifet: kb('marifetullah', 2), muh: kb('muhabbetullahtadır'),
  onlar: kb('onlar'), onsuz: kb('onsuz'), olamaz: kb('olamaz'), ruhani: kb('ruhaniyedir'),
};

// ---------------------------------------------------------------- yerleşim (dünya = nötr ekran)
const K = { x: 540, y: 510, R: 205, gul: 64 }; // kaynak: madalyon ve gül
// levhalar (LR = 108): dış kenarlar kamera en yakındayken (z 1,08) de ekran kenarından ≥ ~90 px içeride kalır
// (Shorts arayüzünün sağ düğme sütunu bala binmesin); komşu levhalar arasında ~30 px boşluk
const IK = [{ x: 234, y: 1054 }, { x: 417, y: 1218 }, { x: 663, y: 1218 }, { x: 846, y: 1054 }];
// simgelerin oturduğu yay: dört levha merkezinden geçen çember (kaynağın altında bir kâse gibi)
const YAY = (() => {
  const [a, b] = IK;
  const yc = ((b.x - 540) ** 2 + b.y ** 2 - (a.x - 540) ** 2 - a.y ** 2) / (2 * (b.y - a.y));
  return { x: 540, y: yc, R: Math.hypot(a.x - 540, a.y - yc) };
})();
const SIMGE_OLCEK = 1.02; // simgeler levhayla aynı oranda (1,15 × 108/122)
const GIRIS = [T.saadet, T.surur, T.nimet, T.lezzet];
const LR = Y.LR;

// kaynak ara tuvali (renk/doyum süzgeci için)
const KS = 540, KO = 1.25;
let kTuval, kCtx;

// kamera yönelişi: sıfır hızla başlar, erken hızlanır, uzun ve yumuşak oturur
const yonelis = (u) => { const w = 1 - Math.pow(1 - u, 1.8); return w * w * (3 - 2 * w); };

// zaman eğrileri
const CAN_DUSUK = 0.34;
function canlilik(t) {
  // kaynağın ışığı: başta loş, "elbette"de aydınlanır, "onsuz"da söner
  const yan = an(t, T.elbette, 0.7, ease.inOutSine);
  const son = an(t, T.onsuz, 0.6, ease.inOutCubic);
  return lerp(CAN_DUSUK, 1, yan) * (1 - son);
}
const cizimIlerleme = (t) => an(t, T.evet - 0.02, 0.95, ease.outCubic);
const kaynakOlcek = (t) => lerp(0.8, 1, an(t, T.elbette - 0.04, 0.75, ease.outBack));
const olum = (t) => an(t, T.onsuz + 0.02, 0.7, ease.inOutSine); // kaynağın grileşmesi
const losluk = (t) => an(t, T.onsuz + 0.1, 1.0, ease.inOutSine); // zeminin loşlaşması

// iplikler: altın (marifet), gül (muhabbet), karanlık cephesi
const IPLIK_SIRA = [1, 0, 0, 1]; // dış iplikler biraz geç başlar (daha uzunlar)
const altinAkis = (t, i) => an(t, T.marifet + 0.14 + IPLIK_SIRA[i] * 0.05, 0.72, ease.inOutCubic);
const gulAkis = (t, i) => an(t, T.muh + 0.26 + IPLIK_SIRA[i] * 0.05, 0.66, ease.inOutCubic);
const KARA_BAS = T.onsuz + 0.08, KARA_SURE = 0.42;
const karaCephe = (t, i) => an(t, KARA_BAS + IPLIK_SIRA[i] * 0.05, KARA_SURE, ease.inQuad);
const altinVaris = (i) => T.marifet + 0.14 + IPLIK_SIRA[i] * 0.05 + 0.72;
const gulVaris = (i) => T.muh + 0.26 + IPLIK_SIRA[i] * 0.05 + 0.66;
const karaVaris = (i) => KARA_BAS + IPLIK_SIRA[i] * 0.05 + KARA_SURE;
const bagli = (t, i) => (0.55 * an(t, altinVaris(i) - 0.05, 0.35, ease.outCubic) + 0.45 * an(t, gulVaris(i) - 0.05, 0.35, ease.outCubic)) * (1 - an(t, karaVaris(i) - 0.12, 0.3));
const simgeOlum = (t, i) => an(t, karaVaris(i) - 0.06, 0.5, ease.inOutSine);

let zSicak, zLos, pervaz, pervazG, levha, levhaG, kandil, kandilG, alev, kus, kusG, dal, dalG, narK, narA, narKuruG, narAG, petek, petekG, petekP, damla, damlaG;
let iplikler = [], narYildiz = [];
let kam;

// ---------------------------------------------------------------- yardımcılar
/** renkli sprite'ı çiz, üstüne gri sürümünü g oranında bindir */
function cift(ctx, o, og, x, y, g, opt = {}) {
  if (g < 0.999) ogeCiz(ctx, o, x, y, opt);
  if (g > 0.001) ogeCiz(ctx, og, x, y, { ...opt, alfa: (opt.alfa ?? 1) * (g < 0.999 ? g : 1) });
}
function bezier(p0, p1, p2, p3, n) {
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n, u = 1 - t;
    pts.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
  }
  return pts;
}
function yolHazirla(pts) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, s, L: s[s.length - 1] };
}
function noktaAl(y, u) {
  const d = clamp(u) * y.L;
  let i = 1;
  while (i < y.s.length - 1 && y.s[i] < d) i++;
  const k = (d - y.s[i - 1]) / (y.s[i] - y.s[i - 1] || 1);
  const a = y.pts[i - 1], b = y.pts[i];
  return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
function parca(y, u0, u1) {
  u0 = clamp(u0); u1 = clamp(u1);
  if (u1 - u0 < 0.004) return null;
  const out = [noktaAl(y, u0).slice(0, 2)];
  const d0 = u0 * y.L, d1 = u1 * y.L;
  for (let i = 0; i < y.pts.length; i++) if (y.s[i] > d0 && y.s[i] < d1) out.push(y.pts[i]);
  out.push(noktaAl(y, u1).slice(0, 2));
  return out;
}
function cizgiYol(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
}
// iplik renkleri: golge (açık zeminde ışığa kontrast veren sıcak buğu, multiply), hale (screen), kalem, öz, baş
const IR = {
  altin: { golge: '#E2A23A', hale: '#FFD466', kalem: '#AE771A', oz: '#FFFDF2', bas: '#FFE49A' },
  gul: { golge: '#DE8199', hale: '#FFBDCD', kalem: '#B04A6B', oz: '#FFF3F6', bas: '#FFD0DC' },
};
/**
 * Işık ipliği: sıcak gölge-buğu (zemini hafifçe koyultup ışığı seçtirir) + parlak hale + kalem kenarı + beyaz öz +
 * öz boyunca akan ışık kesikleri. faz0: yolun başının ipliğin tamamındaki yay uzunluğu (kesikler dünyaya sabit akar).
 */
function isikIplik(ctx, pts, t, { alfa = 1, P = IR.altin, kal = 3.6, tohum = 1, genis = 1, akis = 1, faz0 = 0 } = {}) {
  if (!pts || pts.length < 2 || alfa <= 0.01) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  cizgiYol(ctx, pts);
  ctx.globalCompositeOperation = 'multiply';
  ctx.strokeStyle = rgba(P.golge, 0.1 * alfa);
  ctx.lineWidth = 34 * genis;
  ctx.stroke();
  ctx.strokeStyle = rgba(P.golge, 0.16 * alfa);
  ctx.lineWidth = 13 * genis;
  ctx.stroke();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = rgba(P.hale, 0.5 * alfa);
  ctx.lineWidth = 17 * genis;
  ctx.stroke();
  ctx.strokeStyle = rgba(P.hale, 0.75 * alfa);
  ctx.lineWidth = 7.5 * genis;
  ctx.stroke();
  ctx.restore();
  konturCiz(ctx, pts, { renk: P.kalem, kal, alfa: 0.88 * alfa, kapali: false, titreme: 0.35, tohum, uc: 0.03, adim: 2.4 });
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  cizgiYol(ctx, pts);
  ctx.strokeStyle = rgba(P.oz, 0.95 * alfa);
  ctx.lineWidth = kal * 0.5;
  ctx.stroke();
  if (akis > 0.01) {
    // akan ışık: öz boyunca kaynaktan simgeye kayan parlak kesikler
    ctx.globalCompositeOperation = 'screen';
    ctx.setLineDash([24, 30, 7, 47]);
    ctx.lineDashOffset = faz0 - t * 150;
    ctx.strokeStyle = rgba(P.hale, 0.7 * alfa * akis);
    ctx.lineWidth = 10 * genis;
    ctx.stroke();
    ctx.strokeStyle = rgba('#FFFFFF', alfa * akis);
    ctx.lineWidth = kal * 0.85;
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}
/** ışık başı: sıcak çevre (multiply) + geniş hale + beyaz çekirdek + dört kollu parıltı */
function isikBasi(ctx, x, y, r, alfa, P = IR.altin) {
  if (alfa <= 0.01) return;
  M.hale(ctx, x, y, r * 5.5, P.golge, 0.34 * alfa, 'multiply');
  M.hale(ctx, x, y, r * 8.5, P.bas, 0.95 * alfa);
  M.hale(ctx, x, y, r * 3, '#FFFFFF', 0.9 * alfa);
  ctx.save();
  ctx.fillStyle = `rgba(255,255,252,${alfa})`;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
  Y.parilti(ctx, x, y, r * 3.8, alfa);
}
/** kuyruklu ışık: yol üzerinde u'daki parlak baş ve arkasında incelen, sönen kuyruk ([u0, u1] dışında çizilmez) */
function kuyrukluIsik(ctx, y, u, { boy = 0.14, P = IR.altin, alfa = 1, r = 5, u0 = 0, u1 = 1, genis = 1 } = {}) {
  if (alfa <= 0.01) return;
  const n = 7;
  const parcalar = [];
  for (let k = 0; k < n; k++) {
    const a = u - boy * (1 - k / n), b = u - boy * (1 - (k + 1) / n);
    const seg = parca(y, Math.max(u0, a), Math.min(u1, b));
    if (seg) parcalar.push([seg, (k + 1) / n]);
  }
  ctx.save();
  ctx.lineJoin = 'round';
  // altta doygun sıcak iz (multiply): beyaz öz açık zeminde ancak böyle seçilir; uç uca eklenir (kesişme koyulaşmasın)
  ctx.lineCap = 'butt';
  ctx.globalCompositeOperation = 'multiply';
  for (const [seg, f] of parcalar) {
    cizgiYol(ctx, seg);
    ctx.strokeStyle = rgba(P.golge, 0.26 * f * alfa);
    ctx.lineWidth = (7 + 11 * f) * genis;
    ctx.stroke();
  }
  ctx.lineCap = 'round';
  ctx.globalCompositeOperation = 'screen';
  for (const [seg, f] of parcalar) {
    cizgiYol(ctx, seg);
    ctx.strokeStyle = rgba(P.hale, 0.55 * f * alfa);
    ctx.lineWidth = (5 + 13 * f) * genis;
    ctx.stroke();
    ctx.strokeStyle = rgba('#FFFFFF', 0.95 * f * alfa);
    ctx.lineWidth = (1.6 + 3 * f) * genis;
    ctx.stroke();
  }
  ctx.restore();
  if (u > u0 && u < u1) {
    const [x, yy] = noktaAl(y, u);
    isikBasi(ctx, x, yy, r, alfa, P);
  }
}

/** akış ucunun ardında saçılan küçük kıvılcımlar (ipliğin iki yanına hafifçe açılıp söner) */
function kivilcimlar(ctx, y, u, t, tohum, alfa, renk = '#FFFDF0') {
  if (alfa <= 0.02) return;
  for (let j = 1; j <= 5; j++) {
    const uj = u - j * 0.032;
    if (uj <= 0.01) break;
    const [x, yy, a] = noktaAl(y, uj);
    const yan = Math.sin(j * 12.9 + tohum * 3.1) * (3 + 3.2 * j);
    const tit = 0.65 + 0.35 * Math.sin(t * 23 + j * 2.3 + tohum);
    Y.parilti(ctx, x - Math.sin(a) * yan, yy + Math.cos(a) * yan, 7 - j * 0.7, alfa * (1 - j / 6) * tit, renk);
  }
}

// ---------------------------------------------------------------- kaynak (madalyon + gül), ara tuvalde
function kaynakCiz(t) {
  const g = kCtx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, kTuval.width, kTuval.height);
  g.setTransform(KO, 0, 0, KO, (KS * KO) / 2, (KS * KO) / 2);
  const cizim = cizimIlerleme(t);
  const dolgu = an(t, T.evet + 0.3, 0.7, ease.inOutSine);
  const don = 0.05 * (t - T.bas) + 0.02 * Math.sin(t * 0.5);
  const kb2 = kaynakOlcek(t);
  g.scale(kb2, kb2);
  M.marifetDeseni(g, 0, 0, K.R, t, { cizim, dolgu, r: don, olcek: KO });
  // gül: gonca olarak belirir, loşken yarı açık; "muhabbetullah"ta tam açar; "onsuz"da kapanıp düşer
  const gGir = pop(t, T.evet + 0.55, 0.6);
  if (gGir > 0) {
    const acil = lerp(0.42, 0.72, an(t, T.evet + 0.6, 1.0, ease.outCubic)) + 0.28 * an(t, T.muh - 0.04, 0.6, ease.outBack) - 0.3 * an(t, T.onsuz + 0.05, 0.8, ease.inOutSine);
    const nabiz = 1 + 0.16 * an(t, T.muh - 0.04, 0.22, ease.outCubic) * (1 - an(t, T.muh + 0.2, 0.7, ease.inOutSine)) + 0.05 * an(t, T.muh + 0.2, 0.7) * (1 - olum(t));
    const sol = 1 - 0.06 * olum(t);
    M.gul(g, 0, 0, K.gul * gGir * nabiz * sol, clamp(acil, 0, 1), t, { olcek: KO * 1.25, r: don * 0.5 });
  }
}

export default {
  sesler: [
    { t: T.evet, tur: 'kalem', guc: 0.4, sure: 1.0 },
    { t: T.butun + 0.04, tur: 'firca', guc: 0.22, sure: 1.0 },
    { t: T.saadet, tur: 'pop', guc: 0.32 },
    { t: T.surur, tur: 'pop', guc: 0.3 },
    { t: T.surur + 0.5, tur: 'kus', guc: 0.24 },
    { t: T.nimet, tur: 'pop', guc: 0.3 },
    { t: T.lezzet, tur: 'pop', guc: 0.3 },
    { t: T.marifet, tur: 'nur', guc: 0.45, sure: 2.2 },
    { t: T.muh, tur: 'parilti', guc: 0.35, tekrar: 2, ara: 0.32 },
    { t: T.onsuz, tur: 'ruzgar', guc: 0.16, sure: 1.5 },
  ],

  hazirla() {
    zSicak = Y.zeminTuvali('sicak', K.x, K.y);
    zLos = Y.zeminTuvali('los', K.x, K.y);
    pervaz = Y.pervazOge(); pervazG = Y.griSurum(pervaz, { doyum: 0.1, kontrast: 0.85 });
    levha = Y.levhaOge(); levhaG = Y.griSurum(levha);
    kandil = Y.kandilOge(); kandilG = Y.griSurum(kandil);
    LALE.forEach((l) => { l.bas = Y.laleBasOge(l.renk); l.basG = Y.griSurum(l.bas); l.sap = Y.laleSapOge(l.L, l.yy); l.sapG = Y.griSurum(l.sap); });
    alev = Y.alevOge();
    kus = Y.kusOgeleri();
    kusG = Object.fromEntries(Object.entries(kus).map(([k, o]) => [k, Y.griSurum(o)]));
    dal = Y.dalOgeleri();
    dalG = { dal: Y.griSurum(dal.dal), yapraklar: dal.yapraklar.map((p) => Y.griSurum(p.oge)), cicekler: dal.cicekler.map((p) => Y.griSurum(p.oge)) };
    narK = Y.narOge('kapali'); narA = Y.narOge('acik'); narAG = Y.griSurum(narA);
    narKuruG = Y.griSurum(Y.narOge('kuru'), { parlak: 1.04 });
    petek = Y.petekOge(); petekG = Y.griSurum(petek); petekP = Y.petekOge(true);
    damla = M.nektarDamla(8, Y.OL * 1.2); damlaG = Y.griSurum(damla);
    narYildiz = Y.narTaneYerleri();
    kTuval = tuval(KS * KO, KS * KO);
    kCtx = kTuval.getContext('2d');
    // iplikler: madalyon kenarından simge levhasının kaynağa bakan kenarına
    iplikler = IK.map((p, i) => {
      const dx = p.x - K.x, dy = p.y - K.y;
      const a = Math.atan2(dy, dx);
      const as = Math.PI / 2 + (a - Math.PI / 2) * 1.32;
      const u = [Math.cos(as), Math.sin(as)];
      const p0 = [K.x + u[0] * (K.R + 3), K.y + u[1] * (K.R + 3)];
      const p1 = [p0[0] + u[0] * 190, p0[1] + u[1] * 190];
      const d = Math.hypot(dx, dy);
      const v = [-dx / d, -dy / d];
      const p3 = [p.x + v[0] * (LR + 2), p.y + v[1] * (LR + 2)];
      const p2 = [p3[0] + v[0] * 150 * 0.6, p3[1] - 150];
      return yolHazirla(bezier(p0, p1, p2, p3, 150));
    });
    // her anahtar bir simgenin girdiği an; o andan sonraki bölüm kameranın o simgeye yönelişidir (öne yüklü, uzun
    // süzülen yumuşatma: pop'la birlikte yola çıkar, bir sonraki simgeye kadar yavaşça oturur). Yönelişler küçük
    // (≤ 40 px kayma, ≤ %8 itme): levhalar kadrajda kalır, altyazı bandına inmez.
    kam = kameraYolu([
      { t: T.bas, x: 540, y: 960, z: 1.0 },
      { t: 35.2, x: 540, y: 960, z: 1.0, e: ease.lin },
      { t: T.saadet, x: 539, y: 966, z: 1.014, e: ease.inOutSine }, // "Evet, bütün hakiki": çok yavaş itme başlar
      { t: T.surur, x: 503, y: 985, z: 1.066, e: yonelis }, // kandile (sol) yöneliş
      { t: T.nimet, x: 517, y: 998, z: 1.08, e: yonelis }, // kuşa
      { t: T.lezzet, x: 536, y: 1000, z: 1.066, e: yonelis }, // nara
      { t: T.elbette, x: 541, y: 988, z: 1.05, e: yonelis }, // bala: hafif geri çekilip dört simgeyi birlikte gösterir
      { t: 42.8, x: 540, y: 958, z: 1.035, e: ease.inOutCubic }, // "elbette": kaynağa doğru yükselir
      { t: 45.1, x: 540, y: 958, z: 1.04, e: ease.inOutSine },
      { t: T.son, x: 540, y: 935, z: 1.08, e: ease.inOutSine },
    ]);
  },

  ciz(ctx, t) {
    const c = kam(t);
    const sl = salinim(t, 2.4, 0.28, 5);
    const cam = { x: c.x + sl.x / c.z, y: c.y + sl.y / c.z, z: c.z, r: sl.r * 0.5 };
    const can = canlilik(t);
    const parlak = clamp((can - CAN_DUSUK) / (1 - CAN_DUSUK)); // 0 loş .. 1 aydınlık
    const ol = olum(t);
    const los = losluk(t);

    // 1) zemin (sıcak → loş)
    kameraIle(ctx, cam, (g) => {
      if (los < 0.999) ogeCiz(g, zSicak, Y.ZEMIN.X0, Y.ZEMIN.Y0);
      if (los > 0.001) ogeCiz(g, zLos, Y.ZEMIN.X0, Y.ZEMIN.Y0, { alfa: los });
    }, 0.5);

    // 2) alt tezhip pervazı: "bütün"de noktalı yayla aynı jestle ortadan iki yana çizilerek açılır (kalemin iki ucunda
    // ışıltı); loşlukta grileşir
    const pv = an(t, T.butun + 0.02, 1.3, ease.inOutCubic);
    if (pv > 0) {
      kameraIle(ctx, cam, (g) => {
        const px = 540, py = Y.PERVAZ.Y;
        const a = 0.9 * (1 - 0.25 * ol);
        if (los < 0.999) ogeAcarak(g, pervaz, px, py, pv, { mod: 'daire', merkez: [0, 0], yumusak: 0.08, alfa: a * (1 - los) });
        if (los > 0.001) ogeCiz(g, pervazG, px, py, { alfa: a * los });
        if (pv < 1) {
          const R = Math.hypot(pervaz.w / 2, pervaz.h / 2);
          const rr = (pv * 1.08 - 0.03) * R;
          const ip = Math.sin(Math.PI * clamp(pv / 0.95));
          if (rr < Y.PERVAZ.L) for (const yon of [-1, 1]) Y.parilti(g, px + yon * rr, py, 13, 0.9 * ip);
        }
      }, 1);
    }

    // ışık akarken zemin kenarlardan hafifçe koyulaşır (yalnız zemin ve pervaz): açık zeminde ışık daha çok seçilsin
    const vurgu = an(t, T.elbette, 1.0, ease.inOutSine) * (1 - an(t, T.onsuz + 0.1, 1.0, ease.inOutSine));
    if (vurgu > 0.005) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const vg = ctx.createRadialGradient(540, 820, 260, 540, 860, 1250);
      vg.addColorStop(0, 'rgba(226,206,166,0)');
      vg.addColorStop(0.55, `rgba(226,206,166,${0.22 * vurgu})`);
      vg.addColorStop(1, `rgba(214,190,146,${0.42 * vurgu})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // s04'ten devralınan altın halkalar: ekran uzayında, s04'le aynı biçim ve zamanlama; yeni halka doğmaz, söner
    if (t < T.bas + 1.6) {
      const u = t - T.ruhani;
      const sonme = 1 - an(t, T.bas + 0.25, 1.1, ease.inOutSine);
      const nefes = 0.5 + 0.5 * Math.sin(((u - 0.2) * 2 * Math.PI) / 1.25);
      M.hale(ctx, 540, 900, 230 + 50 * nefes, '#FBE2A0', 0.5 * sonme);
      M.hale(ctx, 540, 900, 70 + 14 * nefes, '#FFFDF4', 0.85 * sonme);
      for (let i = 0; i < 12; i++) {
        const v = (u - i * 0.31) / 2.6;
        if (v <= 0 || v >= 1 || T.ruhani + i * 0.31 > T.bas + 0.3) continue;
        const R = lerp(18, 1320, ease.outCubic(v));
        const alfa = Math.pow(1 - v, 1.15) * Math.min(1, v * 12) * (i === 0 ? 1 : 0.85 + 0.15 * Math.sin(i * 1.3));
        Y.altinHalka(ctx, 540, 900, R, { alfa: alfa * sonme, kal: lerp(3.6, 1.6, v), tohum: 80 + i * 3 });
      }
      M.parcaciklar(ctx, 0, 300, W, 1200, t, { sayi: 30, renk: '#FFE9B0', boy: 3, alfa: 0.7 * sonme, hiz: 20, tohum: 47 });
    }

    kameraIle(ctx, cam, (g) => {
      // 3) ışık merkezi: s04'ün halkalarının merkezinden (540, 900) kaynağa süzülür
      const kay = an(t, T.bas + 0.1, 1.5, ease.inOutCubic);
      const lx = K.x, ly = lerp(900, K.y, kay);
      const isik = lerp(0.45, 0.22, kay) + 0.32 * parlak;
      M.hale(g, lx, ly, lerp(620, 780, kay) * (0.85 + 0.15 * parlak), '#FFF2C6', isik * (1 - ol));

      // 4) simgelerin yayı: dört levha merkezinden geçen noktalı çember yayı ("bütün"de alttan iki yana çizilir)
      const yc = an(t, T.butun + 0.02, 1.2, ease.inOutCubic);
      if (yc > 0) {
        const renk = M.ALTIN_KOYU;
        const ra = (0.5 + 0.14 * parlak) * (1 - 0.45 * ol);
        const ACI = (2 * Math.PI) / 3; // alt noktadan iki yana açı
        const N = Math.round((2 * ACI * YAY.R) / 16);
        g.save();
        for (let k = 0; k <= N; k++) {
          const f = (k / N) * 2 - 1; // -1 .. 1
          const fark = Math.abs(f);
          if (fark > yc) continue;
          const a = Math.PI / 2 + f * ACI;
          const x = YAY.x + Math.cos(a) * YAY.R, y = YAY.y + Math.sin(a) * YAY.R;
          const uc = clamp((yc - fark) / 0.05) * clamp((1 - fark) / 0.18 + 0.15);
          g.fillStyle = rgba(ol > 0.5 ? '#8F889A' : renk, ra * uc);
          g.beginPath();
          g.arc(x, y, 2.4 * (0.6 + 0.4 * uc), 0, TAU);
          g.fill();
        }
        g.restore();
      }

      // 5) kaynağın arkası: hale, ışınlar, iç yörünge
      const gir = an(t, T.evet, 0.9, ease.inOutSine);
      const isinG = parlak * (1 - ol);
      const ko = kaynakOlcek(t);
      const KR = K.R * ko;
      M.hale(g, K.x, K.y, KR * (1.8 + 1.4 * isinG), '#FFF6DA', (0.25 + 0.45 * isinG) * gir);
      if (isinG > 0.01) {
        M.isinlar(g, K.x, K.y, KR * 1.16, KR * (1.16 + 0.48 * isinG), t, { sayi: 34, alfa: 0.5 * isinG, kal: 2.2, hiz: 0.04, tohum: 21 });
        M.isinlar(g, K.x, K.y, KR * 1.14, KR * (1.14 + 0.3 * isinG), -t * 0.7, { sayi: 22, renk: '#EBC867', alfa: 0.38 * isinG, kal: 1.7, hiz: 0.03, tohum: 23 });
      }
      const ior = an(t, T.evet + 0.25, 1.0, ease.inOutCubic);
      if (ior > 0) {
        const R2 = KR * 1.28;
        const renk = ol > 0.6 ? '#9A93A6' : M.ALTIN_KOYU;
        const ra = (0.4 + 0.35 * parlak) * (1 - 0.4 * ol);
        const dn = t * 0.06;
        for (let k = 0; k < 40; k++) {
          const a0 = dn + (k / 40) * TAU, a1 = a0 + (TAU / 40) * 0.55;
          if (k / 40 > ior) break;
          const pts = [];
          for (let j = 0; j <= 6; j++) { const a = lerp(a0, a1, j / 6); pts.push([K.x + Math.cos(a) * R2, K.y + Math.sin(a) * R2]); }
          konturCiz(g, pts, { renk, kal: 1.6, alfa: ra, kapali: false, titreme: 0.2, tohum: 200 + k, uc: 0.3 });
        }
        for (let k = 0; k < 8; k++) {
          const a = -dn * 0.7 + (k / 8) * TAU + 0.2;
          const u = clamp((ior - k / 8) / 0.15);
          if (u <= 0) continue;
          const x = K.x + Math.cos(a) * R2, y = K.y + Math.sin(a) * R2;
          g.fillStyle = rgba(ol > 0.6 ? '#B3ADBD' : '#F2D47A', 0.95 * u * (1 - 0.3 * ol));
          g.beginPath(); g.arc(x, y, 5.2 * ease.outBack(u), 0, TAU); g.fill();
          g.strokeStyle = rgba(renk, 0.85 * u);
          g.lineWidth = 1.5;
          g.stroke();
        }
      }

      // 6) iplikler (levhaların ve madalyonun altında)
      iplikler.forEach((y, i) => {
        const ak = altinAkis(t, i);
        if (ak <= 0) return;
        const kc = karaCephe(t, i);
        const gk = gulAkis(t, i);
        const kara = kc > 0 ? parca(y, 0, Math.min(kc, ak)) : null;
        const sonAlfa = 1 - 0.5 * an(t, karaVaris(i), 0.6);
        if (kara) konturCiz(g, kara, { renk: '#857E92', kal: 1.7, alfa: 0.62 * sonAlfa, kapali: false, titreme: 0.35, tohum: 60 + i, uc: 0.03 });
        if (ak > kc) {
          const nab = 0.85 + 0.15 * Math.sin(t * 3.1 + i);
          const genis = 1 + 0.25 * an(t, T.onlar, 0.3) * (1 - an(t, T.onlar + 0.3, 0.5));
          // gül ipliği: altın ipliğe sarılan ince pembe iplik (altından ve üstünden geçerek örülür)
          let pembe = null;
          if (gk > kc) {
            const n = Math.max(8, Math.round((gk - kc) * 150));
            pembe = [];
            for (let j = 0; j <= n; j++) {
              const u = lerp(kc, gk, j / n);
              const [x, yy, a] = noktaAl(y, u);
              const fz = (u * y.L) / 17 - t * 4.2 + i;
              const tp = smooth(0, 0.06, u) * smooth(1, 0.94, u);
              const o = 5 * Math.sin(fz) * tp;
              pembe.push({ p: [x - Math.sin(a) * o, yy + Math.cos(a) * o], ust: Math.cos(fz) > 0 });
            }
            isikIplik(g, pembe.map((q) => q.p), t, { alfa: 0.9, P: IR.gul, kal: 1.8, tohum: 40 + i, genis: 0.55 * genis, akis: 0 });
          }
          isikIplik(g, parca(y, kc, ak), t, { alfa: nab, tohum: 30 + i, genis, faz0: kc * y.L + i * 17 });
          if (pembe) {
            // üstten geçen kısımlar altın ipliğin üzerine yeniden çizilir
            let seg = [];
            const bitir = () => { if (seg.length > 2) konturCiz(g, seg, { renk: '#B4506F', kal: 1.7, alfa: 0.92, kapali: false, titreme: 0.2, tohum: 50 + i, uc: 0.25 }); seg = []; };
            for (const q of pembe) { if (q.ust) seg.push(q.p); else bitir(); }
            bitir();
          }
        }
      });
    }, 1);

    // 7) kaynak: ara tuvalde çizilir, doyum/parlaklık süzgeciyle bindirilir
    if (t >= T.evet - 0.02) {
      kaynakCiz(t);
      kameraIle(ctx, cam, (g) => {
        const doy = lerp(0.42, 1.06, parlak) * (1 - ol) + 0.06 * ol;
        const prl = lerp(0.98, 1.03, parlak) * (1 - 0.1 * ol);
        g.save();
        g.filter = `saturate(${doy.toFixed(3)}) brightness(${prl.toFixed(3)})`;
        g.globalAlpha = lerp(0.84 + 0.16 * (1 - an(t, T.evet + 0.7, 0.8)), 1, parlak) * (1 - 0.18 * ol);
        g.drawImage(kTuval, K.x - KS / 2, K.y - KS / 2, KS, KS);
        g.restore();

        // çizim sırasında kalemin ucunda küçük ışıltı (dış halka)
        const u0 = clamp(cizimIlerleme(t) / 0.3);
        if (u0 > 0 && u0 < 1) {
          const ko = kaynakOlcek(t), don = 0.05 * (t - T.bas) + 0.02 * Math.sin(t * 0.5);
          const a = -Math.PI / 2 + ease.inOutCubic(u0) * TAU + don;
          Y.parilti(g, K.x + Math.cos(a) * K.R * ko, K.y + Math.sin(a) * K.R * ko, 16, Math.sin(u0 * Math.PI));
        }
        // "marifetullah": dış halka parlar, çevresinde ışık dolaşır
        const fl = an(t, T.marifet - 0.02, 0.22, ease.outCubic);
        if (fl > 0) {
          const kal = (1 - an(t, T.marifet + 0.25, 1.1, ease.inOutSine)) * 0.75 + 0.3;
          const hg = fl * kal * (1 - ol);
          if (hg > 0.01) {
            // ışıklı bant: dışta sıcak altın buğu, içte beyaz öz
            g.save();
            g.lineCap = 'round';
            for (const [lw, a, r] of [[46, 0.1, '#F4CF6A'], [24, 0.2, '#F6D985'], [11, 0.42, '#FBE7A8']]) {
              g.strokeStyle = rgba(r, a * hg);
              g.lineWidth = lw;
              g.beginPath(); g.arc(K.x, K.y, K.R * 1.0, 0, TAU); g.stroke();
            }
            g.strokeStyle = rgba('#FFFDF2', 0.9 * hg);
            g.lineWidth = 3.2;
            g.beginPath(); g.arc(K.x, K.y, K.R * 1.0, 0, TAU); g.stroke();
            g.restore();
            konturCiz(g, elips(K.x, K.y, K.R * 1.035, K.R * 1.035)[0].pts, { renk: '#C99428', kal: 2.6, alfa: 0.85 * hg, kapali: true, titreme: 0.3, tohum: 12 });
            // genişleyip solan ikinci halka (dışa vuran dalga)
            const dv = an(t, T.marifet - 0.02, 0.6, ease.outCubic);
            if (dv < 1) Y.altinHalka(g, K.x, K.y, K.R * lerp(1.02, 1.5, dv), { alfa: 0.8 * (1 - dv), kal: 2.6, tohum: 31 });
          }
          // dolaşan ışık (bir tur)
          const tur = an(t, T.marifet - 0.02, 0.75, ease.inOutSine);
          if (tur > 0 && tur < 1) {
            const a = -Math.PI / 2 + tur * TAU;
            const kuyruk = [];
            for (let j = 0; j <= 20; j++) { const aa = a - (j / 20) * 1.1; kuyruk.push([K.x + Math.cos(aa) * K.R * 0.965, K.y + Math.sin(aa) * K.R * 0.965]); }
            g.save(); g.globalCompositeOperation = 'screen'; g.lineCap = 'round';
            cizgiYol(g, kuyruk); g.strokeStyle = 'rgba(255,240,190,0.55)'; g.lineWidth = 10; g.stroke();
            g.restore();
            Y.parilti(g, K.x + Math.cos(a) * K.R * 0.965, K.y + Math.sin(a) * K.R * 0.965, 22, Math.sin(tur * Math.PI));
          }
        }
        // "muhabbetullahtadır": gül parlar, pembe dalga madalyon kenarına yayılır
        const gp = an(t, T.muh - 0.04, 0.25, ease.outCubic) * (1 - 0.6 * an(t, T.muh + 0.3, 1.0, ease.inOutSine)) * (1 - ol);
        if (gp > 0.01) {
          M.hale(g, K.x, K.y, K.gul * 3.2, '#FFE3EA', 0.6 * gp);
          M.hale(g, K.x, K.y, K.gul * 1.4, '#FFFFFF', 0.35 * gp);
        }
        const dl = an(t, T.muh + 0.02, 0.42, ease.outCubic);
        if (dl > 0 && dl < 1) konturCiz(g, elips(K.x, K.y, lerp(K.gul, K.R * 0.98, dl), lerp(K.gul, K.R * 0.98, dl))[0].pts, { renk: '#E58AA2', kal: 3, alfa: 0.75 * (1 - dl), kapali: true, titreme: 0.4, tohum: 14 });
        // "onsuz": örtü (soluk gri-leylak buğu kaynağın üstüne çöker)
        if (ol > 0.01) {
          const rg = g.createRadialGradient(K.x, K.y, 0, K.x, K.y, K.R * 1.25);
          rg.addColorStop(0, `rgba(186,179,199,${0.28 * ol})`);
          rg.addColorStop(0.75, `rgba(194,188,206,${0.2 * ol})`);
          rg.addColorStop(1, 'rgba(190,184,202,0)');
          g.save();
          g.globalCompositeOperation = 'multiply';
          g.fillStyle = rg;
          g.fillRect(K.x - K.R * 1.3, K.y - K.R * 1.3, K.R * 2.6, K.R * 2.6);
          g.restore();
        }
      }, 1);
    }

    kameraIle(ctx, cam, (g) => {
      // 8) akan ışık: akış cephesinde kuyruklu parlak baş; bağlandıktan sonra iplik boyunca kuyruklu ışık darbeleri
      iplikler.forEach((y, i) => {
        const ak = altinAkis(t, i), kc = karaCephe(t, i), gk = gulAkis(t, i);
        if (ak <= 0) return;
        if (ak < 1 && ak > kc) {
          kuyrukluIsik(g, y, ak, { boy: 0.24, r: 7.5, u0: kc, alfa: Math.min(1, ak * 6), genis: 1.15 });
          kivilcimlar(g, y, ak, t, i, Math.min(1, ak * 6) * (1 - smooth(0.85, 1, ak)));
        }
        if (gk > 0 && gk < 1 && gk > kc) {
          kuyrukluIsik(g, y, gk, { boy: 0.2, r: 6.2, u0: kc, P: IR.gul, alfa: Math.min(1, gk * 6) });
          kivilcimlar(g, y, gk, t, i + 7, Math.min(1, gk * 6) * (1 - smooth(0.85, 1, gk)), '#FFE6EE');
        }
        // darbeler: altın ve (gül ipliği geldikten sonra) pembe, dönüşümlü
        const n = 2;
        for (let k = 0; k < n; k++) {
          const u = ((t - T.marifet) * 0.5 + k / n + i * 0.23) % 1;
          if (u <= kc + 0.03 || u >= ak - 0.03) continue;
          const pembe = k === 1 && u < gk;
          kuyrukluIsik(g, y, u, { boy: 0.13, r: 4.2, u0: kc, u1: ak, P: pembe ? IR.gul : IR.altin, alfa: 0.9 * Math.sin(u * Math.PI) ** 0.6, genis: 0.85 });
        }
        // varış parıltısı (iplik levhaya değdiğinde)
        const p3 = y.pts[y.pts.length - 1];
        for (const tv of [altinVaris(i), gulVaris(i)]) {
          const v = (t - tv + 0.06) / 0.5;
          if (v > 0 && v < 1 && t < KARA_BAS) Y.parilti(g, p3[0], p3[1], 30 * (0.6 + 0.4 * ease.outCubic(v)), Math.sin(Math.PI * v) ** 0.7);
        }
      });

      // 9) levhalar ve simgeler
      IK.forEach((p, i) => simgeCiz(g, i, p, t));

      // 10) uçuşan ışık zerreleri (aydınlıkken)
      const zer = (0.35 + 0.65 * parlak) * (1 - ol) * an(t, T.evet, 1.0);
      if (zer > 0.01) M.parcaciklar(g, 60, 180, 960, 1180, t, { sayi: 30, alfa: 0.55 * zer, tohum: 15, hiz: 14, boy: 3.0 });
    }, 1);

    // 11) loşluk: hafif karartma ve renk çekilmesi (ekran uzayında)
    if (los > 0.001) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(236,233,240,${los})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = `rgba(128,128,128,${0.5 * los})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
  },
};

// ---------------------------------------------------------------- simgeler
function simgeCiz(g, i, p, t) {
  const t0 = GIRIS[i];
  const lp = pop(t, t0, 0.55);
  if (lp <= 0) return;
  const ip = pop(t, t0 + 0.09, 0.6);
  const bg = bagli(t, i);
  const ol = simgeOlum(t, i);
  const onlar = an(t, T.onlar, 0.22, ease.outCubic) * (1 - an(t, T.onlar + 0.22, 0.5, ease.inOutSine));
  const nefes = 1 + 0.035 * onlar;
  const x = p.x, y = p.y + Math.sin(t * 1.15 + i * 1.4) * 2.6 * (1 - ol * 0.7) + ol * 3;
  // levha
  if (bg > 0.01) M.hale(g, x, y, LR * 1.9, '#FFF1C2', 0.42 * bg);
  cift(g, levha, levhaG, x, y, ol, { s: lp * nefes });
  if (bg > 0.01) {
    g.save();
    g.globalCompositeOperation = 'screen';
    M.hale(g, x, y, LR * 1.05, '#FFF6D8', 0.55 * bg);
    g.restore();
    konturCiz(g, elips(x, y, LR * lp, LR * lp)[0].pts, { renk: '#E0B34A', kal: 2.6, alfa: 0.75 * bg, kapali: true, titreme: 0.3, tohum: 80 + i });
  }
  // ipliklerin varışı: levhada halka dalgası, simgede küçük sıçrama
  const vA = altinVaris(i), vG = gulVaris(i);
  const sicra = 0.08 * Math.sin(Math.PI * clamp((t - vA + 0.04) / 0.38)) + 0.07 * Math.sin(Math.PI * clamp((t - vG + 0.04) / 0.38));
  for (const [tv, renk] of [[vA, '#D9A93F'], [vG, '#D9718E']]) {
    const dv = clamp((t - tv + 0.04) / 0.55);
    if (dv > 0 && dv < 1 && ol < 0.5) {
      const e = ease.outCubic(dv);
      const R = LR * lerp(1.0, 1.26, e);
      konturCiz(g, elips(x, y, R, R)[0].pts, { renk, kal: 2.8 * (1 - e * 0.5), alfa: 0.8 * (1 - dv) ** 1.6, kapali: true, titreme: 0.4, tohum: 90 + i });
      M.hale(g, x, y - LR * 0.2, LR * 1.4, renk === '#D9A93F' ? '#FFF0BC' : '#FFE0E8', 0.5 * (1 - dv));
    }
  }
  if (ip <= 0) return;
  const s = ip * nefes * (1 + sicra);
  const rr = (1 - clamp((t - t0 - 0.09) / 0.6)) * 0.2 * (i % 2 ? -1 : 1);
  g.save();
  g.translate(x, y);
  g.rotate(rr);
  g.scale(s * SIMGE_OLCEK, s * SIMGE_OLCEK);
  // bağlanmadan önce hafif soluk; iplik ulaşınca tam renk (canlanma)
  const gri = Math.max(ol, 0.2 * (1 - clamp(bg / 0.55)));
  [laleCiz, kusCiz, narCiz, balCiz][i](g, t, { t0, bg, ol, gri, i });
  g.restore();
}

// --- laleler (saadet): girişte açar, canlanınca hafifçe salınır; "onsuz olamaz"da başlarını eğer, grileşir
const LALE = [
  { x: -30, y: 70, L: 92, r: -0.2, renk: 'kirmizi', yy: 1, faz: 0.4 },
  { x: 2, y: 74, L: 112, r: 0.02, renk: 'beyaz', yy: -1, faz: 1.9 },
  { x: 32, y: 70, L: 86, r: 0.24, renk: 'kirmizi', yy: -1, faz: 3.1 },
];
function laleCiz(g, t, { t0, bg, ol, gri }) {
  const ac = ease.outBack(an(t, t0 + 0.18, 0.5, ease.lin), 1.6);
  const son = an(t, karaVaris(0) - 0.08, 0.6, ease.inOutSine);
  LALE.forEach((l, k) => {
    const sal = (0.03 + 0.03 * bg) * Math.sin(t * 1.5 + l.faz) * (1 - son);
    const a = l.r + sal + son * 0.12 * Math.sign(l.r || 1);
    g.save();
    g.translate(l.x, l.y);
    g.rotate(a);
    cift(g, l.sap, l.sapG, 0, 0, gri);
    // baş: sapın ucunda; açılırken büyür, "onsuz"da öne eğilir
    g.translate(0, -l.L);
    g.rotate(son * (0.9 + 0.15 * k) * (l.r >= 0 ? 1 : -1));
    cift(g, l.bas, l.basG, 0, 2, gri, { sx: lerp(0.6, 1, ac) * (1 - 0.08 * son), sy: lerp(0.5, 1, ac) * (1 - 0.12 * son) });
    g.restore();
  });
}
function kandilCiz(g, t, { t0, bg, ol, gri }) {
  const lx = 0, ly = 26;
  cift(g, kandil, kandilG, lx, ly, gri);
  const fx = lx + Y.FITIL[0], fy = ly + Y.FITIL[1];
  // alev: girişten hemen sonra tutuşur, "onsuz"da titreyip söner
  const tut = ease.outBack(an(t, t0 + 0.32, 0.45, ease.lin), 1.8);
  const son = an(t, karaVaris(0) - 0.08, 0.42, ease.inCubic);
  const boy = tut * (1 - son) * (1 + 0.18 * bg);
  if (boy > 0.01) {
    const tit = 1 + 0.07 * Math.sin(t * 13.3) + 0.045 * Math.sin(t * 22.1 + 1.3) + 0.03 * Math.sin(t * 5.1);
    const yan = 0.06 * Math.sin(t * 7.7) + 0.03 * Math.sin(t * 12.9 + 2) + son * 0.25 * Math.sin(t * 31);
    const isik = boy * (0.75 + 0.25 * tit);
    M.hale(g, fx, fy - 24, 120 + 70 * bg, '#FFE8A8', 0.5 * isik);
    M.hale(g, fx, fy - 24, 46, '#FFFBEA', 0.55 * isik);
    M.isinlar(g, fx, fy - 26, 34, 34 + (34 + 30 * bg) * boy, t, { sayi: 14, alfa: (0.32 + 0.3 * bg) * boy, kal: 1.8, hiz: 0.15, tohum: 5, titresim: 0.6 });
    ogeCiz(g, alev, fx, fy + 1, { sx: boy * (2 - tit) * 0.95, sy: boy * tit, r: yan });
  }
  // duman: söndükten sonra ince kıvrımlar yükselir
  const du = (t - (karaVaris(0) + 0.16)) / 1.6;
  if (du > 0 && du < 1) Y.duman(g, fx, fy - 4, du, t, { alfa: 0.9 });
}

// --- kuş
const BAS_POZ = [0.0, -0.18, 0.06, -0.1, 0.16, -0.22, 0.02, 0.12, -0.06];
function kusCiz(g, t, { t0, bg, ol, gri }) {
  g.save();
  g.translate(0, 34);
  g.scale(0.9, 0.9);
  // dal, yapraklar, çiçekler (hafif salınım)
  cift(g, dal.dal, dalG.dal, 0, 0, gri);
  dal.yapraklar.forEach((y, k) => cift(g, y.oge, dalG.yapraklar[k], y.x, y.y, gri, { r: y.r + Math.sin(t * 1.6 + k) * 0.05 }));
  dal.cicekler.forEach((c, k) => cift(g, c.oge, dalG.cicekler[k], c.x, c.y, gri, { s: c.s * (1 - 0.12 * ol), r: Math.sin(t * 1.2 + k * 2) * 0.08 }));
  // kuş: baş kesik kesik döner (kuş gibi), ötme patlamaları
  const bx = -6, by = 2;
  const canli = an(t, t0 + 0.25, 0.3) * (1 - ol);
  const adim = (t - t0) / 0.62;
  const ki = Math.max(0, Math.floor(adim));
  const gec = ease.inOutCubic(clamp((adim - ki) / 0.22));
  let basA = lerp(BAS_POZ[ki % BAS_POZ.length], BAS_POZ[(ki + 1) % BAS_POZ.length], gec) * canli;
  // ötme: belirli aralıklarla, bağlanınca daha sık
  const otme = (u) => smooth(0, 0.08, u) * smooth(0.75, 0.6, u);
  const per = lerp(1.7, 1.05, bg);
  const ou = ((t - t0 - 0.45) / per) % 1;
  const ot = t > t0 + 0.45 ? otme(ou) * canli : 0;
  basA += -0.16 * ot; // öterken başını kaldırır
  basA += 0.42 * ease.inOutSine(ol); // susunca başı düşer
  const gaga = ot * (0.22 + 0.2 * Math.abs(Math.sin(t * 19)));
  const cok = 2.5 * ease.inOutSine(ol);
  g.save();
  g.translate(bx, by + cok);
  g.rotate(0.04 * ol);
  cift(g, kus.govde, kusG.govde, 0, 0, gri, { sy: 1 + 0.015 * Math.sin(t * 3.2), pivot: [0, 0] });
  cift(g, kus.kanat, kusG.kanat, 20, -50, gri, { r: -0.05 * ot * Math.sin(t * 9), pivot: [20, -50] });
  g.save();
  g.translate(Y.KUS.boyun[0], Y.KUS.boyun[1]);
  g.rotate(basA);
  g.translate(-Y.KUS.boyun[0], -Y.KUS.boyun[1]);
  cift(g, kus.gagaAlt, kusG.gagaAlt, Y.KUS.gaga[0], Y.KUS.gaga[1], gri, { pivot: Y.KUS.gaga, r: gaga });
  cift(g, kus.gagaUst, kusG.gagaUst, Y.KUS.gaga[0], Y.KUS.gaga[1], gri, { pivot: Y.KUS.gaga, r: -gaga * 0.35 });
  cift(g, kus.bas, kusG.bas, 0, 0, gri);
  // göz
  g.fillStyle = ol > 0.5 ? '#4A4656' : '#1E2240';
  g.beginPath(); g.arc(Y.KUS.goz[0], Y.KUS.goz[1], 3.4, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.beginPath(); g.arc(Y.KUS.goz[0] + 1, Y.KUS.goz[1] - 1.1, 1.0, 0, TAU); g.fill();
  // ses yayları gagadan
  if (ot > 0.02) Y.sesYaylari(g, 86, -80, t, ot * (0.7 + 0.3 * bg), { renk: bg > 0.3 ? '#D9A93F' : '#B98A2E', yon: -0.3 });
  g.restore();
  g.restore();
  g.restore();
}

// --- nar
function narCiz(g, t, { t0, bg, ol, gri, i }) {
  const acil = an(t, t0 + 0.36, 0.42, ease.outCubic);
  const ez = Math.sin(Math.PI * clamp((t - t0 - 0.36) / 0.4)) * 0.06; // açılırken esneme
  const kur = 1 - 0.05 * ol;
  const opt = { s: 1.1 * kur, sx: 1.1 * kur * (1 + ez), sy: 1.1 * kur * (1 - ez), r: 0.05 * ol };
  const x = 0, y = 10;
  if (acil < 1) ogeCiz(g, narK, x, y, opt);
  if (acil > 0 && acil < 1) ogeAcarak(g, narA, x, y, acil, { s: 1.1, mod: 'daire', merkez: Y.NAR_ACIK_MERKEZ, yumusak: 0.25 });
  if (acil >= 1) {
    ogeCiz(g, narA, x, y, opt);
    if (gri - ol > 0.005) ogeCiz(g, narAG, x, y, { ...opt, alfa: gri - ol });
    if (ol > 0.001) ogeCiz(g, narKuruG, x, y, { ...opt, alfa: ol });
  }
  // tane parıltıları
  const pr = acil * (1 - ol);
  if (pr > 0.05) {
    narYildiz.forEach(([px, py], k) => {
      const per = lerp(1.6, 1.0, bg);
      const u = ((t * (1 / per) + k * 0.37) % 1);
      const a = Math.sin(clamp(u / 0.35) * Math.PI) * pr * (0.55 + 0.45 * bg);
      if (a > 0.02) Y.parilti(g, x + px * 1.1, y + py * 1.1, 7 + 4 * bg, a);
    });
  }
}

// --- bal
function balCiz(g, t, { t0, bg, ol, gri }) {
  const x = 0, y = -8, s = 1.12, r = -0.08;
  cift(g, petek, petekG, x, y, gri, { s, r });
  const parl = 1 - ol;
  if (parl > 0.01) ogeCiz(g, petekP, x, y, { s, r, alfa: parl });
  // damlanın petekteki yeri (dönüş ve ölçekle)
  const [dx0, dy0] = Y.BAL_DAMLA_YERI;
  const dx = x + s * (dx0 * Math.cos(r) - dy0 * Math.sin(r)) + 1;
  const dy = y + s * (dx0 * Math.sin(r) + dy0 * Math.cos(r)) + 6;
  const R = 8 * 1.0; // damla yarıçapı
  const P = lerp(1.7, 1.25, bg);
  const t1 = t0 + 0.55;
  const olT = karaVaris(3) - 0.1;
  const zemin = dy + 68;
  if (t > t1) {
    const tau = t - t1;
    const k = Math.floor(tau / P);
    const u = (tau - k * P) / P;
    const ts = t1 + k * P;
    if (ts < olT) {
      if (u < 0.62) {
        const v = u / 0.62;
        const sc = 0.25 + 0.75 * ease.inOutSine(v);
        const sy = 1 + 0.4 * v * v;
        cift(g, damla, damlaG, dx, dy + 2.3 * R * sc * sy, gri, { sx: sc, sy: sc * sy });
      } else {
        const v = (u - 0.62) / 0.38;
        const yy = dy + 2.3 * R * 1.4 + (zemin - dy - 2.3 * R * 1.4) * v * v;
        cift(g, damla, damlaG, dx, yy, gri, { s: 1, sy: 1.12, alfa: 1 - smooth(0.8, 1, v) });
      }
    }
    // önceki damlanın sıçraması
    const su = tau - k * P;
    if (k >= 1 && su < 0.35 && t1 + (k - 1) * P < olT) {
      const e = ease.outCubic(su / 0.35);
      konturCiz(g, elips(dx, zemin + 4, 6 + 16 * e, 2 + 4 * e)[0].pts, { renk: '#C8962E', kal: 1.6, alfa: 0.7 * (1 - e), kapali: true, titreme: 0.2, tohum: 91 });
    }
  }
  // donuk, asılı kalan küçük damla (sönünce)
  if (ol > 0.01) {
    const sc = 0.5 * ease.outCubic(ol);
    cift(g, damla, damlaG, dx, dy + 2.3 * R * sc, 1, { s: sc, sy: sc * 1.15 });
  }
  // ıslak parıltı (bağlanınca)
  if (bg > 0.05 && parl > 0.05) {
    for (let k = 0; k < 3; k++) {
      const u = (t * 0.8 + k * 0.33) % 1;
      const a = Math.sin(clamp(u / 0.3) * Math.PI) * bg * parl;
      const hx = [-30, 14, 38][k], hy = [-40, -8, -36][k];
      if (a > 0.02) Y.parilti(g, x + hx, y + hy, 9, a);
    }
  }
}
