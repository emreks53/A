// S-232 "Filmde Renkli Kalem" üslubu: mat polyester çizim filminde renkli kalem.
//  1) Arka yüz: filmin arkasından sürülmüş yumuşak, buğulu açık renk (bulanık, çarpımla)
//  2) Ön yüz: uçları incelen, tanesiz, saten ve hafif saydam kalem çizgileri (ton haritasına göre)
//  3) Kontur: yerel rengin koyu kalemiyle temiz, basıncı hafifçe değişen çizgi
// Her öğe bir kez önbelleğe çizilir (sprite), sonra dönüşümlerle canlandırılır.
import { tuval, rng, gurultu2, clamp, lerp, rampa, hex, rgba, hashStr, TAU } from './temel.mjs';
import { sinir, path2d, yenidenOrnekle, yolCiz, yolKes } from './sekil.mjs';

export const FILM = '#F7F9F9';
export const PALET = {
  film: '#F7F9F9',
  gok: '#98BCE0', gokAcik: '#C3DBED', gokKoyu: '#5F8FC4', lacivertAcik: '#7A8FC8',
  yesil: '#3E7C4F', yesilAcik: '#93C690', yesilOrta: '#5A995E', yesilKoyu: '#22573A', yesilMavi: '#3F8C86',
  krem: '#ECE5D4', sicakGri: '#9A8F86', koyuGri: '#5E5752', lila: '#D6CEE7', koyuLila: '#7D6BA6', lilaMavi: '#B7B9E2',
  sari: '#F2D477', soluksari: '#F7E8B0', oker: '#C8963E', turuncu: '#E09A4B', kahve: '#7A5A3C', koyuKahve: '#4E3826',
  gul: '#E59AAE', gulKoyu: '#B5506E', kirmizi: '#C8524A', ten: '#F0C9A8', tenKoyu: '#C98F6B',
};

const onbellek = new Map();

/** Ton ön ayarları: (x, y) -> 0 (aydınlık) .. 1 (koyu) */
export const TON = {
  sabit: (v) => () => v,
  // küre: ışık sağ üstten (lx, ly negatif yukarı)
  kure: (cx, cy, r, { lx = 0.55, ly = -0.6, lz = 0.58, ortam = 0.12, sert = 1 } = {}) => {
    const L = Math.hypot(lx, ly, lz);
    return (x, y) => {
      const nx = (x - cx) / r, ny = (y - cy) / r;
      const d2 = nx * nx + ny * ny;
      const nz = Math.sqrt(Math.max(0, 1 - Math.min(1, d2)));
      const dif = Math.max(0, (nx * lx + ny * ly + nz * lz) / L);
      return clamp(1 - ortam - Math.pow(dif, sert) * (1 - ortam));
    };
  },
  // dikey silindir: x0..x1 arası, ışık sağdan
  silindir: (x0, x1, { sag = true, ortam = 0.15 } = {}) => (x) => {
    const u = clamp((x - x0) / (x1 - x0)) * 2 - 1; // -1..1
    const nx = sag ? u : -u;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
    const dif = Math.max(0, nx * 0.6 + nz * 0.75);
    return clamp(1 - ortam - dif * (1 - ortam));
  },
  // doğrusal geçiş: açı yönünde t0'dan t1'e 0->1
  dogrusal: (x0, y0, x1, y1, v0 = 0, v1 = 1) => {
    const dx = x1 - x0, dy = y1 - y0, L2 = dx * dx + dy * dy || 1;
    return (x, y) => lerp(v0, v1, clamp(((x - x0) * dx + (y - y0) * dy) / L2));
  },
  // radyal: merkezde v0, r'de v1
  radyal: (cx, cy, r, v0 = 0, v1 = 1) => (x, y) => lerp(v0, v1, clamp(Math.hypot(x - cx, y - cy) / r)),
  // iki tonu topla / gürültü ekle
  gurultulu: (f, genlik = 0.08, olcek = 0.012, tohum = 3) => {
    const n = gurultu2(tohum);
    return (x, y) => clamp(f(x, y) + genlik * n.fbm(x * olcek, y * olcek, 3));
  },
};

// ---------------------------------------------------------------- kalem darbesi (uçları incelen saten çizgi)
/** pts boyunca uçları incelen, genişliği hafifçe dalgalanan çokgen darbe */
export function darbe(ctx, pts, kal, { incelme = 0.22, dalga = 0.18, faz = 0, sivri = 0.35, minUc = 0 } = {}) {
  const n = pts.length;
  if (n < 2) return;
  // kümülatif uzunluk
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = s[n - 1] || 1;
  const uc = Math.max(minUc, L * incelme);
  const sol = [], sag = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let tx = pts[i1][0] - pts[i0][0], ty = pts[i1][1] - pts[i0][1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    const d = s[i];
    let w = 1;
    if (d < uc) w = Math.pow(d / uc, sivri);
    if (L - d < uc) w = Math.min(w, Math.pow((L - d) / uc, sivri));
    w *= 1 + dalga * Math.sin(faz + d * 0.05) * Math.sin(faz * 1.7 + d * 0.013);
    const h = (kal * w) / 2;
    sol.push([pts[i][0] - ty * h, pts[i][1] + tx * h]);
    sag.push([pts[i][0] + ty * h, pts[i][1] - tx * h]);
  }
  ctx.beginPath();
  ctx.moveTo(sol[0][0], sol[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(sol[i][0], sol[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(sag[i][0], sag[i][1]);
  ctx.closePath();
  ctx.fill();
}

/** Basınçlı kontur çizgisi (kapalı ya da açık yol). titreme: el titremesi genliği (px) */
export function konturCiz(ctx, pts, { renk = '#333', kal = 2.2, alfa = 0.92, kapali = true, titreme = 0.5, tohum = 1, adim = 2.2, uc = 0.06, cizim = 1 } = {}) {
  if (pts.length < 2) return;
  let p = yenidenOrnekle(pts, adim, kapali);
  if (cizim < 1) p = yolKes(p, cizim, false);
  if (p.length < 2) return;
  const r = rng(tohum);
  const f1 = r() * TAU, f2 = r() * TAU, f3 = r() * TAU;
  const n = p.length;
  // titreme: normal yönünde düşük frekanslı kaydırma
  const q = p.map((pt, i) => {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let tx = p[i1][0] - p[i0][0], ty = p[i1][1] - p[i0][1];
    const tl = Math.hypot(tx, ty) || 1;
    const o = titreme * (Math.sin(i * 0.071 + f1) * 0.6 + Math.sin(i * 0.23 + f2) * 0.4);
    return [pt[0] - (ty / tl) * o, pt[1] + (tx / tl) * o];
  });
  ctx.save();
  ctx.fillStyle = rgba(renk, alfa);
  // basınç: genişlik sinüs karışımıyla 0.7..1.15
  const s = [0];
  for (let i = 1; i < n; i++) s.push(s[i - 1] + Math.hypot(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1]));
  const L = s[n - 1] || 1;
  const sol = [], sag = [];
  const ucL = kapali ? 0 : Math.min(L * 0.5, Math.max(6, L * uc));
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1), i1 = Math.min(n - 1, i + 1);
    let tx = q[i1][0] - q[i0][0], ty = q[i1][1] - q[i0][1];
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;
    let w = 0.86 + 0.16 * Math.sin(s[i] * 0.021 + f3) + 0.08 * Math.sin(s[i] * 0.093 + f1);
    if (ucL > 0) {
      if (s[i] < ucL) w *= 0.35 + 0.65 * (s[i] / ucL);
      if (L - s[i] < ucL) w *= 0.35 + 0.65 * ((L - s[i]) / ucL);
    }
    const h = (kal * w) / 2;
    sol.push([q[i][0] - ty * h, q[i][1] + tx * h]);
    sag.push([q[i][0] + ty * h, q[i][1] - tx * h]);
  }
  ctx.beginPath();
  ctx.moveTo(sol[0][0], sol[0][1]);
  for (let i = 1; i < n; i++) ctx.lineTo(sol[i][0], sol[i][1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(sag[i][0], sag[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- tarama
/**
 * Bir bölgeyi kalem çizgileriyle tarar (ctx yerel koordinatta, bölgeye kırpılmış olmalı).
 * o: { x0,y0,x1,y1, yon (rad) | yonF(x,y), aralik, boy:[a,b], kal, alfa, ton(x,y), renkler(rampa), esikler:[..], tohum }
 */
export function tara(ctx, o) {
  const r = rng(o.tohum ?? 11);
  const ton = o.ton || (() => 0.5);
  const renkler = o.renkler || [[0, '#9fb'], [1, '#264']];
  const esikler = o.esikler || [0.05, 0.4, 0.7];
  const aralik = o.aralik ?? 3.4;
  const [bmin, bmax] = o.boy || [40, 140];
  const kal = o.kal ?? 1.25;
  const alfa = o.alfa ?? 0.55;
  const jit = o.renkSapma ?? 0.06;
  const x0 = o.x0, y0 = o.y0, x1 = o.x1, y1 = o.y1;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const R = Math.hypot(x1 - x0, y1 - y0) / 2 + 4;
  const adim = 3;
  ctx.save();
  ctx.globalCompositeOperation = o.karisim || 'multiply';
  esikler.forEach((esik, gecis) => {
    if (o.yonF) {
      // akış alanı modu: tabakalı rastgele tohumlardan başlayan, alanı izleyen eğri darbeler
      const boyOrt = (bmin + bmax) / 2;
      const hucre = Math.sqrt(aralik * (gecis ? 1.15 : 1) * boyOrt * 0.55);
      const yonOf = (x, y) => o.yonF(x, y) + (gecis ? (o.gecisAci ?? 0.12) * (gecis % 2 ? 1 : -1) : 0);
      for (let gy = y0 - hucre; gy < y1 + hucre; gy += hucre) {
        for (let gx = x0 - hucre; gx < x1 + hucre; gx += hucre) {
          const sx = gx + r() * hucre, sy = gy + r() * hucre;
          const boy = r.ara(bmin, bmax);
          const ileri = [], geri = [];
          let x = sx, y = sy;
          for (let d = 0; d < boy / 2; d += adim) {
            const a = yonOf(x, y);
            x += Math.cos(a) * adim; y += Math.sin(a) * adim;
            ileri.push([x, y]);
          }
          x = sx; y = sy;
          for (let d = 0; d < boy / 2; d += adim) {
            const a = yonOf(x, y);
            x -= Math.cos(a) * adim; y -= Math.sin(a) * adim;
            geri.push([x, y]);
          }
          const tum = [...geri.reverse(), [sx, sy], ...ileri];
          kosular(ctx, tum, ton, esik, renkler, kal, alfa, jit, r, o);
        }
      }
    } else {
      const aci = (o.yon ?? -0.16) + (gecis ? (o.gecisAci ?? 0.1) * (gecis % 2 ? 1 : -1) * Math.ceil(gecis / 2) : 0) + r.ara(-0.02, 0.02);
      const ux = Math.cos(aci), uy = Math.sin(aci);
      const nx = -uy, ny = ux;
      const ar = aralik * (gecis ? 1.08 : 1);
      for (let k = -R; k <= R; k += ar * r.ara(0.85, 1.15)) {
        // çizgi üzerinde boy boy darbeler
        let t = -R - r.ara(0, bmax);
        while (t < R) {
          const boy = r.ara(bmin, bmax);
          const bosluk = r.ara(-boy * 0.12, boy * 0.06);
          const pts = [];
          const kay = r.ara(-0.4, 0.4);
          for (let u = 0; u <= boy; u += adim) {
            const tt = t + u;
            const bk = kay * Math.sin((u / boy) * Math.PI) * 1.2;
            pts.push([cx + ux * tt + nx * (k + bk), cy + uy * tt + ny * (k + bk)]);
          }
          kosular(ctx, pts, ton, esik, renkler, kal, alfa, jit, r, o);
          t += boy + bosluk;
        }
      }
    }
  });
  ctx.restore();
}

// bir çizgiyi ton eşiğini aştığı koşulara bölüp darbe olarak çizer. Eşik her darbede biraz kayar ve darbenin
// saydamlığı tonun eşiği ne kadar aştığına göre yumuşakça artar: geçişlerde bant (posterleşme) oluşmaz.
function kosular(ctx, pts, ton, esik, renkler, kal, alfa, jit, r, o) {
  const yay = o.esikYay ?? 0.09;
  const e = esik + r.ara(-yay, yay);
  const yumusak = o.yumusak ?? 0.16;
  let bas = -1;
  let tonTop = 0;
  const minBoy = o.minKosu ?? 4;
  const bitir = (son) => {
    const parca = pts.slice(bas, son);
    if (parca.length >= minBoy) {
      const ort = tonTop / parca.length;
      const c = rampa(renkler, clamp(ort + r.ara(-jit, jit)));
      const asim = clamp((ort - e) / yumusak);
      const a = alfa * r.ara(0.72, 1.05) * (0.35 + 0.65 * asim) * (o.alfaTon ? lerp(0.6, 1, ort) : 1);
      ctx.fillStyle = `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${clamp(a)})`;
      darbe(ctx, parca, kal * r.ara(0.8, 1.2), { faz: r() * TAU, minUc: o.minUc ?? 8, incelme: o.incelme ?? 0.22 });
    }
  };
  for (let i = 0; i < pts.length; i++) {
    const v = ton(pts[i][0], pts[i][1]);
    if (v > e) {
      if (bas < 0) { bas = i; tonTop = 0; }
      tonTop += v;
    } else if (bas >= 0) {
      bitir(i);
      bas = -1;
    }
  }
  if (bas >= 0) bitir(pts.length);
}

// ---------------------------------------------------------------- öğe (sprite)
/**
 * Bir şekli S-232 üslubunda önbelleğe çizer.
 * spec: {
 *   ad (önbellek anahtarı), sekil, olcek=1, pay,
 *   zemin: film rengi | null (saydam), arka: arka yüz rengi | null, arkaAlfa, arkaBulanik,
 *   tarama: { renkler, ton, yon | yonF, aralik, boy, kal, alfa, esikler } | [birden çok] | null,
 *   kontur: renk | null, konturKal, konturAlfa, konturAtla: [alt yol indeksleri], titreme,
 *   detay: (ctx, api) => {}  // yerel koordinatlarda ek ayrıntı (pencere, damar, kaburga…)
 * }
 * döner: { tuval, ox, oy, olcek, w, h }  (ox, oy: yerel koordinatın tuvaldeki karşılığı için kaydırma)
 */
export function oge(spec) {
  const anahtar = spec.ad ? spec.ad + '|' + (spec.olcek ?? 1) + '|' + hashStr(fnImza(spec)) : null;
  if (anahtar && onbellek.has(anahtar)) return onbellek.get(anahtar);
  const S = spec.olcek ?? 1;
  const b = sinir(spec.sekil);
  const pay = spec.pay ?? Math.max(12, (spec.konturKal ?? 2.2) * 3);
  const w = Math.ceil((b.w + 2 * pay) * S), h = Math.ceil((b.h + 2 * pay) * S);
  const ox = -b.x0 + pay, oy = -b.y0 + pay;
  const c = tuval(w, h);
  const ctx = c.getContext('2d');
  ctx.scale(S, S);
  ctx.translate(ox, oy);
  const yol = path2d(spec.sekil);
  const kural = spec.kural || 'nonzero';
  const tohum = spec.tohum ?? hashStr(spec.ad || 'oge');
  // 1) film zemini
  if (spec.zemin !== null) {
    ctx.fillStyle = spec.zemin || FILM;
    ctx.fill(yol, kural);
  }
  // 2) arka yüz buğusu
  if (spec.arka) {
    const bb = spec.arkaBulanik ?? 6;
    const tmp = tuval(w, h);
    const t = tmp.getContext('2d');
    t.scale(S, S);
    t.translate(ox, oy);
    t.fillStyle = rgba(spec.arka, spec.arkaAlfa ?? 0.85);
    if (typeof spec.arkaCiz === 'function') spec.arkaCiz(t, yol);
    else {
      t.fill(yol, kural);
      // taşma: renk kenara kadar tam kalsın (bulanıklık kenarı açmasın); arkaTasma: false ile buğulu kenar
      if (spec.arkaTasma !== false) {
        t.strokeStyle = t.fillStyle;
        t.lineWidth = bb * 2.6;
        t.lineJoin = 'round';
        t.stroke(yol);
      }
    }
    ctx.save();
    ctx.clip(yol, kural);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${bb * S}px)`;
    ctx.drawImage(tmp, 0, 0);
    ctx.filter = 'none';
    ctx.restore();
  }
  // 3) ön yüz taraması
  const taramalar = spec.tarama ? (Array.isArray(spec.tarama) ? spec.tarama : [spec.tarama]) : [];
  taramalar.forEach((tr, k) => {
    ctx.save();
    ctx.clip(tr.sekil ? path2d(tr.sekil) : yol, kural);
    tara(ctx, { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1, tohum: tohum + k * 101, ...tr });
    ctx.restore();
  });
  // 4) ayrıntı
  const api = yardimci(ctx, tohum, b);
  if (spec.detayAlt) spec.detayAlt(ctx, api);
  // 5) kontur
  if (spec.kontur) {
    const atla = new Set(spec.konturAtla || []);
    spec.sekil.forEach((p, i) => {
      if (atla.has(i) || p.acik) return;
      konturCiz(ctx, p.pts, { renk: spec.kontur, kal: spec.konturKal ?? 2.2, alfa: spec.konturAlfa ?? 0.9, kapali: p.kapali, titreme: spec.titreme ?? 0.45, tohum: tohum + i * 7 });
    });
  }
  if (spec.detay) spec.detay(ctx, api);
  const sonuc = { tuval: c, ox, oy, olcek: S, w: w / S, h: h / S, sinir: b };
  if (anahtar) onbellek.set(anahtar, sonuc);
  return sonuc;
}

function fnImza(spec) {
  // önbellek imzası: fonksiyon kaynakları + düz değerler
  return JSON.stringify(spec, (k, v) => {
    if (typeof v === 'function') return v.toString();
    if (k === 'sekil') return v.length + ':' + v.map((p) => p.pts.length + (p.pts[0] ? p.pts[0].join(',') + p.pts[p.pts.length - 1].join(',') : '')).join(';');
    return v;
  });
}

/** Ayrıntı çizim yardımcıları (yerel koordinat) */
export function yardimci(ctx, tohum, b) {
  let sayac = 0;
  return {
    cizgi: (pts, o = {}) => konturCiz(ctx, pts, { kapali: false, tohum: tohum + 997 * ++sayac, ...o }),
    halka: (pts, o = {}) => konturCiz(ctx, pts, { kapali: true, tohum: tohum + 997 * ++sayac, ...o }),
    tara: (sekil, o = {}) => {
      const bb = sinir(sekil);
      ctx.save();
      ctx.clip(path2d(sekil));
      tara(ctx, { x0: bb.x0, y0: bb.y0, x1: bb.x1, y1: bb.y1, tohum: tohum + 31 * ++sayac, ...o });
      ctx.restore();
    },
    dolgu: (sekil, renk, alfa = 1, karisim = 'source-over') => {
      ctx.save();
      ctx.globalCompositeOperation = karisim;
      ctx.fillStyle = rgba(renk, alfa);
      ctx.beginPath();
      yolCiz(ctx, sekil);
      ctx.fill();
      ctx.restore();
    },
    sekilKontur: (sekil, o = {}) => sekil.forEach((p) => konturCiz(ctx, p.pts, { kapali: p.kapali, tohum: tohum + 997 * ++sayac, ...o })),
    ctx,
    sinir: b,
  };
}

/** Öğeyi çiz: (x, y) yerel (0,0) noktasının ekrandaki yeri; s ölçek, r dönüş, alfa; pivot yerel koordinatta */
export function ogeCiz(ctx, o, x, y, { s = 1, sx = s, sy = s, r = 0, alfa = 1, pivot = [0, 0], karisim } = {}) {
  if (alfa <= 0.001 || sx === 0 || sy === 0) return;
  ctx.save();
  ctx.translate(x, y);
  if (r) ctx.rotate(r);
  ctx.scale(sx / o.olcek, sy / o.olcek);
  ctx.globalAlpha *= clamp(alfa);
  if (karisim) ctx.globalCompositeOperation = karisim;
  ctx.drawImage(o.tuval, -(o.ox + pivot[0]) * o.olcek, -(o.oy + pivot[1]) * o.olcek);
  ctx.restore();
}

const acmaTuvalleri = new WeakMap();
/** Çizerek giriş: öğeyi bir maskeyle açar. mod: 'sil' (doğrusal silme, yon açısında), 'daire' (merkezden) */
export function ogeAcarak(ctx, o, x, y, ilerleme, { s = 1, r = 0, alfa = 1, pivot = [0, 0], mod = 'sil', yon = -Math.PI / 2, merkez = null, yumusak = 0.12 } = {}) {
  if (ilerleme <= 0) return;
  if (ilerleme >= 1) return ogeCiz(ctx, o, x, y, { s, r, alfa, pivot });
  const b = o.sinir;
  // maske tuvali sprite başına bir kez ayrılır ve yeniden kullanılır (her karede yeni tuval yerli belleği şişirir)
  let m = acmaTuvalleri.get(o.tuval);
  if (!m) { m = tuval(o.tuval.width, o.tuval.height); acmaTuvalleri.set(o.tuval, m); }
  const mc = m.getContext('2d');
  mc.setTransform(1, 0, 0, 1, 0, 0);
  mc.globalCompositeOperation = 'source-over';
  mc.globalAlpha = 1;
  mc.clearRect(0, 0, m.width, m.height);
  mc.drawImage(o.tuval, 0, 0);
  mc.globalCompositeOperation = 'destination-in';
  const S = o.olcek;
  const W0 = o.tuval.width, H0 = o.tuval.height;
  let g;
  if (mod === 'daire') {
    const [mx, my] = merkez || [b.cx, b.cy];
    const px = (mx + o.ox) * S, py = (my + o.oy) * S;
    const R = Math.hypot(Math.max(px, W0 - px), Math.max(py, H0 - py));
    g = mc.createRadialGradient(px, py, 0, px, py, R);
    const e = ilerleme * (1 + yumusak);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(clamp(e - yumusak), 'rgba(0,0,0,1)');
    g.addColorStop(clamp(e), 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
  } else {
    const ux = Math.cos(yon), uy = Math.sin(yon);
    const cx = W0 / 2, cy = H0 / 2;
    const R = (Math.abs(ux) * W0 + Math.abs(uy) * H0) / 2;
    g = mc.createLinearGradient(cx - ux * R, cy - uy * R, cx + ux * R, cy + uy * R);
    const e = ilerleme * (1 + yumusak);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(clamp(e - yumusak), 'rgba(0,0,0,1)');
    g.addColorStop(clamp(e), 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
  }
  mc.fillStyle = g;
  mc.fillRect(0, 0, W0, H0);
  ogeCiz(ctx, { ...o, tuval: m }, x, y, { s, r, alfa, pivot });
}

// ---------------------------------------------------------------- gökyüzü
/**
 * Taranmış gökyüzü tuvali: arka yüzde serin mavi + ufka/güneşe doğru leylağa çalan parıltı; önde uzun, düzgün,
 * az eğimli saten süpürüşler; üst bantta perdah. bosluklar: [{sekil}] çıplak film bırakılacak yerler (bulut, güneş).
 */
export function gokTuvali({ w, h, olcek = 1, ust = PALET.gokKoyu, orta = PALET.gok, alt = PALET.gokAcik, parilti = PALET.lilaMavi,
  gunes = null, bosluklar = [], aci = -0.157, aralik = 3.5, tohum = 5, alfa = 0.4, arkaUst = '#BCD3EC', arkaAlt = '#DCD6EE', yogunluk = 1, ad = null } = {}) {
  const key = ad ? 'gok|' + ad + '|' + olcek : null;
  if (key && onbellek.has(key)) return onbellek.get(key);
  const c = tuval(w * olcek, h * olcek);
  const ctx = c.getContext('2d');
  ctx.scale(olcek, olcek);
  ctx.fillStyle = FILM;
  ctx.fillRect(0, 0, w, h);
  // arka yüz: dikey geçiş + parıltı
  const tmp = tuval(w * olcek, h * olcek);
  const t = tmp.getContext('2d');
  t.scale(olcek, olcek);
  const g = t.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgba(arkaUst, 0.9));
  g.addColorStop(0.75, rgba(arkaAlt, 0.75));
  g.addColorStop(1, rgba(arkaAlt, 0.6));
  t.fillStyle = g;
  t.fillRect(0, 0, w, h);
  if (gunes) {
    const rg = t.createRadialGradient(gunes.x, gunes.y, 0, gunes.x, gunes.y, gunes.r * 4.5);
    rg.addColorStop(0, 'rgba(255,255,250,1)');
    rg.addColorStop(0.25, rgba(parilti, 0.55));
    rg.addColorStop(1, rgba(parilti, 0));
    t.fillStyle = rg;
    t.fillRect(0, 0, w, h);
  }
  const bosYol = bosluklar.length ? path2d(bosluklar.flat()) : null;
  ctx.save();
  if (bosYol) {
    ctx.beginPath();
    ctx.rect(-10, -10, w + 20, h + 20);
    yolCiz(ctx, bosluklar.flat());
    ctx.clip('evenodd');
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.filter = `blur(${6 * olcek}px)`;
  ctx.drawImage(tmp, 0, 0);
  ctx.restore();
  // ön yüz taraması: ton = yukarıda koyu, ufka doğru açılır; güneş çevresinde açık
  const ton = (x, y) => {
    let v = lerp(0.85, 0.22, Math.pow(clamp(y / h), 0.9)) * yogunluk;
    if (gunes) {
      const d = Math.hypot(x - gunes.x, y - gunes.y) / (gunes.r * 3.2);
      v *= clamp(0.15 + 0.85 * d * d, 0, 1);
    }
    return clamp(v);
  };
  ctx.save();
  if (bosYol) {
    // boşlukların dışını kırp
    ctx.beginPath();
    ctx.rect(-10, -10, w + 20, h + 20);
    yolCiz(ctx, bosluklar.flat());
    ctx.clip('evenodd');
  }
  tara(ctx, { x0: 0, y0: 0, x1: w, y1: h, yon: aci, aralik, boy: [160, 420], kal: 1.3, alfa, ton,
    renkler: [[0, alt], [0.5, orta], [1, ust]], esikler: [0.1, 0.5], gecisAci: 0.035, tohum, minUc: 10, incelme: 0.1, esikYay: 0.12, yumusak: 0.25 });
  // üst bantta perdah: sık, hafif
  const perdah = (x, y) => clamp(1 - y / (h * 0.28));
  tara(ctx, { x0: 0, y0: 0, x1: w, y1: h * 0.3, yon: aci, aralik: 1.6, boy: [200, 480], kal: 1.1, alfa: 0.14, ton: perdah,
    renkler: [[0, orta], [1, ust]], esikler: [0.25], tohum: tohum + 9, minUc: 12, incelme: 0.08 });
  ctx.restore();
  const sonuc = { tuval: c, ox: 0, oy: 0, olcek, w, h, sinir: { x0: 0, y0: 0, x1: w, y1: h, w, h, cx: w / 2, cy: h / 2 } };
  if (key) onbellek.set(key, sonuc);
  return sonuc;
}

/** Bulut şekli (basık elipsler birleşimi): merkez (0,0), en w */
export function bulutSekli(w, tohum = 1) {
  const r = rng(tohum);
  const n = 5 + Math.floor(r() * 3);
  const parcalar = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1) - 0.5;
    const rx = w * r.ara(0.14, 0.24);
    const ry = rx * r.ara(0.42, 0.62) * (1 - Math.abs(u) * 0.6);
    const cx = u * w * 0.78 + r.ara(-w * 0.03, w * 0.03);
    const cy = -ry * r.ara(0.2, 0.8) * (1 - Math.abs(u));
    parcalar.push({ cx, cy, rx, ry });
  }
  // birleşimin dış hattı: açıya göre en uzak nokta (alt kenar düz)
  const pts = [];
  const N = 160;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * TAU;
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = 0;
    for (const p of parcalar) {
      // ışın-elips kesişimi (merkezden)
      const ex = p.cx, ey = p.cy;
      const A = (dx * dx) / (p.rx * p.rx) + (dy * dy) / (p.ry * p.ry);
      const B = 2 * ((-ex * dx) / (p.rx * p.rx) + (-ey * dy) / (p.ry * p.ry));
      const C = (ex * ex) / (p.rx * p.rx) + (ey * ey) / (p.ry * p.ry) - 1;
      const D = B * B - 4 * A * C;
      if (D >= 0) best = Math.max(best, (-B + Math.sqrt(D)) / (2 * A));
    }
    let y = dy * best;
    if (y > w * 0.06) y = w * 0.06 + (y - w * 0.06) * 0.25; // basık alt
    pts.push([dx * best, y]);
  }
  return [{ pts, kapali: true }];
}
