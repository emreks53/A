// Manzara (Perde 1 ve 3): sabah/akşam göğü, güneş, bulutlar, tepeler, vadi, tümsek, büyük ağaç,
// küçük bahçe ağaçları, düşen yapraklar ve çiçek taneleri.
// Dünya koordinatı = kamera zoom 1'de ekran pikseli (1080×1920), sol üst köken.
// Işık bütün nesnelerde sol üstten; sabah güneşi de sol üstte (214,268). Akşam parıltısı sağda (batı), dağ sırtının üstünde.
'use strict';
const MANZARA = (() => {
  const TAU = Math.PI * 2;
  const LX = -0.62, LY = -0.78; // ışık: sol üstten

  // ---------------------------------------------------------------- yardımcılar
  // serbest fırça darbesi (taban dolgusu olmadan); renk dizisi ya da tek renk
  function stroke(S, x, y, ang, len, wid, col, o) { Paint.drawStroke(S, x, y, ang, len * S.k, wid * S.k, col, o || {}); }
  // badem (filbert) yaprak biçimi: +x yönünde uzanır, uç sivri
  function leafPath(len, wid, r) {
    const p = new Path2D(); const l = len / 2, w = wid / 2; const b = (r() - 0.5) * w * 0.5;
    p.moveTo(-l, 0);
    p.bezierCurveTo(-l * 0.55, -w * 1.15 + b, l * 0.35, -w * 1.05 + b, l, b * 0.4);
    p.bezierCurveTo(l * 0.35, w * 1.05 + b, -l * 0.55, w * 1.15 + b, -l, 0);
    p.closePath(); return p;
  }
  // yaprak darbesi: badem biçimi + kıl izleri + kabartma
  function leaf(S, x, y, ang, len, wid, col, o = {}) {
    const k = S.k; len *= k; wid *= k; const r = S.r; const ctx = S.x, hx = S.hx;
    const p = leafPath(len, wid, r);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.fillStyle = col; ctx.globalAlpha = o.alpha ?? 1; ctx.fill(p);
    ctx.clip(p);
    const n = Math.max(2, Math.round(wid / 2.6));
    for (let i = 0; i < n; i++) {
      const yy = -wid / 2 + ((i + 0.5) * wid) / n;
      ctx.globalAlpha = 0.1 + r() * 0.16; ctx.strokeStyle = shade(col, r() < 0.5 ? 0.08 : -0.08); ctx.lineWidth = 0.6 + r() * 0.8 * k;
      ctx.beginPath(); ctx.moveTo(-len / 2, yy); ctx.lineTo(len / 2, yy * 0.6); ctx.stroke();
    }
    if (o.vein) { ctx.globalAlpha = 0.5; ctx.strokeStyle = o.vein; ctx.lineWidth = Math.max(0.8, wid * 0.08); ctx.beginPath(); ctx.moveTo(-len * 0.45, 0); ctx.lineTo(len * 0.38, 0); ctx.stroke(); }
    ctx.restore();
    if (o.height !== false) {
      hx.save(); hx.translate(x, y); hx.rotate(ang); const g = 125 + Math.floor(r() * 30);
      hx.fillStyle = `rgb(${g},${g},${g})`; hx.globalAlpha = 0.9; hx.fill(p);
      hx.strokeStyle = `rgb(${g + 60},${g + 60},${g + 60})`; hx.globalAlpha = 0.5; hx.lineWidth = 1 * k; hx.stroke(p); hx.restore();
    }
  }
  // düz dolgu (renk + kabartma yüksekliği), küçük keskin biçimler için
  function fill(S, path, col, o = {}) {
    S.x.save(); S.x.globalAlpha = o.alpha ?? 1; S.x.fillStyle = col; S.x.fill(path); S.x.restore();
    if (o.height !== false) { const g = o.h ?? 150; S.hx.save(); S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fill(path); S.hx.strokeStyle = `rgb(${g + 50},${g + 50},${g + 50})`; S.hx.lineWidth = 1; S.hx.stroke(path); S.hx.restore(); }
  }
  const poly = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  const circ = (x, y, r) => ellipsePath(x, y, r, r);
  // çokgen yönünü blobPts ile aynı yap (pozitif alan): addPath ile birleştirilen biçimler 'nonzero' kuralında delik açmasın
  const orientPts = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a < 0 ? pts.slice().reverse() : pts; };
  const radial = (cx, cy, R, a = 1, b = 0) => (x, y) => clamp(lerp(a, b, Math.hypot(x - cx, y - cy) / R));
  const sph = (cx, cy, r, amb = 0.12) => Paint.sphere(cx, cy, r, [LX, LY], amb);
  // Taban dolgusu yapmayan darbe alanı (Paint.region'ın katmanlanabilir hâli).
  // o: {bbox, path (yalnız içine düşen merkezler; kırpma yok), clip (kırp), ramp, shade, dir, len, wid, cover|count,
  //     jitter, jitterFreq, noise, broken, sort, dry, lJit, hJit, alpha}
  function field(S, o) {
    const r = S.r, k = S.k; const cols = o.ramp; const steps = cols.length; const f = o.shade || Paint.cst(0.5);
    const dirf = typeof o.dir === 'function' ? o.dir : () => (o.dir ?? 0) + (r() - 0.5) * (o.dirJit ?? 0.2);
    const [lenA, lenB] = o.len, [widA, widB] = o.wid; const bb = o.bbox;
    const area = (bb[2] - bb[0]) * (bb[3] - bb[1]); const meanS = ((lenA + lenB) / 2) * ((widA + widB) / 2) * k * k;
    const count = o.count ?? Math.min(o.max ?? 12000, Math.round((area / meanS) * (o.cover ?? 2)));
    const jit = (o.jitter ?? 0) * k; const fq = (o.jitterFreq ?? 0.01) / k; const nz = o.noise ?? 0.03;
    const list = [];
    for (let i = 0; i < count; i++) {
      const x = lerp(bb[0], bb[2], r()), y = lerp(bb[1], bb[3], r());
      if (o.path && !S.x.isPointInPath(o.path, x, y)) continue;
      if (o.mask && !o.mask(x, y)) continue;
      let v = f(x + (NOISE(x * fq + 3, y * fq) - 0.5) * jit * 2, y + (NOISE(x * fq, y * fq + 9) - 0.5) * jit * 2) + (r() - 0.5) * nz * 2;
      let ki = clamp(Math.floor(v * steps), 0, steps - 1);
      if (r() < (o.broken ?? 0.05)) ki = clamp(ki + r.sign(), 0, steps - 1);
      list.push([x, y, ki, o.sort === 'y' ? y : ki + r() * (o.sortJit ?? 0)]);
    }
    if (o.sort !== false) list.sort((a, b) => a[3] - b[3]);
    if (o.clip) { S.x.save(); S.hx.save(); S.x.clip(o.clip); S.hx.clip(o.clip); }
    for (const [x, y, ki] of list) {
      const col = shade(cols[ki], (r() - 0.5) * (o.lJit ?? 0.03), 1 + (r() - 0.5) * 0.08, (r() - 0.5) * (o.hJit ?? 5));
      const sz = o.size ? o.size(x, y) : 1;
      if (o.fast) fastStroke(S, x, y, dirf(x, y), lerp(lenA, lenB, r()) * k * sz, lerp(widA, widB, r()) * k * sz, col);
      else Paint.drawStroke(S, x, y, dirf(x, y), lerp(lenA, lenB, r()) * k * sz, lerp(widA, widB, r()) * k * sz, col, { dry: o.dry ?? 0.15, alpha: o.alpha, height: o.height });
    }
    if (o.clip) { S.x.restore(); S.hx.restore(); }
    return list.length;
  }
  // kılsız hızlı darbe (uzak, küçük darbeler için): biçim + kabartma
  function fastStroke(S, x, y, ang, len, wid, col) {
    const sh = Paint.strokeShape(len, wid, S.r); const g = 120 + Math.floor(S.r() * 36);
    S.x.save(); S.x.translate(x, y); S.x.rotate(ang); S.x.fillStyle = col; S.x.fill(sh); S.x.restore();
    S.hx.save(); S.hx.translate(x, y); S.hx.rotate(ang); S.hx.fillStyle = `rgb(${g},${g},${g})`; S.hx.fill(sh); S.hx.strokeStyle = `rgb(${g + 60},${g + 60},${g + 60})`; S.hx.lineWidth = 1; S.hx.stroke(sh); S.hx.restore();
  }

  // ---------------------------------------------------------------- 1. sabah / akşam göğü
  const SKY = { x: -200, y: -300, w: 1480, h: 1500 };
  const SUN = [214, 268]; // sol üst: bütün nesnelerin ışığı sol üstten gelir
  function paintSky(kind) {
    const { w, h } = SKY; const ox = SKY.x, oy = SKY.y;
    const S = Paint.sprite(w, h, { seed: kind === 'aksam' ? 311 : 101, k: 1 }); const r = S.r;
    // kuşaklar: [dünya y, renk] — y'ye göre basamaklı ton
    const bands = kind === 'aksam'
      ? [[-300, '#16163F'], [-60, '#1C1B4F'], [70, '#26245E'], [190, '#33306C'], [300, '#463A79'], [400, '#5F4682'], [490, '#7D5087'], [565, '#A05D84'], [630, '#C46C7B'], [690, '#E07F70'], [740, '#F09A6C'], [790, '#F7BC7E'], [850, '#FAD69A']]
      : [[-300, '#16337F'], [-60, '#1A3E99'], [90, '#1F4AA7'], [230, '#2558B4'], [360, '#2B69C0'], [470, '#2F7DCA'], [570, '#3893D2'], [655, '#4FA8D8'], [730, '#74BDDC'], [790, '#9DD0DC'], [840, '#C4E0D8'], [880, '#E4E6CC'], [940, '#F1E6C3']];
    const ramp = bands.map((b) => b[1]); const n = ramp.length;
    // y → sürekli kuşak indeksi (0..1)
    const yIdx = (yw) => { for (let i = n - 1; i >= 0; i--) if (yw >= bands[i][0]) { const y0 = bands[i][0], y1 = i < n - 1 ? bands[i + 1][0] : y0 + 100; return (i + clamp((yw - y0) / (y1 - y0))) / n; } return 0; };
    const sf = (x, y) => yIdx(y + oy + 22 * Math.sin(x * 0.0037 + 1.3) + 12 * Math.sin(x * 0.011 + y * 0.004));
    // taban: basamaklı düz kuşaklar
    for (let y = 0; y < h; y += 4) { S.x.fillStyle = ramp[clamp(Math.floor(sf(w / 2, y) * n), 0, n - 1)]; S.x.fillRect(0, y, w, 4); }
    // uzun yatay darbeler
    field(S, { bbox: [-60, -20, w + 60, h + 20], ramp, shade: sf, dir: 0, dirJit: 0.05, len: [130, 300], wid: [16, 30], cover: 3.2, jitter: 20, jitterFreq: 0.004, noise: 0.025, broken: 0.07, max: 9000, sortJit: 0.6 });
    if (kind === 'aksam') {
      // batmış güneşin parıltısı: sağda, dağ sırtının (y≈750–790) ÜSTÜNDE görünen sıcak yatay şerit kuşağı
      const gx = 960 - ox, gy = 772 - oy; const cols = ['#FFF1C4', '#FFE0A0', '#FBC886', '#F4A876', '#E58A7A', '#C97284'];
      const L2 = [];
      for (let i = 0; i < 300; i++) {
        const u = Math.pow(r(), 0.75); const a = Math.PI + r() * Math.PI; const x = gx + Math.cos(a) * u * 680, y = gy + Math.sin(a) * u * 250;
        L2.push([u, x, y]);
      }
      L2.sort((a, b) => b[0] - a[0]);
      for (const [u, x, y] of L2) stroke(S, x, y, (r() - 0.5) * 0.06, 90 + r() * 170, 11 + r() * 13, cols[clamp(Math.floor(u * 6 + (r() - 0.5) * 0.8), 0, 5)]);
      // yukarıda birkaç ince, ışık almış bulut şeridi (opak)
      for (let i = 0; i < 16; i++) { const y = 360 - oy + r() * 220, x = 160 - ox + r() * 1060; const l = 60 + r() * 160; stroke(S, x, y, (r() - 0.5) * 0.04, l, 7 + r() * 6, r() < 0.5 ? '#C77E8E' : '#A9729A'); stroke(S, x + l * 0.3, y - 5, (r() - 0.5) * 0.04, l * 0.5, 4 + r() * 3, '#EBA79A'); }
    } else {
      // güneş halesi: güneşin çevresinde dolanan (teğet yönlü) iri, kısa mavi darbeler (kaynak resimdeki gibi)
      const sx = SUN[0] - ox, sy = SUN[1] - oy; const R0 = 98, R1 = 285;
      const hal = ['#1D46A4', '#2350AE', '#2A60BB', '#3474C8', '#478DD5', '#62A7E0', '#82BDE8', '#A5D2F0', '#C6E4F5'];
      const list = [];
      for (let i = 0; i < 560; i++) {
        const a = r() * TAU; const u = r();
        const edge = R1 * (0.8 + 0.34 * NOISE(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5));
        const d = R0 + Math.pow(u, 1.05) * (edge - R0);
        const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.95;
        const t = 1 - (d - R0) / (edge - R0); // 1: güneş yanı, 0: dış kenar
        // dış kenarda yerel gök tonuna in (sert sınır olmasın)
        const local = sf(x, y) * n; const skyK = local < 3.2 ? 1 : local < 4.4 ? 2 : 3;
        let ki = Math.round(lerp(skyK, hal.length - 1, Math.pow(clamp(t + (r() - 0.5) * 0.5), 0.9)));
        if (r() < 0.12) ki = r.int(0, 2); // koyu kobalt karışımı
        // girdap: teğet yön (±0.5 rad), hafifçe içe kıvrık
        const ang = a + Math.PI / 2 + 0.12 + (r() - 0.5) * 1.0;
        list.push([ki + r() * 0.8, x, y, ang, 46 + r() * 52, 19 + r() * 13, clamp(ki, 0, hal.length - 1)]);
      }
      list.sort((p, q) => p[0] - q[0]);
      for (const [, x, y, ang, l, wd, ki] of list) stroke(S, x, y, ang, l, wd, shade(hal[ki], (r() - 0.5) * 0.03), { dry: 0.08 });
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k: S.k };
  }
  defSprite('gok-sabah', () => paintSky('sabah'));
  defSprite('gok-aksam', () => paintSky('aksam'));

  // ---------------------------------------------------------------- 2. güneş diski
  function paintSun() {
    const s = 300, c = 150, R = 104;
    const S = Paint.sprite(s, s, { seed: 202, k: 1 });
    const disk = smoothPath(blobPts(c, c, R, R, 40, 0.012, 3));
    S.rim(disk, { w: 1.6, alpha: 0.55 });
    fill(S, disk, '#F8D232');
    // dış sarı halka: teğet darbeler
    field(S, { bbox: [c - R - 10, c - R - 10, c + R + 10, c + R + 10], clip: disk, mask: (x, y) => Math.hypot(x - c, y - c) > R * 0.78,
      ramp: ['#F2C232', '#F6CE40', '#F9D850', '#FBE068'], shade: Paint.sphere(c - 20, c - 26, R * 1.25, [LX, LY], 0.4),
      dir: (x, y) => Math.atan2(y - c, x - c) + Math.PI / 2 + (S.r() - 0.5) * 0.4, len: [40, 70], wid: [14, 20], count: 110, noise: 0.05 });
    // iç krem disk: geniş çapraz düz darbeler (eşmerkezli değil)
    // dolu, sıcak disk (halka gibi okunmasın): iç kısım dış bantla aynı aileden, yalnızca biraz açık
    const inner = smoothPath(blobPts(c - 3, c - 3, R * 0.88, R * 0.87, 32, 0.03, 9));
    fill(S, inner, '#FBE68C');
    field(S, { bbox: [c - R, c - R, c + R, c + R], clip: inner, ramp: ['#FADF78', '#FCE78E', '#FDEEA8', '#FEF4C2'], shade: Paint.sphere(c - 26, c - 30, R, [LX, LY], 0.5),
      dir: -0.7, dirJit: 0.5, len: [50, 90], wid: [20, 30], count: 40, noise: 0.05, dry: 0.05, height: false });
    return { canvas: S.finish({ emboss: 0.35 }), px: c, py: c, k: S.k };
  }
  defSprite('gunes', paintSun);

  // ---------------------------------------------------------------- 3. bulutlar
  // Her puf: lavanta gölge → açık lavanta orta ton → beyaz ışık (sol üste kaymış daire ∩ puf; beyaz siluete
  // sol üstte değer, gölge sağ altta hilal olarak kalır) → puf başına 3–5 geniş, hafif kavisli düz darbe
  // (ortak merkezli değil). Alt kenar: yumrulu, cetvel düzü olmayan lavanta taban. İnce kırık turuncu astar.
  const CLOUD_PAL = {
    sabah: { hi: '#FFFBF2', lit: '#FFFFFF', mid: '#DCD8EE', sh: '#C2BDE0', deep: '#ABA5D0', base: '#9C96C6', baseD: '#8E88BB', ridge: '#CFCAE8' },
    aksam: { hi: '#FFE7CC', lit: '#FAD2B8', mid: '#EBAAAA', sh: '#BE8BA7', deep: '#9A79A3', base: '#7E6797', baseD: '#6C578A', ridge: '#D79AA6' },
  };
  // spec: {wc, baseH, top: [[cx,cy,r]...] (üst kubbeler), low: [[cx,cy,r]...] (alt yumrular); taban merkezi 0,0; yukarı negatif}
  // Tonlar bütün bulut kütlesine göre basamaklanır: ışık = siluet ∩ (puf birleşimi sol üste kaydırılmış). Böylece
  // beyaz sol üst konturda siluete değer, lavanta yalnız alt kısımda ve kubbelerin sağ altında hilal olarak kalır.
  function paintCloud(seed, spec, palName = 'sabah') {
    const P = CLOUD_PAL[palName]; const { wc, baseH } = spec; const puffs = spec.top.concat(spec.low);
    const pad = 22; let minX = -wc / 2, maxX = wc / 2, minY = 0, maxB = 0;
    for (const [cx, cy, rr] of puffs) { minX = Math.min(minX, cx - rr); maxX = Math.max(maxX, cx + rr); minY = Math.min(minY, cy - rr); maxB = Math.max(maxB, cy + rr); }
    const Hc = -minY; minX -= pad; maxX += pad; minY -= pad; const maxY = Math.max(maxB, 8) + pad;
    const w = Math.ceil(maxX - minX), h = Math.ceil(maxY - minY);
    const S = Paint.sprite(w, h, { seed, k: 1 }); const r = S.r;
    const X = (x) => x - minX, Y = (y) => y - minY;
    // yumrulu taban: alt kenar hafif dalgalı, uçları yuvarlak
    const rb = rng(seed + 7); const ph = rb() * 10; const ht = baseH; const x0 = -wc / 2, x1 = wc / 2;
    const botY = (x) => 3 * Math.sin(x * 0.034 + ph) + 2 * Math.sin(x * 0.083 + ph * 2) + 3 * (1 - Math.pow((2 * x) / wc, 2));
    const bp = [];
    for (let x = x0 + ht * 0.5; x <= x1 - ht * 0.5; x += 12) bp.push([X(x), Y(-ht)]);
    for (let i = 1; i < 6; i++) { const a = -Math.PI / 2 + (i / 6) * Math.PI; bp.push([X(x1 - ht * 0.5 + Math.cos(a) * ht * 0.5), Y(-ht * 0.5 + Math.sin(a) * ht * 0.5)]); }
    for (let x = x1 - ht * 0.5; x >= x0 + ht * 0.5; x -= 10) bp.push([X(x), Y(botY(x))]);
    for (let i = 1; i < 6; i++) { const a = Math.PI / 2 + (i / 6) * Math.PI; bp.push([X(x0 + ht * 0.5 + Math.cos(a) * ht * 0.5), Y(-ht * 0.5 + Math.sin(a) * ht * 0.5)]); }
    const base = smoothPath(bp, true, 0.5);
    const puffP = puffs.map(([cx, cy, rr], i) => smoothPath(blobPts(X(cx), Y(cy), rr, rr * 0.95, 26, 0.04, seed * 13 + i)));
    const pu = new Path2D(); puffP.forEach((q) => pu.addPath(q));
    // iç boşluk kalmasın: pufların altındaki gövdeyi dolduran çekirdek (siluetin içinde kalır)
    pu.addPath(smoothPath(blobPts(X(0), Y(-ht * 1.1), wc * 0.34, ht * 0.95, 20, 0.02, seed + 99)));
    const sil = new Path2D(); sil.addPath(base); sil.addPath(pu);
    S.rim(sil, { w: 2.1, alpha: 0.9 });
    // 1) bütün siluet: koyu lavanta + yatay darbeler
    fill(S, sil, P.deep, { h: 148 });
    S.x.save(); S.hx.save(); S.x.clip(sil); S.hx.clip(sil);
    field(S, { bbox: [0, 0, w, h], ramp: [P.baseD, P.base, P.deep], shade: Paint.grad(0, Y(-Hc * 0.4), 0, Y(4), 0.95, 0.05), dir: 0, dirJit: 0.06, len: [50, 110], wid: [9, 13], cover: 1.4, noise: 0.25, broken: 0.05 });
    // basamaklar: [kayma x, kayma y, renk, darbe rampası]
    const steps = [
      [-6, -0.12 * Hc, P.mid, [P.mid, shade(P.mid, 0.02)]],
      [-11, -0.27 * Hc, P.lit, [P.lit, P.lit, shade(P.lit, -0.012)]],
      [-20, -0.58 * Hc, P.hi, [P.hi, P.lit]],
    ];
    steps.forEach(([dx, dy, col, rp], si) => {
      S.x.save(); S.hx.save();
      S.x.translate(dx, dy); S.hx.translate(dx, dy); S.x.clip(pu); S.hx.clip(pu); S.x.translate(-dx, -dy); S.hx.translate(-dx, -dy);
      S.x.fillStyle = col; S.x.fillRect(0, 0, w, h);
      // geniş, hafif kavisli düz darbeler (ortak merkez yok): yatay, sol üste doğru hafif yükselen
      field(S, { bbox: [0, 0, w, h], ramp: rp, shade: (x, y) => clamp(0.3 + (Y(-Hc) - y) / Hc * -0.6 + r() * 0.2), dir: -0.12, dirJit: 0.2, len: si === 2 ? [26, 50] : [44, 96], wid: si === 2 ? [8, 12] : [13, 21], cover: si === 1 ? 1.25 : 0.9, noise: 0.3, broken: 0, dry: 0.35, max: si === 1 ? 160 : 90 });
      S.x.restore(); S.hx.restore();
    });
    S.x.restore(); S.hx.restore();
    // tabanın en altında ince açık yansıma sırtı (kırık)
    S.x.save(); S.x.clip(base); S.x.strokeStyle = P.ridge; S.x.lineWidth = 2.2; S.x.lineCap = 'round';
    for (let x = x0 + ht * 0.6; x < x1 - ht * 0.6; x += 30 + r() * 50) { const l = 20 + r() * 60; S.x.beginPath(); for (let q = 0; q <= l; q += 6) { const xx = Math.min(x + q, x1 - ht * 0.6); q ? S.x.lineTo(X(xx), Y(botY(xx) - 3)) : S.x.moveTo(X(xx), Y(botY(xx) - 3)); } S.x.stroke(); }
    S.x.restore();
    return { canvas: S.finish({ emboss: 0.4 }), px: X(0), py: Y(0), k: S.k };
  }
  // üç ayrı siluet: 1) solda yüksek kule, 2) küçük, sağa yatık alçak, 3) uzun, sağda iri kubbe ve solda ince kuyruk
  const CLOUDS = {
    'bulut-1': [401, { wc: 420, baseH: 30, top: [[-122, -50, 44], [-42, -92, 70], [52, -82, 58], [128, -46, 42]], low: [[-168, -20, 24], [-78, -34, 40], [36, -34, 44], [168, -20, 26]] }],
    'bulut-2': [402, { wc: 300, baseH: 26, top: [[-64, -38, 36], [14, -58, 52], [86, -36, 34]], low: [[-114, -14, 18], [-36, -24, 30], [62, -24, 30], [122, -12, 18]] }],
    'bulut-3': [403, { wc: 520, baseH: 32, top: [[-204, -24, 24], [-146, -42, 38], [-76, -58, 48], [40, -100, 80], [142, -70, 56], [212, -36, 34]], low: [[-184, -12, 18], [-104, -24, 32], [-2, -30, 44], [112, -28, 40], [222, -12, 20]] }],
  };
  for (const [nm, [seed, spec]] of Object.entries(CLOUDS)) {
    defSprite(nm, () => paintCloud(seed, spec, 'sabah'));
    defSprite(nm + '-aksam', () => paintCloud(seed, spec, 'aksam'));
  }

  // ---------------------------------------------------------------- 4. uzak tepeler (mavi-lavanta)
  const FAR = { x: -200, y: 700, w: 1480, h: 310 };
  // tepe profili: zirveler [x, tepe y, yarı genişlik, sivrilik]
  const profile = (peaks, base, floor = base) => (x) => { let y = floor; for (const [px, pt, hw, e] of peaks) { const d = Math.abs(x - px) / hw; if (d < 1) y = Math.min(y, pt + (base - pt) * Math.pow(d, e ?? 1.35)); } return y; };
  const peakAt = (peaks, base, x) => { let best = null, by = base; for (const pk of peaks) { const [px, pt, hw, e] = pk; const d = Math.abs(x - px) / hw; if (d < 1) { const y = pt + (base - pt) * Math.pow(d, e ?? 1.35); if (y < by) { by = y; best = pk; } } } return best; };
  function underPath(prof, x0, x1, yb, step = 6) { const p = new Path2D(); p.moveTo(x0, yb); for (let x = x0; x <= x1 + step; x += step) p.lineTo(x, prof(x)); p.lineTo(x1 + step, yb); p.closePath(); return p; }
  function paintFar() {
    const S = Paint.sprite(FAR.w, FAR.h, { seed: 501, k: 1 }); const ox = FAR.x, oy = FAR.y;
    const ranges = [
      { base: 1010, floor: 890, peaks: [[-120, 812, 260], [150, 790, 230, 1.5], [420, 805, 220], [700, 752, 300, 1.45], [980, 788, 240, 1.5], [1220, 800, 230]], ramp: ['#8790C4', '#98A0CD', '#AAB1D7', '#BCC2E1', '#CDD2E9'], dark: 0.3, lite: 0.78 },
      { base: 1010, floor: 935, peaks: [[-60, 880, 230, 1.6], [250, 862, 260, 1.7], [560, 872, 230, 1.6], [860, 846, 250, 1.7], [1150, 868, 260, 1.6]], ramp: ['#6D78B6', '#7F89C1', '#929CCB', '#A6AFD6', '#B9C1E0'], dark: 0.25, lite: 0.7 },
    ];
    for (const R of ranges) {
      const prof = (x) => profile(R.peaks, R.base, R.floor)(x + ox) - oy + 3 * Math.sin((x + ox) * 0.05) * 0.5;
      const path = underPath(prof, -10, FAR.w + 10, FAR.h + 10);
      S.rim(path, { w: 1.5, alpha: 0.45 });
      fill(S, path, R.ramp[2]);
      const face = (x, y) => { const pk = peakAt(R.peaks, R.base, x + ox); if (!pk) return 0.5; const spine = pk[0] - ox + (y - (pk[1] - oy)) * 0.42; const haze = clamp((y - (pk[1] - oy)) / 160) * 0.18; return (x < spine ? R.lite : R.dark) + haze; };
      field(S, { bbox: [-20, 0, FAR.w + 20, FAR.h], clip: path, ramp: R.ramp, shade: face, dir: (x, y) => { const pk = peakAt(R.peaks, R.base, x + ox); const spine = pk ? pk[0] - ox + (y - (pk[1] - oy)) * 0.42 : 0; return (x < spine ? -0.62 : 0.62) + (S.r() - 0.5) * 0.3; }, len: [40, 80], wid: [10, 16], cover: 2.6, jitter: 6, jitterFreq: 0.02, noise: 0.04, broken: 0.04 });
    }
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k: S.k };
  }
  defSprite('tepe-uzak', paintFar);

  // ---------------------------------------------------------------- 5. orta tepeler (yeşil, bahçe noktaları, servi)
  const MID = { x: -200, y: 840, w: 1480, h: 340 };
  const humpProf = (humps, base, floor = base) => (x) => { let y = floor; for (const [cx, top, hw] of humps) { const d = (x - cx) / hw; if (Math.abs(d) < 1) y = Math.min(y, base - (base - top) * Math.pow(Math.cos(d * Math.PI / 2), 1.6)); } return y; };
  const humpAt = (humps, base, x) => { let best = null, by = base; for (const hp of humps) { const [cx, top, hw] = hp; const d = (x - cx) / hw; if (Math.abs(d) < 1) { const y = base - (base - top) * Math.pow(Math.cos(d * Math.PI / 2), 1.6); if (y < by) { by = y; best = hp; } } } return best; };
  // servi: dar alev biçimi, sol yanı ışıklı
  function cypress(S, x, yb, hgt, wd) {
    const k = S.k; const pts = [];
    const body = new Path2D(); body.moveTo(x, yb - hgt);
    body.bezierCurveTo(x + wd * 0.62, yb - hgt * 0.7, x + wd * 0.58, yb - hgt * 0.2, x + wd * 0.2, yb);
    body.lineTo(x - wd * 0.2, yb);
    body.bezierCurveTo(x - wd * 0.58, yb - hgt * 0.2, x - wd * 0.62, yb - hgt * 0.7, x, yb - hgt);
    fill(S, body, '#123F2E', { h: 150 });
    const lit = new Path2D(); lit.moveTo(x - wd * 0.05, yb - hgt * 0.95);
    lit.bezierCurveTo(x - wd * 0.5, yb - hgt * 0.68, x - wd * 0.5, yb - hgt * 0.25, x - wd * 0.15, yb - hgt * 0.04);
    lit.bezierCurveTo(x - wd * 0.02, yb - hgt * 0.35, x + wd * 0.02, yb - hgt * 0.7, x - wd * 0.05, yb - hgt * 0.95);
    fill(S, lit, '#2E7A4A', { h: 165 });
    S.x.save(); S.x.strokeStyle = '#4E9A55'; S.x.globalAlpha = 0.6; S.x.lineWidth = Math.max(1, wd * 0.12); S.x.beginPath(); S.x.moveTo(x - wd * 0.28, yb - hgt * 0.78); S.x.quadraticCurveTo(x - wd * 0.42, yb - hgt * 0.45, x - wd * 0.25, yb - hgt * 0.15); S.x.stroke(); S.x.restore();
  }
  // küçük top ağaç (bahçe noktası): iki tonlu daire + ışık lekesi
  function dotTree(S, x, y, rr, o = {}) {
    const dk = o.dark ?? '#1B5A3A', md = o.mid ?? '#2F8448', lt = o.light ?? '#6DB552';
    S.x.save(); S.x.fillStyle = o.shadow ?? '#2C6A3C'; S.x.beginPath(); S.x.ellipse(x + rr * 0.5, y + rr * 0.85, rr * 1.0, rr * 0.35, 0, 0, TAU); S.x.fill(); S.x.restore();
    fill(S, circ(x, y, rr), dk, { h: 150 });
    fill(S, circ(x - rr * 0.18, y - rr * 0.2, rr * 0.78), md, { h: 160 });
    fill(S, circ(x - rr * 0.36, y - rr * 0.4, rr * 0.4), lt, { h: 170 });
    if (o.fruit) { const rr2 = Math.max(1.1, rr * 0.19); const n = 4 + Math.floor(S.r() * 3); for (let i = 0; i < n; i++) { const a = S.r() * TAU, d = Math.sqrt(S.r()) * rr * 0.68; const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d; fill(S, circ(fx, fy, rr2), o.fruit, { h: 175 }); if (rr2 > 2) { S.x.fillStyle = '#FF9A90'; S.x.beginPath(); S.x.arc(fx - rr2 * 0.35, fy - rr2 * 0.35, rr2 * 0.35, 0, TAU); S.x.fill(); } } }
    if (o.bloom) { const rr2 = Math.max(1, rr * 0.18); for (const [fx, fy] of [[0.3, -0.35], [-0.3, -0.5], [-0.55, 0.05], [0.45, 0.2], [0, 0.1], [-0.1, -0.2]]) fill(S, circ(x + fx * rr, y + fy * rr, rr2), o.bloom, { h: 175 }); }
  }
  function paintMid() {
    const S = Paint.sprite(MID.w, MID.h, { seed: 601, k: 1 }); const ox = MID.x, oy = MID.y; const r = S.r;
    const rows = [
      { base: 1180, floor: 962, humps: [[-150, 930, 260], [160, 905, 280], [470, 925, 250], [760, 898, 270], [1060, 915, 280], [1300, 930, 240]], ramp: ['#2F6E63', '#3C8068', '#4E936C', '#68A872', '#88BE7E', '#A9D08C'] },
      { base: 1180, floor: 1022, humps: [[-60, 985, 230], [250, 970, 260], [520, 995, 200], [790, 975, 250], [1060, 960, 260], [1290, 985, 220]], ramp: ['#1F6447', '#2B7A4C', '#3B9150', '#56A955', '#7DC05A', '#A6D466'] },
    ];
    rows.forEach((R, ri) => {
      const prof = (x) => humpProf(R.humps, R.base, R.floor)(x + ox) - oy;
      const path = underPath(prof, -10, MID.w + 10, MID.h + 10);
      S.rim(path, { w: 1.8, alpha: 0.5 });
      fill(S, path, R.ramp[2]);
      const sh = (x, y) => { const hp = humpAt(R.humps, R.base, x + ox); if (!hp) return 0.4; const [cx, top, hw] = hp; const nx = (x + ox - cx) / hw, ny = (y + oy - top) / (hw * 0.55); return clamp(0.62 - nx * 0.42 - ny * 0.3); };
      field(S, { bbox: [-20, 0, MID.w + 20, MID.h], clip: path, ramp: R.ramp, shade: sh, dir: (x, y) => { const hp = humpAt(R.humps, R.base, x + ox); const nx = hp ? (x + ox - hp[0]) / hp[2] : 0; return nx * 0.5 + (r() - 0.5) * 0.35; }, len: [36, 76], wid: [10, 16], cover: 2.6, jitter: 8, noise: 0.05, broken: 0.05 });
      if (ri === 0) {
        // arka sırada küçük tarla lekeleri
        for (const [x, y, wq, hq, col] of [[700, 945, 70, 14, '#B9C86A'], [980, 952, 90, 16, '#D6B862'], [180, 940, 80, 14, '#9FC46A'], [1180, 960, 70, 14, '#C8C070']]) {
          const q = poly([[x - ox, y - oy], [x + wq - ox, y - 4 - oy], [x + wq + 10 - ox, y + hq - oy], [x - 8 - ox, y + hq + 3 - oy]]);
          fill(S, q, col, { h: 145 }); field(S, { bbox: [x - ox - 10, y - oy - 6, x + wq - ox + 12, y + hq - oy + 4], clip: q, ramp: [shade(col, -0.04), col, shade(col, 0.04)], shade: Paint.cst(0.5), dir: -0.08, len: [16, 30], wid: [4, 6], cover: 2, noise: 0.5 });
        }
      }
    });
    // ön sırada teraslı bahçeler: her teras bir sürekli koyu ağaç bandı (yumrulu, ışıklı üst kenar) + ara sıra iri taç
    for (const [x0, y0, len, rowsN, dy] of [[846, 974, 200, 3, 11], [120, 992, 180, 3, 11], [560, 1006, 100, 2, 10]]) {
      for (let j = 0; j < rowsN; j++) {
        const xa = x0 + j * 8 - ox, xb = xa + len - j * 6, yb = y0 + j * dy - oy; const hb = 6.5;
        const topP = [], botP = [];
        for (let x = xa; x <= xb; x += 2) { const bump = 0.6 + 0.5 * NOISE(x * 0.16 + j * 5, y0 * 0.1); topP.push([x, yb - hb * bump - 1.2 * Math.sin((x - xa) * 0.05)]); botP.push([x, yb + 2]); }
        fill(S, poly(topP.concat(botP.reverse())), '#1E5B40', { h: 150 });
        let run = []; const flush = () => { if (run.length > 2) fill(S, poly(run.map(([x, y]) => [x - 0.8, y - 0.2]).concat(run.slice().reverse().map(([x, y]) => [x, y + 2.2]))), '#3A8650', { h: 160 }); run = []; };
        topP.forEach((q) => { if (NOISE(q[0] * 0.07 + j, 2.2 + y0 * 0.01) > 0.38) run.push(q); else flush(); }); flush();
        for (let x = xa + r() * 20; x < xb; x += 18 + r() * 34) if (r() < 0.45) { const cr = 4.5 + r() * 2.5; fill(S, circ(x, yb - hb * 0.6 - cr * 0.3, cr), '#1E5B40', { h: 152 }); fill(S, circ(x - cr * 0.22, yb - hb * 0.6 - cr * 0.52, cr * 0.7), '#3A8650', { h: 160 }); }
      }
    }
    // serviler: tepe sırtlarında birkaç tane
    for (const [x, hgt] of [[700, 52], [716, 40], [1015, 58], [1032, 44], [1048, 50], [330, 46], [-40, 50]]) {
      const yb = humpProf(rows[1].humps, rows[1].base, rows[1].floor)(x) + 8;
      cypress(S, x - ox, yb - oy, hgt, hgt * 0.24);
    }
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k: S.k };
  }
  defSprite('tepe-orta', paintMid);

  // ---------------------------------------------------------------- 6. vadi (zemin düzlemi perspektifi)
  const VAL = { x: -200, y: 990, w: 1480, h: 770, k: 1.25 };
  const HZ = 985, GK = 61500; // ufuk ve yer düzlemi sabiti: y = HZ + GK / gz ; x = 540 + gx*100/gz
  const proj = (gx, gz) => [540 + (gx * 100) / gz, HZ + GK / gz];
  const unproj = (x, y) => { const gz = GK / Math.max(1, y - HZ); return [((x - 540) * gz) / 100, gz]; };
  const depthS = (y) => clamp((y - HZ) / 615, 0.02, 1.4); // 1 → y=1600
  // nehir: ekranda tasarlanan orta hat → yer düzleminde sabit genişlik → perspektifle izdüşüm
  const RIVER_C = [[648, 1041], [664, 1053], [724, 1066], [796, 1082], [856, 1108], [902, 1150], [906, 1205], [850, 1262], [730, 1318], [590, 1378], [460, 1440], [345, 1510], [250, 1595], [175, 1690], [120, 1780]];
  let riverCache = null;
  function riverGeom() {
    if (riverCache) return riverCache;
    // yoğunlaştır (Catmull-Rom)
    const P = []; const C = RIVER_C; const n = C.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(n - 1, i + 2)];
      for (let j = 0; j < 12; j++) { const t = j / 12, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        P.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); }
    }
    P.push(C[n - 1]);
    const L = [], R = [], T = [];
    for (let i = 0; i < P.length; i++) {
      const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const y = P[i][1]; const wfull = 4 + 0.15 * Math.max(0, y - 1020); // perspektifle genişleyen nehir
      const hw = (wfull / 2) * (0.42 + 0.58 * Math.abs(Math.sin(ang))); // yana akan kısımlar basık görünür
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      L.push([P[i][0] + nx * hw, P[i][1] + ny * hw]); R.push([P[i][0] - nx * hw, P[i][1] - ny * hw]); T.push(ang);
    }
    // kaynak ucu: sivri
    L[0] = R[0] = [P[0][0] - 4, P[0][1] - 2];
    riverCache = { P, L, R, T };
    return riverCache;
  }
  function riverPathWorld(dx = 0, dy = 0, sc = 1) {
    const { L, R } = riverGeom(); const p = new Path2D();
    const all = L.concat(R.slice().reverse());
    all.forEach(([x, y], i) => (i ? p.lineTo((x + dx) * sc, (y + dy) * sc) : p.moveTo((x + dx) * sc, (y + dy) * sc)));
    p.closePath(); return p;
  }
  // akış yönü (aşağı akıntı birim vektörü) — sahnelerde su parıltısı için
  function riverFlow(x, y) {
    const { P } = riverGeom(); let bi = 0, bd = 1e9;
    for (let i = 0; i < P.length; i += 2) { const d = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } }
    const a = P[Math.max(0, bi - 2)], b = P[Math.min(P.length - 1, bi + 2)]; const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  }
  // nehir içinde nokta: u 0..1 kaynaktan ağza (orta hat boyunca), v -1..1 kıyıdan kıyıya → [x, y, akış açısı, yerel genişlik]
  function riverSample(u, v = 0) {
    const { P, L, R, T } = riverGeom(); const f = clamp(u) * (P.length - 1); const i = Math.min(P.length - 2, Math.floor(f)), t = f - i;
    const lx = lerp(L[i][0], L[i + 1][0], t), ly = lerp(L[i][1], L[i + 1][1], t), rx = lerp(R[i][0], R[i + 1][0], t), ry = lerp(R[i][1], R[i + 1][1], t);
    const q = (clamp(v, -1, 1) + 1) / 2; return [lerp(lx, rx, q), lerp(ly, ry, q), lerp(T[i], T[i + 1], t), Math.hypot(rx - lx, ry - ly)];
  }
  // NAR_BASE: kahraman nar ağacının gövde dibi; KOVAN_BASE: kovan sırasının taban çizgisi (dışa açılan noktalar bunların görünür ortası)
  const NAR_BASE = [962, 1512], KOVAN_BASE = [968, 1556];
  const SPOTS = { nar: [962, 1440], bugday: [1012, 1288], uzum: [790, 1404], nehir: [884, 1160], cicek: [850, 1792], kovan: [968, 1542], koy: [748, 1172] };

  // arazi dalgası: sıra sınırları birbirine paralel kalsın diye derinlikle ölçeklenen ortak dalga
  const undul = (x, s) => s * (16 * Math.sin(x * 0.0052 + 1.1) + 7 * Math.sin(x * 0.0131 + 2.3));
  function paintValley() {
    const { w, h, k } = VAL; const ox = VAL.x, oy = VAL.y;
    const S = Paint.sprite(w * k, h * k, { seed: 701, k }); const r = S.r;
    const X = (x) => (x - ox) * k, Y = (y) => (y - oy) * k; // dünya → sprite
    const P = (pts) => poly(pts.map(([x, y]) => [X(x), Y(y)]));
    const topY = (x) => 1040 + 4 * Math.sin(x * 0.013);
    const top = new Path2D(); top.moveTo(X(-220), Y(1800)); for (let x = -220; x <= 1300; x += 8) top.lineTo(X(x), Y(topY(x))); top.lineTo(X(1300), Y(1800)); top.closePath();
    S.rim(top, { w: 1.4, alpha: 0.45 });
    fill(S, top, '#2F6E40');
    S.x.save(); S.hx.save(); S.x.clip(top); S.hx.clip(top);
    // ---- sıralar (uzaktan yakına, logaritmik aralık)
    const rowsY = []; { let y = 1036, dy = 6.5; while (y < 1820) { rowsY.push(y); y += dy; dy *= 1.205; } }
    const bnd = (i, x) => rowsY[i] + undul(x, depthS(rowsY[i])) + (i % 3 - 1) * 0.0 ;
    const HAZE = '#A6C8B2';
    const types = {
      cayir: { ramp: ['#2F8A4C', '#3B9B4F', '#4AAC52', '#5FBA55'], w: 26, dir: 'h' },
      genc: { ramp: ['#7DC24C', '#92CE4D', '#A6D856', '#BAE064'], w: 14, dir: 'v' },
      koyu: { ramp: ['#1F6A45', '#277948', '#30884B'], w: 10, dir: 'h' },
      toprak: { ramp: ['#B26E3E', '#C17E46', '#CF9151', '#D9A460'], w: 9, dir: 'v' },
      acik: { ramp: ['#AFC95E', '#BDD26A', '#C9DA76'], w: 7, dir: 'v' },
      zeytin: { ramp: ['#6C8C44', '#7C9B49', '#8DA952'], w: 9, dir: 'h' },
      bahce: { ramp: ['#5AA74E', '#69B352', '#77BD58'], w: 9, dir: 'h', orchard: true },
    };
    const tKeys = Object.keys(types); const tSum = tKeys.reduce((a, t) => a + types[t].w, 0);
    const pickT = (avoid) => { for (let g = 0; g < 6; g++) { let q = r() * tSum; for (const t of tKeys) { q -= types[t].w; if (q <= 0) { if (!avoid.includes(t)) return t; break; } } } return 'cayir'; };
    const cells = []; let prevRow = [];
    for (let i = 0; i < rowsY.length - 1; i++) {
      const y0 = rowsY[i], y1 = rowsY[i + 1], rowH = y1 - y0; const s = depthS((y0 + y1) / 2);
      let x = -230 - r() * rowH * 3; const row = [];
      while (x < 1310) {
        const step = rowH * (s > 0.55 ? 1.9 + r() * 2.2 : 2.6 + r() * 3.6) * (s < 0.3 ? 1.4 : 1);
        const xa = x, xb = x + step;
        // bölücü çizgiler perspektifle ufka yakınsar + biraz serbest eğim
        const conv = rowH / Math.max(8, y0 - HZ); const sl = (r() - 0.5) * rowH * 0.5;
        row.push({ xa, xb, conv, sl }); x = xb;
      }
      for (let c = 0; c < row.length; c++) {
        const cur = row[c], nx = row[c + 1];
        const slB = nx ? nx.sl : cur.sl;
        const ta = cur.xa, tb = cur.xb; const ba = ta + (ta - 540) * cur.conv + cur.sl, bb2 = tb + (tb - 540) * cur.conv + slB;
        const pts = [];
        for (let q = 0; q <= 6; q++) { const xx = lerp(ta, tb, q / 6); pts.push([xx, bnd(i, xx)]); }
        for (let q = 6; q >= 0; q--) { const xx = lerp(ba, bb2, q / 6); pts.push([xx, bnd(i + 1, xx)]); }
        const cx = (ta + tb + ba + bb2) / 4, cy = (y0 + y1) / 2;
        const above = prevRow.filter((p) => Math.abs(p.cx - cx) < (tb - ta)).map((p) => p.t);
        const t = pickT([cells.length && cells[cells.length - 1].i === i ? cells[cells.length - 1].t : '', ...above]);
        const cell = { i, pts, cx, cy, s, t, rowH, ta, tb, ba, bb: bb2, conv: cur.conv };
        cells.push(cell); row[c].cell = cell;
      }
      prevRow = row.map((q) => q.cell);
    }
    // özel tarlalar: noktayı içeren hücre
    const cellAt = (x, y) => cells.find((c) => y >= bnd(c.i, x) && y < bnd(c.i + 1, x) && x >= lerp(c.ta, c.ba, (y - rowsY[c.i]) / c.rowH) && x < lerp(c.tb, c.bb, (y - rowsY[c.i]) / c.rowH));
    const force = (x, y, t) => { const c = cellAt(x, y); if (c) c.t = t; return c; };
    force(...SPOTS.bugday, 'bugday'); force(SPOTS.bugday[0] + 90, SPOTS.bugday[1] + 6, 'bugday'); force(SPOTS.bugday[0] - 20, SPOTS.bugday[1] + 44, 'bugday'); force(SPOTS.bugday[0] + 80, SPOTS.bugday[1] + 48, 'bugday');
    force(...SPOTS.uzum, 'bag'); force(SPOTS.uzum[0] + 60, SPOTS.uzum[1] + 2, 'bag');
    force(NAR_BASE[0], NAR_BASE[1] - 34, 'narbahce'); force(KOVAN_BASE[0], KOVAN_BASE[1] + 6, 'cayir'); force(KOVAN_BASE[0] + 46, KOVAN_BASE[1] - 2, 'cayir'); force(KOVAN_BASE[0] - 46, KOVAN_BASE[1] - 2, 'cayir');
    force(...SPOTS.koy, 'koy'); force(SPOTS.koy[0] - 60, SPOTS.koy[1], 'koy'); force(SPOTS.koy[0] + 60, SPOTS.koy[1], 'genc');
    const extra = { bugday: { ramp: ['#E0A22E', '#EBB73B', '#F3CA4C', '#F8DA6C'], dir: 'v' }, bag: { ramp: ['#C2B474', '#CDBF7E', '#D7C988'], dir: 'v' }, narbahce: { ramp: ['#4F9C48', '#5BA84D', '#68B352'], dir: 'h' }, koy: { ramp: ['#94BE5E', '#A2C766', '#AFCF70'], dir: 'h' } };
    for (const c of cells) {
      const T = types[c.t] || extra[c.t]; const haze = Math.pow(1 - clamp(c.s / 0.75), 2) * 0.62;
      const ramp = T.ramp.map((q) => mix(q, HAZE, haze));
      const path = P(c.pts); c.path = path;
      fill(S, path, ramp[1], { h: 140 });
      const xs = c.pts.map((q) => X(q[0])), ys = c.pts.map((q) => Y(q[1]));
      // yön: 'h' sıra boyunca yatay, 'v' ufka yakınsayan sürme izleri
      const dir = T.dir === 'v' ? (x, y) => { const xw = x / k + ox, yw = y / k + oy; return Math.atan2(yw - HZ, xw - 540) + (r() - 0.5) * 0.1; } : (x, y) => (r() - 0.5) * 0.12;
      const len = lerp(18, 42, c.s), wid = lerp(3, 11, c.s);
      field(S, { bbox: [Math.min(...xs) - 3, Math.min(...ys) - 3, Math.max(...xs) + 3, Math.max(...ys) + 3], clip: path, ramp, shade: Paint.cst(0.5), dir, len: [len * 0.6, len], wid: [wid * 0.7, wid], cover: lerp(1.15, 1.7, c.s), noise: 0.5, broken: 0, max: 420, fast: c.s < 0.4 });
      c.ramp = ramp;
    }
    // ---- özel tarla ayrıntıları
    const vpLine = (x0, y0, len) => { const a = Math.atan2(y0 - HZ, x0 - 540); return [x0 - Math.cos(a) * len, y0 - Math.sin(a) * len, x0 + Math.cos(a) * len, y0 + Math.sin(a) * len]; };
    const NAR_C = [NAR_BASE[0], NAR_BASE[1] - 14]; // kahraman nar ağacının çevresi bahçe sırasından boşaltılır
    for (const c of cells) {
      const s = c.s;
      if (c.t === 'bugday') {
        S.x.save(); S.hx.save(); S.x.clip(c.path); S.hx.clip(c.path);
        // ufka yakınsayan sürme izleri (koyu altın) ve açık başak şeritleri
        for (let m = -12; m <= 12; m++) {
          const xb = c.cx + m * (c.tb - c.ta) / 12; const [xa1, ya1, xb1, yb1] = vpLine(xb, rowsY[c.i + 1] + 4, 200);
          S.x.strokeStyle = m % 4 === 0 ? '#C88A24' : '#FBE38C'; S.x.globalAlpha = m % 4 === 0 ? 0.7 : 0.45; S.x.lineWidth = (m % 4 === 0 ? 1.8 : 1.2) * k * (0.4 + s);
          S.x.beginPath(); S.x.moveTo(X(xa1), Y(ya1)); S.x.lineTo(X(xb1), Y(yb1)); S.x.stroke();
        }
        S.x.restore(); S.hx.restore();
        const xs = c.pts.map((q) => X(q[0])), ys = c.pts.map((q) => Y(q[1]));
        field(S, { bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)], clip: c.path, ramp: ['#E3A92F', '#F2C94E', '#FCE592'], shade: Paint.cst(0.62), dir: -Math.PI / 2 + 0.2, dirJit: 0.5, len: [5 * s + 3, 12 * s + 4], wid: [2 * s + 1, 3.6 * s + 1.2], cover: 0.8, noise: 0.7, max: 600 });
        for (let q = 0; q < 10 * s; q++) { const x = lerp(c.ba, c.bb, r()), y = rowsY[c.i + 1] - r() * c.rowH * 0.25; S.x.fillStyle = '#E0322E'; S.x.beginPath(); S.x.arc(X(x), Y(y), (1 + s * 1.6) * k, 0, TAU); S.x.fill(); }
      }
      if (c.t === 'bag') {
        // üzüm bağı: ufka yakınsayan yeşil asma sıraları (ışık kenarı üstte), altlarında 3–5 tanelik üçgen salkımlar
        S.x.save(); S.hx.save(); S.x.clip(c.path); S.hx.clip(c.path);
        const n = 11; const L = [];
        for (let m = -n; m <= n; m++) { const xb = c.cx + m * (c.tb - c.ta) / (n * 0.9); L.push(vpLine(xb, rowsY[c.i + 1] + 6, 240)); }
        for (const [x1, y1, x2, y2] of L) {
          const segs = 90;
          // asma yaprağı bandı: sürekli koyu şerit (derinlikle kalınlaşır), üstünde sık, ışıklı yumrular
          const pts = []; for (let q = 0; q <= segs; q++) { const t = q / segs; const x = lerp(x1, x2, t), y = lerp(y1, y2, t); if (y < rowsY[c.i] - 4 || y > rowsY[c.i + 1] + 5) continue; pts.push([x, y, depthS(y)]); }
          if (pts.length < 2) continue;
          const bw = (q) => (2.4 + 5.6 * q[2]) * (0.9 + 0.22 * NOISE(q[0] * 0.25, q[1] * 0.25));
          const band = P(pts.map((q) => [q[0], q[1] - bw(q) * 0.55]).concat(pts.slice().reverse().map((q) => [q[0], q[1] + bw(q) * 0.45])));
          fill(S, band, '#245A31', { h: 165 });
          for (const q of pts) { if (r() < 0.3) continue; const b2 = bw(q); S.x.fillStyle = r() < 0.5 ? '#4E9440' : '#62A847'; S.x.beginPath(); S.x.ellipse(X(q[0] - b2 * 0.1), Y(q[1] - b2 * 0.3), b2 * 0.42 * k, b2 * 0.24 * k, -0.25, 0, TAU); S.x.fill(); }
          // salkımlar: düzensiz aralıkla, bandın altında (gölge yanı); 3–6 tanelik sıkı aşağı bakan üçgen
          let t = r() * 0.08;
          while (t < 1) {
            const x = lerp(x1, x2, t), y = lerp(y1, y2, t); const ss = depthS(y);
            if (y > rowsY[c.i] + 1 && y < rowsY[c.i + 1] - 1) {
              const br = (0.9 + 1.5 * ss) * k; const bx = X(x) + (r() - 0.5) * br, by = Y(y) + (1.2 + 2.0 * ss) * k;
              const tri = r() < 0.5 ? [[-0.5, 0], [0.5, 0], [0, 0.85]] : r() < 0.5 ? [[-1, 0], [0, 0], [1, 0], [-0.5, 0.85], [0.5, 0.85], [0, 1.7]] : [[-0.5, 0], [0.5, 0], [0, 0.85], [0.1, 1.65]];
              S.hx.fillStyle = 'rgb(196,196,196)'; S.hx.beginPath(); S.hx.arc(bx, by + br * 0.7, br * 1.9, 0, TAU); S.hx.fill();
              for (const [u, v] of tri) { S.x.fillStyle = r() < 0.55 ? '#4A2370' : '#5E3194'; S.x.beginPath(); S.x.arc(bx + u * br * 1.05, by + v * br * 1.05, br * 0.68, 0, TAU); S.x.fill(); }
              S.x.fillStyle = '#A884D2'; S.x.beginPath(); S.x.arc(bx - br * 0.55, by - br * 0.15, br * 0.26, 0, TAU); S.x.fill();
            }
            t += (0.035 + r() * 0.08);
          }
        }
        S.x.restore(); S.hx.restore();
      }
      if ((c.t === 'bahce' || c.t === 'narbahce') && s > 0.14) {
        const nar = c.t === 'narbahce';
        S.x.save(); S.hx.save(); S.x.clip(c.path); S.hx.clip(c.path);
        const nr = Math.max(2, Math.round(c.rowH / (14 + 18 * s))); const list = [];
        for (let a = 0; a < nr; a++) {
          const yy = lerp(rowsY[c.i], rowsY[c.i + 1], (a + 0.6) / (nr + 0.2)); const f = (yy - rowsY[c.i]) / c.rowH;
          const xl = lerp(c.ta, c.ba, f), xr = lerp(c.tb, c.bb, f); const sp = 16 + 26 * depthS(yy); const nn = Math.floor((xr - xl) / sp);
          for (let q = 0; q < nn; q++) { const x = xl + (q + 0.5 + (a % 2) * 0.5) * sp; if (Math.hypot(x - NAR_C[0], (yy - NAR_C[1]) * 1.3) < 74) continue; list.push([x, yy]); }
        }
        list.sort((p, q) => p[1] - q[1]);
        for (const [x, y] of list) { const ss = depthS(y); dotTree(S, X(x), Y(y - 4 * ss), (4 + 9 * ss) * k, nar ? { fruit: '#D8283A', dark: '#1D5A3A', mid: '#2E8048', light: '#68B050' } : { dark: '#1B5A3A', mid: '#2F8448', light: '#6DB552' }); }
        S.x.restore(); S.hx.restore();
      }
    }
    // ---- çitler: orta/yakın sıra sınırlarının bir kısmında sürekli koyu bant, yumrulu ışıklı üst kenar, ara sıra iri taç
    const hedge = (i, xa, xb) => {
      const s0 = depthS(rowsY[i]); const hb = 1.8 + 6.5 * s0; const st = 1.5 + 3 * s0; const hz = (1 - s0) * 0.32;
      const topP = [], botP = [];
      for (let x = xa; x <= xb; x += st) { const yb = bnd(i, x); const bump = 0.62 + 0.55 * NOISE(x * 0.09 / (0.35 + s0) + i * 3.1, i * 1.7); topP.push([x, yb - hb * bump]); botP.push([x, yb + hb * 0.2]); }
      if (topP.length < 3) return;
      const dk = mix('#174E33', HAZE, hz), md = mix('#2A7242', HAZE, hz), lt = mix('#5BA64E', HAZE, hz);
      fill(S, P(topP.concat(botP.slice().reverse())), dk, { h: 150 });
      // ışıklı üst kenar: kırık, sol üste kaymış ince şerit
      if (s0 > 0.16) {
        let run = [];
        const flush = () => { if (run.length > 2) { const up = run.map(([x, y]) => [x - hb * 0.12, y - 0.3]); const dn = run.slice().reverse().map(([x, y]) => [x, y + hb * 0.36]); fill(S, P(up.concat(dn)), md, { h: 162 }); } run = []; };
        topP.forEach((q, j) => { if (NOISE(q[0] * 0.05 + i, 4.2) > 0.36) run.push(q); else flush(); }); flush();
      }
      // ara sıra iri taç (uzak sıralarda tek ton ışık, yakında üç ton)
      let x = xa + r() * 30 * (0.4 + s0);
      while (x < xb) {
        if (r() < 0.32) {
          const yb = bnd(i, x); const cr = hb * (0.9 + r() * 0.5); const cx = X(x), cy = Y(yb - hb * 0.55 - cr * 0.3);
          fill(S, circ(cx, cy, cr * k), dk, { h: 152 }); fill(S, circ(cx - cr * 0.2 * k, cy - cr * 0.22 * k, cr * 0.72 * k), md, { h: 160 });
          if (s0 > 0.45) fill(S, circ(cx - cr * 0.38 * k, cy - cr * 0.42 * k, cr * 0.34 * k), lt, { h: 170 });
        }
        x += (26 + r() * 50) * (0.4 + s0);
      }
    };
    for (let i = 5; i < rowsY.length - 1; i++) {
      const s = depthS(rowsY[i]); let x = -220 + r() * 200;
      while (x < 1300) { const len = (180 + r() * 360) * (0.5 + s); if (r() < 0.42) hedge(i, x, x + len); x += len + r() * 200; }
    }
    S.x.restore(); S.hx.restore();
    // ---- alçak etek tepeleri: vadinin uzak kenarı (nehir bunların arasındaki boğazdan çıkar; nehirden ÖNCE boyanır)
    {
      const humps = [[-160, 1018, 150], [70, 1008, 170], [290, 1022, 140], [470, 1012, 150], [790, 1016, 130], [935, 1006, 150], [1100, 1020, 150], [1270, 1010, 160]];
      const base = 1060;
      const prof = (x) => { let y = humpProf(humps, base, 1032)(x); y = Math.max(y, 1016 + 26 * Math.exp(-(((x - 648) / 20) ** 2))); return y; };
      const lowE = (x) => 1052 + 3 * Math.sin(x * 0.03);
      const fp = new Path2D(); fp.moveTo(X(-230), Y(lowE(-230))); for (let x = -230; x <= 1310; x += 5) fp.lineTo(X(x), Y(prof(x)));
      for (let x = 1310; x >= -230; x -= 10) fp.lineTo(X(x), Y(lowE(x)));
      fp.closePath();
      S.rim(fp, { w: 1.3, alpha: 0.4 });
      const fr = ['#5A9077', '#6A9E80', '#7DAD8B', '#92BC97', '#A8CBA3'];
      fill(S, fp, fr[2], { h: 140 });
      const sh = (x, y) => { const xw = x / k + ox, yw = y / k + oy; const hp = humpAt(humps, base, xw); if (!hp) return 0.5; const nx = (xw - hp[0]) / hp[2]; return clamp(0.6 - nx * 0.5 + (yw - hp[1]) / 160); };
      field(S, { bbox: [X(-230), Y(996), X(1310), Y(1060)], clip: fp, ramp: fr, shade: sh, dir: (x, y) => { const hp = humpAt(humps, base, x / k + ox); const nx = hp ? (x / k + ox - hp[0]) / hp[2] : 0; return nx * 0.35 + (r() - 0.5) * 0.25; }, len: [20, 40], wid: [4, 7], cover: 1.8, noise: 0.06, fast: true, max: 3000 });
      S.x.save(); S.hx.save(); S.x.clip(fp); S.hx.clip(fp);
      for (let i = 0; i < 46; i++) { const x = -200 + r() * 1480; if (Math.abs(x - 648) < 40) continue; const y = prof(x) + 7 + r() * 16; dotTree(S, X(x), Y(y), (2 + r() * 1.2) * k, { dark: '#3E7563', mid: '#4F8A6C', light: '#4F8A6C' }); }
      S.x.restore(); S.hx.restore();
    }
    // ---- nehir: boğazdan tek sürekli çizgi olarak çıkar, mesafeyle genişler
    const { L, R, T, P: RP } = riverGeom();
    const rp = riverPathWorld(-ox, -oy, k);
    S.x.save(); S.x.lineJoin = 'round';
    S.x.strokeStyle = '#25603A'; S.x.lineWidth = 6 * k; S.x.stroke(rp);
    S.x.strokeStyle = '#D6E59A'; S.x.lineWidth = 2.6 * k; S.x.setLineDash([46 * k, 12 * k, 80 * k, 8 * k]); S.x.stroke(rp); S.x.restore();
    // kaynakta koyu kıyı çizgisi çok kalın kalmasın: ilk birkaç pikselde yalnız su rengi
    fill(S, rp, '#2E86CE', { h: 140 });
    field(S, { bbox: [X(100), Y(1030), X(960), Y(1800)], clip: rp, ramp: ['#1D5BAD', '#2671C0', '#2E86CE', '#3E9DD5', '#5AB8DC', '#86D0E3'],
      shade: (x, y) => { const yw = y / k + oy; return clamp(0.9 - depthS(yw) * 0.5 + 0.1 * Math.sin(x * 0.03 / k + yw * 0.06)); },
      dir: (x, y) => { const f = riverFlow(x / k + ox, y / k + oy); return Math.atan2(f[1], f[0]) + (r() - 0.5) * 0.15; },
      size: (x, y) => 0.3 + depthS(y / k + oy) * 0.8, len: [28, 50], wid: [7, 11], cover: 2.4, noise: 0.12, broken: 0.06, max: 2200 });
    S.x.save(); S.hx.save(); S.x.clip(rp); S.hx.clip(rp);
    for (let i = 0; i < 130; i++) {
      const idx = Math.floor(Math.pow(r(), 0.9) * (RP.length - 1)); const t2 = r();
      const x = lerp(L[idx][0], R[idx][0], 0.2 + t2 * 0.6), y = lerp(L[idx][1], R[idx][1], 0.2 + t2 * 0.6); const ss = depthS(y);
      stroke(S, X(x), Y(y), T[idx] + (r() - 0.5) * 0.1, 8 + 30 * ss, 1.4 + 3.4 * ss, r() < 0.6 ? '#F4FDFF' : '#BDEBF2');
    }
    S.x.restore(); S.hx.restore();
    // ---- nehir boyunca kavaklar
    for (const [ix, side] of [[26, 1], [29, 1], [32, 1], [50, -1], [54, -1], [58, -1], [70, 1], [74, 1], [92, -1], [97, -1], [103, -1], [120, 1], [126, 1]]) {
      if (ix >= RP.length) continue;
      const q = side > 0 ? L[ix] : R[ix]; const ss = depthS(q[1]);
      cypress(S, X(q[0] + (side > 0 ? -5 : 5) * ss), Y(q[1] - 3 * ss), (20 + 64 * ss) * k, (6 + 14 * ss) * k);
    }
    village(S, X, Y, k, r);
    valleyPomegranate(S, X(NAR_BASE[0]), Y(NAR_BASE[1]), k, r);
    hives(S, X, Y, k, r);
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0, k };
  }
  // ev: (x,y) ön yüzün alt sol köşesi (sprite px). o.gable: 'yan' (mahya cepheye paralel) | 'on' (üçgen alın önde).
  // Tek pencere + kenara kaymış kapı (yüz gibi okunmasın); gölge yüzü sağda (ışık sol üstten); astar kenarı.
  function house(S, x, y, wd, ht, k, r, o = {}) {
    const sd = wd * (0.4 + r() * 0.12); const lift = sd * 0.35;
    const gable = o.gable || 'yan';
    const front = gable === 'on' ? poly([[x, y], [x + wd, y], [x + wd, y - ht], [x + wd / 2, y - ht - wd * 0.42], [x, y - ht]]) : poly([[x, y], [x + wd, y], [x + wd, y - ht], [x, y - ht]]);
    const side = poly([[x + wd, y], [x + wd + sd, y - lift], [x + wd + sd, y - ht - lift], [x + wd, y - ht]]);
    let roofA, roofB;
    if (gable === 'on') {
      roofA = poly([[x + wd / 2, y - ht - wd * 0.48], [x + wd * 1.06, y - ht + 0.6], [x + wd * 1.06 + sd, y - ht - lift + 0.6], [x + wd / 2 + sd, y - ht - wd * 0.48 - lift]]);
      roofB = poly([[x - wd * 0.06, y - ht + 0.6], [x + wd / 2, y - ht - wd * 0.48], [x + wd / 2 + 1.2 * k, y - ht - wd * 0.48 - 1.2 * k], [x - wd * 0.02, y - ht - 0.6]]);
    } else {
      const rh = ht * (0.5 + r() * 0.15);
      roofA = poly([[x - wd * 0.08, y - ht], [x + wd * 1.08, y - ht], [x + wd * 0.5 + sd * 0.5, y - ht - rh], [x + wd * 0.5 - sd * 0.1, y - ht - rh]]);
      roofB = poly([[x + wd * 1.08, y - ht], [x + wd + sd * 1.08, y - ht - sd * 0.38], [x + wd * 0.5 + sd * 1.0, y - ht - rh - sd * 0.32], [x + wd * 0.5 + sd * 0.5, y - ht - rh]]);
    }
    const all = new Path2D(); [front, side, roofA, roofB].forEach((q) => all.addPath(q));
    S.rim(all, { w: 0.9, alpha: 0.85 });
    fill(S, side, '#B9B2D3', { h: 150 }); fill(S, front, '#FBF6EA', { h: 165 });
    if (gable === 'on') { fill(S, roofA, '#C2532F', { h: 160 }); fill(S, roofB, '#E7774A', { h: 175 }); }
    else { fill(S, roofB, '#A8432A', { h: 160 }); fill(S, roofA, '#DE6A3E', { h: 175 }); S.x.save(); S.x.strokeStyle = '#F59A6A'; S.x.lineWidth = Math.max(0.8, wd * 0.06); S.x.beginPath(); S.x.moveTo(x - wd * 0.06, y - ht - 0.5); S.x.lineTo(x + wd * 1.06, y - ht - 0.5); S.x.stroke(); S.x.restore(); }
    if (wd > 8 * k) {
      const doorLeft = o.flip ? 0.16 : 0.62; const winLeft = o.flip ? 0.58 : 0.18;
      S.x.fillStyle = '#7A4A3A'; S.x.fillRect(x + wd * doorLeft, y - ht * 0.5, wd * 0.2, ht * 0.5);
      S.x.fillStyle = '#3D3A6A'; S.x.fillRect(x + wd * winLeft, y - ht * 0.66, wd * 0.2, ht * 0.24);
      S.x.fillStyle = '#E9E2D2'; S.x.fillRect(x + wd * winLeft, y - ht * 0.66 + ht * 0.24, wd * 0.2, Math.max(0.8, ht * 0.04));
    }
  }
  function village(S, X, Y, k, r) {
    const [vx, vy] = SPOTS.koy;
    // [dx, dy, ölçek, çatı, kapı yanı]
    const hs = [[-48, -14, 1.0, 'yan', 0], [-20, -24, 0.8, 'on', 1], [10, -12, 1.15, 'yan', 1], [36, -26, 0.75, 'on', 0], [-64, 6, 1.2, 'on', 0], [-30, 8, 1.05, 'yan', 1], [6, 14, 1.3, 'on', 1], [42, 4, 0.95, 'yan', 0], [66, -8, 0.85, 'on', 1], [-4, -34, 0.7, 'yan', 0]];
    hs.sort((a, b) => a[1] - b[1]);
    fill(S, smoothPath(blobPts(X(vx), Y(vy + 2), 92 * k, 30 * k, 18, 0.12, 5)), '#9FBF62', { h: 140 });
    for (const [dx, dy, sc, g, fl] of hs) {
      const ss = depthS(vy + dy); const wd = (21 * ss + 7) * sc * k, ht = (13 * ss + 5) * sc * (g === 'on' ? 0.9 : 1) * k;
      house(S, X(vx + dx), Y(vy + dy), wd, ht, k, r, { gable: g, flip: fl });
    }
    for (const [dx, dy] of [[-76, -6], [74, 10], [22, -34], [-40, 22], [50, 22]]) { const ss = depthS(vy + dy); dotTree(S, X(vx + dx), Y(vy + dy - 4), (4 + 6 * ss) * k, { dark: '#174E33', mid: '#256F40', light: '#5DA64E' }); }
    cypress(S, X(vx - 88), Y(vy + 2), 44 * k, 11 * k); cypress(S, X(vx + 88), Y(vy + 16), 50 * k, 12 * k);
  }
  // nar meyvesi: hafif basık yuvarlak, kırmızı-turuncu ışık yanı, koyu kızıl gölge yanı, üstte belirgin taç (çiçek çanağı)
  function pomegranate(S, cx, cy, rr) {
    const body = ellipsePath(cx, cy, rr * 1.06, rr * 0.94, -0.12);
    fill(S, body, '#9C1828', { h: 175 });
    const lit = ellipsePath(cx - rr * 0.16, cy - rr * 0.14, rr * 0.86, rr * 0.76, -0.12);
    S.x.save(); S.x.clip(body); S.x.fillStyle = '#D83A2E'; S.x.fill(lit);
    S.x.fillStyle = '#F06A3C'; S.x.beginPath(); S.x.ellipse(cx - rr * 0.38, cy - rr * 0.34, rr * 0.4, rr * 0.3, -0.5, 0, TAU); S.x.fill(); S.x.restore();
    S.x.fillStyle = '#FFC7A6'; S.x.beginPath(); S.x.ellipse(cx - rr * 0.48, cy - rr * 0.44, rr * 0.16, rr * 0.11, -0.5, 0, TAU); S.x.fill();
    // taç: kısa boyun + 4 sivri diş
    const t = cy - rr * 0.86; const cw = rr * 0.42;
    fill(S, poly([[cx - cw * 0.55, t + rr * 0.12], [cx - cw * 0.62, t - rr * 0.18], [cx - cw * 0.92, t - rr * 0.46], [cx - cw * 0.28, t - rr * 0.26], [cx, t - rr * 0.52], [cx + cw * 0.28, t - rr * 0.26], [cx + cw * 0.92, t - rr * 0.46], [cx + cw * 0.62, t - rr * 0.18], [cx + cw * 0.55, t + rr * 0.12]]), '#7E1422', { h: 185 });
    S.x.fillStyle = '#C8432F'; S.x.fillRect(cx - cw * 0.5, t - rr * 0.02, cw * 0.32, rr * 0.12);
  }
  function valleyPomegranate(S, x, y, k, r) {
    const q = 1.4; const K = k * q; // 1.4× büyütülmüş
    // gölge (sağ alta): opak, tarlanın koyu tonu
    fill(S, ellipsePath(x + 20 * K, y + 1 * K, 36 * K, 7 * K), '#2B6438', { h: 140 });
    S.line([[x, y], [x - 2 * K, y - 18 * K], [x + 1 * K, y - 34 * K]], 6 * K, '#6B4430', { w1: 4 * K, rim: false });
    S.line([[x, y - 22 * K], [x - 14 * K, y - 40 * K]], 3 * K, '#6B4430', { rim: false });
    S.line([[x, y - 26 * K], [x + 15 * K, y - 42 * K]], 3 * K, '#6B4430', { rim: false });
    const lobes = [[-16, -54, 22], [14, -56, 23], [0, -73, 22], [-25, -40, 15], [25, -40, 15], [0, -46, 18]];
    const lp = lobes.map(([dx, dy, rr], i) => smoothPath(blobPts(x + dx * K, y + dy * K, rr * K, rr * K * 0.96, 18, 0.06, 40 + i)));
    const sil = new Path2D(); lp.forEach((p2) => sil.addPath(p2));
    S.rim(sil, { w: 1.8, alpha: 0.9 });
    fill(S, sil, '#0F4A35', { h: 150 });
    const big = Paint.sphere(x - 10 * K, y - 70 * K, 52 * K, [LX, LY], 0);
    lobes.forEach(([dx, dy, rr], i) => {
      const cx = x + dx * K, cy = y + dy * K;
      const loc = Paint.sphere(cx - rr * 0.3 * K, cy - rr * 0.35 * K, rr * 1.15 * K, [LX, LY], 0);
      field(S, { bbox: [cx - rr * K, cy - rr * K, cx + rr * K, cy + rr * K], clip: lp[i], ramp: ['#0F4A35', '#1E6B40', '#3A9449', '#6DBB55', '#A2D867'], shade: (px, py) => clamp(loc(px, py) * 0.55 + big(px, py) * 0.55 - 0.08), dir: -0.6, dirJit: 1.2, len: [8, 13], wid: [4, 6.5], cover: 3, noise: 0.06, broken: 0.03 });
    });
    const fr = [[-24, -50], [-8, -64], [12, -49], [26, -64], [-16, -34], [6, -82], [32, -42], [-32, -64], [2, -38], [18, -76], [-4, -52]];
    for (const [dx, dy] of fr) pomegranate(S, x + dx * K, y + dy * K, 4.4 * K);
  }
  // arı kovanları: bal/ahşap renginde, üst üste katlı kutu bantları, koyu giriş yarığı ve uçuş tahtası, kiremit kapak
  function hives(S, X, Y, k, r) {
    const [hx0, hy0] = KOVAN_BASE;
    fill(S, smoothPath(blobPts(X(hx0 + 4), Y(hy0 + 3), 86 * k, 13 * k, 16, 0.1, 9)), '#8CC85A', { h: 140 });
    const woods = [['#E4B062', '#AE7A3C', '#C8643A'], ['#D79B4C', '#A06A34', '#8C5A34'], ['#EBC77F', '#B4874A', '#C8643A'], ['#DDA556', '#A87238', '#8C5A34']];
    [-51, -17, 17, 51].forEach((dx, hi) => {
      const y0 = hy0 + Math.abs(dx) * 0.04 + (hi % 2) * 1.5; const ss = depthS(y0); const wd = (19 + 6 * ss) * k, ht = (17 + 6 * ss + (hi === 1 ? 4 : 0)) * k;
      const x = X(hx0 + dx) - wd / 2, y = Y(y0); const sd = wd * 0.3; const [cf, cs, cl] = woods[hi];
      fill(S, ellipsePath(x + wd * 0.95, y + 1 * k, wd * 0.7, 2.6 * k), '#4E8A3E', { h: 140 }); // opak gölge
      const body = y - 2.6 * k;
      S.rim(poly([[x - wd * 0.12, body - ht], [x + sd * 0.05, body - ht - sd * 0.5], [x + wd + sd * 1.15, body - ht - sd * 0.5], [x + wd + sd, body - sd * 0.5], [x + wd, body + 2.6 * k], [x, body + 2.6 * k], [x, body - ht]]), { w: 0.8, alpha: 0.8 });
      fill(S, rectPath(x + wd * 0.1, body, wd * 0.8, 2.6 * k), '#5A4636', { h: 140 }); // ayaklık
      fill(S, poly([[x + wd, body], [x + wd + sd, body - sd * 0.5], [x + wd + sd, body - ht - sd * 0.5], [x + wd, body - ht]]), cs, { h: 150 });
      fill(S, rectPath(x, body - ht, wd, ht), cf, { h: 170 });
      // katlar: yatay bantlar (gölge çizgisi + ışık kenarı)
      const nb = hi === 1 ? 3 : 2;
      for (let b = 1; b < nb; b++) { const yy = body - (ht * b) / nb; S.x.fillStyle = shade(cf, -0.16, 1.1); S.x.fillRect(x, yy, wd, Math.max(1, ht * 0.07)); S.x.fillStyle = shade(cs, -0.1); S.x.fillRect(x + wd, yy - sd * 0.5 * 0.5, sd, Math.max(1, ht * 0.06)); S.x.fillStyle = shade(cf, 0.07, 0.8); S.x.fillRect(x, yy + ht * 0.07, wd, Math.max(0.8, ht * 0.04)); }
      S.x.fillStyle = shade(cf, 0.06, 0.8); S.x.fillRect(x, body - ht, Math.max(1, wd * 0.1), ht);
      // kapak: hafif taşan çatı
      fill(S, poly([[x - wd * 0.12, body - ht], [x + wd * 1.12, body - ht], [x + wd + sd * 1.15, body - ht - sd * 0.5], [x + sd * 0.05, body - ht - sd * 0.5]]), shade(cl, 0.12, 0.9), { h: 185 });
      fill(S, rectPath(x - wd * 0.12, body - ht, wd * 1.24, Math.max(1.8 * k, ht * 0.15)), cl, { h: 160 });
      // giriş yarığı ve uçuş tahtası
      S.x.fillStyle = '#2E1F18'; S.x.fillRect(x + wd * 0.22, body - ht * 0.17, wd * 0.56, Math.max(1.2 * k, ht * 0.09));
      S.x.fillStyle = shade(cf, 0.1, 0.9); S.x.fillRect(x + wd * 0.14, body - ht * 0.07, wd * 0.72, Math.max(1, ht * 0.07));
      // arılar
      for (let b = 0; b < 2; b++) { const bx = x + wd * (0.2 + r() * 0.9) + (r() - 0.5) * 8 * k, by = body - ht * (0.1 + r() * 0.6) - (r() * 10 + 2) * k; S.x.fillStyle = '#2A1E14'; S.x.beginPath(); S.x.ellipse(bx, by, 1.2 * k, 0.9 * k, 0, 0, TAU); S.x.fill(); S.x.fillStyle = '#F4C430'; S.x.beginPath(); S.x.arc(bx - 0.8 * k, by, 0.6 * k, 0, TAU); S.x.fill(); }
    });
  }
  defSprite('vadi', paintValley);

  // ---------------------------------------------------------------- 7. ön tümsek (çimen, çiçekler)
  const KNOLL = { x: -200, y: 1440, w: 1480, h: 820, k: 1.6 };
  const knollTop = (x) => { const pts = [[-260, 1544], [-100, 1504], [100, 1476], [260, 1478], [430, 1500], [610, 1540], [800, 1594], [1000, 1642], [1200, 1680], [1340, 1694]]; for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) { const t = smooth(inv(pts[i][0], pts[i + 1][0], x)); return lerp(pts[i][1], pts[i + 1][1], t); } return 1690; };
  // taç yaprağı biçimi: tabanı (0,0), +x yönünde; yanları dolgun, ucu hafif tırtıllı (kuru fırça ucu)
  function petalShape(len, wid, r) {
    const p = new Path2D(); p.moveTo(0, 0);
    p.bezierCurveTo(len * 0.18, -wid * 0.56, len * 0.68, -wid * 0.64, len * 0.9, -wid * 0.36);
    const n = 3; for (let i = 1; i <= n; i++) { const t = i / (n + 1); const yy = lerp(-wid * 0.36, wid * 0.36, t); p.lineTo(len * (0.97 + (r() - 0.5) * 0.1) - Math.abs(yy) * 0.25, yy); }
    p.lineTo(len * 0.9, wid * 0.36);
    p.bezierCurveTo(len * 0.68, wid * 0.64, len * 0.18, wid * 0.56, 0, 0);
    p.closePath(); return p;
  }
  // beyaz taç yapraklarının gölgesi gri değil pembe-lavanta
  const petalShadow = (petal) => { const [L] = hex2lch(petal); return L > 0.93 ? '#EED3E5' : shade(petal, -0.08, 1.12, -6); };
  function petalAt(S, x, y, a, len, wid, col, h = 188) {
    const r = S.r; const sh = petalShape(len, wid, r); const m = new DOMMatrix().translate(x, y).rotate((a * 180) / Math.PI);
    const pp = new Path2D(); pp.addPath(sh, m); fill(S, pp, col, { h });
    // 1–2 kıl izi (tabandan uca)
    S.x.save(); S.x.translate(x, y); S.x.rotate(a); S.x.clip(sh); S.x.lineCap = 'round';
    for (let j = 0; j < 1 + (r() < 0.6 ? 1 : 0); j++) { const off = (r() - 0.5) * wid * 0.5; S.x.globalAlpha = 0.55; S.x.strokeStyle = shade(col, r() < 0.5 ? -0.07 : 0.05, 1.1, -6); S.x.lineWidth = Math.max(0.8, wid * 0.09); S.x.beginPath(); S.x.moveTo(len * 0.15, off * 0.4); S.x.lineTo(len * 0.86, off); S.x.stroke(); }
    S.x.restore();
  }
  // kır çiçeği: tırtıl uçlu taç yaprakları (ışığa bakanlar açık, diğerleri pembe-lavanta gölge), iç halka ve göbek
  function flower(S, x, y, rr, petal, center, n = 5, rot = 0, ring) {
    const lite = petal, dark = petalShadow(petal);
    const order = []; for (let i = 0; i < n; i++) order.push(i);
    order.sort((i, j) => Math.sin(rot + (i / n) * TAU) - Math.sin(rot + (j / n) * TAU)); // üsttekiler önce
    for (const i of order) {
      const a = rot + (i / n) * TAU + (S.r() - 0.5) * 0.2; const lit = Math.cos(a) * LX + Math.sin(a) * LY > -0.15;
      petalAt(S, x + Math.cos(a) * rr * 0.08, y + Math.sin(a) * rr * 0.08, a, rr * 1.08, rr * (n > 5 ? 0.78 : 0.92), lit ? lite : dark, 185 + (i % 2) * 10);
    }
    if (ring) fill(S, circ(x, y, rr * 0.4), ring, { h: 195 });
    fill(S, circ(x, y, rr * 0.24), center, { h: 210 });
    S.x.fillStyle = shade(center, 0.12, 0.8); S.x.beginPath(); S.x.arc(x - rr * 0.07, y - rr * 0.08, rr * 0.09, 0, TAU); S.x.fill();
  }
  // koyu yaprak (çiçek tarhı): ışık kenarlı, orta damarlı
  // koyu yaprak (çiçek tarhı): iki düz ton (ışık yarısı açık, gölge yarısı koyu), orta damar, ışık yanında ince kenar
  function bigLeaf(S, x, y, a, len, wid, col) {
    const k = S.k, r = S.r; const L = len * k, Wd = wid * k;
    const p = leafPath(L, Wd, r); const m = new DOMMatrix().translate(x, y).rotate((a * 180) / Math.PI); const pp = new Path2D(); pp.addPath(p, m);
    const upLit = Math.sin(a) * LX - Math.cos(a) * LY > 0; const lite = shade(col, 0.1, 0.95, -6), dark = shade(col, -0.05, 1.05, 6);
    fill(S, pp, dark, { h: 160 });
    S.x.save(); S.hx.save(); S.x.translate(x, y); S.x.rotate(a); S.hx.translate(x, y); S.hx.rotate(a); S.x.clip(p); S.hx.clip(p);
    const half = new Path2D(); half.rect(-L, upLit ? -Wd : 0, L * 2, Wd); S.x.fillStyle = lite; S.x.fill(half);
    S.hx.fillStyle = 'rgb(172,172,172)'; S.hx.fill(half);
    // kıl izleri
    for (let j = 0; j < 3; j++) { const yy = (upLit ? -1 : 1) * Wd * (0.12 + j * 0.12); S.x.globalAlpha = 0.25; S.x.strokeStyle = shade(lite, 0.06); S.x.lineWidth = 0.9 * k; S.x.beginPath(); S.x.moveTo(-L * 0.4, yy * 0.8); S.x.lineTo(L * 0.4, yy * 0.6); S.x.stroke(); }
    S.x.globalAlpha = 0.9; S.x.strokeStyle = shade(col, 0.22, 0.75, -10); S.x.lineWidth = Math.max(1, Wd * 0.07); S.x.beginPath(); S.x.moveTo(-L * 0.46, 0); S.x.lineTo(L * 0.4, 0); S.x.stroke();
    S.x.globalAlpha = 0.85; S.x.strokeStyle = '#B8E266'; S.x.lineWidth = 1.2 * k; S.x.beginPath(); const sg = upLit ? -1 : 1; S.x.moveTo(-L * 0.36, sg * Wd * 0.38); S.x.quadraticCurveTo(0, sg * Wd * 0.56, L * 0.38, sg * Wd * 0.16); S.x.stroke();
    S.x.restore(); S.hx.restore();
  }
  function paintKnoll() {
    const { w, h, k } = KNOLL; const ox = KNOLL.x, oy = KNOLL.y;
    const S = Paint.sprite(w * k, h * k, { seed: 801, k }); const r = S.r;
    const X = (x) => (x - ox) * k, Y = (y) => (y - oy) * k;
    const top = new Path2D(); top.moveTo(X(-220), Y(2300)); for (let x = -220; x <= 1300; x += 6) top.lineTo(X(x), Y(knollTop(x))); top.lineTo(X(1300), Y(2300)); top.closePath();
    S.rim(top, { w: 2.6 });
    fill(S, top, '#2A9A50');
    const ramp = ['#0B4A36', '#0F5C3E', '#187244', '#22904C', '#2EAD56', '#5CC453', '#8FD44C', '#B8E266'];
    // sıkı kır çiçeği öbeği: ortada bir çiçek, çevresinde düzenli aralıklı halka (içi boş/harf biçimli dizilim olmaz)
    const rosette = (cx, cy, n, rr, pc, cc, stems) => {
      const a0 = r() * TAU; const ring = n <= 3 ? n : n - 1; const pts = n <= 3 ? [] : [[cx, cy]]; const R0 = n <= 3 ? 1.05 : 1.55;
      for (let j = 0; j < ring; j++) { const a = a0 + (j / ring) * TAU + (r() - 0.5) * 0.4; pts.push([cx + Math.cos(a) * rr * R0, cy + Math.sin(a) * rr * R0 * 0.62]); }
      pts.sort((p2, q2) => p2[1] - q2[1]);
      for (const [x, y] of pts) { if (stems) S.line([[X(x), Y(y)], [X(x + (r() - 0.5) * 4), Y(y + 14 * rr / 7)]], 1.8 * k, '#246E3C', { rim: false, edge: false }); flower(S, X(x), Y(y), rr * (0.85 + r() * 0.3) * k, pc, cc, 5, r() * 6); }
    };
    // ağaç gölgesi (sol üst ışık → gölge sağa/aşağı): oturma yerinin çevresi
    const shadowF = (xw, yw) => { const dx = (xw - 470) / 380, dy = (yw - 1690) / 120; return Math.exp(-(dx * dx + dy * dy) * 1.4); };
    const sh = (x, y) => { const xw = x / k + ox, yw = y / k + oy; const t = yw - knollTop(xw); let v = 0.86 - t / 520 - (xw - 200) / 2600; v -= shadowF(xw, yw) * 0.38; if (t < 26) v += 0.12; return clamp(v); };
    field(S, { bbox: [-30, 0, w * k + 30, Y(2222)], clip: top, ramp, shade: sh, dir: (x, y) => -Math.PI / 2 + 0.25 + (r() - 0.5) * 0.7, size: (x, y) => 0.7 + 0.7 * clamp((y / k + oy - 1480) / 700), len: [26, 46], wid: [8, 13], cover: 2.05, jitter: 18, jitterFreq: 0.008, noise: 0.06, broken: 0.07, max: 9000 });
    // sırtta ışık şeridi
    for (let i = 0; i < 260; i++) { const xw = -200 + r() * 1480; const yw = knollTop(xw) + 4 + r() * 18; stroke(S, X(xw), Y(yw), -0.05 + (r() - 0.5) * 0.3, 24 + r() * 30, 6 + r() * 5, r() < 0.5 ? '#B8E266' : '#9ED64A'); }
    // çimen uçları: sırt boyunca siluetten taşan kısa sivri darbeler
    for (let i = 0; i < 420; i++) { const xw = -200 + r() * 1480; const yw = knollTop(xw) + 2; leaf(S, X(xw), Y(yw), -Math.PI / 2 + (r() - 0.5) * 0.9, 12 + r() * 14, 3 + r() * 2, r() < 0.6 ? '#7CCB4E' : '#3DAF55', { height: false }); }
    // öndeki iri çimen öbekleri (koyu)
    for (let i = 0; i < 440; i++) {
      const xw = -200 + r() * 1480, yw = 1700 + Math.pow(r(), 0.7) * 520; if (yw < knollTop(xw) + 60) continue;
      const ss = 0.8 + clamp((yw - 1700) / 500) * 0.9; const v = sh(X(xw), Y(yw));
      const col = v > 0.55 ? (r() < 0.5 ? '#5CC453' : '#2EAD56') : v > 0.35 ? (r() < 0.5 ? '#22904C' : '#187244') : '#0F5C3E';
      for (let j = 0; j < 3; j++) leaf(S, X(xw + (j - 1) * 5 * ss), Y(yw), -Math.PI / 2 + (j - 1) * 0.35 + (r() - 0.5) * 0.3, (22 + r() * 18) * ss, (4 + r() * 2.5) * ss, shade(col, (r() - 0.5) * 0.06));
    }
    // dağınık kır çiçekleri (beyaz/pembe/sarı küçük öbekler)
    const fl = [['#FFFFFF', '#F2C230'], ['#F7A8CB', '#F2C230'], ['#F6D23C', '#E07A1E'], ['#FFF2F6', '#F2C230']];
    for (let i = 0; i < 46; i++) {
      const xw = -180 + r() * 1440, yw = knollTop(xw) + 40 + r() * 600; if (Math.abs(xw - SPOTS.cicek[0]) < 120 && Math.abs(yw - SPOTS.cicek[1]) < 80) continue;
      if (shadowF(xw, yw) > 0.5 && r() < 0.6) continue;
      const ss = 0.7 + clamp((yw - 1500) / 600) * 0.8; const [pc, cc] = r.pick(fl);
      rosette(xw, yw, 3 + r.int(0, 3), (5 + r() * 2.5) * ss, pc, cc, false);
    }
    // yakın planda görünen ön kısımda birkaç küçük öbek daha
    for (const [cx0, cy0, n] of [[150, 1880, 5], [560, 1990, 6], [700, 1840, 4], [250, 2060, 5], [40, 1760, 4]]) {
      const [pc, cc] = r.pick(fl); const ss = 0.9 + clamp((cy0 - 1500) / 600) * 0.7; rosette(cx0, cy0, n, (6 + r() * 2.5) * ss, pc, cc, true);
    }
    // ağacın altında dökülmüş pembe-beyaz taç yaprakları: sivri tabanlı, ucu çentikli (kiraz yaprağı) damla biçim, boyları farklı
    const fallen = (x, y, a, len, wid, col) => {
      const p = new Path2D(); p.moveTo(0, 0);
      p.bezierCurveTo(len * 0.25, -wid * 0.62, len * 0.8, -wid * 0.66, len * 0.98, -wid * 0.24);
      p.lineTo(len * 0.8, 0); p.lineTo(len * 0.98, wid * 0.24);
      p.bezierCurveTo(len * 0.8, wid * 0.66, len * 0.25, wid * 0.62, 0, 0); p.closePath();
      const pp = new Path2D(); pp.addPath(p, new DOMMatrix().translate(x, y).rotate((a * 180) / Math.PI));
      fill(S, pp, col, { h: 186 });
      // gölge yarısı (pembe-lavanta) ve kıl izi
      S.x.save(); S.x.clip(pp); S.x.translate(x, y); S.x.rotate(a); const up = Math.sin(a) * LX - Math.cos(a) * LY > 0;
      S.x.fillStyle = petalShadow(col); S.x.fillRect(-2, up ? 0 : -wid, len + 4, wid); S.x.globalAlpha = 0.5; S.x.strokeStyle = shade(col, -0.06, 1.1, -6); S.x.lineWidth = Math.max(0.8, wid * 0.08);
      S.x.beginPath(); S.x.moveTo(len * 0.12, 0); S.x.lineTo(len * 0.7, (r() - 0.5) * wid * 0.3); S.x.stroke(); S.x.restore();
    };
    for (let i = 0; i < 40; i++) {
      const a = r() * TAU, d = Math.pow(r(), 0.7); const x = 360 + Math.cos(a) * d * 300, y = 1750 + Math.sin(a) * d * 80; if (y < knollTop(x) + 30) continue;
      const sz = 0.6 + r() * 0.8; fallen(X(x), Y(y), r() * TAU, (13 + r() * 3) * sz * k, (7.5 + r() * 1.5) * sz * k, r() < 0.55 ? '#F7A8CB' : '#FFF6FA');
    }
    // ÇİÇEK TARHI (tanınır öbek): kaynak resimdeki gibi iri beyaz-pembe kır gülleri, koyu yapraklar, tomurcuklar
    const [fx, fy] = SPOTS.cicek;
    const inPatch = (x, y) => ((x - fx) / 165) ** 2 + ((y - fy) / 66) ** 2 < 1;
    for (let i = 0; i < 90; i++) { const a = r() * TAU, d = Math.sqrt(r()); const x = fx + Math.cos(a) * d * 165, y = fy + Math.sin(a) * d * 64; bigLeaf(S, X(x), Y(y), -Math.PI / 2 + (x - fx) / 120 + (r() - 0.5) * 1.4, 40 + r() * 18, 16 + r() * 6, r.pick(['#1E7A3E', '#28894A', '#176A38', '#2F9A4C'])); }
    const fp = []; for (let i = 0; i < 600 && fp.length < 34; i++) { const a = r() * TAU, d = Math.pow(r(), 0.75); const q = [fx + Math.cos(a) * d * 155, fy + Math.sin(a) * d * 58 - 12, 0]; q[2] = (1 - d) * 0.7 + r() * 0.45; if (fp.some(([x, y]) => Math.hypot(x - q[0], (y - q[1]) * 1.5) < 31)) continue; fp.push(q); }
    fp.sort((a, b) => a[1] - b[1]);
    fp.forEach(([x, y, big], i) => {
      const kind = i % 5; const rr = (12 + big * 11) * k;
      S.line([[X(x), Y(y) + rr * 0.3], [X(x) + (r() - 0.5) * 8 * k, Y(y) + rr * 1.8 + 8 * k]], 2.4 * k, '#246E3C', { rim: false, edge: false });
      if (r() < 0.6) bigLeaf(S, X(x + 12), Y(y + 14), -0.5 + (r() - 0.5), 34, 14, '#2A8C46');
      if (kind <= 1) flower(S, X(x), Y(y), rr, '#FFFFFF', '#F4C430', 5, r() * 3, '#F07BB2'); // beyaz kır gülü
      else if (kind === 2) flower(S, X(x), Y(y), rr * 0.9, '#F7A8CB', '#F4C430', 5, r() * 3, '#E0609D'); // pembe
      else if (kind === 3) flower(S, X(x), Y(y), rr * 0.75, '#F7D23A', '#E0841E', 5, r() * 3); // sarı
      else flower(S, X(x), Y(y), rr * 0.8, '#FFF3F8', '#F4C430', 6, r() * 3, '#F59AC4');
    });
    // tomurcuklar: pembe damla, ince sap
    for (let i = 0; i < 12; i++) { const a = r() * TAU, d = Math.sqrt(r()); const x = fx + Math.cos(a) * d * 150, y = fy + Math.sin(a) * d * 50 - 40 - r() * 30; S.line([[X(x), Y(y)], [X(x + (r() - 0.5) * 10), Y(y + 40)]], 2 * k, '#246E3C', { rim: false, edge: false }); const bp = new Path2D(); bp.moveTo(X(x), Y(y - 12)); bp.quadraticCurveTo(X(x + 7), Y(y - 2), X(x), Y(y + 3)); bp.quadraticCurveTo(X(x - 7), Y(y - 2), X(x), Y(y - 12)); fill(S, bp, '#E8559A', { h: 190 }); S.x.fillStyle = '#F7A8CB'; S.x.beginPath(); S.x.ellipse(X(x - 1.6), Y(y - 5), 1.6 * k, 3 * k, 0, 0, TAU); S.x.fill(); fill(S, poly([[X(x - 5), Y(y + 2)], [X(x), Y(y - 3)], [X(x + 5), Y(y + 2)], [X(x), Y(y + 5)]]), '#2E8A45', { h: 170 }); }
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0, k };
  }
  defSprite('tumsek', paintKnoll);

  // ---------------------------------------------------------------- 8. büyük çiçekli ağaç
  const TREE = { x: -240, y: 470, w: 1090, h: 1270, k: 1.5, base: [300, 1700] };
  // taç kütleleri: her kütle birkaç alt lobun birleşimi; ışık kütle küresine göre basamaklanır
  const TREE_MASSES = [
    { c: [330, 690, 230], dark: 0.0, lobes: [[220, 650, 118], [338, 598, 132], [452, 668, 112], [300, 742, 140], [180, 760, 108], [420, 770, 110]] },
    { c: [10, 900, 270], dark: 0.04, lobes: [[-160, 880, 104], [-70, 800, 128], [50, 760, 132], [92, 880, 140], [-40, 960, 140], [140, 990, 104]] },
    { c: [580, 860, 190], dark: 0.06, lobes: [[512, 822, 112], [618, 800, 104], [722, 874, 80], [566, 912, 90], [440, 884, 92], [662, 936, 66], [722, 814, 50]] },
    { c: [110, 1090, 170], dark: 0.16, lobes: [[150, 1060, 112], [36, 1132, 86], [244, 976, 100], [110, 1162, 62], [-60, 1060, 92]] },
  ];
  const TREE_LOBES = TREE_MASSES.flatMap((m) => m.lobes);
  // gökyüzü delikleri: yalnız tacın içinde (kenardan uzak) — dünya [x, y, rx, ry, dal açısı]
  const TREE_HOLES = [[318, 664, 24, 17, -0.35], [-56, 884, 21, 15, 0.5], [606, 852, 18, 13, -0.15]];
  // gövde + ana dallar + kökler: tek birleşik iskelet (ek yeri yok). [orta hat (dünya), genişlik başı, sonu]
  const TREE_SKEL = [
    [[[292, 1716], [293, 1640], [295, 1560], [296, 1480], [297, 1400], [298, 1340], [298, 1300]], 130, 102],
    [[[290, 1352], [270, 1292], [234, 1214], [180, 1124], [122, 1034], [76, 956], [46, 902]], 56, 18],
    [[[306, 1352], [326, 1292], [348, 1212], [386, 1106], [470, 1022], [584, 972], [700, 936], [716, 930]], 54, 14],
    [[[206, 1180], [236, 1084], [258, 984], [266, 884], [262, 826]], 26, 10],
    [[[150, 1082], [84, 1044], [-24, 1012], [-90, 1002]], 22, 8],
    [[[456, 1040], [478, 972], [508, 902], [522, 862]], 18, 7],
    [[[264, 1688], [238, 1708], [194, 1724]], 34, 10],
    [[[322, 1688], [350, 1706], [404, 1722]], 34, 10],
    [[[294, 1700], [300, 1716], [306, 1730]], 30, 14],
  ];
  function blossom(S, x, y, rr, petal, center, n = 5, shadeCol) {
    const r = S.r; const rot = r() * TAU; const sh = shadeCol || shade(petal, -0.1, 1.1, -8);
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * TAU; const lit = Math.cos(a) * LX + Math.sin(a) * LY > 0.1;
      fill(S, ellipsePath(x + Math.cos(a) * rr * 0.56, y + Math.sin(a) * rr * 0.56, rr * 0.54, rr * 0.42, a), lit ? petal : sh, { h: 190 + (i % 2) * 8 });
    }
    fill(S, circ(x, y, rr * 0.28), center, { h: 205 });
  }
  // Catmull-Rom ile yoğunlaştırılmış orta hat (adım ~st)
  function densify(C, st = 6) {
    const P = []; const n = C.length;
    for (let i = 0; i < n - 1; i++) {
      const p0 = C[Math.max(0, i - 1)], p1 = C[i], p2 = C[i + 1], p3 = C[Math.min(n - 1, i + 2)];
      const m = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / st));
      for (let j = 0; j < m; j++) { const t = j / m, t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        P.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]); }
    }
    P.push(C[n - 1]); return P;
  }
  // şerit: orta hat boyunca genişlik w0→w1; uç yuvarlak. Dönüş: dünya koordinatında {P, N, W, pts (çokgen)}
  function ribbonGeom(C, w0, w1) {
    const P = densify(C, 5); const n = P.length;
    const N = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
    const W = P.map((p, i) => lerp(w0, w1, Math.pow(i / (n - 1), 0.85)) * (1 + 0.05 * Math.sin(i * 0.7)));
    const L = [], R = [];
    for (let i = 0; i < n; i++) { L.push([P[i][0] + N[i][0] * W[i] / 2, P[i][1] + N[i][1] * W[i] / 2]); R.push([P[i][0] - N[i][0] * W[i] / 2, P[i][1] - N[i][1] * W[i] / 2]); }
    const e = P[n - 1], tx = -N[n - 1][1], ty = N[n - 1][0]; const cap = [];
    for (let j = 1; j < 6; j++) { const a = (j / 6) * Math.PI; const c = Math.cos(a), sn = Math.sin(a); cap.push([e[0] + (N[n - 1][0] * c + tx * sn) * W[n - 1] / 2, e[1] + (N[n - 1][1] * c + ty * sn) * W[n - 1] / 2]); }
    return { P, N, W, pts: L.concat(cap, R.reverse()) };
  }
  // dal: orta hat boyunca şerit; kesitte basamaklı silindir ışığı, kabuk darbeleri dal yönünde (küçük ağaçlar)
  function limb(S, pts, w0, w1, o = {}) {
    const k = S.k; const P = [];
    for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (4 * k))); for (let j = 0; j < n; j++) P.push([lerp(ax, bx, j / n), lerp(ay, by, j / n)]); }
    P.push(pts[pts.length - 1]);
    const N = P.map((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; });
    const W = (i) => lerp(w0, w1, Math.pow(i / (P.length - 1), 0.9)) * k;
    const body = new Path2D();
    P.forEach((p, i) => { const q = [p[0] + N[i][0] * W(i) / 2, p[1] + N[i][1] * W(i) / 2]; i ? body.lineTo(...q) : body.moveTo(...q); });
    for (let i = P.length - 1; i >= 0; i--) body.lineTo(P[i][0] - N[i][0] * W(i) / 2, P[i][1] - N[i][1] * W(i) / 2);
    body.closePath();
    const sh = (x, y) => { let bi = 0, bd = 1e18; for (let i = 0; i < P.length; i += 2) { const d = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } } const n = N[bi]; const off = ((x - P[bi][0]) * n[0] + (y - P[bi][1]) * n[1]) / (W(bi) / 2); const lit = n[0] * LX + n[1] * LY; return clamp(0.5 + off * lit * 0.55 - (o.dark ?? 0)); };
    const tang = (x, y) => { let bi = 0, bd = 1e18; for (let i = 0; i < P.length; i += 3) { const d = (P[i][0] - x) ** 2 + (P[i][1] - y) ** 2; if (d < bd) { bd = d; bi = i; } } return Math.atan2(N[bi][0], -N[bi][1]) + (S.r() - 0.5) * 0.12; };
    if (o.rim !== false) S.rim(body, { w: 2.2, alpha: 0.85 });
    S.region(body, { ramp: o.ramp || ['#3A231C', '#523223', '#6C442C', '#8B5C39', '#AA784A'], shade: sh, dir: tang, len: [26, 52], wid: [5, 8], cover: 3, jitter: 3, noise: 0.05, rim: false });
    return body;
  }
  // taç alt kenarının girintilerini kapatan "etek": kolon kolon en alt nokta → kapama (max sonra min süzgeç) → yumuşatma
  function canopySkirt(ctxT, und, x0, x1) {
    const st = 4; const xs = [], ys = []; const pad = 120;
    for (let x = x0 - pad; x <= x1 + pad; x += st) {
      let yb = -1e9;
      for (const [cx, cy, rr] of TREE_LOBES) { const d = Math.abs(x - cx); if (d < rr) yb = Math.max(yb, cy + Math.sqrt(rr * rr - d * d) * 0.97); }
      for (let y = 1120; y > 740; y -= 4) if (ctxT.isPointInPath(und, x, y)) { yb = Math.max(yb, y); break; }
      xs.push(x); ys.push(yb);
    }
    // 1B kapama (önce max, sonra min süzgeç): yalnız pencereden dar girintiler dolar; uçlar -sonsuz dolguyla korunur
    const win = 22; const n = ys.length; const mx = ys.slice(), mn = ys.slice();
    for (let i = 0; i < n; i++) { let m = -1e9; for (let j = Math.max(0, i - win); j <= Math.min(n - 1, i + win); j++) m = Math.max(m, ys[j]); mx[i] = m; }
    for (let i = 0; i < n; i++) { let m = 1e9; for (let j = Math.max(0, i - win); j <= Math.min(n - 1, i + win); j++) m = Math.min(m, mx[j]); mn[i] = Math.max(ys[i], m); }
    const out = []; for (let i = 0; i < n; i++) if (ys[i] > -1e8) out.push([xs[i], mn[i], ys[i]]);
    // yumuşatma (yalnız kapanmış alt kenar)
    return out.map((q, i) => { let s2 = 0, c = 0; for (let j = Math.max(0, i - 3); j <= Math.min(out.length - 1, i + 3); j++) { s2 += out[j][1]; c++; } return [q[0], Math.max(q[2], s2 / c), q[2]]; });
  }
  function paintTree() {
    const { w, h, k } = TREE; const ox = TREE.x, oy = TREE.y;
    const S = Paint.sprite(w * k, h * k, { seed: 901, k }); const r = S.r;
    const X = (x) => (x - ox) * k, Y = (y) => (y - oy) * k; const XY = (pts) => pts.map(([x, y]) => [X(x), Y(y)]);
    const W2 = (x, y) => [x / k + ox, y / k + oy];
    const G = ['#0A3729', '#0F4B35', '#16643E', '#1F7F46', '#2F9A4C', '#55B44F', '#93D052', '#BFE36A'];
    // ---- geometri
    const lobeP = TREE_MASSES.map((M, mi) => M.lobes.map(([x, y, rr], li) => smoothPath(blobPts(X(x), Y(y), rr * k, rr * k * 0.97, 28, 0.04, 70 + mi * 10 + li))));
    const und = smoothPath(orientPts([[-70, 960], [60, 820], [250, 760], [430, 770], [600, 830], [690, 900], [640, 960], [540, 976], [440, 972], [350, 1000], [262, 1052], [130, 1080], [0, 1050]]), true, 0.5);
    const undS = new Path2D(); undS.addPath(und, new DOMMatrix().translate(-ox * k, -oy * k).scale(k));
    const tc = makeCanvas(4, 4).getContext('2d');
    const skirtPts = canopySkirt(tc, und, -250, 830);
    // etek: yalnız girintileri doldurur (üst kenar gerçek alt kenarın 6 px içinde), dışa taşmaz
    const skPoly = orientPts(skirtPts.map(([x, y]) => [X(x), Y(y)]).concat(skirtPts.slice().reverse().map(([x, , y0]) => [X(x), Y(y0 - 6)])));
    const skirt = poly(skPoly);
    const canopy = new Path2D(); lobeP.flat().forEach((q) => canopy.addPath(q)); canopy.addPath(skirt); canopy.addPath(undS);
    const skel = TREE_SKEL.map(([C, w0, w1]) => ribbonGeom(C, w0, w1));
    const skelP = new Path2D(); for (const R of skel) { R.pts.forEach(([x, y], i) => (i ? skelP.lineTo(X(x), Y(y)) : skelP.moveTo(X(x), Y(y)))); skelP.closePath(); }
    // ---- 1) bütün astar kenarları önce (sonraki dolgular iç kısımları örter: ek yerinde turuncu çizgi kalmaz)
    S.rim(canopy, { w: 3 });
    S.x.save(); S.x.beginPath(); S.x.rect(0, Y(1250), S.w, S.h); S.x.clip(); S.rim(skelP, { w: 3 }); S.x.restore();
    // ---- 2) tacın gölgeli alt yüzü: 3 basamaklı koyu yeşil yaprak öbekleri (kenara doğru yansıyan ışıkla biraz açılır)
    const under = new Path2D(); under.addPath(undS); under.addPath(skirt);
    fill(S, under, G[0], { h: 130 });
    const skY = (xw) => { let best = 1e9, by = 1000; for (const [x, y] of skirtPts) { const d = Math.abs(x - xw); if (d < best) { best = d; by = y; } } return by; };
    const leafCluster = (px, py, a, col, n, L0, wd = 9) => { for (let j = 0; j < n; j++) { const aa = a + (j / (n - 1) - 0.5) * 2.5; leaf(S, px + Math.cos(aa) * 7 * k, py + Math.sin(aa) * 7 * k, aa, L0 + r() * 8, wd + r() * 3.5, shade(col, (r() - 0.5) * 0.03)); } };
    {
      const U = []; const bb = [X(-260), Y(740), X(840), Y(1240)];
      for (let i = 0; i < 900; i++) {
        const px = lerp(bb[0], bb[2], r()), py = lerp(bb[1], bb[3], r()); if (!S.x.isPointInPath(under, px, py)) continue;
        const [xw, yw] = W2(px, py); const dEdge = skY(xw) - yw; // alt kenara uzaklık
        const v = clamp(1 - dEdge / 120) * 0.85 + (NOISE(xw * 0.02, yw * 0.02) - 0.5) * 0.5 + (xw < 250 ? 0.1 : 0);
        U.push([v < 0.38 ? 0 : v < 0.72 ? 1 : 2, px, py]);
        if (U.length > 330) break;
      }
      U.sort((p, q) => p[0] - q[0]);
      S.x.save(); S.hx.save(); S.x.clip(under); S.hx.clip(under);
      for (const [ki, px, py] of U) leafCluster(px, py, r() * TAU, G[ki], 4 + r.int(0, 1), 17);
      S.x.restore(); S.hx.restore();
    }
    // ---- 3) gövde + dallar: tek bölge; kesitte basamaklı silindir ışığı, kabuk darbeleri dal yönünde uzun ve ince
    const bark = ['#35201A', '#472B20', '#5B3A28', '#724B31', '#8C5E3C', '#A87649'];
    // taban dolgusu, sonra her dal/gövde boyunca uzun, ince, uçları sivrilen kabuk lifleri (blok/basamak ucu yok)
    fill(S, skelP, bark[2], { h: 150 });
    const barkTone = (R, i, off) => { const n = R.N[i]; const lit = n[0] * LX + n[1] * LY; let v = 0.52 + off * lit * 0.66; const yw = R.P[i][1]; if (yw < 1420) v -= clamp((1420 - yw) / 260) * 0.2; if (yw > 1690) v -= 0.1; return clamp(v); };
    S.x.save(); S.hx.save(); S.x.clip(skelP); S.hx.clip(skelP);
    skel.forEach((R, ri) => {
      const nL = Math.max(5, Math.round(R.W[0] / 5.5)); const segs = []; const np = R.P.length;
      for (let j = 0; j < nL * 2.4; j++) {
        const off = (r() * 2 - 1) * 0.97; const i0 = Math.floor(r() * np * 0.75); const i1 = Math.min(np - 1, i0 + Math.max(4, Math.floor((0.3 + r() * 0.55) * np)));
        const im = (i0 + i1) >> 1; segs.push([barkTone(R, im, off) + (r() - 0.5) * 0.05, off, i0, i1, im]);
      }
      // gövdenin iki kenarında koyu/açık kenar lifleri boydan boya
      segs.push([barkTone(R, np >> 1, 0.9), 0.9, 0, np - 1, np >> 1], [barkTone(R, np >> 1, -0.9), -0.9, 0, np - 1, np >> 1]);
      segs.sort((p2, q2) => p2[0] - q2[0]);
      for (const [v, off, i0, i1, im] of segs) {
        const pts = []; const wob = r() * 10;
        for (let i = i0; i <= i1; i += 2) { const o2 = off + 0.05 * Math.sin(i * 0.25 + wob); pts.push([R.P[i][0] + R.N[i][0] * o2 * R.W[i] / 2, R.P[i][1] + R.N[i][1] * o2 * R.W[i] / 2]); }
        if (pts.length < 2) continue;
        const wd = (R.W[im] / nL) * (1.7 + r() * 0.6);
        S.line(XY(pts), wd * k, shade(bark[clamp(Math.floor(v * bark.length), 0, bark.length - 1)], (r() - 0.5) * 0.02), { rim: false, edge: false, taper: true });
      }
    });
    S.x.restore(); S.hx.restore();
    // ---- 4) taç kütleleri: basamaklı tonlu badem yaprak öbekleri
    TREE_MASSES.forEach((M, mi) => {
      const [mx, my, mr] = M.c;
      const msil = new Path2D(); lobeP[mi].forEach((q) => msil.addPath(q));
      const ms = sph(X(mx - mr * 0.3), Y(my - mr * 0.42), mr * 1.25 * k, 0.0);
      const tone = (px, py) => { let sub = 0.5; for (const [x, y, rr] of M.lobes) { const d = Math.hypot(px / k + ox - x, py / k + oy - y); if (d < rr) { sub = Paint.sphere(x - rr * 0.3, y - rr * 0.4, rr * 1.2, [LX, LY], 0)(px / k + ox, py / k + oy); } } return clamp(ms(px, py) * 0.78 + sub * 0.3 - 0.06 - M.dark); };
      M.tone = tone;
      fill(S, msil, G[1], { h: 135 });
      const area = M.lobes.reduce((acc, [, , rr]) => acc + Math.PI * rr * rr, 0) * 0.8;
      const nC = Math.round((area * k * k) / ((28 * k) ** 2) * 1.5); const C = [];
      const bb = [Infinity, Infinity, -Infinity, -Infinity]; for (const [x, y, rr] of M.lobes) { bb[0] = Math.min(bb[0], X(x - rr)); bb[1] = Math.min(bb[1], Y(y - rr)); bb[2] = Math.max(bb[2], X(x + rr)); bb[3] = Math.max(bb[3], Y(y + rr)); }
      for (let i = 0; i < nC * 1.6 && C.length < nC; i++) {
        const px = lerp(bb[0], bb[2], r()), py = lerp(bb[1], bb[3], r());
        if (!M.lobes.some(([x, y, rr]) => Math.hypot(px / k + ox - x, py / k + oy - y) < rr)) continue;
        const v = tone(px + (NOISE(px * 0.01, py * 0.01) - 0.5) * 22 * k, py) + (r() - 0.5) * 0.05;
        C.push([clamp(Math.floor(v * G.length), 0, G.length - 1) + r() * 0.5, px, py]);
      }
      C.sort((p, q) => p[0] - q[0]);
      S.x.save(); S.hx.save(); S.x.clip(msil); S.hx.clip(msil);
      for (const [kv, px, py] of C) { const ki = Math.floor(kv); leafCluster(px, py, r() * TAU, G[ki], 5 + r.int(0, 2), 19); }
      S.x.restore(); S.hx.restore();
      // kütle kenarında dışa taşan öbekler
      M.lobes.forEach(([x, y, rr], li) => {
        const nE = Math.round(rr / 6);
        for (let i = 0; i < nE; i++) {
          const a = r() * TAU; const wx = x + Math.cos(a) * rr * 0.98, wy = y + Math.sin(a) * rr * 0.98;
          if (M.lobes.some(([x2, y2, r2], j) => j !== li && Math.hypot(wx - x2, wy - y2) < r2 * 0.95)) continue;
          const px = X(wx), py = Y(wy); const ki = clamp(Math.floor(tone(px, py) * G.length), 1, G.length - 1);
          leafCluster(px, py, a + (r() - 0.5) * 0.5, G[ki], 3, 17);
        }
      });
    });
    // taç alt kenarında sarkan koyu yaprak öbekleri: düz alt kenarı ve dalların yaprağa giriş yerini kırar
    for (let i = 0; i < skirtPts.length; i += 5 + r.int(0, 4)) {
      const [x, y] = skirtPts[i]; const px = X(x + (r() - 0.5) * 8), py = Y(y - 3 - r() * 6);
      leafCluster(px, py, Math.PI / 2 + (r() - 0.5) * 1.2, G[1 + r.int(0, 1)], 3 + r.int(0, 1), 17);
    }
    // görünür ışık (en üstteki kütleye göre, 0..1); kütle dışında -1
    const topLit = (wx, wy) => { for (let mi = TREE_MASSES.length - 1; mi >= 0; mi--) { const M = TREE_MASSES[mi]; if (M.lobes.some(([x, y, rr]) => Math.hypot(wx - x, wy - y) < rr * 0.9)) return M.tone(X(wx), Y(wy)); } return -1; };
    // ---- 5) gökyüzü delikleri (tacın içinde): içinden yapraktan çıkıp yaprağa giren çatallı ince dal görünür
    S.x.save(); S.x.globalCompositeOperation = 'destination-out';
    for (const [hx, hy, rx, ry] of TREE_HOLES) S.x.fill(smoothPath(blobPts(X(hx), Y(hy), rx * k, ry * k, 14, 0.22, hx | 0)));
    S.x.restore();
    for (const [hx, hy, rx, ry, ta] of TREE_HOLES) {
      S.rim(smoothPath(blobPts(X(hx), Y(hy), rx * k * 1.04, ry * k * 1.04, 14, 0.22, hx | 0)), { w: 1.2, alpha: 0.6 });
      const c = Math.cos(ta), sn = Math.sin(ta); const L = rx * 1.6;
      const A = [hx - c * L, hy - sn * L + 4], M0 = [hx - c * rx * 0.1, hy - sn * rx * 0.1 + 2], B = [hx + c * L, hy + sn * L - 3];
      S.line(XY([A, M0, B]), 5 * k, '#4A2E22', { w1: 2.6 * k, rim: false, edge: false });
      const F = [M0[0] + c * rx * 0.7 + sn * ry * 1.6, M0[1] + sn * rx * 0.7 - c * ry * 1.6];
      S.line(XY([M0, F]), 3.2 * k, '#4A2E22', { w1: 1.8 * k, rim: false, edge: false });
      // uçlar yaprağa gömülür
      for (const [qx, qy] of [A, B, F]) { const tl = topLit(qx, qy); leafCluster(X(qx), Y(qy), r() * TAU, G[clamp(Math.floor((tl < 0 ? 0.4 : tl) * G.length), 1, G.length - 2)], 4, 17); }
    }
    // ---- 6) çiçek kümeleri: önce kütlelerin ışıklı (sol üst) yüzlerine basamaklı tonlu dolu yığınlar, sonra kenarlarda tek çiçekler
    const PAL = {
      pembe: { d: '#C8508E', m: '#EE78B0', l: '#F7A6CA', h: '#FFE0EE', c: '#B92B6A' },
      beyaz: { d: '#D9B7D3', m: '#F3E3EF', l: '#FFFFFF', h: '#FFFFFF', c: '#F2B52E' },
    };
    const drifts = [];
    const plan = [[0, 10], [1, 10], [2, 7], [3, 3]];
    for (const [mi, nD] of plan) {
      const M = TREE_MASSES[mi]; let got = 0;
      for (let t = 0; t < 400 && got < nD; t++) {
        const [x, y, rr] = M.lobes[r.int(0, M.lobes.length - 1)]; const a = r() * TAU, d = Math.sqrt(r()) * rr * 0.8;
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d; const lit = topLit(px, py);
        if (lit < 0.6) continue;
        if (TREE_HOLES.some(([hx, hy, rx]) => Math.hypot(px - hx, py - hy) < rx + 50)) continue;
        const rx = 24 + r() * 16, ry = rx * (0.62 + r() * 0.16);
        if (drifts.some((q) => Math.hypot(q[0] - px, (q[1] - py) * 1.4) < (q[2] + rx) * 0.95)) continue;
        drifts.push([px, py, rx, ry, mi === 1 || (mi === 3) || r() < 0.3 ? 'beyaz' : 'pembe', r() * 0.6 - 0.3]); got++;
      }
    }
    for (const [px, py, rx, ry, pk, rot] of drifts) {
      const P = PAL[pk]; const D = [];
      // dolu çekirdek, düzensiz kenar: birim diskte örnekle, kenarı gürültüyle yumrula; ton ışık yönüne göre 3 basamak
      const nD = Math.round((rx * ry) / 13);
      for (let j = 0; j < nD * 3 && D.length < nD; j++) {
        const u = r() * 2 - 1, v = r() * 2 - 1; const rr2 = u * u + v * v; const a = Math.atan2(v, u);
        const edge = 0.78 + 0.32 * NOISE(Math.cos(a) * 1.3 + px * 0.05, Math.sin(a) * 1.3 + py * 0.05);
        if (rr2 > edge * edge) continue;
        const t = -(u * LX + v * LY) + (r() - 0.5) * 0.35;
        const ki = t > 0.22 ? 2 : t > -0.3 ? 1 : 0;
        const xx = px + (u * Math.cos(rot) - v * Math.sin(rot)) * rx, yy = py + (u * Math.sin(rot) + v * Math.cos(rot)) * ry;
        D.push([ki + r() * 0.5, xx, yy, ki]);
      }
      D.sort((p2, q2) => p2[0] - q2[0]);
      const cols = [P.d, P.m, P.l];
      for (const [, xx, yy, ki] of D) {
        const wd = 7 + r() * 3.5; Paint.drawStroke(S, X(xx), Y(yy), r() * TAU, wd * (1.05 + r() * 0.35) * k, wd * k, ki === 2 && r() < 0.25 ? P.h : shade(cols[ki], (r() - 0.5) * 0.03), { dry: 0.05 });
      }
      // kenarda ve ışık yanında birkaç belirgin tek çiçek
      const nf = 3 + r.int(0, 3);
      for (let j = 0; j < nf; j++) { const a = Math.PI * 1.1 + (r() - 0.5) * 2.6; const d = 0.55 + r() * 0.5; const fx = px + Math.cos(a) * rx * d, fy = py + Math.sin(a) * ry * d; if (topLit(fx, fy) < 0) continue; blossom(S, X(fx), Y(fy), (5.2 + r() * 2.4) * k, r() < 0.6 ? P.l : P.m, P.c, 5, P.d); }
      // alt kenarı örten birkaç yaprak: yığın yaprakların arasından çıkar
      for (let j = 0; j < 2; j++) { const a = 0.4 + r() * 1.3; const fx = px + Math.cos(a) * rx * 0.85, fy = py + Math.sin(a) * ry * 0.85; const tl = topLit(fx, fy); if (tl < 0) continue; leafCluster(X(fx), Y(fy), a, G[clamp(Math.floor(tl * G.length) - 1, 1, G.length - 2)], 3, 16); }
    }
    // taç kenarında (ışıklı yüzlerde) tek tük çiçekler
    for (let i = 0, got = 0; i < 900 && got < 38; i++) {
      const [x, y, rr] = TREE_LOBES[r.int(0, TREE_LOBES.length - 1)]; const a = r() * TAU; const px = x + Math.cos(a) * rr * 0.93, py = y + Math.sin(a) * rr * 0.93;
      const lit = topLit(px, py); if (lit < 0.5) continue;
      if (TREE_LOBES.some(([x2, y2, r2]) => (x2 !== x || y2 !== y) && Math.hypot(px - x2, py - y2) < r2 * 0.88)) continue;
      const P = r() < 0.5 ? PAL.pembe : PAL.beyaz; blossom(S, X(px), Y(py), (5.5 + r() * 2.5) * k, r() < 0.6 ? P.l : P.m, P.c, 5, P.d); got++;
      if (r() < 0.5) blossom(S, X(px + 10 + r() * 6), Y(py + 6 - r() * 12), (4.5 + r() * 2) * k, P.m, P.c, 5, P.d);
    }
    // ---- 7) gövde dibinde çimen (tümseğin gölgeli tonları)
    for (let i = 0; i < 90; i++) { const x = 190 + r() * 230, y = 1704 + r() * 16; leaf(S, X(x), Y(y), -Math.PI / 2 + (r() - 0.5) * 0.9, 16 + r() * 14, 4 + r() * 2, r() < 0.5 ? '#0F5C3E' : '#187244'); }
    return { canvas: S.finish({ emboss: 0.5 }), px: X(TREE.base[0]), py: Y(TREE.base[1]), k };
  }
  defSprite('agac-buyuk', paintTree);

  // ---------------------------------------------------------------- 9. küçük bahçe ağaçları
  // üç ayrı siluet: nar = dik oval taç, iki gövdeli; çiçek = geniş yuvarlak taç, çatallı gövde; yeşil = sağa yatık, eğik gövde
  const SMALL_TREES = {
    nar: { lobes: [[0, -196, 40], [-28, -164, 40], [26, -160, 42], [-2, -132, 46], [-34, -112, 32], [34, -110, 32], [4, -224, 26]], light: [-20, -200, 130],
      limbs: [[[[-6, 4], [-10, -46], [-20, -96], [-28, -136]], 14, 6], [[[6, 4], [10, -50], [18, -100], [24, -150]], 14, 6], [[[0, -60], [2, -110], [0, -170]], 8, 4]] },
    cicek: { lobes: [[-56, -116, 44], [52, -120, 46], [0, -146, 56], [-82, -92, 28], [80, -90, 30], [0, -104, 50], [-30, -160, 36], [34, -158, 34]], light: [-30, -170, 160],
      limbs: [[[[0, 4], [-2, -50], [2, -86]], 20, 12], [[[0, -70], [-26, -98], [-50, -122]], 10, 5], [[[2, -76], [28, -104], [52, -126]], 10, 5]] },
    yesil: { lobes: [[-24, -122, 42], [28, -156, 54], [72, -116, 40], [-52, -96, 28], [12, -108, 46], [84, -86, 24], [60, -168, 30]], light: [-10, -180, 150],
      limbs: [[[[-6, 4], [2, -46], [16, -90], [26, -120]], 19, 10], [[[12, -80], [46, -104], [70, -120]], 9, 4]] },
  };
  function paintSmallTree(kind, seed) {
    const k = 1.5, w = 240, h = 270; const S = Paint.sprite(w * k, h * k, { seed, k }); const r = S.r; const T = SMALL_TREES[kind];
    const bx = 120 * k, by = 258 * k; const X = (x) => bx + x * k, Y = (y) => by + y * k;
    fill(S, ellipsePath(X(14), Y(1), 66 * k, 8 * k), '#1F5A36', { h: 135 }); // opak gölge
    for (const [pts, w0, w1] of T.limbs) limb(S, pts.map(([x, y]) => [X(x), Y(y)]), w0, w1, { rim: false });
    for (const sg of [-1, 1]) S.line([[X(sg * 3), Y(-6)], [X(sg * 14), Y(2)]], 6 * k, '#523223', { w1: 2 * k, rim: false, edge: false });
    const lobes = T.lobes;
    const lp = lobes.map(([x, y, rr], i) => smoothPath(blobPts(X(x), Y(y), rr * k, rr * k * 0.96, 22, 0.05, seed + i)));
    const sil = new Path2D(); lp.forEach((q) => sil.addPath(q));
    S.rim(sil, { w: 2.4 }); fill(S, sil, '#11523A', { h: 140 });
    const G = kind === 'yesil' ? ['#0F4A35', '#176240', '#22804A', '#35A050', '#62BC52', '#9AD450'] : ['#0F4A35', '#176240', '#22804A', '#349C4E', '#5CB650', '#8ECC4E'];
    const big = sph(X(T.light[0]), Y(T.light[1]), T.light[2] * k, 0.05);
    lobes.forEach(([x, y, rr], li) => {
      const cx = X(x), cy = Y(y), R = rr * k; const lpp = lp[li];
      const loc = sph(cx - R * 0.25, cy - R * 0.35, R * 1.15, 0);
      const f = (px, py) => clamp(loc(px, py) * 0.6 + big(px, py) * 0.5 - 0.05);
      fill(S, lpp, G[2], { h: 145 });
      const n = Math.round((R * R * 3.1) / (16 * 8 * k * k) * 1.6); const L = [];
      for (let i = 0; i < n; i++) { const a = r() * TAU, d = Math.sqrt(r()) * R; const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d; const ki = clamp(Math.floor((f(px, py) + (r() - 0.5) * 0.08) * G.length), 0, G.length - 1); L.push([ki + r() * 0.3, px, py, a, ki]); }
      L.sort((p, q) => p[0] - q[0]);
      S.x.save(); S.hx.save(); S.x.clip(lpp); S.hx.clip(lpp);
      for (const [, px, py, a, ki] of L) leaf(S, px, py, a + (r() - 0.5) * 1.1, 15 + r() * 9, 7 + r() * 3, shade(G[ki], (r() - 0.5) * 0.04));
      S.x.restore(); S.hx.restore();
      for (let i = 0; i < R / (5 * k); i++) { const a = r() * TAU; const px = cx + Math.cos(a) * R * 0.97, py = cy + Math.sin(a) * R * 0.97; if (lobes.some(([x2, y2, r2], j) => j !== li && Math.hypot(px / k - bx / k - x2, py / k - by / k - y2) < r2 * 0.92)) continue; const ki = clamp(Math.floor(f(px, py) * G.length), 1, G.length - 1); leaf(S, px, py, a + (r() - 0.5) * 0.8, 14 + r() * 8, 6 + r() * 3, G[ki]); }
    });
    if (kind === 'nar') {
      const fr = [[-30, -118], [-6, -150], [24, -126], [30, -170], [-26, -178], [6, -206], [36, -104], [-38, -146], [0, -112], [18, -190], [-14, -90]];
      for (const [dx, dy] of fr) pomegranate(S, X(dx), Y(dy), 9.5 * k);
    }
    if (kind === 'cicek') {
      for (let i = 0; i < 70; i++) {
        const [x, y, rr] = lobes[r.int(0, lobes.length - 1)]; const a = r() * TAU, d = Math.sqrt(r()) * rr * 0.9; const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (big(X(px), Y(py)) < 0.35 && r() < 0.7) continue;
        blossom(S, X(px), Y(py), (6 + r() * 3) * k, r() < 0.75 ? '#FFFFFF' : '#FBE0EC', '#F2B52E', 5, '#EED3E5');
      }
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: bx, py: by, k };
  }
  defSprite('agac-kucuk-1', () => paintSmallTree('nar', 1001));
  defSprite('agac-kucuk-2', () => paintSmallTree('cicek', 1002));
  defSprite('agac-kucuk-3', () => paintSmallTree('yesil', 1003));

  // ---------------------------------------------------------------- 10. düşen yapraklar ve çiçek taneleri
  function paintLeaf(seed, base, vein) {
    const k = 2, s = 90; const S = Paint.sprite(s * k, s * k, { seed, k }); const r = S.r; const c = (s / 2) * k;
    const len = 62 * k, wid = 30 * k; const ang = -0.6;
    S.x.save(); S.hx.save(); S.x.translate(c, c); S.x.rotate(ang); S.hx.translate(c, c); S.hx.rotate(ang);
    const p = new Path2D(); p.moveTo(-len / 2, 0); p.bezierCurveTo(-len * 0.3, -wid * 0.62, len * 0.25, -wid * 0.58, len / 2, 0); p.bezierCurveTo(len * 0.25, wid * 0.58, -len * 0.3, wid * 0.62, -len / 2, 0); p.closePath();
    S.x.setTransform(1, 0, 0, 1, 0, 0); S.hx.setTransform(1, 0, 0, 1, 0, 0);
    S.x.restore(); S.hx.restore();
    const m = new DOMMatrix().translate(c, c).rotate((ang * 180) / Math.PI); const lp = new Path2D(); lp.addPath(p, m);
    S.rim(lp, { w: 1.6, alpha: 0.8 });
    const R = ramp(base, 5, { span: 0.34 });
    // iki yarı: üst yarı ışıklı, alt yarı gölgeli (basamaklı)
    S.region(lp, { ramp: R, shade: (x, y) => { const dx = x - c, dy = y - c; const side = -dx * Math.sin(ang) + dy * Math.cos(ang); return side < 0 ? 0.78 : 0.38; }, dir: (x, y) => { const dx = x - c, dy = y - c; const side = -dx * Math.sin(ang) + dy * Math.cos(ang); return ang + (side < 0 ? -0.6 : 0.6); }, len: [10, 18], wid: [5, 8], cover: 3, rim: false, jitter: 0, noise: 0.04 });
    // orta damar ve sap
    const a = [c - Math.cos(ang) * len * 0.62, c - Math.sin(ang) * len * 0.62], b = [c + Math.cos(ang) * len * 0.42, c + Math.sin(ang) * len * 0.42];
    S.line([a, [c, c], b], 2.2 * k, vein, { w1: 1 * k, rim: false, edge: false });
    for (const t of [-0.25, 0, 0.22]) { const px = c + Math.cos(ang) * len * t, py = c + Math.sin(ang) * len * t; for (const sg of [-1, 1]) S.line([[px, py], [px + Math.cos(ang + sg * 0.9) * wid * 0.36, py + Math.sin(ang + sg * 0.9) * wid * 0.36]], 1.1 * k, vein, { rim: false, edge: false, taper: true }); }
    return { canvas: S.finish({ emboss: 0.5 }), px: c, py: c, k };
  }
  defSprite('yaprak-1', () => paintLeaf(1101, '#3DA552', '#1E6B3A'));
  defSprite('yaprak-2', () => paintLeaf(1102, '#7DC34A', '#3E8A35'));
  defSprite('yaprak-3', () => paintLeaf(1103, '#EDC23A', '#B07A1E'));
  defSprite('yaprak-4', () => paintLeaf(1104, '#A0623A', '#5E3420'));
  function paintPetal(kind, seed) {
    const k = 2, s = 48; const S = Paint.sprite(s * k, s * k, { seed, k }); const c = (s / 2) * k; const r = S.r;
    if (kind === 'cicek') {
      for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i / 5) * TAU; const pp = ellipsePath(c + Math.cos(a) * 9 * k, c + Math.sin(a) * 9 * k, 9 * k, 7 * k, a); S.rim(pp, { w: 1, alpha: 0.6 }); S.region(pp, { ramp: ['#F07BB2', '#F7A9CB', '#FBD3E4', '#FFF6FA'], shade: (x, y) => clamp(1 - Math.hypot(x - c, y - c) / (17 * k) + (c - x + c - y) / (60 * k)), dir: a, dirJit: 0.3, len: [6, 9], wid: [3, 5], cover: 3, rim: false, jitter: 0 }); }
      fill(S, circ(c, c, 4 * k), '#F2B52E', { h: 200 }); S.x.fillStyle = '#C2306F'; for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; S.x.beginPath(); S.x.arc(c + Math.cos(a) * 4.5 * k, c + Math.sin(a) * 4.5 * k, 0.9 * k, 0, TAU); S.x.fill(); }
    } else {
      const col = kind === 'pembe' ? ['#E0609D', '#F07BB2', '#F59AC4', '#F9C2DA'] : ['#E8DDEB', '#F4EEF5', '#FCF9FC', '#FFFFFF'];
      const pp = new Path2D(); pp.moveTo(c, c + 16 * k); pp.bezierCurveTo(c - 15 * k, c + 4 * k, c - 13 * k, c - 14 * k, c - 3 * k, c - 15 * k); pp.quadraticCurveTo(c, c - 11 * k, c + 3 * k, c - 15 * k); pp.bezierCurveTo(c + 13 * k, c - 14 * k, c + 15 * k, c + 4 * k, c, c + 16 * k); pp.closePath();
      S.rim(pp, { w: 1, alpha: 0.6 });
      S.region(pp, { ramp: col, shade: (x, y) => clamp(0.95 - (y - (c - 15 * k)) / (40 * k) - (x - c) / (60 * k)), dir: -Math.PI / 2, dirJit: 0.5, len: [8, 14], wid: [4, 6], cover: 3, rim: false, jitter: 0 });
      S.line([[c, c + 14 * k], [c, c - 4 * k]], 1.2 * k, kind === 'pembe' ? '#C94A88' : '#D7C6DC', { rim: false, edge: false, taper: true });
    }
    return { canvas: S.finish({ emboss: 0.5 }), px: c, py: c, k };
  }
  defSprite('cicek-tane-1', () => paintPetal('pembe', 1201));
  defSprite('cicek-tane-2', () => paintPetal('beyaz', 1202));
  defSprite('cicek-tane-3', () => paintPetal('cicek', 1203));

  // ---------------------------------------------------------------- dışa açılan bilgi
  // Paralaks değerleri scenes/ortak.js camPar(cam, p) ile ayarlıdır: yakın planda (z 1.6–1.8, adamın üzerinde)
  // uzak/orta tepeler vadinin üstünde görünür kalır, güneş kadraj dışına çıkar, bulutlar ufkun üstünde kalır.
  const layers = [
    { name: 'gok-sabah', x: SKY.x, y: SKY.y, parallax: 0.55, dusk: 'gok-aksam' },
    { name: 'gunes', x: SUN[0], y: SUN[1], parallax: 0.55 },
    { name: 'bulut-3', x: 820, y: 250, parallax: 0.57, dusk: 'bulut-3-aksam' },
    { name: 'bulut-2', x: 560, y: 470, parallax: 0.6, dusk: 'bulut-2-aksam' },
    { name: 'bulut-1', x: 880, y: 590, parallax: 0.62, dusk: 'bulut-1-aksam' },
    { name: 'tepe-uzak', x: FAR.x, y: FAR.y, parallax: 0.66 },
    { name: 'tepe-orta', x: MID.x, y: MID.y, parallax: 0.73 },
    { name: 'vadi', x: VAL.x, y: VAL.y, parallax: 0.8 },
    { name: 'tumsek', x: KNOLL.x, y: KNOLL.y, parallax: 1 },
    { name: 'agac-buyuk', x: TREE.base[0], y: TREE.base[1], parallax: 1 },
  ];
  const spots = { nar: SPOTS.nar, bugday: SPOTS.bugday, uzum: SPOTS.uzum, nehir: SPOTS.nehir, cicek: SPOTS.cicek, kovan: SPOTS.kovan, koy: SPOTS.koy };
  const spotPar = { nar: 0.8, bugday: 0.8, uzum: 0.8, nehir: 0.8, cicek: 1, kovan: 0.8, koy: 0.8 };
  // nehrin dünya sınır kutusu [x0, y0, x1, y1] (parıltı darbeleri için)
  const riverBBox = (() => { const { L, R } = riverGeom(); const all = L.concat(R); return [Math.floor(Math.min(...all.map((q) => q[0]))), Math.floor(Math.min(...all.map((q) => q[1]))), Math.ceil(Math.max(...all.map((q) => q[0]))), Math.ceil(Math.max(...all.map((q) => q[1])))]; })();
  // İsteğe bağlı: ufka sabitlenmiş paralaks kamerası. Katmanların ufku/kaçış noktası aynı ekran yerinde kalır,
  // yalnız ölçek derinlikle değişir (z^p). Geniş planda (z=1, merkez 540,960) camPar ile aynıdır; yakın planda
  // vadi gökyüzünün üstüne "tırmanmaz". Dönüş: {x, y, z, r} — camApply ile kullanılır.
  function layerCam(cam, p, o = {}) {
    const hz = o.horizon ?? 1000, vx = o.vx ?? 540; const z = Math.exp(Math.log(cam.z) * p);
    return { x: vx - ((vx - cam.x) * cam.z) / z, y: hz - ((hz - cam.y) * cam.z) / z, z, r: cam.r || 0 };
  }
  return {
    layers, spots, spotPar, man: [430, 1640], manLayer: 'agac-buyuk',
    riverPath: () => riverPathWorld(), riverFlow, riverSample, riverBBox, riverCenter: RIVER_C,
    knollTop, layerCam, sun: SUN, horizon: 1000, skyHorizon: 880,
    treeBase: TREE.base, canopy: { x0: -272, y0: 458, x1: 812, y1: 1232 },
  };
})();
window.MANZARA = MANZARA; // sahneler window.MANZARA üzerinden okur (üst düzey const window'a bağlanmaz)
