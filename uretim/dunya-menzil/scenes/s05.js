/* s05 · 14.85–18.75 · "Belki o hususi dünyamız ve âlemimiz, bir sahifedir."
   Cut in on the man's personal world (match with s04's last frame: globe centred at (540, 720), r 300).
   "Belki" 15.20: the bubble draws a breath, then its glass rim spreads outward like wet paint and squares off into a
   sheet of fine paper — the globe opens into a PAGE; its landscape (house, tree, garden) stays as a painted roundel.
   "âlemimiz" 16.92: the roundel warms and a gold ring draws around it (our little realm, framed like a medallion).
   "bir sahifedir" 17.58–18.3: the page settles with a slight tilt, the tezhip border draws in from the top centre,
   the roundel rises into a headpiece and faint ruled lines appear below — a page ready to be written on.
   Hard cut to s06 (wider: the man, the same page). */
(function () {
  const E = window.E;
  const P = E.P;
  const PR = E.props;
  const ep = E.ep, seg = E.seg, lerp = E.lerp, clamp = E.clamp;
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));

  // ---------------- page design (shared layout with s06: keep identical) ----------------
  const PW = 560, PH = 730;          // page design size
  const RATIO = 0.72;                // roundel radius / globe radius (hides the glass rim + highlight window)
  const ROUND_A = { y: -66, R: 194 }; // roundel right after the opening
  const PS = 1.07;                   // page scale in this shot (599 x 781 px on screen)
  const ROUND_B = { y: -150, R: 100 }; // roundel as a headpiece (page ready to write)
  const RULE0 = -28, RULE_SP = 30, RULE_N = 10, TXW = 168;

  // ---------------- timing (global seconds) ----------------
  const T = (i) => E.T(i);
  const tBelki = T(26), tAlem = T(31), tBir = T(32), tSahife = T(33);
  const OPEN0 = tBelki + 0.06, OPEN1 = tBelki + 1.15;      // bubble -> sheet
  const SETTLE0 = tBir - 0.02, SETTLE1 = tSahife + 0.45;

  // ---------------- helpers ----------------
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

  /** superellipse outline (n = 2: ellipse; large n: rounded rectangle), slight wet wobble */
  function superPts(cx, cy, a, b, n, wob = 0, seed = 3, N = 132) {
    const pts = [];
    const ex = 2 / n;
    for (let i = 0; i < N; i++) {
      const th = (i / N) * E.TAU;
      const c = Math.cos(th), s = Math.sin(th);
      const w = 1 + wob * E.fbm1(i / N * 7, seed, 2);
      pts.push([cx + a * w * Math.sign(c) * Math.pow(Math.abs(c), ex), cy + b * w * Math.sign(s) * Math.pow(Math.abs(s), ex)]);
    }
    return pts;
  }
  const polyPath = (pts) => { const p = new Path2D(); pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]))); p.closePath(); return p; };
  const circlePath = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.01, r), 0, E.TAU); return p; };
  /** page-local (design units) -> world */
  const toWorld = (pg, x, y) => {
    const c = Math.cos(pg.rot), s = Math.sin(pg.rot);
    return [pg.x + pg.s * (c * x - s * y), pg.y + pg.s * (s * x + c * y)];
  };
  /** camera that zooms about a focus point (fx, fy stays put on screen), parallax depth k */
  function cam(L, z, fx, fy, dx, dy, k = 1) {
    const zz = 1 + (z - 1) * k;
    E.camera(L, { x: fx + (540 - fx) / zz + dx * k, y: fy + (960 - fy) / zz + dy * k, zoom: zz });
  }

  /** ruled lines + margin rule + faint construction lines, page-local design units (ink layer) */
  function pageGuides(L, o) {
    // ruled lines + margin rule on the paint layer (as in s06, where painted miniatures cover them)
    const k = L.paint;
    k.save();
    k.globalCompositeOperation = 'multiply';
    k.lineCap = 'round';
    const base = k.globalAlpha;
    if (o.lines > 0) {
      for (let i = 0; i < RULE_N; i++) {
        const a = clamp(o.lines * (RULE_N * 0.55 + 1) - i * 0.55);
        if (a <= 0) continue;
        const y = RULE0 + i * RULE_SP;
        const x1 = TXW, x0 = lerp(TXW, -TXW, E.ease.outCubic(a)); // drawn right -> left (the way the script will run)
        k.globalAlpha = base * 0.3 * Math.min(1, a * 3);
        k.strokeStyle = '#B3A79C';
        k.lineWidth = 0.9;
        k.beginPath(); k.moveTo(x1, y); k.lineTo(x0, y); k.stroke();
      }
      const m = clamp(o.lines * 1.6);
      if (m > 0) {
        k.globalAlpha = base * 0.345;
        k.strokeStyle = '#C99A88';
        k.lineWidth = 1.2;
        k.beginPath(); k.moveTo(TXW + 8, RULE0 - 16); k.lineTo(TXW + 8, RULE0 - 16 + (RULE_SP * (RULE_N - 1) + 32) * E.ease.outCubic(m)); k.stroke();
      }
    }
    k.restore();
    if (o.constr) {
      // compass-and-ruler underdrawing, drawn in like an illuminator laying out the page:
      // centre axis (top -> bottom), cross-hair through the roundel, a compass circle swept around it
      const c = o.constr, a = c.a;
      const y0 = -PH / 2 + 34, y1 = PH / 2 - 34;
      const pa = E.ease.inOutCubic(clamp(c.p * 1.6));
      const ph = E.ease.inOutCubic(clamp(c.p * 1.6 - 0.25));
      const pc = E.ease.inOutSine(clamp(c.p * 1.5 - 0.45));
      if (pa > 0) E.pencil(L.ink, [[0, y0], [0, lerp(y0, y1, pa)]], { w: 1.1, a: 0.26 * a, double: true, seed: 3 });
      if (ph > 0) E.pencil(L.ink, [[-PW / 2 + 30, o.ry], [lerp(-PW / 2 + 30, PW / 2 - 30, ph), o.ry]], { w: 1.1, a: 0.24 * a, double: true, seed: 4 });
      if (pc > 0) {
        const p = new Path2D(); p.arc(0, o.ry, o.R * 1.1, -Math.PI / 2, -Math.PI / 2 + E.TAU * pc);
        E.pencil(L.ink, p, { w: 1.1, a: 0.24 * a, double: true, seed: 6 });
        // the compass point
        if (pc < 1) E.pencil(L.ink, circlePath(0, o.ry, 2.2), { w: 1, a: 0.3 * a, double: false });
      }
      const pt = E.ease.inOutCubic(clamp(c.p * 1.4 - 0.4));
      if (pt > 0) for (const sx of [-1, 1]) E.pencil(L.ink, [[sx * TXW, y0 + 12], [sx * TXW, lerp(y0 + 12, y1 - 12, pt)]], { w: 0.9, a: 0.13 * a, double: false });
      // pricking marks down the margin where the rules will go (the illuminator's mistar), one after another
      const pk = clamp(c.p * 1.5 - 0.35);
      if (pk > 0) {
        const k = L.ink;
        k.save(); k.fillStyle = E.P.ink;
        for (let i = 0; i < RULE_N; i++) {
          const q = clamp(pk * (RULE_N + 2) - i);
          if (q <= 0) break;
          k.globalAlpha = 0.4 * a * q;
          k.beginPath(); k.arc(TXW + 8, RULE0 + i * RULE_SP, 1.6 * (0.6 + 0.4 * q), 0, E.TAU); k.fill();
        }
        k.restore();
      }
    }
  }

  /** gold ring around the roundel (page-local design units), revealed clockwise from the top */
  function goldRing(L, R, ry, p, t) {
    if (p <= 0) return;
    const pp = E.ease.inOutSine(clamp(p));
    const a0 = -Math.PI / 2, a1 = a0 + E.TAU * pp;
    const band = R * 0.075;
    const pc = L.paint;
    pc.save();
    pc.lineCap = 'round';
    // light gold band (semi-opaque warm gold so it reads on the painting and on paper)
    pc.globalCompositeOperation = 'source-over';
    pc.strokeStyle = '#E9CD8A'; pc.globalAlpha *= 0.9; pc.lineWidth = band;
    pc.beginPath(); pc.arc(0, ry, R + band * 0.5, a0, a1); pc.stroke();
    pc.globalCompositeOperation = 'multiply';
    pc.strokeStyle = '#C9A04A'; pc.globalAlpha = 0.55; pc.lineWidth = band * 0.55;
    pc.beginPath(); pc.arc(0, ry, R + band * 0.5, a0, a1); pc.stroke();
    // dark gold rules either side
    pc.strokeStyle = '#9A7330'; pc.globalAlpha = 0.85; pc.lineWidth = Math.max(1, R * 0.012);
    pc.beginPath(); pc.arc(0, ry, R + band * 1.05, a0, a1); pc.stroke();
    pc.globalAlpha = 0.6; pc.lineWidth = Math.max(0.8, R * 0.008);
    pc.beginPath(); pc.arc(0, ry, R, a0, a1); pc.stroke();
    // dots along the band, appearing as the ring passes
    pc.fillStyle = '#9A7330';
    const nD = 28;
    for (let i = 0; i < nD; i++) {
      const u = (i + 0.5) / nD;
      if (u > pp) break;
      const ang = a0 + u * E.TAU;
      pc.globalAlpha = 0.75 * clamp((pp - u) * 12);
      pc.beginPath(); pc.arc(Math.cos(ang) * (R + band * 0.5), ry + Math.sin(ang) * (R + band * 0.5), band * 0.16, 0, E.TAU); pc.fill();
    }
    // tığ hairlines radiating outwards (the tezhip "rays")
    pc.strokeStyle = '#B98E3E'; pc.lineWidth = Math.max(0.7, R * 0.006);
    const nT = 48;
    for (let i = 0; i < nT; i++) {
      const u = i / nT;
      if (u > pp) break;
      const ang = a0 + u * E.TAU;
      const len = R * (i % 2 ? 0.07 : 0.12) * clamp((pp - u) * 10);
      const r0 = R + band * 1.25;
      pc.globalAlpha = 0.55;
      pc.beginPath(); pc.moveTo(Math.cos(ang) * r0, ry + Math.sin(ang) * r0); pc.lineTo(Math.cos(ang) * (r0 + len), ry + Math.sin(ang) * (r0 + len)); pc.stroke();
    }
    pc.restore();
    // a glint riding the drawing head
    if (pp > 0.01 && pp < 0.99) {
      const ang = a1;
      E.glow(L.light, Math.cos(ang) * (R + band * 0.5), ry + Math.sin(ang) * (R + band * 0.5), R * 0.22, '#FFE2A0', 0.6);
    }
  }

  /**
   * The world-page: the personal world (prop) seen through a round window in a sheet of fine paper.
   * o: {x, y, s, rot, R, ry, clip (Path2D world, optional), paper (alpha), glow, life, t, border, lines,
   *     constr, ring, lift, shadow, holeR (world radius of the hole override), extra(L) page-local content}
   */
  function worldPage(L, o) {
    const pg = { x: o.x, y: o.y, s: o.s, rot: o.rot };
    const ratio = o.ratio ?? RATIO;
    const [wx, wy] = toWorld(pg, 0, o.ry);
    const rp = (o.R * o.s) / ratio;          // prop radius (world)
    const holeR = o.R * o.s;                 // hole radius (world)
    // 1) the personal world, rotated with the page
    E.save(L);
    E.translate(L, wx, wy);
    E.rotate(L, o.rot);
    if (o.squash) E.scale(L, o.squash[0], o.squash[1]);
    PR.personalWorld(L, 0, 0, rp, { t: o.t, glow: o.glow, life: o.life, kind: 'home', doorOpen: 1 });
    E.restore(L);
    // 2) the sheet (clipped to the spreading outline, with a round window)
    if (o.paper > 0.001) {
      E.save(L);
      const hole = new Path2D();
      hole.rect(-4000, -4000, 9000, 9000);
      hole.addPath(circlePath(wx, wy, holeR));
      E.each(L, (c) => { if (o.clip) c.clip(o.clip); c.clip(hole, 'evenodd'); });
      PR.page(L, pg.x, pg.y, PW * pg.s, PH * pg.s, {
        rot: pg.rot, t: o.t, border: o.border, lines: 0, alpha: o.paper, lift: o.lift || 0, shadow: o.shadow !== false, curl: o.curl || 0,
        content: (L2) => {
          E.save(L2);
          E.scale(L2, pg.s);
          pageGuides(L2, { lines: o.lines, constr: o.constr, ry: o.ry, R: o.R });
          if (o.extra) o.extra(L2);
          E.restore(L2);
        },
      });
      E.restore(L);
      // 3) the window's edge: a light pencil circle, then the gold ring
      E.save(L);
      E.translate(L, pg.x, pg.y);
      E.rotate(L, pg.rot);
      E.scale(L, pg.s);
      if (o.paper > 0.05) E.pencil(L.ink, circlePath(0, o.ry, o.R), { w: 1.2 / pg.s, a: 0.32 * o.paper * (1 - 0.6 * clamp(o.ring || 0)) });
      goldRing(L, o.R, o.ry, o.ring || 0, o.t);
      E.restore(L);
    }
    return { wx, wy, rp };
  }

  // ---------------- the end state of s04 (life-light pillar, centre pulse, open door, construction) ----------------
  // Re-drawn here so the cut from s04 is seamless; it dissolves before "Belki".
  const heartbeat = (t) => {
    const ph = ((t * 1.18) % 1 + 1) % 1;
    return Math.exp(-Math.pow(ph / 0.055, 2)) + Math.exp(-Math.pow((ph - 1) / 0.055, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.2) / 0.06, 2));
  };
  const ellPts = (cx, cy, rx, ry, a0, a1, n = 48) => {
    const o = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return o;
  };
  function s04Residue(L, t, a) {
    if (a <= 0.005) return;
    const R = 300, U = 3;
    // construction drawing (complete, at the faded alpha s04 ends with)
    L.ink.save();
    L.ink.globalAlpha *= 0.25 * a;
    [[ellPts(0, 0, R * 1.035, R * 1.035, -Math.PI / 2, Math.PI * 1.5, 96), 0.3], [ellPts(0, 10 * U, R * 0.995, R * 0.16, Math.PI, 3 * Math.PI, 72), 0.46],
      [ellPts(0, 0, R * 0.72, R, Math.PI, 2 * Math.PI, 48), 0.36], [ellPts(0, 0, R * 0.38, R, Math.PI, 2 * Math.PI, 48), 0.34],
      [ellPts(0, -R * 0.52, R * 0.854, R * 0.13, 0, E.TAU, 64), 0.3], [[[-R * 1.08, 0], [-R * 0.9, 0]], 0.3], [[[R * 0.9, 0], [R * 1.08, 0]], 0.3]]
      .forEach(([pts, al]) => E.pencil(L.ink, pts, { w: 1.5, a: al, double: true, seed: 5 }));
    L.ink.setLineDash([10, 9]);
    E.pencil(L.ink, [[0, -R * 1.26], [0, R * 1.26]], { w: 1.5, a: 0.42, double: false, seed: 5 });
    L.ink.setLineDash([]);
    L.ink.restore();
    const beat = heartbeat(t);
    // door light
    const dl = [-0.2 * R, 0.026 * R];
    E.glow(L.light, dl[0], dl[1], 22 * U * (1 + 0.25 * beat), '#FFC09C', (0.5 + 0.25 * beat) * a);
    E.rays(L.light, dl[0], dl[1] + 2 * U, { n: 7, len: 75 * U, spread: 0.6, angle: Math.PI / 2 + 0.08, width: 0.05, color: '#FFC09C', a: (0.34 + 0.12 * beat) * a, seed: 6, t: t - 10.35 });
    // the pillar of life-light
    const y0 = 93 * U, y1 = -91 * U, hw = 3 * U;
    E.save(L);
    E.alpha(L, a);
    E.pencil(L.ink, [[-hw, y0], [-hw, y1]], { w: 1.6, a: 0.42, seed: 3 });
    E.pencil(L.ink, [[hw, y0], [hw, y1]], { w: 1.6, a: 0.42, seed: 4 });
    E.pencil(L.ink, [[-hw * 2, y0], [hw * 2, y0]], { w: 1.6, a: 0.4, seed: 6 });
    E.pencil(L.ink, [[-hw * 1.9, y1], [hw * 1.9, y1]], { w: 1.6, a: 0.4, seed: 7 });
    const pc = L.paint;
    pc.save(); pc.globalCompositeOperation = 'multiply'; pc.globalAlpha *= 0.55; pc.fillStyle = '#F0A486'; pc.fill(E.rrect(-hw, y1, hw * 2, y0 - y1, hw * 0.6)); pc.restore();
    pc.save(); pc.globalCompositeOperation = 'multiply'; pc.globalAlpha *= 0.3; pc.fillStyle = E.shade('#F0A486', -0.35); pc.fill(E.rrect(hw * 0.25, y1, hw * 0.75, y0 - y1, hw * 0.3)); pc.restore();
    pc.save(); pc.globalAlpha *= 0.85; pc.fillStyle = '#ffffff'; pc.fill(E.rrect(-hw * 0.55, y1 + 4, hw * 0.4, y0 - y1 - 8, hw * 0.2)); pc.restore();
    const l = L.light;
    l.save(); l.globalCompositeOperation = 'lighter'; l.lineCap = 'round';
    const breathe = 0.85 + 0.15 * Math.sin(t * 2.4);
    for (const [lw, la] of [[hw * 8, 0.05], [hw * 4, 0.1], [hw * 1.8, 0.22], [hw * 0.6, 0.42]]) {
      l.globalAlpha *= 1; l.globalAlpha = la * breathe * (1 + 0.8 * beat) * a;
      l.strokeStyle = la > 0.3 ? '#FFF6E4' : '#FFC2A0'; l.lineWidth = lw;
      l.beginPath(); l.moveTo(0, y0 - hw * 0.5); l.lineTo(0, y1 + hw * 0.5); l.stroke();
    }
    l.restore();
    for (let j = 0; j < 4; j++) {
      const q = ((t * 0.95 + j / 4) % 1);
      E.glow(L.light, 0, E.lerp(y0, y1, q), hw * 2.2, '#FFF4D8', 0.5 * Math.sin(Math.PI * q) * a);
    }
    E.glow(L.light, 0, y1, 18 * U, '#FFC2A0', (0.35 + 0.35 * beat) * a);
    // the centre and its heartbeat rings
    const dotR = 3.2 * U * (1 + 0.35 * beat);
    E.wash(L.paint, E.blob(0, 0, dotR, { seed: 4, irr: 0.05 }), '#E8957C', { alpha: 0.75 });
    E.glow(L.light, 0, 0, 16 * U * (1 + 0.4 * beat), '#FFC0A0', (0.55 + 0.3 * beat) * a);
    E.pencil(L.ink, E.blob(0, 0, dotR * 1.25, { seed: 9, irr: 0.04 }), { w: 1.3, a: 0.4, double: false });
    const ph = ((t * 1.18) % 1 + 1) % 1;
    [E.clamp(ph / 0.7), E.clamp((ph - 0.2) / 0.7)].forEach((q) => {
      if (q <= 0.001 || q >= 0.999) return;
      const rr = (6 + 62 * E.ease.outCubic(q)) * U, al = (1 - q) * 0.6;
      const ring = new Path2D(); ring.arc(0, 0, rr, 0, E.TAU);
      E.pencil(L.ink, ring, { w: 1.4, a: 0.38 * al, double: false });
      pc.save(); pc.globalCompositeOperation = 'multiply'; pc.globalAlpha *= 0.4 * al; pc.strokeStyle = '#E8957C'; pc.lineWidth = 2.2 * U * (1 - q * 0.6); pc.stroke(ring); pc.restore();
    });
    E.restore(L);
  }

  E.scene('s05', {
    draw(L, lt, t) {
      // ---------------- camera: a slow push-in with a breath of drift ----------------
      const z = 1 + 0.035 * E.ease.inOutSine(seg(lt, 0, 3.9));
      const dx = 3 * E.drift(t, 51, 0.25), dy = 3 * E.drift(t, 52, 0.25);
      const FX = 540, FY = 710;

      // ---------------- sky (same family as s03) ----------------
      E.resetCamera(L);
      E.skyWash(L.paint, E.shade(P.cerulean, 0.46), E.shade(P.ochre, 0.62), { mid: E.shade(P.skyWash, 0.6), seed: 5, mottle: 0.16 });
      // far layer: large wet blooms drifting slowly (parallax 0.3)
      cam(L, z, FX, FY, dx, dy, 0.3);
      const bl = [[160, 330, 260, P.blush, 0.16, 3], [930, 520, 300, P.ochre, 0.14, 5], [220, 1240, 340, P.skyWash, 0.15, 8], [880, 1500, 300, P.blush, 0.1, 9]];
      bl.forEach(([x, y, r, c, a, s], i) => softBlob(L.paint, x + 14 * Math.sin(t * 0.21 + i), y + 10 * Math.cos(t * 0.17 + i * 2), r, c, a, 40, { seed: s, irr: 0.3 }));
      // middle layer: two bare-paper clouds drifting (parallax 0.55)
      cam(L, z, FX, FY, dx, dy, 0.55);
      PR.cloud(L, 168 + 9 * (t - 14.85), 292, 270, { seed: 6, t, alpha: 0.75 });
      PR.cloud(L, 912 - 7 * (t - 14.85), 1188, 250, { seed: 9, t, alpha: 0.62 });

      // ---------------- subject plane ----------------
      cam(L, z, FX, FY, dx, dy, 1);
      // opening progress
      const uh = E.ease.inOutCubic(seg(t, OPEN0, OPEN0 + 0.55)); // glass covered / window shrinks
      const paper = E.ease.outQuad(seg(t, OPEN0, OPEN0 + 0.38));
      const uR = E.ease.inOutCubic(seg(t, OPEN0 + 0.05, OPEN1 + 0.05)); // roundel shrinks
      // settle (page ready to write)
      const st = E.ease.inOutCubic(seg(t, SETTLE0 + 0.05, SETTLE0 + 0.6));
      const rot = -0.05 * E.spring(t, SETTLE0, 7, 0.62);
      const pageY = 690 - 8 * st;
      const pg = { x: 540, y: pageY, s: PS, rot };
      // roundel: centre (page-local design units) and radius
      const g0y = (720 - 690) / PS; // globe centre in page-local coordinates at the start
      let ry = lerp(g0y, ROUND_A.y, uR), R = lerp(300 * RATIO / PS, ROUND_A.R, uR);
      ry = lerp(ry, ROUND_B.y, st); R = lerp(R, ROUND_B.R, st);
      // before the opening the window shows the whole globe (ratio 1: hole = globe)
      const ratio = lerp(1, RATIO, uh);
      R = R / RATIO * ratio;
      // anticipation: the bubble draws a breath
      const br = bump(t, tBelki - 0.16, OPEN0 + 0.2);
      const squash = [1 - 0.022 * br, 1 - 0.03 * br];
      // ---- the globe peels open like a globe-map: its glass rim turns to paper and splits into gores that unfold
      //      outward to the page's corners and edges; then the gaps between them fill and the sheet squares off ----
      const pp = E.ease.outCubic(seg(t, OPEN0, OPEN0 + 0.5));           // the gores unfold
      const ff = E.ease.inOutCubic(seg(t, OPEN0 + 0.28, OPEN0 + 0.9));  // the gaps fill, corners square off
      const [ox, oy] = toWorld(pg, 0, ry);                              // polar origin = the roundel centre
      const rx0 = 540 - PW * PS / 2, rx1 = 540 + PW * PS / 2, ry0 = pageY - PH * PS / 2, ry1 = pageY + PH * PS / 2;
      const rRect = (th) => {
        const c = Math.cos(th), s = Math.sin(th);
        let d = 1e9;
        if (c > 1e-6) d = Math.min(d, (rx1 - ox) / c); else if (c < -1e-6) d = Math.min(d, (rx0 - ox) / c);
        if (s > 1e-6) d = Math.min(d, (ry1 - oy) / s); else if (s < -1e-6) d = Math.min(d, (ry0 - oy) / s);
        return d;
      };
      // gore tips: the four corners and the four edge midpoints, as seen from the roundel centre
      const tips = [[rx1, oy], [rx1, ry1], [ox, ry1], [rx0, ry1], [rx0, oy], [rx0, ry0], [ox, ry0], [rx1, ry0]].map(([x, y]) => Math.atan2(y - oy, x - ox));
      const angD = (a1, a2) => { let d = Math.abs(a1 - a2) % E.TAU; return d > Math.PI ? E.TAU - d : d; };
      const gore = (th) => {
        let v = 0;
        // rounded, lens-like gore tips (orange-peel / globe-map gores), not pointed star rays
        for (const tp of tips) { const d = angD(th, tp); if (d < 0.4) v = Math.max(v, Math.pow(Math.cos(0.5 * Math.PI * d / 0.4), 0.9)); }
        return v;
      };
      const rimR = lerp(300, 292, pp);
      const NOUT = 192;
      const outlinePts = [];
      for (let i = 0; i < NOUT; i++) {
        const th = (i / NOUT) * E.TAU, rr = rRect(th), rb = Math.min(rimR, rr);
        const r0 = rb + (rr - rb) * pp * gore(th) * (1 + 0.012 * E.fbm1(i / NOUT * 9, 7, 2));
        const r = lerp(Math.min(r0, rr), rr, ff);
        outlinePts.push([ox + Math.cos(th) * r, oy + Math.sin(th) * r]);
      }
      const opening = t > OPEN0 && ff < 0.999;
      const outline = polyPath(outlinePts);
      const clip = opening ? outline : (t <= OPEN0 ? circlePath(ox, oy, 300) : null);
      // fold creases between the gores (they fade as the paper relaxes)
      const creases = tips.map((tp, i) => {
        const tq = tips[(i + 1) % tips.length];
        let mid = (tp + tq) / 2;
        if (Math.abs(tq - tp) > Math.PI) mid += Math.PI;
        return mid;
      });
      // glow / life of the little world
      const pulse = bump(t, tAlem - 0.12, tAlem + 1.0);
      const glow = lerp(0.9, 0.24, E.ease.inOutSine(seg(t, 14.95, OPEN0 + 0.5))) + 0.42 * pulse + 0.15 * st;
      const ring = seg(t, tAlem - 0.08, tAlem + 0.5);
      const border = seg(t, tSahife - 0.2, tSahife + 0.55);
      const lines = seg(t, tSahife + 0.12, tSahife + 0.8);
      const constr = { p: seg(t, OPEN1 - 0.3, OPEN1 + 0.6), a: 1.15 * (1 - E.ease.inOutSine(seg(t, tSahife + 0.05, tSahife + 0.75))) };

      const res = worldPage(L, {
        x: pg.x, y: pg.y, s: PS, rot, R, ry, ratio, clip, paper, glow, life: 1, t, border, lines, constr, ring,
        squash: br > 0 ? squash : null,
        // the freshly unfolded sheet still has a curled corner that relaxes flat
        curl: 0.32 * E.ease.outCubic(seg(t, OPEN0 + 0.45, OPEN1)) * (1 - E.ease.inOutSine(seg(t, OPEN1, OPEN1 + 0.9))),
      });

      // the unfolding wet edge: glass-blue tint and soap-film colours that dry to paper, a pencil contour
      if (opening) {
        const fade = Math.pow(1 - ff, 1.4) * Math.min(1, pp * 3);
        E.save(L);
        const hole = new Path2D(); hole.rect(-4000, -4000, 9000, 9000); hole.addPath(circlePath(res.wx, res.wy, R * PS));
        E.each(L, (c) => { c.clip(outline); c.clip(hole, 'evenodd'); });
        const pc = L.paint;
        pc.save(); pc.globalCompositeOperation = 'multiply'; pc.lineJoin = 'round';
        // a feathered glass-blue rim (stacked strokes, no hard inner edge)
        for (const [w, al] of [[44, 0.05], [30, 0.06], [18, 0.08], [8, 0.12]]) { pc.strokeStyle = E.rgba('#9FAACB', al * fade); pc.lineWidth = w; pc.stroke(outline); }
        pc.restore();
        // iridescent soap-film colours riding the gore tips
        const cols = ['#EDA9C2', '#A6D3E8', '#F3D48A', '#B5A6E0'];
        tips.forEach((tp, i) => {
          const rr = lerp(rimR, rRect(tp), pp * (1 - ff * 0.2)) * 0.9;
          softBlob(pc, ox + Math.cos(tp) * rr, oy + Math.sin(tp) * rr, 26, cols[i % 4], 0.3 * fade, 6, { rx: 30, ry: 12, rot: tp + Math.PI / 2, seed: i + 2, irr: 0.25 });
        });
        // the folds: a valley shade + pencil crease from the rim outward between neighbouring gores
        const cr = E.ease.inOutSine(seg(ff, 0.05, 0.35)) * (1 - E.ease.inOutSine(seg(ff, 0.45, 0.95))); // seams close up as the gaps fill
        if (cr > 0.01) creases.forEach((th, i) => {
          const r0 = R * PS + 5, r1 = lerp(r0, rRect(th) * 0.93, ff);
          if (r1 - r0 < 4) return;
          const pts = [[ox + Math.cos(th) * r0, oy + Math.sin(th) * r0], [ox + Math.cos(th) * r1, oy + Math.sin(th) * r1]];
          pc.save(); pc.globalCompositeOperation = 'multiply'; pc.strokeStyle = E.rgba('#D2C8B8', 0.22 * cr); pc.lineWidth = 11; pc.lineCap = 'round';
          pc.beginPath(); pc.moveTo(pts[0][0], pts[0][1]); pc.lineTo(pts[1][0], pts[1][1]); pc.stroke(); pc.restore();
          E.pencil(L.ink, pts, { w: 0.9, a: 0.1 * cr, double: false, seed: 40 + i });
        });
        E.restore(L);
        // pencil contour of the unfolding sheet + a soft light on its rim
        E.pencil(L.ink, outline, { w: 1.7, a: 0.5 * Math.min(1, fade * 1.6), seed: 5 });
        L.light.save(); L.light.globalCompositeOperation = 'lighter'; L.light.lineJoin = 'round';
        L.light.strokeStyle = E.rgba('#FFF4DC', 0.32 * fade); L.light.lineWidth = 9; L.light.stroke(outline);
        L.light.restore();
      }

      // the end state of s04, dissolving before "Belki"
      const resA = 1 - E.ease.inOutSine(seg(t, 14.93, tBelki - 0.02));
      if (resA > 0) {
        E.save(L);
        E.translate(L, res.wx, res.wy);
        if (br > 0) E.scale(L, squash[0], squash[1]);
        s04Residue(L, t, resA);
        E.restore(L);
      }

      // "âlemimiz": the little realm warms from within
      if (pulse > 0) {
        E.glow(L.light, res.wx, res.wy, R * PS * 1.6, '#FFD890', 0.26 * pulse);
      }

      // bubble glint on the breath (just before it opens)
      const gl = bump(t, tBelki - 0.12, OPEN0 + 0.28);
      if (gl > 0) {
        const gx = 540 - 0.5 * 300 * squash[0], gy = 720 - 0.58 * 300 * squash[1];
        E.glow(L.light, gx, gy, 90, '#FFFFFF', 0.55 * gl);
        L.light.save(); L.light.globalCompositeOperation = 'lighter';
        L.light.strokeStyle = E.rgba('#FFFFFF', 0.7 * gl); L.light.lineWidth = 2.5;
        const sp = 46 * gl;
        L.light.beginPath(); L.light.moveTo(gx - sp, gy); L.light.lineTo(gx + sp, gy); L.light.moveTo(gx, gy - sp * 0.8); L.light.lineTo(gx, gy + sp * 0.8); L.light.stroke();
        L.light.restore();
      }

      // "catching light": a soft gleam sweeps diagonally across the settled page
      const gs = seg(t, tSahife + 0.25, tSahife + 0.95);
      if (gs > 0 && gs < 1) {
        E.save(L);
        E.translate(L, pg.x, pg.y); E.rotate(L, rot);
        const sheet = new Path2D(); sheet.rect(-PW * PS / 2, -PH * PS / 2, PW * PS, PH * PS);
        L.light.clip(sheet);
        const pos = lerp(-PW * PS * 1.1, PW * PS * 1.1, E.ease.inOutSine(gs));
        const gg = L.light.createLinearGradient(pos - 120, pos * 0.4 - 120 * 0.4, pos + 120, pos * 0.4 + 120 * 0.4);
        gg.addColorStop(0, 'rgba(255,248,230,0)'); gg.addColorStop(0.5, 'rgba(255,248,230,0.28)'); gg.addColorStop(1, 'rgba(255,248,230,0)');
        L.light.save(); L.light.globalCompositeOperation = 'lighter'; L.light.fillStyle = gg; L.light.fillRect(-PW, -PH, PW * 2, PH * 2); L.light.restore();
        E.restore(L);
      }

      // near layer: a few warm motes drifting past (parallax 1.35)
      cam(L, z, FX, FY, dx, dy, 1.35);
      E.motes(L.light, { x: 0, y: 200, w: 1080, h: 1100, n: 14, t, seed: 55, color: '#FFF1D2', size: 2.6, a: 0.45, rise: 18 });
    },
    sfx() {
      return [
        { t: tBelki - 0.08, type: 'bloom', gain: 0.32 },
        { t: OPEN0 + 0.05, type: 'page', gain: 0.32 },
        { t: OPEN0 + 0.1, type: 'swell', gain: 0.22, dur: 0.9 },
        { t: tAlem - 0.05, type: 'chime', gain: 0.16, pitch: 1.5 },
        { t: tSahife - 0.18, type: 'sparkle', gain: 0.22 },
        { t: tSahife + 0.15, type: 'pen', gain: 0.1, dur: 0.6 },
      ];
    },
  });
})();
