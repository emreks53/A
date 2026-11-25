// Günümüz Türkçesi karşılıkları: kelimenin ilk sesi okunduğu anda belirir. Kutu yok, kaynak kelime yok.
'use strict';
const Subs = (() => {
  // [kelime sırası (hizalama.json "i"), metin, ekle?]  ekle: önceki satıra eklenir (aynı satırda büyür)
  const DEF = [
    [0, 'ey aziz, bil'],
    [3, 'âhiret âlemine'],
    [6, 'içindekiler listesi'],
    [9, 'içindekiler listesinde'],
    [10, 'âhiret âleminin'],
    [17, 'maddi'],
    [22, 'sonlu'],
    [24, 'alçak'],
    [29, 'hissettirmek'],
    [31, 've feyizlendirmek', true],
    [37, 'duyular'],
    [39, 'cihazlar'],
    [42, 'aletler'],
    [44, 've araçlarından', true],
    [47, 'âhiret âleminde'],
    [50, 'altlarından ırmaklar akan'],
    [56, 'sonsuzluğa'],
    [58, 'maddi'],
  ];
  let items = null;
  const LEAD = 0.06; // ilk ses başlarken tam görünür olsun diye çok küçük öne alma
  function build(align, onsets) {
    const byI = {}; for (const w of align) byI[w.i] = w;
    const raw = DEF.map(([i, text, append]) => ({ i, text, append: !!append, t: (onsets && onsets[i] != null ? onsets[i] : byI[i].start) - LEAD, wEnd: byI[i].end }));
    // satırlar: ekleme yapanlar öncekine bağlanır
    const lines = [];
    for (const r of raw) {
      if (r.append && lines.length) lines[lines.length - 1].parts.push({ text: r.text, t: r.t });
      else lines.push({ parts: [{ text: r.text, t: r.t }], t: r.t, wEnd: r.wEnd });
    }
    // bitiş: bir sonraki satıra kadar ya da kelime bitişinden 1.7 sn sonra (en az 1.25 sn görünür)
    for (let k = 0; k < lines.length; k++) {
      const L = lines[k]; const next = lines[k + 1];
      const lastPart = L.parts[L.parts.length - 1].t;
      let end = Math.max(L.t + 1.25, lastPart + 1.15, (L.wEnd ?? L.t) + 1.4);
      end = Math.min(end, L.t + 3.2);
      if (next) end = Math.min(end, next.t - 0.12);
      L.end = end;
    }
    items = lines; return lines;
  }
  const FONT = '"EB Garamond", "DejaVu Serif", serif';
  function draw(ctx, t, o = {}) {
    if (!items) return;
    const y = o.y ?? 1385; const size = o.size ?? 66;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `italic 500 ${size}px ${FONT}`;
    for (const L of items) {
      if (t < L.t - 0.01 || t > L.end + 0.5) continue;
      const fadeOut = t > L.end ? 1 - E.in2(inv(L.end, L.end + 0.42, t)) : 1;
      // tüm satırın genişliği (eklenen parçalar dahil) → ortalama, eklenen parça gelince satır yumuşakça kayar
      const sep = ' ';
      const widths = L.parts.map((p) => ctx.measureText(p.text).width); const spW = ctx.measureText(sep).width;
      let visibleW = 0; let shownParts = 0;
      for (let k = 0; k < L.parts.length; k++) { if (t >= L.parts[k].t - 0.01) { shownParts = k + 1; } }
      // satır genişliği geçişi (parça eklendikçe merkez kayar)
      const fullW = (n) => widths.slice(0, n).reduce((a, b) => a + b, 0) + spW * Math.max(0, n - 1);
      let curW = fullW(1);
      for (let k = 1; k < shownParts; k++) { const p = E.out3(inv(L.parts[k].t, L.parts[k].t + 0.35, t)); curW = lerp(curW, fullW(k + 1), p); }
      let x = (W - curW) / 2;
      for (let k = 0; k < shownParts; k++) {
        const p = L.parts[k]; const a = E.out3(inv(p.t, p.t + 0.17, t)) * fadeOut;
        const rise = (1 - E.out3(inv(p.t, p.t + 0.42, t))) * 14;
        const blur = (1 - E.out2(inv(p.t, p.t + 0.22, t))) * 6;
        ctx.save();
        ctx.globalAlpha = a;
        // yumuşak, kutusuz okunurluk gölgesi
        if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
        ctx.fillStyle = '#FFF7EA';
        ctx.shadowColor = 'rgba(10,6,20,0.62)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 2;
        ctx.fillText(p.text, x, y + rise); // geniş, yumuşak koyu hale
        ctx.shadowColor = 'rgba(10,6,20,0.5)'; ctx.shadowBlur = 12;
        ctx.fillText(p.text, x, y + rise);
        ctx.shadowColor = 'rgba(12,8,24,0.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
        ctx.fillText(p.text, x, y + rise);
        ctx.restore();
        x += widths[k] + spW;
      }
    }
    ctx.restore();
  }
  return { build, draw, get items() { return items; }, DEF };
})();
