/* A_kitap_giris (0.00–2.70) — Blender'da render edilmiş gerçekçi Risale-i Nur "Sözler" cildi (out/blender/intro/NNNN.png, 81 kare)
 * üzerine canvas atmosferi: sıcak ışık huzmesi, toz zerreleri ve ilk saniyenin "kanca"sı olan altın zerre:
 *  0.10 yaldızlı başlıktan bir altın zerre yükselir → "Hem" (0.42) parlar → "anlarsın" (0.56) sekiz zerreye bölünüp
 *  sekiz köşeli yıldız (hâşiye yıldızının habercisi) kurar ve döner → "ki" (1.06) açılan kapağın arasına, sayfaya süzülür.
 * B'ye geçiş: Blender'ın son kareleri krem ışığa doğru beyazlar; gecisler.js 'light' geçişi 2.30–2.70.
 */
(function () {
  const N = 81;
  const url = (i) => `out/blender/intro/${String(Math.max(0, Math.min(N - 1, i))).padStart(4, '0')}.png`;
  const GOLD = '#FFD98A', HALO = '#FFB547';
  // altın zerrenin yolu (ekran px): kapak başlığından (≈580,880) yükselip yıldız merkezine (≈560,760)
  const startP = [580, 900], starC = [560, 760];

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

      // --- altın zerre kancası ---
      const rise = E.p(t, 0.10, 0.50, 'outCubic');
      const split = E.p(t, 0.52, 0.86, 'outBack');
      const dive = E.p(t, 1.02, 1.55, 'inCubic');
      const appear = E.p(t, 0.06, 0.22, 'outQuad') * (1 - E.p(t, 1.45, 1.62));
      if (appear > 0) {
        const cx = E.lerp(startP[0], starC[0], rise) + Math.sin(t * 5) * 6 * (1 - split);
        const cy = E.lerp(startP[1], starC[1], rise) + E.noise(t * 1.3, 4) * 6;
        const bright = 1 + 0.45 * E.env(t, 0.38, 0.75, 0.08, 0.3);
        if (split <= 0.001) mote(ctx, cx, cy, 4.2 * bright, appear);
        else {
          // 8 zerre: yıldız köşeleri (r 70) etrafında döner; sonra sayfaya doğru (≈ 640,1020) sarmal dalış
          const R = 72 * split * (1 - dive * 0.85), rot = E.p(t, 0.56, 1.2, 'inOutSine') * Math.PI / 4 + dive * 2.2;
          const tx = 640, ty = 1030;
          const pts = [];
          for (let k = 0; k < 8; k++) {
            const a = rot + (k / 8) * E.TAU - Math.PI / 2;
            const x = E.lerp(cx + Math.cos(a) * R, tx + Math.cos(a) * 20 * (1 - dive), dive);
            const y = E.lerp(cy + Math.sin(a) * R, ty + Math.sin(a) * 10 * (1 - dive), dive);
            pts.push([x, y]);
          }
          // ince ışık çizgileri: iki kare (sekiz köşeli yıldız)
          const la = appear * split * (1 - dive) * 0.55;
          if (la > 0.01) {
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = E.rgba(GOLD, la); ctx.lineWidth = 1.6;
            for (const off of [0, 1]) { ctx.beginPath(); for (let k = 0; k < 4; k++) { const p = pts[(off + k * 2) % 8]; k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.closePath(); ctx.stroke(); }
            ctx.restore();
          }
          pts.forEach((p, k) => mote(ctx, p[0], p[1], (2.6 + 0.8 * bright) * (1 - dive * 0.5), appear * (0.75 + 0.25 * Math.sin(t * 9 + k))));
          if (dive > 0.85) S.light(ctx, tx, ty, 160, '#FFE3A1', (dive - 0.85) * 3 * 0.5);
        }
      }
      // son: sayfa ışığı (Blender beyazlığına yumuşak sıcaklık)
      const w = E.p(t, 2.15, 2.7, 'inQuad');
      if (w > 0) { ctx.save(); ctx.globalAlpha = w * 0.85; ctx.fillStyle = E.rad(ctx, 540, 960, 0, 1300, [[0, '#FFFFFF'], [0.5, '#FFF6E6'], [1, '#FFE9C8']]); ctx.fillRect(0, 0, E.W, E.H); ctx.restore(); }
    },
  });
})();
