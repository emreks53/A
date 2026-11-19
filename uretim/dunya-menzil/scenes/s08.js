/* s08 · 31.55–36.70 · "hayatımız gibi zâil, fâni, kararsızdır, hissedip bildik."
   Cut to a closer view of the same set as s07 (world on the hourglass, golden hour, the shared meadow).
   "hayatımız gibi": the hourglass glows and a band of sand-gold light climbs through it into the world (the world is
   LIKE the life); "zâil": the sand runs faster and the world's pigment starts to run — pale watery runs trickle
   over the cap; "fâni": leaves and petals fall out of the fading world and settle on the meadow, the house washes
   out toward bare paper; "kararsızdır": the globe rocks on its narrow pillar and flickers, its outline breaking
   and re-forming. Then one long camera move left and back reveals the man: "hissedip" he lays his hand on his
   heart (the heart-light glows under his fingers), "bildik" a small nod and a bloom of warm light; he then cradles
   the heart in his palm as s09 opens. The final framing (man left, world right) is close to s09's first frame for
   the outgoing bleed (540, 800). */
(function () {
  const E = window.E;
  const P = E.P;
  const PR = E.props;

  // ---------------- shared set (identical to s07) ----------------
  const GY = 1170;                    // ground line (subject plane)
  const HGX = 690, HGH = 390;         // hourglass base centre x, height
  const GR = 195;                     // personal world radius
  const GX = HGX, GYC = GY - HGH - GR + 14; // globe centre (sits slightly into the top cap)
  const MH = 700;                     // man height
  const XF = 250;                     // man x after stepping back (s07)
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


  // ---------------- s08 ----------------
  // heart clock continuous with s07 (s07 shifts the heart prop's beat onto "sevdikse"): t_heart = lt + HCLK
  const S07 = (E.SHOTS.find((x) => x.id === 's07') || { start: 24.7, dur: 6.85 });
  const HCLK = S07.dur + (0.15 + 2.5 - (E.T(47) - S07.start + 0.05));
  const LT7 = S07.dur;   // s07 clock offset for continuous idle motion (clouds, grass, smoke)
  /** first heartbeat of the heart prop at or after local time x */
  const nextBeat = (x) => { const k = Math.ceil((x + HCLK) * 0.8 - 0.12); return (k + 0.12) / 0.8 - HCLK; };
  function times(shot) {
    const w = (i) => E.T(i) - shot.start;
    return { hayatimiz: w(57), gibi: w(58), zail: w(59), fani: w(60), kararsiz: w(61), hissedip: w(62), bildik: w(63) };
  }

  /** camera: closer view with a slow push-in; after "kararsızdır" one long move left and back to the man that
      eases out into a framing close to s09's opening (man left, world right) for the outgoing bleed */
  function camera(lt, W) {
    const a = { x: 718, y: 919, z: 1.36 }, a2 = { x: 713, y: 913, z: 1.42 };
    const b = { x: 470, y: 852, z: 1.09 };
    const g0 = W.kararsiz + 0.4, g1 = W.bildik + 2.2;
    const push = ep(lt, 0, g0, 'inOutSine');
    const s = { x: lerp(a.x, a2.x, push), y: lerp(a.y, a2.y, push), z: lerp(a.z, a2.z, push) };
    // a smooth start and a long, slow settle (velocity never stops abruptly)
    const u = seg(lt, g0, g1);
    const k = (1 - Math.pow(1 - u, 3)) * E.smooth(clamp(u / 0.24));
    const c = { x: lerp(s.x, b.x, k), y: lerp(s.y, b.y, k), z: lerp(s.z, b.z, k) };
    c.x += 1.6 * E.drift(lt + 31, 3, 0.25); c.y += 1.3 * E.drift(lt + 31, 7, 0.22);
    return c;
  }

  /** sand level (fraction in the top bulb): continues s07 (0.578 at the cut), runs faster from "zâil" */
  function sandAt(lt, W) {
    const tz = W.zail - 0.1;
    const ramp = (x) => (x <= 0 ? 0 : x < 0.5 ? x * x : x - 0.25); // ∫ of a 0→1 ramp over 0.5 s
    return 0.578 - 0.012 * lt - 0.026 * ramp(lt - tz);
  }

  /** pigment running out of the world: a few watery runs over the cap and down the top bulb, in the world's own
      pale colours (sap, leaf, sky, ochre, a little roof terracotta) — paint, never "liquid" */
  function drips(L, lt, t0, gyc) {
    const p = L.paint;
    const r = E.rng(9);
    const cols = ['#A9C47E', '#C98E78', '#8DB27A', '#D8B46A', '#9DB8D2', '#B6CC8A'];
    const xs = [-74, -40, -14, 16, 46, 76];
    for (let i = 0; i < 6; i++) {
      const x = GX + xs[i] + (r() - 0.5) * 10;
      const st = t0 + [0.12, 0.42, 0.0, 0.6, 0.28, 0.75][i] + r() * 0.1;
      const dur = 1.8 + r() * 1.0, maxL = 30 + r() * 80, w0 = 6 + r() * 5;
      const u = E.ease.outCubic(seg(lt, st, st + dur));
      if (u <= 0.002) continue;
      const len = maxL * u;
      const y0 = gyc + Math.sqrt(Math.max(0, GR * GR - (x - GX) * (x - GX))) - 12;
      const wob = (yy) => 1.4 * Math.sin((yy - y0) * 0.06 + i * 1.3);
      const L1 = [], L2 = [];
      const n = 10;
      for (let k = 0; k <= n; k++) {
        const f = k / n, yy = y0 + len * f;
        const w = w0 * (1.2 - 0.6 * Math.pow(f, 0.7));
        L1.push([x + wob(yy) - w / 2, yy]);
        L2.push([x + wob(yy) + w / 2, yy]);
      }
      const path = E.smoothPath(L1.concat(L2.reverse()), true, 0.45);
      const col = cols[i];
      wash(p, path, col, { alpha: 0.4, soft: 1.5 });
      E.wash(p, path, col, { alpha: 0.16 });
      const hy = y0 + len, hx = x + wob(hy);
      // the bead at the tip: the same pigment pooled, only a little deeper
      wash(p, E.blob(hx, hy - 1, w0 * 0.52, { seed: i + 3, irr: 0.15 }), E.shade(col, -0.12), { alpha: 0.5, soft: 1 });
      lift(p, E.blob(hx - w0 * 0.15, hy - w0 * 0.2, w0 * 0.16, { seed: i + 13, irr: 0.1, n: 10 }), 0.7 * u, 0.6);
      // a wet stain where the run leaves the globe
      wash(p, E.blob(x, y0 + 4, w0 * 1.4, { rx: w0 * 1.7, ry: w0 * 0.8, seed: i + 9, irr: 0.25 }), col, { alpha: 0.28, soft: 3 });
    }
  }

  /** leaves and petals falling out of the fading world, fluttering down and settling on the meadow */
  function leaves(L, lt, t0, gx, gyc) {
    const p = L.paint, ink = L.ink;
    const r = E.rng(21);
    for (let i = 0; i < 14; i++) {
      const st = t0 - 0.12 + i * 0.09 + r() * 0.2;
      const x0 = gx + 20 + (r() - 0.35) * 230, y0 = gyc - 40 + r() * 150;
      const groundY = GY + 6 + r() * 70;
      const vy = 140 + r() * 70, drift = 50 + r() * 110, ph = r() * 6, om = 2.4 + r() * 1.6;
      const petal = i % 3 === 2;
      const size = petal ? 14 + r() * 6 : 18 + r() * 9;
      const col = petal ? (r() > 0.5 ? '#E7A3A6' : '#F0BDB2') : ['#7FA563', '#A5BF6A', '#D2B062', '#C99A55'][Math.floor(r() * 4)];
      const tau = lt - st;
      if (tau <= 0) continue;
      const tFall = (groundY - y0) / vy;
      const tt = Math.min(tau, tFall);
      const landed = tau >= tFall;
      const x = x0 + drift * (tt / tFall) + 26 * Math.sin(om * tt + ph) * (1 - 0.6 * (tt / tFall));
      const y = y0 + vy * tt + 4 * Math.cos(om * 2 * tt + ph);
      const ang = landed ? 0.3 + ph : 0.9 * Math.sin(om * tt + ph) + ph * 0.2;
      const sq = landed ? 0.55 : 0.55 + 0.45 * Math.abs(Math.cos(om * tt * 0.8 + ph)); // flutter (leaf turning)
      const appear = E.ease.outCubic(seg(tau, 0, 0.25));
      const l = size * appear, w = size * (petal ? 0.66 : 0.42) * sq * appear;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const pts = (petal ? [[-l / 2, 0], [-l * 0.15, -w / 2], [l * 0.38, -w * 0.42], [l / 2, -w * 0.1], [l / 2, w * 0.1], [l * 0.38, w * 0.42], [-l * 0.15, w / 2]]
        : [[-l / 2, 0], [-l * 0.05, -w / 2], [l / 2, 0], [-l * 0.05, w / 2]]).map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]);
      const sp = E.smoothPath(pts, true, 0.5);
      E.wash(p, sp, col, { mode: 'over', alpha: 0.9 });
      E.wash(p, sp, E.shade(col, -0.3), { alpha: 0.22, grad: { from: [x - l * ca * 0.5, y - l * sa * 0.5], to: [x + l * ca * 0.5, y + l * sa * 0.5], c2: '#ffffff' } });
      if (!petal) E.pencil(ink, [[x - l * 0.45 * ca, y - l * 0.45 * sa], [x + l * 0.45 * ca, y + l * 0.45 * sa]], { a: 0.22, w: 1, double: false });
      E.pencil(ink, sp, { a: petal ? 0.14 : 0.2, w: 1, double: false });
      if (landed) wash(p, E.blob(x + 3, y + 3, l * 0.5, { rx: l * 0.55, ry: l * 0.18, seed: i }), '#7E7A90', { alpha: 0.16, soft: 2 });
    }
  }

  function capsulePath(a, b, r) {
    const p = new Path2D();
    const th = Math.atan2(b[1] - a[1], b[0] - a[0]);
    p.moveTo(a[0] + Math.cos(th + Math.PI / 2) * r, a[1] + Math.sin(th + Math.PI / 2) * r);
    p.arc(a[0], a[1], r, th + Math.PI / 2, th + Math.PI * 1.5);
    p.lineTo(b[0] + Math.cos(th - Math.PI / 2) * r, b[1] + Math.sin(th - Math.PI / 2) * r);
    p.arc(b[0], b[1], r, th - Math.PI / 2, th + Math.PI / 2);
    p.closePath();
    return p;
  }
  /** near-arm skeleton of a side pose (world coords): wrist, palm centre, finger tip */
  function nearHand(mx, Pz) {
    const dy = groundDy(MH, Pz);
    const S = shoulderOf(MH, Pz.lean || 0, Pz.hipDrop || 0);
    const el = [S[0] + Math.sin(Pz.nS) * R.upper * MH, S[1] + Math.cos(Pz.nS) * R.upper * MH];
    const a2 = Pz.nS + Pz.nE;
    const wr = [el[0] + Math.sin(a2) * R.fore * MH, el[1] + Math.cos(a2) * R.fore * MH];
    const hd = [Math.sin(a2 + (Pz.nW || 0)), Math.cos(a2 + (Pz.nW || 0))];
    const pc = [wr[0] + hd[0] * R.hand * MH * 0.42, wr[1] + hd[1] * R.hand * MH * 0.42];
    const tip = [wr[0] + hd[0] * 0.08 * MH, wr[1] + hd[1] * 0.08 * MH];
    const W2 = (q) => [mx + q[0], GY + dy + q[1]];
    return { wr: W2(wr), pc: W2(pc), tip: W2(tip) };
  }

  // ---------------- the scene ----------------
  E.scene('s08', {
    draw(L, lt, t, shot) {
      const W = times(shot);
      const c = camera(lt, W);
      const p = L.paint, ink = L.ink;
      const T7 = lt + LT7;

      const fade = ep(lt, W.zail - 0.2, W.kararsiz + 0.4, 'inOutSine');   // the warm light drains a little
      sky(L, c, T7, 0);
      land(L, c, T7);
      // cool, desaturating glaze over the background as the world passes
      E.resetCamera(L);
      if (fade > 0.01) {
        p.save();
        p.globalCompositeOperation = 'multiply';
        p.fillStyle = E.rgba('#CEC8DA', 0.42 * fade);
        p.fillRect(0, 0, E.W, E.H);
        p.restore();
      }
      camK(L, c, 1.0);

      // ---- globe rocking on the cap ("kararsızdır")
      const tk = W.kararsiz;
      const env = ep(lt, tk - 0.1, tk + 0.15) * (0.22 + 0.78 * Math.exp(-1.2 * Math.max(0, lt - tk - 0.15)));
      const th = 0.085 * env * Math.sin(E.TAU * 1.45 * (lt - tk + 0.1));
      const PVX = GX, PVY = GY - HGH + 6;
      const gx = PVX + Math.sin(th) * (PVY - GYC), gyc = PVY - Math.cos(th) * (PVY - GYC);

      // ---- man state
      const mx = XF - 34;   // (a touch further left than in s07 so he is fully outside the first framing)
      const kH = ep(lt, W.hissedip - 0.06, W.hissedip + 0.5, 'inOutCubic');       // hand to the heart
      const kO = ep(lt, W.bildik + 0.55, W.bildik + 1.2, 'inOutSine');            // ...then cradles it (as s09 opens)
      const nod = bump(lt, W.bildik + 0.02, W.bildik + 0.7);
      let pose = E.man.pose.stand();
      pose.lean += Math.sin(T7 * 2.0) * 0.01;
      pose.head = 0.06 + 0.03 * Math.sin(T7 * 0.9) + 0.06 * fade + 0.14 * nod;
      const chest = heartPos(mx, pose);
      if (kH > 0.001) {
        // hand laid flat on the chest: upper arm down, forearm up, fingers up (a readable profile variant of
        // E.man.pose.handOnHeart); afterwards it eases into handOnHeart itself, the heart resting in the palm
        pose.nS = lerp(pose.nS, 0.0, kH); pose.nE = lerp(pose.nE, 2.32, kH); pose.nW = lerp(0, 0.86, kH);
        pose.lean += 0.03 * kH;
        const ho = E.man.pose.handOnHeart(1);
        pose.nS = lerp(pose.nS, ho.nS, kO); pose.nE = lerp(pose.nE, ho.nE, kO); pose.nW = lerp(pose.nW, ho.nW, kO);
        pose.head = lerp(pose.head, ho.head, kO);
      }
      const NH = nearHand(mx, pose);
      const palmHeart = [NH.pc[0] - 0.012 * MH, NH.pc[1] + 0.004 * MH];
      const [hx2, hy2] = [lerp(chest[0], palmHeart[0], kH), lerp(chest[1], palmHeart[1], kH)];

      castShadows(L, mx, pose, gyc, gx);
      meadowDetails(L, T7);
      const sand = sandAt(lt, W);
      // the stream speeds up from "zâil"; the prop animates with t·speed, so it gets the integrated phase / speed
      // (a plain t with a changing speed would make the falling grains jump during the ramp)
      const sa0 = W.zail - 0.15, sd = 0.55, su = seg(lt, sa0, sa0 + sd);
      const speed = 1 + 1.7 * su;
      const phase = T7 + 1.7 * (lt < sa0 + sd ? sd * su * su / 2 : sd / 2 + (lt - sa0 - sd));
      const hgGlow = 0.5 + 0.3 * bump(lt, W.hayatimiz - 0.1, W.hayatimiz + 0.9) - 0.25 * fade;
      PR.hourglass(L, HGX, GY, HGH, { t: phase / speed, sand, flow: 1, speed, glow: hgGlow });

      // ---- man
      manShadow(L, mx, GY, MH, 0.3);
      const mo = { x: mx, y: GY, h: MH, view: 'side', facing: 1, pose };
      E.man.draw(L, mo);

      // ---- the world on its cap
      wash(p, E.blob(gx, GY - HGH + 4, 70, { rx: 96 - 30 * Math.abs(th) * 10, ry: 9, irr: 0.05, seed: 3 }), '#6E5A50', { alpha: 0.34, soft: 5 });
      const dissolve = 0.3 * ep(lt, W.zail - 0.12, W.zail + 0.75, 'outQuad') + 0.36 * ep(lt, W.fani - 0.1, W.fani + 1.0, 'outQuad');
      const flicker = 0.95 * ep(lt, tk - 0.12, tk + 0.25) * (1 - 0.6 * ep(lt, W.hissedip, W.bildik + 0.8));
      const glow = 0.32 - 0.25 * fade + 0.22 * bump(lt, W.gibi + 0.25, W.gibi + 1.1);
      E.save(L);
      E.translate(L, PVX, PVY); E.rotate(L, th); E.translate(L, -PVX, -PVY);
      PR.personalWorld(L, GX, GYC, GR, { t: T7, kind: 'home', life: 1 - 0.7 * dissolve, glow: clamp(glow), doorOpen: 0.45 * (1 - fade), dissolve, flicker });
      E.restore(L);
      // "gibi": a band of sand-gold light climbs from the lower bulb through the neck into the world — the world
      // is LIKE the life it stands on
      const gu = seg(lt, W.gibi - 0.2, W.gibi + 0.85);
      if (gu > 0 && gu < 1) {
        const yb = lerp(GY - 40, GYC - GR * 0.55, E.ease.inOutSine(gu)), ga = Math.sin(Math.PI * gu);
        const clip = new Path2D();
        clip.ellipse(HGX, GY - 0.284 * HGH, 0.155 * HGH, 0.2 * HGH, 0, 0, E.TAU);
        clip.ellipse(HGX, GY - 0.716 * HGH, 0.155 * HGH, 0.2 * HGH, 0, 0, E.TAU);
        clip.rect(HGX - 0.02 * HGH, GY - 0.6 * HGH, 0.04 * HGH, 0.2 * HGH);
        clip.rect(HGX - 0.2 * HGH, GY - HGH - 6, 0.4 * HGH, 0.12 * HGH);
        clip.arc(gx, gyc, GR - 2, 0, E.TAU);
        E.save(L);
        E.each(L, (cx) => cx.clip(clip));
        const g = p.createLinearGradient(0, yb - 80, 0, yb + 80);
        g.addColorStop(0, E.rgba(P.gamboge, 0));
        g.addColorStop(0.5, E.rgba(E.shade(P.gamboge, 0.05), 0.5 * ga));
        g.addColorStop(1, E.rgba(P.gamboge, 0));
        p.save(); p.globalCompositeOperation = 'multiply'; p.fillStyle = g; p.fillRect(0, yb - 80, E.W, 160); p.restore();
        const gl2 = L.light.createLinearGradient(0, yb - 60, 0, yb + 60);
        gl2.addColorStop(0, 'rgba(255,226,170,0)');
        gl2.addColorStop(0.5, E.rgba('#FFE2AA', 0.7 * ga));
        gl2.addColorStop(1, 'rgba(255,226,170,0)');
        L.light.save(); L.light.globalCompositeOperation = 'lighter'; L.light.fillStyle = gl2; L.light.fillRect(0, yb - 60, E.W, 120); L.light.restore();
        E.restore(L);
      }
      drips(L, lt, W.zail - 0.12, GYC);
      // "kararsız": trembling pencil contour + wobble marks beside the rocking globe
      const wk = ep(lt, tk - 0.1, tk + 0.15) * (1 - ep(lt, W.hissedip - 0.2, W.hissedip + 0.6));
      if (wk > 0.01) {
        const fr = Math.floor(lt * 12);                       // pencil boils on 12 fps "twos"
        for (let j = 0; j < 3; j++) {
          const a0 = E.hash(fr, j, 3) * E.TAU, len = 0.7 + E.hash(fr, j, 4) * 0.9;
          const rr = GR + 5 + E.hash(fr, j, 5) * 9;
          const pts = [];
          for (let k = 0; k <= 16; k++) { const an = a0 + len * k / 16; pts.push([gx + Math.cos(an) * rr, gyc + Math.sin(an) * rr]); }
          E.pencil(ink, pts, { a: 0.32 * wk, w: 1.6, double: false });
        }
        const side = Math.sign(th) || 1;
        for (const sd of [-1, 1]) {
          const strength = wk * (0.35 + 0.65 * clamp(sd * side * Math.abs(th) / 0.05));
          if (strength < 0.05) continue;
          for (let j = 0; j < 2; j++) {
            const rr = GR + 26 + j * 16, c0 = sd > 0 ? 0 : Math.PI;
            const pts = [];
            for (let k = 0; k <= 10; k++) { const an = c0 - 0.32 + 0.64 * k / 10; pts.push([gx + Math.cos(an) * rr, gyc + Math.sin(an) * rr]); }
            E.pencil(ink, pts, { a: 0.4 * strength * (1 - 0.35 * j), w: 1.8, seed: j + 4 });
          }
        }
      }
      leaves(L, lt, W.fani, gx, gyc);

      // ---- heart-light + the hand on it
      const hglow = 0.42 + 0.45 * kH + 0.12 * nod;
      PR.heartLight(L, hx2, hy2, (0.033 + 0.005 * kH - 0.01 * kO) * MH, { t: lt + HCLK, glow: hglow, pulse: 1 + kH });
      const ha = seg(kH, 0.35, 0.65) * (1 - kO);
      if (ha > 0.01) {
        // redraw the hand over the heart (clipped to a capsule around the hand) — fingers resting on it, the light
        // glowing between them
        const clip = new Path2D();
        clip.addPath(capsulePath(NH.wr, NH.tip, 0.027 * MH));
        E.save(L);
        E.alpha(L, ha);
        E.each(L, (cx) => cx.clip(clip));
        E.man.draw(L, mo);
        E.restore(L);
        E.glow(L.light, hx2, hy2, 0.07 * MH, '#FFD6CC', 0.35 * ha * (0.8 + 0.2 * Math.sin(lt * 5)));
      }
      // understanding: a soft bloom of warm light from the heart at "bildik"
      const rg = seg(lt, W.bildik - 0.1, W.bildik + 1.4);
      if (rg > 0) {
        const a = Math.sin(Math.PI * Math.min(1, rg * 1.4)) * (1 - 0.5 * rg);
        wash(p, E.blob(hx2, hy2, 120, { seed: 5, irr: 0.2 }), E.mix(P.blush, P.gamboge, 0.45), { alpha: 0.2 * a, soft: 40 });
        E.glow(L.light, hx2, hy2, 230, '#FFE2C6', 0.35 * a);
        E.save(L);
        E.alpha(L, clamp(rg * 3) * (1 - 0.3 * rg));
        E.motes(L.light, { x: hx2 - 90, y: hy2 - 260, w: 180, h: 280, n: 12, t: lt, seed: 33, color: '#FFE6CC', size: 3.2, a: 0.8, rise: 40 });
        E.restore(L);
      }

      // ---- the "hayat" label carried over from s07, fading as the world passes
      const la = 1 - ep(lt, W.zail + 0.3, W.fani + 0.2);
      if (la > 0.01) {
        E.save(L);
        E.alpha(L, la);
        E.note(ink, 'hayat', 868, 946, { size: 70, p: 1, alpha: 0.8, rot: -0.07 });
        E.arrow(ink, [834, 984], [796, 1032], { bend: -0.3, p: 1, w: 2.4, alpha: 0.62, head: 14 });
        E.restore(L);
      }
    },

    sfx(shot) {
      const W = times(shot);
      const g = (x) => x + shot.start;
      return [
        { t: g(W.hayatimiz - 0.1), type: 'sand', gain: 0.18, dur: 1.2 },
        { t: g(W.gibi - 0.1), type: 'swell', gain: 0.12, dur: 0.9 },
        { t: g(W.zail - 0.08), type: 'sand', gain: 0.3, dur: 2.6 },
        { t: g(W.zail), type: 'bloom', gain: 0.24 },
        { t: g(W.fani - 0.08), type: 'wind', gain: 0.18, dur: 1.8 },
        { t: g(W.kararsiz - 0.06), type: 'whoosh', gain: 0.14 },
        { t: g(nextBeat(W.hissedip - 0.05) - 0.02), type: 'heart', gain: 0.4 },
        { t: g(W.bildik + 0.02), type: 'chime', gain: 0.18, pitch: 0.85 },
      ];
    },
  });
})();
