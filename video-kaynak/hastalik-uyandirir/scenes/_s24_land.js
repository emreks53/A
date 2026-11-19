// S24 yardımcısı — gece göğü, ay, bulutlar, yalıyar + deniz feneri, fener bekçisinin evi, liman, kayalar.
// Büyük durağan katmanlar SS kat çözünürlükte önbelleğe alınır (kamera yakınlaşınca da keskin kalsın).
'use strict';
const { Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E } = C;
const HZ = require('./_s24_sea').HZ;

const SS = 1.25;
const MOON_LA = -0.95;     // ay sağ üstte: gece ışığı oradan
const LAMP = { x: 166, y: 252 };  // fenerin ışık kaynağı (dünya koordinatı)
const TOWER = { x: 166, base: 584, top: 300 };

function hcache(key, w, h, fn) { return R.cached('s24h:' + key, Math.ceil(w * SS), Math.ceil(h * SS), (x) => { x.scale(SS, SS); fn(x); }); }
function put(ctx, cv, x, y) { ctx.drawImage(cv, x, y, cv.width / SS, cv.height / SS); }

// yönü tutarlı birleşik yol (addPath kırpma hatasından kaçınmak için elle)
function area(q) { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] - q[i][0]) * (q[j][1] + q[i][1]); return a / 2; }
function unionPath(list) {
  const p = new Path2D();
  for (let q of list) { if (q.length < 3) continue; if (area(q) < 0) q = q.slice().reverse(); p.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) p.lineTo(q[k][0], q[k][1]); p.closePath(); }
  return p;
}
function shadePath(ctx, path, base, dark, light, la, sb, sa) {
  const lx = Math.cos(la), ly = Math.sin(la);
  ctx.save(); ctx.clip(path);
  ctx.fillStyle = dark; ctx.fill(path);
  ctx.translate(lx * sb, ly * sb); ctx.clip(path); ctx.translate(-lx * sb, -ly * sb);
  ctx.fillStyle = light; ctx.fill(path);
  ctx.translate(-lx * sa, -ly * sa); ctx.fillStyle = base; ctx.fill(path);
  ctx.restore();
}

// ---------- gök ----------
const SKY_X0 = -70, SKY_W = C.W + 140, SKY_H = HZ + 30;
function skyCv() {
  return hcache('sky', SKY_W, SKY_H, (x) => {
    x.translate(-SKY_X0, 0);
    const w = SKY_W, h = SKY_H;
    x.fillStyle = P.UNDERPAINT; x.fillRect(SKY_X0, 0, w, h);
    P.bandFill(x, null, { x0: SKY_X0, y0: 0, x1: SKY_X0 + w, y1: h, w, h }, ['#0F1236', '#171C55', '#212A74', '#2E3789', '#45479B', '#6858A6'], { seed: 2501, wMin: 20, wMax: 40, lMin: 90, lMax: 280, stops: [0, 0.2, 0.42, 0.64, 0.86, 1], mixJitter: 0.06 });
    // ufuk üstünde sıcak-mor ince sis şeritleri
    const r = rng(2502);
    for (let i = 0; i < 14; i++) { const y = r.range(HZ - 110, HZ - 8), x0 = r.range(SKY_X0, SKY_X0 + w), len = r.range(120, 320); P.stroke(x, x0, y, x0 + len, y + r.range(-3, 3), r.range(8, 16), rgba(r.chance(0.5) ? '#8A6AB0' : '#7A5FA6', 0.55), r.int(1, 1e9), { detail: 0.5, taper1: 0.6 }); }
    // sönük yıldızlar
    R.stars(x, w, 640, 60, 2503, 0, { maxY: 1 });
    // ay (hilal) — sağ üstte
    R.moon(x, 872, 196, 34, { crescent: true, sky: '#18205C' });
  });
}
// parlak, ağır ağır göz kırpan yıldızlar (karede çizilir; konumları sabit)
const BRIGHT = (() => { const r = rng(2504), out = []; for (let i = 0; i < 16; i++) out.push({ x: r.range(20, 1060), y: r.range(40, 640), s: r.range(2.2, 3.6), ph: r.range(0, TAU), sp: r.range(0.8, 1.8) }); return out; })();
function drawStars(ctx, t, a = 1) {
  for (const s of BRIGHT) {
    if (Math.hypot(s.x - LAMP.x, s.y - LAMP.y) < 170 || Math.hypot(s.x - 872, s.y - 196) < 90) continue;
    const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
    R.sparkle(ctx, s.x, s.y, s.s * (2.2 + tw), a * (0.45 + 0.5 * tw), '#F4F0FF');
  }
}

// ---------- bulutlar (uzun, yatay gece bulutları; ay ışığı üst kenarda) ----------
const CLOUDS = [
  { x: 640, y: 128, w: 420, h: 56, seed: 2511 },
  { x: 980, y: 380, w: 360, h: 46, seed: 2512 },
  { x: 380, y: 470, w: 300, h: 36, seed: 2513 },
  { x: 760, y: 640, w: 520, h: 40, seed: 2514 },
];
function cloudCv(c) {
  const pad = 40, w = c.w + pad * 2, h = c.h * 2 + pad * 2;
  return hcache('cloud' + c.seed, w, h, (x) => {
    const r = rng(c.seed), list = [];
    const cx = w / 2, by = pad + c.h * 1.4;
    const n = 6 + r.int(0, 3);
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1, rx = c.w * r.range(0.13, 0.22), ry = c.h * (0.45 + 0.45 * Math.cos(u * 1.3)) * r.range(0.8, 1.1);
      list.push(P.ellipsePts(cx + u * c.w * 0.4, by - ry * 0.5, rx, ry, 24));
    }
    list.push(P.roundRectPts(cx - c.w * 0.5, by - c.h * 0.32, c.w, c.h * 0.36, c.h * 0.18));
    const path = unionPath(list);
    // astar kenarı
    x.save(); x.strokeStyle = P.UNDERPAINT; x.globalAlpha = 0.7; x.lineWidth = 3; x.setLineDash([60, 40, 20, 70]); x.translate(1.5, 1.5); x.stroke(path); x.restore();
    shadePath(x, path, '#2A2C6C', '#1C1D4C', '#5C60AA', MOON_LA, c.h * 0.32, c.h * 0.1);
    x.save(); x.clip(path);
    for (let i = 0; i < Math.round(c.w / 26); i++) {
      const sx = cx + r.range(-c.w * 0.5, c.w * 0.4), sy = by - r.range(0, c.h * 0.9), len = r.range(30, 90);
      P.stroke(x, sx, sy, sx + len, sy + r.range(-2, 2), r.range(5, 10), r.chance(0.4) ? '#4A4E98' : '#23245C', r.int(1, 1e9), { detail: 0.6, taper1: 0.6 });
    }
    P.texture(x, P.bbox(list.flat()), 0, 0.4, 0.5);
    x.restore();
  });
}
function drawClouds(ctx, t) {
  for (const c of CLOUDS) {
    const cv = cloudCv(c), w = cv.width / SS, h = cv.height / SS;
    const dx = (t - 97) * (c.seed % 2 ? 5 : 3.5);
    put(ctx, cv, c.x - w / 2 + dx, c.y - h * 0.62);
  }
}

// ---------- yalıyar ----------
const CLIFF = [[-90, 600], [-40, 590], [20, 586], [80, 592], [130, 588], [210, 594], [262, 590], [306, 598], [338, 622], [352, 662], [360, 706], [372, 744], [384, 790], [402, 836], [420, 874], [444, 904], [468, 922], [470, 940], [-90, 940]];
function cliffCv() {
  const x0 = -90, y0 = 560, w = 600, h = 400;
  return hcache('cliff', w, h, (x) => {
    x.translate(-x0, -y0);
    const pts = P.smoothPts(CLIFF.slice(0, -2), false, 6).concat([[470, 940], [-90, 940]]);
    P.toneShape(x, pts, { base: '#2C2858', dark: '#1B1838', light: '#4A4688', lightAng: MOON_LA, seed: 2521, shadowW: 0.07, lightW: 0.045, coreScale: 0.97, strokeAng: Math.PI / 2, dabs: 26, texAng: Math.PI / 2, highlights: 6 });
    const r = rng(2522);
    // kaya katmanları: yüzde dikey darbeler, eğik çatlaklar
    x.save(); x.clip(P.pathOf(pts));
    for (let i = 0; i < 60; i++) {
      const yy = r.range(610, 930), edgeX = lerp(330, 470, clamp((yy - 610) / 320));
      const xx = r.range(-80, edgeX + 10), len = r.range(20, 60);
      const lit = xx > edgeX - 70;
      P.stroke(x, xx, yy, xx + r.range(-6, 6), yy + len, r.range(6, 13), lit ? (r.chance(0.5) ? '#57529A' : '#3E3A78') : (r.chance(0.5) ? '#221F48' : '#353068'), r.int(1, 1e9), { detail: 0.5, taper1: 0.5 });
    }
    for (let i = 0; i < 9; i++) { const yy = r.range(640, 900), xx = r.range(60, 400); P.stroke(x, xx, yy, xx + r.range(40, 90), yy + r.range(14, 30), 4, rgba('#15132E', 0.6), r.int(1, 1e9), { detail: 0 }); }
    x.restore();
    // tepede çimen örtüsü
    const top = P.smoothPts(CLIFF.slice(0, 9), false, 6);
    const grass = top.concat(top.slice().reverse().map(([a, b], i) => [a + 4, b + 18 + 8 * Math.sin(i * 0.7)]));
    P.toneShape(x, grass, { base: '#245252', dark: '#163838', light: '#3E7A6A', lightAng: MOON_LA, seed: 2523, rim: false, shadowW: 0.06, lightW: 0.25, dabs: 10, texture: 0.4 });
    for (let i = 0; i < 22; i++) { const gx = r.range(-80, 330); const gy = lerp(590, 600, r.next()); R.grass(x, gx, gy + 8, r.range(12, 22), r.int(1, 999), { c1: '#1E4A4A', c2: '#4E8A72', n: 4 }); }
  });
}

// ---------- deniz feneri (kule) ----------
function towerPts() {
  const { x, base, top } = TOWER;
  return [[x - 48, base], [x - 33, top], [x + 33, top], [x + 48, base]];
}
// kulenin genişliği (yükseklikte)
function halfW(y) { return lerp(48, 33, clamp((TOWER.base - y) / (TOWER.base - TOWER.top))); }
function bandPts(y0, y1) {
  const { x } = TOWER, out = [];
  const curve = (y, sgn) => { const hw = halfW(y), arr = []; for (let i = 0; i <= 10; i++) { const u = i / 10 * 2 - 1; arr.push([x + u * hw, y + 5 * (1 - u * u) * sgn]); } return arr; };
  return curve(y0, 1).concat(curve(y1, 1).reverse());
}
function towerCv(lit) {
  const x0 = 60, y0 = 140, w = 220, h = 460;
  return hcache('tower' + lit, w, h, (x) => {
    x.translate(-x0, -y0);
    const { x: tx, base, top } = TOWER;
    const la = lit ? -1.6 : MOON_LA; // yanınca tepeden sıcak ışık
    const white = lit ? '#E6DCCF' : '#B9B6D6', whiteD = lit ? '#8A80B4' : '#6E6AA2', whiteL = lit ? '#FFF2DC' : '#DCDAF2';
    const red = lit ? '#C8443A' : '#94384A', redD = lit ? '#7A2A3E' : '#5A2440', redL = lit ? '#EE7A58' : '#B85868';
    // gövde (silindir: sağ yan ay ışığında açık, sol koyu — dikey darbeler)
    const tp = towerPts();
    P.toneShape(x, tp, { base: white, dark: whiteD, light: whiteL, lightAng: lit ? -0.9 : MOON_LA, seed: 2531, shadowW: 0.2, lightW: 0.12, coreScale: 0.86, strokeAng: Math.PI / 2, dabs: 10, texAng: Math.PI / 2, highlights: 0 });
    // kırmızı kuşaklar
    for (const [a, b, sd] of [[372, 412, 1], [478, 518, 2]]) {
      const bp = bandPts(a, b);
      x.save(); x.clip(P.pathOf(tp));
      P.toneShape(x, bp, { base: red, dark: redD, light: redL, lightAng: lit ? -0.9 : MOON_LA, seed: 2532 + sd, rim: false, shadowW: 0.25, lightW: 0.15, coreScale: 0.86, strokeAng: Math.PI / 2, dabs: 4, texAng: Math.PI / 2 });
      x.restore();
    }
    // küçük pencere ve kapı
    x.fillStyle = lit ? '#FFC870' : '#2A2450'; x.fill(P.pathOf(P.roundRectPts(tx - 7, 440, 14, 22, 6)));
    P.toneShape(x, P.smoothPts([[tx - 14, base], [tx - 14, base - 30], [tx, base - 40], [tx + 14, base - 30], [tx + 14, base]], true, 5), { base: '#3A2A4A', dark: '#241A34', light: '#5A4468', rim: false, shadowW: 0.2, dabs: 1, seed: 2535 });
    // balkon (galeri) ve korkuluk
    P.toneShape(x, P.roundRectPts(tx - 50, top - 10, 100, 14, 4), { base: '#2E2846', dark: '#1C1830', light: '#5A527E', seed: 2536, rim: true, shadowW: 0.3, dabs: 2 });
    x.strokeStyle = '#2A2440'; x.lineWidth = 3;
    x.beginPath(); x.moveTo(tx - 46, top - 34); x.lineTo(tx + 46, top - 34); x.stroke();
    x.lineWidth = 2.2;
    for (let i = 0; i <= 8; i++) { const xx = tx - 46 + i * 11.5; x.beginPath(); x.moveTo(xx, top - 34); x.lineTo(xx, top - 10); x.stroke(); }
    // fener odası çerçevesi (camı ayrıca çizilir)
    x.fillStyle = '#28223E';
    x.fillRect(tx - 31, top - 82, 62, 6); x.fillRect(tx - 31, top - 16, 62, 6);
    for (const u of [-31, -11, 9, 27]) x.fillRect(tx + u, top - 80, 4, 66);
    // kubbe
    const dome = P.smoothPts([[tx - 36, top - 80], [tx - 30, top - 100], [tx - 14, top - 114], [tx, top - 118], [tx + 14, top - 114], [tx + 30, top - 100], [tx + 36, top - 80]], false, 6).concat([[tx + 36, top - 80]]);
    P.toneShape(x, dome, { base: red, dark: redD, light: redL, lightAng: MOON_LA, seed: 2537, shadowW: 0.22, lightW: 0.14, dabs: 3 });
    x.fillStyle = '#28223E'; x.fillRect(tx - 2, top - 140, 4, 24);
    P.toneShape(x, P.ellipsePts(tx, top - 124, 7, 7, 16), { base: '#3A3256', dark: '#221C36', light: '#6A6090', rim: false, shadowW: 0.3, dabs: 0, seed: 2538 });
  });
}
// fener odası camı (yanıklık 0..1, renk)
function drawLantern(ctx, on, col = '#FFE9A8') {
  const { x: tx, top } = TOWER;
  const glass = [[tx - 29, top - 76], [tx + 29, top - 76], [tx + 29, top - 16], [tx - 29, top - 16]];
  ctx.fillStyle = mix('#33416E', col, clamp(on)); ctx.fill(P.pathOf(glass));
  if (on > 0.02) {
    // lamba çekirdeği ve mercek halkaları
    const cx = LAMP.x, cy = LAMP.y;
    ctx.save(); ctx.clip(P.pathOf(glass));
    ctx.fillStyle = rgba('#FFFFFF', 0.9 * clamp(on)); ctx.beginPath(); ctx.ellipse(cx, cy, 13 + 3 * on, 17 + 3 * on, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = rgba(shade(col, -0.12), 0.55 * clamp(on)); ctx.lineWidth = 2;
    for (const rr of [20, 27]) { ctx.beginPath(); ctx.ellipse(cx, cy, rr * 0.8, rr, 0, 0, TAU); ctx.stroke(); }
    ctx.restore();
  }
  // çerçeve dikmeleri camın önünde
  ctx.fillStyle = '#28223E';
  for (const u of [-31, -11, 9, 27]) ctx.fillRect(tx + u, top - 80, 4, 66);
}

// ---------- fener bekçisinin evi ----------
function cottageCv() {
  const x0 = 220, y0 = 520, w = 120, h = 90;
  return hcache('cottage', w, h, (x) => {
    x.translate(-x0, -y0);
    P.toneShape(x, [[236, 596], [236, 560], [322, 560], [322, 596]], { base: '#ACA8CC', dark: '#6A66A0', light: '#D6D4EE', lightAng: MOON_LA, seed: 2541, shadowW: 0.14, dabs: 4, strokeAng: Math.PI / 2 });
    P.toneShape(x, [[228, 562], [252, 534], [306, 534], [330, 562]], { base: '#7A3A4E', dark: '#4E2238', light: '#A85A68', lightAng: MOON_LA, seed: 2542, shadowW: 0.2, dabs: 3 });
    x.fillStyle = '#FFC66A'; x.fillRect(266, 570, 14, 14); x.fillRect(292, 570, 14, 14);
    x.fillStyle = '#3A2A4A'; x.fillRect(244, 572, 13, 24);
  });
}

// ---------- liman (yalıyarın dibinde) ----------
const HOUSES = [
  { x: 292, y: 918, w: 58, h: 46, roof: 22 }, { x: 345, y: 918, w: 50, h: 58, roof: 20 }, { x: 398, y: 920, w: 56, h: 40, roof: 20 }, { x: 250, y: 916, w: 46, h: 36, roof: 18 },
];
const WINDOWS = []; // dünya koordinatında pencere merkezleri (yansıma için)
function harbourCv() {
  const x0 = 200, y0 = 820, w = 360, h = 130;
  return hcache('harbour', w, h, (x) => {
    x.translate(-x0, -y0);
    const r = rng(2551);
    for (const hs of HOUSES) {
      const L = hs.x - hs.w / 2, Rr = hs.x + hs.w / 2, T = hs.y - hs.h;
      P.toneShape(x, [[L, hs.y], [L, T], [Rr, T], [Rr, hs.y]], { base: '#9A96C2', dark: '#5E5A92', light: '#C6C4E4', lightAng: MOON_LA, seed: 2552 + hs.x, shadowW: 0.16, dabs: 3, strokeAng: Math.PI / 2, rimW: 2.5 });
      P.toneShape(x, [[L - 5, T + 2], [hs.x - 4, T - hs.roof], [hs.x + 4, T - hs.roof], [Rr + 5, T + 2]], { base: '#7A3446', dark: '#4A1E34', light: '#A65466', lightAng: MOON_LA, seed: 2553 + hs.x, shadowW: 0.22, dabs: 2, rimW: 2 });
    }
    // rıhtım: taş, sağa uzanır
    P.toneShape(x, [[226, 932], [228, 916], [486, 914], [492, 928]], { base: '#4E4A7C', dark: '#2E2A54', light: '#7A76AA', lightAng: MOON_LA, seed: 2556, shadowW: 0.3, lightW: 0.2, dabs: 6 });
    x.strokeStyle = rgba('#25213F', 0.6); x.lineWidth = 2;
    for (let i = 0; i < 9; i++) { const xx = 240 + i * 28; x.beginPath(); x.moveTo(xx, 917); x.lineTo(xx + 1, 929); x.stroke(); }
    // fener direği (rıhtım ucu)
    x.fillStyle = '#2A2440'; x.fillRect(478, 876, 4, 40);
    // bağlı küçük kayık
    const hull = P.smoothPts([[420, 926], [432, 936], [470, 937], [482, 926]], false, 5).concat([[482, 926]]);
    P.toneShape(x, hull, { base: '#7A4A3A', dark: '#4A2A24', light: '#A66A4A', lightAng: MOON_LA, seed: 2557, shadowW: 0.3, dabs: 1, rimW: 2 });
  });
}
// pencereler: liman ışıkları (karede: parlaklığa göre)
const WIN_PTS = (() => {
  const out = [];
  for (const hs of HOUSES) {
    const T = hs.y - hs.h;
    const n = hs.w > 52 ? 2 : 1;
    for (let i = 0; i < n; i++) out.push({ x: hs.x + (n === 2 ? (i ? 12 : -12) : 0), y: T + hs.h * 0.45, w: 9, h: 11 });
  }
  return out;
})();
function drawHarbourLights(ctx, t, glow) {
  for (const w of WIN_PTS) {
    ctx.fillStyle = mix('#C88A4A', '#FFE2A0', glow);
    ctx.fillRect(w.x - w.w / 2, w.y - w.h / 2, w.w, w.h);
    ctx.fillStyle = rgba('#3A2A40', 0.7); ctx.fillRect(w.x - 0.8, w.y - w.h / 2, 1.6, w.h);
  }
  const lx = 480, ly = 872;
  R.lantern(ctx, lx, ly + 8, 14, 0.6 + 0.4 * glow, t);
  P.glow(ctx, 360, 880, 170 + 60 * glow, '#FFB060', 0.18 + 0.22 * glow);
  for (const w of WIN_PTS) P.glow(ctx, w.x, w.y, 22 + 10 * glow, '#FFC870', 0.35 + 0.35 * glow);
}
// ışıkların suda yansıması: titreşen yatay darbe yığınları (tohumlar sabit, konum yumuşakça salınır)
function drawHarbourReflections(ctx, t, glow) {
  const srcs = WIN_PTS.map((w) => ({ x: w.x, a: 0.5 })).concat([{ x: 480, a: 0.9 }]);
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  srcs.forEach((s, si) => {
    const r = rng(2560 + si);
    for (let k = 0; k < 7; k++) {
      const y = 934 + k * 6 + k * k * 0.9, wob = Math.sin(t * 2.2 + k * 1.3 + si) * (2 + k * 0.8);
      const len = r.range(6, 14) * (1 + k * 0.25);
      P.stroke(ctx, s.x - len / 2 + wob, y, s.x + len / 2 + wob, y + 0.5, 2.6 + k * 0.25, rgba('#FFC870', (0.25 + 0.45 * glow) * s.a * (1 - k / 8)), 2570 + si * 13 + k, { detail: 0, taper1: 0.5 });
    }
  });
  ctx.restore();
}

// ---------- kayalar ----------
// görünen kaya dişleri (yarı batık) ve yalnız ışıkta görünen batık kayalar
const ROCKS = [
  { x: 902, y: 1210, s: 1.0, pts: [[-78, 0], [-66, -30], [-50, -52], [-36, -48], [-22, -84], [-10, -104], [2, -92], [12, -66], [26, -74], [44, -46], [60, -26], [80, 0]], seed: 2581 },
  { x: 1010, y: 1222, s: 1.0, pts: [[-56, 0], [-44, -26], [-26, -40], [-12, -58], [4, -50], [20, -36], [34, -40], [48, -16], [58, 0]], seed: 2582 },
  { x: 820, y: 1228, s: 1.0, pts: [[-34, 0], [-22, -16], [-8, -28], [6, -22], [20, -12], [34, 0]], seed: 2583 },
];
const SUNK = [
  { x: 952, y: 1252, rx: 92, ry: 16, seed: 2591 }, { x: 842, y: 1246, rx: 60, ry: 12, seed: 2592 }, { x: 1040, y: 1250, rx: 70, ry: 13, seed: 2593 }, { x: 760, y: 1240, rx: 40, ry: 9, seed: 2594 },
];
function rockCv(rk, lit) {
  const w = 200, h = 150;
  return hcache(`rock${rk.seed}${lit}`, w, h, (x) => {
    x.translate(w / 2, h - 24);
    const pts = rk.pts.map(([a, b]) => [a * rk.s, b * rk.s]).concat([[80 * rk.s, 18], [-80 * rk.s, 18]].map(([a, b]) => [Math.max(rk.pts[0][0], Math.min(rk.pts[rk.pts.length - 1][0], a)), b]));
    const shape = rk.pts.map(([a, b]) => [a * rk.s, b * rk.s]); shape.push([rk.pts[rk.pts.length - 1][0] * rk.s, 20], [rk.pts[0][0] * rk.s, 20]);
    if (lit) {
      P.toneShape(x, shape, { base: '#7E5466', dark: '#3E2848', light: '#F2A868', lightAng: -2.25, seed: rk.seed, shadowW: 0.24, lightW: 0.16, coreScale: 0.84, dabs: 10, strokeAng: -0.6, highlights: 4, hi: '#FFD08A' });
      // ıslak parıltı
      const r = rng(rk.seed + 5);
      for (let i = 0; i < 4; i++) { const px = r.range(-30, 10), py = r.range(-60, -10); P.stroke(x, px, py, px + r.range(6, 14), py - r.range(4, 10), 3, rgba('#FFF2C8', 0.8), r.int(1, 1e9), { detail: 0 }); }
    } else {
      P.toneShape(x, shape, { base: '#28346F', dark: '#212B62', light: '#34418A', lightAng: MOON_LA, seed: rk.seed, rim: false, shadowW: 0.2, lightW: 0.05, dabs: 6, strokeAng: -0.6, highlights: 0, texture: 0.25 });
    }
  });
}
function drawRock(ctx, rk, lit, by) {
  const w = 200, h = 150;
  const n = rockCv(rk, false);
  // gecede su tonunda, neredeyse görünmez (gizli kaya)
  ctx.save(); ctx.globalAlpha = 0.3 + 0.7 * clamp(lit * 2); put(ctx, n, rk.x - w / 2, rk.y + by - (h - 24)); ctx.restore();
  if (lit > 0.003) { ctx.save(); ctx.globalAlpha = clamp(lit); put(ctx, rockCv(rk, true), rk.x - w / 2, rk.y + by - (h - 24)); ctx.restore(); }
}
// batık kaya (yalnız ışık geçişinde çizilir: suyun altında koyu mor-turkuaz leke)
function sunkCv(sk) {
  const w = sk.rx * 2 + 20, h = sk.ry * 2 + 20;
  return hcache('sunk' + sk.seed, w, h, (x) => {
    const pts = P.blobPts(w / 2, h / 2, sk.rx, sk.ry, sk.seed % 97, 0.22, 30);
    P.toneShape(x, pts, { base: '#2A4A6E', dark: '#1C3254', light: '#4E7E96', lightAng: -2.25, seed: sk.seed, rim: false, shadowW: 0.25, lightW: 0.2, dabs: 4, texture: 0.3, strokeAng: 0 });
  });
}
function drawSunk(ctx, sk, by) { const cv = sunkCv(sk); put(ctx, cv, sk.x - cv.width / SS / 2, sk.y + by - cv.height / SS / 2); }

// ayın denizdeki parıltısı: ufka yakın, derinleştikçe seyrelir (önbellekli; karede hafifçe salınır)
function glitterCv() {
  const w = 260, h = 200;
  return hcache('glitter', w, h, (x) => {
    const r = rng(2599);
    for (let i = 0; i < 70; i++) {
      const k = Math.pow(r.next(), 1.4), y = 4 + k * (h - 10), half = 18 + 90 * k;
      const xx = w / 2 + r.range(-half, half), len = (6 + 26 * k) * r.range(0.6, 1.3);
      P.stroke(x, xx - len / 2, y, xx + len / 2, y + r.range(-0.6, 0.6), 1.6 + 3 * k, rgba(r.chance(0.3) ? '#E8EEFF' : '#AFC0F0', (0.85 - 0.6 * k) * r.range(0.5, 1)), r.int(1, 1e9), { detail: 0, taper1: 0.4 });
    }
  });
}
function drawMoonGlitter(ctx, t) {
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.85;
  put(ctx, glitterCv(), 872 - 130 + Math.sin(t * 0.9) * 4, HZ + 2);
  ctx.restore();
}

module.exports = {
  drawMoonGlitter,
  SS, MOON_LA, LAMP, TOWER, hcache, put, unionPath, shadePath,
  skyCv, SKY_X0, drawStars, drawClouds, cliffCv, towerCv, drawLantern, cottageCv, harbourCv, drawHarbourLights, drawHarbourReflections,
  ROCKS, SUNK, drawRock, drawSunk, WIN_PTS,
};
