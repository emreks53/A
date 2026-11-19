/* s09 · 36.70–44.65 · "Ona ait muhabbetimiz, o hususi dünyamız âyine olduğu ve temsil ettiği güzel
   nukuş-u esma-i İlahiyeye döner;"

   Opens on s08's final framing, matched exactly (same man, pose, heart, world position/size/state, same meadow
   shapes, trees and clouds), so the incoming bleed only washes the hourglass away and turns the light to evening.
     37.07 Ona            the heart-light cradled in his palm brightens and beats; he lifts his gaze to his world
     37.61 muhabbetimiz   he raises it up and out toward the world and lets it go; it floats in an arc to the world
                          and settles at its upper left; a ring of warmth spreads over the glass where the love lands
     38.73 o hususi dünyamız   the camera pushes in to the world (he leaves frame); dusk deepens into blue hour
     39.87 âyine          a silver mirror sweeps over the faded world: a convex mirror reflecting the twilight (sky,
                          warm horizon band, dusk land) with the rose heart reflected in it
     40.91 temsil ettiği  an illuminator's pencil construction is laid out on the mirror...
     42.21 güzel nukuş-u esma-i İlahiyeye  ...and gold tezhip (nakış) blooms outward from the centre
     44.03 döner          the heart turns from the world and flows INTO the golden pattern: down the diagonal tulip
                          stem, past the hatayi blossom, to the central ring (s10 continues it round the ring).
*/
(function () {
  const E = window.E;
  const P = E.P;
  const PI = Math.PI, TAU = PI * 2;
  const PR = () => E.props;
  const lerp = E.lerp, clamp = E.clamp, ep = E.ep, seg = E.seg;

  // ---------------------------------------------------------------- continuity with s08
  // s08's final camera B8 maps s08's world onto this shot's world, which equals the screen at lt = 0.
  const SH = (id, d) => E.SHOTS.find((s) => s.id === id) || d;
  const S07 = SH('s07', { start: 24.7, dur: 6.85 });
  const S08 = SH('s08', { start: 31.55 });
  const B8 = { x: 470, y: 852, z: 1.09 };
  const m8 = (x, y) => [(x - B8.x) * B8.z + 540, (y - B8.y) * B8.z + 960];
  const MAN = (() => { const q = m8(216, 1170); return { x: q[0], y: q[1], h: 700 * B8.z }; })();
  const W0 = m8(690, 1170 - 390 - 195 + 14);      // world centre (on s08's hourglass cap)
  const WR = 195 * B8.z;                           // world radius
  const PIV = m8(690, 1170 - 390 + 6);             // s08's rocking pivot (top of the cap)
  const HCLK = S07.dur + (0.15 + 2.5 - (E.T(47) - S07.start + 0.05));   // s08's heart clock offset
  const LT7 = S07.dur;                                                   // s08's idle clock offset
  // s08's parallax layers at its final camera, expressed in this shot's world
  const GK8 = 0.82, SK8 = 0.15;
  const LAY = (k) => ({ x: 540 + (B8.x - 540) * k, y: 960 + (B8.y - 960) * k, z: 1 + (B8.z - 1) * k });
  const G8 = LAY(GK8), K8 = LAY(SK8);
  const HZ8 = 925;                                 // s08 ground top (in its ground space)

  // ---------------------------------------------------------------- layout / constants
  const ZC = 1.88;                                 // close-up zoom (world radius ≈ 400 px on screen)
  const GD = 0.7, SD = 0.18;                       // parallax depths: land, sky
  const NK = 1.12;                                 // nakış radius / world radius
  const HOVER_A = E.rad(-128), HOVER_D = 1.24;     // heart hover position (angle, distance in world radii)
  const DIAG = E.rad(-135);                        // the diagonal (tulip stem) the heart flows down

  const mixc = (a, b, k) => E.mix(a, b, clamp(k));
  const bez3 = (p0, p1, p2, p3, u) => {
    const v = 1 - u;
    return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
      v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]];
  };
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
  const circlePath = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.1, r), 0, TAU); return p; };

  function times(shot) {
    const w = (i) => E.T(i) - shot.start;
    const T = { ona: w(64), muh: w(66), o: w(67), hus: w(68), ay: w(70), tem: w(73), guz: w(75), nuk: w(76), ila: w(80), don: w(81) };
    T.raise0 = T.muh - 0.12; T.raise1 = T.muh + 0.42;   // he lifts the heart up and out
    T.rel = T.muh + 0.33;                               // ...and lets it go
    T.arr = T.rel + 1.0;                                // it settles by the world
    T.low0 = T.muh + 0.72; T.low1 = T.muh + 1.5;        // his hand lowers, open
    T.push0 = T.o - 0.12; T.push1 = T.o + 1.5;          // push-in to the world
    return T;
  }

  // ---------------------------------------------------------------- s08 state (for a seamless bleed)
  function s08w() {
    const w = (i) => E.T(i) - S08.start;
    return { zail: w(59), fani: w(60), kar: w(61), his: w(62), bil: w(63) };
  }
  /** s08's camera at global time t, in this shot's world (settles to identity with a tiny breathing drift) */
  function cam08(t) {
    const W = s08w(), lt8 = t - S08.start;
    const g0 = W.kar + 0.4, g1 = W.bil + 2.2;
    const s = { x: 713, y: 913, z: 1.42 };
    const u = seg(lt8, g0, g1);
    const k = (1 - Math.pow(1 - u, 3)) * E.smooth(clamp(u / 0.24));
    const c = { x: lerp(s.x, B8.x, k) + 1.6 * E.drift(lt8 + 31, 3, 0.25), y: lerp(s.y, B8.y, k) + 1.3 * E.drift(lt8 + 31, 7, 0.22), z: lerp(s.z, B8.z, k) };
    return { x: (c.x - B8.x) * B8.z + 540, y: (c.y - B8.y) * B8.z + 960, z: c.z / B8.z };
  }
  /** s08's final pose (hand-on-heart easing into the cradle), with its idle sway */
  function pose08(t) {
    const W = s08w(), lt8 = t - S08.start, T7 = lt8 + LT7;
    const ho = E.man.pose.handOnHeart(1);
    const kO = ep(lt8, W.bil + 0.55, W.bil + 1.2, 'inOutSine');
    const nod = Math.sin(PI * seg(lt8, W.bil + 0.02, W.bil + 0.7));
    const pose = E.man.pose.stand();
    pose.lean += Math.sin(T7 * 2.0) * 0.01 + 0.03;
    pose.head = 0.06 + 0.03 * Math.sin(T7 * 0.9) + 0.06 + 0.14 * nod;
    pose.nS = lerp(0.0, ho.nS, kO); pose.nE = lerp(2.32, ho.nE, kO); pose.nW = lerp(0.86, ho.nW, kO);
    pose.head = lerp(pose.head, ho.head, kO);
    return { pose, kO };
  }
  /** s08's globe rocking on the cap (decays into the float here) */
  function th08(t) {
    const W = s08w(), lt8 = t - S08.start, tk = W.kar;
    const env = ep(lt8, tk - 0.1, tk + 0.15) * (0.22 + 0.78 * Math.exp(-1.2 * Math.max(0, lt8 - tk - 0.15)));
    return 0.085 * env * Math.sin(TAU * 1.45 * (lt8 - tk + 0.1));
  }

  // ---------------------------------------------------------------- the man's arm (same skeleton maths as E.man)
  const R = E.man.R;
  const rot2 = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)];
  function groundDy(h, Pz) {
    const hip = [0, -R.hipY * h + (Pz.hipDrop || 0) * h];
    const leg = (H, K) => { const j = [hip[0] + Math.sin(H) * R.thigh * h, hip[1] + Math.cos(H) * R.thigh * h]; const a2 = H - K; return { j, e: [j[0] + Math.sin(a2) * R.shin * h, j[1] + Math.cos(a2) * R.shin * h] }; };
    const fy = (lg, fa) => { const q1 = rot2([R.foot * h, 0.035 * h], -fa), q2 = rot2([-R.heel * h, 0.035 * h], -fa); return Math.max(lg.e[1] + q1[1], lg.e[1] + q2[1]); };
    const n = leg(Pz.nH ?? 0.02, Pz.nK ?? 0.04), f = leg(Pz.fH ?? -0.02, Pz.fK ?? 0.04);
    return -Math.max(fy(n, Pz.nF ?? 0), fy(f, Pz.fF ?? 0), n.j[1] + 0.035 * h, f.j[1] + 0.035 * h);
  }
  /** palm centre of the near hand (world coords) */
  function palm(Pz) {
    const h = MAN.h, lean = Pz.lean || 0, hd = Pz.hipDrop || 0;
    const hip = [0, -R.hipY * h + hd * h];
    const nb = [hip[0] + Math.sin(lean) * R.torso * h, hip[1] - Math.cos(lean) * R.torso * h];
    const o = rot2([-0.012 * h, 0.03 * h], lean);
    const S = [nb[0] + o[0], nb[1] + o[1]];
    const el = [S[0] + Math.sin(Pz.nS) * R.upper * h, S[1] + Math.cos(Pz.nS) * R.upper * h];
    const a2 = Pz.nS + Pz.nE;
    const wr = [el[0] + Math.sin(a2) * R.fore * h, el[1] + Math.cos(a2) * R.fore * h];
    const ha = a2 + (Pz.nW || 0);
    const dy = groundDy(h, Pz);
    return [MAN.x + wr[0] + Math.sin(ha) * R.hand * h * 0.42, MAN.y + dy + wr[1] + Math.cos(ha) * R.hand * h * 0.42];
  }

  // the gesture: cradle (s08) → raised up and out toward the world, palm up → lowered, open
  const RAISE = { nS: 1.7, nE: 0.5, nW: -0.72, fS: 0.1, fE: 0.3 };
  const OPEN = { nS: 0.3, nE: 0.78, nW: -0.28, fS: -0.02, fE: 0.18 };
  function poseAt(lt, t, T) {
    const { pose } = pose08(t);
    const kR = ep(lt, T.raise0, T.raise1, 'inOutCubic');
    const kL = ep(lt, T.low0, T.low1, 'inOutSine');
    for (const f of ['nS', 'nE', 'nW', 'fS', 'fE']) {
      pose[f] = lerp(pose[f] ?? 0, RAISE[f], kR);
      pose[f] = lerp(pose[f], OPEN[f], kL);
    }
    pose.nE += 0.35 * Math.sin(PI * kL);          // the elbow folds softly as the arm comes down
    // a small lift of the whole body as he gives it, then settling
    pose.lean += 0.025 * kR * (1 - kL) - 0.01 * kL;
    // gaze: down at the heart in his palm → up to his world → following the heart → resting on the world
    pose.head = E.tween(lt, [[T.ona - 0.05, pose.head], [T.ona + 0.55, 0.05, 'inOutSine'], [T.muh + 0.25, 0.0, 'inOutSine'],
      [T.rel + 0.45, -0.24, 'inOutSine'], [T.arr + 0.1, -0.13, 'inOutSine']]) + 0.015 * Math.sin(lt * 0.9);
    return { pose, kR, kL };
  }
  /** where the heart sits in/on his hand */
  function handHeart(lt, t, T) {
    const { pose, kR } = poseAt(lt, t, T);
    const pc = palm(pose);
    const h = MAN.h;
    return [pc[0] + lerp(-0.012, 0.006, kR) * h, pc[1] + lerp(0.004, -0.036, kR) * h];
  }

  // ---------------------------------------------------------------- world, camera
  function worldC(lt) {
    const fl = ep(lt, 0.45, 2.2, 'inOutSine');            // freed from the hourglass, it begins to float
    return [W0[0] + fl * 3 * E.drift(lt, 3, 0.4),
      W0[1] - 14 * ep(lt, 0.6, 3.4, 'inOutSine') + fl * (7 * Math.sin(lt * 1.25) + 3 * E.drift(lt, 7, 0.5))];
  }
  function camAt(lt, t, T, shot) {
    const c8 = cam08(t);
    const p = ep(lt, T.push0, T.push1, 'inOutCubic');
    const zA = c8.z * (1 + 0.03 * ep(lt, 0.8, T.push0 + 0.3, 'inOutSine'));
    const zC = ZC * (1 + 0.06 * ep(lt, T.push1 - 0.3, shot.dur, 'inOutSine'));
    const z = Math.exp(lerp(Math.log(zA), Math.log(zC), p));
    const [wx, wy] = worldC(lt);
    const sA = [(wx - c8.x) * zA + 540, (wy - c8.y) * zA + 960];
    const sC = [540 + 6 * Math.sin(lt * 0.35), 668 + 5 * Math.sin(lt * 0.27 + 1)];
    const s = [lerp(sA[0], sC[0], p), lerp(sA[1], sC[1], E.ease.inOutSine(p))];
    return { x: wx - (s[0] - 540) / z, y: wy - (s[1] - 960) / z, z, rot: 0.006 * Math.sin(lt * 0.3) * p, p };
  }
  const camD = (c, d) => ({ x: lerp(540, c.x, d), y: lerp(960, c.y, d), zoom: Math.pow(c.z, d), rot: c.rot * d });
  /** enter s08's layer space (k = its parallax factor) inside the current camera */
  const into8 = (L, Lk) => { E.translate(L, 540, 960); E.scale(L, Lk.z); E.translate(L, -Lk.x, -Lk.y); };

  // ---------------------------------------------------------------- sky
  const SKY8 = [E.shade(P.cerulean, 0.42), E.shade(P.skyWash, 0.58), E.shade(P.gamboge, 0.62), E.shade(P.blush, 0.55), E.shade(P.terracotta, 0.62)];
  const SKY8Y = [-139.2, 280.8, 630.8, 980.8, 1260.8];
  const SKYTW = ['#5B6DA7', '#7D8DC1', '#B2B0D1', '#E4C6C0', '#EFCCB4'];
  function sky(L, k, lt, T7, cam, hy, push) {
    const c = L.paint;
    E.resetCamera(L);
    // graded wash (s08's golden-hour gradient deepening into blue hour; the warm band stays just above the hills)
    const twY = [-139.2, 300, hy - 430, hy - 150, hy + 30];
    const y0 = -140, y1 = 2000;
    const g = c.createLinearGradient(0, y0, 0, y1);
    for (let i = 0; i < 5; i++) g.addColorStop(clamp((lerp(SKY8Y[i], twY[i], k) - y0) / (y1 - y0)), mixc(SKY8[i], SKYTW[i], k));
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.fillStyle = g;
    c.fillRect(0, 0, E.W, E.H);
    c.restore();
    // sky layer (parallax), in s08's sky space
    E.camera(L, camD(cam, SD));
    into8(L, K8);
    // s08's golden blooms fade; blue-hour blooms gather (slowly breathing)
    const b8 = [[160, 260, 280, E.shade(P.cerulean, 0.35), 0.22], [930, 160, 230, E.shade(P.ultramarine, 0.55), 0.15], [700, 760, 320, E.shade(P.gamboge, 0.4), 0.28], [260, 880, 260, E.shade(P.rose, 0.66), 0.19]];
    b8.forEach(([x, y, r, col, a]) => rbloom(c, x, y, r * 1.15, col, a * (1 - k)));
    const bt = [[120, 160, 420, '#4F62A0', 0.34], [960, 300, 380, '#5D63A0', 0.3], [560, -60, 520, '#5068A8', 0.3],
      [880, 760, 300, '#9F92BE', 0.2], [180, 820, 280, '#A897BF', 0.18], [520, 980, 360, '#E9BFA6', 0.22]];
    bt.forEach(([x, y, r, col, a], i) => rbloom(c, x + 16 * E.drift(lt, 20 + i, 0.15), y + 10 * E.drift(lt, 40 + i, 0.15), r, col, a * k, 0.82));
    // a few hard drying edges of a real sky wash
    [[230, 170, 200, 51, 0.5], [820, 560, 160, 52, 0.4], [380, 700, 140, 53, 0.35]].forEach(([x, y, r, sd, a]) =>
      E.wash(c, E.blob(x, y, r, { seed: sd, irr: 0.32, ry: r * 0.6 }), '#56679F', { alpha: (0.03 + 0.07 * k) * a * 2 }));
    // s08's two clouds keep drifting; the left one dissolves into the twilight during the push
    const cdx = T7 * 5;
    PR().cloud(L, 870 + cdx, 330, 300, { seed: 5, t: T7, tone: 'dusk', alpha: 0.85 });
    const bA = 0.7 * (1 - ep(push, 0.12, 0.55, 'inOutSine'));
    if (bA > 0.01) PR().cloud(L, 110 + cdx * 0.7, 520, 210, { seed: 8, t: T7, tone: 'dusk', alpha: bA });
    // blue hour veils the clouds too
    E.resetCamera(L);
    if (k > 0) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      const vg = c.createLinearGradient(0, 0, 0, hy);
      vg.addColorStop(0, E.rgba('#AEB2D6', 0.55 * k));
      vg.addColorStop(0.7, E.rgba('#C9C3DE', 0.32 * k));
      vg.addColorStop(1, E.rgba('#E6D2D2', 0.1 * k));
      c.fillStyle = vg;
      c.fillRect(0, 0, E.W, Math.max(0, hy + 40));
      c.restore();
    }
    // s08's warm light from the upper left fades with the day
    E.glow(L.light, 90, 140, 760, '#FFE2AE', 0.26 * (1 - k));
  }

  // ---------------------------------------------------------------- land (s08's meadow, cooling into blue hour)
  function land(L, k, T7, cam) {
    const p = L.paint;
    E.camera(L, camD(cam, GD));
    into8(L, G8);
    const HZ = HZ8;
    PR().ground(L, HZ, { palette: 'spring', t: T7, seed: 5, flowers: 0.4, trees: 0.55, x0: -700, x1: 1800, bottom: HZ + 1500 });
    // s08's golden-hour treatment (far hills lavender-rose, warm light on the meadow) — fades with the day
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
    if (k < 1) {
      p.save();
      p.globalCompositeOperation = 'screen';
      p.globalAlpha *= 1 - k;
      const sg = p.createLinearGradient(0, HZ + 60, 0, HZ + 1000);
      sg.addColorStop(0, 'rgba(120,78,24,0)');
      sg.addColorStop(0.18, 'rgba(120,78,24,0.36)');
      sg.addColorStop(0.6, 'rgba(116,80,30,0.46)');
      sg.addColorStop(1, 'rgba(110,86,52,0.52)');
      p.fillStyle = sg;
      p.fillRect(-800, HZ + 60, 2700, 1900);
      p.restore();
      E.wash(p, E.rrect(-800, HZ - 70, 2700, 1900, 0), P.gamboge, { alpha: 0.16 * (1 - k) });
    }
    PR().tree(L, 112, 1078, 124, { kind: 'round', t: T7, seed: 3, color: '#93A96C', shadow: 0.5 });
    PR().tree(L, 1036, 1084, 158, { kind: 'cypress', t: T7, seed: 4, color: '#728F63', shadow: 0.5 });
    // blue hour: a lavender veil over the land, deepening toward the foreground (calm behind the subtitles)
    if (k > 0) {
      const r = E.rrect(-800, HZ - 70, 2700, 1900, 0);
      E.wash(p, r, '#8E90BE', { alpha: 0.5 * k, grad: { from: [0, HZ - 50], to: [0, HZ + 700], stops: [[0, 'rgba(142,144,190,0)'], [0.07, 'rgba(142,144,190,0.85)'], [0.45, 'rgba(150,146,192,1)'], [1, 'rgba(160,150,190,1)']] } });
      E.wash(p, r, '#56649C', { alpha: 0.42 * k, grad: { from: [0, HZ + 40], to: [0, HZ + 900], stops: [[0, 'rgba(86,100,156,0)'], [0.4, 'rgba(86,100,156,0.55)'], [1, 'rgba(70,84,140,1)']] } });
    }
  }

  // ---------------------------------------------------------------- the mirror
  /** the swept part of the globe (the prop's sheen front runs along the diagonal from the upper left) */
  function sweepClip(x, y, R, mir) {
    const pos = lerp(-150, 150, E.ease.inOutSine(clamp(mir))) * R / 100;
    const c = Math.SQRT1_2, big = 4 * R;
    const bx = x + pos * c, by = y + pos * c;
    const hp = new Path2D();
    hp.moveTo(bx + c * big, by - c * big);
    hp.lineTo(bx - c * big, by + c * big);
    hp.lineTo(bx - 2 * c * big, by);
    hp.lineTo(bx, by - 2 * c * big);
    hp.closePath();
    return { hp, bx, by };
  }
  /** the faded world becomes a convex MIRROR reflecting the blue hour: sky above, a warm horizon band, the dusk
      land below, a fresnel rim and paper highlights. Covers the landscape to a faint ghost. (Same as s10's.) */
  function mirrorBody(L, x, y, R, mir, ghost) {
    if (mir <= 0.001) return;
    const p = L.paint;
    const disc = circlePath(x, y, R * 0.99);
    const sw = mir < 0.999 ? sweepClip(x, y, R, mir) : null;
    // the landscape's pencil lines fade under the silver
    L.ink.save();
    L.ink.globalCompositeOperation = 'destination-out';
    L.ink.globalAlpha = 0.8 * (1 - ghost);
    L.ink.clip(circlePath(x, y, R * 0.93));
    if (sw) L.ink.clip(sw.hp);
    L.ink.fillRect(x - R, y - R, 2 * R, 2 * R);
    L.ink.restore();
    p.save();
    p.clip(disc);
    if (sw) p.clip(sw.hp);
    const a0 = p.globalAlpha;
    // silver veil
    const g1 = p.createLinearGradient(x - R * 0.7, y - R * 0.7, x + R * 0.7, y + R * 0.7);
    g1.addColorStop(0, '#F4F5F8'); g1.addColorStop(0.5, '#DCE0E9'); g1.addColorStop(1, '#BFC6D5');
    p.globalCompositeOperation = 'source-over';
    p.globalAlpha = a0 * (1 - ghost);
    p.fillStyle = g1;
    p.fill(disc);
    // reflected environment
    p.globalCompositeOperation = 'multiply';
    p.globalAlpha = a0;
    const hy = y + 0.2 * R, bow = 0.24 * R;
    // one continuous reflected environment: twilight sky above, a pale warm horizon, the dusk land below
    const ge = p.createLinearGradient(0, y - R, 0, y + R);
    ge.addColorStop(0, '#7085BC'); ge.addColorStop(0.34, '#A0ABD2'); ge.addColorStop(0.57, '#D9D0E0');
    ge.addColorStop(0.66, '#C8C1D7'); ge.addColorStop(0.82, '#959BBA'); ge.addColorStop(1, '#717BA1');
    p.globalAlpha = a0 * 0.6;
    p.fillStyle = ge;
    p.fill(disc);
    // the warm horizon reflected: a soft lens-shaped streak bowing with the sphere, thinning toward the rim
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
    // fresnel rim: the mirror darkens toward its edge
    const rg = p.createRadialGradient(x - 0.1 * R, y - 0.12 * R, R * 0.62, x, y, R);
    rg.addColorStop(0, 'rgba(84,96,140,0)');
    rg.addColorStop(1, 'rgba(84,96,140,0.5)');
    p.globalAlpha = a0;
    p.fillStyle = rg;
    p.fill(disc);
    // paper highlights: window, glint, two diagonal gleams, rim light
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
    // a soft rim of reflected light on the lower right
    const rl = p.createRadialGradient(x - 0.25 * R, y - 0.25 * R, R * 1.05, x - 0.25 * R, y - 0.25 * R, R * 1.25);
    rl.addColorStop(0, 'rgba(255,255,255,0)'); rl.addColorStop(0.5, 'rgba(255,250,242,0.5)'); rl.addColorStop(1, 'rgba(255,255,255,0)');
    p.globalAlpha = a0 * 0.6;
    p.fillStyle = rl;
    p.fill(disc);
    p.restore();
    // the sheen's bright front while it sweeps
    if (sw) {
      const c = Math.SQRT1_2, s = (1 - mir) * 0.9 + 0.1;
      L.light.save();
      L.light.clip(disc);
      L.light.globalCompositeOperation = 'lighter';
      L.light.strokeStyle = E.rgba('#FFFFFF', 0.55 * s);
      L.light.lineWidth = 0.025 * R;
      L.light.beginPath();
      L.light.moveTo(sw.bx + c * 2 * R, sw.by - c * 2 * R); L.light.lineTo(sw.bx - c * 2 * R, sw.by + c * 2 * R);
      L.light.stroke();
      L.light.restore();
    }
  }

  // ---------------------------------------------------------------- heart path
  const hoverPos = (lt) => {
    const [wx, wy] = worldC(lt);
    const a = HOVER_A + 0.05 * Math.sin(lt * 0.9);
    const d = HOVER_D * WR + 6 * Math.sin(lt * 1.7);
    return [wx + Math.cos(a) * d, wy + Math.sin(a) * d];
  };
  const FLOW_DUR = 0.85;
  /** the flow path (relative to the world centre): a swoop from the hover point onto the diagonal just outside the
      tulip, then straight down the tulip stem, past the hatayi blossom, to the central ring. Arc-length sampled. */
  function flowGeom(shot) {
    const d0 = E.T(81) - shot.start - 0.1;
    const H = hoverPos(d0), c = worldC(d0);
    const p0 = [H[0] - c[0], H[1] - c[1]];
    const u = [Math.cos(DIAG), Math.sin(DIAG)];
    const at = (k) => [u[0] * k * WR, u[1] * k * WR];
    const p1 = at(0.84 * NK), p3 = at(0.177 * NK);
    const cq = at(1.0 * NK), ctl = [(cq[0] + p0[0]) / 2, (cq[1] + p0[1]) / 2];
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const v = i / 24, w = 1 - v;
      pts.push([w * w * p0[0] + 2 * w * v * ctl[0] + v * v * p1[0], w * w * p0[1] + 2 * w * v * ctl[1] + v * v * p1[1]]);
    }
    for (let i = 1; i <= 30; i++) { const v = i / 30; pts.push([p1[0] + (p3[0] - p1[0]) * v, p1[1] + (p3[1] - p1[1]) * v]); }
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, cum, tot: cum[cum.length - 1], s1: cum[24], marks: [0.79 * NK, 0.43 * NK].map((k) => { const q = at(k); return { q, s: cum[24] + Math.hypot(q[0] - p1[0], q[1] - p1[1]) }; }) };
  }
  function flowAt(F, sLen) {
    const { pts, cum } = F;
    if (sLen <= 0) return pts[0];
    for (let i = 1; i < pts.length; i++) if (cum[i] >= sLen) {
      const f = (sLen - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f];
    }
    return pts[pts.length - 1];
  }
  /** luminous gold thread along the flow path up to the heart (the pattern it passes is lit and stays lit) */
  function flowThread(L, lt, shot, cx, cy) {
    const d0 = E.T(81) - shot.start - 0.1;
    if (lt <= d0) return;
    const F = flowGeom(shot);
    const head = E.ease.inOutCubic(seg(lt, d0, d0 + FLOW_DUR)) * F.tot;
    if (head <= F.s1) return;
    const pts = [];
    for (let i = 24; i < F.pts.length && F.cum[i] <= head; i++) pts.push([cx + F.pts[i][0], cy + F.pts[i][1]]);
    const hp = flowAt(F, head);
    pts.push([cx + hp[0], cy + hp[1]]);
    const c = L.light;
    for (const m of F.marks) {
      const k = clamp((head - m.s) / 30);
      if (k > 0) E.glow(c, cx + m.q[0], cy + m.q[1], 46 + 20 * k, '#FFDDA0', 0.42 * k);
    }
    if (pts.length < 2) return;
    const n = pts.length;
    const CH = Math.min(6, n - 1);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.lineCap = 'round';
    c.lineJoin = 'round';
    for (let k = 0; k < CH; k++) {
      const i0 = Math.floor((k * (n - 1)) / CH), i1 = Math.floor(((k + 1) * (n - 1)) / CH);
      if (i1 <= i0) continue;
      const f = Math.pow((k + 1) / CH, 1.4);
      const p = new Path2D();
      p.moveTo(pts[i0][0], pts[i0][1]);
      for (let i = i0 + 1; i <= i1; i++) p.lineTo(pts[i][0], pts[i][1]);
      c.strokeStyle = E.rgba('#FFC27A', 0.06 + 0.16 * f); c.lineWidth = 11; c.stroke(p);
      c.strokeStyle = E.rgba('#FFDDA6', 0.16 + 0.32 * f); c.lineWidth = 3.6; c.stroke(p);
      c.strokeStyle = E.rgba('#FFF4DC', 0.2 + 0.46 * f); c.lineWidth = 1.5; c.stroke(p);
    }
    c.restore();
  }

  /** heart state at lt: position, size, rotation (world coordinates) */
  function heartAt(lt, t, shot, T) {
    const t0 = t - lt;
    let pos, r;
    const r0 = (0.038 - 0.01 * pose08(t).kO) * 700 * B8.z;   // s08's cradled size
    if (lt < T.rel) {
      pos = handHeart(lt, t, T);
      r = r0 + 3 * ep(lt, T.raise0, T.rel);
    } else {
      const u = seg(lt, T.rel, T.arr);
      const e = E.ease.inOutSine(u);
      const P0 = handHeart(T.rel, t0 + T.rel, T);
      const H = hoverPos(lt);
      pos = bez3(P0, [P0[0] + 10, P0[1] - 160], [H[0] - 130, H[1] - 45], H, e);
      pos[0] += 8 * Math.sin(u * PI) * Math.sin(lt * 3.1);
      r = lerp(r0 + 3, 34, E.ease.outCubic(u));
      if (u >= 1) { pos = [H[0] + 2 * Math.sin(lt * 2.1), H[1] + 3 * Math.sin(lt * 1.6)]; r = 34; }
    }
    // döner: turn and flow down the diagonal into the patterns
    const d0 = T.don - 0.1;
    if (lt > d0) {
      const [wx, wy] = worldC(lt);
      const F = flowGeom(shot);
      const u = seg(lt, d0, d0 + FLOW_DUR);
      const q = flowAt(F, E.ease.inOutCubic(u) * F.tot);
      pos = [wx + q[0], wy + q[1]];
      r = lerp(34, 19, E.ease.inOutSine(u));
    }
    const fu = seg(lt, T.rel, T.arr);
    const rotv = -0.2 * Math.sin(fu * PI) + (lt > d0 ? 0.35 * Math.sin(seg(lt, d0, d0 + 0.85) * PI) : 0) + 0.04 * Math.sin(lt * 1.3);
    return { pos, r, rot: rotv };
  }

  /** soft glowing comet trail behind the heart: a fading string of light along its own recent path */
  function trail(L, lt, t, shot, T, from, span, { width = 10, col = '#FFD9C9', a = 0.6 } = {}) {
    const n = 14;
    const pts = [];
    for (let i = 0; i <= n; i++) { const tt = Math.max(from, lt - span * (1 - i / n)); pts.push(heartAt(tt, t - lt + tt, shot, T).pos); }
    if (Math.hypot(pts[n][0] - pts[0][0], pts[n][1] - pts[0][1]) < 4) return;
    for (let i = 0; i < n; i++) {
      const f = (i + 1) / n;
      E.glow(L.light, pts[i][0], pts[i][1], width * (1 + 2.2 * f), col, a * f * f * 0.55);
    }
  }

  /** a 4-point glint (light layer) */
  function glint(ctx, x, y, s, a, rotA = 0) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.rotate(rotA);
    for (const [w, h] of [[s, s * 0.07], [s * 0.07, s], [s * 0.5, s * 0.045]]) {
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
    E.glow(ctx, x, y, s * 0.5, '#F4F8FF', a * 0.45);
  }

  // ---------------------------------------------------------------- pencil construction geometry on the mirror
  function construction(L, cx, cy, p, fade) {
    if (p <= 0 || fade <= 0) return;
    const RR = WR * NK;
    const a = 0.3 * fade;
    const ink = L.ink;
    ink.save();
    ink.beginPath(); ink.arc(cx, cy, WR * 0.985, 0, TAU); ink.clip();
    for (let i = 0; i < 4; i++) {
      const ang = (i * PI) / 4;
      const q = clamp(p * 1.6 - i * 0.12);
      if (q <= 0) continue;
      const L1 = RR * 1.05 * E.ease.outCubic(q);
      E.pencil(ink, [[cx - Math.cos(ang) * L1, cy - Math.sin(ang) * L1], [cx + Math.cos(ang) * L1, cy + Math.sin(ang) * L1]], { a, w: 1.0, seed: 40 + i, jitter: 0.8 });
    }
    [[0.177, 0.15], [0.36, 0.35], [0.43, 0.5], [0.88, 0.62]].forEach(([k, d], i) => {
      const q = clamp((p - d) / 0.35);
      if (q <= 0) return;
      const pth = new Path2D();
      const a0 = -PI / 2 + i;
      pth.arc(cx, cy, RR * k, a0, a0 + TAU * E.ease.outCubic(q));
      E.pencil(ink, pth, { a: a * 0.9, w: 0.9, seed: 50 + i, jitter: 0.7 });
    });
    ink.restore();
  }

  // ---------------------------------------------------------------- the shot
  E.scene('s09', {
    draw(L, lt, t, shot) {
      const T = times(shot);
      const T7 = (t - S08.start) + LT7;
      const cam = camAt(lt, t, T, shot);
      const dusk = ep(lt, T.o - 0.25, T.ay + 0.6, 'inOutSine');

      // horizon on screen (for the sky's warm band)
      const gc = camD(cam, GD);
      const hy = ((HZ8 - G8.y) * G8.z + 960 - gc.y) * gc.zoom + 960;

      // ---- sky + land
      sky(L, dusk, lt, T7, cam, hy, cam.p);
      land(L, dusk, T7, cam);
      // s08's cool veil over the background, thinning as blue hour takes over
      E.resetCamera(L);
      L.paint.save();
      L.paint.globalCompositeOperation = 'multiply';
      L.paint.fillStyle = E.rgba('#CEC8DA', 0.42 * (1 - 0.55 * dusk));
      L.paint.fillRect(0, 0, E.W, E.H);
      L.paint.restore();

      // ---- the man (subject plane)
      E.camera(L, camD(cam, 1));
      const ps = poseAt(lt, t, T);
      const manRight = (MAN.x + 0.36 * MAN.h - cam.x) * cam.z + 540;
      if (manRight > -20) {
        E.man.shadow(L, MAN.x + 14, MAN.y, MAN.h, 0.32 * (1 - 0.4 * dusk));
        E.man.draw(L, { x: MAN.x, y: MAN.y, h: MAN.h, view: 'side', facing: 1, pose: ps.pose });
      }

      // ---- the personal world
      const [wx, wy] = worldC(lt);
      const H = heartAt(lt, t, shot, T);
      const warm = ep(lt, T.arr - 0.15, T.arr + 0.8, 'inOutSine');
      const mir = ep(lt, T.ay - 0.12, T.ay + 0.9, 'inOutSine');
      const tilt = ep(lt, T.don - 0.1, T.don + 0.5);
      // soft shadow of the floating world on the meadow
      E.wash(L.paint, E.blob(wx + 26, MAN.y - 2, 110, { rx: 118, ry: 13, seed: 4, irr: 0.05 }), '#6F6A86', { alpha: 0.13 * (1 - dusk), soft: 14 });
      const th = th08(t) * (1 - ep(lt, 0.2, 1.1, 'inOutSine'));
      E.save(L);
      if (Math.abs(th) > 1e-5) { E.translate(L, PIV[0], PIV[1]); E.rotate(L, th); E.translate(L, -PIV[0], -PIV[1]); }
      const diss = 0.66 - 0.1 * warm;
      PR().personalWorld(L, wx, wy, WR, {
        t: T7, kind: 'home', life: 1 - 0.7 * diss, dissolve: diss,
        flicker: 0.38 * (1 - ep(lt, 0.45, 1.6, 'inOutSine')),
        glow: 0.07 + 0.45 * warm * (1 - 0.6 * mir) + 0.12 * mir, mirror: mir,
      });
      E.restore(L);
      const disc = circlePath(wx, wy, WR * 0.985);
      const rev = E.tween(lt, [[T.tem - 0.05, 0], [T.guz - 0.1, 0.3, 'inOutSine'], [T.ila - 0.1, 0.74, 'inOutSine'], [T.ila + 0.55, 1, 'outCubic']]);
      mirrorBody(L, wx, wy, WR, mir, 0.3 - 0.18 * rev);

      // the touch: when the love reaches the world, a ring of warmth spreads over the glass from the contact point
      {
        const u = seg(lt, T.arr - 0.2, T.arr + 1.05);
        if (u > 0 && u < 1) {
          const dx = H.pos[0] - wx, dy = H.pos[1] - wy, dl = Math.hypot(dx, dy) || 1;
          const cx = wx + (dx / dl) * WR, cy = wy + (dy / dl) * WR;
          const Lc = L.light, Pc = L.paint;
          Lc.save(); Lc.clip(disc); Lc.globalCompositeOperation = 'lighter';
          Pc.save(); Pc.clip(disc); Pc.globalCompositeOperation = 'multiply';
          for (const [lag, wd] of [[0, 9], [0.18, 5]]) {
            const v = clamp((u - lag) / (1 - lag));
            if (v <= 0) continue;
            const rr = 8 + E.ease.outCubic(v) * WR * 1.5, k = Math.sin(v * PI) * (1 - 0.4 * lag);
            Lc.strokeStyle = E.rgba('#FFE0C8', 0.42 * k);
            Lc.lineWidth = wd;
            Lc.beginPath(); Lc.arc(cx, cy, rr, 0, TAU); Lc.stroke();
            Pc.strokeStyle = E.rgba('#E7A98F', 0.3 * k);
            Pc.lineWidth = wd * 1.4;
            Pc.beginPath(); Pc.arc(cx, cy, rr, 0, TAU); Pc.stroke();
          }
          Pc.restore(); Lc.restore();
        }
      }
      // the mirror catches the light: a sparkle where the sheen finishes
      {
        const g = ep(lt, T.ay + 0.45, T.ay + 0.75, 'outCubic') * (1 - ep(lt, T.ay + 0.8, T.ay + 1.5, 'inOutSine'));
        if (g > 0) glint(L.light, wx + WR * 0.42, wy + WR * 0.36, WR * 0.55, 0.85 * g, 0.3);
      }

      // the rose heart reflected in the convex mirror (compressed toward the rim), until it dives in
      if (mir > 0.02) {
        const ra = (1 - ep(lt, T.don - 0.1, T.don + 0.35)) * ep(lt, T.ay + 0.1, T.ay + 0.7);
        if (ra > 0.01) {
          const dx = H.pos[0] - wx, dy = H.pos[1] - wy, dl = Math.hypot(dx, dy) || 1;
          const rx = wx + (dx / dl) * WR * 0.6, ry = wy + (dy / dl) * WR * 0.6;
          const ang = Math.atan2(dy, dx);
          E.save(L);
          E.each(L, (c) => c.clip(disc));
          E.translate(L, rx, ry); E.rotate(L, ang); E.scale(L, 0.62, 1); E.rotate(L, -ang); E.translate(L, -rx, -ry);
          PR().heartLight(L, rx, ry, H.r * 0.42, { t: lt, glow: 0.55, rot: H.rot + PI * 0.04, opaque: false, alpha: 0.85 * ra });
          E.restore(L);
        }
      }

      // pencil construction → gold nakış blooming outward
      const cons = ep(lt, T.tem - 0.25, T.tem + 0.75, 'outCubic');
      construction(L, wx, wy, cons, 1 - 0.55 * rev);
      if (rev > 0) PR().nakis(L, wx, wy, WR * NK, { reveal: rev, t: lt, glow: 0.5, clip: disc });
      // a glass gleam over the gold (keeps it a mirror)
      if (mir > 0.2) {
        E.save(L);
        E.each(L, (c) => c.clip(disc));
        const gl = new Path2D();
        gl.ellipse(wx - WR * 0.44, wy - WR * 0.5, WR * 0.36, WR * 0.11, -0.66, 0, TAU);
        E.lift(L.paint, gl, 0.3 * mir, 6);
        E.restore(L);
      }

      // ---- the heart-light
      const relA = lt > T.rel - 0.05;
      if (relA) trail(L, lt, t, shot, T, T.rel, 0.45, { width: 10, a: 0.55 });
      flowThread(L, lt, shot, wx, wy);
      // "Ona": it brightens in his palm with one strong beat
      const ona = seg(lt, T.ona - 0.08, T.ona + 0.9);
      const flare = ona > 0 && ona < 1 ? Math.exp(-Math.pow((ona - 0.12) / 0.09, 2)) * 0.9 + Math.exp(-Math.pow((ona - 0.34) / 0.1, 2)) * 0.5 : 0;
      const bright = ep(lt, T.ona - 0.1, T.ona + 0.3, 'outSine');
      const glowA = clamp(0.87 + 0.13 * bright) * (1 - 0.2 * tilt);
      E.glow(L.light, H.pos[0], H.pos[1], H.r * (4.2 + 1.5 * flare), '#FFC6BE', (0.26 + 0.18 * bright + 0.3 * flare) * (1 - 0.45 * tilt));
      PR().heartLight(L, H.pos[0], H.pos[1], H.r * (1 + 0.07 * flare), { t: t - S08.start + HCLK, glow: glowA, rot: H.rot, pulse: 2 - ep(lt, T.rel, T.arr) });
      // when the love reaches the world it warms it (soft rose-gold halo on the near side)
      if (warm > 0) E.glow(L.light, wx - WR * 0.5, wy - WR * 0.55, WR * 1.1, '#FFD6B8', 0.18 * warm * (1 - 0.5 * mir));
      // the light the heart pours into the patterns
      if (tilt > 0) E.glow(L.light, H.pos[0], H.pos[1], WR * 0.35, '#FFE0A8', 0.14 * tilt);
    },

    sfx(shot) {
      const T = times(shot), g = (x) => x + shot.start;
      return [
        { t: g(T.ona - 0.06), type: 'heart', gain: 0.38 },
        { t: g(T.rel - 0.15), type: 'swell', gain: 0.32, dur: 1.4 },
        { t: g(T.arr - 0.06), type: 'bloom', gain: 0.28 },
        { t: g(T.push0 + 0.1), type: 'whoosh', gain: 0.14 },
        { t: g(T.ay - 0.08), type: 'sparkle', gain: 0.3 },
        { t: g(T.ay + 0.45), type: 'chime', gain: 0.2, pitch: 1.5 },
        { t: g(T.tem - 0.2), type: 'pen', gain: 0.15, dur: 0.9 },
        { t: g(T.tem + 0.4), type: 'grow', gain: 0.2, dur: 3.1 },
        { t: g(T.nuk - 0.05), type: 'chime', gain: 0.17, pitch: 1.2 },
        { t: g(T.don - 0.12), type: 'whoosh', gain: 0.2 },
        { t: g(T.don + 0.1), type: 'sparkle', gain: 0.2 },
      ];
    },
  });
})();
