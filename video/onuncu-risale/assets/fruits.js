// Meyveler ve yiyecekler (dünya sofrası ve cennet ziyafeti için ortak).
// YIY: "yiyecek" grubunun boyama araçları (assets/yiyecek.js de kullanır) + nar / nar-kuru.
'use strict';

const YIY = (() => {
  const TAU = Math.PI * 2;
  const LT = Paint.L; // ışık: sol üstten
  const poly = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  const bboxOf = (pts, pad = 3) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { if (x < a) a = x; if (y < b) b = y; if (x > c) c = x; if (y > d) d = y; } return [a - pad, b - pad, c + pad, d + pad]; };
  const circ = (x, y, r) => ellipsePath(x, y, r, r);
  const ellPts = (cx, cy, rx, ry, rot = 0, n = 48) => { const o = []; const c = Math.cos(rot), s = Math.sin(rot); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const x = Math.cos(a) * rx, y = Math.sin(a) * ry; o.push([cx + x * c - y * s, cy + x * s + y * c]); } return o; };
  // biçim nesnesi: {path, pts, bb}
  const shape = (pts, tension = 0.5) => ({ path: smoothPath(pts, true, tension), pts, bb: bboxOf(pts) });
  const polyShape = (pts) => ({ path: poly(pts), pts, bb: bboxOf(pts) });
  const ellShape = (cx, cy, rx, ry, rot = 0) => ({ path: ellipsePath(cx, cy, rx, ry, rot), pts: ellPts(cx, cy, rx, ry, rot, 24), bb: bboxOf(ellPts(cx, cy, rx, ry, rot, 24)) });
  // dışarısı (evenodd ile): bb dikdörtgeni eksi elips
  function outside(bb, cx, cy, rx, ry, rot = 0) { const p = new Path2D(); p.rect(bb[0] - 40, bb[1] - 40, bb[2] - bb[0] + 80, bb[3] - bb[1] + 80); p.ellipse(cx, cy, rx, ry, rot, 0, TAU); return [p, 'evenodd']; }
  const crPts = (ctrl, step = 6, closed = false) => {
    const out = []; const n = ctrl.length; const P = (i) => (closed ? ctrl[(i + n) % n] : ctrl[clamp(i, 0, n - 1)]);
    const last = closed ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
      const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
      for (let j = 0; j < m; j++) {
        const t = j / m, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    if (!closed) out.push(ctrl[n - 1]);
    return out;
  };
  // kırpma listesi: Path2D | [Path2D, kural]
  const normClips = (c) => (!c ? [] : c instanceof Path2D ? [[c, 'nonzero']] : Array.isArray(c) && c[0] instanceof Path2D && typeof c[1] === 'string' ? [c] : c.map((q) => (q instanceof Path2D ? [q, 'nonzero'] : q)));
  function withClip(S, clips, fn) {
    const cl = normClips(clips);
    S.x.save(); S.hx.save();
    for (const [p, rule] of cl) { S.x.clip(p, rule); S.hx.clip(p, rule); }
    fn();
    S.x.restore(); S.hx.restore();
  }
  // düz dolgu + kabartma yüksekliği
  function fill(S, path, col, o = {}) {
    const run = () => {
      S.x.save(); S.x.globalAlpha = o.alpha ?? 1; S.x.fillStyle = col; S.x.fill(path, o.rule || 'nonzero'); S.x.restore();
      if (o.height !== false) { const g = o.h ?? 136; S.hx.save(); S.hx.globalAlpha = o.hAlpha ?? 1; S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fill(path, o.rule || 'nonzero'); if (o.ridge !== false) { S.hx.strokeStyle = `rgb(${g + 46},${g + 46},${g + 46})`; S.hx.lineWidth = S.k; S.hx.stroke(path); } S.hx.restore(); }
    };
    if (o.clip) withClip(S, o.clip, run); else run();
  }
  // tek darbe (len/wid ekran pikseli; k ile çarpılır)
  const dab = (S, x, y, a, l, w, c, o) => Paint.drawStroke(S, x, y, a, l * S.k, w * S.k, c, o || {});
  // nokta testi: Path2D | [Path2D, kural] | fonksiyon
  const makeTest = (S, ins) => {
    if (!ins) return () => true;
    const list = (Array.isArray(ins) && !(ins[0] instanceof Path2D && typeof ins[1] === 'string')) ? ins : [ins];
    const fs = list.map((q) => (typeof q === 'function' ? q : q instanceof Path2D ? (x, y) => S.x.isPointInPath(q, x, y) : (x, y) => S.x.isPointInPath(q[0], x, y, q[1])));
    return (x, y) => { for (const f of fs) if (!f(x, y)) return false; return true; };
  };
  // fırça alanı: taban dolgusu YOK (katmanlanır). o.bb zorunlu.
  // o.cols: renkler (koyu→açık); o.shade: (x,y)→0..1 (renk sırası), yoksa rastgele
  function field(S, o) {
    const r = S.r, k = S.k; const cols = o.cols; const steps = cols.length;
    const f = o.shade; const bb = o.bb;
    const dirf = typeof o.dir === 'function' ? o.dir : () => (o.dir ?? 0) + (r() - 0.5) * 2 * (o.dirJit ?? 0.12);
    const [lenA, lenB] = o.len || [20, 40], [widA, widB] = o.wid || [7, 12];
    const area = (bb[2] - bb[0]) * (bb[3] - bb[1]); const meanS = ((lenA + lenB) / 2) * ((widA + widB) / 2) * k * k;
    const count = o.count ?? Math.min(o.max ?? 9000, Math.round((area / meanS) * (o.cover ?? 2.2)));
    const test = makeTest(S, o.inside); const jit = (o.jitter ?? 0) * k; const fq = (o.jitterFreq ?? 0.012) / k; const nz = o.noise ?? 0.03;
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
      if (!test(x, y)) continue;
      let ki;
      if (f) {
        const v = f(x + (NOISE(x * fq + 3, y * fq) - 0.5) * jit * 2, y + (NOISE(x * fq, y * fq + 9) - 0.5) * jit * 2) + (r() - 0.5) * nz * 2;
        ki = clamp(Math.floor(v * steps), 0, steps - 1);
        if (r() < (o.broken ?? 0.04)) ki = clamp(ki + r.sign(), 0, steps - 1);
      } else ki = Math.floor(r() * steps);
      list.push([x, y, ki, o.sortY ? y : ki + r() * 0.5]);
    }
    if (o.sort !== false) list.sort((a, b) => a[3] - b[3]);
    const draw = () => {
      for (const [x, y, ki] of list) {
        const col = shade(cols[ki], (r() - 0.5) * (o.lJit ?? 0.03), 1 + (r() - 0.5) * (o.cJit ?? 0.08), (r() - 0.5) * (o.hJit ?? 5));
        const sz = o.size ? o.size(x, y) : 1;
        Paint.drawStroke(S, x, y, dirf(x, y), lerp(lenA, lenB, r()) * k * sz, lerp(widA, widB, r()) * k * sz, col, { dry: o.dry ?? 0.15, alpha: o.alpha, height: o.height });
      }
    };
    if (o.clip) withClip(S, o.clip, draw); else draw();
    return list.length;
  }
  // katman: basamaklı ton katı.
  //  sert (varsayılan): clip listesinin tamamına kırpılmış düz taban + fırça alanı
  //  yumuşak (o.soft): taban yok; darbeler clip[1..] içinde örneklenir ama yalnız clip[0]'a (gövde) kırpılır,
  //  böylece katın kenarı fırça uçlarından oluşur (kırık, basamaklı akrilik kenar)
  function layer(S, o) {
    const clips = normClips(o.clip);
    if (o.rim) { const rp = o.rimPath || clips[0][0]; S.rim(rp, typeof o.rim === 'object' ? { w: 2.2, ...o.rim } : { w: 2.2 }); }
    if (o.soft) {
      withClip(S, clips.slice(0, 1), () => field(S, { ...o, clip: null, inside: o.inside ?? clips.slice(1) }));
      return;
    }
    withClip(S, clips, () => {
      if (o.base !== null) {
        const bcol = o.base ?? o.cols[Math.floor(o.cols.length / 2)];
        S.x.save(); S.x.globalAlpha = o.baseAlpha ?? o.alpha ?? 1; S.x.fillStyle = bcol; S.x.fillRect(o.bb[0] - 2, o.bb[1] - 2, o.bb[2] - o.bb[0] + 4, o.bb[3] - o.bb[1] + 4); S.x.restore();
        if (o.height !== false) { const g = o.h ?? 132; S.hx.save(); S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fillRect(o.bb[0] - 2, o.bb[1] - 2, o.bb[2] - o.bb[0] + 4, o.bb[3] - o.bb[1] + 4); S.hx.restore(); }
      }
      field(S, { ...o, clip: null, inside: o.inside ?? clips });
    });
  }
  // fırçalı yay/çizgi: tek renk (S.line sarmalayıcı; genişlik ekran px). o.height:false → kabartma yok
  const DUMMY = makeCanvas(2, 2).getContext('2d');
  function line(S, pts, w0, col, o = {}) {
    const hx = S.hx; if (o.height === false) S.hx = DUMMY;
    S.line(pts, w0 * S.k, col, { edge: false, ...o, w1: (o.w1 ?? w0) * S.k });
    S.hx = hx;
  }
  // kırışık / oluk: renkte koyu çizgi + ışık yanında açık sırt; yükseklikte oluk(koyu)+sırt(açık)
  function crease(S, pts, w, dark, light, o = {}) {
    const k = S.k; const n = pts.length; if (n < 2) return;
    const off = (d) => pts.map((q, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; let nx = -dy / l, ny = dx / l; if (nx * LT[0] + ny * LT[1] < 0) { nx = -nx; ny = -ny; } return [q[0] + nx * d, q[1] + ny * d]; });
    const tap = (i) => Math.sin(Math.PI * (i / (n - 1))) * 0.85 + 0.15;
    const strokeP = (ctx, P, wid, col, alpha) => { ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineCap = 'round'; for (let i = 0; i < P.length - 1; i++) { ctx.lineWidth = Math.max(0.6, wid * tap(i)); ctx.beginPath(); ctx.moveTo(P[i][0], P[i][1]); ctx.lineTo(P[i + 1][0], P[i + 1][1]); ctx.stroke(); } ctx.restore(); };
    strokeP(S.x, pts, w * k, dark, o.alpha ?? 0.9);
    if (light) strokeP(S.x, off(w * k * 0.9), w * k * 0.55, light, (o.alpha ?? 0.9) * 0.8);
    if (o.height !== false) { strokeP(S.hx, pts, w * k * 1.2, 'rgb(84,84,84)', 0.8); strokeP(S.hx, off(w * k * 1.0), w * k * 0.9, 'rgb(186,186,186)', 0.7); }
  }
  // yarı saydam fırçalı çizgi (cam, parıltı)
  function softLine(S, pts, w, col, alpha = 1, o = {}) {
    const ctx = S.x; ctx.save(); ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineCap = o.cap ?? 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = w * S.k;
    ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); ctx.restore();
  }
  // sivri yaprak yolu (yerel: taban (0,0) → uç (len,0)), genişlik w, kavis bend
  function leafPts(x, y, ang, len, wid, o = {}) {
    const bend = o.bend ?? 0, asym = o.asym ?? 0, n = o.n ?? 18; const c = Math.cos(ang), s = Math.sin(ang);
    const top = [], bot = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n; const u = t * len;
      const half = wid / 2 * Math.pow(Math.sin(Math.PI * Math.pow(t, o.pow ?? 0.85)), o.fat ?? 0.9);
      const v0 = bend * len * Math.sin(Math.PI * t) * 0.5 + bend * len * t * t * 0.3;
      const ser = o.serr ? (i % 2 ? 1 : 0.86) : 1;
      top.push([u, v0 - half * (1 + asym) * ser]); bot.push([u, v0 + half * (1 - asym) * ser]);
    }
    const loc = [...top, ...bot.reverse().slice(1, -1)];
    const mid = []; for (let i = 0; i <= n; i++) { const t = i / n; mid.push([t * len, bend * len * Math.sin(Math.PI * t) * 0.5 + bend * len * t * t * 0.3]); }
    const tr = ([u, v]) => [x + u * c - v * s, y + u * s + v * c];
    return { pts: loc.map(tr), mid: mid.map(tr), top: top.map(tr) };
  }
  // iki tonlu yaprak: damarın ışığa bakan yarısı açık, öbürü koyu; ince damar. pal: 5-6 renk (koyu→açık)
  function leaf(S, x, y, ang, len, wid, pal, o = {}) {
    const L = leafPts(x, y, ang, len, wid, o); const sh = shape(L.pts, 0.4);
    const k = S.k; const ls = len / k;
    const nx = -Math.sin(ang), ny = Math.cos(ang); const lightTop = nx * LT[0] + ny * LT[1] < 0; // üst (-n) yarı ışıkta mı
    const topHalf = poly([...L.mid, ...L.top.slice().reverse()]);
    const outTop = (() => { const p = new Path2D(); p.rect(sh.bb[0] - 60, sh.bb[1] - 60, sh.bb[2] - sh.bb[0] + 120, sh.bb[3] - sh.bb[1] + 120); p.addPath(topHalf); return [p, 'evenodd']; })();
    const pd = o.dark ? 1 : 0;
    const sw = [clamp(ls * 0.07, 2.5, 11), clamp(ls * 0.12, 3.5, 15)];
    layer(S, { clip: sh.path, bb: sh.bb, cols: [pal[1 + pd], pal[2 + pd]], base: pal[1 + pd], dir: () => ang + (S.r() - 0.5) * 0.9, len: [ls * 0.2, ls * 0.4], wid: sw, cover: 1.8, rim: o.rim ?? { w: 1.5, alpha: 0.85 }, lJit: 0.025 });
    layer(S, { clip: [sh.path, lightTop ? [topHalf, 'nonzero'] : outTop], bb: sh.bb, cols: [pal[3 + pd], pal[Math.min(pal.length - 1, 4 + pd)]], base: pal[3 + pd], dir: ang + (lightTop ? -0.45 : 0.45), dirJit: 0.15, len: [ls * 0.18, ls * 0.36], wid: sw, cover: 1.8, lJit: 0.025 });
    if (o.vein !== false) line(S, L.mid.slice(1, Math.round(L.mid.length * 0.9)), clamp(ls * 0.022, 1.1, 3), o.vein ?? shade(pal[Math.min(pal.length - 1, 4 + pd)], 0.08, 0.7), { w1: 0.5 });
    return { sh, mid: L.mid, lightTop };
  }
    // yolu kaydır / ölçekle (Path2D kopyası)
  function moved(path, dx, dy, sc = 1, ox = 0, oy = 0) { const p = new Path2D(); p.addPath(path, new DOMMatrix().translateSelf(dx + ox, dy + oy).scaleSelf(sc, sc).translateSelf(-ox, -oy)); return p; }
  // gövdenin, ışığa doğru kaydırılmış kopyası DIŞINDA kalan hilal (evenodd kırpma)
  function crescent(path, bb, d, sc = 1, ox = 0, oy = 0) { const ln = Math.hypot(LT[0], LT[1]); const p = new Path2D(); p.rect(bb[0] - 60, bb[1] - 60, bb[2] - bb[0] + 120, bb[3] - bb[1] + 120); p.addPath(moved(path, (LT[0] / ln) * d, (LT[1] / ln) * d, sc, ox, oy)); return [p, 'evenodd']; }
  // ---- basamaklı ton topu: yuvarlak gövdeler için ortak boyama (Kurzgesagt sadeliğinde katlar + akrilik darbe)
  // o: cx, cy, R (sprite px), P: 9 renk (0 en koyu … 6 vurgu, 7 parlak, 8 beyaz-sıcak), dir: (x,y)→açı,
  //    sL/sW: darbe boy/en (ekran px), seed, refl: yansıyan ışık rengi, gloss 0..1, rimW
  function toneBall(S, body, o) {
    const { cx, cy, R } = o; const P = o.P; const bp = body.path, bb = body.bb; const k = S.k;
    const ln = Math.hypot(LT[0], LT[1]); const ox = LT[0] / ln, oy = LT[1] / ln;
    const at = (d) => [cx + ox * R * d, cy + oy * R * d];
    const dir = o.dir; const sL = o.sL, sW = o.sW; const sd = o.seed ?? 1;
    const ry = o.ry ?? 1; // dikey basıklık (elips gövdeler)
    const blobAt = (x0, y0, rx, ryy, rot, s2) => smoothPath(blobPts(x0, y0, rx, ryy, 22, o.blobAmp ?? 0.06, s2, rot));
    const breakup = (path, x0, y0, sc, cols, cover) => { // kenarı fırça uçlarıyla kır
      const big = moved(path, 0, 0, sc, x0, y0), small = moved(path, 0, 0, 2 - sc, x0, y0);
      const ring = new Path2D(); ring.rect(bb[0] - 60, bb[1] - 60, bb[2] - bb[0] + 120, bb[3] - bb[1] + 120); ring.addPath(small);
      layer(S, { clip: [bp], inside: [big, [ring, 'evenodd']], bb, cols, dir, len: [sL[0] * 0.7, sL[1] * 0.7], wid: [sW[0] * 0.8, sW[1] * 0.8], soft: true, cover, sort: false });
    };
    layer(S, { clip: bp, bb, cols: [P[2], P[3], P[3]], base: P[3], dir, len: sL, wid: sW, cover: 1.4, rim: o.rim === false ? false : { w: o.rimW ?? clamp(R / k * 0.016, 1.2, 3.4), alpha: 0.9 } });
    if (o.shadow !== false) {
      // gölge: keskin hilal kat + sınırında kısa fırça uçlarıyla kırılma
      const sd0 = R * (o.shadowD ?? 0.34);
      layer(S, { clip: [bp, crescent(bp, bb, sd0)], bb, cols: [P[1], P[2]], base: P[1], dir, len: sL, wid: sW, cover: 1.3 });
      const ring = (() => { const p = new Path2D(); p.rect(bb[0] - 60, bb[1] - 60, bb[2] - bb[0] + 120, bb[3] - bb[1] + 120); p.addPath(moved(bp, ox * sd0 * 1.25, oy * sd0 * 1.25)); return [p, 'evenodd']; })();
      layer(S, { clip: [bp], inside: [bp, ring, moved(bp, ox * sd0 * 0.75, oy * sd0 * 0.75)], bb, cols: [P[1], P[2], P[2]], dir, len: [sL[0] * 0.5, sL[1] * 0.55], wid: [sW[0] * 0.8, sW[1] * 0.8], soft: true, cover: 0.9, sort: false });
    }
    if (o.refl) layer(S, { clip: [bp, crescent(bp, bb, R * (o.reflD ?? 0.075))], bb, cols: [o.refl, shade(o.refl, 0.04)], base: o.refl, dir, len: [sL[0] * 0.5, sL[1] * 0.5], wid: [sW[0] * 0.6, sW[1] * 0.6], cover: 1.6 });
    const [l1x, l1y] = at(o.litD ?? 0.3);
    const lit = blobAt(l1x, l1y, R * (o.litR ?? 0.84), R * (o.litR ?? 0.84) * 0.97 * ry, 0.3, sd + 5);
    layer(S, { clip: [bp, lit], bb, cols: [P[4], P[4], P[5]], base: P[4], dir, len: sL, wid: sW, cover: 1.3, broken: 0.08, shade: (x, y) => clamp(0.92 - Math.hypot(x - l1x, y - l1y) / R), noise: 0.05 });
    breakup(lit, l1x, l1y, 1.07, [P[4], P[4]], 0.9);
    const [l2x, l2y] = at(o.lightD ?? 0.5);
    const lr = o.lightR ?? [0.5, 0.43];
    const light = blobAt(l2x, l2y, R * lr[0], R * lr[1] * ry, 0.65, sd + 6);
    layer(S, { clip: [bp, light], bb, cols: [P[5], P[5], P[6]], base: P[5], dir, len: [sL[0] * 0.8, sL[1] * 0.8], wid: [sW[0] * 0.85, sW[1] * 0.85], cover: 1.3, shade: (x, y) => clamp(0.95 - Math.hypot(x - l2x, y - l2y) / (R * 0.58)), noise: 0.06 });
    breakup(light, l2x, l2y, 1.1, [P[5]], 0.9);
    const g = o.gloss ?? 1;
    if (g > 0.05) {
      const [l3x, l3y] = at(o.hiD ?? 0.6); const hr = o.hiR ?? [0.22, 0.15];
      layer(S, { clip: [bp, ellipsePath(l3x, l3y, R * hr[0], R * hr[1] * ry, -0.75)], bb, cols: [P[6], P[7]], alpha: g, dir, len: [sL[0] * 0.5, sL[1] * 0.55], wid: [sW[0] * 0.65, sW[1] * 0.65], soft: true, cover: 2.6, shade: (x, y) => clamp(0.95 - Math.hypot(x - l3x, y - l3y) / (R * (hr[0] + 0.04))) });
    }
    return { at, ox, oy };
  }
  return { toneBall, TAU, LT, poly, bboxOf, circ, ellPts, shape, polyShape, ellShape, outside, crPts, withClip, fill, dab, field, layer, line, crease, softLine, leafPts, leaf, normClips, makeTest, moved, crescent };
})();

// ------------------------------------------------------------------------------------------------
// NAR: koyu doygun nar kırmızısı, doğal ve hafif düzensiz taç (kaliks).
// pomegranateOn(S, cx, cy, R, o): var olan sprite'a boyar. o.wither 0..1 kuruma, o.crownAng taç yönü
const NAR_PAL = ['#2E0418', '#4C0820', '#720C28', '#990F2C', '#BC1530', '#D92436', '#EE4A44', '#FA8A7A', '#FFE4DA'];
const NAR_KURU = ['#1C0A0E', '#2C1014', '#401A1C', '#562426', '#6E302C', '#863E34', '#9C503E', '#B46C54', '#C49A86'];
function pomegranateOn(S, cx, cy, R, o = {}) {
  const { layer, dab, line, crease, withClip, crescent, shape, circ } = YIY;
  const wi = o.wither ?? 0; const r = S.r; const k = S.k; const Rs = R / k;
  const seed = o.seed ?? 11; const rr = rng(seed);
  const P = (o.pal ?? NAR_PAL).map((c, i) => (wi > 0 ? mix(c, NAR_KURU[i], wi * 0.88) : c));
  const ca = o.crownAng ?? -Math.PI / 2 + 0.1; // taç yönü
  const ax = Math.cos(ca), ay = Math.sin(ca);
  // gövde: hafif köşeli küre (5 belirsiz yüz), taç tarafı omuzlu; kuruyunca göçük, sarkık
  const pts = []; const N = 48; const ph = rr() * 6;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rel = Math.cos(a - ca);
    let m = 1 + 0.02 * Math.cos(5 * (a - ca) + ph) - 0.05 * Math.pow(Math.max(0, rel), 3) + 0.015 * Math.sin(a * 2 + ph);
    if (wi > 0) m *= 1 + wi * (0.045 * Math.sin(a * 3 + ph * 2) + 0.03 * Math.sin(a * 7 + ph) + 0.02 * Math.sin(a * 11 + ph * 3) - 0.07 * Math.pow(Math.max(0, rel), 2));
    pts.push([cx + Math.cos(a) * R * m * 1.02, cy + Math.sin(a) * R * m * (0.97 - wi * 0.05)]);
  }
  const body = shape(pts, 0.5); const bb = body.bb; const bp = body.path;
  const tipX = cx + ax * R * (0.93 - wi * 0.08), tipY = cy + ay * R * (0.93 - wi * 0.08); // tacın kökü
  const merid = (x, y) => Math.atan2(y - (tipY + ay * R * 0.25), x - (tipX + ax * R * 0.25)) + (r() - 0.5) * 0.24;
  const sL = [Rs * 0.2, Rs * 0.38], sW = [clamp(Rs * 0.075, 4, 18), clamp(Rs * 0.115, 6, 24)];
  const L = YIY.LT; const ln = Math.hypot(L[0], L[1]); const ox = L[0] / ln, oy = L[1] / ln;
  const at = (d) => [cx + ox * R * d, cy + oy * R * d];
  YIY.toneBall(S, body, { cx, cy, R, P, dir: merid, sL, sW, seed, shadowD: 0.42, litD: 0.36, litR: 0.8, gloss: 1 - wi * 1.4, refl: mix(P[2], '#62207A', 0.36 - wi * 0.24), rimW: clamp(Rs * 0.016, 1.6, 3.4) });
  // 4) belirsiz yüz sırtları (meridyen): taçtan inen çok ince çizgiler (kabartmasız)
  withClip(S, bp, () => {
    const vx = -ay, vy = ax;
    for (let i = 0; i < 4; i++) {
      const phi = (i - 1.5) * 0.7 + (rr() - 0.5) * 0.14;
      const q = []; for (let j = 0; j <= 16; j++) { const t = 0.12 + (j / 16) * 0.72; const u = Math.cos(Math.PI * t) * R * 0.95, v = Math.sin(Math.PI * t) * Math.sin(phi) * R; q.push([cx + ax * u + vx * v, cy + ay * u + vy * v]); }
      const mx = q[8][0] - cx, my = q[8][1] - cy; const lit = mx * L[0] + my * L[1] > -R * 0.1;
      line(S, q, clamp(Rs * 0.01, 1, 2.2), lit ? shade(P[5], 0.04, 0.9) : P[2], { w1: 0.6, taper: true, height: false });
    }
  });
  // 5) kuruma: düzensiz kırışık ağı (oluk + sırt, kabartmalı) ve birkaç göçük
  if (wi > 0.05) {
    withClip(S, bp, () => {
      const vx = -ay, vy = ax;
      const sphPt = (t, phi) => { const u = Math.cos(Math.PI * t) * R * 0.95, v = Math.sin(Math.PI * t) * Math.sin(phi) * R * 0.98; return [cx + ax * u + vx * v, cy + ay * u + vy * v]; };
      // ana oluklar: taçtan yanlara kavisli, kısa-orta boy, dallanan
      const nW = Math.round(10 * wi);
      for (let i = 0; i < nW; i++) {
        const phi = (rr() - 0.5) * 2.8; const t0 = 0.12 + rr() * 0.45, t1 = t0 + 0.12 + rr() * 0.28; const sw = (rr() - 0.5) * 0.9;
        const q = []; for (let j = 0; j <= 10; j++) { const tt = lerp(t0, t1, j / 10); q.push(sphPt(tt, phi + sw * (j / 10) + Math.sin(tt * 14 + i) * 0.05)); }
        crease(S, q, clamp(Rs * 0.028, 2.4, 6), P[1], P[7], { alpha: 0.9 });
        if (rr() < 0.5) { const j0 = 4 + Math.floor(rr() * 4); const br = []; const d = rr() < 0.5 ? 1 : -1; for (let j = 0; j <= 5; j++) { const p0 = q[j0]; br.push([p0[0] + j * R * 0.025 * d, p0[1] + j * R * 0.02 + Math.sin(j) * 2]); } crease(S, br, clamp(Rs * 0.018, 1.6, 4), P[1], P[6], { alpha: 0.8 }); }
      }
      // ince buruşukluklar
      for (let i = 0; i < Math.round(14 * wi); i++) {
        const t = 0.15 + rr() * 0.75, phi = (rr() - 0.5) * 2.9; const [x0, y0] = sphPt(t, phi);
        const dir = rr() * Math.PI; const len = R * (0.06 + rr() * 0.1);
        const q = []; for (let j = 0; j <= 5; j++) { const tt = j / 5 - 0.5; q.push([x0 + Math.cos(dir) * len * tt, y0 + Math.sin(dir) * len * tt + Math.sin(tt * 5 + i) * 2 * k]); }
        crease(S, q, clamp(Rs * 0.016, 1.4, 3.2), P[1], P[6], { alpha: 0.7 });
      }
    });
  }
  // 6) parlak vurgu: kısa keskin darbeler + beyazımsı nokta (kuruyunca yok)
  if (wi < 0.5) {
    const ha = 1 - wi * 2;
    const [hx0, hy0] = at(0.66); const ta = Math.atan2(oy, ox) + Math.PI / 2;
    for (let i = 0; i < 4; i++) {
      const u = (i - 1.5) / 1.5;
      dab(S, hx0 + Math.cos(ta) * R * 0.09 * u, hy0 + Math.sin(ta) * R * 0.09 * u + Math.abs(u) * R * 0.02, ta + 0.2 + u * 0.25, Rs * (0.07 + 0.04 * (1 - Math.abs(u))), Rs * 0.036, P[7], { alpha: 0.95 * ha, dry: 0.4 });
    }
    dab(S, hx0 - R * 0.015, hy0 - R * 0.01, ta + 0.25, Rs * 0.06, Rs * 0.026, P[8], { alpha: ha });
  }
  crownOn(S, tipX, tipY, R, ca, P, wi, rr);
  return body;
}
// taç (kaliks): kısa huni boyun, ağız çevresinde 6 etli, düzensiz çanak yaprak; içte koyu çukur ve kuru ercikler
function crownOn(S, tx, ty, R, ca, P, wi, rr) {
  const { layer, fill, line } = YIY;
  const k = S.k; const Rs = R / k;
  const rot = ca + Math.PI / 2; const c = Math.cos(rot), s = Math.sin(rot);
  const T = ([u, v]) => [tx + u * c - v * s, ty + u * s + v * c];
  const TP = (pts) => pts.map(T);
  const sc = (R / 192) * 1.25 * (1 - wi * 0.1); // geometri ölçeği (sprite px)
  const ss = clamp(Rs / 192, 0.3, 2); // darbe ölçeği (ekran px)
  const rimY = -27 * sc, rw = 25 * sc, rry = 8.5 * sc;
  const cb = mix(P[3], '#641A1E', 0.14 + wi * 0.36);
  const CP = [shade(cb, -0.17, 1.05, -4), shade(cb, -0.08), cb, shade(cb, 0.08, 0.95, 5), shade(cb, 0.16, 0.85, 9)];
  const tipC = mix(cb, '#3A1A10', 0.6);
  const lx = Math.cos(Math.atan2(YIY.LT[1], YIY.LT[0]) - rot); const sg = lx <= 0 ? -1 : 1; // ışık hangi yandan
  const lean = (rr() - 0.5) * 0.12; // bütün tacın hafif eğikliği
  const LN = ([u, v]) => [u + v * -lean, v]; // eğiklik: üst kısım yana kayar
  // gövdeye oturduğu yerde koyu gölge halkası (gövde üstünde)
  fill(S, YIY.shape(TP(YIY.ellPts(0, 10 * sc, rw * 1.45, 9 * sc, 0, 20)), 0.5).path, P[2], { alpha: 0.8, height: false });
  // boyun: huni (dipte geniş yumuşak omuz, belde ince, ağızda açılan)
  const neckL = [[-34, 18], [-27, 8], [-19, -6], [-19, -16], [-24, -27]].map(([u, v]) => LN([u * sc, v * sc]));
  const neckR = [[24, -27], [20, -16], [20, -6], [28, 8], [35, 18]].map(([u, v]) => LN([u * sc, v * sc]));
  const neckPts = TP([...YIY.crPts(neckL, 2), ...YIY.crPts([[-24 * sc, rimY], [0, rimY - rry * 0.2], [24 * sc, rimY]].map(LN), 3).slice(1, -1), ...YIY.crPts(neckR, 2), [0, 24 * sc]]);
  const neck = YIY.polyShape(neckPts);
  layer(S, { clip: neck.path, bb: neck.bb, cols: CP.slice(1, 5), base: CP[2], shade: (x, y) => { const u = (x - tx) * c + (y - ty) * s; return clamp(0.48 + (u / (rw * 1.1)) * 0.55 * sg); }, dir: rot - Math.PI / 2, dirJit: 0.12, len: [8 * ss, 15 * ss], wid: [4.5 * ss, 7 * ss], cover: 1.6, noise: 0.04 });
  // çanak yaprakları
  const n = 6; const sep = []; const th0 = rr() * 1.0;
  for (let i = 0; i < n; i++) {
    const th = th0 + (i / n) * Math.PI * 2 + (rr() - 0.5) * 0.35;
    const cs = Math.cos(th), sn = Math.sin(th);
    const base = LN([cs * rw * 0.96, rimY + sn * rry]);
    const L0 = (22 + rr() * 11) * sc * (1 - wi * 0.25) * (sn > 0 ? 1 : 0.9);
    const out = (0.55 + rr() * 0.35); const curl = (0.25 + rr() * 0.5) * (1 + wi);
    const broken = wi > 0.3 && rr() < 0.35;
    sep.push({ th, cs, sn, base, L0, out, curl, broken, hw: (10.5 + rr() * 3.5) * sc });
  }
  const sepal = (q) => {
    const L2 = q.L0 * (q.broken ? 0.55 : 1);
    // 3B yön: dışa (cs, sn·ezik) + yukarı; üst yarıda dışa kıvrılır
    const dx = q.cs * q.out, dy = -1 + q.sn * 0.25 * q.out; const dl = Math.hypot(dx, dy);
    const ux = dx / dl, uy = dy / dl; const px = -uy, py = ux; // yan yön
    const mid = [q.base[0] + ux * L2 * 0.5, q.base[1] + uy * L2 * 0.5];
    const ca2 = Math.atan2(uy, ux) + q.curl * Math.sign(q.cs || 0.01);
    const tip = [mid[0] + Math.cos(ca2) * L2 * 0.55, mid[1] + Math.sin(ca2) * L2 * 0.55];
    const w = q.hw * (0.75 + 0.25 * Math.abs(q.cs)); // önden bakılanlar daha dar görünür
    const b0 = [q.base[0] - px * w, q.base[1] - py * w + 3 * sc], b1 = [q.base[0] + px * w, q.base[1] + py * w + 3 * sc];
    const m0 = [mid[0] - px * w * 0.62, mid[1] - py * w * 0.62], m1 = [mid[0] + px * w * 0.62, mid[1] + py * w * 0.62];
    const loc = [...YIY.crPts([b0, m0, tip], 2.5), ...YIY.crPts([tip, m1, b1], 2.5).slice(1), [q.base[0], q.base[1] + 7 * sc]];
    const sh = YIY.polyShape(TP(loc));
    const inner = q.sn < 0; // arkadakilerin iç yüzü görünür
    const litSide = sg; // yerel ışık yönü
    const sideLit = (px * litSide > 0) ? 1 : -1; // hangi kenar (b1:+1 / b0:-1) ışığa bakar
    const mS = sideLit > 0 ? m1 : m0, bS = sideLit > 0 ? b1 : b0;
    const half = YIY.poly(TP([[q.base[0], q.base[1] + 7 * sc], bS, ...YIY.crPts([bS, mS, tip], 2.5), mid]));
    const base = inner ? CP[1] : CP[2];
    layer(S, { clip: sh.path, bb: sh.bb, cols: [shade(base, -0.03), base], base, dir: rot + Math.atan2(uy, ux), dirJit: 0.1, len: [8 * ss, 14 * ss], wid: [4.5 * ss, 7 * ss], cover: 1.5, rim: { w: 1.25 * ss, alpha: 0.85 } });
    layer(S, { clip: [sh.path, half], bb: sh.bb, cols: [inner ? CP[2] : CP[3], inner ? CP[3] : CP[4]], base: inner ? CP[2] : CP[3], dir: rot + Math.atan2(uy, ux), dirJit: 0.1, len: [8 * ss, 13 * ss], wid: [4.5 * ss, 6.5 * ss], cover: 1.5 });
    // kurumuş, koyu uç
    line(S, TP(YIY.crPts([[lerp(mid[0], tip[0], 0.5), lerp(mid[1], tip[1], 0.5)], tip], 2)), 3.4 * ss, tipC, { w1: 1.1 * ss, height: false });
  };
  // arka yapraklar (iç yüz), ağız, ercikler, ön yapraklar
  const order = sep.slice().sort((a, b) => a.sn - b.sn);
  for (const q of order.filter((q) => q.sn < 0)) sepal(q);
  const mouth = YIY.shape(TP(YIY.ellPts(LN([0, rimY])[0], rimY, rw * 0.92, rry * 0.9, 0, 20)), 0.5);
  fill(S, mouth.path, mix('#1E040C', P[0], 0.35), { h: 108 });
  for (let i = 0; i < 12; i++) {
    const u = (rr() - 0.5) * rw * 1.3, v = rimY + (rr() - 0.3) * rry * 0.7;
    const q0 = T(LN([u, v])), q1 = T(LN([u + (rr() - 0.5) * 6 * sc, v - (4 + rr() * 8) * sc]));
    line(S, [q0, q1], 2 * ss, rr() < 0.55 ? mix('#C89458', P[3], 0.15 + wi * 0.5) : mix('#7E4C30', P[2], wi * 0.5), { w1: 1 * ss, height: false });
  }
  for (const q of order.filter((q) => q.sn >= 0)) sepal(q);
}

function paintPomegranate(o = {}) {
  const k = o.k ?? 1; const w = 500 * k, h = 520 * k;
  const S = Paint.sprite(w, h, { seed: o.seed ?? 11, k });
  const cx = 250 * k, cy = 284 * k, R = 192 * k * (1 - (o.wither ?? 0) * 0.15);
  pomegranateOn(S, cx, cy + (o.wither ?? 0) * 20 * k, R, o);
  return { canvas: S.finish({ emboss: 0.42 }), px: cx, py: cy, k };
}
defSprite('nar', () => paintPomegranate({ seed: 11 }));
defSprite('nar-kuru', () => paintPomegranate({ wither: 1, seed: 11 }));
