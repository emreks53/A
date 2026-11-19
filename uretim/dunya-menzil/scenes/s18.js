/* s18 · 82.45–86.40 · "kendini lâyemut farz ederek dünyaya saplansa,"
   Night. The man stands on the top of his (inflated, false) little world — a curved moonlit horizon with his
   little house and tree on its shoulder; the real (big) world floats far away in the sky.
   "kendini" 82.69: a stone pedestal pushes up out of the ground and lifts him; he straightens into a proud pose.
   "lâyemut farz ederek" 83.13–84.2: he petrifies from the feet up into a grey stone monument (assumes himself
   immortal); a cold glint runs over the polished stone.
   "dünyaya" 84.77: the ground (the world) turns to dark glossy mud, a wet stain spreading from the plinth.
   "saplansa" 85.25: the monument tilts and sinks — plinth swallowed, statue stuck to the knees; rings, drops.
   Cut in from s17, cut out to s19 (he clutches the false world). */
(function () {
  const E = window.E;
  const PR = E.props;
  const T0 = 82.45;
  const lw = (i) => E.T(i) - T0; // local onset of word i

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

  // ---- layout (world coords; the camera moves gently) ----
  const GY = 1140;          // top of the world's curved horizon (at x = 540)
  const R = 1000;           // curvature radius of the little world
  const MX = 500;           // monument x
  const MH = 560;           // man height
  const PW = 270, PH = 235; // pedestal
  const KNEE = MH * 0.26;
  const arcY = (x) => GY + R - Math.sqrt(Math.max(0, R * R - (x - 540) * (x - 540)));

  // ---- beats (local seconds) ----
  const K = {
    rise0: lw(154) - 0.12, rise1: lw(154) + 0.55,           // kendini: pedestal rises
    pose0: lw(154) - 0.05, pose1: lw(154) + 0.7,
    st0: lw(155) - 0.08, st1: lw(156) + 0.3,                // lâyemut … farz: petrify from the feet up
    glint: lw(157) + 0.0,                                   // ederek: cold glint on the stone
    mud0: lw(158) - 0.1, mud1: lw(158) + 0.8,               // dünyaya: mud stain spreads
    sink0: lw(159) - 0.12, sink1: lw(159) + 0.8,            // saplansa: sinks to the knees
  };

  const NIGHT_TINT = { tint: '#2E3B68', tintAmt: 0.2, desat: 0.2 };
  const MUD = '#3F3537', MUD2 = '#2C272F', MUDHI = '#B4BCD4';

  // ---------------------------------------------------------------- helpers
  function worldPath(t, liquid) {
    const p = new Path2D();
    let first = true;
    for (let x = -300; x <= 1380; x += 14) {
      let y = arcY(x);
      if (liquid > 0) y += liquid * (Math.sin(x * 0.011 - t * 1.6) * 3.0 + Math.sin(x * 0.027 + t * 2.3) * 1.4);
      if (first) { p.moveTo(x, y); first = false; } else p.lineTo(x, y);
    }
    p.lineTo(1380, 2600); p.lineTo(-300, 2600); p.closePath();
    return p;
  }
  const arcBand = (x0, x1, o0, o1, step = 18, wav = null) => {
    const a = [], b = [];
    for (let x = x0; x <= x1; x += step) {
      const u = (x - x0) / (x1 - x0), env = Math.sin(Math.PI * u);
      const w = wav ? wav(x) : 0;
      a.push([x, arcY(x) + o0 + w]);
      b.push([x, arcY(x) + o0 + (o1 - o0) * Math.pow(env, 0.6) + w]);
    }
    return E.smoothPath(a.concat(b.reverse()), true);
  };

  function eraseUnder(L, path) {
    for (const c of [L.ink, L.light]) {
      c.save();
      c.globalCompositeOperation = 'destination-out';
      c.fillStyle = '#000';
      c.fill(path);
      c.restore();
    }
  }

  function sparkle(ctx, x, y, s, a, rot = 0) {
    if (a <= 0.01) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x, y);
    ctx.rotate(rot);
    for (const [len, wd, aa, r0] of [[s, s * 0.06, a, 0], [s * 0.5, s * 0.05, a * 0.7, Math.PI / 4]]) {
      for (let k = 0; k < 2; k++) {
        ctx.save();
        ctx.rotate(k * Math.PI / 2 + r0);
        const g = ctx.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0, 'rgba(220,232,255,0)');
        g.addColorStop(0.5, `rgba(242,247,255,${aa})`);
        g.addColorStop(1, 'rgba(220,232,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-len, 0); ctx.lineTo(0, -wd); ctx.lineTo(len, 0); ctx.lineTo(0, wd); ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    E.glow(ctx, x, y, s * 0.8, '#DDE6FF', a * 0.5);
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

  // ---------------------------------------------------------------- sky (parallax layer)
  function drawSky(L, lt, cam) {
    // the real (big) world floats where s17 left it, luminous like a moon; the night is glazed over it
    // (multiply), lighter round the world — the same treatment as s17 so the cut matches
    E.camera(L, { x: 540, y: 960 + (cam.skyY - 960) * 0.22, zoom: 1 + (cam.zoom - 1) * 0.22 });
    const pnt = L.paint;
    const bx = 742, by = 300 + E.drift(lt, 2, 0.3) * 3, br = 140;
    PR.bigWorld(L, bx, by, br, { t: lt + 8, decor: 1, gateGlow: 0.8, rotSpeed: 0.025, rot: -0.12 + 0.2, aura: 0.9 });
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
    // wet-in-wet variation of the night wash
    bloom(pnt, 120, 260, 240, '#2A3460', { seed: 3, alpha: 0.35, soft: 60 });
    bloom(pnt, 90, 900, 300, '#3E3A66', { seed: 7, alpha: 0.25, soft: 70, irr: 0.3 });
    bloom(pnt, 980, 820, 240, '#2A3460', { seed: 4, alpha: 0.3, soft: 60 });
    lift(pnt, E.blob(540, 1040, 420, { seed: 5, irr: 0.3, rx: 700, ry: 150 }), 0.12, 70);
    E.glow(L.light, sx - R * 0.55, sy - R * 0.55, R * 0.9, '#C9D6FF', 0.12);
    // stars (lifted paper dots + twinkle), kept off the world
    const r = E.rng(1818);
    for (let i = 0; i < 56; i++) {
      const x = r() * 1080, y = r() * 980, s = 0.9 + r() * 1.9, ph = r() * 10, sp = 1.5 + r() * 2;
      if (Math.hypot(x - bx, y - by) < br * 1.7) continue;
      const tw = 0.55 + 0.45 * Math.sin(lt * sp + ph);
      lift(pnt, E.blob(x, y, s, { seed: i, irr: 0.1, n: 10 }), 0.62);
      if (s > 2.0) E.glow(L.light, x, y, s * 5, '#DCE5FF', 0.3 * tw);
    }
    // a thin night cloud drifting low
    PR.cloud(L, 140 + lt * 8, 760, 260, { tone: 'night', seed: 9, t: lt, alpha: 0.35 });
    return { sx, sy, R };
  }

  // little house + tree of his world on the far shoulder of the curve (tilted with the curvature)
  function drawHome(L, lt, mud) {
    const pnt = L.paint;
    const place = (x, fn) => {
      const y = arcY(x) + 3, ang = Math.asin((x - 540) / R);
      E.save(L); E.translate(L, x, y); E.rotate(L, ang); fn(); E.restore(L);
    };
    place(905, () => {
      const wall = E.rrect(-30, -40, 60, 40, 2);
      wash(pnt, wall, '#B9B6BE', { mode: 'over' });
      wash(pnt, E.rrect(8, -40, 22, 40, 1), '#5A6488', { alpha: 0.35 });
      const roof = new Path2D(); roof.moveTo(-38, -38); roof.lineTo(0, -70); roof.lineTo(38, -38); roof.closePath();
      wash(pnt, roof, '#7E5660', { mode: 'over' });
      wash(pnt, E.rrect(14, -78, 8, 18, 1), '#6C5258', { mode: 'over' });
      const lit = 1 - E.clamp(mud * 1.6);
      wash(pnt, E.rrect(-18, -30, 12, 12, 1), lit > 0.05 ? '#F0C77A' : '#4A4E66', { mode: 'over' });
      wash(pnt, E.rrect(-2, -24, 11, 24, 1), '#4A3C44', { mode: 'over' });
      if (lit > 0.05) E.glow(L.light, -12, -24, 40, '#FFD58E', 0.5 * lit);
      E.pencil(L.ink, wall, { w: 1, a: 0.25, double: false });
      E.pencil(L.ink, roof, { w: 1, a: 0.25, double: false });
    });
    place(975, () => PR.tree(L, 0, 0, 132, { kind: 'round', night: 1, t: lt, seed: 4, shadow: 0, sway: 0.5 }));
    place(150, () => PR.tree(L, 0, 0, 96, { kind: 'round', night: 1, t: lt, seed: 2, shadow: 0, sway: 0.5 }));
    place(98, () => PR.tree(L, 0, 0, 150, { kind: 'cypress', night: 1, t: lt, seed: 3, shadow: 0, sway: 0.3 }));
  }

  /** the spreading mud stain: a lobed ellipse round the plinth foot (its far half lies behind the horizon) */
  function mudStain(m, s) {
    const rx = (50 + 1950 * Math.pow(m, 1.25)) * s, ry = (14 + 1200 * Math.pow(m, 1.8)) * s;
    const cx = MX, cy = GY + 6;
    const pts = [];
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * E.TAU, ca = Math.cos(a), sa = Math.sin(a);
      // big tongues reaching down the slope at different speeds + a scalloped (cauliflower) wet edge
      const kx = 1 + 0.08 * E.fbm2(ca * 1.6 + 5, sa * 1.6 + 9, 21, 3);
      const ky = 1 + 0.6 * E.fbm2(ca * 2.8 + 11, sa * 2.8 + 4, 23, 3) + 0.06 * Math.pow(Math.abs(Math.sin(a * 15 + 0.6)), 0.5);
      pts.push([cx + ca * rx * kx, cy + sa * ry * Math.max(0.3, ky)]);
    }
    return E.smoothPath(pts, true);
  }

  // ---------------------------------------------------------------- the little world (ground → mud)
  function drawWorld(L, lt, mud, liquid, refl) {
    const pnt = L.paint;
    const path = worldPath(lt, liquid);
    eraseUnder(L, path);
    // ground body: moonlit slate meadow, deeper toward the bottom
    wash(pnt, path, '#5C716F', { mode: 'over', grad: { from: [0, GY - 20], to: [0, 1950], stops: [[0, '#71877F'], [0.1, '#5A6E6C'], [0.42, '#414E64'], [1, '#2F3852']] } });
    pnt.save();
    pnt.clip(path);
    const r = E.rng(77);
    for (let k = 0; k < 6; k++) {
      const off = 22 + k * 40 + r() * 12;
      const x0 = -140 + r() * 380, x1 = x0 + 260 + r() * 420;
      const pts = [];
      for (let x = x0; x <= x1; x += 22) pts.push([x, arcY(x) + off + Math.sin(x * 0.02 + k) * 5]);
      E.dryBrush(pnt, pts, k % 2 ? '#4A5F5C' : '#8AA096', { width: 14 + r() * 14, seed: 30 + k, alpha: 0.18, bristles: 8 });
    }
    // moonlit shoulder (left) and the shadow side (right)
    lift(pnt, arcBand(-240, 600, 2, 26), 0.26, 6);
    wash(pnt, arcBand(640, 1340, 0, 160), '#27304C', { alpha: 0.35, soft: 20 });
    bloom(pnt, 840, 1380, 300, '#2A3350', { seed: 12, alpha: 0.35, soft: 50 });
    bloom(pnt, 160, 1480, 260, '#3A3D5A', { seed: 13, alpha: 0.3, soft: 50 });
    // ---- mud: a dark wet stain spreading from the plinth over the world (a wet-in-wet bloom: the ground
    //      soaks and darkens just ahead of a lobed front, the clay follows; the front rolls toward us) ----
    if (mud > 0) {
      const mA = E.ep(mud, 0.25, 0.9);
      // soaked halo running ahead of the front
      wash(pnt, mudStain(mud, 1.09), '#262844', { alpha: 0.42 * (1 - 0.8 * mud), soft: 26 });
      const stain = mudStain(mud, 1);
      wash(pnt, stain, MUD, { mode: 'over', grad: { from: [0, GY - 20], to: [0, 1950], stops: [[0, '#5E4E50'], [0.06, '#4A3C44'], [0.38, '#30283A'], [1, '#211C2B']] } });
      pnt.save();
      pnt.clip(stain);
      // marbling of the clay (sepia / plum / indigo glazes)
      bloom(pnt, 260, 1250, 240, '#6A5040', { seed: 31, alpha: 0.3, soft: 30 });
      bloom(pnt, 820, 1220, 260, '#4E3E58', { seed: 32, alpha: 0.36, soft: 30 });
      bloom(pnt, 560, 1520, 320, '#1A1724', { seed: 33, alpha: 0.35, soft: 40 });
      bloom(pnt, 90, 1420, 200, '#5A4A52', { seed: 34, alpha: 0.22, soft: 30 });
      // light falling on the round wet shoulder (upper left) and the shadowed side
      wash(pnt, E.blob(260, GY + 120, 420, { seed: 41, irr: 0.15, rx: 560, ry: 230 }), '#6E6068', { mode: 'over', alpha: 0.34 * mA, soft: 60 });
      wash(pnt, E.blob(980, GY + 260, 400, { seed: 42, irr: 0.15, rx: 420, ry: 330 }), '#1C1824', { alpha: 0.35 * mA, soft: 60 });
      // glossy moonlit sheen: a broad soft reflection band + crisp broken highlights sliding slowly (viscous)
      const wav = (x) => liquid * Math.sin(x * 0.014 - lt * 1.7) * 4;
      wash(pnt, arcBand(-240, 600, 6, 90, 18, wav), '#9AA6CE', { mode: 'over', alpha: 0.36 * mA, soft: 18 });
      const hl = E.rng(52);
      for (let i = 0; i < 7; i++) {
        const xa = -180 + i * 112 + hl() * 40 + liquid * Math.sin(lt * 0.8 + i) * 10 + lt * 6, xb = xa + 50 + hl() * 70;
        const off = 10 + hl() * 16 + i * 2;
        lift(pnt, arcBand(xa, xb, off, off + 6 + hl() * 6, 10, wav), 0.58 * mA * (0.75 + 0.25 * Math.sin(lt * 2.2 + i * 1.3)), 2);
      }
      wash(pnt, arcBand(-120, 330, 120, 150, 18, wav), '#8C98C2', { mode: 'over', alpha: 0.2 * mA, soft: 14 });
      wash(pnt, arcBand(640, 1060, 6, 24, 18, wav), '#8692BE', { mode: 'over', alpha: 0.18 * mA, soft: 8 });
      // the far world mirrored in the wet clay: a soft pale-green smear just under the horizon, broken by the swell
      if (refl) {
        const rx = refl.x, ry = arcY(rx);
        wash(pnt, E.blob(rx, ry + 46, 50, { seed: 61, irr: 0.3, rx: 54, ry: 70 }), '#8FA39A', { mode: 'over', alpha: 0.22 * mA, soft: 30 });
        const rr = E.rng(62);
        for (let i = 0; i < 4; i++) {
          const yy = 8 + i * 13 + i * i * 3, ww = (34 - i * 6) * (0.6 + 0.4 * rr());
          const xx = rx + Math.sin(lt * 1.4 + i * 2.1) * (3 + i * 2) * (0.4 + liquid) + (rr() - 0.5) * 22;
          lift(pnt, E.blob(xx, arcY(xx) + yy + wav(xx), ww, { rx: ww, ry: 2.4, seed: i + 70, irr: 0.35, n: 14 }), 0.3 * mA * (1 - i / 5), 3);
        }
      }
      // thick clay creeping: long folds following the curve (dry brush, light and dark)
      const fr = E.rng(64);
      for (let k = 0; k < 6; k++) {
        const off = 70 + k * 62 + fr() * 30, x0 = -160 + fr() * 420, x1 = x0 + 300 + fr() * 460;
        const pts = [];
        for (let x = x0; x <= x1; x += 22) pts.push([x + lt * 4, arcY(x) + off + Math.sin(x * 0.017 + k * 1.7) * 6 + wav(x)]);
        E.dryBrush(pnt, pts, k % 2 ? '#1A1622' : '#6A5A62', { width: 10 + fr() * 12, seed: 80 + k, alpha: 0.2 * mA, bristles: 6 });
      }
      // grazing-angle sheen along the horizon (wet surface catching the sky) on the moonlit side
      lift(pnt, arcBand(-260, 760, 0, 5, 12, wav), 0.32 * mA, 1.5);
      pnt.restore();
      // the drying tide line of the front (pigment pooling at the wet edge)
      if (mud < 0.97) {
        pnt.save();
        pnt.globalCompositeOperation = 'multiply';
        pnt.globalAlpha *= 0.42 * (1 - mud);
        pnt.strokeStyle = '#1A1724';
        pnt.lineWidth = 5;
        pnt.stroke(stain);
        pnt.restore();
      }
    }
    pnt.restore();
    // a few grass tufts on the moonlit horizon (they go under as the clay comes)
    const ta = 1 - E.ep(mud, 0.05, 0.5);
    if (ta > 0.02) {
      const tr = E.rng(88);
      pnt.save();
      pnt.globalCompositeOperation = 'multiply';
      pnt.strokeStyle = '#34424A';
      pnt.lineCap = 'round';
      for (let x = -60; x < 1160; x += 34 + tr() * 30) {
        const n = 2 + Math.floor(tr() * 3), hgt = 7 + tr() * 9, sway = 0.12 * Math.sin(lt * 1.3 + x * 0.01);
        if (Math.abs(x - MX) < PW * 0.62) continue;
        const y0 = arcY(x) + 3, ang0 = Math.asin((x - 540) / R);
        pnt.globalAlpha = 0.55 * ta;
        pnt.lineWidth = 1.8;
        for (let j = 0; j < n; j++) {
          const a = ang0 + (j - (n - 1) / 2) * 0.32 + sway;
          pnt.beginPath();
          pnt.moveTo(x + j * 3, y0);
          pnt.quadraticCurveTo(x + j * 3 + Math.sin(a) * hgt * 0.4, y0 - hgt * 0.6, x + j * 3 + Math.sin(a) * hgt, y0 - Math.cos(a) * hgt);
          pnt.stroke();
        }
      }
      pnt.restore();
    }
    // pencil contour of the horizon (wavy once liquid)
    const top = [];
    for (let x = -120; x <= 1200; x += 28) top.push([x, arcY(x) + liquid * (Math.sin(x * 0.011 - lt * 1.6) * 3.0)]);
    E.pencil(L.ink, top, { w: 1.6, a: 0.3, seed: 4 });
    return path;
  }

  // ---------------------------------------------------------------- the monument
  // proud monument stance: chest out, chin up, fists planted on the hips (elbows back), weight on the back leg
  function proudPose(k) {
    const p = E.man.lerp(E.man.pose.stand(), E.man.pose.proud(1), k);
    p.lean = -0.1 * k;
    p.head = -0.2 * k;
    p.nS = 0.06 * (1 - k) - 0.5 * k; p.nE = 0.12 * (1 - k) + 1.25 * k; p.nW = -1.1 * k;
    p.fS = -0.04 * (1 - k) - 0.56 * k; p.fE = 0.14 * (1 - k) + 1.3 * k; p.fW = -1.1 * k;
    p.nH = 0.03 * (1 - k) + 0.11 * k; p.nK = 0.03 * (1 - k) + 0.01 * k;
    p.fH = -0.03 * (1 - k) - 0.09 * k; p.fK = 0.03;
    return p;
  }

  function drawMonument(L, lt, baseY, tilt, stoneG, pivotY) {
    E.save(L);
    E.translate(L, MX, pivotY);
    E.rotate(L, tilt);
    E.translate(L, -MX, -pivotY);
    const topY = baseY - PH;
    PR.pedestal(L, MX, topY, PW, PH, { night: 1, seed: 6, shadow: false, cracks: 3 });
    const k = E.ep(lt, K.pose0, K.pose1, 'inOutCubic');
    const pose = proudPose(k);
    pose.lean += 0.012 * Math.sin(lt * 2.3) * (1 - stoneG); // breathing, until the stone stills it
    const man = { x: MX, y: topY + 2, h: MH, view: 'side', facing: 1, pose, ...NIGHT_TINT };
    if (stoneG <= 0) E.man.draw(L, man);
    else PR.statue(L, man, { p: 1, grow: stoneG, night: 0.75, seed: 5, cracks: 3 });
    E.restore(L);
    return { topY };
  }

  // ---------------------------------------------------------------- draw
  function draw(L, lt) {
    const rise = E.ep(lt, K.rise0, K.rise1, 'outBackSoft');
    const sinkE = (x) => (x < 0.3 ? (x * x) / 0.3 * 0.5 : 0.15 + 0.85 * E.ease.outCubic((x - 0.3) / 0.7));
    const sinkA = E.ep(lt, K.sink0, K.sink1, sinkE);
    const sink = sinkA * (PH + KNEE) + Math.max(0, lt - K.sink1) * 9;
    // camera: slow push-in, lifts with the rise; from "dünyaya" it pushes in and settles on the sunken statue
    // (the move is complete at lt 3.9 so that s19's sky can start exactly where this one ends)
    const push = E.ep(lt, K.mud0, 3.9, 'inOutSine');
    const zoom = 1 + 0.045 * E.ease.inOutSine(E.clamp(lt / 2.6)) + 0.155 * push;
    const cy = 960 - 40 * E.ep(lt, K.rise0, K.rise1 + 0.5) + 62 * push;
    const cam = { x: 540 - 20 * push + 6 * E.drift(lt, 3, 0.4), y: cy + 5 * E.drift(lt, 8, 0.35), zoom, skyY: cy };
    const sk = drawSky(L, lt, cam);
    E.camera(L, cam);
    const pnt = L.paint;
    // moonlit haze just above the curve
    wash(pnt, E.smoothPath([[-240, arcY(-240) - 10], [540, GY - 110], [1320, arcY(1320) - 10], [1320, arcY(1320) + 40], [540, GY + 30], [-240, arcY(-240) + 40]], true), '#FFFFFF', { mode: 'over', alpha: 0.09, soft: 50 });

    const mud = E.ep(lt, K.mud0, K.mud1, 'inOutSine');
    const liquid = E.ep(lt, K.mud0 + 0.25, K.mud1 + 0.25);
    drawHome(L, lt, mud);

    const tilt = 0.06 * E.ep(lt, K.sink0 + 0.1, K.sink1 + 0.4, 'inOutCubic') + 0.005 * Math.sin(lt * 2.1) * liquid;
    const stoneG = E.ep(lt, K.st0, K.st1, 'inOutSine');
    const baseY = GY + 14 + (PH + 30) * (1 - rise) + sink;
    const mon = drawMonument(L, lt, baseY, tilt, stoneG, GY);
    drawWorld(L, lt, mud, liquid, { x: cam.x + (sk.sx - 540) / cam.zoom });

    // contact shadow on the dry ground
    const sh = (1 - mud) * E.clamp(rise * 1.2);
    if (sh > 0.01) wash(pnt, E.blob(MX + 50, GY + 7, 150, { rx: PW * 0.78, ry: 13, seed: 4, irr: 0.08 }), '#1E2440', { alpha: 0.5 * sh, soft: 9 });
    // the plinth pushing up: crumbs of soil falling off its top edge, a faint dust puff
    if (lt > K.rise0 && lt < K.rise1 + 0.7) {
      const dr = E.rng(33);
      for (let i = 0; i < 12; i++) {
        const t0 = K.rise0 + 0.05 + dr() * 0.35, x0 = MX + (dr() - 0.5) * PW * 1.05, vx = (x0 - MX) * (1.2 + dr()), sz = 2.5 + dr() * 3.5;
        const tau = lt - t0;
        if (tau <= 0) continue;
        const y0 = baseY - PH - 2 + (lt - t0) * 0; // leaves the top edge at its height when it starts
        const yStart = GY + PH * (1 - E.ep(t0, K.rise0, K.rise1, 'outBackSoft')) - PH;
        const x = x0 + vx * tau, y = yStart - 60 * tau + 0.5 * 2600 * tau * tau;
        if (y > arcY(x) + 2 || y0 !== y0) continue;
        wash(pnt, E.blob(x, y, sz, { seed: i + 3, irr: 0.25, n: 10 }), '#3C4652', { mode: 'over' });
      }
      const pu = E.seg(lt, K.rise0, K.rise1 + 0.7);
      lift(pnt, E.blob(MX, GY - 8, 100, { rx: PW * (0.55 + pu * 0.6), ry: 26 + pu * 30, seed: 6, irr: 0.3 }), 0.16 * Math.sin(Math.PI * pu), 24);
    }
    // mud: clinging lip round the sunken monument, rings, bubbles, flying drops
    if (mud > 0.05) {
      const legs = E.ep(sink, PH - 40, PH + 20);
      const lipW = E.lerp(PW * 0.64, 96, legs);
      const lipH = 6 + 18 * E.clamp(sinkA * 1.6);
      const lx = MX + Math.sin(tilt) * 10;
      const lip = E.smoothPath([[lx - lipW * 1.25, GY + 6], [lx - lipW * 0.8, GY - lipH * 0.25], [lx - lipW * 0.45, GY - lipH * 0.95], [lx, GY - lipH * 1.1], [lx + lipW * 0.45, GY - lipH * 0.9], [lx + lipW * 0.8, GY - lipH * 0.2], [lx + lipW * 1.25, GY + 7], [lx, GY + 16]], true);
      eraseUnder(L, lip);
      wash(pnt, lip, '#4A3E3D', { mode: 'over', alpha: E.clamp(mud * 1.4) });
      wash(pnt, lip, '#2C2530', { alpha: 0.5, grad: { from: [lx - lipW, 0], to: [lx + lipW, 0], stops: [[0, 'rgba(0,0,0,0)'], [0.5, 'rgba(44,37,48,0.2)'], [1, 'rgba(44,37,48,0.9)']] } });
      pnt.save();
      pnt.globalCompositeOperation = 'source-over';
      pnt.globalAlpha *= 0.4 * mud;
      pnt.strokeStyle = MUDHI;
      pnt.lineWidth = 3.2;
      pnt.lineCap = 'round';
      pnt.stroke(E.smoothPath([[lx - lipW * 0.95, GY - lipH * 0.15], [lx - lipW * 0.55, GY - lipH * 0.8], [lx - lipW * 0.1, GY - lipH * 1.02]]));
      pnt.restore();
      E.pencil(L.ink, E.smoothPath([[lx - lipW * 1.2, GY + 5], [lx - lipW * 0.5, GY - lipH * 0.9], [lx + lipW * 0.5, GY - lipH * 0.85], [lx + lipW * 1.2, GY + 6]]), { w: 1.3, a: 0.3 });
      // mud smeared up the legs once they enter (dark glaze just above the lip), a sucking hollow round them
      if (legs > 0) {
        const lg = E.clamp(legs * 1.4);
        const sm = E.smoothPath([[lx - 40, GY - lipH + 4], [lx - 34, GY - lipH - 16 * lg], [lx - 20, GY - lipH - 9 * lg], [lx - 4, GY - lipH - 26 * lg], [lx + 12, GY - lipH - 12 * lg], [lx + 28, GY - lipH - 20 * lg], [lx + 44, GY - lipH + 4]], true);
        wash(pnt, sm, '#463A3C', { mode: 'over', alpha: 0.9 * lg });
        wash(pnt, sm, '#2A2430', { alpha: 0.45 * lg, grad: { from: [0, GY - lipH - 26], to: [0, GY - lipH], c2: '#463A3C' } });
        lift(pnt, E.blob(lx - 24, GY - lipH - 6 * lg, 3, { rx: 3, ry: 7 * lg + 1, seed: 7, irr: 0.2, n: 12 }), 0.5 * lg);
        lift(pnt, E.blob(lx + 6, GY - lipH - 12 * lg, 2.5, { rx: 2.5, ry: 8 * lg + 1, seed: 8, irr: 0.2, n: 12 }), 0.4 * lg);
        E.splatter(pnt, lx, GY - lipH - 60, 46, '#3A3036', { seed: 31, n: 9, size: 3.2, alpha: 0.7 * lg });
        E.pencil(L.ink, sm, { w: 1.1, a: 0.28 * lg, double: false });
      }
      // rings spreading from the sinking monument (the far halves are hidden behind the curve)
      const wp = worldPath(lt, liquid);
      pnt.save(); pnt.clip(wp);
      for (const [t0, s] of [[K.sink0 + 0.05, 1], [K.sink0 + 0.4, 0.8], [K.sink0 + 0.78, 0.65], [K.sink1 + 0.4, 0.5]]) {
        const u = (lt - t0) / 1.35;
        if (u <= 0 || u >= 1) continue;
        const rr = 110 + u * 520 * s;
        const a = (1 - u) * (1 - u) * 0.75;
        ring(pnt, MX, GY + 4 + u * 18, rr, rr * 0.11, MUDHI, 3.4 - u * 1.5, a);
        ring(pnt, MX, GY + 9 + u * 18, rr * 1.01, rr * 0.11, '#1C1824', 3, a * 0.6, 'multiply');
      }
      pnt.restore();
      // slow bubbles rising through the clay and popping
      for (const [bx, t0, br] of [[MX + 240, K.sink0 + 0.5, 14], [MX - 210, K.sink1 + 0.05, 11], [MX + 130, K.sink1 + 0.45, 9], [MX - 110, K.mud1 - 0.2, 8], [MX + 330, K.sink1 + 0.8, 10]]) {
        const u = (lt - t0) / 0.55;
        if (u <= 0 || u > 1.6) continue;
        const by = arcY(bx) + 10;
        if (u < 1) {
          const r0 = br * E.ease.outCubic(u);
          const dome = new Path2D();
          dome.ellipse(bx, by, r0, r0 * 0.8, 0, Math.PI, 0);
          dome.closePath();
          wash(pnt, dome, '#54474A', { mode: 'over' });
          lift(pnt, E.blob(bx - r0 * 0.35, by - r0 * 0.45, r0 * 0.22, { seed: 3, irr: 0.1, n: 12 }), 0.7);
          E.pencil(L.ink, dome, { w: 1, a: 0.25, double: false });
        } else {
          const v = (u - 1) / 0.6;
          ring(pnt, bx, by, br * (1 + v * 2.2), br * 0.3 * (1 + v * 2.2), MUDHI, 2, (1 - v) * 0.55);
        }
      }
      // mud drops thrown up by the sinking plinth
      const dr = E.rng(185);
      for (let i = 0; i < 11; i++) {
        const t0 = K.sink0 + 0.03 + dr() * 0.16;
        const vx = (dr() - 0.5) * 560, vy = 420 + dr() * 380, sz = 3.5 + dr() * 5;
        const x0 = MX + (dr() - 0.5) * PW * 0.9;
        const tau = lt - t0;
        if (tau <= 0) continue;
        const x = x0 + vx * tau, y = GY - 4 - vy * tau + 0.5 * 2300 * tau * tau;
        if (y > arcY(x) + 4) continue;
        wash(pnt, E.blob(x, y, sz, { seed: i, irr: 0.25, n: 12, rx: sz * 0.85, ry: sz * 1.2 }), '#3A303A', { mode: 'over' });
      }
    }
    // the night closes in as he sinks (vignette glaze in screen space)
    const vg = E.ep(lt, K.mud0, K.sink1 + 0.6, 'inOutSine');
    if (vg > 0) {
      pnt.save();
      pnt.setTransform(1, 0, 0, 1, 0, 0);
      const g = pnt.createRadialGradient(540, 820, 300, 540, 900, 1250);
      g.addColorStop(0, 'rgba(30,36,66,0)');
      g.addColorStop(1, `rgba(24,28,52,${0.45 * vg})`);
      pnt.globalCompositeOperation = 'multiply';
      pnt.fillStyle = g;
      pnt.fillRect(0, 0, E.W, E.H);
      pnt.restore();
    }
    // cold glint running up the polished stone ("ederek")
    const head = [MX + 10, mon.topY - MH * 0.9];
    const gl = E.ep(lt, K.glint, K.glint + 0.16, 'outCubic') * (1 - E.ep(lt, K.glint + 0.22, K.glint + 0.85, 'inOutSine'));
    sparkle(L.light, head[0] - 26, head[1] - 4, 54, 0.95 * gl, 0.2);
    const su = E.seg(lt, K.glint - 0.32, K.glint + 0.05);
    if (su > 0 && su < 1) sparkle(L.light, MX - 18 + su * 20, mon.topY - MH * (0.1 + 0.72 * E.ease.inOutSine(su)), 24, 0.55 * Math.sin(Math.PI * su), 0.6);
  }

  E.scene('s18', {
    draw,
    wc: [1, 1.05, 3, 0.55],
    sfx() {
      return [
        { t: T0 + K.rise0 + 0.02, type: 'stone', gain: 0.32 },
        { t: T0 + K.st0 + 0.05, type: 'stone', gain: 0.24, pitch: 0.8 },
        { t: T0 + K.glint, type: 'chime', gain: 0.15, pitch: 1.6 },
        { t: T0 + K.mud0 + 0.05, type: 'rumble', gain: 0.32, dur: 1.6 },
        { t: T0 + K.sink0 + 0.05, type: 'water', gain: 0.22 },
        { t: T0 + K.sink0 + 0.55, type: 'bubbles', gain: 0.15, dur: 1.0 },
      ];
    },
  });
})();
