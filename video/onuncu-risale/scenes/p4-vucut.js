// Perde 4 — Nimetler ve vücut (17.12 – 28.6):
// "bu kadar nimetleri ihsas ve ifaza etmek için insanın vücudunda yaratılan havass, hissiyat, cihazat, aza gibi
//  âlât ve edevatından anlaşılır ki"
'use strict';
(() => {
  const T0 = 17.12, T1 = 28.75;
  const tWipe = 17.12;
  const tNimet = () => WT(28) - 0.05;   // nimetleri ~17.67 (belirme biraz önce başlar: "bu kadar" ile)
  const tIhsas = () => WT(29);          // hissettirmek
  const tIfaza = () => WT(31);          // feyizlendirmek
  const tInsan = () => WT(34) - 0.12;   // insanın
  const tHavass = () => WT(37);
  const tHis = () => WT(38);
  const tCihaz = () => WT(39);
  const tAza = () => WT(40);
  const tAlat = () => WT(42);
  const tEdevat = () => WT(44);
  const tAnla = () => WT(45);
  const tUp = 27.42;                    // yukarı dönüş

  defSprite('p4-sicak', () => {
    const S = Paint.sprite(W, H, { seed: 404 });
    // başın çevresinde parlak odak yok (hale gibi okunmasın): geniş, çapraz, sıcak bir geçiş
    const f = (x, y) => clamp(0.34 + 0.42 * ((x * 0.3 + y * 0.7) / (W * 0.3 + H * 0.7)) + (NOISE(x * 0.0012 + 7, y * 0.0012) - 0.5) * 0.16);
    S.region(rectPath(0, 0, W, H), { ramp: ['#7E3A2E', '#A44C34', '#C4643A', '#DA8442', '#EAA552', '#F4C46A', '#F9DA8E'], shade: f, dir: (x, y) => -0.62 + (NOISE(x * 0.0025, y * 0.0025) - 0.5) * 0.55, len: [70, 140], wid: [16, 26], cover: 2.6, rim: false, jitter: 26, jitterFreq: 0.004, noise: 0.03 });
    return { canvas: S.finish({ emboss: 0.5 }), px: 0, py: 0 };
  });
  defSprite('p4-civit', () => {
    const S = Paint.sprite(W, H, { seed: 405 });
    const f = (x, y) => clamp(0.95 - Math.hypot((x - 540) / 760, (y - 860) / 1100) * 1.05);
    S.region(rectPath(0, 0, W, H), { ramp: ['#0F1638', '#141C45', '#1A2452', '#202D60', '#28386F', '#31447E'], shade: f, dir: (x, y) => -0.35 + (NOISE(x * 0.003, y * 0.003) - 0.5) * 0.5, len: [60, 130], wid: [16, 26], cover: 2.5, rim: false, jitter: 30, jitterFreq: 0.004, noise: 0.025, broken: 0.03 });
    return { canvas: S.finish({ emboss: 0.45 }), px: 0, py: 0 };
  });

  // nimetler: [ad, sıcak sahnede (x,y,ölçek), şema sahnesinde (x,y,ölçek), bağlı duyu]
  const N = [
    ['nar', 186, 560, 0.44, 992, 392, 0.3, 'goz'],
    ['uzum', 902, 520, 0.5, 86, 300, 0.26, null],
    ['ekmek', 152, 910, 0.5, 992, 1172, 0.3, 'el'],
    ['bal', 936, 880, 0.46, 992, 846, 0.32, 'dil'],
    ['sut', 166, 1226, 0.48, 86, 1060, 0.26, null],
    ['su-testi', 924, 1228, 0.45, 86, 560, 0.3, 'kulak'],
    ['elma', 340, 352, 0.42, 300, 236, 0.24, null],
    ['incir', 752, 330, 0.45, 780, 236, 0.24, null],
    ['zeytin', 140, 1566, 0.5, 86, 820, 0.26, null],
    ['gul', 944, 1566, 0.5, 992, 620, 0.32, 'burun'],
    ['hurma', 540, 300, 0.42, 540, 214, 0.24, null],
  ];
  // duyu madalyonları: [ad, sprite, ADAM anahtarı, madalyon yeri]
  const SENSES = [
    ['goz', 'duyu-goz', 'eye', 812, 470],
    ['kulak', 'duyu-kulak', 'ear', 256, 560],
    ['burun', 'duyu-burun', 'nose', 846, 640],
    ['dil', 'duyu-dil', 'mouth', 812, 812],
    ['el', 'duyu-el', 'fingertip', 830, 1176],
  ];

  function manFrame() {
    const A = window.ADAM && ADAM.ayakta;
    if (!A) return null;
    const foot = A.foot || [A.w / 2, A.h - 16];
    return { A, ox: 520 - foot[0], oy: 1712 - foot[1] };
  }
  const P = (fr, key) => [fr.ox + fr.A[key][0], fr.oy + fr.A[key][1]];

  // hangi nimet hangi duyuya "hissettirilir" (ihsas yayları bu noktalara gider)
  const FEEL = { nar: 'eye', uzum: 'mouth', ekmek: 'fingertip', bal: 'mouth', sut: 'mouth', 'su-testi': 'ear', elma: 'nose', incir: 'mouth', zeytin: 'mouth', gul: 'nose', hurma: 'mouth' };
  // kamera: durmadan, yavaş; duyular söylenirken başa yaklaşır, aletler/nimetler bağlanırken tüm kadraj; yükselişten önce nötr
  function cam4(t) {
    return camSmooth([
      [17.12, { x: 540, y: 960, z: 1.0 }, { stop: true }],
      [18.6, { x: 540, y: 935, z: 1.035 }],
      [20.3, { x: 545, y: 905, z: 1.06 }],
      [22.4, { x: 562, y: 836, z: 1.08 }],
      [24.0, { x: 550, y: 880, z: 1.06 }],
      [25.4, { x: 540, y: 948, z: 1.012 }],
      [27.3, { x: 540, y: 960, z: 1.0 }, { stop: true }],
    ], t);
  }
  const SWEEP = () => [tInsan() - 0.05, tInsan() + 0.95]; // normal → şema tarama çizgisi (zemin ve adam birlikte)

  function drawMan(ctx, t, fr, ys) {
    const drawNormal = () => { drawPart(ctx, spr('adam-ayakta-govde'), fr.ox, fr.oy); drawPart(ctx, spr('adam-ayakta-bas'), fr.ox, fr.oy, 1, Math.sin(t * 0.9) * 0.01); drawPart(ctx, spr('adam-ayakta-kol'), fr.ox, fr.oy, 1, Math.sin(t * 1.2) * 0.012); };
    const drawSema = () => { if (hasSpr('adam-ayakta-sema')) drawPart(ctx, spr('adam-ayakta-sema'), fr.ox, fr.oy); };
    if (ys == null) { drawNormal(); return; }
    if (ys <= -50) { drawNormal(); return; }
    if (ys >= H + 50) { drawSema(); return; }
    ctx.save(); ctx.beginPath(); ctx.rect(-200, ys, W + 400, H * 2); ctx.clip(); drawNormal(); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(-200, -H, W + 400, ys + H); ctx.clip(); drawSema(); ctx.restore();
  }

  function drawScene(ctx, t, wp) {
    const [s0, s1] = SWEEP(); const sw = inv(s0, s1, t);
    const ys = sw > 0 && sw < 1 ? lerp(-60, H + 60, E.io2(sw)) : (sw >= 1 ? H + 100 : -100);
    // zemin: sıcak → çivit, karışık renkli ara ton yok; tarama çizgisiyle değişir
    drawSpr(ctx, spr('p4-sicak'), -48, -170, 1.09, 0, 1); // zemin üstten taşar: yükselişte bulut kenarı arasından astar görünmesin
    if (sw >= 1) drawSpr(ctx, spr('p4-civit'), -48, -170, 1.09, 0, 1);
    else if (sw > 0) { ctx.save(); ctx.beginPath(); ctx.rect(-200, -400, W + 400, ys + 400); ctx.clip(); drawSpr(ctx, spr('p4-civit'), -48, -170, 1.09, 0, 1); ctx.restore(); }
    const diag = E.io2(inv(tInsan() - 0.15, tInsan() + 0.55, t));
    const fr = manFrame();
    // nimetler
    const ih = tIhsas();
    N.forEach((n, i) => {
      const st = tNimet() + i * 0.085; const p = inv(st, st + 0.55, t); if (p <= 0) return;
      const pop = E.outBack(p, 1.6);
      const si = SENSES.findIndex((q) => q[0] === n[7]);
      const lk = n[7] ? E.io2(inv(tAlat() + si * 0.16 + 0.12, tAlat() + si * 0.16 + 0.5, t)) : 0; // aletle bağlanma (yumuşak)
      let x = lerp(n[1], n[4], E.io3(diag)), y = lerp(n[2], n[5], E.io3(diag)), s = lerp(n[3], n[6], E.io3(diag));
      s *= 1 + 0.25 * lk;
      const alpha = lerp(1, lerp(0.42, 1, lk), diag);
      const bob = Math.sin(t * 1.6 + i * 1.3) * 7 * (1 - diag * 0.6);
      // ihsas: nimetten ilgili duyuya akan belirgin noktalı yay (duyuya değmeden durur)
      const ap = E.out3(inv(ih + i * 0.04, ih + 0.65 + i * 0.04, t)) * (1 - E.in2(inv(tInsan() - 0.25, tInsan() + 0.15, t)));
      if (ap > 0 && window.UI && fr) {
        const key = FEEL[n[0]] || 'nose'; const [hx, hy] = P(fr, key);
        const dx = hx - x, dy = hy - y; const len = Math.hypot(dx, dy) || 1;
        const tx = x + dx * (1 - 46 / len), ty = y + dy * (1 - 46 / len);
        ctx.save(); ctx.globalAlpha = 0.95 * ap;
        UI.dots(ctx, x + dx / len * 64, y + dy / len * 64, tx, ty, ap, '#FFF6E2', { gap: 22, size: 6.4, size1: 4.2, bend: (i % 2 ? 1 : -1) * 60, offset: -Math.max(0, t - ih) * 60 });
        ctx.restore();
        if (ap > 0.6 && window.UI) { const k = (t - ih - 0.5 - i * 0.04); if (k > 0 && k < 0.6) UI.sparkle(ctx, tx, ty, 20, k, '#FFF6E2'); }
      }
      // ifaza: bolluk — her nimetten iki-üç küçük eşi taşar ve yanına yerleşir
      const fz = E.out3(inv(tIfaza() + i * 0.05, tIfaza() + 0.55 + i * 0.05, t)) * (1 - diag);
      if (fz > 0 && hasSpr(n[0])) {
        for (let k = 0; k < 2; k++) {
          const a = i * 1.9 + k * 2.7 + 0.4; const rr = (104 + k * 18) * E.outBack(fz, 1.4);
          drawSpr(ctx, spr(n[0]), x + Math.cos(a) * rr, y + bob + Math.sin(a) * rr * 0.75, s * 0.46 * fz, Math.sin(t + k) * 0.05, fz);
        }
      }
      if (hasSpr(n[0])) drawSpr(ctx, spr(n[0]), x, y + bob, s * pop, Math.sin(t * 1.1 + i) * 0.04, alpha);
    });
    if (!fr) return;
    // adam: p3'ten gelen fırça silmesi bitince belirir (şeritler arasında kopuk görünmesin)
    // ayaklardan başa doğru tek fırça darbesiyle boyanır gibi açılır (yarı saydam hayalet ya da kopuk baş yok)
    const manP = E.io2(inv(17.4, 17.82, t));
    if (manP > 0) {
      if (wp < 1) { ctx.restore(); ctx.save(); ctx.translate(0, riseY(t)); camApply(ctx, cam4(t)); } // silme maskesinin dışına çık (dönüşümler yeniden)
      ctx.save();
      if (manP < 1) { const yTop = lerp(fr.oy + fr.A.h + 20, fr.oy - 40, manP); ctx.beginPath(); ctx.rect(-200, yTop, W + 400, H * 2); ctx.clip(); }
      drawMan(ctx, t, fr, sw > 0 ? ys : null); ctx.restore();
    }
    // tarama çizgisi
    if (sw > 0 && sw < 1) { ctx.save(); ctx.globalAlpha = Math.sin(sw * Math.PI) * 0.9; ctx.fillStyle = '#9BF0E8'; ctx.shadowColor = '#7FE3E0'; ctx.shadowBlur = 24; ctx.fillRect(-100, ys - 2, W + 200, 4); ctx.restore(); }
    // organlar: kalp (hissiyat), akciğer + mide (cihazat)
    const organ = (name, key, t0, pulse) => {
      if (!hasSpr(name)) return; const a = E.out3(inv(t0, t0 + 0.45, t)); if (a <= 0) return;
      const [cx, cy] = P(fr, key); const sc = 0.85 + 0.15 * E.outBack(inv(t0, t0 + 0.5, t)) + (pulse || 0);
      if (window.UI) UI.glow(ctx, cx, cy, 120, '#FF9A7A', 0.17 * a + (pulse || 0) * 0.9);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.translate(-cx, -cy); drawPart(ctx, spr(name), fr.ox, fr.oy, 1, 0, a); ctx.restore();
    };
    const beat = (tt, b) => Math.exp(-Math.pow((tt - b) * 9, 2)) * 0.09;
    const hb = beat(t, tHis() + 0.25) + beat(t, tHis() + 0.62) + beat(t, tHis() + 1.3) * 0.6;
    organ('organ-akciger', 'lungs', tCihaz(), Math.sin((t - tCihaz()) * 2.4) * 0.015);
    organ('organ-mide', 'stomach', tCihaz() + 0.22, 0);
    organ('organ-kalp', 'heart', tHis(), hb);
    // aza (uzuvlar): yumuşak kenarlı ışık bandı şemada aşağı süzülür (sert dikdörtgen yok)
    const az = inv(tAza(), tAza() + 1.0, t);
    if (az > 0 && az < 1 && hasSpr('adam-ayakta-sema')) {
      const yb = lerp(fr.oy + fr.A.h * 0.22, fr.oy + fr.A.h * 1.02, E.io2(az));
      const [tc, tx] = tmpCanvas('aza'); tx.setTransform(ctx.getTransform());
      drawPart(tx, spr('adam-ayakta-sema'), fr.ox, fr.oy);
      tx.globalCompositeOperation = 'destination-in';
      const g = tx.createLinearGradient(0, yb - 190, 0, yb + 40); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.7, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      tx.fillStyle = g; tx.fillRect(-400, yb - 200, W + 800, 260);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6 * Math.sin(az * Math.PI); ctx.drawImage(tc, 0, 0); ctx.restore();
    }
    // duyular: halka + madalyon + bağ çizgisi; aletler: madalyondan nimete; "anlaşılır ki": bütün bağlar birlikte parlar
    const tA = tAnla();
    SENSES.forEach((sn, i) => {
      const st = tHavass() + i * 0.12; const p = inv(st, st + 0.5, t); if (p <= 0 || !fr.A[sn[2]]) return;
      const [px, py] = P(fr, sn[2]); const mx = sn[3], my = sn[4];
      const pulse = Math.exp(-Math.pow((t - tA - 0.15 - i * 0.06) * 4.5, 2));
      if (window.UI) {
        const face = ['eye', 'nose', 'mouth'].includes(sn[2]);
        UI.ring(ctx, px, py, face ? 15 : 24, E.out3(p), '#9BF0E8', face ? 3.4 : 4, 10 + i);
        ctx.save(); ctx.globalAlpha = E.out3(inv(st + 0.15, st + 0.55, t));
        UI.line(ctx, [[px, py], [lerp(px, mx, 0.55), lerp(py, my, 0.2)], [mx, my]], E.out3(inv(st + 0.1, st + 0.55, t)), '#7FE3E0', 2.6 + pulse * 2.4, 20 + i);
        ctx.restore();
      }
      const n = N.find((q) => q[7] === sn[0]);
      const lt = tAlat() + i * 0.16; const lp = E.io3(inv(lt, lt + 0.55, t));
      if (n && lp > 0 && window.UI) {
        const pts = [[mx, my], [lerp(mx, n[4], 0.5), lerp(my, n[5], 0.5) - 10], [n[4], n[5]]];
        ctx.save(); ctx.globalAlpha = 0.95;
        UI.line(ctx, pts, lp, '#FFD27A', 3 + pulse * 3, 40 + i);
        if (pulse > 0.05) UI.glow(ctx, n[4], n[5], 96, '#FFD27A', 0.26 * pulse);
        ctx.restore();
        // anlaşılır: duyudan nimete akan ışık boncuğu
        const bu = inv(tA - 0.05 + i * 0.06, tA + 0.55 + i * 0.06, t);
        if (bu > 0 && bu < 1) {
          const q = E.io2(bu), w0 = 1 - q; const bx = w0 * w0 * pts[0][0] + 2 * w0 * q * pts[1][0] + q * q * pts[2][0], by = w0 * w0 * pts[0][1] + 2 * w0 * q * pts[1][1] + q * q * pts[2][1];
          ctx.save(); ctx.globalAlpha = Math.sin(bu * Math.PI); UI.glow(ctx, bx, by, 30, '#FFE7A8', 0.4); ctx.fillStyle = '#FFF4D8'; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        }
      }
      const pz = Math.exp(-Math.pow((t - tA - 0.15) * 5, 2));
      const ms = E.outBack(inv(st + 0.2, st + 0.65, t), 1.5) * (1 + pz * 0.08);
      if (hasSpr(sn[1])) drawSpr(ctx, spr(sn[1]), mx, my, 0.6 * ms);
    });
  }

  Engine.add({
    name: 'p4', t0: T0, t1: T1, z: 4,
    draw(ctx, t) {
      // fırça silmesiyle giriş
      const wp = inv(tWipe, tWipe + 0.62, t);
      if (wp < 1) { ctx.save(); ctx.clip(BrushWipe.mask(wp, 33)); }
      // yukarı dönüş: her şey aşağı kayar
      ctx.translate(0, riseY(t));
      camApply(ctx, cam4(t));
      drawScene(ctx, t, wp);
      if (wp < 1) ctx.restore();
    },
  });
})();
