// Perde 6 — Kaynak (36.2 – 41.5): akrilik darbeler çözülür, gerçek fotoğraf; yavaş kamera yaklaşması ve kaynak.
'use strict';
(() => {
  const T0 = 36.2, T1 = 41.5;
  const img = new Image(); let ok = false; img.onload = () => { ok = true; }; img.src = 'foto/son-sahne.png';
  window.FOTO_READY = () => new Promise((res) => { if (ok) return res(); img.onload = () => { ok = true; res(); }; img.onerror = () => res(); });
  const LINES = [
    { text: 'Risale-i Nur', font: '600 82px "EB Garamond"', dy: 0, at: 37.05 },
    { text: 'Mesnevi-i Nuriye', font: 'italic 500 62px "EB Garamond"', dy: 104, at: 37.35 },
    { text: 'Onuncu Risale', font: '500 54px "EB Garamond"', dy: 184, at: 37.62 },
    { text: '215. Sayfa', font: '500 48px "EB Garamond"', dy: 256, at: 37.88 },
  ];
  const TEXT_Y = 452; // ilk satırın taban çizgisi (pencerenin tepeler bölgesi)
  const reveal = (t) => inv(T0, T0 + 1.05, t);

  // derinlik haritasıyla önceden üretilmiş 2.5B kızak çekimi kareleri (tools/foto_paralaks.py); yoksa düz fotoğraf
  const NK = 160; const kare = {};
  async function frameImg(i) {
    if (kare[i] === undefined) { const im = new Image(); im.src = `foto/kare/k${String(i).padStart(3, '0')}.jpg`; kare[i] = im.decode().then(() => im, () => null); }
    return kare[i];
  }
  async function drawPhoto(ctx, t) {
    const i = clamp(Math.round((t - T0) * 30), 0, NK - 1);
    const fi = await frameImg(i);
    if (fi) { ctx.drawImage(fi, 0, 0, W, H); return; }
    if (!ok) { ctx.fillStyle = '#3a2a20'; ctx.fillRect(0, 0, W, H); return; }
    const p = E.ioSine(inv(T0, T1, t)); const s = lerp(1.0, 1.035, p); const fx = 548, fy = lerp(980, 930, p);
    const ih = (img.height / img.width) * W;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(s, s); ctx.translate(-fx, -fy); ctx.drawImage(img, 0, (H - ih) / 2, W, ih); ctx.restore();
  }

  Engine.add({
    name: 'p6', t0: T0, t1: T1, z: 6, photo: true,
    weaveAt: (t) => 0.55 * (1 - E.io2(reveal(t))),
    vigAt: (t) => 1 - E.io2(reveal(t)),
    async draw(ctx, t) {
      const rp = reveal(t);
      if (rp < 1) { ctx.save(); ctx.clip(BrushWipe.mask(E.io2(rp) * 1.05, 61)); }
      await drawPhoto(ctx, t);
      if (rp < 1) ctx.restore();
    },
    overlay(ctx, t) {
      // kaynak yazısı (tuval dokusunun üstünde, keskin)
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      for (const L of LINES) {
        const a = E.out3(inv(L.at, L.at + 0.7, t)) * (1 - E.in2(inv(41.05, 41.45, t)));
        if (a <= 0) continue;
        const rise = (1 - E.out3(inv(L.at, L.at + 0.9, t))) * 16;
        ctx.save(); ctx.globalAlpha = a; ctx.font = L.font;
        ctx.shadowColor = 'rgba(18,10,4,0.62)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 3; ctx.fillStyle = '#FFF6E6';
        ctx.fillText(L.text, W / 2, TEXT_Y + L.dy + rise);
        ctx.shadowBlur = 6; ctx.shadowColor = 'rgba(18,10,4,0.4)'; ctx.fillText(L.text, W / 2, TEXT_Y + L.dy + rise);
        ctx.restore();
      }
      // ince altın çizgi (ilk satırın altında)
      const la = E.out3(inv(37.25, 38.0, t)) * (1 - E.in2(inv(41.05, 41.45, t)));
      if (la > 0) { ctx.save(); ctx.globalAlpha = la * 0.9; ctx.strokeStyle = '#F0D9A8'; ctx.lineWidth = 2; ctx.shadowColor = 'rgba(18,10,4,0.5)'; ctx.shadowBlur = 10; const hw = 120 * E.out3(inv(37.25, 38.0, t)); ctx.beginPath(); ctx.moveTo(W / 2 - hw, TEXT_Y + 36); ctx.lineTo(W / 2 + hw, TEXT_Y + 36); ctx.stroke(); ctx.restore(); }
      // sonda yumuşak kararma
      const fo = E.in2(inv(41.05, 41.5, t)); if (fo > 0) { ctx.save(); ctx.globalAlpha = fo; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.restore(); }
    },
  });
  sfx(36.22, 'brush', -12); sfx(36.45, 'brush', -14);
  sfx(36.6, 'room', -30, { dur: 4.9 });
})();
