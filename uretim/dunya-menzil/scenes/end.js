/* end · 94.10–100.0 · photoreal ending: Risale-i Nur Külliyatı + Kur'an (Blender/Cycles frames) and the source.
   Frames: ending/frames/0001.png … 0180.png (1080x1920, 30 fps) rendered by ending/render_final.sh. */
(function () {
  const E = window.E;
  const N = 180;
  const src = (i) => `ending/frames/frame_${String(i).padStart(4, '0')}.png`;
  const idx = (lt) => E.clamp(Math.round(lt * 30) + 1, 1, N);
  const imgs = {};

  const def = {
    raw: true,
    async prepare(lt) {
      const i = idx(Math.max(0, lt));
      if (!imgs[i]) {
        try { imgs[i] = await E.loadImage(src(i)); } catch (e) { imgs[i] = null; }
      }
    },
    draw(L, lt) {
      const im = imgs[idx(Math.max(0, lt))];
      const p = L.paint;
      if (im) p.drawImage(im, 0, 0, E.W, E.H);
      else {
        const g = p.createLinearGradient(0, 0, 0, E.H);
        g.addColorStop(0, '#EFE6DA'); g.addColorStop(1, '#C9B39C');
        p.fillStyle = g; p.fillRect(0, 0, E.W, E.H);
        p.fillStyle = '#7a5a4a'; p.font = '600 48px "EB Garamond"'; p.textAlign = 'center';
        p.fillText('[ photoreal ending frame ' + idx(lt) + ' ]', E.W / 2, E.H * 0.62);
      }
    },
    overlay(ctx, lt) {
      // source title, upper calm area of the photograph
      const ink = '#3A2622', gold = '#9A7432';
      const cx = E.W / 2;
      const a1 = E.ep(lt, 0.9, 1.7, 'outCubic');
      const a2 = E.ep(lt, 1.15, 2.0, 'outCubic');
      const a3 = E.ep(lt, 1.5, 2.3, 'outCubic');
      const r1 = E.ep(lt, 1.0, 2.1, 'inOutCubic');
      const fadeEnd = 1 - E.ep(lt, 5.55, 5.9, 'inOutSine') * 0; // hold to the last frame
      const halo = (draw) => {
        ctx.save();
        ctx.filter = 'blur(14px)';
        ctx.globalAlpha *= 0.55;
        ctx.fillStyle = 'rgba(252,247,238,1)';
        ctx.strokeStyle = 'rgba(252,247,238,1)';
        draw(true);
        ctx.restore();
        draw(false);
      };
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      // line 1: RİSALE-İ NUR (letterspaced small caps)
      ctx.globalAlpha = a1 * fadeEnd;
      ctx.font = '600 34px "EB Garamond"';
      const spaced = 'RİSALE-İ NUR'.split('').join('  ');
      if ('letterSpacing' in ctx) ctx.letterSpacing = `${(1 - a1) * 6 + 7}px`;
      halo((h) => { ctx.fillStyle = h ? ctx.fillStyle : gold; ctx.fillText('RİSALE-İ NUR', cx, 300 - (1 - a1) * 10); });
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      // ornament rules
      ctx.globalAlpha = fadeEnd;
      const rw = 210 * r1;
      ctx.strokeStyle = gold;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(cx + s * 22, 334);
        ctx.lineTo(cx + s * (22 + rw), 334);
        ctx.stroke();
      }
      if (r1 > 0.1) {
        ctx.save();
        ctx.translate(cx, 334);
        ctx.rotate(Math.PI / 4);
        ctx.globalAlpha = E.clamp(r1 * 2) * fadeEnd;
        ctx.fillStyle = gold;
        ctx.fillRect(-5.5, -5.5, 11, 11);
        ctx.restore();
      }
      // line 2: book title
      ctx.globalAlpha = a2 * fadeEnd;
      ctx.font = '500 72px "EB Garamond"';
      halo((h) => { if (!h) ctx.fillStyle = ink; ctx.fillText('İman ve Küfür Muvazeneleri', cx, 424 - (1 - a2) * 12); });
      // line 3: page
      ctx.globalAlpha = a3 * fadeEnd;
      ctx.font = '500 italic 52px "Cormorant Garamond"';
      halo((h) => { if (!h) ctx.fillStyle = '#5A3F35'; ctx.fillText('sf. 155', cx, 500 - (1 - a3) * 10); });
      ctx.restore();
    },
    sfx() {
      return [
        { t: 94.15, type: 'swell', gain: 0.35, dur: 1.6, pitch: 0.8 },
        { t: 95.1, type: 'chime', gain: 0.35, pitch: 0.75 },
        { t: 95.35, type: 'page', gain: 0.25 },
      ];
    },
  };
  E.scene('end', def);
})();
