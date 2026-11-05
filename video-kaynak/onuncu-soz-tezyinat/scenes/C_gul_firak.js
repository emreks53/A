/* =============================================================================
 * C_gul_firak · 6.40–11.80 · "Çünkü bir zaman lezzet verse, firakıyla birçok zaman elem verir."
 * =============================================================================
 * PLAN — same garden world as B (window.BCW), camera locked on the hero rose (screen (540,820), R≈260).
 *  6.40–6.70  identical frames to B (BCW.frameB) → invisible hand-off.
 *  6.70–7.04  settle; dusk sky, sun half behind the far hills to the right of the rose (back-light).
 *  7.04 "Çünkü"   warm rim light #FFB37A wraps the right petals (silhouette crescent, screen blend).
 *  7.36–7.80 "bir zaman"  sundial shadow on the meadow turns 40°.   7.80 "lezzet"  golden pulse + ribbons.
 *  8.28 "verse"   bee lifts off and exits right.
 *  8.62–9.10      6 attachment filaments draw from the rose heart to the left/right frame edges (y ≤ 1180).
 *  9.14–9.62 "firakıyla"  filaments snap one by one (spark bursts); on the 3rd snap the outer petals tear
 *                 away up-left, ONE hero petal stays hovering (screen ≈ (720,905)); stem kicks 12°;
 *                 −0.25 EV; pull-back z 1.15→1.05, roll −3°→+2°, decaying shake.
 *  9.78–10.44 "birçok zaman"  time-lapse: shadow spins 3 turns, clouds race, sun gone, sky → night (stars),
 *                 rose wilts (0→0.85), stem droops, fallen petals settle on the soil.
 *  10.46 "elem"   cold ripple ring on the ground from the base, head bows, dew drop gathers at the tip.
 *  10.84 "verir"  dew drop falls onto the hero petal; the petal falls, camera tracks it (locked (540,880)).
 *  11.20–11.80    world dissolves into D's plum; a warm side-light shaft sweeps up past the petal; petal
 *                 (with the dew) morphs (128-pt) into the honey drop r 26 #FFB547/#FFE7A0; dim bowl rim rises.
 * ========================================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth, H = E.hash;
  const W = window.BCW;
  const T_HAND = 6.70, T_SNAP0 = 9.14, SNAP_DT = 0.096, T_DETACH = T_SNAP0 + 2 * SNAP_DT;
  const DROP = [540, 880], DROP_R = 26;
  const css = W.css, mx = W.mx, RG = W.RG, LG = W.LG;

  /* ---------------- camera ---------------- */
  function zcC(t) {
    let z = lerp(1, 1.15, E.p(t, 7.0, T_SNAP0, 'inOutSine'));
    z = lerp(z, 1.05, E.p(t, T_SNAP0, 9.62, 'outCubic'));
    z = lerp(z, 1.10, E.p(t, 9.62, 10.8, 'inOutSine'));
    z = lerp(z, 1.32, E.p(t, 10.8, 11.8, 'inOutSine'));
    return z;
  }
  function camC(t, hx) {
    const d = W.drift(t), z = 2.6 * zcC(t);
    const c = { x: 540, y: 820 + 140 / z, z, zo: 1, ox: 540, oy: 960, rot: d.rot, sx: d.sx, sy: d.sy };
    if (hx) { const f = 0.55 * E.p(t, 9.6, 10.7, 'inOutSine'); c.x += hx.tip.x * f; c.y += (W.ROSE_BASE[1] + hx.tip.y - 820) * f; }
    let roll = lerp(0, -3, E.p(t, 7.0, T_SNAP0, 'inOutSine'));
    roll = lerp(roll, 2, E.p(t, T_SNAP0, 9.62, 'outCubic'));
    roll = lerp(roll, 0, E.p(t, 9.9, 11.2, 'inOutSine'));
    c.rot += (roll * PI) / 180;
    if (t > T_DETACH) { const k = t - T_DETACH, e = Math.exp(-k * 9); c.sx += 4 * e * Math.sin(k * 63); c.sy += 3 * e * Math.cos(k * 71); }
    c.y += 380 * E.p(t, 10.95, 11.75, 'inOutCubic');
    return c;
  }
  const nightC = (t) => 0.22 * E.p(t, T_HAND, 9.7, 'inOutSine') + 0.78 * E.p(t, 9.78, 10.44, 'inOutSine');
  const wiltC = (t) => 0.85 * E.p(t, 9.78, 10.44, 'inOutSine');

  /* ---------------- hero petal / detach ---------------- */
  let HERO = 2, HERO_M = [60, 20], HERO_ANG = 0;
  function pickHero() {
    const G = A._roseGeom({ R: W.ROSE_R, bloom: 1, t: 9.3 }, 2);
    let best = -1e9;
    for (const p of G.petals) {
      if (p.sepal || p.k !== 0) continue;
      const sc = p.M[0] + 0.6 * p.M[1];
      if (sc > best) { best = sc; HERO = p.i; HERO_M = [p.M[0], p.M[1]]; HERO_ANG = Math.atan2(p.T[1] - p.B[1], p.T[0] - p.B[0]); }
    }
  }
  const detFn = (t) => (i, k) => {
    if (k !== 0) return 0;
    if (i === HERO) return t >= T_DETACH ? 1 : 0;
    return clamp((t - T_DETACH - H(i, 77) * 0.12) / 1.3);
  };

  function headXf(t, ttw) {
    const wilt = wiltC(t), bend = 0.21 * (t > T_DETACH ? E.ease.spring(clamp((t - T_DETACH) / 1.4)) : 0);
    const stemWilt = wilt * 0.5, tip = W.roseTip(ttw, { wilt: stemWilt, bend });
    const bow = 0.22 * E.p(t, 10.38, 10.9, 'outBack') * (1 - 0.3 * E.p(t, 10.9, 11.6));
    const ang = tip.angle + bow, ca = Math.cos(ang), sa = Math.sin(ang);
    return { wilt, stemWilt, bend, bow, tip, toWorld: (x, y) => [W.ROSE_BASE[0] + tip.x + x * ca - y * sa, W.ROSE_BASE[1] + tip.y + x * sa + y * ca] };
  }

  /** hero petal screen state {x, y, R (screen), rot, flip} — hovers below the drooping head, then falls (camera-locked) */
  const HOVER = [705, 1095];
  function heroPetal(t, c, hx, ttw) {
    if (t < T_DETACH) return null;
    const z = W.zoomAt(c, 1);
    const sp = W.toScreen(c, 1, ...hx.toWorld(HERO_M[0], HERO_M[1]));
    const hv = [HOVER[0] + c.sx + Math.sin(ttw * 1.7) * 9, HOVER[1] + c.sy + Math.sin(ttw * 1.3 + 1) * 10];
    const u = E.p(t, T_DETACH, 10.05, 'inOutCubic');
    let x = lerp(sp[0], hv[0], u) + Math.sin(u * PI) * 70, y = lerp(sp[1], hv[1], u) - Math.sin(u * PI) * 60;
    let rot = lerp(HERO_ANG + PI / 2, 0.32, u) + Math.sin(ttw * 1.9) * 0.1 * u;
    let flip = Math.cos(u * TAU);
    let R = W.ROSE_R * z * lerp(1, 0.74, u);
    // tear lands (10.97): small dip; then the fall — blend to the locked screen point, flutter, shrink
    const hit = t - 10.97; if (hit > 0) y += 14 * Math.exp(-hit * 7) * Math.sin(hit * 18);
    y += 150 * E.p(t, 10.98, 11.18, 'inQuad') * (1 - E.p(t, 11.18, 11.5, 'inOutSine'));
    const f = E.p(t, 11.05, 11.45, 'inOutSine');
    if (f > 0) {
      const mk = E.p(t, 11.28, 11.5, 'inOutSine');
      x = lerp(x, DROP[0] + Math.sin(t * 2.6) * 22 * (1 - mk), f); y = lerp(y, DROP[1] + Math.sin(t * 3.4) * 8 * (1 - mk), f);
      const fl = Math.sin((t - 10.98) * 4.4);
      rot = lerp(rot, 0.2 + 0.5 * fl, f); rot = lerp(rot, -0.55, mk);
      flip = lerp(flip, 0.35 + 0.65 * Math.cos((t - 10.98) * 4.8), f); flip = lerp(flip, 1, mk);
      R = lerp(lerp(R, 170, E.p(t, 10.98, 11.3, 'inOutSine')), 92, mk);
    }
    return { x, y, R, rot, flip };
  }

  let PSIL = null;
  const petalSilD = () => { if (!PSIL) { const P = A.petalSilhouette(92), ca = Math.cos(-0.55), sa = Math.sin(-0.55); PSIL = A.resample(P.map(([x, y]) => [x * ca - y * sa, x * sa + y * ca]), 128); } return PSIL; };
  let TSIL = null;
  /** honey drop (point up) at (x,y); k 0 = petal shape/colour → 1 = drop (same contract as D) */
  function drawDrop(ctx, x, y, r, k, t) {
    if (!TSIL) TSIL = A.teardropSilhouette(r);
    const pts = k >= 1 ? TSIL : A.lerpShape(petalSilD(), TSIL, A.morphEase(k));
    const wob = 0.045 * Math.sin(t * TAU * 5.5) * k;
    ctx.save();
    S.light(ctx, x, y + r * 0.2, r * 5.2, '#FFB547', 0.3 * k + 0.08);
    ctx.translate(x, y); ctx.scale(1 + wob, 1 - wob);
    ctx.fillStyle = E.rad(ctx, -r * 0.28, r * 0.25, 0, r * 1.7, [[0, E.mix('#FFD1DC', '#FFF1C0', k)], [0.32, E.mix('#F7A3B5', '#FFE7A0', k)], [0.68, E.mix('#F28BA0', '#FFB547', k)], [1, E.mix('#C2185B', '#D07A16', k)]]);
    A.fillShape(ctx, pts);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, r * 0.1, r * 0.35, 0, r * 0.9, [[0, '#FFE7A0', 0.55 * k], [1, '#FFE7A0', 0]]); ctx.beginPath(); ctx.arc(r * 0.1, r * 0.35, r * 0.9, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.rect(r * 0.15, -r * 3, r * 2, r * 6); ctx.clip(); ctx.strokeStyle = 'rgba(255,244,214,0.75)'; ctx.lineWidth = Math.max(1.2, r * 0.08); A.strokeShape(ctx, pts); ctx.restore();
    ctx.globalAlpha *= sm(k * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.05, r * 0.13, r * 0.33, 0.32, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.55, r * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function teardropFill(ctx, pts, k, scale) {
    // pink petal → honey drop gradient
    let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx /= pts.length; cy /= pts.length;
    const r = 34 * scale;
    ctx.fillStyle = addSt(ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.2, 0, cx, cy, r * 1.25), [[0, mx('#FFD3DC', '#FFF3C4', k)], [0.35, mx('#F7A3B4', '#FFE7A0', k)], [0.75, mx('#F28BA0', '#FFB547', k)], [1, mx('#C9506E', '#E08A1E', k)]]);
    A.fillShape(ctx, pts);
  }
  function addSt(g, st) { for (const s of st) g.addColorStop(s[0], css(s[1])); return g; }

  /* ---------------- filaments ---------------- */
  const FIL_ENDS = [[-40, 905], [-40, 1035], [-40, 1165], [1120, 935], [1120, 1060], [1120, 1180]];
  const SNAP_ORDER = [0, 3, 1, 4, 2, 5];
  function filaments(ctx, t, src) {
    if (t < 8.6 || t > 10.4) return;
    FIL_ENDS.forEach((e, i) => {
      const order = SNAP_ORDER.indexOf(i);
      const draw = E.p(t, 8.62 + i * 0.075, 8.62 + i * 0.075 + 0.42, 'outCubic');
      const snap = clamp((t - (T_SNAP0 + order * SNAP_DT)) / 0.75);
      if (draw <= 0 || snap >= 1) return;
      const s0 = [src[0] + (i < 3 ? -1 : 1) * (14 + 10 * (i % 3)), src[1] + 10 + 8 * (i % 3)];
      const sag = 120 + 40 * (i % 3) + 12 * Math.sin(t * 1.3 + i);
      const pts = [s0, [lerp(s0[0], e[0], 0.25), lerp(s0[1], e[1], 0.25) + sag * 0.75], [lerp(s0[0], e[0], 0.6), lerp(s0[1], e[1], 0.6) + sag * 0.8], e];
      A.filament(ctx, pts, { t, w: 1.8, halo: 9, col: '#FFD98A', flow: 70, draw, snap, breakAt: 0.42 + 0.16 * H(i, 5), seed: 11 + i });
    });
  }

  /* ---------------- ground shadow (sundial) ---------------- */
  function sundial(l, c, t, hx, night) {
    const day = 1 - sm((night - 0.5) / 0.4);
    const [bx0, by0] = W.toScreen(c, 1, W.ROSE_BASE[0], W.ROSE_BASE[1]), zz = W.zoomAt(c, 1);
    // warm low-sun light pooled on the meadow around the rose (makes the shadow readable)
    if (day > 0.01) { l.save(); l.globalCompositeOperation = 'screen'; l.translate(bx0 + 40 * zz, by0); l.scale(1, 0.3); l.fillStyle = RG(l, 0, 0, 0, 260 * zz, [[0, '#FFB37A', 0.34 * day], [0.6, '#FF9D7A', 0.12 * day], [1, '#FF9D7A', 0]]); l.fillRect(-300 * zz, -300 * zz, 600 * zz, 600 * zz); l.restore(); }
    // contact soil under the stem (#2A1E2E) with a dark core
    l.save(); l.translate(bx0, by0 + 4 * zz); l.scale(1, 0.32); l.fillStyle = RG(l, 0, 0, 0, 46 * zz, [[0, '#1C1420', 0.85], [0.5, '#2A1E2E', 0.6], [1, '#2A1E2E', 0]]); l.fillRect(-50 * zz, -50 * zz, 100 * zz, 100 * zz); l.restore();
    const a = 0.62 * day;
    if (a <= 0.01) return;
    const th = -1.2 + 0.7 * E.p(t, 7.3, 7.86, 'inOutSine') + 6 * PI * E.p(t, 9.78, 10.44, 'inCubic');
    const len = 210 * (1 + 0.25 * E.p(t, 7.3, 9.6));
    W.lay(l, c, 1, () => {
      const bx = W.ROSE_BASE[0], by = W.ROSE_BASE[1] + 3, dx = Math.sin(th), dy = Math.cos(th) * 0.3;
      const ex = bx + dx * len, ey = by + dy * len, nx = -dy, ny = dx, wb = 3, we = 6;
      l.fillStyle = css('#1A1428', a);
      l.beginPath(); l.moveTo(bx + nx * wb, by + ny * wb); l.lineTo(ex + nx * we, ey + ny * we); l.lineTo(ex - nx * we, ey - ny * we); l.lineTo(bx - nx * wb, by - ny * wb); l.closePath(); l.fill();
      // the head's shadow: a scalloped blob
      l.save(); l.translate(bx + dx * len * 1.2, by + dy * len * 1.2); l.rotate(Math.atan2(dy, dx)); l.scale(1, 0.5 + 0.5 * Math.abs(Math.cos(th)));
      l.beginPath(); for (let i = 0; i < 7; i++) { const aa = (i / 7) * TAU; l.moveTo(Math.cos(aa) * 34 + 26, Math.sin(aa) * 22); l.arc(Math.cos(aa) * 34, Math.sin(aa) * 22, 26, 0, TAU); } l.fill(); l.restore();
    });
  }
  /* fallen petals on the soil (time-lapse) */
  const FALLEN = [[492, 1160, 0.4, 1], [596, 1166, -0.6, -1], [452, 1176, 1.9, 1], [632, 1156, 2.6, 1], [548, 1182, -1.2, -1]];
  function fallen(l, c, t, ttw) {
    W.lay(l, c, 1, () => {
      FALLEN.forEach(([x, y, r, fl], i) => {
        const t0 = 9.9 + i * 0.1, e = E.p(t, t0, t0 + 0.28, 'outCubic');
        if (e <= 0) return;
        l.save(); l.translate(x, y - (1 - e) * 26); l.scale(1, lerp(0.8, 0.5, e)); l.globalAlpha = sm(e * 2);
        A.heroPetal(l, { R: 46, t: ttw, wilt: 0.75, rot: r + (1 - e) * 0.8, flip: fl });
        l.restore();
      });
    });
  }

  /* ---------------- rim light on the right petals ---------------- */
  function rimLight(ctx, c, hx, a) {
    if (a <= 0.01) return;
    const sil = A.heroRoseSilhouette(W.ROSE_R, 1);
    const pts = sil.map((p) => W.toScreen(c, 1, ...hx.toWorld(p[0] * 1.012, p[1] * 1.012)));
    const z = W.zoomAt(c, 1), off = 0.075 * W.ROSE_R * z;
    E.layer(ctx, (l) => {
      l.fillStyle = css('#FFB37A'); A.fillShape(l, pts);
      l.globalCompositeOperation = 'destination-out'; A.fillShape(l, pts.map((p) => [p[0] - off, p[1] + off * 0.35]));
    }, { lo: true, blur: 3, op: 'lighter', alpha: 0.8 * a });
    // warm wash on the right half of the head
    const [cx, cy] = W.toScreen(c, 1, ...hx.toWorld(0, -0.16 * W.ROSE_R));
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = RG(ctx, cx + 230, cy + 40, 0, 330, [[0, '#FFB37A', 0.75 * a], [1, '#FFB37A', 0]]); ctx.fillRect(cx - 200, cy - 400, 800, 800); ctx.restore();
  }

  /* ---------------- dew drop ---------------- */
  function dewDraw(ctx, x, y, r, a, stretch = 1) {
    if (a <= 0.01 || r < 0.5) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(1, stretch);
    const pts = A.teardropPts(r, 64, 1.55);
    ctx.fillStyle = css('#A9D4FF', 0.5 * a); A.fillShape(ctx, pts);
    ctx.strokeStyle = css('#E6F3FF', 0.85 * a); ctx.lineWidth = Math.max(1, r * 0.12); A.strokeShape(ctx, pts);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = css('#FFFFFF', 0.9 * a); ctx.beginPath(); ctx.ellipse(-r * 0.32, -r * 0.25, r * 0.22, r * 0.34, -0.4, 0, TAU); ctx.fill();
    S.light(ctx, 0, 0, r * 3.2, '#A9D4FF', 0.35 * a);
    ctx.restore();
  }

  /* ---------------- frame ---------------- */
  function frameC(ctx, t) {
    const ttw = W.tw(t), hx = headXf(t, ttw), c = camC(t, hx), night = nightC(t), P = W.palAt(1, night);
    const z = W.zoomAt(c, 1);
    const sunY = lerp(930, 1015, E.p(t, T_HAND, 9.9, 'inOutSine')), sunA = 1 - E.p(t, 8.9, 10.1, 'inOutSine');
    const tc = ttw + 70 * E.p(t, 9.78, 10.44, 'inOutSine');
    const gk = W.glossK(t), fallK = E.p(t, 11.0, 11.78, 'inOutSine');
    const rimA = E.p(t, 6.98, 7.3, 'outCubic') * (1 - E.p(t, 9.0, 9.4, 'inOutSine'));
    const head = (x, y) => W.toScreen(c, 1, ...hx.toWorld(x, y));
    const heart = head(0, -0.18 * W.ROSE_R);
    const dofBack = lerp(3.5, 5, E.p(t, 7, 9)) , dofFront = 9 + 3 * E.p(t, 10.8, 11.4);
    W.drawWorld(ctx, {
      cam: c, P, t: ttw, tc, sunX: W.SUN0[0], sunY, sunA, wave: 99, dusk: 1, tint: lerp(0.85, 1, night),
      dof: { back: dofBack, front: dofFront, near: 6 }, stars: night * night, cloudA: 1 - 0.4 * night,
      pathDim: 0.6 * E.p(t, 6.72, 7.6, 'inOutSine'), bandDim: gk,
      afterBack: (l) => { sundial(l, c, t, hx, night); fallen(l, c, t, ttw); },
      onRose: (ctx2) => {
        // golden sweetness pulse
        const pulse = E.env(t, 7.74, 9.1, 0.18, 0.7) * lerp(0.72, 0.42, E.p(t, 8.0, 8.45));
        if (pulse > 0.01) S.light(ctx2, heart[0], heart[1], 380 * z / 2.6, '#FFD98A', pulse);
        // the sun just behind the right petals keeps a warm halo while it sets
        W.drawRose(ctx2, c, {
          t: ttw, bloom: 1, wilt: hx.wilt, stemWilt: hx.stemWilt, bend: hx.bend, bow: hx.bow,
          rose: { detach: detFn(t), detachDist: 6.5, detachDir: -2.35, heroIndex: 99 },
          onHead: (hctx) => { if (t < 8.28) W.drawBee(hctx, { fly: 0, off: [0, 0], flip: true, rot: 0.06 * Math.sin(ttw * 2) }, null, ttw); },
        });
        rimLight(ctx2, c, hx, rimA);
        W.ribbons(ctx2, heart[0], heart[1] - 30, ttw, 7.80, z / 2.6 * 0.95, 0.75, 5, 0.85);
      },
      fg: false,
    });
    // bee lifts off at "verse" and exits right
    if (t >= 8.28 && t < 9.4) {
      const sp = head(W.BEE_SPOT[0], W.BEE_SPOT[1]), u = t - 8.28;
      const x = sp[0] + 900 * E.p(t, 8.4, 9.1, 'inQuad') + Math.sin(u * 9) * 6, y = sp[1] - 70 * E.p(t, 8.28, 8.5, 'outCubic') - 220 * E.p(t, 8.45, 9.1, 'inOutSine') + Math.sin(u * 13) * 4;
      E.at(ctx, x, y, z, -0.12 * E.p(t, 8.4, 8.7), () => A.bee(ctx, { size: 40, t: ttw, flip: t < 8.36, hover: true }));
    }
    // attachment filaments (screen space: they run to "you", beyond the frame)
    filaments(ctx, t, heart);
    // cold ripple ("elem") on the ground from the base
    const rk = (t - 10.44) / 1.3;
    if (rk > 0 && rk < 1) {
      const [bx, by] = W.toScreen(c, 1, W.ROSE_BASE[0], W.ROSE_BASE[1]), r = 30 + E.ease.outCubic(rk) * 640, a = 0.4 * (1 - rk) * sm(rk * 8);
      ctx.save(); ctx.translate(bx, by); ctx.scale(1, 0.27);
      ctx.strokeStyle = css('#7FA8FF', a * 0.35); ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = css('#BFD4FF', a); ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      // a fainter echo around the bowed head
      const [qx, qy] = heart, r2 = 40 + E.ease.outCubic(rk) * 520;
      ctx.save(); ctx.strokeStyle = css('#7FA8FF', a * 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(qx, qy, r2, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // exposure −0.25 EV after the tear
    const ev = E.p(t, T_DETACH - 0.03, T_DETACH + 0.2, 'outCubic');
    if (ev > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = ev; ctx.fillStyle = '#D2CCD8'; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    // night: cool moon-wash from the upper left
    if (night > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = RG(ctx, 140, 260, 0, 1100, [[0, '#7FA8FF', 0.14 * night], [1, '#7FA8FF', 0]]); ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    // pollen (fades with the light)
    W.drawPollen(ctx, c, ttw, 0.6 * (1 - E.p(t, 8.6, 9.8)), gk);
    // fall: dissolve to D's plum
    if (fallK > 0) {
      ctx.save(); ctx.globalAlpha = fallK;
      ctx.fillStyle = LG(ctx, 0, 0, 0, 1920, [[0, '#2A1633'], [0.5, '#4A2346'], [1, '#6E3448']]); ctx.fillRect(0, 0, 1080, 1920);
      ctx.restore();
      // drifting dark motes for fall speed (moving up)
      ctx.save(); ctx.globalAlpha = fallK * 0.5; ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const sp = 500 + 500 * H(i, 3), y = ((H(i, 1) * 2200 - (t - 10.9) * sp) % 2200 + 2200) % 2200 - 140, x = H(i, 2) * 1080;
        if (y > 1180 && y < 1600) continue;
        const r = 1.5 + 2.5 * H(i, 4); ctx.fillStyle = css('#FFB9A0', 0.12 + 0.18 * H(i, 5)); ctx.beginPath(); ctx.ellipse(x, y, r, r * 2.4, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    // warm side light (D's key, from the right) sweeping up past the falling petal
    const sh = E.p(t, 11.0, 11.8, 'linear');
    if (sh > 0) {
      const y = lerp(1500, 620, E.ease.inOutSine(sh)), a = 0.42 * Math.sin(Math.min(1, sh * 1.25) * PI * 0.5 + (sh > 0.8 ? (sh - 0.8) * 4 : 0)) * (1 - 0.45 * sm((sh - 0.75) / 0.25));
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(1180, y); ctx.scale(1, 0.62);
      ctx.fillStyle = RG(ctx, 0, 0, 0, 820, [[0, '#FF9D5C', a], [0.45, '#FF9D5C', a * 0.35], [1, '#FF9D5C', 0]]); ctx.fillRect(-900, -900, 1800, 1800); ctx.restore();
    }
    // dim bowl rim rising into frame (D contract: rim top ≈ y 1200 at 11.80)
    const bk = E.p(t, 11.3, 11.8, 'linear');
    if (bk > 0) {
      const dr = E.drift(t, 4, 0.3, 11), rimY = 1325 + (11.8 - t) * 1100 + dr.y;
      E.layer(ctx, (l) => {
        E.at(l, 540 + dr.x, rimY, 1, 0, () => A.iznikBowl(l, { t, rx: 330, ry: 110, depth: 220, lit: 1, litRadius: 0, reflection: true, rimCol: '#B9A6FF' }));
        l.globalCompositeOperation = 'source-atop'; l.fillStyle = 'rgba(22,9,30,0.72)'; l.fillRect(0, 0, 1080, 1920);
      }, { alpha: sm(bk * 2.5) * 0.95 });
    }
    // hero petal → honey drop
    const hp = heroPetal(t, c, hx, ttw);
    // tear (dew): gathers at the lowest point of the bowed head, falls onto the hovering petal, rides it
    const dg = E.p(t, 10.46, 10.84, 'outCubic');
    let dew = null;
    if (dg > 0 && t < 11.5) {
      const sil = A.heroRoseSilhouette(W.ROSE_R, 1); let lo = null;
      for (let i = 0; i < sil.length; i += 2) { const w = hx.toWorld(sil[i][0] * 0.9, sil[i][1] * 0.9); if (!lo || w[1] > lo[1]) lo = w; }
      const tipS = W.toScreen(c, 1, lo[0], lo[1] + 3);
      const r = 7 * z * dg * (1 - 0.3 * E.p(t, 11.0, 11.4));
      if (t < 10.84) dew = { x: tipS[0], y: tipS[1] + r * 0.9, r, st: 1 + 0.14 * Math.sin(t * 20) * dg };
      else if (hp) {
        const u = t - 10.84, on = [hp.x + 0.08 * hp.R, hp.y - 0.12 * hp.R - r * 0.5];
        const fy = tipS[1] + r + 0.5 * 3000 * u * u, land = fy >= on[1] ? 1 : 0;
        const k = E.p(t, 10.84, 10.97, 'inQuad');
        dew = land || t > 10.97 ? { x: on[0], y: on[1], r, st: 0.9 } : { x: lerp(tipS[0], on[0], k), y: fy, r, st: 1.25 };
      }
    }
    if (hp) {
      const mk = E.p(t, 11.5, 11.8, 'linear');
      if (t < 11.5 || mk < 0.25) {
        // warm glow behind the petal (grows as it nears the honey light)
        S.light(ctx, hp.x, hp.y, hp.R * 0.95, mx('#FF9DB4', '#FFB06A', E.p(t, 11.2, 11.5)), 0.2 + 0.12 * fallK);
        if (mk > 0) drawDrop(ctx, DROP[0] + (hp.x - DROP[0]) * (1 - mk), hp.y, DROP_R, mk, t);
        const pa = 1 - sm(mk / 0.25);
        ctx.save(); ctx.globalAlpha = pa; E.at(ctx, hp.x, hp.y, 1, 0, () => A.heroPetal(ctx, { R: hp.R, t: ttw, rot: hp.rot, flip: hp.flip, wilt: 0.25 * E.p(t, 9.8, 10.44) })); ctx.restore();
      } else drawDrop(ctx, hp.x, hp.y, DROP_R, mk, t);
    }
    if (dew) dewDraw(ctx, dew.x, dew.y, dew.r * (1 - 0.5 * E.p(t, 11.3, 11.48)), 1 - E.p(t, 11.32, 11.48), dew.st);
    W.bandScrim(ctx, gk * (1 - fallK * 0.5), '#120E22');
  }

  const postC = (t) => ({ bloom: lerp(0.3, 0.46, E.p(t, 6.7, 8.2)), vignette: lerp(0.26, 0.42, E.p(t, 7.0, 10.5)), grain: 0.05 });
  E.scene({
    id: 'C_gul_firak', t0: 6.40, t1: 11.80,
    async setup() { W.build(); if (!W.SPR.mote) W.makeSprites(); pickHero(); },
    post: (t) => (t <= T_HAND ? W.postB(t) : postC(t)),
    draw(ctx, t) { if (t <= T_HAND) W.frameB(ctx, t); else frameC(ctx, t); },
  });
})();
