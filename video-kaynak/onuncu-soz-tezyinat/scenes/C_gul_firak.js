/* =============================================================================
 * C_gul_firak · 6.40–11.80 · "Çünkü bir zaman lezzet verse, firakıyla birçok zaman elem verir."
 * =============================================================================
 * PLAN — same garden world as B (window.BCW), camera on the hero rose head (screen (540,820), R≈260).
 *  6.40–6.70  identical frames to B (BCW.frameB) → invisible hand-off.
 *  7.04 "Çünkü"   warm rim light #FFB37A wraps the right petals (silhouette crescent).
 *  7.36–7.80 "bir zaman"  sundial shadow on the warm-lit meadow turns 40°.  7.80 "lezzet": golden pulse +
 *                 three short warm fragrance curls (gone by 8.6).   8.28 "verse": bee lifts off, exits right.
 *  8.62–9.10      6 attachment filaments draw from the heart to the frame edges (y ≤ 1180).
 *  9.14–9.62 "firakıyla"  filaments snap one by one (stubs fade in 0.25 s).  On the 3rd snap the head's
 *                 OWN outer ring tears loose: the five outer petals are re-drawn from the rose geometry
 *                 (A._roseGeom) as free bodies BEHIND the inner rings — the head is left smaller and open.
 *                 Four fly up-left (growth ≤1.25×); the hero petal drifts down-right and hovers clear of
 *                 the stem.  Stem kicks 12°, −0.25 EV, pull-back, roll, decaying shake.
 *  9.78–10.44 "birçok zaman"  time-lapse: shadow spins 3 turns, clouds race, sun gone, sky → night, rose
 *                 wilts (colour, curl, browned edges), stem droops.
 *  10.46 "elem"   head bows ≈31° (outBack), cold ripple on the ground, a tear gathers on the lowest real
 *                 petal edge.   10.84 "verir": the tear falls onto the hovering petal and hangs from its edge.
 *  10.90–11.80    the camera follows the falling petal (optical zoom about (540,880)); the stem base and
 *                 soil leave the frame first, the world defocuses and dissolves into D's plum by 11.4.
 *                 The petal settles to D's start pose (petalSilhouette(92), rot −0.55) and morphs
 *                 11.50–11.80 into the honey drop r 26 at (540,880) exactly like D; the bowl (opaque,
 *                 72 % veil, no reflection) rises like D's (1100 px/s, rim centre ≈1325 at 11.80).
 *  Gloss band: the rose layer is darkened + blurred inside y 1150–1650 with a smooth envelope (BCW.roseLayered).
 * ========================================================================== */
(function () {
  'use strict';
  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = E.clamp, lerp = E.lerp, sm = E.smooth, H = E.hash;
  const W = window.BCW;
  const T_HAND = 6.70, T_SNAP0 = 9.14, SNAP_DT = 0.096, T_DETACH = T_SNAP0 + 2 * SNAP_DT;
  const DROP = [540, 880], DROP_R = 26;
  const css = W.css, mx = W.mx, RG = W.RG, LG = W.LG;

  /* ---------------- timing curves ---------------- */
  const nightC = (t) => 0.22 * E.p(t, T_HAND, 9.7, 'inOutSine') + 0.78 * E.p(t, 9.78, 10.44, 'inOutSine');
  const wiltC = (t) => 0.85 * E.p(t, 9.78, 10.44, 'inOutSine');
  const fallZ = (t) => Math.exp(Math.log(1.8) * E.p(t, 10.9, 11.6, 'inOutSine'));

  /* ---------------- head transform ---------------- */
  function headXf(t, ttw) {
    const wilt = wiltC(t), stemWilt = wilt * 0.45;
    const bend = 0.21 * (t > T_DETACH ? E.ease.spring(clamp((t - T_DETACH) / 1.4)) : 0);
    const tip = W.roseTip(ttw, { wilt: stemWilt, bend });
    const bow = 0.55 * E.ease.outBack(E.p(t, 10.38, 10.98, 'linear'), 1.4);
    const ang = tip.angle + bow, ca = Math.cos(ang), sa = Math.sin(ang), br = 1 + 0.012 * Math.sin((TAU * ttw) / 3.2);
    return { wilt, stemWilt, bend, bow, tip, ang, br, toWorld: (x, y) => [W.ROSE_BASE[0] + tip.x + (x * ca - y * sa) * br, W.ROSE_BASE[1] + tip.y + (x * sa + y * ca) * br] };
  }

  /* ---------------- camera ---------------- */
  function camC(t, hx) {
    const d = W.drift(t);
    let zc = lerp(1, 1.07, E.p(t, 7.0, T_SNAP0, 'inOutSine'));
    zc = lerp(zc, 1.03, E.p(t, T_SNAP0, 9.62, 'outCubic'));
    zc = lerp(zc, 1.06, E.p(t, 9.62, 10.8, 'inOutSine'));
    const z = 2.6 * zc, H0 = W.HEAD0;
    const c = { x: H0[0], y: H0[1] + 140 / z, z, zo: 1, ox: 540, oy: 960, rot: d.rot, sx: d.sx, sy: d.sy };
    if (hx) { const f = 0.5 * E.p(t, 9.6, 10.9, 'inOutSine'), hw = hx.toWorld(0, 0); c.x += (hw[0] - H0[0]) * f; c.y += (hw[1] - H0[1]) * f; }
    let roll = lerp(0, -2, E.p(t, 7.0, T_SNAP0, 'inOutSine'));
    roll = lerp(roll, 1.5, E.p(t, T_SNAP0, 9.62, 'outCubic'));
    roll = lerp(roll, 0, E.p(t, 9.9, 11.2, 'inOutSine'));
    c.rot += (roll * PI) / 180;
    if (t > T_DETACH) { const k = t - T_DETACH, e = Math.exp(-k * 9); c.sx += 4 * e * Math.sin(k * 63); c.sy += 3 * e * Math.cos(k * 71); }
    // follow the falling petal: optical zoom about the lock point (540,880)
    const zo = fallZ(t); c.zo = zo; c.oy = 880 + 80 / zo;
    return c;
  }

  /* ---------------- outer ring: the head's own petals as free bodies ---------------- */
  let RING = [], HERO = null, ORDER = {};
  function buildRing() {
    const G = A._roseGeom({ R: W.ROSE_R, bloom: 1, t: W.tw(T_DETACH) }, 2);
    RING = G.petals.filter((p) => !p.sepal && p.k === 0).map((p) => {
      const P = []; for (let i = 0; i < p.pts.length; i += 2) P.push([p.pts[i] - p.M[0], p.pts[i + 1] - p.M[1]]);
      return { i: p.i, path: p.path, B: p.B, T: p.T, M: p.M, outline: A.resample(P, 128) };
    });
    let best = -1e9; for (const p of RING) { const sc = p.M[0] + 0.6 * p.M[1]; if (sc > best) { best = sc; HERO = p; } }
    let n = 0; RING.forEach((p) => { ORDER[p.i] = p === HERO ? 0.035 : [0, 0.07, 0.105, 0.14, 0.16][n++]; });
  }
  const startOf = (i) => T_DETACH + (ORDER[i] || 0);
  const detFn = (t) => (i, k) => (k === 0 && t >= startOf(i) ? 1 : 0);
  /** shade a petal outline (local coords, base→tip gradient); night 0..1 desaturates, rim colour/alpha */
  function petalPaint(ctx, path, B, T, o) {
    const n = o.night || 0, back = o.back;
    const c0 = mx(back ? '#5E0832' : '#7E0C40', '#2A1E34', n * 0.8), c1 = mx(back ? '#A81E52' : '#D02560', '#4E3A58', n * 0.8);
    const c2 = mx(back ? '#D84A72' : '#FF5F88', '#6C5A78', n * 0.8), c3 = mx(back ? '#F08AA4' : '#FFA2B7', '#8E84A6', n * 0.78);
    const g = ctx.createLinearGradient(B[0], B[1], T[0], T[1]); g.addColorStop(0, css(c0)); g.addColorStop(0.35, css(c1)); g.addColorStop(0.72, css(c2)); g.addColorStop(1, css(c3));
    ctx.fillStyle = g; o.pts ? A.fillShape(ctx, o.pts) : ctx.fill(path);
    ctx.lineJoin = 'round'; ctx.strokeStyle = css(o.rimCol || '#FFD1DC', o.rimA === undefined ? 0.5 : o.rimA); ctx.lineWidth = o.lw || 1.2;
    o.pts ? A.strokeShape(ctx, o.pts) : ctx.stroke(path);
    ctx.strokeStyle = css(mx('#FFC2D0', '#9A90B8', n), 0.28); ctx.lineWidth = (o.lw || 1.2) * 0.8; ctx.beginPath(); ctx.moveTo(B[0], B[1]); ctx.quadraticCurveTo((B[0] + T[0]) / 2 + 2, (B[1] + T[1]) / 2, lerp(B[0], T[0], 0.85), lerp(B[1], T[1], 0.85)); ctx.stroke();
  }
  /** flyers (non-hero outer petals): start exactly where they sat in the head, drawn behind the inner rings */
  function drawFlyers(ctx, c, t, hx, night) {
    const z = W.zoomAt(c, 1);
    for (const p of RING) {
      if (p === HERO) continue;
      const st = startOf(p.i); if (t < st) continue;
      const tau = (t - st) / 1.25; if (tau >= 1) continue;
      const Ms = W.toScreen(c, 1, ...hx.toWorld(p.M[0], p.M[1]));
      const dir = -2.25 + (H(p.i, 3) - 0.5) * 0.9, dist = 1450 * Math.pow(tau, 1.35);
      const x = Ms[0] + Math.cos(dir) * dist + Math.sin(tau * PI * 2.2 + p.i) * 40 * tau, y = Ms[1] + Math.sin(dir) * dist - Math.sin(tau * PI) * 30;
      const rot = hx.ang + c.rot + (H(p.i, 5) - 0.5) * 3.2 * tau + 0.25 * Math.sin(tau * 7 + p.i) * tau;
      let flip = Math.cos(tau * PI * (1.6 + H(p.i, 2) * 1.4)); if (Math.abs(flip) < 0.12) flip = 0.12 * Math.sign(flip || 1);
      const sc = z * hx.br * (1 + 0.25 * tau);
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc * flip, sc); ctx.translate(-p.M[0], -p.M[1]);
      petalPaint(ctx, p.path, p.B, p.T, { night, back: flip < 0, lw: 1.2 / sc });
      ctx.restore();
    }
  }
  /** hero petal state in screen space: {x, y, sc (screen px per local unit), rot, flip, mk (morph → D petal)} */
  const HOVER = [732, 1062];
  function heroState(t, c, hx, ttw) {
    const st = startOf(HERO.i); if (t < st) return null;
    const z = W.zoomAt(c, 1);
    const sp = W.toScreen(c, 1, ...hx.toWorld(HERO.M[0], HERO.M[1]));
    const hv = [HOVER[0] + c.sx + 14 * Math.sin(ttw * 0.9) + 6 * Math.sin(ttw * 2.1), HOVER[1] + c.sy + 10 * Math.sin(ttw * 1.3 + 1)];
    const u = E.p(t, st, 10.15, 'inOutCubic');
    let x = lerp(sp[0], hv[0], u) + Math.sin(u * PI) * 60, y = lerp(sp[1], hv[1], u) + Math.sin(u * PI) * 40;
    let rot = lerp(hx.ang + c.rot, 0.35 + 0.18 * Math.sin(ttw * 0.8), u), flip = lerp(1, 0.78 + 0.22 * Math.cos(ttw * 1.1), u) * Math.cos(Math.sin(u * PI) * 1.2);
    let sc = z * hx.br * lerp(1, 0.82, u);
    // tear lands (10.97): small dip; fall (camera follows): to the lock point, flutter, settle to D's pose
    const hit = t - 10.97; if (hit > 0) y += 12 * Math.exp(-hit * 7) * Math.sin(hit * 18);
    const f = E.p(t, 11.0, 11.42, 'inOutSine'), mk = E.p(t, 11.22, 11.5, 'inOutSine');
    if (f > 0) {
      const fl = Math.sin((t - 11.0) * 4.6);
      x = lerp(x, DROP[0] + Math.sin(t * 2.6) * 18 * (1 - mk), f); y = lerp(y, DROP[1] + Math.sin(t * 3.4) * 7 * (1 - mk), f);
      rot = lerp(rot, 0.3 + 0.45 * fl, f); flip = lerp(flip, 0.5 + 0.5 * Math.cos((t - 11.0) * 5), f);
      sc = lerp(sc, sc * 0.75, f);
    }
    return { x, y, sc, rot, flip, mk };
  }
  let PSIL = null, TSIL = null;
  const petalSilD = () => { if (!PSIL) { const P = A.petalSilhouette(92), ca = Math.cos(-0.55), sa = Math.sin(-0.55); PSIL = A.resample(P.map(([x, y]) => [x * ca - y * sa, x * sa + y * ca]), 128); } return PSIL; };
  /** hero outline in screen offsets (relative to its centre), morphing to D's petal pose by mk */
  function heroPts(hs) {
    const f = Math.abs(hs.flip) < 0.12 ? 0.12 * Math.sign(hs.flip || 1) : hs.flip, ca = Math.cos(hs.rot), sa = Math.sin(hs.rot);
    const P = HERO.outline.map(([x, y]) => { x *= hs.sc * f; y *= hs.sc; return [x * ca - y * sa, x * sa + y * ca]; });
    return hs.mk > 0 ? A.lerpShape(P, petalSilD(), A.morphEase(hs.mk, 0.03)) : P;
  }
  function drawHero(ctx, hs, night, warm) {
    const pts = heroPts(hs), f = Math.abs(hs.flip) < 0.12 ? 0.12 * Math.sign(hs.flip || 1) : hs.flip, ca = Math.cos(hs.rot), sa = Math.sin(hs.rot);
    const tr = (q) => { const x = (q[0] - HERO.M[0]) * hs.sc * f, y = (q[1] - HERO.M[1]) * hs.sc; return [x * ca - y * sa, x * sa + y * ca]; };
    const B = tr(HERO.B), T = tr(HERO.T), n = night * (1 - warm);
    ctx.save(); ctx.translate(hs.x, hs.y);
    if (hs.mk < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - hs.mk;
      petalPaint(ctx, null, B, T, { night: n, back: f < 0, pts, rimCol: mx('#FFD1DC', '#A9C0FF', n), rimA: lerp(0.5, 0.75, n), lw: 1.4 });
      ctx.restore();
    }
    if (hs.mk > 0) { // D's k=0 drop colours (petal still)
      ctx.save(); ctx.globalAlpha *= hs.mk; const r = DROP_R;
      ctx.fillStyle = E.rad(ctx, -r * 0.28, r * 0.25, 0, r * 1.7, [[0, '#FFD1DC'], [0.32, '#F7A3B5'], [0.68, '#F28BA0'], [1, '#C2185B']]); A.fillShape(ctx, pts);
      ctx.save(); ctx.beginPath(); ctx.rect(r * 0.15, -r * 3, r * 2, r * 6); ctx.clip(); ctx.strokeStyle = 'rgba(255,244,214,0.75)'; ctx.lineWidth = Math.max(1.2, r * 0.08); A.strokeShape(ctx, pts); ctx.restore();
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.05, r * 0.13, r * 0.33, 0.32, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.55, r * 0.07, 0, TAU); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
    return pts;
  }
  /** honey drop (point up) at (x,y); k 0 = D's petal shape/colour → 1 = drop (same as D's drawDrop) */
  function drawDrop(ctx, x, y, r, k, t) {
    if (!TSIL) TSIL = A.teardropSilhouette(r);
    const pts = k >= 1 ? TSIL : A.lerpShape(petalSilD(), TSIL, A.morphEase(k));
    const wob = 0.045 * Math.sin(t * TAU * 5.5) * k;
    ctx.save();
    S.light(ctx, x, y + 20, 320, '#FFB547', 0.16 * k);
    S.light(ctx, x, y + r * 0.2, r * 5.2, '#FFB547', 0.3 * k + 0.08);
    ctx.translate(x, y); ctx.scale(1 + wob, 1 - wob);
    ctx.fillStyle = E.rad(ctx, -r * 0.28, r * 0.25, 0, r * 1.7, [[0, E.mix('#FFD1DC', '#FFF1C0', k)], [0.32, E.mix('#F7A3B5', '#FFE7A0', k)], [0.68, E.mix('#F28BA0', '#FFB547', k)], [1, E.mix('#C2185B', '#D07A16', k)]]);
    A.fillShape(ctx, pts);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = E.rad(ctx, r * 0.1, r * 0.35, 0, r * 0.9, [[0, '#FFE7A0', 0.55 * k], [1, '#FFE7A0', 0]]); ctx.beginPath(); ctx.arc(r * 0.1, r * 0.35, r * 0.9, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.beginPath(); ctx.rect(r * 0.15, -r * 3, r * 2, r * 6); ctx.clip(); ctx.strokeStyle = 'rgba(255,244,214,0.75)'; ctx.lineWidth = Math.max(1.2, r * 0.08); A.strokeShape(ctx, pts); ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.05, r * 0.13, r * 0.33, 0.32, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.arc(-r * 0.22, -r * 0.55, r * 0.07, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------------- filaments ---------------- */
  const FIL_ENDS = [[-40, 905], [-40, 1035], [-40, 1165], [1120, 935], [1120, 1060], [1120, 1180]];
  const SNAP_ORDER = [0, 3, 1, 4, 2, 5];
  function filaments(ctx, t, src) {
    if (t < 8.6 || t > 9.8) return;
    FIL_ENDS.forEach((e, i) => {
      const order = SNAP_ORDER.indexOf(i);
      const draw = E.p(t, 8.62 + i * 0.075, 8.62 + i * 0.075 + 0.42, 'outCubic');
      const snap = clamp((t - (T_SNAP0 + order * SNAP_DT)) / 0.3);
      if (draw <= 0 || snap >= 1) return;
      const s0 = [src[0] + (i < 3 ? -1 : 1) * (14 + 10 * (i % 3)), src[1] + 10 + 8 * (i % 3)];
      const sag = 120 + 40 * (i % 3) + 12 * Math.sin(t * 1.3 + i);
      const pts = [s0, [lerp(s0[0], e[0], 0.25), lerp(s0[1], e[1], 0.25) + sag * 0.75], [lerp(s0[0], e[0], 0.6), lerp(s0[1], e[1], 0.6) + sag * 0.8], e];
      A.filament(ctx, pts, { t, w: 1.8, halo: 9, col: '#FFD98A', flow: 70, draw, snap, breakAt: 0.42 + 0.16 * H(i, 5), seed: 11 + i, alpha: 1 - sm((snap - 0.15) / 0.7) });
    });
  }

  /* ---------------- ground shadow (sundial) ---------------- */
  function sundial(l, c, t, night) {
    const day = (1 - sm((night - 0.5) / 0.4)) * E.p(t, T_HAND, 7.25, 'inOutSine');
    const [bx0, by0] = W.toScreen(c, 1, W.ROSE_BASE[0], W.ROSE_BASE[1]), zz = W.zoomAt(c, 1);
    if (day > 0.01) { l.save(); l.globalCompositeOperation = 'screen'; l.translate(bx0 + 40 * zz, by0); l.scale(1, 0.3); l.fillStyle = RG(l, 0, 0, 0, 260 * zz, [[0, '#FFB37A', 0.34 * day], [0.6, '#FF9D7A', 0.12 * day], [1, '#FF9D7A', 0]]); l.fillRect(-300 * zz, -300 * zz, 600 * zz, 600 * zz); l.restore(); }
    const a = 0.62 * day;
    if (a <= 0.01) return;
    const th = -1.2 + 0.7 * E.p(t, 7.3, 7.86, 'inOutSine') + 6 * PI * E.p(t, 9.78, 10.44, 'inCubic');
    const len = 210 * (1 + 0.25 * E.p(t, 7.3, 9.6));
    W.lay(l, c, 1, () => {
      const bx = W.ROSE_BASE[0], by = W.ROSE_BASE[1] + 3, dx = Math.sin(th), dy = Math.cos(th) * 0.3;
      const ex = bx + dx * len, ey = by + dy * len, nx = -dy, ny = dx, wb = 3, we = 6;
      l.fillStyle = css('#1A1428', a);
      l.beginPath(); l.moveTo(bx + nx * wb, by + ny * wb); l.lineTo(ex + nx * we, ey + ny * we); l.lineTo(ex - nx * we, ey - ny * we); l.lineTo(bx - nx * wb, by - ny * wb); l.closePath(); l.fill();
      l.save(); l.translate(bx + dx * len * 1.2, by + dy * len * 1.2); l.rotate(Math.atan2(dy, dx)); l.scale(1, 0.5 + 0.5 * Math.abs(Math.cos(th)));
      l.beginPath(); for (let i = 0; i < 7; i++) { const aa = (i / 7) * TAU; l.moveTo(Math.cos(aa) * 34 + 26, Math.sin(aa) * 22); l.arc(Math.cos(aa) * 34, Math.sin(aa) * 22, 26, 0, TAU); } l.fill(); l.restore();
    });
  }

  /* ---------------- rim light on the right petals ---------------- */
  function rimLight(ctx, c, hx, a) {
    if (a <= 0.01) return;
    const sil = A.heroRoseSilhouette(W.ROSE_R, 1);
    const pts = sil.map((p) => W.toScreen(c, 1, ...hx.toWorld(p[0] * 0.995, p[1] * 0.995)));
    const z = W.zoomAt(c, 1), off = 0.075 * W.ROSE_R * z;
    E.layer(ctx, (l) => {
      l.fillStyle = css('#FFA868'); A.fillShape(l, pts);
      l.globalCompositeOperation = 'destination-out'; A.fillShape(l, pts.map((p) => [p[0] - off, p[1] + off * 0.35]));
    }, { lo: true, blur: 5, op: 'lighter', alpha: 0.72 * a });
    const [cx, cy] = W.toScreen(c, 1, ...hx.toWorld(0, -0.16 * W.ROSE_R));
    ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = RG(ctx, cx + 230, cy + 40, 0, 330, [[0, '#FFB37A', 0.75 * a], [1, '#FFB37A', 0]]); ctx.fillRect(cx - 200, cy - 400, 800, 800); ctx.restore();
  }

  /* ---------------- tear ---------------- */
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
  /** lowest point of the real (wilted, bowed) head petals, in screen space */
  function headLowest(t, ttw, c, hx) {
    const G = A._roseGeom({ R: W.ROSE_R, bloom: 1, wilt: hx.wilt, t: ttw, detach: detFn(t), heroIndex: 99 }, 1);
    let lo = null;
    for (const p of G.petals) {
      if (p.sepal || p.k === 0) continue;
      for (let i = 0; i < p.pts.length; i += 2) { const s = W.toScreen(c, 1, ...hx.toWorld(p.pts[i], p.pts[i + 1])); if (!lo || s[1] > lo[1]) lo = s; }
    }
    return lo;
  }

  /* ---------------- frame ---------------- */
  function frameC(ctx, t) {
    const ttw = W.tw(t), hx = headXf(t, ttw), c = camC(t, hx), night = nightC(t), P = W.palAt(1, night);
    const z = W.zoomAt(c, 1);
    const sunY = lerp(930, 1015, E.p(t, T_HAND, 9.9, 'inOutSine')), sunA = 1 - E.p(t, 8.9, 10.1, 'inOutSine');
    const tc = ttw + 70 * E.p(t, 9.78, 10.44, 'inOutSine');
    const gk = W.glossK(t), fallK = E.p(t, 11.0, 11.4, 'inOutSine'), fallBlur = E.p(t, 10.9, 11.3, 'inOutSine');
    const rimA = E.p(t, 6.98, 7.3, 'outCubic') * (1 - E.p(t, 8.95, 9.28, 'inOutSine'));
    const head = (x, y) => W.toScreen(c, 1, ...hx.toWorld(x, y));
    const heart = head(0, -0.18 * W.ROSE_R), headC = head(0, -0.16 * W.ROSE_R);
    const hs = HERO ? heroState(t, c, hx, ttw) : null;
    const heroBehind = hs && t < 9.85;
    W.drawWorld(ctx, {
      cam: c, P, t: ttw, tc, sunX: W.SUN0[0], sunY, sunA, wave: 99, dusk: 1, tint: lerp(0.85, 1, night),
      dof: { back: lerp(3.5, 5, E.p(t, 7, 9)) + 7 * fallBlur, front: 9 + 9 * fallBlur, near: 6 }, stars: night * night, cloudA: 1 - 0.4 * night,
      pathDim: 0.6 * E.p(t, 6.72, 7.6, 'inOutSine'), bandDim: gk,
      afterBack: (l) => sundial(l, c, t, night),
      onRose: (ctx2) => {
        W.roseLayered(ctx2, c, {
          t: ttw, bloom: 1, wilt: hx.wilt, stemWilt: hx.stemWilt, bend: hx.bend, bow: hx.bow, P,
          band: gk, stemGrade: lerp(0.45, 0.75, night), rim: lerp(1, 0.6, night), rimCol: mx('#FFB37A', '#8EA6E8', night),
          gradeCol: mx('#6A3D8A', '#1E2246', night), gradeA: 0.1 + 0.22 * night, brown: hx.wilt / 0.85, headS: [headC[0], headC[1], W.ROSE_R * z * 0.95],
          rose: { detach: detFn(t), detachDist: 14, heroIndex: 99 },
          onHead: (hctx) => { if (t < 8.28) W.drawBee(hctx, { fly: 0, off: [0, 0], flip: true, rot: 0.06 * Math.sin(ttw * 2) }, null, ttw); },
          behind: (l) => { drawFlyers(l, c, t, hx, night); if (heroBehind) drawHero(l, hs, night, 0); },
        });
        rimLight(ctx2, c, hx, rimA);
        W.sweetPulse(ctx2, heart[0], heart[1], (z / 2.6) * 1.4, t, 7.78);
        W.ribbons(ctx2, heart[0], heart[1], t, 7.8, (z / 2.6) * 1.25);
      },
      fg: false,
    });
    // bee lifts off at "verse" and exits right
    if (t >= 8.28 && t < 9.4) {
      const sp = head(W.BEE_SPOT[0], W.BEE_SPOT[1]), u = t - 8.28;
      const x = sp[0] + 900 * E.p(t, 8.4, 9.1, 'inQuad') + Math.sin(u * 9) * 6, y = sp[1] - 70 * E.p(t, 8.28, 8.5, 'outCubic') - 220 * E.p(t, 8.45, 9.1, 'inOutSine') + Math.sin(u * 13) * 4;
      E.at(ctx, x, y, z, -0.12 * E.p(t, 8.4, 8.7), () => A.bee(ctx, { size: 46, t: ttw, flip: t < 8.36, hover: true }));
    }
    filaments(ctx, t, heart);
    // cold ripple ("elem") on the ground around the base (kept below the gloss band)
    const rk = (t - 10.44) / 0.9;
    if (rk > 0 && rk < 1) {
      const [bx, by] = W.toScreen(c, 1, W.ROSE_BASE[0], W.ROSE_BASE[1]), r = 30 + E.ease.outCubic(rk) * 520, ry = Math.min(r * 0.27, Math.max(10, by - 1680));
      const a = 0.4 * (1 - rk) * sm(rk * 8);
      if (ry > 4) {
        ctx.save(); ctx.translate(bx, by); ctx.scale(1, ry / r);
        ctx.strokeStyle = css('#7FA8FF', a * 0.35); ctx.lineWidth = 22; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = css('#BFD4FF', a); ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      }
    }
    const ev = E.p(t, T_DETACH - 0.03, T_DETACH + 0.2, 'outCubic');
    if (ev > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = ev; ctx.fillStyle = '#D2CCD8'; ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    if (night > 0.3) { ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = RG(ctx, 140, 260, 0, 1100, [[0, '#7FA8FF', 0.14 * night], [1, '#7FA8FF', 0]]); ctx.fillRect(0, 0, 1080, 1920); ctx.restore(); }
    W.drawPollen(ctx, c, ttw, 0.6 * (1 - E.p(t, 8.6, 9.8)), gk);
    // fall: dissolve to D's plum (stem base and soil have already left the frame)
    if (fallK > 0) {
      ctx.save(); ctx.globalAlpha = fallK;
      ctx.fillStyle = LG(ctx, 0, 0, 0, 1920, [[0, '#2A1633'], [0.5, '#4A2346'], [1, '#6E3448']]); ctx.fillRect(0, 0, 1080, 1920);
      ctx.restore();
    }
    // warm side light (D's key, from the right) sweeping up past the falling petal
    const sh = E.p(t, 11.0, 11.8, 'linear');
    if (sh > 0) {
      const y = lerp(1500, 620, E.ease.inOutSine(sh)), a = 0.38 * Math.sin(Math.min(1, sh * 1.25) * PI * 0.5) * (1 - 0.45 * sm((sh - 0.75) / 0.25));
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.translate(1180, y); ctx.scale(1, 0.62);
      ctx.fillStyle = RG(ctx, 0, 0, 0, 820, [[0, '#FF9D5C', a], [0.45, '#FF9D5C', a * 0.35], [1, '#FF9D5C', 0]]); ctx.fillRect(-900, -900, 1800, 1800); ctx.restore();
    }
    // bowl rising into frame exactly like D's (opaque, veiled, no reflection)
    if (t > 11.3) {
      const dr = E.drift(t, 4, 0.3, 11), rimY = 1325 + (11.8 - t) * 1100 + dr.y;
      E.layer(ctx, (l) => {
        E.at(l, 540 + dr.x, rimY, 1, 0, () => A.iznikBowl(l, { t, rx: 330, ry: 110, depth: 220, lit: 1, litRadius: 0, reflection: false, rimCol: '#B9A6FF' }));
        l.globalCompositeOperation = 'source-atop'; l.fillStyle = 'rgba(22,9,30,0.72)'; l.fillRect(0, 0, 1080, 1920);
      });
    }
    // hero petal (in front once it is clear of the head) → honey drop
    let hpts = null;
    if (hs && !heroBehind) {
      const warm = E.p(t, 11.15, 11.45, 'inOutSine');
      S.light(ctx, hs.x, hs.y, 150, mx('#8E84C8', '#FFB06A', warm), (0.1 + 0.18 * warm) * (1 - E.p(t, 11.5, 11.6)));
      if (t < 11.5 && hs.mk > 0) S.light(ctx, DROP[0], DROP[1] + DROP_R * 0.2, DROP_R * 5.2, '#FFB547', 0.08 * hs.mk);
      const mk = E.p(t, 11.5, 11.8, 'linear');
      if (t < 11.5) hpts = drawHero(ctx, hs, night, warm);
      else drawDrop(ctx, DROP[0], DROP[1], DROP_R, mk, t);
    }
    // tear: gathers on the lowest real petal edge at "elem", falls onto the hovering petal at "verir", hangs from its edge
    const dg = E.p(t, 10.46, 10.84, 'outCubic');
    if (dg > 0 && t < 11.48 && hs) {
      const r = 7 * z * dg;
      if (t < 10.84) { const lo = headLowest(t, ttw, c, hx); dewDraw(ctx, lo[0], lo[1] + r * 0.95, r, 1, 1 + 0.14 * Math.sin(t * 20) * dg); }
      else {
        const lo = headLowest(t, ttw, c, hx);
        const pts = hpts || heroPts(hs); let top = pts[0], bot = pts[0];
        for (const q of pts) { if (q[1] < top[1]) top = q; if (q[1] > bot[1]) bot = q; }
        const land = [hs.x + top[0] * 0.4, hs.y + top[1] * 0.4 - r * 0.6], hang = [hs.x + bot[0], hs.y + bot[1] + r * 1.05];
        const u = t - 10.84, fy = lo[1] + r + 0.5 * 3000 * u * u;
        const sl = E.p(t, 10.98, 11.2, 'inOutSine'), ab = 1 - E.p(t, 11.3, 11.46);
        if (fy < land[1] && t < 10.98) dewDraw(ctx, lerp(lo[0], land[0], E.p(t, 10.84, 10.97, 'inQuad')), fy, r, 1, 1.25);
        else dewDraw(ctx, lerp(land[0], hang[0], sl), lerp(land[1], hang[1], sl), r * (0.9 + 0.1 * ab), ab, lerp(0.9, 1.35, sl));
      }
    }
    W.grade(ctx, E.mix('#FFB38A', '#6A3D8A', E.p(t, T_HAND, 7.6, 'inOutSine')), lerp(0.12, 0.15, E.p(t, T_HAND, 7.6)) + 0.07 * E.p(t, 9.6, 10.6) - 0.2 * fallK);
    W.bandScrim(ctx, gk * (1 - fallK * 0.5), '#120E22');
  }

  const postC = (t) => ({ bloom: lerp(0.3, 0.46, E.p(t, 6.7, 8.2)), vignette: lerp(0.26, 0.42, E.p(t, 7.0, 10.5)), grain: 0.05 });
  E.scene({
    id: 'C_gul_firak', t0: 6.40, t1: 11.80,
    async setup() { W.build(); if (!W.SPR.mote) W.makeSprites(); buildRing(); },
    post: (t) => (t <= T_HAND ? W.postB(t) : postC(t)),
    draw(ctx, t) { t = clamp(t, 6.40, 11.80); if (t <= T_HAND) W.frameB(ctx, t); else frameC(ctx, t); },
  });
  W.camCx = (t) => camC(t, headXf(t, W.tw(t)));
})();
