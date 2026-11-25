// Arayüz grubu: içindekiler madalyonları (Perde 1), kâğıt pano, duyu madalyonları (Perde 4) ve
// kare başına çalışan fırçalı arayüz işaretleri (UI.ring / dots / chevron / line / ripple / glow / sparkle).
// Üslup: S-042 Akrilik — basamaklı düz ton katları, keskin kenarlı fırça darbeleri, kırık astar kenarı.
// Işık sol üstten. Sprite'lar "nominal" birimde tasarlanır (madalyon 300, duyu 220) ve k kat çözünürlükle boyanır;
// drawSpr(ctx, spr('ikon-nar'), x, y, MED_PX / 300) ekranda MED_PX çaplı madalyon verir.
'use strict';

const ARAYUZ = (() => {
  const TAU = Math.PI * 2;
  const U = Paint.UNDER;
  const LGT = Paint.L;
  const circ = (x, y, r) => ellipsePath(x, y, r, r);
  const poly = (pts, closed = true) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); if (closed) p.closePath(); return p; };
  const moved = (p, dx, dy) => { const q = new Path2D(); q.addPath(p, new DOMMatrix().translate(dx, dy)); return q; };
  const annulus = (x, y, r0, r1) => { const p = new Path2D(); p.arc(x, y, r1, 0, TAU, false); p.moveTo(x + r0, y); p.arc(x, y, r0, 0, TAU, true); p.closePath(); return p; };
  const bbC = (x, y, r) => [x - r - 2, y - r - 2, x + r + 2, y + r + 2];

  // ---------------------------------------------------------------- nominal koordinatlı boyama sarmalayıcısı
  function mk(wN, hN, k, seed) {
    const S = Paint.sprite(Math.round(wN * k), Math.round(hN * k), { seed, k });
    const M = new DOMMatrix([k, 0, 0, k, 0, 0]);
    const T = (p) => { const q = new Path2D(); q.addPath(p, M); return q; };
    const sc = (f) => (typeof f === 'function' ? (x, y) => f(x / k, y / k) : f);
    const A = { S, k, r: S.r, T, wN, hN };
    A.region = (p, o) => {
      const o2 = Object.assign({}, o);
      if (o.shade) o2.shade = sc(o.shade);
      if (typeof o.dir === 'function') o2.dir = sc(o.dir);
      if (o.bbox) o2.bbox = o.bbox.map((v) => v * k);
      S.region(T(p), o2); return A;
    };
    // düz ton katı (+ kabartma yüksekliği). o.rule: 'evenodd' ile hilal/halka
    A.fill = (p, col, o = {}) => {
      const q = T(p); const x = S.x; const rule = o.rule || 'nonzero';
      x.save(); if (o.clip) x.clip(T(o.clip)); x.globalAlpha = o.alpha ?? 1; x.fillStyle = col; x.fill(q, rule); x.restore();
      if (o.h !== false) {
        const hx = S.hx; const g = o.h ?? 140;
        hx.save(); if (o.clip) hx.clip(T(o.clip)); hx.globalAlpha = o.hA ?? 0.85; hx.fillStyle = `rgb(${g},${g},${g})`; hx.fill(q, rule);
        if (o.ridge !== false) { hx.globalAlpha = 0.55; hx.strokeStyle = `rgb(${g + 55},${g + 55},${g + 55})`; hx.lineWidth = 1.1 * k; hx.stroke(q); }
        hx.restore();
      }
      return A;
    };
    A.rim = (p, o = {}) => { S.rim(T(p), o); return A; };
    A.dab = (x, y, a, l, w, col, o) => { S.dab(x * k, y * k, a, l, w, col, o || {}); return A; };
    A.line = (pts, w0, col, o = {}) => { S.line(pts.map((q) => [q[0] * k, q[1] * k]), w0 * k, col, Object.assign({}, o, { w1: (o.w1 ?? w0) * k })); return A; };
    // ince kıl izleri (düz katların üstüne boya dokusu)
    A.streaks = (p, bb, ang, col, n, o = {}) => {
      const x = S.x, r = S.r; x.save(); x.clip(T(p));
      for (let i = 0; i < n; i++) {
        const a = (typeof ang === 'function' ? 0 : ang) + (r() - 0.5) * (o.jit ?? 0.15);
        const px = lerp(bb[0], bb[2], r()), py = lerp(bb[1], bb[3], r());
        const aa = typeof ang === 'function' ? ang(px, py) : a;
        const ca = Math.cos(aa), sa = Math.sin(aa); const L = lerp(o.l0 ?? 8, o.l1 ?? 24, r());
        x.globalAlpha = (o.a ?? 0.2) * (0.45 + r() * 0.8); x.strokeStyle = shade(col, r() < (o.lightP ?? 0.5) ? (o.dl ?? 0.07) : -(o.dl ?? 0.07)); x.lineWidth = (0.35 + r() * (o.lw ?? 0.8)) * k;
        x.beginPath(); x.moveTo((px - (ca * L) / 2) * k, (py - (sa * L) / 2) * k); x.lineTo((px + (ca * L) / 2) * k, (py + (sa * L) / 2 + (r() - 0.5) * 0.8) * k); x.stroke();
      }
      x.restore(); return A;
    };
    A.done = (emboss, px, py) => ({ canvas: S.finish({ emboss }), px: px * k, py: py * k, k });
    return A;
  }

  // basamaklı küre (üzüm tanesi, nar tanesi, buğday danesi): koyu taban, sol üste kayan açık katlar, yansıma hilali
  function bead(A, x, y, rx, ry, rot, R, o = {}) {
    const p0 = ellipsePath(x, y, rx, ry, rot);
    if (o.rim) A.rim(p0, { w: o.rim, alpha: 0.9 });
    const n = R.length;
    A.fill(p0, R[o.base ?? 1], { h: 150 });
    if (o.refl) A.fill(union2(p0, ellipsePath(x - rx * 0.14, y - ry * 0.16, rx, ry, rot)), o.refl, { rule: 'evenodd', clip: p0, alpha: 0.85, h: false });
    const L1 = ellipsePath(x - rx * 0.14, y - ry * 0.18, rx * 0.74, ry * 0.72, rot);
    A.fill(L1, R[(o.base ?? 1) + 1], { clip: p0, h: 158 });
    const L2 = ellipsePath(x - rx * 0.3, y - ry * 0.34, rx * 0.42, ry * 0.4, rot);
    A.fill(L2, R[Math.min(n - 2, (o.base ?? 1) + 2)], { clip: p0, h: 166 });
    if (o.hl !== false) {
      const hr = Math.min(rx, ry);
      A.fill(ellipsePath(x - rx * 0.4, y - ry * 0.46, hr * 0.2, hr * 0.13, -0.7), o.hlCol ?? R[n - 1], { h: 180 });
    }
    if (o.tex !== false) A.streaks(p0, [x - rx, y - ry, x + rx, y + ry], o.texAng ?? (rot + 0.6), R[(o.base ?? 1) + 1], o.texN ?? 5, { l0: rx * 0.5, l1: rx * 1.4, a: 0.25, lw: 0.6 });
  }
  function union2(a, b) { const p = new Path2D(); p.addPath(a); p.addPath(b); return p; }

  // yumuşak kıllı tek darbe (nominal birim): açık yüzeylerde kıl izleri ince ve seyrek kalır
  function stroke(A, x, y, ang, len, wid, col, o = {}) {
    const S = A.S, k = A.k, r = A.r, ctx = S.x, hx = S.hx;
    const L = len * k, Wd = wid * k; const shape = Paint.strokeShape(L, Wd, r); const al = o.alpha ?? 1;
    ctx.save(); ctx.translate(x * k, y * k); ctx.rotate(ang);
    ctx.globalAlpha = al; ctx.fillStyle = col; ctx.fill(shape);
    const n = Math.max(2, Math.round(wid / 3.2)); const bA = o.bristle ?? 1;
    for (let i = 0; i < n; i++) {
      const yy = -Wd / 2 + ((i + 0.5) * Wd) / n + (r() - 0.5) * 0.8 * k; const lt = r() < 0.55;
      ctx.globalAlpha = al * (0.05 + r() * 0.1) * bA;
      ctx.strokeStyle = shade(col, lt ? 0.05 + r() * 0.03 : -0.035 - r() * 0.03);
      ctx.lineWidth = (0.45 + r() * 0.8) * k;
      const xa = -L / 2 + r() * L * 0.3, xb = L / 2 - r() * L * 0.3 + (r() < 0.15 ? Wd * 0.4 : 0);
      ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xb, yy + (r() - 0.5) * k); ctx.stroke();
    }
    ctx.restore();
    if (o.height !== false) {
      hx.save(); hx.translate(x * k, y * k); hx.rotate(ang); const g = 124 + Math.floor(r() * 26);
      hx.globalAlpha = 0.9 * al; hx.fillStyle = `rgb(${g},${g},${g})`; hx.fill(shape);
      hx.globalAlpha = (o.ridge ?? 0.5) * al; hx.strokeStyle = `rgb(${g + 62},${g + 62},${g + 62})`; hx.lineWidth = 1.05 * k; hx.stroke(shape); hx.restore();
    }
  }
  // darbe alanı (nominal): merkezler clip yolunun ve mask'ın içinde; ton ya tek renk ya ramp+shade basamağı
  function field(A, o) {
    const r = A.r, k = A.k; const bb = o.bbox; const [l0, l1] = o.len, [w0, w1] = o.wid;
    const area = (bb[2] - bb[0]) * (bb[3] - bb[1]); const meanS = (((l0 + l1) / 2) * (w0 + w1)) / 2;
    const count = Math.min(o.max ?? 4000, Math.round((area / meanS) * (o.cover ?? 2)));
    const clipT = o.clip ? A.T(o.clip) : null; const test = A.S.x; const list = [];
    const steps = o.ramp ? o.ramp.length : 1; const jit = o.jitter ?? 0, fq = o.jitterFreq ?? 0.02, nz = o.noise ?? 0;
    for (let i = 0; i < count; i++) {
      const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
      if (clipT && !test.isPointInPath(clipT, x * k, y * k)) continue;
      if (o.mask && !o.mask(x, y)) continue;
      let ki = 0;
      if (o.ramp) {
        const v = o.shade(x + (NOISE(x * fq + 3, y * fq) - 0.5) * jit * 2, y + (NOISE(x * fq, y * fq + 9) - 0.5) * jit * 2) + (r() - 0.5) * nz * 2;
        ki = clamp(Math.floor(v * steps), 0, steps - 1);
        if (r() < (o.broken ?? 0)) ki = clamp(ki + r.sign(), 0, steps - 1);
      }
      list.push([x, y, ki]);
    }
    if (o.ramp) list.sort((a, b) => a[2] - b[2]);
    const cl = clipT && o.clipStrokes !== false;
    if (cl) { A.S.x.save(); A.S.hx.save(); A.S.x.clip(clipT); A.S.hx.clip(clipT); }
    const dirf = typeof o.dir === 'function' ? o.dir : () => (o.dir ?? 0) + (r() - 0.5) * (o.dirJit ?? 0.25);
    for (const [x, y, ki] of list) {
      const base = o.ramp ? o.ramp[ki] : o.color;
      const col = shade(base, (r() - 0.5) * (o.lJit ?? 0.03), 1 + (r() - 0.5) * 0.08, (r() - 0.5) * (o.hJit ?? 4));
      stroke(A, x, y, dirf(x, y), lerp(l0, l1, r()), lerp(w0, w1, r()), col, { bristle: o.bristle, alpha: o.alpha, ridge: o.ridge });
    }
    if (cl) { A.S.x.restore(); A.S.hx.restore(); }
    return list.length;
  }

  // badem yaprak: (x,y) merkez, ang uzun eksen, iki tonlu (ışık alan yarı açık), orta damar
  function leaf(A, x, y, ang, len, wid, R, o = {}) {
    const l = len / 2, w = wid / 2; const r = A.r; const b = (r() - 0.5) * w * 0.4;
    const loc = new Path2D();
    loc.moveTo(-l, 0);
    loc.bezierCurveTo(-l * 0.5, -w * 1.25 + b, l * 0.4, -w * 1.1 + b, l, b * 0.3);
    loc.bezierCurveTo(l * 0.4, w * 1.1 + b, -l * 0.5, w * 1.25 + b, -l, 0);
    loc.closePath();
    const m = new DOMMatrix().translate(x, y).rotate((ang * 180) / Math.PI);
    const p = new Path2D(); p.addPath(loc, m);
    const half = new Path2D(); half.addPath(rectPath(-l - 2, -w * 1.4, len + 4, w * 1.4 + b * 0.3), m);
    // hangi yarı ışığa bakar?
    const nx = -Math.sin(ang), ny = Math.cos(ang); // +y yarısının normali
    const upLit = nx * LGT[0] + ny * LGT[1] < 0; // -y yarısı ışıkta mı
    const litHalf = upLit ? half : (() => { const q = new Path2D(); q.addPath(rectPath(-l - 2, b * 0.3, len + 4, w * 1.4), m); return q; })();
    if (o.rim !== false) A.rim(p, { w: o.rimW ?? 1.5, alpha: 0.9 });
    A.fill(p, R[o.dark ?? 1], { h: 140 });
    A.fill(litHalf, R[(o.dark ?? 1) + 2], { clip: p, h: 150 });
    // kenara yakın açık basamak
    const edge = new Path2D(); edge.addPath(loc, new DOMMatrix().translate(x, y).rotate((ang * 180) / Math.PI).translate(-l * 0.06, upLit ? w * 0.35 : -w * 0.35).scale(0.86, 0.6));
    A.fill(edge, R[(o.dark ?? 1) + 1], { clip: litHalf, alpha: 0.9, h: 146 });
    A.streaks(p, [x - l, y - l, x + l, y + l], ang, R[(o.dark ?? 1) + 2], o.texN ?? 10, { l0: len * 0.2, l1: len * 0.5, a: 0.22, jit: 0.25 });
    if (o.vein !== false) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      A.line([[x - ca * l * 0.92, y - sa * l * 0.92], [x + ca * l * 0.1 + nx * b * 0.15, y + sa * l * 0.1 + ny * b * 0.15], [x + ca * l * 0.75, y + sa * l * 0.75]], Math.max(1, wid * 0.07), o.veinCol ?? R[R.length - 1], { w1: 0.5, edge: false });
    }
    return p;
  }

  // ---------------------------------------------------------------- paletler (koyu → açık)
  const GOLD = ['#744610', '#9C6418', '#C48C28', '#DDAA3C', '#F0C95A', '#FAE39A', '#FFF5D2'];
  const CREAM = ['#DFC39C', '#E9D2B0', '#F1DFC2', '#F6E7CF', '#FAEFDC', '#FDF6EA'];
  const NAR = ['#4E0B1E', '#7C1229', '#A81B31', '#CF2E3A', '#EC5A4E', '#F89880'];
  const ARIL = ['#5A0820', '#8E1030', '#C21E40', '#E8506A', '#FF9AAA', '#FFE4E8'];
  const LEAF = ['#08402E', '#0E5E3C', '#1A7E45', '#2EA052', '#62BE57', '#A7DE7C', '#DDF3A8'];
  const WHEAT = ['#6A380A', '#93541A', '#BC7820', '#DC9E2E', '#EFC24E', '#FADF8A', '#FFF4CC'];
  const VIOLET = ['#1E1442', '#33215F', '#4D3384', '#6C4EA8', '#957ACB', '#CDBCEB', '#F4EEFF'];
  const WATER = ['#0F3480', '#1A51A6', '#2672C2', '#3A93D8', '#6CB8E8', '#A9DDF6', '#E6F8FF'];
  const PINK = ['#86104E', '#B5206C', '#DC4690', '#F07BB2', '#F8A2C9', '#FCCDE2', '#FFF0F7'];
  const SUN = ['#B5560E', '#DB7A16', '#F2A024', '#FBC544', '#FFE07E', '#FFF4C2'];
  const HONEY = ['#6E2E04', '#9A4808', '#C96A0E', '#E8901C', '#F6B83E', '#FCDB7C', '#FFF2C6'];
  const WAX = ['#9A6A14', '#C6901E', '#E4B232', '#F4D05A', '#FCE68E', '#FFF6CC'];
  const CLOTH = ['#14306E', '#1A4D99', '#2468B8', '#2E86CE', '#5AA6DE', '#9CCBEE', '#DDF0FF'];
  const RIBBON = ['#6A1410', '#9A2216', '#C6381E', '#E2582E', '#F3845A', '#FBB898'];
  const STEM = ['#3E2414', '#5E3A1E', '#80552C', '#A2763E', '#C49C5E'];

  // ---------------------------------------------------------------- madalyon gövdesi (300 nominal)
  const MC = 150, RO = 142, RI = 128; // merkez, altın halka dış/iç yarıçap
  function medFace(A) {
    A.rim(circ(MC, MC, RO + 0.5), { w: 2.4, alpha: 0.95 });
    const face = circ(MC, MC, RI + 2); const bb = bbC(MC, MC, RI + 2);
    A.fill(face, CREAM[2], { h: 136 });
    const big = { len: [36, 66], wid: [13, 20], dir: -0.62, dirJit: 0.3, bristle: 0.6, lJit: 0.02, clip: face, bbox: bb, ridge: 0.12 };
    field(A, Object.assign({}, big, { color: CREAM[2], cover: 1.5 }));
    field(A, Object.assign({}, big, { color: CREAM[1], cover: 2.2, mask: (x, y) => Math.hypot(x - (MC - 34), y - (MC - 40)) > 138 }));
    field(A, Object.assign({}, big, { color: CREAM[3], cover: 2.4, mask: (x, y) => Math.hypot(x - (MC - 36), y - (MC - 44)) < 104 }));
    field(A, Object.assign({}, big, { len: [26, 50], color: CREAM[4], cover: 2.4, mask: (x, y) => Math.hypot(x - (MC - 56), y - (MC - 64)) < 58 }));
    // çerçevenin sol üstte yüzeye düşürdüğü gölge (iki basamak) ve sağ altta açık kenar
    const inner = circ(MC, MC, RI + 1);
    A.fill(union2(inner, circ(MC + 7, MC + 9, RI + 1)), CREAM[1], { rule: 'evenodd', clip: inner, h: 132 });
    A.fill(union2(inner, circ(MC + 3, MC + 4, RI + 1)), CREAM[0], { rule: 'evenodd', clip: inner, h: 126 });
    A.fill(union2(inner, circ(MC - 3, MC - 4, RI + 1)), CREAM[5], { rule: 'evenodd', clip: inner, alpha: 0.9, h: 150 });
    return inner;
  }
  function medRing(A) {
    const ring = annulus(MC, MC, RI, RO);
    const RM = (RI + RO) / 2, HW = (RO - RI) / 2;
    // simit gölgesi: dış yarı sol üstte, iç yarı sağ altta aydınlık
    const torus = (x, y) => {
      const dx = x - MC, dy = y - MC; const rr = Math.hypot(dx, dy) || 1; const u = clamp((rr - RM) / HW, -1, 1);
      const nx = (dx / rr) * u * 0.95, ny = (dy / rr) * u * 0.95, nz = Math.sqrt(Math.max(0, 1 - u * u * 0.9));
      const v = (nx * LGT[0] + ny * LGT[1] + nz * 0.55) / Math.hypot(LGT[0], LGT[1], 0.55);
      return clamp(0.08 + 0.92 * (v * 0.5 + 0.5));
    };
    A.region(ring, { ramp: GOLD.slice(0, 6), shade: torus, dir: (x, y) => Math.atan2(y - MC, x - MC) + Math.PI / 2 + (A.r() - 0.5) * 0.12, len: [12, 26], wid: [3.6, 5.6], cover: 3.4, jitter: 1.5, jitterFreq: 0.05, noise: 0.03, broken: 0.03, rim: { w: 1.5, alpha: 0.9 }, bbox: bbC(MC, MC, RO), dry: 0.1 });
    // ince oluk (yüz ile halka arası)
    const groove = []; for (let i = 0; i <= 72; i++) { const a = (i / 72) * TAU; groove.push([MC + Math.cos(a) * (RI + 0.6), MC + Math.sin(a) * (RI + 0.6)]); }
    A.S.x.save(); A.S.x.strokeStyle = GOLD[0]; A.S.x.globalAlpha = 0.6; A.S.x.lineWidth = 1.4 * A.k; A.S.x.stroke(A.T(poly(groove))); A.S.x.restore();
    // metal parıltıları: sol üst dış yarıda uzun, sağ alt iç yarıda kısa
    for (let i = 0; i < 5; i++) { const a = -2.62 + i * 0.15 + (A.r() - 0.5) * 0.05; const rr = RM + HW * 0.36; A.dab(MC + Math.cos(a) * rr, MC + Math.sin(a) * rr, a + Math.PI / 2, 13 + A.r() * 6, 2.8, GOLD[6]); }
    A.dab(MC + Math.cos(-2.3) * (RM + 2.5), MC + Math.sin(-2.3) * (RM + 2.5), -2.3 + Math.PI / 2, 7, 3, '#FFFFFF');
    for (let i = 0; i < 3; i++) { const a = 0.62 + i * 0.16; const rr = RM - HW * 0.36; A.dab(MC + Math.cos(a) * rr, MC + Math.sin(a) * rr, a + Math.PI / 2, 9, 2.2, GOLD[5]); }
  }
  // nesnenin yüzeye düşen gölgesi (sağ alta): yolları geçici katmanda birleştir, tek alfa ile bas
  function castShadow(A, paths, dx, dy, col, alpha, clip) {
    const S = A.S; const c = makeCanvas(S.w, S.h); const x = c.getContext('2d');
    x.translate(dx * A.k, dy * A.k); x.fillStyle = col; for (const p of paths) x.fill(A.T(p));
    S.x.save(); if (clip) S.x.clip(A.T(clip)); S.x.globalAlpha = alpha; S.x.drawImage(c, 0, 0); S.x.restore();
  }
  function medal(seed, item) {
    const k = 1.5; const A = mk(300, 300, k, seed);
    // zemine düşen düz gölge hilali (sağ alt)
    A.fill(union2(circ(MC + 4, MC + 6, RO), circ(MC, MC, RO)), '#1E1638', { rule: 'evenodd', alpha: 0.24, h: false });
    const face = medFace(A);
    item(A, face);
    medRing(A);
    return A.done(0.55, MC, MC);
  }
  const SH = '#CDAA7C';

  // ---------------------------------------------------------------- 1) nar
  function icNar(A, face) {
    const cx = 144, cy = 160, R = 68;
    const body = smoothPath(blobPts(cx, cy, R, R * 0.93, 26, 0.028, 5));
    const tx = cx + 3, ty = cy - R * 0.9;
    const arilPos = [[200, 226, 10, 0.4], [217, 208, 9, -0.3], [182, 240, 8.5, 0.9]];
    castShadow(A, [body, ...arilPos.map(([x, y, r]) => circ(x, y, r))], 8, 10, SH, 0.75, face);
    // dal ve yapraklar (arkada, sağ üstte)
    A.line([[150, 108], [178, 92], [208, 80]], 3.4, STEM[2], { w1: 2.2, edge: false, rim: { w: 0.9 } });
    leaf(A, 218, 100, 0.55, 54, 22, LEAF, { texN: 8 });
    leaf(A, 198, 64, -0.75, 56, 22, LEAF, { texN: 8 });
    // basamaklı küre: düz katlar koyudan açığa, darbeler taçtan inen meridyenler boyunca
    const sf = Paint.sphere(cx - 12, cy - 14, R * 1.06, LGT, 0.1);
    const nst = { clip: body, bbox: bbC(cx, cy, R + 2), dir: (x, y) => Math.atan2(y - (ty - 26), x - tx) + (A.r() - 0.5) * 0.22, len: [20, 36], wid: [8, 13], ridge: 0.35, bristle: 0.9, lJit: 0.025 };
    A.rim(body, { w: 1.9 });
    A.fill(body, NAR[3], { h: 140 });
    field(A, Object.assign({}, nst, { color: NAR[3], cover: 1.6 }));
    field(A, Object.assign({}, nst, { color: NAR[2], cover: 2.6, mask: (x, y) => sf(x, y) < 0.46 }));
    field(A, Object.assign({}, nst, { color: NAR[1], cover: 2.6, len: [14, 26], mask: (x, y) => sf(x, y) < 0.28 }));
    field(A, Object.assign({}, nst, { color: NAR[4], cover: 2.6, mask: (x, y) => sf(x, y) > 0.7 }));
    field(A, Object.assign({}, nst, { color: NAR[5], cover: 2.6, len: [12, 22], wid: [6, 10], mask: (x, y) => sf(x, y) > 0.87 }));
    // yansıyan ılık ışık (sağ alt kenar)
    A.fill(union2(body, moved(body, -5, -6)), '#B8303A', { rule: 'evenodd', clip: body, alpha: 0.8, h: 146 });
    // ışık lekesi
    for (let i = 0; i < 5; i++) { const a = -2.45 + i * 0.16 + (A.r() - 0.5) * 0.06; const rr = R * (0.6 + A.r() * 0.1); A.dab(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2, 13 + A.r() * 8, 4.4 + A.r() * 2, shade(NAR[4], 0.1, 0.8, 8)); }
    A.dab(cx - 32, cy - 35, -0.85, 16, 7, '#F9B9A6');
    A.dab(cx - 29, cy - 40, -0.7, 7.5, 3.2, '#FFF1EA');
    // taç
    const cw = 20, chh = 23; const crown = new Path2D();
    crown.moveTo(tx - cw, ty + 9);
    const nS = 5;
    for (let i = 0; i < nS; i++) {
      const t0 = i / nS, t1 = (i + 1) / nS, tm = (t0 + t1) / 2; const out = (tm - 0.5) * 2;
      const xm = tx - cw + tm * 2 * cw;
      crown.quadraticCurveTo(xm - 4 + out * 3, ty - 2, xm + out * (6 + A.r() * 2), ty - chh + Math.abs(out) * 6 - A.r() * 2);
      crown.quadraticCurveTo(xm + 3 + out * 3, ty - 3, tx - cw + t1 * 2 * cw, ty + 1);
    }
    crown.lineTo(tx + cw, ty + 9); crown.quadraticCurveTo(tx, ty + 15, tx - cw, ty + 9); crown.closePath();
    A.region(crown, { ramp: ['#4A0E1C', '#741A2A', '#9E2A34', '#C24A44', '#E07A62'], shade: Paint.grad(tx - 22, ty - 20, tx + 24, ty + 12, 0.95, 0.1), dir: -Math.PI / 2, dirJit: 0.4, len: [8, 14], wid: [3.5, 5.5], cover: 3.4, rim: { w: 1.4 }, bbox: [tx - cw - 10, ty - chh - 6, tx + cw + 10, ty + 16] });
    A.fill(ellipsePath(tx, ty + 2, 12.5, 3.8), '#300814', { h: 120 });
    for (let i = 0; i < 4; i++) A.dab(tx - 6 + i * 4, ty + 1, -Math.PI / 2 + (i - 1.5) * 0.25, 5, 1.6, '#E8B86A');
    // taneler (önde, parlak)
    for (const [x, y, r, rot] of arilPos) {
      const sp = smoothPath([0, 1, 2, 3, 4, 5].map((i) => { const a = rot + (i / 6) * TAU; const rr = r * (i % 2 ? 0.9 : 1.06); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9]; }), true, 0.35);
      A.rim(sp, { w: 1.3 });
      A.fill(sp, ARIL[1], { h: 150 });
      A.fill(ellipsePath(x - r * 0.15, y - r * 0.15, r * 0.74, r * 0.7, rot), ARIL[2], { clip: sp, h: 156 });
      A.fill(ellipsePath(x + r * 0.2, y + r * 0.28, r * 0.42, r * 0.3, rot), ARIL[3], { clip: sp, alpha: 0.85, h: 156 }); // içten gelen ışık
      A.fill(ellipsePath(x - r * 0.36, y - r * 0.42, r * 0.26, r * 0.16, -0.7), ARIL[5], { h: 175 });
    }
  }

  // ---------------------------------------------------------------- 2) buğday demeti
  function icBugday(A, face) {
    const kx = 150, ky = 192; // bağ noktası
    const angs = [-2.17, -1.87, -1.57, -1.27, -0.97];
    const dists = [50, 60, 66, 60, 50];
    const ears = angs.map((a, i) => ({ a, bx: kx + Math.cos(a) * dists[i], by: ky + Math.sin(a) * dists[i], L: 62 - Math.abs(i - 2) * 3 }));
    // saplar: başaklardan bağa, bağdan yelpaze gibi açılan kesik uçlara
    const stalks = [];
    for (let i = 0; i < 9; i++) {
      const u = i / 8 - 0.5; const e = ears[Math.round((u + 0.5) * 4)];
      const bot = [kx + u * 84 + (A.r() - 0.5) * 4, 254 - Math.abs(u) * 12 + (A.r() - 0.5) * 4];
      stalks.push([bot, [kx + u * 10, ky], [e.bx, e.by]]);
    }
    const shadowPaths = [];
    for (const s of stalks) shadowPaths.push(poly([[s[0][0] - 2.6, s[0][1]], [s[1][0] - 2.6, s[1][1]], [s[2][0] - 2.6, s[2][1]], [s[2][0] + 2.6, s[2][1]], [s[1][0] + 2.6, s[1][1]], [s[0][0] + 2.6, s[0][1]]]));
    for (const e of ears) shadowPaths.push(ellipsePath(e.bx + Math.cos(e.a) * e.L * 0.5, e.by + Math.sin(e.a) * e.L * 0.5, e.L * 0.56, 13, e.a));
    castShadow(A, shadowPaths, 7, 9, SH, 0.75, face);
    // kılçıklar (en arkada)
    for (const e of ears) {
      const ca = Math.cos(e.a), sa = Math.sin(e.a), nx = -sa, ny = ca;
      for (let j = 2; j < 8; j++) {
        const t = j / 8; const px = e.bx + ca * e.L * t, py = e.by + sa * e.L * t;
        for (const sd of [-1, 1]) {
          const aw = e.a + sd * (0.3 - t * 0.12); const al = 20 + t * 10;
          const sx = px + nx * sd * 5, sy = py + ny * sd * 5;
          A.line([[sx, sy], [sx + Math.cos(aw) * al, sy + Math.sin(aw) * al]], 1.5, WHEAT[3], { w1: 0.6, edge: false });
        }
      }
      A.line([[e.bx + ca * e.L * 0.9, e.by + sa * e.L * 0.9], [e.bx + ca * (e.L + 24), e.by + sa * (e.L + 24)]], 1.5, WHEAT[3], { w1: 0.6, edge: false });
    }
    // saplar
    stalks.forEach((s, i) => A.line(s, 4.4, WHEAT[[2, 3, 1, 4, 2, 3, 1, 3, 2][i]], { w1: 3.6, rim: i % 3 === 0 ? { w: 1.2 } : false }));
    // başaklar: iki sıra daneler, uca doğru küçülür
    for (const e of ears) {
      const ca = Math.cos(e.a), sa = Math.sin(e.a), nx = -sa, ny = ca;
      const lit = nx * LGT[0] + ny * LGT[1] > 0 ? 1 : -1; // hangi sıra ışıkta
      A.rim(ellipsePath(e.bx + ca * e.L * 0.5, e.by + sa * e.L * 0.5, e.L * 0.54, 11, e.a), { w: 1.4, alpha: 0.85 });
      const n = 7;
      for (let j = 0; j < n; j++) {
        const t = 0.08 + (j / (n - 1)) * 0.82; const s = 1 - t * 0.36;
        for (const sd of [-1, 1]) {
          const tt = t + (sd > 0 ? 0.05 : 0);
          const px = e.bx + ca * e.L * tt + nx * sd * 5.2 * s, py = e.by + sa * e.L * tt + ny * sd * 5.2 * s;
          bead(A, px, py, 9 * s, 5.6 * s, e.a + sd * 0.42, WHEAT, { base: sd === lit ? 2 : 1, texN: 2 });
        }
      }
      bead(A, e.bx + ca * e.L * 0.98, e.by + sa * e.L * 0.98, 6.6, 4, e.a, WHEAT, { base: 2, texN: 2 });
    }
    // bağ: kırmızı kurdele
    const band = new Path2D();
    band.moveTo(kx - 22, ky - 9); band.quadraticCurveTo(kx, ky - 3, kx + 22, ky - 9);
    band.lineTo(kx + 23, ky + 5); band.quadraticCurveTo(kx, ky + 11, kx - 23, ky + 5); band.closePath();
    A.region(band, { ramp: RIBBON, shade: Paint.cylY(ky, 12, LGT, 0.15), dir: 0, dirJit: 0.15, len: [8, 16], wid: [3, 5], cover: 3.4, rim: { w: 1.3 }, bbox: [kx - 26, ky - 14, kx + 26, ky + 14] });
    A.line([[kx + 6, ky + 4], [kx + 15, ky + 19], [kx + 13, ky + 32]], 5.4, RIBBON[2], { w1: 3.4, rim: { w: 1 } });
    A.line([[kx + 2, ky + 4], [kx - 7, ky + 19], [kx - 5, ky + 30]], 5.4, RIBBON[3], { w1: 3.4, rim: { w: 1 } });
    A.fill(ellipsePath(kx + 4, ky + 1, 7, 6, 0.3), RIBBON[3], { h: 160 }); A.fill(ellipsePath(kx + 2.5, ky - 0.5, 3.6, 2.7, 0.3), RIBBON[5], { h: 170 });
    A.dab(kx - 11, ky - 4, 0.12, 10, 2.6, RIBBON[5]);
  }

  // ---------------------------------------------------------------- 3) üzüm salkımı
  function vineLeafPath(x, y, R, ang, seed) {
    const r = rng(seed); const pts = [];
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * TAU;
      const lobe = 0.6 + 0.4 * Math.pow(Math.abs(Math.cos(a * 2.5)), 2.0);
      const notch = 1 - 0.55 * Math.exp(-Math.pow((a - Math.PI) / 0.32, 2));
      const serr = 1 + (i % 2 ? 0.04 : -0.025);
      const rr = R * lobe * notch * serr * (1 + (r() - 0.5) * 0.04);
      pts.push([x + Math.cos(a + ang) * rr, y + Math.sin(a + ang) * rr]);
    }
    return smoothPath(pts);
  }
  function icUzum(A, face) {
    const berries = [];
    const rows = [[114, [102, 130, 158, 186]], [138, [115, 143, 171, 198]], [162, [104, 130, 158, 185]], [186, [118, 146, 174]], [209, [132, 160]], [231, [146]]];
    const rr = rng(91);
    rows.forEach(([y, xs], j) => xs.forEach((x) => berries.push([x + (rr() - 0.5) * 4 + j * 2, y + (rr() - 0.5) * 4, 15 + rr() * 2.2, j + rr() * 0.6])));
    castShadow(A, berries.map(([x, y, r]) => circ(x, y, r)), 8, 10, SH, 0.75, face);
    // yaprak (arkada, sol üst) ve sap
    const lx = 102, ly = 80, lR = 40;
    const lp = vineLeafPath(lx, ly, lR, -2.5, 4);
    A.rim(lp, { w: 1.6 });
    A.region(lp, { ramp: LEAF.slice(1, 6), shade: Paint.sphere(lx - 14, ly - 18, 60, LGT, 0.15), dir: (x, y) => Math.atan2(y - (ly + 22), x - (lx + 26)) + (A.r() - 0.5) * 0.4, len: [12, 22], wid: [5, 8], cover: 2.8, rim: false, noise: 0.04, bbox: [lx - 46, ly - 46, lx + 46, ly + 46] });
    for (let i = 0; i < 5; i++) { const a = -2.5 + Math.PI + (i - 2) * 0.95; const L = i === 2 ? 34 : 26; A.line([[lx + 20, ly + 18], [lx + 20 + Math.cos(a) * L, ly + 18 + Math.sin(a) * L]], 1.7, LEAF[5], { w1: 0.6, edge: false }); }
    A.line([[150, 104], [155, 82], [168, 62]], 5.4, STEM[2], { w1: 3.8, rim: { w: 1.1 } });
    A.line([[155, 86], [140, 96], [124, 98]], 2.8, STEM[3], { w1: 1.8, edge: false });
    // sülük (kıvrık)
    const tend = []; for (let i = 0; i <= 40; i++) { const t = i / 40; const a = t * TAU * 1.6; const rad = 11 * (1 - t * 0.75); tend.push([174 + t * 26 + Math.cos(a) * rad, 68 - t * 4 + Math.sin(a) * rad]); }
    A.line([[165, 68], ...tend], 2.1, LEAF[4], { w1: 0.9, edge: false });
    // taneler: üstten alta (alttakiler önde)
    berries.sort((a, b) => a[3] - b[3]);
    berries.forEach(([x, y, r], i) => bead(A, x, y, r, r, 0, i % 4 === 1 ? VIOLET.map((c) => shade(c, 0, 1, -10)) : VIOLET, { base: 1, rim: i % 3 === 0 ? 1.2 : 0, refl: '#7D6AB8', texN: 4, texAng: 0.9 }));
  }

  // ---------------------------------------------------------------- 4) su damlası ve küçük ırmak dalgası
  function icSu(A, face) {
    // su: madalyonun alt kesiti, üst üste dalgalı bantlar (açık → koyu)
    const bands = [
      { y: 196, a: 4.6, f: 0.07, ph: 1.1, col: WATER[4] },
      { y: 214, a: 4, f: 0.062, ph: 3.0, col: WATER[3] },
      { y: 234, a: 3.6, f: 0.055, ph: 0.4, col: WATER[2] },
      { y: 256, a: 3.2, f: 0.05, ph: 2.2, col: WATER[1] },
    ];
    const edge = (b, x) => b.y + Math.sin(x * b.f + b.ph) * b.a + Math.sin(x * 0.027 + b.ph * 2) * 2.4;
    const bandPath = (b) => { const p = new Path2D(); p.moveTo(10, 300); for (let x = 10; x <= 290; x += 5) p.lineTo(x, edge(b, x)); p.lineTo(290, 300); p.closePath(); return p; };
    const water = bandPath(bands[0]);
    A.S.x.save(); A.S.hx.save(); A.S.x.clip(A.T(face)); A.S.hx.clip(A.T(face));
    const topLine = new Path2D(); topLine.moveTo(10, edge(bands[0], 10)); for (let x = 15; x <= 290; x += 5) topLine.lineTo(x, edge(bands[0], x));
    A.rim(topLine, { w: 1.6 });
    for (const b of bands) {
      const bp = bandPath(b);
      A.fill(bp, b.col, { h: 138 });
      field(A, { clip: bp, bbox: [10, b.y - 8, 290, 290], color: b.col, len: [26, 50], wid: [6, 10], dir: 0, dirJit: 0.1, cover: 1.6, bristle: 0.9, lJit: 0.03 });
    }
    A.S.x.restore(); A.S.hx.restore();
    // ışık yakalayan dalga sırtları
    const crest = (b, dy, a0, a1, col, w) => { const pts = []; for (let x = a0; x <= a1; x += 4) pts.push([x, edge(b, x) + dy]); A.line(pts, w, col, { w1: w * 0.5, taper: true, edge: false }); };
    crest(bands[0], 2.6, 40, 92, WATER[6], 3.2); crest(bands[0], 2.6, 200, 256, WATER[6], 3); crest(bands[0], 2.4, 116, 132, WATER[6], 2.4);
    crest(bands[1], 2.4, 62, 118, WATER[5], 2.8); crest(bands[1], 2.4, 176, 226, WATER[5], 2.6);
    crest(bands[2], 2.2, 92, 140, WATER[4], 2.4); crest(bands[2], 2.2, 196, 236, WATER[4], 2.2);
    crest(bands[3], 2, 120, 168, WATER[3], 2.2);
    // damla altında halka dalgalar
    const ry0 = edge(bands[0], 150) + 5;
    A.S.x.save(); A.S.x.lineCap = 'round';
    for (const [rx, ry, a] of [[42, 7, 0.9], [25, 4.2, 0.95]]) {
      A.S.x.strokeStyle = WATER[6]; A.S.x.globalAlpha = a; A.S.x.lineWidth = 2.4 * A.k;
      A.S.x.beginPath(); A.S.x.ellipse(150 * A.k, ry0 * A.k, rx * A.k, ry * A.k, 0, 0.15, Math.PI - 0.15, false); A.S.x.stroke();
      A.S.x.globalAlpha = a * 0.5; A.S.x.beginPath(); A.S.x.ellipse(150 * A.k, ry0 * A.k, rx * A.k, ry * A.k, 0, Math.PI + 0.5, TAU - 0.5, false); A.S.x.stroke();
    }
    A.S.x.restore();
    // damla
    const dcx = 150, dcy = 124, dr = 44, tipY = 30;
    const drop = new Path2D();
    drop.moveTo(dcx, tipY);
    drop.bezierCurveTo(dcx + 6, tipY + 32, dcx + dr, dcy - dr * 0.75, dcx + dr, dcy);
    drop.arc(dcx, dcy, dr, 0, Math.PI, false);
    drop.bezierCurveTo(dcx - dr, dcy - dr * 0.75, dcx - 6, tipY + 32, dcx, tipY);
    drop.closePath();
    A.rim(drop, { w: 1.8 });
    A.fill(drop, WATER[3], { h: 140 });
    const dbb = [dcx - dr - 2, tipY - 2, dcx + dr + 2, dcy + dr + 2];
    const ddir = (x, y) => Math.atan2(y - tipY + 30, x - dcx) + (A.r() - 0.5) * 0.25;
    field(A, { clip: drop, bbox: dbb, color: WATER[3], len: [14, 26], wid: [6, 9], dir: ddir, cover: 2.2, lJit: 0.03 });
    // berrak su: sağ kenarda koyu bant, altta içten aydınlanan havuz, sol üstte beyaz parıltı
    field(A, { clip: drop, bbox: dbb, color: WATER[2], len: [14, 24], wid: [5, 8], dir: ddir, cover: 2.6, mask: (x, y) => Math.hypot(x - (dcx - 14), y - (dcy - 20)) > 50 });
    A.fill(union2(drop, moved(drop, -8, 2)), WATER[1], { rule: 'evenodd', clip: drop, alpha: 0.95, h: 142 });
    field(A, { clip: drop, bbox: dbb, color: WATER[4], len: [12, 22], wid: [5, 8], dir: 0.2, dirJit: 0.4, cover: 3, mask: (x, y) => Math.hypot((x - (dcx + 6)) / 1.3, y - (dcy + 18)) < 25 });
    field(A, { clip: drop, bbox: dbb, color: WATER[5], len: [10, 18], wid: [4, 7], dir: 0.2, dirJit: 0.4, cover: 3, mask: (x, y) => Math.hypot((x - (dcx + 10)) / 1.5, y - (dcy + 26)) < 12 });
    A.fill(union2(circ(dcx, dcy, dr - 3.5), circ(dcx - 2, dcy - 6, dr - 3.5)), WATER[6], { rule: 'evenodd', clip: ellipsePath(dcx + 8, dcy + 26, dr * 0.8, dr * 0.5, 0), alpha: 0.95, h: 166 });
    A.line([[dcx - 20, dcy - 34], [dcx - 28, dcy - 18], [dcx - 30, dcy + 2]], 6.4, '#FFFFFF', { w1: 3.6, taper: true, edge: false });
    A.fill(circ(dcx - 25, dcy + 15, 3.8), '#FFFFFF', { h: 180 });
    A.dab(dcx - 7, tipY + 28, -1.3, 8, 2.6, WATER[6]);
  }

  // ---------------------------------------------------------------- 5) çiçek
  function petalPath(cx, cy, a, len, wid, notch) {
    const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
    const P = (u, v) => [cx + ca * u + nx * v, cy + sa * u + ny * v];
    const p = new Path2D(); const s = P(0, 0); p.moveTo(...s);
    let q = P(len * 0.25, -wid * 0.45), q2 = P(len * 0.85, -wid * 0.62), e = P(len * 0.98, -wid * 0.2);
    p.bezierCurveTo(...q, ...q2, ...e);
    const nt = P(len * (0.98 - notch), 0); p.quadraticCurveTo(...P(len * 0.99, -wid * 0.06), ...nt);
    p.quadraticCurveTo(...P(len * 0.99, wid * 0.06), ...P(len * 0.98, wid * 0.2));
    q = P(len * 0.85, wid * 0.62); q2 = P(len * 0.25, wid * 0.45); p.bezierCurveTo(...q, ...q2, ...s);
    p.closePath(); return p;
  }
  function icCicek(A, face) {
    const cx = 152, cy = 126, PL = 70;
    const angs = [-1.57, -0.32, 0.94, 2.2, 3.46].map((a) => a + 0.18);
    const petals = angs.map((a) => petalPath(cx, cy, a, PL, 62, 0.07));
    const stem = [[cx + 2, cy + 40], [cx - 2, cy + 92], [cx - 8, 264]];
    const lv = [[cx - 28, 220, -2.6, 54, 21], [cx + 22, 238, -0.45, 48, 19]];
    castShadow(A, [...petals, circ(cx, cy, 18), poly([[cx - 1, cy + 40], [cx + 4, cy + 40], [cx - 5, 264], [cx - 11, 264]])], 8, 10, SH, 0.75, face);
    A.line(stem, 6.4, LEAF[3], { w1: 4.6, rim: { w: 1.2 } });
    for (const [x, y, a, l, w] of lv) leaf(A, x, y, a, l, w, LEAF, { texN: 8 });
    // taç yapraklar: ışıktan uzak olanlar önce; dipte koyu, uçta açık
    const litOf = (a) => Math.cos(a) * LGT[0] + Math.sin(a) * LGT[1];
    const order = angs.map((a, i) => [i, litOf(a)]).sort((p, q) => p[1] - q[1]);
    const bb = [cx - PL - 4, cy - PL - 4, cx + PL + 4, cy + PL + 4];
    const rdir = (x, y) => Math.atan2(y - cy, x - cx) + (A.r() - 0.5) * 0.22;
    const d = (x, y) => Math.hypot(x - cx, y - cy);
    for (const [i, lit] of order) {
      const p = petals[i]; const L = lit > 0.3 ? 1 : lit > -0.3 ? 0 : -1;
      A.rim(p, { w: 1.5, alpha: 0.9 });
      const outer = PINK[L > 0 ? 4 : L === 0 ? 3 : 3], mid = PINK[L > 0 ? 3 : 2];
      A.fill(p, outer, { h: 140 });
      field(A, { clip: p, bbox: bb, color: outer, len: [16, 30], wid: [6, 10], dir: rdir, cover: 1.6, lJit: 0.025 });
      field(A, { clip: p, bbox: bb, color: mid, len: [14, 26], wid: [6, 9], dir: rdir, cover: 2.6, mask: (x, y) => d(x, y) < PL * 0.56 });
      field(A, { clip: p, bbox: bb, color: PINK[1], len: [10, 18], wid: [5, 8], dir: rdir, cover: 3, mask: (x, y) => d(x, y) < PL * 0.3 });
      if (L > 0) field(A, { clip: p, bbox: bb, color: PINK[5], len: [10, 20], wid: [5, 8], dir: rdir, cover: 2.6, mask: (x, y) => d(x, y) > PL * 0.74 });
      // taç yaprağı damarları
      const a = angs[i];
      for (const off of [-0.18, 0, 0.18]) A.line([[cx + Math.cos(a + off) * PL * 0.32, cy + Math.sin(a + off) * PL * 0.32], [cx + Math.cos(a + off * 1.3) * PL * 0.62, cy + Math.sin(a + off * 1.3) * PL * 0.62]], 1.4, PINK[1], { w1: 0.5, edge: false });
    }
    // göbek: sarı disk, turuncu ercik halkası
    const cdisk = circ(cx, cy, 17.5);
    A.rim(cdisk, { w: 1.2 });
    A.fill(cdisk, SUN[2], { h: 150 });
    A.fill(circ(cx - 3, cy - 4, 12.5), SUN[3], { clip: cdisk, h: 158 });
    A.fill(circ(cx - 6, cy - 7, 6), SUN[4], { clip: cdisk, h: 165 });
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + 0.2; const rr = 21 + (i % 2) * 3; A.fill(circ(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.5), i % 3 ? SUN[1] : '#C44A1E', { h: 175 }); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; A.fill(circ(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 1.6), SUN[0], { h: 160, alpha: 0.7 }); }
    A.fill(circ(cx - 7, cy - 8, 2.5), SUN[5], { h: 180 });
  }

  // ---------------------------------------------------------------- 6) bal küpü (sırlı çömlek, taşan bal, kepçe) ve petek
  function hexPath(x, y, r) { return poly([0, 1, 2, 3, 4, 5].map((i) => [x + Math.cos((i * Math.PI) / 3) * r, y + Math.sin((i * Math.PI) / 3) * r])); }
  function icBal(A, face) {
    const cx = 156;
    const pot = new Path2D();
    pot.moveTo(cx - 42, 132);
    pot.bezierCurveTo(cx - 46, 150, cx - 70, 156, cx - 68, 194);
    pot.bezierCurveTo(cx - 66, 232, cx - 40, 248, cx, 248);
    pot.bezierCurveTo(cx + 40, 248, cx + 66, 232, cx + 68, 194);
    pot.bezierCurveTo(cx + 70, 156, cx + 46, 150, cx + 42, 132);
    pot.closePath();
    const lip = rectPath(cx - 50, 118, 100, 18, 9);
    const combC = [[90, 228], [78, 208], [102, 208], [66, 228]];
    const combP = combC.map(([x, y]) => hexPath(x, y, 13));
    const stick = [[cx + 8, 122], [cx + 34, 84], [cx + 56, 54]];
    castShadow(A, [pot, lip, ...combP], 8, 10, SH, 0.75, face);
    // kepçe sapı (arkada kalan kısım çömleğin içinden çıkar)
    A.line(stick, 6.4, '#B07A3E', { w1: 5.4, rim: { w: 1.1 } });
    A.fill(circ(cx + 58, 51, 6.4), '#C69050', { h: 160 }); A.fill(circ(cx + 56, 49, 3), '#E8BE84', { h: 170 });
    // çömlek: mavi sır, basamaklı küre
    A.rim(pot, { w: 1.8 });
    A.region(pot, { ramp: CLOTH.slice(0, 6), shade: Paint.sphere(cx - 22, 176, 96, LGT, 0.1), dir: (x, y) => Math.atan2(y - 100, x - cx) + (A.r() - 0.5) * 0.25, len: [18, 32], wid: [7, 11], cover: 3, rim: false, jitter: 3, noise: 0.015, broken: 0.02, bbox: [cx - 72, 128, cx + 72, 252] });
    // krem bant (kuşak) ve ince koyu çizgi
    const bandY = (x) => 176 + Math.pow((x - cx) / 68, 2) * -6;
    const bandPts = []; for (let x = cx - 70; x <= cx + 70; x += 4) bandPts.push([x, bandY(x)]);
    A.S.x.save(); A.S.hx.save(); A.S.x.clip(A.T(pot)); A.S.hx.clip(A.T(pot));
    A.line(bandPts, 8, '#EFE2C8', { edge: false });
    A.line(bandPts.map(([x, y]) => [x, y + 7]), 1.6, CLOTH[0], { edge: false });
    for (let x = cx - 56; x <= cx + 56; x += 14) A.fill(circ(x, bandY(x), 2), CLOTH[2], { h: 170 });
    A.S.x.restore(); A.S.hx.restore();
    // sağ altta yansıyan ılık ışık, sol üstte parlak sır
    A.fill(union2(pot, moved(pot, -5, -6)), CLOTH[3], { rule: 'evenodd', clip: pot, alpha: 0.75, h: 146 });
    A.line([[cx - 50, 160], [cx - 56, 186], [cx - 50, 212]], 6.6, '#E8F6FF', { w1: 3.6, taper: true, edge: false });
    A.fill(circ(cx - 44, 228, 2.6), '#FFFFFF', { h: 176 });
    // ağız: kalın dudak
    A.rim(lip, { w: 1.6 });
    A.region(lip, { ramp: CLOTH.slice(1, 7), shade: Paint.cylY(127, 11, LGT, 0.15), dir: 0, dirJit: 0.1, len: [16, 28], wid: [4, 6], cover: 3.4, rim: false, bbox: [cx - 52, 116, cx + 52, 138] });
    // taşan bal: ağzın üstünde yüzey, dudağın üstünden aşağı süzülen damlalar
    const honey = new Path2D();
    honey.moveTo(cx - 48, 124);
    honey.bezierCurveTo(cx - 40, 110, cx + 40, 110, cx + 48, 124);
    honey.lineTo(cx + 48, 130); honey.quadraticCurveTo(cx + 40, 136, cx + 34, 134);
    honey.quadraticCurveTo(cx + 30, 140, cx + 30, 146); honey.arc(cx + 26, 146, 4, 0, Math.PI, false); honey.lineTo(cx + 22, 138);
    honey.quadraticCurveTo(cx + 14, 140, cx + 10, 140);
    honey.lineTo(cx + 9, 176); honey.arc(cx + 3, 176, 6, 0, Math.PI, false); honey.lineTo(cx - 3, 141);
    honey.quadraticCurveTo(cx - 12, 142, cx - 18, 140);
    honey.lineTo(cx - 19, 154); honey.arc(cx - 23.5, 154, 4.5, 0, Math.PI, false); honey.lineTo(cx - 28, 138);
    honey.quadraticCurveTo(cx - 40, 138, cx - 48, 130);
    honey.closePath();
    A.rim(honey, { w: 1.4 });
    A.fill(honey, HONEY[3], { h: 152 });
    field(A, { clip: honey, bbox: [cx - 50, 108, cx + 50, 184], color: HONEY[3], len: [10, 20], wid: [4, 7], dir: (x, y) => (y > 134 ? Math.PI / 2 : 0) + (A.r() - 0.5) * 0.2, cover: 2, lJit: 0.03 });
    A.fill(ellipsePath(cx, 121, 40, 7), HONEY[4], { clip: honey, h: 160 });
    A.fill(ellipsePath(cx - 10, 119, 22, 3.6), HONEY[5], { clip: honey, h: 168 });
    // damla parlamaları
    A.line([[cx + 1, 144], [cx + 1, 172]], 2.2, HONEY[6], { w1: 1.4, edge: false });
    A.fill(circ(cx + 1, 175, 1.8), '#FFFFFF', { h: 180 });
    A.fill(circ(cx - 25, 154, 1.4), HONEY[6], { h: 180 });
    A.dab(cx - 26, 116, 0.05, 12, 2.4, '#FFF8E0');
    // petek parçası (önde)
    for (const [x, y] of combC) {
      const hp = hexPath(x, y, 13);
      A.rim(hp, { w: 1.2 });
      A.fill(hp, WAX[2], { h: 150 });
      A.fill(hexPath(x - 1.2, y - 1.4, 10.4), WAX[4], { h: 160 });
      const cell = hexPath(x + 0.6, y + 0.6, 7.6);
      A.fill(cell, HONEY[3], { h: 130 });
      A.fill(hexPath(x + 2, y + 2, 4.6), HONEY[5], { clip: cell, h: 140 });
      A.fill(circ(x - 2.4, y - 2.4, 1.5), '#FFFDF2', { h: 176 });
    }
    A.line([[90, 241], [91, 249], [90, 253]], 4, HONEY[3], { w1: 5, edge: false });
    A.fill(circ(90, 254, 3.4), HONEY[3], { h: 160 }); A.fill(circ(89, 253, 1.2), '#FFF6D8', { h: 175 });
  }

  defSprite('ikon-nar', () => medal(3101, icNar));
  defSprite('ikon-bugday', () => medal(3102, icBugday));
  defSprite('ikon-uzum', () => medal(3103, icUzum));
  defSprite('ikon-su', () => medal(3104, icSu));
  defSprite('ikon-cicek', () => medal(3105, icCicek));
  defSprite('ikon-bal', () => medal(3106, icBal));

  // ---------------------------------------------------------------- 2) kâğıt pano (880×1240 kart, merkez pivot)
  const KW = 880, KH = 1240, KM = 40; // kart boyu, gölge/kenar payı
  const PAPER = ['#E2CAA4', '#EEDCBE', '#F6E7CF', '#F9EDD9', '#FCF3E4'];
  // kartın yerel koordinatları (merkez 0,0): cetvel çizgileri ve sol kenar boşluk çizgisi
  const KAGIT = { w: KW, h: KH, ruleGap: 64, marginX: -KW / 2 + 116, rules: [] };
  for (let y = -KH / 2 + 150; y < KH / 2 - 60; y += KAGIT.ruleGap) KAGIT.rules.push(y);
  function rrPts(x0, y0, w, h, rad, step) {
    const pts = [];
    const seg = (ax, ay, bx, by) => { const L = Math.hypot(bx - ax, by - ay); const n = Math.max(1, Math.round(L / step)); for (let i = 0; i < n; i++) pts.push([lerp(ax, bx, i / n), lerp(ay, by, i / n)]); };
    const arc = (cx, cy, a0) => { for (let i = 0; i < 5; i++) { const a = a0 + (i / 5) * (Math.PI / 2); pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); } };
    seg(x0 + rad, y0, x0 + w - rad, y0); arc(x0 + w - rad, y0 + rad, -Math.PI / 2);
    seg(x0 + w, y0 + rad, x0 + w, y0 + h - rad); arc(x0 + w - rad, y0 + h - rad, 0);
    seg(x0 + w - rad, y0 + h, x0 + rad, y0 + h); arc(x0 + rad, y0 + h - rad, Math.PI / 2);
    seg(x0, y0 + h - rad, x0, y0 + rad); arc(x0 + rad, y0 + rad, Math.PI);
    return pts;
  }
  function wobble(pts, amp, seed) {
    const n = pts.length; const nz = makeNoise(seed);
    return pts.map((p, i) => {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1;
      const o = (nz(i * 0.21, 0.5) - 0.5) * 2 * amp + (nz(i * 1.3, 4.5) - 0.5) * amp * 0.6;
      return [p[0] + (dy / l) * o, p[1] - (dx / l) * o];
    });
  }
  function paintKagit() {
    const A = mk(KW + 2 * KM, KH + 2 * KM, 1, 4201); const S = A.S;
    const x0 = KM, y0 = KM, cx = KM + KW / 2, cy = KM + KH / 2;
    const card = smoothPath(wobble(rrPts(x0, y0, KW, KH, 30, 18), 2.4, 7));
    const cardOut = smoothPath(wobble(rrPts(x0 - 3, y0 - 3, KW + 6, KH + 6, 33, 18), 2.4, 7));
    // basamaklı gölge: iki düz kat
    A.fill(moved(card, 18, 24), '#1E1638', { alpha: 0.13, h: false });
    A.fill(moved(card, 8, 11), '#1E1638', { alpha: 0.17, h: false });
    A.rim(card, { w: 3, alpha: 0.95 });
    A.fill(card, PAPER[2], { h: 136 });
    const st = { clip: card, bbox: [x0, y0, x0 + KW, y0 + KH], len: [90, 180], wid: [18, 28], dir: (x, y) => -0.04 + (NOISE(x * 0.004, y * 0.004) - 0.5) * 0.22, bristle: 0.5, ridge: 0.1, lJit: 0.014, hJit: 3 };
    const diag = (x, y) => (x - cx) * 0.62 + (y - cy) + (NOISE(x * 0.004 + 2, y * 0.004) - 0.5) * 70;
    field(A, Object.assign({}, st, { color: PAPER[2], cover: 1.3 }));
    field(A, Object.assign({}, st, { color: PAPER[1], cover: 2, mask: (x, y) => diag(x, y) > 400 }));
    field(A, Object.assign({}, st, { color: PAPER[3], cover: 2, mask: (x, y) => diag(x, y) < -230 }));
    field(A, Object.assign({}, st, { len: [70, 140], color: PAPER[4], cover: 1.6, mask: (x, y) => diag(x, y) < -640 }));
    // fırçalı kenarlar: kenara paralel, dışa hafif taşan kuru uçlu darbeler (üst/sol ışıkta, alt/sağ gölgede)
    const r = A.r;
    S.x.save(); S.hx.save(); S.x.clip(A.T(cardOut)); S.hx.clip(A.T(cardOut));
    for (let x = x0 + 30; x < x0 + KW - 30; x += 46 + r() * 30) { stroke(A, x, y0 + 6 + r() * 2.5, (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[3], { bristle: 0.5, ridge: 0.3 }); stroke(A, x + 20, y0 + KH - 6 - r() * 2.5, (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[1], { bristle: 0.5, ridge: 0.3 }); }
    for (let y = y0 + 30; y < y0 + KH - 30; y += 46 + r() * 30) { stroke(A, x0 + 6 + r() * 2.5, y, Math.PI / 2 + (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[3], { bristle: 0.5, ridge: 0.3 }); stroke(A, x0 + KW - 6 - r() * 2.5, y + 20, Math.PI / 2 + (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[1], { bristle: 0.5, ridge: 0.3 }); }
    S.x.restore(); S.hx.restore();
    // kenar ışığı ve gölge hattı
    const x = S.x; x.save(); x.lineCap = 'round'; x.clip(A.T(card));
    const edgeLine = (pts, col, a, w) => { x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = w; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); };
    edgeLine([[x0 + 34, y0 + 3.5], [x0 + KW - 40, y0 + 3]], PAPER[4], 0.85, 2.2);
    edgeLine([[x0 + 3.5, y0 + 36], [x0 + 3, y0 + KH - 40]], PAPER[4], 0.8, 2.2);
    edgeLine([[x0 + 40, y0 + KH - 3], [x0 + KW - 34, y0 + KH - 3.5]], PAPER[0], 0.7, 2);
    edgeLine([[x0 + KW - 3, y0 + 40], [x0 + KW - 3.5, y0 + KH - 34]], PAPER[0], 0.6, 2);
    // cetvel çizgileri: çok soluk lila, yer yer kuru fırça boşluklu; solda soluk kırmızı kenar boşluğu çizgisi
    for (const ry of KAGIT.rules) {
      let xx = x0 + 44; const yy = cy + ry;
      while (xx < x0 + KW - 44) {
        const L = 90 + r() * 220; const xe = Math.min(x0 + KW - 44, xx + L);
        x.strokeStyle = '#9F98C4'; x.globalAlpha = 0.24 + r() * 0.08; x.lineWidth = 1.6 + r() * 0.8;
        x.beginPath(); x.moveTo(xx, yy + (r() - 0.5) * 1.2); x.quadraticCurveTo((xx + xe) / 2, yy + (r() - 0.5) * 2.4, xe, yy + (r() - 0.5) * 1.2); x.stroke();
        xx = xe + 3 + r() * 12;
      }
    }
    { const mx = cx + KAGIT.marginX; let yy = y0 + 40; while (yy < y0 + KH - 40) { const L = 120 + r() * 260; const ye = Math.min(y0 + KH - 40, yy + L); x.strokeStyle = '#D8562F'; x.globalAlpha = 0.16 + r() * 0.05; x.lineWidth = 1.8; x.beginPath(); x.moveTo(mx + (r() - 0.5), yy); x.lineTo(mx + (r() - 0.5), ye); x.stroke(); yy = ye + 4 + r() * 14; } }
    x.restore();
    return A.done(0.45, cx, cy);
  }
  defSprite('kagit-panel', paintKagit);

  // ---------------------------------------------------------------- 3) duyu madalyonları (220 nominal; koyu çivit zemin için)
  const DC = 110, DR = 86, DRO = 96; // merkez, disk (halka iç) ve halka dış yarıçapı
  const TEAL = ['#14606A', '#1F8A8E', '#2DAAA8', '#3CC4C0', '#6ADCD4', '#9BF0E8', '#E2FFFA'];
  const INDIGO = ['#0A1130', '#0F1940', '#142150', '#1A2B62', '#213674', '#2A4286'];
  const WARM = ['#A4502E', '#CC7446', '#E89A66', '#F5C090', '#FFDFBA', '#FFF3E2'];
  const LIP = ['#7E2228', '#A83636', '#CC5246', '#E4745C', '#F39E80', '#FFCDB4'];
  const bez = (p0, p1, p2, p3, n = 24) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; };
  // saydam kat: fn içinde S.x geçici tuvale yönlenir, sonra tek alfa ile basılır (üst üste binen darbeler koyulaşmaz)
  function layer(A, alpha, fn, comp) {
    const S = A.S; const c = makeCanvas(S.w, S.h); const realX = S.x, realH = S.hx;
    S.x = c.getContext('2d'); S.hx = makeCanvas(1, 1).getContext('2d');
    try { fn(); } finally { S.x = realX; S.hx = realH; }
    realX.save(); realX.globalAlpha = alpha; if (comp) realX.globalCompositeOperation = comp; realX.drawImage(c, 0, 0); realX.restore();
  }
  function senseMed(seed, item) {
    const A = mk(220, 220, 1.5, seed);
    // ışıyan dış hale: iki basamaklı saydam turkuaz halka, kenarı fırçalı
    layer(A, 0.2, () => { A.fill(annulus(DC, DC, DRO - 2, DRO + 11), TEAL[5], { h: false }); for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU + A.r() * 0.2; stroke(A, DC + Math.cos(a) * (DRO + 9), DC + Math.sin(a) * (DRO + 9), a + Math.PI / 2, 22, 5, TEAL[5], { height: false }); } });
    layer(A, 0.32, () => { A.fill(annulus(DC, DC, DRO - 2, DRO + 5), TEAL[5], { h: false }); });
    A.rim(circ(DC, DC, DRO + 0.5), { w: 1.8, alpha: 0.9 });
    const disk = circ(DC, DC, DR + 2); const bb = bbC(DC, DC, DR + 2);
    A.fill(disk, INDIGO[2], { h: 134 });
    const st = { clip: disk, bbox: bb, len: [26, 48], wid: [10, 15], dir: -0.62, dirJit: 0.3, bristle: 0.9, ridge: 0.22, lJit: 0.02 };
    field(A, Object.assign({}, st, { color: INDIGO[2], cover: 1.6 }));
    field(A, Object.assign({}, st, { color: INDIGO[3], cover: 2.4, mask: (x, y) => Math.hypot(x - (DC - 6), y - (DC - 8)) < 64 }));
    field(A, Object.assign({}, st, { color: INDIGO[4], cover: 2.4, len: [20, 36], mask: (x, y) => Math.hypot(x - (DC - 12), y - (DC - 14)) < 38 }));
    const inner = circ(DC, DC, DR + 1);
    A.fill(union2(inner, circ(DC + 6, DC + 8, DR + 1)), INDIGO[0], { rule: 'evenodd', clip: inner, h: 126 });
    A.fill(union2(inner, circ(DC - 3, DC - 4, DR + 1)), INDIGO[4], { rule: 'evenodd', clip: inner, alpha: 0.8, h: 146 });
    item(A, inner);
    // turkuaz halka (simit gölgesi), iç kenarda ışıyan ince hat
    const RM = (DR + DRO) / 2, HW = (DRO - DR) / 2;
    const torus = (x, y) => {
      const dx = x - DC, dy = y - DC; const rr = Math.hypot(dx, dy) || 1; const u = clamp((rr - RM) / HW, -1, 1);
      const nx = (dx / rr) * u * 0.95, ny = (dy / rr) * u * 0.95, nz = Math.sqrt(Math.max(0, 1 - u * u * 0.9));
      const v = (nx * LGT[0] + ny * LGT[1] + nz * 0.55) / Math.hypot(LGT[0], LGT[1], 0.55);
      return clamp(0.1 + 0.9 * (v * 0.5 + 0.5));
    };
    A.region(annulus(DC, DC, DR, DRO), { ramp: TEAL.slice(1, 6), shade: torus, dir: (x, y) => Math.atan2(y - DC, x - DC) + Math.PI / 2 + (A.r() - 0.5) * 0.12, len: [10, 20], wid: [3, 4.6], cover: 3.4, jitter: 1.2, jitterFreq: 0.05, noise: 0.03, broken: 0.03, rim: false, bbox: bbC(DC, DC, DRO), dry: 0.1 });
    { const x = A.S.x; x.save(); x.strokeStyle = TEAL[5]; x.globalAlpha = 0.9; x.lineWidth = 1.6 * A.k; x.beginPath(); x.arc(DC * A.k, DC * A.k, (DR + 0.4) * A.k, 0, TAU); x.stroke(); x.restore(); }
    for (let i = 0; i < 4; i++) { const a = -2.6 + i * 0.17; A.dab(DC + Math.cos(a) * (RM + 1.6), DC + Math.sin(a) * (RM + 1.6), a + Math.PI / 2, 11, 2.4, TEAL[6]); }
    for (let i = 0; i < 2; i++) { const a = 0.6 + i * 0.2; A.dab(DC + Math.cos(a) * (RM - 1.5), DC + Math.sin(a) * (RM - 1.5), a + Math.PI / 2, 8, 2, TEAL[5]); }
    return A.done(0.5, DC, DC);
  }
  const DSH = '#0A1029'; // ikonların zemine düşen gölgesi

  // göz (önden, badem)
  function icGoz(A, face) {
    const P0 = [46, 114], P3 = [174, 108];
    const upper = bez(P0, [70, 70], [148, 64], P3), lower = bez(P3, [148, 144], [76, 152], P0);
    const eye = poly([...upper, ...lower.slice(1)]);
    castShadow(A, [eye], 6, 8, DSH, 0.55, face);
    A.rim(eye, { w: 1.4 });
    A.fill(eye, '#E3C9B4', { h: 140 });
    A.fill(eye, WARM[5], { h: 146 });
    field(A, { clip: eye, bbox: [46, 70, 174, 150], color: WARM[5], len: [16, 30], wid: [6, 9], dir: 0, dirJit: 0.2, cover: 1.6, bristle: 0.6, ridge: 0.2 });
    A.fill(union2(eye, moved(eye, 0, 9)), '#E5CDB8', { rule: 'evenodd', clip: eye, h: 140 });
    A.fill(union2(eye, moved(eye, -7, -5)), '#EBD6C4', { rule: 'evenodd', clip: eye, alpha: 0.9, h: 142 });
    // iris + göz bebeği
    const ix = 112, iy = 110, IR = 26; const iris = circ(ix, iy, IR);
    const IRIS = ['#5A2A10', '#8A461C', '#BC6E2C', '#DE9644', '#F2C06E', '#FFE2A8'];
    A.S.x.save(); A.S.hx.save(); A.S.x.clip(A.T(eye)); A.S.hx.clip(A.T(eye));
    A.fill(iris, IRIS[2], { h: 150 });
    A.fill(union2(iris, circ(ix - 5, iy - 6, IR)), IRIS[4], { rule: 'evenodd', clip: iris, h: 156 }); // içbükey: sağ alt aydınlık
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + A.r() * 0.2; A.line([[ix + Math.cos(a) * 12, iy + Math.sin(a) * 12], [ix + Math.cos(a) * (IR - 4), iy + Math.sin(a) * (IR - 4)]], 2, i % 2 ? IRIS[3] : IRIS[1], { w1: 1, edge: false }); }
    A.fill(annulus(ix, iy, IR - 3.2, IR), IRIS[0], { alpha: 0.9, h: 140 });
    A.fill(circ(ix, iy, 11), '#140E26', { h: 130 });
    // üst kapağın gölgesi
    A.fill(union2(eye, moved(eye, 0, 10)), '#2A1420', { rule: 'evenodd', clip: eye, alpha: 0.26, h: false });
    A.S.x.restore(); A.S.hx.restore();
    A.fill(circ(ix - 9, iy - 9, 5.6), '#FFFFFF', { h: 180 });
    A.fill(circ(ix + 8, iy + 8, 2.2), '#FFFFFF', { h: 176 });
    // kapak hatları, kıvrım, kirpikler
    A.line(upper, 8, WARM[3], { taper: true, rim: { w: 1 } });
    A.line(lower.slice(2, -2), 3.4, WARM[2], { taper: true });
    const crease = bez([62, 92], [84, 56], [140, 50], [164, 84], 20);
    A.line(crease, 3, WARM[2], { taper: true, edge: false });
    for (const [t, len] of [[0.6, 11], [0.72, 13], [0.84, 12], [0.94, 9]]) {
      const i = Math.round(t * 24); const p = upper[i], q = upper[Math.min(24, i + 1)];
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]) - Math.PI / 2 + 0.45;
      A.line([p, [p[0] + Math.cos(ang) * len * 0.55, p[1] + Math.sin(ang) * len * 0.55 - 1], [p[0] + Math.cos(ang + 0.2) * len, p[1] + Math.sin(ang + 0.2) * len]], 3, WARM[3], { w1: 0.8, edge: false });
    }
  }

  // kulak (yandan; yüz sağa bakar → kulak kepçesinin kıvrık kenarı solda, kulak deliği sağda)
  function icKulak(A, face) {
    const pts = [[114, 42], [92, 46], [77, 62], [72, 88], [78, 112], [88, 130], [93, 150], [97, 167], [110, 178], [123, 173], [129, 160], [127, 146], [133, 132], [143, 117], [147, 96], [145, 70], [133, 50]];
    const ear = smoothPath(pts);
    castShadow(A, [ear], 6, 8, DSH, 0.55, face);
    A.rim(ear, { w: 1.6 });
    A.fill(ear, WARM[3], { h: 140 });
    field(A, { clip: ear, bbox: [66, 38, 152, 184], ramp: WARM.slice(1, 5), shade: Paint.sphere(96, 80, 110, LGT, 0.25), dir: (x, y) => Math.atan2(y - 120, x - 118) + Math.PI / 2 + (A.r() - 0.5) * 0.3, len: [12, 24], wid: [5, 8], cover: 2.6, noise: 0.03, ridge: 0.25, bristle: 0.7 });
    // kepçe oluğu (sarmal kenarın içi), karşı kıvrım sırtı
    const scapha = [[126, 57], [106, 56], [90, 68], [84, 90], [88, 112], [96, 130], [101, 148]];
    A.line(scapha, 7.5, WARM[1], { w1: 3.6, taper: true, edge: false });
    const anti = [[128, 66], [112, 66], [100, 78], [98, 98], [104, 118], [110, 134], [114, 146]];
    A.line(anti, 6.4, WARM[4], { w1: 3.4, taper: true, edge: false });
    A.line([[106, 76], [118, 84], [131, 82]], 3.4, WARM[4], { taper: true, edge: false });
    // çanak (sığ kase) ve küçük kulak deliği
    const concha = smoothPath([[118, 100], [130, 104], [133, 118], [129, 134], [119, 138], [113, 128], [113, 112]]);
    A.fill(concha, WARM[2], { h: 132 });
    A.fill(union2(concha, moved(concha, 4, 5)), WARM[1], { rule: 'evenodd', clip: concha, h: 128 });
    A.fill(ellipsePath(127, 124, 4.2, 6, 0.2), '#7A3420', { h: 118 });
    // tragus (önde küçük kapakçık)
    const trag = smoothPath([[132, 114], [141, 118], [142, 132], [134, 138], [130, 128]]);
    A.fill(trag, WARM[3], { h: 156 }); A.dab(137, 122, 1.4, 6, 2.2, WARM[4]);
    A.dab(84, 76, -1.9, 12, 3, WARM[4]);
    // ses dalgaları
    for (const [rr, w] of [[38, 3.6], [52, 3]]) { const arc = []; for (let i = 0; i <= 16; i++) { const a = -0.55 + (i / 16) * 1.1; arc.push([134 + Math.cos(a) * rr, 122 + Math.sin(a) * rr]); } A.line(arc, w, WARM[4], { taper: true, edge: false }); }
  }

  // burun (yandan profil, sağa bakar); yüz kesiti diskle kırpılır, burun deliğine süzülen koku tülleri
  function icBurun(A, face) {
    const pts = [[10, 6], [80, 14], [98, 38], [100, 54], [97, 66], [112, 88], [132, 112], [148, 130], [152, 142], [146, 151], [134, 153], [123, 151], [117, 159], [121, 170], [118, 180], [104, 190], [96, 230], [10, 230]];
    const prof = smoothPath(pts, true, 0.42);
    A.S.x.save(); A.S.hx.save(); A.S.x.clip(A.T(face)); A.S.hx.clip(A.T(face));
    castShadow(A, [prof], 6, 8, DSH, 0.55);
    A.rim(prof, { w: 1.6 });
    A.fill(prof, WARM[2], { h: 138 });
    // düz katlar: orta ton, alt-solda gölge (yanak/çene), burun sırtı boyunca açık şerit
    const pst = { clip: prof, bbox: [16, 20, 160, 214], len: [18, 34], wid: [8, 11], dir: (x, y) => -0.9 + (A.r() - 0.5) * 0.3, ridge: 0.18, bristle: 0.6, lJit: 0.02 };
    A.fill(prof, WARM[3], { h: 140 });
    field(A, Object.assign({}, pst, { color: WARM[3], cover: 1.6 }));
    field(A, Object.assign({}, pst, { color: WARM[2], cover: 2.4, mask: (x, y) => y - x * 0.55 > 118 || x < 40 + (y - 40) * 0.12 }));
    const segD = (x, y, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(x - ax - dx * t, y - ay - dy * t); };
    field(A, Object.assign({}, pst, { len: [14, 24], wid: [6, 9], color: WARM[4], cover: 3, mask: (x, y) => segD(x, y, 92, 58, 140, 126) < 13 || segD(x, y, 60, 28, 92, 40) < 10 }));
    // kapalı göz ve kaş (sakin koklayış)
    A.line(bez([66, 60], [74, 54], [84, 54], [92, 58], 10), 4.4, WARM[1], { taper: true, edge: false });
    A.line(bez([70, 76], [76, 81], [84, 81], [90, 77], 10), 3, WARM[1], { taper: true, edge: false });
    // burun altının gölgesi, kanat kıvrımı, delik
    const under = smoothPath([[150, 146], [142, 152], [126, 152], [122, 146], [138, 142]]);
    A.fill(under, WARM[1], { alpha: 0.9, h: 132 });
    A.line(bez([118, 120], [112, 132], [118, 146], [130, 146], 14), 3.6, WARM[1], { taper: true, edge: false });
    A.fill(ellipsePath(132, 147, 6.5, 2.8, 0.15), '#6A2A1A', { h: 118 });
    // sırt ışığı ve uç parıltısı
    A.line(bez([99, 74], [108, 89], [121, 105], [134, 121], 14), 4.4, WARM[4], { taper: true, edge: false });
    A.dab(144, 134, 0.7, 8, 3.2, WARM[5]);
    A.S.x.restore(); A.S.hx.restore();
    // koku tülleri (sağdan deliğe doğru)
    const wisp = (y0, ph, len, w) => { const out = []; for (let i = 0; i <= 20; i++) { const t = i / 20; out.push([190 - t * len, y0 - t * 6 + Math.sin(t * 7 + ph) * 4.5]); } A.line(out, w, WARM[4], { taper: true, edge: false }); };
    wisp(150, 0.3, 34, 3.6); wisp(166, 1.9, 40, 3.2); wisp(134, 3.1, 26, 2.8);
  }

  // dudaklar (önden, hafif aralık; dil ucu görünür)
  function icDil(A, face) {
    const T = (q) => [110 + (q[0] - 110) * 1.16, 121 + (q[1] - 120) * 1.22];
    const bz = (a, b, c, d, n) => bez(T(a), T(b), T(c), T(d), n);
    const L = [56, 118], Rt = [164, 118];
    const upOut = [...bz(L, [74, 110], [88, 94], [100, 96], 12), ...bz([100, 96], [105, 96], [108, 100], [110, 103], 4).slice(1), ...bz([110, 103], [112, 100], [115, 96], [120, 96], 4).slice(1), ...bz([120, 96], [132, 94], [146, 110], Rt, 12).slice(1)];
    const upIn = bz(Rt, [140, 115], [124, 110], [110, 111], 10).concat(bz([110, 111], [96, 110], [80, 115], L, 10).slice(1));
    const loIn = bz(L, [78, 124], [96, 131], [110, 131], 10).concat(bz([110, 131], [124, 131], [142, 124], Rt, 10).slice(1));
    const loOut = bz(Rt, [150, 136], [130, 151], [110, 151], 12).concat(bz([110, 151], [90, 151], [70, 136], L, 12).slice(1));
    const upper = poly([...upOut, ...upIn.slice(1)]);
    const lowerP = poly([...loIn, ...loOut.slice(1)]);
    const mouth = poly([...upIn, ...loIn.slice(1)]);
    castShadow(A, [upper, lowerP, mouth], 6, 8, DSH, 0.55, face);
    A.rim(upper, { w: 1.4 }); A.rim(lowerP, { w: 1.4 });
    // ağız boşluğu ve dil ucu
    A.fill(mouth, '#3A0E22', { h: 120 });
    const [tx, ty] = T([112, 131]);
    const tongue = ellipsePath(tx, ty, 30, 11, 0.02);
    A.fill(tongue, '#DE5E7C', { clip: mouth, h: 140 });
    A.fill(ellipsePath(tx - 5, ty - 3, 20, 5.6, 0.02), '#F497AE', { clip: mouth, h: 148 });
    A.line([[tx, ty - 9], [tx, ty - 1]], 1.8, '#AE3A58', { edge: false });
    // üst dudak (aşağı baktığı için koyu), alt dudak (dolgun, aydınlık)
    A.region(upper, { ramp: LIP.slice(1, 4), shade: Paint.grad(110, 90, 110, 118, 0.95, 0.15), dir: (x, y) => (x < 110 ? 0.35 : -0.35) + (A.r() - 0.5) * 0.3, len: [12, 22], wid: [4.5, 7], cover: 3.2, rim: false, noise: 0.03, bbox: [44, 84, 176, 122] });
    A.region(lowerP, { ramp: LIP.slice(2, 6), shade: (x, y) => clamp(Paint.sphere(100, 124, 66, LGT, 0.3)(x, y)), dir: (x, y) => (x < 110 ? -0.25 : 0.25) + (A.r() - 0.5) * 0.3, len: [12, 22], wid: [5, 8], cover: 3.2, rim: false, noise: 0.03, bbox: [44, 116, 176, 160] });
    A.line(upIn.slice(1, -1), 2.4, LIP[0], { taper: true, edge: false });
    const hl = T([98, 140]); A.dab(hl[0], hl[1] + 2, 0.06, 20, 5, LIP[5]); A.dab(hl[0] - 7, hl[1] + 3, 0.1, 8, 2.4, '#FFF0E6');
    const h2 = T([98, 101]), h3 = T([122, 101]); A.dab(h2[0], h2[1], -0.25, 10, 2.8, LIP[4]); A.dab(h3[0], h3[1], 0.25, 8, 2.4, LIP[4]);
    // ağız köşeleri
    const c1 = T([54, 116]), c2 = T([166, 116]);
    A.line([c1, [c1[0] - 2, c1[1] + 6]], 2.4, WARM[2], { taper: true, edge: false }); A.line([c2, [c2[0] + 2, c2[1] + 6]], 2.4, WARM[2], { taper: true, edge: false });
  }

  // el (avuç içi önden, parmaklar yukarıda; sol el: başparmak solda)
  function capsule(bx, by, ang, L, w) {
    const loc = new Path2D(); loc.roundRect(-w * 0.3, -w / 2, L + w * 0.3, w, [w * 0.3, w / 2, w / 2, w * 0.3]);
    const p = new Path2D(); p.addPath(loc, new DOMMatrix().translate(bx, by).rotate((ang * 180) / Math.PI)); return p;
  }
  function icEl(A, face) {
    const fingers = [
      [84, 152, -2.36, 52, 19], // başparmak
      [92, 112, -1.78, 50, 15.5],
      [107, 107, -1.6, 57, 16],
      [122, 109, -1.42, 52, 15.5],
      [136, 116, -1.25, 40, 14],
    ];
    const fp = fingers.map(([x, y, a, L, w]) => capsule(x, y, a, L, w));
    const palm = smoothPath([[82, 112], [97, 104], [120, 104], [140, 110], [147, 128], [143, 156], [133, 172], [112, 180], [92, 174], [78, 158], [74, 134]]);
    const wrist = smoothPath([[94, 168], [130, 168], [134, 210], [136, 240], [90, 240], [92, 210]]);
    A.S.x.save(); A.S.hx.save(); A.S.x.clip(A.T(face)); A.S.hx.clip(A.T(face));
    castShadow(A, [...fp, palm, wrist], 6, 8, DSH, 0.55);
    for (const p of [...fp, palm, wrist]) A.rim(p, { w: 1.5 });
    A.fill(wrist, WARM[2], { h: 140 });
    field(A, { clip: wrist, bbox: [88, 160, 138, 214], color: WARM[2], len: [14, 26], wid: [6, 9], dir: Math.PI / 2, cover: 2 });
    A.fill(union2(wrist, moved(wrist, -6, 0)), WARM[1], { rule: 'evenodd', clip: wrist, alpha: 0.9, h: 136 });
    // parmaklar: gövde, gölge yanı (sağ), ışık yanı (sol), boğum çizgileri
    fingers.forEach(([x, y, a, L, w], i) => {
      const p = fp[i];
      A.fill(p, WARM[3], { h: 146 });
      const m = new DOMMatrix().translate(x, y).rotate((a * 180) / Math.PI);
      const side = new Path2D(); side.addPath(rectPath(-w, w * 0.12, L + w * 2, w), m);
      const lit = new Path2D(); lit.addPath(rectPath(-w, -w, L + w * 2, w * 0.62), m);
      A.fill(side, WARM[2], { clip: p, h: 140 });
      A.fill(lit, WARM[4], { clip: p, alpha: 0.75, h: 152 });
      const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
      for (const t of i === 0 ? [0.55] : [0.42, 0.72]) {
        const cx2 = x + ca * L * t, cy2 = y + sa * L * t;
        A.line([[cx2 - nx * w * 0.32, cy2 - ny * w * 0.32], [cx2 + nx * w * 0.3 + ca * 1.2, cy2 + ny * w * 0.3 + sa * 1.2]], 1.6, WARM[1], { w1: 1, edge: false });
      }

    });
    // avuç: basamaklı (başparmak tümseği açık, avuç çukuru koyu)
    A.fill(palm, WARM[3], { h: 146 });
    field(A, { clip: palm, bbox: [72, 100, 150, 182], color: WARM[3], len: [16, 28], wid: [6, 9], dir: -1.2, dirJit: 0.4, cover: 1.6, ridge: 0.2, bristle: 0.6 });
    A.fill(union2(palm, moved(palm, -8, -6)), WARM[2], { rule: 'evenodd', clip: palm, h: 138 });
    A.fill(union2(palm, moved(palm, -3, -2)), WARM[1], { rule: 'evenodd', clip: palm, alpha: 0.8, h: 136 });
    A.fill(smoothPath([[78, 136], [90, 130], [100, 146], [98, 168], [86, 166], [76, 152]]), WARM[4], { clip: palm, alpha: 0.8, h: 152 });
    // parmak dipleri ve avuç çizgileri
    for (let i = 1; i < 5; i++) { const [x, y, a, , w] = fingers[i]; const nx = -Math.sin(a), ny = Math.cos(a); A.line([[x - nx * w * 0.42, y - ny * w * 0.42 + 2], [x, y + 3.4], [x + nx * w * 0.42, y + ny * w * 0.42 + 2]], 1.8, WARM[1], { w1: 1.2, edge: false }); }
    A.line(bez([102, 118], [92, 134], [92, 156], [100, 170], 14), 2.2, WARM[2], { taper: true, edge: false });
    A.line(bez([142, 126], [130, 121], [114, 121], [102, 128], 14), 2, WARM[2], { taper: true, edge: false });
    A.S.x.restore(); A.S.hx.restore();
    // parmak uçlarında dokunuş işaretleri
    for (const i of [1, 2]) { const [x, y, a, L] = fingers[i]; const tx = x + Math.cos(a) * (L + 10), ty = y + Math.sin(a) * (L + 10); for (const s of [-1, 1]) A.line([[tx + s * 4, ty - 1], [tx + s * 8, ty - 6]], 2.4, WARM[4], { taper: true, edge: false }); A.line([[tx, ty - 3], [tx, ty - 9]], 2.4, WARM[4], { taper: true, edge: false }); }
  }

  defSprite('duyu-goz', () => senseMed(3201, icGoz));
  defSprite('duyu-kulak', () => senseMed(3202, icKulak));
  defSprite('duyu-burun', () => senseMed(3203, icBurun));
  defSprite('duyu-dil', () => senseMed(3204, icDil));
  defSprite('duyu-el', () => senseMed(3205, icEl));


  return { MED: { size: 300, r: RO, rFace: RI }, DUYU: { size: 220, r: DRO, rFace: DR }, KAGIT, mk, layer, bead, leaf, stroke, field, circ, poly, union2, moved, annulus, castShadow, PAL: { GOLD, CREAM, NAR, ARIL, LEAF, WHEAT, VIOLET, WATER, PINK, SUN, HONEY, WAX, CLOTH, RIBBON, STEM } };
})();

// ================================================================ kare başına arayüz işaretleri (hızlı, fırçalı)
// Hepsi ekran pikseliyle çalışır; tohumlar (seed) kıl izlerini ve kalınlık dalgasını sabitler (kareler arası titreme yok).
//  UI.ring(ctx, x, y, r, p, color, width, seed, o)   tepeden saat yönünde boyanan halka; p=1'de başlangıcı ~20° aşar
//  UI.dots(ctx, x0, y0, x1, y1, p, color, {gap, size, size1, bend, offset, shadow})
//        noktalı gösterge: ikinci dereceden eğri (kontrol noktası = orta nokta + bend·(−dy,dx)/uzunluk; bend>0 gidiş
//        yönünün sağına şişer). p başlangıçtan sona büyüme; offset<0 noktaları sona doğru akıtır (canvas lineDashOffset gibi).
//        İlk boşluk içindeki ve ucun son boşluğundaki noktalar yumuşakça büyür/küçülür (akışta patlama olmaz).
//  UI.chevron(ctx, x, y, size, angle, color, alpha)  (x,y) ucu; angle gösterilen yön
//  UI.line(ctx, pts, p, color, width, seed, o)       pts içinden geçen Catmull-Rom eğri boyunca büyüyen fırça çizgisi
//  UI.ripple(ctx, x, y, t, color, maxR, o)          t sn: 4 kırık halka 0.2 sn arayla, her biri 1.2 sn'de büyüyüp söner (t≥1.8'de boş)
//  UI.glow(ctx, x, y, r, color, alpha, mode)        basamaklı yumuşak ışıma (huzme değil); mode: 'screen' | 'lighter' isteğe bağlı
//  UI.sparkle(ctx, x, y, size, t, color, o)         4 uçlu parıltı; ömrü 0.6 sn (t<0 veya t≥0.6'da çizilmez)
const UI = (() => {
  const TAU = Math.PI * 2;
  const LG = Paint.L;
  const SHADOW = 'rgba(14,8,34,0.26)';
  const SC = new Map();
  const sh = (col, dl) => { const key = col + '|' + dl; let v = SC.get(key); if (v === undefined) { if (SC.size > 900) SC.clear(); v = shade(col, dl, dl > 0 ? 0.82 : 1.06, dl > 0 ? -4 : 4); SC.set(key, v); } return v; };
  const BD = {};
  function bdata(seed) {
    let d = BD[seed]; if (d) return d;
    const r = rng(((seed | 0) * 7919 + 101) >>> 0);
    d = { p1: r() * TAU, p2: r() * TAU, p3: r() * TAU, u1: r(), u2: r(), br: [] };
    for (let i = 0; i < 10; i++) d.br.push({ off: (i + 0.5) / 10 - 0.5 + (r() - 0.5) * 0.04, light: r() < 0.5, a: 0.2 + r() * 0.3, s0: r(), e: r(), dry: r() < 0.45 });
    return (BD[seed] = d);
  }

  // çekirdek fırça: P yoğun örnekli yol, Sx birikimli uzunluk; uzunluğu Lt olan darbenin ilk Ld pikselini çizer.
  // Başta fırça basışı (incelikten tam kalınlığa), uçta incelme + kuru kıl uçları, ışığa bakan kenarda ince boya sırtı.
  function brush(ctx, P, Sx, Ld, Lt, col, w, seed, o = {}) {
    if (Ld <= 0.4 || P.length < 2 || w <= 0) return;
    const D = bdata(seed);
    let n = 1; while (n < P.length - 1 && Sx[n] < Ld) n++;
    const Q = P.slice(0, n), QS = Sx.slice(0, n);
    { const a = P[n - 1], b = P[n], sa = Sx[n - 1], sb = Sx[n]; const t = sb > sa ? clamp((Ld - sa) / (sb - sa)) : 1; Q.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]); QS.push(Math.min(Ld, sb)); }
    const m = Q.length; if (m < 2) return;
    const N = new Array(m);
    for (let i = 0; i < m; i++) { const p0 = Q[Math.max(0, i - 1)], p1 = Q[Math.min(m - 1, i + 1)]; const dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const l = Math.hypot(dx, dy) || 1; N[i] = [-dy / l, dx / l]; }
    const press = o.press ?? 1.2, tail = o.tail ?? 1.6;
    // gövde ucun gerisinde biter; son kısmı ayrık kuru kıllar taşır (düz fırçanın kalkışı)
    const dryLen = w * (o.dry ?? 1.5) * smooth(clamp(Ld / (w * 5)));
    const bodyEnd = Math.max(0, Ld - dryLen);
    const WL = new Float32Array(m), WR = new Float32Array(m), Wb = new Float32Array(m), Ld2 = new Float32Array(m);
    let mb = 0;
    for (let i = 0; i < m; i++) {
      const s = QS[i];
      let f = 1 + 0.1 * Math.sin(s * 0.07 + D.p1) + 0.06 * Math.sin(s * 0.19 + D.p2);
      f *= 0.72 + 0.28 * smooth(clamp(s / (w * press)));
      const tp = smooth(clamp((bodyEnd - s) / (w * tail)));
      const hw = 0.5 * w * f;
      WL[i] = hw * (0.8 + 0.2 * tp) * (1 + 0.07 * Math.sin(s * 0.9 + D.p2) + 0.05 * Math.sin(s * 2.3 + D.p3));
      WR[i] = hw * (0.8 + 0.2 * tp) * (1 + 0.07 * Math.sin(s * 0.83 + D.p1) + 0.05 * Math.sin(s * 2.1 + D.p2));
      Wb[i] = 2 * hw;
      Ld2[i] = N[i][0] * LG[0] + N[i][1] * LG[1];
      if (s <= bodyEnd) mb = i;
    }
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const A0 = ctx.globalAlpha;
    if (mb >= 1) {
      const body = new Path2D();
      // başlangıç: yuvarlak fırça basışı (geriye doğru hafif şişkin)
      const t0x = Q[1][0] - Q[0][0], t0y = Q[1][1] - Q[0][1], t0l = Math.hypot(t0x, t0y) || 1;
      const bx = -t0x / t0l, by = -t0y / t0l;
      body.moveTo(Q[0][0] - N[0][0] * WR[0], Q[0][1] - N[0][1] * WR[0]);
      body.bezierCurveTo(Q[0][0] - N[0][0] * WR[0] + bx * w * 0.42, Q[0][1] - N[0][1] * WR[0] + by * w * 0.42, Q[0][0] + N[0][0] * WL[0] + bx * w * 0.42, Q[0][1] + N[0][1] * WL[0] + by * w * 0.42, Q[0][0] + N[0][0] * WL[0], Q[0][1] + N[0][1] * WL[0]);
      for (let i = 1; i <= mb; i++) body.lineTo(Q[i][0] + N[i][0] * WL[i], Q[i][1] + N[i][1] * WL[i]);
      for (let i = mb; i >= 0; i--) body.lineTo(Q[i][0] - N[i][0] * WR[i], Q[i][1] - N[i][1] * WR[i]);
      body.closePath();
      if (o.shadow !== false) { ctx.save(); ctx.translate(0.5 + w * 0.14, 0.8 + w * 0.2); ctx.fillStyle = SHADOW; ctx.fill(body); ctx.restore(); }
      // kırık astar kenarı (turuncu-kırmızı, yer yer)
      if (o.under !== false && w >= 3.2) {
        const dash = []; for (let k = 0; k < 12; k++) dash.push(k % 2 ? 10 + D.br[k % 10].e * 50 : 14 + D.br[(k + 3) % 10].s0 * 70);
        ctx.save(); ctx.setLineDash(dash); ctx.lineDashOffset = D.u1 * 100; ctx.strokeStyle = Paint.UNDER; ctx.globalAlpha = A0 * (o.underA ?? 0.85); ctx.lineWidth = Math.max(1.6, w * 0.32); ctx.stroke(body); ctx.restore();
      }
      ctx.fillStyle = col; ctx.fill(body);
      // ışığa doğru kaymış açık ton katı (düz, karışmasız basamak)
      if (w >= 3) {
        const band = new Path2D(); const mb2 = Math.max(1, mb - Math.round(w / 2));
        for (let i = 0; i <= mb2; i++) { const hw = (WL[i] + WR[i]) / 2; const c = hw * 0.36 * Ld2[i], h = hw * 0.5; const x = Q[i][0] + N[i][0] * (c + h), y = Q[i][1] + N[i][1] * (c + h); i ? band.lineTo(x, y) : band.moveTo(x, y); }
        for (let i = mb2; i >= 0; i--) { const hw = (WL[i] + WR[i]) / 2; const c = hw * 0.36 * Ld2[i], h = hw * 0.5; band.lineTo(Q[i][0] + N[i][0] * (c - h), Q[i][1] + N[i][1] * (c - h)); }
        band.closePath(); ctx.fillStyle = sh(col, 0.065); ctx.globalAlpha = A0 * 0.9; ctx.fill(band); ctx.globalAlpha = A0;
      }
    }
    // gövdedeki kıl olukları: kısmi uzunlukta açık/koyu ince çizgiler
    const nb = clamp(Math.round(w / 1.6), 3, 10); const lw = Math.max(0.5, (w / nb) * 0.55);
    const span = Math.max(1, bodyEnd);
    for (let b = 0; b < nb; b++) {
      const B = D.br[b % 10]; const off = ((b + 0.5) / nb - 0.5) * 1.6;
      const a0 = B.s0 * 0.5 * span, a1 = span * (0.45 + 0.55 * B.e);
      if (a1 - a0 < 2) continue;
      ctx.beginPath(); let st = false;
      for (let i = 0; i <= mb; i++) { const s = QS[i]; if (s < a0) continue; if (s > a1) break; const hw = off > 0 ? WL[i] : WR[i]; const x = Q[i][0] + N[i][0] * off * hw * 0.5, y = Q[i][1] + N[i][1] * off * hw * 0.5; st ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (st = true)); }
      if (!st) continue;
      ctx.strokeStyle = sh(col, B.light ? 0.14 : -0.15); ctx.globalAlpha = A0 * (0.3 + B.a); ctx.lineWidth = lw; ctx.stroke();
    }
    // kuru uç: gövdenin sonundan ayrık kıllar, farklı boylarda
    const nt = clamp(Math.round(w / 1.25), 3, 11); const tw = Math.max(0.6, (w / nt) * 0.78);
    const tx = Q[m - 1][0] - Q[m - 2][0], ty = Q[m - 1][1] - Q[m - 2][1]; const tl = Math.hypot(tx, ty) || 1;
    if (dryLen > 0.5) for (let b = 0; b < nt; b++) {
      const B = D.br[(b * 3 + 1) % 10]; const off = ((b + 0.5) / nt - 0.5) * 0.92;
      const s0 = Math.max(0, bodyEnd - w * 0.6), s1 = bodyEnd + dryLen * (0.3 + 0.7 * ((B.e + b * 0.37) % 1));
      ctx.beginPath(); let st = false;
      for (let i = 0; i < m; i++) { const s = QS[i]; if (s < s0) continue; if (s > s1) break; const x = Q[i][0] + N[i][0] * off * Wb[i] * 0.86, y = Q[i][1] + N[i][1] * off * Wb[i] * 0.86; st ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (st = true)); }
      if (!st) continue;
      if (s1 > Ld) { const ex = (s1 - Ld) / tl; const i = m - 1; ctx.lineTo(Q[i][0] + N[i][0] * off * Wb[i] * 0.86 + tx * ex, Q[i][1] + N[i][1] * off * Wb[i] * 0.86 + ty * ex); }
      ctx.strokeStyle = b % 3 === 1 ? sh(col, 0.07) : col; ctx.globalAlpha = A0 * (0.8 + 0.2 * B.a); ctx.lineWidth = tw; ctx.stroke();
    }
    // ışık sırtı ve gölge kenarı (parça parça; açıya göre alfa)
    const K = 6; const rl = Math.max(0.7, w * 0.13);
    for (let c = 0; c < mb; c += K) {
      const e = Math.min(mb, c + K); const mi = (c + e) >> 1;
      const d = Ld2[mi]; const side = d > 0 ? 1 : -1; const ad = Math.abs(d);
      if (ad < 0.12) continue;
      for (const [sg, dl, al] of [[side, 0.18, 0.85], [-side, -0.18, 0.55]]) {
        ctx.beginPath();
        for (let i = c; i <= e; i++) { const h = (sg > 0 ? WL[i] : WR[i]) * 0.74 * sg; const x = Q[i][0] + N[i][0] * h, y = Q[i][1] + N[i][1] * h; i === c ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.strokeStyle = sh(col, dl); ctx.globalAlpha = A0 * al * ad; ctx.lineWidth = rl; ctx.stroke();
      }
    }
    ctx.restore();
  }
  // yay örnekleyici (halka, dalga)
  function arcPts(x, y, R, a0, span, drift, D, step = 2.5) {
    const n = Math.max(10, Math.ceil((Math.abs(span) * R) / step)); const P = [], Sx = []; let acc = 0;
    for (let i = 0; i <= n; i++) {
      const u = i / n; const a = a0 + span * u;
      const rr = R * (1 + 0.012 * Math.sin(u * TAU * 2 + D.p1) + (u - 0.45) * drift);
      const q = [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
      if (i) acc += Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]);
      P.push(q); Sx.push(acc);
    }
    return [P, Sx, acc];
  }

  function ring(ctx, x, y, R, p = 1, col = '#FFD36E', w = 6, seed = 1, o = {}) {
    p = clamp(p); if (p <= 0.002 || R <= 0) return;
    const D = bdata(seed);
    const sweep = TAU + 0.34 + D.u1 * 0.12; // başlangıcı biraz aşar: el ile çizilmiş kapanış
    const a0 = -Math.PI / 2 - 0.06 - D.u2 * 0.06;
    const [P, Sx, Lt] = arcPts(x, y, R, a0, sweep, 0.022 + D.u2 * 0.02, D, Math.min(2.5, R * 0.08 + 0.8));
    brush(ctx, P, Sx, Lt * p, Lt, col, w, seed, o);
  }

  function line(ctx, pts, p = 1, col = '#FFF0CF', w = 4, seed = 1, o = {}) {
    p = clamp(p); if (p <= 0.002 || !pts || pts.length < 2) return;
    const P = [], Sx = []; let acc = 0; const n = pts.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
      const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2.5));
      for (let j = i ? 1 : 0; j <= m; j++) {
        const t = j / m, t2 = t * t, t3 = t2 * t;
        const qx = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const qy = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        if (P.length) acc += Math.hypot(qx - P[P.length - 1][0], qy - P[P.length - 1][1]);
        P.push([qx, qy]); Sx.push(acc);
      }
    }
    brush(ctx, P, Sx, acc * p, acc, col, w, seed, o);
  }

  // boyalı nokta kalıpları (birim boy)
  const DAB = (() => { const out = []; for (let v = 0; v < 8; v++) out.push(smoothPath(blobPts(0, 0, 0.6, 0.5, 9, 0.16, 4242 + v * 17))); return out; })();
  const hash1 = (i, k) => { let h = Math.imul((i | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35); h ^= h >>> 13; h = Math.imul(h, 0x27d4eb2d); h ^= h >>> 15; return (h >>> 0) / 4294967296; };
  function dab(ctx, x, y, ang, sz, col, v = 0, shadow = true) {
    const P = DAB[v & 7];
    ctx.save(); ctx.translate(x, y);
    if (shadow) { ctx.save(); ctx.translate(sz * 0.14 + 0.4, sz * 0.2 + 0.6); ctx.rotate(ang); ctx.scale(sz, sz); ctx.fillStyle = SHADOW; ctx.fill(P); ctx.restore(); }
    ctx.save(); ctx.rotate(ang); ctx.scale(sz, sz); ctx.fillStyle = sh(col, -0.11); ctx.fill(P); ctx.restore();
    ctx.save(); ctx.translate(-sz * 0.06, -sz * 0.08); ctx.rotate(ang); ctx.scale(sz * 0.92, sz * 0.86); ctx.fillStyle = col; ctx.fill(P); ctx.restore();
    ctx.save(); ctx.translate(-sz * 0.2, -sz * 0.22); ctx.rotate(ang); ctx.scale(sz * 0.5, sz * 0.34); ctx.fillStyle = sh(col, 0.13); ctx.fill(P); ctx.restore();
    ctx.restore();
  }
  function dots(ctx, x0, y0, x1, y1, p = 1, col = '#FFF0CF', o = {}) {
    p = clamp(p); if (p <= 0.002) return;
    const gap = Math.max(2, o.gap ?? 18), size = o.size ?? 5, size1 = o.size1 ?? size, bend = o.bend ?? 0, off = o.offset ?? 0;
    const dx = x1 - x0, dy = y1 - y0, L0 = Math.hypot(dx, dy); if (L0 < 0.5) return;
    const cx = (x0 + x1) / 2 - (dy / L0) * bend, cy = (y0 + y1) / 2 + (dx / L0) * bend;
    const M = Math.max(8, Math.ceil((L0 + Math.abs(bend)) / 6));
    const T = new Float32Array(M + 1), X = new Float32Array(M + 1), Y = new Float32Array(M + 1);
    for (let i = 0; i <= M; i++) { const t = i / M, u = 1 - t; X[i] = u * u * x0 + 2 * u * t * cx + t * t * x1; Y[i] = u * u * y0 + 2 * u * t * cy + t * t * y1; if (i) T[i] = T[i - 1] + Math.hypot(X[i] - X[i - 1], Y[i] - Y[i - 1]); }
    const Lt = T[M], Lv = Lt * p;
    const phase = (((-off) % gap) + gap) % gap;
    let j = 0;
    for (let s = phase; s <= Lv + 0.01; s += gap) {
      const f = smooth(clamp(s / (gap * 0.9))) * smooth(clamp((Lv - s) / (gap * 0.9)));
      if (f < 0.03) continue;
      while (j < M - 1 && T[j + 1] < s) j++;
      const seg = T[j + 1] - T[j]; const t = seg > 0 ? clamp((s - T[j]) / seg) : 0;
      const x = lerp(X[j], X[j + 1], t), y = lerp(Y[j], Y[j + 1], t);
      const id = Math.round((s + off) / gap);
      const r1 = hash1(id, 1), r2 = hash1(id, 2);
      const sz = lerp(size, size1, s / Lt) * f * (0.86 + r1 * 0.28);
      const ang = Math.atan2(Y[j + 1] - Y[j], X[j + 1] - X[j]) + (r2 - 0.5) * 0.6;
      dab(ctx, x, y, ang, sz, col, id & 7, o.shadow !== false);
    }
  }

  function chevron(ctx, x, y, size = 16, angle = 0, col = '#FFF0CF', alpha = 1) {
    if (alpha <= 0.002 || size <= 0) return;
    ctx.save(); ctx.globalAlpha *= alpha;
    const w = Math.max(2.2, size * 0.32), back = size * 0.74, spread = 0.66;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (const sd of [-1, 1]) {
      const a = angle + Math.PI + sd * spread;
      const sx = x - ca * w * 0.18, sy = y - sa * w * 0.18;
      const ex = sx + Math.cos(a) * back, ey = sy + Math.sin(a) * back;
      const P = [], Sx = []; const n = Math.max(6, Math.ceil(back / 1.5)); let acc = 0;
      for (let i = 0; i <= n; i++) { const t = i / n; const q = [lerp(sx, ex, t), lerp(sy, ey, t)]; if (i) acc += Math.hypot(q[0] - P[i - 1][0], q[1] - P[i - 1][1]); P.push(q); Sx.push(acc); }
      brush(ctx, P, Sx, acc, acc, col, w, 61 + sd, { press: 0.35, tail: 1.2, dry: 0.5 });
    }
    // uç düğümü: iki kolun birleştiği yer dolu kalsın
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - ca * w * 0.3, y - sa * w * 0.3, w * 0.48, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function ripple(ctx, x, y, t, col = '#FFE2B0', maxR = 200, o = {}) {
    if (t < 0) return;
    const n = o.n ?? 4, dt = o.dt ?? 0.2, life = o.life ?? 1.2, seed = o.seed ?? 0;
    const g0 = 1 - clamp(t / (life * 0.85));
    if (g0 > 0) glow(ctx, x, y, maxR * 0.5, col, (o.glow ?? 0.3) * g0 * smooth(clamp(t / 0.1)));
    for (let i = 0; i < n; i++) {
      const u = (t - i * dt) / life; if (u <= 0 || u >= 1) continue;
      const R = lerp(maxR * 0.18, maxR, E.out3(u));
      const a = Math.pow(1 - u, 1.4) * smooth(clamp(u / 0.1));
      const w = lerp(maxR * 0.045, maxR * 0.012, u);
      const D = bdata(700 + i * 13 + seed);
      ctx.save(); ctx.globalAlpha *= a * (o.alpha ?? 0.72);
      let a0 = D.p1;
      for (let k = 0; k < 3; k++) {
        const span = TAU / 3 - (0.32 + 0.3 * D.br[k].e);
        const [P, Sx, L] = arcPts(x, y, R, a0, span, 0.01, D, 3);
        brush(ctx, P, Sx, L, L, col, w, 700 + i * 13 + k + seed, { shadow: false, press: 1.4, tail: 1.8 });
        a0 += TAU / 3 + (D.br[k + 3].e - 0.5) * 0.3;
      }
      ctx.restore();
    }
  }

  // basamaklı yumuşak ışıma kalıbı (beyaz, fırça dokulu), renge göre önbellekli boyanır
  let GSTAMP = null; const GT = new Map();
  function gstamp() {
    if (GSTAMP) return GSTAMP;
    const S = 256, c = makeCanvas(S, S), x = c.getContext('2d');
    const g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    for (const [t, a] of [[0, 1], [0.2, 0.92], [0.27, 0.68], [0.45, 0.57], [0.52, 0.34], [0.74, 0.22], [0.82, 0.09], [1, 0]]) g.addColorStop(t, `rgba(255,255,255,${a})`);
    x.fillStyle = g; x.fillRect(0, 0, S, S);
    const r = rng(515); x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 80; i++) { x.save(); x.translate(r() * S, r() * S); x.rotate(-0.62 + (r() - 0.5) * 0.5); x.globalAlpha = 0.035 + r() * 0.05; x.fillStyle = '#000'; x.beginPath(); x.ellipse(0, 0, 18 + r() * 40, 3 + r() * 5, 0, 0, TAU); x.fill(); x.restore(); }
    return (GSTAMP = c);
  }
  function tinted(col) {
    let c = GT.get(col); if (c) return c;
    if (GT.size > 48) GT.clear();
    const s = gstamp(); c = makeCanvas(s.width, s.height); const x = c.getContext('2d');
    x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
    GT.set(col, c); return c;
  }
  function glow(ctx, x, y, r, col = '#FFD27A', alpha = 0.4, mode) {
    if (!(alpha > 0.002) || r <= 0) return;
    ctx.save(); ctx.globalAlpha *= Math.min(1, alpha); if (mode) ctx.globalCompositeOperation = mode;
    ctx.drawImage(tinted(col), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  const STAR = (() => { const p = new Path2D(); const k = 0.15; p.moveTo(0, -1); p.quadraticCurveTo(k, -k, 0.76, 0); p.quadraticCurveTo(k, k, 0, 1); p.quadraticCurveTo(-k, k, -0.76, 0); p.quadraticCurveTo(-k, -k, 0, -1); p.closePath(); return p; })();
  function sparkle(ctx, x, y, size = 24, t = 0, col = '#FFFFFF', o = {}) {
    const life = o.life ?? 0.6; const u = t / life; if (!(u > 0) || u >= 1) return;
    const sc = u < 0.28 ? E.outBack(u / 0.28, 1.8) : 1 - E.in2((u - 0.28) / 0.72);
    if (sc <= 0.01) return;
    const R = size * 0.5 * sc;
    glow(ctx, x, y, R * 1.6, col, 0.42 * (1 - u * 0.5));
    ctx.save(); ctx.translate(x, y); ctx.rotate(u * 0.5 + (o.rot ?? 0));
    const edge = o.edge ?? (col.toUpperCase() === '#FFFFFF' ? '#FFD98E' : sh(col, -0.12));
    ctx.save(); ctx.scale(R * 1.14, R * 1.14); ctx.fillStyle = edge; ctx.globalAlpha *= 0.8; ctx.fill(STAR); ctx.restore();
    ctx.save(); ctx.scale(R, R); ctx.fillStyle = col; ctx.fill(STAR); ctx.restore();
    ctx.rotate(Math.PI / 4); ctx.save(); ctx.scale(R * 0.42, R * 0.42); ctx.fillStyle = col; ctx.globalAlpha *= 0.85; ctx.fill(STAR); ctx.restore();
    ctx.restore();
  }

  return { ring, dots, chevron, line, ripple, glow, sparkle, brush, dab, arcPts };
})();
