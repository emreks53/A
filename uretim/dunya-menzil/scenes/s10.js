/* s10 · 44.65–47.65 (+1.0 s tail under the bleed into s11) · "ondan, cilve-i esmaya intikal eder."

   Cut from s09's close-up to a wider, slightly lower angle: the mirror-world with its gold nakış floats in the blue
   hour; the heart-light is still flowing through the pattern (round the central ring, into the centre).
     44.99 ondan          light descends from above (no source shown): a soft column of paper light with a few
                          broad shafts slides down onto the mirror; the illuminator's pencil layout fades
     45.51 cilve          it strikes the mirror: glints flash, a soft aureole of reflected light opens around the
                          globe, and light runs out along every scroll of the nakış (the Names shining in the mirror)
     45.93 esmaya         a soft wave reaches the border; the whole ornament glows
     46.45 intikal eder   the heart rises up the column; the camera tilts up with it (the world sinks away into a
                          luminous haze) into a field of warm golden light, where the heart dissolves into the light
                          at (540, 300) — the bleed point of s11 — just before the morning garden bleeds in.
*/
(function () {
  const E = window.E;
  const PI = Math.PI, TAU = PI * 2;
  const PR = () => E.props;
  const lerp = E.lerp, clamp = E.clamp, ep = E.ep, seg = E.seg;

  // ---------------------------------------------------------------- layout (world coordinates)
  const GX = 540, GY = 780, GR = 265;     // the mirror-world
  const NK = 1.12;                         // nakış radius / world radius (as in s09)
  const RN = GR * NK;
  const HORIZON = 1395;
  const TILT = 1200;                       // camera tilt (px) during "intikal eder"
  const SKY_D = 0.85, LAND_D = 0.7;        // parallax depths
  const FIELD = [540, 300 - TILT];         // heart's end in the focal plane (screen (540, 300) once tilted)
  const FIELD_S = [540, 300 - SKY_D * TILT]; // centre of the golden light field in the sky layer (also screen (540, 300))
  const DIAG = E.rad(-135);

  const mixc = (a, b, k) => E.mix(a, b, clamp(k));
  /** soft wet bloom as a radial-gradient glaze (cheap) */
  const rbloom = (ctx, x, y, r, col, a, sy = 1) => {
    if (!(a > 0.002)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.translate(x, y);
    ctx.scale(1, sy);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    g.addColorStop(0, E.rgba(col, a));
    g.addColorStop(0.55, E.rgba(col, a * 0.6));
    g.addColorStop(1, E.rgba(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
  };
  /** radial paper lift (bare-paper light), source-over white */
  const rlift = (ctx, x, y, r, a, stops = [[0, 1], [0.4, 0.85], [0.75, 0.35], [1, 0]]) => {
    if (!(a > 0.002)) return;
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha *= a;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    stops.forEach(([o, v]) => g.addColorStop(o, `rgba(255,255,255,${v})`));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  };
  const circlePath = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.1, r), 0, TAU); return p; };

  function times(shot) {
    const w = (i) => E.T(i) - shot.start;
    const T = { on: w(82), ci: w(83), es: w(85), in: w(86), ed: w(87) };
    T.tilt0 = T.in - 0.2; T.tilt1 = T.in + 1.1;     // camera rises with the heart
    T.rise0 = T.in - 0.08; T.rise1 = T.in + 0.86;     // the heart rises up the column
    T.dis0 = T.rise1 - 0.02; T.dis1 = T.rise1 + 0.3; // ...and dissolves into the light before the bleed (3.0)
    return T;
  }

  /** camera: slow settle, then the tilt up with the heart */
  function camAt(lt, T) {
    const k = ep(lt, T.tilt0, T.tilt1, 'inOutCubic');
    const tilt = k * TILT + 30 * ep(lt, T.tilt1 - 0.2, 4.0, 'outSine');
    const z = 1.0 + 0.03 * ep(lt, 0, 1.9, 'inOutSine') - 0.02 * ep(lt, T.tilt0, T.tilt1, 'inOutSine');
    return { x: GX + 4 * Math.sin(lt * 0.4), y: 960 - tilt, zoom: z, rot: 0.004 * Math.sin(lt * 0.33), k };
  }
  const camD = (c, d) => ({ x: lerp(540, c.x, d), y: lerp(960, c.y, d), zoom: Math.pow(c.zoom, d), rot: c.rot * d });

  /** world centre with a gentle float */
  const globeC = (lt) => [GX + 2 * E.drift(lt + 9, 3, 0.4), GY + 5 * Math.sin(lt * 1.25 + 0.6)];

  // ---------------------------------------------------------------- nakış scroll geometry (same as the prop's)
  // props-b builds each lyre scroll with this volute (seeded rng 131·seed+7); reproduced here so the light can run
  // exactly along the gold scrolls (prop units: outer radius 1000).
  const LYRES = (() => {
    const R = E.rng(1 * 131 + 7);
    const volute = (x, y, h0, len, k0, k1, pw = 3, n = 60) => {
      const pts = [[x, y]];
      const ds = len / n;
      for (let i = 1; i <= n; i++) {
        const s = (i - 0.5) * ds;
        const hd = h0 + k0 * s + (k1 * len / (pw + 1)) * Math.pow(s / len, pw + 1);
        x += Math.cos(hd) * ds; y += Math.sin(hd) * ds;
        pts.push([x, y]);
      }
      return pts;
    };
    const out = [];
    for (let k = 0; k < 4; k++) {
      const ax = (k * PI) / 2;
      for (const side of [-1, 1]) {
        const a = ax + side * 0.2;
        const L1 = 610 + R() * 16;
        out.push(volute(Math.cos(a) * 194, Math.sin(a) * 194, ax + side * 0.62, L1, -side * 0.0011, -side * 0.052, 3, 80));
      }
    }
    return out;
  })();

  // ---------------------------------------------------------------- heart
  function heartAt(lt, T) {
    const [gx, gy] = globeC(lt);
    const rr = 0.177 * RN;
    // 1) round the central ring (continuing s09's flow), spiralling into the centre
    const u = seg(lt, 0, 0.75);
    const th = DIAG + TAU * 0.78 * E.ease.outCubic(u);
    const rad = rr * (1 - ep(lt, 0.3, 0.75, 'inOutSine'));
    let pos = [gx + Math.cos(th) * rad, gy + Math.sin(th) * rad];
    let r = lerp(28, 30, ep(lt, 0.4, 1.0));
    pos[1] += -3 * ep(lt, 0.6, 1.2) * Math.sin(lt * 2.2);
    // 2) rises up the column into the light field
    const k = ep(lt, T.rise0, T.rise1, 'inOutSine');
    if (k > 0) {
      const dip = 10 * Math.sin(seg(lt, T.rise0 - 0.15, T.rise0 + 0.08) * PI);   // a tiny anticipation
      pos = [lerp(pos[0], FIELD[0], k) + 6 * Math.sin(k * PI * 2) * (1 - k), lerp(pos[1] + dip, FIELD[1], k)];
      r = lerp(30, 36, ep(lt, T.rise0, T.rise1));
    }
    pos[1] -= 10 * ep(lt, T.rise1, 4.0, 'outSine');
    const rot = 0.05 * Math.sin(lt * 1.4) + (lt < 0.75 ? 0.25 * Math.sin(u * PI) : 0);
    return { pos, r, rot };
  }

  // ---------------------------------------------------------------- sky (world space of the sky layer)
  function sky(L, lt, light, hy, fieldA) {
    const c = L.paint;
    // blue hour below, warm gold toward the light field above (continuity with s09's twilight)
    const top = FIELD_S[1] - 1000, bot = 2300;
    const st = (y) => clamp((y - top) / (bot - top));
    const g = c.createLinearGradient(0, top, 0, bot);
    g.addColorStop(0, '#FBF2DC');
    g.addColorStop(st(FIELD_S[1] - 180), '#F7E6C2');
    g.addColorStop(st(FIELD_S[1] + 220), '#EFCFA6');
    g.addColorStop(st(FIELD_S[1] + 470), '#CDB2C2');
    g.addColorStop(st(0), '#7688BE');
    g.addColorStop(st(260), '#5E70A9');
    g.addColorStop(st(700), '#8191C3');
    g.addColorStop(st(hy - 330), '#B2B0D1');
    g.addColorStop(st(hy - 100), '#E4C6C0');
    g.addColorStop(st(hy + 20), '#EFCCB4');
    g.addColorStop(1, '#D9B9AE');
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = g;
    c.fillRect(-700, top, 2500, bot - top);
    c.restore();
    // wet blooms so the gradient breathes like real paint (blue hour; then gold and apricot near the field)
    const blooms = [
      [130, 160, 420, '#4F62A0', 0.3], [970, 300, 380, '#5D63A0', 0.26], [560, -80, 520, '#5068A8', 0.22],
      [900, 860, 300, '#9F92BE', 0.18], [160, 900, 280, '#A897BF', 0.16],
      [250, FIELD_S[1] + 620, 400, '#E9BE86', 0.24], [850, FIELD_S[1] + 480, 360, '#EBB596', 0.2],
      [540, FIELD_S[1] + 900, 460, '#C9A6B6', 0.16], [760, FIELD_S[1] + 170, 300, '#F1D08E', 0.16], [300, FIELD_S[1] + 120, 280, '#F3D69C', 0.14],
    ];
    blooms.forEach(([x, y, r, col, a], i) => rbloom(c, x + 16 * E.drift(lt, 60 + i, 0.15), y + 10 * E.drift(lt, 80 + i, 0.15), r, col, a, 0.82));
    // a few hard drying edges of the sky wash (blue hour part only)
    [[210, 240, 190, 51], [880, 640, 150, 52]].forEach(([x, y, r, sd]) => {
      E.wash(c, E.blob(x, y, r, { seed: sd, irr: 0.32, ry: r * 0.6 }), '#56679F', { alpha: 0.08 });
    });
    // blue hour veil (as in s09), thinning toward the gold
    c.save();
    c.globalCompositeOperation = 'multiply';
    const vg = c.createLinearGradient(0, FIELD_S[1] + 700, 0, hy);
    vg.addColorStop(0, 'rgba(174,178,214,0)');
    vg.addColorStop(0.35, E.rgba('#AEB2D6', 0.45));
    vg.addColorStop(0.8, E.rgba('#C9C3DE', 0.3));
    vg.addColorStop(1, E.rgba('#E6D2D2', 0.08));
    c.fillStyle = vg;
    c.fillRect(-700, FIELD_S[1] + 700, 2500, hy - FIELD_S[1] - 660);
    c.restore();
    // the field of light: paper lifted back, a warm cream veil (it becomes s11's morning sky), a gold ring, flecks
    if (fieldA > 0) {
      const [fx, fy] = FIELD_S;
      rlift(c, fx, fy, 1250, fieldA, [[0, 1], [0.32, 0.95], [0.6, 0.55], [0.85, 0.15], [1, 0]]);
      rbloom(c, fx, fy, 700, '#F2DEB8', 0.55 * fieldA);
      E.wash(c, circlePath(fx, fy, 1150), '#EFC67C', { alpha: 0.3 * fieldA, grad: { from: [fx, fy], r: 1150, r0: 200, stops: [[0, 'rgba(239,198,124,0)'], [0.38, 'rgba(239,198,124,0.7)'], [0.7, 'rgba(232,168,120,0.35)'], [1, 'rgba(232,168,120,0)']] } });
      rbloom(c, fx - 330, fy + 420, 230, '#EDC27A', 0.16 * fieldA);
      rbloom(c, fx + 360, fy + 330, 200, '#EBB496', 0.14 * fieldA);
      E.splatter(c, fx, fy + 160, 620, '#CFA04C', { seed: 5, n: 26, size: 3, alpha: 0.32 * fieldA });
    }
  }

  // ---------------------------------------------------------------- light (scratch-canvas soft shapes)
  // Soft shapes are painted at 1/6 resolution into a scratch canvas; the upscale gives soft watercolour edges.
  let SCR = null;
  const Q = 6;
  function scratch(L) {
    if (!SCR) { SCR = document.createElement('canvas'); SCR.width = Math.ceil(E.W / Q); SCR.height = Math.ceil(E.H / Q); }
    const c = SCR.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.globalAlpha = 1;
    c.clearRect(0, 0, SCR.width, SCR.height);
    c.setTransform(new DOMMatrix().scale(1 / Q).multiply(L.paint.getTransform()));
    return c;
  }
  function layDown(L, layers) {
    for (const [ctx, op, al] of layers) {
      if (!(al > 0.002)) continue;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = op;
      ctx.globalAlpha *= al;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(SCR, 0, 0, E.W, E.H);
      ctx.restore();
    }
  }
  /** light from above (no source shown): a broad soft column + a few shafts, converging on a point far above the
      frame, fading out before the land. Revealed top-down (front = y of the descending edge, sky-layer coords). */
  const SHAFTS = [[-0.17, 0.016, 0.45], [-0.085, 0.022, 0.7], [0, 0.07, 1], [0.075, 0.02, 0.65], [0.16, 0.014, 0.4]];
  function shafts(L, lt, front, a, flare, endY) {
    if (a <= 0.002) return;
    const c = scratch(L);
    const sx = FIELD_S[0], sy = FIELD_S[1] - 250;
    const len = endY - sy + 200;
    SHAFTS.forEach(([ang, w, s], i) => {
      const a0 = ang + 0.012 * Math.sin(lt * 0.45 + i * 1.7);
      const al = s * (0.85 + 0.15 * Math.sin(lt * 1.1 + i * 2.3));
      const p = new Path2D();
      const at = (da, l) => [sx + Math.sin(a0 + da) * l, sy + Math.cos(a0 + da) * l];
      const q0 = at(-w * 0.6, 60), q1 = at(-w, len), q2 = at(w, len), q3 = at(w * 0.6, 60);
      p.moveTo(q0[0], q0[1]); p.lineTo(q1[0], q1[1]); p.lineTo(q2[0], q2[1]); p.lineTo(q3[0], q3[1]); p.closePath();
      const g = c.createLinearGradient(0, sy, 0, endY);
      g.addColorStop(0, `rgba(255,250,236,${al})`);
      g.addColorStop(0.7, `rgba(255,248,232,${al * 0.75})`);
      g.addColorStop(1, 'rgba(255,248,232,0)');
      c.fillStyle = g;
      c.fill(p);
    });
    // descending front: soft fade below it
    c.globalCompositeOperation = 'destination-out';
    const mk = c.createLinearGradient(0, front - 260, 0, front + 60);
    mk.addColorStop(0, 'rgba(0,0,0,0)');
    mk.addColorStop(1, 'rgba(0,0,0,1)');
    c.fillStyle = mk;
    c.fillRect(-2000, front - 260, 5000, 9000);
    layDown(L, [[L.paint, 'source-over', 0.5 * a], [L.light, 'lighter', (0.16 + 0.12 * flare) * a]]);
  }
  /** reflected light: a soft aureole around the mirror and broad beams fanning out from its rim */
  function reflected(L, lt, gx, gy, a) {
    if (a <= 0.002) return;
    const c = scratch(L);
    const beams = [[-1.1, 0.08, 0.6], [-0.62, 0.065, 1], [-0.24, 0.05, 0.6], [0.24, 0.05, 0.6], [0.62, 0.065, 1], [1.1, 0.08, 0.6]];
    beams.forEach(([ang, w, s], i) => {
      const a0 = -PI / 2 + ang + 0.02 * Math.sin(lt * 0.7 + i);
      const r0 = GR * 0.9, r1 = GR * (2.1 + 0.35 * (i % 2));
      const p = new Path2D();
      p.moveTo(gx + Math.cos(a0 - w) * r0, gy + Math.sin(a0 - w) * r0);
      p.lineTo(gx + Math.cos(a0 - w * 1.5) * r1, gy + Math.sin(a0 - w * 1.5) * r1);
      p.lineTo(gx + Math.cos(a0 + w * 1.5) * r1, gy + Math.sin(a0 + w * 1.5) * r1);
      p.lineTo(gx + Math.cos(a0 + w) * r0, gy + Math.sin(a0 + w) * r0);
      p.closePath();
      const g = c.createRadialGradient(gx, gy, r0, gx, gy, r1);
      g.addColorStop(0, `rgba(255,244,220,${0.7 * s})`);
      g.addColorStop(1, 'rgba(255,244,220,0)');
      c.fillStyle = g;
      c.fill(p);
    });
    const ag = c.createRadialGradient(gx, gy, GR * 0.95, gx, gy, GR * 1.6);
    ag.addColorStop(0, 'rgba(255,246,226,0.8)');
    ag.addColorStop(1, 'rgba(255,246,226,0)');
    c.fillStyle = ag;
    c.fillRect(gx - GR * 1.7, gy - GR * 1.7, GR * 3.4, GR * 3.4);
    layDown(L, [[L.paint, 'source-over', 0.3 * a], [L.light, 'lighter', 0.15 * a]]);
  }

  // ---------------------------------------------------------------- the mirror (same as s09's)
  function mirrorBody(L, x, y, R, ghost) {
    const p = L.paint;
    const disc = circlePath(x, y, R * 0.99);
    L.ink.save();
    L.ink.globalCompositeOperation = 'destination-out';
    L.ink.globalAlpha = 0.8 * (1 - ghost);
    L.ink.clip(circlePath(x, y, R * 0.93));
    L.ink.fillRect(x - R, y - R, 2 * R, 2 * R);
    L.ink.restore();
    p.save();
    p.clip(disc);
    const a0 = p.globalAlpha;
    const g1 = p.createLinearGradient(x - R * 0.7, y - R * 0.7, x + R * 0.7, y + R * 0.7);
    g1.addColorStop(0, '#F4F5F8'); g1.addColorStop(0.5, '#DCE0E9'); g1.addColorStop(1, '#BFC6D5');
    p.globalCompositeOperation = 'source-over';
    p.globalAlpha = a0 * (1 - ghost);
    p.fillStyle = g1;
    p.fill(disc);
    p.globalCompositeOperation = 'multiply';
    const hy = y + 0.2 * R, bow = 0.24 * R;
    const ge = p.createLinearGradient(0, y - R, 0, y + R);
    ge.addColorStop(0, '#7085BC'); ge.addColorStop(0.34, '#A0ABD2'); ge.addColorStop(0.57, '#D9D0E0');
    ge.addColorStop(0.66, '#C8C1D7'); ge.addColorStop(0.82, '#959BBA'); ge.addColorStop(1, '#717BA1');
    p.globalAlpha = a0 * 0.6;
    p.fillStyle = ge;
    p.fill(disc);
    {
      const top = [], bot = [];
      for (let i = 0; i <= 20; i++) {
        const u = -1.05 + 2.1 * i / 20, th = 0.032 * R * Math.max(0, 1 - (u * u) / 1.1);
        const yy = hy + bow * u * u;
        top.push([x + u * R, yy - th]); bot.push([x + u * R, yy + th * 0.8]);
      }
      const band = E.smoothPath(top.concat(bot.reverse()), true, 0.4);
      p.globalCompositeOperation = 'source-over';
      p.globalAlpha = a0 * 0.55;
      E.softFill(p, band, '#FBF2E8', 0.018 * R);
      p.globalCompositeOperation = 'multiply';
      p.globalAlpha = a0 * 0.28;
      E.softFill(p, band, '#EDC3A8', 0.03 * R);
    }
    const rg = p.createRadialGradient(x - 0.1 * R, y - 0.12 * R, R * 0.62, x, y, R);
    rg.addColorStop(0, 'rgba(84,96,140,0)');
    rg.addColorStop(1, 'rgba(84,96,140,0.5)');
    p.globalAlpha = a0;
    p.fillStyle = rg;
    p.fill(disc);
    p.globalCompositeOperation = 'source-over';
    p.save();
    p.translate(x - 0.44 * R, y - 0.5 * R);
    p.rotate(-0.66);
    p.scale(1, 0.4);
    const wg = p.createRadialGradient(0, 0, 0, 0, 0, 0.36 * R);
    wg.addColorStop(0, 'rgba(255,255,255,0.92)'); wg.addColorStop(0.62, 'rgba(255,255,255,0.75)'); wg.addColorStop(1, 'rgba(255,255,255,0)');
    p.fillStyle = wg;
    p.fillRect(-0.4 * R, -0.4 * R, 0.8 * R, 0.8 * R);
    p.restore();
    const c45 = Math.SQRT1_2;
    const gleam = (d, w, a) => {
      const q = new Path2D();
      const cx = x + d * c45 * R, cy = y + d * c45 * R;
      q.moveTo(cx + c45 * 1.2 * R - c45 * w, cy - c45 * 1.2 * R - c45 * w);
      q.lineTo(cx - c45 * 1.2 * R - c45 * w, cy + c45 * 1.2 * R - c45 * w);
      q.lineTo(cx - c45 * 1.2 * R + c45 * w, cy + c45 * 1.2 * R + c45 * w);
      q.lineTo(cx + c45 * 1.2 * R + c45 * w, cy - c45 * 1.2 * R + c45 * w);
      q.closePath();
      p.globalAlpha = a0 * a;
      p.fill(q);
    };
    p.fillStyle = '#FFFFFF';
    gleam(-0.6, 0.05 * R, 0.3);
    gleam(-0.46, 0.012 * R, 0.42);
    const rl = p.createRadialGradient(x - 0.25 * R, y - 0.25 * R, R * 1.05, x - 0.25 * R, y - 0.25 * R, R * 1.25);
    rl.addColorStop(0, 'rgba(255,255,255,0)'); rl.addColorStop(0.5, 'rgba(255,250,242,0.5)'); rl.addColorStop(1, 'rgba(255,255,255,0)');
    p.globalAlpha = a0 * 0.6;
    p.fillStyle = rl;
    p.fill(disc);
    p.restore();
  }
  /** s09's pencil layout (axes, diagonals, compass circles), fading as the light comes */
  function construction(L, cx, cy, a) {
    if (a <= 0.003) return;
    const ink = L.ink;
    ink.save();
    ink.beginPath(); ink.arc(cx, cy, GR * 0.985, 0, TAU); ink.clip();
    for (let i = 0; i < 4; i++) {
      const ang = (i * PI) / 4, L1 = RN * 1.05;
      E.pencil(ink, [[cx - Math.cos(ang) * L1, cy - Math.sin(ang) * L1], [cx + Math.cos(ang) * L1, cy + Math.sin(ang) * L1]], { a, w: 1.1, seed: 40 + i, jitter: 0.8 });
    }
    [0.177, 0.36, 0.43, 0.88].forEach((k, i) => {
      const pth = new Path2D();
      pth.arc(cx, cy, RN * k, 0, TAU);
      E.pencil(ink, pth, { a: a * 0.9, w: 1.0, seed: 50 + i, jitter: 0.7 });
    });
    ink.restore();
  }

  /** a 4-point glint (light layer) */
  function glint(ctx, x, y, s, a, rotA = 0) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.rotate(rotA);
    for (const [w, h] of [[s, s * 0.07], [s * 0.07, s], [s * 0.55, s * 0.045]]) {
      const m = Math.max(w, h);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, m);
      g.addColorStop(0, E.rgba('#FFFBEF', a));
      g.addColorStop(1, E.rgba('#FFE7B0', 0));
      ctx.save();
      ctx.scale(w / m, h / m);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, m, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    E.glow(ctx, x, y, s * 0.6, '#FFE9B8', a * 0.5);
  }

  /** luminous polyline (light layer), brighter toward the head; drawn in a few batched chunks */
  function thread(ctx, pts, a, { w = 1, col = ['#FFBE6E', '#FFDA9C', '#FFF2D6'], tailPow = 1.4 } = {}) {
    const n = pts.length;
    if (n < 2 || a <= 0) return;
    const CH = Math.min(6, n - 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let c = 0; c < CH; c++) {
      const i0 = Math.floor((c * (n - 1)) / CH), i1 = Math.floor(((c + 1) * (n - 1)) / CH);
      if (i1 <= i0) continue;
      const f = Math.pow((c + 1) / CH, tailPow);
      const p = new Path2D();
      p.moveTo(pts[i0][0], pts[i0][1]);
      for (let i = i0 + 1; i <= i1; i++) p.lineTo(pts[i][0], pts[i][1]);
      ctx.strokeStyle = E.rgba(col[0], a * (0.05 + 0.14 * f)); ctx.lineWidth = 10 * w; ctx.stroke(p);
      ctx.strokeStyle = E.rgba(col[1], a * (0.14 + 0.3 * f)); ctx.lineWidth = 3.4 * w; ctx.stroke(p);
      ctx.strokeStyle = E.rgba(col[2], a * (0.18 + 0.42 * f)); ctx.lineWidth = 1.4 * w; ctx.stroke(p);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- the shot
  E.scene('s10', {
    draw(L, lt, t, shot) {
      const T = times(shot);
      const cam = camAt(lt, T);
      const light = ep(lt, T.on - 0.15, T.on + 1.0, 'inOutSine');
      const fieldA = ep(lt, T.on - 0.1, T.in + 0.6, 'inOutSine');
      const front = lerp(-480, GY + GR + 60, ep(lt, T.on - 0.3, T.ci + 0.05, 'inOutSine'));
      const flare = ep(lt, T.ci - 0.05, T.ci + 0.25, 'outCubic') * (1 - 0.45 * ep(lt, T.ci + 0.4, T.in + 0.4, 'inOutSine'));
      const lit = ep(lt, T.ci - 0.05, T.es + 0.5, 'inOutSine');      // how much of the ornament carries the light
      const k = cam.k;                                                 // tilt progress

      // horizon on screen (land layer)
      const lc = camD(cam, LAND_D);
      const hyS = (HORIZON - lc.y) * lc.zoom + 960;                     // screen
      const sc = camD(cam, SKY_D);
      const hy = (hyS - 960) / sc.zoom + sc.y;                          // in sky-layer coords

      // ---- sky + light field + shafts (far)
      E.camera(L, sc);
      sky(L, lt, light, hy, fieldA);
      E.props.cloud(L, 965 + lt * 6, 330, 300, { seed: 5, t: lt + 9, tone: 'dusk', alpha: 0.8 });
      E.props.cloud(L, 110 + lt * 5, FIELD_S[1] + 820, 340, { seed: 9, t: lt, tone: 'dusk', alpha: 0.6 * fieldA });
      shafts(L, lt, front, ep(lt, T.on - 0.15, T.on + 0.35, 'outSine') * (1 - 0.5 * ep(lt, T.rise1, T.dis1)), flare, GY + GR + 380);
      if (fieldA > 0) {
        const [fx, fy] = FIELD_S;
        const fadeEnd = 1 - 0.85 * ep(lt, T.dis0, T.dis1 + 0.2);       // matches s11's sky at the bleed point
        E.glow(L.light, fx, fy, 900, '#FFE7B8', 0.28 * fieldA * fadeEnd);
        E.motes(L.light, { x: fx - 520, y: fy - 300, w: 1040, h: 1500, n: 36, t: lt, seed: 31, color: '#FFF1CF', size: 3, a: 0.7 * fieldA, rise: 26 });
      }

      // ---- distant evening land
      E.camera(L, lc);
      E.props.ground(L, HORIZON, { palette: 'spring', t: lt, seed: 5, flowers: 0.3, trees: 0.3, x0: -500, x1: 1600, bottom: 2400 });
      {
        const p = L.paint, HZ = HORIZON;
        p.save();
        p.globalCompositeOperation = 'color';
        const hg = p.createLinearGradient(0, HZ - 60, 0, HZ + 240);
        hg.addColorStop(0, 'rgba(200,160,190,0)'); hg.addColorStop(0.17, 'rgba(196,158,192,0.72)');
        hg.addColorStop(0.36, 'rgba(186,160,196,0.42)'); hg.addColorStop(0.62, 'rgba(186,160,196,0.12)'); hg.addColorStop(1, 'rgba(186,160,196,0)');
        p.fillStyle = hg;
        p.fillRect(-600, HZ - 60, 2300, 300);
        p.restore();
        const r = E.rrect(-600, HZ - 70, 2300, 1400, 0);
        E.wash(p, r, '#8E90BE', { alpha: 0.5, grad: { from: [0, HZ - 50], to: [0, HZ + 700], stops: [[0, 'rgba(142,144,190,0)'], [0.07, 'rgba(142,144,190,0.85)'], [0.45, 'rgba(150,146,192,1)'], [1, 'rgba(160,150,190,1)']] } });
        E.wash(p, r, '#56649C', { alpha: 0.42, grad: { from: [0, HZ + 40], to: [0, HZ + 900], stops: [[0, 'rgba(86,100,156,0)'], [0.4, 'rgba(86,100,156,0.55)'], [1, 'rgba(70,84,140,1)']] } });
      }
      // s09's cool veil over the background (thin)
      E.resetCamera(L);
      L.paint.save();
      L.paint.globalCompositeOperation = 'multiply';
      L.paint.fillStyle = E.rgba('#CEC8DA', 0.19 * (1 - fieldA * 0.8));
      L.paint.fillRect(0, 0, E.W, E.H);
      L.paint.restore();

      // ---- the mirror-world
      E.camera(L, camD(cam, 1));
      const [gx, gy] = globeC(lt);
      // as it sinks out of frame it melts into the rising light (never crowds the subtitle band)
      const gyS = (gy - cam.y) * cam.zoom + 960;
      const gA = 1 - 0.88 * ep(gyS, 1020, 1480, 'inOutSine');
      E.save(L);
      E.alpha(L, gA);
      const disc = circlePath(gx, gy, GR * 0.985);
      reflected(L, lt, gx, gy, 0.75 * flare + 0.4 * lit * (1 - 0.6 * k));
      E.props.personalWorld(L, gx, gy, GR, { t: lt + 8, kind: 'home', life: 0, dissolve: 0.56, glow: 0.12 + 0.22 * lit, mirror: 1 });
      mirrorBody(L, gx, gy, GR, 0.12);
      // the light falling on the mirror: the upper hemisphere brightens (bare paper back) where it strikes
      if (light > 0) {
        const hit = clamp((front - (gy - GR)) / (GR * 1.2));
        if (hit > 0) {
          E.save(L);
          E.each(L, (c) => c.clip(disc));
          rlift(L.paint, gx, gy - GR * 0.62, GR * 0.85, 0.3 * hit * light, [[0, 0.9], [0.5, 0.5], [1, 0]]);
          E.restore(L);
        }
      }
      construction(L, gx, gy, 0.135 * (1 - ep(lt, T.on, T.ci + 0.3, 'inOutSine')));
      E.props.nakis(L, gx, gy, RN, { reveal: 1, t: lt + 8, glow: 0.5 + 0.3 * lit, clip: disc });
      // gleam on the glass over the gold
      E.save(L);
      E.each(L, (c) => c.clip(disc));
      const gl = new Path2D();
      gl.ellipse(gx - GR * 0.44, gy - GR * 0.5, GR * 0.36, GR * 0.11, -0.66, 0, TAU);
      E.lift(L.paint, gl, 0.28, 6);
      E.restore(L);

      // ---- light flowing through the ornament
      const s = RN / 1000;
      const Lc = L.light;
      const dU = [Math.cos(DIAG), Math.sin(DIAG)];
      const keep = 1 - 0.6 * ep(lt, T.ci, T.in, 'inOutSine');
      thread(Lc, [[gx + dU[0] * 0.84 * RN, gy + dU[1] * 0.84 * RN], [gx + dU[0] * 0.177 * RN, gy + dU[1] * 0.177 * RN]], 0.5 * keep, { tailPow: 0.6 });
      {
        const u = seg(lt, 0, 0.75);
        const sweep = TAU * 0.78 * E.ease.outCubic(u);
        const ring = [];
        for (let i = 0; i <= 40; i++) { const a = DIAG + sweep * (i / 40); ring.push([gx + Math.cos(a) * 0.177 * RN, gy + Math.sin(a) * 0.177 * RN]); }
        if (sweep > 0.02) thread(Lc, ring, (0.6 + 0.4 * (1 - u)) * keep, { tailPow: 1.2 });
      }
      // cilve: light runs out along all eight scrolls from the centre
      if (lit > 0) {
        const head = ep(lt, T.ci - 0.05, T.es + 0.35, 'inOutSine');
        const fadeS = 1 - 0.55 * ep(lt, T.es + 0.4, T.in + 0.6);
        for (const sc2 of LYRES) {
          const n = Math.max(2, Math.round(sc2.length * head));
          const pts = sc2.slice(0, n).map(([x, y]) => [gx + x * s, gy + y * s]);
          thread(Lc, pts, 0.6 * fadeS, { w: 0.8, tailPow: 2.2 });
          if (head > 0 && head < 1) E.glow(Lc, pts[pts.length - 1][0], pts[pts.length - 1][1], 20, '#FFEBC0', 0.55);
        }
        // esmaya: a soft wave of light expanding to the border, then the ornament's own glow
        const wv = ep(lt, T.ci + 0.1, T.es + 0.6, 'outCubic');
        if (wv > 0 && wv < 1) {
          Lc.save();
          Lc.clip(disc);
          Lc.globalCompositeOperation = 'lighter';
          Lc.strokeStyle = E.rgba('#FFE0A0', 0.32 * Math.sin(wv * PI));
          Lc.lineWidth = 18;
          Lc.beginPath(); Lc.arc(gx, gy, 0.2 * RN + wv * 0.68 * RN, 0, TAU); Lc.stroke();
          Lc.restore();
        }
        E.glow(Lc, gx, gy, RN * 0.95, '#FFE3A6', 0.16 * ep(lt, T.es - 0.1, T.es + 0.5) * (1 - 0.5 * k));
      }
      // glints where the descending light strikes the mirror
      const gls = [[-0.38, -0.62, 0.0], [0.22, -0.7, 0.12], [-0.05, -0.32, 0.22], [0.5, -0.35, 0.3], [-0.62, -0.18, 0.4]];
      gls.forEach(([dx, dy, d], i) => {
        const kk = ep(lt, T.ci - 0.12 + d * 0.5, T.ci + 0.15 + d * 0.5, 'outCubic') * (1 - ep(lt, T.ci + 0.35 + d * 0.5, T.ci + 1.3 + d * 0.5, 'inOutSine'));
        const tw = 0.8 + 0.2 * Math.sin(lt * 9 + i * 2);
        glint(Lc, gx + dx * GR, gy + dy * GR, 56 + 26 * (i % 2), 0.85 * kk * tw, 0.2 * i);
      });

      E.restore(L);

      // ---- the heart-light
      const H = heartAt(lt, T);
      const rise = ep(lt, T.rise0, T.rise1, 'inOutSine');
      if (rise > 0 && lt < T.dis1) {
        const pts = [];
        for (let i = 0; i <= 24; i++) pts.push(heartAt(Math.max(T.rise0, lt - 0.3 * (1 - i / 24)), T).pos);
        thread(Lc, pts, 0.55 * (1 - ep(lt, T.dis0, T.dis1)), { w: 1.7, col: ['#FFC9B4', '#FFDCCB', '#FFF1E6'], tailPow: 2.8 });
      }
      const dis = ep(lt, T.dis0, T.dis1, 'inOutSine');
      const hl = ep(lt, T.on, T.ci + 0.3) * 0.22;
      const hc = E.mix(E.P.rose, '#EBB8B8', 0.75 * ep(lt, T.rise0 + 0.3, T.rise1));
      E.glow(Lc, H.pos[0], H.pos[1], H.r * (4.5 + 4 * dis), '#FFD3C4', (0.35 + hl) * (1 - dis) + 0.25 * Math.sin(PI * dis));
      if (dis < 1) E.props.heartLight(L, H.pos[0], H.pos[1], H.r * (1 + 0.25 * dis), { t: lt, glow: 0.75 + hl + 0.2 * rise, rot: H.rot, alpha: 1 - dis, color: hc });
      // it dissolves into the light: a bloom of bare paper and warm light that settles into the field
      const bl = Math.sin(PI * seg(lt, T.dis0 - 0.06, T.dis1 + 0.12));
      if (bl > 0) {
        rlift(L.paint, H.pos[0], H.pos[1], H.r * (2 + 5 * dis), 0.7 * bl);
        E.glow(Lc, H.pos[0], H.pos[1], 160 + 260 * dis, '#FFF0D2', 0.4 * bl);
      }

      // ---- the light settles into the warm cream of s11's morning sky around the bleed point (540, 300)
      const settle = ep(lt, T.dis0, T.dis1 + 0.22, 'inOutSine');
      if (settle > 0) {
        E.resetCamera(L);
        rbloom(L.paint, 540, 330, 900, '#EEDFC2', 0.9 * settle, 1.15);
      }

      // ---- rising into the light: a luminous haze climbs over the sinking world (keeps the subtitle band calm)
      if (k > 0.01) {
        E.resetCamera(L);
        const p = L.paint;
        const yTop = lerp(1920, 560, k);
        const hg = p.createLinearGradient(0, yTop, 0, Math.min(1920, yTop + 900));
        hg.addColorStop(0, 'rgba(255,253,246,0)');
        hg.addColorStop(0.45, `rgba(255,251,240,${0.75 * Math.pow(k, 1.3)})`);
        hg.addColorStop(1, `rgba(255,250,238,${0.95 * Math.pow(k, 1.3)})`);
        p.save();
        p.fillStyle = hg;
        p.fillRect(0, yTop, E.W, 1920 - yTop);
        p.restore();
        rbloom(p, 540, 1500, 900, '#F1D9AE', 0.5 * k, 0.8);
        L.ink.save(); L.ink.globalCompositeOperation = 'destination-out'; L.ink.fillStyle = hg; L.ink.fillRect(0, yTop, E.W, 1920 - yTop); L.ink.restore();
        L.light.save(); L.light.globalCompositeOperation = 'destination-out'; L.light.globalAlpha = 0.6; L.light.fillStyle = hg; L.light.fillRect(0, yTop, E.W, 1920 - yTop); L.light.restore();
      }
    },

    sfx(shot) {
      const T = times(shot), g = (x) => x + shot.start;
      return [
        { t: g(T.on - 0.15), type: 'swell', gain: 0.34, dur: 1.4 },
        { t: g(T.ci - 0.05), type: 'chime', gain: 0.3, pitch: 1.0 },
        { t: g(T.ci), type: 'sparkle', gain: 0.28 },
        { t: g(T.in - 0.1), type: 'swell', gain: 0.32, dur: 1.6 },
        { t: g(T.dis0 + 0.05), type: 'chime', gain: 0.18, pitch: 2.0 },
      ];
    },
  });
})();
