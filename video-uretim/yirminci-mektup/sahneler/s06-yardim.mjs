// s06 yardımcıları: perspektif (sonsuza giden yol), yol kandilleri, yol ağaçları (LOD'lu bileşik sprite'lar),
// ufuk kapıları (sırlar), ova şeritleri, dağlar, tepe (adamın durduğu sırt), toprak kesiti, tohum, ağacın kesik
// çizgili hayali, gökte yükselen fenerler ve kamera için pürüzsüz (hız sürekli) yol. Hepsi S-232 tekniğiyle.
import { tuval, rng, clamp, lerp, ease, TAU, rgba } from '../motor/temel.mjs';
import { oge, ogeCiz, konturCiz, darbe, TON, PALET } from '../motor/kalem.mjs';
import { svg, elips, cokgen, sivriKemer, yenidenOrnekle } from '../motor/sekil.mjs';
import * as M from '../motor/motifler.mjs';

// ---------------------------------------------------------------- perspektif
// Kamera yerde (X yanal, Z derinlik; metre). Ekran (nötr görünüş): x = vx + F·X/Z, y = hy + (k − F·h)/Z.
export const PERS = { F: 900, k: 2100, vx: 700, hy: 880 };
export const proj = (X, Z, h = 0) => [PERS.vx + (PERS.F * X) / Z, PERS.hy + (PERS.k - PERS.F * h) / Z];
export const zemindenZ = (y) => PERS.k / (y - PERS.hy);

// ---------------------------------------------------------------- pürüzsüz kamera (monoton kübik Hermite)
/** anahtarlar: [{t, x, y, z}] → t'de {x, y, z}. Hız anahtarlarda süreklidir (duraklama yok); aşma yok. */
export function puruzsuzYol(anahtarlar) {
  const ts = anahtarlar.map((a) => a.t);
  const kanal = (vs) => {
    const n = vs.length;
    const d = [];
    for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
    const m = new Array(n).fill(0);
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    m[0] = 0; m[n - 1] = 0;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i];
      const s = a * a + b * b;
      if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
    }
    return (t) => {
      if (t <= ts[0]) return vs[0];
      if (t >= ts[n - 1]) return vs[n - 1];
      let i = 0;
      while (t > ts[i + 1]) i++;
      const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h;
      const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
      return h00 * vs[i] + h10 * h * m[i] + h01 * vs[i + 1] + h11 * h * m[i + 1];
    };
  };
  const fx = kanal(anahtarlar.map((a) => a.x)), fy = kanal(anahtarlar.map((a) => a.y)), fz = kanal(anahtarlar.map((a) => Math.log(a.z)));
  return (t) => ({ x: fx(t), y: fy(t), z: Math.exp(fz(t)) });
}

// ---------------------------------------------------------------- LOD (yarılayarak küçültülmüş kopyalar)
/** Bileşik tuvalden LOD zinciri. ox, oy: yerel (0,0)'ın LOD0'daki pikseli; birim: LOD0'da birim başına piksel */
export function lodYap(c, ox, oy, birim, adet = 6) {
  const L = [{ c, s: 1, ox, oy }];
  let k = c;
  for (let i = 1; i < adet; i++) {
    const w = Math.max(2, Math.round(k.width / 2)), h = Math.max(2, Math.round(k.height / 2));
    const n = tuval(w, h);
    const g = n.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(k, 0, 0, w, h);
    const s = (L[i - 1].s * w) / k.width;
    L.push({ c: n, s, ox: ox * s, oy: oy * s });
    k = n;
    if (w < 8 || h < 8) break;
  }
  return { L, birim };
}
/** LOD'lu çizim: (x, y) dünya, sc: yerel birim → dünya pikseli, z: kamera yakınlaşması (LOD seçimi için) */
export function lodCiz(ctx, lod, x, y, sc, z = 1, { alfa = 1, r = 0, sx = 1 } = {}) {
  if (alfa <= 0.003) return;
  const gerek = (sc * z) / lod.birim; // LOD0 pikselinin ekrandaki boyu
  let sec = lod.L[0];
  for (const l of lod.L) if (l.s >= gerek * 0.92) sec = l;
  const k = sc / (lod.birim * sec.s);
  ctx.save();
  ctx.globalAlpha *= clamp(alfa);
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  ctx.scale(k * sx, k);
  ctx.drawImage(sec.c, -sec.ox, -sec.oy);
  ctx.restore();
}

// ---------------------------------------------------------------- ışık sprite'ı
let parlakSprite = null;
export function parlak() {
  if (parlakSprite) return parlakSprite;
  const c = tuval(256, 256);
  const g = c.getContext('2d');
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,252,236,1)');
  r.addColorStop(0.12, 'rgba(255,240,196,0.85)');
  r.addColorStop(0.35, 'rgba(255,222,150,0.32)');
  r.addColorStop(0.7, 'rgba(255,214,140,0.08)');
  r.addColorStop(1, 'rgba(255,214,140,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 256, 256);
  parlakSprite = c;
  return c;
}
/** Ekleme karışımlı ışık noktası (yarıçap R) */
export function isikNokta(ctx, x, y, R, alfa = 1, karisim = 'screen') {
  if (alfa <= 0.003 || R < 0.3) return;
  ctx.save();
  ctx.globalCompositeOperation = karisim;
  ctx.globalAlpha *= clamp(alfa);
  ctx.drawImage(parlak(), x - R, y - R, R * 2, R * 2);
  ctx.restore();
}

// ---------------------------------------------------------------- yol
/**
 * Yolun orta çizgisi (yerde, metre): noktalar [[X, Z], ...] üzerinden Catmull-Rom; son noktadan sonra dümdüz derine.
 * Döner: { m: [{X, Z, th, s}], at(s), yan(s, d), gen, sBul(Z) }
 */
export function yolModeli({ noktalar, gen = 1.8 }) {
  const P = [noktalar[0], ...noktalar, noktalar[noktalar.length - 1]];
  const ham = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const L = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(8, Math.ceil(L / Math.max(0.08, p1[1] * 0.01)));
    for (let k = 0; k < n; k++) {
      const u = k / n, u2 = u * u, u3 = u2 * u;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      ham.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  ham.push(noktalar[noktalar.length - 1]);
  const m = [];
  let s = 0;
  for (let i = 0; i < ham.length; i++) {
    if (i) s += Math.hypot(ham[i][0] - ham[i - 1][0], ham[i][1] - ham[i - 1][1]);
    const a = ham[Math.max(0, i - 1)], b = ham[Math.min(ham.length - 1, i + 1)];
    m.push({ X: ham[i][0], Z: ham[i][1], th: Math.atan2(b[1] - a[1], b[0] - a[0]), s });
  }
  // uzak uzantı: son doğrultuyla, derinliğe dönerek sonsuza
  let { X, Z, th } = m[m.length - 1];
  while (Z < 6000) {
    const ds = Math.max(0.2, Z * 0.012);
    th = lerp(th, Math.PI / 2, 0.02);
    X += Math.cos(th) * ds; Z += Math.sin(th) * ds; s += ds;
    m.push({ X, Z, th, s });
  }
  const at = (s) => {
    let a = 0, b = m.length - 1;
    if (s <= 0) return m[0];
    if (s >= m[b].s) return m[b];
    while (b - a > 1) { const c = (a + b) >> 1; if (m[c].s <= s) a = c; else b = c; }
    const u = (s - m[a].s) / (m[b].s - m[a].s);
    return { X: lerp(m[a].X, m[b].X, u), Z: lerp(m[a].Z, m[b].Z, u), th: lerp(m[a].th, m[b].th, u), s };
  };
  /** yol ortasından yanal uzaklıkta (sol +) nokta */
  const yan = (s, d) => { const p = at(s); return { X: p.X - Math.sin(p.th) * d, Z: p.Z + Math.cos(p.th) * d }; };
  const sBul = (Z) => { for (const p of m) if (p.Z >= Z) return p.s; return m[m.length - 1].s; };
  return { m, at, yan, gen, sBul };
}
/** Yolun ekrandaki çokgeni (nötr görünüş) */
export function yolCokgen(Y, Zmin = 0, Zmax = 3000) {
  const sol = [], sag = [];
  for (const p of Y.m) {
    if (p.Z > Zmax) break;
    if (p.Z < Zmin) continue;
    const a = { X: p.X - Math.sin(p.th) * Y.gen / 2, Z: p.Z + Math.cos(p.th) * Y.gen / 2 };
    const b = { X: p.X + Math.sin(p.th) * Y.gen / 2, Z: p.Z - Math.cos(p.th) * Y.gen / 2 };
    sol.push(proj(a.X, a.Z));
    sag.push(proj(b.X, b.Z));
  }
  return { sol, sag };
}
/** Yol sprite'ı (Zmin..Zmax parçası): kumlu krem patika, kaçış noktasına yakınsayan tarama, ılık kahve kenar */
export function yolOge(Y, { olcek = 2.2, Zmin = 0, Zmax = 3000, ad = 's06-yol' } = {}) {
  const { sol, sag } = yolCokgen(Y, Zmin, Zmax);
  const pts = [...sol, ...sag.slice().reverse()];
  const { vx, hy } = PERS;
  return oge({
    ad, olcek, sekil: cokgen(pts), arka: '#F2E4C6', arkaAlfa: 0.85, arkaBulanik: 3,
    tarama: [
      { ton: TON.gurultulu((x, y) => clamp(0.14 + (y - hy) / 1500, 0, 0.62), 0.06, 0.02, 4), renkler: [[0, '#F1E2C0'], [0.6, '#DDC59A'], [1, '#C2A274']], yonF: (x, y) => Math.atan2(hy - y, vx - x), aralik: 3.0, boy: [14, 46], kal: 1.15, alfa: 0.42, esikler: [0.22, 0.48] },
    ],
    kontur: null,
    detay: (ctx, api) => {
      api.cizgi(sol, { renk: '#A88458', kal: 1.8, alfa: 0.75, titreme: 0.25, uc: 0.01 });
      api.cizgi(sag, { renk: '#A88458', kal: 1.8, alfa: 0.75, titreme: 0.25, uc: 0.01 });
    },
  });
}

// ---------------------------------------------------------------- kandil (yol feneri)
/** Kandil bileşiği (yerel birim: santimetre, taban (0,0), boy 260). yanik: ışıklı cam */
export function kandilLod(yanik, birim = 2.0) {
  const parcalar = [];
  const direk = oge({
    ad: 's06-kandil-direk', olcek: birim,
    sekil: svg('M-4.2 -12L-3 -206L3 -206L4.2 -12Z'),
    arka: '#8C7A66', arkaAlfa: 0.85, arkaBulanik: 2,
    tarama: { ton: TON.silindir(-4.2, 4.2), renkler: [[0, '#9C8873'], [1, '#4E3F33']], yon: -Math.PI / 2, aralik: 2.2, boy: [20, 60], kal: 1.0, alfa: 0.55, esikler: [0.2, 0.5] },
    kontur: '#3F3228', konturKal: 1.6,
  });
  const kaide = oge({
    ad: 's06-kandil-kaide', olcek: birim, sekil: svg('M-11 0L-8 -14L8 -14L11 0Z'),
    arka: '#9C8873', arkaAlfa: 0.85, tarama: { ton: TON.silindir(-11, 11), renkler: [[0, '#A8937C'], [1, '#55453A']], yon: 0, aralik: 2.2, boy: [6, 14], esikler: [0.3, 0.6] },
    kontur: '#3F3228', konturKal: 1.6,
  });
  const cam = oge({
    ad: 's06-kandil-cam-' + (yanik ? 1 : 0), olcek: birim,
    sekil: svg('M-8 -208L-11 -238L11 -238L8 -208Z'),
    arka: yanik ? '#FFE7A0' : '#E9E4DA', arkaAlfa: 0.9, arkaBulanik: 3,
    tarama: { ton: yanik ? TON.radyal(0, -222, 16, 0.1, 0.8) : TON.silindir(-11, 11), renkler: yanik ? [[0, '#FFF3C8'], [1, '#EDB64A']] : [[0, '#E2DCD0'], [1, '#A49C8E']], yon: -Math.PI / 2, aralik: 2.2, boy: [6, 16], esikler: [0.35, 0.65], alfa: 0.5 },
    kontur: '#8A6420', konturKal: 1.5,
    detay: (ctx, api) => {
      api.cizgi([[-3, -209], [-4, -237]], { renk: '#8A6420', kal: 1.1, alfa: 0.7 });
      api.cizgi([[3, -209], [4, -237]], { renk: '#8A6420', kal: 1.1, alfa: 0.7 });
      if (yanik) api.dolgu(svg('M0 -229C2.4 -225 3 -221 2.4 -218C1.8 -215 -1.8 -215 -2.4 -218C-3 -221 -2.4 -225 0 -229Z'), '#FFFDF0', 0.95);
    },
  });
  const kapak = oge({
    ad: 's06-kandil-kapak', olcek: birim,
    sekil: svg('M-14 -238C-12 -246 -5 -252 0 -258C5 -252 12 -246 14 -238Z'),
    arka: '#D7B060', arkaAlfa: 0.85, tarama: { ton: TON.kure(4, -246, 14), renkler: [[0, '#E8C878'], [1, '#9A6E1E']], yon: -0.6, aralik: 2.2, boy: [6, 14], esikler: [0.25, 0.6] },
    kontur: '#7E5A16', konturKal: 1.5,
    detay: (ctx, api) => {
      api.cizgi([[0, -258], [0, -266]], { renk: '#7E5A16', kal: 1.6 });
      api.dolgu(elips(0, -267, 2.2, 2.2), '#C8963E', 0.95);
      api.cizgi([[-10, -206], [10, -206]], { renk: '#7E5A16', kal: 2.0 });
    },
  });
  parcalar.push(direk, kaide, cam, kapak);
  const x0 = -20, y0 = -275, w = 40, h = 280;
  const c = tuval(w * birim, h * birim);
  const g = c.getContext('2d');
  g.scale(birim, birim);
  g.translate(-x0, -y0);
  for (const p of parcalar) ogeCiz(g, p, 0, 0);
  return lodYap(c, -x0 * birim, -y0 * birim, birim, 7);
}
export const KANDIL_ISIK_Y = -222; // camın ortası (yerel)

// ---------------------------------------------------------------- yol ağacı (bileşik)
/** M.agac'tan bileşik sprite: meyvesiz ve meyveli iki LOD zinciri + doğrudan çizim için ağaç verisi */
export function yolAgaci(tohum, { boy = 300, birim = 2.0, meyve = null } = {}) {
  const A = M.agac({ boy, tohum, olcek: birim });
  const x0 = -boy * 0.66, y0 = -boy * 1.28, w = boy * 1.32, h = boy * 1.32;
  const yap = (meyveli) => {
    const c = tuval(w * birim, h * birim);
    const g = c.getContext('2d');
    g.scale(birim, birim);
    g.translate(-x0, -y0);
    M.agacCiz(g, A, 0, 0, { buyume: 1, yaprak: 1, meyveA: meyveli ? 1 : 0, t: 0, meyveOge: meyve, salinim: 0 });
    return lodYap(c, -x0 * birim, -y0 * birim, birim, 7);
  };
  return { A, bos: yap(false), dolu: yap(true), boy };
}

// ---------------------------------------------------------------- şeritler, dağlar, tepe
/** Üst kenarı ust(x) fonksiyonuyla verilen alan sprite'ı (dünya koordinatı) */
export function alanOge({ ad, X0, X1, ust, alt, olcek = 1, renk, tohum = 1, tonY = 300, aralik = 3.4, boy = [40, 120], konturKal = 1.9, yon = -0.05, ton0 = 0.3, ton1 = 0.78 }) {
  const n = 120;
  const pts = [];
  for (let k = 0; k <= n; k++) { const x = lerp(X0, X1, k / n); pts.push([x, ust(x)]); }
  pts.push([X1, alt], [X0, alt]);
  const ustMin = Math.min(...pts.slice(0, n + 1).map((p) => p[1]));
  return oge({
    ad, olcek, sekil: cokgen(pts), arka: renk.arka, arkaAlfa: 0.85, arkaTasma: true, arkaBulanik: 5,
    tarama: { ton: TON.gurultulu((x, y) => clamp(lerp(ton0, ton1, clamp((y - ustMin) / tonY))), 0.16, 0.008, tohum), renkler: renk.tara, yon, aralik, boy, kal: 1.15, esikler: [0.25, 0.55, 0.8], alfa: 0.5 },
    kontur: renk.kontur, konturKal, titreme: 0.5, konturAtla: [],
    detay: (ctx, api) => {
      // yalnız üst kenara kontur (yan ve alt kenarlar ekran dışında)
    },
  });
}
export const tumsek = (taban, liste) => (x) => taban - liste.reduce((s, [cx, yuk, gen]) => s + yuk * Math.exp(-Math.pow((x - cx) / gen, 2)), 0);

// ---------------------------------------------------------------- ufuk kapısı (sır)
/** Kapı parçaları (yerel: taban ortası (0,0); boy ~62): taş çerçeve, iki kanat, iç açıklık şekli */
export function kapiOgeleri(birim = 3.2) {
  const dis = sivriKemer(-21, 0, 42, 34, 28)[0];
  const ic = sivriKemer(-13.5, 0, 27, 28, 19)[0];
  const cerceve = oge({
    ad: 's06-kapi-cerceve', olcek: birim, sekil: [dis, { pts: ic.pts.slice().reverse(), kapali: true }], kural: 'evenodd',
    arka: '#F3E7CC', arkaAlfa: 0.9, arkaBulanik: 2,
    tarama: { ton: TON.gurultulu(TON.dogrusal(-21, 0, 21, -20, 0.55, 0.15), 0.08, 0.1, 3), renkler: [[0, '#EFE0BE'], [1, '#C7A56A']], yon: -1.2, aralik: 2.2, boy: [6, 16], esikler: [0.3, 0.6], alfa: 0.5 },
    kontur: '#9A7428', konturKal: 1.4,
    detay: (ctx, api) => {
      api.cizgi([[-24, 0.5], [24, 0.5]], { renk: '#9A7428', kal: 1.5 });
      api.dolgu(elips(0, -66, 1.8, 1.8), '#D9A93F', 0.95);
      api.cizgi([[0, -62], [0, -65]], { renk: '#9A7428', kal: 1.1 });
    },
  });
  // kanatlar: iç kemerin sol ve sağ yarısı
  const r = 13.5, h = 28, k = 19;
  const solK = svg(`M-13.5 0V${-h}C-13.5 ${-h - k * 0.55} ${-13.5 + r * 0.55} ${-h - k * 0.85} 0 ${-h - k}V0Z`);
  const sagK = svg(`M13.5 0V${-h}C13.5 ${-h - k * 0.55} ${13.5 - r * 0.55} ${-h - k * 0.85} 0 ${-h - k}V0Z`);
  const kanat = (ad, sekil, sx) => oge({
    ad, olcek: birim, sekil, arka: '#7FB7B0', arkaAlfa: 0.85, arkaBulanik: 2,
    tarama: { ton: TON.gurultulu(TON.dogrusal(sx * 13.5, 0, 0, 0, 0.75, 0.35), 0.06, 0.1, 5), renkler: [[0, '#A9D3CC'], [0.6, '#4F9A92'], [1, '#2B6660']], yon: -Math.PI / 2, aralik: 2.0, boy: [6, 16], esikler: [0.25, 0.5, 0.75], alfa: 0.55 },
    kontur: '#245852', konturKal: 1.3,
    detay: (ctx, api) => {
      api.halka(sivriKemer(sx > 0 ? 3 : -10.5, -6, 7.5, 14, 6)[0].pts, { renk: '#C8963E', kal: 1.0, alfa: 0.85 });
      api.dolgu(elips(sx * -2.5, -17, 1.1, 1.1), '#D9A93F', 0.95);
    },
  });
  return { cerceve, sol: kanat('s06-kapi-sol', solK, -1), sag: kanat('s06-kapi-sag', sagK, 1), ic, r: 13.5 };
}
/**
 * Kapıyı çizer (dünya): (x, y) taban ortası, s ölçek, acik 0..1 kanatların açılması, isik 0..1 içten sızan ışık,
 * cizim 0..1 (belirme). t: zaman (ışınların yavaş dönüşü).
 */
export function kapiCiz(ctx, K, x, y, s, { acik = 0, isik = 0, cizim = 1, t = 0, tohum = 1 } = {}) {
  if (cizim <= 0) return;
  ctx.save();
  ctx.globalAlpha *= clamp(cizim * 1.4);
  // iç açıklık: ışık (kanatların arkasında)
  if (isik > 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.beginPath();
    K.ic.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -48, 0, 0);
    g.addColorStop(0, rgba('#FFF8DC', isik));
    g.addColorStop(1, rgba('#FFE3A0', isik));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
  const sy = clamp(0.25 + cizim * 0.75);
  // kanatlar menteşeden döner (yandan görünüşte daralır)
  const k = Math.cos(acik * 1.35);
  ogeCiz(ctx, K.sol, x - K.r * s, y, { sx: s * k, sy: s * sy, pivot: [-K.r, 0] });
  ogeCiz(ctx, K.sag, x + K.r * s, y, { sx: s * k, sy: s * sy, pivot: [K.r, 0] });
  ogeCiz(ctx, K.cerceve, x, y, { sx: s, sy: s * sy });
  if (isik > 0) {
    // aralıktan sızan ışık: hale + ince kalem ışınları
    const cy = y - 24 * s;
    isikNokta(ctx, x, cy, 95 * s * (0.6 + 0.4 * isik), 0.85 * isik);
    isikNokta(ctx, x, y - 10 * s, 40 * s, 0.75 * isik);
    // önündeki toprağa düşen ışık
    ctx.save();
    ctx.translate(x, y + 3 * s);
    ctx.scale(1, 0.22);
    isikNokta(ctx, 0, 0, 80 * s, 0.55 * isik);
    ctx.restore();
    const r = rng(tohum);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i - 4) * 0.3 + r.ara(-0.08, 0.08) + Math.sin(t * 0.7 + i) * 0.02;
      const r0 = 30 * s, r1 = (60 + r() * 50) * s * isik;
      const pts = [];
      for (let q = 0; q <= 8; q++) { const d = lerp(r0, r0 + r1, q / 8); pts.push([x + Math.cos(a) * d, cy + Math.sin(a) * d * 0.9]); }
      ctx.fillStyle = rgba('#F2C860', 0.7 * isik * r.ara(0.6, 1));
      darbe(ctx, pts, Math.max(1.0, 1.4 * s), { incelme: 0.45, sivri: 0.6 });
    }
    ctx.restore();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- tohum, toprak, hayal
export function tohumOge(birim = 3) {
  return oge({
    ad: 's06-tohum', olcek: birim, sekil: svg('M-17 2C-15 -9 -4 -14 6 -12C14 -10 19 -4 18 2C17 9 8 13 -2 12C-11 11 -18 8 -17 2Z'),
    arka: '#C79A62', arkaAlfa: 0.9, arkaBulanik: 2,
    tarama: { ton: TON.kure(4, -5, 20), renkler: [[0, '#D9AE74'], [0.55, '#A06E3C'], [1, '#5E3D22']], yonF: (x, y) => Math.atan2(y, x) + Math.PI / 2, aralik: 2.0, boy: [6, 16], esikler: [0.2, 0.5, 0.75], alfa: 0.6 },
    kontur: '#4A2F1A', konturKal: 1.6,
    detay: (ctx, api) => {
      api.cizgi([[-13, 1], [-3, -2], [9, -1], [15, 1]], { renk: '#5E3D22', kal: 1.1, alfa: 0.7 });
      api.dolgu(elips(4, -7, 5, 2), '#FFF4DE', 0.7);
    },
  });
}
/**
 * Toprak kesiti penceresi: yüzey çizgisi y0'da (yatay), altı yarım elips (rx, ry); merkez cx. Üstte ince çimen şeridi,
 * katmanlar, birkaç çakıl. Yerel (0,0) = (cx, y0).
 */
export function toprakOge({ rx, ry, olcek = 1.6 }) {
  const pts = [];
  for (let k = 0; k <= 90; k++) { const a = (k / 90) * Math.PI; pts.push([Math.cos(a) * rx, Math.sin(a) * ry]); }
  const r = rng(606);
  return oge({
    ad: 's06-toprak-' + rx + '-' + ry, olcek, sekil: cokgen(pts), arka: '#E3CBA2', arkaAlfa: 0.92, arkaBulanik: 6, arkaTasma: true,
    tarama: [
      { ton: TON.gurultulu((x, y) => clamp(y < 30 ? 0.86 - y * 0.004 : 0.66 - (y - 30) * 0.0016), 0.08, 0.012, 8), renkler: [[0, '#DCC39A'], [0.55, '#AE885B'], [1, '#6E4C30']], yon: -0.04, aralik: 2.9, boy: [26, 80], kal: 1.15, esikler: [0.18, 0.42, 0.68], alfa: 0.52 },
    ],
    kontur: null,
    detay: (ctx, api) => {
      // katman çizgileri
      for (const [d, a] of [[30, 0.55], [92, 0.35]]) {
        const w = rx * Math.sqrt(Math.max(0, 1 - (d / ry) ** 2));
        const p = [];
        for (let k = 0; k <= 40; k++) { const x = lerp(-w, w, k / 40); p.push([x, d + 4 * Math.sin(x * 0.03 + d)]); }
        api.cizgi(p, { renk: '#8C6A48', kal: 1.3, alfa: a, titreme: 0.7 });
      }
      // çimen dipleri
      for (let x = -rx + 10; x < rx - 10; x += 11 + r() * 9) api.cizgi([[x, 6], [x + r.ara(-3, 3), 12 + r() * 9]], { renk: '#6E5034', kal: 1.0, alfa: 0.55 });
      // çakıllar (kenarlara yakın)
      for (let i = 0; i < 9; i++) {
        const sx = i % 2 ? 1 : -1;
        const x = sx * r.ara(rx * 0.45, rx * 0.85), y = r.ara(40, ry * 0.75);
        if ((x / rx) ** 2 + (y / ry) ** 2 > 0.8) continue;
        const ex = r.ara(5, 11), ey = ex * r.ara(0.5, 0.75);
        const e = elips(x, y, ex, ey);
        api.dolgu(e, '#D2C6B6', 0.9);
        api.tara(e, { ton: TON.kure(x + ex * 0.3, y - ey * 0.4, ex * 1.3), renkler: [[0, '#C4B8A8'], [1, '#7E7266']], yon: -0.8, aralik: 2, boy: [4, 10], esikler: [0.35, 0.65], alfa: 0.6 });
        api.halka(e[0].pts, { renk: '#6E6256', kal: 1.1, alfa: 0.8 });
      }
      // kesit kenarı: koyu toprak kalemi (yarım elips) ve üstte çimen kenarı
      api.cizgi(pts, { renk: '#5E4028', kal: 2.2, alfa: 0.9, titreme: 0.4 });
      const serit = cokgen([[-rx, -1], [rx, -1], [rx, 9], [-rx, 9]]);
      api.tara(serit, { ton: () => 0.6, renkler: [[0, PALET.yesilAcik], [1, PALET.yesil]], yon: -0.05, aralik: 2.4, boy: [20, 50], esikler: [0.2, 0.5], alfa: 0.65 });
      api.cizgi([[-rx, 0], [rx, 0]], { renk: '#3E7C4F', kal: 2.0, alfa: 0.9 });
    },
  });
}
/** Kesik çizgi: polyline'ı yay boyunca tire/boşluk dizisine bölüp kalemle çizer */
export function kesikCiz(api, pts, { tire = 11, bosluk = 7, kapali = false, hale = null, ...o } = {}) {
  const p = yenidenOrnekle(pts, 1.5, kapali);
  let parca = [], acc = 0, cizgide = true;
  const ciz = (q) => {
    if (hale) api.cizgi(q, { ...o, renk: hale, kal: (o.kal || 2) * 3.2, alfa: 0.5, uc: 0.2 });
    api.cizgi(q, o);
  };
  for (let i = 1; i < p.length; i++) {
    const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
    acc += d;
    if (cizgide) {
      parca.push(p[i - 1]);
      if (acc >= tire) { parca.push(p[i]); if (parca.length > 1) ciz(parca); parca = []; acc = 0; cizgide = false; }
    } else if (acc >= bosluk) { acc = 0; cizgide = true; }
  }
  if (cizgide && parca.length > 1) ciz(parca);
}
/**
 * Ağacın kesik çizgili hayali: M.agac verisinden (aynı tohum) gövde hattı, dallar, taç dış hattı ve meyve yerleri.
 * Yerel (0,0) gövde dibi. Döner oge (yukarı doğru silerek açılır).
 */
export function hayalOge(A, { boy, tohum, olcek = 1.6, renk = '#B98316' }) {
  const r = rng(tohum);
  const gk = boy * 0.075, gy = boy * 0.5;
  const egri = r.ara(-0.04, 0.04) * boy; // M.agac'taki ilk rastgele çağrıyla aynı
  const solHat = svg(`M${-gk * 1.25} 0C${-gk * 0.7} ${-boy * 0.02} ${-gk * 0.55} ${-boy * 0.06} ${-gk * 0.5} ${-boy * 0.12}C${-gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${-gk * 0.36 + egri} ${-gy * 0.8} ${-gk * 0.3 + egri} ${-gy}`)[0].pts;
  const sagHat = svg(`M${gk * 1.3} 0C${gk * 0.7} ${-boy * 0.02} ${gk * 0.55} ${-boy * 0.06} ${gk * 0.5} ${-boy * 0.12}C${gk * 0.45 + egri * 0.3} ${-gy * 0.5} ${gk * 0.36 + egri} ${-gy * 0.8} ${gk * 0.3 + egri} ${-gy}`)[0].pts;
  // taç dış hattı: kümelerin birleşim sınırı (başka kümenin içinde kalan noktalar atılır)
  const K = A.kumeler;
  const sinirNok = [];
  for (const k of K) {
    const parca = [];
    for (let i = 0; i <= 72; i++) {
      const a = (i / 72) * TAU;
      const x = k.x + Math.cos(a) * k.R * 1.02, y = k.y + Math.sin(a) * k.R * 0.94;
      const icte = K.some((o) => o !== k && Math.hypot((x - o.x) / (o.R * 1.0), (y - o.y) / (o.R * 0.92)) < 1);
      if (!icte) parca.push([x, y]);
      else if (parca.length) { sinirNok.push(parca.slice()); parca.length = 0; }
    }
    if (parca.length > 1) sinirNok.push(parca);
  }
  const xs = K.map((k) => k.x), ys = K.map((k) => k.y);
  const genis = Math.max(...K.map((k) => Math.abs(k.x) + k.R)) + 20;
  const ustY = Math.min(...K.map((k) => k.y - k.R)) - 20;
  const sekil = cokgen([[-genis, ustY], [genis, ustY], [genis, 30], [-genis, 30]]);
  return oge({
    ad: 's06-hayal-' + boy + '-' + tohum, olcek, sekil, zemin: null, arka: null, tarama: null, kontur: null, pay: 6,
    detay: (ctx, api) => {
      const o = { renk, kal: 3.0, alfa: 1, titreme: 0.3, uc: 0.02, hale: '#FFF6DC' };
      kesikCiz(api, solHat, { ...o, tire: 12, bosluk: 7 });
      kesikCiz(api, sagHat, { ...o, tire: 12, bosluk: 7 });
      for (const d of A.dallar) {
        const ang = Math.atan2(d.y2 - d.y, d.x2 - d.x);
        const nx = -Math.sin(ang), ny = Math.cos(ang);
        if (d.k0 < 6) { kesikCiz(api, [[d.x, d.y], [d.bx, d.by], [d.x2, d.y2]], { ...o, kal: 2.0, tire: 9, bosluk: 6 }); continue; }
        for (const sg of [1, -1]) kesikCiz(api, [[d.x + sg * nx * d.k0 / 2, d.y + sg * ny * d.k0 / 2], [d.bx + sg * nx * (d.k0 + d.k1) / 4, d.by + sg * ny * (d.k0 + d.k1) / 4], [d.x2 + sg * nx * d.k1 / 2, d.y2 + sg * ny * d.k1 / 2]], { ...o, kal: 2.0, tire: 9, bosluk: 6 });
      }
      for (const p of sinirNok) if (p.length > 2) kesikCiz(api, p, { ...o, tire: 16, bosluk: 9 });
      // birkaç iç küme yayı (taçta derinlik)
      K.slice(-6).forEach((k, i) => {
        const p = [];
        for (let q = 0; q <= 20; q++) { const a = Math.PI * (1.05 + q / 20 * 0.9); p.push([k.x + Math.cos(a) * k.R * 0.8, k.y + Math.sin(a) * k.R * 0.75]); }
        kesikCiz(api, p, { ...o, alfa: 0.55, kal: 1.3, tire: 9, bosluk: 7 });
      });
      // meyve yerleri
      for (const [mx, my] of A.meyveler) kesikCiz(api, elips(mx, my, 11, 11)[0].pts, { ...o, kal: 1.8, tire: 6, bosluk: 4, kapali: true });
      void xs; void ys;
    },
  });
}

// ---------------------------------------------------------------- gök feneri
export function fenerOge(birim = 3) {
  return oge({
    ad: 's06-fener', olcek: birim, sekil: svg('M-9 -26C-11 -16 -11 -6 -7 0L7 0C11 -6 11 -16 9 -26C4 -29 -4 -29 -9 -26Z'),
    arka: '#FFD98C', arkaAlfa: 0.9, arkaBulanik: 3,
    tarama: { ton: TON.dogrusal(0, 0, 0, -28, 0.15, 0.75), renkler: [[0, '#FFF0C0'], [0.6, '#F2B85A'], [1, '#D9823A']], yon: -Math.PI / 2, aralik: 2.0, boy: [6, 14], esikler: [0.3, 0.6], alfa: 0.55 },
    kontur: '#B8662A', konturKal: 1.3,
    detay: (ctx, api) => {
      api.cizgi([[-4, -27], [-5, -1]], { renk: '#B8662A', kal: 0.9, alfa: 0.6 });
      api.cizgi([[4, -27], [5, -1]], { renk: '#B8662A', kal: 0.9, alfa: 0.6 });
      api.dolgu(elips(0, -3, 4, 2.2), '#FFFDF0', 0.95);
    },
  });
}

// ---------------------------------------------------------------- küçük ışık izi (yıldızcık)
export function yildizcik(ctx, x, y, R, alfa = 1, renk = '#FFF3C4') {
  if (alfa <= 0.003) return;
  isikNokta(ctx, x, y, R * 2.4, alfa * 0.8);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.fillStyle = rgba(renk, alfa);
  ctx.beginPath();
  const n = 4;
  for (let k = 0; k < n * 2; k++) {
    const a = (k * Math.PI) / n - Math.PI / 2;
    const rr = k % 2 ? R * 0.22 : R;
    k ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
