// s10 açılışı: kuşbakışı devasa gri labirent, ortasında küçücük adam. Bulutları yaran bir ışık huzmesi adamın
// üzerine iner; ışığa giden düz bir yol açılır; duvarlar merkezden dışa altın ışığa dönüşüp erir.
import { tuval, W, H, clamp, lerp, ease, an, rng, TAU, rgba, Path2D } from '../motor/temel.mjs';
import { oge, ogeCiz, tara, konturCiz, TON } from '../motor/kalem.mjs';
import { svg, elips, dikdortgen } from '../motor/sekil.mjs';
import { kameraYolu, kameraUygula, ekranda } from '../motor/sahne.mjs';
import * as M from '../motor/motifler.mjs';
import { tampon, radyalMaske, huzme, zerreler, isikBas } from './s10-yardim.mjs';

// ---------------------------------------------------------------- labirent geometrisi
export const C = 44; // hücre
const WT = 11; // duvar kalınlığı
const HV = 9; // duvarın kuşbakışı görünen yan yüzü (yükseklik)
const NX = 35, NY = 57;
const MXc = 17, MYc = 28; // adamın hücresi
export const ADAM = [540, 960]; // adamın dünya konumu
const X0 = ADAM[0] - (MXc + 0.5) * C, Y0 = ADAM[1] - (MYc + 0.5) * C;
const SX0 = X0 - 120, SY0 = Y0 - 120, SW = NX * C + 240, SH = NY * C + 240;

function labirentUret(tohum) {
  const r = rng(tohum);
  const kuzey = Array.from({ length: NY + 1 }, () => new Array(NX).fill(true));
  const bati = Array.from({ length: NY }, () => new Array(NX + 1).fill(true));
  const gor = Array.from({ length: NY }, () => new Array(NX).fill(false));
  const yigin = [[MXc, MYc]];
  gor[MYc][MXc] = true;
  while (yigin.length) {
    const [x, y] = yigin[yigin.length - 1];
    const kom = [];
    if (y > 0 && !gor[y - 1][x]) kom.push([x, y - 1, 'k']);
    if (y < NY - 1 && !gor[y + 1][x]) kom.push([x, y + 1, 'g']);
    if (x > 0 && !gor[y][x - 1]) kom.push([x - 1, y, 'b']);
    if (x < NX - 1 && !gor[y][x + 1]) kom.push([x + 1, y, 'd']);
    if (!kom.length) { yigin.pop(); continue; }
    // uzun koridorlar: aynı yönde devam etmeyi biraz yeğle
    const [nx, ny, yon] = kom[Math.floor(r() * kom.length)];
    if (yon === 'k') kuzey[y][x] = false;
    if (yon === 'g') kuzey[y + 1][x] = false;
    if (yon === 'b') bati[y][x] = false;
    if (yon === 'd') bati[y][x + 1] = false;
    gor[ny][nx] = true;
    yigin.push([nx, ny]);
  }
  // duvar dikdörtgenleri: yatay ve dikey kesintisiz koşular
  const rects = [];
  for (let y = 0; y <= NY; y++) {
    let a = -1;
    for (let x = 0; x <= NX; x++) {
      const var_ = x < NX && kuzey[y][x];
      if (var_ && a < 0) a = x;
      if (!var_ && a >= 0) { rects.push([X0 + a * C - WT / 2, Y0 + y * C - WT / 2, X0 + x * C + WT / 2, Y0 + y * C + WT / 2]); a = -1; }
    }
  }
  for (let x = 0; x <= NX; x++) {
    let a = -1;
    for (let y = 0; y <= NY; y++) {
      const var_ = y < NY && bati[y][x];
      if (var_ && a < 0) a = y;
      if (!var_ && a >= 0) { rects.push([X0 + x * C - WT / 2, Y0 + a * C - WT / 2, X0 + x * C + WT / 2, Y0 + y * C + WT / 2]); a = -1; }
    }
  }
  return rects;
}

function rectYol(rects, k = 0, dy0 = 0, dy1 = 0) {
  const p = new Path2D();
  for (const [x0, y0, x1, y1] of rects) p.rect(x0 - k, y0 + dy0 - k, x1 - x0 + 2 * k, y1 - y0 + dy1 - dy0 + 2 * k);
  return p;
}

const P_GRI = {
  golge: '#4E4860', golgeA: 0.3, kontur: '#5A536C', yan: '#A59DB2', yanTara: [[0, '#9890A8'], [1, '#625B74']],
  ust: '#ECEAF0', ustTara: [[0, '#DEDAE5'], [1, '#ABA4B8']], parilti: null,
};
const P_ALTIN = {
  golge: '#C99A3A', golgeA: 0.0, kontur: '#B8862A', yan: '#F2D78E', yanTara: [[0, '#EFCB72'], [1, '#C9962E']],
  ust: '#FFF7DC', ustTara: [[0, '#FBE9B4'], [1, '#E6C064']], parilti: '#FFD978',
};

function duvarSprite(rects, P, S) {
  const c = tuval(SW * S, SH * S);
  const g = c.getContext('2d');
  g.scale(S, S);
  g.translate(-SX0, -SY0);
  // gölge (yere düşen, yumuşak)
  if (P.golgeA > 0) {
    const tmp = tuval(SW * S, SH * S);
    const t = tmp.getContext('2d');
    t.scale(S, S);
    t.translate(-SX0, -SY0);
    t.fillStyle = P.golge;
    t.fill(rectYol(rects, 0, 6, 12));
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = P.golgeA;
    g.filter = `blur(${5 * S}px)`;
    g.drawImage(tmp, 0, 0);
    g.restore();
  }
  // ışık duvarı: dışa yayılan altın parıltı
  if (P.parilti) {
    const tmp = tuval(SW * S, SH * S);
    const t = tmp.getContext('2d');
    t.scale(S, S);
    t.translate(-SX0, -SY0);
    t.fillStyle = P.parilti;
    t.fill(rectYol(rects, 7, -HV, 0));
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalAlpha = 0.75;
    g.filter = `blur(${9 * S}px)`;
    g.drawImage(tmp, 0, 0);
    g.restore();
  }
  // kontur (birleşik dış hat), yan yüz, yan tarama, üst yüz, üst tarama
  g.fillStyle = P.kontur;
  g.fill(rectYol(rects, 1.5, -HV, 0));
  g.fillStyle = P.yan;
  g.fill(rectYol(rects, 0, -HV, 0));
  const yanYol = new Path2D();
  for (const [x0, y0, x1, y1] of rects) yanYol.rect(x0, y1 - HV, x1 - x0, HV);
  g.save();
  g.clip(yanYol);
  tara(g, { x0: SX0, y0: SY0, x1: SX0 + SW, y1: SY0 + SH, yon: Math.PI / 2 - 0.15, aralik: 2.6, boy: [6, 12], kal: 1.1, alfa: 0.55, ton: () => 0.7, renkler: P.yanTara, esikler: [0.3, 0.6], minUc: 3, tohum: 17 });
  g.restore();
  // üst yüzün alt kenar çizgisi
  g.fillStyle = P.kontur;
  for (const [x0, y0, x1, y1] of rects) g.fillRect(x0, y1 - HV - 0.7, x1 - x0, 1.6);
  g.fillStyle = P.ust;
  const ustYol = new Path2D();
  for (const [x0, y0, x1, y1] of rects) ustYol.rect(x0, y0 - HV, x1 - x0, y1 - y0 - 0.9);
  g.fill(ustYol);
  g.save();
  g.clip(ustYol);
  tara(g, { x0: SX0, y0: SY0, x1: SX0 + SW, y1: SY0 + SH, yon: -0.5, aralik: 3.0, boy: [10, 28], kal: 1.05, alfa: 0.4, ton: TON.gurultulu(() => 0.45, 0.2, 0.01, 4), renkler: P.ustTara, esikler: [0.3, 0.62], minUc: 4, tohum: 23 });
  g.restore();
  return { tuval: c, ox: -SX0, oy: -SY0, olcek: S, w: SW, h: SH, sinir: { x0: SX0, y0: SY0, x1: SX0 + SW, y1: SY0 + SH, w: SW, h: SH, cx: SX0 + SW / 2, cy: SY0 + SH / 2 } };
}

function zeminSprite(ad, sicak) {
  return oge({
    ad, olcek: 0.8, sekil: dikdortgen(SX0, SY0, SW, SH), arka: sicak ? '#F8EDCD' : '#D2CED8', arkaAlfa: 0.85, arkaBulanik: 10,
    tarama: {
      ton: TON.gurultulu(() => 0.5, 0.22, 0.004, sicak ? 9 : 5), renkler: sicak ? [[0, '#F6E6B8'], [1, '#DDBB6A']] : [[0, '#C6C1CC'], [1, '#8C849A']],
      yon: -0.42, aralik: 3.6, boy: [40, 110], kal: 1.15, alfa: sicak ? 0.4 : 0.45, esikler: [0.25, 0.55],
    },
    kontur: null, pay: 2,
  });
}

// kuşbakışı adam: omuzlar (gömlek), baş (saç), göğüs önde (kuzey = -y)
function adamUstten() {
  const govde = oge({
    ad: 's10-ustten-govde', olcek: 3, sekil: svg('M-15 -1C-15 -6 -10 -8 0 -8C10 -8 15 -6 15 -1C15 5 10 7 0 7C-10 7 -15 5 -15 -1Z'),
    arka: '#E9DDC4', tarama: { ton: TON.kure(2, -2, 15), renkler: [[0, '#E6DAC3'], [1, '#B5A48A']], yon: 0.2, aralik: 1.8, boy: [4, 10], kal: 0.7, alfa: 0.55, esikler: [0.2, 0.55] },
    kontur: '#7C6A55', konturKal: 1.1, pay: 3,
  });
  const kol = oge({
    ad: 's10-ustten-kol', olcek: 3, sekil: elips(0, 0, 3.4, 6.5), arka: '#E9DDC4',
    tarama: { ton: TON.kure(1, -1, 4), renkler: [[0, '#E6DAC3'], [1, '#B5A48A']], yon: 1.4, aralik: 1.6, boy: [3, 7], kal: 0.6, alfa: 0.5, esikler: [0.3] },
    kontur: '#7C6A55', konturKal: 1.0, pay: 3,
  });
  const bas = oge({
    ad: 's10-ustten-bas', olcek: 3, sekil: elips(0, 0, 6.6, 7.2), arka: '#5A4130',
    tarama: { ton: TON.kure(1.5, -1.5, 7), renkler: [[0, '#6E513C'], [1, '#3B2A1F']], yonF: (x, y) => Math.atan2(y, x) + 1.4, aralik: 1.4, boy: [3, 7], kal: 0.6, alfa: 0.6, esikler: [0.2, 0.55] },
    kontur: '#2E2119', konturKal: 1.0, pay: 3,
  });
  return { govde, kol, bas };
}
function adamUsttenCiz(ctx, A, x, y, s, t, nefes = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // gölge
  ctx.fillStyle = 'rgba(70,62,88,0.22)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 17, 10, 0, 0, TAU);
  ctx.fill();
  const b = 1 + 0.012 * Math.sin(t * 2.3) * nefes;
  ogeCiz(ctx, A.kol, -15.5, 0.5, { r: 0.08 });
  ogeCiz(ctx, A.kol, 15.5, 0.5, { r: -0.08 });
  ogeCiz(ctx, A.govde, 0, 0, { s: b });
  ogeCiz(ctx, A.bas, 0, -1.5);
  ctx.restore();
}

// kuşbakışı bulut (yuvarlak loblu leke)
function bulutUstten(w, tohum, koyu) {
  const r = rng(tohum);
  const parca = [];
  for (let i = 0; i < 9; i++) {
    const a = r() * TAU, d = r.ara(0, w * 0.32);
    parca.push({ x: Math.cos(a) * d * 1.3, y: Math.sin(a) * d * 0.7, R: w * r.ara(0.16, 0.27) });
  }
  const pts = [];
  for (let k = 0; k < 180; k++) {
    const a = (k / 180) * TAU, dx = Math.cos(a), dy = Math.sin(a);
    let best = 0;
    for (const p of parca) {
      const b = p.x * dx + p.y * dy, c2 = p.x * p.x + p.y * p.y - p.R * p.R, D = b * b - c2;
      if (D >= 0) best = Math.max(best, b + Math.sqrt(D));
    }
    pts.push([dx * best, dy * best]);
  }
  return oge({
    ad: `s10-bulut-ustten-${w}-${tohum}-${koyu}`, olcek: 0.8, sekil: [{ pts, kapali: true }], arka: koyu ? '#C9C4D2' : '#F2EFF6', arkaAlfa: 0.7, arkaBulanik: 18, arkaTasma: false,
    tarama: { ton: TON.gurultulu(TON.radyal(0, 0, w * 0.6, 0.15, 0.85), 0.15, 0.01, tohum), renkler: koyu ? [[0, '#C5BFD0'], [1, '#8D85A0']] : [[0, '#E1DCEB'], [1, '#B3ABC6']], yon: -0.16, aralik: 3.6, boy: [30, 90], kal: 1.2, alfa: 0.4, esikler: [0.35, 0.6] },
    kontur: null, pay: 24,
  });
}

// ---------------------------------------------------------------- hazırlık ve çizim
let rects, duvarGri, duvarAltin, zeminGri, zeminSicak, adam, bulutlar, yolOge;
let labHazir = false;
export function labirentHazirla() {
  if (labHazir) return;
  labHazir = true;
  rects = labirentUret(2024);
  duvarGri = duvarSprite(rects, P_GRI, 1.15);
  duvarAltin = duvarSprite(rects, P_ALTIN, 0.8);
  zeminGri = zeminSprite('s10-lab-zemin-gri', false);
  zeminSicak = zeminSprite('s10-lab-zemin-sicak', true);
  adam = adamUstten();
  bulutlar = [
    { o: bulutUstten(560, 3, true), x: 300, y: 330, yon: -1 },
    { o: bulutUstten(620, 8, true), x: 820, y: 470, yon: 1 },
    { o: bulutUstten(420, 12, true), x: 120, y: 760, yon: -1 },
    { o: bulutUstten(480, 15, true), x: 1000, y: 120, yon: 1 },
    { o: bulutUstten(520, 21, true), x: 980, y: 1500, yon: 1 },
    { o: bulutUstten(460, 27, true), x: 60, y: 1720, yon: -1 },
  ];
}

/**
 * Labirent evresi. Z: zamanlar { egr, sah, bul, gecis } ; dönüş: kameranın o anki durumu
 * erime yarıçapı R: bul'dan itibaren büyür.
 */
export function labirentCiz(ctx, t, Z) {
  labirentHazirla();
  const kam = kameraYolu([
    { t: 96.1, x: 540, y: 960, z: 0.9, r: 0 },
    { t: Z.egr, x: 540, y: 955, z: 0.94, e: ease.inOutSine },
    { t: Z.bul, x: 540, y: 940, z: 1.08, r: 0.0, e: ease.inOutSine },
    { t: Z.gecis + 0.25, x: 540, y: 950, z: 3.6, r: 0.07, e: ease.inCubic },
  ])(t);
  const cam = kam;
  const [ax, ay, az] = ekranda(cam, ADAM[0], ADAM[1]);
  // erime dalgası (dünya biriminde yarıçap) ve düz yol
  const R = 1700 * an(t, Z.bul + 0.12, 1.05, (u) => u * u * (1.6 - 0.6 * u));
  const yolU = an(t, Z.bul - 0.02, 0.5, ease.outCubic); // yol kuzeye uzanır
  const yolUst = lerp(ADAM[1], Y0 - 200, yolU);
  const isik = an(t, Z.egr, 0.7, ease.inOutSine); // huzme
  const sicaklik = an(t, Z.sah, 0.6);

  // 1) gri zemin
  ctx.save();
  kameraUygula(ctx, cam, 1);
  ogeCiz(ctx, zeminGri, 0, 0);
  ctx.restore();

  // 2) sıcak zemin: erime alanında + yol şeridinde + huzmenin havuzunda
  {
    const tb = tampon('lab-sicak');
    const g = tb.getContext('2d');
    g.save();
    kameraUygula(g, cam, 1);
    ogeCiz(g, zeminSicak, 0, 0);
    g.restore();
    // maske: daire (erime) ∪ yol ∪ havuz — maske tamponunda birleştir
    const mk = tampon('lab-maske');
    const m = mk.getContext('2d');
    const rr = R * az;
    if (rr > 1) {
      const gr = m.createRadialGradient(ax, ay, 0, ax, ay, rr + 1);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(clamp(1 - 160 * az / (rr + 1)), 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = gr;
      m.fillRect(ax - rr - 2, ay - rr - 2, 2 * rr + 4, 2 * rr + 4);
    }
    const havuz = 70 * az * (0.6 + 0.4 * sicaklik) * isik;
    if (havuz > 1) {
      const gr = m.createRadialGradient(ax, ay, 0, ax, ay, havuz * 2);
      gr.addColorStop(0, `rgba(0,0,0,${0.95 * isik})`);
      gr.addColorStop(0.5, `rgba(0,0,0,${0.55 * isik})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = gr;
      m.fillRect(ax - havuz * 2, ay - havuz * 2, havuz * 4, havuz * 4);
    }
    if (yolU > 0) {
      m.save();
      kameraUygula(m, cam, 1);
      const yw = C - WT - 4;
      const gr = m.createLinearGradient(0, ADAM[1], 0, yolUst);
      gr.addColorStop(0, 'rgba(0,0,0,1)');
      gr.addColorStop(0.85, 'rgba(0,0,0,1)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      m.fillStyle = gr;
      m.fillRect(ADAM[0] - yw / 2, yolUst, yw, ADAM[1] - yolUst + 8);
      m.restore();
    }
    g.globalCompositeOperation = 'destination-in';
    g.drawImage(mk, 0, 0);
    ctx.drawImage(tb, 0, 0);
  }

  // 3) gri duvarlar (erime alanı ve yol şeridi silinmiş)
  {
    const tb = tampon('lab-duvar');
    const g = tb.getContext('2d');
    g.save();
    kameraUygula(g, cam, 1);
    ogeCiz(g, duvarGri, 0, 0);
    if (yolU > 0) {
      // yol şeridinde yatay duvarlar kesilir
      g.globalCompositeOperation = 'destination-out';
      const yw = C - WT - 1;
      g.fillStyle = '#000';
      g.fillRect(ADAM[0] - yw / 2, yolUst + 30, yw, ADAM[1] - yolUst);
    }
    g.restore();
    const rr = R * az;
    if (rr > 1) radyalMaske(g, ax, ay, [[0, 1], [Math.max(0.5, rr - 70 * az), 1], [rr, 0]], 'destination-out');
    ctx.drawImage(tb, 0, 0);
  }

  // 4) altın ışık duvarları: erime cephesinde ince bir bant
  const rr = R * az;
  if (rr > 4) {
    const tb = tampon('lab-altin');
    const g = tb.getContext('2d');
    g.save();
    kameraUygula(g, cam, 1);
    ogeCiz(g, duvarAltin, 0, 0);
    g.restore();
    const b = 150 * az;
    radyalMaske(g, ax, ay, [[0, 0], [Math.max(0, rr - b * 1.25), 0], [Math.max(0.6, rr - b * 0.45), 1], [rr + 6 * az, 0.9], [rr + 40 * az, 0]], 'destination-in');
    ctx.drawImage(tb, 0, 0);
    // cephe parıltısı
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const gr = ctx.createRadialGradient(ax, ay, Math.max(0, rr - b), ax, ay, rr + 30 * az);
    gr.addColorStop(0, 'rgba(255,240,200,0)');
    gr.addColorStop(0.7, 'rgba(255,236,180,0.28)');
    gr.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  // yolun kestiği duvarlarda altın kıvılcım; yolun kenarlarında ince altın çizgiler
  if (yolU > 0) {
    ctx.save();
    kameraUygula(ctx, cam, 1);
    const yw = C - WT - 4;
    for (const sx of [-1, 1]) konturCiz(ctx, [[ADAM[0] + sx * yw / 2, ADAM[1] + 4], [ADAM[0] + sx * yw / 2, yolUst + 40]], { renk: '#D9A93F', kal: 1.6, alfa: 0.7 * (1 - an(t, Z.gecis - 0.3, 0.4)), kapali: false, titreme: 0.3, tohum: 30 + sx });
    ctx.restore();
    const [, yUstE] = ekranda(cam, ADAM[0], yolUst);
    M.hale(ctx, ax, yUstE + 40, 90 * az, '#FFF1C4', 0.55 * (1 - yolU * 0.6));
  }

  // 5) adam (kuşbakışı) — ışıkta
  ctx.save();
  kameraUygula(ctx, cam, 1);
  adamUsttenCiz(ctx, adam, ADAM[0], ADAM[1], 1.0, t);
  ctx.restore();

  // 6) huzme ve havuz
  if (isik > 0) {
    const kaynakX = W / 2 + 40, kaynakY = -260;
    huzme(ctx, kaynakX, kaynakY, lerp(30, 260, isik), ax, ay, (34 + 22 * sicaklik) * az, isik, {});
    M.hale(ctx, ax, ay, 150 * az * (0.7 + 0.3 * sicaklik), '#FFF0BE', 0.55 * isik);
    M.hale(ctx, ax, ay, 46 * az, '#FFFFFF', 0.45 * isik);
    M.isinlar(ctx, ax, ay, 26 * az, 95 * az * (0.6 + 0.4 * sicaklik), t, { sayi: 22, alfa: 0.4 * isik * sicaklik, kal: Math.max(1.4, 2 * Math.sqrt(az)), tohum: 5, renk: '#E2B44C' });
    zerreler(ctx, ax - 160 * az, ay - 900, 320 * az, 900, t, { sayi: 22, alfa: 0.7 * isik, hiz: 60, tohum: 8, boy: 2.6 });
  }

  // 7) erime zerreleri (cepheden yükselen ışık)
  if (rr > 10 && rr < 2600) {
    const r = rng(77);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const n = 70;
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, gecik = r() * 0.5;
      const d = Math.max(0, rr - r() * 150 * az);
      const omur = clamp((t - (Z.bul + 0.12)) - gecik, 0, 1);
      const px = ax + Math.cos(a) * d, py = ay + Math.sin(a) * d - 40 * az * (r() + 0.5) * omur;
      const b = (2 + r() * 3) * Math.sqrt(az);
      const al = 0.75 * Math.sin(Math.PI * clamp((t * 1.7 + r()) % 1));
      const gr = ctx.createRadialGradient(px, py, 0, px, py, b * 3);
      gr.addColorStop(0, `rgba(255,244,205,${al})`);
      gr.addColorStop(1, 'rgba(255,244,205,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(px - b * 3, py - b * 3, b * 6, b * 6);
    }
    ctx.restore();
  }

  // 8) bulutlar (kameraya yakın, paralaks 1.5): huzme gelince yarılır
  const yaril = an(t, Z.egr - 0.05, 1.3, ease.inOutCubic);
  const bulutA = an(t, 96.1, 0.5) * (1 - an(t, Z.bul, 0.8));
  if (bulutA > 0.005) {
    ctx.save();
    kameraUygula(ctx, cam, 1.5);
    for (const b of bulutlar) {
      const dx = b.yon * 520 * yaril + Math.sin(t * 0.3 + b.x) * 8 + t * 4 * b.yon;
      ogeCiz(ctx, b.o, b.x + dx, b.y - 60 * yaril, { alfa: 0.78 * bulutA * (1 - 0.35 * yaril) });
    }
    ctx.restore();
  }

  // 9) gri-lila hava (huzmeden önce dünya kasvetli), huzmeyle açılır
  const kasvet = 1 - an(t, Z.egr, 1.2);
  if (kasvet > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(214,208,224,${0.45 * kasvet})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  return { cam, ax, ay, az };
}
