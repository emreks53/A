// S24 — "İşte hastalık bu nokta-i nazardan hiç aldatmaz bir nâsih ve ikaz edici bir mürşiddir." (97.60–105.60)
// Gece denizi. Küçük ahşap kayıkta adam kürek çeker (gerçek kürek çekişi: kıça bakar, kayalara sırtı dönük).
// Yalıyardaki deniz feneri = hastalık, dürüst rehber.
//  98.68 "İşte hastalık": fener yanar (çakma + ışık halesi), hüzme açık denize uzanır.
//  99.64 "nokta-i nazardan": mercekte göz gibi açılan bir ışık; hüzme bir bakış gibi denizi tarar, adamın üstünden geçer.
// 101.04 "hiç aldatmaz": hüzme sabitlenir; kayığın hemen önündeki gizli kayalar (ve batık kayalar) açığa çıkar, dalga patlar.
// 102.18 "nâsih": ışık yumuşakça nabız atar, suda ışık halkaları; adam omzunun üstünden kayalara bakar.
// 103.32 "ikaz edici": kızıl uyarı çakmaları; kayık kayalardan döner.
// 104.48 "mürşiddir": hüzme suya altın bir yol serer; kayık o yoldan, ışıkları yanan güvenli limana süzülür.
// Alt bant (y≈1290–1560) sakin su: anlamlar orada okunur.
'use strict';
const { Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const S = require('./_s24_sea');
const L = require('./_s24_land');
const B = require('./_s24_boat');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

// ---------- vuruşlar ----------
const T_IGN = 98.6, T_GAZE = 99.5, T_HOLD = 101.0, T_PULSE = 102.12, T_WARN = 103.26, T_GUIDE = 104.2;
const FLASHES = [103.3, 103.56, 103.96];
const STROKE = 1.55, S0 = 97.0;        // kürek çekiş periyodu ve faz kökü
const TURN0 = 103.4, TURN1 = 104.02, TCUT = 103.556;  // dönüş; kesme 2. çakmanın tepesinde (103.533 ile 103.567 kareleri arasında)
const PSI_END = d(-160);

// ---------- altın yol (dünya koordinatı, kübik Bezier) ----------
const PATH = [[300, 1206], [150, 1200], [196, 1012], [386, 927]];
function bez(u) {
  const [a, b, c, e] = PATH, v = 1 - u;
  const k0 = v * v * v, k1 = 3 * v * v * u, k2 = 3 * v * u * u, k3 = u * u * u;
  return [a[0] * k0 + b[0] * k1 + c[0] * k2 + e[0] * k3, a[1] * k0 + b[1] * k1 + c[1] * k2 + e[1] * k3];
}
function bezTan(u) { const p = bez(Math.min(1, u + 0.01)), q = bez(Math.max(0, u - 0.01)); return Math.atan2(p[1] - q[1], p[0] - q[0]); }

// ---------- kayığın durumu ----------
function boatX_A(t) { return 440 + 15 * (t - 97.15) + 3 * Math.sin(TAU * (t - S0) / STROKE - 0.5); }
const XB = boatX_A(102.2);
function boatState(t) {
  let x, y = 1192, psi = 0, along = 0;
  if (t < 102.2) x = boatX_A(t);
  else x = XB + 15 * 0.45 * (1 - Math.exp(-(t - 102.2) / 0.45));
  // dönüş: hızlanan savrulma → kesme (kenardan görünüş hiç çizilmez) → yavaşlayarak oturma
  if (t < TCUT) psi = d(-52) * E.inSine(seg(t, TURN0, TCUT));
  else psi = lerp(d(-122), PSI_END, E.outCubic(seg(t, TCUT, TURN1)));
  // D: bir çekiş, sonra altın yol boyunca limana doğru süzülür
  if (t > TURN1 - 0.05) {
    // yolun başına doğru (sola, hafifçe uzağa): görünür bir süzülüş
    const dist = 40 * E.smooth(seg(t, 104.1, 104.55)) + (t > 104.55 ? 190 * (t - 104.55) - 40 * Math.pow(t - 104.55, 2) : 0);
    along = dist;
    x -= dist * 0.97; y -= dist * 0.13;
    psi = PSI_END + d(-8) * clamp(dist / 200);
  }
  const s = S.persp(y);
  return { x, y, psi, s, along };
}

// ---------- kürek çekişi ----------
function strokeAt(s) {
  // s: 0 kavrama, 0..0.42 çekiş, 0.42..1 dönüş
  let phi, torso, th, feather;
  if (s < 0.42) { const k = E.inOutSine(s / 0.42); phi = lerp(42, -30, k); torso = lerp(26, -15, E.inOutSine(clamp(s / 0.36))); }
  else { const k = E.inOutSine((s - 0.42) / 0.58); phi = lerp(-30, 42, k); torso = lerp(-15, 26, E.inOutSine(clamp((s - 0.5) / 0.5))); }
  const lift = E.smooth(seg(s, 0.4, 0.48)) * (1 - E.smooth(seg(s, 0.92, 0.995)));
  th = lerp(20, 8, lift);
  feather = E.smooth(seg(s, 0.44, 0.52)) * (1 - E.smooth(seg(s, 0.88, 0.95)));
  return { phi: d(phi), torso: d(torso), th: d(th), feather };
}
const HOLD = { phi: d(-6), torso: d(3), th: d(11), feather: 1 };
const GLIDE = { phi: d(-18), torso: d(-2), th: d(18), feather: 0.4 }; // palalar suda, simetrik
function blendSt(a, b, k) { return { phi: lerp(a.phi, b.phi, k), torso: lerp(a.torso, b.torso, k), th: lerp(a.th, b.th, k), feather: lerp(a.feather, b.feather, k) }; }
function manState(t) {
  let st = strokeAt(((t - S0) / STROKE) % 1);
  // B: dur, kürekler sudan çıkık
  st = blendSt(st, HOLD, E.inOutSine(seg(t, 102.1, 102.55)));
  // D: bir çekiş, sonra süzülüş
  if (t > TURN1 - 0.1) {
    const sd = clamp((t - 104.06) / 1.3, 0, 0.99);
    const row = t < 104.06 ? HOLD : strokeAt((sd + 0.9) % 1);
    st = blendSt(HOLD, row, E.smooth(seg(t, 103.95, 104.12)));
    st = blendSt(st, GLIDE, E.inOutSine(seg(t, 104.78, 105.15)));
  }
  let head = -0.55 * st.torso, eye = 1, brow = 0.05, mouth = 0, mirror = 0;
  // fener yanınca başını kaldırıp bakar
  const look = E.smooth(seg(t, 98.72, 99.0)) * (1 - E.smooth(seg(t, 99.45, 99.85)));
  head += d(-13) * look; brow += 0.25 * look;
  // hüzme üstünden geçerken gözlerini kısar
  const sq = E.smooth(seg(t, 100.32, 100.48)) * (1 - E.smooth(seg(t, 100.66, 100.85)));
  eye -= 0.45 * sq; head += d(-6) * sq;
  // nâsih: omzunun üstünden kayalara bakar, kaygı
  if (t > 102.3 && t < 103.36) { mirror = 1; head = d(6) + d(2) * Math.sin(t * 3); brow = lerp(0.2, 0.85, E.smooth(seg(t, 102.35, 102.6))); mouth = -0.35 * E.smooth(seg(t, 102.4, 102.7)); }
  // ikaz: kararlı, dönüşte öne eğilir
  if (t >= 103.36 && t < 104.1) { brow = 0.55; head = d(-2); }
  // mürşid: limana (omzunun üstünden) bakar, sakin gülümser
  if (t > 104.92) { mirror = 1; head = d(-3); brow = -0.05; mouth = 0.45 * E.smooth(seg(t, 104.96, 105.25)); eye = 0.9; }
  // nefes
  st.torso += d(0.6) * Math.sin(t * 2.4);
  return Object.assign(st, { head, eye, brow, mouth, mirror });
}

// ---------- fener hüzmesi ----------
function flashAt(t) { let f = 0; for (const tf of FLASHES) f = Math.max(f, Math.exp(-Math.pow((t - tf) / 0.075, 2))); return f; }
function pathU(t) { return E.inOutSine(seg(t, 104.46, 104.98)); }
function beamState(t, bs) {
  const on = t < T_IGN ? 0 : Math.min(1.25, C.pop(t, T_IGN, 0.38, 2.2));
  const ext = E.outCubic(seg(t, T_IGN + 0.04, T_IGN + 0.42));
  let T;
  const manPt = (tt) => { const b = boatState(tt); return [b.x + 14, 1186]; };
  const ROCK = [906, 1212];
  if (t < T_GAZE) T = [1190, lerp(470, 500, seg(t, T_IGN, T_GAZE))];
  else if (t < 100.46) {
    const k = E.inOutSine(seg(t, T_GAZE, 100.46)), mp = manPt(100.5);
    const a = [1190, 500], b = [1110, 870], c = [820, 1090], e = mp, v = 1 - k;
    T = [a[0] * v * v * v + 3 * b[0] * v * v * k + 3 * c[0] * v * k * k + e[0] * k * k * k, a[1] * v * v * v + 3 * b[1] * v * v * k + 3 * c[1] * v * k * k + e[1] * k * k * k];
  } else if (t < 100.68) T = manPt(100.5);
  else if (t < T_GUIDE) {
    const k = E.outBack(seg(t, 100.68, 101.04), 1.25), mp = manPt(100.5);
    T = [lerp(mp[0], ROCK[0], k) + 4 * Math.sin(t * 1.3), lerp(mp[1], ROCK[1], k) + 2 * Math.sin(t * 1.7)];
  } else if (t < 104.48) {
    const k = E.inOutSine(seg(t, T_GUIDE, 104.48)), p0 = bez(0.02);
    T = [lerp(ROCK[0], p0[0], k), lerp(ROCK[1], p0[1], k)];
  } else {
    T = bez(clamp(0.02 + pathU(t) * 0.98, 0, 1));
  }
  const water = E.smooth(seg(T[1], S.HZ - 10, S.HZ + 40));
  // havuz boyu (perspektif)
  let rx = Math.max(10, 0.66 * (T[1] - S.HZ)), ry = rx * 0.3;
  if (t > 104.48) { rx = Math.max(rx * 0.5, 34); ry = Math.max(ry * 0.5, 10); }
  // nabız (nâsih): iki belirgin, yumuşak nefes (102.15–102.99)
  const pk = seg(t, T_PULSE + 0.03, T_PULSE + 0.87);
  const pulse = pk > 0 && pk < 1 ? Math.pow(Math.sin(pk * Math.PI * 2), 2) : 0;
  // uyarı: kızıl çakmalar
  const warn = C.win(t, T_WARN, 104.28, 0.06, 0.25);
  const fl = flashAt(t);
  let inten = on * (1 + 0.45 * pulse);
  if (warn > 0) inten *= lerp(1, 0.5 + 0.8 * fl, warn);
  const col = mix('#FFE6A8', '#FF6A40', warn * (0.55 + 0.45 * fl));
  const guide = E.smooth(seg(t, 104.4, 104.8));
    // rehberlik: hüzme kayalardan yola geçerken havuz söner (turkuaz leke kayığın arkasından geçmesin)
  const lift = t > T_GUIDE - 0.05 && t < 104.56 ? C.win(t, T_GUIDE - 0.02, 104.56, 0.07, 0.1) : 0;
  return { on, ext, T, water: water * (1 - lift), rx: rx * (1 + 0.18 * pulse), ry: ry * (1 + 0.18 * pulse), pulse, warn, fl, inten, col, guide };
}
// havuzun fırça kenarlı biçimi (kenar gürültüsü açıya bağlı: havuz kayarken biçim kaynamaz)
function poolPts(b, k = 1) {
  const out = [];
  for (let i = 0; i < 44; i++) {
    const a = i / 44 * TAU;
    const n = 1 + 0.07 * (C.noise2(Math.cos(a) * 2 + 3, Math.sin(a) * 2, 41) - 0.5) * 2 + 0.03 * Math.sin(a * 9);
    out.push([b.T[0] + Math.cos(a) * b.rx * n * k, b.T[1] + Math.sin(a) * b.ry * n * k]);
  }
  return out;
}
function goldPathPts(u1, wk = 1) {
  if (u1 <= 0.01) return null;
  const Lft = [], Rt = [], n = 30;
  for (let i = 0; i <= n; i++) {
    const u = u1 * i / n, p = bez(u), a = bezTan(u);
    const uu = i / n;
    const w = 0.34 * wk * Math.max(16, (p[1] - S.HZ)) * (1 + 0.1 * Math.sin(u * 23 + 1)) * Math.pow(Math.sin(Math.PI * clamp(0.12 + 0.88 * uu)), 0.45) * (u < 0.06 ? 0.7 + 5 * u : 1);
    const nx = -Math.sin(a), ny = Math.cos(a);
    // perspektif: dikey bileşen basık
    Lft.push([p[0] + nx * w, p[1] + ny * w * 0.32]); Rt.push([p[0] - nx * w, p[1] - ny * w * 0.32]);
  }
  return Lft.concat(Rt.reverse());
}
function drawCone(ctx, b, alphaK = 1) {
  if (b.on <= 0.01) return;
  const lx = L.LAMP.x, ly = L.LAMP.y;
  const tx = b.T[0], ty = b.T[1];
  // uç: suya değiyorsa havuz elipsi, değmiyorsa açık uç
  const dx = tx - lx, dy = ty - ly, dist = Math.hypot(dx, dy);
  const ux = dx / dist, uy = dy / dist, nx = -uy, ny = ux;
  const ext = b.ext;
  const ex = lx + dx * ext, ey = ly + dy * ext;
  const endR = b.water > 0.5 ? null : 0.17 * dist * ext;
  let pts = [[lx + nx * 10, ly + ny * 10]];
  if (endR != null) { pts.push([ex + nx * endR, ey + ny * endR], [ex - nx * endR, ey - ny * endR]); }
  else {
    // elipse teğet noktaları: lambadan bakınca en uç açılı iki nokta
    const pp = poolPts(b, 0.98); let amin = Infinity, amax = -Infinity, imin = 0, imax = 0;
    const a0 = Math.atan2(dy, dx);
    pp.forEach((q, i) => { let a = Math.atan2(q[1] - ly, q[0] - lx) - a0; a = Math.atan2(Math.sin(a), Math.cos(a)); if (a < amin) { amin = a; imin = i; } if (a > amax) { amax = a; imax = i; } });
    // uzak yay boyunca
    const arc = []; let i = imax; for (let k = 0; k < 44; k++) { arc.push(pp[i]); if (i === imin) break; i = (i + 1) % 44; }
    const dfar = (q) => (q[0] - lx) * ux + (q[1] - ly) * uy;
    const arc2 = []; i = imax; for (let k = 0; k < 44; k++) { arc2.push(pp[i]); if (i === imin) break; i = (i - 1 + 44) % 44; }
    const use = arc.reduce((s, q) => s + dfar(q), 0) / arc.length > arc2.reduce((s, q) => s + dfar(q), 0) / arc2.length ? arc : arc2;
    pts = pts.concat(use);
  }
  pts.push([lx - nx * 10, ly - ny * 10]);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(lx, ly, ex, ey);
  const a = 0.3 * b.inten * (1 + 0.35 * b.pulse) * alphaK * (1 - 0.45 * b.guide);
  g.addColorStop(0, rgba(b.col, a)); g.addColorStop(0.5, rgba(b.col, a * 0.55)); g.addColorStop(1, rgba(b.col, endR != null ? 0 : a * 0.4));
  ctx.fillStyle = g; ctx.fill(P.pathOf(pts));
  // içte boylamasına ışık darbeleri (uç noktaları koniye bağlı → kayarken kaynamaz)
  const ends = endR != null ? [[ex + nx * endR, ey + ny * endR], [ex - nx * endR, ey - ny * endR]] : [pts[1], pts[pts.length - 2]];
  for (let i = 0; i < 6; i++) {
    const f = (i + 0.5) / 6, q = [lerp(ends[0][0], ends[1][0], f), lerp(ends[0][1], ends[1][1], f)];
    const q0 = [lerp(lx, q[0], 0.08), lerp(ly, q[1], 0.08)], q1 = [lerp(lx, q[0], 0.86), lerp(ly, q[1], 0.86)];
    const wq = [14, 30, 9, 22, 12, 26][i];
    P.stroke(ctx, q0[0], q0[1], q1[0], q1[1], wq, rgba(b.col, [0.05, 0.035, 0.06, 0.03, 0.05, 0.04][i] * b.inten * alphaK), 2701 + i, { detail: 0, taper0: 0.25, taper1: 1, ridge: false });
  }
  ctx.restore();
}
function drawLampGlow(ctx, t, b) {
  if (b.on <= 0.005) return;
  const lx = L.LAMP.x, ly = L.LAMP.y, I = b.inten;
  P.glow(ctx, lx, ly, 620 * (1 + 0.15 * b.pulse), b.col, 0.13 * I);
  P.glow(ctx, lx, ly, 230 * (1 + 0.2 * b.pulse), b.col, 0.42 * I);
  P.glow(ctx, lx, ly, 70, '#FFFFFF', 0.85 * Math.min(1.2, I));
  // yanma anı: ışın yıldızı
  const fl = Math.max(C.win(t, T_IGN, T_IGN + 0.9, 0.05, 0.6) * (1 - seg(t, T_IGN, T_IGN + 0.9) * 0.4), b.warn * b.fl);
  if (fl > 0.01) {
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + 0.2 + t * 0.15, len = (i % 2 ? 90 : 170) * fl * (1 + 0.3 * b.fl);
      P.stroke(ctx, lx + Math.cos(a) * 18, ly + Math.sin(a) * 18, lx + Math.cos(a) * len, ly + Math.sin(a) * len, i % 2 ? 5 : 8, rgba(b.col, 0.55 * fl), 2711 + i, { detail: 0, taper1: 0.15, ridge: false });
    }
    ctx.restore();
  }
}
// "nokta-i nazar": lambada göz gibi açılan ışık — boyalı kapak darbeleri (astar kenarlı) + parlayan iris
function drawGazeEye(ctx, t) {
  const open = E.outCubic(seg(t, T_GAZE - 0.06, T_GAZE + 0.24)), fade = 1 - E.smooth(seg(t, T_GAZE + 0.6, T_GAZE + 0.95));
  const a = open * fade; if (a <= 0.01) return;
  const lx = L.LAMP.x, ly = L.LAMP.y, w = 96, hh = 40 * open;
  ctx.save(); ctx.globalAlpha = a;
  P.glow(ctx, lx, ly, 120, '#FFD98A', 0.5);
  const lid = (sg, k) => { const pts = []; for (let i = 0; i <= 18; i++) { const u = i / 18 * 2 - 1; pts.push([lx + u * w * k, ly + sg * hh * k * (1 - u * u) * (1 - 0.12 * u * u)]); } return pts; };
  for (const sg of [-1, 1]) {
    const ln = lid(sg, 1);
    P.curveStroke(ctx, ln.map(([x, y]) => [x + 2, y + 2.5]), (u) => 12 * Math.pow(Math.sin(Math.PI * u), 1.2) + 1, rgba(P.UNDERPAINT, 0.7), 2725 + sg, { bristles: 1, detail: 0 });
    P.curveStroke(ctx, ln, (u) => 11 * Math.pow(Math.sin(Math.PI * u), 1.2) + 1, '#FFE2A0', 2721 + sg, { bristles: 4, detail: 1 });
    P.curveStroke(ctx, lid(sg, 0.9).slice(3, 16), (u) => 3.5 * Math.sin(Math.PI * u), rgba('#FFF6DA', 0.9), 2727 + sg, { bristles: 0, detail: 0 });
  }
  // iris: lamba çekirdeğinin çevresinde ışınsal boya darbeleri (açıldıkça büyür)
  const R0 = 15, R1 = 15 + 15 * open;
  for (let i = 0; i < 16; i++) {
    const an = i / 16 * TAU + 0.1;
    P.stroke(ctx, lx + Math.cos(an) * R0, ly + Math.sin(an) * R0, lx + Math.cos(an) * R1, ly + Math.sin(an) * R1, 6, i % 2 ? '#FFC45E' : '#FFE08A', 2730 + i, { detail: 0.5, taper1: 0.5, ridge: false });
  }
  ctx.fillStyle = '#FFFBEE'; ctx.beginPath(); ctx.arc(lx, ly, 11, 0, TAU); ctx.fill();
  ctx.restore();
}

// altın yol parıltıları: yolun üstünde göz kırpan altın darbeler (konumlar sabit)
function glitter(ctx, t, pu, a) {
  ctx.save(); ctx.globalCompositeOperation = 'screen';
  const r = rng(2761);
  for (let i = 0; i < 120; i++) {
    const u = r.next(), side = r.range(-1, 1), f1 = r.range(3, 6), sz0 = r.range(4, 12);
    if (u > pu) continue;
    const p = bez(u), ang = bezTan(u) + Math.PI / 2, w = 0.3 * Math.max(16, p[1] - S.HZ);
    const x = p[0] + side * w * Math.cos(ang), y = p[1] + side * w * 0.3 * Math.sin(ang);
    const tw = 0.5 + 0.5 * Math.sin(t * f1 + i), sz = sz0 * S.persp(y);
    P.stroke(ctx, x - sz * 1.5, y, x + sz * 1.5, y + 0.3, Math.max(1.5, sz * 0.5), rgba('#FFF0B0', 0.85 * tw * a), 2770 + i, { detail: 0, taper1: 0.4, ridge: false });
  }
  ctx.restore();
}

// ---------- kayık nesneleri ----------
function boatXf(bs, t) {
  const bob = S.bobAt(bs.y, t) * 0.85;
  const pitch = clamp(S.slopeAt(bs.y, t) * 0.0065, -0.05, 0.05) * Math.cos(bs.psi);
  return { x: bs.x, y: bs.y + bob, rot: pitch, s: bs.s };
}
function applyXf(ctx, xf) { ctx.translate(xf.x, xf.y); ctx.rotate(xf.rot); ctx.scale(xf.s, xf.s); }
function xfPt(xf, q) { const c = Math.cos(xf.rot), s = Math.sin(xf.rot); const X = q[0] * xf.s, Y = q[1] * xf.s; return [xf.x + X * c - Y * s, xf.y + X * s + Y * c]; }

// kavrama anları (sıçrama için): faz 0'a gelen zamanlar
function catches(t) {
  const out = [];
  const k0 = Math.floor((t - S0) / STROKE);
  for (let k = k0 - 1; k <= k0; k++) { const tc = S0 + k * STROKE + 0.02; if (tc < 102.1 && tc <= t) out.push(tc); }
  if (t > 104.1) out.push(104.06 + 1.3 * 0.1);
  return out;
}

module.exports = {
  draw(ctx, t) {
    // ---- kamera ----
    const kc = E.inOutSine(seg(t, 97.15, 104.2)), ke = E.inOutSine(seg(t, 104.2, 106.0));
    const [bx, by] = R.breathe(t, 3, 24);
    R.camera(ctx, { zoom: lerp(1.04, 1.085, kc) + 0.02 * ke, cx: lerp(560, 572, kc) - 40 * ke + bx, cy: lerp(984, 992, kc) - 26 * ke + by });

    const bs = boatState(t), xf = boatXf(bs, t), ms = manState(t);
    const b = beamState(t, bs);

    // ---- gök ----
    L.put(ctx, L.skyCv(), L.SKY_X0, 0);
    L.drawStars(ctx, t);
    // fener yanınca gökte sıcak hale
    if (b.on > 0) P.glow(ctx, L.LAMP.x, L.LAMP.y, 720, '#B87AA0', 0.11 * b.on);
    L.drawClouds(ctx, t);

    // ---- ışık miktarları ----
    const poolA = b.water * clamp(b.on);
    const qOf = (x, y, k = 1) => Math.hypot((x - b.T[0]) / (b.rx * k), (y - b.T[1]) / (b.ry * k * 1.6));
    const pu = pathU(t), goldA = E.smooth(seg(t, 104.44, 104.66));
    let boatLit = poolA * (1 - E.smooth(seg(qOf(bs.x, bs.y, 1.1), 0.55, 1.15)));
    if (pu > 0) boatLit = Math.max(boatLit, 0.8 * goldA);
    // gizli kayalar yalnız hüzme üstlerine oturunca açığa çıkar ("hiç" 101.04)
    const reveal = E.smooth(seg(t, 100.92, 101.08));
    const rockLit = (rk) => reveal * poolA * (1 - E.smooth(seg(qOf(rk.x, rk.y - 30), 0.6, 1.15)));

    // ---- kayık grubu ----
    const g = B.renderGroup(Object.assign({ psi: bs.psi, light: -0.95 }, ms));
    const prW = (q) => xfPt(xf, g.pr(q));
    const oarOut = (geo) => {
      const zO = geo.O[2], dz = -geo.d[2];
      const sW = dz > 0.01 ? zO / dz : 9;
      const e = prW(geo.at(Math.min(B.LOUT, sW)));
      return { geo, entry: sW < B.LOUT ? e : null, y: e[1] + 2 };
    };
    const oF = oarOut(g.oF), oN = oarOut(g.oN);
    const nearWL = xf.y + (Math.abs(Math.cos(bs.psi)) * B.HB + Math.abs(Math.sin(bs.psi)) * 1.0) * Math.sin(d(15)) * B.PPM * bs.s;
    const wlW = (Math.abs(Math.cos(bs.psi)) * B.BL * 0.92 + Math.abs(Math.sin(bs.psi)) * 1.5) * B.PPM * bs.s;

    const drawOarObj = (o) => (c, v) => {
      c.save();
      const pr = (q) => xfPt(xf, g.pr(q));
      B.drawOar(c, pr, o.geo, 'out', ms.feather, boatLit);
      c.restore();
    };
    const splashes = (c, v, which) => {
      // her kavramada pala suya girdiği yerde halka + damlalar (tohum: kavrama zamanı)
      for (const tc of catches(t)) {
        const age = t - tc; if (age < 0 || age > 1.1) continue;
        const bsc = boatState(tc), xfc = boatXf(bsc, tc);
        const nearS = Math.cos(bsc.psi) >= 0 ? 1 : -1;
        const gc = B.oarGeom(which === 'near' ? nearS : -nearS, C.deg(42), C.deg(20));
        const sW = gc.O[2] / -gc.d[2];
        const e = xfPt(xfc, B.projector(bsc.psi)(gc.at(sW)));
        const r = rng(Math.round(tc * 100) + (which === 'near' ? 0 : 5));
        const s = bsc.s * (which === 'near' ? 1 : 0.8);
        const ringK = E.outCubic(clamp(age / 1.1));
        c.save(); c.strokeStyle = rgba(v !== 'n' ? '#FFF0C8' : '#B8C8F0', 0.55 * (1 - ringK)); c.lineWidth = 2.2 * s;
        c.beginPath(); c.ellipse(e[0], e[1] + 2, (10 + 40 * ringK) * s, (3 + 10 * ringK) * s, 0, 0, TAU); c.stroke(); c.restore();
        if (age < 0.55) for (let i = 0; i < 7; i++) {
          const vx = r.range(-60, 60), vy = r.range(-130, -60), tt = age;
          const px = e[0] + vx * tt * s, py = e[1] + (vy * tt + 300 * tt * tt) * s;
          if (py > e[1] + 4) continue;
          R.sparkle(c, px, py, r.range(3, 6) * s, 0.8 * (1 - age / 0.55), v !== 'n' ? '#FFF4D8' : '#D8E2FF');
        }
      }
    };
    const wake = (c, v) => {
      const foam = v !== 'n' ? '#FFF2D0' : '#AFC0EE';
      const step = 0.11, kNow = Math.floor(t / step);
      for (let j = 0; j < 12; j++) {
        const tk = (kNow - j) * step, age = t - tk; if (age > 1.3) continue;
        const b1 = boatState(tk), b0 = boatState(tk - 0.15);
        const sp = Math.hypot(b1.x - b0.x, b1.y - b0.y) / 0.15 + Math.abs(b1.psi - b0.psi) * 60;
        if (sp < 2) continue;
        const xk = boatXf(b1, tk);
        const stern = xfPt(xk, B.projector(b1.psi)(B.hullPt(-0.95, 0.9, 0)));
        const r = rng(Math.round(tk * 1000) + 7);
        const a = clamp(sp / 18) * (1 - age / 1.3) * 0.7;
        const len = (18 + 30 * age) * b1.s;
        P.stroke(c, stern[0] - len / 2 + r.range(-6, 6), stern[1] + r.range(-2, 4) + age * 6, stern[0] + len / 2 + r.range(-6, 6), stern[1] + r.range(-2, 4) + age * 6, (3 + 2 * r.next()) * b1.s, rgba(foam, a), r.int(1, 1e9), { detail: 0, taper1: 0.4 });
      }
    };
    const boatObj = (c, v) => {
      wake(c, v);
      // kayığın suya düşen koyu gölgesi
      c.save(); c.fillStyle = rgba(v === 'l' ? '#123A56' : v === 'g' ? '#5A3A18' : '#0C1238', 0.35); c.beginPath(); c.ellipse(xf.x, nearWL + 4, wlW * 0.52, 12 * bs.s, 0, 0, TAU); c.fill(); c.restore();
      c.save(); applyXf(c, xf);
      c.drawImage(g.GN, -B.GX, -B.GY);
      if (boatLit > 0.003) { c.globalAlpha = clamp(boatLit); c.drawImage(g.GL, -B.GX, -B.GY); }
      c.restore();
      // su çizgisi: gövdenin suda kalan kısmını örter
      const wl = S.waterlineCanvas('boat', 520, 56, v, 2741, { kc: 0.3 });
      c.drawImage(wl, xf.x - wlW / 2 - 20, nearWL - 10, wlW + 40, 56 * bs.s);
    };
    // kaya köpüğü: iki köpük biçimi sırayla kabarır (tohumlar sabit)
    const rockFoam = (rk, c, v, lit) => {
      const foam = v !== 'n' ? '#FFF2D0' : mix('#4A5AA4', '#FFF2D0', lit);
      const fa = v !== 'n' ? 1 : 0.45 + 0.55 * lit;
      const w = (rk.pts[rk.pts.length - 1][0] - rk.pts[0][0]) * 0.62;
      for (let q = 0; q < 2; q++) {
        const ph = (t * 0.55 + q * 0.5) % 1, a = Math.sin(ph * Math.PI);
        const r = rng(rk.seed * 10 + q);
        for (let i = 0; i < 9; i++) {
          const an = r.range(Math.PI * 0.05, Math.PI * 0.95), rr = w * (0.85 + 0.35 * ph) * r.range(0.8, 1.15);
          const px = rk.x + Math.cos(an) * rr * (r.chance(0.5) ? 1 : -1), py = rk.y + 4 + Math.sin(an) * 7 * (0.6 + ph);
          const len = r.range(10, 26);
          P.stroke(c, px - len / 2, py, px + len / 2, py + r.range(-1, 1), r.range(3, 5), rgba(foam, 0.75 * a * fa), r.int(1, 1e9), { detail: 0, taper1: 0.5 });
        }
      }
    };
    // dalga patlaması (101.04 ve 103.5): kayaya çarpan dalganın köpüğü yukarı fışkırır
    const spray = (c, v, rk, t0, amp) => {
      const age = t - t0; if (age < 0 || age > 1.2) return;
      const r = rng(Math.round(t0 * 10) + rk.seed);
      const col = v !== 'n' ? '#FFF6E2' : '#B8C6F0';
      for (let i = 0; i < 22; i++) {
        const vx = r.range(-120, 120) * amp, vy = r.range(-330, -160) * amp, delay = r.range(0, 0.18);
        const tt = age - delay; if (tt < 0) continue;
        const px = rk.x + r.range(-40, 40) + vx * tt, py = rk.y - 20 + vy * tt + 420 * tt * tt;
        if (py > rk.y + 6) continue;
        const sz = r.range(5, 12) * (1 - tt / 1.2);
        P.stroke(c, px - sz, py, px + sz, py - sz * 0.4, sz * 0.9, rgba(col, 0.85 * (1 - tt / 1.1)), r.int(1, 1e9), { detail: 0, taper1: 0.4 });
      }
    };
    const objs = [];
    objs.push({ y: 930, top: 560, below: 12, draw: (c, v) => { L.put(c, L.cliffCv(), -90, 560); L.put(c, L.harbourCv(), 200, 820); } });
    objs.push({ y: oF.y - 6, top: xf.y - 200, below: 60, draw: (c, v) => { splashes(c, v, 'far'); drawOarObj(oF)(c, v); } });
    objs.push({ y: nearWL, top: xf.y - 260 * bs.s, below: 70, draw: boatObj });
    objs.push({ y: oN.y + 1, top: xf.y - 200, below: 60, draw: (c, v) => { drawOarObj(oN)(c, v); splashes(c, v, 'near'); } });
    for (const rk of L.ROCKS) {
      const lit = rockLit(rk);
      objs.push({ y: rk.y, top: rk.y - 140, below: 30, draw: (c, v) => { L.drawRock(c, rk, lit, S.bobAt(rk.y, t) * 0.15); rockFoam(rk, c, v, lit); } });
    }
    // dönüş kesmesi: küreklerin sertçe daldığı yerden kayığın önünde köpük perdesi (yön değişimini örter)
    const cutSpray = (c, v) => {
      const t0 = TCUT - 0.16, age = t - t0; if (age < 0 || age > 0.62) return;
      const r = rng(2791), col = v !== 'n' ? '#FFF6E2' : '#C8D4F6', sc = bs.s;
      const cx = xf.x, cy = nearWL - 6;
      for (let i = 0; i < 64; i++) {
        const vx = r.range(-190, 190), vy = r.range(-660, -360), delay = r.range(0, 0.07), ox = r.range(-0.5, 0.5) * wlW * 0.55;
        const sz0 = r.range(8, 17), sd = r.int(1, 1e9);
        const tt = age - delay; if (tt < 0) continue;
        const px = cx + ox + vx * tt * sc, py = cy + (vy * tt + 700 * tt * tt) * sc;
        if (py > cy + 6) continue;
        const sz = sz0 * sc * (1 - 0.6 * tt / 0.62);
        // uçuş yönünde ince uzun damla izi
        const ux = vx, uy = vy + 1400 * tt, ul = Math.hypot(ux, uy) || 1, L2 = sz * 1.3;
        P.stroke(c, px - ux / ul * L2, py - uy / ul * L2, px + ux / ul * L2 * 0.4, py + uy / ul * L2 * 0.4, sz * 0.55, rgba(col, 0.9 * (1 - E.smooth(clamp(tt / 0.58)))), sd, { detail: 0, taper0: 0.5, taper1: 0.9, ridge: false });
      }
    };
    objs.push({ y: nearWL + 3, top: xf.y - 260, below: 40, draw: cutSpray });
    // nâsih: kayığın çevresinde suya yayılan yumuşak ışık halkaları (arka yarı kayığın arkasında)
    const boatRing = (c, half) => {
      for (const t0 of [T_PULSE + 0.03, T_PULSE + 0.45]) {
        const k = seg(t, t0, t0 + 1.05); if (k <= 0 || k >= 1) continue;
        const rx = (120 + 230 * E.outCubic(k)) * bs.s, ry = rx * 0.2;
        const pts = []; for (let i = 0; i <= 24; i++) { const a = (half > 0 ? 0 : Math.PI) + Math.PI * i / 24; pts.push([xf.x + Math.cos(a) * rx, nearWL + Math.sin(a) * ry]); }
        c.save(); c.globalCompositeOperation = 'screen';
        P.curveStroke(c, pts, (u) => (7 * (1 - k) + 1.5) * Math.pow(Math.sin(Math.PI * u), 0.4), rgba('#FFE2A0', 0.55 * (1 - k)), 2795 + half, { bristles: 2, detail: 0 });
        c.restore();
      }
    };
    // altın yol: dalga tepelerinde yatay altın parıltılar (şeritle birlikte kayar: tepede kalır)
    const pathS = [];
    if (pu > 0.005) for (let i = 0; i <= 36; i++) { const u = pu * i / 36, p = bez(u); pathS.push([p[0], p[1], 0.42 * Math.max(16, p[1] - S.HZ) * (0.8 + 0.2 * Math.sin(Math.PI * clamp(i / 36 + 0.1)))]); }
    // yol üyeliği: parıltı kendi sırasının derinlik bandına göre sınanır (her sıra yolu kestiği yerde parıldar)
    const inside = (x, y, tol) => { let best = 0; for (const [px, py, w] of pathS) { const q = 1 - Math.pow((x - px) / w, 2) - Math.pow((y - py) / Math.max(w * 0.3, tol), 2); if (q > best) best = q; } return best; };
    if (pathS.length) {
      const bbp = P.bbox(pathS.map((q) => [q[0], q[1]]));
      for (let j = 0; j < S.ROWS.length; j++) {
        const ry0 = S.ROWS[j].y; if (ry0 < S.HZ || ry0 > 1250) continue;
        const tol = ((S.ROWS[j + 1] ? S.ROWS[j + 1].y : ry0 + 60) - (S.ROWS[j - 1] ? S.ROWS[j - 1].y : ry0 - 20)) * 0.32;
        objs.push({ y: ry0 + 0.5, top: ry0 - 50, below: 10, draw: (c) => {
          S.forGlints(j, t, bbp.x0 - 120, bbp.x1 + 120, (x, y, gg) => {
            const w = inside(x, ry0, tol); if (w <= 0.02) return;
            const a = Math.min(1, goldA * Math.pow(w, 0.4) * (0.7 + 0.35 * Math.sin(t * gg.f + gg.ph)) * (gg.top ? 1.1 : 0.85));
            const col = gg.top ? mix('#FFD266', '#FFF6D2', gg.c) : mix('#E8A040', '#FFD878', gg.c);
            P.stroke(c, x - gg.len * 0.8, y + 0.8, x + gg.len * 0.6, y + 0.6, gg.w * (1 + 0.5 * w), rgba(col, a), gg.seed, { detail: 0.6, taper1: 0.5, ridge: false });
          });
        } });
      }
    }
    objs.push({ y: 1214, top: 900, below: 20, draw: (c, v) => { spray(c, v, L.ROCKS[0], 101.0, 1); spray(c, v, L.ROCKS[1], 101.12, 0.7); spray(c, v, L.ROCKS[0], 103.5, 0.85); } });

    // ---- deniz: gece geçişi ----
    S.drawSea(ctx, t, 'n', objs);
    // ay ışığı parıltısı (ufka yakın, uzakta)
    L.drawMoonGlitter(ctx, t);

    // ---- deniz: ışık geçişleri (fener havuzu: turkuaz-altın; altın yol: kehribar) ----
    const lobjs = objs.concat(L.SUNK.map((sk) => ({ y: sk.y, top: sk.y - 30, below: 30, draw: (c) => { if (reveal <= 0) return; c.save(); c.globalAlpha *= reveal; L.drawSunk(c, sk, S.bobAt(sk.y, t) * 0.4); c.restore(); } })));
    const gp = goldPathPts(pu, 1.0);
    if (poolA > 0.01) {
      const pp = poolPts(b), bb = P.bbox(pp);
      ctx.save(); ctx.clip(P.pathOf(pp));
      ctx.globalAlpha = poolA * (t > 104.4 ? 0.55 : 1);
      S.drawSea(ctx, t, t > 104.4 ? 'g' : 'l', lobjs, [bb.y0, bb.y1]);
      ctx.globalAlpha = 1;
      if (b.warn > 0.01) { ctx.globalCompositeOperation = 'color'; ctx.fillStyle = rgba('#FF4A2A', 0.85 * b.warn * (0.4 + 0.6 * b.fl)); ctx.fillRect(bb.x0, bb.y0, bb.w, bb.h); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgba('#FF5A30', 0.25 * b.warn * b.fl); ctx.fillRect(bb.x0, bb.y0, bb.w, bb.h); ctx.globalCompositeOperation = 'source-over'; }
      ctx.restore();
    }
    if (gp) {
      // yolun gövdesi boyanmaz: yol, dalga tepelerindeki altın darbelerden ve hafif ışımadan okunur
    }
    // altın yol: hafif sıcak ışıma
    if (gp) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i <= 8; i++) { const u = pu * i / 8, p = bez(u); P.glow(ctx, p[0], p[1], 50 + 0.45 * (p[1] - S.HZ), '#FFB850', 0.05 * goldA); }
      ctx.restore();
    }
    // havuz ışıması
    if (poolA > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      ctx.translate(b.T[0], b.T[1]); ctx.scale(1, b.ry / b.rx);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, b.rx * 1.35);
      gr.addColorStop(0, rgba(b.col, 0.32 * poolA * b.inten)); gr.addColorStop(0.6, rgba(b.col, 0.12 * poolA * b.inten)); gr.addColorStop(1, rgba(b.col, 0));
      ctx.fillStyle = gr; ctx.fillRect(-b.rx * 1.4, -b.rx * 1.4, b.rx * 2.8, b.rx * 2.8);
      ctx.restore();
      // nâsih: suda yayılan ışık halkaları
      for (const t0 of [T_PULSE, T_PULSE + 0.47]) {
        const k = seg(t, t0, t0 + 1.0); if (k <= 0 || k >= 1) continue;
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        ctx.strokeStyle = rgba('#FFE6A8', 0.5 * (1 - k)); ctx.lineWidth = 4 * (1 - k) + 1;
        ctx.beginPath(); ctx.ellipse(b.T[0], b.T[1], b.rx * (0.5 + 0.9 * E.outCubic(k)), b.ry * (0.5 + 0.9 * E.outCubic(k)), 0, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    }
    // nâsih halkaları kayığın çevresinde: arka yarı gövdenin arkasında kalsın diye gövde bölgesi dışarıda bırakılır
    if (t > T_PULSE && t < T_PULSE + 1.6) {
      ctx.save();
      const hb = new Path2D(); hb.rect(-200, 0, C.W + 400, C.H); hb.rect(xf.x - wlW * 0.5, xf.y - 280 * bs.s, wlW, nearWL - xf.y + 280 * bs.s + 4);
      ctx.clip(hb, 'evenodd'); boatRing(ctx, -1); ctx.restore();
      boatRing(ctx, 1);
    }
    // ---- liman ışıkları ve yansımaları ----
    const hg = lerp(0.3, 1, E.smooth(seg(t, 104.7, 105.2)));
    L.drawHarbourReflections(ctx, t, hg);
    L.drawHarbourLights(ctx, t, hg);

    // ---- fener ----
    L.put(ctx, L.cottageCv(), 220, 520);
    L.put(ctx, L.towerCv(0), 60, 140);
    if (b.on > 0.01) { ctx.save(); ctx.globalAlpha = 0.75 * clamp(b.on); L.put(ctx, L.towerCv(1), 60, 140); ctx.restore(); }
    L.drawLantern(ctx, clamp(b.inten), b.col);
    drawCone(ctx, b);
    drawLampGlow(ctx, t, b);
    drawGazeEye(ctx, t);
    // uyarı çakmasında bütün sahneye hafif kızıl ışık
    const cutF = Math.exp(-Math.pow((t - TCUT) / 0.045, 2));
    const scr = 0.07 * b.warn * b.fl + 0.3 * cutF;
    if (scr > 0.01) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = rgba(mix('#FF5A3A', '#FFB89A', cutF), scr); ctx.fillRect(0, 0, C.W, C.H); ctx.restore(); }
  },
  sfx: [
    { t: 97.72, type: 'water', gain: 0.16 },
    { t: 98.6, type: 'swell', gain: 0.32 },
    { t: 99.55, type: 'whoosh', gain: 0.22 },
    { t: 101.0, type: 'water', gain: 0.34 },
    { t: 102.15, type: 'chime', gain: 0.16 },
    { t: 103.3, type: 'bell', gain: 0.32 },
    { t: 104.5, type: 'sparkle', gain: 0.3 },
  ],
};
