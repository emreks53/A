// S15 — "Onun eline verilen sermaye de ömürdür." (58.50–62.50)
// Yakın plan: adamın elleri s13'teki altın ışık küresini tutar; yüzü kürenin ışığıyla aydınlanır.
// "Onun eline verilen" (59.24–60.14): küre avuçlara yumuşakça oturur, dinginlikle parlar.
// "sermaye de" (60.24): küre titreşir, yörüngedeki sikkeler sarmal çizip küreye karışır, biçim değiştirmeye başlar
// (yanlardan incelir). "ömürdür" (61.20): küre zarif bir dönüşümle KUM SAATİNE (R.hourglass) dönüşür: ahşap çerçeve
// açılır, alt haznedeki altın üst hazneye çekilip kum olur, altın kum akmaya başlar (sikkelerle aynı altın).
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s13_lib');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

const MAN = { x: 150, y: 1985, h: 1500 };
const ORB_R = 200;
const HG = 540;                               // kum saati boyu (R.hourglass s)
const T_SHAKE = 60.2, T_MORPH0 = 60.55, T_MORPH1 = 61.18, T_FRAME = 61.12, T_SWAP0 = 61.34, T_SWAP1 = 61.62, T_FLOW = 61.5;

// ---------------- arka plan: sıcak, sade ----------------
function bg() {
  return R.cached('s15:bg', C.W, C.H, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, C.W, C.H);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: C.W, y1: C.H, w: C.W, h: C.H }, ['#3A2552', '#5E2F5E', '#93425E', '#C8604E', '#E0854E', '#C8604E', '#8E3E58', '#5A2C52'],
      { seed: 1501, stops: [0, 0.12, 0.26, 0.38, 0.46, 0.58, 0.78, 1], wMin: 22, wMax: 42, lMin: 90, lMax: 300, mixJitter: 0.05 });
    // geniş sıcak ışık lekesi (kürenin arkasında)
    P.glow(x, 600, 860, 900, '#FFB45A', 0.32);
    // ışığın çevresinde kısa, sıcak, yatay vurgu darbeleri
    const r = rng(1502);
    for (let i = 0; i < 40; i++) {
      const a = r.range(0, TAU), rr = r.range(180, 520), cx = 600 + Math.cos(a) * rr, cy = 860 + Math.sin(a) * rr * 0.8;
      P.stroke(x, cx - 50, cy, cx + 50, cy + r.range(-3, 3), r.range(10, 18), r.pick(['#F8B068', '#F09A5E', '#FFD08A']), r.int(1, 1e9), { detail: 0.5, taper1: 0.6 });
    }
  });
}

// ---------------- kum saati silueti (morph hedefi) ----------------
// R.hourglass ile birebir aynı cam biçimi: boyun merkezli yerel koordinat
const WD = HG * 0.62;
function bulb(sgn) {
  const H = HG;
  return P.smoothPts([[0, 0], [WD * 0.36 * 0.35, -sgn * H * 0.08], [WD * 0.42, -sgn * H * 0.3], [WD * 0.38, -sgn * H * 0.42], [-WD * 0.38, -sgn * H * 0.42], [-WD * 0.42, -sgn * H * 0.3], [-WD * 0.36 * 0.35, -sgn * H * 0.08]], true, 8);
}
const UP = bulb(1), DN = bulb(-1);
const NA = 240;
const TARGET_R = (() => {
  const out = [];
  for (let i = 0; i < NA; i++) {
    const a = (i / NA) * TAU, ca = Math.cos(a), sa = Math.sin(a);
    let best = 2;
    for (let rr = 2; rr < HG; rr += 1) { const px = ca * rr, py = sa * rr; if (P.inPoly(px, py, UP) || P.inPoly(px, py, DN)) best = rr; }
    out.push(Math.max(best, 4));
  }
  return out;
})();
// ara evreler için yumuşatılmış hedef (sivri köşesiz "fıstık" biçimi)
const TARGET_S = TARGET_R.map((_, i) => { let s = 0, n = 0; for (let j = -22; j <= 22; j++) { const w = 1 - Math.abs(j) / 23; s += TARGET_R[(i + j + NA) % NA] * w; n += w; } return s / n; });
function morphPts(cx, cy, r0, k, wob, t) {
  const pts = [];
  for (let i = 0; i < NA; i++) {
    const a = (i / NA) * TAU;
    let rr = lerp(r0, lerp(TARGET_S[i], TARGET_R[i], k * k * k), k);
    rr *= 1 + wob * (0.018 * Math.sin(a * 5 + t * 31) + 0.012 * Math.sin(a * 3 - t * 23));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return pts;
}

// ---------------- adam ----------------
const HOLD = M.pose({ torso: d(4), neck: d(8), head: d(12), armF: d(10), elbowF: d(40), eye: 0.9, brow: 0.5, mouth: 0.22 });
function poseAt(t) {
  const br = Math.sin(t * 2.2);
  let p = Object.assign({}, HOLD, { torso: HOLD.torso + d(0.5) * br, py: 0.0008 * br });
  // "eline verilen": eller hafifçe kalkıp küreyi karşılar
  const recv = E.inOutSine(seg(t, 59.1, 59.7));
  const lift = 0.012 * Math.sin(Math.PI * recv);
  // dönüşüm: küre kum saatine dönünce eller alt tabla hizasına iner
  const m = E.inOutCubic(seg(t, T_MORPH0, T_SWAP1));
  const wy = lerp(-0.588, -0.594, m) - lift;
  // iki el yan yana: yakın el geride, uzak el önde; ikisi de avuç yukarı, nesne avuçlarda
  p = L.reach(p, [0.158, wy + 0.004], 'N', 1, d(97));
  p = L.reach(p, [0.25, wy - 0.008], 'F', 1, d(97));
  p.grip = 0.28;
  // ifade: sakin hayranlık → "ömürdür"de kum saatine bakıp düşünceye dalar
  const think = E.inOutSine(seg(t, 61.25, 61.9));
  p.mouth = lerp(0.22, 0.04, think); p.brow = lerp(0.5, 0.75, think); p.head = lerp(p.head, d(16), think);
  const wonder = E.inOutSine(seg(t, 60.25, 60.6)) * (1 - think);
  p.eye = lerp(0.9, 1, wonder); p.brow -= 0.2 * wonder;
  if ((t > 59.95 && t < 60.03) || (t > 62.2 && t < 62.28)) p.eye = 0.1;
  return p;
}
const HAND_L = 0.105 * MAN.h, HAND_ANG = -0.1;
function wrists(p) { const s = M.skeleton(p, MAN.h); return { n: M.toWorld(s.armN.wrist, MAN, s, p), f: M.toWorld(s.armF.wrist, MAN, s, p) }; }
// avuçların ortası (nesne buraya oturur)
function palmTop(p) {
  const w = wrists(p);
  const a = L.cupPoint(w.n, HAND_ANG, HAND_L, 0.45, -0.06), b = L.cupPoint(w.f, HAND_ANG, HAND_L, 0.45, -0.06);
  return [lerp(a[0], b[0], 0.5) - 34, Math.min(a[1], b[1]) + 2];
}
function drawHands(ctx, p, t) {
  const w = wrists(p);
  L.cuppedHand(ctx, w.f, HAND_ANG, HAND_L, { far: true, la: -1.4, thumb: false });
  L.cuppedHand(ctx, w.n, HAND_ANG, HAND_L, { la: -1.4 });
}

const ORBIT = L.makeOrbit(10, 1511, 2);

module.exports = {
  draw(ctx, t, lt) {
    // kamera: ağır itme
    const k = E.inOutSine(seg(t, 58.2, 62.9));
    const [bx, by] = R.breathe(t, 3, 15);
    const shake = clamp(seg(t, T_SHAKE, T_SHAKE + 0.3)) * (1 - seg(t, T_MORPH1 - 0.1, T_MORPH1 + 0.15));
    R.camera(ctx, { zoom: lerp(1.2, 1.3, k), cx: lerp(492, 474, k) + bx, cy: lerp(905, 870, k) + by });
    ctx.drawImage(bg(), 0, 0);

    const p = poseAt(t);
    const palm = palmTop(p);
    const m = E.inOutCubic(seg(t, T_MORPH0, T_MORPH1));
    const vib = shake * (0.6 + 0.4 * Math.sin(t * 9));
    const jx = Math.sin(t * 71) * 4 * vib, jy = Math.cos(t * 63) * 3 * vib;
    // küre merkezi → kum saati boynu
    const orbC = [palm[0] + 34, palm[1] - ORB_R * 0.96];
    // morph sırasında alt hazne avuca oturur; çerçeve açılınca tabla için hafifçe yükselir
    const up = E.inOutCubic(seg(t, T_FRAME, T_FRAME + 0.32));
    const neck = [palm[0] + 34, palm[1] - HG * lerp(0.42, 0.5, up) + 6 * up];
    const cx = lerp(orbC[0], neck[0], m) + jx, cy = lerp(orbC[1], neck[1], m) + jy;
    const glowK = 1 + 0.35 * shake - 0.35 * seg(t, T_SWAP0, T_SWAP1 + 0.3);
    const rays = (1 - E.inOutSine(seg(t, T_MORPH0, T_MORPH1 - 0.15))) * (0.9 + 0.1 * Math.sin(t * 2));
    const swap = E.inOutSine(seg(t, T_SWAP0, T_SWAP1));

    // ışınlar adamın arkasında
    P.glow(ctx, cx, cy, 760, '#FFB45A', 0.3 * glowK);
    L.orbRays(ctx, orbC[0] + jx, orbC[1] + jy, ORB_R, t, rays, t * 0.1, 0.55);

    // yörüngedeki sikkeler: "sermaye de"de sarmal çizip küreye karışır
    const spiral = seg(t, T_SHAKE, T_SHAKE + 0.62);
    const oo = { rx: ORB_R * 1.5 * (1 - E.inCubic(spiral)), ry: ORB_R * 0.36 * (1 - E.inCubic(spiral)), tilt: -0.34, speed: 0.75 + 4 * E.inQuad(spiral), coinR: ORB_R * 0.16, born: (q) => seg(t, 58.0 + q.i * 0.05, 58.4 + q.i * 0.05), from: 0.6 };
    const items = spiral < 1 ? L.orbitItems(orbC[0] + jx, orbC[1] + jy, t, ORBIT, oo) : [];
    L.drawOrbitItems(ctx, items, t, 'back', { coinR: oo.coinR });

    // adam (ışık önden, küreden)
    const la = 0.05;
    M.drawMan(ctx, p, { x: MAN.x, y: MAN.y, h: MAN.h, light: la });
    // yüzde ve göğüste sıcak ışık
    { const s = M.skeleton(p, MAN.h), hc = M.toWorld(s.headC, MAN, s, p); P.glow(ctx, hc[0] + 70, hc[1] + 30, 260, '#FFC870', 0.4 * glowK, 'screen'); }

    // ---- küre / dönüşüm / kum saati ----
    if (swap < 1) {
      ctx.save(); ctx.globalAlpha = 1 - swap;
      if (m <= 0.001) {
        L.drawOrb(ctx, cx, cy, ORB_R, t, { glow: glowK, rays: 0 });
      } else {
        // biçim değiştiren küre: orb dokusu morph silüetine kırpılır
        const pts = morphPts(cx, cy, ORB_R, m, vib + 0.25 * Math.sin(Math.PI * m), t);
        const path = P.pathOf(pts);
        P.glow(ctx, cx, cy, ORB_R * 3.2, '#FFC861', 0.4 * glowK);
        // astar kenarı
        ctx.save(); ctx.strokeStyle = P.UNDERPAINT; ctx.lineWidth = 6; ctx.setLineDash([80, 40, 30, 60]); ctx.stroke(path); ctx.restore();
        ctx.save(); ctx.clip(path);
        const body = L.orbBody(), S = body.width, sc = lerp(1, 1.25, m) * ORB_R / L.R0;
        ctx.translate(cx, cy); ctx.scale(sc * lerp(1, 0.85, m), sc * lerp(1, 1.18, m)); ctx.drawImage(body, -S / 2, -S / 2);
        ctx.restore();
        // alt hazne boşalır: altın üst hazneye çekilir (alt bulb camlaşır)
        const drain = E.inOutSine(seg(t, T_FRAME, T_FRAME + 0.3));
        if (drain > 0) {
          ctx.save(); ctx.clip(path);
          const level = lerp(cy + 2, cy + HG * 0.46, drain);
          ctx.beginPath(); ctx.rect(cx - HG, cy, HG * 2, HG); ctx.clip();
          // altın, boyundan aşağı doğru çekilir: alt haznede seviye düşer, üstü cama döner
          ctx.beginPath(); ctx.rect(cx - HG, cy, HG * 2, (level - cy)); ctx.clip();
          ctx.globalAlpha = 1 - swap;
          ctx.drawImage(bg(), 0, 0);              // camın ardındaki arka plan
          ctx.fillStyle = rgba('#D8F0F6', 0.22); ctx.fillRect(cx - HG, cy, HG * 2, HG);
          ctx.globalAlpha = 1 - swap;
          ctx.restore();
        }
        // cam kenarı belirir
        ctx.save(); ctx.strokeStyle = rgba('#FFFFFF', 0.6 * m); ctx.lineWidth = 3; ctx.stroke(path); ctx.restore();
        P.glow(ctx, cx - ORB_R * 0.2, cy - HG * 0.2 * m - ORB_R * 0.25 * (1 - m), ORB_R * 0.7, '#FFFFFF', 0.3 * glowK);
      }
      ctx.restore();
    }
    // ahşap çerçeve: tablalar yana, direkler boyuna açılır (R.hourglass geometrisiyle aynı)
    const fr = seg(t, T_FRAME, T_FRAME + 0.36);
    if (fr > 0 && swap < 1) {
      const H = HG, base = [cx, cy + H * 0.5];
      ctx.save(); ctx.globalAlpha = 1 - swap; ctx.translate(base[0], base[1]);
      const wood = '#8A5532';
      const px = E.outBack(clamp(fr * 1.4), 1.6), py = E.outBack(clamp(fr * 1.6 - 0.4), 1.4);
      for (const yy of [-H * 0.96, -H * 0.04]) {
        ctx.save(); ctx.translate(0, yy); ctx.scale(Math.max(0.01, px), 1); ctx.translate(0, -yy);
        P.toneShape(ctx, P.roundRectPts(-WD * 0.58, yy - H * 0.045, WD * 1.16, H * 0.09, H * 0.02), { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 6, shadowW: 0.25, texture: 0.5, dabs: 3 });
        ctx.restore();
      }
      if (py > 0) for (const sx of [-1, 1]) {
        ctx.save(); ctx.translate(0, -H * 0.5); ctx.scale(1, Math.max(0.01, py)); ctx.translate(0, H * 0.5);
        P.toneShape(ctx, P.roundRectPts(sx * WD * 0.5 - H * 0.022, -H * 0.94, H * 0.044, H * 0.88, H * 0.02), { base: wood, dark: '#4E2C18', light: '#B9804E', seed: 7 + sx, shadowW: 0.35, texture: 0.4, dabs: 2, rim: false, strokeAng: Math.PI / 2 });
        ctx.restore();
      }
      ctx.restore();
    }
    // gerçek kum saati (s18 ile aynı R.hourglass)
    if (swap > 0) {
      const top = lerp(0.97, 0.86, E.inOutSine(seg(t, T_FLOW, 63.2)));
      const flow = clamp((t - T_FLOW) / 0.15);
      P.glow(ctx, cx, cy - HG * 0.22, HG * 0.75, '#FFC861', 0.32 * swap * (0.9 + 0.1 * Math.sin(t * 2.6)));
      ctx.save(); ctx.globalAlpha = swap;
      R.hourglass(ctx, cx, cy + HG * 0.5, HG, top, t, { glow: 1, flow });
      ctx.restore();
      // kum tanecikleri boyunda parıldar
      if (flow > 0) R.sparkles(ctx, cx, cy + HG * 0.12, 26, 4, t * 1.3, 1520, { rise: -20, scale: 0.6, alpha: 0.8 * swap });
    }
    // avuçlar nesnenin önünde (iki el, nesne avuçlarda)
    drawHands(ctx, p, t);
    // sikkelerin ön yarısı
    L.drawOrbitItems(ctx, items, t, 'front', { coinR: oo.coinR, shadowOn: m < 0.05 ? [orbC[0], orbC[1], ORB_R * 0.98] : null });
    // sarmalda sikkeler küreye karışırken parıltı
    if (spiral > 0.55 && spiral < 1) R.sparkles(ctx, orbC[0], orbC[1], ORB_R * 0.9, 8, t * 2, 1521, { rise: 10, alpha: 1 });
    // dönüşüm parlaması + halka
    const fl = seg(t, T_FRAME, T_FRAME + 0.5);
    if (fl > 0 && fl < 1) {
      P.glow(ctx, cx, cy, 300 + 500 * E.outCubic(fl), '#FFF4D0', 0.55 * (1 - fl), 'screen');
      ctx.save(); ctx.strokeStyle = rgba(L.GOLD_L, 0.7 * (1 - fl)); ctx.lineWidth = 12 * (1 - fl) + 2;
      ctx.beginPath(); ctx.ellipse(cx, cy, HG * (0.42 + 0.45 * E.outCubic(fl)), HG * (0.55 + 0.45 * E.outCubic(fl)), 0, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // "eline": küre avuca otururken yumuşak bir ışık halkası
    const pl = seg(t, 59.5, 60.1);
    if (pl > 0 && pl < 1) { ctx.save(); ctx.strokeStyle = rgba(L.GOLD_L, 0.55 * (1 - pl)); ctx.lineWidth = 8 * (1 - pl) + 1; ctx.beginPath(); ctx.arc(orbC[0], orbC[1], ORB_R * (1.05 + 0.7 * E.outCubic(pl)), 0, TAU); ctx.stroke(); ctx.restore(); }
    // avuçların önündeki sıcak ışık
    P.glow(ctx, palm[0], palm[1] - 10, 90, '#FFE2A0', 0.22);
    // süzülen altın zerreler
    L.motes(ctx, { x0: 250, x1: 950, y0: 300, y1: 1500 }, 28, t, 1522, { alpha: 0.6, scale: 1.2 });
  },
  sfx: [
    { t: 59.22, type: 'chime', gain: 0.2 },
    { t: 60.22, type: 'rumble', gain: 0.18 },
    { t: 60.6, type: 'whoosh', gain: 0.2 },
    { t: 61.16, type: 'bell', gain: 0.3 },
    { t: 61.5, type: 'sand', gain: 0.3 },
  ],
};
