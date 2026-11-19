// s02–s04 ortak akrilik nesneler ve efektler: önbellekli sprite'lar (ağaç, hamak, minder, çay bardağı, meyve tepsisi...),
// sprite'ı "kum ve parıltıya dönüşerek" dağıtma (piksel aşındırma + parçacık), sabun köpüğü, rüzgârda çimen.
'use strict';
const { createCanvas } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, noise2, fbm } = C;

// ---------- sprite ----------
// sprite(key, w, h, ax, ay, fn): (ax, ay) çapa noktası (genelde taban ortası). fn(ctx) sprite koordinatında çizer.
const _spr = new Map();
function sprite(key, w, h, ax, ay, fn) {
  if (_spr.has(key)) return _spr.get(key);
  const cv = R.cached('spr:' + key, w, h, (x) => fn(x));
  const s = { cv, w, h, ax, ay, key };
  _spr.set(key, s);
  return s;
}
// sprite'ı dünya konumuna bas: x,y çapa; sc ölçek; rot dönme; alpha
function put(ctx, s, x, y, sc = 1, rot = 0, alpha = 1, img = null) {
  if (sc <= 0.001 || alpha <= 0.001) return;
  ctx.save();
  ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sc, sc);
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(img || s.cv, -s.ax, -s.ay);
  ctx.restore();
}

// ---------- dağılma (kuma/parıltıya dönüşme) ----------
// Her sprite için: piksel verisi + aşınma sırası haritası (gürültü + sağdan sola eğim: rüzgâr sağa eser).
const _dis = new Map();
function dissolver(s, seed = 1) {
  if (_dis.has(s.key)) return _dis.get(s.key);
  const w = Math.ceil(s.w), h = Math.ceil(s.h);
  const src = s.cv.getContext('2d').getImageData(0, 0, w, h);
  const order = new Float32Array(w * h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const n = fbm(i / 26 + seed * 3.1, j / 26 - seed, 3, seed);
    order[j * w + i] = clamp(0.5 * n + 0.42 * (1 - i / w) + 0.18 * (j / h) - 0.12, 0, 1);
  }
  // parçacık kaynakları: opak piksellerden tohumlu seçim
  const r = rng(seed * 101 + 7), parts = [];
  let tries = 0;
  while (parts.length < 170 && tries < 30000) {
    tries++;
    const i = r.int(0, w - 1), j = r.int(0, h - 1), k = (j * w + i) * 4;
    if (src.data[k + 3] < 200) continue;
    parts.push({ sx: i, sy: j, col: [src.data[k], src.data[k + 1], src.data[k + 2]], ord: order[j * w + i], vx: r.range(60, 200), vy: r.range(-170, -60), sz: r.range(1.6, 4.2), ph: r.range(0, TAU), life: r.range(0.5, 0.95), spark: r.chance(0.2) });
  }
  const cv = createCanvas(w, h), cx = cv.getContext('2d');
  const out = cx.createImageData(w, h);
  const d = { s, w, h, src, order, parts, cv, cx, out, lastP: -1 };
  _dis.set(s.key, d);
  return d;
}
// p: 0 (bütün) .. 1 (tamamen dağılmış). Dönen: çizilecek tuval (ya da null)
function dissolvedImage(d, p) {
  if (p <= 0) return d.s.cv;
  if (p >= 1) return null;
  if (Math.abs(p - d.lastP) < 1e-6) return d.cv;
  const S = d.src.data, O = d.out.data, ord = d.order, n = d.w * d.h, soft = 0.035;
  for (let i = 0; i < n; i++) {
    const k = i * 4, a = S[k + 3];
    if (a === 0) { O[k + 3] = 0; continue; }
    const m = (ord[i] - p) / soft;
    if (m <= 0) { O[k + 3] = 0; continue; }
    O[k] = S[k]; O[k + 1] = S[k + 1]; O[k + 2] = S[k + 2];
    if (m < 1) { // aşınma kıyısında altın kum rengine dön
      O[k] = lerp(232, S[k], m); O[k + 1] = lerp(178, S[k + 1], m); O[k + 2] = lerp(74, S[k + 2], m);
      O[k + 3] = a * (0.35 + 0.65 * m);
    } else O[k + 3] = a;
  }
  d.cx.putImageData(d.out, 0, 0);
  d.lastP = p;
  return d.cv;
}
// parçacıklar: xf(sx,sy,t) sprite noktasını t anındaki dünyaya çevirir; p0,p1: dağılmanın başlama/bitiş zamanları
function dissolveParticles(ctx, d, t, t0, t1, xf, o = {}) {
  const wind = o.wind ?? 1;
  for (const q of d.parts) {
    const tb = lerp(t0, t1, q.ord);
    const age = t - tb;
    if (age < 0 || age > q.life) continue;
    const k = age / q.life;
    const [bx, by] = xf(q.sx, q.sy, tb);
    const x = bx + q.vx * wind * age + Math.sin(q.ph + age * 5) * 10 * k;
    const y = by + q.vy * age - 40 * age * age;
    const a = (1 - k) * (k < 0.1 ? k / 0.1 : 1);
    if (q.spark) R.sparkle(ctx, x, y, q.sz * 2.6 * (1 - k * 0.5), a, '#FFF3C8');
    else {
      const col = C.rgb2hex(q.col.map((c, i) => lerp(c, [240, 196, 92][i], clamp(0.35 + k * 2.4))));
      ctx.fillStyle = rgba(col, a);
      const s = q.sz * (1 - 0.5 * k);
      ctx.save(); ctx.translate(x, y); ctx.rotate(q.ph + age * 3); ctx.fillRect(-s, -s * 0.6, s * 2, s * 1.2); ctx.restore();
    }
  }
}

// ---------- sabun köpüğü ----------
function bubble(ctx, x, y, r, a = 1, t = 0, seed = 1) {
  if (a <= 0 || r <= 1) return;
  ctx.save();
  ctx.globalAlpha *= a;
  // yanardöner zar: ince, yarı saydam halka darbeleri
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.04)'); g.addColorStop(0.7, 'rgba(200,235,255,0.12)'); g.addColorStop(1, 'rgba(255,205,240,0.42)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  const cols = ['#9EE7F2', '#F6B8E2', '#FFE7A0', '#B9A8F0'];
  ctx.lineWidth = Math.max(2, r * 0.05); ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const a0 = t * 0.8 + i * 1.57 + seed;
    ctx.strokeStyle = rgba(cols[i], 0.8);
    ctx.beginPath(); ctx.arc(x, y, r * 0.985, a0, a0 + 1.1); ctx.stroke();
  }
  // parlama hilali
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.beginPath(); ctx.arc(x, y, r * 0.78, -2.6, -1.85); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(x + r * 0.42, y + r * 0.45, r * 0.06, 0, TAU); ctx.fill();
  ctx.restore();
}
// köpük patlaması: dışa saçılan küçük damlacıklar + halka
function bubblePop(ctx, x, y, r, k, seed = 1) {
  if (k <= 0 || k >= 1) return;
  const rr = rng(seed);
  ctx.save();
  ctx.strokeStyle = rgba('#FFFFFF', 0.6 * (1 - k)); ctx.lineWidth = 3 * (1 - k);
  ctx.beginPath(); ctx.arc(x, y, r * (1 + k * 0.35), 0, TAU); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + rr.range(-0.2, 0.2), d = r * (1 + E.outCubic(k) * rr.range(0.3, 0.8));
    ctx.fillStyle = rgba(rr.pick(['#FFFFFF', '#BDEFF7', '#F8CBEA']), 0.85 * (1 - k));
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr.range(2, 5) * (1 - k * 0.6), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------- ağaç (uzun gövdeli, hamak bağlanabilir) ----------
// çapa: gövde tabanı. Dönen sprite'ın ek alanları: attach (gövdede hamak bağlama noktası, sprite koordinatı)
function tallTree(key, s, o = {}) {
  const W = s * 2.0, H = s * 2.5, ax = W / 2, ay = H - 6;
  const spr = sprite('tree:' + key, W, H, ax, ay, (x) => {
    const r = rng(o.seed ?? 3);
    const bx = ax, by = ay;
    const tw = s * 0.085, th = s * 1.25;
    const trunk = P.smoothPts([[bx - tw * 1.3, by], [bx - tw * 0.9, by - th * 0.35], [bx - tw * 0.65, by - th * 0.8], [bx - tw * 0.5, by - th], [bx + tw * 0.55, by - th], [bx + tw * 0.75, by - th * 0.75], [bx + tw * 1.0, by - th * 0.3], [bx + tw * 1.45, by]], true, 6);
    // dallar
    const br = (x0, y0, x1, y1, w) => P.curveStroke(x, [[x0, y0], [lerp(x0, x1, 0.5) + (y1 - y0) * 0.1, lerp(y0, y1, 0.5)], [x1, y1]], (u) => w * (1 - u * 0.6), o.trunk || '#7A4A2E', r.int(1, 1e9), { bristles: 2 });
    br(bx, by - th * 0.78, bx - s * 0.42, by - th * 1.12, tw * 0.9);
    br(bx, by - th * 0.86, bx + s * 0.4, by - th * 1.15, tw * 0.8);
    P.toneShape(x, trunk, { base: o.trunk || '#7A4A2E', dark: '#46261A', light: '#A8703F', seed: (o.seed ?? 3) + 1, shadowW: 0.3, lightW: 0.18, texture: 0.5, strokeAng: Math.PI / 2, texAng: Math.PI / 2, dabs: 4, rimW: 4 });
    // taç
    const cy = by - th - s * 0.32, list = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + r.range(-0.2, 0.2), rr = s * r.range(0.3, 0.4);
      list.push(P.blobPts(bx + Math.cos(a) * s * 0.5, cy + Math.sin(a) * s * 0.36, rr, rr * 0.88, (o.seed ?? 3) * 10 + i, 0.14, 28));
    }
    list.push(P.blobPts(bx, cy - s * 0.04, s * 0.55, s * 0.46, (o.seed ?? 3) + 77, 0.1, 30));
    P.toneUnion(x, list, { base: o.leaf || '#3E9B4F', dark: o.leafDark || '#17573A', light: o.leafLight || '#9ED64A', seed: o.seed ?? 3, shadowW: 0.15, lightW: 0.07, strokeAng: -0.5, dabs: Math.round(s / 6), rimW: 5 });
    // yaprak darbeleri (biçimi izleyen kısa kıvrık darbeler)
    for (let i = 0; i < Math.round(s / 5); i++) {
      const a = r.range(0, TAU), d = r.range(0.2, 0.85);
      const px = bx + Math.cos(a) * s * 0.75 * d, py = cy + Math.sin(a) * s * 0.55 * d;
      const lit = Math.cos(a - (-2.3)) > 0.1;
      const col = lit ? (r.chance(0.5) ? (o.leafLight || '#9ED64A') : '#C9E86A') : (r.chance(0.5) ? (o.leafDark || '#17573A') : '#256B3E');
      const ang = a + Math.PI / 2 + r.range(-0.4, 0.4), len = s * r.range(0.07, 0.15);
      P.stroke(x, px - Math.cos(ang) * len / 2, py - Math.sin(ang) * len / 2, px + Math.cos(ang) * len / 2, py + Math.sin(ang) * len / 2, s * r.range(0.035, 0.06), col, r.int(1, 1e9), { detail: 0.5, taper1: 0.5 });
    }
    if (o.fruit) for (let i = 0; i < 7; i++) {
      const a = r.range(0, TAU), d = r.range(0.25, 0.8), px = bx + Math.cos(a) * s * 0.7 * d, py = cy + Math.sin(a) * s * 0.5 * d;
      P.toneShape(x, P.ellipsePts(px, py, s * 0.035, s * 0.035, 12), { base: o.fruit, dark: shade(o.fruit, -0.2), light: shade(o.fruit, 0.2), rim: false, shadowW: 0.3, texture: 0.2, dabs: 0, highlights: 1, seed: i });
    }
  });
  spr.attach = [ax, ay - s * 1.25 * 0.62];
  return spr;
}

// ---------- hamak ----------
// iki bağlantı noktası arasında (sprite koordinatında A=(0,0) solda, B=(L,dy))
function hammock(key, L, dy, o = {}) {
  const pad = 40, sag = o.sag ?? L * 0.32;
  const W = L + pad * 2, Hh = Math.max(0, dy) + sag + pad * 2 + 30;
  const ax = pad, ay = pad + Math.max(0, -dy);
  return sprite('hammock:' + key, W, Hh, ax, ay, (x) => {
    const A = [ax, ay], B = [ax + L, ay + dy];
    const e0 = [lerp(A[0], B[0], 0.16), lerp(A[1], B[1], 0.16) + sag * 0.28], e1 = [lerp(A[0], B[0], 0.84), lerp(A[1], B[1], 0.84) + sag * 0.28];
    // ipler (uçlardan kumaşa yelpaze)
    x.lineCap = 'round';
    for (const [P0, P1, sgn] of [[A, e0, 1], [B, e1, -1]]) {
      for (let i = 0; i < 4; i++) {
        const tx = P1[0] + sgn * (i - 1.5) * 4, ty = P1[1] + (i - 1.5) * 9;
        x.strokeStyle = i % 2 ? '#C9A86E' : '#E7CF97'; x.lineWidth = 3;
        x.beginPath(); x.moveTo(P0[0], P0[1]); x.lineTo(tx, ty); x.stroke();
      }
    }
    // kumaş: üst kenar sığ sarkma, alt kenar derin sarkma
    const top = [], bot = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, bx = lerp(e0[0], e1[0], u), by = lerp(e0[1], e1[1], u);
      top.push([bx, by + Math.sin(Math.PI * u) * sag * 0.55]);
      bot.push([bx + Math.sin(Math.PI * u) * 2, by + Math.sin(Math.PI * u) * sag * 0.98 + 10 * Math.sin(Math.PI * u)]);
    }
    const fab = top.concat(bot.slice().reverse());
    P.toneShape(x, fab, { base: '#F4E6C8', dark: '#B9A3C9', light: '#FFF8E8', seed: 31, shadowW: 0.08, lightW: 0.04, coreScale: 0.97, texture: 0.4, dabs: 6, strokeAng: 0, rimW: 4 });
    // şeritler (boyuna)
    x.save(); x.clip(P.pathOf(fab));
    const stripes = [['#D9483B', 0.18], ['#2E9AB8', 0.36], ['#E8A83A', 0.5], ['#D9483B', 0.66], ['#2E9AB8', 0.84]];
    for (const [col, v] of stripes) {
      const line = top.map((p, i) => [lerp(p[0], bot[i][0], v), lerp(p[1], bot[i][1], v)]);
      P.curveStroke(x, line, (sag * 0.4) * 0.16 + 6, col, Math.round(v * 1000), { bristles: 3 });
    }
    // alt kenar gölgesi
    const sh = bot.map((p, i) => [p[0], p[1] - 14 * Math.sin(Math.PI * i / 24)]);
    P.curveStroke(x, sh, 16, rgba('#4B3A7A', 0.28), 77, { bristles: 0 });
    x.restore();
    // püsküller
    for (let i = 2; i <= 22; i += 2) {
      const p = bot[i];
      P.stroke(x, p[0], p[1] - 2, p[0] + 1, p[1] + 16, 5, i % 4 ? '#E8A83A' : '#D9483B', 500 + i, { detail: 0, taper1: 0.4 });
    }
  });
}

// ---------- minder ----------
function cushion(key, w, o = {}) {
  const h = w * 0.36, pad = 24;
  return sprite('cushion:' + key, w + pad * 2, h + pad * 2 + 10, pad + w / 2, pad + h + 4, (x) => {
    const cx = pad + w / 2, by = pad + h + 4;
    const body = P.smoothPts([[cx - w * 0.5, by - h * 0.1], [cx - w * 0.52, by - h * 0.62], [cx - w * 0.38, by - h * 0.98], [cx, by - h * 1.04], [cx + w * 0.38, by - h * 0.98], [cx + w * 0.52, by - h * 0.62], [cx + w * 0.5, by - h * 0.1], [cx, by + 2]], true, 8);
    P.toneShape(x, body, { base: o.base || '#C7362F', dark: '#6E1E3A', light: '#F06A45', seed: 41, shadowW: 0.16, lightW: 0.1, texture: 0.45, dabs: 8, strokeAng: 0 });
    // kenar şeridi (altın)
    x.save(); x.clip(P.pathOf(body));
    const mid = []; for (let i = 0; i <= 16; i++) { const u = i / 16; mid.push([cx - w * 0.5 + w * u, by - h * 0.5 + Math.sin(Math.PI * u) * -h * 0.06]); }
    P.curveStroke(x, mid, 7, '#F2C14E', 43, { bristles: 2 });
    // küçük motifler
    const r = rng(44);
    for (let i = 0; i < 5; i++) { const px = cx - w * 0.32 + i * w * 0.16, py = by - h * 0.74; x.fillStyle = r.chance(0.5) ? '#F7D27A' : '#FBE6B0'; x.beginPath(); x.arc(px, py, 4.5, 0, TAU); x.fill(); x.fillStyle = '#2E9AB8'; x.beginPath(); x.arc(px, py, 2, 0, TAU); x.fill(); }
    x.restore();
    // püsküller
    for (const sx of [-1, 1]) {
      const px = cx + sx * w * 0.5, py = by - h * 0.62;
      P.stroke(x, px, py, px + sx * 16, py + 20, 9, '#F2C14E', 45 + sx, { detail: 0.4, taper1: 0.4 });
    }
  });
}

// ---------- ince belli çay bardağı (tabaklı) ----------
function teaGlass(key, H) {
  const W = H * 1.3, pad = 16;
  return sprite('tea:' + key, W + pad * 2, H * 1.15 + pad * 2, pad + W / 2, pad + H * 1.08, (x) => {
    const cx = pad + W / 2, by = pad + H * 1.08;
    // tabak
    P.toneShape(x, P.ellipsePts(cx, by - H * 0.05, W * 0.48, H * 0.1, 30), { base: '#FBF4EA', dark: '#B9B0D6', light: '#FFFFFF', seed: 51, shadowW: 0.25, rimW: 3, texture: 0.3, dabs: 2 });
    x.strokeStyle = '#C7362F'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(cx, by - H * 0.06, W * 0.4, H * 0.075, 0, 0, TAU); x.stroke();
    // bardak (lale biçimi)
    const g = (u, v) => [cx + u * H * 0.5, by - H * 0.1 - v * H];
    const outline = P.smoothPts([g(-0.3, 0), g(-0.42, 0.18), g(-0.24, 0.48), g(-0.36, 0.78), g(-0.4, 0.98), g(0.4, 0.98), g(0.36, 0.78), g(0.24, 0.48), g(0.42, 0.18), g(0.3, 0)], true, 6);
    // çay
    x.save(); x.clip(P.pathOf(outline));
    x.fillStyle = '#8E2414'; x.fillRect(cx - H, by - H * 0.95, H * 2, H);
    x.fillStyle = '#C94A1E'; x.fillRect(cx - H * 0.18, by - H * 0.95, H * 0.5, H);
    x.fillStyle = '#E8823A'; x.fillRect(cx + H * 0.04, by - H * 0.95, H * 0.16, H);
    x.fillStyle = rgba('#FFE0B0', 0.25); x.fillRect(cx - H, by - H * 1.12, H * 2, H * 0.2); // boş üst kısım
    P.texture(x, P.bbox(outline), Math.PI / 2, 0.35, 0.4);
    x.restore();
    // cam kenar ve parlama
    x.strokeStyle = rgba('#FFFFFF', 0.75); x.lineWidth = 2.2; x.stroke(P.pathOf(outline));
    P.stroke(x, cx - H * 0.13, by - H * 0.24, cx - H * 0.15, by - H * 0.9, H * 0.07, 'rgba(255,255,255,0.8)', 53, { detail: 0 });
    x.strokeStyle = '#E8B23A'; x.lineWidth = 2; x.beginPath(); x.moveTo(g(-0.4, 0.98)[0], g(-0.4, 0.98)[1]); x.lineTo(g(0.4, 0.98)[0], g(0.4, 0.98)[1]); x.stroke();
  });
}

// ---------- meyve tepsisi parçaları ----------
function tray(key, w) {
  const h = w * 0.36, pad = 26;
  return sprite('tray:' + key, w + pad * 2, h + pad * 2, pad + w / 2, pad + h, (x) => {
    const cx = pad + w / 2, by = pad + h;
    // sehpa ayakları (ahşap)
    for (const sx of [-0.33, 0.33]) {
      const leg = P.roundRectPts(cx + sx * w - 7, by - h * 0.62, 14, h * 0.62, 4);
      P.toneShape(x, leg, { base: '#8A5532', dark: '#4E2C18', light: '#B9804E', seed: 61, shadowW: 0.35, dabs: 1, rim: false, texture: 0.4, strokeAng: Math.PI / 2 });
    }
    P.toneShape(x, P.roundRectPts(cx - w * 0.36, by - h * 0.32, w * 0.72, 10, 4), { base: '#7A4A2E', dark: '#46261A', light: '#A8703F', seed: 62, rim: false, shadowW: 0.3, dabs: 1 });
    // bakır sini
    const ty = by - h * 0.66;
    P.toneShape(x, P.ellipsePts(cx, ty + 6, w * 0.5, h * 0.2, 40), { base: '#B8642A', dark: '#6E3418', light: '#F0A35A', seed: 63, shadowW: 0.3, lightW: 0.12, rimW: 4, texture: 0.4, dabs: 4 });
    P.toneShape(x, P.ellipsePts(cx, ty, w * 0.47, h * 0.15, 40), { base: '#D98A3E', dark: '#9A4E22', light: '#FFD08A', seed: 64, rim: false, shadowW: 0.18, lightW: 0.1, texture: 0.35, dabs: 3 });
    x.strokeStyle = rgba('#7A3A16', 0.6); x.lineWidth = 2; x.beginPath(); x.ellipse(cx, ty, w * 0.35, h * 0.1, 0, 0, TAU); x.stroke();
  });
}
function pomegranate(key, r0) {
  const pad = 14, W = r0 * 3.4, Hh = r0 * 2.6;
  return sprite('pom:' + key, W + pad * 2, Hh + pad * 2, pad + W * 0.4, pad + Hh, (x) => {
    const cx = pad + W * 0.4, by = pad + Hh;
    // bütün nar
    const c = [cx, by - r0];
    P.toneShape(x, P.blobPts(c[0], c[1], r0, r0 * 0.95, 3, 0.05, 36), { base: '#C8203A', dark: '#6E1036', light: '#F2604E', seed: 71, shadowW: 0.2, lightW: 0.14, texture: 0.4, dabs: 4, rimW: 3 });
    // taç
    const crown = [[c[0] - r0 * 0.2, c[1] - r0 * 0.9], [c[0] - r0 * 0.26, c[1] - r0 * 1.22], [c[0] - r0 * 0.08, c[1] - r0 * 1.05], [c[0], c[1] - r0 * 1.28], [c[0] + r0 * 0.08, c[1] - r0 * 1.05], [c[0] + r0 * 0.26, c[1] - r0 * 1.2], [c[0] + r0 * 0.2, c[1] - r0 * 0.9]];
    P.toneShape(x, crown, { base: '#A81A30', dark: '#5E0E2A', light: '#E0504A', seed: 72, rim: false, shadowW: 0.3, dabs: 1, texture: 0.2 });
    // yarım nar (taneler)
    const h2 = [cx + r0 * 1.35, by - r0 * 0.72];
    P.toneShape(x, P.ellipsePts(h2[0], h2[1], r0 * 0.78, r0 * 0.72, 30), { base: '#B81C34', dark: '#6E1036', light: '#E85048', seed: 73, shadowW: 0.25, texture: 0.3, dabs: 2, rimW: 3 });
    P.toneShape(x, P.ellipsePts(h2[0] - r0 * 0.06, h2[1] - r0 * 0.04, r0 * 0.62, r0 * 0.56, 30), { base: '#F3D9B8', dark: '#D7A88A', light: '#FFF4E4', seed: 74, rim: false, shadowW: 0.2, texture: 0.2, dabs: 1 });
    const r = rng(75);
    for (let i = 0; i < 26; i++) {
      const a = r.range(0, TAU), d = Math.sqrt(r.next()) * r0 * 0.5;
      const sx = h2[0] - r0 * 0.06 + Math.cos(a) * d, sy = h2[1] - r0 * 0.04 + Math.sin(a) * d * 0.9;
      x.fillStyle = r.chance(0.5) ? '#D8203E' : '#F0405A'; x.beginPath(); x.ellipse(sx, sy, r0 * 0.085, r0 * 0.1, a, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,230,230,0.8)'; x.beginPath(); x.arc(sx - r0 * 0.025, sy - r0 * 0.03, r0 * 0.025, 0, TAU); x.fill();
    }
  });
}
function grapes(key, r0) {
  const pad = 14, W = r0 * 7, Hh = r0 * 9;
  return sprite('grapes:' + key, W + pad * 2, Hh + pad * 2, pad + W / 2, pad + Hh, (x) => {
    const cx = pad + W / 2, by = pad + Hh;
    const r = rng(81);
    // sap ve yaprak
    P.curveStroke(x, [[cx, by - r0 * 7.6], [cx + r0 * 0.4, by - r0 * 8.4], [cx + r0 * 1.0, by - r0 * 8.8]], r0 * 0.3, '#6B4A24', 82, { bristles: 1 });
    R.leaf(x, cx + r0 * 0.6, by - r0 * 8.0, r0 * 3.2, -0.5, 83, { base: '#4FA34A', dark: '#1F6B3A', light: '#A6D85A', rim: true });
    // salkım: üstte geniş, altta dar (yan yatmış, tepside)
    const pts = [];
    for (let row = 0; row < 6; row++) {
      const n = 5 - Math.floor(row * 0.7), yy = by - r0 * (1 + row * 1.12);
      for (let i = 0; i < n; i++) pts.push([cx + (i - (n - 1) / 2) * r0 * 1.55 + r.range(-2, 2), yy + r.range(-2, 2)]);
    }
    pts.sort((a, b) => a[1] - b[1]);
    for (const [px, py] of pts) {
      P.toneShape(x, P.ellipsePts(px, py, r0, r0 * 1.05, 18), { base: '#7A3A8C', dark: '#3A1A52', light: '#B67AC8', rim: r.chance(0.3), rimW: 2, seed: r.int(1, 999), shadowW: 0.3, lightW: 0.15, texture: 0.25, dabs: 0, highlights: 1 });
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(px - r0 * 0.35, py - r0 * 0.4, r0 * 0.18, 0, TAU); x.fill();
    }
  });
}
function figs(key, r0) {
  const pad = 14, W = r0 * 4.6, Hh = r0 * 3;
  return sprite('figs:' + key, W + pad * 2, Hh + pad * 2, pad + W / 2, pad + Hh, (x) => {
    const cx = pad + W / 2, by = pad + Hh;
    const fig = (fx, rot, s) => {
      const pts = P.smoothPts([[0, 0], [-s * 0.95, -s * 0.5], [-s * 0.75, -s * 1.35], [-s * 0.14, -s * 2.0], [s * 0.14, -s * 2.0], [s * 0.75, -s * 1.35], [s * 0.95, -s * 0.5]], true, 6).map(([a, b]) => [fx + a * Math.cos(rot) - b * Math.sin(rot), by - 2 + a * Math.sin(rot) + b * Math.cos(rot)]);
      P.toneShape(x, pts, { base: '#6A2E62', dark: '#331838', light: '#A65A8E', seed: Math.round(fx), shadowW: 0.22, lightW: 0.14, texture: 0.35, dabs: 2, rimW: 3 });
      const tip = [fx - s * 2.05 * Math.sin(rot), by - 2 - s * 2.05 * Math.cos(rot)];
      P.stroke(x, tip[0], tip[1] + 3, tip[0] + s * 0.15, tip[1] - s * 0.3, s * 0.22, '#5E8A3A', 91, { detail: 0 });
    };
    fig(cx - r0 * 0.9, -0.25, r0);
    // açılmış incir (pembe iç)
    fig(cx + r0 * 1.0, 0.3, r0 * 0.95);
    const ic = [cx + r0 * 1.15, by - r0 * 0.95];
    P.toneShape(x, P.ellipsePts(ic[0], ic[1], r0 * 0.55, r0 * 0.7, 20, 0.3), { base: '#E8607A', dark: '#B03050', light: '#FFB0B8', rim: false, seed: 92, shadowW: 0.25, texture: 0.2, dabs: 1 });
  });
}
function sweets(key, s0) {
  const pad = 14, W = s0 * 5, Hh = s0 * 2.2;
  return sprite('sweets:' + key, W + pad * 2, Hh + pad * 2, pad + W / 2, pad + Hh, (x) => {
    const cx = pad + W / 2, by = pad + Hh;
    // küçük tabak
    P.toneShape(x, P.ellipsePts(cx, by - s0 * 0.2, W * 0.48, s0 * 0.32, 30), { base: '#FBF4EA', dark: '#B9B0D6', light: '#FFFFFF', seed: 101, shadowW: 0.25, rimW: 3, texture: 0.3, dabs: 2 });
    x.strokeStyle = '#2E86CE'; x.lineWidth = 2.5; x.beginPath(); x.ellipse(cx, by - s0 * 0.24, W * 0.4, s0 * 0.24, 0, 0, TAU); x.stroke();
    // baklava (baklava dilimi) ve lokum
    const r = rng(102);
    const bk = (px, py, s) => {
      const top = [[px - s, py - s * 0.35], [px, py - s * 0.75], [px + s, py - s * 0.35], [px, py + s * 0.05]];
      const side = [[px - s, py - s * 0.35], [px, py + s * 0.05], [px + s, py - s * 0.35], [px + s, py - s * 0.05], [px, py + s * 0.38], [px - s, py - s * 0.05]];
      P.toneShape(x, side, { base: '#C9862E', dark: '#8A4E1A', light: '#E8A84A', rim: false, seed: r.int(1, 99), shadowW: 0.3, dabs: 1, texture: 0.3 });
      P.toneShape(x, top, { base: '#F2B84A', dark: '#C98A2E', light: '#FFE08A', rim: false, seed: r.int(1, 99), shadowW: 0.2, dabs: 1, texture: 0.3 });
      for (let i = 0; i < 4; i++) { x.fillStyle = r.chance(0.5) ? '#6DAA2C' : '#9ED64A'; x.beginPath(); x.arc(px + r.range(-s * 0.3, s * 0.3), py - s * 0.38 + r.range(-s * 0.12, s * 0.12), s * 0.09, 0, TAU); x.fill(); }
    };
    const lk = (px, py, s) => {
      P.toneShape(x, P.roundRectPts(px - s * 0.5, py - s * 0.9, s, s * 0.9, s * 0.18), { base: '#F28AA8', dark: '#C0587E', light: '#FFC4D4', rim: false, seed: r.int(1, 99), shadowW: 0.28, dabs: 1, texture: 0.3 });
      x.fillStyle = 'rgba(255,255,255,0.75)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(px + r.range(-s * 0.4, s * 0.4), py - s * r.range(0.2, 0.85), r.range(1, 2.4), 0, TAU); x.fill(); }
    };
    bk(cx - s0 * 1.3, by - s0 * 0.5, s0 * 0.75);
    lk(cx + s0 * 0.25, by - s0 * 0.3, s0 * 0.7);
    bk(cx + s0 * 1.4, by - s0 * 0.45, s0 * 0.7);
    lk(cx - s0 * 0.35, by - s0 * 0.12, s0 * 0.6);
  });
}

// ---------- rüzgârda çimen öbeği (her karede, hafif) ----------
function tuft(ctx, x, y, s, seed, wind, o = {}) {
  const r = rng(seed);
  const n = o.n ?? 6;
  for (let i = 0; i < n; i++) {
    const bx = x + r.range(-s * 0.45, s * 0.45), hh = s * r.range(0.55, 1.05), lean = r.range(-0.25, 0.3) + wind * r.range(0.7, 1.2);
    const line = []; for (let k = 0; k <= 5; k++) { const u = k / 5; line.push([bx + Math.sin(lean) * hh * u * u, y - hh * u * Math.cos(lean * 0.6)]); }
    P.curveStroke(ctx, line, (u) => s * 0.085 * (1 - u * 0.85), r.chance(0.5) ? (o.c1 || '#3E9B4F') : (o.c2 || '#9ED64A'), r.int(1, 1e9), { bristles: 1, detail: 0 });
  }
}

// ---------- küçük uzak öğeler ----------
function tinyHouse(ctx, x, y, s, rot, seed) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  P.toneShape(ctx, P.rectPts(-s * 0.5, -s * 0.62, s, s * 0.62), { base: '#F6EBDD', dark: '#B9AEC9', light: '#FFFFFF', seed, rim: false, shadowW: 0.28, dabs: 0, texture: 0.25, highlights: 0 });
  P.toneShape(ctx, [[-s * 0.62, -s * 0.6], [0, -s * 1.05], [s * 0.62, -s * 0.6]], { base: '#D9583B', dark: '#8E2E3A', light: '#F2875A', seed: seed + 1, rim: false, shadowW: 0.3, dabs: 0, texture: 0.25, highlights: 0 });
  ctx.fillStyle = '#4A3A6A'; ctx.fillRect(-s * 0.12, -s * 0.34, s * 0.22, s * 0.34);
  ctx.restore();
}

module.exports = { sprite, put, dissolver, dissolvedImage, dissolveParticles, bubble, bubblePop, tallTree, hammock, cushion, teaGlass, tray, pomegranate, grapes, figs, sweets, tuft, tinyHouse };

// ---------- ön plan çiçek öbeği (çerçeveleme için büyük, kadraj kenarında) ----------
function flowerClump(key, s, o = {}) {
  const W = s * 1.3, H = s * 1.15;
  return sprite('clump:' + key, W, H, W / 2, H - 4, (x) => {
    const r = rng(o.seed ?? 5), bx = W / 2, by = H - 4;
    // çimen yaprakları
    for (let i = 0; i < 26; i++) {
      const x0 = bx + r.range(-s * 0.5, s * 0.5), hh = s * r.range(0.25, 0.6), lean = r.range(-0.5, 0.5);
      const line = []; for (let k = 0; k <= 6; k++) { const u = k / 6; line.push([x0 + Math.sin(lean) * hh * u * u, by - hh * u]); }
      P.curveStroke(x, line, (u) => s * 0.035 * (1 - u * 0.85), r.pick(['#2F8A45', '#3E9B4F', '#6DBA4C', '#1F6B45']), r.int(1, 1e9), { bristles: 1 });
    }
    const heads = [];
    const n = o.n ?? 7;
    for (let i = 0; i < n; i++) {
      const x0 = bx + r.range(-s * 0.36, s * 0.36), hh = s * r.range(0.5, 0.95), lean = r.range(-0.28, 0.28);
      const line = []; for (let k = 0; k <= 8; k++) { const u = k / 8; line.push([x0 + Math.sin(lean) * hh * u * u * 0.8, by - hh * u]); }
      P.curveStroke(x, line, s * 0.018, '#2E7A3E', r.int(1, 1e9), { bristles: 1 });
      if (r.chance(0.6)) R.leaf(x, line[3][0], line[3][1], s * 0.16, r.chance(0.5) ? -0.5 : -2.6, r.int(1, 99), { base: '#3E9B4F', dark: '#1F6B3A', light: '#9ED64A' });
      heads.push([line[8][0], line[8][1], r.chance(o.poppy ?? 0.35)]);
    }
    heads.sort((a, b) => a[1] - b[1]);
    for (const [hx, hy, poppy] of heads) {
      if (poppy) R.flower(x, hx, hy, s * 0.095, r.int(1, 99), { petals: 5, color: '#EE4A32', dark: '#A8203A', inner: '#7A1630', tilt: r.range(-0.3, 0.3) });
      else R.flower(x, hx, hy, s * 0.085, r.int(1, 99), { tilt: r.range(-0.3, 0.3) });
    }
  });
}
module.exports.flowerClump = flowerClump;
