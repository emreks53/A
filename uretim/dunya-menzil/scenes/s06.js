/* s06 · 18.75–24.70 (+0.9 bleed tail) · "Hayatımız bir kalem, onunla sahife-i a'malimize geçecek çok şeyler yazılıyor."
   Cut to a wider view: the man stands in the meadow, looking up at the page his world has become (same page as
   the end of s05: roundel headpiece, tezhip border, ruled lines).
   "Hayatımız" 19.04: a luminous life-thread rises from his chest (his hands open a little), curves up the left of the
   page and over its top; its light then flows completely into a coil that condenses into a REED PEN, while one long
   camera push starts towards the page. "kalem" 19.86: the pen is complete, its nib glints.
   "onunla" 20.82: close on the page, the pen writes — a line of script, then four small painted miniatures of HIS OWN
   deeds bloom from the nib one after another (the same man, in miniature: giving bread · planting a sapling ·
   helping someone up · prostrating on a prayer rug, lit by a thin ray from above), a second script line between.
   "a'malimize" 21.84: the camera starts down to the BOOK OF DEEDS rising below; it opens in a warm aura.
   "geçecek" 22.42–22.80: the page lifts off, glides into the book and lands as its right-hand page.
   "çok şeyler yazılıyor" 22.84–24.0: on the book, the pen writes the facing page, leaves turn over our page and
   fill with lines (a third turn runs into the outgoing bleed to s07, centre 540, 960).
   Note: soft washes use a local transform-safe helper (softWash) — E.softFill is displaced under scaled cameras. */
(function () {
  const E = window.E;
  const P = E.P;
  const PR = E.props;
  const seg = E.seg, lerp = E.lerp, clamp = E.clamp;
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const sstep = (t, a, b) => E.smooth(seg(t, a, b));

  // ---------------- page design (identical to s05) ----------------
  const PW = 560, PH = 730;
  const RATIO = 0.72;
  const ROUND = { y: -150, R: 100 };
  const RULE0 = -28, RULE_SP = 30, RULE_N = 10, TXW = 168;

  // ---------------- set (world = screen in the wide framing) ----------------
  const GROUND_Y = 1078;
  const MAN = { x: 200, y: 1186, h: 520 };
  const CHEST = [MAN.x + 0.05 * MAN.h, MAN.y - 0.7 * MAN.h];
  const PAGE = { x: 640, y: 495, s: 500 / PW, rot: -0.05 };
  const BOOK = { x: 610, y: 905, w: 175, h: 229 };
  const BOOK_MB = BOOK.w * 0.03, BOOK_GUT = BOOK.w * 0.012;
  const LAND = { x: BOOK.x + BOOK_GUT + (BOOK.w - BOOK_MB - BOOK_GUT) / 2, y: BOOK.y, s: (BOOK.w - BOOK_MB - BOOK_GUT) / PW, rot: 0 };
  const PEN_ANG = -1.05;
  const INK = '#33293A';
  const HOVER = [150, -62]; // page-local point where the pen forms and waits

  // ---------------- timing (global seconds) ----------------
  const T = (i) => E.T(i);
  const tHayat = T(34), tKalem = T(36), tOnunla = T(37), tAmal = T(40), tGecek = T(41), tCok = T(42);
  const THREAD0 = tHayat - 0.1, THREAD1 = tHayat + 0.45;      // thread rises
  const FORM0 = tHayat + 0.32, FORM1 = tKalem - 0.02;          // coil condenses into the pen
  const GATHER0 = FORM0 + 0.02, GATHER1 = FORM1 + 0.04;        // the thread's light flows completely into the pen
  const CAM_IN0 = 19.35, CAM_IN1 = tOnunla - 0.18;             // one long push from the man's life to the writing
  // writing order (right -> left, top -> bottom): script A, V1, V2, script B, V3, V4
  const SCHED = [
    { k: 's', i: 0, t0: tOnunla - 0.2, t1: tOnunla + 0.04 },
    { k: 'v', i: 0, t0: tOnunla + 0.06, t1: tOnunla + 0.35 },
    { k: 'v', i: 1, t0: tOnunla + 0.37, t1: tOnunla + 0.66 },
    { k: 's', i: 1, t0: tOnunla + 0.68, t1: tOnunla + 0.8 },
    { k: 'v', i: 2, t0: tOnunla + 0.82, t1: tOnunla + 1.1 },
    { k: 'v', i: 3, t0: tOnunla + 1.12, t1: tOnunla + 1.4 },
  ];
  const W_END = SCHED[SCHED.length - 1].t1;                   // 22.22
  // tilt down to the book (22.12 -> 22.72); the book only fades in once the camera has brought its place above
  // the subtitle band, then opens to receive the page
  const CAM_DN0 = tAmal + 0.28, CAM_DN1 = tGecek + 0.3;
  const BOOK_IN0 = tGecek + 0.02, BOOK_IN1 = tGecek + 0.24, OPEN0 = tGecek + 0.06, OPEN1 = tGecek + 0.36;
  const LIFT0 = W_END + 0.04, FLY0 = tGecek - 0.02, FLY1 = tGecek + 0.42; // the page passes into the book on "geçecek"
  const LEFT0 = FLY1 + 0.12, LEFT1 = FLY1 + 0.62;              // facing page of the first spread
  const FLIPS = [[23.5, 23.86], [24.4, 24.76], [25.3, 25.62]];
  const SPREAD = [[23.9, 24.36], [24.8, 25.26]];

  // ---------------- soft wash that survives scaled transforms ----------------
  // (E.softFill / E.wash{soft} / E.bloom / E.man.shadow land displaced by 20000·(scale−1) px under a zoomed
  //  camera; this bakes the transform into the path, as props-a's shadowDraw does, and clips to the bounds.)
  const SOFF = 30000;
  function softWash(ctx, path, color, alpha, blur, bb) {
    if (alpha <= 0.003) return;
    const m = ctx.getTransform();
    const sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha *= alpha;
    if (bb) { const r = new Path2D(); r.rect(bb[0] - blur * 3, bb[1] - blur * 3, bb[2] - bb[0] + blur * 6, bb[3] - bb[1] + blur * 6); ctx.clip(r); }
    const p2 = new Path2D();
    p2.addPath(path, new DOMMatrix([m.a, m.b, m.c, m.d, m.e - SOFF, m.f]));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = color; ctx.shadowBlur = Math.max(0.5, blur * sc * 2); ctx.shadowOffsetX = SOFF; ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fill(p2);
    ctx.restore();
  }
  /** soft irregular blob (replacement for E.bloom / E.wash(blob, {soft})) */
  function softBlob(ctx, cx, cy, r, color, alpha, blur, o = {}) {
    const rx = o.rx || r, ry = o.ry || r;
    const k = 1.35 + (o.irr || 0.12);
    softWash(ctx, E.blob(cx, cy, r, { seed: o.seed || 3, irr: o.irr ?? 0.25, rx: o.rx, ry: o.ry, rot: o.rot || 0 }), color, alpha, blur,
      [cx - Math.max(rx, ry) * k, cy - Math.max(rx, ry) * k, cx + Math.max(rx, ry) * k, cy + Math.max(rx, ry) * k]);
  }

  const circlePath = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.01, r), 0, E.TAU); return p; };
  const toWorld = (pg, x, y) => {
    const c = Math.cos(pg.rot), s = Math.sin(pg.rot);
    return [pg.x + pg.s * (c * x - s * y), pg.y + pg.s * (s * x + c * y)];
  };
  const len2 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
  function along(pts, cum, d) {
    let i = 1;
    while (i < pts.length - 1 && cum[i] < d) i++;
    const a = pts[i - 1], b = pts[i];
    const k = clamp((d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]));
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  }

  // =====================================================================================================
  // The deeds: four painted miniatures of the man himself (E.man, drawn small with fine ink contours).
  // Each blooms from the nib like wet paint spreading (irregular growing edge), after the pen has drawn its
  // ground line. Page-local design units; c = [centre x, ground line y].
  // =====================================================================================================
  const FIG_H = 66;
  const OTHER = { desat: 0.35, tint: '#A9764E', tintAmt: 0.45 }; // the other people: muted warm ochre robes
  const POSE = {
    give: { lean: 0.07, head: 0.1, nS: 1.22, nE: 0.28, fS: 1.06, fE: 0.42, nH: 0.08, nK: 0.05, fH: -0.1, fK: 0.08, nF: 0, fF: 0 },
    receive: { lean: 0.05, head: 0.06, nS: 1.08, nE: 0.5, fS: 0.95, fE: 0.62, nH: 0.05, nK: 0.04, fH: -0.07, fK: 0.06, nF: 0, fF: 0 },
    plant: { lean: 0.34, head: 0.32, nS: 0.55, nE: 0.2, fS: 0.42, fE: 0.28, nH: 1.42, nK: 1.42, fH: -0.12, fK: 1.52, nF: 0, fF: -0.35 },
    help: { lean: 0.26, head: 0.3, nS: 0.98, nE: 0.02, fS: 0.12, fE: 0.35, nH: 0.12, nK: 0.08, fH: -0.16, fK: 0.12, nF: 0, fF: 0 },
    seated: { lean: -0.2, head: -0.2, nS: 2.3, nE: 0.12, fS: -0.55, fE: 0.15, nH: 2.0, nK: 1.5, fH: 1.82, fK: 1.25, nF: 0.25, fF: 0.25 },
    sujood: { lean: 1.98, head: 0.18, nS: 0.28, nE: 1.22, fS: 0.18, fE: 1.28, nH: 0.3, nK: 1.85, fH: 0.24, fK: 1.8, nF: -0.5, fF: -0.5 },
  };
  const V = [
    { c: [84, 80], bg: '#EDC77E', name: 'bread' },
    { c: [-84, 80], bg: '#BFD89C', name: 'sapling' },
    { c: [84, 228], bg: '#B3CBE6', name: 'help' },
    { c: [-84, 228], bg: '#EDB9A8', name: 'prayer', light: true },
  ];
  const CELL_HW = 60;

  /** Paint-layer contours for small figures: their pencil goes to a scratch canvas that is then multiplied onto the
      paint layer, so it moves with the paint under the watercolour pass's edge wobble (at miniature size a separate
      ink layer would float ~2 px off the painted shapes and leave a paper-white halo). The scratch canvas is
      cleared on every use (a reusable buffer, no state between frames). */
  let SCR = null;
  function withPaintInk(L, bb, fn) {
    if (!SCR) { SCR = document.createElement('canvas'); SCR.width = E.W; SCR.height = E.H; SCR.c = SCR.getContext('2d'); }
    const sc = SCR.c;
    sc.setTransform(1, 0, 0, 1, 0, 0); sc.globalAlpha = 1; sc.globalCompositeOperation = 'source-over';
    sc.clearRect(0, 0, E.W, E.H);
    const m = L.paint.getTransform();
    sc.setTransform(m);
    sc.save();
    fn({ paint: L.paint, ink: sc, light: L.light });
    sc.restore();
    // composite only the figure's screen box
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y] of [[bb[0], bb[1]], [bb[2], bb[1]], [bb[0], bb[3]], [bb[2], bb[3]]]) {
      const X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f;
      x0 = Math.min(x0, X); y0 = Math.min(y0, Y); x1 = Math.max(x1, X); y1 = Math.max(y1, Y);
    }
    x0 = Math.max(0, Math.floor(x0 - 4)); y0 = Math.max(0, Math.floor(y0 - 4)); x1 = Math.min(E.W, Math.ceil(x1 + 4)); y1 = Math.min(E.H, Math.ceil(y1 + 4));
    if (x1 - x0 < 1 || y1 - y0 < 1) return;
    const pc = L.paint;
    pc.save();
    pc.setTransform(1, 0, 0, 1, 0, 0);
    pc.globalCompositeOperation = 'multiply';
    pc.drawImage(SCR, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    pc.restore();
  }
  /** E.man in miniature: drawn K× larger under a 1/K scale so his pencil contour stays fine */
  function fig(L, x, y, facing, pose, o = {}) {
    const K = 4;
    E.save(L);
    E.translate(L, x, y);
    E.scale(L, 1 / K);
    E.man.draw(L, { x: 0, y: 0, h: FIG_H * K, view: 'side', facing, pose, ...o });
    E.restore(L);
  }
  /** tapered ink line (brush pen), revealed to p, in the current (page-local) frame */
  function inkLine(ctx, x0, y0, x1, y1, w, p, a = 0.8) {
    if (p <= 0) return;
    const N = 14, n = Math.max(1, Math.round(N * clamp(p)));
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.strokeStyle = INK; ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u0 = i / N, u1 = Math.min(p, (i + 1) / N);
      const um = (u0 + u1) / 2;
      ctx.globalAlpha = a * (0.75 + 0.25 * E.noise1(i * 1.7, 3));
      ctx.lineWidth = w * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, um * 1.05)));
      ctx.beginPath();
      ctx.moveTo(lerp(x0, x1, u0), lerp(y0, y1, u0) + 0.6 * E.noise1(u0 * 9, 5));
      ctx.lineTo(lerp(x0, x1, u1), lerp(y0, y1, u1) + 0.6 * E.noise1(u1 * 9, 5));
      ctx.stroke();
    }
    ctx.restore();
  }
  function vScene(L0, vi, wsh, t) {
    const v = V[vi], [cx, by] = v.c, pc = L0.paint, H = FIG_H;
    withPaintInk(L0, [cx - 70, by - H - 14, cx + 70, by + 10], (L) => {
      if (v.name === 'bread') {
        fig(L, cx - 25, by, 1, POSE.give);
        fig(L, cx + 25, by, -1, POSE.receive, OTHER);
        // a round loaf passing between their hands
        const lx = cx + 0.5, ly = by - 0.6 * H;
        const loaf = new Path2D();
        loaf.moveTo(lx - 8.2, ly + 3.2);
        loaf.bezierCurveTo(lx - 8.6, ly - 3.6, lx - 4, ly - 6.4, lx, ly - 6.4);
        loaf.bezierCurveTo(lx + 4, ly - 6.4, lx + 8.6, ly - 3.6, lx + 8.2, ly + 3.2);
        loaf.bezierCurveTo(lx + 4, ly + 4.6, lx - 4, ly + 4.6, lx - 8.2, ly + 3.2);
        loaf.closePath();
        pc.save(); pc.globalCompositeOperation = 'source-over'; pc.fillStyle = '#E7BC72'; pc.fill(loaf); pc.restore();
        pc.save(); pc.clip(loaf);
        E.wash(pc, E.blob(lx + 2.2, ly + 1.4, 6, { rx: 8, ry: 4.4, seed: 3, irr: 0.15 }), '#B9743A', { alpha: 0.6 });
        E.wash(pc, E.blob(lx - 2.6, ly - 3.2, 2.4, { rx: 3.6, ry: 1.5, seed: 4, irr: 0.1 }), '#FFFFFF', { mode: 'over', alpha: 0.5 });
        pc.restore();
        E.pencil(L.ink, loaf, { w: 0.6, a: 0.6, double: false });
        for (const [x0, y0, x1, y1] of [[-4.4, -4.6, -2.4, -0.6], [-0.6, -5.4, 1.2, -1.2], [3.2, -4.6, 4.8, -1.2]]) E.pencil(L.ink, [[lx + x0, ly + y0], [lx + x1, ly + y1]], { w: 0.55, a: 0.5, double: false });
      } else if (v.name === 'sapling') {
        // the soil he has just turned
        E.wash(pc, E.blob(cx + 20, by - 0.5, 9, { rx: 14, ry: 3.6, seed: 7, irr: 0.15 }), '#9C7A5A', { alpha: 0.55 * wsh });
        PR.sapling(L, cx + 20, by - 1.5, 33, { t, growth: 0.35 + 0.65 * E.ease.outCubic(clamp(wsh * 1.4)), soil: true, seed: 3 });
        fig(L, cx - 16, by, 1, POSE.plant);
      } else if (v.name === 'help') {
        fig(L, cx + 25, by, -1, POSE.seated, OTHER);
        fig(L, cx - 22, by, 1, POSE.help);
      } else if (v.name === 'prayer') {
        // the prayer rug (seen almost edge-on): crimson field with a gold border
        const rug = new Path2D(); rug.moveTo(cx - 48, by - 1.5); rug.lineTo(cx + 42, by - 1.5); rug.lineTo(cx + 46, by + 4.5); rug.lineTo(cx - 44, by + 4.5); rug.closePath();
        pc.save(); pc.globalCompositeOperation = 'source-over'; pc.fillStyle = '#B4473F'; pc.fill(rug); pc.restore();
        const band = new Path2D(); band.moveTo(cx - 45, by + 0.2); band.lineTo(cx + 41, by + 0.2); band.lineTo(cx + 43, by + 2.8); band.lineTo(cx - 43, by + 2.8); band.closePath();
        E.wash(pc, band, '#E3B45A', { mode: 'over', alpha: 0.75 });
        E.wash(pc, band, '#B4473F', { alpha: 0.35 });
        E.pencil(L.ink, rug, { w: 0.6, a: 0.5, double: false });
        fig(L, cx - 5, by - 1.5, 1, POSE.sujood);
      }
    });
  }
  /** draw a vignette (page-local), revealed to p, washes to wsh */
  function drawVignette(L, vi, p, wsh, t) {
    if (p <= 0) return;
    const v = V[vi], [cx, by] = v.c, pc = L.paint;
    const cy = by - 26;
    const bloomR = 92 * E.ease.outCubic(seg(p, 0.22, 1));
    // a pale wash behind the little scene, spreading with the paint
    const bgk = clamp(bloomR / 70);
    if (bgk > 0) {
      softBlob(pc, cx, cy + 4, 56 * bgk, v.bg, 0.4 * Math.max(bgk * 0.6, wsh), 5, { rx: 66 * bgk, ry: 40 * bgk, seed: 11 + vi, irr: 0.2 });
      softBlob(pc, cx - 16, cy - 4, 24 * bgk, v.bg, 0.28 * wsh, 7, { seed: 21 + vi, irr: 0.25 });
    }
    // the ground line, drawn by the pen right -> left
    inkLine(pc, cx + CELL_HW - 2, by + 0.5, cx - CELL_HW + 2, by + 0.5, 1.7, seg(p, 0, 0.3), 0.75);
    if (bloomR <= 0.5) return;
    // the miniature blooms from the nib outward
    E.save(L);
    if (p < 1) {
      const clip = E.blob(cx, cy, bloomR, { seed: 31 + vi, irr: 0.28, n: 40 });
      E.each(L, (c) => c.clip(clip));
    }
    vScene(L, vi, wsh, t);
    E.restore(L);
    // a thin ray of light from above onto the one who prays (divine presence only as light, no source)
    const la = v.light ? E.ease.inOutSine(clamp(seg(p, 0.45, 1) * 0.7 + wsh * 0.3)) : 0;
    if (la > 0) {
      const lc = L.light;
      const rx = cx + 14, top = by - 122;
      const beam = (w0, w1, y1) => { const q = new Path2D(); q.moveTo(rx - w0, top); q.lineTo(rx + w0, top); q.lineTo(rx + w1, y1); q.lineTo(rx - w1 - 4, y1); q.closePath(); return q; };
      // painted warm glaze (light alone cannot brighten the pale paper): stacked widths feather the edges and a
      // vertical gradient lets the beam fade in from nowhere at the top
      pc.save(); pc.globalCompositeOperation = 'multiply';
      const pg2 = pc.createLinearGradient(0, top, 0, by);
      pg2.addColorStop(0, E.rgba('#EDC779', 0)); pg2.addColorStop(0.45, E.rgba('#EDC779', 0.14 * la)); pg2.addColorStop(1, E.rgba('#E9BD66', 0.2 * la));
      pc.fillStyle = pg2;
      for (const [w0, w1] of [[7, 22], [5, 15], [3, 9]]) pc.fill(beam(w0, w1, by - 1));
      pc.restore();
      lc.save(); lc.globalCompositeOperation = 'lighter';
      const g = lc.createLinearGradient(rx, top, rx, by);
      g.addColorStop(0, E.rgba('#FFE7B0', 0)); g.addColorStop(0.5, E.rgba('#FFE7B0', 0.16 * la)); g.addColorStop(1, E.rgba('#FFF1D0', 0.08 * la));
      lc.fillStyle = g; lc.fill(beam(5, 18, by));
      lc.restore();
      E.glow(lc, rx - 4, by - 10, 26, '#FFE9B8', 0.22 * la);
    }
  }
  /** pen head for a vignette at reveal p (page-local): along the ground line, then painting outward in a loop */
  function vHead(vi, p) {
    const [cx, by] = V[vi].c, cy = by - 26;
    const a = [cx + CELL_HW - 2, by + 0.5], b = [cx - CELL_HW + 2, by + 0.5];
    if (p <= 0.3) { const k = p / 0.3; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; }
    const q = (p - 0.3) / 0.7;
    const ang = Math.PI * 0.85 - q * E.TAU * 1.05;
    const r = 30 * (1 - 0.45 * q);
    const sp = [cx + Math.cos(ang) * r * 1.25, cy - Math.sin(ang) * r * 0.85];
    const k = E.smooth(clamp(q / 0.25));
    return [lerp(b[0], sp[0], k), lerp(b[1], sp[1], k)];
  }

  // ---------------- script lines ----------------
  const SCRIPT = [
    { y: -28, x0: 160, x1: -160, size: 14, seed: 3 },
    { y: 122, x0: 160, x1: -60, size: 14, seed: 8 },
  ];
  const SCACHE = new Map();
  function sData(i) {
    if (SCACHE.has(i)) return SCACHE.get(i);
    const sc = SCRIPT[i];
    const strokes = PR.scriptLine(sc.x0, sc.y, sc.x1, { size: sc.size, seed: sc.seed });
    const width = sc.size * 0.28;
    const polys = strokes.map((pts) => { const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + len2(pts[k - 1], pts[k])); return { pts, cum, L: cum[cum.length - 1] }; });
    const total = polys.reduce((a, o) => a + o.L + width * 0.8, 0);
    const res = { strokes, polys, total, width };
    SCACHE.set(i, res);
    return res;
  }
  function sHead(i, p) {
    const d = sData(i);
    let budget = clamp(p) * d.total;
    let head = d.polys[0].pts[0];
    for (const o of d.polys) {
      if (budget <= 0) break;
      head = along(o.pts, o.cum, Math.min(budget, o.L));
      budget -= o.L + d.width * 0.8;
    }
    return head;
  }

  /** writing state at time t: progress of each scheduled element */
  function writing(t) {
    return SCHED.map((e) => ({ ...e, p: seg(t, e.t0, e.t1), w: seg(t, e.t0 + (e.t1 - e.t0) * 0.5, e.t1 + 0.45) }));
  }
  function pageContent(L, t) {
    for (const e of writing(t)) {
      if (e.p <= 0) continue;
      if (e.k === 's') {
        const d = sData(e.i);
        PR.inkWrite(L, d.strokes, e.p, { width: d.width + 0.6, color: INK, seed: 4 + e.i, bead: e.p < 1 });
      } else drawVignette(L, e.i, e.p, e.w, t);
    }
  }
  const headOf = (e, p) => (e.k === 's' ? sHead(e.i, p) : vHead(e.i, p));
  /** pen target on the page (page-local) at time t */
  function pageHead(t) {
    let last = null, next = null;
    for (const e of SCHED) {
      if (t >= e.t0 && t <= e.t1) return headOf(e, seg(t, e.t0, e.t1));
      if (t > e.t1) last = e;
      if (t < e.t0 && !next) next = e;
    }
    if (last && next) {
      const k = E.smooth(seg(t, last.t1, next.t0));
      const a = headOf(last, 1), b = headOf(next, 0);
      return [lerp(a[0], b[0], k), lerp(a[1], b[1], k) - 10 * Math.sin(Math.PI * k)];
    }
    if (!last && next) return headOf(next, 0);
    return headOf(last, 1);
  }

  // ---------------- the page (world-page, as in s05) ----------------
  function pageGuides(L) {
    // ruled lines + margin rule on the paint layer (so the painted miniatures cover them)
    const k = L.paint;
    k.save();
    k.globalCompositeOperation = 'multiply';
    k.strokeStyle = '#B3A79C'; k.lineWidth = 0.9; k.globalAlpha *= 0.3;
    k.beginPath();
    for (let i = 0; i < RULE_N; i++) { const y = RULE0 + i * RULE_SP; k.moveTo(TXW, y); k.lineTo(-TXW, y); }
    k.stroke();
    k.globalAlpha *= 1.15; k.strokeStyle = '#C99A88'; k.lineWidth = 1.2;
    k.beginPath(); k.moveTo(TXW + 8, RULE0 - 16); k.lineTo(TXW + 8, RULE0 - 16 + RULE_SP * (RULE_N - 1) + 32); k.stroke();
    k.restore();
  }
  function goldRing(L, R, ry) {
    const band = R * 0.075;
    const pc = L.paint;
    pc.save();
    pc.globalCompositeOperation = 'source-over';
    pc.strokeStyle = '#E9CD8A'; pc.globalAlpha *= 0.9; pc.lineWidth = band;
    pc.beginPath(); pc.arc(0, ry, R + band * 0.5, 0, E.TAU); pc.stroke();
    pc.globalCompositeOperation = 'multiply';
    pc.strokeStyle = '#C9A04A'; pc.globalAlpha = 0.55; pc.lineWidth = band * 0.55;
    pc.beginPath(); pc.arc(0, ry, R + band * 0.5, 0, E.TAU); pc.stroke();
    pc.strokeStyle = '#9A7330'; pc.globalAlpha = 0.85; pc.lineWidth = Math.max(1, R * 0.012);
    pc.beginPath(); pc.arc(0, ry, R + band * 1.05, 0, E.TAU); pc.stroke();
    pc.globalAlpha = 0.6; pc.lineWidth = Math.max(0.8, R * 0.008);
    pc.beginPath(); pc.arc(0, ry, R, 0, E.TAU); pc.stroke();
    pc.fillStyle = '#9A7330';
    pc.globalAlpha = 0.75;
    pc.beginPath();
    for (let i = 0; i < 28; i++) {
      const ang = -Math.PI / 2 + ((i + 0.5) / 28) * E.TAU, x = Math.cos(ang) * (R + band * 0.5), y = ry + Math.sin(ang) * (R + band * 0.5);
      pc.moveTo(x + band * 0.16, y); pc.arc(x, y, band * 0.16, 0, E.TAU);
    }
    pc.fill();
    pc.strokeStyle = '#B98E3E'; pc.lineWidth = Math.max(0.7, R * 0.006); pc.globalAlpha = 0.55;
    pc.beginPath();
    for (let i = 0; i < 48; i++) {
      const ang = -Math.PI / 2 + (i / 48) * E.TAU, len = R * (i % 2 ? 0.07 : 0.12), r0 = R + band * 1.25;
      pc.moveTo(Math.cos(ang) * r0, ry + Math.sin(ang) * r0); pc.lineTo(Math.cos(ang) * (r0 + len), ry + Math.sin(ang) * (r0 + len));
    }
    pc.stroke();
    pc.restore();
  }
  /** pg: {x, y, s, rot}; o: {t, glow, lift, shadow, content(L), clip (Path2D world)} */
  function worldPage(L, pg, o) {
    const [wx, wy] = toWorld(pg, 0, ROUND.y);
    const rp = (ROUND.R * pg.s) / RATIO;
    E.save(L);
    if (o.clip) E.each(L, (c) => c.clip(o.clip));
    // an opaque pale-sky ground under the roundel, so its (transparent) little sky never shows what lies beneath
    // the page (the book's own headpiece once the page has landed); also clears ink/light there
    {
      const hr = ROUND.R * pg.s + 1.5, disc = circlePath(wx, wy, hr);
      const pc = L.paint, gg = pc.createLinearGradient(0, wy - hr, 0, wy + hr);
      gg.addColorStop(0, '#CBD8E5'); gg.addColorStop(0.55, '#DFE5E8'); gg.addColorStop(1, '#ECEDE6');
      pc.save(); pc.globalCompositeOperation = 'source-over'; pc.fillStyle = gg; pc.fill(disc); pc.restore();
      for (const k of [L.ink, L.light]) { k.save(); k.globalCompositeOperation = 'destination-out'; k.fill(disc); k.restore(); }
    }
    E.save(L);
    E.translate(L, wx, wy); E.rotate(L, pg.rot);
    PR.personalWorld(L, 0, 0, rp, { t: o.t, glow: o.glow, life: 1, kind: 'home', doorOpen: 1 });
    E.restore(L);
    E.save(L);
    const hole = new Path2D(); hole.rect(-4000, -4000, 9000, 9000); hole.addPath(circlePath(wx, wy, ROUND.R * pg.s));
    E.each(L, (c) => c.clip(hole, 'evenodd'));
    PR.page(L, pg.x, pg.y, PW * pg.s, PH * pg.s, {
      rot: pg.rot, t: o.t, border: 1, lines: 0, lift: o.lift || 0, shadow: o.shadow !== false, glow: o.pageGlow || 0,
      content: (L2) => { E.save(L2); E.scale(L2, pg.s); pageGuides(L2); if (o.content) o.content(L2); E.restore(L2); },
    });
    E.restore(L);
    E.save(L);
    E.translate(L, pg.x, pg.y); E.rotate(L, pg.rot); E.scale(L, pg.s);
    goldRing(L, ROUND.R, ROUND.y);
    E.restore(L);
    E.restore(L);
  }

  // ---------------- book geometry (matches E.props.book with rtl, open = 1) ----------------
  function bookLine(page, q, first) {
    // page: 'L' (facing page, left on screen) | 'R' (cover side, right on screen); q 0..1 progress over its lines
    const w = BOOK.w, h = BOOK.h, mb = BOOK_MB, gut = BOOK_GUT;
    const x0 = gut, x1 = w - mb, y0 = -h / 2 + mb, y1 = h / 2 - mb;
    const tx = { x: x0 + (x1 - x0) * 0.14, y: y0 + h * 0.1, w: (x1 - x0) * 0.74, h: (y1 - y0) - h * 0.17 };
    const ty0 = first ? tx.y + tx.h * 0.15 * 1.35 : tx.y;
    const nL = first ? 8 : 10;
    const sp = (tx.y + tx.h - ty0) / nL;
    const f = clamp(q) * nL;
    const i = Math.min(nL - 1, Math.floor(f)), lp = Math.min(1, f - i);
    const yy = ty0 + sp * (i + 0.72);
    // on screen both pages write right -> left
    const X = page === 'L' ? lerp(tx.x, tx.x + tx.w, lp) : lerp(tx.x + tx.w, tx.x, lp);
    return [page === 'L' ? -X : X, yy];
  }
  function bookState(t) {
    const appear = E.ease.outCubic(seg(t, BOOK_IN0, BOOK_IN1));
    const open = seg(t, OPEN0, OPEN1);
    let flip = 0;
    for (let k = 0; k < FLIPS.length; k++) flip += E.ease.inOutSine(seg(t, FLIPS[k][0], FLIPS[k][1]));
    const pages = t < FLY1 ? 0 : 0.5 + 0.5 * seg(t, LEFT0, LEFT1);
    let pages2 = 0;
    for (let k = 0; k < SPREAD.length; k++) if (t >= FLIPS[k][1] - 1e-6 && t < FLIPS[k + 1][0]) pages2 = seg(t, SPREAD[k][0], SPREAD[k][1]);
    return { appear, open, flip, pages, pages2 };
  }
  /** where the pen writes in the book at time t (book-local), null when it is not writing */
  function bookHead(t) {
    if (t >= LEFT0 - 0.12 && t < FLIPS[0][0]) return bookLine('L', seg(t, LEFT0, LEFT1), false);
    for (let k = 0; k < SPREAD.length; k++) {
      const [a, b] = SPREAD[k];
      if (t >= FLIPS[k][1] && t < (FLIPS[k + 1] ? FLIPS[k + 1][0] : 99)) {
        const q = seg(t, a, b);
        return q < 0.5 ? bookLine('R', q * 2, false) : bookLine('L', q * 2 - 1, false);
      }
    }
    return null;
  }

  // ---------------- page transform over time ----------------
  function pageAt(t) {
    const bob = 3 * Math.sin(t * 0.9 + 1);
    // lift: the page rises off its place (shadow grows), then glides in an arc into the open book
    const up = E.ease.outCubic(seg(t, LIFT0, FLY0 + 0.08));
    const fl = seg(t, FLY0, FLY1);
    const k = E.ease.inOutCubic(fl);
    const sx = PAGE.x, sy = PAGE.y + bob - 30 * up, ex = LAND.x, ey = LAND.y;
    const cx = (sx + ex) / 2 + 70, cy = sy + 40;
    const x = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx + k * k * ex;
    const y = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy + k * k * ey;
    const s = lerp(PAGE.s, LAND.s, E.ease.inOutQuad(fl));
    const rot = lerp(PAGE.rot + 0.035 * up, 0, k) + 0.07 * Math.sin(Math.PI * k);
    const lift = up * (1 - E.ease.inQuad(fl));
    return { x, y, s, rot, lift, flying: fl > 0 && fl < 1, landed: fl >= 1 };
  }

  // ---------------- camera ----------------
  const CAM_W = { x: 540, y: 960, z: 1 };
  const CAM_P = { x: 640, y: 660, z: 1.7 };                      // on the page (writing)
  const CAM_B = { x: BOOK.x, y: BOOK.y + 50, z: 2.0 };           // on the book
  function camAt(t) {
    const k1 = E.ease.inOutCubic(seg(t, CAM_IN0, CAM_IN1));
    const k2 = E.ease.inOutCubic(seg(t, CAM_DN0, CAM_DN1));
    const zw = 1 + 0.025 * seg(t, 18.75, CAM_IN0);
    let x = lerp(CAM_W.x, CAM_P.x, k1), y = lerp(CAM_W.y, CAM_P.y, k1), z = lerp(zw, CAM_P.z, k1);
    // a slow drift while writing keeps the close-up alive
    z *= 1 + 0.02 * E.ease.inOutSine(seg(t, CAM_IN1, CAM_DN0));
    x = lerp(x, CAM_B.x, k2); y = lerp(y, CAM_B.y, k2); z = lerp(z, CAM_B.z, k2) * (1 + 0.035 * E.ease.inOutSine(seg(t, CAM_DN1, 25.6)));
    return { x: x + 3 * E.drift(t, 61, 0.22), y: y + 3 * E.drift(t, 62, 0.22), z };
  }
  function camK(L, c, k) { E.camera(L, { x: 540 + (c.x - 540) * k, y: 960 + (c.y - 960) * k, zoom: 1 + (c.z - 1) * k }); }

  // ---------------- pen + life thread ----------------
  /** pen length: a little shorter once it works in the (smaller) book */
  const penLen = (t) => lerp(200, 150, E.ease.inOutCubic(seg(t, W_END, LEFT0)));
  function penTip(t) {
    // hover position before writing, page writing, flight, book writing (all world)
    const pg = pageAt(t);
    const hover = toWorld(pageAt(Math.min(t, LIFT0)), HOVER[0], HOVER[1]);
    const bk = { x: BOOK.x, y: BOOK.y + 4 * Math.sin(t * 1.3) };
    if (t < SCHED[0].t0 - 0.2) return [hover[0] + 6 * Math.sin(t * 1.7), hover[1] + 5 * Math.sin(t * 2.3)];
    if (t <= W_END) {
      const k = E.smooth(seg(t, SCHED[0].t0 - 0.2, SCHED[0].t0));
      const w = toWorld(pg, ...pageHead(t));
      return [lerp(hover[0] + 6 * Math.sin(t * 1.7), w[0], k), lerp(hover[1] + 5 * Math.sin(t * 2.3), w[1], k)];
    }
    // between the page and the book: lift off, follow the page down, settle on the book
    const endP = toWorld(pageAt(t), ...pageHead(W_END));
    const bh = bookHead(t);
    const firstB = bookLine('L', 0, false);
    const tgtB = bh ? [bk.x + bh[0], bk.y + bh[1]] : [bk.x + firstB[0] + 20, bk.y + firstB[1] - 26];
    const k = E.ease.inOutCubic(seg(t, FLY0 + 0.1, LEFT0));
    const up = -70 * Math.sin(Math.PI * k) - 40 * E.ease.outCubic(seg(t, W_END, FLY0 + 0.1)) * (1 - k);
    let tip = [lerp(endP[0], tgtB[0], k), lerp(endP[1], tgtB[1], k) + up];
    if (t > LEFT0 && !bh) {
      // hovering during a leaf turn: drift toward the next line start, lifted
      let nk = 0;
      for (let i = 0; i < FLIPS.length; i++) if (t >= FLIPS[i][0] && t < FLIPS[i][1]) nk = i + 1;
      const nxt = bookLine('R', 0, false);
      const prv = bookLine('L', 1, false);
      const kk = E.smooth(seg(t, FLIPS[Math.max(0, nk - 1)][0], FLIPS[Math.max(0, nk - 1)][1]));
      tip = [bk.x + lerp(prv[0], nxt[0], kk), bk.y + lerp(prv[1], nxt[1], kk) - 30 * Math.sin(Math.PI * kk)];
    }
    return tip;
  }
  /** smoothed pen tip (pure: averages the target over the last ~0.1 s) */
  function penTipSmooth(t) {
    let x = 0, y = 0, ws = 0;
    for (let k = 0; k < 6; k++) { const w = 1 - k * 0.14; const p = penTip(t - k * 0.018); x += p[0] * w; y += p[1] * w; ws += w; }
    return [x / ws, y / ws];
  }

  /** uniform Catmull-Rom through waypoints, sampled at parameter u in [0, 1] */
  function spline(W, u) {
    const n = W.length - 1;
    const f = clamp(u) * n, i = Math.min(n - 1, Math.floor(f)), k = f - i;
    const p0 = W[Math.max(0, i - 1)], p1 = W[i], p2 = W[i + 1], p3 = W[Math.min(n, i + 2)];
    const k2 = k * k, k3 = k2 * k;
    const c = (a, b, cc, d) => 0.5 * (2 * b + (-a + cc) * k + (2 * a - 5 * b + 4 * cc - d) * k2 + (-a + 3 * b - 3 * cc + d) * k3);
    return [c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])];
  }
  /** the life-thread from the chest, up the left of the page and over its top, to the pen's back end.
      Visible between parameters g0 (tail, gathers towards the pen) and g1 (head, rising from the chest). */
  function threadPts(t, end, g0, g1) {
    const W = [CHEST, [CHEST[0] + 52, CHEST[1] - 190], [300, 440], [322, 268], [392, 160], [530, 124], [Math.min(end[0] - 70, 800), Math.min(end[1] - 100, 140)], end];
    const N = 90, pts = [];
    for (let i = 0; i <= N; i++) {
      const u = lerp(g0, g1, i / N);
      const p = spline(W, u), q = spline(W, Math.min(1, u + 0.005));
      const amp = 6 * Math.sin(Math.PI * u), ph = u * 11 - t * 3.4;
      const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
      pts.push([p[0] - (dy / l) * amp * Math.sin(ph), p[1] + (dx / l) * amp * Math.sin(ph)]);
    }
    return pts;
  }
  function drawThread(L, pts, a, t) {
    if (pts.length < 2 || a <= 0) return;
    const path = E.smoothPath(pts, false);
    // a thin warm gold line painted on the paper (light alone cannot brighten a pale sky)...
    L.paint.save();
    L.paint.globalCompositeOperation = 'multiply';
    L.paint.lineCap = 'round';
    L.paint.strokeStyle = E.rgba('#F3CF84', 0.3 * a); L.paint.lineWidth = 14; L.paint.stroke(path);
    L.paint.strokeStyle = E.rgba('#E2AE4E', 0.5 * a); L.paint.lineWidth = 4; L.paint.stroke(path);
    L.paint.restore();
    // ...and its light
    const lc = L.light;
    lc.save(); lc.globalCompositeOperation = 'lighter'; lc.lineCap = 'round';
    for (const [w, al, c] of [[34, 0.07, '#FFD98C'], [16, 0.14, '#FFE2A6'], [6, 0.4, '#FFF1CF'], [2.4, 0.75, '#FFFFFF']]) {
      lc.strokeStyle = E.rgba(c, al * a); lc.lineWidth = w; lc.stroke(path);
    }
    lc.restore();
    // beads of life travelling from the man to the pen (heartbeat rhythm)
    const n = pts.length - 1;
    for (let j = 0; j < 4; j++) {
      const u = ((t * 0.55 + j / 4) % 1);
      const pt = pts[Math.min(n, Math.round(u * n))];
      E.glow(L.light, pt[0], pt[1], 16, '#FFF4DA', 0.55 * a * Math.sin(Math.PI * u));
    }
  }

  E.scene('s06', {
    draw(L, lt, t) {
      const c = camAt(t);

      // ---------------- sky + far layers ----------------
      E.resetCamera(L);
      E.skyWash(L.paint, E.shade(P.cerulean, 0.46), E.shade(P.ochre, 0.62), { mid: E.shade(P.skyWash, 0.6), seed: 5, mottle: 0.16 });
      camK(L, c, 0.3);
      [[160, 300, 260, P.blush, 0.14, 3], [940, 560, 300, P.ochre, 0.13, 5], [520, 140, 300, P.skyWash, 0.14, 8]].forEach(([x, y, r, col, a, s], i) =>
        softBlob(L.paint, x + 14 * Math.sin(t * 0.21 + i), y + 10 * Math.cos(t * 0.17 + i * 2), r, col, a, 40, { seed: s, irr: 0.3 }));
      camK(L, c, 0.55);
      PR.cloud(L, 120 + 6 * (t - 18.75), 210, 260, { seed: 4, t, alpha: 0.7 });
      PR.cloud(L, 990 - 5 * (t - 18.75), 880, 240, { seed: 11, t, alpha: 0.6 });

      // ---------------- ground + the man ----------------
      camK(L, c, 1);
      PR.ground(L, GROUND_Y, { palette: 'spring', seed: 7, t, trees: 0.45, flowers: 0.3 });
      const manVis = 540 + (MAN.x + 0.2 * MAN.h - c.x) * c.z > -40; // skip him once he has left the frame
      if (manVis) {
        // contact shadow (E.man.shadow's soft wash is displaced under a zoomed camera)
        softBlob(L.paint, MAN.x + 8, MAN.y, MAN.h * 0.12, '#8F8C9C', 0.38, MAN.h * 0.012, { rx: MAN.h * 0.14, ry: MAN.h * 0.02, irr: 0.05, seed: 2 });
        const breathe = 0.02 * Math.sin(t * 1.6);
        const look = 0.85 + 0.15 * sstep(t, THREAD0, THREAD1);
        const pose = E.man.lerp(E.man.pose.stand(), E.man.pose.lookUp(1), look);
        // as his life rises out of him he opens his hands a little, as if letting it go
        const offer = bump(t, THREAD0 - 0.1, FORM1 + 0.5);
        pose.nS += 0.32 * offer; pose.nE += 0.35 * offer; pose.fS += 0.18 * offer; pose.fE += 0.25 * offer;
        pose.head = (pose.head || 0) + breathe;
        E.man.draw(L, { x: MAN.x, y: MAN.y, h: MAN.h, view: 'side', facing: 1, pose });
        // his life, a warm light at the chest
        const life = sstep(t, THREAD0 - 0.15, THREAD0 + 0.3) * (1 - 0.45 * sstep(t, GATHER0, GATHER1));
        if (life > 0) {
          E.glow(L.light, CHEST[0], CHEST[1], 80, '#FFD88E', 0.55 * life * (0.85 + 0.15 * Math.sin(t * 7)));
          E.glow(L.light, CHEST[0], CHEST[1], 22, '#FFFFFF', 0.7 * life);
        }
      }

      // ---------------- the book of deeds ----------------
      const bs = bookState(t);
      const bk = { x: BOOK.x, y: BOOK.y + 4 * Math.sin(t * 1.3) };
      if (bs.appear > 0) {
        // a warm aura behind the book (painted, so it reads on the pale sky) + rising motes of light
        const au = bs.appear * (0.55 + 0.45 * seg(t, OPEN0, OPEN1 + 0.4)) * (1 + 0.3 * bump(t, FLY1 - 0.05, FLY1 + 0.7));
        const ag = L.paint.createRadialGradient(bk.x, bk.y - 30, 20, bk.x, bk.y - 30, 360);
        ag.addColorStop(0, E.rgba('#F6D592', 0.6 * au)); ag.addColorStop(0.45, E.rgba('#F3D6A0', 0.28 * au)); ag.addColorStop(1, E.rgba('#F3D6A0', 0));
        L.paint.save(); L.paint.globalCompositeOperation = 'multiply'; L.paint.fillStyle = ag; L.paint.fillRect(bk.x - 370, bk.y - 400, 740, 740); L.paint.restore();
        E.glow(L.light, bk.x, bk.y - 30, 320, '#FFE4AE', 0.34 * au);
        // a soft column of light from above onto the open book (no source), feathered from stacked veils
        const col = au * seg(t, OPEN0, OPEN1 + 0.3);
        if (col > 0) {
          const lc = L.light;
          lc.save(); lc.globalCompositeOperation = 'lighter';
          const g = lc.createLinearGradient(0, bk.y - 560, 0, bk.y + 40);
          g.addColorStop(0, E.rgba('#FFF0CC', 0)); g.addColorStop(0.55, E.rgba('#FFF0CC', 0.035 * col)); g.addColorStop(1, E.rgba('#FFF0CC', 0.06 * col));
          lc.fillStyle = g;
          for (let i = 0; i < 5; i++) {
            const w0 = 30 + i * 22, w1 = 120 + i * 40, sway = 6 * Math.sin(t * 0.7 + i);
            lc.beginPath(); lc.moveTo(bk.x - w0 + sway, bk.y - 560); lc.lineTo(bk.x + w0 + sway, bk.y - 560); lc.lineTo(bk.x + w1, bk.y + 40); lc.lineTo(bk.x - w1, bk.y + 40); lc.closePath(); lc.fill();
          }
          lc.restore();
        }
        E.motes(L.light, { x: bk.x - 230, y: bk.y - 360, w: 460, h: 360, n: 14, t, seed: 71, color: '#FFE9B8', size: 2.2, a: 0.7 * au, rise: 40 });
        E.save(L);
        E.alpha(L, bs.appear);
        const by = bk.y + (1 - bs.appear) * 40;
        const glow = 0.3 + 0.45 * seg(t, OPEN0, OPEN1 + 0.3) + 0.25 * bump(t, FLY1 - 0.05, FLY1 + 0.6);
        PR.book(L, bk.x, by, BOOK.w, BOOK.h, { open: bs.open, pages: bs.pages, flip: bs.flip, pages2: bs.pages2, glow, t, shadow: true });
        E.restore(L);
      }

      // ---------------- the page ----------------
      const pg = pageAt(t);
      const content = (L2) => pageContent(L2, t);
      let overlayClip = null;
      if (pg.landed) {
        // our page now lies in the book (right page); a turning leaf covers it from the spine outwards
        const ff = clamp(bs.flip);
        const cf = Math.cos(Math.PI * E.ease.inOutSine(ff));
        if (ff >= 1) pg.hidden = true;
        else if (cf < 0) { overlayClip = new Path2D(); overlayClip.rect(bk.x + Math.abs(cf) * (BOOK.w - BOOK_MB) + 1, -4000, 9000, 9000); }
        pg.y = bk.y;
      }
      if (!pg.hidden) {
        worldPage(L, pg, { t, glow: 0.38, lift: pg.lift, shadow: !pg.landed, content, clip: overlayClip, pageGlow: 0.3 * bump(t, FLY1 - 0.1, FLY1 + 0.5) });
        if (pg.landed) {
          // tuck it into the binding: gutter shade
          E.save(L);
          if (overlayClip) L.paint.clip(overlayClip);
          const x0 = bk.x + BOOK_GUT, x1 = bk.x + BOOK.w - BOOK_MB;
          const g = L.paint.createLinearGradient(x0, 0, x1, 0);
          g.addColorStop(0, E.rgba('#B9A58A', 0.55)); g.addColorStop(0.08, E.rgba('#D8C8AC', 0.3)); g.addColorStop(0.3, E.rgba('#F0E6D2', 0.06)); g.addColorStop(1, E.rgba('#FFFFFF', 0));
          L.paint.save(); L.paint.globalCompositeOperation = 'multiply'; L.paint.fillStyle = g; L.paint.fillRect(x0, bk.y - BOOK.h / 2, x1 - x0, BOOK.h); L.paint.restore();
          E.restore(L);
        }
      }

      // ---------------- life-thread + reed pen ----------------
      const tip = penTipSmooth(t);
      const PEN_LEN = penLen(t);
      const form = E.ease.inOutCubic(seg(t, FORM0, FORM1));
      const penA = Math.cos(PEN_ANG), penB = Math.sin(PEN_ANG);
      const back = [tip[0] + penA * PEN_LEN, tip[1] + penB * PEN_LEN];
      const g = E.ease.outCubic(seg(t, THREAD0, THREAD1));
      const g0 = E.ease.inOutCubic(seg(t, GATHER0, GATHER1));
      if (g > 0 && g0 < 0.995) drawThread(L, threadPts(t, back, g0, g), 1, t);
      // the coil: light spirals around the pen's axis and condenses onto it
      if (g >= 1 && form < 1) {
        const lc = L.light;
        lc.save(); lc.globalCompositeOperation = 'lighter'; lc.lineCap = 'round';
        const R0 = 44 * (1 - form);
        const cp = [];
        for (let i = 0; i <= 80; i++) {
          const s = i / 80;
          const ax = back[0] - penA * PEN_LEN * s, ay = back[1] - penB * PEN_LEN * s;
          const ang = s * E.TAU * 2.5 - t * 9;
          cp.push([ax - penB * Math.sin(ang) * R0, ay + penA * Math.sin(ang) * R0]);
        }
        const pth = E.smoothPath(cp, false);
        for (const [w, al] of [[18, 0.12], [6, 0.4], [2.2, 0.85]]) { lc.strokeStyle = E.rgba('#FFEBC0', al * (1 - form * 0.6)); lc.lineWidth = w; lc.stroke(pth); }
        lc.restore();
        L.paint.save(); L.paint.globalCompositeOperation = 'multiply'; L.paint.strokeStyle = E.rgba('#E2B45A', 0.4 * (1 - form)); L.paint.lineWidth = 2; L.paint.stroke(pth); L.paint.restore();
      }
      if (form > 0) {
        // the pen materialises from the back end towards the nib
        E.save(L);
        const rev = clamp(form * 1.25);
        const ox = back[0] - penA * PEN_LEN * rev, oy = back[1] - penB * PEN_LEN * rev;
        if (rev < 1) {
          // half-plane beyond (ox, oy) towards the back end
          const clipP = new Path2D();
          clipP.moveTo(ox - penB * 400, oy + penA * 400); clipP.lineTo(ox + penB * 400, oy - penA * 400);
          clipP.lineTo(ox + penB * 400 + penA * 900, oy - penA * 400 + penB * 900); clipP.lineTo(ox - penB * 400 + penA * 900, oy + penA * 400 + penB * 900); clipP.closePath();
          E.each(L, (cc) => cc.clip(clipP));
        }
        const pglow = 1 - 0.65 * sstep(t, FORM1, FORM1 + 0.6);
        const ink = sstep(t, tKalem + 0.4, tKalem + 0.72);
        PR.reedPen(L, tip[0], tip[1], PEN_LEN, { angle: PEN_ANG, glow: pglow, ink, t, alpha: clamp(form * 1.6) });
        E.restore(L);
      }
      // "kalem": the nib glints
      const gl = bump(t, tKalem - 0.14, tKalem + 0.36);
      if (gl > 0) {
        E.glow(L.light, tip[0], tip[1], 110, '#FFF2CF', 0.6 * gl);
        const lc = L.light;
        lc.save(); lc.globalCompositeOperation = 'lighter'; lc.strokeStyle = E.rgba('#FFFFFF', 0.85 * gl); lc.lineWidth = 2.4;
        const sp = 64 * gl;
        lc.beginPath(); lc.moveTo(tip[0] - sp, tip[1]); lc.lineTo(tip[0] + sp, tip[1]); lc.moveTo(tip[0], tip[1] - sp * 0.8); lc.lineTo(tip[0], tip[1] + sp * 0.8); lc.stroke();
        lc.restore();
      }

      // ---------------- near layer: motes ----------------
      camK(L, c, 1.3);
      E.motes(L.light, { x: 0, y: 150, w: 1080, h: 1100, n: 14, t, seed: 66, color: '#FFF1D2', size: 2.6, a: 0.45, rise: 18 });
    },
    sfx() {
      return [
        { t: THREAD0, type: 'swell', gain: 0.3, dur: 0.9 },
        { t: tKalem - 0.04, type: 'chime', gain: 0.26, pitch: 1.25 },
        { t: SCHED[0].t0, type: 'pen', gain: 0.28, dur: W_END - SCHED[0].t0 },
        { t: SCHED[1].t0 + 0.1, type: 'bloom', gain: 0.14 },
        { t: SCHED[4].t0 + 0.1, type: 'bloom', gain: 0.12 },
        { t: SCHED[5].t0 + 0.16, type: 'chime', gain: 0.1, pitch: 1.8 },
        { t: OPEN0 + 0.05, type: 'page', gain: 0.24 },
        { t: FLY0, type: 'whoosh', gain: 0.22 },
        { t: FLY1, type: 'book', gain: 0.18 },
        { t: FLY1 + 0.02, type: 'sparkle', gain: 0.16 },
        { t: LEFT0, type: 'pen', gain: 0.22, dur: 1.85 },
        { t: FLIPS[0][0], type: 'page', gain: 0.22 },
        { t: FLIPS[1][0], type: 'page', gain: 0.2 },
      ];
    },
  });
})();
