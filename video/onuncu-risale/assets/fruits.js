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
  // katman: kırpılmış düz taban + üstünde fırça alanı (basamaklı ton katı)
  function layer(S, o) {
    const clips = normClips(o.clip);
    if (o.rim) { const rp = o.rimPath || clips[0][0]; S.rim(rp, typeof o.rim === 'object' ? { w: 2.2, ...o.rim } : { w: 2.2 }); }
    withClip(S, clips, () => {
      if (o.base !== null) {
        const bcol = o.base ?? o.cols[Math.floor(o.cols.length / 2)];
        S.x.save(); S.x.globalAlpha = o.baseAlpha ?? o.alpha ?? 1; S.x.fillStyle = bcol; S.x.fillRect(o.bb[0] - 2, o.bb[1] - 2, o.bb[2] - o.bb[0] + 4, o.bb[3] - o.bb[1] + 4); S.x.restore();
        if (o.height !== false) { const g = o.h ?? 132; S.hx.save(); S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fillRect(o.bb[0] - 2, o.bb[1] - 2, o.bb[2] - o.bb[0] + 4, o.bb[3] - o.bb[1] + 4); S.hx.restore(); }
      }
      field(S, { ...o, clip: null, inside: o.inside ?? clips });
    });
  }
  // fırçalı yay/çizgi: tek renk, sivrilen uçlar (S.line sarmalayıcı; ölçek k)
  const line = (S, pts, w0, col, o = {}) => S.line(pts, w0 * S.k, col, { edge: false, ...o, w1: (o.w1 ?? w0) * S.k });
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
  return { TAU, LT, poly, bboxOf, circ, ellPts, shape, polyShape, ellShape, outside, crPts, withClip, fill, dab, field, layer, line, softLine, leafPts, leaf, normClips, makeTest };
})();

// ------------------------------------------------------------------------------------------------
// NAR: koyu doygun nar kırmızısı, doğal ve hafif düzensiz taç (kaliks).
// pomegranateOn(S, cx, cy, R, o): var olan sprite'a boyar. o.wither 0..1 kuruma, o.crownAng taç yönü
const NAR_PAL = ['#2E0618', '#4E0A22', '#740E2A', '#9C1230', '#BF1A35', '#DA2A3C', '#EE5450', '#F88E84', '#FFE2DA'];
const NAR_KURU = ['#24100F', '#361714', '#4A1F1A', '#5E2A22', '#70342A', '#824034', '#955040', '#A86A56', '#C9A08A'];
function pomegranateOn(S, cx, cy, R, o = {}) {
  const { poly, bboxOf, layer, fill, dab, line, withClip, outside, shape } = YIY;
  const wi = o.wither ?? 0; const r = S.r; const k = S.k; const Rs = R / k;
  const seed = o.seed ?? 11; const rr = rng(seed);
  const P = (o.pal ?? NAR_PAL).map((c, i) => (wi > 0 ? mix(c, NAR_KURU[i], wi) : c));
  const ca = o.crownAng ?? -Math.PI / 2 + 0.1; // taç yönü
  const ax = Math.cos(ca), ay = Math.sin(ca);
  // gövde: hafif köşeli küre (5 belirsiz yüz), taç tarafı omuzlu; kuruyunca göçük
  const pts = []; const N = 44; const ph = rr() * 6;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const rel = Math.cos(a - ca); // taca yakınlık
    let m = 1 + 0.022 * Math.cos(5 * (a - ca) + ph) - 0.05 * Math.pow(Math.max(0, rel), 3) + 0.018 * Math.sin(a * 2 + ph);
    if (wi > 0) m *= 1 + wi * (0.05 * Math.sin(a * 3 + ph * 2) + 0.035 * Math.sin(a * 7 + ph) - 0.04 * Math.pow(Math.max(0, -Math.sin(a)), 2));
    pts.push([cx + Math.cos(a) * R * m * 1.02, cy + Math.sin(a) * R * m * 0.97]);
  }
  const body = shape(pts, 0.5); const bb = body.bb;
  const tipX = cx + ax * R * 0.93, tipY = cy + ay * R * 0.93; // tacın kökü
  const merid = (x, y) => Math.atan2(y - (tipY + ay * R * 0.25), x - (tipX + ax * R * 0.25)) + (r() - 0.5) * 0.22;
  const sL = [Rs * 0.2, Rs * 0.38], sW = [clamp(Rs * 0.075, 5, 18), clamp(Rs * 0.115, 7, 24)];
  const L = YIY.LT; const ox = L[0] / Math.hypot(L[0], L[1]), oy = L[1] / Math.hypot(L[0], L[1]);
  const at = (d) => [cx + ox * R * d, cy + oy * R * d];
  // 1) taban: orta-koyu
  layer(S, { clip: body.path, bb, cols: [P[2], P[3]], base: P[3], dir: merid, len: sL, wid: sW, cover: 1.6, rim: { w: clamp(Rs * 0.016, 1.6, 3.4), alpha: 0.9 } });
  // 2) gölge hilali (sağ alt) + koyu çekirdek + yansıyan ışık
  const [c1x, c1y] = at(0.2);
  layer(S, { clip: [body.path, outside(bb, c1x, c1y, R * 0.9, R * 0.88)], bb, cols: [P[1], P[2]], base: P[2], dir: merid, len: sL, wid: sW, cover: 1.8 });
  const [c2x, c2y] = at(0.06);
  layer(S, { clip: [body.path, outside(bb, c2x, c2y, R * 0.985, R * 0.95)], bb, cols: [mix(P[2], '#5A1E6A', 0.35 + wi * -0.2), mix(P[3], '#6A2A70', 0.3 - wi * 0.2)], base: mix(P[2], '#5A1E6A', 0.3 - wi * 0.15), dir: merid, len: [sL[0] * 0.6, sL[1] * 0.6], wid: [sW[0] * 0.7, sW[1] * 0.7], cover: 1.6 });
  // 3) ışık katları (sol üst): aydınlık, açık, vurgu
  const [l1x, l1y] = at(0.34);
  layer(S, { clip: [body.path, YIY.circ(l1x, l1y, R * 0.93)], bb, cols: [P[4], P[4], P[5]], base: P[4], dir: merid, len: sL, wid: sW, cover: 1.8, broken: 0.1, shade: (x, y) => clamp(0.85 - Math.hypot(x - l1x, y - l1y) / (R * 1.05)), jitter: 10, noise: 0.06 });
  const [l2x, l2y] = at(0.5);
  layer(S, { clip: [body.path, ellipsePath(l2x, l2y, R * 0.56, R * 0.52, 0.6)], bb, cols: [P[5], P[5], P[6]], base: P[5], dir: merid, len: [sL[0] * 0.85, sL[1] * 0.85], wid: [sW[0] * 0.85, sW[1] * 0.85], cover: 1.8, shade: (x, y) => clamp(0.9 - Math.hypot(x - l2x, y - l2y) / (R * 0.6)), jitter: 8, noise: 0.08 });
  if (wi < 0.6) {
    const [l3x, l3y] = at(0.6);
    layer(S, { clip: [body.path, ellipsePath(l3x, l3y, R * 0.26, R * 0.19, -0.75)], bb, cols: [P[6], P[7]], base: P[6], alpha: 1 - wi * 1.4, baseAlpha: (1 - wi * 1.4) * 0.9, dir: merid, len: [sL[0] * 0.6, sL[1] * 0.6], wid: [sW[0] * 0.7, sW[1] * 0.7], cover: 1.6, shade: (x, y) => clamp(0.9 - Math.hypot(x - l3x, y - l3y) / (R * 0.3)) });
  }
  // 4) belirsiz yüz sırtları (meridyen): küre üzerinde taçtan inen ince çizgiler
  withClip(S, body.path, () => {
    const vx = -ay, vy = ax; // taç eksenine dik
    for (let i = 0; i < 5; i++) {
      const phi = (i - 2) * 0.62 + (rr() - 0.5) * 0.14;
      const q = []; for (let j = 0; j <= 16; j++) { const t = 0.1 + (j / 16) * 0.8; const u = Math.cos(Math.PI * t) * R * 0.95, v = Math.sin(Math.PI * t) * Math.sin(phi) * R; q.push([cx + ax * u + vx * v, cy + ay * u + vy * v]); }
      const mx = q[8][0] - cx, my = q[8][1] - cy; const lit = mx * L[0] + my * L[1] > -R * 0.15;
      line(S, q, clamp(Rs * 0.011, 1.1, 2.4), lit ? shade(P[5], 0.06, 0.9) : P[2], { w1: 0.7, taper: true });
    }
  });
  // 5) kuruma: kırışıklar (koyu oluk + ışık tarafında ince sırt)
  if (wi > 0.05) {
    withClip(S, body.path, () => {
      const nW = Math.round(16 * wi);
      for (let i = 0; i < nW; i++) {
        const a = rr() * Math.PI * 2, d = R * (0.2 + rr() * 0.75); const x0 = cx + Math.cos(a) * d, y0 = cy + Math.sin(a) * d * 0.97;
        const dir = a + Math.PI / 2 + (rr() - 0.5) * 1.2; const len = R * (0.18 + rr() * 0.3); const bend = (rr() - 0.5) * 0.9;
        const q = []; for (let j = 0; j <= 8; j++) { const t = j / 8 - 0.5; const aa = dir + bend * t; q.push([x0 + Math.cos(dir) * len * t + Math.cos(aa + Math.PI / 2) * bend * len * 0.2 * (1 - 4 * t * t), y0 + Math.sin(dir) * len * t + Math.sin(aa + Math.PI / 2) * bend * len * 0.2 * (1 - 4 * t * t)]); }
        line(S, q, clamp(Rs * 0.022, 2, 4.4), P[1], { taper: true });
        const nx = -Math.sin(dir), ny = Math.cos(dir); const s = nx * L[0] + ny * L[1] > 0 ? 1 : -1; const off = clamp(Rs * 0.02, 2, 4) * k * s;
        line(S, q.map(([x, y]) => [x + nx * off, y + ny * off]), clamp(Rs * 0.012, 1.2, 2.6), P[6], { taper: true });
      }
    });
  }
  // 6) parlak vurgu: kısa, keskin, forma sarılan darbeler (kuruyunca yok)
  if (wi < 0.5) {
    const ha = 1 - wi * 2;
    const [hx0, hy0] = at(0.64);
    for (let i = 0; i < 4; i++) {
      const t = (i - 1.5) * 0.16; const ang = Math.atan2(oy, ox) + Math.PI / 2 + t * 1.1;
      const q = [hx0 + Math.cos(ang) * R * 0.15 * (i - 1.5) * 0.7, hy0 + Math.sin(ang) * R * 0.15 * (i - 1.5) * 0.7];
      dab(S, q[0], q[1], ang + 0.15, Rs * (0.1 + 0.04 * (1 - Math.abs(i - 1.5) / 1.5)), Rs * 0.04, P[7], { alpha: 0.95 * ha, dry: 0.4 });
    }
    dab(S, hx0 - R * 0.01, hy0 - R * 0.02, Math.atan2(oy, ox) + Math.PI / 2 + 0.1, Rs * 0.07, Rs * 0.03, P[8], { alpha: ha });
    // alt kenarda ince soğuk yansıma çizgisi
    const q = []; for (let j = 0; j <= 10; j++) { const a = 0.15 + j * 0.11; q.push([cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.86]); }
    line(S, q, clamp(Rs * 0.016, 1.4, 3), mix(P[4], '#9A5AA8', 0.45), { taper: true });
  }
  // ---- taç (kaliks): yerel çerçevede (taç ekseni -y), sonra döndürülür
  crownOn(S, tipX, tipY, R, ca, P, wi, rr);
  return body;
}
function crownOn(S, tx, ty, R, ca, P, wi, rr) {
  const { poly, bboxOf, layer, fill, dab, line, withClip } = YIY;
  const k = S.k; const Rs = R / k;
  const rot = ca + Math.PI / 2; const c = Math.cos(rot), s = Math.sin(rot);
  const T = ([u, v]) => [tx + u * c - v * s, ty + u * s + v * c];
  const TP = (pts) => pts.map(T);
  const sc = R / 200 * (1 - wi * 0.12);
  const tubeH = 30 * sc, rw = 30 * sc, rry = 9.5 * sc; // boyun yüksekliği, ağız yarıçapı, ağız elipsi
  const cb = mix(P[3], '#5C2A1E', 0.28 + wi * 0.3); // taç gövde rengi (biraz kurumsu)
  const CP = [shade(cb, -0.2, 1.05), shade(cb, -0.1), cb, shade(cb, 0.08, 0.95, 4), shade(cb, 0.17, 0.85, 8)];
  const tipC = mix(cb, '#4A2416', 0.5);
  // boyun (kısa, hafif bel veren tüp)
  const neck = TP([[-rw * 1.18, 14 * sc], [-rw * 1.02, -tubeH * 0.4], [-rw * 0.98, -tubeH], [rw * 0.98, -tubeH], [rw * 1.04, -tubeH * 0.4], [rw * 1.2, 14 * sc], [0, 22 * sc]]);
  const neckSh = YIY.shape(neck, 0.35);
  const lx = Math.cos(Math.atan2(YIY.LT[1], YIY.LT[0]) - rot); // ışığın yerel x bileşeni
  layer(S, { clip: neckSh.path, bb: neckSh.bb, cols: CP.slice(1, 4), base: CP[2], shade: (x, y) => { const u = (x - tx) * c + (y - ty) * s; return clamp(0.55 - (u / rw) * 0.45 * Math.sign(-lx || 1)); }, dir: rot - Math.PI / 2, dirJit: 0.15, len: [10, 18], wid: [5, 8], cover: 2.4, rim: { w: 1.6, alpha: 0.8 } });
  // çanak yaprakları: ağız elipsi çevresinde 6 tane, düzensiz
  const n = 6; const sep = [];
  const th0 = rr() * 0.5;
  for (let i = 0; i < n; i++) {
    const th = th0 + (i / n) * Math.PI * 2 + (rr() - 0.5) * 0.35;
    const bx = Math.cos(th) * rw * 0.95, by = -tubeH + Math.sin(th) * rry;
    const front = Math.sin(th) > -0.05;
    let len = (front ? 34 : 26) * sc * (0.78 + rr() * 0.5) * (1 - wi * 0.25);
    const lean = Math.cos(th) * (0.55 + rr() * 0.3) + (rr() - 0.5) * 0.25 + (wi > 0 ? (rr() - 0.5) * 0.8 * wi : 0);
    const curl = (0.25 + rr() * 0.45) * Math.sign(Math.cos(th) || 1) * (1 + wi * 0.8);
    const bw = (2 * Math.PI * rw / n) * 0.55 * (0.85 + rr() * 0.3);
    sep.push({ th, bx, by, front, len, lean, curl, bw, broken: wi > 0.3 && rr() < 0.3 });
  }
  const sepal = (q) => {
    // taban (bx,by) genişliği bw, uç yönü: yukarı + dışa (lean), kıvrık uç
    const a = -Math.PI / 2 + q.lean; const L2 = q.len * (q.broken ? 0.6 : 1);
    const tip = [q.bx + Math.cos(a) * L2 + Math.cos(a + q.curl) * L2 * 0.25, q.by + Math.sin(a) * L2 + Math.sin(a + q.curl) * L2 * 0.25];
    const mid = [q.bx + Math.cos(a) * L2 * 0.55, q.by + Math.sin(a) * L2 * 0.55];
    const px = -Math.sin(a), py = Math.cos(a);
    const w = q.bw;
    const ptsL = [[q.bx - px * w * 0.55, q.by - py * w * 0.55 + 3 * sc], [mid[0] - px * w * 0.3, mid[1] - py * w * 0.3], tip];
    const ptsR = [tip, [mid[0] + px * w * 0.3, mid[1] + py * w * 0.3], [q.bx + px * w * 0.55, q.by + py * w * 0.55 + 3 * sc]];
    const pl = TP([...YIY.crPts(ptsL, 3), ...YIY.crPts(ptsR, 3).slice(1), [q.bx, q.by + 6 * sc]]);
    const sh = YIY.polyShape(pl);
    // ışığa bakan yarı açık
    const half = TP([[q.bx, q.by + 6 * sc], [q.bx - px * w * 0.6, q.by - py * w * 0.6], ...YIY.crPts([[mid[0] - px * w * 0.32, mid[1] - py * w * 0.32], tip], 3), [mid[0], mid[1]]]);
    const leftLit = (-px) * lx + 0 > -0.05 ? true : (-px * lx) > 0;
    const inner = !q.front; // arka yaprakların iç yüzü görünür: daha koyu
    const base = inner ? CP[1] : CP[2];
    layer(S, { clip: sh.path, bb: sh.bb, cols: [shade(base, -0.03), base], base, dir: rot + a, dirJit: 0.12, len: [8, 15], wid: [4, 6.5], cover: 2.2, rim: { w: 1.3, alpha: 0.85 } });
    layer(S, { clip: [sh.path, YIY.poly(half)], bb: sh.bb, cols: [inner ? CP[2] : CP[3], inner ? CP[3] : CP[4]], base: inner ? CP[2] : CP[3], dir: rot + a, dirJit: 0.12, len: [8, 14], wid: [4, 6], cover: 2.2 });
    // kuru uç
    const tp = T(tip); const tq = T([lerp(tip[0], mid[0], 0.35), lerp(tip[1], mid[1], 0.35)]);
    line(S, [tq, tp], 3.4 * sc / (k / k), tipC, { w1: 1, taper: false });
  };
  // arka yapraklar
  for (const q of sep.filter((q) => !q.front)) sepal(q);
  // ağız içi: koyu çukur + kurumuş ercik telleri
  const mouth = YIY.shape(TP(YIY.ellPts(0, -tubeH, rw * 0.92, rry * 0.95, 0, 20)), 0.5);
  fill(S, mouth.path, mix('#24060F', P[0], 0.3), { h: 112 });
  for (let i = 0; i < 9; i++) {
    const u = (rr() - 0.5) * rw * 1.3, v = -tubeH + (rr() - 0.4) * rry * 0.9; const q0 = T([u, v]), q1 = T([u + (rr() - 0.5) * 6 * sc, v - (6 + rr() * 8) * sc]);
    YIY.line(S, [q0, q1], 2.2 * sc, rr() < 0.5 ? mix('#B0784A', P[3], wi * 0.5) : mix('#7A4A30', P[2], wi * 0.5), { w1: 1.2 });
  }
  // ön yapraklar
  for (const q of sep.filter((q) => q.front).sort((a, b) => Math.sin(a.th) - Math.sin(b.th))) sepal(q);
}

function paintPomegranate(o = {}) {
  const k = o.k ?? 1; const w = 500 * k, h = 520 * k;
  const S = Paint.sprite(w, h, { seed: o.seed ?? 11, k });
  const cx = 250 * k, cy = 284 * k, R = 192 * k * (1 - (o.wither ?? 0) * 0.15);
  pomegranateOn(S, cx, cy + (o.wither ?? 0) * 20 * k, R, o);
  return { canvas: S.finish({ emboss: 0.6 }), px: cx, py: cy, k };
}
defSprite('nar', () => paintPomegranate({ seed: 11 }));
defSprite('nar-kuru', () => paintPomegranate({ wither: 1, seed: 11 }));
