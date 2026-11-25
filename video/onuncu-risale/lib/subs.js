// Günümüz Türkçesi karşılıkları: kelimenin ilk sesi okunduğu anda belirir. Kutu yok, kaynak kelime yok.
'use strict';
const Subs = (() => {
  // [kelime sırası (hizalama.json "i"), metin, ekle?, ayraç]
  // ekle: önceki satıra eklenir (aynı satırda büyür); ayraç: önceki parçayla arasındaki işaret (varsayılan boşluk).
  // "içindekiler listesi" → "-nde" eki aynı satırda belirir (iki benzer satır üst üste binmesin diye).
  // âlât → "aletler", edevatından → "araçlarından": iki ayrı karşılık; metindeki "ve" eklenmez, araya virgül konur.
  const DEF = [
    [0, 'ey aziz, bil'],
    [3, 'âhiret âlemine'],
    [6, 'içindekiler listesi'],
    [9, 'nde', true, ''],
    [10, 'âhiret âleminin'],
    [17, 'maddi'],
    [22, 'sonlu'],
    [24, 'alçak'],
    [29, 'hissettirmek'],
    [31, 've feyizlendirmek', true],
    [37, 'duyular'],
    [39, 'cihazlar'],
    [42, 'aletler'],
    [44, 'araçlarından', true, ', '],
    [47, 'âhiret âleminde'],
    [50, 'altlarından ırmaklar akan'],
    [56, 'sonsuzluğa'],
    [58, 'maddi'],
  ];
  let items = null;
  const LEAD = 0.06;      // ilk ses başlarken tam görünür olsun diye çok küçük öne alma
  const OUT = 0.42;       // doğal bitişte sönme
  const OUT_FAST = 0.1;   // sıradaki karşılık gelirken: eskisi tamamen gitmeden yenisi belirmez
  function build(align, onsets) {
    const byI = {}; for (const w of align) byI[w.i] = w;
    const raw = DEF.map(([i, text, append, sep]) => ({ i, text, append: !!append, sep: sep ?? ' ', t: (onsets && onsets[i] != null ? onsets[i] : byI[i].start) - LEAD, wEnd: byI[i].end }));
    const lines = [];
    for (const r of raw) {
      if (r.append && lines.length) { const L = lines[lines.length - 1]; L.parts.push({ text: r.text, t: r.t, sep: r.sep }); L.wEnd = Math.max(L.wEnd ?? 0, r.wEnd); }
      else lines.push({ parts: [{ text: r.text, t: r.t, sep: '' }], t: r.t, wEnd: r.wEnd });
    }
    // bitiş: kelime bitişinden ~1.4 sn sonra (en az 1.25 sn görünür, en çok 3.2 sn); sıradaki gelirse hızlı söner
    for (let k = 0; k < lines.length; k++) {
      const L = lines[k]; const next = lines[k + 1];
      const lastPart = L.parts[L.parts.length - 1].t;
      let end = Math.max(L.t + 1.25, lastPart + 1.15, (L.wEnd ?? L.t) + 1.4);
      end = Math.min(end, Math.max(L.t + 3.2, lastPart + 1.6));
      L.out = OUT;
      if (next && end + OUT > next.t - 0.02) { end = Math.min(end, next.t - 0.02 - OUT_FAST); L.out = OUT_FAST; }
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
      if (t < L.t - 0.01 || t > L.end + L.out) continue;
      const outP = t > L.end ? E.in2(inv(L.end, L.end + L.out, t)) : 0;
      const fade = 1 - outP; const lift = -outP * 8;
      // parçalar ve aralarındaki ayraçlar
      const shown = L.parts.filter((p) => t >= p.t - 0.13).length;
      const segs = []; // [{text, w, part}]
      for (let k = 0; k < L.parts.length; k++) {
        const p = L.parts[k];
        const lead = k > 0 && p.sep ? p.sep : '';
        segs.push({ text: lead + p.text, w: ctx.measureText(lead + p.text).width, k });
      }
      const fullW = (n) => segs.slice(0, n).reduce((a, s) => a + s.w, 0);
      // satır merkezi: yeni parça gelmeden hemen önce kaymaya başlar, parça son yerinde belirir (sağdan taşmaz)
      let curW = fullW(1);
      for (let k = 1; k < Math.max(1, shown); k++) { const p = L.parts[k]; curW = lerp(curW, fullW(k + 1), E.io2(inv(p.t - 0.12, p.t + 0.22, t))); }
      // okunurluk için kutusuz, yumuşak, oval gölge (açık zeminlerde)
      {
        const rx = curW / 2 + 120, ry = 74, cy = y - size * 0.3 + lift;
        const a0 = E.out2(inv(L.t, L.t + 0.25, t)) * fade;
        ctx.save(); ctx.globalAlpha = a0; ctx.translate(W / 2, cy); ctx.scale(rx / ry, 1);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ry);
        g.addColorStop(0, 'rgba(14,9,26,0.30)'); g.addColorStop(0.55, 'rgba(14,9,26,0.17)'); g.addColorStop(1, 'rgba(14,9,26,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ry, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      let x = (W - curW) / 2;
      for (let k = 0; k < shown; k++) {
        const s = segs[k]; const p = L.parts[k];
        const a = E.out3(inv(p.t, p.t + 0.17, t)) * fade;
        const grow = k > 0 && p.sep === ''; // ek (ör. "-nde"): yerinde, yükselmeden belirir, kelimeyle bütün görünsün
        const rise = (grow ? 0 : (1 - E.out3(inv(p.t, p.t + 0.42, t))) * 14) + lift;
        const blur = grow ? 0 : (1 - E.out2(inv(p.t, p.t + 0.22, t))) * 6;
        if (a > 0.003) {
          ctx.save();
          ctx.globalAlpha = a;
          if (blur > 0.3) ctx.filter = `blur(${blur.toFixed(2)}px)`;
          ctx.fillStyle = '#FFF7EA';
          ctx.shadowColor = 'rgba(10,6,20,0.66)'; ctx.shadowBlur = 28; ctx.shadowOffsetY = 2;
          ctx.fillText(s.text, x, y + rise);
          ctx.shadowColor = 'rgba(10,6,20,0.55)'; ctx.shadowBlur = 12;
          ctx.fillText(s.text, x, y + rise);
          ctx.shadowColor = 'rgba(12,8,24,0.4)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
          ctx.fillText(s.text, x, y + rise);
          ctx.restore();
        }
        x += s.w;
      }
    }
    ctx.restore();
  }
  return { build, draw, get items() { return items; }, DEF };
})();
