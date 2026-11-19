/* s03 · 5.85–10.35 (+0.7 zoom tail) · "Şu dünyadan her birimize birer dünya var, birer âlemimiz var."
   The big world floats in the warm sky. "dünyadan" 6.28: five glowing drops bead on its underside, pinch off and
   fall free (each already tinted with the world it will become) · the camera follows them down; "her birimize"
   6.82: five people are sketched in pencil and painted in on a gentle crescent of meadow (the man in the centre,
   a little forward; the outer two in profile, turned inward, looking up and reaching) · "birer dünya" 7.52: each
   drop settles above its person, swells and its landscape fills in from the bottom (field · sea · HOME · city ·
   orchard) · "var" 8.20 they settle · "birer âlemimiz var" 8.88: the worlds warm into glowing realms and come alive
   (smoke, birds, waves); the man lays a hand on his heart; the camera eases toward his world, which sits exactly at
   the s04 zoom centre (540, 760) with screen radius 88·e^(0.16·(lt−4.5)) from lt 4.5 on (s04 matches this).

   NOTE (engine bug, worked around here): E.softFill / E.wash{soft} / E.bloom / E.man.shadow are displaced by
   ≈ 20000·(scale − 1) px on GPU canvases whenever the transform is scaled (camera zoom ≠ 1). soft() below bakes the
   transform into the path and draws the blurred shadow under the identity transform instead. */
(function () {
  const E = window.E;
  const PR = E.props;
  const P = E.P;
  const TAU = Math.PI * 2;

  // ------------------------------------------------------------------------------------------ layout (people plane)
  const BW = { x: 540, y: 360, r: 178 };                 // big world (depth DW)
  const DW = 0.85;
  const GROUND_Y = 905;                                   // top of the far hills (depth 1)
  // left → right. f = feet y, h = height, r = personal-world radius, o = order (centre first)
  const PEOPLE = [
    { x: 134, f: 1122, h: 262, r: 62, kind: 'field', seed: 3, ang: 2.42, view: 'side', facing: 1, o: 3, tint: '#E0B45C',
      col: { coat: '#B4704F', coatShadow: '#8A4E36', trousers: '#8D8578', hair: '#9A9590', skin: '#E4B694', skinShadow: '#C99272' } },
    { x: 338, f: 1164, h: 296, r: 72, kind: 'sea', seed: 2, ang: 2.0, view: 'front', o: 1, tint: '#86AED6',
      col: { coat: '#5E8C68', coatShadow: '#41664B', trousers: '#B4A07E', hair: '#2E2420', skin: '#C99272', skinShadow: '#A87257' } },
    { x: 540, f: 1214, h: 338, r: 88, kind: 'home', seed: 1, ang: 1.5708, view: 'front', o: 0, tint: '#A7C277', man: true },
    { x: 742, f: 1164, h: 292, r: 72, kind: 'city', seed: 2, ang: 1.14, view: 'front', o: 2, tint: '#D29A78',
      col: { coat: '#C29B45', coatShadow: '#93732E', trousers: '#6F6C7C', hair: '#6B4A30', skin: '#EAC2A2', skinShadow: '#CF9C7C' } },
    { x: 946, f: 1122, h: 258, r: 62, kind: 'orchard', seed: 2, ang: 0.72, view: 'side', facing: -1, o: 4, tint: '#8DB46A',
      col: { coat: '#86607F', coatShadow: '#5F4159', trousers: '#A8977A', hair: '#4A3528', skin: '#D9A882', skinShadow: '#B98462' } },
  ];
  PEOPLE.forEach((p) => {
    p.head = p.f - p.h;
    p.bx = p.view === 'side' ? p.x + p.facing * 0.17 * p.h : p.x;     // resting centre of the personal world
    p.by = p.head - (p.view === 'side' ? 16 : 24) - p.r;
  });
  const MAN = PEOPLE[2];
  const BACK_TO_FRONT = [0, 4, 1, 3, 2];
  const DROP_R = 13;                                      // drop radius at birth (DW plane units)

  // ------------------------------------------------------------------------------------------ timing (local s)
  let TT = null;
  const tm = (shot) => {
    if (TT) return TT;
    const L0 = (i) => E.T(i) - shot.start;
    TT = {
      su: L0(11), dunyadan: L0(12), her: L0(13), birimize: L0(14), birer: L0(15), dunya: L0(16), var1: L0(17),
      birer2: L0(18), alem: L0(19), var2: L0(20), end: shot.dur,
    };
    return TT;
  };

  // ------------------------------------------------------------------------------------------ soft paint (see NOTE)
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
  const circle = (x, y, r) => { const p = new Path2D(); p.arc(x, y, Math.max(0.1, r), 0, TAU); return p; };
  const bloom = (ctx, x, y, r, color, alpha, blur, seed = 3, irr = 0.25) => soft(ctx, E.blob(x, y, r, { seed, irr }), color, alpha, blur);
  const manShadow = (L, x, y, h, a, w = 1) =>
    soft(L.paint, E.blob(x, y, h * 0.12 * w, { rx: h * 0.13 * w, ry: h * 0.018, irr: 0.05, seed: 2 }), '#8F8C9C', a, h * 0.012);
  const bump = (t, a, b) => Math.sin(Math.PI * E.seg(t, a, b));

  // ------------------------------------------------------------------------------------------ camera
  const herm = (t, K) => {
    if (t <= K[0][0]) return K[0][1] + K[0][2] * (t - K[0][0]);
    for (let i = 1; i < K.length; i++) {
      if (t <= K[i][0]) {
        const [t0, v0, d0] = K[i - 1], [t1, v1, d1] = K[i];
        const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
        return (2 * s3 - 3 * s2 + 1) * v0 + (s3 - 2 * s2 + s) * h * d0 + (-2 * s3 + 3 * s2) * v1 + (s3 - s2) * h * d1;
      }
    }
    const k = K[K.length - 1];
    return k[1] + k[2] * (t - k[0]);
  };
  const ZK = 0.16;                                        // push-in rate (log zoom / s) into the zoom transition
  const FCy = (z) => MAN.by + 200 / z;                    // focus y that puts the man's world at screen y 760
  function cam(lt, T) {
    if (lt >= 4.5) { const z = Math.exp(ZK * (lt - 4.5)); return { x: 540, y: FCy(z), z }; }
    const t0 = 0.4, t1 = 1.45;                            // the tilt down with the falling drops
    const y = herm(lt, [[0, 478, -14], [t0, 472, 0], [t1, 940, 4], [3.1, 947, 0], [4.5, FCy(1), -200 * ZK]]);
    const lz = herm(lt, [[0, Math.log(1.405), 0.04], [t0, Math.log(1.42), 0], [t1, Math.log(0.95), -0.01], [3.1, Math.log(0.935), 0.02], [4.5, 0, ZK]]);
    const dk = 1 - E.ep(lt, 3.6, 4.4);                    // handheld drift dies away before the zoom
    return { x: 540 + 4 * E.drift(lt, 3, 0.4) * dk, y: y + 3 * E.drift(lt, 7, 0.35) * dk, z: Math.exp(lz) * (1 + 0.005 * E.drift(lt, 11, 0.3) * dk) };
  }
  /** camera at parallax depth d (1 = people plane, < 1 farther, > 1 nearer) */
  const camD = (c, d) => ({ z: Math.max(0.2, 1 + (c.z - 1) * d), fx: E.lerp(540, c.x, d), fy: E.lerp(960, c.y, d) });
  function apply(L, c, d) {
    const q = camD(c, d);
    for (const k of ['paint', 'ink', 'light']) L[k].setTransform(q.z, 0, 0, q.z, 540 - q.fx * q.z, 960 - q.fy * q.z);
    return q;
  }
  const proj = (c, d, x, y) => { const q = camD(c, d); return [540 + (x - q.fx) * q.z, 960 + (y - q.fy) * q.z, q.z]; };

  // ------------------------------------------------------------------------------------------ helpers
  /** the man figure with another coat / skin / hair (restored at once: no state survives the call) */
  function person(L, p, opts) {
    const C = E.man.colors;
    const saved = {};
    if (p.col) for (const k in p.col) { saved[k] = C[k]; C[k] = p.col[k]; }
    try { return E.man.draw(L, opts); } finally { for (const k in saved) C[k] = saved[k]; }
  }

  /** a luminous glass drop in the current transform. o: {a, glow, tint, sx, sy, neck: [x, y, w], seed} */
  function drop(L, x, y, r, o) {
    const a = o.a ?? 1;
    if (a <= 0.01 || r < 0.6) return;
    const p = L.paint;
    const round = new Path2D();
    round.ellipse(x, y, r * (o.sx || 1), r * (o.sy || 1), 0, 0, TAU);
    const body = new Path2D(round);
    // the neck that still ties it to the big world (pinching off)
    if (o.neck && o.neck[2] > 0.02) {
      const [nx, ny, w] = o.neck;
      const dx = nx - x, dy = ny - y, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, vx = -uy, vy = ux;
      const A = [x + vx * r * 0.78 * w + ux * r * 0.5, y + vy * r * 0.78 * w + uy * r * 0.5];
      const D = [x - vx * r * 0.78 * w + ux * r * 0.5, y - vy * r * 0.78 * w + uy * r * 0.5];
      const B = [nx + vx * r * 0.5 * w, ny + vy * r * 0.5 * w], C2 = [nx - vx * r * 0.5 * w, ny - vy * r * 0.5 * w];
      const M1 = [(x + nx) / 2 + vx * r * 0.08 * w, (y + ny) / 2 + vy * r * 0.08 * w], M2 = [(x + nx) / 2 - vx * r * 0.08 * w, (y + ny) / 2 - vy * r * 0.08 * w];
      // same winding as the ellipse (clockwise on screen), so the union fills without a hole
      const q4 = [A, B, C2, D];
      let area = 0;
      for (let k = 0; k < 4; k++) { const u = q4[k], v = q4[(k + 1) % 4]; area += u[0] * v[1] - v[0] * u[1]; }
      if (area >= 0) {
        body.moveTo(A[0], A[1]); body.quadraticCurveTo(M1[0], M1[1], B[0], B[1]); body.lineTo(C2[0], C2[1]);
        body.quadraticCurveTo(M2[0], M2[1], D[0], D[1]); body.closePath();
      } else {
        body.moveTo(D[0], D[1]); body.quadraticCurveTo(M2[0], M2[1], C2[0], C2[1]); body.lineTo(B[0], B[1]);
        body.quadraticCurveTo(M1[0], M1[1], A[0], A[1]); body.closePath();
      }
    }
    // a warm painted halo (light cannot brighten pale paper, so the glow is also painted around it)
    if (o.glow > 0) soft(p, circle(x, y, r * 1.45), '#F3D396', 0.3 * a * o.glow, r * 0.55);
    p.save();
    p.globalAlpha *= a;
    p.globalCompositeOperation = 'source-over';
    p.fillStyle = 'rgba(255,255,255,0.62)';
    p.fill(body);                                         // paper inside: it reads as light against the sky
    p.globalCompositeOperation = 'multiply';
    const g = p.createLinearGradient(x, y - r, x, y + r);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.45, E.rgba(o.tint, 0.12));
    g.addColorStop(1, E.rgba(o.tint, 0.62));
    p.fillStyle = g;
    p.fill(body);                                         // its future world pooled at the bottom
    // iridescent soap-film rim (one continuous ring of soft colour)
    const cg = p.createConicGradient(-2.4, x, y);
    [[0, '#B7A6DE'], [0.27, '#E8A7BD'], [0.52, '#9CC8E2'], [0.77, '#EFCB86'], [1, '#B7A6DE']].forEach(([o2, c2]) => cg.addColorStop(o2, E.rgba(c2, 0.6)));
    p.strokeStyle = cg;
    p.lineWidth = Math.max(0.8, r * 0.1);
    p.beginPath(); p.ellipse(x, y, r * (o.sx || 1) * 0.945, r * (o.sy || 1) * 0.945, 0, 0, TAU); p.stroke();
    p.restore();
    // highlight window + small counter-glint (bare paper)
    E.lift(p, E.blob(x - r * 0.38, y - r * 0.42, r * 0.24, { rx: r * 0.3, ry: r * 0.15, rot: -0.65, seed: o.seed || 3, irr: 0.08 }), 0.95 * a);
    E.lift(p, circle(x + r * 0.42, y + r * 0.38, r * 0.08), 0.8 * a);
    if (r > 4) E.pencil(L.ink, round, { w: Math.max(0.8, Math.min(1.5, r * 0.05)), a: 0.32 * a, double: r > 14, seed: o.seed || 3 });
    if (o.glow > 0) {
      E.glow(L.light, x, y, r * 2.6, '#FFD58C', 0.5 * o.glow * a);
      E.glow(L.light, x - r * 0.1, y - r * 0.1, r * 0.9, '#FFF6E2', 0.5 * o.glow * a);
    }
  }

  /** 4-point twinkle (light layer) */
  function twinkle(ctx, x, y, s, a) {
    if (a <= 0.01) return;
    E.glow(ctx, x, y, s * 3, '#FFE7B0', 0.5 * a);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [dx, dy, l] of [[1, 0, 1], [0, 1, 1.25], [0.7, 0.7, 0.45], [0.7, -0.7, 0.45]]) {
      const g = ctx.createLinearGradient(x - dx * s * l * 2, y - dy * s * l * 2, x + dx * s * l * 2, y + dy * s * l * 2);
      g.addColorStop(0, 'rgba(255,244,214,0)');
      g.addColorStop(0.5, E.rgba('#FFF6DE', 0.95 * a));
      g.addColorStop(1, 'rgba(255,244,214,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = Math.max(1.2, s * 0.14);
      ctx.beginPath();
      ctx.moveTo(x - dx * s * l * 2, y - dy * s * l * 2);
      ctx.lineTo(x + dx * s * l * 2, y + dy * s * l * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  const bez = (a, b, c, d, t) => {
    const s = 1 - t;
    return [s * s * s * a[0] + 3 * s * s * t * b[0] + 3 * s * t * t * c[0] + t * t * t * d[0],
      s * s * s * a[1] + 3 * s * s * t * b[1] + 3 * s * t * t * c[1] + t * t * t * d[1]];
  };

  /** per-person animation state (o = order: the centre first, then outward) */
  function stateOf(p, lt, T) {
    const o = p.o;
    const e0 = T.dunyadan - 0.18 + o * 0.05;
    const emerge = E.seg(lt, e0, e0 + 0.62);              // bead → pinch → free
    const f0 = e0 + 0.5, f1 = T.birer - 0.02 + o * 0.06;
    const fly = E.ep(lt, f0, f1, 'inOutSine');
    const a0 = T.her - 0.02 + o * 0.075;                  // sketched (top → bottom), then painted in
    const sketch = E.ep(lt, a0, a0 + 0.34, 'inOutSine');
    const paint = E.ep(lt, a0 + 0.2, a0 + 0.72, 'inOutSine');
    const s0 = T.birer - 0.1 + o * 0.07;                  // the drop swells into a world
    const settle = E.seg(lt, s0, s0 + 0.62);
    const reveal = E.ep(lt, s0 + 0.04, s0 + 0.48, 'inOutSine');
    const g0 = T.birer2 - 0.12 + o * 0.09;                // "âlemimiz": it warms into a glowing realm
    const glow = E.ep(lt, g0, g0 + 0.8, 'inOutSine');
    return { e0, emerge, f0, f1, fly, a0, sketch, paint, s0, settle, reveal, g0, glow };
  }

  /** the world's bob (the man's dies away before the zoom so it sits exactly on the zoom centre) */
  const bobOf = (p, i, lt) => 4 * Math.sin(lt * 1.4 + i * 1.7) * (p.man ? 1 - E.ep(lt, 3.6, 4.4) : 1);

  function poseOf(p, lt, st, T) {
    const M = E.man.pose;
    const arrive = E.ep(lt, st.s0 - 0.35, st.s0 + 0.3);
    const relax = E.ep(lt, st.s0 + 0.6, st.s0 + 1.6);
    let P0;
    if (p.view === 'side') {
      // looks up as the drop comes down, reaches up to touch it, then lowers the hands into an offering
      const look = E.ep(lt, E.lerp(st.f0, st.f1, 0.35), st.s0 + 0.1);
      const up = E.ep(lt, st.s0 - 0.4, st.s0 + 0.2);
      const offer = E.ep(lt, st.s0 + 0.5, st.s0 + 1.45);
      const REACH = { lean: -0.05, head: -0.42, nS: 2.3, nE: 0.22, nW: -0.15, fS: 1.35, fE: 0.5, fW: 0, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 };
      const OFFER = { lean: -0.02, head: -0.3, nS: 0.72, nE: 1.05, nW: 0.3, fS: 0.5, fE: 1.0, fW: 0.2, nH: 0.03, nK: 0.03, fH: -0.03, fK: 0.03 };
      P0 = E.man.lerp(M.stand(), REACH, up);
      P0 = E.man.lerp(P0, OFFER, offer);
      P0.head = Math.min(P0.head, -0.36 * look) + 0.03 * Math.sin(lt * 1.1 + p.o);
      P0.hipDrop = 0.003 * Math.sin(lt * 1.9 + p.o * 1.3);
      return P0;
    }
    if (p.man) {
      // receives his world with a small opening of the arms, later lays a hand on his heart ("âlemimiz")
      const open = 0.32 * arrive * (1 - E.ep(lt, T.birer2, T.alem));
      P0 = E.man.lerp(M.fStand(), M.fOpen(1), open);
      const heart = E.ep(lt, T.birer2 + 0.05, T.alem + 0.25);
      if (heart > 0) P0 = E.man.lerp(P0, M.fHeart(1), heart * 0.9);
    } else P0 = E.man.lerp(M.fStand(), M.fOpen(1), 0.36 * arrive * (1 - 0.55 * relax));
    P0.headTilt = (P0.headTilt || 0) + (p.x < 540 ? 0.05 : p.x > 540 ? -0.05 : 0) * (0.5 + 0.5 * Math.sin(lt * 0.9 + p.o)) * (0.3 + 0.7 * arrive);
    P0.hipDrop = 0.004 * Math.sin(lt * 1.9 + p.o * 1.3);
    return P0;
  }

  // a slender meadow path winding up to the man (people plane)
  const PATH = (() => {
    const N = 26, Lp = [], Rp = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;                                     // 0 at the man's feet, 1 below the frame
      const y = 1218 + u * 780;
      const cx = 540 - 150 * Math.sin(u * 2.6) * u - 40 * u;
      const w = 9 + 120 * Math.pow(u, 1.6);
      Lp.push([cx - w, y]); Rp.push([cx + w, y]);
    }
    return E.smoothPath(Lp.concat(Rp.reverse()), true, 0.5);
  })();

  // foreground flower clusters (depth FG): [x, y, size, kind, seed]
  const FG = 1.25;
  const FLOWERS = [
    [40, 1820, 230, 'daisy', 3], [120, 1880, 200, 'wild', 5], [-10, 1700, 190, 'tulip', 7], [175, 1960, 210, 'daisy', 9],
    [1040, 1800, 220, 'daisy', 4], [965, 1900, 190, 'tulip', 6], [1095, 1690, 180, 'wild', 8],
  ];
  const BLOOM_COL = { field: '#D9AE5B', sea: '#7FA7CF', home: '#9FB571', city: '#C2765A', orchard: '#6E9A5A' };

  E.scene('s03', {
    draw(L, lt, t, shot) {
      const T = tm(shot);
      const c = cam(lt, T);

      // ---------------------------------------------------------------- sky (same family as s01)
      E.skyWash(L.paint, E.shade(P.cerulean, 0.42), E.shade(P.ochre, 0.6), { mid: E.shade(P.skyWash, 0.58), seed: 5, mottle: 0.16 });
      apply(L, c, 0.15);
      bloom(L.paint, 170, 240, 330, E.shade(P.gamboge, 0.35), 0.3, 90, 8, 0.3);
      bloom(L.paint, 950, 260, 280, E.shade(P.cerulean, 0.1), 0.14, 80, 17, 0.35);
      bloom(L.paint, 880, 860, 360, E.shade(P.blush, 0.35), 0.2, 100, 12, 0.3);

      // far clouds
      apply(L, c, 0.35);
      PR.cloud(L, 130 + lt * 6, 290, 290, { seed: 3, t: lt });
      PR.cloud(L, 950 + lt * 4, 610, 240, { seed: 6, t: lt });

      // ---------------------------------------------------------------- the big world
      apply(L, c, DW);
      const bwy = BW.y + 5 * Math.sin(lt * 1.3 + 0.6);
      PR.bigWorld(L, BW.x, bwy, BW.r, {
        t: t, rot: 0.12 + 0.05 * lt, decor: 1, gateGlow: 0.55 + 0.1 * Math.sin(lt * 1.7), travellers: 1,
      });
      // the world "gives": a soft warm pulse across its underside as the drops bead
      const pulse = bump(lt, T.su - 0.05, T.dunyadan + 0.75);
      if (pulse > 0) {
        soft(L.paint, circle(BW.x, bwy + BW.r * 0.55, BW.r * 0.75), '#F4D9A2', 0.22 * pulse, BW.r * 0.4);
        E.glow(L.light, BW.x, bwy + BW.r * 0.45, BW.r * 1.3, '#FFE6B0', 0.25 * pulse);
      }

      // ---------------------------------------------------------------- ground + path (people plane)
      apply(L, c, 1);
      PR.ground(L, GROUND_Y, { palette: 'spring', seed: 4, t: lt, trees: 0.5, flowers: 0.35 });
      E.wash(L.paint, PATH, '#F1E6CC', { mode: 'over', alpha: 0.6 });
      E.wash(L.paint, PATH, '#B49B76', { grad: { from: [540, 1220], to: [540, 1960], stops: [[0, 'rgba(180,155,118,0.08)'], [1, 'rgba(180,155,118,0.3)']] } });
      E.pencil(L.ink, PATH, { w: 1.1, a: 0.1, double: false });
      // soft cloud shadows drifting over the meadow (calm value variation in the lower frame)
      soft(L.paint, E.blob(260 + lt * 14, 1470, 260, { rx: 420, ry: 90, seed: 5, irr: 0.25 }), '#7E9A88', 0.13, 40);
      soft(L.paint, E.blob(860 + lt * 12, 1670, 260, { rx: 380, ry: 80, seed: 9, irr: 0.25 }), '#7E9A88', 0.11, 40);

      // ---------------------------------------------------------------- people: pencil sketch, then wet paint
      const states = PEOPLE.map((p) => stateOf(p, lt, T));
      for (const i of BACK_TO_FRONT) {
        const p = PEOPLE[i], st = states[i];
        if (st.sketch <= 0) continue;
        const cy = p.f - p.h * 0.6;
        const coat = p.col ? p.col.coat : P.coat;
        // a wet bloom of the coat colour spreads where the figure is being painted, then dries away
        const bk = bump(st.paint, 0.1, 1.2);
        if (bk > 0.02) bloom(L.paint, p.x, cy, p.h * 0.34, E.shade(coat, 0.5), 0.26 * bk, 24, 40 + i);
        manShadow(L, p.x + (p.view === 'side' ? p.facing * 6 : 6), p.f, p.h, 0.4 * st.paint, 1.15);
        E.save(L);
        if (st.sketch < 1) {
          const wipe = new Path2D();
          wipe.rect(p.x - p.h, p.head - 40, p.h * 2, (p.h + 70) * st.sketch);
          L.ink.clip(wipe);
        }
        if (st.paint < 1) {
          // the wash flows down the figure with a wavy wet front (top → bottom, after the pencil)
          const yF = p.head - 30 + (p.h + 70) * st.paint;
          const flood = new Path2D();
          flood.moveTo(p.x - p.h, p.head - 200);
          flood.lineTo(p.x + p.h, p.head - 200);
          for (let k = 0; k <= 16; k++) {
            const xx = p.x + p.h - (2 * p.h * k) / 16;
            flood.lineTo(xx, yF + 9 * Math.sin(k * 1.7 + i * 2.3) + 5 * Math.sin(k * 3.1 + i));
          }
          flood.closePath();
          L.paint.clip(flood); L.light.clip(flood);
        }
        person(L, p, { x: p.x, y: p.f, h: p.h, view: p.view, facing: p.facing || 1, pose: poseOf(p, lt, st, T) });
        E.restore(L);
      }

      // ---------------------------------------------------------------- drops (screen space)
      E.resetCamera(L);
      for (const i of BACK_TO_FRONT) {
        const p = PEOPLE[i], st = states[i];
        if (st.emerge <= 0 || st.reveal >= 1) continue;
        const ca = Math.cos(p.ang), sa = Math.sin(p.ang);
        const sS = proj(c, DW, BW.x + ca * BW.r * 0.97, bwy + sa * BW.r * 0.97);      // on the surface
        const s1 = proj(c, DW, BW.x + ca * (BW.r + DROP_R * 2.1), bwy + sa * (BW.r + DROP_R * 2.1) + DROP_R * 0.6);
        const tg = proj(c, 1, p.bx, p.by + bobOf(p, i, lt));
        const r0 = DROP_R * s1[2];
        // bead (swells on the surface) → neck thins and snaps → free, with a little wobble
        const e = st.emerge;
        const grow = E.ease.outCubic(E.seg(e, 0, 0.55));
        const out = E.ease.inOutSine(E.seg(e, 0.2, 0.85));
        const neckW = e < 0.62 ? 1 - 0.85 * E.ease.inQuad(E.seg(e, 0.3, 0.62)) : 0;
        const wob = e >= 0.62 ? Math.exp(-6 * (e - 0.62) / 0.38) * Math.sin((e - 0.62) * 38) : 0;
        const lift = [E.lerp(sS[0], s1[0], out), E.lerp(sS[1], s1[1], out)];
        const ctl1 = [s1[0] + ca * 60 * s1[2], s1[1] + 140 * s1[2]];
        const ctl2 = [tg[0] + (s1[0] - tg[0]) * 0.15, tg[1] - 170 * tg[2]];
        const at = (f) => (f > 0 ? bez(lift, ctl1, ctl2, tg, f) : lift);
        const sway = (f) => Math.sin(f * Math.PI) * 10 * Math.sin(lt * 2.2 + i);
        const pos = at(st.fly);
        pos[0] += sway(st.fly);
        const rFly = E.lerp(r0, p.r * 0.52 * tg[2], E.ease.inOutSine(st.fly));
        const r = st.settle > 0 ? p.r * tg[2] * (0.52 + 0.48 * E.ease.outBackSoft(st.settle)) : rFly * (0.25 + 0.75 * grow);
        // a faint trail of light while it travels
        if (st.fly > 0.03 && st.fly < 0.97) {
          for (let j = 1; j <= 5; j++) {
            const f = Math.max(0, st.fly - j * 0.03);
            const q = at(f);
            E.glow(L.light, q[0] + sway(f), q[1], r * (0.95 - j * 0.13), '#FFE3A8', 0.2 * (1 - j / 6));
          }
        }
        const fade = 1 - E.ep(lt, st.s0 + 0.2, st.s0 + 0.5);
        drop(L, pos[0], pos[1], r, {
          a: fade, glow: 1 - 0.5 * st.settle, tint: p.tint, seed: 7 + i,
          sx: 1 + 0.1 * wob - 0.06 * neckW, sy: 1 - 0.1 * wob + 0.1 * neckW,
          neck: neckW > 0 ? [sS[0], sS[1], neckW] : null,
        });
        // the moment it pinches off: a twinkle at the surface
        twinkle(L.light, sS[0], sS[1] + 2, 7 * s1[2], bump(e, 0.55, 0.95));
        if (st.settle > 0) twinkle(L.light, pos[0] + r * 0.6, pos[1] - r * 0.62, 7, bump(st.settle, 0.12, 0.6));
      }

      // ---------------------------------------------------------------- personal worlds (people plane)
      apply(L, c, 1);
      const drawWorld = (i) => {
        const p = PEOPLE[i], st = states[i];
        if (st.reveal <= 0) return;
        const r = p.r * (0.52 + 0.48 * E.ease.outBackSoft(st.settle));
        const x = p.bx, y = p.by + bobOf(p, i, lt);
        // a wet colour blossom as the world floods in
        const bk = bump(st.reveal, 0, 1.25);
        if (bk > 0.01) bloom(L.paint, x, y + r * 0.2, r * (0.6 + 0.55 * st.reveal), BLOOM_COL[p.kind], 0.3 * bk, r * 0.2, 30 + i, 0.22);
        // "âlemimiz": a warm aura and one ring of light
        if (st.glow > 0) {
          const breathe = 1 + 0.04 * Math.sin(lt * 2.2 + i);
          soft(L.paint, circle(x, y, r * 1.22 * breathe), '#F2C878', 0.34 * st.glow, r * 0.42);
          const q = E.seg(lt, st.g0 + 0.02, st.g0 + 1.05);
          if (q > 0 && q < 1) {
            const ring = circle(x, y, r * (1.04 + 0.36 * E.ease.outCubic(q)));
            const pc = L.paint;
            pc.save(); pc.globalCompositeOperation = 'multiply'; pc.globalAlpha *= 0.38 * (1 - q);
            pc.strokeStyle = '#E2AE58'; pc.lineWidth = 5 * (1 - 0.7 * q); pc.stroke(ring); pc.restore();
            E.pencil(L.ink, ring, { w: 1.0, a: 0.18 * (1 - q), double: false });
            const lc = L.light;
            lc.save(); lc.globalCompositeOperation = 'lighter'; lc.globalAlpha = 0.4 * (1 - q);
            lc.strokeStyle = '#FFE4A8'; lc.lineWidth = 9; lc.stroke(ring); lc.restore();
          }
          if (q > 0.05 && q < 0.8) twinkle(L.light, x + r * 0.62, y - r * 0.66, 7, bump(q, 0.05, 0.8));
        }
        // the landscape fills the drop from the bottom up
        E.save(L);
        if (st.reveal < 1) { const cl = circle(x, y + r, 2.15 * r * st.reveal); E.each(L, (cx) => cx.clip(cl)); }
        PR.personalWorld(L, x, y, r, {
          t: p.man ? t : t + i * 3.1, kind: p.kind, seed: p.seed,
          glow: 0.1 + 0.7 * st.glow + (p.man ? 0.15 * st.glow : 0),
          life: 0.15 + 0.85 * st.glow,
        });
        E.restore(L);
      };
      for (const i of BACK_TO_FRONT) if (i !== 2) drawWorld(i);

      // ---------------------------------------------------------------- foreground flowers (nearest, parallax)
      apply(L, c, FG);
      for (const [x, y, s, kind, seed] of FLOWERS) PR.flower(L, x, y, s, { kind, seed, t: lt + seed });

      // ---------------------------------------------------------------- zoom tail: only his world stays
      // while the scheduler flies into his world, everything around it melts into s04's soft sky, so the
      // cross-fade shows one bubble on one sky (no giant ghosts of the people)
      const foc = 0.96 * E.ep(lt, 4.5, 4.92, 'inOutSine');
      if (foc > 0.002) {
        const m = proj(c, 1, MAN.bx, MAN.by + bobOf(MAN, 2, lt));
        const rr = MAN.r * m[2];
        const veil = new Path2D();
        veil.moveTo(-400, -400); veil.lineTo(-400, E.H + 400); veil.lineTo(E.W + 400, E.H + 400); veil.lineTo(E.W + 400, -400); veil.closePath();
        veil.moveTo(m[0] + rr * 1.06, m[1]); veil.arc(m[0], m[1], rr * 1.06, 0, TAU);
        E.resetCamera(L);
        soft(L.paint, veil, E.mix(E.shade(P.skyWash, 0.6), E.shade(P.cerulean, 0.46), 0.35), foc, rr * 0.16, 'source-over');
        soft(L.ink, veil, '#000000', foc, rr * 0.16, 'destination-out');
        soft(L.light, veil, '#000000', foc, rr * 0.16, 'destination-out');
      }
      apply(L, c, 1);
      drawWorld(2);

      // gentle drifting motes in the warm air
      E.resetCamera(L);
      E.motes(L.light, { n: 16, t: lt, seed: 41, size: 2.4, a: 0.3, rise: 16, h: 1200 });
    },

    sfx(shot) {
      const T = tm(shot);
      const g = (l) => shot.start + l;
      return [
        { t: g(T.dunyadan - 0.16), type: 'bubbles', gain: 0.26, dur: 0.8 },
        { t: g(0.42), type: 'whoosh', gain: 0.16, dur: 1.0 },
        { t: g(T.her - 0.02), type: 'pen', gain: 0.12, dur: 0.7 },
        { t: g(T.birer - 0.08), type: 'bloom', gain: 0.38, pitch: 1.0 },
        { t: g(T.birer + 0.26), type: 'sparkle', gain: 0.2, dur: 0.6 },
        { t: g(T.var1 - 0.02), type: 'chime', gain: 0.18, pitch: 1.25 },
        { t: g(T.birer2 - 0.12), type: 'swell', gain: 0.3, dur: 1.2 },
        { t: g(T.end - 0.12), type: 'whoosh', gain: 0.3, dur: 0.9 },
      ];
    },
  });
})();
