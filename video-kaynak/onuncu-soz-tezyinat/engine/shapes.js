/* Ortak çizim öğeleri (Kurzgesagt tarzı düz vektör + yumuşak gradyan + ışıma).
 * Hepsi yerel koordinatta (0,0) merkezli çizer; konum/ölçek için E.at(...) kullanın.
 * Renk parametreleri hex ('#RRGGBB'). Rastgelelik yok: seed parametreleri belirlenimlidir.
 */
(function () {
  'use strict';
  const S = (window.S = {});
  const TAU = Math.PI * 2;

  /** Yaprak/taç yaprağı yolu: +y yönünde (0,0)→(0,len) uzanır. w: genişlik, tip: uç sivriliği 0..1 */
  S.petalPath = (len, w, tip = 0.5, notch = 0) => {
    const p = new Path2D();
    p.moveTo(0, 0);
    p.bezierCurveTo(w * 0.9, len * 0.18, w * (1.05 - tip * 0.3), len * (0.75 - tip * 0.1), notch ? w * 0.18 : 0, len);
    if (notch) { p.quadraticCurveTo(0, len * (1 - notch), -w * 0.18, len); }
    p.bezierCurveTo(-w * (1.05 - tip * 0.3), len * (0.75 - tip * 0.1), -w * 0.9, len * 0.18, 0, 0);
    p.closePath();
    return p;
  };
  /** Yaprak (orta damarlı) */
  S.leaf = (ctx, len, w, col = '#3FA36B', opts = {}) => {
    const path = S.petalPath(len, w, 0.75);
    const g = ctx.createLinearGradient(-w, 0, w, len * 0.3);
    g.addColorStop(0, E.shade(col, 0.18)); g.addColorStop(0.5, col); g.addColorStop(1, E.shade(col, -0.28));
    ctx.fillStyle = g; ctx.fill(path);
    // yarı gölge (Kurzgesagt iki ton)
    ctx.save(); ctx.clip(path); ctx.fillStyle = E.rgba(E.shade(col, -0.45), 0.28); ctx.fillRect(0, 0, w * 1.2, len * 1.1); ctx.restore();
    if (opts.vein !== false) {
      ctx.strokeStyle = E.rgba(E.shade(col, 0.45), 0.55); ctx.lineWidth = Math.max(1, w * 0.06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, len * 0.06); ctx.quadraticCurveTo(w * 0.05, len * 0.5, 0, len * 0.9); ctx.stroke();
    }
  };

  /**
   * Çiçek. opts: { type:'blossom'|'daisy'|'tulip'|'rose'|'peony'|'lotus'|'poppy', r, open(0..1), col, col2, center, rot, seed, petals, lift(0..1 taç yaprak düşmesi), glow }
   * open=0 → tomurcuk, 1 → tam açık. Taç yaprakları ölçeklenip döner.
   */
  S.flower = (ctx, o = {}) => {
    const type = o.type || 'blossom', r = o.r || 60, open = o.open === undefined ? 1 : o.open;
    const col = o.col || '#F6A5B3', col2 = o.col2 || E.shade(col, -0.25), cen = o.center || '#FFD36E';
    const seed = o.seed || 1, rot = o.rot || 0;
    ctx.save(); ctx.rotate(rot);
    if (o.glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 2.2, [[0, o.glow, 0.45], [1, o.glow, 0]]); ctx.fillRect(-r * 2.2, -r * 2.2, r * 4.4, r * 4.4); ctx.restore(); }
    const petal = (ang, len, w, c1, c2, tip = 0.5, notch = 0, curl = 0) => {
      ctx.save(); ctx.rotate(ang);
      const path = S.petalPath(len, w, tip, notch);
      const g = ctx.createLinearGradient(0, 0, 0, len);
      g.addColorStop(0, c2); g.addColorStop(0.55, c1); g.addColorStop(1, E.shade(c1, 0.22));
      ctx.fillStyle = g; ctx.fill(path);
      // kenar ışığı
      ctx.save(); ctx.clip(path); ctx.fillStyle = E.rgba('#ffffff', 0.13 + curl * 0.1); ctx.beginPath(); ctx.ellipse(-w * 0.35, len * 0.62, w * 0.35, len * 0.42, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.restore();
    };
    if (type === 'blossom' || type === 'daisy' || type === 'poppy') {
      const n = o.petals || (type === 'daisy' ? 14 : 5);
      const len = r * (type === 'daisy' ? 1.0 : 0.95) * (0.35 + 0.65 * open);
      const w = r * (type === 'daisy' ? 0.2 : type === 'poppy' ? 0.62 : 0.5);
      const spread = 0.25 + 0.75 * E.ease.outBack(Math.min(1, open));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU * spread + E.rand(i, seed, -0.06, 0.06) - (TAU * spread) / 2 + Math.PI;
        const lift = o.lift ? E.clamp(o.lift * 1.6 - E.hash(i, seed + 5) * 0.6) : 0;
        if (lift >= 1) continue;
        ctx.save();
        if (lift > 0) { ctx.translate(Math.cos(a + Math.PI / 2) * lift * r * 2.5, Math.sin(a + Math.PI / 2) * lift * r * 2.5 + lift * lift * r * 3); ctx.rotate(lift * 3 * (E.hash(i, seed) - 0.5)); ctx.globalAlpha *= 1 - lift; }
        petal(a, len * E.rand(i, seed + 2, 0.92, 1.06), w, col, col2, type === 'daisy' ? 0.2 : 0.35, type === 'blossom' ? 0.12 : 0);
        ctx.restore();
      }
      // merkez
      const cr = r * (type === 'daisy' ? 0.3 : type === 'poppy' ? 0.26 : 0.2);
      ctx.fillStyle = E.rad(ctx, -cr * 0.3, -cr * 0.3, 0, cr * 1.2, [[0, E.shade(cen, 0.35)], [0.7, cen], [1, E.shade(cen, -0.3)]]);
      ctx.beginPath(); ctx.arc(0, 0, cr, 0, TAU); ctx.fill();
      if (type !== 'daisy') {
        ctx.fillStyle = E.shade(cen, 0.4);
        for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; ctx.beginPath(); ctx.arc(Math.cos(a) * cr * 1.25, Math.sin(a) * cr * 1.25, r * 0.035, 0, TAU); ctx.fill(); }
      }
    } else if (type === 'tulip') {
      const h = r * 1.25, w = r * (0.55 + 0.25 * open);
      for (const [dx, sh, z] of [[-0.55, -0.18, 0], [0.55, -0.18, 0], [0, 0, 1]]) {
        ctx.save(); ctx.translate(dx * w * 0.55 * open, 0); ctx.rotate(dx * 0.35 * open);
        const p = new Path2D(); p.moveTo(0, r * 0.25); p.bezierCurveTo(w, r * 0.1, w * 0.9, -h * 0.6, w * 0.15, -h); p.lineTo(0, -h * 0.82); p.lineTo(-w * 0.15, -h); p.bezierCurveTo(-w * 0.9, -h * 0.6, -w, r * 0.1, 0, r * 0.25);
        const g = ctx.createLinearGradient(0, r * 0.2, 0, -h); g.addColorStop(0, E.shade(col2, -0.1)); g.addColorStop(0.6, E.shade(col, sh)); g.addColorStop(1, E.shade(col, 0.2));
        ctx.fillStyle = g; ctx.fill(p);
        ctx.save(); ctx.clip(p); ctx.fillStyle = E.rgba('#fff', z ? 0.16 : 0.07); ctx.beginPath(); ctx.ellipse(-w * 0.35, -h * 0.45, w * 0.22, h * 0.45, 0.1, 0, TAU); ctx.fill(); ctx.restore();
        ctx.restore();
      }
    } else if (type === 'rose' || type === 'peony') {
      // eş merkezli halkalar halinde taç yaprakları (dıştan içe), iç halkalar daha koyu ve kapalı
      const rings = type === 'rose' ? 5 : 4;
      for (let k = 0; k < rings; k++) {
        const kk = k / (rings - 1); // 0 dış → 1 iç
        const n = type === 'rose' ? 5 + (k % 2) : 7;
        const ringOpen = E.clamp(open * 1.25 - kk * 0.35);
        const len = r * (1.0 - kk * 0.62) * (0.45 + 0.55 * ringOpen);
        const w = r * (0.62 - kk * 0.22);
        const c1 = E.mix(col, col2, kk * 0.75), c2 = E.mix(col2, '#000000', 0.12 + kk * 0.1);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU + k * 0.62 + seed;
          const lift = o.lift ? E.clamp(o.lift * 1.8 - (1 - kk) * 0.2 - E.hash(i + k * 10, seed + 5) * 0.7) : 0;
          if (lift >= 1) continue;
          ctx.save();
          if (lift > 0) { const da = a + Math.PI / 2; ctx.translate(Math.cos(da) * lift * r * 3 + lift * r * 2.2, Math.sin(da) * lift * r * 2 + lift * lift * r * 2.5); ctx.rotate(lift * 4 * (E.hash(i, seed) - 0.5)); ctx.globalAlpha *= 1 - lift * lift; }
          petal(a, len, w, c1, c2, 0.15, 0, 1 - kk);
          ctx.restore();
        }
      }
      // spiral merkez
      if (!o.lift || o.lift < 0.85) {
        ctx.save(); ctx.globalAlpha *= 1 - E.clamp((o.lift || 0) * 1.2);
        ctx.strokeStyle = E.rgba(E.shade(col2, -0.35), 0.75); ctx.lineWidth = r * 0.035; ctx.lineCap = 'round';
        ctx.beginPath(); for (let a = 0; a < TAU * 2.2; a += 0.15) { const rr = r * 0.03 + a * r * 0.022; ctx.lineTo(Math.cos(a + seed) * rr, Math.sin(a + seed) * rr); } ctx.stroke();
        ctx.restore();
      }
    } else if (type === 'lotus') {
      const n = 9;
      for (let layer = 0; layer < 2; layer++) {
        for (let i = 0; i < n; i++) {
          const a = Math.PI + (i / (n - 1) - 0.5) * (1.6 + layer * -0.6) * (0.4 + 0.6 * open);
          petal(a, r * (1.15 - layer * 0.3), r * 0.36, layer ? E.shade(col, 0.15) : col, col2, 0.85);
        }
      }
    }
    ctx.restore();
  };

  /** Dört köşeli parıltı (yıldız ışıltısı) */
  S.sparkle = (ctx, x, y, r, alpha = 1, col = '#FFF4D2', rot = 0) => {
    if (alpha <= 0.01 || r <= 0.2) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= alpha;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, 0, 0, 0, r * 2.2, [[0, col, 0.55], [1, col, 0]]);
    ctx.beginPath(); ctx.arc(0, 0, r * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      ctx.quadraticCurveTo(Math.cos(a - Math.PI / 4) * r * 0.16, Math.sin(a - Math.PI / 4) * r * 0.16, Math.cos(a) * r, Math.sin(a) * r);
      ctx.quadraticCurveTo(Math.cos(a + Math.PI / 4) * r * 0.16, Math.sin(a + Math.PI / 4) * r * 0.16, Math.cos(a + Math.PI / 2) * r, Math.sin(a + Math.PI / 2) * r);
    }
    ctx.fill(); ctx.restore();
  };

  /** Uçuşan toz/ışık zerreleri (alan içinde, zamana göre süzülür) */
  S.dust = (ctx, t, o = {}) => {
    const n = o.n || 40, seed = o.seed || 7, x0 = o.x || 0, y0 = o.y || 0, w = o.w || E.W, h = o.h || E.H;
    const col = o.col || '#FFE7B0', rMin = o.rMin || 1.5, rMax = o.rMax || 4.5, sp = o.speed || 18, a0 = o.alpha === undefined ? 0.7 : o.alpha;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const r = E.rand(i, seed, rMin, rMax);
      const px = x0 + ((E.hash(i, seed + 1) * w + E.noise(t * 0.15 + i, seed) * 40 + t * sp * (E.hash(i, seed + 2) - 0.3)) % w + w) % w;
      const py = y0 + ((E.hash(i, seed + 3) * h - t * sp * (0.3 + E.hash(i, seed + 4)) + E.noise(t * 0.2 + i * 3, seed + 1) * 30) % h + h) % h;
      const tw = 0.45 + 0.55 * E.osc(t, 1.5 + E.hash(i, seed + 5) * 2.5, E.hash(i, seed + 6));
      ctx.globalAlpha = a0 * tw;
      ctx.fillStyle = E.rad(ctx, px, py, 0, r * 3, [[0, col, 1], [0.35, col, 0.5], [1, col, 0]]);
      ctx.beginPath(); ctx.arc(px, py, r * 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  /** Işık huzmeleri (tanrı ışınları): kaynak (x,y), açı, yayılım */
  S.rays = (ctx, x, y, o = {}) => {
    const n = o.n || 9, len = o.len || 2000, ang = o.angle === undefined ? Math.PI / 2 : o.angle, spread = o.spread || 0.9;
    const col = o.col || '#FFE9B8', a = o.alpha === undefined ? 0.18 : o.alpha, t = o.t || 0, seed = o.seed || 3;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < n; i++) {
      const aa = ang + (i / (n - 1) - 0.5) * spread + E.noise(t * 0.2 + i, seed) * 0.03;
      const w = (o.width || 0.05) * (0.5 + E.hash(i, seed));
      const g = ctx.createLinearGradient(x, y, x + Math.cos(aa) * len, y + Math.sin(aa) * len);
      const fl = a * (0.55 + 0.45 * E.osc(t, 3 + E.hash(i, seed) * 3, E.hash(i, seed + 1)));
      g.addColorStop(0, E.rgba(col, fl)); g.addColorStop(1, E.rgba(col, 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(aa - w) * len, y + Math.sin(aa - w) * len); ctx.lineTo(x + Math.cos(aa + w) * len, y + Math.sin(aa + w) * len); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  };

  /** Sekiz köşeli yıldız / rozet (İslami geometrik) — dış yarıçap r */
  S.starPath = (r, n = 8, inner = 0.72, rot = 0) => {
    const p = new Path2D();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * TAU - Math.PI / 2, rr = i % 2 === 0 ? r : r * inner;
      i ? p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : p.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    p.closePath(); return p;
  };
  /** Rub-ül hizb tarzı rozet: iki kare + daire + iç süs. draw: 0..1 çizim ilerlemesi (çizgi animasyonu) */
  S.rosette = (ctx, r, o = {}) => {
    const col = o.col || '#F2C14E', lw = o.lw || Math.max(1.5, r * 0.035), draw = o.draw === undefined ? 1 : o.draw, fill = o.fill;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const sq = (rr, rot) => { const p = new Path2D(); for (let i = 0; i < 4; i++) { const a = rot + (i / 4) * TAU; i ? p.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : p.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } p.closePath(); return p; };
    const star = S.starPath(r, 8, 0.76, Math.PI / 8);
    if (fill) { ctx.fillStyle = fill; ctx.fill(star); }
    const per = r * 8 * 1.6;
    ctx.strokeStyle = col; ctx.lineWidth = lw;
    ctx.setLineDash([per * draw, per]); ctx.stroke(sq(r, 0)); ctx.stroke(sq(r, Math.PI / 4));
    ctx.setLineDash([]);
    if (draw > 0.4) {
      ctx.globalAlpha *= E.clamp((draw - 0.4) / 0.4);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, TAU); ctx.stroke();
      ctx.stroke(S.starPath(r * 0.5, 8, 0.6, 0));
      ctx.beginPath(); ctx.arc(0, 0, r * 0.16, 0, TAU); ctx.fillStyle = col; ctx.fill();
    }
    ctx.restore();
  };

  /** Pofuduk düz bulut (alt kenarı düz). w genişlik */
  S.cloud = (ctx, w, o = {}) => {
    const col = o.col || '#FFFFFF', shade = o.shade || E.shade(col, -0.12), seed = o.seed || 2, h = w * 0.38;
    const p = new Path2D(); const n = 4 + Math.floor(E.hash(1, seed) * 3);
    p.moveTo(-w / 2, 0);
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + (i / n) * w, x1 = -w / 2 + ((i + 1) / n) * w, bump = h * (0.55 + 0.45 * Math.sin((i + 0.5) / n * Math.PI)) * E.rand(i, seed, 0.75, 1.15);
      p.bezierCurveTo(x0, -bump * 1.1, x1, -bump * 1.1, x1, 0);
    }
    p.closePath();
    const g = ctx.createLinearGradient(0, -h * 1.2, 0, 0); g.addColorStop(0, col); g.addColorStop(1, shade);
    ctx.fillStyle = g; ctx.fill(p);
    return p;
  };

  /** Kelebek: t zaman (kanat çırpma), o: {size, c1, c2, flap(hz), pattern:true} */
  S.butterfly = (ctx, t, o = {}) => {
    const s = o.size || 40, c1 = o.c1 || '#F59E3B', c2 = o.c2 || '#E2637A', hz = o.flap || 5;
    const f = 0.25 + 0.75 * Math.abs(Math.cos(t * hz * Math.PI + (o.phase || 0)));
    ctx.save();
    for (const side of [-1, 1]) {
      ctx.save(); ctx.scale(side * f, 1);
      const up = new Path2D(); up.moveTo(0, -s * 0.05); up.bezierCurveTo(s * 0.4, -s * 0.9, s * 1.2, -s * 0.85, s * 1.05, -s * 0.15); up.bezierCurveTo(s * 0.9, s * 0.1, s * 0.3, s * 0.05, 0, 0);
      const lo = new Path2D(); lo.moveTo(0, s * 0.02); lo.bezierCurveTo(s * 0.55, s * 0.05, s * 0.85, s * 0.5, s * 0.6, s * 0.8); lo.bezierCurveTo(s * 0.4, s * 0.95, s * 0.12, s * 0.5, 0, s * 0.1);
      let g = ctx.createLinearGradient(0, 0, s * 1.1, -s * 0.6); g.addColorStop(0, c2); g.addColorStop(1, c1);
      ctx.fillStyle = g; ctx.fill(up);
      g = ctx.createLinearGradient(0, 0, s * 0.7, s * 0.8); g.addColorStop(0, c2); g.addColorStop(1, E.shade(c1, -0.1));
      ctx.fillStyle = g; ctx.fill(lo);
      if (o.pattern !== false) {
        ctx.fillStyle = E.rgba('#ffffff', 0.75);
        ctx.beginPath(); ctx.arc(s * 0.82, -s * 0.42, s * 0.09, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(s * 0.62, -s * 0.6, s * 0.055, 0, TAU); ctx.fill();
        ctx.strokeStyle = E.rgba(E.shade(c2, -0.5), 0.6); ctx.lineWidth = s * 0.04; ctx.stroke(up); ctx.stroke(lo);
      }
      ctx.restore();
    }
    ctx.fillStyle = '#3A2A2A'; ctx.beginPath(); ctx.ellipse(0, s * 0.1, s * 0.07, s * 0.42, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3A2A2A'; ctx.lineWidth = s * 0.025; ctx.beginPath(); ctx.moveTo(0, -s * 0.25); ctx.quadraticCurveTo(-s * 0.1, -s * 0.5, -s * 0.22, -s * 0.6); ctx.moveTo(0, -s * 0.25); ctx.quadraticCurveTo(s * 0.1, -s * 0.5, s * 0.22, -s * 0.6); ctx.stroke();
    ctx.restore();
  };

  /** Yumuşak yuvarlak ışık (radyal parıltı) */
  S.light = (ctx, x, y, r, col = '#FFE3A1', a = 0.6, op = 'lighter') => {
    ctx.save(); ctx.globalCompositeOperation = op; ctx.globalAlpha *= a;
    ctx.fillStyle = E.rad(ctx, x, y, 0, r, [[0, col, 1], [0.25, col, 0.55], [0.6, col, 0.15], [1, col, 0]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  };

  /** Yuvarlatılmış dikdörtgen yolu */
  S.rr = (x, y, w, h, r) => { const p = new Path2D(); p.roundRect(x, y, w, h, r); return p; };

  /**
   * Sprite önbelleği: karmaşık statik çizimleri bir kez offscreen'e çizip yeniden kullanın.
   * S.sprite(key, w, h, (x) => { ... (0,0)-(w,h) içinde çiz ... }) → canvas. Çizerken S.drawSprite(ctx, spr, cx, cy, scale, rot, alpha).
   * Not: büyük ölçekte keskinlik için sprite'ı hedef boyutun ≥ 1x'i büyüklükte üretin.
   */
  const spriteCache = new Map();
  S.sprite = (key, w, h, draw) => {
    let c = spriteCache.get(key);
    if (!c) { const b = E.canvas(Math.ceil(w), Math.ceil(h)); draw(b.x, b); c = b.c; spriteCache.set(key, c); }
    return c;
  };
  S.drawSprite = (ctx, spr, cx, cy, scale = 1, rot = 0, alpha = 1) => {
    if (alpha <= 0.003) return;
    ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot); ctx.scale(scale, scale); ctx.globalAlpha *= alpha;
    ctx.drawImage(spr, -spr.width / 2, -spr.height / 2); ctx.restore();
  };

  /** Dikey arka plan gradyanı */
  S.sky = (ctx, stops, x0 = 0, y0 = 0, x1 = 0, y1 = E.H) => { ctx.fillStyle = E.lin(ctx, x0, y0, x1, y1, stops); ctx.fillRect(-E.W, -E.H, E.W * 3, E.H * 3); };
})();
