// S12 — "Demek insan, bu dünyaya yalnız güzel yaşamak için ve rahatla ve safa ile ömür geçirmek için gelmemiştir."
// (39.60–48.20) Aydınlık, sade bir tepe. 40.38 "Demek insan": adam tepede durur, başını kaldırır.
// 41.2 "bu dünyaya": yanındaki çimenden dev, yanardöner bir sabun köpüğü yükselip şişer; içinde rüya bahçesi
// (güzel ev, çiçekler, iki ağaç) beliri. 44.08 "ve rahatla": köpüğün içinde adamın hayali eşi hamakta sallanır,
// çay içer (45.0 yudum); köpüğün göğünde minik güneş giderek hızlanarak döner (ömür geçiyor). 46.56 "gelmemiştir":
// köpük PATLAR (delik bir noktadan açılıp yayılır; damlacıklar, rüyanın boya kırıntıları, parıltılar). Gerçek adam
// sakin; elini indirir, bir an düşünür, sonra bakışını ufka kaldırır; ufukta sıcak bir aydınlık (s13 şafağına köprü).
'use strict';
const C = require('../engine/core');
const P = require('../engine/paint');
const R = require('../engine/props');
const M = require('../engine/man');
const L = require('./_s11_lib');
const D = require('./_s11_dream');
const { seg, E, lerp, clamp, rgba, mix, shade, TAU, rng } = C;
const d = C.deg;

const LA = -2.3;
const MAN = { x: 262, h: 470 };
const hillY = (x) => (x < 250 ? 1176 + 0.0006 * (x - 250) * (x - 250) : 1176 + 0.00031 * (x - 250) * (x - 250));
const T_IN = 41.12, T_FULL = 41.98, T_POP = 46.56;
// köpük adamın başının sağ üstünde (9:16'da üst üste dizilim: köpük üst yarı, adam alt yarı)
const BUB = { x: 503, y: 514, r: 269 };

// ---------- s13 ile eşleşen geçiş ----------
// s13 açılışında adam aynı yerde durur; çözülmede iki adamın üst üste oturması için son kadrajı s13'ün
// adamına (MAN) ve kamerasına göre kur. s13 yazarı değerleri değiştirirse kaynaktan okunur; okunamazsa varsayılan.
const MATCH = (() => {
  const m = { x: 338, y: 1318, h: 640, zoom: 1.055, cx: 540, cy: 980 };
  try {
    const src = require('fs').readFileSync(require('path').join(__dirname, 's13.js'), 'utf8');
    const a = src.match(/const MAN = \{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+),\s*h:\s*([\d.]+)/);
    if (a) { m.x = +a[1]; m.y = +a[2]; m.h = +a[3]; }
    const z = src.match(/const z0 = lerp\(([\d.]+),\s*([\d.]+),\s*seg\(t,\s*([\d.]+),\s*T_PUSH/);
    const tp = src.match(/T_PUSH = ([\d.]+)/);
    if (z) m.zoom = +z[1] + (+z[2] - +z[1]) * clamp((48.2 - +z[3]) / ((tp ? +tp[1] : 50) - +z[3]));
    const cxm = src.match(/cx: lerp\(([\d.]+),\s*[\d.]+,\s*push\)/), cym = src.match(/cy: lerp\(([\d.]+),\s*[\d.]+,\s*push\)/);
    if (cxm) m.cx = +cxm[1]; if (cym) m.cy = +cym[1];
  } catch (e) { /* varsayılanlar */ }
  const sx = 540 + (m.x - m.cx) * m.zoom, sy = 960 + (m.y - m.cy) * m.zoom;
  const Z = clamp(m.h * m.zoom / MAN.h, 1.15, 1.6);
  return { zoom: Z, cx: MAN.x - (sx - 540) / Z, cy: hillY(MAN.x) - (sy - 960) / Z };
})();

// ---------- kamera ----------
// Kadraj anahtarları (dünya kamerası). A: açılış, adam kadrajın ~%43'ü; B: köpük + adam kadrajı doldurur;
// P: rüyaya itme; Q: patlamadan sonra düşünceli yakın plan (~%41); sonra ufka bakarken s13 eşleşmesine yumuşak açılış.
const CAM_A = { zoom: 1.72, cx: 345, cy: 832 }, CAM_B = { zoom: 1.45, cx: 427, cy: 762 }, CAM_P = { zoom: 1.58, cx: 478, cy: 684 }, CAM_Q = { zoom: 1.68, cx: 392, cy: 884 };
const mixCam = (a, b, k) => ({ zoom: lerp(a.zoom, b.zoom, k), cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k) });
function camAt(t) {
  let c = mixCam(CAM_A, { zoom: CAM_A.zoom + 0.04, cx: CAM_A.cx, cy: CAM_A.cy - 6 }, seg(t, 39.2, 41.0));
  c = mixCam(c, CAM_B, E.inOutSine(seg(t, 40.95, 41.95)));                 // köpük yükselirken geri açıl
  c = mixCam(c, CAM_P, E.inOutSine(seg(t, 42.3, 46.45)));                  // rüyaya doğru tek, ağır itme
  c = mixCam(c, CAM_Q, E.inOutCubic(seg(t, 46.66, 47.3)));                 // patlama → adama yakın
  // ufka bakarken s13'ün açılış kadrajına (eşleşen geçiş) yumuşakça açıl
  c = mixCam(c, MATCH, E.inOutSine(seg(t, 47.28, 47.98)));
  const { zoom, cx, cy } = c;
  const [bx, by] = R.breathe(t, 2.5, 121).map((v) => v * (1 - 0.6 * seg(t, 47.6, 48.2)));
  return { zoom, cx: cx + bx, cy: cy + by };
}

// ---------- önbellekli katmanlar ----------
function skyCv() {
  const w = 1400, h = 1500;
  return L.hcache('s12sky', w, h, 1, (x) => {
    x.fillStyle = P.UNDERPAINT; x.fillRect(0, 0, w, h);
    P.bandFill(x, null, { x0: 0, y0: 0, x1: w, y1: h, w, h }, ['#1D4DB0', '#2763C2', '#3489D2', '#55AED9', '#93D3E2', '#D2EDE4', '#FBEACB'],
      { seed: 1211, stops: [0, 0.16, 0.34, 0.52, 0.7, 0.85, 1], wMin: 22, wMax: 42, lMin: 90, lMax: 280, mixJitter: 0.06 });
  });
}
const CLOUDS = [{ x: 140, y: 230, s: 120, seed: 1221 }, { x: 980, y: 150, s: 90, seed: 1222 }, { x: 60, y: 900, s: 60, seed: 1223 }, { x: 1120, y: 1000, s: 64, seed: 1224 }];
function cloudCv(c) {
  const w = c.s * 2.6, h = c.s * 1.5;
  return L.hcache('s12cl' + c.seed, w, h, 1, (x) => { L.cloud2(x, w / 2, h * 0.72, c.s, c.seed, { lightAng: LA, rimW: 4 }); });
}
function farCv() {
  const x0 = -200, w = 1500, y0 = 960, h = 900;
  return { cv: L.hcache('s12far', w, h, 1.2, (x) => {
    x.translate(-x0, -y0);
    const r = rng(1231);
    const ridge = (fn, cols, seed, rimA) => {
      const top = []; for (let i = 0; i <= 80; i++) { const X = x0 + w * i / 80; top.push([X, fn(X)]); }
      const poly = top.concat([[x0 + w, y0 + h], [x0, y0 + h]]);
      x.save(); x.strokeStyle = rgba(P.UNDERPAINT, rimA); x.lineWidth = 4; x.setLineDash([80, 100, 30, 130]); x.stroke(P.pathOf(top, false)); x.restore();
      x.save(); x.clip(P.pathOf(poly)); x.fillStyle = cols[0]; x.fillRect(x0, y0, w, h); x.restore();
      const yt = P.bbox(top).y0;
      P.bandFill(x, poly, { x0, y0: yt, x1: x0 + w, y1: y0 + h, w, h: y0 + h - yt }, [cols[1], cols[0], cols[2]], { seed, wMin: 12, wMax: 22, lMin: 50, lMax: 170, stops: [0, 0.25, 1], angle: 0.02 });
      for (let i = 0; i < 18; i++) { const k = r.int(1, 77), p0 = top[k], p1 = top[k + 2]; P.stroke(x, p0[0], p0[1] + 5, p1[0], p1[1] + 5, r.range(5, 8), shade(cols[1], 0.05), r.int(1, 1e9), { detail: 0.4 }); }
      return top;
    };
    ridge((X) => 1085 - 40 * Math.sin(X * 0.006 + 0.6) - 16 * Math.sin(X * 0.017), ['#86A8D6', '#A8C4E6', '#6E90C4'], 1232, 0.3);
    const t2 = ridge((X) => 1150 - 34 * Math.sin(X * 0.008 + 2.0) - 12 * Math.sin(X * 0.021 + 1), ['#5FA88E', '#7FC09E', '#4A9080'], 1233, 0.4);
    // uzakta birkaç servi ve ağaç
    for (const [X, s, seed] of [[640, 46, 1234], [672, 36, 1235], [900, 52, 1236], [1150, 40, 1237]]) {
      const k = Math.round((X - x0) / w * 80), Y = t2[clamp(k, 0, 80)][1] + 6;
      R.cypress(x, X, Y, s, seed, { base: '#2F7A5A', dark: '#1D5444', light: '#5FA878' });
    }
  }), x: x0, y: y0, w, h };
}
function hillCv() {
  const x0 = -200, w = 1500, y0 = 1080, h = 1000;
  return { cv: L.hcache('s12hill', w, h, 1.45, (x) => {
    x.translate(-x0, -y0);
    const r = rng(1241);
    const top = []; for (let i = 0; i <= 120; i++) { const X = x0 + w * i / 120; top.push([X, hillY(X) + 2 * Math.sin(X * 0.05)]); }
    const poly = top.concat([[x0 + w, y0 + h], [x0, y0 + h]]);
    x.save(); x.strokeStyle = P.UNDERPAINT; x.lineWidth = 7; x.setLineDash([120, 60, 40, 90]); x.translate(0, -3); x.stroke(P.pathOf(top, false)); x.restore();
    x.save(); x.clip(P.pathOf(poly)); x.fillStyle = '#4FAE54'; x.fillRect(x0, y0, w, h); x.restore();
    x.save(); x.clip(P.pathOf(poly));
    const cols = ['#B6E268', '#8ED05A', '#62BC54', '#46A650', '#36914A', '#2C7E45'];
    P.fillStrokes(x, null, { x0, y0, x1: x0 + w, y1: y0 + h, w, h }, {
      seed: 1242, angle: 0.02, wMin: 18, wMax: 34, lMin: 80, lMax: 240,
      colorFn: (X, Y, rr) => { const dep = (Y - hillY(X)) / 700 + rr.range(-0.05, 0.05); const i = clamp(Math.floor(dep * (cols.length - 1) + 0.6), 0, cols.length - 1); return shade(cols[i], rr.range(-0.03, 0.03), rr.range(-0.02, 0.02)); },
    });
    // sırtta ışık darbeleri
    for (let i = 0; i < 26; i++) { const k = r.int(2, 116), p0 = top[k], p1 = top[k + 2]; P.stroke(x, p0[0], p0[1] + 9, p1[0], p1[1] + 9, r.range(8, 13), '#CDEE7E', r.int(1, 1e9), { detail: 0.5 }); }
    // serpiştirilmiş küçük çiçekler (anlam bandı sakin: küçük, seyrek)
    for (let i = 0; i < 70; i++) {
      const X = x0 + r.range(0, w), Y = hillY(X) + r.range(30, 700);
      const c = r.pick(['#FFFFFF', '#FFE07A', '#F7A8CC', '#C9B8F2']);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + r.range(0, 0.5); x.fillStyle = c; x.beginPath(); x.ellipse(X + Math.cos(a) * 4, Y + Math.sin(a) * 2.5, 3.5, 2.2, a, 0, TAU); x.fill(); }
      x.fillStyle = '#F2B23A'; x.beginPath(); x.arc(X, Y, 1.8, 0, TAU); x.fill();
    }
    for (let i = 0; i < 26; i++) { const X = x0 + r.range(0, w), Y = hillY(X) + r.range(60, 800); R.grass(x, X, Y, r.range(20, 34), r.int(1, 1e6), { n: 5, c1: '#2F8A45', c2: '#86C84E' }); }
    // ön planda iri çiçek öbekleri (köşelerde)
    for (const [X, Y, s, seed, col] of [[40, 1700, 22, 1243, { color: '#FFFFFF', dark: '#C9B8E6', inner: '#F6C83B' }], [90, 1745, 18, 1244, { color: '#F79AC2', dark: '#C8608E', inner: '#FFE07A' }], [1010, 1690, 20, 1245, { color: '#FFD34E', dark: '#D9952A', inner: '#E8682E' }], [960, 1760, 17, 1246, { color: '#FFFFFF', dark: '#C9B8E6', inner: '#F6C83B' }]]) {
      R.grass(x, X, Y + 20, s * 2.4, seed, { n: 6, c1: '#2F8A45', c2: '#7CC84B' });
      R.flower(x, X, Y, s, seed, col);
    }
    x.restore();
  }), x: x0, y: y0, w, h };
}
// sırtta rüzgârla salınan ot öbekleri (dinamik, az)
function crestTufts(ctx, t) {
  const r = rng(1251);
  for (let i = 0; i < 9; i++) {
    const X = r.range(-60, 1140), Y = hillY(X) + r.range(4, 26);
    R.grass(ctx, X, Y, r.range(26, 40), 1260 + i, { n: 5, c1: '#3E9B4F', c2: '#9AD25A', wind: Math.sin(t * 1.6 + i * 1.3) * 0.12 + 0.05 });
  }
}
// uzakta süzülen kuşlar (basit V darbeleri)
function birds(ctx, t) {
  const a = C.win(t, 39.3, 43.6, 0.5, 0.8); if (a <= 0) return;
  for (let i = 0; i < 4; i++) {
    const x = 200 + (t - 39.3) * 70 + i * 46 + Math.sin(i * 2.1) * 30, y = 330 + Math.sin(i * 1.7) * 30 + Math.sin(t * 1.2 + i) * 6;
    const f = Math.sin(t * 9 + i * 1.3) * 0.5;
    ctx.strokeStyle = rgba('#2B3A78', 0.75 * a); ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 11, y - 5 * f - 3); ctx.quadraticCurveTo(x - 5, y - 6 * f - 4, x, y); ctx.quadraticCurveTo(x + 5, y - 6 * f - 4, x + 11, y - 5 * f - 3); ctx.stroke();
  }
}

// ---------- köpük durumu ----------
function bubbleState(t) {
  const g = seg(t, T_IN, T_FULL);
  if (g <= 0) return null;
  const grow = E.outBack(seg(t, T_IN + 0.1, T_FULL + 0.05), 1.25);  // büyüme yükselişin gerisinden gelir: köpük başın yanından geçer
  const rise = E.outCubic(g);
  const cx = lerp(560, BUB.x, rise) + Math.sin(t * 0.9) * 5 * g, cy = lerp(1135, BUB.y, rise) + Math.sin(t * 1.3 + 0.5) * 7 * g;
  const rad = lerp(11, BUB.r, grow);
  // titreşim: şişince sönümlenen, patlamadan önce artan salınım
  const ring = 0.07 * Math.exp(-3.2 * Math.max(0, t - T_FULL + 0.15)) * (t > T_FULL - 0.4 ? 1 : 0);
  const pre = 0.03 * E.inQuad(seg(t, T_POP - 0.3, T_POP));
  const amp = ring + 0.01 + pre;
  const w = Math.sin((t - T_IN) * TAU * (2.1 + 3 * seg(t, T_POP - 0.3, T_POP)));
  return { cx, cy, rad, sx: 1 + amp * w, sy: 1 - amp * w, reveal: E.inOutSine(seg(t, 41.5, 42.25)), inten: 1 + 0.4 * seg(t, T_POP - 0.3, T_POP) };
}

// ---------- adam ----------
function manPose(t) {
  const br = Math.sin(t * 2.3);
  const lift = E.inOutSine(seg(t, 40.2, 40.65));                    // "Demek insan": başını kaldırır
  const look = E.inOutSine(seg(t, 41.25, 41.75)) * (1 - E.inOutSine(seg(t, 46.66, 47.0)));  // köpüğe bakar
  const smile = E.inOutSine(seg(t, 42.3, 42.8)) * (1 - E.inOutSine(seg(t, 46.62, 47.0)));
  const reach = E.inOutSine(seg(t, 44.25, 44.95)) * (1 - E.inOutSine(seg(t, 46.64, 47.15)));  // özlemle hafif uzanır
  const think = E.inOutSine(seg(t, 46.72, 47.05)) * (1 - E.inOutSine(seg(t, 47.2, 47.75)));
  const muse = C.win(t, 42.75, 43.95, 0.35, 0.4);                   // merakla hafif öne eğilip başını yatırır
  const horizon = E.inOutSine(seg(t, 47.2, 47.8));                  // ufka bakar
  const p = M.pose({
    torso: d(2) + d(0.6) * br + d(4) * reach - d(1) * horizon + d(2.5) * muse,
    // ufka bakış: tepeden ufuk göz hizasının biraz altında (≈6° aşağı) — s13'ün açılış duruşuna da yakın
    neck: d(4) + d(4) * (1 - lift) - d(11) * look + d(4) * think,
    head: d(8) * (1 - lift) - d(22) * look + d(12) * think + d(2) * horizon + d(6) * muse * Math.sin(Math.PI * seg(t, 42.75, 43.95)),
    armN: d(4) + d(1.2) * br + d(22) * reach, elbowN: d(10) + d(34) * reach, handN: d(5) - d(18) * reach,
    armF: d(-4) - d(1) * br, elbowF: d(8),
    thighN: d(3), kneeN: d(3), thighF: d(-4), kneeF: d(4),
    brow: -0.25 * look + 0.15 * think, mouth: 0.38 * smile + 0.12 * horizon, eye: 1 - 0.12 * horizon - 0.15 * think, grip: 0.1,
  });
  // göz kırpma: 41.3 (köpüğü fark eder) ve 46.6 (patlama) ve 47.95
  if ((t > 41.3 && t < 41.37) || (t > 43.32 && t < 43.39) || (t > 46.6 && t < 46.67) || (t > 47.95 && t < 48.02)) p.eye = 0.1;
  return p;
}

module.exports = {
  draw(ctx, t) {
    const cam = camAt(t);
    const REF = { zoom: 1, cx: 540, cy: 960 };
    // gök + bulutlar (paralaks)
    ctx.save(); L.camLayer(ctx, cam, REF, 0.15); ctx.drawImage(skyCv(), -160, -120, 1400, 1500);
    for (const c of CLOUDS) { const w = c.s * 2.6, h = c.s * 1.5; ctx.drawImage(cloudCv(c), c.x + (t - 39) * 7 - w / 2, c.y - h * 0.72, w, h); }
    ctx.restore();
    // ufukta sıcak aydınlık (sonda büyür)
    const dawn = E.inOutSine(seg(t, 47.0, 48.4));
    ctx.save(); L.camLayer(ctx, cam, REF, 0.35);
    P.glow(ctx, 930, 1070, 560, '#FFE2A0', 0.16 + 0.36 * dawn);
    const F = farCv(); ctx.drawImage(F.cv, F.x, F.y, F.w, F.h);
    if (dawn > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 6; i++) { const a = -Math.PI * 0.62 - i * 0.16 + Math.sin(t * 0.5 + i) * 0.02; ctx.fillStyle = rgba('#FFE9B5', 0.07 * dawn); ctx.beginPath(); ctx.moveTo(930, 1075); ctx.lineTo(930 + Math.cos(a - 0.05) * 1300, 1075 + Math.sin(a - 0.05) * 1300); ctx.lineTo(930 + Math.cos(a + 0.05) * 1300, 1075 + Math.sin(a + 0.05) * 1300); ctx.closePath(); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
    // dünya
    ctx.save(); R.camera(ctx, cam);
    const H = hillCv(); ctx.drawImage(H.cv, H.x, H.y, H.w, H.h);
    birds(ctx, t);
    // adamın gölgesi
    const fy = hillY(MAN.x);
    const sg = ctx.createRadialGradient(MAN.x + 30, fy + 4, 8, MAN.x + 30, fy + 4, 150); sg.addColorStop(0, rgba('#1E5A3A', 0.35)); sg.addColorStop(1, rgba('#1E5A3A', 0));
    ctx.save(); ctx.fillStyle = sg; ctx.translate(0, fy + 4); ctx.scale(1, 0.15); ctx.translate(0, -(fy + 4)); ctx.fillRect(MAN.x - 160, fy - 150, 380, 300); ctx.restore();
    M.drawMan(ctx, manPose(t), { x: MAN.x, y: fy, h: MAN.h, dir: 1, light: LA });
    crestTufts(ctx, t);
    // köpük
    const B = bubbleState(t);
    if (B && t < T_POP + 0.12) {
      const dream = B.reveal > 0.001 ? D.renderDream(t, B.reveal) : null;
      let hole = null;
      if (t >= T_POP) { const hr = 2.1 * B.rad * E.outQuad(seg(t, T_POP, T_POP + 0.1)); hole = { x: Math.cos(-0.75) * B.rad * 0.9, y: Math.sin(-0.75) * B.rad * 0.9, r: hr }; }
      D.drawBubble(ctx, B.cx, B.cy, B.rad, t, { dream, sx: B.sx, sy: B.sy, hole, intensity: B.inten });
    }
    if (B && t >= T_POP) D.drawPop(ctx, t, T_POP, B.cx, B.cy, B.rad, [Math.cos(-0.75) * 0.9, Math.sin(-0.75) * 0.9]);
    ctx.restore();
    // "Demek insan": tepenin üstünden soldan sağa geçen yumuşak güneş ışığı şeridi
    const sw = seg(t, 40.25, 41.35);
    if (sw > 0 && sw < 1) {
      const X = lerp(-500, 1600, E.inOutSine(sw)), a = Math.sin(Math.PI * sw);
      ctx.save(); ctx.globalCompositeOperation = 'soft-light';
      const g = ctx.createLinearGradient(X - 420, 0, X + 420, 0);
      g.addColorStop(0, 'rgba(255,236,170,0)'); g.addColorStop(0.5, rgba('#FFE7A6', 0.55 * a)); g.addColorStop(1, 'rgba(255,236,170,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H); ctx.restore();
    }
    // sıcak ışık (sonda): hafif yumuşak sarı örtü
    if (dawn > 0.01) { ctx.save(); ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = rgba('#FFD08A', 0.25 * dawn); ctx.fillRect(0, 0, C.W, C.H); ctx.restore(); }
  },
  sfx: [
    { t: 39.9, type: 'wind', gain: 0.2 },
    { t: 41.14, type: 'bubble', gain: 0.35 },
    { t: 41.8, type: 'sparkle', gain: 0.2 },
    { t: 44.04, type: 'chime', gain: 0.22 },
    { t: 46.56, type: 'pop', gain: 0.55 },
    { t: 46.6, type: 'sparkle', gain: 0.3 },
  ],
};
