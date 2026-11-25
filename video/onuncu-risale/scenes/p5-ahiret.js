// Perde 5 — Âhiret (27.42 – 36.6): "âlem-i âhirette de تَجْرٖى مِنْ تَحْتِهَا الْاَنْهَارُ kasırların altında,
// ebediyete lâyık cismanî ziyafetler olacaktır."
// Güneş yok, ışık yumuşak ve kaynaksız; ırmaklar oyuksuz yüzeyde, köşklerin ve tahtların altından akar.
'use strict';
const RISE = { t0: 27.42, t1: 29.5, dist: 3200 };
const riseY = (t) => RISE.dist * E.io3(inv(RISE.t0, RISE.t1, t));
(() => {
  const T0 = RISE.t0, T1 = 36.62;
  const tVista = 29.5, tToFeast = 32.55, tFeast = 33.05;

  function vistaCam(t) {
    const c = camAt([
      [tVista, { x: 540, y: 960, z: 1.0 }],
      [tToFeast, { x: 548, y: 990, z: 1.085 }, E.ioSine],
      [tFeast + 0.25, { x: 330, y: 1150, z: 2.3 }, E.in3],
    ], t);
    const b = breathe(t, 0.5); c.x += b.x; c.y += b.y; c.r = b.r;
    if (t < tVista) c.y += RISE.dist - riseY(t); // yükseliş: dünya yukarıdan iner
    return c;
  }
  function feastCam(t) {
    const c = camAt([
      [tFeast - 0.1, { x: 540, y: 1000, z: 1.32 }],
      [tFeast + 0.75, { x: 540, y: 980, z: 1.0 }, E.out3],
      [T1, { x: 548, y: 990, z: 1.065 }, E.ioSine],
    ], t);
    const b = breathe(t, 0.45); c.x += b.x; c.y += b.y; c.r = b.r; return c;
  }

  function drawVista(ctx, t) {
    const M = window.CENNET_M; if (!M) { ctx.fillStyle = '#F3E3D6'; ctx.fillRect(0, 0, W, H); return; }
    const c = vistaCam(t);
    for (const L of M.layers) {
      if (L.name === 'bulut-kusagi') continue; // kuşak ayrıca, yükseliş yolunda çizilir
      const cc = camPar(c, L.parallax);
      withCam(ctx, cc, () => {
        const sway = L.name.includes('agac') ? Math.sin(t * 0.9 + (L.x > 540 ? 1 : 0)) * 0.006 : 0;
        if (sway) { ctx.translate(L.x, L.y); ctx.rotate(sway); ctx.translate(-L.x, -L.y); }
        drawSpr(ctx, spr(L.name), L.x, L.y);
        if (L.name === 'cennet-irmak' && M.riverPath) {
          const fl = M.flowDir || (() => [0, 1]);
          waterShimmer(ctx, M.riverPath(), t, { n: 150, bbox: [-100, 1000, 1180, 2000], speed: 26, flow: fl, len: 28, wid: 3.5, alpha: 0.8, c1: '#FFFFFF', c2: '#C9F4F2', seed: 51 });
        }
      });
    }
  }
  // yükseliş sırasında geçilen bulut kuşağı (dünyanın altında, yukarıdan iner)
  function drawCloudBand(ctx, t) {
    if (!hasSpr('bulut-kusagi')) return;
    const c = vistaCam(t);
    withCam(ctx, camPar(c, 1), () => { drawSpr(ctx, spr('bulut-kusagi'), 540, 2480, 1.55); });
  }

  function drawFeast(ctx, t) {
    const Z = window.ZIYAFET; if (!Z) return;
    const c = feastCam(t);
    for (const L of Z.layers) {
      const cc = camPar(c, L.parallax);
      withCam(ctx, cc, () => {
        if (L.name === 'z-sarkan-dal' && Z.branch) {
          const b = Z.branch; const p = E.ioSine(inv(tFeast + 0.45, tFeast + 1.9, t));
          const rot = lerp(b.restRot || 0, b.lowerRot ?? 0.18, p) + Math.sin(t * 1.4) * 0.008;
          drawSpr(ctx, spr(L.name), b.x ?? L.x, b.y ?? L.y, 1, rot); return;
        }
        if (L.name === 'z-kanopi') { ctx.translate(Math.sin(t * 0.7) * 4, 0); }
        if (L.name === 'z-akvab' && Z.cups) { for (const [x, y] of Z.cups) drawSpr(ctx, spr('z-akvab'), x, y); return; }
        drawSpr(ctx, spr(L.name), L.x, L.y);
        if (L.name === 'z-platform' && Z.streamPath) {
          const d = Z.streamDir || [1, 0];
          waterShimmer(ctx, Z.streamPath(), t, { n: 90, bbox: [-120, 1300, 1200, 2000], speed: 30, flow: () => d, len: 30, wid: 3.5, alpha: 0.8, c1: '#FFFFFF', c2: '#C9F4F2', seed: 61 });
        }
      });
    }
    // kadehlerde ara sıra yumuşak inci parıltısı (patlama efekti değil)
    if (window.UI && Z.cups) Z.cups.forEach(([x, y], i) => { const per = 2.4, ph = (t - tFeast + i * 0.8) % per; if (ph < 0.6) { const [sx, sy] = w2s(c, x, y - 40); UI.sparkle(ctx, sx + 18, sy, 18, ph, '#FFFFFF'); } });
  }

  Engine.add({
    name: 'p5', t0: T0, t1: T1, z: 5,
    draw(ctx, t) {
      const feastA = E.io2(inv(tFeast - 0.15, tFeast + 0.2, t));
      if (feastA < 1) {
        drawVista(ctx, t);
        if (t < tVista + 0.1) drawCloudBand(ctx, t);
      }
      if (feastA > 0) { ctx.save(); ctx.globalAlpha = feastA; drawFeast(ctx, t); ctx.restore(); }
    },
  });
  sfx(28.15, 'airy', -20, { dur: 1.3 });
  sfx(29.25, 'water', -27, { dur: 7.4 });
  sfx(32.6, 'whoosh-in', -18, { dur: 0.7 });
  sfx(33.55, 'leaves', -30, { dur: 1.6 });
})();
