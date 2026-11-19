// Sahnelerde ortak kullanılan nesneler (akrilik üslupta). Hepsi (ctx, x, y, ölçek, ...) alır; x,y genelde tabanın ortasıdır.
'use strict';
const { createCanvas, Path2D } = require('@napi-rs/canvas');
const C = require('./core');
const P = require('./paint');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, noise1, noise2 } = C;
const PAL = P.PAL;

// ---------- önbellek ----------
const _cache = new Map();
function cached(key, w, h, fn) {
  if (_cache.has(key)) return _cache.get(key);
  const cv = createCanvas(Math.ceil(w), Math.ceil(h)); const x = cv.getContext('2d');
  fn(x, cv); _cache.set(key, cv); return cv;
}

// ---------- gök ve zemin ----------
// Bant geçişli akrilik gök (önbellekli tuval döndürür)
function skyCanvas(key, w, h, colors, o = {}) {
  return cached('sky:' + key, w, h, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, colors, { seed: o.seed ?? 3, wMin: o.wMin ?? 20, wMax: o.wMax ?? 40, lMin: o.lMin ?? 80, lMax: o.lMax ?? 260, stops: o.stops, mixJitter: o.mixJitter });
  });
}
function bandCanvas(key, w, h, colors, o = {}) { return skyCanvas(key, w, h, colors, o); }

// Tepe / tarla: üst kenarı yumuşak dalgalı, darbelerle boyanmış (önbellekli)
function hillCanvas(key, w, h, colors, o = {}) {
  return cached('hill:' + key, w, h, (x) => {
    const r = rng(o.seed ?? 5), amp = o.amp ?? h * 0.18, fr = o.freq ?? 1.4;
    const top = [];
    for (let i = 0; i <= 60; i++) { const u = i / 60; top.push([u * w, amp * (1 - (Math.sin(u * Math.PI * fr + (o.phase ?? 0.4)) * 0.5 + 0.5)) + (noise1(u * 4, o.seed ?? 5) - 0.5) * amp * 0.5 + 8]); }
    const pts = top.concat([[w, h], [0, h]]);
    const path = P.pathOf(pts);
    // astar kenarı
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([120, 60, 40, 90]); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(path); x.fillStyle = colors[0]; x.fillRect(0, 0, w, h); x.restore();
    P.bandFill(x, path, { x0: 0, y0: 0, x1: w, y1: h, w, h }, colors, { seed: o.seed ?? 5, wMin: o.wMin ?? 18, wMax: o.wMax ?? 36, lMin: 70, lMax: 240, angle: o.angle ?? 0.04 });
    // tepe sırtında ışık darbeleri
    if (o.ridge !== false) for (let i = 0; i < 18; i++) {
      const k = r.int(2, 57), p0 = top[k], p1 = top[k + 2];
      P.stroke(x, p0[0], p0[1] + 9, p1[0], p1[1] + 9, r.range(8, 14), shade(colors[0], 0.1), r.int(1, 1e9), { detail: 0.5 });
    }
  });
}

// ---------- bulut ----------
function cloudPts(x, y, s, seed) {
  const r = rng(seed), list = [];
  const n = r.int(4, 6);
  for (let i = 0; i < n; i++) {
    const u = (i / (n - 1)) * 2 - 1;
    const rr = s * (0.32 + 0.28 * Math.cos(u * 1.2)) * r.range(0.85, 1.15);
    list.push(P.ellipsePts(x + u * s * 0.72, y - rr * 0.55 + Math.abs(u) * s * 0.12, rr, rr * 0.9, 28));
  }
  list.push(P.roundRectPts(x - s * 0.95, y - s * 0.22, s * 1.9, s * 0.38, s * 0.19));
  return list;
}
function cloud(ctx, x, y, s, seed = 1, o = {}) {
  const list = cloudPts(x, y, s, seed);
  P.toneUnion(ctx, list, { base: o.base || '#F7F4FB', dark: o.dark || '#ACA6D2', light: o.light || '#FFFFFF', seed, lightAng: o.lightAng ?? -1.9, shadowW: 0.16, lightW: 0.05, strokeAng: 0, texture: 0.4, dabs: Math.round(s / 12), rim: o.rim });
  // alt kenarda kıvrımı izleyen yay darbeleri
  const r = rng(seed + 9);
  for (let i = 0; i < 4; i++) {
    const cx = x + r.range(-0.6, 0.6) * s, cy = y + s * 0.02;
    const arc = []; for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.15 + 0.7 * k / 8); arc.push([cx + Math.cos(a) * s * 0.28, cy - Math.sin(a) * s * 0.18 - s * 0.12]); }
    P.curveStroke(ctx, arc, s * 0.05, rgba('#FFFFFF', 0.85), r.int(1, 1e9), { taper: true, bristles: 2 });
  }
}

// ---------- güneş / ay ----------
function sun(ctx, x, y, R, t = 0, o = {}) {
  P.glow(ctx, x, y, R * 3.2, o.glow || '#FFE9A0', 0.35);
  const r = rng(o.seed ?? 4);
  // halka: sarı darbeler
  // halka: üst üste binen uzun yay darbeleri (kesintisiz, kalın sarı halka)
  const ring = o.ring || '#F6D23A';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + r.range(-0.08, 0.08) + t * 0.05;
    const a2 = a + r.range(0.62, 0.85);
    const rr = R * r.range(1.0, 1.08);
    const arc = []; for (let k = 0; k <= 10; k++) { const aa = lerp(a, a2, k / 10); arc.push([x + Math.cos(aa) * rr, y + Math.sin(aa) * rr]); }
    P.curveStroke(ctx, arc, (u) => R * 0.2 * (0.75 + 0.25 * Math.sin(Math.PI * u)), r.chance(0.5) ? ring : shade(ring, r.range(-0.04, 0.07)), r.int(1, 1e9), { bristles: 3 });
  }
  // disk: krem, kıvrık darbeler
  P.toneShape(ctx, P.ellipsePts(x, y, R * 0.9, R * 0.9, 40), { base: o.disk || '#FFF3C4', dark: '#F6DE8A', light: '#FFFCEB', rim: false, shadowW: 0.08, lightW: 0.05, texture: 0.3, dabs: 0, highlights: 0, seed: 3 });
  // diskte yalnız kenarı izleyen iki uzun yay (kısa düz darbeler harfe benzeyebiliyor)
  P.glow(ctx, x - R * 0.25, y - R * 0.28, R * 0.7, '#FFFFF4', 0.35);
  for (const [a0, rr, w] of [[-2.75, 0.72, 0.1], [-2.55, 0.52, 0.07]]) {
    const arc = []; for (let k = 0; k <= 12; k++) { const aa = a0 + k * 0.11; arc.push([x + Math.cos(aa) * R * rr, y + Math.sin(aa) * R * rr]); }
    P.curveStroke(ctx, arc, R * w, rgba('#FFFDF2', 0.7), r.int(1, 1e9), { taper: true, bristles: 2 });
  }
}
function moon(ctx, x, y, R, o = {}) {
  P.glow(ctx, x, y, R * 4, '#CFE0FF', 0.28);
  P.toneShape(ctx, P.ellipsePts(x, y, R, R, 40), { base: '#F3EED8', dark: '#C9C2B0', light: '#FFFFF4', rim: false, lightAng: -0.6, shadowW: 0.1, lightW: 0.04, texture: 0.35, seed: 8 });
  // hilal için gölge diski
  if (o.crescent) { ctx.save(); ctx.fillStyle = o.sky || PAL.night; ctx.beginPath(); ctx.arc(x + R * 0.45, y - R * 0.2, R * 0.92, 0, TAU); ctx.fill(); ctx.restore(); }
}
function stars(ctx, w, h, n, seed, t = 0, o = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r.range(0, w), y = r.range(0, h * (o.maxY ?? 1)), s = r.range(1.2, 3.6);
    const tw = 0.6 + 0.4 * Math.sin(t * r.range(1, 3) + i);
    ctx.fillStyle = rgba(r.chance(0.2) ? '#FFE7B0' : '#F4F2FF', tw * r.range(0.5, 1));
    ctx.beginPath(); ctx.arc(x, y, s, 0, TAU); ctx.fill();
    if (s > 3) { ctx.fillRect(x - s * 2.5, y - 0.6, s * 5, 1.2); ctx.fillRect(x - 0.6, y - s * 2.5, 1.2, s * 5); }
  }
}

// ---------- bitkiler ----------
function cypress(ctx, x, y, h, seed = 1, o = {}) {
  const r = rng(seed), w = h * (o.wr ?? 0.2);
  const ctrl = [[x, y - h], [x + w * 0.32, y - h * 0.8], [x + w * 0.5, y - h * 0.45], [x + w * 0.42, y - h * 0.12], [x + w * 0.12, y], [x - w * 0.12, y], [x - w * 0.42, y - h * 0.12], [x - w * 0.5, y - h * 0.45], [x - w * 0.3, y - h * 0.82]];
  const pts = P.smoothPts(ctrl, true, 8);
  P.toneShape(ctx, pts, { base: o.base || '#1F6B45', dark: o.dark || '#0D3D2C', light: o.light || '#4FA35A', lightAng: o.lightAng ?? -2.4, seed, strokeAng: -Math.PI / 2, shadowW: 0.16, lightW: 0.1, coreScale: 0.88, dabs: Math.round(h / 22), texAng: Math.PI / 2 });
  // dikey yaprak darbeleri
  for (let i = 0; i < Math.round(h / 26); i++) {
    const yy = y - h * r.range(0.08, 0.9), half = w * 0.45 * Math.sin(Math.PI * clamp((y - yy) / h + 0.05)) ** 0.8;
    const xx = x + r.range(-half, half);
    P.stroke(ctx, xx, yy + h * 0.05, xx + r.range(-3, 3), yy - h * 0.05, w * r.range(0.1, 0.18), r.chance(0.5) ? (o.light || '#3E8F52') : (o.dark || '#0F4632'), r.int(1, 1e9), { detail: 0.4, taper1: 0.4 });
  }
}
function roundTree(ctx, x, y, s, seed = 1, o = {}) {
  const r = rng(seed);
  // gövde
  const trunk = P.smoothPts([[x - s * 0.07, y], [x - s * 0.05, y - s * 0.6], [x - s * 0.02, y - s * 0.9], [x + s * 0.03, y - s * 0.9], [x + s * 0.06, y - s * 0.6], [x + s * 0.08, y]], true, 5);
  P.toneShape(ctx, trunk, { base: o.trunk || '#7A4A2E', dark: '#4A2A1C', light: '#A06A40', seed, shadowW: 0.25, texture: 0.4, strokeAng: Math.PI / 2, dabs: 3 });
  const list = [];
  const n = o.lobes ?? 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, rr = s * r.range(0.32, 0.42);
    list.push(P.blobPts(x + Math.cos(a) * s * 0.36, y - s * 1.2 + Math.sin(a) * s * 0.3, rr, rr * 0.9, seed + i, 0.12, 28));
  }
  list.push(P.blobPts(x, y - s * 1.22, s * 0.48, s * 0.42, seed + 50, 0.1, 30));
  P.toneUnion(ctx, list, { base: o.base || '#3E9B4F', dark: o.dark || '#17573A', light: o.light || '#9ED64A', seed, shadowW: 0.16, lightW: 0.07, strokeAng: -0.6, dabs: Math.round(s / 8) });
  return list;
}
// çiçek (beyaz/pembe kozmos benzeri): open 0..1 açılma, wilt 0..1 solma
function flower(ctx, x, y, s, seed = 1, o = {}) {
  const r = rng(seed);
  const open = clamp(o.open ?? 1), wilt = clamp(o.wilt ?? 0);
  const petals = o.petals ?? 7;
  const pc = mix(o.color || '#FBF6FF', '#C9A27A', wilt * 0.75);
  const pd = mix(o.dark || '#B8A9DA', '#8A6A4A', wilt * 0.7);
  const rot0 = r.range(0, TAU) + (o.rot ?? 0);
  ctx.save(); ctx.translate(x, y); ctx.rotate((o.tilt ?? 0) + wilt * 0.5);
  for (let i = 0; i < petals; i++) {
    const a = rot0 + (i / petals) * TAU;
    const droop = wilt * 0.9 * Math.max(0, Math.sin(a));
    const len = s * open * (1 - wilt * 0.35) * r.range(0.85, 1.05);
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len * (1 - 0.25) + droop * s * 0.6;
    const pts = P.brushPts(0, 0, ex, ey, s * 0.55 * open * (1 - wilt * 0.4), seed * 31 + i, { taper0: 0.35, taper1: 1, wob: 0.1 });
    ctx.fillStyle = pc; ctx.fill(P.pathOf(pts));
    // gölge kenarında ince leylak darbe
    P.stroke(ctx, ex * 0.25, ey * 0.25 + s * 0.04, ex * 0.9, ey * 0.9 + s * 0.06, s * 0.14 * open, pd, seed * 7 + i, { detail: 0.3, taper1: 0.5 });
    // dipte pembe darbe
    P.stroke(ctx, 0, 0, ex * 0.35, ey * 0.35, s * 0.16 * open, o.inner || '#F07BB2', seed * 13 + i, { detail: 0, taper1: 0.5 });
  }
  if (open > 0.05) {
    P.toneShape(ctx, P.ellipsePts(0, 0, s * 0.2 * (0.6 + 0.4 * open), s * 0.2 * (0.6 + 0.4 * open), 18), { base: mix('#F6C83B', '#9C6B2A', wilt), dark: '#D08A1E', light: '#FFE98A', rim: false, shadowW: 0.25, texture: 0.3, dabs: 2, highlights: 1, seed });
  }
  ctx.restore();
}
function leaf(ctx, x, y, len, ang, seed = 1, o = {}) {
  const r = rng(seed);
  const w = len * (o.wr ?? 0.38);
  const ca = Math.cos(ang), sa = Math.sin(ang);
  const L = (u, v) => [x + ca * u * len - sa * v * w, y + sa * u * len + ca * v * w];
  const pts = P.smoothPts([L(0, 0), L(0.3, -0.5), L(0.7, -0.42), L(1, 0), L(0.7, 0.42), L(0.3, 0.5)], true, 6);
  P.toneShape(ctx, pts, { base: o.base || '#2E9A4A', dark: o.dark || '#13563A', light: o.light || '#8FD14F', seed, lightAng: o.lightAng ?? -2.3, shadowW: 0.2, lightW: 0.12, dabs: 2, highlights: 1, rim: o.rim ?? false, texAng: ang });
  ctx.strokeStyle = rgba(o.vein || '#0F4A30', 0.7); ctx.lineWidth = Math.max(1, len * 0.03);
  ctx.beginPath(); const a = L(0.08, 0), b = L(0.9, 0.02); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
}
function grass(ctx, x, y, s, seed = 1, o = {}) {
  const r = rng(seed);
  for (let i = 0; i < (o.n ?? 7); i++) {
    const bx = x + r.range(-s * 0.4, s * 0.4), hh = s * r.range(0.6, 1.1), lean = r.range(-0.35, 0.35) + (o.wind ?? 0);
    const line = []; for (let k = 0; k <= 6; k++) { const u = k / 6; line.push([bx + Math.sin(lean) * hh * u * u, y - hh * u]); }
    P.curveStroke(ctx, line, (u) => s * 0.09 * (1 - u * 0.85), r.chance(0.5) ? (o.c1 || '#3E9B4F') : (o.c2 || '#8CC84B'), r.int(1, 1e9), { bristles: 1 });
  }
}

// ---------- kum saati ----------
// top: üst haznedeki kum oranı 0..1; flow: akan ince kum (0..1 görünürlük)
function hourglass(ctx, x, y, s, top = 0.6, t = 0, o = {}) {
  const r = rng(o.seed ?? 3);
  const H = s, Wd = s * 0.62;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.glow) P.glow(ctx, 0, -H * 0.5, H * 0.9, '#FFD27A', 0.35 * o.glow);
  // cam
  const bulb = (sgn) => P.smoothPts([[0, -H * 0.5], [Wd * 0.36 * 0.35, -H * 0.5 - sgn * H * 0.08], [Wd * 0.42, -H * 0.5 - sgn * H * 0.3], [Wd * 0.38, -H * 0.5 - sgn * H * 0.42], [-Wd * 0.38, -H * 0.5 - sgn * H * 0.42], [-Wd * 0.42, -H * 0.5 - sgn * H * 0.3], [-Wd * 0.36 * 0.35, -H * 0.5 - sgn * H * 0.08]], true, 8);
  const up = bulb(1), dn = bulb(-1);
  for (const g of [up, dn]) { ctx.fillStyle = rgba('#D8F0F6', 0.22); ctx.fill(P.pathOf(g)); }
  // kum
  const sand = o.sand || '#E8B23A', sandD = '#B77F1E', sandL = '#FFE08A';
  const neck = -H * 0.5;
  ctx.save(); ctx.clip(P.pathOf(up));
  const topLevel = neck - H * 0.06 - top * H * 0.32;
  if (top > 0.01) {
    const surf = []; for (let k = 0; k <= 10; k++) { const u = k / 10 * 2 - 1; surf.push([u * Wd * 0.5, topLevel + Math.abs(u) * -H * 0.03 + H * 0.02 * (1 - Math.abs(u))]); }
    const pts = surf.concat([[Wd * 0.5, neck + 4], [-Wd * 0.5, neck + 4]]);
    P.toneShape(ctx, pts, { base: sand, dark: sandD, light: sandL, rim: false, shadowW: 0.2, texture: 0.35, dabs: 3, seed: 2 });
  }
  ctx.restore();
  ctx.save(); ctx.clip(P.pathOf(dn));
  const bot = 1 - top, base = -H * 0.08;
  if (bot > 0.01) {
    const peak = base - bot * H * 0.36;
    const pts = [[-Wd * 0.5, base + 4], [-Wd * 0.5, base - bot * H * 0.12], [0, peak], [Wd * 0.5, base - bot * H * 0.12], [Wd * 0.5, base + 4]];
    P.toneShape(ctx, P.smoothPts(pts, true, 6), { base: sand, dark: sandD, light: sandL, rim: false, shadowW: 0.22, texture: 0.35, dabs: 3, seed: 5 });
  }
  ctx.restore();
  // akan kum
  const flow = o.flow ?? (top > 0.01 ? 1 : 0);
  if (flow > 0) {
    ctx.strokeStyle = rgba(sand, flow); ctx.lineWidth = Math.max(1.5, s * 0.012);
    ctx.beginPath(); ctx.moveTo(0, neck - 2); ctx.lineTo(0, base - (bot) * H * 0.36 + 2); ctx.stroke();
    for (let i = 0; i < 6; i++) { const yy = lerp(neck, base - bot * H * 0.3, ((t * 2.2 + i / 6) % 1)); ctx.fillStyle = rgba(sandL, 0.9 * flow); ctx.fillRect(-1.5, yy, 3, 3); }
  }
  // cam parlaması
  for (const [g, sg] of [[up, 1], [dn, -1]]) {
    ctx.save(); ctx.clip(P.pathOf(g));
    P.stroke(ctx, -Wd * 0.26, -H * 0.5 - sg * H * 0.36, -Wd * 0.3, -H * 0.5 - sg * H * 0.12, s * 0.035, 'rgba(255,255,255,0.75)', 3, { detail: 0 });
    ctx.restore();
    ctx.strokeStyle = rgba('#FFFFFF', 0.55); ctx.lineWidth = Math.max(1.2, s * 0.008); ctx.stroke(P.pathOf(g));
  }
  // ahşap çerçeve
  const wood = o.wood || '#8A5532';
  const plate = (yy) => P.toneShape(ctx, P.roundRectPts(-Wd * 0.58, yy - H * 0.045, Wd * 1.16, H * 0.09, H * 0.02), { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 6, shadowW: 0.25, texture: 0.5, dabs: 3, rim: o.rim });
  plate(-H * 0.96); plate(-H * 0.04);
  for (const sx of [-1, 1]) {
    const post = P.roundRectPts(sx * Wd * 0.5 - H * 0.022, -H * 0.94, H * 0.044, H * 0.88, H * 0.02);
    P.toneShape(ctx, post, { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 7 + sx, shadowW: 0.35, texture: 0.4, dabs: 2, rim: false, strokeAng: Math.PI / 2 });
  }
  ctx.restore();
}

// ---------- taç ----------
function crown(ctx, x, y, s, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.glow) P.glow(ctx, 0, -s * 0.3, s * 1.4, '#FFD98A', 0.4 * o.glow);
  const w = s, h = s * 0.62;
  const ctrl = [[-w * 0.5, 0], [-w * 0.55, -h * 0.75], [-w * 0.28, -h * 0.42], [0, -h * 1.0], [w * 0.28, -h * 0.42], [w * 0.55, -h * 0.75], [w * 0.5, 0]];
  const pts = []; // köşeli taç
  for (let i = 0; i < ctrl.length; i++) pts.push(ctrl[i]);
  P.toneShape(ctx, pts, { base: PAL.gold, dark: PAL.goldDeep, light: PAL.goldLight, seed: 4, shadowW: 0.16, lightW: 0.12, dabs: 4, rim: o.rim });
  P.toneShape(ctx, P.roundRectPts(-w * 0.53, -h * 0.12, w * 1.06, h * 0.26, h * 0.06), { base: '#D99A2B', dark: PAL.goldDeep, light: PAL.goldLight, seed: 5, shadowW: 0.3, dabs: 2, rim: false });
  // taşlar
  const gem = (gx, gy, rr, c) => P.toneShape(ctx, P.ellipsePts(gx, gy, rr, rr, 16), { base: c, dark: shade(c, -0.2), light: shade(c, 0.25), rim: false, shadowW: 0.3, lightW: 0.25, texture: 0.2, dabs: 0, highlights: 1, seed: 9 });
  gem(0, -h * 0.01, s * 0.06, '#C8203A'); gem(-w * 0.3, -h * 0.01, s * 0.045, '#2E86CE'); gem(w * 0.3, -h * 0.01, s * 0.045, '#2EAD56');
  for (const [px, py] of [[-w * 0.55, -h * 0.75], [0, -h * 1.0], [w * 0.55, -h * 0.75]]) gem(px, py, s * 0.05, '#FFF1C2');
  ctx.restore();
}

// ---------- fener (Osmanlı pirinç fener) ----------
function lantern(ctx, x, y, s, lit = 1, t = 0, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  const fl = lit * (0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 7.3));
  if (lit > 0) { P.glow(ctx, 0, -s * 0.5, s * 2.6, '#FFB84D', 0.5 * fl); P.glow(ctx, 0, -s * 0.5, s * 0.9, '#FFE9A8', 0.55 * fl); }
  const brass = '#C98B2E', brassD = '#7A4E17', brassL = '#F2C66A';
  // halka ve kubbe
  ctx.strokeStyle = brassD; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.arc(0, -s * 1.12, s * 0.1, 0, TAU); ctx.stroke();
  P.toneShape(ctx, P.smoothPts([[0, -s * 1.05], [s * 0.2, -s * 0.95], [s * 0.34, -s * 0.82], [-s * 0.34, -s * 0.82], [-s * 0.2, -s * 0.95]], true, 6), { base: brass, dark: brassD, light: brassL, seed: 2, rim: false, dabs: 2 });
  // cam gövde
  const body = P.smoothPts([[-s * 0.3, -s * 0.8], [s * 0.3, -s * 0.8], [s * 0.36, -s * 0.45], [s * 0.3, -s * 0.15], [-s * 0.3, -s * 0.15], [-s * 0.36, -s * 0.45]], true, 6);
  ctx.fillStyle = lit > 0 ? mix('#5A3A22', '#FFD27A', fl) : '#3A2E3A'; ctx.fill(P.pathOf(body));
  if (lit > 0) { P.glow(ctx, 0, -s * 0.47, s * 0.32, '#FFFFFF', 0.8 * fl); }
  // çubuklar
  ctx.strokeStyle = brassD; ctx.lineWidth = s * 0.035;
  for (const u of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(u * s, -s * 0.8); ctx.lineTo(u * s * 1.15, -s * 0.47); ctx.lineTo(u * s, -s * 0.15); ctx.stroke(); }
  // taban
  P.toneShape(ctx, P.roundRectPts(-s * 0.38, -s * 0.18, s * 0.76, s * 0.16, s * 0.05), { base: brass, dark: brassD, light: brassL, seed: 3, rim: false, dabs: 1 });
  ctx.restore();
}

// ---------- mezar taşı ----------
function tombstone(ctx, x, y, s, o = {}) {
  const w = s * 0.42, h = s;
  const pts = P.smoothPts([[-w / 2, 0], [-w / 2, -h * 0.78], [-w * 0.35, -h * 0.94], [0, -h], [w * 0.35, -h * 0.94], [w / 2, -h * 0.78], [w / 2, 0]], false, 6).concat([[w / 2, 0]]);
  const sh = P.translatePts(pts, x, y);
  P.toneShape(ctx, sh, { base: o.base || '#E9E4D8', dark: o.dark || '#A39CB8', light: '#FFFFF6', seed: o.seed ?? 4, shadowW: 0.18, lightW: 0.1, strokeAng: Math.PI / 2, dabs: 5, rim: o.rim });
  // basit oyma çizgi
  ctx.strokeStyle = rgba('#8E87A6', 0.7); ctx.lineWidth = Math.max(1.5, s * 0.012);
  ctx.beginPath(); ctx.moveTo(x - w * 0.28, y - h * 0.62); ctx.lineTo(x + w * 0.28, y - h * 0.62); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - w * 0.2, y - h * 0.5); ctx.lineTo(x + w * 0.2, y - h * 0.5); ctx.stroke();
}

// ---------- ebedî bahçe kapısı (uzakta ışıyan) ----------
function gardenGate(ctx, x, y, s, glow = 1, t = 0, o = {}) {
  if (glow > 0) { P.glow(ctx, x, y - s * 0.55, s * 2.2, '#FFE6A6', 0.55 * glow); P.glow(ctx, x, y - s * 0.5, s * 0.8, '#FFFFFF', 0.5 * glow); }
  const w = s * 0.7, h = s;
  // ışıyan iç
  const inner = P.smoothPts([[-w * 0.32, 0], [-w * 0.32, -h * 0.6], [-w * 0.2, -h * 0.82], [0, -h * 0.9], [w * 0.2, -h * 0.82], [w * 0.32, -h * 0.6], [w * 0.32, 0]], false, 6).concat([[w * 0.32, 0]]);
  ctx.fillStyle = mix('#F6E2B0', '#FFFDF0', glow); ctx.fill(P.pathOf(P.translatePts(inner, x, y)));
  // kemer duvarı (iki ayak + kemer)
  const outer = P.smoothPts([[-w / 2, 0], [-w / 2, -h * 0.66], [-w * 0.32, -h * 0.98], [0, -h * 1.1], [w * 0.32, -h * 0.98], [w / 2, -h * 0.66], [w / 2, 0]], false, 6).concat([[w / 2, 0]]);
  const ring = P.multiPath([P.translatePts(outer, x, y), P.translatePts(inner, x, y)]);
  ctx.save(); ctx.fillStyle = o.stone || '#F1E6D2'; ctx.fill(ring, 'evenodd');
  ctx.clip(ring, 'evenodd');
  P.texture(ctx, P.bbox(P.translatePts(outer, x, y)), Math.PI / 2, 0.45, 0.5);
  ctx.fillStyle = rgba('#C8A9C9', 0.5); ctx.fillRect(x + w * 0.2, y - h * 1.2, w * 0.35, h * 1.2);
  ctx.restore();
  // ince altın kenar
  ctx.strokeStyle = rgba(PAL.gold, 0.85); ctx.lineWidth = Math.max(1.5, s * 0.015); ctx.stroke(P.pathOf(P.translatePts(inner, x, y), false));
  // ışık hüzmeleri
  if (glow > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.22 + Math.sin(t * 0.6 + i) * 0.03;
      ctx.fillStyle = rgba('#FFE9B5', 0.09 * glow);
      ctx.beginPath(); ctx.moveTo(x, y - h * 0.45); ctx.lineTo(x + Math.cos(a - 0.06) * s * 3, y - h * 0.45 + Math.sin(a - 0.06) * s * 3); ctx.lineTo(x + Math.cos(a + 0.06) * s * 3, y - h * 0.45 + Math.sin(a + 0.06) * s * 3); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- küçük parıltılar ----------
function sparkle(ctx, x, y, s, a = 1, color = '#FFF6D6') {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s); ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s); ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
  ctx.fill(); ctx.restore();
}
function sparkles(ctx, x, y, R, n, t, seed = 1, o = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const ph = r.range(0, 1), sp = r.range(0.6, 1.4);
    const k = (t * sp + ph) % 1;
    const a = Math.sin(k * Math.PI);
    sparkle(ctx, x + r.range(-R, R), y + r.range(-R, R) - k * (o.rise ?? 20), r.range(6, 16) * (o.scale ?? 1) * a, a * (o.alpha ?? 1), o.color);
  }
}

// ---------- altın sikke ----------
function coin(ctx, x, y, r, o = {}) {
  const sq = o.squash ?? 1; // dönme için yatay basıklık
  P.toneShape(ctx, P.ellipsePts(x, y, r * Math.max(0.08, Math.abs(sq)), r, 24), { base: PAL.gold, dark: PAL.goldDeep, light: PAL.goldLight, rim: false, shadowW: 0.2, lightW: 0.18, texture: 0.25, dabs: 1, highlights: 1, seed: o.seed ?? 2 });
  if (Math.abs(sq) > 0.3) { ctx.strokeStyle = rgba('#9A6512', 0.7); ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.ellipse(x, y, r * 0.68 * Math.abs(sq), r * 0.68, 0, 0, TAU); ctx.stroke(); }
}

// Kamera: kare merkezine göre yakınlaş/kaydır/döndür
function camera(ctx, o = {}) {
  const { W, H } = C;
  const z = o.zoom ?? 1, cx = o.cx ?? W / 2, cy = o.cy ?? H / 2;
  ctx.translate(W / 2, H / 2);
  if (o.rot) ctx.rotate(o.rot);
  ctx.scale(z, z);
  ctx.translate(-cx, -cy);
}
// kamera sarsıntısı (çok hafif el kamerası nefesi)
function breathe(t, amp = 4, seed = 1) { return [(noise1(t * 0.35, seed) - 0.5) * amp * 2, (noise1(t * 0.35, seed + 9) - 0.5) * amp * 2]; }

module.exports = {
  cached, skyCanvas, bandCanvas, hillCanvas, cloud, cloudPts, sun, moon, stars, cypress, roundTree, flower, leaf, grass,
  hourglass, crown, lantern, tombstone, gardenGate, sparkle, sparkles, coin, camera, breathe,
};
