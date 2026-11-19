// S22 — "Gururu bırak, seni yaratanı düşün," (90.50–93.80)
// Şafak öncesi bir tepe. 90.94 "Gururu": adam başında s08'deki altın taçla, göğsü kabarık, burnu havada, elleri belinde.
// 91.32 "bırak": tacı başından alır, önüne uzatıp bırakır; taç düşerken parıltısı söner, yere donuk düşer; adamın
// duruşu yumuşar, başı tevazuyla eğilir. 92.36 "seni yaratanı düşün": bakışını yukarı kaldırır; kamera yukarı eğilir
// (paralaks): yıldızlar söner, dağların ardından güneş doğar, gök şafak renklerine bürünür, bir kuş sürüsü geçer.
// Yalnız yaratılış delilleri: gök, ışık, dağlar, kuşlar — hiçbir tasvir yok.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s21_lib');
const Wk = require('./_s21_walk');
const { seg, E, lerp, clamp, rgba, mix, TAU, rng, shade } = C;
const d = C.deg;

const MAN = { x: 400, y: 1262, h: 660 };
const SH = { sky: 620, far: 640, mid: 800, near: 1500 };   // eğilmede katman kaymaları (paralaks)
const SUN = { x: 716, y0: 1110, y1: 846, R: 92 };
const CROWN_S = 82;
const T = { proud: 90.94, reach: 91.02, grab: 91.24, lift: 91.38, rel: 91.66, land: 92.14, look: 92.2, tilt0: 92.4, tilt1: 93.02 };
const X0 = -110, X1 = 1190;
const groundY = (x) => MAN.y + 0.00012 * (x - 420) * (x - 420);

const tiltU = (t) => E.inOutSine(seg(t, T.tilt0, T.tilt1));
const dawnD = (t) => E.inOutSine(seg(t, 92.2, 92.98));

// ---------- gök ----------
// şafak: tepede derin kobalt, menekşe, ufukta güçlü pembe-turuncu bant (dağ sırtının hemen üstünde, y≈780–1000)
const SKY_STOPS = [0, 0.195, 0.4, 0.527, 0.618, 0.7, 0.764, 0.836, 1];
function skyCv(kind) {
  const y0 = -760, y1 = 1440;
  const cols = kind === 'dawn'
    ? ['#122070', '#1C3496', '#3448B0', '#7A52AE', '#D45C98', '#FF7E5A', '#FFAE52', '#FFD27E', '#FFE7A8']
    : ['#0B0D2C', '#10153E', '#1A225C', '#283272', '#3A4282', '#504C8A', '#6A5890', '#86669A', '#9A74A0'];
  return L.hcache('s22sky' + kind, X0, y0, X1 - X0, y1 - y0, 1.1, (x) => {
    const g = x.createLinearGradient(0, y0, 0, y1); cols.forEach((c, i) => g.addColorStop(SKY_STOPS[i], c));
    x.fillStyle = g; x.fillRect(X0, y0, X1 - X0, y1 - y0);
    P.bandFill(x, null, { x0: X0, y0, x1: X1, y1, w: X1 - X0, h: y1 - y0 }, cols, { seed: kind === 'dawn' ? 2231 : 2232, stops: SKY_STOPS, wMin: 22, wMax: 42, lMin: 100, lMax: 300, mixJitter: 0.05 });
    // ince bulut şeritleri: şafakta altı pembe-altın, öncesinde koyu mor
    const r = rng(2233);
    for (let i = 0; i < 16; i++) {
      const cy = r.range(80, 880), cx = r.range(X0, X1), len = r.range(220, 520), w = r.range(14, 26);
      const base = kind === 'dawn' ? mix('#5A3A9A', '#E8608A', clamp((cy - 80) / 800)) : mix('#232A62', '#4A4686', clamp((cy - 80) / 800));
      P.stroke(x, cx, cy, cx + len, cy + r.range(-6, 6), w, base, r.int(1, 1e9), { detail: 0.6, taper1: 0.55 });
      if (kind === 'dawn') P.stroke(x, cx + len * 0.1, cy + w * 0.35, cx + len * 0.85, cy + w * 0.35 + r.range(-3, 3), w * 0.35, mix('#FF9A6A', '#FFC878', clamp((cy - 80) / 800)), r.int(1, 1e9), { detail: 0.3, taper1: 0.5 });
    }
  });
}
const STARS = L.starList(2241, 150, { x0: X0, y0: -760, x1: X1, y1: 760 }, { bias: 1.2, bigP: 0.07 });

// ---------- dağlar ----------
function ridge(x, peaks, base, seed) {
  // yumuşak en büyük: tepeler arasındaki vadiler V değil, yuvarlak
  let acc = 0; const K = 26;
  for (const [px, ph, pw] of peaks) { const q = Math.abs(x - px) / pw; acc += Math.exp(ph * Math.max(0, 1 - Math.pow(q, 1.25)) / K); }
  const h = K * Math.log(acc);
  return base - h - (C.noise1(x / 60, seed) - 0.5) * 22 - (C.noise1(x / 17, seed + 3) - 0.5) * 7;
}
const FAR_PEAKS = [[-60, 230, 260], [150, 300, 240], [360, 250, 220], [560, 330, 230], [880, 290, 240], [1080, 240, 230], [1220, 300, 220]];
const MID_PEAKS = [[-40, 140, 260], [260, 170, 280], [520, 110, 220], [820, 150, 260], [1140, 180, 280]];
function mountainCv(kind, layer) {
  const far = layer === 'far';
  const peaks = far ? FAR_PEAKS : MID_PEAKS, base = far ? 1090 : 1215, y0 = far ? 700 : 960, y1 = 1500;
  const dawn = kind === 'dawn';
  const col = far ? (dawn ? ['#46347A', '#3A2C6E', '#2E2362'] : ['#2A2C64', '#23255A', '#1C1E4E'])
    : (dawn ? ['#2A1F56', '#22194A', '#1A133E'] : ['#1C1E4C', '#171844', '#12133A']);
  return L.hcache('s22mt' + layer + kind, X0, y0, X1 - X0, y1 - y0, 1.1, (x) => {
    const top = []; for (let i = 0; i <= 130; i++) { const wx = X0 + (X1 - X0) * i / 130; top.push([wx, ridge(wx, peaks, base, far ? 11 : 23)]); }
    const poly = top.concat([[X1, y1], [X0, y1]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([70, 130, 30, 200]); x.translate(1.5, -1); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = col[1]; x.fillRect(X0, y0, X1 - X0, y1 - y0); x.restore();
    P.bandFill(x, P.pathOf(poly), { x0: X0, y0: y0, x1: X1, y1, w: X1 - X0, h: y1 - y0 }, col, { seed: far ? 2251 : 2252, stops: [0, 0.35, 1], wMin: 16, wMax: 30, lMin: 60, lMax: 200, angle: 0.03 });
    // yamaç darbeleri: tepeden aşağı inen gölge oluklar
    const r = rng(far ? 2253 : 2254);
    for (const [px, ph, pw] of peaks) {
      for (let k = 0; k < 6; k++) {
        const sx = px + r.range(-0.5, 0.5) * pw * 0.6, sy = ridge(sx, peaks, base, far ? 11 : 23) + 8;
        const ex = sx + r.range(20, 70) * (sx > px ? 1 : -1), ey = sy + r.range(80, 200);
        P.stroke(x, sx, sy, ex, ey * 0.6 + sy * 0.4, r.range(9, 15), rgba(shade(col[2], 0.0), 0.7), r.int(1, 1e9), { detail: 0.5, taper1: 0.3 });
      }
    }
    // şafakta sırt ışığı (güneşe yakın yerde daha güçlü)
    if (dawn) {
      for (let i = 1; i < 128; i += 1) {
        const p0 = top[i], p1 = top[i + 2];
        const near = Math.exp(-Math.pow((p0[0] - SUN.x) / (far ? 330 : 420), 2));
        if (r.next() > 0.25 + 0.75 * near) continue;
        P.stroke(x, p0[0], p0[1] + 3, p1[0], p1[1] + 3, (far ? 6 : 5) * (0.5 + near), rgba(mix('#FF8A5A', '#FFE2A0', near), 0.6 + 0.4 * near), r.int(1, 1e9), { detail: 0, taper1: 0.6 });
      }
    }
  });
}
function nearCv() {
  const y0 = 1180, y1 = 2080;
  return L.hcache('s22near', X0, y0, X1 - X0, y1 - y0, 1.1, (x) => {
    const top = []; for (let i = 0; i <= 80; i++) { const wx = X0 + (X1 - X0) * i / 80; top.push([wx, groundY(wx) + (C.noise1(wx / 40, 31) - 0.5) * 6]); }
    const poly = top.concat([[X1, y1], [X0, y1]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 5; x.setLineDash([90, 60, 40, 120]); x.translate(0, -2); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#244656'; x.fillRect(X0, y0, X1 - X0, y1 - y0); x.restore();
    P.bandFill(x, P.pathOf(poly), { x0: X0, y0, x1: X1, y1, w: X1 - X0, h: y1 - y0 }, ['#3E6A6E', '#2C5662', '#22465A', '#1A3650', '#142A44'], { seed: 2261, stops: [0, 0.08, 0.25, 0.55, 1], wMin: 16, wMax: 30, lMin: 70, lMax: 230, angle: 0.02 });
    const r = rng(2262);
    // sırtta ışık darbeleri
    for (let i = 0; i < 26; i++) { const k = r.int(1, 76), p0 = top[k], p1 = top[k + 2]; P.stroke(x, p0[0], p0[1] + 7, p1[0], p1[1] + 7, r.range(7, 11), '#5A8A82', r.int(1, 1e9), { detail: 0.4 }); }
    // taşlar
    for (const [sx, sw] of [[90, 70], [860, 92], [1010, 56], [-40, 60]]) {
      const sy = groundY(sx) + 10;
      const pts = P.smoothPts([[sx - sw * 0.5, sy + 6], [sx - sw * 0.45, sy - sw * 0.3], [sx - sw * 0.1, sy - sw * 0.5], [sx + sw * 0.3, sy - sw * 0.42], [sx + sw * 0.5, sy - sw * 0.1], [sx + sw * 0.52, sy + 6]], true, 6);
      P.toneShape(x, pts, { base: '#5E6A8E', dark: '#363E66', light: '#8A92B6', lightAng: -0.7, seed: sx + 2263, shadowW: 0.2, lightW: 0.12, dabs: 4 });
    }
    // çimen öbekleri ve küçük çiçekler
    for (let i = 0; i < 34; i++) { const gx = r.range(X0, X1); R.grass(x, gx, groundY(gx) + r.range(4, 40), r.range(22, 40), r.int(1, 999), { c1: '#2C5662', c2: '#5E8C7E' }); }
    for (let i = 0; i < 10; i++) { const gx = r.range(X0 + 40, X1 - 40); R.flower(x, gx, groundY(gx) + r.range(20, 120), r.range(8, 12), r.int(1, 99), { color: '#D8D0F0', dark: '#8A7FB8' }); }
  });
}

// ---------- adam ----------
const POSE0 = M.pose({ torso: d(-7), neck: d(-6), head: d(-13), eye: 0.62, brow: -0.35, mouth: 0.28, thighN: d(5), thighF: d(-5), kneeN: d(2), kneeF: d(2) });
function handsOnHips(p, k = 1) {
  // bilekler kalçanın hemen önünde/üstünde; dirsekler geride
  let q = Wk.reach(p, [0.02, -0.56], 'N', k, d(70));
  q = Wk.reach(q, [0.0, -0.565], 'F', k, d(70));
  q.grip = 0.35 * k;
  return q;
}
const PROUD = handsOnHips(POSE0);
const PROUD2 = handsOnHips(M.pose(Object.assign({}, POSE0, { torso: d(-10), neck: d(-8), head: d(-17), py: 0.006, eye: 0.5, mouth: 0.35 })));
const HUMBLE = M.pose({ torso: d(8), neck: d(13), head: d(22), armN: d(5), elbowN: d(18), handN: d(6), armF: d(1), elbowF: d(14), py: -0.004, eye: 0.3, brow: 0.32, mouth: -0.05 });
const LOOKUP = M.pose({ torso: d(-3), neck: d(-12), head: d(-34), armN: d(10), elbowN: d(22), handN: d(4), armF: d(6), elbowF: d(18), eye: 1, brow: -0.3, mouth: 0.2 });

// taç, baştayken (yerel, h=1): baş tepesi
function crownOnHead(s, h) {
  const u = M.L.head * h, ha = s.ha;
  const lx = -0.03 * u, ly = -0.47 * u;
  return { x: s.headC[0] + lx * Math.cos(ha) - ly * Math.sin(ha), y: s.headC[1] + lx * Math.sin(ha) + ly * Math.cos(ha), rot: ha };
}
// el hedefleri (yerel, h=1)
function wristPath(t, crownL) {
  const g = [crownL.x / MAN.h - 0.02, crownL.y / MAN.h - 0.01];
  const up = [g[0] + 0.1, g[1] - 0.05];
  const out = [0.3, -0.71];
  if (t < T.grab) return { w: g, k: E.inOutCubic(seg(t, T.reach, T.grab)), ha: d(125) };
  if (t < T.lift) { const k = E.inOutSine(seg(t, T.grab, T.lift)); const a = lerp(g[0], up[0], k), b = lerp(g[1], up[1], Math.sin(k * Math.PI * 0.5)); return { w: [a, b], k: 1, ha: lerp(d(125), d(140), k) }; }
  // önce öne, sonra aşağı (taç yüzün önünden geçmesin)
  const k = E.inOutCubic(seg(t, T.lift, T.rel - 0.02)), u = 1 - k, c = [0.34, up[1] + 0.02];
  return { w: [u * u * up[0] + 2 * u * k * c[0] + k * k * out[0], u * u * up[1] + 2 * u * k * c[1] + k * k * out[1]], k: 1, ha: lerp(d(140), d(110), k) };
}
function manState(t) {
  let p = M.lerpPose(PROUD, PROUD2, E.inOutSine(seg(t, T.proud - 0.12, T.proud + 0.25)));
  const s0 = M.skeleton(p, MAN.h);
  const crownL = crownOnHead(s0, MAN.h);
  // yakın kol: taca uzanır, kaldırır, önüne uzatır
  if (t > T.reach) {
    const wp = wristPath(t, crownL);
    const k = t < T.grab ? wp.k : 1;
    const relax = E.inOutCubic(seg(t, T.rel + 0.06, T.rel + 0.5));
    // taca arkadan uzanırken dirsek yukarı-geride (kol yüzü örtmesin); öne uzatırken dirsek öne döner
    p = Wk.reach(p, wp.w, 'N', k * (1 - relax), wp.ha, true);
    p.grip = lerp(p.grip, t > T.grab - 0.04 && t < T.rel ? 0.85 : 0.1, clamp(k * 3));
  }
  // tevazu: duruş yumuşar, baş eğilir
  const hk = E.inOutCubic(seg(t, T.rel + 0.02, T.rel + 0.55));
  if (hk > 0) p = M.lerpPose(p, HUMBLE, hk);
  const lk = E.inOutCubic(seg(t, T.look, T.look + 0.5));
  if (lk > 0) p = M.lerpPose(p, LOOKUP, lk);
  const o = Object.assign({}, p);
  const br = Math.sin(t * 2.2);
  o.torso += d(0.7) * br; o.neck -= d(0.4) * br;
  if (t > 91.9 && t < 91.97) o.eye = 0.08;
  return o;
}
// tacın konumu (dünya): baştayken / eldeyken / düşerken / yerde
function crownState(t, pm) {
  const s = pm.s;
  const head = crownOnHead(s, MAN.h);
  const hw = M.toWorld([head.x, head.y], pm.o, s, pm.p);
  const onHead = { x: hw[0], y: hw[1], rot: head.rot, glow: 1, dull: 0 };
  if (t < T.grab) return onHead;
  const g = L.gripPoint(pm, 'N', 0.42);
  const inHand = { x: g[0] - 4, y: g[1] - CROWN_S * 0.12, rot: lerp(head.rot, -0.15, E.smooth(seg(t, T.grab, T.lift))), glow: 1, dull: 0 };
  if (t < T.grab + 0.08) { const k = E.smooth(seg(t, T.grab, T.grab + 0.08)); return { x: lerp(onHead.x, inHand.x, k), y: lerp(onHead.y, inHand.y, k), rot: lerp(onHead.rot, inHand.rot, k), glow: 1, dull: 0 }; }
  if (t < T.rel) return inHand;
  // bırakış anındaki konum
  const pmR = relState();
  const gx = pmR.x, gy = pmR.y;
  const fy = groundY(gx + 30) + 2;
  const tt = t - T.rel, g2 = 2600;
  const tLand = Math.sqrt(2 * (fy - gy) / g2);
  let x, y, rot;
  if (tt < tLand) { x = gx + 70 * tt; y = gy + 0.5 * g2 * tt * tt; rot = -0.15 + 2.6 * tt; }
  else {
    const b = tt - tLand;
    x = gx + 70 * tLand + 18 * (1 - Math.exp(-b * 6));
    const bounce = Math.abs(Math.sin(b * 16)) * 26 * Math.exp(-b * 7);
    y = fy - bounce;
    rot = lerp(-0.15 + 2.6 * tLand, 0.32, E.outCubic(clamp(b * 3))) + 0.12 * Math.sin(b * 14) * Math.exp(-b * 5);
  }
  const fall = clamp(tt / (tLand + 0.15));
  return { x, y, rot, glow: 1 - E.outCubic(fall), dull: E.inOutSine(fall), landed: tt >= tLand ? tt - tLand : -1 };
}
let _rel = null;
function relState() {
  if (_rel) return _rel;
  const p = manState(T.rel - 0.001);
  const o = { x: MAN.x, y: MAN.y, h: MAN.h };
  const pm = { s: M.skeleton(p, MAN.h), p, o };
  const g = L.gripPoint(pm, 'N', 0.42);
  _rel = { x: g[0] - 4, y: g[1] - CROWN_S * 0.12 };
  return _rel;
}

function drawCrown(ctx, cs, t) {
  const box = { x0: cs.x - CROWN_S, y0: cs.y - CROWN_S * 1.1, x1: cs.x + CROWN_S, y1: cs.y + CROWN_S * 0.6 };
  const lay = L.renderLayer(ctx, 's22crown', box, (x) => {
    R.crown(x, cs.x, cs.y, CROWN_S, { rot: cs.rot });
  }, { c: '#3E3A58', a: 0.5 * cs.dull + 0.08 });
  L.blitLayer(ctx, lay);
  if (cs.glow > 0.01) {
    const tw = 0.85 + 0.15 * Math.sin(t * 9);
    P.glow(ctx, cs.x, cs.y - CROWN_S * 0.3, CROWN_S * 2.2, '#FFD27A', 0.42 * cs.glow * tw);
  }
}

module.exports = {
  init() { skyCv('pre'); skyCv('dawn'); for (const k of ['pre', 'dawn']) { mountainCv(k, 'far'); mountainCv(k, 'mid'); } nearCv(); relState(); },
  draw(ctx, t) {
    const u = tiltU(t), D = dawnD(t);
    const push = E.inOutSine(seg(t, 90.4, 92.4));
    const zoom = lerp(lerp(1.08, 1.13, push), 1.0, E.inOutSine(seg(t, T.tilt0 - 0.05, T.tilt1 + 0.1)));
    const [bx, by] = R.breathe(t, 3, 22);
    R.camera(ctx, { zoom, cx: lerp(lerp(520, 505, push), 540, u) + bx, cy: lerp(lerp(985, 990, push), 960, u) + by });

    // ---- gök ----
    ctx.save(); ctx.translate(0, SH.sky * u);
    L.putCache(ctx, skyCv('pre'));
    L.putCache(ctx, skyCv('dawn'), 0, 0, D);
    L.drawStars(ctx, STARS, t, 1, { fadeBy: (st) => clamp(1.1 - D * (0.62 + 0.75 * clamp((st.y + 760) / 1300))) });
    ctx.restore();

    // ---- güneş (uzak dağların ardında) ----
    const sunY = lerp(SUN.y0, SUN.y1, E.inOutSine(seg(t, 92.05, 93.55)));
    ctx.save(); ctx.translate(0, SH.far * u);
    P.glow(ctx, SUN.x, sunY, 820, '#FF8A50', 0.34 * D);
    // ışık hüzmeleri (dağların ardında: sırtlar keskin siluet kalsın)
    if (D > 0.05) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      const dk = (D - 0.05) / 0.95;
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI / 2 + (i - 5) * 0.2 + Math.sin(t * 0.25 + i * 1.3) * 0.025;
        const w = 0.03 + 0.018 * ((i * 7) % 3);
        const Lr = 1500;
        const rg = ctx.createRadialGradient(SUN.x, sunY, 50, SUN.x, sunY, Lr);
        rg.addColorStop(0, rgba('#FFD08A', 0.16 * dk)); rg.addColorStop(0.35, rgba('#FFB070', 0.06 * dk)); rg.addColorStop(1, rgba('#FF9A60', 0));
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.moveTo(SUN.x, sunY); ctx.lineTo(SUN.x + Math.cos(a - w) * Lr, sunY + Math.sin(a - w) * Lr); ctx.lineTo(SUN.x + Math.cos(a + w) * Lr, sunY + Math.sin(a + w) * Lr); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
    P.glow(ctx, SUN.x, sunY, 300, '#FFE0A0', 0.55 * D);
    R.sun(ctx, SUN.x, sunY, SUN.R, t, { glow: '#FFD9A0', disk: '#FFF7DC', ring: '#FFB44A', seed: 4 });
    ctx.restore();

    // ---- kuş sürüsü (gökte) ----
    {
      const k = seg(t, 92.45, 94.3);
      if (k > 0) {
        const lx = lerp(-260, 820, k), ly = 1010 - 170 * k + (u - 1) * SH.sky;
        const F = [[0, 0], [-1, -1], [-1, 1], [-2, -2], [-2, 2], [-3, -3], [-3, 3], [-4, -4], [-4.6, 2.6]];
        F.forEach(([a, b], i) => {
          const bx2 = lx + a * 78 + Math.sin(t * 1.3 + i) * 8, by2 = ly + b * 44 + a * -12 + Math.sin(t * 1.7 + i * 2) * 6;
          L.flockBird(ctx, bx2, by2, 44 + (i % 3) * 4, t * 2.3 + i * 0.37, '#1E1638', 2270 + i);
        });
      }
    }

    // ---- dağlar ----
    ctx.save(); ctx.translate(0, SH.far * u);
    L.putCache(ctx, mountainCv('pre', 'far')); L.putCache(ctx, mountainCv('dawn', 'far'), 0, 0, D);
    ctx.restore();
    ctx.save(); ctx.translate(0, SH.mid * u);
    L.putCache(ctx, mountainCv('pre', 'mid')); L.putCache(ctx, mountainCv('dawn', 'mid'), 0, 0, D);
    ctx.restore();
    // ---- yakın tepe, taç, adam ----
    ctx.save(); ctx.translate(0, SH.near * u);
    L.putCache(ctx, nearCv());
    const p = manState(t);
    const la = -0.75;
    const mo = { x: MAN.x, y: MAN.y, h: MAN.h, light: la, rimAlpha: 0.6 };
    const tint = { c: '#141A4C', a: lerp(0.3, 0.16, D), c2: '#FFB070', a2: 0.05 + 0.08 * D };
    const pm = L.prepMan(ctx, p, mo, { x0: MAN.x - 0.45 * MAN.h, y0: MAN.y - 1.12 * MAN.h, x1: MAN.x + 0.62 * MAN.h, y1: MAN.y + 16 }, { slot: 's22man', tint });
    const cs = crownState(t, pm);
    // yerdeki gölge
    ctx.fillStyle = rgba('#0E1A2E', 0.35); ctx.beginPath(); ctx.ellipse(MAN.x + 8, MAN.y + 4, 0.16 * MAN.h, 0.022 * MAN.h, 0, 0, TAU); ctx.fill();
    const falling = t >= T.rel;
    if (falling) {
      ctx.fillStyle = rgba('#0E1A2E', 0.3 * clamp((cs.y - (MAN.y - 400)) / 400)); ctx.beginPath(); ctx.ellipse(cs.x, groundY(cs.x) + 4, CROWN_S * 0.55, CROWN_S * 0.08, 0, 0, TAU); ctx.fill();
    }
    L.blitMan(ctx, pm, falling ? null : (c) => drawCrown(c, cs, t));
    if (falling) drawCrown(ctx, cs, t);
    // yere değişte toz ve halka
    if (cs.landed >= 0 && cs.landed < 0.6) {
      const k = cs.landed / 0.6, gy = groundY(cs.x) + 2;
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI, rr = 20 + 60 * E.outCubic(k);
        ctx.fillStyle = rgba('#9AA0C0', 0.5 * (1 - k)); ctx.beginPath(); ctx.arc(cs.x + Math.cos(a) * rr, gy + Math.sin(a) * rr * 0.25 - 6, 6 * (1 - k * 0.5), 0, TAU); ctx.fill();
      }
    }
    // "Gururu": tacın üstünde parıltı
    const sp = seg(t, T.proud - 0.05, T.proud + 0.5);
    if (sp > 0 && sp < 1 && !falling) R.sparkle(ctx, cs.x + CROWN_S * 0.25, cs.y - CROWN_S * 0.62, 22 * Math.sin(sp * Math.PI), Math.sin(sp * Math.PI));
    ctx.restore();

    // şafak ışığı: bütün kareye çok hafif sıcak ton
    if (D > 0.15) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = rgba('#FF8A50', 0.12 * (D - 0.15)); ctx.fillRect(-200, -200, 1500, 2400); ctx.restore(); }
  },
  sfx: [
    { t: 90.92, type: 'sparkle', gain: 0.24 },
    { t: 91.3, type: 'rustle', gain: 0.18 },
    { t: 92.12, type: 'thud', gain: 0.32 },
    { t: 92.4, type: 'swell', gain: 0.32 },
    { t: 92.9, type: 'birds', gain: 0.22 },
  ],
};
