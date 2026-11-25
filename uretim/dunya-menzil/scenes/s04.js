/* s04 · 10.35–14.85 · "Fakat direği, merkezi, kapısı, hayatımızdır."
   Close on the man's personal world (arriving through the s03 zoom). "Fakat" 10.70: its structure is revealed
   like a cutaway drawing — pencil construction lines (axis, floor disc, dome ribs) · "direği" 11.10: a central
   pillar lights from bottom to top, label "direk" · "merkezi" 11.96: the centre pulses with concentric rings,
   label "merkez" · "kapısı" 12.98: the little door opens, warm light spills, label "kapı" · "hayatımızdır"
   13.62: the camera dips to reveal the man below; a luminous life-thread rises from his heart into the world and
   IS the pillar, the centre's pulse and the door's light (one rose-gold light, beating with his heart); the
   labels fade; the camera rides the light back up and settles on the world centred at (540, 720), r = 300
   (s05 cuts in on that composition). */
(function () {
  const E = window.E;
  const PR = E.props;
  const P = E.P;

  const GX = 540, GY = 720, GR = 300;                    // the world in the final frame (camera at rest)
  const U = GR / 100;                                     // personal-world local unit → px
  const DOOR = PR.personalWorldDoor(GX, GY, GR);
  const MAN_H = 430, MAN_FEET = 1252, MAN_X = 390;        // the man at the reveal (screen, k = 1)

  // ------------------------------------------------------------------------------------------ timing (local s)
  let TT = null;
  const tm = (shot) => {
    if (TT) return TT;
    const L0 = (i) => E.T(i) - shot.start;
    TT = { fakat: L0(21), direk: L0(22), merkez: L0(23), kapi: L0(24), hayat: L0(25), hayatE: E.Te(25) - shot.start, end: shot.dur };
    return TT;
  };

  // ------------------------------------------------------------------------------------------ the zoom in from s03
  // The scheduler's zoom (main.js) shows s03 magnified by sA = 1 + 2.4·inOutCubic(mix) and this shot scaled by
  // sB = 0.55 + 0.45·outCubic(mix) about (540, 760), mix = lt / 0.7. s03 holds the man's world at (540, 760) with
  // screen radius 88·e^(0.16·(lt3 − 4.5)). So the globe here sits at (540, 760) with radius rs·sA / sB: the two
  // bubbles coincide on screen through the whole cross-fade, and the push-in carries on with the same speed.
  const ZOOM = { dur: 0.7, cy: 760, r0: 88, k: 0.16 };
  function zoomMatch(lt) {
    const mix = E.clamp(lt / ZOOM.dur);
    const sA = 1 + 2.4 * E.ease.inOutCubic(mix), sB = 0.55 + 0.45 * E.ease.outCubic(mix);
    return (ZOOM.r0 * Math.exp(ZOOM.k * lt) * sA) / (sB * GR);
  }
  const Z07 = zoomMatch(ZOOM.dur);

  // ------------------------------------------------------------------------------------------ soft paint
  // E.softFill / E.wash{soft} / E.bloom land displaced by ≈ 20000·(scale − 1) px on GPU canvases under a scaled
  // transform (engine bug); soft() bakes the transform into the path and blurs under the identity instead.
  const SOFF = 30000;
  function soft(ctx, path, color, alpha, blur, mode) {
    if (alpha <= 0.003) return;
    const m = ctx.getTransform();
    const sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    ctx.save();
    ctx.globalCompositeOperation = mode || 'multiply';
    ctx.globalAlpha *= alpha;
    const p2 = new Path2D();
    p2.addPath(path, new DOMMatrix([m.a, m.b, m.c, m.d, m.e - SOFF, m.f]));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0.5, blur * sc * 2);
    ctx.shadowOffsetX = SOFF;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fill(p2);
    ctx.restore();
  }
  const circle = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.1, r), 0, E.TAU); return p; };
  const herm = (t, K) => {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) {
      if (t <= K[i][0]) {
        const [t0, v0, d0] = K[i - 1], [t1, v1, d1] = K[i];
        const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
        return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * h * d0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * h * d1;
      }
    }
    return K[K.length - 1][1];
  };

  // ------------------------------------------------------------------------------------------ small helpers
  const heartbeat = (t) => {
    const ph = ((t * 1.18) % 1 + 1) % 1;
    return Math.exp(-Math.pow(ph / 0.055, 2)) + Math.exp(-Math.pow((ph - 1) / 0.055, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.2) / 0.06, 2));
  };
  /** partial polyline (first fraction p of its length) */
  function partial(pts, p) {
    if (p >= 1) return pts;
    if (p <= 0) return [pts[0], pts[0]];
    let tot = 0;
    const seg = [];
    for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); tot += d; }
    let want = tot * p;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (want <= seg[i - 1]) {
        const u = want / seg[i - 1];
        out.push([E.lerp(pts[i - 1][0], pts[i][0], u), E.lerp(pts[i - 1][1], pts[i][1], u)]);
        return out;
      }
      want -= seg[i - 1];
      out.push(pts[i]);
    }
    return out;
  }
  const ellPts = (cx, cy, rx, ry, a0, a1, n = 48) => {
    const o = [];
    for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * (i / n); o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
    return o;
  };
  /** stroke a polyline on a context (no catmull: exact) */
  function poly(ctx, pts) {
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  }

  /** luminous line: watercolour glaze + bare-paper core + light (all layers in the current transform) */
  function lightLine(L, pts, { w = 10, col = '#E9A27F', core = '#FFF6E6', glowC = '#FFC79A', a = 1, glowA = 1 } = {}) {
    if (a <= 0.01 || pts.length < 2) return;
    const p = L.paint;
    p.save();
    p.lineCap = 'round'; p.lineJoin = 'round';
    p.globalCompositeOperation = 'multiply';
    p.globalAlpha *= 0.3 * a;
    p.strokeStyle = col; p.lineWidth = w * 2.2;
    poly(p, pts); p.stroke();
    p.globalAlpha /= 0.3; p.globalAlpha *= 0.55 * a;
    p.lineWidth = w * 0.9;
    poly(p, pts); p.stroke();
    p.globalCompositeOperation = 'source-over';
    p.globalAlpha /= 0.55; p.globalAlpha *= 0.95 * a;
    p.strokeStyle = core; p.lineWidth = w * 0.32;
    poly(p, pts); p.stroke();
    p.restore();
    const l = L.light;
    l.save();
    l.lineCap = 'round'; l.lineJoin = 'round';
    l.globalCompositeOperation = 'lighter';
    for (const [lw, la] of [[w * 4.2, 0.07], [w * 2.2, 0.14], [w * 0.9, 0.35], [w * 0.35, 0.6]]) {
      l.globalAlpha = la * a * glowA;
      l.strokeStyle = glowC; l.lineWidth = lw;
      poly(l, pts); l.stroke();
    }
    l.restore();
  }

  // ------------------------------------------------------------------------------------------ camera
  /** dip: 0 = on the world, 1 = revealing the man below */
  function dipOf(lt, T) {
    // (sine easing and a 0.61 s exit: the man and his near meadow, the nearest layer, peak at ≈ 120 / 160 px per frame)
    const a = E.ep(lt, T.hayat - 0.32, T.hayat + 0.18, 'inOutSine');
    const b = E.ep(lt, T.end - 0.62, T.end - 0.01, 'inOutSine');
    return a * (1 - b);
  }
  function camOf(lt, T) {
    // arriving through the zoom: exactly on the s03 bubble (see ZOOM)
    if (lt <= ZOOM.dur) return { k: 0, gx: 540, gy: ZOOM.cy, z: zoomMatch(lt) };
    // then the push-in decelerates and carries on slowly through the three beats, easing toward the door
    const dx = E.tween(lt, [[0, 0], [T.kapi - 0.1, 0], [T.kapi + 0.5, 26], [T.hayat - 0.3, 20], [T.hayat + 0.2, 0]]);
    const gyB = herm(lt, [[ZOOM.dur, ZOOM.cy, 0], [T.direk + 0.5, 776, 18], [T.merkez + 0.45, 788, 10], [T.kapi + 0.5, 798, 4], [T.hayat - 0.3, 800, 0]]);
    const zB = herm(lt, [[ZOOM.dur, Z07, ZOOM.k * Z07], [1.5, 1.18, 0.035], [T.merkez + 0.4, 1.225, 0.03], [T.kapi + 0.5, 1.262, 0.012], [T.hayat - 0.3, 1.27, 0]]);
    const back = E.ep(lt, T.hayat - 0.3, T.hayat + 0.3, 'inOutCubic');   // (the dip: the world rides up, see dipOf)
    const z = E.lerp(zB, 1.0, back), gy = E.lerp(gyB, GY, back);
    const k = dipOf(lt, T);
    const dr = E.ep(lt, ZOOM.dur, ZOOM.dur + 0.8);                         // handheld drift fades in after the zoom
    return {
      k,
      gx: GX + dx * (1 - k) + 2.5 * E.drift(lt, 2, 0.4) * dr,
      gy: gy * (1 - k) + (GY - 222) * k + 2 * E.drift(lt, 5, 0.35) * dr,
      z: E.lerp(z, 0.86, k),
    };
  }
  /** set the globe-plane transform: local personal-world units (±100) around the globe centre */
  function globeXf(L, c) {
    for (const k of ['paint', 'ink', 'light']) L[k].setTransform(c.z, 0, 0, c.z, c.gx, c.gy);
  }
  const gpt = (c, x, y) => [c.gx + x * c.z, c.gy + y * c.z];

  // ------------------------------------------------------------------------------------------ the drawing parts
  /** pencil construction drawing over the globe (local px around the centre, scale = c.z) */
  function construction(L, p, a) {
    if (p <= 0 || a <= 0.01) return;
    const R = GR;
    const ink = L.ink;
    const W = 1.5;
    const seq = [
      // [points, start, end, alpha, dashed]
      [ellPts(0, 0, R * 1.035, R * 1.035, -Math.PI / 2, Math.PI * 1.5, 96), 0.0, 0.42, 0.3, false], // compass circle
      [[[0, -R * 1.26], [0, R * 1.26]], 0.05, 0.38, 0.42, true],                      // axis
      [ellPts(0, 10 * U, R * 0.995, R * 0.16, Math.PI, 3 * Math.PI, 72), 0.12, 0.55, 0.46, false], // floor disc
      [ellPts(0, 0, R * 0.72, R, Math.PI, 2 * Math.PI, 48), 0.3, 0.72, 0.36, false],    // dome ribs
      [ellPts(0, 0, R * 0.38, R, Math.PI, 2 * Math.PI, 48), 0.36, 0.78, 0.34, false],
      [ellPts(0, -R * 0.52, R * 0.854, R * 0.13, 0, E.TAU, 64), 0.45, 0.88, 0.3, false], // latitude ring
      [[[-R * 1.08, 0], [-R * 0.9, 0]], 0.6, 0.75, 0.3, false],                         // centre ticks
      [[[R * 0.9, 0], [R * 1.08, 0]], 0.62, 0.77, 0.3, false],
    ];
    ink.save();
    ink.globalAlpha *= a;
    for (const [pts, s0, s1, al, dashed] of seq) {
      const q = E.seg(p, s0, s1);
      if (q <= 0) continue;
      const part = partial(pts, E.ease.inOutSine(q));
      if (dashed) ink.setLineDash([10, 9]);
      E.pencil(ink, part, { w: W, a: al, double: !dashed, seed: 5 });
      ink.setLineDash([]);
    }
    ink.restore();
  }

  /** spark phase along the pillar: speed 0.55 → 0.95 while his life climbs it (integrated, so no jump);
      equal to 0.95·t from tl1 on (as s05 redraws it) */
  function sparkPhase(t, tl0, tl1) {
    if (t >= tl1) return 0.95 * t;
    const d = tl1 - tl0, u = E.clamp((t - tl0) / d);
    const rest = (d / 2) * ((1 - u) - Math.sin(Math.PI * u) / Math.PI) + Math.max(0, tl0 - t);
    return 0.95 * t - 0.4 * rest;
  }

  /** the pillar (direk): pencil outline, then gold light rising bottom → top (rise). front 0..1: his rose
      life-light climbing it from the base (rose below the front, beating with his heart). */
  function pillar(L, outline, rise, front, t, sph) {
    const y0 = 93 * U, y1 = -91 * U, hw = 3.0 * U;
    const ink = L.ink;
    if (outline > 0) {
      const q = E.ease.inOutSine(outline);
      const yTop = E.lerp(y0, y1, q);
      E.pencil(ink, [[-hw, y0], [-hw, yTop]], { w: 1.6, a: 0.42, seed: 3 });
      E.pencil(ink, [[hw, y0], [hw, yTop]], { w: 1.6, a: 0.42, seed: 4 });
      // base and capital
      E.pencil(ink, [[-hw * 2, y0], [hw * 2, y0]], { w: 1.6, a: 0.4 * E.seg(outline, 0, 0.3), seed: 6 });
      if (outline > 0.85) {
        const k = E.seg(outline, 0.85, 1);
        E.pencil(ink, [[-hw * 1.9, y1], [hw * 1.9, y1]], { w: 1.6, a: 0.4 * k, seed: 7 });
        E.pencil(ink, [[-hw * 1.4, y1 + 2.4 * U], [hw * 1.4, y1 + 2.4 * U]], { w: 1.3, a: 0.3 * k, seed: 8 });
      }
    }
    if (rise <= 0) return;
    const yEdge = E.lerp(y0, y1, E.ease.inOutCubic(rise));
    const yF = Math.max(yEdge, E.lerp(y0, y1, front));
    const beat = heartbeat(t);
    const breathe = 0.85 + 0.15 * Math.sin(t * 2.4);
    // one stretch of the shaft [yb (top) .. ya (bottom)] in a colour
    const stretch = (ya, yb, col, glowC, bt) => {
      if (ya - yb < 0.5) return;
      E.save(L);
      const cl = new Path2D(); cl.rect(-hw * 7, yb, hw * 14, ya - yb);
      L.paint.clip(cl); L.light.clip(cl);
      const shaft = E.rrect(-hw, yEdge, hw * 2, y0 - yEdge, hw * 0.6);
      E.wash(L.paint, shaft, col, { alpha: 0.55 });
      E.wash(L.paint, E.rrect(hw * 0.25, yEdge, hw * 0.75, y0 - yEdge, hw * 0.3), E.shade(col, -0.35), { alpha: 0.3 });
      const l = L.light;
      l.globalCompositeOperation = 'lighter';
      l.lineCap = 'round';
      for (const [lw, la] of [[hw * 8, 0.05], [hw * 4, 0.1], [hw * 1.8, 0.22], [hw * 0.6, 0.42]]) {
        l.globalAlpha = la * breathe * (1 + 0.8 * bt);
        l.strokeStyle = la > 0.3 ? '#FFF6E4' : glowC;
        l.lineWidth = lw;
        l.beginPath(); l.moveTo(0, y0 - hw * 0.5); l.lineTo(0, yEdge + hw * 0.5); l.stroke();
      }
      E.restore(L);
    };
    stretch(y0, yF, '#F0A486', '#FFC2A0', beat);           // his life (rose-gold, as s05 redraws it)
    stretch(yF, yEdge, '#F2C66E', '#FFDC8E', 0);            // the gold pillar of light
    E.lift(L.paint, E.rrect(-hw * 0.55, yEdge + 4, hw * 0.4, Math.max(0, y0 - yEdge - 8), hw * 0.2), 0.85);
    // sparks travelling up the shaft
    for (let j = 0; j < 4; j++) {
      const q = ((sph + j / 4) % 1);
      const yy = E.lerp(y0, y1, q);
      if (yy < yEdge) continue;
      E.glow(L.light, 0, yy, hw * 2.2, '#FFF4D8', 0.5 * Math.sin(Math.PI * q));
    }
    // the rising head of the gold light, then the climbing head of his life, then the capital
    if (rise < 1) E.glow(L.light, 0, yEdge, 26 * U, '#FFF0C8', 0.8);
    else if (front > 0 && front < 1) {
      E.glow(L.light, 0, yF, 24 * U, '#FFD2BC', 0.75);
      E.glow(L.light, 0, yF, 7 * U, '#FFF8F0', 0.9);
      E.glow(L.light, 0, y1, 18 * U, '#FFDC8E', 0.35);
    } else if (front >= 1) E.glow(L.light, 0, y1, 18 * U, '#FFC2A0', 0.35 + 0.35 * beat);
    else E.glow(L.light, 0, y1, 18 * U, '#FFDC8E', 0.35);
  }

  /** the centre: a lit point with concentric rings. life 0..1 = his rose life (beats with his heart) */
  function centre(L, lt, t0, life, t) {
    const k = E.ep(lt, t0 - 0.05, t0 + 0.3, 'outBack');
    if (k <= 0) return;
    const col = E.mix('#E8B85E', '#E8957C', life);
    const glowC = E.mix('#FFE19A', '#FFC0A0', life);
    const beat = life * heartbeat(t);
    // point
    const dotR = 3.2 * U * (0.6 + 0.4 * k) * (1 + 0.35 * beat);
    E.wash(L.paint, E.blob(0, 0, dotR, { seed: 4, irr: 0.05 }), col, { alpha: 0.75 });
    E.glow(L.light, 0, 0, 16 * U * (1 + 0.4 * beat), glowC, 0.55 * k + 0.3 * beat);
    E.pencil(L.ink, E.blob(0, 0, dotR * 1.25, { seed: 9, irr: 0.04 }), { w: 1.3, a: 0.4 * k, double: false });
    // rings: three on the word, then a slow continuing pulse, then (his life) two rings on every heartbeat
    const rings = [];
    for (let i = 0; i < 3; i++) rings.push([E.seg(lt, t0 + i * 0.2, t0 + i * 0.2 + 1.1), 1]);
    if (lt > t0 + 0.8) rings.push([((lt - t0 - 0.8) / 1.15) % 1, 0.6 * (1 - life)]);
    if (life > 0) { const ph = ((t * 1.18) % 1 + 1) % 1; rings.push([E.clamp(ph / 0.7), 0.6 * life]); rings.push([E.clamp((ph - 0.2) / 0.7), 0.6 * life]); }
    for (const [q, am] of rings) {
      if (q <= 0.001 || q >= 0.999 || am <= 0.005) continue;
      const rr = (6 + 62 * E.ease.outCubic(q)) * U;
      const al = (1 - q) * am;
      const ring = new Path2D(); ring.arc(0, 0, rr, 0, E.TAU);
      E.pencil(L.ink, ring, { w: 1.4, a: 0.38 * al, double: false });
      const pc = L.paint;
      pc.save();
      pc.globalCompositeOperation = 'multiply';
      pc.globalAlpha *= 0.4 * al;
      pc.strokeStyle = col; pc.lineWidth = 2.2 * U * (1 - q * 0.6);
      pc.stroke(ring);
      pc.restore();
      const l = L.light;
      l.save(); l.globalCompositeOperation = 'lighter'; l.globalAlpha = 0.35 * al;
      l.strokeStyle = glowC; l.lineWidth = 3 * U; l.stroke(ring); l.restore();
    }
  }

  /** pencil label with a small arrow (screen-ish coords in the globe frame) */
  function label(L, text, x, y, ax, ay, bx, by, p, a, align = 'center') {
    if (p <= 0 || a <= 0.01) return;
    L.ink.save();
    L.ink.globalAlpha *= a;
    E.note(L.ink, text, x, y, { size: 58, p: E.clamp(p * 1.25), alpha: 0.82, align });
    E.arrow(L.ink, [ax, ay], [bx, by], { p: E.ease.inOutSine(E.seg(p, 0.35, 1)), w: 2, alpha: 0.6, head: 13, bend: 0.18 });
    L.ink.restore();
  }

  /** the near meadow he stands on (screen space): moves rigidly with him, so his feet stay planted while the far
      land (PR.ground) glides by more slowly behind — true parallax for the camera's dip. top = its crest line y
      near his feet; drawn from the crest to below the frame. Calm, low contrast (it lies behind the subtitles). */
  const MEADOW = { near: '#97BF69', fore: '#7AA758', dark: '#557F45', flowers: ['#FBF3E2', '#EDBF55', '#DD6A7A'] };
  function nearMeadow(L, top, t) {
    if (top > E.H + 40) return;
    const x0 = -80, x1 = E.W + 80, bot = Math.max(top + 300, E.H + 80);
    const crest = (x) => top + 16 * E.fbm1(x * 0.0035 + 3.7, 21, 3) + 9 * Math.sin(x * 0.0052 + 1.3);
    const pts = [];
    for (let x = x0; x <= x1 + 1; x += 36) pts.push([x, crest(x)]);
    const band = E.smoothPath(pts.concat([[x1 + 40, bot], [x0 - 40, bot]]), true);
    const p = L.paint;
    E.wash(p, band, MEADOW.near, { mode: 'over' });
    for (const k of [L.ink, L.light]) { k.save(); k.globalCompositeOperation = 'destination-out'; k.fill(band); k.restore(); }
    // depth: deepening toward the bottom, a sunlit crest along the top
    E.wash(p, band, '#ffffff', { grad: { from: [0, top], to: [0, top + 760], stops: [[0, 'rgba(255,255,255,0)'], [1, E.rgba(MEADOW.dark, 0.42)]] } });
    p.save(); p.clip(band);
    const strip = E.smoothPath(pts.map(([x, y]) => [x, y + 1]).concat(pts.slice().reverse().map(([x, y]) => [x, y + 30])), true);
    E.wash(p, strip, '#ffffff', { mode: 'over', alpha: 0.32, soft: 4 });
    // a lower, darker fold of the meadow and a few soft cloud-shadow patches
    const fpts = [];
    for (let x = x0; x <= x1 + 1; x += 40) fpts.push([x, top + 330 + 22 * E.fbm1(x * 0.003 + 9.1, 23, 3)]);
    E.wash(p, E.smoothPath(fpts.concat([[x1 + 40, bot], [x0 - 40, bot]]), true), MEADOW.fore, { alpha: 0.35 });
    E.wash(p, E.blob(300, top + 210, 120, { rx: 260, ry: 34, seed: 31, irr: 0.3 }), MEADOW.dark, { alpha: 0.1, soft: 14 });
    E.wash(p, E.blob(830, top + 470, 120, { rx: 300, ry: 40, seed: 33, irr: 0.3 }), MEADOW.dark, { alpha: 0.1, soft: 16 });
    p.restore();
    E.pencil(L.ink, pts, { w: 1.1, a: 0.12, double: false, seed: 9 });
    // sparse grass tufts swaying, and flower dots (fixed in the meadow)
    const r = E.rng(77);
    const gs = new Path2D();
    for (let i = 0; i < 26; i++) {
      const x = x0 + r() * (x1 - x0), v = r(), yy = top + 40 + v * 560;
      const hh = 7 + 12 * v, sw = Math.sin(t * 1.2 + x * 0.02) * hh * 0.12;
      for (let j = -1; j <= 1; j++) { gs.moveTo(x + j * hh * 0.18, yy); gs.quadraticCurveTo(x + j * hh * 0.3 + sw * 0.5, yy - hh * 0.6, x + j * hh * 0.5 + sw, yy - hh * (1 - Math.abs(j) * 0.25)); }
    }
    p.save(); p.globalCompositeOperation = 'multiply'; p.strokeStyle = E.rgba(MEADOW.dark, 0.32); p.lineWidth = 1.1; p.stroke(gs); p.restore();
    const byCol = MEADOW.flowers.map(() => new Path2D());
    for (let i = 0; i < 30; i++) {
      const v = Math.pow(r(), 0.8), x = x0 + r() * (x1 - x0), yy = top + 50 + v * 560, sz = 1.4 + 2.6 * v;
      const ci = Math.floor(r() * byCol.length);
      for (let j = 0; j < 3; j++) { const c = new Path2D(); c.arc(x + (r() - 0.5) * 9 * sz, yy + (r() - 0.5) * 3 * sz, sz * (0.7 + r() * 0.5), 0, E.TAU); byCol[ci].addPath(c); }
    }
    byCol.forEach((q, i) => E.wash(p, q, MEADOW.flowers[i], { mode: 'over', alpha: 0.85 }));
  }

  E.scene('s04', {
    draw(L, lt, t, shot) {
      const T = tm(shot);
      const c = camOf(lt, T);
      // "hayatımızdır": the life-thread rises from his heart (TH0 → TH1), his rose light climbs the pillar from the
      // base (→ FR1, landing on his heartbeat at 14.41), passing the centre, reaching the door; from then on all
      // three beat with his heart
      const TH0 = T.hayat - 0.04, TH1 = T.hayat + 0.36, FR1 = T.hayat + 0.785;
      const front = E.ep(lt, TH1, FR1, 'outSine');
      const lifeC = E.ep(lt, T.hayat + 0.46, T.hayat + 0.62, 'inOutSine');
      const lifeD = E.ep(lt, T.hayat + 0.55, T.hayat + 0.8, 'inOutSine');
      const life = E.ep(lt, T.hayat + 0.1, T.hayat + 0.7, 'inOutSine');      // labels / veil / drawing recede

      // ---------------------------------------------------------------- sky (lands exactly on s05's first frame)
      E.skyWash(L.paint, E.shade(P.cerulean, 0.46), E.shade(P.ochre, 0.62), { mid: E.shade(P.skyWash, 0.6), seed: 5, mottle: 0.16 });
      E.resetCamera(L);
      const by = -c.k * 150;                               // the sky drifts up a little during the dip (far)
      [[160, 330, 260, P.blush, 0.16, 3], [930, 520, 300, P.ochre, 0.14, 5], [220, 1240, 340, P.skyWash, 0.15, 8], [880, 1500, 300, P.blush, 0.1, 9]]
        .forEach(([x, y, r, col, a, sd], i) => E.bloom(L.paint, x + 14 * Math.sin(t * 0.21 + i), y + by * 0.6 + 10 * Math.cos(t * 0.17 + i * 2), r, col, { seed: sd, alpha: a, soft: 40, irr: 0.3 }));
      PR.cloud(L, 168 + 9 * (t - 14.85), 292 + by, 270, { seed: 6, t, alpha: 0.75 });
      PR.cloud(L, 912 - 7 * (t - 14.85), 1188 + by * 1.25, 250, { seed: 9, t, alpha: 0.62 });

      // ---------------------------------------------------------------- the world
      globeXf(L, c);
      // arrives still glowing like the realm it was in s03 (same aura, glow 0.95), calms for the drawing, then
      // warms up again with his life (s05 cuts in at glow 0.9)
      const auraA = 0.34 * (1 - E.ep(lt, 0.3, 1.15));
      if (auraA > 0.003) soft(L.paint, circle(0, 0, GR * 1.22 * (1 + 0.04 * Math.sin((lt + 4.5) * 2.2 + 2))), '#F2C878', auraA, GR * 0.42);
      const glowBeats = E.lerp(0.95, 0.36, E.ep(lt, 0.3, 1.15)) + 0.14 * E.ep(lt, T.kapi, T.kapi + 0.5);
      const glow = E.lerp(glowBeats, 0.9, E.ep(lt, T.hayat + 0.1, T.end - 0.12));
      PR.personalWorld(L, 0, 0, GR, {
        t: t, kind: 'home', seed: 1, glow, life: 1,
        doorOpen: E.ep(lt, T.kapi - 0.08, T.kapi + 0.5, 'inOutCubic'),
      });
      // a faint veil as the structure is revealed ("Fakat"), lifting again when the life-light arrives
      const veil = 0.16 * E.ep(lt, T.fakat - 0.1, T.fakat + 0.5) * (1 - life);
      if (veil > 0.005) {
        const disc = new Path2D(); disc.arc(0, 0, GR * 0.985, 0, E.TAU);
        E.lift(L.paint, disc, veil);
      }
      // construction drawing
      const cons = E.seg(lt, T.fakat + 0.02, T.fakat + 0.92);
      const consA = 1 - 0.75 * E.ep(lt, T.hayat + 0.1, T.hayat + 0.7);
      construction(L, cons, consA);
      // door light (extra spill when it opens; it beats with his heart later)
      const dk = E.ep(lt, T.kapi, T.kapi + 0.45);
      if (dk > 0) {
        const beat = lifeD * heartbeat(t);
        const dl = [(DOOR[0] - GX), (DOOR[1] - GY)];
        const dc = E.mix('#FFD58A', '#FFC09C', lifeD);
        const endK = E.ep(lt, T.end - 0.5, T.end - 0.05);    // settle on exactly what s05 redraws after the cut
        // warm light pooling on the path in front of the door (paint, so it reads on the light ground too)
        const spill = new Path2D();
        spill.moveTo(dl[0] - 4 * U, dl[1] + 4 * U); spill.lineTo(dl[0] + 4 * U, dl[1] + 4 * U);
        spill.lineTo(dl[0] + 22 * U, dl[1] + 62 * U); spill.lineTo(dl[0] - 14 * U, dl[1] + 62 * U); spill.closePath();
        soft(L.paint, spill, '#F3C96E', 0.32 * dk * (1 - endK), 5 * U);
        soft(L.paint, E.blob(dl[0], dl[1] + 2 * U, 9 * U, { seed: 12, irr: 0.2 }), '#F6CF7C', 0.35 * dk * (1 - endK), 4 * U);
        E.glow(L.light, dl[0], dl[1], E.lerp(30, 22, endK) * U * (1 + 0.25 * beat), dc, E.lerp(0.6 * dk, 0.5, endK) + 0.25 * beat);
        E.glow(L.light, dl[0], dl[1], 8 * U, '#FFF6E0', 0.7 * dk * (1 - endK));
        E.rays(L.light, dl[0], dl[1] + 2 * U, { n: 7, len: 75 * U, spread: 0.6, angle: Math.PI / 2 + 0.08, width: 0.05, color: dc, a: 0.34 * dk + 0.12 * beat, seed: 6, t: lt });
      }
      // pillar + centre
      pillar(L, E.seg(lt, T.direk - 0.12, T.direk + 0.25), E.seg(lt, T.direk + 0.0, T.direk + 0.62), front, t, sparkPhase(lt, TH1, FR1) + 0.95 * shot.start);
      centre(L, lt, T.merkez - 0.06, lifeC, t);

      // labels (globe frame, px)
      const fadeL = 1 - E.ep(lt, T.hayat + 0.05, T.hayat + 0.55);
      label(L, 'direk', 262, -268, 200, -246, 16, -196, E.seg(lt, T.direk + 0.12, T.direk + 0.75), fadeL);
      label(L, 'merkez', 296, -52, 206, -42, 18, -6, E.seg(lt, T.merkez + 0.12, T.merkez + 0.75), fadeL);
      label(L, 'kapı', -300, 160, -262, 124, -72, 14, E.seg(lt, T.kapi + 0.06, T.kapi + 0.52), fadeL);

      // ---------------------------------------------------------------- the land below (far) and the man (near)
      E.resetCamera(L);
      // the land far below: a soft band at the foot of the frame during the beats, rising with the man in the
      // dip, then left behind as the camera rides up (gone in the last frame, like s05's first)
      const gA = E.ep(lt, T.hayat - 0.32, T.hayat + 0.18, 'inOutSine');      // (same curves as dipOf)
      const gB = E.ep(lt, T.end - 0.62, T.end - 0.01, 'inOutSine');
      const gTop = gB > 0 ? E.lerp(1040, 2030, gB) : E.lerp(1650, 1040, gA);
      if (gTop < E.H + 20) {
        E.save(L);
        E.translate(L, 0, gTop - 1000);
        PR.ground(L, 1000, { palette: 'spring', seed: 4, t: lt, trees: 0.5, flowers: 0.3 });
        E.restore(L);
      }
      // the man and the near meadow under his feet are a nearer layer of the same land: they move with it, PAR times
      // as far (one consistent parallax for the camera's dip and rise; he is below the frame while the land is low)
      const PAR = 1.9;
      const fy = MAN_FEET + PAR * (gTop - 1040);
      // he stands on a near meadow that moves with him (his feet never glide over the slower far land)
      if (c.k > 0.001) nearMeadow(L, fy - 132, lt);
      const mk = E.ep(lt, T.hayat - 0.2, T.hayat + 0.45, 'inOutSine');   // he looks up at his world
      const chest = [MAN_X + 0.068 * MAN_H, fy - 0.69 * MAN_H];
      if (c.k > 0.001) {
        const pose = E.man.lerp(E.man.pose.stand(), E.man.pose.lookUp(1), mk * 0.62);
        // the near arm opens a little forward, palm up (an offering, not holding a string)
        pose.nS = E.lerp(0.06, -0.08, mk); pose.nE = E.lerp(0.12, 0.55, mk);
        pose.fS = E.lerp(-0.04, -0.12, mk); pose.fE = E.lerp(0.14, 0.3, mk);
        pose.head += 0.02 * Math.sin(t * 1.3);
        E.man.shadow(L, MAN_X + 8, fy, MAN_H, 0.42, 1.1);
        E.man.draw(L, { x: MAN_X, y: fy, h: MAN_H, view: 'side', facing: 1, pose });
        // his heart: a small rose light in the chest
        const hb = heartbeat(t);
        const hk = E.seg(lt, T.hayat - 0.25, T.hayat + 0.1);
        E.wash(L.paint, E.blob(chest[0] - 6, chest[1], 13, { seed: 3, irr: 0.15 }), '#E58C8C', { alpha: 0.45 * hk, soft: 5 });
        E.glow(L.light, chest[0] - 4, chest[1], 52 * (1 + 0.3 * hb), '#FFBFA0', (0.5 + 0.35 * hb) * hk);
        E.glow(L.light, chest[0] - 4, chest[1], 16 * (1 + 0.3 * hb), '#FFF2E2', (0.6 + 0.3 * hb) * hk);
      }
      // the life-thread: rises from his heart into the world's base (it IS the pillar); fades out at the very end
      {
        const base = gpt(c, 0, 93 * U), ctr = gpt(c, 0, 0);
        const th = E.ep(lt, TH0, TH1, 'inQuad');          // accelerates out of the heart, hands over to the pillar
        const fadeT = 1 - E.ep(lt, T.end - 0.32, T.end - 0.02, 'inOutSine');
        if (th > 0 && fadeT > 0.001) {
          const n = 30, pts = [];
          const c1 = [chest[0] + 80, chest[1] - 55], c2 = [base[0] + 2, base[1] + 115];
          for (let i = 0; i <= n; i++) {
            const u = i / n, s1 = 1 - u;
            const x = s1 * s1 * s1 * chest[0] + 3 * s1 * s1 * u * c1[0] + 3 * s1 * u * u * c2[0] + u * u * u * base[0];
            const y = s1 * s1 * s1 * chest[1] + 3 * s1 * s1 * u * c1[1] + 3 * s1 * u * u * c2[1] + u * u * u * base[1];
            const sw = Math.sin(u * Math.PI) * 5 * Math.sin(t * 2.2 + u * 6) * (1 - u * u);
            pts.push([x + sw, y]);
          }
          const shown = partial(pts, th);
          lightLine(L, shown, { w: 6.5, a: fadeT });
          // the bright tip while it grows
          if (th < 1) {
            const tip = shown[shown.length - 1];
            E.glow(L.light, tip[0], tip[1], 30, '#FFD2BC', 0.8);
            E.glow(L.light, tip[0], tip[1], 9, '#FFF8F0', 0.95);
          }
          // every later heartbeat sends a bead of light up the thread and the pillar to the centre
          if (th >= 1) {
            const n0 = Math.floor(t * 1.18), q = t * 1.18 - n0, tb = n0 / 1.18 - shot.start;
            if (tb >= TH1 - 0.05) {
              const path = pts.concat([[E.lerp(base[0], ctr[0], 0.5), E.lerp(base[1], ctr[1], 0.5)], ctr]);
              const head = (f) => { const pp = partial(path, E.clamp(f)); return pp[pp.length - 1]; };
              const f = E.ease.inOutSine(q);
              for (let j = 0; j < 5; j++) {
                const pt = head(f - j * 0.03);
                E.glow(L.light, pt[0], pt[1], 22 - j * 3, j ? '#FFD9C4' : '#FFF4EA', (j ? 0.35 - j * 0.06 : 0.85) * (0.4 + 0.6 * fadeT) * E.seg(q, 0, 0.1) * (1 - E.seg(q, 0.93, 1)));
              }
            }
          }
        }
      }

      // warm motes in the air
      E.motes(L.light, { x: 0, y: 200, w: 1080, h: 1100, n: 14, t, seed: 55, color: '#FFF1D2', size: 2.6, a: 0.45, rise: 18 });

      // ---------------------------------------------------------------- arriving through the zoom
      // the scheduler shows this shot shrunk (0.55 → 1) while it fades in, with white outside its frame: keep the
      // frame border bare paper until it has grown to full size, so no rectangle edge shows
      const edge = 1 - E.ep(lt, 0.4, 0.74);
      if (edge > 0.001) {
        const ins = 175 * (1 - E.ep(lt, 0.12, 0.72));
        const fr = new Path2D();
        fr.moveTo(-400, -400); fr.lineTo(-400, E.H + 400); fr.lineTo(E.W + 400, E.H + 400); fr.lineTo(E.W + 400, -400); fr.closePath();
        fr.addPath(E.wobblyShape([[ins, ins * 1.4], [E.W - ins, ins * 1.4], [E.W - ins, E.H - ins * 1.4], [ins, E.H - ins * 1.4]], { seed: 4, amp: 9, freq: 0.012, step: 30 }));
        soft(L.paint, fr, '#FFFFFF', edge, 70, 'source-over');
        soft(L.ink, fr, '#000000', edge, 70, 'destination-out');
        soft(L.light, fr, '#000000', edge, 70, 'destination-out');
      }
    },

    sfx(shot) {
      const T = tm(shot);
      const g = (l) => shot.start + l;
      return [
        { t: g(T.fakat + 0.02), type: 'pen', gain: 0.22, dur: 0.85 },
        { t: g(T.direk), type: 'grow', gain: 0.3, dur: 0.7 },
        { t: g(T.merkez - 0.04), type: 'chime', gain: 0.3, pitch: 0.9 },
        { t: g(T.kapi - 0.05), type: 'bloom', gain: 0.35, pitch: 0.8 },
        { t: g(T.hayat - 0.34), type: 'whoosh', gain: 0.22, dur: 0.6 },
        // heartbeats on the visual pulses of his life-light (heartbeat() peaks at t = n / 1.18)
        // (the first beat sends the thread out of his heart; on the second his light has climbed the pillar and
        //  the pillar, the centre and the door all flash with it)
        { t: Math.ceil((g(T.hayat) - 0.1) * 1.18) / 1.18, type: 'heart', gain: 0.34 },
        { t: g(T.hayat - 0.02), type: 'swell', gain: 0.26, dur: 0.85 },
        { t: Math.ceil((g(T.hayat) - 0.1) * 1.18 + 1) / 1.18, type: 'heart', gain: 0.44 },
        { t: g(T.end - 0.64), type: 'whoosh', gain: 0.16, dur: 0.62 },
      ];
    },
  });
})();
