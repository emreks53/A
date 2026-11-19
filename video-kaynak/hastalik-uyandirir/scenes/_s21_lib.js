// s21–s23 ortak yardımcılar: yüksek çözünürlüklü önbellek, ekran uzayında katman (adamı ışığa göre tonlamak ve suya
// yansıtmak için), adam çizimi (gövde / yakın kol iki katman: arada fener ya da taç ana tuvale ışıklı çizilir),
// elde asılı fener, kum saati (props.js'tekinin aynısı + alt hazne doluluğu ve tek tek düşen son taneler),
// pusula, yol çantası, kuş sürüsü, yıldızlar, su halkaları. Hepsi deterministik.
'use strict';
const { createCanvas, Path2D } = require('@napi-rs/canvas');
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const { rng, clamp, lerp, mix, shade, rgba, TAU, E } = C;

// ---------- önbellek: kamera yakınlaşınca da keskin kalsın diye ss kat çözünürlükte ----------
// fn dünya koordinatında (ox, oy kaydırmalı) çizer; putCache ile dünyaya geri basılır.
// Not: bu tuval sürümünde drawImage'ın maliyeti KAYNAK tuvalin boyuyla (doğrusaldan hızlı) artıyor (1100x1300 kaynaktan
// 3 px'lik şerit bile ~6 ms). Bu yüzden büyük önbellekler 512 px'lik karolara bölünür, yalnız görünen karolar basılır.
const TILE = 512;
const _hc = new Map();
function hcache(key, ox, oy, w, h, ss, fn) {
  if (_hc.has(key)) return _hc.get(key);
  const W = Math.ceil(w * ss), H = Math.ceil(h * ss);
  const big = createCanvas(W, H), x = big.getContext('2d');
  x.scale(ss, ss); x.translate(-ox, -oy); fn(x);
  const tiles = [];
  // karolar 4 px üst üste biner (ölçekli çizimde kenar pikselleri yarı saydam kalıp dikiş göstermesin)
  for (let ty = 0; ty < H; ty += TILE) for (let tx = 0; tx < W; tx += TILE) {
    const tw = Math.min(TILE + 4, W - tx), th = Math.min(TILE + 4, H - ty);
    const cv = createCanvas(tw, th); cv.getContext('2d').drawImage(big, tx, ty, tw, th, 0, 0, tw, th);
    tiles.push({ cv, x: ox + tx / ss, y: oy + ty / ss, w: tw / ss, h: th / ss, nw: Math.min(TILE, W - tx) / ss, nh: Math.min(TILE, H - ty) / ss });
  }
  const c = { tiles, ox, oy, w, h, ss, key };
  _hc.set(key, c);
  return c;
}
function putCache(ctx, c, dx = 0, dy = 0, alpha = 1) {
  if (alpha <= 0.002) return;
  if (alpha < 0.998) {
    // saydam basım: karolar önce tam opak bir ekran katmanına, sonra katman saydam basılır (karo dikişi görünmesin)
    const lay = renderLayer(ctx, 'pc:' + c.key, { x0: c.ox + dx, y0: c.oy + dy, x1: c.ox + dx + c.w, y1: c.oy + dy + c.h }, (x) => putCache(x, c, dx, dy, 1));
    blitLayer(ctx, lay, alpha);
    return;
  }
  const m = ctx.getTransform();
  // görünen dünya dikdörtgeni (dönmesiz dönüşüm varsayımı)
  const vx0 = (-m.e) / m.a - dx, vx1 = (C.W - m.e) / m.a - dx, vy0 = (-m.f) / m.d - dy, vy1 = (C.H - m.f) / m.d - dy;
  for (const tl of c.tiles) {
    if (tl.x > vx1 || tl.x + tl.w < vx0 || tl.y > vy1 || tl.y + tl.h < vy0) continue;
    ctx.drawImage(tl.cv, tl.x + dx, tl.y + dy, tl.w, tl.h);
  }
}
// sprite: çapa (ax, ay) etrafında ölçek/dönme ile bas
function sprite(key, w, h, ax, ay, ss, fn) {
  const cv = R.cached('s21s:' + key, Math.ceil(w * ss), Math.ceil(h * ss), (x) => { x.scale(ss, ss); x.translate(ax, ay); fn(x); });
  return { cv, w, h, ax, ay };
}
function putSprite(ctx, s, x, y, sc = 1, rot = 0, alpha = 1) {
  if (sc <= 0.001 || alpha <= 0.002) return;
  ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(sc, sc);
  if (alpha < 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(s.cv, -s.ax, -s.ay, s.w, s.h);
  ctx.restore();
}

// ---------- ekran uzayında katman ----------
const _layers = new Map();
// katman tuvali: gereken boya yakın (32'lik adımlarla) tutulur — drawImage maliyeti kaynak boyuyla arttığı için
function layerCanvas(slot, w, h) {
  const W = Math.ceil(w / 32) * 32, H = Math.ceil(h / 32) * 32;
  let L = _layers.get(slot);
  if (!L || L.width !== W || L.height !== H) { L = createCanvas(W, H); _layers.set(slot, L); }
  return L;
}
// box: dünya kutusu {x0,y0,x1,y1}; fn(x) o anki kamera dönüşümüyle çizer. tint: {c, a} (source-atop renk perdesi)
function renderLayer(ctx, slot, box, fn, tint = null) {
  const m = ctx.getTransform();
  const xa = m.a * box.x0 + m.e, xb = m.a * box.x1 + m.e, ya = m.d * box.y0 + m.f, yb = m.d * box.y1 + m.f;
  const sx0 = Math.floor(clamp(Math.min(xa, xb), -40, C.W + 40)), sx1 = Math.ceil(clamp(Math.max(xa, xb), -40, C.W + 40));
  const sy0 = Math.floor(clamp(Math.min(ya, yb), -40, C.H + 40)), sy1 = Math.ceil(clamp(Math.max(ya, yb), -40, C.H + 40));
  const w = sx1 - sx0, h = sy1 - sy0;
  if (w <= 1 || h <= 1) return null;
  const cv = layerCanvas(slot, w, h), x = cv.getContext('2d');
  x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  x.clearRect(0, 0, w + 2, h + 2);
  x.setTransform(m.a, m.b, m.c, m.d, m.e - sx0, m.f - sy0);
  x.save(); fn(x, { w, h, m, sx0, sy0 }); x.restore();
  if (tint && tint.a > 0.003) {
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-atop';
    x.fillStyle = rgba(tint.c, tint.a); x.fillRect(0, 0, w, h);
    if (tint.c2 && tint.a2 > 0.003) { x.fillStyle = rgba(tint.c2, tint.a2); x.fillRect(0, 0, w, h); }
    x.globalCompositeOperation = 'source-over';
  }
  return { cv, sx: sx0, sy: sy0, w, h, m };
}
function blitLayer(ctx, L, alpha = 1) {
  if (!L || alpha <= 0.002) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = alpha;
  ctx.drawImage(L.cv, 0, 0, L.w, L.h, L.sx, L.sy, L.w, L.h);
  ctx.restore();
}
// Katmanı dünya y = wy çizgisine göre suya yansıt: şerit şerit, dalgacıklı, derinleştikçe sönen.
// Önce yansıyacak bölge yarım çözünürlükte küçük bir tuvale kopyalanır (şeritler oradan: ucuz ve doğal yumuşak).
function reflectLayer(ctx, L, wy, t, o = {}) {
  if (!L) return;
  const m = L.m, ys = m.d * wy + m.f;
  const fade = (o.fade ?? 380) * m.d, sq = o.squash ?? 1;
  const top = Math.max(L.sy, ys - fade / sq), bot = Math.min(L.sy + L.h, ys);
  if (bot <= top + 1) return;
  const HR = 0.5, rw = Math.ceil(L.w * HR), rh = Math.ceil((bot - top) * HR);
  const rc = layerCanvas('refl:' + (o.slot || 'x'), rw, rh), rx = rc.getContext('2d');
  rx.setTransform(1, 0, 0, 1, 0, 0); rx.clearRect(0, 0, rc.width, rc.height);
  rx.drawImage(L.cv, 0, top - L.sy, L.w, bot - top, 0, 0, rw, rh);
  const step = o.step ?? 3, a0 = o.alpha ?? 0.35, amp = (o.amp ?? 2.2) * m.d;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let y = bot; y > top; y -= step) {
    const d = ys - y;
    const k = (d * sq) / fade;
    if (k >= 1) break;
    const a = a0 * Math.pow(1 - k, o.pow ?? 1.4);
    if (a <= 0.004) continue;
    const xo = Math.sin(d * 0.085 + t * 2.1 + (o.ph ?? 0)) * amp * (0.5 + k * 2.5) + Math.sin(d * 0.023 - t * 1.2) * amp * k * 2;
    ctx.globalAlpha = a;
    const sh = Math.min(step, y - top);
    ctx.drawImage(rc, 0, (y - sh - top) * HR, rw, sh * HR, L.sx + xo, ys + d * sq, L.w, sh * sq + 0.6);
  }
  ctx.restore();
}

// ---------- adam ----------
// astar kenarı (parça parça çizildiğinde drawMan bunu atlıyor; s09'daki ile aynı mantık)
function manRim(ctx, s, o) {
  const h = o.h, cap = M.capsule;
  const sil = [cap(s.armF.shoulder, s.armF.elbow, 0.062 * h, 0.05 * h), cap(s.armF.elbow, s.armF.wrist, 0.05 * h, 0.042 * h),
    cap(s.legF.hip, s.legF.knee, 0.085 * h, 0.06 * h), cap(s.legF.knee, s.legF.ankle, 0.06 * h, 0.045 * h),
    cap(s.legN.hip, s.legN.knee, 0.085 * h, 0.06 * h), cap(s.legN.knee, s.legN.ankle, 0.06 * h, 0.045 * h), cap(s.hip, s.sh, 0.12 * h, 0.13 * h),
    cap(s.armN.shoulder, s.armN.elbow, 0.062 * h, 0.05 * h), cap(s.armN.elbow, s.armN.wrist, 0.05 * h, 0.042 * h)];
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(o.dir ?? 1, 1);
  if (o.rimAlpha != null) ctx.globalAlpha *= o.rimAlpha;
  ctx.strokeStyle = o.rimColor || P.UNDERPAINT; ctx.lineWidth = Math.max(1.4, h * 0.0052); ctx.lineJoin = 'round';
  ctx.setLineDash([h * 0.04, h * 0.15, h * 0.02, h * 0.2, h * 0.06, h * 0.12]);
  ctx.translate(h * 0.003, h * 0.002);
  for (const q of sil) ctx.stroke(P.pathOf(q));
  ctx.restore();
}
// drawMan'in kıl dokusu geçişi Path2D.addPath ile kırpıyor; bu tuval sürümünde kırpma bazen yelpaze biçiminde taşıyor
// (figürün yanında ince çizgi / soluk şerit). Geçici çözüm: çizimi, siluetin biraz genişletilmiş birleşimiyle kırp.
function polyArea(q) { let a = 0; for (let i = 0, j = q.length - 1; i < q.length; j = i++) a += (q[j][0] - q[i][0]) * (q[j][1] + q[i][1]); return a / 2; }
function unionPath(list) {
  const p = new Path2D();
  for (let q of list) { if (!q.length) continue; if (polyArea(q) < 0) q = q.slice().reverse(); p.moveTo(q[0][0], q[0][1]); for (let k = 1; k < q.length; k++) p.lineTo(q[k][0], q[k][1]); p.closePath(); }
  return p;
}
function manClip(s, p, o, which) {
  const h = o.h, cap = M.capsule, W = (pt) => M.toWorld(pt, o, s, p);
  const capW = (a, b, wa, wb) => cap(W(a), W(b), wa, wb, 6);
  const list = [];
  const arm = (A) => { list.push(capW(A.shoulder, A.elbow, 0.085 * h, 0.072 * h), capW(A.elbow, A.wrist, 0.072 * h, 0.064 * h), capW(A.wrist, A.tip, 0.07 * h, 0.06 * h)); };
  if (which !== 'arm') {
    arm(s.armF);
    for (const G of [s.legF, s.legN]) {
      list.push(capW(G.hip, G.knee, 0.11 * h, 0.085 * h), capW(G.knee, G.ankle, 0.085 * h, 0.07 * h));
      const fw = [Math.cos(G.fa), Math.sin(G.fa)];
      const toe = [G.ankle[0] + fw[0] * 0.15 * h, G.ankle[1] + fw[1] * 0.15 * h + 0.012 * h], heel = [G.ankle[0] - fw[0] * 0.065 * h, G.ankle[1] - fw[1] * 0.065 * h + 0.012 * h];
      list.push(capW(heel, toe, 0.085 * h, 0.07 * h));
    }
    list.push(capW([s.hip[0], s.hip[1] + 0.06 * h], s.sh, 0.17 * h, 0.17 * h));
    list.push(capW(s.sh, s.neckTop, 0.08 * h, 0.08 * h));
    const hc = W(s.headC), u = M.L.head * h;
    list.push(P.ellipsePts(hc[0], hc[1], 0.66 * u, 0.66 * u, 28));
  } else arm(s.armN);
  return unionPath(list);
}
// Adamı iki katmanda hazırla: gövde (yakın kol hariç) ve yakın kol. box: dünya kutusu.
// opts: { tint:{c,a}, slot, arm: false → tek katman }. Elde/sırtta nesneler katmanlar arasında ana tuvale çizilir.
// Doku sızıntısı (bkz. yukarı) için: aynı çizim dokusuz olarak bir maske katmanına yapılır, katman ona göre kesilir
// (destination-in); astar kenarı sonra arkaya (destination-over) eklenir.
const _noTex = () => {};
function drawManMasked(x, info, slot, p, o, parts, rimFn) {
  M.drawMan(x, p, Object.assign({}, o, { parts }));
  const mk = layerCanvas(slot + 'mask', info.w, info.h), mx = mk.getContext('2d');
  mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.clearRect(0, 0, info.w + 2, info.h + 2);
  mx.setTransform(info.m.a, info.m.b, info.m.c, info.m.d, info.m.e - info.sx0, info.m.f - info.sy0);
  const tex = P.texture; P.texture = _noTex;
  try { M.drawMan(mx, p, Object.assign({}, o, { parts })); } finally { P.texture = tex; }
  x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-in';
  x.drawImage(mk, 0, 0, info.w, info.h, 0, 0, info.w, info.h);
  x.restore();
  if (rimFn) {
    // astar kenarı: siluetin kendisinden (maske), gölge yanına 2–3 px kaydırılmış ince sürekli bant; arkaya
    const tc = layerCanvas(slot + 'rim', info.w, info.h), tx = tc.getContext('2d');
    tx.setTransform(1, 0, 0, 1, 0, 0); tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, tc.width, tc.height);
    tx.drawImage(mk, 0, 0, info.w, info.h, 0, 0, info.w, info.h);
    tx.globalCompositeOperation = 'source-in'; tx.fillStyle = P.UNDERPAINT; tx.fillRect(0, 0, info.w, info.h);
    const la = o.light ?? -2.3, px = Math.max(1.6, o.h * 0.0042 * info.m.a);
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-over'; x.globalAlpha = o.rimAlpha ?? 0.75;
    x.drawImage(tc, 0, 0, info.w, info.h, -Math.cos(la) * px, -Math.sin(la) * px, info.w, info.h);
    x.restore();
  }
}
function prepMan(ctx, p, o, box, opts = {}) {
  const slot = opts.slot || 'man';
  const s = M.skeleton(p, o.h);
  const body = renderLayer(ctx, slot + 'B', box, (x, info) => {
    drawManMasked(x, info, slot, p, o, ['armF', 'legF', 'legN', 'torso', 'head'], opts.rim !== false ? (c) => manRim(c, s, o) : null);
  }, opts.tint);
  const arm = opts.arm === false ? null : renderLayer(ctx, slot + 'A', box, (x, info) => {
    drawManMasked(x, info, slot, p, o, ['armN'], null);
  }, opts.tint);
  return { body, arm, s, p, o };
}
function blitMan(ctx, pm, between, alpha = 1) {
  blitLayer(ctx, pm.body, alpha);
  if (between) between(ctx);
  blitLayer(ctx, pm.arm, alpha);
}
const W_ = (pm, pt) => M.toWorld(pt, pm.o, pm.s, pm.p);
// elin kavrama noktası (bilek ile parmak ucu arası), dünya koordinatında
function gripPoint(pm, which = 'N', k = 0.55) {
  const a = pm.s['arm' + which];
  const w = a.wrist, tp = a.tip;
  return W_(pm, [lerp(w[0], tp[0], k), lerp(w[1], tp[1], k)]);
}

// ---------- elde asılı fener ----------
// grip: halkanın tutulduğu nokta; phi: sarkaç açısı (radyan, + saat yönü)
function lanternHang(ctx, grip, s, phi, lit, t, o = {}) {
  const bx = grip[0] - 1.12 * s * Math.sin(phi), by = grip[1] + 1.12 * s * Math.cos(phi);
  if (o.noGlow) {
    // fenerin kendi geniş ışımaları atlanır (ışık sahnede ayrıca, gövdenin arkasına çizilir); camdaki küçük ışıma kalır
    const g = P.glow; P.glow = (c, x, y, r, ...rest) => { if (r <= s * 0.5) g(c, x, y, r, ...rest); };
    try { R.lantern(ctx, bx, by, s, lit, t, { rot: phi }); } finally { P.glow = g; }
  } else R.lantern(ctx, bx, by, s, lit, t, { rot: phi });
  return lanternCore(grip, s, phi);
}
// fener camının merkezi (ışık kaynağı)
function lanternCore(grip, s, phi) {
  const bx = grip[0] - 1.12 * s * Math.sin(phi), by = grip[1] + 1.12 * s * Math.cos(phi);
  return [bx + 0.47 * s * Math.sin(phi), by - 0.47 * s * Math.cos(phi)];
}

// ---------- kum saati (props.js hourglass'ın aynısı; bot: alt hazne doluluğu, grains: düşen tanelerin ilerlemesi 0..1) ----------
function hourglass(ctx, x, y, s, top = 0.6, t = 0, o = {}) {
  const H = s, Wd = s * 0.62;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? 0);
  if (o.glow) P.glow(ctx, 0, -H * 0.5, H * 0.9, '#FFD27A', 0.35 * o.glow);
  const bulb = (sgn) => P.smoothPts([[0, -H * 0.5], [Wd * 0.36 * 0.35, -H * 0.5 - sgn * H * 0.08], [Wd * 0.42, -H * 0.5 - sgn * H * 0.3], [Wd * 0.38, -H * 0.5 - sgn * H * 0.42], [-Wd * 0.38, -H * 0.5 - sgn * H * 0.42], [-Wd * 0.42, -H * 0.5 - sgn * H * 0.3], [-Wd * 0.36 * 0.35, -H * 0.5 - sgn * H * 0.08]], true, 8);
  const up = bulb(1), dn = bulb(-1);
  for (const g of [up, dn]) { ctx.fillStyle = rgba(o.glass || '#D8F0F6', o.glassA ?? 0.22); ctx.fill(P.pathOf(g)); }
  const sand = o.sand || '#E8B23A', sandD = '#B77F1E', sandL = '#FFE08A';
  const neck = -H * 0.5;
  ctx.save(); ctx.clip(P.pathOf(up));
  const topLevel = neck - H * 0.06 - top * H * 0.32;
  if (top > 0.003) {
    const surf = []; for (let k = 0; k <= 10; k++) { const u = k / 10 * 2 - 1; surf.push([u * Wd * 0.5, topLevel + Math.abs(u) * -H * 0.03 + H * 0.02 * (1 - Math.abs(u))]); }
    const pts = surf.concat([[Wd * 0.5, neck + 4], [-Wd * 0.5, neck + 4]]);
    P.toneShape(ctx, pts, { base: sand, dark: sandD, light: sandL, rim: false, shadowW: 0.2, texture: 0.35, dabs: 3, seed: 2 });
  }
  ctx.restore();
  ctx.save(); ctx.clip(P.pathOf(dn));
  const bot = o.bot ?? 1 - top, base = -H * 0.08;
  const peak = base - bot * H * 0.36;
  if (bot > 0.01) {
    const pts = [[-Wd * 0.5, base + 4], [-Wd * 0.5, base - bot * H * 0.12], [0, peak], [Wd * 0.5, base - bot * H * 0.12], [Wd * 0.5, base + 4]];
    P.toneShape(ctx, P.smoothPts(pts, true, 6), { base: sand, dark: sandD, light: sandL, rim: false, shadowW: 0.22, texture: 0.35, dabs: 3, seed: 5 });
  }
  ctx.restore();
  // düşen tek tek taneler
  if (o.grains) {
    for (const g of o.grains) {
      const k = g.k; if (k < 0 || k > 1) continue;
      const yy = lerp(neck + 2, peak - 2, k * k);
      const sz = Math.max(2.2, s * 0.007) * (g.s ?? 1);
      ctx.fillStyle = rgba(sandL, 0.95);
      ctx.beginPath(); ctx.ellipse(g.dx ?? 0, yy, sz, sz * (1 + k * 0.8), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = rgba(sandL, 0.35);
      ctx.fillRect((g.dx ?? 0) - sz * 0.5, yy - sz * 5 * k, sz, sz * 5 * k);
    }
  }
  const flow = o.flow ?? 0;
  if (flow > 0) {
    ctx.strokeStyle = rgba(sand, flow); ctx.lineWidth = Math.max(1.5, s * 0.012);
    ctx.beginPath(); ctx.moveTo(0, neck - 2); ctx.lineTo(0, peak + 2); ctx.stroke();
  }
  for (const [g, sg] of [[up, 1], [dn, -1]]) {
    ctx.save(); ctx.clip(P.pathOf(g));
    P.stroke(ctx, -Wd * 0.26, -H * 0.5 - sg * H * 0.36, -Wd * 0.3, -H * 0.5 - sg * H * 0.12, s * 0.035, 'rgba(255,255,255,0.75)', 3, { detail: 0 });
    ctx.restore();
    ctx.strokeStyle = rgba('#FFFFFF', 0.55); ctx.lineWidth = Math.max(1.2, s * 0.008); ctx.stroke(P.pathOf(g));
  }
  const wood = o.wood || '#8A5532';
  const plate = (yy) => P.toneShape(ctx, P.roundRectPts(-Wd * 0.58, yy - H * 0.045, Wd * 1.16, H * 0.09, H * 0.02), { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 6, shadowW: 0.25, texture: 0.5, dabs: 3, rim: o.rim, lightAng: o.lightAng });
  plate(-H * 0.96); plate(-H * 0.04);
  for (const sx of [-1, 1]) {
    const post = P.roundRectPts(sx * Wd * 0.5 - H * 0.022, -H * 0.94, H * 0.044, H * 0.88, H * 0.02);
    P.toneShape(ctx, post, { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 7 + sx, shadowW: 0.35, texture: 0.4, dabs: 2, rim: false, strokeAng: Math.PI / 2, lightAng: o.lightAng });
  }
  ctx.restore();
  return { neck: y - H * 0.5, peak: y + peak, base: y + base };
}

// ---------- pusula ----------
// sabit kısım (gövde, kadran, gül, çentikler) önbellekli sprite; ibre ve cam parıltısı her karede
function compassSprite(Rc) {
  const m = 70;
  return sprite('compass' + Rc, 2 * Rc + 2 * m, 2 * Rc + 2 * m + 40, Rc + m, Rc + m + 40, 1.4, (x) => {
    const r = rng(2101);
    // askı halkası
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = Rc * 0.05; x.beginPath(); x.arc(-2, -Rc - Rc * 0.1 - 2, Rc * 0.085, 0, TAU); x.stroke(); x.restore();
    x.strokeStyle = '#B07A28'; x.lineWidth = Rc * 0.04; x.beginPath(); x.arc(0, -Rc - Rc * 0.1, Rc * 0.085, 0, TAU); x.stroke();
    x.strokeStyle = rgba('#FFE7A0', 0.8); x.lineWidth = Rc * 0.012; x.beginPath(); x.arc(0, -Rc - Rc * 0.1, Rc * 0.085, Math.PI * 1.05, Math.PI * 1.6); x.stroke();
    P.toneShape(x, P.roundRectPts(-Rc * 0.07, -Rc * 1.05, Rc * 0.14, Rc * 0.12, Rc * 0.03), { base: '#C98B2E', dark: '#7A4E17', light: '#F2C66A', seed: 2102, rim: false, shadowW: 0.3, dabs: 1, texture: 0.3 });
    // pirinç gövde
    P.toneShape(x, P.ellipsePts(0, 0, Rc, Rc, 72), { base: '#C98B2E', dark: '#7E4F1A', light: '#F4CB72', seed: 2103, shadowW: 0.1, lightW: 0.07, dabs: 14, strokeAng: 0.6, texture: 0.45 });
    // iç oluk (ters ışık)
    P.toneShape(x, P.ellipsePts(0, 0, Rc * 0.9, Rc * 0.9, 72), { base: '#9E6620', dark: '#6A3E12', light: '#E0AE58', lightAng: 0.85, seed: 2104, rim: false, shadowW: 0.06, lightW: 0.05, dabs: 6, texture: 0.35 });
    // kadran
    const RF = Rc * 0.84;
    P.toneShape(x, P.ellipsePts(0, 0, RF, RF, 72), { base: '#F2E6C8', dark: '#D8C7A2', light: '#FFF8E8', seed: 2105, rim: false, shadowW: 0.05, lightW: 0.04, dabs: 8, texture: 0.3, strokeAng: 0.2 });
    // gül: 4 ana uç (iki tonlu), 4 ara uç
    const point = (ang, len, wd, c1, c2) => {
      const ca = Math.cos(ang - Math.PI / 2), sa = Math.sin(ang - Math.PI / 2);
      const tip = [ca * len, sa * len], l = [Math.cos(ang) * wd, Math.sin(ang) * wd], rr = [-l[0], -l[1]];
      x.fillStyle = c1; x.beginPath(); x.moveTo(0, 0); x.lineTo(tip[0], tip[1]); x.lineTo(rr[0], rr[1]); x.closePath(); x.fill();
      x.fillStyle = c2; x.beginPath(); x.moveTo(0, 0); x.lineTo(tip[0], tip[1]); x.lineTo(l[0], l[1]); x.closePath(); x.fill();
    };
    for (let i = 0; i < 4; i++) point(Math.PI / 4 + i * Math.PI / 2, RF * 0.5, RF * 0.09, '#DCC59A', '#BFA06E');
    for (let i = 0; i < 4; i++) point(i * Math.PI / 2, RF * 0.74, RF * 0.12, '#5E9AA2', '#3B6E7A');
    // çentikler
    x.strokeStyle = '#4A3A52'; x.lineCap = 'butt';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * TAU, big = i % 9 === 0, mid = i % 3 === 0;
      const r0 = RF * (big ? 0.84 : mid ? 0.88 : 0.91), r1 = RF * 0.965;
      x.lineWidth = big ? RF * 0.018 : RF * 0.009;
      x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); x.stroke();
    }
    x.lineWidth = RF * 0.008; x.beginPath(); x.arc(0, 0, RF * 0.8, 0, TAU); x.stroke();
    // kuzey işareti (harf değil: küçük kırmızı üçgen)
    x.fillStyle = '#D2453A'; x.beginPath(); x.moveTo(0, -RF * 0.98); x.lineTo(RF * 0.05, -RF * 0.86); x.lineTo(-RF * 0.05, -RF * 0.86); x.closePath(); x.fill();
    // dokulu boya izi
    x.save(); x.beginPath(); x.arc(0, 0, RF, 0, TAU); x.clip(); P.texture(x, { x0: -RF, y0: -RF, x1: RF, y1: RF, w: 2 * RF, h: 2 * RF, cx: 0, cy: 0 }, 0.3, 0.35, 0.8); x.restore();
    void r;
  });
}
function compassNeedle(ctx, Rc, ang, a = 1) {
  const RF = Rc * 0.84, L = RF * 0.8, w = RF * 0.085;
  ctx.save(); ctx.rotate(ang); ctx.globalAlpha *= a;
  // gölge
  ctx.save(); ctx.translate(RF * 0.03, RF * 0.04); ctx.fillStyle = 'rgba(40,24,40,0.25)';
  ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(w, 0); ctx.lineTo(0, L * 0.86); ctx.lineTo(-w, 0); ctx.closePath(); ctx.fill(); ctx.restore();
  const tri = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); };
  tri([[0, -L], [-w, 0], [0, 0]], '#EE5E48'); tri([[0, -L], [w, 0], [0, 0]], '#B8302C');
  tri([[0, L * 0.86], [-w, 0], [0, 0]], '#5E6CA6'); tri([[0, L * 0.86], [w, 0], [0, 0]], '#38457C');
  ctx.strokeStyle = rgba('#FFE6C8', 0.6); ctx.lineWidth = RF * 0.008; ctx.beginPath(); ctx.moveTo(-w * 0.15, -L * 0.85); ctx.lineTo(-w * 0.75, -L * 0.08); ctx.stroke();
  ctx.restore();
  // göbek
  P.toneShape(ctx, P.ellipsePts(0, 0, RF * 0.075, RF * 0.075, 20), { base: '#D49A3A', dark: '#8A5A1A', light: '#FFE08A', rim: false, shadowW: 0.3, lightW: 0.2, dabs: 0, highlights: 1, texture: 0.2, seed: 2110 });
}
function compassGlass(ctx, Rc, a = 1) {
  const RF = Rc * 0.84;
  ctx.save(); ctx.globalAlpha *= a;
  const arc = []; for (let k = 0; k <= 10; k++) { const aa = Math.PI * (1.08 + 0.32 * k / 10); arc.push([Math.cos(aa) * RF * 0.82, Math.sin(aa) * RF * 0.82]); }
  P.curveStroke(ctx, arc, RF * 0.06, 'rgba(255,255,255,0.32)', 2120, { taper: true, bristles: 2 });
  const arc2 = []; for (let k = 0; k <= 6; k++) { const aa = Math.PI * (1.45 + 0.1 * k / 6); arc2.push([Math.cos(aa) * RF * 0.7, Math.sin(aa) * RF * 0.7]); }
  P.curveStroke(ctx, arc2, RF * 0.03, 'rgba(255,255,255,0.28)', 2121, { taper: true, bristles: 1 });
  ctx.restore();
}

// ---------- yol çantası (deri heybe) ----------
// çapa: kayış halkalarının ortası (çantanın üst kenarı). s: genişlik
function bagSprite(s) {
  return sprite('bag' + s, s * 1.5, s * 1.3, s * 0.75, s * 0.2, 1.4, (x) => {
    const w = s, h = s * 0.82;
    const body = P.smoothPts([[-w * 0.5, h * 0.05], [-w * 0.52, h * 0.55], [-w * 0.44, h * 0.92], [0, h * 0.98], [w * 0.44, h * 0.92], [w * 0.52, h * 0.55], [w * 0.5, h * 0.05], [0, -h * 0.02]], true, 6);
    P.toneShape(x, body, { base: '#8E5232', dark: '#552C1C', light: '#BC7A4C', seed: 2201, shadowW: 0.16, lightW: 0.1, dabs: 6, strokeAng: 0.1, texture: 0.5 });
    // kapak
    const flap = P.smoothPts([[-w * 0.53, h * 0.02], [-w * 0.5, h * 0.42], [-w * 0.2, h * 0.56], [w * 0.2, h * 0.56], [w * 0.5, h * 0.42], [w * 0.53, h * 0.02], [0, -h * 0.06]], true, 6);
    P.toneShape(x, flap, { base: '#7A4128', dark: '#4A2416', light: '#A86640', seed: 2202, rim: false, shadowW: 0.2, lightW: 0.1, dabs: 4, strokeAng: 0.1, texture: 0.5 });
    // dikiş
    x.save(); x.strokeStyle = rgba('#E8C08A', 0.6); x.lineWidth = Math.max(1, s * 0.014); x.setLineDash([s * 0.04, s * 0.035]);
    x.beginPath(); x.moveTo(-w * 0.44, h * 0.38); x.quadraticCurveTo(0, h * 0.58, w * 0.44, h * 0.38); x.stroke(); x.restore();
    // kayış tokası
    P.toneShape(x, P.roundRectPts(-w * 0.07, h * 0.36, w * 0.14, h * 0.3, w * 0.03), { base: '#5A2E1C', dark: '#3A1C10', light: '#7A4A30', seed: 2203, rim: false, shadowW: 0.3, dabs: 0, texture: 0.3 });
    P.toneShape(x, P.roundRectPts(-w * 0.09, h * 0.48, w * 0.18, h * 0.11, w * 0.02), { base: '#D4A040', dark: '#8A6418', light: '#FFE08A', seed: 2204, rim: false, shadowW: 0.3, dabs: 0, highlights: 1, texture: 0.2 });
    // halkalar
    x.strokeStyle = '#B08A3A'; x.lineWidth = s * 0.035;
    for (const sx of [-1, 1]) { x.beginPath(); x.arc(sx * w * 0.42, -h * 0.02, s * 0.05, 0, TAU); x.stroke(); }
  });
}
// kayış: noktalar dizisi boyunca kalın deri şerit
function strap(ctx, pts, w) {
  const line = P.smoothPts(pts, false, 6);
  P.curveStroke(ctx, line, w, '#5E321E', 2210, { bristles: 2 });
  ctx.strokeStyle = rgba('#9A5E3A', 0.7); ctx.lineWidth = Math.max(1, w * 0.18);
  ctx.beginPath(); ctx.moveTo(line[0][0], line[0][1] - w * 0.25); for (const q of line) ctx.lineTo(q[0], q[1] - w * 0.25); ctx.stroke();
}

// ---------- kuş (uzak sürü silueti) ----------
function flockBird(ctx, x, y, s, phase, col, seed = 1) {
  const f = Math.sin(phase * TAU); // +1 kanat yukarı
  const tipY = -s * 0.42 * f - s * 0.06, midY = -s * 0.22 * f + s * 0.05;
  for (const sg of [-1, 1]) {
    const line = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      const bx = x + sg * s * u, by = y + (u < 0.5 ? lerp(0, midY, u * 2) : lerp(midY, tipY, (u - 0.5) * 2)) + Math.sin(u * Math.PI) * s * 0.06;
      line.push([bx, by]);
    }
    P.curveStroke(ctx, line, (u) => s * 0.17 * (1 - u * 0.85), col, seed * 7 + (sg > 0 ? 1 : 0), { detail: 0 });
  }
  ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + s * 0.02, s * 0.16, s * 0.08, 0, 0, TAU); ctx.fill();
}

// ---------- yıldızlar ----------
function starList(seed, n, box, o = {}) {
  const r = rng(seed), out = [];
  for (let i = 0; i < n; i++) {
    const y = box.y0 + Math.pow(r.next(), o.bias ?? 1) * (box.y1 - box.y0);
    out.push({ x: r.range(box.x0, box.x1), y, s: r.chance(o.bigP ?? 0.08) ? r.range(3.2, 5) : r.range(1.1, 2.8), ph: r.range(0, TAU), sp: r.range(1.2, 3.4), warm: r.chance(0.22) });
  }
  return out;
}
function drawStars(ctx, list, t, a = 1, o = {}) {
  if (a <= 0.003) return;
  for (const st of list) {
    const tw = 0.62 + 0.38 * Math.sin(t * st.sp + st.ph);
    const al = a * tw * (o.fadeBy ? o.fadeBy(st) : 1);
    if (al <= 0.01) continue;
    const c = st.warm ? '#FFE7B0' : '#F2F0FF';
    ctx.fillStyle = rgba(c, al);
    if (o.reflect) {
      const y = 2 * o.reflect - st.y;
      ctx.fillRect(st.x - st.s * 2.2, y - st.s * 0.35, st.s * 4.4, st.s * 0.7);
      continue;
    }
    ctx.beginPath(); ctx.arc(st.x, st.y, st.s, 0, TAU); ctx.fill();
    if (st.s > 3) {
      const L = st.s * (2.6 + tw);
      ctx.fillStyle = rgba(c, al * 0.8);
      ctx.beginPath(); ctx.moveTo(st.x - L, st.y); ctx.lineTo(st.x, st.y - 1.1); ctx.lineTo(st.x + L, st.y); ctx.lineTo(st.x, st.y + 1.1); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(st.x, st.y - L); ctx.lineTo(st.x - 1.1, st.y); ctx.lineTo(st.x, st.y + L); ctx.lineTo(st.x + 1.1, st.y); ctx.closePath(); ctx.fill();
    }
  }
}
// dört kollu parlak yıldız
function brightStar(ctx, x, y, s, a = 1, rot = 0) {
  if (a <= 0.003) return;
  P.glow(ctx, x, y, s * 5, '#BFD4FF', 0.35 * a);
  P.glow(ctx, x, y, s * 2.2, '#FFF4D8', 0.55 * a);
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a;
  ctx.fillStyle = '#FFFBEF';
  for (let i = 0; i < 4; i++) {
    const L = i % 2 ? s * 3.2 : s * 4.2;
    ctx.save(); ctx.rotate(i * Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -L); ctx.quadraticCurveTo(s * 0.12, -s * 0.3, s * 0.5, 0); ctx.lineTo(-s * 0.5, 0); ctx.quadraticCurveTo(-s * 0.12, -s * 0.3, 0, -L); ctx.fill();
    ctx.restore();
  }
  ctx.rotate(Math.PI / 4); ctx.globalAlpha *= 0.55;
  for (let i = 0; i < 4; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 2);
    ctx.beginPath(); ctx.moveTo(0, -s * 1.7); ctx.quadraticCurveTo(s * 0.08, -s * 0.2, s * 0.3, 0); ctx.lineTo(-s * 0.3, 0); ctx.quadraticCurveTo(-s * 0.08, -s * 0.2, 0, -s * 1.7); ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.fillStyle = rgba('#FFFFFF', a); ctx.beginPath(); ctx.arc(x, y, s * 0.5, 0, TAU); ctx.fill();
}

// ---------- su halkası ----------
function ripple(ctx, x, y, rx, a, col = '#CFD8FF', w = 3, seed = 1) {
  if (a <= 0.003 || rx <= 1) return;
  ctx.save();
  ctx.strokeStyle = rgba(col, a); ctx.lineWidth = w; ctx.lineCap = 'round';
  const r = rng(seed);
  const d = []; for (let i = 0; i < 6; i++) d.push(rx * r.range(0.3, 0.9), rx * r.range(0.08, 0.3));
  ctx.setLineDash(d); ctx.lineDashOffset = r.range(0, 100);
  ctx.beginPath(); ctx.ellipse(x, y, rx, rx * 0.16, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

// ---------- süzülen ışık zerreleri ----------
function motes(ctx, t, n, box, seed, o = {}) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = r.range(box.x0, box.x1), y0 = r.range(box.y0, box.y1), sp = r.range(14, 34) * (o.speed ?? 1), ph = r.range(0, TAU), sz = r.range(1.5, 3.6);
    const hgt = box.y1 - box.y0;
    let y = y0 - t * sp; y = box.y0 + ((((y - box.y0) % hgt) + hgt) % hgt);
    const x = x0 + Math.sin(t * 0.7 + ph) * 14;
    const edge = Math.min(1, (y - box.y0) / 120, (box.y1 - y) / 120);
    const a = (o.alpha ?? 0.6) * edge * (0.6 + 0.4 * Math.sin(t * 2 + ph));
    if (a <= 0.01) continue;
    ctx.fillStyle = rgba(r.chance(0.5) ? (o.c1 || '#FFE2A0') : (o.c2 || '#C8D0FF'), a);
    ctx.beginPath(); ctx.arc(x, y, sz, 0, TAU); ctx.fill();
  }
}

module.exports = {
  unionPath, manClip,
  hcache, putCache, sprite, putSprite, renderLayer, blitLayer, reflectLayer, manRim, prepMan, blitMan, W_, gripPoint,
  lanternHang, lanternCore, hourglass, compassSprite, compassNeedle, compassGlass, bagSprite, strap, flockBird,
  starList, drawStars, brightStar, ripple, motes,
};
