/* s07 · 24.70–31.55 · "Eğer dünyamızı sevdikse sonra gördük ki dünyamız hayatımız üstünde bina edildiği için"
   Warm golden-hour vignette on bare paper: the man embraces his personal world, cheek toward the glass. At
   "sevdikse" a rose heart-light blooms in his chest; on each heartbeat a soft ring of warm light travels from it
   into the globe, rose-gold sparks drift across and the little world answers (inner glow, lit door).
   "sonra gördük ki": the camera cranes DOWN and back while the painting spreads out of the vignette over the
   pencil underdrawing until it fills the whole page, revealing that the world rests on an HOURGLASS like a dome on
   a pillar; the man lets go and steps back, looking at it. "hayatımız": pencil label "hayat" (his gaze drops to
   the hourglass, which glows); "üstünde": the globe settles on the cap; "bina edildiği": architect's pencil
   construction lines (axis, joint, base, dome arc) while his gaze returns to the world. Cut to s08.
   World layout (shared with s08): ground y 1170, hourglass base (690,1170) h 390, globe r 195 on its top cap,
   man h 700 at x 250 after stepping back. Long golden-hour shadows fall to the lower right. The landscape is the
   shared E.props.ground (as in s06 / s09) under a golden-hour glaze. */
(function () {
  const E = window.E;
  const P = E.P;
  const PR = E.props;

  // ---------------- shared set (keep identical in s08) ----------------
  const GY = 1170;                    // ground line (subject plane)
  const HGX = 690, HGH = 390;         // hourglass base centre x, height
  const GR = 195;                     // personal world radius
  const GX = HGX, GYC = GY - HGH - GR + 14; // globe centre (sits slightly into the top cap)
  const MH = 700;                     // man height
  const XE = 398, XF = 250;           // man x while embracing / after stepping back
  const SHX = 0.62, SHY = 0.2;        // cast-shadow projection (point at height z -> x + z·SHX, GY + z·SHY)
  const HZ = 925, GK = 0.82;          // E.props.ground top (world y) and its parallax depth

  // ---------------- helpers ----------------
  const ep = E.ep, seg = E.seg, lerp = E.lerp, clamp = E.clamp;
  const bump = (t, a, b) => Math.sin(Math.PI * seg(t, a, b));
  const OFF = 30000;

  /** soft fill that is correct under any transform: the path is pre-transformed to device space and drawn with
      an identity matrix far off-canvas; only its blurred shadow lands in place. (E.softFill misplaces the
      shadow by OFF·(zoom−1) px when the transform is scaled — reported as an engine bug.) */
  function softFill(ctx, path, color, blur, rule) {
    const m = ctx.getTransform();
    const sc = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1;
    const p2 = new Path2D();
    p2.addPath(path, new DOMMatrix([m.a, m.b, m.c, m.d, m.e - OFF, m.f]));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0.5, blur * sc * 2);
    ctx.shadowOffsetX = OFF;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = color;
    ctx.fill(p2, rule || 'nonzero');
    ctx.restore();
  }
  /** E.wash with a transform-safe soft edge */
  function wash(ctx, path, color, o = {}) {
    if (!o.soft) return E.wash(ctx, path, color, o);
    ctx.save();
    ctx.globalCompositeOperation = o.mode === 'over' ? 'source-over' : 'multiply';
    ctx.globalAlpha *= o.alpha ?? 1;
    softFill(ctx, path, o.light ? E.shade(color, o.light) : color, o.soft);
    ctx.restore();
  }
  const bloom = (ctx, x, y, r, col, o = {}) => wash(ctx, E.blob(x, y, r, { seed: o.seed || 3, irr: o.irr ?? 0.25 }), col, { alpha: o.alpha ?? 0.6, soft: o.soft ?? 10 });
  const lift = (ctx, path, a = 1, soft = 0) => wash(ctx, path, '#ffffff', { mode: 'over', alpha: a, soft });
  /** contact shadow under the man (E.man.shadow uses E.softFill, displaced under a zoomed camera) */
  const manShadow = (L, x, y, h, a = 0.3) =>
    wash(L.paint, E.blob(x + 0.02 * h, y, h * 0.12, { rx: h * 0.13, ry: h * 0.018, irr: 0.05, seed: 2 }), '#8F8C9C', { alpha: a, soft: h * 0.012 });

  /** camera for a parallax layer of depth k (1 = subject plane) */
  function camK(L, c, k) {
    E.camera(L, { x: 540 + (c.x - 540) * k, y: 960 + (c.y - 960) * k, zoom: 1 + (c.z - 1) * k });
  }

  /** irregular vignette outline (screen space) with separate top / bottom radii; periodic noise (no seam) */
  function vignetteBlob(cx, cy, rx, ryT, ryB, seed, irr = 0.11, rotA = 0) {
    const pts = [];
    const n = 90;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * E.TAU;
      const ca = Math.cos(a), sa = Math.sin(a);
      const k = 1 + irr * (E.noise2(ca * 1.6 + 3, sa * 1.6 - 2, seed) + 0.45 * E.noise2(ca * 4.1, sa * 4.1, seed + 5));
      const ry = lerp(ryT, ryB, E.smooth(clamp((sa + 0.35) / 0.7)));
      const px = ca * rx * k, py = sa * ry * k;
      pts.push([cx + px * Math.cos(rotA) - py * Math.sin(rotA), cy + px * Math.sin(rotA) + py * Math.cos(rotA)]);
    }
    return E.smoothPath(pts, true);
  }

  // ---------------- the man: grounding offset, skeleton points, arm IK ----------------
  const R = E.man.R;
  const rot = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  /** vertical grounding shift E.man applies for a side pose (so IK targets land exactly) */
  function groundDy(h, Pz) {
    const hip = [0, -R.hipY * h + (Pz.hipDrop || 0) * h];
    const leg = (H, K) => { const j = [hip[0] + Math.sin(H) * R.thigh * h, hip[1] + Math.cos(H) * R.thigh * h]; const a2 = H - K; return { j, e: [j[0] + Math.sin(a2) * R.shin * h, j[1] + Math.cos(a2) * R.shin * h] }; };
    const fy = (lg, fa) => { const q1 = rot([R.foot * h, 0.035 * h], -fa), q2 = rot([-R.heel * h, 0.035 * h], -fa); return Math.max(lg.e[1] + q1[1], lg.e[1] + q2[1]); };
    const n = leg(Pz.nH ?? 0.02, Pz.nK ?? 0.04), f = leg(Pz.fH ?? -0.02, Pz.fK ?? 0.04);
    const low = Math.max(fy(n, Pz.nF ?? 0), fy(f, Pz.fF ?? 0), n.j[1] + 0.035 * h, f.j[1] + 0.035 * h);
    return -low;
  }
  function shoulderOf(h, lean, hipDrop = 0) {
    const hip = [0, -R.hipY * h + hipDrop * h];
    const nb = [hip[0] + Math.sin(lean) * R.torso * h, hip[1] - Math.cos(lean) * R.torso * h];
    const o = rot([-0.012 * h, 0.03 * h], lean);
    return [nb[0] + o[0], nb[1] + o[1]];
  }
  /** a point in the man's torso frame (fractions of h: x forward, y up from the hip) → world coords */
  function torsoPt(mx, Pz, x, y) {
    const dy = groundDy(MH, Pz), lean = Pz.lean || 0;
    const q = rot([x * MH, -y * MH], lean);
    return [mx + q[0], GY + dy - R.hipY * MH + (Pz.hipDrop || 0) * MH + q[1]];
  }
  /** the heart-light sits inside the chest, just behind its front line */
  const heartPos = (mx, Pz) => torsoPt(mx, Pz, 0.03, 0.195);
  /** two-bone IK: shoulder angle + elbow bend so the wrist reaches T (local coords). Elbow below the line. */
  function armIK(S, T, h) {
    const l1 = R.upper * h, l2 = R.fore * h;
    const dx = T[0] - S[0], dy = T[1] - S[1];
    const d = clamp(Math.hypot(dx, dy), 1e-3, (l1 + l2) * 0.995);
    const phi = Math.atan2(dx, dy);
    const al = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const a1 = phi - al;
    const J = [S[0] + Math.sin(a1) * l1, S[1] + Math.cos(a1) * l1];
    const a2 = Math.atan2(T[0] - J[0], T[1] - J[1]);
    return [a1, a2 - a1];
  }
  /** hug pose for the man at x = mx: wrists placed on the globe (world coords) */
  function hugPose(mx, k, gyc) {
    const Pz = {
      lean: lerp(0.07, 0.13, k), head: lerp(0.14, 0.34, k),
      nH: 0.05, nK: 0.05, fH: -0.07, fK: 0.08, nF: 0, fF: 0, nW: 0.25, fW: 0.2,
    };
    const dy = groundDy(MH, Pz);
    const S = shoulderOf(MH, Pz.lean);
    const toL = (wx, wy) => [wx - mx, wy - GY - dy];
    const nT = toL(lerp(566, 594, k), lerp(700, 686, k) + (gyc - GYC));
    const fT = toL(lerp(585, 610, k), lerp(668, 650, k) + (gyc - GYC));
    [Pz.nS, Pz.nE] = armIK(S, nT, MH);
    [Pz.fS, Pz.fE] = armIK(S, fT, MH);
    return Pz;
  }

  /** step back with planted feet: body x and leg angles */
  function stepBack(lt, t0, t1, x0, x1, h) {
    const s = seg(lt, t0, t1);
    const bx = lerp(x0, x1, E.ease.inOutSine(s));
    const Lg = 0.475 * h, off = 0.016 * h;
    const sa = E.ease.inOutSine(seg(s, 0.0, 0.6)), sb = E.ease.inOutSine(seg(s, 0.4, 1.0));
    const fN = lerp(x0, x1, sa) + off, fF = lerp(x0, x1, sb) - off;
    const liftN = Math.sin(Math.PI * seg(s, 0, 0.6)), liftF = Math.sin(Math.PI * seg(s, 0.4, 1));
    return {
      x: bx, s,
      nH: Math.asin(clamp((fN - bx) / Lg, -0.8, 0.8)), fH: Math.asin(clamp((fF - bx) / Lg, -0.8, 0.8)),
      nK: 0.03 + 0.55 * liftN, fK: 0.03 + 0.55 * liftF, nF: -0.1 * liftN, fF: -0.1 * liftF,
    };
  }

  // ---------------- timing (local seconds) ----------------
  function times(shot) {
    const w = (i) => E.T(i) - shot.start;
    return {
      eger: w(45), dunyamizi: w(46), sevdikse: w(47), sonra: w(48), gorduk: w(49), ki: w(50),
      dunyamiz: w(51), hayatimiz: w(52), ustunde: w(53), bina: w(54), edildigi: w(55), icin: w(56),
    };
  }

  function camera(lt, W) {
    const t0 = W.sonra - 0.1, t1 = W.sonra + 1.8;
    const a = { x: 626, y: 652, z: 1.72 };
    const a2 = { x: 633, y: 645, z: 1.8 };      // slow push-in during the intimate part
    const b = { x: 540, y: 960, z: 1.0 };
    const push = ep(lt, 0, t0, 'inOutSine');
    const s = { x: lerp(a.x, a2.x, push), y: lerp(a.y, a2.y, push), z: lerp(a.z, a2.z, push) };
    // crane down first (y leads), the pull-back trails slightly
    const ky = ep(lt, t0, t1 - 0.2, 'inOutCubic');
    const kz = ep(lt, t0 + 0.12, t1, 'inOutCubic');
    const c = { x: lerp(s.x, b.x, kz), y: lerp(s.y, b.y, ky), z: lerp(s.z, b.z, kz) };
    // after the reveal: a very slow drift toward the structure
    const d = ep(lt, t1, t1 + 3.4, 'inOutSine');
    c.x += 12 * d; c.y -= 6 * d; c.z *= 1 + 0.03 * d;
    // breathing handheld
    c.x += 1.6 * E.drift(lt, 3, 0.25); c.y += 1.3 * E.drift(lt, 7, 0.22);
    return c;
  }

  // ---------------- painting ----------------
  function sky(L, c, lt, warm) {
    const p = L.paint;
    E.resetCamera(L);
    const sh = (c.y - 960) * 0.1;
    p.save();
    const g = p.createLinearGradient(0, -150 - sh, 0, 1250 - sh);
    g.addColorStop(0, E.shade(P.cerulean, 0.42));
    g.addColorStop(0.3, E.shade(P.skyWash, 0.58));
    g.addColorStop(0.55, E.shade(P.gamboge, 0.62));
    g.addColorStop(0.8, E.shade(P.blush, 0.55));
    g.addColorStop(1, E.shade(P.terracotta, 0.62));
    p.globalCompositeOperation = 'multiply';
    p.fillStyle = g;
    p.fillRect(0, 0, E.W, E.H);
    p.restore();
    // wet blooms in the sky (parallax 0.15)
    camK(L, c, 0.15);
    bloom(p, 160, 260, 280, E.shade(P.cerulean, 0.35), { seed: 11, alpha: 0.24, soft: 34 });
    bloom(p, 930, 160, 230, E.shade(P.ultramarine, 0.55), { seed: 12, alpha: 0.16, soft: 30 });
    bloom(p, 700, 760, 320, E.shade(P.gamboge, 0.4), { seed: 13, alpha: 0.3, soft: 50 });
    bloom(p, 260, 880, 260, E.shade(P.rose, 0.66), { seed: 14, alpha: 0.2, soft: 50 });
    // slow clouds
    const cdx = lt * 5;
    PR.cloud(L, 870 + cdx, 330, 300, { seed: 5, t: lt, tone: 'dusk', alpha: 0.85 });
    PR.cloud(L, 110 + cdx * 0.7, 520, 210, { seed: 8, t: lt, tone: 'dusk', alpha: 0.7 });
    // two distant birds gliding across during the hold (life in the sky)
    for (let i = 0; i < 2; i++) {
      const u = (lt - 3.6 - i * 0.35) / 5.5;
      if (u <= 0 || u >= 1) continue;
      const bx = 1120 - u * 900 + i * 40, by = 470 + i * 26 - 60 * u + 8 * Math.sin(lt * 1.3 + i);
      const fl = Math.sin(lt * 7 + i * 2) * 5, s2 = 9 - i * 2;
      E.pencil(L.ink, [[bx - s2, by - 2 + fl * 0.6], [bx - s2 * 0.4, by - 3 - fl * 0.3], [bx, by]], { a: 0.5, w: 1.6, double: false });
      E.pencil(L.ink, [[bx, by], [bx + s2 * 0.4, by - 3 - fl * 0.3], [bx + s2, by - 2 + fl * 0.6]], { a: 0.5, w: 1.6, double: false });
    }
    // warm light from the upper left; love warms the whole vignette
    E.resetCamera(L);
    E.glow(L.light, 90, 140, 760, '#FFE2AE', 0.26);
    if (warm > 0.01) {
      p.save();
      const rg = p.createRadialGradient(600, 800, 40, 600, 800, 760);
      rg.addColorStop(0, E.rgba(E.shade(P.gamboge, 0.35), 0.5 * warm));
      rg.addColorStop(0.55, E.rgba(E.shade(P.blush, 0.3), 0.3 * warm));
      rg.addColorStop(1, E.rgba(E.shade(P.blush, 0.3), 0));
      p.globalCompositeOperation = 'multiply';
      p.fillStyle = rg;
      p.fillRect(0, 0, E.W, E.H);
      p.restore();
    }
  }

  /** the landscape: the film's shared meadow (E.props.ground) under golden-hour light, two framing trees */
  function land(L, c, lt) {
    const p = L.paint;
    camK(L, c, GK);
    PR.ground(L, HZ, { palette: 'spring', t: lt, seed: 5, flowers: 0.4, trees: 0.55, x0: -700, x1: 1800, bottom: HZ + 995 });
    // golden hour. The glazes start below the hill tops (never on the sky).
    const r = E.rrect(-800, HZ - 70, 2700, 1400, 0);
    // far hills: turned lavender-rose by the evening air (hue shift keeps their light values; soft top, so the
    // sky just above them only hazes a little)
    p.save();
    p.globalCompositeOperation = 'color';
    const hg = p.createLinearGradient(0, HZ - 60, 0, HZ + 240);
    hg.addColorStop(0, 'rgba(200,160,190,0)');
    hg.addColorStop(0.17, 'rgba(196,158,192,0.72)');
    hg.addColorStop(0.36, 'rgba(186,160,196,0.42)');
    hg.addColorStop(0.62, 'rgba(186,160,196,0.12)');
    hg.addColorStop(1, 'rgba(186,160,196,0)');
    p.fillStyle = hg;
    p.fillRect(-800, HZ - 60, 2700, 300);
    p.restore();
    // the meadow catches the low sun: warm light laid over the greens (screen = lighter and warmer, never muddy)
    p.save();
    p.globalCompositeOperation = 'screen';
    const sg = p.createLinearGradient(0, HZ + 60, 0, HZ + 1000);
    sg.addColorStop(0, 'rgba(120,78,24,0)');
    sg.addColorStop(0.18, 'rgba(120,78,24,0.36)');
    sg.addColorStop(0.6, 'rgba(116,80,30,0.46)');
    sg.addColorStop(1, 'rgba(110,86,52,0.52)');
    p.fillStyle = sg;
    p.fillRect(-800, HZ + 60, 2700, 1400);
    p.restore();
    // a thin gamboge glaze ties it to the sky
    E.wash(p, r, P.gamboge, { alpha: 0.16 });
    PR.tree(L, 112, 1078, 124, { kind: 'round', t: lt, seed: 3, color: '#93A96C', shadow: 0.5 });
    PR.tree(L, 1036, 1084, 158, { kind: 'cypress', t: lt, seed: 4, color: '#728F63', shadow: 0.5 });
  }

  /** long golden-hour cast shadows on the meadow (subject plane) */
  function castShadows(L, mx, pose, gyc, gx = GX) {
    const p = L.paint;
    const prj = (x, z) => [x + z * SHX, GY + z * SHY];
    // man: a simple silhouette (feet → legs → coat → shoulders → head)
    const lean = pose.lean || 0;
    const ux = (z) => mx + Math.sin(lean) * Math.max(0, z - 0.5 * MH);
    const sil = [
      [mx - 0.05 * MH, 0], [mx + 0.09 * MH, 0], [ux(0.3 * MH) + 0.045 * MH, 0.3 * MH], [ux(0.5 * MH) + 0.075 * MH, 0.5 * MH],
      [ux(0.8 * MH) + 0.07 * MH, 0.8 * MH], [ux(0.86 * MH) + 0.03 * MH, 0.86 * MH], [ux(0.95 * MH) + 0.045 * MH, 0.95 * MH],
      [ux(1.0 * MH), 1.0 * MH], [ux(0.95 * MH) - 0.05 * MH, 0.95 * MH], [ux(0.86 * MH) - 0.03 * MH, 0.86 * MH],
      [ux(0.8 * MH) - 0.07 * MH, 0.8 * MH], [ux(0.5 * MH) - 0.07 * MH, 0.5 * MH], [ux(0.3 * MH) - 0.045 * MH, 0.3 * MH],
    ].map(([x, z]) => prj(x, z));
    // hourglass + globe
    const hw = 0.265 * HGH, pw = 0.2 * HGH;
    const hg = [[HGX - hw, 0], [HGX + hw, 0], [HGX + hw, 0.09 * HGH], [HGX + pw, 0.12 * HGH], [HGX + pw, 0.88 * HGH], [HGX + hw, 0.91 * HGH], [HGX + hw, HGH],
      [HGX - hw, HGH], [HGX - hw, 0.91 * HGH], [HGX - pw, 0.88 * HGH], [HGX - pw, 0.12 * HGH], [HGX - hw, 0.09 * HGH]].map(([x, z]) => prj(x, z));
    const gz = GY - gyc;
    const gl = [];
    for (let i = 0; i < 40; i++) { const a = (i / 40) * E.TAU; gl.push(prj(gx + Math.cos(a) * GR, gz + Math.sin(a) * GR)); }
    const col = '#857CA0';
    wash(p, E.smoothPath(sil, true, 0.4), col, { alpha: 0.3, soft: 5 });
    wash(p, E.smoothPath(hg, true, 0.2), col, { alpha: 0.27, soft: 5 });
    wash(p, E.smoothPath(gl, true), col, { alpha: 0.24, soft: 8 });
  }

  /** grass tufts + small flowers along the ground line (subject plane) */
  function meadowDetails(L, lt) {
    const p = L.paint, ink = L.ink;
    const tufts = [[120, 1171], [300, 1175], [470, 1178], [585, 1183], [800, 1181], [905, 1176], [1010, 1172], [210, 1262], [760, 1300], [60, 1430], [1010, 1450], [130, 1700], [930, 1720]];
    tufts.forEach(([x0, y0], ci) => {
      const r = E.rng(70 + ci);
      const sc = y0 > 1600 ? 1.7 : y0 > 1200 ? 1.25 : 1;
      for (let i = 0; i < 5; i++) {
        const x = x0 + (r() - 0.5) * 34 * sc, hh = (16 + r() * 22) * sc, lean = (r() - 0.5) * 1.0;
        const sw = 2.5 * sc * Math.sin(lt * 1.3 + ci * 1.7 + i);
        const tip = [x + lean * hh + sw, y0 - hh];
        const blade = E.smoothPath([[x - 3, y0], [x + lean * hh * 0.5 + sw * 0.4 - 1, y0 - hh * 0.55], tip, [x + lean * hh * 0.5 + sw * 0.4 + 2, y0 - hh * 0.5], [x + 3, y0]], true, 0.4);
        E.wash(p, blade, E.mix(P.leaf, P.sap, r()), { alpha: 0.55 + 0.3 * r() });
        if (i % 2 === 0) E.pencil(ink, [[x, y0], [x + lean * hh * 0.5 + sw * 0.4, y0 - hh * 0.55], tip], { a: 0.2, w: 1.1, double: false });
      }
    });
    PR.flower(L, 566, 1192, 52, { kind: 'tulip', t: lt, seed: 4, color: '#E07A6E' });
    PR.flower(L, 818, 1188, 46, { kind: 'daisy', t: lt, seed: 5 });
    PR.flower(L, 338, 1194, 48, { kind: 'wild', t: lt, seed: 6, color: '#C98BC0' });
    PR.flower(L, 150, 1286, 62, { kind: 'daisy', t: lt, seed: 7 });
    PR.flower(L, 975, 1318, 60, { kind: 'wild', t: lt, seed: 8, color: '#D98AA0' });
    PR.flower(L, 70, 1745, 92, { kind: 'tulip', t: lt, seed: 9, color: '#E59A7E' });
  }

  /** soft ring of warm light travelling from the heart toward the globe: an annulus sector built from thin
      segments whose strength falls off smoothly with the angle (no visible wedge edges) */
  function warmthRing(L, hx, hy, toG, rr, wv, a) {
    const lc = L.light, pc = L.paint;
    const r0 = Math.max(1, rr - wv), r1 = rr + wv * 0.5;
    const gl = lc.createRadialGradient(hx, hy, r0, hx, hy, r1);
    gl.addColorStop(0, 'rgba(255,217,194,0)'); gl.addColorStop(0.68, 'rgba(255,217,194,1)'); gl.addColorStop(1, 'rgba(255,217,194,0)');
    const gp = pc.createRadialGradient(hx, hy, r0, hx, hy, r1);
    gp.addColorStop(0, 'rgba(224,156,154,0)'); gp.addColorStop(0.7, 'rgba(224,156,154,1)'); gp.addColorStop(1, 'rgba(224,156,154,0)');
    const N = 26, half = 1.15;
    lc.save(); pc.save();
    lc.globalCompositeOperation = 'lighter'; pc.globalCompositeOperation = 'multiply';
    lc.fillStyle = gl; pc.fillStyle = gp;
    const la = lc.globalAlpha, pa = pc.globalAlpha;
    for (let i = 0; i < N; i++) {
      const a0 = toG - half + (2 * half * i) / N, a1 = a0 + (2 * half) / N + 0.004;
      const m = (a0 + a1) / 2 - toG;
      const f = Math.pow(Math.cos((m / half) * Math.PI / 2), 1.6);
      if (f < 0.01) continue;
      const sp = new Path2D();
      sp.arc(hx, hy, r1, a0, a1);
      sp.arc(hx, hy, r0, a1, a0, true);
      sp.closePath();
      lc.globalAlpha = la * 0.32 * a * f; lc.fill(sp);
      pc.globalAlpha = pa * 0.15 * a * f; pc.fill(sp);
    }
    lc.restore(); pc.restore();
  }

  // ---------------- the scene ----------------
  E.scene('s07', {
    draw(L, lt, t, shot) {
      const W = times(shot);
      const c = camera(lt, W);
      const p = L.paint, ink = L.ink;

      // ---- states
      const love = ep(lt, W.sevdikse + 0.1, W.sevdikse + 0.9, 'inOutSine');
      const reveal = ep(lt, W.sonra - 0.1, W.ki + 0.6, 'inOutSine');
      const warm = 0.25 * ep(lt, 0, W.dunyamizi + 0.5) + 0.75 * love - 0.7 * reveal * love;
      const vg = ep(lt, W.sonra - 0.25, W.sonra + 2.0, 'inOutCubic');   // the painting spreads over the page

      sky(L, c, lt, clamp(warm));
      land(L, c, lt);
      camK(L, c, 1.0);

      // ---- globe position ("üstünde": a gentle settle onto the cap)
      const us = W.ustunde - 0.06;
      const dip = lt > us ? -8 * Math.sin(Math.min(Math.PI, (lt - us) * 9)) * Math.exp(-3.2 * (lt - us)) : 0;
      const gyc = GYC - dip + 1.0 * Math.sin(lt * 1.6) * (1 - seg(lt, us - 0.3, us));

      // ---- man state
      const kHug = ep(lt, W.eger - 0.12, W.dunyamizi + 0.5, 'inOutSine');           // draws the globe closer
      const kRel = ep(lt, W.sonra + 0.02, W.sonra + 0.62, 'inOutSine');              // releases the embrace
      const st = stepBack(lt, W.gorduk - 0.02, W.ki + 0.78, XE, XF, MH);
      const mx = lerp(XE - 8 * (1 - kHug), st.x, seg(lt, W.gorduk - 0.02, W.gorduk));
      const breath = Math.sin(lt * 2.0) * 0.01;
      const hp = hugPose(XE - 8 * (1 - kHug), kHug, gyc);
      // gaze after letting go: at the world (level) → down to the hourglass at "hayatımız" → back up at "edildiği"
      const down = ep(lt, W.hayatimiz - 0.12, W.hayatimiz + 0.5, 'inOutSine') * (1 - ep(lt, W.edildigi - 0.05, W.icin + 0.35, 'inOutSine'));
      let pose = E.man.lerp(hp, E.man.pose.stand(), kRel);
      pose.lean += breath;
      pose.head += kRel * (0.07 + 0.24 * down) + 0.025 * Math.sin(lt * 0.9);
      pose.lean += kRel * 0.035 * down;
      if (lt > W.gorduk - 0.02) {
        // the planted-feet step takes over the legs (blended in, so the stance does not pop)
        const kb = E.smooth(seg(lt, W.gorduk - 0.02, W.gorduk + 0.22));
        for (const q of ['nH', 'fH', 'nK', 'fK', 'nF', 'fF']) pose[q] = lerp(pose[q] || 0, st[q], kb);
        pose.lean -= 0.035 * bump(lt, W.gorduk, W.ki + 0.78);
        // arms swing a touch with the step
        const sw = bump(lt, W.gorduk, W.ki + 0.78);
        pose.nS += 0.14 * sw; pose.fS -= 0.12 * sw;
      }

      // ---- cast shadows, hourglass
      castShadows(L, mx, pose, gyc);
      meadowDetails(L, lt);
      const sand = 0.66 - 0.012 * lt;
      const hgGlow = 0.12 + 0.5 * ep(lt, W.hayatimiz - 0.1, W.hayatimiz + 0.6, 'outCubic');
      PR.hourglass(L, HGX, GY, HGH, { t: lt, sand, flow: 1, speed: 1, glow: hgGlow });

      // ---- man (behind the globe)
      manShadow(L, mx, GY, MH, 0.3);
      const mo = { x: mx, y: GY, h: MH, view: 'side', facing: 1, pose };
      E.man.draw(L, mo);

      // ---- the personal world on the cap
      wash(p, E.blob(GX, GY - HGH + 4, 70, { rx: 96, ry: 9, irr: 0.05, seed: 3 }), '#6E5A50', { alpha: 0.34, soft: 5 });
      // heartbeats after "sevdikse" (the heart prop's own beat, its clock shifted so a beat lands on the word)
      const hOff = 0.15 + 2.5 - (W.sevdikse + 0.05);
      const k0 = Math.ceil((W.sevdikse - 0.05 + hOff) * 0.8 - 0.12);
      const beats = [0, 1, 2].map((k) => (k0 + k + 0.12) / 0.8 - hOff);
      // the world answers each beat a moment later (the warmth arrives)
      let answer = 0;
      beats.forEach((tb) => { const u = lt - tb - 0.45; if (u > 0) answer = Math.max(answer, Math.exp(-u * 3.2) * (1 - Math.exp(-u * 18))); });
      answer *= 1 - kRel;
      const glow = 0.22 + 0.1 * kHug + 0.26 * love + 0.14 * answer - 0.3 * reveal;
      const door = 0.9 * ep(lt, W.sevdikse + 0.3, W.sevdikse + 1.1, 'inOutCubic') * (1 - 0.5 * reveal);
      PR.personalWorld(L, GX, gyc, GR, { t: lt, kind: 'home', life: 1, glow: clamp(glow), doorOpen: door });
      if (love > 0.01 && reveal < 0.99) {
        // a rose-gold warmth filling the little world (wet glaze inside the glass, from the side of his heart)
        const gp = new Path2D(); gp.arc(GX, gyc, GR - 3, 0, E.TAU);
        p.save();
        p.clip(gp);
        const rg = p.createRadialGradient(GX - 110, gyc + 40, 10, GX - 60, gyc, GR * 1.5);
        rg.addColorStop(0, E.rgba('#EFA894', (0.36 + 0.2 * answer) * love * (1 - reveal)));
        rg.addColorStop(1, 'rgba(242,184,162,0)');
        p.globalCompositeOperation = 'multiply';
        p.fillStyle = rg;
        p.fillRect(GX - GR, gyc - GR, 2 * GR, 2 * GR);
        p.restore();
        E.glow(L.light, GX - 70, gyc + 20, GR * 1.1, '#FFD2B4', (0.06 + 0.12 * answer) * love * (1 - reveal));
      }

      // ---- near arm over the globe (the embrace)
      if (kRel < 0.98) {
        E.save(L);
        const clip = new Path2D();
        clip.arc(GX, gyc, GR + 3, 0, E.TAU);
        E.each(L, (cx) => cx.clip(clip));
        E.man.draw(L, { ...mo, pose: { ...pose, fS: -0.04, fE: 0.14 } });
        E.restore(L);
      }

      // ---- heart-light in the chest
      const hk = ep(lt, W.sevdikse - 0.14, W.sevdikse + 0.4, 'outBack');
      if (hk > 0.001) {
        const [hx, hy] = heartPos(mx, pose);
        const hr = 0.033 * MH * hk;
        const toG = Math.atan2(gyc - hy, GX - hx);
        // warmth radiating to the globe: a soft ring of light leaves the heart on each beat
        beats.forEach((tb, i) => {
          const u = (lt - tb) / 1.15;
          if (u <= 0 || u >= 1) return;
          const rr = 30 + E.ease.outCubic(u) * 380;
          const a = Math.pow(1 - u, 1.4) * E.ease.outCubic(clamp(u * 5)) * (1 - kRel) * (i ? 0.7 : 1);
          if (a > 0.005) warmthRing(L, hx, hy, toG, rr, 60 * (1 - 0.4 * u) + 16, a);
        });
        E.glow(L.light, lerp(hx, GX, 0.55), lerp(hy, gyc, 0.55), 300, '#FFD8AE', 0.2 * love * (1 - 0.75 * reveal));
        PR.heartLight(L, hx, hy, hr, { t: lt + hOff, glow: 0.55 + 0.35 * love - 0.25 * reveal, pulse: 1.3 });
        // rose-gold sparks drifting along a gentle arc from the heart into the world
        const sa = love * (1 - kRel);
        if (sa > 0.01) {
          const tg = [GX - 40, gyc + 20];
          const cp = [lerp(hx, tg[0], 0.45), Math.min(hy, tg[1]) - 110];
          for (let j = 0; j < 12; j++) {
            const u = ((lt - W.sevdikse) * 0.55 + j / 12) % 1;
            if (u < 0) continue;
            const q = 1 - u;
            const off = 26 * Math.sin(j * 2.3 + lt * 1.7);
            const x = q * q * hx + 2 * q * u * cp[0] + u * u * tg[0] + off * u * q;
            const y = q * q * hy + 2 * q * u * (cp[1] + off) + u * u * tg[1];
            const al = sa * Math.sin(Math.PI * u) * (0.6 + 0.4 * Math.sin(lt * 5 + j));
            const sz = 5 + 3.5 * Math.sin(j * 1.7) ** 2;
            wash(p, E.blob(x, y, sz * 1.6, { seed: j, irr: 0.15, n: 16 }), E.mix(P.rose, P.gamboge, (j % 3) / 3), { alpha: 0.36 * al, soft: sz * 0.5 });
            lift(p, E.blob(x, y, sz * 0.55, { seed: j + 5, irr: 0.1, n: 12 }), 0.9 * al, 1.5);
            E.glow(L.light, x, y, sz * 4, '#FFE2C8', 0.6 * al);
          }
        }
      }

      // ---- pencil: "hayat" label + arrow
      const lp = ep(lt, W.hayatimiz - 0.08, W.hayatimiz + 0.5, 'linear');
      if (lp > 0) {
        E.note(ink, 'hayat', 868, 946, { size: 70, p: lp, alpha: 0.8, rot: -0.07 });
        E.arrow(ink, [834, 984], [796, 1032], { bend: -0.3, p: ep(lt, W.hayatimiz + 0.3, W.hayatimiz + 0.7), w: 2.4, alpha: 0.62, head: 14 });
      }
      // ---- pencil construction: "bina edildiği" (axis, joint and base ticks, dome arc)
      const cp = ep(lt, W.bina - 0.12, W.edildigi + 0.3, 'inOutSine');
      if (cp > 0) {
        ink.save();
        ink.setLineDash([16, 11]);
        const y0 = GYC - GR - 46, y1 = GY + 30;
        E.pencil(ink, [[GX, y0], [GX, lerp(y0, y1, cp)]], { a: 0.42, w: 1.7, double: false });
        ink.restore();
        const tk = ep(lt, W.bina + 0.05, W.edildigi + 0.45);
        for (const [y, w] of [[GY - HGH + 2, 150], [GY + 2, 200]]) {
          if (tk > 0) E.pencil(ink, [[GX - w * tk, y], [GX + w * tk, y]], { a: 0.36, w: 1.5, seed: y });
        }
        const ap = ep(lt, W.edildigi - 0.05, W.icin + 0.25);
        if (ap > 0) {
          const arc = [];
          for (let i = 0; i <= 32; i++) { const a = Math.PI + (Math.PI * i / 32) * ap; arc.push([GX + Math.cos(a) * (GR + 18), gyc + Math.sin(a) * (GR + 18)]); }
          E.pencil(ink, arc, { a: 0.3, w: 1.4, seed: 5 });
        }
      }

      // ---- vignette: an intimate painting floating on paper that spreads over the whole page at "sonra gördük ki"
      if (vg < 0.999) {
        E.resetCamera(L);
        const vb = vignetteBlob(lerp(520, 540, vg), lerp(850, 960, vg), lerp(660, 1500, vg), lerp(700, 1900, vg), lerp(330, 1500, vg), 7, lerp(0.085, 0.06, vg), lerp(-0.18, 0, vg));
        const ring = new Path2D();
        ring.rect(-300, -300, E.W + 600, E.H + 600);
        ring.addPath(vb);
        const vblur = lerp(9, 22, vg);
        softFill(p, ring, '#ffffff', vblur, 'evenodd');
        // a few loose splashes of the sky colours on the bare paper around the vignette (fade as it opens)
        if (vg < 0.9) {
          E.save(L);
          E.alpha(L, 1 - vg / 0.9);
          E.splatter(p, 130, 250, 70, E.shade(P.cerulean, 0.1), { seed: 4, n: 9, size: 4, alpha: 0.5 });
          E.splatter(p, 990, 1060, 60, E.shade(P.blush, -0.1), { seed: 6, n: 8, size: 3.5, alpha: 0.45 });
          E.splatter(p, 840, 1300, 50, E.shade(P.gamboge, -0.1), { seed: 9, n: 6, size: 3, alpha: 0.4 });
          E.restore(L);
        }
        // outside the vignette the pencil underdrawing stays faintly on the bare paper (unpainted, "not yet seen")
        for (const k of ['ink', 'light']) {
          const cx = L[k];
          cx.save();
          cx.globalCompositeOperation = 'destination-out';
          cx.globalAlpha = k === 'ink' ? 0.8 : 1;
          softFill(cx, ring, '#000000', vblur, 'evenodd');
          cx.restore();
        }
      }
    },

    sfx(shot) {
      const W = times(shot);
      const g = (x) => x + shot.start;
      return [
        { t: g(W.sevdikse + 0.02), type: 'heart', gain: 0.42 },
        { t: g(W.sevdikse + 0.08), type: 'swell', gain: 0.2, dur: 1.2 },
        { t: g(W.sonra - 0.12), type: 'whoosh', gain: 0.2 },
        { t: g(W.hayatimiz - 0.06), type: 'pen', gain: 0.28, dur: 0.55 },
        { t: g(W.hayatimiz), type: 'sand', gain: 0.2, dur: 2.0 },
        { t: g(W.bina - 0.1), type: 'pen', gain: 0.18, dur: 0.8 },
      ];
    },
  });
})();
