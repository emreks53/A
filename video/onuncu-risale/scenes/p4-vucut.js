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

  Engine.add({
    name: 'p4', t0: T0, t1: T1, z: 4,
    draw(ctx, t) {
      // fırça silmesiyle giriş
      const wp = inv(tWipe, tWipe + 0.62, t);
      if (wp < 1) { ctx.save(); ctx.clip(BrushWipe.mask(wp, 33)); }
      // yukarı dönüş: her şey aşağı kayar
      ctx.translate(0, riseY(t));
      const diag = E.io2(inv(tInsan() - 0.15, tInsan() + 0.55, t));
      drawSpr(ctx, spr('p4-sicak'), -48, -170, 1.09, 0, 1); // zemin üstten taşar: yükselişte bulut kenarı arasından astar görünmesin
      if (diag > 0) drawSpr(ctx, spr('p4-civit'), -48, -170, 1.09, 0, diag);
      const fr = manFrame();
      const head = fr ? P(fr, 'nose') : [600, 640];
      // nimet ↔ adam: noktalı yaylar (hissettirmek)
      const ih = tIhsas();
      N.forEach((n, i) => {
        const st = tNimet() + i * 0.085; const p = inv(st, st + 0.55, t); if (p <= 0) return;
        const pop = E.outBack(p, 1.6);
        const linked = n[7] && t > tAlat() + SENSES.findIndex((s) => s[0] === n[7]) * 0.16 + 0.25;
        let x = lerp(n[1], n[4], E.io3(diag)), y = lerp(n[2], n[3 + 2], E.io3(diag)), s = lerp(n[3], n[6], E.io3(diag));
        if (linked) s *= 1 + 0.25 * E.outBack(inv(tAlat(), tAlat() + 0.5, t));
        const alpha = lerp(1, linked ? 1 : 0.42, diag);
        const bob = Math.sin(t * 1.6 + i * 1.3) * 7 * (1 - diag * 0.6);
        // ihsas yayları
        const ap = E.out3(inv(ih + i * 0.03, ih + 0.7 + i * 0.03, t)) * (1 - E.in2(inv(tInsan() - 0.2, tInsan() + 0.3, t)));
        if (ap > 0 && window.UI) {
          ctx.save(); ctx.globalAlpha = 0.85 * ap;
          const dx = head[0] - x, dy = head[1] - y; const len = Math.hypot(dx, dy);
          const tx = x + dx * 0.78, ty = y + dy * 0.78; // başa kadar değil, yakınında durur
          UI.dots(ctx, x + dx / len * 70, y + dy / len * 70, tx, ty, ap, '#FFF3D6', { gap: 20, size: 4.6, bend: (i % 2 ? 1 : -1) * 70, offset: -Math.max(0, t - ih) * 40 });
          ctx.restore();
        }
        // feyizlendirme: her nimetten küçük kopyalar taşar
        const fz = E.out3(inv(tIfaza() + i * 0.04, tIfaza() + 0.6 + i * 0.04, t)) * (1 - diag);
        if (fz > 0 && hasSpr(n[0])) {
          for (let k = 0; k < 2; k++) {
            const a = i * 1.7 + k * Math.PI + (t - tIfaza()) * 0.6; const rr = 70 + k * 18;
            drawSpr(ctx, spr(n[0]), x + Math.cos(a) * rr * fz, y + Math.sin(a) * rr * 0.7 * fz, s * 0.5 * fz, 0, fz * 0.95);
          }
        }
        if (hasSpr(n[0])) drawSpr(ctx, spr(n[0]), x, y + bob, s * pop, Math.sin(t * 1.1 + i) * 0.04, alpha);
      });
      // adam: normal → şema (yukarıdan aşağı tarama çizgisi)
      if (fr) {
        const sweep = inv(tInsan() + 0.1, tInsan() + 1.05, t);
        const yTop = fr.oy, yBot = fr.oy + fr.A.h; const ys = lerp(yTop - 20, yBot + 20, E.io2(sweep));
        const drawNormal = () => { drawPart(ctx, spr('adam-ayakta-govde'), fr.ox, fr.oy); drawPart(ctx, spr('adam-ayakta-bas'), fr.ox, fr.oy, 1, Math.sin(t * 0.9) * 0.01); drawPart(ctx, spr('adam-ayakta-kol'), fr.ox, fr.oy, 1, Math.sin(t * 1.2) * 0.012); };
        const drawSema = () => { if (hasSpr('adam-ayakta-sema')) drawPart(ctx, spr('adam-ayakta-sema'), fr.ox, fr.oy); };
        if (sweep <= 0) drawNormal();
        else if (sweep >= 1) drawSema();
        else {
          ctx.save(); ctx.beginPath(); ctx.rect(0, ys, W, H); ctx.clip(); drawNormal(); ctx.restore();
          ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, ys); ctx.clip(); drawSema(); ctx.restore();
          ctx.save(); ctx.globalAlpha = Math.sin(sweep * Math.PI); ctx.fillStyle = '#9BF0E8'; ctx.shadowColor = '#7FE3E0'; ctx.shadowBlur = 24; ctx.fillRect(fr.ox - 60, ys - 2, fr.A.w + 120, 4); ctx.restore();
        }
        // organlar: kalp (hissiyat), akciğer + mide (cihazat)
        const organ = (name, key, t0, pulse) => {
          if (!hasSpr(name)) return; const a = E.out3(inv(t0, t0 + 0.45, t)); if (a <= 0) return;
          const [cx, cy] = P(fr, key); const s = 0.85 + 0.15 * E.outBack(inv(t0, t0 + 0.5, t)) + (pulse || 0);
          if (window.UI) UI.glow(ctx, cx, cy, 120, '#FF9A7A', 0.17 * a + (pulse || 0) * 0.9);
          ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.translate(-cx, -cy); drawPart(ctx, spr(name), fr.ox, fr.oy, 1, 0, a); ctx.restore();
        };
        const beat = (tt, b) => Math.exp(-Math.pow((tt - b) * 9, 2)) * 0.09;
        const hb = beat(t, tHis() + 0.25) + beat(t, tHis() + 0.62) + beat(t, tHis() + 1.3) * 0.6;
        organ('organ-akciger', 'lungs', tCihaz(), Math.sin((t - tCihaz()) * 2.4) * 0.015);
        organ('organ-mide', 'stomach', tCihaz() + 0.22, 0);
        organ('organ-kalp', 'heart', tHis(), hb);
        // aza: uzuvlarda hat ışığı süpürmesi
        const az = inv(tAza(), tAza() + 0.9, t);
        if (az > 0 && az < 1 && hasSpr('adam-ayakta-sema')) {
          const yb = lerp(fr.oy + fr.A.h * 0.25, fr.oy + fr.A.h, E.io2(az));
          ctx.save(); ctx.beginPath(); ctx.rect(0, yb - 160, W, 160); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * Math.sin(az * Math.PI); drawPart(ctx, spr('adam-ayakta-sema'), fr.ox, fr.oy); ctx.restore();
        }
        // duyular: halka + madalyon + bağ çizgisi; aletler: madalyondan nimete
        SENSES.forEach((s, i) => {
          const st = tHavass() + i * 0.12; const p = inv(st, st + 0.5, t); if (p <= 0 || !fr.A[s[2]]) return;
          const [px, py] = P(fr, s[2]); const mx = s[3], my = s[4];
          const pulse = Math.exp(-Math.pow((t - tAnla() - 0.15) * 5, 2));
          if (window.UI) {
            const face = ['eye', 'nose', 'mouth'].includes(s[2]);
            UI.ring(ctx, px, py, face ? 15 : 24, E.out3(p), '#9BF0E8', face ? 3.4 : 4, 10 + i);
            ctx.save(); ctx.globalAlpha = E.out3(inv(st + 0.15, st + 0.55, t));
            UI.line(ctx, [[px, py], [lerp(px, mx, 0.55), lerp(py, my, 0.2)], [mx, my]], E.out3(inv(st + 0.1, st + 0.55, t)), '#7FE3E0', 2.6 + pulse * 2, 20 + i);
            ctx.restore();
          }
          const n = N.find((q) => q[7] === s[0]);
          const lt = tAlat() + i * 0.16; const lp = E.io3(inv(lt, lt + 0.55, t));
          if (n && lp > 0 && window.UI) {
            ctx.save(); ctx.globalAlpha = 0.95;
            UI.line(ctx, [[mx, my], [lerp(mx, n[4], 0.5), lerp(my, n[5], 0.5) - 10], [n[4], n[5]]], lp, '#FFD27A', 3 + pulse * 2.5, 40 + i);
            if (pulse > 0.05) UI.glow(ctx, n[4], n[5], 90, '#FFD27A', 0.2 * pulse);
            ctx.restore();
          }
          const ms = E.outBack(inv(st + 0.2, st + 0.65, t), 1.5) * (1 + pulse * 0.08);
          if (hasSpr(s[1])) drawSpr(ctx, spr(s[1]), mx, my, 0.6 * ms);
        });
      }
      if (wp < 1) ctx.restore();
    },
  });
  sfx(tWipe, 'brush-big', -8);
  N.forEach((_, i) => sfx(17.62 + i * 0.085 + 0.12, 'pop', -16 - (i % 3), { pitch: 0.85 + (i % 5) * 0.07 }));
  sfx(18.27, 'airy', -20, { dur: 0.9 }); sfx(18.94, 'shimmer', -24, { dur: 1.1 });
  sfx(20.43, 'whoosh-deep', -12, { dur: 1.2 }); sfx(20.6, 'scan', -24, { dur: 1.0 });
  for (let i = 0; i < 5; i++) sfx(22.15 + i * 0.12 + 0.05, 'tick', -20, { pitch: 1 + i * 0.08 });
  sfx(23.18, 'heartbeat', -14); sfx(23.55, 'heartbeat', -16);
  sfx(23.7, 'bubble', -22); sfx(24.73, 'sweep', -22, { dur: 0.9 });
  for (let i = 0; i < 5; i++) sfx(25.46 + i * 0.16 + 0.2, 'tick-warm', -20, { pitch: 1 + i * 0.06 });
  sfx(27.0, 'bloom', -18, { dur: 1.4 });
  sfx(27.45, 'rise', -12, { dur: 2.0 });
})();
