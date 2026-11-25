/* s19 · 86.40–90.55 · "şedit hissiyat ile ona sarılsa onda boğulur, gider."
   Cut in from s18 (the statue sunk in the clay of his world): a closer shot under the same night sky. The man —
   alive again, stuck thigh-deep in the same mud — hugs his little glass world (the inflated, false world).
   "şedit" 86.57 / "hissiyat" 86.93: dark crimson ribbons (his intense feelings, now dark) burst from his chest one
     after another and wind round him and the globe, hugging their contour like a binding (behind and in front).
   "sarılsa" 87.91: he clutches it tight — the coils cinch round his chest and the globe, the glass is squeezed.
   "onda" 88.89: dark water fills the glass from below and drowns the little house; the clay round its foot turns to
     dark water (a soaking front spreading from the globe) and the level rises.
   "boğulur" 89.23: the heavy water-world sinks and, still clinging to it, bound by the coils, he goes down with it
     — quietly, head bowed, no struggle; a splash, a swell running out, air escaping from the glass in big bubbles.
   "gider" 89.73: his head slips under, rings spread, the surface closes; his shape fades in the depth.
   Ends on a calm dark water surface at screen y ≈ 900 with the far world mirrored in it: s20 bleeds in from there
   (the sky continues exactly: same far world, stars, cloud, sky parallax). */
(function () {
  const E = window.E;
  const PR = E.props;
  const T0 = 86.4;
  const lw = (i) => E.T(i) - T0;
  const TS = 3.95; // seconds of s18 before this shot (the night sky runs on continuously from s18)

  // ---- local soft-wash helpers (workaround): E.softFill keeps the scaled camera transform while drawing its
  //      far-off shape, and in the accelerated slot canvases Chrome scales the shadow offset with it, so soft
  //      washes land OFF·(zoom−1) px away under a zoomed camera. Here the path is moved to device space and
  //      drawn with an identity transform (as props-a's shadowDraw does), which is exact at any zoom.
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
    if (!o.soft || o.grad) { E.wash(ctx, path, color, o); return; }
    ctx.save();
    ctx.globalCompositeOperation = o.mode === 'over' ? 'source-over' : 'multiply';
    ctx.globalAlpha *= o.alpha ?? 1;
    softFillD(ctx, path, o.light ? E.shade(color, o.light) : color, o.soft);
    ctx.restore();
  }
  function lift(ctx, path, alpha = 1, soft = 0) {
    if (!soft) { E.lift(ctx, path, alpha); return; }
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha *= alpha;
    softFillD(ctx, path, '#ffffff', soft);
    ctx.restore();
  }
  function bloom(ctx, cx, cy, r, color, { seed = 3, alpha = 0.6, soft = 10, irr = 0.25 } = {}) {
    wash(ctx, E.blob(cx, cy, r, { seed, irr }), color, { alpha, soft });
  }

  // ---------------------------------------------------------------- staging (world coords; camera ≈ identity)
  const GY = 1150;                                   // mud horizon (= s18's last frame)
  const MX = 322, MH = 700, FEET = GY + 210;          // the man, stuck thigh-deep
  const GR = 250, GX = MX + 0.075 * MH + GR + 18, GCY = GY - GR + 22; // the glass world resting in the mud
  const WL = 1006;                                    // final water level
  const NIGHT = { tint: '#2E3B68', tintAmt: 0.24, desat: 0.25 };

  const K = {
    rib: [lw(160) - 0.1, lw(161) - 0.05, lw(162) - 0.13],  // ribbons burst: şedit, hissiyat, (ile)
    hug0: lw(164) - 0.15, hug1: lw(164) + 0.45,             // sarılsa: clutch, coils cinch
    fill0: lw(165) - 0.2, fill1: lw(165) + 0.16,            // onda: dark water fills the glass
    sink0: lw(165) + 0.16, sink1: lw(167) + 0.12,           // boğulur: the world sinks and drags him down
    gone: lw(167) + 0.02,                                   // gider: his head slips under
  };
  K.liq0 = lw(165) + 0.02; K.liq1 = lw(165) + 0.4;         // the mud turns to dark water (front from the globe)
  K.rise0 = lw(165) + 0.12; K.rise1 = K.sink1 + 0.3;       // the water level rises

  // ---------------------------------------------------------------- the night sky (continues s18's exactly)
  function drawSky(L, T, sc, fade) {
    E.camera(L, sc);
    const pnt = L.paint;
    const bx = 742, by = 300 + E.drift(T, 2, 0.3) * 3, br = 140;
    PR.bigWorld(L, bx, by, br, { t: T + 8, decor: 1, gateGlow: 0.8, rotSpeed: 0.025, rot: 0.08, aura: 0.9 });
    const m = pnt.getTransform();
    const sx = m.a * bx + m.c * by + m.e, sy = m.b * bx + m.d * by + m.f, R = br * Math.hypot(m.a, m.b);
    pnt.save();
    pnt.setTransform(1, 0, 0, 1, 0, 0);
    pnt.globalCompositeOperation = 'multiply';
    const gr = pnt.createRadialGradient(sx, sy - R * 0.2, 0, sx, sy - R * 0.2, R * 6);
    gr.addColorStop(0, '#C2CAE6'); gr.addColorStop(1.05 / 6, '#B4BEDF'); gr.addColorStop(1.5 / 6, '#8692C2');
    gr.addColorStop(2.4 / 6, '#525F94'); gr.addColorStop(1, '#2C3866');
    pnt.fillStyle = gr; pnt.fillRect(0, 0, E.W, E.H);
    const gt = pnt.createLinearGradient(0, 0, 0, 240);
    gt.addColorStop(0, '#6070A0'); gt.addColorStop(1, '#FFFFFF');
    pnt.fillStyle = gt; pnt.fillRect(0, 0, E.W, 240);
    pnt.restore();
    bloom(pnt, 120, 260, 240, '#2A3460', { seed: 3, alpha: 0.35, soft: 60 });
    bloom(pnt, 90, 900, 300, '#3E3A66', { seed: 7, alpha: 0.25, soft: 70, irr: 0.3 });
    bloom(pnt, 980, 820, 240, '#2A3460', { seed: 4, alpha: 0.3, soft: 60 });
    lift(pnt, E.blob(540, 1040, 420, { seed: 5, irr: 0.3, rx: 700, ry: 150 }), 0.12, 70);
    E.glow(L.light, sx - R * 0.55, sy - R * 0.55, R * 0.9, '#C9D6FF', 0.12);
    const r = E.rng(1818);
    for (let i = 0; i < 56; i++) {
      const x = r() * 1080, y = r() * 980, s = 0.9 + r() * 1.9, ph = r() * 10, sp = 1.5 + r() * 2;
      if (Math.hypot(x - bx, y - by) < br * 1.7) continue;
      const tw = 0.55 + 0.45 * Math.sin(T * sp + ph);
      lift(pnt, E.blob(x, y, s, { seed: i, irr: 0.1, n: 10 }), 0.62);
      if (s > 2.0) E.glow(L.light, x, y, s * 5, '#DCE5FF', 0.3 * tw);
    }
    PR.cloud(L, 140 + T * 8, 760, 260, { tone: 'night', seed: 9, t: T, alpha: 0.35 });
    return { sx, sy, R };
  }

  // ---------------------------------------------------------------- feeling ribbons that BIND him to the globe
  //  Each ribbon leaves his chest and winds round the group (man + globe) hugging its contour: at every height the
  //  loop spans from his back to the far side of the globe (only round him above/below the globe). Lower half of a
  //  loop = in front, upper half = behind. Opaque night paint (no glaze: crimson must stay crimson on the dark).
  const RIB = [
    { col: '#8C2C40', W: 32, yA: 866, yB: 1030, turns: 1.55, th0: 2.5, seed: 3 },
    { col: '#6A2244', W: 29, yA: 884, yB: 1118, turns: 1.7, th0: 0.6, seed: 5 },
    { col: '#8A3A2E', W: 25, yA: 900, yB: 802, turns: 1.6, th0: 4.1, seed: 8 }, // stays below his chin
  ];
  const BACK_X = () => MX - 0.062 * MH; // his back (roughly vertical in the hug)
  function globeHalf(y, squeeze) {
    const d = y - GCY;
    return Math.abs(d) < GR ? Math.sqrt(GR * GR - d * d) * (1 - 0.03 * squeeze) : -1;
  }
  function coil(rb, lt, tight, sinkY, manDX) {
    const n = 150, pts = [], front = [];
    const margin = E.lerp(32, -6, tight);
    const chest = [MX + 0.07 * MH + manDX, FEET - 0.71 * MH + sinkY];
    const yA = rb.yA, yB = E.lerp(rb.yB, rb.yA + (rb.yB - rb.yA) * 0.74, tight);
    const spin = 0.22 * lt + 0.9 * tight; // the coils keep winding, and wind in hard at "sarılsa"
    for (let i = 0; i <= n; i++) {
      const u = i / n, th = rb.th0 + spin * E.smooth(E.clamp(u / 0.3)) + u * rb.turns * E.TAU;
      const yb = E.lerp(yA, yB, u);
      const left = BACK_X() + manDX;
      const gh = globeHalf(yb, tight);
      const rightG = gh > 0 ? GX + gh : MX + 0.06 * MH;
      const right = Math.max(rightG, MX + 0.06 * MH) + manDX;
      const wob = 1 + 0.05 * E.noise1(u * 7 + rb.seed * 3.1 + lt * 0.6, rb.seed) * (1 - 0.6 * tight);
      const cx = (left + right) / 2, rx = ((right - left) / 2 + margin) * wob;
      const ry = rx * 0.13 + 6;
      let X = cx + rx * Math.cos(th), Y = yb + sinkY + ry * Math.sin(th);
      const b = E.smooth(E.clamp(u / 0.13));
      X = E.lerp(chest[0], X, b); Y = E.lerp(chest[1], Y, b);
      pts.push([X, Y]);
      front.push(Math.sin(th) > -0.05 || u < 0.08);
    }
    return { pts, front, tight };
  }
  /** paint the front (which=true) or back (false) runs of a ribbon, revealed to p */
  function paintRibbon(L, rb, C, p, which, lt, a) {
    const { pts, front } = C;
    const n = pts.length - 1;
    const last = Math.min(n, Math.floor(p * n));
    if (last < 2 || a <= 0.01) return;
    const W = rb.W * (1 + 0.14 * C.tight);
    const half = [], face = [];
    for (let i = 0; i <= last; i++) {
      const q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)];
      let nx = -(q[1] - o[1]), ny = q[0] - o[0];
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const u = i / n;
      const tw = Math.cos(1.9 * E.TAU * u + rb.seed * 1.3 + lt * 1.4);
      const tail = Math.sqrt(E.clamp(u / 0.07)), head = Math.pow(E.clamp((last - i) / 9), 0.5);
      const w = (W / 2) * (0.3 + 0.7 * Math.pow(Math.abs(tw), 0.6)) * Math.max(0.1, tail) * Math.max(0.08, head);
      half.push([nx * w, ny * w]); face.push(tw >= 0);
    }
    const P = L.paint;
    const back = E.shade(rb.col, -0.38), dark = E.shade(rb.col, -0.6), hi = E.mix(rb.col, '#E7B6BE', 0.45);
    P.save();
    P.globalAlpha *= a;
    let i = 0;
    while (i < last) {
      if (front[i] !== which) { i++; continue; }
      let j = i;
      while (j + 1 <= last && front[j + 1] === which && face[j + 1] === face[i]) j++;
      const i0 = Math.max(0, i - 1), i1 = Math.min(last, j + 1);
      const side = (f0, f1) => {
        const A = [], B = [];
        for (let k = i0; k <= i1; k++) {
          A.push([pts[k][0] + half[k][0] * f0, pts[k][1] + half[k][1] * f0]);
          B.push([pts[k][0] + half[k][0] * f1, pts[k][1] + half[k][1] * f1]);
        }
        const path = new Path2D();
        A.concat(B.reverse()).forEach((q, m) => (m ? path.lineTo(q[0], q[1]) : path.moveTo(q[0], q[1])));
        path.closePath();
        return path;
      };
      const body = side(1, -1);
      P.globalCompositeOperation = 'source-over';
      P.fillStyle = face[i] ? rb.col : back;
      P.fill(body);
      // shadow edge + (front face) a moonlit sheen along the upper edge
      P.globalCompositeOperation = 'multiply';
      P.fillStyle = E.rgba(dark, face[i] ? 0.42 : 0.3);
      P.fill(side(-0.25, -1));
      P.fillStyle = E.rgba(dark, 0.25);
      P.fill(side(1, 0.82));
      if (face[i] && which) {
        P.globalCompositeOperation = 'source-over';
        P.fillStyle = E.rgba(hi, 0.34);
        P.fill(side(0.7, 0.28));
      }
      for (const c of [L.ink, L.light]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.fill(body); c.restore(); }
      const edge = [];
      for (let k = i0; k <= i1; k++) edge.push([pts[k][0] + half[k][0], pts[k][1] + half[k][1]]);
      E.pencil(L.ink, edge, { w: 1.2, a: 0.26 * a, double: false });
      i = j + 1;
    }
    // pale streaks flowing along the ribbon (the feeling keeps pouring out of him)
    P.globalCompositeOperation = 'source-over';
    P.strokeStyle = E.rgba('#EFC4CC', 0.2);
    P.lineWidth = Math.max(1.2, W * 0.11);
    P.lineCap = 'round';
    P.setLineDash([W * 2.4, W * 1.9]);
    P.lineDashOffset = -lt * W * 3.4;
    let started = false;
    P.beginPath();
    for (let k = 0; k <= last; k++) {
      if (front[k] !== which) { started = false; continue; }
      const q = [pts[k][0] + half[k][0] * 0.3, pts[k][1] + half[k][1] * 0.3];
      if (!started) { P.moveTo(q[0], q[1]); started = true; } else P.lineTo(q[0], q[1]);
    }
    P.stroke();
    P.setLineDash([]);
    P.restore();
  }

  // ---------------------------------------------------------------- water
  function level(lt) { return E.lerp(GY - 3, WL, E.ep(lt, K.rise0, K.rise1, 'inOutSine')); }
  function surfY(x, lt) {
    const calm = Math.exp(-Math.max(0, lt - K.rise1) * 1.4);
    const A = 1.6 + 9 * E.ep(lt, K.liq0, K.liq0 + 0.3) * calm;
    let crest = 0; // a swell rolling outward from the collapse
    const cu = E.seg(lt, K.sink0 + 0.1, K.sink0 + 1.4);
    if (cu > 0 && cu < 1) {
      const d = 40 + cu * 900, f = Math.sin(Math.PI * cu);
      crest = -30 * f * (Math.exp(-Math.pow((x - (GX - d)) / 110, 2)) + 0.8 * Math.exp(-Math.pow((x - (GX + d)) / 110, 2)));
    }
    return level(lt) + crest + A * Math.sin(x * 0.012 - lt * 2.2) + A * 0.45 * Math.sin(x * 0.031 + lt * 2.9 + 1.3);
  }
  function waterPath(lt) {
    const p = new Path2D();
    for (let x = -300, i = 0; x <= 1380; x += 12, i++) { const y = surfY(x, lt); if (i) p.lineTo(x, y); else p.moveTo(x, y); }
    p.lineTo(1380, 2900); p.lineTo(-300, 2900); p.closePath();
    return p;
  }
  /** lobed front of the mud turning to water, spreading from the foot of the collapsing globe */
  function liqFront(q) {
    const rx = 40 + 2400 * Math.pow(q, 1.1), ry = 10 + 2300 * Math.pow(q, 1.4);
    const pts = [];
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * E.TAU, ca = Math.cos(a), sa = Math.sin(a);
      const k = 1 + 0.14 * E.fbm2(ca * 2.2 + 3, sa * 2.2 + 8, 41, 3) + 0.04 * Math.pow(Math.abs(Math.sin(a * 13)), 0.5);
      pts.push([GX + ca * rx * k, GY + 10 + sa * ry * k]);
    }
    return E.smoothPath(pts, true);
  }
  function groundPath() {
    const p = new Path2D();
    for (let x = -300, i = 0; x <= 1380; x += 20, i++) {
      const y = GY + 3 * Math.sin(x * 0.006 + 1.1);
      if (i) p.lineTo(x, y); else p.moveTo(x, y);
    }
    p.lineTo(1380, 2900); p.lineTo(-300, 2900); p.closePath();
    return p;
  }
  function ring(ctx, x, y, rx, ry, color, width, alpha, mode = 'source-over') {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = mode;
    ctx.globalAlpha *= alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, E.TAU);
    ctx.stroke();
    ctx.restore();
  }
  /** an air bubble in the dark water: a pale translucent body (lighter than the water, never a dark disc), a thin
      rim and a small crescent of light on its upper left (a dark disc with a dot highlight read as an eye) */
  function bubble(ctx, x, y, rx, ry, a) {
    const b = new Path2D(); b.ellipse(x, y, rx, ry, 0, 0, E.TAU);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha *= a;
    ctx.fillStyle = 'rgba(176,188,222,0.22)'; ctx.fill(b);
    ctx.strokeStyle = 'rgba(200,210,236,0.55)'; ctx.lineWidth = Math.max(1.1, rx * 0.12); ctx.stroke(b);
    ctx.strokeStyle = 'rgba(236,240,250,0.7)'; ctx.lineWidth = Math.max(1, rx * 0.16); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x, y, rx * 0.62, ry * 0.62, 0, 3.6, 4.6); ctx.stroke();
    ctx.restore();
  }
  function eraseUnder(L, path, a = 1) {
    for (const c of [L.ink, L.light]) { c.save(); c.globalCompositeOperation = 'destination-out'; c.globalAlpha = a; c.fillStyle = '#000'; c.fill(path); c.restore(); }
  }

  // ---------------------------------------------------------------- the mud (as s18's clay)
  function drawMud(L, lt, clipOut) {
    const pnt = L.paint;
    const gp = groundPath();
    E.save(L);
    if (clipOut) { const inv = new Path2D(); inv.rect(-3000, -3000, 8000, 8000); inv.addPath(clipOut); E.each(L, (c) => c.clip(inv, 'evenodd')); }
    eraseUnder(L, gp);
    wash(pnt, gp, '#3F3537', { mode: 'over', grad: { from: [0, GY - 10], to: [0, 2000], stops: [[0, '#5E4E50'], [0.05, '#4A3C44'], [0.36, '#30283A'], [1, '#211C2B']] } });
    pnt.save(); pnt.clip(gp);
    bloom(pnt, 200, GY + 260, 260, '#6A5040', { seed: 31, alpha: 0.26, soft: 40 });
    bloom(pnt, 860, GY + 200, 280, '#4E3E58', { seed: 32, alpha: 0.32, soft: 40 });
    bloom(pnt, 560, GY + 520, 320, '#1A1724', { seed: 33, alpha: 0.32, soft: 50 });
    // grazing sheen near the horizon, slow viscous highlights, long folds
    wash(pnt, E.rrect(-300, GY - 4, 1700, 70, 30), '#8A96C0', { mode: 'over', alpha: 0.22, soft: 18 });
    const hl = E.rng(52);
    for (let i = 0; i < 4; i++) {
      const xa = -60 + i * 300 + hl() * 90 + lt * 5, w = 30 + hl() * 50, yy = GY + 8 + hl() * 20 + i * 2;
      lift(pnt, E.blob(xa, yy, w, { rx: w, ry: 2.4, seed: 90 + i, irr: 0.35, n: 16 }), 0.28 * (0.75 + 0.25 * Math.sin(lt * 2 + i)), 2.5);
    }
    const fr = E.rng(64);
    for (let k = 0; k < 6; k++) {
      const off = 50 + k * 70 + fr() * 30, x0 = -160 + fr() * 500, x1 = x0 + 340 + fr() * 460, pts = [];
      for (let x = x0; x <= x1; x += 22) pts.push([x + lt * 4, GY + off + Math.sin(x * 0.017 + k * 1.7) * 5]);
      E.dryBrush(pnt, pts, k % 2 ? '#1A1622' : '#6A5A62', { width: 10 + fr() * 12, seed: 80 + k, alpha: 0.2, bristles: 6 });
    }
    pnt.restore();
    E.pencil(L.ink, E.smoothPath([[-160, GY + 2], [300, GY - 2], [800, GY + 3], [1240, GY]]), { w: 1.5, a: 0.24 });
    E.restore(L);
  }

  // ---------------------------------------------------------------- draw
  const sinkShape = (x) => (x < 0.25 ? 0.6 * x * x / 0.25 : 0.15 + 0.85 * E.ease.outCubic((x - 0.25) / 0.75));
  // sink depth chosen so that the top of his (bowed) head (≈0.97·MH above the feet) goes under just after "gider"
  const SINK_A = (() => {
    const tg = K.gone + 0.05;
    const lv = E.lerp(GY - 3, WL, E.ep(tg, K.rise0, K.rise1, 'inOutSine'));
    return (lv - 14 - FEET + 0.97 * MH) / sinkShape(E.seg(tg, K.sink0, K.sink1));
  })();
  const sinkAt = (t) => E.ep(t, K.sink0, K.sink1, sinkShape) * SINK_A + Math.max(0, t - K.sink1) * 90;

  // ---------------------------------------------------------------- the embrace (hands on the glass, by IK)
  // the globe's squeeze and tilt (shared by the globe and the hands resting on it)
  function globeState(lt, tight) {
    const sq = 0.05 * tight + 0.016 * Math.sin(lt * 26) * E.ep(lt, K.hug0, K.hug0 + 0.15) * (1 - E.ep(lt, K.hug0 + 0.15, K.hug1));
    const tilt = 0.05 * E.ep(lt, K.sink0, K.sink1, 'inOutSine');
    return { sq, tilt };
  }
  /** a point on the glass given relative to its centre (units of GR, unsqueezed) → world, through the globe's own
      transform (pivot at its foot: squeeze, tilt, sink) */
  function onGlobe(u, v, g, sinkY) {
    const px = u * GR, py = v * GR - GR;
    const x1 = (1 - g.sq) * px, y1 = (1 + 0.7 * g.sq) * py;
    const c = Math.cos(g.tilt), s = Math.sin(g.tilt);
    return [GX + x1 * c - y1 * s, GCY + GR + sinkY + x1 * s + y1 * c];
  }
  // shoulder of a side-view pose relative to the ground point — mirrors E.man's skeleton & grounding
  const MR = E.man.R;
  function shoulderOf(P, h) {
    const dirOf = (a) => [Math.sin(a), Math.cos(a)];
    const hip = [(P.hipX || 0) * h, -MR.hipY * h + (P.hipDrop || 0) * h];
    const lean = P.lean || 0;
    const td = dirOf(Math.PI - lean);
    const nb = [hip[0] + td[0] * MR.torso * h, hip[1] + td[1] * MR.torso * h];
    const ox = -0.012 * h, oy = 0.03 * h;
    const sh = [nb[0] + ox * Math.cos(lean) - oy * Math.sin(lean), nb[1] + ox * Math.sin(lean) + oy * Math.cos(lean)];
    const legLow = (hp, k) => hip[1] + Math.cos(hp) * MR.thigh * h + Math.cos(hp - k) * MR.shin * h + 0.035 * h;
    const low = Math.max(legLow(P.nH ?? 0.02, P.nK ?? 0.04), legLow(P.fH ?? -0.02, P.fK ?? 0.04));
    return [sh[0], sh[1] - low];
  }
  // two-bone IK: shoulder angle + elbow bend so the wrist reaches T (the elbow hangs below the line: never reversed)
  function armIK(S, T, h) {
    const L1 = MR.upper * h, L2 = MR.fore * h;
    const dx = T[0] - S[0], dy = T[1] - S[1];
    const d = E.clamp(Math.hypot(dx, dy), 1, (L1 + L2) * 0.985);
    const bend = Math.acos(E.clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1));
    const al = Math.atan2(L2 * Math.sin(bend), L1 + L2 * Math.cos(bend));
    const s = Math.atan2(dx, dy) - al;
    return { s, e: bend, a2: s + bend };
  }
  /** both arms round the face of the glass at chest height (the far one a little higher), palms flat on it; as he
      clutches, the hands draw in (the elbows bend: he squeezes it) */
  function embraceArms(P, lt, tight, sinkY, manDX) {
    const g = globeState(lt, tight);
    const S = shoulderOf(P, MH);
    const Sw = [MX + manDX + S[0], FEET + sinkY + S[1]];
    const nT = onGlobe(E.lerp(-0.33, -0.4, tight), E.lerp(-0.2, -0.17, tight), g, sinkY);
    const fT = onGlobe(E.lerp(-0.3, -0.37, tight), E.lerp(-0.48, -0.45, tight), g, sinkY);
    const nA = armIK(Sw, nT, MH), fA = armIK(Sw, fT, MH);
    const wr = (x) => 0.9 * Math.tanh(x / 0.9); // soft wrist limit
    return { nS: nA.s, nE: nA.e, nW: wr(1.38 - nA.a2), fS: fA.s, fE: fA.e, fW: wr(1.45 - fA.a2) };
  }
  function draw(L, lt) {
    const T = lt + TS;
    const tight = E.ep(lt, K.hug0, K.hug1, 'inOutCubic');
    const sinkY = sinkAt(lt);

    // camera: a slow push toward the hug, then it follows him down and settles on the closed surface (y 900)
    const push = E.ep(lt, 0, 2.4, 'inOutSine');
    const fol = E.ep(lt, K.liq0, K.rise1 + 0.25, 'inOutSine');
    const zoom = 1 + 0.07 * push * (1 - fol);
    const cyBase = 960 - 40 * push * (1 - fol) + (WL - 900) * fol;
    const cam = { x: 540 + 30 * push * (1 - fol) + 5 * E.drift(lt, 2, 0.4), y: cyBase + 4 * E.drift(lt, 7, 0.35), zoom };
    const sc = { x: 540, y: 964.84 + (cyBase - 960) * 0.22, zoom: 1.044 + (zoom - 1) * 0.22 };

    const sky = drawSky(L, T, sc);
    E.camera(L, cam);
    const pnt = L.paint;
    // moonlit haze above the horizon (as s18)
    wash(pnt, E.rrect(-300, GY - 150, 1700, 200, 100), '#FFFFFF', { mode: 'over', alpha: 0.08, soft: 50 });

    // ---- ribbons: geometry, back runs ----
    const ribA = 1 - E.ep(lt, K.gone + 0.05, K.gone + 0.6);
    const manDX = 0;
    const ribs = RIB.map((rb, k) => ({ rb, p: E.ep(lt, K.rib[k], K.rib[k] + 0.85, 'outCubic') }))
      .filter((o) => o.p > 0)
      .map((o) => ({ ...o, C: coil(o.rb, lt, tight, sinkY, manDX) }));
    for (const o of ribs) paintRibbon(L, o.rb, o.C, o.p, false, lt, ribA);

    // ---- the false world: squeezed by the hug, filled with dark water; then it sinks, dragging him down ----
    const fill = E.ep(lt, K.fill0, K.fill1, 'inOutSine');
    {
      const { sq, tilt } = globeState(lt, tight);
      E.save(L);
      E.translate(L, GX, GCY + GR + sinkY); E.rotate(L, tilt); E.scale(L, 1 - sq, 1 + sq * 0.7); E.translate(L, -GX, -(GCY + GR));
      PR.personalWorld(L, GX, GCY, GR, { kind: 'home', night: 1, glow: 0.35 * (1 - fill), life: 0.6 * (1 - fill), t: T, dissolve: Math.min(1, fill * 0.95) });
      // tame the big paper-white highlight window of the glass on the night (a cool glaze over it)
      const gc = new Path2D(); gc.arc(GX, GCY, GR * 0.99, 0, E.TAU);
      pnt.save(); pnt.clip(gc);
      // (it sits right by his hands: a bright paper-white patch there read as a sheet held in the hand)
      const hg = pnt.createRadialGradient(GX - GR * 0.42, GCY - GR * 0.55, 0, GX - GR * 0.42, GCY - GR * 0.55, GR * 0.7);
      hg.addColorStop(0, 'rgba(104,116,166,0.9)'); hg.addColorStop(0.6, 'rgba(110,122,170,0.6)'); hg.addColorStop(1, 'rgba(118,130,176,0)');
      pnt.globalCompositeOperation = 'multiply'; pnt.fillStyle = hg; pnt.fillRect(GX - GR, GCY - GR, GR * 2, GR * 2);
      const hk = pnt.createRadialGradient(GX - GR * 0.42, GCY - GR * 0.55, 0, GX - GR * 0.42, GCY - GR * 0.55, GR * 0.6);
      hk.addColorStop(0, 'rgba(58,66,108,0.7)'); hk.addColorStop(0.7, 'rgba(58,66,108,0.45)'); hk.addColorStop(1, 'rgba(58,66,108,0)');
      pnt.globalCompositeOperation = 'source-over'; pnt.fillStyle = hk; pnt.fillRect(GX - GR, GCY - GR, GR * 2, GR * 2);
      const hg2 = pnt.createRadialGradient(GX + GR * 0.62, GCY + GR * 0.42, 0, GX + GR * 0.62, GCY + GR * 0.42, GR * 0.42);
      hg2.addColorStop(0, 'rgba(118,130,176,0.5)'); hg2.addColorStop(1, 'rgba(118,130,176,0)');
      pnt.fillStyle = hg2; pnt.fillRect(GX - GR, GCY - GR, GR * 2, GR * 2);
      pnt.restore();
      // the squeeze cracks the glass: a thin bright fracture running in sideways from its right flank (kept clear of
      // the little moon inside it — a ring over a branching line read as a stick figure — and never top-down, where
      // it read as a lightning bolt striking the little world)
      const ck = E.ep(lt, K.hug0 + 0.28, K.hug0 + 0.42, 'outCubic');
      if (ck > 0) {
        const C0 = [[0.95, -0.2], [0.84, -0.25], [0.78, -0.17], [0.68, -0.21], [0.62, -0.12], [0.52, -0.14]];
        const C1 = [[0.84, -0.25], [0.8, -0.34], [0.84, -0.41]];
        const C2 = [[0.68, -0.21], [0.63, -0.29], [0.57, -0.3]];
        const P = (arr, k) => { const m = Math.max(2, Math.ceil(arr.length * k)); const path = new Path2D(); arr.slice(0, m).forEach(([x, y], i) => (i ? path.lineTo(GX + x * GR, GCY + y * GR) : path.moveTo(GX + x * GR, GCY + y * GR))); return path; };
        pnt.save(); pnt.globalCompositeOperation = 'source-over'; pnt.lineJoin = 'round'; pnt.lineCap = 'round';
        pnt.strokeStyle = 'rgba(226,232,248,0.62)'; pnt.lineWidth = 2;
        pnt.stroke(P(C0, ck)); pnt.lineWidth = 1.3; pnt.stroke(P(C1, E.clamp(ck * 1.6 - 0.6))); pnt.stroke(P(C2, E.clamp(ck * 1.6 - 0.6)));
        pnt.restore();
        E.pencil(L.ink, P(C0, ck), { w: 1, a: 0.3, double: false });
        const fl = Math.exp(-Math.max(0, lt - K.hug0 - 0.3) * 6) * ck;
        if (fl > 0.02) E.glow(L.light, GX + 0.8 * GR, GCY - 0.22 * GR, 60, '#DDE6FF', 0.5 * fl);
      }
      if (fill > 0) {
        // dark water rising inside the glass, drowning the little house
        const wy = GCY + GR - 2.05 * GR * fill;
        const wpth = new Path2D();
        for (let x = GX - GR - 10, i = 0; x <= GX + GR + 10; x += 10, i++) {
          const y = wy + 7 * Math.sin(x * 0.03 - lt * 5) * (1 - fill * 0.6);
          if (i) wpth.lineTo(x, y); else wpth.moveTo(x, y);
        }
        wpth.lineTo(GX + GR + 10, GCY + GR + 10); wpth.lineTo(GX - GR - 10, GCY + GR + 10); wpth.closePath();
        pnt.save(); pnt.clip(gc);
        wash(pnt, wpth, '#353C68', { mode: 'over', alpha: 0.9, grad: { from: [0, wy], to: [0, GCY + GR], stops: [[0, '#55608F'], [0.08, '#363E6A'], [1, '#1F2140']] } });
        if (fill < 0.98) lift(pnt, E.blob(GX - GR * 0.3, wy + 9, 30, { rx: GR * 0.42, ry: 3, seed: 3, irr: 0.2 }), 0.3, 2);
        // a dark glassy sphere: rim light on the moonlit side once full
        pnt.restore();
      }
      E.restore(L);
    }

    // ---- the man: hugs, clutches, then goes down with the world, still holding it ----
    // an embrace of the huge glass: both arms reach round its face at chest height (the far arm a little higher,
    // behind), palms flat on the glass, head bowed toward it. The hands stay well below the top of his head, so
    // nothing of him (no hand) is left above the water once his head has gone under.
    const hug = { lean: 0.18, head: 0.35, nH: 0.08, nK: 0.12, fH: -0.1, fK: 0.08 };
    const clutch = { lean: 0.24, head: 0.46, nH: 0.1, nK: 0.16, fH: -0.12, fK: 0.12 };
    let pose = E.man.lerp(hug, clutch, tight);
    // going under: he does not let go — head bows a little further toward the glass, no struggle (rule: tasteful)
    const lose = E.ep(lt, K.liq0, K.sink0 + 0.5, 'inOutSine');
    pose.head += 0.08 * lose;
    pose.lean += 0.012 * Math.sin(lt * 2.4) * (1 - lose);
    Object.assign(pose, embraceArms(pose, lt, tight, sinkY, manDX));
    const manA = 1 - E.ep(lt, K.gone + 0.1, K.gone + 0.75);
    if (manA > 0.01) E.man.draw(L, { x: MX + manDX, y: FEET + sinkY, h: MH, view: 'side', facing: 1, pose, alpha: manA, ...NIGHT });

    // ---- ribbons: front runs ----
    for (const o of ribs) paintRibbon(L, o.rb, o.C, o.p, true, lt, ribA * manA);

    // ---- mud (his legs and the globe's foot are in it) until it has turned to water ----
    const liq = E.ep(lt, K.liq0, K.liq1, 'outQuad');
    const front = liq > 0 ? liqFront(liq) : null;
    if (liq < 1) {
      drawMud(L, lt, front);
      if (front) { // the clay soaks and darkens just ahead of the water
        const gpc = groundPath();
        pnt.save(); pnt.clip(gpc);
        wash(pnt, liqFront(Math.min(1, liq * 1.1 + 0.02)), '#1E2040', { alpha: 0.45 * (1 - liq), soft: 22 });
        pnt.restore();
      }
      // clinging lip of mud round his legs (only while he is still stuck in the clay)
      const lipA = 1 - E.ep(lt, K.liq0, K.liq0 + 0.15);
      if (lipA > 0.01) {
        const lx = MX - 0.02 * MH + manDX;
        const lip = E.smoothPath([[lx - 130, GY + 22], [lx - 80, GY + 8], [lx - 40, GY + 1], [lx, GY - 2], [lx + 40, GY + 1], [lx + 86, GY + 8], [lx + 136, GY + 22], [lx, GY + 30]], true);
        E.save(L); E.alpha(L, lipA);
        eraseUnder(L, lip);
        wash(pnt, lip, '#4A3C42', { mode: 'over' });
        wash(pnt, lip, '#2C2530', { alpha: 0.5, grad: { from: [lx - 100, 0], to: [lx + 100, 0], stops: [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(44,37,48,0.2)'], [1, 'rgba(44,37,48,0.9)']] } });
        pnt.save(); pnt.globalCompositeOperation = 'source-over'; pnt.globalAlpha *= 0.4; pnt.strokeStyle = '#B4BCD4'; pnt.lineWidth = 3; pnt.lineCap = 'round';
        pnt.stroke(E.smoothPath([[lx - 100, GY + 14], [lx - 56, GY + 5], [lx - 14, GY]])); pnt.restore();
        E.pencil(L.ink, E.smoothPath([[lx - 126, GY + 21], [lx - 44, GY + 2], [lx + 44, GY + 2], [lx + 132, GY + 21]]), { w: 1.3, a: 0.3 });
        E.restore(L);
      }
    }

    // ---- the dark water ----
    if (liq > 0) {
      const wp = waterPath(lt);
      const lv = level(lt);
      E.save(L);
      if (liq < 1) E.each(L, (c) => c.clip(front));
      // under water: pencil and light fade with depth
      for (const c of [L.ink, L.light]) {
        c.save();
        c.globalCompositeOperation = 'destination-out';
        const g = c.createLinearGradient(0, lv - 10, 0, lv + 320);
        g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,1)');
        c.fillStyle = g; c.fill(wp);
        c.restore();
      }
      wash(pnt, wp, '#2B2C4C', { grad: { from: [0, lv - 20], to: [0, lv + 860], stops: [[0, '#7380AE'], [0.05, '#4A5280'], [0.3, '#383D64'], [1, '#2A2A44']] }, alpha: 0.92 });
      wash(pnt, wp, '#4A2E44', { alpha: 0.22, grad: { from: [0, lv + 100], to: [0, lv + 800], c2: '#22182A' } });
      // depth veil: what sinks fades into the dark
      pnt.save();
      pnt.globalCompositeOperation = 'source-over';
      const dv = pnt.createLinearGradient(0, lv, 0, lv + 520);
      dv.addColorStop(0, 'rgba(36,38,66,0.18)'); dv.addColorStop(0.35, 'rgba(36,38,66,0.5)'); dv.addColorStop(1, 'rgba(36,38,66,0.8)');
      pnt.fillStyle = dv; pnt.fill(wp);
      pnt.restore();
      pnt.save(); pnt.clip(wp);
      bloom(pnt, 860, lv + 380, 320, '#1C1830', { seed: 41, alpha: 0.32, soft: 60 });
      bloom(pnt, 160, lv + 560, 300, '#2E2038', { seed: 42, alpha: 0.26, soft: 60 });
      lift(pnt, E.blob(540, lv + 40, 300, { rx: 700, ry: 50, seed: 3, irr: 0.2 }), 0.1, 30);
      // the far world mirrored in the water (soft smear + broken shimmer under it)
      const rx = cam.x + (sky.sx - 540) / cam.zoom;
      wash(pnt, E.blob(rx, lv + 60, 50, { seed: 61, irr: 0.3, rx: 58, ry: 90 }), '#8FA39A', { mode: 'over', alpha: 0.16 * liq, soft: 30 });
      const rr = E.rng(61);
      for (let i = 0; i < 6; i++) {
        const yy = 9 + i * 15 + i * i * 3.2, ww = (70 - i * 10) * (0.6 + 0.4 * rr());
        const xx = rx + Math.sin(T * 1.3 + i * 2.3) * (5 + i * 2) + (rr() - 0.5) * 30;
        lift(pnt, E.blob(xx, surfY(xx, lt) + yy, ww, { rx: ww, ry: 2.6 + i * 0.2, seed: i + 2, irr: 0.45, n: 18 }), 0.3 * (1 - i / 7) * liq, 2.5);
      }
      const top = [];
      for (let x = -160; x <= 1240; x += 18) top.push([x, surfY(x, lt) + 3]);
      pnt.save(); pnt.globalCompositeOperation = 'source-over'; pnt.globalAlpha *= 0.3; pnt.strokeStyle = '#B5BEDA'; pnt.lineWidth = 3; pnt.stroke(E.smoothPath(top)); pnt.restore();
      pnt.restore();
      const topI = [];
      for (let x = -160; x <= 1240; x += 24) topI.push([x, surfY(x, lt)]);
      E.pencil(L.ink, topI, { w: 1.5, a: 0.3, seed: 6 });
      // the wet front where mud turns to water: a dark drying edge
      if (liq < 1) {
        pnt.save(); pnt.clip(wp); pnt.globalCompositeOperation = 'multiply'; pnt.globalAlpha *= 0.4 * (1 - liq); pnt.strokeStyle = '#1A1724'; pnt.lineWidth = 4; pnt.stroke(front); pnt.restore();
      }
      E.restore(L);

      // the splash of the collapsing world: a crown of dark drops
      const dr = E.rng(195);
      for (let i = 0; i < 16; i++) {
        const t0 = K.sink0 + 0.06 + dr() * 0.16;
        const x0 = GX + (dr() - 0.5) * GR * 1.8, vx = (dr() - 0.5) * 460, vy = 320 + dr() * 330, sz = 3 + dr() * 4.5;
        const tau = lt - t0;
        if (tau <= 0) continue;
        const x = x0 + vx * tau, y = GY - 10 - vy * tau + 0.5 * 2600 * tau * tau;
        if (y > surfY(x, lt) + 6) continue;
        wash(pnt, E.blob(x, y, sz, { seed: i, irr: 0.25, n: 12, rx: sz * 0.85, ry: sz * 1.15 }), '#38406A', { mode: 'over' });
        lift(pnt, E.blob(x - sz * 0.3, y - sz * 0.3, sz * 0.25, { seed: i + 5, n: 10 }), 0.5);
      }
      // where he goes through the surface: a churning ring + foam
      const thr = E.ep(lt, K.sink0 + 0.1, K.sink0 + 0.3) * (1 - E.ep(lt, K.gone, K.gone + 0.4));
      if (thr > 0) {
        const sx = MX + 30, sy = surfY(sx, lt);
        ring(pnt, sx, sy + 3, 76 + 12 * Math.sin(lt * 9), 11, '#C3CBE4', 2.4, 0.55 * thr);
        lift(pnt, E.blob(sx - 44, sy + 1, 14, { rx: 28, ry: 4, seed: 4, irr: 0.3 }), 0.4 * thr, 2);
        lift(pnt, E.blob(sx + 50, sy + 2, 12, { rx: 22, ry: 3.5, seed: 6, irr: 0.3 }), 0.35 * thr, 2);
      }
      // bubbles rising from him, popping as small rings at the surface
      const br = E.rng(91);
      for (let i = 0; i < 18; i++) {
        const t0 = K.sink0 + 0.3 + br() * 1.75, size = 3.5 + br() * 8, sp = 230 + br() * 220, ph = br() * 6;
        const tau = lt - t0;
        if (tau <= 0) continue;
        // they start just above his head and rise from there: never drawn over his face or hands
        const x0 = MX + 34 + (br() - 0.5) * 60;
        const y0 = FEET - MH * 1.02 + sinkAt(t0);
        const y = y0 - sp * tau, x = x0 + Math.sin(tau * 7 + ph) * 6, sy = surfY(x, lt);
        if (y > sy + 6) bubble(pnt, x, y, size, size, 0.85);
        else {
          const v = (sy + 6 - y) / (sp * 0.5);
          if (v < 1) ring(pnt, x, sy + 2, size * (1.2 + v * 3), size * 0.32 * (1 + v * 2), '#C3CBE4', 1.6, (1 - v) * 0.6);
        }
      }
      // large air bubbles escaping from the sinking glass world
      const gb = E.rng(93);
      for (let i = 0; i < 7; i++) {
        const t0 = K.sink0 + 0.45 + gb() * 1.4, size = 8 + gb() * 9, sp = 200 + gb() * 140, ph = gb() * 6;
        const tau = lt - t0;
        if (tau <= 0) continue;
        const x0 = GX + 40 + gb() * 130, y0 = GCY + sinkY - GR * 0.3; // the right half of the glass, away from his hands
        const y = y0 - sp * tau, x = x0 + Math.sin(tau * 5 + ph) * 8, sy = surfY(x, lt);
        if (y > sy + 8) bubble(pnt, x, y, size, size * 0.86, 0.8);
        else {
          const v = (sy + 8 - y) / (sp * 0.45);
          if (v < 1) ring(pnt, x, sy + 2, size * (1.2 + v * 3.4), size * 0.3 * (1 + v * 2), '#C3CBE4', 1.8, (1 - v) * 0.6);
        }
      }
      // the last ripples where his head slipped under, spreading as the surface closes
      for (const [t0, s] of [[K.gone, 1], [K.gone + 0.4, 0.75], [K.gone + 0.85, 0.55]]) {
        const u = (lt - t0) / 1.7;
        if (u <= 0 || u >= 1) continue;
        const rr2 = 24 + u * 460 * s;
        ring(pnt, MX + 50, surfY(MX + 50, lt) + 5, rr2, rr2 * 0.1, '#B5BEDA', 2.6 * (1 - u) + 0.6, (1 - u) * 0.62);
      }
    }
    // the night closes in (the same vignette as s18's last frame, deepening as he goes under)
    const vg = 0.45 + 0.1 * E.ep(lt, K.fill0, K.gone + 0.5);
    pnt.save();
    pnt.setTransform(1, 0, 0, 1, 0, 0);
    const g = pnt.createRadialGradient(540, 820, 300, 540, 900, 1250);
    g.addColorStop(0, 'rgba(30,36,66,0)');
    g.addColorStop(1, `rgba(24,28,52,${vg})`);
    pnt.globalCompositeOperation = 'multiply';
    pnt.fillStyle = g;
    pnt.fillRect(0, 0, E.W, E.H);
    pnt.restore();
  }

  E.scene('s19', {
    draw,
    wc: [1, 1.05, 3, 0.55],
    sfx() {
      return [
        { t: T0 + K.rib[0] + 0.02, type: 'whoosh', gain: 0.28 },
        { t: T0 + K.rib[1] + 0.02, type: 'whoosh', gain: 0.22, pitch: 0.8 },
        { t: T0 + K.hug0 + 0.12, type: 'thorn', gain: 0.2 },
        { t: T0 + K.hug0 + 0.3, type: 'chime', gain: 0.07, pitch: 2 },
        { t: T0 + K.fill0 + 0.08, type: 'drone', gain: 0.22, dur: 3.4 },
        { t: T0 + K.sink0 + 0.05, type: 'water', gain: 0.42 },
        { t: T0 + K.sink0 + 0.35, type: 'bubbles', gain: 0.3, dur: 1.8 },
        { t: T0 + K.gone, type: 'water', gain: 0.14, pitch: 1.3 },
      ];
    },
  });
})();
