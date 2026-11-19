// s12 için: yanardöner sabun köpüğü ve içindeki rüya bahçesi (ev, çiçekler, iki ağaç arasında hamakta çay içen
// hayali adam, köpüğün göğünde hızla dönen minik güneş) + köpüğün patlaması (damlacıklar, boya kırıntıları, parıltılar).
// Akrilik dil: zar, çemberi izleyen kıvrık düz-uçlu darbelerle (altın, gül, mor, turkuaz, nane) boyanır; renk bantları
// önbellekli tuvalde durur ve bütün olarak döner (darbeler kaynamaz). Parlama hilalleri ışığa sabit kalır.
'use strict';
const { createCanvas, Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s11_lib');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E, seg } = C;
const d = C.deg;

const R0 = 360;            // rüya tuvalinin yarıçapı (px); ekranda ~330 px'e küçültülerek basılır
const DS = 2 * R0;
const LA = -2.3;
const U = (u) => (u + 1) * R0;  // birim → tuval px
const FILM = ['#F7D766', '#F69AC4', '#A493E6', '#5FD0E2', '#A6E7A0', '#FFE9B0', '#F48FB8', '#7FB8F0'];

// ---------- sprite ----------
const _spr = new Map();
function spr(key, w, h, ax, ay, fn) {
  if (_spr.has(key)) return _spr.get(key);
  const ss = 1.25;
  const cv = createCanvas(Math.ceil(w * ss), Math.ceil(h * ss)), x = cv.getContext('2d');
  x.scale(ss, ss); x.translate(ax, ay); fn(x);
  const s = { cv, w, h, ax, ay }; _spr.set(key, s); return s;
}
function put(ctx, s, x, y, sc = 1, rot = 0, alpha = 1) {
  if (sc <= 0.001 || alpha <= 0.001) return;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sc, sc);
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(s.cv, -s.ax, -s.ay, s.w, s.h);
  ctx.restore();
}

// ---------- rüya zemini ----------
const gY = (u) => 0.27 + 0.06 * Math.cos(u * 2.4 + 0.5) + 0.03 * u;   // rüya tepesinin üst kenarı (birim)
function dreamSky() {
  return L.hcache('dsky', DS, DS, 1.3, (x) => {
    x.fillStyle = '#F2A57E'; x.fillRect(0, 0, DS, DS);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: DS, y1: DS * 0.66, w: DS, h: DS * 0.66 }, ['#5DB8E0', '#7FCBE6', '#AEDDE4', '#F8D9C0', '#FBC3B4', '#F7B6C8'],
      { seed: 2101, stops: [0, 0.25, 0.48, 0.68, 0.84, 1], wMin: 16, wMax: 30, lMin: 60, lMax: 180, mixJitter: 0.06 });
    // pastel bulutçuklar
    L.cloud2(x, U(-0.45), U(-0.48), 62, 2102, { lightAng: LA, rimW: 3 });
    L.cloud2(x, U(0.5), U(-0.62), 46, 2103, { lightAng: LA, rimW: 3 });
  });
}
function dreamLand() {
  return L.hcache('dland', DS, DS, 1.3, (x) => {
    const r = rng(2111);
    // uzak tepeler (lila-şeftali)
    const far = []; for (let i = 0; i <= 60; i++) { const u = -1 + 2 * i / 60; far.push([U(u), U(0.2 - 0.07 * Math.sin(u * 3.1 + 1.2) - 0.03 * Math.sin(u * 7))]); }
    const farPoly = far.concat([[DS, DS], [0, DS]]);
    x.save(); x.clip(P.pathOf(farPoly)); x.fillStyle = '#C9A9D8'; x.fillRect(0, 0, DS, DS);
    P.bandFill(x, null, { x0: 0, y0: U(0.08), x1: DS, y1: U(0.4), w: DS, h: U(0.4) - U(0.08) }, ['#DDBDE0', '#C6A6D6', '#B497CC'], { seed: 2112, wMin: 10, wMax: 20, lMin: 40, lMax: 140 });
    x.restore();
    // ana tepe
    const top = []; for (let i = 0; i <= 80; i++) { const u = -1 + 2 * i / 80; top.push([U(u), U(gY(u))]); }
    const poly = top.concat([[DS, DS], [0, DS]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([80, 50, 30, 70]); x.translate(0, -2); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#62C25A'; x.fillRect(0, 0, DS, DS);
    P.bandFill(x, null, { x0: 0, y0: U(0.15), x1: DS, y1: DS, w: DS, h: DS - U(0.15) }, ['#B9E66A', '#86D35A', '#5CBC58', '#3FA552', '#33914C'], { seed: 2113, wMin: 12, wMax: 24, lMin: 50, lMax: 160, stops: [0, 0.12, 0.35, 0.65, 1], angle: 0.03 });
    // evden aşağı kıvrılan patika
    const path = P.smoothPts([[U(-0.43), U(0.36)], [U(-0.36), U(0.5)], [U(-0.5), U(0.66)], [U(-0.34), U(0.84)], [U(-0.22), U(1.05)]], false, 8);
    P.curveStroke(x, path, (k) => lerp(14, 44, k), '#F4DDA8', 2114, { bristles: 4 });
    x.save(); x.globalAlpha = 0.8; P.curveStroke(x, path.map(([a, b]) => [a + 4, b + 3]), (k) => lerp(4, 10, k), '#D9B57E', 2115, { bristles: 1 }); x.restore();
    for (let i = 0; i < 26; i++) { const u = r.range(-1, 1), v = r.range(0.32, 0.95); P.stroke(x, U(u) - 18, U(v), U(u) + 18, U(v) + r.range(-3, 3), r.range(6, 10), r.chance(0.5) ? '#C8EE7A' : '#4FAE54', r.int(1, 1e9), { detail: 0.3 }); }
    x.restore();
  });
}
// ev: krem duvarlar, mercan kiremit çatı, mavi kapı, sıcak ışıklı pencereler, baca
function house() {
  const w = 0.42 * R0, hw = 0.25 * R0, hr = 0.2 * R0;
  return spr('house', w * 1.5, (hw + hr) * 1.55, w * 0.75, (hw + hr) * 1.4, (x) => {
    // baca
    P.toneShape(x, P.rectPts(w * 0.16, -hw - hr * 0.9, w * 0.11, hr * 0.7), { base: '#C9604A', dark: '#8E3A3E', light: '#E88A6A', lightAng: LA, seed: 2121, rim: false, shadowW: 0.3, dabs: 1, highlights: 0, texture: 0.3 });
    // duvar
    P.toneShape(x, P.rectPts(-w / 2, -hw, w, hw), { base: '#FBEFDC', dark: '#C7B6D6', light: '#FFFFFF', lightAng: LA, seed: 2122, shadowW: 0.14, lightW: 0.06, dabs: 4, highlights: 1, texture: 0.35, rimW: 3 });
    // çatı
    const roof = [[-w * 0.6, -hw + 2], [-w * 0.08, -hw - hr], [w * 0.08, -hw - hr], [w * 0.6, -hw + 2]];
    P.toneShape(x, roof, { base: '#E5603E', dark: '#A23A40', light: '#F7946A', lightAng: LA, seed: 2123, shadowW: 0.2, lightW: 0.1, dabs: 4, highlights: 2, texture: 0.4, rimW: 3, strokeAng: 0 });
    x.strokeStyle = rgba('#A8383C', 0.55); x.lineWidth = 2;
    for (let k = 1; k < 4; k++) { const yy = -hw - hr + hr * k / 4; const half = lerp(w * 0.08, w * 0.6, k / 4); x.beginPath(); x.moveTo(-half + 4, yy); x.lineTo(half - 4, yy); x.stroke(); }
    // kapı
    P.toneShape(x, P.roundRectPts(-w * 0.08, -hw * 0.62, w * 0.17, hw * 0.62, w * 0.06), { base: '#3E7FC8', dark: '#28518E', light: '#6AA8E6', lightAng: LA, seed: 2124, rim: false, shadowW: 0.25, dabs: 1, highlights: 1, texture: 0.3 });
    x.fillStyle = '#F2C14E'; x.beginPath(); x.arc(w * 0.05, -hw * 0.3, 2.6, 0, TAU); x.fill();
    // pencereler (sıcak ışık) + perde
    for (const sx of [-0.33, 0.27]) {
      const wx = w * sx, wy = -hw * 0.72, ww = w * 0.16, wh = hw * 0.34;
      P.toneShape(x, P.rectPts(wx - ww / 2, wy, ww, wh), { base: '#FFD878', dark: '#F2A84A', light: '#FFF2C2', lightAng: LA, seed: 2125, rim: false, shadowW: 0.2, dabs: 0, highlights: 0, texture: 0.2 });
      x.strokeStyle = '#7A5A8A'; x.lineWidth = 2.5; x.strokeRect(wx - ww / 2, wy, ww, wh);
      x.beginPath(); x.moveTo(wx, wy); x.lineTo(wx, wy + wh); x.moveTo(wx - ww / 2, wy + wh / 2); x.lineTo(wx + ww / 2, wy + wh / 2); x.stroke();
      // saksı
      x.fillStyle = '#C8603E'; x.fillRect(wx - ww * 0.55, wy + wh, ww * 1.1, 6);
      for (let k = 0; k < 3; k++) { x.fillStyle = k % 2 ? '#F07BB2' : '#F6C83B'; x.beginPath(); x.arc(wx - ww * 0.35 + k * ww * 0.35, wy + wh - 2, 4, 0, TAU); x.fill(); }
    }
    // duvar dibinde çalı
    L.toneUnion2(x, [P.ellipsePts(-w * 0.42, -6, 20, 15, 16), P.ellipsePts(-w * 0.3, -8, 16, 14, 16), P.ellipsePts(w * 0.4, -6, 22, 16, 16)], { base: '#4FAE54', dark: '#2E7A48', light: '#9ED64A', lightAng: LA, seed: 2126, rim: false, dabs: 3, highlights: 2, texture: 0.3 });
  });
}
function tree(seed, s) {
  return spr('tree' + seed, s * 1.3, s * 1.75, s * 0.65, s * 1.68, (x) => {
    R.roundTree(x, 0, 0, s, seed, { base: '#4DB458', dark: '#1F7A44', light: '#B4E46A' });
    // meyveler
    const r = rng(seed + 5);
    for (let i = 0; i < 7; i++) { const a = r.range(0, TAU), rr = r.range(0.1, 0.42) * s; const fx = Math.cos(a) * rr, fy = -s * 1.2 + Math.sin(a) * rr * 0.75; P.toneShape(x, P.ellipsePts(fx, fy, s * 0.04, s * 0.04, 12), { base: '#F2894A', dark: '#C0503A', light: '#FFC27A', lightAng: LA, seed: seed + i, rim: false, shadowW: 0.3, lightW: 0.25, dabs: 0, highlights: 1, texture: 0 }); }
  });
}
const FLOWER_COLS = [{ color: '#FFFFFF', dark: '#C9B8E6', inner: '#F6C83B' }, { color: '#F79AC2', dark: '#C8608E', inner: '#FFE07A' }, { color: '#FFD34E', dark: '#D9952A', inner: '#E8682E' }, { color: '#B9A6F2', dark: '#7E68C8', inner: '#FFE07A' }];
function flowerClump(i) {
  const s = 46;
  return spr('fc' + i, s * 3, s * 2.4, s * 1.5, s * 2.0, (x) => {
    const r = rng(2140 + i * 7);
    for (let k = 0; k < 4; k++) { const bx = r.range(-s, s); const line = []; for (let j = 0; j <= 5; j++) line.push([bx + r.range(-2, 2) * j * 0.5, -j * s * 0.22]); P.curveStroke(x, line, 3.5, '#2F8A45', r.int(1, 1e6), { bristles: 0 }); }
    R.grass(x, 0, 2, s * 0.8, 2150 + i, { n: 6, c1: '#2F8A45', c2: '#7CC84B' });
    for (let k = 0; k < 4; k++) {
      const fc = FLOWER_COLS[(i + k) % FLOWER_COLS.length];
      R.flower(x, r.range(-s * 0.9, s * 0.9), -s * r.range(0.7, 1.25), r.range(13, 18), 2160 + i * 11 + k, fc);
    }
  });
}
const FLOWERS = [[-0.62, 0.62, 42.36], [-0.22, 0.74, 42.44], [0.22, 0.66, 42.52], [0.58, 0.58, 42.6], [-0.78, 0.32, 42.4], [0.02, 0.86, 42.56], [-0.2, 0.31, 42.3]];

// ---------- hamak ----------
const HAM = { A: [0.11, 0.07], B: [0.69, 0.06], sag: 0.17 };
function hammockGeom() {
  const A = [U(HAM.A[0]), U(HAM.A[1])], B = [U(HAM.B[0]), U(HAM.B[1])], sag = HAM.sag * R0;
  const e0 = [lerp(A[0], B[0], 0.14), lerp(A[1], B[1], 0.14) + sag * 0.3], e1 = [lerp(A[0], B[0], 0.86), lerp(A[1], B[1], 0.86) + sag * 0.3];
  const piv = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
  return { A, B, sag, e0, e1, piv };
}
const HSTRIPES = [['#D9483B', 0.16], ['#2E9AB8', 0.36], ['#E8A83A', 0.52], ['#D9483B', 0.7], ['#2E9AB8', 0.88]];
function fabricSprite(front) {
  const G = hammockGeom();
  const ox = G.piv[0], oy = G.piv[1];
  return spr(front ? 'hamF' : 'hamB', 360, 240, 180, 60, (x) => {
    x.translate(-ox, -oy);
    const top = [], bot = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24, bx = lerp(G.e0[0], G.e1[0], u), by = lerp(G.e0[1], G.e1[1], u);
      const sg = Math.sin(Math.PI * u);
      top.push([bx, by + sg * G.sag * (front ? 0.84 : 0.42)]);
      bot.push([bx, by + sg * G.sag * 1.02 + 8 * sg]);
    }
    const fab = top.concat(bot.slice().reverse());
    P.toneShape(x, fab, { base: front ? '#F4E6C8' : '#E6D3B4', dark: '#B9A3C9', light: '#FFF8E8', lightAng: LA, seed: front ? 2171 : 2172, shadowW: 0.1, lightW: 0.04, coreScale: 0.97, texture: 0.4, dabs: 5, strokeAng: 0, rimW: 3 });
    x.save(); x.clip(P.pathOf(fab));
    for (const [col, v] of HSTRIPES) {
      const line = top.map((p, i) => [lerp(p[0], bot[i][0], v), lerp(p[1], bot[i][1], v)]);
      P.curveStroke(x, line, front ? 7 : 6, front ? col : shade(col, -0.08), Math.round(v * 1000) + (front ? 7 : 0), { bristles: 2 });
    }
    if (!front) { x.fillStyle = rgba('#4B3A7A', 0.25); x.fill(P.pathOf(fab)); }
    x.restore();
    if (front) for (let i = 2; i <= 22; i += 2) { const p = bot[i]; P.stroke(x, p[0], p[1] - 2, p[0] + 1, p[1] + 13, 4, i % 4 ? '#E8A83A' : '#D9483B', 2180 + i, { detail: 0, taper1: 0.4 }); }
  });
}
// çay bardağı (ince belli), el ile birlikte çizilir
function teaGlass(x, cx, by, Hh, rot) {
  x.save(); x.translate(cx, by); x.rotate(rot);
  const g = (u, v) => [u * Hh * 0.5, -v * Hh];
  const outline = P.smoothPts([g(-0.3, 0), g(-0.42, 0.18), g(-0.24, 0.48), g(-0.36, 0.78), g(-0.4, 0.98), g(0.4, 0.98), g(0.36, 0.78), g(0.24, 0.48), g(0.42, 0.18), g(0.3, 0)], true, 5);
  x.save(); x.clip(P.pathOf(outline));
  x.fillStyle = '#9A2A16'; x.fillRect(-Hh, -Hh * 0.86, Hh * 2, Hh * 0.9);
  x.fillStyle = '#D0561E'; x.fillRect(-Hh * 0.12, -Hh * 0.86, Hh * 0.22, Hh * 0.9);
  x.fillStyle = rgba('#FFF0D8', 0.35); x.fillRect(-Hh, -Hh * 1.1, Hh * 2, Hh * 0.24);
  x.restore();
  x.strokeStyle = rgba('#FFFFFF', 0.85); x.lineWidth = 1.4; x.stroke(P.pathOf(outline));
  x.strokeStyle = '#E8B23A'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(g(-0.4, 0.98)[0], g(-0.4, 0.98)[1]); x.lineTo(g(0.4, 0.98)[0], g(0.4, 0.98)[1]); x.stroke();
  x.restore();
}
function steam(x, cx, cy, t, a) {
  if (a <= 0) return;
  for (let i = 0; i < 3; i++) {
    const ph = (t * 0.7 + i / 3) % 1;
    const line = []; for (let k = 0; k <= 8; k++) { const v = k / 8; line.push([cx + Math.sin(v * 5 + t * 3 + i * 2) * 5 * v + (i - 1) * 5, cy - v * 34 - ph * 14]); }
    P.curveStroke(x, line, (v) => 3.2 * Math.sin(Math.PI * v), rgba('#FFFFFF', 0.6 * a * Math.sin(Math.PI * ph)), 2190 + i, { bristles: 0, detail: 0 });
  }
}
// hayali adam hamakta: arkaya yaslanmış, ayak bilekleri çapraz, çay bardağı yakın elde; 45.0'te yudum alır
function drawDreamMan(x, t, base, rot) {
  const sip = E.inOutSine(seg(t, 44.85, 45.2)) * (1 - E.inOutSine(seg(t, 45.5, 45.85)));
  const p = M.pose({
    rot: d(-62) + rot, torso: d(0), neck: d(-8), head: d(-10) + d(4) * sip,
    thighN: d(63), kneeN: d(95) + d(3) * Math.sin(t * 2.2), footN: d(12), thighF: d(56), kneeF: d(84) + d(3) * Math.sin(t * 2.2 + 0.6), footF: d(14),
    armN: lerp(d(0), d(48), sip), elbowN: lerp(d(60), d(138), sip), handN: lerp(d(-20), d(-28), sip),
    armF: d(-12), elbowF: d(30), eye: 0.05, brow: -0.3, mouth: 0.6, grip: 0.75,
  });
  const h = 0.54 * R0;
  const s = M.drawMan(x, p, {
    x: base[0], y: base[1], h, dir: 1, light: LA,
    front: (c, sk, hh) => {
      const A = sk.armN; const hc = [lerp(A.wrist[0], A.tip[0], 0.55), lerp(A.wrist[1], A.tip[1], 0.55)];
      // yerel çerçeve döndürülmüş (rot): bardak dik dursun diye ters döndür
      teaGlass(c, hc[0] + 3, hc[1] + 6, 0.075 * hh, -p.rot);
    },
  });
  // buhar (dünya çerçevesinde)
  const A = s.armN; const hcL = [lerp(A.wrist[0], A.tip[0], 0.55), lerp(A.wrist[1], A.tip[1], 0.55)];
  const hw = M.toWorld(hcL, { x: base[0], y: base[1], dir: 1 }, s, p);
  steam(x, hw[0] + 2, hw[1] - 0.075 * h - 4, t, 1 - sip);
  return s;
}

// ---------- minik güneş: göğü hızla dolanır ----------
function sunPhase(t) {
  const k = Math.max(0, t - 44.06);
  return 0.55 + 1.25 * k + 1.15 * Math.pow(k, 2.55);
}
function tinySun(x, t) {
  const ph = sunPhase(t);
  const cx = U(-Math.cos(ph) * 0.64), cy = U(0.26 - Math.sin(ph) * 0.64);
  R.sun(x, cx, cy, 0.075 * R0, t, { seed: 4 });
  return Math.sin(ph);
}

// ---------- rüya tuvali (her kare) ----------
let _dc = null;
const SSD = 1.3; // rüya tuvali süper örnekleme (köpük ekranda ~430 px yarıçapa kadar büyür)
function dreamCanvas() { return (_dc = _dc || createCanvas(Math.ceil(DS * SSD), Math.ceil(DS * SSD))); }
// o: { reveal (0..1 açılma), t }
function renderDream(t, reveal) {
  const cv = dreamCanvas(), x = cv.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
  x.clearRect(0, 0, cv.width, cv.height); x.setTransform(SSD, 0, 0, SSD, 0, 0);
  x.drawImage(dreamSky(), 0, 0, DS, DS);
  let el = 1;
  if (t > 44.0) el = tinySun(x, t);
  // gün-gece tonu: güneş alçaldıkça şeftali/mor
  const night = t > 44.0 ? clamp(0.25 - el * 0.9) : 0;
  if (night > 0.01) {
    x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = rgba('#7A62B8', 0.55 * night); x.fillRect(0, 0, DS, DS); x.restore();
    const r = rng(2201); for (let i = 0; i < 18; i++) { x.fillStyle = rgba('#FFF6DA', night * r.range(0.4, 0.9)); x.beginPath(); x.arc(r.range(0, DS), r.range(0, DS * 0.55), r.range(1.2, 2.6), 0, TAU); x.fill(); }
  }
  const dusk = t > 44.0 ? clamp(0.45 - Math.abs(el) * 1.4) * (el > -0.3 ? 1 : 0) : 0;
  if (dusk > 0.01) { x.save(); x.globalCompositeOperation = 'soft-light'; x.fillStyle = rgba('#FF8A4A', 0.6 * dusk); x.fillRect(0, 0, DS, DS * 0.7); x.restore(); }
  x.drawImage(dreamLand(), 0, 0, DS, DS);
  if (night > 0.01) { x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = rgba('#8A78C0', 0.35 * night); x.fillRect(0, DS * 0.3, DS, DS); x.restore(); }
  // ev
  const hb = [U(-0.43), U(gY(-0.43)) + 6];
  put(x, house(), hb[0], hb[1], C.pop(t, 41.78, 0.5, 1.8));
  // bacadan duman
  const ha = clamp((t - 42.1) / 0.4);
  if (ha > 0) for (let i = 0; i < 3; i++) { const ph = (t * 0.35 + i / 3) % 1; const cx = hb[0] + 0.42 * R0 * 0.21 + Math.sin(t * 1.5 + i) * 6 + ph * 20, cy = hb[1] - 0.45 * R0 * 0.97 - ph * 60; x.fillStyle = rgba('#FFFFFF', 0.72 * ha * Math.sin(Math.PI * ph)); x.beginPath(); x.arc(cx, cy, 8 + ph * 13, 0, TAU); x.fill(); }
  // ağaçlar
  const tA = [U(0.08), U(gY(0.08)) + 10], tB = [U(0.72), U(gY(0.72)) + 10];
  put(x, tree(2131, 0.34 * R0), tA[0], tA[1], C.pop(t, 42.12, 0.5, 1.7), Math.sin(t * 1.25) * 0.022);
  put(x, tree(2132, 0.32 * R0), tB[0], tB[1], C.pop(t, 42.24, 0.5, 1.7), Math.sin(t * 1.25 + 0.9) * 0.022);
  // hamak + hayali adam (44.05 "ve rahatla" ile)
  const kh = C.pop(t, 44.0, 0.5, 1.6);
  if (kh > 0.001) {
    const G = hammockGeom();
    const sw = d(3.2) * Math.sin((t - 44.0) * 2.2) * clamp((t - 44.2) / 0.6);
    x.save(); x.translate(G.piv[0], G.piv[1]); x.scale(kh, kh); x.translate(-G.piv[0], -G.piv[1]);
    // ipler: ağaç bağlarından dönen gergi uçlarına
    const rot = (q) => { const dx = q[0] - G.piv[0], dy = q[1] - G.piv[1]; return [G.piv[0] + dx * Math.cos(sw) - dy * Math.sin(sw), G.piv[1] + dx * Math.sin(sw) + dy * Math.cos(sw)]; };
    const e0 = rot(G.e0), e1 = rot(G.e1);
    x.lineCap = 'round';
    for (const [P0, P1] of [[G.A, e0], [G.B, e1]]) for (let i = 0; i < 3; i++) { x.strokeStyle = i % 2 ? '#C9A86E' : '#EBD39C'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(P0[0], P0[1]); x.lineTo(P1[0], P1[1] + (i - 1) * 7); x.stroke(); }
    put(x, fabricSprite(false), G.piv[0], G.piv[1], 1, sw);
    // adam: kalçası hamağın en derin noktasında
    const hip0 = [lerp(G.e0[0], G.e1[0], 0.46), lerp(G.e0[1], G.e1[1], 0.46) + G.sag * 0.62];
    const hp = rot(hip0);
    drawDreamMan(x, t, [hp[0], hp[1] + 0.5 * (0.54 * R0)], sw);
    put(x, fabricSprite(true), G.piv[0], G.piv[1], 1, sw);
    // bağ düğümleri
    for (const q of [G.A, G.B]) { x.fillStyle = '#8A5A34'; x.beginPath(); x.arc(q[0], q[1], 4.5, 0, TAU); x.fill(); }
    x.restore();
  }
  // çiçek öbekleri
  FLOWERS.forEach(([u, v, t0], i) => { const sw = Math.sin(t * 1.7 + i) * 0.04; put(x, flowerClump(i), U(u), U(v), 0.8 * C.pop(t, t0, 0.45, 2.0), sw); });
  // rüya göğünde süzülen kuşlar ve çiçeklerin üstünde kelebekler (sürekli küçük hareket)
  const ba = clamp((t - 42.2) / 0.5);
  if (ba > 0) {
    for (let i = 0; i < 3; i++) {
      const k = (t * 0.16 + i * 0.27) % 1, bx = U(-1.05 + k * 2.1), by = U(-0.5 + 0.08 * Math.sin(k * 6 + i) + i * 0.05);
      const f = Math.sin(t * 10 + i * 2) * 0.5, sz = 9 - i;
      x.strokeStyle = rgba('#5A4A8A', 0.8 * ba); x.lineWidth = 2.4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(bx - sz, by - sz * 0.45 * f - 2); x.quadraticCurveTo(bx - sz * 0.45, by - sz * 0.55 * f - 3, bx, by); x.quadraticCurveTo(bx + sz * 0.45, by - sz * 0.55 * f - 3, bx + sz, by - sz * 0.45 * f - 2); x.stroke();
    }
    for (const [u0, v0, ph, c1] of [[-0.3, 0.58, 0, '#F7A23A'], [0.35, 0.52, 2.1, '#8FC7F0']]) {
      const bx = U(u0 + 0.12 * Math.sin(t * 1.1 + ph)), by = U(v0 + 0.06 * Math.sin(t * 2.3 + ph) - 0.04);
      const fl = Math.abs(Math.sin(t * 14 + ph)) * 0.8 + 0.2;
      x.save(); x.translate(bx, by); x.globalAlpha = ba; x.fillStyle = c1;
      for (const sg of [-1, 1]) { x.beginPath(); x.ellipse(sg * 5 * fl, -3, 6 * fl, 7, sg * 0.4, 0, TAU); x.fill(); x.beginPath(); x.ellipse(sg * 4 * fl, 4, 4 * fl, 4.5, -sg * 0.3, 0, TAU); x.fill(); }
      x.fillStyle = '#3A2E4A'; x.fillRect(-1, -6, 2, 12); x.restore();
    }
  }
  // kenar: yumuşak yuvarlak maske (açılma ile genişler)
  x.globalCompositeOperation = 'destination-in';
  const r1 = R0 * lerp(0.05, 0.99, E.outCubic(reveal)), r0 = r1 * 0.86;
  const g = x.createRadialGradient(R0, R0, Math.max(0, r0 - 1), R0, R0, r1);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.75, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, DS, DS);
  x.globalCompositeOperation = 'source-over';
  return cv;
}

// ---------- yanardöner zar (önbellek) ----------
function filmCv(which) {
  const S = 2.2 * R0;
  return L.hcache('film' + which, S, S, 1.3, (x) => {
    x.translate(S / 2, S / 2);
    const r = rng(2301 + which * 13);
    const colAt = (a) => { const k = ((a / TAU) * 2.0 + 10 + which * 0.37) % 1; const i = Math.floor(k * FILM.length); return FILM[i]; };
    // iç girdaplar: büyük, soluk, kıvrık darbeler (yağ filmi akışı)
    for (let i = 0; i < 16; i++) {
      const a0 = r.range(0, TAU), len = r.range(0.7, 1.6), rr = R0 * r.range(0.45, 0.9);
      const oc = [r.range(-0.15, 0.15) * R0, r.range(-0.15, 0.15) * R0];
      const line = []; for (let k = 0; k <= 16; k++) { const a = a0 + len * k / 16; const rk = rr * (1 + 0.08 * Math.sin(k * 0.6 + i)); line.push([oc[0] + Math.cos(a) * rk, oc[1] + Math.sin(a) * rk]); }
      x.globalAlpha = r.range(0.1, 0.2); P.curveStroke(x, line, R0 * r.range(0.05, 0.11), colAt(a0), r.int(1, 1e9), { taper: true, bristles: 3 }); x.globalAlpha = 1;
    }
    // dış bant: çemberi izleyen kısa kıvrık darbeler
    for (let i = 0; i < 150; i++) {
      const a0 = r.range(0, TAU), len = r.range(0.18, 0.5), rr = R0 * r.range(0.84, 0.985);
      const line = []; for (let k = 0; k <= 10; k++) { const a = a0 + len * k / 10; line.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
      const outer = (rr / R0 - 0.84) / 0.145;
      x.globalAlpha = lerp(0.45, 0.92, outer); P.curveStroke(x, line, R0 * r.range(0.025, 0.06), colAt(a0 + len / 2 + r.range(-0.12, 0.12)), r.int(1, 1e9), { taper: true, bristles: 3 }); x.globalAlpha = 1;
    }
  });
}
// Köpük: cx,cy merkez, rad yarıçap (ekran px), t, o: { dream (tuval|null), hole: {x,y,r}, intensity }
function drawBubble(ctx, cx, cy, rad, t, o = {}) {
  if (rad < 2) return;
  const sxw = o.sx ?? 1, syw = o.sy ?? 1;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(sxw, syw);
  // patlama deliği: kırpma (köpük - delik)
  if (o.hole && o.hole.r > 0) {
    const hp = new Path2D();
    hp.rect(-rad * 2, -rad * 2, rad * 4, rad * 4);
    hp.moveTo(o.hole.x + o.hole.r, o.hole.y); hp.arc(o.hole.x, o.hole.y, o.hole.r, 0, TAU, true);
    ctx.clip(hp, 'evenodd');
  }
  const k = rad / R0;
  // dış hafif ışıma
  P.glow(ctx, 0, 0, rad * 1.3, '#FFE6F4', 0.12 * (o.alpha ?? 1));
  // içi: dünya hafifçe parlar (saydam zar), sonra rüya
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.clip();
  const ig = ctx.createRadialGradient(-rad * 0.25, -rad * 0.3, rad * 0.1, 0, 0, rad);
  ig.addColorStop(0, 'rgba(255,255,255,0.05)'); ig.addColorStop(0.75, 'rgba(225,240,255,0.12)'); ig.addColorStop(1, 'rgba(255,215,245,0.4)');
  ctx.fillStyle = ig; ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
  if (o.dream) ctx.drawImage(o.dream, -rad, -rad, rad * 2, rad * 2);
  // küresellik: kenara doğru açık leylak hale
  const eg = ctx.createRadialGradient(0, 0, rad * 0.7, 0, 0, rad);
  eg.addColorStop(0, 'rgba(240,230,255,0)'); eg.addColorStop(1, 'rgba(240,230,255,0.28)');
  ctx.fillStyle = eg; ctx.fillRect(-rad, -rad, rad * 2, rad * 2);
  ctx.restore();
  // zar renkleri: iki katman zıt yönde döner
  const S = 2.2 * R0 * k, inten = o.intensity ?? 1;
  ctx.save(); ctx.rotate(t * 0.32); ctx.globalAlpha = 0.9 * inten; ctx.drawImage(filmCv(0), -S / 2, -S / 2, S, S); ctx.restore();
  ctx.save(); ctx.rotate(-t * 0.21 + 1.3); ctx.scale(-1, 1); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = 0.45 * inten; ctx.drawImage(filmCv(1), -S / 2, -S / 2, S, S); ctx.restore();
  // astar kenarı (akrilik imza) + ince parlak çevre
  ctx.save(); ctx.strokeStyle = rgba(P.UNDERPAINT, 0.55); ctx.lineWidth = Math.max(1.5, 3.2 * k); ctx.setLineDash([rad * 0.5, rad * 0.35, rad * 0.15, rad * 0.6]); ctx.lineDashOffset = rad * 0.3;
  ctx.beginPath(); ctx.arc(1.5, 1.5, rad + 2.5 * k, 0, TAU); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = rgba('#FFFFFF', 0.6); ctx.lineWidth = Math.max(1, 2.2 * k); ctx.beginPath(); ctx.arc(0, 0, rad, 0, TAU); ctx.stroke();
  // parlamalar: pencere hilali + nokta + alt sağda ince hilal
  const arc = (a0, a1, rr, n = 14) => { const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); out.push([Math.cos(a) * rr, Math.sin(a) * rr]); } return out; };
  const ga = ctx.globalAlpha;
  ctx.globalAlpha = ga * 0.88; P.curveStroke(ctx, arc(-2.78, -1.92, rad * 0.8), (v) => rad * 0.075 * Math.pow(Math.sin(Math.PI * v), 0.6), '#FFFFFF', 2311, { bristles: 3 });
  ctx.globalAlpha = ga * 0.7; P.curveStroke(ctx, arc(-2.74, -2.35, rad * 0.66), (v) => rad * 0.035 * Math.pow(Math.sin(Math.PI * v), 0.6), '#FFFFFF', 2312, { bristles: 1 });
  ctx.globalAlpha = ga;
  ctx.fillStyle = rgba('#FFFFFF', 0.9); ctx.beginPath(); ctx.ellipse(-rad * 0.3, -rad * 0.72, rad * 0.035, rad * 0.028, -0.5, 0, TAU); ctx.fill();
  ctx.globalAlpha = ga * 0.55; P.curveStroke(ctx, arc(0.35, 1.2, rad * 0.88), (v) => rad * 0.028 * Math.pow(Math.sin(Math.PI * v), 0.6), '#FFFFFF', 2313, { bristles: 1 }); ctx.globalAlpha = ga;
  ctx.restore();
  // yırtılma kenarı: geri çekilen zar kalın, parlak, yanardöner bir sırt toplar
  if (o.hole && o.hole.r > 0) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sxw, syw);
    ctx.beginPath(); ctx.arc(0, 0, rad * 1.01, 0, TAU); ctx.clip();
    const hr = o.hole.r, hx = o.hole.x, hy = o.hole.y;
    const n = 40;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU, a1 = ((i + 1.15) / n) * TAU;
      const wob = 1 + 0.035 * Math.sin(i * 2.7);
      const line = []; for (let k = 0; k <= 4; k++) { const a = lerp(a0, a1, k / 4); line.push([hx + Math.cos(a) * hr * wob, hy + Math.sin(a) * hr * wob]); }
      ctx.globalAlpha = 0.9;
      P.curveStroke(ctx, line, Math.max(3, rad * 0.035), i % 3 ? FILM[i % FILM.length] : '#FFFFFF', 2320 + i, { bristles: 1 });
    }
    ctx.globalAlpha = 1;
    // kenarda boncuklanan damlalar
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU + Math.sin(i * 1.9) * 0.1, rr = hr * (1.0 + 0.04 * Math.sin(i * 3.3));
      const X = hx + Math.cos(a) * rr, Y = hy + Math.sin(a) * rr, sz = rad * (0.012 + 0.012 * ((i * 7) % 5) / 4);
      ctx.fillStyle = rgba(FILM[(i * 3) % FILM.length], 0.95); ctx.beginPath(); ctx.arc(X, Y, sz, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(X - sz * 0.3, Y - sz * 0.3, sz * 0.35, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
}

// ---------- patlama parçacıkları ----------
const POPP = (() => {
  const r = rng(2401); const drops = [], flecks = [], sparks = [];
  const DREAMCOLS = ['#E5603E', '#F7946A', '#4DB458', '#B4E46A', '#F79AC2', '#FFD34E', '#5DB8E0', '#FBEFDC', '#B9A6F2', '#2E9AB8'];
  for (let i = 0; i < 120; i++) { const a = r.range(0, TAU); drops.push({ a, rr: r.range(0.9, 1.04), v: r.range(280, 780), vy: r.range(-220, 40), sz: r.range(4, 11), life: r.range(0.45, 0.95), col: r.chance(0.3) ? '#FFFFFF' : r.pick(FILM) }); }
  for (let i = 0; i < 60; i++) { const a = r.range(0, TAU), rr = Math.sqrt(r.next()) * 0.85; flecks.push({ a, rr, v: r.range(170, 400), sz: r.range(16, 30), rot: r.range(0, TAU), spin: r.range(-8, 8), life: r.range(0.28, 0.55), col: r.pick(DREAMCOLS) }); }
  for (let i = 0; i < 36; i++) { sparks.push({ x: r.range(-1.3, 1.3), y: r.range(-1.25, 1.2), delay: r.range(0, 0.35), sz: r.range(10, 26), life: r.range(0.9, 1.9), drift: r.range(20, 60), col: r.pick(['#FFF6D6', '#FFFFFF', '#FFE8F4', '#E8FBFF']) }); }
  return { drops, flecks, sparks };
})();
// tp: patlama zamanı; hole0: delik başlangıcı (birim, köpük çerçevesinde); rad: patlama anındaki yarıçap
function drawPop(ctx, t, tp, cx, cy, rad, hole0) {
  const tt = t - tp; if (tt < 0 || tt > 2.0) return;
  const holeSpeed = 2.1 / 0.1; // birim/sn
  // parlama halkası
  if (tt < 0.32) { const k = tt / 0.32; P.glow(ctx, cx, cy, rad * 1.45, '#FFF4FA', 0.4 * (1 - k) * (1 - k)); }
  if (tt < 0.14) { const k = tt / 0.14; ctx.save(); ctx.strokeStyle = rgba('#FFFFFF', 0.6 * (1 - k)); ctx.lineWidth = 4 * (1 - k) + 0.5; ctx.beginPath(); ctx.arc(cx, cy, rad * (1.02 + 0.3 * E.outCubic(k)), 0, TAU); ctx.stroke(); ctx.restore(); }
  // boya kırıntıları (rüya dağılır)
  for (const f of POPP.flecks) {
    const px0 = Math.cos(f.a) * f.rr, py0 = Math.sin(f.a) * f.rr;
    const delay = Math.hypot(px0 - hole0[0], py0 - hole0[1]) / holeSpeed;
    const u = tt - delay; if (u < 0 || u > f.life) continue;
    const k = u / f.life;
    const dx = Math.cos(f.a), dy = Math.sin(f.a);
    const X = cx + px0 * rad + dx * f.v * u * (0.4 + f.rr), Y = cy + py0 * rad + dy * f.v * u * (0.4 + f.rr) + 160 * u * u;
    const sz = f.sz * (1 - k * 0.7), a = f.rot + f.spin * u;
    ctx.save(); ctx.globalAlpha = 1 - k * k;
    P.stroke(ctx, X - Math.cos(a) * sz / 2, Y - Math.sin(a) * sz / 2, X + Math.cos(a) * sz / 2, Y + Math.sin(a) * sz / 2, sz * 0.62, f.col, 2410 + (f.rot * 100 | 0), { detail: 0.5, taper0: 0.6, taper1: 0.35, dry: true });
    ctx.restore();
  }
  // damlacıklar
  for (const p of POPP.drops) {
    const px0 = Math.cos(p.a) * p.rr, py0 = Math.sin(p.a) * p.rr;
    const delay = Math.hypot(px0 - hole0[0], py0 - hole0[1]) / holeSpeed;
    const u = tt - delay; if (u < 0 || u > p.life) continue;
    const k = u / p.life;
    // delikten uzaklaşan yön + dışa
    let dx = px0 - hole0[0] * 0.4, dy = py0 - hole0[1] * 0.4; const dd = Math.hypot(dx, dy) || 1; dx /= dd; dy /= dd;
    const X = cx + px0 * rad + dx * p.v * u, Y = cy + py0 * rad + dy * p.v * u + p.vy * u + 900 * u * u;
    const sz = p.sz * (1 - 0.5 * k);
    ctx.save(); ctx.globalAlpha = 1 - k;
    if (u < 0.25) { const u0 = Math.max(0, u - 0.05); const X0 = cx + px0 * rad + dx * p.v * u0, Y0 = cy + py0 * rad + dy * p.v * u0 + p.vy * u0 + 900 * u0 * u0; ctx.strokeStyle = rgba(p.col, 0.5 * (1 - u / 0.25)); ctx.lineWidth = sz * 1.2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X, Y); ctx.stroke(); }
    ctx.fillStyle = rgba(p.col, 0.85); ctx.beginPath(); ctx.arc(X, Y, sz, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba('#FFFFFF', 0.9); ctx.beginPath(); ctx.arc(X - sz * 0.32, Y - sz * 0.32, sz * 0.32, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // parıltılar
  for (const s of POPP.sparks) {
    const u = tt - s.delay; if (u < 0 || u > s.life) continue;
    const k = u / s.life;
    const tw = Math.sin(Math.PI * k) * (0.75 + 0.25 * Math.sin(u * 22 + s.x * 9));
    R.sparkle(ctx, cx + s.x * rad, cy + s.y * rad + s.drift * u, s.sz * tw, tw, s.col);
  }
}

module.exports = { R0, renderDream, drawBubble, drawPop, FILM };
