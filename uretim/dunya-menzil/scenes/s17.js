/* s17 · 77.45–82.45 · "hususi kararsız dünyasını, aynı umumî dünya gibi sabit bilip"
   Moonlit meadow. The big world floats far away in the night sky — steady, slowly turning, its lanterns lit.
   The man holds his own little glass world in his hands.
   - hususi (77.71): his world lights up softly in his hands (close framing).
   - kararsız (78.29): it starts to flicker and tremble — outline breaking, ghost rims, transparency fluttering.
   - dünyasını (78.85): the camera eases back: the big world reads, steady, high above.
   - aynı umumî dünya gibi (80.05–81.1): "umumî": the big world glows up; in his eyes the little world swells to
     the very size of the big world and looks as solid as it (opaque body, moonlit volume, firm contour, warm
     aura) — but a dashed pencil circle keeps its true, small size inside.
   - sabit bilip (81.47): his palms come down on top of it and press it into the ground: heavy thud (squash,
     dust, cracks, camera shake); its flicker freezes into a false stillness (inner life stops).
     bilip (81.89): he straightens up, proud (leads into s18's monument).
   The night sky is built in s18's frame (identity at the cut): the big world, stars, blooms and the low cloud
   continue seamlessly across the cut. Incoming: bleed from s16 at (540, 760). Outgoing: cut to s18. */
(function () {
  const E = window.E, PR = E.props;
  const S0 = 77.45;
  const w = (i) => E.T(i) - S0;

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

  // ---- staging (ground coords; camera identity = screen) ----
  const GY = 1150;                              // man's ground line
  const MAN = { x: 225, h: 490 };
  const BW = { x: 742, y: 300, r: 140 };        // the big world, in s18's sky frame
  const R0 = 80, R1 = 142;                      // personal world: true size → illusion size (≈ the big world)
  const ANCH = [330, 800];                      // it rests on his hands: grows up and to the right from here
  const DIR = [0.75, -0.66];
  const C2 = [440, GY - R1];                    // planted on the ground (centre), at the reach of his palms
  const TINT = { tint: '#2E3B68', tintAmt: 0.26, desat: 0.2 };

  const B = {
    glow: w(145) - 0.1,          // hususi
    flick: w(146) - 0.08,        // kararsız
    pull: w(147) + 0.05,         // dünyasını: camera eases back
    grow0: w(148) - 0.08,        // aynı
    umumi: w(149) - 0.08,        // umumî: the big world glows
    grow1: w(150) + 0.25,        // dünya
    dash: w(150) - 0.05,         // the true outline draws in
    drop: w(152) - 0.42,         // sabit: he brings it down (a firm, controlled descent)
    imp: w(152) + 0.1,           // impact
    proud: w(153) - 0.02,        // bilip
  };

  const CAM = [
    [0, [392, 926, 1.22]],
    [B.pull - 0.05, [398, 922, 1.26], 'inOutSine'],
    [B.grow0 + 0.1, [540, 945, 1.0], 'inOutCubic'],
    [B.drop, [536, 942, 1.02], 'inOutSine'],
    [5.2, [520, 950, 1.06], 'inOutSine'],
  ];
  const C5 = E.tween(5.0, CAM);                 // camera at the cut (the sky frame is identity there)
  function camAt(lt) {
    const c = E.tween(lt, CAM).slice();
    // heavy thud: short decaying shake
    const u = lt - B.imp;
    if (u > 0 && u < 0.5) {
      const k = Math.exp(-u * 9);
      c[0] += Math.sin(u * 61) * 5 * k;
      c[1] += Math.sin(u * 47 + 1) * 9 * k;
    }
    c[0] += E.drift(lt, 5, 0.25) * 3;
    c[1] += E.drift(lt, 9, 0.25) * 3;
    return c;
  }
  function cam(L, c, d) {
    E.camera(L, { x: 540 + (c[0] - 540) * d, y: 960 + (c[1] - 960) * d, zoom: 1 + (c[2] - 1) * d });
  }
  // sky layer (parallax 0.4), expressed in s18's screen frame: identity at lt = 5
  const SKY_D = 0.4;
  const skyCam = (c) => ({
    x: 540 + (c[0] - C5[0]) * SKY_D, y: 960 + (c[1] - C5[1]) * SKY_D,
    zoom: (1 + (c[2] - 1) * SKY_D) / (1 + (C5[2] - 1) * SKY_D),
  });
  const skyToScreen = (sc, x, y) => [540 + (x - sc.x) * sc.zoom, 960 + (y - sc.y) * sc.zoom, sc.zoom];

  // ---- the personal world over time ----
  function pw(lt) {
    const g = E.ep(lt, B.grow0, B.grow1, 'inOutCubic');
    const gs = E.spring(lt, B.grow0, 7, 0.62);                 // soft organic overshoot on the swell
    const drop = E.ep(lt, B.drop, B.imp, (x) => 0.8 * E.ease.inOutSine(x) + 0.2 * x * x); // lands with a firm thud
    const r = E.lerp(R0, R1, E.clamp(gs, 0, 1.06));
    // it swells up and to the right, drifting a little away from him (so it never crowds his face)
    let x = ANCH[0] + DIR[0] * r + 46 * E.clamp((r - R0) / (R1 - R0), 0, 1.1), y = ANCH[1] + DIR[1] * r;
    // brought straight down first, then in to where he can press it (his arms stay extended all the way)
    x = E.lerp(x, C2[0], E.smooth(E.seg(drop, 0.4, 1))); y = E.lerp(y, C2[1], drop);
    // bob while floating (stops once planted)
    if (lt < B.imp) { const f = 1 - drop; y += Math.sin(lt * 2.2) * 4 * f; x += Math.sin(lt * 1.4 + 1) * 2 * f; }
    // a small lift before it is brought down (anticipation)
    y -= 16 * E.ep(lt, B.drop - 0.32, B.drop, 'inOutSine') * (1 - drop);
    // squash on impact (the bottom stays on the ground)
    const u = lt - B.imp;
    let sx = 1, sy = 1;
    if (u > 0) { const k = Math.exp(-u * 8) * Math.cos(u * 26); sy = 1 - 0.06 * k; sx = 1 + 0.04 * k; }
    // flicker: rises on "kararsız", calms as it swells (looks solid), gone once planted
    const fl = E.ep(lt, B.flick, B.flick + 0.3, 'outCubic') * (1 - E.ep(lt, B.grow0, B.grow1)) * (lt < B.imp ? 1 : 0);
    const solid = E.ep(lt, B.grow0 + 0.2, B.grow1 + 0.2, 'inOutSine');
    return { x, y, r, g, sx, sy, fl, solid, planted: lt >= B.imp };
  }

  // ---- the man ----
  // shoulder position of a side-view pose (ground point at the origin) — mirrors E.man's skeleton & grounding
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
  // two-bone IK: shoulder angle + elbow bend so the wrist reaches T (elbow hangs below the line)
  function armIK(S, T, h) {
    const L1 = MR.upper * h, L2 = MR.fore * h;
    const dx = T[0] - S[0], dy = T[1] - S[1];
    const d = E.clamp(Math.hypot(dx, dy), 1, (L1 + L2) * 0.999);
    const bend = Math.acos(E.clamp((d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2), -1, 1));
    const phi = Math.atan2(dx, dy);
    const al = Math.atan2(L2 * Math.sin(bend), L1 + L2 * Math.cos(bend));
    return { s: phi - al, e: bend, a2: phi - al + bend };
  }

  // Planted feet: one stance for the whole shot. Both ankles stay at fixed points (units of h, skeleton frame,
  // y down; the stance of nH 0.05 / fH −0.06 with soft knees), the legs are solved by two-bone IK from the hip,
  // so leaning, bending the knees (hipDrop) or shifting the hips back (hipX) never moves a foot.
  const ANK_Y = -0.0412;
  const ANK = (() => {
    const at = (H, K) => Math.sin(H) * MR.thigh + Math.sin(H - K) * MR.shin;
    return { n: at(0.05, 0.03), f: at(-0.06, 0.03) };
  })();
  function legIK(ax, hx, hy) {
    const T = MR.thigh, S = MR.shin, dx = ax - hx, dy = ANK_Y - hy;
    const D = E.clamp(Math.hypot(dx, dy), Math.abs(T - S) + 1e-4, (T + S) * 0.99995);
    const al = Math.acos(E.clamp((T * T + D * D - S * S) / (2 * T * D), -1, 1));
    const kn = Math.acos(E.clamp((T * T + S * S - D * D) / (2 * T * S), -1, 1));
    return { H: Math.atan2(dx, dy) + al, K: Math.PI - kn };
  }
  function plantLegs(p, drop, hx) {
    p.hipDrop = drop; p.hipX = hx; p.nF = 0; p.fF = 0;
    const hy = -MR.hipY + drop, n = legIK(ANK.n, hx, hy), f = legIK(ANK.f, hx, hy);
    p.nH = n.H; p.nK = n.K; p.fH = f.H; p.fK = f.K;
    return p;
  }
  /** the point where a palm rests on the globe (its left flank … upper-left shoulder): as near the crown as the
      arm reaches comfortably (|shoulder → palm| ≤ frac of the arm's length) and never much higher than his
      shoulder (a hand raised higher would cross his face in profile). Continuous in time: golden section for the
      nearest point, bisection for the reach, a soft minimum of the two limits. */
  function palmOn(Sw, gx, gy, gr, off, frac, h) {
    const reach = (MR.upper + MR.fore) * h * frac, R2 = gr + off;
    const P = (th) => [gx + Math.cos(th) * R2, gy + Math.sin(th) * R2];
    const dist = (th) => { const q = P(th); return Math.hypot(q[0] - Sw[0], q[1] - Sw[1]); };
    const thTop = -1.75, thLow = -3.6;
    // height limit: the palm never higher than half a comfortable arm's length above the shoulder (≈30° at full
    // reach). Along this arc the height falls monotonically toward the crown, so the limit is a single angle.
    const thCap = -Math.PI - Math.asin(E.clamp((Sw[1] - 0.5 * reach - gy) / R2, -1, 1));
    // nearest point of the arc (golden-section search; the distance has one minimum on this arc)
    let a = thLow, b = thTop;
    for (let i = 0; i < 40; i++) {
      const m1 = b - (b - a) * 0.618, m2 = a + (b - a) * 0.618;
      if (dist(m1) < dist(m2)) b = m2; else a = m1;
    }
    const thN = (a + b) / 2;
    let th = thN;
    if (dist(thN) < reach) {
      // within reach: slide up toward the crown until the arm is at its comfortable length
      if (dist(thTop) <= reach) th = thTop;
      else {
        let lo = thN, hi = thTop;
        for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (dist(m) <= reach) lo = m; else hi = m; }
        th = (lo + hi) / 2;
      }
    }
    // soft minimum of the two limits (a hard switch from one to the other straightened the elbow in two frames)
    const k = 0.22, hh = E.clamp(0.5 + (0.5 * (thCap - th)) / k, 0, 1);
    th = E.clamp(E.lerp(thCap, th, hh) - k * hh * (1 - hh), thLow, thTop);
    return { p: P(th), th };
  }

  function manPose(lt, s) {
    const M = E.man.pose;
    const hold = M.hold(1);
    hold.head = 0.2; // looking down at the little world in his hands
    // trembling hands while the world flickers
    const tr = E.ep(lt, B.flick, B.flick + 0.3) * (1 - E.ep(lt, B.grow0, B.grow0 + 0.4));
    hold.nS += Math.sin(lt * 31) * 0.018 * tr; hold.fS += Math.sin(lt * 27 + 1) * 0.018 * tr;
    hold.nE += Math.sin(lt * 23 + 2) * 0.02 * tr;
    // body: awe as it swells (head lifts, leans back a touch); "sabit": he leans in and takes it down (knees give,
    // hips back, a little follow-through after the thud); "bilip": he straightens up, proud
    const wA = E.ep(lt, B.grow0, B.grow1 - 0.1, 'inOutCubic');
    const wB = E.ep(lt, B.drop - 0.4, B.drop, 'inOutSine');
    const dk = E.ep(lt, B.drop, B.imp, 'inOutSine');
    const wP = E.ep(lt, B.proud - 0.05, B.proud + 0.55, 'inOutCubic');
    const thud = lt > B.imp && lt < B.imp + 0.6 ? Math.sin(Math.PI * (lt - B.imp) / 0.6) : 0;
    const breath = Math.sin(lt * 2.1) * 0.006;
    const lean = E.lerp(E.lerp(-0.02, -0.04, wA), E.lerp(0.06, 0.36, dk) + 0.025 * thud, wB) + breath;
    const head = E.lerp(E.lerp(0.2, -0.14, wA), E.lerp(0.12, 0.3, dk) + 0.04 * thud, wB);
    const drop = 0.01 * dk * (1 - wP), hx = -0.012 * dk * (1 - wP);
    // arms: from the moment it starts to swell his palms stay on the glass — on its flank at chest height while it
    // floats, riding over its upper-left shoulder as he brings it down (IK every frame, through the squash too)
    const body = plantLegs({ lean, head }, drop, hx);
    const S = shoulderOf(body, MAN.h);
    const Sw = [MAN.x + S[0], GY + S[1]];
    const syH = 1 - (1 - s.sy) * 0.3, rr = s.r * syH, gcy = s.y + s.r * (1 - syH); // the palms ride a third of the bounce
    const nP = palmOn(Sw, s.x, gcy, rr, 0.016 * MAN.h, 0.9, MAN.h), fP = palmOn(Sw, s.x, gcy, rr, 0.016 * MAN.h, 0.86, MAN.h);
    const nA = armIK(Sw, nP.p, MAN.h), fA = armIK(Sw, fP.p, MAN.h);
    // palms flat on the glass: the hand lies along the globe's tangent (soft wrist limit)
    const tang = (th) => Math.atan2(-Math.sin(th), Math.cos(th));
    const wrap = (x) => Math.atan2(Math.sin(x), Math.cos(x));
    const wr = (x) => 0.95 * Math.tanh((0.85 * wrap(x)) / 0.95);
    const ik = { nS: nA.s, nE: nA.e, fS: fA.s, fE: fA.e, nW: wr(tang(nP.th) - nA.a2), fW: wr(tang(fP.th) - fA.a2) };
    const wC = E.ep(lt, B.grow0, B.grow0 + 0.6, 'inOutSine');
    let p = Object.assign({}, hold, { lean, head });
    p = E.man.lerp(p, Object.assign({}, p, ik), wC);
    // proud: chin up, chest out (leads into s18's monument)
    const proud = M.proud(0.85);
    proud.lean += breath;
    p = E.man.lerp(p, proud, wP);
    return plantLegs(p, drop, hx);
  }

  function sky(L, c, lt) {
    // the big world first, on bare paper; the night sky is glazed over it (multiply), lighter around the world
    // so it reads as moonlit with a soft halo — the same treatment, frame and timing as s18 (seamless cut)
    const sc = skyCam(c);
    E.camera(L, sc);
    const u = lt - 5;                             // s18's local time
    const by = BW.y + E.drift(u, 2, 0.3) * 3;
    PR.bigWorld(L, BW.x, by, BW.r, { t: lt + 3, decor: 1, gateGlow: 0.8, rotSpeed: 0.025, rot: 0.08, aura: 0.9 });
    const [sx, sy, z] = skyToScreen(sc, BW.x, by);
    const R = BW.r * z;
    const p = L.paint;
    p.save();
    p.setTransform(1, 0, 0, 1, 0, 0);
    p.globalCompositeOperation = 'multiply';
    const gr = p.createRadialGradient(sx, sy - R * 0.2, 0, sx, sy - R * 0.2, R * 6);
    gr.addColorStop(0, '#C2CAE6'); gr.addColorStop(1.05 / 6, '#B4BEDF'); gr.addColorStop(1.5 / 6, '#8692C2');
    gr.addColorStop(2.4 / 6, '#525F94'); gr.addColorStop(1, '#2C3866');
    p.fillStyle = gr; p.fillRect(0, 0, E.W, E.H);
    const gt = p.createLinearGradient(0, 0, 0, 240);
    gt.addColorStop(0, '#6070A0'); gt.addColorStop(1, '#FFFFFF');
    p.fillStyle = gt; p.fillRect(0, 0, E.W, 240);
    p.restore();
    // wet-in-wet variation of the night wash (as in s18)
    bloom(p, 120, 260, 240, '#2A3460', { seed: 3, alpha: 0.35, soft: 60 });
    bloom(p, 90, 900, 300, '#3E3A66', { seed: 7, alpha: 0.25, soft: 70, irr: 0.3 });
    bloom(p, 980, 820, 240, '#2A3460', { seed: 4, alpha: 0.3, soft: 60 });
    lift(p, E.blob(540, 1040, 420, { seed: 5, irr: 0.3, rx: 700, ry: 150 }), 0.12, 70);
    E.glow(L.light, BW.x - BW.r * 0.55, by - BW.r * 0.55, BW.r * 0.9, '#C9D6FF', 0.12);
    // stars (lifted paper dots + twinkle), kept off the world — s18's star field
    const r = E.rng(1818);
    for (let i = 0; i < 56; i++) {
      const x = r() * 1080, y = r() * 980, s = 0.9 + r() * 1.9, ph = r() * 10, sp = 1.5 + r() * 2;
      if (Math.hypot(x - BW.x, y - BW.y) < BW.r * 1.7) continue;
      const tw = 0.55 + 0.45 * Math.sin(u * sp + ph);
      lift(p, E.blob(x, y, s, { seed: i, irr: 0.1, n: 10 }), 0.62);
      if (s > 2.0) E.glow(L.light, x, y, s * 5, '#DCE5FF', 0.3 * tw);
    }
    // a thin night cloud drifting low (continues into s18)
    PR.cloud(L, 140 + u * 8, 760, 260, { tone: 'night', seed: 9, t: u, alpha: 0.35 });
    // "umumî": the general world glows up for a moment (the measure he copies)
    const pu = E.ep(lt, B.umumi, B.umumi + 0.25, 'outCubic') * (1 - E.ep(lt, B.umumi + 0.35, B.umumi + 1.3, 'inOutSine'));
    if (pu > 0) {
      E.glow(L.light, BW.x, by, BW.r * 2.1, '#FFE6B8', 0.22 * pu);
      E.glow(L.light, BW.x, by, BW.r * 1.25, '#FFF1D6', 0.12 * pu);
    }
  }

  function dashedCircle(L, x, y, r, p, a) {
    if (p <= 0 || a <= 0) return;
    const a0 = -Math.PI / 2;
    for (const [layer, col, lw, al] of [[L.paint, '#F4F2EC', 3.4, 0.85], [L.light, '#D7E2FF', 6, 0.25]]) {
      layer.save();
      layer.translate(x, y);
      layer.globalCompositeOperation = layer === L.paint ? 'source-over' : 'lighter';
      layer.globalAlpha *= a * al;
      layer.strokeStyle = col; layer.lineWidth = lw; layer.lineCap = 'round';
      layer.setLineDash([15, 12]);
      layer.beginPath(); layer.arc(0, 0, r, a0, a0 + E.TAU * p); layer.stroke();
      layer.restore();
    }
  }

  // kararsız: broken, jittering ghost outlines around the bubble (they change ≈ 11 times a second)
  function unstableRims(L, r, lt, fl) {
    const step = Math.floor(lt * 11);
    for (let g = 0; g < 3; g++) {
      const rr = E.rng(step * 7 + g * 131 + 5);
      const ox = (rr() - 0.5) * 12 * fl, oy = (rr() - 0.5) * 10 * fl, k = 1 + (rr() - 0.4) * 0.07 * fl;
      const n = 2 + Math.floor(rr() * 3);
      for (let j = 0; j < n; j++) {
        const a0 = rr() * E.TAU, len = 0.4 + rr() * 1.1;
        for (const [layer, col, lw, al] of [[L.paint, '#EEF1FA', 2.2, 0.55], [L.light, '#BFD0FF', 5, 0.22]]) {
          layer.save();
          layer.globalCompositeOperation = layer === L.paint ? 'source-over' : 'lighter';
          layer.globalAlpha *= fl * al * (0.5 + 0.5 * rr());
          layer.strokeStyle = col; layer.lineWidth = lw; layer.lineCap = 'round';
          layer.beginPath(); layer.arc(ox, oy, r * k, a0, a0 + len); layer.stroke();
          layer.restore();
        }
      }
    }
  }

  function impactFx(L, lt, x, gy, r) {
    const u = lt - B.imp;
    if (u < 0) return;
    // ground cracks (pencil), growing fast then staying
    const k = E.ep(u, 0, 0.18, 'outCubic');
    const rr = E.rng(1717);
    for (let i = 0; i < 7; i++) {
      const side = i % 2 ? 1 : -1;
      const x0 = x + side * (r * (0.1 + 0.25 * rr()));
      const len = (50 + 80 * rr()) * k;
      const ang = 0.08 + 0.22 * rr();
      const pts = [[x0, gy + 3]];
      for (let j = 1; j <= 4; j++) pts.push([x0 + side * Math.cos(ang) * len * (j / 4) + (rr() - 0.5) * 8, gy + 3 + Math.sin(ang) * len * (j / 4) + 5 * (j / 4)]);
      E.pencil(L.ink, pts, { a: 0.42, w: 1.6, seed: i + 3 });
    }
    // dust puffs rolling out along the ground, soft and cool
    const d = E.ep(u, 0, 0.9, 'outCubic'), fade = 1 - E.ep(u, 0.25, 1.3);
    for (let i = 0; i < 6; i++) {
      const side = i % 2 ? 1 : -1, n = Math.floor(i / 2);
      const px = x + side * (r * 0.45 + 30 + n * 55) * (0.4 + 0.6 * d);
      const py = gy - 8 - n * 7 - 20 * d;
      const pr = (24 + n * 10) * (0.5 + 0.8 * d);
      const b = E.blob(px, py, pr, { rx: pr * 1.3, ry: pr * 0.8, seed: 40 + i, irr: 0.25 });
      lift(L.paint, b, 0.22 * fade, 16);
      wash(L.paint, b, '#8E98BE', { alpha: 0.18 * fade, soft: 16 });
    }
    // a few drops of wet pigment thrown out low along the ground
    if (u < 0.6) {
      const sa = 0.45 * (1 - E.seg(u, 0.25, 0.6));
      E.splatter(L.paint, x - r * 0.7 - 30 * d, gy - 4, 30 + 30 * d, '#2E3756', { seed: 9, n: 7, size: 2.8, alpha: sa });
      E.splatter(L.paint, x + r * 0.7 + 30 * d, gy - 4, 30 + 30 * d, '#2E3756', { seed: 10, n: 7, size: 2.8, alpha: sa });
    }
  }

  E.scene('s17', {
    wc: [1.05, 1.15, 3, 0.6],
    draw(L, lt) {
      const c = camAt(lt);
      sky(L, c, lt);

      // ---------- ground ----------
      cam(L, c, 1);
      PR.ground(L, 1000, { palette: 'night', seed: 4, t: lt, trees: 0, flowers: 0 });
      wash(L.paint, E.rrect(-120, 940, E.W + 240, 260, 0), '#6E7BAA', { alpha: 0.45, grad: { from: [0, 940], to: [0, 1200], c2: '#FFFFFF' } });
      // two cypresses on the far meadow behind him (echo of the han's cypresses) and a lone round tree
      PR.tree(L, 70, 1046, 190, { kind: 'cypress', t: lt, night: 1, seed: 3, shadow: 0.4 });
      PR.tree(L, 118, 1052, 150, { kind: 'cypress', t: lt + 1, night: 1, seed: 5, shadow: 0.4 });
      PR.tree(L, 884, 1040, 120, { kind: 'round', t: lt, night: 1, seed: 2, shadow: 0.4 });
      wash(L.paint, E.rrect(-120, 980, E.W + 240, 120, 0), '#3A4672', { alpha: 0.18 });
      // a pale moonlit patch where the man stands
      lift(L.paint, E.blob(470, GY + 10, 380, { rx: 470, ry: 92, seed: 14, irr: 0.12 }), 0.16, 60);

      const s = pw(lt);
      lift(L.paint, E.blob(s.x - 60, s.y + 40, 320, { rx: 380, ry: 330, seed: 15, irr: 0.2 }), 0.07 + 0.06 * s.solid, 120);
      manShadow(L, MAN.x, GY, MAN.h, 0.45);

      // ---------- his world ----------
      // contact shadow on the ground (grows as it comes down)
      const near = 1 - E.clamp((GY - (s.y + s.r)) / 260);
      wash(L.paint, E.blob(s.x + 10, GY + 4, s.r, { rx: s.r * 1.05, ry: s.r * 0.13, seed: 3, irr: 0.06 }), '#1C2440', { alpha: 0.12 + 0.42 * near, soft: 14 });
      // trembling (kararsız)
      const jx = (E.noise1(lt * 17, 3) * 3 + Math.sin(lt * 41) * 1.2) * s.fl;
      const jy = (E.noise1(lt * 15, 4) * 3) * s.fl;
      const x = s.x + jx, y = s.y + jy;
      // "hususi": his own world lights up softly in his hands (with a gentle pulse)
      const gk = E.ep(lt, B.glow, B.glow + 0.5, 'outCubic');
      const hgl = 0.14 + 0.42 * gk + 0.1 * Math.sin((lt - B.glow) * 2.6) * gk;
      // the frozen moment after the thud: time stops inside
      const pt = s.planted ? B.imp : lt;
      E.save(L);
      E.translate(L, x, y + s.r * (1 - s.sy)); // squash keeps the bottom on the ground
      E.scale(L, s.sx, s.sy);
      E.glow(L.light, 0, 0, s.r * 1.9, '#FFD99A', 0.1 * gk * (1 - 0.5 * s.solid));
      // solid body behind the glass while the illusion holds
      if (s.solid > 0) {
        const disc = new Path2D(); disc.arc(0, 0, s.r * 0.995, 0, E.TAU);
        wash(L.paint, disc, '#5E6DA0', { mode: 'over', alpha: s.solid });
        E.glow(L.light, 0, 0, s.r * 1.6, '#FFE3A8', 0.16 * s.solid);
      }
      PR.personalWorld(L, 0, 0, s.r, {
        t: pt, kind: 'home', night: 0.75 - 0.35 * s.solid, glow: hgl + 0.3 * s.solid, life: s.planted ? 0 : 1, flicker: s.fl,
      });
      if (s.fl > 0.01) unstableRims(L, s.r, lt, s.fl);
      // solid volume: a terminator glaze on the lower right, the glassy window dulled, a moonlit rim from the
      // big world (upper right) and a firmer contour
      if (s.solid > 0) {
        const disc = new Path2D(); disc.arc(0, 0, s.r, 0, E.TAU);
        wash(L.paint, disc, '#1E2748', { alpha: 0.58 * s.solid,
          grad: { from: [-s.r * 0.35, -s.r * 0.4], r: s.r * 1.3, r0: s.r * 0.45, stops: [[0, 'rgba(30,39,72,0)'], [1, 'rgba(30,39,72,1)']] } });
        // the glass window and the lower glint are painted out; a soft matte highlight instead
        const band = (a0, a1, r0, r1) => {
          const pts = [];
          for (let i = 0; i <= 10; i++) { const a = E.lerp(a0, a1, i / 10); pts.push([Math.cos(a) * r1 * s.r, Math.sin(a) * r1 * s.r]); }
          for (let i = 10; i >= 0; i--) { const a = E.lerp(a0, a1, i / 10); pts.push([Math.cos(a) * r0 * s.r, Math.sin(a) * r0 * s.r]); }
          return E.smoothPath(pts, true);
        };
        L.paint.save(); L.paint.clip(disc);
        wash(L.paint, band(3.52, 4.6, 0.66, 0.93), '#6C7AAC', { mode: 'over', alpha: 0.8 * s.solid, soft: s.r * 0.03 });
        wash(L.paint, band(0.18, 1.02, 0.82, 0.95), '#33406A', { mode: 'over', alpha: 0.75 * s.solid, soft: s.r * 0.02 });
        lift(L.paint, E.blob(-s.r * 0.42, -s.r * 0.5, s.r * 0.2, { rx: s.r * 0.24, ry: s.r * 0.13, rot: -0.75, seed: 8, irr: 0.1 }), 0.32 * s.solid, s.r * 0.06);
        L.paint.restore();
        const rim = new Path2D(); rim.arc(0, 0, s.r * 0.97, -1.25, 0.1);
        L.light.save(); L.light.globalCompositeOperation = 'lighter'; L.light.globalAlpha *= 0.35 * s.solid;
        L.light.strokeStyle = '#C9D6FF'; L.light.lineWidth = s.r * 0.05; L.light.lineCap = 'round'; L.light.stroke(rim); L.light.restore();
        E.pencil(L.ink, disc, { a: 0.38 * s.solid, w: 2.3 });
      }
      // the truth: its real size, a dashed pencil circle inside the illusion
      const dp = E.ep(lt, B.dash, B.dash + 0.55, 'inOutSine');
      dashedCircle(L, 0, 0, R0, dp, s.g);
      E.restore(L);

      // ---------- the man (in front: his palms come down on top of the globe) ----------
      E.man.draw(L, { x: MAN.x, y: GY, h: MAN.h, view: 'side', facing: 1, pose: manPose(lt, s), ...TINT });

      impactFx(L, lt, C2[0], GY, R1);
    },
    sfx() {
      const g = (i) => E.T(i);
      return [
        { t: S0 + B.glow + 0.02, type: 'bloom', gain: 0.16 },
        { t: g(146) - 0.05, type: 'sparkle', gain: 0.16 },
        { t: g(148) - 0.1, type: 'swell', gain: 0.38, dur: 1.4 },
        { t: S0 + B.drop + 0.02, type: 'whoosh', gain: 0.13 },
        { t: S0 + B.imp, type: 'book', gain: 0.62 },
        { t: S0 + B.imp, type: 'rumble', gain: 0.3, dur: 0.9 },
      ];
    },
  });
})();
