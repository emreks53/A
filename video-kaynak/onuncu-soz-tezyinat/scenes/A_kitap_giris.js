/* A_kitap_giris (0.00–2.70) — Blender'da render edilmiş gerçekçi Risale-i Nur "Sözler" cildi (out/blender/intro/NNNN.png, 81 kare)
 * üzerine canvas atmosferi: sıcak ışık huzmesi, toz zerreleri ve ilk saniyenin "kanca"sı olan altın zerre:
 *  sayfa kenarlarından birkaç yumuşak altın zerre yükselir; kapak açılırken sayfaya doğru sarmal çizip ışığa karışır.
 * B'ye geçiş: Blender'ın son kareleri krem ışığa doğru beyazlar; gecisler.js 'light' geçişi 2.30–2.70.
 */
(function () {
  const N = 81;
  const url = (i) => `out/blender/intro/${String(Math.max(0, Math.min(N - 1, i))).padStart(4, '0')}.png`;
  const GOLD = '#FFD98A', HALO = '#FFB547';

  function mote(ctx, x, y, r, a) {
    if (a <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
    ctx.fillStyle = E.rad(ctx, x, y, 0, r * 8, [[0, HALO, 0.45], [0.4, HALO, 0.12], [1, HALO, 0]]);
    ctx.beginPath(); ctx.arc(x, y, r * 8, 0, E.TAU); ctx.fill();
    ctx.fillStyle = E.rad(ctx, x, y, 0, r * 1.6, [[0, '#FFFFFF', 1], [0.5, GOLD, 0.9], [1, GOLD, 0]]);
    ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, E.TAU); ctx.fill();
    ctx.restore();
  }

  E.scene({
    id: 'A_kitap_giris', t0: 0.0, t1: 2.7,
    prepare(t) { const i = Math.round(t * 30); return [url(i), url(i + 1)]; },
    post: (t) => ({ bloom: 0.22 + 0.3 * E.p(t, 1.6, 2.6), vignette: 0.22, grain: 0.035 }),
    draw(ctx, t) {
      const i = Math.round(t * 30), img = E.img(url(i));
      if (img) ctx.drawImage(img, 0, 0, E.W, E.H);
      else { ctx.fillStyle = E.lin(ctx, 0, 0, 0, E.H, [[0, '#1E120C'], [1, '#5C3A24']]); ctx.fillRect(0, 0, E.W, E.H); }

      // sıcak ışık huzmesi (sol üstten), giderek sayfa ışığına karışır
      const beam = 0; // Blender ışığı yeterli; yapay huzme kaldırıldı
      if (beam > 0.005) {
        ctx.save(); ctx.globalCompositeOperation = 'screen';
        const g = ctx.createLinearGradient(-100, 0, 900, 1300);
        g.addColorStop(0, E.rgba('#FFE9C4', beam * 1.6)); g.addColorStop(0.55, E.rgba('#FFD9A0', beam)); g.addColorStop(1, E.rgba('#FFD9A0', 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-200, -100); ctx.lineTo(260, -100); ctx.lineTo(1150, 1450); ctx.lineTo(620, 1650); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      // toz zerreleri (huzmede daha görünür)
      S.dust(ctx, t, { n: 46, seed: 11, col: '#FFE2B0', rMin: 1.2, rMax: 3.4, speed: 14, alpha: 0.42 * (1 - E.p(t, 2.0, 2.6)) });

      // --- altın zerreler: sayfa kenarlarından yumuşakça yükselir, kapak açılırken sayfaya doğru süzülüp kaybolur ---
      // (çizgi, düğüm, sekiz köşeli yıldız YOK; başlığın üstüne konmaz; her şey 8+ karede belirir/kaybolur)
      const N = 9, tx = 640, ty = 1040;
      for (let k = 0; k < N; k++) {
        const born = 0.12 + k * 0.06, a0 = E.p(t, born, born + 0.35, 'outQuad');
        const dive = E.p(t, 0.95 + k * 0.035, 1.75 + k * 0.03, 'inOutSine');
        const gone = 1 - E.p(t, 1.55 + k * 0.03, 1.85 + k * 0.03);
        const alpha = a0 * gone;
        if (alpha <= 0.01) continue;
        // başlangıç: kitabın alt/yan yaldızlı sayfa kenarları boyunca (başlığın uzağında)
        const sx = E.lerp(250, 860, E.hash(k, 31)), sy = E.lerp(1180, 1330, E.hash(k, 32));
        const rise = E.p(t, born, born + 1.2, 'outCubic');
        const fx = sx + E.noise(t * 0.8 + k, 33) * 40, fy = sy - rise * E.lerp(120, 260, E.hash(k, 34));
        const ang = (k / N) * E.TAU + dive * 2.6, R = 90 * (1 - dive);
        const x = E.lerp(fx, tx + Math.cos(ang) * R, dive), y = E.lerp(fy, ty + Math.sin(ang) * R * 0.55, dive);
        mote(ctx, x, y, E.lerp(2.2, 3.6, E.hash(k, 35)) * (1 - dive * 0.4), alpha * (0.7 + 0.3 * Math.sin(t * 6 + k)));
      }
      const sink = E.env(t, 1.45, 2.1, 0.25, 0.4);
      if (sink > 0) S.light(ctx, tx, ty, 220, '#FFE3A1', sink * 0.35);
      // son: sayfa ışığı (Blender beyazlığına yumuşak sıcaklık)
      const w = E.p(t, 2.15, 2.7, 'inQuad');
      if (w > 0) { ctx.save(); ctx.globalAlpha = w * 0.85; ctx.fillStyle = E.rad(ctx, 540, 960, 0, 1300, [[0, '#FFFFFF'], [0.5, '#FFF6E6'], [1, '#FFE9C8']]); ctx.fillRect(0, 0, E.W, E.H); ctx.restore(); }
    },
  });
})();
