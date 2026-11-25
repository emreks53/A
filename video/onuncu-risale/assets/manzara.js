// Manzara (Perde 1 ve 3): sabah/akşam göğü, güneş, bulutlar, tepeler, vadi, tümsek, büyük ağaç,
// küçük bahçe ağaçları, düşen yapraklar ve çiçek taneleri.
// Dünya koordinatı = kamera zoom 1'de ekran pikseli (1080×1920), sol üst köken.
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
      Paint.drawStroke(S, x, y, dirf(x, y), lerp(lenA, lenB, r()) * k * sz, lerp(widA, widB, r()) * k * sz, col, { dry: o.dry ?? 0.15, alpha: o.alpha, height: o.height });
    }
    if (o.clip) { S.x.restore(); S.hx.restore(); }
    return list.length;
  }
  // kavisli darbe (bulut kemerleri): merkez (cx,cy), yarıçap rr, açı a0→a1, genişlik wid
  function arc(S, cx, cy, rr, a0, a1, wid, col, o = {}) {
    const r = S.r, ctx = S.x, hx = S.hx; const ro = rr + wid / 2, ri = Math.max(1, rr - wid / 2);
    const p = new Path2D();
    p.arc(cx, cy, ro, a0, a1);
    const tx = cx + Math.cos(a1) * rr, ty = cy + Math.sin(a1) * rr;
    p.lineTo(tx + Math.cos(a1 + 1.4) * wid * 0.2, ty + Math.sin(a1 + 1.4) * wid * 0.2);
    p.arc(cx, cy, ri, a1 - 0.02, a0 + 0.02, true);
    p.closePath();
    ctx.save(); ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = col; ctx.fill(p); ctx.clip(p);
    const n = Math.max(3, Math.round(wid / 2.5));
    for (let i = 0; i < n; i++) {
      const rad = ri + ((i + 0.5) / n) * (ro - ri);
      ctx.globalAlpha = 0.08 + r() * 0.14; ctx.strokeStyle = shade(col, r() < 0.5 ? 0.06 : -0.06); ctx.lineWidth = 0.6 + r() * 0.8;
      ctx.beginPath(); ctx.arc(cx, cy, rad, a0 + (a1 - a0) * r() * 0.2, a1 - (a1 - a0) * r() * 0.2); ctx.stroke();
    }
    ctx.restore();
    hx.save(); const g = 130 + Math.floor(r() * 30); hx.fillStyle = `rgb(${g},${g},${g})`; hx.fill(p); hx.strokeStyle = `rgb(${g + 70},${g + 70},${g + 70})`; hx.lineWidth = 1.2; hx.stroke(p); hx.restore();
  }

  // ---------------------------------------------------------------- 1. sabah / akşam göğü
  const SKY = { x: -200, y: -300, w: 1480, h: 1500 };
  const SUN = [820, 330];
  function paintSky(kind) {
    const { w, h } = SKY; const ox = SKY.x, oy = SKY.y;
    const S = Paint.sprite(w, h, { seed: kind === 'aksam' ? 311 : 101, k: 1 }); const r = S.r;
    // kuşaklar: [dünya y, renk] — y'ye göre basamaklı ton
    const bands = kind === 'aksam'
      ? [[-300, '#16163F'], [-60, '#1C1B4F'], [90, '#26245E'], [220, '#33306C'], [340, '#463A79'], [450, '#5F4682'], [550, '#7D5087'], [640, '#A05D84'], [715, '#C46C7B'], [780, '#E07F70'], [835, '#F09A6C'], [880, '#F7BC7E'], [940, '#FAD69A']]
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
      // batmış güneşin parıltısı: sağda ufka yakın sıcak yatay şeritler
      const gx = 920 - ox, gy = 900 - oy; const cols = ['#FFEDB8', '#FDD796', '#F8BD7E', '#F1A072', '#E2837A', '#C76E80'];
      const L2 = [];
      for (let i = 0; i < 260; i++) {
        const u = Math.pow(r(), 0.75); const a = Math.PI + r() * Math.PI; const x = gx + Math.cos(a) * u * 640, y = gy + Math.sin(a) * u * 300;
        L2.push([u, x, y]);
      }
      L2.sort((a, b) => b[0] - a[0]);
      for (const [u, x, y] of L2) stroke(S, x, y, (r() - 0.5) * 0.08, 90 + r() * 170, 12 + r() * 14, cols[Math.min(5, Math.floor(u * 6 + (r() - 0.5) * 0.8))]);
      // yukarıda birkaç ince, ışık almış bulut şeridi
      for (let i = 0; i < 26; i++) { const y = 420 - oy + r() * 260, x = 120 - ox + r() * 900; stroke(S, x, y, (r() - 0.5) * 0.05, 120 + r() * 200, 8 + r() * 8, r() < 0.5 ? '#E79A8E' : '#C77B93'); }
    } else {
      // güneş halesi: güneşin çevresinde karışık yönlü, iri, kısa mavi darbeler (kaynak resimdeki gibi)
      const sx = SUN[0] - ox, sy = SUN[1] - oy; const R0 = 96, R1 = 310;
      const hal = ['#1D46A4', '#2350AE', '#2A60BB', '#3474C8', '#478DD5', '#62A7E0', '#82BDE8', '#A5D2F0', '#C6E4F5'];
      const list = [];
      for (let i = 0; i < 620; i++) {
        const a = r() * TAU; const u = r();
        const edge = R1 * (0.8 + 0.34 * NOISE(Math.cos(a) * 1.6 + 5, Math.sin(a) * 1.6 + 5));
        const d = R0 + Math.pow(u, 1.05) * (edge - R0);
        const x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * 0.95;
        const t = 1 - (d - R0) / (edge - R0); // 1: güneş yanı, 0: dış kenar
        // dış kenarda yerel gök tonuna in (sert sınır olmasın)
        const local = sf(x, y) * n; const skyK = local < 3.2 ? 1 : local < 4.4 ? 2 : 3;
        let ki = Math.round(lerp(skyK, hal.length - 1, Math.pow(clamp(t + (r() - 0.5) * 0.5), 0.9)));
        if (r() < 0.14) ki = r.int(0, 2); // koyu kobalt karışımı
        const ang = a + Math.PI / 2 + (r() - 0.5) * 2.4;
        list.push([ki + r() * 0.8, x, y, ang, 46 + r() * 56, 20 + r() * 14, clamp(ki, 0, hal.length - 1)]);
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
    field(S, { bbox: [c - R - 10, c - R - 10, c + R + 10, c + R + 10], clip: disk, mask: (x, y) => Math.hypot(x - c, y - c) > R * 0.6,
      ramp: ['#F1BA22', '#F7CB2B', '#FAD83B', '#FCE35A'], shade: Paint.sphere(c - 20, c - 26, R * 1.25, [LX, LY], 0.4),
      dir: (x, y) => Math.atan2(y - c, x - c) + Math.PI / 2 + (S.r() - 0.5) * 0.4, len: [40, 70], wid: [14, 20], count: 110, noise: 0.05 });
    // iç krem disk: geniş çapraz düz darbeler (eşmerkezli değil)
    const inner = smoothPath(blobPts(c - 3, c - 3, R * 0.74, R * 0.73, 32, 0.03, 9));
    fill(S, inner, '#FCF2CC');
    field(S, { bbox: [c - R, c - R, c + R, c + R], clip: inner, ramp: ['#F9EDB4', '#FCF3CD', '#FEF8E2', '#FFFCF0'], shade: Paint.sphere(c - 26, c - 30, R, [LX, LY], 0.5),
      dir: -0.7, dirJit: 0.5, len: [50, 90], wid: [20, 30], count: 40, noise: 0.05, dry: 0.05, height: false });
    return { canvas: S.finish({ emboss: 0.35 }), px: c, py: c, k: S.k };
  }
  defSprite('gunes', paintSun);

  // ---------------------------------------------------------------- 3. bulutlar
  // bumps: [cx, cy, r] (taban çizgisi y=0; yukarı negatif). Katlar: lavanta siluet → gölge kremi →
  // beyaz puf (sol üste kaymış, sağ altta lavanta hilal bırakır) → beyaz kemer darbeleri → düz lavanta taban.
  function paintCloud(seed, wc, bumps, baseH) {
    const pad = 26; const minX = -wc / 2 - pad, maxX = wc / 2 + pad;
    let minY = 0; for (const [, cy, rr] of bumps) minY = Math.min(minY, cy - rr);
    minY -= pad; const maxY = pad;
    const w = Math.ceil(maxX - minX), h = Math.ceil(maxY - minY);
    const S = Paint.sprite(w, h, { seed, k: 1 }); const r = S.r;
    const X = (x) => x - minX, Y = (y) => y - minY;
    const sil = new Path2D();
    for (const [cx, cy, rr] of bumps) sil.addPath(circ(X(cx), Y(cy), rr));
    sil.addPath(rectPath(X(-wc / 2), Y(-baseH), wc, baseH, baseH / 2));
    S.rim(sil, { w: 2.4, alpha: 0.85 });
    fill(S, sil, '#A9A3CF');
    field(S, { bbox: [0, 0, w, h], clip: sil, ramp: ['#9891C4', '#A49ECD', '#B0AAD6', '#BBB6DD'], shade: Paint.grad(0, Y(minY + pad), 0, Y(0), 0.9, 0.1), dir: 0, dirJit: 0.12, len: [50, 100], wid: [12, 18], cover: 2.2, noise: 0.06 });
    const order = bumps.slice().sort((a, b) => a[1] - b[1]);
    for (const [cx, cy, rr] of order) {
      const pr = rr * 0.86, pcx = X(cx - rr * 0.05), pcy = Y(cy + rr * 0.1);
      const puff = smoothPath(blobPts(pcx, pcy, pr, pr * 0.97, 28, 0.025, seed + Math.round(cx * 3)));
      fill(S, puff, '#C8C3E4', { h: 140 });
      S.x.save(); S.hx.save(); S.x.clip(puff); S.hx.clip(puff);
      const wx = pcx - pr * 0.13, wy = pcy - pr * 0.17, wr = pr * 0.86;
      fill(S, circ(wx, wy, wr), '#ECEBF7', { h: 150 });
      fill(S, circ(wx - pr * 0.1, wy - pr * 0.1, wr * 0.8), '#FAFAFD', { h: 158 });
      // tek geniş beyaz kemer (kaynak resimdeki tarak kabuğu), altında ince lavanta gölge
      const ac = [pcx - pr * 0.08, pcy + pr * 0.36];
      arc(S, ac[0], ac[1], pr * 0.62, Math.PI + 0.42, TAU - 0.62, pr * 0.075, '#D5D2EC', { alpha: 0.8 });
      arc(S, ac[0], ac[1] - pr * 0.05, pr * 0.84, Math.PI + 0.3, TAU - 0.55, pr * 0.24, '#FFFFFF');
      // birkaç teğet doku darbesi
      field(S, { bbox: [pcx - pr, pcy - pr, pcx + pr, pcy + pr * 0.4], mask: (x, y) => Math.hypot(x - pcx, y - pcy) < pr * 0.75,
        ramp: ['#EEEDF8', '#F8F8FC', '#FFFFFF'], shade: sph(pcx - pr * 0.2, pcy - pr * 0.3, pr * 1.1, 0.2), dir: (x, y) => Math.atan2(y - ac[1], x - ac[0]) + Math.PI / 2, len: [pr * 0.5, pr * 0.8], wid: [10, 14], count: Math.round(pr / 12), noise: 0.05, height: false });
      S.x.restore(); S.hx.restore();
    }
    // düz lavanta taban şeridi
    S.x.save(); S.hx.save(); S.x.clip(sil); S.hx.clip(sil);
    const bt = Y(-baseH * 0.5);
    fill(S, rectPath(0, bt, w, h - bt), '#9E98C9', { h: 140 });
    field(S, { bbox: [0, bt, w, Y(0) + 6], ramp: ['#938CC0', '#9E98C9', '#A8A2D0'], shade: Paint.cst(0.5), dir: 0, dirJit: 0.04, len: [60, 130], wid: [8, 12], cover: 1.6, noise: 0.4 });
    // pufların alt kenarında ince açık sırt
    S.x.globalAlpha = 0.7; S.x.fillStyle = '#C3BEE2'; S.x.fillRect(0, bt - 2, w, 3);
    S.x.restore(); S.hx.restore();
    return { canvas: S.finish({ emboss: 0.4 }), px: X(0), py: Y(0), k: S.k };
  }
  defSprite('bulut-1', () => paintCloud(401, 420, [[-150, -26, 42], [-88, -52, 60], [-8, -82, 82], [86, -58, 62], [156, -30, 42], [30, -36, 48]], 46));
  defSprite('bulut-2', () => paintCloud(402, 300, [[-104, -24, 36], [-44, -54, 56], [36, -62, 58], [104, -28, 38]], 38));
  defSprite('bulut-3', () => paintCloud(403, 520, [[-200, -26, 42], [-128, -56, 62], [-38, -94, 88], [66, -80, 76], [152, -52, 60], [214, -26, 38], [-80, -36, 52], [100, -34, 48]], 50));

  const layers = [
    { name: 'gok-sabah', x: SKY.x, y: SKY.y, parallax: 0.15 },
    { name: 'gunes', x: SUN[0], y: SUN[1], parallax: 0.15 },
    { name: 'bulut-1', x: 210, y: 300, parallax: 0.2 },
    { name: 'bulut-2', x: 600, y: 520, parallax: 0.22 },
    { name: 'bulut-3', x: 860, y: 700, parallax: 0.25 },
  ];
  return { layers, man: [430, 1640], manLayer: 'agac-buyuk', SKY, SUN };
})();
