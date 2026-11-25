// Arayüz grubu: içindekiler madalyonları (Perde 1), kâğıt pano, duyu madalyonları (Perde 4) ve
// kare başına çalışan fırçalı arayüz işaretleri (UI.ring / dots / chevron / line / ripple / glow / haze / sparkle).
// Üslup: S-042 Akrilik — basamaklı düz ton katları, keskin kenarlı fırça darbeleri, gölge yanında kırık astar.
// Işık sol üstten. Sprite'lar "nominal" birimde tasarlanır (madalyon 300, duyu 220) ve k kat çözünürlükle boyanır;
// drawSpr(ctx, spr('ikon-nar'), x, y, MED_PX / 300) ekranda MED_PX çaplı madalyon verir.
// Sönük (opak, karartılmış-soldurulmuş) eşler: spr('ikon-uzum-sonuk') …  ya da ARAYUZ.drawMed(ctx, ad, x, y, ölçek, sönüklük, alfa).
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
  const union2 = (a, b) => { const p = new Path2D(); p.addPath(a); p.addPath(b); return p; };
  // hilal kırpması: p ile birlikte kullanılır → p'nin (dx,dy) kaydırılmış kopyasının dışında kalan kenar şeridi
  const cres = (p, dx, dy) => [union2(p, moved(p, dx, dy)), 'evenodd'];
  // kırpma listesi: Path2D | [Path2D, kural] | bunların dizisi
  const normC = (c) => (!c ? [] : c instanceof Path2D ? [[c, 'nonzero']] : c.length === 2 && c[0] instanceof Path2D && typeof c[1] === 'string' ? [c] : c.flatMap(normC));
  const bez = (p0, p1, p2, p3, n = 24) => { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]); } return out; };

  // ---------------------------------------------------------------- nominal koordinatlı boyama sarmalayıcısı
  function mk(wN, hN, k, seed) {
    const S = Paint.sprite(Math.round(wN * k), Math.round(hN * k), { seed, k });
    const M = new DOMMatrix([k, 0, 0, k, 0, 0]);
    const T = (p) => { const q = new Path2D(); q.addPath(p, M); return q; };
    const sc = (f) => (typeof f === 'function' ? (x, y) => f(x / k, y / k) : f);
    const A = { S, k, r: S.r, T, wN, hN };
    A.clip = (ctx, c) => { for (const [p, rule] of normC(c)) ctx.clip(T(p), rule); };
    A.inside = (c) => { const L = normC(c).map(([p, rule]) => [T(p), rule]); return (x, y) => { for (const [q, rule] of L) if (!S.x.isPointInPath(q, x * k, y * k, rule)) return false; return true; }; };
    A.region = (p, o) => {
      const o2 = Object.assign({}, o);
      if (o.shade) o2.shade = sc(o.shade);
      if (typeof o.dir === 'function') o2.dir = sc(o.dir);
      if (o.bbox) o2.bbox = o.bbox.map((v) => v * k);
      S.region(T(p), o2); return A;
    };
    // düz ton katı (+ kabartma yüksekliği). o.clip: kırpma listesi; o.ridge: false | sırt alfası
    A.fill = (p, col, o = {}) => {
      const q = T(p); const x = S.x; const rule = o.rule || 'nonzero';
      x.save(); A.clip(x, o.clip); x.globalAlpha = o.alpha ?? 1; x.fillStyle = col; x.fill(q, rule); x.restore();
      if (o.h !== false) {
        const hx = S.hx; const g = o.h ?? 140;
        hx.save(); A.clip(hx, o.clip); hx.globalAlpha = o.hA ?? 0.85; hx.fillStyle = `rgb(${g},${g},${g})`; hx.fill(q, rule);
        const ra = o.ridge === false ? 0 : typeof o.ridge === 'number' ? o.ridge : 0.55;
        if (ra > 0) { hx.globalAlpha = ra; hx.strokeStyle = `rgb(${g + 55},${g + 55},${g + 55})`; hx.lineWidth = 1.1 * k; hx.stroke(q); }
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
        const px = lerp(bb[0], bb[2], r()), py = lerp(bb[1], bb[3], r());
        const aa = (typeof ang === 'function' ? ang(px, py) : ang) + (r() - 0.5) * (o.jit ?? 0.15);
        const ca = Math.cos(aa), sa = Math.sin(aa); const L = lerp(o.l0 ?? 8, o.l1 ?? 24, r());
        x.globalAlpha = (o.a ?? 0.2) * (0.45 + r() * 0.8); x.strokeStyle = shade(col, r() < (o.lightP ?? 0.5) ? (o.dl ?? 0.07) : -(o.dl ?? 0.07)); x.lineWidth = (0.35 + r() * (o.lw ?? 0.8)) * k;
        x.beginPath(); x.moveTo((px - (ca * L) / 2) * k, (py - (sa * L) / 2) * k); x.lineTo((px + (ca * L) / 2) * k, (py + (sa * L) / 2 + (r() - 0.5) * 0.8) * k); x.stroke();
      }
      x.restore(); return A;
    };
    A.done = (emboss, px, py) => ({ canvas: S.finish({ emboss }), px: px * k, py: py * k, k });
    return A;
  }

  // yumuşak kıllı tek darbe (nominal birim). o.hv/o.hb: kabartma yüksekliği değişkenliği/tabanı (küçük hv → temiz yüzey)
  function stroke(A, x, y, ang, len, wid, col, o = {}) {
    const S = A.S, k = A.k, r = A.r, ctx = S.x, hx = S.hx;
    const L = len * k, Wd = wid * k; const shape = Paint.strokeShape(L, Wd, r); const al = o.alpha ?? 1;
    ctx.save(); ctx.translate(x * k, y * k); ctx.rotate(ang);
    ctx.globalAlpha = al; ctx.fillStyle = col; ctx.fill(shape);
    const bA = o.bristle ?? 1;
    if (bA > 0) {
      const n = Math.max(2, Math.round(wid / 3.2));
      for (let i = 0; i < n; i++) {
        const yy = -Wd / 2 + ((i + 0.5) * Wd) / n + (r() - 0.5) * 0.8 * k; const lt = r() < 0.55;
        ctx.globalAlpha = al * (0.05 + r() * 0.1) * bA;
        ctx.strokeStyle = shade(col, lt ? 0.05 + r() * 0.03 : -0.035 - r() * 0.03);
        ctx.lineWidth = (0.45 + r() * 0.8) * k;
        const xa = -L / 2 + r() * L * 0.3, xb = L / 2 - r() * L * 0.3 + (r() < 0.15 ? Wd * 0.4 : 0);
        ctx.beginPath(); ctx.moveTo(xa, yy); ctx.lineTo(xb, yy + (r() - 0.5) * k); ctx.stroke();
      }
    }
    ctx.restore();
    if (o.height !== false) {
      const hv = o.hv ?? 26, hb = o.hb ?? 124;
      hx.save(); hx.translate(x * k, y * k); hx.rotate(ang); const g = hb + Math.floor(r() * hv);
      hx.globalAlpha = 0.9 * al; hx.fillStyle = `rgb(${g},${g},${g})`; hx.fill(shape);
      const ra = (o.ridge ?? 0.5) * al;
      if (ra > 0) { hx.globalAlpha = ra; hx.strokeStyle = `rgb(${g + 62},${g + 62},${g + 62})`; hx.lineWidth = 1.05 * k; hx.stroke(shape); }
      hx.restore();
    }
  }
  // darbe alanı (nominal): merkezler o.clip kırpma listesinin ve o.mask'ın içinde; ton tek renk ya da ramp+shade basamağı.
  // Darbeler kırpmaya göre kesilir (clipStrokes:false değilse): ton basamaklarının kenarı darbe uçlarıyla değil, kırpmayla çizilir.
  function field(A, o) {
    const r = A.r, k = A.k; const bb = o.bbox; const [l0, l1] = o.len, [w0, w1] = o.wid;
    const area = (bb[2] - bb[0]) * (bb[3] - bb[1]); const meanS = (((l0 + l1) / 2) * (w0 + w1)) / 2;
    const count = Math.min(o.max ?? 4000, Math.round((area / meanS) * (o.cover ?? 2)));
    const ins = o.clip ? A.inside(o.clip) : null; const list = [];
    const steps = o.ramp ? o.ramp.length : 1; const jit = o.jitter ?? 0, fq = o.jitterFreq ?? 0.02, nz = o.noise ?? 0;
    for (let i = 0; i < count; i++) {
      const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
      if (ins && !ins(x, y)) continue;
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
    const cl = o.clip && o.clipStrokes !== false;
    if (cl) { A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, o.clip); A.clip(A.S.hx, o.clip); }
    const dirf = typeof o.dir === 'function' ? o.dir : () => (o.dir ?? 0) + (r() - 0.5) * (o.dirJit ?? 0.25);
    for (const [x, y, ki] of list) {
      const base = o.ramp ? o.ramp[ki] : o.color;
      const col = shade(base, (r() - 0.5) * (o.lJit ?? 0.03), 1 + (r() - 0.5) * 0.08, (r() - 0.5) * (o.hJit ?? 4));
      stroke(A, x, y, dirf(x, y), lerp(l0, l1, r()), lerp(w0, w1, r()), col, { bristle: o.bristle, alpha: o.alpha, ridge: o.ridge, hv: o.hv, hb: o.hb });
    }
    if (cl) { A.S.x.restore(); A.S.hx.restore(); }
    return list.length;
  }
  // düz ton düzlemi: kenarı kırpmayla keskin, içi kabartma sırtı vermeyen geniş darbelerle dokulu (ten, krem yüzey)
  function plane(A, p, col, o = {}) {
    A.fill(p, col, { clip: o.clip, h: o.h ?? 140, ridge: false, alpha: o.alpha });
    if (o.tex !== false) field(A, { clip: o.clip ? [p, ...normC(o.clip)] : p, bbox: o.bb || [0, 0, A.wN, A.hN], color: col, len: o.len || [18, 34], wid: o.wid || [8, 12], dir: o.dir ?? -0.5, dirJit: o.dirJit ?? 0.3, cover: o.cover ?? 1.1, bristle: o.bristle ?? 0.3, ridge: 0.05, hv: 4, hb: o.h ?? 140, lJit: o.lJit ?? 0.012, hJit: 3, alpha: o.alpha });
    return p;
  }

  // gölge yanında kırık astar: yolların (dx,dy) kaydırılmış birleşiminden yolların kendisi çıkarılır, kalan şerit
  // gürültüyle kısa parçalara bölünür. Yalnız biçim kümesinin dış hattında, sağ altta görünür.
  function under(A, paths, o = {}) {
    const S = A.S, k = A.k; const dx = (o.dx ?? 2.2) * k, dy = (o.dy ?? 2.8) * k;
    const c = makeCanvas(S.w, S.h), x = c.getContext('2d');
    x.fillStyle = o.color ?? U; x.strokeStyle = o.color ?? U; x.lineJoin = 'round';
    x.save(); x.translate(dx, dy); for (const p of paths) { const q = A.T(p); x.fill(q); if (o.grow) { x.lineWidth = o.grow * k; x.stroke(q); } } x.restore();
    x.globalCompositeOperation = 'destination-out'; for (const p of paths) x.fill(A.T(p));
    const th = o.th ?? 0.44;
    if (th > 0) {
      const bb = o.bb ? o.bb.map((v) => v * k) : [0, 0, S.w, S.h];
      const bx = clamp(Math.floor(bb[0]), 0, S.w), by = clamp(Math.floor(bb[1]), 0, S.h);
      const bw = clamp(Math.ceil(bb[2] + dx + 2), 0, S.w) - bx, bh = clamp(Math.ceil(bb[3] + dy + 2), 0, S.h) - by;
      if (bw > 0 && bh > 0) {
        const id = x.getImageData(bx, by, bw, bh), d = id.data; const f = (o.freq ?? 0.085) / k; const sx = (o.seed ?? 0) * 7.31 + 17.3;
        for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
          const q = (j * bw + i) * 4 + 3; if (!d[q]) continue;
          const v = NOISE((bx + i) * f + sx, (by + j) * f + 5.1);
          if (v < th) d[q] = 0; else if (v < th + 0.04) d[q] = (d[q] * (v - th)) / 0.04;
        }
        x.putImageData(id, bx, by);
      }
    }
    S.x.save(); if (o.clip) A.clip(S.x, o.clip); S.x.globalAlpha = o.alpha ?? 0.95; S.x.drawImage(c, 0, 0); S.x.restore();
  }
  // nesnenin yüzeye düşen gölgesi (sağ alta): yolları geçici katmanda birleştir, tek alfa ile bas
  function castShadow(A, paths, dx, dy, col, alpha, clip) {
    const S = A.S; const c = makeCanvas(S.w, S.h); const x = c.getContext('2d');
    x.translate(dx * A.k, dy * A.k); x.fillStyle = col; for (const p of paths) x.fill(A.T(p));
    S.x.save(); if (clip) A.clip(S.x, clip); S.x.globalAlpha = alpha; S.x.drawImage(c, 0, 0); S.x.restore();
  }
  // saydam kat: fn içinde S.x geçici tuvale yönlenir, sonra tek alfa ile basılır (üst üste binen darbeler koyulaşmaz)
  function layer(A, alpha, fn, comp) {
    const S = A.S; const c = makeCanvas(S.w, S.h); const realX = S.x, realH = S.hx;
    S.x = c.getContext('2d'); S.hx = makeCanvas(1, 1).getContext('2d');
    try { fn(); } finally { S.x = realX; S.hx = realH; }
    realX.save(); realX.globalAlpha = alpha; if (comp) realX.globalCompositeOperation = comp; realX.drawImage(c, 0, 0); realX.restore();
  }

  // basamaklı yuvarlak (üzüm tanesi, nar tanesi): taban, sol üste kaymış DÜZENSİZ açık leke (taslağın küçültülmüş kopyası
  // değil), sağ altta koyu hilal, isteğe bağlı ince yansıma hilali ve tek parlak fırça izi. İç içe halka yok.
  function gem(A, p0, x, y, rx, ry, R, o = {}) {
    const r = A.r, b = o.base ?? 2, h0 = o.h ?? 148;
    A.fill(p0, R[b], { h: h0, ridge: o.ridge ?? 0.3 });
    const lit = smoothPath(blobPts(x - rx * 0.2, y - ry * 0.24, rx * 0.64, ry * 0.58, 9, 0.26, Math.floor(r() * 99991), -0.6 + (r() - 0.5) * 0.8));
    A.fill(lit, o.litCol ?? R[b + 1], { clip: p0, h: h0 + 3, ridge: false });
    A.fill(p0, o.dark ?? R[Math.max(0, b - 1)], { clip: [p0, cres(p0, -rx * 0.24, -ry * 0.28)], h: h0 - 3, ridge: false });
    if (o.refl) A.fill(p0, o.refl, { clip: [p0, cres(p0, -rx * 0.08, -ry * 0.1)], alpha: o.reflA ?? 0.75, h: false });
    if (o.hl !== false) {
      const a = -0.75 + (r() - 0.5) * 0.5;
      stroke(A, x - rx * (0.34 + r() * 0.1), y - ry * (0.38 + r() * 0.1), a, Math.max(2.4, rx * (o.hlL ?? 0.5)), Math.max(1.5, rx * 0.2), o.hlCol ?? R[R.length - 1], { bristle: 0.3, ridge: 0.3, hb: 158, hv: 8 });
    }
  }
  const bead = (A, x, y, rx, ry, rot, R, o = {}) => gem(A, ellipsePath(x, y, rx, ry, rot), x, y, rx, ry, R, Object.assign({ base: 1 }, o));

  // badem yaprak: (x,y) merkez, ang uzun eksen; iki tonlu fırça darbeleri (damar yönünde), açık orta damar
  function leaf(A, x, y, ang, len, wid, R, o = {}) {
    const l = len / 2, w = wid / 2; const r = A.r; const b = (r() - 0.5) * w * 0.4;
    const loc = new Path2D();
    loc.moveTo(-l, 0);
    loc.bezierCurveTo(-l * 0.5, -w * 1.25 + b, l * 0.4, -w * 1.1 + b, l, b * 0.3);
    loc.bezierCurveTo(l * 0.4, w * 1.1 + b, -l * 0.5, w * 1.25 + b, -l, 0);
    loc.closePath();
    const m = new DOMMatrix().translate(x, y).rotate((ang * 180) / Math.PI);
    const p = new Path2D(); p.addPath(loc, m);
    const nx = -Math.sin(ang), ny = Math.cos(ang); // +y yarısının normali
    const upLit = nx * LGT[0] + ny * LGT[1] < 0; // -y yarısı ışıkta mı
    const litHalf = new Path2D(); litHalf.addPath(upLit ? rectPath(-l - 2, -w * 1.5, len + 4, w * 1.5 + b * 0.3) : rectPath(-l - 2, b * 0.3, len + 4, w * 1.5), m);
    const d = o.dark ?? 1; const bbL = [x - l - 2, y - l - 2, x + l + 2, y + l + 2];
    if (o.rim !== false) under(A, [p], { dx: 1.6, dy: 2.1, th: 0.46, bb: bbL });
    A.fill(p, R[d], { h: 140, ridge: 0.3 });
    const side = (px, py) => ((px - x) * nx + (py - y) * ny > 0 ? 1 : -1);
    const vdir = (px, py) => ang + side(px, py) * 0.6 + (r() - 0.5) * 0.3;
    const st = { bbox: bbL, len: [len * 0.2, len * 0.36], wid: [Math.max(3, wid * 0.2), Math.max(4, wid * 0.3)], dir: vdir, bristle: 1, ridge: 0.22, hv: 12, hb: 136, lJit: 0.03 };
    field(A, Object.assign({}, st, { clip: p, color: R[d], cover: 1.7 }));
    A.fill(p, R[d + 2], { clip: [p, litHalf], h: 146, ridge: false });
    field(A, Object.assign({}, st, { clip: [p, litHalf], color: R[d + 2], cover: 1.9 }));
    if (o.vein !== false) {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      A.line([[x - ca * l * 0.92, y - sa * l * 0.92], [x + ca * l * 0.1 + nx * b * 0.15, y + sa * l * 0.1 + ny * b * 0.15], [x + ca * l * 0.75, y + sa * l * 0.75]], Math.max(1, wid * 0.07), o.veinCol ?? R[d + 3], { w1: 0.5, edge: false });
    }
    return p;
  }

  // yuvarlatılmış dikdörtgen çevresi (noktalar) ve gürültülü titreşim
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

  // ---------------------------------------------------------------- paletler (koyu → açık)
  const GOLD = ['#744610', '#9C6418', '#C48C28', '#DDAA3C', '#F0C95A', '#FAE39A', '#FFF5D2'];
  const CREAM = ['#DFC39C', '#E9D2B0', '#F1DFC2', '#F6E7CF', '#FAEFDC', '#FDF6EA'];
  const NAR = ['#4A0716', '#740C24', '#9E122E', '#C21C36', '#DC3646', '#EE6670', '#FFD6DA'];
  const ARIL = ['#5A0820', '#8E1030', '#C21E40', '#E8506A', '#FF9AAA', '#FFE4E8'];
  const LEAF = ['#08402E', '#0E5E3C', '#1A7E45', '#2EA052', '#62BE57', '#A7DE7C', '#DDF3A8'];
  const WHEAT = ['#5C2E06', '#8A4A0E', '#B26816', '#D68A20', '#ECAE40', '#F8D478', '#FFF0BE'];
  const VIOLET = ['#1E1442', '#33215F', '#4D3384', '#6C4EA8', '#957ACB', '#CDBCEB', '#F4EEFF'];
  const WATER = ['#0F3480', '#1A51A6', '#2672C2', '#3A93D8', '#6CB8E8', '#A9DDF6', '#E6F8FF'];
  const PINK = ['#86104E', '#B5206C', '#DC4690', '#F07BB2', '#F8A2C9', '#FCCDE2', '#FFF0F7'];
  const SUN = ['#B5560E', '#DB7A16', '#F2A024', '#FBC544', '#FFE07E', '#FFF4C2'];
  const HONEY = ['#5E2604', '#8C3E06', '#BC600C', '#E08A1A', '#F4B23A', '#FCD678', '#FFF2C6'];
  const WAX = ['#8A5C10', '#B8861C', '#DDAA30', '#F0C854', '#F9E08A', '#FFF3C4'];
  const CLOTH = ['#14306E', '#1A4D99', '#2468B8', '#2E86CE', '#5AA6DE', '#9CCBEE', '#DDF0FF'];
  const RIBBON = ['#6A1410', '#9A2216', '#C6381E', '#E2582E', '#F3845A', '#FBB898'];
  const STEM = ['#3E2414', '#5E3A1E', '#80552C', '#A2763E', '#C49C5E'];
  // adamın teni, saçı, sakalı (assets/adam.js ADAM_PAL ile aynı; altıncı basamak eklendi)
  const SK = ['#A8644A', '#BE7F5E', '#D49A72', '#E6B48B', '#F2CBA4', '#FADDBE'];
  const HAIR = ['#26170F', '#352016', '#45291D', '#5E3B29', '#7C543A', '#9A7052'];
  const BEARD = ['#2B1A12', '#3B271B', '#4B3123', '#654431', '#825B41', '#A07858'];

  // ---------------------------------------------------------------- madalyon gövdesi (300 nominal)
  const MC = 150, RO = 142, RI = 128; // merkez, altın halka dış/iç yarıçap
  function medFace(A) {
    const face = circ(MC, MC, RI + 2); const bb = bbC(MC, MC, RI + 2);
    A.fill(face, CREAM[2], { h: 136, ridge: false });
    // krem yüzey: geniş, yumuşak kıllı darbeler; kabartma sırtı neredeyse yok (küçülünce kirli çizgi vermesin)
    const big = { len: [44, 80], wid: [14, 22], dir: -0.62, dirJit: 0.22, bristle: 0.28, lJit: 0.01, hJit: 2, clip: face, bbox: bb, ridge: 0.03, hv: 5, hb: 134 };
    const wob = (x, y) => (NOISE(x * 0.02 + 4, y * 0.02) - 0.5) * 34;
    field(A, Object.assign({}, big, { color: CREAM[2], cover: 1.3 }));
    field(A, Object.assign({}, big, { color: CREAM[1], cover: 2.0, mask: (x, y) => Math.hypot(x - (MC - 34), y - (MC - 40)) + wob(x, y) > 142 }));
    field(A, Object.assign({}, big, { color: CREAM[3], cover: 2.2, mask: (x, y) => Math.hypot(x - (MC - 36), y - (MC - 44)) + wob(x, y) < 100 }));
    field(A, Object.assign({}, big, { len: [30, 56], color: CREAM[4], cover: 2.2, mask: (x, y) => Math.hypot(x - (MC - 56), y - (MC - 64)) + wob(x, y) < 54 }));
    // çerçevenin sol üstte yüzeye düşürdüğü gölge (iki basamak) ve sağ altta açık kenar
    const inner = circ(MC, MC, RI + 1);
    A.fill(inner, CREAM[1], { clip: [inner, cres(inner, 7, 9)], h: false });
    A.fill(inner, CREAM[0], { clip: [inner, cres(inner, 3, 4)], h: false });
    A.fill(inner, CREAM[5], { clip: [inner, cres(inner, -3, -4)], alpha: 0.9, h: false });
    return inner;
  }
  // simit halka: üç düz ton bandı (dış sol üst açık / iç sol üst koyu; dış sağ alt koyu / iç sağ alt açık) + uzun teğet darbeler
  function ringBands(A, cx, cy, rI, rO, R, o = {}) {
    const ring = annulus(cx, cy, rI, rO), outer = circ(cx, cy, rO), inner = circ(cx, cy, rI);
    const Wd = rO - rI; const sx = -LGT[0], sy = -LGT[1]; // ışıktan uzağa (sağ alt)
    A.fill(ring, R[3], { h: 150, ridge: 0.2 });
    const tang = (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2 + (A.r() - 0.5) * 0.05;
    field(A, { clip: ring, bbox: bbC(cx, cy, rO), color: R[3], len: [Wd * 3.4, Wd * 6], wid: [Wd * 0.3, Wd * 0.46], dir: tang, cover: 1.3, bristle: 0.45, ridge: 0.1, hv: 8, hb: 146, lJit: 0.03, max: o.max ?? 300 });
    const d1 = Wd * 0.34, d2 = Wd * 0.13;
    A.fill(outer, R[5], { clip: [ring, cres(outer, sx * d1, sy * d1)], h: 156, ridge: false });
    A.fill(outer, R[6], { clip: [ring, cres(outer, sx * d2, sy * d2)], h: 160, ridge: false });
    A.fill(outer, R[1], { clip: [ring, cres(outer, -sx * d1, -sy * d1)], h: 144, ridge: false });
    A.fill(outer, R[0], { clip: [ring, cres(outer, -sx * d2, -sy * d2)], h: 140, ridge: false });
    A.fill(ring, R[2], { clip: cres(inner, -sx * d1, -sy * d1), h: 146, ridge: false });
    A.fill(ring, R[1], { clip: cres(inner, -sx * d2, -sy * d2), h: 144, ridge: false });
    A.fill(ring, R[5], { clip: cres(inner, sx * d1, sy * d1), h: 156, ridge: false });
    // birkaç uzun teğet parıltı (sol üst dış bantta), birkaç kısa (sağ alt iç bantta)
    const RM = (rI + rO) / 2;
    for (let i = 0; i < 4; i++) { const a = -2.7 + i * 0.2 + (A.r() - 0.5) * 0.05; const rr = RM + Wd * 0.3; stroke(A, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2, Wd * (1.6 + A.r()), Wd * 0.2, R[6], { bristle: 0.3, ridge: 0.3, hb: 160, hv: 6 }); }
    for (let i = 0; i < 2; i++) { const a = 0.55 + i * 0.24; const rr = RM - Wd * 0.3; stroke(A, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2, Wd * 1.1, Wd * 0.16, R[5], { bristle: 0.3, ridge: 0.3, hb: 158, hv: 6 }); }
    // yüz ile halka arası ince oluk
    const x = A.S.x; x.save(); x.strokeStyle = o.groove ?? R[0]; x.globalAlpha = 0.5; x.lineWidth = 1.2 * A.k; x.beginPath(); x.arc(cx * A.k, cy * A.k, (rI + 0.3) * A.k, 0, TAU); x.stroke(); x.restore();
    return ring;
  }
  function medal(seed, item, k = 1.5) {
    const A = mk(300, 300, k, seed);
    // zemine düşen düz gölge hilali (sağ alt)
    A.fill(circ(MC + 4, MC + 6, RO), '#1E1638', { clip: cres(circ(MC + 4, MC + 6, RO), -4, -6), alpha: 0.24, h: false });
    under(A, [circ(MC, MC, RO)], { dx: 2.4, dy: 3, th: 0.42, freq: 0.06 });
    const face = medFace(A);
    item(A, face);
    ringBands(A, MC, MC, RI, RO, GOLD);
    return A.done(0.5, MC, MC);
  }
  const SH = '#CDAA7C';

  // ---------------------------------------------------------------- 1) nar
  function arilPath(x, y, r, rot) { return smoothPath([0, 1, 2, 3, 4, 5].map((i) => { const a = rot + (i / 6) * TAU; const rr = r * (i % 2 ? 0.9 : 1.06); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9]; }), true, 0.35); }
  function icNar(A, face) {
    const cx = 144, cy = 162, R = 68, r = A.r;
    const body = smoothPath(blobPts(cx, cy, R, R * 0.93, 26, 0.028, 5));
    const tx = cx + 3, ty = cy - R * 0.9;
    const arils = [[200, 228, 10, 0.4], [217, 210, 9, -0.3], [183, 242, 8.5, 0.9]].map(([x, y, rr, rot]) => ({ x, y, rr, p: arilPath(x, y, rr, rot) }));
    // taç: alçak boğaz, dışa açılan çanak yaprakları
    const C = (u, v) => [tx + u, ty + v];
    const tips = [[-29, -8], [-16, -14], [0, -15.5], [16, -13.5], [29, -7.5]], notches = [[-12, -3.5], [-5, -5], [6, -5], [12, -3]];
    const crown = new Path2D(); crown.moveTo(...C(-15, 10)); crown.lineTo(...C(-12, 1));
    crown.quadraticCurveTo(...C(-19, -1), ...C(...tips[0]));
    for (let i = 0; i < 4; i++) { const n = notches[i], t1 = tips[i + 1]; crown.quadraticCurveTo(...C(lerp(tips[i][0], n[0], 0.75), n[1] - 1), ...C(...n)); crown.quadraticCurveTo(...C(lerp(t1[0], n[0], 0.75), n[1] - 1), ...C(...t1)); }
    crown.quadraticCurveTo(...C(19, -1), ...C(13, 1)); crown.lineTo(...C(16, 10)); crown.quadraticCurveTo(...C(0, 16), ...C(-15, 10)); crown.closePath();
    castShadow(A, [body, crown, ...arils.map((a) => a.p)], 8, 10, SH, 0.75, face);
    // dal ve yapraklar (arkada, sağ üstte)
    A.line([[150, 108], [178, 92], [208, 80]], 3.4, STEM[1], { w1: 2.2, edge: false });
    leaf(A, 218, 100, 0.55, 54, 22, LEAF);
    leaf(A, 198, 64, -0.75, 56, 22, LEAF);
    // gövde: orta ton taban + taçtan inen meridyen darbeleri
    under(A, [body, crown], { dx: 2.6, dy: 3.2, bb: [cx - R - 4, ty - 20, cx + R + 4, cy + R + 4] });
    A.fill(body, NAR[3], { h: 140, ridge: 0.35 });
    const bb = bbC(cx, cy, R + 2);
    const mer = (x, y) => Math.atan2(y - (ty - 30), x - tx) + (r() - 0.5) * 0.2;
    const tan = (x, y) => Math.atan2(y - cy, x - cx) + Math.PI / 2 + (r() - 0.5) * 0.3;
    const st = { bbox: bb, bristle: 0.85, ridge: 0.2, hv: 12, hb: 130, lJit: 0.022 };
    field(A, Object.assign({}, st, { clip: body, color: NAR[3], len: [22, 38], wid: [8, 12], dir: mer, cover: 1.5 }));
    // ışık alanı ve parlak alan: düzensiz lekeler (sol üst), kendi tonlarında darbelerle
    const lit = smoothPath(blobPts(cx - 14, cy - 16, R * 0.76, R * 0.66, 16, 0.12, 21, -0.6));
    A.fill(body, NAR[4], { clip: [body, lit], h: 144, ridge: false });
    field(A, Object.assign({}, st, { clip: [body, lit], color: NAR[4], len: [18, 32], wid: [7, 11], dir: mer, cover: 1.7 }));
    const hi = smoothPath(blobPts(cx - 30, cy - 32, R * 0.28, R * 0.2, 12, 0.3, 22, -0.75));
    const hiIn = A.inside(hi);
    field(A, Object.assign({}, st, { clip: body, mask: hiIn, color: NAR[5], len: [12, 22], wid: [6, 9], dir: mer, cover: 3.2 }));
    // gölge: biçimi izleyen kavisli hilaller (düz dolgu), içinde teğet, kısa, dağınık darbeler
    const sh1 = [body, cres(body, -19, -22)], sh2 = [body, cres(body, -9.5, -11)], sh3 = [body, cres(body, -3.4, -4)];
    A.fill(body, NAR[2], { clip: sh1, h: 136, ridge: false });
    field(A, Object.assign({}, st, { clip: sh1, color: NAR[2], len: [12, 22], wid: [6, 9], dir: tan, cover: 1.9 }));
    A.fill(body, NAR[1], { clip: sh2, h: 134, ridge: false });
    field(A, Object.assign({}, st, { clip: sh2, color: NAR[1], len: [10, 18], wid: [5, 8], dir: tan, cover: 1.9 }));
    A.fill(body, '#9A1630', { clip: sh3, h: 136, ridge: false, alpha: 0.92 }); // kenarda yansıyan ılık ışık
    // parlaklık: iki kavisli açık darbe + tek beyaz nokta
    for (let i = 0; i < 4; i++) { const a = -2.5 + i * 0.17 + (r() - 0.5) * 0.05; const rr = R * (0.62 + r() * 0.08); stroke(A, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, a + Math.PI / 2, 12 + r() * 7, 4 + r() * 1.6, i % 2 ? NAR[5] : '#F5868C', { bristle: 0.5, ridge: 0.3, hb: 150, hv: 8 }); }
    stroke(A, cx - 33, cy - 37, -0.8, 13, 5.4, '#F9A8AC', { bristle: 0.4, ridge: 0.3, hb: 154, hv: 6 });
    stroke(A, cx - 31, cy - 41, -0.7, 6.5, 2.8, NAR[6], { bristle: 0.2, ridge: 0.3, hb: 160, hv: 4 });
    // taç
    A.fill(crown, '#8A1A2C', { h: 146, ridge: 0.35 });
    A.fill(crown, '#B5343E', { clip: [crown, rectPath(tx - 36, ty - 30, 34, 50)], h: 150, ridge: false });
    A.fill(crown, '#5A0C1C', { clip: [crown, cres(crown, -3, -2.4)], h: 142, ridge: false });
    for (const [u, v] of tips.slice(0, 3)) stroke(A, tx + u * 0.62, ty + v * 0.58, Math.atan2(v, u), 7, 2.4, '#D4545A', { bristle: 0.3, ridge: 0.3, hb: 152, hv: 6 });
    A.fill(ellipsePath(tx + 0.5, ty - 3.6, 10.5, 2.8), '#2E0612', { h: 128, ridge: false });
    for (let i = 0; i < 5; i++) stroke(A, tx - 6.4 + i * 3.2, ty - 5.2, -Math.PI / 2 + (i - 2) * 0.3, 4.6, 1.5, '#E8B86A', { bristle: 0, ridge: 0.3, hb: 156, hv: 4 });
    // taneler (önde, parlak)
    under(A, arils.map((a) => a.p), { dx: 1.6, dy: 2, th: 0.4, bb: [170, 196, 232, 256] });
    for (const a of arils) gem(A, a.p, a.x, a.y, a.rr, a.rr * 0.9, ARIL, { base: 1, litCol: ARIL[3], hlCol: ARIL[5], hlL: 0.55, refl: ARIL[3], reflA: 0.6 });
  }

  // ---------------------------------------------------------------- 2) buğday demeti
  function lensPath(x, y, ang, L, Wd) {
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
    const P = (u, v) => [x + ca * u + nx * v, y + sa * u + ny * v];
    const p = new Path2D(); const a = P(-L / 2, 0), b = P(L / 2, 0);
    p.moveTo(...a); p.bezierCurveTo(...P(-L * 0.24, -Wd * 0.64), ...P(L * 0.2, -Wd * 0.64), ...b);
    p.bezierCurveTo(...P(L * 0.2, Wd * 0.64), ...P(-L * 0.24, Wd * 0.64), ...a); p.closePath(); return p;
  }
  function icBugday(A, face) {
    const r = A.r; const kx = 150, ky = 200; // bağ noktası
    const angs = [-2.2, -1.88, -1.57, -1.26, -0.94], dists = [52, 64, 72, 64, 52], Ls = [62, 68, 72, 68, 62];
    const ears = angs.map((a, i) => ({ a, bx: kx + Math.cos(a) * dists[i], by: ky + Math.sin(a) * dists[i], L: Ls[i] }));
    // daneler: ince, uçları sivri, eksenden dışa açılan "v" sıraları
    for (const e of ears) {
      const ca = Math.cos(e.a), sa = Math.sin(e.a), nx = -sa, ny = ca; e.k = [];
      const lit = nx * LGT[0] + ny * LGT[1] > 0 ? 1 : -1;
      for (let j = 0; j < 7; j++) for (const sd of [-1, 1]) {
        const t = 0.06 + (j / 6) * 0.78 + (sd > 0 ? 0.055 : 0); const s = 1 - t * 0.34;
        const ka = e.a + sd * 0.62; const KL = 17 * s, KW = 8 * s;
        const px = e.bx + ca * e.L * t + nx * sd * 4.2 * s + Math.cos(ka) * KL * 0.16, py = e.by + sa * e.L * t + ny * sd * 4.2 * s + Math.sin(ka) * KL * 0.16;
        e.k.push({ x: px, y: py, a: ka, L: KL, W: KW, lit: sd === lit, t, sd });
      }
      e.k.push({ x: e.bx + ca * e.L * 0.95, y: e.by + sa * e.L * 0.95, a: e.a, L: 11, W: 5.4, lit: true, t: 0.95, sd: 0 });
      e.k.forEach((q) => (q.p = lensPath(q.x, q.y, q.a, q.L, q.W)));
    }
    // saplar: başaklardan bağa, bağdan yelpaze gibi açılan kesik uçlara
    const stalks = [];
    for (let i = 0; i < 9; i++) {
      const u = i / 8 - 0.5; const e = ears[Math.round((u + 0.5) * 4)];
      stalks.push([[kx + u * 90 + (r() - 0.5) * 4, 268 - Math.abs(u) * 16 + (r() - 0.5) * 4], [kx + u * 11, ky], [e.bx, e.by]]);
    }
    const shadowPaths = [];
    for (const s of stalks) shadowPaths.push(poly([[s[0][0] - 2.6, s[0][1]], [s[1][0] - 2.6, s[1][1]], [s[2][0] - 2.6, s[2][1]], [s[2][0] + 2.6, s[2][1]], [s[1][0] + 2.6, s[1][1]], [s[0][0] + 2.6, s[0][1]]]));
    for (const e of ears) for (const q of e.k) shadowPaths.push(q.p);
    castShadow(A, shadowPaths, 7, 9, SH, 0.7, face);
    // kılçıklar (en arkada): her daneden, koyu ve kalın (incelen)
    for (const e of ears) {
      for (const q of e.k) {
        if (q.t < 0.3 && q.sd) continue;
        const aw = e.a + q.sd * 0.2; const al = 16 + q.t * 16; const sx = q.x + Math.cos(q.a) * q.L * 0.42, sy = q.y + Math.sin(q.a) * q.L * 0.42;
        A.line([[sx, sy], [sx + Math.cos(aw) * al * 0.5, sy + Math.sin(aw) * al * 0.5 + 0.6], [sx + Math.cos(aw) * al, sy + Math.sin(aw) * al]], 2, q.sd ? WHEAT[1] : WHEAT[2], { w1: 0.8, edge: false });
      }
      const ca = Math.cos(e.a), sa = Math.sin(e.a);
      A.line([[e.bx + ca * e.L, e.by + sa * e.L], [e.bx + ca * (e.L + 26), e.by + sa * (e.L + 26)]], 2.2, WHEAT[1], { w1: 0.9, edge: false });
    }
    // saplar (koyu)
    under(A, [poly(stalks.flatMap((s) => [s[0]]).concat([[kx + 6, ky], [kx - 6, ky]]))], { dx: 2, dy: 2.4, th: 0.5 });
    stalks.forEach((s, i) => A.line(s, 4.6, [WHEAT[1], WHEAT[2], STEM[2], WHEAT[2], WHEAT[1], WHEAT[2], STEM[2], WHEAT[2], WHEAT[1]][i], { w1: 3.6 }));
    // başaklar: daneler dipten uca
    for (const e of ears) {
      under(A, e.k.map((q) => q.p), { dx: 1.5, dy: 1.9, th: 0.5, bb: [e.bx - 60, e.by - 90, e.bx + 60, e.by + 30] });
      for (const q of e.k) {
        const base = q.lit ? WHEAT[3] : WHEAT[2]; const lc = q.lit ? WHEAT[5] : WHEAT[4];
        const d = q.W * 0.5;
        A.fill(q.p, base, { h: 150, ridge: 0.35 });
        A.fill(q.p, lc, { clip: [q.p, cres(q.p, -LGT[0] * d, -LGT[1] * d)], h: 154, ridge: false });
        A.fill(q.p, WHEAT[1], { clip: [q.p, cres(q.p, LGT[0] * d * 0.7, LGT[1] * d * 0.7)], h: 146, ridge: false });
      }
    }
    // bağ: kırmızı kurdele
    const band = new Path2D();
    band.moveTo(kx - 23, ky - 9); band.quadraticCurveTo(kx, ky - 3, kx + 23, ky - 9);
    band.lineTo(kx + 24, ky + 5); band.quadraticCurveTo(kx, ky + 11, kx - 24, ky + 5); band.closePath();
    under(A, [band], { dx: 1.8, dy: 2.2, th: 0.35 });
    A.fill(band, RIBBON[3], { h: 150, ridge: 0.35 });
    field(A, { clip: band, bbox: [kx - 26, ky - 14, kx + 26, ky + 14], color: RIBBON[3], len: [10, 18], wid: [3.4, 5], dir: 0, dirJit: 0.12, cover: 2, bristle: 0.8, ridge: 0.2, hv: 10, hb: 146 });
    A.fill(band, RIBBON[4], { clip: [band, rectPath(kx - 30, ky - 14, 60, 10)], h: 154, ridge: false });
    A.fill(band, RIBBON[1], { clip: [band, rectPath(kx - 30, ky + 2.5, 60, 14)], h: 144, ridge: false });
    A.line([[kx + 6, ky + 4], [kx + 15, ky + 19], [kx + 13, ky + 32]], 5.4, RIBBON[2], { w1: 3.4 });
    A.line([[kx + 2, ky + 4], [kx - 7, ky + 19], [kx - 5, ky + 30]], 5.4, RIBBON[3], { w1: 3.4 });
    gem(A, ellipsePath(kx + 4, ky + 1, 7, 6, 0.3), kx + 4, ky + 1, 7, 6, RIBBON, { base: 3, hlCol: RIBBON[5] });
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
    const rr = rng(91); const berries = [];
    const rows = [[112, 4, 90], [133, 4, 86], [154, 4, 80], [175, 3, 62], [195, 3, 48], [214, 2, 32], [232, 1, 0]];
    rows.forEach(([y, n, w], j) => {
      for (let i = 0; i < n; i++) {
        const u = n === 1 ? 0 : i / (n - 1) - 0.5;
        const x = 148 + j * 1.6 + u * w + (rr() - 0.5) * 10, yy = y + (rr() - 0.5) * 9 + Math.abs(u) * 7;
        berries.push({ x, y: yy, r: 13 + rr() * 5, z: j + rr() * 1.4, dh: (rr() - 0.5) * 16 });
      }
    });
    berries.forEach((b) => (b.p = circ(b.x, b.y, b.r)));
    castShadow(A, berries.map((b) => b.p), 8, 10, SH, 0.75, face);
    // yaprak (arkada, sol üst): düz katlar + damar yönünde darbeler
    const lx = 102, ly = 80, lR = 40;
    const lp = vineLeafPath(lx, ly, lR, -2.5, 4); const lbb = [lx - 46, ly - 46, lx + 46, ly + 46];
    under(A, [lp], { dx: 1.8, dy: 2.2, bb: lbb });
    const vdir = (x, y) => Math.atan2(y - (ly + 18), x - (lx + 20)) + (A.r() - 0.5) * 0.4;
    const lst = { bbox: lbb, len: [12, 22], wid: [5, 8], dir: vdir, bristle: 1, ridge: 0.2, hv: 12, hb: 136, lJit: 0.03 };
    A.fill(lp, LEAF[2], { h: 140, ridge: 0.3 });
    field(A, Object.assign({}, lst, { clip: lp, color: LEAF[2], cover: 1.6 }));
    const llit = smoothPath(blobPts(lx - 12, ly - 14, 34, 28, 12, 0.14, 44, -0.6));
    A.fill(lp, LEAF[3], { clip: [lp, llit], h: 146, ridge: false });
    field(A, Object.assign({}, lst, { clip: [lp, llit], color: LEAF[3], cover: 1.8 }));
    A.fill(lp, LEAF[4], { clip: [lp, smoothPath(blobPts(lx - 22, ly - 22, 16, 12, 10, 0.18, 45, -0.6))], h: 150, ridge: false });
    A.fill(lp, LEAF[1], { clip: [lp, cres(lp, -6, -7)], h: 136, ridge: false });
    for (let i = 0; i < 5; i++) { const a = -2.5 + Math.PI + (i - 2) * 0.95; const L = i === 2 ? 34 : 26; A.line([[lx + 20, ly + 18], [lx + 20 + Math.cos(a) * L * 0.5 + 1, ly + 18 + Math.sin(a) * L * 0.5], [lx + 20 + Math.cos(a) * L, ly + 18 + Math.sin(a) * L]], 1.8, LEAF[5], { w1: 0.6, edge: false }); }
    A.line([[150, 106], [155, 82], [168, 62]], 5.4, STEM[1], { w1: 3.8 });
    A.line([[155, 86], [140, 96], [124, 98]], 2.8, STEM[2], { w1: 1.8, edge: false });
    // sülük (kıvrık)
    const tend = []; for (let i = 0; i <= 40; i++) { const t = i / 40; const a = t * TAU * 1.6; const rad = 11 * (1 - t * 0.75); tend.push([174 + t * 26 + Math.cos(a) * rad, 68 - t * 4 + Math.sin(a) * rad]); }
    A.line([[165, 68], ...tend], 2.2, LEAF[3], { w1: 1, edge: false });
    // taneler: astar yalnız salkımın dış hattında (gölge yanı); iç taneler üst üste biner, sıralar kırık
    under(A, berries.map((b) => b.p), { dx: 2.2, dy: 2.8, th: 0.42, bb: [90, 90, 210, 256] });
    berries.sort((a, b) => a.z - b.z);
    for (const b of berries) {
      const R = VIOLET.map((c) => shade(c, 0, 1, b.dh));
      gem(A, b.p, b.x, b.y, b.r, b.r, R, { base: 2, refl: shade(R[3], 0.02, 0.8), reflA: 0.55, hlCol: R[5], hlL: 0.42 });
    }
  }

  // ---------------------------------------------------------------- 4) su damlası ve küçük ırmak dalgası
  function icSu(A, face) {
    const bands = [
      { y: 196, a: 4.6, f: 0.07, ph: 1.1, col: WATER[4] },
      { y: 214, a: 4, f: 0.062, ph: 3.0, col: WATER[3] },
      { y: 234, a: 3.6, f: 0.055, ph: 0.4, col: WATER[2] },
      { y: 256, a: 3.2, f: 0.05, ph: 2.2, col: WATER[1] },
    ];
    const edge = (b, x) => b.y + Math.sin(x * b.f + b.ph) * b.a + Math.sin(x * 0.027 + b.ph * 2) * 2.4;
    const bandPath = (b) => { const p = new Path2D(); p.moveTo(10, 300); for (let x = 10; x <= 290; x += 5) p.lineTo(x, edge(b, x)); p.lineTo(290, 300); p.closePath(); return p; };
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, face); A.clip(A.S.hx, face);
    for (const b of bands) {
      const bp = bandPath(b);
      A.fill(bp, b.col, { h: 138, ridge: 0.25 });
      field(A, { clip: bp, bbox: [10, b.y - 8, 290, 290], color: b.col, len: [30, 56], wid: [6, 10], dir: 0, dirJit: 0.08, cover: 1.5, bristle: 0.8, ridge: 0.12, hv: 10, hb: 134, lJit: 0.03 });
    }
    A.S.x.restore(); A.S.hx.restore();
    // ışık yakalayan dalga sırtları
    const crest = (b, dy, a0, a1, col, w) => { const pts = []; for (let x = a0; x <= a1; x += 4) pts.push([x, edge(b, x) + dy]); A.line(pts, w, col, { w1: w * 0.5, taper: true, edge: false }); };
    crest(bands[0], 2.6, 36, 84, WATER[6], 3.2); crest(bands[0], 2.6, 212, 262, WATER[6], 3);
    crest(bands[1], 2.4, 62, 118, WATER[5], 2.8); crest(bands[1], 2.4, 176, 226, WATER[5], 2.6);
    crest(bands[2], 2.2, 92, 140, WATER[4], 2.4); crest(bands[2], 2.2, 196, 236, WATER[4], 2.2);
    crest(bands[3], 2, 120, 168, WATER[3], 2.2);
    // damlanın düşeceği yerde iki halka dalga (ön yarı parlak + koyu alt gölge, arka yarı ince)
    const ry0 = edge(bands[0], 150) + 7;
    for (const [rx, ry, w] of [[58, 10, 3.6], [34, 6, 3.2]]) {
      const arc = (a0, a1, dy) => { const pts = []; for (let i = 0; i <= 28; i++) { const a = lerp(a0, a1, i / 28); pts.push([150 + Math.cos(a) * rx, ry0 + dy + Math.sin(a) * ry]); } return pts; };
      A.line(arc(0.16, Math.PI - 0.16, 2.2), w * 0.9, WATER[2], { taper: true, edge: false });
      A.line(arc(0.12, Math.PI - 0.12, 0), w, WATER[6], { taper: true, edge: false });
      A.line(arc(Math.PI + 0.45, TAU - 0.45, 0), w * 0.6, WATER[6], { taper: true, edge: false });
    }
    // damla: 4 büyük düz yüzey + birkaç uzun darbe
    const dcx = 150, dcy = 120, dr = 44, tipY = 28;
    const drop = new Path2D();
    drop.moveTo(dcx, tipY);
    drop.bezierCurveTo(dcx + 6, tipY + 32, dcx + dr, dcy - dr * 0.75, dcx + dr, dcy);
    drop.arc(dcx, dcy, dr, 0, Math.PI, false);
    drop.bezierCurveTo(dcx - dr, dcy - dr * 0.75, dcx - 6, tipY + 32, dcx, tipY);
    drop.closePath();
    castShadow(A, [ellipsePath(dcx + 2, ry0 + 2, 30, 5)], 0, 0, WATER[1], 0.35, face);
    under(A, [drop], { dx: 2.4, dy: 3, th: 0.4, bb: [dcx - dr, tipY, dcx + dr + 4, dcy + dr + 4] });
    const dbb = [dcx - dr - 2, tipY - 2, dcx + dr + 2, dcy + dr + 2];
    const along = (x, y) => Math.atan2(y - (tipY - 30), x - dcx) + (A.r() - 0.5) * 0.12;
    A.fill(drop, WATER[3], { h: 142, ridge: 0.4 });
    field(A, { clip: drop, bbox: dbb, color: WATER[3], len: [34, 60], wid: [7, 10], dir: along, cover: 0.9, bristle: 0.6, ridge: 0.15, hv: 8, hb: 140, max: 14 });
    const litF = moved(drop, -17, 7);
    A.fill(drop, WATER[4], { clip: [drop, litF], h: 146, ridge: false });
    field(A, { clip: [drop, litF], bbox: dbb, color: WATER[4], len: [30, 50], wid: [6, 9], dir: along, cover: 0.9, bristle: 0.6, ridge: 0.15, hv: 8, hb: 144, max: 6 });
    A.fill(drop, WATER[1], { clip: [drop, cres(drop, -10, -7)], h: 138, ridge: false });
    const caus = ellipsePath(dcx + 8, dcy + 22, 25, 15, -0.15);
    A.fill(caus, WATER[5], { clip: [drop, caus, cres(drop, -5, -4)], h: 150, ridge: false });
    A.fill(drop, WATER[2], { clip: [drop, cres(drop, -4, -3)], alpha: 0.9, h: false });
    A.line([[dcx - 19, dcy - 36], [dcx - 27, dcy - 20], [dcx - 30, dcy + 2]], 6.6, '#FFFFFF', { w1: 3.6, taper: true, edge: false });
    stroke(A, dcx - 24, dcy + 15, -1.2, 6, 4.4, '#FFFFFF', { bristle: 0, ridge: 0.3, hb: 160, hv: 4 });
    stroke(A, dcx - 4, tipY + 26, -1.35, 9, 2.6, WATER[6], { bristle: 0, ridge: 0.3, hb: 158, hv: 4 });
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
    const r = A.r; const cx = 152, cy = 126, PL = 70;
    const angs = [-1.57, -0.32, 0.94, 2.2, 3.46].map((a) => a + 0.18);
    const petals = angs.map((a) => petalPath(cx, cy, a, PL, 62, 0.07));
    const stem = [[cx + 2, cy + 40], [cx - 2, cy + 92], [cx - 8, 264]];
    const lv = [[cx - 28, 220, -2.6, 54, 21], [cx + 22, 238, -0.45, 48, 19]];
    castShadow(A, [...petals, circ(cx, cy, 18), poly([[cx - 1, cy + 40], [cx + 4, cy + 40], [cx - 5, 264], [cx - 11, 264]])], 8, 10, SH, 0.75, face);
    A.line(stem, 6.4, LEAF[2], { w1: 4.6 });
    for (const [x, y, a, l, w] of lv) leaf(A, x, y, a, l, w, LEAF);
    // taç yapraklar: ışıktan uzak olanlar önce; dipte koyu, uçta açık; düşük kabartma
    const litOf = (a) => Math.cos(a) * LGT[0] + Math.sin(a) * LGT[1];
    const order = angs.map((a, i) => [i, litOf(a)]).sort((p, q) => p[1] - q[1]);
    const bb = [cx - PL - 4, cy - PL - 4, cx + PL + 4, cy + PL + 4];
    const rdir = (x, y) => Math.atan2(y - cy, x - cx) + (r() - 0.5) * 0.22;
    under(A, petals, { dx: 2.2, dy: 2.8, th: 0.44, bb });
    const pst = { bbox: bb, dir: rdir, bristle: 0.8, ridge: 0.14, hv: 10, hb: 138, lJit: 0.025 };
    const zMid = smoothPath(blobPts(cx, cy, PL * 0.56, PL * 0.56, 30, 0.16, 81)), zIn = smoothPath(blobPts(cx, cy, PL * 0.31, PL * 0.31, 22, 0.2, 82));
    const zOut = (() => { const q = new Path2D(); q.rect(cx - PL - 20, cy - PL - 20, PL * 2 + 40, PL * 2 + 40); q.addPath(smoothPath(blobPts(cx, cy, PL * 0.76, PL * 0.76, 30, 0.12, 83))); return [q, 'evenodd']; })();
    for (const [i, lit] of order) {
      const p = petals[i]; const L = lit > 0.3 ? 1 : lit > -0.3 ? 0 : -1;
      const outer = PINK[L > 0 ? 4 : 3], mid = PINK[L > 0 ? 3 : 2];
      A.fill(p, outer, { h: 140, ridge: 0.3 });
      field(A, Object.assign({}, pst, { clip: p, color: outer, len: [16, 30], wid: [6, 10], cover: 1.6 }));
      A.fill(p, mid, { clip: [p, zMid], h: 142, ridge: false });
      field(A, Object.assign({}, pst, { clip: [p, zMid], color: mid, len: [14, 26], wid: [6, 9], cover: 1.6 }));
      A.fill(p, PINK[1], { clip: [p, zIn], h: 140, ridge: false });
      field(A, Object.assign({}, pst, { clip: [p, zIn], color: PINK[1], len: [10, 18], wid: [5, 8], cover: 1.6 }));
      if (L > 0) { A.fill(p, PINK[5], { clip: [p, zOut], h: 146, ridge: false }); field(A, Object.assign({}, pst, { clip: [p, zOut], color: PINK[5], len: [10, 20], wid: [5, 8], cover: 1.4 })); }
      // tek, açık damar
      const a = angs[i];
      A.line([[cx + Math.cos(a) * PL * 0.14, cy + Math.sin(a) * PL * 0.14], [cx + Math.cos(a + 0.03) * PL * 0.34, cy + Math.sin(a + 0.03) * PL * 0.34], [cx + Math.cos(a) * PL * 0.56, cy + Math.sin(a) * PL * 0.56]], 1.8, PINK[2], { w1: 0.5, edge: false });
    }
    // göbek: düzensiz disk üstünde sarı-turuncu benekler (iç içe disk ve nokta halkası yok)
    const cdisk = smoothPath(blobPts(cx, cy, 18.5, 17.5, 12, 0.1, 31, 0.3));
    under(A, [cdisk], { dx: 1.5, dy: 1.9, th: 0.3, bb: bbC(cx, cy, 22) });
    A.fill(cdisk, SUN[2], { h: 150, ridge: 0.35 });
    const sf = Paint.sphere(cx - 4, cy - 5, 21, LGT, 0.1);
    for (let i = 0; i < 64; i++) {
      const a = r() * TAU, dd = Math.sqrt(r()) * 16.5; const x = cx + Math.cos(a) * dd, y = cy + Math.sin(a) * dd;
      const v = sf(x, y) + (r() - 0.5) * 0.25; const col = v > 0.78 ? SUN[4] : v > 0.58 ? SUN[3] : v > 0.36 ? SUN[2] : r() < 0.5 ? SUN[1] : '#D8662A';
      stroke(A, x, y, r() * TAU, 3.4 + r() * 2.6, 2.2 + r() * 1.4, col, { bristle: 0.2, ridge: 0.45, hb: 150, hv: 22 });
    }
    // ercikler: kenarda düzensiz, ışınsal kısa izler
    for (let i = 0; i < 17; i++) {
      const a = (i / 17) * TAU + (r() - 0.5) * 0.3; const rr = 17.5 + r() * 4.5; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      stroke(A, x, y, a + (r() - 0.5) * 0.4, 4 + r() * 2.4, 2.2 + r() * 0.8, r() < 0.45 ? '#D8562F' : r() < 0.5 ? SUN[1] : SUN[3], { bristle: 0, ridge: 0.45, hb: 152, hv: 16 });
    }
    stroke(A, cx - 7, cy - 8, -0.7, 5, 2.6, SUN[5], { bristle: 0, ridge: 0.3, hb: 160, hv: 4 });
  }

  // ---------------------------------------------------------------- 6) bal peteği (kovandan çıkmış petek dilimi, altından tek uzun damla)
  function icBal(A, face) {
    const r = A.r; const cx = 150, cy = 144, rot = -0.12; const SWd = 184, SHt = 140;
    const cr = Math.cos(rot), sr = Math.sin(rot);
    const Lc = (u, v) => [cx + u * cr - v * sr, cy + u * sr + v * cr];
    const slab = smoothPath(wobble(rrPts(-SWd / 2, -SHt / 2, SWd, SHt, 24, 8), 3.4, 77).map(([u, v]) => Lc(u, v)));
    // damla: alt kenardan sarkan ince akış + armut uç
    const [dx0, dy0] = Lc(34, SHt / 2 - 6); const bx = dx0 + 3, by = dy0 + 44;
    const drip = smoothPath([[dx0 - 13, dy0 - 8], [dx0 - 5, dy0 + 7], [bx - 2.6, by - 14], [bx - 6.6, by - 2], [bx - 5, by + 5], [bx, by + 7.6], [bx + 5, by + 5], [bx + 6.6, by - 2], [bx + 2.6, by - 14], [dx0 + 6, dy0 + 7], [dx0 + 15, dy0 - 8]], true, 0.5);
    castShadow(A, [slab, drip], 8, 10, SH, 0.75, face);
    // petek kalınlığı (sağ alt yan yüz)
    A.fill(moved(slab, 4.5, 6.5), WAX[0], { h: 138, ridge: 0.3 });
    under(A, [moved(slab, 4.5, 6.5), drip], { dx: 2.2, dy: 2.8, th: 0.42, bb: [40, 60, 270, 272] });
    // mum duvarları (taban) + kenar bantları
    A.fill(slab, WAX[3], { h: 148, ridge: 0.3 });
    // hücreler: sivri tepeli altıgenler, kaydırmalı sıralar, köşeleri hafif düzensiz
    const rh = 13.2, dxh = Math.sqrt(3) * rh, dyh = 1.5 * rh;
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, slab); A.clip(A.S.hx, slab);
    for (let j = -5; j <= 5; j++) {
      for (let i = -6; i <= 6; i++) {
        const u = i * dxh + (j & 1 ? dxh / 2 : 0) - 3, v = j * dyh + 3;
        if (Math.abs(u) > SWd / 2 + rh * 0.6 || Math.abs(v) > SHt / 2 + rh * 0.6) continue;
        const pts = []; for (let q = 0; q < 6; q++) { const a = rot - Math.PI / 2 + (q * Math.PI) / 3; const rr = rh * 0.8 + (r() - 0.5) * 1.6; const [px, py] = Lc(u, v); pts.push([px + Math.cos(a) * rr, py + Math.sin(a) * rr]); }
        const cp = smoothPath(pts, true, 0.18); const [px, py] = Lc(u, v);
        const top = v < -SHt * 0.12; const roll = r();
        if (top && roll < 0.6) { // mum kapaklı hücre
          A.fill(cp, WAX[4], { h: 152, ridge: 0.2 });
          A.fill(cp, WAX[5], { clip: [cp, cres(cp, 3, 3.6)], h: 154, ridge: false });
          A.fill(cp, WAX[2], { clip: [cp, cres(cp, -2.4, -3)], h: 150, ridge: false });
        } else { // bal dolu: koyu kehribar, sol üstte duvar gölgesi, sağ altta içten aydınlanan bal, parlak iz
          A.fill(cp, HONEY[2], { h: 134, ridge: false });
          A.fill(cp, HONEY[1], { clip: [cp, cres(cp, 3.4, 4.2)], h: 132, ridge: false });
          A.fill(cp, HONEY[4], { clip: [cp, cres(cp, -4.2, -5)], h: 136, ridge: false });
          if (r() < 0.55) { const ha = rot - 0.5 + (r() - 0.5) * 1.1, hr = rh * (0.22 + r() * 0.2); stroke(A, px - rh * 0.28 + (r() - 0.5) * 3, py - rh * 0.3 + (r() - 0.5) * 3, ha, rh * (0.3 + r() * 0.35), 1.6 + r() * 1.2, r() < 0.5 ? HONEY[6] : HONEY[5], { bristle: 0, ridge: 0.3, hb: 150, hv: 6 }); void hr; }
        }
      }
    }
    A.S.x.restore(); A.S.hx.restore();
    A.fill(slab, WAX[5], { clip: [slab, cres(slab, 3.2, 4)], h: 156, ridge: false });
    A.fill(slab, WAX[1], { clip: [slab, cres(slab, -2.6, -3.2)], h: 144, ridge: false });
    // alt kenarda toplanan bal ve damla
    const pool = ellipsePath(dx0 + 1, dy0 - 3, 24, 8, rot);
    A.fill(pool, HONEY[3], { clip: union2(slab, drip), h: 150, ridge: false });
    A.fill(drip, HONEY[3], { h: 150, ridge: 0.3 });
    A.fill(drip, HONEY[2], { clip: [drip, cres(drip, -3.4, -2)], h: 146, ridge: false });
    A.line([[dx0 - 6, dy0 + 2], [bx - 3, by - 16], [bx - 4, by - 3]], 2.4, HONEY[5], { w1: 1.4, taper: true, edge: false });
    A.line([[dx0 - 14, dy0 - 6], [dx0 - 2, dy0 - 9], [dx0 + 14, dy0 - 7]], 2.4, HONEY[5], { taper: true, edge: false });
    stroke(A, bx - 2.6, by + 0.5, -1.0, 4.5, 2.6, '#FFF8E2', { bristle: 0, ridge: 0.3, hb: 160, hv: 4 });
  }

  // tam boy madalyonlar (nar dalış için k=3: 900 px, ~6x büyütmeye kadar keskin)
  defSprite('ikon-nar', () => medal(3101, icNar, 3));
  defSprite('ikon-bugday', () => medal(3102, icBugday));
  defSprite('ikon-uzum', () => medal(3103, icUzum));
  defSprite('ikon-su', () => medal(3104, icSu));
  defSprite('ikon-cicek', () => medal(3105, icCicek));
  defSprite('ikon-bal', () => medal(3106, icBal));
  // sönük eşler: opak, soldurulmuş ve serin gölgeye çekilmiş (saydamlıkla söndürmek yerine)
  const ICONS = ['ikon-nar', 'ikon-bugday', 'ikon-uzum', 'ikon-su', 'ikon-cicek', 'ikon-bal'];
  function dimCanvas(src) {
    const c = makeCanvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0);
    const id = x.getImageData(0, 0, c.width, c.height), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
      d[i] = lerp(d[i], l, 0.72) * 0.6; d[i + 1] = lerp(d[i + 1], l, 0.72) * 0.63; d[i + 2] = lerp(d[i + 2], l, 0.72) * 0.78;
    }
    x.putImageData(id, 0, 0); return c;
  }
  for (const n of ICONS) defSprite(n + '-sonuk', () => { const s = spr(n); return { canvas: dimCanvas(s.canvas), px: s.px, py: s.py, k: s.k }; });
  // madalyonu sönüklük oranıyla çiz: dim 0 → asıl, 1 → sönük eş; ara değerler opak geçiş (alfa yalnız genel görünürlük)
  function drawMed(ctx, name, x, y, sc = 1, dim = 0, alpha = 1, rot = 0) {
    if (alpha <= 0.001) return;
    if (dim < 0.999) drawSpr(ctx, spr(name), x, y, sc, rot, alpha);
    if (dim > 0.001) drawSpr(ctx, spr(name + '-sonuk'), x, y, sc, rot, dim >= 0.999 ? alpha : alpha * dim);
  }

  // ---------------------------------------------------------------- 2) kâğıt pano (880×1240 kart, merkez pivot)
  const KW = 880, KH = 1240, KM = 40; // kart boyu, gölge/kenar payı
  const PAPER = ['#E2CAA4', '#EEDCBE', '#F6E7CF', '#F9EDD9', '#FCF3E4'];
  // kartın yerel koordinatları (merkez 0,0): kılavuz çizgileri; marginX yalnız metin girinti kılavuzu (boyanmaz)
  const KAGIT = { w: KW, h: KH, ruleGap: 64, marginX: -KW / 2 + 116, rules: [] };
  for (let y = -KH / 2 + 150; y < KH / 2 - 60; y += KAGIT.ruleGap) KAGIT.rules.push(y);
  function paintKagit() {
    const A = mk(KW + 2 * KM, KH + 2 * KM, 1, 4201); const S = A.S;
    const x0 = KM, y0 = KM, cx = KM + KW / 2, cy = KM + KH / 2;
    const card = smoothPath(wobble(rrPts(x0, y0, KW, KH, 30, 18), 2.4, 7));
    const cardOut = smoothPath(wobble(rrPts(x0 - 3, y0 - 3, KW + 6, KH + 6, 33, 18), 2.4, 7));
    // basamaklı gölge: iki koyu düz kat (orta tonlu zeminde okunur)
    A.fill(moved(card, 16, 22), '#0C0818', { alpha: 0.2, h: false });
    A.fill(moved(card, 7, 10), '#0C0818', { alpha: 0.26, h: false });
    // gölge yanında düzensiz kırık astar (koyu zeminde de kartın kenarını ayırır)
    under(A, [card], { dx: 3.2, dy: 4, th: 0.4, freq: 0.028, grow: 1.5 });
    A.fill(card, PAPER[2], { h: 136, ridge: 0.3 });
    const st = { clip: card, bbox: [x0, y0, x0 + KW, y0 + KH], len: [90, 180], wid: [18, 28], dir: (x, y) => -0.04 + (NOISE(x * 0.004, y * 0.004) - 0.5) * 0.22, bristle: 0.4, ridge: 0.05, hv: 5, hb: 134, lJit: 0.012, hJit: 3 };
    // kenara göre basamaklar: üst-sol kenar boyunca açık bant, köşede daha açık; sağ-alt kenarda ince koyu bant (leke yok)
    const n2 = (x, y) => (NOISE(x * 0.006 + 2, y * 0.006) - 0.5);
    const dTL = (x, y) => Math.min(x - x0, y - y0), dBR = (x, y) => Math.min(x0 + KW - x, y0 + KH - y);
    field(A, Object.assign({}, st, { color: PAPER[2], cover: 1.3 }));
    field(A, Object.assign({}, st, { color: PAPER[3], cover: 1.6, mask: (x, y) => dTL(x, y) + n2(x, y) * 90 < 110 }));
    field(A, Object.assign({}, st, { len: [70, 140], color: PAPER[4], cover: 1.6, mask: (x, y) => Math.hypot(x - x0, y - y0) + n2(x, y) * 120 < 260 }));
    field(A, Object.assign({}, st, { len: [80, 150], wid: [10, 14], color: PAPER[1], cover: 1.6, dir: (x, y) => (x0 + KW - x < y0 + KH - y ? Math.PI / 2 : 0) + (A.r() - 0.5) * 0.04, mask: (x, y) => dBR(x, y) + n2(x, y) * 16 < 16 }));
    // fırçalı kenarlar: kenara paralel, dışa hafif taşan kuru uçlu darbeler (üst/sol ışıkta, alt/sağ gölgede)
    const r = A.r;
    S.x.save(); S.hx.save(); S.x.clip(A.T(cardOut)); S.hx.clip(A.T(cardOut));
    for (let x = x0 + 30; x < x0 + KW - 30; x += 46 + r() * 30) { stroke(A, x, y0 + 6 + r() * 2.5, (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[3], { bristle: 0.5, ridge: 0.25 }); stroke(A, x + 20, y0 + KH - 6 - r() * 2.5, (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[1], { bristle: 0.5, ridge: 0.25 }); }
    for (let y = y0 + 30; y < y0 + KH - 30; y += 46 + r() * 30) { stroke(A, x0 + 6 + r() * 2.5, y, Math.PI / 2 + (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[3], { bristle: 0.5, ridge: 0.25 }); stroke(A, x0 + KW - 6 - r() * 2.5, y + 20, Math.PI / 2 + (r() - 0.5) * 0.03, 70 + r() * 60, 11 + r() * 4, PAPER[1], { bristle: 0.5, ridge: 0.25 }); }
    S.x.restore(); S.hx.restore();
    // kenar ışığı ve gölge hattı
    const x = S.x; x.save(); x.lineCap = 'round'; x.clip(A.T(card));
    const edgeLine = (pts, col, a, w) => { x.strokeStyle = col; x.globalAlpha = a; x.lineWidth = w; x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke(); };
    edgeLine([[x0 + 34, y0 + 3.5], [x0 + KW - 40, y0 + 3]], PAPER[4], 0.85, 2.2);
    edgeLine([[x0 + 3.5, y0 + 36], [x0 + 3, y0 + KH - 40]], PAPER[4], 0.8, 2.2);
    edgeLine([[x0 + 40, y0 + KH - 3], [x0 + KW - 34, y0 + KH - 3.5]], PAPER[0], 0.7, 2);
    edgeLine([[x0 + KW - 3, y0 + 40], [x0 + KW - 3.5, y0 + KH - 34]], PAPER[0], 0.6, 2);
    // kılavuz çizgileri: çok soluk, sıcak gri, kuru fırça boşluklu (okul defteri değil; kenar boşluğu çizgisi yok)
    for (const ry of KAGIT.rules) {
      let xx = x0 + 60 + r() * 30; const yy = cy + ry; const xEnd = x0 + KW - 60 - r() * 30;
      while (xx < xEnd) {
        const L = 60 + r() * 260; const xe = Math.min(xEnd, xx + L);
        x.strokeStyle = '#A8916F'; x.globalAlpha = 0.09 + r() * 0.06; x.lineWidth = 1.4 + r() * 1.2;
        x.beginPath(); x.moveTo(xx, yy + (r() - 0.5) * 1.6); x.quadraticCurveTo((xx + xe) / 2, yy + (r() - 0.5) * 3, xe, yy + (r() - 0.5) * 1.6); x.stroke();
        xx = xe + 6 + r() * 30;
      }
    }
    x.restore();
    return A.done(0.45, cx, cy);
  }
  defSprite('kagit-panel', paintKagit);

  // ---------------------------------------------------------------- 3) duyu madalyonları (220 nominal; koyu çivit zemin için)
  const DC = 110, DR = 86, DRO = 96; // merkez, disk (halka iç) ve halka dış yarıçapı
  const TEAL = ['#14606A', '#1F8A8E', '#2DAAA8', '#3CC4C0', '#6ADCD4', '#9BF0E8', '#E2FFFA'];
  const INDIGO = ['#0A1130', '#0F1940', '#142150', '#1A2B62', '#213674', '#2A4286'];
  const LIP = ['#6E3A32', '#8E5246', '#A46656', '#B87A68', '#D49A86', '#E6B8A6'];
  const BDD = [20, 20, 200, 200];
  function senseMed(seed, item, o = {}) {
    const A = mk(220, 220, 1.5, seed);
    // ışıyan dış hale: iki basamaklı saydam turkuaz halka, kenarı fırçalı
    layer(A, 0.2, () => { A.fill(annulus(DC, DC, DRO - 2, DRO + 11), TEAL[5], { h: false }); for (let i = 0; i < 26; i++) { const a = (i / 26) * TAU + A.r() * 0.2; stroke(A, DC + Math.cos(a) * (DRO + 9), DC + Math.sin(a) * (DRO + 9), a + Math.PI / 2, 22, 5, TEAL[5], { height: false }); } });
    layer(A, 0.32, () => { A.fill(annulus(DC, DC, DRO - 2, DRO + 5), TEAL[5], { h: false }); });
    under(A, [circ(DC, DC, DRO)], { dx: 1.8, dy: 2.3, th: 0.42, freq: 0.07 });
    const disk = circ(DC, DC, DR + 2); const bb = bbC(DC, DC, DR + 2);
    A.fill(disk, INDIGO[2], { h: 134, ridge: false });
    const st = { clip: disk, bbox: bb, len: [26, 48], wid: [10, 15], dir: -0.62, dirJit: 0.3, bristle: 0.8, ridge: 0.1, hv: 8, hb: 132, lJit: 0.02 };
    field(A, Object.assign({}, st, { color: INDIGO[2], cover: 1.6 }));
    field(A, Object.assign({}, st, { color: INDIGO[3], cover: 2.4, mask: (x, y) => Math.hypot(x - (DC - 6), y - (DC - 8)) < 64 }));
    field(A, Object.assign({}, st, { color: INDIGO[4], cover: 2.4, len: [20, 36], mask: (x, y) => Math.hypot(x - (DC - 12), y - (DC - 14)) < 38 }));
    const inner = circ(DC, DC, DR + 1);
    A.fill(inner, INDIGO[0], { clip: [inner, cres(inner, 6, 8)], h: false });
    A.fill(inner, INDIGO[4], { clip: [inner, cres(inner, -3, -4)], alpha: 0.8, h: false });
    item(A, inner);
    // yakın çekim (yüz kesiti) ikonlarda halkanın yüze düşürdüğü gölge: iki düz basamak
    if (o.crop) {
      A.fill(inner, '#1A0F2A', { clip: [inner, cres(inner, 9, 11)], alpha: 0.22, h: false });
      A.fill(inner, '#1A0F2A', { clip: [inner, cres(inner, 4, 5)], alpha: 0.32, h: false });
    }
    ringBands(A, DC, DC, DR, DRO, TEAL, { max: 220, groove: '#0A2A30' });
    { const x = A.S.x; x.save(); x.strokeStyle = TEAL[5]; x.globalAlpha = 0.85; x.lineWidth = 1.4 * A.k; x.beginPath(); x.arc(DC * A.k, DC * A.k, (DR + 0.4) * A.k, 0, TAU); x.stroke(); x.restore(); }
    return A.done(o.emboss ?? 0.42, DC, DC);
  }
  const DSH = '#0A1029'; // ikonların zemine düşen gölgesi
  // kıl kümesi (kaş, bıyık, sakal): düz taban + ince, sık, yönlü darbeler; ton ramp+shade basamaklı
  function hairMass(A, p, R, o) {
    A.fill(p, R[o.base ?? 2], { clip: o.clip, h: 140, ridge: 0.15 });
    field(A, { clip: o.clip ? [p, ...normC(o.clip)] : p, bbox: o.bb, ramp: o.ramp || R.slice(1, 5), shade: o.shade, dir: o.dir, len: o.len || [8, 15], wid: o.wid || [2.6, 4], cover: o.cover ?? 2.6, bristle: 0.7, ridge: 0.2, hv: 14, hb: 136, lJit: 0.03, hJit: 5, jitter: 3, jitterFreq: 0.05, noise: 0.06 });
  }
  // kıl uçları: çizgi boyunca kısa ince darbeler (kenarı kırar)
  function fray(A, pts, cols, o) {
    const r = A.r;
    const st = o.step ?? 2;
    for (let i = 0; i < pts.length; i += st > 1 ? 1 + Math.floor(r() * (2 * st - 1)) : 1) {
      const [x, y] = pts[i]; const a = o.ang(x, y, i) + (r() - 0.5) * (o.jit ?? 0.5);
      const L = lerp(o.len[0], o.len[1], r());
      stroke(A, x + Math.cos(a) * L * (o.push ?? 0.3), y + Math.sin(a) * L * (o.push ?? 0.3), a, L, lerp(o.wid[0], o.wid[1], r()), r.pick(cols), { bristle: 0, ridge: 0.15, hb: 140, hv: 10, alpha: o.alpha ?? 0.9 });
    }
  }

  // göz (önden yakın çekim): kalın, alçak, düze yakın kaş; ağır kapak; koyu kahve iris; kirpik yok
  function icGoz(A, face) {
    const r = A.r;
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, face); A.clip(A.S.hx, face);
    plane(A, face, SK[2], { bb: BDD, dir: -0.3, len: [26, 46], wid: [10, 15], cover: 1.4 });
    // alın (ışıkta) ve sol üstte daha açık leke
    const fore = smoothPath([[10, 10], [210, 10], [210, 62], [176, 62], [140, 58], [100, 58], [62, 62], [30, 72], [10, 78]]);
    plane(A, fore, SK[3], { bb: BDD, dir: -0.2 });
    plane(A, smoothPath(blobPts(58, 40, 50, 24, 12, 0.12, 41, -0.2)), SK[4], { clip: fore, bb: BDD, dir: -0.2 });
    // göz çukuru: kaşın altında gölge bandı; burun yanında derin köşe; burun yanı (ışıkta)
    const socket = smoothPath([[24, 86], [60, 78], [100, 74], [140, 72], [176, 72], [204, 80], [204, 108], [178, 104], [150, 98], [120, 94], [94, 94], [70, 98], [48, 106], [24, 112]]);
    plane(A, socket, mix(SK[1], SK[2], 0.5), { bb: BDD, dir: -0.1 });
    plane(A, smoothPath(blobPts(64, 176, 58, 32, 12, 0.1, 43, -0.15)), SK[3], { bb: BDD, dir: -0.4 });
    plane(A, smoothPath([[184, 58], [214, 58], [214, 214], [192, 214], [190, 160], [186, 116]]), mix(SK[2], SK[3], 0.6), { bb: BDD, dir: Math.PI / 2 });
    plane(A, smoothPath([[156, 96], [178, 90], [188, 104], [190, 136], [180, 146], [164, 130], [154, 114]]), SK[1], { bb: BDD, dir: 1.2 });
    // üst kapak: kıvrımla kirpik hattı arası (ışıkta), kıvrım çok soluk
    const P0 = [56, 118], P3 = [156, 120];
    const upper = bez(P0, [78, 101], [128, 99], P3), lower = bez(P3, [130, 134], [80, 136], P0);
    const crease = bez([48, 112], [70, 92], [132, 88], [168, 110], 24);
    const lid = poly([...crease, ...upper.slice().reverse()]);
    plane(A, lid, SK[3], { bb: BDD, dir: 0, len: [20, 34], wid: [7, 10] });
    plane(A, smoothPath(blobPts(92, 101, 24, 6, 10, 0.12, 46, -0.05)), SK[4], { clip: lid, bb: BDD, tex: false });
    layer(A, 0.4, () => A.line(crease.slice(3, 17), 1.8, SK[1], { taper: true, edge: false }));
    // kaş: kalın, alçak, düze yakın; dış uca doğru incelir; kıllar kaş boyunca yatık, iç uçta hafif dik
    const browTop = bez([38, 84], [70, 68], [130, 61], [180, 64], 20), browBot = bez([182, 80], [140, 80], [84, 82], [42, 89], 20);
    const brow = smoothPath([...browTop, ...browBot], true, 0.3);
    const bdir = (x) => lerp(-1.75, -3.0, clamp((182 - x) / 144)) + (r() - 0.5) * 0.25;
    hairMass(A, brow, HAIR, { base: 1, bb: [34, 56, 186, 94], dir: (x) => bdir(x), shade: (x, y) => clamp(1.0 - (y - 61) / 24 - (x - 40) / 600), len: [10, 17], wid: [2.8, 4.2], cover: 3 });
    fray(A, browTop.slice(4), [HAIR[2], HAIR[3], HAIR[1]], { step: 2, ang: (x) => bdir(x) + 0.15, len: [3, 6.5], wid: [1.5, 2.2], push: 0.15, jit: 0.4, alpha: 0.85 });
    fray(A, browBot.slice(2, -3), [HAIR[1], HAIR[2]], { step: 3, ang: (x) => bdir(x) + Math.PI - 0.2, len: [2.5, 4.5], wid: [1.3, 1.8], push: 0.05, alpha: 0.7 });
    // göz: badem, ak kısım sıcak ve soluk (beyaz değil)
    const eye = poly([...upper, ...lower.slice(1)]);
    A.fill(eye, '#E9DACA', { h: 146, ridge: 0.2 });
    A.fill(eye, '#C8AE9C', { clip: [eye, cres(eye, 0, 8)], h: 144, ridge: false });
    A.fill(ellipsePath(150, 120, 6, 4.4, 0.2), '#C27466', { clip: eye, h: 144, ridge: false });
    const ix = 104, iy = 117, IR = 17.5; const iris = circ(ix, iy, IR);
    const IRIS = ['#120A06', '#24150E', '#3A2418', '#5A3A26', '#7A5236'];
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, eye); A.clip(A.S.hx, eye);
    A.fill(iris, IRIS[2], { h: 150, ridge: false });
    A.fill(iris, IRIS[3], { clip: [iris, cres(iris, -5, -6)], h: 152, ridge: false }); // içbükey: sağ alt aydınlık
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + r() * 0.3; A.line([[ix + Math.cos(a) * 8, iy + Math.sin(a) * 8], [ix + Math.cos(a) * (IR - 3), iy + Math.sin(a) * (IR - 3)]], 1.6, i % 2 ? IRIS[4] : IRIS[1], { w1: 0.8, edge: false }); }
    A.fill(annulus(ix, iy, IR - 2.6, IR), IRIS[0], { alpha: 0.9, h: 146, ridge: false });
    A.fill(circ(ix, iy, 7.4), '#0A0604', { h: 140, ridge: false });
    A.fill(eye, '#2A1420', { clip: [eye, cres(eye, 0, 7)], alpha: 0.3, h: false }); // üst kapağın gölgesi
    A.S.x.restore(); A.S.hx.restore();
    A.fill(ellipsePath(ix - 7, iy - 7, 4.2, 3.6, -0.5), '#FFFFFF', { h: 176, ridge: false });
    A.fill(circ(ix + 6, iy + 7, 1.5), '#F4E8DC', { h: 170, ridge: false });
    // kirpik hattı: köşede biter (taşma yok); alt kapak: açık ıslak kenar + çok soluk alt çizgi
    A.line(upper, 5, '#2A1A14', { w1: 2.4, taper: true, edge: false });
    A.line(lower.slice(2, -2).map(([x, y]) => [x, y + 2]), 2.4, SK[4], { taper: true, edge: false });
    layer(A, 0.45, () => A.line(bez([74, 138], [92, 146], [124, 146], [142, 136], 16), 1.8, SK[1], { taper: true, edge: false }));
    A.S.x.restore(); A.S.hx.restore();
  }

  // kulak (yandan; yüz sağa bakar → kıvrık kenar solda/üstte, tragus sağda ve dış hattın içinde); ses yayları soldan kulağa iner
  function icKulak(A, face) {
    const pts = [[124, 50], [112, 41], [96, 40], [82, 46], [72, 60], [68, 80], [70, 100], [76, 118], [83, 131], [88, 142], [90, 152], [95, 162], [105, 167], [115, 163], [120, 153], [122, 143], [126, 132], [130, 118], [133, 100], [134, 82], [131, 64]];
    const ear = smoothPath(pts, true, 0.5); const ebb = [62, 34, 140, 172];
    castShadow(A, [ear], 6, 8, DSH, 0.55, face);
    under(A, [ear], { dx: 1.8, dy: 2.3, th: 0.4, bb: ebb });
    A.fill(ear, SK[2], { h: 140, ridge: 0.3 });
    plane(A, ear, SK[2], { bb: ebb, dir: -1.3, len: [16, 28], wid: [7, 10], h: 140 });
    // ışık: sol üst kıvrık kenar boyunca açık bant; kulağın başa bağlandığı sağ kenar gölgede
    plane(A, ear, SK[3], { clip: [ear, cres(ear, 7, 8)], bb: ebb, tex: false });
    plane(A, ear, SK[4], { clip: [ear, cres(ear, 3, 3.4), rectPath(60, 30, 60, 80)], bb: ebb, tex: false });
    plane(A, ear, SK[1], { clip: [ear, cres(ear, -5, -2)], bb: ebb, tex: false });
    // kepçe oluğu (kıvrık kenarın içi): koyu, düz oluk
    const scapha = smoothPath([[124, 62], [108, 54], [94, 56], [85, 64], [80, 78], [79, 96], [82, 112], [88, 126], [96, 138], [100, 134], [94, 122], [90, 108], [89, 94], [91, 80], [97, 70], [108, 65], [124, 70]], true, 0.5);
    plane(A, scapha, mix(SK[1], SK[2], 0.35), { bb: ebb, tex: false });
    A.fill(scapha, SK[1], { clip: [scapha, cres(scapha, 2.5, 3)], h: 136, ridge: false });
    // karşı kıvrım sırtı (ışıkta) ve üst kolu
    const anti = smoothPath([[97, 142], [93, 124], [94, 104], [100, 88], [111, 77], [126, 72], [129, 79], [117, 84], [108, 94], [103, 108], [103, 124], [106, 138]], true, 0.5);
    plane(A, anti, SK[3], { bb: ebb, tex: false });
    plane(A, smoothPath([[106, 92], [118, 89], [128, 85], [129, 91], [117, 96], [106, 98]], true, 0.5), SK[3], { bb: ebb, tex: false });
    // çanak: içbükey (sol üst gölgede), küçük kulak deliği
    const concha = smoothPath([[108, 100], [121, 98], [126, 108], [125, 126], [117, 136], [108, 130], [105, 114]]);
    plane(A, concha, SK[1], { bb: ebb, tex: false });
    A.fill(concha, SK[0], { clip: [concha, cres(concha, 3.4, 4.2)], h: 132, ridge: false });
    A.fill(ellipsePath(119, 115, 3.4, 5, 0.2), '#6A2E20', { h: 120, ridge: false });
    // tragus (dış hattın içinde) ve karşı tragus
    const trag = smoothPath([[122, 106], [126.5, 109], [126.5, 121], [123, 125], [120, 117]]);
    A.fill(trag, SK[3], { h: 150, ridge: 0.2 }); A.fill(trag, SK[4], { clip: [trag, cres(trag, 1.5, 2)], h: 152, ridge: false });
    A.fill(ellipsePath(111, 139, 5, 3.2, -0.4), SK[3], { h: 150, ridge: false });
    // yuvarlak kulak memesi: hafif açık leke
    A.fill(ellipsePath(102, 155, 8, 5.6, 0.3), SK[3], { clip: ear, h: 148, ridge: false });
    // ses yayları: kulak deliğine yaklaştıkça küçülen, kulağa doğru kavisli üç yay (solda)
    const cx = 120, cy = 115;
    for (const [rr, span, w] of [[64, 0.3, 3.8], [79, 0.4, 3.4], [93, 0.47, 3]]) {
      const arc = []; for (let i = 0; i <= 18; i++) { const a = Math.PI - span + (i / 18) * span * 2; arc.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
      A.line(arc, w, '#FFE6C8', { taper: true, edge: false });
    }
  }

  // burun (yandan profil, sağa bakar; adamın yüzüyle aynı model): kısa düz burun, belirgin burun kökü çukuru,
  // göz profilden bir göz boyu geride, bıyık ve sakal; koku tülleri sağda kalın, burun deliğine incelerek kıvrılır
  function icBurun(A, face) {
    const r = A.r;
    const prof = smoothPath([[-10, -10], [104, -10], [108, 10], [113, 30], [115, 44], [111, 57], [118, 68], [128, 82], [139, 96], [146, 104], [146, 110], [140, 114], [130, 115], [123, 117], [122, 124], [126, 133], [126, 140], [121, 145], [125, 151], [124, 157], [118, 162], [117, 172], [121, 186], [124, 230], [-10, 230]], true, 0.4);
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, face); A.clip(A.S.hx, face);
    castShadow(A, [prof], 6, 8, DSH, 0.55);
    under(A, [prof], { dx: 2, dy: 2.5, th: 0.5 });
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, prof); A.clip(A.S.hx, prof);
    plane(A, prof, SK[2], { bb: BDD, dir: -0.9, len: [24, 40], wid: [9, 13], cover: 1.3 });
    // düz yüzeyler: alın ve kaş kemeri (ışık), burun sırtı (ışık), elmacık (ışık); elmacık altı ve burun yanı (gölge)
    plane(A, poly([[-10, -10], [104, -10], [108, 10], [113, 30], [115, 44], [104, 47], [80, 42], [50, 44], [20, 54], [-10, 58]]), SK[3], { bb: BDD, dir: -0.6 });
    plane(A, smoothPath(blobPts(58, 16, 40, 18, 10, 0.14, 51, -0.2)), SK[4], { bb: BDD, dir: -0.6 });
    plane(A, poly([[111, 58], [118, 66], [128, 80], [139, 94], [145, 103], [140, 105], [129, 92], [119, 79], [111, 67]]), SK[3], { bb: BDD, dir: 0.95 });
    plane(A, smoothPath(blobPts(74, 94, 30, 13, 8, 0.2, 52, -0.25)), mix(SK[2], SK[3], 0.6), { bb: BDD, dir: -0.3 });
    plane(A, poly([[30, 120], [62, 113], [96, 113], [114, 121], [108, 131], [80, 127], [52, 131], [30, 134]]), SK[1], { bb: BDD, dir: -0.25 });
    plane(A, poly([[111, 72], [124, 87], [133, 99], [127, 107], [116, 104], [108, 90]]), mix(SK[1], SK[2], 0.45), { bb: BDD, dir: 0.9 });
    plane(A, smoothPath(blobPts(141, 101, 5.6, 4.2, 8, 0.1, 53, 0.6)), SK[4], { bb: BDD, tex: false });
    // burun kanadı, kıvrımı ve deliği
    plane(A, smoothPath(blobPts(126, 108, 10, 7, 10, 0.08, 54, 0.3)), SK[2], { bb: BDD, tex: false });
    A.line(bez([117, 99], [111, 109], [117, 118], [129, 117], 14), 2.6, SK[0], { taper: true, edge: false });
    A.fill(ellipsePath(133, 114, 5, 2, 0.12), '#5A2618', { h: 118, ridge: false });
    // kapalı göz (sakin koklayış): kapak hattı, üstünde hafif açık kapak; kaş: kalın, alçak, düze yakın
    plane(A, smoothPath(blobPts(71, 60, 15, 5.5, 10, 0.1, 55, 0.05)), mix(SK[2], SK[3], 0.7), { bb: BDD, tex: false });
    A.line(bez([56, 63], [64, 70], [78, 71], [86, 64], 14), 3.2, '#3A2218', { w1: 1.6, taper: true, edge: false });
    const browTop = bez([48, 50], [62, 43], [86, 40], [104, 43], 14), browBot = bez([103, 50], [86, 49], [66, 52], [50, 57], 14);
    const brow = smoothPath([...browTop, ...browBot], true, 0.3);
    hairMass(A, brow, HAIR, { base: 1, bb: [44, 36, 108, 60], dir: () => -2.95 + (r() - 0.5) * 0.25, shade: (x, y) => clamp(1.0 - (y - 41) / 15), len: [8, 13], wid: [2.4, 3.6], cover: 3 });
    fray(A, browTop.slice(2), [HAIR[2], HAIR[3]], { step: 2, ang: () => -2.8, len: [3, 5.5], wid: [1.4, 2], push: 0.12, alpha: 0.85 });
    // sakal + bıyık (adamın kısa, düzgün sakalı): arkada yanaktan ağız köşesine iner, önde çene profilini izler
    const beard = poly([[-10, 104], [20, 107], [48, 117], [76, 128], [98, 137], [110, 145], [118, 152], [126, 152], [140, 160], [140, 230], [-10, 230]]);
    const lipL = smoothPath([[106, 142], [120, 143], [126, 148], [123, 153], [110, 152]]);
    const mous = smoothPath([[90, 134], [100, 126], [110, 121], [120, 118.5], [124, 123], [127, 131], [127, 139], [121, 142], [108, 141], [97, 140]]);
    const bsh = (x, y) => clamp(0.82 - (y - 112) / 140 - (x - 40) / 300);
    hairMass(A, beard, BEARD, { bb: [-10, 100, 140, 210], dir: () => 1.25 + (r() - 0.5) * 0.4, shade: bsh, ramp: BEARD.slice(1, 4), len: [6, 11], wid: [2.4, 3.6], cover: 2.8 });
    fray(A, bez([-10, 104], [30, 108], [70, 124], [104, 140], 40), [BEARD[3], BEARD[2], mix(BEARD[2], SK[1], 0.5)], { step: 1, ang: () => -1.75, len: [3, 9], wid: [1.3, 2.3], push: 0.25, jit: 0.7, alpha: 0.85 });
    plane(A, lipL, mix(LIP[2], SK[1], 0.3), { bb: BDD, tex: false });
    A.fill(lipL, LIP[3], { clip: [lipL, rectPath(100, 140, 30, 6)], h: 144, ridge: false });
    hairMass(A, mous, BEARD, { bb: [86, 114, 130, 146], dir: (x) => 1.55 + (x - 112) * 0.012 + (r() - 0.5) * 0.3, shade: (x, y) => clamp(0.92 - (y - 118) / 30), ramp: BEARD.slice(1, 5), len: [6, 10], wid: [2.2, 3.4] });
    fray(A, bez([90, 134], [96, 124], [110, 120], [122, 119], 16), [BEARD[3], BEARD[4]], { step: 1, ang: () => -1.6, len: [2.5, 5], wid: [1.3, 1.9], push: 0.1, jit: 0.6, alpha: 0.8 });
    A.S.x.restore(); A.S.hx.restore();
    // koku tülleri: sağda kalın ve yuvarlak uçlu, burun deliğine doğru incelerek kıvrılır
    const wisp = (pts, w0, col) => {
      const P = []; for (let i = 0; i < pts.length - 1; i++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)]; for (let j = 0; j < 8; j++) { const t = j / 8, t2 = t * t, t3 = t2 * t; P.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3))); } }
      P.push(pts[pts.length - 1]);
      A.fill(circ(P[0][0], P[0][1], w0 * 0.5), col, { h: 150, ridge: false });
      A.line(P, w0, col, { w1: 0.8, edge: false });
    };
    wisp([[181, 98], [172, 95], [163, 100], [155, 107.5], [147, 111.5], [140, 113.6]], 5, '#FFE3C2');
    wisp([[182, 131], [173, 133], [164, 128], [156, 121.5], [148, 117.5], [140, 115.6]], 4.6, '#F7BCCD');
    wisp([[177, 114.5], [168, 111.5], [159, 115.5], [149, 115.6], [141, 114.8]], 3.6, '#FFE3C2');
    A.S.x.restore(); A.S.hx.restore();
  }

  // ağız (önden yakın çekim): bıyık ve kısa düzgün sakal çerçevesi, soluk gül-ten dudaklar (üst dudak ~%60), dil ucu
  // alt dudağın üstüne taşar ve üstünde parlak bir bal damlası durur (tat)
  function icDil(A, face) {
    const r = A.r, s = 0.86, F = (x, y) => [110 + (x - 110) * s, 102 + (y - 102) * s], Fp = (pts) => pts.map(([x, y]) => F(x, y));
    const sp = (pts, t = 0.45) => smoothPath(Fp(pts), true, t);
    const fb = (x, y, rx, ry, n, amp, seed, rot) => smoothPath(blobPts(...F(x, y), rx * s, ry * s, n, amp, seed, rot));
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, face); A.clip(A.S.hx, face);
    plane(A, face, SK[2], { bb: BDD, dir: -0.3, len: [26, 46], wid: [10, 15], cover: 1.4 });
    plane(A, fb(40, 62, 44, 52, 12, 0.1, 61, 0.2), SK[3], { bb: BDD, dir: -0.4 });
    plane(A, fb(188, 70, 34, 56, 12, 0.1, 62, 0.1), SK[1], { bb: BDD, dir: 1.2 });
    // burun tabanı (üstte): uç ışıkta, kanatlar, delikler koyu
    const nose = sp([[74, 4], [146, 4], [150, 30], [138, 45], [122, 43], [110, 48], [98, 43], [82, 45], [70, 30]]);
    plane(A, nose, SK[3], { bb: BDD, dir: 0 });
    plane(A, fb(102, 26, 20, 10, 10, 0.12, 63, 0), SK[4], { clip: nose, bb: BDD, tex: false });
    A.fill(nose, SK[1], { clip: [nose, cres(nose, 0, -6)], h: 138, ridge: false });
    A.fill(nose, mix(SK[1], SK[2], 0.4), { clip: [nose, cres(nose, -6, -3)], h: 138, ridge: false });
    A.fill(ellipsePath(...F(95, 41), 7 * s, 2.8 * s, 0.25), '#6A2E20', { h: 120, ridge: false });
    A.fill(ellipsePath(...F(125, 41), 7 * s, 2.8 * s, -0.25), '#6A2E20', { h: 120, ridge: false });
    // kısa, düzgün sakal: yanaktan ağız köşelerine, alt dudağın altından çeneye; düz ton basamakları + kısa kıllar
    const beard = sp([[4, 118], [30, 113], [52, 106], [62, 106], [70, 114], [86, 124], [110, 128], [134, 124], [150, 114], [158, 106], [168, 106], [190, 113], [216, 118], [216, 230], [4, 230]], 0.4);
    const bsh = (x, y) => clamp(0.62 + (70 - x) * 0.005 - (y - 150) * 0.004);
    hairMass(A, beard, BEARD, { bb: [4, 90, 216, 210], ramp: BEARD.slice(1, 4), shade: bsh, dir: (x) => Math.PI / 2 + (x - 110) * 0.005 + (r() - 0.5) * 0.4, len: [6, 11], wid: [2.4, 3.6], cover: 2.8 });
    A.fill(beard, BEARD[1], { clip: [beard, cres(beard, -3, -5)], alpha: 0.6, h: false });
    const cheekL = Fp(bez([4, 118], [24, 114], [44, 108], [62, 106], 18)), cheekR = Fp(bez([158, 106], [176, 108], [196, 114], [216, 118], 18));
    for (const c of [cheekL, cheekR]) fray(A, c, [BEARD[3], BEARD[2], mix(BEARD[2], SK[1], 0.5)], { step: 1, ang: () => -Math.PI / 2 + (r() - 0.5) * 0.3, len: [3, 7], wid: [1.3, 2.2], push: 0.2, jit: 0.6, alpha: 0.8 });
    // dudaklar: alt dolgun, üst ~%60 kalınlıkta, kupidon yayı düz; soluk gül-ten
    const upL = sp([[64, 103], [84, 93], [102, 90], [110, 91.5], [118, 90], [136, 93], [156, 103], [136, 100.5], [110, 100], [84, 100.5]], 0.4);
    const gap = sp([[66, 103], [86, 100.5], [110, 100], [134, 100.5], [154, 103], [134, 106], [110, 107], [86, 106]], 0.4);
    const loL = sp([[64, 103.5], [86, 106], [110, 107], [134, 106], [156, 103.5], [142, 116], [122, 123], [110, 124], [98, 123], [78, 116]], 0.4);
    A.fill(gap, '#3A1418', { h: 124, ridge: false });
    A.fill(upL, LIP[1], { h: 144, ridge: 0.2 });
    A.fill(upL, LIP[2], { clip: [upL, rectPath(...F(60, 95.5), 100, 8 * s)], h: 145, ridge: false });
    A.fill(loL, LIP[3], { h: 146, ridge: 0.2 });
    A.fill(loL, LIP[4], { clip: [loL, fb(96, 110, 22, 6, 10, 0.12, 64, 0.05)], h: 148, ridge: false });
    A.fill(loL, LIP[2], { clip: [loL, cres(loL, 0, -4)], h: 144, ridge: false });
    field(A, { clip: loL, bbox: [62, 96, 158, 122], color: LIP[3], len: [7, 12], wid: [2.6, 4], dir: (x) => (x < 110 ? -0.2 : 0.2), dirJit: 0.3, cover: 0.8, bristle: 0.4, ridge: 0.08, hv: 6, hb: 144 });
    // dil ucu: ağız aralığından alt dudağın üstüne taşar
    const tongue = sp([[92, 104], [128, 104], [130.5, 113], [125.5, 125], [110, 131.5], [94.5, 125], [89.5, 113]], 0.5);
    A.fill(tongue, '#CC6474', { h: 148, ridge: 0.25 });
    A.fill(tongue, '#E68E9A', { clip: [tongue, cres(tongue, 4, 5)], h: 150, ridge: false });
    A.fill(tongue, '#A84858', { clip: [tongue, cres(tongue, -3, -3.5)], h: 146, ridge: false });
    A.fill(gap, '#3A1418', { clip: [gap, rectPath(...F(60, 96), 100, 7.6 * s)], alpha: 0.85, h: false });
    // bal: dil ucunu kaplayan parlak kehribar sır (ayrı bir nesne değil; dilin ucu bala bulanmış)
    const glaze = (() => { const q = new Path2D(); q.addPath(fb(110, 127, 15.5, 9.5, 12, 0.14, 65, 0.05)); return q; })();
    A.fill(tongue, HONEY[4], { clip: [tongue, glaze], alpha: 0.95, h: 152, ridge: false });
    A.fill(tongue, HONEY[3], { clip: [tongue, glaze, cres(tongue, -2.6, -3)], h: 150, ridge: false });
    A.fill(tongue, HONEY[5], { clip: [tongue, glaze, cres(glaze, 3, 3.5)], h: 154, ridge: false });
    { const [gx, gy] = F(104, 122); stroke(A, gx, gy, -0.35, 7, 2.2, '#FFF6DE', { bristle: 0, ridge: 0.3, hb: 160, hv: 4 }); const [g2x, g2y] = F(116, 127.5); stroke(A, g2x, g2y, 0.4, 3.2, 1.6, HONEY[6], { bristle: 0, ridge: 0.3, hb: 160, hv: 4 }); }
    // bıyık: burnun altından ağız köşelerine sarkar, üst dudağın üst kenarını örter
    const mous = sp([[110, 57], [96, 54], [78, 58], [64, 68], [54, 84], [50, 98], [57, 101], [68, 93], [84, 89], [100, 87.5], [110, 89], [120, 87.5], [136, 89], [152, 93], [163, 101], [170, 98], [166, 84], [156, 68], [142, 58], [124, 54]], 0.45);
    hairMass(A, mous, BEARD, { bb: [44, 50, 176, 104], ramp: BEARD.slice(1, 5), dir: (x) => Math.PI / 2 + (x < 110 ? 0.55 : -0.55) * clamp(Math.abs(x - 110) / 50) + (r() - 0.5) * 0.3, shade: (x, y) => clamp(0.96 - (y - 60) / 46 - (x - 50) / 300), len: [6, 11], wid: [2.4, 3.6], cover: 2.8 });
    fray(A, Fp(bez([62, 68], [80, 56], [100, 53], [110, 57], 14).concat(bez([110, 57], [120, 53], [140, 56], [158, 68], 14))), [BEARD[3], BEARD[4]], { step: 2, ang: (x) => -Math.PI / 2 + (x - 110) * 0.01, len: [2.5, 5], wid: [1.3, 1.9], push: 0.1, alpha: 0.75 });
    A.S.x.restore(); A.S.hx.restore();
  }

  // el (avuç içi önden, parmaklar yukarıda; sol el: başparmak izleyicinin solunda). İncelen parmaklar,
  // avucun alt üçte birinden çıkan ve tümseği avuçla birleşik başparmak; bilek avuçtan dar, iki düz tonlu
  function fingerPath(bx, by, ang, L, w0, w1) {
    const p = new Path2D(); const r1 = w1 / 2;
    p.moveTo(-8, -w0 / 2); p.lineTo(L - r1, -w1 / 2); p.arc(L - r1, 0, r1, -Math.PI / 2, Math.PI / 2, false); p.lineTo(-8, w0 / 2); p.closePath();
    const q = new Path2D(); q.addPath(p, new DOMMatrix().translate(bx, by).rotate((ang * 180) / Math.PI)); return q;
  }
  function icEl(A, face) {
    const fingers = [
      [92, 106, -1.74, 52, 15.5],
      [108, 102, -1.58, 58, 16],
      [124, 103, -1.43, 53, 15],
      [139, 110, -1.27, 41, 13],
    ];
    const fp = fingers.map(([x, y, a, L, w]) => fingerPath(x, y, a, L, w, w * 0.8));
    const thumbAx = [[92, 160], [74, 138], [60, 120], [51, 106]];
    const thumb = (() => { const p = new Path2D(); const n = thumbAx.length; const Lp = [], Rp = [];
      for (let i = 0; i < n; i++) { const a = thumbAx[Math.max(0, i - 1)], b = thumbAx[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); const w = lerp(26, 14, i / (n - 1)) / 2; Lp.push([thumbAx[i][0] - (dy / l) * w, thumbAx[i][1] + (dx / l) * w]); Rp.push([thumbAx[i][0] + (dy / l) * w, thumbAx[i][1] - (dx / l) * w]); }
      const e = thumbAx[n - 1], pe = thumbAx[n - 2]; const ea = Math.atan2(e[1] - pe[1], e[0] - pe[0]);
      p.moveTo(...Lp[0]); for (let i = 1; i < n; i++) p.lineTo(...Lp[i]); p.arc(e[0], e[1], 7, ea + Math.PI / 2, ea - Math.PI / 2, true); for (let i = n - 1; i >= 0; i--) p.lineTo(...Rp[i]); p.closePath(); return p; })();
    const palm = smoothPath([[84, 110], [97, 101], [114, 99], [132, 102], [147, 110], [151, 126], [148, 148], [140, 166], [130, 176], [104, 178], [90, 168], [82, 150], [80, 128]], true, 0.5);
    const wrist = smoothPath([[92, 166], [138, 166], [136, 200], [136, 228], [92, 228], [93, 200]], true, 0.4);
    const hand = [...fp, thumb, palm, wrist];
    A.S.x.save(); A.S.hx.save(); A.clip(A.S.x, face); A.clip(A.S.hx, face);
    castShadow(A, hand, 6, 8, DSH, 0.55);
    under(A, hand, { dx: 1.8, dy: 2.3, th: 0.42 });
    // bilek: iki düz ton (ışık yanı solda)
    A.fill(wrist, SK[1], { h: 138, ridge: 0.2 });
    A.fill(wrist, SK[2], { clip: [wrist, rectPath(80, 160, 36, 80)], h: 140, ridge: false });
    // parmaklar: üç ton (ışık yanı sol), uçta açık yastık, ince soluk boğum çizgileri
    fingers.forEach(([x, y, a, L, w], i) => {
      const p = fp[i]; const m = new DOMMatrix().translate(x, y).rotate((a * 180) / Math.PI);
      const litS = new Path2D(); litS.addPath(rectPath(-10, -w, L + 12, w * 0.92), m);
      const shS = new Path2D(); shS.addPath(rectPath(-10, w * 0.24, L + 12, w), m);
      A.fill(p, SK[2], { h: 144, ridge: 0.25 });
      A.fill(p, SK[3], { clip: [p, litS], h: 147, ridge: false });
      A.fill(p, SK[1], { clip: [p, shS], h: 141, ridge: false });
      const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca;
      A.fill(ellipsePath(x + ca * (L - w * 0.5) - nx * w * 0.12, y + sa * (L - w * 0.5) - ny * w * 0.12, w * 0.24, w * 0.32, a), SK[4], { clip: p, h: 150, ridge: false });
      for (const t of [0.4, 0.68]) {
        const ww = lerp(w, w * 0.8, t); const cx2 = x + ca * L * t, cy2 = y + sa * L * t;
        A.line([[cx2 - nx * ww * 0.3, cy2 - ny * ww * 0.3], [cx2 + nx * ww * 0.28 + ca * 1, cy2 + ny * ww * 0.28 + sa * 1]], 1.1, mix(SK[1], SK[2], 0.45), { w1: 0.7, edge: false });
      }
    });
    // avuç + başparmak tek kütle (ek yeri yok): taban, başparmağın ışık/gölge kenarı, avuç düzlemleri
    const palmT = union2(palm, thumb);
    A.fill(palm, SK[2], { h: 144, ridge: false }); A.fill(thumb, SK[2], { h: 144, ridge: false });
    plane(A, palmT, SK[2], { bb: [44, 96, 154, 182], dir: -1.2, len: [16, 26], wid: [7, 10], cover: 0.9, h: 144 });
    A.fill(thumb, SK[3], { clip: [thumb, cres(thumb, 4, 5), rectPath(30, 80, 80, 66)], h: 146, ridge: false });
    A.fill(thumb, SK[1], { clip: [thumb, cres(thumb, -3, -3.4), rectPath(30, 80, 80, 62)], h: 140, ridge: false });
    // başparmak tümseği: avuçla başparmak kökünü örten tek açık düzlem
    plane(A, smoothPath(blobPts(88, 150, 21, 26, 12, 0.1, 71, 0.6)), mix(SK[2], SK[3], 0.65), { clip: palmT, bb: [60, 116, 116, 182], tex: false, h: 146 });
    // avuç çukuru (hafif), parmak dibi yastıkları (ışıkta), serçe yanı gölge
    plane(A, smoothPath(blobPts(121, 142, 15, 20, 10, 0.16, 72, 0.4)), mix(SK[1], SK[2], 0.5), { clip: palm, bb: [100, 116, 142, 166], tex: false, h: 142 });
    plane(A, smoothPath(blobPts(116, 111, 31, 8, 12, 0.12, 73, 0.05)), mix(SK[2], SK[3], 0.6), { clip: palm, bb: [80, 98, 152, 122], tex: false, h: 146 });
    A.fill(palm, SK[1], { clip: [palm, cres(palm, -4, -1.5), rectPath(110, 96, 50, 90)], h: 140, ridge: false });
    // parmak dipleri ve avuç çizgileri: ince ve soluk
    const crc = mix(SK[1], SK[2], 0.45);
    for (let i = 0; i < 4; i++) { const [x, y, a, , w] = fingers[i]; const nx = -Math.sin(a), ny = Math.cos(a); A.line([[x - nx * w * 0.4, y - ny * w * 0.4 + 1.5], [x, y + 2.6], [x + nx * w * 0.4, y + ny * w * 0.4 + 1.5]], 1.1, crc, { w1: 0.8, edge: false }); }
    A.line(bez([106, 121], [96, 136], [96, 156], [104, 170], 14), 1.3, crc, { taper: true, edge: false });
    A.line(bez([145, 127], [133, 122], [118, 123], [106, 130], 14), 1.2, crc, { taper: true, edge: false });
    A.S.x.restore(); A.S.hx.restore();
    // parmak uçlarında dokunuş işaretleri
    for (const i of [0, 1]) { const [x, y, a, L] = fingers[i]; const tx = x + Math.cos(a) * (L + 9), ty = y + Math.sin(a) * (L + 9); for (const sd of [-1, 1]) A.line([[tx + sd * 4.5, ty - 1], [tx + sd * 8.5, ty - 6]], 2.6, '#FFE6C8', { taper: true, edge: false }); A.line([[tx, ty - 3], [tx, ty - 9.5]], 2.6, '#FFE6C8', { taper: true, edge: false }); }
  }

  defSprite('duyu-goz', () => senseMed(3201, icGoz, { crop: true }));
  defSprite('duyu-kulak', () => senseMed(3202, icKulak));
  defSprite('duyu-burun', () => senseMed(3203, icBurun));
  defSprite('duyu-dil', () => senseMed(3204, icDil, { crop: true }));
  defSprite('duyu-el', () => senseMed(3205, icEl));

  return {
    MED: { size: 300, r: RO, rFace: RI }, DUYU: { size: 220, r: DRO, rFace: DR }, KAGIT, ICONS, drawMed,
    mk, layer, bead, gem, leaf, stroke, field, plane, under, castShadow, cres, circ, poly, union2, moved, annulus, ringBands,
    PAL: { GOLD, CREAM, NAR, ARIL, LEAF, WHEAT, VIOLET, WATER, PINK, SUN, HONEY, WAX, CLOTH, RIBBON, STEM, SK, HAIR, BEARD, LIP, TEAL, INDIGO },
  };
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
//  UI.ripple(ctx, x, y, t, color, maxR, o)          t sn: 4 kırık halka 0.2 sn arayla, her biri 1.2 sn'de büyüyüp söner (t≥1.8'de boş);
//        o.sector=[a0,a1] (radyan, canvas açısı) halkaları bir açı aralığına sınırlar (ör. [-1.1, 1.1] ağzın önü, yüzün üstüne taşmaz)
//  UI.glow(ctx, x, y, r, color, alpha, mode)        2–3 düz alfa basamaklı, kenarı fırçalı ışıma (huzme yok); mode varsayılan 'screen'
//  UI.haze(ctx, x, y, w, h, color, alpha, mode)     geniş, yatay, düz basamaklı pus bandı (nokta ışık değil); varsayılan 'screen'
//  UI.sparkle(ctx, x, y, size, t, color, o)         4 uçlu parıltı; ömrü 0.6 sn (t<0 veya t≥0.6'da çizilmez)
const UI = (() => {
  const TAU = Math.PI * 2;
  const LG = Paint.L;
  const SHADOW = 'rgba(14,8,34,0.26)';
  const SC = new Map();
  // ton kaydırma: koyu tonlar kırmızıya doğru döner (sarılarda zeytin yeşili değil, aşı boyası verir)
  const sh = (col, dl) => { const key = col + '|' + dl; let v = SC.get(key); if (v === undefined) { if (SC.size > 900) SC.clear(); v = shade(col, dl, dl > 0 ? 0.82 : 1.04, dl > 0 ? -4 : -9); SC.set(key, v); } return v; };
  const BD = {};
  function bdata(seed) {
    let d = BD[seed]; if (d) return d;
    const r = rng(((seed | 0) * 7919 + 101) >>> 0);
    d = { p1: r() * TAU, p2: r() * TAU, p3: r() * TAU, u1: r(), u2: r(), br: [] };
    for (let i = 0; i < 10; i++) d.br.push({ off: (i + 0.5) / 10 - 0.5 + (r() - 0.5) * 0.04, light: r() < 0.5, a: 0.2 + r() * 0.3, s0: r(), e: r(), dry: r() < 0.45 });
    return (BD[seed] = d);
  }

  // çekirdek fırça: P yoğun örnekli yol, Sx birikimli uzunluk; uzunluğu Lt olan darbenin ilk Ld pikselini çizer.
  // Başta fırça basışı (incelikten tam kalınlığa), uçta incelme; w≥5'te birkaç kalın kuru kıl ucu (w<5'te yalnız incelen uç),
  // ışığa bakan kenarda ince boya sırtı (ucun son 2w'sinde koyu sırt yok).
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
    const dryOn = w >= 5 && (o.dry ?? 1.2) > 0;
    const dryLen = dryOn ? w * (o.dry ?? 1.2) * smooth(clamp(Ld / (w * 5))) : 0;
    const bodyEnd = Math.max(0, Ld - dryLen);
    const endMin = dryOn ? 0.78 : 0.3; // kuru uç yoksa gövde sivrilerek biter
    const WL = new Float32Array(m), WR = new Float32Array(m), Wb = new Float32Array(m), Ld2 = new Float32Array(m);
    let mb = 0;
    for (let i = 0; i < m; i++) {
      const s = QS[i];
      let f = 1 + 0.1 * Math.sin(s * 0.07 + D.p1) + 0.06 * Math.sin(s * 0.19 + D.p2);
      f *= 0.72 + 0.28 * smooth(clamp(s / (w * press)));
      const tp = smooth(clamp((bodyEnd - s) / (w * tail)));
      const hw = 0.5 * w * f * lerp(endMin, 1, tp);
      WL[i] = hw * (1 + 0.07 * Math.sin(s * 0.9 + D.p2) + 0.05 * Math.sin(s * 2.3 + D.p3));
      WR[i] = hw * (1 + 0.07 * Math.sin(s * 0.83 + D.p1) + 0.05 * Math.sin(s * 2.1 + D.p2));
      Wb[i] = w * f;
      Ld2[i] = N[i][0] * LG[0] + N[i][1] * LG[1];
      if (s <= bodyEnd) mb = i;
    }
    if (!dryOn) mb = m - 1;
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
      if (!dryOn) { const e = Q[mb], tx = Q[mb][0] - Q[mb - 1][0], ty = Q[mb][1] - Q[mb - 1][1], tl = Math.hypot(tx, ty) || 1; const hw = (WL[mb] + WR[mb]) / 2; body.quadraticCurveTo(e[0] + (tx / tl) * hw * 1.6, e[1] + (ty / tl) * hw * 1.6, e[0] - N[mb][0] * WR[mb], e[1] - N[mb][1] * WR[mb]); }
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
    // gövdedeki kıl olukları: kısmi uzunlukta açık/koyu ince çizgiler (uca 2w kala biter)
    const nb = clamp(Math.round(w / 1.6), 3, 10); const lw = Math.max(0.5, (w / nb) * 0.55);
    const span = Math.max(1, bodyEnd - (dryOn ? 0 : w * 1.5));
    for (let b = 0; b < nb; b++) {
      const B = D.br[b % 10]; const off = ((b + 0.5) / nb - 0.5) * 1.6;
      const a0 = B.s0 * 0.5 * span, a1 = span * (0.45 + 0.55 * B.e);
      if (a1 - a0 < 2) continue;
      ctx.beginPath(); let st = false;
      for (let i = 0; i <= mb; i++) { const s = QS[i]; if (s < a0) continue; if (s > a1) break; const hw = off > 0 ? WL[i] : WR[i]; const x = Q[i][0] + N[i][0] * off * hw * 0.5, y = Q[i][1] + N[i][1] * off * hw * 0.5; st ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (st = true)); }
      if (!st) continue;
      ctx.strokeStyle = sh(col, B.light ? 0.14 : -0.12); ctx.globalAlpha = A0 * (0.3 + B.a) * (B.light ? 1 : 0.8); ctx.lineWidth = lw; ctx.stroke();
    }
    // kuru uç (yalnız w≥5): gövdenin sonundan az sayıda, kalın ayrık kıl
    if (dryOn && dryLen > 0.5) {
      const nt = clamp(Math.round(w / 2.4), 2, 5); const tw = Math.max(1.2, (w / nt) * 0.8);
      const tx = Q[m - 1][0] - Q[m - 2][0], ty = Q[m - 1][1] - Q[m - 2][1]; const tl = Math.hypot(tx, ty) || 1;
      for (let b = 0; b < nt; b++) {
        const B = D.br[(b * 3 + 1) % 10]; const off = ((b + 0.5) / nt - 0.5) * 0.86;
        const s0 = Math.max(0, bodyEnd - w * 0.6), s1 = bodyEnd + dryLen * (0.35 + 0.65 * ((B.e + b * 0.37) % 1));
        ctx.beginPath(); let st = false;
        for (let i = 0; i < m; i++) { const s = QS[i]; if (s < s0) continue; if (s > s1) break; const x = Q[i][0] + N[i][0] * off * Wb[i] * 0.8, y = Q[i][1] + N[i][1] * off * Wb[i] * 0.8; st ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), (st = true)); }
        if (!st) continue;
        if (s1 > Ld) { const ex = (s1 - Ld) / tl; const i = m - 1; ctx.lineTo(Q[i][0] + N[i][0] * off * Wb[i] * 0.8 + tx * ex, Q[i][1] + N[i][1] * off * Wb[i] * 0.8 + ty * ex); }
        ctx.strokeStyle = col; ctx.globalAlpha = A0; ctx.lineWidth = tw; ctx.stroke();
      }
    }
    // ışık sırtı ve gölge kenarı (parça parça; açıya göre alfa); koyu sırt ucun son 2w'sinde yok
    const K = 6; const rl = Math.max(0.7, w * 0.13); const darkEnd = Math.max(0, bodyEnd - 2 * w);
    for (let c = 0; c < mb; c += K) {
      const e = Math.min(mb, c + K); const mi = (c + e) >> 1;
      const d = Ld2[mi]; const side = d > 0 ? 1 : -1; const ad = Math.abs(d);
      if (ad < 0.12) continue;
      for (const [sg, dl, al] of [[side, 0.18, 0.85], [-side, -0.16, 0.5]]) {
        if (dl < 0 && QS[e] > darkEnd) continue;
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
    if (g0 > 0) glow(ctx, x, y, maxR * 0.5, col, (o.glow ?? 0.22) * g0 * smooth(clamp(t / 0.1)));
    for (let i = 0; i < n; i++) {
      const u = (t - i * dt) / life; if (u <= 0 || u >= 1) continue;
      const R = lerp(maxR * 0.18, maxR, E.out3(u));
      const a = Math.pow(1 - u, 1.4) * smooth(clamp(u / 0.1));
      const w = lerp(maxR * 0.045, maxR * 0.012, u);
      const D = bdata(700 + i * 13 + seed);
      ctx.save(); ctx.globalAlpha *= a * (o.alpha ?? 0.72);
      // o.sector = [a0, a1]: halkalar yalnız bu açı aralığında (ör. yüzün önünde) — üç yay aralığa paylaştırılır
      const sec = o.sector, tot = sec ? sec[1] - sec[0] : TAU;
      let a0 = sec ? sec[0] + (D.u1 - 0.5) * 0.12 * tot / 3 : D.p1;
      for (let k = 0; k < 3; k++) {
        const span = tot / 3 - (0.32 + 0.3 * D.br[k].e) * (tot / TAU);
        const [P, Sx, L] = arcPts(x, y, R, a0, span, 0.01, D, 3);
        brush(ctx, P, Sx, L, L, col, w, 700 + i * 13 + k + seed, { shadow: false, press: 1.4, tail: 1.8 });
        a0 += tot / 3 + (D.br[k + 3].e - 0.5) * 0.3 * (tot / TAU);
      }
      ctx.restore();
    }
  }

  // ışıma kalıbı: üç düz alfa basamağı (0.18 / 0.46 / 1), her basamak yumuşak düzensiz leke + yatık fırça izleri (halka/degrade yok).
// glow() alfası 1.8 kazançla basılır: koyu zeminde çekirdek doygun sıcak kalır, dış basamaklar hafif (bulanık gri sis yok).
  let GSTAMP = null, HSTAMP = null; const GT = new Map(), HT = new Map();
  function gstamp() {
    if (GSTAMP) return GSTAMP;
    const S = 256, c = makeCanvas(S, S), x = c.getContext('2d'); x.globalCompositeOperation = 'lighter';
    const r = rng(515);
    for (const [rf, a, n, sd] of [[0.8, 0.18, 9, 11], [0.58, 0.28, 7, 23], [0.34, 0.54, 5, 37]]) {
      const L = makeCanvas(S, S), lx = L.getContext('2d'); lx.fillStyle = '#fff';
      const R = rf * S * 0.5;
      // yumuşak düzensiz leke + kenarda birkaç yuvarlak uçlu, sol üst ışık yönünde yatık fırça izi
      lx.fill(smoothPath(blobPts(S / 2, S / 2, R * 0.86, R * 0.8, 14, 0.13, 515 + sd, -0.62)));
      for (let i = 0; i < n; i++) {
        const ang = (i / n) * TAU + r() * 0.5; const d = R * (0.55 + r() * 0.2);
        lx.save(); lx.translate(S / 2 + Math.cos(ang) * d, S / 2 + Math.sin(ang) * d); lx.rotate(-0.62 + (r() - 0.5) * 0.4);
        lx.beginPath(); lx.ellipse(0, 0, R * (0.3 + r() * 0.16), R * (0.12 + r() * 0.06), 0, 0, TAU); lx.fill(); lx.restore();
      }
      x.globalAlpha = a; x.drawImage(L, 0, 0);
    }
    return (GSTAMP = c);
  }
  // pus kalıbı: yatay uzun darbelerden üç düz basamaklı bant
  function hstamp() {
    if (HSTAMP) return HSTAMP;
    const Wd = 512, Ht = 128, c = makeCanvas(Wd, Ht), x = c.getContext('2d'); x.globalCompositeOperation = 'lighter';
    const r = rng(616);
    for (const [hf, wf, a, n] of [[0.86, 0.94, 0.32, 22], [0.56, 0.8, 0.3, 16], [0.28, 0.6, 0.38, 10]]) {
      const L = makeCanvas(Wd, Ht), lx = L.getContext('2d'); lx.fillStyle = '#fff';
      const hh = Ht * hf * 0.5;
      for (let i = 0; i < n; i++) {
        const v = (r() - 0.5) * 1.4; const yy = Ht / 2 + v * hh * 0.6;
        const halfW = (Wd / 2) * wf * Math.sqrt(Math.max(0.05, 1 - v * v * 0.5)) * (0.78 + r() * 0.22);
        const len = halfW * 2 * (0.62 + r() * 0.38); const cxs = Wd / 2 + (r() - 0.5) * (halfW * 2 - len);
        const wid = hh * (0.5 + r() * 0.3);
        lx.save(); lx.translate(cxs, yy); lx.rotate((r() - 0.5) * 0.03); if (r() < 0.5) lx.scale(-1, 1); lx.fill(Paint.strokeShape(len, wid, r)); lx.restore();
      }
      x.globalAlpha = a; x.drawImage(L, 0, 0);
    }
    return (HSTAMP = c);
  }
  function tint(stamp, map, col) {
    let c = map.get(col); if (c) return c;
    if (map.size > 48) map.clear();
    c = makeCanvas(stamp.width, stamp.height); const x = c.getContext('2d');
    x.drawImage(stamp, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = shade(col, 0, 1.35); x.fillRect(0, 0, c.width, c.height);
    map.set(col, c); return c;
  }
  function glow(ctx, x, y, r, col = '#FFD27A', alpha = 0.4, mode = 'screen') {
    if (!(alpha > 0.002) || r <= 0) return;
    ctx.save(); ctx.globalAlpha *= Math.min(1, alpha * 1.8); if (mode) ctx.globalCompositeOperation = mode;
    ctx.drawImage(tint(gstamp(), GT, col), x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function haze(ctx, x, y, w, h, col = '#FFF4E0', alpha = 0.3, mode = 'screen') {
    if (!(alpha > 0.002) || w <= 0 || h <= 0) return;
    ctx.save(); ctx.globalAlpha *= Math.min(1, alpha); if (mode) ctx.globalCompositeOperation = mode;
    ctx.drawImage(tint(hstamp(), HT, col), x - w / 2, y - h / 2, w, h);
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

  return { ring, dots, chevron, line, ripple, glow, haze, sparkle, brush, dab, arcPts };
})();
