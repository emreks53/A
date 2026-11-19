// S13 — "Belki azîm bir sermaye elinde bulunan insan," (48.20–51.70)
// Şafak. Adam tepede ayakta; "Belki" (48.80) avuçlarını öne açar, avucunda bir kıvılcım belirir.
// "azîm" (49.18): kıvılcım hızla büyüyüp ışınlar saçan kocaman altın bir ışık küresine dönüşür (parlama, halka dalgası),
// şafak ısınır, çiçekler açılır. "sermaye" (49.68): küreden sikkeler ve mücevherler fırlayıp yörüngeye oturur.
// "elinde bulunan insan" (50.30–51.34): kamera ellere doğru iter; adamın yüzü kürenin ışığıyla aydınlanır.
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s13_lib');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

const MAN = { x: 338, y: 1318, h: 640 };
const RMAX = 150;                       // kürenin son yarıçapı
const T_SPARK = 48.96, T_GROW = 49.12, T_COIN = 49.62, T_PUSH = 50.22;

// ---------------- arka plan (önbellekli) ----------------
function hillTop(x) { // ön tepenin üst kenarı (adamın bastığı sırt)
  const u = x / C.W;
  return 1312 + Math.pow((u - 0.3) / 0.75, 2) * 120 + (C.noise1(u * 5, 17) - 0.5) * 10;
}
function bgCanvas() {
  return R.cached('s13:bg', C.W, C.H, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, C.W, C.H);
    // şafak göğü: çivit → mor → gül → mercan → şeftali
    const sky = R.skyCanvas('s13dawn', C.W, 1260, ['#2A2968', '#463C8C', '#774C97', '#C2689A', '#EC8C86', '#F8BC86', '#FCD8A0'],
      { seed: 1301, stops: [0, 0.17, 0.36, 0.56, 0.73, 0.88, 1], wMin: 20, wMax: 38, lMin: 90, lMax: 280, mixJitter: 0.06 });
    x.drawImage(sky, 0, 0);
    // ufukta güneş doğmadan önceki sıcak ışık (solda)
    P.glow(x, 140, 1150, 760, '#FFD9A0', 0.55);
    P.glow(x, 140, 1160, 300, '#FFF0C8', 0.5);
    // uzak dağlar (lavanta-pembe; şafak ışığı soldan, sol yamaçlar sıcak)
    const fr = rng(1302);
    const ridge = (xx) => { const u = xx / C.W; let y = 0, a = 1, f = 2.2; for (let k = 0; k < 4; k++) { const n = C.noise1(u * f + 3.1, 1302 + k); y += a * (1 - Math.abs(2 * n - 1)); a *= 0.5; f *= 2.1; } return 1150 - y * 150; };
    const farTop = []; for (let i = 0; i <= 90; i++) { const xx = (i / 90) * C.W; farTop.push([xx, ridge(xx)]); }
    const farPts = farTop.concat([[C.W, 1320], [0, 1320]]);
    const fp = P.pathOf(farPts);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([90, 50, 40, 70]); x.stroke(P.pathOf(farTop, false)); x.restore();
    x.save(); x.clip(fp); x.fillStyle = '#A884B2'; x.fillRect(0, 900, C.W, 420); x.restore();
    P.bandFill(x, fp, { x0: 0, y0: 960, x1: C.W, y1: 1320, w: C.W, h: 360 }, ['#C994B4', '#AA86B4', '#8C78AE'], { seed: 1303, wMin: 12, wMax: 22, lMin: 50, lMax: 160, angle: 0.02, mixJitter: 0.12 });
    // yamaç darbeleri: ışığa (sola) bakan yüzler sıcak pembe, öbürleri serin mor; darbeler yamaç boyunca aşağı
    x.save(); x.clip(fp);
    for (let i = 0; i < 220; i++) {
      const xx = fr.range(0, C.W), y0 = ridge(xx), slope = (ridge(xx + 8) - ridge(xx - 8)) / 16;
      // eğim < 0: sırt sağa doğru yükseliyor → yüz sola (ışığa) bakar
      const lit = slope < -0.12, shadow = slope > 0.12;
      if (!lit && !shadow) continue;
      const dn = fr.range(8, 70);                         // sırttan aşağı derinlik
      const sx = lit ? -1 : 1, nrm = Math.hypot(1, slope);
      const ux = sx / nrm, uy = Math.abs(slope) / nrm;    // yamaç boyunca aşağı yön
      const len = fr.range(22, 54);
      const cx0 = xx + ux * dn * 0.4, cy0 = y0 + 6 + dn;
      P.stroke(x, cx0 - ux * len * 0.5, cy0 - uy * len * 0.5, cx0 + ux * len * 0.5, cy0 + uy * len * 0.5, fr.range(7, 12), lit ? (fr.chance(0.5) ? '#F2B4AA' : '#E6A0AE') : (fr.chance(0.5) ? '#7C68A8' : '#8E76B0'), fr.int(1, 1e9), { detail: 0.4, taper1: 0.6 });
    }
    x.restore();
    // orta tepeler (serin mor-mavi, yumuşak)
    const mid = []; for (let i = 0; i <= 40; i++) { const u = i / 40; mid.push([u * C.W, 1192 + Math.sin(u * 4.6 + 0.9) * 24 + Math.sin(u * 10.5) * 7]); }
    const midPts = mid.concat([[C.W, 1400], [0, 1400]]);
    const mp = P.pathOf(midPts);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 4; x.setLineDash([120, 40, 60, 80]); x.stroke(P.pathOf(mid, false)); x.restore();
    x.save(); x.clip(mp); x.fillStyle = '#5E6498'; x.fillRect(0, 1140, C.W, 260); x.restore();
    P.bandFill(x, mp, { x0: 0, y0: 1160, x1: C.W, y1: 1400, w: C.W, h: 240 }, ['#8A80B0', '#6A6CA2', '#525C90'], { seed: 1305, wMin: 12, wMax: 22, lMin: 60, lMax: 200, angle: 0.03, mixJitter: 0.1 });
    // orta tepede koyu servi ve yuvarlak ağaç siluetleri (düz, serin ton)
    const midY = (xx) => 1192 + Math.sin(xx / C.W * 4.6 + 0.9) * 24 + Math.sin(xx / C.W * 10.5) * 7;
    const trees = [[600, 'c', 78], [636, 'c', 58], [700, 'r', 34], [812, 'c', 84], [846, 'c', 62], [930, 'r', 40], [990, 'c', 70], [120, 'r', 30], [168, 'c', 60]];
    for (const [tx, kind, sz] of trees) {
      const ty = midY(tx) + 10;
      if (kind === 'c') {
        const w = sz * 0.2;
        const pts = P.smoothPts([[tx, ty - sz], [tx + w * 0.5, ty - sz * 0.62], [tx + w * 0.55, ty - sz * 0.2], [tx + w * 0.2, ty], [tx - w * 0.2, ty], [tx - w * 0.55, ty - sz * 0.2], [tx - w * 0.5, ty - sz * 0.62]], true, 6);
        x.fillStyle = '#3F4479'; x.fill(P.pathOf(pts));
        x.save(); x.clip(P.pathOf(pts)); x.fillStyle = '#7468A0'; x.fill(P.pathOf(P.translatePts(pts, -w * 0.55, 0))); x.fillStyle = '#3F4479'; x.fill(P.pathOf(P.translatePts(pts, w * 0.25, 0))); x.restore();
      } else {
        const list = [P.blobPts(tx, ty - sz * 0.9, sz * 0.62, sz * 0.5, tx, 0.12, 20), P.blobPts(tx - sz * 0.35, ty - sz * 0.62, sz * 0.4, sz * 0.36, tx + 1, 0.12, 18), P.blobPts(tx + sz * 0.38, ty - sz * 0.6, sz * 0.42, sz * 0.36, tx + 2, 0.12, 18)];
        P.toneUnion(x, list, { base: '#464C82', dark: '#3A3F72', light: '#6C64A0', rim: false, seed: tx, shadowW: 0.08, lightW: 0.1, dabs: 0, highlights: 0, texture: 0.3, lightAng: -2.8 });
      }
    }
    // ön tepe (çimen; şafakta serin yeşil, sırtında sıcak ışık)
    const top = []; for (let i = 0; i <= 60; i++) { const xx = (i / 60) * C.W; top.push([xx, hillTop(xx)]); }
    const hillPts = top.concat([[C.W, C.H], [0, C.H]]);
    const hp = P.pathOf(hillPts);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([140, 50, 60, 90]); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(hp); x.fillStyle = '#4C8A5A'; x.fillRect(0, 1250, C.W, 700); x.restore();
    P.bandFill(x, hp, { x0: 0, y0: 1290, x1: C.W, y1: C.H, w: C.W, h: 630 }, ['#7DAE5E', '#5B9A58', '#3F7E52', '#2E6248', '#28503F'],
      { seed: 1306, stops: [0, 0.12, 0.35, 0.68, 1], wMin: 18, wMax: 34, lMin: 80, lMax: 260, angle: 0.035, mixJitter: 0.06 });
    // sırtta sıcak şafak ışığı darbeleri
    for (let i = 0; i < 26; i++) {
      const xx = fr.range(0, C.W), yy = hillTop(xx) + fr.range(6, 20);
      P.stroke(x, xx - 40, yy, xx + 40, yy + fr.range(-2, 2), fr.range(7, 12), fr.chance(0.5) ? '#B8C46A' : '#D9B47A', fr.int(1, 1e9), { detail: 0.4 });
    }
    // çimen dokusu: kısa dikey darbeler (ön planda büyük)
    for (let i = 0; i < 160; i++) {
      const xx = fr.range(0, C.W), y0 = hillTop(xx) + 20;
      const yy = lerp(y0, C.H, Math.pow(fr.next(), 0.8));
      const s = lerp(10, 34, (yy - 1300) / 620);
      P.stroke(x, xx, yy, xx + fr.range(-4, 4), yy - s, s * 0.22, fr.chance(0.5) ? '#2C5A44' : '#86B860', fr.int(1, 1e9), { detail: 0.3, taper1: 0.3 });
    }
  });
}
// kayan şafak bulutları
function dawnCloud(key, w, h, seed) {
  return R.cached('s13:cl' + key, w + 40, h + 40, (x) => {
    const r = rng(seed), list = [];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      const rr = h * r.range(0.32, 0.5) * (1 - Math.abs(u - 0.45) * 0.8);
      list.push(P.ellipsePts(20 + w * (0.1 + u * 0.8), 20 + h * 0.62 - rr * 0.4, rr * 1.7, rr, 28));
    }
    list.push(P.roundRectPts(20, 20 + h * 0.5, w, h * 0.32, h * 0.16));
    P.toneUnion(x, list, { base: '#B98AB8', dark: '#8468A8', light: '#FFC6A4', seed, lightAng: 2.2, shadowW: 0.1, lightW: 0.22, strokeAng: 0, texture: 0.35, dabs: 10, rimW: 3 });
    // alt kenarda sıcak ışık darbeleri
    for (let i = 0; i < 6; i++) { const xx = 20 + w * r.range(0.1, 0.9), yy = 20 + h * 0.78; P.stroke(x, xx - w * 0.12, yy, xx + w * 0.12, yy + r.range(-2, 2), h * 0.1, '#FFD6B0', r.int(1, 1e9), { detail: 0.4, taper1: 0.5 }); }
  });
}

// ---------------- adam ----------------
const REST = M.pose({ armN: d(3), elbowN: d(9), handN: d(4), armF: d(-3), elbowF: d(8), neck: d(7), head: d(9), eye: 0.82, brow: 0.1 });
function offerPose(base, k) {
  let p = Object.assign({}, base, { neck: lerp(base.neck, d(-2), k), head: lerp(base.head, d(-12), k), grip: 0.25 * k, eye: lerp(base.eye, 0.92, k) });
  p = L.reach(p, [0.19, -0.895], 'N', k, d(128));
  p = L.reach(p, [0.262, -0.915], 'F', k, d(124));
  return p;
}
function poseAt(t) {
  const br = Math.sin(t * 2.4);
  let p = Object.assign({}, REST, { torso: REST.torso + d(0.6) * br, py: 0.0012 * br });
  const raise = E.inOutCubic(seg(t, 48.5, 48.98));
  p = offerPose(p, raise);
  // hayranlık: hafif geri çekilme, baş küreyi izler
  const awe = E.inOutCubic(seg(t, 49.16, 49.62));
  p.torso = p.torso - d(3.5) * awe; p.head = lerp(p.head, d(-20), awe); p.neck = lerp(p.neck, d(-6), awe);
  p.eye = lerp(p.eye, 1, awe); p.brow = lerp(p.brow, -0.15, awe);
  // sakin gülümseme; itmede baş hafifçe eğilir
  const warm = E.inOutSine(seg(t, 49.9, 50.6));
  p.mouth = 0.32 * warm; p.head += d(3) * E.inOutSine(seg(t, 50.4, 51.4));
  if (awe > 0) p = offerPose(p, 1); // geri eğilince eller hedefte kalsın
  if (t > 48.62 && t < 48.7) p.eye = 0.1; // göz kırpma
  return p;
}
function lightAng(t) { return lerp(-2.55, -0.85, E.inOutSine(seg(t, 49.12, 49.7))); }

// küre durumu
// avuçlar: bilekten elin yönünde, avuç yukarı (küre avuçlara oturur)
const HL = 0.085 * MAN.h;
function handsOf(p) {
  const s = M.skeleton(p, MAN.h);
  const f = (A) => { const w = M.toWorld(A.wrist, MAN, s, p), tp = M.toWorld(A.tip, MAN, s, p); return { w, ang: Math.atan2(tp[1] - w[1], tp[0] - w[0]) + 0.35 }; };
  return { n: f(s.armN), f: f(s.armF) };
}
function drawHands(ctx, p, a) {
  if (a <= 0) return;
  const hs = handsOf(p);
  ctx.save(); ctx.globalAlpha = a;
  L.cuppedHand(ctx, hs.f.w, hs.f.ang, HL, { far: true, la: -1.6, thumb: false });
  L.cuppedHand(ctx, hs.n.w, hs.n.ang, HL, { la: -1.6 });
  ctx.restore();
}
function orbState(t, p) {
  const hs = handsOf(p);
  const a = L.cupPoint(hs.n.w, hs.n.ang, HL, 0.5, -0.12), b = L.cupPoint(hs.f.w, hs.f.ang, HL, 0.5, -0.12);
  const palm = [lerp(a[0], b[0], 0.5), Math.min(a[1], b[1])];
  const g = seg(t, T_GROW, T_GROW + 0.58);
  const r = g <= 0 ? 0 : RMAX * E.outBack(g, 1.25);
  const lift = r * 0.9;
  return { x: palm[0] + 10 * clamp(r / RMAX), y: palm[1] - lift, r, palm, g };
}

const ORBIT = L.makeOrbit(13, 1361, 3);
function orbitOpts(t, o) {
  return { rx: o.r * 1.72, ry: o.r * 0.42, tilt: -0.2, speed: 0.85, coinR: o.r * 0.19, born: (q) => seg(t, T_COIN + q.i * 0.03, T_COIN + q.i * 0.03 + 0.34), t, from: 0.5 };
}

// ---------------- ön plan çiçekleri ----------------
const FLOWERS = (() => {
  const r = rng(1370), out = [];
  const spots = [[70, 1690], [150, 1735], [40, 1760], [960, 1700], [1030, 1745], [890, 1752], [210, 1772]];
  spots.forEach(([x, y], i) => out.push({ x, y, s: r.range(30, 40), seed: 1371 + i, col: r.pick(['#FBF6FF', '#FFE3EE', '#FFF4D6']), stem: r.range(60, 110) }));
  return out;
})();
function flowers(ctx, t, open) {
  for (const f of FLOWERS) {
    const sway = Math.sin(t * 1.3 + f.seed) * 0.06;
    const top = [f.x + Math.sin(sway) * f.stem, f.y - f.stem];
    P.curveStroke(ctx, [[f.x, f.y + 40], [lerp(f.x, top[0], 0.5), lerp(f.y + 40, top[1], 0.5)], top], 5, '#3E7A48', f.seed, { bristles: 1 });
    R.leaf(ctx, f.x + 2, f.y + 10, 34, -2.1 + sway, f.seed + 3, { base: '#4E8F4E', dark: '#2A5A3E', light: '#8CC060' });
    const o = clamp(0.25 + 0.75 * open);
    R.flower(ctx, top[0], top[1], f.s * (0.7 + 0.3 * o), f.seed, { open: o, color: f.col, tilt: sway });
  }
}

module.exports = {
  draw(ctx, t, lt) {
    const growK = clamp(seg(t, T_GROW, T_GROW + 0.6));
    // kamera: ağır nefes + "elinde" itmesi
    const push = E.inOutCubic(seg(t, T_PUSH, 51.5));
    const [bx, by] = R.breathe(t, 3.5, 13);
    const shake = Math.exp(-Math.max(0, t - 49.2) * 8) * (t > 49.2 ? 1 : 0);
    const sx = Math.sin(t * 61) * 5 * shake, sy = Math.cos(t * 53) * 5 * shake;
    const z0 = lerp(1.05, 1.1, seg(t, 47.9, T_PUSH));
    R.camera(ctx, { zoom: lerp(z0, 1.46, push), cx: lerp(540, 532, push) + bx + sx, cy: lerp(980, 700, push) + by + sy });

    ctx.drawImage(bgCanvas(), 0, 0);
    // yıldızlar şafakla söner
    const starA = 0.75 * (1 - 0.55 * seg(t, 47.9, 49.2)) * (1 - growK * 0.6);
    ctx.save(); ctx.globalAlpha = starA; R.stars(ctx, C.W, 560, 34, 1380, t); ctx.restore();
    // bulutlar
    ctx.drawImage(dawnCloud('a', 460, 120, 1391), 600 + t * 6 - 300, 300);
    ctx.drawImage(dawnCloud('b', 340, 90, 1392), -80 + t * 4 - 190, 520);
    ctx.drawImage(dawnCloud('c', 260, 70, 1393), 760 + t * 5 - 245, 690);

    const p = poseAt(t);
    const o = orbState(t, p);
    const la = lightAng(t);
    // kürenin ışığı ortamı ısıtır (sahne geneli sıcak örtü)
    if (growK > 0) {
      P.glow(ctx, o.x, o.y, 1250, '#FFB86A', 0.45 * growK, 'soft-light');
      P.glow(ctx, o.x, o.y + 300, 1000, '#FFC97A', 0.2 * growK, 'screen');
    }
    // adamın yere düşen gölgesi
    ctx.save(); ctx.fillStyle = rgba('#1E2A3A', 0.28);
    ctx.beginPath(); ctx.ellipse(MAN.x - 30 - 40 * growK, MAN.y + 4, 110, 14, 0, 0, TAU); ctx.fill(); ctx.restore();

    const oo = orbitOpts(t, o);
    const items = o.r > 0 ? L.orbitItems(o.x, o.y, t, ORBIT, oo) : [];
    // yörüngenin arka yarısı adamın da arkasından geçer
    if (o.r > 0) {
      L.orbitTrail(ctx, o.x, o.y, oo, 'back', seg(t, T_COIN, T_COIN + 0.6));
      L.drawOrbitItems(ctx, items, t, 'back', { coinR: oo.coinR });
    }
    // ışınlar adamın ARKASINDA (kollar ve eller ışının önünde okunur)
    const rayAmt = E.outCubic(seg(t, T_GROW + 0.1, T_GROW + 0.75));
    if (o.r > 0) L.orbRays(ctx, o.x, o.y, o.r, t, rayAmt, t * 0.14, 0.62);
    M.drawMan(ctx, p, { x: MAN.x, y: MAN.y, h: MAN.h, light: la });
    // yüzdeki sıcak ışık (kürenin yanındaki yarı)
    if (growK > 0) {
      const s = M.skeleton(p, MAN.h), hc = M.toWorld(s.headC, MAN, s, p);
      P.glow(ctx, hc[0] + 40, hc[1] - 10, 160, '#FFC870', 0.42 * growK, 'screen');
    }
    if (o.r > 0) {
      // doğuş parlaması + halka dalgası: kürenin ARKASINDA (adamı ve göğü aydınlatır, küre doygun altın kalır)
      const fl = seg(t, T_GROW, T_GROW + 0.55);
      if (fl > 0 && fl < 1) {
        P.glow(ctx, o.x, o.y, 300 + 900 * E.outCubic(fl), '#FFF0C0', 0.7 * (1 - fl), 'screen');
        ctx.save(); ctx.strokeStyle = rgba(L.GOLD_L, 0.8 * (1 - fl)); ctx.lineWidth = 16 * (1 - fl) + 2;
        ctx.beginPath(); ctx.arc(o.x, o.y, RMAX * (1 + 3.2 * E.outCubic(fl)), 0, TAU); ctx.stroke(); ctx.restore();
      }
      L.drawOrb(ctx, o.x, o.y, o.r, t, { glow: 0.6 + 0.4 * growK, rays: 0 });
      // parlamada kürenin kenarında ince sıcak hale (soluk değil, parlak altın)
      if (fl > 0 && fl < 1) P.glow(ctx, o.x, o.y, o.r * 1.35, '#FFD25A', 0.35 * (1 - fl), 'screen');
      L.orbitTrail(ctx, o.x, o.y, oo, 'front', seg(t, T_COIN, T_COIN + 0.6));
      L.drawOrbitItems(ctx, items, t, 'front', { coinR: oo.coinR, shadowOn: [o.x, o.y, o.r * 0.98] });
    }
    // avuçlar (ışınların önünde, küre avuçlarda); el kalkarken belirir
    drawHands(ctx, p, E.smooth(seg(t, 48.78, 48.95)));
    if (o.r > 0) P.glow(ctx, o.palm[0], o.palm[1] - 6, 50, '#FFE2A0', 0.18 * growK);
    // kıvılcım
    const sk = seg(t, T_SPARK, T_SPARK + 0.16);
    if (sk > 0 && t < T_GROW + 0.12) L.spark(ctx, o.palm[0] + 4, o.palm[1] - 18, 19 * E.outBack(sk, 2) * (1 + 0.12 * Math.sin(t * 40)), t, 1 - seg(t, T_GROW, T_GROW + 0.12));
    // havada süzülen altın zerreler
    if (growK > 0) { ctx.save(); ctx.globalAlpha = growK; L.motes(ctx, { x0: o.x - 420, x1: o.x + 420, y0: o.y - 520, y1: o.y + 420 }, 26, t, 1395, { alpha: 0.75 }); ctx.restore(); }
    if (o.r > 0) R.sparkles(ctx, o.x, o.y, o.r * 1.9, 9, t, 1396, { rise: 30, scale: 1.1, alpha: growK });
    // ön plan çiçekleri: ışıkla açılır
    flowers(ctx, t, E.inOutSine(seg(t, 49.3, 50.3)));
  },
  sfx: [
    { t: 48.94, type: 'sparkle', gain: 0.3 },
    { t: 49.1, type: 'swell', gain: 0.45 },
    { t: 49.2, type: 'chime', gain: 0.35 },
    { t: 49.66, type: 'coin', gain: 0.32 },
    { t: 49.9, type: 'coin', gain: 0.22 },
    { t: 50.24, type: 'whoosh', gain: 0.2 },
  ],
};
