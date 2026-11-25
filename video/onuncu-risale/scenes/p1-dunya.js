// Perde 1 — Dünya (0 – 11.1 sn): "İ'lem eyyühe'l-aziz! Dünya, âlem-i âhirete bir fihriste hükmündedir.
// Bu fihristede âlem-i âhiretin mühim meselelerine olan işaretlerden biri,"
'use strict';
(() => {
  const T0 = 0, T1 = 11.15;
  const ENTRIES = [
    { spot: 'nar', icon: 'ikon-nar' },
    { spot: 'bugday', icon: 'ikon-bugday' },
    { spot: 'uzum', icon: 'ikon-uzum' },
    { spot: 'nehir', icon: 'ikon-su' },
    { spot: 'cicek', icon: 'ikon-cicek' },
    { spot: 'kovan', icon: 'ikon-bal' },
  ];
  const LIST_X = 214, LIST_Y0 = 318, LIST_DY = 150, ICON_PX = 132; // ekran
  const LINE_X1 = 936;
  const tF = () => WT(6);      // fihriste
  const tBu = () => WT(9);     // fihristede
  const tBiri = () => 9.37;    // işaretlerden biri
  const tZoom = 10.38;         // nar madalyonuna dalış

  function cam(t) {
    const c = camAt([
      [0.0, { x: 444, y: 1492, z: 1.62 }],
      [2.42, { x: 448, y: 1478, z: 1.79 }, E.ioSine],
      [4.08, { x: 540, y: 962, z: 1.0 }, E.io3],
      [6.1, { x: 542, y: 958, z: 1.005 }, E.ioSine],
      [10.4, { x: 548, y: 925, z: 1.04 }, E.ioSine],
    ], t);
    const b = breathe(t, 0.8); c.x += b.x; c.y += b.y; c.r = b.r;
    return c;
  }

  function drawWorld(ctx, t, c, dusk = 0) {
    const M = window.MANZARA; if (!M) return;
    for (const L of M.layers) {
      const cc = camPar(c, L.parallax);
      withCam(ctx, cc, () => {
        if (L.name === 'gok-sabah' && dusk > 0 && hasSpr('gok-aksam')) {
          drawSpr(ctx, spr('gok-sabah'), L.x, L.y); drawSpr(ctx, spr('gok-aksam'), L.x, L.y, 1, 0, dusk);
          return;
        }
        if (L.name.startsWith('bulut')) { drawSpr(ctx, spr(L.name), L.x + t * (6 + (L.parallax * 10)), L.y); return; }
        if (L.name === 'gunes' && dusk > 0) { drawSpr(ctx, spr(L.name), L.x, L.y + dusk * 520, 1, 0, 1 - dusk); return; }
        drawSpr(ctx, spr(L.name), L.x, L.y);
        if (L.name === 'vadi' && M.riverPath) {
          const rp = M.riverPath();
          waterShimmer(ctx, rp, t, { n: 90, bbox: [180, 1000, 720, 1620], speed: 30, flow: (x, y) => [-0.42, 0.91], len: 22, wid: 3, alpha: 0.75 * (1 - dusk * 0.6) });
        }
        if (L.name === (M.manLayer || 'tumsek')) drawMan(ctx, t, M);
      });
    }
  }

  function drawMan(ctx, t, M) {
    if (!window.ADAM || !hasSpr('adam-oturan-govde')) {
      ctx.fillStyle = '#2B5D78'; ctx.beginPath(); ctx.ellipse(M.man[0], M.man[1] - 250, 110, 260, 0, 0, Math.PI * 2); ctx.fill(); return;
    }
    const A = ADAM.oturan; const sc = M.manScale ?? 1;
    const ox = M.man[0] - A.seat[0] * sc, oy = M.man[1] - A.seat[1] * sc;
    // baş: önce hafif öne eğik, "eyyühe'l-aziz" ile kalkar
    const lift = E.outBackSoft(inv(0.5, 1.45, t));
    const rot = lerp(-0.16, 0.05, lift) + Math.sin(t * 1.1) * 0.006;
    drawPart(ctx, spr('adam-oturan-govde'), ox, oy, sc);
    drawPart(ctx, spr('adam-oturan-bas'), ox, oy, sc, rot);
  }

  // "fihriste": dünyadaki nimetler birer numune/başlık olarak işaretlenir; her birinden ufkun ötesine
  // (görünmeyen asıllarına) uzanan noktalı gösterge çizgileri. Sayfa/liste çizilmez (mecaz maddileştirilmez).
  const FLOAT = 104;          // madalyonun noktanın üstünde süzüldüğü yükseklik
  const MED_PX = 118;         // madalyon ekran çapı
  function horizonPt(c) { const M = window.MANZARA; const hz = (M && M.horizon) || [560, 905]; const [x, y] = w2s(camPar(c, 0.35), hz[0], hz[1]); return [x, y - 40]; }
  function markerPos(c, en, t, i) {
    const M = window.MANZARA; const sp = M && M.spots[en.spot]; if (!sp) return [200 + i * 130, 1200];
    const pv = (M.spotPar && M.spotPar[en.spot]) ?? 0.8; const [x, y] = w2s(camPar(c, pv), sp[0], sp[1]);
    return [x, y - FLOAT + Math.sin(t * 1.7 + i * 1.1) * 5];
  }
  function drawIndex(ctx, t, c) {
    const tf = tF(); if (t < tf - 0.05) return;
    const hasUI = !!window.UI;
    const hiP = E.io3(inv(tBiri(), tBiri() + 0.55, t));
    const zoomP = E.in3(inv(tZoom, T1, t));
    const H0 = horizonPt(c);
    const narP = markerPos(c, ENTRIES[0], t, 0);
    ctx.save();
    if (zoomP > 0) { // nar madalyonuna dalış (madalyonun içindeki nar → sofradaki gerçek nar)
      const s = Math.exp(Math.log(16) * zoomP);
      const tx = lerp(narP[0], W / 2, E.io2(zoomP)), ty = lerp(narP[1], H * 0.5, E.io2(zoomP));
      ctx.translate(tx, ty); ctx.scale(s, s); ctx.translate(-narP[0], -narP[1]);
    }
    // önce çizgiler (madalyonların arkasında)
    ENTRIES.forEach((en, i) => {
      const st = tf + i * 0.09; const lp = E.out3(inv(st + 0.35, st + 1.2, t)); if (lp <= 0) return;
      const [mx, my] = markerPos(c, en, t, i); const isNar = i === 0;
      const dim = isNar ? 1 : lerp(1, 0.22, hiP);
      const col = isNar ? mix('#FFF0CF', '#FFD27A', hiP) : '#FFF0CF';
      const x0 = mx, y0 = my - MED_PX * 0.55; const x1 = lerp(x0, H0[0] + (i - 2.5) * 26, lp), y1 = lerp(y0, H0[1], lp);
      const flow = Math.max(0, t - tBu() + 0.3) * 38; // "fihristede": göstergeler ötelere akar
      ctx.save(); ctx.globalAlpha = dim * 0.92;
      if (hasUI) UI.dots(ctx, x0, y0, x1, y1, 1, col, { gap: 19, size: isNar ? 5.4 + hiP * 1.6 : 4.8, bend: (mx - W / 2) * 0.22, offset: -flow });
      else { ctx.strokeStyle = col; ctx.setLineDash([2, 16]); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      ctx.restore();
    });
    // ufkun ötesi: göstergelerin kaybolduğu yumuşak sis (ışık kaynağı değil)
    const hz = E.out2(inv(tf + 0.6, tf + 1.6, t)) * (1 - hiP * 0.5);
    if (hz > 0 && hasUI) UI.glow(ctx, H0[0], H0[1] + 10, 230, '#FFF4E0', 0.22 * hz);
    // madalyonlar: noktalarından kalkıp üstlerinde süzülür, ince sapla bağlı
    ENTRIES.forEach((en, i) => {
      const st = tf + i * 0.09; const p = inv(st, st + 0.6, t); if (p <= 0) return;
      const M = window.MANZARA; const sp = M && M.spots[en.spot];
      const [mx, my] = markerPos(c, en, t, i); const isNar = i === 0;
      const rise = E.out3(p); const yy = lerp(my + FLOAT, my, rise);
      const dim = isNar ? 1 : lerp(1, 0.3, hiP);
      const pop = E.outBack(clamp(p * 1.5), 1.8);
      if (sp) { // sap
        ctx.save(); ctx.globalAlpha = dim * 0.85 * rise; ctx.strokeStyle = '#FFF0CF'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(mx, yy + MED_PX * 0.45); ctx.lineTo(mx, my + FLOAT - 8); ctx.stroke();
        ctx.fillStyle = '#FFF0CF'; ctx.beginPath(); ctx.arc(mx, my + FLOAT - 6, 5, 0, 7); ctx.fill(); ctx.restore();
      }
      if (isNar && hiP > 0 && hasUI) { UI.glow(ctx, mx, yy, 140, '#FFC56B', 0.32 * hiP); UI.ring(ctx, mx, yy, MED_PX * 0.5 + 14, hiP, '#FFD36E', 7, 4); }
      const sc = (MED_PX / 300) * pop * (isNar ? 1 + 0.2 * hiP : 1);
      if (hasSpr(en.icon)) drawSpr(ctx, spr(en.icon), mx, yy, sc, 0, dim);
      else { ctx.fillStyle = '#F6E7CF'; ctx.globalAlpha = dim; ctx.beginPath(); ctx.arc(mx, yy, 56 * pop, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    });
    ctx.restore();
  }

  Engine.add({
    name: 'p1', t0: T0, t1: T1, z: 1,
    draw(ctx, t) {
      const c = cam(t);
      const reveal = inv(0, 0.62, t);
      if (reveal < 1) { ctx.save(); ctx.clip(BrushWipe.mask(reveal * 1.0, 21)); }
      drawWorld(ctx, t, c);
      // çiçek yaprakları süzülür
      driftParticles(ctx, ['cicek-tane-1', 'cicek-tane-2', 'cicek-tane-3'], t, { n: 7, speed: 70, y0: -60, scale: 0.55, wind: 26, stagger: 4, seed: 5, alpha: 0.95 * (1 - inv(4.0, 4.6, t)) });
      if (reveal < 1) ctx.restore();
      // liste için arka planı karart (dokuyu koruyan çarpma)
      const dimP = E.io2(inv(tF(), tF() + 0.7, t)) * (1 - E.in2(inv(tZoom + 0.25, T1, t)));
      if (dimP > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.42 * dimP; ctx.fillStyle = '#4A4F86'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      drawIndex(ctx, t, c);
      // dalış sonunda krem madalyon rengine geçiş (sonraki perdeye köprü)
      const fadeTo = E.in2(inv(10.82, T1, t));
      if (fadeTo > 0) { ctx.save(); ctx.globalAlpha = fadeTo; ctx.fillStyle = '#F3DDB8'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    },
  });
  window.P1 = { drawWorld, cam };
  // ses işaretleri
  sfx(0.0, 'brush', -6); sfx(0.18, 'brush', -9); sfx(0.36, 'brush', -11);
  sfx(2.45, 'whoosh-soft', -8, { dur: 1.6 });
  ENTRIES.forEach((_, i) => sfx(4.18 + i * 0.085 + 0.28, 'pop', -14 + (i % 2) * -2, { pitch: 1 + i * 0.06 }));
  sfx(9.37, 'brush', -12); sfx(9.45, 'chime', -20);
  sfx(10.4, 'whoosh-in', -8, { dur: 0.8 });
})();
