/* s01 · 0.00–2.55 (+0.75 zoom tail) · "İşte dünya süslü bir menzildir."
   Bare paper → a wet wash blooms open and the big world (süslü menzil) is painted into a warm sky.
   "dünya" 0.52 the globe is formed, turning and breathing · "süslü" 0.94 decorations pop in (sparkles)
   · "menzildir" 1.46 the caravanserai gate glows, travellers walk in and out · the camera pushes in and
   lands the gate at (540, 1010) by 2.5 s, the centre of the outgoing zoom into s02. */
(function () {
  const E = window.E;
  const PR = E.props;
  const P = E.P;

  // cubic Hermite through keys [t, value, slope] (smooth camera moves without stops)
  const herm = (t, K) => {
    if (t <= K[0][0]) return K[0][1];
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

  // world layout (at camera zoom 1 = identity)
  const WX = 540, WY = 860, WR = 370;
  const GATE = PR.bigWorldGate(WX, WY, WR);      // ≈ (540, 486)
  const Z1 = 2.75;                                 // final zoom: gate opening ≈ 110 px wide on screen
  const GOAL = [540, 1010];                        // outgoing zoom centre (s02 trans)
  const TRAV_DT = 4.9;                             // bigWorld time offset (see the bigWorld call)

  /** camera state at local time lt: focus world point F shown at screen point S with zoom Z */
  function cam(lt) {
    const u = herm(lt, [[0, 0, 0], [1.3, 0.12, 0.16], [2.5, 1.0, 0.8], [3.3, 1.35, 0.1]]);   // keep in sync with S01K in s02.js
    // the pan onto the gate lands softly at 2.5 s (its own curve: a clamp of u would stop it dead mid-zoom)
    const v = E.clamp(herm(lt, [[0, 0, 0], [1.3, 0.12, 0.16], [2.5, 1.0, 0]]));
    const F = [WX, E.lerp(WY, GATE[1], v)];
    const S = [540, E.lerp(WY, GOAL[1], v)];
    return { u, v, F, S, Z: Math.exp(u * Math.log(Z1)) };
  }
  /** apply the camera at a parallax depth d (1 = the world layer, < 1 farther, > 1 nearer): zoom Z^d, and the
      camera centre moves d times as far as the world layer's */
  function apply(L, c, d) {
    const z = Math.pow(c.Z, d);
    const cx = c.F[0] - (c.S[0] - E.W / 2) / c.Z, cy = c.F[1] - (c.S[1] - E.H / 2) / c.Z;
    E.camera(L, { x: E.W / 2 + (cx - E.W / 2) * d, y: E.H / 2 + (cy - E.H / 2) * d, zoom: z });
    return z;
  }

  /** small seagull-like bird (paint + a faint pencil), wings flapping with phase ph */
  function bird(L, x, y, s, ph, a) {
    const f = Math.sin(ph * E.TAU);
    const up = -0.55 * f * s, mid = 0.18 * s;
    const p = new Path2D();
    p.moveTo(x - s, y + up);
    p.quadraticCurveTo(x - s * 0.45, y - s * 0.35 + up * 0.3, x, y + mid * 0.4);
    p.quadraticCurveTo(x + s * 0.45, y - s * 0.35 + up * 0.3, x + s, y + up);
    const c = L.paint;
    c.save();
    c.globalCompositeOperation = 'multiply';
    c.globalAlpha *= 0.75 * a;
    c.strokeStyle = '#5B6280';
    c.lineWidth = s * 0.16;
    c.lineCap = 'round';
    c.stroke(p);
    c.restore();
    E.pencil(L.ink, p, { w: 1, a: 0.25 * a, double: false });
  }

  /** soft 4-point twinkle on the light layer */
  function twinkle(ctx, x, y, s, a) {
    if (a <= 0.01) return;
    E.glow(ctx, x, y, s * 3.2, '#FFE7B0', 0.55 * a);
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

  // sparkle positions on the globe / han in units of r (relative to the globe centre), staggered with decor
  const SPARKS = [
    [-0.36, -1.24, 0.0], [0.38, -1.26, 0.06], [0.0, -1.47, 0.12], [-0.5, -1.36, 0.18], [0.52, -1.37, 0.22],
    [-0.28, -0.62, 0.1], [0.24, -0.86, 0.16], [0.56, -0.2, 0.26], [-0.6, 0.06, 0.3], [0.12, 0.3, 0.36],
    [-0.2, -1.12, 0.28], [0.22, -1.1, 0.4],
  ];

  /** the sky: a pure function of nothing, so it is painted once into an offscreen canvas (big soft blooms are
      expensive to rasterise every frame) and drawn each frame under the parallax transform */
  let SKY = null;
  function skyCanvas() {
    if (SKY) return SKY;
    const cv = document.createElement('canvas');
    cv.width = E.W; cv.height = E.H;
    const p = cv.getContext('2d');
    p.fillStyle = '#ffffff';
    p.fillRect(0, 0, E.W, E.H);
    // blue only in the upper half, fading out to paper BEFORE the warm glow below begins (no grey mud where a
    // blue and a yellow glaze would overlap)
    const top = E.shade(E.mix(P.cerulean, P.ultramarine, 0.3), 0.3);
    p.globalCompositeOperation = 'multiply';
    const gb = p.createLinearGradient(0, 0, 0, E.H);
    gb.addColorStop(0, top);
    gb.addColorStop(0.3, E.shade(top, 0.3));
    gb.addColorStop(0.55, E.shade(top, 0.82));
    gb.addColorStop(0.64, '#ffffff');
    gb.addColorStop(1, '#ffffff');
    p.fillStyle = gb;
    p.fillRect(0, 0, E.W, E.H);
    const gw = p.createLinearGradient(0, 1060, 0, E.H);
    gw.addColorStop(0, E.rgba(E.shade(P.gamboge, 0.7), 0));
    gw.addColorStop(0.4, E.rgba(E.shade(P.gamboge, 0.6), 0.75));
    gw.addColorStop(1, E.rgba(E.shade(E.mix(P.gamboge, P.blush, 0.55), 0.5), 0.95));
    p.fillStyle = gw;
    p.fillRect(0, 1000, E.W, E.H - 1000);
    p.globalCompositeOperation = 'source-over';
    // wet-in-wet sky blooms (cauliflower edges), darker away from the warm glow at the upper left
    E.bloom(p, 930, 110, 300, E.shade(P.ultramarine, 0.3), { seed: 41, alpha: 0.24, soft: 22, irr: 0.32 });
    E.bloom(p, 640, 300, 210, E.shade(P.cerulean, 0.2), { seed: 43, alpha: 0.2, soft: 18, irr: 0.35 });
    E.bloom(p, 1010, 520, 200, E.shade(P.cerulean, 0.25), { seed: 44, alpha: 0.18, soft: 20, irr: 0.35 });
    E.bloom(p, 60, 640, 190, E.shade(P.cerulean, 0.3), { seed: 46, alpha: 0.16, soft: 24, irr: 0.35 });
    E.bloom(p, 420, 60, 220, E.shade(P.cerulean, 0.25), { seed: 47, alpha: 0.16, soft: 26, irr: 0.35 });
    // the warm glow: lift the blue back to paper first, then drop gamboge into the wet paper
    E.lift(p, E.blob(190, 240, 230, { seed: 9, irr: 0.3, rx: 280, ry: 190, rot: -0.4 }), 0.7, 70);
    E.bloom(p, 180, 250, 250, E.shade(P.gamboge, 0.35), { seed: 8, alpha: 0.3, soft: 80, irr: 0.3 });
    // warm, luminous lower sky
    E.bloom(p, 540, 1520, 480, E.shade(P.gamboge, 0.4), { seed: 13, alpha: 0.18, soft: 120, irr: 0.25 });
    E.bloom(p, 920, 1640, 400, E.shade(P.blush, 0.3), { seed: 12, alpha: 0.18, soft: 110, irr: 0.3 });
    E.bloom(p, 110, 1700, 340, E.shade(P.rose, 0.5), { seed: 15, alpha: 0.12, soft: 100, irr: 0.3 });
    // a few stray pigment splatters, as in a real sketchbook page (outside the subtitle band)
    E.splatter(p, 110, 560, 50, E.shade(P.cerulean, -0.1), { seed: 5, n: 7, size: 3.5, alpha: 0.4 });
    E.splatter(p, 830, 1700, 60, E.shade(P.rose, 0.1), { seed: 8, n: 6, size: 3, alpha: 0.35 });
    SKY = cv;
    return cv;
  }

  E.scene('s01', {
    draw(L, lt) {
      const c = cam(lt);

      // ---------------------------------------------------------------- sky (far, barely any parallax)
      // (painted once into a memoised canvas: smooth, static; drawn with a slight parallax zoom)
      E.save(L);
      apply(L, c, 0.12);
      L.paint.drawImage(skyCanvas(), 0, 0);
      E.restore(L);

      // far clouds (bare paper), slow parallax, slow drift
      E.save(L);
      apply(L, c, 0.35);
      PR.cloud(L, 190 + lt * 6, 330, 300, { seed: 3, t: lt });
      PR.cloud(L, 905 + lt * 5, 600, 250, { seed: 6, t: lt });
      PR.cloud(L, 150 + lt * 4, 1210, 330, { seed: 9, t: lt });
      // frames the upper right of the han at the end of the push-in
      PR.cloud(L, 765 + lt * 4, 255, 220, { seed: 19, t: lt, alpha: 0.85 });
      E.restore(L);

      // ---------------------------------------------------------------- the wet wash blooms open (0–0.6 s)
      const op = E.ease.outCubic(E.seg(lt, 0.0, 0.62));
      if (op < 1) {
        const p = L.paint;
        p.save();
        p.setTransform(1, 0, 0, 1, 0, 0);
        p.globalCompositeOperation = 'source-over';
        for (const [k, a, sd] of [[1.0, 0.55, 4], [0.9, 1.0, 7]]) {
          const rr = 1500 * op * k;
          const path = new Path2D();
          path.rect(-50, -50, E.W + 100, E.H + 100);
          path.addPath(E.blob(WX, WY - 20, rr, { seed: sd, irr: 0.16, n: 72, rx: rr * 0.92, ry: rr }));
          p.globalAlpha = a;
          p.fillStyle = '#ffffff';
          p.fill(path, 'evenodd');
        }
        p.restore();
      }

      // ---------------------------------------------------------------- birds (middle depth)
      E.save(L);
      apply(L, c, 0.6);
      const ba = E.ep(lt, 0.3, 0.8);
      [[-0.0, 0, 0], [-60, 26, 0.37], [-112, -8, 0.71]].forEach(([dx, dy, ph], i) => {
        const bx = 760 + dx + lt * 46, by = 205 + dy - lt * 9 + 4 * Math.sin(lt * 2 + i);
        bird(L, bx, by, 13 - i, lt * 3.1 + ph, ba);
      });
      E.restore(L);

      // ---------------------------------------------------------------- the big world
      E.save(L);
      apply(L, c, 1);
      const form = E.ease.outCubic(E.seg(lt, 0.02, 0.38));
      const fade = E.ep(lt, 0.1, 0.5, 'outQuad');
      // underpainting: a pale wet bloom where the globe is about to appear
      if (fade < 1 && form > 0) E.bloom(L.paint, WX, WY, WR * (0.08 + 0.97 * form), E.shade(P.sap, 0.45), { seed: 23, alpha: 0.55 * (1 - fade * 0.8), soft: 26, irr: 0.12 });
      const sIn = 0.86 + 0.14 * E.ease.outBackSoft(E.seg(lt, 0.05, 0.75));
      const breath = 1 + 0.006 * Math.sin(lt * 2.3) * (1 - c.v);   // settles so the gate sits exactly on the zoom point
      const fl = 5 * Math.sin(lt * 1.6 + 0.4) * (1 - c.v);
      const r = WR * sIn * breath;
      const wy = WY + fl;
      // (prop time runs TRAV_DT ahead: its travellers are drawn before the han façade, so one walking onto the
      // forecourt loses his head behind it — with this offset nobody is on the forecourt while they are visible
      // (1.2 s → the end of the zoom tail): one walks up the road toward the gate, others leave by the exit road)
      PR.bigWorld(L, WX, wy, r, {
        t: lt + TRAV_DT, rot: -0.08 + 0.05 * lt, alpha: fade,
        decor: E.ep(lt, 0.86, 1.8, 'linear'),
        gateGlow: E.ep(lt, 1.34, 2.1, 'inOutSine'),
        travellers: E.ep(lt, 1.2, 1.6),
      });
      // sparkles as the world is adorned
      for (const [sx, sy, d] of SPARKS) {
        const t0 = 0.9 + d * 1.6;
        const k = E.seg(lt, t0, t0 + 0.55);
        const a = Math.sin(Math.PI * k) * (k > 0 && k < 1 ? 1 : 0);
        twinkle(L.light, WX + sx * r, wy + sy * r, 10 + 4 * ((sx * 7 + sy * 3) % 1 + 1), a);
      }
      // warm gate light breathing once it glows
      const gg = E.ep(lt, 1.34, 2.1, 'inOutSine');
      if (gg > 0) {
        const g = PR.bigWorldGate(WX, wy, r);
        E.glow(L.light, g[0], g[1] + r * 0.02, r * 0.16 * (1 + 0.06 * Math.sin(lt * 5)), '#FFD98A', 0.35 * gg);
      }
      E.restore(L);

      // ---------------------------------------------------------------- near clouds (fast parallax, fly past)
      E.save(L);
      apply(L, c, 1.7);
      const na = op * op;
      PR.cloud(L, 40 + lt * 10, 360, 420, { seed: 11, t: lt, alpha: 0.8 * na });
      PR.cloud(L, 1060 - lt * 8, 1370, 460, { seed: 14, t: lt, alpha: 0.7 * na });
      E.restore(L);

      // gentle drifting motes in the warm air
      E.resetCamera(L);
      E.motes(L.light, { n: 18, t: lt, seed: 31, size: 2.6, a: 0.35 * E.ep(lt, 0.4, 1.0), rise: 18, h: 1250 });
    },

    sfx() {
      return [
        { t: 0.02, type: 'bloom', gain: 0.4, pitch: 0.8 },
        { t: 0.5, type: 'swell', gain: 0.25, dur: 1.2 },
        { t: 0.9, type: 'sparkle', gain: 0.35, dur: 1.0 },
        { t: 1.44, type: 'chime', gain: 0.28, pitch: 1.0 },
        { t: 2.45, type: 'whoosh', gain: 0.4, dur: 1.15 },   // into the zoom and through the gate (s02)
      ];
    },
  });
})();
