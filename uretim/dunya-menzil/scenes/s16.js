/* s16 · 72.65–77.45 · "sırrına mazhar olup nefsini unutup hayatın zevalini düşünmeyerek"
   The han courtyard of s02 again — now at night, under the moon: the same ablaq arcade, merlons, domes and
   hanging lanterns (unlit), cypresses over the wall. The man stands before the tall endam mirror.
   - mazhar olup (73.09): a night cloud slides over the crescent moon — the whole courtyard dims.
   - nefsini unutup (74.23–75.1): a cold gleam sweeps across the glass and wipes his reflection away; behind the
     gleam the glass is left dark and empty; his own colours drain a little.
   - hayatın (75.55): the moon comes out again; behind him an hourglass, nearly empty, emerges from the dark,
     sand running; the camera eases back to show it. His head lifts as if he hears it, he turns to look ...
   - zevalini (76.07): the last grains glint at the neck.
   - düşünmeyerek (76.57): ... and turns away again, chin up, back to the empty mirror.
   Incoming: bleed from s15 (540, 900). Outgoing: bleed into s17 (540, 760). */
(function () {
  const E = window.E, PR = E.props;
  const S0 = 72.65;
  const w = (i) => E.T(i) - S0; // local onset of word i

  // ---- local soft-wash helpers (workaround for an engine bug): E.softFill keeps the scaled camera transform
  //      while drawing its far-off shape, and in the accelerated layer canvases Chrome scales the shadow offset
  //      with it, so E.wash/E.lift/E.bloom soft edges (and E.man.shadow) land 20000·(zoom−1) px away under a
  //      zoomed camera. Here the path is moved to device space and drawn with an identity transform.
  const SOFF = 24000;
  function softFillD(ctx, path, color, blur) {
    const m = ctx.getTransform();
    const sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    const p2 = new Path2D();
    p2.addPath(path, new DOMMatrix([m.a, m.b, m.c, m.d, m.e - SOFF, m.f]));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0.5, blur * sc * 2);
    ctx.shadowOffsetX = SOFF;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fill(p2);
    ctx.restore();
  }
  function wash(ctx, path, color, o = {}) {
    if (!o.soft || o.grad) return E.wash(ctx, path, color, o);
    ctx.save();
    ctx.globalCompositeOperation = o.mode === 'over' ? 'source-over' : 'multiply';
    ctx.globalAlpha *= o.alpha ?? 1;
    softFillD(ctx, path, o.light ? E.shade(color, o.light) : color, o.soft);
    ctx.restore();
  }
  function lift(ctx, path, alpha = 1, soft = 0) {
    if (!soft) return E.lift(ctx, path, alpha);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha *= alpha;
    softFillD(ctx, path, '#ffffff', soft);
    ctx.restore();
  }
  const bloom = (ctx, cx, cy, r, color, { seed = 3, alpha = 0.6, soft = 10, irr = 0.25 } = {}) =>
    wash(ctx, E.blob(cx, cy, r, { seed, irr }), color, { alpha, soft });
  const manShadow = (L, x, y, h, a = 0.35) =>
    wash(L.paint, E.blob(x, y, h * 0.12, { rx: h * 0.13, ry: h * 0.018, irr: 0.05, seed: 2 }), '#8F8C9C', { alpha: a, soft: h * 0.012 });

  // ---- staging (world coordinates; camera identity = screen) ----
  const GY = 1062;                         // floor line under man & mirror
  const MAN = { x: 470, h: 540 };
  const MIR = { x: 795, h: 810 };
  const HG = { x: 196, y: 1012, h: 420 };  // hourglass: a little further back
  const MOON = { x: 214, y: 214, r: 40 };
  const NIGHT = { top: '#1D2746', mid: '#2C3A62', low: '#4A5884' };

  // ---- beats (local s) ----
  const B = {
    cloud: w(138) - 0.1,         // mazhar
    refl0: w(140) - 0.12,        // nefsini: the gleam starts its sweep
    refl1: w(141) + 0.3,         // unutup: the reflection is gone
    hg: w(142) - 0.12,           // hayatın: hourglass emerges
    turn1: w(142) + 0.12,        // he turns to look
    zeval: w(143),               // zevalini
    turn2: w(144) - 0.1,         // düşünmeyerek: turns away
  };
  const TURN = 0.24;             // one limited-animation turn (s)

  // camera: [cx, cy, zoom]
  const CAM = [
    [0, [604, 866, 1.12]],
    [B.hg - 0.5, [616, 860, 1.165], 'inOutSine'],
    [B.hg + 0.65, [560, 872, 1.0], 'inOutCubic'],
    [5.6, [556, 866, 1.04], 'inOutSine'],
  ];
  function cam(L, lt, d) {
    const c = E.tween(lt, CAM);
    const hx = E.drift(lt, 3, 0.25) * 4, hy = E.drift(lt, 7, 0.25) * 3; // breath of a hand-held camera
    E.camera(L, { x: 540 + (c[0] + hx - 540) * d, y: 960 + (c[1] + hy - 960) * d, zoom: 1 + (c[2] - 1) * d });
  }

  // moon cover by the drifting cloud (0..1) and the resulting moonlight level
  const cloudX = (lt) => MOON.x + 282 - 148 * lt;
  const cover = (lt) => 1 - E.smooth(E.seg(Math.abs(cloudX(lt) - 37 - MOON.x), 120, 200)); // body sits left of its anchor
  const moonLv = (lt) => 1 - 0.62 * cover(lt);

  // ---------- helpers ----------
  function crescentClip(ctx, x, y, r) {
    // clip = disc minus an offset disc (lit limb on the left, toward the light of the scene)
    const cut = new Path2D();
    cut.rect(-5000, -5000, 10000, 10000);
    cut.arc(x + r * 0.42, y - r * 0.18, r * 0.86, 0, E.TAU, true);
    ctx.clip(cut, 'evenodd');
    const d = new Path2D(); d.arc(x, y, r, 0, E.TAU); ctx.clip(d);
  }

  /** points along a pointed (Ottoman) arch curve from the left springer over the apex to the right springer */
  function archCurve(cx, ys, hw, n) {
    const e = hw * 0.32, R = hw + e, pa = Math.acos(e / R), pts = [];
    for (let i = 0; i <= n; i++) { const f = (pa * i) / n; pts.push([cx + e - R * Math.cos(f), ys - R * Math.sin(f)]); }
    for (let i = n - 1; i >= 0; i--) { const f = (pa * i) / n; pts.push([cx - e + R * Math.cos(f), ys - R * Math.sin(f)]); }
    return pts;
  }
  const poly = (pts, close = true) => {
    const p = new Path2D();
    pts.forEach((q, i) => (i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1])));
    if (close) p.closePath();
    return p;
  };
  /** arch opening: jambs from yb up to the springing line ys, then the pointed curve */
  const archOpening = (cx, yb, hw, ys) => poly([[cx - hw, yb], ...archCurve(cx, ys, hw, 12), [cx + hw, yb]]);

  function stars(L, lt) {
    const r = E.rng(1616);
    for (let i = 0; i < 52; i++) {
      const x = r() * 1180 - 50, y = r() * 600 - 40, s = 0.9 + r() * 1.8, ph = r() * 10, sp = 1.4 + r() * 2;
      if (Math.hypot(x - MOON.x, y - MOON.y) < 95) continue;
      lift(L.paint, E.blob(x, y, s, { seed: i, irr: 0.1, n: 10 }), 0.55);
      if (s > 1.9) E.glow(L.light, x, y, s * 5, '#DCE5FF', 0.28 * (0.55 + 0.45 * Math.sin(lt * sp + ph)));
    }
  }

  function sky(L, lt, mlv, cv) {
    E.skyWash(L.paint, NIGHT.top, NIGHT.low, { mid: NIGHT.mid, seed: 16, mottle: 0.22 });
    E.resetCamera(L);
    cam(L, lt, 0.2);
    const p = L.paint;
    // wet-in-wet variation of the night wash (indigo + a touch of violet)
    bloom(p, 860, 300, 260, '#323A68', { seed: 9, alpha: 0.35, soft: 60 });
    bloom(p, 600, 60, 240, '#1E2747', { seed: 19, alpha: 0.32, soft: 70 });
    bloom(p, 1000, 470, 170, '#4A416E', { seed: 29, alpha: 0.18, soft: 45 });
    // the paper breathes back round the moon: a big pale halo (lighter wash), cooler toward its edge
    const halo = E.blob(MOON.x + 30, MOON.y + 40, 320, { seed: 4, irr: 0.22 });
    lift(p, halo, 0.12 * mlv, 120);
    lift(p, E.blob(MOON.x, MOON.y, 140, { seed: 41, irr: 0.18 }), 0.15 * mlv, 55);
    wash(p, halo, '#8E9DCC', { alpha: 0.14 * mlv, soft: 110 });
    // moonlit haze low in the sky, behind the roofline, so the silhouettes read
    const haze = E.blob(540, 600, 400, { rx: 820, ry: 170, seed: 21, irr: 0.15 });
    lift(p, haze, 0.28, 80);
    wash(p, haze, '#6F7FB0', { alpha: 0.32, soft: 80 });
    stars(L, lt);
    // the crescent moon: bare paper + a cool glow; behind the cloud it is hidden and its light only seeps
    // through the cloud as a broad diffuse glow (silver lining)
    const mv = 1 - cv;
    if (mv > 0.01) {
      p.save();
      crescentClip(p, MOON.x, MOON.y, MOON.r);
      lift(p, E.blob(MOON.x, MOON.y, MOON.r + 2, { seed: 2, irr: 0.03 }), mv);
      wash(p, E.blob(MOON.x, MOON.y, MOON.r + 2, { seed: 2, irr: 0.03 }), '#E9EEF8', { alpha: 0.45 * mv });
      p.restore();
    }
    E.glow(L.light, MOON.x - 8, MOON.y, 190, '#BFD0FF', 0.3 * mv);
    E.glow(L.light, MOON.x - 8, MOON.y, 70, '#E8EEFF', 0.35 * mv);
    // drifting night clouds (the big one covers the moon at "mazhar" and uncovers it at "hayatın")
    PR.cloud(L, 930 - 14 * lt, 470, 260, { tone: 'night', seed: 3, t: lt + 3, alpha: 0.8 });
    PR.cloud(L, cloudX(lt), MOON.y + 96, 440, { tone: 'night', seed: 6, t: lt });
    if (cv > 0.01) {
      E.glow(L.light, MOON.x - 6, MOON.y + 4, 230, '#AFC0EE', 0.16 * cv);
      E.glow(L.light, MOON.x - 6, MOON.y + 4, 90, '#D5DEF8', 0.1 * cv);
    }
  }

  function roofline(L, mlv, top) {
    const p = L.paint;
    // far roofline: the han's dome (crescent finial, as in s02) and a smaller one, cypresses over the wall
    for (const [dx, dr, col] of [[300, 72, '#2E4654'], [820, 96, '#36436C']]) {
      const d = E.blob(dx, top - 8, dr, { rx: dr, ry: dr * 0.8, seed: dx, irr: 0.03 });
      wash(p, d, col, { mode: 'over' });
      wash(p, d, '#1A2240', { alpha: 0.45, grad: { from: [dx - dr, 0], to: [dx + dr, 0], c2: '#0F1630' } });
      wash(p, E.rrect(dx - dr * 0.95, top - 22, dr * 1.9, 30, 4), '#2E3A62', { mode: 'over' });
      lift(p, E.blob(dx - dr * 0.45, top - dr * 0.5, dr * 0.3, { seed: dx + 1, rx: dr * 0.18, ry: dr * 0.34, rot: 0.5, irr: 0.2 }), 0.16 * mlv, 8);
      E.pencil(L.ink, d, { a: 0.12, w: 1.2 });
      // finial + crescent
      const fy = top - dr * 0.8 - 8;
      wash(p, E.rrect(dx - 2.5, fy - 26, 5, 26, 2), '#6E6A6A', { mode: 'over' });
      wash(p, E.blob(dx, fy - 14, 4.5, { seed: 2, irr: 0.05 }), '#8C7A52', { mode: 'over' });
      const cr = new Path2D(); cr.arc(dx, fy - 36, 8, 0, E.TAU);
      const cr2 = new Path2D(); cr2.arc(dx + 4, fy - 38.5, 6.6, 0, E.TAU);
      p.save(); p.clip(cr);
      wash(p, cr, '#9A8758', { mode: 'over' });
      p.fillStyle = E.mix(NIGHT.mid, '#6F7FB0', 0.5); p.fill(cr2);
      p.restore();
    }
    for (const [cx, ch] of [[110, 230], [176, 170], [970, 260], [1040, 200]]) {
      const c = E.wobblyShape([[cx, top - ch], [cx + 24, top - ch * 0.55], [cx + 22, top + 10], [cx - 22, top + 10], [cx - 24, top - ch * 0.55]], { seed: cx, amp: 3 });
      wash(p, c, '#24314C', { mode: 'over' });
      wash(p, c, '#4A5A80', { alpha: 0.28, grad: { from: [cx - 24, 0], to: [cx + 24, 0], c2: '#1C2440' } });
      E.pencil(L.ink, c, { a: 0.08, w: 1.0, double: false });
    }
  }

  function arcade(L, lt, mlv) {
    cam(L, lt, 0.55);
    const p = L.paint, ink = L.ink;
    const top = 585, base = 1010, cor = 607;
    roofline(L, mlv, top - 26);
    // merlons (crenellation, as in s02)
    for (let x = -150; x < 1240; x += 56) {
      const m = E.rrect(x, top - 32, 36, 36, 10);
      wash(p, m, '#4B5886', { mode: 'over' });
      wash(p, m, '#1E2646', { alpha: 0.45, grad: { from: [x, 0], to: [x + 36, 0], c2: '#141B36' } });
      lift(p, E.rrect(x + 2, top - 30, 7, 30, 3), 0.1 * mlv, 2);
      E.pencil(ink, m, { w: 1, a: 0.12, double: false });
    }
    // wall: moonlit from the upper left, darker to the right and toward the gallery floor
    const wall = E.rrect(-160, top, E.W + 320, base - top + 40, 0);
    wash(p, wall, '#4C5985', { mode: 'over' });
    wash(p, wall, '#1C2444', { alpha: 0.55, grad: { from: [-100, 0], to: [1180, 0], c2: '#10172E' } });
    wash(p, wall, '#1C2444', { alpha: 0.3, grad: { from: [0, top + 60], to: [0, base], c2: '#28305A' } });
    lift(p, E.blob(230, 760, 300, { rx: 460, ry: 210, seed: 7, irr: 0.25 }), 0.09 * mlv, 80);
    bloom(p, 760, 720, 180, '#6B5A7E', { seed: 31, alpha: 0.14, soft: 40 });
    bloom(p, 980, 880, 200, '#222A4E', { seed: 33, alpha: 0.25, soft: 40 });
    E.dryBrush(p, [[-60, top + 70], [300, top + 74], [700, top + 68], [1140, top + 72]], '#252D52', { width: 14, seed: 9, alpha: 0.16 });
    // cornice band with tezhip dots (dimmed red / teal), shadow under it
    const band = E.rrect(-160, top - 2, E.W + 320, cor - top + 16, 0);
    wash(p, band, '#56638F', { mode: 'over' });
    wash(p, band, '#1B2242', { alpha: 0.4, grad: { from: [-100, 0], to: [1180, 0], c2: '#0F1530' } });
    wash(p, E.rrect(-160, top - 2, E.W + 320, 4, 0), '#93A0C8', { mode: 'over', alpha: 0.5 * (0.6 + 0.4 * mlv) });
    for (let x = -140; x < 1220; x += 26) {
      wash(p, E.blob(x, top + 11, 3.4, { seed: x + 500, irr: 0.1, n: 10 }), (Math.round(x / 26) % 2) ? '#6A3846' : '#284E58', { mode: 'over', alpha: 0.75 });
    }
    wash(p, E.rrect(-160, cor + 14, E.W + 320, 22, 0), '#141A34', { alpha: 0.4, soft: 6 });
    E.pencil(ink, [[-140, cor + 14], [E.W + 140, cor + 13]], { a: 0.16, w: 1.2 });
    // arches: ablaq voussoirs (moonlit slate / dusky rose), dark galleries, unlit lanterns
    const HW = 66, YS = base - 180;
    for (let i = -1; i <= 5; i++) {
      const cx = 30 + i * 220;
      const inner = archCurve(cx, YS, HW, 6), outer = archCurve(cx, YS, HW + 18, 6);
      wash(p, poly([[cx - HW - 18, YS], ...outer, [cx + HW + 18, YS]]), '#5A6692', { mode: 'over' });
      for (let k = 0; k < inner.length - 1; k++) {
        const v = poly([inner[k], inner[k + 1], outer[k + 1], outer[k]]);
        wash(p, v, k % 2 ? '#57466A' : '#66729C', { mode: 'over' });
        if (k % 2) wash(p, v, '#2A2140', { alpha: 0.18 });
      }
      // the arch ring falls into shadow toward the right
      wash(p, poly([[cx - HW - 18, YS], ...outer, [cx + HW + 18, YS]]), '#141A36', { alpha: 0.4, grad: { from: [cx - HW - 18, 0], to: [cx + HW + 18, 0], c2: '#0C1128' } });
      // impost blocks
      for (const s of [-1, 1]) wash(p, E.rrect(cx + s * (HW + 9) - 13, YS - 4, 26, 9, 2), '#47527C', { mode: 'over' });
      // the opening: deep gallery shade, a little moonlit floor at its foot
      const op = archOpening(cx, base + 30, HW, YS);
      wash(p, op, '#18203C', { mode: 'over', grad: { from: [0, YS - 90], to: [0, base], c2: '#323D68' } });
      wash(p, E.rrect(cx - HW, base - 30, HW * 2, 30, 0), '#6C7AA6', { alpha: 0.2 * mlv });
      wash(p, archOpening(cx + 8, base, HW * 0.52, YS + 70), '#0E1430', { alpha: 0.3 });
      // moonlight on the left jamb
      wash(p, E.rrect(cx - HW, YS - 10, 9, base - YS + 10, 2), '#8492BC', { alpha: 0.22 * mlv });
      E.pencil(ink, poly(inner, false), { a: 0.16, w: 1.1, seed: i + 30 });
      E.pencil(ink, poly(outer, false), { a: 0.12, w: 1.1, seed: i + 40 });
    }
    // lanterns hang in the galleries as in s02 — but they are dark tonight
    for (const [lx, sd] of [[30, 2], [250, 5], [910, 7]]) PR.lantern(L, lx, YS - 82, 64, { t: lt, lit: 0, night: 1, seed: sd, chain: 30, sway: 0.6, color: '#7E6A5E' });
    // plinth line along the base of the arcade
    wash(p, E.rrect(-160, base - 8, E.W + 320, 18, 0), '#2A3358', { alpha: 0.5 });
    E.pencil(ink, [[-140, base - 8], [E.W + 140, base - 9]], { a: 0.14, w: 1.1 });
  }

  // flagstone floor in perspective
  const ROWS = [944, 962, 984, 1012, 1048, 1094, 1154, 1232, 1336, 1476, 1666, 1930];
  const VP = [560, 610];
  const colX = (xb, y) => VP[0] + (xb - VP[0]) * (y - VP[1]) / (1930 - VP[1]);
  function floor(L, lt, mlv) {
    cam(L, lt, 1);
    const p = L.paint, fy = 940;
    const fl = E.rrect(-260, fy, E.W + 520, 1200, 0);
    wash(p, fl, '#56638E', { mode: 'over', grad: { from: [0, fy], to: [0, 1900], c2: '#2C3758' } });
    // stones: each a slightly different glaze (running bond), very low contrast under the subtitle band
    const CW = 250;
    for (let k = 0; k < ROWS.length - 1; k++) {
      const y0 = ROWS[k], y1 = ROWS[k + 1], sh = (k % 2) * 0.5;
      const calm = E.clamp((y0 - 1180) / 300); // calmer from the subtitle band down
      for (let j = -7; j <= 7; j++) {
        const xa = VP[0] + (j + sh - 0.5) * CW, xb = VP[0] + (j + sh + 0.5) * CW;
        const v = E.hash(j + 40, k + 7, 161);
        const q = poly([[colX(xa, y0), y0], [colX(xb, y0), y0], [colX(xb, y1), y1], [colX(xa, y1), y1]]);
        if (v < 0.5) wash(p, q, '#1F2848', { alpha: (0.05 + 0.13 * (0.5 - v) * 2) * (1 - 0.6 * calm) });
        else if (v > 0.82) lift(p, q, 0.05 * (1 - 0.6 * calm));
        if (k < 8) E.pencil(L.ink, [[colX(xa, y0 + 1), y0 + 1], [colX(xa, y1 - 1), y1 - 1]], { a: 0.07 * (1 - calm), w: 1.0, double: false, seed: j + k * 20 });
      }
      E.pencil(L.ink, [[-200, y0], [E.W + 200, y0 + 1]], { a: (k < 1 ? 0.14 : 0.075) * (1 - 0.7 * calm), w: 1.1, double: false, seed: y0 });
    }
    // the step down from the gallery: a shadow just under the far edge
    wash(p, E.rrect(-260, fy, E.W + 520, 12, 0), '#1E2646', { alpha: 0.55 });
    // moonlight pool around the figures (light falls from the upper left)
    const pool = E.blob(540, GY + 24, 470, { rx: 620, ry: 160, seed: 12, irr: 0.12 });
    lift(p, pool, 0.18 + 0.24 * mlv, 80);
    wash(p, pool, '#9AA8D0', { alpha: 0.22 * mlv, soft: 70 });
    lift(p, E.blob(610, GY + 8, 300, { rx: 380, ry: 64, seed: 13, irr: 0.1 }), 0.1 + 0.14 * mlv, 40);
    // near floor: deep, calm blooms (bottom of the frame)
    bloom(p, 220, 1580, 260, '#232B4A', { seed: 5, alpha: 0.25, soft: 50 });
    bloom(p, 900, 1720, 300, '#232B4A', { seed: 8, alpha: 0.25, soft: 60 });
    bloom(p, 560, 1900, 400, '#1C233E', { seed: 6, alpha: 0.32, soft: 80 });
  }

  // long moon shadow cast toward the lower right (tapered, softening with distance)
  function castShadow(L, x, y, len, wd, a, head = 0) {
    if (a <= 0.005) return;
    const ang = 0.42;
    const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    const P2 = (f, s) => [x + dx * f + nx * s, y + dy * f + ny * s * 0.5];
    const pts = [P2(0, -wd * 0.5), P2(0.45, -wd * 0.36), P2(0.85, -wd * 0.26 - head), P2(1, -head * 0.6), P2(1.02, 0),
      P2(1, head * 0.6), P2(0.85, wd * 0.26 + head), P2(0.45, wd * 0.36), P2(0, wd * 0.5)];
    const path = E.smoothPath(pts, true, 0.5);
    wash(L.paint, path, '#161D34', { alpha: a, soft: 14 });
    wash(L.paint, E.smoothPath(pts.slice(0, 2).concat([P2(0.4, 0)], pts.slice(-2)), true, 0.5), '#161D34', { alpha: a * 0.5, soft: 6 });
  }

  // ---------- the man ----------
  const frontPose = () => { const p = E.man.pose.fStand(); p.lS = 0.1; p.rS = 0.1; p.lE = 0.12; p.rE = 0.12; return p; };
  /** a quick limited-animation turn: the side view narrows, a front frame or two, the other side widens */
  function turnState(u, from, to, p0, p1) {
    const dip = 4 * Math.sin(Math.PI * E.clamp(u));
    if (u < 0.34) return { view: 'side', facing: from, pose: p0, sx: 1 - 0.4 * E.ease.inQuad(u / 0.34), dy: dip };
    if (u < 0.66) return { view: 'front', facing: 1, pose: frontPose(), sx: 0.78 + 0.06 * Math.sin(Math.PI * (u - 0.34) / 0.32), dy: dip };
    return { view: 'side', facing: to, pose: p1, sx: 0.6 + 0.4 * E.ease.outQuad((u - 0.66) / 0.34), dy: dip };
  }
  function manState(lt) {
    const P0 = E.man.pose;
    const breath = Math.sin(lt * 2.1) * 0.008;
    const st = (head = 0, lean = 0) => { const p = P0.stand(); p.head = head; p.lean = lean + breath; return p; };
    // facing the mirror; at "hayatın" the head lifts (he hears the sand)
    const hear = (t) => st(0.06 - 0.12 * E.ep(t, B.hg - 0.05, B.turn1, 'outCubic'), -0.01 * E.ep(t, B.hg - 0.05, B.turn1));
    const look = (t) => { const k = E.ep(t, B.turn1 + TURN, B.turn1 + TURN + 0.4, 'outCubic'); return st(-0.06 + 0.16 * k, 0.02 * k); };
    const away = (t) => { const k = E.ep(t, B.turn2 + TURN, B.turn2 + TURN + 0.6, 'outCubic'); return st(0.1 - 0.26 * k, -0.035 * k); };
    if (lt < B.turn1) return { view: 'side', facing: 1, pose: hear(lt), sx: 1, dy: 0 };
    if (lt < B.turn1 + TURN) return turnState((lt - B.turn1) / TURN, 1, -1, hear(B.turn1), look(B.turn1 + TURN));
    if (lt < B.turn2) return { view: 'side', facing: -1, pose: look(lt), sx: 1, dy: 0 };
    if (lt < B.turn2 + TURN) return turnState((lt - B.turn2) / TURN, -1, 1, look(B.turn2), away(B.turn2 + TURN));
    return { view: 'side', facing: 1, pose: away(lt), sx: 1, dy: 0 };
  }
  // once he has forgotten himself his colours drain a little
  const manLook = (cv, lost) => ({ tint: '#34477A', tintAmt: 0.32 + 0.14 * cv + 0.08 * lost, desat: 0.2 + 0.22 * lost });

  // the half-plane of the glass the gleam has not reached yet (ahead = true) or has already passed
  const GN = [0.8415, 0.5403], GD = [0.5403, -0.8415];
  function gleamHalf(r, wipe, ahead) {
    const s = MIR.h / 1000;
    const off = E.lerp(-330, 330, E.ease.inOutSine(wipe)) * s;
    const cx = r.cx + GN[0] * off, cy = r.y + r.h / 2 + GN[1] * off, sg = ahead ? 1 : -1, F = 3000;
    const q = new Path2D();
    q.moveTo(cx - GD[0] * F, cy - GD[1] * F); q.lineTo(cx + GD[0] * F, cy + GD[1] * F);
    q.lineTo(cx + GD[0] * F + sg * GN[0] * F, cy + GD[1] * F + sg * GN[1] * F);
    q.lineTo(cx - GD[0] * F + sg * GN[0] * F, cy - GD[1] * F + sg * GN[1] * F);
    q.closePath();
    return q;
  }

  E.scene('s16', {
    wc: [1.05, 1.15, 3, 0.6],
    draw(L, lt) {
      const cv = cover(lt), mlv = moonLv(lt);

      // ---------- far: sky, moon, clouds ----------
      sky(L, lt, mlv, cv);
      // ---------- middle: the han's arcade ----------
      arcade(L, lt, mlv);
      // ---------- near: floor ----------
      floor(L, lt, mlv);

      // ---------- objects ----------
      cam(L, lt, 1);
      const hgK = E.ep(lt, B.hg + 0.02, B.hg + 0.6, 'inOutSine');
      // long moon shadows
      castShadow(L, MIR.x + 16, GY + 2, 600, 300, 0.42 * mlv, 26);
      castShadow(L, MAN.x + 4, GY + 2, 540, 74, 0.46 * mlv, 22);
      if (hgK > 0) castShadow(L, HG.x + 8, HG.y + 2, 420, 210, 0.38 * mlv * hgK, 10);

      // hourglass: emerges out of the dark when the moon comes back
      if (hgK > 0) {
        lift(L.paint, E.blob(HG.x + 10, HG.y + 4, 150, { rx: 190, ry: 42, seed: 19, irr: 0.15 }), 0.18 * hgK * mlv, 30);
        E.glow(L.light, HG.x, HG.y - HG.h * 0.5, 260, '#8FA6E0', 0.2 * hgK * mlv);
        const sand = 0.15 - 0.1 * E.seg(lt, B.hg, 5.6);
        PR.hourglass(L, HG.x, HG.y, HG.h, { t: lt, sand, flow: 1, speed: 1.2, night: 0.85, glow: 0.25, alpha: E.clamp(hgK * 1.8) });
        // ... out of the shadow: a dark wash over it recedes as the moonlight returns
        if (hgK < 1) wash(L.paint, E.blob(HG.x, HG.y - HG.h * 0.48, HG.h * 0.4, { rx: HG.h * 0.36, ry: HG.h * 0.6, seed: 23, irr: 0.15 }), '#151B34', { alpha: 0.7 * (1 - hgK), soft: 40 });
        // the last grains glint at the neck on "zevalini"
        const zg = E.ep(lt, B.zeval - 0.1, B.zeval + 0.2, 'outCubic') * (1 - E.ep(lt, B.zeval + 0.4, B.zeval + 1.2));
        E.glow(L.light, HG.x, HG.y - HG.h * 0.5, 46, '#FFE7B0', 0.55 * zg);
        E.glow(L.light, HG.x, HG.y - HG.h * 0.5, 120, '#C9D6FF', 0.22 * zg);
      }

      // mirror with the reflection: on "nefsini unutup" a cold gleam sweeps across the glass and wipes him away
      const ms = manState(lt);
      const wipe = E.seg(lt, B.refl0, B.refl1);
      const reflA = 1 - E.ep(lt, B.refl1 - 0.15, B.refl1 + 0.1, 'inOutSine');
      const look = manLook(cv, E.ep(lt, B.refl0 + 0.3, B.refl1 + 0.4, 'inOutSine'));
      PR.mirror(L, MIR.x, GY, MIR.h, {
        t: lt, night: 0.9, shine: wipe, reflectAlpha: reflA,
        reflect: reflA > 0.001 ? (L2, r) => {
          if (wipe > 0) E.each(L2, (c) => c.clip(gleamHalf(r, wipe, true)));
          const pp = E.man.pose.stand(); pp.head = 0.06; pp.lean = Math.sin(lt * 2.1) * 0.008;
          lift(L2.paint, E.blob(r.cx, r.y + r.h * 0.56, r.h * 0.3, { rx: r.w * 0.36, ry: r.h * 0.42, seed: 5, irr: 0.1 }), 0.35, 30);
          E.man.draw(L2, { x: r.cx + r.w * 0.02, y: r.y + r.h * 0.975, h: r.h * 0.8, view: 'side', facing: -1, pose: pp,
            tint: '#4A5E92', tintAmt: 0.22, desat: 0.15 });
          E.glow(L2.light, r.cx, r.y + r.h * 0.55, r.h * 0.45, '#B9CAF4', 0.3);
        } : undefined,
      });
      // behind the gleam the glass is left dark and empty (a deep indigo wash that settles)
      if (wipe > 0) {
        const g = PR.mirrorGlass(MIR.x, GY, MIR.h);
        const settle = E.ep(lt, B.refl1 - 0.1, B.refl1 + 0.6, 'inOutSine');
        L.paint.save();
        L.paint.clip(PR.mirrorGlassPath(MIR.x, GY, MIR.h));
        if (wipe < 1) L.paint.clip(gleamHalf(g, wipe, false));
        const box = E.rrect(g.x - 10, g.y - 10, g.w + 20, g.h + 20, 0);
        wash(L.paint, box, '#1A2242', { alpha: 0.5 + 0.12 * settle,
          grad: { from: [g.cx - g.w * 0.2, g.y + g.h * 0.35], r: g.h * 0.8, r0: 0, stops: [[0, E.rgba('#1A2242', 0.75)], [1, E.rgba('#141A36', 1)]] } });
        bloom(L.paint, g.cx + g.w * 0.15, g.y + g.h * 0.7, g.w * 0.4, '#2B2550', { seed: 61, alpha: 0.3 * settle, soft: 20 });
        lift(L.paint, E.blob(g.cx - g.w * 0.25, g.y + g.h * 0.22, g.w * 0.22, { rx: g.w * 0.12, ry: g.h * 0.2, rot: 0.6, seed: 62, irr: 0.2 }), 0.06 * settle, 14);
        L.paint.restore();
      }

      // the man: a faint cool moonlight halo behind him keeps his silhouette clear of the dark arcade
      E.glow(L.light, MAN.x - 6, GY - MAN.h * 0.62, MAN.h * 0.42, '#9FB2E8', 0.1 * (0.4 + 0.6 * mlv));
      manShadow(L, MAN.x, GY, MAN.h, 0.42);
      E.save(L);
      E.translate(L, MAN.x, GY + (ms.dy || 0) * 0.25);
      if (ms.sx !== 1) E.scale(L, ms.sx, 1);
      E.man.draw(L, { x: 0, y: 0, h: MAN.h, view: ms.view, facing: ms.facing, pose: ms.pose, ...look });
      E.restore(L);

      // moonlit dust motes in the air
      E.resetCamera(L);
      E.motes(L.light, { x: 200, y: 600, w: 760, h: 600, n: 14, t: lt, seed: 77, color: '#C9D6FF', size: 2.2, a: 0.3 * (0.5 + 0.5 * mlv), rise: 9 });
      // global dimming while the moon is covered
      if (cv > 0.01) {
        L.paint.save();
        L.paint.setTransform(1, 0, 0, 1, 0, 0);
        L.paint.globalCompositeOperation = 'multiply';
        L.paint.globalAlpha = 0.28 * cv;
        L.paint.fillStyle = '#5F6E9E';
        L.paint.fillRect(0, 0, E.W, E.H);
        L.paint.restore();
      }
    },
    sfx() {
      const g = (i) => E.T(i);
      return [
        { t: S0 + 0.05, type: 'wind', gain: 0.16, dur: 5.2 },
        { t: g(140) - 0.05, type: 'chime', gain: 0.22, pitch: 0.55 },
        { t: g(142) - 0.1, type: 'sand', gain: 0.32, dur: 2.0 },
        { t: g(144) - 0.1, type: 'whoosh', gain: 0.14 },
      ];
    },
  });
})();
