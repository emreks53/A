// Ekran sabiti tuval bezi dokusu (çözgü-atkı), hafif saten ışık, kenar kararması.
'use strict';
const Post = (() => {
  let weave = null, vign = null;
  function buildWeave() {
    const c = makeCanvas(W, H); const x = c.getContext('2d');
    const id = x.createImageData(W, H); const d = id.data;
    const p = 5.2; // iplik aralığı (px)
    const n2 = makeNoise(31);
    // yükseklik: çözgü (dikey) ve atkı (yatay) iplikleri, sırayla üstte/altta
    const hgt = new Float32Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x2 = 0; x2 < W; x2++) {
        const jx = (n2(x2 * 0.02, y * 0.003) - 0.5) * 1.6, jy = (n2(x2 * 0.003 + 50, y * 0.02) - 0.5) * 1.6;
        const u = (x2 + jy) / p, v = (y + jx) / p;
        const cu = Math.floor(u), cv = Math.floor(v);
        const fu = u - cu, fv = v - cv;
        const warpOver = (cu + cv) % 2 === 0;
        const warp = Math.sin(fu * Math.PI); // dikey ipliğin kesiti
        const weft = Math.sin(fv * Math.PI);
        const thick = 0.85 + n2(x2 * 0.08, y * 0.004) * 0.3; // düzensiz iplik kalınlığı
        hgt[y * W + x2] = (warpOver ? warp * 1.0 + weft * 0.45 : weft * 1.0 + warp * 0.45) * thick + n2(x2 * 0.6, y * 0.6) * 0.18;
      }
    }
    for (let y = 1; y < H - 1; y++) {
      for (let x2 = 1; x2 < W - 1; x2++) {
        const i = y * W + x2;
        const gx = hgt[i + 1] - hgt[i - 1], gy = hgt[i + W] - hgt[i - W];
        const s = clamp(0.5 - (gx * -0.62 + gy * -0.78) * 0.55, 0, 1);
        const v = Math.round(s * 255);
        const o = i * 4; d[o] = v; d[o + 1] = v; d[o + 2] = v; d[o + 3] = 255;
      }
    }
    x.putImageData(id, 0, 0);
    return c;
  }
  function buildVignette() {
    const c = makeCanvas(W, H); const x = c.getContext('2d');
    const g = x.createRadialGradient(W / 2, H * 0.46, H * 0.28, W / 2, H * 0.5, H * 0.78);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(20,10,30,0.34)');
    x.fillStyle = g; x.fillRect(0, 0, W, H); return c;
  }
  function apply(ctx, o = {}) {
    if (!weave) weave = buildWeave();
    if (!vign) vign = buildVignette();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = o.weave ?? 0.55; ctx.drawImage(weave, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = o.vignette ?? 1; ctx.drawImage(vign, 0, 0);
    ctx.restore();
  }
  return { apply, get weave() { return weave; } };
})();
