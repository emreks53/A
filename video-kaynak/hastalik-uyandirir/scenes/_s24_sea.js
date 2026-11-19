// S24 yardımcısı — gece denizi: perspektifli dalga sıraları (önbellekli, yatayda döşenen şeritler).
// Her sıra bir kez çizilir (darbe tohumları sabit), karede yalnız kaydırılır ve inip kalkar: dalgalar akar ama kaynamaz.
// İki boya takımı: 'n' (gece, ay ışığı) ve 'l' (fener ışığı: turkuaz + altın). Aynı geometri, aynı tohumlar.
'use strict';
const { Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E } = C;

const HZ = 902;            // ufuk çizgisi
const TW = 1280;           // şerit döşeme genişliği
const REF_Y = 1190;        // ölçek 1 olan derinlik (kayık hattı)
const CALM0 = 1262, CALM1 = 1600; // anlam bandının altındaki sakin su

function mod(a, m) { return ((a % m) + m) % m; }
// derinlik ölçeği: ufukta 0, kayık hattında 1
function persp(y) { return Math.max(0.015, (y - HZ) / (REF_Y - HZ)); }

// ---------- boya takımları ----------
const PALS = {
  n: { // gece: ufukta göğün yansıması (açık mor-mavi), önde koyu lacivert
    far: ['#3E4C9C', '#33418C', '#2A3780'], near: ['#1C2862', '#172257', '#131C4C'],
    crest: ['#7F95DA', '#6C84CE'], crestNear: ['#5B73C2', '#4E66B4'], foam: '#C9D5F5', face: '#101845', glint: '#A9BCEB',
  },
  l: { // fener ışığında: turkuaz gövde, altın tepeler
    far: ['#3A8EA8', '#2F7F9C', '#2A7290'], near: ['#256D8C', '#1F6080', '#1A5474'],
    crest: ['#FFD98A', '#FFC45E'], crestNear: ['#FFD27A', '#F6B84E'], foam: '#FFF4D8', face: '#164A68', glint: '#FFF0B8',
  },
  g: { // altın yol: koyu kehribar gövde, parıl parıl altın tepeler (ay yolu gibi)
    far: ['#A8743A', '#946234', '#7E5430'], near: ['#74503A', '#644434', '#54382E'],
    crest: ['#FFE9A0', '#FFD878'], crestNear: ['#FFE490', '#FFCC66'], foam: '#FFF8E0', face: '#3E2A2E', glint: '#FFF4C0',
  },
};

// ---------- sıralar ----------
const ROWS = [];
(function build() {
  const N = 19;
  for (let i = 1; i <= N; i++) {
    const k = i / N;
    const y = HZ + 6 + (2010 - HZ) * Math.pow(k, 1.85);
    ROWS.push({ i: i - 1, y });
  }
  for (let j = 0; j < ROWS.length; j++) {
    const r = ROWS[j], next = ROWS[j + 1] ? ROWS[j + 1].y : r.y + 140;
    const p = persp(r.y);
    const calm = r.y > CALM0 && r.y < CALM1 ? 1 : r.y >= CALM1 ? 0.55 : 0;
    r.p = p; r.calm = calm;
    r.ch = Math.min(50, 3 + 36 * Math.pow(p, 0.95)) * (1 - 0.6 * calm);  // tepe yüksekliği
    r.lam = 40 + 210 * Math.pow(p, 0.9);                                   // dalga boyu
    r.top = Math.ceil(r.ch * 1.5 + 8);
    r.depth = Math.ceil(next - r.y + 26 + r.ch);
    r.h = r.top + r.depth;
    const sg = j % 2 ? -1 : 1;
    r.speed = sg * (6 + 22 * Math.min(1.6, p)) * (1 - 0.6 * calm);          // yatay akış (px/sn)
    r.phase = (j * 397) % TW;
    r.amp = (1 + 6.5 * Math.min(1.5, p)) * (1 - 0.65 * calm);              // inip kalkma
  }
})();
function bob(j, t) {
  const r = ROWS[j];
  return r.amp * Math.sin(1.55 * t - 0.8 * j + 0.6) + r.amp * 0.35 * Math.sin(2.6 * t + j * 1.7);
}
// y derinliğindeki suyun inip kalkması (kayık, kaya köpüğü için): komşu iki sıranın arası
function bobAt(y, t) {
  let j = 0; while (j < ROWS.length - 1 && ROWS[j + 1].y < y) j++;
  const a = ROWS[j], b = ROWS[Math.min(ROWS.length - 1, j + 1)];
  const k = b.y > a.y ? clamp((y - a.y) / (b.y - a.y)) : 0;
  return lerp(bob(j, t), bob(Math.min(ROWS.length - 1, j + 1), t), k);
}
// dalga eğimi (kayığın baş-kıç salınımı için)
function slopeAt(y, t) { return (bobAt(y, t + 0.05) - bobAt(y, t - 0.05)) / 0.1; }

// sıra profili: TW'de periyodik (tamsayı frekanslar), sivri tepe + düz çukur
function profile(r, seed) {
  const rr = rng(seed);
  const n1 = Math.max(3, Math.round(TW / r.lam)), n2 = n1 * 2 + 1, n3 = Math.max(2, Math.round(n1 * 0.5));
  const p1 = rr.range(0, TAU), p2 = rr.range(0, TAU), p3 = rr.range(0, TAU), p4 = rr.range(0, TAU), p5 = rr.range(0, TAU);
  const m1 = 2 + rr.int(0, 2), m2 = 3 + rr.int(0, 3);
  const sharp = r.calm ? 1.1 : 1.5;
  return (X) => {
    const a = TAU * X / TW;
    const f = 0.6 * Math.sin(n1 * a + p1) + 0.24 * Math.sin(n2 * a + p2) + 0.16 * Math.sin(n3 * a + p3);
    const g = 0.72 + 0.28 * Math.sin(m1 * a + p4) * Math.sin(m2 * a + p5); // büyük/küçük dalga öbekleri
    return r.ch * g * Math.pow((f + 1) / 2, sharp);
  };
}

// döşenebilir darbe: sınırı aşarsa öbür uçta da çiz
function wrapStroke(x, x0, y0, x1, y1, w, col, seed, o) {
  P.stroke(x, x0, y0, x1, y1, w, col, seed, o);
  const lo = Math.min(x0, x1) - w, hi = Math.max(x0, x1) + w;
  if (lo < 0) P.stroke(x, x0 + TW, y0, x1 + TW, y1, w, col, seed, o);
  if (hi > TW) P.stroke(x, x0 - TW, y0, x1 - TW, y1, w, col, seed, o);
}
function wrapCurve(x, line, w, col, seed, o) {
  P.curveStroke(x, line, w, col, seed, o);
  const xs = line.map((p) => p[0]); const lo = Math.min(...xs) - 20, hi = Math.max(...xs) + 20;
  if (lo < 0) P.curveStroke(x, line.map(([a, b]) => [a + TW, b]), w, col, seed, o);
  if (hi > TW) P.curveStroke(x, line.map(([a, b]) => [a - TW, b]), w, col, seed, o);
}

const MG = 48; // şerit kenar payı (kopyalar üst üste biner: dikiş görünmez)
function rowCanvas(j, v) {
  const r = ROWS[j], pal = PALS[v];
  return R.cached(`s24row:${j}:${v}`, TW + 2 * MG, r.h, (x) => {
    x.translate(MG, 0);
    const seed = 2400 + j * 31;
    const prof = profile(r, seed);
    const k = clamp(r.p / 1.6);                     // 0 uzak .. 1 yakın
    const kc = clamp((r.y - HZ) / (1900 - HZ));
    const tones = [0, 1, 2].map((q) => mix(pal.far[q], pal.near[q], kc));
    const base = tones[1];
    const calmMix = (c) => mix(c, base, 0.6 * r.calm);
    // dalga sırtı (göğü yansıtan açık), gövde, çukur (koyu) — düz ton katları
    const back = calmMix(mix(shade(tones[0], 0.05, 0.03), pal.crest[1], v === 'n' ? 0.24 : 0.16));
    const trough = calmMix(mix(tones[2], pal.face, 0.55));
    // gövde
    const topPts = []; for (let X = -MG; X <= TW + MG; X += 6) topPts.push([X, r.top - prof(mod(X, TW))]);
    const body = topPts.concat([[TW + MG, r.h + 2], [-MG, r.h + 2]]);
    const path = P.pathOf(body);
    x.fillStyle = base; x.fill(path);
    x.save(); x.clip(path);
    // yatay darbeler (döşenebilir): renk sıradaki konuma göre (sırt → gövde → çukur)
    const rr = rng(seed + 1);
    const wS = clamp(3 + 17 * r.p, 3, 24), lS = 30 + 150 * Math.min(1.4, r.p);
    const gap = r.depth - 26 - r.ch;
    for (let yy = r.top - r.ch; yy < r.h + wS; yy += wS * 0.6) {
      let xx = rr.range(-lS, 0);
      while (xx < TW) {
        const len = lS * rr.range(0.6, 1.4), w = wS * rr.range(0.7, 1.15);
        const rel = (yy - r.top) / Math.max(8, gap) + rr.range(-0.12, 0.12);
        let c = rel < 0.3 ? back : rel < 0.62 ? rr.pick(tones) : trough;
        c = shade(c, rr.range(-0.025, 0.03), rr.range(-0.03, 0.03));
        wrapStroke(x, xx, yy + rr.range(-2, 2), xx + len, yy + rr.range(-2.5, 2.5), w, calmMix(c), rr.int(1, 1e9), { detail: r.p > 0.25 ? 0.8 : 0, dry: rr.chance(0.1) });
        xx += len * rr.range(0.7, 0.95);
      }
    }
    // dalga yüzü: tepenin altında koyu (soğuk) hilal
    const crests = [];
    for (let X = 0; X < TW; X += 3) { const a = prof(mod(X - 3, TW)), b = prof(X), c = prof(mod(X + 3, TW)); if (b >= a && b > c && b > r.ch * 0.3) crests.push(X); }
    const rc = rng(seed + 2);
    for (const cx of crests) {
      const hw = r.lam * rc.range(0.34, 0.5);
      const hh = prof(cx) / r.ch;
      if (!r.calm || rc.chance(0.6)) {
        const face = []; for (let q = 0; q <= 8; q++) { const u = q / 8, X = cx - hw * 0.15 + hw * 1.1 * u; face.push([X, r.top - prof(mod(X, TW)) + r.ch * (0.3 + 0.3 * Math.sin(u * Math.PI)) * hh + 2]); }
        wrapCurve(x, face, Math.max(2, r.ch * 0.5 * hh), rgba(calmMix(pal.face), 0.6 + 0.25 * k), rc.int(1, 1e9), { taper: true, bristles: 2, detail: r.p > 0.3 ? 1 : 0 });
      }
    }
    x.restore();
    // tepe ışıkları: tepeyi izleyen açık darbe (biraz sola taşan), bazen köpük
    const rh = rng(seed + 3);
    for (const cx of crests) {
      const hh = prof(cx) / r.ch;
      const hw = r.lam * rh.range(0.24, 0.38);
      const line = []; for (let q = 0; q <= 8; q++) { const u = q / 8, X = cx - hw * 0.8 + hw * 1.25 * u; line.push([X, r.top - prof(mod(X, TW)) + 1.2]); }
      const cc = calmMix(mix(rh.pick(pal.crest), rh.pick(pal.crestNear), k));
      wrapCurve(x, line, Math.max(1.6, r.ch * rh.range(0.2, 0.32) * (0.6 + 0.4 * hh)), cc, rh.int(1, 1e9), { taper: true, bristles: 2, detail: r.p > 0.3 ? 1 : 0 });
      if (!r.calm && hh > 0.55 && rh.chance(0.55 + 0.25 * k) && r.p > 0.12) {
        // köpük: tepede kısa kırık darbeler
        const fx = cx + rh.range(-hw * 0.3, hw * 0.2), fy = r.top - prof(mod(fx, TW));
        for (let q = 0; q < 2 + Math.round(3 * k); q++) {
          const ox = fx + rh.range(-hw * 0.5, hw * 0.4), oy = fy + rh.range(-1, r.ch * 0.3), len = r.ch * rh.range(0.5, 1.3);
          wrapStroke(x, ox, oy, ox + len, oy + rh.range(-1.5, 1.5), Math.max(1.6, r.ch * rh.range(0.1, 0.2)), rgba(pal.foam, rh.range(0.7, 0.95)), rh.int(1, 1e9), { detail: 0, taper1: 0.5 });
        }
      }
    }
    // gövdede seyrek parıltı darbeleri (ışığın kırıkları)
    const rg = rng(seed + 4);
    const ng = Math.round((r.calm ? 5 : 18) * (0.4 + k) * (v === 'g' ? 2.6 : 1));
    for (let q = 0; q < ng; q++) {
      const gx = rg.range(0, TW), gy = rg.range(r.top + 2, r.top + Math.max(6, gap * 0.6)), len = (8 + 40 * r.p) * rg.range(0.5, 1.2);
      wrapStroke(x, gx, gy, gx + len, gy + rg.range(-1, 1), Math.max(1.2, 1.5 + 2.5 * r.p) * rg.range(0.7, 1.1), rgba(calmMix(pal.glint), rg.range(0.18, 0.42) * (r.calm ? 0.5 : 1) * (v === 'g' ? 2 : 1)), rg.int(1, 1e9), { detail: 0, taper1: 0.4 });
    }
  });
}

// deniz tabanı (ufuktan aşağı) — bant darbeleri + ufukta açık şerit
function baseCanvas(v) {
  const pal = PALS[v];
  const w = C.W + 160, h = C.H - HZ + 60;
  return R.cached('s24seabase:' + v, w, h, (x) => {
    x.fillStyle = pal.far[1]; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, [pal.far[0], pal.far[1], pal.near[0], pal.near[1], pal.near[2]], { seed: v === 'n' ? 2471 : v === 'l' ? 2472 : 2474, wMin: 10, wMax: 30, lMin: 60, lMax: 260, stops: [0, 0.08, 0.3, 0.6, 1] });
    // ufuk hattında ince parlak şerit
    const r = rng(2473);
    for (let i = 0; i < 26; i++) { const xx = r.range(-40, w), len = r.range(40, 160); P.stroke(x, xx, r.range(1, 9), xx + len, r.range(1, 9), r.range(2, 4), rgba(v === 'n' ? '#8E9EE0' : v === 'l' ? '#FFE3A0' : '#FFF0C0', r.range(0.35, 0.7)), r.int(1, 1e9), { detail: 0, taper1: 0.5 }); }
  });
}
function drawBase(ctx, v) { ctx.drawImage(baseCanvas(v), -80, HZ - 4); }

function drawRow(ctx, j, v, t, x0 = -120, x1 = C.W + 120) {
  const r = ROWS[j], cv = rowCanvas(j, v);
  const off = mod(r.phase + t * r.speed, TW);
  const y = r.y + bob(j, t) - r.top;
  for (let k = -1; k <= 1; k++) {
    const x = -off + k * TW - MG;
    if (x > x1 || x + TW + 2 * MG < x0) continue;
    ctx.drawImage(cv, x, y);
  }
}

// Deniz + nesneler (ressam sırasıyla). objs: [{ y: taban çizgisi, draw(ctx, v) }]
function drawSea(ctx, t, v, objs, yr = null) {
  drawBase(ctx, v);
  let list = objs.slice().sort((a, b) => a.y - b.y);
  // kırpılmış geçişte, kırpma bandına değmeyen nesneleri atla (top: nesnenin üst sınırı)
  if (yr) list = list.filter((o) => o.top == null || !(o.top > yr[1] || o.y + (o.below ?? 40) < yr[0]));
  let oi = 0;
  for (let j = 0; j < ROWS.length; j++) {
    while (oi < list.length && list[oi].y < ROWS[j].y) { list[oi].draw(ctx, v); oi++; }
    const r = ROWS[j];
    if (yr && (r.y - r.top > yr[1] || r.y + r.depth < yr[0])) continue;
    drawRow(ctx, j, v, t);
  }
  while (oi < list.length) { list[oi].draw(ctx, v); oi++; }
}

// Su çizgisi şeridi: nesnenin (kayık, kaya) suya girdiği yeri örten kısa dalgalı su bandı (önbellekli, n/l)
function waterlineCanvas(key, w, hgt, v, seed, o = {}) {
  const pal = PALS[v];
  const kc = o.kc ?? 0.3;
  const tn = [0, 1, 2].map((q) => mix(pal.far[q], pal.near[q], kc));
  return R.cached(`s24wl:${key}:${v}`, w, hgt, (x) => {
    const r = rng(seed);
    const top = []; for (let X = 0; X <= w; X += 5) top.push([X, 8 + 3.5 * Math.sin(X * 0.045 + seed) + 2 * Math.sin(X * 0.13 + seed * 2)]);
    // kenarlarda incelen biçim
    const body = top.concat([[w, hgt], [0, hgt]]);
    const g = x.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.12, 'rgba(0,0,0,1)'); g.addColorStop(0.88, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = o.base || tn[1]; x.fill(P.pathOf(body));
    x.save(); x.clip(P.pathOf(body));
    for (let yy = 10; yy < hgt; yy += 6) { let xx = r.range(-40, 0); while (xx < w) { const len = r.range(30, 90); P.stroke(x, xx, yy, xx + len, yy + r.range(-1, 1), r.range(6, 9), shade(r.pick(tn), r.range(-0.02, 0.03)), r.int(1, 1e9), { detail: 0.6 }); xx += len * 0.8; } }
    x.restore();
    // tepe ışığı / köpük
    for (let i = 0; i < Math.round(w / 40); i++) { const xx = r.range(10, w - 40), len = r.range(16, 40); const yy = 8 + 3.5 * Math.sin(xx * 0.045 + seed) + 2; P.stroke(x, xx, yy, xx + len, yy + r.range(-1, 1), r.range(2.5, 4), rgba(r.chance(0.5) ? pal.foam : pal.crest[0], r.range(0.6, 0.9)), r.int(1, 1e9), { detail: 0, taper1: 0.5 }); }
    // kenarları yumuşat (alfa maskesi)
    x.globalCompositeOperation = 'destination-in'; x.fillStyle = g; x.fillRect(0, 0, w, hgt); x.globalCompositeOperation = 'source-over';
  });
}

// Dalga tepelerindeki sabit örnek noktaları (altın yol parıltıları için): şeritle birlikte kayar, tepede kalır.
const _gl = new Map();
function glintSamples(j) {
  if (_gl.has(j)) return _gl.get(j);
  const r = ROWS[j], prof = profile(r, 2400 + j * 31), rr = rng(9100 + j * 7);
  const out = [];
  const step = Math.max(3.5, r.lam * 0.042);
  for (let X = rr.range(0, step); X < TW; X += step * rr.range(0.6, 1.4)) {
    const h = prof(X);
    // tepede (sırtın ışığı) ya da dalga sırtının biraz altında (göğe bakan yüz)
    const onTop = h > r.ch * 0.3 && rr.chance(0.7);
    const dh = onTop ? 0 : -r.ch * rr.range(0.25, 0.9) - 2;
    out.push({ X, h: h + dh, top: onTop, len: Math.max(4, r.lam * rr.range(0.06, onTop ? 0.2 : 0.13)), w: Math.max(1.4, (1.3 + r.ch * (onTop ? 0.2 : 0.13)) * rr.range(0.7, 1.2)), ph: rr.range(0, TAU), f: rr.range(2, 5), seed: rr.int(1, 1e9), c: rr.next() });
  }
  _gl.set(j, out); return out;
}
// j. sıranın tepe noktalarını [x0, x1] dünya aralığında dolaş: fn(x, yTepe, örnek)
function forGlints(j, t, x0, x1, fn) {
  const r = ROWS[j], off = mod(r.phase + t * r.speed, TW), by = r.y + bob(j, t);
  for (const g of glintSamples(j)) {
    const x = mod(g.X - off - x0, TW) + x0;
    if (x > x1) continue;
    fn(x, by - g.h + 1, g);
  }
}

module.exports = { forGlints, HZ, TW, REF_Y, CALM0, CALM1, ROWS, PALS, persp, bob, bobAt, slopeAt, drawSea, drawRow, drawBase, waterlineCanvas, rowCanvas, wrapStroke };
