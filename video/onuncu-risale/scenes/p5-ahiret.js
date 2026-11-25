// Perde 5 — Âhiret (27.42 – 36.6): "âlem-i âhirette de تَجْرٖى مِنْ تَحْتِهَا الْاَنْهَارُ kasırların altında,
// ebediyete lâyık cismanî ziyafetler olacaktır."
// Güneş yok, ışık yumuşak ve kaynaksız; ırmaklar oyuksuz yüzeyde, köşklerin ve tahtların altından akar.
'use strict';
// bulut kuşağı sprite'ı 1480x900: üst 0-100 kabarık kenar, 100-700 tam örtücü gövde, 700-850 seyrek.
// A (düz) kabarık kenarıyla manzaraya bakar; B (ters) gövdesi A'nın gövdesine biner, kabarık kenarı önceki sahneye bakar.
const BAND = { sc: 1.2, topA: 1920 - 150 };
BAND.topB = BAND.topA + 480 * BAND.sc;
const RISE = { t0: 27.38, t1: 29.6, dist: BAND.topB + 900 * BAND.sc }; // B'nin alt kenarı = önceki sahnenin üst kenarı
const riseY = (t) => RISE.dist * E.io3(inv(RISE.t0, RISE.t1, t));
(() => {
  const T0 = RISE.t0, T1 = 37.32; // kaynak fotoğrafının fırça silmesi bitene dek altta çizilir (turuncu astar parlamasın)
  const tVista = 29.5, tFeast = 33.05; // ziyafete geçiş (çözülme) 33.12–33.25

  function vistaCam(t) {
    // yükselişin sonundaki yukarı süzülüş durmadan sürer; ırmak cümlesinde kadraj suyu izler, "kasırların altında"da
    // köşklere yönelir, sonra sol köşkün açık revağına giderek hızlanan bir dalışla girilir (ziyafet o revağın altında).
    const c = camSmooth([
      [tVista, { x: 540, y: 960, z: 1.0 }, { v: { x: 4, y: 42, z: 0.02 } }],
      [31.35, { x: 566, y: 1075, z: 1.07 }],
      [32.45, { x: 452, y: 990, z: 1.22 }],
      [33.25, { x: 385, y: 1042, z: 7.0 }, { v: { x: 0, y: 0, z: 4.5 } }],
    ], t);
    const b = breathe(t, 0.5); c.x += b.x; c.y += b.y; c.r = b.r;
    return c;
  }
  function feastCam(t) {
    // "ebediyete lâyık": öndeki dal salkımlarını indirirken ona yaklaşılır; "cismanî ziyafetler": bütün sofraya açılır
    const c = camSmooth([
      [tFeast + 0.07, { x: 540, y: 1000, z: 0.95 }, { v: { x: 40, y: -40, z: 0.18 } }],
      [33.95, { x: 636, y: 905, z: 1.15 }],
      [34.95, { x: 540, y: 986, z: 1.0 }],
      [T1, { x: 548, y: 992, z: 1.07 }, { stop: true }],
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
          for (const [i, [fx, fy, fn, fs]] of (M.flowerSpots || []).entries()) if (hasSpr(fn)) drawSpr(ctx, spr(fn), fx, fy, fs, Math.sin(t * 1.1 + i * 1.7) * 0.03);
        }
      });
    }
  }
  // yükseliş sırasında geçilen bulut kuşağı (dünyanın altında, yukarıdan iner)
  function drawCloudBand(ctx, t) {
    const M = window.CENNET_M; if (!hasSpr('bulut-kusagi')) return;
    const b = spr('bulut-kusagi'); const k = b.k || 1, sc = BAND.sc;
    const bw = (b.canvas.width / k) * sc; const L = W / 2 - bw / 2;
    // varışta kuşak alfa ile değil, kümeler kenarlara çekilerek çözülür
    const p = E.io2(inv(0.86, 1, riseY(t) / RISE.dist));
    if (M && M.drawBand) { M.drawBand(ctx, L, BAND.topA, sc, p, false); M.drawBand(ctx, L, BAND.topB, sc, p, true); return; }
    const at = (top, flip) => { ctx.save(); ctx.globalAlpha *= 1 - p; if (flip) { ctx.translate(0, top + b.canvas.height / k * sc); ctx.scale(1, -1); top = 0; } drawSpr(ctx, b, L, top, sc); ctx.restore(); };
    at(BAND.topA, false); at(BAND.topB, true);
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
    // "ziyafetler": tepsi, kadehler ve ibrikte sırayla yumuşak bir inci parlaklığı (patlama/ışın yok)
    const sheen = (x, y, r, t0) => {
      const k = inv(t0, t0 + 0.7, t); if (k <= 0 || k >= 1) return; const a = 0.24 * Math.sin(k * Math.PI);
      const [sx, sy] = w2s(c, x, y); const R = r * c.z;
      ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = a;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R); g.addColorStop(0, '#FFF8EE'); g.addColorStop(1, 'rgba(255,248,238,0)');
      ctx.fillStyle = g; ctx.fillRect(sx - R, sy - R, 2 * R, 2 * R); ctx.restore();
    };
    const tz = 34.98;
    if (Z.tray) sheen(Z.tray.x, Z.tray.y - 20, (Z.tray.RX || 210) * 0.9, tz);
    if (Z.cups) Z.cups.forEach(([x, y], i) => sheen(x, y - 40, 46, tz + 0.12 + i * 0.09));
    if (Z.ewer) sheen(Z.ewer[0], Z.ewer[1] - 90, 70, tz + 0.42);
  }

  Engine.add({
    name: 'p5', t0: T0, t1: T1, z: 5,
    draw(ctx, t) {
      const feastA = E.io2(inv(tFeast + 0.07, tFeast + 0.2, t));
      if (feastA < 1) {
        // yükseliş: bütün manzara (katmanları bozulmadan) yukarıdan iner; altında bulut kuşağı
        const off = -(RISE.dist - riseY(t));
        ctx.save(); ctx.translate(0, off);
        drawVista(ctx, t);
        if (t < tVista + 0.1) drawCloudBand(ctx, t);
        ctx.restore();
        // önde, kuşaktan daha hızlı geçen bulut kümeleri: yükselişte derinlik (paralaks)
        const M = window.CENNET_M;
        if (M && M.drawWisps && t < tVista) {
          const y = 960 + 1.55 * (riseY(t) - 2380);
          if (y > -900 && y < H + 900) M.drawWisps(ctx, W / 2 + 40, y, 1.7, 1);
        }
      }
      if (feastA > 0) withAlpha(ctx, feastA, (c) => drawFeast(c, t), 'p5ziyafet');
    },
  });
})();
