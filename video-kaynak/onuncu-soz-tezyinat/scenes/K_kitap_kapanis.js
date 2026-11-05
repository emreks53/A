/* K_kitap_kapanis (68.10–72.41) — Blender'da render edilmiş kapanış (out/blender/outro/NNNN.png, 130 kare):
 * parlak sayfadan geri çekilme, kapak kapanır, arkada diğer açık elit kırmızı ciltler.
 * Canvas: J'nin fildişi parlamasından gelen sekiz altın zerre kapağa iner (A'daki kancanın kafiyesi), toz zerreleri,
 * künye kartı (alt bant): "RİSALE-İ NUR" + ince yaldız çizgi + "Sözler · Onuncu Söz · 81. Sayfa".
 */
(function () {
  const N = 130, T0 = 68.10;
  const url = (i) => `out/blender/outro/${String(Math.max(0, Math.min(N - 1, i))).padStart(4, '0')}.png`;
  const GOLD = '#FFD98A', HALO = '#FFB547';
  // kapak üzerindeki iniş noktası (son karelerde kapak başlığı; Blender kareleri gelince ayarlanır)
  const LAND = [424, 708]; // son karelerde kapak madalyonunun merkezi (Blender outro 0102)

  function mote(ctx, x, y, r, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.fillStyle = E.rad(ctx, x, y, 0, r * 8, [[0, HALO, 0.4], [0.4, HALO, 0.1], [1, HALO, 0]]);
    ctx.beginPath(); ctx.arc(x, y, r * 8, 0, E.TAU); ctx.fill();
    ctx.fillStyle = E.rad(ctx, x, y, 0, r * 1.6, [[0, '#FFFFFF', 1], [0.5, GOLD, 0.9], [1, GOLD, 0]]);
    ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, E.TAU); ctx.fill();
    ctx.restore();
  }

  function card(ctx, t) {
    const k1 = E.p(t, 70.15, 70.95, 'outCubic'), k2 = E.p(t, 70.45, 71.25, 'outCubic'), kl = E.p(t, 70.35, 71.0, 'inOutCubic');
    if (k1 <= 0) return;
    ctx.save();
    // okunabilirlik: altta çok yumuşak koyulaşma (kutu değil)
    ctx.globalAlpha = 0.55 * k1; ctx.fillStyle = E.lin(ctx, 0, 1180, 0, 1700, [[0, '#120A06', 0], [0.45, '#120A06', 0.55], [1, '#120A06', 0]]); ctx.fillRect(0, 1180, E.W, 520);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    // 1. satır
    const sp1 = (1 - k1) * 14 + 9;
    ctx.font = '600 58px Cinzel'; ctx.letterSpacing = `${sp1.toFixed(1)}px`;
    ctx.shadowColor = 'rgba(18,8,4,0.75)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 3;
    ctx.globalAlpha = k1; ctx.filter = k1 < 1 ? `blur(${((1 - k1) * 6).toFixed(1)}px)` : 'none';
    ctx.fillStyle = '#FFF4E8'; ctx.fillText('RİSALE-İ NUR', E.W / 2 + sp1 / 2, 1372 + (1 - k1) * 12);
    ctx.filter = 'none';
    // ince yaldız çizgi (ortadan dışa)
    if (kl > 0) {
      ctx.shadowBlur = 0; ctx.globalAlpha = 0.9 * kl; const hw = 170 * kl;
      const g = ctx.createLinearGradient(E.W / 2 - hw, 0, E.W / 2 + hw, 0);
      g.addColorStop(0, 'rgba(216,178,110,0)'); g.addColorStop(0.5, 'rgba(232,200,130,1)'); g.addColorStop(1, 'rgba(216,178,110,0)');
      ctx.fillStyle = g; ctx.fillRect(E.W / 2 - hw, 1404, hw * 2, 2);
      ctx.save(); ctx.translate(E.W / 2, 1405); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#E8C882'; ctx.fillRect(-4, -4, 8, 8); ctx.restore();
    }
    // 2. satır
    if (k2 > 0) {
      ctx.font = 'italic 500 50px "Cormorant Garamond"'; ctx.letterSpacing = `${(1 + (1 - k2) * 6).toFixed(1)}px`;
      ctx.shadowColor = 'rgba(18,8,4,0.75)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 2;
      ctx.globalAlpha = k2; ctx.filter = k2 < 1 ? `blur(${((1 - k2) * 5).toFixed(1)}px)` : 'none';
      ctx.fillStyle = '#F4DCCB'; ctx.fillText('Sözler · Onuncu Söz · 81. Sayfa', E.W / 2, 1470 + (1 - k2) * 10);
    }
    ctx.restore();
  }

  E.scene({
    id: 'K_kitap_kapanis', t0: 68.10, t1: 72.41,
    prepare(t) { const i = Math.round((t - T0) * 30); return [url(i), url(i + 1)]; },
    post: (t) => ({ bloom: 0.2 + 0.25 * (1 - E.p(t, 68.3, 69.2)), vignette: 0.24 + 0.1 * E.p(t, 71.6, 72.4), grain: 0.035 }),
    draw(ctx, t) {
      const i = Math.round((t - T0) * 30), img = E.img(url(i));
      if (img) ctx.drawImage(img, 0, 0, E.W, E.H);
      else { ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, '#1E120C'], [1, '#5C3A24']]); ctx.fillRect(0, 0, E.W, E.H); }
      // J'nin fildişi ışığından devralma
      const w = 1 - E.p(t, 68.15, 68.9, 'outQuad');
      if (w > 0) { ctx.save(); ctx.globalAlpha = w * 0.8; ctx.fillStyle = E.rad(ctx, 540, 800, 0, 1300, [[0, '#FFFFFF'], [0.5, '#FFF6E6'], [1, '#FFE9C8']]); ctx.fillRect(0, 0, E.W, E.H); ctx.restore(); }
      S.dust(ctx, t, { n: 40, seed: 21, col: '#FFE2B0', rMin: 1.2, rMax: 3.2, speed: 12, alpha: 0.35 });
      // sekiz altın zerre: sayfalardan çıkar, sarmal çizerek kapağa iner, her biri küçük bir parıltıyla emilir
      for (let k = 0; k < 8; k++) {
        const t0 = 69.25 + k * 0.05, land = 70.0 + k * 0.08;
        const a = E.p(t, t0, t0 + 0.25) * (1 - E.p(t, land, land + 0.12));
        const u = E.p(t, t0, land, 'inOutSine');
        const ang = (k / 8) * E.TAU + u * 2.4;
        const R = 260 * (1 - u) + 6;
        const x = LAND[0] + Math.cos(ang) * R, y = LAND[1] + Math.sin(ang) * R * 0.6 - (1 - u) * 120;
        if (a > 0) mote(ctx, x, y, 3.2, a);
        const fl = E.env(t, land - 0.02, land + 0.22, 0.04, 0.16);
        if (fl > 0) S.sparkle(ctx, LAND[0] + Math.cos(ang) * 6, LAND[1] + Math.sin(ang) * 4, 16 * fl, fl * 0.9, '#FFF1C8', 0.3);
      }
      card(ctx, t);
    },
  });
})();
