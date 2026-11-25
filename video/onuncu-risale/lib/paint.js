// Akrilik boya ressamı (Atölye Stil Kataloğu S-042 "Akrilik").
// Düz uçlu fırçanın keskin kenarlı darbeleri, karışmadan üst üste binen düz ton katları, darbe
// kenarlarında ışık yakalayan ince boya sırtları, kıl izleri, kuru fırça uçları ve biçimlerin
// çevresinde yer yer görünen turuncu-kırmızı astar. Her nesne bir kez "boyanır" (sprite) ve
// sonra kamera ve canlandırmayla hareket ettirilir; tuval bezi dokusu en üstte ekran sabitidir.
'use strict';
const Paint = (() => {
  const UNDER = '#D8562F'; // turuncu-kırmızı astar
  const L = [-0.62, -0.78]; // ışık yönü: sol üstten (normalleştirilmiş)

  // ---- gölgelendirme modelleri: (x,y) → 0..1 açıklık
  const sphere = (cx, cy, r, light = L, amb = 0.12) => (x, y) => {
    const nx = (x - cx) / r, ny = (y - cy) / r; const d2 = nx * nx + ny * ny;
    const nz = Math.sqrt(Math.max(0, 1 - d2));
    const lz = 0.55; const ln = Math.hypot(light[0], light[1], lz);
    const v = (nx * light[0] + ny * light[1] + nz * lz) / ln;
    return clamp(amb + (1 - amb) * (v * 0.5 + 0.5) * (d2 > 1 ? 0.85 : 1));
  };
  const cylX = (cx, r, light = L, amb = 0.1) => (x) => {
    const nx = clamp((x - cx) / r, -1, 1); const nz = Math.sqrt(1 - nx * nx);
    const v = (nx * light[0] + nz * 0.6) / Math.hypot(light[0], 0.6);
    return clamp(amb + (1 - amb) * (v * 0.5 + 0.5));
  };
  const cylY = (cy, r, light = L, amb = 0.1) => (x, y) => {
    const ny = clamp((y - cy) / r, -1, 1); const nz = Math.sqrt(1 - ny * ny);
    const v = (ny * light[1] + nz * 0.6) / Math.hypot(light[1], 0.6);
    return clamp(amb + (1 - amb) * (v * 0.5 + 0.5));
  };
  const grad = (x0, y0, x1, y1, a = 0, b = 1) => (x, y) => {
    const dx = x1 - x0, dy = y1 - y0; const t = ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy);
    return clamp(lerp(a, b, clamp(t)));
  };
  const cst = (v) => () => v;
  const add = (f, g, k = 1) => (x, y) => clamp(f(x, y) + (g(x, y) - 0.5) * k);
  const mul = (f, g) => (x, y) => clamp(f(x, y) * g(x, y));

  // ---- tek bir düz fırça darbesi
  function strokeShape(len, wid, r) {
    const p = new Path2D(); const l = len / 2, w = wid / 2;
    const bend = (r() - 0.5) * wid * 0.5; // darbe boyunca hafif kavis
    const slant = (r() - 0.5) * wid * 0.7; // fırçanın kalkışı eğik
    const taper = 0.78 + r() * 0.2; // bitişe doğru incelme
    p.moveTo(-l, -w * 0.9);
    p.quadraticCurveTo(0, -w * 1.02 + bend, l + slant * 0.5, -w * taper);
    // bitiş ucu: eğik, hafif tırtıllı (kıl uçları)
    const teeth = 2 + Math.floor(r() * 3);
    for (let i = 1; i <= teeth; i++) {
      const t = i / (teeth + 1); const yy = lerp(-w * taper, w * taper, t);
      p.lineTo(l + lerp(slant * 0.5, -slant * 0.5, t) + (r() - 0.5) * wid * 0.1, yy);
    }
    p.lineTo(l - slant * 0.5, w * taper);
    p.quadraticCurveTo(0, w * 1.02 + bend, -l, w * 0.9);
    // başlangıç: yuvarlak fırça basışı
    p.bezierCurveTo(-l - w * 0.42, w * 0.55, -l - w * 0.42, -w * 0.55, -l, -w * 0.9);
    p.closePath();
    return p;
  }

  function drawStroke(S, x, y, ang, len, wid, col, o = {}) {
    const r = S.r; const ctx = S.x, hx = S.hx;
    const shape = strokeShape(len, wid, r);
    const alpha = o.alpha ?? 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.globalAlpha = alpha; ctx.fillStyle = col; ctx.fill(shape);
    // kıl izleri
    const n = Math.max(3, Math.round(wid / 2.4)); const l = len / 2, w = wid / 2;
    const dry = r() < (o.dry ?? 0.18);
    for (let i = 0; i < n; i++) {
      const yy = -w + ((i + 0.5) * wid) / n + (r() - 0.5) * 0.8;
      const light = r() < 0.5;
      ctx.globalAlpha = alpha * (0.07 + r() * 0.16);
      ctx.strokeStyle = light ? shade(col, 0.07 + r() * 0.05) : shade(col, -0.07 - r() * 0.05);
      ctx.lineWidth = 0.5 + r() * 0.9 * S.k;
      ctx.beginPath();
      const xa = -l + r() * l * 0.35, xb = l - r() * l * 0.35 + (dry && r() < 0.6 ? wid * (0.15 + r() * 0.5) : 0);
      ctx.moveTo(xa, yy); ctx.lineTo(xb, yy + (r() - 0.5) * 1.2); ctx.stroke();
    }
    ctx.restore();
    if (o.height !== false) {
      hx.save(); hx.translate(x, y); hx.rotate(ang);
      const g = 118 + Math.floor(r() * 34);
      hx.globalAlpha = 0.92; hx.fillStyle = `rgb(${g},${g},${g})`; hx.fill(shape);
      hx.globalAlpha = 0.55; hx.strokeStyle = `rgb(${g + 70},${g + 70},${g + 70})`; hx.lineWidth = 1.1 * S.k; hx.stroke(shape);
      for (let i = 0; i < n; i += 2) {
        const yy = -w + ((i + 0.5) * wid) / n; const v = g + (r() < 0.5 ? 26 : -26);
        hx.globalAlpha = 0.5; hx.strokeStyle = `rgb(${v},${v},${v})`; hx.lineWidth = 0.8 * S.k;
        hx.beginPath(); hx.moveTo(-l * 0.8, yy); hx.lineTo(l * 0.9, yy); hx.stroke();
      }
      hx.restore();
    }
  }

  class Sprite {
    constructor(w, h, o = {}) {
      this.w = Math.ceil(w); this.h = Math.ceil(h);
      this.k = o.k ?? 1; // fırça ölçeği (sprite pikseli / ekran pikseli)
      this.c = makeCanvas(this.w, this.h); this.x = this.c.getContext('2d');
      this.hc = makeCanvas(this.w, this.h); this.hx = this.hc.getContext('2d');
      this.hx.fillStyle = 'rgb(128,128,128)'; this.hx.fillRect(0, 0, this.w, this.h);
      this.r = rng(o.seed ?? 1);
      this.light = o.light ?? L;
    }
    // biçimin çevresinde kırık astar kenarı
    rim(path, o = {}) {
      const ctx = this.x, r = this.r; const w = (o.w ?? 3.2) * this.k;
      ctx.save(); ctx.strokeStyle = o.color ?? UNDER; ctx.lineWidth = w * 2; ctx.lineJoin = 'round';
      const dash = []; for (let i = 0; i < 24; i++) dash.push((i % 2 ? 6 + r() * 40 : 30 + r() * 140) * this.k);
      ctx.setLineDash(o.solid ? [] : dash); ctx.lineDashOffset = r() * 200;
      ctx.globalAlpha = o.alpha ?? 0.95; ctx.stroke(path); ctx.restore();
    }
    // bölgeyi düz ton katmanlarıyla, yöne uyan fırça darbeleriyle boya
    region(path, o) {
      const r = this.r, k = this.k;
      const cols = o.ramp || ramp(o.color, o.steps ?? 5, o.rampOpt || {});
      const steps = cols.length;
      const f = o.shade || cst(0.55);
      const dirf = typeof o.dir === 'function' ? o.dir : () => (o.dir ?? 0) + (r() - 0.5) * (o.dirJit ?? 0.25);
      const [lenA, lenB] = (o.len || [26, 54]).map((v) => v * k);
      const [widA, widB] = (o.wid || [9, 16]).map((v) => v * k);
      const bb = o.bbox || [0, 0, this.w, this.h];
      const jit = (o.jitter ?? 10) * k; const nz = o.noise ?? 0.05;
      if (o.rim !== false) this.rim(path, typeof o.rim === 'object' ? o.rim : {});
      const ctx = this.x, hx = this.hx;
      ctx.save(); hx.save(); ctx.clip(path); hx.clip(path);
      // taban: orta ton (boşluk kalmasın)
      ctx.fillStyle = cols[Math.min(steps - 1, Math.floor(f((bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2) * steps))] || cols[steps >> 1];
      if (o.base) ctx.fillStyle = o.base;
      ctx.fill(path);
      const area = (bb[2] - bb[0]) * (bb[3] - bb[1]);
      const meanS = ((lenA + lenB) / 2) * ((widA + widB) / 2);
      const count = Math.min(o.max ?? 40000, Math.round((area / meanS) * (o.cover ?? 2.6)));
      const list = [];
      const test = this.x; const pad = widB * 0.6;
      for (let i = 0; i < count; i++) {
        const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
        if (!(test.isPointInPath(path, x, y) || test.isPointInPath(path, x + pad, y) || test.isPointInPath(path, x - pad, y) || test.isPointInPath(path, x, y + pad) || test.isPointInPath(path, x, y - pad))) continue;
        const fq = (o.jitterFreq ?? 0.013) / k;
        let v = f(x + (NOISE(x * fq + 3, y * fq) - 0.5) * jit * 2, y + (NOISE(x * fq, y * fq + 9) - 0.5) * jit * 2) + (r() - 0.5) * nz * 2;
        let ki = clamp(Math.floor(v * steps), 0, steps - 1);
        if (r() < (o.broken ?? 0.06)) ki = clamp(ki + r.sign(), 0, steps - 1);
        list.push([x, y, ki]);
      }
      list.sort((a, b) => a[2] - b[2]);
      for (const [x, y, ki] of list) {
        const col = shade(cols[ki], (r() - 0.5) * (o.lJit ?? 0.035), 1 + (r() - 0.5) * 0.1, (r() - 0.5) * (o.hJit ?? 6));
        const len = lerp(lenA, lenB, r()), wid = lerp(widA, widB, r());
        drawStroke(this, x, y, dirf(x, y), len, wid, col, { dry: o.dry });
      }
      ctx.restore(); hx.restore();
      return this;
    }
    // düz renk + hafif kıl dokusu (küçük ayrıntılar için)
    flat(path, col, o = {}) {
      if (o.rim) this.rim(path, typeof o.rim === 'object' ? o.rim : {});
      return this.region(path, { ramp: [col], len: o.len || [14, 26], wid: o.wid || [5, 9], cover: o.cover ?? 1.6, rim: false, dir: o.dir ?? 0, lJit: o.lJit ?? 0.025, jitter: 0, noise: 0, broken: 0 });
    }
    // fırçalı çizgi (sap, dal, kontur): noktalar boyunca, genişliği w0→w1
    line(pts, w0, col, o = {}) {
      const ctx = this.x, hx = this.hx, r = this.r; const w1 = o.w1 ?? w0;
      const P = []; // yoğunlaştır
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const d = Math.hypot(bx - ax, by - ay); const n = Math.max(1, Math.ceil(d / 3));
        for (let j = 0; j < n; j++) P.push([lerp(ax, bx, j / n), lerp(ay, by, j / n)]);
      }
      P.push(pts[pts.length - 1]);
      const N = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
      const wAt = (i) => lerp(w0, w1, i / (P.length - 1)) * (o.taper ? Math.min(1, Math.sin((Math.PI * i) / (P.length - 1)) * 1.6 + 0.15) : 1);
      // gövde: kenarları hafif dalgalı poligon
      const body = new Path2D();
      for (let i = 0; i < P.length; i++) { const w = wAt(i) / 2 * (1 + (NOISE(i * 0.15, 3.3) - 0.5) * 0.18); const q = [P[i][0] + N[i][0] * w, P[i][1] + N[i][1] * w]; i ? body.lineTo(...q) : body.moveTo(...q); }
      for (let i = P.length - 1; i >= 0; i--) { const w = wAt(i) / 2 * (1 + (NOISE(i * 0.15, 7.7) - 0.5) * 0.18); body.lineTo(P[i][0] - N[i][0] * w, P[i][1] - N[i][1] * w); }
      body.closePath();
      if (o.rim) this.rim(body, { w: 2.2, ...(typeof o.rim === 'object' ? o.rim : {}) });
      ctx.save(); ctx.fillStyle = col; ctx.fill(body);
      // kıllar
      const nb = Math.max(3, Math.round(Math.max(w0, w1) / 2.2));
      for (let b = 0; b < nb; b++) {
        const off = (b + 0.5) / nb - 0.5; const lightB = r() < 0.5;
        ctx.strokeStyle = shade(col, lightB ? 0.06 + r() * 0.06 : -0.06 - r() * 0.06); ctx.globalAlpha = 0.12 + r() * 0.18; ctx.lineWidth = 0.6 + r() * 0.8;
        ctx.beginPath(); const s0 = Math.floor(r() * P.length * 0.15), s1 = P.length - Math.floor(r() * P.length * 0.15);
        for (let i = s0; i < s1; i++) { const w = wAt(i); const q = [P[i][0] + N[i][0] * off * w, P[i][1] + N[i][1] * off * w]; i === s0 ? ctx.moveTo(...q) : ctx.lineTo(...q); }
        ctx.stroke();
      }
      // ışık kenarı (sol üst ışığa bakan yan)
      if (o.edge !== false) {
        ctx.globalAlpha = 0.35; ctx.strokeStyle = shade(col, 0.12, 0.85, -8); ctx.lineWidth = Math.max(1, w0 * 0.16);
        ctx.beginPath();
        for (let i = 0; i < P.length; i++) { const side = N[i][0] * L[0] + N[i][1] * L[1] > 0 ? 1 : -1; const w = wAt(i) * 0.36 * side; const q = [P[i][0] + N[i][0] * w, P[i][1] + N[i][1] * w]; i ? ctx.lineTo(...q) : ctx.moveTo(...q); }
        ctx.stroke();
      }
      ctx.restore();
      hx.save(); hx.globalAlpha = 0.6; hx.fillStyle = 'rgb(150,150,150)'; hx.fill(body); hx.strokeStyle = 'rgb(205,205,205)'; hx.lineWidth = 1; hx.stroke(body); hx.restore();
      return this;
    }
    dab(x, y, ang, len, wid, col, o = {}) { drawStroke(this, x, y, ang, len * this.k, wid * this.k, col, o); return this; }
    // boya kalınlığından ışık (kabartma) + saten parlama
    finish(o = {}) {
      const amt = o.emboss ?? 0.55; const w = this.w, h = this.h;
      if (amt > 0) {
        const id = this.x.getImageData(0, 0, w, h), d = id.data;
        const hd = this.hx.getImageData(0, 0, w, h).data;
        const lx = this.light[0], ly = this.light[1];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = (y * w + x) * 4; if (d[i + 3] === 0) continue;
            const gx = hd[i + 4] - hd[i - 4]; const gy = hd[i + w * 4] - hd[i - w * 4];
            let s = -(gx * lx + gy * ly) * 0.012 * amt; // + aydınlık, - gölge
            s = clamp(s, -0.32, 0.32);
            const m = s > 0 ? 255 : 0; const t = Math.abs(s);
            d[i] += (m - d[i]) * t; d[i + 1] += (m - d[i + 1]) * t; d[i + 2] += (m - d[i + 2]) * t;
          }
        }
        this.x.putImageData(id, 0, 0);
      }
      return this.c;
    }
  }

  const sprite = (w, h, o) => new Sprite(w, h, o);
  return { UNDER, L, sphere, cylX, cylY, grad, cst, add, mul, sprite, drawStroke, strokeShape };
})();

// ---- tembel sprite önbelleği
const SPR = {};
const SPRITE_DEFS = {};
function defSprite(name, fn) { SPRITE_DEFS[name] = fn; }
function spr(name) {
  if (!SPR[name]) { if (!SPRITE_DEFS[name]) throw new Error('sprite yok: ' + name); SPR[name] = SPRITE_DEFS[name](); }
  return SPR[name];
}
// sprite'ı pivotuna göre çiz: s = {canvas, px, py} ya da canvas (merkez pivot)
function drawSpr(ctx, s, x, y, sc = 1, rot = 0, alpha = 1, sx = 1, sy = 1) {
  if (alpha <= 0.001 || sc <= 0.0001) return;
  const c = s.canvas || s; const px = s.px ?? c.width / 2, py = s.py ?? c.height / 2; const k = s.k || 1;
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale((sc * sx) / k, (sc * sy) / k);
  ctx.drawImage(c, -px, -py); ctx.restore();
}
