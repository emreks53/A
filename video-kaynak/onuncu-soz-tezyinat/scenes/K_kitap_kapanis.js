/* K_kitap_kapanis (68.10–72.41) — Blender'da render edilmiş kapanış (out/blender/outro/NNNN.png, 130 kare):
 * parlak sayfadan geri çekilme, kapak kapanır, arkada diğer açık elit kırmızı ciltler.
 * Canvas: J'nin fildişi parlamasından gelen sekiz altın zerre kapağa iner (A'daki kancanın kafiyesi), toz zerreleri,
 * künye kartı (alt bant): "RİSALE-İ NUR" + ince yaldız çizgi + "Sözler · Onuncu Söz · 81. Sayfa".
 */
(function () {
  const N = 130, T0 = 68.10;
  const url = (i) => `out/blender/outro/${String(Math.max(0, Math.min(N - 1, i))).padStart(4, '0')}.png`;
  const GOLD = '#FFD98A', HALO = '#FFB547';
  // Blender outro: kapak f70'te (70.433 s) masaya değer, f76'da (70.633 s) durur; f78–f129 arası kamera hafifçe kayar.
  // Madalyon (son kare f129): merkez (520,831); uçlar sol (423,847) sağ (614,816) üst (469,765) alt (576,904).
  const MU = [95.5, -15.5], MV = [53.5, 69.5];          // madalyon elipsinin yarı eksenleri (görüntüde)
  const center = (t) => { const d = 1 - E.p(t, 70.70, 72.40, 'inOutSine'); return [520 + 6 * d, 831 + 2 * d]; };
  const rim = (t, th, sc) => { const c = center(t); return [c[0] + (Math.cos(th) * MU[0] + Math.sin(th) * MV[0]) * sc, c[1] + (Math.cos(th) * MU[1] + Math.sin(th) * MV[1]) * sc]; };

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
    const k1 = E.p(t, 70.70, 71.45, 'outCubic'), k2 = E.p(t, 70.95, 71.70, 'outCubic'), kl = E.p(t, 70.85, 71.50, 'inOutCubic');
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
      ctx.fillStyle = '#F4DCCB';
      // Cormorant'ın eski stil rakamlarında "81" → "8ı" gibi okunuyordu: rakamlar hizalı (lining) Cinzel ile
      const segs = [['Sözler · Onuncu Söz · ', 'italic 500 50px "Cormorant Garamond"'], ['81', '500 41px Cinzel'], ['. Sayfa', 'italic 500 50px "Cormorant Garamond"']];
      let tw = 0; const ws = segs.map(([tx, f]) => { ctx.font = f; const w = ctx.measureText(tx).width; tw += w; return w; });
      let x0 = E.W / 2 - tw / 2; ctx.textAlign = 'left';
      segs.forEach(([tx, f], i) => { ctx.font = f; ctx.fillText(tx, x0, 1470 + (1 - k2) * 10); x0 += ws[i]; });
      ctx.textAlign = 'center';
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
      // sekiz altın zerre: kapak kapanırken ışıktan süzülür, sarmal çizerek madalyonun çerçevesine (başlığa değil) iner,
      // kapak durduktan sonra (70.72 s'den itibaren) her biri küçük bir parıltıyla emilir
      for (let k = 0; k < 8; k++) {
        const t0 = 69.95 + k * 0.04, land = 70.72 + k * 0.07, th = (k / 8) * E.TAU + 0.3;
        const a = E.p(t, t0, t0 + 0.25) * (1 - E.p(t, land, land + 0.12));
        const u = E.p(t, t0, land, 'inOutSine');
        if (a > 0.01) {
          const q = rim(t, th - (1 - u) * 1.4, 1 + 2.4 * (1 - u));
          mote(ctx, q[0], q[1] - (1 - u) * 140, 3.0, a);
        }
        const fl = E.env(t, land - 0.02, land + 0.22, 0.04, 0.16);
        if (fl > 0) { const q = rim(t, th, 1); S.sparkle(ctx, q[0], q[1], 14 * fl, fl * 0.85, '#FFF1C8', 0.3); }
      }
      card(ctx, t);
    },
  });
})();
