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
    let c;
    if (t < 2.42) c = camAt([[0.0, { x: 444, y: 1492, z: 1.62 }], [2.42, { x: 448, y: 1478, z: 1.79 }, E.ioSine]], t);
    else c = camSmooth([
      [2.42, { x: 448, y: 1478, z: 1.79 }, { stop: true }],
      [4.08, { x: 610, y: 972, z: 1.0 }, { v: { x: 18, y: -3, z: 0.012 } }], // geri çekilme durmadan süzülmeye bağlanır
      [6.1, { x: 648, y: 964, z: 1.03 }],
      [9.3, { x: 700, y: 944, z: 1.1 }],   // "âlem-i âhiretin mühim meselelerine": ufka doğru yavaş yaklaşma
      [10.4, { x: 708, y: 940, z: 1.11 }, { stop: true }],
    ], t);
    const b = breathe(t, 0.8); c.x += b.x; c.y += b.y; c.r = b.r;
    return c;
  }

  function drawWorld(ctx, t, c, dusk = 0, hooks = null) {
    const M = window.MANZARA; if (!M) return;
    for (const L of M.layers) {
      const cc = camPar(c, L.parallax);
      withCam(ctx, cc, () => {
        const dk = dusk > 0 && L.dusk && hasSpr(L.dusk) ? L.dusk : null; // akşam eşi (gökyüzü, bulutlar)
        const dx = L.name.startsWith('bulut') ? t * (6 + L.parallax * 10) : 0;
        if (L.name === 'gunes' && dusk > 0) { drawSpr(ctx, spr(L.name), L.x, L.y + dusk * 520, 1, 0, 1 - dusk); return; }
        if (dk) { if (dusk < 1) drawSpr(ctx, spr(L.name), L.x + dx, L.y); drawSpr(ctx, spr(dk), L.x + dx, L.y, 1, 0, dusk); return; }
        if (dx) { drawSpr(ctx, spr(L.name), L.x + dx, L.y); return; }
        drawSpr(ctx, spr(L.name), L.x, L.y);
        if (L.name === 'vadi' && M.riverPath) {
          const rp = M.riverPath();
          waterShimmer(ctx, rp, t, { n: 110, bbox: M.riverBBox || [180, 1000, 720, 1620], speed: 30, flow: M.riverFlow || ((x, y) => [-0.42, 0.91]), len: 22, wid: 3, alpha: 0.75 * (1 - dusk * 0.6) });
        }
        if (L.name === (M.manLayer || 'tumsek')) drawMan(ctx, t, M, dusk);
      });
      if (hooks && hooks[L.name]) hooks[L.name](ctx);
    }
  }

  function drawMan(ctx, t, M, dusk = 0) {
    if (!window.ADAM || !hasSpr('adam-oturan-govde')) {
      ctx.fillStyle = '#2B5D78'; ctx.beginPath(); ctx.ellipse(M.man[0], M.man[1] - 250, 110, 260, 0, 0, Math.PI * 2); ctx.fill(); return;
    }
    const A = ADAM.oturan; const sc = M.manScale ?? 1;
    const ox = M.man[0] - A.seat[0] * sc, oy = M.man[1] - A.seat[1] * sc;
    // baş: önce hafif öne eğik, "eyyühe'l-aziz" ile kalkar
    const lift = E.outBackSoft(inv(0.5, 1.45, t));
    const rot = lerp(0.2, -0.06, lift) + dusk * 0.2 + Math.sin(t * 1.1) * 0.006; // + öne eğik, − kalkık; akşamda düşünceli eğik
    drawPart(ctx, spr('adam-oturan-govde'), ox, oy, sc);
    drawPart(ctx, spr('adam-oturan-bas'), ox, oy, sc, rot);
  }

  // "fihriste": dünyadaki nimetler birer numune/başlık olarak işaretlenir; her birinden ufkun ötesine
  // (görünmeyen asıllarına) uzanan noktalı gösterge çizgileri. Sayfa/liste çizilmez (mecaz maddileştirilmez).
  const FLOAT = 104;          // madalyonun noktanın üstünde süzüldüğü yükseklik
  const MED_PX = 118;         // madalyon ekran çapı
  // madalyonların noktalarına göre süzülme yerleri (birbirini örtmesin diye ayrı ayrı)
  const OFF = { nar: [-40, -150], kovan: [-30, -120], uzum: [-40, -140], bugday: [-62, -140], nehir: [-40, -125], cicek: [-30, -150] };
  function horizonPt(c) { const [x, y] = w2s(camPar(c, 0.35), 905, 902); return [x, y]; } // ağaç tacının sağındaki açık ufuk
  function spotScreen(c, en) {
    const M = window.MANZARA; const sp = M && M.spots[en.spot]; if (!sp) return null;
    const pv = (M.spotPar && M.spotPar[en.spot]) ?? 0.8; return w2s(camPar(c, pv), sp[0], sp[1]);
  }
  function markerPos(c, en, t, i) {
    const s = spotScreen(c, en); if (!s) return [200 + i * 130, 1200];
    const o = OFF[en.spot] || [0, -FLOAT];
    return [s[0] + o[0] * c.z, s[1] + o[1] * c.z + Math.sin(t * 1.7 + i * 1.1) * 5];
  }
  // ufkun ötesi: göstergelerin kaybolduğu ince sis şeridi (uzak tepelerin önünde, vadinin ve ağacın arkasında)
  function drawHaze(ctx, t, c) {
    if (!window.UI) return; const tf = tF(); const hiP = E.io3(inv(tBiri(), tBiri() + 0.55, t));
    const hz = E.out2(inv(tf + 0.6, tf + 1.6, t)) * (1 - hiP * 0.4) * (1 - E.in2(inv(tZoom, 10.8, t)));
    if (hz <= 0) return; const H0 = horizonPt(c);
    if (UI.haze) UI.haze(ctx, H0[0] + 30, H0[1] + 6, 560, 70, '#FFF2DC', 0.32 * hz); else UI.glow(ctx, H0[0], H0[1], 160, '#FFF2DC', 0.2 * hz);
  }
  function drawIndex(ctx, t, c) {
    const tf = tF(); if (t < tf - 0.05) return;
    const hasUI = !!window.UI;
    const hiP = E.io3(inv(tBiri(), tBiri() + 0.55, t));
    const zoomP = E.in2(inv(tZoom, 10.98, t));
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
      const dim = isNar ? 1 : lerp(1, 0.22, hiP) * (1 - E.in2(inv(tZoom - 0.45, tZoom - 0.05, t)));
      const col = isNar ? mix('#FFF0CF', '#FFD27A', hiP) : '#FFF0CF';
      const x0 = mx, y0 = my - MED_PX * 0.55; const x1 = lerp(x0, H0[0] + (i - 2.5) * 12, lp), y1 = lerp(y0, H0[1] + Math.abs(i - 2.5) * 3, lp);
      const flow = Math.max(0, t - tBu() + 0.3) * 38; // "fihristede": göstergeler ötelere akar
      ctx.save(); ctx.globalAlpha = dim * 0.92;
      if (hasUI) UI.dots(ctx, x0, y0, x1, y1, 1, col, { gap: 19, size: isNar ? 5.4 + hiP * 1.6 : 4.8, bend: (mx - W / 2) * 0.22, offset: -flow });
      else { ctx.strokeStyle = col; ctx.setLineDash([2, 16]); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); }
      ctx.restore();
    });
    // ufkun ötesi: göstergelerin kaybolduğu yumuşak sis (ışık kaynağı değil)
    // ufka doğru akan işaret boncukları: "âlem-i âhiretin mühim meselelerine" (göstergeler ötelere işaret eder)
    if (hasUI) ENTRIES.forEach((en, i) => {
      const st = 7.2 + i * 0.22, u = inv(st, st + 1.25, t); if (u <= 0 || u >= 1) return;
      const [mx, my] = markerPos(c, en, t, i); const x0 = mx, y0 = my - MED_PX * 0.55;
      const x1 = H0[0] + (i - 2.5) * 12, y1 = H0[1] + Math.abs(i - 2.5) * 3; const bend = (mx - W / 2) * 0.22;
      const dx = x1 - x0, dy = y1 - y0, L0 = Math.hypot(dx, dy) || 1;
      const cx = (x0 + x1) / 2 - (dy / L0) * bend, cy = (y0 + y1) / 2 + (dx / L0) * bend;
      const q = E.io2(u), w = 1 - q; const bx = w * w * x0 + 2 * w * q * cx + q * q * x1, by = w * w * y0 + 2 * w * q * cy + q * q * y1;
      const a = Math.sin(u * Math.PI) * (1 - zoomP) * (i === 0 ? 1 : 1 - hiP * 0.7);
      ctx.save(); ctx.globalAlpha = a; UI.glow(ctx, bx, by, 34, '#FFE7B0', 0.35);
      ctx.fillStyle = '#FFF6DE'; ctx.beginPath(); ctx.arc(bx, by, 6.5 * (1 - q * 0.5), 0, Math.PI * 2); ctx.fill(); ctx.restore();
    });
    // madalyonlar: noktalarından kalkıp üstlerinde süzülür, ince sapla bağlı
    ENTRIES.forEach((en, i) => {
      const st = tf + i * 0.09; const p = inv(st, st + 0.6, t); if (p <= 0) return;
      const sp = spotScreen(c, en);
      const [mx0, my] = markerPos(c, en, t, i); const isNar = i === 0;
      const rise = E.out3(p); const yy = sp ? lerp(sp[1], my, rise) : my; const mx = sp ? lerp(sp[0], mx0, rise) : mx0;
      const dim = isNar ? 1 : lerp(1, 0.3, hiP) * (1 - E.in2(inv(tZoom - 0.45, tZoom - 0.05, t)));
      const pop = E.outBack(clamp(p * 1.5), 1.8);
      if (sp) { // sap: madalyondan nimetin kendisine ince çizgi ve küçük halka
        ctx.save(); ctx.globalAlpha = dim * 0.9 * rise; ctx.strokeStyle = '#FFF0CF'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
        const dx = sp[0] - mx, dy = sp[1] - yy, L = Math.hypot(dx, dy) || 1;
        ctx.beginPath(); ctx.moveTo(mx + dx / L * MED_PX * 0.48, yy + dy / L * MED_PX * 0.48); ctx.lineTo(sp[0] - dx / L * 12, sp[1] - dy / L * 12); ctx.stroke();
        ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sp[0], sp[1], 11, 0, 7); ctx.stroke(); ctx.restore();
      }
      if (isNar && hiP > 0 && hasUI) { UI.glow(ctx, mx, yy, 140, '#FFC56B', 0.22 * hiP); UI.ring(ctx, mx, yy, MED_PX * 0.5 + 14, hiP, '#FFD36E', 7, 4); }
      const sc = (MED_PX / 300) * pop * (isNar ? 1 + 0.2 * hiP : 1);
      const goneA = isNar ? 1 : 1 - E.in2(inv(tZoom - 0.45, tZoom - 0.05, t)); // dalıştan önce diğerleri tamamen söner
      if (window.ARAYUZ && ARAYUZ.drawMed && hasSpr(en.icon)) { if (goneA > 0.01) ARAYUZ.drawMed(ctx, en.icon, mx, yy, sc, isNar ? 0 : hiP, goneA); }
      else if (hasSpr(en.icon)) drawSpr(ctx, spr(en.icon), mx, yy, sc, 0, dim);
      else { ctx.fillStyle = '#F6E7CF'; ctx.globalAlpha = dim; ctx.beginPath(); ctx.arc(mx, yy, 56 * pop, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    });
    ctx.restore();
  }

  Engine.add({
    name: 'p1', t0: T0, t1: T1, z: 1,
    draw(ctx, t) {
      const c = cam(t);
      const reveal = inv(0, 0.95, t);
      if (reveal < 1) { ctx.save(); ctx.clip(BrushWipe.mask(reveal * 1.0, 21)); }
      drawWorld(ctx, t, c, 0, { 'tepe-orta': (x) => drawHaze(x, t, c) });
      // çiçek yaprakları süzülür
      driftParticles(ctx, ['cicek-tane-1', 'cicek-tane-2', 'cicek-tane-3'], t, { n: 7, speed: 70, y0: -60, scale: 0.55, wind: 26, stagger: 4, seed: 5, alpha: 0.95 * (1 - inv(4.0, 4.6, t)) });
      if (reveal < 1) ctx.restore();
      // liste için arka planı karart (dokuyu koruyan çarpma)
      const dimP = E.io2(inv(tF(), tF() + 0.7, t)) * (1 - E.in2(inv(tZoom + 0.25, T1, t)));
      if (dimP > 0) { ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.42 * dimP; ctx.fillStyle = '#4A4F86'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
      drawIndex(ctx, t, c);
      // dalış sonunda krem madalyon rengine geçiş (sonraki perdeye köprü)
      const fadeTo = E.io2(inv(10.84, 10.97, t));
      if (fadeTo > 0) { ctx.save(); ctx.globalAlpha = fadeTo; ctx.fillStyle = '#F3DDB8'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    },
  });
  window.P1 = { drawWorld, cam };
  // ses işaretleri
})();
